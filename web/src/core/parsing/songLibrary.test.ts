import { describe, expect, it } from "vitest";
import { loadDirectoryEntries } from "./loadDirectoryEntries.ts";
import { buildSongLibrary, getPlayableMidiFile, readSong, type SongFile, type SongLibraryEntry } from "./songLibrary.ts";
import { MUSICA_DIR, SONG_DIRS } from "./musicaFixtures.ts";

function stubFile(name: string, text = ""): SongFile {
  return {
    name,
    text: () => Promise.resolve(text),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer),
  };
}

function entry(path: string, name = path.slice(path.lastIndexOf("/") + 1)): SongLibraryEntry {
  return { path, file: stubFile(name) };
}

describe("buildSongLibrary — synthetic entries", () => {
  it("treats a directory that directly contains song.ini as a song, not a folder", () => {
    const tree = buildSongLibrary([entry("My Song/song.ini"), entry("My Song/notes.mid")]);

    expect(tree.subFolders).toEqual([]);
    expect(tree.songs).toHaveLength(1);
    expect(tree.songs[0].name).toBe("My Song");
    expect(tree.songs[0].path).toBe("My Song");
    expect(tree.songs[0].files.has("song.ini")).toBe(true);
    expect(tree.songs[0].files.has("notes.mid")).toBe(true);
  });

  it("builds nested SongFolders for directories with no song.ini of their own", () => {
    const tree = buildSongLibrary([
      entry("Rock/Classic Rock/Song A/song.ini"),
      entry("Rock/Classic Rock/Song B/song.ini"),
      entry("Rock/Metal/Song C/song.ini"),
    ]);

    expect(tree.songs).toEqual([]);
    expect(tree.subFolders).toHaveLength(1);

    const rock = tree.subFolders[0];
    expect(rock.name).toBe("Rock");
    expect(rock.songs).toEqual([]);
    expect(rock.subFolders.map((f) => f.name).sort()).toEqual(["Classic Rock", "Metal"]);

    const classicRock = rock.subFolders.find((f) => f.name === "Classic Rock")!;
    expect(classicRock.songs.map((s) => s.name).sort()).toEqual(["Song A", "Song B"]);
  });

  it("does not recurse into a song directory's own subdirectories", () => {
    const tree = buildSongLibrary([entry("My Song/song.ini"), entry("My Song/extras/bonus.txt")]);

    expect(tree.songs).toHaveLength(1);
    expect(tree.subFolders).toEqual([]);
  });

  it("looks up files case-insensitively by name", () => {
    const tree = buildSongLibrary([entry("My Song/Song.ini"), entry("My Song/Notes.MID")]);

    expect(tree.songs[0].files.has("song.ini")).toBe(true);
    expect(tree.songs[0].files.has("notes.mid")).toBe(true);
  });
});

describe("readSong — synthetic entries", () => {
  it("reads album/name/year/artist from song.ini and locates layer files", async () => {
    const songIni = ["[song]", "album = Test Album", "name = Test Song", "year = 1999", "artist = Test Artist"].join(
      "\n",
    );
    const files: SongLibraryEntry[] = [
      { path: "My Song/song.ini", file: stubFile("song.ini", songIni) },
      entry("My Song/notes.mid"),
      entry("My Song/guitar.ogg"),
      entry("My Song/song.ogg"),
    ];

    const tree = buildSongLibrary(files);
    const song = await readSong(tree.songs[0]);

    expect(song.album).toBe("Test Album");
    expect(song.name).toBe("Test Song");
    expect(song.year).toBe("1999");
    expect(song.artist).toBe("Test Artist");
    expect(song.guitarLayer?.name).toBe("guitar.ogg");
    expect(song.songLayer?.name).toBe("song.ogg");
    expect(song.rhythmLayer).toBeNull();
    expect(song.drumsLayer).toBeNull();
  });

  it("prefers album.png over label.png for the cover, and falls back to label.png", async () => {
    const withAlbum = buildSongLibrary([entry("A/song.ini"), entry("A/album.png"), entry("A/label.png")]);
    const song1 = await readSong(withAlbum.songs[0]);
    expect(song1.coverFile?.name).toBe("album.png");

    const labelOnly = buildSongLibrary([entry("B/song.ini"), entry("B/label.png")]);
    const song2 = await readSong(labelOnly.songs[0]);
    expect(song2.coverFile?.name).toBe("label.png");
  });
});

describe("getPlayableMidiFile", () => {
  it("prefers notes-unedited.mid over notes.mid, same priority as Song.GetMidi()", async () => {
    const tree = buildSongLibrary([entry("A/song.ini"), entry("A/notes.mid"), entry("A/notes-unedited.mid")]);
    const song = await readSong(tree.songs[0]);

    expect(getPlayableMidiFile(song).name).toBe("notes-unedited.mid");
  });

  it("falls back to notes.mid when there is no notes-unedited.mid", async () => {
    const tree = buildSongLibrary([entry("A/song.ini"), entry("A/notes.mid")]);
    const song = await readSong(tree.songs[0]);

    expect(getPlayableMidiFile(song).name).toBe("notes.mid");
  });

  it("throws when the song has neither MIDI file", async () => {
    const tree = buildSongLibrary([entry("A/song.ini")]);
    const song = await readSong(tree.songs[0]);

    expect(() => getPlayableMidiFile(song)).toThrow();
  });
});

describe("real song library (FormsHero/musica/)", () => {
  it("finds all 8 bundled songs directly under the root, with correctly-named layer files", async () => {
    const tree = buildSongLibrary(loadDirectoryEntries(MUSICA_DIR));

    expect(tree.subFolders).toEqual([]);
    expect(tree.songs).toHaveLength(8);
    expect(tree.songs.map((s) => s.name).sort()).toEqual(Object.values(SONG_DIRS).sort());

    for (const entryNode of tree.songs) {
      const song = await readSong(entryNode);
      expect(song.artist, `${entryNode.name} should have an artist`).toBeTruthy();
      expect(() => getPlayableMidiFile(song), `${entryNode.name} should resolve a MIDI file`).not.toThrow();
    }
  });

  it("reads the Joan Jett song's metadata and prefers notes.mid (no exact notes-unedited.mid on disk)", async () => {
    const tree = buildSongLibrary(loadDirectoryEntries(MUSICA_DIR));
    const entryNode = tree.songs.find((s) => s.name === SONG_DIRS.joanJett)!;
    const song = await readSong(entryNode);

    expect(song.artist).toBe("Joan Jett And The Blackhearts");
    expect(song.name).toBe("I Love Rock N' Roll");
    // This folder has "notes-unedited-old.mid" (not the exact "notes-unedited.mid"),
    // so it doesn't count as the preferred file — same as the C# original,
    // which only ever checks the exact "notes-unedited.mid" name.
    expect(song.midiUneditedFile).toBeNull();
    expect(getPlayableMidiFile(song).name).toBe("notes.mid");
  });

  it("reads the Boston song, which only has notes-unedited.mid (no notes.mid at all)", async () => {
    const tree = buildSongLibrary(loadDirectoryEntries(MUSICA_DIR));
    const entryNode = tree.songs.find((s) => s.name === SONG_DIRS.boston)!;
    const song = await readSong(entryNode);

    expect(song.midiFile).toBeNull();
    expect(getPlayableMidiFile(song).name).toBe("notes-unedited.mid");
  });
});
