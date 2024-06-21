using System;

namespace GHCore.ValueObjects
{
    [Flags]
    public enum NoteFlags
    {
        Green = 0b_0000_0000_0000_0001,
        Red = 0b_0000_0000_0000_0010,
        Yellow = 0b_0000_0000_0000_0100,
        Blue = 0b_0000_0000_0000_1000,
        Orange = 0b_0000_0000_0001_0000,
        IsSoloNote = 0b_0000_0000_0010_0000,
        IsBattleNote = 0b_0000_0000_0100_0000,
        IsSpecialNote = 0b_0000_0000_1000_0000,
        DrumPedal = 0b_0000_0001_0000_0000,
        BassSlep = 0b_0000_0010_0000_0000,
        FreeStyle = 0b_0000_0100_0000_0000,
        VocalClap = 0b_0000_1000_0000_0000
    }
}
