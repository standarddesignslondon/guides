// Pixachron — paths: how an image is unrolled into a 1D signal.
// A path is a permutation of pixel indices (y*W + x) giving the order in which
// pixels are visited ("which direction is time"), plus the positions at which a
// new segment starts (the effect's state is reset at every segment start).
//
// Every builder returns { order: Int32Array, segStarts: Int32Array } over a
// w×h rectangle whose origin is (ox, oy) in the full image of width W.
// Paths are deterministic so a preview on a proxy matches a full render.

const PX_PATHS = (() => {

    // ---------------------------------------------------------------- helpers

    // Stable counting sort of idx (Int32Array) by integer key (0..maxKey).
    function stableSortBy(idx, n, key, maxKey) {
        const counts = new Int32Array(maxKey + 2);
        for (let i = 0; i < n; i++) counts[key[idx[i]] + 1]++;
        for (let k = 1; k <= maxKey + 1; k++) counts[k] += counts[k - 1];
        const out = new Int32Array(n);
        for (let i = 0; i < n; i++) { const v = idx[i]; out[counts[key[v]]++] = v; }
        return out;
    }
    function identity(n) { const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = i; return a; }
    function one() { return Int32Array.of(0); }

    // Segment starts from a per-position group id: a new segment wherever the id changes.
    function segsFromGroups(order, n, groupOf) {
        const starts = [];
        let last = -1;
        for (let i = 0; i < n; i++) { const g = groupOf(order[i]); if (g !== last) { starts.push(i); last = g; } }
        return Int32Array.from(starts);
    }

    // ---------------------------------------------------------------- line paths

    // Lines at any angle. angle 0 = rows left→right, 90 = columns top→bottom.
    // snake: alternate lines run backwards. Lines are the segments when segment === "line".
    function lines(w, h, angle, snake) {
        const n = w * h;
        const rad = angle * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
        // along-line coordinate u, across-line coordinate v (both in pixels)
        const uq = new Int32Array(n), vq = new Int32Array(n);
        let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = y * w + x;
            const u = x * c + y * s, v = -x * s + y * c;
            const U = Math.round(u * 4), V = Math.round(v); // 1/4 px along, whole px across
            uq[i] = U; vq[i] = V;
            if (U < umin) umin = U; if (U > umax) umax = U; if (V < vmin) vmin = V; if (V > vmax) vmax = V;
        }
        for (let i = 0; i < n; i++) { uq[i] -= umin; vq[i] -= vmin; }
        if (snake) { const uspan = umax - umin; for (let i = 0; i < n; i++) if (vq[i] & 1) uq[i] = uspan - uq[i]; }
        let idx = identity(n);
        idx = stableSortBy(idx, n, uq, umax - umin);
        idx = stableSortBy(idx, n, vq, vmax - vmin);
        return { order: idx, segStarts: segsFromGroups(idx, n, (i) => vq[i]) };
    }

    // Fast exact cases
    function raster(w, h, snake) {
        const n = w * h, order = new Int32Array(n), starts = new Int32Array(h);
        let p = 0;
        for (let y = 0; y < h; y++) {
            starts[y] = p;
            if (snake && (y & 1)) for (let x = w - 1; x >= 0; x--) order[p++] = y * w + x;
            else for (let x = 0; x < w; x++) order[p++] = y * w + x;
        }
        return { order, segStarts: starts };
    }
    function columns(w, h, snake) {
        const n = w * h, order = new Int32Array(n), starts = new Int32Array(w);
        let p = 0;
        for (let x = 0; x < w; x++) {
            starts[x] = p;
            if (snake && (x & 1)) for (let y = h - 1; y >= 0; y--) order[p++] = y * w + x;
            else for (let y = 0; y < h; y++) order[p++] = y * w + x;
        }
        return { order, segStarts: starts };
    }

    // ---------------------------------------------------------------- space-filling curves

    function hilbertD2XY(side, d) {
        let x = 0, y = 0, t = d;
        for (let s = 1; s < side; s *= 2) {
            const rx = 1 & (t >> 1), ry = 1 & (t ^ rx);
            if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const tmp = x; x = y; y = tmp; }
            x += s * rx; y += s * ry;
            t >>= 2;
        }
        return [x, y];
    }
    function hilbert(w, h) {
        let side = 1; while (side < Math.max(w, h)) side *= 2;
        const n = w * h, order = new Int32Array(n), total = side * side;
        let p = 0;
        // incremental walk is simpler to get right than to optimise; 16M steps ≈ 1 s
        for (let d = 0; d < total && p < n; d++) {
            const xy = hilbertD2XY(side, d), x = xy[0], y = xy[1];
            if (x < w && y < h) order[p++] = y * w + x;
        }
        return { order, segStarts: one() };
    }
    // Z-order (Morton): blockier cousin of Hilbert, with jumps.
    function morton(w, h) {
        let side = 1; while (side < Math.max(w, h)) side *= 2;
        const n = w * h, order = new Int32Array(n), total = side * side;
        let p = 0;
        for (let d = 0; d < total && p < n; d++) {
            let x = 0, y = 0;
            for (let b = 0; (1 << (2 * b)) <= d; b++) { x |= ((d >> (2 * b)) & 1) << b; y |= ((d >> (2 * b + 1)) & 1) << b; }
            if (x < w && y < h) order[p++] = y * w + x;
        }
        return { order, segStarts: one() };
    }

    // ---------------------------------------------------------------- radial paths

    // Spiral out from (cx, cy). pitch = pixels of radius gained per turn (1 = tight rings).
    // Round spiral: order by (r/pitch + θ/2π). Every pixel is visited once; neighbours in time
    // are neighbours on the spiral.
    function spiral(w, h, cx, cy, pitch, inward) {
        const n = w * h, key = new Int32Array(n);
        const Q = 8; // 1/8 px resolution on the key
        let maxK = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = x - cx, dy = y - cy, r = Math.sqrt(dx * dx + dy * dy);
            let th = Math.atan2(dy, dx); if (th < 0) th += 2 * Math.PI;
            const k = Math.round((r / pitch + th / (2 * Math.PI)) * pitch * Q);
            key[y * w + x] = k; if (k > maxK) maxK = k;
        }
        let order = stableSortBy(identity(n), n, key, maxK);
        if (inward) order.reverse();
        return { order, segStarts: one() };
    }
    // Spokes: rays from the centre; each spoke is a segment. count 0 = one spoke per rim pixel.
    function spokes(w, h, cx, cy, count, inward, twist) {
        const n = w * h;
        const rmax = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
        const S = count > 0 ? count : Math.max(8, Math.round(2 * Math.PI * rmax));
        const rk = new Int32Array(n), sk = new Int32Array(n);
        const RQ = 4; let maxR = 0;
        const tw = (twist || 0) * Math.PI / 180;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const dx = x - cx, dy = y - cy, r = Math.sqrt(dx * dx + dy * dy);
            let th = Math.atan2(dy, dx) - tw * r / Math.max(1, rmax); th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const i = y * w + x;
            rk[i] = Math.round(r * RQ); if (rk[i] > maxR) maxR = rk[i];
            sk[i] = Math.min(S - 1, Math.floor(th / (2 * Math.PI) * S));
        }
        if (inward) for (let i = 0; i < n; i++) rk[i] = maxR - rk[i];
        let idx = stableSortBy(identity(n), n, rk, maxR);
        idx = stableSortBy(idx, n, sk, S - 1);
        return { order: idx, segStarts: segsFromGroups(idx, n, (i) => sk[i]) };
    }

    // ---------------------------------------------------------------- distance-based ("contour") path

    // 1D squared-distance transform (Felzenszwalb & Huttenlocher)
    function edt1d(f, n, d, v, z, out) {
        let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
        for (let q = 1; q < n; q++) {
            let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
            while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
            k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
        }
        k = 0;
        for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; out[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    }
    // Squared Euclidean distance from every pixel to the nearest pixel where inside(i) is true.
    function edt2d(w, h, inside) {
        const INF = 1e20, n = w * h, g = new Float64Array(n);
        for (let i = 0; i < n; i++) g[i] = inside(i) ? 0 : INF;
        const m = Math.max(w, h), f = new Float64Array(m), o = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
        for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, null, v, z, o); for (let y = 0; y < h; y++) g[y * w + x] = o[y]; }
        for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, null, v, z, o); for (let x = 0; x < w; x++) g[y * w + x] = o[x]; }
        return g;
    }
    // Time = signed distance from the mask's edge: from deep inside the shapes, out through the edge, into the background.
    // Pixels at the same distance are visited in raster order (stable), or ring by ring around the centre if cx/cy given.
    function contour(w, h, mask, maskThreshold, inward) {
        const n = w * h;
        const isIn = (i) => mask[i] > maskThreshold;
        const dOut = edt2d(w, h, isIn), dIn = edt2d(w, h, (i) => !isIn(i));
        const Q = 4, key = new Int32Array(n); let maxK = 0, minK = Infinity;
        for (let i = 0; i < n; i++) { const d = Math.sqrt(dOut[i]) - Math.sqrt(dIn[i]); const k = Math.round(d * Q); key[i] = k; if (k > maxK) maxK = k; if (k < minK) minK = k; }
        for (let i = 0; i < n; i++) key[i] -= minK;
        let order = stableSortBy(identity(n), n, key, maxK - minK);
        if (inward) order.reverse();
        return { order, segStarts: one() };
    }

    // ---------------------------------------------------------------- public builder (with optional tiling)

    // opts: { path, snake, angle, cx, cy (0..1 of width/height), pitch, spokes, twist, inward, tile, tileSnake, segment }
    // mask: Float32Array(W*H) or null (needed by "contour")
    function build(W, H, o, mask) {
        const seg = o.segment || "path"; // "path" (one continuous signal) | "line" (each line/spoke) | "tile"
        const inner = (w, h, cx, cy) => {
            let r;
            switch (o.path) {
                case "raster": r = raster(w, h, !!o.snake); break;
                case "columns": r = columns(w, h, !!o.snake); break;
                case "angle": r = lines(w, h, o.angle || 0, !!o.snake); break;
                case "hilbert": r = hilbert(w, h); break;
                case "morton": r = morton(w, h); break;
                case "spiral": r = spiral(w, h, cx, cy, Math.max(1, o.pitch || 1), !!o.inward); break;
                case "spokes": r = spokes(w, h, cx, cy, o.spokes || 0, !!o.inward, o.twist || 0); break;
                case "contour": {
                    if (!mask) throw new Error("The Contour path needs a mask (Mask: selection, layer transparency, dark or light pixels).");
                    // mask is for the full image; cut out this tile when tiling
                    const m = (w === W && h === H) ? mask : tileMask(mask, W, w, h, inner.x0, inner.y0);
                    r = contour(w, h, m, 0.5, !!o.inward); break;
                }
                default: r = raster(w, h, false);
            }
            if (seg !== "line") r.segStarts = one();
            return r;
        };
        let res;
        const T = o.tile | 0;
        if (T > 0 && (T < W || T < H)) {
            // tiled: wrap inner so it knows the tile origin (for contour masks)
            const builder = (w, h, cx, cy) => inner(w, h, cx, cy);
            let x0 = 0, y0 = 0;
            const tx = Math.ceil(W / T), ty = Math.ceil(H / T);
            const n = W * H, order = new Int32Array(n), starts = [];
            let p = 0;
            for (let j = 0; j < ty; j++) for (let ii = 0; ii < tx; ii++) {
                const i = (o.tileSnake && (j & 1)) ? tx - 1 - ii : ii;
                x0 = i * T; y0 = j * T; inner.x0 = x0; inner.y0 = y0;
                const w = Math.min(T, W - x0), h = Math.min(T, H - y0);
                const sub = builder(w, h, (o.cx == null ? 0.5 : o.cx) * w, (o.cy == null ? 0.5 : o.cy) * h);
                if (seg === "tile") starts.push(p); else for (let k = 0; k < sub.segStarts.length; k++) starts.push(p + sub.segStarts[k]);
                const so = sub.order;
                for (let k = 0; k < so.length; k++) { const li = so[k]; order[p++] = (y0 + ((li / w) | 0)) * W + (x0 + (li % w)); }
            }
            res = { order, segStarts: seg === "path" ? one() : Int32Array.from(starts) };
        } else {
            inner.x0 = 0; inner.y0 = 0;
            res = inner(W, H, (o.cx == null ? 0.5 : o.cx) * W, (o.cy == null ? 0.5 : o.cy) * H);
        }
        if (o.reverse) {
            // time runs backwards: reverse the order and recompute segment starts
            const n = res.order.length, ord = res.order, ss = res.segStarts;
            ord.reverse();
            if (ss.length > 1) { const ns = new Int32Array(ss.length); ns[0] = 0; for (let k = 1; k < ss.length; k++) ns[k] = n - ss[ss.length - k]; res.segStarts = ns; }
        }
        return res;
    }
    function tileMask(mask, W, w, h, x0, y0) {
        const m = new Float32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = mask[(y0 + y) * W + (x0 + x)];
        return m;
    }

    // Keep only the pixels where keep(i) is true, preserving order and segment structure.
    function filter(path, keep) {
        const ord = path.order, n = ord.length, ss = path.segStarts;
        const out = new Int32Array(n), starts = [];
        let p = 0, s = 0, pendingStart = true;
        for (let i = 0; i < n; i++) {
            while (s < ss.length && ss[s] === i) { pendingStart = true; s++; }
            if (keep(ord[i])) { if (pendingStart) { starts.push(p); pendingStart = false; } out[p++] = ord[i]; }
        }
        return { order: out.subarray(0, p), segStarts: Int32Array.from(starts) };
    }

    const LIST = [
        { id: "raster", name: "Raster (rows)", hint: "Left to right, top to bottom: the databending default. Echoes become horizontal smears that wrap at the line ends." },
        { id: "columns", name: "Columns", hint: "Top to bottom, column by column: vertical smears." },
        { id: "angle", name: "Lines at an angle", hint: "Parallel lines at any angle. Snake makes alternate lines run back." },
        { id: "hilbert", name: "Hilbert curve", hint: "A space-filling curve that keeps neighbours together: echoes become blotches and tendrils rather than streaks. Use Tile to set the scale of the curve." },
        { id: "morton", name: "Z-order (Morton)", hint: "Blocky cousin of the Hilbert curve, with jumps between blocks." },
        { id: "spiral", name: "Spiral", hint: "Winds out from the centre point. Pitch is pixels gained per turn: 1 is tight rings, more is a looser spiral with interleaved rings." },
        { id: "spokes", name: "Spokes", hint: "Rays from the centre point outwards, each ray its own signal. Echoes become sunbursts. Twist bends the rays." },
        { id: "contour", name: "Contour (from the mask)", hint: "Time is distance from the edge of the masked shapes: from inside the letters, out through the edge and into the background. Needs a mask. Echoes radiate off the shapes like contour lines." }
    ];

    return { build, filter, LIST, edt2d };
})();

if (typeof module !== "undefined") module.exports = PX_PATHS;
