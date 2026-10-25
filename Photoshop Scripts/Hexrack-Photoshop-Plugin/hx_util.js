// Hexrack — shared helpers. An image is { w, h, d } with d a Uint8Array of
// w*h*3 interleaved RGB bytes: the "file" every device bends.

const HX_UTIL = (() => {
    function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function clamp8(v) { return v < 0 ? 0 : (v > 255 ? 255 : v | 0); }
    function wrap8(v) { return ((v % 256) + 256) % 256; }
    function mk(w, h) { return { w, h, d: new Uint8Array(w * h * 3) }; }
    function copy(img) { return { w: img.w, h: img.h, d: Uint8Array.from(img.d) }; }

    // Make a byte stream of a different length fit the original length n.
    // fill: "wrap" (read the stream round again), "hold" (repeat the last byte), "zero", "ff", "noise", "source" (take the missing tail from orig)
    function fit(bytes, n, fill, orig, rnd) {
        if (bytes.length === n) return bytes;
        const out = new Uint8Array(n), m = bytes.length;
        if (m >= n) { out.set(bytes.subarray(0, n)); return out; }
        out.set(bytes);
        switch (fill) {
            case "zero": break;
            case "ff": out.fill(255, m); break;
            case "noise": for (let i = m; i < n; i++) out[i] = (rnd ? rnd() : Math.random()) * 256 | 0; break;
            case "hold": out.fill(m ? bytes[m - 1] : 0, m); break;
            case "source": if (orig) out.set(orig.subarray(m, n), m); break;
            default: if (m) for (let i = m; i < n; i++) out[i] = bytes[i % m]; // wrap
        }
        return out;
    }
    const FILLS = [["wrap", "Wrap the stream round"], ["source", "Untouched source bytes"], ["hold", "Repeat the last byte"], ["zero", "Zeros (black)"], ["ff", "0xFF (white)"], ["noise", "Noise"]];

    // A growable byte builder for insert/delete style edits
    function Builder(cap) { this.a = new Uint8Array(Math.max(16, cap | 0)); this.n = 0; }
    Builder.prototype.ensure = function (k) { if (this.n + k > this.a.length) { let c = this.a.length * 2; while (c < this.n + k) c *= 2; const b = new Uint8Array(c); b.set(this.a.subarray(0, this.n)); this.a = b; } };
    Builder.prototype.push = function (v) { if (this.n >= this.a.length) this.ensure(1); this.a[this.n++] = v; };
    Builder.prototype.pushRange = function (src, a, b) { const k = b - a; if (k <= 0) return; this.ensure(k); this.a.set(src.subarray(a, b), this.n); this.n += k; };
    Builder.prototype.bytes = function () { return this.a.subarray(0, this.n); };

    // luma 0..255 of pixel i
    function luma(d, i) { const o = i * 3; return (d[o] * 77 + d[o + 1] * 151 + d[o + 2] * 28) >> 8; }
    function hue(d, i) { const o = i * 3, r = d[o], g = d[o + 1], b = d[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn; if (!c) return 0; let h; if (mx === r) h = ((g - b) / c) % 6; else if (mx === g) h = (b - r) / c + 2; else h = (r - g) / c + 4; return ((h * 60) + 360) % 360; }
    function sat(d, i) { const o = i * 3, mx = Math.max(d[o], d[o + 1], d[o + 2]), mn = Math.min(d[o], d[o + 1], d[o + 2]); return mx ? (mx - mn) * 255 / mx : 0; }

    const CHANNELS = [["all", "Every byte"], ["r", "Red bytes"], ["g", "Green bytes"], ["b", "Blue bytes"]];
    function chanOf(id) { return id === "r" ? 0 : (id === "g" ? 1 : (id === "b" ? 2 : -1)); }

    return { mulberry32, clamp, clamp8, wrap8, mk, copy, fit, FILLS, Builder, luma, hue, sat, CHANNELS, chanOf };
})();
if (typeof module !== "undefined") module.exports = HX_UTIL;
