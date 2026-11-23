/* VideoLook: screen to paper (v1.5). The finished picture as it came out of a machine that put pictures on paper:
 * a colour video printer, a black-and-white medical video printer, a Group 3 fax, a press wirephoto receiver, or a
 * weather-satellite APT picture printed line by line. Runs on the finished picture (sRGB code values, picture size).
 * Sources and estimates are in VideoLook-References/_research/N_batch2_videophones_vectors_paper.md; values not from a
 * source are marked [EST]. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const PO = (typeof require !== "undefined") ? require("./vl_printout.js") : globalThis.VLPrintout;

const KINDS = {
  dyesub: "Colour video printer (dye sublimation)",
  thermalbw: "Black-and-white video printer (medical, thermal)",
  fax: "Fax (Group 3, 1 bit)",
  wirephoto: "Wirephoto (drum, telephone line)",
  apt: "Weather satellite picture (NOAA APT)",
};
Object.assign(KINDS, PO.KINDS);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const toLin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const toSRGB = v => { v = clamp01(v); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
function luma(pic) { const n = pic[0].length, Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * pic[0][i] + 0.587 * pic[1][i] + 0.114 * pic[2][i]; return Y; }
function hex(h) { return [0, 2, 4].map(j => parseInt(h.slice(j, j + 2), 16) / 255); }
// nearest-neighbour enlargement (fax pels, which are hard-edged dots)
function nearest(src, sw, sh, dw, dh) {
  const o = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) { const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh)) * sw; for (let x = 0; x < dw; x++) o[y * dw + x] = src[sy + Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw))]; }
  return o;
}
// one-bit values (0 = black, 1 = white) to a print: ink colour on paper colour, in sRGB
function inkOnPaper(bits, ink, paper) { const n = bits.length; return [0, 1, 2].map(c => { const a = new Float32Array(n), il = toLin(ink[c]), pl = toLin(paper[c]); for (let i = 0; i < n; i++) a[i] = toSRGB(il + (pl - il) * clamp01(bits[i])); return a; }); }

/* --- colour video printer: dye sublimation (Sony Mavigraph UP-5000 class: a 720 x 468 frame from NTSC, on an
 * 8.25 x 5.75 in print [SEC Sony]). Yellow, magenta and cyan are laid down in three passes of a line thermal head;
 * heat left in the head carries into the next line (the reason Sony added thermal transient correction [SEC Sony 1989]),
 * so dark areas drag a little in the feed direction. Element-to-element gain differences make faint streaks along the
 * feed, the passes do not quite register, and the dyes are not pure [EST for the amounts]. */
function dyesub(pic, w, h, o, rnd) {
  const cols = Math.max(32, Math.round(o.cols || 720)), rows = Math.max(24, Math.round(o.rows || 468));
  const small = pic.map(p => V.resize(p, w, h, cols, rows));
  // densities of the three dyes (cyan from red, magenta from green, yellow from blue)
  const D = small.map(p => { const d = new Float32Array(p.length); for (let i = 0; i < p.length; i++) d[i] = 1 - clamp01(p[i]); return d; });
  const carry = o.smear !== undefined ? o.smear : 0.18, side = o.headBlur !== undefined ? o.headBlur : 0.5, streak = o.streaks !== undefined ? o.streaks : 0.5;
  const gain = new Float32Array(cols); for (let x = 0; x < cols; x++) gain[x] = 1 + 0.012 * streak * V.gaussRand(rnd) + (rnd() < 0.006 * streak ? -0.08 * streak : 0);
  const reg = [0, (o.register || 0.4) * (rnd() - 0.5) * 2, (o.register || 0.4) * (rnd() - 0.5) * 2];
  for (let c = 0; c < 3; c++) {
    const d = D[c], heat = new Float32Array(cols);
    for (let y = 0; y < rows; y++) { const rowGain = 1 + 0.004 * V.gaussRand(rnd);
      for (let x = 0; x < cols; x++) { const i = y * cols + x, v = d[i]; const out = v + carry * (heat[x] - v) * (heat[x] > v ? 1 : 0.35); heat[x] = 0.55 * heat[x] + 0.45 * v; d[i] = clamp01(out * gain[x] * rowGain); } }
    if (side > 0.3) CAM.blur2D(d, cols, rows, side, 0);
    if (reg[c]) D[c] = CAM.shiftPlane(d, cols, rows, 0, reg[c], 0);
  }
  // dye impurity: each dye absorbs a little of its neighbours' light; laminate black is not perfectly black [EST]
  const sat = o.dyeSat !== undefined ? o.dyeSat : 0.85, dmax = o.black !== undefined ? o.black : 0.015, paper = hex(o.paperColour || "F7F7F4");
  const Mx = [[1, 0.12, 0.04], [0.10, 1, 0.14], [0.02, 0.10, 1]];
  const outS = [0, 1, 2].map(() => new Float32Array(cols * rows));
  for (let i = 0; i < cols * rows; i++) {
    const d = [D[0][i], D[1][i], D[2][i]], m = (d[0] + d[1] + d[2]) / 3;
    for (let c = 0; c < 3; c++) { const dd = m + (d[c] - m) * sat; let a = 0; for (let k = 0; k < 3; k++) a += Mx[c][k] * (k === c ? dd : (m + (d[k] - m) * sat) * 0.6); a = Math.min(1, a);
      const T = Math.pow(10, -2.1 * a); outS[c][i] = toSRGB(Math.max(dmax, toLin(paper[c]) * T)); }
  }
  return outS.map(p => V.resize(p, cols, rows, w, h));
}

/* --- black-and-white medical video printer (Sony UP-897MD class: direct thermal, a 1,280-dot head, 256 levels
 * [SEC Sony]); older units had fewer grey levels [EST]. High-gloss thermal paper; the image is a cold blue-black
 * [EST], dirt on the head leaves white lines along the feed [EST]. */
function thermalbw(pic, w, h, o, rnd) {
  const cols = Math.max(32, Math.round(o.cols || 1280)), rows = Math.max(24, Math.round(cols * h / w));
  const Y = V.resize(luma(pic), w, h, cols, rows), lv = Math.max(2, Math.round(o.levels || 256));
  const gam = o.gamma || 1.25, carry = o.smear !== undefined ? o.smear : 0.12, streak = o.streaks !== undefined ? o.streaks : 0.4;
  const gain = new Float32Array(cols); for (let x = 0; x < cols; x++) gain[x] = 1 + 0.01 * streak * V.gaussRand(rnd);
  const dead = []; const nd = Math.round(streak * 3 * rnd()); for (let k = 0; k < nd; k++) dead.push(Math.floor(rnd() * cols));
  const heat = new Float32Array(cols), d = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x; let v = 1 - Math.pow(clamp01(Y[i]), gam); v = Math.round(v * (lv - 1)) / (lv - 1);
    if (lv < 64) v = clamp01(v + (((x * 7 + y * 13) % 8) / 8 - 0.4375) / (lv - 1)); // older printers: patterned levels [EST]
    v = v + carry * Math.max(0, heat[x] - v); heat[x] = 0.6 * heat[x] + 0.4 * v; d[i] = clamp01(v * gain[x]);
  }
  for (const x of dead) for (let y = 0; y < rows; y++) d[y * cols + x] *= 0.25;
  const ink = hex(o.ink || "15181F"), paper = hex(o.paperColour || "F2F3F4");
  const white = new Float32Array(cols * rows); for (let i = 0; i < d.length; i++) white[i] = toLin(1 - d[i]); // reflectance
  return inkOnPaper(white, ink, paper).map(p => V.resize(p, cols, rows, w, h));
}

/* --- Group 3 fax [SEC ITU-T T.4]: 1,728 pels across an A4 line (about 8 per mm, 203 per inch), 3.85 lines per mm
 * (98 per inch) standard, 7.7 (196) fine; one bit per pel. Photographs went out dithered ("photo" or "halftone" mode,
 * dither matrix or error diffusion depending on the machine [SEC Gestetner service manual]). A line hit by a
 * transmission error decodes wrongly; with 2-D coding the error runs on to the next 1-D line (every 2nd line in
 * standard, every 4th in fine [SEC T.4 K factor]). Many machines print the previous line in place of a bad one [EST].
 * Thermal paper: grey-black on off-white, fading with age [EST]. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BAYER8 = (() => { const m = new Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, xx = x, yy = y; for (let b = 0; b < 3; b++) { v = (v << 2) | (((xx & 1) ^ (yy & 1)) << 1 | (yy & 1)); xx >>= 1; yy >>= 1; } m[y * 8 + x] = v; } return m; })();
function fax(pic, w, h, o, rnd) {
  const pels = Math.max(64, Math.round(o.pels || 864)), lpi = o.fine ? 196 : 98, K = o.fine ? 4 : 2;
  const rows = Math.max(16, Math.round(pels * (h / w) * lpi / 203));
  let Y = luma(pic);
  // the sending machine's scanner: soft, and set up for black text on white, so mid-tones are pushed apart [EST]
  const soft = o.scanSoft !== undefined ? o.scanSoft : 0.6;
  Y = V.resize(Y, w, h, pels, rows); if (soft > 0.3) CAM.blur2D(Y, pels, rows, soft, soft * lpi / 203);
  const con = o.contrast || 1.3, bri = o.brightness || 0;
  for (let i = 0; i < Y.length; i++) Y[i] = clamp01(0.5 + (Y[i] - 0.5) * con + bri);
  const bits = new Float32Array(pels * rows), ht = o.halftone || "ordered";
  if (ht === "diffusion") {
    const e = Float32Array.from(Y);
    for (let y = 0; y < rows; y++) for (let x = 0; x < pels; x++) {
      const i = y * pels + x, v = e[i], b = v >= 0.5 ? 1 : 0, er = v - b; bits[i] = b;
      if (x + 1 < pels) e[i + 1] += er * 7 / 16; if (y + 1 < rows) { if (x > 0) e[i + pels - 1] += er * 3 / 16; e[i + pels] += er * 5 / 16; if (x + 1 < pels) e[i + pels + 1] += er / 16; }
    }
  } else if (ht === "threshold") { for (let i = 0; i < Y.length; i++) bits[i] = Y[i] >= (o.threshold || 0.5) ? 1 : 0; }
  else { const big = ht === "ordered8", M = big ? BAYER8 : BAYER4, s = big ? 8 : 4, q = s * s;
    for (let y = 0; y < rows; y++) for (let x = 0; x < pels; x++) { const i = y * pels + x; bits[i] = Y[i] > (M[(y % s) * s + (x % s)] + 0.5) / q ? 1 : 0; } }
  // dirt on the sender's scanner glass: thin black lines down the page [EST]
  const nStreak = Math.round((o.scanStreaks || 0) * 6);
  for (let k = 0; k < nStreak; k++) { const x0 = Math.floor(rnd() * pels), wd = 1 + (rnd() < 0.3 ? 1 : 0), y0 = rnd() < 0.5 ? 0 : Math.floor(rnd() * rows * 0.7), y1 = rnd() < 0.6 ? rows : y0 + Math.floor(rnd() * rows * 0.5);
    for (let y = y0; y < Math.min(rows, y1); y++) for (let x = x0; x < Math.min(pels, x0 + wd); x++) if (rnd() < 0.92) bits[y * pels + x] = 0; }
  // transmission errors on the telephone line
  const er = o.errors || 0, mode = o.errorMode || "mixed";
  for (let y = 1; y < rows; y++) {
    if (!(rnd() < er)) continue;
    const repeat = mode === "repeat" || (mode === "mixed" && rnd() < 0.5), run = 1 + Math.floor(rnd() * K);
    for (let r = y; r < Math.min(rows, y + run); r++) {
      const o2 = r * pels, prev = (r - 1) * pels;
      if (repeat) { bits.copyWithin(o2, prev, prev + pels); continue; }
      // a wrong code word: from there on the runs are read wrongly, shifted and with colours swapped [EST]
      const x0 = Math.floor(rnd() * pels * 0.8), sh = Math.floor((rnd() - 0.5) * pels * 0.3), inv = rnd() < 0.5, black = rnd() < 0.35;
      const line = bits.slice(o2, o2 + pels);
      for (let x = x0; x < pels; x++) { if (black) { bits[o2 + x] = 0; continue; } let sx = x + sh; sx = ((sx % pels) + pels) % pels; const v = line[sx]; bits[o2 + x] = inv ? 1 - v : v; }
    }
    y += run - 1;
  }
  // the receiving machine: thermal dots on fax paper, a little soft; the paper darkens and fades with age
  const fade = o.fade || 0, paperKind = o.faxPaper || "thermal";
  const ink = paperKind === "plain" ? [0.09, 0.09, 0.09] : [0.16 + 0.35 * fade, 0.15 + 0.33 * fade, 0.17 + 0.25 * fade];
  const paper = paperKind === "plain" ? [0.97, 0.97, 0.96] : [0.95 - 0.04 * fade, 0.94 - 0.05 * fade, 0.90 - 0.12 * fade];
  let up = w >= 2 * pels ? nearest(bits, pels, rows, w, h) : V.resize(bits, pels, rows, w, h); // small output: average the pels
  const dot = (o.dotSoft !== undefined ? o.dotSoft : 0.4) * w / pels; if (dot > 0.3) CAM.blur2D(up, w, h, dot, dot);
  return inkOnPaper(up, ink, paper);
}

/* --- wirephoto: the print wrapped on a drum, scanned in a helix and sent as a tone on a telephone line; at the other
 * end a light spot exposed photographic paper on a matching drum. AP Wirephoto 1935: 100 rpm, an 8 x 10 in print in
 * 8 minutes, a spot 1/100 in [SEC], so about 100 lines per inch. Each line is continuous tone along its length; line to
 * line the level and timing wander a little, crackle on the line marks short streaks, and mains hum makes faint
 * slanting bars [EST for the amounts]. Received on paper and printed glossy. */
function wirephoto(pic, w, h, o, rnd) {
  const L = Math.max(40, Math.round(o.lines || 400)), S = Math.max(64, Math.round(L * w / h * (o.detail || 1.2)));
  let Y = V.resize(luma(pic), w, h, S, L);
  // the telephone channel: about 3 kHz, so the line is band-limited along its length with a little ringing
  const bw = o.blur !== undefined ? o.blur : 0.9;
  if (bw > 0.3) { const b = Float32Array.from(Y); CAM.blur2D(b, S, L, bw, 0); const b2 = Float32Array.from(b); CAM.blur2D(b2, S, L, bw * 2.2, 0); for (let i = 0; i < Y.length; i++) Y[i] = b[i] + 0.25 * (b[i] - b2[i]); }
  const gn = o.lineNoise !== undefined ? o.lineNoise : 0.03, jit = o.jitter !== undefined ? o.jitter : 0.6, hum = o.hum || 0, stat = o.static !== undefined ? o.static : 0.04;
  const hf = 36.37 + (o.humSlant || 0); // hum cycles per line: 50/60 Hz against a 0.6 s line [EST]
  const out = new Float32Array(S * L); let drift = 0;
  for (let y = 0; y < L; y++) {
    const g = 1 + gn * V.gaussRand(rnd), off = gn * 0.4 * V.gaussRand(rnd); drift = 0.9 * drift + jit * V.gaussRand(rnd);
    for (let x = 0; x < S; x++) {
      let sx = x - drift; sx = sx < 0 ? 0 : sx > S - 1 ? S - 1 : sx; const x0 = sx | 0, f = sx - x0, x1 = Math.min(S - 1, x0 + 1);
      let v = (Y[y * S + x0] * (1 - f) + Y[y * S + x1] * f) * g + off;
      if (hum) v += hum * 0.05 * Math.sin(2 * Math.PI * (hf * (y + x / S)));
      out[y * S + x] = v;
    }
    if (rnd() < stat) { const n = 1 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const x0 = Math.floor(rnd() * S), len = 3 + Math.floor(rnd() * rnd() * S * 0.15), a = (rnd() < 0.6 ? -1 : 1) * (0.15 + 0.4 * rnd());
      for (let x = x0; x < Math.min(S, x0 + len); x++) out[y * S + x] += a * Math.exp(-(x - x0) / (len * 0.6)); } }
  }
  // the light spot draws each line; adjacent lines nearly touch, so a fine line structure shows [EST spot profile]
  const ups = Math.max(2, Math.ceil(h / L)), H2 = L * ups, sig = (o.spot || 0.42) * ups, ln = new Float32Array(S * H2);
  for (let r = 0; r < H2; r++) { const yc = (r + 0.5) / ups - 0.5, y0 = Math.max(0, Math.floor(yc) - 1), y1 = Math.min(L - 1, Math.floor(yc) + 2);
    for (let x = 0; x < S; x++) { let a = 0, wsum = 0; for (let yy = y0; yy <= y1; yy++) { const d = (yy - yc) * ups / sig, wt = Math.exp(-0.5 * d * d); a += out[yy * S + x] * wt; wsum += wt; }
      const peak = Math.exp(-0.5 * Math.pow(((yc - Math.round(yc)) * ups) / sig, 2)); ln[r * S + x] = (a / Math.max(1e-6, wsum)) * (0.82 + 0.18 * peak); } }
  const Yo = V.resize(ln, S, H2, w, h);
  // glossy bromide print: S-shaped curve, paper base not quite white, black not quite black
  const tone = { neutral: ["F4F2EE", "0E0D0C"], warm: ["F3EDE0", "1A140E"], cold: ["EEF0F2", "0C0E12"] }[o.tone || "warm"] || ["F3EDE0", "1A140E"];
  const con = o.contrast || 1.25, paper = hex(tone[0]), ink = hex(tone[1]);
  for (let i = 0; i < Yo.length; i++) { const v = clamp01(Yo[i]); Yo[i] = 1 / (1 + Math.exp(-con * 5 * (v - 0.5))); }
  let lo = 1 / (1 + Math.exp(con * 2.5)), hi = 1 / (1 + Math.exp(-con * 2.5)); for (let i = 0; i < Yo.length; i++) Yo[i] = (Yo[i] - lo) / (hi - lo);
  for (let i = 0; i < Yo.length; i++) Yo[i] = toLin(clamp01(Yo[i]));
  return inkOnPaper(Yo, ink, paper);
}

/* --- NOAA APT [SEC NOAA KLM User's Guide section 4.2; NOAA receiving-station guide 2009]: 2 lines a second, 2,080 words
 * a line: Sync A (1,040 Hz square wave, 7 cycles), space A, 909 words of channel A, telemetry A, Sync B (832 pulses a
 * second, 7 pulses), space B, 909 words of channel B, telemetry B (4 x 39/47/909/45 words). Telemetry: 16 wedges of 8
 * lines, a frame every 128 lines; wedges 1-8 step up in eighths, 9 is zero, 16 shows which wedge matches the channel
 * (A: wedge 2 or 3, B: wedge 4). Minute markers every 120 lines in the space columns (black in IR, white in visible); IR
 * space is white, visible space black. Channel B here is an infrared stand-in made from the picture (cold = white) [EST].
 * The signal is weakest as the satellite rises and sets, so the top and bottom of a pass are noisy. */
function aptLine() { // segment layout in words
  return { syncA: [0, 39], spaceA: [39, 86], A: [86, 995], telA: [995, 1040], syncB: [1040, 1079], spaceB: [1079, 1126], B: [1126, 2035], telB: [2035, 2080] };
}
function apt(pic, w, h, o, rnd) {
  const view = o.view || "full", seg = aptLine();
  const L = Math.max(64, Math.round(o.lines || (view === "full" ? Math.round(909 * h / w * 2.2) : Math.round(909 * h / w))));
  const Y = V.resize(luma(pic), w, h, 909, L);
  // channel A: visible/near IR (the picture); channel B: a thermal infrared stand-in, softer and inverted in part [EST]
  const Bl = Float32Array.from(Y); CAM.blur2D(Bl, 909, L, 6, 6);
  const A = new Float32Array(909 * L), B = new Float32Array(909 * L), irMix = o.irMix !== undefined ? o.irMix : 0.35;
  for (let i = 0; i < A.length; i++) { A[i] = clamp01(0.03 + 0.92 * Y[i]); B[i] = clamp01(0.5 + 1.5 * (((1 - irMix) * Y[i] + irMix * (1 - Bl[i])) - 0.5) * 0.85 + 0.1 * (Y[i] - Bl[i])); }
  const line = new Float32Array(2080), img = new Float32Array(2080 * L);
  const wedge = (k, ch) => k < 8 ? (k + 1) / 8 : k === 8 ? 0 : k < 14 ? 0.42 + 0.03 * (k - 9) : k === 14 ? (ch ? 0.55 : 0.06) : (ch ? 4 / 8 : 2 / 8);
  for (let r = 0; r < L; r++) {
    for (let x = 0; x < 39; x++) { const t = x - 4; line[x] = t >= 0 && t < 28 && (t % 4) < 2 ? 1 : 0; const u = x - 4; line[1040 + x] = u >= 0 && u < 35 && (u % 5) < 3 ? 1 : 0; }
    const mk = (r % 120) < 2; // minute marker: white in the visible space column, black in the infrared one
    line.fill(mk ? 0.98 : 0.02, seg.spaceA[0], seg.spaceA[1]); line.fill(mk ? 0.02 : 0.96, seg.spaceB[0], seg.spaceB[1]);
    line.set(A.subarray(r * 909, r * 909 + 909), seg.A[0]); line.set(B.subarray(r * 909, r * 909 + 909), seg.B[0]);
    const k = Math.floor((r % 128) / 8); line.fill(wedge(k, 0), seg.telA[0], seg.telA[1]); line.fill(wedge(k, 1), seg.telB[0], seg.telB[1]);
    img.set(line, r * 2080);
  }
  // reception: noise worst at the start and end of the pass, the odd burst of static, and an unlocked decoder slants
  const n0 = o.noise !== undefined ? o.noise : 0.04, edge = o.passEdge !== undefined ? o.passEdge : 0.5, burst = o.bursts !== undefined ? o.bursts : 0.01, slant = o.slant || 0;
  const out = new Float32Array(2080 * L);
  for (let r = 0; r < L; r++) {
    const t = (r + 0.5) / L, e = Math.max(0, Math.abs(t - 0.5) * 2 - 0.55) / 0.45, sig = n0 + edge * 0.6 * Math.pow(e, 2), bad = rnd() < burst, shift = Math.round(r * slant);
    for (let x = 0; x < 2080; x++) { let sx = (x + shift) % 2080; if (sx < 0) sx += 2080;
      let v = img[r * 2080 + sx] + sig * V.gaussRand(rnd); if (bad) v = v * 0.4 + rnd() * 0.7; out[r * 2080 + x] = clamp01(v); }
  }
  let src = out, sw = 2080;
  if (view === "a" || view === "b") { const s0 = view === "a" ? seg.A[0] : seg.B[0]; src = new Float32Array(909 * L); for (let r = 0; r < L; r++) src.set(out.subarray(r * 2080 + s0, r * 2080 + s0 + 909), r * 909); sw = 909; }
  const Yo = V.resize(src, sw, L, w, h);
  const pal = o.palette && o.palette !== "grey" && CAM.THERMAL_PALETTES[o.palette] ? CAM.THERMAL_PALETTES[o.palette] : null;
  if (pal) { const stops = pal.map(s => [s[0], hex(s[1])]); const res = [0, 1, 2].map(() => new Float32Array(w * h));
    for (let i = 0; i < Yo.length; i++) { const v = clamp01(o.palInvert ? 1 - Yo[i] : Yo[i]); let k = 1; while (k < stops.length - 1 && v > stops[k][0]) k++; const a = stops[k - 1], b = stops[k], f = clamp01((v - a[0]) / Math.max(1e-6, b[0] - a[0])); for (let c = 0; c < 3; c++) res[c][i] = a[1][c] + (b[1][c] - a[1][c]) * f; }
    return res; }
  // printed on a fax-style recorder or photographic paper, or shown on screen: plain greys unless a paper is chosen
  if (o.print === "fax") { const lin = Yo.map(v => toLin(clamp01(v))); return inkOnPaper(lin, [0.17, 0.16, 0.18], [0.94, 0.93, 0.88]); }
  return [Yo, Float32Array.from(Yo), Float32Array.from(Yo)];
}

/* run the chosen machine on the picture; border: a margin of paper round the picture (fraction of the short side) */
function paper(pic, w, h, o) {
  o = o || {}; let fn = { dyesub, thermalbw, fax, wirephoto, apt }[o.kind];
  if (!fn && PO.KINDS[o.kind]) { const oo = Object.assign({}, o.out || {}, { kind: o.kind, seed: o.seed }); o = Object.assign({}, o, { paperColour: oo.paperColour || PO.PAPER[o.kind] }); fn = (p, ww, hh, _o, r) => PO.printout(p, ww, hh, oo, r); }
  if (!fn) return pic;
  const rnd = V.mulberry32(((o.seed || 1) * 2654435761 + 77) >>> 0);
  const b = Math.max(0, Math.min(0.2, o.border || 0)), m = Math.round(b * Math.min(w, h));
  if (m < 1) return fn(pic, w, h, o, rnd).map(p => { for (let i = 0; i < p.length; i++) p[i] = clamp01(p[i]); return p; });
  const iw = w - 2 * m, ih = h - 2 * m; const inner = pic.map(p => V.resize(p, w, h, iw, ih)); const res = fn(inner, iw, ih, o, rnd);
  const pc = hex(PO.KINDS[o.kind] ? o.paperColour : o.kind === "thermalbw" ? (o.paperColour || "F2F3F4") : o.kind === "dyesub" ? (o.paperColour || "F7F7F4") : o.kind === "wirephoto" ? "F3EDE0" : "F0EFEA");
  return [0, 1, 2].map(c => { const a = new Float32Array(w * h).fill(pc[c]); for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) a[(y + m) * w + x + m] = clamp01(res[c][y * iw + x]); return a; });
}
const api = { KINDS, paper, aptLine };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLPaper = api;
