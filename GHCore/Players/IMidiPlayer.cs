using GHCore.ValueObjects;
using Melanchall.DryWetMidi.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.Players
{
    public delegate void MidiMessageEvent(int track, MidiEvent m);
    public interface IMidiPlayer : IDisposable
    {
        event MidiMessageEvent MessageDispached;
        void LoadSong(Song song);        
        void AttachAudioPlayer(IAudioPlayer audioPlayer);
        void Play();
        void Pause();
        void Resume();
        void Stop();
        Dictionary<int, GameInstrument> Tracks { get; }
    }
}
