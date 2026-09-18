// Port of the plain value objects from `GHCore.ValueObjects` that the
// parsing layer needs. See docs/web-port-plan.md, Etapa 1.

/**
 * Port of `GHCore.ValueObjects.GameInstrument`. A `const` object + union
 * type rather than a TS `enum` — the project's tsconfig has
 * `erasableSyntaxOnly` on, and `enum` has non-erasable runtime emit. This
 * gives the same `GameInstrument.Guitar`-style usage and string values
 * (self-describing in test failures/logs, matching the C# member names).
 *
 * When adding a new instrument, extend this together with
 * `getTrackNamesByInstrument()` in `parser.ts` (mirrors the note on
 * `Parser.GetTracksIdsDictionary()` in CLAUDE.md).
 */
export const GameInstrument = {
  None: "None",
  UnKnow: "UnKnow",
  Guitar: "Guitar",
  Rhythm_Bass: "Rhythm_Bass",
  Drums: "Drums",
  Vocals: "Vocals",
  Piano: "Piano",
  Beat: "Beat",
  Events: "Events",
  Venues: "Venues",
  RawEvents: "RawEvents",
} as const;
export type GameInstrument = (typeof GameInstrument)[keyof typeof GameInstrument];

/** Port of `GHCore.ValueObjects.Difficult`, same `const` object pattern as
 * `GameInstrument` (see above for why it's not a TS `enum`). Order matters:
 * it is the same Easy -> Medium -> Hard -> Expert order the original enum
 * declares, used wherever difficulties are listed out (e.g.
 * `Part.availableDifficulties`). */
export const Difficult = {
  Easy: "Easy",
  Medium: "Medium",
  Hard: "Hard",
  Expert: "Expert",
} as const;
export type Difficult = (typeof Difficult)[keyof typeof Difficult];

/**
 * Port of `GHCore.ValueObjects.Part`: one MIDI track, identified as a
 * `GameInstrument`, with the `Difficult` levels it has notes for.
 *
 * `index` is a 0-based position into the parsed `@tonejs/midi` `Midi.tracks`
 * array — see the comment on `readChartMetadata` in `chartMetadata.ts` for
 * why this is *not* the C# original's 1-based `Part.Index`.
 */
export interface Part {
  instrument: GameInstrument;
  availableDifficulties: Difficult[];
  index: number;
  track: string;
}

/**
 * New in the web port — no equivalent in the C# project (see CLAUDE.md:
 * "the project atual só *visualiza* notas... não existe hoje uma estrutura
 * de dados 'lista de notas por instrumento+dificuldade' "). This is the
 * flat, time-ordered note list the gameplay engine (Etapa 3) will judge
 * hits against.
 */
export interface ChartNote {
  /** Note start time, in milliseconds from the start of the song. */
  timeMs: number;
  /** Fret index, 0-4 (green/red/yellow/blue/orange), matching `GameNeck`'s
   * fret order and `Parser.GetGemIndex`'s return value. */
  fret: number;
  /** Sustain length in milliseconds; 0 for a note with no hold. */
  sustainMs: number;
  /** Etapa 6.1: true if this note is a hammer-on/pull-off — hittable
   * without a fresh strum, given the previous chart note was hit and this
   * note's fret differs from it. Either read straight off the chart's
   * explicit "force HOPO" marker, or, absent one, derived from the classic
   * natural-HOPO rule (close enough to the previous note, different fret).
   * See `extractChartNotes` for how each is decided. */
  isHopo: boolean;
  /** Etapa 6.1: true if this note is a tap note — always hittable without a
   * strum, regardless of what came before (the trait that sets it apart
   * from `isHopo`). Read off the chart's explicit "tap" marker; there's no
   * natural/implicit tap rule the way there is for HOPO. */
  isTap: boolean;
  /** Etapa 6.2: which star power/overdrive phrase (0-based, in the order
   * phrases occur in the chart) this note belongs to, or `null` if it falls
   * outside every phrase. See `extractChartNotes` for how phrases are read
   * off the MIDI's note-116 marker spans. */
  starPowerPhraseId: number | null;
}

/**
 * Etapa 6.5: one sung syllable from `PART VOCALS`, extracted by
 * `extractVocalNotes` — the vocal equivalent of `ChartNote`, but judged by
 * pitch match over its duration rather than a single-instant keypress (see
 * `core/gameplay/vocalEngine.ts`). No C# equivalent: `Form1` only ever
 * echoed vocal MIDI events to a real synth output, it never judged the
 * player's own voice (see CLAUDE.md's note on `UserControls.MidiOut`).
 */
export interface VocalNote {
  /** Note start time, in milliseconds from the start of the song. */
  timeMs: number;
  /** How long the player should hold this pitch, in milliseconds. */
  durationMs: number;
  /** Target MIDI pitch the player should sing, or `null` for a percussion/
   * "talkie" syllable — a spoken beat judged by voicing alone, no pitch
   * match required (see `extractVocalNotes` for how this is read off the
   * chart's "#"-suffixed lyric convention). */
  pitch: number | null;
  /** Cleaned syllable text, with the chart's marker suffixes (`#`, trailing
   * `-`/`=`) stripped — `""` for a pitch-only continuation of the previous
   * syllable (the chart's lyric was exactly `"+"`, meaning "same word, new
   * pitch, no new syllable to display"). */
  lyric: string;
  /** True if this syllable's word continues into the next one with no space
   * (the chart's raw lyric ended in `-` or `=`) — e.g. `"dan-"` followed by
   * `"cin'"` displays as `"dancin'"`. */
  joinsNext: boolean;
  /** Which vocal phrase/line (0-based, chart order) this note belongs to, or
   * `null` outside every phrase — the sung-line grouping a lyric display
   * scrolls by. See `extractVocalNotes` for how phrases are read off the
   * chart's alternating phrase-marker note pair. */
  phraseId: number | null;
}
