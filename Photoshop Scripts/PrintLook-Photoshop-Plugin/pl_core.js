// PrintLook - core numerics: hashing, noise, blurs, colour, labelling, clustering.
// Everything is deterministic in *document* coordinates so that bands and previews join without seams.

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

// integer hash -> [0,1)
function hash2(x, y, seed) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
}
function rng(seed) { let s = (seed | 0) || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }; }

// Value noise on a lattice of the given period (pixels, may be fractional), written for the rectangle
// whose top-left is at document position (gx0, gy0). Result in [0,1], roughly bell-shaped around 0.5.
// ax, ay stretch the lattice (ax = 8 gives features 8x longer in x); angle rotates it (degrees).
function noiseField(out, w, h, gx0, gy0, period, seed, opts) {
    opts = opts || {};
    const add = !!opts.add, gain = opts.gain === undefined ? 1 : opts.gain;
    const ax = opts.ax || 1, ay = opts.ay || 1, ang = (opts.angle || 0) * Math.PI / 180;
    if (period < 1.01 && ax === 1 && ay === 1) { // per-pixel white noise
        for (let y = 0; y < h; y++) { const gy = gy0 + y; let o = y * w; for (let x = 0; x < w; x++, o++) { const v = hash2(gx0 + x, gy, seed) * gain; out[o] = add ? out[o] + v : v; } }
        return out;
    }
    const px = period * ax, py = period * ay;
    if (ang === 0) {
        const ix0 = Math.floor(gx0 / px) - 1, nx = Math.ceil(w / px) + 4;
        let rowA = new Float32Array(nx), rowB = new Float32Array(nx), jA = null;
        const fill = (row, j) => { for (let i = 0; i < nx; i++) row[i] = hash2(ix0 + i, j, seed); };
        for (let y = 0; y < h; y++) {
            const fy = (gy0 + y) / py, j = Math.floor(fy), ty = smooth(fy - j);
            if (jA !== j) { if (jA === j - 1) { const t = rowA; rowA = rowB; rowB = t; fill(rowB, j + 1); } else { fill(rowA, j); fill(rowB, j + 1); } jA = j; }
            let o = y * w;
            for (let x = 0; x < w; x++, o++) {
                const fx = (gx0 + x) / px, i = Math.floor(fx), tx = smooth(fx - i), k = i - ix0;
                const a = rowA[k] + (rowA[k + 1] - rowA[k]) * tx, b = rowB[k] + (rowB[k + 1] - rowB[k]) * tx;
                const v = (a + (b - a) * ty) * gain; out[o] = add ? out[o] + v : v;
            }
        }
        return out;
    }
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = 0; y < h; y++) {
        let o = y * w; const gy = gy0 + y;
        for (let x = 0; x < w; x++, o++) {
            const gx = gx0 + x, u = (gx * ca + gy * sa) / px, v2 = (-gx * sa + gy * ca) / py;
            const i = Math.floor(u), j = Math.floor(v2), tx = smooth(u - i), ty = smooth(v2 - j);
            const a = lerp(hash2(i, j, seed), hash2(i + 1, j, seed), tx), b = lerp(hash2(i, j + 1, seed), hash2(i + 1, j + 1, seed), tx);
            const v = lerp(a, b, ty) * gain; out[o] = add ? out[o] + v : v;
        }
    }
    return out;
}
// Fractal noise: octaves halve the period. Normalised back to about [0,1].
function fbm(out, w, h, gx0, gy0, period, seed, octaves, opts) {
    opts = Object.assign({}, opts || {}); let amp = 1, tot = 0;
    out.fill(0);
    for (let o = 0; o < octaves; o++) {
        const p = period / (1 << o); if (p < 1 && o > 0) break;
        noiseField(out, w, h, gx0, gy0, Math.max(1, p), seed + o * 7919, Object.assign({}, opts, { add: true, gain: amp }));
        tot += amp; amp *= 0.5;
    }
    const k = 1 / tot; for (let i = 0; i < w * h; i++) out[i] *= k;
    return out;
}

// Separable Gaussian by three box passes. src and dst may be the same array; tmp is scratch of the same size.
function boxesForGauss(sigma) {
    const n = 3, wi = Math.sqrt(12 * sigma * sigma / n + 1); let wl = Math.floor(wi); if (wl % 2 === 0) wl--;
    const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    return [0, 1, 2].map(i => ((i < m ? wl : wu) - 1) / 2);
}
function boxH(src, dst, w, h, r) {
    if (r <= 0) { if (dst !== src) dst.set(src); return; }
    const iarr = 1 / (r + r + 1);
    for (let y = 0; y < h; y++) {
        const row = y * w; let ti = row, li = row, ri = row + r;
        const fv = src[row], lv = src[row + w - 1];
        let val = (r + 1) * fv; for (let j = 0; j < r; j++) val += src[row + Math.min(j, w - 1)];
        for (let j = 0; j <= r; j++) { val += (ri < row + w ? src[ri] : lv) - fv; ri++; dst[ti++] = val * iarr; if (ti >= row + w) break; }
        for (let j = r + 1; j < w - r; j++) { val += src[ri++] - src[li++]; dst[ti++] = val * iarr; }
        for (let j = Math.max(w - r, r + 1); j < w; j++) { val += lv - src[li++]; dst[ti++] = val * iarr; }
    }
}
function boxV(src, dst, w, h, r) {
    if (r <= 0) { if (dst !== src) dst.set(src); return; }
    const iarr = 1 / (r + r + 1);
    for (let x = 0; x < w; x++) {
        let ti = x, li = x, ri = x + r * w;
        const fv = src[x], lv = src[x + w * (h - 1)], end = x + w * h;
        let val = (r + 1) * fv; for (let j = 0; j < r; j++) val += src[x + Math.min(j, h - 1) * w];
        let n = 0;
        for (let j = 0; j <= r && n < h; j++, n++) { val += (ri < end ? src[ri] : lv) - fv; ri += w; dst[ti] = val * iarr; ti += w; }
        for (let j = r + 1; j < h - r; j++, n++) { val += src[ri] - src[li]; ri += w; li += w; dst[ti] = val * iarr; ti += w; }
        for (; n < h; n++) { val += lv - src[li]; li += w; dst[ti] = val * iarr; ti += w; }
    }
}
function gauss(src, dst, w, h, sigma, tmp) {
    if (!(sigma > 0.2)) { if (dst !== src) dst.set(src); return dst; }
    if (sigma < 0.7) { // small kernels: direct 3-tap, exact enough and cheap
        const a = Math.exp(-1 / (2 * sigma * sigma)), k0 = 1 / (1 + 2 * a), k1 = a * k0;
        for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x < w; x++) { const l = x > 0 ? src[r + x - 1] : src[r + x], rr = x < w - 1 ? src[r + x + 1] : src[r + x]; tmp[r + x] = src[r + x] * k0 + (l + rr) * k1; } }
        for (let y = 0; y < h; y++) { const r = y * w, ru = y > 0 ? r - w : r, rd = y < h - 1 ? r + w : r; for (let x = 0; x < w; x++) dst[r + x] = tmp[r + x] * k0 + (tmp[ru + x] + tmp[rd + x]) * k1; }
        return dst;
    }
    const bx = boxesForGauss(sigma);
    boxH(src, tmp, w, h, bx[0]); boxV(tmp, dst, w, h, bx[0]);
    boxH(dst, tmp, w, h, bx[1]); boxV(tmp, dst, w, h, bx[1]);
    boxH(dst, tmp, w, h, bx[2]); boxV(tmp, dst, w, h, bx[2]);
    return dst;
}

// colour
const S2L = new Float32Array(256), L2S = new Uint8Array(4097);
for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
for (let i = 0; i <= 4096; i++) { const l = i / 4096; L2S[i] = Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)); }
function toLin(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function toSrgb(l) { l = l < 0 ? 0 : (l > 1 ? 1 : l); return l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055; }
function rgbLin(rgb255) { return [S2L[rgb255[0] | 0], S2L[rgb255[1] | 0], S2L[rgb255[2] | 0]]; }
function lum(lin) { return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]; }
function mixRgb(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
// CIELAB (D50, 2 degree) to sRGB 0..255, via Bradford adaptation to D65. Used for the few measured ink values there are.
function labToSrgb(L, a, b) {
    const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, e = 216 / 24389, k = 24389 / 27;
    const xr = fx * fx * fx > e ? fx * fx * fx : (116 * fx - 16) / k, yr = L > k * e ? fy * fy * fy : L / k, zr = fz * fz * fz > e ? fz * fz * fz : (116 * fz - 16) / k;
    const X = xr * 0.96422, Y = yr, Z = zr * 0.82521;
    const Xd = 0.9555766 * X - 0.0230393 * Y + 0.0631636 * Z, Yd = -0.0282895 * X + 1.0099416 * Y + 0.0210077 * Z, Zd = 0.0122982 * X - 0.0204830 * Y + 1.3299098 * Z;
    const r = 3.2404542 * Xd - 1.5371385 * Yd - 0.4985314 * Zd, g = -0.9692660 * Xd + 1.8760108 * Yd + 0.0415560 * Zd, bl = 0.0556434 * Xd - 0.2040259 * Yd + 1.0572252 * Zd;
    return [Math.round(255 * toSrgb(r)), Math.round(255 * toSrgb(g)), Math.round(255 * toSrgb(bl))];
}
function linToLabish(l) { // cheap perceptual space for clustering: cube roots of an opponent transform
    const r = Math.cbrt(l[0]), g = Math.cbrt(l[1]), b = Math.cbrt(l[2]);
    return [0.2126 * r + 0.7152 * g + 0.0722 * b, 0.8 * (r - g), 0.5 * (0.5 * (r + g) - b)];
}

// Connected components (4-neighbour) of a binary map. Returns Int32Array labels (0 = background) and the count.
function label(bin, w, h) {
    const lab = new Int32Array(w * h), parent = [0]; let next = 1;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!bin[i]) continue;
        const l = x > 0 ? lab[i - 1] : 0, u = y > 0 ? lab[i - w] : 0;
        if (l && u) { const a = find(l), b = find(u); lab[i] = a < b ? a : b; if (a !== b) parent[a > b ? a : b] = a < b ? a : b; }
        else if (l || u) lab[i] = l || u;
        else { parent.push(next); lab[i] = next++; }
    }
    const remap = new Int32Array(next); let n = 0;
    for (let i = 0; i < w * h; i++) if (lab[i]) { const r = find(lab[i]); if (!remap[r]) remap[r] = ++n; lab[i] = remap[r]; }
    return { labels: lab, count: n };
}
// Spread labels into neighbouring background so that pixels just outside a letter still belong to it.
function growLabels(lab, w, h, passes) {
    let cur = lab;
    for (let p = 0; p < passes; p++) {
        const nx = new Int32Array(cur);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x; if (cur[i]) continue;
            let v = 0;
            if (x > 0 && cur[i - 1]) v = cur[i - 1]; else if (x < w - 1 && cur[i + 1]) v = cur[i + 1]; else if (y > 0 && cur[i - w]) v = cur[i - w]; else if (y < h - 1 && cur[i + w]) v = cur[i + w];
            nx[i] = v;
        }
        cur = nx;
    }
    return cur;
}

// k-means on perceptual triples (Float32Array n*3), deterministic start (farthest-point). Returns centres as [[..],[..]] and weights.
function kmeans(pts, n, k, seed) {
    const cent = []; const rnd = rng(seed || 7);
    let first = Math.floor(rnd() * n); cent.push([pts[first * 3], pts[first * 3 + 1], pts[first * 3 + 2]]);
    const d = new Float32Array(n).fill(1e9);
    while (cent.length < k) {
        const c = cent[cent.length - 1]; let best = 0, bi = 0;
        for (let i = 0; i < n; i++) { const dx = pts[i * 3] - c[0], dy = pts[i * 3 + 1] - c[1], dz = pts[i * 3 + 2] - c[2], q = dx * dx + dy * dy + dz * dz; if (q < d[i]) d[i] = q; if (d[i] > best) { best = d[i]; bi = i; } }
        cent.push([pts[bi * 3], pts[bi * 3 + 1], pts[bi * 3 + 2]]);
    }
    const cnt = new Float64Array(k);
    for (let it = 0; it < 14; it++) {
        const sum = new Float64Array(k * 3); cnt.fill(0);
        for (let i = 0; i < n; i++) {
            let bj = 0, bd = 1e9;
            for (let j = 0; j < k; j++) { const c = cent[j], dx = pts[i * 3] - c[0], dy = pts[i * 3 + 1] - c[1], dz = pts[i * 3 + 2] - c[2], q = dx * dx + dy * dy + dz * dz; if (q < bd) { bd = q; bj = j; } }
            sum[bj * 3] += pts[i * 3]; sum[bj * 3 + 1] += pts[i * 3 + 1]; sum[bj * 3 + 2] += pts[i * 3 + 2]; cnt[bj]++;
        }
        for (let j = 0; j < k; j++) if (cnt[j] > 0) cent[j] = [sum[j * 3] / cnt[j], sum[j * 3 + 1] / cnt[j], sum[j * 3 + 2] / cnt[j]];
    }
    return { centres: cent, weights: Array.from(cnt).map(c => c / n) };
}

module.exports = { clamp, smooth, lerp, hash2, rng, noiseField, fbm, gauss, boxesForGauss, S2L, L2S, toLin, toSrgb, rgbLin, lum, mixRgb, labToSrgb, linToLabish, label, growLabels, kmeans };
