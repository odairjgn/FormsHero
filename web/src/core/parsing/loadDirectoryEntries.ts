// Test-only helper — not imported by any app code (main.ts). Recursively
// reads a real directory on disk into the `SongLibraryEntry[]` shape the
// browser would produce from `<input webkitdirectory>` or a File System
// Access API walk, so `buildSongLibrary`/`readSong` can be exercised
// against the real songs in `FormsHero/musica/` without a browser.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { SongLibraryEntry } from "./songLibrary.ts";

export function loadDirectoryEntries(rootDir: string): SongLibraryEntry[] {
  const entries: SongLibraryEntry[] = [];

  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const fullPath = join(dir, name);

      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else {
        const path = relative(rootDir, fullPath).split(sep).join("/");
        entries.push({ path, file: new File([readFileSync(fullPath)], name) });
      }
    }
  };

  walk(rootDir);
  return entries;
}
