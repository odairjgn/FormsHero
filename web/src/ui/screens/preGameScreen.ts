// Etapa 4's pre-game screen — a dedicated instrument/difficulty picker
// shown *before* a playthrough starts. The C# `Form1` this replaces swaps
// instrument/difficulty live, mid-song, via dropdowns on a debug rig; the
// plan calls for a real pre-game step instead (see docs/web-port-plan.md,
// Etapa 4).

import { Difficult } from "../../core/parsing/index.ts";
import type { Part, Song } from "../../core/parsing/index.ts";
import type { HighScoreEntry } from "../../core/settings/index.ts";
import { escapeHtml, songDisplayTitle } from "./formatting.ts";

export interface PreGameCallbacks {
  onStart(part: Part, difficult: Difficult): void;
  onBack(): void;
  /** Etapa 5's "recordes por música/dificuldade" — looked up per selection
   * rather than passed in bulk, since the caller owns `localStorage` access
   * (see `core/settings/highScores.ts`) and this screen only needs whatever
   * is currently selected. */
  getHighScore(part: Part, difficult: Difficult): HighScoreEntry | null;
}

export function renderPreGameScreen(
  container: HTMLElement,
  song: Song,
  parts: readonly Part[],
  callbacks: PreGameCallbacks,
): void {
  const hasOptions = parts.length > 0;

  container.innerHTML = `
    <div class="screen">
      <button id="back-btn" type="button">&larr; Voltar</button>
      <h1>${escapeHtml(songDisplayTitle(song))}</h1>
      ${
        hasOptions
          ? `
        <label for="part-select">Instrumento/dificuldade:</label>
        <select id="part-select"></select>
        <p id="high-score" class="status"></p>
        <p>Teclas: D F J K L (verde / vermelho / amarelo / azul / laranja)</p>
        <button id="start-btn" type="button">Iniciar jogo</button>
      `
          : `<p class="status">Esta música não tem faixa de guitarra/baixo jogável.</p>`
      }
    </div>
  `;

  container.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", callbacks.onBack);
  if (!hasOptions) return;

  const partSelect = container.querySelector<HTMLSelectElement>("#part-select")!;
  const highScoreEl = container.querySelector<HTMLParagraphElement>("#high-score")!;
  for (const part of parts) {
    for (const difficult of part.availableDifficulties) {
      const option = document.createElement("option");
      option.value = `${part.index}:${difficult}`;
      option.textContent = `${part.instrument} — ${difficult}`;
      partSelect.appendChild(option);
    }
  }

  function selectedPart(): { part: Part; difficult: Difficult } | null {
    const [indexRaw, difficult] = partSelect.value.split(":");
    const part = parts.find((p) => p.index === Number(indexRaw));
    return part ? { part, difficult: difficult as Difficult } : null;
  }

  function renderHighScore(): void {
    const selected = selectedPart();
    const best = selected ? callbacks.getHighScore(selected.part, selected.difficult) : null;
    highScoreEl.textContent = best
      ? `Recorde: ${best.score} pontos (${(best.accuracy * 100).toFixed(1)}% de acerto, combo ${best.longestCombo})`
      : "Sem recorde ainda.";
  }

  partSelect.addEventListener("change", renderHighScore);
  renderHighScore();

  container.querySelector<HTMLButtonElement>("#start-btn")!.addEventListener("click", () => {
    const selected = selectedPart();
    if (selected) callbacks.onStart(selected.part, selected.difficult);
  });
}
