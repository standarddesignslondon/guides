/* VideoLook: pictures over networks (v1.8). Picture source kinds for videotex terminals (Minitel; Telidon / NAPLPS),
 * pictures by radio (slow-scan TV, HF radiofax) and early web images (GIF palettes and dithering, interlaced and
 * progressive loading, JPEG). Prestel uses the existing teletext mosaic kind. Options live in source.inst, like the
 * instruments. Sources and estimates: VideoLook-References/_research/Q_batch5_videotex_radio_web.md. [EST] = no source
 * gave a figure. Work is done on a raster W x H (H = the standard's lines) and resized back to the grid. */
"use strict";
const V = (typeof require !== "undefined") ? require("./vl_core.js") : globalThis.VLCore;
const CAM = (typeof require !== "undefined") ? require("./vl_camera.js") : globalThis.VLCamera;
const TX = (typeof require !== "undefined") ? require("./vl_text.js") : globalThis.VLText;

const KINDS = {
  minitel: "Minitel (videotex, 40 x 25 mosaic)",
  telidon: "Telidon / NAPLPS (geometric videotex)",
  sstv: "Slow-scan TV (amateur radio)",
  radiofax: "HF radiofax (weather charts, news pictures)",
  webimg: "Early web image (GIF, JPEG, loading)",
};
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const hex = h => [0, 2, 4].map(j => parseInt(h.slice(j, j + 2), 16) / 255);
const lumOf = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function work(grid, g, o) { const H = Math.max(64, Math.min(1080, g.lines)), W = Math.max(64, Math.round(H * (o.aspect || 4 / 3))); return { W, H, P: grid.map(p => V.resize(p, g.ns, g.lines, W, H)) }; }
const back = (P, W, H, g) => P.map(p => V.resize(p, W, H, g.ns, g.lines));
function nearestUp(src, sw, sh, dw, dh) { const o = new Float32Array(dw * dh); for (let y = 0; y < dh; y++) { const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh)) * sw; for (let x = 0; x < dw; x++) o[y * dw + x] = src[sy + Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw))]; } return o; }
function wander(n, len, rnd) { const a = new Float32Array(n); let v = 0, t = 0; for (let i = 0; i < n; i++) { t += (V.gaussRand(rnd) - t) / Math.max(1, len); v += t / Math.max(1, len) * 2; v *= 0.995; a[i] = v; } let m = 0; for (const x of a) m = Math.max(m, Math.abs(x)); if (m > 0) for (let i = 0; i < n; i++) a[i] /= m; return a; }
// text in VideoLook's 5 x 9 font into planes (cells cw x ch from x0, y0), colour col
function text(P, W, H, s, x0, y0, cw, ch, col) {
  [...s].forEach((c, k) => { const gl = TX.glyph(c.toUpperCase() === c ? c : c.toUpperCase()); const cx = x0 + k * cw;
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 5; gx++) if (gl[gy][gx] === "1") {
      const xa = Math.floor(cx + gx * cw / 6), xb = Math.floor(cx + (gx + 1) * cw / 6), ya = Math.floor(y0 + gy * ch / 10), yb = Math.floor(y0 + (gy + 1) * ch / 10);
      for (let y = Math.max(0, ya); y < Math.min(H, Math.max(ya + 1, yb)); y++) for (let x = Math.max(0, xa); x < Math.min(W, Math.max(xa + 1, xb)); x++) for (let c3 = 0; c3 < 3; c3++) P[c3][y * W + x] = col[c3]; } });
}

/* ---- Minitel (trial 1980, service from 1982): a videotex terminal on the phone line, 1200 bit/s down, 75 up
 * [SEC Wikipedia]. Screen 25 rows of 40 characters, row 0 a service row; alphamosaic graphics, each cell a 2 x 3 block of
 * dots (videotex G1 set) [SEC Minitel brochure; Videotex character set]. Minitel 1 screens were black and white, showing
 * the colours as 8 grey levels [SEC France Telecom brochure]. Which colour gets which grey here (by brightness), each
 * cell's free choice of two levels, and the cell's dot proportions are [EST]. 'drawn' leaves the page part-way through
 * arriving (top rows first). */
const TT8 = [[0, 0, 0], [0, 0, 1], [1, 0, 0], [1, 0, 1], [0, 1, 0], [0, 1, 1], [1, 1, 0], [1, 1, 1]]; // black, blue, red, magenta, green, cyan, yellow, white
function minitel(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o), colour = o.colour === "colour", con = o.contrast || 1.2;
  const pal = colour ? TT8 : TT8.map((c, k) => { const v = k / 7; return [v, v, v]; });
  const SX = 80, SY = 72, fb = P.map(p => V.resize(p, W, H, SX, SY));
  for (const p of fb) for (let i = 0; i < p.length; i++) p[i] = clamp01((p[i] - 0.5) * con + 0.5 + (o.brightness || 0));
  const val = (x, y) => { const i = y * SX + x; return colour ? [fb[0][i], fb[1][i], fb[2][i]] : (v => [v, v, v])(lumOf(fb[0][i], fb[1][i], fb[2][i])); };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  // the page at 8 x 10 dots a cell [EST], 320 x 250
  const CW = 8, CH = 10, PW = 40 * CW, PH = 25 * CH, page = [0, 1, 2].map(() => new Float32Array(PW * PH));
  const rowsDone = o.drawn === undefined ? 25 : Math.round(clamp01(o.drawn) * 25);
  const dotsY = [0, 3, 7, 10], sep = !!o.separated;
  for (let r = 1; r < Math.min(25, rowsDone); r++) for (let c = 0; c < 40; c++) {
    const D = [0, 1, 2, 3, 4, 5].map(k => val(c * 2 + (k & 1), (r - 1) * 3 + (k >> 1)));
    let best = 1e9, bf = 7, bb = 0, bm = 0;
    for (let f = 0; f < 8; f++) for (let b = 0; b < f; b++) { let cs = 0, m = 0; D.forEach((d, k) => { const a = d2(d, pal[f]), z = d2(d, pal[b]); if (a < z) { cs += a; m |= 1 << k; } else cs += z; }); if (cs < best) { best = cs; bf = f; bb = b; bm = m; } }
    for (let k = 0; k < 6; k++) { const col = (bm >> k) & 1 ? pal[bf] : pal[bb], x0 = c * CW + (k & 1) * 4, y0 = r * CH + dotsY[k >> 1], y1 = r * CH + dotsY[(k >> 1) + 1];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x0 + 4; x++) { const gap = sep && (bm >> k) & 1 && (x === x0 + 3 || y === y1 - 1); const cc = gap ? pal[bb] : col; for (let q = 0; q < 3; q++) page[q][y * PW + x] = cc[q]; } }
  }
  if (o.header) text(page, PW, PH, o.header.slice(0, 40), 0, 0, CW, CH, pal[7]);
  if (rowsDone < 25 && o.cursor !== false) { const y = rowsDone * CH; for (let yy = y + 8; yy < Math.min(PH, y + 10); yy++) for (let x = 0; x < CW; x++) for (let q = 0; q < 3; q++) page[q][yy * PW + x] = pal[7][q]; }
  // onto the screen: the page fills the picture with a small black margin [EST]
  const mx = 0.04, my = 0.05, out = [0, 1, 2].map(() => new Float32Array(W * H)), iw = Math.round(W * (1 - 2 * mx)), ih = Math.round(H * (1 - 2 * my)), ox = Math.round(W * mx), oy = Math.round(H * my);
  for (let q = 0; q < 3; q++) { const up = nearestUp(page[q], PW, PH, iw, ih); for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) out[q][(y + oy) * W + x + ox] = up[y * iw + x]; }
  return back(out, W, H, g);
}

/* ---- Telidon (Canada, shown 1978) and NAPLPS (1983, ANSI X3.110 / CSA T500): pictures sent as Picture Description
 * Instructions, geometric drawing commands (point, line, arc, rectangle, polygon) that the terminal draws at its own
 * resolution [SEC CRC Technical Note 709; Wikipedia NAPLPS; USPTO 5117484]. NAPLPS's default palette is half an even
 * grey scale and half evenly spaced hues, 16 at a time [SEC NAPLPS summaries]; the exact entries here are [EST]. A
 * picture made for Telidon was a set of flat-coloured shapes; here the photo is traced into such shapes [EST: VideoLook's
 * own method]. Pages arrived over slow lines and were drawn shape by shape ('drawn'). */
function naplpsPalette() { const p = []; for (let k = 0; k < 8; k++) { const v = k / 7; p.push([v, v, v]); }
  for (let k = 0; k < 8; k++) { const h = k / 8 * 6, i = Math.floor(h), f = h - i, q = 1 - f; p.push([[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][i % 6]); } return p; }
function telidon(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o), pal = o.palette === "grey" ? naplpsPalette().slice(0, 8) : naplpsPalette(), K = pal.length;
  const dw = Math.max(16, Math.round(o.detail || 64)), dh = Math.max(12, Math.round(dw * H / W)), sat = o.saturate || 2.2;
  const S = P.map(p => V.resize(p, W, H, dw, dh)), n = dw * dh, lab = new Int32Array(n);
  for (let i = 0; i < n; i++) { const y = lumOf(S[0][i], S[1][i], S[2][i]), c = [0, 1, 2].map(q => clamp01(y + (S[q][i] - y) * sat)); let b = 0, bd = 9; for (let k = 0; k < K; k++) { const d = (c[0] - pal[k][0]) ** 2 * 0.3 + (c[1] - pal[k][1]) ** 2 * 0.59 + (c[2] - pal[k][2]) ** 2 * 0.11; if (d < bd) { bd = d; b = k; } } lab[i] = b; }
  // each colour's area, smoothed and enlarged: the largest share wins, giving smooth-edged shapes [EST]
  const used = []; const area = new Float64Array(K); for (let i = 0; i < n; i++) area[lab[i]]++; for (let k = 0; k < K; k++) if (area[k] > 0) used.push(k);
  const soft = o.smooth !== undefined ? o.smooth : 0.9, best = new Float32Array(W * H).fill(-1), L = new Int32Array(W * H).fill(-1);
  for (const k of used) { const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = lab[i] === k ? 1 : 0; if (soft > 0.3) CAM.blur2D(m, dw, dh, soft, soft); const up = V.resize(m, dw, dh, W, H); for (let i = 0; i < W * H; i++) if (up[i] > best[i]) { best[i] = up[i]; L[i] = k; } }
  // drawing order: big shapes first; 'drawn' stops part-way [EST]
  const order = used.slice().sort((a, b) => area[b] - area[a]), drawnN = o.drawn === undefined ? order.length : Math.round(clamp01(o.drawn) * order.length), shown = new Set(order.slice(0, drawnN));
  const bg = hex(o.background || "000000"), out = [0, 1, 2].map(() => new Float32Array(W * H)), edge = o.outline || 0, ec = hex(o.outlineColour || "FFFFFF");
  for (let i = 0; i < W * H; i++) { const c = shown.has(L[i]) ? pal[L[i]] : bg; for (let q = 0; q < 3; q++) out[q][i] = c[q]; }
  if (edge > 0) { const t = Math.max(1, Math.round(edge * H / 400)); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let e = false; for (let d = 1; d <= t && !e; d++) { if (x + d < W && L[i + d] !== L[i]) e = true; if (y + d < H && L[i + d * W] !== L[i]) e = true; } if (e && shown.has(L[i])) for (let q = 0; q < 3; q++) out[q][i] = ec[q]; } }
  return back(out, W, H, g);
}

/* ---- slow-scan TV: Copthorne Macdonald's system (1957-58) sent 120 lines of about 120 pixels in a 3 kHz phone channel
 * [SEC Wikipedia], seen on a long-persistence P7 tube [SEC SSTV Handbook]. Later modes: Robot 8 black and white (160 x 120),
 * Robot 36 colour (320 x 240, 36 s), Martin M1 (320 x 256, 114 s, Europe), Scottie S1 (320 x 256, 110 s, USA); tones 1,500
 * (black) to 2,300 Hz (white), a 1,200 Hz sync pulse each line [SEC Wikipedia; SSTV Handbook]. Colour by sending the
 * components one after another [SEC]; Robot 36 sends colour difference on alternate lines [EST from mode descriptions].
 * Reception: noise along the lines, static crashes, fading, a sample-rate error slanting the picture and wrapping the
 * sync bar into view, interference whistles, and pictures cut short [EST amounts]. */
const SSTV = { macdonald: [120, 120, "mono"], robot8: [160, 120, "mono"], robot36: [320, 240, "yc"], martin1: [320, 256, "seq"], scottie1: [320, 256, "seq"] };
function sstv(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o), M = SSTV[o.mode] || SSTV.martin1, sw = M[0], sh = M[1], n = sw * sh;
  let S = P.map(p => V.resize(p, W, H, sw, sh));
  if (M[2] === "mono") { const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = lumOf(S[0][i], S[1][i], S[2][i]); S = [Y, Y, Y]; }
  if (M[2] === "yc") { // colour difference shared by line pairs
    const Y = new Float32Array(n), U = new Float32Array(n), Vv = new Float32Array(n); for (let i = 0; i < n; i++) { Y[i] = lumOf(S[0][i], S[1][i], S[2][i]); U[i] = S[2][i] - Y[i]; Vv[i] = S[0][i] - Y[i]; }
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const i = y * sw + x, j = (y & ~1) * sw + x, u = U[(y | 1) < sh ? (y | 1) * sw + x : i] * 0.5 + U[j] * 0.5, v = Vv[j]; const yy = Y[i]; S[0][i] = yy + v; S[2][i] = yy + u; S[1][i] = (yy - 0.299 * S[0][i] - 0.114 * S[2][i]) / 0.587; }
  }
  const comps = M[2] === "mono" ? 1 : 3, noise = o.noise !== undefined ? o.noise : 0.04, fade = wander(sh, sh / 5, rnd), fadeA = o.fading || 0;
  const out = [0, 1, 2].map(() => new Float32Array(n)), slant = o.slant || 0, stopAt = o.cutoff === undefined ? 1 : clamp01(o.cutoff);
  const sync = Math.max(1, Math.round(sw * 0.03)), qrm = o.qrm || 0, qf = 0.07 + 0.2 * rnd(), qd = 0.3 + rnd(), shift = o.misreg || 0;
  for (let y = 0; y < sh; y++) {
    if (y >= stopAt * sh) { for (const p of out) for (let x = 0; x < sw; x++) p[y * sw + x] = o.after === "noise" ? clamp01(0.5 + 0.4 * V.gaussRand(rnd)) : 0; continue; }
    const off = slant * y * sw / sh, nl = noise * (1 + fadeA * 3 * Math.max(0, fade[y])), crash = rnd() < (o.crashes || 0) ? [Math.floor(rnd() * sw), Math.floor(sw * (0.1 + 0.5 * rnd())), Math.floor(rnd() * comps)] : null;
    for (let c = 0; c < 3; c++) { const src = comps === 1 ? S[0] : S[c], cc = comps === 1 ? 0 : c; let hn = 0;
      for (let x = 0; x < sw; x++) {
        let sx = x - off - (comps > 1 ? shift * (c - 1) : 0); sx = ((sx % (sw + sync)) + sw + sync) % (sw + sync);
        let v = sx >= sw ? -0.1 : src[y * sw + Math.floor(sx)]; // the sync pulse, blacker than black
        hn = 0.6 * hn + 0.4 * V.gaussRand(rnd); v += nl * hn * 1.6 * (comps === 1 && c > 0 ? 0 : 1);
        if (qrm) v += qrm * 0.25 * Math.sin((x * qf + y * qd) + (cc ? cc * 2 : 0)) * (comps > 1 && cc !== 1 ? 0.3 : 1);
        if (crash && cc === crash[2] && x >= crash[0] && x < crash[0] + crash[1]) v = rnd() < 0.5 ? 1 : clamp01(v + 0.6 * V.gaussRand(rnd));
        out[c][y * sw + x] = v;
      }
    }
    if (comps === 1) { out[1].set(out[0].subarray(y * sw, (y + 1) * sw), y * sw); out[2].set(out[0].subarray(y * sw, (y + 1) * sw), y * sw); }
  }
  for (const p of out) { CAM.blur2D(p, sw, sh, 0.6, 0); for (let i = 0; i < n; i++) p[i] = clamp01(p[i]); }
  if (o.caption) { const cs = Math.max(4, Math.floor(sw / Math.max(10, o.caption.length + 2))); text(out, sw, sh, o.caption, Math.round((sw - cs * o.caption.length) / 2), Math.round(sh * 0.04), cs, cs * 1.4, hex(o.captionColour || "FFFF40")); }
  const up = o.smooth === false ? out.map(p => nearestUp(p, sw, sh, W, H)) : out.map(p => V.resize(p, sw, sh, W, H));
  return back(up, W, H, g);
}

/* ---- HF radiofax: 120 lines a minute with an index of cooperation of 576 (so about 1,810 picture elements a line,
 * 576 x pi [DERIVED]); black at 1,500 Hz and white at 2,300 Hz, sent on single sideband; start and stop tones and a
 * phasing signal before the picture [SEC NOAA NWS; Bureau of Meteorology; Wikipedia]. Weather charts, satellite pictures
 * and, from the 1930s to the early 1970s, news photographs from remote places [SEC Wikipedia]. Static, fading, a
 * receiver whose clock runs slow (slant), a picture started out of phase (split, with the phasing bar inside it) and
 * printing are [EST]. */
function radiofax(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o);
  const sw = Math.max(200, Math.round(o.width || 1810)), sh = Math.max(60, Math.round(sw * H / W)), n = sw * sh;
  let Y = V.resize((() => { const a = new Float32Array(W * H); for (let i = 0; i < a.length; i++) a[i] = lumOf(P[0][i], P[1][i], P[2][i]); return a; })(), W, H, sw, sh);
  const con = o.contrast || 1.2; for (let i = 0; i < n; i++) Y[i] = clamp01((Y[i] - 0.5) * con + 0.5);
  if (o.mode === "chart") for (let i = 0; i < n; i++) Y[i] = Y[i] < (o.threshold || 0.42) ? 0 : 1; // charts are two-level line work
  const noise = o.noise !== undefined ? o.noise : 0.05, fade = wander(sh, sh / 6, rnd), fadeA = o.fading !== undefined ? o.fading : 0.3;
  const slant = o.slant || 0, phase = o.phase || 0, bar = Math.round(sw * 0.05), stat = o.static !== undefined ? o.static : 0.02, ph = o.phasing ? Math.round(sh * Math.min(0.3, o.phasing)) : 0;
  const out = new Float32Array(n), wl = o.whistle || 0, wf = 0.02 + 0.08 * rnd();
  for (let y = 0; y < sh; y++) { const fd = Math.max(0, fade[y]) * fadeA, off = (phase + slant * y / sh) * (sw + bar); let hn = 0;
    for (let x = 0; x < sw; x++) {
      let v; if (y < ph) v = x < bar ? 0 : 1; // the phasing lines: white with a black bar [EST: which way round varies]
      else { let sx = ((x - off) % (sw + bar) + sw + bar) % (sw + bar); v = sx >= sw ? (sx - sw < bar / 2 ? 0 : 1) : Y[y * sw + Math.floor(sx)]; }
      hn = 0.8 * hn + 0.2 * V.gaussRand(rnd); v += (noise * (1 + 4 * fd)) * hn * 2.2 + fd * 0.25 * (0.5 - v);
      if (wl) v += wl * 0.2 * Math.sin(x * wf + y * 0.9);
      out[y * sw + x] = v; }
    if (rnd() < stat) { const a = Math.floor(rnd() * sw), l = Math.floor(sw * (0.02 + 0.3 * rnd())), dark = rnd() < 0.6; for (let x = a; x < Math.min(sw, a + l); x++) out[y * sw + x] = dark ? 0.1 * rnd() : 1; }
  }
  for (let i = 0; i < n; i++) out[i] = clamp01(out[i]);
  CAM.blur2D(out, sw, sh, 0.5, 0.3);
  const ink = hex(o.ink || "1E1E24"), paper = hex(o.paperColour || "F3F2EC"), up = V.resize(out, sw, sh, W, H);
  const res = [0, 1, 2].map(c => Float32Array.from(up, v => paper[c] * v + ink[c] * (1 - v)));
  return back(res, W, H, g);
}

/* ---- early web images. The browser-safe palette: 216 colours, six levels (00, 33, 66, 99, CC, FF) of each of red, green
 * and blue, used by Netscape and Internet Explorer on 256-colour displays, which dithered other colours [SEC Weinman;
 * Wikipedia Web colors]. GIF: up to 256 colours; an interlaced GIF arrives in four passes, rows 0 + 8n, 4 + 8n, 2 + 4n, then
 * 1 + 2n [SEC GIF89a; GIF references], and browsers showed the early passes with rows repeated [EST]. Progressive JPEG:
 * a first scan of DC terms alone makes every 8 x 8 block flat, later scans add detail [SEC JPEG references]. A baseline
 * JPEG fills in from the top. The grey background (C0C0C0), the scan split and the adaptive palette method are [EST]. */
const WEB216 = (() => { const a = []; for (let r = 0; r < 6; r++) for (let gg = 0; gg < 6; gg++) for (let b = 0; b < 6; b++) a.push([r / 5, gg / 5, b / 5]); return a; })();
const WIN16 = ["000000", "800000", "008000", "808000", "000080", "800080", "008080", "C0C0C0", "808080", "FF0000", "00FF00", "FFFF00", "0000FF", "FF00FF", "00FFFF", "FFFFFF"].map(hex); // Windows default 16 [EST from period system palettes]
const BAY8 = (() => { const m = new Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0, xx = x, yy = y; for (let b = 0; b < 3; b++) { v = (v << 2) | (((xx & 1) ^ (yy & 1)) << 1 | (yy & 1)); xx >>= 1; yy >>= 1; } m[y * 8 + x] = v; } return m; })();
function adaptive(S, n, k, rnd) { // k colours by a few rounds of k-means on samples [EST method]
  const C = []; for (let j = 0; j < k; j++) { const i = Math.floor(rnd() * n); C.push([S[0][i], S[1][i], S[2][i]]); }
  for (let it = 0; it < 6; it++) { const sum = C.map(() => [0, 0, 0, 0]); for (let i = 0; i < n; i += 3) { let b = 0, bd = 9; for (let j = 0; j < k; j++) { const d = (S[0][i] - C[j][0]) ** 2 + (S[1][i] - C[j][1]) ** 2 + (S[2][i] - C[j][2]) ** 2; if (d < bd) { bd = d; b = j; } } const s = sum[b]; s[0] += S[0][i]; s[1] += S[1][i]; s[2] += S[2][i]; s[3]++; }
    sum.forEach((s, j) => { if (s[3]) C[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; }); }
  return C; }
function toPalette(S, w, h, pal, dither) {
  const n = w * h, out = [0, 1, 2].map(() => new Float32Array(n)), E = dither === "diffusion" ? S.map(p => Float32Array.from(p)) : S, K = pal.length;
  const near = (r, gg, b) => { let bi = 0, bd = 9; for (let k = 0; k < K; k++) { const d = (r - pal[k][0]) ** 2 * 0.3 + (gg - pal[k][1]) ** 2 * 0.59 + (b - pal[k][2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = k; } } return pal[bi]; };
  const step = K >= 200 ? 0.2 : K >= 16 ? 0.35 : 0.5;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; let r = E[0][i], gg = E[1][i], b = E[2][i];
    if (dither === "ordered") { const d = ((BAY8[(y & 7) * 8 + (x & 7)] + 0.5) / 64 - 0.5) * step; r += d; gg += d; b += d; }
    const c = near(clamp01(r), clamp01(gg), clamp01(b)); for (let q = 0; q < 3; q++) out[q][i] = c[q];
    if (dither === "diffusion") for (let q = 0; q < 3; q++) { const er = (q === 0 ? r : q === 1 ? gg : b) - c[q]; if (x + 1 < w) E[q][i + 1] += er * 7 / 16; if (y + 1 < h) { if (x) E[q][i + w - 1] += er * 3 / 16; E[q][i + w] += er * 5 / 16; if (x + 1 < w) E[q][i + w + 1] += er / 16; } } }
  return out; }
// 8 x 8 DCT keeping the first `keep` coefficients in zigzag order, quantised with the JPEG example table scaled by q
const C8 = (() => { const c = []; for (let k = 0; k < 8; k++) { c.push([]); for (let m = 0; m < 8; m++) c[k].push((k ? Math.sqrt(2 / 8) : Math.sqrt(1 / 8)) * Math.cos(Math.PI * (2 * m + 1) * k / 16)); } return c; })();
const QL = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const ZZ = (() => { const z = []; for (let s = 0; s < 15; s++) for (let i = 0; i <= s; i++) { const u = s % 2 ? i : s - i, v = s - u; if (u < 8 && v < 8) z.push(u * 8 + v); } return z; })();
function dct(p, w, h, q, keep) {
  const s = Math.max(0.05, q / 4), b = new Float32Array(64), t = new Float32Array(64), mask = new Uint8Array(64); for (let k = 0; k < Math.min(64, keep); k++) mask[ZZ[k]] = 1;
  for (let by = 0; by < h; by += 8) for (let bx = 0; bx < w; bx += 8) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) b[y * 8 + x] = p[Math.min(h - 1, by + y) * w + Math.min(w - 1, bx + x)] * 255 - 128;
    for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) { let a = 0; for (let y = 0; y < 8; y++) a += C8[u][y] * b[y * 8 + x]; t[u * 8 + x] = a; }
    for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) { let a = 0; for (let x = 0; x < 8; x++) a += C8[v][x] * t[u * 8 + x]; const qq = Math.max(1, QL[u * 8 + v] * s); b[u * 8 + v] = mask[u * 8 + v] ? Math.round(a / qq) * qq : 0; }
    for (let u = 0; u < 8; u++) for (let x = 0; x < 8; x++) { let a = 0; for (let v = 0; v < 8; v++) a += C8[v][x] * b[u * 8 + v]; t[u * 8 + x] = a; }
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (by + y >= h || bx + x >= w) continue; let a = 0; for (let u = 0; u < 8; u++) a += C8[u][y] * t[u * 8 + x]; p[(by + y) * w + bx + x] = (a + 128) / 255; } }
}
function webimg(grid, g, o, rnd) {
  const { W, H, P } = work(grid, g, o), sw = Math.max(16, Math.round(o.w || 320)), sh = Math.max(12, Math.round(o.h || sw * H / W)), n = sw * sh;
  let S = P.map(p => V.resize(p, W, H, sw, sh)); const bg = hex(o.background || "C0C0C0");
  if (o.format === "jpeg") {
    const q = o.quality !== undefined ? o.quality : 6, prog = o.progressive || 0, keep = [64, 1, 6, 21, 64][prog] || 64;
    const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n); for (let i = 0; i < n; i++) { Y[i] = lumOf(S[0][i], S[1][i], S[2][i]); Cb[i] = 0.5 + (S[2][i] - Y[i]) * 0.564; Cr[i] = 0.5 + (S[0][i] - Y[i]) * 0.713; }
    const hw = Math.ceil(sw / 2), hh = Math.ceil(sh / 2), cb = V.resize(Cb, sw, sh, hw, hh), cr = V.resize(Cr, sw, sh, hw, hh);
    const qs = prog === 1 ? q * 3 : prog === 2 ? q * 2 : q; // early scans also carry coarser values [EST]
    dct(Y, sw, sh, qs, keep); dct(cb, hw, hh, qs * 1.6, Math.min(keep, prog ? 1 : 64)); dct(cr, hw, hh, qs * 1.6, Math.min(keep, prog ? 1 : 64));
    const CB = nearestUp(cb, hw, hh, sw, sh), CR = nearestUp(cr, hw, hh, sw, sh);
    for (let i = 0; i < n; i++) { const y = Y[i], u = CB[i] - 0.5, v = CR[i] - 0.5; S[0][i] = y + 1.402 * v; S[1][i] = y - 0.344 * u - 0.714 * v; S[2][i] = y + 1.772 * u; }
    S = S.map(p => p.map(clamp01));
    if (o.display8 && o.display8 !== "off") S = toPalette(S, sw, sh, WEB216, o.display8 === "diffusion" ? "diffusion" : "ordered"); // a 256-colour screen [SEC: dithered]
    if (o.loaded !== undefined && o.loaded < 1 && !prog) { const rows = Math.floor(clamp01(o.loaded) * sh / 8) * 8; for (const [c, p] of S.entries()) for (let i = rows * sw; i < n; i++) p[i] = bg[c]; }
  } else { // GIF (and 8-bit PNG): a palette of up to 256 colours
    const pk = o.palette || "web216", pal = pk === "win16" ? WIN16 : pk === "grey" ? Array.from({ length: Math.max(2, o.colours || 16) }, (_, k, a) => { const v = k / (a.length - 1); return [v, v, v]; }) : pk === "adaptive" ? adaptive(S, n, Math.max(2, Math.min(256, Math.round(o.colours || 32))), rnd) : pk === "mono" ? [[0, 0, 0], [1, 1, 1]] : WEB216;
    S = toPalette(S, sw, sh, pal, o.dither === undefined ? "diffusion" : o.dither);
    const pass = o.pass || 4; if (pass < 4) { const starts = [[0, 8], [4, 8], [2, 4], [1, 2]].slice(0, pass); const have = new Uint8Array(sh); for (const [s0, st] of starts) for (let y = s0; y < sh; y += st) have[y] = 1;
      for (const p of S) { let last = -1; for (let y = 0; y < sh; y++) { if (have[y]) last = y; else if (last >= 0 && o.replicate !== false) p.copyWithin(y * sw, last * sw, last * sw + sw); else for (let x = 0; x < sw; x++) p[y * sw + x] = NaN; } }
      S.forEach((p, c) => { for (let i = 0; i < n; i++) if (Number.isNaN(p[i])) p[i] = bg[c]; }); }
  }
  const up = o.smooth ? S.map(p => V.resize(p, sw, sh, W, H)) : S.map(p => nearestUp(p, sw, sh, W, H));
  return back(up, W, H, g);
}

function net(grid, g, o) {
  o = o || {}; const fn = { minitel, telidon, sstv, radiofax, webimg }[o.kind]; if (!fn) return grid;
  const rnd = V.mulberry32(((o.seed || 1) * 2246822519 + 29) >>> 0);
  return fn(grid, g, o, rnd).map(p => { for (let i = 0; i < p.length; i++) p[i] = p[i] < 0 ? 0 : p[i] > 1.05 ? 1.05 : p[i]; return p; });
}
const api = { KINDS, net, WEB216, naplpsPalette };
if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof globalThis !== "undefined") globalThis.VLNet = api;
