// Pixachron — built-in presets. Each is a patch over the default state:
// starting points, not end points. "note" is shown under the preset menu.

const PX_PRESETS = [
    { group: "one stage", id: "hilbert_echo", title: "Hilbert echo", note: "The signature move: a feedback delay along a Hilbert curve. Echoes become blotches and tendrils that keep the picture's neighbourhoods together. Tile sets the scale of the curve.",
      st: { path: { path: "hilbert" }, effect: "delay", params: { time: 300, feedback: 0.75, damping: 4 }, coupling: "ac", couplingPeriod: 800 } },
    { group: "one stage", id: "raster_smear", title: "Databender's raster", note: "What Audacity would have done: echoes along the rows, wrapping at the line ends. Here for reference, and because Hold and XOR make it sing.",
      st: { path: { path: "raster" }, effect: "delay", params: { time: 160, feedback: 0.7, taps: 1 }, coupling: "ac", couplingPeriod: 600 } },
    { group: "one stage", id: "ghost_type", title: "Ghost type (lines reset)", note: "A delay with the effect reset on every row, so echoes trail to the right but never wrap. Negative polarity flips the colours of every repeat.",
      st: { path: { path: "raster", segment: "line" }, effect: "delay", params: { time: 90, feedback: 0.8, polarity: "-" }, coupling: "ac", couplingPeriod: 500 } },
    { group: "one stage", id: "spiral_rings", title: "Spiral rings", note: "A tight spiral from the centre with a delay: the echoes become concentric rings. Move the centre with Centre X/Y.",
      st: { path: { path: "spiral", pitch: 1, cx: 0.5, cy: 0.5 }, effect: "delay", params: { time: 200, feedback: 0.7 }, coupling: "ac", couplingPeriod: 800 } },
    { group: "one stage", id: "sunburst", title: "Sunburst", note: "Spokes from the centre, each its own signal, with a resonant band-pass: edges burst outwards as rays. Try Inward to pull them in instead.",
      st: { path: { path: "spokes", segment: "line", cx: 0.5, cy: 0.45 }, effect: "filter", params: { period: 40, res: 0.6, mode: "bp", drive: 2 }, coupling: "dc" } },
    { group: "one stage", id: "contour_radiate", title: "Radiating off the letters", note: "The Contour path: time runs outward from the edge of the masked shapes, so the echoes radiate off the type like contour lines. Needs a mask (Dark pixels works for dark type on a light ground).",
      st: { path: { path: "contour" }, maskSource: "dark", maskUse: "path", effect: "delay", params: { time: 120, feedback: 0.75, polarity: "alt" }, channel: "luma", coupling: "ac", couplingPeriod: 600 } },
    { group: "one stage", id: "inside_only", title: "Echoes inside the letters", note: "Only the masked pixels count as samples, so the echoes stay inside the shapes and the background is untouched. Snake path so the echoes turn back at the edges.",
      st: { path: { path: "raster", snake: true }, maskSource: "dark", maskUse: "only", effect: "delay", params: { time: 40, feedback: 0.85 }, coupling: "dc" } },
    { group: "one stage", id: "y_flange", title: "Flange across the picture", note: "A flanger whose LFO follows Image Y rather than the path: the rows swing left and right in a wave. Depth sets the swing, LFO period its wavelength down the picture.",
      st: { path: { path: "raster" }, effect: "flanger", params: { time: 20, depth: 18, period: 300, feedback: 0.8, source: "y" }, coupling: "ac", couplingPeriod: 600 } },
    { group: "one stage", id: "hilbert_grains", title: "Hilbert grains", note: "Granular on a tiled Hilbert curve: the picture is cut into blobs and re-laid reversed, repeated or stretched.",
      st: { path: { path: "hilbert", tile: 128, segment: "tile" }, effect: "granular", params: { grain: 300, reverse: 0.5, repeat: 2, pitch: 0.5 }, coupling: "dc" } },
    { group: "one stage", id: "spiral_stutter", title: "Spiral stutter", note: "Granular along a spiral: arcs of the picture repeated and scattered.",
      st: { path: { path: "spiral", pitch: 1, cx: 0.5, cy: 0.4 }, effect: "granular", params: { grain: 400, reverse: 0.5, repeat: 3, scatter: 200 }, coupling: "dc" } },
    { group: "one stage", id: "hilbert_crush", title: "Hilbert crush", note: "Bitcrush with a long hold along a Hilbert curve: the posterised blocks take the curve's shape instead of a grid.",
      st: { path: { path: "hilbert" }, effect: "bitcrush", params: { levels: 5, hold: 24 }, coupling: "dc" } },
    { group: "one stage", id: "xor_spiral", title: "XOR spiral", note: "Bit-flip corruption along a loose spiral: the colours invert in interleaved rings.",
      st: { path: { path: "spiral", pitch: 4, cx: 0.5, cy: 0.4 }, effect: "bitcrush", params: { levels: 16, hold: 3, xor: 5 }, coupling: "dc" } },
    { group: "one stage", id: "dispersion", title: "Dispersion", note: "The phaser's all-passed output on its own: every edge is smeared into a decaying ripple along the path, like light through a prism.",
      st: { path: { path: "hilbert" }, effect: "phaser", params: { stages: 8, pmin: 4, pmax: 120, period: 2000, feedback: 0.8, out: "wet" }, coupling: "ac", couplingPeriod: 600 } },
    { group: "one stage", id: "hilbert_room", title: "Hilbert room", note: "A reverb along a Hilbert curve: a diffuse, grainy tail behind every edge in no particular direction.",
      st: { path: { path: "hilbert" }, effect: "reverb", params: { size: 400, decay: 0.9 }, coupling: "ac", couplingPeriod: 800 } },
    { group: "one stage", id: "chromatic", title: "Chromatic echo", note: "Channel spread scales the delay time differently for red, green and blue, so every echo splits into colour.",
      st: { path: { path: "hilbert" }, effect: "delay", params: { time: 200, feedback: 0.6 }, channel: "spread", spread: 0.6, coupling: "ac", couplingPeriod: 800 } },
    { group: "one stage", id: "wrong_way_back", title: "Rolled back the wrong way", note: "Unrolled along the rows, rolled back along a Hilbert curve, with no effect at all: the picture is scrambled by the two paths alone. Then add an effect.",
      st: { path: { path: "raster" }, reroll: "hilbert", effect: "bitcrush", params: { levels: 256, hold: 1 }, coupling: "dc" } },
    { group: "one stage", id: "twisted_spokes", title: "Twisted spokes", note: "Spokes with a twist, running inward, with a compressor whose release trails along each ray.",
      st: { path: { path: "spokes", segment: "line", cx: 0.5, cy: 0.5, twist: 90, inward: true }, effect: "compressor", params: { threshold: 0.15, ratio: 10, attack: 3, release: 300, makeup: 2 }, coupling: "ac", couplingPeriod: 400 } },
    // ---- chains: stages run in series, each with its own path and effect
    { group: "chains", id: "echo_then_rings", title: "Hilbert echo into spiral rings", note: "A Hilbert delay, then a tight-spiral delay over the result: the blotches get ringed.",
      st: { stages: [
        { path: { path: "hilbert" }, effect: "delay", params: { time: 300, feedback: 0.7, damping: 4 }, coupling: "ac", couplingPeriod: 800 },
        { path: { path: "spiral", pitch: 1, cx: 0.5, cy: 0.5 }, effect: "delay", params: { time: 200, feedback: 0.6 }, coupling: "ac", couplingPeriod: 800 } ] } },
    { group: "chains", id: "flange_then_crush", title: "Flange, then crush", note: "The Image-Y flanger's waves, posterised into Hilbert-shaped blocks.",
      st: { stages: [
        { path: { path: "raster" }, effect: "flanger", params: { time: 20, depth: 18, period: 300, feedback: 0.8, source: "y" }, coupling: "ac", couplingPeriod: 600 },
        { path: { path: "hilbert" }, effect: "bitcrush", params: { levels: 6, hold: 16 }, coupling: "dc" } ] } },
    { group: "chains", id: "sunburst_grains", title: "Sunburst, then grains", note: "A spokes band-pass burst, then granular stutter along a spiral so the rays are cut into arcs.",
      st: { stages: [
        { path: { path: "spokes", segment: "line", cx: 0.5, cy: 0.45 }, effect: "filter", params: { period: 40, res: 0.6, mode: "bp", drive: 2 }, coupling: "dc" },
        { path: { path: "spiral", pitch: 1, cx: 0.5, cy: 0.45 }, effect: "granular", params: { grain: 300, reverse: 0.5, repeat: 2, scatter: 100 }, coupling: "dc", mix: 0.7 } ] } },
    { group: "chains", id: "type_three_ways", title: "Type three ways", note: "Needs a Dark-pixels mask. Stage 1 echoes inside the letters only; stage 2 radiates off them with the Contour path; stage 3 disperses the whole thing a little along a Hilbert curve.",
      st: { maskSource: "dark", stages: [
        { path: { path: "raster", snake: true }, maskUse: "only", effect: "delay", params: { time: 40, feedback: 0.85 }, coupling: "dc" },
        { path: { path: "contour" }, maskUse: "path", effect: "delay", params: { time: 120, feedback: 0.75, polarity: "alt" }, channel: "luma", coupling: "ac", couplingPeriod: 600 },
        { path: { path: "hilbert" }, maskUse: "path", effect: "phaser", params: { stages: 6, pmin: 4, pmax: 60, period: 2000, feedback: 0.6, out: "wet" }, coupling: "ac", couplingPeriod: 600, mix: 0.5 } ] } },
    { group: "chains", id: "scramble_echo_unscramble", title: "Scramble, echo, unscramble", note: "Rolled out along the rows and back along a Hilbert curve, echoed, then rolled out along the Hilbert curve and back along the rows: the scramble is undone but the echo was made in the scrambled space, so it lands in a shape no single path gives.",
      st: { stages: [
        { path: { path: "raster" }, reroll: "hilbert", effect: "bitcrush", params: { levels: 256, hold: 1 }, coupling: "dc" },
        { path: { path: "raster" }, effect: "delay", params: { time: 200, feedback: 0.7 }, coupling: "ac", couplingPeriod: 600 },
        { path: { path: "hilbert" }, reroll: "raster", effect: "bitcrush", params: { levels: 256, hold: 1 }, coupling: "dc" } ] } },
    // ---- outlines: run on a text layer's outline (Outline mode switches on with these)
    { group: "outlines", id: "ol_rounded", title: "Outline: rounded off", note: "Low-pass on the outline's direction: every corner softened, the glyph rounded like a worn rubber stamp. Lower the cutoff period for less rounding.",
      st: { outline: { on: true, domain: "direction" }, stages: [{ effect: "filter", params: { period: 40, res: 0.3, mode: "lp" }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_pixelfont", title: "Outline: pixel font", note: "Bitcrush on the direction: the outline may only head in a few directions and holds each for a run of pixels, so any typeface becomes a chunky bitmap face while staying vector.",
      st: { outline: { on: true, domain: "direction" }, stages: [{ effect: "bitcrush", params: { levels: 9, hold: 12 }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_corner_echo", title: "Outline: corner echoes", note: "Delay on the direction: every turn the outline makes is repeated a little further along, so corners stutter into steps.",
      st: { outline: { on: true, domain: "direction" }, stages: [{ effect: "delay", params: { time: 25, feedback: 0.6 }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_ringing", title: "Outline: ringing", note: "A resonant low-pass on the direction: the outline overshoots after every corner and wobbles back, like a plucked wire.",
      st: { outline: { on: true, domain: "direction" }, stages: [{ effect: "filter", params: { period: 30, res: 0.95, mode: "lp" }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_shuffle", title: "Outline: shuffled", note: "Granular on the position: the outline is cut into pieces and re-laid, some reversed, some from elsewhere on the glyph. Broken letterforms that still read.",
      st: { outline: { on: true, domain: "position" }, stages: [{ effect: "granular", params: { grain: 60, reverse: 0.4, repeat: 1, scatter: 30 }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_wobble", title: "Outline: wobble", note: "Ring mod in Add mode on the position: a sine wave laid along the outline, a wobbly hand-cut edge.",
      st: { outline: { on: true, domain: "position" }, stages: [{ effect: "ringmod", params: { period: 30, depth: 0.08, mode: "add", shape: "sine" }, coupling: "dc" }] } },
    { group: "outlines", id: "ol_crush_echo", title: "Outline: pixel font with echoes", note: "Two stages on the direction: bitcrush, then delay. The pixel-font steps get echoed.",
      st: { outline: { on: true, domain: "direction" }, stages: [{ effect: "bitcrush", params: { levels: 9, hold: 10 }, coupling: "dc" }, { effect: "delay", params: { time: 30, feedback: 0.5 }, coupling: "dc" }] } }
];

if (typeof module !== "undefined") module.exports = PX_PRESETS;
