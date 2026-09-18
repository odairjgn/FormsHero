// Etapa 4's pre-game screen — a dedicated instrument/difficulty picker
// shown *before* a playthrough starts. The C# `Form1` this replaces swaps
// instrument/difficulty live, mid-song, via dropdowns on a debug rig; the
// plan calls for a real pre-game step instead (see docs/web-port-plan.md,
// Etapa 4).
//
// Etapa 6.6 extended this with an optional second instrument/difficulty
// picker for a local co-op player — the plan's "`preGameScreen.ts` precisa
// de um segundo seletor de instrumento/dificuldade para o jogador 2".
// Vocals is excluded from that second picker (and from being picked
// alongside a second player at all): it runs a completely different
// engine/screen judged by microphone pitch (see `app.ts`'s
// `showVocalGameplay`), which doesn't fit next to a fret-keypress
// `GameplayEngine` in the same synchronized tick loop.

import { Difficult, GameInstrument } from "../../core/parsing/index.ts";
import type { Part, Song } from "../../core/parsing/index.ts";
import type { HighScoreEntry, KeyBindingsSettings, PlayerKeyBindings } from "../../core/settings/index.ts";
import { formatKeyCode } from "../keyboardInput.ts";
import { escapeHtml, songDisplayTitle } from "./formatting.ts";

export interface PlayerSelection {
  readonly part: Part;
  readonly difficult: Difficult;
}

export interface PreGameCallbacks {
  /** `player2` is `null` for a regular solo playthrough — only set when the
   * "multiplayer local" checkbox was on and a second instrument was picked. */
  onStart(player1: PlayerSelection, player2: PlayerSelection | null, godMode: boolean): void;
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
  keyBindings: KeyBindingsSettings,
  callbacks: PreGameCallbacks,
): void {
  const hasOptions = parts.length > 0;
  // Etapa 6.6: vocals can't share a tick loop with a fret-keypress engine
  // (see this file's header comment), so it's the only instrument excluded
  // from the second player's options — and from offering multiplayer at all
  // when it's the *only* thing this song has.
  const coopParts = parts.filter((part) => part.instrument !== GameInstrument.Vocals);
  const canOfferCoop = coopParts.length > 0;

  container.innerHTML = `
    <div class="screen">
      <button id="back-btn" type="button">&larr; Voltar</button>
      <h1>${escapeHtml(songDisplayTitle(song))}</h1>
      ${
        hasOptions
          ? `
        <label for="part-select-0">Jogador 1 — instrumento/dificuldade:</label>
        <select id="part-select-0"></select>
        <p id="high-score-0" class="status"></p>
        <p id="keys-hint-0"></p>

        ${
          canOfferCoop
            ? `
        <label><input type="checkbox" id="coop-check" /> Multiplayer local (2 jogadores)</label>
        <div id="coop-section" style="display: none;">
          <label for="part-select-1">Jogador 2 — instrumento/dificuldade:</label>
          <select id="part-select-1"></select>
          <p id="high-score-1" class="status"></p>
          <p id="keys-hint-1"></p>
        </div>
        `
            : ""
        }

        <label><input type="checkbox" id="god-mode-check" /> God mode (não perde a música)</label>
        <button id="start-btn" type="button">Iniciar jogo</button>
      `
          : `<p class="status">Esta música não tem faixa de guitarra/baixo jogável.</p>`
      }
    </div>
  `;

  container.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", callbacks.onBack);
  if (!hasOptions) return;

  const godModeCheck = container.querySelector<HTMLInputElement>("#god-mode-check")!;
  const player1 = setUpPartPicker(0, parts, keyBindings.player1);
  const coopCheck = container.querySelector<HTMLInputElement>("#coop-check");
  const coopSection = container.querySelector<HTMLDivElement>("#coop-section");
  const player2 = canOfferCoop ? setUpPartPicker(1, coopParts, keyBindings.player2) : null;

  coopCheck?.addEventListener("change", () => {
    if (coopSection) coopSection.style.display = coopCheck.checked ? "block" : "none";
  });

  // Player 1 can still pick vocals for a solo playthrough (it's a valid
  // option in `parts`, just excluded from `coopParts`) — but co-op can't
  // run alongside it (see this file's header comment), so picking vocals
  // as player 1 forces multiplayer back off instead of leaving a
  // now-invalid combination selectable. Checked once up front too, since
  // the browser's default selection (option 0) never fires a "change"
  // event on its own.
  if (coopCheck && coopSection) {
    const syncCoopAvailability = () => {
      const isVocals = player1.selected()?.part.instrument === GameInstrument.Vocals;
      coopCheck.disabled = isVocals;
      if (isVocals && coopCheck.checked) {
        coopCheck.checked = false;
        coopSection.style.display = "none";
      }
    };
    container.querySelector<HTMLSelectElement>("#part-select-0")!.addEventListener("change", syncCoopAvailability);
    syncCoopAvailability();
  }

  function setUpPartPicker(
    playerIndex: 0 | 1,
    options: readonly Part[],
    bindings: PlayerKeyBindings,
  ): { selected(): { part: Part; difficult: Difficult } | null } {
    const select = container.querySelector<HTMLSelectElement>(`#part-select-${playerIndex}`)!;
    const highScoreEl = container.querySelector<HTMLParagraphElement>(`#high-score-${playerIndex}`)!;
    const keysHintEl = container.querySelector<HTMLParagraphElement>(`#keys-hint-${playerIndex}`)!;

    for (const part of options) {
      for (const difficult of part.availableDifficulties) {
        const option = document.createElement("option");
        option.value = `${part.index}:${difficult}`;
        // Etapa 6.5: vocals has no real per-difficulty tiers (see
        // `chartMetadata.ts`'s `availableDifficultiesFor` — `Expert` is a
        // pseudo-value standing in for "the only difficulty it has"), so its
        // label skips the "— Expert" suffix that would otherwise be misleading.
        option.textContent =
          part.instrument === GameInstrument.Vocals ? part.instrument : `${part.instrument} — ${difficult}`;
        select.appendChild(option);
      }
    }

    function selected(): { part: Part; difficult: Difficult } | null {
      const [indexRaw, difficult] = select.value.split(":");
      const part = options.find((p) => p.index === Number(indexRaw));
      return part ? { part, difficult: difficult as Difficult } : null;
    }

    function renderHighScore(): void {
      const current = selected();
      const best = current ? callbacks.getHighScore(current.part, current.difficult) : null;
      highScoreEl.textContent = best
        ? `Recorde: ${best.score} pontos (${(best.accuracy * 100).toFixed(1)}% de acerto, combo ${best.longestCombo})`
        : "Sem recorde ainda.";
    }

    /** Etapa 6.4/6.5/6.6: the input hint depends on the selected instrument
     * *and* this player's configured bindings — drums swap the 5th fret's
     * role for the kick pedal (same key slot, see `DRUM_PEDAL_FRET_INDEX`'s
     * doc comment), vocals uses the microphone instead of the keyboard
     * entirely, and everyone else shows whatever keys `bindings` actually
     * has bound (no longer a hardcoded "D F J K L" string). */
    function renderKeysHint(): void {
      const current = selected();
      const fretLabels = bindings.fretKeyCodes.map(formatKeyCode).join(" ");
      if (current?.part.instrument === GameInstrument.Drums) {
        const [green, red, yellow, blue, pedal] = bindings.fretKeyCodes.map(formatKeyCode);
        keysHintEl.textContent = `Teclas: ${green} ${red} ${yellow} ${blue} (pads) + ${pedal} (pedal)`;
      } else if (current?.part.instrument === GameInstrument.Vocals) {
        keysHintEl.textContent = "Cante no microfone — o jogo vai pedir permissão de acesso a ele.";
      } else {
        keysHintEl.textContent = `Teclas: ${fretLabels} (verde / vermelho / amarelo / azul / laranja)`;
      }
    }

    select.addEventListener("change", () => {
      renderHighScore();
      renderKeysHint();
    });
    renderHighScore();
    renderKeysHint();

    return { selected };
  }

  container.querySelector<HTMLButtonElement>("#start-btn")!.addEventListener("click", () => {
    const p1 = player1.selected();
    if (!p1) return;
    // Defensive re-check of the same rule `syncCoopAvailability` enforces on
    // the checkbox — belt and suspenders against player 1 being vocals ever
    // reaching `callbacks.onStart` alongside a player 2.
    const wantsCoop = (coopCheck?.checked ?? false) && p1.part.instrument !== GameInstrument.Vocals;
    const p2 = wantsCoop ? player2?.selected() ?? null : null;
    callbacks.onStart(p1, p2, godModeCheck.checked);
  });
}
