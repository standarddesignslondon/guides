// Row Jitter — per-band horizontal shift (UXP)
// Reads the active layer's pixels, shifts each horizontal band by a
// waveform + noise + occasional tears, writes them back. Single undo step.

const { app, core, action, imaging } = require("photoshop");
const batchPlay = action.batchPlay;

// ------------------------------------------------------------------ UI

const FIELDS = [
    "bandH", "amp", "wavelength", "jitterAmt", "smooth",
    "tearProb", "tearMax", "wrap", "workOnCopy"
];

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.round(rnd(lo, hi)); }

function readOpts() {
    return {
        bandH: clamp(int($("bandH").value, 2), 1, 64),
        amp: clamp(int($("amp").value, 6), 0, 500),
        wavelength: clamp(int($("wavelength").value, 300), 4, 5000),
        jitterAmt: clamp(int($("jitterAmt").value, 4), 0, 500),
        smooth: clamp(int($("smooth").value, 60), 0, 95),
        tearProb: clamp(int($("tearProb").value, 2), 0, 100),
        tearMax: clamp(int($("tearMax").value, 80), 0, 2000),
        wrap: $("wrap").checked,
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
    try { localStorage.setItem("rowjitter", JSON.stringify(readOpts())); } catch (e) {}
}

function loadOpts() {
    try {
        const s = localStorage.getItem("rowjitter");
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
        bandH: [1, 1, 2, 2, 3, 4, 8, 16][rndInt(0, 7)],
        amp: rndInt(2, 30),
        wavelength: rndInt(50, 1500),
        jitterAmt: rndInt(0, 20),
        smooth: rndInt(20, 90),
        tearProb: Math.random() < 0.4 ? 0 : rndInt(1, 8),
        tearMax: rndInt(30, 300)
    });
    saveOpts();
    setStatus("Randomised. Press Run pass.");
}

// -------------------------------------------------------------- the pass

async function runPass(o) {
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id,
            name: "Row Jitter pass"
        });
        try {
            let src = doc.activeLayers[0];
            if (!src) throw new Error("Select a layer first.");
            if (src.kind === "group") throw new Error("Select a pixel layer, not a group.");

            let work = src;
            if (o.workOnCopy) {
                work = await src.duplicate();
                work.name = src.name + " jitter";
                src.visible = false;
                await batchPlay([{
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: work.id }],
                    makeVisible: false
                }], {});
            }

            const gp = await imaging.getPixels({
                documentID: doc.id,
                layerID: work.id,
                applyAlpha: false
            });
            const im = gp.imageData;
            const W = im.width, H = im.height, C = im.components;
            const bounds = gp.sourceBounds;
            const data = await im.getData({});
            const out = new Uint8Array(data.length);

            const wrap = o.wrap || C < 4;
            const smooth = o.smooth / 100;
            const phase = Math.random() * Math.PI * 2;
            let jitter = 0, dxBand = 0, tearHold = 0, tearVal = 0;

            for (let y = 0; y < H; y++) {
                if (y % o.bandH === 0) {
                    jitter = jitter * smooth + (1 - smooth) * (Math.random() * 2 - 1);
                    let dx = o.amp * Math.sin(2 * Math.PI * y / o.wavelength + phase)
                        + jitter * o.jitterAmt;
                    if (tearHold > 0) {
                        tearHold--;
                    } else if (o.tearProb > 0 && Math.random() * 100 < o.tearProb) {
                        tearVal = (Math.random() < 0.5 ? -1 : 1) * rnd(o.tearMax * 0.3, o.tearMax);
                        tearHold = rndInt(1, 5);
                    } else {
                        tearVal = 0;
                    }
                    dxBand = Math.round(dx + (tearHold > 0 ? tearVal : 0));
                }

                const rowOff = y * W * C;
                for (let x = 0; x < W; x++) {
                    let sx = x - dxBand;
                    if (wrap) {
                        sx = ((sx % W) + W) % W;
                    } else if (sx < 0 || sx >= W) {
                        // leave as zeros (transparent)
                        continue;
                    }
                    const d = rowOff + x * C;
                    const s = rowOff + sx * C;
                    for (let c = 0; c < C; c++) out[d + c] = data[s + c];
                }
            }

            const newData = await imaging.createImageDataFromBuffer(out, {
                width: W, height: H, components: C, chunky: true,
                colorSpace: im.colorSpace || "RGB"
            });
            await imaging.putPixels({
                documentID: doc.id,
                layerID: work.id,
                imageData: newData,
                targetBounds: { left: bounds.left, top: bounds.top },
                replace: true
            });
            newData.dispose();
            im.dispose();
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Row Jitter pass" });
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
        await runPass(o);
        setStatus("Done.");
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

loadOpts();
setStatus("Ready.");
