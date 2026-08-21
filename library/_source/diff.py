#!/usr/bin/env python3
"""
Step 2 of the library pipeline: what actually changed?

    python3 diff.py

Compares a fresh extract (plugins.json / m4l2.json, written by extract.py)
against the catalogue currently published (../catalogue_data.py), and prints
the entries that are new, gone, or changed version.

The point is to keep updates cheap: only genuinely new entries need their
product and manual links researching. Everything already in the catalogue
keeps the links and corrections it has.

Writes new_entries.json — the list to research, and nothing else.
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))


from collapse import (collapse_plugins, plugin_key, own_prefix, guide_name,
                      OWN_NAMES, device_in_scope)


def load_current():
    try:
        from catalogue_data import ENTRIES
    except ImportError:
        print("no catalogue_data.py yet — treating everything as new.\n")
        return []
    return ENTRIES


def main():
    current = load_current()
    have_plugin = {(e["maker"], plugin_key(e["name"])): e
                   for e in current if e["source"] == "Plugin"}
    have_m4l = {e["name"] for e in current if e["source"] == "Max for Live"}

    # Compare like with like: collapse the fresh extract the same way the
    # catalogue is collapsed, or every VST2/VST3 pair reads as a change.
    plugins = collapse_plugins(json.load(open(os.path.join(HERE,
                                                          "plugins.json"))))
    devices = json.load(open(os.path.join(HERE, "m4l2.json")))

    new, gone, bumped = [], [], []

    seen_p = set()
    for p in plugins:
        k = (p["vendor"], plugin_key(p["name"]))
        seen_p.add(k)
        old = have_plugin.get(k)
        if not old:
            new.append({"kind": "plugin", "name": p["name"],
                        "maker": p["vendor"], "category": p["category"],
                        "version": p["version"]})
        elif old.get("version") and old["version"] != p["version"]:
            bumped.append((p["vendor"], p["name"],
                           old["version"], p["version"]))
    for k, e in have_plugin.items():
        if k not in seen_p:
            gone.append(("plugin", e["maker"], e["name"]))

    seen_d = set()
    own_variants = 0
    for d in devices:
        if not device_in_scope(d):
            continue
        # A built-here device appears as many files; count it once, under the
        # name the guide gives it, or its variants read as new every time.
        own = own_prefix(d["name"])
        if own:
            if guide_name(own) in seen_d:
                own_variants += 1
            seen_d.add(guide_name(own))
            continue
        seen_d.add(d["name"])
        if d["name"] not in have_m4l:
            new.append({"kind": "max for live", "name": d["name"],
                        "maker": "", "category": d["kind"],
                        "place": d["place"]})
    for n in have_m4l - seen_d:
        gone.append(("max for live", "", n))

    print(f"catalogue has {len(current)} entries")
    print(f"fresh extract: {len(plugins)} plugins, "
          f"{len(seen_d)} devices in scope\n")

    if new:
        print(f"NEW — {len(new)} to research:")
        for n in sorted(new, key=lambda x: (x["kind"], x["name"].lower())):
            print(f"   {n['kind']:14} {n['name']}"
                  + (f"  ({n['maker']})" if n["maker"] else "")
                  + (f"  [{n.get('place')}]" if n.get("place") else ""))
    else:
        print("NEW — nothing")

    if gone:
        print(f"\nGONE — {len(gone)}, drop from the catalogue:")
        for k, m, n in sorted(gone):
            print(f"   {k:14} {n}" + (f"  ({m})" if m else ""))

    if bumped:
        print(f"\nVERSION CHANGED — {len(bumped)}, links stay as they are:")
        for v, n, a, b in sorted(bumped):
            print(f"   {n} ({v}): {a} → {b}")

    if own_variants:
        print(f"\n({own_variants} extra files of devices built here ignored "
              "— merge.py collapses each family to one entry)")

    json.dump(new, open(os.path.join(HERE, "new_entries.json"), "w"), indent=1)
    print(f"\nwrote new_entries.json ({len(new)} entries)")
    if new:
        print("research those, add them to the links_*.json files, then:\n"
              "  python3 merge.py → python3 gen_data.py → "
              "python3 ../build_catalogue.py")


if __name__ == "__main__":
    main()
