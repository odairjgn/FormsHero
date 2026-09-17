// New in the web port — no C# equivalent (see types.ts's header comment).
// Port of the plan's Etapa 3 "pontuação e combo" rules.

/** Plan default: "1x -> 2x aos 10 -> 3x aos 20 -> 4x aos 30, teto em 4x". */
export const DEFAULT_COMBO_MULTIPLIER_THRESHOLDS: readonly number[] = [10, 20, 30];
export const DEFAULT_BASE_POINTS_PER_NOTE = 50;
export const DEFAULT_SUSTAIN_POINTS_PER_SECOND = 25;

// Etapa 6.3's rock meter — "+2 por hit, -6 por miss/wrong-press, clamp
// 0-100". Starts at the halfway point, same as classic Guitar Hero: neither
// an instant fail from an early flub nor an unlosable head start.
export const ROCK_METER_MIN = 0;
export const ROCK_METER_MAX = 100;
export const DEFAULT_ROCK_METER_START = 50;
export const DEFAULT_ROCK_METER_GAIN_PER_HIT = 2;
export const DEFAULT_ROCK_METER_LOSS_PER_MISS = 6;

/**
 * Combo multiplier for a given combo count: starts at 1x and steps up by
 * one for every threshold reached. With the default 3 thresholds this caps
 * at 4x, same as classic Guitar Hero — the cap isn't a separate clamp, it
 * falls out of how many thresholds are configured.
 */
export function computeMultiplier(
  combo: number,
  thresholds: readonly number[] = DEFAULT_COMBO_MULTIPLIER_THRESHOLDS,
): number {
  let multiplier = 1;
  for (const threshold of thresholds) {
    if (combo >= threshold) multiplier++;
  }
  return multiplier;
}

/**
 * Points for a sustain held for `heldMs` (a full hold or a partial one cut
 * short by an early release — see the plan's "soltar antes do fim
 * reduz... a pontuação do sustain"). Sustain points are not affected by the
 * combo multiplier — only the base note hit that started the sustain is.
 */
export function computeSustainPoints(
  heldMs: number,
  sustainPointsPerSecond: number = DEFAULT_SUSTAIN_POINTS_PER_SECOND,
): number {
  return Math.round((Math.max(0, heldMs) / 1000) * sustainPointsPerSecond);
}

/** Clamps a rock meter value to its `[0, 100]` range — the same clamp
 * applies whether it just gained from a hit or lost from a miss. */
export function clampRockMeter(value: number): number {
  return Math.min(ROCK_METER_MAX, Math.max(ROCK_METER_MIN, value));
}
