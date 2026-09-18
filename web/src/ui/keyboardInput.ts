// Port of `GameForm`'s keyboard handling (`_keys = { D, F, J, K, L }`,
// `KeyDown`/`KeyUp` -> `_keys.IndexOf(e.KeyCode)`) onto the DOM
// `KeyboardEvent` API. See docs/web-port-plan.md, Etapa 3.

/**
 * Default bindings, same order as `GameForm._keys` and `GameNeck`'s
 * green/red/yellow/blue/orange frets. Uses `KeyboardEvent.code` (the
 * physical key) rather than `.key`, matching WinForms' `Keys` enum being a
 * physical scan code too — layout changes (e.g. non-QWERTY) don't move
 * these off the D/F/J/K/L position.
 *
 * Etapa 6.6 made bindings a per-player, persisted setting
 * (`core/settings/gameSettings.ts`'s `DEFAULT_KEY_BINDINGS`, kept as its own
 * duplicated constant rather than importing this one — see that file's
 * header comment for why); this remains only as `attachKeyboardFretInput`'s
 * own parameter default for callers (tests, the pre-Etapa-4 playtest
 * harness) that don't go through settings at all. The 5th slot also now
 * doubles as the drum pedal for whichever player is on drums — no more
 * separate drum-specific default (see `DRUM_PEDAL_FRET_INDEX`'s doc comment
 * for why one key slot can serve both).
 */
export const DEFAULT_FRET_KEY_CODES: readonly string[] = ["KeyD", "KeyF", "KeyJ", "KeyK", "KeyL"];

/** Etapa 6.2's "tecla dedicada" for activating star power — `attachKeyboardFretInput`'s
 * own parameter default (see `DEFAULT_FRET_KEY_CODES`'s doc comment; real
 * playthroughs use the configured `PlayerKeyBindings.starPowerKeyCode`
 * instead). */
export const DEFAULT_STAR_POWER_KEY_CODE = "ShiftLeft";

/**
 * Human-readable label for a `KeyboardEvent.code`, for on-screen hints (HUD,
 * pre-game instructions, the settings screen's rebind rows) — Etapa 6.6
 * made bindings configurable, so a hardcoded label per default key no
 * longer makes sense; this derives one from whatever code is actually
 * bound. Falls back to the raw code for anything not in the short table
 * (e.g. an unusual code a browser reports) rather than guessing.
 */
export function formatKeyCode(code: string): string {
  return KEY_CODE_LABELS[code] ?? code;
}

const KEY_CODE_LABELS: Readonly<Record<string, string>> = {
  Space: "Espaço",
  ShiftLeft: "Shift esquerdo",
  ShiftRight: "Shift direito",
  ControlLeft: "Ctrl esquerdo",
  ControlRight: "Ctrl direito",
  AltLeft: "Alt esquerdo",
  AltRight: "Alt direito",
  Backquote: "` (crase)",
  Enter: "Enter",
  Tab: "Tab",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter) => [`Key${letter}`, letter]),
  ),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Digit${i}`, String(i)])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Numpad${i}`, `Numpad ${i}`])),
};

export interface FretInputHandlers {
  onFretDown(fret: number): void;
  onFretUp(fret: number): void;
  /** Etapa 6.2: fired on the dedicated star power key — a distinct action
   * from the 5 frets, so it's its own handler rather than a 6th fret index.
   * Optional: a caller with no star power UI can omit it. */
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
