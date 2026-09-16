// Etapa 4's screen router — replaces the single-screen playtest harness
// `src/main.ts` used to be (see docs/web-port-plan.md, Etapa 4: "Fluxo de
// telas"). Owns the one `AudioContext`/`AudioEngine` per loaded song and
// whichever screen is currently mounted in `container`, so navigating away
// (back, quit mid-song, play again) always leaves things torn down cleanly
// before the next screen renders.

import { Midi } from "@tonejs/midi";
import type { AudioEngine } from "./core/audio/index.ts";
import { AudioLayer, loadAudioEngineForSong } from "./core/audio/index.ts";
import type { GameplayStats } from "./core/gameplay/index.ts";
import {
  GameInstrument,
  extractChartNotes,
  getPlayableMidiFile,
  readChartMetadata,
  readSong,
} from "./core/parsing/index.ts";
import type { Difficult, LibrarySongEntry, Part, Song } from "./core/parsing/index.ts";
import {
  renderPreGameScreen,
  renderResultsScreen,
  renderSongSelectScreen,
  startGameplayScreen,
} from "./ui/index.ts";
import { escapeHtml } from "./ui/screens/formatting.ts";

// MVP scope per the plan: guitar/bass only.
const PLAYABLE_INSTRUMENTS: readonly GameInstrument[] = [GameInstrument.Guitar, GameInstrument.Rhythm_Bass];

/** Which `AudioLayer` a played instrument's stem lives on — so a miss can
 * mute the *instrument's own* track, Guitar Hero-style, without touching
 * the backing `Song`/`Drums` layers. */
const AUDIO_LAYER_BY_INSTRUMENT: Partial<Record<GameInstrument, AudioLayer>> = {
  [GameInstrument.Guitar]: AudioLayer.Guitar,
  [GameInstrument.Rhythm_Bass]: AudioLayer.Rhythm,
};

interface LoadedSong {
  readonly song: Song;
  readonly midi: Midi;
  readonly parts: Part[];
  readonly audioEngine: AudioEngine;
}

export function startApp(container: HTMLElement): void {
  let audioContext: AudioContext | null = null;
  let stopActiveGameplay: (() => void) | null = null;

  function leaveGameplay(): void {
    stopActiveGameplay?.();
    stopActiveGameplay = null;
  }

  function showSongSelect(): void {
    leaveGameplay();
    renderSongSelectScreen(container, { onSongChosen: (entry) => void loadSong(entry) });
  }

  async function loadSong(entry: LibrarySongEntry): Promise<void> {
    leaveGameplay();
    container.innerHTML = `<div class="screen"><p class="status">Carregando...</p></div>`;

    try {
      const song = await readSong(entry);
      audioContext ??= new AudioContext();
      const audioEngine = await loadAudioEngineForSong(audioContext, song);

      const midi = new Midi(await getPlayableMidiFile(song).arrayBuffer());
      const parts = readChartMetadata(midi).filter(
        (part) => PLAYABLE_INSTRUMENTS.includes(part.instrument) && part.availableDifficulties.length > 0,
      );

      showPreGame({ song, midi, parts, audioEngine });
    } catch (err) {
      renderLoadError((err as Error).message);
    }
  }

  function renderLoadError(message: string): void {
    container.innerHTML = `
      <div class="screen">
        <p class="status">Erro ao carregar: ${escapeHtml(message)}</p>
        <button id="back-btn" type="button">&larr; Voltar</button>
      </div>
    `;
    container.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", showSongSelect);
  }

  function showPreGame(loaded: LoadedSong): void {
    leaveGameplay();
    renderPreGameScreen(container, loaded.song, loaded.parts, {
      onBack: showSongSelect,
      onStart: (part, difficult) => showGameplay(loaded, part, difficult),
    });
  }

  function showGameplay(loaded: LoadedSong, part: Part, difficult: Difficult): void {
    const notes = extractChartNotes(loaded.midi, part.index, difficult);
    stopActiveGameplay = startGameplayScreen(container, {
      audioEngine: loaded.audioEngine,
      notes,
      instrumentLayer: AUDIO_LAYER_BY_INSTRUMENT[part.instrument] ?? null,
      onFinished: (stats) => {
        stopActiveGameplay = null;
        showResults(loaded, part, difficult, stats);
      },
      onQuit: () => {
        stopActiveGameplay = null;
        showPreGame(loaded);
      },
    });
  }

  function showResults(loaded: LoadedSong, part: Part, difficult: Difficult, stats: GameplayStats): void {
    renderResultsScreen(container, loaded.song, part, difficult, stats, {
      onPlayAgain: () => showGameplay(loaded, part, difficult),
      onBackToSongSelect: showSongSelect,
    });
  }

  showSongSelect();
}
