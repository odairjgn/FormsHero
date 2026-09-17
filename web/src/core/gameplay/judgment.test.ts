import { describe, expect, it } from "vitest";
import { classifyTiming, isAutoHitEligible } from "./judgment.ts";
import { HitJudgment, NoteRuntimeState } from "./types.ts";
import type { JudgedNote } from "./types.ts";

describe("classifyTiming — default windows (Perfect ±35ms, Good ±90ms, Ok ±150ms)", () => {
  it.each([
    [0, HitJudgment.Perfect],
    [35, HitJudgment.Perfect],
    [-35, HitJudgment.Perfect],
    [36, HitJudgment.Good],
    [90, HitJudgment.Good],
    [-90, HitJudgment.Good],
    [91, HitJudgment.Ok],
    [150, HitJudgment.Ok],
    [-150, HitJudgment.Ok],
  ])("classifies a %ims offset as %s", (deltaMs, expected) => {
    expect(classifyTiming(deltaMs)).toBe(expected);
  });

  it("returns null outside every window", () => {
    expect(classifyTiming(151)).toBeNull();
    expect(classifyTiming(-500)).toBeNull();
  });

  it("honors custom windows", () => {
    const windows = { perfect: 10, good: 20, ok: 30 };
    expect(classifyTiming(15, windows)).toBe(HitJudgment.Good);
    expect(classifyTiming(25, windows)).toBe(HitJudgment.Ok);
    expect(classifyTiming(35, windows)).toBeNull();
  });
});

function judgedNote(overrides: Partial<JudgedNote> = {}): JudgedNote {
  return {
    id: 0,
    timeMs: 1000,
    fret: 0,
    sustainMs: 0,
    isHopo: false,
    isTap: false,
    starPowerPhraseId: null,
    state: NoteRuntimeState.Pending,
    judgment: null,
    ...overrides,
  };
}

describe("isAutoHitEligible (Etapa 6.1)", () => {
  it("a plain note (neither HOPO nor tap) is never auto-hit-eligible", () => {
    expect(isAutoHitEligible(judgedNote(), null)).toBe(false);
    const previous = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.Hit });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1 }), previous)).toBe(false);
  });

  it("a tap note is eligible with no predecessor at all", () => {
    expect(isAutoHitEligible(judgedNote({ isTap: true }), null)).toBe(true);
  });

  it("a tap note is eligible even repeating the predecessor's fret or after a miss", () => {
    const missedSameFret = judgedNote({ id: 0, fret: 2, state: NoteRuntimeState.Missed });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 2, isTap: true }), missedSameFret)).toBe(true);
  });

  it("a HOPO note needs a predecessor at all — never eligible as the chart's first note", () => {
    expect(isAutoHitEligible(judgedNote({ isHopo: true }), null)).toBe(false);
  });

  it("a HOPO note is eligible once the predecessor was Hit and the fret differs", () => {
    const previous = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.Hit });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1, isHopo: true }), previous)).toBe(true);
  });

  it("a HOPO note is eligible once the predecessor's sustain reached SustainCompleted", () => {
    const previous = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.SustainCompleted });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1, isHopo: true }), previous)).toBe(true);
  });

  it("a HOPO note is not eligible while the predecessor's sustain is still Holding", () => {
    const previous = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.Holding });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1, isHopo: true }), previous)).toBe(false);
  });

  it("a HOPO note is not eligible when the predecessor was missed or broken", () => {
    const missed = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.Missed });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1, isHopo: true }), missed)).toBe(false);

    const broken = judgedNote({ id: 0, fret: 0, state: NoteRuntimeState.SustainBroken });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 1, isHopo: true }), broken)).toBe(false);
  });

  it("a HOPO note is not eligible when it repeats the predecessor's fret, even if the predecessor was hit", () => {
    const previous = judgedNote({ id: 0, fret: 3, state: NoteRuntimeState.Hit });
    expect(isAutoHitEligible(judgedNote({ id: 1, fret: 3, isHopo: true }), previous)).toBe(false);
  });
});
