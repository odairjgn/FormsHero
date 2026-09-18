// Public surface of `src/ui` — the DOM/Canvas layer that renders
// `core/gameplay`'s state and turns keyboard events into its input calls.
// See docs/web-port-plan.md, Etapa 3.

export { NoteHighway, FRET_COLORS, HIT_EFFECT_DURATION_MS, type HitEffect, type NoteHighwayOptions } from "./noteHighway.ts";
export { VocalHighway, type VocalHighwayOptions } from "./vocalHighway.ts";
export {
  attachKeyboardFretInput,
  DEFAULT_DRUM_KEY_CODES,
  DEFAULT_FRET_KEY_CODES,
  DEFAULT_STAR_POWER_KEY_CODE,
  STAR_POWER_KEY_LABEL,
  type FretInputHandlers,
} from "./keyboardInput.ts";

// Etapa 4's screens — see docs/web-port-plan.md.
export { renderSongSelectScreen, type SongSelectCallbacks } from "./screens/songSelectScreen.ts";
export { renderPreGameScreen, type PreGameCallbacks } from "./screens/preGameScreen.ts";
export { startGameplayScreen, type GameplayScreenOptions } from "./screens/gameplayScreen.ts";
export { startVocalGameplayScreen, type VocalGameplayScreenOptions } from "./screens/vocalGameplayScreen.ts";
export { renderResultsScreen, type ResultsCallbacks } from "./screens/resultsScreen.ts";

// Etapa 5's settings/calibration screen — see docs/web-port-plan.md.
export { renderSettingsScreen, type SettingsCallbacks } from "./screens/settingsScreen.ts";
