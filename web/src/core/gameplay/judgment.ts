// New in the web port — no C# equivalent (see types.ts's header comment).
// Port of the plan's Etapa 3 "julgamento de acerto" timing windows.

import { HitJudgment, NoteRuntimeState } from "./types.ts";
import type { HitWindowsMs, JudgedNote } from "./types.ts";

/** Plan defaults: "Perfeito ±35ms, Bom ±90ms, Aceitável ±150ms". */
export const DEFAULT_HIT_WINDOWS_MS: HitWindowsMs = { perfect: 35, good: 90, ok: 150 };

/**
 * Classifies a keypress's timing offset from its target note. Tries the
 * tightest window first, same "closest wins" spirit as
 * `Parser.GetGemIndex`'s Expert -> Hard -> Medium -> Easy search order.
 * Returns `null` when the offset falls outside every window — that's not a
 * hit at all, distinct from `NoteRuntimeState.Missed` (which is a note that
 * was never pressed in time; see `GameplayEngine.update`).
 */
export function classifyTiming(deltaMs: number, windows: HitWindowsMs = DEFAULT_HIT_WINDOWS_MS): HitJudgment | null {
  const absDeltaMs = Math.abs(deltaMs);
  if (absDeltaMs <= windows.perfect) return HitJudgment.Perfect;
  if (absDeltaMs <= windows.good) return HitJudgment.Good;
  if (absDeltaMs <= windows.ok) return HitJudgment.Ok;
  return null;
}

/**
 * Etapa 6.1's HOPO/tap auto-hit rule: whether `note` can be resolved as a
 * hit by time alone, with no `onFretDown` keypress. This project's
 * `onFretDown` already models "fret + strum" as one atomic event (see
 * `WrongPressResult`'s doc comment — there's no separate strum input to
 * withhold the way a real guitar controller has), so "no new keypress
 * needed" can only mean the gameplay engine judges the note itself, driven
 * by `update()` instead of a player action.
 *
 * - A tap note (`isTap`) is eligible unconditionally — that's the trait
 *   that sets it apart from a HOPO: no preceding note needed at all.
 * - A HOPO note (`isHopo`) is only eligible once the immediately preceding
 *   chart note resolved as `Hit` or `SustainCompleted` (a sustain still
 *   `Holding` doesn't count — see docs/web-port-plan.md, Etapa 6.1) *and*
 *   its fret differs from this one's; hammering onto the same fret isn't a
 *   real hammer-on, it still needs a strum.
 */
export function isAutoHitEligible(note: JudgedNote, previousNote: JudgedNote | null): boolean {
  if (note.isTap) return true;
  if (!note.isHopo || previousNote === null) return false;

  const previousResolvedAsHit =
    previousNote.state === NoteRuntimeState.Hit || previousNote.state === NoteRuntimeState.SustainCompleted;
  return previousResolvedAsHit && previousNote.fret !== note.fret;
}
