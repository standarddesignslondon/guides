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
const PIPE = require("./vl_pipeline.js");
const LOOKS = require("./vl_presets.js").LOOKS;

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function getPath(o, p) { return p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== "object") a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
function mergeDeep(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; mergeDeep(a[k], b[k]); } else a[k] = deep(b[k]); } return a; }

// ------------------------------------------------------------------ state

const SECTION_KEYS = ["camera", "encoder", "channel", "recording", "transfer", "decoder", "display", "view", "overlay"];
const BASE = {
    standard: "PAL-I", aspect: 4 / 3,
    camera: { type: "none", exposure: 0, overrides: {}, reg: {} },
    encoder: { ntscIQ: true },
    channel: { route: "aerial", snrDb: 44, ghosts: [{ delayUs: 2, amp: 0, phaseDeg: 0 }], impulses: 0, cnrDb: 14, scramble: "none",
        cochannel: { ratio: 0, offsetHz: 10400, dx: 0.31, dy: 0.37, source: "mirror" } },
    receiver: { standard: "same", hold: "auto", vRoll: 0.4, hGain: 0.05, hFree: 0, overload: 0 },
    overlay: { kind: "none", mode: "mix", text: "", header: "", colour: "white", pos: "bl",
        style: "arial_shadow", font: "", fontFamily: "", italic: "style", size: "", subColour: "style", edge: "style", stage: "style", position: "bottom", caps: "style", strength: 1 },
    recording: { format: "none", position: "studio", generations: 1, tracking: 0, trackingPos: 0.6 },
    transfer: { type: "none", method: "bbc1967", target: "PAL-I", gauge: 16, shutterBar: 0, mode: "pal60", pulldown: "clean", lag: 0, contrast: 1 },
    decoder: { separation: "notch", palMode: "delay", ntscDemod: "equiband", phaseErr: 0, diffPhase: 0 },
    set: { sharpness: 0, contrast: 1, brightness: 0, colour: 1, overscan: 0.04 },
    display: { tube: "slot", screenIn: 22, primaries: "EBU", white: "D65", gamma: 2.4, maskStrength: 0.5, spot: 0.3, bloom: 0.7, glow: 0.04, barrel: 0.025, cornerDark: 0.25, roundScreen: 0 },
    view: { mode: "closeup", deinterlace: "weave", exposure: 0, bandPos: 0.4, focus: 0, reflection: 0, grain: 0 },
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
    ["COMP-625", "Component 625 (studio/digital)"], ["COMP-525", "Component 525 (studio/digital)"]];
const RX_OPTS = [["same", "Same as the broadcast"], ["PAL-I", "UK set (System I PAL)"], ["PAL-BG", "Dutch/German set (B/G PAL)"], ["SECAM-L", "French set (System L SECAM)"], ["SECAM-DK", "Soviet/East set (D/K SECAM)"]];
const camVal = (key) => () => { const c = CAM.CAMERAS[st.camera.type]; const ov = st.camera.overrides || {}; return ov[key] !== undefined ? ov[key] : (c && c[key] !== undefined ? c[key] : 0); };
const camSet = (key) => (v) => { if (!st.camera.overrides) st.camera.overrides = {}; st.camera.overrides[key] = v; };
const recVal = (key) => () => { const f = REC.FORMATS[st.recording.format]; return st.recording[key] !== undefined ? st.recording[key] : (f && f[key] !== undefined ? f[key] : 0); };

const SECTIONS = [
    { key: "camera", title: "Camera", open: true, items: [
        { kind: "select", id: "camType", label: "Camera / pickup", path: "camera.type", options: () => [["none", "(none: the photo is the video)"]].concat(opt(CAM.CAMERAS)), onChange: () => { st.camera.overrides = {}; st.camera.reg = {}; } },
        { kind: "slider", id: "camExp", label: "Exposure (stops)", path: "camera.exposure", min: -2, max: 2.5, step: 0.05 },
        { kind: "slider", id: "camContour", label: "Edge sharpening", get: camVal("contour"), set: camSet("contour"), min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "slider", id: "camNoise", label: "Signal-to-noise (dB)", get: camVal("noiseDb"), set: camSet("noiseDb"), min: 20, max: 60, step: 0.5 },
        { kind: "slider", id: "camLag", label: "Lag (needs motion)", get: camVal("lag"), set: camSet("lag"), min: 0, max: 0.8, step: 0.01 },
        { kind: "slider", id: "camComet", label: "Comet tails (needs motion)", get: camVal("comet"), set: camSet("comet"), min: 0, max: 2, step: 0.01, est: true },
        { kind: "slider", id: "camHalo", label: "Image-orthicon halo", get: camVal("halo"), set: camSet("halo"), min: 0, max: 0.4, step: 0.01, est: true },
        { kind: "slider", id: "camRegR", label: "Red registration (ns)", get: () => { const r = Object.assign({}, (CAM.CAMERAS[st.camera.type] || {}).reg || {}, st.camera.reg || {}); return r.rx || 0; }, set: (v) => { st.camera.reg = st.camera.reg || {}; st.camera.reg.rx = v; }, min: -150, max: 150, step: 1 },
        { kind: "slider", id: "camRegB", label: "Blue registration (ns)", get: () => { const r = Object.assign({}, (CAM.CAMERAS[st.camera.type] || {}).reg || {}, st.camera.reg || {}); return r.bx || 0; }, set: (v) => { st.camera.reg = st.camera.reg || {}; st.camera.reg.bx = v; }, min: -150, max: 150, step: 1 }
    ], hint: "Camera types carry figures from the BBC documents where they exist (Plumbicon response, 1964 camera comparisons, the 1980 BBC gamma, BBC-style edge sharpening taken from green). Registration: the BBC's 1967 tolerance was 25 ns for 3-tube cameras, 50 ns for a 4-tube camera's colour tubes." },
    { key: "encoder", title: "Standard & colour", open: true, items: [
        { kind: "select", id: "std", label: "Television standard", path: "standard", options: () => STD_OPTS, onChange: () => { if (st.standard === "405-A" && st.aspect === 16 / 9) st.aspect = 4 / 3; if (st.standard === "30-BAIRD") { st.aspect = 3 / 7; st.view.mode = "televisor"; } else if (st.aspect < 0.5) st.aspect = 4 / 3; if (st.standard === "MUSE") st.aspect = 16 / 9; if (st.standard === "120-SSTV") st.aspect = 1; } },
        { kind: "select", id: "aspect", label: "Picture shape", path: "aspect", num: true, options: () => [["1.3333333333333333", "4:3"], ["1.25", "5:4 (405-line before 1950)"], ["1.7777777777777777", "16:9 (PALplus, Hi-Vision, late DV)"], ["1.15", "1.15:1 (Germany 441)"], ["1", "1:1 (slow-scan)"], ["0.42857142857142855", "3:7 tall (Baird 30-line)"]] },
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
        { kind: "select", id: "scramble", label: "Scrambling", path: "channel.scramble", options: () => [["none", "None"], ["discret11", "Canal+ Discret 11 (1984)"]] }
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
    { key: "transfer", title: "Transfer", open: false, items: [
        { kind: "select", id: "trType", label: "Transfer", path: "transfer.type", options: () => [["none", "(none)"], ["convert", "Standards conversion"], ["telerecord", "Telerecording (video to film)"], ["telecine", "Telecine (film to video)"], ["crossplay", "Tape played on another system"]], onChange: () => { const t = st.transfer.type; if (t === "convert") st.transfer.method = "bbc1967"; if (t === "telerecord") st.transfer.method = "suppressed"; rebuildOptions("trMethod"); } },
        { kind: "select", id: "trMethod", label: "Method", path: "transfer.method", options: () => st.transfer.type === "telerecord" ? [["suppressed", "Suppressed field (BBC 1950s)"], ["stored", "Stored field"], ["kinescope", "US kinescope (24 fps)"]] : [["optical", "Optical (camera on monitor)"], ["bbc1967", "BBC 1967 field store"], ["digital", "Digital four-field"], ["motioncomp", "Motion-compensated (1990s)"]] },
        { kind: "select", id: "trTarget", label: "Convert to", path: "transfer.target", options: () => [["PAL-I", "625 PAL (UK)"], ["NTSC-M", "525 NTSC (US)"], ["SECAM-L", "625 SECAM (France)"], ["525-MONO", "525 B&W (US)"], ["625-MONO", "625 B&W"]] },
        { kind: "select", id: "trGauge", label: "Film gauge", path: "transfer.gauge", num: true, options: () => [["16", "16 mm"], ["35", "35 mm"]] },
        { kind: "slider", id: "trBar", label: "Kinescope shutter bar", path: "transfer.shutterBar", min: 0, max: 1, step: 0.01 },
        { kind: "select", id: "trMode", label: "Played as", path: "transfer.mode", options: () => [["pal60", "NTSC tape as PAL-60"], ["ntsc443", "NTSC tape as NTSC 4.43 (PAL-only set)"], ["secam_mono", "SECAM on a PAL-only set"]] },
        { kind: "select", id: "trPull", label: "Telecine frame", path: "transfer.pulldown", options: () => [["clean", "Clean frame"], ["mixed", "3:2 mixed frame (NTSC)"]] },
        { kind: "slider", id: "trLag", label: "Converter ghosting (needs motion)", path: "transfer.lag", min: 0, max: 0.9, step: 0.01, est: true },
        { kind: "slider", id: "trCon", label: "Converter contrast", path: "transfer.contrast", min: 0.5, max: 2.5, step: 0.01, est: true }
    ], hint: "Standards conversion re-codes into the target system, so the target's decoder and set apply. Telecine replaces the camera: the photo stands in for the film frame (run FilmLook first for the stock). Telerecording ends in film: the result is the film, not a TV." },
    { key: "decoder", title: "Decoder & set", open: false, items: [
        { kind: "select", id: "sep", label: "Luma/colour separation", path: "decoder.separation", options: () => [["notch", "Notch filter"], ["lowpass", "Cheap low-pass"], ["comb1H", "Comb filter (NTSC 1H)"], ["comb2H", "Comb filter (PAL 2H)"], ["none", "None (B&W set)"]] },
        { kind: "select", id: "palMode", label: "PAL decoder", path: "decoder.palMode", options: () => [["delay", "Delay line (PAL-D, all UK sets)"], ["simple", "Simple PAL (Hanover bars)"]] },
        { kind: "select", id: "ntscDemod", label: "NTSC decoder", path: "decoder.ntscDemod", options: () => [["equiband", "Equal-band (most sets)"], ["IQ", "True I/Q"]] },
        { kind: "slider", id: "phaseErr", label: "Phase error (°)", path: "decoder.phaseErr", min: -45, max: 45, step: 0.5 },
        { kind: "slider", id: "diffPhase", label: "Differential phase (°)", path: "decoder.diffPhase", min: 0, max: 30, step: 0.5 },
        { kind: "slider", id: "setSharp", label: "Set sharpness", path: "set.sharpness", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "setCon", label: "Contrast", path: "set.contrast", min: 0.5, max: 1.5, step: 0.01 },
        { kind: "slider", id: "setBri", label: "Brightness", path: "set.brightness", min: -0.2, max: 0.2, step: 0.005 },
        { kind: "slider", id: "setCol", label: "Colour", path: "set.colour", min: 0, max: 2, step: 0.01 },
        { kind: "slider", id: "setOver", label: "Overscan (per side)", path: "set.overscan", min: 0, max: 0.1, step: 0.005 },
        { kind: "select", id: "rxStd", label: "Set built for", path: "receiver.standard", options: () => RX_OPTS },
        { kind: "select", id: "vHold", label: "Vertical hold", path: "receiver.hold", options: () => [["auto", "Automatic (locks if it can)"], ["locked", "Locked"], ["rolling", "Rolling"]] },
        { kind: "slider", id: "vRoll", label: "Roll position", path: "receiver.vRoll", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "hFree", label: "Horizontal hold", path: "receiver.hFree", min: -4, max: 4, step: 0.05, est: true },
        { kind: "slider", id: "hGain", label: "Line lock strength", path: "receiver.hGain", min: 0.005, max: 0.3, step: 0.005, est: true },
        { kind: "slider", id: "overload", label: "Overload (lockout)", path: "receiver.overload", min: 0, max: 1, step: 0.01, est: true }
    ], hint: "Set built for: a set made for another country's system gets that system's carrier levels wrong (French L shows as a negative on a UK set, with no colour and no sync), and other sound carriers leave patterning. Horizontal hold off-centre makes the picture tear; Vertical hold 'Rolling' puts the field bar in the picture. A phase error turns NTSC hues; on a PAL delay-line set it only lowers saturation (cos of the error); simple PAL shows it as Hanover bars. Overscan applies to screen views, not frame-grabs." },
    { key: "display", title: "Display", open: false, items: [
        { kind: "select", id: "tube", label: "Tube", path: "display.tube", options: () => [["mono", "Black & white"], ["delta", "Delta-gun shadow mask"], ["slot", "Slot mask (in-line)"], ["trinitron", "Trinitron aperture grille"], ["wheel", "B&W tube + colour wheel (CBS)"], ["p7", "P7 long-persistence (radar)"]] },
        { kind: "slider", id: "screenIn", label: "Screen size (in)", path: "display.screenIn", min: 9, max: 32, step: 1 },
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
        { kind: "slider", id: "pexp", label: "Photo exposure (fields)", path: "view.exposure", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "pband", label: "Bright band position", path: "view.bandPos", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "pfocus", label: "Photo softness (px)", path: "view.focus", min: 0, max: 4, step: 0.1 },
        { kind: "slider", id: "prefl", label: "Room reflection", path: "view.reflection", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "pgrain", label: "Photo grain", path: "view.grain", min: 0, max: 1.5, step: 0.01 }
    ], hint: "Photo exposure below 1 means the shutter was open for less than one field (1/50 s in the UK), so only part of the picture is bright." },
    { key: "overlay", title: "Overlay", open: false, items: [
        { kind: "select", id: "ovKind", label: "Overlay", path: "overlay.kind", options: () => [["none", "(none)"], ["subtitle", "Subtitles"], ["teletext", "Teletext (set's decoder)"], ["timestamp", "Date/time stamp (recorded)"]], onChange: () => { rebuildOptions("subFam"); rebuildOptions("subFace"); } },
        { kind: "select", id: "subStyle", label: "Subtitle style", path: "overlay.style", options: () => Object.keys(TXT.SUB_STYLES).map(k => [k, TXT.SUB_STYLES[k].label]), onChange: () => { Object.assign(st.overlay, { font: "", fontFamily: "", italic: "style", size: "", subColour: "style", edge: "style", stage: "style", caps: "style" }); rebuildOptions("subFam"); rebuildOptions("subFace"); syncUI(); } },
        { kind: "select", id: "subFam", label: "Font family", path: "overlay.fontFamily", options: () => [["", "(the style's own font)"]].concat(Object.keys(loadFonts()).sort((a, b) => a.localeCompare(b)).map(f => [f, f])),
          onChange: () => { const faces = loadFonts()[st.overlay.fontFamily] || []; const pick = faces.find(f => /^(regular|roman|book|medium)$/i.test(f[1])) || faces[0]; st.overlay.font = pick ? pick[0] : ""; rebuildOptions("subFace"); } },
        { kind: "select", id: "subFace", label: "Font style", path: "overlay.font", options: () => { const faces = loadFonts()[st.overlay.fontFamily] || []; return faces.length ? faces.map(([ps, sty]) => [ps, sty]) : [["", "(the style's own font)"]]; } },
        { kind: "text", id: "subFont", label: "or PostScript name", path: "overlay.font" },
        { kind: "select", id: "subItal", label: "Italic", path: "overlay.italic", options: () => [["style", "As the style"], ["on", "Faux italic on"], ["off", "Off"]] },
        { kind: "slider", id: "subSize", label: "Size (% of picture height)", get: () => 100 * (st.overlay.size || TXT.subStyle(st.overlay).size), set: (v) => { st.overlay.size = v / 100; }, min: 2, max: 10, step: 0.1 },
        { kind: "select", id: "subCol", label: "Subtitle colour", path: "overlay.subColour", options: () => [["style", "As the style"], ["white", "White"], ["white87", "87% white (Dutch)"], ["yellow", "Yellow"], ["cyan", "Cyan"]] },
        { kind: "select", id: "subEdge", label: "Edge", path: "overlay.edge", options: () => [["style", "As the style"], ["none", "None"], ["outline", "Black edge"], ["shadow", "Drop shadow"], ["softshadow", "Soft shadow"], ["box", "Black box"], ["ghostbox", "See-through box"], ["greylabel", "Grey label (BBC)"], ["halo", "Laser halo (cinema)"], ["ragged", "Ragged etching (cinema)"], ["bitmap4", "DVD 4-colour bitmap"]] },
        { kind: "slider", id: "subStr", label: "Edge strength", path: "overlay.strength", min: 0, max: 1.5, step: 0.01, est: true },
        { kind: "select", id: "subStage", label: "Added", path: "overlay.stage", options: () => [["style", "As the style"], ["film", "On the film print"], ["studio", "At the studio / on the master"], ["set", "By the set / player"]] },
        { kind: "select", id: "subPos", label: "Position", path: "overlay.position", options: () => [["bottom", "Bottom"], ["top", "Top"]] },
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
function getVal(it) { if (it.get) return it.get(); const v = getPath(st, it.path); return v === undefined ? it.min : v; }
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
            const row = document.createElement("div"); row.className = "row";
            const lab = document.createElement("label"); lab.textContent = it.label;
            if (it.est) { const e = document.createElement("span"); e.className = "est"; e.textContent = "est."; lab.appendChild(e); }
            if (it.hint) lab.title = it.hint;
            row.appendChild(lab);
            if (it.kind === "text" || it.kind === "textarea") {
                const tx = document.createElement(it.kind === "textarea" ? "textarea" : "input"); tx.id = it.id;
                if (it.kind === "text") tx.type = "text"; else { tx.rows = 6; tx.style.width = "100%"; row.style.flexWrap = "wrap"; }
                tx.addEventListener("change", () => { setVal(it, tx.value); switchOn(sec.key); markModified(); saveState(); });
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
        if (it.kind === "text" || it.kind === "textarea") { const v = getPath(st, it.path); el.value = v === undefined ? "" : "" + v; continue; }
        if (it.kind === "select") {
            let v = getPath(st, it.path);
            if (it.num) { const opts = it.options().map(o => o[0]); const m = opts.find(o => Math.abs(parseFloat(o) - v) < 1e-6); v = m !== undefined ? m : opts[0]; }
            else if (it.bool) v = v === false ? "false" : "true";
            el.value = v === undefined ? it.options()[0][0] : "" + v;
        } else {
            const v = getVal(it);
            el.value = "" + Math.round((clamp(v, it.min, it.max) - it.min) / it.step);
            $(id + "Val").textContent = fmt(v, it);
        }
    }
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
        transfer: !!(l.s.transfer && l.s.transfer.type), decoder: true, display: true, view: true, overlay: !!(l.s.overlay && l.s.overlay.kind)
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
        st = mergeDeep(deep(BASE), s.st); enabled = s.enabled || {}; currentLook = s.currentLook || ""; modified = !!s.modified;
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
// Installed fonts from Photoshop, grouped by family: { family: [[postScriptName, style], ...] } (TextFont API, PS 23+)
let FONTS = null;
function loadFonts() {
    if (FONTS) return FONTS;
    const out = {};
    try { const n = app.fonts.length; for (let i = 0; i < n; i++) { const f = app.fonts[i]; (out[f.family] = out[f.family] || []).push([f.postScriptName, f.style]); } FONTS = out; }
    catch (e) { return {}; }
    return FONTS;
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
    if (s.channel) {
        if (s.channel.route === "studio") { delete s.channel.snrDb; s.channel.ghosts = []; s.channel.impulses = 0; delete s.channel.route; }
        else if (s.channel.route === "aerial") delete s.channel.route;
        if (s.channel.ghosts) s.channel.ghosts = s.channel.ghosts.filter(gh => gh.amp > 0);
        if (s.channel.route === "sat_fm") delete s.channel.snrDb;
    }
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
            if (s.channel && s.channel.cochannel && s.channel.cochannel.source === "layer" && enabled.channel !== false) {
                const lay = allLayers(doc.layers).find(l => /second picture/i.test(l.name));
                if (!lay) throw new Error("Co-channel is set to use a layer named 'second picture', but there isn't one.");
                const g2 = await imaging.getPixels({ documentID: doc.id, layerID: lay.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: 0, top: 0, right: W, bottom: H } });
                const im2 = g2.imageData, d2 = await im2.getData({ chunky: true }), b2 = g2.sourceBounds, w2 = im2.width, c2 = im2.components;
                const pl2 = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
                for (let y = 0; y < im2.height; y++) { const Y = b2.top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < w2; x++) { const X = b2.left + x; if (X < 0 || X >= W) continue; const o = (y * w2 + x) * c2, i = Y * W + X; pl2[0][i] = d2[o] / MAXV; pl2[1][i] = d2[o + 1] / MAXV; pl2[2][i] = d2[o + 2] / MAXV; } }
                im2.dispose(); docIn.interferer = pl2;
            }
            if (s.motion && s.motion.selection) docIn.mask = await getSelectionMask(doc, W, H);

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
    st = mergeDeep(deep(BASE), p.st); enabled = Object.assign({}, p.enabled || {}); currentLook = p.look || ""; modified = true;
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
