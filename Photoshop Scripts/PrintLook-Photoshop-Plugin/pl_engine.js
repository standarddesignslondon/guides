// PrintLook - the engine. Plates in, a printed sheet out.
//
// For each plate (one ink), in printing order:
//   artwork -> knock-outs -> register (shift, stretch, twist) -> tone carrier (halftone dots, crayon grain, gravure cells ...)
//   -> the mark the process makes (spread, rounded corners, ragged or mesh-cut edge, squeezed rim, starved middle)
//   -> faults in the solid (mottle, salt, speckle, wood grain, uneven sorts, hickeys, hollow xerographic solids ...)
//   -> an ink film of some thickness, laid over the paper and the inks already down (transparent inks filter, opaque inks cover,
//      and light spreading inside the paper darkens the gaps between dots).
// Then the sheet ages. All sizes are real sizes: micrometres on the paper, converted with the document's resolution.
// Work is done in horizontal bands with margins, and every random field is a function of document position, so bands
// and previews of a selection match the full render exactly.
const C = require("./pl_core.js"), D = require("./pl_data.js");

// ------------------------------------------------------------------ small helpers
function phiInv(p) { // inverse normal CDF (Acklam), for edge thresholds
    p = p < 1e-6 ? 1e-6 : (p > 1 - 1e-6 ? 1 - 1e-6 : p);
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
        b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572],
        c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
        d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    let q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function phi(x) { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }

// Distribution of the two-octave lattice noise, so that "5% of the sheet" can be turned into a threshold.
let NOISE_Q = null;
function noiseQuantile(f) { // value v such that a fraction f of the noise lies ABOVE v
    if (!NOISE_Q) { const n = 256, a = new Float32Array(n * n); C.fbm(a, n, n, 9973, 7919, 9.3, 4242, 2); NOISE_Q = Array.from(a).sort((x, y) => x - y); }
    const i = Math.round((1 - C.clamp(f, 0, 1)) * (NOISE_Q.length - 1)); return NOISE_Q[i];
}

// Spot functions for halftone screens: a 128 x 128 table over one screen cell, remapped so that thresholding at t inks a
// fraction t of the cell exactly.
const SPOTS = {};
function spotTable(kind) {
    if (SPOTS[kind]) return SPOTS[kind];
    const N = 128, raw = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N, v = (j + 0.5) / N, du = u - 0.5, dv = v - 0.5; let s;
        if (kind === "round") s = Math.sqrt(du * du + dv * dv);                                   // round dots that touch at 78%
        else if (kind === "ellipse") s = 0.5 - 0.25 * (Math.cos(2 * Math.PI * u) + 0.72 * Math.cos(2 * Math.PI * v)); // chain dot: joins one way first
        else if (kind === "line") s = Math.abs(dv) * 2;                                          // parallel lines
        else s = 0.5 - 0.25 * (Math.cos(2 * Math.PI * u) + Math.cos(2 * Math.PI * v));             // glass screen: chessboard at 50%
        raw[j * N + i] = s;
    }
    const idx = Array.from(raw.keys()).sort((a, b) => raw[a] - raw[b]), t = new Float32Array(N * N);
    for (let r = 0; r < idx.length; r++) t[idx[r]] = (r + 0.5) / idx.length;
    return (SPOTS[kind] = t);
}

// A blur that drops to a coarser grid for wide kernels (halo, hollow, edge toning): cost stays flat.
function gaussBig(src, dst, w, h, sigma, tmp) {
    if (sigma <= 10) return C.gauss(src, dst, w, h, sigma, tmp);
    const f = Math.max(2, Math.floor(sigma / 4)), sw = Math.ceil(w / f), sh = Math.ceil(h / f), sm = new Float32Array(sw * sh), st = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let a = 0, n = 0; const y1 = Math.min(h, (y + 1) * f), x1 = Math.min(w, (x + 1) * f); for (let yy = y * f; yy < y1; yy++) { const r = yy * w; for (let xx = x * f; xx < x1; xx++) { a += src[r + xx]; n++; } } sm[y * sw + x] = a / n; }
    C.gauss(sm, sm, sw, sh, sigma / f, st);
    for (let y = 0; y < h; y++) { const fy = Math.min(sh - 1, Math.max(0, (y + 0.5) / f - 0.5)), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0; for (let x = 0; x < w; x++) { const fx = Math.min(sw - 1, Math.max(0, (x + 0.5) / f - 0.5)), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0; const a = sm[y0 * sw + x0] + (sm[y0 * sw + x1] - sm[y0 * sw + x0]) * tx, b = sm[y1 * sw + x0] + (sm[y1 * sw + x1] - sm[y1 * sw + x0]) * tx; dst[y * w + x] = a + (b - a) * ty; } }
    return dst;
}

// ------------------------------------------------------------------ per-job preparation
function prepare(job) {
    const s = job.settings, en = job.enabled || {}, W = job.W, H = job.H;
    const scale = Math.max(0.05, s.scale || 1), um = 25400 / (job.ppi || 300) / scale;   // micrometres of paper per pixel
    const px = (v) => v / um, mm = (v) => v * 1000 / um;
    const stock = D.PAPERS[s.paper.stock] || D.PAPERS.mf_white;
    const tooth = s.paper.tooth >= 0 ? s.paper.tooth : stock.tooth;
    const on = (k) => en[k] !== false;
    const P = Object.assign({}, D.PRESS0, s.press);
    if (!on("ink")) Object.assign(P, { gain: 0, soften: 0, edge: 0, ragged: 0, rim: 0, starve: 0, bleed: 0, halo: 0, impression: 0, ink: 1, pressure: 1 });
    if (!on("faults")) Object.assign(P, { mottle: 0, salt: 0, speckle: 0, sorts: 0, grain: 0, wear: 0, mesh: 0, hollow: 0, spatter: 0, slur: 0, hickeys: 0, specks: 0, scum: 0, banding: 0 });
    const age = on("age") ? s.age : { yellow: 0, edges: 0, foxing: 0, fade: 0, folds: 0, wear: 0, dirt: 0, setoff: 0, oil: 0 };
    const seed = (s.seed | 0) || 1;

    // printing order
    let order = job.plates.map((p, i) => i);
    if (s.colour.order === "light_first") order.sort((a, b) => (C.lum(C.rgbLin(job.plates[b].ink.rgb)) - C.lum(C.rgbLin(job.plates[a].ink.rgb))) || (a - b));

    // register: the first plate down is the reference
    const reg = job.plates.map(() => ({ dx: 0, dy: 0, sx: 0, sy: 0, rot: 0 }));
    if (on("register") && (s.register.error > 0 || s.register.stretch > 0 || s.register.rotate > 0)) {
        order.forEach((pi, n) => {
            if (n === 0) return;
            const r = C.rng(seed * 7919 + pi * 104729 + 13), g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / 0.7071; }; // ~N(0,1)
            reg[pi] = { dx: mm(s.register.error) * 0.7071 * g(), dy: mm(s.register.error) * 0.7071 * g(), sx: s.register.stretch / 1000 * 0.4 * g(), sy: s.register.stretch / 1000 * Math.abs(g()), rot: s.register.rotate * Math.PI / 180 * g() };
        });
    }
    let maxShift = 0;
    for (const r of reg) maxShift = Math.max(maxShift, Math.abs(r.dx) + Math.abs(r.sx) * W + Math.abs(r.rot) * H, Math.abs(r.dy) + Math.abs(r.sy) * H + Math.abs(r.rot) * W);

    // who knocks out whom: a plate is cut away under every plate from a HIGHER layer, unless that one overprints
    const ko = job.plates.map((p, pi) => {
        if (s.colour.overlaps === "overprint") return [];
        const feet = [];
        job.plates.forEach((q, qi) => { if (q.layer > p.layer && !q.overprint && !(s.colour.overlaps === "knockout_k" && q.key && q.kind === "line")) { const f = q.foot || q.tau; if (feet.indexOf(f) < 0) feet.push(f); } });
        return feet;
    });

    // letters ("sorts"): connected pieces of each line plate, found on a reduced copy
    const needSorts = P.sorts > 0 || !!job.inkTexture;
    const lf = Math.max(1, Math.ceil(Math.max(W, H) / 1400)), lw = Math.ceil(W / lf), lh = Math.ceil(H / lf);
    const labels = job.plates.map((p) => {
        if (!needSorts || p.kind !== "line") return null;
        const bin = new Uint8Array(lw * lh), cnt = new Uint16Array(lw * lh), sum = new Uint32Array(lw * lh);
        for (let y = 0; y < H; y++) { const ly = (y / lf) | 0, r = y * W; for (let x = 0; x < W; x++) { const li = ly * lw + ((x / lf) | 0); sum[li] += p.tau[r + x]; cnt[li]++; } }
        for (let i = 0; i < lw * lh; i++) bin[i] = sum[i] > cnt[i] * 90 ? 1 : 0;
        const L = C.label(bin, lw, lh); return C.growLabels(L.labels, lw, lh, 3);
    });

    // blur radii in pixels
    const absorb = stock.absorb, pr = P.pressure;
    const fam = (D.PROCESSES[s.process] || {}).family;
    const q = {
        relief: fam === "relief", family: fam, um, px, mm, scale, stock, tooth, P, age, seed, order, reg, ko, labels, lf, lw, lh, on,
        gain: px(P.gain * (0.55 + 0.45 * pr * P.ink) * (0.8 + 0.5 * absorb)),
        soften: px(P.soften * (1 + 0.6 * P.wear)), edgeW: Math.max(0.9, px(P.edge)),
        rimS: Math.max(0.5, px(P.rimWidth) / 2), haloS: px(P.haloWidth) / 2, hollowS: px(P.hollowWidth) / 2,
        bleedS: px(P.bleed * (0.4 + 1.2 * absorb)), spreadS: 1.2 * px(stock.spread),
        saltP: Math.max(1, px(P.saltScale)), mottleP: Math.max(2, px(P.mottleScale)), raggedP: Math.max(1.5, px(P.raggedScale)),
        saltEff: P.salt * (0.5 + 1.25 * tooth) * C.clamp(1.6 - 0.6 * pr * P.ink, 0.3, 1.6),
        raggedPx: px(P.ragged * (0.6 + tooth) * 55), slurPx: px(P.slur)
    };
    const sig = [q.soften, q.gain / 1.4, q.rimS, q.haloS * (1 + age.oil), q.hollowS, q.bleedS, q.spreadS, px(600 * age.oil), mm(0.9)];
    q.margin = Math.min(900, Math.ceil(3 * Math.max.apply(null, sig) + maxShift + q.slurPx + 4));
    return q;
}

// ------------------------------------------------------------------ sampling a plate into a band, with register and knock-outs
// How much of the plate below survives under a layer of this coverage: solid colour cuts it away, a tint (under about half) leaves it.
const CUT = new Float32Array(256); for (let i = 0; i < 256; i++) { const a = i / 255, t = a <= 0.5 ? 0 : (a >= 0.9 ? 1 : (a - 0.5) / 0.4); CUT[i] = 1 - t; }
function samplePlate(job, q, pi, bx, by, w, h, out, ko) {
    const W = job.W, H = job.H, p = job.plates[pi], r = q.reg[pi], tau = p.tau, feet = q.ko[pi], nf = feet.length;
    const moved = r.dx || r.dy || r.sx || r.sy || r.rot, cx = W / 2, cy = H / 2;
    let any = 0;
    if (!moved) {
        for (let y = 0; y < h; y++) { const src = (by + y) * W + bx, o = y * w; for (let x = 0; x < w; x++) { const v = tau[src + x]; if (v) any = 1; out[o + x] = v / 255; if (nf) { let k = 1; for (let f = 0; f < nf; f++) k *= CUT[feet[f][src + x]]; ko[o + x] = k; } } }
        return any;
    }
    const bil = (arr, xs, ys) => {
        if (xs < 0 || ys < 0 || xs > W - 1 || ys > H - 1) return 0;
        const x0 = xs | 0, y0 = ys | 0, x1 = x0 < W - 1 ? x0 + 1 : x0, y1 = y0 < H - 1 ? y0 + 1 : y0, tx = xs - x0, ty = ys - y0;
        const a = arr[y0 * W + x0], b = arr[y0 * W + x1], c = arr[y1 * W + x0], d = arr[y1 * W + x1];
        return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    };
    for (let y = 0; y < h; y++) {
        const Y = by + y, o = y * w;
        for (let x = 0; x < w; x++) {
            const X = bx + x, xs = X - r.dx - r.sx * (X - cx) + r.rot * (Y - cy), ys = Y - r.dy - r.sy * Y - r.rot * (X - cx);
            const v = bil(tau, xs, ys); if (v > 0.5) any = 1;
            out[o + x] = v / 255;
            if (nf) { let k = 1; for (let f = 0; f < nf; f++) k *= CUT[Math.round(bil(feet[f], xs, ys))]; ko[o + x] = k; }
        }
    }
    return any;
}
// The same register transform, for another array (used to find what lies next to a spot colour).
function sampleOther(job, q, pi, arr, bx, by, w, h, out, add) {
    const W = job.W, H = job.H, r = q.reg[pi], cx = W / 2, cy = H / 2;
    for (let y = 0; y < h; y++) { const Y = by + y, o = y * w; for (let x = 0; x < w; x++) { const X = bx + x, xs = Math.round(X - r.dx - r.sx * (X - cx) + r.rot * (Y - cy)), ys = Math.round(Y - r.dy - r.sy * Y - r.rot * (X - cx)); const v = (xs < 0 || ys < 0 || xs >= W || ys >= H) ? 0 : arr[ys * W + xs] / 255; out[o + x] = add ? out[o + x] + v : v; } }
}
// Grow a 0..1 region by d pixels (blur and re-threshold).
function grow(src, dst, w, h, d, tmp) {
    const sg = Math.max(0.6, d / 1.3); C.gauss(src, dst, w, h, sg, tmp); const T = phi(-d / sg), wT = 0.3989 / sg;
    for (let i = 0; i < w * h; i++) { const v = (dst[i] - T) / wT + 0.5; dst[i] = v <= 0 ? 0 : (v >= 1 ? 1 : v); }
    return dst;
}

// ------------------------------------------------------------------ tone carriers
// a: tone 0..1 in the band (in place -> coverage 0..1). Returns true if the result is continuous (not to be re-thresholded).
function carrier(job, q, p, pi, a, bx, by, w, h, tmp, notes) {
    const s = job.settings, T = s.tone, n = w * h, seed = q.seed + 31 * pi;
    const con = T.contrast || 1, lo = T.minDot || 0, hi = T.maxDot === undefined ? 1 : T.maxDot;
    const steps = p.tints ? 3 : (T.tintSteps | 0), nominal = p.role === "flat" || steps >= 2;   // flat tints are nominal dot areas, not tones to be matched
    const comp = (!nominal && q.comp && q.comp[pi]) ? q.comp[pi] : null;
    const curve = (v) => {
        if (v <= 0) return 0;
        if (con !== 1) { v = (v - 0.5) * con + 0.5; if (v <= 0) return 0; if (v > 1) v = 1; }
        if (comp) { const j = v * 256, j0 = j >= 256 ? 255 : (j | 0); v = comp[j0] + (comp[j0 + 1] - comp[j0]) * (j - j0); }
        if (steps >= 2) v = steps === 3 ? (v < 0.12 ? 0 : (v < 0.375 ? 0.25 : (v < 0.72 ? 0.5 : 1))) : Math.round(v * steps) / steps;
        if (v < lo) return lo > 0 ? v * C.smooth((v - lo * 0.6) / (lo * 0.4)) : v;
        if (v > hi) return 1;
        return v;
    };
    let kind = q.on("tone") ? T.carrier : "contone";
    if (p.tints && kind !== "halftone" && kind !== "line") kind = "halftone";
    const ppiEff = 25400 / q.um;
    if (kind === "contone") { for (let i = 0; i < n; i++) a[i] = curve(a[i]); return true; }
    if (kind === "halftone" || kind === "line" || kind === "gravure") {
        const period = ppiEff / Math.max(10, T.lpi); p._period = period;
        if (period < 2.4) { notes.fine = "the " + T.lpi + "-line screen is finer than this document can hold (" + period.toFixed(1) + " px per dot), so tone is drawn as a smooth tint; raise the resolution or the Detail scale"; for (let i = 0; i < n; i++) a[i] = curve(a[i]); return true; }
        const ang = ((p.angle !== undefined ? p.angle : T.angle) || 0) * Math.PI / 180, ca = Math.cos(ang) / period, sa = Math.sin(ang) / period;
        const r = q.reg[pi];
        if (kind === "gravure") {
            // equal cells, walls a quarter of the pitch; the ink floods over the walls in the darks
            const wall = 0.25, soft = Math.min(0.2, 0.7 / period);
            for (let y = 0; y < h; y++) { const Y = by + y - r.dy; let o = y * w; for (let x = 0; x < w; x++, o++) { const v = curve(a[o]); if (v <= 0) { a[o] = 0; continue; } const X = bx + x - r.dx; let u = X * ca + Y * sa, vv = -X * sa + Y * ca; u -= Math.floor(u); vv -= Math.floor(vv); const du = Math.abs(u - 0.5), dv = Math.abs(vv - 0.5), d = du > dv ? du : dv; const cell = C.clamp((0.5 - wall / 2 - d) / soft + 0.5, 0, 1), flood = C.smooth((v - 0.7) / 0.3) * 0.85; a[o] = v * (cell + (1 - cell) * flood); } }
            return true;
        }
        const tab = spotTable(kind === "line" ? "line" : T.dot), N = 128, ws = Math.max(0.02, 0.85 / period), off = [0.25, 0.25, -0.25, 0.25, 0.25, -0.25, -0.25, -0.25];
        for (let y = 0; y < h; y++) {
            const Y = by + y - r.dy; let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                const v = curve(a[o]); if (v <= 0) { a[o] = 0; continue; } if (v >= 1) { a[o] = 1; continue; }
                const X = bx + x - r.dx; let acc = 0;
                for (let k = 0; k < 8; k += 2) { const xx = X + off[k], yy = Y + off[k + 1]; let u = xx * ca + yy * sa, vv = -xx * sa + yy * ca; u -= Math.floor(u); vv -= Math.floor(vv); const t = (v - tab[(((vv * N) | 0) & 127) * N + (((u * N) | 0) & 127)]) / ws + 0.5; acc += t < 0 ? 0 : (t > 1 ? 1 : t); }
                a[o] = acc * 0.25;
            }
        }
        return false;
    }
    const gs = Math.max(1.2, q.px(T.grainSize || 180));
    if (kind === "threshold") {
        C.noiseField(tmp, w, h, bx, by, Math.max(1, gs * 0.5), seed + 5);
        for (let i = 0; i < n; i++) { const v = curve(a[i]); a[i] = C.clamp((v - 0.5 + (tmp[i] - 0.5) * 0.12) * 14 + 0.5, 0, 1); }
        return false;
    }
    if (kind === "crayon" || kind === "grain" || kind === "collotype") {
        C.fbm(tmp, w, h, bx, by, gs, seed + 7, kind === "crayon" ? 3 : 2);
        if (kind === "collotype") { for (let i = 0; i < n; i++) { const v = curve(a[i]), rr = 1 - Math.abs(2 * tmp[i] - 1); a[i] = C.clamp(v + v * (1 - v) * (rr - 0.62) * 2.2, 0, 1); } return true; }
        const sharp = kind === "crayon" ? 3.2 : 9;
        for (let i = 0; i < n; i++) { const v = curve(a[i]); if (v <= 0) { a[i] = 0; continue; } const thr = C.clamp((tmp[i] - 0.5) * 2.6 + 0.5, 0.02, 0.98); a[i] = C.clamp((v - thr) * sharp + 0.5, 0, 1); }
        return false;
    }
    if (kind === "stipple" || kind === "spatter") {
        // dots that grow with tone: jittered lattice (stipple) or scattered with mixed sizes (spatter)
        const cell = gs * (kind === "stipple" ? 1.5 : 1.9), jit = kind === "stipple" ? 0.55 : 1, sd = seed + 77;
        for (let y = 0; y < h; y++) {
            const Y = by + y, cyi = Math.floor(Y / cell); let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                const v = curve(a[o]); if (v <= 0) { a[o] = 0; continue; } if (v >= 0.985) { a[o] = 1; continue; }
                const X = bx + x, cxi = Math.floor(X / cell); let best = 0;
                for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
                    const gx = cxi + i, gy = cyi + j, hx = C.hash2(gx, gy, sd), hy = C.hash2(gx, gy, sd + 1), hr = C.hash2(gx, gy, sd + 2);
                    const px0 = (gx + 0.5 + (hx - 0.5) * jit) * cell, py0 = (gy + 0.5 + (hy - 0.5) * jit) * cell;
                    const size = kind === "stipple" ? (0.85 + 0.3 * hr) : (0.35 + 1.5 * hr * hr);
                    const rad = cell * 0.62 * Math.sqrt(v) * size, d = Math.sqrt((X - px0) * (X - px0) + (Y - py0) * (Y - py0)), c = C.clamp(rad - d + 0.5, 0, 1);
                    if (c > best) best = c;
                }
                a[o] = best;
            }
        }
        return false;
    }
    for (let i = 0; i < n; i++) a[i] = curve(a[i]);
    return true;
}


// What tone does a given plate value actually print as? Run a step wedge through the same carrier, film and ink, and
// invert the result: this is the platemaker's (or retoucher's) allowance for dot gain. `tone.comp` says how good they were.
function toneComp(job, q, pi) {
    const s = job.settings, T = s.tone, p = job.plates[pi], amount = C.clamp(T.comp === undefined ? 0.7 : T.comp, 0, 1);
    if (amount <= 0 || !q.on("tone") && false) return null;
    const kind = q.on("tone") ? T.carrier : "contone"; if (kind === "threshold") return null;
    const NS = 17, pw = 96, w = NS * pw, h = pw, n = w * h, bx = 40000, by = 30000;
    const a = new Float32Array(n);
    for (let k = 0; k < NS; k++) for (let y = 0; y < h; y++) a.fill(k / (NS - 1), y * w + k * pw, y * w + (k + 1) * pw);
    const B = { e: new Float32Array(n), t1: new Float32Array(n), t2: new Float32Array(n), rim: new Float32Array(n), tooth: new Float32Array(n), inkmap: new Float32Array(n), m: new Float32Array(n), th: new Float32Array(n) };
    C.fbm(B.tooth, w, h, bx, by, q.saltP, q.seed + 555, 2);
    const keepTex = job.inkTexture, keepH = q.P.hickeys; job.inkTexture = null; q.P.hickeys = 0;
    const saved = q.comp; q.comp = null;
    const notes = {}, contone = carrier(job, q, p, pi, a, bx, by, w, h, B.t1, notes);
    film(job, q, p, pi, a, contone, bx, by, w, h, B);
    q.comp = saved; job.inkTexture = keepTex; q.P.hickeys = keepH;
    const colOp = s.colour.opacity, o = C.clamp(colOp >= 0 ? colOp : p.ink.o, 0, 0.999), lin = C.rgbLin(p.ink.rgb).map(v => Math.max(v, 0.0015)), og = 1 - o, th = B.th;
    let hb = null; if (q.spreadS > 0.3 && og > 0.05) { hb = B.e; for (let i = 0; i < n; i++) hb[i] = a[i] * th[i]; C.gauss(hb, hb, w, h, q.spreadS, B.t1); }
    const D = new Float32Array(NS), wl = [0.2126, 0.7152, 0.0722];
    for (let k = 0; k < NS; k++) {
        let acc = 0, cnt = 0;
        for (let y = 16; y < h - 16; y++) for (let x = k * pw + 16; x < (k + 1) * pw - 16; x++) {
            const i = y * w + x, cv = a[i], tv = th[i], sv = hb ? 0.5 * og * hb[i] : 0, oe = 1 - Math.pow(1 - o, tv); let Y = 0;
            for (let ch = 0; ch < 3; ch++) { const un = Math.pow(lin[ch], sv), co = (1 - oe) * Math.pow(lin[ch], tv * (hb ? 1 - 0.5 * og : 1) + sv) + oe * lin[ch]; Y += wl[ch] * ((1 - cv) * un + cv * co); }
            acc += Y; cnt++;
        }
        D[k] = 1 - acc / cnt;
    }
    const top = Math.max(D[NS - 1], 1e-3); let run = 0;
    for (let k = 0; k < NS; k++) { D[k] = (D[k] - D[0] * (1 - k / (NS - 1))) / top; if (D[k] < run) D[k] = run; run = D[k]; }
    const lut = new Float32Array(257);
    for (let i = 0; i <= 256; i++) {
        const t = i / 256; let k = 0; while (k < NS - 2 && D[k + 1] < t) k++;
        const d0 = D[k], d1 = D[k + 1], f = d1 > d0 + 1e-6 ? C.clamp((t - d0) / (d1 - d0), 0, 1) : 0, inv = (k + f) / (NS - 1);
        lut[i] = t + amount * (inv - t);
    }
    lut[0] = 0;
    return lut;
}

// ------------------------------------------------------------------ the mark and the ink film for one plate
// c: plate coverage in the band (in place -> film thickness h, 1 = normal film). B is the scratch bundle.
function film(job, q, p, pi, c, contone, bx, by, w, h, B) {
    // c comes in as what the plate carries. It leaves as COVERAGE (what fraction of each pixel has ink on it), and B.th
    // holds the THICKNESS of the film there (1 = normal). A part-covered pixel is not a thin film: the two are kept apart.
    const P = q.P, n = w * h, seed = q.seed + 1013 * (pi + 1), E = B.e, tmp = B.t1, t2 = B.t2, rimB = B.rim, th = B.th;
    const lineLike = !contone;
    if (contone) { // gravure cells, collotype, wiped gradations: the tone IS the film thickness
        if (q.soften > 0.3) C.gauss(c, c, w, h, q.soften * 0.6, tmp);
        for (let i = 0; i < n; i++) { const v = c[i]; th[i] = v * P.ink; c[i] = v <= 0 ? 0 : (v >= 0.04 ? 1 : v * 25); }
    }
    // 1. spread, rounded corners, ragged edge, mesh, nicks
    const gainP = p.kind === "tone" ? q.gain * 0.5 : q.gain, softP = p.kind === "tone" ? q.soften * 0.6 : q.soften;   // blocks and screens were printed with less squash than display type
    const sigE = Math.max(softP, Math.abs(gainP) / 1.4, 0);
    if (lineLike && (sigE > 0.25 || q.raggedPx > 0.05 || P.mesh > 0 || P.wear > 0)) {
        const sg = Math.max(sigE, 0.45);
        C.gauss(c, E, w, h, sg, tmp);
        let rag = null;
        if (q.raggedPx > 0.05 || P.wear > 0) { rag = tmp; C.fbm(rag, w, h, bx, by, q.raggedP, seed + 3, 2); }
        let nick = null;
        if (P.wear > 0) { nick = t2; C.noiseField(nick, w, h, bx, by, Math.max(2, q.px(420)), seed + 4); }
        const mp = q.px(P.meshPitch), useMesh = P.mesh > 0 && mp >= 2.2, mk = 2 * Math.PI / Math.max(1e-6, mp), ma = 0.12;
        const cm = Math.cos(ma) * mk, sm = Math.sin(ma) * mk;
        const slope = 0.3989 / sg; let wT = Math.max(0.05, q.edgeW * slope);
        if (p.kind === "tone" && p._period && p._period < 10) wT = Math.max(wT, 0.3 + 0.7 * (1 - p._period / 10));   // dots only a few pixels across keep their part-covered pixels
        for (let y = 0; y < h; y++) {
            const Y = by + y; let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                const e = E[o]; if (e <= 0.0005) { c[o] = 0; continue; } if (e >= 0.9995 && !nick) { c[o] = 1; continue; }
                let shift = gainP;
                if (rag) shift += (rag[o] - 0.5) * 3.2 * q.raggedPx;
                if (useMesh) { const X = bx + x; shift += P.mesh * Math.min(1, 0.25 + 1.5 * P.ragged) * 0.34 * mp * (Math.cos(X * cm + Y * sm) * Math.cos(-X * sm + Y * cm)); }
                if (nick) { const nk = (nick[o] - 0.8) / 0.08; if (nk > 0) shift -= P.wear * q.px(160) * (nk > 1 ? 1 : nk) * (rag ? 0.5 + rag[o] : 1); }
                const T = phi(-shift / sg), v = (e - T) / wT + 0.5;
                c[o] = v <= 0 ? 0 : (v >= 1 ? 1 : v);
            }
        }
    }
    // 2. slur: the plate skids, dragging a fainter copy of every edge
    if (q.slurPx > 0.4) {
        const ax = Math.cos(P.slurAngle * Math.PI / 180) * q.slurPx, ay = Math.sin(P.slurAngle * Math.PI / 180) * q.slurPx; E.set(c);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let best = 0; for (let k = 1; k <= 3; k++) { const xs = Math.round(x - ax * k / 3), ys = Math.round(y - ay * k / 3); if (xs >= 0 && ys >= 0 && xs < w && ys < h) { const v = E[ys * w + xs] * (0.62 - 0.14 * k); if (v > best) best = v; } } const o = y * w + x; if (best > c[o]) c[o] = best; }
    }
    // 3. film: squeezed rim, starved middle
    const needRim = P.rim > 0 || P.starve > 0 || q.saltEff > 0;
    if (needRim) C.gauss(c, rimB, w, h, q.rimS, tmp);
    const inkAmt = P.ink, rimK = P.rim * (0.6 + 0.4 * P.pressure) * (p.kind === "tone" ? 0.5 : 1), starve = P.starve;
    for (let i = 0; i < n; i++) {
        if (c[i] <= 0) { if (!contone) th[i] = 0; if (needRim) rimB[i] = 0; continue; }
        let t = contone ? th[i] : inkAmt;
        if (needRim) {
            const inner = rimB[i], band = 2 * (1 - inner), bd = band > 1 ? 1 : band; // 1 at an edge, 0 deep inside a solid; thin strokes stay near 1
            const mid = inner > 0.5 ? (inner - 0.5) * 2 : 0;
            if (!contone) t *= 1 - starve * mid * mid + rimK * bd;
            rimB[i] = bd;
        }
        th[i] = t;
    }
    // 4. the solid: sorts, wood grain, ink texture, mottle, salt, speckle, mesh marks, hollow, banding
    const lab = q.labels[pi], lf = q.lf, lw = q.lw, r = q.reg[pi];
    const tex = job.inkTexture, tk = tex ? (tex.strength === undefined ? 1 : tex.strength) / 255 : 0;
    if (lab && (P.sorts > 0 || tex)) {
        for (let y = 0; y < h; y++) {
            const ly = Math.min(q.lh - 1, Math.max(0, ((by + y - r.dy) / lf) | 0)); let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                if (c[o] <= 0) continue;
                const L = lab[ly * lw + Math.min(lw - 1, Math.max(0, ((bx + x - r.dx) / lf) | 0))];
                if (P.sorts > 0) { const v = C.hash2(L, pi, q.seed + 99); th[o] *= 1 + P.sorts * (v - 0.5) * 0.9; }
                if (tex) { const ox = (C.hash2(L, 7, q.seed) * tex.w) | 0, oy = (C.hash2(L, 8, q.seed) * tex.h) | 0, tx = (bx + x + ox) % tex.w, ty = (by + y + oy) % tex.h; { const m = 1 - tk * tex.data[ty * tex.w + tx]; c[o] *= m < 0 ? 0 : m; } }
            }
        }
    } else if (tex) {
        for (let y = 0; y < h; y++) { let o = y * w; const ty = (by + y) % tex.h; for (let x = 0; x < w; x++, o++) if (c[o] > 0) { const m = 1 - tk * tex.data[ty * tex.w + ((bx + x) % tex.w)]; c[o] *= m < 0 ? 0 : m; } }
    }
    if (P.grain > 0) {
        const gp = Math.max(1.5, q.px(300));
        C.noiseField(tmp, w, h, bx, by, gp, seed + 21, { ax: 16, angle: P.grainAngle });
        C.noiseField(t2, w, h, bx, by, Math.max(2, q.px(1100)), seed + 22, { ax: 45, angle: P.grainAngle });
        for (let i = 0; i < n; i++) { if (c[i] <= 0) continue; const g = C.smooth((tmp[i] - 0.56) / 0.22), ck = C.smooth((t2[i] - 0.84) / 0.05); th[i] *= 1 - P.grain * 0.7 * g; if (q.relief) c[i] *= 1 - P.grain * 0.85 * ck; }
    }
    // the pressure and ink supply vary slowly over the forme: this drives both mottle and how salty a patch is
    const needPatch = P.mottle > 0 || q.saltEff > 0.01, patch = B.m;
    if (needPatch) C.fbm(patch, w, h, bx, by, q.mottleP, seed + 31, 3);
    if (P.mottle > 0) { for (let i = 0; i < n; i++) if (c[i] > 0) th[i] *= 1 + P.mottle * (patch[i] - 0.5) * 1.6; }
    if (q.saltEff > 0.01) {
        // B.tooth holds the paper's surface (shared by all plates: the hollows are in the paper). Ink misses the hollows.
        const tooth = B.tooth, f0 = 0.2 * Math.pow(Math.min(1.5, q.saltEff * (p.kind === "tone" ? 0.35 : 1)), 1.6), dl = 0.03;
        const QN = 24, qs = new Float32Array(QN + 1); for (let k = 0; k <= QN; k++) qs[k] = noiseQuantile(Math.min(0.6, f0 * 3.2 * k / QN));
        for (let i = 0; i < n; i++) {
            const v = c[i]; if (v <= 0) continue;
            const pm = (1 - patch[i]) * 1.9 - 0.45, f = (pm < 0.08 ? 0.08 : (pm > 1 ? 1 : pm)) * (1 - 0.65 * rimB[i]) * QN, k0 = f | 0, thr = qs[k0] + (qs[k0 < QN ? k0 + 1 : k0] - qs[k0]) * (f - k0);
            const t = (tooth[i] - thr) / dl + 0.5; if (t > 0) c[i] = v * (1 - 0.94 * (t > 1 ? 1 : t));
        }
    }
    if (P.speckle > 0) {
        // the paper's own surface shows through the film (thin where the fibres stand up), plus pigment grain
        const tooth = B.tooth, kT = P.speckle * (0.5 + 1.6 * q.tooth);
        for (let y = 0; y < h; y++) { let o = y * w; const Y = by + y; for (let x = 0; x < w; x++, o++) if (c[o] > 0) { const m = 1 - kT * (tooth[o] - 0.5) * 2.2 + P.speckle * (C.hash2(bx + x, Y, seed + 42) - 0.5) * 0.6; th[o] *= m < 0.15 ? 0.15 : m; } }
    }
    if (P.mesh > 0) {
        // the weave of the screen leaves its pattern in the paint: thin along the threads, thinnest (sometimes open) where
        // two threads cross, and fullest in the middle of each opening. How strongly varies from patch to patch.
        const mp = q.px(P.meshPitch);
        if (mp >= 2.2) {
            const mk = 2 * Math.PI / mp, ca = Math.cos(0.12) * mk, sa = Math.sin(0.12) * mk, k = Math.min(0.9, P.mesh * 1.1), kc = Math.min(0.85, P.mesh * 0.8);
            C.fbm(tmp, w, h, bx, by, Math.max(4, q.px(1800)), seed + 47, 2); C.noiseField(t2, w, h, bx, by, Math.max(1.5, q.px(P.meshPitch * 1.7)), seed + 48);
            for (let y = 0; y < h; y++) { let o = y * w; const Y = by + y; for (let x = 0; x < w; x++, o++) if (c[o] > 0) {
                const X = bx + x, wv = (tmp[o] - 0.5) * 3, a = 0.5 + 0.5 * Math.cos(X * ca + Y * sa + wv), b = 0.5 + 0.5 * Math.cos(-X * sa + Y * ca - wv), a2 = a * a, b2 = b * b, local = 0.35 + 1.3 * tmp[o];
                th[o] *= 1 - k * local * (0.6 * (a2 > b2 ? a2 : b2) + 0.4 * (t2[o] - 0.3)) + 0.2 * k * (1 - a) * (1 - b);
                const open = (t2[o] - 0.62) * 5; if (open > 0) { const kn = a2 * b2 * kc * local * (open > 1 ? 1 : open); c[o] *= 1 - (kn > 0.9 ? 0.9 : kn); }
            } }
        }
    }
    if (P.hollow > 0) {
        gaussBig(c, tmp, w, h, Math.max(1, q.hollowS), t2); C.noiseField(t2, w, h, bx, by, Math.max(2, q.px(900)), seed + 51);
        for (let i = 0; i < n; i++) if (c[i] > 0) { const mid = C.smooth((tmp[i] - 0.5) / 0.4); th[i] *= 1 - P.hollow * mid * (0.7 + 0.3 * t2[i]); }
    }
    if (P.banding > 0) { const bp = q.mm(38); for (let y = 0; y < h; y++) { const fy = (by + y) / bp, j = Math.floor(fy), t = C.smooth(fy - j), v = C.lerp(C.hash2(j, 3, seed + 61), C.hash2(j + 1, 3, seed + 61), t), k = 1 + P.banding * (v - 0.5) * 0.9; let o = y * w; for (let x = 0; x < w; x++, o++) th[o] *= k; } }
    // 5. things that put ink where the plate has none: scum, specks, spatter
    const add = (i, c2, t2v) => { const c1 = c[i], cn = c1 + (1 - c1) * c2; if (cn > 1e-4) { th[i] = (c1 * th[i] + (1 - c1) * c2 * t2v) / cn; c[i] = cn; } };
    if (P.scum > 0) { C.fbm(tmp, w, h, bx, by, q.mm(9), seed + 71, 2); for (let i = 0; i < n; i++) if (c[i] < 0.999) add(i, 1, P.scum * (0.03 + 0.1 * tmp[i])); }
    if (P.specks > 0) { C.noiseField(tmp, w, h, bx, by, Math.max(1.3, q.px(110)), seed + 81); const thr = 1 - 0.035 * P.specks; for (let i = 0; i < n; i++) { const t = (tmp[i] - thr) / 0.012; if (t > 0 && c[i] < 0.999) add(i, t > 1 ? 1 : t, 0.9); } }
    if (P.spatter > 0) {
        gaussBig(c, tmp, w, h, Math.max(1, q.px(260)), t2); C.noiseField(t2, w, h, bx, by, Math.max(1.3, q.px(95)), seed + 91);
        for (let i = 0; i < n; i++) { const z = tmp[i]; if (z < 0.02 || c[i] > 0.6) continue; const t = (t2[i] - (0.95 - 0.5 * z * P.spatter)) / 0.03; if (t > 0) add(i, t > 1 ? 1 : t, 0.85); }
    }
    stamps(job, q, pi, c, th, bx, by, w, h);
    // 6. ink soaking sideways into absorbent paper
    if (q.bleedS > 0.3) { for (let i = 0; i < n; i++) th[i] *= c[i]; C.gauss(th, th, w, h, q.bleedS, tmp); C.gauss(c, c, w, h, q.bleedS, tmp); for (let i = 0; i < n; i++) th[i] = c[i] > 1e-4 ? th[i] / c[i] : 0; }
    for (let i = 0; i < n; i++) { const v = th[i]; th[i] = v < 0 ? 0 : (v > 2.5 ? 2.5 : v); if (c[i] > 1) c[i] = 1; }
}

// Hickeys: a speck of debris on the plate prints as a dark dot with a white ring.
function stamps(job, q, pi, c, th, bx, by, w, h) {
    const P = q.P; if (!(P.hickeys > 0)) return;
    const cell = q.mm(30), per = P.hickeys * 0.09, seed = q.seed + 5003 * (pi + 1);
    const x0 = Math.floor(bx / cell) - 1, x1 = Math.floor((bx + w) / cell) + 1, y0 = Math.floor(by / cell) - 1, y1 = Math.floor((by + h) / cell) + 1;
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
        const cnt = Math.floor(per) + (C.hash2(gx, gy, seed) < per - Math.floor(per) ? 1 : 0);
        for (let k = 0; k < cnt; k++) {
            const X = (gx + C.hash2(gx, gy, seed + 10 + k)) * cell, Y = (gy + C.hash2(gx, gy, seed + 20 + k)) * cell, r1 = q.px(70 + 130 * C.hash2(gx, gy, seed + 30 + k)), r2 = r1 * (2.2 + C.hash2(gx, gy, seed + 40 + k));
            const ax = Math.max(0, Math.floor(X - r2 - 1 - bx)), bxx = Math.min(w - 1, Math.ceil(X + r2 + 1 - bx)), ay = Math.max(0, Math.floor(Y - r2 - 1 - by)), byy = Math.min(h - 1, Math.ceil(Y + r2 + 1 - by));
            for (let y = ay; y <= byy; y++) for (let x = ax; x <= bxx; x++) { const d = Math.sqrt((bx + x - X) ** 2 + (by + y - Y) ** 2), o = y * w + x; if (d < r1) { const v = C.clamp(r1 - d + 0.5, 0, 1); if (v > c[o]) { c[o] = v; th[o] = 1.1; } } else if (d < r2) c[o] *= 1 - C.clamp(r2 - d + 0.5, 0, 1) * C.clamp(d - r1 + 0.5, 0, 1); }
        }
    }
}

// ------------------------------------------------------------------ paper and age for a band
function paperBand(job, q, bx, by, w, h, R, B) {
    const s = job.settings, n = w * h, st = q.stock, age = q.age, seed = q.seed + 900001, onPaper = q.on("paper");
    let base = st.rgb;
    if (s.paper.colour && /^#[0-9a-f]{6}$/i.test(s.paper.colour)) base = [parseInt(s.paper.colour.substr(1, 2), 16), parseInt(s.paper.colour.substr(3, 2), 16), parseInt(s.paper.colour.substr(5, 2), 16)];
    if (job.paperRgb) base = job.paperRgb;
    if (!onPaper || s.paper.source === "none") base = [255, 255, 255];
    const lin = C.rgbLin(base), PL = job.paperLayer && onPaper && s.paper.source === "layer" ? job.paperLayer : null;
    for (let c = 0; c < 3; c++) R[c].fill(lin[c]);
    if (PL) { const k = s.paper.layerStrength === undefined ? 1 : s.paper.layerStrength; for (let y = 0; y < h; y++) { const src = ((by + y) % PL.h) * PL.w; let o = y * w; for (let x = 0; x < w; x++, o++) { const i = (src + ((bx + x) % PL.w)) * 3; R[0][o] = 1 + (C.S2L[PL.data[i]] - 1) * k; R[1][o] = 1 + (C.S2L[PL.data[i + 1]] - 1) * k; R[2][o] = 1 + (C.S2L[PL.data[i + 2]] - 1) * k; } } }
    const tmp = B.t1, t2 = B.t2;
    if (onPaper && s.paper.source !== "none" && !PL) {
        const tx = s.paper.texture * 2, fb = s.paper.fibres * 2 * st.fibres, fl = s.paper.flecks * 2 * st.flecks;
        if (tx > 0 && st.formation > 0) { C.fbm(tmp, w, h, bx, by, q.mm(2.6), seed + 1, 3); const k = 0.16 * st.formation * tx; for (let i = 0; i < n; i++) { const m = 1 + (tmp[i] - 0.5) * k; R[0][i] *= m; R[1][i] *= m; R[2][i] *= m * (1 - (tmp[i] - 0.5) * k * 0.25); } }
        if (tx > 0 && st.formation > 0) { C.fbm(tmp, w, h, bx, by, Math.max(2, q.px(420)), seed + 2, 2); const k = 0.1 * st.formation * tx; for (let i = 0; i < n; i++) { const d = (tmp[i] - 0.5) * k; R[0][i] *= 1 + d * 0.8; R[1][i] *= 1 + d; R[2][i] *= 1 + d * 1.5; } }
        if (tx > 0 && q.tooth > 0) { const k = 0.16 * q.tooth * tx, tooth = B.tooth; for (let i = 0; i < n; i++) { const d = (tooth[i] - 0.5) * k; R[0][i] *= 1 + d * 0.85; R[1][i] *= 1 + d; R[2][i] *= 1 + d * 1.3; } }
        if (fb > 0.02) {
            const fp = Math.max(1.5, q.px(140));
            for (let a = 0; a < 3; a++) { C.noiseField(tmp, w, h, bx, by, fp, seed + 10 + a, { ax: 9, angle: 17 + a * 61 }); for (let i = 0; i < n; i++) { const t = (tmp[i] - 0.74) / 0.1; if (t > 0) { const m = 1 - 0.07 * fb * (t > 1 ? 1 : t) * (a === 1 ? -0.6 : 1); R[0][i] *= m; R[1][i] *= m; R[2][i] *= m; } } }
        }
        if (fl > 0.02) { C.noiseField(tmp, w, h, bx, by, Math.max(1.3, q.px(170)), seed + 20, { ax: 2.2, angle: 35 }); const thr = 1 - 0.03 * Math.min(2, fl); for (let i = 0; i < n; i++) { const t = (tmp[i] - thr) / 0.02; if (t > 0) { const m = 1 - 0.45 * (t > 1 ? 1 : t); R[0][i] *= m; R[1][i] *= m * 0.97; R[2][i] *= m * 0.9; } } }
    }
    // what is printed where (all plates), for halos, show-through, set-off and the dent of the impression
    const I = B.inkmap, P = q.P, W = job.W, H = job.H;
    const needI = P.halo > 0 || P.impression > 0 || age.oil > 0, needMir = (s.paper.showThrough > 0 && onPaper) || age.setoff > 0;
    if (needI || needMir) {
        if (needI) { I.fill(0); for (const p of job.plates) for (let y = 0; y < h; y++) { const src = (by + y) * W + bx; let o = y * w; for (let x = 0; x < w; x++, o++) { const v = p.tau[src + x] / 255; if (v > I[o]) I[o] = v; } } }
        if (P.halo > 0 || age.oil > 0) {
            // oil from the ink creeps into the paper round the print and yellows it
            gaussBig(I, tmp, w, h, Math.max(0.6, q.haloS * (1 + age.oil)), t2);
            const k = P.halo * 0.16 * (0.5 + st.absorb) + age.oil * 0.3;
            for (let i = 0; i < n; i++) { const z = tmp[i] * (1 - I[i] * 0.5); if (z > 0.003) { R[0][i] *= 1 - k * z * 0.35; R[1][i] *= 1 - k * z * 0.6; R[2][i] *= 1 - k * z; } }
        }
        if (P.impression > 0) {
            C.gauss(I, tmp, w, h, Math.max(0.7, q.px(90)), t2); const k = P.impression * 0.5;
            for (let y = 1; y < h - 1; y++) { let o = y * w + 1; for (let x = 1; x < w - 1; x++, o++) { const g = (tmp[o + w + 1] - tmp[o - w - 1]) * k, m = 1 + (g > 0.2 ? 0.2 : (g < -0.2 ? -0.2 : g)); R[0][o] *= m; R[1][o] *= m; R[2][o] *= m; } }
        }
        if (needMir) {
            I.fill(0); for (const p of job.plates) for (let y = 0; y < h; y++) { const row = (by + y) * W; let o = y * w; for (let x = 0; x < w; x++, o++) { const xm = W - 1 - (bx + x); const v = p.tau[row + xm] / 255; if (v > I[o]) I[o] = v; } }
            C.gauss(I, tmp, w, h, Math.max(0.8, q.px(130)), t2);
            const k = (onPaper ? s.paper.showThrough * (0.4 + st.show) * 0.16 : 0) + age.setoff * 0.1;
            for (let i = 0; i < n; i++) { const m = 1 - k * tmp[i]; R[0][i] *= m; R[1][i] *= m; R[2][i] *= m; }
        }
    }
    // age of the sheet
    if (age.yellow > 0 || age.edges > 0) {
        C.fbm(tmp, w, h, bx, by, q.mm(45), seed + 30, 2);
        const ky = age.yellow * (0.35 + 0.65 * st.lignin), em = q.mm(14) / 1;
        for (let y = 0; y < h; y++) {
            const Y = by + y, dyE = Math.min(Y, H - 1 - Y); let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                const X = bx + x, de = Math.min(dyE, X, W - 1 - X), e = age.edges > 0 ? Math.exp(-de / em) * (0.55 + 0.9 * tmp[o]) * age.edges : 0;
                const yv = ky * (0.8 + 0.4 * tmp[o]);
                R[0][o] *= (1 - 0.10 * yv) * (1 - 0.26 * e); R[1][o] *= (1 - 0.24 * yv) * (1 - 0.42 * e); R[2][o] *= (1 - 0.55 * yv) * (1 - 0.66 * e);
            }
        }
    }
    if (age.dirt > 0) { C.fbm(tmp, w, h, bx, by, q.mm(22), seed + 40, 3); C.noiseField(t2, w, h, bx, by, Math.max(1.3, q.px(200)), seed + 41); for (let i = 0; i < n; i++) { let m = 1 - age.dirt * 0.22 * C.smooth((tmp[i] - 0.45) / 0.35); const t = (t2[i] - (1 - 0.02 * age.dirt)) / 0.015; if (t > 0) m *= 1 - 0.5 * (t > 1 ? 1 : t); R[0][i] *= m; R[1][i] *= m * 0.985; R[2][i] *= m * 0.96; } }
    if (age.foxing > 0) {
        const cell = q.mm(16), per = age.foxing * 1.3, x0 = Math.floor(bx / cell) - 1, x1 = Math.floor((bx + w) / cell) + 1, y0 = Math.floor(by / cell) - 1, y1 = Math.floor((by + h) / cell) + 1;
        for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
            const cnt = Math.floor(per) + (C.hash2(gx, gy, seed + 50) < per - Math.floor(per) ? 1 : 0);
            for (let k = 0; k < cnt; k++) {
                const X = (gx + C.hash2(gx, gy, seed + 51 + k)) * cell, Y = (gy + C.hash2(gx, gy, seed + 61 + k)) * cell, hr = C.hash2(gx, gy, seed + 71 + k), rad = q.mm(0.25 + 2.2 * hr * hr * hr), str = 0.25 + 0.5 * C.hash2(gx, gy, seed + 81 + k);
                const ax = Math.max(0, Math.floor(X - rad * 2 - bx)), bxx = Math.min(w - 1, Math.ceil(X + rad * 2 - bx)), ay = Math.max(0, Math.floor(Y - rad * 2 - by)), byy = Math.min(h - 1, Math.ceil(Y + rad * 2 - by));
                for (let y = ay; y <= byy; y++) for (let x = ax; x <= bxx; x++) { const d = Math.sqrt((bx + x - X) ** 2 + (by + y - Y) ** 2) / rad, f = Math.exp(-d * d * 1.3) * str, o = y * w + x; R[0][o] *= 1 - 0.22 * f; R[1][o] *= 1 - 0.42 * f; R[2][o] *= 1 - 0.62 * f; }
            }
        }
    }
}

// Where folding and handling have taken ink off (1 = all there), and the light crease line itself.
function wearBand(job, q, bx, by, w, h, keep, crease, B) {
    const age = q.age, n = w * h, W = job.W, H = job.H, seed = q.seed + 700001;
    keep.fill(1); crease.fill(0);
    const folds = Math.round(age.folds || 0); if (!folds && !(age.wear > 0)) return false;
    const tmp = B.t1;
    if (age.wear > 0) { C.fbm(tmp, w, h, bx, by, q.mm(30), seed + 1, 3); C.noiseField(B.t2, w, h, bx, by, Math.max(1.5, q.px(260)), seed + 2, { ax: 7, angle: 28 }); for (let i = 0; i < n; i++) { const rub = C.smooth((tmp[i] - (0.78 - 0.2 * age.wear)) / 0.12), sc = C.smooth((B.t2[i] - 0.83) / 0.05); keep[i] *= 1 - age.wear * 0.55 * rub * (0.4 + 0.6 * sc) - age.wear * 0.18 * sc * (tmp[i] > 0.5 ? 1 : 0); } }
    if (folds) {
        const hs = folds >= 3 ? [0.25, 0.5, 0.75] : [0.5], vs = folds >= 2 ? [0.5] : [];
        const wd = q.mm(0.5), k = 0.45 + 0.55 * (age.wear || 0);
        C.noiseField(tmp, w, h, bx, by, Math.max(1.5, q.px(350)), seed + 5);
        for (let y = 0; y < h; y++) { const Y = by + y; let o = y * w; for (let x = 0; x < w; x++, o++) { const X = bx + x; let d = 1e9; for (const f of hs) d = Math.min(d, Math.abs(Y - f * H)); for (const f of vs) d = Math.min(d, Math.abs(X - f * W)); if (d < wd * 4) { const g = Math.exp(-(d / wd) * (d / wd)); crease[o] = g; keep[o] *= 1 - k * g * C.smooth((tmp[o] - 0.35) / 0.3); } } }
    }
    return true;
}

// ------------------------------------------------------------------ render
// job: { W, H, ppi, plates: [{ name, tau, foot, layer, kind, ink:{rgb,o,fade,to}, angle, key, tints }], settings, enabled,
//        region: {left, top, right, bottom} or null, bits: 8|16, paperRgb, paperLayer: {data (rgb), w, h}, inkTexture: {data (grey), w, h, strength} }
// returns { data (RGBA at the document's bit depth), left, top, width, height, info: {...} }
function* renderSteps(job) {
    const s = job.settings, W = job.W, H = job.H, q = job._prep || (job._prep = prepare(job));
    const reg = job.region || { left: 0, top: 0, right: W, bottom: H };
    const rl = Math.max(0, reg.left | 0), rt = Math.max(0, reg.top | 0), rr = Math.min(W, reg.right | 0), rb = Math.min(H, reg.bottom | 0), ow = rr - rl, oh = rb - rt;
    if (ow <= 0 || oh <= 0) throw new Error("Nothing to render in that area.");
    const bits = job.bits === 16 ? 16 : 8, MAXV = bits === 16 ? 32768 : 255;
    const out = bits === 16 ? new Uint16Array(ow * oh * 4) : new Uint8Array(ow * oh * 4);
    const M = q.margin, x0 = Math.max(0, rl - M), x1 = Math.min(W, rr + M), w = x1 - x0;
    const bandH = Math.max(96, Math.min(oh, Math.floor(2.4e6 / w) - 2 * M));
    const only = job.only;   // undefined: the printed sheet. -1: the paper alone. n: plate n alone, on white (for a Multiply layer)
    const notes = {}, colOp = s.colour.opacity;
    // per-plate ink in linear light, aged
    const inks = job.plates.map((p) => {
        let rgb = p.ink.rgb.slice(), o = colOp >= 0 ? colOp : p.ink.o, thin = 1;
        const f = q.age.fade * (p.ink.fade || 0);
        if (f > 0) { if (Array.isArray(p.ink.to)) rgb = C.mixRgb(rgb, p.ink.to, Math.min(1, f)); else thin = 1 - 0.85 * Math.min(1, f); }
        return { lin: C.rgbLin(rgb.map(v => Math.round(C.clamp(v, 0, 255)))).map(v => Math.max(v, 0.0015)), o: C.clamp(o, 0, 1), thin };
    });
    const LN = 1024, HMAX = 2.6;
    const luts = inks.map((k) => { const t = [new Float32Array(LN + 1), new Float32Array(LN + 1), new Float32Array(LN + 1)], oe = new Float32Array(LN + 1); for (let i = 0; i <= LN; i++) { const hh = i / LN * HMAX; for (let c = 0; c < 3; c++) t[c][i] = Math.pow(k.lin[c], hh); oe[i] = 1 - Math.pow(1 - Math.min(0.999, k.o), hh); } return { t, oe }; });

    if (!q.compDone) { q.comp = null; q.comp = job.plates.map((p, pi) => (p.kind === "tone" && p.role !== "flat" && !p.tints) ? toneComp(job, q, pi) : null); q.compDone = true; }
    let B = null, R = null, c = null, below = null, keep = null, crease = null, cap = 0;   // scratch, allocated once at the size of the largest band
    let done = 0;
    for (let y0 = rt; y0 < rb; y0 += bandH) {
        const y1 = Math.min(rb, y0 + bandH), by = Math.max(0, y0 - M), be = Math.min(H, y1 + M), h = be - by, n = w * h;
        if (n > cap) { cap = n; const f = () => new Float32Array(n); B = { e: f(), t1: f(), t2: f(), rim: f(), tooth: f(), inkmap: f(), m: f(), th: f() }; R = [f(), f(), f()]; c = f(); below = f(); keep = f(); crease = f(); }
        else below.fill(0);
        C.fbm(B.tooth, w, h, x0, by, q.saltP, q.seed + 555, 2);
        if (only === undefined || only < 0) paperBand(job, q, x0, by, w, h, R, B); else { R[0].fill(1); R[1].fill(1); R[2].fill(1); }
        const worn = wearBand(job, q, x0, by, w, h, keep, crease, B);
        const wet = s.colour.wet === undefined ? 1 : s.colour.wet;
        let laid = 0;
        for (const pi of q.order) {
            const p = job.plates[pi];
            if (only !== undefined && pi !== only) continue;
            if (!samplePlate(job, q, pi, x0, by, w, h, c, B.inkmap) && !(q.P.scum > 0 || q.P.specks > 0 || q.P.hickeys > 0)) continue;
            const trapPx = q.px(s.colour.trap || 0);
            if (q.ko[pi].length) {
                // colours underneath are cut away where a layer above covers them, less a small overlap (the trap)
                const K = B.inkmap; if (trapPx > 0.35) grow(K, K, w, h, trapPx, B.t1);
                for (let i = 0; i < n; i++) c[i] *= K[i];
            }
            if (p.role === "spot" && trapPx > 0.35) {
                // drawn colours: the lighter printing runs a little way under its darker neighbours, so no white shows between them
                const lumP = C.lum(C.rgbLin(p.ink.rgb)), U = B.t2; let have = false;
                job.plates.forEach((o2, oi) => { if (oi !== pi && o2.role === "spot" && o2.layer === p.layer && C.lum(C.rgbLin(o2.ink.rgb)) < lumP) { sampleOther(job, q, pi, o2.tau, x0, by, w, h, U, have); have = true; } });
                if (have) { const G = B.e; grow(c, G, w, h, trapPx * 2, B.t1); for (let i = 0; i < n; i++) { const v = G[i] * (U[i] > 1 ? 1 : U[i]); if (v > c[i]) c[i] = v; } }
            }
            let contone = false;
            if (p.kind === "tone") contone = carrier(job, q, p, pi, c, x0, by, w, h, B.t1, notes);
            else if (s.tone.carrier === "gravure" && q.on("tone")) contone = carrier(job, q, Object.assign({}, p, { angle: 45 }), pi, c, x0, by, w, h, B.t1, notes);
            film(job, q, p, pi, c, contone, x0, by, w, h, B);
            const k = inks[pi], L = luts[pi], tr = L.t[0], tg = L.t[1], tb = L.t[2], oeT = L.oe, cr = k.lin[0], cg = k.lin[1], cb = k.lin[2], sc = LN / HMAX;
            // light spreading in the paper: a ray that comes out through a gap may have gone in through a dot, so the paper
            // between dots is tinted (optical dot gain). sv is half the locally averaged film.
            const th = B.th, og = (1 - k.o), spread = q.spreadS > 0.3 && og > 0.05; let hb = null;
            if (spread) { hb = B.e; for (let i = 0; i < n; i++) hb[i] = c[i] * th[i]; C.gauss(hb, hb, w, h, q.spreadS, B.t1); }
            const kOwn = spread ? 1 - 0.5 * og : 1, kS = 0.5 * og * k.thin;
            const lut = (T, v) => { const j = v * sc; if (j >= LN) return T[LN]; const j0 = j | 0; return T[j0] + (T[j0 + 1] - T[j0]) * (j - j0); };
            for (let i = 0; i < n; i++) {
                let cv = c[i]; if (worn) cv *= keep[i];
                const sv = hb ? hb[i] * kS : 0;
                if (cv <= 0.002 && sv <= 0.002) continue;
                let tv = th[i] * k.thin;
                if (wet < 1 && laid) { const u = below[i]; if (u > 0) tv *= 1 - (1 - wet) * (u > 1 ? 1 : u); }
                const r0 = R[0][i], r1 = R[1][i], r2 = R[2][i];
                let u0 = r0, u1 = r1, u2 = r2;                      // the uncovered part of the pixel
                if (sv > 0.002) { u0 *= lut(tr, sv); u1 *= lut(tg, sv); u2 *= lut(tb, sv); }
                if (cv <= 0.002) { R[0][i] = u0; R[1][i] = u1; R[2][i] = u2; continue; }
                const he = tv * kOwn + sv, oe = lut(oeT, tv);
                const c0 = (1 - oe) * r0 * lut(tr, he) + oe * cr, c1 = (1 - oe) * r1 * lut(tg, he) + oe * cg, c2 = (1 - oe) * r2 * lut(tb, he) + oe * cb;
                R[0][i] = u0 + (c0 - u0) * cv; R[1][i] = u1 + (c1 - u1) * cv; R[2][i] = u2 + (c2 - u2) * cv;
                if (wet < 1) below[i] += cv * tv;
            }
            laid++;
        }
        if (worn) { const k = 0.1; for (let i = 0; i < n; i++) if (crease[i] > 0.01) { const m = 1 + k * crease[i] * (keep[i] < 0.8 ? 1 : 0.4); R[0][i] *= m; R[1][i] *= m; R[2][i] *= m; } }
        // pack the central rows of the band
        for (let y = y0; y < y1; y++) {
            const src = (y - by) * w + (rl - x0); let o = ((y - rt) * ow) * 4;
            for (let x = 0; x < ow; x++, o += 4) {
                const i = src + x; let r = R[0][i], g = R[1][i], b = R[2][i]; r = r < 0 ? 0 : (r > 1 ? 1 : r); g = g < 0 ? 0 : (g > 1 ? 1 : g); b = b < 0 ? 0 : (b > 1 ? 1 : b);
                if (bits === 8) { out[o] = C.L2S[(r * 4096 + 0.5) | 0]; out[o + 1] = C.L2S[(g * 4096 + 0.5) | 0]; out[o + 2] = C.L2S[(b * 4096 + 0.5) | 0]; out[o + 3] = 255; }
                else { out[o] = Math.round(C.toSrgb(r) * MAXV); out[o + 1] = Math.round(C.toSrgb(g) * MAXV); out[o + 2] = Math.round(C.toSrgb(b) * MAXV); out[o + 3] = MAXV; }
            }
        }
        done += y1 - y0; yield done / oh;
    }
    const info = { um: q.um, plates: job.plates.length, margin: M, notes: Object.keys(notes).map(k => notes[k]), order: q.order.map(i => job.plates[i].name), register: q.reg.map(r => ({ dx: r.dx * q.um / 1000, dy: r.dy * q.um / 1000 })) };
    return { data: out, left: rl, top: rt, width: ow, height: oh, info };
}

function render(job, progress) { const g = renderSteps(job); for (;;) { const r = g.next(); if (r.done) return r.value; if (progress) progress(r.value); } }

module.exports = { render, renderSteps, prepare, spotTable, noiseQuantile, phi, phiInv };
