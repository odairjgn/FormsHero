import { describe, expect, it } from "vitest";
import { classifyTiming } from "./judgment.ts";
import { HitJudgment } from "./types.ts";

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
