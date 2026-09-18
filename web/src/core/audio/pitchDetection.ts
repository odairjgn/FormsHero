// Etapa 6.5's pitch estimation — turns one `AnalyserNode` time-domain frame
// into a fundamental frequency, the piece `core/gameplay/vocalJudgment.ts`
// compares against a `VocalNote.pitch`. No C# equivalent: the original only
// ever *played* vocal MIDI notes out to a synth, it never analyzed the
// player's own microphone input (see CLAUDE.md's note on `UserControls.MidiOut`).
//
// Deliberately pure/DOM-free (like `core/gameplay/gameplayEngine.ts`) so it
// can run against a synthetic `Float32Array` in Vitest — no `AudioContext`
// or real microphone needed. The browser-facing half that pulls frames from
// a live `AnalyserNode` is `micPitchSource.ts`, which is not unit-tested for
// the same reason `createAudioEngine.ts` isn't (see that file's header
// comment).

/** Typical singable range this project bothers detecting — below the
 * lowest realistic bass note or above the highest realistic soprano note is
 * almost certainly noise, not a sung pitch. Also bounds the autocorrelation
 * lag search below to a useful window: scanning down to very low
 * frequencies both wastes time and invites octave errors (a low harmonic
 * "winning" over the true, higher fundamental). */
export const DEFAULT_MIN_HZ = 70;
export const DEFAULT_MAX_HZ = 1050;

const DEFAULT_CLARITY_THRESHOLD = 0.9;
const DEFAULT_MIN_RMS = 0.01;

export interface PitchDetectionOptions {
  readonly minHz?: number;
  readonly maxHz?: number;
  /** Minimum normalized autocorrelation strength (0-1) to accept a detected
   * pitch as voiced rather than noise. */
  readonly clarityThreshold?: number;
  /** Minimum RMS amplitude to even attempt detection — below this the frame
   * is treated as silence (no signal at all), same outcome as unvoiced
   * noise: `null`. */
  readonly minRms?: number;
}

/**
 * Estimates the fundamental frequency of `buffer` (one time-domain frame
 * from `AnalyserNode.getFloatTimeDomainData`, samples in `[-1, 1]`) via
 * normalized difference-based autocorrelation — the classic real-time-
 * friendly technique browser pitch tuners use (no FFT needed): for each
 * candidate lag (a period-length guess), score how closely the waveform
 * matches a copy of itself shifted by that lag; the best-scoring lag *is*
 * the fundamental period. Returns `null` when the frame is silent or too
 * noisy/unpitched to call with confidence (below `clarityThreshold`) — a
 * chart's percussion/"talkie" vocal notes are judged on exactly that
 * silence/no-pitch distinction, not a semitone comparison (see
 * `core/gameplay/vocalJudgment.ts`).
 */
export function detectPitchHz(buffer: Float32Array, sampleRate: number, options: PitchDetectionOptions = {}): number | null {
  const minHz = options.minHz ?? DEFAULT_MIN_HZ;
  const maxHz = options.maxHz ?? DEFAULT_MAX_HZ;
  const clarityThreshold = options.clarityThreshold ?? DEFAULT_CLARITY_THRESHOLD;
  const minRms = options.minRms ?? DEFAULT_MIN_RMS;

  if (rootMeanSquare(buffer) < minRms) return null;

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(buffer.length / 2));
  if (minLag < 1 || minLag >= maxLag) return null;

  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    const correlation = normalizedCorrelationAt(buffer, lag);
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag === -1 || bestCorrelation < clarityThreshold) return null;

  const refinedLag = refineLagByParabolicInterpolation(buffer, bestLag, minLag, maxLag);
  return sampleRate / refinedLag;
}

function rootMeanSquare(buffer: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) sumSquares += buffer[i] * buffer[i];
  return Math.sqrt(sumSquares / buffer.length);
}

/** Normalized difference-based autocorrelation at one lag: 1 minus the mean
 * absolute difference between the signal and itself shifted by `lag`, both
 * measured over the same `buffer.length - lag`-sample window so every lag's
 * score is directly comparable. `1` = a perfect match (a true period), `0`
 * (or below) = no similarity at all. */
function normalizedCorrelationAt(buffer: Float32Array, lag: number): number {
  const windowSize = buffer.length - lag;
  let sumAbsDiff = 0;
  for (let i = 0; i < windowSize; i++) sumAbsDiff += Math.abs(buffer[i] - buffer[i + lag]);
  return 1 - sumAbsDiff / windowSize;
}

/** Sub-sample refinement of the winning integer lag via parabolic
 * interpolation over its immediate neighbors' correlation scores — without
 * this, every detected pitch would quantize to one of a few dozen discrete
 * `sampleRate / integerLag` steps, coarse enough to misjudge notes a
 * semitone or more apart from each other at typical sample rates. */
function refineLagByParabolicInterpolation(buffer: Float32Array, lag: number, minLag: number, maxLag: number): number {
  if (lag <= minLag || lag >= maxLag) return lag;

  const before = normalizedCorrelationAt(buffer, lag - 1);
  const at = normalizedCorrelationAt(buffer, lag);
  const after = normalizedCorrelationAt(buffer, lag + 1);
  const denominator = before - 2 * at + after;
  if (denominator === 0) return lag;

  const offset = (0.5 * (before - after)) / denominator;
  return lag + offset;
}

/** Fractional MIDI note number for a detected frequency — A4 (MIDI 69) =
 * 440Hz, standard 12-tone equal temperament. Fractional on purpose: rounding
 * here would throw away the sub-semitone precision `detectPitchHz`'s
 * parabolic interpolation worked to recover, before `vocalJudgment.ts` gets
 * a chance to compare it against a chart note's (integer) target pitch. */
export function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/** Inverse of `hzToMidi`. */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
