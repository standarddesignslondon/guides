// Hexrack — PNG filter device. PNG stores each scanline as the difference from a
// prediction (None / Sub / Up / Average / Paeth, chosen per row by a filter byte).
// Bend the filtered residuals, or decode with the wrong filter, and the errors
// integrate down and across the picture as drifting colour. No zlib is involved:
// the deflate layer is lossless and uninteresting, the prediction layer is the fun.

const HX_PNG = (() => {
    const U = (typeof HX_UTIL !== "undefined") ? HX_UTIL : require("./hx_util.js");
    const { Builder, fit, FILLS } = U;

    function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }

    // filter one row: raw (current), prior (previous raw), type → residual bytes
    function filterRow(raw, prior, type, out, bpp) {
        const L = raw.length;
        for (let x = 0; x < L; x++) {
            const a = x >= bpp ? raw[x - bpp] : 0, b = prior ? prior[x] : 0, c = (prior && x >= bpp) ? prior[x - bpp] : 0;
            let pred = 0;
            switch (type) { case 1: pred = a; break; case 2: pred = b; break; case 3: pred = (a + b) >> 1; break; case 4: pred = paeth(a, b, c); break; }
            out[x] = (raw[x] - pred) & 255;
        }
    }
    function unfilterRow(res, prior, type, out, bpp) {
        const L = res.length;
        for (let x = 0; x < L; x++) {
            const a = x >= bpp ? out[x - bpp] : 0, b = prior ? prior[x] : 0, c = (prior && x >= bpp) ? prior[x - bpp] : 0;
            let pred = 0;
            switch (type) { case 1: pred = a; break; case 2: pred = b; break; case 3: pred = (a + b) >> 1; break; case 4: pred = paeth(a, b, c); break; }
            out[x] = (res[x] + pred) & 255;
        }
    }
    function adaptive(raw, prior, bpp, tmp) {
        let best = 0, bs = Infinity;
        for (let t = 0; t < 5; t++) { filterRow(raw, prior, t, tmp, bpp); let s = 0; for (let x = 0; x < tmp.length; x++) { const v = tmp[x]; s += v < 128 ? v : 256 - v; } if (s < bs) { bs = s; best = t; } }
        return best;
    }

    const FT = [["adaptive", "Adaptive (as a real encoder would)"], ["0", "None"], ["1", "Sub"], ["2", "Up"], ["3", "Average"], ["4", "Paeth"]];
    const png = {
        id: "png", name: "PNG filters", group: "Codecs",
        hint: "Encodes each row as PNG residuals, damages that stream, and decodes it again. Decoding with the wrong filter is deterministic drift: Paeth-in, Up-out smears every edge downwards. Scrambled filter bytes give rows that individually go wrong; a byte inserted or deleted in the residual stream shifts every filter byte after it off its row, which is the most violent option.",
        params: [
            { id: "scramble", name: "Filter bytes rewritten (%)", min: 0, max: 100, step: 0.5, def: 0, hint: "Each row's filter byte replaced by a random one" },
            { id: "noise", name: "Residual noise (bytes per 10,000)", min: 0, max: 10000, step: 0.1, def: 3, curve: 3 },
            { id: "amp", name: "Noise size", min: 1, max: 255, step: 1, def: 255, hint: "Small values nudge, 255 replaces" },
            { id: "shifts", name: "Stream inserts / deletes", min: 0, max: 200, step: 1, def: 0, area: true },
            { id: "shiftBy", name: "Bytes per shift", min: 1, max: 3000, step: 1, def: 1, curve: 2.5 },
            { id: "drop", name: "Rows dropped (%)", min: 0, max: 50, step: 0.1, def: 0 }
        ],
        options: [
            { id: "enc", name: "Encode filter", choices: FT },
            { id: "dec", name: "Decode as", choices: [["same", "Same as encoded (honest)"], ["0", "None"], ["1", "Sub"], ["2", "Up"], ["3", "Average"], ["4", "Paeth"], ["rot", "Each type one along"]] },
            { id: "bpp", name: "Pixel width for the predictor", choices: [["3", "3 bytes (RGB, correct)"], ["4", "4 bytes (RGBA)"], ["1", "1 byte"], ["2", "2 bytes"], ["6", "6 bytes"]] },
            { id: "fill", name: "Fill the end with", choices: FILLS }
        ],
        run(img, p, ctx) {
            const rnd = ctx.rnd, W = img.w, H = img.h, d = img.d, RL = W * 3, bpp = +p.bpp;
            // 1. encode: [filterByte, residuals...] per row
            const stream = new Uint8Array(H * (RL + 1)), tmp = new Uint8Array(RL);
            for (let y = 0; y < H; y++) {
                const raw = d.subarray(y * RL, (y + 1) * RL), prior = y ? d.subarray((y - 1) * RL, y * RL) : null;
                const t = p.enc === "adaptive" ? adaptive(raw, prior, bpp, tmp) : +p.enc;
                stream[y * (RL + 1)] = t;
                filterRow(raw, prior, t, stream.subarray(y * (RL + 1) + 1, (y + 1) * (RL + 1)), bpp);
            }
            // 2. bend the stream
            const n = stream.length, sc = p.scramble / 100;
            if (sc > 0) for (let y = 0; y < H; y++) if (rnd() < sc) stream[y * (RL + 1)] = rnd() * 5 | 0;
            const hits = Math.round(n * p.noise / 10000);
            for (let k = 0; k < hits; k++) { const i = Math.floor(rnd() * n); if (i % (RL + 1) === 0) continue; stream[i] = p.amp >= 255 ? rnd() * 256 | 0 : (stream[i] + Math.round((rnd() - 0.5) * 2 * p.amp)) & 255; }
            let s = stream;
            if (p.drop > 0) { const b = new Builder(n); for (let y = 0; y < H; y++) if (rnd() >= p.drop / 100) b.pushRange(stream, y * (RL + 1), (y + 1) * (RL + 1)); s = fit(b.bytes(), n, "wrap", stream, rnd); }
            if (p.shifts > 0) {
                const cuts = []; for (let k = 0; k < p.shifts; k++) cuts.push(Math.floor(rnd() * n)); cuts.sort((a, b) => a - b);
                const b = new Builder(n + n / 4); let i = 0, B = Math.max(1, Math.round(p.shiftBy));
                for (let k = 0; k < cuts.length; k++) { const c = Math.max(i, cuts[k]); b.pushRange(s, i, c); i = c; if (k & 1) i = Math.min(n, i + B); else for (let j = 0; j < B; j++) b.push(s[Math.min(n - 1, i + j)]); }
                b.pushRange(s, i, n); s = fit(b.bytes(), n, p.fill, stream, rnd);
            }
            // 3. decode
            const out = new Uint8Array(W * H * 3);
            for (let y = 0; y < H; y++) {
                let t = s[y * (RL + 1)];
                if (p.dec === "rot") t = (t + 1) % 5; else if (p.dec !== "same") t = +p.dec;
                if (t > 4) t = t % 5;
                const prior = y ? out.subarray((y - 1) * RL, y * RL) : null;
                unfilterRow(s.subarray(y * (RL + 1) + 1, (y + 1) * (RL + 1)), prior, t, out.subarray(y * RL, (y + 1) * RL), bpp);
            }
            return { w: W, h: H, d: out };
        }
    };
    return { LIST: [png] };
})();
if (typeof module !== "undefined") module.exports = HX_PNG;
