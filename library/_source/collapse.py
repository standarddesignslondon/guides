#!/usr/bin/env python3
"""
Shared rules about identity — imported by merge.py and diff.py.

Both need to agree on two things, and when they disagreed the diff reported
fifty phantom version changes and eight devices as deleted. Keep the rules
here, in one place.
"""

import collections
import re

# Devices built in these sessions. Live sees several files per device — SW
# Radio alone has seventeen — and the catalogue collapses each family to one
# entry linked to its written chapter, under the name the guide uses.
OWN_PREFIXES = ("SW Radio", "Ondes Martenot", "YT Sampler", "Cascade",
                "Microcosmos", "Pulsograph", "ORAM", "The1958Machine",
                "Preset Scroll", "Manual Tape", "Scene Placer",
                "False Memory", "Tape Error", "StripSilence",
                "Disintegration", "Magnabelt", "Splice 1")

# filename prefix -> the name the guide gives it
OWN_GUIDE_NAME = {"The1958Machine": "The 1958 Machine",
                  "StripSilence": "Strip Silence",
                  "Splice 1": "Splice (Tape Collage)"}


def own_prefix(device_name):
    """Which built-here device is this file a copy or variant of, if any."""
    return next((p for p in OWN_PREFIXES if device_name.startswith(p)), None)


def guide_name(prefix):
    return OWN_GUIDE_NAME.get(prefix, prefix)


OWN_NAMES = {guide_name(p) for p in OWN_PREFIXES}


def plugin_key(name):
    """Normalise away the VST2/VST3 spelling differences.

    Live lists both builds of a plugin, and makers do not spell them the same:
    "TR5 Black 76" / "Black76", "Little Plate" / "LittlePlate",
    "UVI Tape Delay" / "Tape Delay". Waves adds Mono/Stereo variants of one
    product on top of that.
    """
    n = name.lower()
    n = re.sub(r"^(tr5|uvi|air|uadx|waves)\s+", "", n)
    n = re.sub(r"\s*(mono/stereo|mono|stereo)$", "", n)
    n = re.sub(r"vst$", "", n)
    return re.sub(r"[^a-z0-9]", "", n)


def collapse_plugins(plugins, has_link=None):
    """One entry per plugin, formats merged, best spelling of the name kept.

    `has_link(vendor, name)` is optional and says whether the researched link
    data is filed under that spelling; the winner records it as _link_name so
    merge.py looks the links up under the spelling that actually has them.
    """
    groups = collections.defaultdict(list)
    for p in plugins:
        groups[(p["vendor"], plugin_key(p["name"]))].append(p)

    out = []
    for (vendor, _), group in groups.items():
        if len(group) == 1:
            out.append(dict(group[0]))
        else:
            names = [g["name"] for g in group]
            stem = re.sub(r"\s*(Mono/Stereo|Mono|Stereo)$", "", names[0])
            if all(re.sub(r"\s*(Mono/Stereo|Mono|Stereo)$", "", x) == stem
                   for x in names):
                pick = dict(group[0])           # Waves channel variants
                pick["name"] = stem
            else:
                pick = dict(max(group, key=lambda g: (" " in g["name"],
                                                      len(g["name"]))))
            fmts = set()
            for g in group:
                fmts.update(g["formats"].split("/"))
            pick["formats"] = "/".join(sorted(fmts))
            # The version string differs between the two builds and is not
            # comparable across them; keep the one belonging to the name kept.
            pick["version"] = next(
                (g["version"] for g in group if g["name"] == pick["name"]),
                pick["version"])
            if has_link:
                for g in group:
                    if has_link(vendor, g["name"]):
                        pick["_link_name"] = g["name"]
                        break
            out.append(pick)

    out.sort(key=lambda x: (x["vendor"].lower(), x["name"].lower()))
    return out


def device_in_scope(d):
    """Devices Live can actually load — not project-folder copies."""
    q = d["path"]
    if "Ableton Live 12 Suite.app" in q:
        return True
    if "/Live Sets/" in q or "Live Sets Archive" in q or " Project/" in q:
        return False
    return ("/User Library/" in q or d["source"] == "Pack"
            or "Factory Packs" in q or "/Packs/" in q)
