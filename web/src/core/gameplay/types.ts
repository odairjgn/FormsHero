// New in the web port — no equivalent in the C# project. See
// docs/web-port-plan.md, Etapa 3: "o núcleo pedido, não existe hoje". The
// C# side only ever visualized notes (`ScrollNoteView`) or highlighted a
// static fret row on keypress (`GameNeck`); nothing there judges a keypress
// against a note's timing, so these types have no `GHCore` counterpart to
// port from.

import type { ChartNote, VocalNote } from "../parsing/types.ts";

/** Named timing precision tiers, tightest first — the classic Guitar
 * Hero/Clone Hero "Perfect/Good/Ok" windows the plan calls for. Doesn't
 * include "Miss": a miss is the *absence* of a judgment, not a variant of
 * one — see `NoteRuntimeState.Missed` (a note's window elapsed unpressed)
 * and `WrongPressResult` (a keypress with no note to judge it against). */
export const HitJudgment = {
  Perfect: "Perfect",
  Good: "Good",
  Ok: "Ok",
} as const;
export type HitJudgment = (typeof HitJudgment)[keyof typeof HitJudgment];

/** Lifecycle state of one chart note as gameplay progresses, for the note
 * highway renderer to key its visuals off of. */
export const NoteRuntimeState = {
  /** Not yet judged; still approaching or crossing the hit line. */
  Pending: "Pending",
  /** A non-sustain note that was hit within a timing window. */
  Hit: "Hit",
  /** A sustain note currently being held (key still down). */
  Holding: "Holding",
  /** A sustain held all the way to its end. */
  SustainCompleted: "SustainCompleted",
  /** A sustain released before its end — partial credit only. */
  SustainBroken: "SustainBroken",
  /** Never pressed within any timing window before its window elapsed. */
  Missed: "Missed",
} as const;
export type NoteRuntimeState = (typeof NoteRuntimeState)[keyof typeof NoteRuntimeState];

/** One chart note plus the gameplay engine's running judgment of it —
 * what `GameplayEngine.getNotes()` hands the renderer every frame. */
export interface JudgedNote extends ChartNote {
  /** Stable position in the chart's original (time-sorted) note list. */
  readonly id: number;
  state: NoteRuntimeState;
  /** Set once the note (or its sustain head) is hit; `null` while pending
   * or after a timeout miss (a miss has no timing precision to report). */
  judgment: HitJudgment | null;
}

/** Returned by `GameplayEngine.onFretDown` for a successful hit, so the UI
 * layer can drive feedback (flash/particle) without re-deriving it. */
export interface HitResult {
  readonly kind: "hit";
  readonly noteId: number;
  readonly fret: number;
  readonly judgment: HitJudgment;
  /** Signed offset in ms between the keypress and the note's target time. */
  readonly deltaMs: number;
  readonly pointsAwarded: number;
  readonly combo: number;
  readonly multiplier: number;
}

/**
 * A fret press with nothing to judge it against — no note pending on that
 * fret at all, or the nearest one's offset falls outside every timing
 * window. Treated as an outright error (breaks combo, no points): the
 * keyboard/gamepad input this project targets (the plan's default D/F/J/K/L,
 * or a PS2-style controller's face buttons) has no strum bar to buffer a
 * careless press against the way a real guitar peripheral does — so a
 * fret pressed "at random" has to be a mistake, not a no-op.
 */
export interface WrongPressResult {
  readonly kind: "wrongPress";
  readonly fret: number;
}

/** Everything `GameplayEngine.onFretDown` can return for an actual keypress
 * (as opposed to `null`, reserved for a fret already holding a sustain —
 * see `onFretDown`'s own doc comment). */
export type FretPressResult = HitResult | WrongPressResult;

/** Live score/combo/accuracy snapshot for the HUD. */
export interface GameplayStats {
  readonly score: number;
  readonly combo: number;
  readonly longestCombo: number;
  readonly multiplier: number;
  readonly notesHit: number;
  /** Chart notes whose window elapsed with no keypress at all. */
  readonly notesMissed: number;
  /** Keypresses judged as a `WrongPressResult` — pressing a fret with
   * nothing to hit. Kept separate from `notesMissed` since it isn't tied to
   * any chart note, but folded into `accuracy` alongside it: mashing keys
   * should cost accuracy just as much as missing real notes does. */
  readonly wrongPresses: number;
  readonly notesTotal: number;
  /** `notesHit / (notesHit + notesMissed + wrongPresses)`; `1` before
   * anything's judged yet, so a fresh HUD doesn't show a misleading 0%. */
  readonly accuracy: number;
  /** Etapa 6.3's "barra de energia" (0-100): rises on a hit, falls on a
   * missed/wrong-press note, clamped at both ends — see
   * `GameplayEngineOptions.rockMeter*` for the rates and starting value. */
  readonly rockMeter: number;
  /** True once `rockMeter` has bottomed out at 0 — the plan's "falha de
   * música". The engine itself doesn't stop anything on this; it's up to
   * the caller (`ui/screens/gameplayScreen.ts`) to notice this flag and end
   * the playthrough, same as it already ends one that reaches its last note. */
  readonly failed: boolean;
  /** Etapa 6.2's star power/overdrive: `available` is the meter (0-100,
   * starts empty, filled by fully-hit phrases — see `activateStarPower`'s
   * doc comment on `GameplayEngine`); `active` is true while it's being
   * spent (doubled score, draining over real time). */
  readonly starPower: { readonly available: number; readonly active: boolean };
}

/** Port of the plan's "janelas de tempo (ex.: Perfeito ±35ms, Bom ±90ms,
 * Aceitável ±150ms)" — each is a symmetric +/- radius around a note's
 * `timeMs`, `ok` being the outermost (anything past it doesn't judge). */
export interface HitWindowsMs {
  readonly perfect: number;
  readonly good: number;
  readonly ok: number;
}

export interface GameplayEngineOptions {
  readonly hitWindowsMs?: HitWindowsMs;
  readonly basePointsPerNote?: number;
  readonly sustainPointsPerSecond?: number;
  /** Combo counts at which the multiplier steps up by one, e.g. the plan's
   * default `[10, 20, 30]` for 1x -> 2x -> 3x -> 4x (capped at 4x by only
   * having 3 thresholds). */
  readonly comboMultiplierThresholds?: readonly number[];
  readonly rockMeterStartValue?: number;
  readonly rockMeterGainPerHit?: number;
  /** Applied on both a timed-out miss and a wrong press — the plan's
   * "-6 por miss/wrong-press" treats them the same. */
  readonly rockMeterLossPerMiss?: number;
  /** God mode: the rock meter still rises/falls normally (so the HUD's
   * "Energia" reading stays meaningful), but `GameplayStats.failed` never
   * flips to `true` — a practice/debug toggle to play a song end-to-end
   * without a miss streak cutting it short. Defaults to `false`. */
  readonly godMode?: boolean;
  /** Etapa 6.2: bar points (0-100 scale) awarded for fully hitting one star
   * power phrase (every gem note under one MIDI note-116 span, none
   * missed) — see `DEFAULT_STAR_POWER_GAIN_PER_PHRASE`. */
  readonly starPowerGainPerPhrase?: number;
  /** Etapa 6.2: how fast the star power meter drains, per second of song
   * time, once activated — see `DEFAULT_STAR_POWER_DRAIN_PER_SECOND`. */
  readonly starPowerDrainPerSecond?: number;
}

/**
 * Etapa 6.5's vocal counterpart to `JudgedNote`. Only ever uses `Pending`/
 * `Hit`/`Missed` of `NoteRuntimeState` — the sustain-specific states
 * (`Holding`/`SustainCompleted`/`SustainBroken`) are a fret's discrete-
 * keypress-then-hold concept that doesn't apply to a continuously-judged
 * sung pitch (see `core/gameplay/vocalEngine.ts`).
 */
export interface VocalJudgedNote extends VocalNote {
  readonly id: number;
  state: NoteRuntimeState;
  /** Running fraction (0-1) of this note's judged window sung in tune (or,
   * for a percussion note, simply voiced at all) — accumulates while
   * `Pending`; what `state`'s `Hit`/`Missed` resolution is based on once the
   * window closes (see `VocalGameplayEngineOptions.hitRatioThreshold`). */
  hitRatio: number;
}

export interface VocalGameplayEngineOptions {
  /** How close (in semitones) a detected pitch must be to a note's target
   * to count as "in tune" this frame — see `DEFAULT_VOCAL_TOLERANCE_SEMITONES`. */
  readonly toleranceSemitones?: number;
  /** Fraction of a note's judged window that must be in tune/voiced for it
   * to resolve as a hit — see `DEFAULT_VOCAL_HIT_RATIO_THRESHOLD`. */
  readonly hitRatioThreshold?: number;
  readonly basePointsPerNote?: number;
  readonly comboMultiplierThresholds?: readonly number[];
  readonly rockMeterStartValue?: number;
  readonly rockMeterGainPerHit?: number;
  readonly rockMeterLossPerMiss?: number;
  /** Same "practice/debug toggle" as `GameplayEngineOptions.godMode` —
   * `GameplayStats.failed` never flips to `true` even as the rock meter
   * keeps moving. */
  readonly godMode?: boolean;
}
