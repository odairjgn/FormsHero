using GHCore.Services;
using NAudio.Midi;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GHCore.ValueObjects
{
    public class SongGamePlayMetaData
    {
        public Part[] Instruments { get; private set; }

        private SongGamePlayMetaData() { }


        private static List<byte> GetNotesFromTrackDistinct(MidiFile file, int index)
        {
            return file.Events.GetTrackEvents(index).Where(e => e.CommandCode == MidiCommandCode.NoteOn).Cast<NoteOnEvent>().Select(n => (byte)n.NoteNumber).Distinct().ToList();
        }
        private static IList<string> GetTrackNames(MidiFile file)
        {
            return file.Events.Select(t => (TextEvent)(t.FirstOrDefault(m => m.CommandCode == MidiCommandCode.MetaEvent && ((MetaEvent)m).MetaEventType == MetaEventType.SequenceTrackName) as MetaEvent)).Select(m => m?.Text ?? "").ToList();
        }

        public static SongGamePlayMetaData ReadMetaData(MidiFile file)
        {
            var tracks = GetTrackNames(file).ToList();

            var dic = Parser.GetTracksIdsDictionary();
            var allnames = dic.SelectMany(v => v.Value).ToList();

            var instruments = new List<Part>();

            //Versões mais antigas do Frets On fire só tinham suporte a guitarra
            if (!tracks.All(t => allnames.Contains(t)) && tracks.Count == 1)
            {
                instruments.Add(new Part() { Instrument = GameInstrument.Guitar });
            }
            else
            {
                foreach (var t in tracks)
                {
                    if (dic.Any(i => i.Value.Contains(t)))
                        instruments.Add(new Part() { Track = t, Instrument = dic.FirstOrDefault(i => i.Value.Contains(t)).Key });
                    else if (t.Contains("GEMS"))
                        instruments.Add(new Part() { Track = t, Instrument = GameInstrument.Guitar });
                    else
                        instruments.Add(new Part() { Track = t, Instrument = GameInstrument.None });
                }
            }

            var index = 0;
            foreach (var i in instruments)
            {
                var diff = new List<Difficult>();

                if (i.Instrument != GameInstrument.None)
                {
                    var notes = GetNotesFromTrackDistinct(file, index);

                    if (notes.Intersect(Parser.EasyGems).Any())
                        diff.Add(Difficult.Easy);

                    if (notes.Intersect(Parser.MediumGems).Any())
                        diff.Add(Difficult.Medium);

                    if (notes.Intersect(Parser.HardGems).Any())
                        diff.Add(Difficult.Hard);

                    if (notes.Intersect(Parser.ExpertGems).Any())
                        diff.Add(Difficult.Expert);
                }

                i.AvaliableDifficults = diff.ToArray();

                //O player de Midi considera o primeiro track como 1
                i.Index = index + 1;

                index++;
            }

            return new SongGamePlayMetaData() { Instruments = instruments.ToArray() };
        }

        public override string ToString()
        {
            return string.Join(Environment.NewLine, Instruments.Select(i => i.ToString()));
        }
    }
}
