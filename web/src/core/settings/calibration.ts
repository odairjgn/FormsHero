// Port of the plan's Etapa 5 "tela de calibração de offset de áudio/input"
// — no C# equivalent, same as the rest of `core/gameplay` (the original
// project never judged timing at all). This is the pure math half: given
// when a metronome click actually played and when the player pressed a key
// in response to each one (both read from the same clock — see
// `calibrationScreen.ts`), compute the steady offset between them.
//
// That offset is deliberately applied only to *judging* input
// (`GameplayEngine.onFretDown`/`onFretUp`/`update`), never to what the note
// highway renders: it models a consistent lag between the audio the player
// hears and the moment their keypress is observed (input device/OS/browser
// latency, or just human reaction bias), not an audio/video sync error — so
// shifting the visuals too would fix nothing and only make notes look
// mistimed against the audio that's actually playing.

/** A tap more than this far (ms) from its nearest beat is almost certainly
 * a missed/extra press, not a genuine attempt at that beat — excluded so
 * one distracted tap doesn't skew the whole result. */
const MAX_MATCH_DISTANCE_MS = 250;

/**
 * Matches each tap to its nearest beat (within `MAX_MATCH_DISTANCE_MS`) and
 * returns the median signed `tap - beat` offset, in milliseconds — a
 * median rather than a mean so one outlier tap (a stumble, a double-press)
 * doesn't drag the result off, the same "robust to a bad sample" reasoning
 * `classifyTiming` gets for free from fixed windows.
 *
 * Returns 0 (no correction) if fewer than `minSamples` taps matched — too
 * little data to trust, e.g. `calibrationScreen.ts` should just keep the
 * previous offset if this returns 0 for an otherwise-suspicious run rather
 * than silently resetting the player's calibration to 0. Both timestamp
 * arrays are expected on the same clock (`AudioContext.currentTime`-based,
 * per `calibrationScreen.ts`), but need not be sorted or equal in length.
 */
export function computeCalibrationOffsetMs(
  beatTimesMs: readonly number[],
  tapTimesMs: readonly number[],
  minSamples = 3,
): number {
  if (beatTimesMs.length === 0 || tapTimesMs.length === 0) return 0;

  const sortedBeats = [...beatTimesMs].sort((a, b) => a - b);
  const offsets: number[] = [];

  for (const tap of tapTimesMs) {
    const nearestBeat = findNearest(sortedBeats, tap);
    if (Math.abs(tap - nearestBeat) <= MAX_MATCH_DISTANCE_MS) offsets.push(tap - nearestBeat);
  }

  if (offsets.length < minSamples) return 0;

  offsets.sort((a, b) => a - b);
  return Math.round(median(offsets));
}

function findNearest(sortedValues: readonly number[], target: number): number {
  let nearest = sortedValues[0];
  let nearestDistance = Math.abs(target - nearest);
  for (const value of sortedValues) {
    const distance = Math.abs(target - value);
    if (distance < nearestDistance) {
      nearest = value;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function median(sortedValues: readonly number[]): number {
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
}
