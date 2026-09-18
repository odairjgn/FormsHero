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

/**
 * Etapa 6.1's HOPO/tap marker notes: the FoF/Clone Hero `.mid` convention,
 * confirmed against the 8 bundled charts in `musica/` (see
 * docs/web-port-plan.md, Etapa 6.1 — none of it is guessed, every offset
 * below was checked to coincide with real gem-note onsets in every one of
 * those songs' Guitar/Bass tracks before being hard-coded here). Both are
 * defined *per difficulty*, 5 and 6 semitones above that difficulty's
 * lowest gem note: e.g. Expert's gems are 96-100, so its force marker is
 * 101 and its tap marker is 102. A marker note's own duration is a *span*:
 * every gem note of that same difficulty whose onset falls within
 * [markerStart, markerStart+markerDuration] is marked by it — not just one
 * note at the marker's exact start tick.
 */
const FORCE_MARKER_OFFSET = 5;
const TAP_MARKER_OFFSET = 6;

/** The MIDI note that toggles a difficulty's natural HOPO/strum
 * determination for every gem note within its span (see
 * `FORCE_MARKER_OFFSET`'s doc comment). */
export function getForceMarkerNote(difficult: Difficult): number {
  return GEMS_BY_DIFFICULTY[difficult][0] + FORCE_MARKER_OFFSET;
}

/** The MIDI note that marks every gem note within its span, for this
 * difficulty, as a tap note (see `FORCE_MARKER_OFFSET`'s doc comment). */
export function getTapMarkerNote(difficult: Difficult): number {
  return GEMS_BY_DIFFICULTY[difficult][0] + TAP_MARKER_OFFSET;
}

/**
 * Etapa 6.2's star power/overdrive marker: the FoF/Clone Hero `.mid`
 * convention is a single MIDI note (116), one per instrument track,
 * spanning the phrase's duration the same way the HOPO/tap force markers
 * span theirs (see `FORCE_MARKER_OFFSET`'s doc comment) — every gem note of
 * any difficulty whose onset falls within a note-116 span belongs to that
 * star power phrase. Unlike the HOPO/tap markers, this one is *not*
 * per-difficulty (there's only ever one instance of note 116, shared across
 * every difficulty's gems).
 */
export const STAR_POWER_MARKER_NOTE = 116;

/**
 * Etapa 6.4: for `GameInstrument.Drums`, fret index 4 (the same slot every
 * other instrument's 5th/"orange" gem occupies) is the kick/bass pedal by
 * convention — Clone Hero/FoF drum charts reuse the exact same per-
 * difficulty gem note ranges as guitar/bass (`GEMS_BY_DIFFICULTY`), there's
 * no separate MIDI note range for drums. Exported so `ui/noteHighway.ts` can
 * special-case the pedal's rendering without hardcoding the index in more
 * than one place.
 */
export const DRUM_PEDAL_FRET_INDEX = 4;

/**
 * Etapa 6.5: `PART VOCALS`' phrase-boundary marker notes — Rock Band/Clone
 * Hero vocal charts bracket each sung line ("phrase") with a note on one of
 * these two, alternating between lines, the same span convention as
 * `STAR_POWER_MARKER_NOTE` but for lyric-line grouping instead of overdrive.
 * Checked against every bundled vocal chart's real MIDI (see
 * docs/web-port-plan.md, Etapa 6.5) — both notes are used, alternating.
 */
export const VOCAL_PHRASE_MARKER_NOTES: readonly number[] = [105, 106];

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
