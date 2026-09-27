// FilmLook - UXP panel
// Film emulation for Photoshop: stock/process, format/gate, lens, print
// condition and film presets. The engine (engine.js) does the pixel work.

const { app, core, action, imaging, constants } = require("photoshop");
const batchPlay = action.batchPlay;
const E = require("./engine.js");
const P = require("./presets.js");
require("./films.js");
require("./calibration.js");

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }

// ------------------------------------------------------------------ state

let opts = E.merge({});
let current = { film: "", process: "", format: "", lens: "", condition: "", tint: "none", tone: "none", fringe: "none" };
let modified = false;
const ALL_ON = { process: true, format: true, lens: true, grain: true, condition: true, grade: true, fringe: true };
let enabled = Object.assign({}, ALL_ON);   // section on/off switches (multi-effect use)
let lastResult = null;   // { docID, layerID, region }

// ------------------------------------------------------------------ controls
// kind: slider | select. For sliders: key (opts key), idx (array index),
// or get/set for derived controls.

function fadeGet() { return clamp((1 - opts.fade[0]) / 0.45, 0, 1); }
function fadeSet(v) { opts.fade = [1 - 0.45 * v, 1, 1 - 0.25 * v]; }
function warmGet() { return (opts.gradeGain[0] - opts.gradeGain[2]) / 0.16; }
function greenGet() { return (opts.gradeGain[1] - (opts.gradeGain[0] + opts.gradeGain[2]) / 2) / 0.06; }
function gainSet(w, g) { opts.gradeGain = [1 + w * 0.08, 1 + g * 0.06, 1 - w * 0.08]; }

const optList = (obj) => Object.keys(obj).map((k) => [k, obj[k].label]);

const SECTIONS = [
    { key: "process", title: "Stock & process", open: true, items: [
        { kind: "select", id: "process", label: "Stock", options: () => [["", "(custom)"]].concat(optList(P.PROCESSES)), block: "process" },
        { kind: "select", id: "bwFilter", label: "B&W filter", key: "bwFilter", options: () => [["none", "None"], ["yellow", "Yellow (K2 / Aero 1)"], ["deepyellow", "Deep yellow (G)"], ["orange", "Orange (21 / 23A)"], ["red", "Red (25)"], ["green", "Green (X1)"], ["blue", "Blue"]] },
        { kind: "select", id: "tone", label: "Toning (darks)", options: () => optList(P.TONES), block: "tone" },
        { kind: "slider", id: "toneAmount", label: "Toning amount", key: "toneAmount", min: 0, max: 1, step: 0.01 },
        { kind: "select", id: "tint", label: "Tinting (lights)", options: () => optList(P.TINTS), block: "tint" },
        { kind: "slider", id: "tintAmount", label: "Tint amount", key: "tintAmount", min: 0, max: 1.5, step: 0.01 },
        { kind: "slider", id: "exposure", label: "Exposure (stops)", key: "exposure", min: -3, max: 3, step: 0.05 },
        { kind: "slider", id: "contrast", label: "Contrast (gamma)", key: "contrast", min: 0.5, max: 2.2, step: 0.01 },
        { kind: "slider", id: "latitude", label: "Latitude (toe/shoulder)", key: "latitude", min: 0.6, max: 1.8, step: 0.01 },
        { kind: "slider", id: "saturation", label: "Colour separation", key: "saturation", min: 0, max: 1.8, step: 0.01 },
        { kind: "slider", id: "dmax", label: "Black density", key: "dmax", min: 1.4, max: 3.4, step: 0.01 },
        { kind: "slider", id: "dmin", label: "Base fog", key: "dmin", min: 0, max: 0.4, step: 0.005 },
        { kind: "slider", id: "timR", label: "Printer light R", key: "timing", idx: 0, min: -16, max: 16, step: 0.5 },
        { kind: "slider", id: "timG", label: "Printer light G", key: "timing", idx: 1, min: -16, max: 16, step: 0.5 },
        { kind: "slider", id: "timB", label: "Printer light B", key: "timing", idx: 2, min: -16, max: 16, step: 0.5 },
        { kind: "slider", id: "flash", label: "Flashing", key: "flash", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "push", label: "Push / pull (stops)", key: "push", min: -1, max: 3, step: 0.25 },
        { kind: "slider", id: "bleach", label: "Silver retention", key: "bleach", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "fadeAmt", label: "Dye fade", get: fadeGet, set: fadeSet, min: 0, max: 1, step: 0.01 }
    ], hint: "Printer lights are in printer points (about 1/12 stop each); + gives more of that colour. Colour separation 1 = the stock as made. Flashing lifts shadows and mutes colour, as on The Long Goodbye. Silver retention = bleach bypass." },
    { key: "format", title: "Format & gate", open: true, items: [
        { kind: "select", id: "format", label: "Gauge / format", options: () => [["", "(custom)"]].concat(optList(P.FORMATS)), block: "format" },
        { kind: "slider", id: "aspect", label: "Aspect ratio", key: "aspect", min: 1.0, max: 2.8, step: 0.01 },
        { kind: "slider", id: "gateMm", label: "Frame width (mm)", key: "gateMm", min: 3, max: 60, step: 0.1 },
        { kind: "slider", id: "sharpness", label: "Resolving power", key: "sharpness", min: 0.2, max: 3, step: 0.05 },
        { kind: "slider", id: "corner", label: "Gate corner radius", key: "corner", min: 0, max: 0.12, step: 0.002 },
        { kind: "slider", id: "gateSoft", label: "Gate edge softness", key: "gateSoft", min: 0, max: 0.04, step: 0.001 },
        { kind: "slider", id: "iris", label: "Iris / soft matte", key: "iris", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "irisSize", label: "Iris size", key: "irisSize", min: 0.4, max: 1.8, step: 0.01 },
        { kind: "slider", id: "irisSoft", label: "Iris softness", key: "irisSoft", min: 0.02, max: 1, step: 0.01 }
    ], hint: "Grain, halation and softness scale with the frame width in mm, so Super 8 is coarse and 70mm is fine at any image size. Gate corners and matte show when Frame is set to matte or crop. The iris is the silent-era oval or circular vignette." },
    { key: "lens", title: "Lens & light", open: false, items: [
        { kind: "select", id: "lens", label: "Lens", options: () => [["", "(custom)"]].concat(optList(P.LENSES)), block: "lens" },
        { kind: "slider", id: "halation", label: "Halation", key: "halation", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "diffusion", label: "Diffusion / glow", key: "diffusion", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "lowcon", label: "Low-con / smoke", key: "lowcon", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "streak", label: "Anamorphic streaks", key: "streak", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "vignette", label: "Vignette", key: "vignette", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "edgeSoft", label: "Edge softness", key: "edgeSoft", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "ca", label: "Colour fringing", key: "ca", min: 0, max: 1, step: 0.01 }
    ] },
    { key: "grain", title: "Grain", open: false, items: [
        { kind: "slider", id: "grain", label: "Grain amount", key: "grain", min: 0, max: 2.5, step: 0.01 },
        { kind: "slider", id: "grainClumpMm", label: "Grain size (µm)", key: "grainClumpMm", min: 0.003, max: 0.035, step: 0.0005, scale: 1000 },
        { kind: "slider", id: "grainColor", label: "Colour grain", key: "grainColor", min: 0, max: 1, step: 0.01 }
    ], hint: "Grain is added to the negative's exposure, so the curve shapes it: strongest in mid-tones, quiet in deep shadows and bright highlights." },
    { key: "condition", title: "Print condition", open: false, items: [
        { kind: "select", id: "condition", label: "Condition", options: () => [["", "(custom)"]].concat(optList(P.CONDITIONS)), block: "condition" },
        { kind: "slider", id: "generations", label: "Duplicate generations", key: "generations", min: 0, max: 4, step: 0.25 },
        { kind: "slider", id: "dustWhite", label: "Dust (white)", key: "dustWhite", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "dustBlack", label: "Dirt & hairs (black)", key: "dustBlack", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "scratches", label: "Scratches", key: "scratches", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "flicker", label: "Uneven density", key: "flicker", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "stains", label: "Stains / mould", key: "stains", min: 0, max: 1, step: 0.01 }
    ] },
    { key: "grade", title: "Transfer grade", open: false, items: [
        { kind: "slider", id: "gradeSat", label: "Saturation", key: "gradeSat", min: 0, max: 1.8, step: 0.01 },
        { kind: "slider", id: "gradeBlack", label: "Black lift / crush", key: "gradeBlack", min: -0.1, max: 0.2, step: 0.002 },
        { kind: "slider", id: "gradeWhite", label: "White level", key: "gradeWhite", min: 0.5, max: 1.1, step: 0.005 },
        { kind: "slider", id: "warmth", label: "Warm / cool", get: warmGet, set: (v) => gainSet(v, greenGet()), min: -2, max: 2, step: 0.05 },
        { kind: "slider", id: "green", label: "Green / magenta", get: greenGet, set: (v) => gainSet(warmGet(), v), min: -2, max: 2, step: 0.05 }
    ], hint: "A final video-style grade, for matching how a modern restoration looks (Blade Runner's cooler Final Cut, the 2014 yellow Good, Bad and Ugly)." },
    { key: "fringe", title: "Fringing (after the look)", open: false, items: [
        { kind: "select", id: "fringe", label: "Fringing preset", options: () => optList(P.FRINGES), block: "fringe" },
        { kind: "slider", id: "fringeLat", label: "Lateral fringing", key: "fringeLat", min: 0, max: 1.5, step: 0.01 },
        { kind: "select", id: "fringeMode", label: "Lateral colours", key: "fringeMode", options: () => [["rc", "Red/cyan + blue/yellow"], ["pg", "Purple/green"]] },
        { kind: "slider", id: "fringeAniso", label: "Horizontal only", key: "fringeAniso", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "fringeAxial", label: "Purple halo (axial)", key: "fringeAxial", min: 0, max: 1, step: 0.01 },
        { kind: "slider", id: "fringeAxialR", label: "Halo width", key: "fringeAxialR", min: 0.0005, max: 0.012, step: 0.0005, scale: 1000 },
        { kind: "slider", id: "fringeRx", label: "Red record shift X", key: "fringeRx", min: -5, max: 5, step: 0.05 },
        { kind: "slider", id: "fringeRy", label: "Red record shift Y", key: "fringeRy", min: -5, max: 5, step: 0.05 },
        { kind: "slider", id: "fringeBx", label: "Blue record shift X", key: "fringeBx", min: -5, max: 5, step: 0.05 },
        { kind: "slider", id: "fringeBy", label: "Blue record shift Y", key: "fringeBy", min: -5, max: 5, step: 0.05 }
    ], hint: "Colour errors added after the look: lateral fringing grows toward the corners (lens), the purple halo sits around bright edges (fast lenses wide open), record shifts move a whole colour layer off register (print misregistration; units are thousandths of the image width). Included in Render when set; use Fringe selected layer to add it to an existing layer instead. Presets are characteristic approximations, not measurements of particular lenses." }
];

const ITEMS = {};
for (const s of SECTIONS) for (const it of s.items) ITEMS[it.id] = it;

function fmt(v, it) {
    const x = v * (it.scale || 1);
    const st = it.step * (it.scale || 1);
    const d = st >= 1 ? 0 : (st >= 0.1 ? 1 : (st >= 0.01 ? 2 : 3));
    return x.toFixed(d);
}

function getVal(it) {
    if (it.get) return it.get();
    const v = opts[it.key];
    return it.idx !== undefined ? v[it.idx] : v;
}
function setVal(it, v) {
    if (it.set) { it.set(v); return; }
    if (it.idx !== undefined) { const a = opts[it.key].slice(); a[it.idx] = v; opts[it.key] = a; }
    else opts[it.key] = v;
}

function buildUI() {
    const host = $("sections");
    for (const sec of SECTIONS) {
        const h = document.createElement("h2");
        const tw = document.createElement("span"); tw.className = "tw"; tw.textContent = sec.open ? "▾" : "▸";
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "en_" + sec.key; cb.checked = true;
        cb.title = "Switch this stage on or off";
        cb.style.marginRight = "6px";
        cb.addEventListener("click", (e) => e.stopPropagation());
        cb.addEventListener("change", () => { enabled[sec.key] = cb.checked; markModified(); showOff(); saveState(); });
        h.appendChild(cb); h.appendChild(tw); h.appendChild(document.createTextNode(sec.title));
        const off = document.createElement("span"); off.id = "off_" + sec.key; off.className = "offtag"; off.textContent = "  off";
        h.appendChild(off);
        const body = document.createElement("div");
        body.style.display = sec.open ? "block" : "none";
        h.addEventListener("click", () => {
            const open = body.style.display === "none";
            body.style.display = open ? "block" : "none";
            tw.textContent = open ? "▾" : "▸";
        });
        host.appendChild(h); host.appendChild(body);
        for (const it of sec.items) {
            const row = document.createElement("div"); row.className = "row";
            const lab = document.createElement("label"); lab.textContent = it.label; row.appendChild(lab);
            if (it.kind === "select") {
                const sel = document.createElement("select"); sel.id = it.id;
                for (const [v, t] of it.options()) { const op = document.createElement("option"); op.value = v; op.textContent = t; sel.appendChild(op); }
                sel.addEventListener("change", () => onSelect(it, sel.value));
                row.appendChild(sel);
            } else {
                const r = document.createElement("input"); r.type = "range"; r.id = it.id;
                const n = Math.round((it.max - it.min) / it.step);
                r.min = "0"; r.max = "" + n; r.step = "1";
                const val = document.createElement("span"); val.className = "val"; val.id = it.id + "Val";
                r.addEventListener("input", () => {
                    const v = it.min + parseInt(r.value, 10) * it.step;
                    setVal(it, v); val.textContent = fmt(v, it);
                    markModified();
                });
                r.addEventListener("change", saveState);
                row.appendChild(r); row.appendChild(val);
            }
            body.appendChild(row);
        }
        if (sec.hint) { const hn = document.createElement("div"); hn.className = "hint"; hn.textContent = sec.hint; body.appendChild(hn); }
    }
    // film list
    const fs = $("film");
    const none = document.createElement("option"); none.value = ""; none.textContent = "(custom settings)"; fs.appendChild(none);
    for (const f of P.FILMS) {
        const op = document.createElement("option"); op.value = f.id;
        op.textContent = f.year + "  " + f.title + (f.variant ? "  ·  " + f.variant : "");
        fs.appendChild(op);
    }
    const ph = $("presetsHead"), pb = $("presetsBody");
    ph.addEventListener("click", () => {
        const open = pb.style.display === "none";
        pb.style.display = open ? "block" : "none";
        ph.firstChild.textContent = open ? "▾" : "▸";
    });
}

function syncUI() {
    for (const id in ITEMS) {
        const it = ITEMS[id], el = $(id);
        if (!el) continue;
        if (it.kind === "select") {
            if (it.block) el.value = current[it.block] || "";
            else el.value = opts[it.key];
        } else {
            const v = getVal(it);
            el.value = "" + Math.round((clamp(v, it.min, it.max) - it.min) / it.step);
            $(id + "Val").textContent = fmt(v, it);
        }
    }
    $("film").value = current.film || "";
    showOff();
    showNote();
}

function showOff() {
    for (const k in ALL_ON) {
        const cb = $("en_" + k), t = $("off_" + k);
        if (cb) cb.checked = enabled[k] !== false;
        if (t) t.style.display = enabled[k] === false ? "inline" : "none";
    }
}

function showNote() {
    const f = P.FILMS.find((x) => x.id === current.film);
    const n = $("note");
    if (!f) { n.textContent = modified ? "Custom settings." : ""; n.className = ""; return; }
    const cal = (P.CALIBRATED || []).indexOf(f.id) >= 0 ? " [Calibrated to reference frames of the current transfer.]" :
                ((P.DERIVED || []).indexOf(f.id) >= 0 ? " [Levels matched to reference frames via a sibling variant.]" : " [Research-based; not calibrated to frames.]");
    n.textContent = (modified ? "Modified from preset. " : "") + f.note + cal;
    n.className = modified ? "modified" : "";
}

function markModified() { if (!modified) { modified = true; showNote(); } }

// ------------------------------------------------------------------ selection handlers

function applyFilm(id) {
    const f = P.FILMS.find((x) => x.id === id);
    if (!f) { current.film = ""; modified = true; syncUI(); saveState(); return; }
    const keepFrame = opts.frame;
    const keepFringe = {};
    for (const k in P.FRINGES.none.p) keepFringe[k] = opts[k];
    keepFringe.fringeAxialR = opts.fringeAxialR;
    opts = E.merge(P.assemble(f));
    opts.frame = keepFrame;
    Object.assign(opts, keepFringe);
    enabled = Object.assign({}, ALL_ON);
    current = { film: f.id, process: f.process, format: f.format, lens: f.lens, condition: f.condition,
                tint: f.tint || "none", tone: f.tone || "none", fringe: current.fringe || "none" };
    modified = false;
    syncUI(); saveState();
}

function onSelect(it, value) {
    if (it.block) {
        current[it.block] = value;
        if (value) {
            if (it.block === "tint") { opts.tint = P.TINTS[value].d.slice(); opts.tintAmount = value === "none" ? 0 : 1; }
            else if (it.block === "tone") { opts.tone = P.TONES[value].v.slice(); opts.toneAmount = value === "none" ? 0 : 1; }
            else if (it.block === "fringe") { Object.assign(opts, deep(P.FRINGES[value].p)); }
            else {
                const table = { process: P.PROCESSES, format: P.FORMATS, lens: P.LENSES, condition: P.CONDITIONS }[it.block];
                const p = deep(table[value].p);
                if (it.block === "process") {
                    // a stock change resets process-only settings the stock does not define
                    for (const k of ["push", "flash", "bleach", "bwFilter"]) if (!(k in p)) opts[k] = E.DEFAULTS[k];
                    if (!("fade" in p)) opts.fade = [1, 1, 1];
                    if (!("timing" in p)) opts.timing = [0, 0, 0];
                }
                Object.assign(opts, p);
            }
        }
    } else {
        opts[it.key] = value;
    }
    markModified();
    syncUI(); saveState();
}

// ------------------------------------------------------------------ persistence

function saveState() {
    try { localStorage.setItem("filmlook.state", JSON.stringify({ opts, current, modified,
        strength: $("strength").value, source: $("source").value, frame: $("frame").value,
        shiftX: $("shiftX").value, shiftY: $("shiftY").value, enabled })); } catch (e) {}
}
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem("filmlook.state") || "null");
        if (!s) return false;
        opts = E.merge(s.opts); current = s.current; modified = s.modified;
        if (!current.fringe) current.fringe = "none";
        enabled = Object.assign({}, ALL_ON, s.enabled || {});
        $("strength").value = s.strength || "100"; $("strengthVal").textContent = $("strength").value;
        $("source").value = s.source || "merged"; $("frame").value = s.frame || "none";
        $("shiftX").value = s.shiftX || "0"; $("shiftY").value = s.shiftY || "0";
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

function filmLabel() {
    const f = P.FILMS.find((x) => x.id === current.film);
    if (!f) return "custom";
    return f.title + (f.variant ? " (" + f.variant + ")" : "") + (modified ? " *" : "");
}

function allLayers(layers, out) {
    out = out || [];
    for (const l of layers) { out.push(l); if (l.layers && l.layers.length) allLayers(l.layers, out); }
    return out;
}

async function setOpacity(docID, layerID, pct) {
    await batchPlay([{ _obj: "set", _target: [{ _ref: "layer", _id: layerID }, { _ref: "document", _id: docID }],
        to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: pct } } }], {});
}

// ------------------------------------------------------------------ render

async function render(mode) {
    // mode: "full" | "preview" | "update"
    const t0 = Date.now();
    let info = "";
    const o = deep(opts);
    const frame = $("frame").value;
    const source = $("source").value;
    const strength = parseInt($("strength").value, 10);
    const shift = { x: parseFloat($("shiftX").value) || 0, y: parseFloat($("shiftY").value) || 0 };
    applySwitches(o);
    o.frame = (frame === "none" || !enabled.format) ? "none" : "matte";   // crop = matte, then trim the canvas
    o.amount = 1;

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "FilmLook" });
        const hidden = [];
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("FilmLook works on RGB documents (Image > Mode > RGB Color).");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 :
                         (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit first.");

            // re-render: remove the previous result first
            let region = null;
            if (mode === "update") {
                if (!lastResult || lastResult.docID !== doc.id) throw new Error("Nothing to re-render in this document yet.");
                const old = allLayers(doc.layers).find((l) => l.id === lastResult.layerID);
                if (old) await old.delete();
                region = lastResult.region;
            } else if (mode === "preview") {
                region = await getSelectionBounds(doc.id);
                if (!region) throw new Error("Make a marquee selection first (the preview renders just that area).");
            }

            const docW = Math.round(doc.width), docH = Math.round(doc.height);   // pixels (docs are px-based in UXP)
            let src = null;
            if (source === "layer") {
                src = doc.activeLayers[0];
                if (!src) throw new Error("Select a layer first, or set Source to Whole image.");
                if (src.kind === constants.LayerKind.GROUP) throw new Error("Select a pixel layer, not a group.");
            } else {
                for (const l of allLayers(doc.layers)) if (l.name.indexOf("FilmLook") === 0 && l.visible) { l.visible = false; hidden.push(l); }
            }

            // image shift: read the area that will land inside the target after moving
            const dx = Math.round(shift.x), dy = Math.round(shift.y);
            const shifting = dx !== 0 || dy !== 0;
            const req = { documentID: doc.id, componentSize: bits, colorSpace: "RGB" };
            if (src) req.layerID = src.id;
            let target = region;
            if (shifting) {
                if (!target) target = { left: 0, top: 0, right: docW, bottom: docH };
                const s = { left: Math.max(0, target.left - dx), top: Math.max(0, target.top - dy),
                            right: Math.min(docW, target.right - dx), bottom: Math.min(docH, target.bottom - dy) };
                if (s.right - s.left < 1 || s.bottom - s.top < 1) throw new Error("The shift moves the image completely out of the frame.");
                req.sourceBounds = s;
            } else if (region) req.sourceBounds = region;
            const got = await imaging.getPixels(req);
            const img = got.imageData;
            const gW = img.width, gH = img.height, comps = img.components;
            const gb = got.sourceBounds;
            let data = await img.getData({ chunky: true });
            img.dispose();
            for (const l of hidden) l.visible = true;
            hidden.length = 0;

            let W = gW, H = gH, sb = gb;
            if (shifting) {
                // place the read pixels, moved by (dx, dy), into a black target-sized buffer
                W = target.right - target.left; H = target.bottom - target.top;
                sb = { left: target.left, top: target.top };
                const MAXV = bits === 16 ? 32768 : 255;
                const buf = bits === 16 ? new Uint16Array(W * H * comps) : new Uint8Array(W * H * comps);
                if (comps === 4) for (let i = 3; i < buf.length; i += 4) buf[i] = MAXV;
                const ox = gb.left + dx - target.left, oy = gb.top + dy - target.top;
                for (let y = 0; y < gH; y++) {
                    const ty = y + oy; if (ty < 0 || ty >= H) continue;
                    const x0 = Math.max(0, -ox), x1 = Math.min(gW, W - ox);
                    if (x1 <= x0) continue;
                    buf.set(data.subarray((y * gW + x0) * comps, (y * gW + x1) * comps), (ty * W + x0 + ox) * comps);
                }
                data = buf;
            }

            const out = E.render(data, W, H, comps, o, { docW, docH, offX: sb.left, offY: sb.top });

            // new layer: above the source layer, or at the very top for merged
            const lname = (region ? "FilmLook preview · " : "FilmLook · ") + filmLabel();
            const anchor = src ? src : doc.layers[0];
            await batchPlay([
                { _obj: "select", _target: [{ _ref: "layer", _id: anchor.id }], makeVisible: false },
                { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: lname } }
            ], {});
            const dst = doc.activeLayers[0];
            if (!src) {
                const top = doc.layers[0];
                if (top && top.id !== dst.id) await dst.move(top, constants.ElementPlacement.PLACEBEFORE);
            }
            const outImg = await imaging.createImageDataFromBuffer(out, {
                width: W, height: H, components: 4, colorSpace: "RGB", chunky: true
            });
            await imaging.putPixels({ documentID: doc.id, layerID: dst.id, imageData: outImg,
                targetBounds: { left: sb.left, top: sb.top }, replace: true });
            outImg.dispose();
            if (strength < 100) await setOpacity(doc.id, dst.id, strength);

            if (frame === "crop" && !region && enabled.format) {
                const ar = o.aspect, dar = docW / docH;
                let nw = docW, nh = docH;
                if (ar > dar) nh = Math.round(docW / ar); else nw = Math.round(docH * ar);
                if (nw !== docW || nh !== docH) {
                    await doc.resizeCanvas(nw, nh, constants.AnchorPosition.MIDDLECENTER);
                    info += "canvas " + nw + "×" + nh + ", ";
                }
            }
            lastResult = { docID: doc.id, layerID: dst.id, region: mode === "preview" ? region : (mode === "update" ? region : null) };
            info += W + "×" + H + (bits === 16 ? " (16-bit)" : "");
        } finally {
            for (const l of hidden) { try { l.visible = true; } catch (e) {} }
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "FilmLook" });
    return info + ", " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

// Section switches: a switched-off stage is neutralised before the engine runs.
function applySwitches(o) {
    const zero = (keys) => { for (const k of keys) o[k] = 0; };
    if (!enabled.process) o.bypassProcess = true;
    if (!enabled.format) { o.lpmm = 1e6; o.iris = 0; }
    if (!enabled.lens) zero(["halation", "diffusion", "lowcon", "streak", "vignette", "edgeSoft", "ca"]);
    if (!enabled.grain) o.grain = 0;
    if (!enabled.condition) zero(["generations", "dustWhite", "dustBlack", "scratches", "flicker", "stains"]);
    if (!enabled.grade) { o.gradeSat = 1; o.gradeBlack = 0; o.gradeWhite = 1; o.gradeGain = [1, 1, 1]; o.gradeLift = [0, 0, 0]; }
    if (!enabled.fringe) zero(["fringeLat", "fringeAxial", "fringeRx", "fringeRy", "fringeBx", "fringeBy"]);
    return o;
}

async function fringeLayer() {
    const t0 = Date.now();
    const o = deep(opts);
    if (!E.hasFringe(o)) throw new Error("Set some fringing first (choose a fringing preset or move a slider).");
    let info = "";
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "FilmLook fringing" });
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("FilmLook works on RGB documents.");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 :
                         (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit first.");
            const src = doc.activeLayers[0];
            if (!src || src.kind === constants.LayerKind.GROUP) throw new Error("Select a pixel layer (for example a FilmLook render).");
            const got = await imaging.getPixels({ documentID: doc.id, layerID: src.id, componentSize: bits, colorSpace: "RGB" });
            const img = got.imageData;
            const W = img.width, H = img.height, comps = img.components;
            const sb = got.sourceBounds;
            const data = await img.getData({ chunky: true });
            img.dispose();
            const MAXV = bits === 16 ? 32768 : 255;
            let buf = data;
            if (comps !== 4) {
                buf = bits === 16 ? new Uint16Array(W * H * 4) : new Uint8Array(W * H * 4);
                for (let i = 0, j = 0; i < W * H; i++, j += comps) { buf[i * 4] = data[j]; buf[i * 4 + 1] = data[j + 1]; buf[i * 4 + 2] = data[j + 2]; buf[i * 4 + 3] = MAXV; }
            }
            E.fringe(buf, W, H, o, { docW: Math.round(doc.width), docH: Math.round(doc.height), offX: sb.left, offY: sb.top });
            await batchPlay([
                { _obj: "select", _target: [{ _ref: "layer", _id: src.id }], makeVisible: false },
                { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: "FilmLook fringing · " + src.name } }
            ], {});
            const dst = doc.activeLayers[0];
            const outImg = await imaging.createImageDataFromBuffer(buf, { width: W, height: H, components: 4, colorSpace: "RGB", chunky: true });
            await imaging.putPixels({ documentID: doc.id, layerID: dst.id, imageData: outImg, targetBounds: { left: sb.left, top: sb.top }, replace: true });
            outImg.dispose();
            info = W + "×" + H;
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "FilmLook fringing" });
    return info + ", " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

async function run(mode) {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    for (const b of ["renderBtn", "previewBtn", "updateBtn", "fringeBtn"]) $(b).disabled = true;
    setStatus(mode === "preview" ? "Rendering preview…" : (mode === "fringe" ? "Adding fringing…" : "Rendering…"));
    try {
        const r = mode === "fringe" ? await fringeLayer() : await render(mode);
        setStatus("Done: " + r);
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        for (const b of ["renderBtn", "previewBtn", "updateBtn", "fringeBtn"]) $(b).disabled = false;
    }
}

// ------------------------------------------------------------------ user presets

const PRESET_FILE = "presets.json";
let presets = {};
async function presetFolder() { return await require("uxp").storage.localFileSystem.getDataFolder(); }
async function loadPresets() {
    try { const f = await (await presetFolder()).getEntry(PRESET_FILE); presets = JSON.parse(await f.read()) || {}; }
    catch (e) { try { presets = JSON.parse(localStorage.getItem("filmlook.presets") || "{}"); } catch (e2) { presets = {}; } }
    refreshPresetList();
}
async function storePresets() {
    try { localStorage.setItem("filmlook.presets", JSON.stringify(presets)); } catch (e) {}
    const file = await (await presetFolder()).createFile(PRESET_FILE, { overwrite: true });
    await file.write(JSON.stringify(presets, null, 1));
}
function refreshPresetList(selectName) {
    const sel = $("presetSel");
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    const none = document.createElement("option"); none.value = ""; none.textContent = "(none)"; sel.appendChild(none);
    for (const name of Object.keys(presets).sort((a, b) => a.localeCompare(b))) {
        const op = document.createElement("option"); op.value = name; op.textContent = name; sel.appendChild(op);
    }
    sel.value = selectName && presets[selectName] ? selectName : "";
}

$("presetSel").addEventListener("change", () => {
    const name = $("presetSel").value;
    if (!name || !presets[name]) return;
    const s = presets[name];
    opts = E.merge(s.opts); current = s.current; modified = true;
    enabled = Object.assign({}, ALL_ON, s.enabled || {});
    syncUI(); saveState();
    $("presetName").value = name;
    setStatus("Loaded preset “" + name + "”.");
});
$("presetSaveBtn").addEventListener("click", async () => {
    let name = $("presetName").value.trim() || $("presetSel").value;
    if (!name) { setStatus("Type a name for the preset first.", true); return; }
    presets[name] = { opts: deep(opts), current: deep(current), enabled: deep(enabled) };
    try { await storePresets(); refreshPresetList(name); setStatus("Saved preset “" + name + "”."); }
    catch (e) { setStatus("Could not save preset: " + (e.message || e), true); }
});
$("presetDeleteBtn").addEventListener("click", async () => {
    const name = $("presetSel").value;
    if (!name) { setStatus("Choose a saved preset to delete.", true); return; }
    delete presets[name];
    try { await storePresets(); refreshPresetList(); setStatus("Deleted preset “" + name + "”."); }
    catch (e) { setStatus("Could not delete preset: " + (e.message || e), true); }
});

// ------------------------------------------------------------------ wiring

buildUI();
$("film").addEventListener("change", () => applyFilm($("film").value));
$("renderBtn").addEventListener("click", () => run("full"));
$("previewBtn").addEventListener("click", () => run("preview"));
$("updateBtn").addEventListener("click", () => run("update"));
$("fringeBtn").addEventListener("click", () => run("fringe"));
$("shiftX").addEventListener("change", saveState);
$("shiftY").addEventListener("change", saveState);
$("seedBtn").addEventListener("click", () => { opts.seed = (Math.random() * 1e6) | 0; saveState(); setStatus("New grain and dust pattern. Press Render or Re-render last."); });
$("source").addEventListener("change", saveState);
$("frame").addEventListener("change", saveState);
$("strength").addEventListener("input", () => { $("strengthVal").textContent = $("strength").value; });
$("strength").addEventListener("change", async () => {
    saveState();
    if (!lastResult || app.documents.length === 0) return;
    try {
        await core.executeAsModal(async () => {
            if (app.activeDocument.id !== lastResult.docID) return;
            await setOpacity(lastResult.docID, lastResult.layerID, parseInt($("strength").value, 10));
        }, { commandName: "FilmLook strength" });
    } catch (e) { /* layer may have been deleted */ }
});

if (!loadState()) applyFilm(P.FILMS[0].id);
syncUI();
loadPresets();
setStatus("Ready. " + P.FILMS.length + " film presets, " + (P.CALIBRATED || []).length + " calibrated to reference frames.");
