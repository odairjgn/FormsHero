using GHCore.Services;
using NAudio.Midi;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.ValueObjects
{
    public class Song
    {
        public Song(DirectoryInfo directory, SongFolder parent = null)
        {
            Directory = directory;
            Parent = parent;
            var inipath = System.IO.Path.Combine(directory.FullName, "song.ini");
            var ini = Utils.ReadIni(inipath);

            Album = ini["album"];
            Name = ini["name"];
            Year = ini["year"];
            Artist = ini["artist"];
        }

        public DirectoryInfo Directory { get; }

        internal string GetMidi()
        {
            return MidiUneditedPath == null ? MidiPath.FullName : MidiUneditedPath.FullName;
        }

        public SongFolder Parent { get; }
        public string Album { get; }
        public string Name { get; }
        public string Year { get; }
        public string Artist { get; }

        public SongGamePlayMetaData GetMetadata()
        {
            var midi = new MidiFile(GetMidi());
            return SongGamePlayMetaData.ReadMetaData(midi);
        }

        public string CoverPath
        {
            get
            {
                var cover = System.IO.Path.Combine(Directory.FullName, "album.png");
                if (File.Exists(cover)) return cover;

                cover = System.IO.Path.Combine(Directory.FullName, "label.png");
                return File.Exists(cover) ? cover : null;
            }
        }


        public FileInfo MidiPath
        {
            get
            {
                return new FileInfo(Path.Combine(Directory.FullName, "notes.mid"));
            }
        }

        public FileInfo MidiUneditedPath
        {
            get
            {
                var path = System.IO.Path.Combine(Directory.FullName, "notes-unedited.mid");
                return File.Exists(path) ? new FileInfo(path) : null;
            }
        }

        public FileInfo GuitarLayer
        {
            get
            {
                var file = Path.Combine(Directory.FullName, "guitar.ogg");
                return File.Exists(file) ? new FileInfo(file) : null;
            }
        }

        public FileInfo RhythmLayer
        {
            get
            {
                var file = Path.Combine(Directory.FullName, "rhythm.ogg");
                return File.Exists(file) ? new FileInfo(file) : null;
            }
        }

        public FileInfo DrumsLayer
        {
            get
            {
                var file = Path.Combine(Directory.FullName, "drums.ogg");
                return File.Exists(file) ? new FileInfo(file) : null;
            }
        }

        public FileInfo SongLayer
        {
            get
            {
                var file = Path.Combine(Directory.FullName, "song.ogg");
                return File.Exists(file) ? new FileInfo(file) : null;
            }
        }

        public FileInfo PreviewLayer
        {
            get
            {
                var file = Path.Combine(Directory.FullName, "preview.ogg");
                return File.Exists(file) ? new FileInfo(file) : null;
            }
        }

        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.AppendLine(Name);
            sb.AppendLine($"Artista: {Artist}");

            if (!string.IsNullOrEmpty(Album))
                sb.AppendLine($"Álbum: {Album}");

            if (!string.IsNullOrEmpty(Year))
                sb.AppendLine($"Ano: {Year}");

            return sb.ToString();
        }
    }
}
