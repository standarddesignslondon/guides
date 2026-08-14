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
