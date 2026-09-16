// New in the web port — no C# equivalent. See docs/web-port-plan.md, Etapa 1:
// "Novo (não existe no C#): função que converte os NoteOn/NoteOff de uma
// track+dificuldade numa lista ordenada { timeMs, fret, sustainMs }".
//
// `@tonejs/midi` already pairs each track's NoteOn/NoteOff events into
// `Track.notes` (with `.midi`, `.time`, `.duration`), which is most of the
// work the C# side never had to do (it only ever visualized raw events).

import type { Midi } from "@tonejs/midi";
import { getGemIndexForDifficulty } from "./parser.ts";
import type { ChartNote, Difficult } from "./types.ts";

/**
 * Extracts one instrument track's notes for a single difficulty as an
 * ordered, judgeable note list.
 *
 * `trackIndex` is `Part.index` from `readChartMetadata` — a 0-based index
 * into `midi.tracks` (see the note on `readChartMetadata` for why it's
 * 0-based here rather than the C# original's 1-based `Part.Index`).
 */
export function extractChartNotes(midi: Midi, trackIndex: number, difficult: Difficult): ChartNote[] {
  const track = midi.tracks[trackIndex];
  if (!track) return [];

  const notes: ChartNote[] = [];

  for (const note of track.notes) {
    const fret = getGemIndexForDifficulty(difficult, note.midi);
    if (fret === -1) continue; // not a gem note for this difficulty (e.g. a HOPO/force marker, or another difficulty's note)

    notes.push({
      timeMs: note.time * 1000,
      fret,
      sustainMs: note.duration * 1000,
    });
  }

  // `Track.notes` is already time-ordered, but sort defensively — the
  // result is a public contract other modules (Etapa 3's gameplay engine)
  // depend on being ordered.
  return notes.sort((a, b) => a.timeMs - b.timeMs);
}
