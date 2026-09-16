import { describe, expect, it } from "vitest";
import { AudioEngine } from "./audioEngine.ts";
import { AudioLayer, PlayerState, type AudioBufferLike, type AudioContextLike, type AudioNodeLike, type BufferSourceNodeLike, type GainNodeLike, type SongAudioBuffers } from "./types.ts";

// Fakes standing in for the real Web Audio API (unavailable in this
// project's `node` Vitest environment — see vite.config.ts). They implement
// exactly the `*Like` interfaces AudioEngine depends on, so a real
// AudioContext/GainNode/AudioBufferSourceNode can substitute for them
// without AudioEngine ever noticing.

class FakeGainNode implements GainNodeLike {
  readonly gain = { value: 1 };
  connectedTo: AudioNodeLike[] = [];
  connect(destination: AudioNodeLike): void {
    this.connectedTo.push(destination);
  }
}

class FakeSourceNode implements BufferSourceNodeLike {
  buffer: AudioBufferLike | null = null;
  startedAt: { when: number; offset: number } | null = null;
  stopCount = 0;
  connect(): void {}
  start(when = 0, offset = 0): void {
    this.startedAt = { when, offset };
  }
  stop(): void {
    // Real AudioBufferSourceNode throws if stop() is called on an already-stopped node.
    if (this.stopCount > 0) throw new Error("InvalidStateNode: already stopped");
    this.stopCount++;
  }
}

class FakeAudioContext implements AudioContextLike {
  currentTime = 0;
  readonly destination: AudioNodeLike = {};
  readonly gains: FakeGainNode[] = [];
  readonly sources: FakeSourceNode[] = [];

  createGain(): GainNodeLike {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }

  createBufferSource(): BufferSourceNodeLike {
    const source = new FakeSourceNode();
    this.sources.push(source);
    return source;
  }
}

function buffer(duration: number): AudioBufferLike {
  return { duration };
}

function buffers(overrides: Partial<SongAudioBuffers> = {}): SongAudioBuffers {
  return {
    [AudioLayer.Song]: buffer(180),
    [AudioLayer.Guitar]: buffer(180),
    [AudioLayer.Drums]: buffer(180),
    [AudioLayer.Rhythm]: buffer(180),
    ...overrides,
  };
}

describe("AudioEngine construction", () => {
  it("creates one GainNode per layer, connected to the context's destination", () => {
    const context = new FakeAudioContext();
    new AudioEngine(context, buffers());

    expect(context.gains).toHaveLength(4);
    for (const gain of context.gains) {
      expect(gain.gain.value).toBe(1);
      expect(gain.connectedTo).toEqual([context.destination]);
    }
  });

  it("starts stopped, at time 0", () => {
    const engine = new AudioEngine(new FakeAudioContext(), buffers());

    expect(engine.playerState).toBe(PlayerState.Stopped);
    expect(engine.currentTime).toBe(0);
  });

  it("reports layer availability and overall duration from the loaded buffers, null layers included", () => {
    const engine = new AudioEngine(
      new FakeAudioContext(),
      buffers({ [AudioLayer.Drums]: null, [AudioLayer.Guitar]: buffer(200) }),
    );

    expect(engine.isLayerAvailable(AudioLayer.Song)).toBe(true);
    expect(engine.isLayerAvailable(AudioLayer.Drums)).toBe(false);
    expect(engine.durationSeconds).toBe(200);
  });
});

describe("AudioEngine.play — same audioContext.currentTime reference for every layer", () => {
  it("starts a source per available layer, all at the same context time and offset", () => {
    const context = new FakeAudioContext();
    context.currentTime = 12.5;
    const engine = new AudioEngine(context, buffers());

    engine.play();

    expect(context.sources).toHaveLength(4);
    for (const source of context.sources) {
      expect(source.startedAt).toEqual({ when: 12.5, offset: 0 });
    }
    expect(engine.playerState).toBe(PlayerState.Playing);
  });

  it("does not start a source for a layer the song doesn't have", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers({ [AudioLayer.Drums]: null }));

    engine.play();

    expect(context.sources).toHaveLength(3);
  });

  it("skips a layer whose buffer is shorter than the requested start offset", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers({ [AudioLayer.Guitar]: buffer(10) }));

    engine.play(30);

    // Song/Drums/Rhythm (180s) start; Guitar (10s) doesn't, since 30s is past its end.
    expect(context.sources).toHaveLength(3);
  });

  it("advances currentTime with the context clock while playing", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.play();
    context.currentTime += 5;

    expect(engine.currentTime).toBe(5);
  });
});

describe("AudioEngine.pause/resume — no per-layer drift across a pause", () => {
  it("freezes currentTime on pause and stops every active source", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.play();
    context.currentTime += 5;
    engine.pause();
    context.currentTime += 100; // time passes while paused

    expect(engine.currentTime).toBe(5);
    expect(engine.playerState).toBe(PlayerState.Paused);
    expect(context.sources.every((s) => s.stopCount === 1)).toBe(true);
  });

  it("resumes every layer from the same paused offset, against the new context time", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.play();
    context.currentTime += 5;
    engine.pause();
    context.currentTime += 100;
    engine.resume();

    const resumedSources = context.sources.slice(-4);
    expect(resumedSources).toHaveLength(4);
    for (const source of resumedSources) {
      expect(source.startedAt).toEqual({ when: 105, offset: 5 });
    }
    expect(engine.playerState).toBe(PlayerState.Playing);

    context.currentTime += 2;
    expect(engine.currentTime).toBe(7);
  });

  it("pause() is a no-op when not playing, and resume() a no-op when not paused", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.pause();
    expect(engine.playerState).toBe(PlayerState.Stopped);

    engine.play();
    engine.resume();
    expect(context.sources).toHaveLength(4); // resume() didn't start a second round
  });
});

describe("AudioEngine.stop", () => {
  it("stops every source and resets currentTime to 0", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.play();
    context.currentTime += 42;
    engine.stop();

    expect(engine.currentTime).toBe(0);
    expect(engine.playerState).toBe(PlayerState.Stopped);
    expect(context.sources.every((s) => s.stopCount === 1)).toBe(true);
  });
});

describe("AudioEngine per-layer volume and mute — port of NAudioPlayer.SetVolume/SetMuteState", () => {
  it("applies setVolume to that layer's GainNode only", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.setVolume(AudioLayer.Guitar, 0.3);

    expect(engine.getVolume(AudioLayer.Guitar)).toBe(0.3);
    expect(context.gains[1].gain.value).toBeCloseTo(0.3);
    expect(context.gains[0].gain.value).toBe(1); // Song layer untouched
  });

  it("mute silences the GainNode without forgetting the configured volume", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.setVolume(AudioLayer.Drums, 0.7);
    engine.setMuteState(AudioLayer.Drums, true);

    expect(context.gains[2].gain.value).toBe(0);
    expect(engine.getVolume(AudioLayer.Drums)).toBe(0.7);
    expect(engine.getMuteState(AudioLayer.Drums)).toBe(true);

    engine.setMuteState(AudioLayer.Drums, false);
    expect(context.gains[2].gain.value).toBeCloseTo(0.7);
  });

  it("setVolume while muted updates the stored volume but not the audible gain", () => {
    const context = new FakeAudioContext();
    const engine = new AudioEngine(context, buffers());

    engine.setMuteState(AudioLayer.Rhythm, true);
    engine.setVolume(AudioLayer.Rhythm, 0.5);

    expect(context.gains[3].gain.value).toBe(0);

    engine.setMuteState(AudioLayer.Rhythm, false);
    expect(context.gains[3].gain.value).toBeCloseTo(0.5);
  });
});
