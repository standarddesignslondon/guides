// OpenDocs - a panel of live thumbnails for every open Photoshop document. Click one to bring it to the front.
const { app, core, action, imaging } = require("photoshop");
const { entrypoints } = require("uxp");

const $ = (id) => document.getElementById(id);
const LONG_EDGE = 480;          // pixels requested from Photoshop per thumbnail; CSS scales from there
const POLL_MS = 1500;           // how often the document list / history is checked (cheap: no pixel reads)
const DEBOUNCE_MS = 700;        // settle time after an edit before the thumbnail is re-read

let visible = true;             // panel is showing
let busy = false;               // a modal read is in progress
let dirtyIDs = new Set();       // documents whose thumbnail must be re-read
let pendingTimer = null;
const cache = {};               // docID -> { src, sig, w, h, title, saved, path }
let lastSnapshot = "";

function num(v) { return (v && typeof v === "object" && "_value" in v) ? Number(v._value) : Number(v); }

try { $("title").title = "OpenDocs v" + require("uxp").versions.plugin; } catch (e) {}

// ------------------------------------------------------------------ settings (size steps and order), remembered between sessions
const SIZES = [{ l: "XS", px: 80 }, { l: "S", px: 120 }, { l: "M", px: 170 }, { l: "L", px: 240 }, { l: "XL", px: 340 }];
let sizeIdx = 1, sortMode = "open";
try { const s = JSON.parse(localStorage.getItem("opendocs.settings") || "{}"); if (s.sizeIdx >= 0 && s.sizeIdx < SIZES.length) sizeIdx = s.sizeIdx; if (s.sortMode) sortMode = s.sortMode; } catch (e) {}
function saveSettings() { try { localStorage.setItem("opendocs.settings", JSON.stringify({ sizeIdx, sortMode })); } catch (e) {} }
function showSettings() {
    $("szLabel").textContent = SIZES[sizeIdx].l;
    $("smaller").disabled = sizeIdx === 0; $("larger").disabled = sizeIdx === SIZES.length - 1;
    const byName = sortMode === "name";
    $("sort").textContent = byName ? "A–Z" : "TABS";
    $("sort").title = byName ? "Order: alphabetical. Click for Photoshop's tab order." : "Order: Photoshop's tab order. Click for alphabetical.";
}

// ------------------------------------------------------------------ reading documents

function listDocs() {
    const out = [];
    let active = null;
    try { active = app.activeDocument ? app.activeDocument.id : null; } catch (e) {}
    for (const d of app.documents) {
        let sig = "";
        try { const h = d.activeHistoryState; sig = String(h ? h.id : ""); } catch (e) {}
        let saved = true, path = "";
        try { saved = d.saved; } catch (e) {}
        try { path = d.path || ""; } catch (e) {}
        out.push({ id: d.id, title: d.title, w: Math.round(num(d.width)), h: Math.round(num(d.height)), sig: sig + "|" + (saved ? "s" : "u"), saved, path, active: d.id === active, doc: d });
    }
    return out;
}

async function readThumb(id) {
    const d = app.documents.find((x) => x.id === id);
    if (!d) return null;
    const w = num(d.width), h = num(d.height);
    const targetSize = w >= h ? { width: Math.min(LONG_EDGE, Math.round(w)) } : { height: Math.min(LONG_EDGE, Math.round(h)) };
    const req = { documentID: id, targetSize, componentSize: 8, colorSpace: "RGB", applyAlpha: true };
    let res;
    try { res = await imaging.getPixels(Object.assign({ colorProfile: "sRGB IEC61966-2.1" }, req)); }
    catch (e) { res = await imaging.getPixels(req); }
    const img = res.imageData;
    try {
        const b64 = await imaging.encodeImageData({ imageData: img, base64: true });
        return "data:image/jpeg;base64," + b64;
    } finally { try { img.dispose(); } catch (e) {} }
}

// Re-read every thumbnail in `ids` inside one modal scope.
async function refreshThumbs(ids) {
    if (!ids.length || busy) return;
    busy = true;
    try {
        await core.executeAsModal(async () => {
            for (const id of ids) {
                if (!app.documents.find((x) => x.id === id)) continue;
                try {
                    const src = await readThumb(id);
                    const c = cache[id] || (cache[id] = {});
                    c.src = src; c.err = null;
                } catch (e) {
                    const c = cache[id] || (cache[id] = {});
                    c.src = null; c.err = (e && e.message) || String(e);
                }
                dirtyIDs.delete(id);
            }
        }, { commandName: "OpenDocs thumbnails" });
        setStatus("");
    } catch (e) {
        // Photoshop is in a dialog or another modal task: try again shortly.
        for (const id of ids) dirtyIDs.add(id);
        schedule(1500);
    } finally { busy = false; }
    render();
}

// ------------------------------------------------------------------ scheduling

function schedule(ms) {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { pendingTimer = null; if (visible) refreshThumbs(Array.from(dirtyIDs)); }, ms == null ? DEBOUNCE_MS : ms);
}

function sync(force) {
    if (!visible) return;
    let docs;
    try { docs = listDocs(); } catch (e) { setStatus("Couldn't read the document list: " + (e.message || e), true); return; }
    const ids = new Set(docs.map((d) => d.id));
    for (const k of Object.keys(cache)) if (!ids.has(Number(k))) delete cache[k];
    for (const d of docs) {
        const c = cache[d.id] || (cache[d.id] = {});
        if (force || c.sig !== d.sig || !c.src) dirtyIDs.add(d.id);
        c.sig = d.sig; c.w = d.w; c.h = d.h; c.title = d.title; c.saved = d.saved; c.path = d.path; c.active = d.active;
    }
    const snap = docs.map((d) => d.id + ":" + d.sig + ":" + d.title + ":" + (d.active ? 1 : 0)).join(",");
    if (snap !== lastSnapshot) { lastSnapshot = snap; render(); }
    if (dirtyIDs.size) schedule(force ? 0 : undefined);
}

// ------------------------------------------------------------------ UI

function setStatus(msg, err) { const s = $("status"); s.textContent = msg || ""; s.className = err ? "err" : ""; }

function tileSize() { return SIZES[sizeIdx].px; }

function render() {
    const grid = $("grid");
    const size = tileSize();
    let docs;
    try { docs = listDocs(); } catch (e) { return; }
    if (sortMode === "name") docs.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    $("empty").style.display = docs.length ? "none" : "block";

    // reuse tiles so the grid doesn't flicker
    const existing = {};
    for (const el of Array.from(grid.children)) existing[el.dataset.id] = el;
    const keep = new Set();
    docs.forEach((d, i) => {
        const c = cache[d.id] || {};
        let el = existing[d.id];
        if (!el) {
            el = document.createElement("div");
            el.className = "tile"; el.dataset.id = d.id;
            el.innerHTML = '<div class="frame"></div><div class="name"></div><div class="meta"></div>';
            el.addEventListener("click", () => activate(d.id));
        }
        el.classList.toggle("active", !!d.active);
        el.style.width = (size + 8) + "px";
        const frame = el.querySelector(".frame");
        frame.style.width = size + "px"; frame.style.height = size + "px";
        const want = c.src ? c.src : null;
        let img = frame.querySelector("img");
        if (want) {
            if (!img) { frame.innerHTML = ""; img = document.createElement("img"); frame.appendChild(img); }
            if (img.getAttribute("src") !== want) img.setAttribute("src", want);
        } else {
            frame.innerHTML = '<div class="ph">' + (c.err ? "No preview" : "…") + "</div>";
        }
        el.querySelector(".name").innerHTML = (d.saved ? "" : '<span class="dirty">●</span>') + escapeHTML(d.title);
        el.querySelector(".meta").textContent = d.w + " × " + d.h + " px";
        el.title = (d.path || d.title) + (d.saved ? "" : "  (unsaved changes)");
        if (grid.children[i] !== el) grid.insertBefore(el, grid.children[i] || null);
        keep.add(String(d.id));
    });
    for (const k of Object.keys(existing)) if (!keep.has(k)) existing[k].remove();
}

function escapeHTML(s) { return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }

async function activate(id) {
    const d = app.documents.find((x) => x.id === id);
    if (!d) { sync(); return; }
    try {
        await core.executeAsModal(async () => { app.activeDocument = d; }, { commandName: "OpenDocs: switch document" });
    } catch (e) {
        try {
            await action.batchPlay([{ _obj: "select", _target: [{ _ref: "document", _id: id }] }], {});
        } catch (e2) { setStatus("Couldn't switch: " + (e2.message || e2), true); }
    }
    sync();
}

// ------------------------------------------------------------------ wiring

$("smaller").addEventListener("click", () => { if (sizeIdx > 0) { sizeIdx--; saveSettings(); showSettings(); render(); } });
$("larger").addEventListener("click", () => { if (sizeIdx < SIZES.length - 1) { sizeIdx++; saveSettings(); showSettings(); render(); } });
$("sort").addEventListener("click", () => { sortMode = sortMode === "name" ? "open" : "name"; saveSettings(); showSettings(); render(); });
$("refresh").addEventListener("click", () => sync(true));
showSettings();

try {
    action.addNotificationListener(
        [{ event: "select" }, { event: "open" }, { event: "close" }, { event: "make" }, { event: "save" }, { event: "historyStateChanged" }],
        () => sync(false)
    );
} catch (e) { /* polling covers it */ }

try {
    entrypoints.setup({
        panels: {
            "opendocs.panel": {
                show() { visible = true; sync(true); },
                hide() { visible = false; }
            }
        }
    });
} catch (e) {}

setInterval(() => sync(false), POLL_MS);
sync(true);
