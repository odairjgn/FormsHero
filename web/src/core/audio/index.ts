// Public surface of `core/audio` — port of `IAudioPlayer`/`NAudioPlayer`
// onto the Web Audio API (see docs/web-port-plan.md, Etapa 2).

export {
  ALL_AUDIO_LAYERS,
  AudioLayer,
  PlayerState,
  type AudioBufferLike,
  type AudioContextLike,
  type AudioNodeLike,
  type BufferSourceNodeLike,
  type GainNodeLike,
  type SongAudioBuffers,
} from "./types.ts";
export { AudioEngine } from "./audioEngine.ts";
export { loadSongAudioBuffers, type AudioFile, type DecodeAudioData } from "./loadSongAudio.ts";
export { loadAudioEngineForSong } from "./createAudioEngine.ts";

// Etapa 6.5's vocal pitch capture/detection — see docs/web-port-plan.md.
export { DEFAULT_MIN_HZ, DEFAULT_MAX_HZ, detectPitchHz, hzToMidi, midiToHz, type PitchDetectionOptions } from "./pitchDetection.ts";
export { MicPitchSource, type MicPitchSourceOptions } from "./micPitchSource.ts";
