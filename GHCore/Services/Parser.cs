using GHCore.ValueObjects;
using System.Collections.Generic;

namespace GHCore.Services
{
    public class Parser
    {
        //{
        //    TRACK_NAME_ID_MAP = 
        //'guitar': [GUITAR_PART, PRO_GUITAR_PART],
        //'rhythm': [RHYTHM_PART, BASS_PART, PRO_BASS_PART],
        //'drums': [DRUM_PART, PRO_DRUM_PART],
        //'keys': [KEYS_PART, PRO_KEYS_PART],
        //'vocals': [VOCAL_PART],

        public static Dictionary<GameInstrument, string[]> GetTracksIdsDictionary()
        {
            var dic = new Dictionary<GameInstrument, string[]>();

            dic.Add(GameInstrument.Guitar, new[] { "PART GUITAR", "PART LEAD" });
            dic.Add(GameInstrument.Rhythm_Bass, new[] { "PART RHYTHM", "PART BASS" });
            dic.Add(GameInstrument.Drums, new[] { "PART DRUMS" });
            dic.Add(GameInstrument.Piano, new[] { "PART KEYS" });
            dic.Add(GameInstrument.Vocals, new[] { "PART VOCALS" });
            dic.Add(GameInstrument.RawEvents, new[] { "RAWKSD" });
            dic.Add(GameInstrument.Events, new[] { "EVENTS" });
            dic.Add(GameInstrument.Beat, new[] { "BEAT" });
            dic.Add(GameInstrument.Venues, new[] { "VENUE" });

            return dic;
        }

        internal static int GetGemIndex(Difficult difficult, int midi)
        {
            byte[] array = null;
            var n = (byte)midi;

            switch (difficult)
            {
                case Difficult.Easy:
                    array = EasyGems;
                    break;
                case Difficult.Medium:
                    array = MediumGems;
                    break;
                case Difficult.Hard:
                    array = HardGems;
                    break;
                case Difficult.Expert:
                    array = ExpertGems;
                    break;
            }

            for (int i = 0; i < array.Length; i++)
            {
                if (n == array[i]) return i;
            }

            return -1;
        }

        private const byte EXP_GEM_0 = 0x60;
        private const byte EXP_GEM_1 = 0x61;
        private const byte EXP_GEM_2 = 0x62;
        private const byte EXP_GEM_3 = 0x63;
        private const byte EXP_GEM_4 = 0x64;

        public static readonly byte[] ExpertGems = { EXP_GEM_0, EXP_GEM_1, EXP_GEM_2, EXP_GEM_3, EXP_GEM_4 };

        private const byte HAR_GEM_0 = 0x54;
        private const byte HAR_GEM_1 = 0x55;
        private const byte HAR_GEM_2 = 0x56;
        private const byte HAR_GEM_3 = 0x57;
        private const byte HAR_GEM_4 = 0x58;

        public static readonly byte[] HardGems = { HAR_GEM_0, HAR_GEM_1, HAR_GEM_2, HAR_GEM_3, HAR_GEM_4 };

        private const byte MED_GEM_0 = 0x48;
        private const byte MED_GEM_1 = 0x49;
        private const byte MED_GEM_2 = 0x4a;
        private const byte MED_GEM_3 = 0x4b;
        private const byte MED_GEM_4 = 0x4c;

        public static readonly byte[] MediumGems = { MED_GEM_0, MED_GEM_1, MED_GEM_2, MED_GEM_3, MED_GEM_4 };

        private const byte EAS_GEM_0 = 0x3c;
        private const byte EAS_GEM_1 = 0x3d;
        private const byte EAS_GEM_2 = 0x3e;
        private const byte EAS_GEM_3 = 0x3f;
        private const byte EAS_GEM_4 = 0x40;

        public static readonly byte[] EasyGems = { EAS_GEM_0, EAS_GEM_1, EAS_GEM_2, EAS_GEM_3, EAS_GEM_4 };

        public static (int index, Difficult difficult) GetGemIndex(byte note, GameInstrument instrument)
        {
            int index = -1;

            index = FindGem(note, ExpertGems);
            if (index > -1) 
                return (index, Difficult.Expert);

            index = FindGem(note, HardGems);
            if (index > -1)
                return (index, Difficult.Hard);

            index = FindGem(note, MediumGems);
            if (index > -1)
                return (index, Difficult.Medium);

            index = FindGem(note, EasyGems);
            if (index > -1)
                return (index, Difficult.Easy);

            return (index, default);
        }

        private static int FindGem(byte v, byte[] vls)
        {
            for (int i = 0; i < vls.Length; i++)
            {
                if (vls[i] == v)
                    return i;
            }

            return -1;
        }
    }
}
