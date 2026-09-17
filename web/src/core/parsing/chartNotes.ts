// New in the web port — no C# equivalent. See docs/web-port-plan.md, Etapa 1:
// "Novo (não existe no C#): função que converte os NoteOn/NoteOff de uma
// track+dificuldade numa lista ordenada { timeMs, fret, sustainMs }".
//
// `@tonejs/midi` already pairs each track's NoteOn/NoteOff events into
// `Track.notes` (with `.midi`, `.time`, `.duration`), which is most of the
// work the C# side never had to do (it only ever visualized raw events).

import type { Midi } from "@tonejs/midi";
import { getForceMarkerNote, getGemIndexForDifficulty, getTapMarkerNote } from "./parser.ts";
import type { ChartNote, Difficult } from "./types.ts";

type MidiNote = Midi["tracks"][number]["notes"][number];

interface MarkerSpan {
  readonly startTicks: number;
  readonly endTicks: number;
}

/**
 * Etapa 6.1's natural-HOPO distance threshold, in MIDI ticks — tempo-
 * independent on purpose, since a HOPO is defined by how close two notes
 * are *in the chart*, not by absolute elapsed time. A 12th note (a third of
 * a quarter note) at the file's resolution is Clone Hero/Moonscraper's
 * documented default when a chart doesn't set its own (the `hopofreq` key
 * in `song.ini`); none of the 8 bundled songs set it (checked against every
 * `song.ini` in `musica/`), so every chart here uses this default.
 */
function naturalHopoThresholdTicks(ppq: number): number {
  return Math.floor(ppq / 3);
}

function collectMarkerSpans(notes: readonly MidiNote[], markerNote: number): MarkerSpan[] {
  return notes
    .filter((note) => note.midi === markerNote)
    .map((note) => ({ startTicks: note.ticks, endTicks: note.ticks + note.durationTicks }));
}

function isWithinAnySpan(ticks: number, spans: readonly MarkerSpan[]): boolean {
  return spans.some((span) => ticks >= span.startTicks && ticks <= span.endTicks);
}

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

  const forceSpans = collectMarkerSpans(track.notes, getForceMarkerNote(difficult));
  const tapSpans = collectMarkerSpans(track.notes, getTapMarkerNote(difficult));
  const thresholdTicks = naturalHopoThresholdTicks(midi.header.ppq);

  const gems = track.notes
    .map((note) => ({ note, fret: getGemIndexForDifficulty(difficult, note.midi) }))
    .filter((gem) => gem.fret !== -1) // not a gem note for this difficulty (e.g. a HOPO/force marker, or another difficulty's note)
    .sort((a, b) => a.note.ticks - b.note.ticks);

  const notes: ChartNote[] = [];
  let previous: (typeof gems)[number] | null = null;

  for (const gem of gems) {
    const { note, fret } = gem;

    // Classic natural-HOPO rule: close enough to the previous note (in this
    // same difficulty) and a different fret. An explicit force marker
    // flips whatever this comes out to, rather than replacing it outright —
    // charts use it to override specific natural-HOPO/natural-strum notes,
    // not to blanket-declare a section.
    const naturalHopo = previous !== null && previous.fret !== fret && note.ticks - previous.note.ticks <= thresholdTicks;
    const isHopo = isWithinAnySpan(note.ticks, forceSpans) ? !naturalHopo : naturalHopo;
    const isTap = isWithinAnySpan(note.ticks, tapSpans);

    notes.push({
      timeMs: note.time * 1000,
      fret,
      sustainMs: note.duration * 1000,
      isHopo,
      isTap,
    });

    previous = gem;
  }

  // `gems` is sorted by ticks (monotonic with time), but sort defensively —
  // the result is a public contract other modules (Etapa 3's gameplay
  // engine) depend on being ordered.
  return notes.sort((a, b) => a.timeMs - b.timeMs);
}
