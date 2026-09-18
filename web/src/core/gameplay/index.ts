// Public surface of `core/gameplay` — the note highway's judging/scoring
// engine (see docs/web-port-plan.md, Etapa 3). Everything needed to turn a
// judged keypress stream into hits, misses, combo and score lives here.

export { GameplayEngine } from "./gameplayEngine.ts";
export { DEFAULT_HIT_WINDOWS_MS, classifyTiming } from "./judgment.ts";
export { VocalGameplayEngine } from "./vocalEngine.ts";
export {
  DEFAULT_VOCAL_HIT_RATIO_THRESHOLD,
  DEFAULT_VOCAL_TOLERANCE_SEMITONES,
  isInTune,
  semitoneDistance,
} from "./vocalJudgment.ts";
export {
  DEFAULT_BASE_POINTS_PER_NOTE,
  DEFAULT_COMBO_MULTIPLIER_THRESHOLDS,
  DEFAULT_ROCK_METER_GAIN_PER_HIT,
  DEFAULT_ROCK_METER_LOSS_PER_MISS,
  DEFAULT_ROCK_METER_START,
  DEFAULT_STAR_POWER_DRAIN_PER_SECOND,
  DEFAULT_STAR_POWER_GAIN_PER_PHRASE,
  DEFAULT_SUSTAIN_POINTS_PER_SECOND,
  ROCK_METER_MAX,
  ROCK_METER_MIN,
  STAR_POWER_MAX,
  STAR_POWER_MIN,
  STAR_POWER_MULTIPLIER,
  clampRockMeter,
  clampStarPower,
  computeMultiplier,
  computeSustainPoints,
} from "./scoring.ts";
export {
  HitJudgment,
  NoteRuntimeState,
  type FretPressResult,
  type GameplayEngineOptions,
  type GameplayStats,
  type HitResult,
  type HitWindowsMs,
  type JudgedNote,
  type VocalGameplayEngineOptions,
  type VocalJudgedNote,
  type WrongPressResult,
} from "./types.ts";
