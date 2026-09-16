import { describe, expect, it } from "vitest";
import { GameplayEngine } from "./gameplayEngine.ts";
import { HitJudgment, NoteRuntimeState } from "./types.ts";
import type { ChartNote } from "../parsing/types.ts";

function note(overrides: Partial<ChartNote> = {}): ChartNote {
  return { timeMs: 1000, fret: 0, sustainMs: 0, ...overrides };
}

describe("GameplayEngine construction", () => {
  it("starts every note pending, with zeroed stats", () => {
    const engine = new GameplayEngine([note({ fret: 0 }), note({ fret: 4, timeMs: 2000 })]);

    expect(engine.getNotes().every((n) => n.state === NoteRuntimeState.Pending && n.judgment === null)).toBe(true);
    expect(engine.getStats()).toEqual({
      score: 0,
      combo: 0,
      longestCombo: 0,
      multiplier: 1,
      notesHit: 0,
      notesMissed: 0,
      notesTotal: 2,
      accuracy: 1,
    });
  });

  it("assigns stable, chart-order ids", () => {
    const engine = new GameplayEngine([note({ timeMs: 500 }), note({ timeMs: 100 })]);
    expect(engine.getNotes().map((n) => n.id)).toEqual([0, 1]);
  });
});

describe("GameplayEngine.onFretDown — timing judgment", () => {
  it("hits Perfect within ±35ms", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 2 })]);
    const result = engine.onFretDown(2, 1020);

    expect(result).toEqual({ noteId: 0, fret: 2, judgment: HitJudgment.Perfect, deltaMs: 20, pointsAwarded: 50, combo: 1, multiplier: 1 });
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getNotes()[0].judgment).toBe(HitJudgment.Perfect);
  });

  it("hits Good and Ok at wider offsets", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine.onFretDown(0, 1070)?.judgment).toBe(HitJudgment.Good);

    const engine2 = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine2.onFretDown(0, 1140)?.judgment).toBe(HitJudgment.Ok);
  });

  it("returns null and judges nothing when pressed outside every window", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine.onFretDown(0, 1500)).toBeNull();
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Pending);
  });

  it("returns null when the fret has no more pending notes", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    engine.onFretDown(0, 1000);
    expect(engine.onFretDown(0, 1000)).toBeNull();
  });

  it("judges each fret against its own queue independently", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 1000, fret: 4 })]);

    expect(engine.onFretDown(4, 1000)?.fret).toBe(4);
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Pending); // fret 0 untouched
    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Hit);
  });

  it("always judges the earliest pending note on that fret first", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 2000, fret: 0 })]);

    engine.onFretDown(0, 1010);
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Pending);

    engine.onFretDown(0, 2010);
    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Hit);
  });
});

describe("GameplayEngine — combo, multiplier and score", () => {
  it("increments combo and score on each hit, resets combo to 0 on a miss", () => {
    const notes = Array.from({ length: 3 }, (_, i) => note({ timeMs: (i + 1) * 1000, fret: 0 }));
    const engine = new GameplayEngine(notes);

    engine.onFretDown(0, 1000);
    expect(engine.getStats().combo).toBe(1);
    expect(engine.getStats().score).toBe(50);

    engine.onFretDown(0, 2000);
    expect(engine.getStats().combo).toBe(2);
    expect(engine.getStats().score).toBe(100);

    engine.update(3200); // note 3's OK window (3150) has fully elapsed -> miss
    expect(engine.getStats().combo).toBe(0);
    expect(engine.getStats().notesMissed).toBe(1);
    expect(engine.getStats().longestCombo).toBe(2); // miss doesn't erase the record
  });

  it("scales points awarded with the combo multiplier", () => {
    const notes = Array.from({ length: 11 }, (_, i) => note({ timeMs: (i + 1) * 1000, fret: 0 }));
    const engine = new GameplayEngine(notes);

    for (let i = 0; i < 9; i++) engine.onFretDown(0, (i + 1) * 1000);
    expect(engine.getStats().combo).toBe(9);
    expect(engine.getStats().multiplier).toBe(1);

    const tenthHit = engine.onFretDown(0, 10000)!; // 10th hit crosses the combo-10 threshold
    expect(tenthHit.multiplier).toBe(2);
    expect(tenthHit.pointsAwarded).toBe(100);

    const eleventhHit = engine.onFretDown(0, 11000)!;
    expect(eleventhHit.pointsAwarded).toBe(100); // still 2x
  });

  it("reports accuracy as hits over judged notes, and 100% before anything is judged", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 2000, fret: 1 })]);
    expect(engine.getStats().accuracy).toBe(1);

    engine.onFretDown(0, 1000);
    engine.update(2200); // second note missed
    expect(engine.getStats().accuracy).toBe(0.5);
  });
});

describe("GameplayEngine.update — timeout misses", () => {
  it("misses a note once its OK window fully elapses unpressed, independent of other frets", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 1000, fret: 1 })]);

    engine.update(1000); // well within window, no miss yet
    expect(engine.getNotes().every((n) => n.state === NoteRuntimeState.Pending)).toBe(true);

    engine.onFretDown(1, 1000); // fret 1 hit before its window elapses
    engine.update(1200); // fret 0's OK window (1150) elapsed

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Hit);
  });

  it("is consistent with onFretDown's own window boundary — a press right at the timeout boundary still judges", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine.onFretDown(0, 1150)?.judgment).toBe(HitJudgment.Ok); // exactly at the 150ms edge
  });

  it("returns only the notes newly missed by this call — never re-reports one already timed out", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 2000, fret: 1 })]);

    expect(engine.update(500)).toEqual([]);

    const firstCall = engine.update(1200);
    expect(firstCall).toHaveLength(1);
    expect(firstCall[0].fret).toBe(0);

    expect(engine.update(1300)).toEqual([]); // note 0 already reported

    const secondCall = engine.update(2200);
    expect(secondCall).toHaveLength(1);
    expect(secondCall[0].fret).toBe(1);
  });
});

describe("GameplayEngine — sustains", () => {
  it("enters Holding on hit when the note has a sustain, not Hit", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 })]);
    engine.onFretDown(0, 1000);
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Holding);
  });

  it("completes the sustain and awards full points when held to its natural end via update()", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 })]);
    engine.onFretDown(0, 1000); // +50 base
    engine.update(3000); // sustain end (1000 + 2000)

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.SustainCompleted);
    expect(engine.getStats().score).toBe(50 + 50); // 50 base + 25/s * 2s sustain
  });

  it("completes the sustain when released exactly at or after its end via onFretUp", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 })]);
    engine.onFretDown(0, 1000);
    engine.onFretUp(0, 3000);

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.SustainCompleted);
    expect(engine.getStats().score).toBe(100);
  });

  it("awards only partial sustain points and marks it broken when released early", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 })]);
    engine.onFretDown(0, 1000); // +50 base
    engine.onFretUp(0, 2000); // held for 1000ms of the 2000ms sustain

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.SustainBroken);
    expect(engine.getStats().score).toBe(50 + 25); // 50 base + 25/s * 1s held
  });

  it("does not break combo on an early sustain release — the note itself was already hit", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 })]);
    engine.onFretDown(0, 1000);
    engine.onFretUp(0, 1500);

    expect(engine.getStats().combo).toBe(1);
  });

  it("ignores a second onFretDown on a fret while its sustain is being held", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 }), note({ timeMs: 1500, fret: 0 })]);
    engine.onFretDown(0, 1000);

    expect(engine.onFretDown(0, 1500)).toBeNull();
  });

  it("onFretUp is a no-op when nothing is being held on that fret", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(() => engine.onFretUp(0, 1000)).not.toThrow();
    expect(engine.getStats().score).toBe(0);
  });
});
