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
}
