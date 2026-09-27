// FilmLook engine
// A small physically-motivated film emulation: scene light -> optics ->
// negative records -> characteristic curve -> print dyes -> projection gate.
// Pure JavaScript, no DOM or Photoshop dependencies, so it runs in both the
// UXP panel and Node (for testing).
//
// Units
//  - Scene light is linear RGB (sRGB primaries), 0.18 = mid grey.
//  - x is log10 exposure. Densities D are optical densities (log10 opacity).
//  - Physical sizes (grain clump, halation spread, gate) are millimetres on
//    the film frame, converted to pixels via the gate width.

(function (root) {
"use strict";

// ------------------------------------------------------------------ defaults

const DEFAULTS = {
    // exposure & process
    exposure: 0,            // stops
    bypassProcess: false,   // true = no stock/print model (other stages still apply)
    mode: "color",          // "color" | "bw"
    bwWeights: [0.29, 0.51, 0.20],
    bwFilter: "none",
    sens: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],   // scene RGB -> record exposure (rows = records)
    dye: [[1, 0.1, 0.05], [0.04, 1, 0.3], [0, 0.06, 1]], // record -> channel absorption (rows = records)
    saturation: 1.0,        // record separation in log space (1 = as stock)
    contrast: 1.25,         // gamma of the print-through curve
    latitude: 1.0,          // >1 = softer toe/shoulder
    dmin: 0.06,
    dmax: 2.9,
    timing: [0, 0, 0],      // printer points; + = more of that colour
    flash: 0,               // negative flashing, fraction of mid grey
    flashTint: [1, 1, 1],
    push: 0,                // stops of push (+) / pull (-) processing
    tone: [1, 1, 1],        // B&W toner absorption vector
    toneAmount: 0,
    tint: [0, 0, 0],        // base tint density per channel (silent tinting)
    tintAmount: 0,
    fade: [1, 1, 1],        // dye survival (cyan, magenta, yellow)
    bleach: 0,              // silver retention (bleach bypass) 0..1

    // optics (sizes are fractions of frame width unless noted)
    halation: 0,            // 0..1
    halationMm: 0.25,       // spread on the negative, mm
    halationColor: [1.0, 0.32, 0.08],
    diffusion: 0,           // 0..1 (glow / pro-mist / gauze)
    diffusionMm: 0.35,
    lowcon: 0,              // 0..1 veiling glare (low-con filter, smoke)
    streak: 0,              // anamorphic horizontal streak flare 0..1
    streakColor: [0.35, 0.55, 1.0],
    vignette: 0.15,         // 0..1
    edgeSoft: 0.1,          // 0..1 extra softness toward the corners
    ca: 0,                  // lateral chromatic aberration, 0..1
    sharpness: 1.0,         // multiplies the format's resolving power

    // grain
    grain: 0.5,             // 0..2 amount (1 = stock nominal)
    grainRms: 0.030,        // stock nominal log-exposure rms
    grainClumpMm: 0.012,    // stock clump size on the negative
    grainColor: 0.55,       // 0 = monochrome grain, 1 = independent per layer

    // format / gate
    gateMm: 22.0,           // camera aperture width (unsqueezed)
    squeeze: 1,             // anamorphic squeeze (2 = CinemaScope)
    lpmm: 30,               // effective system MTF50, lp/mm on the negative
    aspect: 1.37,
    frame: "none",          // "none" | "matte"
    corner: 0.01,           // gate corner radius, fraction of short side
    gateSoft: 0.004,        // gate edge softness, fraction of short side

    // print condition
    generations: 0,         // extra duplicate generations
    dustWhite: 0,           // 0..1
    dustBlack: 0,           // 0..1
    scratches: 0,           // 0..1
    scratchColor: [1, 1, 1],
    flicker: 0,             // 0..1 uneven density / mottle
    stains: 0,              // 0..1

    // final grade (models the modern restoration / transfer grade)
    gradeLift: [0, 0, 0],   // added to shadows (display space)
    gradeGain: [1, 1, 1],
    gradeSat: 1,
    gradeBlack: 0,          // + lifts the black floor, - crushes it (-0.1..0.2)
    gradeWhite: 1,          // display white level (transfers often keep whites below 1)
    iris: 0,                // 0..1 oval iris / soft matte darkening toward the edges
    irisSize: 1.0,          // 0.5..1.6 size of the iris opening (1 = touches frame edges)
    irisSoft: 0.35,         // 0.02..1 softness of the iris edge

    // fringing: colour errors applied after the look (display space)
    fringeLat: 0,           // 0..1 lateral CA (magnification differs per colour, grows to the corners)
    fringeMode: "rc",       // "rc" red/cyan + blue/yellow, "pg" purple/green
    fringeAniso: 0,         // 0 = round, 1 = horizontal only (anamorphic)
    fringeAxial: 0,         // 0..1 axial / purple fringing around bright edges
    fringeAxialR: 0.003,    // halo radius, fraction of image width
    fringeRx: 0, fringeRy: 0,   // red record misregistration, per mille of width (+ = right / down)
    fringeBx: 0, fringeBy: 0,   // blue record misregistration

    amount: 1,              // mix with the original
    seed: 1
};

const BW_FILTERS = {
    none: [1, 1, 1],
    yellow: [1, 0.93, 0.45],      // K2 / Aero 1 type
    deepyellow: [1, 0.85, 0.2],   // G type
    orange: [1, 0.6, 0.07],       // 21 / 23A type
    red: [1, 0.14, 0.02],         // 25 type
    green: [0.55, 1, 0.45],       // X1 type
    blue: [0.25, 0.6, 1]          // 47-ish
};

// ------------------------------------------------------------------ helpers

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

let LUT_IN16 = null;
function lutIn16() {
    if (LUT_IN16) return LUT_IN16;
    LUT_IN16 = new Float32Array(32769);
    for (let i = 0; i <= 32768; i++) { const c = i / 32768; LUT_IN16[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    return LUT_IN16;
}
const LUT_IN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
    const c = i / 255;
    LUT_IN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const ENC_N = 4096;
const LUT_OUT = new Float32Array(ENC_N + 1);
for (let i = 0; i <= ENC_N; i++) {
    const c = i / ENC_N;
    LUT_OUT[i] = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function encode(v) {
    if (v <= 0) return 0;
    if (v >= 1) return 1;
    const f = v * ENC_N, i = f | 0;
    return LUT_OUT[i] + (LUT_OUT[i + 1] - LUT_OUT[i]) * (f - i);
}

// fast log10 via float bits + mantissa table (error < 1e-6 in log10)
const _fb = new Float32Array(1), _ib = new Int32Array(_fb.buffer);
const _ML = new Float32Array(1025);
for (let i = 0; i <= 1024; i++) _ML[i] = Math.log2(1 + i / 1024);
function flog10(x) {
    _fb[0] = x;
    const b = _ib[0];
    const e = ((b >> 23) & 255) - 127;
    const m = (b >> 13) & 1023, f = (b & 8191) / 8192;
    return (e + _ML[m] + (_ML[m + 1] - _ML[m]) * f) * 0.30102999566;
}

function merge(opts) {
    const o = {};
    for (const k in DEFAULTS) o[k] = (opts && opts[k] !== undefined) ? opts[k] : DEFAULTS[k];
    return o;
}

// ------------------------------------------------------------------ blurs

// In-place separable gaussian on a W x H float field. Small sigmas use an
// exact kernel; larger ones use three box passes (close to gaussian).
function gaussKernel(sigma) {
    const r = Math.max(1, Math.ceil(sigma * 3));
    const k = new Float32Array(2 * r + 1);
    let s = 0;
    for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; s += v; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    return k;
}

function convH(src, dst, W, H, k) {
    const r = (k.length - 1) >> 1;
    for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
            let s = 0;
            for (let i = -r; i <= r; i++) {
                let xx = x + i; if (xx < 0) xx = 0; else if (xx >= W) xx = W - 1;
                s += src[row + xx] * k[i + r];
            }
            dst[row + x] = s;
        }
    }
}
function convV(src, dst, W, H, k) {
    const r = (k.length - 1) >> 1;
    for (let y = 0; y < H; y++) {
        const o = y * W;
        for (let x = 0; x < W; x++) dst[o + x] = 0;
        for (let i = -r; i <= r; i++) {
            let yy = y + i; if (yy < 0) yy = 0; else if (yy >= H) yy = H - 1;
            const row = yy * W, w = k[i + r];
            for (let x = 0; x < W; x++) dst[o + x] += src[row + x] * w;
        }
    }
}
function boxH(src, dst, W, H, r) {
    const d = 1 / (2 * r + 1);
    for (let y = 0; y < H; y++) {
        const row = y * W;
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += src[row + clamp(i, 0, W - 1)];
        for (let x = 0; x < W; x++) {
            dst[row + x] = acc * d;
            acc += src[row + Math.min(x + r + 1, W - 1)] - src[row + Math.max(x - r, 0)];
        }
    }
}
function boxV(src, dst, W, H, r) {
    const d = 1 / (2 * r + 1);
    const acc = new Float32Array(W);
    for (let i = -r; i <= r; i++) { const row = clamp(i, 0, H - 1) * W; for (let x = 0; x < W; x++) acc[x] += src[row + x]; }
    for (let y = 0; y < H; y++) {
        const o = y * W, a = Math.min(y + r + 1, H - 1) * W, b = Math.max(y - r, 0) * W;
        for (let x = 0; x < W; x++) { dst[o + x] = acc[x] * d; acc[x] += src[a + x] - src[b + x]; }
    }
}
// blur field f in place; tmp is scratch of equal size. sx/sy may differ.
function blur(f, tmp, W, H, sx, sy, exactMax) {
    if (sy === undefined) sy = sx;
    if (exactMax === undefined) exactMax = 2.5;
    if (sx > 0.3) {
        if (sx <= exactMax) { convH(f, tmp, W, H, gaussKernel(sx)); f.set(tmp); }
        else { const r = Math.max(1, Math.round(Math.sqrt(12 * sx * sx / 3 + 1) / 2 - 0.5));
               for (let p = 0; p < 3; p++) { boxH(f, tmp, W, H, r); f.set(tmp); } }
    }
    if (sy > 0.3) {
        if (sy <= exactMax) { convV(f, tmp, W, H, gaussKernel(sy)); f.set(tmp); }
        else { const r = Math.max(1, Math.round(Math.sqrt(12 * sy * sy / 3 + 1) / 2 - 0.5));
               for (let p = 0; p < 3; p++) { boxV(f, tmp, W, H, r); f.set(tmp); } }
    }
}

// std-dev of unit white noise after blur(), measured once per sigma pair
const _noiseNorm = {};
function noiseNorm(sx, sy, ex) {
    if (ex === undefined) ex = 2.5;
    const key = ex + ':' + sx.toFixed(3) + "," + sy.toFixed(3);
    if (_noiseNorm[key]) return _noiseNorm[key];
    const n = Math.max(64, Math.ceil(Math.max(sx, sy) * 24));
    const f = new Float32Array(n * n), t = new Float32Array(n * n);
    const rnd = mulberry32(12345);
    for (let i = 0; i < f.length; i++) f[i] = (rnd() - 0.5) * 3.4641016;
    blur(f, t, n, n, sx, sy, ex);
    let s = 0, c = 0;
    const m = Math.ceil(Math.max(sx, sy) * 4);
    for (let y = m; y < n - m; y++) for (let x = m; x < n - m; x++) { const v = f[y * n + x]; s += v * v; c++; }
    const std = Math.sqrt(s / Math.max(1, c)) || 1;
    _noiseNorm[key] = std;
    return std;
}

// Two-scale film grain into f (unit rms): a fine component near pixel scale
// and a clump component at the stock's clump size (from a coarse grid).
function grainField(f, tmp, W, H, sx, sy, rnd, offX, offY) {
    const fsx = Math.max(0.45, sx * 0.4), fsy = Math.max(0.45, sy * 0.4);
    fillNoise(f, rnd);
    blur(f, tmp, W, H, fsx, fsy, 1.2);
    const nf = noiseNorm(fsx, fsy, 1.2);
    const cw = 0.62, fw = 0.78;
    if (sx < 1.2 && sy < 1.2) { for (let i = 0; i < f.length; i++) f[i] /= nf; return; }
    // coarse grid, one sample per ~clump, lightly smoothed, bilinear upsampled
    const gx = Math.max(1, sx * 1.1), gy = Math.max(1, sy * 1.1);
    const cw_ = Math.ceil(W / gx) + 2, ch_ = Math.ceil(H / gy) + 2;
    const c = new Float32Array(cw_ * ch_), ct = new Float32Array(cw_ * ch_);
    fillNoise(c, rnd); blur(c, ct, cw_, ch_, 0.7, 0.7, 2.5);
    const nc = noiseNorm(0.7, 0.7, 2.5) * 0.82; // bilinear interpolation lowers rms ~18%
    for (let y = 0; y < H; y++) {
        const fy = y / gy + 0.5;
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            f[i] = fw * f[i] / nf + cw * sampleBilinear(c, cw_, ch_, x / gx + 0.5, fy) / nc;
        }
    }
}

function fillNoise(f, rnd) {
    for (let i = 0; i < f.length; i++) f[i] = (rnd() - 0.5) * 3.4641016;
}

// Downsample three channels to a small grid (box average). Returns {w,h,ch:[...]}
function downsample(chs, W, H, maxSide) {
    const s = Math.max(1, Math.ceil(Math.max(W, H) / maxSide));
    const w = Math.ceil(W / s), h = Math.ceil(H / s);
    const out = chs.map(() => new Float32Array(w * h));
    const cnt = new Float32Array(w * h);
    for (let y = 0; y < H; y++) {
        const cy = (y / s) | 0;
        for (let x = 0; x < W; x++) {
            const ci = cy * w + ((x / s) | 0), i = y * W + x;
            for (let c = 0; c < chs.length; c++) out[c][ci] += chs[c][i];
            cnt[ci]++;
        }
    }
    for (let c = 0; c < chs.length; c++) for (let i = 0; i < w * h; i++) out[c][i] /= cnt[i];
    return { w, h, s, ch: out };
}

function sampleBilinear(f, w, h, fx, fy) {
    fx = clamp(fx, 0, w - 1.001); fy = clamp(fy, 0, h - 1.001);
    const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
    const i = y0 * w + x0;
    const a = f[i] + (f[i + 1] - f[i]) * ax;
    const b = f[i + w] + (f[i + w + 1] - f[i + w]) * ax;
    return a + (b - a) * ay;
}

// ------------------------------------------------------------------ render

// src: Uint8Array (chunky RGB or RGBA), W,H,comps
// ctx: { docW, docH, offX, offY } - region placement inside the document so
//      that gate, vignette and physical scales are relative to the whole frame.
function render(src, W, H, comps, opts, ctx) {
    const o = merge(opts);
    ctx = ctx || {};
    const docW = ctx.docW || W, docH = ctx.docH || H;
    const offX = ctx.offX || 0, offY = ctx.offY || 0;
    const N = W * H;
    const is16 = src instanceof Uint16Array;
    const LIN = is16 ? lutIn16() : LUT_IN;
    const MAXV = is16 ? 32768 : 255;
    const rnd = mulberry32((o.seed | 0) * 7919 + 17);

    // physical scale: pixels per mm of film (horizontal, unsqueezed frame)
    const effGate = o.gateMm * o.squeeze;
    const pxPerMm = docW / effGate;

    // ---- decode to linear (B&W: collapse to the stock's spectral response now,
    //      and let G and B alias R so every later stage runs once)
    const byP = !!o.bypassProcess;          // Stock & process switched off: linear pass-through
    const isBW = o.mode === "bw" && !byP;
    const expo = Math.pow(2, o.exposure);
    let R, G, B, bwW = null;
    if (isBW) {
        const f = BW_FILTERS[o.bwFilter] || BW_FILTERS.none;
        const w = [o.bwWeights[0] * f[0], o.bwWeights[1] * f[1], o.bwWeights[2] * f[2]];
        const s = w[0] + w[1] + w[2];
        bwW = [w[0] / s * expo, w[1] / s * expo, w[2] / s * expo];
        R = new Float32Array(N); G = R; B = R;
        for (let i = 0, j = 0; i < N; i++, j += comps)
            R[i] = LIN[src[j]] * bwW[0] + LIN[src[j + 1]] * bwW[1] + LIN[src[j + 2]] * bwW[2];
    } else {
        R = new Float32Array(N); G = new Float32Array(N); B = new Float32Array(N);
        for (let i = 0, j = 0; i < N; i++, j += comps) {
            R[i] = LIN[src[j]] * expo;
            G[i] = LIN[src[j + 1]] * expo;
            B[i] = LIN[src[j + 2]] * expo;
        }
    }
    const CH = isBW ? [R] : [R, G, B];
    const tmp = new Float32Array(N);

    // ---- optics: resolution + edge softness (lens + film MTF)
    const gens = Math.max(0, o.generations);
    const lp = Math.max(2, o.lpmm * o.sharpness / (1 + 0.25 * gens));
    const sigmaMm = 0.187 / lp;
    const sig = sigmaMm * pxPerMm;
    const sigX = sig / o.squeeze * 1.0, sigY = sig; // anamorphic: squeezed axis resolves better per unsqueezed px
    if (sig > 0.35 || o.edgeSoft > 0) {
        const cx = docW / 2, cy = docH / 2, rmax = Math.sqrt(cx * cx + cy * cy);
        const extra = 1 + 2.5 * o.edgeSoft;
        for (const f of CH) {
            if (o.edgeSoft > 0) {
                blur(f, tmp, W, H, sigX, sigY, 1.5);
                const soft = Float32Array.from(f);
                const ex = Math.sqrt(extra * extra - 1);
                blur(soft, tmp, W, H, Math.max(sigX, 0.6) * ex, Math.max(sigY, 0.6) * ex, 0);
                for (let y = 0; y < H; y++) {
                    const dy = (y + offY - cy) / rmax;
                    for (let x = 0; x < W; x++) {
                        const dx = (x + offX - cx) / rmax;
                        const r2 = dx * dx + dy * dy;
                        const w = clamp((r2 - 0.25) / 0.75, 0, 1);
                        const i = y * W + x;
                        f[i] = f[i] + (soft[i] - f[i]) * w * w;
                    }
                }
            } else {
                blur(f, tmp, W, H, sigX, sigY, 1.5);
            }
        }
    }

    // ---- lateral chromatic aberration
    if (o.ca > 0 && !isBW) {
        const k = o.ca * 0.004;
        const cx = docW / 2 - offX, cy = docH / 2 - offY;
        const doCh = (f, s) => {
            tmp.set(f);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const sx = cx + (x - cx) * s, sy = cy + (y - cy) * s;
                f[y * W + x] = sampleBilinear(tmp, W, H, sx, sy);
            }
        };
        doCh(R, 1 - k); doCh(B, 1 + k);
    }

    // ---- glows computed on a small grid (halation, diffusion, low-con, streak)
    let small = null;
    const needGlow = o.halation > 0 || o.diffusion > 0 || o.lowcon > 0 || o.streak > 0;
    if (needGlow) {
        small = downsample([R, G, B], W, H, 480);
        const sw = small.w, sh = small.h, sN = sw * sh;
        const sPxPerMm = pxPerMm / small.s;
        const st = new Float32Array(sN);
        const lum = new Float32Array(sN);
        for (let i = 0; i < sN; i++) lum[i] = 0.2126 * small.ch[0][i] + 0.7152 * small.ch[1][i] + 0.0722 * small.ch[2][i];
        small.glow = [new Float32Array(sN), new Float32Array(sN), new Float32Array(sN)];
        if (o.halation > 0) {
            const h = new Float32Array(sN);
            for (let i = 0; i < sN; i++) { const v = lum[i] - 0.6; h[i] = v > 0 ? v : 0; }
            const s = Math.max(0.6, o.halationMm * sPxPerMm);
            blur(h, st, sw, sh, s, s);
            const hc = o.mode === "bw" ? [1, 1, 1] : o.halationColor;
            const a = o.halation * 0.9;
            for (let i = 0; i < sN; i++) for (let c = 0; c < 3; c++) small.glow[c][i] += h[i] * hc[c] * a;
        }
        if (o.diffusion > 0) {
            const s = Math.max(0.6, o.diffusionMm * sPxPerMm);
            for (let c = 0; c < 3; c++) {
                const d = Float32Array.from(small.ch[c]);
                for (let i = 0; i < sN; i++) d[i] = Math.max(0, d[i] - 0.08); // mostly lights
                blur(d, st, sw, sh, s, s);
                small.glow[c].set(small.glow[c].map((v, i) => v + d[i] * o.diffusion * 0.6));
            }
        }
        if (o.streak > 0) {
            const h = new Float32Array(sN);
            for (let i = 0; i < sN; i++) { const v = lum[i] - 0.9; h[i] = v > 0 ? v : 0; }
            blur(h, st, sw, sh, sw * 0.08, 0.5);
            for (let i = 0; i < sN; i++) for (let c = 0; c < 3; c++) small.glow[c][i] += h[i] * o.streakColor[c] * o.streak * 2.5;
        }
        if (o.lowcon > 0) {
            let mean = 0; for (let i = 0; i < sN; i++) mean += lum[i]; mean /= sN;
            const s = sw * 0.12;
            for (let c = 0; c < 3; c++) {
                const d = Float32Array.from(small.ch[c]);
                blur(d, st, sw, sh, s, s);
                for (let i = 0; i < sN; i++) small.glow[c][i] += (d[i] * 0.6 + mean * 0.4) * o.lowcon * 0.18;
            }
        }
    }

    // ---- process parameters
    let sens = o.sens, dye = o.dye;
    if (byP) { sens = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; dye = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
    else if (o.mode === "bw") {
        const t3 = [1 / 3, 1 / 3, 1 / 3];
        sens = [t3, t3, t3];
        const tA = o.toneAmount;
        const tv = [1 + (o.tone[0] - 1) * tA, 1 + (o.tone[1] - 1) * tA, 1 + (o.tone[2] - 1) * tA];
        dye = [[tv[0] / 3, tv[1] / 3, tv[2] / 3], [tv[0] / 3, tv[1] / 3, tv[2] / 3], [tv[0] / 3, tv[1] / 3, tv[2] / 3]];
    }
    // apply dye fade, then grey-balance columns so equal records print neutral
    // (before toning / fade effects are reintroduced)
    const dyeF = byP ? dye : dye.map((row, k) => row.map((v) => v * o.fade[k]));
    const colN = [0, 1, 2].map((c) => dye[0][c] + dye[1][c] + dye[2][c]);
    let tonemean = 1;
    if (o.mode === "bw") tonemean = (colN[0] + colN[1] + colN[2]) / 3;
    const dyeN = dyeF.map((row) => row.map((v, c) => v / (o.mode === "bw" ? tonemean : colN[c])));

    const push = o.push;
    const gamma = o.contrast * (1 + 0.14 * push) * (1 + 0.06 * gens);
    // (unused when byP; the pass-through keeps exposure unchanged)
    const dmin = o.dmin + Math.max(0, push) * 0.05;
    const dmax = o.dmax;
    const range = dmax - dmin;
    const lat = Math.max(0.3, o.latitude);
    // logistic slope such that max slope = gamma (scaled by latitude)
    const k = 4 * gamma / range / lat * Math.LN10 / Math.LN10;
    // anchor: scene 0.18 prints at D - dmin = 0.745 (display ~0.18)
    const p = clamp(0.745 / range, 0.02, 0.98);
    const x0 = Math.log10(0.18) + Math.log(p / (1 - p)) / k;
    const sat = byP ? 1 : o.saturation;
    const flashAmt = byP ? 0 : o.flash * 0.18;
    const timingX = byP ? [0, 0, 0] : o.timing.map((t) => t * 0.025);   // + = more of that colour (less of its dye)

    // ---- to log exposure records (in place: R,G,B become x0,x1,x2)
    const sgl = small ? small.glow : null;
    const sw = small ? small.w : 0, sh = small ? small.h : 0, ss = small ? small.s : 1;
    const cxv = docW / 2, cyv = docH / 2, rv = Math.sqrt(cxv * cxv + cyv * cyv);
    const vig = o.vignette;
    for (let y = 0; y < H; y++) {
        const gy = y + offY;
        const dyv = (gy - cyv) / rv;
        const fy = (y + 0.5) / ss - 0.5;
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            let r = R[i], g = G[i], b = B[i];
            if (sgl) {
                const fx = (x + 0.5) / ss - 0.5;
                r += sampleBilinear(sgl[0], sw, sh, fx, fy);
                g += sampleBilinear(sgl[1], sw, sh, fx, fy);
                b += sampleBilinear(sgl[2], sw, sh, fx, fy);
            }
            if (vig > 0) {
                const dxv = (x + offX - cxv) / rv;
                const r2 = dxv * dxv + dyv * dyv;
                const f = 1 / Math.pow(1 + vig * 1.6 * r2, 2);
                r *= f; g *= f; b *= f;
            }
            let e0 = sens[0][0] * r + sens[0][1] * g + sens[0][2] * b;
            let e1 = sens[1][0] * r + sens[1][1] * g + sens[1][2] * b;
            let e2 = sens[2][0] * r + sens[2][1] * g + sens[2][2] * b;
            if (flashAmt > 0) { e0 += flashAmt * o.flashTint[0]; e1 += flashAmt * o.flashTint[1]; e2 += flashAmt * o.flashTint[2]; }
            let l0 = flog10(e0 > 1e-6 ? e0 : 1e-6);
            let l1 = flog10(e1 > 1e-6 ? e1 : 1e-6);
            let l2 = flog10(e2 > 1e-6 ? e2 : 1e-6);
            if (sat !== 1) {
                const m = (l0 + l1 + l2) / 3;
                l0 = m + (l0 - m) * sat; l1 = m + (l1 - m) * sat; l2 = m + (l2 - m) * sat;
            }
            if (isBW) R[i] = l0; else { R[i] = l0 + timingX[0]; G[i] = l1 + timingX[1]; B[i] = l2 + timingX[2]; }
        }
    }

    // ---- grain (added in log exposure; the curve shapes its visibility)
    const grainAmt = o.grain * o.grainRms * (1 + 0.35 * Math.max(0, push)) * Math.sqrt(1 + 0.8 * gens);
    if (grainAmt > 0) {
        const gs = Math.max(0.0, o.grainClumpMm * pxPerMm);
        const gsx = gs * o.squeeze, gsy = gs;   // anamorphic grain is stretched horizontally
        const noise = new Float32Array(N);
        const mono = o.mode === "bw" ? 1 : 1 - clamp(o.grainColor, 0, 1);
        const aC = Math.sqrt(mono), aI = Math.sqrt(1 - mono);
        grainField(noise, tmp, W, H, gsx, gsy, rnd);
        let s = grainAmt * aC;
        if (isBW) { for (let i = 0; i < N; i++) R[i] += noise[i] * s; }
        else for (let i = 0; i < N; i++) { const v = noise[i] * s; R[i] += v; G[i] += v; B[i] += v; }
        if (aI > 0 && !isBW) {
            for (const f of CH) {
                grainField(noise, tmp, W, H, gsx, gsy, rnd);
                s = grainAmt * aI;
                for (let i = 0; i < N; i++) f[i] += noise[i] * s;
            }
        }
    }

    // ---- flicker / mottle / stains: low-frequency density fields
    let lowD = null;
    if (o.flicker > 0 || o.stains > 0) {
        const lw = 48, lh = Math.max(8, Math.round(48 * docH / docW));
        lowD = [new Float32Array(lw * lh), new Float32Array(lw * lh), new Float32Array(lw * lh)];
        const t = new Float32Array(lw * lh);
        const base = new Float32Array(lw * lh);
        fillNoise(base, rnd); blur(base, t, lw, lh, 4, 4);
        const nb = noiseNorm(4, 4);
        for (let c = 0; c < 3; c++) {
            const col = new Float32Array(lw * lh);
            fillNoise(col, rnd); blur(col, t, lw, lh, 3, 3);
            const nc = noiseNorm(3, 3);
            for (let i = 0; i < lw * lh; i++) lowD[c][i] = o.flicker * (0.06 * base[i] / nb + 0.02 * col[i] / nc);
        }
        if (o.stains > 0) {
            const st = new Float32Array(lw * lh);
            fillNoise(st, rnd); blur(st, t, lw, lh, 1.6, 1.6);
            const ns = noiseNorm(1.6, 1.6);
            for (let i = 0; i < lw * lh; i++) {
                const v = st[i] / ns - (2.2 - o.stains * 0.9);
                if (v > 0) { const d = v * 0.35 * o.stains; lowD[0][i] += d * 0.6; lowD[1][i] += d * 0.9; lowD[2][i] += d * 1.3; }
            }
        }
        lowD.w = lw; lowD.h = lh;
    }

    // ---- curve + dyes -> display
    const tintD = byP ? [0, 0, 0] : [o.tint[0] * o.tintAmount, o.tint[1] * o.tintAmount, o.tint[2] * o.tintAmount];
    const bleach = byP ? 0 : o.bleach;
    // reference density of print white (records at dmin), for normalisation
    const wD = byP ? [0, 0, 0] : [0, 1, 2].map((c) => dmin * (dyeN[0][c] + dyeN[1][c] + dyeN[2][c]) + bleach * dmin * 0.8);
    const lift = o.gradeLift, gain = o.gradeGain, gsat = o.gradeSat, gblack = o.gradeBlack, gwhite = o.gradeWhite;
    const iris = clamp(o.iris, 0, 1), isz = Math.max(0.2, o.irisSize), isoft = clamp(o.irisSoft, 0.02, 1);
    const out = is16 ? new Uint16Array(N * 4) : new Uint8Array(N * 4);
    const amt = clamp(o.amount, 0, 1);
    const CN = 8192, cLo = x0 - 9 / k, cHi = x0 + 9 / k, cStep = (cHi - cLo) / CN;
    const cLut = new Float32Array(CN + 2);
    for (let i = 0; i <= CN + 1; i++) cLut[i] = dmax - range / (1 + Math.exp(-k * (cLo + i * cStep - x0)));
    const curveFilm = (x) => {
        let f = (x - cLo) / cStep;
        if (f <= 0) return cLut[0];
        if (f >= CN) return cLut[CN];
        const i = f | 0; return cLut[i] + (cLut[i + 1] - cLut[i]) * (f - i);
    };
    const curve = byP ? (x) => -x : curveFilm;   // pass-through: density = -log exposure
    const PN = 8000, PS = 1000; // 10^-t for t in [0, 8]
    const pLut = new Float32Array(PN + 2);
    for (let i = 0; i <= PN + 1; i++) pLut[i] = Math.pow(10, -i / PS);
    const p10 = (t) => {
        if (t <= 0) return Math.pow(10, -t);
        const f = t * PS; if (f >= PN) return 0;
        const i = f | 0; return pLut[i] + (pLut[i + 1] - pLut[i]) * (f - i);
    };

    // gate geometry (in document space)
    const docAR = docW / docH;
    let gx0 = 0, gy0 = 0, gx1 = docW, gy1 = docH;
    if (o.frame === "matte") {
        if (o.aspect > docAR) { const hh = docW / o.aspect; gy0 = (docH - hh) / 2; gy1 = gy0 + hh; }
        else { const ww = docH * o.aspect; gx0 = (docW - ww) / 2; gx1 = gx0 + ww; }
    }
    const shortSide = Math.min(gx1 - gx0, gy1 - gy0);
    const icx = (gx0 + gx1) / 2, icy = (gy0 + gy1) / 2, ihw = (gx1 - gx0) / 2, ihh = (gy1 - gy0) / 2;
    const cr = o.corner * shortSide, soft = Math.max(0.5, o.gateSoft * shortSide);
    const useGate = o.frame === "matte";

    for (let y = 0; y < H; y++) {
        const gy = y + offY;
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const D0 = curve(R[i]), D1 = isBW ? D0 : curve(G[i]), D2 = isBW ? D0 : curve(B[i]);
            let c0 = D0 * dyeN[0][0] + D1 * dyeN[1][0] + D2 * dyeN[2][0] + tintD[0];
            let c1 = D0 * dyeN[0][1] + D1 * dyeN[1][1] + D2 * dyeN[2][1] + tintD[1];
            let c2 = D0 * dyeN[0][2] + D1 * dyeN[1][2] + D2 * dyeN[2][2] + tintD[2];
            if (bleach > 0) { const sD = (D0 + D1 + D2) / 3 * bleach * 0.8; c0 += sD; c1 += sD; c2 += sD; }
            if (lowD) {
                const fx = (x + offX) / docW * lowD.w - 0.5, fy = gy / docH * lowD.h - 0.5;
                c0 += sampleBilinear(lowD[0], lowD.w, lowD.h, fx, fy);
                c1 += sampleBilinear(lowD[1], lowD.w, lowD.h, fx, fy);
                c2 += sampleBilinear(lowD[2], lowD.w, lowD.h, fx, fy);
            }
            let r = p10(c0 - wD[0]), g = p10(c1 - wD[1]), b = p10(c2 - wD[2]);
            // grade (in linear light)
            if (gsat !== 1) { const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; r = l + (r - l) * gsat; g = l + (g - l) * gsat; b = l + (b - l) * gsat; }
            r *= gain[0]; g *= gain[1]; b *= gain[2];
            let er = encode(r), eg = encode(g), eb = encode(b);
            if (lift[0] || lift[1] || lift[2]) {
                const sh = 1 - (0.2126 * er + 0.7152 * eg + 0.0722 * eb); const w = sh * sh;
                er += lift[0] * w; eg += lift[1] * w; eb += lift[2] * w;
            }
            if (gwhite !== 1) { er *= gwhite; eg *= gwhite; eb *= gwhite; }
            if (gblack > 0) { er = gblack + er * (1 - gblack); eg = gblack + eg * (1 - gblack); eb = gblack + eb * (1 - gblack); }
            else if (gblack < 0) { const c = -gblack, d = 1 / (1 - c); er = er > c ? (er - c) * d : 0; eg = eg > c ? (eg - c) * d : 0; eb = eb > c ? (eb - c) * d : 0; }
            if (iris > 0) {
                const ux = (x + offX - icx) / (ihw * isz), uy = (gy - icy) / (ihh * isz);
                const rr = Math.sqrt(ux * ux + uy * uy);
                const t = clamp((rr - (1 - isoft)) / isoft, 0, 1);
                const m = 1 - iris * t * t * (3 - 2 * t);
                er *= m; eg *= m; eb *= m;
            }
            // gate mask
            if (useGate) {
                const gx = x + offX;
                let dx = Math.max(gx0 + cr - gx, gx - (gx1 - cr), 0);
                let dy = Math.max(gy0 + cr - gy, gy - (gy1 - cr), 0);
                let dist;
                if (dx > 0 && dy > 0) dist = Math.sqrt(dx * dx + dy * dy) - cr;
                else dist = Math.max(gx0 - gx, gx - gx1, gy0 - gy, gy - gy1, (dx > 0 || dy > 0) ? Math.max(dx, dy) - cr : -1e9);
                const m = clamp(0.5 - dist / soft, 0, 1);
                er *= m; eg *= m; eb *= m;
            }
            const j = i * 4, s = i * comps;
            if (amt < 1) {
                const sr = src[s] / MAXV, sg = src[s + 1] / MAXV, sb2 = src[s + 2] / MAXV;
                er = sr + (er - sr) * amt; eg = sg + (eg - sg) * amt; eb = sb2 + (eb - sb2) * amt;
            }
            out[j] = clamp(Math.round(er * MAXV), 0, MAXV);
            out[j + 1] = clamp(Math.round(eg * MAXV), 0, MAXV);
            out[j + 2] = clamp(Math.round(eb * MAXV), 0, MAXV);
            out[j + 3] = comps === 4 ? src[s + 3] : MAXV;
        }
    }

    // ---- colour fringing (after the look, before print damage)
    if (hasFringe(o)) fringe(out, W, H, o, { docW, docH, offX, offY });

    // ---- dust & scratches (drawn on the output, in document space)
    if (o.dustWhite > 0 || o.dustBlack > 0 || o.scratches > 0) {
        drawDamage(out, W, H, docW, docH, offX, offY, o, rnd, pxPerMm, MAXV);
    }
    return out;
}

function drawDamage(out, W, H, docW, docH, offX, offY, o, rnd, pxPerMm, MAXV) {
    const sc = MAXV / 255;
    const area = docW * docH;
    const unit = Math.sqrt(area) / 1000; // size unit relative to image
    const blob = (cx, cy, rad, col, alpha, elong, ang) => {
        const r = Math.ceil(rad * (1 + elong) + 2);
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let yy = -r; yy <= r; yy++) {
            const py = Math.round(cy + yy) - offY; if (py < 0 || py >= H) continue;
            for (let xx = -r; xx <= r; xx++) {
                const px = Math.round(cx + xx) - offX; if (px < 0 || px >= W) continue;
                const u = (xx * ca + yy * sa) / (1 + elong), v = -xx * sa + yy * ca;
                const d = Math.sqrt(u * u + v * v);
                const a = clamp(rad - d + 0.5, 0, 1) * alpha;
                if (a <= 0) continue;
                const j = (py * W + px) * 4;
                for (let c = 0; c < 3; c++) out[j + c] = Math.round(out[j + c] + (col[c] * sc - out[j + c]) * a);
            }
        }
    };
    const nW = Math.round(o.dustWhite * o.dustWhite * 220 * area / 4e6);
    for (let n = 0; n < nW; n++) {
        const rad = unit * (0.4 + Math.pow(rnd(), 3) * 3.5);
        blob(rnd() * docW, rnd() * docH, rad, [255, 255, 250], 0.55 + rnd() * 0.45, rnd() * 1.5, rnd() * 3.14);
    }
    const nB = Math.round(o.dustBlack * o.dustBlack * 160 * area / 4e6);
    for (let n = 0; n < nB; n++) {
        const rad = unit * (0.3 + Math.pow(rnd(), 3) * 2.5);
        blob(rnd() * docW, rnd() * docH, rad, [8, 8, 8], 0.5 + rnd() * 0.5, rnd() * 2, rnd() * 3.14);
    }
    // a few hairs / fibres (black, curved)
    const nH = Math.round(o.dustBlack * 3 * Math.min(1, area / 4e6) + (o.dustBlack > 0.5 ? 1 : 0));
    for (let n = 0; n < nH; n++) {
        let x = rnd() * docW, y = rnd() * docH, ang = rnd() * 6.28;
        const len = unit * (40 + rnd() * 120);
        for (let t = 0; t < len; t += 0.7) {
            ang += (rnd() - 0.5) * 0.12;
            x += Math.cos(ang) * 0.7; y += Math.sin(ang) * 0.7;
            blob(x, y, unit * 0.45, [10, 10, 10], 0.5, 0, 0);
        }
    }
    // vertical scratches
    const nS = Math.round(o.scratches * 7);
    const col = o.scratchColor.map((v) => Math.round(v * 255));
    for (let n = 0; n < nS; n++) {
        let x = rnd() * docW;
        const y0 = rnd() < 0.6 ? 0 : rnd() * docH * 0.6;
        const y1 = rnd() < 0.6 ? docH : y0 + rnd() * (docH - y0);
        const wdt = unit * (0.35 + rnd() * 0.9);
        const a = 0.25 + rnd() * 0.45 * o.scratches;
        let drift = (rnd() - 0.5) * 0.02;
        for (let y = Math.floor(y0); y < y1; y++) {
            x += drift + (rnd() - 0.5) * 0.25;
            const py = y - offY; if (py < 0 || py >= H) continue;
            for (let xx = -Math.ceil(wdt); xx <= Math.ceil(wdt); xx++) {
                const px = Math.round(x) + xx - offX; if (px < 0 || px >= W) continue;
                const w = clamp(wdt - Math.abs(xx) + 0.5, 0, 1) * a * (0.7 + 0.3 * rnd());
                const j = (py * W + px) * 4;
                for (let c = 0; c < 3; c++) out[j + c] = Math.round(out[j + c] + (col[c] * sc - out[j + c]) * w);
            }
        }
    }
}

function hasFringe(o) {
    return o.fringeLat > 0 || o.fringeAxial > 0 || o.fringeRx || o.fringeRy || o.fringeBx || o.fringeBy;
}

// Colour fringing on an RGBA buffer (Uint8 or Uint16 with 32768 max) in place.
// ctx: { docW, docH, offX, offY } so the lens centre and scales follow the whole frame.
function fringe(buf, W, H, opts, ctx) {
    const o = merge(opts);
    ctx = ctx || {};
    const docW = ctx.docW || W, docH = ctx.docH || H, offX = ctx.offX || 0, offY = ctx.offY || 0;
    const is16 = buf instanceof Uint16Array;
    const MAXV = is16 ? 32768 : 255;
    const N = W * H;
    const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
    for (let i = 0, j = 0; i < N; i++, j += 4) { R[i] = buf[j]; G[i] = buf[j + 1]; B[i] = buf[j + 2]; }
    const cx = docW / 2 - offX, cy = docH / 2 - offY;
    const k = clamp(o.fringeLat, 0, 1.5) * 0.006;
    const ky = k * (1 - clamp(o.fringeAniso, 0, 1));
    const pm = docW / 1000;
    const rdx = (o.fringeRx || 0) * pm, rdy = (o.fringeRy || 0) * pm, bdx = (o.fringeBx || 0) * pm, bdy = (o.fringeBy || 0) * pm;
    // magnification per channel: rc = red larger, blue smaller; pg = red & blue larger, green smaller
    const mR = o.fringeMode === "pg" ? [k * 0.5, ky * 0.5] : [k, ky];
    const mG = o.fringeMode === "pg" ? [-k * 0.5, -ky * 0.5] : [0, 0];
    const mB = o.fringeMode === "pg" ? [k * 0.5, ky * 0.5] : [-k, -ky];
    const resample = (src, m, dx, dy) => {
        if (!m[0] && !m[1] && !dx && !dy) return src;
        const dst = new Float32Array(N);
        const sx = 1 / (1 + m[0]), sy = 1 / (1 + m[1]);
        for (let y = 0; y < H; y++) {
            const fy = cy + (y - dy - cy) * sy;
            for (let x = 0; x < W; x++) {
                dst[y * W + x] = sampleBilinear(src, W, H, cx + (x - dx - cx) * sx, fy);
            }
        }
        return dst;
    };
    const R2 = resample(R, mR, rdx, rdy), G2 = resample(G, mG, 0, 0), B2 = resample(B, mB, bdx, bdy);
    // axial / purple fringing: halo just outside bright areas
    let halo = null;
    if (o.fringeAxial > 0) {
        const h = new Float32Array(N), t = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const l = (0.2126 * G2[i] * 0 + 0.2126 * R2[i] + 0.7152 * G2[i] + 0.0722 * B2[i]) / MAXV;
            h[i] = clamp((l - 0.72) / 0.25, 0, 1);
        }
        const core = Float32Array.from(h);
        const rad = Math.max(0.8, o.fringeAxialR * docW);
        blur(h, t, W, H, rad, rad, 0);
        halo = h;
        for (let i = 0; i < N; i++) { const v = h[i] - core[i] * 0.85; halo[i] = v > 0 ? v * o.fringeAxial * 2.4 : 0; }
    }
    for (let i = 0, j = 0; i < N; i++, j += 4) {
        let r = R2[i], g = G2[i], b = B2[i];
        if (halo) { const f = halo[i] * MAXV; r += f * 0.55; g -= f * 0.18; b += f * 0.95; }
        buf[j] = clamp(Math.round(r), 0, MAXV);
        buf[j + 1] = clamp(Math.round(g), 0, MAXV);
        buf[j + 2] = clamp(Math.round(b), 0, MAXV);
    }
    return buf;
}

const api = { DEFAULTS, BW_FILTERS, render, merge, fringe, hasFringe };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.FilmEngine = api;

})(typeof globalThis !== "undefined" ? globalThis : this);
