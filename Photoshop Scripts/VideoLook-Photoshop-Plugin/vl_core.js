/* VideoLook signal core.
 * Builds a real line-by-line video signal (composite PAL / NTSC / SECAM, monochrome 405 / 819 / 625 / 525,
 * or component) from an R'G'B' picture, passes it through a channel, and decodes it with a chosen receiver.
 * All numbers carry their source in comments: [SPEC] standard, [SEC] BBC/textbook, [OBS], [EST] own choice.
 */
"use strict";

/* ------------------------------------------------------------------ standards */
// Line timings: sync, back porch, active, front porch (µs). Colour data from ITU-R BT.470-6 [SPEC].
const PAL_FSC = 4433618.75;       // Hz [SPEC BT.470-6]
const NTSC_FSC = 315e6 / 88;      // 3.579545 MHz [SPEC FCC 73.682]
const STANDARDS = {
  // 625-line PAL System I (UK). Active 52 µs, 575 lines, 5.5 MHz [SPEC UK DTI spec / BT.470]
  "PAL-I":  { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * PAL_FSC, colour: "PAL",
              fsc: PAL_FSC, bw: 5.5e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  "PAL-BG": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * PAL_FSC, colour: "PAL",
              fsc: PAL_FSC, bw: 5.0e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  // 525-line NTSC System M. Active ~52.66 µs, ~485 lines, 4.2 MHz [SPEC FCC / SMPTE 170M]
  "NTSC-M": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 4 * NTSC_FSC, colour: "NTSC",
              fsc: NTSC_FSC, bw: 4.2e6, chromaBW: 1.3e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg", setup: 0.075 },
  // 625-line SECAM System L (France). 6 MHz, positive modulation [SPEC BT.470-6]
  "SECAM-L": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * PAL_FSC, colour: "SECAM",
               bw: 6.0e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "pos" },
  // 405-line System A (UK). Line 98.7 µs, sync 9.7, back porch 6.5, active 80.7, 377 lines, 3 MHz [SEC BBC 1953 manual]
  "405-A":  { lines: 377, tLine: 98.7e-6, sync: 9.7e-6, back: 6.5e-6, active: 80.7e-6, fs: 12e6, colour: "MONO",
              bw: 3.0e6, lineRate: 10125, fieldLines: 202.5, modulation: "pos" },
  // 819-line System E (France). Line 48.84 µs, active 40.8, 737 lines, 10 MHz [OBS/SEC]
  "819-E":  { lines: 737, tLine: 48.84e-6, sync: 2.5e-6, back: 5.0e-6, active: 40.8e-6, fs: 30e6, colour: "MONO",
              bw: 10e6, lineRate: 20475, fieldLines: 409.5, modulation: "pos" },
  // Monochrome 625 (BBC2 1964) and 525 (US pre-colour)
  "625-MONO": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 13.5e6 * 1.25, colour: "MONO",
                bw: 5.5e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  "525-MONO": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 13.5e6 * 1.25, colour: "MONO",
                bw: 4.2e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg", setup: 0.075 },
  // Cross-playing: an NTSC tape replayed as "PAL-60" (PAL coding, 525/60 scan) or "NTSC 4.43" (NTSC coding on the PAL subcarrier) [SEC strand F]
  "PAL-60": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 4 * PAL_FSC, colour: "PAL",
              fsc: PAL_FSC, bw: 5.0e6, chromaBW: 1.3e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg" },
  "NTSC-443": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 4 * PAL_FSC, colour: "NTSC",
              fsc: PAL_FSC, bw: 5.0e6, chromaBW: 1.3e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg" },
  // Component studio / digital: BT.601 13.5 MHz, 4:2:2 [SPEC BT.601]
  "COMP-625": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 13.5e6, colour: "COMP",
                bw: 5.75e6, chromaBW: 2.75e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  "COMP-525": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 13.5e6, colour: "COMP",
                bw: 5.75e6, chromaBW: 2.75e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg" },

  /* ---- v1.1 additions. Sources in _research/H_expansion_research.md; ITU-R BT.470-6 unless marked. ---- */
  // SECAM with negative modulation: USSR / Eastern Europe System D/K (6 MHz) and East German B/G (5 MHz) [SPEC BT.470-6]
  "SECAM-DK": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * PAL_FSC, colour: "SECAM",
                bw: 6.0e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  "SECAM-BG": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * PAL_FSC, colour: "SECAM",
                bw: 5.0e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  // Soviet 625-line black and white, System D, 6 MHz (1948/49) [SPEC BT.470-6 D; dates conflict, see research H]
  "625-DK-MONO": { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 13.5e6 * 1.25, colour: "MONO",
                bw: 6.0e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  // Brazil PAL-M: 525/59.94 with PAL on fsc = 3.575611 MHz (227.25 cycles/line), 4.2 MHz, 7.5% setup [SPEC BT.470-6]
  "PAL-M":  { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 4 * 3575611.49, colour: "PAL",
              fsc: 3575611.49, bw: 4.2e6, chromaBW: 1.3e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg", setup: 0.075 },
  // Argentina N/PAL: 625/50 in a 6 MHz channel, 4.2 MHz video, fsc = 3.582056 MHz, black level 0 in Argentina [SPEC BT.470-6 note]
  "PAL-N":  { lines: 575, tLine: 64e-6, sync: 4.7e-6, back: 5.8e-6, active: 52e-6, fs: 4 * 3582056.25, colour: "PAL",
              fsc: 3582056.25, bw: 4.2e6, chromaBW: 1.3e6, lineRate: 15625, fieldLines: 312.5, modulation: "neg" },
  // Japan NTSC-J: as System M but black at blanking (0 IRE, "In Japan values 0-0 are used") [SPEC BT.470-6]
  "NTSC-J": { lines: 485, tLine: 63.556e-6, sync: 4.7e-6, back: 4.7e-6, active: 52.66e-6, fs: 4 * NTSC_FSC, colour: "NTSC",
              fsc: NTSC_FSC, bw: 4.2e6, chromaBW: 1.3e6, lineRate: 15734.264, fieldLines: 262.5, modulation: "neg" },
  // Belgian 819-line System F: 7 MHz channels, ~5 MHz video (sources say 5 or 5.5), positive [SEC research H]
  "819-F":  { lines: 737, tLine: 48.84e-6, sync: 2.5e-6, back: 5.0e-6, active: 40.8e-6, fs: 30e6, colour: "MONO",
              bw: 5.0e6, lineRate: 20475, fieldLines: 409.5, modulation: "pos" },
  // Moscow 343-line on RCA equipment at 25 frames, interlaced: 8575 Hz lines. Bandwidth 3.29 MHz and negative modulation
  // are the RCA figures (single source); active lines and line timing scaled from 405-line proportions [EST]
  "343-RU": { lines: 315, total: 343, tLine: 116.62e-6, sync: 11.4e-6, back: 7.7e-6, active: 95.4e-6, fs: 12e6, colour: "MONO",
              bw: 3.29e6, lineRate: 8575, fieldLines: 171.5, modulation: "neg" },
  // German 441-line (1937-44): 383 active, 50 fields interlaced, 11025 Hz, 2 MHz, positive modulation [SEC fernsehmuseum + Wikipedia];
  // line timing proportions [EST]
  "441-DE": { lines: 383, total: 441, tLine: 90.70e-6, sync: 8.2e-6, back: 5.4e-6, active: 74.4e-6, fs: 12e6, colour: "MONO",
              bw: 2.0e6, lineRate: 11025, fieldLines: 220.5, modulation: "pos" },
  // US RMA 441-line (1939-41): 60 fields, 13230 Hz, 2.8 MHz, negative [single source]; active lines 92% as 525 [EST]
  "441-US": { lines: 407, total: 441, tLine: 75.59e-6, sync: 6.8e-6, back: 4.5e-6, active: 62.0e-6, fs: 12e6, colour: "MONO",
              bw: 2.8e6, lineRate: 13230, fieldLines: 220.5, modulation: "neg" },
  // Baird 240-line sequential (Alexandra Palace 1936-37): 25 frames, 6000 Hz. Bandwidth NOT FOUND: set for equal
  // horizontal and vertical detail [EST]; polarity not found (positive as the shared 405 transmitter) [EST]
  "240-BAIRD": { lines: 220, total: 240, progressive: true, tLine: 166.67e-6, sync: 15e-6, back: 10e-6, active: 136.7e-6, fs: 6e6, colour: "MONO",
              bw: 1.1e6, lineRate: 6000, fieldLines: 240, modulation: "pos" },
  // Baird 30-line (BBC 1929-35): 30 vertical lines, 12.5 pictures/s, 375 Hz, ~10 kHz video; a black bar at each line start
  // from a masked aperture served as sync [SEC research H]. No blanking interval.
  "30-BAIRD": { lines: 30, total: 30, progressive: true, vertical: true, tLine: 2.6667e-3, sync: 0, back: 0.25e-3, active: 2.4e-3, fs: 100e3, colour: "MONO",
              bw: 10e3, lineRate: 375, fieldLines: 30, modulation: "pos" },
  // CBS field-sequential colour (1951): 405 lines, 144 fields/s = 29160 Hz lines, 6 MHz channel; the stated 54% horizontal
  // resolution of 525-line gives ~4.2 MHz with ~28 µs active [derived]; active lines as 405-A [EST]. fieldSeq: each field one colour.
  "405-CBS": { lines: 377, total: 405, tLine: 34.29e-6, sync: 3.0e-6, back: 2.5e-6, active: 28.1e-6, fs: 17.734e6, colour: "MONO",
              bw: 4.2e6, lineRate: 29160, fieldLines: 202.5, modulation: "neg", fieldSeq: true },
  // Apollo lunar camera (1969): 320 lines (312 visible), 10 frames/s sequential, 500 kHz [SEC research H]; line timing [EST]
  "320-APOLLO": { lines: 312, total: 320, progressive: true, tLine: 312.5e-6, sync: 20e-6, back: 20e-6, active: 262e-6, fs: 2e6, colour: "MONO",
              bw: 0.5e6, lineRate: 3200, fieldLines: 320, modulation: "neg" },
  // Amateur slow-scan TV (Macdonald, 1958): 120 lines, 15 lines/s (8 s frame), 5 ms sync, square picture; fits 3 kHz,
  // so ~1 kHz picture detail [SEC research H; detail bandwidth EST]
  "120-SSTV": { lines: 120, total: 120, progressive: true, tLine: 66.67e-3, sync: 5e-3, back: 1.5e-3, active: 58e-3, fs: 4e3, colour: "MONO",
              bw: 1.0e3, lineRate: 15, fieldLines: 120, modulation: "neg" },
  // Hi-Vision (MUSE) studio side: 1125 lines, 1035 active, 60 fields [SEC]; 1920 samples on the 74.25 MHz raster. Handled
  // by the MUSE route (vl_transfer.muse), not the composite encoder.
  "MUSE":   { lines: 1035, total: 1125, tLine: 29.63e-6, sync: 0.6e-6, back: 2.0e-6, active: 25.86e-6, fs: 74.25e6, colour: "COMP",
              bw: 20e6, chromaBW: 7e6, lineRate: 33750, fieldLines: 562.5, modulation: "neg" },
};
// Totals where not stated above: 625 / 525 / 405 / 819 [SPEC]
for (const k in STANDARDS) { const s = STANDARDS[k]; if (!s.total) s.total = s.lineRate > 15700 && s.lineRate < 15800 ? 525 : s.lineRate === 15625 ? 625 : s.lineRate === 10125 ? 405 : s.lineRate === 20475 ? 819 : s.lines; }
/* Radiated carrier levels (fraction of peak carrier) [SPEC BT.470-6 Table 3 "Levels in the radiated signal"]:
 * negative modulation: sync 100%, blanking 72.5-77.5% (I 76%), peak white ~10-20% (I 20%, B/G/D/K/M 10-12.5%);
 * positive (L, E, F, A): sync ~0, blanking 30%, peak white 100%. Sound carrier offset (MHz) [SPEC]. */
const RF = {
  "PAL-I": [0.76, 0.20, 6.0], "625-MONO": [0.76, 0.20, 6.0], "PAL-BG": [0.75, 0.11, 5.5], "SECAM-BG": [0.75, 0.11, 5.5],
  "SECAM-DK": [0.75, 0.11, 6.5], "625-DK-MONO": [0.75, 0.11, 6.5], "NTSC-M": [0.75, 0.125, 4.5], "NTSC-J": [0.75, 0.125, 4.5],
  "525-MONO": [0.75, 0.125, 4.5], "PAL-M": [0.75, 0.125, 4.5], "PAL-N": [0.75, 0.125, 4.5], "PAL-60": [0.76, 0.2, 6.0], "NTSC-443": [0.76, 0.2, 6.0],
  "SECAM-L": [0.30, 1.0, 6.5], "405-A": [0.30, 1.0, -3.5], "819-E": [0.30, 1.0, 11.15], "819-F": [0.30, 1.0, 5.5],
};

function geometry(stdName) {
  const s = STANDARDS[stdName];
  if (!s) throw new Error("unknown standard " + stdName);
  const nLine = Math.round(s.tLine * s.fs);
  const a0 = Math.round((s.sync + s.back) * s.fs);
  const ns = Math.round(s.active * s.fs);
  const rf = RF[stdName] || (s.modulation === "pos" ? [0.30, 1.0, 0] : [0.75, 0.15, 0]); // [EST] for the pre-war systems
  return Object.assign({ name: stdName, nLine, a0, ns, rfBlank: rf[0], rfWhite: rf[1], soundMHz: rf[2] }, s);
}
// Filter transition width that suits the bandwidth (the fixed MHz widths were written for broadcast standards)
function tw(bw, t) { return Math.min(t, 0.45 * bw); }

/* ------------------------------------------------------------------ helpers */
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussRand(rnd) {
  let u = 0; while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

// Absolute (time-order) line number for frame row r in an interlaced frame.
// Field 1 = even rows, field 2 = odd rows. Field 2 starts half a frame later.
function absLine(r, g) {
  if (g.progressive) return r;
  const f = r & 1, k = r >> 1;
  return f === 0 ? k : Math.ceil(g.fieldLines) + k;
}

/* ------------------------------------------------------------------ FIR design */
// Windowed-sinc low-pass. cutoff and fs in Hz. Blackman window.
function sincLP(fc, fs, taps) {
  if (taps % 2 === 0) taps++;
  const h = new Float64Array(taps), m = (taps - 1) / 2, w = fc / fs;
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const n = i - m;
    const s = n === 0 ? 2 * w : Math.sin(2 * Math.PI * w * n) / (Math.PI * n);
    const win = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (taps - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (taps - 1));
    h[i] = s * win; sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  return h;
}
function firResponse(h, f, fs) {
  const m = (h.length - 1) / 2; let re = 0, im = 0;
  for (let i = 0; i < h.length; i++) { const p = -2 * Math.PI * f / fs * (i - m); re += h[i] * Math.cos(p); im += h[i] * Math.sin(p); }
  return Math.hypot(re, im);
}
// Low-pass whose response is exactly -3 dB at f3 (found by bisection on the sinc cutoff).
// transition: approx. width (Hz) of the roll-off; sets the tap count. [EST: filter shape]
const lpCache = new Map();
function lp3dB(f3, fs, transition) {
  transition = transition || Math.max(0.6 * f3, 0.4e6);
  const key = f3 + "|" + fs + "|" + transition;
  if (lpCache.has(key)) return lpCache.get(key);
  let taps = Math.round(5.5 * fs / transition); taps = clamp(taps, 7, 255);
  let lo = f3 * 0.5, hi = Math.min(f3 * 2, fs * 0.49), h = null;
  for (let it = 0; it < 40; it++) {
    const mid = 0.5 * (lo + hi); h = sincLP(mid, fs, taps);
    if (firResponse(h, f3, fs) < Math.SQRT1_2) lo = mid; else hi = mid;
  }
  h = Float32Array.from(sincLP(0.5 * (lo + hi), fs, taps));
  lpCache.set(key, h);
  return h;
}
// Convolve n samples: src[so..so+n) -> dst[do_..do_+n), edges extended. Fast path via a padded scratch buffer.
let padBuf = new Float32Array(4096);
function conv(src, so, dst, do_, n, h) {
  const L = h.length, m = (L - 1) >> 1, need = n + L;
  if (padBuf.length < need) padBuf = new Float32Array(need * 2);
  const p = padBuf, first = src[so], last = src[so + n - 1];
  for (let i = 0; i < m; i++) p[i] = first;
  for (let i = 0; i < n; i++) p[m + i] = src[so + i];
  for (let i = 0; i < m + 1; i++) p[m + n + i] = last;
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = 0; k < L; k++) acc += h[k] * p[i + k];
    dst[do_ + i] = acc;
  }
}
// Back-compatible helper: whole line at offset off, src and dst indexed with the same offset.
function convLine(src, dst, off, n, h) { conv(src, off, dst, off, n, h); }
// Filter every row of a buffer (width w, rows nl) in place.
function filterRows(buf, w, nl, h) {
  for (let r = 0; r < nl; r++) conv(buf, r * w, buf, r * w, w, h);
}
// First-order shelf filter (bilinear transform) H(s) = (1 + s/wz)/(1 + s/wp); used for SECAM LF pre/de-emphasis.
function shelfCoeffs(fz, fp, fs) {
  const K = 2 * fs; // bilinear, no prewarp (frequencies are far below fs)
  const wz = 2 * Math.PI * fz, wp = 2 * Math.PI * fp;
  // H(s) = (wp/wz) * (s + wz)/(s + wp)
  const g = wp / wz;
  const b0 = g * (K + wz), b1 = g * (wz - K), a0 = K + wp, a1 = wp - K;
  return { b0: b0 / a0, b1: b1 / a0, a1: a1 / a0 };
}
function iir1(x, off, n, c) {
  let x1 = x[off], y1 = x[off]; // start at steady state of first sample
  const g0 = (c.b0 + c.b1) / (1 + c.a1); y1 = g0 * x1;
  for (let i = 0; i < n; i++) {
    const xi = x[off + i];
    const y = c.b0 * xi + c.b1 * x1 - c.a1 * y1;
    x1 = xi; y1 = y; x[off + i] = y;
  }
}

/* ------------------------------------------------------------------ colour matrices */
// Y' = 0.299R' + 0.587G' + 0.114B' [SPEC]. U = 0.493(B'-Y'), V = 0.877(R'-Y') [SPEC BT.470-6 2.5]
function rgbToYUV(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return [y, 0.493 * (b - y), 0.877 * (r - y)];
}
function yuvToRGB(y, u, v) {
  const by = u / 0.493, ry = v / 0.877;
  const gy = -(0.299 * ry + 0.114 * by) / 0.587;
  return [y + ry, y + gy, y + by];
}
// NTSC I/Q are U/V rotated by 33°: I = -0.27(B'-Y') + 0.74(R'-Y'), Q = 0.41(B'-Y') + 0.48(R'-Y') [SPEC]
const C33 = Math.cos(33 * Math.PI / 180), S33 = Math.sin(33 * Math.PI / 180);
function uvToIQ(u, v) { return [-u * S33 + v * C33, u * C33 + v * S33]; }
function iqToUV(i, q) { return [-i * S33 + q * C33, i * C33 + q * S33]; }

/* ------------------------------------------------------------------ picture container */
// A picture on the standard's grid: three Float32 planes (R', G', B' or Y, U, V), ns x lines.
function makePlanes(ns, nl) { return [new Float32Array(ns * nl), new Float32Array(ns * nl), new Float32Array(ns * nl)]; }

/* ------------------------------------------------------------------ ENCODER */
/* opts: { chromaFilter: 'spec'|'none', ntscIQ: true|false (true = I 1.3 MHz / Q narrow; false = equiband 1.3 MHz) }
 * Returns { sig: Float32Array(nLine*lines), g }.  Signal units: 0 = blanking/black, 1 = white (700 mV), sync -0.43.
 */
function encode(rgb, stdName, opts) {
  opts = opts || {};
  const g = geometry(stdName);
  const { nLine, a0, ns, lines } = g;
  const sig = new Float32Array(nLine * lines);
  const n = ns * lines;
  const Y = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = rgbToYUV(rgb[0][i], rgb[1][i], rgb[2][i]); Y[i] = t[0]; U[i] = t[1]; V[i] = t[2];
  }
  // Luma band-limited to the system video bandwidth [SPEC]. Transition 0.6 MHz [EST].
  const hY = lp3dB(g.bw, g.fs, tw(g.bw, 0.8e6));
  filterRows(Y, ns, lines, hY);
  const setup = g.setup || 0;
  const syncLvl = -0.43; // 300 mV sync on 700 mV picture [SPEC-ish, 7:3]
  const nSync = Math.round(g.sync * g.fs);
  // lay down blanking + sync + luma
  for (let r = 0; r < lines; r++) {
    const o = r * nLine;
    for (let i = 0; i < nSync; i++) sig[o + i] = syncLvl;
    for (let i = 0; i < ns; i++) sig[o + a0 + i] = setup + (1 - setup) * Y[r * ns + i];
  }
  if (g.colour === "MONO" || g.colour === "COMP") return { sig, g, comp: g.colour === "COMP" ? [Y, U, V] : null };

  if (g.colour === "PAL" || g.colour === "NTSC") {
    // Chroma low-pass: PAL U,V < 3 dB at 1.3 MHz [SPEC]; NTSC I < 3 dB at 1.3 MHz, Q < 2 dB at 0.4, < 6 dB at 0.5 [SPEC]
    if (opts.chromaFilter !== "none") {
      if (g.colour === "NTSC" && opts.ntscIQ !== false) {
        // rotate to I/Q, filter I at 1.3 MHz and Q at ~0.55 MHz (-3 dB; lands inside the Q mask), rotate back
        for (let i = 0; i < n; i++) { const iq = uvToIQ(U[i], V[i]); U[i] = iq[0]; V[i] = iq[1]; }
        filterRows(U, ns, lines, lp3dB(1.3e6, g.fs, 1.2e6));
        filterRows(V, ns, lines, lp3dB(0.55e6, g.fs, 0.35e6));
        for (let i = 0; i < n; i++) { const uv = iqToUV(U[i], V[i]); U[i] = uv[0]; V[i] = uv[1]; }
      } else {
        const hC = lp3dB(g.chromaBW * 1.04, g.fs, 1.2e6); // design margin: spec is "< 3 dB at 1.3 MHz"
        filterRows(U, ns, lines, hC); filterRows(V, ns, lines, hC);
      }
    }
    // Modulate. Sampling is 4 x fsc so each sample advances the subcarrier by 90 degrees.
    const cyclesPerLine = g.fsc * g.tLine; // PAL 283.7516, NTSC 227.5
    const burstStart = Math.round((g.colour === "PAL" ? 5.6e-6 : 5.3e-6) * g.fs);
    const burstLen = Math.round((g.colour === "PAL" ? 2.25e-6 : 2.5e-6) * g.fs);
    const burstAmp = g.colour === "PAL" ? 0.215 : 0.2; // half of 300 mV p-p / 700; NTSC 40 IRE p-p [SPEC]
    for (let r = 0; r < lines; r++) {
      const L = absLine(r, g), o = r * nLine;
      const ph0 = 2 * Math.PI * ((cyclesPerLine * L) % 1);
      const vs = (g.colour === "PAL" && (L & 1)) ? -1 : 1; // PAL V switch [SPEC]
      // burst: PAL at 180 +/- 45 deg (swinging), NTSC at 180 deg relative to B-Y [SPEC]
      const bph = g.colour === "PAL" ? Math.PI + vs * Math.PI / 4 : Math.PI;
      for (let i = 0; i < burstLen; i++) {
        const s = burstStart + i, ph = ph0 + s * Math.PI / 2;
        sig[o + s] += burstAmp * Math.sin(ph + bph);
      }
      for (let i = 0; i < ns; i++) {
        const s = a0 + i, ph = ph0 + s * Math.PI / 2, k = r * ns + i;
        sig[o + s] += U[k] * Math.sin(ph) + vs * V[k] * Math.cos(ph);
      }
    }
    return { sig, g };
  }

  if (g.colour === "SECAM") return encodeSECAM(sig, g, Y, U, V, opts);
  throw new Error("colour system?");
}

/* SECAM [SPEC BT.470-6 Table 2]:
 * D'R = -1.902(R'-Y'), D'B = 1.505(B'-Y'); alternate lines.
 * f0R = 4.40625 MHz, f0B = 4.25 MHz; nominal deviation 280 kHz (R), 230 kHz (B); limits +350/-506 kHz (R), -350/+506 (B).
 * LF pre-emphasis A(f) = (1 + jf/f1)/(1 + jf/3f1), f1 = 85 kHz.
 * HF bell: G = M0 (1 + j16F)/(1 + j1.26F), F = f/f0 - f0/f, f0 = 4.286 MHz; 2*M0 = 23% of luminance amplitude.
 * Line phase: 0, 0, 180 deg sequence, inverted field to field.
 */
const SECAM = { f0R: 4406250, f0B: 4250000, devR: 280e3, devB: 230e3, bell0: 4286e3, M0: 0.115, f1: 85e3 };
function secamLineIsR(L) { return (L & 1) === 0; } // which line carries D'R: identification signals define it; parity choice [EST]
function encodeSECAM(sig, g, Y, U, V, opts) {
  const { nLine, a0, ns, lines, fs } = g;
  // colour-difference, band-limit (≤ 3 dB at 1.3 MHz) [SPEC]
  const DR = new Float32Array(ns * lines), DB = new Float32Array(ns * lines);
  for (let i = 0; i < ns * lines; i++) { DR[i] = -1.902 * (V[i] / 0.877); DB[i] = 1.505 * (U[i] / 0.493); }
  const hC = lp3dB(1.3e6, fs, 1.0e6);
  filterRows(DR, ns, lines, hC); filterRows(DB, ns, lines, hC);
  const pre = shelfCoeffs(SECAM.f1, 3 * SECAM.f1, fs);
  const line = new Float32Array(ns);
  const bellStart = Math.round(5.7e-6 * fs), bellEnd = a0 + ns + Math.round(1.0e-6 * fs); // subcarrier present after sync incl. back porch [SEC]
  for (let r = 0; r < lines; r++) {
    const L = absLine(r, g), o = r * nLine, isR = secamLineIsR(L);
    const D = isR ? DR : DB;
    for (let i = 0; i < ns; i++) line[i] = D[r * ns + i];
    iir1(line, 0, ns, pre);
    const f0 = isR ? SECAM.f0R : SECAM.f0B, dev = isR ? SECAM.devR : SECAM.devB;
    const lo = isR ? -506e3 : -350e3, hi = isR ? 350e3 : 506e3;
    const field = r & 1;
    const lineSeq = Math.floor(L % 3) === 2 ? Math.PI : 0;
    let ph = lineSeq + (field ? Math.PI : 0);
    for (let s = bellStart; s < bellEnd && s < nLine; s++) {
      const i = s - a0;
      let d = (i >= 0 && i < ns) ? line[i] * dev : 0;
      d = clamp(d, lo, hi);
      const f = f0 + d;
      ph += 2 * Math.PI * f / fs;
      const F = f / SECAM.bell0 - SECAM.bell0 / f;
      const amp = SECAM.M0 * Math.hypot(1, 16 * F) / Math.hypot(1, 1.26 * F);
      // phase of the bell filter is ignored (quasi-static amplitude weighting) [EST]
      sig[o + s] += amp * Math.cos(ph);
    }
  }
  return { sig, g };
}

/* ------------------------------------------------------------------ CHANNEL */
/* ---------------- the full-time stream (active lines plus the field-blanking interval) ---------------- */
// Field layout: lines per field, blanking lines per field, active rows per field.
function fieldLayout(g) {
  if (g.progressive) return { f1: g.total, f2: 0, v1: g.total - g.lines, v2: 0, rows1: g.lines, rows2: 0 };
  const f1 = Math.ceil(g.total / 2), f2 = g.total - f1, rows1 = Math.ceil(g.lines / 2), rows2 = g.lines - rows1;
  return { f1, f2, v1: f1 - rows1, v2: f2 - rows2, rows1, rows2 };
}
// Stream (time-order) line index of frame row r
function streamLine(r, g, lay) {
  lay = lay || fieldLayout(g);
  if (g.progressive) return lay.v1 + r;
  return (r & 1) === 0 ? lay.v1 + (r >> 1) : lay.f1 + lay.v2 + (r >> 1);
}
// Build the time-continuous signal: blanking lines carry line sync; three lines per field carry broad pulses (field sync)
// [SPEC BT.470-6 Tables 1-1/1-2, simplified: equalising pulses omitted]
function buildStream(enc) {
  const g = enc.g, { nLine, lines } = g, lay = fieldLayout(g), T = g.total;
  const S = new Float32Array(T * nLine);
  const nSync = Math.round(g.sync * g.fs), half = nLine >> 1, broad = Math.round(g.tLine * 0.43 * g.fs);
  const vb = g.progressive ? [[0, lay.v1]] : [[0, lay.v1], [lay.f1, lay.v2]];
  for (const [st, len] of vb) for (let k = 0; k < len; k++) {
    const o = (st + k) * nLine;
    if (k >= 2 && k < 5) for (let i = 0; i < broad; i++) { S[o + i] = -0.43; S[o + half + i] = -0.43; }
    else for (let i = 0; i < nSync; i++) S[o + i] = -0.43;
  }
  for (let r = 0; r < lines; r++) { const sl = streamLine(r, g, lay); S.set(enc.sig.subarray(r * nLine, r * nLine + nLine), sl * nLine); }
  return S;
}
function streamToRows(S, enc) {
  const g = enc.g, { nLine, lines } = g, lay = fieldLayout(g);
  for (let r = 0; r < lines; r++) { const sl = streamLine(r, g, lay); enc.sig.set(S.subarray(sl * nLine, sl * nLine + nLine), r * nLine); }
}
// Video level <-> radiated carrier envelope (fraction of peak carrier), linear between blanking and peak white [SPEC BT.470-6 Table 3]
function toEnv(v, g) { return g.rfBlank + (g.rfWhite - g.rfBlank) * v; }
function fromEnv(e, g) { return (e - g.rfBlank) / (g.rfWhite - g.rfBlank); }

/* Canal+ Discret 11 (4 Nov 1984): each line's picture is delayed by 0, 902 or 1804 ns, chosen per line from an 11-bit
 * pseudo-random sequence, the gap at the left filled with black; sync and colour reference untouched [SEC fabiensanglard.net/discret11].
 * The exact generator polynomial is not reproduced: this uses its own 11-bit sequence [EST]. */
function discret11(enc, seed) {
  const g = enc.g, { nLine, lines, fs, a0, ns } = g;
  const d = [0, Math.round(902e-9 * fs), Math.round(1804e-9 * fs)];
  let lf = (((seed || 1) * 1103) & 0x7ff) || 1;
  const tmp = new Float32Array(ns), order = Array.from({ length: lines }, (_, r) => r).sort((a, b) => absLine(a, g) - absLine(b, g));
  for (const r of order) {
    for (let k = 0; k < 3; k++) { const bit = ((lf >> 10) ^ (lf >> 8)) & 1; lf = ((lf << 1) | bit) & 0x7ff; }
    const k = d[lf % 3], o = r * nLine + a0;
    for (let i = 0; i < ns; i++) tmp[i] = i < k ? 0 : enc.sig[o + i - k];
    enc.sig.set(tmp, o);
  }
}

/* CHANNEL. opts: { snrDb, ghosts:[{delayUs, amp, phaseDeg}], impulses (per line probability), txBandwidth, seed, rxBandwidth,
 *   route 'sat_fm' + cnrDb, scramble 'discret11',
 *   interferer: enc of a second picture, cochannel: { ratio (carrier ratio), offsetHz, dx (fraction of a line), dy (fraction of a frame) },
 *   rx: geometry of the receiving set's standard (default: the same), overload (0..1, strong-signal "lockout"), soundBeat }
 * Everything happens on the time-continuous stream, so echoes and the interfering picture carry their blanking with them.
 * Noise is scaled so that its rms inside the video band equals 10^(-snr/20) of black-to-white. [EST: CNR ≈ video SNR, strand B] */
function hilbertKernel(taps) {
  if (taps % 2 === 0) taps++;
  const h = new Float32Array(taps), m = (taps - 1) / 2;
  for (let i = 0; i < taps; i++) {
    const n = i - m;
    const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (taps - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (taps - 1));
    h[i] = (n % 2 === 0) ? 0 : (2 / (Math.PI * n)) * w;
  }
  return h;
}
function channel(enc, opts) {
  opts = opts || {};
  const g = enc.g, { nLine, fs } = g, T = g.total;
  if (opts.scramble === "discret11") discret11(enc, opts.seed);
  const S = buildStream(enc), N = S.length;
  // transmitter band-limit (the vestigial-sideband system passes 0..bw) [SPEC]
  const bw = opts.txBandwidth || g.bw;
  filterRows(S, nLine, T, lp3dB(bw, fs, tw(bw, 0.5e6)));
  // ghosts: echoes of the continuous signal (the previous line's sync and blanking appear at the left) [SEC strand B]
  if (opts.ghosts && opts.ghosts.length) {
    const tl = Float32Array.from(S), hil = hilbertKernel(31), hm = 15;
    for (const gh of opts.ghosts) {
      const d = Math.round(gh.delayUs * 1e-6 * fs);
      const c = Math.cos(gh.phaseDeg * Math.PI / 180) * gh.amp, q = Math.sin(gh.phaseDeg * Math.PI / 180) * gh.amp;
      for (let i = 0; i < N; i++) {
        const j = i - d; if (j < 0 || j >= N) continue;
        let v = c * tl[j];
        if (q !== 0) { let hv = 0; for (let k = 0; k < hil.length; k++) { const jj = j + k - hm; if (jj >= 0 && jj < N) hv += hil[k] * tl[jj]; } v += q * hv; }
        S[i] += v;
      }
    }
  }
  const rnd = mulberry32((opts.seed || 1) >>> 0);
  const rx = opts.rx || g;
  if (opts.snrDb !== undefined && opts.snrDb !== null && opts.snrDb < 80) {
    const rms = Math.pow(10, -opts.snrDb / 20), sigma = rms * Math.sqrt((fs / 2) / bw);
    for (let i = 0; i < N; i++) S[i] += sigma * gaussRand(rnd);
    const rb = opts.rxBandwidth || Math.max(bw, rx.bw || bw); // the receiver's IF and video filtering limits the noise
    filterRows(S, nLine, T, lp3dB(rb, fs, tw(rb, 0.5e6)));
  }
  if (opts.route === "sat_fm") {
    // FM satellite link (Sky on Astra, PAL over FM): noise rises with frequency after de-emphasis, and below threshold
    // short bright/dark "sparklies" appear [EST: mechanism standard FM theory; amounts not researched]
    const cnr = opts.cnrDb !== undefined ? opts.cnrDb : 14, excess = Math.max(0, 11 - cnr);
    const tri = new Float32Array(N); for (let i = 0; i < N; i++) tri[i] = gaussRand(rnd);
    const lo = Float32Array.from(tri); filterRows(lo, nLine, T, lp3dB(1.5e6, fs, 1.0e6));
    const sgm = Math.pow(10, -(cnr + 26) / 20);
    for (let i = 0; i < N; i++) S[i] += sgm * 2.2 * (tri[i] - 0.8 * lo[i]);
    const p = excess * 0.004;
    for (let i = 0; i < N; i++) if (rnd() < p / 40) { const len = 2 + (rnd() * 6 | 0), a = (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd()); for (let k = 0; k < len && i + k < N; k++) S[i + k] += a * (1 - k / len); }
  }
  if (opts.impulses) {
    // impulse (ignition etc.) noise raises the carrier: white spots on positive-modulation systems, dark on negative [OBS strand B]
    const pol = g.modulation === "pos" ? 1 : -1;
    for (let k = 0; k < T; k++) {
      if (rnd() > opts.impulses) continue;
      const s = k * nLine + Math.floor(rnd() * nLine), len = 2 + Math.floor(rnd() * 0.3e-6 * fs), a = 0.5 + rnd();
      for (let i = 0; i < len && s + i < N; i++) S[s + i] += pol * a;
    }
  }
  // RF stage: co-channel interference, overload and a set built for another standard all act on the carrier envelope
  const co = opts.cochannel && opts.cochannel.ratio > 0 && opts.interferer ? opts.cochannel : null;
  const mismatch = rx.name !== g.name && (rx.rfBlank !== g.rfBlank || rx.rfWhite !== g.rfWhite || rx.soundMHz !== g.soundMHz);
  if (co || mismatch || opts.overload) {
    const E = new Float32Array(N);
    for (let i = 0; i < N; i++) E[i] = Math.max(0, toEnv(S[i], g));
    if (co) {
      // two carriers on the same channel, offset by a few kHz: the detected envelope is |E1 + E2 e^{j2π Δf t}|, so the weaker
      // picture shows through with its own sync and blanking wherever it happens to fall, striped by the offset beat
      // ("patterning"; offsets identified the stations) [SEC Bunney 1981]; the carrier ratio and offset are the user's
      const g2 = opts.interferer.g, S2 = buildStream(opts.interferer);
      filterRows(S2, nLine, T, lp3dB(bw, fs, tw(bw, 0.5e6)));
      const N2 = S2.length, off = Math.round((co.dy !== undefined ? co.dy : 0.37) * T) * nLine + Math.round((co.dx !== undefined ? co.dx : 0.31) * nLine);
      const w = 2 * Math.PI * (co.offsetHz || 10e3) / fs, ph0 = rnd() * 6.283;
      for (let i = 0; i < N; i++) {
        const e2 = co.ratio * Math.max(0, toEnv(S2[((i + off) % N2 + N2) % N2], g2)), th = w * i + ph0, e1 = E[i];
        E[i] = Math.sqrt(Math.max(0, e1 * e1 + e2 * e2 + 2 * e1 * e2 * Math.cos(th)));
      }
    }
    if (opts.overload) {
      // strong-signal overload: an IF stage driven past its limit loses gain on the biggest carrier levels, which on a
      // negative-modulation set crushes the sync tips below the picture ("lockout, i.e. negative picture and buzz",
      // Television, July 1976). Curve shape and amount [EST]
      // modelled as a fold: carrier above the stage's limit c comes out lower, so dark areas and sync turn light [EST]
      const c = 0.9 - 0.4 * Math.min(1, opts.overload);
      for (let i = 0; i < N; i++) { const e = E[i]; E[i] = e <= c ? e : Math.max(0, c - 3 * (e - c)); }
    }
    // the set's AGC holds the largest sustained carrier level at 100% (sync tips on negative sets, whites on positive) [EST form]
    let peak = 0; { const step = Math.max(1, Math.floor(N / 200000)), sample = []; for (let i = 0; i < N; i += step) sample.push(E[i]); sample.sort((a, b) => a - b); peak = sample[Math.floor(sample.length * 0.97)] || 1; } // ~top 3%: the sync tips (7% of the time) on a normal signal, averaging out beat peaks
    for (let i = 0; i < N; i++) { const v = fromEnv(E[i] / peak, rx); S[i] = v < -0.7 ? -0.7 : (v > 1.6 ? 1.6 : v); }
    // a set tuned for another standard leaves the other system's sound carrier in the picture at its offset (e.g. 5.5 MHz
    // G/H sound on a 6 MHz System I set) [SEC Bunney 1981: patterning]; amplitude [EST]
    const sb = opts.soundBeat !== undefined ? opts.soundBeat : (mismatch && g.soundMHz !== rx.soundMHz ? 0.04 : 0);
    if (sb && g.soundMHz > 0 && g.soundMHz * 1e6 < fs / 2) { const ws = 2 * Math.PI * g.soundMHz * 1e6 / fs; for (let i = 0; i < N; i++) S[i] += sb * Math.cos(ws * i); }
  }
  streamToRows(S, enc);
  enc.stream = S;
  return enc;
}

/* HOLD: the receiver's timebases. A sync separator slices the video at half sync amplitude; a flywheel line oscillator
 * follows it through a sawtooth phase detector; a field oscillator locks to the broad pulses or free-runs, rolling the picture.
 * A clean signal locks and changes nothing. Wrong polarity, heavy noise or a stronger interfering picture pull the line
 * oscillator about (tearing) and leave the field oscillator free (rolling), as on a real set [mechanism: standard receiver
 * design; loop gain, drift and slicing level EST].
 * o: { hGain (0..1), hFree (samples of drift per line when unlocked), vRoll (null = auto, else 0..1 of a frame), seed } */
function hold(enc, o) {
  o = o || {};
  const g = enc.g, { nLine, lines, fs } = g, T = g.total, lay = fieldLayout(g);
  const S = enc.stream || buildStream(enc), N = S.length;
  const sb = Math.min(1.0e6, g.bw), Ls = Float32Array.from(S); filterRows(Ls, nLine, T, lp3dB(sb, fs, tw(sb, 0.5e6)));
  const thr = -0.215, nSync = Math.max(1, Math.round(g.sync * fs)), half = nLine >> 1;
  const rnd = mulberry32(((o.seed || 1) * 6007) >>> 0);
  const isVBI = new Uint8Array(T); { const vb = g.progressive ? [[0, lay.v1]] : [[0, lay.v1], [lay.f1, lay.v2]]; for (const [st, len] of vb) for (let k = 0; k < len; k++) isVBI[st + k] = 1; }
  const gain = o.hGain !== undefined ? o.hGain : 0.05, drift = o.hFree || 0; // flywheel time constant ~20 lines [EST]
  const phase = new Float32Array(T);
  let ph = 0;
  // run two frames so the loop settles, keep the second
  for (let pass = 0; pass < 2; pass++) for (let k = 0; k < T; k++) {
    if (pass === 1) phase[k] = ph;
    let err = 0;
    if (!isVBI[k] && nSync > 1) {
      const c = k * nLine + Math.round(ph) + (nSync >> 1);
      for (let s = -half; s < half; s++) { let idx = (c + s) % N; if (idx < 0) idx += N; if (Ls[idx] < thr) err += s; }
      err /= nSync;
      const lim = nLine / 12; err = err > lim ? lim : (err < -lim ? -lim : err);
    }
    ph += drift + gain * err;
    if (ph > nLine) ph -= nLine; else if (ph < -nLine) ph += nLine;
  }
  // field hold: locked if broad pulses are found where expected, otherwise free-running (picture rolls)
  let roll = 0;
  if (o.vRoll !== undefined && o.vRoll !== null) roll = o.vRoll;
  else {
    let found = 0, spurious = 0;
    for (let k = 0; k < T; k++) { let c = 0; for (let s = 0; s < nLine; s += 3) if (Ls[k * nLine + s] < thr) c++; const f = c * 3 / nLine; if (f > 0.5) { if (isVBI[k]) found++; else spurious++; } }
    if (found < (g.progressive ? 2 : 4) || spurious > T * 0.02) roll = 0.15 + 0.7 * rnd();
  }
  const R = Math.round(roll * (g.progressive ? T : T / 2)); // a free field oscillator slips by whole fields' worth over time: offset within one field
  const rowOf = new Int32Array(T).fill(-1); for (let r = 0; r < lines; r++) rowOf[streamLine(r, g, lay)] = r;
  const out = new Float32Array(lines * nLine), rowLine = new Int32Array(lines), rowShift = new Float32Array(lines);
  for (let r = 0; r < lines; r++) {
    const sl = (streamLine(r, g, lay) + R) % T, st = sl * nLine + phase[sl], i0 = Math.floor(st), f = st - i0;
    for (let j = 0; j < nLine; j++) { let a = (i0 + j) % N; if (a < 0) a += N; const b = (a + 1) % N; out[r * nLine + j] = S[a] * (1 - f) + S[b] * f; }
    rowLine[r] = rowOf[sl] >= 0 ? absLine(rowOf[sl], g) : sl;
    rowShift[r] = phase[sl];
  }
  enc.sig = out; enc.rowLine = rowLine; enc.rowShift = rowShift; enc.roll = roll;
  return enc;
}

/* ------------------------------------------------------------------ DECODER */
/* opts:
 *  separation: 'notch' | 'comb1H' | 'comb2H' | 'lowpass' | 'none' (mono set shows subcarrier dots)
 *  palMode: 'delay' (PAL-D) | 'simple' (PAL-S)
 *  ntscDemod: 'IQ' | 'equiband'   (equiband bandwidth: equibandBW Hz, default 0.55 MHz [OBS])
 *  phaseErr (deg, static), diffPhase (deg across black->white), diffGain (fraction),
 *  lumaBW (receiver luma bandwidth, Hz; default = standard), chromaGain, hueDeg (NTSC tint)
 * Returns planes [R', G', B'] on the ns x lines grid.
 */
function decode(enc, opts) {
  opts = opts || {};
  const g = enc.g, { nLine, a0, ns, lines, fs } = g;
  const sig = enc.sig, n = ns * lines;
  const setup = g.setup || 0;
  const Y = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
  const tmp = new Float32Array(nLine);

  if (opts.mono && g.colour !== "MONO" && g.colour !== "COMP") {
    // colour killer (no burst the set recognises, e.g. SECAM or a negative picture on a PAL set): the set's notch at its own
    // subcarrier stays in the luma path and the picture is shown in black and white [SEC ETD 1983 / standard receiver design]
    const f0 = opts.notchHz || 4433618.75;
    const hN = bandpassAt(lp3dB(1.0e6, fs, 0.8e6), f0, fs), hL = lp3dB(opts.lumaBW || g.bw, fs, tw(opts.lumaBW || g.bw, 0.8e6));
    const line = new Float32Array(nLine), bp = new Float32Array(nLine);
    for (let r = 0; r < lines; r++) {
      for (let i = 0; i < nLine; i++) line[i] = sig[r * nLine + i];
      convLine(line, bp, 0, nLine, hN); for (let i = 0; i < nLine; i++) line[i] -= bp[i];
      convLine(line, tmp, 0, nLine, hL);
      for (let i = 0; i < ns; i++) Y[r * ns + i] = (tmp[a0 + i] - setup) / (1 - setup);
    }
    return toRGB(Y, null, null, n);
  }
  if (g.colour === "MONO" || opts.separation === "none" && g.colour !== "COMP") {
    // monochrome receiver: whole signal to the tube, low-passed by the set's video amplifier
    const hL = lp3dB(opts.lumaBW || g.bw, fs, tw(opts.lumaBW || g.bw, 0.8e6));
    const line = new Float32Array(nLine);
    for (let r = 0; r < lines; r++) {
      for (let i = 0; i < nLine; i++) line[i] = sig[r * nLine + i];
      convLine(line, tmp, 0, nLine, hL);
      for (let i = 0; i < ns; i++) Y[r * ns + i] = (tmp[a0 + i] - setup) / (1 - setup);
    }
    return toRGB(Y, null, null, n);
  }
  if (g.colour === "COMP") {
    const cY = enc.comp[0], cU = enc.comp[1], cV = enc.comp[2];
    return toRGB(cY, cU, cV, n);
  }
  if (g.colour === "SECAM") return decodeSECAM(enc, opts);

  const sep = opts.separation || "notch";
  const L0 = new Float32Array(nLine);
  const C = new Float32Array(nLine * lines); // chroma band signal
  const Yf = new Float32Array(nLine * lines);
  // 1) luma/chroma separation
  const lumaBW = opts.lumaBW || g.bw;
  const hLumaSet = lp3dB(lumaBW, fs, tw(lumaBW, 0.8e6));
  const hBP = bandpassAt4fsc(lp3dB(1.3e6, fs, 1.0e6)); // chroma band-pass centred on fsc, ±1.3 MHz
  for (let r = 0; r < lines; r++) {
    const o = r * nLine;
    for (let i = 0; i < nLine; i++) L0[i] = sig[o + i];
    if (sep === "notch" || sep === "lowpass") {
      convLine(L0, tmp, 0, nLine, hBP);
      for (let i = 0; i < nLine; i++) { C[o + i] = tmp[i]; Yf[o + i] = L0[i] - tmp[i]; }
      if (sep === "lowpass") { // cheap sets: simple luma low-pass below the subcarrier [EST]
        const hc = lp3dB(Math.min(lumaBW, g.fsc - 1.0e6), fs, 0.6e6);
        for (let i = 0; i < nLine; i++) L0[i] = sig[o + i];
        convLine(L0, tmp, 0, nLine, hc);
        for (let i = 0; i < nLine; i++) Yf[o + i] = tmp[i];
      }
    } else { // comb filters use the line one (NTSC) or two (PAL) lines earlier in the same field
      const back = sep === "comb2H" ? 4 : 2; // frame rows: same field previous line = r-2
      const rp = r - back >= 0 ? r - back : r;
      const op = rp * nLine;
      for (let i = 0; i < nLine; i++) {
        const a = sig[o + i], b = sig[op + i];
        Yf[o + i] = 0.5 * (a + b); C[o + i] = 0.5 * (a - b);
      }
      // comb only on the chroma band: keep low frequencies of the difference in luma (vertical detail) [EST, standard practice]
      for (let i = 0; i < nLine; i++) L0[i] = C[o + i];
      convLine(L0, tmp, 0, nLine, hBP);
      for (let i = 0; i < nLine; i++) { Yf[o + i] += C[o + i] - tmp[i]; C[o + i] = tmp[i]; }
    }
  }
  // set luma bandwidth + peaking handled later (display/set stage)
  for (let r = 0; r < lines; r++) {
    const o = r * nLine;
    for (let i = 0; i < nLine; i++) L0[i] = Yf[o + i];
    convLine(L0, tmp, 0, nLine, hLumaSet);
    for (let i = 0; i < ns; i++) Y[r * ns + i] = (tmp[a0 + i] - setup) / (1 - setup);
  }
  // 2) chroma demodulation (synchronous, reference locked to the burst; errors added explicitly)
  const cyclesPerLine = g.fsc * g.tLine;
  const phaseErr = (opts.phaseErr || 0) * Math.PI / 180;
  const hue = (opts.hueDeg || 0) * Math.PI / 180;
  const dp = (opts.diffPhase || 0) * Math.PI / 180, dg = opts.diffGain || 0;
  const cg = opts.chromaGain === undefined ? 1 : opts.chromaGain;
  const du = new Float32Array(nLine), dv = new Float32Array(nLine);
  let hU, hV, rotateIQ = false;
  if (g.colour === "NTSC") {
    if (opts.ntscDemod === "IQ") { hU = lp3dB(1.3e6, fs, 1.2e6); hV = lp3dB(0.55e6, fs, 0.35e6); rotateIQ = true; }
    else { const b = opts.equibandBW || 0.55e6; hU = hV = lp3dB(b, fs, 0.4e6); } // [OBS strand A/B: ~0.5-0.6 MHz]
  } else { hU = hV = lp3dB(1.3e6, fs, 1.0e6); }
  const Ud = new Float32Array(n), Vd = new Float32Array(n);
  for (let r = 0; r < lines; r++) {
    // after the receiver's hold stage a row may come from another line and start part-way along it (rowLine, rowShift);
    // the decoder's reference follows the burst, so the phase is that of the source line [SPEC receiver practice]
    const L = enc.rowLine ? enc.rowLine[r] : absLine(r, g), o = r * nLine, sh = enc.rowShift ? enc.rowShift[r] : 0;
    const ph0 = 2 * Math.PI * ((cyclesPerLine * L) % 1) + sh * Math.PI / 2;
    const vs = (g.colour === "PAL" && (L & 1)) ? -1 : 1;
    for (let s = 0; s < nLine; s++) {
      // differential phase/gain depend on the luminance level at that point [SEC strand B]
      const yl = s >= a0 && s < a0 + ns ? Y[r * ns + s - a0] : 0;
      const e = phaseErr + dp * yl + (g.colour === "NTSC" ? hue : 0);
      const gain = 2 * cg * (1 + dg * (yl - 0.5));
      const ph = ph0 + s * Math.PI / 2;
      // Chroma C = U sin(ph) + vs V cos(ph); a phase error e rotates the received subcarrier
      const c = C[o + s] * gain;
      du[s] = c * Math.sin(ph - e);
      dv[s] = c * Math.cos(ph - e) * vs;
    }
    convLine(du, tmp, 0, nLine, hU);
    for (let i = 0; i < ns; i++) Ud[r * ns + i] = tmp[a0 + i];
    convLine(dv, tmp, 0, nLine, hU); // I/Q receivers narrow Q after rotation below
    for (let i = 0; i < ns; i++) Vd[r * ns + i] = tmp[a0 + i];
  }
  if (rotateIQ) {
    // true I/Q receiver: rotate the (wide-band) demodulated U/V to I/Q, narrow Q, rotate back
    for (let i = 0; i < n; i++) { const iq = uvToIQ(Ud[i], Vd[i]); Ud[i] = iq[0]; Vd[i] = iq[1]; }
    filterRows(Vd, ns, lines, hV);
    for (let i = 0; i < n; i++) { const uv = iqToUV(Ud[i], Vd[i]); Ud[i] = uv[0]; Vd[i] = uv[1]; }
  }
  // 3) PAL delay line: average this line's U/V with the previous line of the same field (PAL-D) [SEC/SPEC]
  if (g.colour === "PAL" && (opts.palMode || "delay") === "delay") {
    for (let r = 0; r < lines; r++) {
      const rp = r >= 2 ? r - 2 : r;
      for (let i = 0; i < ns; i++) {
        U[r * ns + i] = 0.5 * (Ud[r * ns + i] + Ud[rp * ns + i]);
        V[r * ns + i] = 0.5 * (Vd[r * ns + i] + Vd[rp * ns + i]);
      }
    }
  } else { U.set(Ud); V.set(Vd); }
  // colour killer: if burst is too weak relative to noise, colour switches off (handled by caller via chromaGain) [EST]
  return toRGB(Y, U, V, n);
}
// Turn a low-pass kernel into a band-pass at fsc for 4*fsc sampling: h_bp[k] = 2 h_lp[k] cos(pi/2 * (k-m))
function bandpassAt4fsc(hlp) {
  const m = (hlp.length - 1) / 2, h = new Float32Array(hlp.length);
  for (let k = 0; k < hlp.length; k++) h[k] = 2 * hlp[k] * Math.cos(Math.PI / 2 * (k - m));
  return h;
}
// Band-pass at any centre frequency from a low-pass prototype
function bandpassAt(hlp, f0, fs) {
  const m = (hlp.length - 1) / 2, w0 = 2 * Math.PI * f0 / fs, h = new Float32Array(hlp.length);
  for (let k = 0; k < hlp.length; k++) h[k] = 2 * hlp[k] * Math.cos(w0 * (k - m));
  return h;
}
function toRGB(Y, U, V, n) {
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (!U) { R[i] = G[i] = B[i] = Y[i]; continue; }
    const t = yuvToRGB(Y[i], U[i], V[i]); R[i] = t[0]; G[i] = t[1]; B[i] = t[2];
  }
  return [R, G, B];
}

/* SECAM receiver: luma trap (~3 MHz luma [SEC EBU via strand B]), cloche band-pass, limiter + FM discriminator,
 * LF de-emphasis, line delay repeats the missing colour-difference [SPEC/SEC]. */
function decodeSECAM(enc, opts) {
  const g = enc.g, { nLine, a0, ns, lines, fs } = g, n = ns * lines;
  const sig = enc.sig;
  const Y = new Float32Array(n);
  const Dcur = new Float32Array(n); // demodulated colour difference of each line (R or B depending on the line)
  const line = new Float32Array(nLine), tmp = new Float32Array(nLine);
  const hY = lp3dB(opts.lumaBW || 3.0e6, fs, 1.0e6);
  // cloche: approximate the anti-bell as a band-pass 3.5-5.2 MHz [EST]
  const hBPlp = lp3dB(0.9e6, fs, 0.8e6);
  const m = (hBPlp.length - 1) / 2;
  const w0 = 2 * Math.PI * SECAM.bell0 / fs;
  const hBP = new Float32Array(hBPlp.length);
  for (let k = 0; k < hBPlp.length; k++) hBP[k] = 2 * hBPlp[k] * Math.cos(w0 * (k - m));
  const hIQ = lp3dB(1.2e6, fs, 0.8e6); // after mixing to baseband
  const de = shelfCoeffs(3 * SECAM.f1, SECAM.f1, fs); // inverse of the pre-emphasis
  const I = new Float32Array(nLine), Q = new Float32Array(nLine), Ib = new Float32Array(nLine), Qb = new Float32Array(nLine);
  const dline = new Float32Array(ns);
  for (let r = 0; r < lines; r++) {
    const o = r * nLine, L = enc.rowLine ? enc.rowLine[r] : absLine(r, g), isR = secamLineIsR(L);
    for (let i = 0; i < nLine; i++) line[i] = sig[o + i];
    convLine(line, tmp, 0, nLine, hY);
    for (let i = 0; i < ns; i++) Y[r * ns + i] = tmp[a0 + i];
    convLine(line, tmp, 0, nLine, hBP);
    // limiter + quadrature discriminator: mix down with the nominal carrier, measure phase slope
    const f0 = isR ? SECAM.f0R : SECAM.f0B, dev = isR ? SECAM.devR : SECAM.devB;
    for (let s = 0; s < nLine; s++) {
      const p = 2 * Math.PI * f0 * s / fs;
      I[s] = tmp[s] * Math.cos(p); Q[s] = -tmp[s] * Math.sin(p);
    }
    convLine(I, Ib, 0, nLine, hIQ); convLine(Q, Qb, 0, nLine, hIQ);
    let prev = Math.atan2(Qb[a0 - 1], Ib[a0 - 1]);
    for (let i = 0; i < ns; i++) {
      const s = a0 + i, a = Math.atan2(Qb[s], Ib[s]);
      let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
      prev = a;
      dline[i] = (d * fs / (2 * Math.PI)) / dev; // frequency deviation -> D'
    }
    // smooth the discriminator output to the chroma band and de-emphasise
    iir1(dline, 0, ns, de);
    for (let i = 0; i < ns; i++) Dcur[r * ns + i] = dline[i];
  }
  // post-demodulation low-pass (colour band ~1.3 MHz)
  filterRows(Dcur, ns, lines, lp3dB(1.3e6, fs, 1.0e6));
  const U = new Float32Array(n), V = new Float32Array(n);
  for (let r = 0; r < lines; r++) {
    const L = enc.rowLine ? enc.rowLine[r] : absLine(r, g), isR = secamLineIsR(L);
    const rp = r >= 2 ? r - 2 : (r + 2 < lines ? r + 2 : r); // previous line of the same field via the 64 µs delay line
    for (let i = 0; i < ns; i++) {
      const cur = Dcur[r * ns + i], other = Dcur[rp * ns + i];
      const dr = isR ? cur : other, db = isR ? other : cur;
      V[r * ns + i] = (dr / -1.902) * 0.877; // R'-Y' -> V
      U[r * ns + i] = (db / 1.505) * 0.493;  // B'-Y' -> U
    }
  }
  return toRGB(Y, U, V, n);
}

/* ------------------------------------------------------------------ resampling (picture <-> grid) */
// Area-average / linear resample of one plane (sw x sh) to (dw x dh). Separable.
function resize(src, sw, sh, dw, dh) {
  const tmp = new Float32Array(dw * sh), out = new Float32Array(dw * dh);
  resample1D(src, sw, sh, tmp, dw, true);
  // vertical: transpose trick via index math
  resample1Dv(tmp, dw, sh, out, dh);
  return out;
}
function weights(sn, dn) {
  // returns for each dst index a list of [srcIndex, weight]
  const res = new Array(dn), scale = sn / dn;
  if (scale >= 1) { // area average (box of width scale)
    for (let d = 0; d < dn; d++) {
      const a = d * scale, b = a + scale, list = [];
      for (let s = Math.floor(a); s < Math.ceil(b); s++) {
        const w = Math.min(b, s + 1) - Math.max(a, s);
        if (w > 1e-9) list.push([Math.min(s, sn - 1), w / scale]);
      }
      res[d] = list;
    }
  } else { // Catmull-Rom upsampling
    for (let d = 0; d < dn; d++) {
      const x = (d + 0.5) * scale - 0.5, x0 = Math.floor(x), t = x - x0, list = [];
      const w = [((-t + 2) * t - 1) * t / 2, (((3 * t - 5) * t) * t + 2) / 2, ((-3 * t + 4) * t + 1) * t / 2, ((t - 1) * t * t) / 2];
      for (let k = -1; k <= 2; k++) list.push([clamp(x0 + k, 0, sn - 1), w[k + 1]]);
      res[d] = list;
    }
  }
  return res;
}
function resample1D(src, sw, sh, dst, dw) {
  const W = weights(sw, dw);
  for (let y = 0; y < sh; y++) {
    const o = y * sw, od = y * dw;
    for (let x = 0; x < dw; x++) { let a = 0; for (const [s, w] of W[x]) a += src[o + s] * w; dst[od + x] = a; }
  }
}
function resample1Dv(src, w, sh, dst, dh) {
  const W = weights(sh, dh);
  for (let y = 0; y < dh; y++) {
    const od = y * w;
    for (let x = 0; x < w; x++) dst[od + x] = 0;
    for (const [s, wt] of W[y]) { const os = s * w; for (let x = 0; x < w; x++) dst[od + x] += src[os + x] * wt; }
  }
}

const api = { STANDARDS, geometry, encode, channel, hold, decode, resize, lp3dB, firResponse, rgbToYUV, yuvToRGB, uvToIQ, iqToUV,
  absLine, mulberry32, gaussRand, clamp, makePlanes, filterRows, convLine, SECAM, tw, bandpassAt, buildStream, streamLine, fieldLayout, toEnv, fromEnv };
if (typeof module !== "undefined" && module.exports) module.exports = api;
