import { describe, expect, it } from "vitest";
import { computeCalibrationOffsetMs } from "./calibration.ts";

describe("computeCalibrationOffsetMs", () => {
  it("returns 0 when either timestamp list is empty", () => {
    expect(computeCalibrationOffsetMs([], [100])).toBe(0);
    expect(computeCalibrationOffsetMs([100], [])).toBe(0);
  });

  it("returns 0 when fewer than minSamples taps land within the match window", () => {
    // Only one of these taps is close enough to a beat to count.
    expect(computeCalibrationOffsetMs([0, 500, 1000], [520], 3)).toBe(0);
  });

  it("computes a positive offset for consistently-late taps", () => {
    const beats = [0, 500, 1000, 1500, 2000];
    const taps = beats.map((t) => t + 40); // player always presses 40ms late
    expect(computeCalibrationOffsetMs(beats, taps)).toBe(40);
  });

  it("computes a negative offset for consistently-early taps", () => {
    const beats = [0, 500, 1000, 1500, 2000];
    const taps = beats.map((t) => t - 25);
    expect(computeCalibrationOffsetMs(beats, taps)).toBe(-25);
  });

  it("uses the median so one outlier tap doesn't skew the result", () => {
    const beats = [0, 500, 1000, 1500, 2000];
    const taps = [10, 505, 1200 /* stray outlier */, 1510, 2005];
    expect(computeCalibrationOffsetMs(beats, taps)).toBe(10);
  });

  it("matches each tap to its nearest beat regardless of array order", () => {
    const beats = [2000, 0, 1000];
    const taps = [1030, 30, 2030];
    expect(computeCalibrationOffsetMs(beats, taps)).toBe(30);
  });

  it("ignores taps too far from any beat to be a real attempt", () => {
    const beats = [0, 500, 1000, 1500];
    const taps = [10, 505, 1500 + 10000, 1495]; // one wildly stray tap
    expect(computeCalibrationOffsetMs(beats, taps)).toBe(5); // median of 10, 5, -5
  });
});
