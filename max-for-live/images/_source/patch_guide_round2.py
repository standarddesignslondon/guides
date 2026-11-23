#!/usr/bin/env python3
"""One-off (23 Nov 2026): add the round-2 Push 3 screens to the Max for Live
guide (site_data.py): status, facts, Push screen image, banks regenerated
from the new .amxd files, a 'push 3 screen' section, and the rebuild notes
moved into a 'rebuilding' section after it. Run from Guides/max-for-live."""
import os, json, shutil, importlib.util

M4L = os.path.expanduser("~/mnt/Max for Live")
SD = "site_data.py"
BACKUP = "images/_source/site_data_backup_2026-11-23b.py"
CAPTION = "Push 3 screen, Live 13 (rendered offline; Push's own font differs slightly)"
SCREEN_NOTE = ("**Screen** is the last button above the display (slot 8) in every bank: it switches between "
               "the device's own picture and Push's normal view.")
BTN_NOTE = "Button rows start at slot 2 — Push 3 reserves the leftmost top-row button for the device name."

D = {
 "pulsograph": dict(amxd="Pulsograph Device/Pulsograph.amxd", ver="1.1", img="Pulsograph Device/tests/screen_lane1.png",
   status="Complete · v1.1 Push screen awaiting test",
   build="`python3 build_pulsograph_v11.py` builds v1.1 (Push screen + pattern from a clip), already frozen with all four js files embedded. v1.0 is kept as `Pulsograph v1.0.amxd`. Don't run the old `build_pulsograph.py` on its own: it would overwrite `Pulsograph.amxd` with an unfrozen v1.0.",
   shows="A **pen chart recorder**. Dark chart paper scrolls with the song, bar numbers along the bottom, and four pens ink every hit as a little trace of its voice: THUD a slowing swing, TICK a needle, BURST a scribble, ODD a beating pattern. Height is Level and accent, length is Decay, swing rate is Tune, shape is Tone; Grit steps and crackles the trace, Var varies each hit, delay echoes trail behind, Drift nudges hits off the grid lines (drawn twice as large as heard) and Electricity adds hum. Ahead of the pens the coming steps are punched into the paper (filled = accent, a tick = that lane's loop restarting). The right panel follows the bank: a lane's voice as a large specimen trace, the echo train (Delay), or the motor, mains, volume and pattern source (Master). The pens lift when the transport stops.",
   more=[{"title": "pattern from a clip",
          "text": "**Source** (Master bank, knob 5; on the face under BOUNCE) chooses **Grid** or **Clip**. Clip reads the MIDI clip playing on Pulsograph's track, so the pattern can be made on Push: notes 36–39 map straight to lanes 1–4, otherwise the clip's pitches, lowest first, become lanes 1–4. Velocity 101 or more is an accent; up to 32 sixteenths (2 bars). No clip playing gives an empty pattern. Entering Clip sets every lane to loop at x1; in Clip mode the grid shows FROM CLIP, can't be clicked, and MIDI notes 36–39 stop triggering lanes so the clip doesn't play twice. The hand-made grid is overwritten by the clip."}]),
 "oram": dict(amxd="ORAM Device/ORAM.amxd", ver="1.1", img="ORAM Device/tests/screen_perform.png",
   status="Stages 1–5 passed · 6a–6d awaiting test · v1.1 Push screen awaiting test",
   build="`python3 build_oram_v11.py` builds v1.1 (the Push screen), already frozen with the strips, capture and screen js embedded. v1.0 is kept as `ORAM v1.0.amxd`. Don't run the old `build_oram.py` on its own: it would write an unfrozen v1.0 over `ORAM.amxd`.",
   shows="**The film gate.** The seven strips run through the gate right to left past the photocell scan line, the whole loop always in view: PITCH as a melody line, VIB, VOL 1–4 and SEND as filled shapes. Each photocell lights by what it reads, the pitch it reads is tagged beside the line, bar notches run along the top and a bright seam marks where the loop restarts. The right panel follows the bank: **Perform** shows the four glass slides glowing by their level right now, with the summed waveform, note and Hz; **Score** shows what the next transcription will write, the Mode and the slide rack; **Gate** shows the dropped file's waveform with its bracket and preview playhead, and the chamber's tail.",
   more=[{"title": "standalone push", "text": "The slide library is read from a folder on the Mac, so on Push standalone the slides won't load. The screen is for Push 3 with Live on the Mac."}]),
 "cascade": dict(amxd="Cascade Device/Cascade.amxd", ver="1.1", img="Cascade Device/tests/screen_perform.png",
   status="Complete · v1.1 Push screen awaiting test",
   build="`python3 build_cascade_v11.py` builds v1.1 (the Push screen), already frozen with the morph and screen js embedded, so no freeze step. v1.0 is kept as `Cascade v1.0.amxd`. Don't run the old `build_cascade.py` on its own: it would write an unfrozen v1.0 over `Cascade.amxd`.",
   shows="**The cascade.** Time runs left to right from the input meter to the last echo. What you play flows along the middle (already Chopped) and lights each tap as it arrives. Each tap is a bar: up is its left-channel share, down its right. Width zig-zags them, Taper shortens them, Spread bunches them, Pre-delay shifts them right, Feedback adds fainter repeats a Length further on, Slurm blurs and wobbles them and Tone colours them from dark blue to warm gold. With Sync on the ruler counts beats. The right panel follows the bank: **Machine** shows the taps from above (stereo position against delay), **Perform** the Morph loom between A (the dials) and B (Set B) with the Chop shape and rate, **Levels** the In and Out meters and the Mix.",
   more=[]),
 "gen-loss": dict(amxd="Generation Loss Device/Gen Loss.amxd", ver="1.1", img="Generation Loss Device/Gen Loss source/tests/screen_pedal_vhs.png",
   status="Awaiting test · v1.1 Push screen",
   build="`python3 \"Gen Loss source/build_genloss_v11.py\"` builds v1.1, starting from `Gen Loss v1.0.amxd` (the older `dsp.genexpr` in the source folder predates the working device's fix). The gen~ code only gains eight report outlets for the screen, so the sound is unchanged.",
   shows="**A VHS monitor.** The output is drawn as a scan-line picture of the last ten seconds, newest on the right, and the gen~ code's real faults happen to it: Wow bends the top of the picture, Flutter jitters the lines, drops leave white streaks and dark gaps, snags tear a band sideways, crinkle pops are white flecks, and Noise adds snow plus a rolling hum bar (or the VCR head-switching tear with Hum Type VCR). A strip underneath marks every drop, snag and pop. Model sets the colour smear. Aux Stop slows the picture at the real tape speed, freezes it and shows the blue STOP screen; Aux Fail fills a TRACKING meter; the counter runs at tape speed. The right panel follows the bank: the machine with its EQ curve and a wow-and-flutter meter (Pedal), the footswitch, onset curve and the two tape heads (Aux & Stereo), the drive curve and noise floor (Hidden).",
   more=[]),
 "mood": dict(amxd="Mood Device/Mood.amxd", ver="1.1", img="Mood Device/Mood source/tests/screen_2_play_delay.png",
   status="Awaiting test · v1.1 Push screen",
   build="`python3 \"Mood source/build_mood_v11.py\"` builds v1.1 from `Mood v1.0.amxd` with `Push Screen Kit/pushscreen_genfx.py`. The gen~ code only gains report outlets for the screen, so the sound is unchanged.",
   shows="**The flow, as in the manual: input, micro-looper, wet channel.** The Loop LED shows listening (red) or playing (green). While listening the looper strip rolls in the last Length of what the looper hears; flip Loop to play and it freezes into the loop with the real playhead (Tape: speed and direction; Env: the stuttered slice lights; Stretch: the grain crawling through). Overdub paints new layers on and Fade dims the old ones; the routing lines light when they carry sound. The wet channel is drawn per mode: Reverb a drifting cloud that lives as long as the real decay, Delay one ripple per repeat, Slip chunks thrown forwards or backwards; Freeze turns it to ice. Everything is tinted by the **mood ring**, which follows the Clock from calm violet-blue at full rate through green and amber to a stressed near-black. The right panel follows the bank (Mood, Switches, Hidden, Dips).",
   more=[{"title": "short loops", "text": "The loop picture is drawn from level readings 30 times a second, so loops shorter than about half a second show as a flat band."}]),
 "bad-mood": dict(amxd="Bad Mood Device/Bad Mood.amxd", ver="1.1", img="Bad Mood Device/Bad Mood source/tests/screen_2_burst_relay.png",
   status="Awaiting test · v1.1 Push screen",
   build="`python3 \"Bad Mood source/build_badmood_v11.py\"` builds v1.1 from `Bad Mood v1.0.amxd` with `Push Screen Kit/pushscreen_genfx.py`. The gen~ code only gains report outlets for the screen, so the sound is unchanged.",
   shows="**Loop, loop mode, wet, glue.** The micro-loop is wrapped into a ring with the real read heads; while listening it fills from what you play. **Burst** shows the eight steps as wedges starting where your onsets were caught, the playing step lit and a flash on each fill. **Radio** is a shortwave dial with the five stations, static filling the gaps from the real tuning amount. **Mask** marks the loud parts of the loop that get masked. The wet box draws **Soup** as four delay lines churning, **Relay** as its equal repeats (ping-pong with Spread) and **Flip** as the harmony voices on a stave. The output meter gets redder and coarser with Glue. Everything is coloured by the **bad mood ring**: a sulky violet at full clock rate, bruising through crimson to a furious near-black red as the clock drops, and the stone cracks. The right panel follows the bank (Bad Mood, Switches, Character, Setup).",
   more=[{"title": "short loops", "text": "The loop picture is drawn from level readings 30 times a second, so very short loops show as a flat band."}]),
 "the-1958-machine": dict(amxd="The 1958 Machine/The1958Machine.amxd", ver="2.2", img="The 1958 Machine/tests/screen_3_machine_loop.png",
   status="v2.2 · Push screen awaiting test",
   build="`python3 build_1958machine_v22.py` builds v2.2 from `The1958Machine v2.1.amxd` with `Push Screen Kit/pushscreen_genfx.py`: 13 report outlets for the screen (the sound is unchanged), the banks made static, frozen.",
   shows="**The Room 306 signal chain as a studio rack**, in the order the sound passes through it: ERA, COLOUR, METAL, SHIFT, BELL, TAPE, SPLICE, WHEEL, CHAMBER, ECHO. A unit lights when its dial is above 0 and stays grey when bypassed; the units the current bank controls get amber titles. Each draws what it is doing from the real gen~ values: the era's band, the band-pass at its real centre (wandering with Instability), the ring modulator's carrier, harmonics moved by the shifter, the bell's five partials ringing. **TAPE** has reels turning at Speed (backwards with Reverse), REC while capturing, then the captured loop itself with the real playhead and the HandSync second machine drifting against it, and a red flash on a dropout. SPLICE shows the grains being cut, WHEEL the five taps glowing with the feedback, CHAMBER the room filling (and a loaded IR when IRMix is up), ECHO the repeats at EchoTime and the Width.",
   more=[]),
 "kurzwellen": dict(amxd="Kurzwellen Device/Kurzwellen.amxd", ver="1.1", img="Kurzwellen Device/tests/screen_2_crash_het.png",
   status="Complete · v1.1 Push screen awaiting test",
   build="`python3 build_kurzwellen_v11.py` builds v1.1 from `Kurzwellen v1.0.amxd` with `Push Screen Kit/pushscreen_genfx.py`: 18 report outlets for the screen (the sound is unchanged), frozen.",
   shows="**The path the signal takes.** Left, a night-time cross-section of the world: the transmitter sends the input up to the ionosphere, which bends it back down to the receiver aerial. The ionosphere is drawn from the real Conditions generator: its height follows the slow flat-fade phase, its ripples move with Rate and grow with Depth, and an Iono lurch sends a shock along it. With Fade on, the two delayed multipath rays bounce higher in the layer the longer their real delay. The events happen in the picture: a dropout breaks the rays up, a static crash is lightning with a sky flash, flutter is aurora above the layer, and Hetero adds a second station on the horizon, whistling at its real frequency. Right, the receiver: a **magic-eye** tube (signal strength, closing on a dropout) with the AGC's real gain, the glass tuning dial with the real frequency shift, the IF passband from Bandwidth with the grit in it and the het whistle as a spike, and a lamp for each module.",
   more=[]),
}


def amxd_banks(path):
    raw = open(os.path.join(M4L, path), "rb").read()
    j0 = 48 if raw[32:36] == b"mx@c" else 32
    p = json.loads(raw[j0:].split(b"\x00")[0].decode("utf-8"))["patcher"]
    short = {}
    for b in p["boxes"]:
        b = b["box"]
        if b.get("parameter_enable"):
            v = b["saved_attribute_attributes"]["valueof"]
            short[v["parameter_longname"]] = v.get("parameter_shortname") or v["parameter_longname"]
    out = []
    for k in sorted(p["parameters"]["parameterbanks"], key=int):
        bk = p["parameters"]["parameterbanks"][k]
        out.append({"name": bk["name"], "encoders": [short[n] for n in bk["parameters"] if n != "-"],
                    "buttons": [short[n] for n in bk["buttons"] if n != "-"]})
    return out


def span(s, start):
    """index just past the bracket/brace that opens at s[start], skipping strings"""
    open_c = s[start]; close_c = {"[": "]", "{": "}"}[open_c]; depth = 0; i = start; q = None
    while i < len(s):
        c = s[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "\"'": q = c
        elif c in "[{": depth += 1
        elif c in "]}":
            depth -= 1
            if depth == 0: return i + 1
        i += 1
    raise ValueError("unbalanced")


def lit(x):
    return json.dumps(x, ensure_ascii=False)


def main():
    src = open(SD, encoding="utf-8").read()
    if not os.path.exists(BACKUP):
        shutil.copy(SD, BACKUP)
    spec = importlib.util.spec_from_file_location("sd0", SD); sd0 = importlib.util.module_from_spec(spec); spec.loader.exec_module(sd0)
    old = {it["slug"]: it for it in sd0.ITEMS}
    for slug, d in D.items():
        it = old[slug]
        assert "push 3 screen" not in [x.get("label") for x in it.get("sections", [])], slug + " already done"
        a = src.index('"slug": "%s"' % slug)
        nxt = src.find("ITEMS.append(", a); b = nxt if nxt > 0 else len(src)
        blk = src[a:b]
        # status, facts, image
        st0 = '"status": %s,' % lit(it["status"])
        if st0 not in blk:
            i0 = blk.index('"status":'); i1 = blk.index("\n", i0); st0 = blk[i0:i1]
        blk = blk.replace(st0, '"status": %s,\n    "facts": %s,' % (lit(d["status"]), lit({"version": d["ver"], "push screen": "Live 13 / Max 9.2"})), 1)
        i0 = blk.index('"folder":'); i1 = blk.index("\n", i0)
        blk = blk[:i1 + 1] + '    "extra_images": %s,\n' % lit([{"file": slug + "-push", "caption": CAPTION}]) + blk[i1 + 1:]
        # banks from the .amxd, notes kept
        nb = amxd_banks(d["amxd"])
        oldb = it.get("banks", [])
        for i, bk in enumerate(nb):
            note = oldb[i].get("note", "") if i < len(oldb) and oldb[i]["name"] == bk["name"] else ""
            if slug == "the-1958-machine" and bk["name"] == "Studio":
                note = "The four buttons appear on both Machine and Studio, as before."
            if i == len(nb) - 1:
                if any(x != "Screen" for x in bk["buttons"]) and BTN_NOTE not in note:
                    note = (note + " " + BTN_NOTE).strip() if "slot 2" not in note else note
                note = (note + " " + SCREEN_NOTE).strip()
            if note: bk["note"] = note
        i0 = blk.index('"banks": ['); i1 = span(blk, i0 + len('"banks": '))
        blk = blk[:i0] + '"banks": [\n' + "".join("        %s,\n" % lit(x) for x in nb) + "    ]" + blk[i1:]
        # sections: push 3 screen, then rebuilding (moved from "rebuild")
        notes = [{"title": "what it shows", "text": d["shows"]}] + d["more"] + [
            {"title": "the screen button", "text": "**Screen** is the last button above the display, in every bank. It switches between this picture and Push's normal view. Push still draws the encoder names and values on top of the picture, so turning an encoder works exactly as before."},
            {"title": "what it needs", "text": "Live 13 with Max 9.2 or later, and Push 3. Custom Push graphics are a Live 13 beta feature, so Ableton may still change how they work. The picture is drawn only while this device is the one showing on Push."},
            {"title": "not yet tried on push", "text": "Built and checked in the offline Push Screen Kit simulator on 23 Nov 2026 (the picture above is its render); not yet run in Live or on Push. The old version is kept beside the new one."}]
        i0 = blk.index('"rebuild": ['); i1 = span(blk, i0 + len('"rebuild": '))
        inner = blk[i0 + len('"rebuild": ['):i1 - 1].rstrip().rstrip(",")
        sec = ('"sections": [\n        {"label": "push 3 screen", "type": "notes", "data": [\n'
               + "".join("            %s,\n" % lit(x) for x in notes)
               + '        ]},\n        {"label": "rebuilding", "type": "notes", "data": [\n            %s,%s\n        ]},\n    ]' % (lit(d["build"]), inner))
        blk = blk[:i0] + sec + blk[i1:]
        src = src[:a] + blk + src[b:]
        # image
        shutil.copy(os.path.join(M4L, d["img"]), os.path.join("images", slug + "-push.png"))
    open(SD, "w", encoding="utf-8").write(src)
    spec = importlib.util.spec_from_file_location("sd1", SD); sd1 = importlib.util.module_from_spec(spec); spec.loader.exec_module(sd1)
    new = {it["slug"]: it for it in sd1.ITEMS}
    assert len(new) == len(old)
    for slug in D:
        n = new[slug]
        assert "rebuild" not in n and [s["label"] for s in n["sections"]] == ["push 3 screen", "rebuilding"], slug
        assert n["sections"][1]["data"][1:] == old[slug]["rebuild"], slug
        for k in old[slug]:
            if k not in ("status", "banks", "rebuild"): assert n[k] == old[slug][k], (slug, k)
        print(slug, "ok:", [(b["name"], b["buttons"]) for b in n["banks"]])


main()
