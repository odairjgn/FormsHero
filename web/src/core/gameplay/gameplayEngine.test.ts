import { describe, expect, it } from "vitest";
import { GameplayEngine } from "./gameplayEngine.ts";
import { HitJudgment, NoteRuntimeState } from "./types.ts";
import type { ChartNote } from "../parsing/types.ts";

function note(overrides: Partial<ChartNote> = {}): ChartNote {
  return { timeMs: 1000, fret: 0, sustainMs: 0, isHopo: false, isTap: false, ...overrides };
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
      wrongPresses: 0,
      notesTotal: 2,
      accuracy: 1,
      rockMeter: 50,
      failed: false,
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

    expect(result).toEqual({
      kind: "hit",
      noteId: 0,
      fret: 2,
      judgment: HitJudgment.Perfect,
      deltaMs: 20,
      pointsAwarded: 50,
      combo: 1,
      multiplier: 1,
    });
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getNotes()[0].judgment).toBe(HitJudgment.Perfect);
  });

  it("hits Good and Ok at wider offsets", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine.onFretDown(0, 1070)).toMatchObject({ kind: "hit", judgment: HitJudgment.Good });

    const engine2 = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine2.onFretDown(0, 1140)).toMatchObject({ kind: "hit", judgment: HitJudgment.Ok });
  });

  it("judges each fret against its own queue independently", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 1000, fret: 4 })]);

    expect(engine.onFretDown(4, 1000)).toMatchObject({ kind: "hit", fret: 4 });
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

describe("GameplayEngine.onFretDown — wrong presses (no strum bar, e.g. a PS2 controller — a stray press is an error)", () => {
  it("registers a wrong press and breaks combo when there's no note pending on that fret at all", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 }), note({ timeMs: 1000, fret: 1 })]);
    engine.onFretDown(0, 1000); // combo -> 1

    expect(engine.onFretDown(1, 1000)).toEqual({ kind: "hit", noteId: 1, fret: 1, judgment: HitJudgment.Perfect, deltaMs: 0, pointsAwarded: 50, combo: 2, multiplier: 1 });
    expect(engine.onFretDown(3, 1000)).toEqual({ kind: "wrongPress", fret: 3 }); // fret 3 has no notes at all
    expect(engine.getStats().combo).toBe(0);
    expect(engine.getStats().wrongPresses).toBe(1);
  });

  it("registers a wrong press when the nearest pending note's offset is outside every window", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    engine.onFretDown(0, 2000); // way outside all windows — must be pressed to trigger since nothing else on this fret matches

    expect(engine.onFretDown(0, 2000)).toEqual({ kind: "wrongPress", fret: 0 });
  });

  it("leaves the actual chart note untouched — a wrong press doesn't consume it", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);

    engine.onFretDown(0, 1500); // outside every window -> wrong press, note not yet due
    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Pending);
    expect(engine.getStats().wrongPresses).toBe(1);

    // the note can still be hit correctly afterward
    expect(engine.onFretDown(0, 1000)).toMatchObject({ kind: "hit" });
  });

  it("counts wrong presses in accuracy the same as a missed note", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    engine.onFretDown(1, 1000); // fret 1 has no note at all -> wrong press

    expect(engine.getStats().accuracy).toBe(0); // 0 hits / (0 hits + 0 missed + 1 wrong press)
  });

  it("returns null (not a wrong press) for a repeat on a fret already holding a sustain", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, sustainMs: 2000 }), note({ timeMs: 1500, fret: 0 })]);
    engine.onFretDown(0, 1000);

    expect(engine.onFretDown(0, 1500)).toBeNull();
    expect(engine.getStats().wrongPresses).toBe(0);
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

    const tenthHit = engine.onFretDown(0, 10000); // 10th hit crosses the combo-10 threshold
    expect(tenthHit).toMatchObject({ multiplier: 2, pointsAwarded: 100 });

    const eleventhHit = engine.onFretDown(0, 11000);
    expect(eleventhHit).toMatchObject({ pointsAwarded: 100 }); // still 2x
  });

  it("reports accuracy as hits over judged attempts, and 100% before anything is judged", () => {
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
    expect(engine.onFretDown(0, 1150)).toMatchObject({ kind: "hit", judgment: HitJudgment.Ok }); // exactly at the 150ms edge
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

describe("GameplayEngine — HOPO/tap auto-hit (Etapa 6.1)", () => {
  it("auto-hits a HOPO note via update() once the previous note was hit and the fret differs", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0 }),
      note({ timeMs: 1200, fret: 1, isHopo: true }),
    ]);

    engine.onFretDown(0, 1000);
    engine.update(1200); // no fret-1 keypress at all

    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getNotes()[1].judgment).toBe(HitJudgment.Perfect);
    expect(engine.getStats().notesHit).toBe(2);
    expect(engine.getStats().combo).toBe(2);
  });

  it("does not auto-hit a HOPO note if the previous note wasn't hit — it still times out as a miss", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0 }),
      note({ timeMs: 1200, fret: 1, isHopo: true }),
    ]);

    engine.update(1000); // note 0 never pressed
    engine.update(1360); // note 1's OK window (1350) elapses too

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Missed);
    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Missed);
  });

  it("does not auto-hit a HOPO note repeating the previous note's fret — that still needs a real press", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0 }),
      note({ timeMs: 1200, fret: 0, isHopo: true }),
    ]);

    engine.onFretDown(0, 1000);
    engine.update(1360); // note 1's OK window elapses unpressed

    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Missed);
  });

  it("does not treat a sustain still being held (Holding, not SustainCompleted) as a hit predecessor", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0, sustainMs: 5000 }),
      note({ timeMs: 1200, fret: 1, isHopo: true }),
    ]);

    engine.onFretDown(0, 1000); // -> Holding, sustain doesn't end until 6000
    engine.update(1360); // note 1's OK window elapses while note 0 is still Holding

    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Missed);
  });

  it("auto-hits a tap note unconditionally, even as the very first note in the chart", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 2, isTap: true })]);

    engine.update(1000);

    expect(engine.getNotes()[0].state).toBe(NoteRuntimeState.Hit);
    expect(engine.getNotes()[0].judgment).toBe(HitJudgment.Perfect);
  });

  it("auto-hits a tap note even repeating the previous note's fret (unlike a HOPO)", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0 }),
      note({ timeMs: 1200, fret: 0, isTap: true }),
    ]);

    engine.onFretDown(0, 1000);
    engine.update(1200);

    expect(engine.getNotes()[1].state).toBe(NoteRuntimeState.Hit);
  });

  it("chains a hit into a HOPO into a miss, breaking combo only on the miss", () => {
    const engine = new GameplayEngine([
      note({ timeMs: 1000, fret: 0 }),
      note({ timeMs: 1200, fret: 1, isHopo: true }),
      note({ timeMs: 3000, fret: 2 }), // too far to be a HOPO target of note 1, and never marked isHopo
    ]);

    engine.onFretDown(0, 1000); // hit
    engine.update(1200); // HOPO auto-hits
    expect(engine.getStats().combo).toBe(2);

    engine.update(3160); // note 3's OK window elapses unpressed -> miss
    expect(engine.getNotes()[2].state).toBe(NoteRuntimeState.Missed);
    expect(engine.getStats().combo).toBe(0);
  });

  it("a keypress still works normally on a HOPO/tap note — auto-hit isn't the only way to hit it", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0, isTap: true })]);

    const result = engine.onFretDown(0, 1010);

    expect(result).toMatchObject({ kind: "hit", judgment: HitJudgment.Perfect });
  });
});

describe("GameplayEngine — rock meter (Etapa 6.3)", () => {
  it("starts at 50 and rises on a hit, clamped at 100", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })]);
    expect(engine.getStats().rockMeter).toBe(50);

    engine.onFretDown(0, 1000);
    expect(engine.getStats().rockMeter).toBe(52);
  });

  it("falls on a timed-out miss and on a wrong press, clamped at 0", () => {
    const notes = Array.from({ length: 20 }, (_, i) => note({ timeMs: (i + 1) * 1000, fret: 0 }));
    const engine = new GameplayEngine(notes);

    engine.onFretDown(1, 1000); // wrong press (fret 1 has no notes) -> -6
    expect(engine.getStats().rockMeter).toBe(44);

    engine.update(1200); // note at 1000's OK window (1150) elapsed -> miss -> -6
    expect(engine.getStats().rockMeter).toBe(38);
  });

  it("exposes failed once the meter bottoms out, from a sequence of misses", () => {
    const notes = Array.from({ length: 10 }, (_, i) => note({ timeMs: (i + 1) * 1000, fret: 0 }));
    const engine = new GameplayEngine(notes);
    expect(engine.getStats().failed).toBe(false);

    for (let i = 0; i < 9; i++) {
      engine.update((i + 1) * 1000 + 200); // each note's OK window elapses unpressed
    }
    expect(engine.getStats().rockMeter).toBe(0); // 50 - 9*6, clamped at 0
    expect(engine.getStats().failed).toBe(true);
  });

  it("honors custom start value and rates", () => {
    const engine = new GameplayEngine([note({ timeMs: 1000, fret: 0 })], {
      rockMeterStartValue: 10,
      rockMeterGainPerHit: 1,
      rockMeterLossPerMiss: 20,
    });

    engine.onFretDown(1, 1000); // wrong press -> -20, clamped at 0
    expect(engine.getStats().rockMeter).toBe(0);
    expect(engine.getStats().failed).toBe(true);
  });
});
