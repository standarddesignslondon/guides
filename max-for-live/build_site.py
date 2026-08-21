#!/usr/bin/env python3
"""
Reference-guide site builder — teenage engineering styling, dark on light.

Two modes, one file:

    python3 build_site.py          build this subject's site (needs site_data.py)
    python3 build_site.py hub      build the entry point across every subject

Subject mode produces a landing index plus one numbered chapter page per item,
reading everything from site_data.py (SUBJECT + ITEMS). It also writes
manifest.json.

Hub mode is run from the folder that CONTAINS the subject folders. It scans
each immediate subfolder for a manifest.json and writes index.html (one panel
per subject) plus all.html (every item from every subject, filterable). Subject
folders stay independent — each is authored and rebuilt in its own project, and
a missing one simply doesn't appear.

Generic: a subject can be Max for Live devices, Photoshop plugins, bought
hardware — anything that's a collection of things with controls and workflows.

No dependencies. Safe to re-run: it only writes the generated files.
"""

import html
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))

HUB_MODE = len(sys.argv) > 1 and sys.argv[1] == "hub"

# Hub-mode settings — edit these in the copy that sits at the top level.
HUB_TITLE = "guides"
HUB_BLURB = ("Reference guides for the things I've built and the things I use "
             "— what every control does, and what each one needs you to "
             "remember.")
HUB_ACCENT = "#ff4f00"

if not HUB_MODE:
    from site_data import SUBJECT, ITEMS
else:  # hub mode never reads site_data.py
    SUBJECT, ITEMS = {"short": HUB_TITLE, "title": HUB_TITLE,
                      "subtitle": "entry point", "accent": HUB_ACCENT}, []
PAGE_DIR = os.path.join(HERE, SUBJECT.get("page_dir", "pages"))
IMG_DIR = os.path.join(HERE, "images")
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")

E = html.escape

# Section order and default headings. An item may override any heading via
# SUBJECT["section_labels"], and may add its own with the "sections" key.
DEFAULT_SECTIONS = [
    ("quickstart", "quick start", "steps"),
    ("controls", "controls", "reference"),
    ("banks", "push 3", "slots"),
    ("slots", "controller", "slots"),
    ("workflow", "workflow", "notes"),
    ("gotchas", "gotchas", "flags"),
    ("rebuild", "rebuilding", "notes"),
]


# ---------------------------------------------------------------- helpers


def rich(text):
    """Minimal inline markup: **bold**, `code`, *italic*."""
    t = E(text)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"(?<![\*\w])\*([^*]+?)\*(?!\*)", r"<i>\1</i>", t)
    return t


def key(s):
    """Normalise a name: lowercase, dashes unified, punctuation dropped."""
    s = s.lower()
    for ch in "‐‑‒–—―−_":
        s = s.replace(ch, "-")
    return re.sub(r"[^a-z0-9]", "", s)


def anchor(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


_IMG_INDEX = None


def image_index():
    global _IMG_INDEX
    if _IMG_INDEX is None:
        _IMG_INDEX = {}
        if os.path.isdir(IMG_DIR):
            for fn in sorted(os.listdir(IMG_DIR)):
                stem, ext = os.path.splitext(fn)
                if ext.lower() in IMG_EXT:
                    _IMG_INDEX.setdefault(key(stem), fn)
    return _IMG_INDEX


def find_images(item):
    """Main picture plus extras, resolved from images/ by fuzzy name."""
    idx = image_index()
    main = None
    for n in [item["slug"]] + list(item.get("image_aliases", [])):
        if key(n) in idx:
            main = idx[key(n)]
            break
    extras = []
    for spec in item.get("extra_images", []):
        fn = idx.get(key(spec.get("file", "")))
        if fn:
            extras.append({"file": fn, "caption": spec.get("caption", "")})
    return main, extras


def chapter(i):
    return "%02d" % (i + 1)


def facets():
    return SUBJECT.get("facets", [])


def label_for(sec_key, default):
    return SUBJECT.get("section_labels", {}).get(sec_key, default)


# ---------------------------------------------------------------- chrome


def topbar(depth):
    """guides (hub) | this subject | everything (hub's combined index).

    Three distinct destinations, so any page can get back up to the hub, back
    to its own subject index, or across to the all-subjects list. With no hub
    configured it degrades to a plain subject wordmark + index link.
    """
    up = "../" * depth
    hub = SUBJECT.get("hub", "../index.html")
    hub_all = SUBJECT.get("hub_all", "../all.html")
    if hub:
        left = (f'<a class="wordmark" href="{E(up + hub)}">'
                f'{E(SUBJECT.get("hub_label", "guides"))}</a>')
        mid = (f'<a class="topbar-mid" href="{up}index.html">'
               f'{E(SUBJECT["short"])}</a>')
        right = (f'<a class="topbar-right" href="{E(up + hub_all)}">'
                 "everything</a>") if hub_all else (
            f'<a class="topbar-right" href="{up}index.html">index</a>')
    else:
        left = f'<span class="wordmark">{E(SUBJECT["short"])}</span>'
        mid = f'<span class="topbar-mid">{E(SUBJECT.get("subtitle", ""))}</span>'
        right = f'<a class="topbar-right" href="{up}index.html">index</a>'
    return f'<header class="topbar">{left}{mid}{right}</header>'


def page(title, body, depth=0, klass=""):
    up = "../" * depth
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title>
<link rel="stylesheet" href="{up}style.css">
</head>
<body class="{klass}">
{topbar(depth)}
<main>
{body}
</main>
<footer class="siteftr">
  <div class="sf-col"><span>{E(SUBJECT["short"])}</span>
  <span>{E(SUBJECT.get("subtitle", "guide"))}</span></div>
  <div class="sf-col"><span>generated {date.today().isoformat()}</span>
  <span>build_site.py</span></div>
</footer>
</body>
</html>
"""


def block(label, num, content):
    if not content:
        return ""
    return f"""<section class="block" id="{anchor(label)}">
  <div class="block-label"><span class="bl-num">{num}</span>
  <h2>{E(label)}</h2></div>
  <div class="block-body">{content}</div>
</section>"""


# ---------------------------------------------------------------- renderers


def r_steps(steps):
    if not steps:
        return ""
    out = ['<ol class="steps">']
    for i, s in enumerate(steps, 1):
        out.append(f'<li><span class="step-n">{i:02d}</span>'
                   f'<span class="step-t">{rich(s)}</span></li>')
    out.append("</ol>")
    return "\n".join(out)


def r_reference(sections):
    """Grouped name / range / description list."""
    if not sections:
        return ""
    out = []
    for s in sections:
        if s.get("title"):
            out.append(f'<h3 class="sub">{E(s["title"].lower())}</h3>')
        if s.get("intro"):
            out.append(f'<p class="lead">{rich(s["intro"])}</p>')
        out.append('<dl class="ctl">')
        for row in s["rows"]:
            name, rng, desc = (list(row) + ["", ""])[:3]
            rng_html = f'<span class="rng">{rich(rng)}</span>' if rng else ""
            out.append(f'<div class="ctl-row"><dt>{rich(name)}{rng_html}</dt>'
                       f"<dd>{rich(desc)}</dd></div>")
        out.append("</dl>")
    return "\n".join(out)


def r_slots(banks):
    """Rows of numbered slots — controller encoder pages, keyboard rows, etc."""
    if not banks:
        return ""
    width = SUBJECT.get("slot_width", 8)
    out = ['<p class="lead">'
           + E(SUBJECT.get("slot_note",
                           "encoders read left to right. slots marked "
                           "“–” are intentionally empty."))
           + "</p>"]
    for b in banks:
        out.append('<div class="bank">')
        out.append(f'<div class="bank-head">{E(b["name"].lower())}</div>')
        out.append(f'<div class="encoders" style="grid-template-columns:'
                   f'repeat({width},1fr)">')
        encs = list(b.get("encoders", b.get("slots", [])))
        while len(encs) < width:
            encs.append(None)
        for i, e in enumerate(encs[:width], 1):
            cls = "enc" if e else "enc empty"
            lab = E(e) if e else "&ndash;"
            out.append(f'<div class="{cls}"><span class="enc-n">{i}</span>'
                       f'<span class="enc-l">{lab}</span></div>')
        out.append("</div>")
        if b.get("buttons"):
            out.append('<div class="buttons"><span class="btn-label">buttons'
                       "</span>")
            for bt in b["buttons"]:
                out.append(f'<span class="btn">{E(bt)}</span>')
            out.append("</div>")
        if b.get("note"):
            out.append(f'<p class="bank-note">{rich(b["note"])}</p>')
        out.append("</div>")
    return "\n".join(out)


def r_notes(notes):
    if not notes:
        return ""
    out = []
    for n in notes:
        if isinstance(n, dict):
            out.append(f'<h3 class="sub">{E(n["title"].lower())}</h3>'
                       f"<p>{rich(n['text'])}</p>")
        else:
            out.append(f"<p>{rich(n)}</p>")
    return "\n".join(out)


def r_flags(items):
    if not items:
        return ""
    return '<ul class="gotchas">' + "".join(
        f"<li>{rich(g)}</li>" for g in items) + "</ul>"


def r_plain(items):
    if not items:
        return ""
    return '<ul class="plain">' + "".join(
        f"<li>{rich(g)}</li>" for g in items) + "</ul>"


RENDER = {"steps": r_steps, "reference": r_reference, "slots": r_slots,
          "notes": r_notes, "flags": r_flags, "plain": r_plain}


# ---------------------------------------------------------------- pages


def item_page(item, i):
    main, extras = find_images(item)
    num = chapter(i)
    prev_i = ITEMS[i - 1] if i > 0 else None
    next_i = ITEMS[i + 1] if i < len(ITEMS) - 1 else None

    if main:
        shot = (f'<figure class="shot"><div class="shot-frame">'
                f'<img src="../images/{E(main)}" alt="{E(item["name"])}">'
                f'</div><figcaption>{E(item["name"].lower())}</figcaption>'
                f"</figure>")
    else:
        shot = ('<figure class="shot"><div class="shot-frame empty">'
                f'<span>images/{E(item["slug"])}.png</span></div>'
                '<figcaption>picture pending</figcaption></figure>')
    for x in extras:
        shot += (f'<figure class="shot"><div class="shot-frame">'
                 f'<img src="../images/{E(x["file"])}" alt="{E(x["caption"])}">'
                 f'</div><figcaption>{E(x["caption"].lower())}</figcaption>'
                 f"</figure>")

    fact_rows = []
    for f in facets():
        v = item.get(f["field"])
        if v:
            fact_rows.append((f.get("fact_label", f["label"]).rstrip("s"),
                              str(v).lower()))
    if item.get("status"):
        fact_rows.append(("state", item["status"].lower()))
    for k, v in item.get("facts", {}).items():
        fact_rows.append((k, v))
    if item.get("folder"):
        fact_rows.append(("folder", item["folder"]))
    meta = "".join(f'<div class="fact"><dt>{E(k)}</dt><dd>{E(v)}</dd></div>'
                   for k, v in fact_rows)

    head = f"""<header class="chapter">
  <p class="ch-num">{num}</p>
  <h1>{E(item['name'].lower())}</h1>
  <p class="ch-sub">{rich(item['tagline'])}</p>
</header>
{shot}
<section class="block" id="about">
  <div class="block-label"><span class="bl-num">{num}.0</span><h2>about</h2></div>
  <div class="block-body">
    <p class="lead">{rich(item['blurb'])}</p>
    <dl class="facts">{meta}</dl>
  </div>
</section>"""

    parts = [head]
    n = 1
    built = []
    for sec_key, default_label, kind in DEFAULT_SECTIONS:
        if item.get(sec_key):
            built.append((label_for(sec_key, default_label), kind,
                          item[sec_key]))
    for extra in item.get("sections", []):
        built.append((extra["label"], extra.get("type", "notes"),
                      extra["data"]))
    for lab, kind, data in built:
        content = RENDER[kind](data)
        if content:
            parts.append(block(lab, f"{num}.{n}", content))
            n += 1

    nav = ['<nav class="chapnav">']
    nav.append(f'<a class="cn prev" href="{prev_i["slug"]}.html">'
               f'<span>previous</span>{E(prev_i["name"].lower())}</a>'
               if prev_i else '<span class="cn empty"></span>')
    nav.append('<a class="cn idx" href="../index.html"><span>&nbsp;</span>'
               "back to index</a>")
    nav.append(f'<a class="cn next" href="{next_i["slug"]}.html">'
               f'<span>next</span>{E(next_i["name"].lower())}</a>'
               if next_i else '<span class="cn empty"></span>')
    nav.append("</nav>")
    parts.append("".join(nav))

    return page(f"{item['name'].lower()} — {SUBJECT['short']}",
                "\n".join(parts), depth=1, klass="item")


def index_page():
    pd = SUBJECT.get("page_dir", "pages")
    rows = []
    for i, item in enumerate(ITEMS):
        main, _ = find_images(item)
        thumb = (f'<img src="images/{E(main)}" alt="" loading="lazy">'
                 if main else '<span class="no-thumb"></span>')
        data_attrs = " ".join(
            f'data-{f["field"]}="{E(str(item.get(f["field"], "")))}"'
            for f in facets())
        first_facet = facets()[0]["field"] if facets() else None
        kindcell = (f'<span class="r-kind">'
                    f'{E(str(item.get(first_facet, "")).lower())}</span>'
                    if first_facet else '<span class="r-kind"></span>')
        blob = (item["name"] + " " + item["tagline"] + " " + item["blurb"]
                + " " + " ".join(str(item.get(f["field"], ""))
                                 for f in facets())).lower()
        rows.append(f"""<a class="row" href="{E(pd)}/{E(item['slug'])}.html"
   {data_attrs} data-text="{E(blob)}">
  <span class="r-num">{chapter(i)}</span>
  <span class="r-name">{E(item['name'].lower())}</span>
  <span class="r-desc">{rich(item['tagline'])}</span>
  {kindcell}
  <span class="r-thumb">{thumb}</span>
</a>""")

    f = ['<div class="filters">',
         '<input type="search" id="q" placeholder="search" autocomplete="off">']
    for fac in facets():
        vals = sorted({str(it[fac["field"]]) for it in ITEMS
                       if it.get(fac["field"])})
        f.append(f'<div class="fgroup" data-field="{E(fac["field"])}">')
        f.append(f'<button class="f on" data-f="{E(fac["field"])}" data-v="">'
                 f'{E(fac.get("all", "all"))}</button>')
        for v in vals:
            f.append(f'<button class="f" data-f="{E(fac["field"])}" '
                     f'data-v="{E(v)}">{E(v.lower())}</button>')
        f.append("</div>")
    f.append("</div>")

    title_html = "<br>".join(E(x) for x in SUBJECT["title"].split("\n"))
    noun = SUBJECT.get("noun_plural", "items")
    body = f"""<header class="hero">
  <h1>{title_html}</h1>
  <p class="hero-sub">{E(SUBJECT.get('subtitle', 'user guide'))}</p>
  <p class="hero-blurb">{rich(SUBJECT.get('blurb', ''))}</p>
  <p class="hero-count">{len(ITEMS)} {E(noun)}</p>
</header>
{''.join(f)}
<div class="index-list" id="grid">
{''.join(rows)}
</div>
<p class="empty-msg" id="empty" hidden>nothing matches that.</p>
<script src="app.js"></script>"""
    return page(f"{SUBJECT['short']} — {SUBJECT.get('subtitle','guide')}",
                body, depth=0, klass="index")


def write_manifest():
    pd = SUBJECT.get("page_dir", "pages")
    out = {
        "subject": {
            "short": SUBJECT["short"],
            "title": SUBJECT["title"].replace("\n", " "),
            "subtitle": SUBJECT.get("subtitle", ""),
            "blurb": SUBJECT.get("blurb", ""),
            "noun": SUBJECT.get("noun", "item"),
            "noun_plural": SUBJECT.get("noun_plural", "items"),
            "page_dir": pd,
        },
        "generated": date.today().isoformat(),
        "items": [],
    }
    for i, item in enumerate(ITEMS):
        main, _ = find_images(item)
        rec = {"num": chapter(i), "slug": item["slug"], "name": item["name"],
               "tagline": item["tagline"], "url": f"{pd}/{item['slug']}.html",
               "image": f"images/{main}" if main else None,
               "facets": {f["field"]: item.get(f["field"], "")
                          for f in facets()}}
        out["items"].append(rec)
    with open(os.path.join(HERE, "manifest.json"), "w") as fh:
        json.dump(out, fh, indent=1)


# ---------------------------------------------------------------- assets

CSS = """
:root{
  --paper:#ffffff; --panel:#eceae5; --panel2:#f5f4f1;
  --ink:#141414; --soft:#8c8880; --mid:#5b5854;
  --line:#dedbd4; --line2:#c9c5bc;
  --accent:%ACCENT%;
  --gut:34px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font:15px/1.6 "Helvetica Neue",Helvetica,Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
a{color:inherit; text-decoration:none}
b{font-weight:600}
i{font-style:italic}
code{
  font:0.9em/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
  background:var(--panel2); padding:1px 5px; border-radius:2px;
  border:1px solid var(--line);
}
main{max-width:1180px; margin:0 auto; padding:0 var(--gut)}

/* ---------- top bar ---------- */
.topbar{
  position:sticky; top:0; z-index:50; background:var(--paper);
  border-bottom:1px solid var(--line);
  display:flex; align-items:center; justify-content:space-between;
  padding:14px var(--gut); font-size:12px; gap:16px;
}
.wordmark{font-weight:600}
.topbar-mid{color:var(--soft)}
.topbar-right{color:var(--soft)}
.topbar a:hover{color:var(--accent)}

/* ---------- hero ---------- */
.hero{padding:88px 0 40px; border-bottom:1px solid var(--ink)}
.hero h1{
  font-size:clamp(46px,9vw,104px); line-height:.94; font-weight:600;
  letter-spacing:-0.035em; margin:0 0 22px;
}
.hero-sub{font-size:15px; color:var(--soft); margin:0 0 26px}
.hero-blurb{max-width:44em; font-size:16px; color:var(--mid); margin:0 0 22px}
.hero-count{font-size:12px; color:var(--soft); margin:0}

/* ---------- filters ---------- */
.filters{
  display:flex; flex-wrap:wrap; gap:10px 26px; align-items:center;
  padding:18px 0; border-bottom:1px solid var(--line);
}
#q{
  font:inherit; font-size:13px; padding:7px 0; width:180px;
  border:0; border-bottom:1px solid var(--line2); background:transparent;
  color:var(--ink); outline:none;
}
#q:focus{border-bottom-color:var(--accent)}
#q::placeholder{color:var(--soft)}
.fgroup{display:flex; flex-wrap:wrap; gap:16px}
.f{
  font:inherit; font-size:13px; padding:0; cursor:pointer;
  border:0; background:none; color:var(--soft);
  border-bottom:1px solid transparent; line-height:1.9;
}
.f:hover{color:var(--ink)}
.f.on{color:var(--ink); border-bottom-color:var(--accent)}

/* ---------- index list ---------- */
.index-list{border-bottom:1px solid var(--ink)}
.row{
  display:grid; align-items:center; gap:0 20px;
  grid-template-columns:46px 190px 1fr 130px 190px;
  padding:15px 0; border-bottom:1px solid var(--line);
  transition:background .1s ease;
}
.row[hidden]{display:none}
.row:last-child{border-bottom:0}
.row:hover{background:var(--panel2)}
.row:hover .r-name{color:var(--accent)}
.r-num{font-size:12px; color:var(--soft)}
.r-name{font-size:17px; font-weight:600; letter-spacing:-0.01em}
.r-desc{font-size:13px; color:var(--mid); line-height:1.45}
.r-kind{font-size:12px; color:var(--soft)}
.r-thumb{
  background:var(--panel); height:52px; display:flex;
  align-items:center; justify-content:center; overflow:hidden;
}
.r-thumb img{max-width:100%; max-height:100%; object-fit:contain; display:block}
.no-thumb{display:block; width:100%; height:100%;
  background:repeating-linear-gradient(45deg,#e6e3dc,#e6e3dc 6px,#eceae5 6px,#eceae5 12px)}
.empty-msg{color:var(--soft); font-size:14px; padding:24px 0}

/* ---------- chapter ---------- */
.chapter{padding:70px 0 34px}
.ch-num{font-size:12px; color:var(--accent); margin:0 0 18px}
.chapter h1{
  font-size:clamp(38px,7vw,76px); line-height:.96; font-weight:600;
  letter-spacing:-0.035em; margin:0 0 18px;
}
.ch-sub{font-size:17px; color:var(--mid); max-width:38em; margin:0}

.shot{margin:0 0 12px}
.shot-frame{background:var(--panel); padding:38px 30px;
  display:flex; align-items:center; justify-content:center}
.shot-frame img{max-width:100%; height:auto; display:block}
.shot-frame.empty{min-height:190px; color:var(--soft); font-size:12px;
  border:1px dashed var(--line2); background:var(--panel2)}
.shot figcaption{font-size:12px; color:var(--soft); padding:9px 0 22px;
  border-bottom:1px solid var(--line)}

.block{display:grid; grid-template-columns:230px 1fr; gap:0 40px;
  padding:44px 0; border-bottom:1px solid var(--line)}
.block-label{position:sticky; top:74px; align-self:start}
.bl-num{font-size:12px; color:var(--soft); display:block; margin-bottom:6px}
.block-label h2{font-size:19px; font-weight:600; letter-spacing:-0.015em;
  margin:0}
.block-body>*:first-child{margin-top:0}
.block-body p{margin:0 0 1.05em; max-width:46em}
.block-body p:last-child{margin-bottom:0}
.lead{color:var(--mid)}
h3.sub{font-size:12px; font-weight:600; letter-spacing:.06em;
  text-transform:uppercase; color:var(--soft); margin:34px 0 12px}
h3.sub:first-child{margin-top:0}

ol.steps{list-style:none; margin:0; padding:0}
ol.steps li{display:grid; grid-template-columns:38px 1fr; gap:14px;
  padding:11px 0; border-top:1px solid var(--line); max-width:48em}
ol.steps li:first-child{border-top:0; padding-top:0}
.step-n{font-size:12px; color:var(--accent); padding-top:2px}
ul.plain{margin:0; padding-left:1.1em}
ul.plain li{margin:0 0 .5em}

dl.ctl{margin:0}
.ctl-row{display:grid; grid-template-columns:230px 1fr; gap:0 30px;
  padding:13px 0; border-top:1px solid var(--line)}
.ctl-row:first-child{border-top:0; padding-top:0}
dl.ctl dt{font-weight:600; font-size:14px}
dl.ctl dd{margin:0; color:var(--mid); font-size:14px}
.rng{display:block; font-weight:400; color:var(--soft); font-size:12px;
  margin-top:3px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace}

dl.facts{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:0 24px; margin:28px 0 0; border-top:1px solid var(--line)}
.fact{padding:13px 0 0}
.fact dt{font-size:12px; color:var(--soft); margin-bottom:3px}
.fact dd{margin:0; font-size:13px}

.bank{margin:0 0 26px}
.bank-head{font-size:12px; font-weight:600; letter-spacing:.06em;
  text-transform:uppercase; padding-bottom:9px;
  border-bottom:1px solid var(--ink); margin-bottom:10px}
.encoders{display:grid; gap:5px}
.enc{background:var(--panel); padding:11px 7px; min-height:64px;
  display:flex; flex-direction:column; gap:5px}
.enc-n{font-size:10px; color:var(--soft)}
.enc-l{font-size:12px; line-height:1.25; font-weight:600; word-break:break-word}
.enc.empty{background:var(--panel2)}
.enc.empty .enc-l{font-weight:400; color:var(--soft)}
.buttons{margin-top:9px; display:flex; flex-wrap:wrap; gap:5px;
  align-items:center}
.btn-label{font-size:10px; text-transform:uppercase; letter-spacing:.07em;
  color:var(--soft); margin-right:5px}
.btn{font-size:12px; padding:5px 11px; background:var(--ink); color:var(--paper)}
.bank-note{font-size:13px; color:var(--soft); margin:11px 0 0!important}

ul.gotchas{list-style:none; margin:0; padding:0}
ul.gotchas li{padding:12px 0 12px 26px; border-top:1px solid var(--line);
  position:relative; color:var(--mid); font-size:14px; max-width:48em}
ul.gotchas li:first-child{border-top:0; padding-top:0}
ul.gotchas li:before{content:"!"; position:absolute; left:0; top:12px;
  color:var(--accent); font-size:12px; font-weight:600}
ul.gotchas li:first-child:before{top:0}

.chapnav{display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px;
  padding:40px 0 70px}
.cn{font-size:14px; font-weight:600}
.cn span{display:block; font-size:11px; color:var(--soft); font-weight:400;
  margin-bottom:5px}
.cn:hover{color:var(--accent)}
.cn.idx{text-align:center; font-weight:400; color:var(--soft)}
.cn.next{text-align:right}
.cn.empty{display:block}

/* ---------- hub ---------- */
.subjects{border-bottom:1px solid var(--ink)}
.subject{display:grid; grid-template-columns:46px 1fr 320px; gap:0 24px;
  align-items:center; padding:26px 0; border-bottom:1px solid var(--line);
  transition:background .1s ease}
.subject:last-child{border-bottom:0}
.subject:hover{background:var(--panel2)}
.subject:hover .s-name{color:var(--accent)}
.s-num{font-size:12px; color:var(--soft); align-self:start; padding-top:6px}
.s-body{display:block}
.s-name{display:block; font-size:30px; font-weight:600;
  letter-spacing:-0.025em; margin-bottom:7px}
.s-blurb{display:block; font-size:14px; color:var(--mid); max-width:44em;
  margin-bottom:7px}
.s-count{display:block; font-size:12px; color:var(--soft)}
.s-strip{display:grid; grid-template-columns:repeat(3,1fr); gap:5px}
.chip-img{background:var(--panel); height:44px; display:flex;
  align-items:center; justify-content:center; overflow:hidden}
.chip-img img{max-width:100%; max-height:100%; object-fit:contain}
.all-link{padding:34px 0 80px; font-size:15px; font-weight:600}
.all-link a:hover{color:var(--accent)}

.siteftr{border-top:1px solid var(--ink); max-width:1180px;
  margin:0 auto; padding:26px var(--gut) 60px;
  display:flex; justify-content:space-between; gap:20px;
  font-size:11px; color:var(--soft)}
.sf-col{display:flex; flex-direction:column; gap:3px}
.siteftr .sf-col:last-child{text-align:right}

@media (max-width:980px){
  .row{grid-template-columns:38px 1fr 150px; gap:0 16px}
  .r-desc{grid-column:2/4; grid-row:2; padding-top:5px}
  .r-kind{display:none}
  .r-thumb{grid-column:3; grid-row:1}
  .encoders{grid-template-columns:repeat(4,1fr)!important}
  .subject{grid-template-columns:38px 1fr}
  .s-strip{display:none}
}
@media (max-width:760px){
  :root{--gut:18px}
  .block{grid-template-columns:1fr; gap:14px; padding:32px 0}
  .block-label{position:static; display:flex; align-items:baseline; gap:10px}
  .bl-num{margin-bottom:0}
  .ctl-row{grid-template-columns:1fr; gap:4px}
  .row{grid-template-columns:34px 1fr}
  .r-thumb{display:none}
  .r-desc{grid-column:2; grid-row:2}
  .hero{padding:52px 0 30px}
  .s-name{font-size:24px}
  .chapter{padding:44px 0 26px}
  .shot-frame{padding:18px 12px}
  .chapnav{grid-template-columns:1fr; gap:14px}
  .cn.idx,.cn.next{text-align:left}
  .siteftr{flex-direction:column}
  .siteftr .sf-col:last-child{text-align:left}
}
"""

JS = """
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;
  var rows = Array.prototype.slice.call(grid.querySelectorAll('.row'));
  var empty = document.getElementById('empty');
  var state = { q: '' };

  function apply() {
    var shown = 0;
    rows.forEach(function (c) {
      var ok = true;
      Object.keys(state).forEach(function (k) {
        if (k === 'q') return;
        if (state[k] && c.dataset[k] !== state[k]) ok = false;
      });
      if (state.q && c.dataset.text.indexOf(state.q) === -1) ok = false;
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
  }

  document.querySelectorAll('button.f').forEach(function (b) {
    state[b.dataset.f] = state[b.dataset.f] || '';
    b.addEventListener('click', function () {
      state[b.dataset.f] = b.dataset.v;
      b.parentNode.querySelectorAll('button.f').forEach(function (o) {
        o.classList.toggle('on', o === b);
      });
      apply();
    });
  });

  var q = document.getElementById('q');
  if (q) q.addEventListener('input', function (e) {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });
})();
"""


# ---------------------------------------------------------------- hub mode


def hub_topbar():
    return (f'<header class="topbar">'
            f'<a class="wordmark" href="index.html">{E(HUB_TITLE)}</a>'
            f'<a class="topbar-mid" href="all.html">everything</a>'
            f'<a class="topbar-right" href="index.html">index</a></header>')


def hub_page(title, body, klass=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body class="{klass}">
{hub_topbar()}
<main>
{body}
</main>
<footer class="siteftr">
  <div class="sf-col"><span>{E(HUB_TITLE)}</span><span>entry point</span></div>
  <div class="sf-col"><span>generated {date.today().isoformat()}</span>
  <span>build_site.py hub</span></div>
</footer>
</body>
</html>
"""


def load_subjects():
    subs = []
    for name in sorted(os.listdir(HERE)):
        mf = os.path.join(HERE, name, "manifest.json")
        if os.path.isdir(os.path.join(HERE, name)) and os.path.exists(mf):
            try:
                with open(mf) as f:
                    m = json.load(f)
            except (ValueError, OSError):
                print("  ! could not read %s/manifest.json" % name)
                continue
            m["dir"] = name
            subs.append(m)
    return subs


def hub_index(subs):
    total = sum(len(s["items"]) for s in subs)
    panels = []
    for i, s in enumerate(subs, 1):
        sub = s["subject"]
        strip = "".join(
            f'<span class="chip-img"><img src="{E(s["dir"])}/{E(it["image"])}"'
            f' alt="" loading="lazy"></span>'
            for it in s["items"][:6] if it.get("image"))
        panels.append(f"""<a class="subject" href="{E(s['dir'])}/index.html">
  <span class="s-num">{i:02d}</span>
  <span class="s-body">
    <span class="s-name">{E(sub['short'])}</span>
    <span class="s-blurb">{E(sub.get('blurb', ''))}</span>
    <span class="s-count">{len(s['items'])} """
                      f"""{E(sub.get('noun_plural', 'items'))}</span>
  </span>
  <span class="s-strip">{strip}</span>
</a>""")
    return hub_page(HUB_TITLE, f"""<header class="hero">
  <h1>{E(HUB_TITLE)}</h1>
  <p class="hero-sub">entry point</p>
  <p class="hero-blurb">{E(HUB_BLURB)}</p>
  <p class="hero-count">{len(subs)} subjects &middot; {total} entries</p>
</header>
<div class="subjects">{''.join(panels)}</div>
<p class="all-link"><a href="all.html">everything in one list &rarr;</a></p>""",
                    klass="hub")


def hub_all(subs):
    # A subject may set "in_all": false in its manifest to stay off the
    # combined list — catalogue subjects with hundreds of rows would otherwise
    # swamp the written guides. It still gets its own panel on the hub index.
    subs = [s for s in subs if s.get("in_all", True)]
    rows = []
    for s in subs:
        sub = s["subject"]
        for it in s["items"]:
            thumb = (f'<img src="{E(s["dir"])}/{E(it["image"])}" alt=""'
                     f' loading="lazy">' if it.get("image")
                     else '<span class="no-thumb"></span>')
            blob = (it["name"] + " " + it["tagline"] + " " + sub["short"] + " "
                    + " ".join(str(v) for v in it.get("facets", {}).values())
                    ).lower()
            rows.append(f"""<a class="row" href="{E(s['dir'])}/{E(it['url'])}"
   data-subject="{E(sub['short'])}" data-text="{E(blob)}">
  <span class="r-num">{E(it['num'])}</span>
  <span class="r-name">{E(it['name'].lower())}</span>
  <span class="r-desc">{E(it['tagline'])}</span>
  <span class="r-kind">{E(sub['short'])}</span>
  <span class="r-thumb">{thumb}</span>
</a>""")
    f = ['<div class="filters">',
         '<input type="search" id="q" placeholder="search" autocomplete="off">',
         '<div class="fgroup">',
         '<button class="f on" data-f="subject" data-v="">all subjects</button>']
    for s in subs:
        n = s["subject"]["short"]
        f.append(f'<button class="f" data-f="subject" data-v="{E(n)}">'
                 f"{E(n.lower())}</button>")
    f.append("</div></div>")
    total = sum(len(s["items"]) for s in subs)
    return hub_page(f"everything — {HUB_TITLE}", f"""<header class="hero">
  <h1>everything</h1>
  <p class="hero-sub">every entry, every subject</p>
  <p class="hero-count">{total} entries</p>
</header>
{''.join(f)}
<div class="index-list" id="grid">{''.join(rows)}</div>
<p class="empty-msg" id="empty" hidden>nothing matches that.</p>
<script src="app.js"></script>""", klass="index")


def build_hub():
    subs = load_subjects()
    if not subs:
        print("no subject folders found here.\n"
              "each subject folder needs a manifest.json — run build_site.py "
              "inside it first.")
        return
    with open(os.path.join(HERE, "style.css"), "w") as f:
        f.write(CSS.replace("%ACCENT%", HUB_ACCENT))
    with open(os.path.join(HERE, "app.js"), "w") as f:
        f.write(JS)
    with open(os.path.join(HERE, "index.html"), "w") as f:
        f.write(hub_index(subs))
    with open(os.path.join(HERE, "all.html"), "w") as f:
        f.write(hub_all(subs))
    open(os.path.join(HERE, ".nojekyll"), "w").close()
    print("hub built from %d subjects:" % len(subs))
    for s in subs:
        print("   %-22s %d %s" % (s["dir"], len(s["items"]),
                                  s["subject"].get("noun_plural", "items")))


# ---------------------------------------------------------------- main


def build_subject():
    os.makedirs(PAGE_DIR, exist_ok=True)
    os.makedirs(IMG_DIR, exist_ok=True)

    with open(os.path.join(HERE, "style.css"), "w") as f:
        f.write(CSS.replace("%ACCENT%", SUBJECT.get("accent", "#ff4f00")))
    with open(os.path.join(HERE, "app.js"), "w") as f:
        f.write(JS)

    slugs = set()
    for i, item in enumerate(ITEMS):
        assert item["slug"] not in slugs, "duplicate slug: " + item["slug"]
        slugs.add(item["slug"])
        with open(os.path.join(PAGE_DIR, item["slug"] + ".html"), "w") as f:
            f.write(item_page(item, i))

    with open(os.path.join(HERE, "index.html"), "w") as f:
        f.write(index_page())

    write_manifest()
    open(os.path.join(HERE, ".nojekyll"), "w").close()

    missing = [it["slug"] for it in ITEMS if not find_images(it)[0]]
    used = set()
    for it in ITEMS:
        m, ex = find_images(it)
        if m:
            used.add(m)
        used.update(x["file"] for x in ex)
    unused = [f for f in sorted(image_index().values()) if f not in used]

    print("built %d %s pages + index."
          % (len(ITEMS), SUBJECT.get("noun", "item")))
    if missing:
        print("\nno picture found for:")
        for m in missing:
            print("   " + m)
    else:
        print("every %s has a picture." % SUBJECT.get("noun", "item"))
    if unused:
        print("\nimages present but unused:")
        for u in unused:
            print("   " + u)


if __name__ == "__main__":
    build_hub() if HUB_MODE else build_subject()
