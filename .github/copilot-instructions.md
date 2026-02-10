# FormsHero - AI Coding Agent Instructions

## Project Overview
FormsHero is a Guitar Hero-style rhythm game built with C# .NET Framework 4.7.2 and Windows Forms. It plays custom songs from a directory structure, synchronizes audio and MIDI, and provides gameplay mechanics for multiple instruments.

## Architecture

### Core Components
- **FormsHero** (WinExe): UI layer with Windows Forms; entry point is `SongSelect` → `Form1`/`GameForm`
- **GHCore** (Library): Business logic for song parsing, MIDI handling, and game state
- **AudioCore** (Library): Audio playback abstraction using NAudio library with OGG/MIDI support
- **CustomControls** (Library): Reusable UI components (GameNeck, NoteView, VocalView)

### Key Abstractions
**`IAudioPlayer`** - Audio playback interface (implemented by `NAudioPlayer`)
- Manages multiple audio layers (guitar, drums, vocals, rhythm) independently
- Supports mute/volume control per layer
- Currently supports OGG files via NAudio.Vorbis

**`IMidiPlayer`** - MIDI playback interface (implemented by `DryWetMidiPlayer`)
- Uses Melanchall.DryWetMidi library for MIDI parsing and playback
- Dispatches `MidiMessageEvent` for each MIDI event encountered
- Attaches to `IAudioPlayer` to keep audio/MIDI in sync
- Identifies MIDI tracks by name matching (see Parser.GetTracksIdsDictionary())

### Data Flow
1. **Song Loading**: `SongFolder`/`Song` read from directory structure → `song.ini` for metadata
2. **MIDI Parsing**: `DryWetMidiPlayer` reads `notes.mid`, maps track names to `GameInstrument` enum
3. **Audio Setup**: `NAudioPlayer` loads separate OGG files for each layer, mixes them via `WaveMixerStream32`
4. **Event Loop**: `Playback_EventPlayed` dispatches MIDI events; UI controls subscribe to these events
5. **Gameplay**: Custom controls render notes and track player input

## Song Directory Structure
```
musica/
├── 1.1 Joan Jett and the Blackhearts - I Love Rock and Roll/
│   ├── song.ini          # Metadata: album, name, year, artist
│   ├── notes.mid         # Main MIDI file with track parts
│   ├── notes-unedited.mid # Optional: alternative MIDI
│   ├── album.png or label.png  # Cover art
│   ├── guitar.ogg        # Guitar layer audio
│   ├── drums.ogg         # Drums layer audio
│   ├── vocal.ogg         # Vocals layer audio
│   └── rhythm.ogg        # Rhythm/Bass layer audio
```

## Key Patterns & Conventions

### MIDI Track Identification
Tracks are identified by their `SequenceTrackName` event text (case-insensitive, trimmed):
- `PART GUITAR` / `PART LEAD` → `GameInstrument.Guitar`
- `PART RHYTHM` / `PART BASS` / `PART PRO BASS` → `GameInstrument.Rhythm_Bass`
- `PART DRUMS` / `PART PRO DRUMS` → `GameInstrument.Drums`
- `PART KEYS` → `GameInstrument.Piano`
- `PART VOCALS` → `GameInstrument.Vocals`
- Special tracks: `EVENTS`, `BEAT`, `VENUE`, `RAWKSD`

**Adding a new instrument type:**
1. Add to `GameInstrument` enum (ValueObjects/GameInstrument.cs)
2. Update `Parser.GetTracksIdsDictionary()` with track name mappings
3. If audio layer: add property to `NAudioPlayer`, update `LoadSource()`

### Audio Layer Architecture
`AudioLayer` enum classes map to audio streams:
- Each layer is independently mutable and volumizable
- `WaveMixerStream32` combines all active layers
- `SetVolume(int%, AudioLayer[])` allows per-layer control

### Difficulty & Game State
- `Difficult` enum: Easy, Medium, Hard, Expert
- `GameInstrument` enum: Guitar, Drums, Vocals, Rhythm_Bass, Piano, etc.
- `PlayerState` mirrors NAudio's `PlaybackState`: Playing, Paused, Stopped

### Custom Control Hierarchy
- **ScrollNoteView**: Horizontal scrolling container for notes
- **IHorizontalScrollable**: Interface for objects that need scroll updates
- **Line/ScrollNote/VoiceNote**: Visual note representations
- **GameNeck/NoteView/VocalView**: Instrument-specific renderers

## Critical Implementation Details

### Synchronization Strategy
`DryWetMidiPlayer.Play()` starts all MIDI playbacks **and** calls `_audio.Play()` simultaneously.
Both use the same tempo map from the MIDI file to maintain sync. If either falls out of sync, the entire playback becomes desynchronized.

### Incomplete Features (Marked in code)
- `Position` setter in `IAudioPlayer` - commented as "Não implementado ainda" (not implemented yet)
- `FastFowardOrRewind()` / `GotoSection()` partially stubbed
- Song seeking is not fully implemented

### Keyboard Input
Default keyboard mapping in `GameForm._keys`:
- D, F, J, K, L map to 5 frets in order
- `SetFreteState(index, pressed)` updates UI state

## Build & Development
- **Target Framework**: .NET Framework 4.7.2 (requires Windows)
- **Build Output**: `bin\Debug\` or `bin\Release\`
- **NuGet Dependencies**: NAudio, Melanchall.DryWetMidi, NAudio.Vorbis, system packages
- **WinForms Designer**: Use VS designer for `.Designer.cs` files; don't manually edit designer code

## Common Tasks

### Adding a New Game Form
1. Create `YourForm.cs(Designer/resx)` inheriting from `Form`
2. Reference `IAudioPlayer`/`IMidiPlayer` from GHCore
3. Subscribe to `IMidiPlayer.MessageDispached` for note events
4. Call `SetDifficult()`/`SetInstrument()` before loading song state

### Extending Audio Layers
1. Add new audio file property to `Song` (follow pattern: `GuitarLayer`, `DrumsLayer`)
2. Add `OggAudioStream` property to `NAudioPlayer`
3. Create `WaveChannel32` wrapper and add to dictionary in `LoadSource()`
4. Add to `AudioLayer` enum if player-selectable
5. Update mixer channel count in `SetVolume(int%)`

### Debugging MIDI Parsing
- Add logging in `DryWetMidiPlayer.LoadSong()` to print discovered track names
- Check `_tracks` dictionary after `LoadSong()` to verify instrument mappings
- Use `Parser.GetGemIndex()` to verify note number → fret position mapping

## Testing Approach
- Manual testing with songs in `musica/` directory
- Verify MIDI track parsing visually via debug prints
- Check audio layer muting/volume via UI controls
- Test keyboard input responsiveness in GameForm

---
**Last Updated**: February 2026
**Target Audience**: AI coding agents working on rhythm game features, UI improvements, and audio synchronization
