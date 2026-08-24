# -*- coding: utf-8 -*-
"""
Content for the Max for Live device guide.

Everything the site shows lives here. Edit a value, run `python3 build_site.py`,
refresh the page. Inline markup: **bold**, *italic*, `code`.

SUBJECT configures the site as a whole; ITEMS is one dict per device. The full
schema is documented in the reference-guide-site skill.
"""

SUBJECT = {
    "short": "max for live",
    "title": "max for live\ndevices",
    "subtitle": "user guide",
    "blurb": (
        "An aide-m\u00e9moire for the devices in the Max for Live folder \u2014 what "
        "every control does, how the Push 3 encoders are laid out, and the "
        "handful of things each one needs you to remember."
    ),
    "noun": "device",
    "noun_plural": "devices",
    "page_dir": "devices",
    "hub": "../index.html",
    "hub_label": "guides",
    "accent": "#ff4f00",
    "facets": [
        {"field": "kind", "label": "types", "all": "all types",
         "fact_label": "type"},
        {"field": "author", "label": "makers", "all": "everyone",
         "fact_label": "built by"},
    ],
}

ITEMS = []

# --------------------------------------------------------------------------
# CASCADE
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "cascade",
    "name": "Cascade",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Complete",
    "folder": "Cascade Device",
    "tagline": "Multi-tap machine — up to 64 echoes spread across a window "
               "you shape by hand.",
    "blurb":
        "An UltraTap-equivalent built from scratch. Rather than one delay time, "
        "Cascade scatters 1–64 taps across a **Length** window and lets you "
        "reshape their spacing (Spread), level contour (Taper) and stereo "
        "placement (Width). Add Feedback, Tone, Slurm and a Chop block in front "
        "and it runs from tight slapback through rhythmic clouds to full "
        "soundscape wash. Wet level is energy-normalised, so Taps and Taper "
        "change *character*, not loudness.",
    "quickstart": [
        "Drop `Cascade.amxd` on an audio track — drums or a short vocal phrase "
        "show it off best.",
        "Mix ~50, Taps 8, Length ~800 ms gives eight even echoes. That's the "
        "baseline everything else deforms.",
        "Sweep **Spread** to hear the taps bunch toward the end (+) or the "
        "start (−); **Taper** fades them down (+) or swells them up (−).",
        "For the soundscape: Taps 30+, Length 5 s, Slurm 80, Feedback 70, "
        "Taper −30, Tone −80.",
    ],
    "controls": [
        {
            "title": "Tap machine",
            "rows": [
                ["Length", "10 ms – 10 s (log)",
                 "The time over which all the taps are spaced. Dragging it "
                 "crossfades each tap to its new position (40 ms, equal-power) "
                 "so there is **no pitch shift and no judder**."],
                ["Taps", "1 – 64", "How many echoes fill the window."],
                ["Pre-delay", "0 – 1 s", "Silence before the first tap."],
                ["Spread", "±100",
                 "0 = even. Positive groups taps toward the end (speeding up), "
                 "negative toward the start (slowing down). Past ±50 the "
                 "spacing goes exponential."],
                ["Taper", "±100",
                 "Positive fades the taps down, negative fades them up "
                 "(reverse-ish). Past ±50 exponential."],
                ["Width", "±100",
                 "Alternating equal-power pans; the sign picks which side the "
                 "first tap lands on. 0 = centred, stereo input preserved."],
                ["Feedback", "0 – 100 %",
                 "The whole tap pattern repeats every Length. `tanh` in the "
                 "loop means it saturates rather than running away, even at 100."],
                ["Sync", "Free / Sync",
                 "Sync quantises Length, Pre-delay and the Chop LFO to note "
                 "values at Live's tempo (1/64 to 8 bars, incl. dotted and "
                 "triplet). The same dials keep working — values snap to the "
                 "grid. Swell/Trig envelope times stay free."],
            ],
        },
        {
            "title": "Signal",
            "rows": [
                ["Mix", "0 – 100 %", "100 = all wet. Gentle nonlinear taper."],
                ["In / Out", "−60 … +12 dB",
                 "In feeds wet **and** dry, as on the original."],
                ["Tone", "±100",
                 "Tilt at 700 Hz: negative darker taps, positive brighter "
                 "(±10 dB shelves). Wet only — the dry signal is untouched."],
                ["Slurm", "0 – 100 %",
                 "Slow multi-voice detune (~8–17 cents at full) plus "
                 "small-reverb diffusion. Taps lose their attacks and chorus "
                 "into a wash as it rises. 0 is exactly transparent."],
            ],
        },
        {
            "title": "Chop (pre-tap, wet input only)",
            "intro": "Chop happens *before* the tap machine, so feedback tails "
                     "are not re-chopped.",
            "rows": [
                ["Chop", "Off / Tri / Saw / Ramp / Sqr / S+H / Swell / Trig",
                 "Tri through S+H are tremolo LFOs. **Swell** removes attacks "
                 "so notes fade up. **Trig** lets each hit through then chokes "
                 "it; silence re-arms it."],
                ["Rate", "0 – 100",
                 "Multi-function: LFO speed 0.1–20 Hz; Swell rise 5 ms–2 s; "
                 "Trig release 10 ms–2 s. All log."],
                ["Sens", "0 – 100 %",
                 "Onset threshold for Swell and Trig — higher is more "
                 "sensitive. Ignored by the LFO modes."],
            ],
        },
        {
            "title": "Morph",
            "rows": [
                ["Morph", "0 – 100 %",
                 "Travels 12 sound parameters (everything except In/Out/Chop "
                 "mode/Sync) from the **current** dial positions toward the "
                 "stored B snapshot. 0 = dials live and exact; 100 = pinned to "
                 "B. Automate 0↔100 for the Hotswitch trick."],
                ["Set B", "button",
                 "Captures the current dial state as the B snapshot. Persists "
                 "with the Set."],
            ],
        },
    ],
    "banks": [
        {"name": "Machine",
         "encoders": ["Length", "Taps", "Pre-delay", "Spread", "Taper",
                      "Width", "Feedback", "Sync"]},
        {"name": "Perform",
         "encoders": ["Morph", "Mix", "Tone", "Slurm", "Chop", "Rate", "Sens"],
         "buttons": ["Set B"],
         "note": "Set B on Push is momentary — it fires the snapshot capture "
                 "and resets itself."},
        {"name": "Levels", "encoders": ["In", "Out"]},
    ],
    "workflow": [
        {"title": "Length is a shape control, not a time control",
         "text": "Because each tap crossfades to its new position rather than "
                 "the read head travelling, you can drag Length live — even "
                 "with feedback up — and hear the echo pattern redistribute "
                 "smoothly. That's the whole point of the machine."},
        {"title": "The party trick",
         "text": "Square Chop + Slurm 60 + Feedback 60 + Taps 30 — chopped "
                 "fragments smear into rhythmic clouds."},
        {"title": "Morph as a performance move",
         "text": "Dial a sound, press Set B, twist the dials somewhere else, "
                 "then ride Morph. The journey survives a Set save/reload."},
    ],
    "gotchas": [
        "**Freeze after every rebuild.** `build_cascade.py` writes an "
        "*unfrozen* device; without a freeze the js can't be found and Morph "
        "is dead. Open in Live → Edit (spanner) → snowflake → Cmd+S.",
        "\"no function cur\" errors *at device load* are benign (messages beat "
        "the js compile). The same errors *after* load mean the freeze didn't "
        "happen.",
        "Never rescue a copy from an old Set — rebuild from the script instead.",
    ],
    "rebuild": [
        "`python3 build_cascade.py` builds `Cascade.amxd` + `Cascade.maxpat` "
        "from nothing and runs the wiring post-checks. Then **freeze**.",
        "`python3 sim_cascade.py` is an offline mirror of the DSP maths — run "
        "it after any change to the gen~ code.",
    ],
})

# --------------------------------------------------------------------------
# MICROCOSMOS
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "microcosmos",
    "name": "Microcosmos",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Complete",
    "folder": "Microcosmos Device",
    "tagline": "Replica of the Hologram Microcosm pedal — 11 granular / loop "
               "effects, 44 variations, and a 30-second phrase looper.",
    "blurb":
        "Eleven effects in four families (Micro Loop, Granules, Glitch, "
        "Multidelay), each with four variations, sitting in front of a post "
        "section of pitch modulation, four-mode reverb and a master filter. "
        "**Activity** and **Repeats** are the two macros that reshape whatever "
        "effect you're in. Tempo follows Live. The signal path is engines → "
        "pitch mod → reverb (Space) → filter → mix.",
    "quickstart": [
        "Drop `Microcosmos.amxd` on an audio track and play something.",
        "Turn **Effect** and **Variation** — that's most of it.",
        "**Activity** = more of whatever this effect does. **Repeats** = how "
        "long it goes on for.",
        "**Subdiv** sets the musical grid the effect works on (and the Hold "
        "capture length).",
    ],
    "controls": [
        {
            "title": "Engine",
            "rows": [
                ["Effect",
                 "Mosaic · Seq · Glide · Haze · Tunnel · Strum · Blocks · "
                 "Intrpt · Arp · Pattern · Warp",
                 "Manual order — the four families are Micro Loop (1–3), "
                 "Granules (4–6), Glitch (7–9), Multidelay (10–11)."],
                ["Variation", "A / B / C / D", "Four per effect, 44 in total."],
                ["Subdiv", "1/4 – 8x",
                 "The effect's musical grid: loop lengths, tap spacing, step "
                 "sizes, and the Hold capture length."],
                ["Activity", "0 – 100",
                 "The \"more of what this effect does\" macro — voices, "
                 "density, glide rate, manipulation or step count depending on "
                 "the effect."],
                ["Repeats", "0 – 100",
                 "The \"how long it goes on\" macro — feedback, loop decay, or "
                 "burst frequency in Interrupt."],
                ["Direction", "Fwd / Rev",
                 "Reverse playback of the effect engines — backwards grains "
                 "and loops at true pitch."],
                ["Shape", "Rise / Flat / Fall / Tri",
                 "Gain contour across voices/taps; the glide pattern in Glide."],
                ["Hold", "toggle",
                 "Freezes the last Subdiv of input and loops it into the "
                 "engines indefinitely. Dry stays live so you play on top. "
                 "Cleared when the looper activates."],
            ],
        },
        {
            "title": "Post section",
            "rows": [
                ["Space", "0 – 100", "Wet ↔ reverb blend. 100 % = reverb only."],
                ["Reverb", "Room / Dark / Hall / Amb",
                 "Fixed-geometry tank; switchable mid-tail without clicks."],
                ["Filter / Reso", "0 – 100",
                 "Master resonant low-pass at the end of the chain. 100 = "
                 "bypass, 0 kills the wet."],
                ["Mod Depth / Mod Rate", "0 – 100 · 0.1–8 Hz",
                 "Pitch modulation: 0 = off and exactly transparent, through "
                 "chorus, to a ±4.6-semitone wobble."],
                ["Mix", "0 – 100",
                 "Dry/wet crossfade. 100 % mutes the dry, so Interrupt truly "
                 "interrupts — as on the pedal."],
                ["Eff Vol", "−60 … +12 dB", "Wet master volume."],
            ],
        },
        {
            "title": "Phrase looper (30 s stereo + overdub layer)",
            "intro": "The round light beside the PHRASE LOOPER label is the "
                     "pedal's indicator LED: **red = recording, green = "
                     "playing, amber = overdub, off = empty or stopped**.",
            "rows": [
                ["Looper", "Off / On",
                 "Master on/off for the looper. Turning it on clears Hold."],
                ["Rec", "footswitch-style",
                 "Empty → **Recording** (capturing silently) → press again: "
                 "loop closes and **Playing** starts → again: **Overdub** → "
                 "again: back to Playing. From Stopped, Rec resumes playback."],
                ["Stop / Undo / Erase", "buttons",
                 "Stop keeps the loop. Undo wipes overdubs, leaving the first "
                 "phrase. Erase clears everything."],
                ["Loop Spd", "1/4x – 4x", "Playback speed of the loop."],
                ["Loop Dir", "Fwd / Rev", "Loop playback direction."],
                ["Loop Lvl", "0 – 100", "Loop return level."],
                ["Routing", "Post / Pre",
                 "**Post** records the wet — layer different effects per pass. "
                 "**Pre** records dry and replays it through the engines, so "
                 "tweaking knobs reprocesses the loop."],
                ["Quantize", "Free / Quant",
                 "Rounds the loop to Live's beat grid when it closes."],
                ["Loop Only", "FX / Loop",
                 "Mutes the engines; the loop passes through the post section "
                 "alone."],
            ],
        },
    ],
    "banks": [
        {"name": "Engine",
         "encoders": ["Effect", "Variation", "Subdiv", "Activity", "Repeats",
                      "Mix", "Shape", "Direction"]},
        {"name": "Post",
         "encoders": ["Filter", "Reso", "Space", "Reverb", "Mod Depth",
                      "Mod Rate", "Eff Vol"],
         "buttons": ["Hold"]},
        {"name": "Looper",
         "encoders": ["Loop Spd", "Loop Dir", "Loop Lvl", "Routing",
                      "Quantize", "Loop Only"],
         "buttons": ["Looper", "Rec", "Stop", "Undo", "Erase"],
         "note": "Button rows start at slot 2 — Push 3 reserves the leftmost "
                 "top-row button for the device name."},
    ],
    "workflow": [
        {"title": "To record a NEW phrase over an old one, Erase first",
         "text": "Like the pedal, pressing Rec on an existing loop means "
                 "overdub or resume — never re-record."},
        {"title": "The two routing modes are different instruments",
         "text": "Post-routing layers finished sounds pass by pass. "
                 "Pre-routing keeps the loop dry, so every knob move "
                 "reprocesses the whole phrase live."},
        {"title": "The eleven effects, briefly",
         "text": "**Mosaic** layered octave-stacked loopers · **Seq** 8-step "
                 "slice sequencer · **Glide** four loopers gliding in pitch · "
                 "**Haze** grain cloud · **Tunnel** three drone micro-loopers · "
                 "**Strum** repeats of the last note onset · **Blocks** step "
                 "glitch rearranger · **Intrpt** clean passthrough interrupted "
                 "by micro-montage bursts · **Arp** arpeggiates slices of the "
                 "last 8 onsets · **Pattern** multi-tap in 4 rhythms · **Warp** "
                 "multi-tap with per-tap treatments."},
    ],
    "gotchas": [
        "The looper is 30 s at 48 kHz and drops proportionally at higher "
        "sample rates — it's sized to stay under gen~'s per-device memory "
        "ceiling. Going bigger makes Live silently bypass the device (knobs "
        "inert, audio dry: that's the tell).",
        "**Strum** waits for a note onset before it does anything.",
        "Push banks are baked statically into the device file, so they exist "
        "before Push scans the device — fresh adds, Set loads and Push "
        "reconnects all show the same layout.",
        "Not replicated on purpose: the 16 preset slots (Live's presets cover "
        "it), expression pedal, MIDI CC map, bypass/trails modes, and the "
        "Burst looper mode.",
    ],
    "rebuild": [
        "`python3 build_microcosmos.py` regenerates the `.amxd` + `.maxpat` "
        "with full validation. **No freeze is ever needed** — there's no "
        "external js anywhere.",
        "`python3 sim_microcosmos.py` runs 15 suites / 102 checks mirroring "
        "the DSP maths.",
        "Never rescue a copy from an old Live Set — rebuild instead.",
    ],
})

# --------------------------------------------------------------------------
# KURZWELLEN
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "kurzwellen",
    "name": "Kurzwellen",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Complete",
    "folder": "Kurzwellen Device",
    "tagline": "Shortwave-radio simulator \u2014 makes anything sound like it is "
               "being received rather than played.",
    "blurb":
        "Not another tape device. Tape degradation is **mechanical**; shortwave "
        "degradation is **atmospheric**, and the signatures are completely "
        "different \u2014 multipath comb filtering that sweeps as the ionosphere "
        "moves, fades that an AGC chases back up, a receiver hissing into its "
        "own noise floor, and interference arriving in bursts. Nine modules, "
        "each with a toggle and an amount, all breathing together under one "
        "shared drift source: the coherence of everything degrading *at the "
        "same time* is what sells it. Named for Stockhausen's *Kurzwellen* "
        "(1968), for players with shortwave receivers.",
    "quickstart": [
        "Drop `Kurzwellen.amxd` on an audio track. Play something with a voice "
        "in it.",
        "That's most of it \u2014 the defaults are the classic \"voice on a "
        "distant station\".",
        "**Bandwidth** is how much radio. **Fade** is how much ionosphere.",
        "**Shape** and **Depth** set how the whole device moves. Depth 0 "
        "freezes everything and costs nothing in level.",
    ],
    "controls": [
        {
            "title": "Receiver",
            "intro": "The chain models propagation then reception: "
                     "Width \u2192 Tune \u2192 Fade \u2192 Band \u2192 Grit "
                     "\u2192 AGC \u2192 Events \u2192 +Het \u2192 Mix.",
            "rows": [
                ["Bandwidth", "1.0 \u2013 8.0 kHz",
                 "The IF filter, and the thing that makes it a radio. Fixed "
                 "90 Hz high-pass plus a 4-pole low-pass, 24 dB/oct \u2014 "
                 "shortwave sounds *band-limited*, not merely darkened. Always "
                 "on; there is no bypass."],
                ["Width", "0 \u2013 100",
                 "Stereo \u2192 mono collapse. 100 is bit-exact passthrough, 0 "
                 "is full L+R mono. Defaults to 0 because real shortwave is "
                 "mono."],
                ["Mix", "0 \u2013 100",
                 "Dry/wet. 100 mutes the dry entirely \u2014 this is usually an "
                 "insert \"make it radio\" effect, so that is the default."],
            ],
        },
        {
            "title": "Ionosphere",
            "rows": [
                ["Fade", "0 \u2013 100 + toggle",
                 "Multipath. Direct plus two delayed copies (0.7 and 1.9 ms) "
                 "whose times and gains drift independently, making a slowly "
                 "sweeping comb \u2014 the hollow, almost-reverby character. "
                 "Plus a flat fade of up to \u221214 dB on the slowest drift "
                 "phase. Sets blend only; **Depth** sets how far things move."],
                ["Tune", "\u2212150 \u2026 +150 Hz + toggle",
                 "A **frequency** shifter, not a pitch shifter: every partial "
                 "moves by a fixed number of Hz, so the harmonic series goes "
                 "inharmonic. That is the queasy metallic sound of a mistuned "
                 "SSB receiver. Centre-detented \u2014 \u00b12 Hz snaps to "
                 "zero, and at zero it is exactly zero."],
            ],
        },
        {
            "title": "Detector and gain",
            "rows": [
                ["Grit", "0 \u2013 100 + toggle",
                 "Detector distortion plus signal-correlated noise. The noise "
                 "is multiplied by the input envelope, so it makes the *signal* "
                 "gritty and dies when the input stops \u2014 it will not fight "
                 "anything layered underneath. Subtle around 20\u201335, proper "
                 "AM overmodulation crunch at 100."],
                ["AGC", "0 \u2013 100 + toggle",
                 "The receiver's gain stage. Boost only, up to +18 dB, slewing "
                 "down fast and up slowly. That recovery lag is the breathing, "
                 "and it is what chases Fade's flat fades back up \u2014 "
                 "blooming slightly loud before it settles."],
            ],
        },
        {
            "title": "Interference",
            "rows": [
                ["Events", "0 \u2013 100 + toggle",
                 "Density, from roughly one every 20 s at 10 to one every "
                 "1.5 s at 100. Three types, weighted 4/2/2: **Dropout** "
                 "(ducks 20\u201340 dB for 60\u2013400 ms, and dips the AGC "
                 "detector too, so you get a swell afterwards), **Crash** "
                 "(band-passed noise burst, 80\u2013300 ms decay, louder at "
                 "higher density) and **Flutter** (200\u2013600 ms of "
                 "8\u201320 Hz shallow AM, 6 dB deep)."],
                ["Hetero", "0 \u2013 100 + toggle",
                 "The adjacent-carrier whistle. One sine wandering 400\u20132800 "
                 "Hz with a slow amplitude wobble so it never sounds like a "
                 "test tone. **Defaults off.**"],
            ],
        },
        {
            "title": "Conditions",
            "intro": "One generator with eight decorrelated output phases, one "
                     "per consumer \u2014 not eight LFOs. Everything degrades "
                     "together, which is the whole illusion.",
            "rows": [
                ["Shape", "Sine / Drift / Jump / Iono",
                 "**Sine** plain LFO, predictable. **Drift** smoothed random "
                 "walk \u2014 the default, and the one that sounds most like "
                 "real propagation. **Jump** sample-and-hold steps. **Iono** "
                 "Drift with sudden lurches every 10\u201330 s, which also "
                 "double the event rate for about a second afterwards."],
                ["Rate", "0.02 \u2013 2 Hz",
                 "Log-scaled. The flat fade deliberately rides the slowest "
                 "phase, so at the default 0.12 Hz it takes around 25 seconds "
                 "to come round."],
                ["Depth", "0 \u2013 100",
                 "Scales every consumer's modulation span. 0 freezes all drift "
                 "\u2014 still filtered and gritty, but stationary \u2014 and "
                 "costs exactly nothing in level."],
            ],
        },
    ],
    "banks": [
        {"name": "Signal",
         "encoders": ["Bandwidth", "Fade", "Tune", "Grit", "AGC", "Events",
                      "Hetero", "Mix"]},
        {"name": "Conditions",
         "encoders": ["Shape", "Rate", "Depth", "Width"],
         "buttons": ["Fade On", "Tune On", "Grit On", "AGC On", "Events On",
                     "Het On"],
         "note": "Button rows start at slot 2 \u2014 Push 3 reserves the "
                 "leftmost top-row button for the device name."},
    ],
    "workflow": [
        {"title": "It processes only what you feed it",
         "text": "There is no background static bed \u2014 that was left out on "
                 "purpose. Layer real atmosphere from the **SW Radio** device "
                 "underneath if you want it. What Kurzwellen *does* generate is "
                 "receiver behaviour: correlated detector noise, AGC hiss, "
                 "static crashes and the heterodyne whistle."},
        {"title": "Set the weather first, then the radio",
         "text": "Shape, Rate and Depth decide how the whole device moves; the "
                 "module amounts decide how much of each symptom you hear. "
                 "Getting the Conditions right first makes the rest quick."},
        {"title": "Iono is the one to reach for when it feels too even",
         "text": "Lurches arrive every 10\u201330 s and drag everything with "
                 "them, and they double the event rate while they last. Bad "
                 "conditions cluster; that is what stops long passages sounding "
                 "like an LFO."},
        {"title": "The whistle re-tunes itself in Jump and Iono",
         "text": "It rides the same Conditions phase everything else does, so "
                 "when that phase steps, the whistle steps with it \u2014 like "
                 "a neighbouring station being retuned. No separate control for "
                 "it."},
    ],
    "gotchas": [
        "**AGC only boosts.** On a signal already above its target it correctly "
        "sits at unity and does nothing \u2014 that is what an AGC does, not a "
        "fault. It earns its keep on quieter material and on anything Fade is "
        "already pulling down.",
        "**With AGC on, silence does not go fully silent.** The receiver turns "
        "itself up into its own noise floor between phrases: about \u221255 dB "
        "at the default 45, rising to a \u221230 dB ceiling at 100. Turn AGC "
        "off if that is a nuisance.",
        "**Width does not deepen Fade's comb**, despite what you might expect. "
        "Fade processes left and right with shared control signals, so each "
        "channel gets an identically-defined comb whatever the source "
        "correlation \u2014 measured, it is 10.7 dB at Width 0 against 10.8 dB "
        "at Width 100. Width is a stereo-image utility, nothing more.",
        "**Tune's wander scales with the dial.** At centre it is exactly 0 Hz. "
        "That is deliberate: applied at centre the wander was the entire shift, "
        "and \u00b16.6 Hz is 93 cents on a 120 Hz voice \u2014 nearly a "
        "semitone of wobble.",
        "Every module is bit-exact transparent at amount 0 or toggle off. All "
        "eight of them, verified individually and together.",
    ],
    "rebuild": [
        "`python3 build_kurzwellen.py` regenerates the `.amxd` + `.maxpat` with "
        "full validation. **No freeze is ever needed** \u2014 there is no "
        "external js anywhere.",
        "`python3 sim_kurzwellen.py` runs 11 suites mirroring the DSP maths "
        "(about 150 s). `--full` adds the 60 s stability soak.",
        "Rebuilding from the script alone into an empty folder produces "
        "byte-identical files. Never rescue a copy from an old Live Set.",
    ],
})

# --------------------------------------------------------------------------
# PULSOGRAPH
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "pulsograph",
    "name": "Pulsograph",
    "kind": "Instrument",
    "author": "Claude",
    "status": "Complete",
    "folder": "Pulsograph Device",
    "tagline": "Early-electronic rhythm machine — four synthesis lanes on a "
               "32-step grid that drifts like a real motor.",
    "blurb":
        "Four lane voices, each able to be any of four classes (Thud, Tick, "
        "Burst, Odd), sequenced on a 32-step grid with per-lane length, "
        "direction and rate. Timing is sample-accurate inside gen~ and derived "
        "from Live's transport, so loops and relocates resync for free — but "
        "**Drift** lets the whole thing breathe against the grid like a "
        "machine with a motor. Add per-lane Grit, slow parameter wander (Var), "
        "a delay circuit and hum/hiss, and it exports to audio or MIDI.",
    "quickstart": [
        "Drop `Pulsograph.amxd` on a MIDI track. The face is cream; the grid "
        "is top-left.",
        "Click cells on lane 1 and press play. Click cycles a cell: off → red "
        "(on) → dark (accent) → off. Drag to paint.",
        "**Alt-click** (or ctrl-click) a cell to move the red bracket — that's "
        "the lane's loop length. Set lanes to 16 / 12 / 13 / 8 and a phasing "
        "polyrhythm develops.",
        "**Shift-drag vertically** on a cell to pitch that step ±12 semitones "
        "around the lane's Tune. A tick mark appears in the cell.",
        "Notes **36–39** (C1–D#1) fire lanes 1–4 from pads, merged with the "
        "internal sequence.",
    ],
    "controls": [
        {
            "title": "Per lane (×4)",
            "intro": "Tune, Tone and Decay are **class-relative** — the same "
                     "dial means something different per class.",
            "rows": [
                ["Class", "Thud / Tick / Burst / Odd",
                 "The lane's synthesis engine. Changing it while playing may "
                 "cut or morph a ringing tail — that's fine."],
                ["Tune", "class-relative",
                 "Thud: pitch 30–120 Hz · Tick: ping 1.5–8.5 kHz · Burst: band "
                 "centre 200 Hz–4 kHz · Odd: carrier 80–1280 Hz."],
                ["Tone", "class-relative",
                 "Thud: harmonic drive (sine → square-ish) · Tick: sine ping ↔ "
                 "noise click · Burst: filter resonance · Odd: ring-mod ratio "
                 "0.5–7, non-integer."],
                ["Decay", "0 – 1", "Length of the hit."],
                ["Level", "0 – 1", "Lane level. At 0 the lane is silent "
                 "whatever Var is doing (the wander is multiplicative)."],
                ["Grit", "0 – 1",
                 "Decimation down to ~2 kHz sample-hold, quantisation to ~4 "
                 "bits, sporadic static crackle and a dusty tail. Exactly "
                 "transparent at 0."],
                ["Var", "0 – 1",
                 "How far Tune, Tone, Decay and Level may slowly wander "
                 "(5–8 s memory), independently. At 0.15 the lane subtly "
                 "changes over a minute; at 1 it wanders far from the dials — "
                 "which themselves don't move."],
            ],
        },
        {
            "title": "Grid (per lane)",
            "rows": [
                ["Length", "1 – 32 steps", "Alt-click a cell to set it."],
                ["End mode", "`>` loop / `<>` ping-pong",
                 "Ping-pong bounces; endpoints play once per cycle."],
                ["Rate", "x2 x1 /2 /3 /4 /6 /8", "Multiplier on 16ths. `/3` "
                 "against `x1` gives a dotted-8th feel."],
                ["Step offsets", "±12 semitones",
                 "Shift-drag a cell. Class-relative, applied at fire time. MIDI "
                 "pad hits ignore offsets and always play the lane's dialled "
                 "tune."],
            ],
        },
        {
            "title": "Delay circuit",
            "rows": [
                ["Mode", "Steps / Time",
                 "**Steps**: delay = n × one 32nd at Live's tempo, on the same "
                 "grid the sequencer walks. **Time**: dialled directly."],
                ["Steps", "1 – 32",
                 "n = 3 against 16ths is the classic dotted echo; 5 or 7 give "
                 "polyrhythmic echoes."],
                ["Time", "0.1 – 1000 ms (log)",
                 "Sub-millisecond turns the circuit into a comb "
                 "filter/resonator — try high Feedback and Wet with a Tick lane."],
                ["Feedback", "0 – 0.95",
                 "One-pole lowpass + `tanh` per pass: repeats get duller and "
                 "rounder, never louder."],
                ["Wet / Tone", "0 – 1", "Wet 0 is exactly the dry machine. Tone "
                 "sets loop darkness."],
                ["Grit", "0 – 1",
                 "The same dirt, but **inside** the feedback loop, so it "
                 "compounds per repeat."],
            ],
        },
        {
            "title": "Master & export",
            "rows": [
                ["Volume", "0 – 1", "Master level."],
                ["Drift", "0 – 1",
                 "Sequencer hits land late by a wandering few ms — one slow "
                 "shared motor curve (~2 s memory) plus tiny per-hit jitter, "
                 "0–~20 ms. **MIDI hits are never drifted** — you're playing "
                 "those. 0 = sample-tight."],
                ["Electricity", "0 – 1",
                 "Always-present 50 Hz hum + harmonics, hiss bed, faint "
                 "supply-sag ripple, and extra drive into the master "
                 "saturation. The hum bed is *not* sent to the delay — it's "
                 "chassis, not signal."],
                ["Bars", "1 – 8", "Export length."],
                ["To MIDI", "button",
                 "Writes the grid as a MIDI clip in this track's first empty "
                 "Session slot. Notes 36–39, accents = velocity 127, plain = "
                 "88. Lengths, modes and rates are flattened over n bars."],
                ["Bounce", "button",
                 "Transport must be running. Records the device's actual "
                 "output — drift, grit, hum, delay — from the next bar for n "
                 "bars, writes a wav, then creates a new audio track with the "
                 "clip. Press again mid-bounce to cancel."],
            ],
        },
    ],
    "banks": [
        {"name": "Lane 1", "encoders": ["Class", "Tune", "Tone", "Decay",
                                        "Level", "Grit", "Var"]},
        {"name": "Lane 2", "encoders": ["Class", "Tune", "Tone", "Decay",
                                        "Level", "Grit", "Var"]},
        {"name": "Lane 3", "encoders": ["Class", "Tune", "Tone", "Decay",
                                        "Level", "Grit", "Var"]},
        {"name": "Lane 4", "encoders": ["Class", "Tune", "Tone", "Decay",
                                        "Level", "Grit", "Var"]},
        {"name": "Delay", "encoders": ["Mode", "Steps", "Time", "Feedback",
                                       "Wet", "Tone", "Grit"]},
        {"name": "Master",
         "encoders": ["Volume", "Drift", "Electricity", "Bars"],
         "buttons": ["To MIDI", "Bounce"],
         "note": "Lanes never straddle banks — one lane per page. Buttons are "
                 "momentary and self-resetting."},
    ],
    "workflow": [
        {"title": "Polyrhythm comes from lane lengths, not from the grid",
         "text": "Different lengths per lane phase against each other. Add "
                 "per-lane Rate dividers on top and complex patterns fall out "
                 "of very few clicks."},
        {"title": "Var is what makes it a piece rather than a loop",
         "text": "Small Var values (~0.15) make a lane drift in character over "
                 "a minute or two without you touching anything. It's the "
                 "difference between a pattern and a performance."},
        {"title": "Bounce captures the imperfections",
         "text": "To MIDI gives you the notes; Bounce gives you the actual "
                 "sound including drift, hum and delay. If you play the "
                 "exported MIDI clip on the same track it will retrigger the "
                 "lanes — mute them (Level 0) or move the clip elsewhere."},
    ],
    "gotchas": [
        "**Freeze required from stage 2 on** — there's external js. Rebuild → "
        "Edit in Max → snowflake → Cmd+S. A blank/white grid area means the "
        "device isn't frozen.",
        "\"no function beats\" errors at the *top* of the Max console are "
        "benign — messages arriving before the js engines compile.",
        "Bounces land in **`~/Music/Pulsograph`** — create that folder once in "
        "Finder; the device can't make it.",
        "Don't change tempo mid-bounce.",
    ],
    "rebuild": [
        "`python3 build_pulsograph.py`, then add to Live and **freeze**.",
        "Offline checks: `sim_voice.py`, `sim_seq.py`, `sim_drift.py`, "
        "`sim_delay.py`, `sim_grit.py`, plus `node test_grid_node.js` and "
        "`node test_export_node.js`.",
    ],
})

# --------------------------------------------------------------------------
# ORAM
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "oram",
    "name": "ORAM",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Stages 1–5 passed · 6a–6d awaiting test",
    "folder": "ORAM Device",
    "tagline": "Drawn sound after Daphne Oram's Oramics — paint film strips "
               "and the machine performs them.",
    "blurb":
        "Four voices read single-cycle waveforms (\"slides\") from a 128-strong "
        "library; seven painted lanes (\"film strips\") drive pitch, vibrato, "
        "four voice volumes and a reverb send across a bar-synced loop. It also "
        "listens: **Capture** turns whatever is playing into a new slide, and "
        "**To Score** transcribes a phrase you just played straight into the "
        "strips. Then you vandalise the drawing.",
    "quickstart": [
        "Drop `ORAM.amxd` on an audio track — it's an audio effect so it can "
        "hear the instrument before it.",
        "Pick slides for the four voices; set **Freq** and the Gains to hear "
        "the drone.",
        "**Open Editor** → a floating window with seven painted lanes. Draw "
        "freehand with the mouse.",
        "Turn **Scan** on and start the transport: the strips drive the engine, "
        "looping over **Bars**. Scan off returns to Freq/dial behaviour.",
        "Play a phrase into the track, then press **To Score** — the editor "
        "opens with your phrase drawn into Pitch and Vol 1.",
    ],
    "controls": [
        {
            "title": "Voices",
            "rows": [
                ["Slide 1–4", "1 – 256",
                 "Which single-cycle waveform each voice reads. The library is "
                 "128 starter slides; captured ones continue from 129."],
                ["Gain 1–4", "0 – 1", "Per-voice trim. Still active in Scan "
                 "mode — the volume lanes multiply these."],
                ["Freq", "20 – 2000 Hz",
                 "The drone pitch when **Scan** is off."],
                ["Master", "0 – 1",
                 "Overall level. Scales dry **and** the chamber send."],
                ["Scan", "Off / On",
                 "On = the painted strips drive the engine, bar-synced to "
                 "Live's transport. Off = Freq and the dials work alone."],
                ["Bars", "1 / 2 / 4 / 8",
                 "Strip length. The drawing always spans the whole loop, so "
                 "dropping from 4 to 1 plays the same drawing four times as "
                 "fast."],
            ],
        },
        {
            "title": "The strips (editor window)",
            "intro": "Seven lanes: **Pitch** (double height, spans MIDI 36–84, "
                     "mid-line ≈ C4), **Vibrato** (up to ±2 st of 5.5 Hz "
                     "wobble), **Vol 1–4**, and **Send** (to the chamber).",
            "rows": [
                ["Res", "2 – 512",
                 "Transcription detail — how many values per strip a scoring "
                 "pass writes. 512 = nimble tracking, 32 = stepped terraces, "
                 "8 = big gated slabs, 2 = two long tones. Never touches lanes "
                 "you drew by hand."],
                ["Mode", "Literal / Portrait",
                 "How **Capture** builds a slide. Literal finds one stable "
                 "cycle of the source (degrades on noisy material). Portrait "
                 "averages the magnitude spectrum and resynthesises from the "
                 "first ~64 harmonics — robust, and the default."],
                ["Target", "Score / Pitch / Vol 1–4 / Send",
                 "Where the next **To Score** pass lands. **Score** = full "
                 "replace (melody → Pitch, envelope → Vol 1, everything else "
                 "cleared). The others overdub a single lane and change nothing "
                 "else."],
                ["Capture", "button",
                 "Turns the recent audio into a new slide, written to "
                 "`slides/` and appended to the library live."],
                ["To Score", "button",
                 "Transcribes the last strip-length of audio into the strips "
                 "via **Target**."],
            ],
        },
        {
            "title": "Film gate",
            "intro": "Drop a WAV or AIFF straight in — no sampler, no realtime "
                     "playing, exact alignment.",
            "rows": [
                ["Drop WAV", "drop zone",
                 "The whole file appears in the waveform, is selected end to "
                 "end, and is immediately transcribed through the current "
                 "Target."],
                ["Gate Start / Gate Length", "nudge encoders",
                 "Bracket a slice. On screen, drag in the waveform or edit the "
                 "ms readouts; on Push these are relative spring-back dials."],
                ["Gate Step", "1 / 10 / 100 / 1000 ms",
                 "How far one encoder detent moves a bracket."],
                ["Preview", "toggle", "Auditions the bracketed slice raw "
                 "through the track, with a playhead."],
                ["Rescore", "button",
                 "Re-transcribes the current slice via Target. So: Target = "
                 "Score for melody + Vol 1, then bracket a different stretch, "
                 "Target = Vol 2, Rescore — one file scoring several voices."],
            ],
        },
        {
            "title": "Chamber",
            "intro": "\"The room down the hall\" — a gen~ comb/allpass network "
                     "fed by the **Send** lane, exactly the strip the real "
                     "machine had for its echo-chamber send.",
            "rows": [
                ["Chamber", "0 – 1", "Wet return level. 0 = dry device."],
                ["Decay", "0.2 – 12 s", "RT60. Long decays mean long tails, "
                 "not louder reverb — comb feedback is compensated."],
                ["Damp", "0 – 0.95",
                 "The room eats its highs; also shortens the audible tail."],
            ],
        },
    ],
    "banks": [
        {"name": "Perform",
         "encoders": ["Freq", "Gain 1", "Gain 2", "Gain 3", "Gain 4", "Master",
                      "Chamber", "Scan"]},
        {"name": "Score",
         "encoders": ["Target", "Res", "Bars", "Mode", "Slide 1", "Slide 2",
                      "Slide 3", "Slide 4"]},
        {"name": "Gate",
         "encoders": ["Gate Start", "Gate Length", "Gate Step", "Decay", "Damp"],
         "buttons": ["Capture", "To Score", "Rescore", "Preview"],
         "note": "The full loop with hands on Push: play pads → Score page, "
                 "set Target → Gate page, press To Score. Or: Gate page, nudge "
                 "the brackets, Preview, Rescore."},
    ],
    "workflow": [
        {"title": "Scoring passes — build the score up in layers",
         "text": "Play the line with Target = Score, then switch to Vol 2, "
                 "choose a different slide for voice 2, play the phrase again "
                 "(only its dynamics are kept), and so on. Four performances "
                 "breathing inside one drawn melody. One pitch serves all four "
                 "voices — that's the machine's own monophony."},
        {"title": "The Send-lane trap",
         "text": "With **Scan on**, the chamber only sounds where the Send lane "
                 "is painted — and both the default lanes and To Score leave "
                 "Send at zero. If the chamber seems dead, turn Scan off first "
                 "and check the wet meter."},
        {"title": "The ring remembers 60 seconds",
         "text": "Capture and To Score rewind through the ring to the most "
                 "recent audio, so you can press them any time within a minute "
                 "of playing. A fully quiet ring reports \"too quiet\"."},
        {"title": "Where the breadcrumbs live",
         "text": "All capture diagnostics print to the **Max window** prefixed "
                 "\"ORAM:\". In Live: right-click the device title bar → Open "
                 "Max Window. They name the failing step instantly."},
    ],
    "gotchas": [
        "**Freezing is required** from stage 3 on — two external js files. "
        "Delete the old instance, drag `ORAM.amxd` in fresh from the folder "
        "(*not* from an old Set), Edit in Max, snowflake, Cmd+S. A healthy "
        "freeze prints \"Adding file oram_strips.js\" and \"Adding file "
        "oram_capture.js\" with no \"Unable to add\".",
        "Script builds are **always unfrozen**. If a device opens in Max "
        "already frozen, it isn't a fresh build — delete it, don't save it. "
        "Saving a stale frozen instance overwrites the good `ORAM.amxd`.",
        "Slide files are indexed by their 3-digit filename prefix. **Never "
        "rename them** — captured slides continue the numbering.",
        "A flat Pitch line after To Score is usually correct: a single repeated "
        "pitch transcribes as a level line. Play a phrase with moving notes.",
        "The slide-library path is baked into the device's readfolder message. "
        "If the folder moves, re-run `build_oram.py`.",
    ],
    "rebuild": [
        "`python3 build_oram.py` regenerates `ORAM.maxpat` + `ORAM.amxd`. Then "
        "freeze. `generate_slides.py` rewrites the 128-slide starter library "
        "(deterministic, seed 1957).",
        "Parked by choice: scores-on-disk, a FIDELITY/anti-alias switch, and a "
        "manual.",
    ],
})

# --------------------------------------------------------------------------
# THE 1958 MACHINE
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "the-1958-machine",
    "name": "The 1958 Machine",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "v2.1",
    "folder": "The 1958 Machine",
    "tagline": "Turns anything into the sound of the early European "
               "electronic-music studios, c. 1950–65.",
    "blurb":
        "A single chain modelled on the Philips NatLab / Room 306 workflow: "
        "band-limiting, a singing band-pass, ring modulation, bell resonators, "
        "a tape stage with true varispeed loop capture, a granular splicer, a "
        "delay wheel, an FDN chamber and tape echo. **Every module bypasses at "
        "0**, so all dials down passes clean.",
    "quickstart": [
        "Drop `The1958Machine.amxd` on an audio track. All dials at 0 = clean "
        "pass-through.",
        "Start with **Colour** and **Resonance** — the band-pass is the "
        "\"noise melody\" tool.",
        "For the tape workflow: **Capture** on → play material in → Capture "
        "off (loop length is stamped automatically) → **Play** on. Now "
        "**Speed** is true varispeed and **Reverse** plays it backwards.",
        "Try the presets table below as starting points, then save each as an "
        "`.adv` once you've auditioned it.",
    ],
    "controls": [
        {
            "title": "The chain (all dials 0–10 unless noted)",
            "intro": "Signal flow: In → mono sum + DC block → **Era** "
                     "band-limit → **Colour/Resonance** band-pass → **Metal** "
                     "ring mod → **Bell** resonators → **Tape** → **Splice** "
                     "delay wheel → FDN chamber → tape echo → width → limiter.",
            "rows": [
                ["Era", "0 – 10",
                 "Band-limit: HP 40→300 Hz, LP 14k→2.2 kHz. The single "
                 "\"how old\" control."],
                ["Colour / Resonance", "0 – 10",
                 "SVF band-pass, 100 Hz–6 kHz, Q up to ~46. Ride Colour with "
                 "Resonance at 10 over noise for the classic noise melody."],
                ["Metal", "0 – 10", "Ring modulator, 60 Hz–1.8 kHz, tracking "
                 "the dial."],
                ["Bell", "0 – 10",
                 "Five tuned comb resonators at 110 Hz plus inharmonic "
                 "partials."],
                ["Tape", "0 – 10",
                 "Wow/flutter, hiss, `tanh` saturation and HF loss. Also "
                 "carries the hiss/hum/crackle floor."],
                ["Splice", "0 – 10",
                 "The granular splicer: six grain voices cut from a rolling "
                 "tape of the processed signal, each with random position, "
                 "pitch (±1 octave at full), length, and a 20 % chance of "
                 "playing reversed. Works on live input or a capture."],
                ["Grain", "18 – 103 ms", "Base grain length for the splicer."],
                ["Space / Feedback", "0 – 10",
                 "The four-line FDN chamber (Householder). Both loops have "
                 "`tanh` plus a final `limi~`, so Feedback + Space at 10 is a "
                 "bounded scream, not a runaway."],
                ["Instability", "0 – 10", "General pitch/time unsteadiness."],
                ["EchoAmt / EchoTime", "0 – 10 · 30 – 1000 ms",
                 "Flutter-modulated tape echo with damped repeats."],
                ["Shift", "±500 Hz",
                 "Bode-style SSB frequency shifter (IIR Hilbert pair). "
                 "Sideband follows the dial's sign; 0 = bypassed. Sits after "
                 "the ring mod — the Varèse metallic-dissonance tool."],
                ["Width / Mono", "0 – 10 · toggle", "Stereo width stage."],
            ],
        },
        {
            "title": "Tape loop & failure",
            "rows": [
                ["Capture", "toggle",
                 "Records input into a 10 s mono buffer. Switching it off "
                 "stamps the loop length (shown in the LOOP s readout)."],
                ["TapePlay", "toggle",
                 "The tape stage now plays the captured loop instead of the "
                 "live stream."],
                ["Speed", "±12 semitones",
                 "True varispeed — pitch and time linked."],
                ["Reverse", "toggle",
                 "Plays backwards; the crossfade passes through zero speed, "
                 "like grabbing the reel."],
                ["HandSync", "0 – 10",
                 "A second playhead with independent slow drift, mixed with "
                 "the first. Only audible with a captured loop playing — the "
                 "two-machine hand-synchronisation wobble."],
                ["Dropout", "0 – 10",
                 "**How often** tape-failure events happen — rare single "
                 "events low, up to ~3/s high. 0 = off, fully clean."],
                ["Damage", "0 – 10",
                 "**How bad** each one is: gentle level dips → deeper dips + "
                 "oxide-shed HF choke → near-mutes, splice thumps and a pitch "
                 "lurch as the splice passes the head. Every event rolls its "
                 "own severity, length and direction."],
                ["IRMix", "0 – 10",
                 "Blend for the convolved impulse response (**Load IR** or "
                 "drag onto **Drop IR**). The first ~93 ms is convolved with "
                 "zero latency, in parallel with the chamber — real "
                 "chamber/plate/spring *onsets* over the FDN tail."],
            ],
        },
    ],
    "banks": [
        {"name": "Performance",
         "encoders": ["Colour", "Resonance", "Metal", "Tape", "Splice",
                      "Space", "Feedback", "Instability"]},
        {"name": "Machine",
         "encoders": ["Era", "Bell", "Speed", "EchoTime", "EchoAmt", "Width",
                      "Dropout", "Damage"],
         "buttons": ["Capture", "TapePlay", "Reverse", "Mono"]},
        {"name": "Studio",
         "encoders": ["Shift", "HandSync", "Grain", "IRMix"],
         "buttons": ["Capture", "TapePlay", "Reverse", "Mono"],
         "note": "The four buttons appear on both Bank 2 and Bank 3. Banks are "
                 "wiped on load before being recreated — harmless \"delete\" "
                 "warnings may appear in the Max console."},
    ],
    "workflow": [
        {"title": "Presets to dial in (values 0–10)",
         "text": "**1958 Pure** Era 3, Colour 5, Reson 6, Metal 1, Tape 2, "
                 "Space 4, Fdbk 2, Instab 1, Echo 1 / 240 ms, Width 2 · "
                 "**Noise Melody** Era 2, *ride Colour*, Reson 10, Tape 1, "
                 "Space 3, Fdbk 1, Instab 2 (put noise or vinyl crackle in "
                 "front) · **Concret PH** Era 4, Colour 4, Reson 3, Tape 4, "
                 "Splice 8, Space 8, Fdbk 7, Instab 3, Echo 2 / 370 ms, Width 5 "
                 "— wants a captured loop · **Kid Baltan** Era 1, Colour 7, "
                 "Reson 4, Tape 3, Space 2, Fdbk 3, Instab 2, Echo 6 / 180 ms, "
                 "Width 3 · **Kaïn en Abel** Era 3, Colour 4, Reson 3, Metal 6, "
                 "Bell 8, Tape 2, Space 7, Fdbk 9, Instab 2, Echo 1 / 300 ms, "
                 "Width 4 · **Poème Spatial** Era 4, Colour 4, Reson 4, Metal "
                 "3, Bell 2, Tape 4, Splice 4, Space 5, Fdbk 4, Instab 3, Echo "
                 "3 / 240 ms, Width 8."},
        {"title": "Tired archive reel vs. genuinely broken tape",
         "text": "Dropout 3 / Damage 4 on live input reads as a tired reel. "
                 "Dropout 6 / Damage 8 on a captured loop is properly broken. "
                 "The damage sits before the delay wheel, so it echoes through "
                 "the space."},
    ],
    "gotchas": [
        "With **Tape > 0** on the *live* stream there's a ~30 ms wobble-delay "
        "latency by design — you can't flutter a signal that hasn't happened "
        "yet.",
        "The loaded IR is **not** stored in the Live Set. Reload it per session, "
        "or resave the device with a default.",
        "If you hear pumping at silly settings, that's the final `limi~ 2` "
        "doing its job.",
        "If the `.amxd` ever refuses to load: open `The1958Machine.maxpat` in "
        "Max, select all, copy, paste into a blank Max Audio Effect, save.",
    ],
    "rebuild": [
        "`python3 build_1958machine.py` regenerates both device files from "
        "`the1958machine_dsp.genexpr`. The DSP is embedded — no freeze needed.",
    ],
})

# --------------------------------------------------------------------------
# SPLICE
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "splice-tape-collage",
    "image_aliases": ["splice1", "splice"],
    "name": "Splice (Tape Collage)",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Shipping",
    "folder": "Splice Tape Collage Device",
    "tagline": "A 1950s random tape editor — razor-blades your recordings and "
               "splices them back together, imperfections included.",
    "blurb":
        "Load up to eight sources, press Play, and the machine cuts random "
        "sections, levels and speeds them, and splices them end to end until "
        "you stop it. Four dials take it from frenetic musique concrète to slow "
        "ambient drift. Every decision — source, region, length, level, speed, "
        "effect, joint character — is rolled **once** at each splice boundary "
        "and held; nothing modulates mid-clip.",
    "quickstart": [
        "Drag WAV/AIFF onto the **drop boxes** (not the waveforms). **Main 1–4** "
        "is your material, **BG 1–2** are atmosphere beds, **IR 1–2** are "
        "impulse responses for the reverbs.",
        "Press **Play** — it starts instantly. Stopping lets the current splice "
        "and its tails finish.",
        "**Min/Max Length** is *the* composition control. Short and narrow = "
        "stutter chaos; long and wide = drifting collage.",
        "When something good happens, sweep **Loop** up: the last N seconds "
        "repeat and generation pauses. Ride it to re-cut the same moment; back "
        "to 0 releases it.",
    ],
    "controls": [
        {
            "title": "Performance",
            "rows": [
                ["Play", "on / off",
                 "Instant start. Stopping lets the current splice and tails "
                 "finish."],
                ["Min / Max Length", "30 ms – 8 s",
                 "The length range each splice is rolled from. Changes land on "
                 "the *next* splice, never the current one."],
                ["Balance", "0 – 100 %",
                 "0 % is all Main material; raise it for backgrounds and period "
                 "electronics (sine tones, buzzes, mains hum, slow sweeps)."],
                ["Silence", "0 – 100 %",
                 "How often the machine leaves real gaps. Languid moods need "
                 "some."],
                ["Bad Splice / Severity", "0 – 100 %",
                 "The engineer's condition — from careful (occasional soft "
                 "thumps) to drunk (clicks, dead air, double-speak overlaps, "
                 "transport sag, outright dropouts)."],
                ["Loop", "0 – 30 s",
                 "The freeze gesture. The last N seconds repeat and generation "
                 "pauses."],
            ],
        },
        {
            "title": "Character",
            "rows": [
                ["Level Min / Max", "−36 … 0 dB", "Per-splice level range."],
                ["Varispeed", "0 – 100 %",
                 "Chance of half-speed, double-speed and reversed splices."],
                ["FX Amount", "0 – 100 %",
                 "How often a splice gets **one** effect: convolution A/B "
                 "(your IRs), tape echo, age filter, or drive."],
                ["Echo Char", "0 – 100 %",
                 "Echo time, feedback and wow, moving together."],
                ["Age", "0 – 100 %", "How narrow and old effected splices get."],
                ["Drive / Output", "0 – 100 % · −36…+6 dB",
                 "Warmth, then master level."],
            ],
        },
        {
            "title": "Extras",
            "rows": [
                ["Tones", "0 – 100 %",
                 "The electronics' share of the atmosphere."],
                ["Sync + Loop Div", "on/off · 1/32 – 16 bars",
                 "Locks Loop lengths to project tempo (a bar = 4 beats). The "
                 "Loop dial still triggers and releases."],
                ["Tail Cut", "on / off",
                 "Reverb tails die at every new splice, as if printed to the "
                 "tape."],
                ["Slot toggles", "yellow, per slot",
                 "Turn individual sources on/off; *clear* empties a slot. "
                 "Files persist with the Set."],
            ],
        },
    ],
    "banks": [
        {"name": "Performance",
         "encoders": ["Play", "Min Length", "Max Length", "Balance", "Silence",
                      "Bad Splice", "Severity", "Loop"]},
        {"name": "Character",
         "encoders": ["Level Min", "Level Max", "Varispeed", "FX Amount",
                      "Echo Char", "Age", "Drive", "Output"]},
        {"name": "Extras",
         "encoders": ["Tones", "Loop Div", "Sync", "Tail Cut"]},
    ],
    "workflow": [
        {"title": "The rules it lives by",
         "text": "Every decision is rolled once at each splice boundary and "
                 "held. Nothing modulates mid-clip. One effect per splice. No "
                 "colour that couldn't exist in 1958."},
        {"title": "Drop boxes, not waveforms",
         "text": "The drop targets are the small boxes, not the waveform "
                 "displays — a common miss."},
    ],
    "gotchas": [
        "WAV/AIFF only, and it's a **mono** collage by design (reads channel 1).",
        "Needs the HISSTools IR Toolbox from the Max Package Manager unless the "
        "`.amxd` is frozen with it bundled — the shipping copy is.",
        "~2 % CPU.",
    ],
    "rebuild": [
        "`Splice-Manual.pdf` is the printable version of the manual. "
        "`Splice 1.adv` is a saved preset.",
    ],
})

# --------------------------------------------------------------------------
# ONDES MARTENOT
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "ondes-martenot",
    "image_aliases": ["ondes-martenot-fond-version"],
    "name": "Ondes Martenot",
    "kind": "Instrument",
    "author": "Claude",
    "status": "Complete (frozen build)",
    "folder": "Ondes Device",
    "tagline": "Monophonic MPE Ondes voice for Push 3 pads — pressure is the "
               "envelope.",
    "blurb":
        "Not a museum replica, but built around the three things that make the "
        "Ondes sound like the Ondes: combinable timbre stops from drifting "
        "\"tube\" oscillators, the *touche d'intensité* (**pressure is the "
        "envelope** — there is no fixed one), and the *diffuseurs*, the "
        "resonating speakers: spring, gong, and sympathetic strings.",
    "quickstart": [
        "Drop `Ondes Martenot.amxd` on a MIDI track.",
        "Play Push 3 pads. **Per-pad pressure = volume** — press harder to "
        "swell, release to fade. Notes are silent without pressure.",
        "**Slide up/down on a pad** (CC74) changes brightness.",
        "Mix the timbre stops like drawbars: Onde (pure), Creux (hollow), "
        "Gambé (string), Nasal (reedy), Octave.",
    ],
    "controls": [
        {
            "title": "Timbre stops",
            "intro": "Mix these like drawbars — they combine rather than "
                     "switch.",
            "rows": [
                ["Onde", "0 – 1", "The pure fundamental."],
                ["Creux", "0 – 1", "Hollow."],
                ["Gambé", "0 – 1", "String-like."],
                ["Nasillard", "0 – 1", "Reedy, nasal."],
                ["Octaviant", "0 – 1", "The octaviant partial."],
                ["Souffle", "0 – 1", "Breath noise."],
                ["Fond", "0 – 1",
                 "Sub-octave — a clean sine one octave below the note, for body "
                 "and weight. Defaults to 0."],
                ["Drift", "0 – 1",
                 "Tube age: pitch wobble, hum and hiss."],
                ["Warmth", "0 – 1", "Saturation."],
            ],
        },
        {
            "title": "Diffuseurs & jeu",
            "rows": [
                ["Principal", "0 – 1", "The dry speaker."],
                ["Résonance", "0 – 1", "The spring diffuseur."],
                ["Métallique", "0 – 1",
                 "The gong diffuseur — rings on attacks."],
                ["Palme", "0 – 1",
                 "Sympathetic strings; blooms on C3–B3 and their octaves."],
                ["Glide", "1 – 800 ms", "Portamento time between notes."],
                ["Touche", "0.25 – 4",
                 "Pressure response curve: low = touchy, high = needs a firm "
                 "press."],
                ["Vibrato", "0 – 1",
                 "Automatic vibrato. Finger vibrato on the pads is usually "
                 "better."],
                ["Volume", "0 – 1", "Master level."],
                ["Bend range", "1 – 96 st",
                 "Defaults to 48, the MPE/Push standard. Adjust if pitch glides "
                 "land wrong."],
            ],
        },
    ],
    "banks": [
        {"name": "Timbre stops",
         "encoders": ["Onde", "Creux", "Gambé", "Nasal", "Octave", "Souffle",
                      "Drift", "Warmth"],
         "note": "These banks come from the parameters ordering alphabetically "
                 "by long name (a1…c2) rather than from named banks."},
        {"name": "Diffuseurs & jeu",
         "encoders": ["Princip", "Spring", "Metal", "Palme", "Glide", "Touche",
                      "Vibrato", "Volume"]},
        {"name": "Extras",
         "encoders": ["Bend rg", "Fond"],
         "note": "Banks 1 and 2 are full at eight encoders each, so Fond lives "
                 "here rather than with the other timbre stops."},
    ],
    "workflow": [
        {"title": "The ribbon — two ways, and one of them is better",
         "text": "**Portamento (recommended):** take the Push pads *out* of MPE "
                 "(Setup → Expression → Mono or Poly Aftertouch). Moving across "
                 "pads then plays stepped notes on one channel, and turning up "
                 "**Glide** slurs the mono voice between them — the *au ruban* "
                 "feel. Keep aftertouch on so the touche still works. **MPE "
                 "on** gives true per-note bend, but Push's pads only emit "
                 "continuous bend *within* a pad — sliding across pads "
                 "retriggers notes. So MPE = per-pad vibrato, not long sweeps."},
        {"title": "Starting points",
         "text": "*Messiaen*: Onde 0.9, Octave 0.2, Drift 0.35, Spring 0.3, "
                 "Palme 0.5, Glide 80 ms, slow pressure swells. "
                 "*Radiophonic*: Creux 0.7, Nasal 0.3, Drift 0.6, Metal 0.5, "
                 "Touche 0.7. *Ghost choir*: Souffle 0.4, Onde 0.5, Palme 0.7, "
                 "Spring 0.5, slide low."},
    ],
    "gotchas": [
        "If pressure or bend seem global rather than per-note, check the track "
        "is receiving MPE. If you edit the patch in Max, the inspector's Max "
        "for Live → `is_mpe` flag must stay on.",
        "The shipped device is **frozen** (`ondes_voice.js` embedded). "
        "`build_ondes.py` now writes a frozen, self-contained device — there's "
        "no manual freeze step any more.",
        "A blank black UI means the background panel was drawn first — in "
        "patcher JSON the *first* box draws frontmost. The build script appends "
        "the panel last.",
    ],
    "rebuild": [
        "`python3 build_ondes.py` writes a frozen `.amxd` with the current "
        "`ondes_voice.js` embedded. Run `python3 sim_test.py` first after any "
        "DSP change to catch instabilities.",
        "`Ondes Martenot.amxd.frozen-bak` is a known-good copy.",
    ],
})

# --------------------------------------------------------------------------
# SW RADIO
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "sw-radio",
    "name": "SW Radio",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Working",
    "folder": "SW Radio Device",
    "tagline": "Tunes a KiwiSDR shortwave receiver anywhere in the world from "
               "inside Live.",
    "blurb":
        "A Max for Live device can't carry live audio in from the internet, so "
        "this is a **controller**: it launches KiwiSDR's `kiwiclientd` in the "
        "background, which plays the radio audio into the free **BlackHole** "
        "virtual audio device. Live records that as an input. Frequency and "
        "mode change live over rigctl — no restart, no gaps. Only changing "
        "server restarts the stream.",
    "quickstart": [
        "One-time: run `SW Radio - SETUP.command` (installs the Python packages "
        "and `kiwiclient` into `~/SWRadio`), and install **BlackHole** from "
        "existential.audio/blackhole.",
        "In Live: Preferences → Audio → Input Device = `BlackHole 2ch`. On the "
        "track: Audio From = Ext. In 1/2, Monitor = In, armed.",
        "Drop `SW Radio.amxd` on that track. Pick a **Receiver** — this fills "
        "in the server and port for you.",
        "Pick a **Mode**, set the **Freq**, then flick **Connect** on. The "
        "status line reads ready → connecting → connected.",
        "Tune live. Switching receiver while connected re-tunes automatically.",
    ],
    "controls": [
        {
            "title": "Tuning",
            "rows": [
                ["Receiver", "37 curated KiwiSDRs",
                 "Public receivers around the world — UK, Europe, Africa, "
                 "Asia, Oceania, the Americas. The list is long for redundancy; "
                 "if one is silent, pick another."],
                ["Freq", "0 – 30000 kHz", "The frequency, in kHz."],
                ["Freq Fine", "relative dial",
                 "A spring-back fine-tune encoder — rests at centre, never hits "
                 "an end stop."],
                ["Mode", "AM / LSB / USB / CW / NBFM", "Demodulation mode."],
                ["Connect", "off / on",
                 "Starts and stops the background client."],
                ["Region", "36 regions",
                 "Which target region the **what's on now** list is built for "
                 "— Europe, Africa, Asia, the Americas, Global and their "
                 "sub-regions."],
                ["Station", "browse encoder",
                 "Steps through the broadcasts on the air *right now* beamed at "
                 "that region, from the EiBi shortwave schedule. Picking one "
                 "tunes frequency **and** mode. The readout shows e.g. "
                 "\"West Europe: 41 on now\"."],
                ["Refresh list", "button",
                 "Re-downloads the EiBi season file. It's cached in "
                 "`~/SWRadio/eibi/` and re-downloaded automatically when more "
                 "than a week old; the on-now filter re-runs every 5 minutes."],
                ["Favourite", "0 – 32",
                 "Recall a saved favourite — each stores frequency **and** "
                 "mode."],
            ],
        },
    ],
    "banks": [],
    "workflow": [
        {"title": "Favourites",
         "text": "Type an optional name and press **Add** to save the current "
                 "Freq and Mode (blank auto-names it, e.g. \"9250 kHz AM\"). "
                 "The **Recall** menu loads one and retunes live if connected; "
                 "**Del** removes the selected one. They live in "
                 "`~/SWRadio/favourites.json` — hand-editable to rename or "
                 "reorder."},
        {"title": "Editing the receiver list",
         "text": "The drop-down is built from the `SERVERS` array near the top "
                 "of `swradio.js`, and the first entry is the default. Because "
                 "the menu is a Push-controllable Live parameter (a fixed "
                 "list), changing that array means **re-running "
                 "`build_patch.py`** — reloading the JS isn't enough."},
        {"title": "Troubleshooting",
         "text": "Open the Max window — the device prints `[SWRadio]` and "
                 "`[kiwi]` lines including the exact command it ran. Status "
                 "stuck on \"connecting\" = wrong host/port or the receiver is "
                 "full. No audio = check `kiwiclientd` found the sound device "
                 "name and that Live's track input matches. \"spawn failed\" = "
                 "`PYTHON_BIN` / `KIWI_DIR` paths are wrong."},
    ],
    "gotchas": [
        "The folder's README predates the **Region / Station** \"what's on "
        "now\" browser and still calls the KiwiSDR picker *Station*. On the "
        "current device face that picker is **Receiver**, and Station is the "
        "schedule browser.",
        "Keep `SW Radio.amxd` and `swradio.js` in the **same folder**.",
        "Config lives at the top of `swradio.js`: `PYTHON_BIN` (`python3`), "
        "`KIWI_DIR` (`~/SWRadio/kiwiclient`), `SND_DEVICE` (`BlackHole 2ch`), "
        "`RIGCTL_PORT` (`6400`).",
        "To use a BlackHole variant (e.g. 16ch), edit `SND_DEVICE` or send the "
        "device a `device <name>` message.",
    ],
    "rebuild": [
        "`python3 build_patch.py` rebuilds the device. Required after any "
        "change to the `SERVERS` array, since the receiver menu is a fixed-list "
        "Live parameter.",
    ],
})

# --------------------------------------------------------------------------
# YT SAMPLER
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "yt-sampler",
    "image_aliases": ["youtube-sampler", "yt sampler"],
    "name": "YT Sampler",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Working",
    "folder": "YT Sampler Device",
    "tagline": "Paste a YouTube link, bracket a phrase, drop it into Session "
               "view as a clip.",
    "blurb":
        "Fetches a video's audio, draws the whole waveform, and lets you "
        "bracket a section — by dragging, by typing millisecond values, by "
        "nudging from Push, or by **searching the transcript**. Hit Sample It "
        "and the selection lands as a wav clip in the first empty slot on the "
        "track. Personal sampling use only.",
    "quickstart": [
        "One-time: `brew install yt-dlp ffmpeg`, and keep the folder together "
        "(`ytsampler.js`, `ytclip.js`, `package.json` beside the `.amxd`).",
        "Drag **YT Sampler.amxd** onto an **audio track** — it's an audio "
        "effect and passes the track through.",
        "Paste a link into the URL box, hit **Fetch**. The full audio is drawn "
        "in the waveform strip.",
        "Drag in the waveform to set the brackets. **Preview** auditions; "
        "**Sample It** renders and adds the clip.",
        "To sample the whole video, just don't drag — the brackets default to "
        "full length after a fetch.",
    ],
    "controls": [
        {
            "title": "On the face",
            "rows": [
                ["URL + Fetch", "text",
                 "Paste a share link and hit Fetch (or press Enter). Status "
                 "shows progress."],
                ["Waveform brackets", "drag",
                 "Start/end in ms show in the two readouts. Those readouts are "
                 "live: click and type, drag vertically, or use arrow keys. "
                 "Coarse vs fine drag is by digit — drag the integer part for "
                 "coarse, the decimal for fine."],
                ["find + Find", "text",
                 "Searches the auto-generated English captions (word-level "
                 "timings). The brackets jump to that phrase and the view zooms "
                 "in; hit Find again to cycle matches (\"2/7: …\"). Matching "
                 "ignores punctuation and case."],
                ["Full", "button",
                 "Resets view and brackets to the whole file."],
                ["Preview / Stop", "buttons",
                 "Plays the selection through the track."],
                ["Sample It", "button",
                 "Renders the selection to wav and adds it as a Session clip. "
                 "If every slot is full, a new scene is created."],
            ],
        },
    ],
    "banks": [
        {"name": "Encoders",
         "encoders": ["Start", "Length", "Play", "Grab", "Step"],
         "note": "**Start** and **Length** are relative nudge dials — each "
                 "detent moves by the **Step** size (1/10/100/1000 ms, default "
                 "100). They're clamped so they can't invert the brackets. "
                 "**Play** twists right to preview, left to stop. **Grab** "
                 "fires Sample It when twisted to \"Go\", then resets itself."},
    ],
    "workflow": [
        {"title": "The full Push workflow",
         "text": "Rough the brackets on the laptop (or with transcript search), "
                 "then nudge Start/Length from Push, audition with Play, and "
                 "drop the clip with Grab — no trackpad needed."},
        {"title": "Where the files live",
         "text": "Everything goes in `~/YTSampler/` — paths kept space-free on "
                 "purpose. `downloads/<videoid>.wav` is the cached full audio "
                 "(re-fetching the same video is instant; safe to clear). "
                 "`samples/<title>_<start>-<end>.wav` are the rendered samples "
                 "— **Live clips reference these**, so don't delete ones you're "
                 "still using, or use *File → Collect All and Save*."},
    ],
    "gotchas": [
        "**Freeze the device once after building.** `[js]` won't reliably find "
        "`ytclip.js` on the search path; freezing embeds the js/node files "
        "inside the `.amxd`. Re-do it after any `build_yt_sampler.py` re-run.",
        "If a fetch fails, first fix is always `brew upgrade yt-dlp` — YouTube "
        "changes things regularly. Other causes: age-restricted or "
        "region-locked videos, or a non-video link.",
        "Auto-caption timings are good but not sample-accurate — nudge the "
        "brackets to taste. If a video has no captions the status line says so.",
    ],
    "rebuild": [
        "`python3 build_yt_sampler.py` authors the patcher JSON and assembles "
        "the `.amxd` from scratch, then **freeze**. The circular-arrows button "
        "in the device title bar reloads the `.amxd` from disk.",
    ],
})

# --------------------------------------------------------------------------
# PRESET SCROLL
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "preset-scroll",
    "name": "Preset Scroll",
    "kind": "MIDI Effect",
    "author": "Claude",
    "status": "Working",
    "folder": "Preset Scroll Device",
    "tagline": "Scroll an Arturia plugin's preset browser from a Push encoder.",
    "blurb":
        "Arturia plugins don't expose their preset library to the host, and "
        "MIDI Program Change only addresses a 128-slot playlist — useless for a "
        "~2000-patch filtered list. But the **Next/Previous Preset arrows in "
        "the plugin GUI are MIDI-learnable**, and each trigger steps one preset "
        "through whatever list is currently showing. This device drives those.",
    "quickstart": [
        "Drag `Preset Scroll.amxd` onto a **MIDI track**. It must sit "
        "**before the instrument** in the chain.",
        "Use the **AU or VST2** version of the Arturia plugin — Live does not "
        "pass MIDI to VST3 instruments.",
        "In the plugin, MIDI-learn **Next Preset** to **CC 29** and **Previous "
        "Preset** to **CC 28**, both on channel 1. (Analog Lab uses 28/29 by "
        "default, so you may not need to.)",
        "Map the **Preset** dial to a Push encoder — it's the first parameter. "
        "Right = next, left = previous.",
    ],
    "controls": [
        {
            "title": "Controls",
            "rows": [
                ["Preset", "spring-back dial",
                 "Rests at centre (127) and never hits an end stop, so you can "
                 "keep scrolling indefinitely. Spin fast to skip several; nudge "
                 "slowly to audition one at a time."],
                ["Next CC / Prev CC", "0 – 127",
                 "Retarget the controllers for other plugins. Channel is fixed "
                 "to 1 in this version."],
            ],
        },
    ],
    "banks": [],
    "workflow": [
        {"title": "How it works",
         "text": "`midiin → midiout` passes all incoming MIDI through. The "
                 "Preset dial outputs on turn; the patch takes the delta from "
                 "127, fires that many momentary CC pulses (value 127 then 0) "
                 "on the Next or Prev controller, then sends `set 127` to "
                 "recentre the dial without retriggering. The same spring-back "
                 "pattern as the SW Radio fine-tune dial."},
    ],
    "gotchas": [
        "**VST3 will not work** — Live doesn't pass MIDI to VST3 instruments. "
        "Use AU or VST2.",
        "The device must be **before** the instrument in the chain.",
    ],
    "rebuild": [
        "`python3 build_preset_scroll.py` — pure Python, no dependencies. It "
        "hand-authors the patcher JSON and assembles the `.amxd` chunk format "
        "with the `mmmm` (MIDI effect) type code. Live's title-bar reload "
        "button picks up a rebuild without re-adding the device.",
    ],
})

# --------------------------------------------------------------------------
# MANUAL TAPE
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "manual-tape",
    "name": "Manual Tape",
    "kind": "Instrument",
    "author": "ChatGPT",
    "status": "v0.2.1",
    "folder": "manual-tape",
    "tagline": "Hand-controlled sample playback — a tape reel you push forwards "
               "and backwards by hand.",
    "blurb":
        "Load an audio file and drive it with a speed dial that stops at the "
        "centre, reverses below it and runs forward above it. The selected "
        "Start–End region loops continuously; you can either let pitch rise and "
        "fall naturally with speed, or lock it and timestretch instead.",
    "quickstart": [
        "Drag `device/Manual Tape v0.2.1.amxd` onto a **MIDI track**.",
        "Click **Load Tape** and choose a file, or drop audio onto **Drop Audio "
        "Here**.",
        "Drag the **orange** line for Start, the **amber** line for End, and "
        "click or drag the **white** line for Playhead.",
        "Turn **Tape Speed** off centre to move. Use **Engage Head** to set a "
        "speed silently first, then start.",
    ],
    "controls": [
        {
            "title": "Controls",
            "rows": [
                ["Tape File", "drop / Load Tape",
                 "The loaded sample. Drop audio on **Drop Audio Here** or use "
                 "the **Load Tape** button. The main tape window shows the "
                 "whole waveform with the Start–End region and playhead drawn "
                 "over it."],
                ["Start / End", "0 – 1",
                 "The looping region. Drag the orange (start) and amber (end) "
                 "lines in the waveform."],
                ["Playhead", "0 – 1",
                 "The white line — click or drag it to move the head."],
                ["Tape Speed", "−127 … +127",
                 "Zero stops; negative reverses; positive runs forward. At zero "
                 "the output fades to silence so the held sample doesn't become "
                 "DC."],
                ["Max Range", "±2x / 4x / 8x / 16x / 32x",
                 "What the ends of the Tape Speed dial mean. Default ±8x. "
                 "(Labelled **Max Range** on the device face, **Max Speed** in "
                 "Live's parameter list and on Push.)"],
                ["Engaged", "Off / On",
                 "Lets you prepare a speed silently, then engage playback."],
                ["Gate Mode", "Manual / MIDI",
                 "**Manual**: Engage Head controls playback. **MIDI**: any "
                 "note-on engages the tape and the final held note-off stops "
                 "it. Note pitch and channel don't affect the tape."],
                ["Pitch Lock", "Off / On",
                 "On = timestretched playback at the sample's original pitch. "
                 "Off = pitch rises and falls naturally with speed."],
            ],
        },
    ],
    "banks": [
        {"name": "Tape",
         "encoders": ["Start", "End", "Playhead", "Tape Speed", "Max Speed",
                      "Engaged", "Pitch Lock", "Gate Mode"],
         "note": "Engaged and Pitch Lock are toggle parameters, so Push can "
                 "switch them straight from their parameter slots."},
    ],
    "workflow": [
        {"title": "The file is referenced, not embedded",
         "text": "The path is stored with the Live Set and the sample reloads "
                 "automatically when the Set reopens — but keep the source "
                 "audio in place, or use **Collect All and Save** when moving "
                 "the project. The display reads **Missing** if the stored file "
                 "can't be reopened; dropping or loading it again repairs the "
                 "reference."},
    ],
    "gotchas": [
        "The older `Manual Tape v0.1.amxd` audio-effect build is still in the "
        "folder for compatibility, but it has **no MIDI gating and no automatic "
        "sample recall**.",
    ],
    "rebuild": [
        "`node scripts/build_manual_tape.js`, then `node tests/test_structure.js` "
        "and `node tests/test_engine.js`. No external js, patcher or media "
        "dependencies.",
    ],
})

# --------------------------------------------------------------------------
# SCENE PLACER
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "scene-placer",
    "name": "Scene Placer",
    "kind": "Audio Effect",
    "author": "ChatGPT",
    "status": "v0.1",
    "folder": "scene-placer",
    "tagline": "Places a voice or source inside a loaded environment recording.",
    "blurb":
        "Combines a looped stereo ambience bed, distance filtering, "
        "sample-responsive brightness, sparse outdoor-style early reflections, "
        "stereo-width control and voice-keyed ducking. This is **perceptual "
        "scene construction, not measured convolution** — an ordinary field "
        "recording isn't an impulse response, so it doesn't claim to reproduce "
        "the exact acoustics of the place.",
    "quickstart": [
        "Drag `device/Scene Placer v0.1.amxd` onto the voice or source track.",
        "Leave **Source** on **Sample**, then drag a garden, room or field "
        "recording from Live's browser or the Finder onto the Environment area.",
        "Set **Place** high enough to enter the scene, then establish "
        "perspective with **Distance** and **Space**.",
        "Balance the audible recording with **Ambience**, then raise **Match** "
        "to let its changing upper-frequency energy animate the voice's air.",
    ],
    "controls": [
        {
            "title": "Controls",
            "rows": [
                ["Place", "0 – 1",
                 "Equal-power transition from the original track to the "
                 "constructed scene."],
                ["Distance", "0 – 1",
                 "Reduces direct level and high-frequency air."],
                ["Space", "0 – 1",
                 "Adds short ground and boundary reflections — not an indoor "
                 "reverb tail."],
                ["Ambience", "0 – 1", "Level of the loaded recording."],
                ["Match", "0 – 1",
                 "How much slow brightness movement derived from the recording "
                 "is applied to the placed source."],
                ["Width", "0 – 1",
                 "Stereo width of the environment bed. The direct source keeps "
                 "its original position."],
                ["Duck", "0 – 1",
                 "Gently lowers the ambience during foreground audio, for "
                 "intelligibility."],
                ["Output", "±12 dB", "Final trim."],
                ["Source", "Sample / Live",
                 "**Sample** uses the dropped recording. **Live** takes the "
                 "environment from another track via the Environment Sender."],
            ],
        },
    ],
    "banks": [
        {"name": "Placement",
         "encoders": ["Place", "Distance", "Space", "Ambience", "Match",
                      "Width", "Duck", "Output"]},
        {"name": "Source",
         "encoders": ["Source"],
         "note": "The less frequently changed Source selector sits on its own "
                 "bank."},
    ],
    "workflow": [
        {"title": "Using a live environment from another track",
         "text": "Put `Scene Placer Environment Sender v0.1.amxd` on the "
                 "environment track and choose **Live** in the main device. The "
                 "sender is transparent — it passes that track through "
                 "unchanged. **Use only one sender at a time in a Set.**"},
    ],
    "gotchas": [
        "The sample path is remembered by `live.drop`. Keep the source file "
        "available, or use **Collect All and Save** when moving the Set.",
    ],
    "rebuild": [
        "`node scripts/build_scene_placer.js`, then "
        "`node tests/test_structure.js`.",
    ],
})

# --------------------------------------------------------------------------
# FALSE MEMORY
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "false-memory",
    "name": "False Memory",
    "kind": "Audio Effect",
    "author": "ChatGPT",
    "status": "Working",
    "folder": "false-memory",
    "tagline": "Degradation effect — parallel analog and digital damage paths "
               "under one intensity macro.",
    "blurb":
        "A clean-room build from the published False Memory documentation. "
        "**Memory** is the master destruction intensity; **Character** "
        "crossfades between parallel analog and digital paths, and Drift, "
        "oxide dropout, Fog and Ghosts follow that stage. At Memory 0 the "
        "output is guaranteed clean even if Mix is fully wet.",
    "quickstart": [
        "Drag `device/False Memory.amxd` onto an audio or MIDI track.",
        "Raise **Memory** — that's the master intensity for everything else.",
        "Move **Character** to crossfade between the analog and digital paths, "
        "then pick the Type for each.",
        "**Randomize** for a new starting point — it leaves Mix, Hiss and "
        "Crackle alone.",
    ],
    "controls": [
        {
            "title": "Performance",
            "rows": [
                ["Memory", "0 – 1",
                 "Master destruction intensity. **At zero the output is clean**, "
                 "whatever Mix is doing."],
                ["Character", "0 – 1",
                 "Crossfades the parallel analog and digital paths."],
                ["Damage", "0 – 1", "Severity of the degradation."],
                ["Drift", "0 – 1", "Pitch/time instability."],
                ["Fog", "0 – 1", "Smearing haze over the signal."],
                ["Ghosts", "0 – 1", "Displaced repeats and imprints."],
                ["Mix", "0 – 1", "Dry/wet."],
                ["Randomize", "button",
                 "Rerolls the controls — but leaves Mix, Hiss and Crackle "
                 "unchanged, matching the documented exception."],
            ],
        },
        {
            "title": "Modes & texture",
            "rows": [
                ["Analog Type", "Cassette / Reel / VHS",
                 "Analog modes emphasise bandwidth loss, saturation, wow/flutter "
                 "and texture."],
                ["Digital Type", "Lo-fi / Circuit / Data-mosh",
                 "Digital modes emphasise sample-rate and bit-depth reduction, "
                 "and buffer repeats."],
                ["Fog Type", "Tonal / Inharmonic / Evolving", "Flavour of the fog."],
                ["Ghost Type", "Echoes / Imprints / Granular",
                 "Flavour of the ghosts."],
                ["Hiss / Crackle", "0 – 1", "Noise floor and surface noise."],
                ["Evolve", "Off / On",
                 "Pushes Memory, Damage, Fog and Ghosts toward maximum over "
                 "**Evolve Time**. Those four controls **resist manual changes** "
                 "until Evolve is switched off."],
                ["Evolve Time", "1 – 64 min", "How long the journey takes."],
            ],
        },
    ],
    "banks": [
        {"name": "Performance",
         "encoders": ["Memory", "Character", "Damage", "Drift", "Fog",
                      "Ghosts", "Mix", "Randomize"],
         "note": "Arranged for live playing — macro intensity and the six most "
                 "audible gestures under one hand, Randomize at the far right."},
        {"name": "Modes",
         "encoders": ["Analog Type", "Digital Type", "Fog Type", "Ghost Type",
                      "Hiss", "Crackle", "Evolve Time", "Evolve"],
         "note": "The choices you change less often."},
    ],
    "workflow": [
        {"title": "Memory is the safety valve",
         "text": "Because zero Memory guarantees a clean output regardless of "
                 "Mix, you can automate Memory alone to bring the whole effect "
                 "in and out without touching anything else."},
    ],
    "gotchas": [
        "While **Evolve** is on, Memory, Damage, Fog and Ghosts won't respond "
        "to manual changes — switch it off first.",
    ],
    "rebuild": [
        "`node scripts/build_false_memory.js`, then "
        "`node tests/test_structure.js`. The editable `.maxpat` and the "
        "packaged `.amxd` are generated together; no external abstractions, "
        "samples or js at runtime.",
    ],
})

# --------------------------------------------------------------------------
# TAPE ERROR
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "tape-error",
    "image_aliases": [],
    "extra_images": [{"file": "tape-error-trigger",
                      "caption": "Tape Error Trigger (MIDI track)"}],
    "name": "Tape Error",
    "kind": "Audio Effect",
    "author": "ChatGPT",
    "status": "Working",
    "folder": "Tape Error",
    "tagline": "Fire a tape fault on an audio track from a note on a MIDI "
               "track — velocity is severity.",
    "blurb":
        "**Two devices**, communicating via a shared channel number (1–16), so "
        "you can run several independent pairs in one Set. Audio is written "
        "continuously to a 12-second tape buffer with a read head chasing the "
        "write head; a trigger sags the motor speed, so pitch drops, the head "
        "falls behind, and the dropout smears in earlier programme material "
        "before over-speeding to wind the tape back in.",
    "quickstart": [
        "Put **Tape Error** on the audio track to be glitched, and **Tape Error "
        "Trigger** on the MIDI track that will fire it.",
        "Set both devices' **Chan** to the same number.",
        "Any note-on on the MIDI track fires one tape error. **Velocity = "
        "severity**, scaled by the Severity dial — so the dial sets the ceiling.",
        "The **Glitch** button on the audio device fires a test event "
        "(equivalent to velocity 100).",
    ],
    "controls": [
        {
            "title": "Audio device",
            "rows": [
                ["Chan", "1 – 16",
                 "Must match the trigger device. Lets several pairs coexist."],
                ["Severity", "0 – 1",
                 "Depth of slowdown, dropout and crackle — the ceiling that "
                 "incoming velocity scales against."],
                ["Length", "0.05 – 2 s",
                 "Nominal event duration. Actual duration is randomised around "
                 "this."],
                ["Muffle", "0 – 1",
                 "How dull the sound gets during slowdown and recovery."],
                ["Vary", "0 – 1",
                 "How much every parameter is re-randomised per event. 0 = "
                 "repeatable, 1 = wild. (Appears as `Variation` in Live's "
                 "parameter list.)"],
                ["Dry/Wet", "0 – 1",
                 "Usually leave at 100 % — the device is transparent when idle."],
                ["Glitch", "button", "Fires a test event."],
            ],
        },
        {
            "title": "Trigger device (MIDI track)",
            "rows": [
                ["Chan", "1 – 16", "Must match the audio device."],
            ],
        },
    ],
    "banks": [],
    "workflow": [
        {"title": "Tuning it by ear",
         "text": "All DSP is one gen~ codebox. Values worth adjusting after "
                 "listening: slowdown depth range (`rdepth`), motor inertia "
                 "(`0.0012` — smaller is more sluggish and tapey), catch-up "
                 "speed (`0.045`), crackle density (`0.9975` threshold), and "
                 "the muffle floor (`650` Hz)."},
    ],
    "gotchas": [
        "**These are `.maxpat` files, not draggable devices** in the original "
        "workflow: paste them into blank M4L shells. Drop a blank Max Audio "
        "Effect, click Edit, Select All + delete, then open `TapeError.maxpat` "
        "in Max, Select All, Copy, and Paste into the device patcher. Cmd+S. "
        "Same procedure with a blank Max **MIDI** Effect for "
        "`TapeErrorTrigger.maxpat`. (Built `.amxd` copies are in the folder.)",
    ],
    "rebuild": [
        "The patches are the source: `TapeError.maxpat` and "
        "`TapeErrorTrigger.maxpat`.",
    ],
})

# --------------------------------------------------------------------------
# STRIP SILENCE
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "strip-silence",
    "image_aliases": ["stripsilence"],
    "name": "Strip Silence",
    "kind": "Audio Effect",
    "author": "ChatGPT",
    "status": "v2",
    "folder": "StripSilence",
    "tagline": "Removes the silence from arrangement recordings — non-"
               "destructive clip trimming, one undo step.",
    "blurb":
        "Drop it on an audio track, set a threshold, press **Strip** — every "
        "unwarped arrangement clip on that track is rebuilt with its silent "
        "sections removed, muted, or split out, exactly as if you'd cut and "
        "trimmed by hand. No new audio files are created, and one Cmd+Z undoes "
        "the whole run. Every operation is verified by reading back what Live "
        "actually did; on any mismatch the original clip is restored "
        "automatically.",
    "quickstart": [
        "Drop `StripSilence.amxd` onto the **audio track** containing the "
        "recording. It must sit directly on the track, not inside a rack.",
        "Set **Thresh** (start ~−48 dB), **MinSil**, **Pad** and **MinAud**.",
        "Choose a **Mode** and press **Strip**. The status line reports "
        "progress and the result.",
        "Optionally press **Close Gaps** afterwards to ripple everything "
        "together.",
        "Not happy? **Cmd+Z once** — each button press is a single undo step.",
    ],
    "controls": [
        {
            "title": "Controls",
            "rows": [
                ["Thresh", "−80 … −12 dB",
                 "Anything quieter counts as silence. Start around −48 dB; "
                 "raise toward −36 for noisy recordings."],
                ["MinSil", "20 – 2000 ms",
                 "Silences shorter than this are left alone — stops it chopping "
                 "between words. Default 250 ms."],
                ["Pad", "0 – 500 ms",
                 "Audio kept either side of each region so attacks and tails "
                 "aren't clipped. Default 40 ms."],
                ["MinAud", "20 – 1000 ms",
                 "Audio blips shorter than this are treated as silence — "
                 "removes clicks. Default 80 ms."],
                ["Mode", "Delete / Mute / Split",
                 "**Delete** removes silence and leaves gaps. **Mute** makes "
                 "silent parts separate muted clips. **Split** just cuts at the "
                 "boundaries."],
                ["Strip", "button", "Runs the pass."],
                ["Close Gaps", "button",
                 "Ripples everything together: the first clip stays put, every "
                 "following clip shifts left to sit back-to-back. Works on any "
                 "clips (no analysis involved); contiguous or overlapping clips "
                 "are left alone."],
            ],
        },
    ],
    "banks": [],
    "workflow": [
        {"title": "Close Gaps changes musical timing",
         "text": "Rippling clips together moves them relative to the grid and "
                 "to other tracks. It's meant for spoken word and sound-design "
                 "edits, not beat-aligned material."},
        {"title": "If something fails",
         "text": "The status line says so, and full diagnostics print to the "
                 "Max window — open the device in the Max editor to see them. "
                 "Trim support is probed on a backup copy *before* your "
                 "original is touched."},
    ],
    "gotchas": [
        "**Unwarped clips only.** Warped clips are skipped. Arrangement "
        "recordings are unwarped by default; to process a warped clip, switch "
        "Warp off first.",
        "**Live 12.1 or later** — it needs the Max 9 engine, because the JS is "
        "embedded via `v8`. On Live 12.0, edit the device and replace the `v8` "
        "object with `js strip_silence.js`, keeping the .js beside the .amxd.",
        "Constant tempo assumed — tempo automation across the clip will "
        "misplace regions.",
        "Use **one instance at a time**: instances share the analysis buffer "
        "name.",
        "Clip fades aren't recreated on the new boundaries; add them after "
        "stripping.",
        "Each file is loaded fully into RAM during analysis. As with anything "
        "that edits your arrangement — test on a copy of the Set first.",
    ],
    "rebuild": [
        "`python3 build_device.py` rebuilds the `.amxd` and `.maxpat` from "
        "`strip_silence.js`, giving a code-only edit → rebuild → drop-into-Live "
        "workflow.",
    ],
})

# --------------------------------------------------------------------------
# DISINTEGRATION
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "disintegration",
    "name": "Disintegration",
    "kind": "Audio Effect",
    "author": "ChatGPT",
    "status": "Prototype 0.3.1",
    "folder": "Disintegration",
    "tagline": "Cumulative tape-oxide loss — one reel, deterministic damage, "
               "256 passes.",
    "blurb":
        "Models a reel wearing out. The damage pattern is **deterministic for "
        "one reel**: increasing Passes adds damage without moving or healing "
        "any of the earlier dropouts. High-frequency material fails faster than "
        "the low-frequency body, so early wear is heard as lost sheen before it "
        "becomes silence. Fixed \"relic\" islands guarantee that pass 256 "
        "leaves a few filtered fragments rather than mathematical silence.",
    "quickstart": [
        "Drag `Disintegration.amxd` onto an audio track.",
        "Move **Passes** by hand to audition any state from 0 (clean) to 256.",
        "For automatic ageing, turn **Run** on: Passes increments by one at "
        "each loop boundary while the transport runs.",
        "**Follow = Clip** uses a looped Session clip on the device's track for "
        "its loop length. **Manual** uses the **Cycle** setting instead.",
        "**New Reel** generates a different permanent damage map.",
    ],
    "controls": [
        {
            "title": "Controls",
            "rows": [
                ["Passes", "0 – 256",
                 "0 = clean, 256 = near-total loss with a few surviving "
                 "fragments."],
                ["Run", "Off / On",
                 "Increments Passes by one at each playing-clip loop boundary "
                 "(or manual Cycle boundary) while Live's transport runs."],
                ["Follow", "Manual / Clip",
                 "**Clip** uses a looped Session clip playing on the device's "
                 "track for its exact loop length and boundary events. "
                 "**Manual** uses Cycle."],
                ["Cycle", "1 / 2 / 4 / 8 / 16 bars",
                 "Bar length follows Live's current time-signature numerator. "
                 "Used whenever Clip follow is off or no looped Session clip is "
                 "playing."],
                ["New Reel", "button",
                 "Generates a different permanent damage map, then returns to "
                 "Ready."],
                ["Reel Seed", "1 – 999999",
                 "The reel's identity — the number behind the damage map."],
            ],
        },
    ],
    "banks": [
        {"name": "Bank 1",
         "encoders": ["Passes", "Run", "Follow", "Cycle", "New Reel"],
         "note": "The remaining three encoders are intentionally empty. The "
                 "buttons above the display toggle Run and Follow, advance "
                 "Cycle and trigger New Reel. On the Push display Follow reads "
                 "Manual or Clip; New Reel reads Ready and briefly shows New."},
    ],
    "workflow": [
        {"title": "The damage model",
         "text": "Four fixed scales combine: broad holes that emerge late and "
                 "expand slowly; medium oxide-loss regions; short pits and "
                 "frayed edges; and dust-scale losses that break the final "
                 "passes into fragments. Sustained material falls away first, "
                 "while strong attacks can briefly print through resilient "
                 "regions. A restrained nonlinear stage adds compression as the "
                 "reel ages."},
        {"title": "It's source-dependent on purpose",
         "text": "Pads, drums, speech and full mixes expose different remnants "
                 "at the same Passes value. Judge the voicing by ear against "
                 "your own material. The horizontal meter shows how much "
                 "material is surviving."},
    ],
    "gotchas": [
        "Automatic following currently targets **looped Session View clips**. "
        "Arrangement playback, stopped tracks and non-looped clips fall back to "
        "the manual Cycle value.",
        "Developed and tested for the Push 3 controller; Standalone hasn't been "
        "tested.",
    ],
    "rebuild": [
        "`source/Disintegration.maxpat` is the readable patch; the `.amxd` is "
        "built by `scripts/build_device.mjs`. Earlier builds and their notes "
        "are in `releases/`.",
    ],
})

# --------------------------------------------------------------------------
# MAGNABELT
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "magnabelt",
    "name": "Magnabelt",
    "kind": "Instrument",
    "author": "ChatGPT",
    "status": "v1.0",
    "folder": "magnabelt",
    "tagline": "Spiral-belt sampler after Holger Czukay's IBM dictaphone — "
               "one wandering head, adjacent passes, imperfect erasure.",
    "blurb":
        "Inspired by the IBM Executary 213 dictation machines Czukay played "
        "on David Sylvian's *Brilliant Trees*. A loaded sample becomes a "
        "circular magnetic belt with a three-layer memory: the **current "
        "pass** (the head, inside Start/End), **adjacent passes** one Turn "
        "Time either side (Tracking), and **old residue** seven turns back "
        "(Ghost — imperfect erasure, not a delay tap). Machine wear, rare "
        "slips and a deliberately grubby internal ambience sit on top. Not a "
        "circuit model — an interpretation of the technique.",
    "quickstart": [
        "Drop `Magnabelt v1.0.amxd` on a **MIDI track**. Drop audio on "
        "**DROP AUDIO HERE** or press **LOAD BELT**.",
        "Gate Mode **Manual** = self-running; **MIDI** = notes or Push pads "
        "open the playback key like an instrument.",
        "Drag the orange **Start**, amber **End** and white **Head** lines on "
        "the belt display. Move **Speed** away from zero — negative reverses.",
        "Raise **Tracking**, then **Ghost**, then moderate **Instability**.",
        "A good first setting: Manual, Speed +0.45x, Turn 6 s, Tracking 35, "
        "Ghost 20, Instability 30, Wander 35, Flutter 20, Slip 8, Send 30, "
        "Decay 55, Dark 65, Wear 25 — then move only Head, Speed and Send "
        "for a minute.",
    ],
    "controls": [
        {
            "title": "Belt / key",
            "rows": [
                ["Start / End", "0 – 100 %",
                 "The active circular region. Every adjacent pass and ghost "
                 "wraps inside these boundaries."],
                ["Head Position", "0 – 100 %",
                 "Moves the reader **immediately** — drag the white line, "
                 "automate it, or play it from Push for abrupt fragments."],
                ["Tape Speed", "−2x … +2x",
                 "True varispeed: pitch and duration together. Zero stops "
                 "audible playback; negative reverses the belt."],
                ["Turn Time", "1 – 12 s",
                 "Source-time spacing between neighbouring spiral passes. "
                 "Sets what Tracking and Ghost reach, and how far one "
                 "Backstep jumps. It does **not** resize the loop or set an "
                 "echo tempo."],
                ["Key / Gate Mode", "toggle · Manual / MIDI",
                 "The IBM-style playback key. Manual latches it; MIDI follows "
                 "held notes."],
                ["Backstep", "button",
                 "Jumps exactly one Turn Time backwards from the position "
                 "currently playing."],
            ],
        },
        {
            "title": "Machine",
            "rows": [
                ["Tracking", "0 – 100 %",
                 "Blends the neighbouring pass before or after the head — "
                 "the head hearing sideways into nearby memory."],
                ["Ghost", "0 – 100 %",
                 "Faint material **seven turns behind** — incompletely "
                 "erased residue. Long loops and big Turn values make it "
                 "feel most remote."],
                ["Instability", "0 – 100 %",
                 "Master depth for wander, flutter and tracking drift; also "
                 "raises the probability of rare faults."],
                ["Wander / Flutter", "0 – 100 %",
                 "Wander is slow, non-repeating speed drift (seasick, not "
                 "vibrato); Flutter is faster pitch tremor from two "
                 "mismatched cycles."],
                ["Slip", "0 – 100 %",
                 "Likelihood and severity of occasional slowdowns, dropouts "
                 "or temporary jumps to a neighbouring pass. Intentionally "
                 "rare — it never becomes metronomic."],
                ["Bandwidth / Drive", "0 – 100 %",
                 "Bandwidth opens from veiled dictation tone to a clearer "
                 "path; Drive saturates."],
                ["Hiss / Hum / Output", "0 – 100 % · dB",
                 "Hiss is high-frequency grain; Hum is 50/100 Hz mains "
                 "residue; Output is the final trim — leave headroom when "
                 "Drive, Tracking and Space are high."],
            ],
        },
        {
            "title": "Studio space",
            "intro": "A worn internal ambience **after** the playback key — "
                     "close the key and the room finishes the phrase. Short "
                     "recirculating delays and diffusion, not a pristine hall.",
            "rows": [
                ["Send", "0 – 100 %", "How much machine output enters the room."],
                ["Decay", "0 – 100 %",
                 "Feedback and tail length. High settings can accumulate."],
                ["Dark", "0 – 100 %",
                 "Lowers the return bandwidth for a distant, enclosed room."],
                ["Wear", "0 – 100 %",
                 "Saturation and slow level movement inside the return."],
                ["Space Type", "Room / Plate / Chamber",
                 "Room is compact, Plate balanced, Chamber largest."],
            ],
        },
    ],
    "banks": [
        {"name": "Perform",
         "encoders": ["Head", "Speed", "Key", "Backstep", "Tracking", "Ghost",
                      "Instability", "Space"],
         "note": "Deliberately performance-led — motion, memory, keying and "
                 "ambience under one hand."},
        {"name": "Belt",
         "encoders": ["Start", "End", "Head", "Speed", "Turn", "Gate", "Key",
                      "Backstep"]},
        {"name": "Machine",
         "encoders": ["Instability", "Wander", "Flutter", "Slip", "Tracking",
                      "Ghost", "Bandwidth", "Drive"]},
        {"name": "Texture Space",
         "encoders": ["Hiss", "Hum", "Space", "Decay", "Dark", "Wear", "Mode",
                      "Output"]},
    ],
    "workflow": [
        {"title": "Three performance gestures",
         "text": "**Pad and reveal** — MIDI gate, hold a pad, move Head, "
                 "release; the belt keeps travelling silently so the next "
                 "note reveals a different moment. **Turn and answer** — "
                 "press Backstep, then raise Tracking: the new turn and its "
                 "damaged neighbour at once. **Send the absence** — raise "
                 "Space Send, then close the Key; the source disappears "
                 "while the worn room finishes the phrase."},
        {"title": "Recipes",
         "text": "**Haunted room** Manual, Speed −0.35, Turn 6, Track 55, "
                 "Ghost 45, Instability 35, Send 55, Dark 75, Wear 30 · "
                 "**Cut-up instrument** MIDI, Speed +1.0 or −0.7, Turn 2, "
                 "Track 30, Ghost 12, Instability 20, Slip 5, Send 22 · "
                 "**Unstable archive** Manual, Speed +0.25, Turn 9, Track "
                 "72, Ghost 65, Instability 70, Slip 25, Send 65, Chamber."},
        {"title": "The animated reels",
         "text": "The belt display — draggable Start/End/Head lines and the "
                 "two spinning reels whose speed follows Tape Speed — is a "
                 "single **v8ui** object with its drawing code embedded in "
                 "the patch (mgraphics vector drawing, a `metro 50` driving "
                 "a `tick` that advances the reel angle by the current rate). "
                 "No external js file, so **no freeze is needed** — the "
                 "technique to steal for future devices."},
    ],
    "gotchas": [
        "The **Turn readout is mislabelled 'ms'** in v1.0 — read it as "
        "seconds: 3.25 means 3.25 s between passes. The engine is correct; "
        "only the unit label is wrong.",
        "**Head movement crackles by design** — the reader jumps without a "
        "crossfade, so continuous dial ramps become rough scrubbing. "
        "Automate sparse jumps rather than drawing ramps.",
        "The Live Set stores the sample **path**, not the audio. If the "
        "file moves, drop it in again — and use Collect All and Save for "
        "portability.",
        "No sound? Check: belt loaded, Speed not zero, Key open, Start "
        "before End, Output up.",
    ],
    "rebuild": [
        "`node scripts/build_magnabelt.js` generates `Magnabelt.maxpat`, "
        "`Magnabelt.amxd` and `Magnabelt v1.0.amxd` from nothing. All code "
        "is embedded (v8ui + v8.codebox) — **no freeze needed**.",
        "Tests live in `tests/` — packaging, banks, head/backstep, MIDI "
        "gating and pass gains — plus a Max host test patch.",
    ],
})

# --------------------------------------------------------------------------
# EVENING STAR
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "evening-star",
    "name": "Evening Star",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "v0.2",
    "folder": "Evening Star Device",
    "tagline": "Frippertronics twin tape-loop system — two machine pairs "
               "that build slow soundscapes, darken with every pass and ebb "
               "away on command.",
    "blurb":
        "The two-Revox tape-delay feedback rig Eno set up for Fripp in 1972 "
        "(*No Pussyfooting*, *Evening Star*, the *Gone to Earth* loops), "
        "twice over. Each of the two loops is a circular tape whose length "
        "**is** the delay time: what you play recirculates, and every pass "
        "is a new tape generation — high end fades, saturation creeps in, "
        "and at higher **Wear** settings dropouts get printed permanently "
        "onto the tape. Separate Record and Listen switches per loop let "
        "you build on one machine, freeze it, work on the other, then bring "
        "both back and overdub over the lot. Named after the 1975 Fripp & "
        "Eno album.",
    "quickstart": [
        "Drop `Evening Star v0.2.amxd` on an **audio track**, in front of "
        "guitar or any input. Loop 1 starts armed (REC and EAR on).",
        "Play a phrase; it returns after **Time 1** and stacks up at the "
        "**Feedback 1** rate. Keep playing into the wash.",
        "Switch loop 1's **REC** off (its tape keeps playing), switch loop "
        "2's **REC** and **EAR** on, and build something different at a "
        "different Time.",
        "Bring loop 1's REC back and overdub over everything.",
        "Press **Ebb** and let the whole thing fade over **Ebb Time**; "
        "press again mid-fade to catch it and hold.",
        "For Basinski-style disintegration: build a loop, REC off, "
        "Feedback 100 %, Wear above 70 %, walk away.",
    ],
    "controls": [
        {
            "title": "Per machine pair",
            "rows": [
                ["Time 1 / Time 2", "0.5 - 30 s",
                 "The loop length — the distance between the two tape "
                 "machines. The right-hand reel in the display moves with "
                 "it. Changes glide over about a second, like dragging a "
                 "machine across the floor, rather than jumping cleanly."],
                ["Feedback 1 / 2", "0 - 105 %",
                 "Per-pass survival. 100 % sustains (Wear still dulls it — "
                 "that's the tape); above 100 % swells; below, the loop "
                 "ebbs at its own rate."],
                ["Record (REC)", "toggle",
                 "Feeds the input onto that loop's tape. Red dot in the "
                 "display — clickable there too."],
                ["Listen (EAR)", "toggle",
                 "Makes the loop audible. **Both off = full freeze**: the "
                 "tape holds its contents exactly, silently, indefinitely. "
                 "Record on with Listen off = silent overdub. Listen on "
                 "with Record off = playback, still decaying per pass."],
                ["Speed 1 / 2", "Reverse / Rev Half / Half / Normal",
                 "Normal locks the read head to the write head — a true "
                 "tape pair. Half plays an octave down; Reverse and Rev "
                 "Half let the head drift round the loop against the "
                 "writing, endlessly recombining the material."],
                ["Level 1 / 2", "0 - 100 %", "That loop's output volume."],
            ],
        },
        {
            "title": "Tape",
            "rows": [
                ["Wear", "0 - 100 %",
                 "Generation loss, on a power curve. Below ~30 % it is "
                 "gentle dulling; at full, each pass is filtered down "
                 "toward ~440 Hz, saturated hard, and random segments are "
                 "dipped — and because the damage is written back onto the "
                 "tape, it accumulates pass after pass."],
                ["Wow", "0 - 100 %",
                 "Slow twin-sine pitch drift on both loops' read heads."],
                ["Hiss", "0 - 100 %",
                 "Tape-noise floor added on every pass while a loop "
                 "circulates — an idling loop slowly drowns in it. "
                 "Wear-scaled crackle rides on top."],
                ["Sync", "Free / Half / Same / Double",
                 "Locks Loop 2's time to a ratio of Loop 1's. In Free, "
                 "Time 2 is its own dial. Mismatched times are where the "
                 "deep tidal washes live — two loops that never realign."],
                ["Ebb / Ebb Time", "button - 5 - 300 s",
                 "One press starts a slow fade of both loops over Ebb "
                 "Time; a second press catches the fade and holds at that "
                 "level. The amber bar in the display tracks it. After a "
                 "full fade the tapes are wiped and feedback restores "
                 "itself."],
            ],
        },
        {
            "title": "Mix",
            "rows": [
                ["Dry", "0 - 100 %", "The untreated input, always live."],
                ["Loops", "0 - 100 %", "Both loops' combined return."],
                ["Output", "-18 - +6 dB", "Final trim before the safety clip."],
            ],
        },
    ],
    "banks": [
        {"name": "Perform",
         "encoders": ["Feedbk 1", "Feedbk 2", "Time 1", "Time 2", "Dry",
                      "Loops", "Ebb Time", "Output"],
         "buttons": ["Rec 1", "Ear 1", "Rec 2", "Ear 2", "Ebb"],
         "note": "The playing surface: both feedbacks and times under one "
                 "hand, transport on the button row."},
        {"name": "Machines",
         "encoders": ["Time 1", "Speed 1", "Feedbk 1", "Level 1", "Time 2",
                      "Speed 2", "Feedbk 2", "Level 2"],
         "buttons": ["Rec 1", "Ear 1", "Rec 2", "Ear 2"]},
        {"name": "Tape",
         "encoders": ["Wear", "Wow", "Hiss", "Sync", "Ebb Time", "Dry",
                      "Loops", "Output"],
         "buttons": ["Ebb"]},
    ],
    "workflow": [
        {"title": "the display",
         "text": "Each row is one machine pair: reel spacing follows that "
                 "loop's Time, the spokes rotate at its speed and direction, "
                 "and the tape line between the reels darkens as the loop "
                 "fills. The REC and EAR dots are clickable."},
        {"title": "driving it like Fripp",
         "text": "It rewards restraint: long gaps between phrases, one loop "
                 "carrying a drone while the other takes melody, and "
                 "Feedback ridden like a fader rather than set and left. "
                 "Half speed on a loop of sustained playing is the classic "
                 "shimmering undertow."},
    ],
    "gotchas": [
        "Both switches off is a **freeze**, not a mute — the loop keeps its "
        "contents and stops decaying. If a loop seems to have vanished, "
        "check its EAR dot before assuming it's gone.",
        "Hiss builds on every circulating pass, not just while recording — "
        "at high settings an idling loop will eventually become pure tape "
        "noise. That's a feature, but mind it in quiet mixes.",
        "Wear dropouts above ~40 % are printed permanently onto the tape. "
        "There is no undo — reduce Wear **before** the pass you want to "
        "keep, not after.",
        "Loop buffers hold 30 s at 48 kHz; at 88.2/96 kHz the maximum Time "
        "shrinks proportionally.",
    ],
    "rebuild": [
        "`node build_eveningstar.js` in `Evening Star Device/` regenerates "
        "the `.maxpat` and both `.amxd` files from scratch.",
        "`node tests/sim_eveningstar.js` runs the 53-check suite: a JS port "
        "of the gen~ loop engine (recirculation, decay, freeze/overdub "
        "semantics, head motion, ebb, NaN safety) plus structural checks.",
        "Everything is embedded — gen~ codebox, inline v8ui and v8.codebox "
        "— **no freeze needed**, ever.",
    ],
})

# --------------------------------------------------------------------------
# MOOD
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "mood",
    "name": "Mood",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Awaiting test",
    "folder": "Mood Device",
    "tagline": "Micro-looper into reverb, delay or slip sampler after the "
               "Chase Bliss MOOD MKII — with a shared sample-rate clock.",
    "blurb":
        "Two channels, exactly like the pedal: a **micro-looper** (Env / Tape "
        "/ Stretch) that is always listening and loops the last LENGTH of "
        "audio when you flip it to play, feeding a **wet channel** (Reverb / "
        "Delay / Slip) with Freeze. One CLOCK sets the sample rate of both, "
        "stepping through harmonized ratios so loops change length and pitch "
        "together with the delay times. The whole DSP is one gen~ codebox; "
        "four Push 3 banks cover the panel, the switches, the hidden options "
        "and the dips.",
    "quickstart": [
        "Drop `Mood.amxd` on an audio track.",
        "Play something, then flip **Loop** to play: the last **Length** of "
        "audio loops. **L.Modify** sets Tape speed in octaves.",
        "Set **Wet Mode** and **Routing** to Loop to send the loop through "
        "Reverb, Delay or Slip; **Freeze** holds it.",
        "Turn **Clock** down for longer, lower, crunchier loops and delays.",
    ],
    "controls": [
        {"title": "Mood", "rows": [
            ["Mix", "0 - 100%",
             "Equal-power balance between input and both channels. With both "
             "channels off the dry passes at unity regardless."],
            ["Clock", "0 - 100%",
             "Shared sample rate in harmonized steps (1, 4/3, 3/2, 2, 3, 4, "
             "6, 8); loop length/pitch and delay times follow. Changing it "
             "while a loop plays re-pitches the loop, like the pedal."],
            ["Time", "0 - 100%",
             "Reverb decay/size, delay time, slip refresh rate."],
            ["Modify", "0 - 100%",
             "Reverb smear, delay feedback, slip speed and direction (left "
             "half reverse, 75% = normal, 100% = double)."],
            ["Length", "0 - 100%",
             "Loop length (Tape) or slice size (Env, Stretch) — 21 ms to "
             "2.7 s at full clock, up to 22 s at clock 0."],
            ["L.Modify", "0 - 100%",
             "Env sensitivity; Tape speed in octave steps −4× to 4×, reverse "
             "on the left (70% = 1×); Stretch amount and direction (50% = "
             "frozen)."],
            ["Wet Mode", "Reverb / Delay / Slip", "Wet channel algorithm."],
            ["Loop Mode", "Env / Tape / Stretch", "Micro-looper algorithm."]]},
        {"title": "Switches", "rows": [
            ["Loop", "listen / play",
             "Always recording while listening (the wet channel's output "
             "when it is on); play loops what it just heard."],
            ["Overdub", "off / on",
             "Records the clean input on top of the playing loop (never the "
             "wet channel)."],
            ["Wet On", "off / on", "Wet channel footswitch."],
            ["Freeze", "off / on",
             "Infinitely repeats the current wet sound. Reverb/Delay: "
             "feedback to 1, input muted. Slip: the sampler stops "
             "refreshing."],
            ["Routing", "Input / In+Loop / Loop",
             "What the wet channel processes when both channels are on."],
            ["Spread", "off / on",
             "Stereo processing, per mode: offset read heads, separate L/R "
             "comb sets, right delay at 2/3 time."],
            ["MISO", "off / on", "Mono in, stereo out."],
            ["Dry Kill", "off / on", "Removes the dry signal."]]},
        {"title": "Hidden", "rows": [
            ["Tone", "0 - 100%",
             "Hi-cut on the wet channel — 0 open, 100% down to 1 kHz."],
            ["Width", "0 - 100%", "Wet stereo width when Spread is on."],
            ["Direct", "0 - 100%",
             "Clean micro-loop blend when routed through the wet channel."],
            ["Fade", "0 - 100%", "How fast loops fade while overdubbing."],
            ["Balance", "0 - 100%",
             "Relative level of the two channels; 50% = both unity."],
            ["Sync", "off / on",
             "Delay time / slip refresh follow the loop length."],
            ["Trails", "off / on",
             "Wet tail keeps fading after Wet On goes off."],
            ["No Dub", "off / on", "Overdub replaces instead of adds."]]},
        {"title": "Dips", "rows": [
            ["Half", "full / half", "Loop length half."],
            ["Smooth", "off / on",
             "Continuous Clock instead of harmonized steps."],
            ["Spr Solo", "Both / Looper / Wet",
             "Which channel Spread affects."]]},
    ],
    "banks": [
        {"name": "Mood",
         "encoders": ["Mix", "Clock", "Time", "Modify", "Length", "L.Modify",
                      "Wet Mode", "Loop Mode"]},
        {"name": "Switches",
         "encoders": ["Loop", "Overdub", "Wet On", "Freeze", "Routing",
                      "Spread", "MISO", "Dry Kill"]},
        {"name": "Hidden",
         "encoders": ["Tone", "Width", "Direct", "Fade", "Balance", "Sync",
                      "Trails", "No Dub"]},
        {"name": "Dips",
         "encoders": ["Half", "Smooth", "Spr Solo", None, None, None, None,
                      None]},
    ],
    "gotchas": [
        "The looper only records while **Loop** is on *listen*; flipping to "
        "*play* freezes the buffer. Nothing plays if you flip it before any "
        "audio has gone in.",
        "With **Routing** on Loop and **Wet On**, the loop is 100% wet — use "
        "**Direct** to hear it clean as well.",
        "**Mix** at 100% with both channels off still passes the dry at "
        "unity (pedal-style bypass).",
        "Hold functions (Overdub, Freeze) are toggles: map them to pads for "
        "momentary use.",
        "At Tape speeds other than 1×, overdubs do not land exactly where "
        "you hear the playback — the write follows the loop's own clock "
        "position.",
    ],
    "rebuild": [
        "`python3 build.py` in `Mood Device/Mood source/` regenerates the "
        "`.amxd` from `dsp.genexpr`; `python3 proto.py` runs the offline DSP "
        "checks (about 3 minutes).",
    ],
})

# --------------------------------------------------------------------------
# BAD MOOD
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "bad-mood",
    "name": "Bad Mood",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Awaiting test",
    "folder": "Bad Mood Device",
    "tagline": "Clocked micro-looper into a synthetic wet channel, after the "
               "Chase Bliss BAD MOOD — Burst/Radio/Mask loops, "
               "Soup/Relay/Flip, Cross and Glue.",
    "blurb":
        "A stereo audio effect that follows the pedal's signal flow: "
        "**Micro-looper channel → Wet channel → Glue → Output**. The looper "
        "is always listening; switch **Loop** on to play the last "
        "loop-length back as a step sequence (Burst), a five-station "
        "shortwave radio (Radio) or a threshold-masked loop (Mask). The wet "
        "channel is a modulated feedback reverb with shimmer (Soup), an "
        "equal-volume repeater with 1–8 repeats (Relay) or time-spread pitch "
        "harmonies (Flip). **Clock** sets the sample rate of both channels "
        "in harmonized steps. The whole DSP is one gen~ codebox, so the "
        "device has no dependencies. Four Push 3 banks mirror the front "
        "panel, the footswitches and dips, the character options and setup.",
    "quickstart": [
        "Drop `Bad Mood.amxd` on an audio track; map **Loop**, **Overdub**, "
        "**Wet On** and **Freeze** to pads.",
        "Play a phrase, switch **Loop** on: the last 0.68 s (Clock at 0) "
        "plays back. Pick a **Loop Mode**.",
        "Set **Wet Mode** to Soup and raise **Time**; **Modify** pushes it "
        "synthetic/metallic.",
        "Turn **Clock** to change sample rate, loop length and pitch in "
        "harmonized steps.",
    ],
    "controls": [
        {"title": "Bad Mood", "rows": [
            ["Mix", "0 - 100%", "Input vs BAD MOOD, both channels."],
            ["Clock", "8 steps",
             "Sample rate: loop length/resolution and wet quality/time. "
             "Steps 1, 4/3, 3/2, 2, 3, 4, 6, 8 unless **Smooth**."],
            ["Time", "0 - 100%",
             "Soup decay / Relay delay time / Flip lag between notes."],
            ["Modify", "0 - 100%",
             "Soup character / Relay repeats (1-8) / Flip harmony (8 sets)."],
            ["Length", "0 - 100%",
             "Burst step speed / Radio per-station parameter / Mask "
             "character."],
            ["L.Modify", "0 - 100%",
             "Burst sensitivity / Radio station scan / Mask threshold."],
            ["Wet Mode", "Soup / Relay / Flip",
             "Synthetic reverb, abstract repeater, chordcaster."],
            ["Loop Mode", "Burst / Radio / Mask",
             "Loop sequencer, shortwave looper, loop disguiser."]]},
        {"title": "Switches", "rows": [
            ["Loop", "listen / play",
             "Record (always listening) or play the micro-loop."],
            ["Overdub", "off / on",
             "Layer clean input onto the playing loop."],
            ["Wet On", "off / on", "Wet channel footswitch."],
            ["Freeze", "off / on", "Infinitely repeat the current sound."],
            ["Routing", "Input / In+Loop / Looper",
             "What feeds the wet channel when both are on."],
            ["Spread", "off / on",
             "Stereo spread: different L/R modulation, ping-pong repeats, "
             "detuned harmonies, offset loop read."],
            ["MISO", "off / on", "Mono in, stereo out."],
            ["Dry Kill", "off / on", "Remove the dry signal."]]},
        {"title": "Character", "rows": [
            ["Cross", "0 - 100%",
             "Pitch + loudness modulation from the other channel. Off by "
             "default."],
            ["Input Mod", "off / on", "Cross source becomes the input."],
            ["Glue", "0 - 100%",
             "End-of-chain saturator / destroyer — warming to bit-crushed "
             "above 50%."],
            ["Dry Glue", "off / on", "Glue on the dry signal too."],
            ["EQ", "0 - 100%",
             "Tilt: cw removes lows, ccw removes highs, noon = no effect."],
            ["Balance", "0 - 100%", "Looper vs wet loudness."],
            ["Blend", "0 - 100%",
             "Clean loop when routed through the wet channel."],
            ["Fade", "0 - 100%", "Old layers fade while overdubbing."]]},
        {"title": "Setup", "rows": [
            ["Sync", "off / on",
             "Wet times lock to loop-length divisions (÷1–8 set by Time)."],
            ["Trails", "off / on",
             "Wet tails continue after Wet On goes off."],
            ["Half", "off / on", "Loop length halved."],
            ["Smooth", "off / on", "Continuous Clock."],
            ["Spread Solo", "off / on", "Spread on the wet channel only."]]},
    ],
    "banks": [
        {"name": "Bad Mood",
         "encoders": ["Mix", "Clock", "Time", "Modify", "Length", "L.Modify",
                      "Wet Mode", "Loop Mode"]},
        {"name": "Switches",
         "encoders": ["Loop", "Overdub", "Wet On", "Freeze", "Routing",
                      "Spread", "MISO", "Dry Kill"]},
        {"name": "Character",
         "encoders": ["Cross", "Input Mod", "Glue", "Dry Glue", "EQ",
                      "Balance", "Blend", "Fade"]},
        {"name": "Setup",
         "encoders": ["Sync", "Trails", "Half", "Smooth", "Spread Solo",
                      None, None, None]},
    ],
    "workflow": [
        {"title": "the radio dial",
         "text": "In Radio mode, **L.Modify** scans five stations with "
                 "filtered static between them: Tape (Length = speed and "
                 "direction, ccw reverses), Ambient (slowdown, pitch kept), "
                 "Orchestral (octave and fifth voices drift in and out), "
                 "Shoegaze (frozen grains) and Dance (normal → half → "
                 "double speed)."},
    ],
    "gotchas": [
        "Soup is a modulated feedback network with shimmer, not a true "
        "spectral resynthesis (no FFT in gen~); high **Modify** shortens "
        "its tail a little.",
        "The loop is the last 0.68 s × Clock ratio (at 48 kHz) of what the "
        "looper heard — there is no separate record button.",
        "**Loop**, **Overdub**, **Wet On** and **Freeze** are toggles, not "
        "momentary switches: map them to pads.",
    ],
    "rebuild": [
        "`python3 build.py` in `Bad Mood Device/Bad Mood source/` "
        "regenerates the `.amxd` from `dsp.genexpr`; `python3 proto.py` "
        "runs the Python prototype checks.",
    ],
})

# --------------------------------------------------------------------------
# GEN LOSS
# --------------------------------------------------------------------------
ITEMS.append({
    "slug": "gen-loss",
    "name": "Gen Loss",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Awaiting test",
    "folder": "Generation Loss Device",
    "tagline": "Tape degradation after the Chase Bliss Generation Loss MKII "
               "— wow, flutter, saturation, eleven tape models and a "
               "Failure knob.",
    "blurb":
        "A stereo audio effect that follows the pedal's signal flow: "
        "**Saturate → Model → Drops → Wow/Flutter → Dry blend**. The whole "
        "DSP is one gen~ codebox, so the device has no dependencies. Three "
        "Push 3 banks mirror the pedal's knobs, its toggles and dip "
        "switches, and its hidden options.",
    "quickstart": [
        "Drop `Gen Loss.amxd` on an audio track.",
        "Pick a **Model** (CPR-3300 G3 or Dictatron IN for the heaviest "
        "degradation).",
        "Raise **Wow** and **Flutter** to taste; add **Failure** for drops, "
        "snags and crackle.",
        "Set **Aux** to Stop and map **Aux On** to a pad for tape-stops.",
    ],
    "controls": [
        {"title": "Pedal", "rows": [
            ["Wow", "0 - 100%",
             "Slow random pitch drift. Sweet spot around 30–40%."],
            ["Flutter", "0 - 100%",
             "Fast random pitch and level modulation."],
            ["Saturate", "0 - 100%",
             "Tape saturation with a hysteresis \"memory\" term, so the "
             "shape depends on what came before."],
            ["Failure", "0 - 100%", "Drops, snags, crinkles and pops."],
            ["Model", "Off + 11",
             "Tape machine EQ profiles, VHS to reel-to-reel: CPR-3300 "
             "G1/G2/G3 (VHS, each generation worse), Portamax RT/HT "
             "(cassette), CAM-8, Dictatron EX/IN, Fishy 60, MS-Walker, "
             "AMU-2."],
            ["Volume", "0 - 2", "Wet level; 1 is unity, 2 is +6 dB."],
            ["Dry", "0 - 100%", "Clean blend; 50% is unity."],
            ["Noise", "off / on", "Hiss and mechanical noise."]]},
        {"title": "Aux & stereo", "rows": [
            ["Aux", "Stop / Filter / Fail",
             "What Aux On does: tape-stop to a halt, bypass the Model EQ, "
             "or max Failure."],
            ["Aux On", "off / on", "The footswitch."],
            ["Onset", "10 ms - 4 s", "Arrival time of the Aux effect."],
            ["Spread", "0 - 100%",
             "L/R wow offset; independent drops above 50%."],
            ["MISO", "off / on", "Mono in, stereo out."],
            ["Dry Type", "clean / tape",
             "With tape, the dry also passes Saturate, Model and Drops — "
             "just not Wow/Flutter."],
            ["Drop Byp / Snag Byp", "off / on",
             "Remove that component of Failure."]]},
        {"title": "Hidden", "rows": [
            ["Hiss", "0 - 100%", "Hiss level for the Noise toggle."],
            ["Hum", "0 - 100%", "Mechanical noise level."],
            ["Hum Type", "hum / VCR",
             "50 Hz buzz or 15.7 kHz whine + rumble."],
            ["Crinkle", "0 - 100%", "Audible crinkle/pop level."],
            ["Hum Byp", "off / on", "Remove mechanical noise."],
            ["In Gain", "0 - 100%", "Drive into the saturation."]]},
    ],
    "banks": [
        {"name": "Pedal",
         "encoders": ["Wow", "Flutter", "Saturate", "Failure", "Model",
                      "Volume", "Dry", "Noise"]},
        {"name": "Aux & Stereo",
         "encoders": ["Aux", "Aux On", "Onset", "Spread", "MISO", "Dry Type",
                      "Drop Byp", "Snag Byp"]},
        {"name": "Hidden",
         "encoders": ["Hiss", "Hum", "Hum Type", "Crinkle", "Hum Byp",
                      "In Gain", None, None]},
    ],
    "gotchas": [
        "The wet path has a fixed 10 ms delay, so a high **Dry** setting "
        "combs against it — that is the chorus effect the manual describes, "
        "not a fault.",
        "**Aux On** is a parameter, not a momentary switch: map it to a pad "
        "for footswitch behaviour.",
    ],
    "rebuild": [
        "`python3 build_amxd.py` in `Generation Loss Device/Gen Loss "
        "source/` regenerates the `.amxd` from `dsp.genexpr`; `proto.py` is "
        "the offline Python port of the DSP.",
    ],
})

ITEMS.append({
    "slug": "composite",
    "name": "Composite",
    "kind": "Audio Effect",
    "author": "Claude",
    "status": "Working",
    "folder": "Composite Device",
    "tagline": "Photoshop blend modes for two sample layers — Darken, "
               "Multiply, Difference and the rest, applied per frequency "
               "instead of per pixel.",
    "blurb":
        "Two sample players — **layer A on top, layer B beneath** — meet in "
        "an FFT where each frequency bin's energy is treated as a pixel's "
        "brightness, and all nine blend modes from the layers panel do what "
        "they do in Photoshop: Darken keeps only what both layers share, "
        "Multiply makes A mask B like a vocoder, Difference cancels the "
        "common material and leaves a ghost. Layers warp to Live's grid or "
        "free-run and drift; loudness self-calibrates to the material via an "
        "adaptive white point. Fully self-contained, performs from Push 3 in "
        "Session view.",
    "quickstart": [
        "Drop `Composite.amxd` on an audio track and drop a sample on each "
        "slot.",
        "Pick a **Mode** — start with Darken on two different loops, or "
        "Multiply with drums on A and a pad on B.",
        "**Opacity** is the layers-panel opacity: 100% = the blend, 0% = "
        "layer B alone.",
        "Turn **SYNC** off on one layer so the loops drift — the mask "
        "evolves instead of repeating.",
        "**Freeze** a sustained layer (FRZ) and play material through it: "
        "the held spectrum becomes a fixed stencil.",
    ],
    "controls": [
        {"title": "Blend", "rows": [
            ["Mode", "9 modes",
             "Normal, Darken (knockout), Multiply (cross-synthesis), "
             "Lighten (union), Screen, Overlay, Difference, Exclusion, "
             "Hard Mix."],
            ["Opacity", "0 - 100%",
             "Layers-panel opacity: blend down to layer B alone."],
            ["Phase", "A - B",
             "Whose phases the composite uses — same mask, different "
             "fabric."],
            ["Contrast", "0 - 100%",
             "S-curve on the brightnesses before the mode math; higher is "
             "more decisive, and drives how brutal Hard Mix is."],
            ["Resolution", "2048 - 32 bands",
             "Spectral pixelation: fine and vocal down to chunky "
             "vocoder-ish blocks."],
            ["Swap", "off / on",
             "Flips which layer is on top — Overlay and Normal change "
             "completely."],
            ["Dry", "0 - 100%", "Track input passthrough (default 0)."],
            ["Output", "-18 - +6 dB", "Device level."]]},
        {"title": "Per layer (A and B)", "rows": [
            ["Play", "off / on", "Layer gate. A stopped layer is "
             "*transparent* to the blend, not silent black."],
            ["Sync", "off / on",
             "On: loop locks to whole bars of the transport, pitch-neutral, "
             "Speed snaps to 0.25/0.5/1/2/4. Off: free-runs and drifts."],
            ["Reverse", "off / on", "Read direction."],
            ["Freeze", "off / on",
             "Holds the playback position as a static texture; unfreeze in "
             "Sync snaps back onto the grid."],
            ["Gain", "0 - 100%", "Layer level into the blend."],
            ["Pitch", "-12 - +12 st", "Independent of speed."],
            ["Speed", "0.25 - 4x", "Independent of pitch."],
            ["Start / Length", "% of file", "Loop brackets."]]},
    ],
    "banks": [
        {"name": "Blend",
         "encoders": ["Mode", "Opacity", "Phase", "Contrast", "Resolution",
                      "Dry", "Output", None],
         "buttons": ["Play A", "Play B", "Freeze A", "Freeze B", "Swap",
                     "Sync A", "Sync B"]},
        {"name": "Layer A",
         "encoders": ["Gain A", "Pitch A", "Speed A", "Start A", "Length A",
                      "Opacity", "Mode", None],
         "buttons": ["Play A", "Sync A", "Reverse A", "Freeze A"]},
        {"name": "Layer B",
         "encoders": ["Gain B", "Pitch B", "Speed B", "Start B", "Length B",
                      "Opacity", "Mode", None],
         "buttons": ["Play B", "Sync B", "Reverse B", "Freeze B"]},
    ],
    "workflow": [
        {"title": "the frozen stencil",
         "text": "Freeze a pad mid-chord, switch to Darken, and run a busy "
                 "loop on the other layer — only the frequencies of the "
                 "held chord pass through. Multiply does the same but "
                 "shaped by the moving layer's dynamics."},
        {"title": "drifting knockouts",
         "text": "Two loops of different lengths with SYNC off phase "
                 "against each other, so Darken's overlap — and the mask — "
                 "never repeats. Resolution down and Contrast up makes the "
                 "movement bold."},
        {"title": "difference as a lens",
         "text": "Two takes or two mixes of the *same* material in "
                 "Difference: everything they share cancels and you hear "
                 "only what changed."},
    ],
    "gotchas": [
        "The spectral chain adds **85 ms of latency**. Synced layers "
        "pre-read by exactly that and land on the grid; knob changes and "
        "free-running layers arrive 85 ms late — normal for FFT devices.",
        "Bar maths assume **4/4**; odd meters lock to the beat count only.",
        "Multiply is the geometric mean sqrt(a·b), not the raw "
        "product — the true Photoshop product doubles the darkness in dB "
        "and buries the output. Raise **Contrast** for the darker "
        "character.",
        "Loop Length has a floor of about 50 ms.",
    ],
    "rebuild": [
        "`node build_composite.js` in `Composite Device/` regenerates the "
        "patcher and `.amxd` from scratch; `node tests/sim_composite.js` "
        "runs the 546-check suite (structural asserts plus a real-FFT port "
        "of the whole spectral chain). No external js — never needs "
        "freezing.",
    ],
})
