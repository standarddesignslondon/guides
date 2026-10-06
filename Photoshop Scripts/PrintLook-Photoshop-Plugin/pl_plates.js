// PrintLook - turning layers into printing plates.
// A plate is one ink: a full-size 8-bit map of what the plate carries (tau: 0 = nothing, 255 = solid), the footprint of
// the layer it came from (for knock-outs), the ink, and whether it is line work or carries tone.
// Layers are read in bands (the panel can't hold every layer as RGBA at once), so this module works in two passes:
//   1. stats:  addStats() on a sparse sample of each layer, then planPlates() decides what each layer becomes;
//   2. fill:   fillBand() converts each band of each layer into its plates.
const C = require("./pl_core.js"), D = require("./pl_data.js");

const ANGLES = { // screen angles in degrees for [yellow, red, blue, black]
    uk1949: [90, 105, 75, 45],      // Tarr 1949: red 105, yellow 90, blue 75, black 45
    us1975: [90, 75, 105, 45],      // US 1975-88: black 45, magenta 75, yellow 90, cyan 105
    three1949: [105, 75, 45, 45],   // Tarr 1949 three-colour: yellow 105, red 75, blue 45
    verf1912: [75, 60, 90, 120],    // Verfasser c.1912: red 60, yellow 75, blue 90, black 120
    comic30: [75, 45, 105, 45],     // US comic tints 30 degrees apart: yellow 75, red 45, blue 105 (1948 Graphic Arts Production Yearbook, via Legion of Andy); practice varied
    same45: [45, 45, 45, 45]        // all at one angle (US comics after the mid-1970s)
};

function newStats() { return { grad: 0, gradN: 0, n: 0, sa: 0, r: 0, g: 0, b: 0, r2: 0, g2: 0, b2: 0, mid: 0, vis: 0, opq: 0, lumLow: 0, sat: 0, samples: [], dark: [0, 0, 0], darkN: 0 }; }
// data: chunky pixels of a band; comps 3 or 4; maxv 255 or 32768. Every `step`-th pixel is used.
function addStats(st, data, comps, maxv, count, step) {
    const k = 255 / maxv; step = step || 1;
    for (let i = 0; i < count; i += step) {
        const o = i * comps, a = comps === 4 ? data[o + 3] * k : 255;
        st.n++;
        if (a < 13) continue;
        const r = data[o] * k, g = data[o + 1] * k, b = data[o + 2] * k, wa = a / 255;
        st.vis++; if (a > 240) st.opq++; else if (a > 20 && a < 235) { st.mid++; if (comps === 4 && i + 1 < count) { st.grad += Math.abs(data[o + 7] * k - a); st.gradN++; } }
        st.sa += wa; st.r += r * wa; st.g += g * wa; st.b += b * wa; st.r2 += r * r * wa; st.g2 += g * g * wa; st.b2 += b * b * wa;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b); st.sat += (mx - mn) * wa;
        const y = 0.2126 * C.S2L[r | 0] + 0.7152 * C.S2L[g | 0] + 0.0722 * C.S2L[b | 0];
        if (y < 0.05) { st.dark[0] += r; st.dark[1] += g; st.dark[2] += b; st.darkN++; }
        if (st.samples.length < 60000 && (st.vis % 7) === 0) st.samples.push(r, g, b);
    }
}
function finishStats(st) {
    const sa = st.sa || 1, mean = [st.r / sa, st.g / sa, st.b / sa];
    const sd = Math.sqrt(Math.max(0, st.r2 / sa - mean[0] * mean[0]) + Math.max(0, st.g2 / sa - mean[1] * mean[1]) + Math.max(0, st.b2 / sa - mean[2] * mean[2]));
    return { edge: st.gradN ? st.grad / st.gradN : 0, coverage: st.n ? st.vis / st.n : 0, opaque: st.n ? st.opq / st.n : 0, mean, sd, mid: st.vis ? st.mid / st.vis : 0, sat: st.sat / sa,
        flat: sd < 14, empty: st.vis < 4, dark: st.darkN > 20 ? [st.dark[0] / st.darkN, st.dark[1] / st.darkN, st.dark[2] / st.darkN] : null, samples: st.samples };
}

function inkFor(rgb, s) {
    if (s.colour.inkMode === "set") { const id = D.nearestInk(rgb, s.colour.inkset), k = D.INKS[id]; return { id, label: k.label, rgb: k.rgb.slice(), o: k.o, fade: k.fade, to: k.to }; }
    const lum = C.lum(C.rgbLin(rgb));
    return { id: "", label: "layer colour", rgb: rgb.map(v => Math.round(v)), o: lum < 0.03 ? 0.35 : 0.15, fade: 0.3, to: "paper" };
}
function namedInk(id) { const k = D.INKS[id] || D.INKS.black; return { id, label: k.label, rgb: k.rgb.slice(), o: k.o, fade: k.fade, to: k.to }; }
function isKey(ink) { return C.lum(C.rgbLin(ink.rgb)) < 0.035; }

// layers: bottom first: [{ name, stats (finished), opacity 0..1, background: bool }]
// Returns { plates: [...descriptors], paperRgb: rgb or null, notes: [] }; plates carry `layer` (index into layers).
function planPlates(layers, s, opts) {
    opts = opts || {}; const plates = [], notes = []; let paperRgb = null;
    const set = D.INKSETS[s.colour.inkset] || D.INKSETS.jobbing_uk, ang = ANGLES[s.colour.angles] || ANGLES.us1975;
    layers.forEach((L, li) => {
        const st = L.stats; if (!st || st.empty) return;
        // a bottom layer that covers the canvas in one near-white colour is the sheet, not a plate
        if (li === 0 && !opts.whole && st.flat && st.opaque > 0.97) {
            const lum = C.lum(C.rgbLin(st.mean)), white = lum > 0.8 && st.sat < 26;
            if (s.paper.source === "bottom") { paperRgb = st.mean.map(v => Math.round(v)); notes.push("'" + L.name + "' is the paper"); return; }
            if (white) { notes.push("'" + L.name + "' (white) ignored as the sheet"); return; }
        }
        if (st.flat) {
            const ink = inkFor(st.mean, s), tint = (st.mid > 0.3 && st.edge < 30) || (L.opacity !== undefined && L.opacity < 0.97);   // part-covered pixels round small type change fast from one pixel to the next; a tint does not
            plates.push({ name: L.name, layer: li, role: "flat", kind: tint ? "tone" : "line", ink, key: isKey(ink), angle: undefined });
            return;
        }
        const mode = s.colour.pictures;
        if (mode === "process3" || mode === "process4" || mode === "tints") {
            const ids = set.process, roles = ["Y", "R", "B", "K"], n = mode === "process3" ? 3 : 4;
            for (let i = 0; i < n; i++) { const ink = namedInk(ids[i]); plates.push({ name: L.name + " · " + ink.label, layer: li, role: roles[i], kind: (mode === "tints" && i === 3) ? "line" : "tone", ink, key: i === 3, angle: ang[i], tints: mode === "tints", three: n === 3 }); }
        } else if (mode === "spot") {
            const k = Math.max(2, Math.min(8, s.colour.spotCount | 0)), smp = st.samples, n = smp.length / 3;
            if (n < k * 4) { notes.push("'" + L.name + "' is too small to separate into spot colours and was left out"); return; }
            const pts = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) { const p = C.linToLabish([C.S2L[smp[i * 3] | 0], C.S2L[smp[i * 3 + 1] | 0], C.S2L[smp[i * 3 + 2] | 0]]); pts[i * 3] = p[0]; pts[i * 3 + 1] = p[1]; pts[i * 3 + 2] = p[2]; }
            const km = C.kmeans(pts, n, k, 11);
            // back to rgb: mean of the samples nearest each centre
            const sum = km.centres.map(() => [0, 0, 0, 0]);
            for (let i = 0; i < n; i++) { let bj = 0, bd = 1e9; for (let j = 0; j < k; j++) { const c = km.centres[j], q = (pts[i * 3] - c[0]) ** 2 + (pts[i * 3 + 1] - c[1]) ** 2 + (pts[i * 3 + 2] - c[2]) ** 2; if (q < bd) { bd = q; bj = j; } } const t = sum[bj]; t[0] += smp[i * 3]; t[1] += smp[i * 3 + 1]; t[2] += smp[i * 3 + 2]; t[3]++; }
            const pal = sum.filter(t => t[3] > 0).map(t => [t[0] / t[3], t[1] / t[3], t[2] / t[3]]);
            // the lightest colour is bare paper if it is near white
            let lightest = 0; pal.forEach((p, i) => { if (C.lum(C.rgbLin(p)) > C.lum(C.rgbLin(pal[lightest]))) lightest = i; });
            const lw = C.lum(C.rgbLin(pal[lightest])) > 0.72;
            const order = pal.map((p, i) => i).filter(i => !(lw && i === lightest)).sort((a, b) => C.lum(C.rgbLin(pal[b])) - C.lum(C.rgbLin(pal[a])));
            const made = [];
            order.forEach((pi) => {
                const ink = inkFor(pal[pi], s), same = ink.id ? made.find(m => m.ink.id === ink.id) : null;
                if (same) { same.spots.push(pi); return; }
                const pl = { name: L.name + " · " + (ink.id ? ink.label : "spot " + (made.length + 1)), layer: li, role: "spot", kind: "line", ink, key: isKey(ink), spots: [pi], palette: pal };
                made.push(pl); plates.push(pl);
            });
            notes.push("'" + L.name + "' separated into " + made.length + " spot colours");
        } else if (mode === "duotone") {
            const k2 = namedInk(s.colour.second || "poster_red"), k1 = s.colour.single && s.colour.single !== "auto" ? namedInk(s.colour.single) : namedInk("black");
            plates.push({ name: L.name + " · " + k2.label, layer: li, role: "duo2", kind: "tone", ink: k2, key: false, angle: 75 });
            plates.push({ name: L.name + " · " + k1.label, layer: li, role: "duo1", kind: "tone", ink: k1, key: true, angle: 45 });
        } else {
            let ink;
            if (s.colour.single && s.colour.single !== "auto") ink = namedInk(s.colour.single);
            else if (st.sat < 22 || !st.dark) ink = s.colour.inkMode === "set" ? inkFor([20, 20, 22], s) : namedInk("black");
            else ink = inkFor(st.dark, s);
            plates.push({ name: L.name, layer: li, role: "single", kind: "tone", ink, key: isKey(ink), angle: 45 });
        }
    });
    if (s.paper.source === "bottom" && !paperRgb) notes.push("the bottom layer is not one flat colour over the whole sheet, so the paper stock was used");
    return { plates, paperRgb, notes };
}

const CBRT = new Float32Array(256); for (let i = 0; i < 256; i++) CBRT[i] = Math.cbrt(C.S2L[i]);
function skeleton(m) { const t = (m - 0.35) / 0.6; return t <= 0 ? 0 : (t >= 1 ? 1 : t * t * (3 - 2 * t)); }
const TV = [0, 0.25, 0.5, 1];
// 32x32x32 table: for each colour, which tint of each of the three inks (2 bits each) comes nearest when printed
function tintTable(inks) {
    const lin = inks.slice(0, 3).map(k => C.rgbLin(k)), pal = [];
    for (let c = 0; c < 64; c++) { const a = [TV[c & 3], TV[(c >> 2) & 3], TV[(c >> 4) & 3]], rgb = [1, 1, 1]; for (let k = 0; k < 3; k++) for (let ch = 0; ch < 3; ch++) rgb[ch] *= 1 - a[k] + a[k] * lin[k][ch]; pal.push(C.linToLabish(rgb)); }
    const t = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
        const p = C.linToLabish([C.S2L[r * 8 + 4], C.S2L[g * 8 + 4], C.S2L[b * 8 + 4]]); let bj = 0, bd = 1e9;
        for (let j = 0; j < 64; j++) { const q = (p[0] - pal[j][0]) ** 2 + (p[1] - pal[j][1]) ** 2 + (p[2] - pal[j][2]) ** 2; if (q < bd) { bd = q; bj = j; } }
        t[(r << 10) | (g << 5) | b] = bj;
    }
    return t;
}

// Convert one band of one layer into that layer's plates.
// data: chunky pixels for the rectangle (bx, by, bw, bh) in document coordinates. arrays: { tau: [Uint8Array per plate], foot: [Uint8Array per layer] }.
function fillBand(plan, li, layerOpacity, data, comps, maxv, bx, by, bw, bh, W, H, arrays, s) {
    const k = 255 / maxv, mine = []; plan.plates.forEach((p, pi) => { if (p.layer === li) mine.push(pi); });
    if (!mine.length) return;
    const foot = arrays.foot[li], op = layerOpacity === undefined ? 1 : layerOpacity, gcr = s.colour.gcr;
    const first = plan.plates[mine[0]];
    for (let y = 0; y < bh; y++) {
        const Y = by + y; if (Y < 0 || Y >= H) continue;
        for (let x = 0; x < bw; x++) {
            const X = bx + x; if (X < 0 || X >= W) continue;
            const o = (y * bw + x) * comps, i = Y * W + X;
            const a = comps === 4 ? data[o + 3] * k : 255; if (a < 1) continue;
            const r = (data[o] * k) | 0, g = (data[o + 1] * k) | 0, b = (data[o + 2] * k) | 0, av = a * op;
            if (foot) foot[i] = av > 255 ? 255 : av;
            if (first.role === "flat") { arrays.tau[mine[0]][i] = av; continue; }
            if (first.role === "single") {
                const yl = 0.2126 * C.S2L[r] + 0.7152 * C.S2L[g] + 0.0722 * C.S2L[b], yi = C.lum(C.rgbLin(first.ink.rgb));
                let t = (1 - yl) / Math.max(0.2, 1 - yi); if (t > 1) t = 1; arrays.tau[mine[0]][i] = t * av; continue;
            }
            if (first.role === "duo2") {
                const yl = 0.2126 * C.S2L[r] + 0.7152 * C.S2L[g] + 0.0722 * C.S2L[b], t = 1 - yl;
                arrays.tau[mine[0]][i] = Math.pow(t, 0.75) * av; arrays.tau[mine[1]][i] = Math.pow(t, 1.7) * av; continue;
            }
            if (first.role === "spot") {
                const pal = first.palette, L0 = 0.2126 * CBRT[r] + 0.7152 * CBRT[g] + 0.0722 * CBRT[b], A0 = 0.8 * (CBRT[r] - CBRT[g]), B0 = 0.5 * (0.5 * (CBRT[r] + CBRT[g]) - CBRT[b]);
                if (!first._pal) first._pal = pal.map(p => C.linToLabish(C.rgbLin(p)));
                let bj = 0, bd = 1e9; const pp = first._pal;
                for (let j = 0; j < pp.length; j++) { const q = (L0 - pp[j][0]) ** 2 + (A0 - pp[j][1]) ** 2 + (B0 - pp[j][2]) ** 2; if (q < bd) { bd = q; bj = j; } }
                for (const pi of mine) if (plan.plates[pi].spots.indexOf(bj) >= 0) arrays.tau[pi][i] = av;
                continue;
            }
            if (first.tints) {
                // hand-laid tints: the colourist picks the nearest of the 64 colours that 0, 25, 50 and 100% of three inks can make
                if (!first._tl) first._tl = tintTable(mine.map(pi => plan.plates[pi].ink.rgb));
                const yl = 0.2126 * C.S2L[r] + 0.7152 * C.S2L[g] + 0.0722 * C.S2L[b];
                if (yl < 0.03) { arrays.tau[mine[3]][i] = av; continue; }
                const code = first._tl[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
                arrays.tau[mine[0]][i] = TV[code & 3] * av; arrays.tau[mine[1]][i] = TV[(code >> 2) & 3] * av; arrays.tau[mine[2]][i] = TV[(code >> 4) & 3] * av;
                continue;
            }
            // process colour: ideal block-dye separation, skeleton black
            let cy = 1 - C.S2L[b], cr = 1 - C.S2L[g], cb = 1 - C.S2L[r], kk = 0; // yellow absorbs blue, red (magenta) absorbs green, blue (cyan) absorbs red
            if (!first.three) { const m = Math.min(cy, cr, cb); kk = gcr * skeleton(m) * m; const d = 1 - kk * 0.8; cy = (cy - kk * 0.8) / d; cr = (cr - kk * 0.8) / d; cb = (cb - kk * 0.8) / d; }
            const v = [cy, cr, cb, kk];
            for (let q = 0; q < mine.length; q++) { let t = v[q]; t = t < 0 ? 0 : (t > 1 ? 1 : t); arrays.tau[mine[q]][i] = t * av; }
        }
    }
}

module.exports = { ANGLES, newStats, addStats, finishStats, planPlates, fillBand, inkFor, namedInk, isKey };
