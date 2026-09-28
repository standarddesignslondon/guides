/* VideoLook recording stage: videotape formats from 2-inch Quad to DV.
 * Three kinds of machine are modelled differently:
 *   'fm'        direct-FM composite (Quad, Type B, Type C): the composite signal itself is band-limited, noised and
 *               time-warped per head (banding, skew, scallop); a timebase corrector leaves a residual error.
 *   'under'     colour-under (U-matic, VHS, Betamax, Video8, V2000, S-VHS, Hi8): the signal is split into luma and
 *               chroma, luma is band-limited with FM noise and playback sharpening, chroma is narrowed to the
 *               colour-under band with blotchy noise and a small delay; no TBC on domestic machines, so lines wobble.
 *   'component' (Betacam, MII), 'digital' (D1, D5, Digital Betacam, D2, D3) and 'dv' (DV, DVCAM, DVCPRO25).
 * Numbers: [SPEC]/[MFR]/[SEC]/[OBS] where sourced (strands C and D, BBC ETD 34A and 'Colour Under' sheets); the rest [EST].
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAMR = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;

const FORMATS = {
  quad_hb:   { label: "2-inch Quad, high band", kind: "fm", lumaBW: 5.0e6, snr: 46, band: 16, heads: 4, tbcNs: 3 },  // 15-16 lines/head, Colortec ±3 ns [SEC ETD 34A]; bw/SNR [EST]
  quad_lb:   { label: "2-inch Quad, low band", kind: "fm", lumaBW: 3.8e6, snr: 40, band: 16, heads: 4, tbcNs: 30, lowBandMoire: 0.08 }, // "severe moiré" in 625 colour [SEC 34A]; values [EST]
  typeB:     { label: "1-inch Type B (segmented)", kind: "fm", lumaBW: 5.0e6, snr: 47, band: 52, heads: 2, tbcNs: 3 },  // 6 segments/field PAL (arithmetic) [SEC strand C]; [EST]
  typeC:     { label: "1-inch Type C", kind: "fm", lumaBW: 5.5e6, snr: 48, band: 0, tbcNs: 3 },                        // [EST]
  umatic_lb: { label: "U-matic low band", kind: "under", lumaBW: 2.8e6, chromaBW: 0.35e6, snr: 43, chromaSnr: 38, jitterNs: 25, tbc: true, sharpen: 0.2, chromaDelayNs: 120 }, // luma ~2.8 MHz, carrier 0.686 MHz [SEC ETD Colour Under 1985]; rest [EST]
  umatic_hb: { label: "U-matic high band", kind: "under", lumaBW: 3.5e6, chromaBW: 0.45e6, snr: 45, chromaSnr: 40, jitterNs: 20, tbc: true, sharpen: 0.2, chromaDelayNs: 100 }, // ~3.5 MHz, 0.924 MHz [SEC]
  umatic_sp: { label: "U-matic SP", kind: "under", lumaBW: 3.8e6, chromaBW: 0.5e6, snr: 46, chromaSnr: 41, jitterNs: 15, tbc: true, sharpen: 0.15, chromaDelayNs: 80 }, // [EST]
  vhs_sp:    { label: "VHS (SP)", kind: "under", lumaBW: 3.0e6, chromaBW: 0.4e6, snr: 43, chromaSnr: 36, jitterNs: 80, wobbleNs: 150, headSwitch: 6, flag: 1.2e-6, sharpen: 0.35, chromaDelayNs: 150, dropouts: 0.004 }, // luma ~3 MHz, SNR ≥42-45 dB [MFR]; chroma 0.3-0.5 MHz [SEC]; defects [EST]
  vhs_lp:    { label: "VHS (LP)", kind: "under", lumaBW: 2.7e6, chromaBW: 0.35e6, snr: 41, chromaSnr: 34, jitterNs: 110, wobbleNs: 200, headSwitch: 7, flag: 1.5e-6, sharpen: 0.4, chromaDelayNs: 170, dropouts: 0.006 },
  vhs_ep:    { label: "VHS (EP)", kind: "under", lumaBW: 2.4e6, chromaBW: 0.3e6, snr: 39, chromaSnr: 32, jitterNs: 140, wobbleNs: 250, headSwitch: 8, flag: 2e-6, sharpen: 0.45, chromaDelayNs: 190, dropouts: 0.009 },
  svhs:      { label: "S-VHS", kind: "under", lumaBW: 5.0e6, chromaBW: 0.4e6, snr: 46, chromaSnr: 37, jitterNs: 70, wobbleNs: 120, headSwitch: 6, flag: 1e-6, sharpen: 0.3, chromaDelayNs: 150, dropouts: 0.003 }, // >5 MHz luma, VHS chroma [SEC]
  betamax:   { label: "Betamax", kind: "under", lumaBW: 3.2e6, chromaBW: 0.4e6, snr: 44, chromaSnr: 37, jitterNs: 70, wobbleNs: 130, headSwitch: 6, flag: 1e-6, sharpen: 0.3, chromaDelayNs: 140, dropouts: 0.004 }, // [EST]
  video8:    { label: "Video8", kind: "under", lumaBW: 3.0e6, chromaBW: 0.4e6, snr: 43, chromaSnr: 37, jitterNs: 70, wobbleNs: 120, headSwitch: 6, flag: 0.8e-6, sharpen: 0.3, chromaDelayNs: 130, dropouts: 0.005 }, // [EST]
  hi8:       { label: "Hi8", kind: "under", lumaBW: 5.0e6, chromaBW: 0.45e6, snr: 46, chromaSnr: 38, jitterNs: 60, wobbleNs: 110, headSwitch: 6, flag: 0.8e-6, sharpen: 0.3, chromaDelayNs: 120, dropouts: 0.005 }, // "400 lines" [SEC]
  v2000:     { label: "Philips Video 2000", kind: "under", lumaBW: 3.0e6, chromaBW: 0.4e6, snr: 42, chromaSnr: 36, jitterNs: 80, wobbleNs: 140, headSwitch: 6, flag: 1.2e-6, sharpen: 0.3, chromaDelayNs: 150, dropouts: 0.004 }, // [EST]
  vcr_lp:    { label: "Philips VCR / VCR-LP", kind: "under", lumaBW: 2.8e6, chromaBW: 0.35e6, snr: 40, chromaSnr: 35, jitterNs: 90, wobbleNs: 160, headSwitch: 6, flag: 1.2e-6, sharpen: 0.25, chromaDelayNs: 160, dropouts: 0.005 }, // luma FM 3.3-4.8 MHz [MFR]; [EST]
  // ---- v1.1: early, oddball and disc formats (sources in research H; unlisted values EST) ----
  // Sony CV-2000 (1965): 1/2 in, B&W, skip-field (one field recorded, shown twice), "more than 220 TVL" = ~2.8 MHz [SEC]
  cv2000:    { label: "Sony CV-2000 home VTR (B&W, skip-field)", kind: "under", mono: true, skipField: true, lumaBW: 2.8e6, chromaBW: 0.3e6, snr: 39, chromaSnr: 30, jitterNs: 120, wobbleNs: 220, headSwitch: 5, flag: 1.5e-6, sharpen: 0.2, chromaDelayNs: 0, dropouts: 0.008 },
  // EIAJ Type 1 (1969) Portapak: 1/2 in open reel, B&W; "flagging" at the top on replay [SEC]; bandwidth NOT FOUND [EST]
  eiaj1:     { label: "EIAJ-1 Portapak (1/2 in reel, B&W)", kind: "under", mono: true, lumaBW: 3.0e6, chromaBW: 0.3e6, snr: 40, chromaSnr: 30, jitterNs: 140, wobbleNs: 260, headSwitch: 6, flag: 3.5e-6, sharpen: 0.2, chromaDelayNs: 0, dropouts: 0.01 },
  // Time-lapse CCTV VHS, 24 h mode: 5 fields/s, 300 lines B&W [SEC Lorex SY96R manual]; replay shows one field [EST]
  tl_vhs:    { label: "Time-lapse CCTV VHS (24 h mode, B&W)", kind: "under", mono: true, skipField: true, lumaBW: 3.8e6, chromaBW: 0.3e6, snr: 41, chromaSnr: 30, jitterNs: 90, wobbleNs: 140, headSwitch: 8, flag: 1.0e-6, sharpen: 0.35, chromaDelayNs: 0, dropouts: 0.006 },
  // PXL-2000 audio-cassette recording at 16.875 in/s, luma only, "about 8 grey levels" (one decoding blog) [SEC single]; noise [EST]
  pxl_cassette: { label: "PXL-2000 audio cassette (8 grey levels)", kind: "under", mono: true, levels: 8, lumaBW: 1.2e6, chromaBW: 0.3e6, snr: 33, chromaSnr: 30, jitterNs: 150, wobbleNs: 260, headSwitch: 0, flag: 0, sharpen: 0.1, chromaDelayNs: 0, dropouts: 0.01 },
  // LaserDisc: FM composite on an optical disc; full broadcast bandwidth (425/440 TVL) [SEC]; SNR [EST]; CLV crosstalk
  // "swirling barber poles / rolling lines of static", CAV immune; laser rot speckle [SEC single each]
  laserdisc: { label: "LaserDisc (CLV)", kind: "disc", lumaBW: 5.0e6, snr: 44, crosstalk: 0.5, rot: 0 },
  laserdisc_rot: { label: "LaserDisc with laser rot", kind: "disc", lumaBW: 5.0e6, snr: 41, crosstalk: 0.3, rot: 1 },
  // RCA CED (1981): 3.0 MHz luma, SNR >46 dB new [SEC]; colour method (buried subcarrier) NOT CONFIRMED, modelled as a
  // narrow colour band [EST]; wear and dust ("video virus") give dropouts and snow [SEC single]
  ced:       { label: "RCA CED videodisc (worn)", kind: "under", lumaBW: 3.0e6, chromaBW: 0.5e6, snr: 41, chromaSnr: 35, jitterNs: 40, wobbleNs: 60, headSwitch: 0, flag: 0, sharpen: 0.15, chromaDelayNs: 60, dropouts: 0.03, noDOC: true },
  betacam:   { label: "Betacam", kind: "component", lumaBW: 4.0e6, chromaBW: 1.5e6, snr: 48 },   // [SEC] 300/120 TVL
  betacam_sp:{ label: "Betacam SP", kind: "component", lumaBW: 4.5e6, chromaBW: 1.5e6, snr: 51 }, // Y 4.5 MHz, C 1.5 MHz, SNR >51 dB [SEC]
  mii:       { label: "MII", kind: "component", lumaBW: 4.5e6, chromaBW: 1.5e6, snr: 50 },       // [EST]
  d1:        { label: "D1 (4:2:2, 8-bit)", kind: "digital", bits: 8, sub: "422" },              // [SPEC BT.601]
  digibeta:  { label: "Digital Betacam (4:2:2, 10-bit)", kind: "digital", bits: 10, sub: "422" }, // compression ~2.3:1 not modelled: transparent on a still [SEC]
  d3:        { label: "D2 / D3 (composite digital, 8-bit)", kind: "composite8" },                  // 4 x fsc sampling [SPEC]
  dv_pal:    { label: "DV / DVCAM (PAL 4:2:0)", kind: "dv", sub: "420" },                          // [MFR/SEC strand D]
  dv_ntsc:   { label: "DV (NTSC 4:1:1)", kind: "dv", sub: "411" },
  dvcpro:    { label: "DVCPRO25 (4:1:1)", kind: "dv", sub: "411" },
};

function yuvPlanes(rgb) {
  const n = rgb[0].length, Y = new Float32Array(n), U = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = VC.rgbToYUV(rgb[0][i], rgb[1][i], rgb[2][i]); Y[i] = t[0]; U[i] = t[1]; V[i] = t[2]; }
  return [Y, U, V];
}
function rgbPlanes(yuv) {
  const n = yuv[0].length, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = VC.yuvToRGB(yuv[0][i], yuv[1][i], yuv[2][i]); R[i] = t[0]; G[i] = t[1]; B[i] = t[2]; }
  return [R, G, B];
}
function addNoise(p, ns, nl, sigma, lp, rnd, tilt) {
  const nz = new Float32Array(p.length);
  for (let i = 0; i < nz.length; i++) nz[i] = VC.gaussRand(rnd);
  if (tilt) { const lo = Float32Array.from(nz); VC.filterRows(lo, ns, nl, tilt); for (let i = 0; i < nz.length; i++) nz[i] -= 0.75 * lo[i]; }
  if (lp) VC.filterRows(nz, ns, nl, lp);
  // renormalise to the requested rms
  let s = 0; for (let i = 0; i < nz.length; i++) s += nz[i] * nz[i]; const k = sigma / Math.sqrt(s / nz.length || 1);
  for (let i = 0; i < nz.length; i++) p[i] += k * nz[i];
}
function shiftLine(p, o, n, dx, tmp) { // fractional horizontal shift of one line (+ right); edges repeat
  for (let i = 0; i < n; i++) tmp[i] = p[o + i];
  for (let i = 0; i < n; i++) { const x = i - dx, x0 = Math.floor(x), f = x - x0; const a = tmp[Math.min(n - 1, Math.max(0, x0))], b = tmp[Math.min(n - 1, Math.max(0, x0 + 1))]; p[o + i] = a + (b - a) * f; }
}

/* ---- colour-under formats: work on the decoded Y/U/V of the incoming composite ---- */
function colourUnder(enc, f, o) {
  const g = enc.g, ns = g.ns, nl = g.lines, n = ns * nl, fs = g.fs;
  const rnd = VC.mulberry32(((o.seed || 1) * 31337 + (o.gen || 0) * 977) >>> 0);
  // record side: the VCR's own separation (notch), simple chroma demodulation; the VCR's comb/delay is applied below
  const dec = VC.decode(enc, { separation: "notch", palMode: "simple", lumaBW: f.lumaBW, ntscDemod: "equiband", equibandBW: 1.0e6 });
  const [Y, U, V] = yuvPlanes(dec);
  const isMono = g.colour === "MONO";
  // luma: FM record/replay band-limit and noise that rises with frequency [SEC/MFR]; independent line to line (streaky)
  // (the record-side luma band-limit is the decode above, lumaBW = the format's luma bandwidth)
  addNoise(Y, ns, nl, Math.pow(10, -f.snr / 20), VC.lp3dB(f.lumaBW * 1.1, fs, VC.tw(f.lumaBW, 1.0e6)), rnd, VC.lp3dB(Math.min(1.0e6, f.lumaBW * 0.5), fs, VC.tw(f.lumaBW * 0.5, 0.8e6)));
  // playback "detail" enhancement: overshoot halos on edges [OBS strand C]; amount [EST]
  if (f.sharpen) { const lo = Float32Array.from(Y); VC.filterRows(lo, ns, nl, VC.lp3dB(Math.min(1.2e6, f.lumaBW * 0.5), fs, VC.tw(f.lumaBW * 0.5, 1.0e6))); for (let i = 0; i < n; i++) Y[i] += f.sharpen * (Y[i] - lo[i]); }
  if (!isMono) {
    // chroma: narrowed to the colour-under band [SEC], blotchy low-frequency noise, delay behind luma [EST]
    const hC = VC.lp3dB(f.chromaBW, fs, Math.max(0.2e6, f.chromaBW * 0.8));
    VC.filterRows(U, ns, nl, hC); VC.filterRows(V, ns, nl, hC);
    const cs = Math.pow(10, -f.chromaSnr / 20);
    addNoise(U, ns, nl, cs, hC, rnd); addNoise(V, ns, nl, cs, hC, rnd);
    // playback chroma comb / 1H delay: vertical chroma average within the field [SEC 'Colour Under' sheet; PAL/NTSC practice]
    for (const P of [U, V]) { const src = Float32Array.from(P); for (let r = 2; r < nl; r++) for (let i = 0; i < ns; i++) P[r * ns + i] = 0.5 * (src[r * ns + i] + src[(r - 2) * ns + i]); }
    const dly = (f.chromaDelayNs || 0) * 1e-9 * fs, tmp = new Float32Array(ns);
    if (dly) for (let r = 0; r < nl; r++) { shiftLine(U, r * ns, ns, dly, tmp); shiftLine(V, r * ns, ns, dly, tmp); }
  } else { U.fill(0); V.fill(0); }
  if (f.mono) { U.fill(0); V.fill(0); }
  if (f.levels) { const L = f.levels - 1; for (let i = 0; i < n; i++) { const y = Math.max(0, Math.min(1, Y[i])); Y[i] = Math.round(y * L) / L; } }
  // mechanical timebase errors: no TBC on domestic machines [SEC ETD 34A: helical ±1 µs]; typical visible amounts [EST]
  timebase(Y, U, V, g, f, rnd, o);
  // dropouts: horizontal streaks, or a repeat of the line above when dropout compensation is fitted [SEC/OBS]
  const dRate = o.dropouts !== undefined ? o.dropouts : (f.dropouts || 0);
  if (dRate > 0) for (let r = 0; r < nl; r++) {
    if (rnd() > dRate) continue;
    const len = Math.min(ns, Math.round(ns * (0.02 + 0.3 * rnd() * rnd()))), s0 = Math.floor(rnd() * (ns - len));
    const doc = o.doc !== undefined ? o.doc : !f.noDOC;
    for (let i = s0; i < s0 + len; i++) {
      const k = r * ns + i;
      if (doc && r >= 2) { Y[k] = Y[k - 2 * ns]; U[k] = U[k - 2 * ns]; V[k] = V[k - 2 * ns]; }
      else { Y[k] = 0.9 + 0.1 * rnd(); U[k] = V[k] = 0; }
    }
  }
  // skip-field machines record one field and replay it for both [SEC CV-2000; time-lapse replay EST]
  if (f.skipField) for (const P of [Y, U, V]) for (let r = 1; r < nl; r += 2) P.copyWithin(r * ns, (r - 1) * ns, r * ns);
  // back to composite (the machine outputs standard composite with a fresh burst)
  return VC.encode(rgbPlanes([Y, U, V]), g.name, { chromaFilter: "none" });
}
function timebase(Y, U, V, g, f, rnd, o) {
  const ns = g.ns, nl = g.lines, fs = g.fs, tmp = new Float32Array(ns);
  const jit = (o.jitterNs !== undefined ? o.jitterNs : (f.jitterNs || 0)) * 1e-9 * fs;
  const wob = (f.wobbleNs || 0) * 1e-9 * fs * (o.wobble !== undefined ? o.wobble : 1);
  const hsLines = o.headSwitch !== undefined ? o.headSwitch : (f.headSwitch || 0);
  const flag = (f.flag || 0) * fs * (o.flagging !== undefined ? o.flagging : 1);
  const trackPos = o.tracking ? (o.trackingPos !== undefined ? o.trackingPos : 0.6) : -1;
  const fieldRows = Math.ceil(nl / 2);
  for (let fld = 0; fld < 2; fld++) {
    let walk = 0; const ph = rnd() * 6.283, ph2 = rnd() * 6.283;
    for (let k = 0; k < fieldRows; k++) {
      const r = 2 * k + fld; if (r >= nl) break;
      walk = 0.85 * walk + 0.15 * VC.gaussRand(rnd);
      let dx = jit * walk * 2.5 + wob * Math.sin(ph + k / fieldRows * 6.283 * 1.5) * 0.5 + wob * 0.3 * Math.sin(ph2 + k * 0.21);
      // tape tension "flagging" bends the top of the picture [SEC ETD 34A / OBS]
      if (flag && k < 12) dx += flag * Math.pow(1 - k / 12, 2);
      // head switching: the last lines of each field are displaced and noisy [OBS]; count [EST]
      if (hsLines && k >= fieldRows - hsLines) { const t = (k - (fieldRows - hsLines)) / hsLines; dx += (4e-6 + 6e-6 * t) * fs; for (let i = 0; i < ns; i++) Y[r * ns + i] += 0.08 * VC.gaussRand(rnd); }
      if (dx) { shiftLine(Y, r * ns, ns, dx, tmp); shiftLine(U, r * ns, ns, dx, tmp); shiftLine(V, r * ns, ns, dx, tmp); }
      // tracking error band: a band of heavy noise and streaks [OBS]
      if (trackPos >= 0) { const c = Math.abs(k / fieldRows - trackPos); if (c < 0.05) { const s = (1 - c / 0.05) * 0.5 * (o.tracking || 1); for (let i = 0; i < ns; i++) { const nz = VC.gaussRand(rnd); Y[r * ns + i] += s * (nz > 1.2 ? 1.2 : nz * 0.4); U[r * ns + i] *= 1 - s; V[r * ns + i] *= 1 - s; } } }
    }
  }
}

/* ---- direct-FM composite machines: work on the composite signal itself ---- */
function fmComposite(enc, f, o) {
  const g = enc.g, { nLine, lines, fs } = g;
  const rnd = VC.mulberry32(((o.seed || 1) * 7777 + (o.gen || 0) * 131) >>> 0);
  const sig = enc.sig;
  VC.filterRows(sig, nLine, lines, VC.lp3dB(f.lumaBW, fs, 0.6e6));
  addNoise(sig, nLine, lines, Math.pow(10, -f.snr / 20), VC.lp3dB(f.lumaBW, fs, 0.6e6), rnd, VC.lp3dB(1.0e6, fs, 0.8e6));
  if (f.lowBandMoire && g.colour !== "MONO") { // FM sidebands folding back onto the subcarrier region [SEC 34A: "severe moiré"]; pattern [EST]
    for (let r = 0; r < lines; r++) for (let s = 0; s < nLine; s++) sig[r * nLine + s] += f.lowBandMoire * Math.sin(2 * Math.PI * (1.1e6 * s / fs + 0.37 * r));
  }
  // per-head banding: each head has its own timing offset, skew and scallop; left-to-right growth makes colour errors [SEC 34A]
  const bandErr = o.banding !== undefined ? o.banding : 1;
  const tbc = (f.tbcNs || 0) * 1e-9 * fs;
  if (f.band && bandErr > 0) {
    const heads = [];
    for (let h = 0; h < (f.heads || 4); h++) heads.push({ off: VC.gaussRand(rnd), skew: VC.gaussRand(rnd), scal: VC.gaussRand(rnd), gain: 1 + 0.03 * VC.gaussRand(rnd) * bandErr });
    const tmp = new Float32Array(nLine);
    for (let r = 0; r < lines; r++) {
      const L = VC.absLine(r, g), hd = heads[Math.floor(L / f.band) % heads.length], pos = (L % f.band) / f.band;
      const errNs = 6 * bandErr; // residual after correction; a guide error of 1/1000 in gives ~1 µs/track [SEC 34A] (scaled down by the TBC) [EST]
      for (let i = 0; i < nLine; i++) tmp[i] = sig[r * nLine + i];
      for (let i = 0; i < nLine; i++) {
        const x = i / nLine;
        const dt = (hd.off + hd.skew * (pos - 0.5) * 0.5 + hd.scal * (x - 0.5) * (x - 0.5) * 2 + hd.skew * x * 0.8) * errNs * 1e-9 * fs;
        const xs = i - dt, x0 = Math.floor(xs), fr = xs - x0;
        const a = tmp[Math.min(nLine - 1, Math.max(0, x0))], b = tmp[Math.min(nLine - 1, Math.max(0, x0 + 1))];
        sig[r * nLine + i] = (a + (b - a) * fr) * (i > g.a0 ? hd.gain : 1);
      }
    }
  }
  if (tbc > 0) { const tmp = new Float32Array(nLine); for (let r = 0; r < lines; r++) shiftLine(sig, r * nLine, nLine, tbc * VC.gaussRand(rnd) * 0.5, tmp); }
  return enc;
}

/* ---- optical disc (LaserDisc): FM composite, no tape timebase error; CLV crosstalk bands and laser-rot speckle ---- */
function discComposite(enc, f, o) {
  const g = enc.g, { nLine, lines, fs, a0, ns } = g;
  const rnd = VC.mulberry32(((o.seed || 1) * 9091 + (o.gen || 0)) >>> 0);
  const sig = enc.sig;
  VC.filterRows(sig, nLine, lines, VC.lp3dB(Math.min(f.lumaBW, g.bw), fs, VC.tw(g.bw, 0.6e6)));
  addNoise(sig, nLine, lines, Math.pow(10, -f.snr / 20), VC.lp3dB(g.bw, fs, VC.tw(g.bw, 0.6e6)), rnd, VC.lp3dB(1.0e6, fs, 0.8e6));
  // crosstalk from the neighbouring track: narrow diagonal bands of fine noisy beat that drift through the picture [EST form]
  const ct = (o.crosstalk !== undefined ? o.crosstalk : f.crosstalk) || 0;
  if (ct > 0) {
    const ph = rnd() * 6.283, beat = 2 * Math.PI * (1.9e6 + 0.4e6 * rnd()) / fs;
    for (let r = 0; r < lines; r++) for (let i = 0; i < ns; i++) {
      const u = i / ns, v = r / lines, band = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * (1.3 * u + 4.1 * v) + ph), 6);
      if (band < 0.02) continue;
      const s = r * nLine + a0 + i; sig[s] += ct * 0.12 * band * (Math.sin(beat * s + 3 * Math.sin(0.002 * s)) + 0.5 * VC.gaussRand(rnd));
    }
  }
  // laser rot: oxidised reflective layer gives sparkling specks, some coloured, some dark [SEC single; density EST]
  const rot = (o.rot !== undefined ? o.rot : f.rot) || 0;
  if (rot > 0) {
    const nSpk = Math.round(rot * lines * 3);
    for (let k = 0; k < nSpk; k++) {
      const r = Math.floor(rnd() * lines), i = Math.floor(rnd() * ns), len = 2 + Math.floor(rnd() * 10), a = rnd() < 0.7 ? 0.6 + 0.6 * rnd() : -0.5;
      for (let j = 0; j < len && i + j < ns; j++) { const s = r * nLine + a0 + i + j; sig[s] += a * Math.sin(Math.PI * j / len) * (1 + 0.8 * Math.sin(Math.PI / 2 * s)); }
      if (r + 2 < lines && rnd() < 0.5) for (let j = 0; j < len && i + j < ns; j++) sig[(r + 2) * nLine + a0 + i + j] += 0.5 * a;
    }
  }
  return enc;
}

/* ---- component analogue on the R'G'B' grid (before encoding) ---- */
function componentAnalogue(grid, g, f, o) {
  const ns = g.ns, nl = g.lines, rnd = VC.mulberry32(((o.seed || 1) * 4243 + (o.gen || 0)) >>> 0);
  const [Y, U, V] = yuvPlanes(grid);
  VC.filterRows(Y, ns, nl, VC.lp3dB(f.lumaBW, g.fs, 0.6e6));
  const hC = VC.lp3dB(f.chromaBW, g.fs, 0.6e6); VC.filterRows(U, ns, nl, hC); VC.filterRows(V, ns, nl, hC);
  addNoise(Y, ns, nl, Math.pow(10, -f.snr / 20), VC.lp3dB(f.lumaBW, g.fs, 0.8e6), rnd);
  addNoise(U, ns, nl, Math.pow(10, -(f.snr + 2) / 20), hC, rnd); addNoise(V, ns, nl, Math.pow(10, -(f.snr + 2) / 20), hC, rnd);
  return rgbPlanes([Y, U, V]);
}

/* ---- digital component (BT.601) and composite-digital ---- */
function to601(grid, g) { // resample the grid to 702 active samples of the 13.5 MHz raster [SPEC BT.601]
  const W = Math.round(g.active * 13.5e6);
  return { W, planes: grid.map(p => VC.resize(p, g.ns, g.lines, W, g.lines)) };
}
function from601(planes, W, g) { return planes.map(p => VC.resize(p, W, g.lines, g.ns, g.lines)); }
function quant(v, bits, lo, hi) { const q = (1 << (bits - 8)); const code = Math.round((lo + v * (hi - lo)) * q) / q; return (code - lo) / (hi - lo); }
function digitalComponent(grid, g, f) {
  const { W, planes } = to601(grid, g), nl = g.lines;
  const [Y, U, V] = yuvPlanes(planes);
  // 4:2:2: colour-difference sampled at half rate [SPEC]; studio levels Y 16-235, C 16-240 [SPEC]
  for (let r = 0; r < nl; r++) for (let x = 0; x < W; x += 2) { const k = r * W + x, k2 = x + 1 < W ? k + 1 : k; const u = 0.5 * (U[k] + U[k2]), v = 0.5 * (V[k] + V[k2]); U[k] = U[k2] = u; V[k] = V[k2] = v; }
  for (let i = 0; i < Y.length; i++) { Y[i] = quant(Y[i], f.bits, 16, 235); U[i] = quant(U[i] / 0.872 + 0.5, f.bits, 16, 240); V[i] = quant(V[i] / 1.23 + 0.5, f.bits, 16, 240); U[i] = (U[i] - 0.5) * 0.872; V[i] = (V[i] - 0.5) * 1.23; }
  // decoder chroma upsampling (linear) [EST]
  for (let r = 0; r < nl; r++) for (let x = 1; x < W - 1; x += 2) { const k = r * W + x; U[k] = 0.5 * (U[k - 1] + U[k + 1]); V[k] = 0.5 * (V[k - 1] + V[k + 1]); }
  return from601(rgbPlanes([Y, U, V]), W, g);
}
function composite8(enc) { // D2/D3: composite sampled at 4 x fsc, 8 bits [SPEC EBU Tech 3280]; the grid already is 4 x fsc
  const s = enc.sig;
  for (let i = 0; i < s.length; i++) { const code = Math.round((s[i] + 0.43) / (1.33 + 0.43) * 254); s[i] = code / 254 * (1.33 + 0.43) - 0.43; }
  return enc;
}

/* ---- DV: 8x8 DCT, 25 Mbit/s, segments of 5 macroblocks with a fixed bit budget [MFR/SEC/OBS strand D] ---- */
const DCT8 = (() => { const m = new Float64Array(64); for (let k = 0; k < 8; k++) for (let n = 0; n < 8; n++) m[k * 8 + n] = (k === 0 ? Math.sqrt(1 / 8) : Math.sqrt(2 / 8)) * Math.cos(Math.PI * (2 * n + 1) * k / 16); return m; })();
function dct2(b, out) { const t = new Float64Array(64); for (let y = 0; y < 8; y++) for (let k = 0; k < 8; k++) { let s = 0; for (let n = 0; n < 8; n++) s += DCT8[k * 8 + n] * b[y * 8 + n]; t[y * 8 + k] = s; } for (let x = 0; x < 8; x++) for (let k = 0; k < 8; k++) { let s = 0; for (let n = 0; n < 8; n++) s += DCT8[k * 8 + n] * t[n * 8 + x]; out[k * 8 + x] = s; } }
function idct2(c, out) { const t = new Float64Array(64); for (let x = 0; x < 8; x++) for (let n = 0; n < 8; n++) { let s = 0; for (let k = 0; k < 8; k++) s += DCT8[k * 8 + n] * c[k * 8 + x]; t[n * 8 + x] = s; } for (let y = 0; y < 8; y++) for (let n = 0; n < 8; n++) { let s = 0; for (let k = 0; k < 8; k++) s += DCT8[k * 8 + n] * t[y * 8 + k]; out[y * 8 + n] = s; } }
// DV weighting falls from 1.0 near DC to ~0.52 at the highest frequency [MFR/OBS FFmpeg dv tables]; here as a smooth function of u+v [EST]
const DVW = (() => { const w = new Float64Array(64); for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) w[v * 8 + u] = 1 - 0.48 * Math.min(1, (u + v) / 14); return w; })();
function blockBits(q) { let bits = 4, run = 0; for (let i = 1; i < 64; i++) { const a = Math.abs(q[i]); if (a === 0) { run++; continue; } bits += 3 + 2 * Math.log2(a + 1) + (run ? 2 + Math.log2(run + 1) : 0); run = 0; } return bits; } // VLC cost approximation [EST]
function dvCodec(grid, g, f, o) {
  const { W, planes } = to601(grid, g), H = g.lines;
  const W8 = Math.ceil(W / 16) * 16, H8 = Math.ceil(H / 16) * 16;
  const pad = p => { const a = new Float32Array(W8 * H8); for (let y = 0; y < H8; y++) for (let x = 0; x < W8; x++) a[y * W8 + x] = p[Math.min(H - 1, y) * W + Math.min(W - 1, x)]; return a; };
  const [Y0, U0, V0] = yuvPlanes(planes).map(pad);
  const Y = Y0.map(v => v * 219 + 16), U = U0.map(v => v / 0.872 * 224), V = V0.map(v => v / 1.23 * 224); // 8-bit studio scale
  // chroma subsampling: PAL 4:2:0 within each field (vertical pairs of same-field lines); NTSC/DVCPRO 4:1:1 [MFR/SEC]
  let cw, ch; const Cu = [], Cv = [];
  if (f.sub === "420") { cw = W8 / 2; ch = H8 / 2; for (const [S, D] of [[U, Cu], [V, Cv]]) { const a = new Float32Array(cw * ch); for (let fld = 0; fld < 2; fld++) for (let k = 0; k < ch / 2; k++) { const r0 = fld + 4 * k, r1 = r0 + 2; for (let x = 0; x < cw; x++) { const s = (S[Math.min(H8 - 1, r0) * W8 + 2 * x] + S[Math.min(H8 - 1, r0) * W8 + 2 * x + 1] + S[Math.min(H8 - 1, r1) * W8 + 2 * x] + S[Math.min(H8 - 1, r1) * W8 + 2 * x + 1]) / 4; a[(2 * k + fld) * cw + x] = s; } } D.push(a); } }
  else { cw = W8 / 4; ch = H8; for (const [S, D] of [[U, Cu], [V, Cv]]) { const a = new Float32Array(cw * ch); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) a[y * cw + x] = (S[y * W8 + 4 * x] + S[y * W8 + 4 * x + 1] + S[y * W8 + 4 * x + 2] + S[y * W8 + 4 * x + 3]) / 4; D.push(a); } }
  const CU = Cu[0], CV = Cv[0];
  // macroblocks: 4:2:0 -> 16x16 luma + one 8x8 of each chroma; 4:1:1 -> 32x8 luma + one 8x8 of each chroma
  const mbW = f.sub === "420" ? 16 : 32, mbH = f.sub === "420" ? 16 : 8;
  const mbs = [];
  for (let my = 0; my < H8 / mbH; my++) for (let mx = 0; mx < Math.floor(W8 / mbW); mx++) mbs.push([mx, my]);
  const budgetScale = o.dvQuality !== undefined ? o.dvQuality : 1;
  const blk = new Float64Array(64), co = new Float64Array(64), qb = new Int32Array(64), rec = new Float64Array(64);
  const STEPS = [1, 2, 4, 8, 16, 32]; // power-of-two steps [MFR/OBS]
  const blocksOf = (mx, my) => { const L = []; if (f.sub === "420") { for (const [bx, by] of [[0, 0], [8, 0], [0, 8], [8, 8]]) L.push([Y, W8, mx * 16 + bx, my * 16 + by]); L.push([CU, cw, mx * 8, my * 8]); L.push([CV, cw, mx * 8, my * 8]); } else { for (let b = 0; b < 4; b++) L.push([Y, W8, mx * 32 + b * 8, my * 8]); L.push([CU, cw, mx * 8, my * 8]); L.push([CV, cw, mx * 8, my * 8]); } return L; };
  const code = (P, pw, x0, y0, step, write) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) blk[y * 8 + x] = P[(y0 + y) * pw + x0 + x] - (P === Y ? 128 : 0);
    dct2(blk, co);
    qb[0] = Math.round(co[0] / 4); // DC kept at 9-bit precision [MFR/OBS]
    for (let i = 1; i < 64; i++) qb[i] = Math.round(co[i] * DVW[i] / step);
    const bits = blockBits(qb);
    if (write) { co[0] = qb[0] * 4; for (let i = 1; i < 64; i++) co[i] = qb[i] * step / DVW[i]; idct2(co, rec); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) P[(y0 + y) * pw + x0 + x] = rec[y * 8 + x] + (P === Y ? 128 : 0); }
    return bits;
  };
  // rate control: segments of 5 macroblocks taken from scattered positions share 5 x (4*100 + 2*68) bits [OBS FFmpeg / patent]
  const segBudget = 5 * (4 * 100 + 2 * 68) * budgetScale;
  const order = mbs.map((m, i) => i); // scatter: take every (n/5)-th macroblock into one segment [EST mapping]
  const nSeg = Math.floor(mbs.length / 5), stride = nSeg;
  for (let s = 0; s < nSeg; s++) {
    const seg = [0, 1, 2, 3, 4].map(k => mbs[order[(s + k * stride) % mbs.length]]);
    // find the finest single step for the segment that fits, then refine per macroblock [EST simplification]
    let stepIdx = STEPS.length - 1;
    for (let si = 0; si < STEPS.length; si++) { let tot = 0; for (const [mx, my] of seg) for (const b of blocksOf(mx, my)) tot += code(b[0], b[1], b[2], b[3], STEPS[si], false); if (tot <= segBudget) { stepIdx = si; break; } }
    for (const [mx, my] of seg) for (const b of blocksOf(mx, my)) code(b[0], b[1], b[2], b[3], STEPS[stepIdx] * (b[0] === Y ? 1 : 1.4), true);
  }
  // back to planes: chroma upsampled (linear) [EST decoder choice]
  const up = (C) => { const out = new Float32Array(W8 * H8); for (let y = 0; y < H8; y++) for (let x = 0; x < W8; x++) { let cx, cy; if (f.sub === "420") { cx = (x - 0.5) / 2; const fld = y & 1, k = y >> 1; cy = Math.floor(k / 2) * 2 + fld; cx = Math.max(0, Math.min(cw - 1, cx)); } else { cx = Math.max(0, Math.min(cw - 1, (x - 1.5) / 4)); cy = y; } const x0 = Math.floor(cx), fx = cx - x0, x1 = Math.min(cw - 1, x0 + 1); const yy = Math.min(ch - 1, cy); out[y * W8 + x] = C[yy * cw + x0] * (1 - fx) + C[yy * cw + x1] * fx; } return out; };
  const Uf = up(CU), Vf = up(CV);
  const outY = new Float32Array(W * H), outU = new Float32Array(W * H), outV = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W8 + x, j = y * W + x; outY[j] = (Y[k] - 16) / 219; outU[j] = Uf[k] / 224 * 0.872; outV[j] = Vf[k] / 224 * 1.23; }
  return from601(rgbPlanes([outY, outU, outV]), W, g);
}

/* ---- entry points ---- */
// Formats that act on the R'G'B' grid (before the encoder)
function isGridFormat(name) { const f = FORMATS[name]; return f && (f.kind === "component" || f.kind === "digital" || f.kind === "dv"); }
function recordGrid(grid, g, name, o) {
  const f = FORMATS[name]; o = o || {}; const gens = Math.max(1, o.generations || 1);
  for (let k = 0; k < gens; k++) {
    const oo = Object.assign({}, o, { gen: k });
    if (f.kind === "component") grid = componentAnalogue(grid, g, f, oo);
    else if (f.kind === "digital") grid = digitalComponent(grid, g, f);
    else if (f.kind === "dv") grid = dvCodec(grid, g, f, oo);
  }
  return grid;
}
// Formats that act on the composite signal
function recordSignal(enc, name, o) {
  const f = FORMATS[name]; o = o || {}; const gens = Math.max(1, o.generations || 1);
  for (let k = 0; k < gens; k++) {
    const oo = Object.assign({}, o, { gen: k });
    if (f.kind === "under") enc = colourUnder(enc, f, oo);
    else if (f.kind === "fm") enc = fmComposite(enc, f, oo);
    else if (f.kind === "composite8") enc = composite8(enc);
    else if (f.kind === "disc") enc = discComposite(enc, f, oo);
  }
  return enc;
}
const api = { FORMATS, isGridFormat, recordGrid, recordSignal, dvCodec };
if (typeof module !== "undefined" && module.exports) module.exports = api;
