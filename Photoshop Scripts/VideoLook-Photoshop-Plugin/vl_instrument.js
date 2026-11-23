/* VideoLook: instruments (v1.6). The photo as the subject of an imaging instrument that is not a television camera:
 * space-probe cameras, Earth-observation scanners, radar and sonar, medical scanners and microscopes. Each is a Picture
 * source kind: it runs on the standard's grid and its output drives the display like any other source, so a radar
 * picture can go to a P7 tube, an ultrasound picture to the medical printer, and so on.
 * Sources and estimates: VideoLook-References/_research/O_batch3_probes_earth_radar_medical.md. [EST] = no source
 * gave a figure; the photo stands in for the scene, so any "height", "density" or "infrared" made from it is [EST].
 * Work is done on a square-pixel raster W x H (H = the standard's lines) and resized back to the grid. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const TX = (typeof require !== "undefined") ? require("./vl_text.js") : globalThis.VLText;

const KINDS = {
  probe: "Space-probe camera (digitised frame)",
  framelet: "Film read out in strips (Lunar Orbiter)",
  mss: "Multispectral scanner (Landsat)",
  radar: "Radar screen (rotating sweep)",
  sidescan: "Side-scan sonar",
  sounder: "Echo sounder / fish finder",
  ultrasound: "Ultrasound scanner",
  ct: "CT scanner (reconstructed slice)",
  mri: "MRI scanner",
  fluoro: "X-ray image intensifier (fluoroscopy)",
  gamma: "Gamma camera (nuclear medicine)",
  sem: "Scanning electron microscope",
  spm: "Scanning probe microscope (AFM / STM)",
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hex = h => [0, 2, 4].map(j => parseInt(h.slice(j, j + 2), 16) / 255);
function lum(P) { const n = P[0].length, Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * P[0][i] + 0.587 * P[1][i] + 0.114 * P[2][i]; return Y; }
function blur(a, w, h, s) { const b = Float32Array.from(a); if (s > 0.3) CAM.blur2D(b, w, h, s, s); return b; }
function work(grid, g, o) { const H = Math.max(64, Math.min(1080, g.lines)), W = Math.max(64, Math.round(H * (o.aspect || 4 / 3))); return { W, H, P: grid.map(p => V.resize(p, g.ns, g.lines, W, H)) }; }
const back = (P, W, H, g) => P.map(p => V.resize(p, W, H, g.ns, g.lines));
const mono = (Y, W, H, g) => { const p = V.resize(Y, W, H, g.ns, g.lines); return [p, Float32Array.from(p), Float32Array.from(p)]; };
function nearest(src, sw, sh, dw, dh) { const o = new Float32Array(dw * dh); for (let y = 0; y < dh; y++) { const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh)) * sw; for (let x = 0; x < dw; x++) o[y * dw + x] = src[sy + Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw))]; } return o; }
function bilinear(a, w, h, x, y) { if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return -1; const x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  return (a[y0 * w + x0] * (1 - fx) + a[y0 * w + x1] * fx) * (1 - fy) + (a[y1 * w + x0] * (1 - fx) + a[y1 * w + x1] * fx) * fy; }
const PALETTES = Object.assign({}, CAM.THERMAL_PALETTES, {
  grey: [[0, "000000"], [1, "FFFFFF"]],
  inverse: [[0, "FFFFFF"], [1, "000000"]],
  hot: [[0, "000000"], [0.35, "B00000"], [0.65, "FF8000"], [0.85, "FFE040"], [1, "FFFFFF"]],
  afmhot: [[0, "000000"], [0.3, "5A1E00"], [0.55, "B4501E"], [0.8, "F0B45A"], [1, "FFFFF0"]],
  weather: [[0, "000000"], [0.12, "00A000"], [0.3, "00E000"], [0.45, "F0F000"], [0.6, "F0A000"], [0.75, "F00000"], [0.88, "C00080"], [1, "FFFFFF"]],
  sounder: [[0, "00006A"], [0.2, "0050F0"], [0.4, "00D0E0"], [0.55, "30E030"], [0.7, "F0F000"], [0.85, "FF8000"], [1, "D00000"]],
  amber: [[0, "000000"], [0.5, "804000"], [1, "FFC040"]],
  sepia: [[0, "F4E6C8"], [0.5, "A0784A"], [1, "2A1608"]],
  green: [[0, "000000"], [0.6, "30A040"], [1, "C0FFC0"]],
});
function palette(Y, name, levels) {
  const stops = (PALETTES[name] || PALETTES.grey).map(s => [s[0], hex(s[1])]), n = Y.length, out = [0, 1, 2].map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) { let v = clamp01(Y[i]); if (levels > 1) v = Math.min(levels - 1, Math.floor(v * levels)) / (levels - 1);
    let k = 1; while (k < stops.length - 1 && v > stops[k][0]) k++; const a = stops[k - 1], b = stops[k], f = clamp01((v - a[0]) / Math.max(1e-6, b[0] - a[0]));
    for (let c = 0; c < 3; c++) out[c][i] = a[1][c] + (b[1][c] - a[1][c]) * f; }
  return out;
}
const MU = [".....", ".....", "1...1", "1...1", "1...1", "1..11", "111.1", "1....", "1...."];
function drawText(P, W, H, text, x0, y0, s, val) { // VideoLook's 5 x 9 dot font, s pixels a dot
  [...text].forEach((ch, k) => { const gl = ch === "µ" ? MU : TX.glyph(ch);
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 5; gx++) if (gl[gy][gx] === "1")
      for (let yy = 0; yy < s; yy++) for (let xx = 0; xx < s; xx++) { const X = Math.round(x0 + (k * 6 + gx) * s + xx), Y = Math.round(y0 + gy * s + yy); if (X >= 0 && X < W && Y >= 0 && Y < H) for (const p of P) p[Y * W + X] = val; } });
}

/* ---- space-probe camera: a vidicon (or film) frame digitised to a few hundred pixels and a few bits, sent as numbers.
 * Mariner 4 (1965): 200 x 200 pixels, 6 bits, 8 1/3 bit/s, about 10 hours a picture [SEC NSSDC; NASA]. Ranger P cameras:
 * 300 x 300 [SEC NSSDC]. Mariner 9 (1971): 700 lines of 832 pixels, 9 bits [SEC NASA TR]. Voyager: 800 x 800, 8 bits,
 * colour from separate frames through filters [SEC PDS; Benesh and Jepsen 1978]. Reseau marks: dots etched on the vidicon
 * faceplate, a 7 x 9 grid on Mariner 6/7 [SEC PDS camera model]. Lost telemetry leaves missing lines [SEC USGS]. Coherent
 * noise, vidicon shading and the amounts are [EST]. scan: 'rows' or 'columns' (a line-scan camera such as the Viking
 * lander's, which built each picture from vertical lines of 512 steps [SEC NASA]). */
function probe(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o);
  const px = Math.max(16, Math.round(o.px || 200)), py = Math.max(16, Math.round(o.pxH || Math.round(px * H / W)));
  const bits = Math.max(1, Math.min(10, o.bits || 6)), q = (1 << bits) - 1, cols = o.scan === "columns";
  const chans = o.colour === "filters" ? [0, 1, 2] : [null];
  const frames = chans.map((c, ci) => {
    let F = V.resize(c === null ? lum(P) : P[c], W, H, px, py);
    const sh = o.fringe ? [(rnd() - 0.5) * 2 * o.fringe, (rnd() - 0.5) * 2 * o.fringe] : [0, 0];
    if (ci && (sh[0] || sh[1])) F = CAM.shiftPlane(F, px, py, sh[0], sh[1], 0);
    const con = o.contrast || 1, off = o.offset || 0, shade = o.shading !== undefined ? o.shading : 0.25, noise = o.noise !== undefined ? o.noise : 0.02;
    const coh = o.coherent || 0, cf = 0.21 + 0.1 * rnd(), lineGain = o.lineGain || 0;
    const lg = new Float32Array(cols ? px : py); for (let k = 0; k < lg.length; k++) lg[k] = 1 + lineGain * V.gaussRand(rnd);
    for (let y = 0; y < py; y++) for (let x = 0; x < px; x++) {
      const i = y * px + x, u = x / px - 0.5, v = y / py - 0.5, r2 = (u * u + v * v) * 2;
      let d = (F[i] - 0.5) * con + 0.5 + off;
      d *= (1 - shade * r2) * lg[cols ? x : y];
      d += noise * V.gaussRand(rnd) + coh * 0.04 * Math.sin(2 * Math.PI * cf * (cols ? y + x * 0.37 : x + y * 0.37));
      F[i] = Math.round(clamp01(d) * q) / q;
    }
    // reseau marks: small dark dots on a grid
    if (o.reseau) { const [rc, rr] = o.reseau, rs = Math.max(1, (o.reseauSize || 0.006) * px);
      for (let a = 0; a < rc; a++) for (let b = 0; b < rr; b++) { const cx = (a + 0.5) / rc * px, cy = (b + 0.5) / rr * py;
        for (let y = Math.floor(cy - rs); y <= Math.ceil(cy + rs); y++) for (let x = Math.floor(cx - rs); x <= Math.ceil(cx + rs); x++)
          if (x >= 0 && y >= 0 && x < px && y < py && Math.max(Math.abs(x - cx), Math.abs(y - cy)) <= rs) F[y * px + x] = o.reseauStyle === "white" ? 1 : 0; } }
    // lost data: whole lines, single bit errors, and everything after the point where the transmission stopped
    const nL = cols ? px : py, nS = cols ? py : px, at = (l, s) => cols ? s * px + l : l * px + s;
    for (let l = 0; l < nL; l++) {
      if (rnd() < (o.dropouts || 0)) { const fill = o.dropFill === "white" ? 1 : o.dropFill === "noise" ? -1 : 0; const st = rnd() < 0.5 ? 0 : Math.floor(rnd() * nS);
        for (let s = st; s < nS; s++) F[at(l, s)] = fill < 0 ? Math.round(rnd() * q) / q : fill; }
      if (o.lostFrom !== undefined && o.lostFrom < 1 && l >= o.lostFrom * nL) for (let s = 0; s < nS; s++) F[at(l, s)] = o.lostNoise ? Math.round(clamp01(0.5 + 0.35 * V.gaussRand(rnd)) * q) / q : 0;
    }
    if (o.bitErrors) for (let i = 0; i < F.length; i++) if (rnd() < o.bitErrors) F[i] = Math.round(rnd() * q) / q;
    return F;
  });
  const up = f => o.smooth === false ? nearest(f, px, py, W, H) : V.resize(f, px, py, W, H);
  const out = frames.length === 3 ? frames.map(up) : (() => { const m = up(frames[0]); return [m, Float32Array.from(m), Float32Array.from(m)]; })();
  if (o.tint) { const t = hex(o.tint); out.forEach((p, c) => { for (let i = 0; i < p.length; i++) p[i] *= t[c]; }); }
  if (o.printout) { // the first Mars picture was coloured by hand on strips of printed numbers [SEC NASA/JPL]; crayon bands [EST]
    const lv = Math.max(2, o.printout), cs = ["3A1A10", "6A2E14", "9A4A1C", "C06A2A", "D89040", "E8B860", "F0D890", "F8F0D0"].map(hex);
    const m = out[0]; for (let i = 0; i < m.length; i++) { const k = Math.min(lv - 1, Math.floor(clamp01(m[i]) * lv)), c = cs[Math.round(k / (lv - 1) * (cs.length - 1))]; for (let ch = 0; ch < 3; ch++) out[ch][i] = c[ch]; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = ((x * 7 + y * 3) % 11) / 11; if (n < 0.18) for (let ch = 0; ch < 3; ch++) out[ch][y * W + x] = Math.min(1, out[ch][y * W + x] + 0.08); }
  }
  return back(out, W, H, g);
}

/* ---- film read out in strips: Lunar Orbiter exposed film on board, developed it, and scanned it in framelets 2.54 mm
 * wide; on Earth the framelets were laid side by side again, leaving seams and a brightness drift across each strip
 * (the "venetian blind" look) [SEC NASA SP-242; USGS; LPOD]. Strip count, drift shape and seam brightness [EST]. */
function framelet(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); let Y = lum(P);
  const n = Math.max(1, Math.round(o.strips || 14)), horiz = o.direction === "horizontal", drift = o.drift !== undefined ? o.drift : 0.18, seam = o.seam !== undefined ? o.seam : 0.6;
  const shiftAmt = o.shift !== undefined ? o.shift : 2, con = o.contrast || 1.1, grain = o.grain !== undefined ? o.grain : 0.03, soft = o.soft || 0.8;
  if (soft > 0.3) Y = blur(Y, W, H, soft * H / 576);
  const L = horiz ? H : W, gains = [], shifts = [], tilt = []; for (let k = 0; k < n; k++) { gains.push(1 + 0.06 * V.gaussRand(rnd)); shifts.push(shiftAmt * V.gaussRand(rnd) * H / 576); tilt.push(0.6 + 0.4 * rnd()); }
  const out = new Float32Array(W * H), lineN = o.scanLines || 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = horiz ? y : x, k = Math.min(n - 1, Math.floor(a / L * n)), t = (a / L * n) - k; // position across the strip, 0..1
    const sx = horiz ? x + shifts[k] : x, sy = horiz ? y : y + shifts[k], v0 = bilinear(Y, W, H, Math.min(W - 1, Math.max(0, sx)), Math.min(H - 1, Math.max(0, sy)));
    let v = (v0 - 0.5) * con + 0.5;
    v = v * gains[k] * (1 + drift * tilt[k] * (0.5 - t)) ; // brighter at one edge of each strip than the other
    const e = Math.min(t, 1 - t) * L / n; if (e < 1.2 * H / 576) v = v * (1 - seam) + seam * (0.85 + 0.15 * rnd());
    if (lineN) { const along = (horiz ? x / W : y / H) * lineN; v *= 0.92 + 0.08 * Math.cos(2 * Math.PI * along); }
    out[y * W + x] = clamp01(v + grain * V.gaussRand(rnd));
  }
  return mono(out, W, H, g);
}

/* ---- multispectral scanner: Landsat MSS (1972 on): four bands, green 0.5-0.6, red 0.6-0.7, near infrared 0.7-0.8 and
 * 0.8-1.1 µm; an oscillating mirror swept six lines at once in each band, and the six detectors' unequal gains stripe the
 * picture in sixes; a 185 km swath; about 79 m pixels resampled to 57 m across [SEC NASA Landsat; USGS; MIT destriping
 * paper]. False colour: near infrared shown red, red shown green, green shown blue, so plants show red [SEC USGS 4,2,1].
 * The photo has no infrared record: plants are guessed from greenness, water from blueness [EST]. */
function mss(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o);
  const cols = Math.max(32, Math.round(o.cols || 360)), rows = Math.max(16, Math.round(cols * H / W * (o.pixelRatio || 57 / 79)));
  const R = V.resize(P[0], W, H, cols, rows), G = V.resize(P[1], W, H, cols, rows), B = V.resize(P[2], W, H, cols, rows), n = cols * rows;
  const bands = [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const r = R[i], gg = G[i], b = B[i], y = 0.3 * r + 0.59 * gg + 0.11 * b, veg = Math.max(0, gg - Math.max(r, b) * 0.92) * 3, water = Math.max(0, b - Math.max(r, gg) * 0.95) * 3;
    bands[0][i] = gg; bands[1][i] = r;
    bands[2][i] = clamp01((0.45 * y + 0.9 * veg + 0.15 * r) * (1 - Math.min(0.9, water)));
    bands[3][i] = clamp01((0.4 * y + 1.15 * veg + 0.12 * r) * (1 - Math.min(0.95, water * 1.2)));
  }
  const stripe = o.stripe !== undefined ? o.stripe : 1, bitsQ = (1 << (o.bits || 6)) - 1;
  for (const b of bands) { const gn = [], of = []; for (let d = 0; d < 6; d++) { gn.push(1 + stripe * 0.035 * V.gaussRand(rnd)); of.push(stripe * 0.012 * V.gaussRand(rnd)); }
    for (let y = 0; y < rows; y++) { const d = y % 6, bad = rnd() < (o.badLines || 0); for (let x = 0; x < cols; x++) { const i = y * cols + x; let v = bad ? (rnd() < 0.5 ? 0 : 1) : b[i] * gn[d] + of[d] + (o.noise || 0.006) * V.gaussRand(rnd); b[i] = Math.round(clamp01(v) * bitsQ) / bitsQ; } } }
  const comp = o.composite || "false", stretch = (a, lo, hi) => { for (let i = 0; i < a.length; i++) a[i] = clamp01((a[i] - lo) / (hi - lo)); return a; };
  let rgb;
  if (comp === "false") rgb = [Float32Array.from(bands[3]), Float32Array.from(bands[1]), Float32Array.from(bands[0])];
  else if (comp === "natural") rgb = [Float32Array.from(bands[1]), Float32Array.from(bands[0]), bands[0].map((v, i) => 0.7 * v + 0.3 * bands[1][i])];
  else { const k = Math.max(0, Math.min(3, (parseInt(comp.replace("band", ""), 10) || 4) - 4)); rgb = [0, 1, 2].map(() => Float32Array.from(bands[k])); }
  rgb.forEach(p => stretch(p, o.lo || 0.03, o.hi || 0.85));
  let up = rgb.map(p => o.smooth ? V.resize(p, cols, rows, W, H) : nearest(p, cols, rows, W, H));
  if (o.skew) { // a Landsat scene is a parallelogram: the Earth turns under the scanner [EST amount]
    const sk = o.skew, m = Math.abs(sk) * W, scale = (W - m) / W;
    up = up.map(p => { const q = new Float32Array(W * H); for (let y = 0; y < H; y++) { const sh = (sk > 0 ? y / H : 1 - y / H) * m; for (let x = 0; x < W; x++) { const sx = (x - sh) / scale; q[y * W + x] = sx >= 0 && sx <= W - 1 ? bilinear(p, W, H, sx, y) : 0; } } return q; });
  }
  return back(up, W, H, g);
}

/* ---- radar PPI: the screen shows echoes by bearing and range, drawn by a sweep that turns with the aerial; the long
 * afterglow of the P7 tube holds them until the next turn [SEC CAA/FAA reports; Bournemouth Radar Recollections].
 * Electronic range rings [SEC patent]. The photo stands for the ground or sea it sees: bright and edged things echo.
 * Beam width smears echoes along the bearing, so far targets spread into arcs [DERIVED]. Amounts [EST].
 * palette 'phosphor' leaves the colour to the display (choose the P7 tube); 'weather' shows rain levels in colour
 * (colours vary by maker [SEC Jeppesen]; these are [EST]); 'amber' a raster radar. */
function radar(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P), Yb = blur(Y, W, H, 1.5);
  const cx = (o.cx !== undefined ? o.cx : 0.5) * W, cy = (o.cy !== undefined ? o.cy : 0.5) * H, R = (o.radius || 0.47) * Math.min(W, H) * (o.fill ? 1.42 : 1);
  const edge = o.edges !== undefined ? o.edges : 0.6, thr = o.threshold !== undefined ? o.threshold : 0.25, gain = o.gain || 1.6;
  const E = new Float32Array(W * H); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, gx = Yb[i + 1] - Yb[i - 1], gy = Yb[i + W] - Yb[i - W];
    E[i] = Math.max(0, ((1 - edge) * Yb[i] + edge * Math.min(1, 6 * Math.hypot(gx, gy))) - thr) / (1 - thr); }
  const beam = (o.beam || 1.8) * Math.PI / 180, pulse = (o.pulse || 0.004) * R, sweep = (o.sweep !== undefined ? o.sweep : 40) * Math.PI / 180, persist = o.persist !== undefined ? o.persist : 0.7;
  const rings = o.rings !== undefined ? o.rings : 4, clutter = o.clutter !== undefined ? o.clutter : 0.4, noise = o.noise !== undefined ? o.noise : 0.06;
  const out = new Float32Array(W * H), steps = 5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r > R) { out[y * W + x] = o.palette === "weather" ? -1 : 0; continue; }
    const th = Math.atan2(dx, -dy); let e = 0;
    for (let k = 0; k < steps; k++) { const a = th + beam * ((k + 0.5) / steps - 0.5); for (const dr of [-pulse, 0, pulse]) { const rr = r + dr; e += bilinear(E, W, H, cx + rr * Math.sin(a), cy - rr * Math.cos(a)) > 0 ? bilinear(E, W, H, cx + rr * Math.sin(a), cy - rr * Math.cos(a)) : 0; } }
    e /= steps * 3; const rn = r / R;
    e = gain * e + clutter * Math.exp(-rn / 0.12) * Math.pow(rnd(), 3) * 1.5 + noise * Math.pow(rnd(), 4);
    let v = clamp01(e);
    if (o.palette !== "weather") { let ph = sweep - th; ph = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const fade = persist > 0 ? Math.exp(-ph / (2 * Math.PI * persist)) : (ph < 0.05 ? 1 : 0); v *= 0.12 + 0.88 * fade; if (ph < 0.012) v = Math.max(v, 0.35); }
    if (rings) { const f = rn * rings, d = Math.abs(f - Math.round(f)) * R / rings; if (Math.round(f) > 0 && d < 0.7 * H / 576) v = Math.max(v, 0.45); }
    if (o.heading && Math.abs(dx) < 0.7 * H / 576 && dy < 0) v = Math.max(v, 0.5);
    out[y * W + x] = v;
  }
  if (o.palette === "weather") { for (let i = 0; i < out.length; i++) out[i] = out[i] < 0 ? 0 : out[i] < 0.08 ? 0 : out[i]; return back(palette(out, "weather", o.levels || 7), W, H, g); }
  if (o.palette && o.palette !== "phosphor") return back(palette(out, o.palette, o.levels || 0), W, H, g);
  return mono(out, W, H, g);
}

/* ---- side-scan sonar: each ping is one line across the record, port on the left and starboard on the right, with the
 * water column (no seabed echo yet) as a dark band down the middle; tall things throw acoustic shadows away from the
 * track; range is slant range, so the seabed near the track is squeezed [SEC side-scan references: DTIC; arXiv]. The photo
 * is the seabed: its brightness is the reflectivity and, blurred, the height [EST]. Paper palettes [EST]. */
function sidescan(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P), Hm = blur(Y, W, H, (o.smoothHeight || 6) * H / 576);
  const alt = o.altitude !== undefined ? o.altitude : 0.12, relief = o.relief !== undefined ? o.relief : 0.025, half = W / 2;
  const sp = o.speckle !== undefined ? o.speckle : 0.35, out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const pingGain = 1 + (o.pingNoise !== undefined ? o.pingNoise : 0.06) * V.gaussRand(rnd);
    for (const side of [-1, 1]) {
      let minDep = Infinity;
      for (let k = 0; k < half; k++) {
        const s = (k + 0.5) / half, x = side > 0 ? Math.floor(half + k) : Math.floor(half - 1 - k); let v;
        if (s <= alt) v = 0.04 + 0.05 * Math.pow(rnd(), 3) + (Math.abs(s - alt) < 0.004 ? 0.4 : 0); // water column; the first bottom return
        else {
          const gr = Math.sqrt(s * s - alt * alt) / Math.sqrt(1 - alt * alt), sx = half + side * gr * half, sxc = Math.max(0, Math.min(W - 1, sx));
          const z = relief * bilinear(Hm, W, H, sxc, y), z2 = relief * bilinear(Hm, W, H, Math.max(0, Math.min(W - 1, sx - side * 2)), y);
          const dep = (alt - z) / Math.max(1e-4, gr); const lit = dep <= minDep + 1e-4; minDep = Math.min(minDep, dep);
          const slope = (z - z2) / (2 / half); // rising towards the sonar = facing it = brighter
          v = lit ? clamp01(0.25 + 0.75 * bilinear(Y, W, H, sxc, y)) * (0.55 + 0.45 * Math.max(0, 1 + 4 * slope)) : 0.02;
          v *= (0.75 + 0.25 * s) * (1 + (o.tvg || 0) * Math.sin(s * 9));
        }
        v *= pingGain * (1 + sp * (-Math.log(Math.max(1e-6, rnd())) - 1) * 0.6);
        out[y * W + x] = clamp01(v * (o.gain || 1));
      }
    }
  }
  if (o.palette && o.palette !== "grey") return back(palette(out, o.palette, 0), W, H, g);
  return mono(out, W, H, g);
}

/* ---- echo sounder: each column one ping, depth downwards; a paper recorder burns darker for stronger echoes
 * (paper recorders from 1948, consumer 1965 [SEC Sport Fishing; Furuno]); later LCD and colour sounders show echo
 * strength in colour bands (colours [EST]). The photo's brightness is the echo strength; the seabed is put at the
 * strongest echo in the lower part of each column [EST]. */
function sounder(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P);
  const cols = Math.max(32, Math.round(o.cols || 240)), rows = Math.max(32, Math.round(o.rows || cols * H / W));
  const S = V.resize(Y, W, H, cols, rows), out = new Float32Array(cols * rows), Sb = blur(S, cols, rows, 2);
  // the seabed: the first place each column gets bright and stays bright, searched in the lower part of the record and
  // smoothed along the track so it reads as one bottom line [EST]
  const raw = new Float32Array(cols);
  for (let x = 0; x < cols; x++) { let best = -1; raw[x] = rows * 0.9; for (let y = Math.floor(rows * (o.bottomFrom !== undefined ? o.bottomFrom : 0.55)); y < rows * 0.94; y++) { let m = 0; for (let k = 0; k < 6; k++) m += Sb[(y + k) * cols + x]; if (m > best) { best = m; raw[x] = y; } } }
  const half = Math.max(2, Math.round(cols / 25)), bed = new Float32Array(cols);
  for (let x = 0; x < cols; x++) { const w = []; for (let k = -half; k <= half; k++) w.push(raw[Math.max(0, Math.min(cols - 1, x + k))]); w.sort((a, b) => a - b); bed[x] = w[half]; }
  for (let pass = 0; pass < 3; pass++) { const c = Float32Array.from(bed); for (let x = 0; x < cols; x++) { let t = 0, n = 0; for (let k = -half; k <= half; k++) { const j = x + k; if (j >= 0 && j < cols) { t += c[j]; n++; } } bed[x] = t / n; } }
  for (let x = 0; x < cols; x++) {
    const bottom = Math.round(bed[x]);
    for (let y = 0; y < rows; y++) { const i = y * cols + x; let v = S[i] * (o.gain || 0.8);
      if (y < 3) v = 1; // the transducer's own pulse at the surface
      if (y >= bottom) v = y - bottom < rows * 0.03 ? 1 : clamp01(0.95 - (y - bottom) / (rows * 0.35)) * (0.7 + 0.3 * rnd());
      out[i] = clamp01(v + (o.noise || 0.04) * Math.pow(rnd(), 6) * 6); }
  }
  const up = nearest(out, cols, rows, W, H);
  if (o.palette === "paper") return back(palette(up.map(v => v), "sepia", o.levels || 6), W, H, g);
  return back(palette(up, o.palette || "sounder", o.levels || 8), W, H, g);
}

/* ---- ultrasound: echoes from tissue boundaries drawn along beam lines; speckle from the interference of tiny
 * scatterers; shadows below strongly attenuating things and enhancement below fluid; time-gain compensation evens out
 * depth [SEC Perperidis 2016 review; UBC notes]. Early B-scans were bistable (each point on or off); grey scale came with
 * scan converters about 1969-75, one maker's machine black-on-white [SEC ob-ultrasound.net histories]. Sector angle,
 * beam count and levels [EST]. The photo is the tissue: edges echo, dark areas are fluid [EST]. */
function ultrasound(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P), Yb = blur(Y, W, H, 1.2 * H / 576);
  const geom = o.geometry || "sector", ang = (o.angle || (o.geometry === "convex" ? 60 : 90)) * Math.PI / 180, nb = Math.max(16, Math.round(o.beams || 128)), nr = Math.max(64, Math.round(o.samples || H));
  const apexY = geom === "convex" ? -0.35 * H : 0.02 * H, depth = geom === "convex" ? H * 1.3 : H * 0.95;
  const startR = geom === "convex" ? 0.35 * H : 0;
  // beam-space data: nb beams x nr samples
  const S = new Float32Array(nb * nr), ech = o.edges !== undefined ? o.edges : 0.8, scat = o.scatter !== undefined ? o.scatter : 0.35;
  const att = o.attenuation !== undefined ? o.attenuation : 1.2, shadowK = o.shadow !== undefined ? o.shadow : 2.5;
  const noiseB = new Float32Array(nb * nr); for (let i = 0; i < noiseB.length; i++) noiseB[i] = V.gaussRand(rnd);
  const nb2 = Float32Array.from(noiseB), nb3 = Float32Array.from(noiseB.map(() => V.gaussRand(rnd))); CAM.blur2D(nb2, nr, nb, 1.0, 1.6); CAM.blur2D(nb3, nr, nb, 1.0, 1.6);
  const cx = W / 2, mL = 0.08 * W;
  const srcAt = (b, k) => { // where beam b, sample k lies on the screen, which is where it looks in the photo
    const u = (b + 0.5) / nb, d = (k + 0.5) / nr;
    if (geom === "linear") return [mL + u * (W - 2 * mL), 0.03 * H + d * 0.94 * H];
    const th = (u - 0.5) * ang, r = startR + d * depth; return [Math.max(0, Math.min(W - 1, cx + Math.sin(th) * r)), Math.max(0, Math.min(H - 1, apexY + Math.cos(th) * r))]; };
  for (let b = 0; b < nb; b++) { let T = 1;
    for (let k = 0; k < nr; k++) { const [sx, sy] = srcAt(b, k), [sx2, sy2] = srcAt(b, Math.min(nr - 1, k + 1));
      const a = bilinear(Yb, W, H, sx, sy), a2 = bilinear(Yb, W, H, sx2, sy2), refl = Math.min(1, Math.abs(a2 - a) * 18);
      const sp = Math.hypot(nb2[k + b * nr] , nb3[k + b * nr]) * 0.9; // Rayleigh-like speckle
      let e = (ech * refl + scat * (0.15 + 0.85 * a) * sp) * T;
      T *= Math.exp(-(att * (0.3 + a) / nr) - shadowK * Math.max(0, a - 0.7) * refl * 0.12); // bright, edged things (bone, stone) cast shadows below them [EST amounts]
      T += (1 - T) * 0.004; // scatter from either side slowly fills a shadow [EST]
      e *= Math.exp(att * 1.3 * k / nr) * (1 + (o.tgcBands || 0) * 0.25 * Math.sin(k / nr * 14)); // TGC
      S[b * nr + k] = e; } }
  // display: log compression, levels, bistable
  const dyn = o.dynamic || 40, gainD = o.gain || 0.15;
  for (let i = 0; i < S.length; i++) { let v = Math.log10(1 + S[i] * gainD * Math.pow(10, dyn / 20)) / (dyn / 20); v = clamp01(v);
    if (o.bistable) v = v > (o.threshold || 0.55) ? 1 : 0; else if (o.levels) v = Math.round(v * (o.levels - 1)) / (o.levels - 1); S[i] = v; }
  const out = new Float32Array(W * H).fill(o.invert ? 1 : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let b, k;
    if (geom === "linear") { const m = 0.08 * W; if (x < m || x > W - m || y < 0.03 * H || y > 0.97 * H) continue; b = (x - m) / (W - 2 * m) * nb - 0.5; k = (y - 0.03 * H) / (0.94 * H) * nr - 0.5; }
    else { const dx = x - cx, dy = y - apexY, r = Math.hypot(dx, dy), th = Math.atan2(dx, dy); if (Math.abs(th) > ang / 2 || r < startR || r > startR + depth) continue;
      b = (th / ang + 0.5) * nb - 0.5; k = (r - startR) / depth * nr - 0.5; }
    const b0 = Math.max(0, Math.min(nb - 1, Math.round(b))), k0 = Math.max(0, Math.min(nr - 1, Math.floor(k))), k1 = Math.min(nr - 1, k0 + 1), fk = Math.max(0, k - k0);
    const lineMix = o.lineGaps !== undefined ? o.lineGaps : 0.3, b1 = Math.max(0, Math.min(nb - 1, b0 + (b > b0 ? 1 : -1))), fb = Math.min(1, Math.abs(b - b0));
    let v = S[b0 * nr + k0] * (1 - fk) + S[b0 * nr + k1] * fk, v2 = S[b1 * nr + k0] * (1 - fk) + S[b1 * nr + k1] * fk;
    v = v * (1 - fb * (1 - lineMix)) + v2 * fb * (1 - lineMix);
    out[y * W + x] = o.invert ? 1 - v : v;
  }
  if (o.scale !== false) { const col = o.invert ? 0 : 1; for (let k = 1; k < 20; k++) { const yy = Math.round(apexY + startR + k * depth / 20); if (yy >= H || yy < 0) continue; const xx = Math.round(0.04 * W);
    const s = k % 5 === 0 ? 2 : 1; for (let a = 0; a < s; a++) for (let b2 = 0; b2 < s; b2++) if (xx + a < W && yy + b2 < H && xx >= 0) out[(yy + b2) * W + xx + a] = col; } }
  return mono(out, W, H, g);
}

/* ---- CT: the slice is reconstructed from X-ray projections by filtered back-projection. EMI's first clinical scanner
 * (Atkinson Morley Hospital, 1 October 1971): 80 x 80 matrix, 160 readings at each of 180 angles 1° apart, about 5
 * minutes a scan and 20 minutes to reconstruct [SEC ETHW; Wikipedia]. Here the photo (inside a circle) is the slice and is
 * actually projected and reconstructed, so streaks and ringing come from the method; photon noise and the window [EST]. */
function ct(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P);
  const N = Math.max(32, Math.min(320, Math.round(o.matrix || 80))), M = 2 * N, na = Math.max(18, Math.round(o.angles || (N <= 80 ? 180 : 2 * N))), nd = Math.round((o.readings || 2) * N);
  const side = Math.min(W, H), x0 = (W - side) / 2, y0 = (H - side) / 2;
  const crop = new Float32Array(side * side); for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) crop[y * side + x] = Y[Math.floor(y + y0) * W + Math.floor(x + x0)];
  const obj = V.resize(crop, side, side, M, M), c = (M - 1) / 2, Rm = M / 2;
  for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) if (Math.hypot(x - c, y - c) > Rm * 0.96) obj[y * M + x] = 0;
  // projections
  const proj = new Float32Array(na * nd), ds = M / nd, noise = (o.noise !== undefined ? o.noise : 0.01) * 80 / N; // noise given for the 80 matrix; finer matrices need it smaller to look alike
  for (let a = 0; a < na; a++) { const th = Math.PI * a / na, cs = Math.cos(th), sn = Math.sin(th);
    for (let d = 0; d < nd; d++) { const t = (d + 0.5 - nd / 2) * ds; let s = 0;
      for (let u = -Rm; u <= Rm; u += 1) { const x = c + t * cs - u * sn, y = c + t * sn + u * cs; const v = bilinear(obj, M, M, x, y); if (v > 0) s += v; }
      proj[a * nd + d] = s / M + noise * V.gaussRand(rnd); } }
  // ramp filter (Ram-Lak), applied by convolution
  const kh = new Float32Array(2 * nd + 1); for (let n = -nd; n <= nd; n++) kh[n + nd] = n === 0 ? 0.25 : (n % 2 ? -1 / (Math.PI * Math.PI * n * n) : 0);
  const fp = new Float32Array(na * nd);
  for (let a = 0; a < na; a++) for (let d = 0; d < nd; d++) { let s = 0; for (let e = 0; e < nd; e++) s += proj[a * nd + e] * kh[d - e + nd]; fp[a * nd + d] = s; }
  // back-projection onto N x N
  const rec = new Float32Array(N * N), cN = (N - 1) / 2, sc = M / N;
  const cosT = [], sinT = []; for (let a = 0; a < na; a++) { cosT.push(Math.cos(Math.PI * a / na)); sinT.push(Math.sin(Math.PI * a / na)); }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = (x - cN) * sc, Yp = (y - cN) * sc; if (Math.hypot(X, Yp) > Rm * 0.98) { rec[y * N + x] = -1; continue; } let s = 0;
    for (let a = 0; a < na; a++) { const t = (X * cosT[a] + Yp * sinT[a]) / ds + nd / 2 - 0.5, t0 = Math.floor(t), f = t - t0; if (t0 < 0 || t0 >= nd - 1) continue; s += fp[a * nd + t0] * (1 - f) + fp[a * nd + t0 + 1] * f; }
    rec[y * N + x] = s * Math.PI / na * M / ds; }
  const win = o.window || 0.9, lev = o.level !== undefined ? o.level : 0.45;
  for (let i = 0; i < rec.length; i++) rec[i] = rec[i] === -1 ? (o.surround !== undefined ? o.surround : 0) : clamp01((rec[i] - (lev - win / 2)) / win);
  const sq = o.smooth ? V.resize(rec, N, N, side, side) : nearest(rec, N, N, side, side), out = new Float32Array(W * H);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) out[Math.floor(y + y0) * W + Math.floor(x + x0)] = sq[y * side + x];
  if (o.levels) for (let i = 0; i < out.length; i++) out[i] = Math.round(out[i] * (o.levels - 1)) / (o.levels - 1);
  return mono(out, W, H, g);
}

/* ---- MRI: the picture is measured as its spatial frequencies (k-space) and rebuilt by Fourier transform. Too few
 * samples ring at sharp edges (Gibbs); a field of view smaller than the object wraps the outside back in; movement
 * during the scan leaves ghosts along the phase-encoding direction; fat is shifted along the frequency direction (about
 * 3.5 ppm) [SEC Wikipedia MRI artifact; Radiopaedia; RIT Basics of MRI]. The photo is the slice: brightness is signal;
 * "fat" is the brightest part [EST]. Matrix, ghost and noise amounts [EST]. */
function fft1(re, im, n, inv) {
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) { const a = (inv ? 2 : -2) * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, n, inv) { const r = new Float64Array(n), i2 = new Float64Array(n);
  for (let y = 0; y < n; y++) { for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; i2[x] = im[y * n + x]; } fft1(r, i2, n, inv); for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = i2[x]; } }
  for (let x = 0; x < n; x++) { for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; i2[y] = im[y * n + x]; } fft1(r, i2, n, inv); for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = i2[y]; } } }
function mri(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P);
  const N = [64, 128, 256, 512].reduce((b, v) => Math.abs(v - (o.matrix || 128)) < Math.abs(b - (o.matrix || 128)) ? v : b, 128), M = 2 * N;
  const side = Math.min(W, H), x0 = (W - side) / 2, y0 = (H - side) / 2, fov = Math.max(0.5, Math.min(1, o.fov || 1));
  // the object, larger than the field of view when fov < 1 (wrap-around in the phase direction, vertical here)
  const cropH = Math.min(H, side / fov), cy0 = (H - cropH) / 2, crop = new Float32Array(side * Math.round(cropH));
  for (let y = 0; y < Math.round(cropH); y++) for (let x = 0; x < side; x++) crop[y * side + x] = Y[Math.min(H - 1, Math.floor(y + cy0)) * W + Math.floor(x + x0)];
  let obj = V.resize(crop, side, Math.round(cropH), M, Math.round(M / fov));
  const MH = Math.round(M / fov), fat = o.fatShift || 0, re = new Float64Array(M * M), im = new Float64Array(M * M);
  for (let y = 0; y < MH; y++) { const yy = ((y - Math.round((MH - M) / 2)) % M + M) % M; for (let x = 0; x < M; x++) { let v = obj[y * M + x]; const fx = x - fat;
      if (fat && v > (o.fatLevel || 0.75)) { /* fat moves along x */ } let vf = 0; if (fat) { const sx = Math.round(x + fat); const sv = sx >= 0 && sx < M ? obj[y * M + sx] : 0; vf = sv > (o.fatLevel || 0.75) ? sv : 0; if (v > (o.fatLevel || 0.75)) v = 0; void fx; }
      re[yy * M + x] += v + vf; } }
  fft2(re, im, M, false);
  // keep the central N x N of k-space (the acquired matrix); ghosts: a phase error per phase-encoding line
  const kre = new Float64Array(N * N), kim = new Float64Array(N * N), gh = o.ghosts || 0, per = o.ghostPeriod || 0;
  for (let ky = 0; ky < N; ky++) { const sy = ((ky - N / 2) + M) % M, ph = gh * (per ? Math.sin(2 * Math.PI * ky / per) : V.gaussRand(rnd)), c = Math.cos(ph), s = Math.sin(ph);
    for (let kx = 0; kx < N; kx++) { const sx = ((kx - N / 2) + M) % M, a = re[sy * M + sx], b = im[sy * M + sx], dy = ((ky - N / 2) + N) % N, dx = ((kx - N / 2) + N) % N;
      kre[dy * N + dx] = a * c - b * s + (o.noise || 0.4) * N * V.gaussRand(rnd); kim[dy * N + dx] = a * s + b * c + (o.noise || 0.4) * N * V.gaussRand(rnd); } }
  fft2(kre, kim, N, true);
  const img = new Float32Array(N * N), scale = (N * N) / (M * M); let mx = 0;
  for (let i = 0; i < N * N; i++) { img[i] = Math.hypot(kre[i], kim[i]) * scale; mx = Math.max(mx, img[i]); }
  const win = o.window || 1, lev = o.level !== undefined ? o.level : 0.5;
  for (let i = 0; i < img.length; i++) img[i] = clamp01((img[i] / (mx || 1) * 1.1 - (lev - win / 2)) / win);
  const sq = o.smooth === false ? nearest(img, N, N, side, side) : V.resize(img, N, N, side, side), out = new Float32Array(W * H);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) out[Math.floor(y + y0) * W + Math.floor(x + x0)] = sq[y * side + x];
  return mono(out, W, H, g);
}

/* ---- X-ray image intensifier: a round field, brighter in the middle (vignetting), stretched at the edges (pincushion:
 * curved input, flat output), twisted into an S by the Earth's field, washed by veiling glare, and grainy with quantum
 * mottle at low dose [SEC Radiopaedia; RadioGraphics 2000]. Its output was usually watched through a TV camera, so this
 * suits a CCTV standard [SEC]. The photo is the X-ray shadow: bright = dense unless inverted [EST]. Amounts [EST]. */
function fluoro(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P), cx = W / 2, cy = H / 2, R = (o.radius || 0.48) * Math.min(W, H) * (o.fill ? 1.42 : 1);
  const pin = o.pincushion !== undefined ? o.pincushion : 0.12, sd = (o.sDistortion !== undefined ? o.sDistortion : 0.06), vig = o.vignette !== undefined ? o.vignette : 0.35;
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - cx) / R, dy = (y - cy) / R, r = Math.hypot(dx, dy); if (r > 1) { out[y * W + x] = -1; continue; }
    const rs = r * (1 - pin * r * r) / (1 - pin), a = Math.atan2(dy, dx) + sd * Math.sin(Math.PI * r); // pincushion and S-twist
    const sx = cx + rs * Math.cos(a) * R, sy = cy + rs * Math.sin(a) * R; let v = bilinear(Y, W, H, Math.max(0, Math.min(W - 1, sx)), Math.max(0, Math.min(H - 1, sy)));
    v = o.invert ? 1 - v : v; out[y * W + x] = v * (1 - vig * r * r); }
  const gl = o.glare !== undefined ? o.glare : 0.25, Bl = blur(out.map(v => Math.max(0, v)), W, H, 0.08 * H), dose = o.dose || 1, mott = o.mottle !== undefined ? o.mottle : 0.5;
  const nz = new Float32Array(W * H); for (let i = 0; i < nz.length; i++) nz[i] = V.gaussRand(rnd); CAM.blur2D(nz, W, H, 0.8 * H / 576, 0.8 * H / 576);
  for (let i = 0; i < out.length; i++) { if (out[i] < 0) { out[i] = 0; continue; } let v = out[i] * (1 - gl * 0.5) + gl * Bl[i]; v += mott * 0.12 * Math.sqrt(Math.max(0.02, v) / dose) * nz[i] * 1.6; out[i] = clamp01(Math.pow(clamp01(v), o.gamma || 1)); }
  return mono(out, W, H, g);
}

/* ---- gamma camera: the picture is built from counted gamma rays (Anger camera, 1957-58 [SEC Wikipedia; Radiopaedia]),
 * digitised in the 1970s to 50 x 50 or 128 x 128 [SEC J Nucl Med 1973; Budinger 1972]: few counts, so it is grainy, and
 * the collimator blurs. The photo's brightness is the activity [EST]. Count totals and colour scales [EST]. */
function gamma(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); let A = blur(lum(P), W, H, (o.spread || 3) * H / 576);
  const N = Math.max(16, Math.round(o.matrix || 128)), NH = Math.round(N * H / W), act = V.resize(A, W, H, N, NH);
  let sum = 0; for (let i = 0; i < act.length; i++) { act[i] = Math.pow(Math.max(0, act[i]), o.contrast || 2); sum += act[i]; }
  const C = o.counts || 300000, cnt = new Float32Array(act.length); let mx = 0;
  for (let i = 0; i < act.length; i++) { const lam = act[i] / (sum || 1) * C; let k; if (lam < 30) { const L = Math.exp(-lam); let p = 1; k = 0; do { k++; p *= rnd(); } while (p > L); k--; } else k = Math.max(0, Math.round(lam + Math.sqrt(lam) * V.gaussRand(rnd))); cnt[i] = k; }
  const sorted = Array.from(cnt).sort((a, b) => a - b); mx = sorted[Math.floor(sorted.length * 0.995)] || 1;
  for (let i = 0; i < cnt.length; i++) cnt[i] = clamp01(cnt[i] / mx);
  if (o.round) { const c = (N - 1) / 2, cyN = (NH - 1) / 2, r = Math.min(N, NH) / 2; for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - c, y - cyN) > r) cnt[y * N + x] = o.palette === "inverse" ? 0 : 0; }
  const up = o.smooth ? V.resize(cnt, N, NH, W, H) : nearest(cnt, N, NH, W, H);
  return back(palette(up, o.palette || "grey", o.levels || 0), W, H, g);
}

/* ---- scanning electron microscope: secondary electrons escape more from edges and slopes, so edges glow (the edge
 * effect); insulating samples charge, giving bright patches, smears and displaced lines; slow scans are noisy line by
 * line [SEC NIST; JEOL guide via UPenn; Thong 2001]. Photomicrographs carried a data bar (accelerating voltage,
 * magnification, scale bar) [OBS; layout EST]. The photo's brightness is the height [EST]. */
function sem(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const Y = lum(P), h = blur(Y, W, H, (o.smoothHeight || 1.5) * H / 576), out = new Float32Array(W * H);
  const edgeK = o.edge !== undefined ? o.edge : 1.0, tilt = o.tilt !== undefined ? o.tilt : 0.4, mat = o.material !== undefined ? o.material : 0.35;
  const charge = o.charging || 0, cthr = o.chargeLevel || 0.8, lineN = o.lineNoise !== undefined ? o.lineNoise : 0.04, noise = o.noise !== undefined ? o.noise : 0.05;
  const lineShift = new Float32Array(H); let chargeAcc = 0;
  for (let y = 0; y < H; y++) { lineShift[y] = 0; }
  for (let y = 1; y < H - 1; y++) {
    const lg = 1 + lineN * V.gaussRand(rnd); let smear = 0;
    for (let x = 1; x < W - 1; x++) { const sx = Math.max(1, Math.min(W - 2, Math.round(x - lineShift[y]))), i = y * W + sx;
      const gx = (h[i + 1] - h[i - 1]) * 0.5 * H / 16, gy = (h[i + W] - h[i - W]) * 0.5 * H / 16, sl = Math.hypot(gx, gy);
      let v = 0.12 + mat * Y[i] + edgeK * 0.75 * (1 - 1 / Math.sqrt(1 + sl * sl)) + tilt * 0.25 * Math.tanh(-gx - gy * 0.5);
      if (charge && Y[i] > cthr) { smear = Math.min(1.5, smear + charge * 0.08); chargeAcc += charge * 0.002; } else smear *= 0.985;
      v += smear * 0.6; out[y * W + x] = clamp01(v * lg + noise * V.gaussRand(rnd)); }
    if (charge && rnd() < charge * 0.08) { const d = (rnd() - 0.5) * charge * 30 * H / 576; for (let k = y + 1; k < Math.min(H, y + 1 + Math.floor(rnd() * 20)); k++) lineShift[k] += d; }
  }
  void chargeAcc;
  if (o.scanLines) for (let y = 0; y < H; y++) { const f = 0.9 + 0.1 * Math.cos(2 * Math.PI * y / H * o.scanLines); for (let x = 0; x < W; x++) out[y * W + x] *= f; }
  if (o.databar !== false) { // data bar: a black strip with voltage, magnification and a scale bar
    const bh = Math.round(H * 0.07), s = Math.max(1, Math.round(bh / 13)), yb = H - bh;
    for (let y = yb; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = 0.02;
    const txt = o.databarText || "20KV  X1,000         10µm  0001", P1 = [out]; drawText(P1, W, H, txt, Math.round(W * 0.03), yb + Math.round((bh - 9 * s) / 2), s, 0.95);
    const bx = Math.round(W * 0.03 + 6 * s * 14), bw = Math.round(6 * s * 6.5), by = yb + Math.round(bh / 2); for (let y = by - s; y <= by; y++) for (let x = bx; x < bx + bw && x < W; x++) out[y * W + x] = 0.95;
  }
  return mono(out, W, H, g);
}

/* ---- scanning probe microscope (AFM/STM): a height map scanned line by line; each line can sit at its own level (line
 * offsets left after flattening), fast scans leave streaks along the lines, and the tip's own shape broadens every
 * feature (tip convolution) [SEC Eaton AFM FAQ; DoITPoMS; Wurzburg AFM notes]. Shown in false colour, often with relief
 * shading [OBS; palettes EST]. The photo's brightness is the height [EST]. */
function spm(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const N = Math.max(32, Math.round(o.px || 256)), NH = Math.round(N * H / W);
  let h = V.resize(blur(lum(P), W, H, (o.smoothHeight || 1) * H / 576), W, H, N, NH);
  const tip = Math.max(0, Math.round(o.tip !== undefined ? o.tip : 1.5)); if (tip) { const d = new Float32Array(h.length); // grey dilation by a round tip
    for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) { let m = -1; for (let b = -tip; b <= tip; b++) for (let a = -tip; a <= tip; a++) { const r2 = (a * a + b * b) / (tip * tip); if (r2 > 1) continue; const X = x + a, Y2 = y + b; if (X < 0 || Y2 < 0 || X >= N || Y2 >= NH) continue; const v = h[Y2 * N + X] - 0.04 * r2 * tip; if (v > m) m = v; } d[y * N + x] = m; } h = d; }
  const lo = o.lineOffsets !== undefined ? o.lineOffsets : 0.04, st = o.streaks !== undefined ? o.streaks : 0.02, tiltX = o.tiltX || 0;
  for (let y = 0; y < NH; y++) { const off = lo * V.gaussRand(rnd), bow = (o.bow || 0) * 0.1; for (let x = 0; x < N; x++) { const u = x / N - 0.5; h[y * N + x] += off + tiltX * u + bow * u * u + (o.noise || 0.01) * V.gaussRand(rnd); }
    if (rnd() < st) { const x0 = Math.floor(rnd() * N), len = Math.floor(rnd() * N * 0.5), a = (rnd() < 0.5 ? -1 : 1) * (0.1 + 0.3 * rnd()); for (let x = x0; x < Math.min(N, x0 + len); x++) h[y * N + x] += a; } }
  let mn = Infinity, mx = -Infinity; const s = Array.from(h).sort((a, b) => a - b); mn = s[Math.floor(s.length * 0.01)]; mx = s[Math.floor(s.length * 0.99)];
  const hn = h.map(v => clamp01((v - mn) / (mx - mn || 1)));
  let up = o.smooth ? V.resize(hn, N, NH, W, H) : nearest(hn, N, NH, W, H);
  const col = palette(up, o.palette || "afmhot", 0);
  if (o.shade) { const hs = V.resize(hn, N, NH, W, H); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x, nx = (hs[i + 1] - hs[i - 1]) * (o.shade * 8), ny = (hs[i + W] - hs[i - W]) * (o.shade * 8), d = (1 - 0.7 * nx - 0.7 * ny) / Math.sqrt(1 + nx * nx + ny * ny); for (let c = 0; c < 3; c++) col[c][i] = clamp01(col[c][i] * (0.35 + 0.75 * Math.max(0, d))); } }
  return back(col, W, H, g);
}

function instrument(grid, g, o) {
  o = o || {}; const fn = { probe, framelet, mss, radar, sidescan, sounder, ultrasound, ct, mri, fluoro, gamma, sem, spm }[o.kind]; if (!fn) return grid;
  const rnd = V.mulberry32(((o.seed || 1) * 2246822519 + 31) >>> 0);
  return fn(grid, g, o, rnd).map(p => { for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : p[i] > 1.05 ? 1.05 : p[i]; return p; });
}
const api = { KINDS, instrument, PALETTES };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLInstrument = api;
