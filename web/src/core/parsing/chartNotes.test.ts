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
      { timeMs: 1000, fret: 0, sustainMs: 250 },
      { timeMs: 2000, fret: 4, sustainMs: 500 },
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

describe("extractChartNotes — real chart", () => {
  it("extracts the expert guitar chart for the bundled Joan Jett song", () => {
    const midi = new Midi(
      readFileSync(join(MUSICA_DIR, SONG_DIRS.joanJett, "notes.mid")),
    );
    const guitarTrackIndex = midi.tracks.findIndex((t) => t.name === "PART GUITAR");

    const notes = extractChartNotes(midi, guitarTrackIndex, Difficult.Expert);

    expect(notes).toHaveLength(453);
    // First expert note: MIDI 0x62 (yellow, fret index 2) at ~3.858s, ~79.25ms sustain.
    expect(notes[0]).toEqual({ timeMs: expect.closeTo(3858), fret: 2, sustainMs: expect.closeTo(79.25) });
    // Fully ordered by time.
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].timeMs).toBeGreaterThanOrEqual(notes[i - 1].timeMs);
    }
    // Every fret is a valid gem index.
    expect(notes.every((n) => n.fret >= 0 && n.fret <= 4)).toBe(true);
  });
});
