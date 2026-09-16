// Public surface of `core/settings` — the calibration/high-score/tuning
// persistence layer described in docs/web-port-plan.md, Etapa 5.

export { computeCalibrationOffsetMs } from "./calibration.ts";
export { highScoreKey, loadHighScore, recordHighScoreAttempt, type RecordAttemptResult } from "./highScores.ts";
export {
  DEFAULT_GAME_SETTINGS,
  DEFAULT_SCROLL_PX_PER_MS,
  SETTINGS_LIMITS,
  loadGameSettings,
  saveGameSettings,
} from "./gameSettings.ts";
export type { GameSettings, HighScoreEntry, HighScoreKeyParts, StorageLike } from "./types.ts";
