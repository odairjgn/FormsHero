// Etapa 6.6's local multiplayer screen — two players on one keyboard, each
// with their own instrument/difficulty, note highway and score/combo, per
// docs/web-port-plan.md's Etapa 6.6 spec: "`gameplayEngine.ts` já é uma
// classe/factory por instância — instanciar duas... deve funcionar sem
// mudar o engine em si", both driven off the same `AudioEngine` clock
// (Etapa 2's shared `audioEngine.currentTime`) so neither player's judging
// can drift from the other's. Deliberately a sibling of
// `gameplayScreen.ts` rather than a generalization of it — sharing a single
// implementation for 1 and 2 players would need every call site to thread
// an array through for the common case of exactly one, for no benefit this
// screen doesn't already get by duplicating the (short) tick-loop wiring.

import { GameplayEngine } from "../../core/gameplay/index.ts";
import type { GameplayStats, HitWindowsMs } from "../../core/gameplay/index.ts";
import type { AudioEngine, AudioLayer } from "../../core/audio/index.ts";
import type { ChartNote } from "../../core/parsing/index.ts";
import { HIT_EFFECT_DURATION_MS, NoteHighway, attachKeyboardFretInput, formatKeyCode } from "../index.ts";
import type { HitEffect } from "../index.ts";

/** One player's slice of a multiplayer playthrough — everything
 * `startGameplayScreen` takes for a solo game, minus the pieces
 * (`audioEngine`, tuning, `godMode`) that are shared session-wide and live
 * on `MultiplayerGameplayScreenOptions` instead. */
export interface PlayerGameplayConfig {
  readonly label: string;
  readonly notes: readonly ChartNote[];
  readonly instrumentLayer: AudioLayer | null;
  readonly isDrums?: boolean;
  readonly fretKeyCodes: readonly string[];
  readonly starPowerKeyCode: string;
}

export interface MultiplayerGameplayScreenOptions {
  readonly audioEngine: AudioEngine;
  readonly players: readonly [PlayerGameplayConfig, PlayerGameplayConfig];
  readonly hitWindowsMs?: HitWindowsMs;
  readonly scrollPxPerMs?: number;
  readonly inputOffsetMs?: number;
  readonly godMode?: boolean;
  onFinished(stats: readonly [GameplayStats, GameplayStats]): void;
  /** Fired instead of `onFinished` as soon as *either* player's rock meter
   * bottoms out — there's no shared "band" meter (each `GameplayEngine`
   * keeps its own, same as a solo game), so one player failing ends the
   * song for both rather than letting the other play on alone. */
  onFailed(stats: readonly [GameplayStats, GameplayStats]): void;
  onQuit(): void;
}

interface PlayerRuntime {
  readonly config: PlayerGameplayConfig;
  readonly engine: GameplayEngine;
  readonly highway: NoteHighway;
  readonly hudEl: HTMLDivElement;
  hitEffects: HitEffect[];
  detachKeyboard: () => void;
}

/**
 * Starts a 2-player playthrough inside `container` and returns a teardown
 * function — same contract as `startGameplayScreen`.
 */
export function startMultiplayerGameplayScreen(
  container: HTMLElement,
  options: MultiplayerGameplayScreenOptions,
): () => void {
  const { audioEngine, players, hitWindowsMs, scrollPxPerMs, godMode, onFinished, onFailed, onQuit } = options;
  const inputOffsetMs = options.inputOffsetMs ?? 0;

  container.innerHTML = `
    <div class="screen gameplay multiplayer">
      <div class="mp-columns">
        <div class="mp-column">
          <div id="hud-0" class="hud"></div>
          <canvas id="note-highway-0" width="360" height="600"></canvas>
        </div>
        <div class="mp-column">
          <div id="hud-1" class="hud"></div>
          <canvas id="note-highway-1" width="360" height="600"></canvas>
        </div>
      </div>
      <button id="quit-btn" type="button">Sair</button>
    </div>
  `;

  const quitBtn = container.querySelector<HTMLButtonElement>("#quit-btn")!;

  const runtimes: [PlayerRuntime, PlayerRuntime] = players.map((config, i): PlayerRuntime => {
    const canvasEl = container.querySelector<HTMLCanvasElement>(`#note-highway-${i}`)!;
    const hudEl = container.querySelector<HTMLDivElement>(`#hud-${i}`)!;
    const engine = new GameplayEngine(config.notes, { hitWindowsMs, godMode });
    const highway = new NoteHighway(canvasEl, { scrollPxPerMs, isDrums: config.isDrums });

    const runtime: PlayerRuntime = { config, engine, highway, hudEl, hitEffects: [], detachKeyboard: () => {} };

    runtime.detachKeyboard = attachKeyboardFretInput(
      window,
      {
        onFretDown: (fret) => {
          const result = engine.onFretDown(fret, judgeTimeMs());
          if (result?.kind === "hit") {
            runtime.hitEffects.push({ fret, spawnedAtMs: performance.now() });
            setInstrumentMuted(runtime, false);
          } else if (result?.kind === "wrongPress") {
            setInstrumentMuted(runtime, true);
          }
        },
        onFretUp: (fret) => {
          engine.onFretUp(fret, judgeTimeMs());
        },
        onActivateStarPower: () => {
          engine.activateStarPower();
        },
      },
      config.fretKeyCodes,
      config.starPowerKeyCode,
    );

    return runtime;
  }) as [PlayerRuntime, PlayerRuntime];

  let rafHandle = 0;
  let done = false;

  // Same "either clock can outlast the other" reasoning as
  // `gameplayScreen.ts`'s `endTimeMs`, extended across both players' charts
  // — the song only ends once the audio and every note, for both players,
  // are done.
  const endTimeMs = players.reduce(
    (max, player) => player.notes.reduce((m, note) => Math.max(m, note.timeMs + note.sustainMs), max),
    audioEngine.durationSeconds * 1000,
  );

  function judgeTimeMs(): number {
    return audioEngine.currentTime * 1000 + inputOffsetMs;
  }

  function setInstrumentMuted(runtime: PlayerRuntime, muted: boolean): void {
    if (runtime.config.instrumentLayer) audioEngine.setMuteState(runtime.config.instrumentLayer, muted);
  }

  function renderHud(runtime: PlayerRuntime, stats: GameplayStats): void {
    const accuracyPct = (stats.accuracy * 100).toFixed(1);
    const starPowerText = stats.starPower.active
      ? `ATIVO (${Math.round(stats.starPower.available)}%)`
      : `${Math.round(stats.starPower.available)}%`;
    runtime.hudEl.textContent =
      `${runtime.config.label}\n` +
      `Score: ${stats.score} | Combo: ${stats.combo} (recorde ${stats.longestCombo}) | Mult: x${stats.multiplier}\n` +
      `Acerto: ${accuracyPct}% (${stats.notesHit}/${stats.notesTotal}) | Erros: ${stats.notesMissed + stats.wrongPresses} | ` +
      `Energia: ${stats.rockMeter}%\n` +
      `Star Power: ${starPowerText} (${formatKeyCode(runtime.config.starPowerKeyCode)})` +
      (godMode ? " | GOD MODE" : "");
  }

  function teardown(): void {
    cancelAnimationFrame(rafHandle);
    for (const runtime of runtimes) runtime.detachKeyboard();
    audioEngine.stop();
  }

  function currentStats(): [GameplayStats, GameplayStats] {
    return [runtimes[0].engine.getStats(), runtimes[1].engine.getStats()];
  }

  function tick(): void {
    const songTimeMs = audioEngine.currentTime * 1000;
    const now = performance.now();

    for (const runtime of runtimes) {
      const newlyMissed = runtime.engine.update(judgeTimeMs());
      if (newlyMissed.length > 0) setInstrumentMuted(runtime, true);

      runtime.hitEffects = runtime.hitEffects.filter((effect) => now - effect.spawnedAtMs <= HIT_EFFECT_DURATION_MS);

      const stats = runtime.engine.getStats();
      runtime.highway.render(runtime.engine.getNotes(), songTimeMs, runtime.hitEffects, stats.starPower.active);
      renderHud(runtime, stats);
    }

    const stats = currentStats();
    if (stats.some((s) => s.failed)) {
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
