# library

The inventory subject. Every plugin and every Max for Live device Ableton can
load on this machine, in one searchable list.

It works differently from the other subjects. `max-for-live` and
`photoshop-guide` are chapter books — a handful of things, each with a written
page. This one has ~800 entries and no per-item pages, so it uses
`build_catalogue.py` instead of `build_site.py`, and produces a single
`index.html`. The styling still comes out of `build_site.py`, so the look stays
in step with the rest of the guides.

## Building

```
python3 build_catalogue.py     # in this folder
python3 build_site.py hub      # in Guides/, to refresh the front page
./publish.sh                   # in Guides/, Simon runs this
```

## Where the data comes from

`catalogue_data.py` is generated, not hand-written. Two sources:

**Live's own databases**, in
`~/Library/Application Support/Ableton/Live Database/`:

- `Live-plugins-1.db` — one row per plugin, with name, vendor, version, format
  and the maker's own subcategory. This is what Live actually loaded, so it is
  more reliable than the `PluginScanDb.txt` / `PluginScanner.txt` logs in
  `Preferences/`, which are snapshots and append-only logs respectively.
- `Live-files-12300.db` — the browser index. Max for Live devices come from
  `files` rows whose name ends `.amxd`, with the folder path reconstructed by
  walking `parent_id` up to a row in `places`. `device_id` gives the device
  type and whether it came from a Pack, the app bundle or the User Library.

**Researched links** — product pages and manuals found by searching, one pass
per manufacturer. These are the only part not derived from the machine, so
they are the part that goes stale: makers move domains and take pages down.
Worth a re-check occasionally rather than trusting indefinitely.

## Scope

Included: the User Library, installed Packs, and the Max devices built into
Live 12 Suite. Excluded: copies sitting inside individual project folders, and
stale duplicates on the external drive — same device, and they would double
half the list.

Simon's own devices are collapsed to one entry each (SW Radio alone has
seventeen `.amxd` files on disk) and link across to their written chapter in
`../max-for-live/` rather than out to the web.

## Refreshing

Ask Claude to update the plugin list and the `refresh-plugin-library` skill
takes it from here. By hand, it is five steps in `_source/`:

```
python3 extract.py     # read Live's databases   → plugins.json, m4l2.json
python3 diff.py        # what changed?           → new_entries.json
                       # research only those, add to links_*.json
python3 merge.py       # data + links            → catalogue.json
python3 gen_data.py    #                         → ../catalogue_data.py
cd .. && python3 build_catalogue.py
cd .. && python3 build_site.py hub && ./publish.sh
```

`extract.py` finds the Live Database folder in a connected folder, or takes a
path as its argument. **Diff before researching** — a refresh usually has a
handful of new entries, and re-researching all 790 would take hours and lose
the hand-checked corrections.

`collapse.py` holds the rules both `merge.py` and `diff.py` need to agree on:
which VST2/VST3 spellings are the same plugin, which files belong to a device
built here, and what counts as in scope. When they disagreed, the diff reported
fifty phantom changes — keep those rules in the one place.

`merge.py` ends with a `CORRECTIONS` table for entries found to be wrong after
checking the real page. Fix things there, never in `catalogue_data.py`, or the
next regenerate loses the fix.

## Facets

Three filter rows on the index, plus a search box that matches name, maker,
description, type and origin:

- **source** — plugin / max for live
- **role** — instrument / audio effect / midi effect
- **type** — delay, reverb, eq, dynamics, … and `tutorial`, which is where the
  *Building Max Devices* lesson patches live so they stay out of the way.
