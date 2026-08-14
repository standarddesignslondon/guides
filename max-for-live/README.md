# Max for Live device guide

A static site — one page per device in the Max for Live folder, covering what
every control does, the Push 3 encoder layout, and the things each device needs
you to remember.

Open `index.html` in a browser to read it locally — no build tools, no
dependencies, no server needed.

## The look

Styled after the teenage engineering product guides: numbered chapters, a
hairline-ruled index, two-column sections with the heading held in the left
margin, and the Push encoder pages drawn as eight numbered slots. Dark on light,
with orange used only for numbers, links and the active filter.

Headings and navigation are lowercase in the TE manner, but control names and
body text keep their normal capitalisation — you need to be able to match
"Min Silence" to the label on the device face.

## The screenshots

They're already in. `images/` holds one picture per device, plus a second one for
Tape Error's trigger device, which appears below the main picture on that page.

Filenames don't have to match exactly. The builder normalises case, spaces and
dash type before matching, so `sw–radio.png` (en-dash) finds the `sw-radio`
device. Where a name is further off — `splice1.png`, `stripsilence.png`,
`youtube–sampler.png` — the device's `image_aliases` list in `site_data.py`
carries the mapping. Add to that list if you rename anything.

`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` and `.svg` all work. Running
`build_site.py` reports any device without a picture, and any image in the
folder that no device is using.

**Taking a shot on a Mac:** `Cmd+Shift+4`, then press **Space** and click the
device — that captures just that window. Or drag a rectangle around the device
face in Live.

## Rebuilding

```sh
python3 build_site.py
```

Regenerates `index.html`, `style.css`, `app.js`, `manifest.json` and everything
in `devices/`. It prints any device missing a picture, and any image nothing is
using.

All the text lives in **`site_data.py`**: a `SUBJECT` block configuring the site
as a whole, then `ITEMS` — one dict per device. Edit a description, add a
control row, reorder a Push bank, then re-run. Inline markup: `**bold**`,
`*italic*`, `` `code` ``.

The generator is subject-agnostic — the same `build_site.py` runs other guides
(Photoshop tools, bought plugins) from their own `site_data.py`. It's carried by
the `reference-guide-site` skill, so any project can produce a matching site.

## The hub

This site is one *subject*. `build_site.py` also has a hub mode that builds a
single entry point across every subject:

```
guides/                 <- run: python3 build_site.py hub
  index.html            one panel per subject
  all.html              every entry from every subject, filterable
  max-for-live/         <- this folder, copied in
  photoshop/            <- another subject, authored in its own project
```

Hub mode scans each immediate subfolder for the `manifest.json` that
`build_site.py` writes, so subjects stay independent — each is authored and
rebuilt in its own project folder, and a subject that isn't there simply doesn't
appear. Copy the built subject folders into the hub folder when you publish.

Every page carries three links in the top bar: **guides** (the hub),
**max for live** (this subject's index) and **everything** (the combined list).
Set `SUBJECT["hub"] = None` in `site_data.py` if you ever want this site to
stand alone without them.

`build_hub.py` is a leftover shim that forwards to `build_site.py hub` — safe to
delete.

## Publishing to GitHub Pages

From this folder:

```sh
cd "/Users/simonmorse/Documents/Claude/Projects/Max for Live/device-guide"

git init
git add .
git commit -m "Max for Live device guide"
git branch -M main
```

Then create an empty repository on github.com (no README, no .gitignore), and:

```sh
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

In the repo on github.com: **Settings → Pages → Build and deployment →
Source: Deploy from a branch → Branch: `main`, folder: `/ (root)` → Save.**

A minute or so later the site is live at
`https://<your-username>.github.io/<repo-name>/`.

If you'd rather it wasn't public, make the repo private — note that GitHub Pages
on private repos needs a paid plan. The alternative is to keep the folder local
and open `index.html` directly, or drop the folder into iCloud Drive and open it
from your phone's Files app.

### Updating it later

```sh
python3 build_site.py
git add .
git commit -m "Add screenshots"
git push
```

The `.nojekyll` file is generated automatically — it stops GitHub Pages running
Jekyll over the folder.
