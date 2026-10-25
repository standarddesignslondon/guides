// Hexrack — Palette (GIF-style indexed colour abuse) and Pixel sort.

const HX_PALETTE = (() => {
    const U = (typeof HX_UTIL !== "undefined") ? HX_UTIL : require("./hx_util.js");
    const { clamp, clamp8, luma, hue, sat } = U;

    // Median-cut quantiser → { pal: [[r,g,b]...], idx: Uint16Array }
    function quantise(img, K, rnd) {
        const d = img.d, n = img.w * img.h;
        // sample up to 40k pixels for the cut
        const step = Math.max(1, Math.floor(n / 40000)), pts = [];
        for (let i = 0; i < n; i += step) pts.push(i);
        let boxes = [{ pts, }];
        const range = (box) => { let mn = [255, 255, 255], mx = [0, 0, 0]; for (const i of box.pts) for (let c = 0; c < 3; c++) { const v = d[i * 3 + c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; } box.mn = mn; box.mx = mx; let best = 0, bc = 0; for (let c = 0; c < 3; c++) if (mx[c] - mn[c] > best) { best = mx[c] - mn[c]; bc = c; } box.axis = bc; box.spread = best; };
        range(boxes[0]);
        while (boxes.length < K) {
            let bi = -1, bs = 0; for (let i = 0; i < boxes.length; i++) if (boxes[i].pts.length > 1 && boxes[i].spread > bs) { bs = boxes[i].spread; bi = i; }
            if (bi < 0) break;
            const b = boxes[bi], ax = b.axis; b.pts.sort((p, q) => d[p * 3 + ax] - d[q * 3 + ax]);
            const mid = b.pts.length >> 1, b1 = { pts: b.pts.slice(0, mid) }, b2 = { pts: b.pts.slice(mid) };
            range(b1); range(b2); boxes.splice(bi, 1, b1, b2);
        }
        const pal = boxes.map(b => { let r = 0, g = 0, bl = 0; for (const i of b.pts) { r += d[i * 3]; g += d[i * 3 + 1]; bl += d[i * 3 + 2]; } const m = b.pts.length || 1; return [Math.round(r / m), Math.round(g / m), Math.round(bl / m)]; });
        // nearest-colour lookup with a small cache keyed on 5-bit colour
        const cache = new Int16Array(32768).fill(-1);
        const idx = new Uint16Array(n);
        for (let i = 0; i < n; i++) {
            const r = d[i * 3], g = d[i * 3 + 1], b = d[i * 3 + 2], key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
            let k = cache[key];
            if (k < 0) { let best = 1e9; for (let j = 0; j < pal.length; j++) { const dr = pal[j][0] - r, dg = pal[j][1] - g, db = pal[j][2] - b, e = dr * dr + dg * dg + db * db; if (e < best) { best = e; k = j; } } cache[key] = k; }
            idx[i] = k;
        }
        return { pal, idx };
    }
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

    const palette = {
        id: "palette", name: "Palette", group: "Palette",
        hint: "The picture is reduced to a GIF-style palette of N colours, and then the palette is abused: rotate the indices and every colour becomes its neighbour; scramble the palette and the tonal order is lost while the shapes survive; replace it with a ramp or a rainbow and the picture is remapped by brightness order. Indices can also be bumped at random, as a damaged LZW stream would.",
        params: [
            { id: "colours", name: "Colours", min: 2, max: 256, step: 1, def: 16, curve: 2 },
            { id: "rotate", name: "Rotate indices", min: -255, max: 255, step: 1, def: 3 },
            { id: "bump", name: "Bump indices (% of pixels)", min: 0, max: 100, step: 0.1, def: 0 },
            { id: "bumpBy", name: "Bump by", min: 1, max: 255, step: 1, def: 1 },
            { id: "dither", name: "Dither (%)", min: 0, max: 100, step: 1, def: 0 }
        ],
        options: [
            { id: "sort", name: "Palette order", choices: [["asis", "As found (median cut)"], ["luma", "Sorted by brightness"], ["hue", "Sorted by hue"], ["sat", "Sorted by saturation"], ["scramble", "Scrambled (seeded)"]] },
            { id: "replace", name: "Replace palette with", choices: [["none", "Keep the picture's colours"], ["grey", "Grey ramp"], ["rainbow", "Rainbow"], ["heat", "Heat (black-red-yellow-white)"], ["random", "Random colours (seeded)"], ["twotone", "Two-tone (black / white)"], ["invert", "Inverted palette"]] }
        ],
        run(img, p, ctx) {
            const rnd = ctx.rnd, W = img.w, H = img.h, n = W * H, K = Math.max(2, Math.round(p.colours));
            const q = quantise(img, K, rnd); let pal = q.pal.map(c => c.slice()); const idx = q.idx; const M = pal.length;
            // order the palette and remap indices so the picture is unchanged by the ordering alone
            let order = pal.map((_, i) => i);
            const key = (c, f) => f({ d: Uint8Array.from(c) }, 0);
            if (p.sort === "luma") order.sort((a, b) => key(pal[a], luma) - key(pal[b], luma));
            else if (p.sort === "hue") order.sort((a, b) => key(pal[a], hue) - key(pal[b], hue));
            else if (p.sort === "sat") order.sort((a, b) => key(pal[a], sat) - key(pal[b], sat));
            else if (p.sort === "scramble") { for (let i = M - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; } }
            const inv = new Int32Array(M); order.forEach((src, pos) => inv[src] = pos);
            const sorted = order.map(i => pal[i]);
            if (p.sort === "scramble") pal = sorted; // scrambled: indices keep pointing at their slot, so colours change
            else { pal = sorted; for (let i = 0; i < n; i++) idx[i] = inv[idx[i]]; }
            // replacement palettes, laid along the (ordered) index axis
            const t = (i) => M > 1 ? i / (M - 1) : 0;
            if (p.replace === "grey") pal = pal.map((_, i) => [t(i) * 255, t(i) * 255, t(i) * 255].map(Math.round));
            else if (p.replace === "rainbow") pal = pal.map((_, i) => { const h = t(i) * 360, c = 255, x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const s = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return s.map(Math.round); });
            else if (p.replace === "heat") pal = pal.map((_, i) => { const v = t(i); return [clamp8(v * 3 * 255), clamp8((v - 1 / 3) * 3 * 255), clamp8((v - 2 / 3) * 3 * 255)]; });
            else if (p.replace === "random") pal = pal.map(() => [rnd() * 256 | 0, rnd() * 256 | 0, rnd() * 256 | 0]);
            else if (p.replace === "twotone") pal = pal.map((_, i) => i & 1 ? [255, 255, 255] : [0, 0, 0]);
            else if (p.replace === "invert") pal = pal.map(c => [255 - c[0], 255 - c[1], 255 - c[2]]);
            const rot = Math.round(p.rotate), bumpP = p.bump / 100, by = Math.round(p.bumpBy), dith = p.dither / 100;
            const out = new Uint8Array(n * 3);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const i = y * W + x; let k = idx[i] + rot;
                if (bumpP > 0 && rnd() < bumpP) k += by;
                if (dith > 0) { const th = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * dith * 2; if (th > 0.25) k += 1; else if (th < -0.25) k -= 1; }
                k = ((k % M) + M) % M; const c = pal[k];
                out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2];
            }
            return { w: W, h: H, d: out };
        }
    };

    // ---------------------------------------------------------------- Pixel sort
    const pixelsort = {
        id: "pixelsort", name: "Pixel sort", group: "Glitch",
        hint: "Kim Asendorf's move: along each row (or column) the pixels inside each interval are sorted by brightness, hue or a channel, so detail runs out into streaks. Intervals are found by threshold (runs of pixels between the low and high brightness), by edges, by random lengths, or the whole line. Not databending strictly, but it chains beautifully after a corrupted JPEG.",
        params: [
            { id: "lo", name: "Threshold low", min: 0, max: 255, step: 1, def: 60 },
            { id: "hi", name: "Threshold high", min: 0, max: 255, step: 1, def: 220 },
            { id: "maxlen", name: "Random interval (px)", min: 2, max: 4000, step: 1, def: 200, time: true, curve: 2 },
            { id: "prob", name: "Lines sorted (%)", min: 0, max: 100, step: 1, def: 100 },
            { id: "angle", name: "Shift per line (px)", min: -50, max: 50, step: 1, def: 0, time: true, hint: "Staggers the intervals from line to line" }
        ],
        options: [
            { id: "dir", name: "Direction", choices: [["rows", "Rows"], ["cols", "Columns"]] },
            { id: "interval", name: "Intervals", choices: [["thr", "Brightness between thresholds"], ["out", "Brightness outside thresholds"], ["edges", "Between edges (low = sensitivity)"], ["random", "Random lengths"], ["whole", "Whole line"]] },
            { id: "key", name: "Sort by", choices: [["luma", "Brightness"], ["hue", "Hue"], ["sat", "Saturation"], ["r", "Red"], ["g", "Green"], ["b", "Blue"]] },
            { id: "order", name: "Order", choices: [["asc", "Dark to light"], ["desc", "Light to dark"], ["alt", "Alternate per line"]] }
        ],
        run(img, p, ctx) {
            const rnd = ctx.rnd, W = img.w, H = img.h, d = img.d, out = Uint8Array.from(d);
            const rows = p.dir === "rows", L = rows ? W : H, lines = rows ? H : W;
            const keyf = p.key === "luma" ? (i) => luma(d, i) : p.key === "hue" ? (i) => hue(d, i) : p.key === "sat" ? (i) => sat(d, i) : (i) => d[i * 3 + (p.key === "r" ? 0 : p.key === "g" ? 1 : 2)];
            const pr = p.prob / 100;
            for (let l = 0; l < lines; l++) {
                if (pr < 1 && rnd() >= pr) continue;
                const at = (t) => rows ? l * W + t : t * W + l;
                const desc = p.order === "desc" || (p.order === "alt" && (l & 1));
                const sh = Math.round(p.angle) * l;
                // intervals as [a, b)
                const ivs = [];
                if (p.interval === "whole") ivs.push([0, L]);
                else if (p.interval === "random") { let t = ((sh % L) + L) % L; t = t % Math.max(2, p.maxlen); for (; t < L;) { const len = 2 + Math.floor(rnd() * p.maxlen); ivs.push([t, Math.min(L, t + len)]); t += len; } }
                else {
                    let start = -1;
                    for (let t = 0; t <= L; t++) {
                        let inside = false;
                        if (t < L) {
                            const i = at(t), y = luma(d, i);
                            if (p.interval === "thr") inside = y >= p.lo && y <= p.hi;
                            else if (p.interval === "out") inside = y < p.lo || y > p.hi;
                            else { const prev = t > 0 ? luma(d, at(t - 1)) : y; inside = Math.abs(y - prev) < Math.max(1, p.lo); }
                        }
                        if (inside && start < 0) start = t;
                        if (!inside && start >= 0) { if (t - start > 1) ivs.push([start, t]); start = -1; }
                    }
                }
                for (const [a, b] of ivs) {
                    const idx = []; for (let t = a; t < b; t++) idx.push(at(t));
                    const keys = idx.map(keyf);
                    const ord = idx.map((_, k) => k).sort((u, v) => keys[u] - keys[v]);
                    if (desc) ord.reverse();
                    for (let k = 0; k < idx.length; k++) { const src = idx[ord[k]] * 3, dst = idx[k] * 3; out[dst] = d[src]; out[dst + 1] = d[src + 1]; out[dst + 2] = d[src + 2]; }
                }
            }
            return { w: W, h: H, d: out };
        }
    };

    const LIST = [palette, pixelsort];
    return { LIST, quantise };
})();
if (typeof module !== "undefined") module.exports = HX_PALETTE;
