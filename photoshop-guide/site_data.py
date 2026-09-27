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
