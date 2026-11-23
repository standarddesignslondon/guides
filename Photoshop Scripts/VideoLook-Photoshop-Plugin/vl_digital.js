/* VideoLook picture source: the photo as a terminal, computer or teletext decoder would have drawn it (v1.3).
 * Runs on the standard's grid in place of (or after) a camera. Every kind ends as an R'G'B' picture that drives the
 * tube directly (the video bandwidth of the drive is applied here), so these looks normally switch the
 * "Standard & colour" stage off; with it on, the picture is coded into PAL/NTSC like any other source (a home computer
 * through its RF modulator).
 *
 * kinds:
 *   'chars'   character cells: each cell gets the character (and intensity / reverse video) whose dot pattern best
 *             matches the photo there, as terminal "character pictures" were made. DEC VT100: 80 x 24 cells of 10 dots x
 *             10 scans, dot stretcher ORs each dot with the one before [SEC VT100 Technical Manual ch. 4]. IBM MDA: 80 x 25
 *             cells of 9 x 14, four brightness levels from the Video (2/3) and Intensity (1/3) pins [SEC Wikipedia MDA].
 *             VideoLook's own 5 x 9 dot font (with descenders) stands in for each terminal's character ROM [EST].
 *   'pixels'  a bitmap framebuffer with a fixed palette (IBM CGA, BBC Micro, a storage-tube plot), optionally dithered:
 *             ordered (Bayer, 1973) or error diffusion (Floyd and Steinberg, 1976).
 *   'mosaic'  teletext block graphics: 40 x 24 cells of 2 x 3 "sixels", seven colours on black. Colour changes are
 *             spacing attributes: the control character takes a cell, shown as a space, or as the last mosaic when Hold
 *             Mosaics is on [SEC ETS 300 706 code names via Wikipedia; display-as-space rule via Unicode list
 *             discussion]. The first cell of each row holds the graphics code. Separated mosaics: each sixel drawn smaller
 *             with a black gap [SEC code name; gap size EST].
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const TX = (typeof require !== "undefined") ? require("./vl_text.js") : globalThis.VLText;
const SY = (typeof require !== "undefined") ? require("./vl_synth.js") : globalThis.VLSynth;
const IN = (typeof require !== "undefined") ? require("./vl_instrument.js") : globalThis.VLInstrument;
const CP = (typeof require !== "undefined") ? require("./vl_capture.js") : globalThis.VLCapture;
const NET = (typeof require !== "undefined") ? require("./vl_net.js") : globalThis.VLNet;

const hex = h => [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
// RGBI with the 5153's brown (colour 6: green reduced by about a third) [SEC Wikipedia CGA]
const RGBI = ["000000", "0000AA", "00AA00", "00AAAA", "AA0000", "AA00AA", "AA5500", "AAAAAA", "555555", "5555FF", "55FF55", "55FFFF", "FF5555", "FF55FF", "FFFF55", "FFFFFF"].map(hex);
const PALETTES = {
  mono2: { label: "1 bit (on / off)", cols: [[0, 0, 0], [1, 1, 1]] },
  grey16: { label: "16 greys, 4 bits (QuickCam, CU-SeeMe)", cols: Array.from({ length: 16 }, (_, k) => [k / 15, k / 15, k / 15]) }, // [SEC Wikipedia QuickCam; Cornell CU-SeeMe paper]
  mda4: { label: "IBM MDA, 4 brightness levels", cols: [[0, 0, 0], [1 / 3, 1 / 3, 1 / 3], [2 / 3, 2 / 3, 2 / 3], [1, 1, 1]] }, // [SEC]; how distinct they look depends on the monitor [SEC]
  cga1hi: { label: "CGA 320 x 200, palette 1 high (cyan, magenta, white)", cols: [RGBI[0], RGBI[11], RGBI[13], RGBI[15]] },
  cga1lo: { label: "CGA 320 x 200, palette 1 low (cyan, magenta, grey)", cols: [RGBI[0], RGBI[3], RGBI[5], RGBI[7]] },
  cga0hi: { label: "CGA 320 x 200, palette 0 high (green, red, yellow)", cols: [RGBI[0], RGBI[10], RGBI[12], RGBI[14]] },
  cga0lo: { label: "CGA 320 x 200, palette 0 low (green, red, brown)", cols: [RGBI[0], RGBI[2], RGBI[4], RGBI[6]] },
  cga5hi: { label: "CGA mode 5 (cyan, red, white)", cols: [RGBI[0], RGBI[11], RGBI[12], RGBI[15]] },
  rgbi16: { label: "RGBI 16 colours", cols: RGBI },
  ttl8: { label: "8 colours, digital RGB (BBC Micro, teletext)", cols: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
  bbc4: { label: "BBC MODE 1 default (black, red, yellow, white)", cols: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }, // default logical colours [EST]
};
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function adjust(planes, o) { // the operator's brightness and contrast before conversion (how such pictures were prepared) [EST]
  const con = o.contrast === undefined ? 1 : o.contrast, bri = o.brightness || 0, gam = o.gamma || 1;
  if (con === 1 && !bri && gam === 1) return planes;
  return planes.map(p => Float32Array.from(p, v => { let x = (v - 0.5) * con + 0.5 + bri; x = x < 0 ? 0 : x > 1 ? 1 : x; return gam === 1 ? x : Math.pow(x, gam); }));
}
// area-average the picture onto a W x H framebuffer
function toFB(grid, g, W, H) { return grid.map(p => VC.resize(p, g.ns, g.lines, W, H)); }
// draw a W x H raster onto the grid, nearest neighbour, inside an inset area (fractions of the active picture)
function drawFB(fb, W, H, g, inset) {
  const ns = g.ns, nl = g.lines, ix = inset ? inset[0] : 1, iy = inset ? inset[1] : 1;
  const xw = ns * ix, yh = nl * iy, x0 = (ns - xw) / 2, y0 = (nl - yh) / 2;
  const out = [0, 1, 2].map(() => new Float32Array(ns * nl));
  const colOf = new Int32Array(ns); for (let x = 0; x < ns; x++) { const u = (x + 0.5 - x0) / xw; colOf[x] = u < 0 || u >= 1 ? -1 : Math.min(W - 1, Math.floor(u * W)); }
  for (let y = 0; y < nl; y++) {
    const v = (y + 0.5 - y0) / yh; if (v < 0 || v >= 1) continue; const r = Math.min(H - 1, Math.floor(v * H));
    for (let c = 0; c < 3; c++) { const src = fb[c], dst = out[c]; for (let x = 0; x < ns; x++) { const k = colOf[x]; if (k >= 0) dst[y * ns + x] = src[r * W + k]; } }
  }
  return out;
}
function nearest(pal, r, g, b) {
  let best = 0, bd = 1e9;
  for (let k = 0; k < pal.length; k++) { const c = pal[k], dr = r - c[0], dg = g - c[1], db = b - c[2], d = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db; if (d < bd) { bd = d; best = k; } }
  return best;
}
// palette conversion with dithering; returns the framebuffer's own colours
function quantise(fb, W, H, pal, dither, spread) {
  const out = [0, 1, 2].map(() => new Float32Array(W * H)), n = W * H;
  if (dither === "fs") {
    const e = fb.map(p => Float32Array.from(p));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, r = e[0][i], g = e[1][i], b = e[2][i], k = nearest(pal, r, g, b), c = pal[k];
      for (let ch = 0; ch < 3; ch++) {
        out[ch][i] = c[ch]; const err = [r, g, b][ch] - c[ch], P = e[ch];
        if (x + 1 < W) P[i + 1] += err * 7 / 16;
        if (y + 1 < H) { if (x > 0) P[i + W - 1] += err * 3 / 16; P[i + W] += err * 5 / 16; if (x + 1 < W) P[i + W + 1] += err / 16; }
      }
    }
    return out;
  }
  const sp = spread !== undefined ? spread : 1 / Math.max(1, Math.cbrt(pal.length) * 1.2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = dither === "bayer" ? ((BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * sp : 0;
    const c = pal[nearest(pal, fb[0][i] + t, fb[1][i] + t, fb[2][i] + t)];
    out[0][i] = c[0]; out[1][i] = c[1]; out[2][i] = c[2];
  }
  return out;
}

/* ---------------- character pictures ---------------- */
const glyphCache = new Map();
function charset(o) {
  const key = (o.charset || "ascii") + "|" + (o.glyphW || 5) + "x" + (o.glyphH || 9);
  if (glyphCache.has(key)) return glyphCache.get(key);
  const list = [], gw = 5, gh = 9, q = TX.glyph("?");
  for (let c = 32; c < 127; c++) { const ch = String.fromCharCode(c); if (o.upper && ch >= "a" && ch <= "z") continue; const gl = TX.glyph(ch); if (gl === q && ch !== "?") continue;
    const b = new Uint8Array(gw * gh); for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) b[y * gw + x] = gl[y] && gl[y][x] === "1" ? 1 : 0; list.push({ ch, b, full: false }); }
  if (o.charset === "cp437") {
    // the PC set's shade blocks (176-178) and full block (219) fill the whole cell; their dot patterns [EST]
    list.push({ ch: "░", shade: 0.25 }, { ch: "▒", shade: 0.5 }, { ch: "▓", shade: 0.75 }, { ch: "█", shade: 1 });
  }
  glyphCache.set(key, list); return list;
}
function shadeDot(level, x, y) {
  if (level >= 1) return 1;
  if (level >= 0.75) return ((x & 1) === 0 && (y & 1) === 1) ? 0 : 1;
  if (level >= 0.5) return ((x + y) & 1) ? 0 : 1;
  return ((x & 1) === 0 && (y & 1) === 0) || ((x & 1) === 1 && (y & 3) === 2) ? 1 : 0;
}
function chars(grid, g, o) {
  const cols = o.cols || 80, rows = o.rows || 24, cw = o.cellW || 10, chh = o.cellH || 10, gx0 = o.glyphX !== undefined ? o.glyphX : 2, gy0 = o.glyphY !== undefined ? o.glyphY : 0;
  const DW = cols * cw, DH = rows * chh, set = charset(o), levels = o.levels || [1], reverse = !!o.reverse;
  const dots = toFB(adjust(grid, o), g, DW, DH).map(p => p);
  const L = new Float32Array(DW * DH); for (let i = 0; i < L.length; i++) L[i] = Math.max(0, Math.min(1, lum(dots[0][i], dots[1][i], dots[2][i])));
  const D = new Float32Array(DW * DH);
  const pat = new Float32Array(cw * chh);
  const cellPat = (ent, rev) => {
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
      let on;
      if (ent.shade !== undefined) on = shadeDot(ent.shade, x, y);
      else { const gx = x - gx0, gy = y - gy0; on = gx >= 0 && gx < 5 && gy >= 0 && gy < 9 ? ent.b[gy * 5 + gx] : 0; }
      pat[y * cw + x] = rev ? 1 - on : on;
    }
    return pat;
  };
  // pre-build every candidate pattern
  // Matching is done on softened copies of the cell and of each character (as the eye sees them from a little way off),
  // so a character is chosen for its overall tone and its shape together. A dot matrix lights at most about a third of
  // a cell, so the picture's tones are first scaled into what the character set can show [EST, the usual practice].
  const passes = Math.max(2, Math.round(Math.max(cw, chh) / 5)); // softening grows with the cell
  const soft = (a, w, h) => { const t = new Float32Array(a.length);
    for (let pass = 0; pass < passes; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; t[i] = 0.5 * a[i] + 0.25 * (a[x > 0 ? i - 1 : i] + a[x < w - 1 ? i + 1 : i]); }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; a[i] = 0.5 * t[i] + 0.25 * (t[y > 0 ? i - w : i] + t[y < h - 1 ? i + w : i]); } }
    return a; };
  const cands = [];
  for (const ent of set) for (const rv of reverse ? [false, true] : [false]) { if (rv && ent.shade !== undefined) continue; const p0 = Float32Array.from(cellPat(ent, rv)); let m = 0; for (const v of p0) m += v; cands.push({ p: p0, s: soft(Float32Array.from(p0), cw, chh), m: m / p0.length, ent, rv }); }
  const top = Math.max(...levels) * Math.max(...cands.map(cd => cd.m)), tone = o.toneMap === false ? 1 : top;
  const Ls = new Float32Array(L.length); for (let i = 0; i < L.length; i++) Ls[i] = L[i] * tone;
  const cellBuf = new Float32Array(cw * chh);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) cellBuf[y * cw + x] = Ls[(r * chh + y) * DW + c * cw + x];
    soft(cellBuf, cw, chh);
    // cost = tone difference (weighted, so the overall brightness is right) + shape difference about the means
    let mc = 0; for (let i = 0; i < cellBuf.length; i++) mc += cellBuf[i]; mc /= cellBuf.length;
    let best = null, bc = 1e9, bl = 0; const N = cellBuf.length, wTone = o.toneWeight !== undefined ? o.toneWeight : 1;
    for (const cd of cands) for (const lv of levels) {
      const dm = mc - lv * cd.m; let cost = wTone * N * dm * dm; const P = cd.s;
      for (let i = 0; i < N; i++) { const d = (cellBuf[i] - mc) - lv * (P[i] - cd.m); cost += d * d; if (cost >= bc) break; }
      if (cost < bc) { bc = cost; best = cd; bl = lv; }
    }
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) D[(r * chh + y) * DW + c * cw + x] = bl * best.p[y * cw + x];
  }
  if (o.dotStretch) { // VT100: the video is ORed with itself delayed by one dot [SEC]
    for (let y = 0; y < DH; y++) for (let x = DW - 1; x > 0; x--) { const i = y * DW + x; if (D[i - 1] > D[i]) D[i] = D[i - 1]; }
  }
  return drawFB([D, D, D], DW, DH, g, o.inset);
}

/* ---------------- teletext mosaics ---------------- */
const TT = [[1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
function mosaic(grid, g, o) {
  const ns = g.ns, nl = g.lines;
  const areaW = ns * 40 / 52, areaH = nl * 480 / 575, x0 = (ns - areaW) / 2, y0 = (nl - areaH) / 2, cw = areaW / 40, rh = areaH / 24;
  const firstRow = o.header ? 1 : 0;
  const SX = 80, SY = 72, fb = toFB(adjust(grid, o), g, SX, SY);
  const sat = o.saturate || 1; // colour boost before matching (a designer's choice of the nearest strong colour) [EST]
  if (sat !== 1) for (let i = 0; i < SX * SY; i++) { const y = lum(fb[0][i], fb[1][i], fb[2][i]); for (let c = 0; c < 3; c++) fb[c][i] = Math.max(0, Math.min(1, y + sat * (fb[c][i] - y))); }
  const px = (r, c, k) => { const sx = c * 2 + (k & 1), sy = r * 3 + (k >> 1), i = sy * SX + sx; return [fb[0][i], fb[1][i], fb[2][i]]; };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const out = [0, 1, 2].map(() => new Float32Array(ns * nl));
  const page = [];
  for (let r = firstRow; r < 24; r++) {
    // cost and sixel pattern of each cell in each colour
    const cost = [], patt = [], blank = [];
    for (let c = 0; c < 40; c++) {
      const P = [0, 1, 2, 3, 4, 5].map(k => px(r, c, k)); let bz = 0; for (const p of P) bz += d2(p, [0, 0, 0]); blank[c] = bz;
      cost[c] = []; patt[c] = [];
      for (let s = 0; s < 7; s++) { let cs = 0, m = 0; P.forEach((p, k) => { const a = d2(p, TT[s]), b = d2(p, [0, 0, 0]); if (a < b) { cs += a; m |= 1 << k; } else cs += b; }); cost[c][s] = cs; patt[c][s] = m; }
    }
    const heldCost = (c, s, m) => { let cs = 0; for (let k = 0; k < 6; k++) cs += d2(px(r, c, k), (m >> k) & 1 ? TT[s] : [0, 0, 0]); return cs; };
    // dynamic programme over the row: state = graphics colour in force; a change costs the cell it is sent in
    const INF = 1e18; let dp = new Float64Array(7).fill(INF); const back = [];
    for (let s = 0; s < 7; s++) dp[s] = blank[0]; // column 0: the graphics code (shown as a space)
    back.push(null);
    const lastM = [new Int32Array(7)]; // pattern last drawn (for hold)
    for (let c = 1; c < 40; c++) {
      const nd = new Float64Array(7).fill(INF), bk = new Array(7), lm = new Int32Array(7), prevM = lastM[c - 1];
      for (let s = 0; s < 7; s++) {
        // stay in colour s: draw this cell
        const stay = dp[s] + cost[c][s]; if (stay < nd[s]) { nd[s] = stay; bk[s] = { from: s, ctrl: false }; lm[s] = patt[c][s]; }
      }
      for (let s0 = 0; s0 < 7; s0++) { if (dp[s0] >= INF) continue;
        const shown = o.hold ? heldCost(c, s0, prevM[s0]) : blank[c];
        for (let s = 0; s < 7; s++) { if (s === s0) continue; const v = dp[s0] + shown; if (v < nd[s]) { nd[s] = v; bk[s] = { from: s0, ctrl: true }; lm[s] = o.hold ? prevM[s0] : 0; } } }
      dp = nd; back.push(bk); lastM.push(lm);
    }
    let s = 0; for (let k = 1; k < 7; k++) if (dp[k] < dp[s]) s = k;
    const cells = new Array(40);
    for (let c = 39; c >= 1; c--) { const b = back[c][s]; cells[c] = b.ctrl ? { ctrl: true, col: b.from } : { col: s, m: patt[c][s] }; s = b.from; }
    cells[0] = { ctrl: true, col: s };
    // hold: a control cell shows the last mosaic, in the colour still in force (codes are set-after) [EST reading]
    let last = 0; for (let c = 0; c < 40; c++) { const ce = cells[c]; if (ce.ctrl) ce.m = o.hold ? last : 0; else last = ce.m; }
    page.push({ r, cells });
  }
  const rowsH = [0.3, 0.4, 0.3], sep = !!o.separated;
  for (const { r, cells } of page) cells.forEach((ce, c) => {
    if (!ce.m) return; const col = TT[ce.col];
    for (let k = 0; k < 6; k++) { if (!((ce.m >> k) & 1)) continue;
      const sc = k & 1, sr = k >> 1, ya = rowsH.slice(0, sr).reduce((a, b) => a + b, 0);
      let ax0 = x0 + (c + sc / 2) * cw, ax1 = ax0 + cw / 2, ay0 = y0 + (r + ya) * rh, ay1 = ay0 + rowsH[sr] * rh;
      if (sep) { ax0 += cw / 6; ay1 -= rh / 10; } // one dot of the 6 x 10 cell [EST]
      for (let y = Math.max(0, Math.round(ay0)); y < Math.min(nl, Math.round(ay1)); y++) for (let x = Math.max(0, Math.round(ax0)); x < Math.min(ns, Math.round(ax1)); x++) { const i = y * ns + x; out[0][i] = col[0]; out[1][i] = col[1]; out[2][i] = col[2]; }
    }
  });
  let res = out;
  if (o.header) res = TX.teletext(out, g, { mode: "mix", header: o.header, text: "" });
  else { const bw = Math.min(5e6, g.bw || 5e6); for (const p of res) VC.filterRows(p, ns, nl, VC.lp3dB(bw, g.fs, VC.tw(bw, 1.5e6))); }
  return res;
}

/* ---------------- the stage ---------------- */
const KINDS = Object.assign({ none: "(none: the camera or photo)", chars: "Character picture (terminal)", pixels: "Bitmap with a palette (computer)", mosaic: "Teletext mosaic graphics" }, SY.KINDS, IN.KINDS, CP.KINDS, NET.KINDS);
function source(grid, g, o) {
  o = o || {};
  if (SY.KINDS[o.kind]) return SY.synth(grid, g, o);
  // instruments keep their options in source.inst so they never meet the other kinds' defaults
  if (IN.KINDS[o.kind]) return IN.instrument(grid, g, Object.assign({ aspect: o.aspect, seed: o.seed }, o.inst || {}, { kind: o.kind }));
  if (NET.KINDS[o.kind]) return NET.net(grid, g, Object.assign({ aspect: o.aspect, seed: o.seed }, o.inst || {}, { kind: o.kind }));
  if (CP.KINDS[o.kind]) return CP.capture(grid, g, Object.assign({ aspect: o.aspect, seed: o.seed }, o.inst || {}, { kind: o.kind }));
  let out;
  if (o.kind === "chars") out = chars(grid, g, o);
  else if (o.kind === "mosaic") return mosaic(grid, g, o);
  else if (o.kind === "pixels") {
    const W = o.w || 320, H = o.h || 200, pal = (PALETTES[o.palette] || PALETTES.mono2).cols;
    const fb = quantise(toFB(adjust(grid, o), g, W, H), W, H, pal, o.dither || "none", o.spread);
    out = drawFB(fb, W, H, g, o.inset);
    if (o.dotStretch) for (const p of out) for (let y = 0; y < g.lines; y++) { const r0 = y * g.ns; for (let x = g.ns - 1; x > 0; x--) if (p[r0 + x - 1] > p[r0 + x]) p[r0 + x] = p[r0 + x - 1]; }
  } else return grid;
  // the drive to the tube has a finite bandwidth (dot edges rise and fall over a few tens of ns)
  const bw = o.videoMHz ? o.videoMHz * 1e6 : g.bw;
  if (bw && bw < g.fs / 2) for (const p of out) VC.filterRows(p, g.ns, g.lines, VC.lp3dB(bw, g.fs, VC.tw(bw, 0.3 * bw)));
  if (o.glow) for (const p of out) for (let i = 0; i < p.length; i++) p[i] += o.glow; // storage tube: the flood guns light the whole screen faintly [SEC]
  return out;
}
const api = { source, PALETTES, KINDS, quantise };
if (typeof module !== "undefined" && module.exports) module.exports = api;
