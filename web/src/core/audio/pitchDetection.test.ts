import { describe, expect, it } from "vitest";
import { detectPitchHz, hzToMidi, midiToHz } from "./pitchDetection.ts";

const SAMPLE_RATE = 44100;

/** A pure sine wave frame at `hz`, the simplest possible synthetic "sung
 * pitch" signal — enough to exercise the autocorrelation math without a
 * real microphone (see `pitchDetection.ts`'s header comment on why this
 * module is DOM-free). */
function sineWave(hz: number, sampleRate: number, sampleCount: number, amplitude = 0.8): Float32Array {
  const buffer = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) buffer[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate);
  return buffer;
}

/** Deterministic pseudo-random noise (no `Math.random()`, so a failing
 * assertion reproduces the same buffer every run) — stands in for
 * unvoiced/silent mic input. */
function noise(sampleCount: number, seed = 1): Float32Array {
  const buffer = new Float32Array(sampleCount);
  let state = seed;
  for (let i = 0; i < sampleCount; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    buffer[i] = (state / 0x7fffffff) * 2 - 1;
  }
  return buffer;
}

describe("detectPitchHz", () => {
  /** Detected pitch only needs to be close enough that a semitone-tolerance
   * judgment (`core/gameplay/vocalJudgment.ts`) would call it in tune — a
   * fraction of a percent off (a few cents) is well within that and not
   * worth chasing bit-exactness on a windowed autocorrelation estimate. */
  function expectHzCloseTo(detected: number | null, expectedHz: number): void {
    expect(detected).not.toBeNull();
    expect(Math.abs(detected! - expectedHz) / expectedHz).toBeLessThan(0.01);
  }

  it("detects A4 (440Hz) from a pure sine wave", () => {
    const buffer = sineWave(440, SAMPLE_RATE, 2048);

    expectHzCloseTo(detectPitchHz(buffer, SAMPLE_RATE, { minHz: 300, maxHz: 600 }), 440);
  });

  it("detects a low bass pitch (110Hz)", () => {
    const buffer = sineWave(110, SAMPLE_RATE, 4096);

    expectHzCloseTo(detectPitchHz(buffer, SAMPLE_RATE, { minHz: 80, maxHz: 160 }), 110);
  });

  it("detects a high soprano-range pitch (880Hz)", () => {
    const buffer = sineWave(880, SAMPLE_RATE, 2048);

    expectHzCloseTo(detectPitchHz(buffer, SAMPLE_RATE, { minHz: 700, maxHz: 1000 }), 880);
  });

  it("returns null for silence", () => {
    const buffer = new Float32Array(2048); // all zeros

    expect(detectPitchHz(buffer, SAMPLE_RATE)).toBeNull();
  });

  it("returns null for unpitched noise", () => {
    const buffer = noise(2048);

    expect(detectPitchHz(buffer, SAMPLE_RATE)).toBeNull();
  });

  it("returns null when the buffer is too short for the requested range", () => {
    const buffer = sineWave(440, SAMPLE_RATE, 32);

    expect(detectPitchHz(buffer, SAMPLE_RATE, { minHz: 70, maxHz: 100 })).toBeNull();
  });
});

describe("hzToMidi / midiToHz", () => {
  it("maps A4 (440Hz) to MIDI 69", () => {
    expect(hzToMidi(440)).toBeCloseTo(69, 5);
  });

  it("maps one octave up to +12 semitones", () => {
    expect(hzToMidi(880)).toBeCloseTo(81, 5);
  });

  it("round-trips through midiToHz", () => {
    for (const midi of [40, 55.5, 69, 72.25, 90]) {
      expect(hzToMidi(midiToHz(midi))).toBeCloseTo(midi, 5);
    }
  });
});
