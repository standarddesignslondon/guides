// PrintLook - data: processes, papers, inks and ink sets, and how a preset is assembled into full settings.
//
// Where the numbers come from (see PrintLook_Research_Report.md for sources):
//  - Screen rulings, mesh counts, gravure cell geometry, collotype grain, litho register drift, sheet sizes: sourced.
//  - Ink film thickness order (offset < letterpress << screen): sourced; used as relative "ink" amounts.
//  - Letterpress rim width, impression depth, stroke gain, halo widths, mottle and salt amounts: NOT in any source.
//    Simon's 600-1200 dpi flatbed scans could not resolve the rim either (the scanner's own edge blur is 130-250 um),
//    so these defaults are estimates set by eye against his scans, and are marked est. on the panel.
//  - Ink and paper colours: no measured period values exist. Colours are estimates from the pigment named, except
//    those marked "scan", which are read from Simon's (uncalibrated) scans, and the SWOP / Japan Color sets (measured, late).
const C = require("./pl_core.js");

// ---------------------------------------------------------------- press defaults (sizes in micrometres on the paper)
const PRESS0 = {
    ink: 1, pressure: 1, gain: 0, soften: 0, edge: 20, ragged: 0, raggedScale: 150, rim: 0, rimWidth: 70, starve: 0,
    bleed: 0, halo: 0, haloWidth: 300, impression: 0,
    mottle: 0, mottleScale: 3000, salt: 0, saltScale: 180, speckle: 0, sorts: 0, grain: 0, grainAngle: 0, wear: 0,
    mesh: 0, meshPitch: 205, hollow: 0, hollowWidth: 600, spatter: 0, slur: 0, slurAngle: 90, hickeys: 0, specks: 0, scum: 0, banding: 0
};
const TONE0 = { carrier: "halftone", lpi: 100, angle: 45, dot: "square", minDot: 0.04, maxDot: 0.95, comp: 0.7, contrast: 1, grainSize: 180, tintSteps: 0 };

const PROCESSES = {
    letterpress_wood: { label: "Letterpress: wood letter poster", family: "relief",
        press: { ink: 1.0, pressure: 0.9, gain: 48, soften: 40, edge: 22, ragged: 0.5, raggedScale: 180, rim: 0.5, rimWidth: 110, starve: 0.25, halo: 0.12, haloWidth: 350, impression: 0.3,
            mottle: 0.45, mottleScale: 5000, salt: 0.42, saltScale: 230, speckle: 0.3, sorts: 0.6, grain: 0.35, grainAngle: 0, wear: 0.4 },
        tone: { carrier: "halftone", lpi: 55, dot: "square", minDot: 0.08, maxDot: 0.9 },
        note: "Wood letter and large metal type printed on a cylinder or hand press with soft packing on cheap damped paper (Southward 1915), so more squash and softer edges than book work." },
    letterpress_job: { label: "Letterpress: jobbing (platen)", family: "relief",
        press: { ink: 1.0, pressure: 1.0, gain: 28, soften: 20, edge: 18, ragged: 0.35, raggedScale: 95, rim: 0.45, rimWidth: 70, starve: 0.15, halo: 0.08, haloWidth: 250, impression: 0.25,
            mottle: 0.22, mottleScale: 2500, salt: 0.16, saltScale: 150, speckle: 0.32, sorts: 0.25, wear: 0.15 },
        tone: { carrier: "halftone", lpi: 100, dot: "square", minDot: 0.05, maxDot: 0.93 },
        note: "Metal type and blocks on a jobbing platen: tickets, programmes, handbills. Set by eye against Simon's 1931-58 tickets and programmes." },
    letterpress_fine: { label: "Letterpress: fine (art paper)", family: "relief",
        press: { ink: 0.95, pressure: 1.0, gain: 14, soften: 12, edge: 15, ragged: 0.12, raggedScale: 100, rim: 0.3, rimWidth: 45, starve: 0.08, impression: 0.12,
            mottle: 0.08, mottleScale: 2000, salt: 0.04, saltScale: 120, speckle: 0.15, sorts: 0.08 },
        tone: { carrier: "halftone", lpi: 133, dot: "square", minDot: 0.04, maxDot: 0.95 },
        note: "Hard packing on coated or imitation-art paper: the dot is sharp with a pale centre (Getty Atlas)." },
    letterpress_news: { label: "Letterpress: rotary newspaper", family: "relief",
        press: { ink: 0.8, pressure: 0.85, gain: 45, soften: 30, edge: 20, ragged: 0.7, raggedScale: 110, rim: 0.3, rimWidth: 80, starve: 0.1, bleed: 6, halo: 0.25, haloWidth: 300,
            mottle: 0.3, mottleScale: 3500, salt: 0.3, saltScale: 220, speckle: 0.45, sorts: 0.08 },
        tone: { carrier: "halftone", lpi: 60, dot: "square", minDot: 0.08, maxDot: 0.88 },
        note: "Stereotype plates on newsprint with a non-drying mineral-oil ink that sets by soaking in (PrintWiki); 50-65 line screens (Whetton 1946)." },
    relief_block: { label: "Relief block: lino or woodcut", family: "relief",
        press: { ink: 1.05, pressure: 0.9, gain: 50, soften: 45, edge: 25, ragged: 0.45, raggedScale: 300, rim: 0.4, rimWidth: 110, starve: 0.2, impression: 0.2,
            mottle: 0.4, mottleScale: 6000, salt: 0.45, saltScale: 260, speckle: 0.15, grain: 0.25, wear: 0.25 },
        tone: { carrier: "threshold" },
        note: "Lino and side-grain wood blocks for flat poster colour and tint grounds." },
    flexo: { label: "Aniline (flexographic) on bags", family: "relief",
        press: { ink: 0.8, pressure: 1.1, gain: 70, soften: 45, edge: 25, ragged: 0.7, raggedScale: 130, rim: 0.5, rimWidth: 110, starve: 0.25,
            mottle: 0.35, mottleScale: 1200, salt: 0.1, saltScale: 200, speckle: 0.3, spatter: 0.2 },
        tone: { carrier: "threshold" },
        note: "Rubber plates and thin spirit dye inks: a ring of squeezed-out ink, little embossing, cloudy solids (FBI, Flexopedia). Halo width is an estimate; the spatter is set from Simon's French paper bags." },
    litho_stone: { label: "Lithography: drawn on stone or zinc", family: "litho",
        press: { ink: 1.1, pressure: 1, gain: 15, soften: 25, edge: 30, ragged: 0.25, raggedScale: 160, mottle: 0.18, mottleScale: 3500, salt: 0.08, saltScale: 150, speckle: 0.1, scum: 0.04 },
        tone: { carrier: "crayon", grainSize: 150, comp: 0.9 },
        note: "Direct lithography: ink level with the paper, no squeezed rim, soft edges, tone from crayon grain, stipple or spatter (Graphics Atlas; Cumming 1904)." },
    litho_offset: { label: "Offset lithography", family: "litho",
        press: { ink: 0.9, pressure: 1, gain: 10, soften: 14, edge: 18, ragged: 0.12, raggedScale: 90, mottle: 0.1, mottleScale: 2500, speckle: 0.24, hickeys: 0.3 },
        tone: { carrier: "halftone", lpi: 133, dot: "round", minDot: 0.03, maxDot: 0.97 },
        note: "A thin film (1-2 micrometres, Voet 1952) off a rubber blanket: flat, slightly fuzzy dots, occasional hickeys." },
    litho_offset_small: { label: "Small offset (duplicator, instant print)", family: "litho",
        press: { ink: 0.85, pressure: 1, gain: 20, soften: 25, edge: 30, ragged: 0.2, raggedScale: 140, mottle: 0.25, mottleScale: 3000, speckle: 0.12, hickeys: 1.2, specks: 0.15, scum: 0.25, banding: 0.2 },
        tone: { carrier: "halftone", lpi: 85, dot: "round", minDot: 0.06, maxDot: 0.9 },
        note: "Multilith, Rotaprint and instant-print offset from paper or thin metal plates: scumming, uneven inking, hickeys." },
    screen_film: { label: "Screenprint: knife-cut film stencil", family: "screen",
        press: { ink: 1.4, pressure: 1, gain: 40, soften: 60, edge: 20, ragged: 0.3, raggedScale: 320, rim: 0.25, rimWidth: 80, mottle: 0.12, mottleScale: 4000, speckle: 0.12, mesh: 0.5, meshPitch: 205 },
        tone: { carrier: "halftone", lpi: 65, dot: "round", minDot: 0.1, maxDot: 0.85 }, opacity: 0.9,
        note: "A thick paint film (27-41 micrometres wet, from a 1962 coverage figure) through No. 12 silk; knife-cut film gives clean edges (Biegeleisen 1941). Fine speckle and rounded corners set from Simon's screenprint scans." },
    screen_glue: { label: "Screenprint: glue, tusche or paper stencil", family: "screen",
        press: { ink: 1.4, pressure: 1, gain: 50, soften: 55, edge: 25, ragged: 0.5, raggedScale: 260, rim: 0.25, rimWidth: 80, mottle: 0.2, mottleScale: 4000, salt: 0.12, saltScale: 200, speckle: 0.12, mesh: 0.8, meshPitch: 230 },
        tone: { carrier: "threshold" }, opacity: 0.9,
        note: "Glue and tusche stencils leave a ragged, mesh-marked edge and pinholes (Biegeleisen 1941)." },
    pochoir: { label: "Stencil and brush (pochoir, ROSTA, TASS)", family: "screen",
        press: { ink: 1.3, pressure: 1, gain: 0, soften: 80, edge: 60, ragged: 0.35, raggedScale: 600, rim: 0.7, rimWidth: 160, mottle: 0.45, mottleScale: 5000, speckle: 0.1, grain: 0.45, grainAngle: 20 },
        tone: { carrier: "threshold" }, opacity: 0.95,
        note: "Gouache or paint brushed through a cut stencil: a ridge at the stencil edge and bristle traces (Smithsonian Libraries)." },
    gravure: { label: "Rotogravure", family: "intaglio",
        press: { ink: 1.0, pressure: 1, gain: 10, soften: 18, edge: 20, ragged: 0.1, mottle: 0.08, mottleScale: 3000, salt: 0.1, saltScale: 170, speckle: 0.1, banding: 0.1 },
        tone: { carrier: "gravure", lpi: 150, angle: 45, minDot: 0, maxDot: 1 },
        note: "Equal cells of varying depth at 150-175 per inch; type is screened too, so it has a serrated edge (Tarr 1949, Focal 1960)." },
    collotype: { label: "Collotype", family: "screenless",
        press: { ink: 0.9, pressure: 1, gain: 5, soften: 15, edge: 25, mottle: 0.05, speckle: 0.05 },
        tone: { carrier: "collotype", grainSize: 125, minDot: 0, maxDot: 1 },
        note: "Tone in reticulated gelatin, polygons 0.10-0.15 mm across, no screen (Getty Atlas)." },
    woodblock_water: { label: "Woodblock, water-based (Japan)", family: "relief",
        press: { ink: 0.85, pressure: 0.8, gain: 20, soften: 50, edge: 45, ragged: 0.3, raggedScale: 300, rim: 0.15, rimWidth: 120, starve: 0.1, impression: 0.15,
            mottle: 0.4, mottleScale: 6000, salt: 0.15, saltScale: 260, speckle: 0.2, grain: 0.3, grainAngle: 0 },
        tone: { carrier: "contone" }, opacity: 0.1,
        note: "Water-based pigment rubbed in with a baren on soft paper: flat, matt, wood grain showing, gradations wiped by hand." },
    mimeo: { label: "Stencil duplicator (Gestetner, Roneo, mimeograph)", family: "duplicator",
        press: { ink: 0.9, pressure: 1, gain: 60, soften: 50, edge: 40, ragged: 0.6, raggedScale: 120, bleed: 30, halo: 0.5, haloWidth: 450,
            mottle: 0.3, mottleScale: 2500, salt: 0.3, saltScale: 150, speckle: 0.35, banding: 0.3 },
        tone: { carrier: "threshold" },
        note: "Oil ink forced through a typed or drawn wax stencil onto absorbent paper: clotted strokes, an oil halo, filled counters (PSAP; Desborough 1917). Halo width is an estimate." },
    riso: { label: "Risograph (1980s)", family: "duplicator",
        press: { ink: 0.85, pressure: 1, gain: 30, soften: 30, edge: 30, ragged: 0.3, raggedScale: 120, bleed: 15, mottle: 0.2, mottleScale: 3000, salt: 0.15, saltScale: 150, speckle: 0.28, banding: 0.15 },
        tone: { carrier: "grain", grainSize: 110 },
        note: "Riso Kagaku's emulsion-ink stencil duplicator (Risograph 1980, RISO 007 1984). No resolution figure was found for the early machines; the grain is an estimate." },
    spirit: { label: "Spirit duplicator (Banda, Ditto)", family: "duplicator",
        press: { ink: 0.55, pressure: 1, gain: 30, soften: 60, edge: 80, ragged: 0.3, raggedScale: 200, bleed: 50, mottle: 0.35, mottleScale: 4000, salt: 0.1, speckle: 0.12, banding: 0.4 },
        tone: { carrier: "threshold" }, opacity: 0,
        note: "Aniline dye lifted off a master by spirit: purple, fuzzy and ghostly, fading in light (PSAP)." },
    hecto: { label: "Hectograph (gelatin pad)", family: "duplicator",
        press: { ink: 0.5, pressure: 1, gain: 40, soften: 80, edge: 100, ragged: 0.25, raggedScale: 250, bleed: 70, mottle: 0.45, mottleScale: 6000, speckle: 0.08, banding: 0.2 },
        tone: { carrier: "threshold" }, opacity: 0,
        note: "Dye transferred from a gelatin pad: soft violet lines, 20-100 copies, each fainter (PSAP)." },
    xerox_early: { label: "Xerography, early (914 era)", family: "copier",
        press: { ink: 1.0, pressure: 1, gain: 20, soften: 30, edge: 20, ragged: 0.5, raggedScale: 80, mottle: 0.15, salt: 0.15, saltScale: 100, speckle: 0.4, hollow: 0.8, hollowWidth: 500, specks: 0.35 },
        tone: { carrier: "threshold", contrast: 1.6 }, opacity: 1,
        note: "Solids develop only near their edges: 'black or dark adjacent to their edges and light or white at the central areas' (Haloid patent, 1954). The edge band width is an estimate." },
    xerox_late: { label: "Photocopier, 1970s-80s", family: "copier",
        press: { ink: 1.05, pressure: 1, gain: 25, soften: 28, edge: 20, ragged: 0.4, raggedScale: 80, mottle: 0.2, mottleScale: 4000, salt: 0.08, saltScale: 100, speckle: 0.3, hollow: 0.25, hollowWidth: 900, specks: 0.2, banding: 0.15 },
        tone: { carrier: "threshold", contrast: 1.5 }, opacity: 1,
        note: "High contrast with poor middle tones (Nicholson 1989); solids better filled than in the 1960s but still uneven." }
};

// ---------------------------------------------------------------- papers
// rgb: appearance of the bare sheet. tooth: surface roughness (drives salt and edge raggedness). absorb: how far ink
// and oil soak in. spread: paper light-spread length d in micrometres (Ukishima: 41 coated to 83 uncoated; newsprint est.).
// lignin: how fast it yellows. src: "est" or "scan".
const PAPERS = {
    art_white: { label: "Coated art paper", rgb: [247, 244, 236], tooth: 0.05, absorb: 0.1, spread: 41, formation: 0.05, flecks: 0, fibres: 0, lignin: 0.15, show: 0.05, src: "est" },
    art_bright: { label: "Coated art, brightened (after c.1955)", rgb: [250, 250, 251], tooth: 0.05, absorb: 0.1, spread: 41, formation: 0.04, flecks: 0, fibres: 0, lignin: 0.1, show: 0.05, src: "est" },
    imitation_art: { label: "Imitation art (clay-loaded)", rgb: [243, 239, 228], tooth: 0.12, absorb: 0.2, spread: 51, formation: 0.1, flecks: 0, fibres: 0.05, lignin: 0.3, show: 0.1, src: "est" },
    mf_white: { label: "Machine-finished white printing", rgb: [240, 234, 220], tooth: 0.3, absorb: 0.4, spread: 70, formation: 0.2, flecks: 0.05, fibres: 0.15, lignin: 0.45, show: 0.2, src: "est" },
    cartridge: { label: "Offset cartridge", rgb: [244, 240, 229], tooth: 0.35, absorb: 0.45, spread: 83, formation: 0.2, flecks: 0.02, fibres: 0.2, lignin: 0.2, show: 0.1, src: "est" },
    bond_white: { label: "White bond (after c.1955, brightened)", rgb: [247, 247, 246], tooth: 0.3, absorb: 0.4, spread: 83, formation: 0.18, flecks: 0, fibres: 0.12, lignin: 0.1, show: 0.25, src: "est" },
    poster_mg: { label: "Machine-glazed poster paper", rgb: [236, 230, 214], tooth: 0.4, absorb: 0.5, spread: 83, formation: 0.3, flecks: 0.08, fibres: 0.2, lignin: 0.6, show: 0.3, src: "est" },
    poster_thin: { label: "Thin bill paper (cheap, damped)", rgb: [230, 222, 202], tooth: 0.5, absorb: 0.6, spread: 90, formation: 0.4, flecks: 0.15, fibres: 0.3, lignin: 0.8, show: 0.45, src: "est" },
    newsprint: { label: "Newsprint", rgb: [240, 232, 206], tooth: 0.6, absorb: 0.8, spread: 100, formation: 0.4, flecks: 0.3, fibres: 0.35, lignin: 1, show: 0.5, src: "measured: unaged spruce TMP handsheet L* 92.1 a* -0.4 b* 13.6 (Paulsson & Ragauskas 1998)" },
    newsprint_coarse: { label: "Coarse or wartime newsprint", rgb: [222, 212, 186], tooth: 0.75, absorb: 0.85, spread: 110, formation: 0.5, flecks: 0.6, fibres: 0.5, lignin: 1, show: 0.5, src: "est" },
    buff: { label: "Buff programme paper", rgb: [226, 208, 180], tooth: 0.3, absorb: 0.45, spread: 75, formation: 0.25, flecks: 0.08, fibres: 0.2, lignin: 0.6, show: 0.15, src: "scan (Co-Optimists programme, as aged)" },
    cream: { label: "Cream wove", rgb: [240, 231, 212], tooth: 0.28, absorb: 0.4, spread: 75, formation: 0.2, flecks: 0.03, fibres: 0.15, lignin: 0.35, show: 0.15, src: "scan (programme adverts, as aged)" },
    card_white: { label: "White card (tickets, show cards)", rgb: [238, 232, 220], tooth: 0.3, absorb: 0.35, spread: 75, formation: 0.2, flecks: 0.05, fibres: 0.15, lignin: 0.5, show: 0, src: "est" },
    card_orange: { label: "Orange ticket card", rgb: [207, 162, 121], tooth: 0.4, absorb: 0.45, spread: 80, formation: 0.3, flecks: 0.1, fibres: 0.3, lignin: 0.6, show: 0, src: "scan (Palladium ticket 1931, as aged)" },
    card_pink: { label: "Pink ticket card", rgb: [211, 146, 136], tooth: 0.4, absorb: 0.45, spread: 80, formation: 0.3, flecks: 0.1, fibres: 0.35, lignin: 0.6, show: 0, src: "scan (New Theatre ticket 1958, as aged)" },
    tint_yellow: { label: "Yellow bill paper", rgb: [240, 214, 110], tooth: 0.45, absorb: 0.55, spread: 85, formation: 0.3, flecks: 0.1, fibres: 0.25, lignin: 0.7, show: 0.3, src: "est" },
    tint_pink: { label: "Pink bill paper", rgb: [236, 176, 176], tooth: 0.45, absorb: 0.55, spread: 85, formation: 0.3, flecks: 0.1, fibres: 0.25, lignin: 0.7, show: 0.3, src: "est" },
    tint_green: { label: "Green bill paper", rgb: [176, 206, 162], tooth: 0.45, absorb: 0.55, spread: 85, formation: 0.3, flecks: 0.1, fibres: 0.25, lignin: 0.7, show: 0.3, src: "est" },
    tint_blue: { label: "Blue bill paper", rgb: [168, 200, 220], tooth: 0.45, absorb: 0.55, spread: 85, formation: 0.3, flecks: 0.1, fibres: 0.25, lignin: 0.7, show: 0.3, src: "est" },
    tint_orange: { label: "Orange bill paper", rgb: [236, 172, 104], tooth: 0.45, absorb: 0.55, spread: 85, formation: 0.3, flecks: 0.1, fibres: 0.25, lignin: 0.7, show: 0.3, src: "est" },
    kraft: { label: "Brown kraft / manila", rgb: [196, 160, 112], tooth: 0.55, absorb: 0.5, spread: 85, formation: 0.4, flecks: 0.3, fibres: 0.5, lignin: 0.5, show: 0.1, src: "est" },
    bag_white: { label: "Thin white bag paper", rgb: [234, 230, 222], tooth: 0.35, absorb: 0.6, spread: 85, formation: 0.45, flecks: 0.05, fibres: 0.3, lignin: 0.4, show: 0.7, src: "scan (French postcard bags)" },
    showcard: { label: "Show-card board", rgb: [240, 236, 226], tooth: 0.25, absorb: 0.3, spread: 75, formation: 0.12, flecks: 0.02, fibres: 0.1, lignin: 0.4, show: 0, src: "est" },
    dupl: { label: "Duplicator paper (absorbent)", rgb: [236, 232, 220], tooth: 0.55, absorb: 0.9, spread: 95, formation: 0.3, flecks: 0.1, fibres: 0.3, lignin: 0.7, show: 0.35, src: "est" },
    copier: { label: "Copier bond", rgb: [246, 246, 244], tooth: 0.3, absorb: 0.3, spread: 83, formation: 0.15, flecks: 0, fibres: 0.1, lignin: 0.1, show: 0.2, src: "est" },
    electrofax: { label: "Zinc-oxide copy paper (Electrofax)", rgb: [226, 226, 220], tooth: 0.1, absorb: 0.1, spread: 45, formation: 0.05, flecks: 0, fibres: 0, lignin: 0.3, show: 0, src: "est" },
    gravure_sc: { label: "Supercalendered gravure paper", rgb: [238, 232, 216], tooth: 0.15, absorb: 0.5, spread: 70, formation: 0.2, flecks: 0.08, fibres: 0.1, lignin: 0.8, show: 0.4, src: "est" },
    washi: { label: "Japanese hosho / washi", rgb: [240, 232, 214], tooth: 0.5, absorb: 0.8, spread: 95, formation: 0.4, flecks: 0.05, fibres: 0.7, lignin: 0.15, show: 0.3, src: "est" },
    senka: { label: "Senka-shi (rough recycled, Japan 1940s)", rgb: [198, 188, 166], tooth: 0.8, absorb: 0.85, spread: 110, formation: 0.55, flecks: 0.8, fibres: 0.6, lignin: 1, show: 0.4, src: "est" },
    badami: { label: "Badami (half-bleached, India)", rgb: [222, 200, 160], tooth: 0.6, absorb: 0.7, spread: 95, formation: 0.45, flecks: 0.3, fibres: 0.4, lignin: 0.9, show: 0.3, src: "est from Stark's description" },
    soviet_poster: { label: "Soviet poster / letterpress paper", rgb: [226, 218, 198], tooth: 0.45, absorb: 0.6, spread: 90, formation: 0.35, flecks: 0.2, fibres: 0.3, lignin: 0.9, show: 0.3, src: "est from GOST 9095-73 whiteness 63-78%" },
    map_litho: { label: "Map litho / smooth litho printing", rgb: [244, 240, 228], tooth: 0.2, absorb: 0.3, spread: 60, formation: 0.12, flecks: 0.02, fibres: 0.08, lignin: 0.3, show: 0.1, src: "est" },
    white: { label: "Plain white (no character)", rgb: [255, 255, 255], tooth: 0.2, absorb: 0.3, spread: 60, formation: 0, flecks: 0, fibres: 0, lignin: 0.2, show: 0, src: "est" }
};

// ---------------------------------------------------------------- inks
// rgb: the solid on white paper at normal film. o: opacity (0 = a dye or glaze, 1 = covers what is underneath).
// fade: how fugitive (0 stable .. 1 goes quickly). to: what it ages towards ("paper" = bleaches, or an rgb it shifts to).
const sw = (L, a, b) => C.labToSrgb(L, a, b);
const INKS = {
    black: { label: "Job black (blue-toned carbon)", rgb: [28, 27, 31], o: 0.35, fade: 0, src: "est; 'a black ink is really a blue-black' (Wiborg 1926)" },
    black_news: { label: "News black", rgb: [54, 52, 51], o: 0.3, fade: 0, src: "scan (newspaper cuttings)" },
    black_dense: { label: "Dense poster black", rgb: [20, 19, 20], o: 0.5, fade: 0, src: "est" },
    bronze_blue: { label: "Bronze / Prussian blue", rgb: [26, 46, 98], o: 0.2, fade: 0.15, to: [40, 70, 80], src: "est" },
    milori_blue: { label: "Milori blue (lighter iron blue)", rgb: [34, 78, 148], o: 0.2, fade: 0.15, to: [60, 100, 110], src: "est" },
    ultramarine: { label: "Ultramarine", rgb: [44, 56, 152], o: 0.35, fade: 0.1, to: "paper", src: "est" },
    royal_blue: { label: "Poster blue", rgb: [36, 72, 150], o: 0.3, fade: 0.2, to: "paper", src: "scan (Schweppes and Palladium programme blues)" },
    sky_blue: { label: "Light blue", rgb: [104, 164, 206], o: 0.4, fade: 0.2, to: "paper", src: "scan (Theatre Workshop cover)" },
    process_blue_early: { label: "Process blue (greenish iron blue, to c.1935)", rgb: [22, 112, 158], o: 0.1, fade: 0.2, to: [60, 120, 120], src: "est from Zander 1896" },
    cyan: { label: "Process cyan (phthalocyanine, after 1935)", rgb: sw(54.7, -36.9, -40.0), o: 0.05, fade: 0, src: "measured: SWOP 1993 press test (CGATS.6)" },
    ochre: { label: "Yellow ochre", rgb: [198, 150, 62], o: 0.6, fade: 0.05, src: "est" },
    vermilion: { label: "Vermilion", rgb: [222, 64, 38], o: 0.7, fade: 0.4, to: [120, 52, 44], src: "est" },
    red_lead: { label: "Red lead (orange-red)", rgb: [228, 92, 40], o: 0.7, fade: 0.3, to: [120, 70, 50], src: "est" },
    poster_red: { label: "Poster red (para / lithol)", rgb: [204, 32, 40], o: 0.3, fade: 0.55, to: "paper", src: "est" },
    scarlet_lake: { label: "Scarlet lake", rgb: [212, 40, 52], o: 0.15, fade: 0.6, to: "paper", src: "est" },
    crimson: { label: "Crimson (madder / alizarin lake)", rgb: [176, 26, 58], o: 0.1, fade: 0.2, to: "paper", src: "est" },
    geranium: { label: "Geranium (eosin) lake", rgb: [232, 60, 104], o: 0.1, fade: 0.9, to: "paper", src: "est" },
    carmine_pink: { label: "Programme pink-red", rgb: [214, 84, 130], o: 0.15, fade: 0.6, to: "paper", src: "scan (Drury Lane programme)" },
    process_red_early: { label: "Process red (madder lake, to c.1935)", rgb: [200, 34, 60], o: 0.08, fade: 0.25, to: "paper", src: "est from Zander 1896: 'neither a purple nor an orange'" },
    magenta: { label: "Process magenta (rubine / rhodamine)", rgb: sw(46.2, 70.0, -1.5), o: 0.05, fade: 0.25, to: "paper", src: "measured: SWOP 1993 press test" },
    magenta_bright: { label: "Bright magenta (1960s-80s spot)", rgb: [218, 70, 172], o: 0.1, fade: 0.4, to: "paper", src: "scan (Barbican 1983, Mermaid Theatre)" },
    chrome_yellow: { label: "Chrome yellow", rgb: [242, 190, 28], o: 0.75, fade: 0.4, to: [176, 140, 44], src: "est" },
    lemon_yellow: { label: "Lemon chrome", rgb: [246, 214, 44], o: 0.7, fade: 0.4, to: [190, 160, 60], src: "est" },
    chrome_orange: { label: "Chrome orange", rgb: [236, 122, 28], o: 0.75, fade: 0.35, to: [150, 90, 40], src: "est" },
    yellow: { label: "Process yellow (diarylide)", rgb: sw(84.6, -5.1, 84.7), o: 0.05, fade: 0.3, to: "paper", src: "measured: SWOP 1993 press test" },
    chrome_green: { label: "Chrome green", rgb: [44, 112, 64], o: 0.6, fade: 0.3, to: [60, 90, 70], src: "est" },
    bronze_green: { label: "Bronze green", rgb: [52, 76, 46], o: 0.4, fade: 0.2, to: [60, 70, 50], src: "est" },
    emerald: { label: "Phthalocyanine green", rgb: [0, 128, 92], o: 0.1, fade: 0, src: "est" },
    indian_red: { label: "Indian red", rgb: [150, 60, 46], o: 0.7, fade: 0, src: "est" },
    brown: { label: "Sepia brown", rgb: [88, 58, 40], o: 0.4, fade: 0.05, src: "est" },
    gravure_brown: { label: "Gravure brown", rgb: [72, 50, 38], o: 0.05, fade: 0.1, to: "paper", src: "est; 'principally ... shades of brown' (Wiborg 1926)" },
    gravure_green: { label: "Gravure green-black", rgb: [42, 62, 54], o: 0.05, fade: 0.1, to: "paper", src: "est" },
    gravure_blue: { label: "Gravure blue", rgb: [42, 64, 112], o: 0.05, fade: 0.2, to: "paper", src: "est" },
    violet: { label: "Methyl violet", rgb: [96, 46, 142], o: 0.05, fade: 0.85, to: "paper", src: "est" },
    purple: { label: "Programme purple", rgb: [112, 70, 124], o: 0.15, fade: 0.6, to: "paper", src: "scan (Co-Optimists programme)" },
    gold: { label: "Gold bronze", rgb: [168, 132, 62], o: 1, fade: 0.5, to: [112, 96, 56], src: "est" },
    silver: { label: "Aluminium silver", rgb: [176, 176, 170], o: 1, fade: 0.2, to: [150, 150, 146], src: "est" },
    white: { label: "Opaque white", rgb: [246, 244, 238], o: 0.95, fade: 0, src: "est" },
    dayglo_orange: { label: "Day-Glo fire orange", rgb: [255, 98, 30], o: 0.5, fade: 1, to: [236, 190, 150], src: "est (fluorescence cannot be shown)" },
    dayglo_red: { label: "Day-Glo neon red", rgb: [255, 52, 96], o: 0.5, fade: 1, to: [240, 180, 170], src: "est" },
    dayglo_pink: { label: "Day-Glo pink (later colour)", rgb: [255, 70, 168], o: 0.5, fade: 1, to: [240, 190, 200], src: "est" },
    dayglo_yellow: { label: "Day-Glo saturn yellow", rgb: [238, 255, 44], o: 0.5, fade: 1, to: [236, 232, 170], src: "est" },
    dayglo_arc: { label: "Day-Glo arc yellow", rgb: [255, 196, 24], o: 0.5, fade: 1, to: [238, 214, 160], src: "est; named in the 1949 Day-Glo leaflet" },
    dayglo_green: { label: "Day-Glo signal green", rgb: [70, 232, 64], o: 0.5, fade: 1, to: [190, 220, 170], src: "est" },
    spirit_violet: { label: "Spirit duplicator violet", rgb: [104, 62, 164], o: 0, fade: 1, to: "paper", src: "est: 'most often purple (crystal violet)' (PSAP)" },
    spirit_green: { label: "Spirit duplicator green", rgb: [44, 132, 96], o: 0, fade: 1, to: "paper", src: "est" },
    spirit_red: { label: "Spirit duplicator red", rgb: [206, 60, 76], o: 0, fade: 1, to: "paper", src: "est" },
    mimeo_black: { label: "Duplicator black (oil ink)", rgb: [44, 44, 48], o: 0.3, fade: 0, src: "est" },
    mimeo_blue: { label: "Duplicator blue", rgb: [44, 62, 134], o: 0.2, fade: 0.3, to: "paper", src: "est" },
    toner: { label: "Toner", rgb: [34, 34, 34], o: 1, fade: 0, src: "est; fused toner density about 0.9-1.3 (NBSIR 74-498)" },
    riso_red: { label: "Riso red", rgb: [228, 72, 68], o: 0.1, fade: 0.3, to: "paper", src: "est" },
    riso_blue: { label: "Riso blue", rgb: [44, 90, 170], o: 0.1, fade: 0.2, to: "paper", src: "est" },
    // screen and stencil colours (opaque paints)
    sp_red: { label: "Screen red", rgb: [218, 46, 50], o: 0.9, fade: 0.3, to: "paper", src: "est" },
    sp_blue: { label: "Screen blue", rgb: [40, 84, 162], o: 0.9, fade: 0.1, src: "est" },
    sp_navy: { label: "Screen navy", rgb: [74, 86, 131], o: 0.9, fade: 0.1, src: "scan (screenprint book)" },
    sp_yellow: { label: "Screen yellow", rgb: [248, 195, 64], o: 0.85, fade: 0.2, to: [200, 170, 80], src: "scan (screenprint book)" },
    sp_green: { label: "Screen green", rgb: [104, 170, 102], o: 0.9, fade: 0.1, src: "scan (screenprint book)" },
    sp_pink: { label: "Screen pink", rgb: [234, 172, 184], o: 0.9, fade: 0.3, to: "paper", src: "scan (screenprint book)" },
    sp_mint: { label: "Screen mint", rgb: [150, 206, 188], o: 0.9, fade: 0.2, src: "scan (screenprint book)" },
    sp_black: { label: "Screen black", rgb: [26, 26, 26], o: 1, fade: 0, src: "est" },
    // Japanese woodblock colourants
    sumi: { label: "Sumi black", rgb: [38, 36, 36], o: 0.3, fade: 0, src: "est" },
    beni: { label: "Beni (safflower red)", rgb: [204, 74, 96], o: 0.05, fade: 0.8, to: "paper", src: "est" },
    bero: { label: "Bero-ai (Prussian blue)", rgb: [38, 72, 132], o: 0.1, fade: 0.15, src: "est" },
    gamboge: { label: "Gamboge / orpiment yellow", rgb: [232, 192, 64], o: 0.2, fade: 0.4, to: "paper", src: "est" },
    carmine_jp: { label: "Cochineal carmine (main red from 1869)", rgb: [196, 30, 58], o: 0.08, fade: 0.5, to: "paper", src: "est colour; pigment and date from Cesaratto et al., Heritage Science 2018" },
    ai_indigo: { label: "Ai (indigo)", rgb: [52, 76, 108], o: 0.1, fade: 0.4, to: "paper", src: "est colour; named as a colourant in the report" },
    aigami: { label: "Aigami (dayflower blue)", rgb: [96, 132, 184], o: 0.05, fade: 0.95, to: [196, 186, 150], src: "est colour; named as a colourant in the report; very fugitive" },
    aniline_red: { label: "Rosaniline magenta (from 1864)", rgb: [216, 32, 62], o: 0.05, fade: 0.7, to: "paper", src: "est; rosaniline from 1864, eosin 1877 (Heritage Science 2018)" },
    aniline_purple: { label: "Aniline purple (methyl violet, from 1875)", rgb: [110, 52, 140], o: 0.05, fade: 0.85, to: "paper", src: "est" },
    jp_green: { label: "Woodblock green", rgb: [70, 124, 86], o: 0.15, fade: 0.3, to: "paper", src: "est" },
    // India: Sivakasi six-colour set (two blues, two reds, yellow, black: Jain)
    sk_light_blue: { label: "Sivakasi light blue", rgb: [70, 156, 214], o: 0.1, fade: 0.2, to: "paper", src: "est" },
    sk_pink: { label: "Sivakasi pink (light red)", rgb: [240, 112, 152], o: 0.1, fade: 0.5, to: "paper", src: "est" },
    // Soviet
    soviet_red: { label: "Soviet poster red", rgb: [206, 36, 30], o: 0.35, fade: 0.4, to: "paper", src: "est" }
};

// Ink sets: what a printer of that kind would have had on the shelf. Layer colours can be snapped to the nearest.
// process: [yellow, red/magenta, blue/cyan, black] for picture separation.
const INKSETS = {
    jobbing_uk: { label: "British jobbing printer", inks: ["black", "poster_red", "royal_blue", "bronze_blue", "chrome_green", "chrome_yellow", "brown", "purple"], process: ["chrome_yellow", "poster_red", "royal_blue", "black"] },
    bill_two: { label: "Bill colours: black, red, blue", inks: ["black_dense", "poster_red", "royal_blue"], process: ["chrome_yellow", "poster_red", "royal_blue", "black_dense"] },
    victorian: { label: "Victorian inorganic (to c.1900)", inks: ["black", "vermilion", "bronze_blue", "ultramarine", "chrome_yellow", "chrome_green", "indian_red", "red_lead", "gold"], process: ["chrome_yellow", "vermilion", "bronze_blue", "black"] },
    chromo: { label: "Chromolithographer's stones", inks: ["black", "vermilion", "crimson", "geranium", "bronze_blue", "milori_blue", "chrome_yellow", "lemon_yellow", "chrome_green", "brown", "gold"], process: ["chrome_yellow", "crimson", "milori_blue", "black"] },
    poster_litho_uk: { label: "British poster litho, 1920s-50s", inks: ["black", "poster_red", "vermilion", "chrome_orange", "chrome_yellow", "lemon_yellow", "milori_blue", "ultramarine", "sky_blue", "chrome_green", "bronze_green", "brown", "indian_red"], process: ["lemon_yellow", "poster_red", "milori_blue", "black"] },
    process_early: { label: "Three- and four-colour process, 1893-c.1935", inks: ["lemon_yellow", "process_red_early", "process_blue_early", "black"], process: ["lemon_yellow", "process_red_early", "process_blue_early", "black"] },
    process_late: { label: "Process inks, 1950s-80s", inks: ["yellow", "magenta", "cyan", "black"], process: ["yellow", "magenta", "cyan", "black"] },
    spot_60s: { label: "1960s-80s spot colours", inks: ["black_dense", "magenta_bright", "sky_blue", "royal_blue", "vermilion", "chrome_orange", "lemon_yellow", "emerald", "brown", "silver"], process: ["yellow", "magenta", "cyan", "black"] },
    dayglo: { label: "Day-Glo bill (from 1950 in Britain)", inks: ["black_dense", "royal_blue", "dayglo_orange", "dayglo_red", "dayglo_pink", "dayglo_arc", "dayglo_yellow", "dayglo_green"], process: ["dayglo_yellow", "dayglo_red", "royal_blue", "black_dense"] },
    screen: { label: "Screen poster colours", inks: ["sp_black", "sp_red", "sp_blue", "sp_navy", "sp_yellow", "sp_green", "sp_pink", "sp_mint", "white"], process: ["sp_yellow", "sp_red", "sp_blue", "sp_black"] },
    gravure: { label: "Gravure monochromes", inks: ["gravure_brown", "gravure_green", "gravure_blue", "black"], process: ["yellow", "magenta", "cyan", "black"] },
    news: { label: "Newspaper", inks: ["black_news", "poster_red", "royal_blue"], process: ["chrome_yellow", "poster_red", "royal_blue", "black_news"] },
    comic_us: { label: "US comic book (yellow, red, blue, black)", inks: ["lemon_yellow", "scarlet_lake", "process_blue_early", "black_news"], process: ["lemon_yellow", "scarlet_lake", "process_blue_early", "black_news"] },
    duplicator: { label: "Duplicator inks", inks: ["mimeo_black", "mimeo_blue", "poster_red", "chrome_green"], process: ["chrome_yellow", "poster_red", "mimeo_blue", "mimeo_black"] },
    spirit: { label: "Spirit masters", inks: ["spirit_violet", "spirit_green", "spirit_red"], process: ["chrome_yellow", "spirit_red", "spirit_violet", "spirit_violet"] },
    toner: { label: "Toner", inks: ["toner"], process: ["toner", "toner", "toner", "toner"] },
    riso: { label: "Riso drums", inks: ["mimeo_black", "riso_red", "riso_blue", "emerald", "brown"], process: ["chrome_yellow", "riso_red", "riso_blue", "mimeo_black"] },
    japan_edo: { label: "Japanese woodblock, to the 1860s", inks: ["sumi", "beni", "ai_indigo", "aigami", "bero", "gamboge", "jp_green"], process: ["gamboge", "beni", "bero", "sumi"], src: "beni, indigo, dayflower and Prussian blue are named in the report; the yellow and green are estimates" },
    japan_meiji: { label: "Japanese woodblock and litho, Meiji", inks: ["sumi", "carmine_jp", "vermilion", "aniline_red", "aniline_purple", "bero", "gamboge", "jp_green", "gold"], process: ["gamboge", "carmine_jp", "bero", "sumi"], src: "reds and purples from Cesaratto et al. 2018; yellow and green are estimates" },
    sivakasi: { label: "Sivakasi six-colour offset", inks: ["black", "poster_red", "sk_pink", "bronze_blue", "sk_light_blue", "lemon_yellow"], process: ["lemon_yellow", "poster_red", "sk_light_blue", "black"] },
    soviet: { label: "Soviet poster (estimated palette)", inks: ["black_dense", "soviet_red", "royal_blue", "chrome_yellow", "chrome_green", "brown"], process: ["chrome_yellow", "soviet_red", "royal_blue", "black_dense"], src: "est: no Soviet ink standard or poster palette was found" },
    plakatstil: { label: "German flat-colour litho (estimated palette)", inks: ["black_dense", "vermilion", "chrome_orange", "chrome_yellow", "ochre", "ultramarine", "bronze_green", "brown"], process: ["chrome_yellow", "vermilion", "ultramarine", "black_dense"] },
    typo_red_black: { label: "New Typography: red and black", inks: ["black_dense", "vermilion"], process: ["chrome_yellow", "vermilion", "royal_blue", "black_dense"] }
};

// ---------------------------------------------------------------- full settings
const BASE = {
    process: "letterpress_job",
    press: Object.assign({}, PRESS0),
    tone: Object.assign({}, TONE0),
    colour: { pictures: "single", spotCount: 4, inkMode: "layer", inkset: "jobbing_uk", single: "auto", second: "poster_red", order: "stack", overlaps: "knockout_k", trap: 60, opacity: -1, gcr: 0.6, angles: "us1975", wet: 1 },
    register: { error: 0.15, stretch: 0.2, rotate: 0.01 },
    paper: { source: "stock", stock: "mf_white", colour: "", tooth: -1, texture: 0.6, fibres: 0.5, flecks: 0.5, showThrough: 0, layerStrength: 1 },
    age: { yellow: 0, edges: 0, foxing: 0, fade: 0, folds: 0, wear: 0, dirt: 0, setoff: 0, oil: 0 },
    scale: 1, seed: 1
};
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; merge(a[k], b[k]); } else a[k] = b[k]; } return a; }
// A look is { process, press:{..overrides}, tone:{}, colour:{}, register:{}, paper:{}, age:{} }. Process defaults go in first.
function assemble(look) {
    const s = deep(BASE), p = PROCESSES[look.process] || PROCESSES.letterpress_job;
    s.process = PROCESSES[look.process] ? look.process : "letterpress_job";
    merge(s.press, p.press); merge(s.tone, p.tone || {});
    if (p.opacity !== undefined) s.colour.opacity = p.opacity;
    for (const k of ["press", "tone", "colour", "register", "paper", "age"]) if (look[k]) merge(s[k], deep(look[k]));
    if (look.scale) s.scale = look.scale;
    return s;
}
// Switching process on the panel: replace press and tone with the new process's defaults, keep everything else.
function applyProcess(s, id) {
    const p = PROCESSES[id]; if (!p) return s;
    s.process = id; s.press = merge(Object.assign({}, PRESS0), p.press); s.tone = merge(Object.assign({}, TONE0), p.tone || {});
    s.colour.opacity = p.opacity !== undefined ? p.opacity : -1;
    return s;
}
function ink(id) { return INKS[id] || INKS.black; }
function nearestInk(rgb, setId) {
    const set = INKSETS[setId] || INKSETS.jobbing_uk, a = C.linToLabish(C.rgbLin(rgb)); let best = set.inks[0], bd = 1e9;
    for (const id of set.inks) { const b = C.linToLabish(C.rgbLin(INKS[id].rgb)), d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; if (d < bd) { bd = d; best = id; } }
    return best;
}

module.exports = { PRESS0, TONE0, PROCESSES, PAPERS, INKS, INKSETS, BASE, assemble, applyProcess, ink, nearestInk, deep, merge };
