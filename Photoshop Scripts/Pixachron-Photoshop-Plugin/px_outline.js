// Pixachron — outline mode: effects applied to a glyph's (or any path's) outline
// rather than its pixels. The contour is flattened and resampled at equal arc
// length, becoming a 1D signal whose "time" runs along the outline. Two domains:
//   position  — x(t) and y(t) as two channels, centred on the path set and scaled
//               to −1..1 by its half-extent
//   direction — the tangent angle along the contour (with the loop's steady turn
//               removed), run as one channel, then re-integrated; corners echo,
//               low-pass rounds, bitcrush polygonises, the loop is re-closed
// Output is a list of subpaths of smooth/corner points ready for pathItems.add.
//
// Input subpaths: [{ closed, points: [{ anchor:[x,y], left:[x,y], right:[x,y] }] }]
// (left = handle coming in, right = handle going out, as Photoshop reports them).

const PX_OUTLINE = (() => {
    const E = (typeof PX_EFFECTS !== "undefined") ? PX_EFFECTS : require("./px_effects.js");
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    // ---------------------------------------------------------------- flatten + resample

    // Flatten one subpath's Béziers to a polyline with roughly `tol` px between points.
    function flatten(sp, tol) {
        const pts = sp.points, n = pts.length, out = [];
        if (!n) return out;
        const segs = sp.closed ? n : n - 1;
        for (let i = 0; i < segs; i++) {
            const a = pts[i], b = pts[(i + 1) % n];
            const p0 = a.anchor, p1 = a.right || a.anchor, p2 = b.left || b.anchor, p3 = b.anchor;
            const chord = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
            const ctrl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
            const steps = Math.max(1, Math.ceil(Math.max(chord, ctrl) / tol));
            for (let k = 0; k < steps; k++) {
                const t = k / steps, u = 1 - t;
                out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                          u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
            }
        }
        if (!sp.closed) out.push([pts[n - 1].anchor[0], pts[n - 1].anchor[1]]);
        return out;
    }
    // Resample a polyline at equal arc-length spacing `ds`. Closed polylines include the closing segment.
    function resample(poly, closed, ds) {
        const m = poly.length; if (m < 2) return { x: Float32Array.from(poly.map(p => p[0])), y: Float32Array.from(poly.map(p => p[1])), len: 0 };
        const segs = closed ? m : m - 1, cum = new Float64Array(segs + 1);
        for (let i = 0; i < segs; i++) { const a = poly[i], b = poly[(i + 1) % m]; cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]); }
        const L = cum[segs], N = Math.max(4, Math.round(L / ds)), step = L / N;
        const x = new Float32Array(closed ? N : N + 1), y = new Float32Array(x.length);
        let s = 0, j = 0;
        for (let k = 0; k < x.length; k++) {
            s = Math.min(L, k * step);
            while (j < segs - 1 && cum[j + 1] < s) j++;
            const a = poly[j], b = poly[(j + 1) % m], d = cum[j + 1] - cum[j], t = d > 0 ? (s - cum[j]) / d : 0;
            x[k] = a[0] + (b[0] - a[0]) * t; y[k] = a[1] + (b[1] - a[1]) * t;
        }
        return { x, y, len: L };
    }

    // ---------------------------------------------------------------- signals

    // Run one effect over a signal that represents a closed loop: process it twice over and keep the
    // second pass, so the effect's state has been round the loop once and echoes wrap round the contour.
    function runLooped(effect, sig, params, ctx, loop) {
        const N = sig.length;
        if (!loop) return effect.run(sig, Int32Array.of(0), params, ctx);
        const d = new Float32Array(2 * N); d.set(sig, 0); d.set(sig, N);
        const ctx2 = Object.assign({}, ctx, { order: identity(2 * N) });
        const y = effect.run(d, Int32Array.of(0), params, ctx2);
        return y.subarray(N, 2 * N);
    }
    function identity(n) { const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = i; return a; }
    function acSplit(sig, period) {
        const N = sig.length, acc = 1 - Math.exp(-2 * Math.PI / Math.max(2, period)), low = new Float32Array(N);
        let l = sig[0]; for (let i = 0; i < N; i++) { l += (sig[i] - l) * acc; low[i] = l; }
        l = low[N - 1]; for (let i = N - 1; i >= 0; i--) { l += (low[i] - l) * acc; low[i] = l; }
        const hi = new Float32Array(N); for (let i = 0; i < N; i++) hi[i] = sig[i] - low[i];
        return { hi, low };
    }
    // One stage over one channel of one contour, honouring coupling and mix
    function stageChannel(stage, sig, ctx, loop, ds) {
        const effect = E.byId[stage.effect], params = Object.assign(E.defaults(effect), stage.params || {});
        if (ds && ds !== 1) for (const q of effect.params) if (q.time && typeof params[q.id] === "number") params[q.id] = clamp(params[q.id] / ds, q.min, q.max); // pixel distances → samples
        const mix = stage.mix == null ? 1 : clamp(stage.mix, 0, 1);
        let input = sig, low = null;
        if (stage.coupling === "ac") { const s = acSplit(sig, stage.couplingPeriod || 400); input = s.hi; low = s.low; }
        const y = runLooped(effect, input, params, ctx, loop);
        const out = new Float32Array(sig.length);
        for (let i = 0; i < sig.length; i++) { const wet = y[i] + (low ? low[i] : 0); out[i] = sig[i] * (1 - mix) + wet * mix; }
        return out;
    }

    // ---------------------------------------------------------------- domains

    function positionDomain(contours, stages, opts, ctxBase) {
        // common centre and scale so the channels mean the same thing on every contour
        let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
        for (const c of contours) for (let i = 0; i < c.x.length; i++) { if (c.x[i] < minx) minx = c.x[i]; if (c.x[i] > maxx) maxx = c.x[i]; if (c.y[i] < miny) miny = c.y[i]; if (c.y[i] > maxy) maxy = c.y[i]; }
        const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, R = Math.max(1, Math.max(maxx - minx, maxy - miny) / 2);
        const scale = opts.gain || 1; // the signal is the shape at 1 = full extent; gain lets you push it
        return contours.map((c, ci) => {
            let sx = new Float32Array(c.x.length), sy = new Float32Array(c.x.length);
            for (let i = 0; i < c.x.length; i++) { sx[i] = (c.x[i] - cx) / R * scale; sy[i] = (c.y[i] - cy) / R * scale; }
            for (const st of stages) {
                if (st.enabled === false) continue;
                const ctx = Object.assign({}, ctxBase, { seed: (st.seed || 1) + ci * 7 });
                if (st.reverse) { sx.reverse(); sy.reverse(); }
                sx = stageChannel(st, sx, ctx, c.closed && opts.loop !== false, opts.spacing);
                sy = stageChannel(st, sy, ctx, c.closed && opts.loop !== false, opts.spacing);
                if (st.reverse) { sx.reverse(); sy.reverse(); }
            }
            const x = new Float32Array(sx.length), y = new Float32Array(sx.length);
            for (let i = 0; i < sx.length; i++) { x[i] = cx + sx[i] / scale * R; y[i] = cy + sy[i] / scale * R; }
            return { x, y, closed: c.closed };
        });
    }

    function directionDomain(contours, stages, opts, ctxBase) {
        return contours.map((c, ci) => {
            const N = c.x.length, segs = c.closed ? N : N - 1;
            if (segs < 3) return c;
            // tangent angles, unwrapped
            const th = new Float64Array(segs), len = new Float64Array(segs);
            let prev = 0;
            for (let i = 0; i < segs; i++) {
                const j = (i + 1) % N, dx = c.x[j] - c.x[i], dy = c.y[j] - c.y[i];
                len[i] = Math.hypot(dx, dy); let a = Math.atan2(dy, dx);
                if (i > 0) { while (a - prev > Math.PI) a -= 2 * Math.PI; while (a - prev < -Math.PI) a += 2 * Math.PI; }
                th[i] = a; prev = a;
            }
            // the loop's steady turn (±2π for a simple closed curve) is a ramp; take it out so the signal is the corners
            const th0 = th[0], total = c.closed ? (Math.round((th[segs - 1] - th0) / (2 * Math.PI)) * 2 * Math.PI || 2 * Math.PI * Math.sign(th[segs - 1] - th0 || 1)) : 0;
            let sig = new Float32Array(segs);
            for (let i = 0; i < segs; i++) sig[i] = (th[i] - th0 - total * i / segs) / Math.PI;
            for (const st of stages) {
                if (st.enabled === false) continue;
                const ctx = Object.assign({}, ctxBase, { seed: (st.seed || 1) + ci * 7 });
                if (st.reverse) sig.reverse();
                sig = stageChannel(st, sig, ctx, c.closed && opts.loop !== false, opts.spacing);
                if (st.reverse) sig.reverse();
            }
            // re-integrate with the original step lengths, then close the loop and put the centroid back
            const x = new Float32Array(N), y = new Float32Array(N);
            x[0] = c.x[0]; y[0] = c.y[0];
            for (let i = 0; i < segs; i++) {
                const a = sig[i] * Math.PI + th0 + total * i / segs;
                const j = (i + 1) % N;
                if (j === 0) break;
                x[j] = x[i] + len[i] * Math.cos(a); y[j] = y[i] + len[i] * Math.sin(a);
            }
            if (c.closed) {
                const last = segs - 1, a = sig[last] * Math.PI + th0 + total * last / segs;
                const ex = x[last] + len[last] * Math.cos(a) - x[0], ey = y[last] + len[last] * Math.sin(a) - y[0];
                for (let i = 1; i < N; i++) { x[i] -= ex * i / N; y[i] -= ey * i / N; }
            }
            let ox = 0, oy = 0, nx = 0, ny = 0;
            for (let i = 0; i < N; i++) { ox += c.x[i]; oy += c.y[i]; nx += x[i]; ny += y[i]; }
            const dx = (ox - nx) / N, dy = (oy - ny) / N;
            for (let i = 0; i < N; i++) { x[i] += dx; y[i] += dy; }
            return { x, y, closed: c.closed };
        });
    }

    // ---------------------------------------------------------------- back to path points

    // Every `every`-th sample becomes a point; smooth points get Catmull-Rom handles, sharp turns become corners.
    function toPathPoints(contours, every, cornerDeg) {
        const cosLim = Math.cos((cornerDeg || 60) * Math.PI / 180);
        return contours.map(c => {
            const N = c.x.length, step = Math.max(1, Math.round(every));
            const idx = []; for (let i = 0; i < N; i += step) idx.push(i);
            if (!c.closed && idx[idx.length - 1] !== N - 1) idx.push(N - 1);
            const M = idx.length, pts = [];
            for (let k = 0; k < M; k++) {
                const i = idx[k], ip = idx[(k - 1 + M) % M], inx = idx[(k + 1) % M];
                const P = [c.x[i], c.y[i]];
                const open = !c.closed && (k === 0 || k === M - 1);
                const A = [c.x[ip], c.y[ip]], B = [c.x[inx], c.y[inx]];
                const d1 = [P[0] - A[0], P[1] - A[1]], d2 = [B[0] - P[0], B[1] - P[1]];
                const l1 = Math.hypot(d1[0], d1[1]) || 1, l2 = Math.hypot(d2[0], d2[1]) || 1;
                const cosA = (d1[0] * d2[0] + d1[1] * d2[1]) / (l1 * l2);
                if (open || cosA < cosLim) pts.push({ anchor: P, left: P.slice(), right: P.slice(), kind: "corner" });
                else { const t = [(B[0] - A[0]) / 6, (B[1] - A[1]) / 6]; pts.push({ anchor: P, left: [P[0] - t[0], P[1] - t[1]], right: [P[0] + t[0], P[1] + t[1]], kind: "smooth" }); }
            }
            return { closed: c.closed, points: pts };
        });
    }

    // ---------------------------------------------------------------- public

    // subpaths: as read from Photoshop; stages: the chain; opts: { domain, spacing, outSpacing, loop, gain, perSubpath, corner }
    function run(subpaths, stages, opts) {
        const t0 = Date.now();
        const ds = Math.max(0.25, opts.spacing || 1);
        const contours = subpaths.map(sp => { const r = resample(flatten(sp, ds), sp.closed, ds); return { x: r.x, y: r.y, closed: sp.closed, len: r.len }; }).filter(c => c.x.length >= 4);
        if (!contours.length) throw new Error("The path has no usable subpaths.");
        const ctxBase = { W: 1, H: 1, order: null, seed: 1 };
        let out;
        if (opts.perSubpath === false) {
            // one long signal through every subpath in order: concatenate, run, split
            const total = contours.reduce((s, c) => s + c.x.length, 0);
            const big = { x: new Float32Array(total), y: new Float32Array(total), closed: false };
            let p = 0; for (const c of contours) { big.x.set(c.x, p); big.y.set(c.y, p); p += c.x.length; }
            const o = (opts.domain === "direction" ? directionDomain : positionDomain)([big], stages, Object.assign({}, opts, { loop: false }), ctxBase)[0];
            out = []; p = 0; for (const c of contours) { out.push({ x: o.x.subarray(p, p + c.x.length), y: o.y.subarray(p, p + c.x.length), closed: c.closed }); p += c.x.length; }
        } else {
            out = (opts.domain === "direction" ? directionDomain : positionDomain)(contours, stages, opts, ctxBase);
        }
        const every = Math.max(1, Math.round((opts.outSpacing || 3) / ds));
        const paths = toPathPoints(out, every, opts.corner || 60);
        const samples = contours.reduce((s, c) => s + c.x.length, 0), points = paths.reduce((s, p) => s + p.points.length, 0);
        return { subpaths: paths, samples, points, contours: contours.length, ms: Date.now() - t0 };
    }

    return { run, flatten, resample, toPathPoints };
})();

if (typeof module !== "undefined") module.exports = PX_OUTLINE;
