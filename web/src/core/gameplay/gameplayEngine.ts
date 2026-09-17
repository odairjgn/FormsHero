// Etapa 3's central piece — "Motor de gameplay (o núcleo pedido, não existe
// hoje)". No C# equivalent (see types.ts's header comment): this is the
// judging/scoring state machine that turns a chart's flat `ChartNote[]`
// (Etapa 1's `extractChartNotes`) plus a stream of fret keypresses,
// timestamped against the shared audio clock (Etapa 2's
// `AudioEngine.currentTime`), into hits, misses, combo and score.
//
// Deliberately framework-agnostic and DOM-free — it doesn't know about
// `requestAnimationFrame`, `KeyboardEvent` or Canvas. The caller (see
// `src/main.ts`) is expected to call `update(songTimeMs)` once per frame and
// `onFretDown`/`onFretUp` from its own keyboard handling; `src/ui` renders
// off `getNotes()`/`getStats()`.

import type { ChartNote } from "../parsing/types.ts";
import { DEFAULT_HIT_WINDOWS_MS, classifyTiming } from "./judgment.ts";
import {
  DEFAULT_BASE_POINTS_PER_NOTE,
  DEFAULT_COMBO_MULTIPLIER_THRESHOLDS,
  DEFAULT_ROCK_METER_GAIN_PER_HIT,
  DEFAULT_ROCK_METER_LOSS_PER_MISS,
  DEFAULT_ROCK_METER_START,
  DEFAULT_SUSTAIN_POINTS_PER_SECOND,
  clampRockMeter,
  computeMultiplier,
  computeSustainPoints,
} from "./scoring.ts";
import { NoteRuntimeState } from "./types.ts";
import type { FretPressResult, GameplayEngineOptions, GameplayStats, HitWindowsMs, JudgedNote } from "./types.ts";

const FRET_COUNT = 5;

interface HoldingNote {
  readonly note: JudgedNote;
  readonly heldSinceMs: number;
}

export class GameplayEngine {
  /** All notes, in original chart (time-sorted) order — what `getNotes()`
   * hands the renderer. */
  private readonly notes: JudgedNote[];
  /** The same notes, bucketed per fret and still time-sorted within each
   * bucket, so judging a keypress only ever has to look at one candidate:
   * `notesByFret[fret][nextPendingIndexByFret[fret]]`. */
  private readonly notesByFret: JudgedNote[][];
  private readonly nextPendingIndexByFret: number[];
  private readonly holding: (HoldingNote | null)[];

  private readonly hitWindowsMs: HitWindowsMs;
  private readonly basePointsPerNote: number;
  private readonly sustainPointsPerSecond: number;
  private readonly comboMultiplierThresholds: readonly number[];
  private readonly rockMeterGainPerHit: number;
  private readonly rockMeterLossPerMiss: number;

  private score = 0;
  private combo = 0;
  private longestCombo = 0;
  private notesHit = 0;
  private notesMissed = 0;
  private wrongPresses = 0;
  private rockMeter: number;

  constructor(chartNotes: readonly ChartNote[], options: GameplayEngineOptions = {}) {
    this.hitWindowsMs = options.hitWindowsMs ?? DEFAULT_HIT_WINDOWS_MS;
    this.basePointsPerNote = options.basePointsPerNote ?? DEFAULT_BASE_POINTS_PER_NOTE;
    this.sustainPointsPerSecond = options.sustainPointsPerSecond ?? DEFAULT_SUSTAIN_POINTS_PER_SECOND;
    this.comboMultiplierThresholds = options.comboMultiplierThresholds ?? DEFAULT_COMBO_MULTIPLIER_THRESHOLDS;
    this.rockMeterGainPerHit = options.rockMeterGainPerHit ?? DEFAULT_ROCK_METER_GAIN_PER_HIT;
    this.rockMeterLossPerMiss = options.rockMeterLossPerMiss ?? DEFAULT_ROCK_METER_LOSS_PER_MISS;
    this.rockMeter = clampRockMeter(options.rockMeterStartValue ?? DEFAULT_ROCK_METER_START);

    this.notes = chartNotes.map((note, id) => ({ ...note, id, state: NoteRuntimeState.Pending, judgment: null }));
    this.notesByFret = Array.from({ length: FRET_COUNT }, () => []);
    for (const note of this.notes) this.notesByFret[note.fret].push(note);
    this.nextPendingIndexByFret = new Array(FRET_COUNT).fill(0);
    this.holding = new Array(FRET_COUNT).fill(null);
  }

  /** Every note in chart order, current `state`/`judgment` included — for
   * the note highway to draw from directly, no extra bookkeeping needed. */
  getNotes(): readonly JudgedNote[] {
    return this.notes;
  }

  getStats(): GameplayStats {
    const attempts = this.notesHit + this.notesMissed + this.wrongPresses;
    return {
      score: this.score,
      combo: this.combo,
      longestCombo: this.longestCombo,
      multiplier: computeMultiplier(this.combo, this.comboMultiplierThresholds),
      notesHit: this.notesHit,
      notesMissed: this.notesMissed,
      wrongPresses: this.wrongPresses,
      notesTotal: this.notes.length,
      accuracy: attempts === 0 ? 1 : this.notesHit / attempts,
      rockMeter: this.rockMeter,
      failed: this.rockMeter <= 0,
    };
  }

  /**
   * Advances time-based state — nothing here reacts to input. Call once per
   * animation frame with the current song time (ms), derived from the same
   * clock `AudioEngine.currentTime` exposes, so judging never drifts from
   * what's audibly playing.
   *
   * Two things can happen purely from time passing: a pending note's OK
   * window fully elapses without a keypress (-> `Missed`, combo broken), or
   * a held sustain plays through to its natural end (-> `SustainCompleted`,
   * same as releasing exactly on time via `onFretUp`).
   *
   * Returns whichever notes were newly marked `Missed` by *this* call (empty
   * if none) — e.g. `src/main.ts` uses this to mute the instrument's audio
   * layer on a miss, Guitar Hero-style. Each note is reported exactly once,
   * the call it times out on.
   */
  update(songTimeMs: number): readonly JudgedNote[] {
    const newlyMissed: JudgedNote[] = [];

    for (let fret = 0; fret < FRET_COUNT; fret++) {
      const queue = this.notesByFret[fret];
      let index = this.nextPendingIndexByFret[fret];
      while (index < queue.length && queue[index].timeMs + this.hitWindowsMs.ok < songTimeMs) {
        this.missNote(queue[index]);
        newlyMissed.push(queue[index]);
        index++;
      }
      this.nextPendingIndexByFret[fret] = index;

      const holding = this.holding[fret];
      if (holding && songTimeMs >= holding.note.timeMs + holding.note.sustainMs) {
        this.completeSustain(fret, holding, holding.note.timeMs + holding.note.sustainMs);
      }
    }

    return newlyMissed;
  }

  /**
   * The plan's central "julgamento de acerto": judges a fret press against
   * that fret's earliest not-yet-judged note. There's no strum bar to
   * buffer a careless press the way a real guitar controller has — this
   * project's input is either a keyboard or a gamepad's face buttons (a PS2
   * controller, say), so a press with nothing to hit is a `WrongPressResult`
   * (breaks combo, no points), not a no-op.
   *
   * The one press that *is* silently ignored is a repeat on a fret already
   * holding a sustain — that's not a player mistake, just this engine's own
   * bookkeeping (see `holding`), so it returns `null` instead.
   */
  onFretDown(fret: number, songTimeMs: number): FretPressResult | null {
    if (this.holding[fret]) return null;

    const queue = this.notesByFret[fret];
    const note = queue[this.nextPendingIndexByFret[fret]];
    const judgment = note ? classifyTiming(songTimeMs - note.timeMs, this.hitWindowsMs) : null;

    if (!note || judgment === null) {
      this.combo = 0;
      this.wrongPresses++;
      this.rockMeter = clampRockMeter(this.rockMeter - this.rockMeterLossPerMiss);
      return { kind: "wrongPress", fret };
    }

    this.nextPendingIndexByFret[fret]++;
    this.notesHit++;
    this.combo++;
    this.longestCombo = Math.max(this.longestCombo, this.combo);
    this.rockMeter = clampRockMeter(this.rockMeter + this.rockMeterGainPerHit);
    const multiplier = computeMultiplier(this.combo, this.comboMultiplierThresholds);
    const pointsAwarded = this.basePointsPerNote * multiplier;
    this.score += pointsAwarded;
    note.judgment = judgment;

    if (note.sustainMs > 0) {
      note.state = NoteRuntimeState.Holding;
      this.holding[fret] = { note, heldSinceMs: songTimeMs };
    } else {
      note.state = NoteRuntimeState.Hit;
    }

    const deltaMs = songTimeMs - note.timeMs;
    return { kind: "hit", noteId: note.id, fret, judgment, deltaMs, pointsAwarded, combo: this.combo, multiplier };
  }

  /**
   * Port of the plan's "soltar antes do fim reduz/quebra a pontuação do
   * sustain": releasing early awards partial sustain points for however
   * long it was actually held, instead of the full amount. This only
   * affects the sustain's own points — the note itself was already scored
   * as a hit in `onFretDown`, so an early release doesn't break the combo.
   */
  onFretUp(fret: number, songTimeMs: number): void {
    const holding = this.holding[fret];
    if (!holding) return;

    const targetEndMs = holding.note.timeMs + holding.note.sustainMs;
    if (songTimeMs >= targetEndMs) {
      this.completeSustain(fret, holding, targetEndMs);
      return;
    }

    holding.note.state = NoteRuntimeState.SustainBroken;
    this.score += computeSustainPoints(songTimeMs - holding.heldSinceMs, this.sustainPointsPerSecond);
    this.holding[fret] = null;
  }

  private completeSustain(fret: number, holding: HoldingNote, heldUntilMs: number): void {
    holding.note.state = NoteRuntimeState.SustainCompleted;
    this.score += computeSustainPoints(heldUntilMs - holding.heldSinceMs, this.sustainPointsPerSecond);
    this.holding[fret] = null;
  }

  private missNote(note: JudgedNote): void {
    note.state = NoteRuntimeState.Missed;
    note.judgment = null;
    this.notesMissed++;
    this.combo = 0;
    this.rockMeter = clampRockMeter(this.rockMeter - this.rockMeterLossPerMiss);
  }
}
