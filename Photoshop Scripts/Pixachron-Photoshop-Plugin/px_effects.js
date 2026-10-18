// Pixachron — effects: audio-style processors run over the unrolled signal.
// Each effect gets a bipolar Float32Array (−1..1, 0 = mid grey), the segment
// starts (state resets at each), its parameters and a context, and returns a new
// Float32Array of the same length. "Time" parameters are in pixels along the path;
// they are marked time:true so proxy previews and channel spread can scale them.

const PX_EFFECTS = (() => {

    // ---------------------------------------------------------------- helpers

    function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function segBounds(segStarts, k, n) { return [segStarts[k], k + 1 < segStarts.length ? segStarts[k + 1] : n]; }

    function shapeOf(t, shape) {
        t -= Math.floor(t);
        switch (shape) {
            case "triangle": return 1 - 4 * Math.abs(t - 0.5);
            case "saw": return 2 * t - 1;
            case "square": return t < 0.5 ? 1 : -1;
            default: return Math.sin(2 * Math.PI * t);
        }
    }
    // LFO value in −1..1 for sample i. source: "path" (along the signal), "x", "y" (image position), "radius" (from image centre)
    function makeLFO(p, ctx, period, shape, source, phaseDeg) {
        const ph = (phaseDeg || 0) / 360;
        const rnd = mulberry32((ctx.seed || 1) * 7919 + 13);
        let smooth = 0, hold = 0, holdLeft = 0;
        const per = Math.max(2, period);
        const W = ctx.W, H = ctx.H, order = ctx.order, cx = W / 2, cy = H / 2;
        return (i, segPos) => {
            let t;
            if (source === "x") t = (order[i] % W) / per;
            else if (source === "y") t = ((order[i] / W) | 0) / per;
            else if (source === "radius") { const x = order[i] % W, y = (order[i] / W) | 0; t = Math.hypot(x - cx, y - cy) / per; }
            else t = segPos / per;
            t += ph; t -= Math.floor(t);
            switch (shape) {
                case "triangle": return 1 - 4 * Math.abs(t - 0.5);
                case "saw": return 2 * t - 1;
                case "square": return t < 0.5 ? 1 : -1;
                case "random": { // smoothed sample-and-hold noise, one new value per period
                    if (holdLeft <= 0) { hold = rnd() * 2 - 1; holdLeft = per; }
                    holdLeft--; smooth += (hold - smooth) * (2 / per); return clamp(smooth, -1, 1);
                }
                default: return Math.sin(2 * Math.PI * t);
            }
        };
    }
    // Linear-interpolated read of y at fractional position pos (within [a, i]); 0 outside
    function readFrac(y, pos, a) { if (pos < a) return 0; const i0 = Math.floor(pos), f = pos - i0; const v0 = y[i0], v1 = y[i0 + 1]; return v0 + (v1 - v0) * f; }
    // one-pole lowpass coefficient from a period in pixels
    function onePole(period) { return period <= 1 ? 1 : 1 - Math.exp(-2 * Math.PI / period); }

    const SHAPES = [["sine", "Sine"], ["triangle", "Triangle"], ["saw", "Saw"], ["square", "Square"], ["random", "Random (smoothed)"]];
    const SOURCES = [["path", "Along the path"], ["x", "Image X"], ["y", "Image Y"], ["radius", "Distance from image centre"]];

    // ---------------------------------------------------------------- 1. Delay

    const delay = {
        id: "delay", name: "Delay",
        hint: "An echo along the path. Feedback above 1 runs away (clamped, so it saturates rather than explodes). Negative polarity inverts each echo, so colours flip with every repeat. Damping low-passes the feedback path: the echoes get softer each time round.",
        params: [
            { id: "time", name: "Time (px)", min: 1, max: 4000, step: 1, def: 120, time: true },
            { id: "feedback", name: "Feedback", min: 0, max: 1.2, step: 0.01, def: 0.6 },
            { id: "damping", name: "Damping (px)", min: 1, max: 200, step: 1, def: 1, time: true, hint: "1 = none" },
            { id: "taps", name: "Taps", min: 1, max: 8, step: 1, def: 1, hint: "Extra echoes at multiples of the time, without feedback" },
            { id: "spread", name: "Tap spread", min: 0.25, max: 4, step: 0.05, def: 1, hint: "Ratio between successive tap times" }
        ],
        options: [{ id: "polarity", name: "Polarity", choices: [["+", "Positive"], ["-", "Negative (inverting)"], ["alt", "Alternating"]] }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const D = Math.max(1, Math.round(p.time)), fb = p.feedback * (p.polarity === "-" ? -1 : 1), lpc = onePole(p.damping);
            const alt = p.polarity === "alt";
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let lp = 0;
                for (let i = a; i < b; i++) {
                    let v = x[i];
                    // extra taps straight from the input
                    if (p.taps > 1) { let t = D, g = 1; for (let q = 1; q < p.taps; q++) { t = Math.round(t * p.spread); g *= 0.7; const j = i - t; if (j >= a) v += g * x[j]; } }
                    const j = i - D;
                    if (j >= a) { let past = y[j]; if (alt) past = -past; lp += (past - lp) * lpc; v += fb * lp; }
                    y[i] = clamp(v, -1.5, 1.5);
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 2. Flanger / chorus

    const flanger = {
        id: "flanger", name: "Flanger",
        hint: "A short delay whose time is swept by an LFO, mixed with the original. Along the path this makes comb patterns that breathe with the sweep. Long times with low feedback behave like a chorus; set the LFO source to Image X or Y for a sweep that follows the picture rather than the path.",
        params: [
            { id: "time", name: "Centre time (px)", min: 1, max: 1000, step: 1, def: 24, time: true },
            { id: "depth", name: "Depth (px)", min: 0, max: 1000, step: 1, def: 16, time: true },
            { id: "period", name: "LFO period (px)", min: 2, max: 10000, step: 1, def: 400, time: true },
            { id: "feedback", name: "Feedback", min: -0.99, max: 0.99, step: 0.01, def: 0.5 },
            { id: "phase", name: "LFO phase (°)", min: 0, max: 360, step: 1, def: 0 }
        ],
        options: [{ id: "shape", name: "LFO shape", choices: SHAPES }, { id: "source", name: "LFO source", choices: SOURCES }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const lfo = makeLFO(p, ctx, p.period, p.shape, p.source, p.phase);
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                for (let i = a; i < b; i++) {
                    const d = Math.max(0.5, p.time + p.depth * lfo(i, i - a));
                    const pos = i - d;
                    const wet = readFrac(y, pos, a), dry = readFrac(x, pos, a);
                    y[i] = clamp(x[i] + dry + p.feedback * wet, -1.5, 1.5);
                }
            }
            for (let i = 0; i < n; i++) y[i] *= 0.5;
            return y;
        }
    };

    // ---------------------------------------------------------------- 3. Phaser

    const phaser = {
        id: "phaser", name: "Phaser",
        hint: "A chain of all-pass stages swept by an LFO, mixed back with the original: notches that move along the path. On an image this gives rippling bands of tone reversal that follow the sweep.",
        params: [
            { id: "stages", name: "Stages", min: 2, max: 12, step: 2, def: 4 },
            { id: "pmin", name: "Shortest period (px)", min: 2, max: 500, step: 1, def: 4, time: true },
            { id: "pmax", name: "Longest period (px)", min: 2, max: 2000, step: 1, def: 60, time: true },
            { id: "period", name: "LFO period (px)", min: 2, max: 10000, step: 1, def: 600, time: true },
            { id: "feedback", name: "Feedback", min: -0.95, max: 0.95, step: 0.01, def: 0.4 },
            { id: "phase", name: "LFO phase (°)", min: 0, max: 360, step: 1, def: 0 }
        ],
        options: [{ id: "out", name: "Output", choices: [["mix", "Mixed (notches)"], ["wet", "All-passed only (dispersion)"], ["diff", "Difference (what the phaser moved)"]] }, { id: "shape", name: "LFO shape", choices: SHAPES }, { id: "source", name: "LFO source", choices: SOURCES }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n), S = Math.max(2, p.stages | 0);
            const outMode = p.out || "mix";
            const lfo = makeLFO(p, ctx, p.period, p.shape, p.source, p.phase);
            const x1 = new Float32Array(S), y1 = new Float32Array(S);
            const lmin = Math.log(Math.max(2, Math.min(p.pmin, p.pmax))), lmax = Math.log(Math.max(2.01, Math.max(p.pmin, p.pmax)));
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                x1.fill(0); y1.fill(0); let last = 0;
                for (let i = a; i < b; i++) {
                    const per = Math.exp(lmin + (lmax - lmin) * (0.5 + 0.5 * lfo(i, i - a)));
                    const t = Math.tan(Math.PI / per), c = (1 - t) / (1 + t);
                    let v = x[i] + p.feedback * last;
                    for (let s = 0; s < S; s++) { const o = c * (v - y1[s]) + x1[s]; x1[s] = v; y1[s] = o; v = o; }
                    last = clamp(v, -1.5, 1.5);
                    y[i] = outMode === "wet" ? last : (outMode === "diff" ? (last - x[i]) : 0.5 * (x[i] + last));
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 4. Filter (resonant state-variable)

    const filter = {
        id: "filter", name: "Filter",
        hint: "A resonant filter along the path. Cutoff is given as a period in pixels: detail finer than that is cut (low-pass) or kept (high-pass). Resonance near 1 rings, so edges trail with oscillation; add LFO depth for a wah that sweeps along the path.",
        params: [
            { id: "period", name: "Cutoff period (px)", min: 2.1, max: 2000, step: 0.1, def: 12, time: true },
            { id: "res", name: "Resonance", min: 0, max: 1, step: 0.005, def: 0.7 },
            { id: "drive", name: "Drive", min: 0.1, max: 8, step: 0.05, def: 1 },
            { id: "lfoDepth", name: "LFO depth (octaves)", min: 0, max: 6, step: 0.05, def: 0 },
            { id: "lfoPeriod", name: "LFO period (px)", min: 2, max: 10000, step: 1, def: 500, time: true }
        ],
        options: [
            { id: "mode", name: "Mode", choices: [["lp", "Low-pass"], ["hp", "High-pass"], ["bp", "Band-pass"], ["notch", "Notch"], ["peak", "Peak"]] },
            { id: "shape", name: "LFO shape", choices: SHAPES }, { id: "source", name: "LFO source", choices: SOURCES }
        ],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const lfo = p.lfoDepth > 0 ? makeLFO(p, ctx, p.lfoPeriod, p.shape, p.source, 0) : null;
            const k = 2 - 1.98 * clamp(p.res, 0, 1);
            const basePer = Math.max(2.05, p.period);
            for (let s = 0; s < segStarts.length; s++) {
                const [a, b] = segBounds(segStarts, s, n);
                let ic1 = 0, ic2 = 0;
                let g = Math.tan(Math.PI / basePer), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
                for (let i = a; i < b; i++) {
                    if (lfo) { const per = clamp(basePer * Math.pow(2, -p.lfoDepth * lfo(i, i - a) * 0.5), 2.05, 1e5); g = Math.tan(Math.PI / per); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
                    const v0 = x[i] * p.drive;
                    const v3 = v0 - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
                    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
                    let o;
                    switch (p.mode) {
                        case "hp": o = v0 - k * v1 - v2; break;
                        case "bp": o = v1; break;
                        case "notch": o = v0 - k * v1; break;
                        case "peak": o = 2 * v2 - v0 + k * v1; break;
                        default: o = v2;
                    }
                    y[i] = clamp(o, -2, 2);
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 5. Bitcrush

    const bitcrush = {
        id: "bitcrush", name: "Bitcrush",
        hint: "Fewer levels and a lower sample rate, along the path: Hold repeats each sample for a run of pixels, so the smear follows the path's shape (a Hilbert path gives Hilbert-shaped blocks). Bit-flip XORs the quantised value, the classic databending corruption.",
        params: [
            { id: "levels", name: "Levels", min: 2, max: 256, step: 1, def: 6 },
            { id: "hold", name: "Hold (px)", min: 1, max: 512, step: 1, def: 1, time: true },
            { id: "dither", name: "Dither", min: 0, max: 1, step: 0.01, def: 0 },
            { id: "xor", name: "Bit-flip (XOR)", min: 0, max: 255, step: 1, def: 0 },
            { id: "jitter", name: "Hold jitter", min: 0, max: 1, step: 0.01, def: 0, hint: "Randomises each hold length" }
        ],
        options: [{ id: "holdMode", name: "Hold mode", choices: [["sh", "Sample and hold"], ["avg", "Average the run"]] }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n), rnd = mulberry32((ctx.seed || 1) * 31 + 5);
            const L = Math.max(2, p.levels | 0), H = Math.max(1, Math.round(p.hold)), X = p.xor | 0;
            const q = (v) => {
                let u = (clamp(v, -1, 1) + 1) * 0.5; // 0..1
                if (p.dither > 0) u += (rnd() - 0.5) * p.dither / L;
                let lv = Math.round(clamp(u, 0, 1) * (L - 1));
                if (X) lv = (lv ^ X) % L;
                return (lv / (L - 1)) * 2 - 1;
            };
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let i = a;
                while (i < b) {
                    let len = H; if (p.jitter > 0) len = Math.max(1, Math.round(H * (1 + (rnd() * 2 - 1) * p.jitter)));
                    const e = Math.min(b, i + len);
                    let v;
                    if (p.holdMode === "avg") { let s = 0; for (let j = i; j < e; j++) s += x[j]; v = q(s / (e - i)); }
                    else v = q(x[i]);
                    for (let j = i; j < e; j++) y[j] = v;
                    i = e;
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 6. Distortion

    const distortion = {
        id: "distortion", name: "Distortion",
        hint: "Waveshaping with drive. On its own this is like Curves; what makes it path-aware is Pre-emphasis: a high-pass along the path before the clipping, so edges crossing the path distort hardest and flat areas pass. Fold-back wraps overdriven values back, solarising them.",
        params: [
            { id: "drive", name: "Drive", min: 1, max: 40, step: 0.1, def: 4 },
            { id: "bias", name: "Bias", min: -1, max: 1, step: 0.01, def: 0 },
            { id: "pre", name: "Pre-emphasis (px)", min: 1, max: 500, step: 1, def: 1, time: true, hint: "1 = off" },
            { id: "tone", name: "Tone (px)", min: 1, max: 500, step: 1, def: 1, time: true, hint: "Low-pass after: 1 = off" },
            { id: "level", name: "Output level", min: 0, max: 2, step: 0.01, def: 0.8 }
        ],
        options: [{ id: "type", name: "Type", choices: [["soft", "Soft clip (tanh)"], ["hard", "Hard clip"], ["fold", "Fold-back"], ["tube", "Asymmetric (tube-ish)"], ["rect", "Rectify"], ["sine", "Sine shaper"]] }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const hpc = onePole(p.pre), lpc = onePole(p.tone);
            const shape = (v) => {
                switch (p.type) {
                    case "hard": return clamp(v, -1, 1);
                    case "fold": { let u = (v + 1) * 0.5; u = u - 2 * Math.floor(u / 2); if (u > 1) u = 2 - u; return u * 2 - 1; }
                    case "tube": return v >= 0 ? Math.tanh(v) : Math.tanh(v * 0.5) * 2 * 0.5 + (Math.tanh(v) - Math.tanh(v * 0.5)) * 0.2;
                    case "rect": return Math.abs(v) * 2 - 1;
                    case "sine": return Math.sin(v * Math.PI * 0.5);
                    default: return Math.tanh(v);
                }
            };
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let lpState = 0, outLp = 0, first = true;
                for (let i = a; i < b; i++) {
                    let v = x[i];
                    let low = 0;
                    if (p.pre > 1) { if (first) { lpState = v; first = false; } lpState += (v - lpState) * hpc; low = lpState; v = v - low; }
                    v = shape(v * p.drive + p.bias) * p.level + low; // the slow level passes; only the changes are driven
                    if (p.tone > 1) { outLp += (v - outLp) * lpc; v = outLp; }
                    y[i] = clamp(v, -1.5, 1.5);
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 7. Ring modulator / tremolo

    const ringmod = {
        id: "ringmod", name: "Ring mod / tremolo",
        hint: "Multiplies the signal by an oscillator. Ring mode flips the tones every half cycle (a square wave inverts the image in stripes); tremolo fades them; Add lays the oscillator over the picture. With a Hilbert or spiral path the stripes take the path's shape.",
        params: [
            { id: "period", name: "Carrier period (px)", min: 2, max: 5000, step: 1, def: 40, time: true },
            { id: "depth", name: "Depth", min: 0, max: 1, step: 0.01, def: 1 },
            { id: "phase", name: "Phase (°)", min: 0, max: 360, step: 1, def: 0 },
            { id: "fm", name: "Period drift", min: 0, max: 1, step: 0.01, def: 0, hint: "Slowly varies the period along the path" }
        ],
        options: [{ id: "mode", name: "Mode", choices: [["ring", "Ring (multiply)"], ["trem", "Tremolo"], ["add", "Add"]] }, { id: "shape", name: "Shape", choices: SHAPES }, { id: "source", name: "Source", choices: SOURCES }],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const lfo = makeLFO(p, ctx, p.period, p.shape, p.source, p.phase);
            const drift = p.fm > 0 ? makeLFO(p, ctx, p.period * 23, "random", "path", 0) : null;
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let t = 0;
                for (let i = a; i < b; i++) {
                    let c;
                    if (drift && p.source === "path") { t += 1 / (p.period * (1 + p.fm * drift(i, i - a))); c = shapeOf(t + p.phase / 360, p.shape === "random" ? "sine" : p.shape); }
                    else c = lfo(i, i - a);
                    const v = x[i];
                    let o;
                    if (p.mode === "trem") o = v * (1 - p.depth * (0.5 - 0.5 * c));
                    else if (p.mode === "add") o = v + p.depth * c;
                    else o = v * (1 - p.depth + p.depth * c);
                    y[i] = clamp(o, -1.5, 1.5);
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 8. Reverb (Schroeder / Freeverb-style)

    const reverb = {
        id: "reverb", name: "Reverb",
        hint: "Parallel feedback combs into series all-passes, as in a classic digital reverb, run along the path. Size scales all the delay lengths; the result is a diffuse, grainy tail trailing behind every edge in the path's direction.",
        params: [
            { id: "size", name: "Size (px)", min: 4, max: 4000, step: 1, def: 300, time: true },
            { id: "decay", name: "Decay", min: 0, max: 0.995, step: 0.005, def: 0.85 },
            { id: "damp", name: "Damping", min: 0, max: 1, step: 0.01, def: 0.3 },
            { id: "diffuse", name: "Diffusion", min: 0, max: 0.9, step: 0.01, def: 0.5 },
            { id: "predelay", name: "Pre-delay (px)", min: 0, max: 2000, step: 1, def: 0, time: true }
        ],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const base = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apb = [556, 441, 341, 225];
            const sc = Math.max(4, p.size) / 1557;
            const combLen = base.map(v => Math.max(2, Math.round(v * sc))), apLen = apb.map(v => Math.max(2, Math.round(v * sc)));
            const combs = combLen.map(L => new Float32Array(L)), combLp = new Float32Array(8), aps = apLen.map(L => new Float32Array(L));
            const pd = Math.round(p.predelay);
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                for (const c of combs) c.fill(0); for (const c of aps) c.fill(0); combLp.fill(0);
                for (let i = a; i < b; i++) {
                    const src = i - pd >= a ? x[i - pd] : 0;
                    let acc = 0;
                    for (let c = 0; c < 8; c++) {
                        const buf = combs[c], L = buf.length, pos = (i - a) % L;
                        const out = buf[pos];
                        combLp[c] = out * (1 - p.damp) + combLp[c] * p.damp;
                        buf[pos] = src + combLp[c] * p.decay;
                        acc += out;
                    }
                    acc *= 0.125;
                    for (let c = 0; c < 4; c++) {
                        const buf = aps[c], L = buf.length, pos = (i - a) % L;
                        const bufout = buf[pos];
                        const o = -acc + bufout;
                        buf[pos] = acc + bufout * p.diffuse;
                        acc = o;
                    }
                    y[i] = clamp(acc, -1.5, 1.5);
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 9. Granular

    const granular = {
        id: "granular", name: "Granular",
        hint: "Cuts the signal into grains and re-lays them: reversed, repeated (stutter), shifted (scatter) or resampled (pitch, which stretches or squashes the picture along the path). Grains follow the path, so on a spiral they are arcs and on a Hilbert curve they are blobs.",
        params: [
            { id: "grain", name: "Grain (px)", min: 2, max: 4000, step: 1, def: 200, time: true },
            { id: "reverse", name: "Reverse chance", min: 0, max: 1, step: 0.01, def: 0.5 },
            { id: "repeat", name: "Repeat", min: 1, max: 16, step: 1, def: 1, hint: "Each grain played this many times (stutter)" },
            { id: "scatter", name: "Scatter (px)", min: 0, max: 4000, step: 1, def: 0, time: true, hint: "Grains read from a random offset up to this" },
            { id: "pitch", name: "Pitch", min: 0.25, max: 4, step: 0.01, def: 1, hint: "2 reads twice as fast (squashes), 0.5 stretches" },
            { id: "sizeJitter", name: "Size jitter", min: 0, max: 1, step: 0.01, def: 0 }
        ],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n), rnd = mulberry32((ctx.seed || 1) * 97 + 3);
            const G = Math.max(2, Math.round(p.grain)), R = Math.max(1, p.repeat | 0);
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let out = a;
                while (out < b) {
                    let g = G; if (p.sizeJitter > 0) g = Math.max(2, Math.round(G * (1 + (rnd() * 2 - 1) * p.sizeJitter)));
                    const rev = rnd() < p.reverse;
                    let srcStart = out + (p.scatter > 0 ? Math.round((rnd() * 2 - 1) * p.scatter) : 0);
                    srcStart = clamp(srcStart, a, Math.max(a, b - 1));
                    const spanRead = g * p.pitch;
                    for (let r = 0; r < R && out < b; r++) {
                        for (let j = 0; j < g && out < b; j++) {
                            const u = rev ? (g - 1 - j) : j;
                            const pos = srcStart + u * p.pitch;
                            let v;
                            if (pos >= b - 1 || pos < a) v = x[clamp(Math.round(pos), a, b - 1)];
                            else { const i0 = Math.floor(pos), f = pos - i0; v = x[i0] + (x[i0 + 1] - x[i0]) * f; }
                            y[out++] = v;
                        }
                    }
                    void spanRead;
                }
            }
            return y;
        }
    };

    // ---------------------------------------------------------------- 10. Compressor / expander (envelope along the path)

    const compressor = {
        id: "compressor", name: "Compressor",
        hint: "An envelope follower along the path drives gain: contrast above the threshold is squashed (or, with a ratio below 1, expanded). Attack and release are in pixels, so the gain lags behind edges in the path's direction, leaving haloes and shadows that point the way time runs.",
        params: [
            { id: "threshold", name: "Threshold", min: 0, max: 1, step: 0.01, def: 0.3 },
            { id: "ratio", name: "Ratio", min: 0.1, max: 20, step: 0.1, def: 4, hint: "Below 1 expands" },
            { id: "attack", name: "Attack (px)", min: 1, max: 2000, step: 1, def: 20, time: true },
            { id: "release", name: "Release (px)", min: 1, max: 4000, step: 1, def: 200, time: true },
            { id: "makeup", name: "Make-up gain", min: 0.5, max: 8, step: 0.05, def: 1.5 }
        ],
        run(x, segStarts, p, ctx) {
            const n = x.length, y = new Float32Array(n);
            const ac = onePole(p.attack), rc = onePole(p.release);
            for (let k = 0; k < segStarts.length; k++) {
                const [a, b] = segBounds(segStarts, k, n);
                let env = 0;
                for (let i = a; i < b; i++) {
                    const v = x[i], m = Math.abs(v);
                    env += (m - env) * (m > env ? ac : rc);
                    let gain = 1;
                    if (env > p.threshold) { const over = env - p.threshold; const target = p.threshold + over / p.ratio; gain = target / env; }
                    y[i] = clamp(v * gain * p.makeup, -1.5, 1.5);
                }
            }
            return y;
        }
    };

    const LIST = [delay, flanger, phaser, filter, bitcrush, distortion, ringmod, reverb, granular, compressor];
    const byId = {}; for (const e of LIST) byId[e.id] = e;

    function defaults(e) { const p = {}; for (const q of e.params) p[q.id] = q.def; for (const o of (e.options || [])) p[o.id] = o.choices[0][0]; return p; }

    return { LIST, byId, defaults, mulberry32 };
})();

if (typeof module !== "undefined") module.exports = PX_EFFECTS;
