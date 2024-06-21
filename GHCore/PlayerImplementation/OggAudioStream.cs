using NAudio.Vorbis;
using NAudio.Wave;
using System;
using System.IO;

namespace GHCore.PlayerImplementation
{
    public class OggAudioStream : IDisposable
    {
        private VorbisWaveReader _reader;
        private WaveChannel32 _channel;

        public OggAudioStream(string path)
            : this(new VorbisWaveReader(path)) { }

        public OggAudioStream(FileInfo file)
            : this(file.FullName) { }

        private OggAudioStream(VorbisWaveReader reader)
        {
            _reader = reader;
            _channel = new WaveChannel32(_reader);
        }

        public void Dispose()
        {
            _channel.Dispose();
            _reader.Dispose();
        }

        public WaveStream Stream => _channel;

        public bool Mute
        {
            get
            {
                return _channel.Volume <= 0.1f;
            }
            set
            {
                _channel.Volume = value ? 0.01f : 1f;
            }
        }

        public static implicit operator OggAudioStream(VorbisWaveReader reader) => new OggAudioStream(reader);
        public static implicit operator WaveStream(OggAudioStream ogg) => ogg._channel;
        public static explicit operator VorbisWaveReader(OggAudioStream ogg) => ogg._reader;
        public static explicit operator WaveChannel32(OggAudioStream ogg) => ogg._channel;
    }
}
