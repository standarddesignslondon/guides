// Pixachron — engine: unroll the image along a path, run one effect over the
// signal, roll it back (along the same path or a different one), mix.
//
// run(docIn, s) where
//   docIn = { w, h, planes: [R, G, B] Float32Array 0..1, mask: Float32Array 0..1 | null }
//   s = { path: {path, snake, angle, cx, cy, pitch, spokes, twist, inward, reverse, tile, tileSnake, segment},
//         maskMode: "none" | "only" | "except",
//         effect: id, params: {...},
//         channel: "rgb" | "luma" | "spread", spread: 0..1,
//         reroll: "same" | <path id>,
//         mix: 0..1, seed: int }
// returns { planes: [R, G, B], samples, segments, ms }

const PX_ENGINE = (() => {
    const P = (typeof PX_PATHS !== "undefined") ? PX_PATHS : require("./px_paths.js");
    const E = (typeof PX_EFFECTS !== "undefined") ? PX_EFFECTS : require("./px_effects.js");

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    // Scale every pixel-valued parameter by f (proxy previews, channel spread).
    function scaleParams(effect, params, f) {
        const out = Object.assign({}, params);
        for (const q of effect.params) if (q.time && typeof out[q.id] === "number") out[q.id] = clamp(out[q.id] * f, q.min, q.max);
        return out;
    }
    function scalePathOpts(po, f) {
        const o = Object.assign({}, po);
        if (o.tile) o.tile = Math.max(2, Math.round(o.tile * f));
        if (o.pitch) o.pitch = Math.max(1, o.pitch * f);
        return o;
    }

    function buildPath(W, H, s, mask) {
        let path = P.build(W, H, s.path, mask);
        if (mask && s.maskMode === "only") path = P.filter(path, (i) => mask[i] > 0.5);
        else if (mask && s.maskMode === "except") path = P.filter(path, (i) => mask[i] <= 0.5);
        return path;
    }

    function run(docIn, s) {
        const t0 = Date.now();
        const W = docIn.w, H = docIn.h, n = W * H, mask = docIn.mask || null;
        const effect = E.byId[s.effect]; if (!effect) throw new Error("Unknown effect: " + s.effect);
        const params = Object.assign(E.defaults(effect), s.params || {});
        const mix = s.mix == null ? 1 : clamp(s.mix, 0, 1);

        const path = buildPath(W, H, s, mask);
        let back = path;
        if (s.reroll && s.reroll !== "same" && s.reroll !== s.path.path) {
            back = buildPath(W, H, Object.assign({}, s, { path: Object.assign({}, s.path, { path: s.reroll }) }), mask);
            if (back.order.length !== path.order.length) throw new Error("The re-roll path covers a different number of pixels.");
        }
        const order = path.order, N = order.length, segStarts = path.segStarts, orderBack = back.order;
        const ctx = { order, W, H, seed: s.seed || 1 };

        const out = docIn.planes.map(pl => Float32Array.from(pl));
        const sig = new Float32Array(N);

        // AC coupling: take out the slow-moving level along the path before the effect and put it back after,
        // so the effect works on changes (edges, detail) rather than on the picture's overall tone.
        const ac = s.coupling === "ac", acPer = Math.max(2, s.couplingPeriod || 400), acc = 1 - Math.exp(-2 * Math.PI / acPer);
        const low = ac ? new Float32Array(N) : null;
        const process = (plane, prm) => {
            for (let i = 0; i < N; i++) sig[i] = plane[order[i]] * 2 - 1;
            if (ac) {
                for (let k = 0; k < segStarts.length; k++) {
                    const a = segStarts[k], b = k + 1 < segStarts.length ? segStarts[k + 1] : N;
                    // forward-backward one-pole so the level has no lag along the path
                    let l = sig[a]; for (let i = a; i < b; i++) { l += (sig[i] - l) * acc; low[i] = l; }
                    l = low[b - 1]; for (let i = b - 1; i >= a; i--) { l += (low[i] - l) * acc; low[i] = l; }
                }
                for (let i = 0; i < N; i++) sig[i] -= low[i];
            }
            const y = effect.run(sig, segStarts, prm, ctx);
            const res = new Float32Array(n);
            if (ac) for (let i = 0; i < N; i++) res[orderBack[i]] = (y[i] + low[i] + 1) * 0.5;
            else for (let i = 0; i < N; i++) res[orderBack[i]] = (y[i] + 1) * 0.5;
            return res;
        };

        if (s.channel === "luma") {
            const Y = new Float32Array(n), [R, G, B] = docIn.planes;
            for (let i = 0; i < n; i++) Y[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
            const Y2 = process(Y, params);
            for (let k = 0; k < N; k++) { const i = orderBack[k]; const d = (Y2[i] - Y[i]) * mix; out[0][i] = clamp(R[i] + d, 0, 1); out[1][i] = clamp(G[i] + d, 0, 1); out[2][i] = clamp(B[i] + d, 0, 1); }
        } else {
            const spread = s.channel === "spread" ? (s.spread || 0) : 0;
            const factors = [1 - spread * 0.5, 1, 1 + spread * 0.5];
            for (let c = 0; c < 3; c++) {
                const prm = spread ? scaleParams(effect, params, factors[c]) : params;
                const res = process(docIn.planes[c], prm);
                const src = docIn.planes[c], dst = out[c];
                for (let k = 0; k < N; k++) { const i = orderBack[k]; dst[i] = clamp(src[i] * (1 - mix) + res[i] * mix, 0, 1); }
            }
        }
        return { planes: out, samples: N, segments: segStarts.length, ms: Date.now() - t0 };
    }

    // Box-filter downsample of planes to at most `maxSide` on the long side; returns { w, h, planes, mask, f }
    function proxy(docIn, maxSide) {
        const W = docIn.w, H = docIn.h, f = Math.min(1, maxSide / Math.max(W, H));
        if (f >= 1) return Object.assign({ f: 1 }, docIn);
        const w = Math.max(1, Math.round(W * f)), h = Math.max(1, Math.round(H * f));
        const down = (src) => {
            const out = new Float32Array(w * h), cnt = new Float32Array(w * h);
            for (let y = 0; y < H; y++) { const Y = Math.min(h - 1, (y * h / H) | 0); for (let x = 0; x < W; x++) { const X = Math.min(w - 1, (x * w / W) | 0); const j = Y * w + X; out[j] += src[y * W + x]; cnt[j]++; } }
            for (let j = 0; j < w * h; j++) if (cnt[j]) out[j] /= cnt[j];
            return out;
        };
        return { w, h, f, planes: docIn.planes.map(down), mask: docIn.mask ? down(docIn.mask) : null };
    }
    // Bilinear upsample of planes back to W×H
    function upsample(planes, w, h, W, H) {
        return planes.map(src => {
            const out = new Float32Array(W * H);
            for (let y = 0; y < H; y++) {
                const sy = Math.min(h - 1, (y + 0.5) * h / H - 0.5), y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(h - 1, y0 + 1), fy = clamp(sy - y0, 0, 1);
                for (let x = 0; x < W; x++) {
                    const sx = Math.min(w - 1, (x + 0.5) * w / W - 0.5), x0 = Math.max(0, Math.floor(sx)), x1 = Math.min(w - 1, x0 + 1), fx = clamp(sx - x0, 0, 1);
                    const a = src[y0 * w + x0], b = src[y0 * w + x1], c = src[y1 * w + x0], d = src[y1 * w + x1];
                    out[y * W + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
                }
            }
            return out;
        });
    }
    // Settings adjusted for a proxy at scale f
    function settingsForProxy(s, f) {
        const effect = E.byId[s.effect];
        return Object.assign({}, s, { path: scalePathOpts(s.path, f), params: scaleParams(effect, Object.assign(E.defaults(effect), s.params || {}), f) });
    }

    // A chain: stages run in series, each stage's output planes feeding the next. Each stage is a
    // full settings object for run(); disabled stages (enabled === false) are skipped.
    // Returns { planes, stages: [{samples, segments, ms}], ms }
    function runChain(docIn, stages) {
        const t0 = Date.now();
        let cur = docIn, info = [];
        for (let i = 0; i < stages.length; i++) {
            const s = stages[i];
            if (s.enabled === false) continue;
            const r = run(cur, s);
            info.push({ samples: r.samples, segments: r.segments, ms: r.ms });
            cur = { w: cur.w, h: cur.h, planes: r.planes, mask: docIn.mask };
        }
        return { planes: cur.planes, stages: info, ms: Date.now() - t0 };
    }

    return { run, runChain, proxy, upsample, settingsForProxy, scaleParams };
})();

if (typeof module !== "undefined") module.exports = PX_ENGINE;
