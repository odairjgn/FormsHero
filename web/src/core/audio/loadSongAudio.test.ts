import { describe, expect, it } from "vitest";
import { buildSongLibrary, readSong, type Song, type SongFile } from "../parsing/songLibrary.ts";
import { loadDirectoryEntries } from "../parsing/loadDirectoryEntries.ts";
import { MUSICA_DIR, SONG_DIRS } from "../parsing/musicaFixtures.ts";
import { loadSongAudioBuffers, type DecodeAudioData } from "./loadSongAudio.ts";
import { ALL_AUDIO_LAYERS, AudioLayer } from "./types.ts";

// `Song`'s layer fields are typed as the parsing module's `SongFile`
// (`name`/`text`/`arrayBuffer`), a strict superset of the `AudioFile`
// contract `loadSongAudioBuffers` actually needs — so the stub implements
// the full `SongFile` shape to satisfy `Song`'s field types here, even
// though only `arrayBuffer()` is exercised.
function stubAudioFile(byteLength: number): SongFile {
  return {
    name: "stub",
    text: () => Promise.resolve(""),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(byteLength)),
  };
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    directoryName: "Test Song",
    directoryPath: "Test Song",
    album: undefined,
    name: undefined,
    year: undefined,
    artist: undefined,
    coverFile: null,
    midiFile: null,
    midiUneditedFile: null,
    guitarLayer: null,
    rhythmLayer: null,
    drumsLayer: null,
    songLayer: null,
    previewLayer: null,
    ...overrides,
  };
}

/** Node has no OGG decoder, so this fake only proves the plumbing — which
 * files get read and decoded, and with what bytes. Real decoding is
 * exercised by playtesting in a browser (see `createAudioEngine.ts`). */
function fakeDecodeAudioData(): { decode: DecodeAudioData; callByteLengths: number[] } {
  const callByteLengths: number[] = [];
  const decode: DecodeAudioData = async (data) => {
    callByteLengths.push(data.byteLength);
    return { duration: data.byteLength };
  };
  return { decode, callByteLengths };
}

describe("loadSongAudioBuffers — synthetic song", () => {
  it("decodes every layer file the song has", async () => {
    const song = makeSong({
      songLayer: stubAudioFile(100),
      guitarLayer: stubAudioFile(200),
      rhythmLayer: stubAudioFile(300),
      drumsLayer: stubAudioFile(400),
    });
    const { decode, callByteLengths } = fakeDecodeAudioData();

    const buffers = await loadSongAudioBuffers(song, decode);

    expect(callByteLengths.sort((a, b) => a - b)).toEqual([100, 200, 300, 400]);
    expect(buffers[AudioLayer.Song]?.duration).toBe(100);
    expect(buffers[AudioLayer.Guitar]?.duration).toBe(200);
    expect(buffers[AudioLayer.Rhythm]?.duration).toBe(300);
    expect(buffers[AudioLayer.Drums]?.duration).toBe(400);
  });

  it("leaves a layer null, and skips decoding it, when the song doesn't have that file", async () => {
    const song = makeSong({ songLayer: stubAudioFile(100), guitarLayer: stubAudioFile(200) });
    const { decode, callByteLengths } = fakeDecodeAudioData();

    const buffers = await loadSongAudioBuffers(song, decode);

    expect(callByteLengths).toHaveLength(2);
    expect(buffers[AudioLayer.Drums]).toBeNull();
    expect(buffers[AudioLayer.Rhythm]).toBeNull();
  });

  it("returns all-null buffers, and never calls decode, for a song with no layer files", async () => {
    const { decode, callByteLengths } = fakeDecodeAudioData();

    const buffers = await loadSongAudioBuffers(makeSong(), decode);

    expect(callByteLengths).toHaveLength(0);
    for (const layer of ALL_AUDIO_LAYERS) expect(buffers[layer]).toBeNull();
  });
});

describe("loadSongAudioBuffers — real song library (FormsHero/musica/)", () => {
  it("has all 4 layers ready to decode for every bundled song — the Etapa 2 'critério de pronto'", async () => {
    const tree = buildSongLibrary(loadDirectoryEntries(MUSICA_DIR));
    expect(tree.songs).toHaveLength(8);

    for (const entry of tree.songs) {
      const song = await readSong(entry);
      const { decode, callByteLengths } = fakeDecodeAudioData();

      const buffers = await loadSongAudioBuffers(song, decode);

      expect(callByteLengths, `${song.directoryName} should decode 4 layers`).toHaveLength(4);
      for (const layer of ALL_AUDIO_LAYERS) {
        expect(buffers[layer], `${song.directoryName}'s ${layer} layer`).not.toBeNull();
        expect(buffers[layer]!.duration).toBeGreaterThan(0);
      }
    }
  });

  it("decodes the real Joan Jett guitar layer's actual file bytes", async () => {
    const tree = buildSongLibrary(loadDirectoryEntries(MUSICA_DIR));
    const entry = tree.songs.find((s) => s.name === SONG_DIRS.joanJett)!;
    const song = await readSong(entry);
    const expectedBytes = await song.guitarLayer!.arrayBuffer();

    // Layers decode in parallel (Promise.all), so this returns each one's
    // own byte length as its "duration" instead of writing to a single
    // shared variable, which a concurrent call would just race to overwrite.
    const buffers = await loadSongAudioBuffers(song, async (data) => ({ duration: data.byteLength }));

    expect(buffers[AudioLayer.Guitar]?.duration).toBe(expectedBytes.byteLength);
  });
});
