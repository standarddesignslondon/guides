// Pixachron cheat sheet: one image per control, rendered 1:1 through the engine.
// Usage: node cheatsheet.js <plugin dir> <source.rgb> <width> <height> <out dir> <glyphs.json>
// The source is raw 8-bit RGB; outputs are raw RGB too (the Python step makes PNGs and the page).
const fs = require("fs"), path = require("path");
const [PLUGIN, SRC, WS, HS, OUT, GLYPHS] = process.argv.slice(2);
const E = require(path.join(PLUGIN, "px_engine.js")), FX = require(path.join(PLUGIN, "px_effects.js")), O = require(path.join(PLUGIN, "px_outline.js"));
fs.mkdirSync(OUT, { recursive: true });
const raw = fs.readFileSync(SRC), W = parseInt(WS, 10), H = parseInt(HS, 10), n = W * H, planes = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
for (let i = 0; i < n; i++) { planes[0][i] = raw[i * 3] / 255; planes[1][i] = raw[i * 3 + 1] / 255; planes[2][i] = raw[i * 3 + 2] / 255; }
const luma = (i) => 0.299 * planes[0][i] + 0.587 * planes[1][i] + 0.114 * planes[2][i];
function maskOf(kind, thr) { const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = kind === "dark" ? (luma(i) < thr ? 1 : 0) : (luma(i) > thr ? 1 : 0); return m; }
function save(file, pl) { const o = Buffer.alloc(n * 3); for (let i = 0; i < n; i++) { o[i * 3] = Math.round(pl[0][i] * 255); o[i * 3 + 1] = Math.round(pl[1][i] * 255); o[i * 3 + 2] = Math.round(pl[2][i] * 255); } fs.writeFileSync(path.join(OUT, file), o); }

const BASE = { path: { path: "raster" }, reroll: "same", maskMode: "none", channel: "rgb", spread: 0.3, coupling: "ac", couplingPeriod: 600, mix: 1, seed: 1 };
const DELAY = { effect: "delay", params: { time: 150, feedback: 0.6 } };
const manifest = []; let num = 0;
function render(section, title, note, s, maskSpec) {
    const st = Object.assign({}, BASE, s); st.path = Object.assign({ path: "raster" }, s.path || {});
    const effect = FX.byId[st.effect]; st.params = Object.assign(FX.defaults(effect), st.params || {});
    const doc = { w: W, h: H, planes, mask: maskSpec ? maskOf(maskSpec.kind, maskSpec.thr == null ? 0.5 : maskSpec.thr) : null };
    const r = E.run(doc, st);
    const file = String(++num).padStart(3, "0") + ".rgb"; save(file, r.planes);
    const settings = describe(st, maskSpec);
    manifest.push({ section, title, note, file, settings });
    console.log(file, section, "|", title, r.ms + "ms");
}
function describe(st, maskSpec) {
    const p = st.path, bits = ["Path: " + p.path + (p.snake ? ", snake" : "") + (p.angle ? ", angle " + p.angle + "°" : "") + (p.pitch && p.pitch !== 1 ? ", pitch " + p.pitch : "") + (p.spokes ? ", spokes " + p.spokes : "") + (p.twist ? ", twist " + p.twist + "°" : "") + (p.inward ? ", inward" : "") + (p.reverse ? ", time backwards" : "") + (p.tile ? ", tile " + p.tile + (p.tileSnake ? " (snake order)" : "") : "") + (p.segment && p.segment !== "path" ? ", reset at every " + p.segment : "") + (p.cx != null && p.cx !== 0.5 || p.cy != null && p.cy !== 0.5 ? ", centre " + Math.round((p.cx == null ? 0.5 : p.cx) * 100) + "% / " + Math.round((p.cy == null ? 0.5 : p.cy) * 100) + "%" : "")];
    if (st.reroll && st.reroll !== "same") bits.push("Roll back along: " + st.reroll);
    if (maskSpec) bits.push("Mask: " + maskSpec.kind + " pixels" + (maskSpec.thr != null && maskSpec.thr !== 0.5 ? " at " + Math.round(maskSpec.thr * 100) + "%" : "") + ", use: " + (st.maskMode === "none" ? "contour only" : st.maskMode === "only" ? "only masked pixels" : "only unmasked pixels"));
    const e = FX.byId[st.effect]; const ps = e.params.map(q => q.name.replace(/ \(.*\)$/, "") + " " + st.params[q.id]).concat((e.options || []).map(o => o.name + ": " + (o.choices.find(c => c[0] === st.params[o.id]) || [0, st.params[o.id]])[1]));
    bits.push("Effect: " + e.name + " (" + ps.join(", ") + ")");
    bits.push("Signal: " + (st.channel === "rgb" ? "RGB" : st.channel === "luma" ? "luminance only" : "RGB with spread " + st.spread) + ", " + (st.coupling === "ac" ? "AC " + st.couplingPeriod + " px" : "DC") + ", mix " + Math.round(st.mix * 100) + "%");
    return bits;
}

// ---------------------------------------------------------------- 0. the reference
render("Start here", "The original", "The source picture, untouched, for comparison. Every image below is one setting away from one of the reference images.", { effect: "bitcrush", params: { levels: 256, hold: 1 }, coupling: "dc" });
render("Start here", "Reference delay on the raster path", "The delay used for all the path demonstrations: Time 150 px, Feedback 0.6, AC coupling. Along the rows, left to right, so the echoes trail to the right and wrap round at the right edge onto the next row.", DELAY);

// ---------------------------------------------------------------- 1. paths
const P = (title, note, pathOpts, extra) => render("Paths", title, note, Object.assign({}, DELAY, { path: pathOpts }, extra || {}));
P("Raster, snake", "Alternate rows run right to left, so the echoes turn back at the edges instead of jumping to the next row.", { path: "raster", snake: true });
P("Columns", "Top to bottom, column by column: the echoes trail downwards.", { path: "columns" });
P("Columns, snake", "Alternate columns run upwards.", { path: "columns", snake: true });
P("Lines at an angle: 35°", "Parallel lines at 35°; echoes trail along them.", { path: "angle", angle: 35 });
P("Lines at an angle: 35°, snake", "The same lines, alternate ones running back.", { path: "angle", angle: 35, snake: true });
P("Lines at an angle: 90°", "90° is the same as Columns; 0° the same as Raster.", { path: "angle", angle: 90 });
P("Hilbert curve", "The space-filling curve keeps neighbours together, so the same 150 px echo becomes blotches rather than streaks.", { path: "hilbert" });
P("Z-order (Morton)", "Hilbert's blocky cousin: the echoes come in square blocks with jumps between them.", { path: "morton" });
P("Spiral, pitch 1", "Tight rings from the centre: the echoes are concentric.", { path: "spiral", pitch: 1 });
P("Spiral, pitch 8", "A looser spiral: the rings interleave and the echoes get a twist.", { path: "spiral", pitch: 8 });
P("Spokes", "Rays from the centre, each ray its own signal (reset at every spoke), so echoes burst outward.", { path: "spokes", segment: "line" });
P("Spokes, twist 90°", "The rays bend into a pinwheel.", { path: "spokes", segment: "line", twist: 90 });
P("Spokes, 24 spokes", "Only 24 rays, so each is a wide wedge and the echoes are wedge-shaped.", { path: "spokes", segment: "line", spokes: 24 });
render("Paths", "Contour (from a Dark-pixels mask)", "Time runs outward from the edge of the dark shapes (the tower, the roofs, the text), so the echoes radiate off them like contour lines.", Object.assign({}, DELAY, { path: { path: "contour" } }), { kind: "dark" });

// ---------------------------------------------------------------- 2. path options
P("Centre X 25%, Y 75% (spiral)", "The spiral's origin moved to the lower left.", { path: "spiral", pitch: 1, cx: 0.25, cy: 0.75 });
P("Inward (spiral)", "The spiral runs towards the centre, so the echoes trail inward instead of out.", { path: "spiral", pitch: 1, inward: true });
P("Time runs backwards (raster, reset at every line)", "Compare with 'Reset at every line' below: the echoes trail to the left instead of the right.", { path: "raster", segment: "line", reverse: true });
P("Reset at every line (raster)", "The effect's memory is cleared at the start of every row, so echoes never wrap from one row to the next.", { path: "raster", segment: "line" });
P("Tile 128 px (Hilbert, reset at every tile)", "The Hilbert curve is built inside each 128 px tile and the tiles visited in raster order; each tile is its own signal.", { path: "hilbert", tile: 128, segment: "tile" });
P("Tile 128 px, never reset (Hilbert)", "The same tiles as one continuous signal: echoes cross from one tile into the next.", { path: "hilbert", tile: 128, segment: "path" });
P("Tile 128 px, tiles in snake order (Hilbert)", "Tiles visited boustrophedon, so the signal flows back and forth across the rows of tiles.", { path: "hilbert", tile: 128, segment: "path", tileSnake: true });
P("Tile 256 px (spiral, reset at every tile)", "A spiral inside every 256 px tile.", { path: "spiral", pitch: 1, tile: 256, segment: "tile" });
render("Paths", "Roll back along a different path (raster out, Hilbert back)", "No effect at all (Bitcrush at 256 levels, Hold 1): the scramble is made purely by unrolling along the rows and rolling back along the Hilbert curve.", { path: { path: "raster" }, reroll: "hilbert", effect: "bitcrush", params: { levels: 256, hold: 1 }, coupling: "dc" });

// ---------------------------------------------------------------- 3. mask
const M = (title, note, maskMode, spec, pathOpts) => render("Mask", title, note, Object.assign({}, DELAY, { path: pathOpts || { path: "raster" }, maskMode }), spec);
M("Dark pixels, only masked pixels are samples", "Only the dark pixels (below 50% luminance) are in the signal: the echoes stay inside the dark shapes and the sky and river are untouched.", "only", { kind: "dark" });
M("Dark pixels, only unmasked pixels are samples", "The inverse: the dark shapes stay crisp and everything else takes the delay.", "except", { kind: "dark" });
M("Light pixels, only masked pixels", "Light pixels (above 50%) as the signal.", "only", { kind: "light" });
M("Dark pixels at 30% threshold, only masked", "A lower threshold keeps fewer pixels: just the darkest.", "only", { kind: "dark", thr: 0.3 });
M("Dark pixels at 70% threshold, only masked", "A higher threshold takes in the mid-tones too.", "only", { kind: "dark", thr: 0.7 });
M("Dark pixels, only masked, on a Hilbert path", "The mask works with any path.", "only", { kind: "dark" }, { path: "hilbert" });

// ---------------------------------------------------------------- 4. signal
const S = (title, note, extra) => render("Signal", title, note, Object.assign({}, DELAY, extra));
S("Channels: luminance only", "Only brightness is echoed; the colour stays where it was.", { channel: "luma" });
S("Channels: RGB with spread 0.6", "Red's delay time is scaled down and blue's up, so every echo splits into colour fringes.", { channel: "spread", spread: 0.6 });
S("Coupling: DC", "The raw databending behaviour: the picture's overall tone feeds back too, so flat areas pile up and clip.", { coupling: "dc" });
S("Coupling: AC, period 100 px", "A short AC period leaves only fine detail for the effect: just the edges echo.", { couplingPeriod: 100 });
S("Coupling: AC, period 3000 px", "A long period lets broad tone through to the effect too; closer to DC.", { couplingPeriod: 3000 });
S("Mix 40%", "The result blended 40/60 with the original inside the render.", { mix: 0.4 });

// ---------------------------------------------------------------- 5. effects, one control at a time
function effectSet(name, ref, refNote, variants, pathOpts, extraBase) {
    const base = Object.assign({ path: pathOpts || { path: "raster" } }, extraBase || {}, { effect: name, params: ref });
    render(FX.byId[name].name, "Reference", refNote + " Every image in this section changes one control from this one.", base);
    for (const [title, note, patch, extra] of variants) render(FX.byId[name].name, title, note, Object.assign({}, base, extra || {}, { params: Object.assign({}, ref, patch) }));
}
effectSet("delay", { time: 150, feedback: 0.6, damping: 1, taps: 1, spread: 1, polarity: "+" }, "Time 150 px, Feedback 0.6, Damping off, one tap, positive polarity, raster path.", [
    ["Time 40 px", "Shorter echoes: a tight ghost beside every edge.", { time: 40 }],
    ["Time 600 px", "Longer echoes: the repeats are further apart, more than half a row.", { time: 600 }],
    ["Feedback 0.9", "Many more repeats before they die away.", { feedback: 0.9 }],
    ["Feedback 1.1", "Above 1 the echoes grow instead of fading; the engine clamps them so they saturate rather than explode.", { feedback: 1.1 }],
    ["Damping 40 px", "The feedback path is low-passed: each repeat is softer than the last.", { damping: 40 }],
    ["Taps 4", "Three extra echoes at multiples of the time, taken straight from the input, without feedback.", { taps: 4 }],
    ["Taps 4, Tap spread 2", "The extra taps spaced by doubling: at 150, 300, 600 px.", { taps: 4, spread: 2 }],
    ["Polarity: negative", "Every repeat is inverted, so the colours flip with each echo.", { polarity: "-" }],
    ["Polarity: alternating", "Every other repeat is inverted.", { polarity: "alt" }]
]);
effectSet("flanger", { time: 24, depth: 16, period: 400, feedback: 0.5, phase: 0, shape: "sine", source: "path" }, "Centre time 24 px, Depth 16 px, LFO period 400 px, Feedback 0.5, sine LFO along the path, raster.", [
    ["Centre time 100 px", "The delayed copy sits further from the original: wider combing.", { time: 100 }],
    ["Depth 60 px", "The sweep swings much further, so the comb pattern breathes more.", { depth: 60 }],
    ["LFO period 3000 px", "A slow sweep: the pattern changes gradually along the path.", { period: 3000 }],
    ["Feedback 0.9", "Strong resonance in the comb.", { feedback: 0.9 }],
    ["Feedback −0.9", "Negative feedback: the resonant peaks move to the other set of frequencies, a hollower sound in audio terms, a different pattern here.", { feedback: -0.9 }],
    ["LFO shape: square", "The delay time jumps between two values instead of gliding.", { shape: "square" }],
    ["LFO shape: random", "The delay wanders.", { shape: "random" }],
    ["LFO source: Image Y", "The sweep follows the picture's rows rather than the path, so the rows swing left and right in a wave down the picture.", { source: "y" }],
    ["LFO source: Image X", "The sweep follows the columns.", { source: "x" }],
    ["LFO source: distance from centre", "The sweep is radial: rings of varying comb.", { source: "radius" }]
]);
effectSet("phaser", { stages: 4, pmin: 4, pmax: 60, period: 600, feedback: 0.4, phase: 0, out: "mix", shape: "sine", source: "path" }, "4 stages sweeping between 4 and 60 px periods, LFO period 600 px, Feedback 0.4, mixed output, raster.", [
    ["Stages 12", "More notches, a deeper effect.", { stages: 12 }],
    ["Longest period 400 px", "The sweep reaches into much coarser detail.", { pmax: 400 }],
    ["LFO period 3000 px", "A slow sweep.", { period: 3000 }],
    ["Feedback 0.9", "Resonant: the notches become peaks.", { feedback: 0.9 }],
    ["Output: all-passed only (dispersion)", "The all-passed signal alone: every edge smeared into a decaying ripple along the path.", { out: "wet" }],
    ["Output: difference", "Only what the phaser moved.", { out: "diff" }],
    ["LFO source: Image Y", "The sweep follows the rows.", { source: "y" }]
]);
effectSet("filter", { period: 12, res: 0.7, drive: 1, lfoDepth: 0, lfoPeriod: 500, mode: "lp", shape: "sine", source: "path" }, "Low-pass, cutoff period 12 px, Resonance 0.7, Drive 1, no LFO, raster.", [
    ["Cutoff period 60 px", "Much more is cut: only detail coarser than 60 px along the path survives.", { period: 60 }],
    ["Resonance 0.98", "Near self-oscillation: every edge rings with a 12 px oscillation.", { res: 0.98 }],
    ["Drive 4", "The signal pushed harder into the filter.", { drive: 4 }],
    ["Mode: high-pass", "Only the detail finer than the cutoff is kept; the broad tone goes (AC coupling puts the slow level back).", { mode: "hp" }],
    ["Mode: band-pass", "Only detail around the cutoff period.", { mode: "bp" }],
    ["Mode: notch", "Detail at the cutoff period removed.", { mode: "notch" }],
    ["Mode: peak", "Detail at the cutoff period boosted.", { mode: "peak" }],
    ["LFO depth 3 octaves, period 500 px", "The cutoff sweeps up and down by three octaves every 500 px: a wah along the path.", { lfoDepth: 3 }]
]);
effectSet("bitcrush", { levels: 6, hold: 1, dither: 0, xor: 0, jitter: 0, holdMode: "sh" }, "6 levels, Hold 1 (no sample-rate reduction), no dither, no bit-flip, DC coupling, raster.", [
    ["Levels 3", "Three tones per channel.", { levels: 3 }],
    ["Hold 24 px", "Each value held for 24 px along the path: horizontal bars on the raster path (blobs on a Hilbert path).", { hold: 24 }],
    ["Hold 24 px, hold mode: average", "The held value is the average of the run rather than its first sample.", { hold: 24, holdMode: "avg" }],
    ["Hold 24 px, hold jitter 1", "The run lengths randomised.", { hold: 24, jitter: 1 }],
    ["Dither 1", "Noise added before quantising, breaking the bands into grain.", { dither: 1 }],
    ["Bit-flip (XOR) 5", "The quantised value XORed with 5: certain levels swap, so bands of colour invert.", { xor: 5 }],
    ["Levels 256, Hold 12", "No posterisation at all, only the hold: pure sample-rate reduction along the path.", { levels: 256, hold: 12 }]
], null, { coupling: "dc" });
effectSet("distortion", { drive: 4, bias: 0, pre: 1, tone: 1, level: 0.8, type: "soft" }, "Soft clip, Drive 4, no bias, no pre-emphasis, no tone, level 0.8, DC coupling, raster.", [
    ["Drive 20", "Hard into the clipper: nearly everything becomes black or white.", { drive: 20 }],
    ["Bias 0.5", "An offset before the clipper: the picture pushed towards white before clipping.", { bias: 0.5 }],
    ["Pre-emphasis 40 px", "The slow level passes and only changes finer than 40 px along the path are driven: the edges distort, the flat areas don't.", { pre: 40 }],
    ["Tone 30 px", "A low-pass after the clipper: the distortion softened along the path.", { tone: 30 }],
    ["Level 1.5", "Output gain.", { level: 1.5 }],
    ["Type: hard clip", "A hard ceiling instead of a soft one.", { type: "hard" }],
    ["Type: fold-back", "Overdriven values wrap back: solarisation.", { type: "fold" }],
    ["Type: asymmetric (tube-ish)", "Different curves for light and dark.", { type: "tube" }],
    ["Type: rectify", "The signal's sign is thrown away: mid grey becomes black, both black and white become white.", { type: "rect" }],
    ["Type: sine shaper", "A sine-wave transfer curve.", { type: "sine" }]
], null, { coupling: "dc" });
effectSet("ringmod", { period: 40, depth: 1, phase: 0, fm: 0, mode: "ring", shape: "sine", source: "path" }, "Ring (multiply), carrier period 40 px, Depth 1, sine, along the path, DC coupling, raster.", [
    ["Carrier period 300 px", "Wider stripes.", { period: 300 }],
    ["Depth 0.4", "A gentler modulation.", { depth: 0.4 }],
    ["Period drift 1", "The period wanders along the path.", { fm: 1 }],
    ["Mode: tremolo", "Fades the picture to grey and back instead of inverting it.", { mode: "trem" }],
    ["Mode: add", "The carrier laid over the picture.", { mode: "add" }],
    ["Shape: square", "Hard inversion in stripes.", { shape: "square" }],
    ["Shape: triangle", "A linear fade in and out.", { shape: "triangle" }],
    ["Source: Image Y", "Stripes follow the rows regardless of path.", { source: "y" }],
    ["Source: distance from centre", "Rings.", { source: "radius" }],
    ["Carrier period 40 px on a Hilbert path", "The same carrier, but the stripes take the Hilbert curve's shape.", {}, { path: { path: "hilbert" } }]
], null, { coupling: "dc" });
effectSet("reverb", { size: 300, decay: 0.85, damp: 0.3, diffuse: 0.5, predelay: 0 }, "Size 300 px, Decay 0.85, Damping 0.3, Diffusion 0.5, no pre-delay, AC coupling, raster.", [
    ["Size 1500 px", "Longer delay lines: a sparser, longer tail.", { size: 1500 }],
    ["Decay 0.99", "A tail that goes on and on.", { decay: 0.99 }],
    ["Damping 1", "The tail loses its fine detail quickly.", { damp: 1 }],
    ["Diffusion 0.9", "Denser smearing.", { diffuse: 0.9 }],
    ["Pre-delay 500 px", "A gap before the tail starts.", { predelay: 500 }],
    ["Size 300 px on a Hilbert path", "The same reverb along a Hilbert curve: a grainy tail in no particular direction.", {}, { path: { path: "hilbert" } }]
]);
effectSet("granular", { grain: 200, reverse: 0.5, repeat: 1, scatter: 0, pitch: 1, sizeJitter: 0 }, "Grain 200 px, half the grains reversed, played once, no scatter, pitch 1, DC coupling, raster.", [
    ["Grain 800 px", "Larger pieces.", { grain: 800 }],
    ["Reverse chance 1", "Every grain reversed.", { reverse: 1 }],
    ["Reverse chance 0, Repeat 4", "Nothing reversed; every grain played four times (stutter).", { reverse: 0, repeat: 4 }],
    ["Reverse chance 0, Scatter 400 px", "Grains read from a random offset up to 400 px away.", { reverse: 0, scatter: 400 }],
    ["Reverse chance 0, Pitch 0.5", "Each grain reads at half speed: the picture stretched along the path, every other grain's worth dropped.", { reverse: 0, pitch: 0.5 }],
    ["Reverse chance 0, Pitch 2", "Each grain reads at double speed: squashed.", { reverse: 0, pitch: 2 }],
    ["Size jitter 1", "Grain sizes randomised.", { sizeJitter: 1 }],
    ["Grain 200 px on a spiral path", "Grains as arcs.", {}, { path: { path: "spiral", pitch: 1 } }]
], null, { coupling: "dc" });
effectSet("compressor", { threshold: 0.3, ratio: 4, attack: 20, release: 200, makeup: 1.5 }, "Threshold 0.3, Ratio 4, Attack 20 px, Release 200 px, Make-up 1.5, AC coupling, raster.", [
    ["Threshold 0.05", "Almost everything is above the threshold and gets squashed.", { threshold: 0.05 }],
    ["Ratio 20", "Near-limiting.", { ratio: 20 }],
    ["Ratio 0.3", "Below 1 it expands: contrast above the threshold is exaggerated.", { ratio: 0.3 }],
    ["Attack 300 px", "The gain reacts slowly: edges punch through before the compressor catches them.", { attack: 300 }],
    ["Release 2000 px", "The gain stays down long after an edge, leaving a long shadow along the path.", { release: 2000 }],
    ["Make-up 4", "Everything lifted after compression.", { makeup: 4 }]
]);

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log("pixel images:", manifest.length);

// ---------------------------------------------------------------- 6. outline mode (glyph outlines; drawn by the Python step)
const glyphs = JSON.parse(fs.readFileSync(GLYPHS));
const OB = { reroll: "same", channel: "rgb", coupling: "dc", couplingPeriod: 600, mix: 1, seed: 1 };
const stg = (effect, params) => Object.assign({}, OB, { effect, params: Object.assign(FX.defaults(FX.byId[effect]), params) });
const ol = [
    ["The original outline", "Poppins Bold, read as paths. Direction domain, no effect (Bitcrush at 256 levels).", "direction", [stg("bitcrush", { levels: 256, hold: 1 })]],
    ["Direction: low-pass, period 40 px", "The outline's heading is smoothed: corners rounded.", "direction", [stg("filter", { period: 40, res: 0.3, mode: "lp" })]],
    ["Direction: low-pass with resonance 0.95, period 30 px", "The heading overshoots after each corner and wobbles back.", "direction", [stg("filter", { period: 30, res: 0.95, mode: "lp" })]],
    ["Direction: bitcrush, 9 levels, hold 12 px", "The outline may only head in a few directions, each held for a run: a pixel font.", "direction", [stg("bitcrush", { levels: 9, hold: 12 })]],
    ["Direction: delay 25 px, feedback 0.6", "Every corner is repeated a little further along.", "direction", [stg("delay", { time: 25, feedback: 0.6 })]],
    ["Direction: flanger", "A sweeping comb on the heading: a wavering edge.", "direction", [stg("flanger", { time: 10, depth: 8, period: 200, feedback: 0.5 })]],
    ["Position: low-pass, period 60 px", "x and y smoothed: the glyph softened and shrunk towards its centre lines.", "position", [stg("filter", { period: 60, res: 0.2, mode: "lp" })]],
    ["Position: bitcrush, 24 levels", "x and y snapped to a 24-step grid.", "position", [stg("bitcrush", { levels: 24, hold: 1 })]],
    ["Position: ring mod add, period 30 px, depth 0.08", "A sine wave laid along the outline: a hand-cut wobble.", "position", [stg("ringmod", { period: 30, depth: 0.08, mode: "add", shape: "sine" })]],
    ["Position: granular, grain 60 px, scatter 30 px", "The outline cut into pieces and re-laid.", "position", [stg("granular", { grain: 60, reverse: 0.4, repeat: 1, scatter: 30 })]],
    ["Position: delay 40 px, feedback 0.7, AC 200 px", "The shape echoes itself along the outline.", "position", [Object.assign(stg("delay", { time: 40, feedback: 0.7 }), { coupling: "ac", couplingPeriod: 200 })]],
    ["Chain: bitcrush then delay (direction)", "A pixel font with corner echoes.", "direction", [stg("bitcrush", { levels: 9, hold: 10 }), stg("delay", { time: 30, feedback: 0.5 })]],
    ["One signal through every subpath (position delay)", "The glyphs joined into one signal, so echoes cross from letter to letter.", "position", [Object.assign(stg("delay", { time: 80, feedback: 0.6 }), { coupling: "ac", couplingPeriod: 300 })], { perSubpath: false }]
];
const olOut = [];
for (const [title, note, domain, stages, extra] of ol) {
    const r = O.run(glyphs, stages, Object.assign({ domain, spacing: 1, outSpacing: 3 }, extra || {}));
    olOut.push({ title, note, domain, subpaths: r.subpaths.map(sp => ({ closed: sp.closed, pts: sp.points.map(p => [p.anchor, p.left, p.right, p.kind]) })) });
}
fs.writeFileSync(path.join(OUT, "outline.json"), JSON.stringify(olOut));
console.log("outline cases:", olOut.length);
