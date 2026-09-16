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

export interface FretInputHandlers {
  onFretDown(fret: number): void;
  onFretUp(fret: number): void;
}

/**
 * Attaches keydown/keyup listeners mapping `bindings` (index = fret) to
 * `handlers`. OS key-repeat is ignored: `GameplayEngine.onFretDown` isn't
 * idempotent for a fret currently holding a sustain, so a repeated keydown
 * for a still-held key must not be forwarded as a second press.
 *
 * Returns a function that detaches both listeners — call it before
 * attaching a new set (e.g. starting a different song) to avoid stacking
 * duplicate listeners on `target`.
 */
export function attachKeyboardFretInput(
  target: EventTarget,
  handlers: FretInputHandlers,
  bindings: readonly string[] = DEFAULT_FRET_KEY_CODES,
): () => void {
  const onKeyDown = (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.repeat) return;
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
