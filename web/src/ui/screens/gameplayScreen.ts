// Etapa 4's in-song screen — wraps Etapa 3's `GameplayEngine`/`NoteHighway`/
// keyboard input against Etapa 2's `AudioEngine` clock. This is the same
// wiring the pre-Etapa-4 playtest harness (`src/main.ts`) used directly,
// moved here as a real screen: it now owns knowing when a song has ended
// (`onFinished`) rather than running until the player manually hits Stop.

import { GameplayEngine } from "../../core/gameplay/index.ts";
import type { GameplayStats, HitWindowsMs } from "../../core/gameplay/index.ts";
import type { AudioEngine, AudioLayer } from "../../core/audio/index.ts";
import type { ChartNote } from "../../core/parsing/index.ts";
import { HIT_EFFECT_DURATION_MS, NoteHighway, attachKeyboardFretInput } from "../index.ts";
import type { HitEffect } from "../index.ts";

export interface GameplayScreenOptions {
  readonly audioEngine: AudioEngine;
  readonly notes: readonly ChartNote[];
  /** Stem to mute on a miss/wrong press, Guitar Hero-style — `null` for an
   * instrument with no matching layer (out of MVP scope anyway). */
  readonly instrumentLayer: AudioLayer | null;
  /** Etapa 5 tuning, from `core/settings`: player-adjustable judgment
   * windows and highway scroll speed, defaulted by the caller if omitted. */
  readonly hitWindowsMs?: HitWindowsMs;
  readonly scrollPxPerMs?: number;
  /** Etapa 5 calibration offset (ms), added to the song clock before it's
   * used to judge input — see `core/settings/calibration.ts`'s header
   * comment for why only judging (not rendering) shifts by this. */
  readonly inputOffsetMs?: number;
  onFinished(stats: GameplayStats): void;
  /** Etapa 6.3: called instead of `onFinished` once the rock meter bottoms
   * out (`stats.failed`) — the song stops early rather than playing to the
   * end. `stats` still carries whatever score/combo was reached. */
  onFailed(stats: GameplayStats): void;
  onQuit(): void;
}

/**
 * Starts a playthrough inside `container` and returns a teardown function.
 * The screen tears itself down before calling `onFinished`/`onQuit`, so the
 * returned function only matters if the caller navigates away some other
 * way (e.g. a hard reset) — calling it twice is safe either way.
 */
export function startGameplayScreen(container: HTMLElement, options: GameplayScreenOptions): () => void {
  const { audioEngine, notes, instrumentLayer, hitWindowsMs, scrollPxPerMs, onFinished, onFailed, onQuit } = options;
  const inputOffsetMs = options.inputOffsetMs ?? 0;

  container.innerHTML = `
    <div class="screen gameplay">
      <div id="hud" class="hud"></div>
      <canvas id="note-highway" width="500" height="600"></canvas>
      <button id="quit-btn" type="button">Sair</button>
    </div>
  `;

  const hudEl = container.querySelector<HTMLDivElement>("#hud")!;
  const canvasEl = container.querySelector<HTMLCanvasElement>("#note-highway")!;
  const quitBtn = container.querySelector<HTMLButtonElement>("#quit-btn")!;

  const gameplayEngine = new GameplayEngine(notes, { hitWindowsMs });
  const noteHighway = new NoteHighway(canvasEl, { scrollPxPerMs });
  let hitEffects: HitEffect[] = [];
  let rafHandle = 0;
  let done = false;

  // A song "ends" once both the audio and every chart note are done, since
  // either can outlast the other (a chart with a long outro after the last
  // note, or backing audio that fades out before the last note's sustain).
  const endTimeMs = notes.reduce(
    (max, note) => Math.max(max, note.timeMs + note.sustainMs),
    audioEngine.durationSeconds * 1000,
  );

  function setInstrumentMuted(muted: boolean): void {
    if (instrumentLayer) audioEngine.setMuteState(instrumentLayer, muted);
  }

  // Calibration offset applies only to the time judging sees, never to what
  // the highway renders (see `GameplayScreenOptions.inputOffsetMs`'s doc).
  function judgeTimeMs(): number {
    return audioEngine.currentTime * 1000 + inputOffsetMs;
  }

  const detachKeyboard = attachKeyboardFretInput(window, {
    onFretDown: (fret) => {
      const result = gameplayEngine.onFretDown(fret, judgeTimeMs());
      if (result?.kind === "hit") {
        hitEffects.push({ fret, spawnedAtMs: performance.now() });
        setInstrumentMuted(false); // playing correctly again brings the track back
      } else if (result?.kind === "wrongPress") {
        setInstrumentMuted(true); // no strum bar to buffer it — a stray press is an error, same as missing a note
      }
    },
    onFretUp: (fret) => {
      gameplayEngine.onFretUp(fret, judgeTimeMs());
    },
  });

  function renderHud(stats: GameplayStats): void {
    const accuracyPct = (stats.accuracy * 100).toFixed(1);
    hudEl.textContent =
      `Score: ${stats.score} | Combo: ${stats.combo} (recorde ${stats.longestCombo}) | ` +
      `Multiplicador: x${stats.multiplier} | Acerto: ${accuracyPct}% (${stats.notesHit}/${stats.notesTotal}) | ` +
      `Erros: ${stats.notesMissed + stats.wrongPresses} | Energia: ${stats.rockMeter}%`;
  }

  function teardown(): void {
    cancelAnimationFrame(rafHandle);
    detachKeyboard();
    audioEngine.stop();
  }

  function tick(): void {
    const songTimeMs = audioEngine.currentTime * 1000;
    const newlyMissed = gameplayEngine.update(judgeTimeMs());
    if (newlyMissed.length > 0) setInstrumentMuted(true);

    const now = performance.now();
    hitEffects = hitEffects.filter((effect) => now - effect.spawnedAtMs <= HIT_EFFECT_DURATION_MS);

    const stats = gameplayEngine.getStats();
    noteHighway.render(gameplayEngine.getNotes(), songTimeMs, hitEffects);
    renderHud(stats);

    // Rock meter failure (Etapa 6.3) ends the song early, same as reaching
    // the last note does — checked ahead of the normal end-of-song branch
    // since a failure can happen at any point, not just at the end.
    if (stats.failed) {
      done = true;
      teardown();
      onFailed(stats);
      return;
    }

    if (songTimeMs >= endTimeMs) {
      done = true;
      teardown();
      onFinished(stats);
      return;
    }
    rafHandle = requestAnimationFrame(tick);
  }

  quitBtn.addEventListener("click", () => {
    if (done) return;
    done = true;
    teardown();
    onQuit();
  });

  audioEngine.play(0);
  tick();

  return () => {
    if (done) return;
    done = true;
    teardown();
  };
}
