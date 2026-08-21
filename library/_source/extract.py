#!/usr/bin/env python3
"""
Step 1 of the library pipeline: read Ableton's own databases.

    python3 extract.py [path to a copy of the Live Database folder]

Defaults to ./live-db/ next to this script. Writes plugins.json and m4l2.json,
which merge.py then combines with the researched links.

The folder wanted is:

    ~/Library/Application Support/Ableton/Live Database/

Copy it while Live is CLOSED, and copy all of it — the .db-wal file holds
writes that have not been folded into the .db yet, so a lone .db is stale.

Two databases matter:

  Live-plugins-1.db     plugins. Three tables mirroring the PluginScanDb.txt
                        log, but current rather than a snapshot. Use this in
                        preference to anything in Preferences/.

  Live-files-<n>.db     the browser index. Max for Live devices are `files`
                        rows whose name ends .amxd; the folder path has to be
                        rebuilt by walking parent_id up to a row in `places`.
                        Metadata keys are big-endian FourCC integers.
"""

import collections
import datetime
import json
import os
import sqlite3
import struct
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))


def locate_db():
    """Find the Live Database folder: argument, connected folder, or copy."""
    if len(sys.argv) > 1:
        return sys.argv[1]
    seen = []
    # A connected Ableton folder, wherever the session mounted it.
    for root in ("/sessions", os.path.expanduser("~/Library/Application Support")):
        for base, dirs, _ in os.walk(root):
            if base.count(os.sep) - root.count(os.sep) > 4:
                dirs[:] = []
                continue
            if os.path.basename(base) == "Live Database":
                seen.append(base)
                dirs[:] = []
    # A copy dropped next to this script.
    local = os.path.join(HERE, "live-db")
    if os.path.isdir(local):
        seen.append(local)
    hits = [d for d in seen
            if any(f.startswith("Live-plugins") for f in os.listdir(d))]
    if not hits:
        sys.exit("could not find a Live Database folder.\n"
                 "Either connect ~/Library/Application Support/Ableton/ to "
                 "this session, copy the Live Database folder to "
                 f"{local}, or pass its path as an argument.")
    if len(hits) > 1:
        print("found more than one, using the newest:")
        for h in hits:
            print("   " + h)
    return max(hits, key=os.path.getmtime)


DB_DIR = locate_db()


def find(prefix):
    """Pick the database Live has actually been writing to.

    The Live Database folder is shared across every installed Live — it is not
    inside the per-version Preferences folders. Usually there is one file per
    prefix, but a beta on a newer schema adds a second (the number in
    Live-files-12300.db is the schema version, not the app version). Choose by
    modification time rather than by name, so it follows whichever Live is in
    use rather than whichever sorts highest.
    """
    hits = [f for f in os.listdir(DB_DIR)
            if f.startswith(prefix) and f.endswith(".db")]
    if not hits:
        sys.exit(f"no {prefix}*.db in {DB_DIR}\n"
                 "copy the whole Live Database folder, Live closed, and pass "
                 "its path as the first argument.")
    hits.sort(key=lambda f: os.path.getmtime(os.path.join(DB_DIR, f)))
    if len(hits) > 1:
        print(f"  {len(hits)} {prefix} databases; using the most recently "
              f"written: {hits[-1]}")
    return os.path.join(DB_DIR, hits[-1])


def warn_stale(path):
    # A zero-length -wal is fine: it means the writes have been checkpointed
    # into the .db. A missing one means the folder was copied file-by-file,
    # and anything Live had not yet flushed is gone.
    if not os.path.exists(path + "-wal"):
        print(f"  ! no write-ahead log beside {os.path.basename(path)} — copy "
              "the whole folder, or recent changes may be missing")


def fourcc(name):
    return struct.unpack(">I", name.encode())[0]


# ------------------------------------------------------------------ plugins

def extract_plugins():
    path = find("Live-plugins")
    warn_stale(path)
    c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    # scanstate is an integer here, not the text the log file uses: 1 is a
    # module Live loaded, anything else it rejected (usually an Intel-only
    # VST2 on Apple silicon, or a shell wrapper Live handles differently).
    mods = {m[0]: m for m in c.execute(
        "select module_id, path, scanstate from plugin_modules")}

    agg = {}
    for pid, mid, name, vendor, version, subcat in c.execute(
            "select plugin_id, module_id, name, vendor, version, subcategories "
            "from plugins where enabled=1"):
        path_ = (mods.get(mid) or (None, "", ""))[1] or ""
        fmt = "VST3" if ".vst3" in path_ else "VST2"
        a = agg.setdefault((vendor or "Unknown", name), {
            "vendor": vendor or "Unknown", "name": name, "version": version,
            "category": (subcat or "").replace("|", ", "), "fmts": set()})
        a["fmts"].add(fmt)
        if subcat:
            a["category"] = subcat.replace("|", ", ")

    out = [{"vendor": a["vendor"], "name": a["name"], "version": a["version"],
            "formats": "/".join(sorted(a["fmts"])), "category": a["category"],
            "url": ""}
           for a in agg.values()]
    out.sort(key=lambda x: (x["vendor"].lower(), x["name"].lower()))

    rejected = [{"path": m[1], "state": m[2]}
                for m in mods.values() if m[2] != 1]
    json.dump(out, open(os.path.join(HERE, "plugins.json"), "w"), indent=1)
    json.dump(rejected, open(os.path.join(HERE, "bad.json"), "w"), indent=1)
    print(f"  plugins: {len(out)} enabled, "
          f"{len({p['vendor'] for p in out})} makers, "
          f"{len(rejected)} modules Live rejected")
    return out


# -------------------------------------------------------------- m4l devices

def extract_devices():
    path = find("Live-files")
    warn_stale(path)
    c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    c.row_factory = sqlite3.Row

    parent, name = {}, {}
    for fid, pid, nm in c.execute("select file_id, parent_id, name from files"):
        parent[fid], name[fid] = pid, nm
    places = {r[0]: r[1] for r in c.execute("select file_id, name from places")}

    def walk(fid, table, depth=80):
        seen = set()
        while fid and fid not in seen and depth:
            seen.add(fid)
            depth -= 1
            if table is not None and fid in table:
                return table[fid]
            fid = parent.get(fid)
        return None

    def full_path(fid, depth=80):
        parts, seen = [], set()
        while fid in name and fid not in seen and depth:
            seen.add(fid)
            depth -= 1
            parts.append(name[fid])
            fid = parent.get(fid)
        return "/".join(reversed(parts))

    def meta(key):
        return {f: v for f, v in c.execute(
            "select m.file_id, v.value from metadata m "
            "join metadata_values v on v.id = m.value_id where m.key = ?",
            (fourcc(key),))}

    ikey, mxty, dvid = meta("IKey"), meta("MxTy"), meta("DvId")

    # how many indexed sets/racks reference each device, keyed on filename
    devices = {r[0]: r[1] for r in c.execute(
        "select id, dev_identifier from devices")}
    use = collections.Counter()
    for _, did in c.execute("select file_id, devices_id from file_devices"):
        d = devices.get(did) or ""
        if ".amxd" in d:
            use[urllib.parse.unquote(d.split("/")[-1])[:-5]] += 1

    rows = []
    for r in c.execute("select file_id, name, device_id, mod_date, file_size, "
                       "subtype from files where name like '%.amxd'"):
        fid = r["file_id"]
        did = r["device_id"] or dvid.get(fid, "")
        kind = ("Instrument" if ":instr:" in did else
                "Audio Effect" if ":audiofx:" in did else
                "MIDI Effect" if ":midifx:" in did else "")
        source = ("Factory" if ":app@" in did else
                  "Pack" if ":pack@" in did else "Project/Other")
        st = (struct.pack(">I", r["subtype"]).decode("latin1")
              if r["subtype"] else "")
        rows.append({
            "name": r["name"][:-5],
            "kind": kind or mxty.get(fid, ""),
            "source": source,
            "place": walk(fid, places) or "",
            "path": full_path(fid),
            "tags": ikey.get(fid, ""),
            "maxtype": mxty.get(fid, ""),
            "version": "",
            "size_kb": round((r["file_size"] or 0) / 1024),
            "modified": (datetime.datetime.utcfromtimestamp(r["mod_date"])
                         .strftime("%Y-%m-%d") if r["mod_date"] else ""),
            "used": use.get(r["name"][:-5], 0),
        })

    json.dump(rows, open(os.path.join(HERE, "m4l2.json"), "w"), indent=1)
    print(f"  max for live: {len(rows)} .amxd files, "
          f"{len({r['name'] for r in rows})} distinct names")
    return rows


if __name__ == "__main__":
    if not os.path.isdir(DB_DIR):
        sys.exit(f"{DB_DIR} does not exist.\n"
                 "Copy ~/Library/Application Support/Ableton/Live Database/ "
                 "there (Live closed), or pass its path as an argument.")
    print(f"reading {DB_DIR}")
    extract_plugins()
    extract_devices()
    print("\nnext: python3 merge.py  →  python3 gen_data.py  →  "
          "python3 ../build_catalogue.py")
