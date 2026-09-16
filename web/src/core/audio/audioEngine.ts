// Port of `IAudioPlayer`/`GHCore.PlayerImplementation.NAudioPlayer` onto the
// Web Audio API. See docs/web-port-plan.md, Etapa 2.

import { ALL_AUDIO_LAYERS, AudioLayer, PlayerState } from "./types.ts";
import type { AudioContextLike, BufferSourceNodeLike, GainNodeLike, SongAudioBuffers } from "./types.ts";

interface LayerState {
  buffer: SongAudioBuffers[AudioLayer];
  gain: GainNodeLike;
  source: BufferSourceNodeLike | null;
  volume: number;
  muted: boolean;
}

/**
 * Where the C# original combines up to 4 `OggAudioStream`s into one
 * `WaveMixerStream32` fed to a single `WaveOut`, this creates one
 * `AudioBufferSourceNode` + `GainNode` per layer and starts them all
 * against the *same* `audioContext.currentTime` reference. That shared
 * clock is what keeps the layers in sync — and, per the plan, it's also
 * the master clock the Etapa 3 gameplay engine will judge note hits
 * against (replacing the "two clocks started together" approach of
 * `DryWetMidiPlayer` + `NAudioPlayer`, which can drift).
 *
 * `AudioBufferSourceNode` has no native pause/resume (it's one-shot):
 * `pause()` records the elapsed offset and stops the sources; `resume()`
 * builds fresh ones starting from that offset, referenced against the
 * `AudioContext`'s (still-running) clock — same trick `play()` uses to
 * start from 0.
 *
 * `setVolume`/`setMute` take a 0-1 float rather than the C# `SetVolume`
 * overloads' 0-100 percent, matching `GainNode.gain.value`'s native range;
 * everything else mirrors `IAudioPlayer`'s conceptual shape (per-layer
 * mute/volume, `Play`/`Pause`/`Resume`/`Stop`, a `State`/`PlayerState`).
 */
export class AudioEngine {
  private readonly context: AudioContextLike;
  private readonly layers = new Map<AudioLayer, LayerState>();
  private startedAtContextTime = 0;
  private elapsedOffsetSeconds = 0;
  private state: PlayerState = PlayerState.Stopped;

  constructor(context: AudioContextLike, buffers: SongAudioBuffers) {
    this.context = context;
    for (const layer of ALL_AUDIO_LAYERS) {
      const gain = context.createGain();
      gain.gain.value = 1;
      gain.connect(context.destination);
      this.layers.set(layer, { buffer: buffers[layer], gain, source: null, volume: 1, muted: false });
    }
  }

  get playerState(): PlayerState {
    return this.state;
  }

  /** Duration of the longest available layer, in seconds — 0 if the song
   * has no layers loaded at all. */
  get durationSeconds(): number {
    let max = 0;
    for (const { buffer } of this.layers.values()) {
      if (buffer && buffer.duration > max) max = buffer.duration;
    }
    return max;
  }

  /** Elapsed song time in seconds. Port of `IAudioPlayer.Position`, read
   * from `audioContext.currentTime` instead of `WaveOut.GetPositionTimeSpan()`. */
  get currentTime(): number {
    if (this.state !== PlayerState.Playing) return this.elapsedOffsetSeconds;
    return this.elapsedOffsetSeconds + (this.context.currentTime - this.startedAtContextTime);
  }

  isLayerAvailable(layer: AudioLayer): boolean {
    return this.layers.get(layer)!.buffer !== null;
  }

  /** Port of `NAudioPlayer.Play()`: starts every available layer together
   * from `fromSeconds` (0 for a fresh start). Restarts if already playing. */
  play(fromSeconds = 0): void {
    this.stopActiveSources();
    this.startSourcesFromOffset(fromSeconds);
    this.state = PlayerState.Playing;
  }

  pause(): void {
    if (this.state !== PlayerState.Playing) return;
    this.elapsedOffsetSeconds = this.currentTime;
    this.stopActiveSources();
    this.state = PlayerState.Paused;
  }

  resume(): void {
    if (this.state !== PlayerState.Paused) return;
    this.startSourcesFromOffset(this.elapsedOffsetSeconds);
    this.state = PlayerState.Playing;
  }

  stop(): void {
    this.stopActiveSources();
    this.elapsedOffsetSeconds = 0;
    this.state = PlayerState.Stopped;
  }

  setVolume(layer: AudioLayer, volume: number): void {
    const layerState = this.layers.get(layer)!;
    layerState.volume = volume;
    if (!layerState.muted) layerState.gain.gain.value = volume;
  }

  getVolume(layer: AudioLayer): number {
    return this.layers.get(layer)!.volume;
  }

  /** Port of `NAudioPlayer.SetMuteState` — independent of `setVolume`, so
   * unmuting restores whatever volume was last set. */
  setMuteState(layer: AudioLayer, muted: boolean): void {
    const layerState = this.layers.get(layer)!;
    layerState.muted = muted;
    layerState.gain.gain.value = muted ? 0 : layerState.volume;
  }

  getMuteState(layer: AudioLayer): boolean {
    return this.layers.get(layer)!.muted;
  }

  private startSourcesFromOffset(offsetSeconds: number): void {
    this.startedAtContextTime = this.context.currentTime;
    this.elapsedOffsetSeconds = offsetSeconds;

    for (const layerState of this.layers.values()) {
      const { buffer } = layerState;
      if (!buffer || offsetSeconds >= buffer.duration) continue;

      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(layerState.gain);
      source.start(this.context.currentTime, offsetSeconds);
      layerState.source = source;
    }
  }

  private stopActiveSources(): void {
    for (const layerState of this.layers.values()) {
      if (!layerState.source) continue;
      // A source that already reached the end of its buffer has implicitly
      // stopped itself — Web Audio throws if `stop()` is called on it again.
      try {
        layerState.source.stop();
      } catch {
        /* already stopped */
      }
      layerState.source = null;
    }
  }
}
