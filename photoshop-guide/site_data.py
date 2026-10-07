# -*- coding: utf-8 -*-
"""Content for the adobe tools guide.

Add a tool by appending a dict to ITEMS, dropping a picture in images/ named
after its slug, and re-running build_site.py. Nothing else needs touching.
"""

SUBJECT = {
    "short": "adobe",
    "title": "adobe\ntools",
    "subtitle": "process guide",
    "blurb": "Panels, scripts and automations built for the Adobe "
             "applications. What every control does, how a file travels from "
             "the canvas out to whatever does the work and back again, and "
             "the things each one needs you to remember.",
    "noun": "tool",
    "noun_plural": "tools",
    "page_dir": "tools",
    "hub": "../index.html",
    "hub_all": "../all.html",
    "hub_label": "guides",
    "accent": "#ff4f00",
    "facets": [
        {"field": "app", "label": "apps", "all": "all apps",
         "fact_label": "app"},
        {"field": "kind", "label": "types", "all": "all types",
         "fact_label": "type"},
        {"field": "author", "label": "makers", "all": "everyone",
         "fact_label": "built by"},
    ],
}

ITEMS = []

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "nano-banana-bridge",
    "name": "Nano Banana Bridge",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "NanoBanana-Photoshop-Plugin",
    "tagline": "Sends the canvas and a marked-up selection to Nano Banana, "
               "then brings the result back as a masked layer.",
    "blurb":
        "A Photoshop panel that closes the loop between a selection and Nano "
        "Banana. It exports a flattened copy of the document with your "
        "selection stroked on as an annotation outline, wraps your instruction "
        "in a template telling the model to edit only inside that outline and "
        "then erase it, and sends the lot by one of three routes: the Gemini "
        "app, the AI Studio Playground, or the Gemini API. What comes back is "
        "imported as a layer masked to the original selection, so every pixel "
        "outside the edit stays exactly as it was.",
    "facts": {
        "version": "1.4.1",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.nanobananabridge",
    },
    "sections": [
        # ------------------------------------------------------ installing
        {"label": "installing", "type": "steps", "data": [
            "Open the **Creative Cloud desktop app**, search All apps for "
            "**UXP Developer Tools**, and install it.",
            "In Photoshop, go to **Settings > Plugins** and tick **Enable "
            "Developer Mode**. Restart Photoshop if asked.",
            "In UXP Developer Tools, choose **Add Plugin** and select "
            "`manifest.json` in the plugin folder.",
            "Click **Load**. The panel appears in Photoshop under **Plugins**.",
            "Open **Settings** at the foot of the panel and set the staging "
            "folder, the downloads folder, and the API key if you intend to "
            "use the API route.",
            "While UXP Developer Tools stays open you also get **Watch**, "
            "which reloads the panel whenever a file changes, and **Debug**, "
            "which opens a console.",
        ]},
        # ------------------------------------------------------ quick start
        {"label": "quick start", "type": "steps", "data": [
            "Make a selection around the thing you want changed. Lasso, "
            "marquee or subject select all work, and a feather of about 5px "
            "gives the reimport mask a cleaner edge. No selection means a "
            "whole-image edit.",
            "Type the instruction in plain language, for example *replace the "
            "glass of brown milkshake with a clean glass of fresh orange "
            "juice*. The panel builds the full annotation template around it.",
            "If you are matching a style, add up to three reference images and "
            "set the influence.",
            "Choose a destination and press **Stage / Send**.",
            "On the Gemini and AI Studio routes, drag `nb-stage.png` into the "
            "browser tab that opened, then any `nb-ref-N` files after it in "
            "order, paste the prompt with Cmd+V and run it. Download the "
            "result.",
            "Press **Import result**. On the API route this happens by itself.",
        ]},
        # --------------------------------------------------------- controls
        {"label": "controls", "type": "reference", "data": [
            {"title": "Destination",
             "intro": "Sets which of the three routes the staged image takes. "
                      "The panel shows and hides the sections below to match.",
             "rows": [
                 ["Gemini app", "default",
                  "Opens gemini.google.com/app. Free on the AI Pro "
                  "subscription, within its compute-based 5-hour and weekly "
                  "limits. You drag the file in and paste the prompt "
                  "yourself. The Model section is hidden, because you pick "
                  "the model in the browser."],
                 ["AI Studio", "",
                  "Opens the AI Studio Playground at a new chat, deep-linked "
                  "to the model chosen below. Draws on the separate free "
                  "daily pool. Resolution is set in the Playground sidebar, "
                  "not here."],
                 ["Gemini API", "",
                  "Fully automatic. The panel posts to "
                  "generativelanguage.googleapis.com, writes the result into "
                  "the staging folder and imports it without you leaving "
                  "Photoshop. Billed against Developer Program credits, and "
                  "needs an API key in Settings."],
             ]},
            {"title": "Model",
             "intro": "Hidden on the Gemini app route. On AI Studio it only "
                      "sets the deep link; on the API route it is the model "
                      "actually called.",
             "rows": [
                 ["NB2 Lite", "gemini-3.1-flash-lite-image",
                  "Cheapest and quickest."],
                 ["NB2", "gemini-3.1-flash-image",
                  "The middle option."],
                 ["NB Pro", "gemini-3-pro-image",
                  "Default, and the best quality of the three."],
             ]},
            {"title": "Resolution",
             "intro": "API route only.",
             "rows": [
                 ["1K / 2K / 4K", "1K default",
                  "Sent as `imageConfig.imageSize`, alongside whichever "
                  "supported aspect ratio sits closest to your canvas "
                  "(1:1, 4:3, 3:4, 3:2, 2:3, 16:9, 9:16, 5:4, 4:5, 21:9)."],
             ]},
            {"title": "Outline colour",
             "intro": "The colour the selection is stroked in on the exported "
                      "copy, and the colour named in the prompt. Pick one the "
                      "picture does not already contain.",
             "rows": [
                 ["Green", "0, 255, 60", "Default. Described to the model as "
                  "“bright green”."],
                 ["Magenta", "255, 0, 200", "Described as “bright magenta”. "
                  "Use it on foliage and other green-heavy scenes."],
                 ["Red", "255, 0, 0", "Described as “bright red”. The fallback "
                  "when both green and magenta appear in the image."],
             ]},
            {"title": "Edit instruction",
             "rows": [
                 ["Edit instruction", "free text",
                  "What should change inside the outline. Write it plainly; "
                  "the panel supplies the surrounding template. Stage / Send "
                  "refuses an empty box."],
                 ["Cost hint", "",
                  "The line under the box. On the API route it shows the "
                  "estimated cost for the current model and resolution; on "
                  "the other routes it reminds you which free pool you are "
                  "drawing on."],
             ]},
            {"title": "Reference images",
             "intro": "Style transfer, maximum of three. They last for the "
                      "session only and are not remembered across restarts.",
             "rows": [
                 ["Add reference…", "png, jpg, jpeg, webp",
                  "Multi-select is allowed; anything beyond the third file is "
                  "ignored. The button disables once three are loaded."],
                 ["✕", "",
                  "Removes that reference. The remaining ones renumber, so "
                  "reference 1 is always the first in the list."],
             ]},
            {"title": "Reference influence",
             "intro": "Only appears once at least one reference is loaded. It "
                      "swaps a sentence into the prompt.",
             "rows": [
                 ["Subtle", "",
                  "A light touch of the references' palette and mood. The "
                  "written instruction takes priority over them."],
                 ["Moderate", "default",
                  "Follow the references' style closely, adopting palette, "
                  "texture and overall look while carrying out the "
                  "instruction."],
                 ["Strict", "",
                  "Replicate the style exactly, down to grain, contrast, era "
                  "and rendering technique, as though the output came from "
                  "the same source as the references."],
             ]},
            {"title": "Temperature",
             "intro": "API route only.",
             "rows": [
                 ["Temperature", "0 – 2, default 1.0",
                  "Lower is more literal. Values outside the range are "
                  "clamped, and anything that will not parse as a number "
                  "falls back to 1."],
             ]},
            {"title": "If result size differs from canvas",
             "intro": "Nano Banana often returns more pixels than it was "
                      "given. This decides which of the two gives way.",
             "rows": [
                 ["Result → canvas", "default",
                  "Shrinks the returned image to the document's exact "
                  "dimensions. Your document size is preserved."],
                 ["Canvas → result", "",
                  "Resamples the whole document up to the result's "
                  "dimensions, keeping every returned pixel. Layers and the "
                  "stored selection channel are resampled with it, so the "
                  "mask still lines up."],
             ]},
            {"title": "Buttons",
             "rows": [
                 ["Stage / Send", "",
                  "Exports the staged PNG, then either opens the browser "
                  "route with the prompt on the clipboard or posts straight "
                  "to the API."],
                 ["Import result", "",
                  "Takes the newest image from the downloads and staging "
                  "folders, whichever is more recent, ignoring "
                  "`nb-stage.png`, and brings it in as a masked layer."],
             ]},
            {"title": "Settings",
             "intro": "Collapsed by default. The disclosure triangle at the "
                      "foot of the panel opens it.",
             "rows": [
                 ["Gemini API key", "API destination only",
                  "Held in the panel's local storage. Get one at "
                  "aistudio.google.com/apikey."],
                 ["Staging…", "",
                  "Where `nb-stage.png`, the copied `nb-ref-N` files and API "
                  "results are written. Kept as a persistent token, so it "
                  "survives restarts."],
                 ["Downloads…", "",
                  "Where Import result looks for images you downloaded by "
                  "hand. Point it at your browser's download folder."],
             ]},
        ]},
        # ------------------------------------------------------ how it works
        {"label": "how it works", "type": "notes", "data": [
            {"title": "What actually gets sent",
             "text": "The staged export is a flattened duplicate of the "
                     "document, not the document itself. If a selection "
                     "exists it is first saved to an alpha channel called "
                     "`NB_SELECTION`, then stroked onto a temporary "
                     "`NB_OUTLINE` layer at a width of the long edge divided "
                     "by 250, minimum 4px. The duplicate is flattened, "
                     "downscaled if its long edge exceeds 4096px, and saved "
                     "as `nb-stage.png`. Both the temporary layer and the "
                     "duplicate are disposed of afterwards, so your document "
                     "is left as it was apart from the alpha channel."},
            {"title": "The prompt wrapper",
             "text": "Your instruction is dropped into a two-part template: "
                     "change what is inside the coloured outline and leave "
                     "everything else inside it alone, then remove the "
                     "outline entirely and restore whatever the line covered. "
                     "A closing paragraph asks for the edit to match the "
                     "scene's lighting, colour temperature, perspective, "
                     "shadows, reflections and grain, and for the "
                     "composition, dimensions and aspect ratio to be kept. "
                     "With references loaded, a preamble goes in front "
                     "explaining that image 1 is the canvas and the rest are "
                     "reference 1 onward, followed by the influence sentence."},
            {"title": "Whole-image edits",
             "text": "With no selection, no outline is drawn and the "
                     "instruction is sent on its own. A selection whose "
                     "bounds cover 95% or more of the canvas area is treated "
                     "the same way, because a stroke running along the canvas "
                     "edge makes the model render a picture frame. In that "
                     "case the `NB_SELECTION` channel is deleted, so a stale "
                     "one cannot wrongly mask the next import."},
            {"title": "The reimport mask",
             "text": "The imported layer is centred on the canvas by moving "
                     "its top-left corner to a calculated position, rather "
                     "than by any alignment command, then given a layer mask "
                     "loaded from `NB_SELECTION`. Everything outside your "
                     "selection therefore stays 100% original, with no model "
                     "smoothing on faces or fine detail. If the returned "
                     "aspect ratio differs from the canvas by more than 2%, "
                     "masking is skipped and the panel says so."},
            {"title": "The manual routes",
             "text": "Stage / Send copies any references into the staging "
                     "folder as `nb-ref-1`, `nb-ref-2` and so on, puts the "
                     "wrapped prompt on the clipboard, opens the browser and "
                     "tries to reveal the staging folder in Finder. Drag "
                     "`nb-stage.png` in first and the references after it in "
                     "order, so the numbering matches what the prompt "
                     "describes."},
        ]},
        # ------------------------------------------------------- api cost
        {"label": "api cost", "type": "reference", "data": [
            {"intro": "Approximate GBP per image at list price on the "
                      "standard tier, as shown live under the instruction "
                      "box. Free while Developer Program credits last.",
             "rows": [
                 ["NB2 Lite", "1K / 2K / 4K", "~2.5p at every resolution."],
                 ["NB2", "1K / 2K / 4K", "~5p / ~7.5p / ~11p."],
                 ["NB Pro", "1K / 2K / 4K", "~10p / ~10p / ~18p."],
             ]},
        ]},
        # -------------------------------------------------------- gotchas
        {"label": "gotchas", "type": "flags", "data": [
            "Photoshop 24.2 or later, with developer mode enabled. The panel "
            "is loaded through UXP Developer Tools, not installed from the "
            "Creative Cloud plugin marketplace.",
            "Reference images last for the session only. Close Photoshop and "
            "you add them again.",
            "Exports whose long edge exceeds 4096px are downscaled before "
            "sending, so a very large document comes back at less than its "
            "native resolution unless you use Canvas → result.",
            "**Canvas → result resamples your entire document**, every layer "
            "included. That is a real change to the file, not something "
            "confined to the imported layer.",
            "If the result's aspect ratio differs from the canvas, the layer "
            "is width-fitted and left unmasked. For a canvas extension, use "
            "Image > Reveal All to grow the canvas afterwards.",
            "The API key sits in the panel's local storage in plain text.",
            "Model IDs are hard-coded. If Google renames them or adds a "
            "`-preview` suffix, the API route fails until `main.js` is "
            "updated.",
            "The `NB_SELECTION` alpha channel is left behind in the document "
            "after a masked import. It is harmless and safe to delete.",
        ]},
    ],
    # One composite picture: the panel on first open (left) and in use with an
    # instruction and two references loaded (right). Originals kept in
    # images/_source/ — rebuild the composite from those if either is replaced.
})

# Shared by the five lo-fi plugins below: they are installed from .ccx
# packages via Adobe's installer agent, because double-clicking an unsigned
# .ccx makes Creative Cloud claim no compatible app is installed.
UPIA = ('"/Library/Application Support/Adobe/Adobe Desktop Common/'
        'RemoteComponents/UPI/UnifiedPluginInstallerAgent/'
        'UnifiedPluginInstallerAgent.app/Contents/MacOS/'
        'UnifiedPluginInstallerAgent"')

INSTALL_STEPS = [
    "In Terminal, run Adobe's installer agent on the plugin's `.ccx` from "
    "`Photoshop Scripts/CCX Installers`: "
    "`" + UPIA + " --install <plugin>.ccx`",
    "Restart Photoshop. The panel appears under **Plugins** and survives "
    "restarts — UXP Developer Tools is not needed.",
    "Do not double-click the `.ccx`: Creative Cloud wrongly reports "
    "*Compatible app required* for unsigned plugins.",
]

REBUILD_NOTE = [
    "For quick iteration, load the folder's `manifest.json` in **UXP "
    "Developer Tools** instead — dev-loads are live-reloadable but vanish "
    "when Photoshop restarts.",
    "To update the installed copy: bump `version` in `manifest.json`, zip "
    "`manifest.json` + `index.html` + `main.js` (at the archive root) with a "
    "`.ccx` extension, and run the installer agent again.",
]

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "glitchslice",
    "name": "GlitchSlice",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "GlitchSlice-Photoshop-Plugin",
    "tagline": "Slices a layer into strips and scatters them — the "
               "criss-cross glitch pass, one direction at a time.",
    "blurb":
        "Cuts the active layer into vertical or horizontal strips of "
        "randomised width, then offsets a chosen proportion of them. Each "
        "press of Run pass is one pass and one undo step, so the intended "
        "workflow is iterative: run a vertical pass, run a horizontal pass "
        "on the result, repeat until it looks right, undo anything that "
        "doesn't. Gaps left behind are transparent, so lower layers show "
        "through — stack two source images and the scatter reveals one "
        "inside the other.",
    "facts": {
        "version": "1.2.0",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.glitchslice",
    },
    "quickstart": [
        "Select a pixel layer (not a group) and open the panel from "
        "**Plugins**.",
        "Pick an orientation, set the width and offset ranges or just press "
        "**Randomise all**, and press **Run pass**.",
        "Run further passes, alternating orientation, on the resulting "
        "layer. The status line reports how many slices moved each time.",
        "Undo removes a whole pass in one step.",
    ],
    "controls": [
        {"title": "Slices",
         "rows": [
             ["Orientation", "vertical / horizontal",
              "Vertical slices are cut left to right; horizontal, top to "
              "bottom."],
             ["Target slice count", "optional",
              "Leave empty to use the width fields. With a number (2+), "
              "exactly that many slices are cut and widths are derived from "
              "the layer size instead — randomness and growth still shape "
              "them."],
             ["Min / Max width", "px",
              "The range slice widths are drawn from. The count that "
              "results is roughly the layer span divided by the average of "
              "the two."],
             ["Width randomness", "0 – 100",
              "0 = every slice at the midpoint of the range; 100 = the full "
              "min–max spread."],
             ["Width growth", "0.05 – 20, 1 = none",
              "Widths are multiplied by growth^t across the layer, so >1 "
              "makes slices progressively wider, <1 progressively narrower. "
              "Try 0.3 or 3."],
             ["Min / Max feather", "px, 0/0 = hard edges",
              "Feathers each slice's selection before the cut, softening "
              "both the strip and the hole it leaves."],
             ["Feather randomness", "0 – 100",
              "Spread of per-slice feather within its range, same scheme as "
              "width randomness."],
         ]},
        {"title": "Scatter",
         "rows": [
             ["Direction", "up / down / left / right / random",
              "Where moved slices go. The two random options pick a "
              "direction per slice along one axis — the quickest route to "
              "the criss-cross look."],
             ["Offset distance", "fixed / random 0–max / random min–max",
              "How far each moved slice travels."],
             ["Offset growth", "0.05 – 20, 1 = none",
              "Multiplies offsets by growth^t across the layer, like width "
              "growth."],
             ["Chance a slice moves", "0 – 100%",
              "Slices that fail the roll stay exactly where they were — "
              "untouched passages are a big part of the look."],
             ["Cross-shift max", "px, 0 = off",
              "Adds a random ± nudge on the other axis to every moved "
              "slice, so strips also slide along themselves."],
         ]},
        {"title": "Options",
         "rows": [
             ["Merge result into a single layer", "default on",
              "Merges the moved strips back into one layer so the next pass "
              "can cut across them. Untick to keep each moved slice as its "
              "own layer."],
             ["Work on a copy", "default on",
              "Duplicates the layer, hides the original, and slices the "
              "copy."],
             ["Randomise all", "",
              "Rolls fresh values into every parameter except the two "
              "checkboxes and the target count, then waits for Run pass."],
         ]},
    ],
    "workflow": [
        {"title": "The criss-cross",
         "text": "One pass reads as stripes; the style comes from "
                 "alternation. Vertical pass, then horizontal on the "
                 "result, then vertical again with different widths. "
                 "Because gaps are transparent, doing this over a second "
                 "image on a layer below interleaves the two."},
        {"title": "With the other plugins",
         "text": "Slice first and degrade after (*Signal Degrade*, *Row "
                 "Jitter*) for soft, broadcast-like tears; degrade first "
                 "and slice after for crisp cuts through already-filthy "
                 "material."},
    ],
    "gotchas": [
        "Pixel layers only — select a layer, not a group. Slices whose "
        "region is fully transparent are skipped.",
        "Feather eats into a strip from both sides: keep max feather well "
        "under half the min slice width or thin strips nearly vanish.",
        "Settings persist between sessions in the panel's local storage; "
        "what you see is what the last run used.",
        "A superseded ExtendScript version, `GlitchSlice.jsx`, sits in "
        "`Photoshop Scripts/` — the panel replaces it.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "signal-degrade",
    "name": "Signal Degrade",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "SignalDegrade-Photoshop-Plugin",
    "tagline": "One pass of lo-fi abuse: misregistration, halo, crush, "
               "grain, vignette — any stage at 0 is skipped.",
    "blurb":
        "Runs a fixed chain of degradations over the active layer: colour "
        "plate misregistration, softening, oversharpened halos, tonal crush "
        "with optional dither, grain, desaturation, contrast and a "
        "vignette. Every stage is switched off by setting it to 0, so the "
        "panel is equally a one-trick tool (just a vignette, just "
        "misregistration) and a full worn-transmission treatment. Four "
        "presets cover the obvious destinations; the status line lists "
        "which stages actually ran.",
    "facts": {
        "version": "1.0.0",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.signaldegrade",
    },
    "quickstart": [
        "Select a pixel layer and pick a preset — **Off-air recording**, "
        "**Fourth-gen photocopy**, **Worn print** or **Subtle wear** — or "
        "set values by hand.",
        "Press **Run pass**. The whole chain is one undo step.",
        "Touching any control flips the preset back to Custom; "
        "**Randomise all** rolls a plausible chain rather than pure chaos.",
    ],
    "controls": [
        {"title": "Signal",
         "rows": [
             ["Channel misregistration", "px",
              "Red shifts left, blue shifts right, green stays put — the "
              "classic fringed-edges break-up."],
             ["Soften", "blur px", "Gaussian blur before the halo."],
             ["Halo", "sharpen %",
              "Unsharp mask at a radius keyed to the blur, so high values "
              "ring — the over-corrected look of cheap sharpening."],
         ]},
        {"title": "Tone",
         "rows": [
             ["Crush", "posterise levels, 0 = off",
              "4 – 8 is brutal, 16 – 32 gentle banding."],
             ["Dither", "%",
              "Noise added before the crush so the bands break into "
              "speckle. Does nothing when crush is 0."],
             ["Contrast", "−50 to 100", "Straight contrast move."],
         ]},
        {"title": "Surface",
         "rows": [
             ["Grain", "%", "Monochrome gaussian noise."],
             ["Desaturate", "0 – 100%", "100 = fully mono."],
             ["Vignette", "%",
              "Feathered corner darkening, filled in multiply and "
              "preserving transparency."],
         ]},
    ],
    "workflow": [
        {"title": "Stage order is fixed",
         "text": "Misregistration → soften → halo → crush → grain → "
                 "desaturate → contrast → vignette, top of the panel to the "
                 "bottom. For a different order, run several passes with "
                 "only some stages switched on."},
    ],
    "gotchas": [
        "Misregistration needs colour to fringe — combined with Desaturate "
        "100 in one pass it still runs, but the desaturation happens after, "
        "greying the fringes. Run separate passes if you want mono first.",
        "Dither without crush is silently skipped.",
        "The vignette is sized to the canvas, not the layer.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "static",
    "name": "Static",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "Static-Photoshop-Plugin",
    "tagline": "Generates a canvas-sized noise layer from mixable "
               "ingredients — radio static, hum bars, scanlines, dropout.",
    "blurb":
        "Synthesises texture from scratch rather than working on existing "
        "pixels: each press of Generate computes a canvas-sized noise field "
        "in the panel and writes it into a fresh layer through Photoshop's "
        "imaging API. The field is mixed from ingredients — fine static, "
        "horizontal streaking, drifting hum bars, scanlines and "
        "tape-dropout flecks — any of which is left out at 0. The layer "
        "arrives with a chosen blend mode and opacity already set, ready "
        "to sit over artwork as texture, or on its own as raw static.",
    "facts": {
        "version": "1.0.0",
        "requires": "Photoshop 24.4+",
        "plugin id": "com.simonmorse.staticgen",
    },
    "quickstart": [
        "Open a document and press **Generate** — no layer selection "
        "needed; the result is always a new layer called *Static*.",
        "Adjust ingredients and generate again; each run is a fresh layer "
        "and one undo step.",
        "For texture over artwork, leave the blend mode on **Overlay** or "
        "**Soft Light** at 20 – 40% opacity. For raw static, set "
        "**Normal** at 100%.",
    ],
    "controls": [
        {"title": "Ingredients",
         "rows": [
             ["Fine static", "0 – 127", "Per-pixel random noise, the base "
              "hiss."],
             ["Streaking strength / length", "0 – 100 / px",
              "Smears the noise horizontally — the soft sideways grain of "
              "a weak signal. Length is how far the smear correlates."],
             ["Hum bars", "count / strength / thickness",
              "Soft dark horizontal bands at random heights, like mains "
              "hum rolling through a picture."],
             ["Scanline spacing / darkness", "px, 0 = off / 0 – 100",
              "Darkens one row every N pixels. 2 – 4 px spacing reads as "
              "CRT at print size."],
             ["Dropout density / max length", "0 – 100 / px",
              "Short bright or dark horizontal flecks, one or two pixels "
              "tall, like tape dropout."],
         ]},
        {"title": "Character",
         "rows": [
             ["Contrast", "−50 to 100", "Pushes the whole field away from "
              "mid-grey."],
             ["Chroma noise", "checkbox",
              "Randomises the channels independently — coloured confetti "
              "static instead of mono."],
         ]},
        {"title": "Layer",
         "rows": [
             ["Blend mode", "Normal / Overlay / Soft Light / Screen / "
              "Multiply / Linear Light",
              "Applied to the generated layer. The field is built around "
              "mid-grey, so Overlay and Soft Light treat it as pure "
              "texture."],
             ["Opacity", "1 – 100%", "Also applied on arrival."],
         ]},
    ],
    "gotchas": [
        "Needs Photoshop 24.4 or later — the imaging API is how the pixels "
        "get in.",
        "Generation is computed in the panel: a large canvas (A2 at 300dpi "
        "and up) takes several seconds and a fair chunk of memory. The "
        "status line says when it is working.",
        "The layer arrives with blend mode and opacity already set — easy "
        "to forget it landed on Overlay at 35% and wonder why it looks "
        "faint on its own.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "row-jitter",
    "name": "Row Jitter",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "RowJitter-Photoshop-Plugin",
    "tagline": "Shifts every horizontal band of a layer sideways — VHS "
               "tracking, worn tape, a scan gone wrong.",
    "blurb":
        "Where GlitchSlice is bold and structural, Row Jitter is a "
        "fine-grained shimmer: it reads the active layer's pixels, offsets "
        "every horizontal band by a wobbly waveform plus smoothed noise, "
        "with occasional larger tears, and writes them back through the "
        "imaging API. Band height sets the character — 1 – 2 px is a "
        "video-ish shimmer, 8 – 16 px chunky tracking error. Pixels "
        "pushed off one edge wrap around to the other by default.",
    "facts": {
        "version": "1.0.0",
        "requires": "Photoshop 24.4+",
        "plugin id": "com.simonmorse.rowjitter",
    },
    "quickstart": [
        "Select a pixel layer and press **Run pass** — the defaults are a "
        "gentle tracking wobble.",
        "Each pass is one undo step. Repeated passes accumulate; the wave "
        "phase is random every run, so two passes never line up.",
    ],
    "controls": [
        {"title": "Bands",
         "rows": [
             ["Band height", "1 – 64 px",
              "Rows are shifted in bands of this height. The single most "
              "character-defining control."],
         ]},
        {"title": "Wobble",
         "rows": [
             ["Wave amplitude / wavelength", "px",
              "A sine sweep down the layer: amplitude is how far bands "
              "swing, wavelength how quickly the swing repeats."],
             ["Noise jitter", "px", "Random per-band offset layered on the "
              "wave."],
             ["Jitter smoothing", "0 – 95%",
              "0 = every band independent (fizzy); 90 = slow drift shared "
              "by neighbouring bands."],
         ]},
        {"title": "Tears",
         "rows": [
             ["Tear chance per band", "%",
              "Occasionally a band (and the few after it) lurches much "
              "further — the dropout moment."],
             ["Tear max shift", "px", "How far a tear can go."],
         ]},
        {"title": "Options",
         "rows": [
             ["Wrap pixels around", "default on",
              "Pixels pushed off one edge reappear at the other. Off "
              "leaves transparency instead."],
             ["Work on a copy", "default on", "As in the other panels."],
         ]},
    ],
    "gotchas": [
        "Needs Photoshop 24.4 or later (imaging API).",
        "Wrap is forced on for layers without an alpha channel — a "
        "Background layer can't hold the transparency the off setting "
        "needs. Work on a copy avoids this.",
        "Bands are measured from the top of the layer's own bounds, not "
        "the canvas.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "misregistered-print",
    "name": "Misregistered Print",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "MisregisteredPrint-Photoshop-Plugin",
    "tagline": "The cheap-print look: halftone dots, colour plates out of "
               "register, paper grain and warmth.",
    "blurb":
        "Treats the active layer as a badly printed reproduction of "
        "itself. Optionally halftones the image first, then splits it into "
        "colour plates and drifts each by its own random distance and "
        "direction — the blue plate anchors, red and green wander — before "
        "finishing with paper grain and a warm photo-filter wash like aged "
        "stock. Anything at 0 is skipped, so it also serves as a plain "
        "halftone or plain warmth pass.",
    "facts": {
        "version": "1.0.0",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.misprint",
    },
    "quickstart": [
        "Select a pixel layer and press **Run pass**; the defaults give a "
        "modest newspaper drift.",
        "For heavier riso-style separation, push misregistration to 10 – "
        "20 px and add halftone.",
    ],
    "controls": [
        {"title": "Print",
         "rows": [
             ["Halftone dot size", "px, 0 = off",
              "Photoshop's colour halftone at standard screen angles. "
              "4 – 10 px reads as newsprint at print resolution; values "
              "below 4 are treated as off."],
             ["Misregistration max", "px",
              "Each drifting plate picks its own random direction and a "
              "distance between 40% and 100% of this."],
         ]},
        {"title": "Paper",
         "rows": [
             ["Paper grain", "%", "Monochrome noise over everything."],
             ["Warmth", "%",
              "A warming photo filter, luminosity preserved — cheap ink "
              "on off-white."],
         ]},
    ],
    "workflow": [
        {"title": "Order with the others",
         "text": "This one usually goes last: halftone dots and plate "
                 "drift read as the final reproduction of whatever mess "
                 "the other passes made. Static over the top afterwards "
                 "breaks the dots up nicely."},
    ],
    "gotchas": [
        "Halftone below 4 px is ignored — the filter needs room for a "
        "dot.",
        "Misregistration fringes are colour by definition; on a mono "
        "image, desaturate *after* this pass and the fringes grey out to "
        "tonal wobble, which can also be the point.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "patchscatter",
    "name": "PatchScatter",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "PatchScatter-Photoshop-Plugin",
    "tagline": "Copies random patches of a layer and drops them at random "
               "positions on a Scatter layer above it — optionally feeding "
               "on its own output.",
    "blurb":
        "Takes the selected layer as the base, then for each patch picks a "
        "random rectangle, feathers the selection, copies it and pastes it "
        "at a random position on a layer named **Scatter** directly above "
        "the base. The first pass creates that layer; later passes add to "
        "it, so the picture builds up over repeated runs. Each press of "
        "**Run pass** is one undo step. In iterative mode the copy is taken "
        "from the visible composite rather than the base alone, so patches "
        "placed earlier in the same pass can be re-copied and the process "
        "turns generative.",
    "facts": {
        "version": "1.0.0",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.patchscatter",
    },
    "quickstart": [
        "Select the base pixel layer (not a group, and not the Scatter "
        "layer itself) and open the panel from **Plugins**.",
        "Set the number of patches, the size range and the feather, choose "
        "whether patches may overhang the edges and what to sample from, "
        "then press **Run pass**.",
        "Run again to add more patches to the same Scatter layer. Switch "
        "to *Base + Scatter layer* to let each pass sample the previous "
        "ones.",
        "**Clear Scatter layer** empties the layer without deleting it; "
        "undo removes a whole pass in one step.",
    ],
    "controls": [
        {"title": "Patches",
         "rows": [
             ["Number of patches", "1 – 5000",
              "How many rectangles are copied and placed in one pass."],
             ["Min / Max size", "px, width + height",
              "One number for both dimensions: a patch's width plus its "
              "height is drawn uniformly from this range. With 30 and 100, "
              "a 50×40 patch (90) or a 10×25 patch (35) is allowed; 60×70 "
              "(130) or 5×24 (29) is not."],
             ["Max aspect ratio", "1 – 1000, default 3",
              "Caps how elongated a patch can be, in either orientation. 1 "
              "forces squares; 3 allows anything up to 3:1."],
             ["Feather", "px, default 1",
              "Feathers each source selection before the copy, so patch "
              "edges soften and blend. 0 gives hard-edged rectangles."],
         ]},
        {"title": "Placement",
         "rows": [
             ["Keep patches inside the canvas", "default",
              "Every patch lands wholly within the document bounds."],
             ["Patches may overhang the edges", "",
              "Destinations run past the edges, but every patch keeps at "
              "least one pixel on the canvas so nothing is placed out of "
              "sight."],
         ]},
        {"title": "Sample from",
         "rows": [
             ["Base layer only", "default",
              "Each patch is copied from the base layer alone, whatever "
              "already sits on the Scatter layer."],
             ["Base + Scatter layer (iterative)", "",
              "Copies from the visible composite, so patches already "
              "placed — including earlier ones in the same pass — can be "
              "copied again. Repeated passes compound."],
         ]},
        {"title": "Buttons",
         "rows": [
             ["Run pass", "",
              "Places one batch of patches; the status line reports how "
              "many were placed and how many were skipped because the "
              "source area was empty."],
             ["Clear Scatter layer", "",
              "Deletes every pixel on the Scatter layer, leaving the layer "
              "in place for the next pass."],
         ]},
    ],
    "workflow": [
        {"title": "Building up",
         "text": "Start with a modest count and a wide size range, run a "
                 "few passes and look between each. Because every pass is "
                 "one undo step, it is cheap to back out the last one and "
                 "try different settings."},
        {"title": "Going generative",
         "text": "Switch to *Base + Scatter layer* once there is something "
                 "on the Scatter layer. Small counts per pass keep it "
                 "legible; large counts with overhang on quickly tile the "
                 "whole image with fragments of fragments."},
        {"title": "Soft edges",
         "text": "Raise the feather to a few pixels with larger patches and "
                 "the result reads as a collage of smudges rather than "
                 "cut-outs. Keep the feather well under half the minimum "
                 "patch dimension or small patches fade to nothing."},
        {"title": "With the other plugins",
         "text": "Scatter first and slice after with *GlitchSlice* for "
                 "criss-cross cuts through the patchwork; degrade after "
                 "with *Signal Degrade* to unify the mixed edges."},
    ],
    "gotchas": [
        "Pixel layers only — select the base layer, not a group. Patches "
        "whose source area is fully transparent are skipped and counted "
        "in the status line.",
        "Iterative mode uses Copy Merged, which samples *everything* "
        "visible, not just the base and Scatter layers. Hide any other "
        "layers you don't want sampled before running.",
        "The Scatter layer is found by name. Renaming it makes the next "
        "pass create a fresh one; a layer you named Scatter yourself will "
        "be adopted.",
        "Settings persist between sessions in the panel's local storage; "
        "what you see is what the last run used.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "ditherpress",
    "name": "DitherPress",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "DitherPress-Photoshop-Plugin",
    "tagline": "Twenty-two dither algorithms, a dot-scale control and four "
               "colour modes, rendered to a new layer.",
    "blurb":
        "Reads the selected layer's pixels, reduces the image by the cell "
        "size, dithers it with the chosen algorithm and writes the result to "
        "a new layer named *<source> dither* directly above the source, which "
        "is left untouched. Error-diffusion, ordered, pattern and noise "
        "families give very different textures from the same image; the "
        "colour mode then decides whether the result is ink on paper, a "
        "three-colour tonal ramp, eight-colour RGB, or a reduced palette. "
        "Built along the lines of Doron Supply's DitherTone Pro, using "
        "Photoshop's UXP imaging API — the first of these panels to do its "
        "own pixel maths rather than drive Photoshop's tools. Each render is "
        "one undo step and the settings persist between sessions.",
    "facts": {
        "version": "1.2.0",
        "requires": "Photoshop 24.2+",
        "plugin id": "com.simonmorse.ditherpress",
    },
    "quickstart": [
        "Select a pixel layer (not a group) and open the panel from "
        "**Plugins**.",
        "Pick an algorithm and a cell size, choose a colour mode, and press "
        "**Render**. The status line reports the cell grid, ink coverage "
        "and render time.",
        "Press **Randomise** to roll every setting except your colours, then "
        "Render again. Undo removes a whole render in one step.",
        "For large files start at cell size 2 or more; cell size 1 on a "
        "poster-sized image takes several seconds, and palette mode with "
        "many colours is the slowest path.",
    ],
    "controls": [
        {"title": "Dither",
         "rows": [
             ["Algorithm", "22 options",
              "*Error diffusion*: Floyd-Steinberg, False Floyd-Steinberg, "
              "Jarvis-Judice-Ninke, Stucki, Burkes, Sierra, Sierra Two-Row, "
              "Sierra Lite, Atkinson. *Ordered*: Bayer 2×2 to 16×16, Cluster "
              "dot 8×8. *Pattern*: Halftone dots, Halftone lines, "
              "Cross-hatch, Modulation (waves), Modulation (contours). "
              "*Noise*: Plain threshold, Random noise, Interleaved gradient "
              "noise."],
             ["Cell size", "1 – 64 px",
              "The image is reduced by this factor before dithering and "
              "every result pixel becomes a cell×cell block. 1 is full "
              "resolution; 4 – 8 gives a visibly chunky dither."],
             ["Pattern size", "2 – 128 cells",
              "Period of the halftone, cross-hatch and modulation patterns, "
              "in cells."],
             ["Pattern angle", "0 – 180°",
              "Rotation of those patterns. 45° is the classic halftone; 0 "
              "and 90 give horizontal and vertical line screens."],
             ["Modulation depth", "0 – 100",
              "How far the tone underneath pushes the wave or contour "
              "pattern out of line. Modulation modes only."],
             ["Diffusion strength", "0 – 100",
              "Fraction of the quantisation error passed to neighbours. 100 "
              "is textbook; lower values drift towards a plain threshold. "
              "Error-diffusion algorithms only."],
             ["Serpentine scan", "default on",
              "Alternates scan direction each row, which breaks up the "
              "diagonal worms error diffusion otherwise produces."],
         ]},
        {"title": "Tone",
         "rows": [
             ["Brightness / Contrast", "-100 – 100",
              "Applied before dithering, per channel in the colour modes."],
             ["Grain", "0 – 100",
              "Random noise added before dithering, for a rougher, more "
              "distressed result."],
             ["Invert", "",
              "Inverts the tone before dithering, so ink and paper swap "
              "roles."],
         ]},
        {"title": "Colours",
         "rows": [
             ["Colour mode", "Ink & paper / Tonal / RGB channels / Palette",
              "Chooses which controls below apply and what the render "
              "contains."],
             ["Ink / Paper", "hex",
              "The two colours of Ink & paper mode. Paper is also the "
              "background of Tonal mode."],
             ["Transparent paper", "Ink & paper, Tonal",
              "Leaves paper pixels fully transparent so only the ink lands "
              "on the new layer."],
             ["Shadows / Midtones / Highlights", "hex, Tonal mode",
              "Ink pixels take a colour from this three-stop ramp according "
              "to the tone underneath them — a dithered gradient map."],
             ["RGB channels", "",
              "Red, green and blue are dithered independently, so every "
              "pixel is one of eight colours."],
             ["Palette", "From image, or a preset",
              "*From image* builds a palette by median cut with the colour "
              "count below. Presets: Game Boy, Commodore 64, CGA, ZX "
              "Spectrum, Pico-8, four greys, and a process set of RGB + "
              "CMY + black + white."],
             ["Colours (from image)", "2 – 64",
              "Palette size when building from the image."],
             ["Spread", "0 – 100",
              "For ordered and pattern algorithms in Palette mode: how hard "
              "the threshold pattern pushes a pixel towards its neighbouring "
              "palette colours. Error diffusion ignores it and diffuses the "
              "colour error instead."],
         ]},
        {"title": "Presets",
         "rows": [
             ["Saved", "dropdown",
              "Choosing a preset loads every setting immediately, colours "
              "included, and puts its name in the Name field."],
             ["Name", "text",
              "Type a name and press **Save preset** to store the current "
              "settings. Saving with the name of the selected preset "
              "overwrites it."],
             ["Save preset / Delete", "",
              "Save writes `presets.json` to the plugin's data folder, which "
              "survives plugin updates; Delete removes the selected preset."],
         ]},
    ],
    "workflow": [
        {"title": "Finding a texture",
         "text": "Randomise is the quickest way in: every press gives a "
                 "different algorithm, scale and colour treatment. When one "
                 "is close, stop randomising, adjust by hand, and save it as "
                 "a preset before moving on."},
        {"title": "Print-like screens",
         "text": "Halftone dots at 45° with a pattern size of 6 – 10 cells "
                 "reads as a newspaper screen; lines at 0° or 90° as a "
                 "line screen. The dot uses a proper Euclidean spot "
                 "function, so ink dots in the lights become paper dots in "
                 "the darks the way a real screen does."},
        {"title": "The DitherTone modulation look",
         "text": "*Modulation (contours)* with a modest pattern size and a "
                 "high depth bends the line screen around the image's "
                 "tones. *Modulation (waves)* is the gentler version."},
        {"title": "Retro palettes",
         "text": "Palette mode with a preset and cell size 2 – 4 is the "
                 "8-bit route. Error diffusion gives the smoothest blends; "
                 "Bayer with a high Spread gives the crunchier ordered look "
                 "of the original hardware."},
        {"title": "Layering",
         "text": "Transparent paper puts ink alone on a clear layer, so a "
                 "dither can sit over the original or over a flat colour and "
                 "be blended, masked or offset with *Misregistered Print*."},
    ],
    "gotchas": [
        "Pixel layers only — select a layer, not a group. Semi-transparent "
        "areas are matted onto white before dithering, so they lighten "
        "rather than darken.",
        "Pure JavaScript pixel loops: a 6000×4000 image at cell size 1 "
        "takes a few seconds and a couple of hundred MB while it runs. "
        "Larger cell sizes are much faster.",
        "Pattern size, angle and depth only affect the pattern algorithms; "
        "diffusion strength and serpentine only the error-diffusion ones. "
        "Changing them under any other algorithm does nothing.",
        "Colour fields take six-digit hex (with or without #). An "
        "unreadable value silently falls back to the default.",
        "The panel is permanently scrollable on purpose: UXP text fields "
        "can stop accepting typing when a panel's scrollbar appears or "
        "disappears after docking. If a field still goes dead, close and "
        "reopen the panel from the Plugins menu before resorting to a "
        "Photoshop restart.",
    ],
    "sections": [
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "rebuild": REBUILD_NOTE,
})

# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# FilmLook: lists generated from the plugin's presets.js / films.js
FILM_GROUPS = [
    {"title": "1920s", "rows": [
        ["1922  Nosferatu", "day / interiors (amber tint)", "Tinted B&W release prints. The circulating 2006 Murnau Foundation restoration matches its tints to a 1922 French nitrate print, so they are muted: amber/yellow for day and interiors, green for night, pink for dawn and dusk (sources describe the scheme differently). Ortho stock is inferred, not documented. Multi-generation source: soft, grainy, uneven density."],
        ["1922  Nosferatu", "night (green tint)", "Night scenes were shot in daylight and read as night through the tint. See the day variant for sources. **Calibrated to reference frames.**"],
        ["1922  Nosferatu", "dawn / dusk (pink tint)", "Only a few minutes of the restoration are pink (dawn and dusk)."],
        ["1927  Metropolis", "", "B&W, 1.33, untinted in current restorations. The 2010 restoration mostly comes from the camera negative: clean, sharp, silvery mid-tones, deep blacks in the machine halls. Stock (ortho or pan) is undocumented; early-pan model used. **Calibrated to reference frames.**"],
        ["1927  Metropolis", "2008 Argentine 16mm footage", "About 25 minutes of the 2010 restoration come from a worn 16mm dupe negative reduced from an Argentine 35mm print: soft, washed out, heavily scratched, left visibly damaged on purpose."],
        ["1928  The Passion of Joan of Arc", "", "Panchromatic (Wikipedia only). No make-up; faces with full skin texture, flat near-white skies behind (the set was painted pink to read grey). Gaumont 2K from a dupe negative of the 1981 Oslo print: clean, spotless, well-resolved grain, no crushed blacks. **Calibrated to reference frames.**"],
        ["1929  Un Chien Andalou", "", "B&W silent. The 2021 4K restoration comes from the original negative: plain, fairly high-contrast studio photography. No technical description of the cinematography was found; stock undocumented. Low confidence. **Calibrated to reference frames.**"],
    ]},
    {"title": "1930s", "rows": [
        ["1933  King Kong", "", "Academy 1.37. The 2005 restoration comes from a multi-generation duplicate (sources disagree which one): rich intense blacks, bold crisp whites, moderate-to-heavy grain, softer composites. Stock undocumented. **Calibrated to reference frames.**"],
        ["1936  Modern Times", "", "Criterion 2K from a fine-grain master off the camera negative: strong contrast, rich uncrushed blacks, texture everywhere, minimal grain. Bright, even, high-key comedy lighting. **Calibrated to reference frames.**"],
        ["1938  Bringing Up Baby", "", "Criterion 4K from a mouldy nitrate duplicate negative: fairly heavy grain, clean grey scale, strong shadow detail, whites without blooming. Glossy studio lighting (my observation). **Calibrated to reference frames.**"],
        ["1939  The Wizard of Oz", "Kansas (sepia)", "Kansas was shot in B&W and printed with a sepia-tone process. The restoration matched the sepia to a period film sample."],
        ["1939  The Wizard of Oz", "Oz (three-strip Technicolor)", "Three-strip Technicolor, IB prints. 8K scan of the original separation negatives, graded to a 1939 Academy answer print: saturated primaries, bright even high-key light (effective speed about ASA 5), dense clean blacks. The 2019 4K is more restrained than earlier Blu-rays. **Calibrated to reference frames.**"],
        ["1939  Gone with the Wind", "", "Three-strip Technicolor, IB prints. Hard directional key light, saturated primaries with pointed use of red, restrained blue moonlight. The HD master (2004/2009 work) has terrific saturation and inky blacks. A new 4K is due 3 Nov 2026. **Calibrated to reference frames.**"],
    ]},
    {"title": "1940s", "rows": [
        ["1940  Rebecca", "", "Criterion 4K from the nitrate camera negative. Soft, graded low-key light, deep shadows, lush blacks, crisp whites, wide grey scale, fine grain. Diffusion on close-ups is not documented. **Calibrated to reference frames.**"],
        ["1947  Out of the Past", "", "Musuraca used minimal filtration: Aero 1 for light correction, G or 23-A for heavier exterior work. Full tonal range in depth, deep shadows but gentler than harder noir. Warner Archive 4K from the nitrate camera negative (1 Sept 2026). **Calibrated to reference frames.**"],
        ["1947  Out of the Past", "exteriors (G / 23-A filter)", "Heavier exterior correction: skies darker, foliage lighter."],
        ["1949  The Third Man", "", "High contrast, 'pitch black, brilliant white', hard single-source night light on hosed-down cobbles, wide-angle distortion and canted frames. 4K from a fine-grain master off the negative, graded to release prints. Tilting the camera is up to you. **Calibrated to reference frames.**"],
    ]},
    {"title": "1950s", "rows": [
        ["1950  Rashomon", "", "Extreme contrast, dappled sun through leaves, direct sun flare, bright flat courtyard. The 2008 restoration was probably scanned from a 1962 print (sources conflict), so contrast is higher and grain coarser than a negative scan. The Fuji stock claim is unverified. **Calibrated to reference frames.**"],
        ["1951  Strangers on a Train", "", "Bold, muscular high contrast with luscious blacks and brilliant whites; harder and darker than Rebecca. Provenance of the current restoration is undocumented. Low-medium confidence. **Calibrated to reference frames.**"],
        ["1954  Rear Window", "", "Early Eastman Color negative, 1.66. The Universal 4K has vivid primaries (especially greens), dense red brick, warm flesh with a slight brown cast, thin fine grain. Accounts conflict over whether the 4K derives from the 1999 photochemical restoration. **Calibrated to reference frames.**"],
        ["1954  Seven Samurai", "", "Toho 4K from a master positive (the negative is lost): strong contrast, natural grain, mild scratches remain. Overcast skies clip; telephoto compression in action scenes. **Calibrated to reference frames.**"],
        ["1958  Vertigo", "", "VistaVision, Eastmancolor negative, Technicolor IB prints: very fine grain, saturated reds and emerald greens. Burks used fog filters on San Francisco locations. The negative is badly faded and the restoration needed heavy colour correction, so modern frames only approximate the IB prints. **Calibrated to reference frames.**"],
        ["1958  Vertigo", "green glow (Judy's transformation)", "Burks' special diffusion filters with green light produced the greenish glow of the transformation scenes (ASC)."],
        ["1959  North by Northwest", "", "VistaVision. The 2024 restoration (13K scan of the negative) was graded to an IB Technicolor print: warm palette, natural skin, compact fine grain, bright clean daylight. Should be close to the original look. **Calibrated to reference frames.**"],
    ]},
    {"title": "1960s", "rows": [
        ["1960  À bout de souffle", "", "Fast Ilford still-camera film (HPS; Wikipedia's 'HP5' is anachronistic) pushed a stop, handheld Cameflex, next to no lighting. Visible lively grain, harder contrast in Paris sun. The 2023 4K is cleaner and darker than 1960 prints; add grain rather than subtract it. **Calibrated to reference frames.**"],
        ["1960  À bout de souffle", "available-light interiors", "Interiors lit by what was there: lower contrast, greyish blacks."],
        ["1962  Lawrence of Arabia", "", "Super Panavision 70 (spherical 65mm), 2.20. 2012 8K scan of the negative: very high sharpness, fine grain, strong contrast, warm ochre sand under pale sky, smooth sun highlights. The 5250 stock claim is unsourced. **Calibrated to reference frames.**"],
        ["1962  Ivan's Childhood", "", "High-contrast, luminous B&W: glistening wet surfaces, backlit birches, dugout interiors with hard slivers of light, silvery highlights that bloom slightly. HD from a fine-grain master positive. Stock undocumented. **Calibrated to reference frames.**"],
        ["1962  Ivan's Childhood", "dream sequences", "The dreams are brighter, sunnier and softer."],
        ["1964  Red Desert", "", "Technicolor IB prints. Much of the look is on set: trees, grass and rooms painted, industrial fog and steam, a muted grey-pastel world with isolated saturated accents, long telephoto lenses. A filter can't paint your subject; choose images with a strong accent colour. **Calibrated to reference frames.**"],
        ["1965  The Sound of Music", "2025 restoration", "Todd-AO 65mm, 2.20. The 2025 restoration (8K from the negative) has lush greens, bright blue skies, fine tight grain and deep blacks. Home-video grades differ a lot; see the 70mm variant. **Calibrated to reference frames.**"],
        ["1965  The Sound of Music", "original 70mm impression", "in70mm.com describes the original 70mm prints as sharp but soft and almost pastel, unlike the oversaturated Blu-ray."],
        ["1966  The Good, the Bad and the Ugly", "", "Techniscope (2-perf, enlarged to scope), Technicolor IB prints: medium-strong organic grain, warm dusty ochres, pale blue skies, hard midday sun, some crushed shadows. Grades vary widely by release; see the 2014 variant. **Calibrated to reference frames.**"],
        ["1966  The Good, the Bad and the Ugly", "2014 'yellow' master", "The 2014 Blu-ray grade had a notorious mustard-yellow cast."],
        ["1966  Andrei Rublev", "B&W", "Sovscope 2.35. Neutral, silvery B&W with a long mid-tone scale, deep but not crushed blacks, soft highlights. HD from a 35mm internegative; the two cuts differ in contrast. Stock undocumented. **Calibrated to reference frames.**"],
        ["1966  Andrei Rublev", "colour epilogue (icons)", "The epilogue is Sovcolor (screening notes): warm, low-saturation ochres, golds and faded reds and blues of the icons, slightly soft."],
        ["1967  Playtime", "", "65mm negative. Tati wanted colour that looked like black and white: greys, steel blues, black, with small red and green accents. Very fine grain, bright even low-contrast light. Aspect ratio sources conflict (about 1.70-1.85). **Calibrated to reference frames.**"],
        ["1967  Playtime", "2014 master (yellow-green)", "The 2014 Criterion master had a yellow-green tint; the 2026 4K is more neutral."],
        ["1967  Weekend", "", "Coutard used the fastest Eastmancolor and overdeveloped it to double its speed (Criterion booklet): heavy grain, lifted milky blacks, flat muddy daylight, with bold red, white and blue accents. Someone who saw 1960s prints recalls them as dark and muddy too. **Calibrated to reference frames.**"],
        ["1968  Rosemary's Baby", "", "50-speed colour negative, 18mm and 25mm lenses for nearly everything, Technicolor IB prints. Soft, bright, natural daylight interiors in pale yellows, creams and pastel greens. Criterion 4K from the camera negative. **Calibrated to reference frames.**"],
        ["1968  Rosemary's Baby", "flashed dream sequences", "The film was flashed for the dream sequences 'to soften colors and reduce contrast' (ASC)."],
        ["1968  Planet of the Apes", "", "Panavision anamorphic, Color by DeLuxe, no special filters. Hard high sun, deep blue skies over tan and rust rock, slightly lifted blacks, noticeable grain (weakly sourced). Who made the current 4K master, and from what, is undocumented. **Calibrated to reference frames.**"],
        ["1968  2001: A Space Odyssey", "", "Super Panavision 70, spherical, 2.20. Extremely fine grain, clean bright near-white sets under soft practical light, true black space, sparing saturated accents. The 2018 4K (8K scan of the negative) removed the old yellow push. **Calibrated to reference frames.**"],
        ["1968  2001: A Space Odyssey", "Dawn of Man", "Front-projected: warm ochre, slightly lower contrast."],
    ]},
    {"title": "1970s", "rows": [
        ["1971  Trafic", "", "Low confidence: colour process, stock and gauge are undocumented and aspect-ratio sources conflict (1.37 vs 1.85; the restoration is 1.37). The 2K restoration shows moderately saturated primaries, neutral-warm balance, flat overcast daylight, good blacks. **Calibrated to reference frames.**"],
        ["1971  A Clockwork Orange", "", "1.66, lit mostly by practicals (bare photofloods in fixtures, fluorescent tubes): 'a really cold, stark style' (Alcott). Hard bright white sets, saturated accents, wide-angle distortion (a 9.8mm lens). Stock undocumented. **Calibrated to reference frames.**"],
        ["1972  Solaris", "Earth (colour)", "Kodak colour negative, Sovscope 2.35: lush, green-dominant Earth scenes. The circulating HD is from a low-contrast print, so it is soft and grainy. **Calibrated to reference frames.**"],
        ["1972  Solaris", "station (restrained colour)", "Cool steel-and-white station interiors with restrained colour. **Calibrated to reference frames.**"],
        ["1972  Solaris", "monochrome (blue cast)", "The Kodak ran out partway through filming, so some scenes are B&W. DP Yusov told Criterion no blue tint was added, but the 2011 Blu-ray shows a blue cast. Disputed; set the tone amount to 0 for Yusov's version."],
        ["1973  The Long Goodbye", "day (35% flash)", "Eastman 5254, post-flashed at Technicolor by scene: 10-15% night, 35% beach party, 50% Mexico (American Cinematographer). Pastel, muted, slightly blue: 'Pastels are for memory' (Zsigmond). The Kino 4K crushes some blacks, so its shadows are denser than a 1973 print; this preset is calibrated to that transfer and uses a lighter flash than the documented 35%. Raise Flashing for the 1973 print look. **Calibrated to reference frames.**"],
        ["1973  The Long Goodbye", "night (15% flash + push)", "For night exteriors a 10% flash plus a one-stop push replaced a two-stop push (AC)."],
        ["1973  The Long Goodbye", "Mexico (50% flash)", "The heaviest flash, 50%, for the final Mexico forest scenes."],
        ["1974  The Conversation", "2024 restoration", "Muted, drab palette of greys, browns and off-greens, soft daylight, moderate contrast. The 2024 4K from the negative (graded to a director-approved print) runs noticeably cooler and tealer than 1974 prints likely did. **Calibrated to reference frames.**"],
        ["1975  Jaws", "Amity summer", "Panavision anamorphic, Technicolor prints. Butler planned an 'Andrew Wyeth look' early, a sunny Fourth of July middle and a 'dreary' final hunt. Bright, slightly warm daylight, saturated sea and sky. Spielberg says the 4K looks better than 1975 projection. **Calibrated to reference frames.**"],
        ["1975  Jaws", "final hunt (dreary)", "The last act is darker, flatter and greyer (Butler: 'ominous')."],
        ["1975  The Mirror", "colour", "Imported Kodak colour, used sparingly: muted greens, greys, blues and browns, soft window light, near-clipping skies. Criterion 2K from the camera negative. **Calibrated to reference frames.**"],
        ["1975  The Mirror", "monochrome (warm)", "About a third of the film is B&W. Current Criterion and RusCiCo-derived masters have a light sepia tinge; some older ones are neutral. Whether 1975 prints were toned is undocumented. **Calibrated to reference frames.**"],
        ["1976  Taxi Driver", "", "Gritty grain, strong night blacks, sodium-orange and neon practicals, haloed wet streets; 'I let New York light itself' (Chapman). Sony 4K from the negative, matched to Scorsese-approved prints. **Calibrated to reference frames.**"],
        ["1976  Taxi Driver", "climax (desaturated)", "For an R rating, the shootout's colour was muted in release prints, turning blood from bright red to reddish-brown (AFI). Chapman says the restoration partly brought the colour back."],
        ["1977  Eraserhead", "", "Very high contrast: subjects lit in pools, everything else 'falling off steeply to black'. Neutral grey, crushed black floor, no bloom, grain heavier in some scenes. Exteriors only on overcast days. Criterion 4K from the negative. **Calibrated to reference frames.**"],
        ["1979  Alien", "", "Kodak 5247 at 100 ASA, Panavision C-series anamorphics wide open at T2.3-2.8 (Vanlint). Heavy smoke, wet sets, practicals at very low levels: low-key, backlit, cool blue-green with warm pools. The 2019 4K is cooler and more neutral than older Blu-rays. **Calibrated to reference frames.**"],
        ["1979  Stalker", "outside the Zone (sepia)", "Dense brown-amber, high-contrast monochrome. The 2017 Mosfilm 2K has a much heavier sepia than older DVDs. How the sepia was made is undocumented. **Calibrated to reference frames.**"],
        ["1979  Stalker", "the Zone (colour)", "Muted, earthy colour dominated by moss greens and grey-browns, soft overcast light. The BFI's print is Orwocolor; whether the final negative was Kodak is disputed (Misek). **Calibrated to reference frames.**"],
    ]},
    {"title": "1980s", "rows": [
        ["1980  The Long Good Friday", "", "Naturalistic overcast London locations, muted colour, blacks 'not the deepest'. The 2024 4K from the negative (Méheux-approved) skews slightly green and fixes the old pink skin. Stock undocumented. **Calibrated to reference frames.**"],
        ["1980  The Shining", "Overlook interiors", "Normal development throughout and 'I didn't use any filters' (Alcott): bright, even, glossy, sharp. Warm amber interiors from practicals (dimmed 1000W chandeliers) with saturated reds. 2019 4K from the negative. **Calibrated to reference frames.**"],
        ["1980  The Shining", "snow exteriors", "Cool blue snow scenes (full blue gel on the windows) against the warm interiors."],
        ["1982  Blade Runner", "night streets", "Panavision anamorphic, low-contrast filters varied with light angle and smoke density, xenon shafts through smoke, heavy backlight, rain (AC). Lifted soft shadows around lights, bloomed highlights, streak flares. The Final Cut grade may be cooler than theatrical prints (unverified). **Calibrated to reference frames.**"],
        ["1982  Blade Runner", "Tyrell interiors (amber)", "Warm amber-orange interiors."],
        ["1983  Nostalghia", "colour (desaturated)", "A special print treatment at Technicolor Rome raised contrast and removed colour (Lanci): grey-dominant colour, underlit grey shadows, mist and steam. The 2022 4K recreated this digitally, and the '60% less colour' figure is indirect. **Calibrated to reference frames.**"],
        ["1983  Nostalghia", "memory (monochrome, 2022 restoration)", "In the 2022 CSC 4K restoration the memory and Russia sections measure as neutral grey monochrome, not sepia (checked against reference frames). Lanci recalls the 1983 print as sepia; for that, use the sepia variant. **Calibrated to reference frames.**"],
        ["1983  Nostalghia", "memory (sepia, as the 1983 print)", "Lanci: 'when we saw the print in sepia, we found it so interesting that we decided to keep it'. Higher contrast than the colour scenes."],
    ]},
]
STOCK_ROWS = [
        ["B&W orthochromatic (1910s-20s)", "", "Blind to red: reds and lips print near-black, blue skies go white. Silent-era release prints, usually several generations from the negative."],
        ["B&W early panchromatic (1925-35)", "", "Red-sensitive but still blue-heavy: skies pale, skin a little dark and luminous."],
        ["B&W studio panchromatic (1935-55)", "", "Classic Hollywood / Plus-X-type rendering: full grey scale, fine grain, deep but open blacks."],
        ["B&W fast panchromatic (1955-80)", "", "Double-X / Tri-X-type fast stock: livelier grain, slightly harder contrast."],
        ["B&W fast stills film, pushed (Nouvelle Vague)", "", "Fast still-camera film pushed a stop: coarse lively grain, greyish blacks in available light, abrupt highlight clipping."],
        ["B&W newsreel / duplicate", "", "Contrasty multi-generation duplicate: harsh, grainy, blocked blacks."],
        ["B&W home movie reversal (9.5mm / 16mm, 1920s-50s)", "", "Reversal home-movie stock: bright, contrasty, slightly warm-black base."],
        ["Technicolor two-colour (1922-35)", "", "Only two records: red-orange and blue-green. Skin goes peach-orange, skies and foliage turn teal, no true yellow or violet."],
        ["Technicolor three-strip dye transfer (1935-55)", "", "Three B&W separation negatives printed by dye imbibition: pure, dense, saturated primaries with no colour grain."],
        ["Early Eastmancolor negative (1950s)", "", "Single-strip chromogenic negative: softer, warmer, a little less saturated than three-strip."],
        ["Eastmancolor neg + Technicolor IB print (1955-75)", "", "The classic 'Color by Technicolor' of the 50s-70s: chromogenic negative, dye-transfer print. Rich, dense, clean blacks."],
        ["Eastman 50-speed negative, Eastman print (1962-68)", "", "Slow, fine-grained colour negative of the 60s (DeLuxe, Metrocolor prints): clean and natural."],
        ["Eastman 100-speed negative (1968-74)", "", "The first faster colour negative: grainier and a touch muted, the look of early-70s New Hollywood."],
        ["Eastman improved 100-speed negative (1974-83)", "", "Late-70s colour negative: fuller colour and finer grain than the early 100-speed stock."],
        ["Sovcolor / ORWO-type (Agfa lineage)", "", "Eastern-bloc chromogenic stock: muted, earthy, less clean dye separation. Approximation."],
        ["Kodachrome reversal (8mm / 16mm / slides)", "", "Deep blacks, rich reds and blues, narrow latitude, very fine grain."],
        ["Ektachrome reversal (Super 8 / 16mm, 1970s)", "", "Cooler, bluer reversal with lighter blacks and busier grain."],
        ["Faded Eastmancolor print (magenta shift)", "", "A 1970s release print decades later: cyan and yellow dyes gone, leaving pink-magenta and weak blacks."],
        ["Colour negative, silver retained (bleach bypass)", "", "Silver left in the print: desaturated, harder contrast, dense blacks, metallic sheen."],
]
FORMAT_ROWS = [
        ["35mm silent, full aperture 1.33", "24.9 mm frame", ""],
        ["35mm Academy 1.37", "22 mm frame", ""],
        ["35mm flat 1.66 (European)", "22 mm frame", ""],
        ["35mm flat 1.85", "22 mm frame", ""],
        ["VistaVision (8-perf) 1.85", "37.7 mm frame", ""],
        ["35mm anamorphic (CinemaScope / Panavision) 2.35", "21.95 mm frame", ""],
        ["Sovscope anamorphic 2.35", "21.95 mm frame", ""],
        ["Techniscope 2-perf 2.35", "22 mm frame", ""],
        ["65mm / 70mm (Todd-AO, Super Panavision 70) 2.20", "52.5 mm frame", ""],
        ["65mm framed ~1.70-1.85 (Playtime)", "52.5 mm frame", ""],
        ["16mm 1.37", "10.26 mm frame", ""],
        ["9.5mm Pathé Baby 1.33", "8.2 mm frame", ""],
        ["Regular 8mm 1.33", "4.8 mm frame", ""],
        ["Super 8 1.36", "5.79 mm frame", ""],
]

ITEMS.append({
    "slug": "filmlook",
    "name": "FilmLook",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "FilmLook-Photoshop-Plugin",
    "tagline": "Film emulation from 1920s tinted nitrate to 1980s anamorphic: "
               "stocks, gauges, lenses, print wear and 70 film presets.",
    "blurb":
        "A small physical model of photochemical film rather than a stack of "
        "grading tricks. Light goes through the lens (halation, diffusion, "
        "smoke, anamorphic streaks, vignette, fringing), exposes the negative "
        "records of the chosen stock (spectral sensitivity, so orthochromatic "
        "stock turns red lips black), is printed through a characteristic "
        "curve with grain added in exposure, and lands on print dyes with "
        "their real impurities, printer lights, flashing, push processing, "
        "silver retention, dye fade, tinting and toning. Grain, softness and "
        "halation are sized in millimetres on the film frame, so Super 8 is "
        "coarse and 70mm is fine at any image size. Film presets combine "
        "those building blocks with settings from sourced research (American "
        "Cinematographer, restoration notes, the DPs' own accounts), then "
        "calibrated against about 770 Shotdeck frames of the current "
        "transfers (contrast, black and white levels, colour casts by tonal "
        "zone, saturation and grain). Each preset carries a note saying what "
        "it rests on and whether it is calibrated. The result goes on a new layer; the photo is untouched.",
    "facts": {
        "version": "1.4.0",
        "requires": "Photoshop 24.2+, RGB, 8 or 16-bit",
        "plugin id": "com.simonmorse.filmlook",
        "film presets": "71 (45 films), 49 calibrated to frames",
    },
    "quickstart": [
        "Open **Plugins › FilmLook** and choose a film. The note under the "
        "list says what the preset is based on.",
        "Draw a marquee over part of the photo and press **Preview "
        "selection** to see the look quickly on just that area.",
        "Press **Render**. The look goes on a new *FilmLook ·* layer at the "
        "top; **Strength** is that layer's opacity and can be changed "
        "afterwards.",
        "Adjust anything in the sections below, then **Re-render last** to "
        "replace the previous result. Save combinations under **My presets**.",
    ],
    "controls": [
        {"title": "Top of panel",
         "rows": [
             ["Section switches", "tick box on each header",
              "Switch a whole stage on or off: Stock & process, Format & gate, "
              "Lens & light, Grain, Print condition, Transfer grade, Fringing. "
              "With Stock & process off the colours pass through unchanged, so "
              "the panel works as a multi-effect (just grain, just a matte, "
              "just fringing). Choosing a film switches everything back on; "
              "switch states are saved with My presets."],
             ["Film", "71 presets",
              "Year, title and variant. Films that change look between "
              "sections have variants: Nosferatu's tints, Kansas and Oz, "
              "Tarkovsky's monochrome and colour, the Long Goodbye flash "
              "levels."],
             ["Strength", "0 – 100",
              "Opacity of the result layer. Also updates the last render "
              "live."],
             ["Source", "Whole image / Selected layer",
              "Whole image uses the merged picture (previous FilmLook layers "
              "are hidden while it reads). Selected layer puts the result "
              "directly above that layer."],
             ["Frame", "No change / Black matte / Crop canvas",
              "Matte blacks out the image outside the format's aspect ratio "
              "and draws the gate corners and edge. Crop trims the canvas to "
              "the aspect ratio after rendering."],
             ["Shift image X / Y", "pixels",
              "Moves the photo under the matte before the look is applied: + X "
              "right, − X left, + Y down, − Y up. Works with Render, Preview and "
              "Re-render last. Uncovered edges come in black."],
             ["Preview selection", "",
              "Renders only the marquee area, at full resolution and with "
              "the same physical scales, onto a *FilmLook preview* layer."],
             ["Re-render last", "",
              "Deletes the previous FilmLook layer and renders again with "
              "the current settings (same area if it was a preview)."],
             ["New grain & dust", "",
              "Rolls a new random seed for grain, dust and scratches."],
             ["Fringe selected layer", "",
              "Applies only the Fringing settings to the selected layer (for "
              "example an existing FilmLook render) on a new layer above it."],
         ]},
        {"title": "Stock & process",
         "rows": [
             ["Stock", "18 stocks",
              "Sets spectral response, dye set, curve, grain and colour "
              "separation. See the stock list below."],
             ["B&W filter", "Yellow, deep yellow, orange, red, green, blue",
              "Camera filter on black-and-white stock: yellow darkens "
              "skies a little, red a lot, green lightens foliage."],
             ["Toning / Tinting", "7 tones, 9 tints",
              "Toning colours the darks (sepia, selenium, iron blue, "
              "copper). Tinting dyes the base and colours the lights "
              "(silent-era amber, green, blue, rose)."],
             ["Exposure", "-3 – +3 stops", "Exposure onto the negative."],
             ["Contrast / Latitude", "gamma 0.5 – 2.2",
              "Slope of the print-through curve; latitude softens the toe "
              "and shoulder."],
             ["Colour separation", "0 – 1.8",
              "How distinct the colour records are; 1 is the stock as made."],
             ["Black density / Base fog", "",
              "Maximum print density (depth of black) and minimum density."],
             ["Printer lights R / G / B", "±16 points",
              "Lab timing, about 1/12 stop per point. + gives more of that "
              "colour."],
             ["Flashing", "0 – 1",
              "Pre/post-flash of the negative: lifts shadows, mutes colour "
              "(The Long Goodbye, Rosemary's Baby dreams)."],
             ["Push / pull", "-1 – +3 stops",
              "Forced development: more contrast, grain and fog."],
             ["Silver retention", "0 – 1", "Bleach bypass."],
             ["Dye fade", "0 – 1",
              "Cyan and yellow dyes fading, leaving the pink-magenta of old "
              "release prints."],
         ]},
        {"title": "Format & gate",
         "rows": [
             ["Gauge / format", "14 formats",
              "Frame width, squeeze, resolving power, aspect and gate shape."],
             ["Aspect ratio", "1.0 – 2.8", "Used by the matte and crop."],
             ["Frame width", "mm",
              "Sets the physical scale of grain, halation and softness."],
             ["Resolving power", "0.2 – 3", "Multiplies the format's MTF."],
             ["Gate corners / edge", "", "Rounded gate corners, e.g. Super 8."],
             ["Iris / size / softness", "",
              "Silent-era oval or circular iris vignette (Nosferatu, Joan "
              "of Arc)."],
         ]},
        {"title": "Lens & light",
         "rows": [
             ["Lens", "8 presets",
              "Clean prime, silent-era, studio glamour, wide, anamorphic, "
              "70s zoom, smoke + low-con, home movie."],
             ["Halation", "", "Red-orange glow around highlights."],
             ["Diffusion / glow", "", "Pro-mist, gauze or fog filter bloom."],
             ["Low-con / smoke", "", "Veiling glare lifting the shadows."],
             ["Anamorphic streaks", "", "Horizontal blue flares from bright points."],
             ["Vignette / Edge softness / Colour fringing", "", "Lens fall-off."],
         ]},
        {"title": "Fringing (after the look)",
         "intro": "Colour errors added after the film look. Characteristic "
                  "approximations, not measurements of particular lenses. "
                  "Changing film keeps your fringing settings.",
         "rows": [
             ["Fringing preset", "10 presets",
              "None, early achromat, studio prime, 1960s-70s zoom, "
              "anamorphic, fast lens wide open, home-movie lens, dye-transfer "
              "misregistration, two-colour misregistration, everything wrong."],
             ["Lateral fringing", "0 – 1.5",
              "Each colour is magnified slightly differently, so fringes grow "
              "toward the corners."],
             ["Lateral colours", "Red/cyan or purple/green", "Which colours separate."],
             ["Horizontal only", "0 – 1", "Anamorphic-style: fringing mainly left and right."],
             ["Purple halo / width", "", "Axial fringing around bright edges, as from fast lenses wide open."],
             ["Red / blue record shift X, Y", "±5 thousandths of width",
              "Moves a whole colour record off register, as on a misregistered "
              "print. Scales with image size."],
         ]},
        {"title": "Grain, print condition, transfer grade",
         "rows": [
             ["Grain amount / size / colour", "",
              "Two-scale grain in exposure; size in microns on the negative; "
              "anamorphic grain is stretched horizontally."],
             ["Condition", "6 presets", "Pristine restoration to archive dupe."],
             ["Duplicate generations", "0 – 4",
              "Each generation adds contrast, grain and softness."],
             ["Dust / dirt / scratches / uneven density / stains", "",
              "Print damage, drawn at image scale."],
             ["Saturation / Black lift / White level / Warm-cool / "
              "Green-magenta", "",
              "A final video-style grade, for matching how a restoration "
              "looks today (most B&W transfers keep whites well below pure "
              "white)."],
         ]},
    ],
    "sections": [
        {"label": "film presets", "type": "reference", "data": FILM_GROUPS},
        {"label": "stocks", "type": "reference",
         "data": [{"title": "Processes", "rows": STOCK_ROWS}]},
        {"label": "formats", "type": "reference",
         "data": [{"title": "Gauges", "rows": FORMAT_ROWS}]},
        {"label": "installing", "type": "steps", "data": INSTALL_STEPS},
    ],
    "workflow": [
        {"title": "Preview on a selection",
         "text": "A 24MP render takes roughly 10 – 20 seconds. Preview a "
                 "marquee area while dialling in, then Render once."},
        {"title": "Pick photos that suit the film",
         "text": "Some looks are mostly production design: Red Desert's "
                 "painted sets, Playtime's grey world, Blade Runner's smoke "
                 "and neon. The preset supplies stock, format and palette "
                 "tendency; the subject has to supply the rest."},
        {"title": "Restorations differ",
         "text": "Presets calibrated to Shotdeck frames match today's "
                 "transfers, which can differ from the original release "
                 "prints (Vertigo, The Good, the Bad and the Ugly, Playtime, "
                 "Solaris, Stalker). Where this matters there is a second "
                 "variant or a note."},
    ],
    "gotchas": [
        "RGB documents only, 8 or 16-bit; 32-bit is refused.",
        "Whole-image source reads the merged picture, so hide adjustment "
        "layers you don't want baked in.",
        "Crop canvas is a real canvas change (one undo step).",
        "Don't double-click the .ccx; use the installer agent (see "
        "installing).",
    ],
    "rebuild": [
        "Source is in `FilmLook-Photoshop-Plugin`: `engine.js` (pixel "
        "model), `presets.js` (stocks, formats, lenses, conditions, tints), "
        "`films.js` (film presets with research notes), `calibration.js` "
        "(per-film values fitted to reference frames), `main.js` and "
        "`index.html` (panel).",
        "To update: bump `version` in `manifest.json`, zip all seven files "
        "at the archive root as `FilmLook.ccx` and run the installer agent "
        "again.",
        "Reference frames and the research notes live in *APA Content & "
        "Marketing (1)/FilmLook-References* (outside Guides, so they are "
        "not published).",
    ],
})

ITEMS.append({
    "slug": "videolook",
    "name": "VideoLook",
    "kind": "UXP panel",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "folder": "VideoLook-Photoshop-Plugin",
    "tagline": "Television and video looks from Baird's 30 lines to DV: 405-line to PAL, NTSC "
               "and SECAM, Soviet, Japanese and pre-war systems, long-distance reception, "
               "tube cameras, Quad to VHS, discs, teletext and CRT sets.",
    "blurb":
        "The companion to FilmLook for television. It does not paint a look on: it "
        "turns the photo into a real video signal at the standard's own resolution "
        "(575 lines of about 922 samples for PAL, sampled at four times the colour "
        "subcarrier), passes it through a camera, a transmission channel, a tape "
        "machine and any transfer, then decodes it with the chosen receiver, so "
        "cross-colour, dot crawl, NTSC hue errors, PAL desaturation, Hanover bars and "
        "SECAM streaks come out of the maths as they did in reality. A display stage "
        "then rebuilds the picture at document size with scan lines, shadow mask or "
        "aperture grille, glow and tube geometry, or as a clean frame-grab, or as a "
        "photograph of the screen. The numbers come from the standards themselves "
        "(ITU-R BT.470, the UK System I specification, FCC and SMPTE documents) and "
        "from BBC engineering sources: the 1964 BBC camera comparisons, the 1967 "
        "registration report, BBC training sheets on camera processing, tape and "
        "colour-under recording, receivers and the 1967 standards converter. Settings "
        "whose defaults are estimates are marked est. on the panel. Version 1.1 adds "
        "the receiving set as a stage of its own: a set built for another country's "
        "system (French System L comes out as a rolling negative on a UK set), "
        "co-channel interference from a second picture, overload, and the set's "
        "sync, so pictures tear and roll for real reasons. It also adds Soviet, "
        "East German, Japanese, Brazilian and Argentine systems, Hi-Vision, "
        "the pre-war systems (Baird 30 and 240 lines, Berlin and NBC 441, Moscow "
        "343), CBS colour-wheel TV, Apollo 11, slow-scan TV, Pixelvision, CCTV, "
        "LaserDisc, CED, Canal+ scrambling and teletext. Version 1.2 adds the "
        "off-screen photograph as a proper stage: a shutter that catches one field "
        "or a whole frame, a black-and-white negative and print, flare, soft dust and "
        "the tube surround, together with two faults of older sets that turn dark "
        "captions grey (mean-level AGC and no DC restorer). The result goes on a "
        "new layer; the photo is untouched.",
    "facts": {
        "version": "1.2.1",
        "requires": "Photoshop 24.2+, RGB, 8 or 16-bit",
        "plugin id": "com.simonmorse.videolook",
        "looks": "84 (10 built from specifications alone)",
    },
    "quickstart": [
        "Open **Plugins › VideoLook** and choose a look. The note under the list "
        "says what the chain is and what it rests on.",
        "Draw a marquee and press **Preview selection** to see just that area. The "
        "whole frame still goes through the signal chain, so the preview is exact.",
        "Press **Render**. The look goes on a new *VideoLook ·* layer at the top; "
        "**Strength** is that layer's opacity.",
        "Adjust any stage below and press **Re-render last**. Tick boxes on the "
        "section headers switch whole stages on and off. Save combinations under "
        "**My presets**.",
    ],
    "controls": [
        {"title": "Top of panel",
         "rows": [
             ["Look", "84 looks in 14 groups",
              "UK broadcast, US broadcast, France, Home video, Archive and transfers, "
              "Long-distance reception, USSR and Eastern Europe, Japan, Early television, "
              "Space, surveillance and toys, South America, Community TV and video art, "
              "Photographed off the screen, Subtitles. "
              "Choosing a look sets every stage and ticks the ones it uses."],
             ["Strength", "0 – 100", "Opacity of the result layer; updates the last render live."],
             ["Source", "Whole image / Selected layer",
              "Whole image hides earlier VideoLook layers while it reads."],
             ["Output", "New layer / New document",
              "A layer at document size, or a new document at the standard's own "
              "size in square pixels (767×575 for PAL, 647×485 for NTSC)."],
             ["Frame", "Matte / Crop canvas",
              "The picture is 4:3 (5:4 for early 405-line, 16:9 for Hi-Vision, 1.15:1 for "
              "Berlin 441, 1:1 for slow-scan, 3:7 tall for Baird 30-line); the rest of "
              "the document is black, or the canvas is cropped to it."],
             ["Shift image X / Y", "pixels", "Moves the photo inside the picture: + X right, + Y down."],
             ["Implied motion", "pixels per field, degrees",
              "A still has no movement; this supplies it. It brings out interlace "
              "combing, tube lag and comet tails, 3:2 pulldown and converter double "
              "images. **Only the selection moves** makes the selection the moving subject."],
             ["New noise", "", "New random seed for noise, dropouts and grain."],
         ]},
        {"title": "Camera",
         "rows": [
             ["Camera / pickup", "11 types",
              "Emitron, CPS Emitron, image orthicon (B&W and 3-tube colour), vidicon, "
              "3-tube Plumbicon, 1964 four-tube, EMI 2001, Saticon camcorder, "
              "broadcast 3-CCD, consumer 1-CCD, DV 3-CCD, intermediate film (Baird / "
              "Fernseh), Apollo lunar camera, PXL-2000, CCTV and Portapak. Each sets the "
              "controls below."],
             ["Exposure", "−2 – +2.5 stops", "Pushes highlights into the tube's knee or the CCD's clip."],
             ["Softness", "0 – 1.5% of the width",
              "Blurs the picture before it is scanned, like a caption camera slightly out of "
              "focus. Because it is in the camera, the set's scan lines stay crisp over a soft "
              "picture, which is how 1960s off-screen photographs of captions look."],
             ["Edge sharpening", "0 – 1.5",
              "BBC-style contour correction: 3-tap, from green, added equally to R, G "
              "and B so the halos are neutral; off in the darks. The amount is an estimate."],
             ["Signal-to-noise", "20 – 60 dB", "Camera noise, rising with frequency on photoconductive tubes."],
             ["Lag / Comet tails", "", "Trails behind moving bright objects (needs implied motion)."],
             ["Image-orthicon halo", "", "Dark ring round bright objects. Its size is an estimate."],
             ["Red / Blue registration", "−150 – +150 ns",
              "Colour tubes out of register. The BBC's 1967 tolerance was 25 ns for "
              "3-tube cameras (0.05% of the width) and 50 ns for a 4-tube camera's colour tubes."],
         ]},
        {"title": "Standard & colour",
         "rows": [
             ["Television standard", "26 systems",
              "625 PAL (UK I, Europe B/G/H), 525 NTSC (US, Japan), SECAM (France L, USSR "
              "D/K, East Germany B/G), PAL-M, PAL-N, 405-line, 819-line (France E, "
              "Belgium F), 625 and 525 black and white, Soviet 625 and 343, Berlin and "
              "NBC 441, Baird 240 and 30, CBS field-sequential colour, Apollo 320, "
              "slow-scan 120, Hi-Vision MUSE, component 625/525."],
             ["Picture shape", "4:3 / 5:4 / 16:9", "5:4 was 405-line's shape until April 1950."],
             ["NTSC colour coding", "I/Q or equal-band", "FCC I/Q, or SMPTE 170M equal-band."],
         ]},
        {"title": "Channel",
         "rows": [
             ["Route", "Studio / Aerial / Satellite FM / D-MAC",
              "Satellite FM is Sky on Astra (PAL over FM, sparklies on a weak dish); "
              "D-MAC is BSB (no subcarrier, so no cross-colour)."],
             ["Signal-to-noise", "10 – 60 dB",
              "Snow. The US TASO grades: 44 excellent, 34 fine, 27 passable, 23 marginal, 17 inferior."],
             ["Ghost", "delay, strength, type",
              "Multipath echo: 1 µs is about 2% of the picture width; positive, "
              "inverted or edge-like depending on its RF phase."],
             ["Interference spots", "", "Impulse noise: white spots on 405, 819 and French L, dark on the others."],
             ["Co-channel station", "strength, offset, position",
              "A second station on the same channel (long-distance reception): it shows "
              "through with its own sync bars, striped by the few-kHz carrier offset. The "
              "second picture is the photo mirrored, or a layer named *second picture*."],
             ["Scrambling", "None / Discret 11",
              "Canal+ from 1984: each line delayed by 0, 0.9 or 1.8 µs at random."],
         ]},
        {"title": "Recording",
         "rows": [
             ["Format", "24 formats",
              "2-inch Quad (high and low band), 1-inch B and C, U-matic (LB, HB, SP), "
              "Betacam, Betacam SP, MII, VHS (SP, LP, EP), S-VHS, Betamax, Video8, Hi8, "
              "V2000, Philips VCR, D1, Digital Betacam, D2/D3, DV, DVCPRO."],
             ["Recorded", "At the studio / At home",
              "Studio tape goes before transmission; a home recording is made of the received, noisy signal."],
             ["Copy generations", "1 – 5", "Each copy adds tape noise and smear again."],
             ["Timebase wobble, Dropouts, Head-switch lines, Tracking error", "",
              "Domestic machine faults. The amounts are estimates."],
             ["Quad head banding", "", "Per-head bands every 16 lines, with colour errors growing across the picture."],
         ]},
        {"title": "Transfer",
         "rows": [
             ["Conversion generations", "1 - 12", "Repeat the conversion, each copy made from the last: with Optical and the same target standard, a picture re-shot off a monitor again and again."],
             ["Standards conversion", "Optical / BBC 1967 / Digital / Motion-compensated",
              "Re-codes to the target standard. The BBC 1967 field store blends one field "
              "in five and insets the picture in a black border."],
             ["Telerecording", "Suppressed field / Stored field / US kinescope",
              "Video filmed off a monitor: fewer lines, film grain, ~40:1 range. The result is the film."],
             ["Telecine", "Clean / 3:2 mixed frame",
              "Flying-spot film scanner in place of the camera. Run FilmLook first for the film stock."],
             ["Tape played on another system", "PAL-60 / NTSC 4.43 / SECAM on PAL",
              "American tapes on UK machines, and SECAM on a PAL-only set (black and white with dots)."],
         ]},
        {"title": "Decoder & set",
         "rows": [
             ["Luma/colour separation", "Notch, low-pass, comb, none",
              "A notch gives cross-colour on fine detail; a comb removes it on still pictures; "
              "none is a black-and-white set, which shows the subcarrier as dots."],
             ["PAL decoder", "Delay line / Simple",
              "All British sets had the delay line by 1970, so phase errors only reduce "
              "saturation; simple PAL shows Hanover bars."],
             ["Phase error / Differential phase", "degrees",
              "NTSC hue errors (\"Never The Same Colour\"); the PAL equivalent is lost saturation."],
             ["Set controls", "", "Sharpness, contrast, brightness, colour, overscan."],
             ["Set built for", "same / UK / Dutch-German / French / Soviet",
              "A set for another system gets that system's carrier levels wrong: French "
              "System L shows as a negative on a UK set, with no colour, and loses sync; "
              "other sound carriers leave patterning."],
             ["Vertical hold, Roll position, Horizontal hold, Line lock", "",
              "The set's own timebases: a sync separator, a flywheel line oscillator and "
              "a field oscillator. A clean signal locks and is unchanged; a wrong or weak "
              "one tears and rolls. The loop figures are estimates."],
             ["Overload (lockout)", "0 – 1", "Too strong a signal: sync crushed, picture partly negative."],
             ["Mean-level AGC", "0 – 1",
              "Early 405-line sets (and French 819 and System L sets) set their gain from the "
              "average signal, so a mostly black picture was turned up until it was grey and "
              "its whites over-driven. Gated AGC from the mid-1950s cured it. Only acts on "
              "those systems. The amount is an estimate."],
             ["Black follows the picture", "0 – 1",
              "A set with no DC restorer holds the picture's average at a fixed brightness, "
              "not its black: dark pictures go grey, bright ones go too dark. Works on any "
              "system. The amount is an estimate."],
             ["Black-level tilt", "0 – 1",
              "Makes that follow the picture down the screen: the level drops at a white "
              "caption and creeps back over the next field, leaving a grey band above the "
              "caption and black below it. Fitted to one 1968 off-screen photograph; the "
              "cause isn't established."],
         ]},
        {"title": "Display & view",
         "rows": [
             ["Tube", "B&W / Delta-gun / Slot mask / Trinitron / colour wheel / P7",
              "The phosphor pattern, sized from the screen size. P7 is the radar tube "
              "used for slow-scan TV: a blue flash, then a yellow-green afterglow."],
             ["Phosphors, White point, Tube gamma", "EBU / SMPTE C / 1953 / Japanese; D65 / 9300 K / 9300 K + 27 MPCD",
              "US sets often ran at 9300 K and Japanese sets at 9300 K + 27 MPCD; no UK "
              "figure was found, so D65 is the default."],
             ["Round tube face", "", "For round tubes: the KVN-49 and radar tubes."],
             ["Mask, Scan lines, Blooming, Glow, Curvature, Corners", "",
              "Mask and scan lines draw only where the image has enough pixels, and fade "
              "out rather than making moiré on small images."],
             ["View", "Frame-grab / Screen close-up / Photo of the screen / Magnifying lens / Televisor",
              "The lens is the KVN-49's water-filled magnifier; the Televisor is "
              "Baird's neon lamp and spinning disc."],
             ["Photo exposure", "0 – 2 fields",
              "How long the shutter was open, in fields (1/50 s each in the UK). 2 is a whole "
              "frame (1/25 s, the usual rule, and John Cura's Tele-snap setting); 1 catches one "
              "field, so only every other line shows (about 188 on 405 lines); between 1 and 2 "
              "part of the screen gets both; below 1 only a band is bright. 0 is a long exposure. "
              "**Scan position at the click** moves the band."],
             ["Photo softness, Glass and lens flare, Room reflection", "",
              "The camera's focus, light scattered in the faceplate and lens (it lifts the "
              "blacks near bright areas), and a window reflected in the glass."],
             ["Pull back, Camera tilt", "0 – 0.3; −6 – +6°",
              "Shows the dark surround of the tube and a camera not held square."],
             ["Photo finish", "As seen / Black-and-white print",
              "Black-and-white print puts the photo through a negative and a print. **Print "
              "exposure** (stops) sets how light it is: lower it and the screen's whites turn "
              "grey and milky; raise it and they burn out. **Print contrast** is the paper "
              "grade; **Print black** is how deep the print's black goes."],
             ["Photo grain", "0 – 1.5", "Film grain. New noise moves it."],
             ["Dust (amount), Dust brightness", "0 – 1.5; 0 – 3",
              "The dust of a small negative enlarged: small, soft, mostly faint specks, a few "
              "of them dark, modelled on those measured in 1960s off-screen stills. Amount "
              "0.15–0.2 is about their density and brightness 1 their strength; the looks use "
              "0.15 or 0.2. No hairs or scratches. New noise moves the specks."],
         ]},
        {"title": "Overlay",
         "rows": [
             ["Subtitles", "12 styles",
              "Typeset with your installed fonts (a temporary text layer, read and deleted), "
              "then burned in where they belonged: on the film print (chemically etched with "
              "ragged letters, or laser-etched with a thin dark halo), at the studio (BBC "
              "slab serif with a black edge or on a grey label, Arial italic with a soft "
              "shadow, VHS release, Dutch TV, Channel 4, DVD 4-colour bitmap, early black "
              "box), or by the set (US Line 21 closed captions). The BBC's own face, TKST, "
              "isn't available: Rockwell stands in. Font, italic, size, colour, edge, "
              "position (bottom, middle for titles, or top) and case can all be changed."],
             ["Overlay", "Teletext / Date-time stamp",
              "Teletext is drawn by the set after the decoder: mixed over the picture, as "
              "a full page, or as boxed subtitles. The stamp is burned in before "
              "recording, so the tape softens it."],
             ["Load font list, Filter families, Font family, Font style", "",
              "Press **Load font list** once per session to fetch your installed fonts from "
              "Photoshop (it isn't read at start-up, so it can't hold up other panels). Type part "
              "of a name in Filter families to narrow the list, then pick the family and style. "
              "Leave the family on *the style's own font* to use the style's list."],
             ["or PostScript name", "",
              "Type a PostScript name instead (e.g. `Arial-ItalicMT`), or several separated by "
              "commas, used in order of preference. Font Book shows it in each font's info panel."],
             ["Text", "",
              "Colours with {red} {green} {yellow} {blue} {magenta} {cyan} {white}, double "
              "height with {dh}, boxes with {box}...{/box}; 40 characters a line. The font "
              "is VideoLook's own."],
         ]},
    ],
    "workflow": [
        {"title": "Film on television",
         "text": "For 1970s drama exteriors or any film shown on TV, render the FilmLook "
                 "stock first, then apply VideoLook's telecine look to the result."},
        {"title": "Long-distance reception",
         "text": "Summer lift, French TV on a UK set, Sporadic-E: pick the look, then move "
                 "Co-channel strength, Roll position and Horizontal hold, and press New "
                 "noise for another moment. For a real second station, add a layer named "
                 "*second picture*."},
        {"title": "Off-screen photographs",
         "text": "For a 1960s station symbol or caption as it survives in off-screen "
                 "photographs: start with white artwork on black, choose a look from "
                 "*Photographed off the screen*, then move Print exposure (grey and "
                 "ghostly, or burnt out), Softness under Camera, and Mean-level AGC and "
                 "Black follows the picture under Decoder & set. See the Look Cookbook."},
        {"title": "Evidence",
         "text": "Ten looks (Alexandra Palace 1937, 405-line at home, US live 1950, French "
                 "819-line, Moscow 343, Baird 240, Berlin and NBC 441, CBS colour, Belgian "
                 "819) are built from the specifications alone, because no authentic "
                 "pictures survive. The rest are research-based and can be calibrated "
                 "against reference frames."},
    ],
    "gotchas": [
        "Large documents take a while: a 24-megapixel render with a CRT view is roughly "
        "10–20 seconds. Preview selection is quicker.",
        "A Photo of the screen is made from the whole picture (flare, grain, dust, tilt), "
        "so its previews take as long as a full render, and a one-field photo draws the "
        "screen twice.",
        "The photo is treated as sRGB; convert documents in other profiles first.",
        "A still cannot show movement: the 60-field 'video look' of US sitcoms, dot crawl "
        "moving and interlace flicker are not there. Implied motion shows what a single "
        "frame of movement would look like.",
        "32-bit documents are not supported.",
        "Hi-Vision has no camera stage (HD cameras aren't modelled) and needs Implied "
        "motion with 'Only the selection moves' to show its motion blur.",
    ],
    "sections": [
     {
      "label": "looks",
      "type": "reference",
      "data": [
       {
        "title": "UK broadcast",
        "rows": [
         [
          "BBC Alexandra Palace, 1937",
          "from the specifications · Emitron / iconoscope → 405-line (UK, B&W) → 12in black-and-white tube",
          "405 lines, 5:4 picture, Emitron camera, seen on a pre-war set. No live pictures survive, so this is built from the standards; the set's size and phosphor colour are estimates."
         ],
         [
          "405-line live studio at home, 1953",
          "from the specifications · CPS Emitron → 405-line (UK, B&W) → 14in black-and-white tube",
          "BBC 405-line picture on a 14in set: 3 MHz, 377 lines, visible scan lines. Live pictures only survive on film, so the as-broadcast look is built from the standards."
         ],
         [
          "405-line telerecording, 1953",
          "research-based · Emitron / iconoscope → 405-line (UK, B&W) → suppressed-field telerecording → frame-grab",
          "How surviving 1950s BBC television looks (e.g. The Quatermass Experiment): suppressed-field film recording keeps 188.5 lines, with spot wobble, film grain and a ~40:1 range."
         ],
         [
          "BBC2 625-line monochrome, 1964",
          "research-based · Image orthicon (B&W) → 625-line B&W → 19in black-and-white tube",
          "625 lines, 5.5 MHz, on a 19in set. The BBC2 camera fleet was not found; an image orthicon is assumed."
         ],
         [
          "UK colour studio, mid-1970s",
          "research-based · EMI 2001 four-tube Plumbicon → 2-inch Quad, high band → 625 PAL (UK System I) → 22in delta-gun set",
          "EMI 2001 four-tube Plumbicon camera, 2-inch Quad, PAL System I, on a 22in delta-gun set with the PAL delay line all British sets had."
         ],
         [
          "UK colour outside broadcast, early 1970s",
          "research-based · 3-tube Plumbicon → 2-inch Quad, high band → 625 PAL (UK System I) → 22in delta-gun set",
          "3-tube Plumbicon OB camera on Quad. OB picture traits are not documented; the camera settings are the studio ones."
         ],
         [
          "1970s drama: 16 mm film exteriors",
          "research-based · flying-spot telecine → 625 PAL (UK System I) → 22in delta-gun set",
          "Film shot on location, through a Rank Cintel flying-spot telecine. Run FilmLook first for the 16 mm stock, then this."
         ],
         [
          "1970s drama: studio video interiors",
          "research-based · EMI 2001 four-tube Plumbicon → 2-inch Quad, high band → 625 PAL (UK System I) → 22in delta-gun set",
          "The other half of the film-and-video mix: EMI 2001 cameras on Quad, as Doctor Who's studio scenes were made."
         ],
         [
          "Colour show on B&W film (with PAL dots)",
          "research-based · EMI 2001 four-tube Plumbicon → 625 PAL (UK System I) → stored-field telerecording → frame-grab",
          "A colour programme kept only as a 16 mm black-and-white telerecording for overseas sales; the unfiltered PAL subcarrier leaves fine dots in coloured areas (the basis of BBC colour recovery). Dots show best on large documents."
         ],
         [
          "News on U-matic, 1983",
          "research-based · 3-tube Plumbicon → U-matic high band → 625 PAL (UK System I) → 20in slot-mask set",
          "Tube ENG camera on high-band U-matic, edited and broadcast; the BBC's colour-under figures set the U-matic colour."
         ],
         [
          "News on Betacam SP, 1989",
          "research-based · 3-CCD broadcast → Betacam SP → 625 PAL (UK System I) → 21in slot-mask set",
          "CCD camera on Betacam SP (component, ~4.5 MHz luma, 1.5 MHz colour)."
         ],
         [
          "Sky on Astra, 1990",
          "research-based · 3-CCD broadcast → 625 PAL (UK System I) → 21in slot-mask set",
          "Analogue PAL over an FM satellite link, so all PAL artefacts remain; sparklies appear on a weak dish. Satellite noise amounts are estimates."
         ],
         [
          "BSB D-MAC, 1990",
          "research-based · 3-CCD broadcast → 625 PAL (UK System I) → 21in slot-mask set",
          "BSB's D-MAC: no subcarrier, so no cross-colour or dot crawl; sharper colour across, half the colour detail down. Bandwidths estimated from the compression ratios."
         ],
         [
          "Teletext page mixed over the picture, 1983",
          "research-based · EMI 2001 four-tube Plumbicon → teletext mix → 625 PAL (UK System I) → 22in slot-mask set",
          "The set's teletext decoder writing a page over the programme ('mix'): 24 rows of 40 characters on the 6 MHz dot clock, rounded characters, eight colours. The font is VideoLook's own; the page text is invented and editable under Overlay."
         ],
         [
          "Teletext subtitles, 1985",
          "research-based · EMI 2001 four-tube Plumbicon → teletext subtitle → 625 PAL (UK System I) → 22in slot-mask set",
          "Page 888-style subtitles: double-height text in black boxes, white first then yellow, cyan and green for other speakers. Text invented and editable under Overlay."
         ]
        ]
       },
       {
        "title": "US broadcast",
        "rows": [
         [
          "US live TV, 1950",
          "from the specifications · Image orthicon (B&W) → 525-line B&W → 17in black-and-white tube",
          "525-line monochrome from an image orthicon (dark halo round highlights), 4.2 MHz, on a 17in set. Live pictures survive mainly as kinescopes."
         ],
         [
          "US kinescope, 1952",
          "research-based · Image orthicon (B&W) → 525-line B&W → kinescope → frame-grab",
          "525/60 filmed at 24 fps; a drifting shutter leaves a brighter band. 16 mm grain and ~40:1 range."
         ],
         [
          "Early RCA colour, 1958",
          "research-based · 3-tube image orthicon colour (Marconi/RCA) → 2-inch Quad, high band → 525 NTSC (US) → 21in delta-gun set",
          "3-tube image orthicon colour camera, NTSC with the 1953 primaries on a delta-gun set; equal-band colour decoding."
         ],
         [
          "US network sitcom, 1975",
          "research-based · 3-tube Plumbicon → 2-inch Quad, high band → 525 NTSC (US) → 19in slot-mask set",
          "Multi-camera Plumbicon studio on Quad, NTSC, on a slot-mask set at 9300 K. Its famous 'video look' is mostly 60-field motion, which a still cannot show."
         ],
         [
          "US local news, 1985",
          "research-based · 3-tube Plumbicon → U-matic high band → 525 NTSC (US) → 19in slot-mask set",
          "Tube ENG camera on U-matic, NTSC over the air."
         ]
        ]
       },
       {
        "title": "France",
        "rows": [
         [
          "French 819-line TV, 1960",
          "from the specifications · Image orthicon (B&W) → 819-line (France, B&W) → 17in black-and-white tube",
          "RTF 819 lines, 10 MHz: the sharpest broadcast standard before HD. Camera type not found; an image orthicon is assumed."
         ],
         [
          "ORTF SECAM colour, 1975",
          "research-based · 3-tube Plumbicon → 625 SECAM (France L) → 22in delta-gun set",
          "SECAM L: FM colour on alternate lines (half the colour detail down, streaks on colour edges). Studios often worked in PAL or component and coded SECAM for transmission."
         ]
        ]
       },
       {
        "title": "Home video",
        "rows": [
         [
          "VHS off-air recording, 1986 (UK)",
          "research-based · 3-tube Plumbicon → VHS (SP) off-air → 625 PAL (UK System I) → frame-grab",
          "A broadcast recorded on a home VHS at SP from an aerial with a faint ghost, as a frame-grab."
         ],
         [
          "VHS third-generation copy",
          "research-based · 3-tube Plumbicon → VHS (LP) off-air → 625 PAL (UK System I) → frame-grab",
          "An off-air LP recording copied twice more: noise, smear and wobble build up with each generation."
         ],
         [
          "VHS off-air recording, 1988 (US)",
          "research-based · 3-tube Plumbicon → VHS (SP) off-air → 525 NTSC (US) → frame-grab",
          "NTSC VHS SP off-air, frame-grab."
         ],
         [
          "Betamax off-air, 1981",
          "research-based · 3-tube Plumbicon → Betamax off-air → 625 PAL (UK System I) → frame-grab",
          "Betamax recording of a broadcast. Betamax figures are estimates."
         ],
         [
          "Tube camcorder, 1984",
          "research-based · Saticon tube camcorder → VHS (SP) → 625 PAL (UK System I) → frame-grab",
          "Single Saticon tube (lag, orange-red flare, soft colour) recording to VHS-C."
         ],
         [
          "Video8 camcorder, 1988",
          "research-based · Single-CCD consumer camcorder → Video8 → 625 PAL (UK System I) → frame-grab",
          "Single-CCD consumer camcorder on Video8 (vertical smear on highlights)."
         ],
         [
          "Hi8 camcorder, 1994",
          "research-based · Single-CCD consumer camcorder → Hi8 → 625 PAL (UK System I) → frame-grab",
          "Sharper Hi8 luma, same narrow colour."
         ],
         [
          "S-VHS camcorder, 1992",
          "research-based · Single-CCD consumer camcorder → S-VHS → 625 PAL (UK System I) → frame-grab",
          "S-VHS: sharp luma, VHS colour."
         ],
         [
          "MiniDV, 2002 (PAL)",
          "research-based · DV 3-CCD → DV / DVCAM (PAL 4:2:0) → Component 625 (studio/digital) → frame-grab",
          "3-CCD DV camcorder: 4:2:0 colour, 8×8 DCT blocks and mosquito noise at 25 Mbit/s, hard highlight clip."
         ],
         [
          "MiniDV, 2002 (NTSC)",
          "research-based · DV 3-CCD → DV (NTSC 4:1:1) → Component 525 (studio/digital) → frame-grab",
          "NTSC DV: 4:1:1 colour (only 180 colour samples across)."
         ],
         [
          "LaserDisc (PAL, CLV crosstalk), 1990",
          "research-based · flying-spot telecine → LaserDisc (CLV) → 625 PAL (UK System I) → 25in Trinitron",
          "A film on a long-play (CLV) LaserDisc: full broadcast detail on an optical disc, but crosstalk from the neighbouring track drifts through as bands of fine noise ('barber poles'). Crosstalk form and amount [EST]."
         ],
         [
          "LaserDisc with laser rot",
          "research-based · flying-spot telecine → LaserDisc with laser rot → 625 PAL (UK System I) → frame-grab",
          "An oxidised disc: sparkling specks, some coloured, some dark, scattered over the picture. Density [EST]."
         ],
         [
          "RCA CED videodisc, worn (1983)",
          "research-based · flying-spot telecine → RCA CED videodisc (worn) → 525 NTSC (US) → 19in slot-mask set",
          "RCA's grooved capacitance disc: 3 MHz of detail, narrow colour, and dust and wear ('video virus') giving dropouts and snow. How the colour was carried isn't confirmed; modelled as a narrow colour band."
         ]
        ]
       },
       {
        "title": "Archive and transfers",
        "rows": [
         [
          "US show on the BBC, 1970",
          "research-based · 3-tube Plumbicon → 2-inch Quad, high band → 525 NTSC (US) → BBC 1967 converter to 625 PAL → 22in delta-gun set",
          "NTSC converted to PAL by the BBC's 1967 field-store converter: picture inset with black borders; with implied motion, one field in five is a double image."
         ],
         [
          "UK show on US TV, 1985",
          "research-based · EMI 2001 four-tube Plumbicon → 625 PAL (UK System I) → digital converter to 525 NTSC → 19in slot-mask set",
          "PAL converted to NTSC by a digital four-field converter."
         ],
         [
          "Optical standards conversion, 1962",
          "research-based · 3-tube image orthicon colour (Marconi/RCA) → 525 NTSC (US) → optical conversion to 625 PAL → frame-grab",
          "A camera pointed at a monitor: the source scan lines beat against the new ones."
         ],
         [
          "NTSC tape on a UK VCR (PAL-60)",
          "research-based · 3-tube Plumbicon → VHS (SP) → 525 NTSC (US) → played as PAL-60 → 21in slot-mask set",
          "An American VHS played on a UK machine that outputs PAL-60: correct colour, but only 480 lines, so the line structure is coarser."
         ],
         [
          "NTSC 4.43 on a PAL-only set",
          "research-based · 3-tube Plumbicon → VHS (SP) → 525 NTSC (US) → played as NTSC 4.43 → frame-grab",
          "NTSC colour on the PAL subcarrier has no V switch, so a PAL set's delay line cancels half the colour: reds turn dark."
         ],
         [
          "SECAM tape on a PAL-only set",
          "research-based · 3-tube Plumbicon → 625 SECAM (France L) → SECAM on a PAL-only set → 21in slot-mask set",
          "No SECAM decoder: black and white, with the FM subcarrier showing as a dot pattern even on greys."
         ],
         [
          "US film telecine with 3:2 pulldown",
          "research-based · flying-spot telecine → 525 NTSC (US) → frame-grab",
          "Film on NTSC: two frames in five mix two film frames. Set Implied motion to see the combing."
         ],
         [
          "Photo of the TV screen, 1978",
          "research-based · EMI 2001 four-tube Plumbicon → 2-inch Quad, high band → 625 PAL (UK System I) → 22in slot-mask set, photographed",
          "A UK colour broadcast photographed off a slot-mask set at 1/125 s: the exposure catches only part of the scan, so a band is brighter."
         ]
        ]
       },
       {
        "title": "Long-distance reception",
        "rows": [
         [
          "Summer lift: Dutch TV on a UK set, 1983",
          "research-based · 3-tube Plumbicon → 625 PAL (Europe B/G/H) → co-channel interference → received on a UK set (System I PAL) → 22in slot-mask set",
          "Nederland 1 or 2 (Goes, Lopik) across the North Sea under a summer high. Dutch System G PAL: full colour, no sound on a UK set, and the 5.5 MHz Dutch sound carrier leaves fine patterning. A weak co-channel station floats underneath, striped by the carrier offset. The mechanisms are documented; the amounts (signal level, interference) are yours to set. For a real second picture, name a layer 'second picture'."
         ],
         [
          "Belgian RTBF on a UK set, 1984",
          "research-based · 3-tube Plumbicon → 625 PAL (Europe B/G/H) → received on a UK set (System I PAL) → 22in slot-mask set",
          "RTBF 1 or Télé 2 on a good lift: Belgian PAL (System H on UHF, 5.5 MHz sound), so colour but silence on a UK set, with faint sound-carrier patterning. Signal level [EST]."
         ],
         [
          "French TV (TF1, Antenne 2) on a UK set, 1983",
          "research-based · 3-tube Plumbicon → 625 SECAM (France L) → received on a UK set (System I PAL) → 22in slot-mask set",
          "France's System L puts the picture on the carrier the other way up (positive modulation), so a UK set shows a negative; its SECAM colour is lost; and the set can't find the French sync, so the picture tears sideways and rolls, with the blanking showing as white bars. Built from the ITU levels and receiver behaviour; no off-screen photos checked. New noise gives another moment; Vertical hold 'rolling' and Roll position move the bar."
         ],
         [
          "Canal+ without a decoder, 1984",
          "research-based · 3-CCD broadcast → 625 SECAM (France L) → Discret 11 scrambling → 22in slot-mask set",
          "Canal+ (from 4 Nov 1984) scrambled with Discret 11: every line delayed by 0, 0.9 or 1.8 µs at random, black filling the gap. Shown on a French SECAM set. The delays are documented; the pseudo-random sequence here is VideoLook's own."
         ],
         [
          "Sporadic-E on Band I, DXer's portable, 1978",
          "research-based · 3-tube Plumbicon → 625 PAL (Europe B/G/H) → co-channel interference → 12in black-and-white tube",
          "A distant continental Band I station by Sporadic-E (May to September, 500-1,400 miles) on a black-and-white portable: snow, a long echo, and a second station on the same channel sliding across. Mechanisms from Bunney (1981); all amounts [EST]."
         ],
         [
          "Overloaded set near a transmitter (lockout)",
          "research-based · EMI 2001 four-tube Plumbicon → 625 PAL (UK System I) → overloaded set → 22in slot-mask set",
          "Too much signal: the set's IF stage overloads and the sync tips are crushed below the picture: 'lockout, i.e. negative picture and buzz' (Television, July 1976). One source; the overload curve is [EST]."
         ]
        ]
       },
       {
        "title": "USSR and Eastern Europe",
        "rows": [
         [
          "Moscow 343-line, 1938",
          "from the specifications · Emitron / iconoscope → 343-line (Moscow 1938) → 12in black-and-white tube",
          "343 lines at 25 frames on RCA equipment (from 1938; dates conflict). Bandwidth 3.29 MHz and negative modulation are RCA's figures from a single source; an iconoscope camera is assumed."
         ],
         [
          "Soviet 625-line on a KVN-49 with its water lens, 1950",
          "research-based · Emitron / iconoscope → 625-line B&W (USSR, 6 MHz) → 7in black-and-white tube through its lens",
          "The Soviet Union's own 625-line standard (the one Europe adopted), 6 MHz, on the KVN-49: a 140 x 105 mm picture on an 18 cm round tube, seen through the add-on lens filled with water or glycerine (about 4x). The lens's distortion, fringing and reflection are [EST]; the studio camera is not researched (an iconoscope is assumed)."
         ],
         [
          "Soviet colour on a Rubin set, late 1970s",
          "research-based · 3-tube Plumbicon → 625 SECAM (USSR/East D/K) → 24in delta-gun set",
          "SECAM on System D/K from 1 Oct 1967: the same colour coding as France but the ordinary negative modulation, so interference makes dark spots. Soviet tube phosphors per GOST 26799-85 are the EBU set. Camera assumed."
         ],
         [
          "East German SECAM colour, 1975",
          "research-based · 3-tube Plumbicon → 625 SECAM (East Germany B/G) → 22in delta-gun set",
          "DFF colour from 1969: SECAM on System B/G (5 MHz), until the switch to PAL at the end of 1991. East German set phosphors not found; EBU assumed."
         ]
        ]
       },
       {
        "title": "Japan",
        "rows": [
         [
          "Japanese NTSC on a 9300 K set, 1985",
          "research-based · 3-tube Plumbicon → 525 NTSC (Japan, no set-up) → 21in Trinitron",
          "NTSC-J: black sits at blanking (no 7.5% set-up), and receivers were set to 9300 K + 27 MPCD, a cool, slightly green white (x 0.281, y 0.311). Receiver phosphors from a 1979 Matsushita patent. Many real sets measured nearer 8500-8800 K."
         ],
         [
          "Hi-Vision (MUSE) analogue HD, 1991",
          "research-based · 1125-line Hi-Vision MUSE → 36in Trinitron",
          "NHK's 1125-line analogue HD by satellite (1989-2007). Still pictures keep ~598 lines of detail, but anything moving drops to about a quarter: set Implied motion and tick 'Only the selection moves' to see it (camera pans stay sharp). No camera stage: HD cameras aren't modelled."
         ],
         [
          "Sony CV-2000 home video, 1966",
          "research-based · Vidicon → Sony CV-2000 home VTR (B&W, skip-field) → 525-line B&W → 11in black-and-white tube",
          "One of the first home video recorders: half-inch tape, black and white, recording only one field and showing it twice (skip-field), about 220 lines. With a vidicon camera."
         ],
         [
          "Sony Portapak video art, 1970",
          "research-based · Portapak vidicon → EIAJ-1 Portapak (1/2 in reel, B&W) → 625-line B&W → 12in black-and-white tube",
          "EIAJ-1 half-inch reel recorder and vidicon camera (needed about 50 foot-candles): black and white, laggy, noisy, with 'flagging' at the top on replay. European (625) version."
         ]
        ]
       },
       {
        "title": "Early television",
        "rows": [
         [
          "Baird 30-line on a Televisor, 1933",
          "research-based · 30-line Baird (1929-35) → Televisor",
          "The BBC's 30-line service (to 1935): 30 vertical lines, 12.5 pictures a second, a tall 3:7 picture sent on a medium-wave channel (~10 kHz), seen as an orange neon glow through a spinning disc, 'about the size of a postage stamp'. Off-air recordings survive at tvdawn.com for comparison."
         ],
         [
          "Baird 240-line intermediate film, 1936",
          "from the specifications · Intermediate film → 240-line Baird (1936-37) → 12in black-and-white tube",
          "Alexandra Palace, Nov 1936-Feb 1937, alternating with EMI's 405 lines: shot on film, developed in about a minute and scanned wet. 240 lines at 25 frames; bandwidth and picture shape not found (4:3 and equal detail assumed). No pictures survive."
         ],
         [
          "Berlin 441-line, 1938",
          "from the specifications · Emitron / iconoscope → 441-line (Germany 1937-44) → 12in black-and-white tube",
          "Fernsehsender Paul Nipkow: 441 lines interlaced (383 active), 2 MHz, positive modulation, a nearly square 1.15:1 picture (single source). Iconoscope camera."
         ],
         [
          "NBC 441-line, 1940",
          "from the specifications · Emitron / iconoscope → 441-line (US 1939-41) → 12in black-and-white tube",
          "The pre-war American standard (1939-41): 441 lines, 60 fields, 2.8 MHz, negative modulation (single source). RCA iconoscope camera."
         ],
         [
          "CBS field-sequential colour, 1951",
          "from the specifications · 3-tube image orthicon colour (Marconi/RCA) → 405-line CBS field-sequential colour (1951) → 12in colour-wheel set",
          "Broadcast June-October 1951: 405 lines, 144 fields a second, each field one colour, put back together by a spinning colour wheel in front of a black-and-white tube. About half the horizontal detail of ordinary 525-line. Set Implied motion to see colours split apart on movement. Filter colours [EST]."
         ],
         [
          "Belgian 819-line, 1955",
          "from the specifications · Image orthicon (B&W) → 819-line (Belgium F, B&W) → 17in black-and-white tube",
          "Belgium's 819-line System F (1953-68) squeezed the French line count into 7 MHz channels: ~5 MHz of video (sources say 5 or 5.5), so far less horizontal detail than French 819."
         ]
        ]
       },
       {
        "title": "Space, surveillance and toys",
        "rows": [
         [
          "Apollo 11 moonwalk as broadcast, 1969",
          "research-based · Apollo lunar camera → 320-line Apollo lunar camera → optical conversion to 525-line B&W → 19in black-and-white tube",
          "The lunar camera sent 320 lines at 10 frames a second; on Earth an RCA TK-22 camera re-shot a 10-inch monitor to make NTSC, losing contrast and detail, and the monitor's persistence left moving figures trailing ghosts (needs Implied motion). Honeysuckle Creek settings; set Converter contrast up for Goldstone's over-contrasty picture."
         ],
         [
          "Fisher-Price Pixelvision, 1988",
          "research-based · Fisher-Price PXL-2000 → PXL-2000 audio cassette (8 grey levels) → 525-line B&W → 13in slot-mask set",
          "The PXL-2000 toy camcorder: a 120 x 90 CCD recorded on audio cassette at 9x speed, black and white with only a few grey levels (one source says about 8), shown small in the middle of the TV. Inset size and noise [EST]."
         ],
         [
          "Time-lapse CCTV, 1994",
          "research-based · Black-and-white CCTV camera → date stamp → Time-lapse CCTV VHS (24 h mode, B&W) → 625-line B&W → frame-grab",
          "A black-and-white CCTV camera on a time-lapse VHS in 24-hour mode (5 fields a second, 300 lines), date and time burned in, replayed as a single field. Recorder figures from a period manual; the rest [EST]. Edit the stamp under Overlay."
         ],
         [
          "Amateur slow-scan TV on a radar tube, 1958",
          "research-based · 120-line slow-scan (1958) → 7in P7 radar tube",
          "Copthorne Macdonald's 1958 slow-scan TV: 120 lines, 8 seconds a picture, sent as audio over short-wave, shown on a P7 radar tube whose blue flash fades to a yellow-green afterglow lasting about 10 s, so the top of the picture has already faded as the bottom is written. Afterglow colours [EST]."
         ]
        ]
       },
       {
        "title": "South America",
        "rows": [
         [
          "Brazilian PAL-M, 1985",
          "research-based · 3-tube Plumbicon → 525 PAL-M (Brazil) → 20in slot-mask set",
          "Brazil's PAL-M (colour from 1972): American 525/60 scanning with PAL colour on its own 3.576 MHz subcarrier, so no NTSC hue errors but 4.2 MHz of detail and the 7.5% set-up. Set phosphors assumed."
         ],
         [
          "Argentine PAL-N, 1985",
          "research-based · 3-tube Plumbicon → 625 PAL-N (Argentina) → 20in slot-mask set",
          "Argentina's N/PAL: European 625/50 in American 6 MHz channels, 4.2 MHz of video and a 3.58 MHz PAL subcarrier nearer the luma, so softer and with more cross-colour than European PAL. Black at blanking (no set-up)."
         ]
        ]
       },
       {
        "title": "Community TV and video art",
        "rows": [
         [
          "Swindon Viewpoint, 1974 (black-and-white cable)",
          "research-based · Portapak vidicon → EIAJ-1 Portapak (1/2 in reel, B&W) → 625-line B&W → 22in black-and-white tube",
          "Britain's community cable station (from Sept 1973, EMI-funded, on the Radio Rentals relay network). Until 1977 it was black and white: Sony Portapaks and 1-inch Sony recorders, low light on location, copy-edited with a glitch at each edit, then carried cleanly by cable. The half-inch Portapak format stands in for both machines; the haloes come from the set's sharpness control here, which is [EST]."
         ],
         [
          "Swindon Viewpoint, 1978 (colour U-matic)",
          "research-based · Saticon tube camcorder → U-matic low band → 625 PAL (UK System I) → 22in slot-mask set",
          "From 1977 the station moved to colour: U-matic recorders and single-tube Sony cameras, and by its own account 'picture quality, or at least resolution, went down somewhat with the move to colour'. Single-tube camera model stands in [EST]."
         ],
         [
          "Re-shot off a monitor, again and again",
          "research-based · 3-tube Plumbicon → 625 PAL (UK System I) → optical conversion to 625 PAL → 22in slot-mask set",
          "After David Hall's 'This Is A Television Receiver' (BBC, 1976), where a newsreader was re-shot off a monitor, each copy from the last, 'until there is a complete degeneration of both sound and image'. Set Conversion generations under Transfer (1-12). The monitor-and-camera model is the optical converter's [EST]."
         ],
         [
          "Videotape to cinema film, 1964 (Electronovision-style)",
          "research-based · Image orthicon (B&W) → 2-inch Quad, high band → 525-line B&W → kinescope → frame-grab",
          "Before 200 Motels, Electronovision shot plays and concerts on videotape and moved them to film by kinescope for cinemas (Hamlet, The T.A.M.I. Show, 1964). A US colour-era camera on Quad, filmed off a monitor at 24 frames."
         ]
        ]
       },
       {
        "title": "Photographed off the screen",
        "rows": [
         [
          "Tele-snap: ident, grey and ghostly (1960s)",
          "research-based · Vidicon → 405-line (UK, B&W) → 19in black-and-white tube, photographed on black-and-white film",
          "A station symbol or caption photographed off a 405-line set on black-and-white film: whites come out a soft mid-grey with a faint glow, as in some 1960s off-screen stills. Matched to their measured tones (whites about 40-60% of full white, edges spread over about 1% of the width, about 190 lines down the screen, which is one field). Why the whites are grey isn't established (a thin negative, a dark print or a fade would all do it): Print exposure sets it, and about -2.6 gives the darkest ones. Works best on white graphics on black."
         ],
         [
          "Tele-snap: ident, burnt-out whites and grey blacks (1960s)",
          "research-based · Vidicon → 405-line (UK, B&W) → 19in black-and-white tube, photographed on black-and-white film",
          "The opposite print: whites burnt out and swollen so the scan lines close up inside them, blacks a dusty dark grey. On a set with mean-level AGC and no DC restorer a mostly black caption is turned up and lifted ('a screen that was not black but mid-grey'), and the over-driven spot blooms. Both set faults are documented for 405-line sets; how much of each a given photograph shows is not."
         ],
         [
          "Tele-snap: caption with a grey band above it (1968)",
          "research-based · Vidicon → 405-line (UK, B&W) → 19in black-and-white tube, photographed on black-and-white film",
          "A white caption box on black, with the screen above it turned grey and the screen below it black, the tube's rounded edge and dark surround in shot. Modelled as the set's black level dropping at once when the white box arrives and creeping back up over the next field, so the lettering and the screen below stay black. That fits one 1968 off-screen photograph, but the cause isn't established (it could equally lie at the station). Black-level tilt sets it."
         ],
         [
          "Tele-snap: in-vision announcer (1967)",
          "research-based · Image orthicon (B&W) → 405-line (UK, B&W) → 19in black-and-white tube, photographed on black-and-white film",
          "A studio announcer photographed off a 405-line set, the whole tube face in shot: soft, flat and grey, nothing fully black or white. Image orthicon studio camera assumed. Matched to the tones of two 1967 off-screen stills (blacks about 10%, whites about 55-75%)."
         ],
         [
          "Tele-snap: fringe reception, hard print (1967)",
          "research-based · Vidicon → 405-line (UK, B&W) → 17in black-and-white tube, photographed on black-and-white film",
          "A distant transmitter 'just about received in good weather' and photographed off the screen (Transdiffusion's description of late-1960s stills of ATV Midlands taken on the Wirral), printed hard: blacks solid, whites clean, snow hidden in the blacks and showing as ragged edges. Signal level and ghost [EST]."
         ],
         [
          "405-line off-air on an early video recorder (mid-1960s)",
          "research-based · Image orthicon (B&W) → Sony CV-2000 home VTR (B&W, skip-field) off-air → 405-line (UK, B&W) → frame-grab",
          "The harsh look of some surviving 405-line clips: hard contrast, outlines round the edges, ragged verticals and coarse lines. Built as a studio picture recorded off-air on an early helical-scan recorder and frame-grabbed. Philips's EL3400 (1964) recorded 405 lines, but its figures weren't found, so the Sony CV-2000 model (one field shown twice) stands in. Whether a given clip's harshness comes from such a machine or from later copying and sharpening isn't established."
         ]
        ]
       },
       {
        "title": "Subtitles",
        "rows": [
         [
          "Foreign film on BBC2, late 1980s",
          "research-based · flying-spot telecine → subtitles: BBC slab serif (TKST-style), black edge → 625 PAL (UK System I) → 22in slot-mask set",
          "A subtitled film through a flying-spot telecine, with the BBC's slab-serif subtitles (TKST, 'based at many removes on Rockwell Light', 1975-77) added at the studio with a black edge. TKST isn't available, so Rockwell stands in. Run FilmLook first for the film stock. Edit the text under Overlay."
         ],
         [
          "BBC subtitles on a grey label",
          "research-based · flying-spot telecine → subtitles: BBC slab serif on a grey label → 625 PAL (UK System I) → 22in slot-mask set",
          "The BBC's later fix for edging problems: the picture darkened and its colour killed in a rectangle behind the text (the designer's own account; single source)."
         ],
         [
          "Arthouse print with laser subtitles, 1990s",
          "research-based · flying-spot telecine → subtitles: Cinema print, laser-etched (1988 on) → 625 PAL (UK System I) → frame-grab",
          "Subtitles burned into the release print by laser (from 1988): clear white letters with a thin dark halo, then the print on a telecine. Use 'Cinema print, chemically etched' for older prints with ragged letters."
         ],
         [
          "Subtitled VHS release, 1990",
          "research-based · flying-spot telecine → subtitles: VHS / LaserDisc release (Univers-style) → VHS (SP) → 625 PAL (UK System I) → frame-grab",
          "A subtitled film on a rental VHS: Univers-style subtitles with a black edge on the master, softened by the tape. The edge treatment is [EST]."
         ],
         [
          "US closed captions, 1990",
          "research-based · 3-tube Plumbicon → subtitles: US closed captions (Line 21) → 525 NTSC (US) → 19in slot-mask set",
          "Line 21 captions drawn by the set's decoder: white capitals on black cells, 32 columns. The decoder's own font isn't documented, so VideoLook's dot font stands in."
         ]
        ]
       }
      ]
     },
     {
      "label": "subtitle styles",
      "type": "reference",
      "data": [
       {
        "title": "styles",
        "intro": "Chosen under Overlay › Subtitles. Each is burned in where it historically happened; font, italic, size, colour, edge and stage can all be changed.",
        "rows": [
         [
          "Arial italic, soft shadow",
          "at the studio / on the master · Arial-ItalicMT, ArialMT",
          "Soft shadow."
         ],
         [
          "BBC slab serif (TKST-style), black edge",
          "at the studio / on the master · Rockwell-Light, Rockwell-Regular, Rockwell",
          "Black edge."
         ],
         [
          "BBC slab serif on a grey label",
          "at the studio / on the master · Rockwell-Light, Rockwell-Regular, Rockwell",
          "Grey label: picture darkened and colour removed behind the text."
         ],
         [
          "Early TV: white on a black box",
          "at the studio / on the master · Helvetica, ArialMT",
          "Black box."
         ],
         [
          "Cinema print, chemically etched",
          "on the film print · Helvetica, ArialMT",
          "Ragged etched letters."
         ],
         [
          "Cinema print, laser-etched (1988 on)",
          "on the film print · Helvetica, ArialMT",
          "Thin dark laser halo."
         ],
         [
          "VHS / LaserDisc release (Univers-style)",
          "at the studio / on the master · UniversLTStd-Light, Univers-Light, Univers",
          "Black edge."
         ],
         [
          "Dutch TV (Helvetica Neue condensed)",
          "at the studio / on the master · HelveticaNeueLTStd-MdCn, HelveticaNeue-CondensedBold, HelveticaNeue-Medium",
          "Black edge."
         ],
         [
          "Channel 4 (Gill Sans, drop shadow)",
          "at the studio / on the master · GillSans, GillSans-Light, Helvetica",
          "Drop shadow."
         ],
         [
          "DVD subpicture (Tahoma-like)",
          "at the studio / on the master · Tahoma, Verdana, ArialMT",
          "Hard four-colour bitmap edge."
         ],
         [
          "US closed captions (Line 21)",
          "by the set · VideoLook dot font",
          "Black character cells."
         ],
         [
          "Custom",
          "at the studio / on the master · ArialMT",
          "Black edge."
         ]
        ]
       }
      ]
     },
     {
      "label": "rebuilding",
      "type": "notes",
      "data": [
       "Source and research: the plugin folder, plus VideoLook-References/_research in the APA project (standards reports, BBC documents and notes).",
       "The engine is the vl_*.js files; test harness and standards tests are kept with the build notes."
      ]
     }
    ],
})

ITEMS.append({'slug': 'printlook',
 'name': 'PrintLook',
 'kind': 'UXP panel',
 'app': 'Photoshop',
 'author': 'Claude',
 'status': 'Working',
 'folder': 'PrintLook-Photoshop-Plugin',
 'tagline': 'Prints your layers: each colour layer is a plate with one ink, put through letterpress, '
            'lithography, screenprint, gravure, stencil, duplicator or copier as it was done from the 1850s '
            'to the 1980s.',
 'blurb': 'The companion to FilmLook and VideoLook for print. It does not lay a texture over the artwork: it '
          'treats each colour layer as a printing plate and prints them one after another on a sheet of '
          'paper. For every plate it works out what the plate carries (line work, or tone broken into '
          'halftone dots, crayon grain, stipple, gravure cells or collotype grain), where it lands '
          '(register), the mark the process makes (how far the ink spreads, the rounded corners, the darker '
          'rim letterpress squeezes out, the weave a screen leaves), what goes wrong in the solids (salt, '
          'mottle, uneven letters, wood grain, hollow photocopier blacks) and how that ink sits over the '
          'paper and the inks already down. Every size is a real size on the paper, worked out from the '
          "document's resolution. Processes, screen rulings, angles, palettes and formats come from period "
          'trade manuals, standards and museum records, gathered in a research report; where a number is an '
          'estimate the control is marked est., and each look says what it rests on. 165 looks cover Britain '
          'decade by decade, Ireland, the United States, France, Germany, Norway, the USSR, Japan and India, '
          'plus the generic processes and the office machines. The paper is optional: use a built-in stock, '
          'your own paper texture layer, or none.',
 'facts': {'version': '1.0.0',
           'requires': 'Photoshop 24.2+, RGB, 8 or 16-bit',
           'plugin id': 'com.simonmorse.printlook',
           'looks': '165 (25 sourced, 119 partly, 21 inferred)'},
 'quickstart': ['Install from Terminal, not by double-clicking the .ccx (Creative Cloud says "Compatible App '
                'Required" for unsigned plugins): run Adobe\'s `UnifiedPluginInstallerAgent --install` on '
                '`CCX Installers/PrintLook.ccx`, then restart Photoshop. The full command is in '
                'PrintLook-References/_notes/PrintLook_build_notes.md.',
                'Build the artwork with **one layer per colour**: all the red type on one layer, all the '
                'blue on another. A white bottom layer is taken as the sheet.',
                'Open **Plugins › PrintLook**, pick a group under **Looks**, then a look. The note under the '
                'list gives its dates, what it is and what it rests on.',
                'Draw a marquee and press **Preview selection** to print just that area. The preview is '
                'exactly what the full render will give there.',
                'Press **Render**. The printed sheet goes on a new *PrintLook ·* layer at the top; the '
                'artwork is untouched.',
                'Change anything below and press **Re-render last**. **New impression** gives a different '
                'misregister, grain and set of faults. Save combinations under **My presets**.'],
 'controls': [{'title': 'Top of panel',
               'rows': [['Looks',
                         '165 looks in 11 groups',
                         'Process and era, Britain, Ireland, United States, France, Germany, Norway, USSR, '
                         'Japan, India, Street and office. Choosing a look sets the process and everything '
                         'below it. Your paper choice, Detail scale and texture settings are kept.'],
                        ['Source',
                         'All visible layers / Selected layers / Whole image',
                         'Layers are printed bottom first, each as a plate. Whole image treats the document '
                         'as one picture and separates it as set under Picture layers.'],
                        ['Output',
                         'One printed layer / Each printing on its own layer',
                         'Separate layers give a paper layer and one Multiply layer per plate, to move or '
                         'mask by hand. That stack is an approximation: opaque inks and the light scattered '
                         'in the paper are lost.'],
                        ['Strength', '0 – 100', 'Opacity of the result layer.'],
                        ['New impression',
                         '',
                         'A new random seed: different misregister, grain, salt and faults.']]},
              {'title': 'Process',
               'rows': [['Process',
                         '21 processes',
                         'Letterpress: wood letter poster; Letterpress: jobbing (platen); Letterpress: fine '
                         '(art paper); Letterpress: rotary newspaper; Relief block: lino or woodcut; Aniline '
                         '(flexographic) on bags; Lithography: drawn on stone or zinc; Offset lithography; '
                         'Small offset (duplicator, instant print); Screenprint: knife-cut film stencil; '
                         'Screenprint: glue, tusche or paper stencil; Stencil and brush (pochoir, ROSTA, '
                         'TASS); Rotogravure; Collotype; Woodblock, water-based (Japan); Stencil duplicator '
                         '(Gestetner, Roneo, mimeograph); Risograph (1980s); Spirit duplicator (Banda, '
                         'Ditto); Hectograph (gelatin pad); Xerography, early (914 era); Photocopier, '
                         '1970s-80s. Choosing one resets Ink on paper, Faults and Tone to that process.'],
                        ['Detail scale',
                         '0.25 – 4',
                         'Enlarges or shrinks every dot, edge and fault together. 2 draws everything twice '
                         'as large: the way to show a fine screen in a low-resolution document, or to '
                         'exaggerate for effect.']]},
              {'title': 'Plates and inks',
               'intro': 'A layer in one flat colour is line work in that colour. A flat layer at part '
                        'opacity prints as a tint. Anything else is a picture. A layer (or group) set to '
                        'Multiply overprints what is under it.',
               'rows': [['Flat layers print in',
                         'Their own colour / Nearest ink in the set',
                         'Their own colour mixes an ink to match the layer. An ink set prints each layer in '
                         'the nearest ink a printer of that kind kept: a red and a dark blue for a 1950s '
                         "bill, the chromolithographer's stones, Day-Glo."],
                        ['Ink set',
                         '59 sets',
                         'Period palettes. Colours are estimates from the pigment named, except a few read '
                         'from scans.'],
                        ['Picture layers',
                         'One ink / Duotone / Three-colour / Four-colour / Spot colours / Tints and black '
                         'line',
                         'How a photograph or painting is separated. Spot colours cuts it into flat colours '
                         'as a poster artist would; Tints and black line is the comic-book system of 25, 50 '
                         'and 100% tints.'],
                        ['Overlaps',
                         'Knock out, black overprints / All knock out / All overprint',
                         'Colours underneath are cut away where a solid layer covers them, with a small '
                         '**Trap** overlap so no white shows; tints overprint.'],
                        ['Printing order', 'As layered / Lightest first', ''],
                        ['Ink opacity',
                         'own, or 0 – 1',
                         'Letterpress and litho inks are nearly transparent; screen paint covers.'],
                        ['Screen angles',
                         '6 sets',
                         'Britain 1949, US 1975-88, three-colour 1949, c.1912, comic tints 30° apart, all at '
                         '45°.'],
                        ['Read layers',
                         'As seen / Directly',
                         'As seen shows each layer on its own and reads it, so masks, effects, type and '
                         'shapes come out as they look. Directly is faster but ignores masks and effects.']]},
              {'title': 'Ink on paper',
               'rows': [['Ink amount, Impression',
                         '',
                         'More ink and more squeeze spread the mark and fill the solids; less gives a grey, '
                         'salty print.'],
                        ['Spread, Rounding, Edge softness',
                         'µm',
                         "How far the ink goes past the plate's edge, how round corners and fine detail get, "
                         "and how sharp the ink's edge is."],
                        ['Ragged edge',
                         'amount, size',
                         'The edge wandering: paper fibres, a glue stencil, worn type.'],
                        ['Squeezed rim, Starved middle',
                         '',
                         'Letterpress and flexo push ink to the edge of every mark, leaving a darker outline '
                         'and a paler centre.'],
                        ['Soak into paper, Oil halo, Dent',
                         '',
                         'Ink spreading into absorbent paper, the oil stain round old letterpress, and the '
                         'impression in the sheet.']]},
              {'title': 'Faults',
               'rows': [['Uneven solids, Salty solids, Speckle',
                         '',
                         'Cloudy inking, white specks where ink misses the hollows of rough paper, and the '
                         "paper's surface showing through the film."],
                        ['Uneven letters, Worn type',
                         '',
                         'Each letter inked a little differently; nicks and rounded corners.'],
                        ['Wood grain / brush',
                         'amount, direction',
                         'Grain and cracks in wood letter; brush streaks for stencil work.'],
                        ['Screen mesh marks',
                         'amount, pitch',
                         'The weave of the screen left in the paint and along edges. Needs about 350 ppi to '
                         'show.'],
                        ['Hollow solids', '', 'Early photocopiers developed only the edges of large blacks.'],
                        ['Spatter, Slur, Hickeys, Stray specks, Scum, Banding', '', 'Press faults.'],
                        ['Ink texture layer',
                         '0 – 1.5',
                         'Strength of your own texture: a layer whose name starts with **ink texture**. Each '
                         'letter takes a different piece of it, so a repeating texture does not show its '
                         'repeat.']]},
              {'title': 'Tone',
               'rows': [['Tone is carried by',
                         '10 kinds',
                         'Halftone dots, parallel lines, crayon on grained stone, hand stipple, spatter, '
                         'gravure cells, collotype grain, grain screen, line only, continuous.'],
                        ['Screen, angle, dot shape',
                         '20 – 300 lines per inch',
                         'Newspapers 55-65, programmes 85-133, art paper 133-150.'],
                        ['Highlights drop out, Shadows fill in',
                         '',
                         'The smallest dot the plate holds and the tone above which dots join into solid.'],
                        ["Platemaker's skill",
                         '0 – 1',
                         'How well the plate allowed for dots spreading. At 0 pictures print dark and filled '
                         'in.']]},
              {'title': 'Register',
               'rows': [['Misregister, Paper stretch, Twist',
                         'mm, mm per metre, degrees',
                         'How far each printing lands from the first.']]},
              {'title': 'Paper',
               'rows': [['Paper',
                         'Stock / My layer named "paper" / Bottom layer\'s colour / None',
                         'With your own layer the inks are laid over it. With None the inks alone go on a '
                         'Multiply layer and the artwork layers are hidden, so whatever paper you keep '
                         'underneath shows through.'],
                        ['Stock',
                         '35 stocks',
                         'Art paper to newsprint, poster papers, coloured bills, card, washi and more. '
                         'Colours are estimates.'],
                        ['Surface roughness, Texture, Fibres, Flecks, Show-through',
                         '',
                         'Roughness also shapes the ink (salt and speckle), even when no paper is drawn.']]},
              {'title': 'Age',
               'rows': [['Yellowing, Browned edges, Foxing, Faded inks, Folds, Rubbing, Dirt, Set-off, Oil '
                         'staining',
                         '',
                         'All 0 for a fresh print. Faded inks follows the pigment: fugitive lakes and dyes '
                         'go first.']]}],
 'workflow': [{'title': 'A two-colour bill',
               'text': 'Set the red lines on one layer and the blue on another, pick a Britain look such as '
                       'a 1950s variety bill, and render. With *Nearest ink in the set* the layers are '
                       "printed in the bill printer's red and blue whatever colours you used; switch to "
                       '*Their own colour* to keep yours.'},
              {'title': 'Your own paper textures',
               'text': 'Put a RetroSupply or True Grit paper on a layer named *paper* (anything starting '
                       'with the word works: *Paper texture 04*) and set Paper to **My layer named '
                       '"paper"**. Or set Paper to **None** and keep your paper layers underneath: the print '
                       'goes on a Multiply layer.'},
              {'title': 'Wood-type textures',
               'text': 'Place a wood-type texture on a layer named *ink texture* and leave it visible. Each '
                       'letter is given its own piece of the texture. Dark marks remove ink; use **Ink '
                       'texture reads** if yours is the other way round.'},
              {'title': 'Photographs and illustrations',
               'text': 'Put the picture on its own layer and choose how it is separated under **Picture '
                       'layers**. For a photo in a letterpress programme, One ink and an 85 to 120-line '
                       'screen; for a poster illustration, Flat spot colours.'},
              {'title': 'Evidence',
               'text': 'Each look is graded. *Sourced*: process, colours and format come from a cited record '
                       'or period text. *Partly sourced*: the process is documented, colours or paper are '
                       'estimates. *Inferred*: built from the process alone. The research report and notes '
                       'are in PrintLook-References in the APA project.'}],
 'gotchas': ['One layer per colour. A layer with two flat colours on it is treated as a picture and '
             'screened.',
             "Scroll the panel with the pointer over the labels, not over a dropdown: Photoshop's panels let "
             "the scroll wheel change a dropdown's value.",
             "Set the document's real resolution first. At 72 ppi a pixel is a third of a millimetre of "
             'paper and little of the process can show; the status line warns when this is the case.',
             'Fine detail needs pixels: a screen finer than about 125 lines per inch prints as smooth tint '
             'at 300 ppi, and mesh marks need about 350 ppi. Raise the resolution or the Detail scale.',
             'A layer clipped to another reads as empty on its own: merge the pair first. Adjustment layers '
             'are ignored.',
             'With Paper set to None, Render hides the artwork layers under the Multiply result. They are '
             'shown again, read and re-hidden on the next render; show them yourself if you delete the '
             'result.',
             'Large posters take time and memory: A2 at 300 ppi with three colours is roughly 35 to 60 '
             'seconds. Use Preview selection while adjusting.',
             'One process per look. A sheet that mixed two (letterpress type on a lithographed picture) '
             'needs two renders.',
             'Ink and paper colours are estimates; nothing is colour-measured. 32-bit documents are not '
             'supported.'],
 'sections': [{'label': 'looks',
               'type': 'reference',
               'data': [{'title': 'Process and era',
                         'rows': [['Wood engraving from electros - white-line tone',
                                   '1842-1890s · inferred · Letterpress: jobbing (platen)',
                                   'Before halftone, pictures in the illustrated press were cut as white '
                                   'lines on boxwood and printed from electrotypes (Wikipedia, Wood '
                                   'engraving, as cited in the report). A stand-in: the engine rules '
                                   'straight parallel lines, where engravers followed the form and joined '
                                   'small blocks. Tint-line frequency was not found, so 70 lines per inch is '
                                   'an estimate, as are the squash and the paper.'],
                                  ['Jobbing bill from a small printer - worn wood letter',
                                   '1850s-1960s · inferred · Letterpress: wood letter poster',
                                   'Worn wood letter and mixed founts on blanket packing, with reduced ink '
                                   "on paper 'of an inferior quality, and damped' (Southward 1915): heavy "
                                   'squash, uneven letters, slight slur, loose register. The fault list is '
                                   "the researchers' synthesis from Southward 1915 and Whetton 1946, not a "
                                   'period ranking, and every amount here is an estimate. Black, with red or '
                                   'blue as the occasional colour, follows the Hexham jobbing archive of '
                                   '1885-1904 (Byrom 2023).'],
                                  ['Wood-letter poster, two workings - poster house',
                                   'c.1860-1960s · partly sourced · Letterpress: wood letter poster',
                                   'Wood letter and large metal type from a house with its own poster room '
                                   'and cylinder machine (Whetton 1946), on soft packing (Southward 1915), '
                                   "one forme for each colour (Southward 1892). Coloured bills were 'usually "
                                   "red with either blue, green or black' (Twyman, quoted by Byrom 2023). "
                                   'Rim width, squash, register and the machine-glazed paper are estimates: '
                                   'no source read gives them.'],
                                  ['Chromolithograph, chalk-drawn stones',
                                   'c.1870-1910 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Crayon on grained stone, pale and opaque colours first, greys and black '
                                   "last (Richmond 1880; Cumming 1904). Advertising chromos took 'often 8 to "
                                   "15' printings (Bodleian); the engine draws four tonal stones, so this "
                                   'under-counts them. Palette after the analysis of 1880 Paris chromos '
                                   '(Pitarch 2012): chrome yellow, red lake, iron blue; colour values are '
                                   'estimates. Grain of about 0.1 mm is inferred from sieve grades, register '
                                   'drift from NBS 1932; paper not found.'],
                                  ['Chromolithograph, hand-stippled stones',
                                   'c.1870-1910 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Tone dotted by hand in litho ink on polished stone, 'each dot ... one at "
                                   "a time' (Rhodes 1914), which gives many chromolithographs their "
                                   'irregular stipple (Graphics Atlas). As with the chalk version the engine '
                                   'draws four tonal stones where the trade used eight to fifteen. Measured '
                                   'stipple dot sizes were not found: the dot scale is an estimate, as are '
                                   'the ink colours and the paper.'],
                                  ['Collotype postcard or plate',
                                   '1870s-1920s · partly sourced · Collotype',
                                   "Screenless tone in reticulated gelatin, polygons 'about 0.10-0.15 mm "
                                   "across', ink level with the paper (Getty Atlas, Collotype). Most "
                                   'collotypes date from the 1870s to the 1920s, many of them postcards '
                                   '(Wikipedia, Collotype); commercial in Britain only from about 1890 (Tarr '
                                   '1949). Ink film, ink colour and card stock were not found and are '
                                   'estimates.'],
                                  ['Zinc line block with type',
                                   'c.1880-1960s · partly sourced · Letterpress: jobbing (platen)',
                                   'A drawing photographed as line (black or white, no tone), etched on zinc '
                                   'and printed with the type: the carrier of non-tonal relief pictures once '
                                   'wood engraving gave way, which the research dates to the 1870s-80s '
                                   '(Focal Encyclopedia 1960 for the process; Whetton 1946 for zinc). The '
                                   "squash rim is the engine's estimate, set by eye against Simon's scanned "
                                   'tickets and programmes; the paper is an estimate.'],
                                  ['Letterpress halftone on newsprint, 60-line',
                                   '1890s-1970s · partly sourced · Letterpress: rotary newspaper',
                                   "Zinc halftone stereotyped and printed on news stock: 'screens 50-65 are "
                                   "suitable for news stock and cheap printing papers' (Whetton 1946; "
                                   'Verfasser c.1912 gives 55 to 75 for rotary newspapers), with ragged dots '
                                   'because the paper is rough (Voet 1952). News ink is carbon black in '
                                   'mineral oil (PrintWiki). Dot limits, ink spread and the grey-black ink '
                                   "colour (from Simon's uncalibrated cuttings) are estimates."],
                                  ['Letterpress halftone on machine-finished paper, 85-line',
                                   '1890s-1970s · partly sourced · Letterpress: jobbing (platen)',
                                   "Halftone block printed with type on machine-finished paper: 'screens "
                                   '75-120 are used for machine-finished, super-calendered and imitation art '
                                   "papers' (Whetton 1946). 85 is chosen from that band; one of Simon's "
                                   'programmes measures about 86, by an unchecked automatic pass. Minimum '
                                   'and maximum printable dots were not found and are estimates, as is the '
                                   'paper colour.'],
                                  ['Letterpress halftone on art paper, 133-line',
                                   '1890s-1970s · partly sourced · Letterpress: fine (art paper)',
                                   'Copper halftone on coated art paper with hard packing: 120-150 lines '
                                   '(Voet 1952), 133-150 for glazed to best art papers (F. H. Smith 1948, '
                                   'snippet). Contours are sharp but ink coverage within the dot is uneven '
                                   '(Voet 1952), often with a light centre (Getty Atlas, Halftone). Dot '
                                   'limits and paper colour are estimates. At 300 ppi a 133-line screen is '
                                   'too fine to draw and prints as a smooth tint.'],
                                  ['Ben Day tints - colour line work on newsprint',
                                   '1890s-1950s · partly sourced · Letterpress: rotary newspaper',
                                   'For flat-coloured drawings, not photographs: colour built by hand from '
                                   'mechanical tints of yellow, red and blue under a black line plate. '
                                   "Newsprint 'could only take coarse tint screens, perhaps 55 or 65 dots "
                                   "per inch', and 1931-33 Sunday strips have every tint at one angle "
                                   '(Legion of Andy, parts 6 and 6.1). The engine lays fixed 25, 50 and 100% '
                                   'tints on a square grid; real Ben Day dots varied with inking and were '
                                   'often hexagonal. American evidence only. Ink colours are estimates.'],
                                  ['Three-colour letterpress process, no black',
                                   '1892-c.1910 · partly sourced · Letterpress: fine (art paper)',
                                   "Three halftone blocks printed 'invariably yellow, red, blue' (Verfasser "
                                   "c.1912) in a lemon yellow, a madder red 'neither a purple nor an orange' "
                                   "and a greenish iron blue, on paper 'hard, well-sized, and glazed' "
                                   '(Zander 1896). Shadows are built from three colours. Ink colours are '
                                   "estimates from those descriptions; the angles are Tarr's of 1949 and the "
                                   "133-line ruling Hackleman's of 1921, because nothing nearer the date was "
                                   'found.'],
                                  ['Letterpress from a well-equipped house',
                                   '1900s-1960s · inferred · Letterpress: jobbing (platen)',
                                   'Hard packing, proper make-ready, metal mounts and two-colour machines: a '
                                   'fine even rim, little dent in the sheet, even solids and tight register '
                                   '(controls described by Whetton 1946 and Southward 1915). The contrast '
                                   "with the small printer is the researchers' synthesis, not a period "
                                   'statement, and every amount is an estimate. The only register figure '
                                   "found is Southward's 'objectionable' at about 1/100 inch, an uncertain "
                                   'reading.'],
                                  ['Four-colour letterpress, skeleton black',
                                   'c.1910-1950s · partly sourced · Letterpress: fine (art paper)',
                                   "By 1921 'most process work is made for printing in four colors', usually "
                                   "at 133 or 150 lines (Hackleman 1921); the black was 'merely an extension "
                                   "... to add black to strengthen the shadows' (Verfasser c.1912). Angles "
                                   "are Tarr's of 1949 (red 105, yellow 90, blue 75, black 45). Inks are the "
                                   'pre-1935 red and greenish blue (Zander 1896), estimated in colour; work '
                                   'after about 1935 could have phthalocyanine blue. Coated paper per the '
                                   'report; its colour is an estimate.'],
                                  ['Pochoir - gouache brushed through stencils',
                                   'c.1910-1930s · partly sourced · Stencil and brush (pochoir, ROSTA, TASS)',
                                   'Paris stencil colouring at its peak in the 1910s-20s: thick gouache '
                                   "builds 'against the stencil's edge resulting in a surface elevation' "
                                   '(Smithsonian Libraries) and bristle traces show (South Florida Art '
                                   'Conservation). Usually laid over a printed key, which the engine cannot '
                                   'combine with it. Stencil counts per plate were not found: six flat '
                                   'colours is an estimate, as are the ridge width and the paper.'],
                                  ['Rotogravure in a monochrome ink',
                                   'c.1910-1970s · partly sourced · Rotogravure',
                                   'Conventional gravure: equal cells of varying depth at 150 lines per inch '
                                   'and 45 degrees, with type screened too and so serrated (Tarr 1949; Focal '
                                   "Encyclopedia 1960). Demand in the 1920s was 'principally for shades of "
                                   "brown' (Wiborg 1926). Pictures print brown; coloured layers snap to "
                                   'brown, green-black, blue or black, where a real page used one of them. '
                                   "Ink colours are estimates; the supercalendered paper is the later 'roto "
                                   "news' kind (PrintWiki). Too fine to draw at 300 ppi."],
                                  ['Screenprint, glue block-out stencil - heavy oil colour',
                                   'c.1915-1930 · partly sourced · Screenprint: glue, tusche or paper '
                                   'stencil',
                                   'Early commercial screen work before knife-cut film: glue block-out gives '
                                   "a 'ragged-edged effect' with mesh marks and pinholes, and paint went "
                                   'down heavily (Biegeleisen and Busenbark 1941, who note that hand-cut '
                                   'paper stencils of the same years cut sharper). Stock is show-card board, '
                                   'as they describe. The wet film of 27-41 micrometres is worked out from a '
                                   '1962 coverage figure; edge depth and mesh marks inside solids are '
                                   'estimates.'],
                                  ['Hand-drawn litho poster, about six printings',
                                   '1920s-1930s · partly sourced · Lithography: drawn on stone or zinc',
                                   'The British pictorial poster between the wars: drawn on zinc or stone in '
                                   "solids, 'chalked tints' and overprints, 'with the limitation imposed by "
                                   "the use of six printings only' (Griffits 1940, seen as snippets), with "
                                   'no halftone. Layers set to part opacity print as chalk grain. Poster '
                                   'crayon grain of a few tenths of a millimetre is inferred from sieve '
                                   'grades; register drift is scaled from NBS 1932; poster ink colours and '
                                   "paper were not found, so the artwork's colours are kept."],
                                  ['Aniline (flexo) printed paper bag',
                                   '1920s-1950s · inferred · Aniline (flexographic) on bags',
                                   "Rubber stereos and spirit dye inks on bag paper, in use for 'paper bags, "
                                   "cartons, containers' by 1934 (British and Colonial Printer 1934), with "
                                   'elementary inking (Whetton 1946): a ring of squeezed-out ink, little '
                                   'embossing, cloudy solids (FBI Laboratory; Flexopedia). Halo width and '
                                   'register were not found and are estimates. The spatter comes from '
                                   "Simon's French bags, which are only probably flexographic; no source "
                                   'describes it.'],
                                  ['Screenprint, knife-cut film stencil',
                                   '1930-1950s · partly sourced · Screenprint: knife-cut film stencil',
                                   "Knife-cut film (on the market 1930-32) 'definitely eliminates the "
                                   "raggedness of line' and with it 'a No. 8 or No. 10 mesh will be "
                                   "satisfactory' (Biegeleisen and Busenbark 1941): No. 10 silk is 109 "
                                   'threads per inch, a pitch of 0.233 mm. Flat oil colours on show-card '
                                   'board, which was often coloured to save printing a ground. Film '
                                   'thickness is worked out from 1962 coverage figures; edge rounding, '
                                   "speckle and mesh marks are the engine's estimates."],
                                  ['Photo-offset halftone from deep-etch plates',
                                   '1943-1960s · partly sourced · Offset lithography',
                                   'Four-colour offset at 133 lines from deep-etch plates (Modern '
                                   'Lithography 1943, American; 175 was also run). British film posters went '
                                   'to four-colour photo-offset from 1954 (Branaghan 2006, snippet). Dots '
                                   'are flat and fuzzy-edged (Graphics Atlas). Angles agree in Tarr 1949 and '
                                   'Horan 1952; fine-surfaced paper after Griffits 1940. The inks are the '
                                   '1993 SWOP measurements, the only measured set found, so period colours '
                                   'are assumed; the square dot and the light black are estimates.'],
                                  ['Day-Glo screenprint bill',
                                   '1949 on (Britain from 1950) · partly sourced · Screenprint: knife-cut '
                                   'film stencil',
                                   "Daylight fluorescent screen colours 'must be applied over a white base', "
                                   "through 'No. 10XX or coarser silk' (Sherwin-Williams Day-Glo leaflet, "
                                   'about 1949); first shown in Britain in spring 1950, when silkscreen was '
                                   'the only process that could print them (Kindel, Eye 60). Fluorescence '
                                   'cannot be shown on screen or in print, so the colours are estimates; '
                                   "paper not found. They lasted 'only 30 days' in sunlight: use the fade "
                                   'control for a survivor.'],
                                  ['Colour rotogravure magazine page',
                                   'c.1950-1970s · partly sourced · Rotogravure',
                                   "Four cylinders of equal cells at 150 lines, the screen 'more or less "
                                   "obscured in the dark tones' (Focal Encyclopedia 1960; Tarr 1949). "
                                   'British colour gravure dates from 1926 and the Sunday Times colour '
                                   'section from 1963 (Sun Printers history). Gravure ink colours and screen '
                                   'angles for colour work were not found: the inks are the 1993 SWOP offset '
                                   "set and the angles are the engine's default. Paper colour is an "
                                   'estimate. Too fine to draw at 300 ppi.'],
                                  ['Wet four-colour rotary letterpress magazine',
                                   '1950s-1970s · inferred · Letterpress: fine (art paper)',
                                   'High-speed magazine letterpress printing all four colours wet, with '
                                   'undercolour removal: total ink held to 220% (Horan 1952) or 240% '
                                   '(Graphic Arts Monthly 1960). Horan gives 120-line plates with black 45, '
                                   'blue 75, yellow 90, red 105. The engine has no ink-limit control, so a '
                                   'heavy black and reduced colours stand in for it; the wet-trapping amount '
                                   'is an estimate and the inks are the 1993 SWOP set. Built from '
                                   'specification, with no dated object behind it.'],
                                  ['Screenprint, photo stencil with coarse halftone',
                                   '1960s on · inferred · Screenprint: knife-cut film stencil',
                                   'Photographic stencils were little used in 1941 but routine stock by 1962 '
                                   '(Biegeleisen and Busenbark 1941; Advance catalogue 1962). Rulings ran '
                                   "from 100-133 lines on small work to 'about a 65-line screen' on sheets "
                                   'up to 40 x 60 in, through No. 13 or 14 silk (1941), 0.183 mm at No. 14. '
                                   "Thinner ink for the 1960s is the researchers' inference; the paper is an "
                                   "estimate. The engine's film-stencil edge stands in for a photo "
                                   "stencil's."],
                                  ['Four-colour offset on coated paper',
                                   '1960s-1980s · partly sourced · Offset lithography',
                                   'Photo-offset as the general process once it displaced letterpress and '
                                   'drawn litho between about 1965 and 1985. A thin film of 1-2 micrometres '
                                   '(Voet 1952) with fuzzy flat dots (Graphics Atlas). Inks are the SWOP '
                                   '1993 press-test values; angles black 45, magenta 75, yellow 90, cyan 105 '
                                   '(Lithographer 3 and 2, 1975, American). 150 lines is a modern commercial '
                                   "figure (PrintWiki), near Simon's colour scans; the SWOP test ran at 133. "
                                   'Brightened paper after Messier 2005. Too fine to draw at 300 ppi.']]},
                        {'title': 'Britain',
                         'rows': [['1858 woodcut pictorial bill - red ground, black figures',
                                   'c.1858 · partly sourced · Relief block: lino or woodcut',
                                   "Scarborough pictorial poster, c.1858: a woodcut 'printed with a red "
                                   "background' with white roundels carrying black woodcut figures, double "
                                   'crown 74.5 x 50.6 cm (V&A O1170945). Paper is not recorded. The thin '
                                   'bill paper, a vermilion red (the usual opaque red before 1900) and the '
                                   'register error are estimates.'],
                                  ['1860s provincial playbill - black on flimsy yellow',
                                   '1854-1865 · sourced · Letterpress: wood letter poster',
                                   'Theatre Royal Manchester playbill, 1864: letterpress from wood and metal '
                                   "type, 'printed in black ink on flimsy yellow paper', 50.7 x 25.4 cm (V&A "
                                   "O58433). The same kind of bill is recorded in black on 'very flimsy "
                                   "white paper' (V&A O59793, O1370738): swap the stock for thin bill paper. "
                                   'One working, so every layer prints black. The paper colour and the '
                                   'uneven type are estimates.'],
                                  ['1870s circus and theatre bill - coloured wood letter',
                                   '1840s-1890s · inferred · Letterpress: wood letter poster',
                                   "No dated 1870s bill was found. Built from Twyman's statement (quoted by "
                                   'Byrom, APHA 2023) that coloured type on circus and theatre bills from '
                                   "the 1840s was 'usually red with either blue, green or black', printed "
                                   "from one forme per colour (Southward 1892) on 'inferior' damped paper "
                                   '(Southward 1915). The pigments (vermilion, bronze blue, chrome green), '
                                   'paper and register error are estimates.'],
                                  ['1889 theatre poster - colour litho on a yellow ground (Nassau Steam '
                                   'Press)',
                                   '1889 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Nassau Steam Press, London, 28 Sept 1889: colour-lithographed theatre '
                                   'poster with a yellow ground, red, white and blue, 75.0 x 50.4 cm (V&A '
                                   'O195551). White is taken as bare paper. The research table adds black, '
                                   "which the record's colour list does not give; it is kept in the ink set "
                                   'for lettering. Paper was not found; the pigments (chrome yellow, '
                                   'vermilion, ultramarine), stock and register stretch are estimates.'],
                                  ['1890s Hexham sale bill - black wood letter on white',
                                   '1885-1904 · sourced · Letterpress: wood letter poster',
                                   "C. Armstrong's jobbing archive, Hexham, 1885-1904: livestock and "
                                   "furniture sale bills, church notices, playbills and reward bills, 'the "
                                   'vast majority ... black ink on white paper ... and occasionally coloured '
                                   "paper', at 11.5 x 17.5, 15 x 20 and 22.5 x 34.5 in (Byrom, APHA 2023). "
                                   'One working, so every layer prints black. Press settings are the process '
                                   'defaults, which are estimates. Use a tinted bill stock for the '
                                   'coloured-paper jobs.'],
                                  ['1890s Hexham village show poster - red and blue wood letter',
                                   '1885-1904 · sourced · Letterpress: wood letter poster',
                                   "In the Hexham archive, 'when Armstrong does use colour ink it's limited "
                                   "to red and blue as a single press'; only two jobs carry both colours, "
                                   "'both of which are large-scale posters for annual village shows' (Byrom, "
                                   'APHA 2023). Sizes in the archive run up to 22.5 x 34.5 in, on white or '
                                   'occasionally coloured paper. Which red and blue pigments he used is not '
                                   'recorded: vermilion, bronze blue and the register error are estimates.'],
                                  ['1890s melodrama poster - many-colour lithography (David Allen)',
                                   '1894-1915 · partly sourced · Lithography: drawn on stone or zinc',
                                   'David Allen and Sons printed from Belfast, and from a new works at '
                                   'Harrow after 1894; of their V&A works with a named process nearly all '
                                   'are colour lithography (V&A O1333279). By 1900 a London melodrama poster '
                                   "ran to '56 separate sheets, printed in 28 colours' (V&A, Theatre "
                                   'posters). The plugin cuts a picture into at most 8 colours. Colours and '
                                   'paper are not recorded: hand stipple (Cumming 1904), light colours '
                                   'first, the stock and register stretch are estimates.'],
                                  ['1900 tour poster - colour litho with gold (Stafford and Co.)',
                                   '1900 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Stafford and Co., Netherfield: colour-lithographed tour poster, 1900, '
                                   "65.5 x 46.3 cm, with a 'gold decorative plaque' overprinted to change "
                                   'the company name (V&A O1256548). The record gives no colour list beyond '
                                   "full colour and gold, so the chromolithographer's ink set (which "
                                   'includes gold bronze) is an estimate, as are the crayon tone, the stock '
                                   'and register stretch. Paper was not found.'],
                                  ['1900s early film bill - typographic long bill',
                                   '1899-1916 · partly sourced · Letterpress: wood letter poster',
                                   "The first British film bills were 'of the purely letterpress theatre "
                                   "bill type'; examples of 1899-1916 'all measure about 30 x 10 in' (a "
                                   "double crown split lengthways) 'and are purely typographic' (Branaghan "
                                   "2006, snippet). Ink colours are not stated, so the artwork's colours are "
                                   'kept. Paper was not found: thin damped bill paper follows Southward 1915 '
                                   'on poster paper in general, and the press settings are estimates.'],
                                  ['1909 programme advert page - blue on cream',
                                   'c.1909-10 · partly sourced · Letterpress: jobbing (platen)',
                                   "From Simon's own scans (file 13): a theatre programme advert page of "
                                   'about 1909-10 (Charing Cross Bank, Old Bushmills, Mazawattee Tea), '
                                   'letterpress in blue on cream, the type showing a darker squeezed-out '
                                   'rim. Identified by eye in a first pass and not verified; the ink and '
                                   'paper colours are read from uncalibrated scans of aged sheets. One '
                                   'working, so every layer prints blue.'],
                                  ['1915 recruiting bill - text-only letterpress (David Allen, Harrow)',
                                   '1915 · partly sourced · Letterpress: wood letter poster',
                                   'Parliamentary Recruiting Committee poster No. 136, November 1915: '
                                   "letterpress, text only, 760 x 508 mm (double crown), 'Printed by David "
                                   "Allen and Sons, Ltd., Harrow' (IWM Art.IWM PST 11982). Ink colours and "
                                   "paper are not stated, so the artwork's colours are kept and the stock is "
                                   'an estimate. Cleaner type and fuller inking than a small jobbing office '
                                   'are an estimate for a large house.'],
                                  ['1920s Underground double royal - colour litho (Waterlow)',
                                   '1911-1926 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Underground posters of 1911-13 were 'Printed by Waterlow and Sons Ltd' "
                                   '(London Transport Posters 2008, snippet), and a 1926 Waterlow double '
                                   'royal measures 1016 x 635 mm (LTM 1983/4/2000). Such posters were drawn '
                                   'by hand on stone or zinc with no halftone; runs were typically 1,000 '
                                   "(PrintWeek). The record says only full colour, so the artwork's colours "
                                   'are kept. Six printings is borrowed from Griffits 1940; paper was not '
                                   'found and the stock is an estimate.'],
                                  ['1920s union and election bill - local letterpress',
                                   'c.1900-1935 · inferred · Letterpress: wood letter poster',
                                   "Before about 1935 trade-union communication was 'letterpress posters and "
                                   "announcements', 'typical of locally sourced letterpress printing' and "
                                   "'probably 100 years out of date by the 1930s' (Rennie thesis). No dated "
                                   'election bill with a stated process, colours, size or paper was found. '
                                   'This is the small-office letterpress default with worn, mixed type on '
                                   "cheap paper; the artwork's colours are kept and every setting is an "
                                   'estimate.'],
                                  ['1930 stock poster - early screenprint (Stafford and Co.)',
                                   'c.1930 · partly sourced · Screenprint: glue, tusche or paper stencil',
                                   'Twelve Stafford and Co. stock posters of about 1930 are catalogued by '
                                   "the V&A as screenprint, 'pictorial and typographic', about 76.5 x 51 cm "
                                   '(V&A O1170721). Colours, stencil type and paper are not stated, so the '
                                   "artwork's colours are kept. A hand-made stencil is assumed because "
                                   'knife-cut film only came on the market in 1930-32 (Biegeleisen and '
                                   'Busenbark 1941, a US source); that and the stock are estimates.'],
                                  ['1930s Underground poster - six-colour litho (Vincent Brooks Day)',
                                   '1920s-1930s · partly sourced · Lithography: drawn on stone or zinc',
                                   'Vincent Brooks, Day and Son is the printer named most often on V&A '
                                   "Underground poster records for 1908-33. One job allowed 'only six colour "
                                   "printings' (Artmonsky, snippet); Griffits 1940 builds posters from "
                                   "solids, 'chalked tints' and overprints of semi-opaque and "
                                   'semi-transparent inks, on double royal (40 x 25 in). Tint layers print '
                                   'as crayon grain. The coarse grain size and the stock are estimates: '
                                   "British poster inks and papers were not found, so the artwork's colours "
                                   'are kept.'],
                                  ['1930s railway poster - chalk and airbrush litho (Baynard Press)',
                                   '1933-1939 · partly sourced · Lithography: drawn on stone or zinc',
                                   'The Baynard Press (colour lithography; Thomas Griffits worked there) '
                                   "leads V&A London Transport records after 1933 and was on the LNER's "
                                   'tender list for pictorial posters (Science Museum Group; Middleton 2002, '
                                   'snippet); railway posters were double royal or quad royal (Griffits '
                                   "1940). Airbrush became 'increasingly widespread' in the 1930s (London "
                                   'Transport Posters 2008). A fine spatter stands in for airbrush tints: '
                                   'its size, six printings and the stock are estimates; paper and inks were '
                                   'not found.'],
                                  ["1930s LNER letterpress poster - contract printer's type",
                                   '1929-1939 · partly sourced · Letterpress: wood letter poster',
                                   "For the LNER 'the letterpress poster was probably the cheapest form of "
                                   "general advertising available'; its contract printers were pressed to "
                                   "carry Gill Sans after 1929, and the company's own Stratford Market works "
                                   'printed letterpress (Middleton 2002, snippet). Colours, sizes and paper '
                                   "are not stated, so the artwork's colours are kept and the stock and "
                                   'cleaner press settings are estimates. Railway handbills as such were not '
                                   'documented.'],
                                  ['1931 theatre ticket - black on orange card',
                                   '1931 · partly sourced · Letterpress: jobbing (platen)',
                                   "From Simon's own scans (file 13): a 1931 Palladium ticket, letterpress "
                                   'in black on orange card, the type showing a darker squeezed-out rim. The '
                                   'jobbing-platen defaults were set by eye against this and similar scans, '
                                   'and the card colour is read from the uncalibrated scan of the aged '
                                   'ticket. Identification is first-pass and unverified. One working, so '
                                   'every layer prints black.'],
                                  ['Undated theatre programme - purple and red on buff, 86-line halftone',
                                   'not dated in the survey · partly sourced · Letterpress: jobbing (platen)',
                                   "From Simon's own scans (file 13): 'The Co-Optimists' programme, The "
                                   'Palace, Freshwater, letterpress in purple and red on buff, with a '
                                   'portrait halftone printed in the same coloured ink as the type at about '
                                   '86 lines per inch and 45 degrees. The survey gives no date. The ruling '
                                   'is a first automatic pass, not checked by hand; ink and paper colours '
                                   'are from uncalibrated scans of an aged sheet, and the register error is '
                                   'an estimate.'],
                                  ['1940 town-hall dance bill - red on buff card',
                                   'c.1940-42 · sourced · Letterpress: wood letter poster',
                                   'Town-hall dance bill, Kinross, c.1940-42, David Brown and Son: '
                                   "letterpress, 'red typeface on buff-coloured card', 50.9 x 31.5 cm (V&A "
                                   'O140582). One working, so every layer prints red. The buff colour is '
                                   "borrowed from Simon's scanned buff programme paper, and the red pigment "
                                   'and press settings are estimates.'],
                                  ['1940s variety bill on card - blue and red (Tribe Brothers)',
                                   'c.1940s-1955 · partly sourced · Letterpress: wood letter poster',
                                   'Tribe Brothers, London and St Albans: a variety bill of the 1940s in '
                                   "'bold blue and red text' on card, 37.8 x 25.4 cm, with 20 x 12.5 in "
                                   'bills dated 1949 and 1955 (V&A O1430747, O1164788). The V&A gives the '
                                   "technique only as 'printing': letterpress is likely for a theatrical "
                                   'typographic house but is not proven by the record. Pigments, register '
                                   'error and press settings are estimates.'],
                                  ['1940s RoSPA safety poster - photo-litho offset (Loxley)',
                                   '1939-1945 · partly sourced · Offset lithography',
                                   "RoSPA's wartime safety posters were 'all printed using offset presses "
                                   "and the photo-litho process' by Loxley Brothers of Sheffield at double "
                                   'crown, a few half size and two-up for economy; Loxley had two-colour '
                                   'rotary offset presses from 1925 and found its own paper through the war '
                                   "(Rennie thesis). Colours are flat but not listed, so the artwork's "
                                   'colours are kept. Screen ruling and paper were not found: the process '
                                   'default, the glass-screen dot and the stock are estimates.'],
                                  ['1942 wartime film quad - three-colour hand litho, no black',
                                   '1941-1945 · partly sourced · Lithography: drawn on stone or zinc',
                                   "'Berlin Correspondent' (1942), printed by Stafford: 'three-colour "
                                   "(yellow, red and blue) hand-litho' with no black plate, so it 'cannot "
                                   "recreate pure black'; wartime posters were 'on such poor quality paper', "
                                   'some on the backs of maps or old posters (Branaghan 2006, snippets). The '
                                   'Control of Paper (No. 36) Order 1941 capped posters at 1,200 sq in, the '
                                   'quad crown (Kinematograph Year Book 1942). Pigments, crayon grain, paper '
                                   'colour and show-through are estimates.'],
                                  ['1943 HMSO poster - lithograph (Fosh and Cross)',
                                   '1939-1945 · partly sourced · Lithography: drawn on stone or zinc',
                                   "'Into Action', 1943, printed for HMSO by Fosh and Cross: 'lithograph and "
                                   "letterpress', 763 x 505 mm (IWM 32278). V&A records for Stationery "
                                   'Office posters of 1939-45 index colour lithography 295 times against '
                                   'letterpress 21. Only the lithographed part is modelled: type overprinted '
                                   'by letterpress needs a second pass with a letterpress preset. Colours '
                                   'vary and paper was not found; four printings and the stock are '
                                   'estimates.'],
                                  ['1950 variety bill - dark blue and red (Electric Modern)',
                                   '1950-1974 · partly sourced · Letterpress: wood letter poster',
                                   'Palace Theatre Manchester, August 1950, Electric (Modern) Printing Co.: '
                                   "typographical bill 'printed in dark blue and red on white paper', 20 x "
                                   "12.5 in (V&A O1597618). The firm 'specialised in printing variety "
                                   "theatre posters' and advertised as 'Letterpress and Lithographic'; the "
                                   "V&A gives the technique only as 'printing', so letterpress is likely but "
                                   'not proven. Pigments, register error and press settings are estimates.'],
                                  ['1950s Day-Glo bill - fluorescent screenprint',
                                   '1950-1960s · partly sourced · Screenprint: knife-cut film stencil',
                                   'Fluorescent posters were first shown in Britain in spring 1950, among '
                                   "them a Crazy Gang bill 'silkscreened by Greenwood Developments Ltd'; "
                                   "silkscreen was 'at first the only process for which fluorescent inks "
                                   "were available' (Kindel, Eye 60). The mesh follows a US Day-Glo leaflet "
                                   "of 1949 ('No. 10XX or coarser silk', printed over a white base). "
                                   'Fluorescence cannot be shown; ink colours, stencil type and paper (not '
                                   'found) are estimates.'],
                                  ['1950s second-feature film quad - two-colour hand-cut silkscreen',
                                   '1950s-1960s · partly sourced · Screenprint: knife-cut film stencil',
                                   "Second-feature and reissue quads of the 1950s were often 'two-colour "
                                   "hand-cut silkscreen' (Branaghan 2006, snippet), on the quad crown, 30 x "
                                   "40 in. The two colours are not named, so the artwork's colours are kept "
                                   'and a picture is cut to two flat colours. No. 12 silk and the '
                                   'film-stencil edge follow US manuals (Biegeleisen and Busenbark 1941; '
                                   'Advance 1962). Paper was not found; the stock and register error are '
                                   'estimates.'],
                                  ['1954 wrestling and variety quad - black and red (Willsons)',
                                   '1954 · partly sourced · Letterpress: wood letter poster',
                                   "Pavilion Theatre, Sheerness, August 1954, Willsons' Printers: variety "
                                   "and wrestling bill in 'black and red typography', quad crown 76.3 x "
                                   "101.5 cm (V&A O1161342). The V&A gives the technique only as 'printing': "
                                   'letterpress is likely but not proven. Paper was not found; the thin bill '
                                   'paper, the red pigment and the register error are estimates.'],
                                  ['1957 circus tour bill - red, blue, yellow and black (Hastings Printing '
                                   'Co.)',
                                   '1957 · partly sourced · Letterpress: wood letter poster',
                                   'Circus tour poster, 1957, Hastings Printing Co.: typographic in red, '
                                   "blue, yellow and black, with 'an empty white rectangle for overprinting "
                                   "the details of the venue, dates and times', 63.2 x 50.3 cm (V&A "
                                   "O1609031). The V&A gives the technique only as 'printing': letterpress "
                                   'is likely but not proven. Paper was not found; the pigments, thin bill '
                                   'paper and register error are estimates.'],
                                  ['1958 theatre ticket - black and red on pink card',
                                   '1958 · partly sourced · Letterpress: jobbing (platen)',
                                   "From Simon's own scans (file 13): a New Theatre ticket dated 8 Feb 1958, "
                                   'letterpress in black and red on pink card, the type showing a darker '
                                   'squeezed-out rim. The card colour is read from the uncalibrated scan of '
                                   'the aged ticket and the red is an estimate. Identification is first-pass '
                                   'and unverified. Flat-colour register on jobbing work was not found; the '
                                   'error here is an estimate.'],
                                  ["1960s 'boxing match' bill - wooden display type",
                                   'c.1958-1965 · partly sourced · Letterpress: wood letter poster',
                                   "Early-1960s package-tour posters from 'small local printers' were "
                                   "'variety-style posters - also known as boxing match posters ... printed "
                                   "letterpress' from 'wooden display type locked into a metal frame' (Evans "
                                   "2010, snippet). Colours, size and paper are not stated, so the artwork's "
                                   'colours are kept. No dated boxing bill with a named printer was found. '
                                   'Worn type, heavy inking and the paper are estimates.'],
                                  ['1960s film quad - four-colour photo-offset',
                                   '1954-1989 · partly sourced · Offset lithography',
                                   "Film posters moved to 'four-colour photo-offset' from 1954, 'the "
                                   "accepted industry standard' by 1960, run on two-colour quad presses in "
                                   'lots of about 3,000 (Branaghan 2006, snippets); a 1979 quad measures '
                                   '75.3 x 101.3 cm (V&A O1243970). The ink colours are late SWOP '
                                   'measurements, not British ones. Poster screen rulings, British screen '
                                   "angles by decade and paper were not found: the 133-line screen, Tarr's "
                                   '1949 angles and the stock are estimates.'],
                                  ['1966 theatre programme - letterpress with halftone blocks',
                                   '1950s-1960s · partly sourced · Letterpress: jobbing (platen)',
                                   "A Sadler's Wells programme of 1966 is catalogued as 'line block, "
                                   "half-tone and letterpress printing', 18.5 x 12.4 cm (V&A O189811). No "
                                   'source gives programme screen rulings: 120 lines follows a first '
                                   "automatic pass over Simon's scanned programmes (106-131; a Palace "
                                   "Theatre souvenir programme about 119), unverified, and sits in Whetton's "
                                   '1946 band for imitation art. Paper and inks are not recorded: the stock '
                                   "is an estimate and the artwork's colours are kept."],
                                  ['1967 psychedelic poster - screenprint with silver and fluorescents '
                                   '(Hapshash)',
                                   '1967 · partly sourced · Screenprint: knife-cut film stencil',
                                   'Hapshash and the Coloured Coat, 1967: mostly screenprints, one 101 x 75 '
                                   "cm with a 'night sky gradating into silver' and a 'gradient of yellow to "
                                   "orange'; 'the artwork for each colour was transferred to its own "
                                   "individual screen', with 'metallic and fluorescent inks' (V&A O1155361; "
                                   'Evans 2010, snippet). Blended inks on one screen are not modelled: each '
                                   'layer is one ink. Ink colours other than silver, gold and the '
                                   'fluorescents, and the paper (not found), are estimates.'],
                                  ['1968 Poster Workshop - screenprint on reused paper',
                                   '1968-1971 · partly sourced · Screenprint: glue, tusche or paper stencil',
                                   'Poster Workshop, Camden Road, 1968-71: about 220 silkscreen designs in '
                                   "one or two flat colours, 'each with an average run of well over 200' "
                                   '(Tate Etc. 43). One account has them printed on the backs of donated '
                                   'posters, shown here as show-through. Stencil type, colours and sizes are '
                                   'not stated: the hand-made stencil, the stock and the amount of '
                                   "show-through are estimates, and the artwork's colours are kept."],
                                  ['1974 seaside pantomime bill - three-colour screenprint',
                                   '1974 · sourced · Screenprint: knife-cut film stencil',
                                   'Pantomime bill, 1974, Ronald Allinson, Rhyl: screenprint in navy on '
                                   "white paper 'with some flashes of light blue and fluorescent pink', "
                                   "'only three colours of ink, making it easier and cheaper to produce', "
                                   '52.2 x 31.6 cm (V&A O154024). The stencil type is not recorded, so the '
                                   'film-stencil defaults are an estimate, as are the ink colours and the '
                                   'register error. Fluorescence cannot be shown.'],
                                  ['1975 See Red poster - one-colour paper-stencil screenprint',
                                   '1974-1978 · partly sourced · Screenprint: glue, tusche or paper stencil',
                                   "See Red Women's Workshop screenprinted 'using paper stencils or blocking "
                                   "out' until photographic work began in 1978 (Wikipedia, See Red). 'Disc "
                                   "Jockey', 1975, is a 'screenprint in green', 76 x 51 cm (V&A O1193209). "
                                   'One working, so every layer prints green. Paper was not found: the '
                                   'green, the stock and the ragged stencil edge (Biegeleisen and Busenbark '
                                   '1941) are estimates.'],
                                  ['1975 Paddington Printshop poster - four-colour screenprint',
                                   '1975-1988 · partly sourced · Screenprint: knife-cut film stencil',
                                   "Paddington Printshop's opening poster, 1975: 'screenprint poster on "
                                   "paper ... handcut, photostencil' in orange, yellow, green and blue, 77.4 "
                                   'x 58.8 cm (V&A O1274937). Paper was not found. The ink colours, stock '
                                   'and register error are estimates; the 85-line screen for photostencil '
                                   'tone is a US figure for sheets of this size (Biegeleisen and Busenbark '
                                   '1941), not a British one.'],
                                  ['1976 punk fanzine - office photocopier',
                                   '1976-1980s · partly sourced · Photocopier, 1970s-80s',
                                   "Sniffin' Glue (first issue July 1976) was photocopied on an office "
                                   "copier, typed on a child's typewriter, A4 and stapled, first run 50; "
                                   'Panache was A4 photocopied in runs of 200-500 (Triggs, Journal of Design '
                                   "History). Copies are 'high contrast with poor intermediate tones' "
                                   '(Nicholson 1989). The paper is not recorded and plain copier paper is '
                                   'assumed; the edge-band width of the solids and the speck density were '
                                   'not found and are estimates.'],
                                  ['1977 punk fanzine - Gestetner stencil duplicator',
                                   '1977 · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   "Chainsaw no. 1 (1977): '200 printed on the Gestetner duplicator', with "
                                   'stencil lettering for the title (Triggs, Journal of Design History). '
                                   'Gestetner machines used an oil ink, which gives a deeper black, an oil '
                                   'halo and filled counters (Desborough 1917; PSAP). Ink colour and paper '
                                   'are not recorded: black on absorbent duplicating paper is assumed. The '
                                   'halo width and stroke gain were not found and are estimates.'],
                                  ['1980s theatre bill - late wood letter (G and M Organ)',
                                   '1928-1997 · partly sourced · Letterpress: wood letter poster',
                                   'G and M Organ, theatrical printers of Bristol then Wrington (1928-1997), '
                                   'printed posters, playbills, programmes and tickets for venues from '
                                   'Ilfracombe to Ayr on a two-colour Elliott Wharfedale of about 1906, with '
                                   'wood letter from 4-line to 100-line, mostly grotesques (Stothard and '
                                   'Kitching, Eye 74). No dated bill, colour list or paper was found: the '
                                   "artwork's colours are kept, and the old worn type, register error and "
                                   'stock are estimates.'],
                                  ['1983 arts centre diary - flat-colour offset',
                                   '1969-1983 · partly sourced · Offset lithography',
                                   "From Simon's own scans (file 13): a Barbican Centre diary of June 1983 "
                                   'in magenta, an Aldwych Theatre playbill of 1969 and Theatre Workshop and '
                                   'Mermaid Theatre programmes, all flat-colour offset with clean edges and '
                                   'fine mottle in the solids. Identified by eye in a first pass and not '
                                   'verified; no dated record stating offset for theatre print was found. '
                                   'The spot colours are read from uncalibrated scans and the stock is an '
                                   'estimate.']]},
                        {'title': 'Ireland',
                         'rows': [['1880s Belfast theatre poster - colour lithography (David Allen)',
                                   'c.1860s-1894 · partly sourced · Lithography: drawn on stone or zinc',
                                   'David Allen and Sons were Belfast poster printers from 1857, at '
                                   "Corporation Street from 1884, and 'printing came solely from Belfast "
                                   "until 1894' (V&A O1333279; Grace's Guide). Of their V&A works with a "
                                   'named process nearly all are colour lithography. No dated Belfast poster '
                                   "with colours, size or paper was found: the artwork's colours are kept, "
                                   'and hand stipple, eight printings, the stock and register stretch are '
                                   'estimates.'],
                                  ['1916 Proclamation - letterpress in two impressions',
                                   '1916 · partly sourced · Letterpress: wood letter poster',
                                   'Printed at Liberty Hall on a Wharfedale stop-cylinder press, Easter '
                                   '1916, in black, on paper from the Swiftbrook mills; borrowed type ran so '
                                   "short that it was printed 'in two halves ... on one sheet of paper', "
                                   "with wrong-fount e's and an F made into an E with sealing wax (Dublin "
                                   'City Libraries). Put the halves on separate layers to see the '
                                   'misregister. Sheet size was not verified; the kind of paper, register '
                                   'error and press settings are estimates.'],
                                  ['1930s bilingual notice - letterpress with Gaelic type',
                                   'c.1906-1950s · inferred · Letterpress: jobbing (platen)',
                                   'Assembled from type history, not from a dated notice: almost all '
                                   'Irish-language text up to the mid 20th century was set in Gaelic type '
                                   '(Libfocus 2020), by machine in Monotype Series 24 (about 1906) or Colum '
                                   'Cille (1936), giving way to roman after the spelling reforms of 1945-58 '
                                   '(McGuinne, snippet). The typeface comes from the artwork; the plugin '
                                   'adds only jobbing letterpress. Colours, paper and sizes were not found; '
                                   'every setting is an estimate.'],
                                  ['1950s provincial political poster - single-colour wood type',
                                   'to the 1980s · partly sourced · Letterpress: wood letter poster',
                                   "'Firms like Danns of Longford ... used big wooden type for printing "
                                   'political and other single colour posters, a far cry from the elaborate '
                                   "full colour posters being used in London', and wooden type was 'still to "
                                   "be found quite often in 1959 in Dublin' (Oram 1986, snippets). Which "
                                   'colour, the paper and the size are not stated: keep the artwork to one '
                                   'colour. Worn type and the paper are estimates; no dated election poster '
                                   'with an imprint was found.'],
                                  ['1950s Dublin 48-sheet poster - first large litho',
                                   '1950s · inferred · Offset lithography',
                                   "An agency man of the 1950s recalled that O'Kennedy Brindley 'used litho "
                                   "printing for the first time to print 48 sheet posters for Carroll's "
                                   "cigarettes' (Oram 1986, snippet). That is all the evidence: one "
                                   'recollection in one book. Whether the work was offset or screened is not '
                                   "stated; four-colour offset at a coarse 65-line screen, Tarr's 1949 "
                                   'angles, the ink colours and the paper are all estimates.'],
                                  ['1960s Irish poster - halftone silkscreen',
                                   'early 1960s-1980s · partly sourced · Screenprint: knife-cut film stencil',
                                   "'With the perfecting of the half tone process in silk screen printing in "
                                   "the early 1960s, design techniques in silk screen posters improved'; by "
                                   "1986 the largest Irish screen printer was printing 'many full colour "
                                   "posters' (Oram 1986, snippets). Colours, sizes and paper are not stated, "
                                   "so the artwork's colours are kept. The 65-line screen is a US figure for "
                                   'large sheets (Biegeleisen and Busenbark 1941); stencil, stock and '
                                   'register error are estimates.']]},
                        {'title': 'United States',
                         'rows': [['1830s-1890s show bill - black wood type on thin paper',
                                   'c.1830-1900 · partly sourced · Letterpress: wood letter poster',
                                   "Machine-cut wood type (Wells 1828, Leavenworth's pantograph 1834) and "
                                   'wood blocks, the stock American show bill (Wikipedia, Wood type). The '
                                   "report found only 'black; one or two flat colours' and no dated bill, "
                                   'paper or sheet size, so the thin bill paper and every press setting are '
                                   'the wood-letter defaults and estimates.'],
                                  ['1880s-1920s circus one-sheet - hand-drawn lithography',
                                   'c.1880-1930 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Hand-drawn lithography (stone, later zinc), the show-poster trade of '
                                   'Strobridge and Morgan; a 1926 Strobridge one-sheet measures 28 x 42 1/4 '
                                   'in (The Ringling, Tibbals collection). Twelve or more printings were '
                                   "'not unusual' (Wikipedia, Chromolithography) but the engine cuts a "
                                   'picture into eight at most. Colour count for circus work, paper and '
                                   'crayon grain were not found and are estimates; the stretch is within the '
                                   'range of the 1932 NBS register study.'],
                                  ['1885-1930 California crate label - stone lithography, hand stipple',
                                   'c.1885-1930 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Stone-lithographed orange-crate labels date from 1880-85 and stone was '
                                   "still standard in the late 1920s, with shading by 'the stippling method' "
                                   '(Claremont Heritage; The Henry Ford). Number of colours, label paper and '
                                   'stipple size were not found: the four stippled stones (yellow, red, '
                                   "blue, black, from Wiborg's 1926 ink list), the smooth litho paper and "
                                   'the dot size are estimates.'],
                                  ['1887-1980s mimeograph bulletin - typed stencil, black ink',
                                   '1887-1980s · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   "A. B. Dick's mimeograph of 1887: ink forced through a typed stencil onto "
                                   'soft paper, with filled counters and an oil halo (Wikipedia, Mimeograph; '
                                   'PSAP). Used for school, church, fanzine and activist print until '
                                   'photocopying displaced it from the late 1960s. Black ink is as the '
                                   'report gives it; paper stock, halo width and stroke gain were not found '
                                   'and are the process estimates.'],
                                  ['1900s-1950s show card - wood type and carved blocks, a pass per colour',
                                   'c.1900-1955 · partly sourced · Letterpress: wood letter poster',
                                   'Hand-set wood and metal type with hand-carved blocks, one pass through '
                                   'the press for each colour, as Hatch Show Print describes its own work '
                                   '(Hatch, What is letterpress). Colours snap to the standard job and '
                                   "poster inks listed by the ink maker Wiborg in 1926. Hatch's own colours, "
                                   'card stock and sizes were not found; the card and the loose register are '
                                   'estimates. The split-fountain rainbow ground of the show printers is not '
                                   'modelled.'],
                                  ['1910s-1930s film one-sheet - lithography in four colours, no dot screen',
                                   'c.1912-1935 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Morgan Litho advertised four-colour lithographed film posters in 1912 '
                                   'and the 27 x 41 in one-sheet was standard by 1913; hand-drawn on stone, '
                                   'later zinc, with no dot screen (Mallory 2014; Original Film Art). Which '
                                   "four colours is not stated: yellow, red, blue and black from Wiborg's "
                                   '1926 list are an assumption, as are paper tone and crayon grain. Issued '
                                   'folded in eighths; add folds with the ageing controls.'],
                                  ['1910s-1930s Sunday rotogravure section - brown gravure on newsprint',
                                   '1912-c.1935 · partly sourced · Rotogravure',
                                   'Rotogravure picture sections ran in American Sunday papers from 1912-14, '
                                   "in 47 papers by 1918, printed 'even on inexpensive newsprint' (Library "
                                   "of Congress). The 150-line screen is Hackleman's 1921 US figure. The hue "
                                   "of these sections was not found: brown follows Wiborg's 1926 remark that "
                                   "gravure ink demand was 'principally for shades of brown', so treat the "
                                   'colour as an estimate.'],
                                  ['1920s-1950s newspaper - rotary letterpress, 60-line halftone',
                                   'c.1921-1955 · partly sourced · Letterpress: rotary newspaper',
                                   'Stereotyped rotary letterpress on newsprint in news black. US engravers '
                                   'specified 60-line screens and coarser for news and anything stereotyped '
                                   '(Hackleman 1921) and 50-65 lines for newspapers (Horan 1952). Rulings '
                                   'title by title were not found; squash, oil halo and salt are the process '
                                   'estimates.'],
                                  ['1936-1943 WPA poster - hand-cut stencil screenprint',
                                   '1936-1943 · partly sourced · Screenprint: knife-cut film stencil',
                                   'The WPA poster units printed about two million posters from about 35,000 '
                                   'designs by hand-cut stencil silkscreen, up to 600 a day (PBS Antiques '
                                   'Roadshow; Wikipedia, Federal Art Project). Flat colours were chosen by '
                                   'the artist; the number of colours, stock, sizes and mesh were not found. '
                                   'Show-card board (Biegeleisen and Busenbark 1941) and No. 12 silk (a 1962 '
                                   "supplier's catalogue) are general US practice, not WPA records; five "
                                   'colours is an estimate.'],
                                  ['1936-1950s picture weekly - heat-set rotary letterpress on coated paper',
                                   '1936-c.1960 · partly sourced · Letterpress: fine (art paper)',
                                   'Life was printed by R. R. Donnelley from 1936 on high-speed rotary '
                                   "letterpress with heat-set ink on 'heavily coated paper' "
                                   '(FundingUniverse; Wikipedia, Life). Its screen ruling was not found: 120 '
                                   "lines and the angles (black 45, blue 75, yellow 90, red 105) are Horan's "
                                   '1952 US figures for four-colour letterpress, and the ink colours are the '
                                   'measured 1993 process set, so tone and colour are estimates for this '
                                   'date.'],
                                  ['1940-1985 film one-sheet - colour offset',
                                   '1940-c.1985 · partly sourced · Offset lithography',
                                   "By the 1940s colour offset had 'totally replaced' stone lithography for "
                                   'film posters (Mallory 2014); one-sheets were 27 x 41 in on thin paper, '
                                   'folded in eighths until about 1980 (Heritage Auctions). Screen ruling '
                                   'and number of colours were not found: four-colour process at 133 lines '
                                   'is the US offset norm of 1943 (Modern Lithography), and the paper and '
                                   'ink colours are estimates.'],
                                  ['1954-1975 comic book - letterpress on newsprint, 64 flat tints',
                                   '1954-c.1975 · sourced · Letterpress: rotary newspaper',
                                   'Four-colour rotary letterpress on newsprint from hand-made acetate '
                                   'separations: yellow, red and blue each at 25, 50 or 100 per cent with a '
                                   'black line plate, 64 colours, the tints at 60 lines per inch and 30 '
                                   'degrees apart (Legion of Andy, part 9a; Brevoort 2021). Marvel adopted '
                                   'the method in 1954, DC in 1956. Ink colours, register and squash are '
                                   'estimates; the 250 per cent ink limit is not modelled.'],
                                  ['1955-1980s show card - black wood type over Day-Glo, letterpress',
                                   'c.1955-1989 · partly sourced · Letterpress: wood letter poster',
                                   'Globe Poster of Baltimore printed by letterpress on Heidelberg platens '
                                   'from wood type, zinc plates and hand-routed blocks, adding Day-Glo '
                                   'oranges, pinks, yellows and greens in the mid-1950s (NPR 2011); Colby of '
                                   'Los Angeles set black capitals over fluorescent grounds on 14 x 22 in '
                                   'cards (PBS SoCal). Card stock was not found for Globe. Fluorescence '
                                   'cannot be shown, ink colours are estimates, and the split-fountain blend '
                                   'is not modelled.'],
                                  ['1966-1971 San Francisco rock poster - offset, two or three flat inks',
                                   '1966-1971 · sourced · Offset lithography',
                                   'Fillmore and Family Dog posters were offset lithographs from small San '
                                   'Francisco printers, about 14 x 20 in, in two or three flat inks such as '
                                   'lavender with yellow or green, sometimes silver or gold, on vellum, '
                                   "index or white wove stock (Cooper Hewitt; ClassicPosters; Wolfgang's). "
                                   "The artwork's own colours are kept. Split-fountain blends are not "
                                   'modelled; paper tone and press settings are estimates.'],
                                  ['1975-1980s comic book - tint screens all at one angle',
                                   'c.1975-1989 · partly sourced · Letterpress: rotary newspaper',
                                   'As the 1954-1975 comic book, but after a changeover in the mid-1970s the '
                                   'three tint screens were all set at one angle (Legion of Andy, part 9a). '
                                   'The source gives no exact date and nothing else about the change was '
                                   'found, so everything other than the angle is carried over from the '
                                   'earlier preset.'],
                                  ['1977-1989 punk flyer - photocopied paste-up',
                                   '1977-1989 · partly sourced · Photocopier, 1970s-80s',
                                   'Flyers pasted up from newspaper and magazine cuttings, pen and glue and '
                                   "then photocopied; 'toner smears and other imperfections made these "
                                   "images literally darker' (JSTOR Daily, Xerox and Roll). Black toner on "
                                   'plain copier paper. Machines, paper and sizes for dated flyers were not '
                                   'found; the raised contrast and the specks are estimates.']]},
                        {'title': 'France',
                         'rows': [['1850s-1900s Epinal sheet - printed keyline, colour brushed through '
                                   'stencils',
                                   'c.1850-1910 · partly sourced · Stencil and brush (pochoir, ROSTA, TASS)',
                                   'Pellerin of Epinal printed a keyline (woodcut, then lithograph from '
                                   'about 1840-50) and coloured it by brushing through stencils; V&A sheets '
                                   'show a few flats in red, blue, yellow, green and brown at about 30 x 40 '
                                   "to 39 x 49 cm (Wikipedia, Imagerie d'Epinal; V&A O1156551). The engine "
                                   'gives the keyline the same stencil mark as the colours. Paper, the thin '
                                   'water-colour and the loose register are estimates.'],
                                  ['1880s-1930s commercial bill - black letterpress on coloured paper',
                                   '1881-c.1934 · inferred · Letterpress: wood letter poster',
                                   'Built from one rule recorded in 1934: only government posters could be '
                                   'printed on white paper, and others went on coloured paper and paid stamp '
                                   'duty (Otlet 1934). No dated bill, typeface, sheet size or paper colour '
                                   'was found, so the yellow stock is an arbitrary choice and the press '
                                   'settings are the wood-letter defaults. Change the stock to white for an '
                                   'official notice.'],
                                  ['1880s-1890s Paris poster - colour lithography from three to five stones',
                                   'c.1881-1900 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Cheret's large-sheet colour lithography, printed by Chaix from 1881 on "
                                   'sheets of about 88 x 124 cm (V&A O919123), is said to have needed only '
                                   'three to five stones (German Wikipedia, Plakat). Inks are the pigments '
                                   'found on Paris chromolithographs of 1880: chrome yellow, red lead, '
                                   'Prussian blue and a red lake (Pitarch 2012). Which colour went on which '
                                   'stone was not found; yellow, red, blue and black, the crayon grain and '
                                   'the paper are estimates.'],
                                  ['1891 Paris poster - four colours, brush and crachis',
                                   '1891 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Toulouse-Lautrec's 'Moulin Rouge - La Goulue', 1891: 'colour lithograph, "
                                   "printed in four colours', 'with brush and crachis effects', 170 x 122 cm "
                                   '(V&A O80096). Flat brush areas are cut into four colours and any tint '
                                   'prints as spatter, as flicked from a toothbrush with a knife. The record '
                                   "does not name the four colours, so the artwork's own are kept; droplet "
                                   'size, the stray droplets at edges and the paper are estimates.'],
                                  ['1912-1925 pochoir fashion plate - gouache through metal stencils',
                                   '1912-1925 · partly sourced · Stencil and brush (pochoir, ROSTA, TASS)',
                                   'Pochoir plates such as those of the Gazette du Bon Ton (1912-25, 573 '
                                   'plates): a printed outline, sometimes collotype, then opaque gouache '
                                   'brushed through metal stencils, leaving a ridge at the stencil edge and '
                                   'bristle traces (Smithsonian Libraries; Wikipedia, Gazette du bon ton). '
                                   'Stencil counts and sizes were not found; eight colours, cream paper and '
                                   'register are estimates. The outline gets the same stencil mark as the '
                                   'colours.'],
                                  ['1920s-1930s travel poster - colour lithography in flat colours',
                                   'c.1923-1939 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Colour-lithographed travel posters: 'Nord Express' 1927 at 75 x 105 cm "
                                   "with the Hachard imprint, and 'Normandie' 1935 at 62.5 x 100.5 cm in "
                                   'black, white, red, blue and green on cotton-backed paper (V&A O89673, '
                                   'O1405126). Colour counts for other posters, paper stock and how tone was '
                                   'drawn were not found: five flat colours, a fine crayon grain and smooth '
                                   'litho paper are estimates.'],
                                  ['1928-1940 picture weekly - rotogravure, type and pictures both screened',
                                   '1928-1940 · partly sourced · Rotogravure',
                                   'Vu (1928-40) was printed by rotogravure from film positives of both type '
                                   'and pictures, so the type is screened as well (Wikipedia, Vu). Sources '
                                   'differ on whether gravure began in 1928 or the early 1930s. The 175-line '
                                   "ruling is French Wikipedia's general minimum for heliogravure, not a "
                                   'figure for this title; ink colour and paper were not found and the '
                                   'supercalendered stock is an estimate.'],
                                  ['1950s exhibition or tourism poster - late hand-drawn colour lithography',
                                   'c.1949-1966 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Hand-drawn colour lithography lasted into the 1950s for French posters: '
                                   "Mourlot's exhibition and tourism posters (1956-59, about 47 x 64 and 63 "
                                   "x 100 cm) and Savignac's and Villemot's commercial work are catalogued "
                                   'as colour lithographs (V&A O568413, O819392, O549906, O591827). Colours '
                                   'and paper were not found; eight workings, crayon grain and cartridge '
                                   'paper are estimates.'],
                                  ['1960s poster - colour offset lithography',
                                   'c.1960-1975 · partly sourced · Offset lithography',
                                   'Offset took over French posters in the 1960s, on a small sample: '
                                   "Picasso's 'Paix' 1960, a colour offset lithograph in an edition of "
                                   "2,500, and Savignac's 'Yoplait' 1967 at 117 x 158 cm (V&A O1110700, "
                                   'O75870). Process colour is presumed, not stated; screen ruling, inks and '
                                   'paper were not found, so the 133-line screen, the 1993 process ink '
                                   'colours and the poster paper are stand-ins.'],
                                  ['May 1968 Atelier Populaire poster - one-colour lithograph',
                                   '1968 · partly sourced · Lithography: drawn on stone or zinc',
                                   'The first Atelier Populaire posters were printed in the Beaux-Arts '
                                   'lithography workshop from 14 May 1968, and some are catalogued as '
                                   'lithographs in one colour at about 62 x 46 and 65 x 50 cm (V&A O102001, '
                                   'O102003; Rougemont 1988). Ink colour and paper are not recorded: '
                                   'newsprint is assumed from the screenprints, and the grain is the litho '
                                   'default.'],
                                  ['May-June 1968 Atelier Populaire poster - one-colour screenprint, gum '
                                   'block-out',
                                   '1968 · sourced · Screenprint: glue, tusche or paper stencil',
                                   'From 15 May 1968 the workshop printed by hand screen with no '
                                   "photographic means: 'no half-tone, flat, and one colour per poster', the "
                                   'silk blocked out with gum arabic (Rougemont 1988). Black, blue, dark '
                                   'blue and red are seen on V&A examples of 51 x 32 to 79 x 63 cm, on '
                                   'newsprint or white paper (V&A O25674, O25675, O1664242). Mesh, ink and '
                                   'run sizes were not found; the paint colours are estimates.']]},
                        {'title': 'Germany',
                         'rows': [['1900-1925 picture postcard - collotype (Lichtdruck)',
                                   'c.1900-1925 · partly sourced · Collotype',
                                   'German picture postcards were printed by collotype (Lichtdruck) from '
                                   'about 1900 to 1925 (German Wikipedia, Ansichtskarte). Tone sits in '
                                   'reticulated gelatin with polygons about 0.10-0.15 mm across and no '
                                   'screen (Getty Atlas). Ink colour and card stock for German cards were '
                                   'not found; the white card and black ink are estimates.'],
                                  ['1905-1914 Berlin Sachplakat - three or four flat colours on a dark '
                                   'ground',
                                   '1905-1914 · sourced · Lithography: drawn on stone or zinc',
                                   "Hollerbaum and Schmidt's Berlin object posters: flat-colour stone "
                                   'lithography on a sheet of about 70 x 95 cm, in as few as three or four '
                                   "colours, for example 'white, ochre, and red on a black ground' (V&A "
                                   'O1034507). Inks snap to those four; the white may have been bare paper. '
                                   'No crayon or spatter is described, so tints print flat. Pigments, paper '
                                   'and the tight register are estimates.'],
                                  ['1907-1913 Berlin pictorial poster - eight to eleven flat colours',
                                   '1907-1913 · sourced · Lithography: drawn on stone or zinc',
                                   'Pictorial posters from the same Berlin house in eight to eleven flat '
                                   "colours, for example 'brown, turquoise, two shades of blue, yellow, "
                                   "orange, pink, grey, green and buff', on a sheet of about 70 x 93 cm (V&A "
                                   "O1034334, O1034456). The artwork's own colours are kept and a picture is "
                                   'cut into eight flats, the most the engine allows. Paper was not found; '
                                   'register and flat tints are estimates.'],
                                  ['1919-1932 political poster - lithograph in red and black on cream',
                                   '1919-1932 · sourced · Lithography: drawn on stone or zinc',
                                   "A political poster of about 1926 catalogued as a 'lithograph in red and "
                                   "black' on a creamy ground, 85.9 x 61.3 cm (V&A O76445); Kollwitz's "
                                   'posters are likewise catalogued simply as lithographs. Whether drawn on '
                                   'stone or zinc, and the paper stock, are not recorded: cream wove, '
                                   'vermilion for the red and the crayon grain are estimates.'],
                                  ['1925-1932 Bauhaus Dessau jobbing print - letterpress in red and black',
                                   '1925-1932 · partly sourced · Letterpress: fine (art paper)',
                                   'The Bauhaus printing workshop at Dessau set in Schelter and Giesecke '
                                   'grotesque (Futura from 1927) with rules, bars and halftone blocks, and '
                                   "'mostly used the inks red and black' (German Wikipedia, "
                                   'Bauhausdruckerei). Paper, sheet sizes and halftone ruling were not '
                                   'found: hard-packed printing on imitation art paper, a 120-line screen '
                                   'and vermilion for the red are estimates.'],
                                  ['1925-1930 New Typography lecture poster - blue and black on grey paper',
                                   'c.1925-1930 · partly sourced · Letterpress: jobbing (platen)',
                                   "Tschichold's lecture poster 'Neues Bauen', mid-1920s: 'blue and black "
                                   "lettering on grey paper', 43.2 x 58.0 cm, close to DIN A2 (V&A "
                                   'O1105177). The record gives no process, so letterpress is taken from his '
                                   '1930 poster. The exact blue, the grey of the paper and the press '
                                   'settings are estimates.'],
                                  ['1927-1945 pictorial poster - colour lithography on DIN A1',
                                   '1927-1945 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Colour-lithographed posters on DIN A1-class sheets: Hohlwein at about 60 '
                                   'x 84-88 cm in 1927-29 and a wartime party poster at exactly 59.4 x 84.2 '
                                   'cm (V&A O748843, O115124). Colour lithography stayed the German poster '
                                   'standard until after 1945 (German Wikipedia, Plakat). Colours, paper and '
                                   'whether the plates were hand-drawn are not recorded; six flats, crayon '
                                   'tints and poster paper are estimates.'],
                                  ['1930 New Typography poster - letterpress, black and red on white, DIN A2',
                                   '1925-1933 · sourced · Letterpress: jobbing (platen)',
                                   "Tschichold's 'Plakate der Avantgarde', 1930: 'letterpress printed poster "
                                   "in black and red on white paper', 42.4 x 59.8 cm, a DIN A2 sheet (V&A "
                                   'O1105176); DIN sizes were introduced in 1923. The paper stock, the '
                                   'pigment of the red and the press settings are estimates, set as for '
                                   'jobbing letterpress.'],
                                  ['1932-1933 photomontage poster - rotogravure',
                                   '1932-1933 · partly sourced · Rotogravure',
                                   "Heartfield's photomontages were distributed as rotogravure posters in "
                                   'the streets of Berlin in 1932-33 (Wikipedia, John Heartfield). Size, ink '
                                   'colour, paper and screen were not found: the 150-line conventional '
                                   'screen is the British and American figure (Tarr 1949; Hackleman 1921), '
                                   'and the poster paper and black ink are estimates.'],
                                  ['1968-1980s spot-colour offset - premixed HKS inks',
                                   '1968-1989 · inferred · Offset lithography',
                                   'Built from a specification only: HKS premixed spot inks, 88 base colours '
                                   'defined in 1968 by three German ink makers for coated and uncoated '
                                   "papers (German Wikipedia, HKS). No dated poster was found. The artwork's "
                                   'own colours stand in for the HKS inks, whose values were not found; '
                                   'three flats per picture and brightened uncoated paper are estimates.'],
                                  ['1970s political poster - colour offset lithography',
                                   '1970-1980s · partly sourced · Offset lithography',
                                   "Staeck's political posters of 1970-74 are catalogued as offset and "
                                   'colour offset lithographs (V&A O116759, O116749); after 1945 '
                                   'photo-offset and screenprint replaced colour lithography for German '
                                   'posters (German Wikipedia, Plakat). Euroskala process inks were '
                                   'standardised in 1971 (DIN 16539) but their values were not found: the '
                                   '1993 measured set, the 150-line screen and the coated paper are '
                                   'stand-ins.']]},
                        {'title': 'Norway',
                         'rows': [['1880s Norwegian provincial bill - letterpress',
                                   'c.1880-1900 · inferred · Letterpress: wood letter poster',
                                   "In a sample of the National Library of Norway's 1880s poster records the "
                                   "printers named are provincial letterpress houses ('Bogtrykkeri'), so "
                                   "these are typographic bills; that reading is the strand's own inference "
                                   'from catalogue records. Colours, paper and sizes were not found: wood '
                                   'letter on thin bill paper is assumed from British practice of the same '
                                   'date.'],
                                  ['1900s Kristiania poster - colour lithograph',
                                   '1893-1939 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Colour lithography from the Kristiania (Oslo) houses named on National '
                                   'Library of Norway records: A. Worner (17 posters, 1897-1929, all '
                                   'lithography), Kristiania lithografiske Aksjebolag, Hagen and Kornmann, '
                                   'and Norsk lithografisk Officin for the State Railways in the 1930s. A '
                                   '1920s travel poster in the V&A (O754292) is a colour lithograph of 101 x '
                                   '62.9 cm. Number of printings, colours and paper were not found; grain, '
                                   'register and stock are estimates.'],
                                  ['1920s Stavanger sardine label - red, gold and dark blue',
                                   'c.1900-1960 · partly sourced · Lithography: drawn on stone or zinc',
                                   "Stavanger sardine-can labels ('iddiser') as catalogued on DigitaltMuseum "
                                   '(4,567 records; Dreyer, Stavanger Litografiske Anstalt and others), in '
                                   'schemes such as red and gold with white and black, or red, dark blue and '
                                   "gold. Lithography is the museum's framing: which labels were stone and "
                                   'which offset is not catalogued, and sizes and paper were not found. Ink '
                                   'colours are estimates for the hues named, as are the fine stipple and '
                                   'smooth label paper.'],
                                  ['1942 illegal newssheet - typed stencil duplicator',
                                   '1940-1945 · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   "More than 300 illegal papers appeared in occupied Norway, 'maskinskrevne "
                                   "eller (oftest) stensilerte' (Store norske leksikon); one Bergen paper "
                                   'ran 200-300 copies two or three times a week, and in December 1942 the '
                                   'ink froze and had to be thawed, making quality very poor (Norwegian '
                                   'Wikipedia). Black from a typed stencil is sourced; the paper was not '
                                   'found, and the thin uneven inking and slight show-through are '
                                   'estimates.'],
                                  ['1947 State Railways photo poster - gravure',
                                   '1947 · partly sourced · Rotogravure',
                                   'A Norwegian State Railways poster of 1947 printed by Emil Moestue from a '
                                   'photograph is catalogued by the National Library of Norway as gravure '
                                   "('Dyptrykk'). Nothing else is recorded: ink colour, number of colours, "
                                   "cell ruling, paper and size were not found, so this is the engine's "
                                   'conventional gravure (150 lines, from British sources) in one dark ink '
                                   'on an uncoated poster stock, all of it estimate.'],
                                  ['1950s Norwegian weekly - three-colour gravure',
                                   '1950s · partly sourced · Rotogravure',
                                   "Alle Kvinners Blad in its 1950s heyday was 'trykket i dyptrykk i tre "
                                   "farger', printed by gravure in three colours (Store norske leksikon). "
                                   'Which three inks is not stated: yellow, red and blue are assumed. Cell '
                                   'ruling and paper were not found; 150 lines and supercalendered paper '
                                   'follow British practice (Tarr 1949) and are estimates here.'],
                                  ['1953 Norwegian travel poster - offset from a colour photograph',
                                   '1950-1965 · partly sourced · Offset lithography',
                                   'State Railways and travel posters of the 1950s were mostly offset by '
                                   'Grondahl and Son (13 of 16 catalogued records): a 1951 poster in the V&A '
                                   "(O591858) is imprinted 'Offset by Grondahl & Son' and measures 100 x "
                                   "61.6 cm, and a 1953 one was printed 'from a colour photo'. Four-colour "
                                   'process is presumed, not stated; screen ruling and paper were not found, '
                                   'so the 133-line screen (an American figure of 1943) and the cartridge '
                                   'stock are estimates.']]},
                        {'title': 'USSR',
                         'rows': [['1880s chromolithographed lubok - Sytin type',
                                   '1876-1917 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Popular prints and calendars of the kind Sytin issued from his Moscow '
                                   'lithography from 1876: hand-drawn chromolithography with a separate '
                                   'stone for each colour, each first given a key outline (Great Soviet '
                                   'Encyclopaedia). Colours, number of stones, paper and sizes were not '
                                   'found, so the chalk grain, loose register and cheap thin paper are all '
                                   'estimates.'],
                                  ['1920 ROSTA window, Moscow - hand stencil',
                                   '1920-1921 · sourced · Stencil and brush (pochoir, ROSTA, TASS)',
                                   'Moscow ROSTA windows were multiplied by hand through stencils cut from '
                                   "cardboard in two or three colours, in editions of '150 or more' (Great "
                                   "Soviet Encyclopaedia) or about 300 (Cheremnykh's memoir, which mentions "
                                   "glue in the paint); a surviving window is 'colour stencil on paper', 151 "
                                   'x 100.9 cm (V&A O74913). Paper and paint were not analysed in any source '
                                   'read: the thin paper, brush marks and loose hand register are '
                                   'estimates.'],
                                  ['1923 Constructivist journal - letterpress with line and halftone blocks',
                                   '1923-1930 · sourced · Letterpress: jobbing (platen)',
                                   'LEF (1923) is catalogued by MoMA as letterpress cover, text and '
                                   'illustrations, page 23.3 x 15.5 cm (MoMA 15160); SA (1926-30) is '
                                   "'journal, letterpress printed' at about 30 x 23 cm. One or two colours "
                                   'from type-case material and blocks. Paper and halftone ruling were not '
                                   'found: the 85-line screen is an estimate and the stock is taken from a '
                                   'much later standard (GOST 9095-73).'],
                                  ['1927 Stenberg film poster - drawn lithograph on poor paper',
                                   '1926-1929 · sourced · Lithography: drawn on stone or zinc',
                                   'Film posters of 1926-29 drawn after projected photographs, not screened '
                                   "from them, 'cheaply printed on poor-quality paper' in runs of "
                                   '10,000-20,000 at about 100-108 x 69-72 cm, in bright reds, blues, '
                                   'oranges and greens with heavy black (Mount, MoMA 1997). That catalogue '
                                   "calls them offset lithographs and MoMA's database mostly lithographs; "
                                   'the conflict is unresolved and drawn lithography is used here. Ink '
                                   'colours, grain and register are estimates.'],
                                  ['1929 typographic theatre poster - letterpress, 108 x 72 cm',
                                   '1923-1931 · partly sourced · Letterpress: wood letter poster',
                                   'Typographic theatre and exhibition posters catalogued by MoMA as '
                                   "letterpress: Rodchenko's 'Bedbug' (1929, 108.3 x 72.4 cm, MoMA 6541) and "
                                   "Gan's architecture exhibition poster (1928, 107.3 x 70.5 cm). Colours "
                                   'were not counted and paper was not found. Wood letter is assumed for '
                                   'type of this size, and the stock is an estimate from a later standard '
                                   '(GOST 9095-73).'],
                                  ['1930 Five-Year-Plan photomontage poster - red and black',
                                   '1929-1932 · partly sourced · Lithography: drawn on stone or zinc',
                                   'Photomontage posters by Klutsis and Kulagina, catalogued by MoMA as '
                                   'lithographs at about 104.5 x 74 cm; one in the V&A (O76004) is '
                                   "'half-tone letterpress and colour lithograph', 'printed in red and "
                                   "black'. How the photographs were carried on the lithographed sheets is "
                                   'not stated and no screen ruling was found: the 60-line square-dot screen '
                                   'is an estimate for a sheet of this size, as are the ink colours and '
                                   'paper.'],
                                  ['1930s USSR in Construction - rotogravure',
                                   '1930-1941 · partly sourced · Rotogravure',
                                   "'USSR in Construction' is catalogued by MoMA as 'journal, photogravure "
                                   "printed', page about 41.5 x 29.6 cm (MoMA 26504); Russian Wikipedia says "
                                   'it was printed on a rotogravure press in runs of 25,000-60,000. Ink '
                                   'colour, cell ruling and paper were not found: one dark ink, the 150-line '
                                   'screen and supercalendered paper are estimates from British gravure '
                                   'practice.'],
                                  ['1942 TASS window, small lithographed edition - black, blue, grey and red',
                                   '1942 · sourced · Lithography: drawn on stone or zinc',
                                   'Small printed versions of TASS windows: colour lithographs of only 30-41 '
                                   "x 19-27 cm, one of them 'printed in black, blue, grey and red' at 41.4 x "
                                   '27.5 cm (V&A O11931). Process, colours and size come from the museum '
                                   'records; the ink colours are estimates for those four names, and paper '
                                   'and chalk grain were not found.'],
                                  ['1943 TASS window - brush stencil on newsprint',
                                   '1941-1945 · sourced · Stencil and brush (pochoir, ROSTA, TASS)',
                                   "'Multicolor brush stencil on newsprint (pieced)': glue paints brushed by "
                                   'hand through stencils, some designs needing 60 to 70 stencils and colour '
                                   'divisions, in editions of 50 to 1,500 (Art Institute of Chicago); the '
                                   "Great Soviet Encyclopaedia says '10-12 and more' colours. Median size "
                                   '159 x 87 cm from 152 records. The conservation analysis of paint and '
                                   'paper was not read, so brush marks, edge and hand register are '
                                   'estimates.'],
                                  ['1950s central newspaper - rotary letterpress, 30 lines per cm',
                                   '1934-1980s · inferred · Letterpress: rotary newspaper',
                                   'Central papers of the Pravda format (420 x 594 mm), rotary letterpress '
                                   'from stereotypes with zinc halftones. Built from specifications, not a '
                                   'measured page: the Great Soviet Encyclopaedia gives 24 lines per cm as '
                                   'the coarse end of halftone rulings, and GOST 6445-74 newsprint (45-48.8 '
                                   'g/m2, whiteness about 60% at best) allows up to 36-40. 30 lines per cm '
                                   '(76 lpi) is a choice inside that range; the ruling any paper actually '
                                   'used was not found.'],
                                  ['1970s state poster - four-colour offset on No. 2 paper',
                                   '1960s-1989 · inferred · Offset lithography',
                                   'State-published posters by offset, built from specification only: GOST '
                                   '9094-89 offset paper No. 2 is 65-77% white with a low machine finish, '
                                   "and the Great Soviet Encyclopaedia says offset's thin ink films were "
                                   'helped by extra blue and red inks, which the engine cannot add to its '
                                   'four. No process-ink standard, poster size or screen ruling was found; '
                                   '48 lines per cm (122 lpi) is an estimate inside the 24-60 the '
                                   'encyclopaedia gives for planographic work.'],
                                  ['1970s samizdat typescript - carbon copy',
                                   'late 1950s-1980s · inferred · Spirit duplicator (Banda, Ditto)',
                                   'Typewritten samizdat multiplied with carbon paper on thin or tissue '
                                   'paper, one side only, three to five legible copies at a typing '
                                   '(University of Toronto; Russian Wikipedia; GOST 489-88 for carbon paper, '
                                   'GOST 8854-75 for a pica pitch of 2.54-2.6 mm). The engine has no '
                                   'carbon-copy process: this borrows the spirit-duplicator model with a '
                                   'violet-black deposit. The softness and breaking-up of the stroke are '
                                   'estimates, not measurements.']]},
                        {'title': 'Japan',
                         'rows': [['1850s nishiki-e - water-based woodblock',
                                   'to c.1864 · sourced · Woodblock, water-based (Japan)',
                                   'Full-colour woodblock printed by hand with a baren in water-based colour '
                                   'on mulberry (kozo) paper, oban sheet 38 x 25.5 cm, from up to about '
                                   'twenty blocks (Met Museum; Wikipedia). Safflower red (beni) and imported '
                                   'Prussian blue are named in the sources; the yellow, green and red-brown '
                                   'in the ink set, and all the ink colours, are estimates. Hand-wiped '
                                   'gradation (bokashi) is not generated: draw it as a soft-edged layer and '
                                   'it prints as continuous tone.'],
                                  ['1870s Meiji nishiki-e - carmine red and aniline purple',
                                   '1869-1889 · partly sourced · Woodblock, water-based (Japan)',
                                   'Meiji colour woodblock with the imported colourants dated by analysis of '
                                   '57 prints (Cesaratto et al., Heritage Science 2018): rosaniline from '
                                   '1864, cochineal carmine as the main red from 1869, methyl violet from '
                                   "1875, eosin from 1877. The change was 'gradual and selective', so one "
                                   'palette for two decades is a simplification. Ink colours are estimates '
                                   'for the dyes named; the number of blocks was not found.'],
                                  ['1890s late Meiji nishiki-e - reds that bleed',
                                   '1889-1898 · partly sourced · Woodblock, water-based (Japan)',
                                   "From 1889 naphthol reds appear in woodblock prints and are 'notably "
                                   "water-soluble, bleeding through paper' (Cesaratto et al., Heritage "
                                   'Science 2018). The engine spreads every colour sideways into the sheet, '
                                   'not the reds alone, and does not show the stain on the back; the amount '
                                   'of bleed is an estimate, since the source gives no measurement. Ink '
                                   'colours are estimates, and block counts were not found.'],
                                  ['1890s Osaka hikifuda handbill - machine-printed woodblock, red and green',
                                   '1880s-1900s · partly sourced · Woodblock, water-based (Japan)',
                                   'New Year advertising handbills mass-produced in Osaka in the 1880s-90s '
                                   'by machine-printed colour woodblock, about 26 x 38 cm, in a palette '
                                   "centred on red and green, with each shop's name overprinted locally "
                                   '(Okayama City; an Edo-Tokyo Museum example of 1904 is 25.8 x 37.5 cm). '
                                   'What the machine was, the ink and the paper were not found: firmer, more '
                                   'even printing than hand baren work on machine-made paper is assumed, and '
                                   'ink colours are estimates.'],
                                  ['1911 Mitsukoshi-type poster - hand-separated lithograph in many colours',
                                   'c.1900-1919 · sourced · Lithography: drawn on stone or zinc',
                                   'Hand-separated lithographed posters of about 90 x 60 cm with no halftone '
                                   'screen: a 1911 Mitsukoshi poster was printed from stone in 35 colours '
                                   "(Internet Museum), and platemakers recall 'at least 10 colours, 15, "
                                   "sometimes 20' as normal (JFPI oral history 31). Each flat layer of the "
                                   'artwork is one working; a picture layer is built from four stippled inks '
                                   'only, far fewer than the real count. Paper was not found; ink colours '
                                   'and stipple size are estimates.'],
                                  ['1924 offset poster or magazine cover - HB process, 133-line screen',
                                   '1919-c.1937 · partly sourced · Offset lithography',
                                   'Photo-litho offset as worked in Japan from 1919-20 (the American HB '
                                   'process at Ichida Offset and Toppan): a screened image with separations '
                                   'still retouched by hand, in more than four printings, on posters of '
                                   'about 92 x 62 cm. One Tokyo printer recalled 133 lines as the screen '
                                   "'generally used' for magazine covers in the 1920s (JFPI oral history 5). "
                                   'The engine prints four colours; the ink colours (an early red and blue '
                                   'set) and the paper are estimates.'],
                                  ['1947 kasutori magazine - letterpress on senka-shi',
                                   '1946-1950 · partly sourced · Letterpress: jobbing (platen)',
                                   'Kasutori pulp magazines of 1946-50, B5, on senka-shi: a waste-based '
                                   'paper ranked below ordinary rough paper, quick to decay, with the '
                                   'printing on the back visible from the front (Kotobank; Japanese '
                                   "Wikipedia). Letterpress text in one colour is the strand's reading and "
                                   'the cover process was not found. The 85-line screen is an encyclopaedia '
                                   'figure for general magazines; the colour and weight of the paper were '
                                   'not found and are estimates.'],
                                  ['1966 B1 theatre poster - silkscreen',
                                   '1965-1988 · partly sourced · Screenprint: knife-cut film stencil',
                                   'B1 posters (about 728 x 1030 mm) by Yokoo are recorded as silkscreen in '
                                   "1966 (a dealer's description, about one hundred impressions) and 1988 "
                                   '(MoMA), while one of 1971 is offset, so the process goes with the job '
                                   'and not the designer. Colours, stencil type, mesh and paper were not '
                                   'found: a cut-film or photo stencil, opaque poster colours and white '
                                   'paper are estimates.'],
                                  ['1970s gariban sheet - hand-cut wax stencil',
                                   '1894-1980s · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   'Toshaban or gariban: a wax-coated ganpi tissue stencil cut by hand with '
                                   'an iron stylus on a file plate and printed with a roller through a '
                                   'silk-covered frame, one colour per stencil, in schools and small groups '
                                   'until the 1980s (Kotobank). No Japanese description of the printed mark, '
                                   'ink or paper was found: the general stencil-duplicator model is used, '
                                   'with black ink and rough absorbent paper as estimates.'],
                                  ['1971 B1 or B2 poster - offset on white wove paper',
                                   '1950s-1980s · partly sourced · Offset lithography',
                                   'Post-war posters on JIS B sheets: B2 (515 x 728 mm) for film posters, B1 '
                                   '(728 x 1030 mm) for design posters. A 1971 B1 poster is catalogued as '
                                   'offset lithograph on white wove paper (Cooper Hewitt); for film posters '
                                   'only the size is documented, by a dealer. Four-colour process and the '
                                   '150-line screen (an encyclopaedia figure for covers) are estimates; '
                                   'Japan had no process-colour standard before the 1990s, so the inks are '
                                   'the late American set.']]},
                        {'title': 'India',
                         'rows': [['1860s Battala woodcut - black with red, yellow and green',
                                   '1840s-1890s · sourced · Relief block: lino or woodcut',
                                   'Calcutta Battala relief prints: cut on wood, printed in black on a very '
                                   "light paper 'like modern newsprint' and coloured by hand in red, yellow "
                                   'and green only, about 25 x 39 cm (Paul 1983). The engine prints the '
                                   'three colours as loosely registered blocks; real hand colour was brushed '
                                   'on in broad strokes and is not modelled. The pigments are not named in '
                                   'the source, so the ink colours are estimates.'],
                                  ["1870s Lucknow lithographed page - scribe's hand on badami paper",
                                   '1858-c.1900 · sourced · Lithography: drawn on stone or zinc',
                                   "Urdu and Persian text lithographed from a scribe's hand: written in "
                                   'greasy ink on transfer paper, laid down on German stone and pulled on '
                                   'hand scraper presses, about a thousand impressions a day per press, as '
                                   'at the Naval Kishore Press, Lucknow (Stark, An Empire of Books, quoting '
                                   "an 1880 account). Paper was thin Indian 'badami' (half-bleached) or "
                                   'imported white, all acidic. Black ink is sourced; the paper colour, scum '
                                   'and show-through are estimates.'],
                                  ['1880 Calcutta Art Studio print - single-colour lithograph',
                                   '1878-c.1885 · sourced · Lithography: drawn on stone or zinc',
                                   'The earliest Calcutta Art Studio prints (from 1878) are single-colour '
                                   'stone lithographs finished by hand: the Met catalogues 1878-83 examples '
                                   "as 'lithograph with watercolor and glaze', and V&A examples of about "
                                   '1880 measure 25.5 x 33 cm (O101661). Only the printed stone is modelled; '
                                   'the hand colour and glaze are not. Chalk grain and paper are estimates. '
                                   'True chromolithographs followed from about 1885.'],
                                  ['1895 Ravi Varma Press oleograph - stipple chromolithograph',
                                   '1894-c.1955 · sourced · Lithography: drawn on stone or zinc',
                                   'Oleographs from the Ravi Varma Press: German steam flat-bed stone '
                                   'presses, drawn almost wholly in stipple, printed in fourteen colours '
                                   '(cut to seven for cheaper work after 1901), darkly varnished and '
                                   'sometimes embossed with a canvas grain, at 70 x 50, 50 x 36 and 35 x 25 '
                                   'cm (Neumayer and Schelberger). The engine builds a picture from four '
                                   'stippled inks, not fourteen, and does not model varnish or emboss. '
                                   'Paper, ink colours and the size of the stipple are estimates.'],
                                  ["1920s Manchester shipper's ticket for India - chromolithograph",
                                   'c.1880-1935 · sourced · Lithography: drawn on stone or zinc',
                                   "Labels for cloth shipped to India, chromolithographed in Manchester: 'at "
                                   "least eight colors', one stone each, in pigment inks on gummed paper, "
                                   'varnished, with a narrow gold border, from about 102 x 76 mm to 301 x '
                                   "203 mm, until 'mechanical' printing came in the mid-1930s (Meller). Hues "
                                   "other than the gold are not listed, so the artwork's colours are kept. "
                                   'The fine stipple, tight register and smooth stock are estimates; the '
                                   'varnish is not modelled.'],
                                  ['1940s Sivakasi matchbox label - stone litho, black key and dotted shade',
                                   '1928-1960s · partly sourced · Lithography: drawn on stone or zinc',
                                   'Matchbox and firework labels lithographed from stone in Sivakasi from '
                                   "1928: older labels 'bear the traces of the lithographic process, with "
                                   "their bold black outlines, flat colors and dotted areas of shade' (Jain, "
                                   'India Bazaar). The number of colours, the paper and label sizes were not '
                                   "found; the strand's guess of three to five flat colours, the coarse "
                                   'dotted tint, loose register and uncoated paper are all estimates.'],
                                  ['1950s Bombay film poster - hand-drawn lithograph, 30 x 40 in',
                                   '1940s-1980s · partly sourced · Lithography: drawn on stone or zinc',
                                   'Bombay film posters drawn by hand for lithography on stone and later '
                                   "zinc, from the 1920s to the late 1980s; V&A examples are 'lithograph on "
                                   "paper' at 76 x 51 cm (1948, O61789) and 102 x 76 cm (1980, O68581), the "
                                   'British double crown and quad crown sheets. A dealer describes the paper '
                                   'as thin and low in quality. The number of printings and the colours were '
                                   'not found; grain, register and ink weight are estimates.'],
                                  ['1960s Sivakasi calendar picture - six-colour photo-offset',
                                   '1950-1989 · sourced · Offset lithography',
                                   'Sivakasi calendar and framing pictures: photo-offset from separations '
                                   'heavily retouched by hand, printed with two blues and two reds as well '
                                   "as yellow and black, on matte 'map litho' or glossy art paper with gold "
                                   'powder, at 20 x 30, 30 x 40 and later 16 x 22 in (Jain, Gods in the '
                                   'Bazaar). The engine separates a picture into four of those six inks. '
                                   'Screen ruling was not found (133 is the engine default); the raised '
                                   'contrast stands in for the retouching.'],
                                  ['1960s calendar overprint - local letterpress',
                                   '1950s-1989 · partly sourced · Letterpress: jobbing (platen)',
                                   "The client's name and address added to a mass-printed Sivakasi calendar "
                                   'by a local letterpress shop from hand-set lead type and photographic '
                                   'blocks, in the blank panel left at the foot; letterpress suits runs of a '
                                   'few hundred where offset needs a thousand (Jain, Gods in the Bazaar). '
                                   "One colour is the strand's reading. The ink colour, the wear of the type "
                                   'and the platen settings are estimates.'],
                                  ['1970s Bombay film poster - photo-offset of overpainted stills',
                                   'c.1955-1989 · partly sourced · Offset lithography',
                                   "Film posters imprinted 'Photo Offset Printed by' Bombay presses such as "
                                   'Dnyansagar Litho Press, about 100 x 74 cm: stills cut out, arranged and '
                                   'overpainted in oil, often with a knife, then photographed and printed by '
                                   'offset (Living Pictures 2005; Dwyer and Patel). Four colours is the '
                                   "strand's estimate; screen ruling and paper were not found, so the "
                                   '100-line screen, heavy dot gain and thin poor paper are estimates.'],
                                  ['1970s Bangalore street poster - two hand-drawn zinc plates, seven inks',
                                   '1971-2019 · partly sourced · Lithography: drawn on stone or zinc',
                                   'A Bangalore shop (1971 to about 2019) drew street posters by hand and '
                                   'printed them from two zinc plates, one inked in black, blue and dark '
                                   'green and the other in red, orange, yellow and lime green, on thin paper '
                                   '(Poster House). The engine makes each ink its own plate, so colours that '
                                   'shared a plate can drift apart here as they could not on the press. '
                                   'Sheet size was not found; ink colours, grain and register are '
                                   'estimates.']]},
                        {'title': 'Street and office',
                         'rows': [['Hectograph - violet dye from a gelatin pad',
                                   '1870s-1970s · partly sourced · Hectograph (gelatin pad)',
                                   'Aniline dye lifted from a gelatin pad onto smooth, heavily finished '
                                   "paper: 'violet or blue', good for roughly 20 to 100 copies, each fainter "
                                   '(PSAP; Desborough 1917). Several colours came off one master in one '
                                   'operation (Desborough 1917), so there is no misregister. Dye hues, edge '
                                   'softness and the paper colour are estimates: no copy was measured.'],
                                  ['Stencil duplicator, oil ink (Gestetner type)',
                                   '1881-1970s · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   "Typed or drawn wax stencil with 'carbon and oil' ink on absorbent paper "
                                   "(Desborough 1917): a 'clotted or stippled appearance', an oil halo and "
                                   'closed characters filling in (PSAP). Everything prints in the one black, '
                                   'from one stencil, so there is no misregister. Halo width and stroke gain '
                                   'were not found and are estimates, as is the paper colour.'],
                                  ['Rubber hand stamp, aniline ink',
                                   'c.1890 on · inferred · Aniline (flexographic) on bags',
                                   'Stamp-pad ink was aniline dye in glycerine (methyl violet, fuchsin red, '
                                   'methyl green and others: Sloane 1891), the same dye family as spirit '
                                   'copies; in 1934 stamp ink was still named as until lately the main '
                                   'printing use of aniline dyes (British and Colonial Printer 1934). The '
                                   'mark itself is not described in any source read: the uneven, starved '
                                   "impression is general knowledge applied to the engine's rubber-plate "
                                   'model. Later dates of use were not researched.'],
                                  ['Stencil duplicator, water ink (Roneo type)',
                                   '1906-1970s · partly sourced · Stencil duplicator (Gestetner, Roneo, '
                                   'mimeograph)',
                                   "Water and glycerine inks 'dry more rapidly and without a halo of oil "
                                   "round the letters', where oil gives 'a deeper black' (Desborough 1917); "
                                   'Roneo listed inks in 12 colours by 1964 (Roneo price list 1964). That '
                                   "the copy looks greyer is the researchers' inference. A second colour "
                                   'needed a second stencil and pass: its register was not found and is an '
                                   'estimate, like the ink colours and stroke gain.'],
                                  ['Spirit duplicator (Banda, Ditto) - fresh copy',
                                   '1923-1970s · partly sourced · Spirit duplicator (Banda, Ditto)',
                                   "Aniline dye dissolved off a master by spirit: 'most often purple' "
                                   "(crystal violet), text 'fuzzy or ghostly, lacking crisp edges', on "
                                   'heavily finished paper (PSAP). One to five colours print at once from '
                                   'one master (Heyer catalogue 1964), so there is no misregister. Hue, edge '
                                   'softness and banding amounts are estimates; white bond smoothed towards '
                                   'the glossy stock PSAP describes is the nearest paper.'],
                                  ['Spirit duplicator - faded copy',
                                   '1923-1970s · partly sourced · Spirit duplicator (Banda, Ditto)',
                                   "The same copy after light: spirit dyes 'can fade to illegibility in less "
                                   "than a month' in direct sun (Wikipedia, Spirit duplicator) and the paper "
                                   'yellows and embrittles (PSAP). How far a given sheet has gone is a '
                                   'matter of its history, so the fade and yellowing amounts are estimates; '
                                   'no faded copy was measured for hue.'],
                                  ['Small offset and instant print',
                                   'c.1945-1980s · partly sourced · Small offset (duplicator, instant print)',
                                   'Multilith and Rotaprint office machines (Multilith on sale from 1933-34) '
                                   "took 'bread and butter work from the letterpress jobbing printer' from "
                                   '1945 (Gennard 1990, snippet); franchised instant print followed from '
                                   "1971-78. Early office litho is 'difficult to differentiate from stencil "
                                   "copies' (PSAP). Scum, uneven inking and hickeys are named offset faults "
                                   '(Graphics Atlas; PrintWiki), but their amounts here, and the paper, are '
                                   'estimates.'],
                                  ['Thermofax copy, browned',
                                   '1950-1980s · inferred · Spirit duplicator (Banda, Ditto)',
                                   "Heat copy on thin coated paper: a 'browned recto (appearing burnt)', "
                                   "edges 'slightly feathered, lower contrast', waxy, darkening within about "
                                   'five years (PSAP). The engine has no thermal process, so this borrows '
                                   "the spirit duplicator's stain-in-the-paper model with a brown-black "
                                   'image, and shows the sheet as found, already browned. Image colour, '
                                   'paper colour and softness are all estimates.'],
                                  ['Electrofax copy on zinc-oxide paper',
                                   '1954-1980s · partly sourced · Photocopier, 1970s-80s',
                                   "Image formed directly on paper 'coated with a shiny layer of finely "
                                   "divided white pigment (zinc oxide)': 'gray-black', low in contrast, on a "
                                   'faintly grey or bluish ground (PSAP). Liquid toner meant most machines '
                                   "'could only produce a dark gray' (Wikipedia, Electrofax). How its solids "
                                   "developed was not found, so the later copier's behaviour is borrowed; "
                                   'image and paper colours are estimates.'],
                                  ['Early xerographic copy (914 type) - hollow solids',
                                   '1960-1970s · partly sourced · Xerography, early (914 era)',
                                   "Solids come out 'black or dark adjacent to their edges and light or "
                                   "white at the central areas' (Haloid patent, filed 1954), still the "
                                   'stated problem in a Xerox patent of 1969; thin lines and characters '
                                   'copied well. The 914 shipped from March 1960 and was made in Britain by '
                                   "1961 (Grace's Guide). Plain paper. The width of the dark edge band, "
                                   'copier resolution and background specks were not found and are '
                                   'estimates.'],
                                  ['Letraset and typewriter paste-up by small offset',
                                   '1961-1980s · inferred · Small offset (duplicator, instant print)',
                                   'Dry-transfer lettering (Letraset, 1961) and strike-on text shot as line '
                                   "and run on a small offset press. The letters 'break and crinkle' (Eye "
                                   'magazine); nicked, chipped edges stand in for that here. Baseline wander '
                                   'and fixed-pitch spacing are geometric and must be in the artwork itself: '
                                   'the engine cannot add them. That these defects survive reproduction is '
                                   "the researchers' inference, and all amounts are estimates."],
                                  ['Late-1970s photocopier',
                                   'c.1975-1989 · inferred · Photocopier, 1970s-80s',
                                   "'High contrast with poor intermediate tones' (Nicholson 1989); a 1979 "
                                   'Xerox patent set a target solid density of 1.1, so solids now fill, '
                                   'though unevenly, and good 1974 office copies measured print contrast of '
                                   '0.85-0.94 (NBSIR 74-498). Built from those specifications and no '
                                   'measured copy: the residual hollowing, specks and banding are '
                                   'estimates.'],
                                  ['Photocopy of a photocopy - generation loss',
                                   'c.1976-1989 · inferred · Photocopier, 1970s-80s',
                                   "The fanzine and flyer look from 1976: 'image noise and artifacts' build "
                                   "up with successive copying at high contrast (PSAP), and punk flyers' "
                                   "toner smears 'made these images literally darker' (JSTOR Daily). "
                                   'Thickened then broken strokes and gathering specks are stated only in '
                                   'words by the sources; no figure for change per generation was found, so '
                                   'every amount here is an estimate.']]}]},
              {'label': 'rebuilding',
               'type': 'notes',
               'data': ['Source: the plugin folder. Research, measurements, test harness and the preset '
                        'source files: PrintLook-References in the APA project (_research, _notes, '
                        '_toolkit).',
                        'The looks are generated: edit _toolkit/presets/part_*.js, run `node '
                        "build_presets.js`, then zip the plugin folder's contents as PrintLook.ccx."]}]})


ITEMS.append({
    "slug": "look-cookbook",
    "name": "Look Cookbook",
    "kind": "Recipe book",
    "app": "Photoshop",
    "author": "Claude",
    "status": "Working",
    "tagline": "Recipes for FilmLook and VideoLook, alone and chained: kitchen-sink titles, "
               "community cable, video art, artists' film and video-to-film oddities.",
    "blurb":
        "Starting points rather than reconstructions. Each recipe names the plugin (or the "
        "order of the two), the look or settings to start from, and what rests on what: "
        "where a source is single or a setting is a judgement, it says so. Control names "
        "are as printed on the panels. Some things these plugins can't do yet (magnet-bent "
        "pictures, scan processors, step-printed motion) are listed at the end.",
    "facts": {"covers": "FilmLook 1.x, VideoLook 1.2.0"},
    "quickstart": [
        "**Chaining the two panels.** Render the first plugin with Source set to *Whole image*. "
        "Then run the second, also on *Whole image*: VideoLook reads the FilmLook layer "
        "underneath (it only hides its own earlier layers), and FilmLook reads a VideoLook "
        "layer the same way. Keep Strength at 100 on the first pass.",
        "**Order follows history.** Whatever happened to the pictures first goes first: "
        "film shot, then shown on TV = FilmLook, then VideoLook. Video transferred to cinema "
        "film = VideoLook, then FilmLook.",
        "**Mind the noise.** Each plugin adds its own grain or noise, and chained they stack: "
        "turn the first plugin's grain down a little.",
        "**Titles and subtitles.** Put the lettering on before the plugin that would have "
        "carried it: optical titles before FilmLook; open subtitles in VideoLook's Overlay "
        "section at the right stage.",
    ],
    "sections": [
        {"label": "recipes", "type": "reference", "data": [
            {"title": "british new wave and kitchen sink",
             "intro": "The one that started this page: soft black and white, slightly diffused titles.",
             "rows": [
                ["Kitchen-sink title card, as projected",
                 "FilmLook only",
                 "Set the title on the photo and merge. Stock *B&W fast panchromatic (1955-80)*. "
                 "Duplicate generations 1-2 (superimposed titles were usually a printing generation "
                 "further on: more grain and contrast). Halation up and a little Diffusion / glow, so "
                 "the white letters bleed slightly. Resolving power down a touch if the letters look "
                 "too crisp. Grain moderate; a little dust and Uneven density. The printing-generation "
                 "point is general practice, not checked film by film."],
                ["Kitchen-sink film, seen on TV",
                 "FilmLook → VideoLook",
                 "The above, then VideoLook *1970s drama: 16 mm film exteriors* with Standard changed to "
                 "*625-line B&W*. View *Frame-grab* for a clean off-air grab, *Screen close-up* for the set. "
                 "Lower FilmLook's grain first: the telecine adds its own."],
                ["Early Coronation Street-style card",
                 "VideoLook",
                 "*405-line telerecording, 1953*: early episodes survive mainly as 405-line film "
                 "recordings, which gives that heavier, softer glow."],
             ]},
            {"title": "british tv drama and documentary",
             "rows": [
                ["Cathy Come Home (1966)",
                 "FilmLook → VideoLook",
                 "Location scenes were 16 mm, hand-held (Tony Imi); about ten minutes were shot on studio "
                 "video and telerecorded into the film because of union rules (two sources). FilmLook: "
                 "*B&W fast panchromatic*, Gauge *16mm 1.37*, Lens *1970s zoom* (the nearest), grain up. "
                 "Then VideoLook *405-line live studio at home, 1953* with Camera switched off and Transfer "
                 "*Telecine*: BBC1 was 405 lines for most viewers then. For the studio inserts, use "
                 "VideoLook *405-line telerecording* on its own."],
                ["Culloden (1964) / The War Game (1965)",
                 "FilmLook (→ VideoLook)",
                 "Peter Watkins's newsreel style: 16 mm black and white, mostly hand-held (Culloden about "
                 "85%, two sources). FilmLook *B&W newsreel / duplicate*, Gauge *16mm 1.37*, grain up, "
                 "Condition *Release print*. Add VideoLook's 405-line telecine chain (as above) for a "
                 "broadcast feel."],
                ["Play for Today (1970s)",
                 "VideoLook",
                 "Studio scenes on 2-inch tape and location scenes on 16 mm film, telecined in: "
                 "*1970s drama: studio video interiors* and *1970s drama: 16 mm film exteriors* (run "
                 "FilmLook's *Eastman 100-speed negative (1968-74)*, *16mm 1.37*, first for the film "
                 "half). Some colour plays survive only as black-and-white film recordings: "
                 "*Colour show on B&W film (with PAL dots)*."],
                ["Threads (1984)",
                 "FilmLook (→ VideoLook)",
                 "16 mm colour, 1.33, hand-held, semi-documentary (two sources). FilmLook *Eastman improved "
                 "100-speed negative (1974-83)*, Gauge *16mm 1.37*, Lens *1970s zoom*, grain up, Saturation "
                 "down a little. For the version most people saw again, add VideoLook *VHS off-air "
                 "recording, 1986 (UK)*."],
                ["Kes (1969)",
                 "FilmLook",
                 "Chris Menges: natural light, grainy, high contrast, colour (two sources). Gauge not found: "
                 "try *35mm flat 1.66 (European)*. Stock *Eastman 100-speed negative (1968-74)*, Exposure "
                 "a little under, Contrast up, grain up, Saturation slightly down."],
             ]},
            {"title": "community tv and video art",
             "rows": [
                ["Swindon Viewpoint, 1973-77",
                 "VideoLook preset",
                 "*Swindon Viewpoint, 1974 (black-and-white cable)*. From the station's own history: "
                 "EMI-funded from September 1973 on the Radio Rentals relay network; Sony Portapaks and "
                 "1-inch Sony recorders; little light on location; copy-editing with a glitch at each "
                 "edit. The 'blurry but sharp' haloes are modelled with the set's Sharpness (my reading "
                 "of the effect, not documented): raise it for more halo, and push Tracking error up to "
                 "fake an edit glitch."],
                ["Swindon Viewpoint in colour, from 1977",
                 "VideoLook preset",
                 "*Swindon Viewpoint, 1978 (colour U-matic)*: single-tube Sony cameras on U-matic; the "
                 "station says resolution went down with colour."],
                ["Portapak video art, around 1970",
                 "VideoLook preset",
                 "*Sony Portapak video art, 1970* (625) or switch Standard to *525-line B&W* for the "
                 "American scene. For Lanesville TV-style pirate broadcasting (Videofreex, from 1972), "
                 "switch the Channel on: Signal-to-noise about 30, a Ghost of 2-4 µs."],
                ["This Is A Television Receiver (David Hall, 1976)",
                 "VideoLook preset",
                 "*Re-shot off a monitor, again and again*: each copy is re-shot from the last. Set "
                 "Transfer › Conversion generations from 1 to 12."],
                ["Videotape to cinema, 1964",
                 "VideoLook preset",
                 "*Videotape to cinema film, 1964 (Electronovision-style)*: shot on tape, kinescoped to "
                 "film for cinemas, years before 200 Motels."],
             ]},
            {"title": "photographed off the screen",
             "intro": "1960s station symbols, captions and announcers as they survive in off-screen "
                      "photographs (Tele-snaps). All six are in VideoLook's *Photographed off the screen* "
                      "group. Start from clean artwork: white on black for symbols and captions.",
             "rows": [
                ["Station symbol, grey and ghostly",
                 "VideoLook preset",
                 "*Tele-snap: ident, grey and ghostly*. The whites come out a soft mid-grey. **Print "
                 "exposure** is the main control: about -1.6 for a pale grey symbol, about -2.6 for "
                 "the darkest captions. **Softness** under Camera sets how soft the artwork is while "
                 "the scan lines stay crisp. Why real ones are grey isn't established (a thin "
                 "negative, a dark print or a fade would all do it)."],
                ["Station symbol, burnt out",
                 "VideoLook preset",
                 "*Tele-snap: ident, burnt-out whites and grey blacks*. The opposite print: whites "
                 "swollen and solid, blacks a dusty dark grey. Raise **Mean-level AGC** and **Black "
                 "follows the picture** (Decoder & set) for greyer blacks, **Blooming** (Display) for "
                 "fatter whites."],
                ["Caption with a grey band above it",
                 "VideoLook preset",
                 "*Tele-snap: caption with a grey band above it*. A white box on black: grey above "
                 "the box, black below, the tube's edge in shot. **Black-level tilt** sets the band. "
                 "Fitted to one 1968 photograph; the cause isn't established."],
                ["In-vision announcer",
                 "VideoLook preset",
                 "*Tele-snap: in-vision announcer*. The whole tube face, soft, flat and grey. Raise "
                 "**Pull back** to show more of the surround; **Camera tilt** for a hand-held snap."],
                ["Fringe reception, hard print",
                 "VideoLook preset",
                 "*Tele-snap: fringe reception, hard print*. A distant transmitter, printed hard so "
                 "the snow only shows as ragged edges. Lower Signal-to-noise (Channel) for more."],
                ["Harsh early video recording",
                 "VideoLook preset",
                 "*405-line off-air on an early video recorder*. Hard contrast, outlines, ragged "
                 "verticals, coarse lines. The Sony CV-2000 model stands in for whichever machine "
                 "made a given clip."],
                ["A tele-snap of your own title",
                 "VideoLook",
                 "Set the title as white type on a black layer in Photoshop (ordinary type, not "
                 "VideoLook's subtitles, which are added after the camera and so stay sharp), then "
                 "use the grey and ghostly preset. For a hurried, slanted snap: Camera tilt 2-3° "
                 "and Pull back 0.02."],
             ]},
            {"title": "artists' film and indie",
             "rows": [
                ["Warhol Screen Tests (1964-66)",
                 "FilmLook",
                 "16 mm black and white, one 100-ft roll on a static Bolex, a single light, varied from "
                 "sitting to sitting (two sources). Stock *B&W fast panchromatic*, Gauge *16mm 1.37*, one "
                 "hard light in the photo, Exposure to taste, grain moderate, Condition *Release print*. "
                 "The slow projection speed can't show in a still."],
                ["La Jetée (Chris Marker, 1962)",
                 "FilmLook",
                 "Almost entirely optically printed still photographs, 35 mm black and white (single "
                 "source). Stock *B&W fast stills film, pushed (Nouvelle Vague)*, Gauge *35mm Academy 1.37*, "
                 "Duplicate generations 1."],
                ["The Last of England (Derek Jarman, 1987)",
                 "FilmLook → VideoLook → FilmLook",
                 "Super 8, transferred to PAL U-matic, edited, then to 35 mm: 'two levels of grain' and "
                 "night blues, mauves and burning orange (one blog; Super 8 itself is well sourced). "
                 "1: FilmLook *Ektachrome reversal (Super 8 / 16mm, 1970s)*, Gauge *Super 8 1.36*. "
                 "2: VideoLook, Camera off, Transfer *Telecine*, Recording *U-matic high band*, View "
                 "*Frame-grab*. 3: FilmLook again on 35 mm with Duplicate generations 1, grain, and the "
                 "Printer light and Toning controls pushed towards blue, mauve or orange."],
                ["Sadie Benning's Pixelvision diaries (from 1988)",
                 "VideoLook preset",
                 "*Fisher-Price Pixelvision, 1988*: the PXL-2000 records 120 x 90 black and white on "
                 "audio cassette, inside black borders."],
                ["The Blair Witch Project (1999)",
                 "VideoLook → FilmLook",
                 "Colour Hi8 plus 16 mm black and white (CP-16), finished on video and filmed out to 35 mm "
                 "(two sources); home video releases came back off the 35 mm print, with grain and a brown "
                 "cast. Hi8 half: VideoLook *Hi8 camcorder, 1994* with Standard *525 NTSC (US)*, then "
                 "FilmLook 35 mm, Duplicate generations 1, grain, Warm / cool warmer. 16 mm half: FilmLook "
                 "*B&W fast panchromatic*, *16mm 1.37*."],
                ["Festen (1998) / Julien Donkey-Boy (1999)",
                 "VideoLook → FilmLook",
                 "Mini-DV transferred to film. Festen: a small single-chip camera, hand-held (the model "
                 "is disputed). Julien Donkey-Boy: Canon XL-1 Mini-DV to 16 mm, then blown up to 35 mm. "
                 "VideoLook *MiniDV, 2002 (PAL)* with Camera set to *Single-CCD consumer camcorder*, then "
                 "FilmLook on 35 mm with Duplicate generations 1 (Festen) or 2 (Julien), grain up."],
                ["200 Motels (Frank Zappa, 1971)",
                 "VideoLook → FilmLook",
                 "Shot on colour videotape at Pinewood and transferred to 35 mm; one source says via "
                 "Technicolor separations. VideoLook *UK colour studio, mid-1970s* with View *Frame-grab*, "
                 "then FilmLook *Eastmancolor neg + Technicolor IB print (1955-75)*, Duplicate generations "
                 "1. Its video false-colour and solarisation effects aren't in either plugin."],
                ["Brakhage, Mothlight (1963)",
                 "FilmLook",
                 "Moth wings and leaves pressed between strips of 16 mm splicing tape and contact-printed "
                 "(single source). Photograph real specimens on a lightbox, then FilmLook Gauge *16mm "
                 "1.37*, Condition *Worn print*."],
             ]},
        ]},
        {"label": "not yet possible", "type": "flags", "data": [
            "Nam June Paik's magnet-bent pictures (1963-65) and the Paik-Abe synthesizer: neither "
            "plugin bends the raster or makes feedback.",
            "The Vasulkas' Rutt/Etra scan processor, which deflects the beam into 3D line landscapes.",
            "Chungking Express's step-printed smear, and any real motion effect: these are stills. "
            "VideoLook's Implied motion only shows what a single frame of movement would look like.",
            "200 Motels' false colour and solarisation.",
        ]},
        {"label": "sources", "type": "plain", "data": [
            "Swindon Viewpoint history and equipment: swindonviewpoint.com/history, "
            "swindonviewpoint.com/how-it-works (single source for the equipment); Wikipedia.",
            "David Hall: LUX catalogue (This Is A Television Receiver; TV Interruptions).",
            "Cathy Come Home: Wikipedia; the-medium-is-not-enough.com. Culloden and The War Game: "
            "Harvard Film Archive; pwatkins.mnsi.net; Wikipedia.",
            "Play for Today: BFI; cineoutsider.com. Threads: Severin Films; Trailers from Hell.",
            "Warhol Screen Tests: Wikipedia; warholscreentest.com. La Jetée: Wikipedia.",
            "The Last of England: Wikipedia; plethoralondon.wordpress.com (single source for the U-matic "
            "chain). PXL-2000 and Sadie Benning: Wikipedia; IndieWire.",
            "Blair Witch: Wikipedia; AV Club; Fangoria. Festen and Julien Donkey-Boy: Wikipedia; "
            "Filmmaker Magazine. 200 Motels: Wikipedia; Den of Geek. Electronovision: Wikipedia.",
            "Mothlight: Wikipedia. Paik: Langlois Foundation; Wikipedia.",
            "Off-screen photographs: Transdiffusion (channel-tv.co.uk and associatedtelevision.network "
            "tele-snap pages); Wikipedia, 405-line television system (mean-level AGC) and Tele-snaps "
            "(half-frame 35 mm at 1/25 s); videokarma.org thread 248278 (no DC restorer); "
            "rewindmuseum.com (Philips EL3400, 405 lines, 1964).",
            "Full notes: VideoLook-References/_research/J_cookbook.md and K_offscreen_photographs.md.",
        ]},
    ],
})

ITEMS.append({
    "slug": "poster-pdf-export",
    "name": "Poster PDF Export",
    "kind": "Watch folder",
    "app": "InDesign",
    "author": "Claude",
    "status": "Working",
    "folder": "Dropbox/A3/_APA-Automation/PosterExport",
    "tagline": "Drop a finished Illustrator poster into a folder and five "
               "print-ready GRACoL PDFs appear on the Desktop.",
    "blurb":
        "The last five minutes of every poster used to be manual: overwrite "
        "`ARTWORK.ai` on the Crucial X9, open the InDesign template that links "
        "to it, wait for the link to refresh, export six pages through the "
        "Gelato preset, then rename the results. This does the lot from a "
        "single drag. A launchd agent watches two folders, one per template, "
        "asks for the poster's name, and hands the job to InDesign, which "
        "copies the artwork into place and exports pages 2 – 6 one at a time. "
        "Verified byte-identical to a hand export: of the six data streams in "
        "each PDF, five match exactly and the sixth is the XMP packet holding "
        "the timestamp.",
    "facts": {
        "requires": "InDesign 21.5+, Crucial X9 mounted",
        "preset": "GELATO 4MM GR AUTO",
        "runtime": "~/.apa-poster-export/",
    },
    "quickstart": [
        "Finish the poster in Illustrator with all three artboards correct.",
        "Drag the `.ai` file into **~/Poster Drop/White Edge** if the poster "
        "has a white border, or **~/Poster Drop/Stretched** if the artwork "
        "runs to the bleed. There is a link to the folder on the Desktop.",
        "A dialog asks for the name, prefilled from the filename. Type "
        "everything up to the size — `APA-AD-AUTEUIL Auteuil et Passy` — and "
        "press Return.",
        "Wait. A notification appears when the five PDFs are in a folder on "
        "the Desktop named after the canonical code.",
    ],
    "controls": [
        {"title": "What comes out",
         "intro": "Page 1 of the template, A3 at 0 mm, is deliberately "
                  "skipped. Use the trim tool on the A3 4 mm file instead.",
         "rows": [
             ["`… A3-4mm-gr.pdf`", "page 2", "297 × 420 mm trim"],
             ["`… A2-4mm-gr.pdf`", "page 3", "420 × 594 mm trim"],
             ["`… A1-4mm-gr.pdf`", "page 4", "594 × 841 mm trim"],
             ["`… 1824-4mm-gr.pdf`", "page 5", "457.2 × 609.6 mm trim"],
             ["`… 2436-4mm-gr.pdf`", "page 6", "609.6 × 914.4 mm trim"],
         ]},
        {"title": "The two drop folders",
         "rows": [
             ["White Edge", "`Indesign Files/ALL CORRECT.indd`",
              "Frames leave the poster's own white border showing. For "
              "artwork that already has a margin."],
             ["Stretched", "`Indesign Files (Stretched)/ALL.indd`",
              "Frames run the artwork out to the full bleed."],
         ]},
        {"title": "Where things live",
         "rows": [
             ["Master scripts", "Dropbox",
              "`/A3/_APA-Automation/PosterExport/` — edit here."],
             ["Runtime copies", "`~/.apa-poster-export/`",
              "What launchd actually runs. Re-run `install.sh` after any "
              "edit or they drift."],
             ["Artwork slot", "Crucial X9",
              "`NEW FACTORY/PLACE ARTWORK HERE/ARTWORK.ai`, overwritten "
              "each run. Your dropped file is copied, never moved."],
             ["Log", "`~/Library/Logs/`",
              "`apa-poster-export.log` — every trigger, file size and "
              "outcome."],
         ]},
    ],
    "workflow": [
        {"title": "Why InDesign does the file handling",
         "text": "macOS refuses a launchd agent access to anything under "
                 "`~/Library/CloudStorage`, `~/Desktop`, `~/Documents` or "
                 "`~/Downloads`, and to external volumes. It fails with "
                 "*Operation not permitted* and never prompts, so the "
                 "symptom is silence rather than an error. The shell script "
                 "therefore only notices the file and asks for a name; "
                 "InDesign copies the artwork onto the X9 and writes the "
                 "PDFs to the Desktop, because it is a real application with "
                 "its own permissions."},
        {"title": "Why the preset is untouchable",
         "text": "The script sets exactly one export property, which page to "
                 "export. Colour conversion, the GRACoL destination, PDF/X-4, "
                 "the output intent, compression and the 4 mm bleed all come "
                 "from the named preset, so a scripted export is the same "
                 "operation as choosing that preset by hand. An InDesign PDF "
                 "preset does not store a page range, which is what makes "
                 "this possible."},
        {"title": "Why it updates rather than relinks",
         "text": "The artwork link is refreshed with `update()`, never "
                 "`relink()`. Relinking risks resetting which artboard of the "
                 "`.ai` each frame shows, and the whole point of the template "
                 "is that those choices are already correct."},
    ],
    "gotchas": [
        "**Create Separate PDF Files must stay off** in `GELATO 4MM GR AUTO`. "
        "A preset does store that flag, and with it on InDesign appends "
        "`_1`, `_2` to every filename and the naming falls apart.",
        "**Keep the Illustrator file under 2 GB.** Past that, the PDF "
        "cross-reference table inside the `.ai` sits beyond the 32-bit offset "
        "limit, InDesign cannot parse the file at all, and the only "
        "explanation you get is a bare *Import failed*. The script now warns "
        "before the copy and offers to try anyway. The cure is resolution: "
        "the export downsamples everything above 300 ppi, so anything finer "
        "than about 7,300 × 10,900 px — 300 ppi at 24 × 36 plus bleed — is "
        "thrown away on export and costs you nothing to remove. Seen "
        "September 2026 at 2.53 GB; a 10% quality reduction brought the same "
        "poster down to 630 MB with no visible change.",
        "Never move the scripts or the drop folders into Dropbox, Desktop, "
        "Documents or Downloads. It will stop working silently.",
        "The Crucial X9 must be mounted. If it isn't, the file is left in the "
        "drop folder and an alert says so.",
        "The name you type sets both the filenames and the output folder — "
        "the folder takes the first word, so `APA-AD-AUTEUIL Auteuil et "
        "Passy` lands in `~/Desktop/APA-AD-AUTEUIL/`.",
        "It refuses to export rather than produce something wrong if a link "
        "is missing, a font is not installed, the preset name is not found, "
        "or a template has fewer than six pages.",
        "Cancelling the name dialog moves the file to `_Cancelled`, not back "
        "to the drop folder.",
    ],
    "rebuild": [
        {"title": "Installing",
         "text": "`bash ~/Library/CloudStorage/Dropbox/A3/_APA-Automation/"
                 "PosterExport/install.sh`. It creates the drop folders, "
                 "copies the scripts to the runtime folder, and loads the two "
                 "launchd agents. Safe to re-run, and re-running is how you "
                 "deploy an edit."},
        {"title": "Removing it",
         "text": "The same command with `uninstall` on the end. Drop folders "
                 "and finished PDFs are left alone."},
        {"title": "When nothing happens",
         "text": "Check `~/Library/Logs/apa-poster-export.log` for a "
                 "`triggered` line. Present means the watcher fired and the "
                 "problem is downstream; absent means the agent never "
                 "started, and `~/Library/Logs/apa-poster-export.err.log` "
                 "will say why."},
    ],
})
