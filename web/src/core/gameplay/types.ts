// New in the web port — no equivalent in the C# project. See
// docs/web-port-plan.md, Etapa 3: "o núcleo pedido, não existe hoje". The
// C# side only ever visualized notes (`ScrollNoteView`) or highlighted a
// static fret row on keypress (`GameNeck`); nothing there judges a keypress
// against a note's timing, so these types have no `GHCore` counterpart to
// port from.

import type { ChartNote } from "../parsing/types.ts";

/** Named timing precision tiers, tightest first — the classic Guitar
 * Hero/Clone Hero "Perfect/Good/Ok" windows the plan calls for. Doesn't
 * include "Miss": a miss is the *absence* of a judgment (either no window
 * matched a keypress, or a note's window fully elapsed unpressed), not a
 * variant of one — see `NoteRuntimeState.Missed` for that case. */
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
  readonly noteId: number;
  readonly fret: number;
  readonly judgment: HitJudgment;
  /** Signed offset in ms between the keypress and the note's target time. */
  readonly deltaMs: number;
  readonly pointsAwarded: number;
  readonly combo: number;
  readonly multiplier: number;
}

/** Live score/combo/accuracy snapshot for the HUD. */
export interface GameplayStats {
  readonly score: number;
  readonly combo: number;
  readonly longestCombo: number;
  readonly multiplier: number;
  readonly notesHit: number;
  readonly notesMissed: number;
  readonly notesTotal: number;
  /** `notesHit / (notesHit + notesMissed)`; `1` before anything's judged
   * yet, so a fresh HUD doesn't show a misleading 0%. */
  readonly accuracy: number;
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
}
