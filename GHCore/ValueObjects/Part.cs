using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GHCore.ValueObjects
{
    public class Part
    {
        public GameInstrument Instrument { get; set; }
        public Difficult[] AvaliableDifficults { get; set; }
        public int Index { get; set; }
        public string Track { get; set; }

        public override string ToString()
        {
            return $"{Index}: [{Instrument}] {Track} ({string.Join(", ", AvaliableDifficults)})";
        }
    }
}
