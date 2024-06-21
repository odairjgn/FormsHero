using GHCore.Players;
using GHCore.ValueObjects;
using NAudio.Utils;
using NAudio.Vorbis;
using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace GHCore.PlayerImplementation
{
    public class NAudioPlayer : IAudioPlayer
    {
        private Dictionary<AudioLayer, OggAudioStream> _layerdic;

        public NAudioPlayer()
        {
            _layerdic = new Dictionary<AudioLayer, OggAudioStream>();
        }

        public WaveOut Output { get; private set; }
        public WaveMixerStream32 Mixer { get; private set; }
        public OggAudioStream GuitarLayer { get; private set; }
        public OggAudioStream SongLayer { get; private set; }
        public OggAudioStream DrumsLayer { get; private set; }
        public OggAudioStream RhythmLayer { get; private set; }

        public TimeSpan Position
        {
            get
            {
                return Output.GetPositionTimeSpan();
            }
            set
            {
                //Não implementado ainda
            }
        }

        public PlayerState State
        {
            get
            {
                return (PlayerState)Output.PlaybackState;
            }
        }

        public Song CurrentSong { get; private set; }


        public void Dispose()
        {
            Output?.Dispose();
            Mixer?.Dispose();
            GuitarLayer?.Dispose();
            SongLayer?.Dispose();
            DrumsLayer?.Dispose();
            RhythmLayer?.Dispose();
        }

        public void FastFowardOrRewind(TimeSpan amount)
        {
            //Não implementado ainda
        }

        public int GetVolume()
        {
            return (int)(Output.Volume * 100);
        }

        public int GetVolume(AudioLayer layer)
        {
            if (_layerdic.ContainsKey(layer) && _layerdic[layer] != null)
                return (int)(((WaveChannel32)_layerdic[layer]).Volume * 100);

            return 0;
        }

        public void GotoSection(string sectionId)
        {
            //Não implementado ainda
        }

        public bool IsLayerAvaliable(AudioLayer layer)
        {
            return _layerdic.ContainsKey(layer) && _layerdic[layer] != null;
        }


        public void LoadSource(Song song)
        {
            Dispose();
            SongLayer = song.SongLayer != null ? new OggAudioStream(song.SongLayer) : null;
            GuitarLayer = song.GuitarLayer != null ? new OggAudioStream(song.GuitarLayer) : null;
            RhythmLayer = song.RhythmLayer != null ? new OggAudioStream(song.RhythmLayer) : null;
            DrumsLayer = song.DrumsLayer != null ? new OggAudioStream(song.DrumsLayer) : null;

            var sources = new List<WaveStream>() { SongLayer, GuitarLayer, RhythmLayer, DrumsLayer };

            Mixer = new WaveMixerStream32(sources.Where(s => s != null), true);
            Output = new WaveOut();
            Output.Init(Mixer);

            _layerdic = new Dictionary<AudioLayer, OggAudioStream>()
            {
                { AudioLayer.Song, SongLayer },
                { AudioLayer.Guitar, GuitarLayer },
                { AudioLayer.Drums, DrumsLayer },
                { AudioLayer.Rhythm, RhythmLayer }
            };

            CurrentSong = song;
        }

        public void Pause()
        {
            Output.Pause();
        }

        public void Resume()
        {
            Output.Resume();
        }

        public void Play()
        {
            if (Output.PlaybackState == PlaybackState.Stopped)
                Stop();

            Output.Play();
        }

        public void SetVolume(int percent)
        {
            Output.Volume = 0.01f * percent;
        }

        public void SetVolume(int percent, params AudioLayer[] layer)
        {
            foreach (var l in layer)
            {
                if (!_layerdic.ContainsKey(l) || _layerdic[l] == null)
                    continue;

                ((WaveChannel32)_layerdic[l]).Volume = 0.01f * percent;
            }
        }

        public void Stop()
        {
            Output.Stop();
            Mixer.Position = 0;
        }

        public bool? GetMuteState(AudioLayer layer)
        {
            return _layerdic.ContainsKey(layer) ? _layerdic[layer]?.Mute : null;
        }

        public void SetMuteState(AudioLayer layer, bool muted)
        {
            if (_layerdic.ContainsKey(layer) && _layerdic[layer] != null)
                _layerdic[layer].Mute = muted;
        }
    }
}
