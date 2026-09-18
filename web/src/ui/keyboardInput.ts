// Port of `GameForm`'s keyboard handling (`_keys = { D, F, J, K, L }`,
// `KeyDown`/`KeyUp` -> `_keys.IndexOf(e.KeyCode)`) onto the DOM
// `KeyboardEvent` API. See docs/web-port-plan.md, Etapa 3.

/**
 * Default bindings, same order as `GameForm._keys` and `GameNeck`'s
 * green/red/yellow/blue/orange frets. Uses `KeyboardEvent.code` (the
 * physical key) rather than `.key`, matching WinForms' `Keys` enum being a
 * physical scan code too — layout changes (e.g. non-QWERTY) don't move
 * these off the D/F/J/K/L position.
 */
export const DEFAULT_FRET_KEY_CODES: readonly string[] = ["KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"];

/** Etapa 6.4's drum bindings: 4 pads on the same left-hand-friendly keys as
 * the guitar/bass frets, but the 5th slot (`DRUM_PEDAL_FRET_INDEX`, the kick
 * pedal) is Space instead of `KeyL` — Space is the natural key for a pedal
 * (a single big "stomp" input, not tied to a specific lane), which is also
 * why star power's own key had to move off Space (see
 * `DEFAULT_STAR_POWER_KEY_CODE`). */
export const DEFAULT_DRUM_KEY_CODES: readonly string[] = ["KeyD", "KeyF", "KeyJ", "KeyK", "Space"];

/** Etapa 6.2's "tecla dedicada" for activating star power. Originally Space
 * (the classic Guitar Hero/Rock Band choice), moved to Left Shift for Etapa
 * 6.4: Space is now the kick pedal's key on drums (`DEFAULT_DRUM_KEY_CODES`),
 * and one physical key can't mean both "activate star power" and "hit the
 * pedal" without a per-instrument key code, which the rest of this module
 * doesn't otherwise need. Left Shift is unused by every other binding and
 * sits right below the guitar/bass frets' `KeyD`, reachable without moving
 * the hand off them. */
export const DEFAULT_STAR_POWER_KEY_CODE = "ShiftLeft";

/** Human-readable label for `DEFAULT_STAR_POWER_KEY_CODE`, for on-screen
 * hints (HUD, pre-game instructions) — kept next to the key code so the two
 * can't drift apart if it moves again. */
export const STAR_POWER_KEY_LABEL = "Shift esquerdo";

export interface FretInputHandlers {
  onFretDown(fret: number): void;
  onFretUp(fret: number): void;
  /** Etapa 6.2: fired on the dedicated star power key (default Space) — a
   * distinct action from the 5 frets, so it's its own handler rather than
   * a 6th fret index. Optional: a caller with no star power UI can omit it. */
  onActivateStarPower?(): void;
}

/**
 * Attaches keydown/keyup listeners mapping `bindings` (index = fret) to
 * `handlers`, plus `starPowerKeyCode` to `handlers.onActivateStarPower`. OS
 * key-repeat is ignored for both: `GameplayEngine.onFretDown` isn't
 * idempotent for a fret currently holding a sustain, so a repeated keydown
 * for a still-held key must not be forwarded as a second press, and
 * `activateStarPower` holding a key down shouldn't spam re-activation either.
 *
 * Returns a function that detaches both listeners — call it before
 * attaching a new set (e.g. starting a different song) to avoid stacking
 * duplicate listeners on `target`.
 */
export function attachKeyboardFretInput(
  target: EventTarget,
  handlers: FretInputHandlers,
  bindings: readonly string[] = DEFAULT_FRET_KEY_CODES,
  starPowerKeyCode: string = DEFAULT_STAR_POWER_KEY_CODE,
): () => void {
  const onKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.repeat) return;

    if (keyboardEvent.code === starPowerKeyCode) {
      handlers.onActivateStarPower?.();
      return;
    }

    const fret = bindings.indexOf(keyboardEvent.code);
    if (fret !== -1) handlers.onFretDown(fret);
  };

  const onKeyUp = (event: Event) => {
    const fret = bindings.indexOf((event as KeyboardEvent).code);
    if (fret !== -1) handlers.onFretUp(fret);
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return () => {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
  };
}
