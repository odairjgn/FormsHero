# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FormsHero is a Guitar Hero/Rock Band–style rhythm game engine (C#, .NET Framework 4.7.2, WinForms, Windows-only). It loads songs from a folder-based library (`song.ini` + `notes.mid` + per-instrument `.ogg` stems), parses the MIDI to figure out which track is which instrument, and plays synchronized audio/MIDI while dispatching per-note events to UI controls.

The repo is currently more of a MIDI/audio-sync test harness than a finished game: the form that's actually wired up (`Form1`) is a debug rig with dropdowns for instrument/difficulty, mute checkboxes per audio layer, and raw event/text panels — not a playable fretboard.

## Build & Run

This is a classic (non-SDK-style) .NET Framework solution using `packages.config` for NuGet, so `dotnet build` will not work correctly. Build with MSBuild:

```
"C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe" /t:restore FormsHero.sln
"C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe" FormsHero.sln /p:Configuration=Debug
```

(Adjust the MSBuild path for whatever VS install is present; opening `FormsHero.sln` in Visual Studio and building/running there is the normal workflow.) The startup project is `FormsHero` (`WinExe`), output goes to `FormsHero\bin\Debug\`. There are no automated tests in the repo — verification is manual, by running the app against the sample songs in `FormsHero\musica\`.

`FormsHero.sln` only includes three projects: **FormsHero**, **GHCore**, **CustomControls**. A fourth project, **AudioCore**, exists on disk (`AudioCore\AudioCore.csproj`) but is **not part of the solution** — it's an orphaned/superseded copy of `NAudioPlayer`/`OggAudioStream` that now live in `GHCore\PlayerImplementation`. Don't assume AudioCore is loaded or used; treat it as dead code unless someone re-adds it to the solution.

## Architecture

**Dependency direction:** `FormsHero` (WinExe UI) → `GHCore` (domain/services, no UI dependency) and `CustomControls` (generic WinForms controls, no GHCore dependency). GHCore has no reference to FormsHero or CustomControls — it's the reusable engine layer.

### Entry point and the two parallel gameplay UIs

`Program.cs` runs `SongSelect`, not `GameForm` (that line is commented out). `SongSelect` lists songs found under `musica\` and, on selection, opens `Form1` — this is the real, live code path.

There is a second, unfinished gameplay UI (`GameForm` + `UserControls\GameNeck`, `NoteView`, `NotePanel`) that renders a fretboard with note gems and reads keyboard input (D/F/J/K/L → 5 frets via `GameNeck.SetFreteState`). It is **not instantiated anywhere** in the current entry point — it's a prototype for the eventual playable mode, not currently reachable from the running app. Don't be surprised that it looks disconnected from the MIDI/audio pipeline; it hasn't been wired to `IMidiPlayer` events yet.

### Song model (`GHCore.ValueObjects`)

- `SongFolder` recursively walks a directory: a directory containing `song.ini` becomes a `Song` (leaf), otherwise it's a nested `SongFolder`.
- `Song` reads `song.ini` (via `Utils.ReadIni`, a simple `key=value` parser) for `album`/`name`/`year`/`artist`, and exposes the on-disk layer files as properties (`GuitarLayer`, `RhythmLayer`, `DrumsLayer`, `SongLayer`, `PreviewLayer`, each `null` if the file doesn't exist) plus `MidiPath`/`MidiUneditedPath` (`notes-unedited.mid` is preferred over `notes.mid` when present — see `Song.GetMidi()`).
- `SongGamePlayMetaData.ReadMetaData(MidiFile)` inspects the MIDI's track names and note numbers to build a `Part[]` describing which `GameInstrument` each track is and which `Difficult` levels it has notes for (by checking which of the four gem-note-range arrays in `Parser` the track's notes fall into). It has a fallback for old Frets on Fire charts that only have a single unnamed guitar track.

### MIDI ↔ instrument/gem mapping (`GHCore.Services.Parser`)

- `Parser.GetTracksIdsDictionary()` is the single source of truth mapping MIDI track names to `GameInstrument`: `PART GUITAR`/`PART LEAD` → Guitar, `PART RHYTHM`/`PART BASS` → Rhythm_Bass, `PART DRUMS` → Drums, `PART KEYS` → Piano, `PART VOCALS` → Vocals, plus `EVENTS`, `BEAT`, `VENUE`, `RAWKSD`. A track containing `GEMS` (old format) is treated as Guitar. Anything else unrecognized becomes `GameInstrument.UnKnow`. When adding a new instrument, extend this dictionary and the `GameInstrument` enum together.
- Gem/fret note numbers are fixed MIDI note ranges per difficulty (`EasyGems`/`MediumGems`/`HardGems`/`ExpertGems`, 5 bytes each = 5 frets). `Parser.GetGemIndex(byte note, GameInstrument)` searches Expert→Hard→Medium→Easy and returns `(fret index, Difficult)`; the other overload does per-difficulty lookup.

### Playback engine (`GHCore.Players` / `GHCore.PlayerImplementation`)

Two independent player interfaces are kept in sync manually rather than sharing a clock:

- `IAudioPlayer` (`NAudioPlayer`): loads up to 4 stem files per song (`song.ogg`, `guitar.ogg`, `rhythm.ogg`, `drums.ogg`) as `OggAudioStream`s, combines them with NAudio's `WaveMixerStream32`, and exposes independent per-layer mute/volume via the `AudioLayer` enum (`Song`, `Guitar`, `Drums`, `Rhythm`). `Position` (seeking), `FastFowardOrRewind`, and `GotoSection` are stubs ("Não implementado ainda") — seeking is not implemented.
- `IMidiPlayer` (`DryWetMidiPlayer`): uses Melanchall.DryWetMidi's `Playback` (one per MIDI track) driven by the file's tempo map, and fires the `MessageDispached(int track, MidiEvent)` event for every event played. `AttachAudioPlayer` lets it call `Play()/Pause()/Resume()/Stop()` on the `IAudioPlayer` at the same time it starts/stops its own MIDI playbacks — synchronization is "start both at once", not a shared clock, so drift is possible over long songs.
- `Form1._midiPlayer_MessageDispached` is the central event router: it switches on the track's `GameInstrument` (looked up via `_midiPlayer.Tracks[track]`) and, for note tracks, calls `Parser.GetGemIndex` then forwards to the matching `NoteView` and to `CustomControls.ScrollNoteView` (only for whatever instrument/difficulty is currently selected in the UI). Vocals are handled differently: `LyricEvent` drives on-screen lyrics/scrolling text, `NoteOnEvent`/`NoteOffEvent` with note number < 100 drive the pitch display (`VocalView.SetTone`) and, if "play notes" is checked, get echoed to a real MIDI output device (`UserControls.MidiOut`, hardcoded to `"Microsoft GS Wavetable Synth"`).

### CustomControls

Generic, GHCore-agnostic rendering controls: `IHorizontalScrollable` is the contract for anything that scrolls across `ScrollNoteView` (a timer-driven horizontal note/lyric highway); `ScrollNote`, `Line`, `TextS`, `VoiceNote` are the scrollable item types. `GameNeck`/`NoteView`/`VocalView`/`NotePanel` (in `FormsHero.UserControls`) are FormsHero-specific and implement `IResetable` where they need to clear state on song stop (see `Form1.Reset()`).

## Conventions to know

- `.Designer.cs` files are WinForms-designer-generated — edit the matching form/control in Visual Studio's designer rather than hand-editing layout code, to avoid desync with the `.resx`.
- Song assets live under `FormsHero\musica\<song folder>\` and are marked `CopyToOutputDirectory: PreserveNewest` in the csproj; adding a new bundled song means adding its files there and to `FormsHero.csproj`.
- Some UI strings/comments are in Portuguese (e.g. "Não implementado ainda" = "not implemented yet") — this reflects the primary author's language, not a localization system; there's no i18n layer.
