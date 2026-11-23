/* VideoLook flat and matrix displays (v1.4): the picture shown on a panel of separate cells instead of a CRT.
 * Each panel has a native resolution, a number of levels per cell, cell colours and cell shape. The picture is cropped
 * to the panel's shape, averaged onto its cells, quantised (optionally dithered), and each cell drawn at document size.
 *
 * Sources for the panels:
 *  Game Boy (1989): 2.5 in reflective STN LCD, 160 x 144, "four shades of grey/green", green tint, motion blur
 *   [SEC Wikipedia Game Boy]. Colours, the shadow cast on the reflector and the gap brightness are [EST].
 *  Passive (STN) LCD: response around 100 ms against 8 ms for TFT; dual-scan panels drive two halves [SEC]. Crosstalk
 *   (shading along rows and columns) is the known weakness of passive addressing [SEC general]; amounts [EST].
 *  Gas plasma: neon orange glow; PLATO IV 512 x 512 (1972); IBM 3290; Toshiba T3100 (1986) 640 x 400, on/off;
 *   T3100SX 640 x 480 with 16 shades [SEC Wikipedia Plasma display, Toshiba T3100]. Colour as neon orange [EST xy].
 *  LED signs: early ones red, then AlInGaP red and amber from the late 1980s; dot matrix [SEC]. Matrix size [EST].
 *  Flip-disc: discs black on one face and bright on the other, Ferranti-Packard (Montreal Stock Exchange 1961) [SEC].
 *   Disc colour (fluorescent yellow-green) [EST from photographs]; matrix size [EST].
 *  Colour LCD pocket TV (Sony FDL-330S 1988/89 and others) [SEC model]: resolution, delta layout and backlight [EST].
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;

const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const hexL = h => [0, 2, 4].map(k => lin(parseInt(h.slice(k, k + 2), 16) / 255));
const enc = v => v <= 0 ? 0 : v >= 1 ? 1 : v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

const PANELS = {
  gameboy: { label: "Reflective STN LCD, 4 shades (Game Boy, 1989)", kind: "lcd", res: [160, 144], levels: 4,
    paper: "BCC98E", ink: "12301A", housing: "8F9A84", aperture: 0.88, shape: "square", gapLight: 0.04, shadow: 0.35, shadowOff: 0.35, crosstalk: 0.03, inkMax: 0.95 },
  pocket_lcd: { label: "Pocket LCD TV, black and white (passive STN)", kind: "lcd", res: [120, 90], levels: 8,
    paper: "B9BDB2", ink: "26292E", housing: "2A2A2A", aperture: 0.9, shape: "square", gapLight: 0.03, shadow: 0.25, shadowOff: 0.3, crosstalk: 0.1, inkMax: 0.92 },
  laptop_stn: { label: "Laptop STN LCD, blue on grey (late 1980s)", kind: "lcd", res: [640, 400], levels: 8,
    paper: "B4BEC0", ink: "1E2A64", housing: "303030", aperture: 0.92, shape: "square", gapLight: 0.02, shadow: 0.1, shadowOff: 0.3, crosstalk: 0.15, inkMax: 0.85 },
  lcd_colour: { label: "Colour LCD pocket TV (late 1980s)", kind: "lcdcolour", res: [160, 120], levels: 16,
    backlight: "F2F5FF", black: 0.07, housing: "1C1C1C", aperture: 0.8, delta: true, crosstalk: 0.05 },
  plasma_t3100: { label: "Orange gas plasma, on/off (Toshiba T3100, 1986)", kind: "emit", res: [640, 400], levels: 2,
    on: "FF6A14", off: "1A0602", housing: "141414", aperture: 0.78, shape: "round", glow: 0.12, glowR: 0.9 },
  plasma_t3100sx: { label: "Orange gas plasma, 16 shades (Toshiba T3100SX)", kind: "emit", res: [640, 480], levels: 16,
    on: "FF6A14", off: "1A0602", housing: "141414", aperture: 0.78, shape: "round", glow: 0.12, glowR: 0.9 },
  plato: { label: "Orange plasma panel, 512 x 512 (PLATO IV, 1972)", kind: "emit", res: [512, 512], levels: 2,
    on: "FF7A1E", off: "200A04", housing: "1A1814", aperture: 0.7, shape: "round", glow: 0.1, glowR: 0.9 },
  led_red: { label: "Red LED dot matrix sign", kind: "emit", res: [96, 48], levels: 4,
    on: "FF1A0A", off: "2A0604", housing: "080808", aperture: 0.68, shape: "round", glow: 0.25, glowR: 0.7 },
  led_amber: { label: "Amber LED dot matrix sign (AlInGaP, 1990s)", kind: "emit", res: [128, 48], levels: 4,
    on: "FFA010", off: "241404", housing: "080808", aperture: 0.68, shape: "round", glow: 0.22, glowR: 0.7 },
  flipdisc: { label: "Flip-disc sign (Ferranti-Packard)", kind: "disc", res: [112, 56], levels: 2,
    on: "E8F04A", off: "141414", housing: "0A0A0A", aperture: 0.88, shape: "round", dither: "fs" },
};

function bayer(x, y) { const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; return (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5; }
function quant(a, w, h, L, dither) {
  if (L >= 256) return a;
  const q = L - 1;
  if (dither === "fs") {
    const e = Float32Array.from(a);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, v = Math.max(0, Math.min(1, e[i])), r = Math.round(v * q) / q, err = e[i] - r; a[i] = r;
      if (x + 1 < w) e[i + 1] += err * 7 / 16; if (y + 1 < h) { if (x > 0) e[i + w - 1] += err * 3 / 16; e[i + w] += err * 5 / 16; if (x + 1 < w) e[i + w + 1] += err / 16; }
    }
    return a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, d = dither === "bayer" ? bayer(x, y) / q : 0; a[i] = Math.max(0, Math.min(q, Math.round((a[i] + d) * q))) / q; }
  return a;
}

/* d: { panel: key, res, levels, dither, contrast, brightness, gamma, fill ('fit' | 'stretch'), and any PANELS field } */
function panel(grid, g, PW, PH, d) {
  const p = Object.assign({}, PANELS[d.panel] || PANELS.gameboy, d.panelOpts || {});
  for (const k of ["res", "levels", "dither", "aperture", "glow", "shadow", "crosstalk"]) if (d[k] !== undefined && d[k] !== "") p[k] = d[k];
  const [pw, ph] = p.res, L = Math.max(2, p.levels || 2);
  const picAsp = PW / PH, panAsp = pw / ph, stretch = d.fill === "stretch";
  // crop the picture to the panel's shape (centred), then average it onto the cells
  let cx0 = 0, cy0 = 0, cw = g.ns, chh = g.lines;
  if (!stretch) { if (panAsp < picAsp) { cw = Math.round(g.ns * panAsp / picAsp); cx0 = Math.round((g.ns - cw) / 2); } else { chh = Math.round(g.lines * picAsp / panAsp); cy0 = Math.round((g.lines - chh) / 2); } }
  const crop = grid.map(pl => { const a = new Float32Array(cw * chh); for (let y = 0; y < chh; y++) a.set(pl.subarray((cy0 + y) * g.ns + cx0, (cy0 + y) * g.ns + cx0 + cw), y * cw); return a; });
  const cells = crop.map(pl => VC.resize(pl, cw, chh, pw, ph));
  const con = d.contrast !== undefined ? d.contrast : 1, bri = d.brightness || 0, gam = d.gamma || 1;
  const adj = v => { let x = (v - 0.5) * con + 0.5 + bri; x = x < 0 ? 0 : x > 1 ? 1 : x; return gam === 1 ? x : Math.pow(x, gam); };
  const N = pw * ph, colour = p.kind === "lcdcolour";
  // the set's contrast and brightness knobs set so the picture uses the panel's few levels: a 1-99% stretch [EST]
  if (d.autoLevels !== false) {
    const Y = new Float32Array(N); for (let i = 0; i < N; i++) Y[i] = 0.299 * cells[0][i] + 0.587 * cells[1][i] + 0.114 * cells[2][i];
    const srt = Float32Array.from(Y).sort(), lo = srt[Math.floor(N * 0.01)], hi = srt[Math.floor(N * 0.99)], k = hi - lo > 0.05 ? 1 / (hi - lo) : 1;
    for (const pl of cells) for (let i = 0; i < N; i++) pl[i] = Math.max(0, Math.min(1, (pl[i] - lo) * k));
  }
  let V; // per cell: drive 0..1 (mono) or three planes
  if (colour) V = cells.map(pl => quant(Float32Array.from(pl, adj), pw, ph, L, p.dither));
  else { const Y = new Float32Array(N); for (let i = 0; i < N; i++) Y[i] = adj(0.299 * cells[0][i] + 0.587 * cells[1][i] + 0.114 * cells[2][i]); V = [quant(Y, pw, ph, L, p.dither)]; }
  // passive-matrix crosstalk: every cell picks up a little of the drive on its row and column [EST form and amounts]
  if (p.crosstalk) for (const pl of V) {
    const rm = new Float32Array(ph), cm = new Float32Array(pw);
    const drive = p.kind === "lcd" ? (v => 1 - v) : (v => v);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const v = drive(pl[y * pw + x]); rm[y] += v / pw; cm[x] += v / ph; }
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const i = y * pw + x, add = p.crosstalk * 0.5 * (rm[y] + cm[x]); pl[i] = p.kind === "lcd" ? Math.max(0, pl[i] - add) : Math.min(1, pl[i] + add * 0.3); }
  }
  // where the panel sits in the output
  let ax = 0, ay = 0, aw = PW, ah = PH;
  if (!stretch) { if (panAsp < picAsp) { aw = PH * panAsp; ax = (PW - aw) / 2; } else { ah = PW / panAsp; ay = (PH - ah) / 2; } }
  const cpx = aw / pw, cpy = ah / ph, cellPx = Math.min(cpx, cpy), ap = p.aperture || 0.85;
  const housing = hexL(p.housing || "101010");
  const out = [0, 1, 2].map(() => new Float32Array(PW * PH));
  const lcdPaper = p.paper ? hexL(p.paper) : null, lcdInk = p.ink ? hexL(p.ink) : null;
  const onC = p.on ? hexL(p.on) : null, offC = p.off ? hexL(p.off) : null, bl = p.backlight ? hexL(p.backlight) : null;
  const round = p.shape === "round";
  const cover = (fu, fv, a) => { // fraction of the output pixel inside the cell's lit area (soft edge one output pixel wide)
    const du = (fu - 0.5) * cpx, dv = (fv - 0.5) * cpy, half = a * cellPx / 2;
    const dist = round ? Math.hypot(du, dv) - half : Math.max(Math.abs(du) - a * cpx / 2, Math.abs(dv) - a * cpy / 2);
    if (cellPx < 2) return round ? Math.PI / 4 * a * a : a * a; // cells smaller than two pixels: their gaps blend in
    return Math.max(0, Math.min(1, 0.5 - dist));
  };
  // LCD: the dark cells cast a soft shadow on the reflector behind the glass, down and to the right [EST]
  let shadowMap = null;
  if (p.kind === "lcd" && p.shadow) { shadowMap = Float32Array.from(V[0], v => (1 - v) * (p.inkMax || 1)); CAM.blur2D(shadowMap, pw, ph, 0.6, 0.6); }
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const o = y * PW + x, u = (x + 0.5 - ax) / cpx, v = (y + 0.5 - ay) / cpy;
      if (u < 0 || v < 0 || u >= pw || v >= ph) { for (let c = 0; c < 3; c++) out[c][o] = housing[c]; continue; }
      const j = Math.min(ph - 1, Math.floor(v)), fv = v - j;
      if (colour) { // three sub-cells (R, G, B) per cell; delta layout shifts alternate rows by half a cell [EST]
        const uu = p.delta && (j & 1) ? u + 0.5 : u, i3 = Math.floor(uu * 3), sc = ((i3 % 3) + 3) % 3, ii = Math.min(pw - 1, Math.max(0, Math.floor(uu))), fs = uu * 3 - i3;
        if (cpx < 6) { // sub-cells under two pixels wide merge into the cell's colour
          const ci = j * pw + Math.min(pw - 1, Math.floor(u)), cvm = cover(u - Math.floor(u), fv, ap);
          for (let c = 0; c < 3; c++) out[c][o] = bl[c] * (p.black + (1 - p.black) * V[c][ci]) * 0.7 * cvm + bl[c] * p.black * 0.15;
          continue;
        }
        const cv = (() => { const du = (fs - 0.5) * cpx / 3, dv = (fv - 0.5) * cpy; if (cellPx < 2) return ap * ap; return Math.max(0, Math.min(1, 0.5 - Math.max(Math.abs(du) - ap * cpx / 6, Math.abs(dv) - ap * cpy / 2))); })();
        const val = V[sc][j * pw + ii], t = p.black + (1 - p.black) * val;
        for (let c = 0; c < 3; c++) out[c][o] = 0;
        out[sc][o] = 3 * bl[sc] * t * cv * 0.7; // three sub-cells share the area; 0.7: panel transmission [EST]
        for (let c = 0; c < 3; c++) out[c][o] += bl[c] * p.black * 0.15;
        continue;
      }
      const i = Math.min(pw - 1, Math.floor(u)), fu = u - i, val = V[0][j * pw + i], cv = cover(fu, fv, ap);
      if (p.kind === "lcd") {
        const ink = (1 - val) * (p.inkMax || 1);
        let sh = 1;
        if (shadowMap) { const su = u - p.shadowOff, sv = v - p.shadowOff * 1.2; if (su >= 0 && sv >= 0) { const si = Math.min(pw - 1, Math.floor(su)), sj = Math.min(ph - 1, Math.floor(sv)); sh = 1 - p.shadow * shadowMap[sj * pw + si]; } }
        for (let c = 0; c < 3; c++) {
          const paper = lcdPaper[c] * sh, cell = paper * (1 - ink) + lcdInk[c] * ink, gap = Math.min(1, paper * (1 + (p.gapLight || 0)));
          out[c][o] = cell * cv + gap * (1 - cv);
        }
      } else if (p.kind === "disc") { // a disc shows one face or the other; a little shading across the disc [EST]
        const shade = 0.85 + 0.15 * (1 - fv);
        for (let c = 0; c < 3; c++) out[c][o] = (val > 0.5 ? onC[c] * shade : offC[c]) * cv + housing[c] * (1 - cv);
      } else {
        for (let c = 0; c < 3; c++) out[c][o] = (offC[c] + (onC[c] - offC[c]) * val) * cv + housing[c] * (1 - cv);
      }
    }
  }
  // emissive cells light the faceplate around them [EST]
  if (p.glow) for (const pl of out) { const b = Float32Array.from(pl); CAM.blur2D(b, PW, PH, p.glowR * cellPx, p.glowR * cellPx); for (let i = 0; i < pl.length; i++) pl[i] += p.glow * b[i]; }
  for (const pl of out) for (let i = 0; i < pl.length; i++) pl[i] = enc(pl[i]);
  return out;
}
const api = { panel, PANELS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
