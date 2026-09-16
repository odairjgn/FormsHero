// Public surface of `src/ui` — the DOM/Canvas layer that renders
// `core/gameplay`'s state and turns keyboard events into its input calls.
// See docs/web-port-plan.md, Etapa 3.

export { NoteHighway, FRET_COLORS, HIT_EFFECT_DURATION_MS, type HitEffect, type NoteHighwayOptions } from "./noteHighway.ts";
export { attachKeyboardFretInput, DEFAULT_FRET_KEY_CODES, type FretInputHandlers } from "./keyboardInput.ts";
