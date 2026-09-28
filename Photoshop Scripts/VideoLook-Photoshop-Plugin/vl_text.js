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

const api = { teletext, timestamp, glyph };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLText = api;
