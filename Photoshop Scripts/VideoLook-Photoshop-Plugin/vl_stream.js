/* VideoLook digital stream stage (v1.3): what an MPEG-2 or H.264 decoder shows when the stream has gone badly wrong.
 * It works on a real block structure: Y'CbCr 4:2:0, 16 x 16 macroblocks, 8 x 8 DCT with the MPEG-2 quantiser, half-pel
 * motion compensation. Lightly compressed pictures are deliberately not a goal; these are the broken ones.
 *
 * modes:
 *  'mosh'    lost keyframe (datamosh). The decoder never got the I-frame of the new scene, so the P-frames that follow,
 *            whose motion vectors and residuals describe the new scene, are applied to whatever picture it still holds:
 *            the previous scene, or an empty buffer [SEC: I-frames "contain an entire image", P-frames "require the prior
 *            decoding of some other picture" (Wikipedia, Video compression picture types); I-frame removal "throws pixels
 *            from a previous frame into the current footage" (Epidemic Sound guide); decoders "continue to apply updates to
 *            the damaged picture ... until receiving the next independently compressed frame" (Wikipedia, Compression
 *            artifact)]. The new scene shows through only where the encoder sent intra macroblocks or large residuals
 *            (its moving edges); everywhere else the old picture is dragged along the new scene's vectors.
 *            With the old picture set to the photo itself and many frames, this is P-frame duplication ("bloom": the same
 *            vectors and residual applied again and again) [SEC Epidemic Sound; Takeshi Murata, Monster Movie, 2005].
 *            Block-matching encoders pick near-random vectors in flat areas (nothing to match), which is what smears
 *            [EST mechanism stated from how block matching works; amounts EST].
 *  'slices'  MPEG-2 transmission errors (DVB, DVD, Video CD). Slices start at every macroblock row; DC coefficients and
 *            motion vectors are coded as differences within a slice, so once an error hits, the rest of that slice decodes
 *            wrongly until the next slice start code [SEC: patents US5877812 etc. and Aign, ICASSP 97, via search; "in
 *            restricted environments slices ... are restricted to be a single macroblock row" (MPEG Video Compression
 *            Standard, GlobalSpec)]. What the rest of the slice becomes: DC drift (tinted tiles), a wrong vector carried
 *            along (strips of picture from elsewhere: the jigsaw), garbage coefficients (striped blocks), or the decoder's
 *            concealment (a copy of the previous picture). Later P-frames carry the damage on and move it [SEC "artifacts
 *            tend to remain on several generations ... and move with the optic flow" (Wikipedia, Compression artifact)].
 *  'smear'   H.264 with one slice per picture: from the error to the end of the picture, macroblocks decode as intra
 *            blocks predicted from the edges of their neighbours [SEC H.264 "spatial prediction from the edges of
 *            neighboring blocks" (Wikipedia, AVC)] with nonsense modes and residuals, so streaks run off along the
 *            prediction directions. Mode choice and residual amounts [EST].
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;

// MPEG-2 default intra quantiser matrix (zig-zag free, row-major); non-intra default is flat 16 [SPEC ISO/IEC 13818-2]
const QI = [8, 16, 19, 22, 26, 27, 29, 34, 16, 16, 22, 24, 27, 29, 34, 37, 19, 22, 26, 27, 29, 34, 34, 38, 22, 22, 26, 27, 29, 34, 37, 40,
  22, 26, 27, 29, 32, 35, 40, 48, 26, 27, 29, 32, 35, 40, 48, 58, 26, 27, 29, 34, 38, 46, 56, 69, 27, 29, 35, 38, 46, 56, 69, 83];
const C8 = new Float64Array(64);
for (let k = 0; k < 8; k++) for (let n = 0; n < 8; n++) C8[k * 8 + n] = (k === 0 ? Math.SQRT1_2 : 1) * 0.5 * Math.cos((2 * n + 1) * k * Math.PI / 16);
function dct(b, o) { const t = new Float64Array(64); for (let y = 0; y < 8; y++) for (let k = 0; k < 8; k++) { let s = 0; for (let n = 0; n < 8; n++) s += C8[k * 8 + n] * b[y * 8 + n]; t[y * 8 + k] = s; }
  for (let x = 0; x < 8; x++) for (let k = 0; k < 8; k++) { let s = 0; for (let n = 0; n < 8; n++) s += C8[k * 8 + n] * t[n * 8 + x]; o[k * 8 + x] = s; } }
function idct(c, o) { const t = new Float64Array(64); for (let x = 0; x < 8; x++) for (let n = 0; n < 8; n++) { let s = 0; for (let k = 0; k < 8; k++) s += C8[k * 8 + n] * c[k * 8 + x]; t[n * 8 + x] = s; }
  for (let y = 0; y < 8; y++) for (let n = 0; n < 8; n++) { let s = 0; for (let k = 0; k < 8; k++) s += C8[k * 8 + n] * t[y * 8 + k]; o[y * 8 + n] = s; } }
const clip = v => v < 0 ? 0 : v > 255 ? 255 : v;
const blk = new Float64Array(64), cf = new Float64Array(64), rb = new Float64Array(64);
// code one 8x8 block of plane P (w wide) at (bx, by): intra, or a residual (src minus prediction) [SPEC dequantisation forms]
function intraBlock(P, w, bx, by, q, out) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = P[(by + y) * w + bx + x] - 128;
  dct(blk, cf);
  cf[0] = Math.round(cf[0] / 8) * 8;
  for (let k = 1; k < 64; k++) { const st = QI[k] * q / 16; cf[k] = Math.round(cf[k] / st) * st; }
  idct(cf, rb); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[(by + y) * w + bx + x] = clip(rb[y * 8 + x] + 128);
}
function residualBlock(res, q) { // res: 64 values; returns the decoded residual (dead zone: small differences vanish)
  dct(res, cf); const st = 16 * q / 16 * 2;
  for (let k = 0; k < 64; k++) { const l = Math.trunc(cf[k] / st); cf[k] = l === 0 ? 0 : (Math.sign(l) * (Math.abs(l) + 0.5)) * st; }
  const o = new Float64Array(64); idct(cf, o); return o;
}
// half-pel motion-compensated sample from a reference plane, edges extended
function samp(R, w, h, x, y) {
  if (x < 0) x = 0; else if (x > w - 1) x = w - 1; if (y < 0) y = 0; else if (y > h - 1) y = h - 1;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
  return (R[y0 * w + x0] * (1 - fx) + R[y0 * w + x1] * fx) * (1 - fy) + (R[y1 * w + x0] * (1 - fx) + R[y1 * w + x1] * fx) * fy;
}
const hp = v => Math.round(v * 2) / 2;

function toYCC(rgb, n) { // R'G'B' 0..1 -> BT.601 studio-range Y'CbCr 0..255 [SPEC BT.601]
  const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
  for (let i = 0; i < n; i++) { const r = rgb[0][i], g = rgb[1][i], b = rgb[2][i];
    Y[i] = 16 + 219 * (0.299 * r + 0.587 * g + 0.114 * b); Cb[i] = 128 + 224 * (-0.168736 * r - 0.331264 * g + 0.5 * b); Cr[i] = 128 + 224 * (0.5 * r - 0.418688 * g - 0.081312 * b); }
  return [Y, Cb, Cr];
}
function fromYCC(Y, Cb, Cr, n) {
  const o = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) { const y = (Y[i] - 16) / 219, cb = (Cb[i] - 128) / 224, cr = (Cr[i] - 128) / 224;
    o[0][i] = y + 1.402 * cr; o[1][i] = y - 0.344136 * cb - 0.714136 * cr; o[2][i] = y + 1.772 * cb;
    for (let c = 0; c < 3; c++) o[c][i] = o[c][i] < 0 ? 0 : o[c][i] > 1 ? 1 : o[c][i]; }
  return o;
}
function down2(p, w, h) { const W = w >> 1, H = h >> 1, o = new Float32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = 2 * y * w + 2 * x; o[y * W + x] = (p[i] + p[i + 1] + p[i + w] + p[i + w + 1]) / 4; } return o; }
function up2(p, W, H) { const w = W * 2, h = H * 2, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = samp(p, W, H, (x - 0.5) / 2, (y - 0.5) / 2); return o; }

// a frame: three planes (Y full size, Cb Cr half), with sizes
function frame(Y, Cb, Cr, w, h) { return { P: [Y, Cb, Cr], w: [w, w >> 1, w >> 1], h: [h, h >> 1, h >> 1] }; }
function copyF(F) { return { P: F.P.map(p => Float32Array.from(p)), w: F.w.slice(), h: F.h.slice() }; }
function intraCode(F, q) { const o = copyF(F); for (let c = 0; c < 3; c++) { const w = F.w[c], h = F.h[c]; for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) intraBlock(F.P[c], w, bx, by, q, o.P[c]); } return o; }
// predict macroblock (mx, my) of frame F's planes from reference Rf with vector (vx, vy) in luma pixels
function predictMB(Rf, mx, my, vx, vy, out) {
  for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, k = c ? 0.5 : 1, w = Rf.w[c], h = Rf.h[c], R = Rf.P[c], O = out.P[c], x0 = mx * s, y0 = my * s, dx = hp(vx * k), dy = hp(vy * k);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) O[(y0 + y) * w + x0 + x] = samp(R, w, h, x0 + x + dx, y0 + y + dy); }
}

/* ---------------- lost keyframe / bloom ---------------- */
function mosh(F, Ref, o, rnd, mbMask) {
  const MW = F.w[0] >> 4, MH = F.h[0] >> 4, q = o.q || 8, N = Math.max(1, Math.min(120, Math.round(o.frames || 8)));
  const vx = o.moveX || 0, vy = o.moveY || 0, jit = o.jitter !== undefined ? o.jitter : 6;
  // the new scene's vectors: the scene moves by (vx, vy) a frame (or only the selected subject does); flat macroblocks get
  // whatever vector the search happened on
  const mv = new Float32Array(MW * MH * 2), Y = F.P[0], w = F.w[0];
  for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
    let s = 0, s2 = 0; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Y[(my * 16 + y) * w + mx * 16 + x]; s += v; s2 += v * v; }
    const sd = Math.sqrt(Math.max(0, s2 / 256 - (s / 256) ** 2)), flat = Math.max(0, 1 - sd / 10);
    const moving = mbMask ? mbMask[my * MW + mx] : 1, a = rnd() * 2 * Math.PI, m = jit * (0.15 + 0.85 * flat) * Math.sqrt(rnd());
    mv[(my * MW + mx) * 2] = -(vx * moving) + m * Math.cos(a); mv[(my * MW + mx) * 2 + 1] = -(vy * moving) + m * Math.sin(a);
  }
  // the encoder's previous frame of the new scene and its residual against the prediction
  const prev = copyF(F);
  for (let c = 0; c < 3; c++) { const k = c ? 0.5 : 1, ww = F.w[c], hh = F.h[c], s = c ? 8 : 16;
    for (let y = 0; y < hh; y++) for (let x = 0; x < ww; x++) { const mi = Math.min(MH - 1, (y / s) | 0) * MW + Math.min(MW - 1, (x / s) | 0), moving = mbMask ? mbMask[mi] : 1;
      prev.P[c][y * ww + x] = samp(F.P[c], ww, hh, x + vx * k * moving, y + vy * k * moving); } }
  const pred = copyF(F); for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) predictMB(prev, mx, my, mv[(my * MW + mx) * 2], mv[(my * MW + mx) * 2 + 1], pred);
  const res = F.P.map(p => new Float32Array(p.length)), sad = new Float32Array(MW * MH), gain = o.residual !== undefined ? o.residual : 1;
  const r64 = new Float64Array(64);
  for (let c = 0; c < 3; c++) { const ww = F.w[c], hh = F.h[c], s = c ? 8 : 16;
    for (let by = 0; by < hh; by += 8) for (let bx = 0; bx < ww; bx += 8) {
      let sa = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (by + y) * ww + bx + x; r64[y * 8 + x] = F.P[c][i] - pred.P[c][i]; sa += Math.abs(r64[y * 8 + x]); }
      const d = residualBlock(r64, q); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) res[c][(by + y) * ww + bx + x] = d[y * 8 + x] * gain;
      if (c === 0) sad[Math.min(MH - 1, (by / 16) | 0) * MW + Math.min(MW - 1, (bx / 16) | 0)] += sa;
    } }
  const intraF = intraCode(F, q), thr = (o.intraSAD !== undefined ? o.intraSAD : 14) * 256, rate = o.intraRate || 0;
  let D = copyF(Ref);
  for (let f = 0; f < N; f++) {
    const nd = copyF(D);
    for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
      const mi = my * MW + mx, intra = sad[mi] > thr || rnd() < rate;
      if (intra) { for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, ww = F.w[c]; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = (my * s + y) * ww + mx * s + x; nd.P[c][i] = intraF.P[c][i]; } } continue; }
      predictMB(D, mx, my, mv[mi * 2], mv[mi * 2 + 1], nd);
      for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, ww = F.w[c]; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = (my * s + y) * ww + mx * s + x; nd.P[c][i] = clip(nd.P[c][i] + res[c][i]); } }
    }
    D = nd;
  }
  return D;
}

/* ---------------- MPEG-2 slice errors ---------------- */
function slices(F, Ref, o, rnd) {
  const MW = F.w[0] >> 4, MH = F.h[0] >> 4, q = o.q || 6, rate = o.rate !== undefined ? o.rate : 0.25, frames = Math.max(1, Math.round(o.frames || 1));
  const mix = Object.assign({ dc: 1, mv: 1, coef: 0.6, conceal: 1 }, o.mix || {}), tot = mix.dc + mix.mv + mix.coef + mix.conceal;
  const pick = () => { let r = rnd() * tot; for (const k of ["dc", "mv", "coef", "conceal"]) { r -= mix[k]; if (r <= 0) return k; } return "conceal"; };
  const g = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const vx = o.moveX || 0, vy = o.moveY || 0;
  let D = intraCode(F, q);
  for (let f = 0; f < frames; f++) {
    if (f > 0) { // a P-frame: everything follows the motion from the picture as it now is; a few macroblocks are refreshed
      const nd = copyF(D); for (let my = 0; my < MH; my++) for (let mx = 0; mx < MW; mx++) {
        if (rnd() < (o.refresh || 0)) { const tf = intraCode(F, q); for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, ww = F.w[c]; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = (my * s + y) * ww + mx * s + x; nd.P[c][i] = tf.P[c][i]; } } continue; }
        predictMB(D, mx, my, -vx, -vy, nd); }
      D = nd;
    }
    const src = copyF(D);
    for (let my = 0; my < MH; my++) {
      if (rnd() >= rate) continue;
      const e = Math.floor(rnd() * MW), kind = pick();
      let ox = (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * (o.jump || 120)), oy = (rnd() - 0.5) * 2 * (o.jump || 120) * 0.6;
      const dc = [0, 0, 0];
      for (let mx = e; mx < MW; mx++) {
        if (kind === "mv") { ox += g() * 6; oy += g() * 3; predictMB(src, mx, my, ox, oy, D); continue; }
        if (kind === "conceal") { for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, ww = F.w[c]; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const i = (my * s + y) * ww + mx * s + x; D.P[c][i] = Ref.P[c][i]; } } continue; }
        for (let c = 0; c < 3; c++) { const s = c ? 8 : 16, ww = F.w[c];
          for (let by = 0; by < s; by += 8) for (let bx = 0; bx < s; bx += 8) {
            const X = mx * s + bx, Yy = my * s + by;
            if (kind === "dc") dc[c] += g() * (c ? 14 : 22); // the DC predictor walks off, block by block
            let add = null;
            if (kind === "coef") { const z = new Float64Array(64); z[0] = g() * 120; const nz = 2 + Math.floor(rnd() * 5); for (let k = 0; k < nz; k++) z[1 + Math.floor(rnd() * 63)] = g() * 220; add = new Float64Array(64); idct(z, add); }
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (Yy + y) * ww + X + x; D.P[c][i] = clip(D.P[c][i] + (kind === "dc" ? dc[c] : add[y * 8 + x])); }
          } }
      }
    }
  }
  return D;
}

/* ---------------- H.264 intra smear ---------------- */
function smear(F, Ref, o, rnd) {
  const MW = F.w[0] >> 4, MH = F.h[0] >> 4, q = o.q || 6, start = Math.floor((o.errorAt !== undefined ? o.errorAt : 0.35) * MW * MH);
  const D = intraCode(F, q), persist = o.persist !== undefined ? o.persist : 0.8, resAmt = o.garbage !== undefined ? o.garbage : 0.5;
  const g = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  let mode = 0;
  for (let mi = start; mi < MW * MH; mi++) {
    const mx = mi % MW, my = (mi / MW) | 0;
    if (rnd() > persist) mode = Math.floor(rnd() * 5);
    for (let c = 0; c < 3; c++) {
      const s = c ? 8 : 16, ww = F.w[c], P = D.P[c], x0 = mx * s, y0 = my * s;
      const top = x => y0 > 0 ? P[(y0 - 1) * ww + Math.min(ww - 1, x0 + x)] : 128, left = y => x0 > 0 ? P[(y0 + y) * ww + x0 - 1] : 128;
      let dcv = 0; for (let k = 0; k < s; k++) dcv += top(k) + left(k); dcv /= 2 * s;
      const jump = rnd() < resAmt * 0.5 ? g() * 40 * resAmt : 0;
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
        let v;
        if (mode === 0) v = top(x);                     // vertical
        else if (mode === 1) v = left(y);               // horizontal
        else if (mode === 2) v = dcv;                   // DC
        else if (mode === 3) v = top(Math.min(2 * s - 1, x + y + 1)); // diagonal down-left
        else { const tl = y0 > 0 && x0 > 0 ? P[(y0 - 1) * ww + x0 - 1] : 128; v = top(x) + left(y) - tl; } // plane-like (TM)
        P[(y0 + y) * ww + x0 + x] = clip(v + jump);
      }
      if (resAmt > 0 && rnd() < resAmt) { // a garbage residual on one 4x4 or 8x8 part
        const bs = rnd() < 0.5 ? 4 : 8, bx = x0 + Math.floor(rnd() * (s / bs)) * bs, by = y0 + Math.floor(rnd() * (s / bs)) * bs, fx = 1 + Math.floor(rnd() * 3), fy = Math.floor(rnd() * 3), a = g() * 50 * resAmt;
        for (let y = 0; y < bs; y++) for (let x = 0; x < bs; x++) { const i = (by + y) * ww + bx + x; P[i] = clip(P[i] + a * Math.cos(Math.PI * fx * (x + 0.5) / bs) * Math.cos(Math.PI * fy * (y + 0.5) / bs)); }
      }
    }
  }
  return D;
}

/* 'lowbit' (v1.5): a videophone or web codec starved of bits, the way H.261 (CCITT, December 1990; p x 64 kbit/s; QCIF
 * 176 x 144 required, CIF 352 x 288 optional, a few frames a second at 64 kbit/s) and its descendants behaved [SEC
 * Wikipedia H.261 and the Recommendation]. Intra blocks use H.261's flat quantiser (DC step 8, every AC coefficient
 * step 2 x QUANT, QUANT 1-31) [SPEC H.261 4.2.4]. Conditional replenishment: only the macroblocks that changed most are
 * sent, up to the bit budget; the rest stay as the decoder last had them (the earlier picture, or the camera's earlier
 * position) [SEC: CU-SeeMe sent 8 x 8 blocks only when they changed past a threshold (Cornell, ACM Multimedia 96);
 * H.261 macroblocks may be skipped]. Sent blocks are predicted from what the decoder holds plus a coarse residual
 * (dead zone), so they update only partly. Budget and threshold [EST]. */
function lowbitIntra(P, w, bx, by, q, out) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = P[(by + y) * w + bx + x] - 128;
  dct(blk, cf);
  cf[0] = Math.round(cf[0] / 8) * 8;
  const st = 2 * q; for (let k = 1; k < 64; k++) { const l = Math.trunc(cf[k] / st); cf[k] = l === 0 ? 0 : Math.sign(l) * (Math.abs(l) + 0.5) * st; }
  idct(cf, rb); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out[(by + y) * w + bx + x] = clip(rb[y * 8 + x] + 128);
}
function lowbit(F, Ref, o, rnd) {
  const q = Math.max(1, Math.min(31, o.q || 16)), w = F.w[0], h = F.h[0], mw = w >> 4, mh = h >> 4;
  const budget = o.budget !== undefined ? o.budget : 1, thr = o.skipThr !== undefined ? o.skipThr : 4;
  const D = copyF(Ref);
  // camera movement since the decoder's picture: the held picture is the scene where it was
  if (o.frames && (o.moveX || o.moveY)) { const t = copyF(Ref); for (let my = 0; my < mh; my++) for (let mx = 0; mx < mw; mx++) predictMB(Ref, mx, my, -(o.moveX || 0) * o.frames, -(o.moveY || 0) * o.frames, t); for (let c = 0; c < 3; c++) D.P[c].set(t.P[c]); }
  const diffs = [];
  for (let my = 0; my < mh; my++) for (let mx = 0; mx < mw; mx++) {
    let s = 0; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (my * 16 + y) * w + mx * 16 + x; s += Math.abs(F.P[0][i] - D.P[0][i]); }
    diffs.push([s / 256, mx, my]);
  }
  diffs.sort((a, b) => b[0] - a[0]);
  const nSend = Math.round(diffs.length * budget), intra = !o.frames;
  for (let k = 0; k < diffs.length; k++) {
    const [d, mx, my] = diffs[k];
    if (!intra && (k >= nSend || d < thr)) continue; // not sent: stays as held
    for (let c = 0; c < 3; c++) {
      const s = c ? 8 : 16, pw = F.w[c];
      for (let by = my * s; by < my * s + s; by += 8) for (let bx = mx * s; bx < mx * s + s; bx += 8) {
        if (intra) { lowbitIntra(F.P[c], pw, bx, by, q, D.P[c]); continue; }
        const res = new Float64Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (by + y) * pw + bx + x; res[y * 8 + x] = F.P[c][i] - D.P[c][i]; }
        dct(res, cf); const st = 2 * q;
        for (let kk = 0; kk < 64; kk++) { const l = Math.trunc(cf[kk] / st); cf[kk] = l === 0 ? 0 : Math.sign(l) * (Math.abs(l) + 0.5) * st; }
        idct(cf, rb); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const i = (by + y) * pw + bx + x; D.P[c][i] = clip(D.P[c][i] + rb[y * 8 + x]); }
      }
    }
  }
  return D;
}

/* ---------------- the stage ---------------- */
const SIZES = { sif: [352, 288], sd: [720, 576], sd480: [720, 480], hd720: [1280, 720], hd1080: [1920, 1080], cif: [352, 288], qcif: [176, 144], sqcif: [128, 96], qvga: [320, 240], qqvga: [160, 120] };
const MODES = { none: "(none)", mosh: "Lost keyframe / datamosh", slices: "MPEG-2 slice errors (DVB, DVD, Video CD)", smear: "H.264 error smear", lowbit: "Starved videophone / web codec (H.261 style)" };
/* grid: R'G'B' on the standard's grid; o: { mode, size, frames, q, moveX, moveY (pixels a frame at the stream's size),
 *   jitter, residual, intraRate, intraSAD, oldPicture: 'grey'|'green'|'mirror'|'layer'|'self', rate, mix, jump, refresh,
 *   errorAt, persist, garbage, seed }; second: optional second picture (grid-sized planes); mask: optional grid-sized plane */
function stream(grid, g, o, second, mask) {
  o = o || {};
  if (!o.mode || o.mode === "none") return grid;
  const sz = SIZES[o.size] || (g.colour === "COMP" && g.progressive ? [g.ns, g.lines] : SIZES.sd);
  const w = Math.ceil(sz[0] / 16) * 16, h = Math.ceil(sz[1] / 16) * 16, n = w * h;
  // the picture at the coded size, padded (edge repeated) to whole macroblocks
  const toWH = p => { const r = VC.resize(p, g.ns, g.lines, sz[0], sz[1]); if (w === sz[0] && h === sz[1]) return r; const o2 = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o2[y * w + x] = r[Math.min(sz[1] - 1, y) * sz[0] + Math.min(sz[0] - 1, x)]; return o2; };
  const rgb = grid.map(toWH);
  const toF = planes => { const [Y, Cb, Cr] = toYCC(planes, n); return frame(Y, down2(Cb, w, h), down2(Cr, w, h), w, h); };
  const F = toF(rgb), rnd = VC.mulberry32(((o.seed || 1) * 2654435761) >>> 0);
  const old = o.oldPicture || "grey";
  let Ref;
  if (old === "green") Ref = frame(new Float32Array(n), new Float32Array(n / 4), new Float32Array(n / 4), w, h); // an empty buffer: Y = Cb = Cr = 0 shows as dark green [derived from BT.601]
  else if (old === "grey") Ref = frame(new Float32Array(n).fill(128), new Float32Array(n / 4).fill(128), new Float32Array(n / 4).fill(128), w, h);
  else if (old === "layer" && second) Ref = toF(second.map(toWH));
  else if (old === "self") Ref = copyF(F);
  else Ref = toF(rgb.map(p => { const q2 = new Float32Array(n); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) q2[y * w + x] = p[y * w + Math.max(0, sz[0] - 1 - x)]; return q2; }));
  let mbMask = null;
  if (mask) { const m = VC.resize(mask, g.ns, g.lines, w >> 4, h >> 4); mbMask = Float32Array.from(m, v => v > 0.5 ? 1 : 0); }
  const D = o.mode === "mosh" ? mosh(F, Ref, o, rnd, mbMask) : o.mode === "slices" ? slices(F, Ref, o, rnd) : o.mode === "lowbit" ? lowbit(F, Ref, o, rnd) : smear(F, Ref, o, rnd);
  const out = fromYCC(D.P[0], up2(D.P[1], w >> 1, h >> 1), up2(D.P[2], w >> 1, h >> 1), n);
  // the decoder's picture goes out at its own pixels; scaled to the grid without softening (nearest), as a set-top box or
  // player would show the macroblocks
  if (o.smoothUp) return out.map(p => { const crop = new Float32Array(sz[0] * sz[1]); for (let y = 0; y < sz[1]; y++) crop.set(p.subarray(y * w, y * w + sz[0]), y * sz[0]); return VC.resize(crop, sz[0], sz[1], g.ns, g.lines); }); // a player that scales smoothly [EST]
  return out.map(p => { const q2 = new Float32Array(g.ns * g.lines); for (let y = 0; y < g.lines; y++) { const sy = Math.min(h - 1, Math.floor((y + 0.5) * sz[1] / g.lines)); for (let x = 0; x < g.ns; x++) q2[y * g.ns + x] = p[sy * w + Math.min(w - 1, Math.floor((x + 0.5) * sz[0] / g.ns))]; } return q2; });
}
const api = { stream, MODES, SIZES };
if (typeof module !== "undefined" && module.exports) module.exports = api;
