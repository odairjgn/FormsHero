import { describe, expect, it } from "vitest";
import { midiToHz } from "../audio/pitchDetection.ts";
import type { VocalNote } from "../parsing/types.ts";
import { DEFAULT_ROCK_METER_START } from "./scoring.ts";
import { NoteRuntimeState } from "./types.ts";
import { VocalGameplayEngine } from "./vocalEngine.ts";

function vocalNote(overrides: Partial<VocalNote> = {}): VocalNote {
  return { timeMs: 0, durationMs: 500, pitch: 60, lyric: "la", joinsNext: false, phraseId: null, ...overrides };
}

/** Steps `engine.update()` from `fromMs` to `toMs` (inclusive) every
 * `stepMs`, calling `pitchAt(songTimeMs)` for the detected pitch each
 * frame — a scripted mic input stream, the same shape a real
 * `MicPitchSource.getCurrentPitchHz()` call would feed in. */
function playFrames(
  engine: VocalGameplayEngine,
  fromMs: number,
  toMs: number,
  stepMs: number,
  pitchAt: (songTimeMs: number) => number | null,
): void {
  for (let t = fromMs; t <= toMs; t += stepMs) {
    engine.update(t, pitchAt(t));
  }
}

describe("VocalGameplayEngine — pitched notes", () => {
  it("resolves a note sung fully in tune as Hit", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: 60 })]);

    playFrames(engine, 0, 250, 16, () => midiToHz(60));

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getStats().notesHit).toBe(1);
    expect(engine.getStats().score).toBeGreaterThan(0);
  });

  it("resolves a note never sung as Missed", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: 60 })]);

    playFrames(engine, 0, 250, 16, () => null);

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
    expect(engine.getStats().notesMissed).toBe(1);
    expect(engine.getStats().score).toBe(0);
  });

  it("resolves a note sung off-pitch (out of tolerance) the whole time as Missed", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: 60 })]);

    playFrames(engine, 0, 250, 16, () => midiToHz(70)); // 10 semitones off

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
  });

  it("resolves as Hit once the in-tune ratio clears the threshold, even if not sung the whole time", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: 60 })]);

    // In tune for the whole window; the only imprecision is frame
    // granularity, which the >= 0.5 threshold comfortably absorbs.
    playFrames(engine, 0, 100, 16, () => midiToHz(60));
    playFrames(engine, 116, 250, 16, () => midiToHz(60));

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
  });

  it("resolves as Missed when the in-tune ratio stays under the threshold", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: 60 })]);

    playFrames(engine, 0, 250, 16, (t) => (t < 40 ? midiToHz(60) : null)); // in tune only briefly

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
  });

  it("judges a very short note over at least a floor window, not just its nominal duration", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 5, pitch: 60 })]);

    // Sung in tune well past the note's own 5ms duration but within the
    // engine's minimum judge window — should still count as Hit.
    playFrames(engine, 0, 130, 16, () => midiToHz(60));

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
  });
});

describe("VocalGameplayEngine — percussion notes", () => {
  it("resolves a percussion note (null pitch) as Hit when any voiced sound is detected", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: null })]);

    // Any pitch at all counts — percussion notes aren't judged on pitch.
    playFrames(engine, 0, 250, 16, () => midiToHz(30));

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
  });

  it("resolves a percussion note as Missed on silence", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 200, pitch: null })]);

    playFrames(engine, 0, 250, 16, () => null);

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
  });
});

describe("VocalGameplayEngine — combo/score/rock meter", () => {
  function threeNotes(): VocalNote[] {
    return [
      vocalNote({ timeMs: 0, durationMs: 100, pitch: 60 }),
      vocalNote({ timeMs: 300, durationMs: 100, pitch: 62 }),
      vocalNote({ timeMs: 600, durationMs: 100, pitch: 64 }),
    ];
  }

  it("builds combo across consecutive hits and resets it on a miss", () => {
    const engine = new VocalGameplayEngine(threeNotes());

    playFrames(engine, 0, 220, 16, (t) => (t <= 100 ? midiToHz(60) : null)); // hit note 0
    expect(engine.getStats().combo).toBe(1);

    playFrames(engine, 236, 520, 16, () => null); // miss note 1
    expect(engine.getStats().combo).toBe(0);
    expect(engine.getStats().longestCombo).toBe(1);
  });

  it("moves the rock meter up on a hit and down on a miss, clamped to [0, 100]", () => {
    const engine = new VocalGameplayEngine([vocalNote({ timeMs: 0, durationMs: 100, pitch: 60 })], {
      rockMeterStartValue: 50,
      rockMeterGainPerHit: 5,
    });

    playFrames(engine, 0, 130, 16, () => midiToHz(60));

    expect(engine.getStats().rockMeter).toBe(55);
  });

  it("fails once the rock meter bottoms out, unless god mode is on", () => {
    const notes = [vocalNote({ timeMs: 0, durationMs: 50, pitch: 60 }), vocalNote({ timeMs: 300, durationMs: 50, pitch: 60 })];
    const failing = new VocalGameplayEngine(notes, { rockMeterStartValue: 5, rockMeterLossPerMiss: 10 });
    playFrames(failing, 0, 370, 16, () => null);
    expect(failing.getStats().failed).toBe(true);

    const godMode = new VocalGameplayEngine(notes, { rockMeterStartValue: 5, rockMeterLossPerMiss: 10, godMode: true });
    playFrames(godMode, 0, 370, 16, () => null);
    expect(godMode.getStats().rockMeter).toBe(0);
    expect(godMode.getStats().failed).toBe(false);
  });

  it("reports accuracy as notesHit / (notesHit + notesMissed), and 1 before anything is judged", () => {
    const engine = new VocalGameplayEngine(threeNotes());
    expect(engine.getStats().accuracy).toBe(1);

    playFrames(engine, 0, 730, 16, (t) => (t <= 100 || (t >= 300 && t <= 400) ? midiToHz(60) : null));

    // Notes 0 and 1 sung correctly-ish (pitch matches note 0's target and,
    // loosely, note 1's — close enough given the default 2-semitone
    // tolerance is what actually decides it); note 2 never sung.
    const stats = engine.getStats();
    expect(stats.notesHit + stats.notesMissed).toBe(3);
    expect(stats.accuracy).toBeCloseTo(stats.notesHit / 3, 5);
  });

  it("reuses GameplayStats' neutral fields for concepts vocals doesn't have", () => {
    const engine = new VocalGameplayEngine(threeNotes());
    const stats = engine.getStats();

    expect(stats.wrongPresses).toBe(0);
    expect(stats.starPower).toEqual({ available: 0, active: false });
  });

  it("starts the rock meter at the shared default, same as GameplayEngine", () => {
    const engine = new VocalGameplayEngine(threeNotes());
    expect(engine.getStats().rockMeter).toBe(DEFAULT_ROCK_METER_START);
  });
});
