// The actual browser entry point for Etapa 2 — wires `loadSongAudioBuffers`
// + `AudioEngine` to a real `AudioContext`. Not unit-tested: OGG decoding
// via `decodeAudioData` only exists in a browser, so this is exercised by
// playtesting (per the plan's Etapa 2 "critério de pronto"), not Vitest.

import type { Song } from "../parsing/songLibrary.ts";
import { AudioEngine } from "./audioEngine.ts";
import { loadSongAudioBuffers } from "./loadSongAudio.ts";

/** Port of `NAudioPlayer.LoadSource(Song)`: decodes the song's layers and
 * returns a ready-to-`play()` `AudioEngine` bound to `context`. */
export async function loadAudioEngineForSong(context: AudioContext, song: Song): Promise<AudioEngine> {
  const buffers = await loadSongAudioBuffers(song, (data) => context.decodeAudioData(data));
  return new AudioEngine(context, buffers);
}
