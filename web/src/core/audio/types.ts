// Port of the shapes from `GHCore.Players`/`GHCore.ValueObjects` that the
// audio engine needs (`IAudioPlayer`, `AudioLayer`, `PlayerState`). See
// docs/web-port-plan.md, Etapa 2.
//
// The Web Audio primitives (`AudioContextLike`/`GainNodeLike`/
// `BufferSourceNodeLike`/`AudioBufferLike`) are narrowed to only the members
// `AudioEngine` actually calls — same pattern as `parsing/songLibrary.ts`'s
// `SongFile`. A real `AudioContext`/`GainNode`/`AudioBufferSourceNode`/
// `AudioBuffer` satisfies them structurally, so production code passes the
// real DOM objects straight in while tests supply small fakes (no jsdom or
// browser needed).

/** Port of `GHCore.ValueObjects.AudioLayer`, same `const`-object pattern as
 * `GameInstrument`/`Difficult` in `parsing/types.ts` (enum has non-erasable
 * runtime emit, which this tsconfig's `erasableSyntaxOnly` forbids). Order
 * matches the C# enum. */
export const AudioLayer = {
  Song: "Song",
  Guitar: "Guitar",
  Drums: "Drums",
  Rhythm: "Rhythm",
} as const;
export type AudioLayer = (typeof AudioLayer)[keyof typeof AudioLayer];

export const ALL_AUDIO_LAYERS: readonly AudioLayer[] = Object.values(AudioLayer);

/** Port of `GHCore.ValueObjects.PlayerState`. */
export const PlayerState = {
  Stopped: "Stopped",
  Playing: "Playing",
  Paused: "Paused",
} as const;
export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

/** A decoded stem — what `AudioContext.decodeAudioData()` resolves to. */
export interface AudioBufferLike {
  readonly duration: number;
}

/** What `AudioBufferSourceNode.connect()`/`GainNode.connect()` accept —
 * left unconstrained so both a `GainNode` and an `AudioDestinationNode`
 * (or a test fake standing in for either) satisfy it. */
export type AudioNodeLike = object;

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: { value: number };
  connect(destination: AudioNodeLike): void;
}

/** One-shot, matching real `AudioBufferSourceNode`: once `stop()`ped it
 * can't be `start()`ed again — `AudioEngine` creates a fresh one per
 * `play()`/`resume()`. */
export interface BufferSourceNodeLike {
  buffer: AudioBufferLike | null;
  connect(destination: AudioNodeLike): void;
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
}

export interface AudioContextLike {
  readonly currentTime: number;
  readonly destination: AudioNodeLike;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceNodeLike;
}

/** One decoded buffer per layer the song has on disk; `null` for a layer
 * it doesn't (mirrors `Song`'s own `null`-when-missing layer getters, e.g.
 * `Song.DrumsLayer`). */
export type SongAudioBuffers = Record<AudioLayer, AudioBufferLike | null>;
