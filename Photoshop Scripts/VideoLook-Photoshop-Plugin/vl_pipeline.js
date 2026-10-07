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
    if (cam) { grid = CAM.camera(grid, gs, cam, Object.assign({ seed, aspect }, s.camera)); stages.push("camera"); }
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
      const cho = Object.assign({ seed }, ch, { rx: rxg, overload: en.decoder ? rcv.overload || 0 : 0, agcMean: en.decoder ? rcv.agcMean || 0 : 0 });
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
  let pic, picB = null;
  // a photograph of the screen: the shutter may catch one field, or one and part of the next, so the two fields are drawn
  // separately; the photograph is made of the whole picture, so a preview renders it all and shows the selected part
  const vw = s.view || {}, photo = mode === "photo", pe = photo ? (vw.exposure || 0) : 0;
  const twoField = photo && useCRT && pe > 0 && pe < 2 && !g.progressive && !g.fieldSeq;
  const photoFull = !!(photo && win); // flare, grain, dust, tilt and pull-back all belong to the whole photograph
  const cwin = photoFull ? null : win;
  if (useCRT && twoField) { pic = DSP.crt(grid, g, PW, PH, Object.assign({}, s.display || {}, { field: 1 }), cwin); picB = DSP.crt(grid, g, PW, PH, Object.assign({}, s.display || {}, { field: 2 }), cwin); }
  else if (useCRT) pic = DSP.crt(grid, g, PW, PH, s.display || {}, cwin);
  else { // frame-grab: deinterlace choice, then scale to square pixels
    const di = (s.view && s.view.deinterlace) || "weave";
    if (di === "bob") grid = grid.map(p => { const q = Float32Array.from(p); for (let r = 1; r < g.lines; r += 2) q.set(p.subarray((r - 1) * g.ns, r * g.ns), r * g.ns); return q; });
    else if (di === "blend") grid = grid.map(p => { const q = Float32Array.from(p); for (let r = 0; r < g.lines - 1; r++) for (let x = 0; x < g.ns; x++) q[r * g.ns + x] = 0.5 * (p[r * g.ns + x] + p[(r + 1) * g.ns + x]); return q; });
    pic = grid.map(p => V.resize(p, g.ns, g.lines, PW, PH)); if (!photoFull) pic = crop(pic);
    for (const p of pic) for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : (p[i] > 1 ? 1 : p[i]);
  }
  if (mode === "lens" && useCRT) { // the whole picture is needed for the lens: render it all, then crop to the preview window
    const full = win ? DSP.crt(grid, g, PW, PH, s.display || {}, null) : pic;
    const lv = DSP.lensView(full, PW, PH, s.view || {});
    pic = crop(lv); stages.push("through the magnifying lens");
  }
  if (photo) {
    screenPhoto(pic, cwin ? cwin.x1 - cwin.x0 : PW, cwin ? cwin.y1 - cwin.y0 : PH, Object.assign({ seed }, vw), { x0: cwin ? cwin.x0 : 0, y0: cwin ? cwin.y0 : 0, w: PW, h: PH }, picB);
    if (photoFull) pic = crop(pic);
  }
  stages.push(useCRT ? (photo ? "screen photo" + (twoField ? (pe <= 1 ? " (one field)" : " (one field and part of the next)") : "") + (vw.finish === "bw" ? " on a black-and-white print" : "") : "CRT") : "frame-grab");
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
/* A photograph of the screen [EST unless marked].
 * p: { exposure: shutter time in fields (0 or 2 = a whole frame; 1 = one field; below 1 = part of a field), bandPos 0..1
 *      (where the scan was when the shutter opened), decay (phosphor afterglow, fraction of a field),
 *      soft (% of picture width: lens focus and enlargement), focus (px, older settings), flare (0..1 veiling glare),
 *      reflection (0..1), zoomOut (0..0.3: the camera pulled back to show the tube surround), tilt (degrees),
 *      finish: 'bw' = black-and-white negative and print with printEv (stops), printContrast, printBlack (0..1), grain,
 *      dust (amount) and dustLevel (how light the specks are, 1 = as measured) }
 * Half-frame 35 mm at 1/25 s was John Cura's Tele-snap practice [SEC Wikipedia "Tele-snaps"]: 1/25 s is one whole frame.
 * picB: the second field drawn separately (see run). */
function wideBlur(a, w, h, sigma) { // a large-radius blur done on a small copy
  if (sigma < 6) { CAM.blur2D(a, w, h, sigma, sigma); return a; }
  const f = sigma / 3, sw = Math.max(8, Math.round(w / f)), sh = Math.max(8, Math.round(h / f));
  const sm = V.resize(a, w, h, sw, sh); CAM.blur2D(sm, sw, sh, sigma * sw / w, sigma * sh / h); return V.resize(sm, sw, sh, w, h);
}
function screenPhoto(pic, w, h, p, geo, picB) {
  geo = geo || { x0: 0, y0: 0, w, h };
  const n = w * h, rnd = V.mulberry32(((p.seed || 1) * 104729) >>> 0);
  const toLin = a => { const b = new Float32Array(n); for (let i = 0; i < n; i++) { const v = a[i]; b[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return b; };
  let lin = pic.map(toLin);
  const e = p.exposure || 0, start = p.bandPos !== undefined ? p.bandPos : 0.3, dec = p.decay || 0.08;
  if (picB) {
    // field 1 is scanned during 0..1 and field 2 during 1..2 (in field times); a line scanned while the shutter is open
    // records fully, one scanned shortly before it opened is still glowing, the rest have faded. Brightness is evened
    // out as the photographer's aperture would do it.
    const linB = picB.map(toLin), sc = 2 / Math.max(1, e);
    const wt = (tau) => { const d = ((tau - start) % 2 + 2) % 2; return d <= e ? 1 : Math.exp(-(2 - d) / dec) * 0.95 + 0.02; };
    for (let y = 0; y < h; y++) { const t = (y + geo.y0) / geo.h, wA = wt(t) * sc, wB = wt(1 + t) * sc;
      for (let c = 0; c < 3; c++) { const A = lin[c], Bp = linB[c]; for (let i = y * w, i1 = i + w; i < i1; i++) A[i] = A[i] * wA + Bp[i] * wB; } }
  } else if (e > 0 && e < 1) {
    for (let y = 0; y < h; y++) {
      const t = (y + geo.y0) / geo.h; let inBand = t - start; if (inBand < 0) inBand += 1; let f = 1;
      if (inBand > e) { let before = start - t; if (before < 0) before += 1; f = Math.exp(-before / dec) * 0.95 + 0.03; }
      for (let c = 0; c < 3; c++) { const A = lin[c]; for (let i = y * w, i1 = i + w; i < i1; i++) A[i] *= f; }
    }
  }
  if (p.reflection) for (let y = 0; y < h; y++) { // a window or lamp reflected in the glass
    const refl = p.reflection * 0.08 * Math.exp(-Math.pow(((y + geo.y0) / geo.h - 0.25) / 0.35, 2));
    for (let x = 0; x < w; x++) { const i = y * w + x, rx = refl * Math.exp(-Math.pow(((x + geo.x0) / geo.w - 0.7) / 0.3, 2)); for (let c = 0; c < 3; c++) lin[c][i] += rx; }
  }
  // the camera pulled back and not quite square to the set: the dark tube surround shows (whole picture only)
  const zo = Math.min(0.3, p.zoomOut || 0), th = (p.tilt || 0) * Math.PI / 180;
  if ((zo > 0 || th) && w === geo.w && h === geo.h) {
    const cs = Math.cos(th), sn = Math.sin(th), k = 1 / (1 - zo), cx = (w - 1) / 2, cy = (h - 1) / 2, sur = 0.0035;
    lin = lin.map(src => { const o = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = x - cx, Y = y - cy, sx = (cs * X + sn * Y) * k + cx, sy = (-sn * X + cs * Y) * k + cy, i = y * w + x;
        if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) { o[i] = sur; continue; }
        const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, x1 = x0 + 1 < w ? x0 + 1 : x0, y1 = y0 + 1 < h ? y0 + 1 : y0;
        o[i] = Math.max(sur, (src[y0 * w + x0] * (1 - fx) + src[y0 * w + x1] * fx) * (1 - fy) + (src[y1 * w + x0] * (1 - fx) + src[y1 * w + x1] * fx) * fy);
      } return o; });
  }
  const sigma = (p.soft || 0) / 100 * geo.w + (p.focus || 0);
  if (sigma > 0.3) lin = lin.map(b => wideBlur(b, w, h, sigma));
  if (p.flare) { // veiling glare: light scattered in the thick faceplate, the implosion guard and the camera lens
    const fl = p.flare;
    for (let c = 0; c < 3; c++) { const hz = wideBlur(Float32Array.from(lin[c]), w, h, 0.04 * geo.w); let m = 0; for (let i = 0; i < n; i++) m += hz[i]; m /= n; const b = lin[c]; for (let i = 0; i < n; i++) b[i] += fl * (0.22 * hz[i] + 0.03 * m); }
  }
  const bw = p.finish === "bw";
  const grainN = p.grain ? (() => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = V.gaussRand(rnd); const gs = Math.max(0, 0.0007 * geo.w);
    if (gs > 0.45) { CAM.blur2D(a, w, h, gs, gs); let s2 = 0; for (let i = 0; i < n; i++) s2 += a[i] * a[i]; const kz = 1 / Math.sqrt(s2 / n || 1); for (let i = 0; i < n; i++) a[i] *= kz; } return a; })() : null;
  if (bw) {
    // black-and-white negative printed on paper: an S-shaped curve of print density against log exposure. A thin
    // (under-exposed) negative or a dark print turns the screen's whites grey; paper black is not zero.
    const ev = p.printEv || 0, con = p.printContrast || 1, lift = p.printBlack !== undefined ? p.printBlack : 0.4;
    const Dmin = 0.04, Dmax = 2.6 - 1.1 * lift, k = 4 * 1.15 * con / (Dmax - Dmin), sa = (Dmax - 0.745) / (Dmax - Dmin), xm = -0.745 - Math.log(sa / (1 - sa)) / k;
    const ex = Math.pow(2, ev), gk = (p.grain || 0) * 0.05, L0 = lin[0], L1 = lin[1], L2 = lin[2];
    for (let i = 0; i < n; i++) {
      const Y = (0.2126 * L0[i] + 0.7152 * L1[i] + 0.0722 * L2[i]) * ex, x = Math.log10(Y > 1e-5 ? Y : 1e-5);
      const sg = 1 / (1 + Math.exp(-k * (x - xm))); let D = Dmax - (Dmax - Dmin) * sg; if (grainN) D += gk * grainN[i] * (0.4 + 2.4 * sg * (1 - sg));
      L0[i] = L1[i] = L2[i] = Math.pow(10, -(D > 0 ? D : 0));
    }
  } else if (grainN) { const gs = p.grain * 0.06; for (let i = 0; i < n; i++) { const g0 = grainN[i] * gs; for (let c = 0; c < 3; c++) lin[c][i] = Math.max(0, lin[c][i] * (1 + g0) + g0 * 0.02); } }
  if (p.dust) photoDust(lin, w, h, p.dust, geo, V.mulberry32(((p.seed || 1) * 7919 + 13) >>> 0), p.dustLevel);
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) pic[c][i] = DSP.srgbEncode(lin[c][i]);
}
/* Dust on a small negative, enlarged. Measured on 1960s off-screen stills (research K): the specks are small (about
 * 0.1-0.3% of the picture width across), soft-edged, mostly faint (typically 25 code values lighter than a dark ground,
 * a few 50-60), slightly irregular, about 150-350 per megapixel, and one in six or so is dark. Each speck here is one to
 * three overlapping soft blobs. amt 0.2 gives about that density; level scales how light they are. Positions are in
 * whole-picture coordinates. No hairs or scratches. */
function photoDust(lin, w, h, amt, geo, rnd, level) {
  const W = geo.w, H = geo.h, white = 0.82, lv = level === undefined ? 1 : level;
  if (!(amt > 0) || !(lv > 0)) return;
  const blob = (X, Y, sx, sy, ang, a, dark) => {
    const R = 3 * Math.max(sx, sy), x0 = Math.max(0, Math.floor(X - geo.x0 - R)), x1 = Math.min(w - 1, Math.ceil(X - geo.x0 + R)), y0 = Math.max(0, Math.floor(Y - geo.y0 - R)), y1 = Math.min(h - 1, Math.ceil(Y - geo.y0 + R));
    if (x1 < x0 || y1 < y0) return;
    const cs = Math.cos(ang), sn = Math.sin(ang), target = dark ? 0.004 : white;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + geo.x0 - X, dy = y + geo.y0 - Y, u = (cs * dx + sn * dy) / sx, v = (-sn * dx + cs * dy) / sy, t = a * Math.exp(-0.5 * (u * u + v * v));
      if (t < 0.002) continue; const i = y * w + x;
      for (let c = 0; c < 3; c++) lin[c][i] += t * (target - lin[c][i]);
    }
  };
  const n = Math.round(amt * 1250);
  for (let s = 0; s < n; s++) {
    const X = rnd() * W, Y = rnd() * H, dark = rnd() < 0.15;
    // size: mostly tiny, a few larger (log-normal); strength: mostly faint, a few plain (the larger ones tend to be plainer)
    const g1 = V.gaussRand(rnd), g2 = V.gaussRand(rnd), size = Math.exp(0.55 * g1);
    const a = Math.min(0.45, 0.035 * Math.exp(0.8 * g2 + 0.35 * g1) * lv * (dark ? 6 : 1));
    const sig = Math.max(a > 0.2 ? 0.85 : 0.6, W * 0.00042 * size); // a plain speck is never a single hard pixel
    const parts = 1 + (rnd() < 0.35 ? 1 : 0) + (rnd() < 0.12 ? 1 : 0); let px = X, py = Y;
    for (let k = 0; k < parts; k++) { const el = 1 + rnd() * rnd() * 1.4; blob(px, py, sig * el, sig / Math.sqrt(el), rnd() * 3.1416, a * (k ? 0.5 + 0.5 * rnd() : 1), dark); px += (rnd() - 0.5) * 3.2 * sig; py += (rnd() - 0.5) * 3.2 * sig; }
  }
}
const api = { run, pictureRect, screenPhoto };
if (typeof module !== "undefined" && module.exports) module.exports = api;
