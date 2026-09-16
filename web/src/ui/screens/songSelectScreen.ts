// Etapa 4's landing screen — port of the role `SongSelect` plays in the C#
// project. Sourced from a user-picked folder (`<input webkitdirectory>`)
// rather than a folder bundled with the app: per docs/web-port-plan.md's
// hard constraint, any Frets on Fire / Clone Hero library works this way,
// not just the songs packaged under `FormsHero/musica`.

import { buildSongLibrary } from "../../core/parsing/index.ts";
import type { LibrarySongEntry, SongFolderNode, SongLibraryEntry } from "../../core/parsing/index.ts";

export interface SongSelectCallbacks {
  onSongChosen(entry: LibrarySongEntry): void;
}

export function renderSongSelectScreen(container: HTMLElement, callbacks: SongSelectCallbacks): void {
  container.innerHTML = `
    <div class="screen">
      <h1>FormsHero</h1>
      <p>Escolha uma pasta de biblioteca de músicas no formato Frets on Fire / Clone Hero
      (ex.: <code>FormsHero/musica</code>) para ver as músicas disponíveis.</p>
      <input id="folder-input" type="file" webkitdirectory multiple />
      <p id="song-select-status" class="status"></p>
      <div id="song-list"></div>
    </div>
  `;

  const folderInput = container.querySelector<HTMLInputElement>("#folder-input")!;
  const statusEl = container.querySelector<HTMLParagraphElement>("#song-select-status")!;
  const listEl = container.querySelector<HTMLDivElement>("#song-list")!;

  folderInput.addEventListener("change", () => {
    statusEl.textContent = "";
    listEl.innerHTML = "";
    const files = folderInput.files;
    if (!files || files.length === 0) return;

    const entries: SongLibraryEntry[] = Array.from(files).map((file) => ({
      path: (file as File & { webkitRelativePath: string }).webkitRelativePath,
      file,
    }));

    const songs = flattenSongs(buildSongLibrary(entries));
    if (songs.length === 0) {
      statusEl.textContent = "Nenhum song.ini encontrado nessa pasta.";
      return;
    }

    renderList(songs);
  });

  function renderList(songs: LibrarySongEntry[]): void {
    const ul = document.createElement("ul");
    ul.className = "song-list";
    for (const entry of songs) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = entry.name;
      button.addEventListener("click", () => callbacks.onSongChosen(entry));
      li.appendChild(button);
      ul.appendChild(li);
    }
    listEl.appendChild(ul);
  }
}

/** Songs can sit in nested subfolders (e.g. grouped by pack/setlist) —
 * flatten the whole tree into one pickable list, same as the harness did. */
function flattenSongs(folder: SongFolderNode): LibrarySongEntry[] {
  const result: LibrarySongEntry[] = [...folder.songs];
  for (const sub of folder.subFolders) result.push(...flattenSongs(sub));
  return result;
}
