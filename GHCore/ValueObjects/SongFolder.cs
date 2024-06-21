using GHCore.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.ValueObjects
{
    public class SongFolder
    {
        public SongFolder(DirectoryInfo dir, SongFolder parent)
        {
            Parent = parent;
            Name = dir.Name;
            Path = dir.FullName;
        }

        public SongFolder Parent { get; private set; }
        public string Name { get; }
        public string Path { get; }
        public string CoverPath
        {
            get
            {
                var cover = System.IO.Path.Combine(Path, "label.png");
                return File.Exists(cover) ? cover : null;
            }
        }

        public IEnumerable<SongFolder> SubFolders
        {
            get
            {
                var dir = new DirectoryInfo(Path);

                foreach (var sub in dir.GetDirectories("*", SearchOption.TopDirectoryOnly))
                {
                    if (!Utils.IsSong(sub))
                        yield return new SongFolder(sub, this);
                }
            }
        }
        public IEnumerable<Song> Songs
        {
            get
            {
                var dir = new DirectoryInfo(Path);

                foreach (var sub in dir.GetDirectories("*", SearchOption.TopDirectoryOnly))
                {
                    if (Utils.IsSong(sub))
                        yield return new Song(sub, this);
                }
            }
        }

    }
}
