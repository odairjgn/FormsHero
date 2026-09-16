import { describe, expect, it } from "vitest";
import { computeMultiplier, computeSustainPoints } from "./scoring.ts";

describe("computeMultiplier — default thresholds [10, 20, 30]", () => {
  it.each([
    [0, 1],
    [9, 1],
    [10, 2],
    [19, 2],
    [20, 3],
    [29, 3],
    [30, 4],
    [1000, 4], // caps at 4x — no threshold past 30
  ])("combo %i -> %ix", (combo, expected) => {
    expect(computeMultiplier(combo)).toBe(expected);
  });

  it("honors custom thresholds, with as many tiers as given", () => {
    expect(computeMultiplier(5, [5])).toBe(2);
    expect(computeMultiplier(4, [5])).toBe(1);
  });
});

describe("computeSustainPoints", () => {
  it("awards points proportional to held duration at the default rate (25/s)", () => {
    expect(computeSustainPoints(1000)).toBe(25);
    expect(computeSustainPoints(2000)).toBe(50);
    expect(computeSustainPoints(500)).toBe(13); // rounded
  });

  it("clamps negative held durations to 0", () => {
    expect(computeSustainPoints(-100)).toBe(0);
  });

  it("honors a custom rate", () => {
    expect(computeSustainPoints(1000, 100)).toBe(100);
  });
});
