// Etapa 4's post-song screen — score final, % de acerto, maior combo, per
// docs/web-port-plan.md's Etapa 4 spec. No C# equivalent: the original
// project never tracked a score to report at all.

import type { Difficult, Part, Song } from "../../core/parsing/index.ts";
import type { GameplayStats } from "../../core/gameplay/index.ts";
import type { RecordAttemptResult } from "../../core/settings/index.ts";
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
  record: RecordAttemptResult,
  callbacks: ResultsCallbacks,
): void {
  const accuracyPct = (stats.accuracy * 100).toFixed(1);
  const recordLine = record.isNewRecord
    ? `<p class="new-record">Novo recorde!</p>`
    : `<p>Recorde da música: ${record.best.score} pontos (${(record.best.accuracy * 100).toFixed(1)}%, combo ${record.best.longestCombo})</p>`;

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
      ${recordLine}
      <button id="again-btn" type="button">Jogar de novo</button>
      <button id="song-select-btn" type="button">Voltar para seleção de música</button>
    </div>
  `;

  container.querySelector<HTMLButtonElement>("#again-btn")!.addEventListener("click", callbacks.onPlayAgain);
  container
    .querySelector<HTMLButtonElement>("#song-select-btn")!
    .addEventListener("click", callbacks.onBackToSongSelect);
}
