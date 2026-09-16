// Port of `GHCore.Services.Parser` — the MIDI track-name <-> instrument
// mapping and the fret/gem note-number ranges. See CLAUDE.md's "MIDI <->
// instrument/gem mapping" section for the source-of-truth description this
// mirrors.

import { Difficult, GameInstrument } from "./types.ts";

/**
 * Port of `Parser.GetTracksIdsDictionary()`: maps a `GameInstrument` to
 * every MIDI `SequenceTrackName` that identifies it. When adding a new
 * instrument, extend this and the `GameInstrument` enum (`types.ts`)
 * together — same rule as the C# original.
 */
export function getTrackNamesByInstrument(): Map<GameInstrument, string[]> {
  return new Map([
    [GameInstrument.Guitar, ["PART GUITAR", "PART LEAD"]],
    [GameInstrument.Rhythm_Bass, ["PART RHYTHM", "PART BASS"]],
    [GameInstrument.Drums, ["PART DRUMS"]],
    [GameInstrument.Piano, ["PART KEYS"]],
    [GameInstrument.Vocals, ["PART VOCALS"]],
    [GameInstrument.RawEvents, ["RAWKSD"]],
    [GameInstrument.Events, ["EVENTS"]],
    [GameInstrument.Beat, ["BEAT"]],
    [GameInstrument.Venues, ["VENUE"]],
  ]);
}

// Gem/fret MIDI note numbers per difficulty — 5 notes each (green, red,
// yellow, blue, orange), same values as `Parser.EasyGems`/`MediumGems`/
// `HardGems`/`ExpertGems`.
const EASY_GEMS = [0x3c, 0x3d, 0x3e, 0x3f, 0x40] as const;
const MEDIUM_GEMS = [0x48, 0x49, 0x4a, 0x4b, 0x4c] as const;
const HARD_GEMS = [0x54, 0x55, 0x56, 0x57, 0x58] as const;
const EXPERT_GEMS = [0x60, 0x61, 0x62, 0x63, 0x64] as const;

export const GEMS_BY_DIFFICULTY: Readonly<Record<Difficult, readonly number[]>> = {
  [Difficult.Easy]: EASY_GEMS,
  [Difficult.Medium]: MEDIUM_GEMS,
  [Difficult.Hard]: HARD_GEMS,
  [Difficult.Expert]: EXPERT_GEMS,
};

/** Port of the internal `Parser.GetGemIndex(Difficult, int)` overload:
 * the fret index (0-4) of a MIDI note within one difficulty's gem range,
 * or -1 if it isn't one of that difficulty's 5 gem notes. */
export function getGemIndexForDifficulty(difficult: Difficult, midiNote: number): number {
  return GEMS_BY_DIFFICULTY[difficult].indexOf(midiNote);
}

export interface GemLookup {
  index: number;
  difficult: Difficult;
}

/**
 * Port of `Parser.GetGemIndex(byte note, GameInstrument)`. Tries
 * Expert -> Hard -> Medium -> Easy, same priority order as the original,
 * and returns the first difficulty whose gem range contains the note.
 *
 * The original also takes a `GameInstrument` parameter, but never actually
 * uses it in the body — dropped here since it has no effect on the result.
 * Where the original returns `(-1, default)` for "not found", this returns
 * `null`.
 */
export function getGemIndex(midiNote: number): GemLookup | null {
  for (const difficult of [Difficult.Expert, Difficult.Hard, Difficult.Medium, Difficult.Easy]) {
    const index = getGemIndexForDifficulty(difficult, midiNote);
    if (index !== -1) return { index, difficult };
  }

  return null;
}
