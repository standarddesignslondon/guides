/* VideoLook pipeline: document picture -> standard grid -> stages -> back to document size. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const DSP = (typeof require !== "undefined") ? require("./vl_display.js") : globalThis.VLDisplay;
const REC = (typeof require !== "undefined") ? require("./vl_record.js") : globalThis.VLRecord;
const TR = (typeof require !== "undefined") ? require("./vl_transfer.js") : globalThis.VLTransfer;
const TXT = (typeof require !== "undefined") ? require("./vl_text.js") : globalThis.VLText;
function transpose(p, w, h) { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x * h + y] = p[y * w + x]; return o; }

/* settings = {
 *   aspect: 4/3 | 5/4 | 16/9, fit: 'crop' | 'matte', shiftX, shiftY (doc px),
 *   standard: 'PAL-I' ...,
 *   enabled: { camera, encoder, channel, recording, transfer, decoder, display, view },
 *   encoder: {...}, channel: {...}, decoder: {...}, view: { mode: 'grab' | ... }, seed
 * }
 * doc = { w, h, planes:[R,G,B] (sRGB code values 0..1) }
 */
function pictureRect(W, H, aspect) {
  // largest rect of the given aspect inside the document, centred
  let pw = W, ph = Math.round(W / aspect);
  if (ph > H) { ph = H; pw = Math.round(H * aspect); }
  return { x: (W - pw) >> 1, y: (H - ph) >> 1, w: pw, h: ph };
}
function cutRegion(planes, W, H, rect, dx, dy) {
  // copy rect from the document, shifted by (dx, dy) doc pixels (+x right, +y down); outside = black
  return planes.map(p => {
    const a = new Float32Array(rect.w * rect.h);
    for (let y = 0; y < rect.h; y++) {
      const sy = rect.y + y - dy; if (sy < 0 || sy >= H) continue;
      for (let x = 0; x < rect.w; x++) { const sx = rect.x + x - dx; if (sx < 0 || sx >= W) continue; a[y * rect.w + x] = p[sy * W + sx]; }
    }
    return a;
  });
}
function run(doc, s, winDoc) {
  // winDoc: optional {left, top, right, bottom} in document pixels (preview); native: output at the standard's own size
  const W = doc.w, H = doc.h;
  const en = Object.assign({ camera: true, encoder: true, channel: true, recording: true, transfer: true, decoder: true, display: true, view: true, overlay: true }, s.enabled || {});
  const aspect = s.aspect || 4 / 3;
  const rect = pictureRect(W, H, aspect);
  const gs = V.geometry(s.standard || "PAL-I");
  let g = gs;
  const region = cutRegion(doc.planes, W, H, rect, s.shiftX || 0, s.shiftY || 0);
  // mechanical 30-line television scanned in vertical lines: work on the transposed picture [SEC: vertical scanning]
  const toGrid = (planes) => gs.vertical ? planes.map(p => V.resize(transpose(p, rect.w, rect.h), rect.h, rect.w, gs.ns, gs.lines)) : planes.map(p => V.resize(p, rect.w, rect.h, gs.ns, gs.lines));
  let grid = toGrid(region);
  const seed = s.seed || 1;
  const stages = []; // what actually ran, reported back to the panel
  // implied motion: doc pixels per field -> grid samples per field; optional selection = the moving subject
  const mo = s.motion || {};
  let v = null, mask = null;
  if (mo.px) {
    const a = (mo.angle || 0) * Math.PI / 180;
    v = [mo.px * Math.cos(a) * gs.ns / rect.w, mo.px * Math.sin(a) * gs.lines / rect.h];
    if (gs.vertical) v = [v[1] * gs.ns / gs.lines * rect.w / rect.h, v[0] * gs.lines / gs.ns * rect.h / rect.w];
    if (mo.selection && doc.mask) mask = toGrid(cutRegion([doc.mask], W, H, rect, s.shiftX || 0, s.shiftY || 0))[0];
  }
  const tr = en.transfer && s.transfer && s.transfer.type && s.transfer.type !== "none" ? s.transfer : null;
  const ov = en.overlay && s.overlay && s.overlay.kind && s.overlay.kind !== "none" ? s.overlay : null;
  // subtitles: typeset lines (from Photoshop, or VideoLook's own dot font as a fallback), placed on the document, then
  // burned in on the film print, at the studio, or drawn by the set, depending on the style [see vl_text.js]
  const sub = ov && ov.kind === "subtitle" && !gs.vertical ? (() => {
    const st = TXT.subStyle(ov), sizePx = st.size * rect.h;
    if (st.edge === "cc") return { st };
    const italic = st.fauxItalic === "on" || (st.fauxItalic === "ifRoman" && !doc.subBitmaps);
    const bm = doc.subBitmaps || TXT.rasterFallback(TXT.subLines(ov), sizePx, italic);
    const pl = TXT.placeSubtitle(bm, W, H, rect, sizePx, st);
    return { st, pl, font: doc.subFont || "VideoLook dot font" };
  })() : null;
  const burnSub = (gridIn, gg) => {
    if (sub.st.edge === "cc") return TXT.closedCaptions(gridIn, gg, ov);
    const covG = V.resize(cutRegion([sub.pl.cov], W, H, rect, 0, 0)[0], rect.w, rect.h, gg.ns, gg.lines);
    const rG = sub.pl.rects.map(r => ({ x0: (r.x0 - rect.x) / rect.w * gg.ns, x1: (r.x1 - rect.x) / rect.w * gg.ns, y0: (r.y0 - rect.y) / rect.h * gg.lines, y1: (r.y1 - rect.y) / rect.h * gg.lines }));
    return TXT.subtitleComposite(gridIn, gg, sub.st, covG, rG, sub.st.size * gg.lines, gg.ns / (aspect * gg.lines), seed);
  };
  if (sub && sub.st.stage === "film" && sub.st.edge !== "cc") { grid = burnSub(grid, gs); stages.push("subtitles etched on the print (" + sub.font + ")"); }
  // 1. source: telecine (film) or camera
  if (tr && tr.type === "telecine") {
    if (v && gs.lineRate > 15700 && tr.pulldown === "mixed") grid = TR.interlace(grid, gs.ns, gs.lines, v, mask, 2.5); // 3:2 pulldown: 2 frames in 5 mix film frames [SEC]
    grid = TR.telecine(grid, gs, Object.assign({ seed }, tr)); stages.push("telecine");
  } else {
    const camOn = en.camera && s.camera && s.camera.type && CAM.CAMERAS[s.camera.type];
    const cam = camOn ? Object.assign({}, CAM.CAMERAS[s.camera.type], s.camera.overrides || {}) : null;
    if (cam && v) grid = TR.lagBlend(grid, gs.ns, gs.lines, v, mask, cam.lag || 0, cam.comet || 0);
    if (v && !gs.progressive && !gs.fieldSeq) grid = TR.interlace(grid, gs.ns, gs.lines, v, mask, 1);
    if (cam) { grid = CAM.camera(grid, gs, cam, Object.assign({ seed }, s.camera)); stages.push("camera"); }
  }
  if (sub && sub.st.stage === "studio" && sub.st.edge !== "cc") { grid = burnSub(grid, gs); stages.push("subtitles (" + sub.font + ")"); }
  if (ov && ov.kind === "timestamp") { grid = TXT.timestamp(grid, gs, ov); stages.push("date/time stamp"); }
  // 2. recording on the component grid (Betacam, D1, DV...)
  const rec = en.recording && s.recording && s.recording.format && REC.FORMATS[s.recording.format] ? s.recording : null;
  const ro = rec ? Object.assign({ seed }, rec) : null;
  if (rec && REC.isGridFormat(rec.format)) { grid = REC.recordGrid(grid, gs, rec.format, ro); stages.push(REC.FORMATS[rec.format].label); }
  const ch = s.channel || {};
  let decOpts = en.decoder ? Object.assign({}, s.decoder || {}) : {};
  const rcv = s.receiver || {};
  if (en.channel && ch.route === "dmac") {
    grid = TR.dmac(grid, gs, Object.assign({ seed }, ch)); stages.push("D-MAC"); // no composite stage at all
  } else if (gs.name === "MUSE") {
    grid = TR.muse(grid, gs, { seed, v, mask, snrDb: en.channel && ch.snrDb ? ch.snrDb : 46 }); stages.push("MUSE (Hi-Vision)");
  } else if (gs.fieldSeq && en.encoder) {
    // CBS field-sequential: each primary travels as its own black-and-white field; the set's colour wheel puts it back [SEC]
    const cols = TR.fieldSequential(grid, gs, v, mask);
    grid = cols.map((p, c) => { const e = V.encode([p, p, p], gs.name, {}); if (en.channel) V.channel(e, Object.assign({ seed: seed + c * 101 }, ch)); return V.decode(e, {})[0]; });
    stages.push("field-sequential colour (" + gs.name + ")"); if (en.channel) stages.push("channel");
  } else if (en.encoder || (rec && !REC.isGridFormat(rec.format))) {
    // Tape formats record a video signal, so a tape stage still gets one when "Standard & colour" is off:
    // a clean studio signal in the nearest broadcast standard, a clean comb decoder, and no transmission.
    let sg = gs;
    if (!en.encoder) {
      if (gs.colour === "COMP") { sg = V.geometry(gs.lines === 485 ? "NTSC-M" : "PAL-I"); grid = grid.map(p => V.resize(p, gs.ns, gs.lines, sg.ns, sg.lines)); g = sg; }
      decOpts = { separation: sg.colour === "PAL" ? "comb2H" : sg.colour === "NTSC" ? "comb1H" : "notch" };
      stages.push("clean " + sg.name + " signal for the tape");
    } else stages.push(gs.name);
    let enc = V.encode(grid, sg.name, en.encoder ? (s.encoder || {}) : {});
    const sigRec = rec && !REC.isGridFormat(rec.format);
    if (sigRec && rec.position !== "home") { enc = REC.recordSignal(enc, rec.format, ro); stages.push(REC.FORMATS[rec.format].label); }
    // 3. transfers that change standard
    if (tr && tr.type === "convert") {
      const src = V.decode(enc, { separation: gs.colour === "PAL" ? "comb2H" : gs.colour === "NTSC" ? "comb1H" : "notch" });
      const gt = V.geometry(tr.target || (gs.lines === 485 ? "PAL-I" : "NTSC-M"));
      const mt = mask ? V.resize(mask, gs.ns, gs.lines, gt.ns, gt.lines) : null;
      // repeated generations: each copy made from the previous one (e.g. re-shot off a monitor again and again, as in
      // David Hall's "This Is A Television Receiver", BBC 1976) [SEC LUX catalogue]
      const gens = Math.max(1, Math.min(12, Math.round(tr.generations || 1)));
      let cur = src, gcur = gs, mcur = mask;
      for (let k = 0; k < gens; k++) { cur = TR.convert(cur, gcur, gt, Object.assign({ v, mask: k === 0 ? mt : mcur && gcur === gt ? mcur : mt }, tr, { seed: seed + 17 * k })); gcur = gt; }
      enc = V.encode(cur, gt.name, {}); g = gt; stages.push("converted to " + gt.name + (gens > 1 ? " (" + gens + " generations)" : ""));
    } else if (tr && tr.type === "crossplay" && (tr.mode === "pal60" || tr.mode === "ntsc443")) {
      const tg = V.geometry(tr.mode === "pal60" ? "PAL-60" : "NTSC-443");
      const src = V.decode(enc, { separation: "notch" }).map(p => V.resize(p, gs.ns, gs.lines, tg.ns, tg.lines));
      enc = V.encode(src, tg.name, { chromaFilter: "none" });
      enc.g = V.geometry("PAL-60"); g = enc.g; stages.push("played as " + tr.mode); // the UK set decodes both as PAL; NTSC 4.43 has no V switch, so its colour goes wrong [SEC strand F]
    } else if (tr && tr.type === "crossplay" && tr.mode === "secam_mono") {
      decOpts.separation = "none"; // PAL-only set: SECAM colour is lost and its FM subcarrier shows as dots [SEC ETD 1983]
    }
    // 4. transmission and the receiving set (built for the same standard, or another one), home recording, decoder
    const rxName = en.decoder && rcv.standard && rcv.standard !== "same" ? rcv.standard : null;
    const rxg = rxName && V.STANDARDS[rxName] && V.STANDARDS[rxName].lineRate === g.lineRate ? V.geometry(rxName) : null;
    const co = ch.cochannel && ch.cochannel.ratio > 0 ? ch.cochannel : null;
    if (en.channel && en.encoder) {
      const cho = Object.assign({ seed }, ch, { rx: rxg, overload: en.decoder ? rcv.overload || 0 : 0 });
      if (co) { // the interfering station: a second picture (another layer, or the photo mirrored) on the same channel
        const src2 = doc.interferer ? cutRegion(doc.interferer, W, H, rect, 0, 0) : region.map(p => { const q = new Float32Array(p.length); for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) q[y * rect.w + x] = p[y * rect.w + rect.w - 1 - x]; return q; });
        cho.interferer = V.encode(toGrid(src2), g.name, {});
      }
      V.channel(enc, cho); stages.push("channel" + (co ? " + co-channel" : "") + (ch.scramble ? " (scrambled)" : ""));
      if (rxg) stages.push("received on a " + rxName + " set");
    }
    // the set's timebases: needed when anything can upset sync; a clean locked signal passes unchanged
    const holdNeeded = en.decoder && (rxg || co || rcv.overload > 0 || (rcv.hold && rcv.hold !== "auto") || rcv.hFree);
    if (holdNeeded && !(rec && rec.position === "home")) {
      V.hold(enc, { seed, hGain: rcv.hGain, hFree: rcv.hFree || 0, vRoll: rcv.hold === "rolling" ? (rcv.vRoll !== undefined ? rcv.vRoll : 0.4) : (rcv.hold === "locked" ? 0 : null) });
      stages.push(enc.roll ? "picture rolling" : "hold");
    }
    if (rxg) { decOpts.lumaBW = rxg.bw; if (rxg.colour !== g.colour) { decOpts.mono = true; decOpts.notchHz = rxg.fsc || 4433618.75; } }
    if (sigRec && rec.position === "home") { enc = REC.recordSignal(enc, rec.format, ro); stages.push(REC.FORMATS[rec.format].label + " (off-air)"); }
    grid = V.decode(enc, decOpts);
  }
  // output picture size: the document's picture area, or the standard's native size (square pixels)
  const natH = gs.vertical ? gs.ns : g.lines;
  const PW = s.native ? Math.round(natH * aspect) : rect.w, PH = s.native ? natH : rect.h;
  let win = null; // window inside the picture (preview)
  if (winDoc && !s.native) {
    const x0 = Math.max(0, winDoc.left - rect.x), y0 = Math.max(0, winDoc.top - rect.y), x1 = Math.min(rect.w, winDoc.right - rect.x), y1 = Math.min(rect.h, winDoc.bottom - rect.y);
    if (x1 <= x0 || y1 <= y0) throw new Error("The preview selection is outside the picture area.");
    win = { x0, y0, x1, y1 };
  }
  const crop = pic => win ? pic.map(p => { const a = new Float32Array((win.x1 - win.x0) * (win.y1 - win.y0)); for (let y = win.y0; y < win.y1; y++) a.set(p.subarray(y * PW + win.x0, y * PW + win.x1), (y - win.y0) * (win.x1 - win.x0)); return a; }) : pic;
  // 5. telerecording: the picture goes to film and the film is what we see
  if (tr && tr.type === "telerecord") {
    for (const p of grid) for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : (p[i] > 1 ? 1 : p[i]);
    const film = TR.telerecord(grid, g, PW, PH, Object.assign({ seed }, tr)); stages.push("telerecording");
    return finish(crop(film), s, rect, W, H, PW, PH, win, g, stages);
  }
  let mode = en.view ? ((s.view && s.view.mode) || "grab") : "grab";
  if (mode === "televisor" && !gs.vertical) mode = "closeup";
  let useCRT = mode !== "grab" && mode !== "televisor" && en.display;
  if (en.decoder && s.set && !gs.vertical) grid = DSP.set(grid, g, Object.assign({}, s.set, useCRT ? {} : { overscan: 0 }));
  if (ov && ov.kind === "teletext") { grid = TXT.teletext(grid, g, ov); stages.push("teletext " + (ov.mode || "mix")); }
  if (sub && (sub.st.stage === "set" || sub.st.edge === "cc")) { grid = burnSub(grid, g); stages.push(sub.st.edge === "cc" ? "closed captions" : "subtitles by the set (" + sub.font + ")"); }
  if (gs.vertical) { // back to picture orientation: columns are the scan lines
    grid = grid.map(p => transpose(p, g.ns, g.lines)); g = Object.assign({}, g, { ns: g.lines, lines: g.ns, verticalShown: true });
    if (mode === "televisor") {
      const pic = crop(DSP.televisor(grid, g.ns, g.lines, PW, PH, s.display || {}));
      stages.push("Televisor"); return finish(pic, s, rect, W, H, PW, PH, win, g, stages);
    }
    useCRT = false; mode = "grab";
  }
  for (const p of grid) for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : (p[i] > 1.09 ? 1.09 : p[i]);
  let pic;
  if (useCRT) pic = DSP.crt(grid, g, PW, PH, s.display || {}, win);
  else { // frame-grab: deinterlace choice, then scale to square pixels
    const di = (s.view && s.view.deinterlace) || "weave";
    if (di === "bob") grid = grid.map(p => { const q = Float32Array.from(p); for (let r = 1; r < g.lines; r += 2) q.set(p.subarray((r - 1) * g.ns, r * g.ns), r * g.ns); return q; });
    else if (di === "blend") grid = grid.map(p => { const q = Float32Array.from(p); for (let r = 0; r < g.lines - 1; r++) for (let x = 0; x < g.ns; x++) q[r * g.ns + x] = 0.5 * (p[r * g.ns + x] + p[(r + 1) * g.ns + x]); return q; });
    pic = crop(grid.map(p => V.resize(p, g.ns, g.lines, PW, PH)));
    for (const p of pic) for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : (p[i] > 1 ? 1 : p[i]);
  }
  if (mode === "lens" && useCRT) { // the whole picture is needed for the lens: render it all, then crop to the preview window
    const full = win ? DSP.crt(grid, g, PW, PH, s.display || {}, null) : pic;
    const lv = DSP.lensView(full, PW, PH, s.view || {});
    pic = crop(lv); stages.push("through the magnifying lens");
  }
  if (mode === "photo") screenPhoto(pic, win ? win.x1 - win.x0 : PW, win ? win.y1 - win.y0 : PH, Object.assign({ seed }, s.view || {}), { x0: win ? win.x0 : 0, y0: win ? win.y0 : 0, w: PW, h: PH });
  stages.push(useCRT ? (mode === "photo" ? "screen photo" : "CRT") : "frame-grab");
  return finish(pic, s, rect, W, H, PW, PH, win, g, stages);
}
// Result: planes plus where they go. Native: the picture alone. Otherwise the document area (window or whole doc, matte black).
function finish(pic, s, rect, W, H, PW, PH, win, g, stages) {
  if (s.native) return { planes: pic, left: 0, top: 0, width: PW, height: PH, rect, g, stages };
  if (win) return { planes: pic, left: rect.x + win.x0, top: rect.y + win.y0, width: win.x1 - win.x0, height: win.y1 - win.y0, rect, g, stages };
  const out = [0, 1, 2].map(() => new Float32Array(W * H));
  for (let c = 0; c < 3; c++) for (let y = 0; y < rect.h; y++) out[c].set(pic[c].subarray(y * rect.w, y * rect.w + rect.w), (rect.y + y) * W + rect.x);
  return { planes: out, left: 0, top: 0, width: W, height: H, rect, g, stages };
}
/* A photograph of the screen: exposure shorter than a field records a bright band with a fading tail (scan geometry) [EST],
 * plus lens softness, room reflection, and film/sensor grain. p: { exposure (fraction of a field, 0 = none), bandPos 0..1,
 * decay (fraction of height), focus (px), reflection (0..1), grain (0..1) } */
function screenPhoto(pic, w, h, p, geo) {
  geo = geo || { x0: 0, y0: 0, w, h };
  const n = w * h, rnd = V.mulberry32(((p.seed || 1) * 104729) >>> 0);
  const lin = pic.map(a => { const b = new Float32Array(n); for (let i = 0; i < n; i++) { const v = a[i]; b[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return b; });
  if (p.focus) for (const b of lin) CAM.blur2D(b, w, h, p.focus, p.focus);
  const e = p.exposure || 0;
  for (let y = 0; y < h; y++) {
    let f = 1;
    if (e > 0 && e < 1) { // lines scanned during the exposure are recorded at full strength; earlier lines have faded
      // lines scanned during the exposure (start..start+e) record fully; lines scanned just before it are still
      // glowing (phosphor afterglow tail above the band); the rest were last lit a field earlier and have faded
      const t = (y + geo.y0) / geo.h, start = p.bandPos || 0.3; let inBand = t - start; if (inBand < 0) inBand += 1;
      if (inBand <= e) f = 1; else { let before = start - t; if (before < 0) before += 1; f = Math.exp(-before / (p.decay || 0.08)) * 0.95 + 0.03; }
    }
    const refl = p.reflection ? p.reflection * 0.08 * Math.exp(-Math.pow(((y + geo.y0) / geo.h - 0.25) / 0.35, 2)) : 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x, rx = refl * Math.exp(-Math.pow(((x + geo.x0) / geo.w - 0.7) / 0.3, 2));
      for (let c = 0; c < 3; c++) lin[c][i] = lin[c][i] * f + rx;
    }
  }
  if (p.grain) { const gs = p.grain * 0.06; for (let i = 0; i < n; i++) { const g0 = V.gaussRand(rnd) * gs; for (let c = 0; c < 3; c++) lin[c][i] = Math.max(0, lin[c][i] * (1 + g0) + g0 * 0.02); } }
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) pic[c][i] = DSP.srgbEncode(lin[c][i]);
}
const api = { run, pictureRect };
if (typeof module !== "undefined" && module.exports) module.exports = api;
