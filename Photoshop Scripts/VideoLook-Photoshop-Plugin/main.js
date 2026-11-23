// VideoLook - UXP panel
// Television and video looks for Photoshop: camera, standard, channel, recording, transfer, decoder, display, view.
// The engine (vl_*.js) builds and decodes a real video signal; this file is the panel and the Photoshop plumbing.

const { app, core, action, imaging, constants } = require("photoshop");
const batchPlay = action.batchPlay;
const V = require("./vl_core.js");
const CAM = require("./vl_camera.js");
const DSP = require("./vl_display.js");
const REC = require("./vl_record.js");
require("./vl_transfer.js");
const TXT = require("./vl_text.js");
const DIG = require("./vl_digital.js");
const STRM = require("./vl_stream.js");
const PAN = require("./vl_panel.js");
const SYN = require("./vl_synth.js");
const PAP = require("./vl_paper.js");
const PIPE = require("./vl_pipeline.js");
const LOOKS = require("./vl_presets.js").LOOKS;

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function getPath(o, p) { return p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== "object") a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
// Settings saved before 1.2 gave photo softness in pixels; it is now a percentage of the picture width (1 px taken as 0.03%).
function migrate(o) { if (o && o.view && o.view.focus > 0) { if (!(o.view.soft > 0)) o.view.soft = Math.min(1.5, o.view.focus * 0.03); o.view.focus = 0; } return o; }
function mergeDeep(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; mergeDeep(a[k], b[k]); } else a[k] = deep(b[k]); } return a; }

// ------------------------------------------------------------------ state

const SECTION_KEYS = ["camera", "source", "stream", "encoder", "channel", "recording", "transfer", "decoder", "display", "view", "paper", "overlay"];
const BASE = {
    standard: "PAL-I", aspect: 4 / 3,
    camera: { type: "none", exposure: 0, soft: 0, overrides: {}, reg: {}, lensBarrel: 0, ir: 0 },
    source: { kind: "none", charset: "ascii", reverse: false, dotStretch: false, palette: "mono2", dither: "none", contrast: 1, brightness: 0, gamma: 1, glow: 0, separated: false, hold: false, saturate: 1,
        lines: 64, height: 0.18, rotate: 0, skew: 0, zMod: 0.6, freqH: 0, ampH: 0, freqV: 0, ampV: 0, wave: "sine", magnet: { strength: 0, x: 0.5, y: 0.45, radius: 0.25 },
        colourSet: "scanimate", edge: 0, blend: 0, zoom: 0.92, iterations: 14, hueShift: 0, loopMix: 0.6,
        cells: 96, contours: 4, simplify: 0.6, colourLevels: false, tint: "", dwell: 2.5, beam: 0.9, inst: {} },
    stream: { mode: "none", size: "auto", oldPicture: "grey", frames: 8, moveX: 0, moveY: 0, jitter: 6, q: 8, rate: 0.25, errorAt: 0.35, persist: 0.8, garbage: 0.5, selection: false, budget: 1, skipThr: 4, smoothUp: false },
    encoder: { ntscIQ: true },
    channel: { route: "aerial", snrDb: 44, ghosts: [{ delayUs: 2, amp: 0, phaseDeg: 0 }], impulses: 0, cnrDb: 14, scramble: "none",
        cochannel: { ratio: 0, offsetHz: 10400, dx: 0.31, dy: 0.37, source: "mirror" } },
    receiver: { standard: "same", hold: "auto", vRoll: 0.4, hGain: 0.05, hFree: 0, overload: 0, agcMean: 0 },
    overlay: { kind: "none", fontFilter: "", mode: "mix", text: "", header: "", colour: "white", pos: "bl",
        style: "arial_shadow", font: "", fontFamily: "", italic: "style", size: "", subColour: "style", edge: "style", stage: "style", position: "bottom", caps: "style", strength: 1 },
    recording: { format: "none", position: "studio", generations: 1, tracking: 0, trackingPos: 0.6 },
    transfer: { type: "none", method: "bbc1967", target: "PAL-I", gauge: 16, shutterBar: 0, mode: "pal60", pulldown: "clean", lag: 0, contrast: 1, generations: 1 },
    decoder: { separation: "notch", palMode: "delay", ntscDemod: "equiband", phaseErr: 0, diffPhase: 0 },
    set: { sharpness: 0, contrast: 1, brightness: 0, colour: 1, overscan: 0.04, acCouple: 0, acTilt: 0 },
    display: { phosphor: "", svm: 0, tube: "slot", screenIn: 22, primaries: "EBU", white: "D65", gamma: 2.4, maskStrength: 0.5, spot: 0.3, bloom: 0.7, glow: 0.04, barrel: 0.025, cornerDark: 0.25, roundScreen: 0, panel: "gameboy", dither: "" },
    view: { mode: "closeup", deinterlace: "weave", exposure: 0, bandPos: 0.4, focus: 0, soft: 0, flare: 0, reflection: 0, zoomOut: 0, tilt: 0, finish: "none", printEv: 0, printContrast: 1, printBlack: 0.4, grain: 0, dust: 0, dustLevel: 1 },
    paper: { kind: "none", border: 0, cols: 0, rows: 0, smear: 0.18, streaks: 0.5, register: 0.4, levels: 256, pels: 864, fine: false, halftone: "ordered", errors: 0, errorMode: "mixed", fade: 0, faxPaper: "thermal", scanStreaks: 0, bursts: 0.01,
        lines: 0, hum: 0, jitter: 0.6, static: 0.04, tone: "warm", view: "full", noise: 0.04, passEdge: 0.5, slant: 0, palette: "grey", print: "screen", out: {} },
    seed: 1
};
let st = deep(BASE);
let enabled = {};
let currentLook = "";
let modified = false;
let lastResult = null;

// ------------------------------------------------------------------ controls

const opt = (obj, labelKey) => Object.keys(obj).filter(k => obj[k]).map(k => [k, obj[k][labelKey || "label"]]);
const STD_OPTS = [["PAL-I", "625 PAL (UK System I)"], ["PAL-BG", "625 PAL (Europe B/G/H)"], ["NTSC-M", "525 NTSC (US)"], ["NTSC-J", "525 NTSC (Japan, no set-up)"], ["SECAM-L", "625 SECAM (France L)"],
    ["SECAM-DK", "625 SECAM (USSR/East D/K)"], ["SECAM-BG", "625 SECAM (East Germany B/G)"], ["PAL-M", "525 PAL-M (Brazil)"], ["PAL-N", "625 PAL-N (Argentina)"],
    ["405-A", "405-line (UK, B&W)"], ["819-E", "819-line (France, B&W)"], ["819-F", "819-line (Belgium F, B&W)"], ["625-MONO", "625-line B&W"], ["625-DK-MONO", "625-line B&W (USSR, 6 MHz)"], ["525-MONO", "525-line B&W"],
    ["441-DE", "441-line (Germany 1937-44)"], ["441-US", "441-line (US 1939-41)"], ["343-RU", "343-line (Moscow 1938)"], ["240-BAIRD", "240-line Baird (1936-37)"], ["30-BAIRD", "30-line Baird (1929-35)"],
    ["405-CBS", "405-line CBS field-sequential colour (1951)"], ["320-APOLLO", "320-line Apollo lunar camera"], ["120-SSTV", "120-line slow-scan (1958)"], ["MUSE", "1125-line Hi-Vision MUSE"],
    ["COMP-625", "Component 625 (studio/digital)"], ["COMP-525", "Component 525 (studio/digital)"],
    ["CCTV-625", "625-line CCTV (B&W, 1000-line monitor)"], ["CCTV-525", "525-line CCTV (B&W, 1000-line monitor)"], ["VT100-80", "DEC VT100 terminal (240 lines)"], ["MDA-350", "IBM Monochrome Display (350 lines)"],
    ["CGA-200", "IBM CGA / home computer (200 lines)"], ["PAL-288P", "Home computer on a TV (288 lines, progressive)"], ["TEK-4010", "Tektronix 4010 storage tube"],
    ["SIF-288", "Digital 352 x 288 (Video CD, CIF)"], ["SD-576", "Digital 720 x 576 (DVD, DVB)"], ["HD-720", "Digital 1280 x 720"], ["HD-1080", "Digital 1920 x 1080"]];
const RX_OPTS = [["same", "Same as the broadcast"], ["PAL-I", "UK set (System I PAL)"], ["PAL-BG", "Dutch/German set (B/G PAL)"], ["SECAM-L", "French set (System L SECAM)"], ["SECAM-DK", "Soviet/East set (D/K SECAM)"]];
const camVal = (key) => () => { const c = CAM.CAMERAS[st.camera.type]; const ov = st.camera.overrides || {}; return ov[key] !== undefined ? ov[key] : (c && c[key] !== undefined ? c[key] : 0); };
const camSet = (key) => (v) => { if (!st.camera.overrides) st.camera.overrides = {}; st.camera.overrides[key] = v; };
const recVal = (key) => () => { const f = REC.FORMATS[st.recording.format]; return st.recording[key] !== undefined ? st.recording[key] : (f && f[key] !== undefined ? f[key] : 0); };

const SECTIONS = [
    { key: "camera", title: "Camera", open: true, items: [
        { kind: "select", id: "camType", label: "Camera / pickup", path: "camera.type", options: () => [["none", "(none: the photo is the video)"]].concat(opt(CAM.CAMERAS)), onChange: () => { st.camera.overrides = {}; st.camera.reg = {}; } },
        { kind: "slider", id: "camExp", label: "Exposure (stops)", path: "camera.exposure", min: -2, max: 2.5, step: 0.05 },
        { kind: "slider", id: "camSoft", label: "Softness (% of width)", path: "camera.soft", min: 0, max: 1.5, step: 0.01 },
        { kind: "slider", id: "camLens", label: "Wide-angle lens (barrel)", path: "camera.lensBarrel", min: 0, max: 0.6, step: 0.01, est: true },
        { kind: "slider", id: "camIR", label: "Infrared night mode", path: "camera.ir", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "camNvLight", label: "Night vision: scene light (starlight to dusk)", get: camVal("nvLight"), set: camSet("nvLight"), min: 0, max: 1, step: 0.01, est: true },
        { kind: "select", id: "camThPal", label: "Thermal palette", get: () => { const c = CAM.CAMERAS[st.camera.type] || {}, ov = st.camera.overrides || {}; return ov.thPalette || c.thPalette || "whitehot"; }, set: camSet("thPalette"), options: () => [["whitehot", "White hot"], ["blackhot", "Black hot"], ["ironbow", "Ironbow"], ["rainbow", "Rainbow"], ["arctic", "Arctic"], ["lava", "Lava"]] },
        { kind: "slider", id: "camContour", label: "Edge sharpening", get: camVal("contour"), set: camSet("contour"), min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "slider", id: "camNoise", label: "Signal-to-noise (dB)", get: camVal("noiseDb"), set: camSet("noiseDb"), min: 20, max: 60, step: 0.5 },
        { kind: "slider", id: "camLag", label: "Lag (needs motion)", get: camVal("lag"), set: camSet("lag"), min: 0, max: 0.8, step: 0.01 },
        { kind: "slider", id: "camComet", label: "Comet tails (needs motion)", get: camVal("comet"), set: camSet("comet"), min: 0, max: 2, step: 0.01, est: true },
        { kind: "slider", id: "camHalo", label: "Image-orthicon halo", get: camVal("halo"), set: camSet("halo"), min: 0, max: 0.4, step: 0.01, est: true },
        { kind: "slider", id: "camRegR", label: "Red registration (ns)", get: () => { const r = Object.assign({}, (CAM.CAMERAS[st.camera.type] || {}).reg || {}, st.camera.reg || {}); return r.rx || 0; }, set: (v) => { st.camera.reg = st.camera.reg || {}; st.camera.reg.rx = v; }, min: -150, max: 150, step: 1 },
        { kind: "slider", id: "camRegB", label: "Blue registration (ns)", get: () => { const r = Object.assign({}, (CAM.CAMERAS[st.camera.type] || {}).reg || {}, st.camera.reg || {}); return r.bx || 0; }, set: (v) => { st.camera.reg = st.camera.reg || {}; st.camera.reg.bx = v; }, min: -150, max: 150, step: 1 }
    ], hint: "Camera types carry figures from the BBC documents where they exist (Plumbicon response, 1964 camera comparisons, the 1980 BBC gamma, BBC-style edge sharpening taken from green). Registration: the BBC's 1967 tolerance was 25 ns for 3-tube cameras, 50 ns for a 4-tube camera's colour tubes. Softness blurs the picture before it is scanned (a caption camera slightly out of focus), so the set's scan lines stay crisp over a soft picture." },
    { key: "source", title: "Picture source", open: false, items: [
        { kind: "select", id: "srcKind", label: "Picture made by", path: "source.kind", options: () => Object.keys(DIG.KINDS).map(k => [k, DIG.KINDS[k]]), onChange: () => { st.source.inst = {}; }, hint: "The instruments (space probes to microscopes) show their own controls below when chosen; picking one starts it from its defaults." },
        { kind: "select", id: "srcCharset", label: "Characters", path: "source.charset", options: () => [["ascii", "ASCII (terminal ROM)"], ["cp437", "IBM PC set with shade blocks"]] },
        { kind: "select", id: "srcReverse", label: "Reverse video cells", path: "source.reverse", bool: true, options: () => [["false", "No"], ["true", "Yes"]] },
        { kind: "select", id: "srcPal", label: "Palette", path: "source.palette", options: () => Object.keys(DIG.PALETTES).map(k => [k, DIG.PALETTES[k].label]) },
        { kind: "select", id: "srcDither", label: "Dither", path: "source.dither", options: () => [["none", "None (nearest colour)"], ["bayer", "Ordered (Bayer)"], ["fs", "Error diffusion (Floyd-Steinberg)"]] },
        { kind: "select", id: "srcStretch", label: "Dot stretching (VT100)", path: "source.dotStretch", bool: true, options: () => [["false", "Off"], ["true", "On"]] },
        { kind: "select", id: "srcSep", label: "Teletext mosaics", path: "source.separated", bool: true, options: () => [["false", "Contiguous"], ["true", "Separated"]] },
        { kind: "select", id: "srcHold", label: "Teletext hold mosaics", path: "source.hold", bool: true, options: () => [["false", "Off (colour changes leave gaps)"], ["true", "On"]] },
        { kind: "slider", id: "srcCon", label: "Contrast before conversion", path: "source.contrast", min: 0.3, max: 3, step: 0.01 },
        { kind: "slider", id: "srcBri", label: "Brightness before conversion", path: "source.brightness", min: -0.5, max: 0.5, step: 0.01 },
        { kind: "slider", id: "srcGlow", label: "Storage-tube background glow", path: "source.glow", min: 0, max: 0.3, step: 0.005 },
        { kind: "slider", id: "synLines", label: "Scan processor: lines drawn", path: "source.lines", min: 16, max: 200, step: 1 },
        { kind: "slider", id: "synHeight", label: "Scan processor: height (brightness to lift)", path: "source.height", min: -0.4, max: 0.5, step: 0.005 },
        { kind: "slider", id: "synRot", label: "Scan processor / feedback: rotation (degrees)", path: "source.rotate", min: -45, max: 45, step: 0.5 },
        { kind: "slider", id: "synSkew", label: "Scan processor: depth", path: "source.skew", min: -1, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "synZ", label: "Scan processor: trace brightness follows picture", path: "source.zMod", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "synFH", label: "Scan modulation: across, frequency (Hz)", path: "source.freqH", min: 0, max: 2000, step: 5 },
        { kind: "slider", id: "synAH", label: "Scan modulation: across, amount", path: "source.ampH", min: 0, max: 0.2, step: 0.001 },
        { kind: "slider", id: "synFV", label: "Scan modulation: down, frequency (Hz)", path: "source.freqV", min: 0, max: 20000, step: 10 },
        { kind: "slider", id: "synAV", label: "Scan modulation: down, amount", path: "source.ampV", min: 0, max: 0.2, step: 0.001 },
        { kind: "select", id: "synWave", label: "Scan modulation: waveform", path: "source.wave", options: () => [["sine", "Sine"], ["triangle", "Triangle"], ["square", "Square"]] },
        { kind: "slider", id: "synMag", label: "Magnet on the tube: strength", path: "source.magnet.strength", min: -4, max: 4, step: 0.05, est: true },
        { kind: "slider", id: "synMagX", label: "Magnet: across", path: "source.magnet.x", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "synMagY", label: "Magnet: down", path: "source.magnet.y", min: 0, max: 1, step: 0.01 },
        { kind: "select", id: "synCols", label: "Colouriser colours", path: "source.colourSet", options: () => Object.keys(SYN.COLOURSETS).map(k => [k, k]) },
        { kind: "slider", id: "synEdge", label: "Colouriser: edge emphasis (differentiator)", path: "source.edge", min: 0, max: 2, step: 0.01 },
        { kind: "slider", id: "synBlend", label: "Colouriser: soft level changes", path: "source.blend", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "synZoom", label: "Feedback: camera zoom (below 1 = pulled back)", path: "source.zoom", min: 0.7, max: 1.2, step: 0.005 },
        { kind: "slider", id: "synIter", label: "Feedback: trips round the loop", path: "source.iterations", min: 1, max: 40, step: 1 },
        { kind: "slider", id: "synHue", label: "Feedback: hue turn per trip", path: "source.hueShift", min: -90, max: 90, step: 1, est: true },
        { kind: "slider", id: "synMix", label: "Feedback: loop strength", path: "source.loopMix", min: 0, max: 0.95, step: 0.01 },
        { kind: "slider", id: "vecCells", label: "Vector display: detail (cells across)", path: "source.cells", min: 24, max: 240, step: 1 },
        { kind: "slider", id: "vecLevels", label: "Vector display: contour levels", path: "source.contours", min: 1, max: 10, step: 1 },
        { kind: "slider", id: "vecSimp", label: "Vector display: straighten strokes", path: "source.simplify", min: 0, max: 3, step: 0.05 },
        { kind: "select", id: "vecCol", label: "Vector display: colour by level", path: "source.colourLevels", bool: true, options: () => [["false", "No (one colour)"], ["true", "Yes (colour vector monitor)"]] },
        { kind: "select", id: "vecTint", label: "Vector display: beam colour", path: "source.tint", options: () => [["", "White"], ["80FF80", "Green (P1/P31 scope)"], ["FFB040", "Amber"], ["80C0FF", "Blue-white"]] },
        { kind: "slider", id: "vecDwell", label: "Vector display: bright dots at corners", path: "source.dwell", min: 0, max: 6, step: 0.1, est: true },
        { kind: "slider", id: "vecSpot", label: "Vector display: beam width (px)", path: "source.beam", min: 0.4, max: 3, step: 0.05 },
        // ---- v1.6 instruments: shown only for their own kinds; values live in source.inst (engine defaults in def)
        { kind: "slider", id: "inPx", label: "Pixels across", path: "source.inst.px", min: 16, max: 1200, step: 1, def: { probe: 200, spm: 256 }, kinds: ["probe", "spm"] },
        { kind: "slider", id: "inBits", label: "Bits a pixel", path: "source.inst.bits", min: 1, max: 10, step: 1, def: 6, kinds: ["probe", "mss"] },
        { kind: "select", id: "inPrCol", label: "Colour", path: "source.inst.colour", options: () => [["", "Black and white"], ["filters", "Three frames through filters"]], kinds: ["probe"] },
        { kind: "slider", id: "inFringe", label: "Colour frames out of register (px)", path: "source.inst.fringe", min: 0, max: 6, step: 0.1, def: 0, est: true, kinds: ["probe"] },
        { kind: "select", id: "inScan", label: "Scanned in", path: "source.inst.scan", options: () => [["rows", "Rows (vidicon)"], ["columns", "Columns (lander line-scan camera)"]], kinds: ["probe"] },
        { kind: "slider", id: "inCon", label: "Contrast", path: "source.inst.contrast", min: 0.3, max: 3, step: 0.01, def: { probe: 1, framelet: 1.1 }, kinds: ["probe", "framelet"] },
        { kind: "slider", id: "inOff", label: "Brightness offset", path: "source.inst.offset", min: -0.3, max: 0.3, step: 0.01, def: 0, kinds: ["probe"] },
        { kind: "slider", id: "inShade", label: "Darker towards the corners", path: "source.inst.shading", min: 0, max: 1, step: 0.01, def: 0.25, est: true, kinds: ["probe"] },
        { kind: "slider", id: "inCoh", label: "Coherent interference", path: "source.inst.coherent", min: 0, max: 3, step: 0.05, def: 0, est: true, kinds: ["probe"] },
        { kind: "slider", id: "inLineG", label: "Line-to-line gain wobble", path: "source.inst.lineGain", min: 0, max: 0.2, step: 0.005, def: 0, est: true, kinds: ["probe"] },
        { kind: "slider", id: "inRes", label: "Reseau marks across (0 = none)", path: "source.inst.reseau", get: () => { const r = getPath(st, "source.inst.reseau"); return r ? r[0] : 0; }, set: (v) => setPath(st, "source.inst.reseau", v > 0 ? [v, Math.max(1, Math.round(v * 0.75))] : 0), min: 0, max: 16, step: 1, kinds: ["probe"] },
        { kind: "slider", id: "inResSz", label: "Reseau mark size", path: "source.inst.reseauSize", min: 0.002, max: 0.02, step: 0.0005, def: 0.006, kinds: ["probe"] },
        { kind: "slider", id: "inDrop", label: "Lines lost in telemetry", path: "source.inst.dropouts", min: 0, max: 0.2, step: 0.002, def: 0, est: true, kinds: ["probe"] },
        { kind: "select", id: "inDropF", label: "Lost lines show as", path: "source.inst.dropFill", options: () => [["black", "Black"], ["white", "White"], ["noise", "Noise"]], kinds: ["probe"] },
        { kind: "slider", id: "inLost", label: "Transmission stops at (1 = never)", path: "source.inst.lostFrom", min: 0.2, max: 1, step: 0.01, def: 1, kinds: ["probe"] },
        { kind: "slider", id: "inBitE", label: "Bit errors", path: "source.inst.bitErrors", min: 0, max: 0.02, step: 0.0005, def: 0, est: true, kinds: ["probe"] },
        { kind: "select", id: "inSmooth", label: "Pixels", path: "source.inst.smooth", bool: true, options: () => [["true", "Smoothed"], ["false", "Square blocks"]], kinds: ["probe", "mri"] },
        { kind: "select", id: "inSmooth2", label: "Pixels", path: "source.inst.smooth", bool: true, get: () => getPath(st, "source.inst.smooth") === true, options: () => [["false", "Square blocks"], ["true", "Smoothed"]], kinds: ["ct", "gamma", "spm", "mss"] },
        { kind: "slider", id: "inPrint", label: "Hand-coloured number print: crayon bands (0 = off)", path: "source.inst.printout", min: 0, max: 8, step: 1, def: 0, kinds: ["probe"] },
        { kind: "slider", id: "inStrips", label: "Strips", path: "source.inst.strips", min: 1, max: 40, step: 1, def: 14, kinds: ["framelet"] },
        { kind: "select", id: "inDir", label: "Strips run", path: "source.inst.direction", options: () => [["vertical", "Down"], ["horizontal", "Across"]], kinds: ["framelet"] },
        { kind: "slider", id: "inDrift", label: "Brightness drift across each strip", path: "source.inst.drift", min: 0, max: 0.8, step: 0.01, def: 0.18, est: true, kinds: ["framelet"] },
        { kind: "slider", id: "inSeam", label: "Seams", path: "source.inst.seam", min: 0, max: 1, step: 0.01, def: 0.6, est: true, kinds: ["framelet"] },
        { kind: "slider", id: "inShift", label: "Strips misplaced (px)", path: "source.inst.shift", min: 0, max: 10, step: 0.1, def: 2, est: true, kinds: ["framelet"] },
        { kind: "slider", id: "inScanL", label: "Readout lines showing (0 = none)", path: "source.inst.scanLines", min: 0, max: 800, step: 10, def: 0, kinds: ["framelet", "sem"] },
        { kind: "select", id: "inComp", label: "Bands shown", path: "source.inst.composite", options: () => [["false", "False colour (infrared as red)"], ["natural", "Near-natural colour"], ["band4", "Band 4, green"], ["band5", "Band 5, red"], ["band6", "Band 6, near infrared"], ["band7", "Band 7, near infrared"]], kinds: ["mss"] },
        { kind: "slider", id: "inCols", label: "Pixels across", path: "source.inst.cols", min: 32, max: 800, step: 1, def: { mss: 360, sounder: 240 }, kinds: ["mss", "sounder"] },
        { kind: "slider", id: "inStripe", label: "Striping in sixes", path: "source.inst.stripe", min: 0, max: 6, step: 0.1, def: 1, est: true, kinds: ["mss"] },
        { kind: "slider", id: "inBadL", label: "Bad lines", path: "source.inst.badLines", min: 0, max: 0.05, step: 0.001, def: 0, est: true, kinds: ["mss"] },
        { kind: "slider", id: "inSkew", label: "Scene skew (Earth turning)", path: "source.inst.skew", min: -0.3, max: 0.3, step: 0.01, def: 0, est: true, kinds: ["mss"] },
        { kind: "select", id: "inRadPal", label: "Colours", path: "source.inst.palette", options: () => [["phosphor", "From the display (use the P7 tube)"], ["green", "Green"], ["amber", "Amber"], ["weather", "Weather radar steps"]], kinds: ["radar"] },
        { kind: "slider", id: "inRadR", label: "Screen radius", path: "source.inst.radius", min: 0.2, max: 1, step: 0.01, def: 0.47, kinds: ["radar"] },
        { kind: "slider", id: "inRadCy", label: "Centre, down", path: "source.inst.cy", min: 0, max: 1, step: 0.01, def: 0.5, kinds: ["radar"] },
        { kind: "slider", id: "inRadSw", label: "Sweep bearing (degrees)", path: "source.inst.sweep", min: 0, max: 360, step: 1, def: 40, kinds: ["radar"] },
        { kind: "slider", id: "inRadPer", label: "Afterglow (turns)", path: "source.inst.persist", min: 0, max: 3, step: 0.05, def: 0.7, est: true, kinds: ["radar"] },
        { kind: "slider", id: "inRadBeam", label: "Beam width (degrees)", path: "source.inst.beam", min: 0.3, max: 6, step: 0.1, def: 1.8, est: true, kinds: ["radar"] },
        { kind: "slider", id: "inRings", label: "Range rings", path: "source.inst.rings", min: 0, max: 10, step: 1, def: 4, kinds: ["radar"] },
        { kind: "slider", id: "inClut", label: "Clutter near the centre", path: "source.inst.clutter", min: 0, max: 2, step: 0.05, def: 0.4, est: true, kinds: ["radar"] },
        { kind: "slider", id: "inThr", label: "Echo threshold", path: "source.inst.threshold", min: 0, max: 0.8, step: 0.01, def: 0.25, kinds: ["radar"] },
        { kind: "select", id: "inHead", label: "Heading line", path: "source.inst.heading", bool: true, options: () => [["false", "Off"], ["true", "On"]], kinds: ["radar"] },
        { kind: "select", id: "inSonPal", label: "Colours", path: "source.inst.palette", options: () => [["grey", "Grey"], ["sepia", "Paper record"], ["afmhot", "Gold"], ["ironbow", "Iron"]], kinds: ["sidescan"] },
        { kind: "slider", id: "inAlt", label: "Height above the seabed", path: "source.inst.altitude", min: 0.02, max: 0.4, step: 0.005, def: 0.12, kinds: ["sidescan"] },
        { kind: "slider", id: "inRelief", label: "Seabed relief (shadows)", path: "source.inst.relief", min: 0, max: 0.15, step: 0.002, def: 0.025, est: true, kinds: ["sidescan"] },
        { kind: "slider", id: "inSpeck", label: "Speckle", path: "source.inst.speckle", min: 0, max: 1, step: 0.01, def: 0.35, est: true, kinds: ["sidescan"] },
        { kind: "select", id: "inSndPal", label: "Colours", path: "source.inst.palette", options: () => [["sounder", "Colour sounder"], ["paper", "Paper recorder"], ["inverse", "LCD, black on grey"]], kinds: ["sounder"] },
        { kind: "slider", id: "inLevels", label: "Levels (0 = continuous)", path: "source.inst.levels", min: 0, max: 16, step: 1, def: { sounder: 8, radar: 0, ultrasound: 0, ct: 0, gamma: 0 }, kinds: ["sounder", "radar", "ultrasound", "ct", "gamma"] },
        { kind: "slider", id: "inGain", label: "Gain", path: "source.inst.gain", min: 0.01, max: 3, step: 0.01, def: { sounder: 0.8, radar: 1.6, sidescan: 1, ultrasound: 0.15 }, kinds: ["sounder", "radar", "sidescan", "ultrasound"] },
        { kind: "select", id: "inGeom", label: "Probe", path: "source.inst.geometry", options: () => [["sector", "Sector (fan)"], ["linear", "Linear (rectangle)"], ["convex", "Curved array"]], kinds: ["ultrasound"] },
        { kind: "slider", id: "inBeams", label: "Beam lines", path: "source.inst.beams", min: 16, max: 256, step: 1, def: 128, kinds: ["ultrasound"] },
        { kind: "slider", id: "inScat", label: "Speckle", path: "source.inst.scatter", min: 0, max: 1, step: 0.01, def: 0.35, est: true, kinds: ["ultrasound"] },
        { kind: "slider", id: "inShadow", label: "Shadows below bright things", path: "source.inst.shadow", min: 0, max: 8, step: 0.1, def: 2.5, est: true, kinds: ["ultrasound"] },
        { kind: "select", id: "inBist", label: "Display", path: "source.inst.bistable", bool: true, options: () => [["false", "Grey scale"], ["true", "Bistable (on or off)"]], kinds: ["ultrasound"] },
        { kind: "select", id: "inInv", label: "Polarity", path: "source.inst.invert", bool: true, options: () => [["false", "Normal"], ["true", "Inverted"]], kinds: ["ultrasound", "fluoro"] },
        { kind: "slider", id: "inMatrix", label: "Matrix (pixels across)", path: "source.inst.matrix", min: 32, max: 320, step: 1, def: { ct: 80, mri: 128, gamma: 128 }, kinds: ["ct", "mri", "gamma"] },
        { kind: "slider", id: "inAngles", label: "Projection angles", path: "source.inst.angles", min: 8, max: 640, step: 1, def: 180, kinds: ["ct"] },
        { kind: "slider", id: "inNoise", label: "Noise", path: "source.inst.noise", min: 0, max: 0.1, step: 0.001, def: { probe: 0.02, ct: 0.01, sem: 0.05 }, kinds: ["probe", "ct", "sem"] },
        { kind: "slider", id: "inWin", label: "Window (contrast)", path: "source.inst.window", min: 0.1, max: 1.5, step: 0.01, def: { ct: 0.9, mri: 1 }, kinds: ["ct", "mri"] },
        { kind: "slider", id: "inLev", label: "Level (brightness)", path: "source.inst.level", min: 0, max: 1, step: 0.01, def: { ct: 0.45, mri: 0.5 }, kinds: ["ct", "mri"] },
        { kind: "slider", id: "inGhost", label: "Motion ghosts", path: "source.inst.ghosts", min: 0, max: 1.5, step: 0.01, def: 0, est: true, kinds: ["mri"] },
        { kind: "slider", id: "inFov", label: "Field of view (below 1 wraps round)", path: "source.inst.fov", min: 0.5, max: 1, step: 0.01, def: 1, kinds: ["mri"] },
        { kind: "slider", id: "inFat", label: "Chemical shift (px)", path: "source.inst.fatShift", min: 0, max: 12, step: 1, def: 0, kinds: ["mri"] },
        { kind: "slider", id: "inMriN", label: "Noise", path: "source.inst.noise", min: 0.01, max: 1.5, step: 0.01, def: 0.4, kinds: ["mri"] },
        { kind: "slider", id: "inPin", label: "Pincushion", path: "source.inst.pincushion", min: 0, max: 0.4, step: 0.01, def: 0.12, est: true, kinds: ["fluoro"] },
        { kind: "slider", id: "inGlare", label: "Veiling glare", path: "source.inst.glare", min: 0, max: 1, step: 0.01, def: 0.25, est: true, kinds: ["fluoro"] },
        { kind: "slider", id: "inDose", label: "Dose (low = mottled)", path: "source.inst.dose", min: 0.05, max: 4, step: 0.05, def: 1, est: true, kinds: ["fluoro"] },
        { kind: "slider", id: "inCounts", label: "Counts (thousands)", path: "source.inst.counts", get: () => (getPath(st, "source.inst.counts") || 300000) / 1000, set: (v) => setPath(st, "source.inst.counts", v * 1000), min: 5, max: 2000, step: 5, kinds: ["gamma"] },
        { kind: "select", id: "inGamPal", label: "Colours", path: "source.inst.palette", options: () => [["grey", "Grey"], ["inverse", "Black on white"], ["hot", "Hot"], ["rainbow", "Rainbow"], ["ironbow", "Iron"]], kinds: ["gamma"] },
        { kind: "select", id: "inRound", label: "Field", path: "source.inst.round", bool: true, options: () => [["false", "Square"], ["true", "Round"]], kinds: ["gamma"] },
        { kind: "slider", id: "inEdge", label: "Edge glow", path: "source.inst.edge", min: 0, max: 2, step: 0.01, def: 1, kinds: ["sem"] },
        { kind: "slider", id: "inCharge", label: "Charging", path: "source.inst.charging", min: 0, max: 2, step: 0.01, def: 0, est: true, kinds: ["sem"] },
        { kind: "select", id: "inBar", label: "Data bar", path: "source.inst.databar", bool: true, options: () => [["true", "On"], ["false", "Off"]], kinds: ["sem"] },
        { kind: "text", id: "inBarTxt", label: "Data bar text", path: "source.inst.databarText", kinds: ["sem"] },
        { kind: "select", id: "inSpmPal", label: "Colours", path: "source.inst.palette", options: () => [["afmhot", "Gold"], ["grey", "Grey"], ["hot", "Hot"], ["ironbow", "Iron"]], kinds: ["spm"] },
        { kind: "slider", id: "inLineOff", label: "Line offsets", path: "source.inst.lineOffsets", min: 0, max: 0.3, step: 0.005, def: 0.04, est: true, kinds: ["spm"] },
        { kind: "slider", id: "inStreak", label: "Streaks", path: "source.inst.streaks", min: 0, max: 0.4, step: 0.005, def: 0.02, est: true, kinds: ["spm"] },
        { kind: "slider", id: "inShadeR", label: "Relief shading", path: "source.inst.shade", min: 0, max: 2, step: 0.05, def: 0, kinds: ["spm"] },
        { kind: "slider", id: "cpW", label: "Camera: pixels across", path: "source.inst.w", min: 64, max: 1280, step: 1, def: 320, kinds: ["digicam"] },
        { kind: "slider", id: "cpH", label: "Camera: pixels down", path: "source.inst.h", min: 48, max: 1024, step: 1, def: 240, kinds: ["digicam"] },
        { kind: "select", id: "cpCol", label: "Camera: colour", path: "source.inst.colour", options: () => [["", "Colour"], ["mono", "Black and white"]], kinds: ["digicam", "scanner"] },
        { kind: "select", id: "cpMos", label: "Camera: colour filter mosaic", path: "source.inst.mosaic", bool: true, options: () => [["true", "On (one colour a pixel, rebuilt)"], ["false", "Off"]], kinds: ["digicam"] },
        { kind: "slider", id: "cpSat", label: "Camera: colour saturation", path: "source.inst.saturation", min: 0, max: 1.5, step: 0.01, def: 0.85, est: true, kinds: ["digicam"] },
        { kind: "slider", id: "cpExp", label: "Camera: exposure (stops)", path: "source.inst.exposure", min: -2, max: 2, step: 0.05, def: 0, kinds: ["digicam"] },
        { kind: "slider", id: "cpGam", label: "Camera: gamma", path: "source.inst.gamma", min: 0.4, max: 2.5, step: 0.01, def: 1, kinds: ["digicam"] },
        { kind: "slider", id: "cpClip", label: "Camera: highlights clip at", path: "source.inst.clip", min: 0.5, max: 1, step: 0.01, def: 0.9, est: true, kinds: ["digicam"] },
        { kind: "slider", id: "cpSmear", label: "Camera: sensor smear from bright light", path: "source.inst.smear", min: 0, max: 2, step: 0.02, def: 0, est: true, kinds: ["digicam"] },
        { kind: "slider", id: "cpNoise", label: "Noise", path: "source.inst.noise", min: 0, max: 0.2, step: 0.002, def: { digicam: 0.02, scanner: 0.01, slitscan: 0 }, est: true, kinds: ["digicam", "scanner"] },
        { kind: "slider", id: "cpEdge", label: "Camera: edge enhancement", path: "source.inst.edge", min: 0, max: 3, step: 0.05, def: 0, kinds: ["digicam"] },
        { kind: "slider", id: "cpJpeg", label: "Camera: JPEG compression (0 = none)", path: "source.inst.jpeg", min: 0, max: 30, step: 0.5, def: 0, est: true, kinds: ["digicam"] },
        { kind: "slider", id: "cpGreys", label: "Grey levels (0 = full)", path: "source.inst.greys", min: 0, max: 64, step: 1, def: 0, kinds: ["digicam", "scanner"] },
        { kind: "select", id: "cpDith", label: "Camera: dither the levels", path: "source.inst.dither", bool: true, def: false, options: () => [["false", "Off"], ["true", "Ordered 4 x 4"]], kinds: ["digicam"] },
        { kind: "select", id: "cpPal", label: "Camera: shown as", path: "source.inst.palette", options: () => [["", "Its own colours"], ["dmg", "Game Boy screen greens"]], kinds: ["digicam"] },
        { kind: "text", id: "cpTint", label: "Camera: tint (hex, blank = none)", path: "source.inst.tint", kinds: ["digicam"] },
        { kind: "select", id: "cpSmooth", label: "Camera: pixels shown", path: "source.inst.smooth", bool: true, def: false, options: () => [["false", "Square (as stored)"], ["true", "Smoothed (as printed)"]], kinds: ["digicam"] },
        { kind: "select", id: "cpMode", label: "Scanner", path: "source.inst.mode", options: () => [["", "Flatbed"], ["hand", "Hand-held"]], kinds: ["scanner"] },
        { kind: "slider", id: "cpSpeed", label: "Hand scanner: uneven speed", path: "source.inst.speed", min: 0, max: 2, step: 0.02, def: 0.6, est: true, kinds: ["scanner"] },
        { kind: "slider", id: "cpWob", label: "Hand scanner: wobble", path: "source.inst.wobble", min: 0, max: 0.2, step: 0.002, def: 0.04, est: true, kinds: ["scanner"] },
        { kind: "slider", id: "cpBands", label: "Hand scanner: passes to cover the page", path: "source.inst.bands", min: 1, max: 4, step: 1, def: 1, kinds: ["scanner"] },
        { kind: "slider", id: "cpReg", label: "Flatbed: three-pass colour misregistration", path: "source.inst.register", min: 0, max: 12, step: 0.1, def: 0, est: true, kinds: ["scanner"] },
        { kind: "slider", id: "cpMoveAt", label: "Subject moved at (fraction of the scan, 1 = never)", path: "source.inst.moveAt", min: 0, max: 1, step: 0.01, def: 1, kinds: ["scanner"] },
        { kind: "slider", id: "cpMoveX", label: "Subject moved across by", path: "source.inst.moveX", min: -0.3, max: 0.3, step: 0.005, def: 0, kinds: ["scanner"] },
        { kind: "slider", id: "cpMoveY", label: "Subject moved down by", path: "source.inst.moveY", min: -0.3, max: 0.3, step: 0.005, def: 0, kinds: ["scanner"] },
        { kind: "slider", id: "cpLamp", label: "Scanner: uneven lamp", path: "source.inst.lamp", min: 0, max: 0.3, step: 0.005, def: 0.04, est: true, kinds: ["scanner"] },
        { kind: "slider", id: "cpStreak", label: "Scanner: sensor streaks", path: "source.inst.streaks", min: 0, max: 2, step: 0.02, def: 0, est: true, kinds: ["scanner"] },
        { kind: "select", id: "cpDir", label: "Slit-scan: time runs", path: "source.inst.direction", options: () => [["", "Across (photo finish)"], ["vertical", "Down"]], kinds: ["slitscan"] },
        { kind: "slider", id: "cpSpVar", label: "Slit-scan: uneven speeds", path: "source.inst.speedVar", min: 0, max: 2, step: 0.02, def: 0.8, est: true, kinds: ["slitscan"] },
        { kind: "slider", id: "cpStalls", label: "Slit-scan: stops (subject still, stretched to stripes)", path: "source.inst.stalls", min: 0, max: 10, step: 1, def: 3, kinds: ["slitscan"] },
        { kind: "slider", id: "cpStLen", label: "Slit-scan: length of each stop", path: "source.inst.stallLen", min: 0, max: 0.3, step: 0.005, def: 0.08, kinds: ["slitscan"] },
        { kind: "slider", id: "cpWave", label: "Slit-scan: wave in the slit", path: "source.inst.wave", min: 0, max: 0.3, step: 0.005, def: 0, kinds: ["slitscan"] },
        { kind: "slider", id: "cpWaveF", label: "Slit-scan: waves", path: "source.inst.waveFreq", min: 0.5, max: 12, step: 0.1, def: 3, kinds: ["slitscan"] },
        { kind: "select", id: "cpRev", label: "Slit-scan: direction of travel", path: "source.inst.reverse", bool: true, def: false, options: () => [["false", "Left to right"], ["true", "Right to left"]], kinds: ["slitscan"] },
        { kind: "select", id: "cpScale", label: "Slit-scan: timing marks", path: "source.inst.scale", bool: true, def: false, options: () => [["false", "Off"], ["true", "On"]], kinds: ["slitscan"] },
        { kind: "select", id: "cpFin", label: "Slit-scan: finish line", path: "source.inst.finishLine", bool: true, options: () => [["true", "With the timing marks"], ["false", "Off"]], kinds: ["slitscan"] },
        { kind: "select", id: "ntMcol", label: "Minitel: screen", path: "source.inst.colour", options: () => [["", "Black and white (8 greys)"], ["colour", "Colour (8 colours)"]], kinds: ["minitel"] },
        { kind: "select", id: "ntSep", label: "Mosaic dots", path: "source.inst.separated", bool: true, def: false, options: () => [["false", "Joined"], ["true", "Separated"]], kinds: ["minitel"] },
        { kind: "text", id: "ntHead", label: "Minitel: service row text", path: "source.inst.header", kinds: ["minitel"] },
        { kind: "slider", id: "ntCon", label: "Contrast", path: "source.inst.contrast", min: 0.5, max: 3, step: 0.02, def: { minitel: 1.2, radiofax: 1.2 }, kinds: ["minitel", "radiofax"] },
        { kind: "slider", id: "ntBri", label: "Minitel: brightness", path: "source.inst.brightness", min: -0.5, max: 0.5, step: 0.01, def: 0, kinds: ["minitel"] },
        { kind: "slider", id: "ntDrawn", label: "Page drawn so far (1 = all)", path: "source.inst.drawn", min: 0, max: 1, step: 0.01, def: 1, kinds: ["minitel", "telidon"] },
        { kind: "select", id: "ntTpal", label: "Telidon: palette", path: "source.inst.palette", options: () => [["", "16: eight greys and eight hues"], ["grey", "Eight greys"]], kinds: ["telidon"] },
        { kind: "slider", id: "ntDet", label: "Telidon: detail (cells across before tracing)", path: "source.inst.detail", min: 16, max: 200, step: 1, def: 64, est: true, kinds: ["telidon"] },
        { kind: "slider", id: "ntSat", label: "Telidon: colour boost", path: "source.inst.saturate", min: 0.5, max: 4, step: 0.05, def: 2.2, est: true, kinds: ["telidon"] },
        { kind: "slider", id: "ntSmooth", label: "Telidon: rounding of shapes", path: "source.inst.smooth", min: 0, max: 3, step: 0.05, def: 0.9, kinds: ["telidon"] },
        { kind: "slider", id: "ntOut", label: "Telidon: outlines", path: "source.inst.outline", min: 0, max: 4, step: 0.1, def: 0, kinds: ["telidon"] },
        { kind: "text", id: "ntOutC", label: "Telidon: outline colour (hex)", path: "source.inst.outlineColour", kinds: ["telidon"] },
        { kind: "select", id: "ntMode", label: "SSTV mode", path: "source.inst.mode", options: () => [["macdonald", "Macdonald's original (120 lines, B&W)"], ["robot8", "Robot 8 (160 x 120, B&W)"], ["robot36", "Robot 36 (320 x 240, colour)"], ["martin1", "Martin M1 (320 x 256, colour)"], ["scottie1", "Scottie S1 (320 x 256, colour)"]], def: "martin1", kinds: ["sstv"] },
        { kind: "slider", id: "ntNoise", label: "Noise", path: "source.inst.noise", min: 0, max: 0.4, step: 0.005, def: { sstv: 0.04, radiofax: 0.05 }, est: true, kinds: ["sstv", "radiofax"] },
        { kind: "slider", id: "ntFade", label: "Fading", path: "source.inst.fading", min: 0, max: 1.5, step: 0.02, def: { sstv: 0, radiofax: 0.3 }, est: true, kinds: ["sstv", "radiofax"] },
        { kind: "slider", id: "ntSlant", label: "Slant (receiver clock wrong)", path: "source.inst.slant", min: -0.5, max: 0.5, step: 0.005, def: 0, kinds: ["sstv", "radiofax"] },
        { kind: "slider", id: "ntCrash", label: "SSTV: static crashes", path: "source.inst.crashes", min: 0, max: 0.3, step: 0.005, def: 0, est: true, kinds: ["sstv"] },
        { kind: "slider", id: "ntQrm", label: "SSTV: interference whistle", path: "source.inst.qrm", min: 0, max: 1, step: 0.01, def: 0, est: true, kinds: ["sstv"] },
        { kind: "slider", id: "ntMis", label: "SSTV: colours out of step (pixels)", path: "source.inst.misreg", min: 0, max: 12, step: 0.5, def: 0, est: true, kinds: ["sstv"] },
        { kind: "slider", id: "ntCut", label: "SSTV: received down to (1 = whole picture)", path: "source.inst.cutoff", min: 0.1, max: 1, step: 0.01, def: 1, kinds: ["sstv"] },
        { kind: "select", id: "ntAfter", label: "SSTV: below the cut", path: "source.inst.after", options: () => [["", "Black"], ["noise", "Noise"]], kinds: ["sstv"] },
        { kind: "text", id: "ntCap", label: "SSTV: text sent on the picture", path: "source.inst.caption", kinds: ["sstv"] },
        { kind: "select", id: "ntFmode", label: "Radiofax: picture", path: "source.inst.mode", options: () => [["", "Photo (greys)"], ["chart", "Chart (black and white)"]], kinds: ["radiofax"] },
        { kind: "slider", id: "ntThr", label: "Radiofax chart: black below", path: "source.inst.threshold", min: 0.1, max: 0.9, step: 0.01, def: 0.42, kinds: ["radiofax"] },
        { kind: "slider", id: "ntPhase", label: "Radiofax: out of phase (split picture)", path: "source.inst.phase", min: 0, max: 1, step: 0.01, def: 0, kinds: ["radiofax"] },
        { kind: "slider", id: "ntPhasing", label: "Radiofax: phasing lines at the top", path: "source.inst.phasing", min: 0, max: 0.3, step: 0.005, def: 0, kinds: ["radiofax"] },
        { kind: "slider", id: "ntStat", label: "Radiofax: static streaks", path: "source.inst.static", min: 0, max: 0.3, step: 0.005, def: 0.02, est: true, kinds: ["radiofax"] },
        { kind: "slider", id: "ntWh", label: "Radiofax: interference whistle", path: "source.inst.whistle", min: 0, max: 1, step: 0.01, def: 0, est: true, kinds: ["radiofax"] },
        { kind: "text", id: "ntInk", label: "Radiofax: ink colour (hex)", path: "source.inst.ink", kinds: ["radiofax"] },
        { kind: "text", id: "ntPaper", label: "Radiofax: paper colour (hex)", path: "source.inst.paperColour", kinds: ["radiofax"] },
        { kind: "select", id: "ntFmt", label: "Web: file", path: "source.inst.format", options: () => [["", "GIF (palette)"], ["jpeg", "JPEG"]], kinds: ["webimg"] },
        { kind: "slider", id: "ntW", label: "Web: pixels across", path: "source.inst.w", min: 16, max: 1024, step: 1, def: 320, kinds: ["webimg"] },
        { kind: "select", id: "ntPal", label: "Web GIF: palette", path: "source.inst.palette", options: () => [["web216", "Browser-safe 216"], ["adaptive", "Adaptive (its own colours)"], ["win16", "Windows 16 colours"], ["grey", "Greys"], ["mono", "Black and white"]], def: "web216", kinds: ["webimg"] },
        { kind: "slider", id: "ntCols", label: "Web GIF: colours (adaptive or grey)", path: "source.inst.colours", min: 2, max: 256, step: 1, def: 32, kinds: ["webimg"] },
        { kind: "select", id: "ntDith", label: "Web GIF: dither", path: "source.inst.dither", options: () => [["diffusion", "Diffusion"], ["ordered", "Pattern (ordered)"], ["none", "None (banded)"]], def: "diffusion", kinds: ["webimg"] },
        { kind: "slider", id: "ntPass", label: "Web GIF: interlace passes arrived (4 = all)", path: "source.inst.pass", min: 1, max: 4, step: 1, def: 4, kinds: ["webimg"] },
        { kind: "slider", id: "ntQ", label: "Web JPEG: compression", path: "source.inst.quality", min: 0.5, max: 30, step: 0.5, def: 6, est: true, kinds: ["webimg"] },
        { kind: "slider", id: "ntProg", label: "Web JPEG: progressive scans arrived (0 = baseline)", path: "source.inst.progressive", min: 0, max: 4, step: 1, def: 0, kinds: ["webimg"] },
        { kind: "slider", id: "ntLoad", label: "Web JPEG (baseline): loaded so far", path: "source.inst.loaded", min: 0, max: 1, step: 0.01, def: 1, kinds: ["webimg"] },
        { kind: "select", id: "ntD8", label: "Web JPEG: shown on", path: "source.inst.display8", options: () => [["off", "A full-colour screen"], ["ordered", "A 256-colour screen (dithered to 216)"], ["diffusion", "A 256-colour screen (diffused)"]], def: "off", kinds: ["webimg"] },
        { kind: "select", id: "ntSm", label: "Web: enlarged by the browser", path: "source.inst.smooth", bool: true, def: false, options: () => [["false", "Square pixels"], ["true", "Smoothed"]], kinds: ["webimg"] },
        { kind: "text", id: "ntBg", label: "Background (hex)", path: "source.inst.background", kinds: ["webimg", "telidon"] }
    ], hint: "Turns the photo into a picture a terminal, a computer or a teletext page could actually have shown: characters chosen cell by cell, a fixed palette, or teletext's 2 x 3 block mosaics. Pick a matching standard (VT100, MDA, CGA, home computer on a TV) and usually switch Standard & colour off so the picture drives the monitor directly. Video synthesisers (v1.4): the scan processor re-draws the picture as lines lifted by their brightness (Rutt/Etra), scan modulation bends the raster with audio waveforms or a magnet (Paik/Abe), the colouriser slices the grey scale into flat colours (Scanimate, Sandin), and feedback points the camera at its own monitor." },
    { key: "encoder", title: "Standard & colour", open: true, items: [
        { kind: "select", id: "std", label: "Television standard", path: "standard", options: () => STD_OPTS, onChange: () => { if (st.standard === "405-A" && st.aspect === 16 / 9) st.aspect = 4 / 3; if (st.standard === "30-BAIRD") { st.aspect = 3 / 7; st.view.mode = "televisor"; } else if (st.aspect < 0.5) st.aspect = 4 / 3; if (st.standard === "MUSE") st.aspect = 16 / 9; if (st.standard === "120-SSTV") st.aspect = 1; } },
        { kind: "select", id: "aspect", label: "Picture shape", path: "aspect", num: true, options: () => [["1.3333333333333333", "4:3"], ["1.25", "5:4 (405-line before 1950)"], ["1.7777777777777777", "16:9 (PALplus, Hi-Vision, late DV)"], ["1.15", "1.15:1 (Germany 441)"], ["1", "1:1 (slow-scan)"], ["0.42857142857142855", "3:7 tall (Baird 30-line)"]], hint: "Ignored when Frame (top of the panel) is set to Fill the document: the picture then takes the document's own shape." },
        { kind: "select", id: "ntscIQ", label: "NTSC colour coding", path: "encoder.ntscIQ", bool: true, options: () => [["true", "I/Q (FCC)"], ["false", "Equal-band (SMPTE 170M)"]] }
    ], hint: "Switch this stage off for a component or digital chain with no PAL/NTSC/SECAM coding (camera and tape straight to a frame-grab)." },
    { key: "channel", title: "Channel", open: false, items: [
        { kind: "select", id: "route", label: "Route", path: "channel.route", options: () => [["studio", "Studio (clean)"], ["aerial", "Aerial"], ["sat_fm", "Satellite FM (Sky)"], ["dmac", "D-MAC (BSB)"]] },
        { kind: "slider", id: "snr", label: "Signal-to-noise (dB)", path: "channel.snrDb", min: 10, max: 60, step: 0.5, hint: "44 excellent, 34 fine, 27 passable, 23 marginal, 17 inferior" },
        { kind: "slider", id: "ghostD", label: "Ghost delay (µs)", path: "channel.ghosts.0.delayUs", min: -2, max: 40, step: 0.1 },
        { kind: "slider", id: "ghostA", label: "Ghost strength", path: "channel.ghosts.0.amp", min: 0, max: 0.6, step: 0.01 },
        { kind: "select", id: "ghostP", label: "Ghost type", path: "channel.ghosts.0.phaseDeg", num: true, options: () => [["0", "Positive"], ["180", "Inverted"], ["90", "Edge-like (quadrature)"]] },
        { kind: "slider", id: "impulses", label: "Interference spots", path: "channel.impulses", min: 0, max: 0.2, step: 0.005 },
        { kind: "slider", id: "cnr", label: "Satellite C/N (dB)", path: "channel.cnrDb", min: 6, max: 20, step: 0.5, est: true },
        { kind: "slider", id: "coRatio", label: "Co-channel station strength", path: "channel.cochannel.ratio", min: 0, max: 0.8, step: 0.01 },
        { kind: "slider", id: "coOff", label: "Co-channel offset (kHz)", get: () => (st.channel.cochannel.offsetHz || 0) / 1000, set: (v) => { st.channel.cochannel.offsetHz = v * 1000; }, min: 0, max: 30, step: 0.1 },
        { kind: "slider", id: "coDx", label: "Second picture across", path: "channel.cochannel.dx", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "coDy", label: "Second picture down", path: "channel.cochannel.dy", min: 0, max: 1, step: 0.01 },
        { kind: "select", id: "coSrc", label: "Second picture", path: "channel.cochannel.source", options: () => [["mirror", "The photo, mirrored"], ["layer", "Layer named 'second picture'"]] },
        { kind: "select", id: "scramble", label: "Scrambling", path: "channel.scramble", options: () => [["none", "None"], ["discret11", "Canal+ Discret 11 (1984)"], ["videocrypt", "VideoCrypt cut and rotate (Sky, 1989)"], ["videocrypt-hack", "VideoCrypt through a home-built decoder"], ["vcs-full", "VideoCrypt-S full line shuffle (BBC Select)"], ["vcs-half", "VideoCrypt-S half shuffle"], ["vcs-delay", "VideoCrypt-S line delay"], ["syster", "Nagravision Syster (Premiere, Canal+, 1990s)"]] }
    ], hint: "Snow grades follow the US TASO study. Ghost delay: 1 µs is about 2% of the picture width; negative = pre-ghost. Co-channel: a second station on the same channel (long-distance reception) shows through with its own sync bars, striped by the few-kHz offset between the two carriers." },
    { key: "recording", title: "Recording", open: false, items: [
        { kind: "select", id: "recFmt", label: "Format", path: "recording.format", options: () => [["none", "(none: live)"]].concat(opt(REC.FORMATS)) },
        { kind: "select", id: "recPos", label: "Recorded", path: "recording.position", options: () => [["studio", "At the studio (before transmission)"], ["home", "At home, off-air"]] },
        { kind: "slider", id: "recGen", label: "Copy generations", path: "recording.generations", min: 1, max: 5, step: 1 },
        { kind: "slider", id: "recJit", label: "Timebase wobble (ns)", get: recVal("jitterNs"), set: (v) => { st.recording.jitterNs = v; }, min: 0, max: 400, step: 5, est: true },
        { kind: "slider", id: "recDrop", label: "Dropouts", get: recVal("dropouts"), set: (v) => { st.recording.dropouts = v; }, min: 0, max: 0.05, step: 0.001, est: true },
        { kind: "slider", id: "recHS", label: "Head-switch lines", get: recVal("headSwitch"), set: (v) => { st.recording.headSwitch = v; }, min: 0, max: 16, step: 1, est: true },
        { kind: "slider", id: "recTrack", label: "Tracking error", path: "recording.tracking", min: 0, max: 1.5, step: 0.05 },
        { kind: "slider", id: "recTrackPos", label: "Tracking band position", path: "recording.trackingPos", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "recBand", label: "Quad head banding", path: "recording.banding", min: 0, max: 4, step: 0.1, est: true }
    ], hint: "Colour-under carriers and bandwidths come from the BBC's 1985 'Colour Under' sheet (U-matic) and manufacturer figures (VHS); tape defect amounts are estimates. Quad banding follows the BBC 1974 tape sheet." },
    { key: "stream", title: "Digital stream", open: false, items: [
        { kind: "select", id: "strMode", label: "What went wrong", path: "stream.mode", options: () => Object.keys(STRM.MODES).map(k => [k, STRM.MODES[k]]) },
        { kind: "select", id: "strSize", label: "Coded picture size", path: "stream.size", options: () => [["auto", "From the standard (720 x 576 for analogue)"], ["sif", "352 x 288 (Video CD)"], ["sd", "720 x 576 (DVD, DVB)"], ["sd480", "720 x 480 (US DVD)"], ["hd720", "1280 x 720"], ["hd1080", "1920 x 1080"], ["cif", "CIF 352 x 288 (H.261 videophone)"], ["qcif", "QCIF 176 x 144 (videophone, 3GP phone)"], ["sqcif", "Sub-QCIF 128 x 96"], ["qvga", "320 x 240 (QuickCam, RealVideo)"], ["qqvga", "160 x 120 (CU-SeeMe, early web)"]] },
        { kind: "select", id: "strOld", label: "Picture the decoder still holds", path: "stream.oldPicture", options: () => [["grey", "Mid grey (a reset decoder)"], ["green", "Empty buffer (green)"], ["mirror", "The photo, mirrored (the previous scene)"], ["layer", "Layer named 'second picture'"], ["self", "The photo itself (P-frame bloom)"]] },
        { kind: "slider", id: "strFrames", label: "Frames since the error (videophone: 0 = a keyframe)", path: "stream.frames", min: 0, max: 60, step: 1 },
        { kind: "slider", id: "strMX", label: "Movement across (px a frame)", path: "stream.moveX", min: -16, max: 16, step: 0.5 },
        { kind: "slider", id: "strMY", label: "Movement down (px a frame)", path: "stream.moveY", min: -16, max: 16, step: 0.5 },
        { kind: "slider", id: "strJit", label: "Stray vectors in flat areas", path: "stream.jitter", min: 0, max: 24, step: 0.5, est: true },
        { kind: "slider", id: "strQ", label: "Quantiser (coarseness)", path: "stream.q", min: 2, max: 31, step: 1 },
        { kind: "slider", id: "strRate", label: "Slice errors (share of rows)", path: "stream.rate", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "strAt", label: "H.264 error position", path: "stream.errorAt", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "strGarb", label: "H.264 garbage", path: "stream.garbage", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "strBudget", label: "Videophone: share of blocks sent", path: "stream.budget", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "strThr", label: "Videophone: change needed to send a block", path: "stream.skipThr", min: 0, max: 40, step: 0.5, est: true },
        { kind: "select", id: "strSmooth", label: "Videophone: enlarged by the player", path: "stream.smoothUp", bool: true, options: () => [["false", "Blocky (pixel doubling)"], ["true", "Smoothed (bilinear)"]] },
        { kind: "select", id: "strSel", label: "Only inside the selection", path: "stream.selection", bool: true, options: () => [["false", "No (whole picture)"], ["true", "Yes (lost-keyframe mode)"]] }
    ], hint: "Broken MPEG-2 and H.264 pictures built on real 16 x 16 macroblocks and 8 x 8 DCT blocks. Lost keyframe: the new scene's motion is applied to the picture the decoder still holds. Slice errors: once a row is hit, the rest of it decodes wrongly. H.264 smear: blocks predicted from their neighbours' edges, so streaks run off." },
    { key: "transfer", title: "Transfer", open: false, items: [
        { kind: "select", id: "trType", label: "Transfer", path: "transfer.type", options: () => [["none", "(none)"], ["convert", "Standards conversion"], ["telerecord", "Telerecording (video to film)"], ["telecine", "Telecine (film to video)"], ["crossplay", "Tape played on another system"]], onChange: () => { const t = st.transfer.type; if (t === "convert") st.transfer.method = "bbc1967"; if (t === "telerecord") st.transfer.method = "suppressed"; rebuildOptions("trMethod"); } },
        { kind: "select", id: "trMethod", label: "Method", path: "transfer.method", options: () => st.transfer.type === "telerecord" ? [["suppressed", "Suppressed field (BBC 1950s)"], ["stored", "Stored field"], ["kinescope", "US kinescope (24 fps)"]] : [["optical", "Optical (camera on monitor)"], ["bbc1967", "BBC 1967 field store"], ["digital", "Digital four-field"], ["motioncomp", "Motion-compensated (1990s)"]] },
        { kind: "select", id: "trTarget", label: "Convert to", path: "transfer.target", options: () => [["PAL-I", "625 PAL (UK)"], ["NTSC-M", "525 NTSC (US)"], ["SECAM-L", "625 SECAM (France)"], ["525-MONO", "525 B&W (US)"], ["625-MONO", "625 B&W"]] },
        { kind: "select", id: "trGauge", label: "Film gauge", path: "transfer.gauge", num: true, options: () => [["16", "16 mm"], ["35", "35 mm"]] },
        { kind: "slider", id: "trBar", label: "Kinescope shutter bar", path: "transfer.shutterBar", min: 0, max: 1, step: 0.01 },
        { kind: "select", id: "trMode", label: "Played as", path: "transfer.mode", options: () => [["pal60", "NTSC tape as PAL-60"], ["ntsc443", "NTSC tape as NTSC 4.43 (PAL-only set)"], ["secam_mono", "SECAM on a PAL-only set"]] },
        { kind: "select", id: "trPull", label: "Telecine frame", path: "transfer.pulldown", options: () => [["clean", "Clean frame"], ["mixed", "3:2 mixed frame (NTSC)"]] },
        { kind: "slider", id: "trGens", label: "Conversion generations", path: "transfer.generations", min: 1, max: 12, step: 1 },
        { kind: "slider", id: "trLag", label: "Converter ghosting (needs motion)", path: "transfer.lag", min: 0, max: 0.9, step: 0.01, est: true },
        { kind: "slider", id: "trCon", label: "Converter contrast", path: "transfer.contrast", min: 0.5, max: 2.5, step: 0.01, est: true }
    ], hint: "Standards conversion re-codes into the target system, so the target's decoder and set apply. Telecine replaces the camera: the photo stands in for the film frame (run FilmLook first for the stock). Telerecording ends in film: the result is the film, not a TV." },
    { key: "decoder", title: "Decoder & set", open: false, items: [
        { kind: "select", id: "sep", label: "Luma/colour separation", path: "decoder.separation", options: () => [["notch", "Notch filter"], ["lowpass", "Cheap low-pass"], ["comb1H", "Comb filter (NTSC 1H)"], ["comb2H", "Comb filter (PAL 2H)"], ["none", "None (B&W set)"]] },
        { kind: "select", id: "palMode", label: "PAL decoder", path: "decoder.palMode", options: () => [["delay", "Delay line (PAL-D, all UK sets)"], ["simple", "Simple PAL (Hanover bars)"]] },
        { kind: "select", id: "ntscDemod", label: "NTSC decoder", path: "decoder.ntscDemod", options: () => [["equiband", "Equal-band (most sets)"], ["IQ", "True I/Q"]] },
        { kind: "slider", id: "phaseErr", label: "Phase error (°)", path: "decoder.phaseErr", min: -45, max: 45, step: 0.5 },
        { kind: "slider", id: "diffPhase", label: "Differential phase (°)", path: "decoder.diffPhase", min: 0, max: 30, step: 0.5 },
        { kind: "slider", id: "setSharp", label: "Set sharpness", path: "set.sharpness", min: 0, max: 2, step: 0.01 },
        { kind: "slider", id: "setCon", label: "Contrast", path: "set.contrast", min: 0.5, max: 1.5, step: 0.01 },
        { kind: "slider", id: "setBri", label: "Brightness", path: "set.brightness", min: -0.2, max: 0.2, step: 0.005 },
        { kind: "slider", id: "setCol", label: "Colour", path: "set.colour", min: 0, max: 2, step: 0.01 },
        { kind: "slider", id: "setOver", label: "Overscan (per side)", path: "set.overscan", min: 0, max: 0.1, step: 0.005 },
        { kind: "select", id: "rxStd", label: "Set built for", path: "receiver.standard", options: () => RX_OPTS },
        { kind: "select", id: "vHold", label: "Vertical hold", path: "receiver.hold", options: () => [["auto", "Automatic (locks if it can)"], ["locked", "Locked"], ["rolling", "Rolling"]] },
        { kind: "slider", id: "vRoll", label: "Roll position", path: "receiver.vRoll", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "hFree", label: "Horizontal hold", path: "receiver.hFree", min: -4, max: 4, step: 0.05, est: true },
        { kind: "slider", id: "hGain", label: "Line lock strength", path: "receiver.hGain", min: 0.005, max: 0.3, step: 0.005, est: true },
        { kind: "slider", id: "overload", label: "Overload (lockout)", path: "receiver.overload", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "agcMean", label: "Mean-level AGC (405, 819, French L)", path: "receiver.agcMean", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "acCouple", label: "Black follows the picture (no DC restorer)", path: "set.acCouple", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "acTilt", label: "Black-level tilt down the screen", path: "set.acTilt", min: 0, max: 1, step: 0.01, est: true }
    ], hint: "Mean-level AGC and Black follows the picture are two faults of older sets, both of which turn a mostly black picture grey and over-drive its whites (and darken a mostly white one): early 405-line sets set their gain from the average signal, and sets with no DC restorer hold the picture's average, not its black, at a fixed brightness. Black-level tilt makes that follow the picture down the screen: grey above a white caption, black below it. Set built for: a set made for another country's system gets that system's carrier levels wrong (French L shows as a negative on a UK set, with no colour and no sync), and other sound carriers leave patterning. Horizontal hold off-centre makes the picture tear; Vertical hold 'Rolling' puts the field bar in the picture. A phase error turns NTSC hues; on a PAL delay-line set it only lowers saturation (cos of the error); simple PAL shows it as Hanover bars. Overscan applies to screen views, not frame-grabs." },
    { key: "display", title: "Display", open: false, items: [
        { kind: "select", id: "tube", label: "Tube", path: "display.tube", options: () => [["mono", "Black & white"], ["delta", "Delta-gun shadow mask"], ["slot", "Slot mask (in-line)"], ["trinitron", "Trinitron aperture grille"], ["wheel", "B&W tube + colour wheel (CBS)"], ["p7", "P7 long-persistence (radar)"], ["panel", "Flat panel or matrix (LCD, plasma, LED, flip-disc)"]] },
        { kind: "select", id: "panel", label: "Panel", path: "display.panel", options: () => Object.keys(PAN.PANELS).map(k => [k, PAN.PANELS[k].label]) },
        { kind: "select", id: "panelDither", label: "Panel dither", path: "display.dither", options: () => [["", "As the panel"], ["none", "None"], ["bayer", "Ordered (Bayer)"], ["fs", "Error diffusion"]] },
        { kind: "slider", id: "screenIn", label: "Screen size (in)", path: "display.screenIn", min: 9, max: 32, step: 1 },
        { kind: "select", id: "phosphor", label: "Monochrome phosphor", path: "display.phosphor", options: () => [["", "As the tube (white)"], ["P4", "P4 white (TV, VT100)"], ["P31", "P31 green (most green monitors)"], ["P39", "P39 green, long glow (IBM 5151)"], ["P1", "P1 green (oscilloscopes, Tektronix)"], ["P3", "P3 amber"], ["P12", "P12 orange"]] },
        { kind: "slider", id: "svm", label: "Scan velocity modulation", path: "display.svm", min: 0, max: 3, step: 0.05, est: true },
        { kind: "select", id: "prim", label: "Phosphors", path: "display.primaries", options: () => [["EBU", "EBU (625 Europe, USSR)"], ["SMPTEC", "SMPTE C (US from late 1960s)"], ["NTSC1953", "NTSC 1953"], ["P22J", "Japanese receiver (1979)"]] },
        { kind: "select", id: "white", label: "White point", path: "display.white", options: () => [["D65", "D65 (6500 K)"], ["K9300", "9300 K (bluish)"], ["K9300_27", "9300 K + 27 MPCD (Japanese sets)"], ["K9300_8", "9300 K + 8 MPCD (Japanese monitors)"], ["C", "Illuminant C"]] },
        { kind: "slider", id: "gamma", label: "Tube gamma", path: "display.gamma", min: 2.0, max: 2.9, step: 0.05 },
        { kind: "slider", id: "mask", label: "Mask visibility", path: "display.maskStrength", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "spot", label: "Scan-line sharpness", get: () => 1 - st.display.spot, set: (v) => { st.display.spot = 1 - v; }, min: 0.2, max: 0.85, step: 0.01, est: true },
        { kind: "slider", id: "bloom", label: "Blooming", path: "display.bloom", min: 0, max: 2, step: 0.01, est: true },
        { kind: "slider", id: "glow", label: "Glow", path: "display.glow", min: 0, max: 0.3, step: 0.005, est: true },
        { kind: "slider", id: "barrel", label: "Curvature", path: "display.barrel", min: 0, max: 0.1, step: 0.001, est: true },
        { kind: "slider", id: "corner", label: "Corner darkening", path: "display.cornerDark", min: 0, max: 0.8, step: 0.01, est: true },
        { kind: "slider", id: "roundScr", label: "Round tube face (0 = off)", path: "display.roundScreen", min: 0, max: 1.2, step: 0.01 }
    ], hint: "Mask and scan lines only draw where your image has enough pixels to show them; on small images they fade out rather than making moiré. Gamma: the standards assumed 2.8 (625) and 2.2 (525); real sets were nearer 2.4." },
    { key: "view", title: "View", open: false, items: [
        { kind: "select", id: "vmode", label: "View", path: "view.mode", options: () => [["grab", "Frame-grab (no screen)"], ["closeup", "Screen close-up"], ["photo", "Photo of the screen"], ["lens", "Through a magnifying lens (KVN-49)"], ["televisor", "Baird Televisor (30-line only)"]] },
        { kind: "select", id: "deint", label: "Frame-grab fields", path: "view.deinterlace", options: () => [["weave", "Both fields (combing on motion)"], ["bob", "One field, line-doubled"], ["blend", "Fields blended"]] },
        { kind: "slider", id: "pexp", label: "Photo exposure (fields; 0 = long)", path: "view.exposure", min: 0, max: 2, step: 0.01 },
        { kind: "slider", id: "pband", label: "Scan position at the click", path: "view.bandPos", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "psoft", label: "Photo softness (% of width)", path: "view.soft", min: 0, max: 1.5, step: 0.01 },
        { kind: "slider", id: "pflare", label: "Glass and lens flare", path: "view.flare", min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "slider", id: "prefl", label: "Room reflection", path: "view.reflection", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "pzoom", label: "Pull back (show the tube surround)", path: "view.zoomOut", min: 0, max: 0.3, step: 0.005 },
        { kind: "slider", id: "ptilt", label: "Camera tilt (°)", path: "view.tilt", min: -6, max: 6, step: 0.1 },
        { kind: "select", id: "pfinish", label: "Photo finish", path: "view.finish", options: () => [["none", "As seen (colour, no print)"], ["bw", "Black-and-white print"]] },
        { kind: "slider", id: "pev", label: "Print exposure (stops)", path: "view.printEv", min: -4, max: 3, step: 0.05 },
        { kind: "slider", id: "pcon", label: "Print contrast", path: "view.printContrast", min: 0.5, max: 2.2, step: 0.01 },
        { kind: "slider", id: "pblack", label: "Print black (0 deep, 1 grey)", path: "view.printBlack", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "pgrain", label: "Photo grain", path: "view.grain", min: 0, max: 1.5, step: 0.01 },
        { kind: "slider", id: "pdust", label: "Dust (amount)", path: "view.dust", min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "slider", id: "pdustLv", label: "Dust brightness", path: "view.dustLevel", min: 0, max: 3, step: 0.05 }
    ], hint: "Photo of the screen. Exposure is in fields (1/50 s each in the UK): 2 is a whole frame (1/25 s, the old rule for photographing a screen), 1 catches one field, so only every other line shows (about 188 lines on 405), between 1 and 2 part of the screen gets both, and below 1 only a band is bright. 0 is a long exposure. Black-and-white print puts the photo through a negative and a print: lower the Print exposure and the screen's whites turn grey and milky. Dust is small, soft and mostly faint, as measured on 1960s off-screen stills: about 0.2 is their density, and Dust brightness 1 their strength. For a soft picture with crisp scan lines, use Softness under Camera, not Photo softness. A photo is made from the whole picture, so its previews take as long as a full render." },
    { key: "paper", title: "Screen to paper", open: false, items: [
        { kind: "select", id: "papKind", label: "Printed by", path: "paper.kind", options: () => [["none", "(none)"]].concat(Object.keys(PAP.KINDS).map(k => [k, PAP.KINDS[k]])), onChange: () => { st.paper.out = {}; } },
        { kind: "slider", id: "papBorder", label: "Paper margin round the picture", path: "paper.border", min: 0, max: 0.15, step: 0.005 },
        { kind: "select", id: "poFilm", label: "Instant: film", path: "paper.out.film", options: () => [["sx70", "Polaroid SX-70 (1972)"], ["p600", "Polaroid 600 (1981)"], ["spectra", "Polaroid Spectra (1986)"], ["peel", "Peel-apart pack film"], ["instax", "Fujifilm Instax"], ["bw", "Black-and-white instant"]], def: "p600", kindsOf: "paper", kinds: ["instant"] },
        { kind: "select", id: "poFrame", label: "Instant: white frame", path: "paper.out.frame", bool: true, def: false, options: () => [["false", "Off (picture fills the document)"], ["true", "On (with the wide bottom edge)"]], kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poManip", label: "Instant: pushed about while developing", path: "paper.out.manipulate", min: 0, max: 2, step: 0.02, def: 0, est: true, kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poSoft", label: "Instant: extra softness", path: "paper.out.soft", min: 0, max: 4, step: 0.05, def: 0, kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poExp", label: "Instant: expired film", path: "paper.out.expired", min: 0, max: 1, step: 0.01, def: 0, est: true, kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poUnev", label: "Instant: uneven development", path: "paper.out.uneven", min: 0, max: 0.3, step: 0.005, def: 0.04, est: true, kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poEdge", label: "Instant: chemistry short of the edge", path: "paper.out.edgeChem", min: 0, max: 1, step: 0.01, def: 0, est: true, kindsOf: "paper", kinds: ["instant"] },
        { kind: "select", id: "poRoll", label: "Instant: dirty rollers", path: "paper.out.rollers", num: true, def: 0, options: () => [["0", "Clean"], ["1", "Marks across the picture"]], kindsOf: "paper", kinds: ["instant"] },
        { kind: "slider", id: "poCols", label: "Characters across", path: "paper.out.cols", min: 20, max: 264, step: 1, def: { lineprinter: 132, rtty: 72 }, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poLpi", label: "Lines to the inch", path: "paper.out.lpi", min: 3, max: 12, step: 1, def: 6, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poOver", label: "Characters struck in one place (overprinting)", path: "paper.out.overprint", min: 1, max: 3, step: 1, def: 2, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "select", id: "poSet", label: "Line printer: characters", path: "paper.out.charset", options: () => [["", "Upper case print chain"], ["full", "Upper and lower case"]], kindsOf: "paper", kinds: ["lineprinter"] },
        { kind: "select", id: "poGB", label: "Line printer: paper", path: "paper.out.greenbar", bool: true, options: () => [["true", "Green-bar listing paper"], ["false", "Plain"]], kindsOf: "paper", kinds: ["lineprinter"] },
        { kind: "slider", id: "poTone", label: "Tone curve (higher = lighter middle tones)", path: "paper.out.tone", min: 0.6, max: 3, step: 0.05, def: 1.6, est: true, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poDark", label: "Darken", path: "paper.out.darken", min: -0.5, max: 0.5, step: 0.01, def: 0, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poJit", label: "Hammer and type wander", path: "paper.out.jitter", min: 0, max: 1, step: 0.01, def: 0.15, est: true, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poRib", label: "Ribbon ink", path: "paper.out.ribbon", min: 0.2, max: 1, step: 0.01, def: 0.85, est: true, kindsOf: "paper", kinds: ["lineprinter", "rtty"] },
        { kind: "slider", id: "poCon", label: "Contrast", path: "paper.out.contrast", min: 0.5, max: 3, step: 0.02, def: { instant: 1, lineprinter: 1.2, rtty: 1.2, dotmatrix: 1.1, receipt: 1.15, plotter: 1.1, bartlane: 1.2, fultograph: 1.3, hell: 1.4 }, kindsOf: "paper", kinds: ["lineprinter", "rtty", "dotmatrix", "receipt", "plotter", "bartlane", "fultograph", "hell"] },
        { kind: "select", id: "poDpi", label: "Dot matrix: dots to the inch across", path: "paper.out.dpi", num: true, options: () => [["60", "60 (single density)"], ["120", "120 (double density)"], ["240", "240 (quadruple density)"]], def: 60, kindsOf: "paper", kinds: ["dotmatrix"] },
        { kind: "slider", id: "poWid", label: "Dot matrix: printed width (inches)", path: "paper.out.width", min: 2, max: 13.2, step: 0.1, def: 8, kindsOf: "paper", kinds: ["dotmatrix"] },
        { kind: "select", id: "poDith", label: "Greys made by", path: "paper.out.dither", options: () => [["fs", "Error diffusion"], ["ordered", "Ordered dither 8 x 8"], ["threshold", "None (black or white)"]], def: { dotmatrix: "fs", receipt: "fs", hell: "threshold" }, kindsOf: "paper", kinds: ["dotmatrix", "receipt", "hell"] },
        { kind: "slider", id: "poBand", label: "Dot matrix: passes that do not meet", path: "paper.out.bandError", min: 0, max: 2, step: 0.02, def: 0.3, est: true, kindsOf: "paper", kinds: ["dotmatrix"] },
        { kind: "slider", id: "poRFade", label: "Dot matrix: ribbon drying down the page", path: "paper.out.ribbonFade", min: 0, max: 1, step: 0.01, def: 0.3, est: true, kindsOf: "paper", kinds: ["dotmatrix"] },
        { kind: "slider", id: "poDot", label: "Dot matrix: dot size", path: "paper.out.dot", min: 0.4, max: 1.5, step: 0.01, def: 0.75, kindsOf: "paper", kinds: ["dotmatrix"] },
        { kind: "slider", id: "poDots", label: "Receipt: dots across", path: "paper.out.dots", min: 96, max: 832, step: 8, def: 384, kindsOf: "paper", kinds: ["receipt"] },
        { kind: "slider", id: "poDead", label: "Receipt: dead heating dots", path: "paper.out.deadDots", min: 0, max: 12, step: 1, def: 0, kindsOf: "paper", kinds: ["receipt"] },
        { kind: "slider", id: "poFeed", label: "Receipt: uneven paper feed", path: "paper.out.feed", min: 0, max: 3, step: 0.05, def: 0, est: true, kindsOf: "paper", kinds: ["receipt"] },
        { kind: "slider", id: "poFade", label: "Faded", path: "paper.out.fade", min: 0, max: 0.9, step: 0.01, def: 0, kindsOf: "paper", kinds: ["receipt"] },
        { kind: "select", id: "poPens", label: "Plotter: pens", path: "paper.out.pens", options: () => [["black", "One black pen"], ["cmyk", "Cyan, magenta, yellow, black"], ["primaries", "Black, red, blue, green"], ["sepia", "One brown pen"]], def: "black", kindsOf: "paper", kinds: ["plotter"] },
        { kind: "slider", id: "poSpace", label: "Plotter: line spacing", path: "paper.out.spacing", min: 0.003, max: 0.04, step: 0.0005, def: 0.012, kindsOf: "paper", kinds: ["plotter"] },
        { kind: "slider", id: "poLW", label: "Plotter: pen width (of the spacing)", path: "paper.out.lineWidth", min: 0.05, max: 0.6, step: 0.01, def: 0.22, kindsOf: "paper", kinds: ["plotter"] },
        { kind: "slider", id: "poAng", label: "Plotter: hatching angle", path: "paper.out.angle", min: 0, max: 180, step: 1, def: 45, kindsOf: "paper", kinds: ["plotter"] },
        { kind: "slider", id: "poWob", label: "Plotter: wobble", path: "paper.out.wobble", min: 0, max: 2, step: 0.02, def: 0.3, est: true, kindsOf: "paper", kinds: ["plotter"] },
        { kind: "select", id: "poLv", label: "Bartlane: tone levels", path: "paper.out.levels", num: true, def: 5, options: () => [["5", "5 (1920)"], ["15", "15 (from 1929)"]], kindsOf: "paper", kinds: ["bartlane"] },
        { kind: "slider", id: "poBCols", label: "Bartlane: cells across", path: "paper.out.cols", min: 20, max: 240, step: 1, def: 90, est: true, kindsOf: "paper", kinds: ["bartlane"] },
        { kind: "select", id: "poBMode", label: "Bartlane: printed by", path: "paper.out.mode", options: () => [["", "Telegraph printer typefaces"], ["photo", "Photographic process (1929)"]], kindsOf: "paper", kinds: ["bartlane"] },
        { kind: "slider", id: "poBErr", label: "Bartlane: tape errors", path: "paper.out.errors", min: 0, max: 0.2, step: 0.002, def: 0, kindsOf: "paper", kinds: ["bartlane"] },
        { kind: "slider", id: "poBLine", label: "Bartlane: line marks (photographic)", path: "paper.out.lineMarks", min: 0, max: 0.6, step: 0.01, def: 0.15, est: true, kindsOf: "paper", kinds: ["bartlane"] },
        { kind: "slider", id: "poFLines", label: "Fultograph: lines", path: "paper.out.lines", min: 40, max: 800, step: 2, def: 260, est: true, kindsOf: "paper", kinds: ["fultograph"] },
        { kind: "slider", id: "poFFade", label: "Fultograph: fading signal", path: "paper.out.fading", min: 0, max: 1, step: 0.01, def: 0.35, est: true, kindsOf: "paper", kinds: ["fultograph"] },
        { kind: "slider", id: "poFSlip", label: "Fultograph: drums out of step", path: "paper.out.slip", min: 0, max: 3, step: 0.02, def: 0, est: true, kindsOf: "paper", kinds: ["fultograph"] },
        { kind: "slider", id: "poFStat", label: "Fultograph: static", path: "paper.out.static", min: 0, max: 0.5, step: 0.005, def: 0.03, est: true, kindsOf: "paper", kinds: ["fultograph"] },
        { kind: "slider", id: "poHTapes", label: "Hell: strips of tape", path: "paper.out.tapes", min: 3, max: 60, step: 1, def: 14, kindsOf: "paper", kinds: ["hell"] },
        { kind: "slider", id: "poHGap", label: "Hell: gap between strips", path: "paper.out.gap", min: 0, max: 0.6, step: 0.01, def: 0.18, kindsOf: "paper", kinds: ["hell"] },
        { kind: "slider", id: "poHDrift", label: "Hell: slant (receiver out of time)", path: "paper.out.drift", min: -0.2, max: 0.2, step: 0.002, def: 0.02, kindsOf: "paper", kinds: ["hell"] },
        { kind: "text", id: "poInk", label: "Ink colour (hex, blank = the machine's)", path: "paper.out.ink", kindsOf: "paper", kinds: ["lineprinter", "rtty", "dotmatrix", "receipt", "fultograph", "hell"] },
        { kind: "text", id: "poPaper", label: "Paper colour (hex, blank = the machine's)", path: "paper.out.paperColour", kindsOf: "paper", kinds: ["lineprinter", "rtty", "dotmatrix", "receipt", "plotter", "bartlane", "fultograph", "hell"] },
        { kind: "slider", id: "papCols", kindsOf: "paper", kinds: ["dyesub", "thermalbw"], label: "Printer: dots across (0 = the machine's own)", path: "paper.cols", min: 0, max: 1600, step: 8 },
        { kind: "slider", id: "papRows", kindsOf: "paper", kinds: ["dyesub"], label: "Colour printer: lines down (0 = the machine's own)", path: "paper.rows", min: 0, max: 1200, step: 2 },
        { kind: "slider", id: "papSmear", kindsOf: "paper", kinds: ["dyesub", "thermalbw"], label: "Printer: heat carried to the next line", path: "paper.smear", min: 0, max: 0.8, step: 0.01, est: true },
        { kind: "slider", id: "papStreak", kindsOf: "paper", kinds: ["dyesub", "thermalbw"], label: "Printer: head streaks", path: "paper.streaks", min: 0, max: 3, step: 0.05, est: true },
        { kind: "slider", id: "papReg", kindsOf: "paper", kinds: ["dyesub"], label: "Colour printer: pass misregistration (lines)", path: "paper.register", min: 0, max: 3, step: 0.05, est: true },
        { kind: "slider", id: "papLevels", kindsOf: "paper", kinds: ["thermalbw"], label: "B&W printer: grey levels", path: "paper.levels", min: 4, max: 256, step: 1 },
        { kind: "slider", id: "papPels", kindsOf: "paper", kinds: ["fax"], label: "Fax: pels across the picture", path: "paper.pels", min: 120, max: 1728, step: 8 },
        { kind: "select", id: "papFine", kindsOf: "paper", kinds: ["fax"], label: "Fax: resolution", path: "paper.fine", bool: true, options: () => [["false", "Standard (98 lines per inch)"], ["true", "Fine (196 lines per inch)"]] },
        { kind: "select", id: "papHT", kindsOf: "paper", kinds: ["fax"], label: "Fax: photo mode", path: "paper.halftone", options: () => [["ordered", "Dither 4 x 4"], ["ordered8", "Dither 8 x 8"], ["diffusion", "Error diffusion"], ["threshold", "Text mode (no greys)"]] },
        { kind: "slider", id: "papErr", kindsOf: "paper", kinds: ["fax"], label: "Fax: line errors", path: "paper.errors", min: 0, max: 0.15, step: 0.002 },
        { kind: "select", id: "papErrM", kindsOf: "paper", kinds: ["fax"], label: "Fax: bad lines printed as", path: "paper.errorMode", options: () => [["mixed", "Mixed"], ["garble", "Garbled runs"], ["repeat", "The line before, repeated"]] },
        { kind: "slider", id: "papScan", kindsOf: "paper", kinds: ["fax"], label: "Fax: dirt on the scanner (streaks)", path: "paper.scanStreaks", min: 0, max: 3, step: 0.05, est: true },
        { kind: "select", id: "papFaxP", kindsOf: "paper", kinds: ["fax"], label: "Fax: paper", path: "paper.faxPaper", options: () => [["thermal", "Thermal roll"], ["plain", "Plain paper (laser)"]] },
        { kind: "slider", id: "papFade", kindsOf: "paper", kinds: ["fax"], label: "Fax: faded with age", path: "paper.fade", min: 0, max: 1, step: 0.01, est: true },
        { kind: "slider", id: "papLines", kindsOf: "paper", kinds: ["wirephoto", "apt"], label: "Wirephoto / satellite: lines (0 = automatic)", path: "paper.lines", min: 0, max: 1600, step: 10 },
        { kind: "slider", id: "papJit", kindsOf: "paper", kinds: ["wirephoto"], label: "Wirephoto: line timing wander", path: "paper.jitter", min: 0, max: 6, step: 0.05, est: true },
        { kind: "slider", id: "papHum", kindsOf: "paper", kinds: ["wirephoto"], label: "Wirephoto: mains hum", path: "paper.hum", min: 0, max: 3, step: 0.05, est: true },
        { kind: "slider", id: "papStat", kindsOf: "paper", kinds: ["wirephoto"], label: "Wirephoto: crackle", path: "paper.static", min: 0, max: 0.3, step: 0.005, est: true },
        { kind: "select", id: "papTone", kindsOf: "paper", kinds: ["wirephoto"], label: "Wirephoto: print tone", path: "paper.tone", options: () => [["warm", "Warm"], ["neutral", "Neutral"], ["cold", "Cold"]] },
        { kind: "slider", id: "papBurst", kindsOf: "paper", kinds: ["apt"], label: "Satellite: lines lost to static", path: "paper.bursts", min: 0, max: 0.2, step: 0.002, est: true },
        { kind: "select", id: "papView", kindsOf: "paper", kinds: ["apt"], label: "Satellite: shown", path: "paper.view", options: () => [["full", "Whole line (both channels, sync, telemetry)"], ["a", "Channel A (visible)"], ["b", "Channel B (infrared)"]] },
        { kind: "slider", id: "papNoise", kindsOf: "paper", kinds: ["apt"], label: "Satellite: noise", path: "paper.noise", min: 0, max: 0.4, step: 0.005, est: true },
        { kind: "slider", id: "papEdge", kindsOf: "paper", kinds: ["apt"], label: "Satellite: noise at the start and end of the pass", path: "paper.passEdge", min: 0, max: 2, step: 0.02, est: true },
        { kind: "slider", id: "papSlant", kindsOf: "paper", kinds: ["apt"], label: "Satellite: decoder out of step (slant)", path: "paper.slant", min: -3, max: 3, step: 0.01 },
        { kind: "select", id: "papPal", kindsOf: "paper", kinds: ["apt"], label: "Satellite: colours", path: "paper.palette", options: () => [["grey", "Grey"]].concat(Object.keys(CAM.THERMAL_PALETTES).map(k => [k, k])) },
        { kind: "select", id: "papPrint", kindsOf: "paper", kinds: ["apt"], label: "Satellite: printed on", path: "paper.print", options: () => [["screen", "Screen (plain greys)"], ["fax", "Fax recorder paper"]] }
    ], hint: "The finished picture as a machine put it on paper. Video printers: Sony Mavigraph-class dye sublimation (720 x 468 from NTSC) and black-and-white medical thermal printers (1,280-dot head). Fax: Group 3 pels and lines, dithered, with line errors. Wirephoto: drum lines at about 100 to the inch, sent as a tone on a telephone line. Weather satellite: a NOAA APT line of 2,080 words, two 909-word channels with sync and telemetry. The margin adds paper round the picture; leave it at 0 to fill your design." },
    { key: "overlay", title: "Overlay", open: false, items: [
        { kind: "select", id: "ovKind", label: "Overlay", path: "overlay.kind", options: () => [["none", "(none)"], ["subtitle", "Subtitles"], ["teletext", "Teletext (set's decoder)"], ["timestamp", "Date/time stamp (recorded)"]], onChange: () => { rebuildOptions("subFam"); rebuildOptions("subFace"); } },
        { kind: "select", id: "subStyle", label: "Subtitle style", path: "overlay.style", options: () => Object.keys(TXT.SUB_STYLES).map(k => [k, TXT.SUB_STYLES[k].label]), onChange: () => { Object.assign(st.overlay, { font: "", fontFamily: "", italic: "style", size: "", subColour: "style", edge: "style", stage: "style", caps: "style" }); rebuildOptions("subFam"); rebuildOptions("subFace"); syncUI(); } },
        { kind: "button", id: "fontLoad", label: "Your fonts", text: "Load font list", onClick: () => loadFontList() },
        { kind: "text", id: "fontFilter", label: "Filter families", path: "overlay.fontFilter", onChange: () => rebuildOptions("subFam") },
        { kind: "select", id: "subFam", label: "Font family", path: "overlay.fontFamily", options: () => { const flt = (st.overlay.fontFilter || "").trim().toLowerCase(); const fams = Object.keys(loadFonts()).filter(f => !flt || f.toLowerCase().indexOf(flt) >= 0); if (st.overlay.fontFamily && fams.indexOf(st.overlay.fontFamily) < 0) fams.push(st.overlay.fontFamily); return [["", "(the style's own font)"]].concat(fams.sort((a, b) => a.localeCompare(b)).map(f => [f, f])); },
          onChange: () => { const faces = loadFonts()[st.overlay.fontFamily] || []; const pick = faces.find(f => /^(regular|roman|book|medium)$/i.test(f[1])) || faces[0]; st.overlay.font = pick ? pick[0] : ""; rebuildOptions("subFace"); } },
        { kind: "select", id: "subFace", label: "Font style", path: "overlay.font", options: () => { const faces = loadFonts()[st.overlay.fontFamily] || []; return faces.length ? faces.map(([ps, sty]) => [ps, sty]) : (st.overlay.font ? [[st.overlay.font, st.overlay.font]] : [["", "(the style's own font)"]]); } },
        { kind: "text", id: "subFont", label: "or PostScript name", path: "overlay.font" },
        { kind: "select", id: "subItal", label: "Italic", path: "overlay.italic", options: () => [["style", "As the style"], ["on", "Faux italic on"], ["off", "Off"]] },
        { kind: "slider", id: "subSize", label: "Size (% of picture height)", get: () => 100 * (st.overlay.size || TXT.subStyle(st.overlay).size), set: (v) => { st.overlay.size = v / 100; }, min: 2, max: 10, step: 0.1 },
        { kind: "select", id: "subCol", label: "Subtitle colour", path: "overlay.subColour", options: () => [["style", "As the style"], ["white", "White"], ["white87", "87% white (Dutch)"], ["yellow", "Yellow"], ["cyan", "Cyan"]] },
        { kind: "select", id: "subEdge", label: "Edge", path: "overlay.edge", options: () => [["style", "As the style"], ["none", "None"], ["outline", "Black edge"], ["shadow", "Drop shadow"], ["softshadow", "Soft shadow"], ["box", "Black box"], ["ghostbox", "See-through box"], ["greylabel", "Grey label (BBC)"], ["halo", "Laser halo (cinema)"], ["ragged", "Ragged etching (cinema)"], ["bitmap4", "DVD 4-colour bitmap"]] },
        { kind: "slider", id: "subStr", label: "Edge strength", path: "overlay.strength", min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "select", id: "subStage", label: "Added", path: "overlay.stage", options: () => [["style", "As the style"], ["film", "On the film print"], ["studio", "At the studio / on the master"], ["set", "By the set / player"]] },
        { kind: "select", id: "subPos", label: "Position", path: "overlay.position", options: () => [["bottom", "Bottom"], ["middle", "Middle"], ["top", "Top"]] },
        { kind: "select", id: "subCaps", label: "Case", path: "overlay.caps", options: () => [["style", "As the style"], ["typed", "As typed"], ["caps", "ALL CAPITALS"]] },
        { kind: "select", id: "ovMode", label: "Teletext display", path: "overlay.mode", options: () => [["mix", "Mixed over the picture"], ["page", "Full page (black)"], ["subtitle", "Boxed subtitles"]] },
        { kind: "select", id: "ovCol", label: "Subtitle colour", path: "overlay.colour", options: () => [["white", "White"], ["yellow", "Yellow"], ["cyan", "Cyan"], ["green", "Green"]] },
        { kind: "text", id: "ovHead", label: "Teletext header", path: "overlay.header" },
        { kind: "textarea", id: "ovText", label: "Text", path: "overlay.text" },
        { kind: "select", id: "ovPos", label: "Stamp position", path: "overlay.pos", options: () => [["bl", "Bottom left"], ["br", "Bottom right"], ["tl", "Top left"], ["tr", "Top right"]] }
    ], hint: "Subtitles are typeset with your installed fonts (the style's font, or the first one of a comma-separated list that you have), then burned in where they belonged: on the film print, at the studio, or by the set, so the chain softens them accordingly. TKST, the BBC's own slab serif, isn't available, so the BBC styles use Rockwell. Teletext is drawn by the set, after the decoder. Mark colours with {red} {green} {yellow} {blue} {magenta} {cyan} {white}, double height with {dh}, black boxes with {box}...{/box}. 40 characters a line. The stamp is burned in before recording, so the tape softens it. The font is VideoLook's own." }
];

const ITEMS = {};
for (const s of SECTIONS) for (const it of s.items) ITEMS[it.id] = it;

function fmt(v, it) { const d = it.step >= 1 ? 0 : (it.step >= 0.1 ? 1 : (it.step >= 0.01 ? 2 : 3)); return (+v).toFixed(d); }
function getVal(it) { if (it.get) return it.get(); const v = getPath(st, it.path); if (v !== undefined && v !== null) return v; if (it.def !== undefined) { const kd = it.kindsOf === "paper" ? (st.paper || {}).kind : st.source.kind; return typeof it.def === "object" ? (it.def[kd] !== undefined ? it.def[kd] : it.min) : it.def; } return it.min; }
function setVal(it, v) { if (it.set) it.set(v); else setPath(st, it.path, v); }

function fillSelect(sel, it) {
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    for (const [v, t] of it.options()) { const op = document.createElement("option"); op.value = v; op.textContent = t; sel.appendChild(op); }
}
function rebuildOptions(id) { const it = ITEMS[id], el = $(id); if (it && el) { fillSelect(el, it); syncUI(); } }

function buildUI() {
    const host = $("sections");
    for (const sec of SECTIONS) {
        const h = document.createElement("h2");
        const tw = document.createElement("span"); tw.className = "tw"; tw.textContent = sec.open ? "▾" : "▸";
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "en_" + sec.key; cb.checked = true;
        cb.title = "Switch this stage on or off"; cb.style.marginRight = "6px";
        cb.addEventListener("click", (e) => e.stopPropagation());
        cb.addEventListener("change", () => { enabled[sec.key] = cb.checked; markModified(); showOff(); saveState(); });
        h.appendChild(cb); h.appendChild(tw); h.appendChild(document.createTextNode(sec.title));
        const off = document.createElement("span"); off.id = "off_" + sec.key; off.className = "offtag"; off.textContent = "  off"; h.appendChild(off);
        const body = document.createElement("div"); body.style.display = sec.open ? "block" : "none";
        h.addEventListener("click", () => { const open = body.style.display === "none"; body.style.display = open ? "block" : "none"; tw.textContent = open ? "▾" : "▸"; });
        host.appendChild(h); host.appendChild(body);
        for (const it of sec.items) {
            const row = document.createElement("div"); row.className = "row"; row.id = "row_" + it.id;
            const lab = document.createElement("label"); lab.textContent = it.label;
            if (it.est) { const e = document.createElement("span"); e.className = "est"; e.textContent = "est."; lab.appendChild(e); }
            if (it.hint) lab.title = it.hint;
            row.appendChild(lab);
            if (it.kind === "button") {
                const bt = document.createElement("button"); bt.id = it.id; bt.textContent = it.text; bt.style.flex = "0 0 auto"; bt.style.padding = "4px 10px";
                bt.addEventListener("click", () => it.onClick()); row.appendChild(bt);
            } else if (it.kind === "text" || it.kind === "textarea") {
                const tx = document.createElement(it.kind === "textarea" ? "textarea" : "input"); tx.id = it.id;
                if (it.kind === "text") tx.type = "text"; else { tx.rows = 6; tx.style.width = "100%"; row.style.flexWrap = "wrap"; }
                tx.addEventListener("change", () => { setVal(it, tx.value); if (it.onChange) it.onChange(); switchOn(sec.key); markModified(); saveState(); });
                if (it.onChange) tx.addEventListener("input", () => { setVal(it, tx.value); it.onChange(); });
                row.appendChild(tx);
            } else if (it.kind === "select") {
                const sel = document.createElement("select"); sel.id = it.id; fillSelect(sel, it);
                sel.addEventListener("change", () => {
                    let v = sel.value; if (it.num) v = parseFloat(v); if (it.bool) v = v === "true";
                    setVal(it, v); if (it.onChange) it.onChange(); switchOn(sec.key); markModified(); syncUI(); saveState();
                });
                row.appendChild(sel);
            } else {
                const r = document.createElement("input"); r.type = "range"; r.id = it.id;
                r.min = "0"; r.max = "" + Math.round((it.max - it.min) / it.step); r.step = "1";
                const val = document.createElement("span"); val.className = "val"; val.id = it.id + "Val";
                r.addEventListener("input", () => { const v = it.min + parseInt(r.value, 10) * it.step; setVal(it, v); val.textContent = fmt(v, it); switchOn(sec.key); markModified(); });
                r.addEventListener("change", saveState);
                row.appendChild(r); row.appendChild(val);
            }
            body.appendChild(row);
        }
        if (sec.hint) { const hn = document.createElement("div"); hn.className = "hint"; hn.textContent = sec.hint; body.appendChild(hn); }
    }
    const ls = $("look");
    const none = document.createElement("option"); none.value = ""; none.textContent = "(custom settings)"; ls.appendChild(none);
    let group = "";
    for (const l of LOOKS) {
        if (l.group !== group) { group = l.group; const g = document.createElement("option"); g.value = "__" + group; g.textContent = "── " + group + " ──"; g.disabled = true; ls.appendChild(g); }
        const op = document.createElement("option"); op.value = l.id; op.textContent = l.title; ls.appendChild(op);
    }
    const ph = $("presetsHead"), pb = $("presetsBody");
    ph.addEventListener("click", () => { const open = pb.style.display === "none"; pb.style.display = open ? "block" : "none"; ph.firstChild.textContent = open ? "▾" : "▸"; });
}

function syncUI() {
    for (const id in ITEMS) {
        const it = ITEMS[id], el = $(id); if (!el) continue;
        if (it.kind === "button") continue;
        if (it.kind === "text" || it.kind === "textarea") { const v = getPath(st, it.path); el.value = v === undefined ? "" : "" + v; continue; }
        if (it.kind === "select") {
            let v = it.get ? it.get() : getPath(st, it.path); if ((v === undefined || v === null) && it.def !== undefined) v = getVal(it);
            if (it.num) { const opts = it.options().map(o => o[0]); const m = opts.find(o => Math.abs(parseFloat(o) - v) < 1e-6); v = m !== undefined ? m : opts[0]; }
            else if (it.bool) v = v === false ? "false" : "true";
            el.value = v === undefined ? it.options()[0][0] : "" + v;
        } else {
            const v = getVal(it);
            el.value = "" + Math.round((clamp(v, it.min, it.max) - it.min) / it.step);
            $(id + "Val").textContent = fmt(v, it);
        }
    }
    for (const id in ITEMS) { const it = ITEMS[id], row = $("row_" + id); if (it.kinds && row) row.style.display = it.kinds.indexOf(it.kindsOf === "paper" ? (st.paper || {}).kind : st.source.kind) >= 0 ? "" : "none"; }
    $("look").value = currentLook || "";
    showOff(); showNote();
}
function showOff() {
    for (const k of SECTION_KEYS) {
        const cb = $("en_" + k), t = $("off_" + k);
        if (cb) cb.checked = enabled[k] !== false;
        if (t) t.style.display = enabled[k] === false ? "inline" : "none";
    }
}
function showNote() {
    const l = LOOKS.find(x => x.id === currentLook), n = $("note");
    if (!l) { n.textContent = modified ? "Custom settings." : ""; n.className = ""; return; }
    const ev = l.evidence === "spec" ? " [Built from the specifications: no authentic footage survives to calibrate against.]" : " [Research-based; not yet calibrated to reference frames.]";
    n.textContent = (modified ? "Modified from the look. " : "") + l.note + ev;
    n.className = modified ? "modified" : "";
}
// Changing a control in a switched-off section switches that section on (otherwise the change would do nothing).
function switchOn(key) { if (enabled[key] === false) { enabled[key] = true; showOff(); } }
function markModified() { if (!modified) { modified = true; showNote(); } }

function applyLook(id) {
    const l = LOOKS.find(x => x.id === id);
    if (!l) { currentLook = ""; modified = true; syncUI(); saveState(); return; }
    const seed = st.seed;
    st = mergeDeep(deep(BASE), deep(l.s));
    st.seed = seed;
    // a look ticks the stages it uses
    enabled = {
        camera: !!(l.s.camera && l.s.camera.type), encoder: !(l.s.enabled && l.s.enabled.encoder === false),
        channel: !(l.s.enabled && l.s.enabled.channel === false) && !!l.s.channel, recording: !!(l.s.recording && l.s.recording.format),
        transfer: !!(l.s.transfer && l.s.transfer.type), source: !!(l.s.source && l.s.source.kind), stream: !!(l.s.stream && l.s.stream.mode), decoder: true, display: true, view: true, paper: !!(l.s.paper && l.s.paper.kind), overlay: !!(l.s.overlay && l.s.overlay.kind)
    };
    if (!l.s.channel) st.channel.route = "studio";
    if (!(l.s.aspect)) st.aspect = 4 / 3;
    if (l.s.motion) { $("motionPx").value = "" + (l.s.motion.px || 0); $("motionAngle").value = "" + (l.s.motion.angle || 0); }
    currentLook = l.id; modified = false;
    rebuildOptions("trMethod"); rebuildOptions("subFace"); syncUI(); saveState();
}

// ------------------------------------------------------------------ persistence

function saveState() {
    try { localStorage.setItem("videolook.state", JSON.stringify({ st, enabled, currentLook, modified,
        strength: $("strength").value, source: $("source").value, output: $("output").value, frame: $("frame").value,
        shiftX: $("shiftX").value, shiftY: $("shiftY").value, motionPx: $("motionPx").value, motionAngle: $("motionAngle").value, motionSel: $("motionSel").checked })); } catch (e) {}
}
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem("videolook.state") || "null");
        if (!s) return false;
        st = migrate(mergeDeep(deep(BASE), s.st)); enabled = s.enabled || {}; currentLook = s.currentLook || ""; modified = !!s.modified;
        $("strength").value = s.strength || "100"; $("strengthVal").textContent = $("strength").value;
        $("source").value = s.source || "merged"; $("output").value = s.output || "layer"; $("frame").value = s.frame || "matte";
        $("shiftX").value = s.shiftX || "0"; $("shiftY").value = s.shiftY || "0";
        $("motionPx").value = s.motionPx || "0"; $("motionAngle").value = s.motionAngle || "0"; $("motionSel").checked = !!s.motionSel;
        return true;
    } catch (e) { return false; }
}
function setStatus(msg, isErr) { const el = $("status"); el.textContent = msg; el.className = isErr ? "err" : ""; }

// ------------------------------------------------------------------ photoshop helpers

async function getSelectionBounds(docID) {
    const r = await batchPlay([{ _obj: "get", _target: [{ _property: "selection" }, { _ref: "document", _id: docID }] }], {});
    const s = r && r[0] && r[0].selection;
    if (!s || s.top === undefined) return null;
    const v = (x) => (typeof x === "object" ? x._value : x);
    const b = { left: Math.round(v(s.left)), top: Math.round(v(s.top)), right: Math.round(v(s.right)), bottom: Math.round(v(s.bottom)) };
    if (b.right - b.left < 4 || b.bottom - b.top < 4) return null;
    return b;
}
// Selection as a document-size mask (0..1); falls back to the bounding rectangle if the selection pixels can't be read.
async function getSelectionMask(doc, W, H) {
    const b = await getSelectionBounds(doc.id);
    if (!b) return null;
    const m = new Float32Array(W * H);
    try {
        const sel = await imaging.getSelection({ documentID: doc.id });
        const img = sel.imageData, sb = sel.sourceBounds, d = await img.getData({ chunky: true });
        const w = img.width, h = img.height, comps = img.components, mx = img.componentSize === 16 ? 32768 : 255;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = sb.left + x, Y = sb.top + y; if (X >= 0 && X < W && Y >= 0 && Y < H) m[Y * W + X] = d[(y * w + x) * comps] / mx; }
        img.dispose();
    } catch (e) {
        for (let y = Math.max(0, b.top); y < Math.min(H, b.bottom); y++) for (let x = Math.max(0, b.left); x < Math.min(W, b.right); x++) m[y * W + x] = 1;
    }
    return m;
}
// Installed fonts from Photoshop, grouped by family: { family: [[postScriptName, style], ...] } (TextFont API, PS 23+).
// Read ONLY when the font picker is used, and a few at a time with pauses: reading thousands of fonts in one go at panel
// start-up held up Photoshop's plugin system (v1.1.2-1.1.3 made every panel appear blank).
let FONTS = null, fontsLoading = null;
function loadFonts() { return FONTS || {}; }
function addFont(out, fam, ps, sty) { if (!fam || !ps) return; (out[fam] = out[fam] || []).push([ps, sty || ps]); }
// Pressed by the user ("Load font list"). First asks Photoshop for its whole font list in one request (the application's
// fontList property); if that isn't available, reads app.fonts a few at a time with pauses so nothing else is held up.
async function loadFontList() {
    if (fontsLoading) return fontsLoading;
    setStatus("Loading your font list…");
    fontsLoading = (async () => {
        const out = {}; let how = "";
        try {
            const r = await batchPlay([{ _obj: "get", _target: [{ _property: "fontList" }, { _ref: "application", _enum: "ordinal", _value: "targetEnum" }] }], {});
            const fl = r && r[0] && r[0].fontList;
            if (fl) {
                const keys = Object.keys(fl), find = (re) => { const k = keys.find(x => re.test(x) && Array.isArray(fl[x])); return k ? fl[k] : null; };
                const ps = find(/postscript/i), fam = find(/family/i), sty = find(/style/i);
                if (ps && fam) { for (let i = 0; i < ps.length; i++) addFont(out, fam[i], ps[i], sty ? sty[i] : ""); how = "one request"; }
            }
        } catch (e) { /* fall back below */ }
        if (!Object.keys(out).length) {
            let n = 0; try { n = app.fonts.length; } catch (e) { n = 0; }
            for (let i = 0; i < n; i++) {
                try { const f = app.fonts[i]; addFont(out, f.family, f.postScriptName, f.style); } catch (e) { /* skip */ }
                if (i % 50 === 49) { await new Promise(r => setTimeout(r, 0)); if (i % 500 === 499) setStatus("Loading your font list… " + (i + 1) + " of " + n); }
            }
            how = "one at a time";
        }
        const nf = Object.keys(out).length;
        if (!nf) { fontsLoading = null; setStatus("Couldn't read the font list from Photoshop. Type a PostScript name in the box instead.", true); return; }
        for (const f in out) out[f].sort((x, y) => x[1].localeCompare(y[1]));
        FONTS = out; rebuildOptions("subFam"); rebuildOptions("subFace");
        setStatus(nf + " font families loaded (" + how + "). Choose one under Font family; type in Filter families to narrow the list.");
    })();
    return fontsLoading;
}
/* Subtitles: typeset each line as a temporary Photoshop text layer (createTextLayer, PS 24.2+), rasterise it, read its
   pixels as coverage, delete it. The first installed font of the style's list is used; none found = VideoLook's dot font. */
async function typesetSubtitle(doc, s, W, H, bits) {
    const stl = TXT.subStyle(s.overlay); if (stl.edge === "cc") return null;
    const rect = PIPE.pictureRect(W, H, s.aspect || 4 / 3), size = Math.max(6, Math.round(stl.size * rect.h));
    let font = null;
    for (const f of stl.fonts) { try { const tf = app.fonts.getByName(f); if (tf) { font = f; break; } } catch (e) { /* not installed */ } }
    if (!font || typeof doc.createTextLayer !== "function") return null;
    const faux = stl.fauxItalic === "on" || (stl.fauxItalic === "ifRoman" && !/italic|oblique/i.test(font));
    const MAXV = bits === 16 ? 32768 : 255, out = [];
    let white = null; try { white = new app.SolidColor(); white.rgb.red = 255; white.rgb.green = 255; white.rgb.blue = 255; } catch (e) { white = null; }
    for (const line of TXT.subLines(s.overlay)) {
        if (!line.trim()) { out.push(null); continue; }
        const baseY = Math.round(size * 1.2), x0 = Math.round(size * 0.5);
        const opts = { name: "VideoLook subtitle (temporary)", contents: line, fontName: font, fontSize: size, position: { x: x0, y: baseY } };
        if (white) opts.textColor = white;
        const lay = await doc.createTextLayer(opts);
        try {
            if (faux) { try { lay.textItem.characterStyle.fauxItalic = true; } catch (e) { /* older Photoshop: no faux italic */ } }
            await lay.rasterize(constants.RasterizeType.ENTIRELAYER);
            const b = lay.bounds, left = Math.max(0, Math.floor(b.left) - 2), right = Math.min(W, Math.ceil(b.right) + 2);
            const top = Math.max(0, baseY - size), bottom = Math.min(H, baseY + Math.round(size * 0.35));
            if (right <= left || bottom <= top) { out.push(null); continue; }
            const got = await imaging.getPixels({ documentID: doc.id, layerID: lay.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left, top, right, bottom } });
            const img = got.imageData, d = await img.getData({ chunky: true }), w = img.width, h = img.height, c = img.components, sb = got.sourceBounds;
            const a = new Float32Array(w * h);
            for (let i = 0; i < w * h; i++) a[i] = c === 4 ? d[i * 4 + 3] / MAXV : (d[i * c] + d[i * c + 1] + d[i * c + 2]) / (3 * MAXV);
            img.dispose();
            out.push({ w, h, a, base: baseY - sb.top });
        } finally { try { await lay.delete(); } catch (e) { /* already gone */ } }
    }
    return { bitmaps: out, font: font + (faux ? ", faux italic" : "") };
}
function lookLabel() { const l = LOOKS.find(x => x.id === currentLook); return l ? l.title + (modified ? " *" : "") : "custom"; }
function allLayers(layers, out) { out = out || []; for (const l of layers) { out.push(l); if (l.layers && l.layers.length) allLayers(l.layers, out); } return out; }
async function setOpacity(docID, layerID, pct) {
    await batchPlay([{ _obj: "set", _target: [{ _ref: "layer", _id: layerID }, { _ref: "document", _id: docID }], to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: pct } } }], {});
}

// Settings handed to the engine: switched-off stages removed, route "studio" = no noise
function engineSettings() {
    const s = deep(st);
    s.enabled = Object.assign({}, enabled);
    if (!enabled.camera || s.camera.type === "none") delete s.camera;
    if (!enabled.recording || s.recording.format === "none") delete s.recording;
    if (!enabled.transfer || s.transfer.type === "none") delete s.transfer;
    if (enabled.source === false || s.source.kind === "none") delete s.source;
    if (enabled.stream === false || s.stream.mode === "none") delete s.stream; else if (s.stream.size === "auto") delete s.stream.size;
    if (!s.display.phosphor) delete s.display.phosphor;
    if (s.channel) {
        if (s.channel.route === "studio") { delete s.channel.snrDb; s.channel.ghosts = []; s.channel.impulses = 0; delete s.channel.route; }
        else if (s.channel.route === "aerial") delete s.channel.route;
        if (s.channel.ghosts) s.channel.ghosts = s.channel.ghosts.filter(gh => gh.amp > 0);
        if (s.channel.route === "sat_fm") delete s.channel.snrDb;
    }
    if (enabled.paper === false || !s.paper || s.paper.kind === "none") delete s.paper;
    if (!enabled.decoder) { delete s.set; delete s.receiver; }
    if (!enabled.overlay || !s.overlay || s.overlay.kind === "none") delete s.overlay;
    else if (s.overlay.kind === "subtitle") s.overlay.colour = s.overlay.subColour;
    if (s.channel) {
        if (s.channel.scramble === "none") delete s.channel.scramble;
        if (!s.channel.cochannel || !(s.channel.cochannel.ratio > 0)) delete s.channel.cochannel;
    }
    s.display.spotMin = undefined;
    const px = parseFloat($("motionPx").value) || 0;
    if (px) s.motion = { px, angle: parseFloat($("motionAngle").value) || 0, selection: $("motionSel").checked }; else delete s.motion;
    s.shiftX = Math.round(parseFloat($("shiftX").value) || 0); s.shiftY = Math.round(parseFloat($("shiftY").value) || 0);
    return s;
}

// ------------------------------------------------------------------ render

async function render(mode) {
    const t0 = Date.now();
    let info = "";
    const s = engineSettings();
    const output = $("output").value, frame = $("frame").value, source = $("source").value;
    const strength = parseInt($("strength").value, 10);
    if (output === "native" && mode === "preview") throw new Error("Preview works with the document-size output; switch Output to New layer.");
    s.native = output === "native";

    await core.executeAsModal(async (ctx) => {
        let doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "VideoLook" });
        const hidden = [];
        let resumed = false;
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("VideoLook works on RGB documents (Image > Mode > RGB Color).");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 : (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit first.");
            let region = null;
            if (mode === "update") {
                if (!lastResult || lastResult.docID !== doc.id) throw new Error("Nothing to re-render in this document yet.");
                const old = allLayers(doc.layers).find(l => l.id === lastResult.layerID);
                if (old) await old.delete();
                region = lastResult.region;
            } else if (mode === "preview") {
                region = await getSelectionBounds(doc.id);
                if (!region) throw new Error("Make a marquee selection first (the preview renders just that area).");
            }
            const W = Math.round(doc.width), H = Math.round(doc.height);
            if (frame === "fill") s.aspect = W / H; // the picture takes the document's own shape: nothing cropped, no border
            let src = null;
            if (source === "layer") {
                src = doc.activeLayers[0];
                if (!src) throw new Error("Select a layer first, or set Source to Whole image.");
                if (src.kind === constants.LayerKind.GROUP) throw new Error("Select a pixel layer, not a group.");
            } else {
                for (const l of allLayers(doc.layers)) if ((l.name.indexOf("VideoLook") === 0 || /second picture/i.test(l.name)) && l.visible) { l.visible = false; hidden.push(l); }
            }
            // the whole picture is always read: a video signal is built from the whole frame, even for a preview
            const req = { documentID: doc.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: 0, top: 0, right: W, bottom: H } };
            if (src) req.layerID = src.id;
            const got = await imaging.getPixels(req);
            const img = got.imageData, gw = img.width, gh = img.height, comps = img.components, gb = got.sourceBounds;
            const data = await img.getData({ chunky: true });
            img.dispose();
            for (const l of hidden) l.visible = true;
            hidden.length = 0;
            const MAXV = bits === 16 ? 32768 : 255;
            const n = W * H, planes = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
            for (let y = 0; y < gh; y++) { const Y = gb.top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < gw; x++) { const X = gb.left + x; if (X < 0 || X >= W) continue; const o = (y * gw + x) * comps, i = Y * W + X; planes[0][i] = data[o] / MAXV; planes[1][i] = data[o + 1] / MAXV; planes[2][i] = data[o + 2] / MAXV; } }
            const docIn = { w: W, h: H, planes };
            if (s.overlay && s.overlay.kind === "subtitle") { const ts = await typesetSubtitle(doc, s, W, H, bits); if (ts) { docIn.subBitmaps = ts.bitmaps; docIn.subFont = ts.font; } }
            // co-channel second picture from a layer named "second picture", if asked for
            if ((s.channel && s.channel.cochannel && s.channel.cochannel.source === "layer" && enabled.channel !== false) || (s.stream && s.stream.oldPicture === "layer")) {
                const lay = allLayers(doc.layers).find(l => /second picture/i.test(l.name));
                if (!lay) throw new Error((s.stream && s.stream.oldPicture === "layer" ? "The digital stream" : "Co-channel") + " is set to use a layer named 'second picture', but there isn't one.");
                const g2 = await imaging.getPixels({ documentID: doc.id, layerID: lay.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: 0, top: 0, right: W, bottom: H } });
                const im2 = g2.imageData, d2 = await im2.getData({ chunky: true }), b2 = g2.sourceBounds, w2 = im2.width, c2 = im2.components;
                const pl2 = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
                for (let y = 0; y < im2.height; y++) { const Y = b2.top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < w2; x++) { const X = b2.left + x; if (X < 0 || X >= W) continue; const o = (y * w2 + x) * c2, i = Y * W + X; pl2[0][i] = d2[o] / MAXV; pl2[1][i] = d2[o + 1] / MAXV; pl2[2][i] = d2[o + 2] / MAXV; } }
                im2.dispose(); docIn.interferer = pl2;
            }
            if ((s.motion && s.motion.selection) || (s.stream && s.stream.selection)) docIn.mask = await getSelectionMask(doc, W, H);

            const r = PIPE.run(docIn, s, region || undefined);

            // pack to RGBA at the document's bit depth
            const ow = r.width, oh = r.height;
            const out = bits === 16 ? new Uint16Array(ow * oh * 4) : new Uint8Array(ow * oh * 4);
            for (let i = 0; i < ow * oh; i++) { out[i * 4] = Math.round(clamp(r.planes[0][i], 0, 1) * MAXV); out[i * 4 + 1] = Math.round(clamp(r.planes[1][i], 0, 1) * MAXV); out[i * 4 + 2] = Math.round(clamp(r.planes[2][i], 0, 1) * MAXV); out[i * 4 + 3] = MAXV; }

            if (s.native) { // new document at the standard's own size
                await ctx.hostControl.resumeHistory(suspensionID); resumed = true;
                const nd = await app.documents.add({ width: ow, height: oh, resolution: 72, mode: "RGBColorMode", fill: "white" }); // options per the UXP Documents.add reference
                await batchPlay([{ _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: "VideoLook · " + lookLabel() } }], {});
                const dst = nd.activeLayers[0];
                const oi = await imaging.createImageDataFromBuffer(out, { width: ow, height: oh, components: 4, colorSpace: "RGB", chunky: true });
                await imaging.putPixels({ documentID: nd.id, layerID: dst.id, imageData: oi, targetBounds: { left: 0, top: 0 }, replace: true });
                oi.dispose();
                lastResult = null;
                info = "new document " + ow + "×" + oh + "\nStages: " + (r.stages || []).join(" → ");
                return;
            }
            const lname = (region ? "VideoLook preview · " : "VideoLook · ") + lookLabel();
            const anchor = src ? src : doc.layers[0];
            await batchPlay([
                { _obj: "select", _target: [{ _ref: "layer", _id: anchor.id }], makeVisible: false },
                { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: lname } }
            ], {});
            const dst = doc.activeLayers[0];
            if (!src) { const top = doc.layers[0]; if (top && top.id !== dst.id) await dst.move(top, constants.ElementPlacement.PLACEBEFORE); }
            const outImg = await imaging.createImageDataFromBuffer(out, { width: ow, height: oh, components: 4, colorSpace: "RGB", chunky: true });
            await imaging.putPixels({ documentID: doc.id, layerID: dst.id, imageData: outImg, targetBounds: { left: r.left, top: r.top }, replace: true });
            outImg.dispose();
            if (strength < 100) await setOpacity(doc.id, dst.id, strength);
            if (frame === "crop" && !region) {
                const rc = r.rect;
                if (rc.w !== W || rc.h !== H) { await doc.resizeCanvas(rc.w, rc.h, constants.AnchorPosition.MIDDLECENTER); info += "canvas " + rc.w + "×" + rc.h + ", "; }
            }
            lastResult = { docID: doc.id, layerID: dst.id, region: region };
            info += ow + "×" + oh + (bits === 16 ? " (16-bit)" : "") + "\nStages: " + (r.stages || []).join(" → ");
        } finally {
            for (const l of hidden) { try { l.visible = true; } catch (e) {} }
            if (!resumed) await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "VideoLook" });
    const secs = ", " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
    return info.indexOf("\nStages") >= 0 ? info.replace("\nStages", secs + "\nStages") : info + secs;
}

async function run(mode) {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = true;
    setStatus(mode === "preview" ? "Rendering preview…" : "Rendering…");
    try { const r = await render(mode); setStatus("Done: " + r); }
    catch (e) { setStatus("Error: " + (e.message || e), true); }
    finally { for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = false; }
}

// ------------------------------------------------------------------ user presets

const PRESET_FILE = "presets.json";
let presets = {};
async function presetFolder() { return await require("uxp").storage.localFileSystem.getDataFolder(); }
async function loadPresets() {
    try { const f = await (await presetFolder()).getEntry(PRESET_FILE); presets = JSON.parse(await f.read()) || {}; }
    catch (e) { try { presets = JSON.parse(localStorage.getItem("videolook.presets") || "{}"); } catch (e2) { presets = {}; } }
    refreshPresetList();
}
async function storePresets() {
    try { localStorage.setItem("videolook.presets", JSON.stringify(presets)); } catch (e) {}
    const file = await (await presetFolder()).createFile(PRESET_FILE, { overwrite: true });
    await file.write(JSON.stringify(presets, null, 1));
}
function refreshPresetList(selectName) {
    const sel = $("presetSel");
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const none = document.createElement("option"); none.value = ""; none.textContent = "(none)"; sel.appendChild(none);
    for (const name of Object.keys(presets).sort((a, b) => a.localeCompare(b))) { const op = document.createElement("option"); op.value = name; op.textContent = name; sel.appendChild(op); }
    sel.value = selectName && presets[selectName] ? selectName : "";
}
$("presetSel").addEventListener("change", () => {
    const name = $("presetSel").value; if (!name || !presets[name]) return;
    const p = presets[name];
    st = migrate(mergeDeep(deep(BASE), p.st)); enabled = Object.assign({}, p.enabled || {}); currentLook = p.look || ""; modified = true;
    if (p.motion) { $("motionPx").value = p.motion.px; $("motionAngle").value = p.motion.angle; $("motionSel").checked = !!p.motion.sel; }
    rebuildOptions("trMethod"); rebuildOptions("subFace"); syncUI(); saveState();
    $("presetName").value = name; setStatus("Loaded preset “" + name + "”.");
});
$("presetSaveBtn").addEventListener("click", async () => {
    const name = $("presetName").value.trim() || $("presetSel").value;
    if (!name) { setStatus("Type a name for the preset first.", true); return; }
    presets[name] = { st: deep(st), enabled: deep(enabled), look: currentLook, motion: { px: $("motionPx").value, angle: $("motionAngle").value, sel: $("motionSel").checked } };
    try { await storePresets(); refreshPresetList(name); setStatus("Saved preset “" + name + "”."); }
    catch (e) { setStatus("Could not save preset: " + (e.message || e), true); }
});
$("presetDeleteBtn").addEventListener("click", async () => {
    const name = $("presetSel").value; if (!name) { setStatus("Choose a saved preset to delete.", true); return; }
    delete presets[name];
    try { await storePresets(); refreshPresetList(); setStatus("Deleted preset “" + name + "”."); }
    catch (e) { setStatus("Could not delete preset: " + (e.message || e), true); }
});

// ------------------------------------------------------------------ wiring

buildUI();
$("look").addEventListener("change", () => { const v = $("look").value; if (v.indexOf("__") === 0) return; applyLook(v); });
$("renderBtn").addEventListener("click", () => run("full"));
$("previewBtn").addEventListener("click", () => run("preview"));
$("updateBtn").addEventListener("click", () => run("update"));
$("seedBtn").addEventListener("click", () => { st.seed = (Math.random() * 1e6) | 0; saveState(); setStatus("New noise and dropout pattern. Press Render or Re-render last."); });
for (const id of ["source", "output", "frame", "shiftX", "shiftY", "motionPx", "motionAngle", "motionSel"]) $(id).addEventListener("change", () => { markModified(); saveState(); });
$("strength").addEventListener("input", () => { $("strengthVal").textContent = $("strength").value; });
$("strength").addEventListener("change", async () => {
    saveState();
    if (!lastResult || app.documents.length === 0) return;
    try { await core.executeAsModal(async () => { if (app.activeDocument.id !== lastResult.docID) return; await setOpacity(lastResult.docID, lastResult.layerID, parseInt($("strength").value, 10)); }, { commandName: "VideoLook strength" }); }
    catch (e) { /* layer may have been deleted */ }
});

if (!loadState()) applyLook(LOOKS.find(l => l.id === "uk-colour-studio-1975").id);
rebuildOptions("trMethod");
rebuildOptions("subFace");
syncUI();
loadPresets();
setStatus("Ready. " + LOOKS.length + " looks; " + LOOKS.filter(l => l.evidence === "spec").length + " built from specifications alone.");
