// Hexrack — built-in presets. Each is a rack: a list of stage patches (device,
// flat params for that device, and optional seed / mix / rowFrom / rowSpan / chan).
// Starting points, not end points. "note" is shown under the preset menu.

const HX_PRESETS = [
    // ---------------------------------------------------------------- classics
    { group: "classics", id: "wordpad", title: "WordPad", note: "The original accident: a BMP opened and saved in WordPad. Every 0A byte gains a 0D before it, so the picture shears a little at every one it meets; busy areas shear more than flat ones.",
      stages: [{ device: "texted", params: { accident: "crlf", prob: 100 } }] },
    { group: "classics", id: "hexshift", title: "Hex editor shift", note: "A few bytes cut from the front of the file: the picture slides sideways and its colour channels rotate. The oldest trick there is.",
      stages: [{ device: "shift", params: { pixels: 37, rows: 2, bytes: 1, fill: "wrap" } }] },
    { group: "classics", id: "jpegbend", title: "Bent JPEG", note: "A JPEG with a handful of corrupted bytes and no restart markers, so each error smears a colour cast along the rest of the scan. The look everyone knows from Notepad-edited photos.",
      stages: [{ device: "jpeg", params: { quality: 75, restart: 0, hits: 2, size: 1, damage: "flip" }, seed: 11 }] },
    { group: "classics", id: "audacity_echo", title: "Audacity echo", note: "The sonification bend: import the file as U-Law audio, run Echo, export. Wrapping overflow gives the fringes.",
      stages: [{ device: "audacity", params: { effect: "echo", format: "ulaw", time: 180, amount: 0.7, over: "wrap" } }] },
    { group: "classics", id: "wrongwidth", title: "Wrong width", note: "The header says the picture is one pixel wider than it is, so every row starts a pixel late and the picture leans into a weave.",
      stages: [{ device: "reinterpret", params: { dw: 1, pb: "3", depth: "8", layout: "inter" } }] },
    { group: "classics", id: "pngdrift", title: "PNG filter drift", note: "Residuals encoded with Paeth prediction, a sprinkling of damaged bytes, and the errors integrate down the picture as coloured drift. Decode as Up for a deterministic downward smear instead.",
      stages: [{ device: "png", params: { enc: "4", dec: "same", noise: 2, amp: 255 } }] },
    { group: "classics", id: "pixelsort", title: "Pixel sort", note: "Asendorf's interval sort along the rows, between brightness thresholds. Columns for the waterfall version.",
      stages: [{ device: "pixelsort", params: { dir: "rows", interval: "thr", lo: 50, hi: 210, key: "luma", order: "asc" } }] },

    // ---------------------------------------------------------------- one device, pushed
    { group: "one device", id: "utf8", title: "UTF-8 stretch", note: "Latin-1 to UTF-8: a fifth of the bytes over 127 become two, so the brighter parts of the picture stretch and skew and the dark parts stay. At 100% it is pure static; 5–30% is the sweet range.",
      stages: [{ device: "texted", params: { accident: "utf8", prob: 20, fill: "wrap" } }] },
    { group: "one device", id: "staircase", title: "Staircase", note: "One byte inserted every so often: a regular shear that cycles the colour channels as it goes down. Jitter makes the staircase drunk.",
      stages: [{ device: "insdel", params: { every: 2000, count: 1, mode: "insert", what: "prev", jitter: 0 } }] },
    { group: "one device", id: "sixteenbit", title: "Read as 16-bit", note: "The 8-bit file read as 16-bit samples: half the data, twice the width, and the colour channels paired off wrongly.",
      stages: [{ device: "reinterpret", params: { dw: 0, depth: "16le", pb: "3" } }] },
    { group: "one device", id: "planar", title: "Read as planar", note: "The interleaved file read as if all the reds came first, then the greens, then the blues: three ghost copies of the picture, one per channel, stacked down the frame.",
      stages: [{ device: "reinterpret", params: { dw: 0, layout: "planar" } }] },
    { group: "one device", id: "jpeg_slide", title: "JPEG slide", note: "Bytes deleted from the JPEG stream, with restart markers but the decoder told not to resync: the picture slips a block or two at every loss and the colours drift with it.",
      stages: [{ device: "jpeg", params: { restart: 8, hits: 6, damage: "delete", size: 3, resync: "none", onFatal: "hold" }, seed: 5 }] },
    { group: "one device", id: "jpeg_mesh", title: "JPEG mesh", note: "No stream damage at all: the quantisation table in the header is edited so the high frequencies are decoded eight times too strong. Every edge rings and flat areas breathe a basket-weave.",
      stages: [{ device: "jpeg", params: { damage: "none", dqt: "highUp", qscale: 8, quality: 60, sub: "444" } }] },
    { group: "one device", id: "palette_cycle", title: "Palette cycle", note: "Sixteen colours, sorted by brightness, every index moved along by three: a posterised remap where tones become their neighbours.",
      stages: [{ device: "palette", params: { colours: 16, sort: "luma", rotate: 3, replace: "none" } }] },
    { group: "one device", id: "phaser", title: "Phaser on the bytes", note: "A phaser swept over the file as 8-bit audio. Bars of colour where the sweep cancels.",
      stages: [{ device: "audacity", params: { effect: "phaser", format: "u8", time: 900, amount: 0.7, res: 0.4 } }] },
    { group: "one device", id: "stutter", title: "Stutter", note: "A stuck buffer: runs of the file repeated four times at a dozen places, pushing the rest along.",
      stages: [{ device: "stutter", params: { count: 12, length: 400, times: 4, mode: "insert" } }] },

    // ---------------------------------------------------------------- racks
    { group: "racks", id: "jpeg_then_sort", title: "Bent JPEG → pixel sort", note: "A bent JPEG's colour smears, then an interval sort pulls them out into streaks. The two most-seen glitch textures, in the order they were invented.",
      stages: [{ device: "jpeg", params: { restart: 0, hits: 3, damage: "byte" }, seed: 21 }, { device: "pixelsort", params: { interval: "thr", lo: 40, hi: 200 }, mix: 0.9 }] },
    { group: "racks", id: "wordpad_jpeg", title: "WordPad → JPEG", note: "The text-editor shear, re-encoded as a JPEG and then bent again: the blocky compression grid sits on top of the skew, and the colour casts cut across both.",
      stages: [{ device: "texted", params: { accident: "crlf", prob: 60 } }, { device: "jpeg", params: { restart: 16, hits: 4, damage: "flip", quality: 40 } }] },
    { group: "racks", id: "band_sandwich", title: "Band sandwich", note: "Three devices each confined to a band of rows: the top third read as planar, the middle shifted, the bottom put through PNG drift. One file, three different wrongs.",
      stages: [{ device: "reinterpret", params: { layout: "planar", dw: 0 }, rowFrom: 0, rowSpan: 33 }, { device: "shift", params: { pixels: 60, rows: 0, bytes: 2 }, rowFrom: 33, rowSpan: 34 }, { device: "png", params: { enc: "4", dec: "2", noise: 0.5 }, rowFrom: 67, rowSpan: 33 }] },
    { group: "racks", id: "red_only", title: "Red channel only", note: "A violent reinterpretation written back to the red channel alone, so the picture is intact in green and blue and torn in red: a misregistered ghost.",
      stages: [{ device: "reinterpret", params: { dw: 3, pb: "4" }, chan: "r" }, { device: "bitops", params: { op: "xor", mask: 128, prob: 30 }, chan: "r", mix: 0.6 }] },
    { group: "racks", id: "utf8_jpeg_palette", title: "UTF-8 → JPEG → palette", note: "Stretch, compress and corrupt, then flatten the result to a scrambled eight-colour palette. Comes out like a bad screen-print of a bad fax.",
      stages: [{ device: "texted", params: { accident: "utf8", prob: 10 } }, { device: "jpeg", params: { restart: 0, hits: 1.5, damage: "flip", quality: 30 } }, { device: "palette", params: { colours: 8, sort: "scramble", replace: "none" } }] },
    { group: "racks", id: "audacity_stack", title: "Audacity stack", note: "What people did in Audacity in 2008: reverse a stretch, echo, tremolo, in one go. Each pass is on signed 8-bit samples with wrapping overflow.",
      stages: [{ device: "audacity", params: { effect: "reverse", format: "s8" }, rowFrom: 40, rowSpan: 30 }, { device: "audacity", params: { effect: "echo", format: "s8", time: 220, amount: 0.6 } }, { device: "audacity", params: { effect: "tremolo", format: "u8", time: 300, amount: 0.8 } }] },
    { group: "racks", id: "png_mismatch", title: "PNG mismatch → shift", note: "Encoded Paeth, decoded Up, then the whole thing slid by a byte: the deterministic drift of the wrong filter with the colour rotation of a hex shift on top.",
      stages: [{ device: "png", params: { enc: "4", dec: "2", noise: 0 } }, { device: "shift", params: { pixels: 0, rows: 0, bytes: 1 } }] },
    { group: "racks", id: "bitrot_jpeg", title: "Bit rot → JPEG honest", note: "Random bit flips in the raw file, then an honest low-quality JPEG round trip: the compression smooths the rot into blotches and leaves its own blocks behind.",
      stages: [{ device: "bitrot", params: { density: 300, burst: 1, kind: "flip" } }, { device: "jpeg", params: { damage: "none", dqt: "honest", quality: 12, sub: "420" } }] }
];
if (typeof module !== "undefined") module.exports = HX_PRESETS;
