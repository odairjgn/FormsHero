// Etapa 2 playtest harness — port of the role `Form1` plays in the C#
// project (a debug rig, not the real game UI): pick a song folder, decode
// its layers with `AudioEngine`, and manually verify the 4 stems stay in
// sync with independent mute/volume, per docs/web-port-plan.md's Etapa 2
// "critério de pronto". The real song-select flow is Etapa 4.

import { buildSongLibrary, readSong } from "./core/parsing/songLibrary.ts";
import type { LibrarySongEntry, Song, SongFolderNode, SongLibraryEntry } from "./core/parsing/songLibrary.ts";
import { ALL_AUDIO_LAYERS, PlayerState, loadAudioEngineForSong } from "./core/audio/index.ts";
import type { AudioEngine } from "./core/audio/index.ts";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div style="font-family: sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem;">
    <h1>FormsHero — Etapa 2 playtest</h1>
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

let audioContext: AudioContext | null = null;
let engine: AudioEngine | null = null;
let rafHandle = 0;

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
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = `Erro ao carregar: ${(err as Error).message}`;
  }
}

async function loadSongIntoEngine(song: Song): Promise<void> {
  stopPlayback();

  audioContext ??= new AudioContext();
  engine = await loadAudioEngineForSong(audioContext, song);

  songTitleEl.textContent = [song.artist, song.name].filter(Boolean).join(" — ") || song.directoryName;
  playerEl.style.display = "";
  renderLayerControls();
}

function renderLayerControls(): void {
  layerControlsEl.innerHTML = "";
  if (!engine) return;

  for (const layer of ALL_AUDIO_LAYERS) {
    const row = document.createElement("div");
    const available = engine.isLayerAvailable(layer);

    const label = document.createElement("label");
    label.style.marginRight = "0.5rem";
    label.style.opacity = available ? "1" : "0.4";

    const muteCheckbox = document.createElement("input");
    muteCheckbox.type = "checkbox";
    muteCheckbox.disabled = !available;
    muteCheckbox.addEventListener("change", () => engine!.setMuteState(layer, muteCheckbox.checked));

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.01";
    volumeSlider.value = "1";
    volumeSlider.disabled = !available;
    volumeSlider.addEventListener("input", () => engine!.setVolume(layer, Number(volumeSlider.value)));

    label.append(muteCheckbox, ` ${layer} (mute) `, volumeSlider);
    row.appendChild(label);
    if (!available) row.append(" — não disponível nesta música");
    layerControlsEl.appendChild(row);
  }
}

playBtn.addEventListener("click", () => {
  if (!engine) return;
  if (engine.playerState === PlayerState.Paused) {
    engine.resume();
  } else {
    engine.play(0);
  }
  startTimeReadout();
});

pauseBtn.addEventListener("click", () => {
  engine?.pause();
});

stopBtn.addEventListener("click", () => {
  stopPlayback();
});

function stopPlayback(): void {
  engine?.stop();
  cancelAnimationFrame(rafHandle);
  timeReadoutEl.textContent = "0.00s";
}

function startTimeReadout(): void {
  cancelAnimationFrame(rafHandle);
  const tick = () => {
    if (engine) timeReadoutEl.textContent = `${engine.currentTime.toFixed(2)}s`;
    rafHandle = requestAnimationFrame(tick);
  };
  tick();
}
