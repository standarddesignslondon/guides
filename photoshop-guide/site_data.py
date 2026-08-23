# -*- coding: utf-8 -*-
"""Content for the photoshop tools guide.

Add a tool by appending a dict to ITEMS, dropping a picture in images/ named
after its slug, and re-running build_site.py. Nothing else needs touching.
"""

SUBJECT = {
    "short": "photoshop",
    "title": "photoshop\ntools",
    "subtitle": "process guide",
    "blurb": "Panels, scripts and actions built for Photoshop. What every "
             "control does, how a file travels from the canvas out to "
             "whatever does the work and back again, and the things each one "
             "needs you to remember.",
    "noun": "tool",
    "noun_plural": "tools",
    "page_dir": "tools",
    "hub": "../index.html",
    "hub_all": "../all.html",
    "hub_label": "guides",
    "accent": "#ff4f00",
    "facets": [
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
