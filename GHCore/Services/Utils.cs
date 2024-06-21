using GHCore.ValueObjects;
using System.IO;
using System.Linq;

namespace GHCore.Services
{
    public static class Utils
    {
        public static bool IsSong(DirectoryInfo dir)
        {
            var ini = Path.Combine(dir.FullName, "Song.ini");
            return File.Exists(ini);
        }

        public static SafeDictionary<string, string> ReadIni(string path)
        {
            var initext = File.ReadAllLines(path);

            return new SafeDictionary<string, string>(initext.Where(l => l.Contains("=")).Select(l => l.Split('=')).ToDictionary(l => l[0].Trim().ToLower(), l => l[1].Trim()));
        }


    }

}