// GlitchSlice.jsx — slice a layer into strips and scatter them
// For Adobe Photoshop. Install: File > Scripts > Browse…, or drop into
// Photoshop's Presets/Scripts folder and restart Photoshop.
//
// Each run is one "pass": it slices the active layer vertically or
// horizontally and offsets a proportion of the slices. Run repeatedly,
// alternating orientation, to build up the criss-cross look.
// Every pass is a single undo step.
//
// Simon Morse / Claude, August 2026

#target photoshop

// ---------------------------------------------------------------- prefs

var PREFS_FILE = new File(Folder.userData + "/GlitchSlice_prefs.txt");

function defaultOpts() {
    return {
        orientation: 0,   // 0 = vertical slices, 1 = horizontal slices
        minW: 10,         // min slice width, px
        maxW: 80,         // max slice width, px
        spread: 100,      // 0 = all slices at midpoint, 100 = full min..max range
        widthGrowth: 1,   // widths multiplied by pow(growth, t), t = 0..1 across layer
        direction: 4,     // 0 up, 1 down, 2 left, 3 right, 4 random up/down, 5 random left/right
        offMode: 2,       // 0 fixed (=max), 1 random 0..max, 2 random min..max
        offMin: 20,       // px
        offMax: 200,      // px
        offGrowth: 1,     // offsets multiplied by pow(growth, t)
        probability: 40,  // % chance a slice moves
        mergeResult: true,
        workOnCopy: true
    };
}

function loadOpts() {
    var o = defaultOpts();
    try {
        if (PREFS_FILE.exists) {
            PREFS_FILE.open("r");
            var s = PREFS_FILE.read();
            PREFS_FILE.close();
            var saved = eval(s);
            for (var k in o) if (saved.hasOwnProperty(k)) o[k] = saved[k];
        }
    } catch (e) {}
    return o;
}

function saveOpts(o) {
    try {
        PREFS_FILE.open("w");
        PREFS_FILE.write(o.toSource());
        PREFS_FILE.close();
    } catch (e) {}
}

// ---------------------------------------------------------------- dialog

function showDialog(o) {
    var dlg = new Window("dialog", "GlitchSlice");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";

    function numField(parent, label, value, chars) {
        var g = parent.add("group");
        g.add("statictext", undefined, label).preferredSize.width = 150;
        var e = g.add("edittext", undefined, "" + value);
        e.characters = chars || 6;
        return e;
    }

    function sliderRow(parent, label, value) {
        var g = parent.add("group");
        g.add("statictext", undefined, label).preferredSize.width = 150;
        var s = g.add("slider", undefined, value, 0, 100);
        s.preferredSize.width = 150;
        var v = g.add("statictext", undefined, "" + Math.round(value));
        v.preferredSize.width = 30;
        s.onChanging = function () { v.text = "" + Math.round(s.value); };
        return s;
    }

    // --- slices panel
    var pS = dlg.add("panel", undefined, "Slices");
    pS.orientation = "column";
    pS.alignChildren = "left";
    pS.margins = 15;

    var gO = pS.add("group");
    gO.add("statictext", undefined, "Orientation").preferredSize.width = 150;
    var ddOrient = gO.add("dropdownlist", undefined,
        ["Vertical slices (cut left to right)", "Horizontal slices (cut top to bottom)"]);
    ddOrient.selection = o.orientation;

    var eMinW = numField(pS, "Min slice width (px)", o.minW);
    var eMaxW = numField(pS, "Max slice width (px)", o.maxW);
    var sSpread = sliderRow(pS, "Width randomness (%)", o.spread);
    var eWGrow = numField(pS, "Width growth (1 = none)", o.widthGrowth);
    pS.add("statictext", undefined,
        "Growth: widths are multiplied by growth^t across the layer;").graphics.font = ScriptUI.newFont("dialog", "italic", 10);
    pS.add("statictext", undefined,
        ">1 slices get wider as they go, <1 narrower (try 0.3 or 3).").graphics.font = ScriptUI.newFont("dialog", "italic", 10);

    // --- scatter panel
    var pM = dlg.add("panel", undefined, "Scatter");
    pM.orientation = "column";
    pM.alignChildren = "left";
    pM.margins = 15;

    var gD = pM.add("group");
    gD.add("statictext", undefined, "Direction").preferredSize.width = 150;
    var ddDir = gD.add("dropdownlist", undefined,
        ["Up", "Down", "Left", "Right", "Random up/down", "Random left/right"]);
    ddDir.selection = o.direction;

    var gM = pM.add("group");
    gM.add("statictext", undefined, "Offset distance").preferredSize.width = 150;
    var ddOff = gM.add("dropdownlist", undefined,
        ["Fixed (= max)", "Random, 0 to max", "Random, min to max"]);
    ddOff.selection = o.offMode;

    var eOffMin = numField(pM, "Min offset (px)", o.offMin);
    var eOffMax = numField(pM, "Max offset (px)", o.offMax);
    var eOGrow = numField(pM, "Offset growth (1 = none)", o.offGrowth);
    var sProb = sliderRow(pM, "Chance a slice moves (%)", o.probability);

    // --- options panel
    var pO = dlg.add("panel", undefined, "Options");
    pO.orientation = "column";
    pO.alignChildren = "left";
    pO.margins = 15;
    var cbMerge = pO.add("checkbox", undefined, "Merge result into a single layer");
    cbMerge.value = o.mergeResult;
    var cbCopy = pO.add("checkbox", undefined, "Work on a copy (hide the original layer)");
    cbCopy.value = o.workOnCopy;

    // --- buttons
    var gB = dlg.add("group");
    gB.alignment = "right";
    gB.add("button", undefined, "Cancel", { name: "cancel" });
    gB.add("button", undefined, "Run pass", { name: "ok" });

    if (dlg.show() != 1) return null;

    function num(e, fallback, min, max) {
        var n = parseFloat(e.text);
        if (isNaN(n)) n = fallback;
        if (n < min) n = min;
        if (n > max) n = max;
        return n;
    }

    o.orientation = ddOrient.selection.index;
    o.minW = Math.round(num(eMinW, 10, 1, 100000));
    o.maxW = Math.round(num(eMaxW, 80, o.minW, 100000));
    o.spread = Math.round(sSpread.value);
    o.widthGrowth = num(eWGrow, 1, 0.05, 20);
    o.direction = ddDir.selection.index;
    o.offMode = ddOff.selection.index;
    o.offMin = Math.round(num(eOffMin, 0, 0, 100000));
    o.offMax = Math.round(num(eOffMax, 200, o.offMin, 100000));
    o.offGrowth = num(eOGrow, 1, 0.05, 20);
    o.probability = Math.round(sProb.value);
    o.mergeResult = cbMerge.value;
    o.workOnCopy = cbCopy.value;
    return o;
}

// ---------------------------------------------------------------- helpers

function layerIndexIn(parent, layer) {
    for (var i = 0; i < parent.layers.length; i++) {
        if (parent.layers[i] == layer) return i;
    }
    return -1;
}

// ---------------------------------------------------------------- the pass

var gOpts = null; // set in entry point; used via suspendHistory string

function runPass(o) {
    var doc = app.activeDocument;
    var src = doc.activeLayer;

    var workLayer = src;
    if (o.workOnCopy) {
        workLayer = src.duplicate(src, ElementPlacement.PLACEBEFORE);
        workLayer.name = src.name + " glitch";
        src.visible = false;
        doc.activeLayer = workLayer;
    } else if (workLayer.isBackgroundLayer) {
        // background layers can't hold transparency; promote it
        workLayer.isBackgroundLayer = false;
        workLayer.name = "glitch";
    }

    var b = workLayer.bounds;
    var x0 = b[0].as("px"), y0 = b[1].as("px");
    var x1 = b[2].as("px"), y1 = b[3].as("px");

    var vertical = (o.orientation == 0);
    var start = vertical ? x0 : y0;
    var end = vertical ? x1 : y1;
    var span = end - start;
    if (span < 2) throw new Error("Layer is too small to slice.");

    // precompute slice edges
    var mid = (o.minW + o.maxW) / 2;
    var half = (o.maxW - o.minW) / 2;
    var edges = [start];
    var pos = start;
    while (pos < end) {
        var t = (pos - start) / span;
        var w = mid + (Math.random() * 2 - 1) * (o.spread / 100) * half;
        w *= Math.pow(o.widthGrowth, t);
        w = Math.max(1, Math.round(w));
        pos += w;
        if (pos > end) pos = end;
        edges.push(pos);
    }

    var movedCount = 0;

    for (var i = 0; i < edges.length - 1; i++) {
        if (Math.random() * 100 >= o.probability) continue;

        var t2 = (edges[i] - start) / span;
        var d;
        if (o.offMode == 0) d = o.offMax;
        else if (o.offMode == 1) d = Math.random() * o.offMax;
        else d = o.offMin + Math.random() * (o.offMax - o.offMin);
        d = Math.round(d * Math.pow(o.offGrowth, t2));
        if (d == 0) continue;

        var dx = 0, dy = 0;
        var sign = (Math.random() < 0.5) ? -1 : 1;
        switch (o.direction) {
            case 0: dy = -d; break;                 // up
            case 1: dy = d; break;                  // down
            case 2: dx = -d; break;                 // left
            case 3: dx = d; break;                  // right
            case 4: dy = sign * d; break;           // random up/down
            case 5: dx = sign * d; break;           // random left/right
        }

        var l, tp, r, bt;
        if (vertical) { l = edges[i]; r = edges[i + 1]; tp = y0; bt = y1; }
        else { l = x0; r = x1; tp = edges[i]; bt = edges[i + 1]; }

        doc.activeLayer = workLayer;
        doc.selection.select([[l, tp], [r, tp], [r, bt], [l, bt]]);
        try {
            executeAction(stringIDToTypeID("cutToLayer"), undefined, DialogModes.NO);
        } catch (e) {
            // slice was fully transparent — nothing to cut
            try { doc.selection.deselect(); } catch (e2) {}
            continue;
        }
        doc.activeLayer.translate(dx, dy);
        movedCount++;
    }

    try { doc.selection.deselect(); } catch (e3) {}

    if (o.mergeResult) {
        for (var m = 0; m < movedCount; m++) {
            var p = workLayer.parent;
            var idx = layerIndexIn(p, workLayer);
            if (idx <= 0) break;
            doc.activeLayer = p.layers[idx - 1];
            workLayer = doc.activeLayer.merge();
        }
        doc.activeLayer = workLayer;
    }
}

// ---------------------------------------------------------------- entry

function main() {
    if (app.documents.length == 0) {
        alert("Open a document first.");
        return;
    }
    var doc = app.activeDocument;
    if (doc.activeLayer.typename != "ArtLayer") {
        alert("Select a pixel layer (not a group).");
        return;
    }

    var o = showDialog(loadOpts());
    if (o == null) return;
    saveOpts(o);
    gOpts = o;

    var savedUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    try {
        doc.suspendHistory("GlitchSlice pass", "runPass(gOpts)");
    } catch (e) {
        alert("GlitchSlice error: " + e.message);
    } finally {
        app.preferences.rulerUnits = savedUnits;
    }
}

main();
