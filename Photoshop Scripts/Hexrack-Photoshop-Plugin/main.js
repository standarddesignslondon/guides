// Hexrack — panel logic (UXP). A rack of databending devices run in series over
// the picture's bytes. Rendering follows the Pixachron / FilmLook convention:
// read pixels with the imaging API, process in JS, write a new layer; one undo
// step per render.

const { app, core, action, imaging, constants } = require("photoshop");
const batchPlay = action.batchPlay;

function $(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function deep(o) { return JSON.parse(JSON.stringify(o)); }
function setStatus(msg, isErr) { const el = $("status"); el.textContent = msg; el.className = isErr ? "err" : ""; }

// ------------------------------------------------------------------ state

const MAX_STAGES = 8;
const BASE_STAGE = { enabled: true, device: "shift", params: {}, seed: 1, mix: 1, rowFrom: 0, rowSpan: 100, chan: "all" };
const BASE = {
    preset: "", modified: false,
    stages: [deep(BASE_STAGE)], stage: 0,
    source: "merged", strength: 100, proxy: 1024,
    open: { secRack: true, secDevice: true, secStage: false, secOutput: false }
};
let st = deep(BASE);
let lastResult = null; // { docID, layerID, mode }
let userPresets = {};

function cur() { if (!st.stages.length) st.stages.push(deep(BASE_STAGE)); st.stage = clamp(st.stage | 0, 0, st.stages.length - 1); return st.stages[st.stage]; }
function deviceOf(sg) { return HX_ENGINE.byId[sg.device] || HX_ENGINE.LIST[0]; }
function paramsOf(sg) { const dv = deviceOf(sg); if (!sg.params[dv.id]) sg.params[dv.id] = HX_ENGINE.defaults(dv); return Object.assign(HX_ENGINE.defaults(dv), sg.params[dv.id]); }

// a stage patch (from a preset or old state) → a full stage; params may be flat (for the stage's device) or keyed by device id
function toStage(src) {
    const sg = deep(BASE_STAGE);
    if (!src) return sg;
    for (const k of ["enabled", "device", "seed", "mix", "rowFrom", "rowSpan", "chan"]) if (src[k] != null) sg[k] = deep(src[k]);
    if (!HX_ENGINE.byId[sg.device]) sg.device = BASE_STAGE.device;
    if (src.params) {
        const keyed = Object.keys(src.params).some(k => HX_ENGINE.byId[k]);
        if (keyed) sg.params = deep(src.params);
        else sg.params[sg.device] = Object.assign(HX_ENGINE.defaults(deviceOf(sg)), src.params);
    }
    return sg;
}

function saveState() { try { localStorage.setItem("hexrack.state", JSON.stringify(st)); localStorage.setItem("hexrack.user", JSON.stringify(userPresets)); } catch (e) {} }
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem("hexrack.state") || "null");
        if (s) {
            st = deep(BASE); Object.assign(st, s);
            st.open = Object.assign(deep(BASE.open), s.open || {});
            st.stages = Array.isArray(s.stages) && s.stages.length ? s.stages.map(toStage) : [deep(BASE_STAGE)];
        }
        userPresets = JSON.parse(localStorage.getItem("hexrack.user") || "{}") || {};
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
function posToVal(d, p) {
    let f;
    if (d.curve === 1) f = p / d.steps;
    else if (d.min < 0 && d.max > 0) { const t = p / d.steps * 2 - 1; f = (Math.sign(t) * Math.pow(Math.abs(t), d.curve) + 1) / 2; } // bipolar: curve symmetric about zero
    else f = Math.pow(p / d.steps, d.curve);
    const v = d.min + (d.max - d.min) * f; return +(Math.round(v / d.step) * d.step).toFixed(4);
}
function valToPos(d, v) {
    const f = (clamp(v, d.min, d.max) - d.min) / (d.max - d.min);
    if (d.curve === 1) return Math.round(f * d.steps);
    if (d.min < 0 && d.max > 0) { const t = f * 2 - 1; return Math.round((Math.sign(t) * Math.pow(Math.abs(t), 1 / d.curve) + 1) / 2 * d.steps); }
    return Math.round(Math.pow(f, 1 / d.curve) * d.steps);
}
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

const PAIRS = [
    ["mix", () => cur().mix, v => cur().mix = v, 100, { min: 0, max: 100, step: 1 }],
    ["rowFrom", () => cur().rowFrom, v => cur().rowFrom = v, 1, { min: 0, max: 99, step: 0.5 }],
    ["rowSpan", () => cur().rowSpan, v => cur().rowSpan = v, 1, { min: 0.5, max: 100, step: 0.5 }],
    ["strength", () => st.strength, v => st.strength = v, 1, { min: 0, max: 100, step: 1 }],
    ["proxy", () => st.proxy, v => st.proxy = v, 1, { min: 256, max: 2048, step: 64, tmax: 8192 }]
];
const CHECKS = [["stageOn", () => cur().enabled !== false, v => cur().enabled = v]];
const SELECTS = [
    ["device", () => cur().device, v => cur().device = v], ["chan", () => cur().chan, v => cur().chan = v],
    ["source", () => st.source, v => st.source = v]
];

const showers = [];
function touched() { st.modified = true; $("presetMod").textContent = st.preset ? "modified" : ""; drawRack(); saveState(); }

function buildStaticUI() {
    for (const [id, get, set, scale, q] of PAIRS) showers.push(bindPair($(id), $(id + "N"), get, set, scale, q, touched));
    for (const [id, get, set] of CHECKS) { const el = $(id); el.addEventListener("change", () => { set(el.checked); touched(); }); showers.push(() => { el.checked = !!get(); }); }
    for (const [id, get, set] of SELECTS) { const el = $(id); el.addEventListener("change", () => { if (el.value.indexOf("__sep") === 0) { el.value = get(); return; } set(el.value); if (id === "device") buildDeviceUI(); touched(); }); showers.push(() => { el.value = get(); }); }
    const seed = $("seed"); seed.addEventListener("change", () => { cur().seed = Math.max(1, parseInt(seed.value, 10) || 1); seed.value = "" + cur().seed; touched(); }); showers.push(() => { seed.value = "" + cur().seed; });
    $("reseed").addEventListener("click", () => { cur().seed = 1 + Math.floor(Math.random() * 999998); seed.value = "" + cur().seed; touched(); });

    const ds = $("device"); let group = "";
    for (const dv of HX_ENGINE.LIST) {
        if (dv.group !== group) { group = dv.group; const o = document.createElement("option"); o.value = "__sep" + group; o.textContent = "— " + group + " —"; ds.appendChild(o); }
        const o = document.createElement("option"); o.value = dv.id; o.textContent = dv.name; ds.appendChild(o);
    }

    for (const sec of document.querySelectorAll(".sec")) {
        const h = sec.querySelector("h2");
        h.addEventListener("click", () => { st.open[sec.id] = !st.open[sec.id]; applyOpen(); saveState(); });
    }
    // rack buttons
    $("stageAdd").addEventListener("click", () => { if (st.stages.length >= MAX_STAGES) { setStatus("Up to " + MAX_STAGES + " devices.", true); return; } st.stages.splice(st.stage + 1, 0, deep(BASE_STAGE)); st.stage++; showAll(); touched(); });
    $("stageDup").addEventListener("click", () => { if (st.stages.length >= MAX_STAGES) { setStatus("Up to " + MAX_STAGES + " devices.", true); return; } st.stages.splice(st.stage + 1, 0, deep(cur())); st.stage++; showAll(); touched(); });
    $("stageDel").addEventListener("click", () => { if (st.stages.length <= 1) { st.stages = [deep(BASE_STAGE)]; } else st.stages.splice(st.stage, 1); st.stage = clamp(st.stage, 0, st.stages.length - 1); showAll(); touched(); });
    $("stageUp").addEventListener("click", () => { const i = st.stage; if (i > 0) { const t = st.stages[i - 1]; st.stages[i - 1] = st.stages[i]; st.stages[i] = t; st.stage--; showAll(); touched(); } });
    $("stageDown").addEventListener("click", () => { const i = st.stage; if (i < st.stages.length - 1) { const t = st.stages[i + 1]; st.stages[i + 1] = st.stages[i]; st.stages[i] = t; st.stage++; showAll(); touched(); } });
}
function stageLabel(sg) {
    const dv = deviceOf(sg), p = paramsOf(sg); let sub = "";
    const opt = (dv.options || [])[0];
    if (opt && dv.id !== "shift" && dv.id !== "cutpaste") { const c = opt.choices.find(x => x[0] === p[opt.id]); if (c) sub = c[1].split(/[:(]/)[0].trim(); }
    return dv.name + (sub && sub.toLowerCase() !== dv.name.toLowerCase() ? " · " + sub : "");
}
function stageMeta(sg) {
    const bits = [];
    if (sg.mix < 1) bits.push(Math.round(sg.mix * 100) + "%");
    if (sg.rowFrom > 0 || sg.rowSpan < 100) bits.push("rows " + Math.round(sg.rowFrom) + "–" + Math.round(Math.min(100, sg.rowFrom + sg.rowSpan)));
    if (sg.chan && sg.chan !== "all") bits.push(sg.chan.toUpperCase());
    return bits.join(" ");
}
function drawRack() {
    const box = $("rack"); box.innerHTML = "";
    st.stages.forEach((sg, i) => {
        const b = document.createElement("div"); b.className = "slot" + (i === st.stage ? " on" : "") + (sg.enabled === false ? " off" : "");
        const num = document.createElement("span"); num.className = "num"; num.textContent = "" + (i + 1);
        const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = stageLabel(sg);
        const meta = document.createElement("span"); meta.className = "meta"; meta.textContent = stageMeta(sg);
        b.appendChild(num); b.appendChild(nm); b.appendChild(meta);
        b.addEventListener("click", () => { st.stage = i; showAll(); saveState(); });
        box.appendChild(b);
    });
    const tag = "device " + (st.stage + 1) + " of " + st.stages.length;
    for (const id of ["stgDevice", "stgStage"]) $(id).textContent = st.stages.length > 1 ? "(" + tag + ")" : "";
}
function applyOpen() {
    for (const sec of document.querySelectorAll(".sec")) { const open = st.open[sec.id] !== false; sec.classList.toggle("closed", !open); sec.querySelector(".tw").textContent = open ? "▾" : "▸"; }
}

// Device parameter rows are generated from the device's definition
function buildDeviceUI() {
    const box = $("deviceParams"); box.innerHTML = "";
    const sg = cur(), dv = deviceOf(sg), prm = paramsOf(sg); sg.params[dv.id] = prm;
    $("deviceNote").textContent = dv.hint;
    for (const q of dv.params) {
        const row = document.createElement("div"); row.className = "row";
        const lab = document.createElement("label"); lab.textContent = q.name + (q.time ? " ⏱" : ""); if (q.hint) lab.title = q.hint;
        const r = document.createElement("input"); r.type = "range";
        const n = document.createElement("input"); n.type = "text";
        row.appendChild(lab); row.appendChild(r); row.appendChild(n); box.appendChild(row);
        const show = bindPair(r, n, () => prm[q.id], v => { prm[q.id] = v; }, 1, q, touched); show();
        if (q.hint) { const h = document.createElement("div"); h.className = "hint"; h.textContent = q.hint; box.appendChild(h); }
    }
    for (const o of (dv.options || [])) {
        const row = document.createElement("div"); row.className = "row";
        const lab = document.createElement("label"); lab.textContent = o.name;
        const sel = document.createElement("select");
        for (const [v, t] of o.choices) { const op = document.createElement("option"); op.value = v; op.textContent = t; sel.appendChild(op); }
        sel.value = prm[o.id] == null ? o.choices[0][0] : prm[o.id];
        sel.addEventListener("change", () => { prm[o.id] = sel.value; touched(); });
        row.appendChild(lab); row.appendChild(sel); box.appendChild(row);
    }
    if (dv.params.some(q => q.time)) { const t = document.createElement("div"); t.className = "hint"; t.textContent = "⏱ marks pixel distances; previews scale them to the preview size."; box.appendChild(t); }
}
function showAll() { cur(); for (const f of showers) f(); buildDeviceUI(); applyOpen(); drawRack(); $("presetMod").textContent = st.modified && st.preset ? "modified" : ""; }

// ------------------------------------------------------------------ presets

function rebuildPresetMenu() {
    const sel = $("preset"); sel.innerHTML = "";
    const add = (v, t) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); };
    add("", "— choose a starting point —");
    let group = "";
    for (const p of HX_PRESETS) { if (p.group && p.group !== group) { group = p.group; add("__sep" + group, "— " + group + " —"); } add(p.id, p.title); }
    const names = Object.keys(userPresets).sort();
    if (names.length) { add("__sepuser", "— your presets —"); for (const nm of names) add("user:" + nm, nm); }
    sel.value = st.preset || "";
}
function applyPreset(id) {
    let patch = null, note = "";
    if (id.indexOf("user:") === 0) { patch = userPresets[id.slice(5)]; note = "Your preset."; }
    else { const p = HX_PRESETS.find(x => x.id === id); if (p) { patch = p.st || p; note = p.note; } }
    if (!patch) return;
    const keep = { source: st.source, strength: st.strength, proxy: st.proxy, open: st.open };
    st = deep(BASE); Object.assign(st, keep);
    const stages = patch.__full ? patch.__full.stages : patch.stages;
    st.stages = Array.isArray(stages) && stages.length ? stages.map(toStage) : [toStage(patch)];
    st.stage = 0; st.preset = id; st.modified = false;
    $("note").textContent = note;
    showAll(); saveState();
}
$("preset").addEventListener("change", () => { const v = $("preset").value; if (v.indexOf("__sep") === 0 || v === "") { $("preset").value = st.preset || ""; return; } applyPreset(v); });
$("saveUser").addEventListener("click", () => {
    const nm = ($("userName").value || "").trim(); if (!nm) { setStatus("Type a name for the preset first.", true); return; }
    userPresets[nm] = { __full: { stages: deep(st.stages) } }; st.preset = "user:" + nm; st.modified = false;
    rebuildPresetMenu(); saveState(); setStatus("Saved preset \"" + nm + "\".");
});
$("deleteUser").addEventListener("click", () => {
    if (!st.preset || st.preset.indexOf("user:") !== 0) { setStatus("Choose one of your presets to delete it.", true); return; }
    const nm = st.preset.slice(5); delete userPresets[nm]; st.preset = ""; rebuildPresetMenu(); saveState(); setStatus("Deleted preset \"" + nm + "\".");
});
$("resetBtn").addEventListener("click", () => { const keep = { source: st.source, strength: st.strength, proxy: st.proxy, open: st.open }; st = deep(BASE); Object.assign(st, keep); $("note").textContent = ""; showAll(); saveState(); setStatus("Back to defaults: one Shift device."); });

// Randomise a stage: a random device with parameters drawn from their ranges
function randomStage() {
    const R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];
    const sg = deep(BASE_STAGE);
    const dv = pick(HX_ENGINE.LIST); sg.device = dv.id;
    const prm = HX_ENGINE.defaults(dv);
    for (const q of dv.params) {
        const wide = q.min > 0 && q.max / q.min > 20, t = R();
        let v = wide ? Math.exp(Math.log(q.min) + t * (Math.log(q.max) - Math.log(q.min))) : q.min + t * (q.max - q.min);
        // keep probabilities and damage counts in the useful lower half most of the time
        if (/prob|hits|density|scramble|noise|bump|drop/.test(q.id) && R() < 0.7) v = q.min + (v - q.min) * 0.3;
        prm[q.id] = +(Math.round(v / q.step) * q.step).toFixed(4);
    }
    for (const o of (dv.options || [])) prm[o.id] = pick(o.choices)[0];
    if (dv.id === "jpeg" && prm.damage === "none" && prm.dqt === "honest") prm.damage = "flip";
    sg.params[dv.id] = prm;
    sg.mix = R() < 0.75 ? 1 : Math.round(R() * 100) / 100;
    if (R() < 0.25) { sg.rowFrom = Math.round(R() * 80); sg.rowSpan = Math.round(10 + R() * (100 - sg.rowFrom - 10)); }
    sg.chan = R() < 0.85 ? "all" : pick(["r", "g", "b"]);
    sg.seed = 1 + Math.floor(R() * 999998);
    return sg;
}
$("randomBtn").addEventListener("click", () => {
    const sg = randomStage();
    st.stages[st.stage] = sg; st.preset = ""; st.modified = false;
    $("note").textContent = "Randomised device " + (st.stage + 1) + ": " + stageLabel(sg) + ".";
    showAll(); saveState(); setStatus("Randomised device " + (st.stage + 1) + ". Press Preview.");
});
$("randomAllBtn").addEventListener("click", () => {
    const n = 2 + Math.floor(Math.random() * 3);
    st.stages = []; for (let i = 0; i < n; i++) st.stages.push(randomStage());
    st.stage = 0; st.preset = ""; st.modified = false;
    $("note").textContent = "Random rack: " + st.stages.map(stageLabel).join(" → ") + ".";
    showAll(); saveState(); setStatus("Randomised a rack of " + n + ". Press Preview.");
});

// ------------------------------------------------------------------ photoshop helpers

function allLayers(layers, out) { out = out || []; for (const l of layers) { out.push(l); if (l.layers && l.layers.length) allLayers(l.layers, out); } return out; }
async function setOpacity(docID, layerID, pct) {
    await batchPlay([{ _obj: "set", _target: [{ _ref: "layer", _id: layerID }, { _ref: "document", _id: docID }], to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: pct } } }], {});
}
function label() { return st.stages.filter(s => s.enabled !== false).map(stageLabel).join(" → ") || "nothing"; }
function stageSettings(sg) { return { enabled: sg.enabled !== false, device: sg.device, params: paramsOf(sg), seed: sg.seed, mix: sg.mix, rowFrom: sg.rowFrom, rowSpan: sg.rowSpan, chan: sg.chan }; }
function rackSettings() { return st.stages.map(stageSettings); }

// ------------------------------------------------------------------ render

async function render(mode) {
    const t0 = Date.now();
    let info = "";
    let replace = false;
    if (mode === "update") { if (!lastResult) throw new Error("Nothing to update yet: Preview or Render first."); mode = lastResult.mode; replace = true; }
    else if (mode === "preview" && lastResult && lastResult.mode === "preview") replace = true; // previews are throwaway: a new one replaces the old
    const rack = rackSettings();
    if (!rack.some(s => s.enabled)) throw new Error("Every device is switched off.");
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({ documentID: doc.id, name: "Hexrack" });
        const hidden = [];
        try {
            if (doc.mode !== constants.DocumentMode.RGB) throw new Error("Hexrack works on RGB documents (Image > Mode > RGB Color).");
            const bits = doc.bitsPerChannel === constants.BitsPerChannelType.SIXTEEN ? 16 : (doc.bitsPerChannel === constants.BitsPerChannelType.THIRTYTWO ? 32 : 8);
            if (bits === 32) throw new Error("32-bit documents aren't supported; convert to 16-bit or 8-bit first.");
            const W = Math.round(doc.width), H = Math.round(doc.height), n = W * H, MAXV = bits === 16 ? 32768 : 255;

            if (replace && lastResult && lastResult.docID === doc.id) { const old = allLayers(doc.layers).find(l => l.id === lastResult.layerID); if (old) await old.delete(); lastResult = null; }

            let src = null;
            if (st.source === "layer") {
                src = doc.activeLayers[0];
                if (!src) throw new Error("Select a layer first, or set Source to Whole image.");
                if (src.kind === constants.LayerKind.GROUP) throw new Error("Select a pixel layer, not a group.");
            } else {
                for (const l of allLayers(doc.layers)) if (l.name.indexOf("Hexrack") === 0 && l.visible) { l.visible = false; hidden.push(l); }
            }
            const req = { documentID: doc.id, componentSize: bits, colorSpace: "RGB", sourceBounds: { left: 0, top: 0, right: W, bottom: H } };
            if (src) req.layerID = src.id;
            const got = await imaging.getPixels(req);
            const img = got.imageData, gw = img.width, gh = img.height, comps = img.components, gb = got.sourceBounds;
            const data = await img.getData({ chunky: true });
            img.dispose();
            for (const l of hidden) l.visible = true; hidden.length = 0;

            // the file: 8-bit interleaved RGB
            const rgb = new Uint8Array(n * 3);
            const alpha = comps === 4 ? new Float32Array(n) : null;
            const to8 = bits === 16 ? (v) => Math.round(v * 255 / 32768) : (v) => v;
            for (let y = 0; y < gh; y++) { const Y = gb.top + y; if (Y < 0 || Y >= H) continue; for (let x = 0; x < gw; x++) { const X = gb.left + x; if (X < 0 || X >= W) continue; const o = (y * gw + x) * comps, i = Y * W + X; rgb[i * 3] = to8(data[o]); rgb[i * 3 + 1] = to8(data[o + 1]); rgb[i * 3 + 2] = to8(data[o + 2]); if (alpha) alpha[i] = data[o + 3] / MAXV; } }

            let docIn = { w: W, h: H, d: rgb }, r, outImgData, how;
            if (mode === "preview") {
                const px = HX_ENGINE.proxy(docIn, st.proxy);
                const ch = px.f < 1 ? rack.map(s => HX_ENGINE.settingsForProxy(s, px.f)) : rack;
                r = HX_ENGINE.runRack(px, ch);
                outImgData = px.f < 1 ? HX_ENGINE.upsample(r.img, W, H) : r.img;
                how = "preview " + px.w + "×" + px.h + " (×" + px.f.toFixed(3) + ")";
            } else {
                r = HX_ENGINE.runRack(docIn, rack); outImgData = r.img; how = W + "×" + H + (bits === 16 ? " (16-bit)" : "");
            }

            const od = outImgData.d;
            const out = bits === 16 ? new Uint16Array(n * 4) : new Uint8Array(n * 4);
            const from8 = bits === 16 ? (v) => Math.round(v * 32768 / 255) : (v) => v;
            for (let i = 0; i < n; i++) { out[i * 4] = from8(od[i * 3]); out[i * 4 + 1] = from8(od[i * 3 + 1]); out[i * 4 + 2] = from8(od[i * 3 + 2]); out[i * 4 + 3] = alpha ? Math.round(alpha[i] * MAXV) : MAXV; }

            const lname = (mode === "preview" ? "Hexrack preview · " : "Hexrack · ") + label();
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
            info = how + ", " + r.stages.length + " device" + (r.stages.length === 1 ? "" : "s") + " (" + r.stages.map(s => (s.ms / 1000).toFixed(1) + "s").join(" + ") + ")";
        } finally {
            for (const l of hidden) { try { l.visible = true; } catch (e) {} }
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Hexrack" });
    return info + ", total " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
}

async function run(mode) {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    for (const b of ["renderBtn", "previewBtn", "updateBtn"]) $(b).disabled = true;
    setStatus(mode === "preview" ? "Bending preview…" : "Bending…");
    await new Promise(r => setTimeout(r, 30));
    try { const r = await render(mode); setStatus("Done: " + r); }
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
if (st.preset) { const p = HX_PRESETS.find(x => x.id === st.preset); $("note").textContent = p ? p.note : (st.preset.indexOf("user:") === 0 ? "Your preset." : ""); }
showAll();
setStatus("Ready. Pick a preset, or a device, then Preview. Add devices under Rack to chain them.");
