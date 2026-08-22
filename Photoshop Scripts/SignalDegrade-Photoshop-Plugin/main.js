// Signal Degrade — UXP panel logic
// Runs a chain of lo-fi abuses on the active layer. Any stage at 0 is
// skipped. One pass per press; each pass is a single undo step.

const { app, core, action } = require("photoshop");
const batchPlay = action.batchPlay;

// ------------------------------------------------------------------ UI

const FIELDS = [
    "misreg", "blur", "sharpen", "crushLevels", "dither",
    "contrast", "grain", "desat", "vignette", "workOnCopy"
];

const PRESETS = {
    offair:    { misreg: 3, blur: 1.5, sharpen: 120, crushLevels: 0,  dither: 0, contrast: 8,  grain: 6,  desat: 15,  vignette: 25 },
    photocopy: { misreg: 0, blur: 1.0, sharpen: 300, crushLevels: 6,  dither: 8, contrast: 35, grain: 10, desat: 100, vignette: 15 },
    wornprint: { misreg: 1, blur: 0.6, sharpen: 80,  crushLevels: 0,  dither: 0, contrast: -5, grain: 5,  desat: 30,  vignette: 30 },
    subtle:    { misreg: 1, blur: 0.4, sharpen: 60,  crushLevels: 0,  dither: 0, contrast: 4,  grain: 3,  desat: 5,   vignette: 10 }
};

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function flt(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.round(rnd(lo, hi)); }

function readOpts() {
    return {
        misreg: clamp(int($("misreg").value, 0), 0, 50),
        blur: clamp(flt($("blur").value, 0), 0, 20),
        sharpen: clamp(int($("sharpen").value, 0), 0, 500),
        crushLevels: clamp(int($("crushLevels").value, 0), 0, 64),
        dither: clamp(int($("dither").value, 0), 0, 50),
        contrast: clamp(int($("contrast").value, 0), -50, 100),
        grain: clamp(int($("grain").value, 0), 0, 50),
        desat: clamp(int($("desat").value, 0), 0, 100),
        vignette: clamp(int($("vignette").value, 0), 0, 100),
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
    try { localStorage.setItem("signaldegrade", JSON.stringify(readOpts())); } catch (e) {}
}

function loadOpts() {
    try {
        const s = localStorage.getItem("signaldegrade");
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
        misreg: Math.random() < 0.4 ? 0 : rndInt(1, 12),
        blur: Math.random() < 0.3 ? 0 : Math.round(rnd(0.3, 4) * 10) / 10,
        sharpen: Math.random() < 0.3 ? 0 : rndInt(40, 350),
        crushLevels: Math.random() < 0.6 ? 0 : rndInt(4, 24),
        dither: Math.random() < 0.5 ? 0 : rndInt(3, 20),
        contrast: rndInt(-15, 45),
        grain: Math.random() < 0.2 ? 0 : rndInt(2, 18),
        desat: Math.random() < 0.4 ? 0 : rndInt(10, 100),
        vignette: Math.random() < 0.3 ? 0 : rndInt(10, 60)
    });
    $("preset").value = "custom";
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

function cmdAddNoise(amount) {
    return {
        _obj: "addNoise",
        distort: { _enum: "distort", _value: "gaussianDistribution" },
        noise: pct(amount),
        monochromatic: true
    };
}

const cmdDeselect = {
    _obj: "set",
    _target: [{ _ref: "channel", _property: "selection" }],
    to: { _enum: "ordinal", _value: "none" }
};

// -------------------------------------------------------------- the pass

async function runPass(o) {
    const stages = [];

    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id,
            name: "Signal Degrade pass"
        });

        try {
            let src = doc.activeLayers[0];
            if (!src) throw new Error("Select a layer first.");
            if (src.kind === "group") throw new Error("Select a pixel layer, not a group.");

            let work = src;
            if (o.workOnCopy) {
                work = await src.duplicate();
                work.name = src.name + " degraded";
                src.visible = false;
            } else if (src.isBackgroundLayer) {
                await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _property: "background" }],
                    to: { _obj: "layer", name: "degraded" }
                }]);
                work = doc.activeLayers[0];
            }
            await bp([cmdSelectLayer(work.id, false)]);

            // 1 — channel misregistration
            if (o.misreg > 0) {
                const a = await work.duplicate();
                const b = await work.duplicate();
                await bp([cmdSelectLayer(a.id, false), cmdChannelRestrict("red"), cmdMove(-o.misreg, 0)]);
                await bp([cmdSelectLayer(b.id, false), cmdChannelRestrict("grain")]); // green, unmoved
                await bp([cmdSelectLayer(work.id, false), cmdChannelRestrict("blue"), cmdMove(o.misreg, 0)]);
                await bp([
                    cmdSelectLayer(a.id, false),
                    cmdSelectLayer(b.id, true),
                    cmdSelectLayer(work.id, true),
                    { _obj: "mergeLayersNew" }
                ]);
                work = doc.activeLayers[0];
                stages.push("misregistration");
            }

            // 2 — soften
            if (o.blur > 0) {
                await bp([{ _obj: "gaussianBlur", radius: px(o.blur) }]);
                stages.push("soften");
            }

            // 3 — halo
            if (o.sharpen > 0) {
                await bp([{
                    _obj: "unsharpMask",
                    amount: pct(o.sharpen),
                    radius: px(Math.max(1.5, o.blur * 2.5)),
                    threshold: 0
                }]);
                stages.push("halo");
            }

            // 4 — tonal crush (dither noise first so bands break into speckle)
            if (o.crushLevels >= 2) {
                if (o.dither > 0) await bp([cmdAddNoise(o.dither)]);
                await bp([{ _obj: "posterization", levels: o.crushLevels }]);
                stages.push("crush");
            }

            // 5 — grain
            if (o.grain > 0) {
                await bp([cmdAddNoise(o.grain)]);
                stages.push("grain");
            }

            // 6 — desaturate
            if (o.desat > 0) {
                await bp([{
                    _obj: "hueSaturation",
                    presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                    adjustment: [{ _obj: "hueSatAdjustmentV2", hue: 0, saturation: -o.desat, lightness: 0 }]
                }]);
                stages.push("desaturate");
            }

            // 7 — contrast
            if (o.contrast !== 0) {
                await bp([{
                    _obj: "brightnessEvent",
                    brightness: 0,
                    center: o.contrast,
                    useLegacy: false
                }]);
                stages.push("contrast");
            }

            // 8 — vignette
            if (o.vignette > 0) {
                const W = doc.width, H = doc.height;
                const feather = Math.round(Math.min(W, H) * 0.12);
                await bp([
                    {
                        _obj: "set",
                        _target: [{ _ref: "channel", _property: "selection" }],
                        to: {
                            _obj: "ellipse",
                            top: px(-H * 0.05), left: px(-W * 0.05),
                            bottom: px(H * 1.05), right: px(W * 1.05)
                        }
                    },
                    { _obj: "feather", radius: px(feather) },
                    { _obj: "inverse" },
                    {
                        _obj: "fill",
                        using: { _enum: "fillContents", _value: "black" },
                        opacity: pct(o.vignette),
                        mode: { _enum: "blendMode", _value: "multiply" },
                        preserveTransparency: true
                    },
                    cmdDeselect
                ]);
                stages.push("vignette");
            }

            await bp([cmdSelectLayer(work.id, false)]);
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Signal Degrade pass" });

    return stages;
}

// --------------------------------------------------------------- wiring

$("preset").addEventListener("change", () => {
    const p = PRESETS[$("preset").value];
    if (p) {
        writeOpts(p);
        saveOpts();
        setStatus("Preset loaded. Press Run pass.");
    }
});

for (const k of FIELDS) {
    const el = $(k);
    if (!el) continue;
    el.addEventListener("change", () => {
        if (el.type !== "checkbox") $("preset").value = "custom";
        saveOpts();
    });
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
