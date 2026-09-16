// Port of the stem-loading half of `NAudioPlayer.LoadSource(Song)`. See
// docs/web-port-plan.md, Etapa 2.

import type { Song } from "../parsing/songLibrary.ts";
import { ALL_AUDIO_LAYERS, AudioLayer } from "./types.ts";
import type { AudioBufferLike, SongAudioBuffers } from "./types.ts";

/** Minimal contract this module needs from a layer file — the DOM `File`
 * behind `Song.guitarLayer` etc. (see `parsing/songLibrary.ts`'s
 * `SongFile`) satisfies it directly. */
export interface AudioFile {
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** `AudioContext.decodeAudioData`'s shape, narrowed to what this module
 * calls — lets tests inject a fake decoder instead of a real
 * `AudioContext` (there's no OGG decoder available outside a browser). */
export type DecodeAudioData = (data: ArrayBuffer) => Promise<AudioBufferLike>;

const LAYER_ACCESSORS: Record<AudioLayer, (song: Song) => AudioFile | null> = {
  [AudioLayer.Song]: (song) => song.songLayer,
  [AudioLayer.Guitar]: (song) => song.guitarLayer,
  [AudioLayer.Drums]: (song) => song.drumsLayer,
  [AudioLayer.Rhythm]: (song) => song.rhythmLayer,
};

/**
 * Reads and decodes each layer `.ogg` a song has into a `SongAudioBuffers`
 * ready for `new AudioEngine(context, buffers)` — `null` for a layer the
 * song doesn't have, same as `Song`'s own `null`-when-missing layer
 * getters one level up. Layers decode in parallel.
 */
export async function loadSongAudioBuffers(song: Song, decodeAudioData: DecodeAudioData): Promise<SongAudioBuffers> {
  const entries = await Promise.all(
    ALL_AUDIO_LAYERS.map(async (layer): Promise<[AudioLayer, AudioBufferLike | null]> => {
      const file = LAYER_ACCESSORS[layer](song);
      if (!file) return [layer, null];
      return [layer, await decodeAudioData(await file.arrayBuffer())];
    }),
  );

  return Object.fromEntries(entries) as SongAudioBuffers;
}
