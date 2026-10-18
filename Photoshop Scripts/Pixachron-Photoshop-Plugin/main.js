// Pixachron — panel logic (UXP). Unrolls the picture along a chosen path,
// runs an audio-style effect over the signal, rolls it back; stages chain in
// series. Rendering follows the FilmLook / VideoLook / PrintLook convention:
// read pixels with the imaging API, process in JS, write a new layer; one undo
// step per render.

const { app, core, action, imaging, constants } = require("photoshop");
const batchPlay = action.batchPlay;

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function setStatus(msg, isErr) { const el = $("status"); el.textContent = msg; el.className = isErr ? "err" : ""; }

// ------------------------------------------------------------------ state

const MAX_STAGES = 6;
const BASE_STAGE = {
    enabled: true,
    path: { path: "hilbert", snake: false, angle: 0, cx: 0.5, cy: 0.5, pitch: 1, spokes: 0, twist: 0, inward: false, reverse: false, tile: 0, tileSnake: false, segment: "path" },
    reroll: "same", maskUse: "path",
    effect: "delay", params: {}, seed: 1,
    channel: "rgb", spread: 0.3, coupling: "ac", couplingPeriod: 600, mix: 1
};
const BASE = {
    preset: "", modified: false,
    stages: [deep(BASE_STAGE)], stage: 0,
    maskSource: "none", maskThr: 0.5,
    source: "merged", strength: 100, proxy: 1024,
    outline: { on: false, source: "text", name: "", domain: "direction", spacing: 1, outSpacing: 3, corner: 60, loop: true, continuous: false, fill: "fill" },
    open: { secChain: true, secPath: true, secMask: false, secEffect: true, secSignal: false, secOutline: false, secOutput: false }
};
let st = deep(BASE);
let lastResult = null; // { docID, layerID, mode }
let userPresets = {};

function cur() { if (!st.stages.length) st.stages.push(deep(BASE_STAGE)); st.stage = clamp(st.stage | 0, 0, st.stages.length - 1); return st.stages[st.stage]; }
function effectOf(sg) { return PX_EFFECTS.byId[sg.effect] || PX_EFFECTS.LIST[0]; }
function effectDef() { return effectOf(cur()); }
function paramsOf(sg) { const e = effectOf(sg); if (!sg.params[e.id]) sg.params[e.id] = PX_EFFECTS.defaults(e); return Object.assign(PX_EFFECTS.defaults(e), sg.params[e.id]); }
function currentParams() { return paramsOf(cur()); }

// a single-stage settings object (old state shape, or a preset patch) → a stage
function toStage(src) {
    const sg = deep(BASE_STAGE);
    if (!src) return sg;
    for (const k of ["enabled", "reroll", "maskUse", "effect", "seed", "channel", "spread", "coupling", "couplingPeriod", "mix"]) if (src[k] != null) sg[k] = deep(src[k]);
    if (src.path) sg.path = Object.assign(deep(BASE_STAGE.path), src.path);
    if (src.params) {
        // old state kept params keyed by effect id; a preset patch gives the current effect's params flat
        const keyed = Object.keys(src.params).some(k => PX_EFFECTS.byId[k]);
        if (keyed) sg.params = deep(src.params);
        else sg.params[sg.effect] = Object.assign(PX_EFFECTS.defaults(effectOf(sg)), src.params);
    }
    return sg;
}

function saveState() { try { localStorage.setItem("pixachron.state", JSON.stringify(st)); localStorage.setItem("pixachron.user", JSON.stringify(userPresets)); } catch (e) {} }
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem("pixachron.state") || "null");
        if (s) {
            st = deep(BASE); Object.assign(st, s);
            st.open = Object.assign(deep(BASE.open), s.open || {});
            st.outline = Object.assign(deep(BASE.outline), s.outline || {});
            if (Array.isArray(s.stages) && s.stages.length) st.stages = s.stages.map(toStage);
            else { st.stages = [toStage(s)]; st.stage = 0; } // 1.0.x state: one stage
            if (s.maskSource === "none") for (const g of st.stages) g.maskUse = "path";
        }
        userPresets = JSON.parse(localStorage.getItem("pixachron.user") || "{}") || {};
    } catch (e) { st = deep(BASE); userPresets = {}; }
    cur();
}

// ------------------------------------------------------------------ UI: sliders

// UXP range sliders only behave with integer min/max/step, so every slider runs on an integer track
// (0..steps, or 0..SLN on a curved track for wide ranges) and is converted to and from the real value.
// Text boxes beside them take typed values, which may go beyond the slider's range where noted (tmax).
const SLN = 1000;
function sliderDef(q) {
    const wide = q.min > 0 && q.max / q.min > 50;
    const curve = q.curve || (wide ? 2.5 : 1);
    const steps = curve === 1 ? Math.round((q.max - q.min) / q.step) : SLN;
    return { min: q.min, max: q.max, step: q.step, curve, steps, tmax: q.tmax == null ? q.max : q.tmax };
}
function posToVal(d, p) { const f = d.curve === 1 ? p / d.steps : Math.pow(p / d.steps, d.curve); const v = d.min + (d.max - d.min) * f; return +(Math.round(v / d.step) * d.step).toFixed(4); }
function valToPos(d, v) { const f = (clamp(v, d.min, d.max) - d.min) / (d.max - d.min); return Math.round((d.curve === 1 ? f : Math.pow(f, 1 / d.curve)) * d.steps); }
function fmt(v, d) { const dec = d.step >= 1 ? 0 : (d.step >= 0.1 ? 1 : (d.step >= 0.01 ? 2 : 3)); return (+v).toFixed(dec); }

// Wire a range + text pair. get/set work in state units; the shown value is state × scale.
function bindPair(r, n, get, set, scale, q, onChange) {
    const d = sliderDef(q);
    r.min = "0"; r.max = "" + d.steps; r.step = "1";
    const show = () => { const v = get() * scale; r.value = "" + valToPos(d, v); n.value = fmt(v, d); };
    const fromSlider = () => { const v = posToVal(d, parseInt(r.value, 10)); set(v / scale); n.value = fmt(v, d); onChange(); };
    r.addEventListener("input", fromSlider); r.addEventListener("change", fromSlider);
    n.addEventListener("change", () => { const v = parseFloat(n.value); if (!isNaN(v)) { const c = clamp(v, d.min, d.tmax); set(c / scale); r.value = "" + valToPos(d, c); n.value = fmt(c, d); onChange(); } else show(); });
    return show;
}

// Stage fields: [id, getter, setter, scale, range]
const PAIRS = [
    ["angle", () => cur().path.angle, v => cur().path.angle = v, 1, { min: 0, max: 180, step: 1 }],
    ["cx", () => cur().path.cx, v => cur().path.cx = v, 100, { min: 0, max: 100, step: 1 }],
    ["cy", () => cur().path.cy, v => cur().path.cy = v, 100, { min: 0, max: 100, step: 1 }],
    ["pitch", () => cur().path.pitch, v => cur().path.pitch = v, 1, { min: 1, max: 64, step: 0.5, curve: 2 }],
    ["spokes", () => cur().path.spokes, v => cur().path.spokes = v, 1, { min: 0, max: 720, step: 1 }],
    ["twist", () => cur().path.twist, v => cur().path.twist = v, 1, { min: -360, max: 360, step: 1 }],
    ["tile", () => cur().path.tile, v => cur().path.tile = v, 1, { min: 0, max: 2048, step: 8, tmax: 8192 }],
    ["spread", () => cur().spread, v => cur().spread = v, 1, { min: 0, max: 1, step: 0.01 }],
    ["couplingPeriod", () => cur().couplingPeriod, v => cur().couplingPeriod = v, 1, { min: 10, max: 5000, step: 10, tmax: 100000 }],
    ["mix", () => cur().mix, v => cur().mix = v, 100, { min: 0, max: 100, step: 1 }],
    // global
    ["maskThr", () => st.maskThr, v => st.maskThr = v, 100, { min: 1, max: 99, step: 1 }],
    ["strength", () => st.strength, v => st.strength = v, 1, { min: 0, max: 100, step: 1 }],
    ["proxy", () => st.proxy, v => st.proxy = v, 1, { min: 256, max: 2048, step: 64, tmax: 8192 }],
    ["olSpacing", () => st.outline.spacing, v => st.outline.spacing = v, 1, { min: 0.25, max: 4, step: 0.25 }],
    ["olOut", () => st.outline.outSpacing, v => st.outline.outSpacing = v, 1, { min: 1, max: 12, step: 0.5 }],
    ["olCorner", () => st.outline.corner, v => st.outline.corner = v, 1, { min: 10, max: 120, step: 1 }]
];
const CHECKS = [
    ["snake", () => cur().path.snake, v => cur().path.snake = v], ["inward", () => cur().path.inward, v => cur().path.inward = v],
    ["reverse", () => cur().path.reverse, v => cur().path.reverse = v], ["tileSnake", () => cur().path.tileSnake, v => cur().path.tileSnake = v],
    ["stageOn", () => cur().enabled !== false, v => cur().enabled = v],
    ["olOn", () => st.outline.on, v => st.outline.on = v], ["olLoop", () => st.outline.loop, v => st.outline.loop = v], ["olContinuous", () => st.outline.continuous, v => st.outline.continuous = v]
];
const SELECTS = [
    ["path", () => cur().path.path, v => cur().path.path = v], ["segment", () => cur().path.segment, v => cur().path.segment = v], ["reroll", () => cur().reroll, v => cur().reroll = v],
    ["maskUse", () => cur().maskUse, v => cur().maskUse = v],
    ["effect", () => cur().effect, v => cur().effect = v], ["channel", () => cur().channel, v => cur().channel = v], ["coupling", () => cur().coupling, v => cur().coupling = v],
    ["maskSource", () => st.maskSource, v => st.maskSource = v], ["source", () => st.source, v => st.source = v],
    ["olSource", () => st.outline.source, v => st.outline.source = v], ["olDomain", () => st.outline.domain, v => st.outline.domain = v], ["olFill", () => st.outline.fill, v => st.outline.fill = v]
];

const showers = [];
function touched() { st.modified = true; $("presetMod").textContent = st.preset ? "modified" : ""; drawTabs(); saveState(); }

function buildStaticUI() {
    for (const [id, get, set, scale, q] of PAIRS) showers.push(bindPair($(id), $(id + "N"), get, set, scale, q, touched));
    for (const [id, get, set] of CHECKS) { const el = $(id); el.addEventListener("change", () => { set(el.checked); touched(); }); showers.push(() => { el.checked = !!get(); }); }
    for (const [id, get, set] of SELECTS) { const el = $(id); el.addEventListener("change", () => { set(el.value); if (id === "effect") buildEffectUI(); refreshVisibility(); touched(); }); showers.push(() => { el.value = get(); }); }
    const seed = $("seed"); seed.addEventListener("change", () => { cur().seed = Math.max(1, parseInt(seed.value, 10) || 1); seed.value = "" + cur().seed; touched(); }); showers.push(() => { seed.value = "" + cur().seed; });
    const oln = $("olName"); oln.addEventListener("change", () => { st.outline.name = oln.value; saveState(); }); showers.push(() => { oln.value = st.outline.name || ""; });
    $("olOn").addEventListener("change", refreshVisibility);
    $("reseed").addEventListener("click", () => { cur().seed = 1 + Math.floor(Math.random() * 999998); seed.value = "" + cur().seed; touched(); });

    const ps = $("path"); for (const p of PX_PATHS.LIST) { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; ps.appendChild(o); }
    const rr = $("reroll"); for (const p of PX_PATHS.LIST) { if (p.id === "contour") continue; const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; rr.appendChild(o); }
    const es = $("effect"); for (const e of PX_EFFECTS.LIST) { const o = document.createElement("option"); o.value = e.id; o.textContent = e.name; es.appendChild(o); }

    for (const sec of document.querySelectorAll(".sec")) {
        const h = sec.querySelector("h2");
        h.addEventListener("click", () => { st.open[sec.id] = !st.open[sec.id]; applyOpen(); saveState(); });
    }
    // chain buttons
    $("stageAdd").addEventListener("click", () => { if (st.stages.length >= MAX_STAGES) { setStatus("Up to " + MAX_STAGES + " stages.", true); return; } st.stages.splice(st.stage + 1, 0, deep(BASE_STAGE)); st.stage++; showAll(); touched(); });
    $("stageDup").addEventListener("click", () => { if (st.stages.length >= MAX_STAGES) { setStatus("Up to " + MAX_STAGES + " stages.", true); return; } st.stages.splice(st.stage + 1, 0, deep(cur())); st.stage++; showAll(); touched(); });
    $("stageDel").addEventListener("click", () => { if (st.stages.length <= 1) { st.stages = [deep(BASE_STAGE)]; } else st.stages.splice(st.stage, 1); st.stage = clamp(st.stage, 0, st.stages.length - 1); showAll(); touched(); });
    $("stageLeft").addEventListener("click", () => { const i = st.stage; if (i > 0) { const t = st.stages[i - 1]; st.stages[i - 1] = st.stages[i]; st.stages[i] = t; st.stage--; showAll(); touched(); } });
    $("stageRight").addEventListener("click", () => { const i = st.stage; if (i < st.stages.length - 1) { const t = st.stages[i + 1]; st.stages[i + 1] = st.stages[i]; st.stages[i] = t; st.stage++; showAll(); touched(); } });
}
function stageLabel(sg) { const p = PX_PATHS.LIST.find(x => x.id === sg.path.path), e = effectOf(sg); return (p ? p.name.replace(/ \(.*\)$/, "") : sg.path.path) + " · " + e.name; }
function drawTabs() {
    const box = $("stageTabs"); box.innerHTML = "";
    st.stages.forEach((sg, i) => {
        const b = document.createElement("button"); b.className = "tab" + (i === st.stage ? " on" : "") + (sg.enabled === false ? " off" : "");
        b.textContent = (i + 1) + "  " + stageLabel(sg);
        b.addEventListener("click", () => { st.stage = i; showAll(); saveState(); });
        box.appendChild(b);
    });
    const tag = "stage " + (st.stage + 1) + " of " + st.stages.length;
    for (const id of ["stgPath", "stgEffect", "stgSignal", "stgMask"]) $(id).textContent = st.stages.length > 1 ? "(" + tag + ")" : "";
}
function applyOpen() {
    for (const sec of document.querySelectorAll(".sec")) { const open = st.open[sec.id] !== false; sec.classList.toggle("closed", !open); sec.querySelector(".tw").textContent = open ? "▾" : "▸"; }
}
function rowOf(id) { const el = $(id); return el ? el.closest(".row") : null; }
function refreshVisibility() {
    const sg = cur(), p = sg.path.path;
    const lines = p === "raster" || p === "columns" || p === "angle";
    const radial = p === "spiral" || p === "spokes";
    rowOf("snake").style.display = lines ? "" : "none";
    rowOf("angle").style.display = p === "angle" ? "" : "none";
    rowOf("cx").style.display = radial ? "" : "none"; rowOf("cy").style.display = radial ? "" : "none";
    rowOf("pitch").style.display = p === "spiral" ? "" : "none";
    rowOf("spokes").style.display = p === "spokes" ? "" : "none"; rowOf("twist").style.display = p === "spokes" ? "" : "none";
    rowOf("inward").style.display = (radial || p === "contour") ? "" : "none";
    rowOf("spread").style.display = sg.channel === "spread" ? "" : "none";
    rowOf("couplingPeriod").style.display = sg.coupling === "ac" ? "" : "none";
    rowOf("maskThr").style.display = (st.maskSource === "dark" || st.maskSource === "light") ? "" : "none";
    rowOf("olName").style.display = st.outline.source === "named" ? "" : "none";
    document.querySelector("#secOutline h2").style.color = st.outline.on ? "#d9b36c" : "";
    const def = PX_PATHS.LIST.find(x => x.id === p); $("pathNote").textContent = def ? def.hint : "";
    $("effectNote").textContent = effectDef().hint;
}

// Effect parameter rows are generated from the effect's definition
function buildEffectUI() {
    const box = $("effectParams"); box.innerHTML = "";
    const sg = cur(), e = effectOf(sg), prm = paramsOf(sg); sg.params[e.id] = prm;
    for (const q of e.params) {
        const row = document.createElement("div"); row.className = "row";
        const lab = document.createElement("label"); lab.textContent = q.name + (q.time ? " ⏱" : ""); if (q.hint) lab.title = q.hint;
        const r = document.createElement("input"); r.type = "range";
        const n = document.createElement("input"); n.type = "text";
        row.appendChild(lab); row.appendChild(r); row.appendChild(n); box.appendChild(row);
        const show = bindPair(r, n, () => prm[q.id], v => { prm[q.id] = v; }, 1, q, touched); show();
        if (q.hint) { const h = document.createElement("div"); h.className = "hint"; h.textContent = q.hint; box.appendChild(h); }
    }
    for (const o of (e.options || [])) {
        const row = document.createElement("div"); row.className = "row";
        const lab = document.createElement("label"); lab.textContent = o.name;
        const sel = document.createElement("select");
        for (const [v, t] of o.choices) { const op = document.createElement("option"); op.value = v; op.textContent = t; sel.appendChild(op); }
        sel.value = prm[o.id] == null ? o.choices[0][0] : prm[o.id];
        sel.addEventListener("change", () => { prm[o.id] = sel.value; touched(); });
        row.appendChild(lab); row.appendChild(sel); box.appendChild(row);
    }
    const t = document.createElement("div"); t.className = "hint"; t.textContent = "⏱ marks distances in pixels along the path; previews scale them to the preview size, and channel spread scales them per channel."; box.appendChild(t);
}
function showAll() { cur(); for (const f of showers) f(); buildEffectUI(); refreshVisibility(); applyOpen(); drawTabs(); $("presetMod").textContent = st.modified && st.preset ? "modified" : ""; }

// ------------------------------------------------------------------ presets

function rebuildPresetMenu() {
    const sel = $("preset"); sel.innerHTML = "";
    const add = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
    add("", "— choose a starting point —");
    let group = "";
    for (const p of PX_PRESETS) { if (p.group && p.group !== group) { group = p.group; add("__sep" + group, "— " + group + " —"); } add(p.id, p.title); }
    const names = Object.keys(userPresets).sort();
    if (names.length) { add("__sepuser", "— your presets —"); for (const nm of names) add("user:" + nm, nm); }
    sel.value = st.preset || "";
}
function applyPreset(id) {
    let patch = null, note = "";
    if (id.indexOf("user:") === 0) { patch = userPresets[id.slice(5)]; note = "Your preset."; }
    else { const p = PX_PRESETS.find(x => x.id === id); if (p) { patch = p.st; note = p.note; } }
    if (!patch) return;
    const keep = { source: st.source, strength: st.strength, proxy: st.proxy, open: st.open }, keepOutline = { source: st.outline.source, name: st.outline.name, fill: st.outline.fill };
    st = deep(BASE); Object.assign(st, keep);
    if (patch.__full) { // user preset: a whole state
        st.outline = Object.assign(deep(BASE.outline), keepOutline, patch.__full.outline || {});
        const f = deep(patch.__full);
        st.maskSource = f.maskSource || "none"; st.maskThr = f.maskThr == null ? 0.5 : f.maskThr;
        st.stages = Array.isArray(f.stages) && f.stages.length ? f.stages.map(toStage) : [toStage(f)];
    } else {
        st.maskSource = patch.maskSource || "none"; if (patch.maskThr != null) st.maskThr = patch.maskThr;
        st.stages = Array.isArray(patch.stages) ? patch.stages.map(toStage) : [toStage(patch)];
        st.outline = Object.assign(deep(BASE.outline), keepOutline, patch.outline || {}, { on: !!(patch.outline && patch.outline.on) });
    }
    st.stage = 0; st.preset = id; st.modified = false;
    $("note").textContent = note;
    showAll(); saveState();
}
$("preset").addEventListener("change", () => { const v = $("preset").value; if (v.indexOf("__sep") === 0 || v === "") { $("preset").value = st.preset || ""; return; } applyPreset(v); });
$("saveUser").addEventListener("click", () => {
    const nm = ($("userName").value || "").trim(); if (!nm) { setStatus("Type a name for the preset first.", true); return; }
    const full = { maskSource: st.maskSource, maskThr: st.maskThr, stages: deep(st.stages), outline: deep(st.outline) };
    userPresets[nm] = { __full: full }; st.preset = "user:" + nm; st.modified = false;
    rebuildPresetMenu(); saveState(); setStatus("Saved preset \"" + nm + "\".");
});
$("deleteUser").addEventListener("click", () => {
    if (!st.preset || st.preset.indexOf("user:") !== 0) { setStatus("Choose one of your presets to delete it.", true); return; }
    const nm = st.preset.slice(5); delete userPresets[nm]; st.preset = ""; rebuildPresetMenu(); saveState(); setStatus("Deleted preset \"" + nm + "\".");
});
$("resetBtn").addEventListener("click", () => { const keep = { source: st.source, strength: st.strength, proxy: st.proxy, open: st.open }; st = deep(BASE); Object.assign(st, keep); $("note").textContent = ""; showAll(); saveState(); setStatus("Back to defaults: one stage."); });

// Randomise the selected stage: a random path and effect with parameters drawn from their ranges
function randomStage(maskAvailable) {
    const R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
    const sg = deep(BASE_STAGE);
    const paths = PX_PATHS.LIST.filter(p => p.id !== "contour" || maskAvailable);
    const p = pick(paths).id;
    sg.path = Object.assign(deep(BASE_STAGE.path), { path: p, snake: R() < 0.5, angle: Math.round(R() * 180), cx: 0.2 + R() * 0.6, cy: 0.2 + R() * 0.6, pitch: R() < 0.5 ? 1 : 1 + Math.round(R() * 12), spokes: R() < 0.7 ? 0 : 8 + Math.round(R() * 200), twist: R() < 0.6 ? 0 : Math.round((R() - 0.5) * 360), inward: R() < 0.3, reverse: R() < 0.2, tile: R() < 0.6 ? 0 : [64, 128, 256, 512][Math.floor(R() * 4)], segment: pick(["path", "path", "line", "tile"]) });
    sg.reroll = R() < 0.1 ? pick(PX_PATHS.LIST.filter(x => x.id !== "contour" && x.id !== p)).id : "same";
    const e = pick(PX_EFFECTS.LIST); sg.effect = e.id;
    const prm = PX_EFFECTS.defaults(e);
    for (const q of e.params) { const wide = q.max / Math.max(q.min, 1e-6) > 20 && q.min > 0; const t = R(); prm[q.id] = wide ? Math.exp(Math.log(q.min) + t * (Math.log(q.max) - Math.log(q.min))) : q.min + t * (q.max - q.min); prm[q.id] = +(Math.round(prm[q.id] / q.step) * q.step).toFixed(4); }
    for (const o of (e.options || [])) prm[o.id] = pick(o.choices)[0];
    sg.params[e.id] = prm;
    sg.channel = pick(["rgb", "rgb", "luma", "spread"]); sg.spread = Math.round(R() * 100) / 100;
    sg.coupling = R() < 0.7 ? "ac" : "dc"; sg.couplingPeriod = Math.round(100 + R() * 1500);
    sg.seed = 1 + Math.floor(R() * 999998);
    return sg;
}
$("randomBtn").addEventListener("click", () => {
    const sg = randomStage(st.maskSource !== "none");
    st.stages[st.stage] = sg; st.preset = ""; st.modified = false;
    $("note").textContent = "Randomised stage " + (st.stage + 1) + ": " + stageLabel(sg) + ".";
    showAll(); saveState(); setStatus("Randomised stage " + (st.stage + 1) + ". Press Preview.");
});

// ------------------------------------------------------------------ photoshop helpers

async function getSelectionBounds(docID) {
    const r = await batchPlay([{ _obj: "get", _target: [{ _property: "selection" }, { _ref: "document", _id: docID }] }], {});
    const s = r && r[0] && r[0].selection;
    if (!s || s.top === undefined) return null;
    const v = (x) => (typeof x === "object" ? x._value : x);
    return { left: Math.round(v(s.left)), top: Math.round(v(s.top)), right: Math.round(v(s.right)), bottom: Math.round(v(s.bottom)) };
}
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
function allLayers(layers, out) { out = out || []; for (const l of layers) { out.push(l); if (l.layers && l.layers.length) allLayers(l.layers, out); } return out; }
async function setOpacity(docID, layerID, pct) {
    await batchPlay([{ _obj: "set", _target: [{ _ref: "layer", _id: layerID }, { _ref: "document", _id: docID }], to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: pct } } }], {});
}
function label() { return st.stages.filter(s => s.enabled !== false).map(stageLabel).join(" → ") || "nothing"; }
function stageSettings(sg) {
    const maskMode = st.maskSource === "none" ? "none" : (sg.maskUse === "path" ? "none" : sg.maskUse);
    return { enabled: sg.enabled !== false, path: deep(sg.path), reroll: sg.reroll, maskMode,
        effect: sg.effect, params: paramsOf(sg), channel: sg.channel, spread: sg.spread, coupling: sg.coupling, couplingPeriod: sg.couplingPeriod, mix: sg.mix, seed: sg.seed };
}
function chainSettings() { return st.stages.map(stageSettings); }

// ------------------------------------------------------------------ render

async function render(mode) {
    const t0 = Date.now();
    let info = "";
    let replace = false;
    if (mode === "update") { if (!lastResult) throw new Error("Nothing to update yet: Preview or Render first."); mode = lastResult.mode; replace = true; }
    else if (mode === "preview" && lastResult && lastResult.mode === "preview") replace = true; // previews are throwaway: a new one replaces the old
    const chain = chainSettings();
    if (!chain.some(s => s.enabled)) throw new Error("Every stage is switched off.");
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "Pixachron" });
        const hidden = [];
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("Pixachron works on RGB documents (Image > Mode > RGB Color).");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 : (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit first.");
            const W = Math.round(doc.width), H = Math.round(doc.height), n = W * H, MAXV = bits === 16 ? 32768 : 255;

            // Update, or a new preview, replaces the last result layer; full renders accumulate
            if (replace && lastResult && lastResult.docID === doc.id) { const old = allLayers(doc.layers).find(l => l.id === lastResult.layerID); if (old) await old.delete(); lastResult = null; }

            let src = null;
            if (st.source === "layer") {
                src = doc.activeLayers[0];
                if (!src) throw new Error("Select a layer first, or set Source to Whole image.");
                if (src.kind === constants.LayerKind.GROUP) throw new Error("Select a pixel layer, not a group.");
            } else {
                for (const l of allLayers(doc.layers)) if (l.name.indexOf("Pixachron") === 0 && l.visible) { l.visible = false; hidden.push(l); }
            }
            const req = { documentID: doc.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: 0, top: 0, right: W, bottom: H } };
            if (src) req.layerID = src.id;
            const got = await imaging.getPixels(req);
            const img = got.imageData, gw = img.width, gh = img.height, comps = img.components, gb = got.sourceBounds;
            const data = await img.getData({ chunky: true });
            img.dispose();
            for (const l of hidden) l.visible = true; hidden.length = 0;

            const planes = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
            const alpha = comps === 4 ? new Float32Array(n) : null;
            for (let y = 0; y < gh; y++) { const Y = gb.top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < gw; x++) { const X = gb.left + x; if (X < 0 || X >= W) continue; const o = (y * gw + x) * comps, i = Y * W + X; planes[0][i] = data[o] / MAXV; planes[1][i] = data[o + 1] / MAXV; planes[2][i] = data[o + 2] / MAXV; if (alpha) alpha[i] = data[o + 3] / MAXV; } }

            // mask (shared by every stage)
            let mask = null;
            if (st.maskSource === "selection") { mask = await getSelectionMask(doc, W, H); if (!mask) throw new Error("Mask is set to Selection, but there is no selection."); }
            else if (st.maskSource === "alpha") { if (!alpha) throw new Error("Layer transparency needs Source set to the selected layer (and a layer with transparent areas)."); mask = alpha; }
            else if (st.maskSource === "dark" || st.maskSource === "light") {
                mask = new Float32Array(n); const thr = st.maskThr, dark = st.maskSource === "dark";
                for (let i = 0; i < n; i++) { const Yl = 0.299 * planes[0][i] + 0.587 * planes[1][i] + 0.114 * planes[2][i]; mask[i] = dark ? (Yl < thr ? 1 : 0) : (Yl > thr ? 1 : 0); }
            }
            chain.forEach((s, i) => { if (s.enabled && s.path.path === "contour" && !mask) throw new Error("Stage " + (i + 1) + " uses the Contour path, which needs a mask: set Mask from to Selection, Layer transparency, Dark pixels or Light pixels."); });

            let docIn = { w: W, h: H, planes, mask }, r, outPlanes, how;
            if (mode === "preview") {
                const px = PX_ENGINE.proxy(docIn, st.proxy);
                const ch = px.f < 1 ? chain.map(s => PX_ENGINE.settingsForProxy(s, px.f)) : chain;
                r = PX_ENGINE.runChain(px, ch);
                outPlanes = px.f < 1 ? PX_ENGINE.upsample(r.planes, px.w, px.h, W, H) : r.planes;
                how = "preview " + px.w + "×" + px.h + " (×" + px.f.toFixed(3) + ")";
            } else {
                r = PX_ENGINE.runChain(docIn, chain); outPlanes = r.planes; how = W + "×" + H + (bits === 16 ? " (16-bit)" : "");
            }

            const out = bits === 16 ? new Uint16Array(n * 4) : new Uint8Array(n * 4);
            for (let i = 0; i < n; i++) { out[i * 4] = Math.round(clamp(outPlanes[0][i], 0, 1) * MAXV); out[i * 4 + 1] = Math.round(clamp(outPlanes[1][i], 0, 1) * MAXV); out[i * 4 + 2] = Math.round(clamp(outPlanes[2][i], 0, 1) * MAXV); out[i * 4 + 3] = alpha ? Math.round(alpha[i] * MAXV) : MAXV; }

            const lname = (mode === "preview" ? "Pixachron preview · " : "Pixachron · ") + label();
            const anchor = src ? src : doc.layers[0];
            await batchPlay([
                { _obj: "select", _target: [{ _ref: "layer", _id: anchor.id }], makeVisible: false },
                { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: lname } }
            ], {});
            const dst = doc.activeLayers[0];
            if (!src) { const top = doc.layers[0]; if (top && top.id !== dst.id) await dst.move(top, constants.ElementPlacement.PLACEBEFORE); }
            const outImg = await imaging.createImageDataFromBuffer(out, { width: W, height: H, components: 4, colorSpace: "RGB", chunky: true });
            await imaging.putPixels({ documentID: doc.id, layerID: dst.id, imageData: outImg, targetBounds: { left: 0, top: 0 }, replace: true });
            outImg.dispose();
            if (st.strength < 100) await setOpacity(doc.id, dst.id, st.strength);
            lastResult = { docID: doc.id, layerID: dst.id, mode };
            info = how + ", " + r.stages.length + " stage" + (r.stages.length === 1 ? "" : "s") + " (" + r.stages.map(s => (s.ms / 1000).toFixed(1) + "s").join(" + ") + ")";
        } finally {
            for (const l of hidden) { try { l.visible = true; } catch (e) {} }
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Pixachron" });
    return info + ", total " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

// ------------------------------------------------------------------ outline mode

const num = (v) => (v && typeof v === "object") ? v._value : v;
// Read a path's subpaths as [{ closed, points: [{anchor, left, right}] }] in pixels. batchPlay gives the whole path in
// one call; the DOM is the fallback.
async function readPathItem(doc, item) {
    const res = doc.resolution || 72, toPx = (u) => (u && typeof u === "object" && u._unit && u._unit !== "pixelsUnit") ? num(u) * res / 72 : num(u);
    let subs = [];
    try {
        const r = await batchPlay([{ _obj: "get", _target: [{ _ref: "path", _id: item.id }, { _ref: "document", _id: doc.id }] }], {});
        const pc = r && r[0] && r[0].pathContents, comps = pc && pc.pathComponents;
        if (comps) for (const comp of comps) for (const sp of (comp.subpathListKey || [])) {
            const pts = (sp.points || []).map(p => {
                const a = [toPx(p.anchor.horizontal), toPx(p.anchor.vertical)];
                const f = p.forward ? [toPx(p.forward.horizontal), toPx(p.forward.vertical)] : a.slice();
                const b = p.backward ? [toPx(p.backward.horizontal), toPx(p.backward.vertical)] : a.slice();
                return { anchor: a, right: f, left: b };
            });
            if (pts.length) subs.push({ closed: sp.closedSubpath !== false, points: pts });
        }
    } catch (e) { subs = []; }
    if (!subs.length) {
        const spis = item.subPathItems;
        for (let k = 0; k < spis.length; k++) {
            const spi = spis[k], pps = spi.pathPoints, pts = [];
            for (let i = 0; i < pps.length; i++) { const p = pps[i]; const xy = (v) => Array.isArray(v) ? [num(v[0]), num(v[1])] : [num(v.x), num(v.y)]; pts.push({ anchor: xy(p.anchor), left: xy(p.leftDirection), right: xy(p.rightDirection) }); }
            if (pts.length) subs.push({ closed: !!spi.closed, points: pts });
        }
    }
    return subs;
}
function findPath(doc, pred) { const items = doc.pathItems; for (let i = 0; i < items.length; i++) if (pred(items[i])) return items[i]; return null; }
async function getSourcePath(doc) {
    const o = st.outline;
    if (o.source === "named") {
        if (!o.name) throw new Error("Type the path's name (as in the Paths panel).");
        const it = findPath(doc, p => p.name === o.name); if (!it) throw new Error("No path called \"" + o.name + "\"."); return { item: it, temp: false };
    }
    if (o.source === "work") { const it = findPath(doc, p => p.kind === constants.PathKind.WORKPATH || p.name === "Work Path"); if (!it) throw new Error("There is no work path. Draw one, or use Type › Create Work Path."); return { item: it, temp: false }; }
    if (o.source === "vector") {
        const lay = doc.activeLayers[0]; if (!lay) throw new Error("Select a layer with a vector mask.");
        const it = findPath(doc, p => p.kind === constants.PathKind.VECTORMASK); if (!it) throw new Error("The selected layer has no vector mask (shape layers have one)."); return { item: it, temp: false };
    }
    // text layer → a work path, read and then removed
    const lay = doc.activeLayers[0]; if (!lay) throw new Error("Select a text layer first.");
    if (lay.kind !== constants.LayerKind.TEXT) throw new Error("The selected layer isn't a text layer (set Outline from to The work path or Path by name for other sources).");
    const before = new Set(); for (let i = 0; i < doc.pathItems.length; i++) before.add(doc.pathItems[i].id);
    await batchPlay([{ _obj: "make", _target: [{ _ref: "path" }], from: { _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" } }], {});
    const it = findPath(doc, p => !before.has(p.id)) || findPath(doc, p => p.kind === constants.PathKind.WORKPATH);
    if (!it) throw new Error("Photoshop didn't make a work path from the text layer; try Type › Create Work Path yourself, then Outline from: The work path.");
    return { item: it, temp: true };
}
// Write subpaths as a new named path item. Three routes, because the UXP docs don't say how SubPathInfo and
// PathPointInfo are made: the classes if the app exposes them, plain objects of the same shape, and finally the
// batchPlay "set work path" that the Actions panel records, renamed afterwards.
async function writePath(doc, name, subpaths) {
    const errs = [];
    const mk = (Cls, props) => { if (typeof Cls === "function") { const o = new Cls(); Object.assign(o, props); return o; } return props; };
    const PPI = app.PathPointInfo, SPI = app.SubPathInfo;
    for (const useClasses of [true, false]) {
        if (useClasses && (typeof PPI !== "function" || typeof SPI !== "function")) continue;
        try {
            const infos = subpaths.map(sp => mk(useClasses ? SPI : null, {
                closed: sp.closed, operation: constants.ShapeOperation.SHAPEXOR,
                entireSubPath: sp.points.map(p => mk(useClasses ? PPI : null, { anchor: p.anchor, leftDirection: p.left, rightDirection: p.right, kind: p.kind === "corner" ? constants.PointKind.CORNERPOINT : constants.PointKind.SMOOTHPOINT }))
            }));
            const item = await doc.pathItems.add(name, infos);
            if (item) return item;
            errs.push((useClasses ? "classes" : "objects") + ": add returned nothing");
        } catch (e) { errs.push((useClasses ? "classes" : "objects") + ": " + (e.message || e)); }
    }
    try {
        const px = (v) => ({ _unit: "pixelsUnit", _value: v });
        const comp = subpaths.map(sp => ({ _obj: "pathComponent", shapeOperation: { _enum: "shapeOperation", _value: "xor" }, subpathListKey: [{ _obj: "subpathsList", closedSubpath: sp.closed,
            points: sp.points.map(p => ({ _obj: "pathPoint", anchor: { _obj: "paint", horizontal: px(p.anchor[0]), vertical: px(p.anchor[1]) }, forward: { _obj: "paint", horizontal: px(p.right[0]), vertical: px(p.right[1]) }, backward: { _obj: "paint", horizontal: px(p.left[0]), vertical: px(p.left[1]) }, smooth: p.kind !== "corner" })) }] }));
        await batchPlay([{ _obj: "set", _target: [{ _ref: "path", _property: "workPath" }], to: comp }], {});
        const wp = findPath(doc, p => p.kind === constants.PathKind.WORKPATH || p.name === "Work Path");
        if (!wp) throw new Error("work path not found after set");
        const item = await wp.duplicate(name);
        try { await wp.remove(); } catch (e) { /* leave it */ }
        return item;
    } catch (e) { errs.push("batchPlay: " + (e.message || e)); }
    throw new Error("Couldn't create the path. " + errs.join(" | "));
}
let lastOutline = null; // { docID, pathID, layerID, mode }
async function renderOutline(mode) {
    const t0 = Date.now(), o = st.outline;
    let replace = false;
    if (mode === "update") { if (!lastOutline) throw new Error("Nothing to update yet: Preview or Render first."); mode = lastOutline.mode; replace = true; }
    else if (mode === "preview" && lastOutline && lastOutline.mode === "preview") replace = true;
    const chain = chainSettings().map(s => Object.assign(s, { reverse: !!s.path.reverse }));
    if (!chain.some(s => s.enabled)) throw new Error("Every stage is switched off.");
    let info = "";
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "Pixachron outline" });
        try {
            if (replace && lastOutline && lastOutline.docID === doc.id) {
                const p = findPath(doc, x => x.id === lastOutline.pathID); if (p) await p.remove();
                if (lastOutline.layerID) { const l = allLayers(doc.layers).find(x => x.id === lastOutline.layerID); if (l) await l.delete(); }
                lastOutline = null;
            }
            const src = await getSourcePath(doc);
            const subs = await readPathItem(doc, src.item);
            if (src.temp) { try { await src.item.remove(); } catch (e) {} }
            if (!subs.length) throw new Error("The path has no points.");
            const r = PX_OUTLINE.run(subs, chain, { domain: o.domain, spacing: o.spacing, outSpacing: o.outSpacing, corner: o.corner, loop: o.loop, perSubpath: !o.continuous });
            const name = (mode === "preview" ? "Pixachron preview · " : "Pixachron · ") + label();
            const item = await writePath(doc, name, r.subpaths);
            let layerID = null;
            if (o.fill === "fill") {
                await batchPlay([{ _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: name } }], {});
                const lay = doc.activeLayers[0]; layerID = lay ? lay.id : null;
                let filled = false;
                try { await item.fillPath(); filled = true; } catch (e) { filled = false; }
                if (!filled) {
                    await item.makeSelection(0, true, constants.SelectionType.REPLACE);
                    await batchPlay([
                        { _obj: "fill", using: { _enum: "fillContents", _value: "foregroundColor" }, opacity: { _unit: "percentUnit", _value: 100 }, mode: { _enum: "blendMode", _value: "normal" } },
                        { _obj: "set", _target: [{ _ref: "channel", _property: "selection" }], to: { _enum: "ordinal", _value: "none" } }
                    ], {});
                }
                if (st.strength < 100 && layerID) await setOpacity(doc.id, layerID, st.strength);
            }
            lastOutline = { docID: doc.id, pathID: item.id, layerID, mode };
            info = r.contours + " subpath" + (r.contours === 1 ? "" : "s") + ", " + r.samples.toLocaleString() + " samples → " + r.points.toLocaleString() + " points, engine " + (r.ms / 1000).toFixed(2) + "s";
        } finally { await ctx.hostControl.resumeHistory(suspensionID); }
    }, { commandName: "Pixachron outline" });
    return info + ", total " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

async function run(mode) {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = true;
    setStatus(mode === "preview" ? "Rendering preview…" : "Rendering…");
    await new Promise(r => setTimeout(r, 30));
    try { const r = await (st.outline.on ? renderOutline(mode) : render(mode)); setStatus("Done: " + r); }
    catch (e) { setStatus("Error: " + (e.message || e), true); }
    finally { for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = false; }
}
$("renderBtn").addEventListener("click", () => run("full"));
$("previewBtn").addEventListener("click", () => run("preview"));
$("updateBtn").addEventListener("click", () => run("update"));

// ------------------------------------------------------------------ start

loadState();
buildStaticUI();
rebuildPresetMenu();
if (st.preset) { const p = PX_PRESETS.find(x => x.id === st.preset); $("note").textContent = p ? p.note : (st.preset.indexOf("user:") === 0 ? "Your preset." : ""); }
showAll();
setStatus("Ready. Pick a preset, or a path and an effect, then Preview. Add stages under Chain to run effects in series.");
