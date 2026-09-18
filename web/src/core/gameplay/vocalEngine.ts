// Etapa 6.5's vocal judging/scoring state machine — the singing counterpart
// to `gameplayEngine.ts`, but driven by one continuous pitch stream instead
// of discrete fret keypresses (there's no equivalent of `onFretDown`/
// `onFretUp`: `update()` is the only way anything happens here, called once
// per frame with whatever `MicPitchSource.getCurrentPitchHz()` returned).
// No C# equivalent (see `core/parsing/types.ts`'s `VocalNote` doc comment).
//
// Reuses `GameplayStats` as-is rather than inventing a parallel "vocal
// stats" shape, so `ui/screens/resultsScreen.ts`, `core/settings/highScores.ts`
// and `app.ts`'s results wiring all work unchanged: `multiplier` still
// reflects the combo multiplier, `wrongPresses` is always 0 (there's no
// "pressed the wrong fret" concept for singing) and `starPower` is always
// inactive/empty (Etapa 6.5 doesn't add a vocal overdrive mechanic).

import type { VocalNote } from "../parsing/types.ts";
import {
  DEFAULT_BASE_POINTS_PER_NOTE,
  DEFAULT_COMBO_MULTIPLIER_THRESHOLDS,
  DEFAULT_ROCK_METER_GAIN_PER_HIT,
  DEFAULT_ROCK_METER_LOSS_PER_MISS,
  DEFAULT_ROCK_METER_START,
  clampRockMeter,
  computeMultiplier,
} from "./scoring.ts";
import { NoteRuntimeState } from "./types.ts";
import type { GameplayStats, VocalGameplayEngineOptions, VocalJudgedNote } from "./types.ts";
import { DEFAULT_VOCAL_HIT_RATIO_THRESHOLD, DEFAULT_VOCAL_TOLERANCE_SEMITONES, isInTune } from "./vocalJudgment.ts";

/**
 * Floor applied to a note's judged window (`max(note.durationMs, this)`) —
 * without it, a very short syllable could close before a single
 * `requestAnimationFrame` tick ever lands inside it, resolving as an
 * automatic miss no matter how well it was sung. 120ms is comfortably more
 * than one frame at any realistic refresh rate (>=8 frames at 60fps) while
 * still short enough not to bleed into the next syllable for a fast vocal
 * line. Only affects *judging*; note rendering still uses the chart's real
 * `durationMs`.
 */
const MIN_JUDGE_WINDOW_MS = 120;

export class VocalGameplayEngine {
  private readonly notes: VocalJudgedNote[];
  private readonly accumulatedGoodMs: number[];
  private readonly accumulatedTotalMs: number[];

  private readonly toleranceSemitones: number;
  private readonly hitRatioThreshold: number;
  private readonly basePointsPerNote: number;
  private readonly comboMultiplierThresholds: readonly number[];
  private readonly rockMeterGainPerHit: number;
  private readonly rockMeterLossPerMiss: number;
  private readonly godMode: boolean;

  private nextPendingIndex = 0;
  private score = 0;
  private combo = 0;
  private longestCombo = 0;
  private notesHit = 0;
  private notesMissed = 0;
  private rockMeter: number;
  /** `update()`'s previous `songTimeMs`, to derive each call's frame
   * duration — same trick `GameplayEngine.update` uses for star power
   * drain. `null` before the first call. */
  private lastUpdateSongTimeMs: number | null = null;

  constructor(notes: readonly VocalNote[], options: VocalGameplayEngineOptions = {}) {
    this.toleranceSemitones = options.toleranceSemitones ?? DEFAULT_VOCAL_TOLERANCE_SEMITONES;
    this.hitRatioThreshold = options.hitRatioThreshold ?? DEFAULT_VOCAL_HIT_RATIO_THRESHOLD;
    this.basePointsPerNote = options.basePointsPerNote ?? DEFAULT_BASE_POINTS_PER_NOTE;
    this.comboMultiplierThresholds = options.comboMultiplierThresholds ?? DEFAULT_COMBO_MULTIPLIER_THRESHOLDS;
    this.rockMeterGainPerHit = options.rockMeterGainPerHit ?? DEFAULT_ROCK_METER_GAIN_PER_HIT;
    this.rockMeterLossPerMiss = options.rockMeterLossPerMiss ?? DEFAULT_ROCK_METER_LOSS_PER_MISS;
    this.rockMeter = clampRockMeter(options.rockMeterStartValue ?? DEFAULT_ROCK_METER_START);
    this.godMode = options.godMode ?? false;

    this.notes = notes.map((note, id) => ({ ...note, id, state: NoteRuntimeState.Pending, hitRatio: 0 }));
    this.accumulatedGoodMs = new Array(this.notes.length).fill(0);
    this.accumulatedTotalMs = new Array(this.notes.length).fill(0);
  }

  /** Every note in chart order, current `state`/`hitRatio` included — for a
   * lyric/pitch-bar renderer to draw from directly. */
  getNotes(): readonly VocalJudgedNote[] {
    return this.notes;
  }

  getStats(): GameplayStats {
    const attempts = this.notesHit + this.notesMissed;
    return {
      score: this.score,
      combo: this.combo,
      longestCombo: this.longestCombo,
      multiplier: computeMultiplier(this.combo, this.comboMultiplierThresholds),
      notesHit: this.notesHit,
      notesMissed: this.notesMissed,
      wrongPresses: 0,
      notesTotal: this.notes.length,
      accuracy: attempts === 0 ? 1 : this.notesHit / attempts,
      rockMeter: this.rockMeter,
      failed: !this.godMode && this.rockMeter <= 0,
      starPower: { available: 0, active: false },
    };
  }

  /**
   * Advances judgment by one frame. `detectedPitchHz` is whatever the mic
   * pitch source detected *right now* (`null` for silence/no confident
   * pitch). Resolves every note whose judged window has fully elapsed
   * (`Hit` if its accumulated `hitRatio` cleared `hitRatioThreshold`,
   * `Missed` otherwise), then feeds this frame's duration into whichever
   * note is now active — at most one at a time, since chart notes don't
   * overlap.
   */
  update(songTimeMs: number, detectedPitchHz: number | null): void {
    const frameMs = this.lastUpdateSongTimeMs === null ? 0 : Math.max(0, songTimeMs - this.lastUpdateSongTimeMs);
    this.lastUpdateSongTimeMs = songTimeMs;

    while (this.nextPendingIndex < this.notes.length) {
      const note = this.notes[this.nextPendingIndex];
      const windowEndMs = note.timeMs + Math.max(note.durationMs, MIN_JUDGE_WINDOW_MS);
      if (songTimeMs < windowEndMs) break;

      this.resolveNote(note);
      this.nextPendingIndex++;
    }

    const active = this.notes[this.nextPendingIndex];
    if (active && songTimeMs >= active.timeMs) this.accumulate(active, frameMs, detectedPitchHz);
  }

  private accumulate(note: VocalJudgedNote, frameMs: number, detectedPitchHz: number | null): void {
    if (frameMs <= 0) return;

    // A percussion/"talkie" syllable (`pitch === null`) has no pitch to
    // match — it's judged on voicing alone, same idea as a fret note that
    // just needs *a* press, not a precisely-timed one, once it's active.
    const inTune = note.pitch === null ? detectedPitchHz !== null : isInTune(detectedPitchHz, note.pitch, this.toleranceSemitones);

    this.accumulatedTotalMs[note.id] += frameMs;
    if (inTune) this.accumulatedGoodMs[note.id] += frameMs;
    note.hitRatio = this.accumulatedGoodMs[note.id] / this.accumulatedTotalMs[note.id];
  }

  private resolveNote(note: VocalJudgedNote): void {
    const hit = note.hitRatio >= this.hitRatioThreshold;
    note.state = hit ? NoteRuntimeState.Hit : NoteRuntimeState.Missed;

    if (hit) {
      this.notesHit++;
      this.combo++;
      this.longestCombo = Math.max(this.longestCombo, this.combo);
      this.rockMeter = clampRockMeter(this.rockMeter + this.rockMeterGainPerHit);
      this.score += this.basePointsPerNote * computeMultiplier(this.combo, this.comboMultiplierThresholds);
    } else {
      this.notesMissed++;
      this.combo = 0;
      this.rockMeter = clampRockMeter(this.rockMeter - this.rockMeterLossPerMiss);
    }
  }
}
