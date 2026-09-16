import { describe, expect, it } from "vitest";
import { GameInstrument, Difficult } from "../parsing/types.ts";
import { highScoreKey, loadHighScore, recordHighScoreAttempt } from "./highScores.ts";
import type { StorageLike } from "./types.ts";

/** In-memory stand-in for `localStorage` (unavailable in this project's
 * `node` Vitest environment — see vite.config.ts), same `*Like` faking
 * pattern as `core/audio/audioEngine.test.ts`'s `FakeAudioContext`. */
class FakeStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const KEY_PARTS = { songId: "packs/song-a", instrument: GameInstrument.Guitar, difficult: Difficult.Expert };

describe("highScoreKey", () => {
  it("distinguishes song, instrument and difficulty", () => {
    const base = highScoreKey(KEY_PARTS);
    expect(highScoreKey({ ...KEY_PARTS, songId: "packs/song-b" })).not.toBe(base);
    expect(highScoreKey({ ...KEY_PARTS, instrument: GameInstrument.Rhythm_Bass })).not.toBe(base);
    expect(highScoreKey({ ...KEY_PARTS, difficult: Difficult.Easy })).not.toBe(base);
  });
});

describe("loadHighScore", () => {
  it("returns null when nothing is stored for that key", () => {
    expect(loadHighScore(new FakeStorage(), highScoreKey(KEY_PARTS))).toBeNull();
  });

  it("returns null for a corrupted/foreign value instead of throwing", () => {
    const storage = new FakeStorage();
    const key = highScoreKey(KEY_PARTS);
    storage.setItem(key, "not json");
    expect(loadHighScore(storage, key)).toBeNull();
  });
});

describe("recordHighScoreAttempt", () => {
  it("stores the first attempt as a new record", () => {
    const storage = new FakeStorage();
    const key = highScoreKey(KEY_PARTS);
    const candidate = { score: 1000, accuracy: 0.9, longestCombo: 20, achievedAt: "2026-01-01T00:00:00.000Z" };

    const result = recordHighScoreAttempt(storage, key, candidate);

    expect(result).toEqual({ isNewRecord: true, best: candidate });
    expect(loadHighScore(storage, key)).toEqual(candidate);
  });

  it("overwrites the record when the new score is strictly higher", () => {
    const storage = new FakeStorage();
    const key = highScoreKey(KEY_PARTS);
    recordHighScoreAttempt(storage, key, { score: 500, accuracy: 0.5, longestCombo: 5, achievedAt: "t0" });

    const better = { score: 900, accuracy: 0.8, longestCombo: 15, achievedAt: "t1" };
    const result = recordHighScoreAttempt(storage, key, better);

    expect(result).toEqual({ isNewRecord: true, best: better });
    expect(loadHighScore(storage, key)).toEqual(better);
  });

  it("keeps the existing record on a tie or a worse attempt", () => {
    const storage = new FakeStorage();
    const key = highScoreKey(KEY_PARTS);
    const first = { score: 500, accuracy: 0.5, longestCombo: 5, achievedAt: "t0" };
    recordHighScoreAttempt(storage, key, first);

    const tie = recordHighScoreAttempt(storage, key, { ...first, achievedAt: "t1" });
    const worse = recordHighScoreAttempt(storage, key, { score: 100, accuracy: 0.1, longestCombo: 1, achievedAt: "t2" });

    expect(tie).toEqual({ isNewRecord: false, best: first });
    expect(worse).toEqual({ isNewRecord: false, best: first });
    expect(loadHighScore(storage, key)).toEqual(first);
  });

  it("keeps separate records per song/instrument/difficulty key", () => {
    const storage = new FakeStorage();
    const keyA = highScoreKey(KEY_PARTS);
    const keyB = highScoreKey({ ...KEY_PARTS, difficult: Difficult.Easy });

    recordHighScoreAttempt(storage, keyA, { score: 1000, accuracy: 1, longestCombo: 50, achievedAt: "t0" });

    expect(loadHighScore(storage, keyB)).toBeNull();
    expect(loadHighScore(storage, keyA)?.score).toBe(1000);
  });
});
