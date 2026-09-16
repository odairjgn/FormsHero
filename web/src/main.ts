// Playtest harness — port of the role `Form1` plays in the C# project (a
// debug rig, not the real game UI): pick a song folder, decode its layers
// with `AudioEngine` (Etapa 2), pick a guitar/bass part+difficulty and play
// it with the `GameplayEngine`/`NoteHighway`/keyboard input (Etapa 3),
// manually verifying "sensação de jogo" per docs/web-port-plan.md's Etapa 3
// "critério de pronto". The real song-select/pre-game flow is Etapa 4.

import { Midi } from "@tonejs/midi";
import { GameplayEngine } from "./core/gameplay/index.ts";
import type { GameplayStats } from "./core/gameplay/index.ts";
import {
  Difficult,
  GameInstrument,
  buildSongLibrary,
  extractChartNotes,
  getPlayableMidiFile,
  readChartMetadata,
  readSong,
} from "./core/parsing/index.ts";
import type { LibrarySongEntry, Part, Song, SongFolderNode, SongLibraryEntry } from "./core/parsing/index.ts";
import { ALL_AUDIO_LAYERS, AudioLayer, PlayerState, loadAudioEngineForSong } from "./core/audio/index.ts";
import type { AudioEngine } from "./core/audio/index.ts";
import { HIT_EFFECT_DURATION_MS, NoteHighway, attachKeyboardFretInput } from "./ui/index.ts";
import type { HitEffect } from "./ui/index.ts";

// MVP scope per the plan: guitar/bass only.
const PLAYABLE_INSTRUMENTS: readonly GameInstrument[] = [GameInstrument.Guitar, GameInstrument.Rhythm_Bass];

/** Which `AudioLayer` a played instrument's stem lives on — so a miss can
 * mute the *instrument's own* track, Guitar Hero-style, without touching
 * the backing `Song`/`Drums` layers. */
const AUDIO_LAYER_BY_INSTRUMENT: Partial<Record<GameInstrument, AudioLayer>> = {
  [GameInstrument.Guitar]: AudioLayer.Guitar,
  [GameInstrument.Rhythm_Bass]: AudioLayer.Rhythm,
};

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div style="font-family: sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem;">
    <h1>FormsHero — playtest</h1>
    <p>Selecione uma pasta de biblioteca de músicas (ex.: <code>FormsHero/musica</code>) para carregar um chart e tocar suas camadas de áudio sincronizadas.</p>
    <input id="folder-input" type="file" webkitdirectory multiple />
    <div id="song-list" style="margin-top: 1rem;"></div>
    <div id="player" style="margin-top: 1rem; display: none;">
      <h2 id="song-title"></h2>
      <div>
        <button id="play-btn">Play</button>
        <button id="pause-btn">Pause</button>
        <button id="stop-btn">Stop</button>
        <span id="time-readout" style="margin-left: 1rem; font-family: monospace;">0.00s</span>
      </div>
      <div id="layer-controls" style="margin-top: 0.5rem;"></div>
    </div>
    <div id="gameplay-setup" style="margin-top: 1rem; display: none;">
      <h2>Jogar (Etapa 3)</h2>
      <label>Instrumento/dificuldade: <select id="part-select"></select></label>
      <button id="start-gameplay-btn">Iniciar jogo</button>
      <p style="color: #666; font-size: 0.9em;">Teclas: D F J K L (verde/vermelho/amarelo/azul/laranja)</p>
      <p id="gameplay-status" style="color: #a00;"></p>
    </div>
    <div id="gameplay" style="margin-top: 1rem; display: none;">
      <div id="hud" style="font-family: monospace; margin-bottom: 0.5rem;"></div>
      <canvas id="note-highway" width="500" height="600" style="background: #101018; display: block;"></canvas>
    </div>
    <p id="status" style="color: #a00;"></p>
  </div>
`;

const folderInput = app.querySelector<HTMLInputElement>("#folder-input")!;
const songListEl = app.querySelector<HTMLDivElement>("#song-list")!;
const playerEl = app.querySelector<HTMLDivElement>("#player")!;
const songTitleEl = app.querySelector<HTMLHeadingElement>("#song-title")!;
const layerControlsEl = app.querySelector<HTMLDivElement>("#layer-controls")!;
const timeReadoutEl = app.querySelector<HTMLSpanElement>("#time-readout")!;
const statusEl = app.querySelector<HTMLParagraphElement>("#status")!;

const playBtn = app.querySelector<HTMLButtonElement>("#play-btn")!;
const pauseBtn = app.querySelector<HTMLButtonElement>("#pause-btn")!;
const stopBtn = app.querySelector<HTMLButtonElement>("#stop-btn")!;

const gameplaySetupEl = app.querySelector<HTMLDivElement>("#gameplay-setup")!;
const partSelectEl = app.querySelector<HTMLSelectElement>("#part-select")!;
const startGameplayBtn = app.querySelector<HTMLButtonElement>("#start-gameplay-btn")!;
const gameplayStatusEl = app.querySelector<HTMLParagraphElement>("#gameplay-status")!;
const gameplayEl = app.querySelector<HTMLDivElement>("#gameplay")!;
const hudEl = app.querySelector<HTMLDivElement>("#hud")!;
const canvasEl = app.querySelector<HTMLCanvasElement>("#note-highway")!;

let audioContext: AudioContext | null = null;
let audioEngine: AudioEngine | null = null;
let rafHandle = 0;

let currentMidi: Midi | null = null;
let currentParts: Part[] = [];

let gameplayEngine: GameplayEngine | null = null;
let noteHighway: NoteHighway | null = null;
let detachKeyboard: (() => void) | null = null;
let gameplayRafHandle = 0;
let hitEffects: HitEffect[] = [];
let currentInstrumentLayer: AudioLayer | null = null;
const layerCheckboxes: Partial<Record<AudioLayer, HTMLInputElement>> = {};

folderInput.addEventListener("change", async () => {
  statusEl.textContent = "";
  const files = folderInput.files;
  if (!files || files.length === 0) return;

  const entries: SongLibraryEntry[] = Array.from(files).map((file) => ({
    path: (file as File & { webkitRelativePath: string }).webkitRelativePath,
    file,
  }));

  const library = buildSongLibrary(entries);
  const songEntries = flattenSongs(library);

  if (songEntries.length === 0) {
    statusEl.textContent = "Nenhum song.ini encontrado nessa pasta.";
    songListEl.innerHTML = "";
    return;
  }

  renderSongList(songEntries);
});

function flattenSongs(folder: SongFolderNode): LibrarySongEntry[] {
  const result: LibrarySongEntry[] = [...folder.songs];
  for (const sub of folder.subFolders) result.push(...flattenSongs(sub));
  return result;
}

function renderSongList(songEntries: LibrarySongEntry[]): void {
  songListEl.innerHTML = "";
  const list = document.createElement("ul");
  for (const entry of songEntries) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = entry.name;
    button.addEventListener("click", () => void loadAndShowSong(entry));
    li.appendChild(button);
    list.appendChild(li);
  }
  songListEl.appendChild(list);
}

async function loadAndShowSong(entry: LibrarySongEntry): Promise<void> {
  statusEl.textContent = "Carregando...";
  try {
    const song = await readSong(entry);
    await loadSongIntoEngine(song);
    await loadChartParts(song);
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = `Erro ao carregar: ${(err as Error).message}`;
  }
}

async function loadSongIntoEngine(song: Song): Promise<void> {
  stopGameplay();
  stopPlayback();

  audioContext ??= new AudioContext();
  audioEngine = await loadAudioEngineForSong(audioContext, song);

  songTitleEl.textContent = [song.artist, song.name].filter(Boolean).join(" — ") || song.directoryName;
  playerEl.style.display = "";
  renderLayerControls();
}

/** Parses the song's MIDI once so both the layer picker and `startGameplay`
 * can reuse it — port-adjacent to `SongGamePlayMetaData.ReadMetaData`, but
 * done here (not in `core/parsing`) since it's this harness's job to decide
 * *when* to read the chart, not the parsing layer's. */
async function loadChartParts(song: Song): Promise<void> {
  currentMidi = null;
  currentParts = [];
  gameplaySetupEl.style.display = "none";

  try {
    const midiFile = getPlayableMidiFile(song);
    currentMidi = new Midi(await midiFile.arrayBuffer());
    currentParts = readChartMetadata(currentMidi).filter(
      (part) => PLAYABLE_INSTRUMENTS.includes(part.instrument) && part.availableDifficulties.length > 0,
    );
  } catch {
    currentParts = [];
  }

  renderPartOptions();
}

function renderPartOptions(): void {
  partSelectEl.innerHTML = "";
  for (const part of currentParts) {
    for (const difficult of part.availableDifficulties) {
      const option = document.createElement("option");
      option.value = `${part.index}:${difficult}`;
      option.textContent = `${part.instrument} — ${difficult}`;
      partSelectEl.appendChild(option);
    }
  }

  const hasOptions = partSelectEl.options.length > 0;
  gameplaySetupEl.style.display = "";
  startGameplayBtn.disabled = !hasOptions;
  gameplayStatusEl.textContent = hasOptions ? "" : "Esta música não tem faixa de guitarra/baixo jogável.";
}

function renderLayerControls(): void {
  layerControlsEl.innerHTML = "";
  if (!audioEngine) return;

  for (const layer of ALL_AUDIO_LAYERS) {
    const row = document.createElement("div");
    const available = audioEngine.isLayerAvailable(layer);

    const label = document.createElement("label");
    label.style.marginRight = "0.5rem";
    label.style.opacity = available ? "1" : "0.4";

    const muteCheckbox = document.createElement("input");
    muteCheckbox.type = "checkbox";
    muteCheckbox.disabled = !available;
    muteCheckbox.addEventListener("change", () => audioEngine!.setMuteState(layer, muteCheckbox.checked));
    layerCheckboxes[layer] = muteCheckbox;

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.01";
    volumeSlider.value = "1";
    volumeSlider.disabled = !available;
    volumeSlider.addEventListener("input", () => audioEngine!.setVolume(layer, Number(volumeSlider.value)));

    label.append(muteCheckbox, ` ${layer} (mute) `, volumeSlider);
    row.appendChild(label);
    if (!available) row.append(" — não disponível nesta música");
    layerControlsEl.appendChild(row);
  }
}

playBtn.addEventListener("click", () => {
  if (!audioEngine) return;
  if (audioEngine.playerState === PlayerState.Paused) {
    audioEngine.resume();
  } else {
    audioEngine.play(0);
  }
  startTimeReadout();
});

pauseBtn.addEventListener("click", () => {
  audioEngine?.pause();
});

stopBtn.addEventListener("click", () => {
  stopGameplay();
  stopPlayback();
});

function stopPlayback(): void {
  audioEngine?.stop();
  cancelAnimationFrame(rafHandle);
  timeReadoutEl.textContent = "0.00s";
}

function startTimeReadout(): void {
  cancelAnimationFrame(rafHandle);
  const tick = () => {
    if (audioEngine) timeReadoutEl.textContent = `${audioEngine.currentTime.toFixed(2)}s`;
    rafHandle = requestAnimationFrame(tick);
  };
  tick();
}

startGameplayBtn.addEventListener("click", () => {
  const value = partSelectEl.value;
  if (!value || !currentMidi) return;

  const [trackIndexRaw, difficult] = value.split(":");
  const trackIndex = Number(trackIndexRaw);
  const part = currentParts.find((p) => p.index === trackIndex);
  if (!part) return;

  startGameplay(part, difficult as Difficult);
});

/**
 * Wires Etapa 2's `AudioEngine` and Etapa 3's `GameplayEngine`/
 * `NoteHighway`/keyboard input together against one shared clock
 * (`audioEngine.currentTime`) and starts a fresh playthrough from the top —
 * the plan's Etapa 3 "critério de pronto": play a song start to finish with
 * working score/combo, feel validated by hand.
 */
function startGameplay(part: Part, difficult: Difficult): void {
  if (!currentMidi || !audioEngine) return;

  stopGameplay();
  stopPlayback();

  const notes = extractChartNotes(currentMidi, part.index, difficult);
  gameplayEngine = new GameplayEngine(notes);
  noteHighway = new NoteHighway(canvasEl);
  hitEffects = [];
  currentInstrumentLayer = AUDIO_LAYER_BY_INSTRUMENT[part.instrument] ?? null;
  setInstrumentMuted(false); // a previous playthrough may have left it muted on a miss

  detachKeyboard = attachKeyboardFretInput(window, {
    onFretDown: (fret) => {
      if (!gameplayEngine || !audioEngine) return;
      const result = gameplayEngine.onFretDown(fret, audioEngine.currentTime * 1000);
      if (result) {
        hitEffects.push({ fret, spawnedAtMs: performance.now() });
        setInstrumentMuted(false); // playing correctly again brings the track back
      }
    },
    onFretUp: (fret) => {
      gameplayEngine?.onFretUp(fret, (audioEngine?.currentTime ?? 0) * 1000);
    },
  });

  gameplayEl.style.display = "";
  audioEngine.play(0);
  runGameplayLoop();
}

/**
 * Port of the plan's request to mute the instrument's own audio layer on a
 * miss (and, symmetrically — same as Guitar Hero — bring it back once the
 * player hits correctly again). No-op if the current part's instrument
 * isn't mapped to a layer (e.g. Piano/Vocals, out of MVP scope anyway).
 */
function setInstrumentMuted(muted: boolean): void {
  if (!audioEngine || !currentInstrumentLayer) return;
  audioEngine.setMuteState(currentInstrumentLayer, muted);

  const checkbox = layerCheckboxes[currentInstrumentLayer];
  if (checkbox) checkbox.checked = muted;
}

function runGameplayLoop(): void {
  const tick = () => {
    if (!audioEngine || !gameplayEngine || !noteHighway) return;

    const songTimeMs = audioEngine.currentTime * 1000;
    const newlyMissed = gameplayEngine.update(songTimeMs);
    if (newlyMissed.length > 0) setInstrumentMuted(true);

    const now = performance.now();
    hitEffects = hitEffects.filter((effect) => now - effect.spawnedAtMs <= HIT_EFFECT_DURATION_MS);

    noteHighway.render(gameplayEngine.getNotes(), songTimeMs, hitEffects);
    renderHud(gameplayEngine.getStats());

    if (audioEngine.playerState === PlayerState.Playing) {
      gameplayRafHandle = requestAnimationFrame(tick);
    }
  };
  tick();
}

function renderHud(stats: GameplayStats): void {
  const accuracyPct = (stats.accuracy * 100).toFixed(1);
  hudEl.textContent =
    `Score: ${stats.score} | Combo: ${stats.combo} (recorde ${stats.longestCombo}) | ` +
    `Multiplicador: x${stats.multiplier} | Acerto: ${accuracyPct}% (${stats.notesHit}/${stats.notesTotal})`;
}

function stopGameplay(): void {
  cancelAnimationFrame(gameplayRafHandle);
  detachKeyboard?.();
  detachKeyboard = null;
}
