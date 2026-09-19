// PatchScatter — UXP panel logic
// Copies random rectangular patches of the selected (base) layer and drops
// them at random positions on a "Scatter" layer directly above it. One pass
// per press of "Run pass"; each pass is a single undo step.

const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

const SCATTER_NAME = "Scatter";
const FIELDS = ["count", "minSum", "maxSum", "maxAspect", "feather"];
const RADIOS = { edges: ["edgesInside", "edgesOver"], source: ["srcBase", "srcMerged"] };

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function flt(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.floor(rnd(lo, hi + 1)); }

function radioValue(name) {
    for (const id of RADIOS[name]) if ($(id).checked) return parseInt($(id).value, 10);
    return 0;
}
function setRadio(name, v) {
    for (const id of RADIOS[name]) $(id).checked = (parseInt($(id).value, 10) === v);
}

// ------------------------------------------------------------------ UI

function readOpts() {
    const o = {};
    o.count = clamp(int($("count").value, 40), 1, 5000);
    o.minSum = clamp(int($("minSum").value, 30), 2, 100000);
    o.maxSum = clamp(int($("maxSum").value, 100), o.minSum, 100000);
    o.maxAspect = clamp(flt($("maxAspect").value, 3), 1, 1000);
    o.feather = clamp(flt($("feather").value, 1), 0, 1000);
    o.edges = radioValue("edges");   // 0 inside, 1 may overhang
    o.source = radioValue("source"); // 0 base only, 1 merged composite
    return o;
}

function writeOpts(o) {
    for (const k of FIELDS) if (k in o) $(k).value = "" + o[k];
    if ("edges" in o) setRadio("edges", o.edges);
    if ("source" in o) setRadio("source", o.source);
}

function saveOpts() {
    try { localStorage.setItem("patchscatter", JSON.stringify(readOpts())); } catch (e) {}
}
function loadOpts() {
    try {
        const s = localStorage.getItem("patchscatter");
        if (s) writeOpts(JSON.parse(s));
    } catch (e) {}
}

function setStatus(msg, isErr) {
    const el = $("status");
    el.textContent = msg;
    el.className = isErr ? "err" : "";
}

// ------------------------------------------------------------ batchPlay

function px(v) { return { _unit: "pixelsUnit", _value: v }; }

function cmdSelectRect(l, t, r, b) {
    return {
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _obj: "rectangle", top: px(t), left: px(l), bottom: px(b), right: px(r) }
    };
}
const cmdSelectAll = {
    _obj: "set",
    _target: [{ _ref: "channel", _property: "selection" }],
    to: { _enum: "ordinal", _value: "allEnum" }
};
const cmdDeselect = {
    _obj: "set",
    _target: [{ _ref: "channel", _property: "selection" }],
    to: { _enum: "ordinal", _value: "none" }
};
function cmdFeather(r) { return { _obj: "feather", radius: px(r) }; }
const cmdCopy = { _obj: "copyEvent" };
const cmdCopyMerged = { _obj: "copyMerged" };
const cmdPasteInPlace = {
    _obj: "paste",
    inPlace: true,
    antiAlias: { _enum: "antiAliasType", _value: "antiAliasNone" },
    as: { _class: "pixel" }
};
const cmdMergeDown = { _obj: "mergeLayers" };
const cmdDeletePixels = { _obj: "delete" };
function cmdMove(dx, dy) {
    return {
        _obj: "move",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "offset", horizontal: px(dx), vertical: px(dy) }
    };
}
function cmdSelectLayer(id) {
    return { _obj: "select", _target: [{ _ref: "layer", _id: id }], makeVisible: false };
}
function cmdMakeLayer(name) {
    return { _obj: "make", _target: [{ _ref: "layer" }], using: { _obj: "layer", name: name } };
}
async function bp(cmds) { return await batchPlay(cmds, {}); }

// ------------------------------------------------------------- helpers

function findLayerByName(layers, name) {
    for (const l of layers) {
        if (l.name === name && l.kind !== "group") return l;
        if (l.layers) {
            const f = findLayerByName(l.layers, name);
            if (f) return f;
        }
    }
    return null;
}

// Returns { base, scatter }; creates the Scatter layer above base if needed.
async function getLayers(doc, create) {
    const base = doc.activeLayers[0];
    if (!base) throw new Error("Select the base layer first.");
    if (base.kind === "group") throw new Error("Select a pixel layer, not a group.");
    if (base.name === SCATTER_NAME) throw new Error("Select the base layer, not the Scatter layer.");
    let scatter = findLayerByName(doc.layers, SCATTER_NAME);
    if (!scatter && create) {
        await bp([cmdSelectLayer(base.id), cmdMakeLayer(SCATTER_NAME)]);
        scatter = app.activeDocument.activeLayers[0];
    }
    if (scatter && !scatter.visible) scatter.visible = true;
    return { base, scatter };
}

// Pick a patch size: w + h uniform in [minSum, maxSum], aspect <= maxAspect.
function pickSize(o, W, H) {
    const sum = rndInt(o.minSum, o.maxSum);
    const a = o.maxAspect;
    // w = f * sum, with f in [1/(1+a), a/(1+a)] so that max(w,h)/min(w,h) <= a
    const f = rnd(1 / (1 + a), a / (1 + a));
    let w = Math.round(sum * f);
    let h = sum - w;
    w = clamp(w, 1, W);
    h = clamp(h, 1, H);
    return { w, h };
}

// -------------------------------------------------------------- the pass

async function runPass(o) {
    let placed = 0, skipped = 0;

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id, name: "PatchScatter pass"
        });
        try {
            const { base, scatter } = await getLayers(doc, true);
            const W = Math.round(doc.width), H = Math.round(doc.height);
            const baseID = base.id, scatterID = scatter.id;
            const copyCmd = o.source === 1 ? cmdCopyMerged : cmdCopy;

            for (let i = 0; i < o.count; i++) {
                const { w, h } = pickSize(o, W, H);

                // source rect, always fully inside the canvas
                const sx = rndInt(0, W - w), sy = rndInt(0, H - h);

                // destination
                let dx, dy;
                if (o.edges === 1) {
                    dx = rndInt(-(w - 1), W - 1);
                    dy = rndInt(-(h - 1), H - 1);
                } else {
                    dx = rndInt(0, W - w);
                    dy = rndInt(0, H - h);
                }

                const sel = [cmdSelectLayer(baseID), cmdSelectRect(sx, sy, sx + w, sy + h)];
                if (o.feather >= 0.1) sel.push(cmdFeather(Math.round(o.feather * 10) / 10));
                await bp(sel);

                try {
                    await bp([copyCmd]);
                } catch (e) {
                    skipped++; // empty / fully transparent area
                    continue;
                }

                await bp([cmdSelectLayer(scatterID), cmdPasteInPlace]);
                const pasted = app.activeDocument.activeLayers[0];
                if (!pasted || pasted.id === scatterID) { skipped++; continue; }

                const mv = [];
                if (dx !== sx || dy !== sy) mv.push(cmdMove(dx - sx, dy - sy));
                mv.push(cmdMergeDown);
                await bp(mv);
                placed++;
            }

            try { await bp([cmdDeselect]); } catch (e) {}
            await bp([cmdSelectLayer(baseID)]);
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "PatchScatter pass" });

    return { placed, skipped };
}

async function clearScatter() {
    let found = false;
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id, name: "PatchScatter clear"
        });
        try {
            const scatter = findLayerByName(doc.layers, SCATTER_NAME);
            if (!scatter) return;
            found = true;
            const prev = doc.activeLayers[0];
            await bp([cmdSelectLayer(scatter.id), cmdSelectAll]);
            try { await bp([cmdDeletePixels]); } catch (e) {}
            await bp([cmdDeselect]);
            if (prev) await bp([cmdSelectLayer(prev.id)]);
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "PatchScatter clear" });
    return found;
}

// --------------------------------------------------------------- wiring

for (const k of FIELDS) $(k).addEventListener("change", saveOpts);
for (const name in RADIOS) for (const id of RADIOS[name]) $(id).addEventListener("change", saveOpts);

$("runBtn").addEventListener("click", async () => {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    const o = readOpts();
    writeOpts(o);
    saveOpts();
    setStatus("Running…");
    $("runBtn").disabled = true;
    try {
        const r = await runPass(o);
        let msg = "Done: placed " + r.placed + " of " + o.count + " patches.";
        if (r.skipped) msg += " " + r.skipped + " skipped (empty area).";
        setStatus(msg);
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

$("clearBtn").addEventListener("click", async () => {
    if (app.documents.length === 0) { setStatus("Open a document first.", true); return; }
    try {
        const found = await clearScatter();
        setStatus(found ? "Scatter layer cleared." : "No Scatter layer in this document.");
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    }
});

loadOpts();
setStatus("Ready.");
