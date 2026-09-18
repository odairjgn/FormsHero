// Etapa 6.5's vocal parsing — extracts a judgeable syllable list from
// `PART VOCALS`, the same idea as `extractChartNotes` but for singing
// instead of frets. No C# equivalent (see `VocalNote`'s doc comment in
// `types.ts`).
//
// `@tonejs/midi`'s `Track` (used by `extractChartNotes`) only exposes note/
// control-change/pitch-bend events — it parses and discards a track's lyric
// text meta-events entirely (checked against its `Header.js`: it only ever
// collects `lyrics`/`text` events off `tracks[0]`, the conductor track, for
// its own `.meta`, never off a later track like `PART VOCALS`). Getting the
// per-syllable lyric text therefore needs a second, raw pass with
// `midi-file` (the lower-level parser `@tonejs/midi` itself is built on)
// over the same bytes, matched to the already-parsed `Midi`'s track by name
// rather than index — sidesteps the leading-conductor-track index quirk
// `chartMetadata.ts` documents for `@tonejs/midi` vs. raw `midi-file`
// indices. Tempo-accurate tick -> ms conversion still goes through the
// already-parsed `Midi`'s `header.ticksToSeconds`, so vocal note timing
// stays consistent with every other instrument's.

import type { Midi } from "@tonejs/midi";
import { parseMidi } from "midi-file";
import type { MidiEvent } from "midi-file";
import { STAR_POWER_MARKER_NOTE, VOCAL_PHRASE_MARKER_NOTES } from "./parser.ts";
import type { VocalNote } from "./types.ts";

interface AbsoluteEvent {
  readonly ticks: number;
  readonly event: MidiEvent;
}

interface NoteSpan {
  readonly noteNumber: number;
  readonly startTicks: number;
  readonly endTicks: number;
}

function withAbsoluteTicks(track: readonly MidiEvent[]): AbsoluteEvent[] {
  let ticks = 0;
  return track.map((event) => {
    ticks += event.deltaTime;
    return { ticks, event };
  });
}

/**
 * Pairs `noteOn`/`noteOff` events (a zero-velocity `noteOn` is the standard
 * MIDI alias for a note-off, handled the same as an explicit one) into
 * per-note spans — a from-scratch reimplementation of what `@tonejs/midi`'s
 * `Track` constructor already does, needed here because only this raw pass
 * carries the lyric events alongside the notes (see this module's header
 * comment). Sorted by start tick, same contract `extractChartNotes`'
 * marker-span helpers rely on.
 */
function pairNoteSpans(events: readonly AbsoluteEvent[]): NoteSpan[] {
  const spans: NoteSpan[] = [];
  const openStartTicksByNote = new Map<number, number[]>();

  for (const { ticks, event } of events) {
    if (event.type === "noteOn" && event.velocity > 0) {
      const open = openStartTicksByNote.get(event.noteNumber) ?? [];
      open.push(ticks);
      openStartTicksByNote.set(event.noteNumber, open);
    } else if (event.type === "noteOff" || (event.type === "noteOn" && event.velocity === 0)) {
      const open = openStartTicksByNote.get(event.noteNumber);
      const startTicks = open?.shift();
      if (startTicks !== undefined) spans.push({ noteNumber: event.noteNumber, startTicks, endTicks: ticks });
    }
  }

  return spans.sort((a, b) => a.startTicks - b.startTicks);
}

function phraseIndexContaining(ticks: number, phraseSpans: readonly NoteSpan[]): number | null {
  const index = phraseSpans.findIndex((span) => ticks >= span.startTicks && ticks <= span.endTicks);
  return index === -1 ? null : index;
}

/**
 * Cleans one raw lyric syllable per the FoF/Clone Hero/Rock Band vocal
 * convention (checked against every bundled vocal chart's real lyric text —
 * see docs/web-port-plan.md, Etapa 6.5):
 * - A trailing `#` marks a percussion/"talkie" syllable (judged by voicing,
 *   not pitch) — stripped before anything else, since it can combine with
 *   the other markers below.
 * - A trailing `-` or `=` means the word continues into the next syllable
 *   with no space (e.g. `"dan-"` + `"cin'"` -> `"dancin'"`).
 * - The literal text `"+"` (after the above stripping) means "same word,
 *   new pitch, no new syllable to display" — cleaned to `""`.
 */
function cleanLyric(rawLyric: string): { lyric: string; isPercussion: boolean; joinsNext: boolean } {
  const isPercussion = rawLyric.endsWith("#");
  const withoutPercussionMark = isPercussion ? rawLyric.slice(0, -1) : rawLyric;
  const joinsNext = withoutPercussionMark.endsWith("-") || withoutPercussionMark.endsWith("=");
  const trimmed = joinsNext ? withoutPercussionMark.slice(0, -1) : withoutPercussionMark;
  return { lyric: trimmed === "+" ? "" : trimmed, isPercussion, joinsNext };
}

/**
 * Extracts `PART VOCALS`' syllables as an ordered, judgeable note list —
 * `trackIndex` is `Part.index` into the already-parsed `midi.tracks` (same
 * contract as `extractChartNotes`'s `trackIndex`); `rawMidiBytes` must be
 * the exact same bytes `midi` was parsed from, re-read here to reach the
 * track's lyric events (see this module's header comment).
 */
export function extractVocalNotes(midi: Midi, trackIndex: number, rawMidiBytes: ArrayLike<number> | ArrayBuffer): VocalNote[] {
  const track = midi.tracks[trackIndex];
  if (!track) return [];

  const bytes = rawMidiBytes instanceof ArrayBuffer ? new Uint8Array(rawMidiBytes) : rawMidiBytes;
  const rawData = parseMidi(bytes);
  const rawTrack = rawData.tracks.find((events) => events.some((event) => event.type === "trackName" && event.text === track.name));
  if (!rawTrack) return [];

  const events = withAbsoluteTicks(rawTrack);

  const lyrics: { ticks: number; text: string }[] = [];
  for (const { ticks, event } of events) {
    if (event.type === "lyrics") lyrics.push({ ticks, text: event.text });
  }

  const nonPitchNotes = new Set<number>([...VOCAL_PHRASE_MARKER_NOTES, STAR_POWER_MARKER_NOTE]);
  const allSpans = pairNoteSpans(events);
  const pitchSpans = allSpans.filter((span) => !nonPitchNotes.has(span.noteNumber));
  const phraseSpans = allSpans.filter((span) => VOCAL_PHRASE_MARKER_NOTES.includes(span.noteNumber));

  // One lyric syllable per pitch/percussion note, paired 1:1 in chronological
  // order (both lists are already tick-sorted) — checked against every
  // bundled vocal chart: each one's lyric-event count exactly matches its
  // non-marker note count (see docs/web-port-plan.md, Etapa 6.5). `min()`
  // guards against a malformed chart where the two diverge, rather than
  // throwing or misaligning the rest of the pairing.
  const count = Math.min(lyrics.length, pitchSpans.length);
  const notes: VocalNote[] = [];

  for (let i = 0; i < count; i++) {
    const span = pitchSpans[i];
    const { lyric, isPercussion, joinsNext } = cleanLyric(lyrics[i].text);
    const timeMs = midi.header.ticksToSeconds(span.startTicks) * 1000;

    notes.push({
      timeMs,
      durationMs: midi.header.ticksToSeconds(span.endTicks) * 1000 - timeMs,
      pitch: isPercussion ? null : span.noteNumber,
      lyric,
      joinsNext,
      phraseId: phraseIndexContaining(span.startTicks, phraseSpans),
    });
  }

  return notes.sort((a, b) => a.timeMs - b.timeMs);
}
