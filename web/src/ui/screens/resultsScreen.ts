// Etapa 4's post-song screen — score final, % de acerto, maior combo, per
// docs/web-port-plan.md's Etapa 4 spec. No C# equivalent: the original
// project never tracked a score to report at all.

import type { Difficult, Part, Song } from "../../core/parsing/index.ts";
import type { GameplayStats } from "../../core/gameplay/index.ts";
import { escapeHtml, songDisplayTitle } from "./formatting.ts";

export interface ResultsCallbacks {
  onPlayAgain(): void;
  onBackToSongSelect(): void;
}

export function renderResultsScreen(
  container: HTMLElement,
  song: Song,
  part: Part,
  difficult: Difficult,
  stats: GameplayStats,
  callbacks: ResultsCallbacks,
): void {
  const accuracyPct = (stats.accuracy * 100).toFixed(1);

  container.innerHTML = `
    <div class="screen results">
      <h1>${escapeHtml(songDisplayTitle(song))}</h1>
      <p>${escapeHtml(part.instrument)} — ${escapeHtml(difficult)}</p>
      <ul class="results-stats">
        <li>Pontuação final: <strong>${stats.score}</strong></li>
        <li>Maior combo: <strong>${stats.longestCombo}</strong></li>
        <li>Acerto: <strong>${accuracyPct}%</strong> (${stats.notesHit}/${stats.notesTotal})</li>
        <li>Erros: <strong>${stats.notesMissed + stats.wrongPresses}</strong></li>
      </ul>
      <button id="again-btn" type="button">Jogar de novo</button>
      <button id="song-select-btn" type="button">Voltar para seleção de música</button>
    </div>
  `;

  container.querySelector<HTMLButtonElement>("#again-btn")!.addEventListener("click", callbacks.onPlayAgain);
  container
    .querySelector<HTMLButtonElement>("#song-select-btn")!
    .addEventListener("click", callbacks.onBackToSongSelect);
}
