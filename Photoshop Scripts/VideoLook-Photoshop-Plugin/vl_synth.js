/* VideoLook video synthesisers and scan processors (v1.4). Picture-source kinds that remake the picture the way the
 * artists' video instruments of 1969-75 did. All work on the standard's grid and return R'G'B'.
 *
 *   'scan'      Rutt/Etra scan processor (Steve Rutt and Bill Etra, 1972-73; WNET TV Lab). The luminance of each scan
 *               line drives the vertical deflection of an X-Y monitor: "brightness becomes elevation" [SEC Video History
 *               Project; MIT Media Lab]. Controls on the real unit included height, width, depth, rotation, position and
 *               brightness [SEC]; the monitor was then re-shot by a camera [SEC]. Line count, trace width and the
 *               dimming of fast vertical strokes (the beam moves further in the same time) are [EST].
 *   'wobble'    Paik/Abe style scan modulation (Nam June Paik's scan experiments from 1963; Paik/Abe synthesiser at WGBH,
 *               1969-70). Audio waveforms drive the deflection; multiples of the field rate give "the most obvious and
 *               symmetrical distortions" [SEC]. Paik also pushed the scan about with a magnet [SEC]. The beam keeps its
 *               speed, so where the raster is squeezed it is brighter and where it is stretched it is dimmer [DERIVED].
 *   'colorize'  Colourising by density slicing: Scanimate's colouriser "operates on a set of five gray scale values; each
 *               gray level has separate controls over red, green and blue" [SEC scanimate.com]; Sandin Image Processor
 *               modules: differentiator (edge emphasis), comparator, amplitude classifier [SEC]. Colours are [EST].
 *   'feedback'  Video feedback: a camera pointed at its own monitor, the loop zoomed and turned, the classic studio
 *               experiment of the period [SEC general; every amount EST].
 */
"use strict";
const VC = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;

const hex = h => [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function lumaPlane(grid) { const n = grid[0].length, Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = lum(grid[0][i], grid[1][i], grid[2][i]); return Y; }

// accumulate value v at (X, Y) with bilinear weights
function splat(acc, ns, nl, X, Y, v) {
  const x0 = Math.floor(X), y0 = Math.floor(Y), fx = X - x0, fy = Y - y0;
  if (x0 >= 0 && x0 < ns && y0 >= 0 && y0 < nl) acc[y0 * ns + x0] += v * (1 - fx) * (1 - fy);
  if (x0 + 1 >= 0 && x0 + 1 < ns && y0 >= 0 && y0 < nl) acc[y0 * ns + x0 + 1] += v * fx * (1 - fy);
  if (x0 >= 0 && x0 < ns && y0 + 1 >= 0 && y0 + 1 < nl) acc[(y0 + 1) * ns + x0] += v * (1 - fx) * fy;
  if (x0 + 1 >= 0 && x0 + 1 < ns && y0 + 1 >= 0 && y0 + 1 < nl) acc[(y0 + 1) * ns + x0 + 1] += v * fx * fy;
}
function rowSample(Y, ns, nl, x, yf) { // bilinear along a fractional row
  const y0 = Math.max(0, Math.min(nl - 1, Math.floor(yf))), y1 = Math.min(nl - 1, y0 + 1), f = Math.max(0, Math.min(1, yf - y0));
  return Y[y0 * ns + x] * (1 - f) + Y[y1 * ns + x] * f;
}

/* ---------------- Rutt/Etra ---------------- */
function scan(grid, g, o) {
  const ns = g.ns, nl = g.lines, asp = o.aspect > 0 ? o.aspect : 4 / 3;
  const Y = lumaPlane(grid);
  const sm = o.smooth !== undefined ? o.smooth : 1; if (sm) CAM.blur2D(Y, ns, nl, sm * ns / 200, sm * nl / 200); // the input camera's softness [EST]
  const N = Math.max(8, Math.round(o.lines || 64));
  const height = o.height !== undefined ? o.height : 0.18, spread = o.spread !== undefined ? o.spread : 0.85, width = o.width || 1;
  const rot = (o.rotate || 0) * Math.PI / 180, cs = Math.cos(rot), sn = Math.sin(rot);
  const skew = o.skew || 0; // lines further down drawn wider: a cheap "depth" (perspective) [EST]
  const zMod = o.zMod !== undefined ? o.zMod : 0.6, invert = o.invert ? -1 : 1, thr = o.blank || 0;
  const acc = new Float32Array(ns * nl), step = Math.max(1, Math.round(ns / 640));
  const toX = px => (px / asp + 0.5) * ns, toY = py => (py + 0.5) * nl;
  for (let k = 0; k < N; k++) {
    const yb = (k + 0.5) / N, row = yb * nl - 0.5, persp = 1 + skew * (yb - 0.5);
    let pX = null, pY = null;
    for (let x = 0; x < ns; x += step) {
      const L = rowSample(Y, ns, nl, x, row);
      const px = (x / (ns - 1) - 0.5) * asp * width * persp, py = (yb - 0.5) * spread - invert * height * L;
      const rx = cs * px - sn * py + (o.dx || 0) * asp, ry = sn * px + cs * py + (o.dy || 0);
      const X = toX(rx), Yp = toY(ry), I = L < thr ? 0 : (1 - zMod) + zMod * L;
      if (pX !== null && I > 0) {
        const len = Math.hypot(X - pX, Yp - pY), nst = Math.max(1, Math.ceil(len * 1.5)), e = I * step / nst;
        for (let s = 1; s <= nst; s++) { const t = s / nst; splat(acc, ns, nl, pX + (X - pX) * t, pY + (Yp - pY) * t, e); }
      }
      pX = X; pY = Yp;
    }
  }
  const spot = o.spot !== undefined ? o.spot : 0.8;
  CAM.blur2D(acc, ns, nl, spot * ns / 720, spot * nl / 576);
  const gain = o.gain !== undefined ? o.gain : 1.6, tint = o.tint ? hex(o.tint) : [1, 1, 1];
  return tint.map(t => Float32Array.from(acc, v => Math.min(1.09, v * gain * t)));
}

/* ---------------- Paik/Abe scan modulation ---------------- */
function wobble(grid, g, o) {
  const ns = g.ns, nl = g.lines, n = ns * nl;
  const fH = o.freqH || 0, fV = o.freqV || 0, aH = (o.ampH || 0) * ns, aV = (o.ampV || 0) * nl;
  const ph = (o.phase || 0) * Math.PI / 180, wave = o.wave || "sine";
  const W = t => wave === "square" ? (Math.sin(t) >= 0 ? 1 : -1) : wave === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(t)) : Math.sin(t);
  const mg = o.magnet && o.magnet.strength ? o.magnet : null;
  const mx = mg ? (mg.x !== undefined ? mg.x : 0.5) * ns : 0, my = mg ? (mg.y !== undefined ? mg.y : 0.5) * nl : 0, mR = mg ? (mg.radius || 0.3) : 0;
  const asp = o.aspect > 0 ? o.aspect : 4 / 3, sx = ns / asp; // samples per picture height, for round distances
  const out = [0, 1, 2].map(() => new Float32Array(n));
  for (let r = 0; r < nl; r++) {
    const tL = VC.absLine(r, g) * g.tLine;
    for (let x = 0; x < ns; x++) {
      const t = tL + (g.a0 + x) / g.fs;
      let X = x + (aH ? aH * W(2 * Math.PI * fH * t + ph) : 0), Yp = r + (aV ? aV * W(2 * Math.PI * fV * t) : 0);
      if (mg) { // a magnet beside the neck: the beam is twisted round a point and pushed aside [EST form]
        const dx = (X - mx) / sx, dy = (Yp - my) / nl, d2 = dx * dx + dy * dy, f = Math.exp(-d2 / (mR * mR));
        const a = mg.strength * f, c = Math.cos(a), s = Math.sin(a);
        X = mx + (c * dx - s * dy) * sx; Yp = my + (s * dx + c * dy) * nl;
      }
      const i = r * ns + x;
      for (let c = 0; c < 3; c++) splat(out[c], ns, nl, X, Yp, grid[c][i]);
    }
  }
  for (const p of out) { CAM.blur2D(p, ns, nl, 0.6, 0.55); for (let i = 0; i < n; i++) if (p[i] > 1.09) p[i] = 1.09; }
  return out;
}

/* ---------------- colouriser ---------------- */
const COLOURSETS = { // five-level sets for the colouriser, dark to light [EST: chosen to resemble period work]
  scanimate: ["0A0A3C", "1E5AD2", "28C8A0", "F0DC28", "FF5A3C"],
  sandin: ["000000", "7814A0", "E6286E", "FFA01E", "FFFFC8"],
  thermalish: ["000014", "460078", "C81E1E", "FFA000", "FFFFFF"],
  acid: ["002800", "00A050", "F0F000", "FF00B4", "FFFFFF"],
  mono3: ["000000", "808080", "FFFFFF"],
};
function colorize(grid, g, o) {
  const ns = g.ns, nl = g.lines, n = ns * nl, Y = lumaPlane(grid);
  if (o.contrast && o.contrast !== 1) for (let i = 0; i < n; i++) Y[i] = Math.max(0, Math.min(1, (Y[i] - 0.5) * o.contrast + 0.5 + (o.brightness || 0)));
  const cols = (o.colours || COLOURSETS[o.colourSet] || COLOURSETS.scanimate).map(c => typeof c === "string" ? hex(c) : c);
  const N = cols.length, blend = o.blend || 0, out = [0, 1, 2].map(() => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(0.9999, Y[i])) * N, k = Math.floor(v), f = v - k;
    // hard slices, or a soft hand-over near each threshold
    let a = k, b = k, w = 0;
    if (blend > 0) { const d = f - 0.5, half = blend * 0.5; if (d > 0.5 - half && k + 1 < N) { b = k + 1; w = (d - (0.5 - half)) / (2 * half); } else if (d < -0.5 + half && k > 0) { b = k - 1; w = ((-0.5 + half) - d) / (2 * half); } }
    for (let c = 0; c < 3; c++) out[c][i] = cols[a][c] * (1 - w) + cols[b][c] * w;
  }
  // differentiator: edges from the horizontal rate of change (the Sandin module worked along the line) [SEC module; amount EST]
  if (o.edge) {
    const k = o.edge, ec = o.edgeColour ? hex(o.edgeColour) : [1, 1, 1];
    const Ye = Float32Array.from(Y); CAM.blur2D(Ye, ns, nl, 1.2, 0.8); // the module's limited bandwidth keeps it off the noise [EST]
    for (let r = 0; r < nl; r++) for (let x = 1; x < ns - 1; x++) {
      const i = r * ns + x, d = Math.abs(Ye[i + 1] - Ye[i - 1]) * k * 6;
      if (d > 0.02) for (let c = 0; c < 3; c++) out[c][i] = o.edgeOnly ? Math.min(1, d) * ec[c] : Math.min(1.09, out[c][i] + d * ec[c]);
      else if (o.edgeOnly) for (let c = 0; c < 3; c++) out[c][i] = 0;
    }
    if (o.edgeOnly) for (let c = 0; c < 3; c++) for (let x of [0, ns - 1]) for (let r = 0; r < nl; r++) out[c][r * ns + x] = 0;
  }
  if (o.mix) for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) out[c][i] = out[c][i] * (1 - o.mix) + grid[c][i] * o.mix;
  // after a scan processor the black between the traces stays black (the slicer's lowest level keyed out) [EST]
  if (o.blackBelow) for (let i = 0; i < n; i++) if (Y[i] < o.blackBelow) { const f = Y[i] / o.blackBelow; for (let c = 0; c < 3; c++) out[c][i] *= f * f; }
  return out;
}

/* ---------------- video feedback ---------------- */
function rgbHueRotate(r, g, b, a) { // rotate hue about the grey axis
  const c = Math.cos(a), s = Math.sin(a), k = (1 - c) / 3, q = Math.sqrt(1 / 3) * s;
  return [r * (c + k) + g * (k - q) + b * (k + q), r * (k + q) + g * (c + k) + b * (k - q), r * (k - q) + g * (k + q) + b * (c + k)];
}
function feedback(grid, g, o) {
  const ns = g.ns, nl = g.lines, n = ns * nl, asp = o.aspect > 0 ? o.aspect : 4 / 3;
  const it = Math.max(1, Math.min(40, Math.round(o.iterations || 14))), zoom = o.zoom || 0.92, rot = (o.rotate || 0) * Math.PI / 180;
  const gain = o.gain !== undefined ? o.gain : 1.0, hue = (o.hueShift || 0) * Math.PI / 180, key = o.key || 0, mix = o.loopMix !== undefined ? o.loopMix : 0.6;
  const cx = (0.5 + (o.dx || 0)) * ns, cy = (0.5 + (o.dy || 0)) * nl, cs = Math.cos(rot), sn = Math.sin(rot), sx = ns / asp;
  let F = grid.map(p => Float32Array.from(p));
  const Ys = lumaPlane(grid);
  // the monitor's picture is seen by the camera smaller (zoom < 1 = pulled back) and turned: sample the previous loop at the
  // inverse position
  const mapX = new Float32Array(n), mapY = new Float32Array(n);
  for (let y = 0; y < nl; y++) for (let x = 0; x < ns; x++) {
    const u = (x - cx) / sx, v = (y - cy) / nl, a = (cs * u + sn * v) / zoom, b = (-sn * u + cs * v) / zoom;
    mapX[y * ns + x] = cx + a * sx; mapY[y * ns + x] = cy + b * nl;
  }
  for (let k = 0; k < it; k++) {
    const G = [0, 1, 2].map(() => new Float32Array(n));
    for (let i = 0; i < n; i++) {
      const X = mapX[i], Y = mapY[i];
      if (X < 0 || Y < 0 || X > ns - 1 || Y > nl - 1) continue;
      const x0 = X | 0, y0 = Y | 0, fx = X - x0, fy = Y - y0, x1 = Math.min(ns - 1, x0 + 1), y1 = Math.min(nl - 1, y0 + 1);
      let rgb = [0, 1, 2].map(c => { const p = F[c]; return (p[y0 * ns + x0] * (1 - fx) + p[y0 * ns + x1] * fx) * (1 - fy) + (p[y1 * ns + x0] * (1 - fx) + p[y1 * ns + x1] * fx) * fy; });
      if (hue) rgb = rgbHueRotate(rgb[0], rgb[1], rgb[2], hue);
      for (let c = 0; c < 3; c++) G[c][i] = rgb[c] * gain;
    }
    for (const p of G) CAM.blur2D(p, ns, nl, 0.5, 0.4); // each pass through camera and monitor softens a little [EST]
    // the live picture is keyed over the loop: where the live picture is darker than the key level the loop shows [EST]
    for (let i = 0; i < n; i++) {
      const w = key > 0 ? Math.max(0, Math.min(1, (Ys[i] - key) / 0.08 + 0.5)) : 0;
      for (let c = 0; c < 3; c++) { const live = grid[c][i], loop = G[c][i]; F[c][i] = key > 0 ? live * w + loop * (1 - w) : live * (1 - mix) + loop * mix; }
    }
  }
  for (const p of F) for (let i = 0; i < n; i++) if (p[i] > 1.09) p[i] = 1.09;
  return F;
}

/* ---------------- vector display (v1.5) ----------------
 * A vector (X-Y) display steers the beam directly and sets its brightness at each point; objects are line segments
 * stored by their endpoints and redrawn 30-40 times a second [SEC Wikipedia Vector monitor]. The Vectrex drew with
 * analogue X and Y integrators and a separate brightness signal [SEC]. A photograph has no display list, so the picture
 * is turned into one: contour lines of its smoothed brightness at a few levels, chained into strokes and simplified to
 * straight segments [EST: VideoLook's own vectoriser]. The beam lingers at each corner, which shows as a brighter dot
 * [OBS on vector games; amount EST]; long fast strokes are dimmer than short ones [DERIVED: constant beam current]. */
function contourSegments(Y, cw, ch, level) {
  const seg = [];
  const at = (x, y) => Y[y * cw + x];
  const lerp = (a, b) => (level - a) / (b - a || 1e-6);
  for (let y = 0; y < ch - 1; y++) for (let x = 0; x < cw - 1; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = [x + lerp(a, b), y], R = [x + 1, y + lerp(b, c)], B = [x + lerp(d, c), y + 1], L = [x, y + lerp(a, d)];
    const add = (p, q) => seg.push([p[0], p[1], q[0], q[1]]);
    switch (idx) {
      case 1: case 14: add(L, B); break; case 2: case 13: add(B, R); break; case 3: case 12: add(L, R); break;
      case 4: case 11: add(T, R); break; case 6: case 9: add(T, B); break; case 7: case 8: add(L, T); break;
      case 5: add(L, T); add(B, R); break; case 10: add(T, R); add(L, B); break;
    }
  }
  return seg;
}
function chainSegments(seg) { // join segments end to end into polylines
  const key = (x, y) => Math.round(x * 64) + "," + Math.round(y * 64), ends = new Map(), used = new Uint8Array(seg.length), lines = [];
  seg.forEach((s, i) => { for (const k of [key(s[0], s[1]), key(s[2], s[3])]) { if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  for (let i = 0; i < seg.length; i++) {
    if (used[i]) continue; used[i] = 1;
    const pts = [[seg[i][0], seg[i][1]], [seg[i][2], seg[i][3]]];
    for (const dir of [1, 0]) {
      let grow = true;
      while (grow) {
        grow = false; const p = dir ? pts[pts.length - 1] : pts[0], cand = ends.get(key(p[0], p[1])) || [];
        for (const j of cand) if (!used[j]) { used[j] = 1; const s = seg[j], k0 = key(s[0], s[1]) === key(p[0], p[1]), q = k0 ? [s[2], s[3]] : [s[0], s[1]]; if (dir) pts.push(q); else pts.unshift(q); grow = true; break; }
      }
    }
    lines.push(pts);
  }
  return lines;
}
function simplify(pts, tol) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6;
  let mi = 0, md = 0; for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
  if (md <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, mi + 1), tol).slice(0, -1).concat(simplify(pts.slice(mi), tol));
}
function vector(grid, g, o) {
  const ns = g.ns, nl = g.lines, asp = o.aspect > 0 ? o.aspect : 4 / 3;
  const Yf = lumaPlane(grid);
  const cw = Math.max(16, Math.round(o.cells || 96)), ch = Math.max(12, Math.round(cw / asp));
  const Y = VC.resize(Yf, ns, nl, cw, ch); CAM.blur2D(Y, cw, ch, o.smooth !== undefined ? o.smooth : 1, o.smooth !== undefined ? o.smooth : 1);
  const nLev = Math.max(1, Math.round(o.contours || 4)), tol = o.simplify !== undefined ? o.simplify : 0.6, minLen = o.minLen !== undefined ? o.minLen : 3;
  const sets = o.colourLevels ? (o.colours || ["FF2020", "20FF20", "4060FF", "FFFF20", "FF20FF", "20FFFF", "FFFFFF"]).map(hex) : null;
  const tint = o.tint ? hex(o.tint) : [1, 1, 1];
  const acc = [0, 1, 2].map(() => new Float32Array(ns * nl));
  const sx = ns / (cw - 1), sy = nl / (ch - 1), dwell = o.dwell !== undefined ? o.dwell : 2.5, inten = o.intensity || 1;
  for (let li = 0; li < nLev; li++) {
    const level = (li + 1) / (nLev + 1), col = sets ? sets[li % sets.length] : tint, b = inten * (o.levelBright ? 0.5 + 0.5 * level : 1);
    for (const line of chainSegments(contourSegments(Y, cw, ch, level))) {
      let len = 0; for (let k = 1; k < line.length; k++) len += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
      if (len < minLen) continue;
      const pts = simplify(line, tol);
      for (let k = 0; k < pts.length; k++) {
        const X = pts[k][0] * sx, Yp = pts[k][1] * sy;
        for (let c = 0; c < 3; c++) splat(acc[c], ns, nl, X, Yp, dwell * b * col[c]); // the beam lingers at each vertex
        if (k === 0) continue;
        const X0 = pts[k - 1][0] * sx, Y0 = pts[k - 1][1] * sy, L = Math.hypot(X - X0, Yp - Y0), nst = Math.max(1, Math.ceil(L * 1.5));
        const e = b * L / nst * (o.speedDim ? Math.min(1, 40 / Math.max(L, 1)) * 0.5 + 0.5 : 1);
        for (let s = 1; s <= nst; s++) { const t = s / nst; for (let c = 0; c < 3; c++) splat(acc[c], ns, nl, X0 + (X - X0) * t, Y0 + (Yp - Y0) * t, e * col[c]); }
      }
    }
  }
  const spot = o.beam !== undefined ? o.beam : 0.9;
  for (const p of acc) { CAM.blur2D(p, ns, nl, spot * ns / 720, spot * nl / 576); for (let i = 0; i < p.length; i++) p[i] = Math.min(1.09, p[i] * (o.gain || 1.4)); }
  return acc;
}

const KINDS = { scan: "Rutt/Etra scan processor", wobble: "Paik/Abe scan modulation", colorize: "Colouriser (density slicing)", feedback: "Video feedback", vector: "Vector display (contour strokes)" };
function synth(grid, g, o) {
  o = o || {};
  let out = grid;
  if (o.kind === "scan") out = scan(grid, g, o);
  else if (o.kind === "wobble") out = wobble(grid, g, o);
  else if (o.kind === "colorize") out = colorize(grid, g, o);
  else if (o.kind === "feedback") out = feedback(grid, g, o);
  else if (o.kind === "vector") out = vector(grid, g, o);
  // a second instrument patched after the first (a colouriser after the scan processor, as in the studios) [SEC practice]
  if (o.post && o.post.kind && KINDS[o.post.kind]) out = synth(out, g, Object.assign({ aspect: o.aspect }, o.post));
  return out;
}
const api = { synth, KINDS, COLOURSETS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
