import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Midi } from "@tonejs/midi";
import type { MidiEvent } from "midi-file";
import { writeMidi } from "midi-file";
import { describe, expect, it } from "vitest";
import { MUSICA_DIR, SONG_DIRS } from "./musicaFixtures.ts";
import { extractVocalNotes } from "./vocalNotes.ts";

const PPQ = 480;

/**
 * Builds raw MIDI bytes for a two-track (conductor + `PART VOCALS`) format-1
 * file, from a list of `PART VOCALS` track events given at *absolute* ticks
 * (converted to the delta-time encoding `writeMidi` expects) — used because
 * `@tonejs/midi`'s `Track` has no API to add lyric/text meta events (see
 * `vocalNotes.ts`'s header comment on why `extractVocalNotes` needs a raw
 * `midi-file` pass at all), so a synthetic vocal chart for tests has to be
 * built at this lower level instead of via `Midi.addTrack()`/`track.addNote()`
 * the way `chartNotes.test.ts` does for guitar/bass/drums.
 */
function buildVocalMidiBytes(eventsAtAbsoluteTicks: readonly { ticks: number; event: MidiEvent }[]): Uint8Array {
  const sorted = [...eventsAtAbsoluteTicks].sort((a, b) => a.ticks - b.ticks);
  let previousTicks = 0;
  const vocalsTrack: MidiEvent[] = [
    { deltaTime: 0, meta: true, type: "trackName", text: "PART VOCALS" },
    ...sorted.map(({ ticks, event }) => {
      const withDelta = { ...event, deltaTime: ticks - previousTicks };
      previousTicks = ticks;
      return withDelta;
    }),
    { deltaTime: 0, meta: true, type: "endOfTrack" },
  ];

  return new Uint8Array(
    writeMidi({
      header: { format: 1, numTracks: 2, ticksPerBeat: PPQ },
      tracks: [
        [
          { deltaTime: 0, meta: true, type: "setTempo", microsecondsPerBeat: 500000 }, // 120bpm
          { deltaTime: 0, meta: true, type: "endOfTrack" },
        ],
        vocalsTrack,
      ],
    }),
  );
}

function noteOn(ticks: number, noteNumber: number): { ticks: number; event: MidiEvent } {
  return { ticks, event: { deltaTime: 0, type: "noteOn", channel: 0, noteNumber, velocity: 100 } };
}

function noteOff(ticks: number, noteNumber: number): { ticks: number; event: MidiEvent } {
  return { ticks, event: { deltaTime: 0, type: "noteOff", channel: 0, noteNumber, velocity: 0 } };
}

function lyric(ticks: number, text: string): { ticks: number; event: MidiEvent } {
  return { ticks, event: { deltaTime: 0, meta: true, type: "lyrics", text } };
}

function loadVocals(eventsAtAbsoluteTicks: readonly { ticks: number; event: MidiEvent }[]) {
  const bytes = buildVocalMidiBytes(eventsAtAbsoluteTicks);
  const midi = new Midi(bytes);
  const trackIndex = midi.tracks.findIndex((t) => t.name === "PART VOCALS");
  return extractVocalNotes(midi, trackIndex, bytes);
}

describe("extractVocalNotes — synthetic chart", () => {
  it("pairs each syllable with its note, converted to ms", () => {
    const notes = loadVocals([
      noteOn(0, 60),
      lyric(0, "Hel-"),
      noteOff(100, 60),
      noteOn(200, 62),
      lyric(200, "lo"),
      noteOff(300, 62),
    ]);

    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ pitch: 60, lyric: "Hel", joinsNext: true, phraseId: null });
    expect(notes[1]).toMatchObject({ pitch: 62, lyric: "lo", joinsNext: false, phraseId: null });
    expect(notes[0].timeMs).toBeCloseTo(0);
    expect(notes[1].timeMs).toBeGreaterThan(notes[0].timeMs);
    expect(notes[0].durationMs).toBeGreaterThan(0);
  });

  it("returns notes ordered by time even if events arrive out of order", () => {
    const notes = loadVocals([
      noteOn(400, 64),
      lyric(400, "third"),
      noteOff(450, 64),
      noteOn(0, 60),
      lyric(0, "first"),
      noteOff(50, 60),
      noteOn(200, 62),
      lyric(200, "second"),
      noteOff(250, 62),
    ]);

    expect(notes.map((n) => n.lyric)).toEqual(["first", "second", "third"]);
  });

  it("marks a syllable ending in '#' as percussion (null pitch), stripping the marker", () => {
    const notes = loadVocals([noteOn(0, 36), lyric(0, "Shout!#"), noteOff(50, 36)]);

    expect(notes[0]).toMatchObject({ pitch: null, lyric: "Shout!" });
  });

  it("treats a lone '+' lyric as a pitch-only continuation with no displayed syllable", () => {
    const notes = loadVocals([
      noteOn(0, 60),
      lyric(0, "Meet"),
      noteOff(50, 60),
      noteOn(100, 62),
      lyric(100, "+"),
      noteOff(150, 62),
    ]);

    expect(notes[1]).toMatchObject({ pitch: 62, lyric: "", joinsNext: false });
  });

  it("strips a trailing '=' the same way as '-' (joins the next syllable)", () => {
    const notes = loadVocals([noteOn(0, 60), lyric(0, "sun="), noteOff(50, 60)]);

    expect(notes[0]).toMatchObject({ lyric: "sun", joinsNext: true });
  });

  it("assigns phrase ids from alternating note 105/106 spans, in chart order", () => {
    const notes = loadVocals([
      noteOn(0, 105),
      noteOff(300, 105), // phrase 0: [0, 300]
      noteOn(0, 60),
      lyric(0, "in"),
      noteOff(50, 60),
      noteOn(400, 106),
      noteOff(700, 106), // phrase 1: [400, 700]
      noteOn(500, 62),
      lyric(500, "phrase"),
      noteOff(550, 62),
      noteOn(800, 64),
      lyric(800, "outside"),
      noteOff(850, 64), // outside both phrases
    ]);

    expect(notes.map((n) => n.phraseId)).toEqual([0, 1, null]);
  });

  it("excludes phrase-marker and star-power-marker notes from the syllable list", () => {
    const notes = loadVocals([
      noteOn(0, 105),
      noteOff(300, 105),
      noteOn(0, 116),
      noteOff(300, 116),
      noteOn(0, 60),
      lyric(0, "only"),
      noteOff(50, 60),
    ]);

    expect(notes).toHaveLength(1);
    expect(notes[0].pitch).toBe(60);
  });

  it("returns an empty list for an out-of-range track index", () => {
    const bytes = buildVocalMidiBytes([noteOn(0, 60), lyric(0, "x"), noteOff(50, 60)]);
    const midi = new Midi(bytes);

    expect(extractVocalNotes(midi, 5, bytes)).toEqual([]);
  });
});

describe("extractVocalNotes — real chart", () => {
  it("extracts the bundled Joan Jett song's vocal line", () => {
    const bytes = readFileSync(join(MUSICA_DIR, SONG_DIRS.joanJett, "notes.mid"));
    const midi = new Midi(bytes);
    const trackIndex = midi.tracks.findIndex((t) => t.name === "PART VOCALS");

    const notes = extractVocalNotes(midi, trackIndex, bytes);

    // Matches the real chart's lyric-event count exactly (checked against
    // the raw MIDI directly — see docs/web-port-plan.md, Etapa 6.5).
    expect(notes).toHaveLength(446);
    expect(notes[0]).toMatchObject({ lyric: "I", joinsNext: false, pitch: null }); // "I#" -> percussion syllable
    expect(notes.every((n, i) => i === 0 || n.timeMs >= notes[i - 1].timeMs)).toBe(true);
    expect(notes.some((n) => n.pitch !== null)).toBe(true);
    expect(notes.some((n) => n.phraseId !== null)).toBe(true);
  });

  it("extracts a consistent vocal line for every bundled song", () => {
    for (const dir of Object.values(SONG_DIRS)) {
      const midiPath = ["notes.mid", "notes-unedited.mid"]
        .map((name) => join(MUSICA_DIR, dir, name))
        .find((path) => {
          try {
            readFileSync(path);
            return true;
          } catch {
            return false;
          }
        });
      if (!midiPath) continue;

      const bytes = readFileSync(midiPath);
      const midi = new Midi(bytes);
      const trackIndex = midi.tracks.findIndex((t) => t.name === "PART VOCALS");
      if (trackIndex === -1) continue;

      const notes = extractVocalNotes(midi, trackIndex, bytes);

      expect(notes.length, dir).toBeGreaterThan(0);
      expect(
        notes.every((n, i) => i === 0 || n.timeMs >= notes[i - 1].timeMs),
        `${dir}: notes must be time-ordered`,
      ).toBe(true);
    }
  });
});
