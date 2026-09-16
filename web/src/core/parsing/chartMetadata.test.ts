import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import { readChartMetadata } from "./chartMetadata.ts";
import { MUSICA_DIR, SONG_DIRS } from "./musicaFixtures.ts";
import { Difficult, GameInstrument } from "./types.ts";

function loadMidi(songDir: string, fileName: string): Midi {
  return new Midi(readFileSync(join(MUSICA_DIR, songDir, fileName)));
}

// Same priority as `Song.GetMidi()`: notes-unedited.mid wins when present.
function loadPlayableMidi(songDir: string): Midi {
  const uneditedPath = join(MUSICA_DIR, songDir, "notes-unedited.mid");
  return loadMidi(songDir, existsSync(uneditedPath) ? "notes-unedited.mid" : "notes.mid");
}

describe("readChartMetadata — real charts", () => {
  it("detects guitar/bass/drums and all 4 difficulties on a full chart", () => {
    const parts = readChartMetadata(loadMidi(SONG_DIRS.joanJett, "notes.mid"));

    const guitar = parts.find((p) => p.track === "PART GUITAR");
    expect(guitar?.instrument).toBe(GameInstrument.Guitar);
    expect(guitar?.availableDifficulties).toEqual([
      Difficult.Easy,
      Difficult.Medium,
      Difficult.Hard,
      Difficult.Expert,
    ]);

    const bass = parts.find((p) => p.track === "PART BASS");
    expect(bass?.instrument).toBe(GameInstrument.Rhythm_Bass);

    const drums = parts.find((p) => p.track === "PART DRUMS");
    expect(drums?.instrument).toBe(GameInstrument.Drums);

    const vocals = parts.find((p) => p.track === "PART VOCALS");
    expect(vocals?.instrument).toBe(GameInstrument.Vocals);
  });

  it("gives every part a 0-based index usable directly as midi.tracks[index]", () => {
    const midi = loadMidi(SONG_DIRS.joanJett, "notes.mid");
    const parts = readChartMetadata(midi);

    parts.forEach((part, i) => {
      expect(part.index).toBe(i);
      expect(midi.tracks[part.index]?.name).toBe(part.track);
    });
  });

  it("marks a track with no notes in any gem range as having no available difficulties", () => {
    const parts = readChartMetadata(loadMidi(SONG_DIRS.joanJett, "notes.mid"));

    const events = parts.find((p) => p.track === "EVENTS");
    expect(events?.instrument).toBe(GameInstrument.Events);
    expect(events?.availableDifficulties).toEqual([]);
  });

  it("finds a playable guitar part with at least one difficulty on all 8 bundled songs", () => {
    for (const songDir of Object.values(SONG_DIRS)) {
      const parts = readChartMetadata(loadPlayableMidi(songDir));

      const guitar = parts.find((p) => p.instrument === GameInstrument.Guitar);
      expect(guitar, `${songDir} should have a guitar part`).toBeDefined();
      expect(guitar!.availableDifficulties.length, `${songDir} guitar part should have >=1 difficulty`).toBeGreaterThan(0);

      const bass = parts.find((p) => p.instrument === GameInstrument.Rhythm_Bass);
      expect(bass, `${songDir} should have a rhythm/bass part`).toBeDefined();
    }
  });
});

describe("readChartMetadata — old Frets on Fire fallback (synthetic charts)", () => {
  it("treats a single unnamed track as the guitar part", () => {
    const midi = new Midi();
    midi.addTrack().addNote({ midi: 0x60, time: 0, duration: 0.25 });

    const parts = readChartMetadata(midi);

    expect(parts).toHaveLength(1);
    expect(parts[0].track).toBe("");
    expect(parts[0].instrument).toBe(GameInstrument.Guitar);
    expect(parts[0].index).toBe(0);
    expect(parts[0].availableDifficulties).toEqual([Difficult.Expert]);
  });

  it("does not use the single-track fallback when the lone track has a known name", () => {
    const midi = new Midi();
    const track = midi.addTrack();
    track.name = "PART GUITAR";
    track.addNote({ midi: 0x60, time: 0, duration: 0.1 });

    const parts = readChartMetadata(midi);

    expect(parts).toHaveLength(1);
    expect(parts[0].instrument).toBe(GameInstrument.Guitar);
  });

  it("treats an unrecognized track whose name contains GEMS as guitar, alongside other named tracks", () => {
    const midi = new Midi();
    const gems = midi.addTrack();
    gems.name = "GEMS";
    gems.addNote({ midi: 0x3c, time: 0, duration: 0.1 });

    const vocals = midi.addTrack();
    vocals.name = "PART VOCALS";

    const parts = readChartMetadata(midi);

    expect(parts[0].instrument).toBe(GameInstrument.Guitar);
    expect(parts[0].availableDifficulties).toEqual([Difficult.Easy]);
    expect(parts[1].instrument).toBe(GameInstrument.Vocals);
  });

  it("marks a fully unrecognized track (multiple tracks, no known name, no GEMS) as None", () => {
    const midi = new Midi();
    const mystery = midi.addTrack();
    mystery.name = "SOMETHING ELSE";
    mystery.addNote({ midi: 0x60, time: 0, duration: 0.1 });

    const vocals = midi.addTrack();
    vocals.name = "PART VOCALS";

    const parts = readChartMetadata(midi);

    expect(parts[0].instrument).toBe(GameInstrument.None);
    expect(parts[0].availableDifficulties).toEqual([]);
  });
});
