// Port of the plan's Etapa 5 "persistência local (localStorage) de recordes
// por música/dificuldade" — no C# equivalent (the original project never
// tracked a score at all, see `core/gameplay`'s header comments).

import type { HighScoreEntry, HighScoreKeyParts, StorageLike } from "./types.ts";

const STORAGE_KEY_PREFIX = "formshero:highscore:";

/**
 * One `localStorage` key per song+instrument+difficulty combination, rather
 * than one big JSON blob — a record is written after every playthrough, and
 * per-key writes mean that never involves reading back and re-serializing
 * every other song's records too. `songId` should be a value stable across
 * reloads of the same library folder — `Song.directoryPath` (see
 * `songLibrary.ts`) fits, since it's the path relative to the library root.
 */
export function highScoreKey({ songId, instrument, difficult }: HighScoreKeyParts): string {
  return `${STORAGE_KEY_PREFIX}${songId}::${instrument}::${difficult}`;
}

export function loadHighScore(storage: StorageLike, key: string): HighScoreEntry | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<HighScoreEntry>;
    if (typeof parsed.score !== "number") return null;
    return {
      score: parsed.score,
      accuracy: typeof parsed.accuracy === "number" ? parsed.accuracy : 0,
      longestCombo: typeof parsed.longestCombo === "number" ? parsed.longestCombo : 0,
      achievedAt: typeof parsed.achievedAt === "string" ? parsed.achievedAt : new Date(0).toISOString(),
    };
  } catch {
    return null; // corrupted/foreign value under this key — treat as no record rather than throwing
  }
}

export interface RecordAttemptResult {
  /** `true` if `candidate` beat (or was the first-ever) result for this key. */
  readonly isNewRecord: boolean;
  /** The record now stored for this key — `candidate` itself on a new
   * record, otherwise whatever was already there. */
  readonly best: HighScoreEntry;
}

/**
 * Stores `candidate` as this key's record if it beats (by `score`) whatever
 * is already there, or if nothing is there yet. Ties keep the existing
 * (earlier) record rather than overwriting `achievedAt`.
 */
export function recordHighScoreAttempt(storage: StorageLike, key: string, candidate: HighScoreEntry): RecordAttemptResult {
  const existing = loadHighScore(storage, key);
  if (existing && existing.score >= candidate.score) return { isNewRecord: false, best: existing };

  storage.setItem(key, JSON.stringify(candidate));
  return { isNewRecord: true, best: candidate };
}
