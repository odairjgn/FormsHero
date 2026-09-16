import { describe, expect, it } from "vitest";
import { Difficult, GameInstrument } from "./types.ts";
import { getGemIndex, getGemIndexForDifficulty, getTrackNamesByInstrument } from "./parser.ts";

describe("getTrackNamesByInstrument", () => {
  it("maps every documented track name to its instrument (CLAUDE.md contract)", () => {
    const dic = getTrackNamesByInstrument();

    expect(dic.get(GameInstrument.Guitar)).toEqual(["PART GUITAR", "PART LEAD"]);
    expect(dic.get(GameInstrument.Rhythm_Bass)).toEqual(["PART RHYTHM", "PART BASS"]);
    expect(dic.get(GameInstrument.Drums)).toEqual(["PART DRUMS"]);
    expect(dic.get(GameInstrument.Piano)).toEqual(["PART KEYS"]);
    expect(dic.get(GameInstrument.Vocals)).toEqual(["PART VOCALS"]);
    expect(dic.get(GameInstrument.Events)).toEqual(["EVENTS"]);
    expect(dic.get(GameInstrument.Beat)).toEqual(["BEAT"]);
    expect(dic.get(GameInstrument.Venues)).toEqual(["VENUE"]);
    expect(dic.get(GameInstrument.RawEvents)).toEqual(["RAWKSD"]);
  });

  it("has no entry for None/UnKnow — they are never a track-name target", () => {
    const dic = getTrackNamesByInstrument();

    expect(dic.has(GameInstrument.None)).toBe(false);
    expect(dic.has(GameInstrument.UnKnow)).toBe(false);
  });
});

describe("getGemIndexForDifficulty", () => {
  it("finds the fret index (0-4) of a gem note for one difficulty", () => {
    expect(getGemIndexForDifficulty(Difficult.Expert, 0x60)).toBe(0);
    expect(getGemIndexForDifficulty(Difficult.Expert, 0x64)).toBe(4);
    expect(getGemIndexForDifficulty(Difficult.Easy, 0x3c)).toBe(0);
  });

  it("returns -1 for a note outside that difficulty's range", () => {
    expect(getGemIndexForDifficulty(Difficult.Expert, 0x3c)).toBe(-1);
    expect(getGemIndexForDifficulty(Difficult.Easy, 0x60)).toBe(-1);
  });
});

describe("getGemIndex", () => {
  it("tries Expert before Hard/Medium/Easy", () => {
    expect(getGemIndex(0x60)).toEqual({ index: 0, difficult: Difficult.Expert });
  });

  it("falls back through Hard, Medium and Easy in order", () => {
    expect(getGemIndex(0x58)).toEqual({ index: 4, difficult: Difficult.Hard });
    expect(getGemIndex(0x4c)).toEqual({ index: 4, difficult: Difficult.Medium });
    expect(getGemIndex(0x40)).toEqual({ index: 4, difficult: Difficult.Easy });
  });

  it("returns null for a note that isn't any difficulty's gem range", () => {
    expect(getGemIndex(0x41)).toBeNull();
  });
});
