// Hexrack — JPEG device: a real baseline JPEG encoder and a damage-tolerant
// decoder, in JS. The picture is encoded, the file is bent (its entropy-coded
// stream and/or its quantisation tables), and the bent file is decoded again
// with libjpeg-like forgiveness: bad Huffman codes read as zero, a stray marker
// ends the data until the next restart marker, and restart markers resync the
// position (or not, which lets the damage slide).

const HX_JPEG = (() => {
    const U = (typeof HX_UTIL !== "undefined") ? HX_UTIL : require("./hx_util.js");
    const { clamp8, Builder, FILLS, fit } = U;

    // ---------------------------------------------------------------- tables
    const ZZ = [0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63];
    const QY = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
    const QC = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];
    const DC_L_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], DC_L_VAL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const DC_C_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], DC_C_VAL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const AC_L_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
    const AC_L_VAL = [0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];
    const AC_C_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
    const AC_C_VAL = [0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];

    // Huffman table from BITS/HUFFVAL: encoder map symbol → [code, len]; decoder maxcode/valptr/mincode per length
    function buildHuff(bits, vals) {
        const enc = new Array(256), mincode = new Int32Array(17), maxcode = new Int32Array(18).fill(-1), valptr = new Int32Array(17);
        let code = 0, k = 0;
        for (let l = 1; l <= 16; l++) {
            valptr[l] = k; mincode[l] = code;
            for (let i = 0; i < bits[l - 1]; i++) { enc[vals[k]] = [code, l]; code++; k++; }
            maxcode[l] = bits[l - 1] ? code - 1 : -1; code <<= 1;
        }
        maxcode[17] = 0x7fffffff;
        return { enc, mincode, maxcode, valptr, vals, bits };
    }

    // cos table for the float DCT
    const COS = new Float32Array(64); for (let x = 0; x < 8; x++) for (let u = 0; u < 8; u++) COS[x * 8 + u] = Math.cos((2 * x + 1) * u * Math.PI / 16) * (u === 0 ? Math.SQRT1_2 : 1);
    function fdct(blk, out) { // blk: 64 floats (level-shifted), out: 64 coefficients, natural order
        const tmp = new Float32Array(64);
        for (let y = 0; y < 8; y++) for (let u = 0; u < 8; u++) { let s = 0; for (let x = 0; x < 8; x++) s += blk[y * 8 + x] * COS[x * 8 + u]; tmp[y * 8 + u] = s / 2; }
        for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) { let s = 0; for (let y = 0; y < 8; y++) s += tmp[y * 8 + u] * COS[y * 8 + v]; out[v * 8 + u] = s / 2; }
    }
    function idct(coef, out) { // coef: 64 dequantised, natural order → out: 64 samples 0..255
        const tmp = new Float32Array(64);
        for (let v = 0; v < 8; v++) for (let x = 0; x < 8; x++) { let s = 0; for (let u = 0; u < 8; u++) s += coef[v * 8 + u] * COS[x * 8 + u]; tmp[v * 8 + x] = s / 2; }
        for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { let s = 0; for (let v = 0; v < 8; v++) s += tmp[v * 8 + x] * COS[y * 8 + v]; out[y * 8 + x] = clamp8(Math.round(s / 2 + 128)); }
    }
    function scaleQ(base, quality) {
        const q = Math.max(1, Math.min(100, quality)), s = q < 50 ? 5000 / q : 200 - q * 2;
        return base.map(v => Math.max(1, Math.min(255, Math.floor((v * s + 50) / 100))));
    }

    // ---------------------------------------------------------------- encoder
    class BitWriter {
        constructor() { this.b = new Builder(1 << 16); this.acc = 0; this.n = 0; }
        write(code, len) { for (let i = len - 1; i >= 0; i--) { this.acc = (this.acc << 1) | ((code >> i) & 1); this.n++; if (this.n === 8) { this.b.push(this.acc); if (this.acc === 0xFF) this.b.push(0); this.acc = 0; this.n = 0; } } }
        flush() { while (this.n) this.write(1, 1); }
        marker(m) { this.flush(); this.b.push(0xFF); this.b.push(m); }
    }
    function category(v) { let a = v < 0 ? -v : v, n = 0; while (a) { n++; a >>= 1; } return n; }
    function bitsOf(v, n) { return v >= 0 ? v : (v + (1 << n) - 1); }

    // opts: { quality, sub: "444"|"422"|"420", restart (MCUs per interval, 0 = none), dqtWrite: [qy, qc] tables to write instead of the ones used }
    function encode(img, opts) {
        const W = img.w, H = img.h, d = img.d;
        const qy = scaleQ(QY, opts.quality), qc = scaleQ(QC, opts.quality);
        const hs = opts.sub === "444" ? 1 : 2, vs = opts.sub === "420" ? 2 : 1;
        const HY = buildHuff(DC_L_BITS, DC_L_VAL), HYA = buildHuff(AC_L_BITS, AC_L_VAL), HC = buildHuff(DC_C_BITS, DC_C_VAL), HCA = buildHuff(AC_C_BITS, AC_C_VAL);
        const out = new Builder(W * H);
        const u16 = (v) => { out.push((v >> 8) & 255); out.push(v & 255); };
        out.push(0xFF); out.push(0xD8);
        // DQT (the tables written may be tampered copies)
        const wq = opts.dqtWrite || [qy, qc];
        for (let t = 0; t < 2; t++) { out.push(0xFF); out.push(0xDB); u16(67); out.push(t); for (let i = 0; i < 64; i++) out.push(wq[t][ZZ[i]]); }
        // SOF0
        out.push(0xFF); out.push(0xC0); u16(17); out.push(8); u16(H); u16(W); out.push(3);
        out.push(1); out.push((hs << 4) | vs); out.push(0); out.push(2); out.push(0x11); out.push(1); out.push(3); out.push(0x11); out.push(1);
        // DHT ×4
        const dht = (cls, id, bits, vals) => { out.push(0xFF); out.push(0xC4); u16(3 + 16 + vals.length); out.push((cls << 4) | id); for (const b of bits) out.push(b); for (const v of vals) out.push(v); };
        dht(0, 0, DC_L_BITS, DC_L_VAL); dht(1, 0, AC_L_BITS, AC_L_VAL); dht(0, 1, DC_C_BITS, DC_C_VAL); dht(1, 1, AC_C_BITS, AC_C_VAL);
        const restart = Math.max(0, opts.restart | 0);
        if (restart) { out.push(0xFF); out.push(0xDD); u16(4); u16(restart); }
        // SOS
        out.push(0xFF); out.push(0xDA); u16(12); out.push(3); out.push(1); out.push(0x00); out.push(2); out.push(0x11); out.push(3); out.push(0x11); out.push(0); out.push(63); out.push(0);
        const scanStart = out.n;

        // planes in YCbCr, chroma downsampled by averaging
        const mw = 8 * hs, mh = 8 * vs, mcusX = Math.ceil(W / mw), mcusY = Math.ceil(H / mh);
        const cw = mcusX * 8, ch = mcusY * 8; // chroma plane dims
        const Y = new Float32Array(mcusX * mw * mcusY * mh), YW = mcusX * mw;
        const Cb = new Float32Array(cw * ch), Cr = new Float32Array(cw * ch), cnt = new Float32Array(cw * ch);
        for (let y = 0; y < mcusY * mh; y++) { const yy = Math.min(H - 1, y); for (let x = 0; x < YW; x++) { const xx = Math.min(W - 1, x), o = (yy * W + xx) * 3, r = d[o], g = d[o + 1], b = d[o + 2];
            Y[y * YW + x] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
            const ci = ((y / vs) | 0) * cw + ((x / hs) | 0); Cb[ci] += -0.168736 * r - 0.331264 * g + 0.5 * b; Cr[ci] += 0.5 * r - 0.418688 * g - 0.081312 * b; cnt[ci]++; } }
        for (let i = 0; i < cw * ch; i++) if (cnt[i]) { Cb[i] /= cnt[i]; Cr[i] /= cnt[i]; }

        const bw = new BitWriter(), blk = new Float32Array(64), coef = new Float32Array(64), q = new Int32Array(64);
        const pred = [0, 0, 0];
        const encodeBlock = (plane, pw, bx, by, qt, hdc, hac, ci) => {
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = plane[(by + y) * pw + bx + x];
            fdct(blk, coef);
            for (let i = 0; i < 64; i++) q[i] = Math.round(coef[ZZ[i]] / qt[ZZ[i]]);
            const diff = q[0] - pred[ci]; pred[ci] = q[0];
            const cat = category(diff); const [c, l] = hdc.enc[cat]; bw.write(c, l); if (cat) bw.write(bitsOf(diff, cat), cat);
            let run = 0;
            for (let k = 1; k < 64; k++) {
                const v = q[k];
                if (v === 0) { run++; continue; }
                while (run > 15) { const [zc, zl] = hac.enc[0xF0]; bw.write(zc, zl); run -= 16; }
                const s = category(v); const [ac, al] = hac.enc[(run << 4) | s]; bw.write(ac, al); bw.write(bitsOf(v, s), s); run = 0;
            }
            if (run) { const [ec, el] = hac.enc[0x00]; bw.write(ec, el); }
        };
        let mcu = 0, rst = 0;
        for (let my = 0; my < mcusY; my++) for (let mx = 0; mx < mcusX; mx++) {
            if (restart && mcu && mcu % restart === 0) { bw.marker(0xD0 + (rst & 7)); rst++; pred[0] = pred[1] = pred[2] = 0; }
            for (let v = 0; v < vs; v++) for (let h = 0; h < hs; h++) encodeBlock(Y, YW, mx * mw + h * 8, my * mh + v * 8, qy, HY, HYA, 0);
            encodeBlock(Cb, cw, mx * 8, my * 8, qc, HC, HCA, 1);
            encodeBlock(Cr, cw, mx * 8, my * 8, qc, HC, HCA, 2);
            mcu++;
        }
        bw.flush();
        const scan = bw.b.bytes();
        out.pushRange(scan, 0, scan.length);
        const scanEnd = out.n;
        out.push(0xFF); out.push(0xD9);
        return { bytes: out.bytes().slice(), scanStart, scanEnd };
    }

    // ---------------------------------------------------------------- decoder
    // opts: { resync: "position" | "none", onFatal: "grey" | "hold" | "source", source: img }
    function decode(bytes, W, H, opts) {
        let pos = 2; // after SOI
        const qt = [null, null, null, null], hts = {};
        let comps = null, restart = 0, scanPos = -1;
        const u16 = (i) => (bytes[i] << 8) | bytes[i + 1];
        while (pos < bytes.length) {
            if (bytes[pos] !== 0xFF) { pos++; continue; }
            const m = bytes[pos + 1]; pos += 2;
            if (m === 0xD8 || (m >= 0xD0 && m <= 0xD7) || m === 0x01 || m === 0xFF) continue;
            const len = u16(pos);
            if (m === 0xDB) { let p = pos + 2; while (p < pos + len) { const id = bytes[p] & 15, prec = bytes[p] >> 4; p++; const t = new Int32Array(64); for (let i = 0; i < 64; i++) { t[ZZ[i]] = prec ? u16(p) : bytes[p]; p += prec ? 2 : 1; } qt[id & 3] = t; } }
            else if (m === 0xC0 || m === 0xC1) { const n = bytes[pos + 7]; comps = []; for (let i = 0; i < n; i++) { const b = pos + 8 + i * 3; comps.push({ id: bytes[b], h: bytes[b + 1] >> 4 || 1, v: bytes[b + 1] & 15 || 1, tq: bytes[b + 2] & 3 }); } }
            else if (m === 0xC4) { let p = pos + 2; while (p < pos + len) { const tc = bytes[p] >> 4, th = bytes[p] & 15; p++; const bits = Array.from(bytes.subarray(p, p + 16)); p += 16; let total = 0; for (const b of bits) total += b; const vals = Array.from(bytes.subarray(p, p + total)); p += total; hts[(tc << 4) | th] = buildHuff(bits, vals); } }
            else if (m === 0xDD) restart = u16(pos + 2);
            else if (m === 0xDA) { const ns = bytes[pos + 2]; for (let i = 0; i < ns; i++) { const cid = bytes[pos + 3 + i * 2], tb = bytes[pos + 4 + i * 2]; const c = comps.find(x => x.id === cid) || comps[i]; c.td = tb >> 4; c.ta = tb & 15; } scanPos = pos + len; break; }
            else if (m === 0xD9) break;
            pos += len;
        }
        if (!comps || scanPos < 0) throw new Error("JPEG header lost");
        for (const c of comps) { c.qt = qt[c.tq] || qt[0] || new Int32Array(64).fill(1); c.hdc = hts[c.td] || hts[0]; c.hac = hts[16 | c.ta] || hts[16]; if (!c.hdc || !c.hac) throw new Error("JPEG Huffman tables lost"); }
        const Hmax = Math.max(...comps.map(c => c.h)), Vmax = Math.max(...comps.map(c => c.v));
        const mw = 8 * Hmax, mh = 8 * Vmax, mcusX = Math.ceil(W / mw), mcusY = Math.ceil(H / mh), total = mcusX * mcusY;
        for (const c of comps) { c.bw = mcusX * c.h; c.bh = mcusY * c.v; c.pw = c.bw * 8; c.plane = new Uint8Array(c.pw * c.bh * 8); c.pred = 0; }

        // bit reader with marker awareness
        let bp = scanPos, acc = 0, nb = 0, markerHit = -1, dead = false;
        const readBit = () => {
            if (nb === 0) {
                if (dead || bp >= bytes.length) { dead = true; return 0; }
                let b = bytes[bp++];
                if (b === 0xFF) {
                    const nx = bytes[bp];
                    if (nx === 0) bp++;
                    else if (nx === 0xFF) { /* fill byte */ }
                    else { markerHit = nx; bp--; dead = true; return 0; }
                }
                acc = b; nb = 8;
            }
            nb--; return (acc >> nb) & 1;
        };
        const receive = (n) => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | readBit(); return v; };
        const extend = (v, n) => n === 0 ? 0 : (v < (1 << (n - 1)) ? v - (1 << n) + 1 : v);
        const decodeSym = (h) => {
            let code = readBit(), l = 1;
            while (l <= 16 && code > h.maxcode[l]) { code = (code << 1) | readBit(); l++; }
            if (l > 16) return 0; // bad code: libjpeg reads it as zero
            const idx = h.valptr[l] + code - h.mincode[l];
            return idx >= 0 && idx < h.vals.length ? h.vals[idx] : 0;
        };
        const coef = new Int32Array(64), deq = new Float32Array(64), pix = new Uint8Array(64);
        let lastGood = -1;
        const decodeBlock = (c, bx, by) => {
            coef.fill(0);
            const t = decodeSym(c.hdc); c.pred += extend(receive(t), t); coef[0] = c.pred;
            for (let k = 1; k < 64;) {
                const rs = decodeSym(c.hac), r = rs >> 4, s = rs & 15;
                if (s === 0) { if (r === 15) { k += 16; continue; } break; }
                k += r; if (k > 63) break;
                coef[ZZ[k]] = extend(receive(s), s); k++;
            }
            for (let i = 0; i < 64; i++) deq[i] = coef[i] * c.qt[i];
            idct(deq, pix);
            const px0 = bx * 8, py0 = by * 8;
            for (let y = 0; y < 8; y++) c.plane.set(pix.subarray(y * 8, y * 8 + 8), (py0 + y) * c.pw + px0);
        };
        // find the next RST marker from bp, consume it; returns true if found
        const seekRST = () => {
            nb = 0; dead = false; markerHit = -1;
            while (bp + 1 < bytes.length) { if (bytes[bp] === 0xFF && bytes[bp + 1] >= 0xD0 && bytes[bp + 1] <= 0xD7) { bp += 2; return true; } if (bytes[bp] === 0xFF && bytes[bp + 1] === 0xD9) return false; bp++; }
            return false;
        };
        let mcu = 0, ended = -1;
        const resyncPos = opts.resync !== "none";
        while (mcu < total) {
            if (restart && mcu && mcu % restart === 0) {
                // expected restart point
                if (!seekRST()) { ended = mcu; break; }
                for (const c of comps) c.pred = 0;
            } else if (dead && markerHit >= 0xD0 && markerHit <= 0xD7 && restart) {
                // a restart marker arrived early (bytes went missing): jump to the interval it belongs to, or carry on from here
                bp += 2; nb = 0; dead = false; markerHit = -1; for (const c of comps) c.pred = 0;
                if (resyncPos) mcu = Math.ceil(mcu / restart) * restart; if (mcu >= total) break;
            } else if (dead) { ended = mcu; break; }
            const mx = mcu % mcusX, my = (mcu / mcusX) | 0;
            for (const c of comps) for (let v = 0; v < c.v; v++) for (let h = 0; h < c.h; h++) decodeBlock(c, mx * c.h + h, my * c.v + v);
            lastGood = mcu; mcu++;
        }
        // colour convert, with the chosen treatment for MCUs never decoded
        const out = new Uint8Array(W * H * 3);
        const [cy, cb, cr] = [comps[0], comps[1] || comps[0], comps[2] || comps[0]];
        const lastRow = ended >= 0 ? ((ended / mcusX) | 0) * mh : H;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const o = (y * W + x) * 3;
            const Yv = cy.plane[((y * cy.v / Vmax) | 0) * cy.pw + ((x * cy.h / Hmax) | 0)];
            const Bv = cb.plane[((y * cb.v / Vmax) | 0) * cb.pw + ((x * cb.h / Hmax) | 0)] - 128;
            const Rv = cr.plane[((y * cr.v / Vmax) | 0) * cr.pw + ((x * cr.h / Hmax) | 0)] - 128;
            out[o] = clamp8(Math.round(Yv + 1.402 * Rv)); out[o + 1] = clamp8(Math.round(Yv - 0.344136 * Bv - 0.714136 * Rv)); out[o + 2] = clamp8(Math.round(Yv + 1.772 * Bv));
        }
        if (ended >= 0) {
            const endMcuX = ended % mcusX, endRowY = ((ended / mcusX) | 0) * mh;
            for (let y = endRowY; y < H; y++) for (let x = 0; x < W; x++) {
                if (y < endRowY + mh && x < endMcuX * mw) continue; // decoded part of the last row
                const o = (y * W + x) * 3;
                if (opts.onFatal === "source" && opts.source) { out[o] = opts.source.d[o]; out[o + 1] = opts.source.d[o + 1]; out[o + 2] = opts.source.d[o + 2]; }
                else if (opts.onFatal === "hold" && endRowY > 0) { const so = ((endRowY - 1) * W + x) * 3; out[o] = out[so]; out[o + 1] = out[so + 1]; out[o + 2] = out[so + 2]; }
                else { out[o] = out[o + 1] = out[o + 2] = 128; }
            }
        }
        return { w: W, h: H, d: out, ended, mcus: total };
    }

    // ---------------------------------------------------------------- the device
    const jpeg = {
        id: "jpeg", name: "JPEG", group: "Codecs",
        hint: "A real JPEG round trip with the file damaged in between. Errors in the entropy-coded data knock the Huffman decoder off its stride, and because each block's brightness is stored as a difference from the last, the damage smears along the scan until the next restart marker. The restart interval sets how far it travels; Resync off lets the whole picture slide. Quant-table edits are header hacks: the picture is decoded with the wrong scale for every frequency.",
        params: [
            { id: "quality", name: "Quality", min: 1, max: 100, step: 1, def: 75 },
            { id: "restart", name: "Restart interval (MCUs, 0 = none)", min: 0, max: 512, step: 1, def: 0, curve: 2 },
            { id: "hits", name: "Damage events per 10 KB", min: 0, max: 200, step: 0.1, def: 2, curve: 2.5 },
            { id: "size", name: "Damage size (bytes)", min: 1, max: 5000, step: 1, def: 1, curve: 3, hint: "Burst, chunk or shift length" },
            { id: "protect", name: "Protect the first (%)", min: 0, max: 100, step: 1, def: 0, hint: "Top of the picture left intact" },
            { id: "qscale", name: "Quant tamper amount", min: 0, max: 8, step: 0.05, def: 2 }
        ],
        options: [
            { id: "damage", name: "Damage", choices: [["flip", "Flip bits"], ["byte", "Replace bytes with noise"], ["zero", "Zero bytes"], ["insert", "Insert noise bytes (shifts the stream)"], ["delete", "Delete bytes (shifts the stream)"], ["dup", "Duplicate chunks"], ["swap", "Swap chunks"], ["none", "No stream damage (header edits only)"]] },
            { id: "dqt", name: "Quant tables", choices: [["honest", "Honest"], ["swap", "Swap luma and chroma tables"], ["lumaUp", "Luma × amount (flat blocks)"], ["lumaDown", "Luma ÷ amount (dark, low-contrast)"], ["chromaUp", "Chroma × amount (colour blocks)"], ["highUp", "Boost high frequencies × amount (ringing, mesh)"], ["highZero", "High frequencies to 1 (speckle)"], ["random", "Random table (seeded)"], ["dcOnly", "Everything but DC huge (pure mosaic)"]] },
            { id: "sub", name: "Chroma subsampling", choices: [["420", "4:2:0"], ["422", "4:2:2"], ["444", "4:4:4"]] },
            { id: "resync", name: "At restart markers", choices: [["position", "Resync the position (libjpeg)"], ["none", "Just reset the predictors (let it slide)"]] },
            { id: "onFatal", name: "After a fatal error", choices: [["grey", "Grey"], ["hold", "Repeat the last good row"], ["source", "Show the source"]] }
        ],
        run(img, p, ctx) {
            const rnd = ctx.rnd;
            const qy = scaleQ(QY, p.quality), qc = scaleQ(QC, p.quality), a = Math.max(0.05, p.qscale);
            let wq = null;
            const mul = (t, f, pred) => t.map((v, i) => Math.max(1, Math.min(255, Math.round(v * (pred ? (pred(i) ? f : 1) : f)))));
            const zzIndex = new Int32Array(64); ZZ.forEach((nat, k) => zzIndex[nat] = k);
            switch (p.dqt) {
                case "swap": wq = [qc, qy]; break;
                case "lumaUp": wq = [mul(qy, a), qc]; break;
                case "lumaDown": wq = [mul(qy, 1 / a), qc]; break;
                case "chromaUp": wq = [qy, mul(qc, a)]; break;
                case "highUp": wq = [mul(qy, a, i => zzIndex[i] > 20), mul(qc, a, i => zzIndex[i] > 20)]; break;
                case "highZero": wq = [qy.map((v, i) => zzIndex[i] > 10 ? 1 : v), qc.map((v, i) => zzIndex[i] > 10 ? 1 : v)]; break;
                case "random": wq = [qy.map(() => 1 + (rnd() * 120 * a / 2 | 0)), qc.map(() => 1 + (rnd() * 120 * a / 2 | 0))]; break;
                case "dcOnly": wq = [qy.map((v, i) => i ? 255 : v), qc.map((v, i) => i ? 255 : v)]; break;
            }
            const enc = encode(img, { quality: p.quality, sub: p.sub, restart: Math.round(p.restart), dqtWrite: wq });
            let bytes = enc.bytes;
            const s0 = enc.scanStart + Math.round((enc.scanEnd - enc.scanStart) * p.protect / 100), s1 = enc.scanEnd;
            const span = s1 - s0, hits = Math.round(span / 10240 * p.hits), B = Math.max(1, Math.round(p.size));
            if (p.damage !== "none" && hits > 0 && span > 8) {
                if (p.damage === "flip" || p.damage === "byte" || p.damage === "zero") {
                    for (let k = 0; k < hits; k++) { const s = s0 + Math.floor(rnd() * span); for (let j = 0; j < B && s + j < s1; j++) { const i = s + j; bytes[i] = p.damage === "flip" ? bytes[i] ^ (1 << (rnd() * 8 | 0)) : (p.damage === "zero" ? 0 : rnd() * 256 | 0); } }
                } else {
                    const cuts = []; for (let k = 0; k < hits; k++) cuts.push(s0 + Math.floor(rnd() * span)); cuts.sort((x, y) => x - y);
                    const b = new Builder(bytes.length + hits * B + 16); b.pushRange(bytes, 0, s0); let i = s0;
                    const tail = new Builder(1024);
                    for (let k = 0; k < cuts.length; k++) {
                        const c = Math.max(i, Math.min(s1, cuts[k])); b.pushRange(bytes, i, c); i = c;
                        if (p.damage === "insert") for (let j = 0; j < B; j++) { let v = rnd() * 256 | 0; if (v === 0xFF) v = 0xFE; b.push(v); }
                        else if (p.damage === "delete") i = Math.min(s1, i + B);
                        else if (p.damage === "dup") { b.pushRange(bytes, c, Math.min(s1, c + B)); }
                        else if (p.damage === "swap") { const o = s0 + Math.floor(rnd() * Math.max(1, span - B)); b.pushRange(bytes, o, Math.min(s1, o + B)); i = Math.min(s1, i + B); }
                    }
                    b.pushRange(bytes, i, bytes.length);
                    bytes = b.bytes();
                }
            }
            let res;
            try { res = decode(bytes, img.w, img.h, { resync: p.resync, onFatal: p.onFatal, source: img }); }
            catch (e) { return { w: img.w, h: img.h, d: Uint8Array.from(img.d) }; }
            return { w: img.w, h: img.h, d: res.d };
        }
    };

    return { LIST: [jpeg], encode, decode };
})();
if (typeof module !== "undefined") module.exports = HX_JPEG;
