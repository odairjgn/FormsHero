// Public surface of `core/parsing` — port of the chart-reading half of
// `GHCore` (see docs/web-port-plan.md, Etapa 1). Everything needed to go
// from a song library's files to a judgeable note list lives here.

export { parseIni, type IniData } from "./ini.ts";
export {
  getGemIndex,
  getGemIndexForDifficulty,
  getTrackNamesByInstrument,
  GEMS_BY_DIFFICULTY,
  type GemLookup,
} from "./parser.ts";
export { readChartMetadata } from "./chartMetadata.ts";
export { extractChartNotes } from "./chartNotes.ts";
export {
  buildSongLibrary,
  getPlayableMidiFile,
  readSong,
  type LibrarySongEntry,
  type Song,
  type SongFile,
  type SongFolderNode,
  type SongLibraryEntry,
} from "./songLibrary.ts";
export { Difficult, GameInstrument, type ChartNote, type Part } from "./types.ts";
