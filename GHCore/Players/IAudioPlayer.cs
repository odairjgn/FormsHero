using GHCore.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.Players
{
    public interface IAudioPlayer : IDisposable
    {
        void LoadSource(Song song);
        TimeSpan Position { get; set; }
        PlayerState State { get; }
        void Play();
        void Pause();
        void Resume();
        void Stop();
        void FastFowardOrRewind(TimeSpan amount);        
        Song CurrentSong { get; }
        void SetVolume(int percent);
        void SetVolume(int percent, params AudioLayer[] layer);
        bool? GetMuteState(AudioLayer layer);
        void SetMuteState(AudioLayer layer, bool muted);
        int GetVolume();
        int GetVolume(AudioLayer layer);
        bool IsLayerAvaliable(AudioLayer layer);
        void GotoSection(string sectionId);
    }
}
