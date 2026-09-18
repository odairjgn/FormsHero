// Port of the plan's Etapa 5 "ajustes finos de janelas de julgamento e de
// velocidade de scroll com base em playtesting" plus the calibration
// offset — persisted so they survive a reload instead of resetting to the
// Etapa 3 defaults every time. No C# equivalent (see `core/gameplay`'s and
// `calibration.ts`'s header comments).

import { DEFAULT_HIT_WINDOWS_MS } from "../gameplay/judgment.ts";
import type { HitWindowsMs } from "../gameplay/types.ts";
import type { GameSettings, KeyBindingsSettings, PlayerKeyBindings, StorageLike } from "./types.ts";

const STORAGE_KEY = "formshero:settings";
const FRET_COUNT = 5;

/** Same default as `NoteHighwayOptions.scrollPxPerMs` — duplicated as a
 * plain constant (rather than imported from `ui/noteHighway.ts`) so
 * `core/settings` doesn't reach into `src/ui`, keeping the dependency
 * direction core -> ui the plan's Etapa 0 folder layout implies. */
export const DEFAULT_SCROLL_PX_PER_MS = 0.4;

/** Player 1's starting bindings — the same values `ui/keyboardInput.ts`
 * used to hardcode as its only default, duplicated here (not imported) for
 * the same core-doesn't-reach-into-ui reason as `DEFAULT_SCROLL_PX_PER_MS`
 * above. */
const DEFAULT_PLAYER1_FRET_KEY_CODES: readonly string[] = ["KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"];
const DEFAULT_PLAYER1_STAR_POWER_KEY_CODE = "ShiftLeft";

/** Player 2's starting bindings for Etapa 6.6's local multiplayer: the
 * number row plus backtick, both on every keyboard (unlike a numpad) and
 * far enough from player 1's D/F/J/K/L + left Shift cluster that two people
 * can share one keyboard without either set colliding. */
const DEFAULT_PLAYER2_FRET_KEY_CODES: readonly string[] = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
const DEFAULT_PLAYER2_STAR_POWER_KEY_CODE = "Backquote";

export const DEFAULT_KEY_BINDINGS: KeyBindingsSettings = {
  player1: { fretKeyCodes: DEFAULT_PLAYER1_FRET_KEY_CODES, starPowerKeyCode: DEFAULT_PLAYER1_STAR_POWER_KEY_CODE },
  player2: { fretKeyCodes: DEFAULT_PLAYER2_FRET_KEY_CODES, starPowerKeyCode: DEFAULT_PLAYER2_STAR_POWER_KEY_CODE },
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  calibrationOffsetMs: 0,
  hitWindowsMs: DEFAULT_HIT_WINDOWS_MS,
  scrollPxPerMs: DEFAULT_SCROLL_PX_PER_MS,
  keyBindings: DEFAULT_KEY_BINDINGS,
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
      keyBindings: sanitizeKeyBindings(parsed.keyBindings),
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

function sanitizePlayerKeyBindings(
  value: Partial<PlayerKeyBindings> | undefined,
  fallback: PlayerKeyBindings,
): PlayerKeyBindings {
  const frets = value?.fretKeyCodes;
  const isValidFretList =
    Array.isArray(frets) && frets.length === FRET_COUNT && frets.every((code) => typeof code === "string" && code.length > 0);

  return {
    fretKeyCodes: isValidFretList ? (frets as string[]) : fallback.fretKeyCodes,
    starPowerKeyCode:
      typeof value?.starPowerKeyCode === "string" && value.starPowerKeyCode.length > 0
        ? value.starPowerKeyCode
        : fallback.starPowerKeyCode,
  };
}

function sanitizeKeyBindings(value: Partial<KeyBindingsSettings> | undefined): KeyBindingsSettings {
  if (!value) return DEFAULT_KEY_BINDINGS;
  return {
    player1: sanitizePlayerKeyBindings(value.player1, DEFAULT_KEY_BINDINGS.player1),
    player2: sanitizePlayerKeyBindings(value.player2, DEFAULT_KEY_BINDINGS.player2),
  };
}

/** Every configurable slot across both players, in a fixed order (player 1's
 * 5 frets, then its star power key, then the same for player 2) — the flat
 * list `findDuplicateKeyCodes` scans. */
export function allKeyBindingCodes(bindings: KeyBindingsSettings): readonly string[] {
  return [
    ...bindings.player1.fretKeyCodes,
    bindings.player1.starPowerKeyCode,
    ...bindings.player2.fretKeyCodes,
    bindings.player2.starPowerKeyCode,
  ];
}

/**
 * Etapa 6.6 lets two players share one keyboard, so a rebind that collides
 * with another slot (either the same player's own, or the other player's)
 * would silently make both actions fire off one physical key — never what
 * whoever configured it wants. Returns every code used more than once
 * (empty when all 12 slots are distinct), for the settings screen to warn
 * about and refuse to save.
 */
export function findDuplicateKeyCodes(bindings: KeyBindingsSettings): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const code of allKeyBindingCodes(bindings)) {
    if (seen.has(code)) duplicates.add(code);
    seen.add(code);
  }
  return [...duplicates];
}
