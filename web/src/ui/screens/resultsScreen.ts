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

/** One player's result block. Etapa 6.6 generalized this screen from a
 * single (part, difficult, stats, record) tuple to a list of these, so a
 * 2-player playthrough can show both results side by side without a
 * separate multiplayer-only results screen — `label` is only shown when
 * there's more than one entry (see `renderResultsScreen`), so the
 * single-player look is unchanged. */
export interface ResultEntry {
  readonly part: Part;
  readonly difficult: Difficult;
  readonly stats: GameplayStats;
  readonly record: RecordAttemptResult;
  readonly label?: string;
}

export function renderResultsScreen(
  container: HTMLElement,
  song: Song,
  entries: readonly ResultEntry[],
  /** Etapa 6.3: true when this playthrough ended via `onFailed` (some
   * entry's rock meter bottomed out) rather than reaching the end of the
   * song. */
  failed: boolean,
  callbacks: ResultsCallbacks,
): void {
  const failureLine = failed ? `<p class="failure">Você falhou a música.</p>` : "";
  const showLabels = entries.length > 1;
  const entriesHtml = entries.map((entry) => renderEntry(entry, showLabels)).join("");

  container.innerHTML = `
    <div class="screen results">
      <h1>${escapeHtml(songDisplayTitle(song))}</h1>
      ${failureLine}
      ${entriesHtml}
      <button id="again-btn" type="button">Jogar de novo</button>
      <button id="song-select-btn" type="button">Voltar para seleção de música</button>
    </div>
  `;

  container.querySelector<HTMLButtonElement>("#again-btn")!.addEventListener("click", callbacks.onPlayAgain);
  container
    .querySelector<HTMLButtonElement>("#song-select-btn")!
    .addEventListener("click", callbacks.onBackToSongSelect);
}

function renderEntry(entry: ResultEntry, showLabel: boolean): string {
  const { part, difficult, stats, record, label } = entry;
  const accuracyPct = (stats.accuracy * 100).toFixed(1);
  const recordLine = record.isNewRecord
    ? `<p class="new-record">Novo recorde!</p>`
    : `<p>Recorde da música: ${record.best.score} pontos (${(record.best.accuracy * 100).toFixed(1)}%, combo ${record.best.longestCombo})</p>`;
  const heading = showLabel && label ? `${escapeHtml(label)} — ${escapeHtml(part.instrument)} — ${escapeHtml(difficult)}` : `${escapeHtml(part.instrument)} — ${escapeHtml(difficult)}`;

  return `
    <section class="results-entry">
      <p class="results-entry-heading">${heading}</p>
      <ul class="results-stats">
        <li>Pontuação final: <strong>${stats.score}</strong></li>
        <li>Maior combo: <strong>${stats.longestCombo}</strong></li>
        <li>Acerto: <strong>${accuracyPct}%</strong> (${stats.notesHit}/${stats.notesTotal})</li>
        <li>Erros: <strong>${stats.notesMissed + stats.wrongPresses}</strong></li>
      </ul>
      ${recordLine}
    </section>
  `;
}
