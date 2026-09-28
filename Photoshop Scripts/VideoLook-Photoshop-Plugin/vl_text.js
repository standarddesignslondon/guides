/* VideoLook text overlays: teletext (mix, page, boxed subtitles) and a CCTV-style date/time stamp.
 * The dot-matrix font below is VideoLook's own 5 x 9 design (not a copy of any character-generator ROM).
 * Teletext geometry [SPEC ETS 300 706; SAA5050 datasheet via research H]: 24 rows x 40 characters; each character cell
 * is 6 dots x 10 lines per field (20 frame lines), glyphs on a 5 x 9 matrix with a 1-dot and 1-line gap; the 40 characters
 * take 40 of the 52 µs active line; characters are smoothed ("rounded") with half-dots; Level 1 has 8 colours and
 * double height; subtitles are boxed on black, usually double height [SEC BBC subtitle guidelines].
 * The vertical position of the rows on the raster was NOT FOUND: centred here [EST].
 */
"use strict";
const VT = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;

const G = {};
function def(ch, rows) { G[ch] = rows.concat(Array(9 - rows.length).fill(".....")); }
const U = {
  A: [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"], B: ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
  C: [".111.", "1...1", "1....", "1....", "1....", "1...1", ".111."], D: ["1111.", "1...1", "1...1", "1...1", "1...1", "1...1", "1111."],
  E: ["11111", "1....", "1....", "1111.", "1....", "1....", "11111"], F: ["11111", "1....", "1....", "1111.", "1....", "1....", "1...."],
  G: [".111.", "1...1", "1....", "1.111", "1...1", "1...1", ".1111"], H: ["1...1", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
  I: [".111.", "..1..", "..1..", "..1..", "..1..", "..1..", ".111."], J: ["..111", "...1.", "...1.", "...1.", "...1.", "1..1.", ".11.."],
  K: ["1...1", "1..1.", "1.1..", "11...", "1.1..", "1..1.", "1...1"], L: ["1....", "1....", "1....", "1....", "1....", "1....", "11111"],
  M: ["1...1", "11.11", "1.1.1", "1.1.1", "1...1", "1...1", "1...1"], N: ["1...1", "11..1", "1.1.1", "1..11", "1...1", "1...1", "1...1"],
  O: [".111.", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."], P: ["1111.", "1...1", "1...1", "1111.", "1....", "1....", "1...."],
  Q: [".111.", "1...1", "1...1", "1...1", "1.1.1", "1..1.", ".11.1"], R: ["1111.", "1...1", "1...1", "1111.", "1.1..", "1..1.", "1...1"],
  S: [".1111", "1....", "1....", ".111.", "....1", "....1", "1111."], T: ["11111", "..1..", "..1..", "..1..", "..1..", "..1..", "..1.."],
  U: ["1...1", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."], V: ["1...1", "1...1", "1...1", "1...1", "1...1", ".1.1.", "..1.."],
  W: ["1...1", "1...1", "1...1", "1.1.1", "1.1.1", "1.1.1", ".1.1."], X: ["1...1", "1...1", ".1.1.", "..1..", ".1.1.", "1...1", "1...1"],
  Y: ["1...1", "1...1", ".1.1.", "..1..", "..1..", "..1..", "..1.."], Z: ["11111", "....1", "...1.", "..1..", ".1...", "1....", "11111"],
  0: [".111.", "1...1", "1..11", "1.1.1", "11..1", "1...1", ".111."], 1: ["..1..", ".11..", "..1..", "..1..", "..1..", "..1..", ".111."],
  2: [".111.", "1...1", "....1", "...1.", "..1..", ".1...", "11111"], 3: ["11111", "...1.", "..1..", "...1.", "....1", "1...1", ".111."],
  4: ["...1.", "..11.", ".1.1.", "1..1.", "11111", "...1.", "...1."], 5: ["11111", "1....", "1111.", "....1", "....1", "1...1", ".111."],
  6: ["..11.", ".1...", "1....", "1111.", "1...1", "1...1", ".111."], 7: ["11111", "....1", "...1.", "..1..", ".1...", ".1...", ".1..."],
  8: [".111.", "1...1", "1...1", ".111.", "1...1", "1...1", ".111."], 9: [".111.", "1...1", "1...1", ".1111", "....1", "...1.", ".11.."],
  a: [".....", ".....", ".111.", "....1", ".1111", "1...1", ".1111"], b: ["1....", "1....", "1111.", "1...1", "1...1", "1...1", "1111."],
  c: [".....", ".....", ".1111", "1....", "1....", "1....", ".1111"], d: ["....1", "....1", ".1111", "1...1", "1...1", "1...1", ".1111"],
  e: [".....", ".....", ".111.", "1...1", "11111", "1....", ".111."], f: ["..11.", ".1..1", ".1...", "111..", ".1...", ".1...", ".1..."],
  g: [".....", ".....", ".1111", "1...1", "1...1", "1...1", ".1111", "....1", ".111."], h: ["1....", "1....", "1111.", "1...1", "1...1", "1...1", "1...1"],
  i: ["..1..", ".....", ".11..", "..1..", "..1..", "..1..", ".111."], j: ["...1.", ".....", "..11.", "...1.", "...1.", "...1.", "...1.", "1..1.", ".11.."],
  k: ["1....", "1....", "1..1.", "1.1..", "11...", "1.1..", "1..1."], l: [".11..", "..1..", "..1..", "..1..", "..1..", "..1..", ".111."],
  m: [".....", ".....", "11.1.", "1.1.1", "1.1.1", "1.1.1", "1.1.1"], n: [".....", ".....", "1111.", "1...1", "1...1", "1...1", "1...1"],
  o: [".....", ".....", ".111.", "1...1", "1...1", "1...1", ".111."], p: [".....", ".....", "1111.", "1...1", "1...1", "1...1", "1111.", "1....", "1...."],
  q: [".....", ".....", ".1111", "1...1", "1...1", "1...1", ".1111", "....1", "....1"], r: [".....", ".....", "1.11.", "11..1", "1....", "1....", "1...."],
  s: [".....", ".....", ".1111", "1....", ".111.", "....1", "1111."], t: [".1...", ".1...", "111..", ".1...", ".1...", ".1..1", "..11."],
  u: [".....", ".....", "1...1", "1...1", "1...1", "1..11", ".11.1"], v: [".....", ".....", "1...1", "1...1", "1...1", ".1.1.", "..1.."],
  w: [".....", ".....", "1...1", "1...1", "1.1.1", "1.1.1", ".1.1."], x: [".....", ".....", "1...1", ".1.1.", "..1..", ".1.1.", "1...1"],
  y: [".....", ".....", "1...1", "1...1", "1...1", "1...1", ".1111", "....1", ".111."], z: [".....", ".....", "11111", "...1.", "..1..", ".1...", "11111"],
  " ": ["....."], ".": [".....", ".....", ".....", ".....", ".....", ".11..", ".11.."], ",": [".....", ".....", ".....", ".....", ".11..", ".11..", "..1..", ".1..."],
  ":": [".....", ".11..", ".11..", ".....", ".11..", ".11..", "....."], ";": [".....", ".11..", ".11..", ".....", ".11..", ".11..", "..1..", ".1..."],
  "-": [".....", ".....", ".....", "11111"], "+": [".....", "..1..", "..1..", "11111", "..1..", "..1.."], "/": [".....", "....1", "...1.", "..1..", ".1...", "1...."],
  "'": ["..1..", "..1..", ".1..."], "\"": [".1.1.", ".1.1.", ".1.1."], "!": ["..1..", "..1..", "..1..", "..1..", "..1..", ".....", "..1.."],
  "?": [".111.", "1...1", "....1", "...1.", "..1..", ".....", "..1.."], "(": ["...1.", "..1..", ".1...", ".1...", ".1...", "..1..", "...1."],
  ")": [".1...", "..1..", "...1.", "...1.", "...1.", "..1..", ".1..."], "&": [".11..", "1..1.", "1.1..", ".1...", "1.1.1", "1..1.", ".11.1"],
  "%": ["11...", "11..1", "...1.", "..1..", ".1...", "1..11", "...11"], "£": ["..11.", ".1..1", ".1...", "111..", ".1...", ".1..1", "1111."],
  "#": [".1.1.", ".1.1.", "11111", ".1.1.", "11111", ".1.1.", ".1.1."], "*": [".....", "..1..", "1.1.1", ".111.", "1.1.1", "..1.."],
  "=": [".....", ".....", "11111", ".....", "11111"], "<": ["...1.", "..1..", ".1...", "1....", ".1...", "..1..", "...1."],
  ">": [".1...", "..1..", "...1.", "....1", "...1.", "..1..", ".1..."], "_": [".....", ".....", ".....", ".....", ".....", ".....", "11111"],
  "@": [".111.", "1...1", "1.111", "1.1.1", "1.111", "1....", ".1111"], "°": [".11..", "1..1.", ".11.."],
};
for (const k in U) def(k, U[k]);
function glyph(ch) { return G[ch] || G["?"]; }

// 6 x 10 cell -> 12 x 20 half-dots with diagonal rounding (the generic character-rounding technique)
const roundCache = new Map();
function rounded(ch) {
  if (roundCache.has(ch)) return roundCache.get(ch);
  const gl = glyph(ch), on = (x, y) => x >= 0 && x < 5 && y >= 0 && y < 9 && gl[y][x] === "1";
  const B = new Uint8Array(12 * 20);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 5; x++) if (on(x, y)) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) B[(2 * y + b) * 12 + 2 * x + a] = 1;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) {
    const A = on(x, y), Bq = on(x + 1, y), C = on(x, y + 1), D = on(x + 1, y + 1);
    if (A && D && !Bq && !C) { B[(2 * y + 1) * 12 + 2 * x + 2] = 1; B[(2 * y + 2) * 12 + 2 * x + 1] = 1; }
    if (Bq && C && !A && !D) { B[(2 * y + 1) * 12 + 2 * x + 1] = 1; B[(2 * y + 2) * 12 + 2 * x + 2] = 1; }
  }
  roundCache.set(ch, B); return B;
}

const COL = { black: [0, 0, 0], red: [1, 0, 0], green: [0, 1, 0], yellow: [1, 1, 0], blue: [0, 0, 1], magenta: [1, 0, 1], cyan: [0, 1, 1], white: [1, 1, 1] };
// Parse a line with {colour}, {dh} (double height) and {box}...{/box} markers into cells [{ch, fg, bg|null, dh}]
function parseLine(line, defFg, boxed) {
  const cells = []; let fg = defFg, dh = false, box = boxed;
  const re = /\{(\/?[a-z]+)\}/y; let i = 0;
  while (i < line.length) {
    if (line[i] === "{") { re.lastIndex = i; const m = re.exec(line); if (m) { const t = m[1]; if (COL[t]) fg = COL[t]; else if (t === "dh") dh = true; else if (t === "box") box = true; else if (t === "/box") box = false; i = re.lastIndex; continue; } }
    cells.push({ ch: line[i], fg, bg: box ? COL.black : null, dh }); i++;
  }
  return cells;
}

/* Draw teletext onto a decoded R'G'B' grid (the set's character generator drives the tube directly).
 * o: { mode: 'mix' | 'page' | 'subtitle', text (lines, markers allowed), header (page header text), colour } */
function teletext(grid, g, o) {
  o = o || {};
  const ns = g.ns, nl = g.lines, mode = o.mode || "mix";
  const areaW = ns * 40 / 52, areaH = nl * 480 / 575, x0 = (ns - areaW) / 2, y0 = (nl - areaH) / 2, cw = areaW / 40, rh = areaH / 24;
  const rows = [];
  if (mode === "subtitle") {
    const lines = (o.text || "").split("\n").filter(l => l.trim().length).slice(-3);
    const fg = COL[o.colour || "white"] || COL.white;
    // double-height boxed lines at the bottom of the page, centred (rows 19-22) [SEC BBC guidelines: black boxes, double height]
    lines.forEach((l, k) => { const cells = parseLine(l, fg, true).map(c => Object.assign(c, { dh: true })); const pad = Math.max(0, Math.floor((40 - cells.length) / 2)); rows.push({ row: 23 - 2 * (lines.length - k), col: pad, cells }); });
  } else {
    if (o.header !== false) rows.push({ row: 0, col: 0, cells: parseLine((o.header || "P100  VIDEOTEXT 100  Mon 12 Sep  18:42/07").slice(0, 40), COL.white, mode === "page") });
    (o.text || "").split("\n").slice(0, 23).forEach((l, k) => rows.push({ row: k + 1, col: 0, cells: parseLine(l, COL.white, false) }));
  }
  const R = grid[0], Gp = grid[1], Bp = grid[2];
  if (mode === "page") for (let y = Math.floor(y0); y < Math.ceil(y0 + areaH); y++) for (let x = Math.floor(x0); x < Math.ceil(x0 + areaW); x++) { const i = y * ns + x; R[i] = Gp[i] = Bp[i] = 0; }
  for (const rw of rows) rw.cells.forEach((cell, k) => {
    const col = rw.col + k; if (col >= 40) return;
    const cx0 = x0 + col * cw, cy0 = y0 + rw.row * rh, hh = cell.dh ? 2 * rh : rh, bm = rounded(cell.ch);
    for (let y = Math.floor(cy0); y < Math.min(nl, Math.ceil(cy0 + hh)); y++) {
      const by = Math.min(19, Math.floor((y - cy0) / hh * 20)); if (by < 0) continue;
      for (let x = Math.floor(cx0); x < Math.min(ns, Math.ceil(cx0 + cw)); x++) {
        const bx = Math.min(11, Math.floor((x - cx0) / cw * 12)); if (bx < 0) continue;
        const i = y * ns + x, onb = bm[by * 12 + bx];
        if (onb) { R[i] = cell.fg[0]; Gp[i] = cell.fg[1]; Bp[i] = cell.fg[2]; }
        else if (cell.bg || mode === "page") { const b = cell.bg || COL.black; R[i] = b[0]; Gp[i] = b[1]; Bp[i] = b[2]; }
      }
    }
  });
  // the RGB drive has finite bandwidth: soften the edges a little (~5 MHz) [EST]
  const bw = Math.min(5e6, g.bw || 5e6); for (const p of grid) VT.filterRows(p, ns, nl, VT.lp3dB(bw, g.fs, VT.tw(bw, 1.5e6)));
  return grid;
}

/* CCTV / camcorder date-time stamp: white characters with a dark outline, burned into the picture before recording [EST form]
 * o: { text (lines), pos: 'bl' | 'tl' | 'br' | 'tr', size (character height as a fraction of the picture height) } */
function timestamp(grid, g, o) {
  o = o || {};
  const ns = g.ns, nl = g.lines, lines = (o.text || "").split("\n").filter(l => l.length), size = o.size || 0.042;
  const chH = nl * size, chW = chH * 0.62 * (ns / nl) * (3 / 4), gap = chW * 0.25;
  const marginX = ns * 0.08, marginY = nl * 0.08, pos = o.pos || "bl";
  const L = lines.length, blockH = L * chH * 1.35;
  const ink = new Float32Array(ns * nl), edge = new Float32Array(ns * nl);
  lines.forEach((line, k) => {
    const wLine = line.length * (chW + gap);
    const xs = pos[1] === "l" ? marginX : ns - marginX - wLine, ys = (pos[0] === "t" ? marginY : nl - marginY - blockH) + k * chH * 1.35;
    [...line].forEach((ch, j) => {
      const gl = glyph(ch), cx = xs + j * (chW + gap);
      for (let y = Math.floor(ys); y < Math.min(nl, Math.ceil(ys + chH)); y++) {
        const gy = Math.floor((y - ys) / chH * 7); if (gy < 0 || gy > 6) continue;
        for (let x = Math.floor(cx); x < Math.min(ns, Math.ceil(cx + chW)); x++) { const gx = Math.floor((x - cx) / chW * 5); if (gx < 0 || gx > 4) continue; if (gl[gy][gx] === "1") ink[y * ns + x] = 1; }
      }
    });
  });
  const ox = Math.max(1, Math.round(chW * 0.12)), oy = Math.max(1, Math.round(chH * 0.07));
  for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) if (ink[y * ns + x]) for (let dy = -oy; dy <= oy; dy++) for (let dx = -ox; dx <= ox; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < nl && xx >= 0 && xx < ns) edge[yy * ns + xx] = 1; }
  for (let i = 0; i < ns * nl; i++) { if (ink[i]) for (const p of grid) p[i] = 0.95; else if (edge[i]) for (const p of grid) p[i] = 0.05; }
  return grid;
}

/* ================= Subtitles ================= */
/* Styles and what rests on what (research, 28 Sept 2026; see _research/I_subtitles.md):
 *  BBC: TKST, a slab serif "based at many removes on Rockwell Light", designed 1975-77 at Reading University for the BBC's
 *    subtitle generator; first black edging, later a "grey label" (picture darkened and colour killed in a rectangle behind
 *    the text) [SEC designer's account, screenfont.ca]. TKST itself isn't available: Rockwell is the nearest installed face.
 *  Cinema, chemically etched (to the 1990s): white letters (clear film) with slightly ragged edges [SEC 3 sources];
 *    laser (from 1988): sharp, with a thin dark halo from the heat, sometimes dark specks [SEC 2+]; monoline Helvetica-like faces.
 *  Home video releases: off-the-shelf faces such as Univers 45 or Antique Olive [SEC single]; edge treatment [EST].
 *  DVD: 2-bit subpictures, four values (background, fill, two emphasis) [SPEC]: hard stepped edges; Tahoma/Verdana-like [SEC forum].
 *  Dutch TV: Helvetica Neue 67 Medium Condensed, 87% white, black border, standard since the 1980s [SEC single].
 *  Channel 4 guideline (era uncertain): Gill Sans with drop shadow [SEC single].
 *  Early optical TV subtitling: white letters on a black "letter box" [SEC single].
 *  US closed captions (EIA-608, 1980+): white monospaced capitals on black, 32 columns x 15 rows [SPEC/SEC]; decoder font [EST].
 * Sizes, offsets and edge widths are [EST] unless stated. */
const SUB_STYLES = {
  arial_shadow: { label: "Arial italic, soft shadow", fonts: ["Arial-ItalicMT", "ArialMT"], fauxItalic: "ifRoman", colour: "white", edge: "softshadow", size: 0.04, stage: "studio" },
  bbc_edge:     { label: "BBC slab serif (TKST-style), black edge", fonts: ["Rockwell-Light", "Rockwell-Regular", "Rockwell"], colour: "white", edge: "outline", size: 0.042, stage: "studio" },
  bbc_label:    { label: "BBC slab serif on a grey label", fonts: ["Rockwell-Light", "Rockwell-Regular", "Rockwell"], colour: "white", edge: "greylabel", size: 0.042, stage: "studio" },
  letterbox:    { label: "Early TV: white on a black box", fonts: ["Helvetica", "ArialMT"], colour: "white", edge: "box", size: 0.04, stage: "studio" },
  cinema_chem:  { label: "Cinema print, chemically etched", fonts: ["Helvetica", "ArialMT"], colour: "white", edge: "ragged", size: 0.045, stage: "film" },
  cinema_laser: { label: "Cinema print, laser-etched (1988 on)", fonts: ["Helvetica", "ArialMT"], colour: "white", edge: "halo", size: 0.045, stage: "film" },
  video_release:{ label: "VHS / LaserDisc release (Univers-style)", fonts: ["UniversLTStd-Light", "Univers-Light", "Univers", "HelveticaNeue-Light", "Helvetica"], colour: "white", edge: "outline", size: 0.042, stage: "studio" },
  dutch:        { label: "Dutch TV (Helvetica Neue condensed)", fonts: ["HelveticaNeueLTStd-MdCn", "HelveticaNeue-CondensedBold", "HelveticaNeue-Medium", "ArialNarrow", "Helvetica"], colour: "white87", edge: "outline", size: 0.045, stage: "studio" },
  channel4:     { label: "Channel 4 (Gill Sans, drop shadow)", fonts: ["GillSans", "GillSans-Light", "Helvetica"], colour: "white", edge: "shadow", size: 0.042, stage: "studio" },
  dvd:          { label: "DVD subpicture (Tahoma-like)", fonts: ["Tahoma", "Verdana", "ArialMT"], colour: "white", edge: "bitmap4", size: 0.045, stage: "studio" },
  cc608:        { label: "US closed captions (Line 21)", fonts: [], colour: "white", edge: "cc", size: 0.05, stage: "set", caps: true },
  custom:       { label: "Custom", fonts: ["ArialMT"], colour: "white", edge: "outline", size: 0.042, stage: "studio" },
};
const SUB_COL = { white: [1, 1, 1], white87: [0.87, 0.87, 0.87], yellow: [1, 1, 0.1], cyan: [0.2, 1, 1] };
// Settings with the style's defaults filled in
function subStyle(o) { const st = SUB_STYLES[o.style] || SUB_STYLES.arial_shadow; const r = Object.assign({}, st); for (const k of ["colour", "edge", "size", "stage", "lineSpacing", "position", "strength"]) if (o[k] !== undefined && o[k] !== "" && o[k] !== "style") r[k] = o[k]; if (o.caps === "caps") r.caps = true; if (o.caps === "typed") r.caps = false; if (o.italic === "on") r.fauxItalic = "on"; if (o.italic === "off") r.fauxItalic = "off"; r.fonts = o.font && o.font.trim() ? o.font.split(",").map(x => x.trim()).filter(Boolean).concat(st.fonts) : st.fonts; return r; }
function subLines(o) { const st = subStyle(o); return (o.text || "").split("\n").map(l => st.caps ? l.toUpperCase() : l); }

// Fallback typesetting with VideoLook's own dot font (used when Photoshop hasn't typeset the lines, e.g. outside Photoshop)
// Each line: { w, h, a (coverage), base (baseline from top) } in document pixels; band height 1.35 x size, baseline at 1.0 x size.
function rasterFallback(lines, sizePx, italic) {
  const s = sizePx * 0.72 / 7, out = [];
  for (const line of lines) {
    if (!line.trim()) { out.push(null); continue; }
    const pad = Math.round(sizePx * 0.15) + 1, h = Math.round(sizePx * 1.35), base = Math.round(sizePx), adv = 6 * s, w = Math.ceil((line.length * 6 - 1) * s) + 2 * pad, a = new Float32Array(w * h), sh = italic ? 0.2 : 0;
    [...line].forEach((ch, k) => { const gl = glyph(ch), x0 = k * adv;
      for (let y = 0; y < h; y++) { const gy = Math.floor((y - (base - 7 * s)) / s); if (gy < 0 || gy > 8) continue;
        const off = sh * (base - y);
        for (let x = 0; x < adv; x++) { const gx = Math.floor(x / s); if (gx > 4) continue; if (gl[gy][gx] === "1") { const X = Math.round(x0 + x + off - sh * base * 0.5 + pad); if (X >= 0 && X < w) a[y * w + X] = 1; } } } });
    out.push({ w, h, a, base });
  }
  return out;
}
// Stack the lines centred at the bottom (or top) of the picture: returns a document-size coverage map and line rectangles
function placeSubtitle(bitmaps, W, H, rect, sizePx, st) {
  const cov = new Float32Array(W * H), rects = [], pitch = sizePx * (st.lineSpacing || 1.3), n = bitmaps.length, margin = 0.075 * rect.h; // safe-area margin [EST]
  const firstBase = st.position === "top" ? rect.y + margin + sizePx : rect.y + rect.h - margin - sizePx * 0.3 - (n - 1) * pitch;
  bitmaps.forEach((b, k) => {
    if (!b) return;
    const baseY = firstBase + k * pitch, top = Math.round(baseY - b.base), left = Math.round(rect.x + (rect.w - b.w) / 2);
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < b.h; y++) { const Y = top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < b.w; x++) { const X = left + x, v = b.a[y * b.w + x]; if (X < 0 || X >= W || v <= 0) continue; cov[Y * W + X] = Math.max(cov[Y * W + X], v); if (v > 0.2) { if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } } }
    if (x1 > x0) rects.push({ x0: x0 - sizePx * 0.3, x1: x1 + sizePx * 0.3, y0: baseY - sizePx * 0.95, y1: baseY + sizePx * 0.32 });
  });
  return { cov, rects };
}
function boxBlur(src, w, h, rx, ry) { // separable box blur, radii in samples (fractional ok via two passes)
  const out = Float32Array.from(src), tmp = new Float32Array(src.length);
  const pass = (a, b, n, stride, count, r) => { r = Math.max(0, Math.round(r)); if (!r) { b.set(a); return; } for (let c = 0; c < count; c++) { const o = c * (stride === 1 ? n : 1), st = stride === 1 ? 1 : stride; let acc = 0; for (let i = -r; i <= r; i++) acc += a[o + Math.min(n - 1, Math.max(0, i)) * st]; for (let i = 0; i < n; i++) { b[o + i * st] = acc / (2 * r + 1); acc += a[o + Math.min(n - 1, i + r + 1) * st] - a[o + Math.max(0, i - r) * st]; } } };
  pass(out, tmp, w, 1, h, rx); pass(tmp, out, h, w, w, ry); return out;
}
/* Burn the subtitle into an R'G'B' grid. cov: coverage on the grid; rects: line rectangles in grid samples/rows;
 * sizeRows: font size in grid rows; hScale: grid samples per row-height unit (anisotropy). */
function subtitleComposite(grid, g, st, cov, rects, sizeRows, hScale, seed) {
  const ns = g.ns, nl = g.lines, n = ns * nl, [R, G, B] = grid, fill = SUB_COL[st.colour] || SUB_COL.white, k = st.strength === undefined ? 1 : st.strength;
  const rnd = VT.mulberry32(((seed || 1) * 4957) >>> 0), rx = r => r * sizeRows * hScale, ry = r => r * sizeRows;
  const inRect = (x, y) => rects.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
  let c = cov, dark = null, mul = 1;
  if (st.edge === "outline") { const e = boxBlur(cov, ns, nl, rx(0.07), ry(0.07)); dark = Float32Array.from(e, v => Math.min(1, v * 3.5)); }
  else if (st.edge === "shadow") { const sh = shiftCov(cov, ns, nl, rx(0.07), ry(0.07)); dark = boxBlur(sh, ns, nl, rx(0.015), ry(0.015)); mul = 0.85; }
  else if (st.edge === "softshadow") { const sh = shiftCov(cov, ns, nl, rx(0.06), ry(0.07)); dark = Float32Array.from(boxBlur(boxBlur(sh, ns, nl, rx(0.05), ry(0.05)), ns, nl, rx(0.04), ry(0.04)), v => Math.min(1, v * 2.6)); mul = 0.88; }
  else if (st.edge === "halo") { const e = boxBlur(cov, ns, nl, rx(0.03), ry(0.03)); dark = Float32Array.from(e, (v, i) => Math.max(0, Math.min(1, v * 3) - cov[i])); mul = 0.6; }
  else if (st.edge === "ragged") { const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = VT.gaussRand(rnd); const nb = boxBlur(nz, ns, nl, 1, 1); c = Float32Array.from(cov, (v, i) => v <= 0 ? 0 : Math.max(0, Math.min(1, (v - 0.5 + 0.45 * nb[i]) * 3 + 0.5))); }
  else if (st.edge === "bitmap4") { const e = boxBlur(cov, ns, nl, rx(0.05), ry(0.05)); dark = Float32Array.from(e, v => v > 0.06 ? 1 : 0); c = Float32Array.from(cov, v => v > 0.62 ? 1 : v > 0.22 ? 0.55 : 0); }
  for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const i = y * ns + x;
    if ((st.edge === "box" || st.edge === "greylabel" || st.edge === "ghostbox") && rects.length && inRect(x, y)) {
      if (st.edge === "box") { R[i] = G[i] = B[i] = 0; }
      else { const yv = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i], f = st.edge === "greylabel" ? 0.4 : 0.5; if (st.edge === "greylabel") { R[i] = G[i] = B[i] = yv * f; } else { R[i] *= f; G[i] *= f; B[i] *= f; } }
    }
    if (dark && dark[i] > 0) { const d = 1 - Math.min(1, dark[i] * mul * k); R[i] *= d; G[i] *= d; B[i] *= d; }
    const cv = c[i];
    if (cv > 0) { const f = st.edge === "bitmap4" && cv < 1 ? [0.55, 0.55, 0.55] : fill; R[i] = R[i] * (1 - cv) + f[0] * cv; G[i] = G[i] * (1 - cv) + f[1] * cv; B[i] = B[i] * (1 - cv) + f[2] * cv; }
  }
  if (st.edge === "halo") { const m = Math.round(n * 2e-5 + 3); for (let k2 = 0; k2 < m * 20; k2++) { const i = Math.floor(rnd() * n); if (cov[i] > 0.8 && rnd() < 0.05) { R[i] *= 0.3; G[i] *= 0.3; B[i] *= 0.35; } } } // laser residue specks [SEC patent; density EST]
  return grid;
}
function shiftCov(cov, w, h, dx, dy) { const out = new Float32Array(cov.length), ix = Math.round(dx), iy = Math.round(dy); for (let y = 0; y < h; y++) { const sy = y - iy; if (sy < 0 || sy >= h) continue; for (let x = 0; x < w; x++) { const sx = x - ix; if (sx >= 0 && sx < w) out[y * w + x] = cov[sy * w + sx]; } } return out; }

/* US closed captions (EIA-608): drawn by the decoder in the set: white capitals in a monospaced cell grid, each character on
 * an opaque black cell; 32 columns x 15 rows [SPEC]; the rows sit in the safe area (grid 80% x 80% of the picture, EST);
 * the decoder's own low-resolution font is not documented: VideoLook's dot font stands in [EST]. */
function closedCaptions(grid, g, o) {
  const ns = g.ns, nl = g.lines, wrap = l => { const out = []; let cur = ""; for (const w of l.split(/\s+/).filter(Boolean)) { if ((cur + " " + w).trim().length > 32) { if (cur) out.push(cur); cur = w.slice(0, 32); } else cur = (cur + " " + w).trim(); } if (cur) out.push(cur); return out; },
    lines = [].concat(...subLines(Object.assign({}, o, { caps: o.caps && o.caps !== "style" ? o.caps : "caps" })).filter(l => l.trim().length).map(wrap)).slice(-4); // 32 columns, up to 4 rows [SPEC]
  const areaW = ns * 0.8, areaH = nl * 0.8, x0 = (ns - areaW) / 2, y0 = (nl - areaH) / 2, cw = areaW / 32, rh = areaH / 15, [R, G, B] = grid;
  const italic = o.italic === "on";
  lines.forEach((line, k) => {
    const row = 14 - (lines.length - 1 - k), col0 = Math.floor((32 - line.length) / 2);
    const text = " " + line + " "; // a leading and trailing space cell, as caption encoders sent
    [...text].forEach((ch, j) => {
      const cx0 = x0 + (col0 - 1 + j) * cw, cy0 = y0 + row * rh, gl = glyph(ch);
      for (let y = Math.floor(cy0); y < Math.min(nl, Math.ceil(cy0 + rh)); y++) { const gy = Math.floor((y - cy0) / rh * 10) - 1;
        for (let x = Math.floor(cx0); x < Math.min(ns, Math.ceil(cx0 + cw)); x++) { if (x < 0) continue; const sh = italic ? (7 - gy) * 0.15 : 0, gx = Math.floor((x - cx0) / cw * 6 - 0.5 - sh);
          const on = gy >= 0 && gy < 9 && gx >= 0 && gx < 5 && gl[gy][gx] === "1", i = y * ns + x;
          if (on) { R[i] = G[i] = B[i] = 1; } else { R[i] = G[i] = B[i] = 0; } } }
    });
  });
  const bw = Math.min(4.2e6, g.bw || 4.2e6); for (const p of grid) VT.filterRows(p, ns, nl, VT.lp3dB(bw, g.fs, VT.tw(bw, 1.5e6)));
  return grid;
}

const api = { teletext, timestamp, glyph, SUB_STYLES, subStyle, subLines, rasterFallback, placeSubtitle, subtitleComposite, closedCaptions };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLText = api;
