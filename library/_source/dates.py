#!/usr/bin/env python3
"""
Step 1b of the library pipeline: how long has each thing been on this Mac?

    python3 dates.py

Run after extract.py, on the Mac itself, with the external drive mounted: it
reads the plugin bundles, Pack folders and .amxd files in place and asks
Spotlight and the installer receipts about them. Writes installed.json, which
merge.py folds into the catalogue.

What the date means: the EARLIEST evidence that the thing was on this Mac. It
was installed on or before that day. Nothing on the Mac records a first-ever
install date reliably, so this is the honest version of one.

Sources, and what checking them showed (3 Nov 2026):

  Date Added (Spotlight's kMDItemDateAdded)
      When the file or bundle appeared in its folder. Installers that update
      in place keep it (Valhalla VST3s still show Nov 2022 after a 2025
      update); installers that delete and replace reset it. Of 252 bundles
      that also had a receipt (leaving out the 29 Oct reset below), 233
      matched it to the minute and 3 to the day; 15 showed an earlier Date
      Added because they had been updated in place since, and 1 a later one
      because its own updater had replaced it.

  installer receipt (pkgutil --file-info)
      Install time of the most recent .pkg that wrote the file. Only for .pkg
      installs. Taken alongside Date Added; whichever is earlier wins.

  Pack install (mtime of the Pack's "Ableton Folder Info/Metadata.cfg")
      Live writes this when it installs a Pack. For Packs installed since the
      folder moved to the external drive it matched Date Added to the minute.
      Moving the folder kept it, so it survives the move where Date Added
      does not.

  NOT a file's creation or modification date. Installers keep the dates from
  the build machine, so a plugin installed on 22 Oct 2026 shows a creation
  date of 5 Oct 2026, and an old download can show 2023.

Bulk events. Some dates are when a whole folder was moved or touched, not when
anything was installed:

  29 Oct 2026, 01:05    Date Added reset on 264 of the 320 VST2 bundles and
                        524 of the 533 AU components, from dozens of makers,
                        minutes after a restart — an operating-system event.
                        VST3 and CLAP were untouched. Ignored outright: the
                        VST3 or receipt dates are used instead, and the AU
                        builds are not consulted at all for that reason.
                        A VST2-only plugin with no receipt is left undated.
  13/14 Aug 2026        the User Library was copied to the external drive,
                        around midnight (216 devices).
  25 May 2025           every Pack installed before then was installed or
                        moved within seven minutes (16 of the 25 Packs with
                        Max devices in them).

A real install is one maker (or one Pack, or one device folder) at a time, so
a minute (an hour, for Packs) in which more than BULK different ones all got
the same date is treated as a bulk event. For plugins those dates are thrown
away. For devices and Packs there is nothing else to go on, so the date is
kept but marked "by": it was there by then, and may have been there long
before.

One more source closes the gap left by delete-and-replace updates: the site's
own history. Anything already listed in a committed catalogue_data.py was
installed by that commit's date, so where that is earlier than everything
above, it wins, marked "by". (MiniFreak V shows Date Added 27 Oct 2026 after
an update, but the catalogue listed it on 21 Aug 2026.)

The Mac itself was set up on 20 Nov 2022, so nothing dates earlier than that;
anything carried over from a previous machine shows the day it arrived here.
"""

import collections
import datetime
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from collapse import plugin_key, device_in_scope  # noqa: E402

BULK = 10


def date_added(paths):
    """Spotlight Date Added for each path, as an aware datetime or None."""
    out = {}
    paths = list(paths)
    for i in range(0, len(paths), 100):
        chunk = paths[i:i + 100]
        raw = subprocess.run(
            ["mdls", "-raw", "-nullMarker", "NULL", "-name",
             "kMDItemDateAdded"] + chunk,
            capture_output=True, text=True).stdout.split("\0")
        for p, v in zip(chunk, raw):
            v = v.strip()
            out[p] = (None if v in ("", "NULL") else
                      datetime.datetime.strptime(v, "%Y-%m-%d %H:%M:%S %z"))
    return out


def receipt(path):
    """Install time of the .pkg that last wrote this file, if one did."""
    r = subprocess.run(["pkgutil", "--file-info", path],
                       capture_output=True, text=True).stdout
    for line in r.splitlines():
        if line.startswith("install-time:"):
            return datetime.datetime.fromtimestamp(
                int(line.split(":")[1]), datetime.timezone.utc)
    return None


def bulk_slots(stamps, fmt):
    """Time slots in which more than BULK different sources all got a date."""
    who = collections.defaultdict(set)
    for source, when in stamps:
        if when:
            who[when.strftime(fmt)].add(source)
    return {s for s, w in who.items() if len(w) > BULK}


def day(when):
    return when.astimezone().strftime("%Y-%m-%d")


# ------------------------------------------------------------------ plugins

def plugin_dates():
    raw = json.load(open(os.path.join(HERE, "plugins.json")))
    groups = collections.defaultdict(set)
    for p in raw:
        groups[(p["vendor"], plugin_key(p["name"]))].update(p.get("paths", []))
    if not any(groups.values()):
        sys.exit("plugins.json has no bundle paths — rerun extract.py first")

    allpaths = {q for s in groups.values() for q in s}
    added = date_added(allpaths)
    vendor_of = {q: v for (v, _), s in groups.items() for q in s}
    minute = "%Y-%m-%d %H:%M"
    bulk = bulk_slots(((vendor_of[q], added[q]) for q in allpaths), minute)
    print(f"  plugins: ignoring Date Added in bulk events at {sorted(bulk)}")

    out, why = {}, collections.Counter()
    for (vendor, key), paths in groups.items():
        seen = []
        for q in paths:
            a = added.get(q)
            if a and a.strftime(minute) not in bulk:
                seen.append((a, "date added"))
            r = receipt(q)
            if r:
                seen.append((r, "installer receipt"))
        if seen:
            when, basis = min(seen)
            out[f"{vendor}\t{key}"] = {"date": day(when), "basis": basis,
                                       "by": False}
            why[basis] += 1
        else:
            why["unknown"] += 1
    print(f"  plugins: {dict(why)}")
    return out


# -------------------------------------------------------------- m4l devices

def pack_root(path, place):
    """The Pack's own folder, named after the Pack. Device folders inside a
    Pack have an "Ableton Folder Info" of their own, so stop at the name."""
    d = os.path.dirname(path)
    while d not in ("/", ""):
        if os.path.basename(d) == place:
            return d
        d = os.path.dirname(d)
    return None


def pack_installed(root):
    info = os.path.join(root, "Ableton Folder Info")
    for f in ("Metadata.cfg", "Properties.cfg"):
        q = os.path.join(info, f)
        if os.path.exists(q):
            return datetime.datetime.fromtimestamp(os.path.getmtime(q),
                                                   datetime.timezone.utc)
    return None


def device_dates():
    rows = [r for r in json.load(open(os.path.join(HERE, "m4l2.json")))
            if device_in_scope(r)
            and "Ableton Live 12 Suite.app" not in r["path"]]
    files = {"/" + r["path"].lstrip("/"): r for r in rows}
    present = [q for q in files if os.path.exists(q)]
    missing = len(files) - len(present)

    packs = [q for q in present if files[q]["source"] == "Pack"]
    user = [q for q in present if files[q]["source"] != "Pack"]

    # Packs: Live's own install stamp on the Pack folder.
    roots = {q: pack_root(q, files[q]["place"]) for q in packs}
    when_pack = {r: pack_installed(r) for r in set(roots.values()) if r}
    hour = "%Y-%m-%d %H"
    bulk_p = bulk_slots(((r, w) for r, w in when_pack.items()), hour)

    # User Library: Date Added of the device file itself.
    added = date_added(user)
    minute = "%Y-%m-%d %H:%M"
    bulk_u = bulk_slots(((os.path.dirname(q), added[q]) for q in user), minute)
    print(f"  devices: bulk events (kept, marked 'by') — Packs at "
          f"{sorted(bulk_p)}, User Library at {sorted(bulk_u)}")

    out, why = {}, collections.Counter()

    def put(q, when, basis, by):
        out[files[q]["path"]] = {"date": day(when), "basis": basis, "by": by}
        why[basis + (" (by)" if by else "")] += 1

    for q in packs:
        w = when_pack.get(roots[q])
        if w:
            put(q, w, "pack install", w.strftime(hour) in bulk_p)
        else:
            why["unknown"] += 1
    for q in user:
        a = added.get(q)
        if a:
            put(q, a, "date added", a.strftime(minute) in bulk_u)
        else:
            why["unknown"] += 1
    print(f"  devices: {dict(why)}"
          + (f", {missing} files not found on disk" if missing else ""))
    return out


# ------------------------------------------------------- the site's history

def catalogue_key(e):
    if e["source"] == "Plugin":
        return f"Plugin\t{e['maker']}\t{plugin_key(e['name'])}"
    return f"{e['source']}\t{e['name']}"


def first_listed():
    """Earliest committed catalogue_data.py listing each entry."""
    repo = os.path.dirname(os.path.dirname(HERE))
    rel = "library/catalogue_data.py"
    log = subprocess.run(["git", "-C", repo, "log", "--reverse",
                          "--format=%H %ad", "--date=short", "--", rel],
                         capture_output=True, text=True).stdout.split("\n")
    out = {}
    for line in filter(None, log):
        sha, when = line.split()
        src = subprocess.run(["git", "-C", repo, "show", f"{sha}:{rel}"],
                             capture_output=True, text=True).stdout
        ns = {}
        exec(compile(src, rel, "exec"), ns)
        for e in ns.get("ENTRIES", []):
            out.setdefault(catalogue_key(e), when)
    print(f"  catalogue history: {len(out)} entries across "
          f"{len(list(filter(None, log)))} commits")
    return out


if __name__ == "__main__":
    data = {"plugins": plugin_dates(), "devices": device_dates(),
            "listed": first_listed()}
    json.dump(data, open(os.path.join(HERE, "installed.json"), "w"),
              indent=1, sort_keys=True)
    print("wrote installed.json")
