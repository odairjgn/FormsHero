// Port of `GHCore.ValueObjects.SongGamePlayMetaData.ReadMetaData`.

import type { Midi, Track } from "@tonejs/midi";
import { GEMS_BY_DIFFICULTY, getTrackNamesByInstrument } from "./parser.ts";
import { Difficult, GameInstrument, type Part } from "./types.ts";

/**
 * Port of `SongGamePlayMetaData.ReadMetaData`: inspects a parsed MIDI
 * file's track names and note numbers to figure out which `GameInstrument`
 * each track is, and which `Difficult` levels it has notes for — including
 * the original's fallback for old Frets on Fire charts that only have a
 * single, unnamed guitar track.
 *
 * Takes an already-parsed `@tonejs/midi` `Midi` (not raw bytes/a file),
 * matching how the C# original takes a `NAudio.Midi.MidiFile` rather than
 * doing its own file I/O.
 *
 * `Part.index` here is a plain 0-based index into `midi.tracks`, used
 * directly by `extractChartNotes`/`midi.tracks[part.index]` — unlike the
 * C# original's `i.Index = index + 1`. That `+1` compensated for
 * `NAudio.Midi.MidiFile` always keeping the SMF's leading conductor/tempo
 * meta-track (track 0, usually unnamed) as a real, empty entry ahead of the
 * first named part. `@tonejs/midi` already strips that leading empty track
 * for a format-1 file before exposing `.tracks` (see its `Midi`
 * constructor), so there is no equivalent off-by-one to correct for here.
 * One consequence: an unnamed non-empty leading track (seen in the wild as
 * a lowercase `"rawksd"` track, which doesn't match the `"RAWKSD"` name the
 * original dictionary expects either) can be dropped by `@tonejs/midi`
 * before it ever reaches this function, instead of surviving as a
 * `GameInstrument.None` part the way the C# original would.
 */
export function readChartMetadata(midi: Midi): Part[] {
  const trackNamesByInstrument = getTrackNamesByInstrument();
  const allKnownTrackNames = [...trackNamesByInstrument.values()].flat();
  const trackNames = midi.tracks.map((track) => track.name);

  // Older Frets on Fire charts only ever had a single, unnamed guitar track.
  if (trackNames.length === 1 && !allKnownTrackNames.includes(trackNames[0])) {
    return [
      {
        track: trackNames[0],
        instrument: GameInstrument.Guitar,
        index: 0,
        availableDifficulties: difficultiesInTrack(midi.tracks[0]),
      },
    ];
  }

  return midi.tracks.map((track, index) => {
    const instrument = findInstrumentForTrackName(trackNamesByInstrument, track.name) ?? guessInstrument(track.name);

    return {
      track: track.name,
      instrument,
      index,
      availableDifficulties: instrument === GameInstrument.None ? [] : difficultiesInTrack(track),
    };
  });
}

function guessInstrument(trackName: string): GameInstrument {
  // Old-format charts mark their single gem track with a name containing "GEMS".
  return trackName.includes("GEMS") ? GameInstrument.Guitar : GameInstrument.None;
}

function findInstrumentForTrackName(
  trackNamesByInstrument: Map<GameInstrument, string[]>,
  trackName: string,
): GameInstrument | null {
  for (const [instrument, names] of trackNamesByInstrument) {
    if (names.includes(trackName)) return instrument;
  }

  return null;
}

function difficultiesInTrack(track: Track): Difficult[] {
  const notes = new Set(track.notes.map((note) => note.midi));

  return [Difficult.Easy, Difficult.Medium, Difficult.Hard, Difficult.Expert].filter((difficult) =>
    GEMS_BY_DIFFICULTY[difficult].some((gem) => notes.has(gem)),
  );
}
