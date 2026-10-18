#!/usr/bin/env python3
"""Turn the raw renders from cheatsheet.js into PNGs and build the cheat-sheet page.
Usage: build_cheatsheet.py <raw dir> <width> <height> <site dir>
Writes <site dir>/img/*.png and <site dir>/index.html. The page uses ../style.css (the guide's)."""
import json, os, sys, html
import numpy as np
from PIL import Image, ImageDraw

raw_dir, W, H, site = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
img_dir = os.path.join(site, "img"); os.makedirs(img_dir, exist_ok=True)
manifest = json.load(open(os.path.join(raw_dir, "manifest.json")))
outline = json.load(open(os.path.join(raw_dir, "outline.json")))

# pixel images
for m in manifest:
    rgb = np.frombuffer(open(os.path.join(raw_dir, m["file"]), "rb").read(), dtype=np.uint8).reshape(H, W, 3)
    png = m["file"].replace(".rgb", ".png")
    Image.fromarray(rgb).save(os.path.join(img_dir, png), optimize=True)
    m["png"] = png

# outline images, even-odd filled
def bez(p0, p1, p2, p3, n=8):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],
             (1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [k/n for k in range(n)]]
OW, OH = 1000, 520
for i, o in enumerate(outline):
    acc = np.zeros((OH, OW), dtype=np.uint8)
    for sp in o["subpaths"]:
        m = Image.new("L", (OW, OH), 0); pts = sp["pts"]; poly = []
        for k in range(len(pts)):
            a = pts[k]; b = pts[(k+1) % len(pts)]
            poly += bez((a[0][0]*1.7-60, a[0][1]*1.7-140), (a[2][0]*1.7-60, a[2][1]*1.7-140), (b[1][0]*1.7-60, b[1][1]*1.7-140), (b[0][0]*1.7-60, b[0][1]*1.7-140))
        ImageDraw.Draw(m).polygon(poly, fill=1); acc ^= np.array(m)
    tile = np.where(acc[..., None] > 0, np.array([20, 20, 20], dtype=np.uint8), np.array([236, 234, 229], dtype=np.uint8))
    o["png"] = "outline_%02d.png" % (i + 1)
    Image.fromarray(tile.astype(np.uint8)).save(os.path.join(img_dir, o["png"]), optimize=True)

E = html.escape
sections = []
for m in manifest:
    if not sections or sections[-1][0] != m["section"]: sections.append((m["section"], []))
    sections[-1][1].append(m)

parts = []
parts.append('''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>pixachron cheat sheet — photoshop</title>
<link rel="stylesheet" href="../style.css">
<style>
.cs-entry{padding:34px 0;border-bottom:1px solid var(--line)}
.cs-entry h3{font-size:19px;font-weight:600;letter-spacing:-0.015em;margin:0 0 8px}
.cs-entry .cs-num{font-size:12px;color:var(--accent);margin-right:10px}
.cs-entry p{max-width:46em;color:var(--mid);margin:0 0 10px}
.cs-entry ul{font-size:12px;color:var(--soft);margin:0 0 16px;padding-left:1.1em;max-width:60em}
.cs-entry img{display:block;width:%dpx;height:auto;max-width:none;background:var(--panel)}
.cs-wrap{overflow-x:auto}
.cs-sec{padding:60px 0 10px}
.cs-sec h2{font-size:30px;font-weight:600;letter-spacing:-0.025em;margin:0 0 6px}
.cs-sec p{color:var(--mid);max-width:46em;margin:0}
.toc{columns:2;column-gap:40px;font-size:14px;padding:18px 0 0;max-width:60em}
.toc a{display:block;padding:3px 0;color:var(--mid)}.toc a:hover{color:var(--accent)}
.cs-entry.ol img{width:1000px}
</style></head><body class="item">
<header class="topbar"><a class="wordmark" href="../../index.html">guides</a><a class="topbar-mid" href="../index.html">photoshop</a><a class="topbar-right" href="../tools/pixachron.html">pixachron</a></header>
<main>
<header class="chapter"><p class="ch-num">pixachron</p><h1>cheat sheet</h1>
<p class="ch-sub">Every control, one at a time, at 1:1. Each section starts from a reference image; every image after it changes exactly one thing from that reference, named in the heading. Zoom your browser to 100%% to see the pixels as rendered.</p></header>
''' % W)
parts.append('<nav class="toc">')
for name, items in sections: parts.append('<a href="#%s">%s · %d</a>' % (E(name.lower().replace(" ", "-")), E(name.lower()), len(items)))
parts.append('<a href="#outline-mode">outline mode · %d</a></nav>' % len(outline))
k = 0
for name, items in sections:
    parts.append('<section class="cs-sec" id="%s"><h2>%s</h2></section>' % (E(name.lower().replace(" ", "-")), E(name.lower())))
    for m in items:
        k += 1
        parts.append('<article class="cs-entry" id="e%d"><h3><span class="cs-num">%02d</span>%s</h3><p>%s</p><ul>%s</ul><div class="cs-wrap"><img src="img/%s" width="%d" height="%d" loading="lazy" alt="%s"></div></article>'
                     % (k, k, E(m["title"]), E(m["note"]), "".join("<li>%s</li>" % E(s) for s in m["settings"]), m["png"], W, H, E(m["title"])))
parts.append('<section class="cs-sec" id="outline-mode"><h2>outline mode</h2><p>The same effects on a glyph outline instead of pixels, drawn from the paths the engine writes (Poppins Bold, rendered here outside Photoshop). Direction runs the effect on the outline\'s heading; Position on its x and y.</p></section>')
for o in outline:
    k += 1
    parts.append('<article class="cs-entry ol" id="e%d"><h3><span class="cs-num">%02d</span>%s</h3><p>%s</p><ul><li>Domain: %s</li></ul><div class="cs-wrap"><img src="img/%s" width="%d" height="%d" loading="lazy" alt="%s"></div></article>'
                 % (k, k, E(o["title"]), E(o["note"]), E(o["domain"]), o["png"], OW, OH, E(o["title"])))
parts.append('<p class="all-link"><a href="../tools/pixachron.html">back to the pixachron page &rarr;</a></p></main>')
parts.append('<footer class="siteftr"><div class="sf-col"><span>photoshop</span><span>pixachron cheat sheet</span></div><div class="sf-col"><span>%d images</span><span>build_cheatsheet.py</span></div></footer></body></html>' % k)
open(os.path.join(site, "index.html"), "w").write("\n".join(parts))
print("wrote", k, "entries to", os.path.join(site, "index.html"))
