// GlitchSlice — UXP panel logic
// Slices the active layer into strips and scatters them. One pass per
// press of "Run pass"; each pass is a single undo step.

const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

// ------------------------------------------------------------------ UI

const FIELDS = [
    "orientation", "targetCount", "minW", "maxW", "spread", "widthGrowth",
    "featherMin", "featherMax", "featherVar",
    "direction", "offMode", "offMin", "offMax", "offGrowth",
    "probability", "crossShift", "mergeResult", "workOnCopy"
];

function $(id) { return document.getElementById(id); }

function readOpts() {
    const o = {};
    o.orientation = parseInt($("orientation").value, 10);
    o.targetCount = $("targetCount").value.trim() === "" ? 0 : clamp(int($("targetCount").value, 0), 0, 10000);
    o.minW = clamp(int($("minW").value, 10), 1, 100000);
    o.maxW = clamp(int($("maxW").value, 80), o.minW, 100000);
    o.spread = clamp(int($("spread").value, 100), 0, 100);
    o.widthGrowth = clamp(flt($("widthGrowth").value, 1), 0.05, 20);
    o.featherMin = clamp(int($("featherMin").value, 0), 0, 1000);
    o.featherMax = clamp(int($("featherMax").value, 0), o.featherMin, 1000);
    o.featherVar = clamp(int($("featherVar").value, 100), 0, 100);
    o.direction = parseInt($("direction").value, 10);
    o.offMode = parseInt($("offMode").value, 10);
    o.offMin = clamp(int($("offMin").value, 0), 0, 100000);
    o.offMax = clamp(int($("offMax").value, 200), o.offMin, 100000);
    o.offGrowth = clamp(flt($("offGrowth").value, 1), 0.05, 20);
    o.probability = clamp(int($("probability").value, 40), 0, 100);
    o.crossShift = clamp(int($("crossShift").value, 0), 0, 100000);
    o.mergeResult = $("mergeResult").checked;
    o.workOnCopy = $("workOnCopy").checked;
    return o;
}

function writeOpts(o) {
    for (const k of FIELDS) {
        const el = $(k);
        if (!el || !(k in o)) continue;
        if (el.type === "checkbox") el.checked = !!o[k];
        else if (k === "targetCount") el.value = o[k] > 0 ? "" + o[k] : "";
        else el.value = "" + o[k];
    }
    $("spreadVal").textContent = "" + $("spread").value;
    $("probabilityVal").textContent = "" + $("probability").value;
    $("featherVarVal").textContent = "" + $("featherVar").value;
}

function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function flt(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.round(rnd(lo, hi)); }

function saveOpts() {
    try { localStorage.setItem("glitchslice", JSON.stringify(readOpts())); } catch (e) {}
}

function loadOpts() {
    try {
        const s = localStorage.getItem("glitchslice");
        if (s) writeOpts(JSON.parse(s));
    } catch (e) {}
}

function setStatus(msg, isErr) {
    const el = $("status");
    el.textContent = msg;
    el.className = isErr ? "err" : "";
}

// ------------------------------------------------------------- randomise

function randomiseAll() {
    const minW = rndInt(3, 60);
    const offMin = rndInt(0, 60);
    const fMin = Math.random() < 0.5 ? 0 : rndInt(0, 6);
    const o = {
        orientation: rndInt(0, 1),
        minW: minW,
        maxW: minW + rndInt(10, 250),
        spread: rndInt(0, 100),
        widthGrowth: Math.random() < 0.5 ? 1 : round1(Math.exp(rnd(-1.2, 1.2))),
        featherMin: fMin,
        featherMax: fMin === 0 && Math.random() < 0.5 ? 0 : fMin + rndInt(2, 12),
        featherVar: rndInt(0, 100),
        direction: rndInt(0, 5),
        offMode: rndInt(0, 2),
        offMin: offMin,
        offMax: offMin + rndInt(20, 400),
        offGrowth: Math.random() < 0.5 ? 1 : round1(Math.exp(rnd(-1.2, 1.2))),
        probability: rndInt(20, 80),
        crossShift: Math.random() < 0.5 ? 0 : rndInt(10, 200)
    };
    // leave mergeResult / workOnCopy as the user set them
    writeOpts(o);
    saveOpts();
    setStatus("Randomised. Press Run pass.");
}

function round1(n) { return Math.round(n * 10) / 10; }

// ------------------------------------------------------------ batchPlay

function px(v) { return { _unit: "pixelsUnit", _value: v }; }

function cmdSelectRect(l, t, r, b) {
    return {
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _obj: "rectangle", top: px(t), left: px(l), bottom: px(b), right: px(r) }
    };
}

const cmdDeselect = {
    _obj: "set",
    _target: [{ _ref: "channel", _property: "selection" }],
    to: { _enum: "ordinal", _value: "none" }
};

const cmdCutToLayer = { _obj: "cutToLayer" };

function cmdFeather(r) {
    return { _obj: "feather", radius: px(r) };
}

function cmdMove(dx, dy) {
    return {
        _obj: "move",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "offset", horizontal: px(dx), vertical: px(dy) }
    };
}

function cmdSelectLayer(id, add) {
    const c = {
        _obj: "select",
        _target: [{ _ref: "layer", _id: id }],
        makeVisible: false
    };
    if (add) c.selectionModifier = { _enum: "selectionModifierType", _value: "addToSelection" };
    return c;
}

async function bp(cmds) {
    return await batchPlay(cmds, {});
}

// -------------------------------------------------------------- the pass

async function runPass(o) {
    let moved = 0, total = 0;

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id,
            name: "GlitchSlice pass"
        });

        try {
            let src = doc.activeLayers[0];
            if (!src) throw new Error("Select a layer first.");
            if (src.kind === "group") throw new Error("Select a pixel layer, not a group.");

            let workLayer = src;
            if (o.workOnCopy) {
                workLayer = await src.duplicate();
                workLayer.name = src.name + " glitch";
                src.visible = false;
            } else if (src.isBackgroundLayer) {
                // promote so transparency is possible
                await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _property: "background" }],
                    to: { _obj: "layer", name: "glitch" }
                }]);
                workLayer = doc.activeLayers[0];
            }
            await bp([cmdSelectLayer(workLayer.id, false)]);
            const workID = workLayer.id;

            const b = workLayer.bounds;
            const x0 = b.left, y0 = b.top, x1 = b.right, y1 = b.bottom;
            const vertical = (o.orientation === 0);
            const start = vertical ? x0 : y0;
            const end = vertical ? x1 : y1;
            const span = end - start;
            if (span < 2) throw new Error("Layer is too small to slice.");

            // precompute slice edges
            const edges = [start];
            if (o.targetCount >= 2) {
                // target-count mode: generate relative widths shaped by
                // randomness and growth, then scale to fill the span exactly
                const n = Math.min(o.targetCount, Math.floor(span));
                const ws = [];
                let sum = 0;
                for (let i = 0; i < n; i++) {
                    const t = n > 1 ? i / (n - 1) : 0;
                    let f = 1 + (Math.random() * 2 - 1) * (o.spread / 100) * 0.9;
                    f *= Math.pow(o.widthGrowth, t);
                    f = Math.max(0.05, f);
                    ws.push(f);
                    sum += f;
                }
                let pos = start;
                for (let i = 0; i < n - 1; i++) {
                    pos += (ws[i] / sum) * span;
                    edges.push(Math.round(pos));
                }
                edges.push(end);
            } else {
                const mid = (o.minW + o.maxW) / 2;
                const half = (o.maxW - o.minW) / 2;
                let pos = start;
                while (pos < end) {
                    const t = (pos - start) / span;
                    let w = mid + (Math.random() * 2 - 1) * (o.spread / 100) * half;
                    w *= Math.pow(o.widthGrowth, t);
                    w = Math.max(1, Math.round(w));
                    pos = Math.min(pos + w, end);
                    edges.push(pos);
                }
            }
            total = edges.length - 1;

            const newIds = [];

            for (let i = 0; i < edges.length - 1; i++) {
                if (Math.random() * 100 >= o.probability) continue;

                const t = (edges[i] - start) / span;
                let d;
                if (o.offMode === 0) d = o.offMax;
                else if (o.offMode === 1) d = Math.random() * o.offMax;
                else d = o.offMin + Math.random() * (o.offMax - o.offMin);
                d = Math.round(d * Math.pow(o.offGrowth, t));

                let dx = 0, dy = 0;
                const sign = Math.random() < 0.5 ? -1 : 1;
                switch (o.direction) {
                    case 0: dy = -d; break;
                    case 1: dy = d; break;
                    case 2: dx = -d; break;
                    case 3: dx = d; break;
                    case 4: dy = sign * d; break;
                    case 5: dx = sign * d; break;
                }

                // cross-shift: random +/- nudge on the other axis
                if (o.crossShift > 0) {
                    const c = Math.round((Math.random() * 2 - 1) * o.crossShift);
                    if (dx === 0) dx = c; else dy = c;
                }
                if (dx === 0 && dy === 0) continue;

                let l, tp, r, bt;
                if (vertical) { l = edges[i]; r = edges[i + 1]; tp = y0; bt = y1; }
                else { l = x0; r = x1; tp = edges[i]; bt = edges[i + 1]; }

                const selCmds = [cmdSelectLayer(workID, false), cmdSelectRect(l, tp, r, bt)];
                if (o.featherMax > 0) {
                    const fMid = (o.featherMin + o.featherMax) / 2;
                    const fHalf = (o.featherMax - o.featherMin) / 2;
                    const f = fMid + (Math.random() * 2 - 1) * (o.featherVar / 100) * fHalf;
                    if (f >= 0.5) selCmds.push(cmdFeather(Math.round(f * 10) / 10));
                }
                await bp(selCmds);
                try {
                    await bp([cmdCutToLayer]);
                } catch (e) {
                    continue; // slice fully transparent
                }
                const nl = app.activeDocument.activeLayers[0];
                if (!nl || nl.id === workID) continue; // cut produced nothing
                newIds.push(nl.id);
                await bp([cmdMove(dx, dy)]);
                moved++;
            }

            try { await bp([cmdDeselect]); } catch (e) {}

            if (o.mergeResult && newIds.length > 0) {
                const cmds = [cmdSelectLayer(workID, false)];
                for (const id of newIds) cmds.push(cmdSelectLayer(id, true));
                cmds.push({ _obj: "mergeLayersNew" });
                await bp(cmds);
            } else {
                await bp([cmdSelectLayer(workID, false)]);
            }
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "GlitchSlice pass" });

    return { moved, total };
}

// --------------------------------------------------------------- wiring

$("spread").addEventListener("input", () => { $("spreadVal").textContent = $("spread").value; });
$("probability").addEventListener("input", () => { $("probabilityVal").textContent = $("probability").value; });

for (const k of FIELDS) {
    const el = $(k);
    if (el) el.addEventListener("change", saveOpts);
}

$("randomBtn").addEventListener("click", randomiseAll);

$("runBtn").addEventListener("click", async () => {
    if (app.documents.length === 0) {
        setStatus("Open a document first.", true);
        return;
    }
    const o = readOpts();
    writeOpts(o); // reflect any clamping back into the UI
    saveOpts();
    setStatus("Running…");
    $("runBtn").disabled = true;
    try {
        const r = await runPass(o);
        setStatus("Done: moved " + r.moved + " of " + r.total + " slices.");
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

loadOpts();
setStatus("Ready.");
