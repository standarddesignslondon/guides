# photoshop-guide

A reference guide for the Photoshop tools — panels, scripts and actions — in
the same teenage-engineering styling as the Max for Live guide. One numbered
chapter per tool, plus a filterable index.

Open `index.html` in a browser and it works on its own. It is also a *subject*
folder, so it can be dropped into the combined `guides` site alongside the
other guides.

## Files

```
build_site.py     the generator. Identical in every guide — do not edit it.
site_data.py      all the content. The only file you author.
images/           one picture per tool, named after its slug.
index.html        generated
tools/*.html      generated, one page per tool
style.css app.js manifest.json .nojekyll   generated
```

Everything except `site_data.py`, `images/` and this README is regenerated on
every build, so there is no point editing the HTML by hand.

## Adding a tool

1. Append a dict to `ITEMS` in `site_data.py`. Order in the list sets the
   chapter numbers. The minimum is `slug`, `name`, `tagline`, `blurb`, plus
   the two facet fields `kind` and `author`.
2. Save a picture as `images/<slug>.png`. Matching ignores case, spaces and
   dash type. Extra pictures go in the item's `extra_images` list, and any
   name that will not match goes in `image_aliases`.
3. Run `python3 build_site.py`.

The build reports any tool with no picture, and any image nothing is using.
A tool without a picture still builds — a dashed placeholder appears naming
the exact file to save.

Pictures are shown one per row, full width, so a tall screenshot makes for a
tall page. Where two shots belong together, composite them side by side into a
single PNG on a transparent background — the grey panel behind shows through
the gap. Keep the originals in `images/_source/`, which the build ignores.
Nano Banana Bridge does this: `_source/panel-ready.png` and
`_source/panel-in-use.png` are joined with a 44px gap.

### Sections

Standard keys, rendered in this order when present: `quickstart`, `controls`,
`banks`, `slots`, `workflow`, `gotchas`, `rebuild`. For full control of order
and headings, use the `sections` list instead, as the Nano Banana Bridge entry
does. Renderer types are `steps`, `reference`, `slots`, `notes`, `flags` and
`plain`. Inline markup in any string: `**bold**`, `*italic*`, `` `code` ``.

Headings and navigation are lowercase throughout. Body text and control names
keep their normal capitalisation, because a label has to match what is printed
on the thing itself.

## Publishing

The top bar links up to a `guides` hub that sits one level above this folder.
To build the combined site:

```bash
mkdir -p ~/guides
cp -R photoshop-guide ~/guides/photoshop
cp -R device-guide    ~/guides/max-for-live      # and any other subjects
cp photoshop-guide/build_site.py ~/guides/
cd ~/guides && python3 build_site.py hub
```

Hub mode scans each immediate subfolder for the `manifest.json` that subject
builds write, so a subject that has not been copied in simply does not appear.
`HUB_TITLE`, `HUB_BLURB` and `HUB_ACCENT` near the top of the hub's copy of the
script control the entry page.

Then push `~/guides` to GitHub with Pages serving from the repo root:

```bash
cd ~/guides
git init
git add -A
git commit -m "guides"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

In the repo's Settings > Pages, set Source to *Deploy from a branch*, branch
`main`, folder `/ (root)`. `.nojekyll` is written automatically, so folders
and files are served as they are.

To publish this guide on its own instead, set `SUBJECT["hub"] = None` in
`site_data.py`, rebuild, and push this folder alone.
