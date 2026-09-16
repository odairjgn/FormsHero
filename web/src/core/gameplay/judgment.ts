// New in the web port — no C# equivalent (see types.ts's header comment).
// Port of the plan's Etapa 3 "julgamento de acerto" timing windows.

import { HitJudgment } from "./types.ts";
import type { HitWindowsMs } from "./types.ts";

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
