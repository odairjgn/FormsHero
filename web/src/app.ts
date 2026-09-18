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
  extractVocalNotes,
  getPlayableMidiFile,
  readChartMetadata,
  readSong,
} from "./core/parsing/index.ts";
import type { Difficult, LibrarySongEntry, Part, Song } from "./core/parsing/index.ts";
import { highScoreKey, loadGameSettings, loadHighScore, recordHighScoreAttempt, saveGameSettings } from "./core/settings/index.ts";
import type { GameSettings } from "./core/settings/index.ts";
import {
  renderPreGameScreen,
  renderResultsScreen,
  renderSettingsScreen,
  renderSongSelectScreen,
  startGameplayScreen,
  startMultiplayerGameplayScreen,
  startVocalGameplayScreen,
} from "./ui/index.ts";
import type { PlayerGameplayConfig, PlayerSelection, ResultEntry } from "./ui/index.ts";
import { escapeHtml } from "./ui/screens/formatting.ts";

// MVP scope was guitar/bass only; Etapa 6.4 adds drums, Etapa 6.5 adds
// vocals (judged completely differently — see `showGameplay`'s branch — but
// still selectable from the same pre-game instrument/difficulty picker).
const PLAYABLE_INSTRUMENTS: readonly GameInstrument[] = [
  GameInstrument.Guitar,
  GameInstrument.Rhythm_Bass,
  GameInstrument.Drums,
  GameInstrument.Vocals,
];

/** Which `AudioLayer` a played instrument's stem lives on — so a miss can
 * mute the *instrument's own* track, Guitar Hero-style, without touching
 * the backing `Song`/other instrument layers. */
const AUDIO_LAYER_BY_INSTRUMENT: Partial<Record<GameInstrument, AudioLayer>> = {
  [GameInstrument.Guitar]: AudioLayer.Guitar,
  [GameInstrument.Rhythm_Bass]: AudioLayer.Rhythm,
  [GameInstrument.Drums]: AudioLayer.Drums,
};

interface LoadedSong {
  readonly song: Song;
  readonly midi: Midi;
  /** The exact bytes `midi` was parsed from — re-read by `extractVocalNotes`
   * for `PART VOCALS`' lyric text (see its header comment for why a second,
   * raw pass over the same bytes is needed at all). */
  readonly midiBytes: ArrayBuffer;
  readonly parts: Part[];
  readonly audioEngine: AudioEngine;
}

export function startApp(container: HTMLElement): void {
  let audioContext: AudioContext | null = null;
  let stopActiveGameplay: (() => void) | null = null;
  // Remembered so "jogar novamente" on the results screen reuses whatever
  // god-mode toggle the player picked on the pre-game screen, instead of
  // silently reverting to off.
  let lastGodMode = false;
  // Etapa 5 tuning/calibration, loaded once and kept in memory — reloaded
  // from `localStorage` only at startup, written back on every save from
  // the settings screen (see `showSettings`).
  let settings: GameSettings = loadGameSettings(window.localStorage);

  function leaveGameplay(): void {
    stopActiveGameplay?.();
    stopActiveGameplay = null;
  }

  function ensureAudioContext(): AudioContext {
    audioContext ??= new AudioContext();
    return audioContext;
  }

  function showSongSelect(): void {
    leaveGameplay();
    renderSongSelectScreen(container, {
      onSongChosen: (entry) => void loadSong(entry),
      onOpenSettings: showSettings,
    });
  }

  function showSettings(): void {
    leaveGameplay();
    renderSettingsScreen(container, ensureAudioContext(), settings, {
      onBack: showSongSelect,
      onSave: (updated) => {
        settings = updated;
        saveGameSettings(window.localStorage, settings);
        showSongSelect();
      },
    });
  }

  async function loadSong(entry: LibrarySongEntry): Promise<void> {
    leaveGameplay();
    container.innerHTML = `<div class="screen"><p class="status">Carregando...</p></div>`;

    try {
      const song = await readSong(entry);
      const audioEngine = await loadAudioEngineForSong(ensureAudioContext(), song);

      const midiBytes = await getPlayableMidiFile(song).arrayBuffer();
      const midi = new Midi(midiBytes);
      const parts = readChartMetadata(midi).filter(
        (part) => PLAYABLE_INSTRUMENTS.includes(part.instrument) && part.availableDifficulties.length > 0,
      );

      showPreGame({ song, midi, midiBytes, parts, audioEngine });
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

  /** Etapa 5's "recordes por música/dificuldade" key — `directoryPath` is
   * stable across reloads of the same library folder (see
   * `core/settings/highScores.ts`'s doc comment on `highScoreKey`). */
  function songHighScoreKey(loaded: LoadedSong, part: Part, difficult: Difficult): string {
    return highScoreKey({ songId: loaded.song.directoryPath, instrument: part.instrument, difficult });
  }

  function showPreGame(loaded: LoadedSong): void {
    leaveGameplay();
    renderPreGameScreen(container, loaded.song, loaded.parts, settings.keyBindings, {
      onBack: showSongSelect,
      onStart: (player1, player2, godMode) => showGameplay(loaded, player1, player2, godMode),
      getHighScore: (part, difficult) => loadHighScore(window.localStorage, songHighScoreKey(loaded, part, difficult)),
    });
  }

  function showGameplay(
    loaded: LoadedSong,
    player1: PlayerSelection,
    player2: PlayerSelection | null,
    godMode: boolean,
  ): void {
    lastGodMode = godMode;

    // Etapa 6.6: a second player picked on the pre-game screen means a
    // 2-player playthrough — `renderPreGameScreen` already excludes vocals
    // from that second picker (see its header comment), so this branch
    // never has to reconcile a vocal `player2` with the fret-keypress
    // engine below.
    if (player2) {
      showMultiplayerGameplay(loaded, player1, player2, godMode);
      return;
    }

    const { part, difficult } = player1;

    // Etapa 6.5: vocals is judged by continuous pitch match, not a fret
    // keypress stream, so it runs an entirely different engine/screen — see
    // `extractVocalNotes`/`VocalGameplayEngine`/`startVocalGameplayScreen`'s
    // header comments for why this can't share `extractChartNotes`/
    // `GameplayEngine`/`startGameplayScreen`.
    if (part.instrument === GameInstrument.Vocals) {
      showVocalGameplay(loaded, player1, godMode);
      return;
    }

    const notes = extractChartNotes(loaded.midi, part.index, difficult, part.instrument);
    stopActiveGameplay = startGameplayScreen(container, {
      audioEngine: loaded.audioEngine,
      notes,
      instrumentLayer: AUDIO_LAYER_BY_INSTRUMENT[part.instrument] ?? null,
      hitWindowsMs: settings.hitWindowsMs,
      scrollPxPerMs: settings.scrollPxPerMs,
      inputOffsetMs: settings.calibrationOffsetMs,
      godMode,
      isDrums: part.instrument === GameInstrument.Drums,
      fretKeyCodes: settings.keyBindings.player1.fretKeyCodes,
      starPowerKeyCode: settings.keyBindings.player1.starPowerKeyCode,
      onFinished: (stats) => {
        stopActiveGameplay = null;
        showResults(loaded, [{ selection: player1, stats }], false, () => showGameplay(loaded, player1, null, lastGodMode));
      },
      onFailed: (stats) => {
        stopActiveGameplay = null;
        showResults(loaded, [{ selection: player1, stats }], true, () => showGameplay(loaded, player1, null, lastGodMode));
      },
      onQuit: () => {
        stopActiveGameplay = null;
        showPreGame(loaded);
      },
    });
  }

  /**
   * Etapa 6.6: two independent `GameplayEngine`s (one per player) driven off
   * the same `AudioEngine` clock — see `multiplayerGameplayScreen.ts`'s
   * header comment for why this is a sibling of `startGameplayScreen`
   * rather than a generalization of it.
   */
  function showMultiplayerGameplay(
    loaded: LoadedSong,
    player1: PlayerSelection,
    player2: PlayerSelection,
    godMode: boolean,
  ): void {
    function toPlayerConfig(selection: PlayerSelection, label: string, bindings: typeof settings.keyBindings.player1): PlayerGameplayConfig {
      return {
        label,
        notes: extractChartNotes(loaded.midi, selection.part.index, selection.difficult, selection.part.instrument),
        instrumentLayer: AUDIO_LAYER_BY_INSTRUMENT[selection.part.instrument] ?? null,
        isDrums: selection.part.instrument === GameInstrument.Drums,
        fretKeyCodes: bindings.fretKeyCodes,
        starPowerKeyCode: bindings.starPowerKeyCode,
      };
    }

    const replay = () => showMultiplayerGameplay(loaded, player1, player2, lastGodMode);

    stopActiveGameplay = startMultiplayerGameplayScreen(container, {
      audioEngine: loaded.audioEngine,
      players: [
        toPlayerConfig(player1, "Jogador 1", settings.keyBindings.player1),
        toPlayerConfig(player2, "Jogador 2", settings.keyBindings.player2),
      ],
      hitWindowsMs: settings.hitWindowsMs,
      scrollPxPerMs: settings.scrollPxPerMs,
      inputOffsetMs: settings.calibrationOffsetMs,
      godMode,
      onFinished: (stats) => {
        stopActiveGameplay = null;
        showResults(
          loaded,
          [
            { selection: player1, stats: stats[0], label: "Jogador 1" },
            { selection: player2, stats: stats[1], label: "Jogador 2" },
          ],
          false,
          replay,
        );
      },
      onFailed: (stats) => {
        stopActiveGameplay = null;
        showResults(
          loaded,
          [
            { selection: player1, stats: stats[0], label: "Jogador 1" },
            { selection: player2, stats: stats[1], label: "Jogador 2" },
          ],
          true,
          replay,
        );
      },
      onQuit: () => {
        stopActiveGameplay = null;
        showPreGame(loaded);
      },
    });
  }

  function showVocalGameplay(loaded: LoadedSong, player: PlayerSelection, godMode: boolean): void {
    const { part } = player;
    const notes = extractVocalNotes(loaded.midi, part.index, loaded.midiBytes);
    stopActiveGameplay = startVocalGameplayScreen(container, {
      audioContext: ensureAudioContext(),
      audioEngine: loaded.audioEngine,
      notes,
      godMode,
      onFinished: (stats) => {
        stopActiveGameplay = null;
        showResults(loaded, [{ selection: player, stats }], false, () => showGameplay(loaded, player, null, lastGodMode));
      },
      onFailed: (stats) => {
        stopActiveGameplay = null;
        showResults(loaded, [{ selection: player, stats }], true, () => showGameplay(loaded, player, null, lastGodMode));
      },
      onQuit: () => {
        stopActiveGameplay = null;
        showPreGame(loaded);
      },
    });
  }

  interface PlayerResult {
    readonly selection: PlayerSelection;
    readonly stats: GameplayStats;
    /** Only set for a multiplayer result — `renderResultsScreen` shows a
     * label per entry only when there's more than one, so a solo result
     * looks exactly as it did before Etapa 6.6. */
    readonly label?: string;
  }

  function showResults(loaded: LoadedSong, results: readonly PlayerResult[], failed: boolean, onPlayAgain: () => void): void {
    const entries: ResultEntry[] = results.map(({ selection, stats, label }) => {
      const record = recordHighScoreAttempt(window.localStorage, songHighScoreKey(loaded, selection.part, selection.difficult), {
        score: stats.score,
        accuracy: stats.accuracy,
        longestCombo: stats.longestCombo,
        achievedAt: new Date().toISOString(),
      });
      return { part: selection.part, difficult: selection.difficult, stats, record, label };
    });

    renderResultsScreen(container, loaded.song, entries, failed, {
      onPlayAgain,
      onBackToSongSelect: showSongSelect,
    });
  }

  showSongSelect();
}
