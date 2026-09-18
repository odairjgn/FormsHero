// Etapa 6.5's vocal judging rule — the pitch counterpart to
// `judgment.ts`'s timing windows. No C# equivalent (see
// `core/parsing/types.ts`'s `VocalNote` doc comment).

import { hzToMidi } from "../audio/pitchDetection.ts";

/** How close (in semitones) a detected pitch must land to a note's target
 * to count as "in tune". Generous compared to a real vocal coach's ear on
 * purpose: mic latency/noise and a singer's natural portamento sliding into
 * a note make a tight window feel unfair in a way a keyboard press's
 * millisecond timing windows (`judgment.ts`) don't — 2 semitones is a whole
 * tone of slack either side. */
export const DEFAULT_VOCAL_TOLERANCE_SEMITONES = 2;

/** Fraction (0-1) of a note's judged window that must be in tune (or, for a
 * percussion note, simply voiced at all) for it to resolve as a hit rather
 * than a miss — see `VocalGameplayEngine`. Below the halfway point on
 * purpose: unlike a fret's single instantaneous keypress, a sung note is
 * judged continuously, and even a solid performance rarely stays in-window
 * for the entire duration (breath, consonants, sliding into the next
 * syllable) — the plan's spirit is "did you sing this note", not "did you
 * hold pitch-perfect for its whole length". */
export const DEFAULT_VOCAL_HIT_RATIO_THRESHOLD = 0.5;

/** Absolute distance, in semitones, between a detected frequency and a
 * chart note's target MIDI pitch. */
export function semitoneDistance(detectedHz: number, targetMidiPitch: number): number {
  return Math.abs(hzToMidi(detectedHz) - targetMidiPitch);
}

/**
 * Whether a detected pitch counts as "in tune" against a chart note's
 * target — `false` for `null` (no confident pitch detected this frame; see
 * `core/audio/pitchDetection.ts`'s `detectPitchHz`), never a match by
 * default rather than a special case the caller has to remember to check.
 */
export function isInTune(
  detectedHz: number | null,
  targetMidiPitch: number,
  toleranceSemitones: number = DEFAULT_VOCAL_TOLERANCE_SEMITONES,
): boolean {
  if (detectedHz === null) return false;
  return semitoneDistance(detectedHz, targetMidiPitch) <= toleranceSemitones;
}
