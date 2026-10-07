/* VideoLook set and display stages.
 * set(): receiver controls on the decoded R'G'B' grid (peaking, contrast, brightness, colour, overscan).
 * crt(): rebuilds the picture at document size as seen on a CRT: EOTF, scanline beam profile with blooming,
 *        shadow mask / slot mask / aperture grille, convergence, geometry, glow, phosphor primaries and white -> sRGB.
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;

/* ---------------- colorimetry ---------------- */
const PRIMARIES = { // [SPEC] BT.470-6, EBU Tech 3213, SMPTE RP 145, FCC 1953; sRGB = BT.709
  EBU: [[0.64, 0.33], [0.29, 0.60], [0.15, 0.06]],
  SMPTEC: [[0.630, 0.340], [0.310, 0.595], [0.155, 0.070]],
  NTSC1953: [[0.67, 0.33], [0.21, 0.71], [0.14, 0.08]],
  SRGB: [[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]],
  // Japanese receiver phosphors, "recent television receiver" (Matsushita patent US4167750, 1979) [SEC via gamutthingy]
  P22J: [[0.631, 0.347], [0.268, 0.585], [0.150, 0.071]],
};
const WHITES = { D65: [0.3127, 0.3290], C: [0.310, 0.316],
  // 9300 K "D93" daylight locus value, commonly used for 9300 K sets [EST: CIE daylight formula at 9300 K]
  K9300: [0.2848, 0.2932],
  // Japan: receivers 9300 K + 27 MPCD (Nayatani et al. 1970), towards green; master monitors 9300 K + 8 MPCD (mean of
  // Yagishita 1977 and Nagaoka 1979) [SEC via gamutthingy MPCD.md]
  K9300_27: [0.281, 0.311], K9300_8: [0.28345, 0.29775] };
function rgbToXYZMatrix(prim, white) {
  const xyz = p => [p[0] / p[1], 1, (1 - p[0] - p[1]) / p[1]];
  const P = prim.map(xyz); // columns
  const Wt = xyz(white);
  // solve P * S = W
  const M = [[P[0][0], P[1][0], P[2][0]], [P[0][1], P[1][1], P[2][1]], [P[0][2], P[1][2], P[2][2]]];
  const S = mul3v(inv3(M), Wt);
  return M.map(row => row.map((v, j) => v * S[j]));
}
function inv3(m) {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [C / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
}
function mul3(a, b) { return a.map(r => [0, 1, 2].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j])); }
function mul3v(m, v) { return m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]); }
// Matrix from display phosphor linear RGB to linear sRGB. No chromatic adaptation: a 9300 K set looks blue next to D65. [EST choice]
function displayToSRGB(prim, white) {
  return mul3(inv3(rgbToXYZMatrix(PRIMARIES.SRGB, WHITES.D65)), rgbToXYZMatrix(prim, white));
}
const ENC_N = 16384, encLUT = new Float32Array(ENC_N + 1);
for (let i = 0; i <= ENC_N; i++) { const v = i / ENC_N; encLUT[i] = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
function srgbFast(v) { if (v <= 0) return 0; if (v >= 1) return 1; const f = v * ENC_N, i = f | 0, t = f - i; return encLUT[i] + t * (encLUT[i + 1] - encLUT[i]); }
function srgbEncode(v) { if (v <= 0) return 0; if (v >= 1) return 1; return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }

/* ---------------- set controls (on the decoded grid) ---------------- */
/* s: { contrast (x), brightness (+), colour (x), sharpness (0..1 peaking), overscan (fraction per side) } */
function set(grid, g, s) {
  s = s || {};
  const ns = g.ns, nl = g.lines, n = ns * nl;
  const [R, G, B] = grid;
  if (s.sharpness) { // receiver peaking: overshoot on edges [SEC strand B]; amount is the user's set control
    const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
    const lo = Float32Array.from(Y); VC.filterRows(lo, ns, nl, VC.lp3dB(2.0e6, g.fs, 1.5e6));
    for (let i = 0; i < n; i++) { const d = s.sharpness * 1.5 * (Y[i] - lo[i]); R[i] += d; G[i] += d; B[i] += d; }
  }
  const con = s.contrast === undefined ? 1 : s.contrast, bri = s.brightness || 0, col = s.colour === undefined ? 1 : s.colour;
  if (con !== 1 || bri || col !== 1) for (let i = 0; i < n; i++) {
    const y = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
    R[i] = (y + col * (R[i] - y)) * con + bri; G[i] = (y + col * (G[i] - y)) * con + bri; B[i] = (y + col * (B[i] - y)) * con + bri;
  }
  // No DC restorer: with the video AC-coupled to the tube, the picture's average sits at a fixed brightness instead of its
  // black, so "on a bright picture, the blacks get too black ... on a dark picture, the opposite happens", black turns
  // grey [OBS videokarma.org, old_tv_nut, thread 248278]. A dark caption is lifted and its whites overdriven; the amount
  // (0..1) is the user's and the average level the set was adjusted for is taken as a third of peak white [EST].
  // acTilt > 0 shortens the time constant to a fraction of a field (0.25 / acTilt fields) with a fast attack, so the level
  // drops at a white area and recovers down the next field [EST form; fits a 1968 off-screen photograph, cause not established].
  if (s.acCouple > 0) {
    const m0 = s.acRef !== undefined ? s.acRef : 0.34, lm = new Float32Array(nl), off = new Float32Array(nl); let tot = 0;
    for (let y = 0; y < nl; y++) { let a = 0; const o = y * ns; for (let x = 0; x < ns; x++) a += 0.299 * R[o + x] + 0.587 * G[o + x] + 0.114 * B[o + x]; lm[y] = a / ns; tot += lm[y]; }
    const mean = tot / nl;
    if (!(s.acTilt > 0)) off.fill(mean - m0);
    else {
      // quick to follow a rise in the picture's level (a few lines), slow to let go: so a white caption pulls the level
      // down at once, black inside and below it stays black, and the grey creeps back down the next field
      const a = 1 - Math.exp(-1 / (0.25 / s.acTilt * nl)), aUp = a + (1 - Math.exp(-1 / 3) - a) * Math.min(1, s.acTilt * 4), vb = Math.round(nl * 0.075); let lp = mean;
      for (let pass = 0; pass < 4; pass++) { for (let y = 0; y < nl; y++) { lp += (lm[y] > lp ? aUp : a) * (lm[y] - lp); off[y] = lp - m0; } for (let i = 0; i < vb; i++) lp -= a * lp; }
    }
    for (let y = 0; y < nl; y++) { const d = s.acCouple * off[y], o = y * ns; for (let x = 0; x < ns; x++) { R[o + x] -= d; G[o + x] -= d; B[o + x] -= d; } }
  }
  if (s.overscan) { // the set shows only the inner part of the picture [SEC BBC guidance 3.5-5%/side]
    const ox = Math.round(ns * s.overscan), oy = Math.round(nl * s.overscan);
    return grid.map(p => { const cut = new Float32Array((ns - 2 * ox) * (nl - 2 * oy)); for (let y = 0; y < nl - 2 * oy; y++) cut.set(p.subarray((y + oy) * ns + ox, (y + oy) * ns + ns - ox), y * (ns - 2 * ox)); return VC.resize(cut, ns - 2 * ox, nl - 2 * oy, ns, nl); });
  }
  return grid;
}

/* ---------------- CRT ---------------- */
const TUBES = {
  mono: { mask: "none" },
  delta: { mask: "delta" },       // delta-gun shadow mask, 1950s-70s [MFR]
  slot: { mask: "slot" },         // in-line slot mask (PIL), 1970s+ [MFR]
  trinitron: { mask: "grille" },  // aperture grille, 1968+ [MFR]
  wheel: { mask: "none" },        // monochrome tube seen through a spinning colour wheel (CBS 1951) [SEC]
  p7: { mask: "none" },           // P7 long-persistence radar tube: blue flash, yellow-green afterglow [SEC Wikipedia Phosphor]
};
/* d: { tube, primaries, white ('D65'|'K9300'|'C' or [x,y]), gamma (2.4), screenIn (diagonal inches), pitchMm,
 *      spot (beam sigma as fraction of line spacing), bloom, glow, halation, barrel, cornerDark, roundCorner,
 *      convergence (fraction of width at the corners), maskStrength, monoWhite [x,y] }
 * grid: set output R'G'B' (ns x lines). Returns sRGB code-value planes (w x h). */
function crt(grid, g, w, h, d, win) {
  // win: optional {x0, y0, x1, y1} in picture pixels; only that window is computed and returned (preview)
  const X0 = win ? win.x0 : 0, Y0 = win ? win.y0 : 0, X1 = win ? win.x1 : w, Y1 = win ? win.y1 : h, WW = X1 - X0, HH = Y1 - Y0;
  d = Object.assign({ tube: "slot", primaries: "EBU", white: "D65", gamma: 2.4, screenIn: 22, pitchMm: 0.75, spot: 0.3, bloom: 0.7,
    glow: 0.04, halation: 0.03, barrel: 0.025, cornerDark: 0.25, roundCorner: 0.06, convergence: 0.0008, maskStrength: 0.5 }, d || {});
  const ns = g.ns, nl = g.lines;
  const white = Array.isArray(d.white) ? d.white : WHITES[d.white] || WHITES.D65;
  const mono = d.tube === "mono" || d.tube === "p7";
  // 1. EOTF to linear light on the grid (CRT ~2.4 [SPEC BT.1886]; adjustable 2.2-2.8)
  const lin = grid.map(p => { const a = new Float32Array(p.length); for (let i = 0; i < p.length; i++) { const v = p[i] > 0 ? p[i] : 0; a[i] = Math.pow(v, d.gamma); } return a; });
  if (mono) { for (let i = 0; i < lin[0].length; i++) { const y = 0.299 * lin[0][i] + 0.587 * lin[1][i] + 0.114 * lin[2][i]; lin[0][i] = lin[1][i] = lin[2][i] = y; } }
  // 2. glow / halation map at grid resolution (light scattered in the faceplate) [EST physics]
  const glowMap = [0, 1, 2].map(c => { const a = Float32Array.from(lin[c]); const sx = ns * 0.02, sy = sx * (nl / ns) * 0.75; CAM.blur2D(a, ns, nl, sx, sy); return a; });
  const haloMap = [0, 1, 2].map(c => { const a = Float32Array.from(lin[c]); const sx = ns * 0.036, sy = sx * (nl / ns) * 0.75; CAM.blur2D(a, ns, nl, sx, sy); return a; });
  // d.field 1 or 2: draw only the lines of one field (for a photograph whose shutter caught one field); each carries half the light
  const FS = d.field === 1 || d.field === 2 ? d.field : 0, fk = FS ? 0.5 : 1;
  for (let c = 0; c < 3; c++) for (let i = 0; i < glowMap[c].length; i++) glowMap[c][i] = fk * (d.glow * glowMap[c][i] + d.halation * haloMap[c][i]);
  // 3. horizontal upsampling of each scan line to output width (x2 for mask/convergence precision)
  const W2 = w;
  const up = lin.map(p => VC.resize(p, ns, nl, W2, nl));
  const upY = new Float32Array(up[0].length); for (let i = 0; i < upY.length; i++) upY[i] = 0.2126 * up[0][i] + 0.7152 * up[1][i] + 0.0722 * up[2][i];
  const wts = new Float32Array(64);
  // 4. compose
  const M = mono ? null : displayToSRGB(PRIMARIES[d.primaries] || PRIMARIES.EBU, white);
  const Mm = mono ? (() => { // mono phosphor: white of given chromaticity expressed in sRGB linear
    const wxy = d.monoWhite || [0.29, 0.31]; // P4 chromaticity NOT FOUND [EST slightly cool white]
    const X = wxy[0] / wxy[1], Z = (1 - wxy[0] - wxy[1]) / wxy[1];
    const toS = inv3(rgbToXYZMatrix(PRIMARIES.SRGB, WHITES.D65)); const v = mul3v(toS, [X, 1, Z]); const mx = Math.max(...v); return v.map(x => x / mx);
  })() : null;
  // P7: the fresh blue-white flash fades in a fraction of a second and the yellow-green afterglow over seconds [SEC mechanism;
  // colours from the 440 / 558 nm peaks, EST chromaticities]; a slow-scan frame is written top to bottom
  const xyToS = (xy) => { const X = xy[0] / xy[1], Z = (1 - xy[0] - xy[1]) / xy[1]; const v = mul3v(inv3(rgbToXYZMatrix(PRIMARIES.SRGB, WHITES.D65)), [X, 1, Z]); const mx = Math.max(...v); return v.map(x => Math.max(0, x / mx)); };
  const P7 = d.tube === "p7" ? { flash: xyToS([0.17, 0.13]), glow: xyToS([0.38, 0.53]), frame: d.frameSec || 8, tau: d.tauSec || 10, flashT: 0.25, pos: d.writePos !== undefined ? d.writePos : 1 } : null;
  const out = [new Float32Array(WW * HH), new Float32Array(WW * HH), new Float32Array(WW * HH)];
  const screenWmm = d.screenIn * 25.4 * 0.8;          // 4:3 visible width
  const pitchPx = d.pitchMm / screenWmm * w;            // mask triad pitch in output pixels
  const maskFade = Math.max(0, Math.min(1, (pitchPx - 2.5) / 4)) * d.maskStrength; // fades in from 2.5 to 6.5 px per triad // mask only where it resolves [EST]
  const lineSp = h / nl;                                // output px per scan line
  const conv = d.convergence * w;
  const cx = (w - 1) / 2, cy = (h - 1) / 2, aspect = w / h;
  const vals = new Float32Array(3);
  // normalise the mask so its average transmission per colour is 1 (the set's brightness control compensates) [EST]
  const maskFn = maskFunction(d.tube), norm = mono ? [1, 1, 1] : maskNorm(maskFn);
  // pre-computed mask texture over one repeat (2 pitches wide; delta repeats every 1.732 pitch, slot every 1/1.1) [EST]
  const TX = 128, TPx = 2, TPy = d.tube === "delta" ? 1.7320508 : d.tube === "slot" ? 2 / 1.1 : 1;
  const TY = Math.round(TX * TPy / TPx), tex = [0, 1, 2].map(() => new Float32Array(TX * TY));
  if (!mono) for (let c = 0; c < 3; c++) for (let b = 0; b < TY; b++) for (let a = 0; a < TX; a++) tex[c][b * TX + a] = maskFn((a + 0.5) / TX * TPx, (b + 0.5) / TY * TPy, c) * norm[c];
  // anti-aliasing: a beam narrower than ~0.55 output pixel cannot be shown, so the spot is widened to that minimum,
  // which makes the scanlines fade out smoothly when the output has fewer than ~2 pixels per line
  const spotMin = d.spotMin !== undefined ? d.spotMin : 0.55 / lineSp;
  const NT = Math.max(4, Math.ceil(2 * 3 * Math.max(d.spot * (1 + d.bloom * 1.5), spotMin)) + 1);
  const SPOT_LV = 48, SPOT_N = 256, SPOT_DY = NT / 2 + 0.5, spotLUT = new Float32Array(SPOT_LV * SPOT_N);
  for (let a = 0; a < SPOT_LV; a++) { const lv = (a + 0.5) * 1.5 / (SPOT_LV - 1), sig = Math.max(spotMin, d.spot * (1 + d.bloom * Math.min(1.5, lv)));
    for (let b = 0; b < SPOT_N; b++) { const dy = (b + 0.5) * SPOT_DY / SPOT_N; spotLUT[a * SPOT_N + b] = Math.exp(-dy * dy / (2 * sig * sig)) / (sig * 2.5066); } }
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      // geometry: barrel distortion of the raster on a curved tube [EST]
      const u = (x - cx) / cx, v = (y - cy) / cy, r2 = (u * u * aspect * aspect + v * v) / (aspect * aspect);
      const k = 1 + d.barrel * r2;
      const su = u * k, sv = v * k;
      if (Math.abs(su) > 1 || Math.abs(sv) > 1) { continue; }
      // round tube face (KVN-49, radar tubes): cut outside a circle, radius as a fraction of the picture's half-diagonal
      if (d.roundScreen) { const rr = Math.sqrt(u * u * aspect * aspect + v * v) / Math.sqrt(aspect * aspect + 1); if (rr > d.roundScreen) continue; }
      // rounded tube corners
      if (d.roundCorner) { const ax = Math.max(0, Math.abs(u) - (1 - d.roundCorner)) / d.roundCorner, ay = Math.max(0, Math.abs(v) - (1 - d.roundCorner * aspect)) / (d.roundCorner * aspect); if (ax * ax + ay * ay > 1) continue; }
      const sxp = (su + 1) / 2 * (W2 - 1), syl = (sv + 1) / 2 * nl - 0.5;
      // beam profile weights for the 4 nearest lines, shared by the three guns; blooming follows the line's luminance [EST]
      const j0 = Math.floor(syl);
      const xl = Math.min(W2 - 1, Math.max(0, sxp)), xl0 = xl | 0, fxl = xl - xl0, xl1 = xl0 + 1 < W2 ? xl0 + 1 : xl0;
      let wsum = 0;
      const jb = j0 - (NT >> 1) + 1;
      for (let q = 0; q < NT; q++) {
        const j = jb + q; wts[q] = 0;
        if (j < 0 || j >= nl) continue;
        if (FS && (j & 1) !== FS - 1) continue;
        const lv = upY[j * W2 + xl0] * (1 - fxl) + upY[j * W2 + xl1] * fxl;
        let dy = syl - j; if (dy < 0) dy = -dy; if (dy >= SPOT_DY) continue;
        const li = lv >= 1.5 ? SPOT_LV - 1 : (lv <= 0 ? 0 : (lv * (SPOT_LV - 1) / 1.5) | 0);
        wts[q] = spotLUT[li * SPOT_N + ((dy * SPOT_N / SPOT_DY) | 0)];
      }
      for (let c = 0; c < 3; c++) {
        const cshift = c === 1 ? 0 : (c === 0 ? conv * u : -conv * u); // convergence error grows to the edges [EST]
        let xs = sxp + cshift; if (xs < 0) xs = 0; else if (xs > W2 - 1) xs = W2 - 1;
        const x0 = xs | 0, fx = xs - x0, x1 = x0 + 1 < W2 ? x0 + 1 : x0;
        const plane = up[c];
        let acc = 0;
        for (let q = 0; q < NT; q++) { const wq = wts[q]; if (wq === 0) continue; const o = (jb + q) * W2; acc += wq * (plane[o + x0] + (plane[o + x1] - plane[o + x0]) * fx); }
        vals[c] = acc;
      }
      // shadow mask / grille
      if (!mono && maskFade > 0) {
        const px = x / pitchPx, py = y / pitchPx;
        let ta = ((px / TPx) % 1) * TX | 0, tb = ((py / TPy) % 1) * TY | 0; const ti = tb * TX + ta;
        for (let c = 0; c < 3; c++) vals[c] *= (1 - maskFade) + maskFade * tex[c][ti];
      }
      // glow + halation (sampled from the grid maps)
      const gx = (su + 1) / 2 * (ns - 1), gy = (sv + 1) / 2 * (nl - 1);
      { const gx0 = gx < 0 ? 0 : (gx > ns - 2 ? ns - 2 : gx | 0), gy0 = gy < 0 ? 0 : (gy > nl - 2 ? nl - 2 : gy | 0), fgx = gx - gx0, fgy = gy - gy0, o0 = gy0 * ns + gx0, o1 = o0 + ns;
        const w00 = (1 - fgx) * (1 - fgy), w01 = fgx * (1 - fgy), w10 = (1 - fgx) * fgy, w11 = fgx * fgy;
        for (let c = 0; c < 3; c++) { const gm = glowMap[c]; vals[c] += w00 * gm[o0] + w01 * gm[o0 + 1] + w10 * gm[o1] + w11 * gm[o1 + 1]; } }
      // corner darkening [EST]
      const vig = 1 - d.cornerDark * r2 * r2;
      const i = (y - Y0) * WW + (x - X0);
      if (P7) { let age = (P7.pos - (sv + 1) / 2); if (age < 0) age += 1; age *= P7.frame; const L = (vals[0] + vals[1] + vals[2]) / 3 * vig * Math.exp(-age / P7.tau), fw = Math.exp(-age / P7.flashT);
        for (let c = 0; c < 3; c++) out[c][i] = srgbFast(L * (P7.glow[c] * (1 - 0.6 * fw) + P7.flash[c] * 1.6 * fw)); }
      else if (mono) { const L = (vals[0] + vals[1] + vals[2]) / 3 * vig; for (let c = 0; c < 3; c++) out[c][i] = srgbFast(L * Mm[c]); }
      else for (let c = 0; c < 3; c++) out[c][i] = srgbFast((M[c][0] * vals[0] + M[c][1] * vals[1] + M[c][2] * vals[2]) * vig);
    }
  }
  return out;
}
function bil(p, w, h, x, y) {
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x))), y0 = Math.max(0, Math.min(h - 2, Math.floor(y))), fx = x - x0, fy = y - y0;
  return (p[y0 * w + x0] * (1 - fx) + p[y0 * w + x0 + 1] * fx) * (1 - fy) + (p[(y0 + 1) * w + x0] * (1 - fx) + p[(y0 + 1) * w + x0 + 1] * fx) * fy;
}
// Mask profiles. Phosphor stripes/dots with soft edges (the beam spot and the viewing optics soften them) [EST shapes].
function stripe(px, c) { // aperture grille: three vertical stripes per pitch
  const f = px - Math.floor(px), centre = (c + 0.5) / 3; let dd = Math.abs(f - centre); dd = Math.min(dd, 1 - dd);
  const t = Math.max(0, 1 - dd / 0.2); return t * t * (3 - 2 * t); // smoothstep, stripe half-width ~0.2 pitch
}
function slotGap(py) { const f = py * 1.1 - Math.floor(py * 1.1); const e = Math.min(f, 1 - f); return e < 0.06 ? 0.25 + 0.75 * e / 0.06 : 1; } // bridges between slots [EST]
function deltaDot(px, py, c) { // three dots per triad on a triangular lattice
  const rowH = 0.866, row = Math.floor(py / rowH), off = (row & 1) * 0.5;
  const fx = px + off, cell = Math.floor(fx), fxx = fx - cell, fy = py / rowH - row;
  const centres = [[1 / 6, 0.33], [0.5, 0.83], [5 / 6, 0.33]];
  let best = 9;
  for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const dx = fxx - centres[c][0] - ox, dy = (fy - centres[c][1] - oy) * rowH; best = Math.min(best, dx * dx + dy * dy); }
  const r = Math.sqrt(best), t = Math.max(0, 1 - r / 0.3); return t * t * (3 - 2 * t);
}
function maskFunction(tube) { return tube === "trinitron" ? (px, py, c) => stripe(px, c) : tube === "slot" ? (px, py, c) => stripe(px, c) * slotGap(py + (Math.floor(px) & 1) * 0.5) : deltaDot; }
function maskNorm(fn) { const rnd = VC.mulberry32(12345), norm = [0, 0, 0]; for (let c = 0; c < 3; c++) { let s = 0; const K = 200000; for (let k = 0; k < K; k++) s += fn(rnd() * 97, rnd() * 89, c); norm[c] = K / Math.max(1e-6, s); } return norm; }

/* ---------------- Baird Televisor (30-line) ---------------- */
// A neon lamp behind a spinning Nipkow disc: the picture is drawn as 30 vertical strips, each slightly curved because the
// disc's holes travel on an arc; the lamp's glow is orange; the picture was "about the size of a postage stamp" and viewed
// through a lens [SEC research H]. grid: planes with width = 30 lines (columns), height = samples down each line.
// Neon colour, arc sag and lamp unevenness [EST].
function televisor(grid, gw, gh, w, h, o) {
  o = o || {};
  const neon = o.neon || [1.0, 0.27, 0.045], sag = o.sag !== undefined ? o.sag : 0.35, gap = o.gap !== undefined ? o.gap : 0.12;
  const lin = Float32Array.from(grid[0], (x, i) => Math.max(0, 0.299 * grid[0][i] + 0.587 * grid[1][i] + 0.114 * grid[2][i]));
  const out = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  const colW = w / gw;
  for (let y = 0; y < h; y++) {
    const vy = (y + 0.5) / h, bend = sag * Math.pow(2 * vy - 1, 2); // columns curve (arc scanning), in line widths
    const gy = vy * gh - 0.5, y0 = Math.max(0, Math.min(gh - 1, Math.floor(gy))), y1 = Math.min(gh - 1, y0 + 1), fy = Math.max(0, Math.min(1, gy - y0));
    for (let x = 0; x < w; x++) {
      const cx = (x + 0.5) / colW - bend, j = Math.floor(cx), fr = cx - j;
      if (j < 0 || j >= gw) continue;
      const edge = Math.min(fr, 1 - fr), prof = edge < gap / 2 ? 0.55 + 0.45 * edge / (gap / 2) : 1; // hole overlap/gaps between strips
      const lv = (lin[y0 * gw + j] * (1 - fy) + lin[y1 * gw + j] * fy);
      const u = (x + 0.5) / w - 0.5, lamp = 1 - 0.25 * (u * u * 4) - 0.12 * Math.pow(2 * vy - 1, 2); // uneven glow of the lamp plate
      const L = Math.pow(Math.min(1.2, lv), 2.2) * prof * lamp * (o.brightness || 1.0); // photocell and neon lamp are both ~linear: light out follows light in [EST]
      const i = y * w + x; for (let c = 0; c < 3; c++) out[c][i] = srgbEncode(L * neon[c]);
    }
  }
  return out;
}

/* ---------------- KVN-49 magnifying lens ---------------- */
// A water- or glycerine-filled lens (one face flat, one spherical, "approximately four times" magnification) stood in front
// of the 140 x 105 mm picture [SEC research H]. Pincushion distortion, slight colour fringing, falloff and a window
// reflection are the optics of any such magnifier; their amounts, and the cabinet around, are [EST].
function lensView(pic, w, h, o) {
  o = o || {};
  const k = o.pincushion !== undefined ? o.pincushion : 0.09, ca = o.fringe !== undefined ? o.fringe : 0.012;
  const cab = [0.035, 0.022, 0.012], face = [0.02, 0.022, 0.02];
  const out = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
  const cx = (w - 1) / 2, cy = (h - 1) / 2, R = Math.min(cx, cy * w / h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - cx) / cx, v = (y - cy) / cy, i = y * w + x;
    const sup = Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4); // squarish lens outline
    if (sup > 1) { for (let c = 0; c < 3; c++) out[c][i] = srgbEncode(cab[c] * (0.7 + 0.3 * (1 - v * 0.5))); continue; }
    const r2 = u * u + v * v, rim = sup > 0.82 ? 1 - (sup - 0.82) / 0.18 * 0.65 : 1;
    for (let c = 0; c < 3; c++) {
      // the magnified picture nearly fills the lens; pincushion grows with distance; red and blue focus slightly differently
      const kk = k * (1 + (c - 1) * ca * 8), m = 1 / ((1 + kk * r2) * (o.fill || 0.82));
      const su = u * m, sv = v * m;
      let val;
      if (Math.abs(su) <= 1 && Math.abs(sv) <= 1) {
        const sx = (su + 1) / 2 * (w - 1), sy = (sv + 1) / 2 * (h - 1), x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
        const p = pic[c], a = p[y0 * w + x0] * (1 - fx) + p[y0 * w + x1] * fx, b = p[y1 * w + x0] * (1 - fx) + p[y1 * w + x1] * fx;
        const code = a * (1 - fy) + b * fy; val = code <= 0.04045 ? code / 12.92 : Math.pow((code + 0.055) / 1.055, 2.4);
      } else val = face[c];
      const fall = 1 - 0.35 * r2, refl = 0.05 * Math.exp(-Math.pow((u + 0.45) / 0.18, 2) - Math.pow((v + 0.55) / 0.35, 2));
      out[c][i] = srgbEncode(Math.max(0, val * fall * rim + refl));
    }
  }
  return out;
}

const api = { maskFunction, maskNorm, set, crt, PRIMARIES, WHITES, displayToSRGB, rgbToXYZMatrix, srgbEncode, TUBES, televisor, lensView };
if (typeof module !== "undefined" && module.exports) module.exports = api;
