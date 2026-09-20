// DitherPress — UXP panel logic
// Reads the selected layer's pixels, reduces to 1-bit with the chosen
// dither algorithm, and writes the result to a new layer above the source.
// Each render is a single undo step.

const { app, core, action, imaging } = require("photoshop");
const batchPlay = action.batchPlay;

const FIELDS = ["algo", "cell", "patSize", "patAngle", "modDepth", "diffusion",
    "serpentine", "brightness", "contrast", "grain", "invert",
    "colorMode", "ink", "paper", "transparentPaper",
    "shadows", "midtones", "highlights", "palette", "palCount", "spread"];
const SLIDERS = ["modDepth", "diffusion", "brightness", "contrast", "grain", "spread"];

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function flt(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.floor(rnd(lo, hi + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function parseHex(s, d) {
    const m = /^#?([0-9a-f]{6})$/i.exec((s || "").trim());
    const h = m ? m[1] : d;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// ------------------------------------------------------------------ UI

function readOpts() {
    const o = {};
    o.algo = $("algo").value;
    o.cell = clamp(int($("cell").value, 2), 1, 64);
    o.patSize = clamp(flt($("patSize").value, 6), 2, 128);
    o.patAngle = clamp(flt($("patAngle").value, 45), 0, 180);
    o.modDepth = clamp(int($("modDepth").value, 50), 0, 100);
    o.diffusion = clamp(int($("diffusion").value, 100), 0, 100);
    o.serpentine = $("serpentine").checked;
    o.brightness = clamp(int($("brightness").value, 0), -100, 100);
    o.contrast = clamp(int($("contrast").value, 0), -100, 100);
    o.grain = clamp(int($("grain").value, 0), 0, 100);
    o.invert = $("invert").checked;
    o.colorMode = $("colorMode").value;
    o.ink = $("ink").value;
    o.paper = $("paper").value;
    o.transparentPaper = $("transparentPaper").checked;
    o.shadows = $("shadows").value;
    o.midtones = $("midtones").value;
    o.highlights = $("highlights").value;
    o.palette = $("palette").value;
    o.palCount = clamp(int($("palCount").value, 8), 2, 64);
    o.spread = clamp(int($("spread").value, 50), 0, 100);
    return o;
}

function writeOpts(o) {
    for (const k of FIELDS) {
        const el = $(k);
        if (!el || !(k in o)) continue;
        if (el.type === "checkbox") el.checked = !!o[k];
        else el.value = "" + o[k];
    }
    for (const k of SLIDERS) $(k + "Val").textContent = "" + $(k).value;
    showModeBoxes();
}

function showModeBoxes() {
    const m = $("colorMode").value;
    $("monoBox").style.display = m === "mono" ? "block" : "none";
    $("tonalBox").style.display = m === "tonal" ? "block" : "none";
    $("paperBox").style.display = (m === "mono" || m === "tonal") ? "block" : "none";
    $("rgbBox").style.display = m === "rgb" ? "block" : "none";
    $("paletteBox").style.display = m === "palette" ? "block" : "none";
}

function saveOpts() {
    try { localStorage.setItem("ditherpress", JSON.stringify(readOpts())); } catch (e) {}
}
function loadOpts() {
    try {
        const s = localStorage.getItem("ditherpress");
        if (s) writeOpts(JSON.parse(s));
    } catch (e) {}
}
function setStatus(msg, isErr) {
    const el = $("status");
    el.textContent = msg;
    el.className = isErr ? "err" : "";
}

// ------------------------------------------------------------- randomise

const ALGOS = ["fs", "ffs", "jjn", "stucki", "burkes", "sierra", "sierra2", "sierralite",
    "atkinson", "bayer2", "bayer4", "bayer8", "bayer16", "cluster", "dots", "lines",
    "cross", "wave", "contour", "thresh", "random", "ign"];

function randomiseAll() {
    const o = {
        algo: pick(ALGOS),
        cell: pick([1, 1, 2, 2, 3, 4, 4, 6, 8, 12]),
        patSize: pick([3, 4, 5, 6, 8, 10, 12, 16, 24]),
        patAngle: pick([0, 15, 22.5, 30, 45, 60, 75, 90]),
        modDepth: rndInt(10, 100),
        diffusion: Math.random() < 0.6 ? 100 : rndInt(30, 100),
        serpentine: Math.random() < 0.7,
        brightness: Math.random() < 0.5 ? 0 : rndInt(-40, 40),
        contrast: Math.random() < 0.5 ? 0 : rndInt(-30, 60),
        grain: Math.random() < 0.6 ? 0 : rndInt(5, 60),
        invert: Math.random() < 0.15,
        colorMode: pick(["mono", "mono", "tonal", "rgb", "palette", "palette"]),
        palette: pick(["image", "image", "gameboy", "c64", "cga", "spectrum", "pico8", "grey4", "rgbcmyk"]),
        palCount: pick([3, 4, 6, 8, 12, 16, 24]),
        spread: rndInt(20, 100)
    };
    writeOpts(o);
    saveOpts();
    setStatus("Randomised. Press Render.");
}

// ------------------------------------------------------------ batchPlay

function cmdSelectLayer(id) {
    return { _obj: "select", _target: [{ _ref: "layer", _id: id }], makeVisible: false };
}
function cmdMakeLayer(name) {
    return { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: name } };
}
async function bp(cmds) { return await batchPlay(cmds, {}); }

// ---------------------------------------------------------- dither maths

const KERNELS = {
    fs:         { div: 16, taps: [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]] },
    ffs:        { div: 8,  taps: [[1, 0, 3], [0, 1, 3], [1, 1, 2]] },
    jjn:        { div: 48, taps: [[1, 0, 7], [2, 0, 5], [-2, 1, 3], [-1, 1, 5], [0, 1, 7], [1, 1, 5], [2, 1, 3],
                                  [-2, 2, 1], [-1, 2, 3], [0, 2, 5], [1, 2, 3], [2, 2, 1]] },
    stucki:     { div: 42, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2],
                                  [-2, 2, 1], [-1, 2, 2], [0, 2, 4], [1, 2, 2], [2, 2, 1]] },
    burkes:     { div: 32, taps: [[1, 0, 8], [2, 0, 4], [-2, 1, 2], [-1, 1, 4], [0, 1, 8], [1, 1, 4], [2, 1, 2]] },
    sierra:     { div: 32, taps: [[1, 0, 5], [2, 0, 3], [-2, 1, 2], [-1, 1, 4], [0, 1, 5], [1, 1, 4], [2, 1, 2],
                                  [-1, 2, 2], [0, 2, 3], [1, 2, 2]] },
    sierra2:    { div: 16, taps: [[1, 0, 4], [2, 0, 3], [-2, 1, 1], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [2, 1, 1]] },
    sierralite: { div: 4,  taps: [[1, 0, 2], [-1, 1, 1], [0, 1, 1]] },
    atkinson:   { div: 8,  taps: [[1, 0, 1], [2, 0, 1], [-1, 1, 1], [0, 1, 1], [1, 1, 1], [0, 2, 1]] }
};

function bayerMatrix(n) {
    // n = 2, 4, 8, 16 ; values normalised to (0,1)
    let m = [[0, 2], [3, 1]];
    let size = 2;
    while (size < n) {
        const nm = [];
        for (let y = 0; y < size * 2; y++) {
            nm.push(new Array(size * 2));
            for (let x = 0; x < size * 2; x++) {
                const q = (y < size ? 0 : 2) + (x < size ? 0 : 1); // quadrant order 0,1 / 2,3
                const base = [0, 2, 3, 1][q];
                nm[y][x] = 4 * m[y % size][x % size] + base;
            }
        }
        m = nm; size *= 2;
    }
    const out = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] = (m[y][x] + 0.5) / (n * n);
    return out;
}

const CLUSTER8 = (function () {
    // classic 8x8 clustered-dot (spiral) screen
    const m = [
        [24, 10, 12, 26, 35, 47, 49, 37],
        [8, 0, 2, 14, 45, 59, 61, 51],
        [22, 6, 4, 16, 43, 57, 63, 53],
        [30, 20, 18, 28, 33, 41, 55, 39],
        [34, 46, 48, 36, 25, 11, 13, 27],
        [44, 58, 60, 50, 9, 1, 3, 15],
        [42, 56, 62, 52, 23, 7, 5, 17],
        [32, 40, 54, 38, 31, 21, 19, 29]
    ];
    const out = new Float32Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[y * 8 + x] = (m[y][x] + 0.5) / 64;
    return out;
})();

function thresholdFn(o) {
    const algo = o.algo;
    let thr;
    if (algo.startsWith("bayer")) {
        const n = parseInt(algo.slice(5), 10);
        const m = bayerMatrix(n);
        thr = (x, y) => m[(y % n) * n + (x % n)];
    } else if (algo === "cluster") {
        thr = (x, y) => CLUSTER8[(y & 7) * 8 + (x & 7)];
    } else if (algo === "thresh") {
        thr = () => 0.5;
    } else if (algo === "random") {
        thr = () => Math.random();
    } else if (algo === "ign") {
        thr = (x, y) => { const f = 52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1); return f - Math.floor(f); };
    } else {
        // rotated pattern coordinates in units of pattern period
        const a = o.patAngle * Math.PI / 180;
        const ca = Math.cos(a), sa = Math.sin(a);
        const p = o.patSize;
        const depth = o.modDepth / 100;
        const frac = (v) => v - Math.floor(v);
        if (algo === "dots") {
            thr = (x, y) => {
                const u = frac((x * ca + y * sa) / p) - 0.5, v = frac((-x * sa + y * ca) / p) - 0.5;
                // Euclidean spot: round ink dots in the lights, round paper dots in the darks
                const d1 = Math.PI * (u * u + v * v);
                const au = 0.5 - Math.abs(u), av = 0.5 - Math.abs(v);
                const d2 = Math.PI * (au * au + av * av);
                return Math.min(d1, 1 - d2);
            };
        } else if (algo === "lines") {
            thr = (x, y) => Math.abs(frac((x * ca + y * sa) / p) - 0.5) * 2;
        } else if (algo === "cross") {
            thr = (x, y) => {
                const u = Math.abs(frac((x * ca + y * sa) / p) - 0.5) * 2;
                const v = Math.abs(frac((-x * sa + y * ca) / p) - 0.5) * 2;
                return Math.min(u, v);
            };
        } else if (algo === "wave") {
            // lines whose phase is pushed by the local tone: the wave rides the image
            thr = (x, y, l) => 0.5 + 0.5 * Math.sin(2 * Math.PI * ((x * ca + y * sa) / p + depth * 2 * l));
        } else { // contour
            thr = (x, y, l) => {
                const s = 0.5 + 0.5 * Math.sin(2 * Math.PI * ((x * ca + y * sa) / p) + depth * 12 * l);
                return s;
            };
        }
    }
    return thr;
}

// Returns Uint8Array of 0 (paper) / 1 (ink) for a luminance field in 0..1.
function ditherField(lum, w, h, o) {
    const out = new Uint8Array(w * h);
    const algo = o.algo;

    if (KERNELS[algo]) {
        const k = KERNELS[algo];
        const strength = o.diffusion / 100;
        const buf = Float32Array.from(lum);
        for (let y = 0; y < h; y++) {
            const rev = o.serpentine && (y & 1);
            for (let i = 0; i < w; i++) {
                const x = rev ? w - 1 - i : i;
                const idx = y * w + x;
                const v = buf[idx];
                const q = v < 0.5 ? 0 : 1;
                out[idx] = q ? 0 : 1; // dark → ink
                const err = (v - q) * strength / k.div;
                if (err === 0) continue;
                for (const t of k.taps) {
                    const dx = rev ? -t[0] : t[0];
                    const nx = x + dx, ny = y + t[1];
                    if (nx < 0 || nx >= w || ny >= h) continue;
                    buf[ny * w + nx] += err * t[2];
                }
            }
        }
        return out;
    }

    const thr = thresholdFn(o);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const l = lum[idx];
            out[idx] = l < thr(x, y, l) ? 1 : 0;
        }
    }
    return out;
}


// ------------------------------------------------------------- palettes

const PRESETS = {
    gameboy: ["0f380f", "306230", "8bac0f", "9bbc0f"],
    c64: ["000000", "ffffff", "880000", "aaffee", "cc44cc", "00cc55", "0000aa", "eeee77",
          "dd8855", "664400", "ff7777", "333333", "777777", "aaff66", "0088ff", "bbbbbb"],
    cga: ["000000", "0000aa", "00aa00", "00aaaa", "aa0000", "aa00aa", "aa5500", "aaaaaa",
          "555555", "5555ff", "55ff55", "55ffff", "ff5555", "ff55ff", "ffff55", "ffffff"],
    spectrum: ["000000", "0000d7", "d70000", "d700d7", "00d700", "00d7d7", "d7d700", "d7d7d7",
               "0000ff", "ff0000", "ff00ff", "00ff00", "00ffff", "ffff00", "ffffff"],
    pico8: ["000000", "1d2b53", "7e2553", "008751", "ab5236", "5f574f", "c2c3c7", "fff1e8",
            "ff004d", "ffa300", "ffec27", "00e436", "29adff", "83769c", "ff77a8", "ffccaa"],
    grey4: ["000000", "555555", "aaaaaa", "ffffff"],
    rgbcmyk: ["000000", "ffffff", "ff0000", "00ff00", "0000ff", "00ffff", "ff00ff", "ffff00"]
};

function presetPalette(name) {
    return PRESETS[name].map((h) => parseHex(h, "000000"));
}

// Median-cut palette from three channel fields (0..1), n colours.
function imagePalette(r, g, b, n) {
    const total = r.length;
    const stride = Math.max(1, Math.floor(total / 60000));
    const idx = [];
    for (let i = 0; i < total; i += stride) idx.push(i);
    let boxes = [idx];
    const range = (box) => {
        let lo = [1, 1, 1], hi = [0, 0, 0];
        for (const i of box) {
            if (r[i] < lo[0]) lo[0] = r[i]; if (r[i] > hi[0]) hi[0] = r[i];
            if (g[i] < lo[1]) lo[1] = g[i]; if (g[i] > hi[1]) hi[1] = g[i];
            if (b[i] < lo[2]) lo[2] = b[i]; if (b[i] > hi[2]) hi[2] = b[i];
        }
        const d = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
        const ch = d[0] >= d[1] && d[0] >= d[2] ? 0 : (d[1] >= d[2] ? 1 : 2);
        return { ch, span: d[ch] };
    };
    while (boxes.length < n) {
        let bi = -1, best = -1, bch = 0;
        for (let k = 0; k < boxes.length; k++) {
            if (boxes[k].length < 2) continue;
            const rg = range(boxes[k]);
            if (rg.span > best) { best = rg.span; bi = k; bch = rg.ch; }
        }
        if (bi < 0 || best <= 0) break;
        const box = boxes[bi];
        const f = bch === 0 ? r : (bch === 1 ? g : b);
        box.sort((a, c) => f[a] - f[c]);
        const mid = box.length >> 1;
        boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes.map((box) => {
        let sr = 0, sg = 0, sb = 0;
        for (const i of box) { sr += r[i]; sg += g[i]; sb += b[i]; }
        const m = box.length || 1;
        return [Math.round(255 * sr / m), Math.round(255 * sg / m), Math.round(255 * sb / m)];
    });
}

function nearestIndex(pal, r, g, b) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
        const dr = pal[k][0] - r, dg = pal[k][1] - g, db = pal[k][2] - b;
        const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
        if (d < bd) { bd = d; best = k; }
    }
    return best;
}

// Palette dither: returns Uint8Array of palette indices. Fields are 0..1.
function ditherPalette(rF, gF, bF, w, h, o, pal) {
    const out = new Uint8Array(w * h);
    const algo = o.algo;
    if (KERNELS[algo]) {
        const k = KERNELS[algo];
        const strength = o.diffusion / 100;
        const R = Float32Array.from(rF, (v) => v * 255);
        const G = Float32Array.from(gF, (v) => v * 255);
        const B = Float32Array.from(bF, (v) => v * 255);
        for (let y = 0; y < h; y++) {
            const rev = o.serpentine && (y & 1);
            for (let i = 0; i < w; i++) {
                const x = rev ? w - 1 - i : i;
                const idx = y * w + x;
                const r = clamp(R[idx], 0, 255), g = clamp(G[idx], 0, 255), b = clamp(B[idx], 0, 255);
                const pi = nearestIndex(pal, r, g, b);
                out[idx] = pi;
                const er = (r - pal[pi][0]) * strength / k.div;
                const eg = (g - pal[pi][1]) * strength / k.div;
                const eb = (b - pal[pi][2]) * strength / k.div;
                for (const t of k.taps) {
                    const dx = rev ? -t[0] : t[0];
                    const nx = x + dx, ny = y + t[1];
                    if (nx < 0 || nx >= w || ny >= h) continue;
                    const j = ny * w + nx;
                    R[j] += er * t[2]; G[j] += eg * t[2]; B[j] += eb * t[2];
                }
            }
        }
        return out;
    }
    const thr = thresholdFn(o);
    const amp = o.spread / 100 * 255;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const l = 0.299 * rF[idx] + 0.587 * gF[idx] + 0.114 * bF[idx];
            const d = (thr(x, y, l) - 0.5) * amp;
            out[idx] = nearestIndex(pal, clamp(rF[idx] * 255 + d, 0, 255),
                                         clamp(gF[idx] * 255 + d, 0, 255),
                                         clamp(bF[idx] * 255 + d, 0, 255));
        }
    }
    return out;
}

// Three-stop colour ramp for tonal mode: t in 0..1 → [r,g,b]
function ramp(t, c0, c1, c2) {
    let a, b, u;
    if (t < 0.5) { a = c0; b = c1; u = t * 2; } else { a = c1; b = c2; u = (t - 0.5) * 2; }
    return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u),
            Math.round(a[2] + (b[2] - a[2]) * u)];
}

// ----------------------------------------------------------- the render

async function render(o) {
    const t0 = Date.now();
    let info = "";

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id, name: "DitherPress render"
        });
        try {
            const src = doc.activeLayers[0];
            if (!src) throw new Error("Select a layer first.");
            if (src.kind === "group") throw new Error("Select a pixel layer, not a group.");

            // ---- read
            const got = await imaging.getPixels({
                documentID: doc.id, layerID: src.id, componentSize: 8, colorSpace: "RGB"
            });
            const img = got.imageData;
            const W = img.width, H = img.height, comps = img.components;
            const sb = got.sourceBounds;
            const data = await img.getData({ chunky: true });
            img.dispose();
            if (W < 1 || H < 1) throw new Error("Layer has no pixels.");

            // ---- reduce to cell-resolution fields (0..1, white = 1)
            const c = o.cell;
            const w = Math.ceil(W / c), h = Math.ceil(H / c);
            const mode = o.colorMode;
            const wantRGB = mode === "rgb" || mode === "palette";
            const lum = new Float32Array(w * h);
            const rF = wantRGB ? new Float32Array(w * h) : null;
            const gF = wantRGB ? new Float32Array(w * h) : null;
            const bF = wantRGB ? new Float32Array(w * h) : null;
            const alpha = new Float32Array(w * h);
            const cnt = new Uint16Array(w * h);
            const hasA = comps === 4;
            for (let y = 0; y < H; y++) {
                const cy = (y / c) | 0;
                for (let x = 0; x < W; x++) {
                    const i = (y * W + x) * comps;
                    const a = hasA ? data[i + 3] / 255 : 1;
                    const ci = cy * w + ((x / c) | 0);
                    // matte on white
                    const r = data[i] / 255 * a + (1 - a);
                    const g = data[i + 1] / 255 * a + (1 - a);
                    const bl = data[i + 2] / 255 * a + (1 - a);
                    lum[ci] += 0.299 * r + 0.587 * g + 0.114 * bl;
                    if (wantRGB) { rF[ci] += r; gF[ci] += g; bF[ci] += bl; }
                    alpha[ci] += a; cnt[ci]++;
                }
            }
            // tone adjustments
            const cf = o.contrast >= 0 ? 1 + o.contrast / 50 : (100 + o.contrast) / 100;
            const bo = o.brightness / 200;
            const g = o.grain / 100;
            const tone = (l, n) => {
                l = (l - 0.5) * cf + 0.5 + bo + n;
                if (o.invert) l = 1 - l;
                return clamp(l, 0, 1);
            };
            for (let i = 0; i < w * h; i++) {
                const n = cnt[i] || 1;
                alpha[i] /= n;
                const noise = g > 0 ? (Math.random() - 0.5) * g : 0;
                lum[i] = tone(lum[i] / n, noise);
                if (wantRGB) {
                    rF[i] = tone(rF[i] / n, noise);
                    gF[i] = tone(gF[i] / n, noise);
                    bF[i] = tone(bF[i] / n, noise);
                }
            }

            // ---- dither → per-cell colour lookup
            // cellRGB: Uint8Array w*h*3 ; cellInk: Uint8Array w*h (1 = ink, used for transparent paper)
            const cellRGB = new Uint8Array(w * h * 3);
            const cellInk = new Uint8Array(w * h);
            const paper = parseHex(o.paper, "ffffff");
            let inkCount = 0;
            if (mode === "mono" || mode === "tonal") {
                const bits = ditherField(lum, w, h, o);
                const ink = parseHex(o.ink, "000000");
                const c0 = parseHex(o.shadows, "2b2d8c"), c1 = parseHex(o.midtones, "b04a8f"),
                      c2 = parseHex(o.highlights, "ff8c42");
                for (let i = 0; i < w * h; i++) {
                    const isInk = bits[i] === 1;
                    cellInk[i] = isInk ? 1 : 0;
                    const col = !isInk ? paper : (mode === "mono" ? ink : ramp(lum[i], c0, c1, c2));
                    cellRGB[i * 3] = col[0]; cellRGB[i * 3 + 1] = col[1]; cellRGB[i * 3 + 2] = col[2];
                    if (isInk) inkCount++;
                }
            } else if (mode === "rgb") {
                const br = ditherField(rF, w, h, o), bg = ditherField(gF, w, h, o), bb = ditherField(bF, w, h, o);
                for (let i = 0; i < w * h; i++) {
                    cellRGB[i * 3] = br[i] ? 0 : 255;
                    cellRGB[i * 3 + 1] = bg[i] ? 0 : 255;
                    cellRGB[i * 3 + 2] = bb[i] ? 0 : 255;
                    cellInk[i] = 1;
                }
            } else {
                const pal = o.palette === "image" ? imagePalette(rF, gF, bF, o.palCount)
                                                  : presetPalette(o.palette);
                const idx = ditherPalette(rF, gF, bF, w, h, o, pal);
                for (let i = 0; i < w * h; i++) {
                    const col = pal[idx[i]];
                    cellRGB[i * 3] = col[0]; cellRGB[i * 3 + 1] = col[1]; cellRGB[i * 3 + 2] = col[2];
                    cellInk[i] = 1;
                }
                info = pal.length + " colours, ";
            }

            // ---- expand to full size RGBA
            const transparentPaper = o.transparentPaper && (mode === "mono" || mode === "tonal");
            const out = new Uint8Array(W * H * 4);
            for (let y = 0; y < H; y++) {
                const cy = (y / c) | 0;
                for (let x = 0; x < W; x++) {
                    const ci = cy * w + ((x / c) | 0);
                    const j = (y * W + x) * 4;
                    out[j] = cellRGB[ci * 3]; out[j + 1] = cellRGB[ci * 3 + 1]; out[j + 2] = cellRGB[ci * 3 + 2];
                    let a = Math.round(alpha[ci] * 255);
                    if (transparentPaper && !cellInk[ci]) a = 0;
                    out[j + 3] = a;
                }
            }

            // ---- write to a new layer above the source
            await bp([cmdSelectLayer(src.id), cmdMakeLayer(src.name + " dither")]);
            const dst = app.activeDocument.activeLayers[0];
            const outImg = await imaging.createImageDataFromBuffer(out, {
                width: W, height: H, components: 4, colorSpace: "RGB", chunky: true
            });
            await imaging.putPixels({
                documentID: doc.id, layerID: dst.id, imageData: outImg,
                targetBounds: { left: sb.left, top: sb.top }, replace: true
            });
            outImg.dispose();

            info += w + "×" + h + " cells";
            if (mode === "mono" || mode === "tonal") info += ", " + Math.round(100 * inkCount / (w * h)) + "% ink";
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "DitherPress render" });

    return info + ", " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

// -------------------------------------------------------------- presets
// Stored as JSON in the plugin's data folder (survives plugin updates),
// with localStorage as a fallback if the file system is unavailable.

const PRESET_FILE = "presets.json";
let presets = {};

async function presetFolder() {
    const fs = require("uxp").storage.localFileSystem;
    return await fs.getDataFolder();
}

async function loadPresets() {
    try {
        const folder = await presetFolder();
        const entry = await folder.getEntry(PRESET_FILE);
        presets = JSON.parse(await entry.read()) || {};
    } catch (e) {
        try { presets = JSON.parse(localStorage.getItem("ditherpress.presets") || "{}"); } catch (e2) { presets = {}; }
    }
    refreshPresetList();
}

async function storePresets() {
    try { localStorage.setItem("ditherpress.presets", JSON.stringify(presets)); } catch (e) {}
    const folder = await presetFolder();
    const file = await folder.createFile(PRESET_FILE, { overwrite: true });
    await file.write(JSON.stringify(presets, null, 1));
}

function refreshPresetList(selectName) {
    const sel = $("presetSel");
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const none = document.createElement("option");
    none.value = ""; none.textContent = "(none)";
    sel.appendChild(none);
    for (const name of Object.keys(presets).sort((a, b) => a.localeCompare(b))) {
        const op = document.createElement("option");
        op.value = name; op.textContent = name;
        sel.appendChild(op);
    }
    sel.value = selectName && presets[selectName] ? selectName : "";
}

async function savePreset() {
    let name = $("presetName").value.trim();
    if (!name) name = $("presetSel").value;
    if (!name) { setStatus("Type a name for the preset first.", true); return; }
    presets[name] = readOpts();
    try {
        await storePresets();
        refreshPresetList(name);
        $("presetName").value = "";
        setStatus("Saved preset “" + name + "”.");
    } catch (e) {
        setStatus("Could not save preset: " + (e.message || e), true);
    }
}

async function deletePreset() {
    const name = $("presetSel").value;
    if (!name) { setStatus("Choose a saved preset to delete.", true); return; }
    delete presets[name];
    try {
        await storePresets();
        refreshPresetList();
        setStatus("Deleted preset “" + name + "”.");
    } catch (e) {
        setStatus("Could not delete preset: " + (e.message || e), true);
    }
}

function applyPreset() {
    const name = $("presetSel").value;
    if (!name || !presets[name]) return;
    writeOpts(presets[name]);
    saveOpts();
    $("presetName").value = name;
    setStatus("Loaded preset “" + name + "”.");
}

// --------------------------------------------------------------- wiring

$("presetSel").addEventListener("change", applyPreset);
$("presetSaveBtn").addEventListener("click", savePreset);
$("presetDeleteBtn").addEventListener("click", deletePreset);


for (const k of SLIDERS) {
    $(k).addEventListener("input", () => { $(k + "Val").textContent = $(k).value; });
}
for (const k of FIELDS) {
    const el = $(k);
    if (el) el.addEventListener("change", saveOpts);
}

$("colorMode").addEventListener("change", showModeBoxes);
$("randomBtn").addEventListener("click", randomiseAll);

$("runBtn").addEventListener("click", async () => {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    const o = readOpts();
    writeOpts(o);
    saveOpts();
    setStatus("Rendering…");
    $("runBtn").disabled = true;
    try {
        const r = await render(o);
        setStatus("Done: " + r);
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

loadOpts();
showModeBoxes();
loadPresets();
setStatus("Ready.");
