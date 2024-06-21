using GHCore.Players;
using GHCore.Services;
using GHCore.ValueObjects;
using Melanchall.DryWetMidi.Core;
using Melanchall.DryWetMidi.Devices;
using Melanchall.DryWetMidi.Interaction;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.PlayerImplementation
{
    public class DryWetMidiPlayer : IMidiPlayer
    {
        private MidiFile _midi;
        private List<Playback> _playbacks;
        private IAudioPlayer _audio;
        private Dictionary<int, GameInstrument> _tracks;

        public Dictionary<int, GameInstrument> Tracks => _tracks;

        public event MidiMessageEvent MessageDispached;

        public DryWetMidiPlayer()
        {
            _playbacks = new List<Playback>();
        }

        public void AttachAudioPlayer(IAudioPlayer audioPlayer)
        {
            _audio = audioPlayer;
        }

        public void Dispose()
        {
            _playbacks.ForEach(x => x.Dispose());
            _playbacks = new List<Playback>();
            _tracks = new Dictionary<int, GameInstrument>();
        }

        public void LoadSong(Song song)
        {
            Dispose();
            _midi = MidiFile.Read(song.GetMidi());

            var dic = Parser.GetTracksIdsDictionary();
            var i = 0;

            foreach (var track in _midi.GetTrackChunks())
            {
                var name = track.Events.OfType<SequenceTrackNameEvent>().FirstOrDefault(e => e.EventType == MidiEventType.SequenceTrackName)?.Text?.ToUpper()?.Trim();

                if (string.IsNullOrEmpty(name))
                    _tracks.Add(i, GameInstrument.None);
                else
                {
                    var kp = dic.Any(p => p.Value.Contains(name)) ? dic.FirstOrDefault(p => p.Value.Contains(name)).Key : GameInstrument.UnKnow;

                    if (kp == GameInstrument.UnKnow && name.Contains("GEMS"))
                        kp = GameInstrument.Guitar;

                    _tracks.Add(i, kp);
                }

                var playback = track.GetPlayback(_midi.GetTempoMap());
                _playbacks.Add(playback);
                playback.EventPlayed += Playback_EventPlayed;

                i++;
            }
        }

        private void Playback_EventPlayed(object sender, MidiEventPlayedEventArgs e)
        {
            var track = _playbacks.IndexOf((Playback)sender);
            MessageDispached?.Invoke(track, e.Event);
        }

        public void Pause()
        {
            _playbacks.AsParallel().ForAll(p => p.Stop());
            _audio?.Pause();
        }

        public void Play()
        {
            _playbacks.AsParallel().ForAll(p => p.Start());
            _audio?.Play();
        }

        public void Resume()
        {
            _playbacks.AsParallel().ForAll(p => p.Start());
            _audio?.Resume();
        }

        public void Stop()
        {
            _playbacks.AsParallel().ForAll(p => p.Stop());
            _audio?.Stop();
            _playbacks.AsParallel().ForAll(p => p.MoveToStart());
        }
    }
}
