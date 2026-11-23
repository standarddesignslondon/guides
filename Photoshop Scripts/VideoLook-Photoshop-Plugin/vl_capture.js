/* VideoLook: early digital capture (v1.7). Picture source kinds for the first digital cameras and camera phones, flatbed
 * and hand-held scanners, and slit-scan (photo-finish) cameras. Options live in source.inst, like the instruments.
 * Sources and estimates: VideoLook-References/_research/P_batch4_capture_instant_printout_cable.md. [EST] = no source
 * gave a figure. Work is done on a square-pixel raster W x H (H = the standard's lines) and resized back to the grid. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;

const KINDS = {
  digicam: "Early digital camera / camera phone",
  scanner: "Scanner (flatbed or hand-held)",
  slitscan: "Slit-scan / photo-finish camera",
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hex = h => [0, 2, 4].map(j => parseInt(h.slice(j, j + 2), 16) / 255);
function work(grid, g, o) { const H = Math.max(64, Math.min(1080, g.lines)), W = Math.max(64, Math.round(H * (o.aspect || 4 / 3))); return { W, H, P: grid.map(p => V.resize(p, g.ns, g.lines, W, H)) }; }
const back = (P, W, H, g) => P.map(p => V.resize(p, W, H, g.ns, g.lines));
function nearest(src, sw, sh, dw, dh) { const o = new Float32Array(dw * dh); for (let y = 0; y < dh; y++) { const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh)) * sw; for (let x = 0; x < dw; x++) o[y * dw + x] = src[sy + Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw))]; } return o; }
function bilinear(a, w, h, x, y) { x = Math.max(0, Math.min(w - 1, x)); y = Math.max(0, Math.min(h - 1, y)); const x0 = x | 0, y0 = y | 0, x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  return (a[y0 * w + x0] * (1 - fx) + a[y0 * w + x1] * fx) * (1 - fy) + (a[y1 * w + x0] * (1 - fx) + a[y1 * w + x1] * fx) * fy; }
// smooth random walk, n samples, about `len` samples per swing
function wander(n, len, rnd) { const a = new Float32Array(n); let v = 0, t = 0; for (let i = 0; i < n; i++) { t += (V.gaussRand(rnd) - t) / Math.max(1, len); v += t / Math.max(1, len) * 2; v *= 0.995; a[i] = v; } let m = 0; for (const x of a) m = Math.max(m, Math.abs(x)); if (m > 0) for (let i = 0; i < n; i++) a[i] /= m; return a; }

/* ---- 8 x 8 DCT block coding, for the JPEG-style compression of mid-1990s cameras. Quality q 1 (best) to 30 [EST scale]. */
const C8 = (() => { const c = []; for (let k = 0; k < 8; k++) { c.push([]); for (let n = 0; n < 8; n++) c[k].push((k ? Math.sqrt(2 / 8) : Math.sqrt(1 / 8)) * Math.cos(Math.PI * (2 * n + 1) * k / 16)); } return c; })();
const QL = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99]; // the JPEG standard's example luminance table
function dctBlocks(p, w, h, q) {
  const s = q / 4, b = new Float32Array(64), t = new Float32Array(64);
  for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) b[y * 8 + x] = p[Math.min(h - 1, by + y) * w + Math.min(w - 1, bx + x)] * 255 - 128;
    for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) { let a = 0; for (let y = 0; y < 8; y++) a += C8[u][y] * b[y * 8 + x]; t[u * 8 + x] = a; }
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) { let a = 0; for (let x = 0; x < 8; x++) a += C8[v][x] * t[u * 8 + x]; const qq = Math.max(1, QL[u * 8 + v] * s); b[u * 8 + v] = Math.round(a / qq) * qq; }
    for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) { let a = 0; for (let v = 0; v < 8; v++) a += C8[v][x] * b[u * 8 + v]; t[u * 8 + x] = a; }
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (by + y >= h || bx + x >= w) continue; let a = 0; for (let u = 0; u < 8; u++) a += C8[u][y] * t[u * 8 + x]; p[(by + y) * w + bx + x] = (a + 128) / 255; }
  }
}

/* ---- early digital camera. Dycam Model 1 (1990): 376 x 240, greyscale [SEC digitalkameramuseum; Wikipedia]. Apple
 * QuickTake 100 (1994): 640 x 480 or 320 x 240, 24-bit colour [SEC Wikipedia]. Casio QV-10 (1995): 320 x 240 [SEC].
 * Game Boy Camera (1998): 128 x 128 sensor cropped to 128 x 112, two bits a pixel (four greys), ordered dithering and
 * edge enhancement in the cartridge's converter [SEC Wikipedia; Hackaday 2020]. Sharp J-SH04 (2000): 110,000 pixels
 * [SEC]; Nokia 7650 (2002): 640 x 480 [SEC]. Sony MVC-FD7 (1997): VGA on a floppy [SEC]. Colour from a single sensor
 * with a Bayer mosaic, rebuilt simply, so edges fringe; smear from bright points, noise, clipping and the compression
 * amounts are [EST]. */
const DMG = ["0F380F", "306230", "8BAC0F", "9BBC0F"].map(hex); // the green Game Boy screen, a common approximation [EST]
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function digicam(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o);
  const sw = Math.max(16, Math.round(o.w || 320)), sh = Math.max(12, Math.round(o.h || 240)), colour = o.colour !== "mono", n = sw * sh;
  let S = P.map(p => V.resize(p, W, H, sw, sh));
  // exposure and the sensor's small range: lift, clip
  const ev = Math.pow(2, o.exposure || 0), clip = o.clip !== undefined ? o.clip : 0.9;
  S = S.map(p => p.map(v => Math.min(1, Math.pow(Math.max(0, v), 1 / (o.gamma || 1)) * ev / clip)));
  if (!colour) { const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * S[0][i] + 0.587 * S[1][i] + 0.114 * S[2][i]; S = [Y, Float32Array.from(Y), Float32Array.from(Y)]; }
  else if (o.mosaic !== false) { // one colour a pixel (RGGB), then rebuilt by averaging neighbours: colour fringes at edges
    const M = new Float32Array(n), ch = (x, y) => (y & 1) ? ((x & 1) ? 2 : 1) : ((x & 1) ? 1 : 0);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) M[y * sw + x] = S[ch(x, y)][y * sw + x];
    S = [0, 1, 2].map(c => { const out = new Float32Array(n); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let s = 0, k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= sw || yy >= sh || ch(xx, yy) !== c) continue; s += M[yy * sw + xx]; k++; }
      out[y * sw + x] = k ? s / k : 0; } return out; });
    const sat = o.saturation !== undefined ? o.saturation : 0.85; for (let i = 0; i < n; i++) { const y = 0.299 * S[0][i] + 0.587 * S[1][i] + 0.114 * S[2][i]; for (let c = 0; c < 3; c++) S[c][i] = y + (S[c][i] - y) * sat; }
  }
  if (o.tint) { const t = hex(o.tint); S.forEach((p, c) => { for (let i = 0; i < n; i++) p[i] *= t[c] * 1.2; }); }
  // CCD smear: a bright point bleeds a vertical streak [EST amounts]
  if (o.smear) for (let x = 0; x < sw; x++) { let m = 0; for (let y = 0; y < sh; y++) if (S[1][y * sw + x] >= 0.999) m++; const k = m / sh * o.smear * 0.6; if (k > 0.004) for (const p of S) for (let y = 0; y < sh; y++) p[y * sw + x] += k; }
  const noise = o.noise !== undefined ? o.noise : 0.02;
  for (const p of (colour ? S : [S[0]])) for (let i = 0; i < n; i++) p[i] += noise * V.gaussRand(rnd) * (0.6 + 0.8 * (1 - p[i]));
  if (!colour) { S[1] = Float32Array.from(S[0]); S[2] = Float32Array.from(S[0]); }
  if (o.edge) { // the Game Boy Camera's edge enhancement (an unsharp kernel in the converter) [SEC: convolution; EST: amount]
    S = S.map(p => { const b = Float32Array.from(p); CAM.blur2D(b, sw, sh, 0.8, 0.8); return p.map((v, i) => v + o.edge * (v - b[i])); }); }
  if (o.jpeg) { if (colour) { // YCbCr, chroma at half size each way (4:2:0), then 8 x 8 blocks [EST quality]
      const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
      for (let i = 0; i < n; i++) { const r = S[0][i], gg = S[1][i], b = S[2][i]; Y[i] = 0.299 * r + 0.587 * gg + 0.114 * b; Cb[i] = 0.5 + (b - Y[i]) * 0.564; Cr[i] = 0.5 + (r - Y[i]) * 0.713; }
      const hw = Math.ceil(sw / 2), hh = Math.ceil(sh / 2), cb = V.resize(Cb, sw, sh, hw, hh), cr = V.resize(Cr, sw, sh, hw, hh);
      dctBlocks(Y, sw, sh, o.jpeg); dctBlocks(cb, hw, hh, o.jpeg * 1.6); dctBlocks(cr, hw, hh, o.jpeg * 1.6);
      const CB = nearest(cb, hw, hh, sw, sh), CR = nearest(cr, hw, hh, sw, sh);
      for (let i = 0; i < n; i++) { const y = Y[i], u = CB[i] - 0.5, v = CR[i] - 0.5; S[0][i] = y + 1.402 * v; S[1][i] = y - 0.344 * u - 0.714 * v; S[2][i] = y + 1.772 * u; }
    } else { dctBlocks(S[0], sw, sh, o.jpeg); S[1] = Float32Array.from(S[0]); S[2] = Float32Array.from(S[0]); } }
  // grey levels, ordered dither (Game Boy Camera), palette
  const lv = o.greys || 0;
  if (lv > 1) for (const p of S) for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = y * sw + x, d = o.dither ? (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5 : 0;
    p[i] = Math.max(0, Math.min(lv - 1, Math.round(clamp01(p[i]) * (lv - 1) + d))) / (lv - 1); }
  if (o.palette === "dmg") { const out = [0, 1, 2].map(() => new Float32Array(n)); for (let i = 0; i < n; i++) { const k = Math.max(0, Math.min(3, Math.round(clamp01(S[0][i]) * 3))); for (let c = 0; c < 3; c++) out[c][i] = DMG[k][c]; } S = out; }
  const up = p => o.smooth ? V.resize(p.map(clamp01), sw, sh, W, H) : nearest(p.map(clamp01), sw, sh, W, H);
  return back(S.map(up), W, H, g);
}

/* ---- scanner. Flatbed: a lamp and a row of sensors move down the page; three-pass colour scanners moved once for each
 * colour, so the colours can misregister; dirt on the glass or a weak sensor draws a line along the scan; the lamp's
 * brightness drifts [EST]. Hand-held (Logitech ScanMan and others, about 100-400 dpi, 256 greys by 1993): dragged by
 * hand, so the scan stretches and squeezes with the hand's speed and wanders sideways, and wide pages were scanned in
 * bands that never quite meet [SEC CHM; period reviews: "distorted, choppy"; EST amounts]. A subject that moves during a
 * scan is caught part-way: the rows after the movement are displaced [EST]. */
function scanner(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const n = W * H;
  const hand = o.mode === "hand", mono = o.colour === "mono";
  let S = P.map(p => Float32Array.from(p));
  if (mono) { const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = 0.299 * S[0][i] + 0.587 * S[1][i] + 0.114 * S[2][i]; S = [Y, Float32Array.from(Y), Float32Array.from(Y)]; }
  // geometry: where each output row and column comes from
  const speed = hand ? (o.speed !== undefined ? o.speed : 0.6) : 0, wob = hand ? (o.wobble !== undefined ? o.wobble : 0.04) : 0;
  const sp = wander(H, H / 6, rnd), wb = wander(H, H / 4, rnd); const srcY = new Float32Array(H); let acc = 0, tot = 0;
  const step = new Float32Array(H); for (let y = 0; y < H; y++) { step[y] = Math.max(0.15, 1 + speed * sp[y]); tot += step[y]; }
  for (let y = 0; y < H; y++) { srcY[y] = acc * (H - 1) / tot; acc += step[y]; }
  const moveAt = o.moveAt !== undefined ? o.moveAt : 1, moveX = (o.moveX || 0) * W, moveY = (o.moveY || 0) * H;
  const bands = hand ? Math.max(1, Math.round(o.bands || 1)) : 1, bandW = W / bands, bandOff = [];
  for (let k = 0; k < bands; k++) bandOff.push([(rnd() - 0.5) * 0.02 * H * (k ? 1 : 0), (rnd() - 0.5) * 0.01 * W * (k ? 1 : 0), (rnd() - 0.5) * 0.04 * (k ? 1 : 0)]);
  const reg = mono ? [0, 0, 0] : [0, (o.register || 0) * (rnd() - 0.5) * 2, (o.register || 0) * (rnd() - 0.5) * 2];
  const out = [0, 1, 2].map(() => new Float32Array(n));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = Math.min(bands - 1, Math.floor(x / bandW)), bo = bandOff[k];
    let sy = (hand ? srcY[y] : y) + bo[0], sx = x + wob * wb[y] * W + bo[1];
    if (y >= moveAt * H) { sx -= moveX; sy -= moveY; }
    for (let c = 0; c < 3; c++) out[c][y * W + x] = bilinear(S[c], W, H, sx, sy + reg[c]) * (1 + bo[2]);
  }
  if (moveAt < 1) { const y0 = Math.round(moveAt * H); for (let y = y0; y < Math.min(H, y0 + Math.max(1, Math.round(H * 0.012))); y++) for (let x = 0; x < W; x++) for (let c = 0; c < 3; c++) out[c][y * W + x] = out[c][(y0 - 1) * W + x]; } // the row being read when it moved is drawn out
  // lamp drift along the scan, streaks along it, band seams, noise
  const lamp = o.lamp !== undefined ? o.lamp : 0.04, lw = wander(H, H / 3, rnd), streaks = Math.round(o.streaks || 0), sl = [];
  for (let k = 0; k < streaks; k++) sl.push([Math.floor(rnd() * W), rnd() < 0.6 ? -(0.1 + 0.3 * rnd()) : 0.2 + 0.3 * rnd(), rnd() < 0.5 ? Math.floor(rnd() * 3) : -1]);
  const noise = o.noise !== undefined ? o.noise : 0.01;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, f = 1 + lamp * lw[y];
    for (let c = 0; c < 3; c++) { let v = out[c][i] * f + noise * V.gaussRand(rnd); for (const [sx, a, ch] of sl) if (x === sx && (ch < 0 || ch === c || mono)) v += a; if (bands > 1 && Math.abs(x - Math.round(x / bandW) * bandW) < 1 && x > 1 && x < W - 2) v *= 0.85; out[c][i] = clamp01(v); } }
  if (o.greys > 1) for (const p of out) for (let i = 0; i < n; i++) p[i] = Math.round(p[i] * (o.greys - 1)) / (o.greys - 1);
  return back(out, W, H, g);
}

/* ---- slit-scan / photo-finish: a camera that sees only one line (the finish line) and records it over time, so one
 * axis of the picture is time. Things that stand still become streaks along the time axis; something slower than the
 * film is stretched, faster is squeezed [SEC Wikipedia Strip photography; Photo finish; PetaPixel 2012]. The photo is
 * treated as a scene passing the slit at an uneven speed; where it stalls, its line is drawn out into streaks [EST].
 * A timing scale along the edge, as on race-finish pictures [OBS; layout EST]. */
function slitscan(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o); const vert = o.direction === "vertical", L = vert ? H : W, A = vert ? W : H;
  const varS = o.speedVar !== undefined ? o.speedVar : 0.8, stalls = Math.round(o.stalls !== undefined ? o.stalls : 3), stallLen = o.stallLen !== undefined ? o.stallLen : 0.08;
  const sp = wander(L, L / 5, rnd), step = new Float32Array(L);
  for (let t = 0; t < L; t++) step[t] = Math.max(0.05, 1 + varS * sp[t]);
  for (let k = 0; k < stalls; k++) { const t0 = Math.floor(rnd() * L), len = Math.round(stallLen * L * (0.5 + rnd())); for (let t = t0; t < Math.min(L, t0 + len); t++) step[t] = 0.01; }
  let tot = 0; for (let t = 0; t < L; t++) tot += step[t]; const pos = new Float32Array(L); let acc = 0;
  for (let t = 0; t < L; t++) { pos[t] = acc * (L - 1) / tot; acc += step[t]; }
  const wave = o.wave || 0, wf = (o.waveFreq || 3) * 2 * Math.PI / A, flip = o.reverse ? -1 : 1;
  const out = [0, 1, 2].map(() => new Float32Array(W * H));
  for (let t = 0; t < L; t++) for (let a = 0; a < A; a++) { // t along time, a along the slit
    const p = flip > 0 ? pos[t] : L - 1 - pos[t], q = p + wave * L * 0.03 * Math.sin(a * wf + t * 0.01);
    const sx = vert ? a : q, sy = vert ? q : a, i = vert ? t * W + a : a * W + t;
    for (let c = 0; c < 3; c++) out[c][i] = bilinear(P[c], W, H, sx, sy);
  }
  if (o.scale) { const marks = 20, col = 0.95; for (let k = 0; k <= marks; k++) { const t = Math.round(k / marks * (L - 1)), len = k % 5 === 0 ? 0.04 : 0.02;
      for (let a = 0; a < Math.round(len * A); a++) for (let d = 0; d < 2; d++) { const tt = Math.min(L - 1, t + d), i = vert ? tt * W + (A - 1 - a) : (A - 1 - a) * W + tt; for (const pl of out) pl[i] = col; } }
    if (o.finishLine !== false) { const t = Math.round(L * 0.5); for (let a = 0; a < A; a++) { const i = vert ? t * W + a : a * W + t; out[0][i] = 0.9; out[1][i] = 0.1; out[2][i] = 0.1; } } }
  return back(out, W, H, g);
}

function capture(grid, g, o) {
  o = o || {}; const fn = { digicam, scanner, slitscan }[o.kind]; if (!fn) return grid;
  const rnd = V.mulberry32(((o.seed || 1) * 1597334677 + 13) >>> 0);
  return fn(grid, g, o, rnd).map(p => { for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : p[i] > 1.05 ? 1.05 : p[i]; return p; });
}
const api = { KINDS, capture, dctBlocks };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLCapture = api;
