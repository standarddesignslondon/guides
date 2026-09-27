// FilmLook film presets. Each is a combination of building blocks plus
// overrides, built from sourced research (26 Sept 2026). "note" is shown in
// the panel: what the preset rests on, and where it is an approximation.
// Calibration against reference frames adjusts the p overrides.

(function (root) {
"use strict";
const P = (typeof module !== "undefined" && module.exports) ? require("./presets.js") : root.FilmPresets;
const F = (d) => P.film(d);

// ============================================================ 1920s
F({ id: "nosferatu-day", year: 1922, title: "Nosferatu", variant: "day / interiors (amber tint)",
    process: "bw_ortho", format: "silent35", lens: "silent", condition: "release", tint: "amber",
    p: { tintAmount: 0.6, generations: 1.5, contrast: 1.25, dmax: 2.1 },
    note: "Tinted B&W release prints. The circulating 2006 Murnau Foundation restoration matches its tints to a 1922 French nitrate print, so they are muted: amber/yellow for day and interiors, green for night, pink for dawn and dusk (sources describe the scheme differently). Ortho stock is inferred, not documented. Multi-generation source: soft, grainy, uneven density." });
F({ id: "nosferatu-night", year: 1922, title: "Nosferatu", variant: "night (green tint)",
    process: "bw_ortho", format: "silent35", lens: "silent", condition: "release", tint: "green",
    p: { tintAmount: 0.6, generations: 1.5, contrast: 1.25, dmax: 2.1 },
    note: "Night scenes were shot in daylight and read as night through the tint. See the day variant for sources." });
F({ id: "nosferatu-dawn", year: 1922, title: "Nosferatu", variant: "dawn / dusk (pink tint)",
    process: "bw_ortho", format: "silent35", lens: "silent", condition: "release", tint: "rose",
    p: { tintAmount: 0.6, generations: 1.5, contrast: 1.25, dmax: 2.1 },
    note: "Only a few minutes of the restoration are pink (dawn and dusk)." });

F({ id: "metropolis", year: 1927, title: "Metropolis", variant: "",
    process: "bw_early_pan", format: "silent35", lens: "silent", condition: "finegrain",
    p: { contrast: 1.35, dmax: 2.6, grain: 0.6, edgeSoft: 0.35, diffusion: 0.08 },
    note: "B&W, 1.33, untinted in current restorations. The 2010 restoration mostly comes from the camera negative: clean, sharp, silvery mid-tones, deep blacks in the machine halls. Stock (ortho or pan) is undocumented; early-pan model used." });
F({ id: "metropolis-argentine", year: 1927, title: "Metropolis", variant: "2008 Argentine 16mm footage",
    process: "bw_early_pan", format: "s16", lens: "silent", condition: "archive",
    p: { contrast: 1.0, dmax: 2.0, dmin: 0.12, grain: 1.2, scratches: 0.9 },
    note: "About 25 minutes of the 2010 restoration come from a worn 16mm dupe negative reduced from an Argentine 35mm print: soft, washed out, heavily scratched, left visibly damaged on purpose." });

F({ id: "joan-of-arc", year: 1928, title: "The Passion of Joan of Arc", variant: "",
    process: "bw_early_pan", format: "silent35", lens: "clean", condition: "finegrain",
    p: { contrast: 1.25, dmax: 2.6, grain: 0.8, dustWhite: 0, dustBlack: 0, flicker: 0, vignette: 0.2 },
    note: "Panchromatic (Wikipedia only). No make-up; faces with full skin texture, flat near-white skies behind (the set was painted pink to read grey). Gaumont 2K from a dupe negative of the 1981 Oslo print: clean, spotless, well-resolved grain, no crushed blacks." });

F({ id: "chien-andalou", year: 1929, title: "Un Chien Andalou", variant: "",
    process: "bw_early_pan", format: "silent35", lens: "silent", condition: "finegrain",
    p: { contrast: 1.4, dmax: 2.6, grain: 0.8, edgeSoft: 0.3 },
    note: "B&W silent. The 2021 4K restoration comes from the original negative: plain, fairly high-contrast studio photography. No technical description of the cinematography was found; stock undocumented. Low confidence." });

// ============================================================ 1930s
F({ id: "king-kong", year: 1933, title: "King Kong", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "finegrain",
    p: { contrast: 1.42, dmax: 2.8, grain: 1.2, generations: 2, bwWeights: [0.24, 0.44, 0.32] },
    note: "Academy 1.37. The 2005 restoration comes from a multi-generation duplicate (sources disagree which one): rich intense blacks, bold crisp whites, moderate-to-heavy grain, softer composites. Stock undocumented." });

F({ id: "modern-times", year: 1936, title: "Modern Times", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "finegrain",
    p: { contrast: 1.36, dmax: 2.8, grain: 0.6, aspect: 1.33 },
    note: "Criterion 2K from a fine-grain master off the camera negative: strong contrast, rich uncrushed blacks, texture everywhere, minimal grain. Bright, even, high-key comedy lighting." });

F({ id: "bringing-up-baby", year: 1938, title: "Bringing Up Baby", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "glamour", condition: "finegrain",
    p: { contrast: 1.3, grain: 1.35, generations: 1, diffusion: 0.15 },
    note: "Criterion 4K from a mouldy nitrate duplicate negative: fairly heavy grain, clean grey scale, strong shadow detail, whites without blooming. Glossy studio lighting (my observation)." });

F({ id: "oz-kansas", year: 1939, title: "The Wizard of Oz", variant: "Kansas (sepia)",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "pristine", tone: "sepia",
    p: { toneAmount: 0.85, contrast: 1.3, grain: 0.6 },
    note: "Kansas was shot in B&W and printed with a sepia-tone process. The restoration matched the sepia to a period film sample." });
F({ id: "oz-technicolor", year: 1939, title: "The Wizard of Oz", variant: "Oz (three-strip Technicolor)",
    process: "tech_3strip", format: "academy", lens: "clean", condition: "pristine",
    p: { saturation: 1.22, contrast: 1.28, grain: 0.5, halation: 0.1 },
    note: "Three-strip Technicolor, IB prints. 8K scan of the original separation negatives, graded to a 1939 Academy answer print: saturated primaries, bright even high-key light (effective speed about ASA 5), dense clean blacks. The 2019 4K is more restrained than earlier Blu-rays." });

F({ id: "gone-with-the-wind", year: 1939, title: "Gone with the Wind", variant: "",
    process: "tech_3strip", format: "academy", lens: "clean", condition: "pristine",
    p: { saturation: 1.3, contrast: 1.36, timing: [2.4, 0, -2], grain: 0.6 },
    note: "Three-strip Technicolor, IB prints. Hard directional key light, saturated primaries with pointed use of red, restrained blue moonlight. The HD master (2004/2009 work) has terrific saturation and inky blacks. A new 4K is due 3 Nov 2026." });

// ============================================================ 1940s
F({ id: "rebecca", year: 1940, title: "Rebecca", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "glamour", condition: "pristine",
    p: { contrast: 1.3, latitude: 1.1, grain: 0.7, diffusion: 0.18 },
    note: "Criterion 4K from the nitrate camera negative. Soft, graded low-key light, deep shadows, lush blacks, crisp whites, wide grey scale, fine grain. Diffusion on close-ups is not documented." });

F({ id: "out-of-the-past", year: 1947, title: "Out of the Past", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "pristine",
    p: { bwFilter: "yellow", contrast: 1.38, grain: 0.7, halation: 0.18 },
    note: "Musuraca used minimal filtration: Aero 1 for light correction, G or 23-A for heavier exterior work. Full tonal range in depth, deep shadows but gentler than harder noir. Warner Archive 4K from the nitrate camera negative (1 Sept 2026)." });
F({ id: "out-of-the-past-ext", year: 1947, title: "Out of the Past", variant: "exteriors (G / 23-A filter)",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "pristine",
    p: { bwFilter: "orange", contrast: 1.38, grain: 0.7, halation: 0.15 },
    note: "Heavier exterior correction: skies darker, foliage lighter." });

F({ id: "third-man", year: 1949, title: "The Third Man", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "wide", condition: "finegrain",
    p: { contrast: 1.55, dmax: 2.9, grain: 1.05, halation: 0.35, vignette: 0.3 },
    note: "High contrast, 'pitch black, brilliant white', hard single-source night light on hosed-down cobbles, wide-angle distortion and canted frames. 4K from a fine-grain master off the negative, graded to release prints. Tilting the camera is up to you." });

// ============================================================ 1950s
F({ id: "rashomon", year: 1950, title: "Rashomon", variant: "",
    process: "bw_fast_pan", format: "academy", lens: "clean", condition: "finegrain",
    p: { contrast: 1.55, grain: 1.2, sharpness: 0.85, halation: 0.3, generations: 1 },
    note: "Extreme contrast, dappled sun through leaves, direct sun flare, bright flat courtyard. The 2008 restoration was probably scanned from a 1962 print (sources conflict), so contrast is higher and grain coarser than a negative scan. The Fuji stock claim is unverified." });

F({ id: "strangers-on-a-train", year: 1951, title: "Strangers on a Train", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "pristine",
    p: { contrast: 1.48, dmax: 2.9, grain: 0.85 },
    note: "Bold, muscular high contrast with luscious blacks and brilliant whites; harder and darker than Rebecca. Provenance of the current restoration is undocumented. Low-medium confidence." });

F({ id: "rear-window", year: 1954, title: "Rear Window", variant: "",
    process: "eastman_50s", format: "flat166", lens: "clean", condition: "pristine",
    p: { saturation: 1.15, contrast: 1.22, timing: [4, 1.2, -3.2], grain: 0.6 },
    note: "Early Eastman Color negative, 1.66. The Universal 4K has vivid primaries (especially greens), dense red brick, warm flesh with a slight brown cast, thin fine grain. Accounts conflict over whether the 4K derives from the 1999 photochemical restoration." });

F({ id: "seven-samurai", year: 1954, title: "Seven Samurai", variant: "",
    process: "bw_studio_pan", format: "academy", lens: "clean", condition: "release",
    p: { contrast: 1.45, grain: 1.2, generations: 1, dustWhite: 0.05, dustBlack: 0.05, scratches: 0.12, flicker: 0.05 },
    note: "Toho 4K from a master positive (the negative is lost): strong contrast, natural grain, mild scratches remain. Overcast skies clip; telephoto compression in action scenes." });

F({ id: "vertigo", year: 1958, title: "Vertigo", variant: "",
    process: "eastman_ib", format: "vista", lens: "clean", condition: "pristine",
    p: { saturation: 1.18, contrast: 1.24, grain: 0.5, diffusion: 0.1 },
    note: "VistaVision, Eastmancolor negative, Technicolor IB prints: very fine grain, saturated reds and emerald greens. Burks used fog filters on San Francisco locations. The negative is badly faded and the restoration needed heavy colour correction, so modern frames only approximate the IB prints." });
F({ id: "vertigo-green", year: 1958, title: "Vertigo", variant: "green glow (Judy's transformation)",
    process: "eastman_ib", format: "vista", lens: "clean", condition: "pristine",
    p: { saturation: 1.1, contrast: 1.1, grain: 0.5, diffusion: 0.6, halation: 0.3, gradeGain: [0.85, 1.08, 0.92] },
    note: "Burks' special diffusion filters with green light produced the greenish glow of the transformation scenes (ASC)." });

F({ id: "north-by-northwest", year: 1959, title: "North by Northwest", variant: "",
    process: "eastman_ib", format: "vista", lens: "clean", condition: "pristine",
    p: { saturation: 1.12, contrast: 1.22, timing: [3.2, 0.8, -2.4], grain: 0.5 },
    note: "VistaVision. The 2024 restoration (13K scan of the negative) was graded to an IB Technicolor print: warm palette, natural skin, compact fine grain, bright clean daylight. Should be close to the original look." });

// ============================================================ 1960s
F({ id: "a-bout-de-souffle", year: 1960, title: "À bout de souffle", variant: "",
    process: "bw_pushed", format: "academy", lens: "clean", condition: "pristine",
    p: { contrast: 1.28, grain: 0.95 },
    note: "Fast Ilford still-camera film (HPS; Wikipedia's 'HP5' is anachronistic) pushed a stop, handheld Cameflex, next to no lighting. Visible lively grain, harder contrast in Paris sun. The 2023 4K is cleaner and darker than 1960 prints; add grain rather than subtract it." });
F({ id: "a-bout-de-souffle-int", year: 1960, title: "À bout de souffle", variant: "available-light interiors",
    process: "bw_pushed", format: "academy", lens: "clean", condition: "pristine",
    p: { contrast: 1.1, grain: 1.1, gradeBlack: 0.045, exposure: -0.2 },
    note: "Interiors lit by what was there: lower contrast, greyish blacks." });

F({ id: "lawrence-of-arabia", year: 1962, title: "Lawrence of Arabia", variant: "",
    process: "eastman_60s", format: "wide70", lens: "clean", condition: "pristine",
    p: { saturation: 1.08, contrast: 1.3, timing: [3.2, 0.8, -2.4], grain: 0.45, halation: 0.1 },
    note: "Super Panavision 70 (spherical 65mm), 2.20. 2012 8K scan of the negative: very high sharpness, fine grain, strong contrast, warm ochre sand under pale sky, smooth sun highlights. The 5250 stock claim is unsourced." });

F({ id: "ivans-childhood", year: 1962, title: "Ivan's Childhood", variant: "",
    process: "bw_fast_pan", format: "academy", lens: "clean", condition: "finegrain",
    p: { contrast: 1.45, grain: 0.9, halation: 0.28, diffusion: 0.08, aspect: 1.33 },
    note: "High-contrast, luminous B&W: glistening wet surfaces, backlit birches, dugout interiors with hard slivers of light, silvery highlights that bloom slightly. HD from a fine-grain master positive. Stock undocumented." });
F({ id: "ivans-childhood-dream", year: 1962, title: "Ivan's Childhood", variant: "dream sequences",
    process: "bw_fast_pan", format: "academy", lens: "glamour", condition: "finegrain",
    p: { contrast: 1.18, exposure: 0.35, grain: 0.8, diffusion: 0.3, halation: 0.3, aspect: 1.33 },
    note: "The dreams are brighter, sunnier and softer." });

F({ id: "red-desert", year: 1964, title: "Red Desert", variant: "",
    process: "eastman_ib", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 0.86, contrast: 1.05, lowcon: 0.3, diffusion: 0.12, gradeBlack: 0.02, grain: 0.7 },
    note: "Technicolor IB prints. Much of the look is on set: trees, grass and rooms painted, industrial fog and steam, a muted grey-pastel world with isolated saturated accents, long telephoto lenses. A filter can't paint your subject; choose images with a strong accent colour." });

F({ id: "sound-of-music", year: 1965, title: "The Sound of Music", variant: "2025 restoration",
    process: "eastman_60s", format: "wide70", lens: "clean", condition: "pristine",
    p: { saturation: 1.12, contrast: 1.2, grain: 0.45 },
    note: "Todd-AO 65mm, 2.20. The 2025 restoration (8K from the negative) has lush greens, bright blue skies, fine tight grain and deep blacks. Home-video grades differ a lot; see the 70mm variant." });
F({ id: "sound-of-music-70mm", year: 1965, title: "The Sound of Music", variant: "original 70mm impression",
    process: "eastman_60s", format: "wide70", lens: "clean", condition: "pristine",
    p: { saturation: 0.98, contrast: 1.05, grain: 0.5, sharpness: 0.9, diffusion: 0.06 },
    note: "in70mm.com describes the original 70mm prints as sharp but soft and almost pastel, unlike the oversaturated Blu-ray." });

F({ id: "good-bad-ugly", year: 1966, title: "The Good, the Bad and the Ugly", variant: "",
    process: "eastman_ib", format: "techniscope", lens: "clean", condition: "pristine",
    p: { saturation: 1.05, contrast: 1.4, timing: [4, 1.2, -3.2], grain: 1.2 },
    note: "Techniscope (2-perf, enlarged to scope), Technicolor IB prints: medium-strong organic grain, warm dusty ochres, pale blue skies, hard midday sun, some crushed shadows. Grades vary widely by release; see the 2014 variant." });
F({ id: "good-bad-ugly-2014", year: 1966, title: "The Good, the Bad and the Ugly", variant: "2014 'yellow' master",
    process: "eastman_ib", format: "techniscope", lens: "clean", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.35, timing: [4, 1.2, -3.2], grain: 1.2, gradeGain: [1.04, 1.0, 0.74] },
    note: "The 2014 Blu-ray grade had a notorious mustard-yellow cast." });

F({ id: "andrei-rublev", year: 1966, title: "Andrei Rublev", variant: "B&W",
    process: "bw_fast_pan", format: "sovscope", lens: "anamorphic", condition: "finegrain",
    p: { contrast: 1.22, latitude: 1.15, grain: 0.9, streak: 0.1 },
    note: "Sovscope 2.35. Neutral, silvery B&W with a long mid-tone scale, deep but not crushed blacks, soft highlights. HD from a 35mm internegative; the two cuts differ in contrast. Stock undocumented." });
F({ id: "andrei-rublev-icons", year: 1966, title: "Andrei Rublev", variant: "colour epilogue (icons)",
    process: "sovcolor", format: "sovscope", lens: "anamorphic", condition: "finegrain",
    p: { saturation: 0.9, contrast: 1.15, timing: [2.4, 0.8, -2.4], grain: 1.0, streak: 0.05 },
    note: "The epilogue is Sovcolor (screening notes): warm, low-saturation ochres, golds and faded reds and blues of the icons, slightly soft." });

F({ id: "playtime", year: 1967, title: "Playtime", variant: "",
    process: "eastman_60s", format: "wide70_185", lens: "clean", condition: "pristine",
    p: { saturation: 0.78, contrast: 1.08, timing: [-1.6, 0, 2.8], grain: 0.4 },
    note: "65mm negative. Tati wanted colour that looked like black and white: greys, steel blues, black, with small red and green accents. Very fine grain, bright even low-contrast light. Aspect ratio sources conflict (about 1.70-1.85)." });
F({ id: "playtime-2014", year: 1967, title: "Playtime", variant: "2014 master (yellow-green)",
    process: "eastman_60s", format: "wide70_185", lens: "clean", condition: "pristine",
    p: { saturation: 0.8, contrast: 1.08, grain: 0.4, gradeGain: [0.98, 1.03, 0.85] },
    note: "The 2014 Criterion master had a yellow-green tint; the 2026 4K is more neutral." });

F({ id: "weekend", year: 1967, title: "Weekend", variant: "",
    process: "eastman_60s", format: "flat166", lens: "clean", condition: "pristine",
    p: { push: 1, contrast: 1.05, saturation: 0.97, gradeBlack: 0.035, grain: 1.4 },
    note: "Coutard used the fastest Eastmancolor and overdeveloped it to double its speed (Criterion booklet): heavy grain, lifted milky blacks, flat muddy daylight, with bold red, white and blue accents. Someone who saw 1960s prints recalls them as dark and muddy too." });

F({ id: "rosemarys-baby", year: 1968, title: "Rosemary's Baby", variant: "",
    process: "eastman_ib", format: "flat185", lens: "wide", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.15, timing: [2, 1.6, -2.4], grain: 0.55 },
    note: "50-speed colour negative, 18mm and 25mm lenses for nearly everything, Technicolor IB prints. Soft, bright, natural daylight interiors in pale yellows, creams and pastel greens. Criterion 4K from the camera negative." });
F({ id: "rosemarys-baby-dream", year: 1968, title: "Rosemary's Baby", variant: "flashed dream sequences",
    process: "eastman_ib", format: "flat185", lens: "wide", condition: "pristine",
    p: { saturation: 0.85, contrast: 1.0, flash: 0.3, diffusion: 0.18, grain: 0.6 },
    note: "The film was flashed for the dream sequences 'to soften colors and reduce contrast' (ASC)." });

F({ id: "planet-of-the-apes", year: 1968, title: "Planet of the Apes", variant: "",
    process: "eastman_60s", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { saturation: 1.05, contrast: 1.3, grain: 1.05, gradeBlack: 0.015, streak: 0.15 },
    note: "Panavision anamorphic, Color by DeLuxe, no special filters. Hard high sun, deep blue skies over tan and rust rock, slightly lifted blacks, noticeable grain (weakly sourced). Who made the current 4K master, and from what, is undocumented." });

F({ id: "2001", year: 1968, title: "2001: A Space Odyssey", variant: "",
    process: "eastman_60s", format: "wide70", lens: "clean", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.25, dmax: 3.1, grain: 0.4, halation: 0.08 },
    note: "Super Panavision 70, spherical, 2.20. Extremely fine grain, clean bright near-white sets under soft practical light, true black space, sparing saturated accents. The 2018 4K (8K scan of the negative) removed the old yellow push." });
F({ id: "2001-dawn", year: 1968, title: "2001: A Space Odyssey", variant: "Dawn of Man",
    process: "eastman_60s", format: "wide70", lens: "clean", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.1, timing: [4, 1.2, -4], lowcon: 0.1, grain: 0.45 },
    note: "Front-projected: warm ochre, slightly lower contrast." });

// ============================================================ 1970s
F({ id: "trafic", year: 1971, title: "Trafic", variant: "",
    process: "eastman_100t", format: "academy", lens: "clean", condition: "pristine",
    p: { saturation: 1.02, contrast: 1.2, grain: 0.8 },
    note: "Low confidence: colour process, stock and gauge are undocumented and aspect-ratio sources conflict (1.37 vs 1.85; the restoration is 1.37). The 2K restoration shows moderately saturated primaries, neutral-warm balance, flat overcast daylight, good blacks." });

F({ id: "clockwork-orange", year: 1971, title: "A Clockwork Orange", variant: "",
    process: "eastman_100t", format: "flat166", lens: "wide", condition: "pristine",
    p: { saturation: 1.06, contrast: 1.3, timing: [-2, 0, 2.4], grain: 0.8 },
    note: "1.66, lit mostly by practicals (bare photofloods in fixtures, fluorescent tubes): 'a really cold, stark style' (Alcott). Hard bright white sets, saturated accents, wide-angle distortion (a 9.8mm lens). Stock undocumented." });

F({ id: "solaris-earth", year: 1972, title: "Solaris", variant: "Earth (colour)",
    process: "eastman_100t", format: "sovscope", lens: "anamorphic", condition: "finegrain",
    p: { saturation: 1.05, contrast: 1.15, grain: 1.2, generations: 1, streak: 0.05 },
    note: "Kodak colour negative, Sovscope 2.35: lush, green-dominant Earth scenes. The circulating HD is from a low-contrast print, so it is soft and grainy." });
F({ id: "solaris-station", year: 1972, title: "Solaris", variant: "station (restrained colour)",
    process: "eastman_100t", format: "sovscope", lens: "anamorphic", condition: "finegrain",
    p: { saturation: 0.75, contrast: 1.15, timing: [-2, 0, 2.4], grain: 1.2, generations: 1, streak: 0.05 },
    note: "Cool steel-and-white station interiors with restrained colour." });
F({ id: "solaris-mono", year: 1972, title: "Solaris", variant: "monochrome (blue cast)",
    process: "bw_fast_pan", format: "sovscope", lens: "anamorphic", condition: "finegrain", tone: "blue",
    p: { toneAmount: 0.4, contrast: 1.25, grain: 1.2, generations: 1, streak: 0.05 },
    note: "The Kodak ran out partway through filming, so some scenes are B&W. DP Yusov told Criterion no blue tint was added, but the 2011 Blu-ray shows a blue cast. Disputed; set the tone amount to 0 for Yusov's version." });

F({ id: "long-goodbye", year: 1973, title: "The Long Goodbye", variant: "day (35% flash)",
    process: "eastman_100t", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { flash: 0.32, flashTint: [0.85, 0.95, 1.2], saturation: 0.85, contrast: 1.15, grain: 1.0, streak: 0.1 },
    note: "Eastman 5254, post-flashed at Technicolor by scene: 10-15% night, 35% beach party, 50% Mexico (American Cinematographer). Pastel, muted, slightly blue: 'Pastels are for memory' (Zsigmond). The Kino 4K crushes some blacks, so its shadows are denser than a 1973 print; this preset is calibrated to that transfer and uses a lighter flash than the documented 35%. Raise Flashing for the 1973 print look." });
F({ id: "long-goodbye-night", year: 1973, title: "The Long Goodbye", variant: "night (15% flash + push)",
    process: "eastman_100t", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { flash: 0.12, flashTint: [0.85, 0.95, 1.2], push: 1, saturation: 0.88, contrast: 1.12, grain: 1.1, streak: 0.15 },
    note: "For night exteriors a 10% flash plus a one-stop push replaced a two-stop push (AC)." });
F({ id: "long-goodbye-mexico", year: 1973, title: "The Long Goodbye", variant: "Mexico (50% flash)",
    process: "eastman_100t", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { flash: 0.45, flashTint: [0.9, 0.95, 1.12], saturation: 0.8, contrast: 1.12, grain: 1.0, streak: 0.1 },
    note: "The heaviest flash, 50%, for the final Mexico forest scenes." });

F({ id: "the-conversation", year: 1974, title: "The Conversation", variant: "2024 restoration",
    process: "eastman_100t", format: "flat185", lens: "zoom70s", condition: "pristine",
    p: { saturation: 0.9, contrast: 1.15, timing: [-1.2, 0.4, 1.2], gradeLift: [-0.01, 0.008, 0.014], grain: 0.9 },
    note: "Muted, drab palette of greys, browns and off-greens, soft daylight, moderate contrast. The 2024 4K from the negative (graded to a director-approved print) runs noticeably cooler and tealer than 1974 prints likely did." });

F({ id: "jaws", year: 1975, title: "Jaws", variant: "Amity summer",
    process: "eastman_100t", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { saturation: 1.08, contrast: 1.18, timing: [1.6, 0.4, 0.4], grain: 0.8 },
    note: "Panavision anamorphic, Technicolor prints. Butler planned an 'Andrew Wyeth look' early, a sunny Fourth of July middle and a 'dreary' final hunt. Bright, slightly warm daylight, saturated sea and sky. Spielberg says the 4K looks better than 1975 projection." });
F({ id: "jaws-hunt", year: 1975, title: "Jaws", variant: "final hunt (dreary)",
    process: "eastman_100t", format: "scope", lens: "anamorphic", condition: "pristine",
    p: { saturation: 0.82, contrast: 1.05, timing: [-1.2, 0, 1.6], lowcon: 0.12, grain: 0.9 },
    note: "The last act is darker, flatter and greyer (Butler: 'ominous')." });

F({ id: "mirror-colour", year: 1975, title: "The Mirror", variant: "colour",
    process: "eastman_100t", format: "academy", lens: "clean", condition: "pristine",
    p: { saturation: 0.82, contrast: 1.12, grain: 0.7, timing: [0.8, 0.8, -0.8] },
    note: "Imported Kodak colour, used sparingly: muted greens, greys, blues and browns, soft window light, near-clipping skies. Criterion 2K from the camera negative." });
F({ id: "mirror-mono", year: 1975, title: "The Mirror", variant: "monochrome (warm)",
    process: "bw_fast_pan", format: "academy", lens: "clean", condition: "pristine", tone: "sepia",
    p: { toneAmount: 0.35, contrast: 1.2, grain: 0.8 },
    note: "About a third of the film is B&W. Current Criterion and RusCiCo-derived masters have a light sepia tinge; some older ones are neutral. Whether 1975 prints were toned is undocumented." });

F({ id: "taxi-driver", year: 1976, title: "Taxi Driver", variant: "",
    process: "eastman_100t", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 1.05, contrast: 1.22, grain: 1.1, halation: 0.35, diffusion: 0.08 },
    note: "Gritty grain, strong night blacks, sodium-orange and neon practicals, haloed wet streets; 'I let New York light itself' (Chapman). Sony 4K from the negative, matched to Scorsese-approved prints." });
F({ id: "taxi-driver-climax", year: 1976, title: "Taxi Driver", variant: "climax (desaturated)",
    process: "eastman_100t", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 0.6, contrast: 1.2, timing: [3.2, 1.2, -2], grain: 1.1 },
    note: "For an R rating, the shootout's colour was muted in release prints, turning blood from bright red to reddish-brown (AFI). Chapman says the restoration partly brought the colour back." });

F({ id: "eraserhead", year: 1977, title: "Eraserhead", variant: "",
    process: "bw_fast_pan", format: "flat185", lens: "clean", condition: "pristine",
    p: { contrast: 1.7, latitude: 0.9, grain: 1.15, halation: 0, diffusion: 0, dmax: 2.9 },
    note: "Very high contrast: subjects lit in pools, everything else 'falling off steeply to black'. Neutral grey, crushed black floor, no bloom, grain heavier in some scenes. Exteriors only on overcast days. Criterion 4K from the negative." });

F({ id: "alien", year: 1979, title: "Alien", variant: "",
    process: "eastman_late70s", format: "scope", lens: "smoke", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.25, timing: [-2, 0.8, 1.2], grain: 1.1, lowcon: 0.28, streak: 0.3 },
    note: "Kodak 5247 at 100 ASA, Panavision C-series anamorphics wide open at T2.3-2.8 (Vanlint). Heavy smoke, wet sets, practicals at very low levels: low-key, backlit, cool blue-green with warm pools. The 2019 4K is cooler and more neutral than older Blu-rays." });

F({ id: "stalker-sepia", year: 1979, title: "Stalker", variant: "outside the Zone (sepia)",
    process: "bw_fast_pan", format: "academy", lens: "clean", condition: "pristine", tone: "sepia",
    p: { toneAmount: 1.0, contrast: 1.45, grain: 0.7 },
    note: "Dense brown-amber, high-contrast monochrome. The 2017 Mosfilm 2K has a much heavier sepia than older DVDs. How the sepia was made is undocumented." });
F({ id: "stalker-zone", year: 1979, title: "Stalker", variant: "the Zone (colour)",
    process: "sovcolor", format: "academy", lens: "clean", condition: "pristine",
    p: { saturation: 0.8, contrast: 1.12, grain: 0.7, timing: [0, 1.6, -0.8] },
    note: "Muted, earthy colour dominated by moss greens and grey-browns, soft overcast light. The BFI's print is Orwocolor; whether the final negative was Kodak is disputed (Misek)." });

// ============================================================ 1980s
F({ id: "long-good-friday", year: 1980, title: "The Long Good Friday", variant: "",
    process: "eastman_late70s", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 0.88, contrast: 1.12, timing: [-0.8, 1.6, -0.4], gradeBlack: 0.02, grain: 0.9 },
    note: "Naturalistic overcast London locations, muted colour, blacks 'not the deepest'. The 2024 4K from the negative (Méheux-approved) skews slightly green and fixes the old pink skin. Stock undocumented." });

F({ id: "the-shining", year: 1980, title: "The Shining", variant: "Overlook interiors",
    process: "eastman_late70s", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 1.08, contrast: 1.18, timing: [2.4, 0.8, -1.6], grain: 0.65, halation: 0.1 },
    note: "Normal development throughout and 'I didn't use any filters' (Alcott): bright, even, glossy, sharp. Warm amber interiors from practicals (dimmed 1000W chandeliers) with saturated reds. 2019 4K from the negative." });
F({ id: "the-shining-snow", year: 1980, title: "The Shining", variant: "snow exteriors",
    process: "eastman_late70s", format: "flat185", lens: "clean", condition: "pristine",
    p: { saturation: 1.0, contrast: 1.2, timing: [-2.4, 0, 3.6], grain: 0.65 },
    note: "Cool blue snow scenes (full blue gel on the windows) against the warm interiors." });

F({ id: "blade-runner", year: 1982, title: "Blade Runner", variant: "night streets",
    process: "eastman_late70s", format: "scope", lens: "smoke", condition: "pristine",
    p: { saturation: 1.05, contrast: 1.28, timing: [-2.8, 0, 3.2], grain: 0.9 },
    note: "Panavision anamorphic, low-contrast filters varied with light angle and smoke density, xenon shafts through smoke, heavy backlight, rain (AC). Lifted soft shadows around lights, bloomed highlights, streak flares. The Final Cut grade may be cooler than theatrical prints (unverified)." });
F({ id: "blade-runner-tyrell", year: 1982, title: "Blade Runner", variant: "Tyrell interiors (amber)",
    process: "eastman_late70s", format: "scope", lens: "smoke", condition: "pristine",
    p: { saturation: 1.05, contrast: 1.25, timing: [4.8, 1.2, -4], grain: 0.9 },
    note: "Warm amber-orange interiors." });

F({ id: "nostalghia-colour", year: 1983, title: "Nostalghia", variant: "colour (desaturated)",
    process: "eastman_late70s", format: "flat166", lens: "clean", condition: "pristine",
    p: { saturation: 0.45, contrast: 1.05, diffusion: 0.12, lowcon: 0.1, grain: 0.8 },
    note: "A special print treatment at Technicolor Rome raised contrast and removed colour (Lanci): grey-dominant colour, underlit grey shadows, mist and steam. The 2022 4K recreated this digitally, and the '60% less colour' figure is indirect." });
F({ id: "nostalghia-mono", year: 1983, title: "Nostalghia", variant: "memory (monochrome, 2022 restoration)",
    process: "bw_fast_pan", format: "flat166", lens: "clean", condition: "pristine",
    p: { contrast: 1.4, grain: 0.8, diffusion: 0.08 },
    note: "In the 2022 CSC 4K restoration the memory and Russia sections measure as neutral grey monochrome, not sepia (checked against reference frames). Lanci recalls the 1983 print as sepia; for that, use the sepia variant." });
F({ id: "nostalghia-sepia", year: 1983, title: "Nostalghia", variant: "memory (sepia, as the 1983 print)",
    process: "bw_fast_pan", format: "flat166", lens: "clean", condition: "pristine", tone: "sepia",
    p: { toneAmount: 0.8, contrast: 1.4, grain: 0.8, diffusion: 0.08 },
    note: "Lanci: 'when we saw the print in sepia, we found it so interesting that we decided to keep it'. Higher contrast than the colour scenes." });

})(typeof globalThis !== "undefined" ? globalThis : this);
