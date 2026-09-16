// Small DOM/text helpers shared by the Etapa 4 screens.

import type { Song } from "../../core/parsing/index.ts";

/** Port of the `${artist} — ${name}` display title used throughout the
 * playtest harness, falling back to the folder name when `song.ini` left
 * `artist`/`name` blank. */
export function songDisplayTitle(song: Song): string {
  return [song.artist, song.name].filter(Boolean).join(" — ") || song.directoryName;
}

/** Escapes text for safe interpolation into an `innerHTML` template string —
 * every screen builds its markup that way, and song metadata comes from a
 * user-picked `song.ini`, so it can't be trusted as pre-escaped HTML. */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
