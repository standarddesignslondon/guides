// Misregistered Print — UXP panel logic
// Optional colour halftone, per-plate colour misregistration, paper grain
// and warmth. One pass per press; single undo step.

const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

// ------------------------------------------------------------------ UI

const FIELDS = ["dotSize", "maxShift", "grain", "warmth", "workOnCopy"];

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.round(rnd(lo, hi)); }

function readOpts() {
    return {
        dotSize: clamp(int($("dotSize").value, 0), 0, 60),
        maxShift: clamp(int($("maxShift").value, 0), 0, 100),
        grain: clamp(int($("grain").value, 0), 0, 50),
        warmth: clamp(int($("warmth").value, 0), 0, 100),
        workOnCopy: $("workOnCopy").checked
    };
}

function writeOpts(o) {
    for (const k of FIELDS) {
        const el = $(k);
        if (!el || !(k in o)) continue;
        if (el.type === "checkbox") el.checked = !!o[k];
        else el.value = "" + o[k];
    }
}

function saveOpts() {
    try { localStorage.setItem("misprint", JSON.stringify(readOpts())); } catch (e) {}
}

function loadOpts() {
    try {
        const s = localStorage.getItem("misprint");
        if (s) writeOpts(JSON.parse(s));
    } catch (e) {}
}

function setStatus(msg, isErr) {
    const el = $("status");
    el.textContent = msg;
    el.className = isErr ? "err" : "";
}

function randomiseAll() {
    writeOpts({
        dotSize: Math.random() < 0.4 ? 0 : rndInt(4, 20),
        maxShift: rndInt(2, 20),
        grain: Math.random() < 0.3 ? 0 : rndInt(2, 12),
        warmth: Math.random() < 0.3 ? 0 : rndInt(10, 50)
    });
    saveOpts();
    setStatus("Randomised. Press Run pass.");
}

// ------------------------------------------------------------ batchPlay

function px(v) { return { _unit: "pixelsUnit", _value: v }; }
function pct(v) { return { _unit: "percentUnit", _value: v }; }

async function bp(cmds) {
    return await batchPlay(cmds, {});
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

function cmdMove(dx, dy) {
    return {
        _obj: "move",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "offset", horizontal: px(dx), vertical: px(dy) }
    };
}

function cmdChannelRestrict(channel) {
    return {
        _obj: "set",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        to: { _obj: "layer", blendOptions: { channelRestriction: [{ _enum: "channel", _value: channel }] } }
    };
}

// -------------------------------------------------------------- the pass

async function runPass(o) {
    const stages = [];

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id,
            name: "Misregistered Print pass"
        });
        try {
            let src = doc.activeLayers[0];
            if (!src) throw new Error("Select a layer first.");
            if (src.kind === "group") throw new Error("Select a pixel layer, not a group.");

            let work = src;
            if (o.workOnCopy) {
                work = await src.duplicate();
                work.name = src.name + " print";
                src.visible = false;
            } else if (src.isBackgroundLayer) {
                await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _property: "background" }],
                    to: { _obj: "layer", name: "print" }
                }]);
                work = doc.activeLayers[0];
            }
            await bp([cmdSelectLayer(work.id, false)]);

            // 1 — colour halftone
            if (o.dotSize >= 4) {
                await bp([{
                    _obj: "colorHalftone",
                    radius: o.dotSize,
                    angle1: 108, angle2: 162, angle3: 90, angle4: 45
                }]);
                stages.push("halftone");
            }

            // 2 — plate misregistration: each colour plate gets its own
            // random drift up to maxShift
            if (o.maxShift > 0) {
                const drift = () => {
                    const a = Math.random() * Math.PI * 2;
                    const d = rnd(o.maxShift * 0.4, o.maxShift);
                    return [Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d)];
                };
                const a = await work.duplicate();
                const b = await work.duplicate();
                const [rx, ry] = drift();
                const [gx, gy] = drift();
                await bp([cmdSelectLayer(a.id, false), cmdChannelRestrict("red"), cmdMove(rx, ry)]);
                await bp([cmdSelectLayer(b.id, false), cmdChannelRestrict("grain"), cmdMove(gx, gy)]);
                await bp([cmdSelectLayer(work.id, false), cmdChannelRestrict("blue")]); // blue anchors
                await bp([
                    cmdSelectLayer(a.id, false),
                    cmdSelectLayer(b.id, true),
                    cmdSelectLayer(work.id, true),
                    { _obj: "mergeLayersNew" }
                ]);
                work = doc.activeLayers[0];
                stages.push("misregistration");
            }

            // 3 — paper grain
            if (o.grain > 0) {
                await bp([{
                    _obj: "addNoise",
                    distort: { _enum: "distort", _value: "gaussianDistribution" },
                    noise: pct(o.grain),
                    monochromatic: true
                }]);
                stages.push("grain");
            }

            // 4 — warmth
            if (o.warmth > 0) {
                await bp([{
                    _obj: "photoFilter",
                    color: { _obj: "labColor", luminance: 67.2, a: 32.8, b: 120 },
                    density: o.warmth,
                    preserveLuminosity: true
                }]);
                stages.push("warmth");
            }

            await bp([cmdSelectLayer(work.id, false)]);
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Misregistered Print pass" });

    return stages;
}

// --------------------------------------------------------------- wiring

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
    writeOpts(o);
    saveOpts();
    setStatus("Running…");
    $("runBtn").disabled = true;
    try {
        const stages = await runPass(o);
        setStatus(stages.length
            ? "Done: " + stages.join(", ") + "."
            : "Nothing to do — every stage is 0.");
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

loadOpts();
setStatus("Ready.");
