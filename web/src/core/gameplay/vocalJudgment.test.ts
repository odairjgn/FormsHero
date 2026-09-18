import { describe, expect, it } from "vitest";
import { midiToHz } from "../audio/pitchDetection.ts";
import { DEFAULT_VOCAL_TOLERANCE_SEMITONES, isInTune, semitoneDistance } from "./vocalJudgment.ts";

describe("semitoneDistance", () => {
  it("is 0 for an exact pitch match", () => {
    expect(semitoneDistance(midiToHz(60), 60)).toBeCloseTo(0, 5);
  });

  it("is 1 for a pitch one semitone away, in either direction", () => {
    expect(semitoneDistance(midiToHz(61), 60)).toBeCloseTo(1, 5);
    expect(semitoneDistance(midiToHz(59), 60)).toBeCloseTo(1, 5);
  });

  it("is 12 for a pitch one octave away", () => {
    expect(semitoneDistance(midiToHz(72), 60)).toBeCloseTo(12, 5);
  });
});

describe("isInTune — default tolerance (±2 semitones)", () => {
  it("accepts an exact match", () => {
    expect(isInTune(midiToHz(64), 64)).toBe(true);
  });

  it("accepts within the tolerance", () => {
    expect(isInTune(midiToHz(64 + DEFAULT_VOCAL_TOLERANCE_SEMITONES), 64)).toBe(true);
    expect(isInTune(midiToHz(64 - DEFAULT_VOCAL_TOLERANCE_SEMITONES), 64)).toBe(true);
  });

  it("rejects just past the tolerance", () => {
    expect(isInTune(midiToHz(64 + DEFAULT_VOCAL_TOLERANCE_SEMITONES + 0.5), 64)).toBe(false);
  });

  it("rejects a null (no detected pitch) frame outright", () => {
    expect(isInTune(null, 64)).toBe(false);
  });

  it("honors a custom tolerance", () => {
    expect(isInTune(midiToHz(65), 64, 0.5)).toBe(false);
    expect(isInTune(midiToHz(64.3), 64, 0.5)).toBe(true);
  });
});
