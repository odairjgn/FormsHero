// Port of the plan's Etapa 5 "ajustes finos de janelas de julgamento e de
// velocidade de scroll com base em playtesting" plus the calibration
// offset — persisted so they survive a reload instead of resetting to the
// Etapa 3 defaults every time. No C# equivalent (see `core/gameplay`'s and
// `calibration.ts`'s header comments).

import { DEFAULT_HIT_WINDOWS_MS } from "../gameplay/judgment.ts";
import type { HitWindowsMs } from "../gameplay/types.ts";
import type { GameSettings, StorageLike } from "./types.ts";

const STORAGE_KEY = "formshero:settings";

/** Same default as `NoteHighwayOptions.scrollPxPerMs` — duplicated as a
 * plain constant (rather than imported from `ui/noteHighway.ts`) so
 * `core/settings` doesn't reach into `src/ui`, keeping the dependency
 * direction core -> ui the plan's Etapa 0 folder layout implies. */
export const DEFAULT_SCROLL_PX_PER_MS = 0.4;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  calibrationOffsetMs: 0,
  hitWindowsMs: DEFAULT_HIT_WINDOWS_MS,
  scrollPxPerMs: DEFAULT_SCROLL_PX_PER_MS,
};

/** Reasonable tuning bounds for the settings screen's inputs — wide enough
 * to be useful, narrow enough that a typo can't produce an unplayable
 * (e.g. negative or zero-window) config. */
export const SETTINGS_LIMITS = {
  calibrationOffsetMs: { min: -300, max: 300 },
  hitWindowMs: { min: 10, max: 400 },
  scrollPxPerMs: { min: 0.15, max: 1.2 },
} as const;

/**
 * Reads persisted settings, falling back to `DEFAULT_GAME_SETTINGS` (whole
 * object, or field-by-field) when nothing is stored, the value is
 * corrupted, or an older/foreign shape is under the key — never throws.
 */
export function loadGameSettings(storage: StorageLike): GameSettings {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_GAME_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      calibrationOffsetMs: clampOrDefault(
        parsed.calibrationOffsetMs,
        DEFAULT_GAME_SETTINGS.calibrationOffsetMs,
        SETTINGS_LIMITS.calibrationOffsetMs,
      ),
      hitWindowsMs: sanitizeHitWindows(parsed.hitWindowsMs),
      scrollPxPerMs: clampOrDefault(
        parsed.scrollPxPerMs,
        DEFAULT_GAME_SETTINGS.scrollPxPerMs,
        SETTINGS_LIMITS.scrollPxPerMs,
      ),
    };
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveGameSettings(storage: StorageLike, settings: GameSettings): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function sanitizeHitWindows(value: Partial<HitWindowsMs> | undefined): HitWindowsMs {
  if (!value) return DEFAULT_HIT_WINDOWS_MS;
  const { min, max } = SETTINGS_LIMITS.hitWindowMs;
  return {
    perfect: clampOrDefault(value.perfect, DEFAULT_HIT_WINDOWS_MS.perfect, { min, max }),
    good: clampOrDefault(value.good, DEFAULT_HIT_WINDOWS_MS.good, { min, max }),
    ok: clampOrDefault(value.ok, DEFAULT_HIT_WINDOWS_MS.ok, { min, max }),
  };
}

function clampOrDefault(value: number | undefined, fallback: number, limits: { min: number; max: number }): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, value));
}
