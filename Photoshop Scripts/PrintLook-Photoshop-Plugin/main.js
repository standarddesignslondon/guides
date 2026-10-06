// PrintLook - Photoshop panel. Each colour layer of the artwork is one printing plate with one ink; the engine prints
// the plates one after another on a sheet of paper, with the mark, the faults and the register of the chosen process.
// Engine: pl_engine.js (pure JS, shared with the Node test harness). Plates: pl_plates.js. Data: pl_data.js. Looks: pl_presets.js.
const { app, core, action, imaging, constants } = require("photoshop");
const batchPlay = action.batchPlay;
const D = require("./pl_data.js");
const PL = require("./pl_plates.js");
const E = require("./pl_engine.js");
const PRE = require("./pl_presets.js");
const LOOKS = PRE.LOOKS, GROUPS = PRE.GROUPS;

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function getPath(o, p) { return p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, p, v) { const ks = p.split("."); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null || typeof a[ks[i]] !== "object") a[ks[i]] = {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
function mergeDeep(a, b) { for (const k in b) { if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k])) { if (!a[k] || typeof a[k] !== "object") a[k] = {}; mergeDeep(a[k], b[k]); } else a[k] = deep(b[k]); } return a; }

// ------------------------------------------------------------------ state

const SECTION_KEYS = ["ink", "faults", "tone", "register", "paper", "age"];       // the stages that can be switched off
const EXTRA = { inkTexture: { strength: 1, mode: "dark" }, read: "seen" };          // panel settings that are not part of a look
function baseState() { return Object.assign(D.assemble({ process: "letterpress_job" }), deep(EXTRA)); }
let st = baseState();
let enabled = {};
let currentLook = "";
let modified = false;
const lastResults = {};     // per document id: { docID, layerIDs, region, hiddenIDs, selIDs }
let colourManaged = true;   // ask Photoshop for sRGB pixels; switched off for the session if it refuses

// ------------------------------------------------------------------ controls

const optsOf = (obj) => () => Object.keys(obj).map(k => [k, obj[k].label]);
const own = (v) => (v < 0 ? "own" : (+v).toFixed(2));
const SECTIONS = [
    { key: "process", title: "Process", open: true, noToggle: true, items: [
        { kind: "select", id: "procSel", label: "Process", path: "process", options: optsOf(D.PROCESSES), set: (v) => { D.applyProcess(st, v); } },
        { kind: "slider", id: "scale", label: "Detail scale", path: "scale", min: 0.25, max: 4, step: 0.05 }
    ], hint: "Choosing a process resets the Ink, Faults and Tone sections to that process. Every size in this panel is a real size on the paper (micrometres), worked out from the document's resolution. Detail scale enlarges or shrinks all of it at once: 2 draws every dot, edge and fault twice as large, which is how to show a fine screen in a low-resolution document." },
    { key: "colour", title: "Plates and inks", open: true, noToggle: true, items: [
        { kind: "select", id: "inkMode", label: "Flat layers print in", path: "colour.inkMode", options: () => [["layer", "Their own colour"], ["set", "The nearest ink in the set"]] },
        { kind: "select", id: "inkset", label: "Ink set", path: "colour.inkset", options: optsOf(D.INKSETS) },
        { kind: "select", id: "pictures", label: "Picture layers", path: "colour.pictures", options: () => [["single", "One ink"], ["duotone", "Two inks (duotone)"], ["process3", "Three-colour process"], ["process4", "Four-colour process"], ["spot", "Flat spot colours"], ["tints", "Flat tints and black line"]] },
        { kind: "slider", id: "spotCount", label: "Spot colours", path: "colour.spotCount", min: 2, max: 8, step: 1 },
        { kind: "select", id: "single", label: "One-ink picture ink", path: "colour.single", options: () => [["auto", "Automatic"]].concat(optsOf(D.INKS)()) },
        { kind: "select", id: "second", label: "Duotone 2nd ink", path: "colour.second", options: optsOf(D.INKS) },
        { kind: "select", id: "overlaps", label: "Overlaps", path: "colour.overlaps", options: () => [["knockout_k", "Colours knock out, black overprints"], ["knockout", "Everything knocks out"], ["overprint", "Everything overprints"]] },
        { kind: "slider", id: "trap", label: "Trap (µm)", path: "colour.trap", min: 0, max: 300, step: 5 },
        { kind: "select", id: "order", label: "Printing order", path: "colour.order", options: () => [["stack", "As layered, bottom first"], ["light_first", "Lightest ink first"]] },
        { kind: "slider", id: "opacity", label: "Ink opacity", path: "colour.opacity", min: -0.05, max: 1, step: 0.05, show: own, set: (v) => { st.colour.opacity = v < 0 ? -1 : v; }, est: true },
        { kind: "slider", id: "gcr", label: "Black in four-colour", path: "colour.gcr", min: 0, max: 1, step: 0.05 },
        { kind: "select", id: "angles", label: "Screen angles", path: "colour.angles", options: () => [["uk1949", "Britain 1949 (Tarr)"], ["us1975", "US 1975-88"], ["three1949", "Three-colour 1949 (Tarr)"], ["verf1912", "c.1912 (Verfasser)"], ["comic30", "US comic tints, 30° apart"], ["same45", "All at 45°"]] },
        { kind: "slider", id: "wet", label: "Wet trapping", path: "colour.wet", min: 0.5, max: 1, step: 0.05, est: true },
        { kind: "select", id: "read", label: "Read layers", path: "read", options: () => [["seen", "As seen (masks, effects, type)"], ["direct", "Directly (faster)"]] }
    ], hint: "A layer in one flat colour is a plate of line work in that colour; a layer at part opacity prints as a tint. Any other layer is a picture, separated as chosen here. A white bottom layer is taken as the sheet. A layer set to Multiply overprints. With \"Their own colour\" the ink is mixed to match the layer; with an ink set the layer is printed in the nearest ink a printer of that kind kept." },
    { key: "ink", title: "Ink on paper", open: false, items: [
        { kind: "slider", id: "pInk", label: "Ink amount", path: "press.ink", min: 0.3, max: 1.8, step: 0.05 },
        { kind: "slider", id: "pPressure", label: "Impression", path: "press.pressure", min: 0.3, max: 1.6, step: 0.05 },
        { kind: "slider", id: "pGain", label: "Spread (µm)", path: "press.gain", min: -40, max: 200, step: 2, est: true },
        { kind: "slider", id: "pSoften", label: "Rounding (µm)", path: "press.soften", min: 0, max: 200, step: 2, est: true },
        { kind: "slider", id: "pEdge", label: "Edge softness (µm)", path: "press.edge", min: 0, max: 150, step: 2, est: true },
        { kind: "slider", id: "pRagged", label: "Ragged edge", path: "press.ragged", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "pRaggedScale", label: "Ragged size (µm)", path: "press.raggedScale", min: 40, max: 1500, step: 10, est: true },
        { kind: "slider", id: "pRim", label: "Squeezed rim", path: "press.rim", min: 0, max: 1.5, step: 0.05, est: true },
        { kind: "slider", id: "pRimWidth", label: "Rim width (µm)", path: "press.rimWidth", min: 20, max: 400, step: 5, est: true },
        { kind: "slider", id: "pStarve", label: "Starved middle", path: "press.starve", min: 0, max: 0.9, step: 0.05, est: true },
        { kind: "slider", id: "pBleed", label: "Soak into paper (µm)", path: "press.bleed", min: 0, max: 200, step: 2, est: true },
        { kind: "slider", id: "pHalo", label: "Oil halo", path: "press.halo", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "pHaloWidth", label: "Halo width (µm)", path: "press.haloWidth", min: 50, max: 1500, step: 10, est: true },
        { kind: "slider", id: "pImpression", label: "Dent in the paper", path: "press.impression", min: 0, max: 1, step: 0.05, est: true }
    ], hint: "The mark itself: how far the ink spreads past the plate, how round the corners get, the darker rim that letterpress and flexo squeeze out, and the paler middle of a starved solid." },
    { key: "faults", title: "Faults", open: false, items: [
        { kind: "slider", id: "fMottle", label: "Uneven solids", path: "press.mottle", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fMottleScale", label: "Unevenness size (µm)", path: "press.mottleScale", min: 300, max: 20000, step: 100, est: true },
        { kind: "slider", id: "fSalt", label: "Salty solids", path: "press.salt", min: 0, max: 1, step: 0.02, est: true },
        { kind: "slider", id: "fSaltScale", label: "Salt size (µm)", path: "press.saltScale", min: 60, max: 800, step: 10, est: true },
        { kind: "slider", id: "fSpeckle", label: "Speckle", path: "press.speckle", min: 0, max: 1, step: 0.02, est: true },
        { kind: "slider", id: "fSorts", label: "Uneven letters", path: "press.sorts", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fGrain", label: "Wood grain / brush", path: "press.grain", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fGrainAngle", label: "Grain direction (°)", path: "press.grainAngle", min: 0, max: 180, step: 5 },
        { kind: "slider", id: "fWear", label: "Worn type", path: "press.wear", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fMesh", label: "Screen mesh marks", path: "press.mesh", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fMeshPitch", label: "Mesh pitch (µm)", path: "press.meshPitch", min: 100, max: 400, step: 5 },
        { kind: "slider", id: "fHollow", label: "Hollow solids", path: "press.hollow", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fHollowWidth", label: "Hollow width (µm)", path: "press.hollowWidth", min: 100, max: 3000, step: 50, est: true },
        { kind: "slider", id: "fSpatter", label: "Spatter", path: "press.spatter", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fSlur", label: "Slur (µm)", path: "press.slur", min: 0, max: 600, step: 10, est: true },
        { kind: "slider", id: "fSlurAngle", label: "Slur direction (°)", path: "press.slurAngle", min: 0, max: 360, step: 5 },
        { kind: "slider", id: "fHickeys", label: "Hickeys", path: "press.hickeys", min: 0, max: 5, step: 0.1, est: true },
        { kind: "slider", id: "fSpecks", label: "Stray specks", path: "press.specks", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fScum", label: "Scum", path: "press.scum", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fBanding", label: "Banding", path: "press.banding", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "texStrength", label: "Ink texture layer", path: "inkTexture.strength", min: 0, max: 1.5, step: 0.05 },
        { kind: "select", id: "texMode", label: "Ink texture reads", path: "inkTexture.mode", options: () => [["dark", "Dark removes ink"], ["light", "Light removes ink"]] }
    ], hint: "What goes wrong in the solids and round the edges. Uneven letters and the ink texture are applied letter by letter. To use a texture of your own (a wood-type texture, say), put it on a layer whose name starts with \"ink texture\": each letter takes a different piece of it, so a repeating texture does not show its repeat. None of these amounts is in any source; the defaults are estimates set against scans." },
    { key: "tone", title: "Tone", open: false, items: [
        { kind: "select", id: "carrier", label: "Tone is carried by", path: "tone.carrier", options: () => [["halftone", "Halftone dots"], ["line", "Parallel-line tint"], ["crayon", "Crayon on grained stone"], ["stipple", "Hand stipple"], ["spatter", "Spatter (crachis)"], ["gravure", "Gravure cells"], ["collotype", "Collotype grain"], ["grain", "Grain screen"], ["threshold", "Line only (no tone)"], ["contone", "Continuous"]] },
        { kind: "slider", id: "lpi", label: "Screen (lines/inch)", path: "tone.lpi", min: 20, max: 300, step: 1 },
        { kind: "slider", id: "tAngle", label: "Screen angle (°)", path: "tone.angle", min: 0, max: 180, step: 1 },
        { kind: "select", id: "dot", label: "Dot shape", path: "tone.dot", options: () => [["square", "Square (glass screen)"], ["round", "Round"], ["ellipse", "Elliptical (chain)"], ["line", "Line"]] },
        { kind: "slider", id: "minDot", label: "Highlight drop-out", path: "tone.minDot", min: 0, max: 0.3, step: 0.01 },
        { kind: "slider", id: "maxDot", label: "Shadow fill-in", path: "tone.maxDot", min: 0.7, max: 1, step: 0.01 },
        { kind: "slider", id: "comp", label: "Platemaker's skill", path: "tone.comp", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "contrast", label: "Contrast", path: "tone.contrast", min: 0.5, max: 2, step: 0.05 },
        { kind: "slider", id: "grainSize", label: "Grain size (µm)", path: "tone.grainSize", min: 40, max: 600, step: 5 },
        { kind: "slider", id: "tintSteps", label: "Flat tint steps", path: "tone.tintSteps", min: 0, max: 5, step: 1 }
    ], hint: "How pictures and tints are broken up. A screen needs about 2.4 pixels per dot: at 300 ppi that is up to roughly 125 lines; finer screens print as smooth tint unless you raise the resolution or the Detail scale. Platemaker's skill is how well the plate allowed for the dots spreading: at 0 pictures print dark and filled in. Switching Tone off prints everything as continuous tone." },
    { key: "register", title: "Register", open: false, items: [
        { kind: "slider", id: "regError", label: "Misregister (mm)", path: "register.error", min: 0, max: 3, step: 0.05 },
        { kind: "slider", id: "regStretch", label: "Stretch (mm per m)", path: "register.stretch", min: 0, max: 2, step: 0.05 },
        { kind: "slider", id: "regRotate", label: "Twist (°)", path: "register.rotate", min: 0, max: 0.3, step: 0.01 }
    ], hint: "How far each printing lands from the first. New impression gives a different misregister." },
    { key: "paper", title: "Paper", open: false, items: [
        { kind: "select", id: "paperSource", label: "Paper", path: "paper.source", options: () => [["stock", "A stock from the list"], ["layer", "My layer named \"paper\""], ["bottom", "The bottom layer's colour"], ["none", "None: inks only, on Multiply"]] },
        { kind: "select", id: "stock", label: "Stock", path: "paper.stock", options: optsOf(D.PAPERS) },
        { kind: "text", id: "paperColour", label: "Colour (#rrggbb)", path: "paper.colour" },
        { kind: "slider", id: "tooth", label: "Surface roughness", path: "paper.tooth", min: -0.05, max: 1, step: 0.05, show: own, set: (v) => { st.paper.tooth = v < 0 ? -1 : v; }, est: true },
        { kind: "slider", id: "texture", label: "Texture", path: "paper.texture", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "fibres", label: "Fibres", path: "paper.fibres", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "flecks", label: "Flecks", path: "paper.flecks", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "showThrough", label: "Show-through", path: "paper.showThrough", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "layerStrength", label: "My paper layer strength", path: "paper.layerStrength", min: 0, max: 1, step: 0.05 }
    ], hint: "The paper is optional. To print on a texture of your own, put it on a layer whose name starts with \"paper\" and choose My layer named \"paper\": the inks are laid over it. Or choose None: the inks alone are put on a Multiply layer and your artwork layers are hidden, so whatever paper you keep underneath shows through. Surface roughness still shapes the ink (salty solids, speckle) even when no paper is drawn. Switching the section off prints on plain white." },
    { key: "age", title: "Age", open: false, items: [
        { kind: "slider", id: "ageYellow", label: "Yellowing", path: "age.yellow", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageEdges", label: "Browned edges", path: "age.edges", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageFoxing", label: "Foxing", path: "age.foxing", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageFade", label: "Faded inks", path: "age.fade", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageFolds", label: "Folds", path: "age.folds", min: 0, max: 3, step: 1 },
        { kind: "slider", id: "ageWear", label: "Rubbing and cracks", path: "age.wear", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageDirt", label: "Dirt", path: "age.dirt", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageSetoff", label: "Set-off", path: "age.setoff", min: 0, max: 1, step: 0.05, est: true },
        { kind: "slider", id: "ageOil", label: "Oil staining", path: "age.oil", min: 0, max: 1, step: 0.05, est: true }
    ], hint: "A fresh print has all of these at 0. Faded inks follows the pigment: fugitive lakes and dyes go first, blacks and earths hardly at all. Yellowing, edges, foxing and dirt are laid over whatever paper is in use, your own layer included; with Paper set to None they go onto the Multiply layer as a stain." }
];
const ITEMS = {};
for (const s of SECTIONS) for (const it of s.items) ITEMS[it.id] = it;

function fmt(v, it) { if (it.show) return it.show(v); const d = it.step >= 1 ? 0 : (it.step >= 0.1 ? 1 : 2); return (+v).toFixed(d); }
function getVal(it) { const v = getPath(st, it.path); return v === undefined ? it.min : v; }
function setVal(it, v) { if (it.set) it.set(v); else setPath(st, it.path, v); }
function fillSelect(sel, options) { while (sel.firstChild) sel.removeChild(sel.firstChild); for (const [v, t] of options) { const op = document.createElement("option"); op.value = v; op.textContent = t; sel.appendChild(op); } }

function buildUI() {
    const host = $("sections");
    for (const sec of SECTIONS) {
        const h = document.createElement("h2");
        const tw = document.createElement("span"); tw.className = "tw"; tw.textContent = sec.open ? "▾" : "▸";
        if (!sec.noToggle) {
            const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "en_" + sec.key; cb.checked = true;
            cb.title = "Switch this stage on or off"; cb.style.marginRight = "6px";
            cb.addEventListener("click", (e) => e.stopPropagation());
            cb.addEventListener("change", () => { enabled[sec.key] = cb.checked; markModified(); showOff(); saveState(); });
            h.appendChild(cb);
        }
        h.appendChild(tw); h.appendChild(document.createTextNode(sec.title));
        const off = document.createElement("span"); off.id = "off_" + sec.key; off.className = "offtag"; off.textContent = "  off"; h.appendChild(off);
        const body = document.createElement("div"); body.style.display = sec.open ? "block" : "none";
        h.addEventListener("click", () => { const open = body.style.display === "none"; body.style.display = open ? "block" : "none"; tw.textContent = open ? "▾" : "▸"; });
        host.appendChild(h); host.appendChild(body);
        for (const it of sec.items) {
            const row = document.createElement("div"); row.className = "row";
            const lab = document.createElement("label"); lab.textContent = it.label;
            if (it.est) { const e = document.createElement("span"); e.className = "est"; e.textContent = "est."; lab.appendChild(e); }
            row.appendChild(lab);
            if (it.kind === "text") {
                const tx = document.createElement("input"); tx.type = "text"; tx.id = it.id; tx.style.width = "90px";
                tx.addEventListener("change", () => { setVal(it, tx.value.trim()); switchOn(sec.key); markModified(); saveState(); });
                row.appendChild(tx);
            } else if (it.kind === "select") {
                const sel = document.createElement("select"); sel.id = it.id; fillSelect(sel, it.options());
                sel.addEventListener("change", () => { setVal(it, sel.value); switchOn(sec.key); markModified(); syncUI(); saveState(); });
                row.appendChild(sel);
            } else {
                const r = document.createElement("input"); r.type = "range"; r.id = it.id;
                r.min = "0"; r.max = "" + Math.round((it.max - it.min) / it.step); r.step = "1";
                const val = document.createElement("span"); val.className = "val"; val.id = it.id + "Val";
                r.addEventListener("input", () => { const v = +(it.min + parseInt(r.value, 10) * it.step).toFixed(4); setVal(it, v); val.textContent = fmt(v, it); switchOn(sec.key); markModified(); });
                r.addEventListener("change", saveState);
                row.appendChild(r); row.appendChild(val);
            }
            body.appendChild(row);
        }
        if (sec.hint) { const hn = document.createElement("div"); hn.className = "hint"; hn.textContent = sec.hint; body.appendChild(hn); }
    }
    fillSelect($("group"), [["all", "All looks"]].concat(GROUPS.map(g => [g, g + " (" + LOOKS.filter(l => l.group === g).length + ")"])));
    fillLooks();
    const ph = $("presetsHead"), pb = $("presetsBody");
    ph.addEventListener("click", () => { const open = pb.style.display === "none"; pb.style.display = open ? "block" : "none"; ph.firstChild.textContent = open ? "▾" : "▸"; });
}
function fillLooks() {
    const gv = $("group").value, g = GROUPS.indexOf(gv) >= 0 ? gv : "", ls = $("look"), opts = [["custom", "(custom settings)"]];
    let group = "";
    for (const l of LOOKS) {
        if (g && l.group !== g) continue;
        if (!g && l.group !== group) { group = l.group; opts.push(["__" + group, "── " + group + " ──"]); }
        opts.push([l.id, l.title]);
    }
    fillSelect(ls, opts);   // (UXP cannot disable an option: choosing a heading simply puts the list back)
    ls.value = currentLook && opts.some(o => o[0] === currentLook) ? currentLook : "custom";
}

function syncUI() {
    for (const id in ITEMS) {
        const it = ITEMS[id], el = $(id); if (!el) continue;
        if (it.kind === "text") { const v = getPath(st, it.path); el.value = v === undefined ? "" : "" + v; continue; }
        if (it.kind === "select") { const v = getPath(st, it.path), opts = it.options(); el.value = opts.some(o => o[0] === v) ? "" + v : opts[0][0]; continue; }
        const v = getVal(it);
        el.value = "" + Math.round((clamp(v, it.min, it.max) - it.min) / it.step);
        $(id + "Val").textContent = fmt(v, it);
    }
    const l = LOOKS.find(x => x.id === currentLook);
    if (l && GROUPS.indexOf($("group").value) >= 0 && $("group").value !== l.group) { $("group").value = l.group; fillLooks(); }
    $("look").value = currentLook && l ? currentLook : "custom";
    showOff(); showNote();
}
function showOff() {
    for (const k of SECTION_KEYS) {
        const cb = $("en_" + k), t = $("off_" + k);
        if (cb) cb.checked = enabled[k] !== false;
        if (t) t.style.display = enabled[k] === false ? "inline" : "none";
    }
}
const EVIDENCE = { sourced: "Process, colours and format come from a cited record or period text.", partly: "The process is sourced; colours, paper or settings are estimates.", inferred: "Built from the process alone: no dated example stands behind it." };
function showNote() {
    const l = LOOKS.find(x => x.id === currentLook), n = $("note");
    if (!l) { n.textContent = modified ? "Custom settings." : ""; n.className = ""; return; }
    n.textContent = (modified ? "Modified from the look. " : "") + l.years + ". " + l.note + " [" + (EVIDENCE[l.evidence] || "") + "]";
    n.className = modified ? "modified" : "";
}
// Changing a control in a switched-off section switches that section on (otherwise the change would do nothing).
function switchOn(key) { if (enabled[key] === false) { enabled[key] = true; showOff(); } }
function markModified() { if (!modified) { modified = true; showNote(); } }

function applyLook(id) {
    const l = LOOKS.find(x => x.id === id);
    if (!l) { currentLook = ""; modified = true; syncUI(); saveState(); return; }
    // the paper choice, the detail scale, the texture layer settings and the seed belong to the document, not the look
    const keep = { seed: st.seed, scale: st.scale, source: st.paper.source, layerStrength: st.paper.layerStrength, inkTexture: deep(st.inkTexture), read: st.read };
    st = D.assemble(l);
    st.seed = keep.seed; st.scale = keep.scale; st.paper.source = keep.source; st.paper.layerStrength = keep.layerStrength; st.inkTexture = keep.inkTexture; st.read = keep.read;
    const paperOff = enabled.paper === false;
    enabled = {}; if (paperOff) enabled.paper = false;
    currentLook = l.id; modified = false;
    syncUI(); saveState();
}

// ------------------------------------------------------------------ persistence

function saveState() {
    try { localStorage.setItem("printlook.state", JSON.stringify({ st, enabled, currentLook, modified, group: $("group").value, strength: $("strength").value, source: $("source").value, output: $("output").value })); } catch (e) {}
}
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem("printlook.state") || "null");
        if (!s || !s.st) return false;
        st = mergeDeep(baseState(), s.st); if (!D.PROCESSES[st.process]) st.process = "letterpress_job";
        enabled = s.enabled || {}; currentLook = s.currentLook || ""; modified = !!s.modified;
        $("group").value = s.group && GROUPS.indexOf(s.group) >= 0 ? s.group : "all"; fillLooks();
        $("strength").value = s.strength || "100"; $("strengthVal").textContent = $("strength").value;
        $("source").value = ["layers", "selected", "merged"].indexOf(s.source) >= 0 ? s.source : "layers"; $("output").value = s.output === "plates" ? "plates" : "layer";
        return true;
    } catch (e) { return false; }
}
function setStatus(msg, isErr) { const el = $("status"); el.textContent = msg; el.className = isErr ? "err" : ""; }

// ------------------------------------------------------------------ photoshop helpers

const num = (x) => (x && typeof x === "object" ? (x._value !== undefined ? x._value : x.value) : x);
async function getSelectionBounds(docID) {
    const r = await batchPlay([{ _obj: "get", _target: [{ _property: "selection" }, { _ref: "document", _id: docID }] }], {});
    const s = r && r[0] && r[0].selection;
    if (!s || s.top === undefined) return null;
    const b = { left: Math.round(num(s.left)), top: Math.round(num(s.top)), right: Math.round(num(s.right)), bottom: Math.round(num(s.bottom)) };
    if (b.right - b.left < 4 || b.bottom - b.top < 4) return null;
    return b;
}
function lookLabel() { const l = LOOKS.find(x => x.id === currentLook); return l ? l.title + (modified ? " *" : "") : (D.PROCESSES[st.process] ? D.PROCESSES[st.process].label : "custom"); }
async function setOpacity(docID, layerID, pct) {
    await batchPlay([{ _obj: "set", _target: [{ _ref: "layer", _id: layerID }, { _ref: "document", _id: docID }], to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: pct } } }], {});
}
function kindSets() {
    const K = constants.LayerKind || {}, B = constants.BlendMode || {};
    return { group: K.GROUP, text: K.TEXT, content: [K.NORMAL, K.TEXT, K.SMARTOBJECT, K.SOLIDFILL, K.GRADIENTFILL, K.PATTERNFILL].filter(v => v !== undefined), overprint: [B.MULTIPLY, B.DARKEN, B.LINEARBURN, B.COLORBURN].filter(v => v !== undefined) };
}
const RE_PAPER = /^paper(?![a-z])/i, RE_TEX = /^ink[ _-]?texture/i;   // "paper", "Paper texture 3", "paper_02" - but not "Paperback"
// Every layer that is not a group, top first, with what it is to us: ours (a PrintLook result), the user's paper, an ink
// texture, or artwork. `shown` is whether it is actually visible (itself and every group round it).
function collectLayers(layers, KS, shown, flags, out) {
    out = out || []; flags = flags || {};
    for (const l of layers) {
        const name = (l.name || "").trim(), v = shown && l.visible;
        const f = { own: flags.own || /^printlook/i.test(name), paper: flags.paper, tex: flags.tex, overprint: flags.overprint };
        if (l.kind === KS.group) {
            if (RE_PAPER.test(name)) f.paper = true;
            if (RE_TEX.test(name)) f.tex = true;
            if (KS.overprint.indexOf(l.blendMode) >= 0) f.overprint = true;
            collectLayers(l.layers || [], KS, v, f, out);
        } else {
            const isText = l.kind === KS.text;
            if (!isText && RE_PAPER.test(name)) f.paper = true;
            if (!isText && RE_TEX.test(name)) f.tex = true;
            out.push({ layer: l, name, shown: v, own: f.own, paper: !!f.paper && !f.own, tex: !!f.tex && !f.own && !f.paper, content: KS.content.indexOf(l.kind) >= 0, overprint: !!f.overprint || KS.overprint.indexOf(l.blendMode) >= 0 });
        }
    }
    return out;
}
function allIds(layers, set) { for (const l of layers) { set[l.id] = 1; if (l.layers && l.layers.length) allIds(l.layers, set); } return set; }
function layerBounds(l, W, H) {
    try {
        const b = l.bounds; if (!b) throw 0;
        const r = { left: Math.max(0, Math.floor(num(b.left)) - 4), top: Math.max(0, Math.floor(num(b.top)) - 4), right: Math.min(W, Math.ceil(num(b.right)) + 4), bottom: Math.min(H, Math.ceil(num(b.bottom)) + 4) };
        if (!(r.right - r.left >= 1) || !(r.bottom - r.top >= 1)) throw 0;
        return r;
    } catch (e) { return { left: 0, top: 0, right: W, bottom: H }; }
}
// Read a rectangle of the document (or of one layer) in bands, handing each band to cb(data, comps, left, top, width, height).
async function readBands(ctx, docID, bounds, bits, layerID, cb) {
    const bw = bounds.right - bounds.left, bh = Math.max(64, Math.floor(4e6 / Math.max(1, bw)));
    let got = 0, comps = 0, lastErr = null;
    for (let y = bounds.top; y < bounds.bottom; y += bh) {
        const req = { documentID: docID, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: bounds.left, top: y, right: bounds.right, bottom: Math.min(bounds.bottom, y + bh) } };
        if (layerID !== undefined && layerID !== null) req.layerID = layerID;
        let res;
        if (ctx && ctx.isCancelled) throw new Error("Cancelled.");
        try {
            if (colourManaged) { try { res = await imaging.getPixels(Object.assign({ colorProfile: SRGB }, req)); } catch (e) { if (ctx && ctx.isCancelled) throw e; res = null; } }
            if (!res) { res = await imaging.getPixels(req); if (colourManaged && res) colourManaged = false; }   // it took the request without the profile: stop asking
        } catch (e) { if (ctx && ctx.isCancelled) throw new Error("Cancelled."); lastErr = e; continue; }        // an empty band of a layer can be refused: it is simply empty
        const img = res.imageData, sb = res.sourceBounds || req.sourceBounds, data = await img.getData({ chunky: true });
        comps = img.components; cb(data, comps, sb.left, sb.top, img.width, img.height); got++;
        img.dispose();
    }
    return { bands: got, comps, error: lastErr };
}
async function newTopLayer(doc, name) {
    const top = doc.layers[0];
    await batchPlay([
        { _obj: "select", _target: [{ _ref: "layer", _id: top.id }], makeVisible: false },
        { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name } }
    ], {});
    const dst = doc.activeLayers[0], t2 = doc.layers[0];
    if (t2 && t2.id !== dst.id) await dst.move(t2, constants.ElementPlacement.PLACEBEFORE);
    return dst;
}
const SRGB = "sRGB IEC61966-2.1";
async function putResult(doc, dst, r) {
    const o = { width: r.width, height: r.height, components: 4, colorSpace: "RGB", chunky: true };
    let img = null;
    if (colourManaged) { try { img = await imaging.createImageDataFromBuffer(r.data, Object.assign({ colorProfile: SRGB }, o)); } catch (e) { img = null; } }
    if (!img) img = await imaging.createImageDataFromBuffer(r.data, o);
    await imaging.putPixels({ documentID: doc.id, layerID: dst.id, imageData: img, targetBounds: { left: r.left, top: r.top }, replace: true });
    img.dispose();
}
async function selectLayers(ids) {
    try { await batchPlay(ids.map((id, i) => Object.assign({ _obj: "select", _target: [{ _ref: "layer", _id: id }], makeVisible: false }, i ? { selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" } } : {})), {}); } catch (e) {}
}
function findLayer(layers, id) { for (const l of layers) { if (l.id === id) return l; if (l.layers && l.layers.length) { const f = findLayer(l.layers, id); if (f) return f; } } return null; }

// ------------------------------------------------------------------ render

async function render(mode) {
    const t0 = Date.now();
    const s = deep(st), en = Object.assign({}, enabled);
    const source = $("source").value || "layers", output = $("output").value || "layer", strength = parseInt($("strength").value, 10);
    let info = "";
    const hidden = [];   // layers hidden while reading, to be shown again
    const reshown = [];  // artwork a previous no-paper render hid, shown again so that it can be read
    let ok = false;

    try { await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument, last = lastResults[doc.id] || null;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "PrintLook" });
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("PrintLook works on RGB documents (Image > Mode > RGB Color).");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 : (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit first.");
            const W = Math.round(num(doc.width)), H = Math.round(num(doc.height)), ppi = num(doc.resolution) || 300, MAXV = bits === 16 ? 32768 : 255;
            const KS = kindSets();

            // the last full render with no paper hid the artwork under its Multiply layer: bring it back before reading
            if (last && last.hiddenIDs) for (const id of last.hiddenIDs) { const l = findLayer(doc.layers, id); if (l && !l.visible) { l.visible = true; reshown.push(l); } }
            let region = null;
            if (mode === "update") {
                if (!last) throw new Error("Nothing to re-render in this document yet.");
                for (const id of last.layerIDs || []) { const old = findLayer(doc.layers, id); if (old) await old.delete(); }   // (a failed run is rolled back, so this is undone with it)
                region = last.region;
            } else if (mode === "preview") {
                region = await getSelectionBounds(doc.id);
                if (!region) throw new Error("Make a marquee selection first (the preview renders just that area).");
            }
            region = region ? { left: clamp(region.left, 0, W), top: clamp(region.top, 0, H), right: clamp(region.right, 0, W), bottom: clamp(region.bottom, 0, H) } : null;

            // ---- which layers are what
            const all = collectLayers(doc.layers, KS, true);
            let art = all.filter(e => e.shown && e.content && !e.own && !e.paper && !e.tex);
            let selIDs = null;
            if (source === "selected") {
                const sel = allIds(doc.activeLayers || [], {});
                let pick = mode === "update" && last && last.selIDs ? [] : art.filter(e => sel[e.layer.id]);
                if (!pick.length && last && last.selIDs) pick = art.filter(e => last.selIDs.indexOf(e.layer.id) >= 0);   // after a render it is our own result layer that is selected
                art = pick;
                if (!art.length) throw new Error("Select the layers to print (or set Source to All visible layers).");
                selIDs = art.map(e => e.layer.id);
            }
            if (!art.length) throw new Error("There are no visible artwork layers to print. (If an inks-only render hid them, show them again.)");
            art.reverse();   // bottom first: the order of printing
            const papers = all.filter(e => e.paper && e.shown), texes = all.filter(e => e.tex && e.shown);
            const paperOn = en.paper !== false;
            if (s.paper.source === "layer" && paperOn && !papers.length) throw new Error("Paper is set to your own layer, but there is no visible layer whose name starts with \"paper\".");

            // ---- read the artwork. Every layer is hidden, then each is shown alone and read, so masks, effects, type and
            //      shapes all come out as they look. (If the document cannot go transparent, the layer is read directly.)
            const hideEverything = () => { for (const e of all) if (e.layer.visible) { e.layer.visible = false; hidden.push(e.layer); } };
            const full = { left: 0, top: 0, right: W, bottom: H };
            const layers = [], notes = [];
            let whole = false;
            if (source === "merged") {
                whole = true;
                for (const e of all) if ((e.own || e.paper || e.tex) && e.layer.visible) { e.layer.visible = false; hidden.push(e.layer); }
                layers.push({ name: "image", bounds: full, opacity: 1, read: (cb) => readBands(ctx, doc.id, full, bits, null, cb) });
            } else {
                hideEverything();
                for (const e of art) {
                    const b = layerBounds(e.layer, W, H), direct = s.read === "direct";
                    const L = { name: e.name, bounds: b, opacity: 1, entry: e, overprint: e.overprint };
                    L.read = async (cb) => {
                        if (!L.direct) {
                            e.layer.visible = true;
                            let comps = 0; const r = await readBands(ctx, doc.id, b, bits, null, (d, c, x, y, w, h) => { comps = c; if (c === 4) cb(d, c, x, y, w, h); });
                            e.layer.visible = false;
                            if (comps === 4 || !r.bands) return r;
                            L.direct = true;   // no alpha came back: this document has no transparency to isolate a layer on
                            notes.push("'" + L.name + "' was read directly (masks and effects on it are not seen)");
                        }
                        L.opacity = clamp((num(e.layer.opacity) === undefined ? 100 : num(e.layer.opacity)) / 100, 0, 1);
                        return await readBands(ctx, doc.id, b, bits, e.layer.id, cb);
                    };
                    L.direct = direct;
                    layers.push(L);
                }
            }
            // pass 1: what is on each layer
            for (const L of layers) {
                const stt = PL.newStats();
                const r = await L.read((d, c, x, y, w, h) => PL.addStats(stt, d, c, MAXV, w * h, 3));
                L.stats = PL.finishStats(stt);
                const frac = ((L.bounds.right - L.bounds.left) * (L.bounds.bottom - L.bounds.top)) / (W * H);   // the statistics are of the layer's own rectangle
                L.stats.coverage *= frac; L.stats.opaque *= frac;
                if (L.stats.empty) notes.push("'" + L.name + "' came out empty" + (r.error ? " (" + (r.error.message || r.error) + ")" : "") + (L.entry && !L.direct ? "; if it is clipped to another layer, merge the two" : ""));
            }
            const plan = PL.planPlates(layers, s, { whole });
            if (!plan.plates.length) throw new Error("Nothing to print: " + (plan.notes.concat(notes).join("; ") || "the layers are empty") + ".");
            if (plan.plates.length > 16) throw new Error("That would be " + plan.plates.length + " plates. Merge some layers, or use fewer spot colours.");
            // pass 2: make the plates
            const multi = {}; plan.plates.forEach(p => { multi[p.layer] = (multi[p.layer] || 0) + (p.role === "flat" ? 1 : 2); });
            const arrays = { tau: plan.plates.map(() => new Uint8Array(W * H)), foot: layers.map((L, li) => (multi[li] > 1 ? new Uint8Array(W * H) : null)) };
            for (let li = 0; li < layers.length; li++) {
                if (!multi[li]) continue;
                const L = layers[li];
                const r2 = await L.read((d, c, x, y, w, h) => PL.fillBand(plan, li, L.opacity, d, c, MAXV, x, y, w, h, W, H, arrays, s));
                if (r2 && r2.error && r2.bands) notes.push("part of '" + L.name + "' could not be read (" + (r2.error.message || r2.error) + ")");
            }
            const plates = plan.plates.map((p, i) => Object.assign({}, p, { tau: arrays.tau[i], foot: arrays.foot[p.layer], overprint: !!layers[p.layer].overprint }));

            // ---- the user's own paper and ink texture
            let paperLayer = null, inkTexture = null;
            if (s.paper.source === "layer" && paperOn) {
                if (!whole) for (const e of papers) e.layer.visible = true;
                else for (const e of all) { if (e.paper && e.shown) e.layer.visible = true; else if (e.layer.visible) { e.layer.visible = false; hidden.push(e.layer); } }
                const data = new Uint8Array(W * H * 3).fill(255), k = 255 / MAXV;
                await readBands(ctx, doc.id, full, bits, null, (d, c, x, y, w, h) => {
                    for (let yy = 0; yy < h; yy++) { const Y = y + yy; if (Y < 0 || Y >= H) continue; for (let xx = 0; xx < w; xx++) { const X = x + xx; if (X < 0 || X >= W) continue; const o = (yy * w + xx) * c, i = (Y * W + X) * 3, a = c === 4 ? d[o + 3] / MAXV : 1; data[i] = 255 + (d[o] * k - 255) * a; data[i + 1] = 255 + (d[o + 1] * k - 255) * a; data[i + 2] = 255 + (d[o + 2] * k - 255) * a; } }
                });
                for (const e of papers) e.layer.visible = false;
                paperLayer = { data, w: W, h: H };
            }
            const texK = s.inkTexture ? s.inkTexture.strength : 0;
            if (texes.length && texK > 0 && en.faults !== false) {
                for (const e of all) { if (e.tex && e.shown) e.layer.visible = true; else if (e.layer.visible) { e.layer.visible = false; hidden.push(e.layer); } }
                let b = null; for (const e of texes) { const lb = layerBounds(e.layer, W, H); b = b ? { left: Math.min(b.left, lb.left), top: Math.min(b.top, lb.top), right: Math.max(b.right, lb.right), bottom: Math.max(b.bottom, lb.bottom) } : lb; }
                const tw = b.right - b.left, th = b.bottom - b.top, data = new Uint8Array(tw * th), light = s.inkTexture.mode === "light";
                await readBands(ctx, doc.id, b, bits, null, (d, c, x, y, w, h) => {
                    for (let yy = 0; yy < h; yy++) { const Y = y + yy - b.top; if (Y < 0 || Y >= th) continue; for (let xx = 0; xx < w; xx++) { const X = x + xx - b.left; if (X < 0 || X >= tw) continue; const o = (yy * w + xx) * c, a = c === 4 ? d[o + 3] / MAXV : 1, lum = (0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]) / MAXV; data[Y * tw + X] = Math.round(255 * a * (light ? lum : 1 - lum)); } }
                });
                for (const e of texes) e.layer.visible = false;
                if (tw > 8 && th > 8) inkTexture = { data, w: tw, h: th, strength: texK };
            }
            for (const l of hidden) l.visible = true;
            hidden.length = 0;

            // ---- print
            const noPaper = s.paper.source === "none" && paperOn;
            const multiply = noPaper && !region;          // a preview over the artwork would multiply with it: previews are shown on white
            const job = { W, H, ppi, plates, settings: s, enabled: en, region, bits, paperRgb: plan.paperRgb, paperLayer, inkTexture };
            const step = async (frac, label) => { try { ctx.reportProgress({ value: clamp(frac, 0, 1), commandName: label }); } catch (e) {} if (ctx.isCancelled) throw new Error("Cancelled."); await new Promise(res => setTimeout(res, 0)); };
            const runJob = async (only, label, f0, f1) => {
                if (only !== undefined) job.only = only; else delete job.only;
                const g = E.renderSteps(job);
                for (;;) { const n = g.next(); if (n.done) return n.value; await step(f0 + (f1 - f0) * n.value, label); }
            };
            const made = [];
            let rinfo;
            const lname = (region ? "PrintLook preview · " : "PrintLook · ") + lookLabel();
            if (output === "plates" && !region) {
                // each printing on its own Multiply layer (an approximation: opaque inks and the light scattered in the paper are lost)
                const order = E.prepare(job).order, passes = (noPaper ? [] : [-1]).concat(order), n = passes.length;
                for (let k = 0; k < n; k++) {
                    const only = passes[k], nm = only < 0 ? "PrintLook paper" : "PrintLook plate " + (k + (noPaper ? 1 : 0)) + " · " + plates[only].name + " (" + plates[only].ink.label + ")";
                    const r = await runJob(only, nm, k / n, (k + 1) / n); rinfo = r.info;
                    const dst = await newTopLayer(doc, nm); await putResult(doc, dst, r);
                    if (only >= 0) dst.blendMode = constants.BlendMode.MULTIPLY;
                    made.push(dst.id);
                }
            } else {
                const r = await runJob(undefined, "PrintLook", 0, 1); rinfo = r.info;
                const dst = await newTopLayer(doc, lname); await putResult(doc, dst, r);
                if (multiply) dst.blendMode = constants.BlendMode.MULTIPLY;
                if (strength < 100) await setOpacity(doc.id, dst.id, strength);
                made.push(dst.id);
            }
            let hiddenIDs = [];
            if (region) { for (const l of reshown) l.visible = false; hiddenIDs = reshown.map(l => l.id); }   // a preview leaves the document as it found it
            if (multiply || (output === "plates" && !region && noPaper)) {
                // the inks are on Multiply with no paper of their own: the artwork they were made from has to get out of the way
                const src = (whole ? all.filter(e => e.shown && e.content && !e.own && !e.paper && !e.tex) : art.filter((e, li) => multi[li])).concat(texes);   // a layer taken as the sheet stays
                for (const e of src) if (e.layer.visible) { e.layer.visible = false; hiddenIDs.push(e.layer.id); }
                for (const e of all) if (e.own && e.layer.visible) e.layer.visible = false;   // an earlier result would multiply with this one
            }
            if (selIDs) await selectLayers(selIDs);
            lastResults[doc.id] = { docID: doc.id, layerIDs: made, region, hiddenIDs, selIDs: selIDs || (last && last.selIDs) || null }; ok = true;
            const um = rinfo.um;
            if (um > 130) notes.push("at " + Math.round(ppi) + " ppi" + (s.scale !== 1 ? " and Detail scale " + s.scale : "") + " one pixel is " + um.toFixed(0) + " µm of paper, too coarse to show most of what the process does; set the document's real resolution (Image > Image Size with Resample off) or raise Detail scale");
            const plateList = rinfo.order.map((nm, i) => { const p = plates.find(q => q.name === nm); return (i + 1) + ". " + nm + (p && nm.indexOf(p.ink.label) < 0 ? " - " + p.ink.label : ""); });
            info = (region ? (region.right - region.left) + "×" + (region.bottom - region.top) + " preview" : W + "×" + H) + (bits === 16 ? " (16-bit)" : "") + ", 1 px = " + um.toFixed(0) + " µm"
                + "\nPrinted: " + plateList.join("; ")
                + (hiddenIDs.length && !region ? "\nThe inks are on a Multiply layer; " + hiddenIDs.length + " artwork layer" + (hiddenIDs.length > 1 ? "s were" : " was") + " hidden so your paper shows through." : "")
                + (noPaper && region ? "\nPreview shown on white (a full render goes on a Multiply layer)." : "")
                + (plan.notes.concat(notes, rinfo.notes).length ? "\nNotes: " + plan.notes.concat(notes, rinfo.notes).join("; ") + "." : "");
        } finally {
            for (const l of hidden) { try { l.visible = true; } catch (e) {} }
            if (!ok) for (const l of reshown) { try { l.visible = false; } catch (e) {} }
            try { await ctx.hostControl.resumeHistory(suspensionID, ok); } catch (e) {}   // a failed or cancelled run is rolled back whole
        }
    }, { commandName: "PrintLook" }); }
    catch (err) {
        // After a cancel Photoshop refuses further changes inside that modal scope, and the roll-back may not cover layer
        // visibility: put the layers back as they were in a scope of their own.
        if (hidden.length || reshown.length) {
            try { await core.executeAsModal(async () => { for (const l of hidden) { try { if (!l.visible) l.visible = true; } catch (e) {} } for (const l of reshown) { try { if (l.visible) l.visible = false; } catch (e) {} } }, { commandName: "PrintLook: restore layers" }); } catch (e) {}
        }
        throw err;
    }
    return info.replace("\n", ", " + ((Date.now() - t0) / 1000).toFixed(1) + "s\n");
}

async function run(mode) {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = true;
    setStatus(mode === "preview" ? "Printing the preview…" : "Printing…");
    try { const r = await render(mode); setStatus("Done: " + r); }
    catch (e) { setStatus("Error: " + (e && e.message ? e.message : e), true); }
    finally { for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = false; }
}

// ------------------------------------------------------------------ user presets

const PRESET_FILE = "presets.json";
let presets = {};
async function presetFolder() { return await require("uxp").storage.localFileSystem.getDataFolder(); }
async function loadPresets() {
    try { const f = await (await presetFolder()).getEntry(PRESET_FILE); presets = JSON.parse(await f.read()) || {}; }
    catch (e) { try { presets = JSON.parse(localStorage.getItem("printlook.presets") || "{}"); } catch (e2) { presets = {}; } }
    refreshPresetList();
}
async function storePresets() {
    try { localStorage.setItem("printlook.presets", JSON.stringify(presets)); } catch (e) {}
    const file = await (await presetFolder()).createFile(PRESET_FILE, { overwrite: true });
    await file.write(JSON.stringify(presets, null, 1));
}
function refreshPresetList(selectName) {
    const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
    fillSelect($("presetSel"), [["none", "(none)"]].concat(names.map(n => [n, n])));
    $("presetSel").value = selectName && presets[selectName] ? selectName : "none";
}
$("presetSel").addEventListener("change", () => {
    const name = $("presetSel").value; if (!name || name === "none" || !presets[name]) return;
    const p = presets[name];
    st = mergeDeep(baseState(), p.st); if (!D.PROCESSES[st.process]) st.process = "letterpress_job";
    enabled = Object.assign({}, p.enabled || {}); currentLook = p.look || ""; modified = true;
    syncUI(); saveState();
    $("presetName").value = name; setStatus("Loaded preset “" + name + "”.");
});
$("presetSaveBtn").addEventListener("click", async () => {
    const name = $("presetName").value.trim() || ($("presetSel").value === "none" ? "" : $("presetSel").value);
    if (!name) { setStatus("Type a name for the preset first.", true); return; }
    presets[name] = { st: deep(st), enabled: deep(enabled), look: currentLook };
    try { await storePresets(); refreshPresetList(name); setStatus("Saved preset “" + name + "”."); }
    catch (e) { setStatus("Could not save preset: " + (e.message || e), true); }
});
$("presetDeleteBtn").addEventListener("click", async () => {
    const name = $("presetSel").value; if (!name || name === "none") { setStatus("Choose a saved preset to delete.", true); return; }
    delete presets[name];
    try { await storePresets(); refreshPresetList(); setStatus("Deleted preset “" + name + "”."); }
    catch (e) { setStatus("Could not delete preset: " + (e.message || e), true); }
});

// ------------------------------------------------------------------ wiring

buildUI();
$("group").addEventListener("change", () => { fillLooks(); saveState(); });
$("look").addEventListener("change", () => { const v = $("look").value; if (v.indexOf("__") === 0) { syncUI(); return; } applyLook(v === "custom" ? "" : v); });
$("renderBtn").addEventListener("click", () => run("full"));
$("previewBtn").addEventListener("click", () => run("preview"));
$("updateBtn").addEventListener("click", () => run("update"));
$("seedBtn").addEventListener("click", () => { st.seed = 1 + ((Math.random() * 1e6) | 0); saveState(); setStatus("A new impression: different register, grain and faults. Press Render or Re-render last."); });
for (const id of ["source", "output"]) $(id).addEventListener("change", saveState);
$("strength").addEventListener("input", () => { $("strengthVal").textContent = $("strength").value; });
$("strength").addEventListener("change", async () => {
    saveState();
    if (app.documents.length === 0) return;
    const v = parseInt($("strength").value, 10);
    try {
        await core.executeAsModal(async () => {
            const doc = app.activeDocument, last = lastResults[doc.id]; if (!last || !last.layerIDs || last.layerIDs.length !== 1) return;
            if (findLayer(doc.layers, last.layerIDs[0])) await setOpacity(doc.id, last.layerIDs[0], v);
        }, { commandName: "PrintLook strength" });
    } catch (e) {}
});

$("group").value = "all"; $("source").value = "layers"; $("output").value = "layer"; $("presetSel").value = "none";
if (!loadState()) { const first = LOOKS.find(l => l.id === "uk-1950-variety-bill-electric-modern") || LOOKS.find(l => l.group === "Britain") || LOOKS[0]; if (first) applyLook(first.id); }
syncUI();
loadPresets();
