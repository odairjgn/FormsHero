// Port of `GHCore.ValueObjects.Song` and `GHCore.ValueObjects.SongFolder`.
//
// The C# versions walk a `DirectoryInfo` directly. The browser has no
// direct filesystem access — a song library instead arrives as a flat list
// of files with relative paths, exactly what `<input type="file"
// webkitdirectory>` (`File.webkitRelativePath`) or a recursive walk of a
// File System Access API `FileSystemDirectoryHandle` both produce. This
// module builds the same folder/song tree `SongFolder` did, from that flat
// list, then reads one song's `song.ini` the way the `Song` constructor did.

import { parseIni } from "./ini.ts";

/**
 * The minimal file contract this module needs. The DOM `File` (and `Blob`)
 * API satisfies this directly, so a real `File` from a file input or the
 * File System Access API can be passed in as-is.
 */
export interface SongFile {
  readonly name: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * One file from a song library, located by its path relative to the
 * library root, `/`-separated (e.g. `"1.1 Joan Jett.../song.ini"`).
 */
export interface SongLibraryEntry {
  path: string;
  file: SongFile;
}

/** A directory that is not itself a song (port of `SongFolder`). */
export interface SongFolderNode {
  readonly name: string;
  /** Path relative to the library root; `""` for the root folder. */
  readonly path: string;
  readonly subFolders: SongFolderNode[];
  readonly songs: LibrarySongEntry[];
}

/** A directory identified as a song (it directly contains a `song.ini`) —
 * port of `Utils.IsSong`'s "does this directory contain song.ini" check,
 * applied while walking the tree. Not yet parsed; pass to `readSong`. */
export interface LibrarySongEntry {
  readonly name: string;
  readonly path: string;
  /** Files directly inside the song's directory, keyed by lowercase name. */
  readonly files: ReadonlyMap<string, SongFile>;
}

/**
 * Builds the folder/song tree (port of `SongFolder.SubFolders`/`.Songs`)
 * from a flat list of library files. A directory becomes a `LibrarySongEntry`
 * (a leaf, like `Song`) if it directly contains a `song.ini`; otherwise it's
 * a `SongFolderNode` and its subdirectories are walked the same way.
 */
export function buildSongLibrary(entries: SongLibraryEntry[]): SongFolderNode {
  return toFolderNode(buildDirectoryTrie(entries), "", "");
}

interface DirectoryTrieNode {
  files: Map<string, SongFile>;
  children: Map<string, DirectoryTrieNode>;
}

function buildDirectoryTrie(entries: SongLibraryEntry[]): DirectoryTrieNode {
  const root: DirectoryTrieNode = { files: new Map(), children: new Map() };

  for (const { path, file } of entries) {
    const segments = path.split("/").filter((segment) => segment !== "");
    if (segments.length === 0) continue;

    let node = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const name = segments[i];
      let child = node.children.get(name);
      if (!child) {
        child = { files: new Map(), children: new Map() };
        node.children.set(name, child);
      }
      node = child;
    }

    node.files.set(segments[segments.length - 1].toLowerCase(), file);
  }

  return root;
}

function toFolderNode(node: DirectoryTrieNode, name: string, path: string): SongFolderNode {
  const subFolders: SongFolderNode[] = [];
  const songs: LibrarySongEntry[] = [];

  for (const [childName, child] of node.children) {
    const childPath = path === "" ? childName : `${path}/${childName}`;

    if (child.files.has("song.ini")) {
      songs.push({ name: childName, path: childPath, files: child.files });
    } else {
      subFolders.push(toFolderNode(child, childName, childPath));
    }
  }

  return { name, path, subFolders, songs };
}

/** Port of `Song`'s public fields. Layer/MIDI fields are `null` when the
 * file doesn't exist, same as the original's `FileInfo`-or-`null` getters. */
export interface Song {
  readonly directoryName: string;
  readonly directoryPath: string;
  readonly album: string | undefined;
  readonly name: string | undefined;
  readonly year: string | undefined;
  readonly artist: string | undefined;
  readonly coverFile: SongFile | null;
  readonly midiFile: SongFile | null;
  readonly midiUneditedFile: SongFile | null;
  readonly guitarLayer: SongFile | null;
  readonly rhythmLayer: SongFile | null;
  readonly drumsLayer: SongFile | null;
  readonly songLayer: SongFile | null;
  readonly previewLayer: SongFile | null;
}

/**
 * Port of the `Song` constructor (reading `song.ini` and locating the layer
 * files) — async because reading `song.ini`'s text is the one genuinely
 * asynchronous step in the browser.
 */
export async function readSong(entry: LibrarySongEntry): Promise<Song> {
  const iniFile = entry.files.get("song.ini");
  const ini = iniFile ? parseIni(await iniFile.text()) : {};

  return {
    directoryName: entry.name,
    directoryPath: entry.path,
    album: ini["album"],
    name: ini["name"],
    year: ini["year"],
    artist: ini["artist"],
    coverFile: entry.files.get("album.png") ?? entry.files.get("label.png") ?? null,
    midiFile: entry.files.get("notes.mid") ?? null,
    midiUneditedFile: entry.files.get("notes-unedited.mid") ?? null,
    guitarLayer: entry.files.get("guitar.ogg") ?? null,
    rhythmLayer: entry.files.get("rhythm.ogg") ?? null,
    drumsLayer: entry.files.get("drums.ogg") ?? null,
    songLayer: entry.files.get("song.ogg") ?? null,
    previewLayer: entry.files.get("preview.ogg") ?? null,
  };
}

/**
 * Port of `Song.GetMidi()`: `notes-unedited.mid` takes priority over
 * `notes.mid` when both are present. Throws if the song has neither —
 * the original doesn't check `MidiPath` exists either, it just assumes a
 * `song.ini`-bearing folder has a MIDI file somewhere.
 */
export function getPlayableMidiFile(song: Song): SongFile {
  const midi = song.midiUneditedFile ?? song.midiFile;
  if (!midi) {
    throw new Error(`Song "${song.directoryPath}" has neither notes-unedited.mid nor notes.mid`);
  }
  return midi;
}
