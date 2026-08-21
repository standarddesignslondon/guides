#!/usr/bin/env python3
"""
Catalogue builder — the "library" subject.

The other subjects are chapter books: a handful of things, each with a written
page. This one is an inventory: ~850 plugins and Max for Live devices, no
per-item pages, one long searchable list instead.

It shares the house styling rather than re-declaring it — CSS and JS come
straight out of build_site.py, with a small catalogue-only stylesheet appended
for the wider row and the outbound links. Keep it that way; if the look drifts
here it stops matching the rest of the guides.

    python3 build_catalogue.py

Reads catalogue_data.py (SUBJECT + ENTRIES), writes index.html, style.css,
app.js and manifest.json. The manifest carries "in_all": false so the hub lists
the subject on its front page but leaves its rows out of all.html.
"""

import html
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))

# build_site.py imports site_data at module scope unless it thinks it is in hub
# mode, and this folder has no site_data.py. Borrow its constants without
# tripping that import.
_argv = sys.argv
sys.argv = [_argv[0], "hub"]
sys.path.insert(0, HERE)
import build_site as B  # noqa: E402
sys.argv = _argv

from catalogue_data import SUBJECT, ENTRIES  # noqa: E402

E = html.escape
rich = B.rich

EXTRA_CSS = """
/* ---------- catalogue ---------- */
.cat-row{
  display:grid; align-items:baseline; gap:0 20px;
  grid-template-columns:150px 1fr 96px 150px 120px;
  padding:13px 0; border-bottom:1px solid var(--line);
}
.cat-row[hidden]{display:none}
.cat-row:hover{background:var(--panel2)}
.c-name{font-size:15px; font-weight:600; letter-spacing:-0.01em}
.c-note{font-size:13px; color:var(--mid); line-height:1.45}
.c-type{font-size:12px; color:var(--soft)}
.c-maker{font-size:12px; color:var(--soft); overflow-wrap:anywhere}
.c-links{display:flex; gap:12px; justify-content:flex-end}
.c-links a{font-size:12px; color:var(--soft); border-bottom:1px solid var(--line2)}
.c-links a:hover{color:var(--accent); border-bottom-color:var(--accent)}
.c-links .own{color:var(--accent); border-bottom-color:var(--accent)}
.cat-head{
  display:grid; gap:0 20px;
  grid-template-columns:150px 1fr 96px 150px 120px;
  padding:14px 0 9px; border-bottom:1px solid var(--ink);
  font-size:10px; text-transform:uppercase; letter-spacing:.07em;
  color:var(--soft);
}
.cat-head span:last-child{text-align:right}
.filters{gap:9px 22px}
.fgroup{gap:14px}
.count-line{font-size:12px; color:var(--soft); padding:16px 0 0}
.legend{font-size:13px; color:var(--mid); max-width:46em; padding:22px 0 0;
  border-top:1px solid var(--line); margin-top:30px}
.legend b{font-weight:600}
@media (max-width:980px){
  /* name | maker | links across the top, description and type beneath */
  .cat-row,.cat-head{grid-template-columns:1fr 140px 108px}
  .cat-head span:nth-child(2),.cat-head span:nth-child(3){display:none}
  .c-maker{grid-column:2; grid-row:1}
  .c-links{grid-column:3; grid-row:1}
  .c-note{grid-column:1/4; grid-row:2; padding-top:5px}
  .c-type{grid-column:1/4; grid-row:3; padding-top:4px}
}
@media (max-width:620px){
  .cat-row,.cat-head{grid-template-columns:1fr 96px}
  .cat-head span:nth-child(4){display:none}
  .c-maker{display:none}
  .c-links{grid-column:2; grid-row:1}
  .c-note{grid-column:1/3}
  .c-type{grid-column:1/3}
}
"""

CAT_JS = """
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;
  var rows = Array.prototype.slice.call(grid.querySelectorAll('.cat-row'));
  var empty = document.getElementById('empty');
  var count = document.getElementById('count');
  var state = { q: '' };

  function apply() {
    var shown = 0;
    rows.forEach(function (c) {
      var ok = true;
      Object.keys(state).forEach(function (k) {
        if (k === 'q') return;
        if (state[k] && c.dataset[k] !== state[k]) ok = false;
      });
      if (state.q) {
        var terms = state.q.split(/\\s+/);
        for (var i = 0; i < terms.length; i++) {
          if (c.dataset.text.indexOf(terms[i]) === -1) { ok = false; break; }
        }
      }
      c.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    if (count) count.textContent = shown + ' of ' + rows.length + ' shown';
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
  apply();
})();
"""


def topbar():
    return (f'<header class="topbar">'
            f'<a class="wordmark" href="../index.html">'
            f'{E(SUBJECT.get("hub_label", "guides"))}</a>'
            f'<a class="topbar-mid" href="index.html">{E(SUBJECT["short"])}</a>'
            f'<a class="topbar-right" href="../all.html">everything</a>'
            f"</header>")


def links_cell(e):
    out = []
    if e.get("guide"):
        out.append(f'<a class="own" href="{E(e["guide"])}">guide</a>')
    if e.get("url"):
        out.append(f'<a href="{E(e["url"])}" target="_blank" '
                   f'rel="noopener">product</a>')
    if e.get("manual") and e.get("manual") != e.get("url"):
        out.append(f'<a href="{E(e["manual"])}" target="_blank" '
                   f'rel="noopener">manual</a>')
    return "".join(out)


def index_page():
    rows = []
    for e in ENTRIES:
        blob = " ".join(str(e.get(k, "")) for k in
                        ("name", "maker", "note", "type", "origin", "source",
                         "fmt", "version")).lower()
        rows.append(f"""<div class="cat-row" data-source="{E(e['source'])}"
   data-type="{E(e['type'])}" data-role="{E(e['role'])}"
   data-text="{E(blob)}">
  <span class="c-name">{E(e['name'])}</span>
  <span class="c-note">{rich(e.get('note') or '')}</span>
  <span class="c-type">{E(e['type'])}</span>
  <span class="c-maker">{E(e['maker'])}</span>
  <span class="c-links">{links_cell(e)}</span>
</div>""")

    f = ['<div class="filters">',
         '<input type="search" id="q" placeholder="search" autocomplete="off">']
    for fac in SUBJECT["facets"]:
        vals = sorted({e[fac["field"]] for e in ENTRIES if e.get(fac["field"])})
        if fac.get("order"):
            vals = [v for v in fac["order"] if v in vals] + \
                   [v for v in vals if v not in fac["order"]]
        f.append(f'<div class="fgroup" data-field="{E(fac["field"])}">')
        f.append(f'<button class="f on" data-f="{E(fac["field"])}" data-v="">'
                 f'{E(fac["all"])}</button>')
        for v in vals:
            f.append(f'<button class="f" data-f="{E(fac["field"])}" '
                     f'data-v="{E(v)}">{E(v.lower())}</button>')
        f.append("</div>")
    f.append("</div>")

    title_html = "<br>".join(E(x) for x in SUBJECT["title"].split("\n"))
    body = f"""<header class="hero">
  <h1>{title_html}</h1>
  <p class="hero-sub">{E(SUBJECT['subtitle'])}</p>
  <p class="hero-blurb">{rich(SUBJECT['blurb'])}</p>
  <p class="hero-count">{len(ENTRIES)} entries</p>
</header>
{''.join(f)}
<p class="count-line" id="count"></p>
<div class="cat-head"><span>name</span><span>what it is</span>
<span>type</span><span>maker</span><span>links</span></div>
<div id="grid">{''.join(rows)}</div>
<p class="empty-msg" id="empty" hidden>nothing matches that.</p>
<p class="legend">{rich(SUBJECT['legend'])}</p>
<script src="app.js"></script>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(SUBJECT['short'])} — {E(SUBJECT['subtitle'])}</title>
<link rel="stylesheet" href="style.css">
</head>
<body class="index">
{topbar()}
<main>
{body}
</main>
<footer class="siteftr">
  <div class="sf-col"><span>{E(SUBJECT['short'])}</span>
  <span>{E(SUBJECT['subtitle'])}</span></div>
  <div class="sf-col"><span>generated {date.today().isoformat()}</span>
  <span>build_catalogue.py</span></div>
</footer>
</body>
</html>
"""


def write_manifest():
    out = {
        "subject": {
            "short": SUBJECT["short"],
            "title": SUBJECT["title"].replace("\n", " "),
            "subtitle": SUBJECT["subtitle"],
            "blurb": SUBJECT["blurb"],
            "noun": "entry", "noun_plural": "entries",
            "page_dir": ".",
        },
        "generated": date.today().isoformat(),
        "in_all": False,
        # The hub only reads len(items) and the first few images for a subject
        # kept off all.html, so these are deliberately minimal stubs — writing
        # 851 full records would bloat the repo for nothing.
        "items": [{"num": "%03d" % (i + 1), "slug": e["slug"],
                   "name": e["name"], "tagline": "", "url": "index.html",
                   "image": None, "facets": {}}
                  for i, e in enumerate(ENTRIES)],
    }
    with open(os.path.join(HERE, "manifest.json"), "w") as fh:
        json.dump(out, fh, indent=1)


def main():
    with open(os.path.join(HERE, "style.css"), "w") as f:
        f.write(B.CSS.replace("%ACCENT%", SUBJECT.get("accent", "#ff4f00"))
                + EXTRA_CSS)
    with open(os.path.join(HERE, "app.js"), "w") as f:
        f.write(CAT_JS)
    with open(os.path.join(HERE, "index.html"), "w") as f:
        f.write(index_page())
    write_manifest()
    open(os.path.join(HERE, ".nojekyll"), "w").close()

    import collections
    print("built catalogue: %d entries" % len(ENTRIES))
    print("  by source: %s"
          % dict(collections.Counter(e["source"] for e in ENTRIES)))
    print("  with a product link: %d"
          % sum(1 for e in ENTRIES if e.get("url")))
    print("  with a manual link:  %d"
          % sum(1 for e in ENTRIES if e.get("manual")))
    print("  linked to a guide page: %d"
          % sum(1 for e in ENTRIES if e.get("guide")))
    noname = [e["name"] for e in ENTRIES if not e.get("note")]
    if noname:
        print("  no description for %d entries" % len(noname))


if __name__ == "__main__":
    main()
