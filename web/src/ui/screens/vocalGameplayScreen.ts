// Etapa 6.5's in-song vocal screen — the singing counterpart to
// `gameplayScreen.ts`: wraps `VocalGameplayEngine`/`VocalHighway` against
// `AudioEngine`'s clock (Etapa 2) the same way, but with a continuous mic
// pitch stream (`MicPitchSource`) instead of keyboard fret input.

import type { AudioEngine } from "../../core/audio/index.ts";
import { MicPitchSource } from "../../core/audio/index.ts";
import { VocalGameplayEngine } from "../../core/gameplay/index.ts";
import type { GameplayStats, VocalJudgedNote } from "../../core/gameplay/index.ts";
import type { VocalNote } from "../../core/parsing/index.ts";
import { VocalHighway } from "../vocalHighway.ts";
import { escapeHtml } from "./formatting.ts";

export interface VocalGameplayScreenOptions {
  /** Same `AudioContext` the caller's `audioEngine` was built against —
   * `MicPitchSource` needs the raw context (for `createMediaStreamSource`/
   * `createAnalyser`), not just the narrowed `AudioContextLike` surface
   * `AudioEngine` itself depends on. */
  readonly audioContext: AudioContext;
  readonly audioEngine: AudioEngine;
  readonly notes: readonly VocalNote[];
  readonly toleranceSemitones?: number;
  readonly godMode?: boolean;
  onFinished(stats: GameplayStats): void;
  onFailed(stats: GameplayStats): void;
  onQuit(): void;
}

/**
 * Starts a vocal playthrough inside `container` and returns a teardown
 * function — same contract as `startGameplayScreen`. Requests microphone
 * permission first; on denial/unavailability, shows an error and a way back
 * rather than hanging the screen (plan's "tratar negação/indisponibilidade
 * com fallback gracioso... sem travar a tela" — there's no meaningful vocal
 * playthrough without a mic to judge, so the graceful fallback here is
 * bailing out cleanly, not a degraded silent mode).
 */
export function startVocalGameplayScreen(container: HTMLElement, options: VocalGameplayScreenOptions): () => void {
  const { audioContext, audioEngine, notes, toleranceSemitones, godMode, onFinished, onFailed, onQuit } = options;

  let torndown = false;
  let rafHandle = 0;
  const micSource = new MicPitchSource(audioContext);

  function teardown(): void {
    if (torndown) return;
    torndown = true;
    cancelAnimationFrame(rafHandle);
    micSource.stop();
    audioEngine.stop();
  }

  function renderMicError(message: string): void {
    container.innerHTML = `
      <div class="screen">
        <p class="status">Não foi possível acessar o microfone: ${escapeHtml(message)}</p>
        <button id="back-btn" type="button">&larr; Voltar</button>
      </div>
    `;
    container.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", () => {
      if (torndown) return;
      torndown = true;
      onQuit();
    });
  }

  micSource
    .start()
    .then(() => startPlaying())
    .catch((err: unknown) => {
      if (torndown) return;
      renderMicError(err instanceof Error ? err.message : String(err));
    });

  function startPlaying(): void {
    if (torndown) return;

    container.innerHTML = `
      <div class="screen gameplay vocal-gameplay">
        <div id="hud" class="hud"></div>
        <canvas id="vocal-highway" width="700" height="320"></canvas>
        <p id="lyric-line" class="lyric-line"></p>
        <button id="quit-btn" type="button">Sair</button>
      </div>
    `;

    const hudEl = container.querySelector<HTMLDivElement>("#hud")!;
    const canvasEl = container.querySelector<HTMLCanvasElement>("#vocal-highway")!;
    const lyricEl = container.querySelector<HTMLParagraphElement>("#lyric-line")!;
    const quitBtn = container.querySelector<HTMLButtonElement>("#quit-btn")!;

    const engine = new VocalGameplayEngine(notes, { toleranceSemitones, godMode });
    const highway = new VocalHighway(canvasEl, engine.getNotes());

    const endTimeMs = notes.reduce(
      (max, note) => Math.max(max, note.timeMs + note.durationMs),
      audioEngine.durationSeconds * 1000,
    );

    function renderHud(stats: GameplayStats): void {
      const accuracyPct = (stats.accuracy * 100).toFixed(1);
      hudEl.textContent =
        `Score: ${stats.score} | Combo: ${stats.combo} (recorde ${stats.longestCombo}) | ` +
        `Multiplicador: x${stats.multiplier} | Acerto: ${accuracyPct}% (${stats.notesHit}/${stats.notesTotal}) | ` +
        `Erros: ${stats.notesMissed} | Energia: ${stats.rockMeter}%` +
        (godMode ? " | GOD MODE" : "");
    }

    function renderLyricLine(judgedNotes: readonly VocalJudgedNote[], songTimeMs: number): void {
      lyricEl.innerHTML = buildLyricLineHtml(judgedNotes, songTimeMs);
    }

    function tick(): void {
      const songTimeMs = audioEngine.currentTime * 1000;
      const detectedPitchHz = micSource.getCurrentPitchHz();
      engine.update(songTimeMs, detectedPitchHz);

      const stats = engine.getStats();
      const judgedNotes = engine.getNotes();
      highway.render(judgedNotes, songTimeMs, detectedPitchHz);
      renderHud(stats);
      renderLyricLine(judgedNotes, songTimeMs);

      if (stats.failed) {
        teardown();
        onFailed(stats);
        return;
      }

      if (songTimeMs >= endTimeMs) {
        teardown();
        onFinished(stats);
        return;
      }

      rafHandle = requestAnimationFrame(tick);
    }

    quitBtn.addEventListener("click", () => {
      if (torndown) return;
      teardown();
      onQuit();
    });

    audioEngine.play(0);
    tick();
  }

  return teardown;
}

/** Etapa 6.5's "letra na tela": the current phrase's syllables joined per
 * `VocalNote.joinsNext` (no space where the chart marks a word continuing
 * into the next syllable), with whichever syllable `songTimeMs` currently
 * falls inside bolded. Falls back to the closest surrounding notes when a
 * chart has no phrase markers (`phraseId` always `null`) rather than
 * showing nothing.
 */
function buildLyricLineHtml(notes: readonly VocalJudgedNote[], songTimeMs: number): string {
  const activeIndex = notes.findIndex((note) => songTimeMs >= note.timeMs && songTimeMs < note.timeMs + note.durationMs);
  const anchorIndex = activeIndex !== -1 ? activeIndex : notes.findIndex((note) => note.timeMs >= songTimeMs);
  if (anchorIndex === -1) return "";

  const phraseId = notes[anchorIndex].phraseId;
  const lineNotes =
    phraseId !== null
      ? notes.filter((note) => note.phraseId === phraseId)
      : notes.slice(Math.max(0, anchorIndex - 3), anchorIndex + 4);

  let html = "";
  for (const note of lineNotes) {
    if (!note.lyric) continue;
    const isActive = activeIndex !== -1 && note.id === notes[activeIndex].id;
    const word = escapeHtml(note.lyric) + (note.joinsNext ? "" : " ");
    html += isActive ? `<strong class="lyric-active">${word}</strong>` : word;
  }
  return html;
}
