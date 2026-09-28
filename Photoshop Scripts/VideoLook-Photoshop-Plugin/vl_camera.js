/* VideoLook camera stage. Works on the standard's grid in linear light and returns gamma-corrected R'G'B'.
 * Processing order follows the BBC ETD 16F (1980) block diagram: optics/tube -> flare correction -> black level ->
 * matrix -> contour adder -> gamma -> clipping. [SEC]
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;

/* Camera types. Every value names its source; [EST] values are judgement and are flagged on the panel.
 *  mtf: horizontal response points [MHz, gain] of tube + optics (before contour correction)
 *  noiseDb: luminance-equivalent SNR (dB) measured with linear gamma, no contour; noise: 'tri' rising with frequency | 'flat'
 *  blueExtraDb: how much worse the blue channel is
 */
const CAMERAS = {
  none: null,
  emitron: { label: "Emitron / iconoscope, 1936-50s", tubes: 1, mono: true,
    mtf: [[0.5, 0.9], [1.5, 0.6], [2.5, 0.35], [3.5, 0.15]], // [EST] no measured MTF found
    transfer: { type: "power", g: 0.8 }, knee: 0.8, kneeSlope: 0.3, // [EST]
    shading: 0.12, // "areas of black and white shading" [SEC via Wikipedia, Quatermass]; amount [EST]
    noiseDb: 32, noise: "flat", flare: 0.05, contour: 0, gamma: "power045", clip: 1.0 },
  cps_emitron: { label: "CPS Emitron, 1950s", tubes: 1, mono: true,
    mtf: [[1, 0.9], [2, 0.7], [3, 0.45], [4, 0.25]], transfer: { type: "power", g: 1.0 }, knee: 0.85, kneeSlope: 0.3, // [EST]
    shading: 0.04, noiseDb: 36, noise: "flat", flare: 0.03, contour: 0, gamma: "power045", clip: 1.0 },
  io_mono: { label: "Image orthicon (B&W), 1946-68", tubes: 1, mono: true,
    mtf: [[1.5, 0.7], [3, 0.4], [5, 0.2]], // 3 in I.O. tube ~50% at 400 TVL [MFR EEV] with lens/aperture losses [EST]
    transfer: { type: "knee", g: 1.0 }, knee: 0.75, kneeSlope: 0.25, // highlight knee [MFR EEV]; position [EST]
    halo: 0.12, haloRadius: 0.02, // dark halo [MFR/SEC]; size NOT FOUND [EST]
    noiseDb: 35, noise: "flat", flare: 0.03, contour: 0.25, gamma: "power045", clip: 1.0 }, // 34-39 dB [MFR]
  io_colour: { label: "3-tube image orthicon colour (Marconi/RCA), 1954-60s", tubes: 3,
    mtf: [[1.5, 0.7], [3, 0.17], [5, 0.06]], // Marconi 3 in I.O. camera, T-132 Table 5 [SEC]
    transfer: { type: "knee", g: 1.0 }, knee: 0.75, kneeSlope: 0.25, halo: 0.1, haloRadius: 0.02,
    noiseDb: 33.1, noise: "flat", blueExtraDb: 4, // T-132 [SEC]
    matrix: 1.15, // "most saturated" [SEC T-132]; strength [EST]
    blueWeak: 0.1, // poor blue analysis [SEC T-132]; amount [EST]
    reg: { rx: 40, bx: -40, ry: 0.3, by: -0.3, size: 0.4 }, // ns, lines, % at edge: poorer than PH-11 tolerance [EST]
    flare: 0.03, contour: 0.3, gamma: "power045", clip: 1.0 },
  vidicon: { label: "Vidicon (industrial, telecine, early ENG)", tubes: 1,
    mtf: [[1, 0.85], [3, 0.5], [5, 0.2]], transfer: { type: "power", g: 0.65 }, // gamma 0.6-0.7 [SEC, BBC sheets conflict]
    lag: 0.35, noiseDb: 40, noise: "tri", flare: 0.02, contour: 0.3, gamma: "power045", clip: 1.0 },
  plumbicon3: { label: "3-tube Plumbicon (1967-1990 studio/OB)", tubes: 3,
    mtf: [[1, 0.95], [2, 0.89], [3, 0.8], [4, 0.69], [5, 0.55], [6, 0.34], [7, 0.02]], // ETD 16F Fig 21 [SEC]
    transfer: { type: "power", g: 0.95 }, // [MFR Philips]
    redCut: 0.3, // blind above ~630 nm: reds and faces darker [MFR; SEC T-132]; strength [EST]
    lag: 0.1, noiseDb: 38, noise: "tri", blueExtraDb: 8, // 38.0 dB luminance, blue ~28-29 dB [SEC T-132]
    matrixBBC: true, // [[1.12,-0.16,0.04],[-0.02,1.23,-0.21],[-0.02,-0.01,1.03]] [SEC ETD 1983]
    reg: { rx: 20, bx: -15, ry: 0, by: 0, size: 0.1 }, // within PH-11 25 ns tolerance [SEC]
    flare: 0.02, contour: 0.44, gamma: "bbc1980", clip: 1.0 },
  fourtube_1964: { label: "Four-tube (I.O. luminance + vidicons), 1964", tubes: 4,
    mtf: [[1.5, 0.9], [3, 0.65], [5, 0.25]], colourMtf: 2.0e6, // EMI T-132 Table 5 [SEC]; colouring channels -3 dB 2 MHz [SEC PH-11]
    transfer: { type: "knee", g: 1.0 }, knee: 0.8, kneeSlope: 0.3, halo: 0.06, haloRadius: 0.02,
    noiseDb: 34.7, noise: "flat", blueExtraDb: 5, matrix: 0.8, // "low saturation" [SEC T-132]; strength [EST]
    reg: { rx: 60, bx: -50, ry: 0.5, by: -0.4, size: 0.3 }, // "obvious" misregistration [SEC T-132]; values [EST]
    lag: 0.2, flare: 0.03, contour: 0.4, gamma: "power045", clip: 1.0 },
  emi2001: { label: "EMI 2001 four-tube Plumbicon (UK studio 1968-91)", tubes: 4,
    mtf: [[1, 0.95], [2, 0.89], [3, 0.8], [4, 0.69], [5, 0.55], [6, 0.34], [7, 0.02]], colourMtf: 2.0e6, // luminance tube detail 1.5-5.5 MHz [OBS/SEC]
    transfer: { type: "power", g: 0.95 }, redCut: 0.3, lag: 0.1, comet: 0.5, // comet tails [OBS]
    noiseDb: 40, noise: "tri", blueExtraDb: 6, matrixBBC: true,
    reg: { rx: 45, bx: -40, ry: 0.3, by: -0.2, size: 0.15 }, // within PH-11 4-tube colour tolerance 50 ns [SEC]
    flare: 0.02, contour: 0.44, gamma: "bbc1980", clip: 1.0 },
  saticon_camcorder: { label: "Saticon tube camcorder (1980s)", tubes: 1, singleTube: true,
    mtf: [[1, 0.85], [2, 0.6], [3, 0.35]], transfer: { type: "power", g: 0.95 }, lag: 0.3, // "more image lag" [SEC]
    redFlare: 0.04, // orange-red flare [SEC BBC ETD]; amount [EST]
    noiseDb: 42, noise: "tri", chromaSoft: 0.5e6, flare: 0.04, contour: 0.5, gamma: "bt709", clip: 1.0, knee: 0.9, kneeSlope: 0.4 },
  ccd3_broadcast: { label: "3-CCD broadcast (late 1980s-90s)", tubes: 3,
    mtf: [[2, 0.95], [4, 0.8], [5.5, 0.6]], transfer: { type: "power", g: 1.0 }, smear: 0.02, // vertical smear [SEC/MFR]; amount [EST]
    noiseDb: 55, noise: "flat", flare: 0.01, contour: 0.4, gamma: "bt709", knee: 0.9, kneeSlope: 0.35, clip: 1.09 }, // knee/clip [MFR Sony, DV-era]
  ccd1_consumer: { label: "Single-CCD consumer camcorder (1985-2000)", tubes: 1, singleTube: true,
    mtf: [[1, 0.9], [2.5, 0.65], [3.5, 0.4]], transfer: { type: "power", g: 1.0 }, smear: 0.04, chromaSoft: 0.6e6, moire: 0.1, // [OBS]
    noiseDb: 46, noise: "flat", flare: 0.03, contour: 0.6, gamma: "bt709", knee: 0.85, kneeSlope: 0.3, clip: 1.09 },
  // ---- v1.1 ----
  // Intermediate film (Baird at Alexandra Palace 1936-37; Fernseh AG 1932-39): 35/17.5 mm film developed in about a minute
  // and scanned while still wet [SEC research H]. Grain, contrast, mottle and drying streaks are [EST]; no surviving pictures.
  intermediate_film: { label: "Intermediate film (Baird / Fernseh, 1932-39)", tubes: 1, mono: true,
    film: { grain: 1.0, contrast: 1.35, mottle: 0.08, streaks: 0.35 },
    mtf: [[0.3, 0.9], [0.7, 0.65], [1.1, 0.35]], transfer: { type: "power", g: 1.0 }, noiseDb: 36, noise: "flat", flare: 0.03, contour: 0, gamma: "power045", clip: 1.0 },
  // Westinghouse lunar camera, SEC tube, 320 lines 10 fps [SEC]; highlight handling and noise [EST]
  apollo_sec: { label: "Apollo lunar camera (SEC tube, 1969)", tubes: 1, mono: true,
    mtf: [[0.2, 0.9], [0.35, 0.65], [0.5, 0.4]], transfer: { type: "knee", g: 1.0 }, knee: 0.55, kneeSlope: 0.12,
    noiseDb: 33, noise: "flat", flare: 0.06, contour: 0, gamma: "power045", clip: 1.0, lag: 0.15 },
  // Fisher-Price PXL-2000: 120 x 90 CCD, 15 fps, black and white; the picture sits small in the middle of the TV frame [SEC];
  // inset size NOT FOUND [EST]
  pxl2000: { label: "Fisher-Price PXL-2000 (120 x 90 CCD, 1987)", tubes: 1, mono: true, sensor: [120, 90], inset: 0.62,
    mtf: [[4, 1]], transfer: { type: "power", g: 1.0 }, knee: 0.8, kneeSlope: 0.3, smear: 0.05,
    noiseDb: 31, noise: "flat", flare: 0.05, contour: 0, gamma: "power045", clip: 1.0 },
  // 1990s black-and-white CCTV CCD camera [EST: typical; not researched beyond the time-lapse recorder]
  cctv_ccd: { label: "Black-and-white CCTV camera (1990s)", tubes: 1, mono: true,
    mtf: [[2, 0.9], [3.5, 0.6], [4.5, 0.3]], transfer: { type: "power", g: 1.0 }, smear: 0.05, knee: 0.85, kneeSlope: 0.3,
    noiseDb: 44, noise: "flat", flare: 0.03, contour: 0.4, gamma: "bt709", clip: 1.0 },
  // Sony Portapak camera (vidicon): needed about 50 footcandles [SEC]; so noisier and laggier than studio vidicons [EST amounts]
  vidicon_portapak: { label: "Portapak vidicon (Sony, 1970)", tubes: 1, mono: true,
    mtf: [[1, 0.8], [2.5, 0.45], [3.5, 0.2]], transfer: { type: "power", g: 0.65 }, lag: 0.45, knee: 0.85, kneeSlope: 0.3,
    noiseDb: 35, noise: "tri", flare: 0.04, contour: 0.2, gamma: "power045", clip: 1.0 },
  dv3ccd: { label: "DV 3-CCD (1995-2005)", tubes: 3,
    mtf: [[2, 0.95], [4, 0.85], [5.5, 0.7]], transfer: { type: "power", g: 1.0 }, smear: 0.02,
    noiseDb: 50, noise: "flat", flare: 0.01, contour: 0.55, gamma: "bt709", knee: 0.9, kneeSlope: 0.35, clip: 1.09 }, // [MFR Sony PD150]
};

/* ---------- helpers ---------- */
function srgbToLin(v) { return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
// FIR whose zero-phase response follows the given [MHz, gain] points (linear interpolation, gain 1 at DC, last value held to 0 beyond)
function firFromResponse(points, fs, taps) {
  taps = taps || 63; if (taps % 2 === 0) taps++;
  const m = (taps - 1) / 2, N = 1024, h = new Float32Array(taps);
  const resp = f => { const mhz = f / 1e6; if (mhz <= 0) return 1; let p0 = [0, 1];
    for (const p of points) { if (mhz <= p[0]) { const t = (mhz - p0[0]) / (p[0] - p0[0]); return p0[1] + t * (p[1] - p0[1]); } p0 = p; }
    const last = points[points.length - 1]; const t = Math.min(1, (mhz - last[0]) / 1.0); return last[1] * (1 - t); };
  for (let i = 0; i < taps; i++) {
    const n = i - m; let acc = 0;
    for (let k = 0; k <= N; k++) { const f = k / N * fs / 2, w = (k === 0 || k === N) ? 0.5 : 1; acc += w * resp(f) * Math.cos(Math.PI * k * n / N); }
    const win = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (taps - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (taps - 1));
    h[i] = acc / N * win;
  }
  let s = 0; for (let i = 0; i < taps; i++) s += h[i]; for (let i = 0; i < taps; i++) h[i] /= s;
  return h;
}
function gaussK(sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1); let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-i * i / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s; return k;
}
function blurV(buf, w, h, k) {
  const r = (k.length - 1) >> 1, out = new Float32Array(buf.length);
  for (let y = 0; y < h; y++) for (let j = -r; j <= r; j++) {
    const yy = Math.min(h - 1, Math.max(0, y + j)), wt = k[j + r], o = y * w, oo = yy * w;
    for (let x = 0; x < w; x++) out[o + x] += wt * buf[oo + x];
  }
  buf.set(out);
}
function blur2D(buf, w, h, sx, sy) {
  if (sx > 0.3) VC.filterRows(buf, w, h, gaussK(sx));
  if (sy > 0.3) blurV(buf, w, h, gaussK(sy));
}
// sub-sample shift of a row-major plane: dx samples (+ right), dy rows (+ down), plus size error (fraction, radial about centre)
function shiftPlane(p, w, h, dx, dy, size) {
  const out = new Float32Array(p.length), cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x - dx - (x - cx) * size, sy = y - dy - (y - cy) * size;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const X0 = Math.min(w - 1, Math.max(0, x0)), X1 = Math.min(w - 1, Math.max(0, x0 + 1));
    const Y0 = Math.min(h - 1, Math.max(0, y0)), Y1 = Math.min(h - 1, Math.max(0, y0 + 1));
    out[y * w + x] = (p[Y0 * w + X0] * (1 - fx) + p[Y0 * w + X1] * fx) * (1 - fy) + (p[Y1 * w + X0] * (1 - fx) + p[Y1 * w + X1] * fx) * fy;
  }
  return out;
}

function V_resize(p, w, h, W, H) { return VC.resize(p, w, h, W, H); }
// Fast-processed film: log-contrast tone, grain, uneven development (mottle) and drying streaks along the film [EST]
function filmImage(L, ns, nl, f, rnd) {
  const n = ns * nl;
  const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = VC.gaussRand(rnd);
  blur2D(nz, ns, nl, 0.7, 0.7); let s2 = 0; for (let i = 0; i < n; i++) s2 += nz[i] * nz[i]; const kz = 1 / Math.sqrt(s2 / n || 1);
  const mot = new Float32Array(n); for (let i = 0; i < n; i++) mot[i] = VC.gaussRand(rnd);
  blur2D(mot, ns, nl, ns * 0.05, nl * 0.05); let m2 = 0; for (let i = 0; i < n; i++) m2 += mot[i] * mot[i]; const km = 1 / Math.sqrt(m2 / n || 1);
  const streak = new Float32Array(ns); for (let k = 0; k < 6; k++) { const x0 = Math.floor(rnd() * ns), wdt = 1 + rnd() * ns * 0.01, a = (rnd() - 0.5) * 0.25 * (f.streaks || 0); for (let x = 0; x < ns; x++) streak[x] += a * Math.exp(-Math.pow((x - x0) / wdt, 2)); }
  for (let c = 0; c < 3; c++) for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const i = y * ns + x; let v = L[c][i];
    v = 0.02 + v * 0.98; const t = Math.log2(v / 0.18), k = f.contrast || 1.3;
    v = 0.18 * Math.pow(2, k * t / (1 + Math.abs(t) * k / 5));
    v *= (1 + (f.mottle || 0) * mot[i] * km) * (1 + streak[x]) * (1 + 0.07 * (f.grain || 0) * nz[i] * kz);
    L[c][i] = Math.max(0, v);
  }
}

/* ---------- gamma laws ---------- */
function oetf(kind, L) {
  if (L <= 0) return 0;
  if (kind === "bbc1980") {
    // true 0.4 power law down to 2% of input; below that the gain is limited to 5 (a straight line), which leaves a
    // ~10% lift at black; the lift is removed and the gain restored by x1.12 -> "pseudo gamma 0.45" [SEC ETD Video Processing p.24]
    const lim = 0.02, yLim = Math.pow(lim, 0.4), lift = yLim - 5 * lim; // lift = 0.109
    const v = L >= lim ? Math.pow(L, 0.4) : yLim + 5 * (L - lim);
    return (v - lift) / (1 - lift);
  }
  if (kind === "power045") return Math.pow(L, 0.45);
  // BT.709 / SMPTE 170M [SPEC]
  return L < 0.018 ? 4.5 * L : 1.099 * Math.pow(L, 0.45) - 0.099;
}

/* ---------- the stage ---------- */
/* grid: [R,G,B] sRGB code values on ns x lines; g: geometry; cam: CAMERAS entry merged with user overrides;
 * o: { exposure (stops), seed }. Returns R'G'B' (camera output, video levels 0..clip). */
function camera(grid, g, cam, o) {
  o = o || {};
  const ns = g.ns, nl = g.lines, n = ns * nl;
  const rnd = VC.mulberry32(((o.seed || 1) * 7919) >>> 0);
  const expo = Math.pow(2, o.exposure || 0);
  // 1. scene linear light
  const L = grid.map(p => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = srgbToLin(p[i]) * expo; return a; });
  const pxPerPW = ns; // samples across the picture width
  // intermediate film: the scene is first a fast-processed film image [EST forms, see CAMERAS entry]
  if (cam.film) filmImage(L, ns, nl, cam.film, rnd);
  // low-resolution sensor (PXL-2000): box-average onto the sensor's cells, read out as analogue lines (soft across, stepped
  // down), and shown as an inset in the middle of the TV frame [SEC layout; inset size EST]
  if (cam.sensor) {
    const [sw, sh] = cam.sensor, ins = cam.inset || 1;
    for (let c = 0; c < 3; c++) {
      const cell = V_resize(L[c], ns, nl, sw, sh), out = new Float32Array(n);
      const x0 = ns * (1 - ins) / 2, y0 = nl * (1 - ins) / 2, xw = ns * ins, yh = nl * ins;
      for (let y = 0; y < nl; y++) { const v = (y - y0) / yh; if (v < 0 || v >= 1) continue; const cy = Math.min(sh - 1, Math.floor(v * sh));
        for (let x = 0; x < ns; x++) { const u = (x - x0) / xw; if (u < 0 || u >= 1) continue; const cx = u * sw - 0.5, a = Math.max(0, Math.min(sw - 1, Math.floor(cx))), b = Math.min(sw - 1, a + 1), f = Math.max(0, Math.min(1, cx - a)); out[y * ns + x] = cell[cy * sw + a] * (1 - f) + cell[cy * sw + b] * f; } }
      L[c] = out;
    }
  }
  // 2. colour taking: Plumbicon red blindness [MFR/SEC] as darker saturated reds [EST form]
  if (cam.redCut) for (let i = 0; i < n; i++) {
    const r = L[0][i], m = Math.max(L[1][i], L[2][i]); if (r > m) L[0][i] = r - cam.redCut * (r - m) * (r - m) / (r + 1e-6) * 1.0;
  }
  if (cam.blueWeak) for (let i = 0; i < n; i++) { const b = L[2][i], y = 0.3 * L[0][i] + 0.6 * L[1][i] + 0.1 * b; L[2][i] = b + cam.blueWeak * (y - b); }
  // flare (veiling glare) [SEC ETD: flare correction exists]; amount [EST]
  if (cam.flare) {
    for (let c = 0; c < 3; c++) { let s = 0; for (let i = 0; i < n; i++) s += L[c][i]; const f = cam.flare * s / n; for (let i = 0; i < n; i++) L[c][i] += f; }
  }
  if (cam.redFlare) { let s = 0; for (let i = 0; i < n; i++) s += L[0][i]; const f = cam.redFlare * s / n; for (let i = 0; i < n; i++) { L[0][i] += f; L[1][i] += 0.4 * f; } }
  // 3. tube / sensor sharpness: horizontal FIR from the response curve; vertical: same spatial spread [EST]
  const hM = firFromResponse(cam.mtf, g.fs, 63);
  let varH = 0; { const m = (hM.length - 1) / 2; for (let i = 0; i < hM.length; i++) varH += hM[i] * (i - m) * (i - m); }
  const sigH = Math.sqrt(Math.max(0, varH)); // samples
  const sigV = sigH * (nl / ns) * (4 / 3);    // rows, same spread in picture units (4:3)
  let Lum = null;
  if (cam.tubes === 4) { // separate luminance tube: sharp; colour tubes low-passed to colourMtf [SEC PH-11/T-132]
    Lum = new Float32Array(n); for (let i = 0; i < n; i++) Lum[i] = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i];
    VC.filterRows(Lum, ns, nl, hM); blur2D(Lum, ns, nl, 0, sigV);
    const hC = VC.lp3dB(cam.colourMtf || 2e6, g.fs, 1.0e6);
    for (let c = 0; c < 3; c++) { VC.filterRows(L[c], ns, nl, hC); blur2D(L[c], ns, nl, 0, sigV * 2); }
  } else {
    for (let c = 0; c < 3; c++) { VC.filterRows(L[c], ns, nl, hM); blur2D(L[c], ns, nl, 0, sigV); }
  }
  if (cam.chromaSoft) { // single-tube / single-chip colour: soft chroma [OBS]
    const hC = VC.lp3dB(cam.chromaSoft, g.fs, 0.6e6);
    const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i];
    for (let c = 0; c < 3; c++) { for (let i = 0; i < n; i++) L[c][i] -= Y[i]; VC.filterRows(L[c], ns, nl, hC); blur2D(L[c], ns, nl, 0, 1.2); for (let i = 0; i < n; i++) L[c][i] += Y[i]; }
  }
  // 4. registration: offsets in ns -> samples, rows; size error (% at the picture edge) [SEC PH-11, MFR Ikegami]
  const reg = Object.assign({}, cam.reg || {}, o.reg || {});
  if (cam.tubes >= 3 && (reg.rx || reg.bx || reg.ry || reg.by || reg.size)) {
    const nsToS = g.fs * 1e-9, sz = (reg.size || 0) / 100;
    L[0] = shiftPlane(L[0], ns, nl, (reg.rx || 0) * nsToS, reg.ry || 0, sz);
    L[2] = shiftPlane(L[2], ns, nl, (reg.bx || 0) * nsToS, reg.by || 0, -sz);
  }
  // 5. tube transfer and highlight knee [MFR]
  const tr = cam.transfer || { type: "power", g: 1 };
  const knee = cam.knee || 0, ks = cam.kneeSlope || 1;
  const tf = v => { if (v < 0) v = 0; if (tr.type === "power" && tr.g !== 1) v = Math.pow(v, tr.g); if (knee && v > knee) v = knee + (v - knee) * ks / (1 + (v - knee) * 2); return v; };
  const preKnee = cam.smear ? L.map(a => Float32Array.from(a)) : null;
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) L[c][i] = tf(L[c][i]);
  if (Lum) for (let i = 0; i < n; i++) Lum[i] = tf(Lum[i]);
  // CCD vertical smear: excess above sensor saturation spreads up and down the column [SEC/MFR]; strength [EST]
  if (cam.smear) {
    for (let c = 0; c < 3; c++) {
      const col = new Float32Array(ns);
      // excess light above sensor saturation (scene linear > 1) leaks into the vertical register for the whole column
      for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) col[x] += Math.max(0, preKnee[c][y * ns + x] - 1);
      for (let x = 0; x < ns; x++) { const add = cam.smear * col[x] / nl; if (add) for (let y = 0; y < nl; y++) L[c][y * ns + x] += add; }
    }
  }
  // image-orthicon halo: dark ring round bright objects [MFR/SEC]; radius NOT FOUND [EST]
  if (cam.halo) {
    const src = Lum || L[1], hi = new Float32Array(n);
    for (let i = 0; i < n; i++) hi[i] = Math.max(0, src[i] - 0.5);
    const a = Float32Array.from(hi), b = Float32Array.from(hi);
    const rS = (cam.haloRadius || 0.02) * ns; blur2D(a, ns, nl, rS * 0.3, rS * 0.3 * (nl / ns) * 4 / 3); blur2D(b, ns, nl, rS, rS * (nl / ns) * 4 / 3);
    const tgt = Lum ? [Lum] : L;
    for (const p of tgt) for (let i = 0; i < n; i++) p[i] = Math.max(0, p[i] - cam.halo * 3 * Math.max(0, b[i] - a[i] * 0.5));
  }
  // 6. noise from the head amplifier (added in linear, before gamma, so gamma raises shadow noise) [SEC ETD]
  if (cam.noiseDb && !o.noNoise) {
    const base = Math.pow(10, -cam.noiseDb / 20);
    const hp = VC.lp3dB(2.0e6, g.fs, 1.5e6);
    const nz = new Float32Array(n), lo = new Float32Array(n);
    const chans = Lum ? [0, 1, 2, 3] : [0, 1, 2];
    for (const c of chans) {
      const sigma = base * (c === 2 ? Math.pow(10, (cam.blueExtraDb || 0) / 20) : 1) * (c < 3 && Lum ? 0.7 : 1);
      for (let i = 0; i < n; i++) nz[i] = VC.gaussRand(rnd);
      if (cam.noise === "tri") { // noise rising with frequency ("triangular") [MFR Philips; SEC T-132]: high-pass tilt
        lo.set(nz); VC.filterRows(lo, ns, nl, hp); for (let i = 0; i < n; i++) nz[i] = (nz[i] - 0.7 * lo[i]) * 1.6;
      }
      const tgt = c === 3 ? Lum : L[c];
      for (let i = 0; i < n; i++) tgt[i] += sigma * nz[i];
    }
  }
  // shading: gentle parabolic loss towards the edges [SEC ETD mechanism]; amount [EST]
  if (cam.shading) {
    for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
      const u = (x / (ns - 1)) * 2 - 1, v = (y / (nl - 1)) * 2 - 1, f = 1 - cam.shading * (0.6 * u * u + 0.4 * v * v + 0.3 * u * v);
      for (let c = 0; c < 3; c++) L[c][y * ns + x] *= f; if (Lum) Lum[y * ns + x] *= f;
    }
  }
  // 7. flare correction and black level: remove most of the flare lift [SEC ETD]
  if (cam.flare) for (let c = 0; c < 3; c++) { let s = 0; for (let i = 0; i < n; i++) s += L[c][i]; const f = cam.flare * 0.8 * s / n; for (let i = 0; i < n; i++) L[c][i] -= f; }
  // 8. matrix (linear) [SEC ETD 1983 example]; or a saturation-style strength [EST]
  if (cam.matrixBBC) {
    const M = [[1.12, -0.16, 0.04], [-0.02, 1.23, -0.21], [-0.02, -0.01, 1.03]];
    for (let i = 0; i < n; i++) { const r = L[0][i], gg = L[1][i], b = L[2][i];
      L[0][i] = M[0][0] * r + M[0][1] * gg + M[0][2] * b; L[1][i] = M[1][0] * r + M[1][1] * gg + M[1][2] * b; L[2][i] = M[2][0] * r + M[2][1] * gg + M[2][2] * b; }
  } else if (cam.matrix && cam.matrix !== 1) {
    for (let i = 0; i < n; i++) { const y = 0.2126 * L[0][i] + 0.7152 * L[1][i] + 0.0722 * L[2][i]; for (let c = 0; c < 3; c++) L[c][i] = y + cam.matrix * (L[c][i] - y); }
  }
  if (cam.mono) { for (let i = 0; i < n; i++) { const y = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i]; L[0][i] = L[1][i] = L[2][i] = y; } }
  // four-tube: combine sharp luminance with the soft colour signals (colour difference added to the luminance tube) [SEC]
  if (Lum) for (let i = 0; i < n; i++) { const yc = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i]; for (let c = 0; c < 3; c++) L[c][i] = Lum[i] + (L[c][i] - yc); }
  // 9. contour (aperture) correction: 3-tap E1-(E0+E2)/2, 100 ns taps horizontally, adjacent field lines vertically,
  //    derived from green (or luminance tube) and added equally to R, G, B; coring; off in the darks [SEC ETD 16F/Video Processing]
  const k = o.contour !== undefined ? o.contour : (cam.contour || 0);
  if (k > 0) {
    const src = cam.tubes === 4 ? (() => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i]; return a; })() : L[1];
    const d = 100e-9 * g.fs; // samples per tap
    const d0 = Math.floor(d), df = d - d0;
    const at = (row, x) => { const xa = Math.min(ns - 1, Math.max(0, x)); return src[row * ns + xa]; };
    const corr = new Float32Array(n);
    for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
      const e1 = src[y * ns + x];
      const e0 = at(y, x - d0) * (1 - df) + at(y, x - d0 - 1) * df, e2 = at(y, x + d0) * (1 - df) + at(y, x + d0 + 1) * df;
      const yu = y - 2 >= 0 ? y - 2 : y, yd = y + 2 < nl ? y + 2 : y;
      const hC = e1 - 0.5 * (e0 + e2), vC = e1 - 0.5 * (src[yu * ns + x] + src[yd * ns + x]);
      corr[y * ns + x] = hC + 0.7 * vC; // H/V ratio [EST]
    }
    // vertical correction low-passed ~1 MHz horizontally [SEC]: approximate by a light horizontal smoothing of the sum
    VC.filterRows(corr, ns, nl, VC.lp3dB(4.5e6, g.fs, 2e6));
    const core = 0.01, dark = 0.08; // coring threshold and dark onset [EST]
    for (let i = 0; i < n; i++) {
      let c = corr[i]; c = Math.abs(c) < core ? 0 : c - Math.sign(c) * core;
      const lev = Math.min(1, Math.max(0, src[i] / dark));
      c *= k * lev;
      L[0][i] += c; L[1][i] += c; L[2][i] += c;
    }
  }
  // 10. gamma correction, 11. clip [SEC/SPEC]
  const clipHi = cam.clip || 1.0;
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) {
    let v = L[c][i]; v = v <= 0 ? 0 : oetf(cam.gamma, v);
    L[c][i] = v > clipHi ? clipHi : v;
  }
  return L;
}

const api = { CAMERAS, camera, oetf, firFromResponse, srgbToLin, gaussK, blur2D, blurV, shiftPlane };
if (typeof module !== "undefined" && module.exports) module.exports = api;
