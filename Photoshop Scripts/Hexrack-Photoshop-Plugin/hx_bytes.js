// Hexrack — byte-domain devices: the hex-editor family, the text-editor
// accidents, wrong-header reinterpretation and the Audacity import trick.
//
// A device is { id, name, group, hint, params, options, run(img, p, ctx) } and
// returns a new image of the same size. Parameter flags: time:true marks pixel
// distances (scaled linearly for proxy previews); area:true marks counts over the
// whole byte stream (scaled by the proxy's area).

const HX_BYTES = (() => {
    const U = (typeof HX_UTIL !== "undefined") ? HX_UTIL : require("./hx_util.js");
    const { clamp, clamp8, wrap8, fit, FILLS, Builder, chanOf, CHANNELS } = U;
    const px = (p, img) => Math.round(p) * 3; // pixels → bytes

    // ---------------------------------------------------------------- Shift
    const shift = {
        id: "shift", name: "Shift", group: "Hex",
        hint: "Slides the whole byte stream along, as if bytes were cut from the start of the file. Whole pixels move the picture sideways and wrap the overflow onto the next row; whole rows move it down; the odd byte or two rotates the colour channels, which is the classic databent colour cast.",
        params: [
            { id: "pixels", name: "Shift (px)", min: -4096, max: 4096, step: 1, def: 13, time: true, curve: 2.5 },
            { id: "rows", name: "Shift (rows)", min: -1000, max: 1000, step: 1, def: 0, time: true, curve: 2.5 },
            { id: "bytes", name: "Extra bytes", min: -2, max: 2, step: 1, def: 1, hint: "1 or 2 rotates the colour channels" }
        ],
        options: [{ id: "fill", name: "Fill the gap with", choices: FILLS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, out = new Uint8Array(n);
            const s = px(p.pixels) + Math.round(p.rows) * img.w * 3 + Math.round(p.bytes);
            if (p.fill === "wrap") { for (let i = 0; i < n; i++) out[i] = d[(((i - s) % n) + n) % n]; return { w: img.w, h: img.h, d: out }; }
            const rnd = ctx.rnd;
            for (let i = 0; i < n; i++) {
                const j = i - s;
                if (j >= 0 && j < n) out[i] = d[j];
                else out[i] = p.fill === "zero" ? 0 : (p.fill === "ff" ? 255 : (p.fill === "noise" ? rnd() * 256 | 0 : (p.fill === "hold" ? d[j < 0 ? 0 : n - 1] : d[i])));
            }
            return { w: img.w, h: img.h, d: out };
        }
    };

    // ---------------------------------------------------------------- Cut & paste
    const cutpaste = {
        id: "cutpaste", name: "Cut & paste", group: "Hex",
        hint: "Selects a block of the file and moves, copies or pastes it somewhere else, the way you would in a hex editor. Moving a block shifts everything in between; inserting a copy pushes the rest of the picture down and the end falls off the bottom. More than one block picks random places (seeded).",
        params: [
            { id: "from", name: "Block starts at (%)", min: 0, max: 100, step: 0.1, def: 30 },
            { id: "length", name: "Block length (%)", min: 0.01, max: 50, step: 0.01, def: 4, curve: 2 },
            { id: "to", name: "Paste at (%)", min: 0, max: 100, step: 0.1, def: 60 },
            { id: "count", name: "Blocks", min: 1, max: 64, step: 1, def: 1, hint: "More than one: random positions" }
        ],
        options: [{ id: "mode", name: "Edit", choices: [["move", "Cut and paste (move the block)"], ["insert", "Copy and insert (grows the file)"], ["over", "Copy and overwrite"], ["swap", "Swap the two blocks"], ["delete", "Delete the block (shrinks the file)"]] }, { id: "fill", name: "Fill the end with", choices: FILLS }],
        run(img, p, ctx) {
            const n = img.d.length, rnd = ctx.rnd;
            let cur = img.d;
            for (let k = 0; k < p.count; k++) {
                const L = Math.max(3, Math.round(n * p.length / 100 / 3) * 3);
                let a = p.count > 1 ? Math.floor(rnd() * (n - L)) : Math.round(n * p.from / 100 / 3) * 3;
                let b = p.count > 1 ? Math.floor(rnd() * (n - L)) : Math.round(n * p.to / 100 / 3) * 3;
                a = clamp(a, 0, Math.max(0, n - L)); b = clamp(b, 0, Math.max(0, n - L));
                const blk = cur.slice(a, a + L), bld = new Builder(n + L);
                if (p.mode === "move") {
                    const rest = new Builder(n); rest.pushRange(cur, 0, a); rest.pushRange(cur, a + L, n);
                    const r = rest.bytes(), bb = Math.min(b, r.length);
                    bld.pushRange(r, 0, bb); bld.pushRange(blk, 0, L); bld.pushRange(r, bb, r.length);
                } else if (p.mode === "insert") { bld.pushRange(cur, 0, b); bld.pushRange(blk, 0, L); bld.pushRange(cur, b, n); }
                else if (p.mode === "delete") { bld.pushRange(cur, 0, a); bld.pushRange(cur, a + L, n); }
                else if (p.mode === "swap") { const o = Uint8Array.from(cur); const blkB = cur.slice(b, b + L); o.set(blkB, a); o.set(blk, b); bld.pushRange(o, 0, n); }
                else { const o = Uint8Array.from(cur); o.set(blk.subarray(0, Math.min(L, n - b)), b); bld.pushRange(o, 0, n); }
                cur = fit(bld.bytes(), n, p.fill, img.d, rnd);
            }
            return { w: img.w, h: img.h, d: cur };
        }
    };

    // ---------------------------------------------------------------- Find & replace
    const findreplace = {
        id: "findreplace", name: "Find & replace", group: "Hex",
        hint: "The hex editor's search-and-replace: every byte near the Find value becomes the Replace value. Tolerance widens the match; probability thins it. Swap exchanges the two values both ways. Delete and Insert change the file's length, so the picture skews a little at every match.",
        params: [
            { id: "find", name: "Find byte", min: 0, max: 255, step: 1, def: 128 },
            { id: "tol", name: "Tolerance (±)", min: 0, max: 128, step: 1, def: 12 },
            { id: "repl", name: "Replace with", min: 0, max: 255, step: 1, def: 255 },
            { id: "prob", name: "Probability (%)", min: 0, max: 100, step: 1, def: 100 }
        ],
        options: [{ id: "mode", name: "Action", choices: [["replace", "Replace"], ["swap", "Swap find and replace"], ["add", "Add replace value (mod 256)"], ["xor", "XOR with replace value"], ["delete", "Delete matching bytes"], ["insert", "Insert replace value after each match"], ["dup", "Duplicate matching bytes"]] }, { id: "chan", name: "Look in", choices: CHANNELS }, { id: "fill", name: "Fill the end with", choices: FILLS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, rnd = ctx.rnd, ch = chanOf(p.chan), pr = p.prob / 100, lo = p.find - p.tol, hi = p.find + p.tol, rlo = p.repl - p.tol, rhi = p.repl + p.tol;
            const grows = p.mode === "delete" || p.mode === "insert" || p.mode === "dup";
            const bld = grows ? new Builder(n + (n >> 2)) : null, out = grows ? null : Uint8Array.from(d);
            for (let i = 0; i < n; i++) {
                const v = d[i], ok = (ch < 0 || i % 3 === ch) && (pr >= 1 || rnd() < pr);
                const m = ok && v >= lo && v <= hi;
                if (!grows) {
                    if (m) out[i] = p.mode === "add" ? wrap8(v + p.repl) : (p.mode === "xor" ? v ^ p.repl : p.repl);
                    else if (p.mode === "swap" && ok && v >= rlo && v <= rhi) out[i] = p.find;
                } else {
                    if (m && p.mode === "delete") continue;
                    bld.push(v);
                    if (m) bld.push(p.mode === "dup" ? v : p.repl);
                }
            }
            return { w: img.w, h: img.h, d: grows ? fit(bld.bytes(), n, p.fill, d, rnd) : out };
        }
    };

    // ---------------------------------------------------------------- Insert & delete
    const insdel = {
        id: "insdel", name: "Insert & delete", group: "Hex",
        hint: "Adds or removes a few bytes at regular intervals through the file. Each edit shifts everything after it, so the picture shears progressively: a staircase if the interval is regular, a drunken one with jitter. One byte at a time cycles the colour channels as it goes.",
        params: [
            { id: "every", name: "Every (px)", min: 1, max: 100000, step: 1, def: 3000, time: true, curve: 2.5 },
            { id: "jitter", name: "Jitter (%)", min: 0, max: 100, step: 1, def: 0 },
            { id: "count", name: "Bytes per edit", min: 1, max: 3000, step: 1, def: 1, curve: 2 },
            { id: "value", name: "Fixed value", min: 0, max: 255, step: 1, def: 0 }
        ],
        options: [{ id: "mode", name: "Edit", choices: [["insert", "Insert"], ["delete", "Delete"], ["alt", "Alternate insert / delete"]] }, { id: "what", name: "Inserted bytes", choices: [["prev", "Repeat the previous bytes"], ["fixed", "Fixed value"], ["random", "Random"], ["zero", "Zeros"]] }, { id: "fill", name: "Fill the end with", choices: FILLS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, rnd = ctx.rnd, bld = new Builder(n + (n >> 1));
            const every = Math.max(1, px(p.every)), cnt = Math.max(1, Math.round(p.count));
            let next = Math.round(every * (1 + (rnd() - 0.5) * 2 * p.jitter / 100)), k = 0, i = 0;
            while (i < n) {
                const stop = Math.min(n, i + Math.max(1, next));
                bld.pushRange(d, i, stop); i = stop;
                if (i >= n) break;
                const del = p.mode === "delete" || (p.mode === "alt" && (k & 1));
                if (del) i = Math.min(n, i + cnt);
                else for (let j = 0; j < cnt; j++) bld.push(p.what === "fixed" ? p.value : (p.what === "random" ? rnd() * 256 | 0 : (p.what === "zero" ? 0 : d[Math.max(0, i - cnt + j)])));
                k++; next = Math.round(every * (1 + (rnd() - 0.5) * 2 * p.jitter / 100));
            }
            return { w: img.w, h: img.h, d: fit(bld.bytes(), n, p.fill, d, rnd) };
        }
    };

    // ---------------------------------------------------------------- Bit ops
    const bitops = {
        id: "bitops", name: "Bit ops", group: "Hex",
        hint: "Bitwise arithmetic on every byte (or a random share of them). XOR 0x80 inverts the top bit so mid-tones flip; AND 0xF0 posterises; rotating the bits turns smooth gradients into sawtooth bands; swapping nibbles scrambles tone while keeping texture.",
        params: [
            { id: "mask", name: "Mask / value", min: 0, max: 255, step: 1, def: 128 },
            { id: "bit", name: "Bit (for single-bit ops)", min: 0, max: 7, step: 1, def: 7 },
            { id: "prob", name: "Probability (%)", min: 0, max: 100, step: 1, def: 100 }
        ],
        options: [{ id: "op", name: "Operation", choices: [["xor", "XOR mask"], ["and", "AND mask"], ["or", "OR mask"], ["add", "Add value (wraps)"], ["sub", "Subtract value (wraps)"], ["rol", "Rotate bits left by Bit"], ["ror", "Rotate bits right by Bit"], ["swap", "Swap nibbles"], ["rev", "Reverse the bits"], ["flip", "Flip one bit"], ["set", "Set one bit"], ["clear", "Clear one bit"], ["not", "Invert (NOT)"]] }, { id: "chan", name: "Apply to", choices: CHANNELS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, out = Uint8Array.from(d), rnd = ctx.rnd, ch = chanOf(p.chan), pr = p.prob / 100, m = p.mask | 0, b = p.bit | 0;
            const f = (v) => {
                switch (p.op) {
                    case "xor": return v ^ m; case "and": return v & m; case "or": return v | m;
                    case "add": return (v + m) & 255; case "sub": return (v - m) & 255;
                    case "rol": return ((v << b) | (v >> (8 - b))) & 255; case "ror": return ((v >> b) | (v << (8 - b))) & 255;
                    case "swap": return ((v << 4) | (v >> 4)) & 255;
                    case "rev": { let r = 0; for (let k = 0; k < 8; k++) r |= ((v >> k) & 1) << (7 - k); return r; }
                    case "flip": return v ^ (1 << b); case "set": return v | (1 << b); case "clear": return v & ~(1 << b) & 255;
                    default: return 255 - v;
                }
            };
            for (let i = 0; i < n; i++) if ((ch < 0 || i % 3 === ch) && (pr >= 1 || rnd() < pr)) out[i] = f(d[i]);
            return { w: img.w, h: img.h, d: out };
        }
    };

    // ---------------------------------------------------------------- Stutter
    const stutter = {
        id: "stutter", name: "Stutter", group: "Hex",
        hint: "A stuck buffer: at random places a run of bytes is repeated over and over. Overwriting holds a strip of the picture; inserting pushes the rest of the file along by the repeats, so every stutter also skews what follows.",
        params: [
            { id: "count", name: "Stutters", min: 1, max: 500, step: 1, def: 12, area: true, curve: 2 },
            { id: "length", name: "Run length (px)", min: 1, max: 20000, step: 1, def: 300, time: true, curve: 2.5 },
            { id: "times", name: "Repeats", min: 1, max: 64, step: 1, def: 4 },
            { id: "decay", name: "Shrink each repeat (%)", min: 0, max: 90, step: 1, def: 0 }
        ],
        options: [{ id: "mode", name: "Edit", choices: [["over", "Overwrite what follows"], ["insert", "Insert (grows the file)"]] }, { id: "fill", name: "Fill the end with", choices: FILLS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, rnd = ctx.rnd;
            const starts = []; for (let k = 0; k < p.count; k++) starts.push(Math.floor(rnd() * n / 3) * 3); starts.sort((a, b) => a - b);
            const L0 = Math.max(3, px(p.length));
            if (p.mode === "over") {
                const out = Uint8Array.from(d);
                for (const s of starts) { let pos = s + L0, L = L0; for (let t = 0; t < p.times && pos < n; t++) { const k = Math.min(L, n - pos); out.set(d.subarray(s, s + k), pos); pos += k; L = Math.max(3, Math.round(L * (1 - p.decay / 100) / 3) * 3); } }
                return { w: img.w, h: img.h, d: out };
            }
            const bld = new Builder(n * 2); let i = 0;
            for (const s of starts) { if (s < i) continue; bld.pushRange(d, i, Math.min(n, s + L0)); i = Math.min(n, s + L0); let L = L0; for (let t = 0; t < p.times; t++) { bld.pushRange(d, s, Math.min(n, s + L)); L = Math.max(3, Math.round(L * (1 - p.decay / 100) / 3) * 3); } }
            bld.pushRange(d, i, n);
            return { w: img.w, h: img.h, d: fit(bld.bytes(), n, p.fill, d, rnd) };
        }
    };

    // ---------------------------------------------------------------- Bit rot
    const bitrot = {
        id: "bitrot", name: "Bit rot", group: "Hex",
        hint: "Random damage to the bytes themselves, as a failing disk or a bad download would leave it: single flipped bits, bytes replaced by noise, or bursts of zeros. Nothing moves; the picture just decays in place.",
        params: [
            { id: "density", name: "Damaged bytes per 10,000", min: 0.1, max: 10000, step: 0.1, def: 20, curve: 3 },
            { id: "burst", name: "Burst length (bytes)", min: 1, max: 3000, step: 1, def: 1, curve: 2.5 }
        ],
        options: [{ id: "kind", name: "Damage", choices: [["flip", "Flip a random bit"], ["noise", "Replace with noise"], ["zero", "Zeros"], ["ff", "0xFF"], ["hold", "Repeat the previous byte"], ["inv", "Invert"]] }, { id: "chan", name: "Apply to", choices: CHANNELS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, out = Uint8Array.from(d), rnd = ctx.rnd, ch = chanOf(p.chan);
            const hits = Math.round(n * p.density / 10000 / Math.max(1, p.burst)), B = Math.max(1, Math.round(p.burst));
            for (let k = 0; k < hits; k++) {
                const s = Math.floor(rnd() * n);
                for (let j = 0; j < B && s + j < n; j++) {
                    const i = s + j; if (ch >= 0 && i % 3 !== ch) continue;
                    switch (p.kind) {
                        case "flip": out[i] = d[i] ^ (1 << (rnd() * 8 | 0)); break;
                        case "noise": out[i] = rnd() * 256 | 0; break;
                        case "zero": out[i] = 0; break; case "ff": out[i] = 255; break;
                        case "hold": out[i] = out[s > 0 ? s - 1 : 0]; break;
                        default: out[i] = 255 - d[i];
                    }
                }
            }
            return { w: img.w, h: img.h, d: out };
        }
    };

    // ---------------------------------------------------------------- Text editor
    const texted = {
        id: "texted", name: "Text editor", group: "Text editor",
        hint: "What happens when an image file is opened and re-saved in a program that thinks it is text. WordPad turns every line feed (0x0A) into carriage-return + line-feed, so the picture skews a little at every 10 it meets; a UTF-8 conversion doubles every byte over 127, which stretches and smears the brighter half of the picture; trimming deletes 'spaces' before each 'line end'.",
        params: [
            { id: "prob", name: "Probability (%)", min: 0, max: 100, step: 1, def: 100, hint: "How many of the matching bytes get the treatment" },
            { id: "tab", name: "Tab width / run length", min: 1, max: 64, step: 1, def: 4 }
        ],
        options: [{ id: "accident", name: "Accident", choices: [
            ["crlf", "WordPad: 0A → 0D 0A"], ["crlf2", "Windows: 0A → 0D 0A and 0D → 0D 0A"], ["lf", "Unix: 0D 0A → 0A, 0D → 0A"], ["cr", "Classic Mac: 0A → 0D"],
            ["tabs", "Expand tabs: 09 → spaces"], ["untabs", "Spaces → tabs (runs of 20 → 09)"],
            ["utf8", "Latin-1 → UTF-8 (bytes ≥ 80 become two)"], ["utf8dec", "UTF-8 → Latin-1 (pairs shrink, bad bytes → EF BF BD)"],
            ["trim", "Trim trailing whitespace before each 0A"], ["nulls", "Collapse runs of 00"], ["ascii", "Strip to 7-bit ASCII"], ["upper", "UPPERCASE the letters (61–7A → 41–5A)"], ["lower", "lowercase the letters"], ["bom", "Add a UTF-8 BOM (EF BB BF) at the start"]
        ] }, { id: "fill", name: "Fill the end with", choices: FILLS }],
        run(img, p, ctx) {
            const d = img.d, n = d.length, rnd = ctx.rnd, pr = p.prob / 100, hit = () => pr >= 1 || rnd() < pr, T = Math.max(1, p.tab | 0);
            const bld = new Builder(n + (n >> 1));
            const acc = p.accident;
            if (acc === "bom") { bld.push(0xEF); bld.push(0xBB); bld.push(0xBF); bld.pushRange(d, 0, n); }
            else for (let i = 0; i < n; i++) {
                const v = d[i];
                switch (acc) {
                    case "crlf": if (v === 0x0A && hit()) bld.push(0x0D); bld.push(v); break;
                    case "crlf2": if ((v === 0x0A || v === 0x0D) && hit()) { bld.push(0x0D); bld.push(0x0A); } else bld.push(v); break;
                    case "lf": if (v === 0x0D && hit()) { bld.push(0x0A); if (i + 1 < n && d[i + 1] === 0x0A) i++; } else bld.push(v); break;
                    case "cr": bld.push(v === 0x0A && hit() ? 0x0D : v); break;
                    case "tabs": if (v === 0x09 && hit()) for (let k = 0; k < T; k++) bld.push(0x20); else bld.push(v); break;
                    case "untabs": if (v === 0x20 && hit()) { let k = 0; while (i + k < n && d[i + k] === 0x20) k++; if (k >= T) { for (let q = 0; q < Math.floor(k / T); q++) bld.push(0x09); for (let q = 0; q < k % T; q++) bld.push(0x20); i += k - 1; } else bld.push(v); } else bld.push(v); break;
                    case "utf8": if (v >= 0x80 && hit()) { bld.push(0xC0 | (v >> 6)); bld.push(0x80 | (v & 0x3F)); } else bld.push(v); break;
                    case "utf8dec":
                        if (v < 0x80 || !hit()) bld.push(v);
                        else if ((v === 0xC2 || v === 0xC3) && i + 1 < n && (d[i + 1] & 0xC0) === 0x80) { bld.push(((v & 0x1F) << 6) | (d[i + 1] & 0x3F)); i++; }
                        else { bld.push(0xEF); bld.push(0xBF); bld.push(0xBD); }
                        break;
                    case "trim": if ((v === 0x20 || v === 0x09) && hit()) { let k = 0; while (i + k < n && (d[i + k] === 0x20 || d[i + k] === 0x09)) k++; if (i + k < n && d[i + k] === 0x0A) { i += k - 1; } else bld.push(v); } else bld.push(v); break;
                    case "nulls": if (v === 0 && hit()) { let k = 0; while (i + k < n && d[i + k] === 0) k++; for (let q = 0; q < Math.min(k, T); q++) bld.push(0); i += k - 1; } else bld.push(v); break;
                    case "ascii": bld.push(hit() ? v & 0x7F : v); break;
                    case "upper": bld.push(v >= 0x61 && v <= 0x7A && hit() ? v - 32 : v); break;
                    case "lower": bld.push(v >= 0x41 && v <= 0x5A && hit() ? v + 32 : v); break;
                    default: bld.push(v);
                }
            }
            return { w: img.w, h: img.h, d: fit(bld.bytes(), n, p.fill, d, rnd) };
        }
    };

    // ---------------------------------------------------------------- Reinterpret
    const ORDERS = [["rgb", "RGB"], ["bgr", "BGR"], ["grb", "GRB"], ["gbr", "GBR"], ["rbg", "RBG"], ["brg", "BRG"]];
    const reinterpret = {
        id: "reinterpret", name: "Reinterpret", group: "Reinterpret",
        hint: "Reads the same bytes back with the wrong header: a different width tears the picture into a diagonal weave; 4 bytes per pixel treats every fourth byte as alpha and loses it, so the colours cycle across the picture; 16-bit reads pairs of bytes as one sample and stretches it; planar expects all the reds, then all the greens, then the blues.",
        params: [
            { id: "dw", name: "Width error (px)", min: -2000, max: 2000, step: 1, def: 1, time: true, curve: 2.5 },
            { id: "offset", name: "Start offset (bytes)", min: -64, max: 64, step: 1, def: 0 }
        ],
        options: [
            { id: "pb", name: "Bytes per pixel", choices: [["3", "3 (RGB, as written)"], ["4", "4 (RGBA)"], ["2", "2"], ["1", "1 (grey)"], ["6", "6 (16-bit RGB)"]] },
            { id: "depth", name: "Bit depth", choices: [["8", "8-bit"], ["16le", "16-bit little-endian"], ["16be", "16-bit big-endian"], ["4", "4-bit"], ["1", "1-bit"]] },
            { id: "layout", name: "Layout", choices: [["inter", "Interleaved"], ["planar", "Planar (RRR… GGG… BBB…)"], ["rowplanar", "Planar per row (RRR GGG BBB on each line)"]] },
            { id: "order", name: "Channel order", choices: ORDERS }
        ],
        run(img, p, ctx) {
            const d = img.d, n = d.length, W = img.w, H = img.h, out = new Uint8Array(n);
            const pb = +p.pb, W2 = Math.max(1, W + Math.round(p.dw)), off = p.offset | 0;
            const perm = { rgb: [0, 1, 2], bgr: [2, 1, 0], grb: [1, 0, 2], gbr: [1, 2, 0], rbg: [0, 2, 1], brg: [2, 0, 1] }[p.order] || [0, 1, 2];
            const at = (k) => d[((k % n) + n) % n];
            const sampleBytes = p.depth === "16le" || p.depth === "16be" ? 2 : 1;
            const hiFirst = p.depth === "16be";
            const sample = (k) => { // k = sample index (in samples) → 0..255; off is applied in bytes
                if (sampleBytes === 2) return at(k * 2 + (hiFirst ? 0 : 1) + off);
                if (p.depth === "4") { const b = at((k >> 1) + off); return ((k & 1) ? (b & 15) : (b >> 4)) * 17; }
                if (p.depth === "1") { const b = at((k >> 3) + off); return (b >> (7 - (k & 7))) & 1 ? 255 : 0; }
                return at(k + off);
            };
            const chanBytes = pb === 6 ? 2 : 1; // 6 bytes per pixel = 16-bit channels when depth is 8
            const chanOf = (c) => pb === 1 ? 0 : (pb === 2 ? Math.min(c, 1) : c);
            const planar = p.layout === "planar", rowplanar = p.layout === "rowplanar";
            const ps = (pb === 6 ? 3 : pb); // samples per pixel
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const o = (y * W + x) * 3, i2 = y * W2 + x;
                for (let c = 0; c < 3; c++) {
                    const cc = chanOf(perm[c]); let k;
                    if (planar) k = cc * Math.floor(n / sampleBytes / ps) + i2;
                    else if (rowplanar) k = y * W2 * ps + cc * W2 + x;
                    else k = i2 * ps + cc;
                    if (pb === 6) k = (i2 * 3 + cc) * 2 + 1; // 16-bit channels: high byte
                    out[o + c] = sample(k);
                }
            }
            return { w: W, h: H, d: out };
        }
    };

    // ---------------------------------------------------------------- Audacity
    const audacity = {
        id: "audacity", name: "Audacity", group: "Audacity",
        hint: "The import-raw-data trick: the file is read as audio samples, an effect is run over it, and it is exported again. Overflowing samples wrap round (the real behaviour) unless Clip is chosen. U-Law import gives the characteristic Audacity-bend colour fringing; 16-bit import ties pairs of bytes together. Pixachron does this idea in depth; this is the raw original.",
        params: [
            { id: "time", name: "Time (px)", min: 1, max: 20000, step: 1, def: 240, time: true, curve: 2.5, hint: "Echo delay, phaser/wah sweep period, fade length, speed-change block" },
            { id: "amount", name: "Amount", min: 0, max: 1.5, step: 0.01, def: 0.6, hint: "Echo decay, modulation depth, filter gain, tremolo depth, speed ratio" },
            { id: "cutoff", name: "Filter cutoff (px)", min: 1, max: 2000, step: 1, def: 40, time: true, curve: 2.5 },
            { id: "res", name: "Resonance", min: 0, max: 0.98, step: 0.01, def: 0.6 }
        ],
        options: [
            { id: "effect", name: "Effect", choices: [["echo", "Echo"], ["reverse", "Reverse"], ["invert", "Invert"], ["fadein", "Fade in"], ["fadeout", "Fade out"], ["phaser", "Phaser"], ["wahwah", "Wahwah"], ["bass", "Bass boost"], ["treble", "Treble boost"], ["highpass", "High-pass filter"], ["lowpass", "Low-pass filter"], ["tremolo", "Tremolo"], ["speed", "Change speed"], ["normalize", "Normalize"], ["amplify", "Amplify"], ["compress", "Compressor"], ["repeat", "Repeat (Time-long chunks, Amount × times)"]] },
            { id: "format", name: "Import as", choices: [["u8", "Unsigned 8-bit"], ["s8", "Signed 8-bit"], ["ulaw", "U-Law"], ["alaw", "A-Law"], ["s16le", "Signed 16-bit little-endian"], ["s16be", "Signed 16-bit big-endian"]] },
            { id: "over", name: "Overflow", choices: [["wrap", "Wrap (true databend)"], ["clip", "Clip"]] },
            { id: "fill", name: "Fill the end with", choices: FILLS }
        ],
        run(img, p, ctx) {
            const d = img.d, n = d.length, rnd = ctx.rnd;
            // decode bytes → Float32 samples in −1..1
            let N, x, dec, enc;
            const fmt = p.format;
            if (fmt === "s16le" || fmt === "s16be") {
                N = n >> 1; x = new Float32Array(N); const hi = fmt === "s16be" ? 0 : 1;
                for (let i = 0; i < N; i++) { const v = (d[2 * i + hi] << 8) | d[2 * i + 1 - hi]; x[i] = ((v << 16) >> 16) / 32768; }
                enc = (y) => { const out = new Uint8Array(y.length * 2); for (let i = 0; i < y.length; i++) { let v = Math.round(y[i] * 32768); if (p.over === "clip") v = clamp(v, -32768, 32767); else v = ((v + 32768) & 65535) - 32768; out[2 * i + hi] = (v >> 8) & 255; out[2 * i + 1 - hi] = v & 255; } return out; };
            } else if (fmt === "ulaw" || fmt === "alaw") {
                N = n; x = new Float32Array(N);
                const ul = fmt === "ulaw";
                const decU = (u) => { u = ~u & 255; const s = u & 0x80, e = (u >> 4) & 7, m = u & 15; let v = ((m << 3) + 0x84) << e; v -= 0x84; return s ? -v : v; };
                const decA = (a) => { a ^= 0x55; const s = a & 0x80, e = (a >> 4) & 7; let m = a & 15; let v = e ? ((m << 4) + 0x108) << (e - 1) : (m << 4) + 8; return s ? -v : v; };
                const encU = (v) => { const BIAS = 0x84, CLIP = 32635; let s = v < 0 ? 0x80 : 0; if (v < 0) v = -v; if (v > CLIP) v = CLIP; v += BIAS; let e = 7; for (let m = 0x4000; (v & m) === 0 && e > 0; e--, m >>= 1); const mant = (v >> (e + 3)) & 15; return ~(s | (e << 4) | mant) & 255; };
                const encA = (v) => { let s = v < 0 ? 0x80 : 0; if (v < 0) v = -v; if (v > 32767) v = 32767; let e = 7, m = 0x4000; for (; e > 0 && (v & m) === 0; e--, m >>= 1); let mant = e ? (v >> (e + 3)) & 15 : (v >> 4) & 15; if (e === 0 && v < 0x100) { mant = (v >> 4) & 15; } return (s | (e << 4) | mant) ^ 0x55; };
                for (let i = 0; i < N; i++) x[i] = (ul ? decU(d[i]) : decA(d[i])) / 32768;
                enc = (y) => { const out = new Uint8Array(y.length); for (let i = 0; i < y.length; i++) { let v = Math.round(y[i] * 32768); if (p.over === "clip") v = clamp(v, -32768, 32767); else v = ((v + 32768) & 65535) - 32768; out[i] = ul ? encU(v) : encA(v); } return out; };
            } else {
                N = n; x = new Float32Array(N); const signed = fmt === "s8";
                for (let i = 0; i < N; i++) x[i] = signed ? ((d[i] << 24) >> 24) / 128 : (d[i] - 128) / 128;
                enc = (y) => { const out = new Uint8Array(y.length); for (let i = 0; i < y.length; i++) { let v = Math.round(y[i] * 128); if (p.over === "clip") v = clamp(v, -128, 127); else v = ((v + 128) & 255) - 128; out[i] = signed ? v & 255 : (v + 128) & 255; } return out; };
            }
            const spp = fmt === "s16le" || fmt === "s16be" ? 1.5 : 3; // samples per pixel
            const T = Math.max(1, Math.round(p.time * spp)), C = Math.max(2, p.cutoff * spp), A = p.amount;
            let y = new Float32Array(N);
            const onePole = (per) => 1 - Math.exp(-2 * Math.PI / per);
            switch (p.effect) {
                case "echo": for (let i = 0; i < N; i++) y[i] = x[i] + (i >= T ? y[i - T] * A : 0); break;
                case "reverse": for (let i = 0; i < N; i++) y[i] = x[N - 1 - i]; break;
                case "invert": for (let i = 0; i < N; i++) y[i] = -x[i]; break;
                case "fadein": for (let i = 0; i < N; i++) y[i] = x[i] * Math.min(1, i / T); break;
                case "fadeout": for (let i = 0; i < N; i++) y[i] = x[i] * Math.min(1, (N - 1 - i) / T); break;
                case "phaser": { // 4 first-order all-pass stages swept by an LFO of period T
                    const st = [0, 0, 0, 0]; let fb = 0;
                    for (let i = 0; i < N; i++) {
                        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * i / T); const a = 0.2 + 0.78 * lfo * Math.min(1, A);
                        let v = x[i] + fb * p.res;
                        for (let k = 0; k < 4; k++) { const o = -a * v + st[k]; st[k] = v + a * o; v = o; }
                        fb = v; y[i] = x[i] + v * Math.min(1, A);
                    }
                    break;
                }
                case "wahwah": { // state-variable band-pass swept by LFO
                    let lp = 0, bp = 0;
                    for (let i = 0; i < N; i++) {
                        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * i / T); const f = Math.min(1.2, 2 * Math.sin(Math.PI / Math.max(2, C * (0.3 + 2 * lfo)))); const q = 1 - p.res;
                        const hp = x[i] - lp - q * bp; bp += f * hp; lp += f * bp; y[i] = lp * (1 - A) + bp * A * 2;
                    }
                    break;
                }
                case "bass": case "lowpass": { const c = onePole(C); let l = 0; for (let i = 0; i < N; i++) { l += (x[i] - l) * c; y[i] = p.effect === "bass" ? x[i] + l * A * 2 : l * (1 + A); } break; }
                case "treble": case "highpass": { const c = onePole(C); let l = 0; for (let i = 0; i < N; i++) { l += (x[i] - l) * c; const h = x[i] - l; y[i] = p.effect === "treble" ? x[i] + h * A * 2 : h * (1 + A); } break; }
                case "tremolo": for (let i = 0; i < N; i++) y[i] = x[i] * (1 - A * 0.5 * (1 - Math.sin(2 * Math.PI * i / T))); break;
                case "speed": { const r = Math.max(0.1, A || 1); const M = Math.floor(N / r); y = new Float32Array(M); for (let i = 0; i < M; i++) { const s = i * r, i0 = Math.floor(s), f = s - i0; y[i] = x[i0] * (1 - f) + (i0 + 1 < N ? x[i0 + 1] : x[i0]) * f; } break; }
                case "normalize": { let mx = 0; for (let i = 0; i < N; i++) mx = Math.max(mx, Math.abs(x[i])); const g = mx ? Math.min(1, A || 1) / mx : 1; for (let i = 0; i < N; i++) y[i] = x[i] * g; break; }
                case "amplify": for (let i = 0; i < N; i++) y[i] = x[i] * (1 + A * 3); break;
                case "compress": { let env = 0; const c = onePole(C); for (let i = 0; i < N; i++) { env += (Math.abs(x[i]) - env) * c; const g = env > 0.2 ? Math.pow(0.2 / env, A) : 1; y[i] = x[i] * g * (1 + A); } break; }
                case "repeat": { const times = Math.max(1, Math.round(A * 4)), bld = []; for (let s = 0; s < N; s += T) { const seg = x.subarray(s, Math.min(N, s + T)); for (let t = 0; t <= times; t++) bld.push(seg); } let M = 0; for (const s of bld) M += s.length; y = new Float32Array(M); let o = 0; for (const s of bld) { y.set(s, o); o += s.length; } break; }
                default: y = x;
            }
            return { w: img.w, h: img.h, d: fit(enc(y), n, p.fill, d, rnd) };
        }
    };

    const LIST = [shift, cutpaste, findreplace, insdel, bitops, stutter, bitrot, texted, reinterpret, audacity];
    return { LIST };
})();
if (typeof module !== "undefined") module.exports = HX_BYTES;
