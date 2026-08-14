# guides — the entry point

This is the publishing folder: the single front door across every reference
guide, plus a copy of each subject site.

Open `index.html` to browse. `all.html` is every entry from every subject in
one filterable list.

```
guides/
  index.html        one panel per subject          (generated)
  all.html          everything, filterable         (generated)
  style.css app.js  shared                          (generated)
  build_site.py     the generator, in hub mode
  max-for-live/     a subject site, copied in
```

## Adding a subject

Each subject is authored in its own project — Max for Live devices in the Max
for Live project, Photoshop tools in the APA project, and so on. A project can
only reach its own folder, so subjects are brought together here at publish
time rather than being edited here.

1. Build the subject in its own project (`python3 build_site.py` there).
2. Copy the whole subject folder into this one.
3. From here: `python3 build_site.py hub`

It picks up any subfolder containing a `manifest.json`, so a subject you
haven't copied in simply doesn't appear. Re-run after copying in an updated
subject to refresh the counts and thumbnails.

**These are copies.** Edit a subject in its own project, then copy it in again
— don't edit it here, or the change will be overwritten next time. Think of
this folder as build output.

To change the landing page wording, edit `HUB_TITLE`, `HUB_BLURB` and
`HUB_ACCENT` near the top of `build_site.py` in this folder.

## Publishing to GitHub Pages

```sh
cd "/Users/simonmorse/Documents/Claude/Projects/Max for Live/guides"

git init
git add .
git commit -m "Reference guides"
git branch -M main
```

Create an empty repository on github.com (no README, no .gitignore), then:

```sh
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
branch → Branch: `main`, folder: `/ (root)` → Save.**

The site appears at `https://<your-username>.github.io/<repo-name>/` after a
minute or so. Updating later is copy in the rebuilt subject, run hub mode,
then `git add . && git commit -m "..." && git push`.

`.nojekyll` is written automatically — it stops GitHub Pages running Jekyll
over the folder.

The whole folder can be moved or renamed; every link inside it is relative.
