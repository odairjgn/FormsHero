// Etapa 6.5's live microphone half — pulls the player's voice into
// `pitchDetection.ts`'s pure `detectPitchHz`. No C# equivalent: the
// original project never captured audio input at all (see
// `pitchDetection.ts`'s header comment).
//
// Not unit-tested: `getUserMedia`/`MediaStreamAudioSourceNode`/
// `AnalyserNode` only exist in a browser with a real microphone, same
// reasoning as `createAudioEngine.ts` for `decodeAudioData` — exercised by
// manual playtesting instead. Everything it *can* meaningfully unit-test
// (the pitch math itself) already lives in the DOM-free `pitchDetection.ts`.

import type { PitchDetectionOptions } from "./pitchDetection.ts";
import { detectPitchHz } from "./pitchDetection.ts";

export interface MicPitchSourceOptions {
  /** `AnalyserNode.fftSize` — also the time-domain frame length
   * `detectPitchHz` analyzes each call. Must be a power of 2 (Web Audio
   * requirement); defaults to 2048, a good balance for this project's
   * `DEFAULT_MIN_HZ` floor (a shorter frame can't fit even one full period
   * of a low bass note). */
  readonly fftSize?: number;
  readonly pitchOptions?: PitchDetectionOptions;
}

/**
 * Wraps mic capture + pitch analysis behind a tiny pull-based interface: the
 * plan's vocal gameplay screen calls `getCurrentPitchHz()` once per
 * `requestAnimationFrame` tick, the same cadence it already drives
 * `GameplayEngine.update()`/`AudioEngine.currentTime` at for every other
 * instrument — no event stream or callback registration needed.
 *
 * `start()` requests mic permission and can reject (denied, no device,
 * insecure context) — the plan calls for a graceful fallback rather than a
 * hard failure ("tratar negação/indisponibilidade... sem travar a tela"),
 * which is why this doesn't throw from the constructor: a caller can
 * `new` this eagerly and only find out about permission at `start()`,
 * catching that specifically to show a "sem microfone" message instead of
 * blocking the whole screen.
 */
export class MicPitchSource {
  private readonly context: AudioContext;
  private readonly pitchOptions: PitchDetectionOptions;
  private readonly frame: Float32Array<ArrayBuffer>;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;

  constructor(context: AudioContext, options: MicPitchSourceOptions = {}) {
    this.context = context;
    this.pitchOptions = options.pitchOptions ?? {};
    this.frame = new Float32Array(options.fftSize ?? 2048);
  }

  /** True once `start()` has succeeded and `stop()` hasn't been called
   * since — lets the caller tell "no mic yet" apart from "mic granted but
   * momentarily silent" (`getCurrentPitchHz()` returning `null` for both). */
  get isActive(): boolean {
    return this.analyser !== null;
  }

  async start(): Promise<void> {
    // Every raw-signal-mangling browser "helpfulness" feature turned off:
    // echo cancellation/noise suppression can smear or attenuate the exact
    // periodic waveform shape `detectPitchHz`'s autocorrelation depends on,
    // and auto gain control would fight the RMS-based silence gate
    // (`DEFAULT_MIN_RMS`) by constantly renormalizing loudness.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    const source = this.context.createMediaStreamSource(this.stream);
    const analyser = this.context.createAnalyser();
    analyser.fftSize = this.frame.length;
    // Intentionally not connected onward to `context.destination` — this
    // graph exists purely for analysis, not playback (hearing your own mic
    // echoed back through speakers is howling feedback waiting to happen).
    source.connect(analyser);
    this.analyser = analyser;
  }

  /** The currently detected pitch, or `null` if not started yet or no
   * confident pitch this frame (silence, noise, or a percussion/"talkie"
   * moment — `core/gameplay/vocalJudgment.ts` treats all three the same). */
  getCurrentPitchHz(): number | null {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.frame);
    return detectPitchHz(this.frame, this.context.sampleRate, this.pitchOptions);
  }

  /** Releases the mic (stops every track on the captured `MediaStream`) —
   * call on leaving the vocal screen, same as `AudioEngine.stop()` for
   * playback, so navigating away doesn't leave the mic indicator lit. */
  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.analyser = null;
  }
}
