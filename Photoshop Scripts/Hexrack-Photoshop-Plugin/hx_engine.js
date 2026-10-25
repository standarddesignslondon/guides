// Hexrack — engine: the device registry and the rack runner.
//
// runRack(img, stages, opts) runs the enabled stages in order. Each stage is
//   { device, params, seed, enabled, mix (0..1), rowFrom (0..100), rowSpan (0..100), chan }
// and can be confined to a band of rows (the hex-editor equivalent of selecting
// part of the file) and to a colour channel. Images are { w, h, d: Uint8Array RGB }.

const HX_ENGINE = (() => {
    const U = (typeof HX_UTIL !== "undefined") ? HX_UTIL : require("./hx_util.js");
    const groups = [
        (typeof HX_BYTES !== "undefined") ? HX_BYTES : require("./hx_bytes.js"),
        (typeof HX_JPEG !== "undefined") ? HX_JPEG : require("./hx_jpeg.js"),
        (typeof HX_PNG !== "undefined") ? HX_PNG : require("./hx_png.js"),
        (typeof HX_PALETTE !== "undefined") ? HX_PALETTE : require("./hx_palette.js")
    ];
    const LIST = []; for (const g of groups) for (const dv of g.LIST) LIST.push(dv);
    const byId = {}; for (const dv of LIST) byId[dv.id] = dv;
    function defaults(dv) { const p = {}; for (const q of dv.params) p[q.id] = q.def; for (const o of (dv.options || [])) p[o.id] = o.choices[0][0]; return p; }
    const clamp = U.clamp;

    // Scale parameters for a proxy at scale f: time → f, area → f²
    function scaleParams(dv, params, f) {
        const out = Object.assign({}, params);
        for (const q of dv.params) {
            if (typeof out[q.id] !== "number") continue;
            if (q.time) out[q.id] = clamp(Math.abs(out[q.id] * f) < 1 && out[q.id] !== 0 ? (out[q.id] < 0 ? -1 : 1) : out[q.id] * f, q.min, q.max);
            else if (q.area) out[q.id] = clamp(out[q.id] * f * f, q.min, q.max);
            if (q.step >= 1) out[q.id] = Math.round(out[q.id]);
        }
        return out;
    }
    function settingsForProxy(stage, f) { const dv = byId[stage.device]; return Object.assign({}, stage, { params: scaleParams(dv, Object.assign(defaults(dv), stage.params || {}), f) }); }

    function runStage(img, s) {
        const dv = byId[s.device]; if (!dv) throw new Error("Unknown device: " + s.device);
        const params = Object.assign(defaults(dv), s.params || {});
        const seed = (s.seed || 1) >>> 0;
        const ctx = { seed, rnd: U.mulberry32(seed * 2654435761 >>> 0) };
        const W = img.w, H = img.h;
        // row band
        const from = clamp(Math.round(H * (s.rowFrom == null ? 0 : s.rowFrom) / 100), 0, H - 1);
        const span = s.rowSpan == null ? 100 : s.rowSpan;
        const to = clamp(from + Math.max(1, Math.round(H * span / 100)), from + 1, H);
        const band = (from === 0 && to === H) ? img : { w: W, h: to - from, d: img.d.subarray(from * W * 3, to * W * 3) };
        let res = dv.run({ w: band.w, h: band.h, d: band.d }, params, ctx);
        if (!res || res.d.length !== band.d.length) throw new Error(dv.name + " returned the wrong size");
        // channel restriction and mix
        const mix = s.mix == null ? 1 : clamp(s.mix, 0, 1);
        const ch = s.chan && s.chan !== "all" ? ({ r: 0, g: 1, b: 2 })[s.chan] : -1;
        const out = Uint8Array.from(img.d);
        const base = from * W * 3, n = band.d.length, src = band.d, dst = res.d;
        if (ch < 0 && mix >= 1) out.set(dst, base);
        else for (let i = 0; i < n; i++) {
            if (ch >= 0 && i % 3 !== ch) continue;
            out[base + i] = mix >= 1 ? dst[i] : Math.round(src[i] * (1 - mix) + dst[i] * mix);
        }
        return { w: W, h: H, d: out };
    }

    function runRack(img, stages) {
        const t0 = Date.now(); let cur = img; const info = [];
        for (const s of stages) {
            if (s.enabled === false) continue;
            const t = Date.now(); cur = runStage(cur, s); info.push({ device: s.device, ms: Date.now() - t });
        }
        return { img: cur, stages: info, ms: Date.now() - t0 };
    }

    // Box-filter downsample to at most maxSide; returns { w, h, d, f }
    function proxy(img, maxSide) {
        const W = img.w, H = img.h, f = Math.min(1, maxSide / Math.max(W, H));
        if (f >= 1) return { w: W, h: H, d: img.d, f: 1 };
        const w = Math.max(1, Math.round(W * f)), h = Math.max(1, Math.round(H * f));
        const acc = new Float32Array(w * h * 3), cnt = new Float32Array(w * h);
        for (let y = 0; y < H; y++) { const Y = Math.min(h - 1, (y * h / H) | 0); for (let x = 0; x < W; x++) { const X = Math.min(w - 1, (x * w / W) | 0); const j = Y * w + X, o = (y * W + x) * 3; acc[j * 3] += img.d[o]; acc[j * 3 + 1] += img.d[o + 1]; acc[j * 3 + 2] += img.d[o + 2]; cnt[j]++; } }
        const d = new Uint8Array(w * h * 3);
        for (let j = 0; j < w * h; j++) { const c = cnt[j] || 1; d[j * 3] = Math.round(acc[j * 3] / c); d[j * 3 + 1] = Math.round(acc[j * 3 + 1] / c); d[j * 3 + 2] = Math.round(acc[j * 3 + 2] / c); }
        return { w, h, d, f };
    }
    // Nearest-neighbour upsample (bent pixels should stay hard-edged)
    function upsample(img, W, H) {
        const w = img.w, h = img.h, out = new Uint8Array(W * H * 3);
        for (let y = 0; y < H; y++) { const sy = Math.min(h - 1, (y * h / H) | 0); for (let x = 0; x < W; x++) { const sx = Math.min(w - 1, (x * w / W) | 0), o = (y * W + x) * 3, s = (sy * w + sx) * 3; out[o] = img.d[s]; out[o + 1] = img.d[s + 1]; out[o + 2] = img.d[s + 2]; } }
        return { w: W, h: H, d: out };
    }

    return { LIST, byId, defaults, runStage, runRack, proxy, upsample, scaleParams, settingsForProxy };
})();
if (typeof module !== "undefined") module.exports = HX_ENGINE;
