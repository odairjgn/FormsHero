// New in the web port — no C# equivalent. Port of the plan's Etapa 5
// "Calibração e polimento": persisted per-device tuning (input/audio
// latency offset, note-highway scroll speed, judgment windows) plus
// per-song/difficulty high scores, both backed by `localStorage`.

import type { Difficult, GameInstrument } from "../parsing/types.ts";
import type { HitWindowsMs } from "../gameplay/types.ts";

/**
 * The subset of the DOM `Storage` interface this module needs — `Storage`
 * itself satisfies it directly, so `window.localStorage` can be passed in
 * as-is. Kept minimal (and `*Like`-named, matching `core/audio`'s
 * `AudioContextLike` pattern) so tests can substitute an in-memory fake
 * instead of `localStorage`, which doesn't exist in this project's `node`
 * Vitest environment (see vite.config.ts).
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Device-level tuning, applied to every song until changed again — the
 * plan's "calibração de offset" plus its "ajustes finos de janelas de
 * julgamento e de velocidade de scroll com base em playtesting", made
 * player-adjustable instead of hardcoded constants. */
export interface GameSettings {
  /** Signed milliseconds added to the song clock before judging a keypress
   * or a timeout miss (never to what's rendered — see `calibration.ts`'s
   * header comment for why only judging shifts). Positive means the
   * player's presses tend to land late relative to the audio; negative,
   * early. */
  readonly calibrationOffsetMs: number;
  readonly hitWindowsMs: HitWindowsMs;
  /** Pixels the note highway scrolls per millisecond of song time — same
   * unit as `NoteHighwayOptions.scrollPxPerMs`. */
  readonly scrollPxPerMs: number;
}

/** One song/instrument/difficulty's best result so far. */
export interface HighScoreEntry {
  readonly score: number;
  readonly accuracy: number;
  readonly longestCombo: number;
  /** ISO 8601 timestamp of when this record was set. */
  readonly achievedAt: string;
}

export interface HighScoreKeyParts {
  readonly songId: string;
  readonly instrument: GameInstrument;
  readonly difficult: Difficult;
}
