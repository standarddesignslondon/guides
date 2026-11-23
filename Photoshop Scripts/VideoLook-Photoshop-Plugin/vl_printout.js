/* VideoLook: instant film, computer print-out and pictures by cable (v1.7). More kinds for the Screen to paper stage:
 * they run on the finished picture, at the document's size, like the video printers and fax. Options live in
 * paper.out. Sources and estimates: VideoLook-References/_research/P_batch4_capture_instant_printout_cable.md.
 * [EST] = no source gave a figure. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const TX = (typeof require !== "undefined") ? require("./vl_text.js") : globalThis.VLText;

const KINDS = {
  instant: "Instant film (Polaroid, Instax)",
  lineprinter: "Line printer (characters, overprinted)",
  rtty: "Teleprinter picture (RTTY art)",
  dotmatrix: "Dot-matrix printer (9-pin)",
  plotter: "Pen plotter (hatching)",
  receipt: "Thermal receipt printer",
  bartlane: "Bartlane cable picture (1920s)",
  fultograph: "Fultograph radio picture (1928)",
  hell: "Hellschreiber tape",
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const toLin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const toSRGB = v => { v = clamp01(v); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
const hex = h => [0, 2, 4].map(j => parseInt(h.slice(j, j + 2), 16) / 255);
function luma(pic) { const n = pic[0].length, Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * pic[0][i] + 0.587 * pic[1][i] + 0.114 * pic[2][i]; return Y; }
function wander(n, len, rnd) { const a = new Float32Array(n); let v = 0, t = 0; for (let i = 0; i < n; i++) { t += (V.gaussRand(rnd) - t) / Math.max(1, len); v += t / Math.max(1, len) * 2; v *= 0.995; a[i] = v; } let m = 0; for (const x of a) m = Math.max(m, Math.abs(x)); if (m > 0) for (let i = 0; i < n; i++) a[i] /= m; return a; }
// ink coverage map (0 = paper, 1 = full ink) laid on paper, in linear light
function inkOnPaper(cov, ink, paper) { const n = cov.length; return [0, 1, 2].map(c => { const a = new Float32Array(n), il = toLin(ink[c]), pl = toLin(paper[c]); for (let i = 0; i < n; i++) a[i] = toSRGB(pl + (il - pl) * clamp01(cov[i])); return a; }); }
function smoothNoise(w, h, scale, rnd) { const a = new Float32Array(w * h); for (let i = 0; i < a.length; i++) a[i] = V.gaussRand(rnd); const s = Math.max(0.5, scale); CAM.blur2D(a, w, h, s, s); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v)); if (m) for (let i = 0; i < a.length; i++) a[i] /= m; return a; }

/* ---- instant film. Polaroid SX-70 (1972): integral film, picture area about 79 x 79 mm, develops in minutes and can be
 * pushed about with a stylus while it develops [SEC Wikipedia; Polaroid]. Polaroid 600 (1981), Spectra (1986) and
 * peel-apart pack films; Fujifilm Instax Mini, picture 62 x 46 mm [SEC Fujifilm]. The rollers spread the reagent as the
 * picture leaves the camera; dirty rollers are the commonest cause of marks [SEC Polaroid support], and reagent that
 * does not reach an edge leaves it undeveloped [OBS]. Each film's colour, contrast and softness here are [EST]; the
 * picture keeps the document's shape (no square crop) unless the frame is turned on. */
const FILMS = {
  sx70: { black: "2A2A30", white: "F2E8D2", con: 0.75, sat: 0.8, soft: 1.4, vig: 0.25, shadow: [0.02, 0.05, 0.04], high: [0.03, 0.0, -0.05] },
  p600: { black: "18181E", white: "F6F0E2", con: 0.95, sat: 0.95, soft: 0.9, vig: 0.18, shadow: [0.0, 0.02, 0.05], high: [0.02, 0.01, -0.02] },
  spectra: { black: "1C1A1E", white: "F4EEE4", con: 0.9, sat: 0.9, soft: 0.9, vig: 0.2, shadow: [0.02, 0.0, 0.04], high: [0.03, 0.01, -0.02] },
  peel: { black: "141A20", white: "EEF0EA", con: 0.9, sat: 0.85, soft: 0.7, vig: 0.12, shadow: [-0.01, 0.04, 0.06], high: [0.0, 0.01, 0.0] },
  instax: { black: "151517", white: "F7F6F2", con: 1.05, sat: 1.05, soft: 0.6, vig: 0.1, shadow: [0.0, 0.01, 0.03], high: [0.0, 0.0, 0.0] },
  bw: { black: "1A1816", white: "EEEBE4", con: 1.1, sat: 0, soft: 0.8, vig: 0.15, shadow: [0, 0, 0], high: [0.01, 0.0, -0.02] },
};
function instant(pic, w, h, o, rnd) {
  const F = FILMS[o.film] || FILMS.p600, n = w * h, s = Math.min(w, h);
  const fr = o.frame ? [0.06, 0.06, 0.06, o.film === "instax" ? 0.16 : 0.22] : null; // l, t, r, bottom chin [SEC proportions approx; EST]
  const ix = fr ? Math.round(fr[0] * s) : 0, iy = fr ? Math.round(fr[1] * s) : 0, iw = fr ? w - ix - Math.round(fr[2] * s) : w, ih = fr ? h - iy - Math.round(fr[3] * s) : h;
  let P = fr ? pic.map(p => V.resize(p, w, h, iw, ih)) : pic.map(p => Float32Array.from(p)); const m = iw * ih;
  // manipulation (SX-70): the emulsion pushed about while soft, as swirling smears [EST]
  if (o.manipulate) { const dx = smoothNoise(iw, ih, s * 0.03, rnd), dy = smoothNoise(iw, ih, s * 0.03, rnd), amt = o.manipulate * s * 0.09;
    P = P.map(p => { const q = new Float32Array(m); for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const sx = Math.max(0, Math.min(iw - 1, x + dx[y * iw + x] * amt)), sy = Math.max(0, Math.min(ih - 1, y + dy[y * iw + x] * amt)); q[y * iw + x] = p[Math.round(sy) * iw + Math.round(sx)]; } return q; }); }
  const soft = (F.soft + (o.soft || 0)) * s / 1000; if (soft > 0.3) P.forEach(p => CAM.blur2D(p, iw, ih, soft, soft));
  const age = o.expired || 0, bl = hex(F.black), wh = hex(F.white), blot = smoothNoise(iw, ih, s * 0.08, rnd);
  const out = [0, 1, 2].map(() => new Float32Array(m));
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const i = y * iw + x, u = x / iw - 0.5, v = y / ih - 0.5;
    const Y = 0.299 * P[0][i] + 0.587 * P[1][i] + 0.114 * P[2][i];
    for (let c = 0; c < 3; c++) {
      let t = Y + (P[c][i] - Y) * F.sat * (1 - 0.6 * age);
      t = 0.5 + (t - 0.5) * F.con * (1 - 0.35 * age); t = 1 / (1 + Math.exp(-5 * (t - 0.5))); t = (t - 0.0759) / 0.8482; // soft shoulder and toe
      t += F.shadow[c] * (1 - t) + F.high[c] * t + age * [0.08, -0.02, -0.06][c] * (0.5 + 0.5 * t); // casts: shadows and highlights; age drifts warm and loses density [EST]
      t *= 1 - F.vig * (u * u + v * v) * 2; t += (o.uneven || 0.04) * blot[i] * (1 + age);
      out[c][i] = bl[c] + (wh[c] - bl[c]) * clamp01(t);
    } }
  // chemistry that did not reach one edge (a pale ragged band), roller marks across the picture [EST]
  if (o.edgeChem) { const ed = Math.max(2, o.edgeChem * ih * 0.12), wv = smoothNoise(iw, 1, iw * 0.03, rnd);
    for (let x = 0; x < iw; x++) { const lim = ed * (0.4 + 0.6 * Math.abs(wv[x])); for (let y = 0; y < lim; y++) { const f = 1 - y / lim; for (let c = 0; c < 3; c++) { const i = (ih - 1 - y) * iw + x; out[c][i] = out[c][i] + (wh[c] * [0.98, 0.93, 0.8][c] - out[c][i]) * Math.min(1, f * 1.4); } } } }
  if (o.rollers) { const per = Math.max(4, Math.round(ih * 0.21)), ph = Math.floor(rnd() * per); for (let y = 0; y < ih; y++) if ((y + ph) % per < Math.max(1, ih * 0.003)) for (let x = 0; x < iw; x++) { const k = 0.85 + 0.1 * rnd(); for (let c = 0; c < 3; c++) out[c][y * iw + x] *= o.rollers > 0 ? k : 1; } }
  if (!fr) return out;
  const fc = hex(o.frameColour || "F4F3EE"); return [0, 1, 2].map(c => { const a = new Float32Array(n).fill(fc[c]); for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) a[(y + iy) * w + x + ix] = out[c][y * iw + x]; return a; });
}

/* ---- characters on paper: the line printer and the teleprinter. IBM 1403: up to 132 print positions, 6 or 8 lines to
 * the inch [SEC IBM manual A24-3073; Wikipedia]. Pictures were built from characters chosen for their darkness, darker
 * ones by printing over the same place again; RTTY artists used the backspace to overprint on uppercase-only teleprinters
 * (Baudot, five-bit) [SEC Wikipedia Text art / RTTY; RTTY art archives]. 10 characters to the inch, the paper colours,
 * hammer and ribbon unevenness [EST]. The characters are drawn from VideoLook's own 5 x 9 font. */
const LP_SET = " .,'-:;=+i!lI/*()1tjrcvxzsunaeoTYV7LJ0C5SZ2FEP3H4K6O9AUQGDR8XB&%#MWN@";
// IBM 1403 print chains were usually upper case only (the 48-character sets) [SEC IBM 1403 manuals]; "full" adds lower case
const LP_UPPER = " .,'-:;=+/*()&%#@$0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".replace("$", "");
const RTTY_SET = " .,'-:;=+/()?1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const covCache = new Map();
function coverage(ch) { if (covCache.has(ch)) return covCache.get(ch); const g = TX.glyph(ch); let k = 0; for (let y = 0; y < 9; y++) for (let x = 0; x < 5; x++) if (g[y][x] === "1") k++; const c = ch === " " ? 0 : k / 45; covCache.set(ch, c); return c; }
function union(chs) { let k = 0; for (let y = 0; y < 9; y++) for (let x = 0; x < 5; x++) if (chs.some(ch => ch !== " " && TX.glyph(ch)[y][x] === "1")) k++; return k / 45; }
function chars(pic, w, h, o, rnd, rtty) {
  const cols = Math.max(20, Math.round(o.cols || (rtty ? 72 : 132))), cw = w / cols, chh = cw * (o.cpi || 10) / (o.lpi || 6), rows = Math.max(4, Math.floor(h / chh));
  const set = [...(rtty ? RTTY_SET : o.charset === "full" ? LP_SET : LP_UPPER)], over = Math.max(1, Math.min(3, Math.round(o.overprint || (rtty ? 2 : 2))));
  // candidate stacks (single characters, then pairs and triples of the darkest few) with their coverage
  const cands = set.map(c => [[c], coverage(c)]); if (over > 1) { const dk = set.slice().sort((a, b) => coverage(b) - coverage(a)).slice(0, 10);
    for (let i = 0; i < dk.length; i++) for (let j = i + 1; j < dk.length; j++) { cands.push([[dk[i], dk[j]], union([dk[i], dk[j]])]); if (over > 2) for (let k = j + 1; k < Math.min(dk.length, j + 4); k++) cands.push([[dk[i], dk[j], dk[k]], union([dk[i], dk[j], dk[k]])]); } }
  const maxC = Math.max(...cands.map(c => c[1])); cands.sort((a, b) => a[1] - b[1]);
  const Y = V.resize(luma(pic), w, h, cols, rows), con = o.contrast || 1.2, cov = new Float32Array(w * h);
  const pickAt = d => { let best = cands[0], bd = 9; for (const c of cands) { const e = Math.abs(c[1] / maxC - d) + 0.01 * c[0].length; if (e < bd) { bd = e; best = c; } } return best[0]; };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.pow(clamp01((1 - Y[r * cols + c] - 0.5) * con + 0.5 + (o.darken || 0)), o.tone || 1.6), stack = pickAt(d); // tone: closely set characters look darker than their ink [EST]
    stack.forEach((ch, si) => { if (ch === " ") return; const g = TX.glyph(ch), strike = 0.75 + 0.25 * rnd(), jx = (rnd() - 0.5) * (o.jitter !== undefined ? o.jitter : 0.15) * cw / 5, jy = (rnd() - 0.5) * (o.jitter !== undefined ? o.jitter : 0.15) * chh / 9 + (si ? (rnd() - 0.5) * 0.3 : 0);
      const x0 = c * cw + cw * 0.1, y0 = r * chh + chh * 0.08, dx = cw * 0.8 / 5, dy = chh * 0.84 / 9;
      for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx] === "1") { const xa = Math.floor(x0 + gx * dx + jx), xb = Math.ceil(x0 + (gx + 1) * dx + jx), ya = Math.floor(y0 + gy * dy + jy), yb = Math.ceil(y0 + (gy + 1) * dy + jy);
        for (let yy = Math.max(0, ya); yy < Math.min(h, yb); yy++) for (let xx = Math.max(0, xa); xx < Math.min(w, xb); xx++) cov[yy * w + xx] = 1 - (1 - cov[yy * w + xx]) * (1 - strike); } });
  }
  const sp = Math.max(0.3, cw * 0.06); CAM.blur2D(cov, w, h, sp, sp);
  const ribbon = o.ribbon !== undefined ? o.ribbon : 0.85, fade = wander(h, h / 3, rnd); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cov[y * w + x] *= ribbon * (1 - 0.1 * fade[y]);
  const paperC = hex(o.paperColour || (rtty ? "F3E9B8" : "F2F2EC")), out = inkOnPaper(cov, hex(o.ink || "1C1C24"), paperC);
  if (!rtty && o.greenbar !== false) { const band = 3 * chh, gb = hex("D8EAD6"); for (let y = 0; y < h; y++) if (Math.floor(y / band) % 2 === 1) for (let x = 0; x < w; x++) { const i = y * w + x, k = 1 - cov[i]; for (let c = 0; c < 3; c++) out[c][i] = out[c][i] * (1 - k) + gb[c] * k * (out[c][i] / Math.max(1e-3, paperC[c])); } }
  return out;
}

/* ---- dot-matrix printer: a column of 9 pins (8 used for graphics) striking through a ribbon, printing a band of rows
 * at a time; 60 or 120 dots to the inch across in graphics modes (Epson FX-80, LX-80 manuals), rows 1/72 inch apart
 * [SEC Epson manuals]. Bands that do not quite meet, the ribbon drying out down the page, round dots [EST]. */
const BAY8 = (() => { const m = new Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, xx = x, yy = y; for (let b = 0; b < 3; b++) { v = (v << 2) | (((xx & 1) ^ (yy & 1)) << 1 | (yy & 1)); xx >>= 1; yy >>= 1; } m[y * 8 + x] = v; } return m; })();
function dither(Y, dw, dh, mode, con, rnd) { const bits = new Uint8Array(dw * dh);
  if (mode === "fs") { const e = Float32Array.from(Y, v => clamp01((v - 0.5) * con + 0.5)); for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const i = y * dw + x, old = e[i], nv = old < 0.5 ? 0 : 1, er = old - nv; bits[i] = nv ? 0 : 1;
      if (x + 1 < dw) e[i + 1] += er * 7 / 16; if (y + 1 < dh) { if (x) e[i + dw - 1] += er * 3 / 16; e[i + dw] += er * 5 / 16; if (x + 1 < dw) e[i + dw + 1] += er / 16; } } }
  else if (mode === "threshold") for (let i = 0; i < bits.length; i++) bits[i] = clamp01((Y[i] - 0.5) * con + 0.5) < 0.5 ? 1 : 0;
  else for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const i = y * dw + x; bits[i] = clamp01((Y[i] - 0.5) * con + 0.5) < (BAY8[(y & 7) * 8 + (x & 7)] + 0.5) / 64 ? 1 : 0; }
  return bits; }
function splatDots(bits, dw, dh, w, h, rad, gain, offX, offY) { // round dots onto the page
  const cov = new Float32Array(w * h), sx = w / dw, sy = h / dh, R = rad, r2 = R * R;
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { if (!bits[y * dw + x]) continue; const cx = (x + 0.5) * sx + (offX ? offX(y) : 0), cy = (y + 0.5) * sy + (offY ? offY(y) : 0), g = gain(x, y);
    for (let yy = Math.max(0, Math.floor(cy - R)); yy <= Math.min(h - 1, Math.ceil(cy + R)); yy++) for (let xx = Math.max(0, Math.floor(cx - R)); xx <= Math.min(w - 1, Math.ceil(cx + R)); xx++) { const d2 = (xx - cx) ** 2 + (yy - cy) ** 2; if (d2 <= r2) { const i = yy * w + xx, a = g * (1 - 0.35 * d2 / r2); cov[i] = 1 - (1 - cov[i]) * (1 - a); } } }
  return cov; }
function dotmatrix(pic, w, h, o, rnd) {
  const inches = o.width || 8, dpi = o.dpi || 60, dw = Math.round(inches * dpi), dh = Math.round(inches * h / w * 72);
  const bits = dither(V.resize(luma(pic), w, h, dw, dh), dw, dh, o.dither || "fs", o.contrast || 1.1, rnd);
  const band = 8, nb = Math.ceil(dh / band), bandX = [], bandY = [], mis = o.bandError !== undefined ? o.bandError : 0.3;
  for (let b = 0; b < nb; b++) { bandX.push((rnd() - 0.5) * mis * (w / dw) * 1.5); bandY.push((rnd() - 0.5) * mis * (h / dh) * 1.2); }
  const fade = o.ribbonFade !== undefined ? o.ribbonFade : 0.3, rib = wander(dw, dw / 4, rnd);
  const rad = Math.max(0.7, (o.dot || 0.75) * h / dh), dens = o.density || 0.85;
  const cov = splatDots(bits, dw, dh, w, h, rad, (x, y) => dens * (1 - fade * y / dh * 0.6) * (1 - 0.12 * rib[x]) * (0.85 + 0.15 * rnd()), y => bandX[Math.floor(y / band)], y => bandY[Math.floor(y / band)]);
  return inkOnPaper(cov, hex(o.ink || "202026"), hex(o.paperColour || "F3F2EC"));
}

/* ---- thermal receipt printer: 384 dots across a 58 mm roll (48 mm printed), 8 dots to the mm, 203 dpi [SEC maker
 * specifications]. One bit a dot, so greys are dithered; a dead heating element leaves a white line down the roll;
 * paper fades [EST]. */
function receipt(pic, w, h, o, rnd) {
  const dw = Math.round(o.dots || 384), dh = Math.max(8, Math.round(dw * h / w)), bits = dither(V.resize(luma(pic), w, h, dw, dh), dw, dh, o.dither || "fs", o.contrast || 1.15, rnd);
  const dead = []; for (let k = 0; k < Math.round(o.deadDots || 0); k++) dead.push(Math.floor(rnd() * dw));
  for (const x of dead) for (let y = 0; y < dh; y++) bits[y * dw + x] = 0;
  const feed = wander(dh, dh / 6, rnd), fj = o.feed || 0;
  const cov = splatDots(bits, dw, dh, w, h, Math.max(0.6, 0.72 * w / dw), () => (1 - (o.fade || 0)), null, fj ? y => fj * feed[y] * h / dh : null);
  return inkOnPaper(cov, hex(o.ink || "26262C"), hex(o.paperColour || "F4F3EF"));
}

/* ---- pen plotter: felt-tip pens on paper, tone made by hatching in more directions as it darkens. HP 7475A (1983): a
 * carousel of six pens, resolution 0.025 mm, up to about 38 cm/s [SEC computerwoche 1983; musée patstec]. The
 * hatching scheme, line spacing, pen colours and wobble are [EST]. */
const PENSETS = { black: ["111111"], cmyk: ["1AA0D8", "D8207A", "F0D020", "111111"], primaries: ["111111", "D82020", "2040C0", "20A040"], sepia: ["3A2414"] };
function plotter(pic, w, h, o, rnd) {
  const pens = (PENSETS[o.pens] || PENSETS.black).map(hex), n = w * h, s = Math.min(w, h), sp = Math.max(2, (o.spacing || 0.012) * s), lw = Math.max(0.5, (o.lineWidth || 0.22) * sp / 2); // lw: half the pen's line width
  const sm = pic.map(p => { const q = Float32Array.from(p); CAM.blur2D(q, w, h, sp * 0.6, sp * 0.6); return q; });
  // pen densities
  const dens = pens.map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) { const r = sm[0][i], g = sm[1][i], b = sm[2][i];
    if (pens.length === 1) dens[0][i] = 1 - (0.299 * r + 0.587 * g + 0.114 * b);
    else if (o.pens === "cmyk") { const k = 1 - Math.max(r, g, b); dens[3][i] = Math.max(0, k - 0.35) / 0.65; const d = 1 - k + 1e-6; dens[0][i] = (1 - r - k) / d; dens[1][i] = (1 - g - k) / d; dens[2][i] = (1 - b - k) / d; for (let c = 0; c < 3; c++) dens[c][i] *= 1 - k * 0.15; }
    else { const k = 1 - Math.max(r, g, b); dens[0][i] = Math.max(0, k - 0.3) / 0.7; dens[1][i] = Math.max(0, r - Math.max(g, b)) * 2.6; dens[2][i] = Math.max(0, b - Math.max(r, g)) * 2.6; dens[3][i] = Math.max(0, g - Math.max(r, b)) * 2.6; } }
  const thr = [0.12, 0.35, 0.58, 0.8], wob = smoothNoise(w, h, s * 0.05, rnd), con = o.contrast || 1.1;
  const lin = [0, 1, 2].map(c => new Float32Array(n).fill(toLin(hex(o.paperColour || "F6F4EE")[c])));
  pens.forEach((pc, pi) => { const base = (o.angle !== undefined ? o.angle : 45) + pi * 15;
    for (let L = 0; L < 4; L++) { const a = (base + L * 45) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), ph = rnd() * sp;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (clamp01((dens[pi][i] - 0.5) * con + 0.5) <= thr[L]) continue;
        const t = x * ca + y * sa + ph + wob[i] * sp * (o.wobble !== undefined ? o.wobble : 0.3); let d = Math.abs(t - Math.round(t / sp) * sp); if (d > lw) continue; const cov = 0.9 * Math.min(1, (lw - d) / Math.max(0.5, lw * 0.5));
        for (let c = 0; c < 3; c++) lin[c][i] *= 1 - cov * (1 - toLin(pc[c])); } } });
  return lin.map(p => p.map(toSRGB));
}

/* ---- Bartlane cable picture (Daily Mirror's Bartholomew and McFarlane, 1920; transatlantic from 1921): the picture
 * coded as levels on punched tape, sent by submarine cable in under three hours, and printed at the far end by a
 * telegraph printer fitted with typefaces that simulated a halftone; 5 levels at first, 15 from 1929, when a
 * photographic process was also used [SEC Wikipedia; Imaging Resource 2013; Kobayashi 2002]. The typeface shapes, cell
 * count and tape errors are [EST]. */
function bartlane(pic, w, h, o, rnd) {
  const lv = o.levels === 15 ? 15 : 5, cols = Math.max(20, Math.round(o.cols || 90)), cs = w / cols, rows = Math.max(8, Math.round(h / cs));
  const Y = V.resize(luma(pic), w, h, cols, rows), q = new Float32Array(cols * rows), con = o.contrast || 1.2;
  for (let i = 0; i < q.length; i++) { let k = Math.round(clamp01((Y[i] - 0.5) * con + 0.5) * (lv - 1)); if (rnd() < (o.errors || 0)) k = Math.floor(rnd() * lv); q[i] = k / (lv - 1); }
  if (o.mode === "photo") { // 1929 photographic reproduction: continuous levels, softened cells on a print [EST]
    const up = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) up[y * w + x] = q[Math.min(rows - 1, Math.floor(y / h * rows)) * cols + Math.min(cols - 1, Math.floor(x / cs))];
    CAM.blur2D(up, w, h, cs * 0.25, cs * 0.25); const lines = o.lineMarks !== undefined ? o.lineMarks : 0.15;
    for (let y = 0; y < h; y++) { const f = 1 - lines * Math.pow(Math.cos(Math.PI * ((y / h * rows) % 1)), 8); for (let x = 0; x < w; x++) up[y * w + x] *= f; }
    return inkOnPaper(up.map(v => 1 - v), hex("2A2018"), hex("EFE6D4")); }
  const cov = new Float32Array(w * h); // typefaces: blank, small dot, larger dot, cross of bars, near-solid block [EST shapes]
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = Math.round((1 - q[r * cols + c]) * (lv - 1)) / (lv - 1); if (k <= 0.01) continue; const x0 = c * cs, y0 = r * (h / rows), ch = h / rows;
    for (let yy = Math.floor(y0); yy < Math.min(h, Math.ceil(y0 + ch)); yy++) for (let xx = Math.floor(x0); xx < Math.min(w, Math.ceil(x0 + cs)); xx++) { const u = (xx - x0) / cs - 0.5, v = (yy - y0) / ch - 0.5; let on;
      if (k < 0.3) on = u * u + v * v < 0.035; else if (k < 0.6) on = u * u + v * v < 0.11; else if (k < 0.9) on = Math.abs(u) < 0.17 || Math.abs(v) < 0.17 || u * u + v * v < 0.12; else on = Math.abs(u) < 0.42 && Math.abs(v) < 0.42;
      if (on) cov[yy * w + xx] = 0.92 * (0.85 + 0.15 * rnd()); } }
  CAM.blur2D(cov, w, h, Math.max(0.4, cs * 0.05), Math.max(0.4, cs * 0.05));
  return inkOnPaper(cov, hex("1E1C1A"), hex(o.paperColour || "ECE6D6"));
}

/* ---- Fultograph (1928): pictures by radio at home. The set's loudspeaker output drove a stylus over paper soaked in
 * potassium iodide and starch, wound on a turning drum; current darkened the paper. A picture of up to 9 x 13 cm took
 * about four minutes, on a grid given as 700 x 800 [SEC Wikipedia; Museums Victoria; Deutsches Museum record; Papers Past
 * 1929]. Iodine and starch stain blue-black [SEC chemistry]; the shade used here, fading, crackle and loss of step
 * between drums are [EST]. */
function fultograph(pic, w, h, o, rnd) {
  const lines = Math.max(40, Math.round(o.lines || 260)), Y = V.resize(luma(pic), w, h, w, lines), lh = h / lines;
  const fadeA = o.fading !== undefined ? o.fading : 0.35, fd = wander(lines, lines / 8, rnd), slip = o.slip || 0, stat = o.static !== undefined ? o.static : 0.03;
  const cov = new Float32Array(w * h); let off = 0;
  for (let L = 0; L < lines; L++) { off += slip * (0.3 + rnd()) * w * 0.002; if (rnd() < slip * 0.02) off += (rnd() - 0.5) * w * 0.1;
    const gain = Math.max(0.05, 1 - fadeA * (0.5 + 0.5 * fd[L]));
    for (let x = 0; x < w; x++) { const sx = ((x - off) % w + w) % w; let d = (1 - Y[L * w + Math.floor(sx)]) * gain;
      if (rnd() < stat * 0.02) d += 0.6 + 0.4 * rnd();
      for (let yy = Math.floor(L * lh); yy < Math.min(h, Math.floor((L + 1) * lh)); yy++) { const v = (yy - L * lh) / lh; cov[yy * w + x] = clamp01(d * (o.contrast || 1.3)) * (0.75 + 0.25 * Math.sin(Math.PI * v)); } } }
  return inkOnPaper(cov, hex(o.ink || "2A2448"), hex(o.paperColour || "EDE4CC"));
}

/* ---- Hellschreiber (late 1920s, used from the 1930s, on press lines into the 1980s): text sent as columns of 7 x 7
 * dots and printed on a paper tape by a turning helix, which prints every column twice, one copy below the other, so
 * timing errors make the print slant without losing the text [SEC Wikipedia Hellschreiber]. Hell was a text system: here
 * the picture itself is cut into bands 7 dots high and sent as if it were text, the strips of tape stacked to rebuild
 * it [EST: VideoLook's own use]. */
function hell(pic, w, h, o, rnd) {
  const tapes = Math.max(3, Math.round(o.tapes || 14)), gap = o.gap !== undefined ? o.gap : 0.18, th = h / tapes, ps = th * (1 - gap) / 14, cols = Math.max(16, Math.floor(w / ps));
  const Y = V.resize(luma(pic), w, h, cols, tapes * 7), bits = dither(Y, cols, tapes * 7, o.dither || "threshold", o.contrast || 1.4, rnd);
  const drift = o.drift !== undefined ? o.drift : 0.02, out = new Float32Array(w * h);
  const paper = hex(o.paperColour || "F2EEDC"), back = hex(o.backColour || "FFFFFF"), ink = hex(o.ink || "1E2A5A"), res = [0, 1, 2].map(c => new Float32Array(w * h).fill(back[c]));
  for (let t = 0; t < tapes; t++) { const y0 = t * th + th * gap / 2, ph0 = rnd() * 7;
    for (let y = Math.floor(y0); y < Math.min(h, Math.ceil(y0 + 14 * ps)); y++) for (let x = 0; x < w; x++) { const i = y * w + x; for (let c = 0; c < 3; c++) res[c][i] = paper[c]; }
    for (let cx = 0; cx < cols; cx++) { const phase = (ph0 + drift * cx * 7) % 7;
      for (let r = 0; r < 14; r++) { const sr = ((Math.floor(r - phase) % 7) + 7) % 7, row = t * 7 + (6 - sr); if (!bits[row * cols + cx]) continue;
        const yy0 = y0 + (13 - r) * ps, xx0 = cx * ps; for (let yy = Math.floor(yy0); yy < Math.min(h, Math.ceil(yy0 + ps)); yy++) for (let xx = Math.floor(xx0); xx < Math.min(w, Math.ceil(xx0 + ps)); xx++) out[yy * w + xx] = 0.9; } } }
  CAM.blur2D(out, w, h, Math.max(0.4, ps * 0.15), Math.max(0.4, ps * 0.15));
  for (let i = 0; i < w * h; i++) { const a = clamp01(out[i]); for (let c = 0; c < 3; c++) res[c][i] = toSRGB(toLin(res[c][i]) + (toLin(ink[c]) - toLin(res[c][i])) * a); }
  return res;
}

const FN = { instant, lineprinter: (p, w, h, o, r) => chars(p, w, h, o, r, false), rtty: (p, w, h, o, r) => chars(p, w, h, o, r, true), dotmatrix, plotter, receipt, bartlane, fultograph, hell };
const PAPER = { instant: "F4F3EE", lineprinter: "F2F2EC", rtty: "F3E9B8", dotmatrix: "F3F2EC", plotter: "F6F4EE", receipt: "F4F3EF", bartlane: "ECE6D6", fultograph: "EDE4CC", hell: "FFFFFF" };
function printout(pic, w, h, o, rnd) { const fn = FN[o.kind]; return fn ? fn(pic, w, h, o, rnd) : pic; }
const api = { KINDS, printout, PAPER, FILMS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLPrintout = api;
