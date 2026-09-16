// Canvas 2D note highway — the visual half of Etapa 3's "Novo (não existe
// no C#)" gameplay engine. Purely a view over `GameplayEngine.getNotes()`;
// it holds no judging state of its own. The C# project's closest analogues
// were `GameNeck` (a static row of 5 frets that only highlight on keypress,
// no falling notes) and `ScrollNoteView` (an unjudged horizontal
// visualization) — neither renders notes against a judged, per-note
// lifecycle the way this does.
//
// Not unit-tested: it draws to a real `CanvasRenderingContext2D`, which
// only exists in a browser (same reasoning as `createAudioEngine.ts` for
// `decodeAudioData`) — exercised by manual playtesting per the plan's
// Etapa 3 "critério de pronto".

import { NoteRuntimeState } from "../core/gameplay/types.ts";
import type { JudgedNote } from "../core/gameplay/types.ts";

/** Same 5 fret colors as `GameNeck.CreateFret` (green/red/yellow/blue/orange). */
export const FRET_COLORS: readonly string[] = ["#3ecf3e", "#e2483d", "#f5d033", "#3d7ce2", "#f2933d"];

export interface NoteHighwayOptions {
  /** Pixels the highway scrolls per millisecond of song time — the plan's
   * "velocidade de scroll configurável". */
  readonly scrollPxPerMs?: number;
}

/** A "hit" moment on one fret, keyed by when it happened on the
 * `performance.now()` clock. The caller (see `src/main.ts`) pushes one of
 * these per successful `GameplayEngine.onFretDown`; `render()` derives the
 * whole fire-burst animation from `performance.now() - spawnedAtMs`, so the
 * caller doesn't need to track per-particle state — just prune the array
 * once an effect is older than `HIT_EFFECT_DURATION_MS`. */
export interface HitEffect {
  readonly fret: number;
  readonly spawnedAtMs: number;
}

const NOTE_RADIUS = 18;
const DEFAULT_SCROLL_PX_PER_MS = 0.4;
/** Extra time (ms) a fully-played sustain tail stays on screen before
 * `render()` stops bothering to draw it at all. */
const CULL_TAIL_GRACE_MS = 200;

/** How long a hit's fire burst plays before it's fully faded — exported so
 * `src/main.ts` can prune its `HitEffect` list on the same lifetime. */
export const HIT_EFFECT_DURATION_MS = 450;

const FIRE_PARTICLE_COUNT = 14;
/** Fixed per-particle angle/speed, computed once at module load (not
 * `Math.random()` per frame) so a burst looks like one coherent explosion
 * instead of reshuffling every frame. */
const FIRE_PARTICLES: readonly { angle: number; speedPxPerSec: number; sizePx: number }[] = Array.from(
  { length: FIRE_PARTICLE_COUNT },
  (_, i) => {
    const spread = pseudoRandom(i * 2) - 0.5; // +/- half a slot of jitter
    return {
      angle: ((i + spread) / FIRE_PARTICLE_COUNT) * Math.PI * 2,
      speedPxPerSec: 90 + pseudoRandom(i * 2 + 1) * 90,
      sizePx: 3 + pseudoRandom(i * 3) * 4,
    };
  },
);

export class NoteHighway {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scrollPxPerMs: number;

  constructor(canvas: HTMLCanvasElement, options: NoteHighwayOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.scrollPxPerMs = options.scrollPxPerMs ?? DEFAULT_SCROLL_PX_PER_MS;
  }

  /**
   * Draws the 5-lane vertical highway for the given instant: notes fall
   * from the top of the canvas toward a hit line near the bottom, timed
   * against `songTimeMs` — the same `AudioEngine.currentTime * 1000` the
   * `GameplayEngine` judges against (see docs/web-port-plan.md's
   * shared-clock rationale in Etapa 2), so what's drawn always matches
   * what's judgeable.
   */
  render(notes: readonly JudgedNote[], songTimeMs: number, hitEffects: readonly HitEffect[] = []): void {
    const { ctx, canvas } = this;
    const laneWidth = canvas.width / FRET_COLORS.length;
    const hitLineY = canvas.height - 60;
    const lookaheadMs = hitLineY / this.scrollPxPerMs;

    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawLanes(laneWidth);
    this.drawHitLine(laneWidth, hitLineY);

    for (const note of notes) {
      // `notes` is time-ordered (see `GameplayEngine`'s constructor), so
      // once one note is fully past on the near side, none before it in
      // the array can still be visible either — and once one is still
      // further ahead than the lookahead window, neither is anything after it.
      if (note.timeMs + note.sustainMs < songTimeMs - CULL_TAIL_GRACE_MS) continue;
      if (note.timeMs - songTimeMs > lookaheadMs) break;

      this.drawNote(note, laneWidth, hitLineY, songTimeMs);
    }

    this.drawHitEffects(hitEffects, laneWidth, hitLineY);
  }

  private timeToY(timeMs: number, songTimeMs: number, hitLineY: number): number {
    return hitLineY - (timeMs - songTimeMs) * this.scrollPxPerMs;
  }

  private drawLanes(laneWidth: number): void {
    const { ctx, canvas } = this;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let fret = 1; fret < FRET_COLORS.length; fret++) {
      ctx.beginPath();
      ctx.moveTo(fret * laneWidth, 0);
      ctx.lineTo(fret * laneWidth, canvas.height);
      ctx.stroke();
    }
  }

  private drawHitLine(laneWidth: number, hitLineY: number): void {
    const { ctx } = this;
    for (let fret = 0; fret < FRET_COLORS.length; fret++) {
      const cx = laneWidth * (fret + 0.5);
      ctx.beginPath();
      ctx.arc(cx, hitLineY, NOTE_RADIUS + 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.stroke();
    }
  }

  /**
   * Guitar Hero-style "fire" burst on a hit fret: an expanding/fading ring
   * plus a spray of ember particles that drift upward and cool from white
   * to red as they age. Replaces the old flat color-swap flash, which
   * playtesting found too subtle to read a hit from at a glance.
   */
  private drawHitEffects(hitEffects: readonly HitEffect[], laneWidth: number, hitLineY: number): void {
    const { ctx } = this;
    const now = performance.now();

    for (const effect of hitEffects) {
      const ageMs = now - effect.spawnedAtMs;
      if (ageMs < 0 || ageMs > HIT_EFFECT_DURATION_MS) continue;

      const t = ageMs / HIT_EFFECT_DURATION_MS; // 0 (just hit) -> 1 (fully faded)
      const cx = laneWidth * (effect.fret + 0.5);

      ctx.beginPath();
      ctx.arc(cx, hitLineY, NOTE_RADIUS + t * 45, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255, ${Math.round(200 - t * 160)}, 40, ${1 - t})`;
      ctx.stroke();

      for (const particle of FIRE_PARTICLES) {
        const distancePx = particle.speedPxPerSec * (ageMs / 1000);
        const px = cx + Math.cos(particle.angle) * distancePx;
        const py = hitLineY + Math.sin(particle.angle) * distancePx * 0.5 - t * 35; // flames drift upward
        const sizePx = Math.max(0, particle.sizePx * (1 - t));

        ctx.beginPath();
        ctx.arc(px, py, sizePx, 0, Math.PI * 2);
        ctx.fillStyle = fireEmberColor(t);
        ctx.fill();
      }
    }
  }

  private drawNote(note: JudgedNote, laneWidth: number, hitLineY: number, songTimeMs: number): void {
    const { ctx } = this;
    const cx = laneWidth * (note.fret + 0.5);
    const color = FRET_COLORS[note.fret];
    const isDimmed = note.state === NoteRuntimeState.Missed || note.state === NoteRuntimeState.SustainBroken;
    const wasJudged =
      note.state === NoteRuntimeState.Hit ||
      note.state === NoteRuntimeState.Holding ||
      note.state === NoteRuntimeState.SustainCompleted;

    if (note.sustainMs > 0) {
      const headY = Math.min(this.timeToY(note.timeMs, songTimeMs, hitLineY), hitLineY);
      const tailY = Math.min(this.timeToY(note.timeMs + note.sustainMs, songTimeMs, hitLineY), hitLineY);
      ctx.fillStyle = isDimmed ? "rgba(128,128,128,0.4)" : hexToRgba(color, 0.5);
      ctx.fillRect(cx - 4, tailY, 8, Math.max(0, headY - tailY));
    }

    if (wasJudged) return; // already crossed the hit line — nothing left to draw for the head itself

    const headY = this.timeToY(note.timeMs, songTimeMs, hitLineY);
    ctx.beginPath();
    ctx.arc(cx, headY, NOTE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isDimmed ? "#555555" : color;
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}

/** White-hot at spawn, cooling through yellow/orange to a fading red ember
 * as `t` (0..1 age fraction) increases. */
function fireEmberColor(t: number): string {
  const r = 255;
  const g = Math.round(230 - t * 190);
  const b = Math.round(180 - t * 180);
  const alpha = 1 - t;
  return `rgba(${r}, ${Math.max(0, g)}, ${Math.max(0, b)}, ${alpha})`;
}

function hexToRgba(hexColor: string, alpha: number): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Deterministic 0..1 pseudo-random from a seed — used only to jitter the
 * fixed `FIRE_PARTICLES` layout at module load, not for per-frame values. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
