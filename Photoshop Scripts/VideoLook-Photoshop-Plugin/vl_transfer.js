/* VideoLook transfers and implied motion.
 *  motion:     shift helper and time-sampled frames for lag, interlace, pulldown and converter blending
 *  telecine:   flying-spot film scanner (the "camera" for film-originated material)
 *  convert:    525/625 standards conversion (optical, BBC 1967 field store, digital field store, motion-compensated)
 *  telerecord: video to film (suppressed field, stored field, US kinescope), rendered at document size
 *  dmac:       BSB D-MAC satellite route (component, time-multiplexed)
 * Sources: strand F report, BBC Monograph No. 1 (1955), BBC ETD 15K (1971), BBC EIS converter sheet (1967). [EST] elsewhere.
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAMT = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const DSPT = (typeof require !== "undefined") ? require("./vl_display.js") : globalThis.VLDisplay;

/* ---------- motion ---------- */
// Shift planes by (dx, dy) grid samples; with a mask (0..1), only the masked subject moves over the static picture.
function shiftPlanes(planes, w, h, dx, dy, mask) {
  if (!dx && !dy) return planes.map(p => Float32Array.from(p));
  const sh = p => CAMT.shiftPlane(p, w, h, dx, dy, 0);
  if (!mask) return planes.map(sh);
  const m2 = sh(mask);
  return planes.map(p => { const moved = sh(p), out = Float32Array.from(p); for (let i = 0; i < out.length; i++) out[i] = out[i] * (1 - m2[i]) + moved[i] * m2[i]; return out; });
}
// Picture as it was t fields later (t may be negative), for uniform motion v = [vx, vy] per field.
function frameAt(planes, w, h, v, t, mask) { return shiftPlanes(planes, w, h, v[0] * t, v[1] * t, mask); }
// Interlace: field 1 (even rows) at time 0, field 2 (odd rows) one field later.
function interlace(planes, w, h, v, mask, dt) {
  if (!v || (!v[0] && !v[1])) return planes;
  const later = frameAt(planes, w, h, v, dt === undefined ? 1 : dt, mask);
  return planes.map((p, c) => { const out = Float32Array.from(p); for (let r = 1; r < h; r += 2) out.set(later[c].subarray(r * w, r * w + w), r * w); return out; });
}
// Camera-tube lag: the picture keeps a decaying memory of where things were in earlier fields; highlights leave comet tails.
function lagBlend(planes, w, h, v, mask, lag, comet) {
  if (!v || (!v[0] && !v[1]) || (!lag && !comet)) return planes;
  const lin = planes.map(p => Float32Array.from(p, CAMT.srgbToLin));
  const out = lin.map(p => Float32Array.from(p));
  const K = 8, dec = Math.max(0.05, lag || 0.1);
  let wsum = 1; const acc = lin.map(p => Float32Array.from(p)); const wsumArr = new Float32Array(lin[0].length);
  for (let k = 1; k <= K; k++) {
    const wk = Math.pow(dec, k); // residual after k fields (Plumbicon 8-12% after 3 fields at low light) [MFR]
    const past = frameAt(lin, w, h, v, -k, mask);
    for (let i = 0; i < acc[0].length; i++) {
      const yv = 0.2126 * past[0][i] + 0.7152 * past[1][i] + 0.0722 * past[2][i];
      const hiW = comet ? comet * Math.max(0, yv - 0.75) * 2.5 * Math.pow(0.8, k) : 0; // highlights discharge slowly: comet tail [OBS/MFR]; strength [EST]
      for (let c = 0; c < 3; c++) acc[c][i] += (wk + hiW) * past[c][i];
      wsumArr[i] += hiW;
    }
    wsum += wk;
  }
  for (let c = 0; c < 3; c++) for (let i = 0; i < out[c].length; i++) out[c][i] = DSPT.srgbEncode(acc[c][i] / (wsum + wsumArr[i]));
  return out;
}

/* ---------- telecine (flying-spot) ---------- */
/* o: { afterglow (0..1), afterglowUs, aperture, noise, saturation (log matrix strength), lift, gain } [SEC BBC ETD 15K 1971; amounts EST] */
function telecine(grid, g, o) {
  o = Object.assign({ afterglow: 0.12, afterglowUs: 0.6, aperture: 0.3, noise: 0.015, saturation: 1.15, lift: 0, gain: 1 }, o || {});
  const ns = g.ns, nl = g.lines, n = ns * nl, fs = g.fs, rnd = VC.mulberry32(((o.seed || 1) * 2029) >>> 0);
  const L = grid.map(p => Float32Array.from(p, CAMT.srgbToLin)); // print transmission
  // scan-spot afterglow: the phosphor keeps glowing as the spot moves on, so highlights streak to the right [SEC]
  const a = o.afterglow, tau = o.afterglowUs * 1e-6 * fs, k = Math.exp(-1 / Math.max(0.5, tau));
  for (const p of L) for (let r = 0; r < nl; r++) { let s = 0; for (let x = 0; x < ns; x++) { const i = r * ns + x; s = s * k + p[i] * (1 - k); p[i] = (1 - a) * p[i] + a * s; } }
  // afterglow correction by high-frequency boost + cosine aperture correction: sharp, with slight overshoot [SEC]
  for (const p of L) { const lo = Float32Array.from(p); VC.filterRows(lo, ns, nl, VC.lp3dB(2.5e6, fs, 1.5e6)); for (let i = 0; i < n; i++) p[i] += (o.aperture + a) * (p[i] - lo[i]); }
  // photomultiplier noise rises in dense (dark) areas of the film [SEC]
  for (const p of L) for (let i = 0; i < n; i++) p[i] += o.noise * (0.4 + 1.6 * (1 - Math.min(1, Math.max(0, p[i])))) * VC.gaussRand(rnd);
  // colour masking by a 3x3 matrix on log signals; lift and gain (TARIF controls) [SEC]
  for (let i = 0; i < n; i++) {
    const lg = [0, 1, 2].map(c => Math.log10(Math.max(1e-4, L[c][i])));
    const m = (lg[0] + lg[1] + lg[2]) / 3;
    for (let c = 0; c < 3; c++) L[c][i] = Math.pow(10, m + o.saturation * (lg[c] - m)) * o.gain + o.lift;
  }
  // gamma exponent 0.4 [SEC ETD 15K]
  return L.map(p => Float32Array.from(p, v => v <= 0 ? 0 : Math.min(1.05, Math.pow(v, 0.4))));
}

/* ---------- standards conversion ---------- */
/* src grid (gs) -> target grid (gt). o: { method: 'optical'|'bbc1967'|'digital'|'motioncomp', lines: 'interp'|'drop', blend, v, mask, seed } */
function convert(grid, gs, gt, o) {
  o = o || {};
  let out;
  if (o.method === "optical") {
    // a camera pointed at a monitor [SEC strand F]: the source raster is imaged by a second tube camera
    // colour optical converters used colour monitors and cameras; here the monitor keeps colour via a colour tube without mask [EST]
    const colMon = DSPT.crt(grid, gs, gt.ns, gt.lines * 2, { tube: "trinitron", maskStrength: 0, spot: 0.35, bloom: 0.4, glow: 0.02, halation: 0.01, barrel: 0.01, cornerDark: 0.15, roundCorner: 0, convergence: 0.001, spotMin: 0.2 }); // raster beat left in: that moiré is real
    let down = colMon.map(p => VC.resize(p, gt.ns, gt.lines * 2, gt.ns, gt.lines));
    // converter adjustment: the Apollo 11 Goldstone converter was "set incorrectly", giving too much contrast [SEC honeysucklecreek.net]
    if (o.contrast && o.contrast !== 1) down = down.map(p => Float32Array.from(p, x => Math.max(0, Math.min(1, 0.5 + (x - 0.5) * o.contrast + (o.lift || 0)))));
    // monitor persistence and pickup-tube lag leave moving figures trailing ghosts [SEC: phosphor persistence acted as a frame store]
    if (o.v && o.lag) { const vt = [o.v[0] * gt.ns / gs.ns, o.v[1] * gt.lines / gs.lines]; down = lagBlend(down, gt.ns, gt.lines, vt, o.mask, o.lag, 0); }
    out = CAMT.camera(down, gt, Object.assign({}, CAMT.CAMERAS.vidicon, o.cameraMono ? { tubes: 1, mono: true, noiseDb: 36 } : { tubes: 3, noiseDb: 38 }), { seed: o.seed });
  } else {
    // line conversion: 2-line interpolation, or cheap line dropping / repeating [SEC/OBS strand F]
    const hRes = grid.map(p => VC.resize(p, gs.ns, gs.lines, gt.ns, gs.lines));
    if (o.lines === "drop") {
      out = hRes.map(p => { const a = new Float32Array(gt.ns * gt.lines); for (let r = 0; r < gt.lines; r++) { const sr = Math.min(gs.lines - 1, Math.floor(r * gs.lines / gt.lines)); a.set(p.subarray(sr * gt.ns, sr * gt.ns + gt.ns), r * gt.ns); } return a; });
    } else {
      out = hRes.map(p => { const a = new Float32Array(gt.ns * gt.lines); for (let r = 0; r < gt.lines; r++) { const sy = (r + 0.5) * gs.lines / gt.lines - 0.5, y0 = Math.max(0, Math.floor(sy)), y1 = Math.min(gs.lines - 1, y0 + 1), f = Math.max(0, sy - y0); for (let x = 0; x < gt.ns; x++) a[r * gt.ns + x] = p[y0 * gt.ns + x] * (1 - f) + p[y1 * gt.ns + x] * f; } return a; });
      if (o.method === "motioncomp") out = out.map(p => { const q = Float32Array.from(p); CAMT.blur2D(q, gt.ns, gt.lines, 0, 0.35); return q; }); // residual vertical softness [MFR claim]
    }
    // temporal: field blending gives double images on motion [SEC BBC 1967 sheet; strand F]
    const v = o.v;
    if (v && (v[0] || v[1]) && o.method !== "motioncomp") {
      const vt = [v[0] * gt.ns / gs.ns, v[1] * gt.lines / gs.lines];
      if (o.method === "digital") { // four-field interpolation: up to four images [SEC strand F]; weights [EST]
        const W = [0.1, 0.4, 0.4, 0.1], frames = [-1, 0, 1, 2].map(t => frameAt(out, gt.ns, gt.lines, vt, t, o.mask));
        out = out.map((p, c) => { const q = new Float32Array(p.length); for (let k = 0; k < 4; k++) for (let i = 0; i < q.length; i++) q[i] += W[k] * frames[k][c][i]; return q; });
      } else if (o.blend !== false) { // BBC 1967: 1 output field in 5 is a 50/50 blend of two input fields [SEC]
        const next = frameAt(out, gt.ns, gt.lines, vt, 1, o.mask);
        out = out.map((p, c) => Float32Array.from(p, (x, i) => 0.5 * x + 0.5 * next[c][i]));
      }
    }
    if (o.method === "bbc1967" || o.inset) { // picture smaller than the full raster, black borders all round [SEC]; size [EST]
      const k = o.inset || 0.04, iw = Math.round(gt.ns * (1 - 2 * k)), ih = Math.round(gt.lines * (1 - 2 * k)), ox = (gt.ns - iw) >> 1, oy = (gt.lines - ih) >> 1;
      out = out.map(p => { const s = VC.resize(p, gt.ns, gt.lines, iw, ih), a = new Float32Array(gt.ns * gt.lines); for (let y = 0; y < ih; y++) a.set(s.subarray(y * iw, y * iw + iw), (y + oy) * gt.ns + ox); return a; });
    }
  }
  return out;
}

/* ---------- telerecording (video to film), rendered at document size ---------- */
/* o: { method: 'suppressed'|'stored'|'kinescope', gauge: 16|35, grain, contrast, shutterBar, seed } */
function telerecord(grid, g, w, h, o) {
  o = Object.assign({ method: "suppressed", gauge: 16, grain: 1, shutterBar: 0 }, o || {});
  let src = grid;
  if (o.method === "suppressed") { // only one field recorded: 188.5 of 377 lines on 405 [SEC BBC Monograph No. 1]
    src = grid.map(p => { const q = Float32Array.from(p); for (let r = 1; r < g.lines; r += 2) q.set(p.subarray((r - 1) * g.ns, r * g.ns), r * g.ns); return q; });
  }
  // recording CRT: flat, monochrome, with spot wobble hiding the line structure [SEC Monograph No. 1/45]
  const mono = !o.colour;
  const shown = DSPT.crt(src, g, w, h, { tube: mono ? "mono" : "trinitron", maskStrength: 0, monoWhite: [0.3127, 0.329], spot: o.method === "suppressed" ? 0.9 : 0.6, bloom: 0.2, glow: 0.03, halation: 0.0, barrel: 0.004, cornerDark: 0.12, roundCorner: 0.02, convergence: 0, gamma: 2.4 });
  const rnd = VC.mulberry32(((o.seed || 1) * 881) >>> 0);
  const n = w * h;
  // film: ~40:1 brightness range and S/N often below 40 dB on 16 mm [SEC Remley 1998]; grain sized to the gauge [EST]
  const dmax = 40, lin = shown.map(p => Float32Array.from(p, CAMT.srgbToLin));
  const grainPx = Math.max(0.6, w / (o.gauge === 35 ? 2600 : 1300)), gsig = 0.05 * o.grain * (o.gauge === 35 ? 0.6 : 1);
  const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = VC.gaussRand(rnd);
  CAMT.blur2D(nz, w, h, grainPx * 0.6, grainPx * 0.6); let s2 = 0; for (let i = 0; i < n; i++) s2 += nz[i] * nz[i]; const kz = 1 / Math.sqrt(s2 / n);
  // US kinescope shutter bar: a band exposed twice or not at all when shutter and scan drift [SEC strand F]
  const bar = o.method === "kinescope" ? (o.shutterBar || 0) : 0, barY = o.barPos !== undefined ? o.barPos : 0.62;
  for (let y = 0; y < h; y++) {
    const bb = bar ? bar * Math.exp(-Math.pow((y / h - barY) / 0.012, 2)) : 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      for (let c = 0; c < 3; c++) {
        let v = lin[c][i] * (1 + bb);
        v = (1 / dmax) + v * (1 - 1 / dmax);                 // compressed range (~40:1)
        const t = Math.log2(v / 0.18), cst = o.contrast || 1.1;   // film contrast about mid-grey with soft toe and shoulder [EST]
        v = 0.18 * Math.pow(2, cst * t / (1 + Math.abs(t) * cst / 5.5));
        v *= 1 + gsig * nz[i] * kz * 1.2;
        lin[c][i] = v;
      }
    }
  }
  return lin.map(p => Float32Array.from(p, DSPT.srgbEncode));
}

/* ---------- D-MAC (BSB, 1990-97) ---------- */
// Time-multiplexed components: no subcarrier, so no cross-colour or dot crawl; luma compressed 3:2, chroma 3:1 on
// alternate lines [SEC strand F]; resulting bandwidths ~5.6 MHz luma, ~2.75 MHz chroma are [EST] from the ratios.
function dmac(grid, g, o) {
  o = o || {}; const ns = g.ns, nl = g.lines, n = ns * nl, rnd = VC.mulberry32(((o.seed || 1) * 5003) >>> 0);
  const Y = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = VC.rgbToYUV(grid[0][i], grid[1][i], grid[2][i]); Y[i] = t[0]; U[i] = t[1]; V[i] = t[2]; }
  VC.filterRows(Y, ns, nl, VC.lp3dB(5.6e6, g.fs, 1.0e6));
  const hC = VC.lp3dB(2.75e6, g.fs, 1.0e6); VC.filterRows(U, ns, nl, hC); VC.filterRows(V, ns, nl, hC);
  // FM satellite noise (triangular after de-emphasis) [EST]
  const snr = o.snrDb || 45, sg = Math.pow(10, -snr / 20);
  for (const P of [Y, U, V]) for (let i = 0; i < n; i++) P[i] += sg * VC.gaussRand(rnd) * (P === Y ? 1 : 1.5);
  // line-sequential colour: U on one line, V on the next, each repeated [SEC]
  for (let r = 0; r < nl; r++) { const src = (r >> 1) % 2 === 0 ? U : V, other = src === U ? V : U; const rp = r >= 2 ? r - 2 : r; for (let i = 0; i < ns; i++) other[r * ns + i] = other[rp * ns + i]; void src; }
  const out = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { const t = VC.yuvToRGB(Y[i], U[i], V[i]); out[0][i] = t[0]; out[1][i] = t[1]; out[2][i] = t[2]; }
  return out;
}

/* ---------- Hi-Vision MUSE (NHK, analogue HD by satellite 1989-2007) ---------- */
// Still areas resolve ~598 TV lines of luma and ~209 of colour per picture height; parts that move drop to about a quarter of
// the detail (half across, half down); camera pans are motion-compensated and stay sharp [SEC MUSE sources, research H].
// 598 TVL over a 16:9 width = 531 cycles in 25.86 µs = 20.6 MHz; 209 TVL = 7.2 MHz [derived]. FM satellite noise [EST].
function muse(grid, g, o) {
  o = o || {}; const ns = g.ns, nl = g.lines, n = ns * nl, rnd = VC.mulberry32(((o.seed || 1) * 7121) >>> 0);
  const YUV = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { const t = VC.rgbToYUV(grid[0][i], grid[1][i], grid[2][i]); YUV[0][i] = t[0]; YUV[1][i] = t[1]; YUV[2][i] = t[2]; }
  const still = YUV.map((p, c) => { const q = Float32Array.from(p); VC.filterRows(q, ns, nl, VC.lp3dB(c ? 7.2e6 : 20.6e6, g.fs, 3e6)); if (c) CAMT.blur2D(q, ns, nl, 0, 1.2); return q; });
  let out = still;
  if (o.v && o.mask && (o.v[0] || o.v[1])) {
    const moving = YUV.map((p, c) => { const q = Float32Array.from(p); VC.filterRows(q, ns, nl, VC.lp3dB(c ? 3.6e6 : 10.3e6, g.fs, 2e6)); CAMT.blur2D(q, ns, nl, 0, c ? 2.4 : 1.0); return q; });
    const m = o.mask; out = still.map((p, c) => Float32Array.from(p, (x, i) => x * (1 - m[i]) + moving[c][i] * m[i]));
  }
  const sg = Math.pow(10, -(o.snrDb || 46) / 20);
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) out[c][i] += sg * VC.gaussRand(rnd) * (c ? 1.4 : 1);
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = VC.yuvToRGB(out[0][i], out[1][i], out[2][i]); R[i] = t[0]; G[i] = t[1]; B[i] = t[2]; }
  return [R, G, B];
}

/* ---------- CBS field-sequential colour (1951) ---------- */
// Each field carries one primary; six fields (R, G, B on alternate interlaced fields) make a colour frame in 1/24 s [SEC];
// the viewer sees the colours at different moments, so anything moving breaks into colour fringes. Field order R-G-B [SEC,
// order not definitive]. Returns per-colour grids to be sent as monochrome signals.
function fieldSequential(grid, g, v, mask) {
  const ns = g.ns, nl = g.lines;
  const t = [[0, 3], [4, 1], [2, 5]]; // field times (in 1/144 s) for [colour][row parity]
  return [0, 1, 2].map(c => {
    const out = new Float32Array(ns * nl);
    for (let par = 0; par < 2; par++) {
      const src = v && (v[0] || v[1]) ? frameAt([grid[c]], ns, nl, v, t[c][par], mask)[0] : grid[c]; // v is per field of this standard (1/144 s)
      for (let r = par; r < nl; r += 2) out.set(src.subarray(r * ns, r * ns + ns), r * ns);
    }
    return out;
  });
}

const api = { shiftPlanes, frameAt, interlace, lagBlend, telecine, convert, telerecord, dmac, muse, fieldSequential };
if (typeof module !== "undefined" && module.exports) module.exports = api;
