import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import { extractChartNotes } from "./chartNotes.ts";
import { MUSICA_DIR, SONG_DIRS } from "./musicaFixtures.ts";
import { Difficult } from "./types.ts";

describe("extractChartNotes — synthetic chart", () => {
  it("keeps only notes matching the requested difficulty's gem range, converted to ms", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 0x60, time: 1, duration: 0.25 }); // Expert, fret 0 (green)
    track.addNote({ midi: 0x64, time: 2, duration: 0.5 }); // Expert, fret 4 (orange)
    track.addNote({ midi: 0x3c, time: 1.5, duration: 0.1 }); // Easy — different difficulty, excluded

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes).toEqual([
      { timeMs: 1000, fret: 0, sustainMs: 250, isHopo: false, isTap: false, starPowerPhraseId: null },
      { timeMs: 2000, fret: 4, sustainMs: 500, isHopo: false, isTap: false, starPowerPhraseId: null },
    ]);
  });

  it("returns the notes ordered by time even if they weren't added in order", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 0x62, time: 3, duration: 0 });
    track.addNote({ midi: 0x60, time: 1, duration: 0 });
    track.addNote({ midi: 0x61, time: 2, duration: 0 });

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes.map((n) => n.timeMs)).toEqual([1000, 2000, 3000]);
  });

  it("returns an empty list for an out-of-range track index", () => {
    const midi = new Midi();
    midi.addTrack();

    expect(extractChartNotes(midi, 5, Difficult.Expert)).toEqual([]);
  });
});

describe("extractChartNotes — HOPO/tap markers (Etapa 6.1)", () => {
  // Expert gems are MIDI 96-100; its force-HOPO marker is 101, its tap
  // marker is 102 (5/6 semitones above the difficulty's lowest gem — see
  // `getForceMarkerNote`/`getTapMarkerNote` in parser.ts). The natural-HOPO
  // tick threshold is a third of a quarter note (160 ticks at this file's
  // default 480 ppq) — `ticksToSeconds` keeps these times exact regardless
  // of the assumed tempo.

  it("marks a note as a natural HOPO when it's close to and a different fret from the previous one", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 }); // fret 0
    track.addNote({ midi: 97, time: midi.header.ticksToSeconds(100), duration: 0 }); // fret 1, 100 ticks later (< 160)

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[0]).toMatchObject({ isHopo: false }); // no predecessor
    expect(notes[1]).toMatchObject({ isHopo: true, isTap: false });
  });

  it("does not mark a note as a natural HOPO once it's past the tick threshold", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });
    track.addNote({ midi: 97, time: midi.header.ticksToSeconds(161), duration: 0 }); // 161 ticks later (> 160)

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: false });
  });

  it("never treats a repeated same-fret note as a natural HOPO, no matter how close", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });
    track.addNote({ midi: 96, time: midi.header.ticksToSeconds(10), duration: 0 }); // same fret, 10 ticks later

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: false });
  });

  it("a force marker flips a note that wouldn't naturally be a HOPO into one", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 }); // fret 0
    track.addNote({ midi: 97, time: 1, duration: 0 }); // fret 1, 1s later — far past the natural threshold
    track.addNote({ midi: 101, time: 1, duration: 0.01 }); // Expert force marker, coincides with the 2nd note

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: true });
  });

  it("a force marker flips a note that would naturally be a HOPO back into a strum", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });
    track.addNote({ midi: 97, time: midi.header.ticksToSeconds(50), duration: 0 }); // naturally a HOPO
    track.addNote({ midi: 101, time: midi.header.ticksToSeconds(50), duration: 0.01 }); // force marker cancels it

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: false });
  });

  it("a force marker's span covers every gem note within its duration, not just the one at its start", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });
    track.addNote({ midi: 101, time: 0.9, duration: 0.2 }); // force span: [0.9s, 1.1s]
    track.addNote({ midi: 97, time: 1.0, duration: 0 }); // fret 1, far from previous but inside the span

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: true });
  });

  it("marks a note as a tap note when covered by the tap marker, independent of HOPO status", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });
    track.addNote({ midi: 97, time: 1, duration: 0 }); // far away — not a natural HOPO, no force marker either
    track.addNote({ midi: 102, time: 1, duration: 0.01 }); // Expert tap marker

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[1]).toMatchObject({ isHopo: false, isTap: true });
  });

  it("scopes force/tap markers to their own difficulty — an Expert marker doesn't affect Hard's notes", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 84, time: 0, duration: 0 }); // Hard fret 0
    track.addNote({ midi: 85, time: 1, duration: 0 }); // Hard fret 1, far away
    track.addNote({ midi: 101, time: 1, duration: 0.01 }); // Expert's force marker, not Hard's (89)

    const notes = extractChartNotes(midi, 0, Difficult.Hard);

    expect(notes[1]).toMatchObject({ isHopo: false, isTap: false });
  });
});

describe("extractChartNotes — star power markers (Etapa 6.2)", () => {
  // MIDI note 116, not per-difficulty (see `STAR_POWER_MARKER_NOTE`'s doc
  // comment in parser.ts) — a span covers every gem note of any difficulty
  // whose onset falls within it, same span semantics as the force/tap
  // markers but its own single marker note.

  it("leaves notes outside every star power span with a null phrase id", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 96, time: 0, duration: 0 });

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[0].starPowerPhraseId).toBeNull();
  });

  it("assigns a phrase id to every gem note covered by a star power span", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 116, time: 0.9, duration: 0.2 }); // SP span: [0.9s, 1.1s]
    track.addNote({ midi: 96, time: 1.0, duration: 0 }); // inside the span

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes[0].starPowerPhraseId).toBe(0);
  });

  it("numbers phrases in chart order, regardless of the order their MIDI events were added", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 116, time: 5, duration: 0.1 }); // 2nd phrase chronologically, added first
    track.addNote({ midi: 116, time: 0, duration: 0.1 }); // 1st phrase chronologically, added second
    track.addNote({ midi: 96, time: 0.05, duration: 0 }); // inside the 1st phrase
    track.addNote({ midi: 97, time: 5.05, duration: 0 }); // inside the 2nd phrase

    const notes = extractChartNotes(midi, 0, Difficult.Expert);

    expect(notes.find((n) => n.fret === 0)?.starPowerPhraseId).toBe(0);
    expect(notes.find((n) => n.fret === 1)?.starPowerPhraseId).toBe(1);
  });

  it("applies the same star power span across every difficulty's gems, unlike force/tap markers", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.addNote({ midi: 116, time: 0, duration: 1 }); // SP span: [0s, 1s]
    track.addNote({ midi: 84, time: 0.5, duration: 0 }); // Hard fret 0, inside the span

    const notes = extractChartNotes(midi, 0, Difficult.Hard);

    expect(notes[0].starPowerPhraseId).toBe(0);
  });
});

describe("extractChartNotes — real chart", () => {
  it("extracts the expert guitar chart for the bundled Joan Jett song", () => {
    const midi = new Midi(
      readFileSync(join(MUSICA_DIR, SONG_DIRS.joanJett, "notes.mid")),
    );
    const guitarTrackIndex = midi.tracks.findIndex((t) => t.name === "PART GUITAR");

    const notes = extractChartNotes(midi, guitarTrackIndex, Difficult.Expert);

    expect(notes).toHaveLength(453);
    // First expert note: MIDI 0x62 (yellow, fret index 2) at ~3.858s, ~79.25ms sustain.
    // It's the chart's very first note (no predecessor, so no natural HOPO)
    // but is covered by an explicit tap marker (MIDI 102) in the real chart.
    expect(notes[0]).toEqual({
      timeMs: expect.closeTo(3858),
      fret: 2,
      sustainMs: expect.closeTo(79.25),
      isHopo: false,
      isTap: true,
      starPowerPhraseId: null,
    });
    // Fully ordered by time.
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].timeMs).toBeGreaterThanOrEqual(notes[i - 1].timeMs);
    }
    // Every fret is a valid gem index.
    expect(notes.every((n) => n.fret >= 0 && n.fret <= 4)).toBe(true);
    // Etapa 6.2: this chart has real star power phrases (checked against
    // the actual notes.mid), numbered contiguously from 0.
    const phraseIds = [...new Set(notes.map((n) => n.starPowerPhraseId).filter((id) => id !== null))].sort(
      (a, b) => a - b,
    );
    expect(phraseIds).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
