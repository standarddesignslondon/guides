// Static — procedural noise layer generator (UXP)
// Builds a canvas-sized noise buffer in JS and writes it into a fresh
// layer with the imaging API. One generate per press; single undo step.

const { app, core, action, imaging } = require("photoshop");
const batchPlay = action.batchPlay;

// ------------------------------------------------------------------ UI

const FIELDS = [
    "staticAmt", "streakAmt", "streakLen", "humCount", "humStrength",
    "humThickness", "scanSpacing", "scanDark", "dropDensity", "dropLen",
    "contrast", "chroma", "blend", "opacity"
];

function $(id) { return document.getElementById(id); }
function int(v, d) { const n = parseInt(v, 10); return isNaN(n) ? d : n; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi) { return Math.round(rnd(lo, hi)); }

function readOpts() {
    return {
        staticAmt: clamp(int($("staticAmt").value, 40), 0, 127),
        streakAmt: clamp(int($("streakAmt").value, 0), 0, 100),
        streakLen: clamp(int($("streakLen").value, 30), 1, 500),
        humCount: clamp(int($("humCount").value, 0), 0, 8),
        humStrength: clamp(int($("humStrength").value, 0), 0, 100),
        humThickness: clamp(int($("humThickness").value, 60), 4, 2000),
        scanSpacing: clamp(int($("scanSpacing").value, 0), 0, 50),
        scanDark: clamp(int($("scanDark").value, 0), 0, 100),
        dropDensity: clamp(int($("dropDensity").value, 0), 0, 100),
        dropLen: clamp(int($("dropLen").value, 60), 2, 500),
        contrast: clamp(int($("contrast").value, 0), -50, 100),
        chroma: $("chroma").checked,
        blend: $("blend").value,
        opacity: clamp(int($("opacity").value, 35), 1, 100)
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
    try { localStorage.setItem("staticgen", JSON.stringify(readOpts())); } catch (e) {}
}

function loadOpts() {
    try {
        const s = localStorage.getItem("staticgen");
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
        staticAmt: rndInt(10, 90),
        streakAmt: Math.random() < 0.3 ? 0 : rndInt(10, 70),
        streakLen: rndInt(5, 150),
        humCount: Math.random() < 0.4 ? 0 : rndInt(1, 4),
        humStrength: rndInt(15, 60),
        humThickness: rndInt(20, 300),
        scanSpacing: Math.random() < 0.6 ? 0 : rndInt(2, 8),
        scanDark: rndInt(20, 70),
        dropDensity: Math.random() < 0.4 ? 0 : rndInt(5, 40),
        dropLen: rndInt(10, 150),
        contrast: rndInt(-10, 40),
        chroma: Math.random() < 0.3,
        blend: ["overlay", "softLight", "screen", "normal", "linearLight"][rndInt(0, 4)],
        opacity: rndInt(15, 70)
    });
    saveOpts();
    setStatus("Randomised. Press Generate.");
}

// ------------------------------------------------------------ batchPlay

function pct(v) { return { _unit: "percentUnit", _value: v }; }

async function bp(cmds) {
    return await batchPlay(cmds, {});
}

// ------------------------------------------------------------- generate

function buildBuffer(W, H, o) {
    const buf = new Uint8Array(W * H * 4);

    // hum bar positions
    const hums = [];
    for (let i = 0; i < o.humCount; i++) {
        hums.push({ y: Math.random() * H, th: o.humThickness * (0.5 + Math.random()) });
    }

    const kx = 1 - 1 / Math.max(1, o.streakLen);
    const cFactor = 1 + o.contrast / 100;
    const chroma = o.chroma;
    const sAmt = o.staticAmt;
    const stAmt = o.streakAmt * 1.2;

    let p = 0;
    for (let y = 0; y < H; y++) {
        let rowBase = 0;
        for (let i = 0; i < hums.length; i++) {
            const d = (y - hums[i].y) / hums[i].th;
            rowBase -= o.humStrength * Math.exp(-d * d) * 1.2;
        }
        if (o.scanSpacing > 0 && (y % o.scanSpacing) === 0) rowBase -= o.scanDark * 1.5;

        let s = 0;
        for (let x = 0; x < W; x++) {
            s = s * kx + (1 - kx) * (Math.random() * 2 - 1);
            const base = 128 + s * stAmt * 3 + rowBase;
            let r, g, b;
            if (chroma) {
                r = base + (Math.random() * 2 - 1) * sAmt;
                g = base + (Math.random() * 2 - 1) * sAmt;
                b = base + (Math.random() * 2 - 1) * sAmt;
            } else {
                const n = (Math.random() * 2 - 1) * sAmt;
                r = g = b = base + n;
            }
            r = 128 + (r - 128) * cFactor;
            g = 128 + (g - 128) * cFactor;
            b = 128 + (b - 128) * cFactor;
            buf[p++] = r < 0 ? 0 : r > 255 ? 255 : r;
            buf[p++] = g < 0 ? 0 : g > 255 ? 255 : g;
            buf[p++] = b < 0 ? 0 : b > 255 ? 255 : b;
            buf[p++] = 255;
        }
    }

    // dropout flecks
    if (o.dropDensity > 0) {
        const n = Math.round(o.dropDensity * W * H / 400000);
        for (let i = 0; i < n; i++) {
            const y = rndInt(0, H - 1);
            const x0 = rndInt(0, W - 1);
            const len = rndInt(3, o.dropLen);
            const v = Math.random() < 0.6 ? 255 : 0;
            const thick = Math.random() < 0.7 ? 1 : 2;
            for (let t = 0; t < thick; t++) {
                const yy = y + t;
                if (yy >= H) break;
                for (let x = x0; x < Math.min(W, x0 + len); x++) {
                    const q = (yy * W + x) * 4;
                    buf[q] = buf[q + 1] = buf[q + 2] = v;
                }
            }
        }
    }
    return buf;
}

async function generate(o) {
    await core.executeAsModal(async (ctx) => {
        const doc = app.activeDocument;
        const suspensionID = await ctx.hostControl.suspendHistory({
            documentID: doc.id,
            name: "Static"
        });
        try {
            const W = Math.round(doc.width);
            const H = Math.round(doc.height);
            const buf = buildBuffer(W, H, o);

            await bp([{
                _obj: "make",
                _target: [{ _ref: "layer" }],
                using: { _obj: "layer", name: "Static" }
            }]);
            const layer = doc.activeLayers[0];

            const imgData = await imaging.createImageDataFromBuffer(buf, {
                width: W, height: H, components: 4, chunky: true, colorSpace: "RGB"
            });
            await imaging.putPixels({
                documentID: doc.id,
                layerID: layer.id,
                imageData: imgData,
                targetBounds: { left: 0, top: 0 },
                replace: true
            });
            imgData.dispose();

            await bp([{
                _obj: "set",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                to: {
                    _obj: "layer",
                    mode: { _enum: "blendMode", _value: o.blend },
                    opacity: pct(o.opacity)
                }
            }]);
        } finally {
            await ctx.hostControl.resumeHistory(suspensionID);
        }
    }, { commandName: "Static" });
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
    setStatus("Generating… (large canvases take a few seconds)");
    $("runBtn").disabled = true;
    try {
        await generate(o);
        setStatus("Done. New \"Static\" layer added.");
    } catch (e) {
        setStatus("Error: " + (e.message || e), true);
    } finally {
        $("runBtn").disabled = false;
    }
});

loadOpts();
setStatus("Ready.");
