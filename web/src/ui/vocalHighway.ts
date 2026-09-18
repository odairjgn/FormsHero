// Etapa 6.5's canvas visual — the vocal counterpart to `noteHighway.ts`
// (the C# project's closest analogue, `UserControls.VocalView`, only ever
// drew the player's own detected pitch against lyrics, never a chart's
// target notes to sing against — see CLAUDE.md's note on `VocalView.SetTone`).
//
// Same axis idea as a real Rock Band/Clone Hero vocal track: time scrolls
// right-to-left toward a fixed "now" line, but pitch — not a fret lane —
// is the vertical axis, since that's what a sung note has instead. A
// percussion/"talkie" syllable (`pitch === null`, see `VocalNote`) has no
// pitch to plot, so it gets its own dedicated row at the bottom instead of
// a vertical position.
//
// Not unit-tested: draws to a real `CanvasRenderingContext2D` (same
// reasoning as `noteHighway.ts`) — exercised by manual playtesting.

import { NoteRuntimeState } from "../core/gameplay/types.ts";
import type { VocalJudgedNote } from "../core/gameplay/types.ts";
import { hzToMidi } from "../core/audio/pitchDetection.ts";

export interface VocalHighwayOptions {
  /** Pixels the highway scrolls per millisecond of song time — same idea as
   * `NoteHighwayOptions.scrollPxPerMs`, just horizontal instead of vertical. */
  readonly scrollPxPerMs?: number;
  /** Pitch range (MIDI) the vertical axis spans — defaults to a few
   * semitones of padding around the chart's own observed pitch range, so
   * every song's line fills the available height regardless of its
   * register. */
  readonly minMidiPitch?: number;
  readonly maxMidiPitch?: number;
}

const DEFAULT_SCROLL_PX_PER_MS = 0.12;
const PITCH_RANGE_PADDING_SEMITONES = 3;
const NOTE_BAR_HEIGHT = 12;
const PERCUSSION_ROW_HEIGHT = 28;
const NOW_X_FRACTION = 0.18;

export class VocalHighway {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly scrollPxPerMs: number;
  private readonly minMidiPitch: number;
  private readonly maxMidiPitch: number;

  constructor(canvas: HTMLCanvasElement, notes: readonly VocalJudgedNote[], options: VocalHighwayOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.scrollPxPerMs = options.scrollPxPerMs ?? DEFAULT_SCROLL_PX_PER_MS;

    const pitches = notes.map((n) => n.pitch).filter((p): p is number => p !== null);
    const observedMin = pitches.length > 0 ? Math.min(...pitches) : 55;
    const observedMax = pitches.length > 0 ? Math.max(...pitches) : 74;
    this.minMidiPitch = options.minMidiPitch ?? observedMin - PITCH_RANGE_PADDING_SEMITONES;
    this.maxMidiPitch = options.maxMidiPitch ?? observedMax + PITCH_RANGE_PADDING_SEMITONES;
  }

  render(notes: readonly VocalJudgedNote[], songTimeMs: number, detectedPitchHz: number | null): void {
    const { ctx, canvas } = this;
    const nowX = canvas.width * NOW_X_FRACTION;
    const pitchAreaHeight = canvas.height - PERCUSSION_ROW_HEIGHT;
    const percussionY = canvas.height - PERCUSSION_ROW_HEIGHT / 2;
    const lookbehindMs = nowX / this.scrollPxPerMs;
    const lookaheadMs = (canvas.width - nowX) / this.scrollPxPerMs;

    ctx.fillStyle = "#101018";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawPercussionRow(percussionY);
    this.drawNowLine(nowX);

    for (const note of notes) {
      if (note.timeMs + note.durationMs < songTimeMs - lookbehindMs) continue;
      if (note.timeMs - songTimeMs > lookaheadMs) break;

      this.drawNote(note, songTimeMs, nowX, pitchAreaHeight, percussionY);
    }

    if (detectedPitchHz !== null) this.drawLivePitchMarker(detectedPitchHz, nowX, pitchAreaHeight);
  }

  private pitchToY(midiPitch: number, pitchAreaHeight: number): number {
    const clamped = Math.min(this.maxMidiPitch, Math.max(this.minMidiPitch, midiPitch));
    const t = (clamped - this.minMidiPitch) / (this.maxMidiPitch - this.minMidiPitch);
    return pitchAreaHeight - t * pitchAreaHeight; // higher pitch -> higher on screen
  }

  private timeToX(timeMs: number, songTimeMs: number, nowX: number): number {
    return nowX + (timeMs - songTimeMs) * this.scrollPxPerMs;
  }

  private drawPercussionRow(percussionY: number): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(0, percussionY - PERCUSSION_ROW_HEIGHT / 2, canvas.width, PERCUSSION_ROW_HEIGHT);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(0, percussionY - PERCUSSION_ROW_HEIGHT / 2);
    ctx.lineTo(canvas.width, percussionY - PERCUSSION_ROW_HEIGHT / 2);
    ctx.stroke();
  }

  private drawNowLine(nowX: number): void {
    const { ctx, canvas } = this;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, canvas.height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  private drawNote(
    note: VocalJudgedNote,
    songTimeMs: number,
    nowX: number,
    pitchAreaHeight: number,
    percussionY: number,
  ): void {
    const { ctx } = this;
    const startX = this.timeToX(note.timeMs, songTimeMs, nowX);
    const endX = this.timeToX(note.timeMs + note.durationMs, songTimeMs, nowX);
    const y = note.pitch === null ? percussionY : this.pitchToY(note.pitch, pitchAreaHeight);
    const height = note.pitch === null ? PERCUSSION_ROW_HEIGHT - 8 : NOTE_BAR_HEIGHT;

    ctx.fillStyle = noteColor(note);
    ctx.fillRect(Math.min(startX, endX), y - height / 2, Math.max(2, Math.abs(endX - startX)), height);

    if (note.lyric) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "12px sans-serif";
      ctx.fillText(note.lyric, Math.min(startX, endX), y - height / 2 - 3);
    }
  }

  private drawLivePitchMarker(detectedPitchHz: number, nowX: number, pitchAreaHeight: number): void {
    const { ctx } = this;
    const y = this.pitchToY(hzToMidi(detectedPitchHz), pitchAreaHeight);
    ctx.beginPath();
    ctx.arc(nowX, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#f5d033";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.stroke();
  }
}

function noteColor(note: VocalJudgedNote): string {
  if (note.state === NoteRuntimeState.Hit) return "#3ecf3e";
  if (note.state === NoteRuntimeState.Missed) return "rgba(128,128,128,0.6)";
  return "#3d7ce2"; // Pending
}
