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
  // ---- v1.4: night vision (an intensifier tube relayed by a CCD camera) and thermal ----
  nv_gen0: { label: "Infrared converter + searchlight (Gen 0, 1940s-50s)", tubes: 1, nvGen: 0, nvLight: 0.5, chickenWire: 0,
    mtf: [[1, 0.8], [2.5, 0.45], [3.5, 0.2]], transfer: { type: "power", g: 1.0 }, noiseDb: 38, noise: "flat", flare: 0.05, contour: 0, gamma: "power045", clip: 1.0 },
  nv_gen1: { label: "Starlight scope (Gen 1, 1960s)", tubes: 1, nvGen: 1, nvLight: 0.35, chickenWire: 0.2, lag: 0.25,
    mtf: [[1, 0.85], [2.5, 0.55], [3.5, 0.3]], transfer: { type: "power", g: 1.0 }, noiseDb: 40, noise: "flat", flare: 0.04, contour: 0, gamma: "power045", clip: 1.0 },
  nv_gen2: { label: "Microchannel-plate night vision (Gen 2, 1970s-80s)", tubes: 1, nvGen: 2, nvLight: 0.3, honeycomb: 0.6, chickenWire: 0.5,
    mtf: [[2, 0.9], [3.5, 0.6], [4.5, 0.3]], transfer: { type: "power", g: 1.0 }, smear: 0.03, noiseDb: 44, noise: "flat", flare: 0.03, contour: 0.2, gamma: "bt709", clip: 1.0 },
  nv_gen3: { label: "GaAs night vision (Gen 3, late 1980s-90s)", tubes: 1, nvGen: 3, nvLight: 0.25, honeycomb: 0.8, chickenWire: 0.3,
    mtf: [[2, 0.95], [4, 0.75], [5, 0.45]], transfer: { type: "power", g: 1.0 }, smear: 0.03, noiseDb: 46, noise: "flat", flare: 0.03, contour: 0.3, gamma: "bt709", clip: 1.0 },
  thermal_pyro: { label: "Pyroelectric vidicon thermal camera (firefighting, 1980s)", tubes: 1, thermal: true, thPalette: "whitehot", netd: 0.03, tubeBlur: 3.5, lag: 0.5,
    mtf: [[4, 1]], transfer: { type: "power", g: 1.0 }, noiseDb: 60, noise: "flat", contour: 0, gamma: "bt709", clip: 1.0 },
  thermal_160: { label: "Uncooled thermal camera, 160 x 120 (1990s-2000s)", tubes: 1, thermal: true, thRes: [160, 120], thPalette: "whitehot", netd: 0.02, fpn: 0.01, thHalo: 0.8,
    mtf: [[4, 1]], transfer: { type: "power", g: 1.0 }, noiseDb: 60, noise: "flat", contour: 0, gamma: "bt709", clip: 1.0 },
  thermal_320: { label: "Uncooled thermal camera, 320 x 240", tubes: 1, thermal: true, thRes: [320, 240], thPalette: "ironbow", netd: 0.01, fpn: 0.005, thHalo: 0.3,
    mtf: [[4, 1]], transfer: { type: "power", g: 1.0 }, noiseDb: 60, noise: "flat", contour: 0, gamma: "bt709", clip: 1.0 },
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
/* ---------- night vision and thermal (v1.4) ---------- */
/* Image intensifier seen through a relay camera. Generation figures [SEC Wikipedia Night-vision device; Newcon / ATN
 * glossaries]: Gen 0 (WWII) an infrared converter that needs an infrared searchlight; Gen 1 (1960s, Starlight scope 1964)
 * about 1,000x gain, needs moonlight, cascaded tubes show pincushion distortion; Gen 2 (1970s) adds the microchannel plate,
 * about 20,000x, with edge glow as a known blemish; Gen 3 (late 1980s) GaAs photocathode, its ion-barrier film increasing the
 * halo round lights. Green screens because the eye is most sensitive there. Honeycomb (hexagonal fibre-bundle pattern, seen
 * at high light) and chicken wire (dark hexagonal lines) are listed blemishes; scintillation is normal with an MCP [SEC].
 * Every amount below is [EST]; a visible photograph has no near-infrared record, so foliage and skin are guessed from colour. */
function hexEdge(x, y, s) { // 1 at a hexagon's centre, 0 on its edge; flat-topped lattice, s = centre-to-corner
  const q = (2 / 3 * x) / s, r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / s, cxz = q, czz = r, cyz = -q - r;
  let rx = Math.round(cxz), ry = Math.round(cyz), rz = Math.round(czz);
  const dx = Math.abs(rx - cxz), dy = Math.abs(ry - cyz), dz = Math.abs(rz - czz);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  const px = s * 1.5 * rx, py = s * Math.sqrt(3) * (rz + rx / 2), ax = Math.abs(x - px), ay = Math.abs(y - py);
  const m = Math.max(ay, ax * Math.sqrt(3) / 2 + ay / 2);
  return Math.max(0, 1 - m / (s * Math.sqrt(3) / 2));
}
function intensifier(L, ns, nl, cam, o, rnd) {
  const n = ns * nl, gen = cam.nvGen, asp = o.aspect > 0 ? o.aspect : 4 / 3;
  const light = o.nvLight !== undefined ? o.nvLight : (cam.nvLight !== undefined ? cam.nvLight : 0.4);
  const nirW = [0.85, 0.3, 0.45, 0.7][gen] || 0.4; // GaAs reaches further into the near infrared [EST weighting]
  const cx = (ns - 1) / 2, cy = (nl - 1) / 2, S = new Float32Array(n);
  for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const i = y * ns + x, r = L[0][i], g = L[1][i], b = L[2][i], vis = 0.299 * r + 0.587 * g + 0.114 * b;
    const leaf = Math.max(0, Math.min(1, (g - Math.max(r, b)) * 8 / (g + 0.02)));
    let v = vis + nirW * ((0.7 * r + 0.25 * g + 0.05 * b + leaf * 1.2 * g) - vis);
    if (gen === 0) { const u = (x - cx) / cx * asp, w = (y - cy) / cy; v *= 1.4 / (1 + (u * u + w * w) * 1.6); } // the searchlight's beam
    S[i] = Math.max(0, v);
  }
  // automatic brightness control: the tube holds the screen's average brightness [SEC ABC exists; target EST]
  let m = 0; for (let i = 0; i < n; i++) m += S[i]; m /= n; const k = 0.3 / Math.max(1e-4, m);
  for (let i = 0; i < n; i++) S[i] *= k;
  // tube and fibre-optic sharpness [EST per generation]
  const sig = [1.4, 1.3, 0.9, 0.7][gen] || 1; blur2D(S, ns, nl, sig * ns / 720, sig * nl / 576);
  // halo round bright points: light bounced between photocathode and MCP; larger behind the Gen 3 ion barrier [SEC; size EST]
  const haloR = ([0, 0.006, 0.01, 0.018][gen] || 0.01) * ns;
  if (haloR > 0) { const hl = Float32Array.from(S, v => v > 0.9 ? v - 0.9 : 0); blur2D(hl, ns, nl, haloR, haloR * nl / ns * asp); blur2D(hl, ns, nl, haloR * 0.5, haloR * 0.5 * nl / ns * asp); for (let i = 0; i < n; i++) S[i] += hl[i] * 6; }
  // photon noise: fewer photons in darker scenes [EST photon counts]; MCP scintillation: brief bright specks [SEC; density EST]
  const Np = 15 + 600 * light * light;
  for (let i = 0; i < n; i++) S[i] = Math.max(0, S[i] + Math.sqrt(Math.max(S[i], 0.02) / Np) * VC.gaussRand(rnd));
  if (gen >= 2) { const sp = Math.round(n * 0.0015 * (1 - light)); for (let s = 0; s < sp; s++) { const x = Math.floor(rnd() * ns), y = Math.floor(rnd() * nl), a = 0.4 + 0.8 * rnd(); S[y * ns + x] += a; if (x + 1 < ns) S[y * ns + x + 1] += a * 0.6; } blur2D(S, ns, nl, 0.5, 0.4); }
  // phosphor screen saturation: highlights flatten and spread [EST]
  for (let i = 0; i < n; i++) { const v = S[i]; S[i] = v / (1 + 0.35 * v); }
  // fixed pattern: honeycomb brightness modulation at high light, chicken wire lines [SEC blemish names; size and depth EST]
  const hexS = ns / 60, honey = (cam.honeycomb || 0) * Math.max(0, light - 0.4), wire = cam.chickenWire || 0;
  const rndW = VC.mulberry32(4711), off = [rndW() * 100, rndW() * 100];
  if (honey > 0 || wire > 0) for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const e = hexEdge(x + off[0], (y * ns / nl / asp) + off[1], hexS), i = y * ns + x;
    S[i] *= 1 - honey * 0.08 * (1 - e) - (e < 0.035 ? wire * 0.22 * (1 - e / 0.035) : 0);
  }
  // cascaded Gen 1 tubes: pincushion [SEC]; amount [EST]. Round image circle of the tube; Gen 2 edge glow [SEC blemish; EST]
  const pin = gen === 1 ? 0.07 : gen === 0 ? 0.04 : 0, circ = cam.nvCircle !== undefined ? cam.nvCircle : 1, glow = gen === 2 ? 0.1 : 0;
  const R = 0.5 * 1.02, out = new Float32Array(n);
  for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const u = (x - cx) / nl * (ns / ns), uu = (x - cx) / (ns - 1) * asp, vv = (y - cy) / (nl - 1), r2 = uu * uu + vv * vv, r = Math.sqrt(r2);
    let sx = x, sy = y;
    if (pin) { const f = 1 / (1 + pin * r2 * 4); sx = cx + (x - cx) * f; sy = cy + (y - cy) * f; }
    const x0 = Math.max(0, Math.min(ns - 2, sx | 0)), y0 = Math.max(0, Math.min(nl - 2, sy | 0)), fx = sx - x0, fy = sy - y0;
    let v = (S[y0 * ns + x0] * (1 - fx) + S[y0 * ns + x0 + 1] * fx) * (1 - fy) + (S[(y0 + 1) * ns + x0] * (1 - fx) + S[(y0 + 1) * ns + x0 + 1] * fx) * fy;
    if (circ) { const edge = Math.max(0, Math.min(1, (R * circ - r) / 0.012)); v = v * edge * (1 - 0.35 * r2) + (glow && r > R * circ - 0.025 ? glow * edge * (0.5 + 0.5 * rnd()) : 0); }
    out[y * ns + x] = v;
  }
  const tint = cam.nvWhite ? [0.85, 0.9, 1.0] : [0.25, 1.0, 0.3]; // green screen; white phosphor in later tubes [EST colours]
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) L[c][i] = out[i] * tint[c];
}
/* Thermal imaging. Uncooled sensors typically 160 x 120 or 320 x 240 (up to 640 x 480 and more), long-wave infrared
 * 7-14 um; NETD about 70-80 mK for early ferroelectric (BST) sensors, down to about 20 mK [SEC]. The pyroelectric vidicon
 * served mainly in firefighting cameras [SEC]. Palettes after FLIR's descriptions: White Hot (most common), Black Hot,
 * Ironbow ("black through blue ... magenta, orange, yellow to bright white"), Rainbow, Arctic (gold and blue), Lava [SEC];
 * the colour stops are [EST]. A visible photograph has no temperature: skin, lamps, sky and foliage are guessed from colour
 * and brightness [EST throughout]. */
const THERMAL_PALETTES = {
  whitehot: [[0, "000000"], [1, "FFFFFF"]],
  blackhot: [[0, "FFFFFF"], [1, "000000"]],
  ironbow: [[0, "000000"], [0.15, "20008C"], [0.35, "9A0E9E"], [0.55, "E0402C"], [0.75, "F99B0C"], [0.9, "FCE33A"], [1, "FFFFF0"]],
  rainbow: [[0, "000000"], [0.12, "2A00A0"], [0.28, "0060FF"], [0.44, "00D0C0"], [0.58, "40E020"], [0.72, "F0F000"], [0.86, "FF6000"], [1, "FF0000"]],
  arctic: [[0, "05103A"], [0.35, "1F5FB8"], [0.6, "8AB8D8"], [0.75, "D8A030"], [1, "FFF2B0"]],
  lava: [[0, "000000"], [0.25, "0A2A5A"], [0.45, "5A2A6A"], [0.65, "C83010"], [0.85, "F8A020"], [1, "FFFFFF"]],
};
function paletteAt(stops, t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let k = 1; k < stops.length; k++) if (t <= stops[k][0]) {
    const a = stops[k - 1], b = stops[k], f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    return [0, 2, 4].map(j => { const ca = parseInt(a[1].slice(j, j + 2), 16) / 255, cb = parseInt(b[1].slice(j, j + 2), 16) / 255; return ca + (cb - ca) * f; });
  }
  const l = stops[stops.length - 1][1]; return [0, 2, 4].map(j => parseInt(l.slice(j, j + 2), 16) / 255);
}
function thermal(L, ns, nl, cam, o, rnd) {
  const n = ns * nl, T = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.max(0, Math.min(1, L[0][i])), g = Math.max(0, Math.min(1, L[1][i])), b = Math.max(0, Math.min(1, L[2][i])), mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const skin = r > g && g > b && sat > 0.15 && sat < 0.75 && mx > 0.03 ? Math.min(1, (r - g) / (mx + 1e-4) * 4) * Math.min(1, (g - b) / (mx + 1e-4) * 4) : 0;
    const sky = b > r && b >= g && lum > 0.25 ? Math.min(1, (b - r) / (mx + 1e-4) * 2) : 0;
    const leaf = Math.max(0, Math.min(1, (g - Math.max(r, b)) * 6 / (g + 0.02)));
    const lamp = lum > 0.92 ? (lum - 0.92) / 0.08 : 0;
    T[i] = 0.42 + 0.1 * (Math.sqrt(lum) - 0.5) + 0.5 * skin - 0.35 * sky - 0.1 * leaf + 0.5 * lamp;
  }
  blur2D(T, ns, nl, ns / 180, nl / 180); // heat spreads; surfaces show less texture than in light [EST]
  const res = o.thRes || cam.thRes;
  let tw = ns, th = nl, F = T;
  if (res) { tw = res[0]; th = res[1]; F = VC.resize(T, ns, nl, tw, th); }
  else blur2D(F, ns, nl, (cam.tubeBlur || 3) * ns / 720, (cam.tubeBlur || 3) * nl / 576); // pyroelectric vidicon: a soft tube [EST]
  // ferroelectric "halo": hot objects edged by a dark ring (and the reverse) from the sensor's own processing [EST]
  const halo = o.thHalo !== undefined ? o.thHalo : (cam.thHalo || 0);
  if (halo) { const b = Float32Array.from(F); blur2D(b, tw, th, tw / 40, tw / 40); for (let i = 0; i < F.length; i++) F[i] += halo * (F[i] - b[i]); }
  // automatic gain: the hottest and coldest 1% set the span [SEC AGC exists; percentiles EST]
  const srt = Float32Array.from(F).sort(), lo = srt[Math.floor(F.length * 0.01)], hi = srt[Math.floor(F.length * 0.99)], sp = Math.max(0.05, hi - lo);
  const netd = cam.netd || 0.01, fpn = cam.fpn || 0, cols = new Float32Array(tw); for (let x = 0; x < tw; x++) cols[x] = VC.gaussRand(rnd) * fpn;
  const lvl = o.thLevel || 0, gain = o.thGain || 1;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const i = y * tw + x; F[i] = ((F[i] - lo) / sp - 0.5) * gain + 0.5 + lvl + VC.gaussRand(rnd) * netd + cols[x]; }
  const back = res ? VC.resize(F, tw, th, ns, nl) : F; // VC.resize averages down and interpolates up: the display's own scaling
  if (res && (o.thBlocky || cam.thBlocky)) { for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) back[y * ns + x] = F[Math.min(th - 1, Math.floor(y * th / nl)) * tw + Math.min(tw - 1, Math.floor(x * tw / ns))]; }
  const stops = THERMAL_PALETTES[o.thPalette || cam.thPalette || "whitehot"] || THERMAL_PALETTES.whitehot;
  for (let i = 0; i < n; i++) { const c = paletteAt(stops, back[i]); L[0][i] = c[0]; L[1][i] = c[1]; L[2][i] = c[2]; }
}

function camera(grid, g, cam, o) {
  o = o || {};
  const ns = g.ns, nl = g.lines, n = ns * nl;
  const rnd = VC.mulberry32(((o.seed || 1) * 7919) >>> 0);
  const expo = Math.pow(2, o.exposure || 0);
  // 1. scene linear light
  const L = grid.map(p => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = srgbToLin(p[i]) * expo; return a; });
  const pxPerPW = ns; // samples across the picture width
  // wide-angle lens (v1.3): barrel distortion r_src = r (1 + k r^2), r from the centre in units of the half-diagonal;
  // "aperture angles of 180 degrees or more are possible only with large amounts of barrel distortion" [SEC Wikipedia
  // Fisheye lens]; the amount per lens [EST]. Outside the image circle the tube or chip sees black.
  const lb = o.lensBarrel !== undefined ? o.lensBarrel : (cam.lensBarrel || 0);
  if (lb > 0) {
    const asp0 = o.aspect > 0 ? o.aspect : 4 / 3, cx = (ns - 1) / 2, cy = (nl - 1) / 2, hd = Math.sqrt(asp0 * asp0 + 1);
    for (let c = 0; c < 3; c++) { const src = L[c], dst = new Float32Array(n);
      for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
        const u = (x - cx) / cx * asp0, v = (y - cy) / cy, r2 = (u * u + v * v) / (hd * hd), k = 1 + lb * r2;
        const sx = cx + (x - cx) * k, sy = cy + (y - cy) * k; if (sx < 0 || sy < 0 || sx > ns - 1 || sy > nl - 1) continue;
        const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, x1 = Math.min(ns - 1, x0 + 1), y1 = Math.min(nl - 1, y0 + 1);
        dst[y * ns + x] = (src[y0 * ns + x0] * (1 - fx) + src[y0 * ns + x1] * fx) * (1 - fy) + (src[y1 * ns + x0] * (1 - fx) + src[y1 * ns + x1] * fx) * fy;
      } L[c] = dst; }
  }
  // near-infrared night picture (v1.3): a monochrome CCD under an 850 nm illuminator [EST throughout: a visible photo
  // has no infrared record]. Foliage reflects near-infrared strongly, so green plants turn pale; the red channel stands
  // in for skin and fabric; the illuminator lights the centre most, falling off towards the corners.
  const ir = o.ir !== undefined ? o.ir : (cam.ir || 0);
  if (ir > 0) {
    const cx = (ns - 1) / 2, cy = (nl - 1) / 2, asp0 = o.aspect > 0 ? o.aspect : 4 / 3;
    for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
      const i = y * ns + x, r = L[0][i], gg = L[1][i], b = L[2][i], vis = 0.299 * r + 0.587 * gg + 0.114 * b;
      const leaf = Math.max(0, Math.min(1, (gg - Math.max(r, b)) * 8 / (gg + 0.02)));
      const nir = 0.7 * r + 0.25 * gg + 0.05 * b + leaf * 1.4 * gg + 0.15 * vis;
      const u = (x - cx) / cx * asp0, v = (y - cy) / cy, fall = 1 / (1 + (u * u + v * v) * 0.9 * ir);
      const val = vis + ir * (nir * fall * 1.3 - vis);
      L[0][i] = L[1][i] = L[2][i] = Math.max(0, val);
    }
  }
  // intermediate film: the scene is first a fast-processed film image [EST forms, see CAMERAS entry]
  if (cam.film) filmImage(L, ns, nl, cam.film, rnd);
  // thermal camera: the palette picture is the output (display values, already gamma-coded) [see thermal()]
  if (cam.thermal) { thermal(L, ns, nl, cam, o, rnd); return L; }
  if (cam.nvGen !== undefined) intensifier(L, ns, nl, cam, o, rnd);
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
  const asp = o.aspect > 0 ? o.aspect : 4 / 3; // the picture's shape (4:3 unless the document's own shape is being filled)
  const sigV = sigH * (nl / ns) * asp;        // rows, the same spread down the picture as across it
  let Lum = null;
  if (cam.tubes === 4) { // separate luminance tube: sharp; colour tubes low-passed to colourMtf [SEC PH-11/T-132]
    Lum = new Float32Array(n); for (let i = 0; i < n; i++) Lum[i] = 0.299 * L[0][i] + 0.587 * L[1][i] + 0.114 * L[2][i];
    VC.filterRows(Lum, ns, nl, hM); blur2D(Lum, ns, nl, 0, sigV);
    const hC = VC.lp3dB(cam.colourMtf || 2e6, g.fs, 1.0e6);
    for (let c = 0; c < 3; c++) { VC.filterRows(L[c], ns, nl, hC); blur2D(L[c], ns, nl, 0, sigV * 2); }
  } else {
    for (let c = 0; c < 3; c++) { VC.filterRows(L[c], ns, nl, hM); blur2D(L[c], ns, nl, 0, sigV); }
  }
  // the user's extra softness (a caption camera a little out of focus, a soft slide): the same spread across and down,
  // as a percentage of the picture width. Because it is in the camera, the set's scan lines stay crisp over it.
  if (o.soft > 0) { const sx = o.soft / 100 * ns, sy = sx * (nl / ns) * asp; for (let c = 0; c < 3; c++) blur2D(L[c], ns, nl, sx, sy); if (Lum) blur2D(Lum, ns, nl, sx, sy); }
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
    const rS = (cam.haloRadius || 0.02) * ns; blur2D(a, ns, nl, rS * 0.3, rS * 0.3 * (nl / ns) * asp); blur2D(b, ns, nl, rS, rS * (nl / ns) * asp);
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

const api = { THERMAL_PALETTES, CAMERAS, camera, oetf, firFromResponse, srgbToLin, gaussK, blur2D, blurV, shiftPlane };
if (typeof module !== "undefined" && module.exports) module.exports = api;
