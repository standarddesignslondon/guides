// FilmLook presets: building blocks (process, format, lens, condition, tint)
// and film presets that combine them. Shared by the UXP panel and Node tests.

(function (root) {
"use strict";

// Identity-ish sensitivities and a typical chromogenic print dye set.
const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const DYE_EASTMAN = [[1, 0.14, 0.06], [0.06, 1, 0.36], [0, 0.09, 1]];
const DYE_PURE = [[1, 0.06, 0.02], [0.02, 1, 0.16], [0, 0.03, 1]];

// ---------------------------------------------------------------- processes
const PROCESSES = {
    // ---- black & white
    bw_ortho: {
        label: "B&W orthochromatic (1910s-20s)", group: "Black & white",
        note: "Blind to red: reds and lips print near-black, blue skies go white. Silent-era release prints, usually several generations from the negative.",
        p: { mode: "bw", bwWeights: [0.02, 0.40, 0.58], contrast: 1.35, dmin: 0.08, dmax: 2.2, latitude: 1.1,
             grainRms: 0.034, grainClumpMm: 0.014, grainColor: 0 }
    },
    bw_early_pan: {
        label: "B&W early panchromatic (1925-35)", group: "Black & white",
        note: "Red-sensitive but still blue-heavy: skies pale, skin a little dark and luminous.",
        p: { mode: "bw", bwWeights: [0.2, 0.38, 0.42], contrast: 1.3, dmin: 0.07, dmax: 2.4, latitude: 1.05,
             grainRms: 0.030, grainClumpMm: 0.013 }
    },
    bw_studio_pan: {
        label: "B&W studio panchromatic (1935-55)", group: "Black & white",
        note: "Classic Hollywood / Plus-X-type rendering: full grey scale, fine grain, deep but open blacks.",
        p: { mode: "bw", bwWeights: [0.29, 0.5, 0.21], contrast: 1.3, dmin: 0.05, dmax: 2.7, latitude: 1.0,
             grainRms: 0.024, grainClumpMm: 0.011 }
    },
    bw_fast_pan: {
        label: "B&W fast panchromatic (1955-80)", group: "Black & white",
        note: "Double-X / Tri-X-type fast stock: livelier grain, slightly harder contrast.",
        p: { mode: "bw", bwWeights: [0.3, 0.48, 0.22], contrast: 1.35, dmin: 0.05, dmax: 2.7, latitude: 1.0,
             grainRms: 0.034, grainClumpMm: 0.014 }
    },
    bw_pushed: {
        label: "B&W fast stills film, pushed (Nouvelle Vague)", group: "Black & white",
        note: "Fast still-camera film pushed a stop: coarse lively grain, greyish blacks in available light, abrupt highlight clipping.",
        p: { mode: "bw", bwWeights: [0.31, 0.47, 0.22], contrast: 1.2, push: 1, dmin: 0.06, dmax: 2.3, latitude: 1.05,
             grainRms: 0.040, grainClumpMm: 0.016 }
    },
    bw_newsreel: {
        label: "B&W newsreel / duplicate", group: "Black & white",
        note: "Contrasty multi-generation duplicate: harsh, grainy, blocked blacks.",
        p: { mode: "bw", bwWeights: [0.3, 0.48, 0.22], contrast: 1.6, dmin: 0.08, dmax: 2.3, latitude: 0.9,
             grainRms: 0.040, grainClumpMm: 0.016, generations: 2 }
    },
    bw_pathe_baby: {
        label: "B&W home movie reversal (9.5mm / 16mm, 1920s-50s)", group: "Black & white",
        note: "Reversal home-movie stock: bright, contrasty, slightly warm-black base.",
        p: { mode: "bw", bwWeights: [0.24, 0.45, 0.31], contrast: 1.45, dmin: 0.1, dmax: 2.4, latitude: 0.9,
             grainRms: 0.036, grainClumpMm: 0.012, tone: [0.92, 0.98, 1.1], toneAmount: 0.6 }
    },

    // ---- colour
    tech_2strip: {
        label: "Technicolor two-colour (1922-35)", group: "Colour",
        note: "Only two records: red-orange and blue-green. Skin goes peach-orange, skies and foliage turn teal, no true yellow or violet.",
        p: { mode: "color", sens: [[0.92, 0.08, 0], [0.04, 0.62, 0.34], [0.04, 0.62, 0.34]],
             dye: [[1, 0.22, 0.08], [0.08, 0.86, 0.74], [0, 0, 0]], saturation: 1.1, contrast: 1.3,
             dmin: 0.06, dmax: 2.4, grainRms: 0.022, grainClumpMm: 0.010, grainColor: 0.3 }
    },
    tech_3strip: {
        label: "Technicolor three-strip dye transfer (1935-55)", group: "Colour",
        note: "Three B&W separation negatives printed by dye imbibition: pure, dense, saturated primaries with no colour grain.",
        p: { mode: "color", sens: I3, dye: DYE_PURE, saturation: 1.28, contrast: 1.3, dmin: 0.05, dmax: 3.0,
             grainRms: 0.018, grainClumpMm: 0.009, grainColor: 0.15 }
    },
    eastman_50s: {
        label: "Early Eastmancolor negative (1950s)", group: "Colour",
        note: "Single-strip chromogenic negative: softer, warmer, a little less saturated than three-strip.",
        p: { mode: "color", sens: [[0.94, 0.05, 0.01], [0.04, 0.92, 0.04], [0.01, 0.06, 0.93]], dye: DYE_EASTMAN,
             saturation: 1.02, contrast: 1.2, dmin: 0.06, dmax: 2.7, timing: [4, 0, -4],
             grainRms: 0.028, grainClumpMm: 0.012, grainColor: 0.5 }
    },
    eastman_ib: {
        label: "Eastmancolor neg + Technicolor IB print (1955-75)", group: "Colour",
        note: "The classic 'Color by Technicolor' of the 50s-70s: chromogenic negative, dye-transfer print. Rich, dense, clean blacks.",
        p: { mode: "color", sens: I3, dye: [[1, 0.07, 0.03], [0.03, 1, 0.2], [0, 0.04, 1]],
             saturation: 1.15, contrast: 1.25, dmin: 0.05, dmax: 3.0,
             grainRms: 0.026, grainClumpMm: 0.011, grainColor: 0.45 }
    },
    eastman_60s: {
        label: "Eastman 50-speed negative, Eastman print (1962-68)", group: "Colour",
        note: "Slow, fine-grained colour negative of the 60s (DeLuxe, Metrocolor prints): clean and natural.",
        p: { mode: "color", sens: I3, dye: DYE_EASTMAN, saturation: 1.05, contrast: 1.2, dmin: 0.05, dmax: 2.8,
             grainRms: 0.022, grainClumpMm: 0.010, grainColor: 0.5 }
    },
    eastman_100t: {
        label: "Eastman 100-speed negative (1968-74)", group: "Colour",
        note: "The first faster colour negative: grainier and a touch muted, the look of early-70s New Hollywood.",
        p: { mode: "color", sens: [[0.95, 0.04, 0.01], [0.04, 0.93, 0.03], [0.01, 0.05, 0.94]], dye: DYE_EASTMAN,
             saturation: 0.95, contrast: 1.15, dmin: 0.06, dmax: 2.7, latitude: 1.08,
             grainRms: 0.032, grainClumpMm: 0.013, grainColor: 0.55 }
    },
    eastman_late70s: {
        label: "Eastman improved 100-speed negative (1974-83)", group: "Colour",
        note: "Late-70s colour negative: fuller colour and finer grain than the early 100-speed stock.",
        p: { mode: "color", sens: I3, dye: DYE_EASTMAN, saturation: 1.02, contrast: 1.2, dmin: 0.05, dmax: 2.8,
             grainRms: 0.028, grainClumpMm: 0.012, grainColor: 0.55 }
    },
    sovcolor: {
        label: "Sovcolor / ORWO-type (Agfa lineage)", group: "Colour",
        note: "Eastern-bloc chromogenic stock: muted, earthy, less clean dye separation. Approximation.",
        p: { mode: "color", sens: [[0.86, 0.12, 0.02], [0.08, 0.84, 0.08], [0.02, 0.14, 0.84]],
             dye: [[1, 0.2, 0.1], [0.1, 1, 0.45], [0.02, 0.15, 1]], saturation: 0.86, contrast: 1.15,
             dmin: 0.09, dmax: 2.4, timing: [0, 2, -2], grainRms: 0.032, grainClumpMm: 0.013, grainColor: 0.6 }
    },
    kodachrome: {
        label: "Kodachrome reversal (8mm / 16mm / slides)", group: "Colour",
        note: "Deep blacks, rich reds and blues, narrow latitude, very fine grain.",
        p: { mode: "color", sens: I3, dye: [[1, 0.05, 0.02], [0.03, 1, 0.22], [0, 0.02, 1]],
             saturation: 1.28, contrast: 1.45, dmin: 0.07, dmax: 3.2, latitude: 0.85, timing: [2, 0, -2],
             grainRms: 0.020, grainClumpMm: 0.009, grainColor: 0.4 }
    },
    ektachrome: {
        label: "Ektachrome reversal (Super 8 / 16mm, 1970s)", group: "Colour",
        note: "Cooler, bluer reversal with lighter blacks and busier grain.",
        p: { mode: "color", sens: I3, dye: [[1, 0.12, 0.08], [0.02, 1, 0.25], [0, 0.05, 1]],
             saturation: 1.05, contrast: 1.35, dmin: 0.08, dmax: 2.7, latitude: 0.9, timing: [-4, -2, 6],
             grainRms: 0.036, grainClumpMm: 0.013, grainColor: 0.6 }
    },
    faded_print: {
        label: "Faded Eastmancolor print (magenta shift)", group: "Colour",
        note: "A 1970s release print decades later: cyan and yellow dyes gone, leaving pink-magenta and weak blacks.",
        p: { mode: "color", sens: I3, dye: DYE_EASTMAN, fade: [0.66, 1.0, 0.82], saturation: 0.9, contrast: 1.05,
             dmin: 0.07, dmax: 2.3, grainRms: 0.032, grainClumpMm: 0.013, grainColor: 0.55, generations: 1 }
    },
    bleach_bypass: {
        label: "Colour negative, silver retained (bleach bypass)", group: "Colour",
        note: "Silver left in the print: desaturated, harder contrast, dense blacks, metallic sheen.",
        p: { mode: "color", sens: I3, dye: DYE_EASTMAN, saturation: 1.0, contrast: 1.3, dmin: 0.05, dmax: 2.9,
             bleach: 0.6, grainRms: 0.030, grainClumpMm: 0.012, grainColor: 0.5 }
    }
};

// ---------------------------------------------------------------- formats
const FORMATS = {
    silent35:   { label: "35mm silent, full aperture 1.33", p: { gateMm: 24.9, squeeze: 1, lpmm: 26, aspect: 1.33, corner: 0.035, gateSoft: 0.006 } },
    academy:    { label: "35mm Academy 1.37", p: { gateMm: 22.0, squeeze: 1, lpmm: 32, aspect: 1.37, corner: 0.012, gateSoft: 0.004 } },
    flat166:    { label: "35mm flat 1.66 (European)", p: { gateMm: 22.0, squeeze: 1, lpmm: 34, aspect: 1.66, corner: 0.008, gateSoft: 0.003 } },
    flat185:    { label: "35mm flat 1.85", p: { gateMm: 22.0, squeeze: 1, lpmm: 34, aspect: 1.85, corner: 0.008, gateSoft: 0.003 } },
    vista:      { label: "VistaVision (8-perf) 1.85", p: { gateMm: 37.7, squeeze: 1, lpmm: 38, aspect: 1.85, corner: 0.006, gateSoft: 0.003 } },
    scope:      { label: "35mm anamorphic (CinemaScope / Panavision) 2.35", p: { gateMm: 21.95, squeeze: 2, lpmm: 30, aspect: 2.35, corner: 0.008, gateSoft: 0.003 } },
    sovscope:   { label: "Sovscope anamorphic 2.35", p: { gateMm: 21.95, squeeze: 2, lpmm: 26, aspect: 2.35, corner: 0.008, gateSoft: 0.003 } },
    techniscope:{ label: "Techniscope 2-perf 2.35", p: { gateMm: 22.0, squeeze: 1, lpmm: 30, aspect: 2.35, corner: 0.008, gateSoft: 0.003, generations: 0.5 } },
    wide70:     { label: "65mm / 70mm (Todd-AO, Super Panavision 70) 2.20", p: { gateMm: 52.5, squeeze: 1, lpmm: 36, aspect: 2.2, corner: 0.005, gateSoft: 0.002 } },
    wide70_185: { label: "65mm framed ~1.70-1.85 (Playtime)", p: { gateMm: 52.5, squeeze: 1, lpmm: 36, aspect: 1.78, corner: 0.005, gateSoft: 0.002 } },
    s16:        { label: "16mm 1.37", p: { gateMm: 10.26, squeeze: 1, lpmm: 30, aspect: 1.37, corner: 0.02, gateSoft: 0.006 } },
    pathe95:    { label: "9.5mm Pathé Baby 1.33", p: { gateMm: 8.2, squeeze: 1, lpmm: 22, aspect: 1.33, corner: 0.05, gateSoft: 0.012 } },
    reg8:       { label: "Regular 8mm 1.33", p: { gateMm: 4.8, squeeze: 1, lpmm: 22, aspect: 1.33, corner: 0.07, gateSoft: 0.014 } },
    super8:     { label: "Super 8 1.36", p: { gateMm: 5.79, squeeze: 1, lpmm: 24, aspect: 1.36, corner: 0.06, gateSoft: 0.012 } }
};

// ---------------------------------------------------------------- lenses & optics
const LENSES = {
    clean:     { label: "Clean period prime", p: { vignette: 0.15, edgeSoft: 0.1, halation: 0.15, diffusion: 0, lowcon: 0, streak: 0, ca: 0 } },
    silent:    { label: "Silent-era lens (soft edges, glow)", p: { vignette: 0.5, edgeSoft: 0.55, halation: 0.2, diffusion: 0.18, lowcon: 0.05, streak: 0, ca: 0.2 } },
    glamour:   { label: "Studio glamour (diffusion on close-ups)", p: { vignette: 0.2, edgeSoft: 0.15, halation: 0.2, diffusion: 0.3, lowcon: 0.03, streak: 0, ca: 0 } },
    wide:      { label: "Wide-angle, stopped down", p: { vignette: 0.35, edgeSoft: 0.3, halation: 0.12, diffusion: 0, lowcon: 0, streak: 0, ca: 0.2 } },
    anamorphic:{ label: "Anamorphic (streak flares, soft edges)", p: { vignette: 0.3, edgeSoft: 0.35, halation: 0.25, diffusion: 0.05, lowcon: 0.03, streak: 0.35, ca: 0.25 } },
    zoom70s:   { label: "1970s zoom (low contrast, fringing)", p: { vignette: 0.25, edgeSoft: 0.3, halation: 0.22, diffusion: 0.05, lowcon: 0.15, streak: 0, ca: 0.35 } },
    smoke:     { label: "Smoke + low-con filter (late 70s-80s)", p: { vignette: 0.3, edgeSoft: 0.25, halation: 0.35, diffusion: 0.35, lowcon: 0.5, streak: 0.3, ca: 0.1 } },
    home:      { label: "Home-movie fixed lens", p: { vignette: 0.6, edgeSoft: 0.6, halation: 0.3, diffusion: 0.1, lowcon: 0.05, streak: 0, ca: 0.45 } }
};

// ---------------------------------------------------------------- print condition
const CONDITIONS = {
    pristine: { label: "Pristine (restored from negative)", p: { generations: 0, dustWhite: 0, dustBlack: 0, scratches: 0, flicker: 0, stains: 0 } },
    finegrain:{ label: "Restored from print / fine-grain", p: { generations: 1, dustWhite: 0.05, dustBlack: 0.05, scratches: 0, flicker: 0.05, stains: 0 } },
    release:  { label: "Release print (light wear)", p: { generations: 1, dustWhite: 0.18, dustBlack: 0.12, scratches: 0.15, flicker: 0.12, stains: 0 } },
    worn:     { label: "Worn print", p: { generations: 1, dustWhite: 0.45, dustBlack: 0.35, scratches: 0.5, flicker: 0.35, stains: 0.1 } },
    archive:  { label: "Archive duplicate (heavy damage)", p: { generations: 2.5, dustWhite: 0.4, dustBlack: 0.45, scratches: 0.7, flicker: 0.55, stains: 0.35 } },
    homereel: { label: "Home-movie reel", p: { generations: 0, dustWhite: 0.25, dustBlack: 0.45, scratches: 0.3, flicker: 0.3, stains: 0 } }
};

// ---------------------------------------------------------------- tints & tones
// Tints are base densities per channel (dye in the film base: colours the lights).
// Tones replace the silver with a coloured compound (colours the darks).
const TINTS = {
    none:   { label: "None", d: [0, 0, 0] },
    amber:  { label: "Amber (day, interiors)", d: [0.30, 0.40, 0.85] },
    straw:  { label: "Straw yellow", d: [0.0, 0.05, 0.32] },
    orange: { label: "Orange-red (fire)", d: [0.0, 0.38, 0.72] },
    rose:   { label: "Rose / pink (dawn, dusk)", d: [0.30, 0.62, 0.45] },
    green:  { label: "Green (night, as Nosferatu)", d: [1.04, 0.34, 0.53] },
    cyan:   { label: "Blue-green (night)", d: [0.48, 0.08, 0.06] },
    blue:   { label: "Blue (night)", d: [0.55, 0.28, 0.0] },
    lavender: { label: "Lavender", d: [0.15, 0.3, 0.0] }
};
const TONES = {
    none:     { label: "None (neutral silver)", v: [1, 1, 1] },
    sepia:    { label: "Sepia", v: [0.74, 0.95, 1.31] },
    warm:     { label: "Warm black", v: [0.92, 0.99, 1.09] },
    selenium: { label: "Selenium (purple-brown)", v: [0.92, 1.06, 1.02] },
    blue:     { label: "Blue (iron)", v: [1.35, 1.02, 0.63] },
    copper:   { label: "Copper red", v: [0.66, 1.1, 1.24] },
    green:    { label: "Green (vanadium)", v: [1.25, 0.82, 1.0] }
};

// ---------------------------------------------------------------- colour fringing
// Characteristic approximations of lens and print colour errors, applied after
// the look. Not measurements of specific lenses.
const FRINGES = {
    none:       { label: "None", p: { fringeLat: 0, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    early:      { label: "Early achromat (1910s-20s)", p: { fringeLat: 0.35, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0.25, fringeAxialR: 0.004, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    studio:     { label: "Studio prime (1930s-60s), slight", p: { fringeLat: 0.12, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0.08, fringeAxialR: 0.002, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    zoom:       { label: "1960s-70s zoom lens", p: { fringeLat: 0.55, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0.15, fringeAxialR: 0.003, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    anamorphic: { label: "Anamorphic (horizontal fringing)", p: { fringeLat: 0.5, fringeMode: "rc", fringeAniso: 0.8, fringeAxial: 0.15, fringeAxialR: 0.003, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    wideopen:   { label: "Fast lens wide open (purple fringing)", p: { fringeLat: 0.1, fringeMode: "pg", fringeAniso: 0, fringeAxial: 0.6, fringeAxialR: 0.0035, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    home:       { label: "Home-movie lens (8mm / Super 8)", p: { fringeLat: 0.75, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0.3, fringeAxialR: 0.005, fringeRx: 0, fringeRy: 0, fringeBx: 0, fringeBy: 0 } },
    misreg3:    { label: "Dye-transfer print misregistration", p: { fringeLat: 0, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0, fringeRx: 1.2, fringeRy: 0.3, fringeBx: -0.8, fringeBy: 0.6 } },
    misreg2:    { label: "Two-colour print misregistration", p: { fringeLat: 0, fringeMode: "rc", fringeAniso: 0, fringeAxial: 0, fringeRx: 2.2, fringeRy: 0.9, fringeBx: 0, fringeBy: 0 } },
    broken:     { label: "Everything wrong (extreme)", p: { fringeLat: 1.2, fringeMode: "rc", fringeAniso: 0.2, fringeAxial: 0.7, fringeAxialR: 0.006, fringeRx: 2.5, fringeRy: -1.2, fringeBx: -1.8, fringeBy: 1.5 } }
};

// ---------------------------------------------------------------- film presets
// Each: year, title, variant, process/format/lens/condition keys, tint/tone keys,
// p = overrides, note = what the preset is based on (sourced research).
const FILMS = [];

function film(def) { FILMS.push(def); }

// --- assembly
function assemble(sel) {
    // sel: { process, format, lens, condition, tint, tone, p }
    const out = {};
    const add = (obj) => { if (obj) for (const k in obj) out[k] = Array.isArray(obj[k]) ? JSON.parse(JSON.stringify(obj[k])) : obj[k]; };
    add(PROCESSES[sel.process] && PROCESSES[sel.process].p);
    add(FORMATS[sel.format] && FORMATS[sel.format].p);
    add(LENSES[sel.lens] && LENSES[sel.lens].p);
    // format and condition generations add up
    const fGen = (FORMATS[sel.format] && FORMATS[sel.format].p.generations) || 0;
    const pGen = (PROCESSES[sel.process] && PROCESSES[sel.process].p.generations) || 0;
    add(CONDITIONS[sel.condition] && CONDITIONS[sel.condition].p);
    out.generations = (out.generations || 0) + fGen + pGen;
    if (sel.tint && TINTS[sel.tint]) { out.tint = TINTS[sel.tint].d.slice(); out.tintAmount = sel.tint === "none" ? 0 : 1; }
    if (sel.tone && TONES[sel.tone]) { out.tone = TONES[sel.tone].v.slice(); out.toneAmount = sel.tone === "none" ? 0 : 1; }
    add(sel.p);
    add(sel.cal);
    return out;
}

const api = { PROCESSES, FORMATS, LENSES, CONDITIONS, TINTS, TONES, FRINGES, FILMS, film, assemble };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.FilmPresets = api;

})(typeof globalThis !== "undefined" ? globalThis : this);
