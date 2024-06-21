using GHCore.PlayerImplementation;
using GHCore.Players;
using GHCore.ValueObjects;
using Melanchall.DryWetMidi.Composing;
using Melanchall.DryWetMidi.Core;
using Melanchall.DryWetMidi.MusicTheory;
using System;
using System.Linq;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using GHCore.Services;
using FormsHero.UserControls;

namespace FormsHero
{
    public partial class Form1 : Form
    {
        private IAudioPlayer _player;
        private IMidiPlayer _midiPlayer;

        public Form1(string pasta)
        {
            InitializeComponent();
            DoubleBuffered = true;

            cbDifficult.DisplayMember = "Key";
            cbDifficult.ValueMember = "Key";
            cbDifficult.DataSource = new[] { Difficult.Easy, Difficult.Medium, Difficult.Hard, Difficult.Expert }.Select(x => new { Key = x }).ToList();
            cbDifficult.SelectedIndex = 3;

            cbInstrument.DisplayMember = "Key";
            cbInstrument.ValueMember = "Key";
            cbInstrument.DataSource = new[] { GameInstrument.Vocals, GameInstrument.Guitar, GameInstrument.Rhythm_Bass, GameInstrument.Drums }.Select(x => new { Key = x }).ToList();
            cbInstrument.SelectedIndex = 0;


            var song = new Song(new DirectoryInfo(pasta));

            _player = new NAudioPlayer();
            _midiPlayer = new DryWetMidiPlayer();
            _midiPlayer.AttachAudioPlayer(_player);
            _midiPlayer.MessageDispached += _midiPlayer_MessageDispached;
            _midiPlayer.LoadSong(song);
            _player.LoadSource(song);

            lDetails.Text = song.ToString() + Environment.NewLine + song.GetMetadata().ToString();

            try
            {
                pCapa.Image = Image.FromFile(song.CoverPath);
            }
            catch
            {

            }
        }

        private int _r = 0;
        GameInstrument _instr = GameInstrument.Vocals;
        Difficult _diff = Difficult.Expert;

        private void _midiPlayer_MessageDispached(int track, MidiEvent m)
        {
            var trackType = _midiPlayer.Tracks[track];

            switch (trackType)
            {
                case GameInstrument.None:
                    break;
                case GameInstrument.UnKnow:
                    break;
                case GameInstrument.Guitar:
                    if (m is NoteOnEvent nog)
                    {
                        HandleNote(nog.NoteNumber, trackType, true);
                    }
                    else if (m is NoteOffEvent noffg)
                    {
                        HandleNote(noffg.NoteNumber, trackType, false);
                    }
                    break;
                case GameInstrument.Rhythm_Bass:
                    if (m is NoteOnEvent nob)
                    {
                        HandleNote(nob.NoteNumber, trackType, true);
                    }
                    else if (m is NoteOffEvent noffb)
                    {
                        HandleNote(noffb.NoteNumber, trackType, false);
                    }
                    break;
                case GameInstrument.Drums:
                    if (m is NoteOnEvent nod)
                    {
                        HandleNote(nod.NoteNumber, trackType, true);
                    }
                    else if (m is NoteOffEvent noffd)
                    {
                        HandleNote(noffd.NoteNumber, trackType, false);
                    }
                    break;
                case GameInstrument.Vocals:
                    if (m is LyricEvent lyric)
                    {
                        if (_instr == GameInstrument.Vocals)
                            scrollNoteView1.SendText(lyric.Text);

                        if (lyric.Text == "+")
                            vocalView1.AppendText("▲");
                        else if (lyric.Text.EndsWith("#"))
                            vocalView1.AppendText(lyric.Text.Substring(0, lyric.Text.Length - 1) + "►");
                        else if (lyric.Text.EndsWith("-"))
                            vocalView1.AppendText(lyric.Text.Substring(0, lyric.Text.Length - 1) + "▫");
                        else if (lyric.Text.EndsWith("="))
                            vocalView1.AppendText(lyric.Text.Substring(0, lyric.Text.Length - 1) + "↔");
                        else
                            vocalView1.AppendText(lyric.Text + " ");
                    }
                    else if (m is NoteOnEvent tone)
                    {
                        if (tone.NoteNumber < 100)
                        {
                            var n = Note.Get(tone.NoteNumber).ToString();
                            vocalView1.SetTone(n);

                            if (_instr == GameInstrument.Vocals)
                                scrollNoteView1.SendEvent(tone.NoteNumber - 50, true, n.Substring(0, n.Length - 1));
                        }
                        else if (tone.NoteNumber >= 100)
                            vocalView1.ClearText();

                        if (ckTocarNotas.Checked && tone.NoteNumber < 100)
                        {
                            midiOut1.SendEvent(tone);
                        }
                    }
                    else if (m is NoteOffEvent toneoff)
                    {
                        if (toneoff.NoteNumber < 100)
                        {
                            vocalView1.SetTone("");

                            if (_instr == GameInstrument.Vocals)
                                scrollNoteView1.SendEvent(toneoff.NoteNumber - 50, false);
                        }

                        if (ckTocarNotas.Checked && toneoff.NoteNumber < 100)
                        {
                            midiOut1.SendEvent(toneoff);
                        }
                    }
                    break;
                case GameInstrument.Piano:
                    break;
                case GameInstrument.Beat:
                    if (m is NoteOnEvent onev)
                    {
                        var color = onev.NoteNumber == 12 ? Color.Green : Color.Red;
                        _r = onev.NoteNumber == 12 ? 0 : _r + 1;
                        ChangeBackColor(pRitmo, color);
                        ChangeText(pRitmo, _r.ToString());
                    }
                    else if (m is NoteOffEvent)
                    {
                        ChangeBackColor(pRitmo, Color.White);
                    }
                    break;
                case GameInstrument.Events:
                    if (m is TextEvent ev)
                        ChangeText(pEventos, ev.Text);
                    break;
                case GameInstrument.Venues:
                    if (m is TextEvent v)
                        ChangeText(pAmbiente, v.Text);
                    break;
                case GameInstrument.RawEvents:
                    ChangeText(pRaw, m.ToString());
                    break;
            }
        }

        void HandleNote(byte note, GameInstrument instrument, bool active)
        {
            var n = Parser.GetGemIndex(note, instrument);

            if (n.index == -1) return;


            var ctrol = tableLayoutPanel1.Controls.OfType<NoteView>().FirstOrDefault(c => c.Difficult == n.difficult && c.Instrument == instrument);

            if (ctrol != null)
                ctrol.SetNote(n.index, active);

            if (instrument == _instr && _diff == n.difficult)
            {
                scrollNoteView1.SendNote(n.index, active);
            }
        }

        void ChangeBackColor(Control c, Color cl)
        {
            Invoke(new Action(() => { c.BackColor = cl; }));
        }

        void ChangeText(Label l, string t)
        {
            Invoke(new Action(() => { l.Text = t; }));
        }

        private void tRefreshInfo_Tick(object sender, System.EventArgs e)
        {
            lStatus.Text = _player.State.ToString();
            lTime.Text = $"{_player.Position.Hours:D2}:{_player.Position.Minutes:D2}:{_player.Position.Seconds:D2}";
        }

        private void cBand_CheckedChanged(object sender, System.EventArgs e)
        {
            _player.SetMuteState(AudioLayer.Song, !cBand.Checked);
        }

        private void cGuitar_CheckedChanged(object sender, System.EventArgs e)
        {
            _player.SetMuteState(AudioLayer.Guitar, !cGuitar.Checked);
        }

        private void cDrum_CheckedChanged(object sender, System.EventArgs e)
        {
            _player.SetMuteState(AudioLayer.Drums, !cDrum.Checked);
        }

        private void cBass_CheckedChanged(object sender, System.EventArgs e)
        {
            _player.SetMuteState(AudioLayer.Rhythm, !cBass.Checked);
        }

        private void bPlay_Click(object sender, System.EventArgs e)
        {
            _midiPlayer.Play();
        }

        private void bPause_Click(object sender, System.EventArgs e)
        {
            _midiPlayer.Pause();
        }

        private void bResume_Click(object sender, System.EventArgs e)
        {
            _midiPlayer.Resume();
        }

        private void bStop_Click(object sender, System.EventArgs e)
        {
            _midiPlayer.Stop();
            Reset();
        }

        void Reset()
        {
            foreach (var res in Controls.OfType<IResetable>())
                res.Reset();

            pAmbiente.Text = pRaw.Text = pEventos.Text = "";
            pRitmo.Text = "-";
            pRitmo.BackColor = Color.White;
        }

        private void cbInstrument_SelectedIndexChanged(object sender, EventArgs e)
        {
            _instr = (GameInstrument)cbInstrument.SelectedValue;
            cbDifficult.Enabled = _instr != GameInstrument.Vocals;
            scrollNoteView1.ClearAllObjects();
        }

        private void cbDifficult_SelectedIndexChanged(object sender, EventArgs e)
        {
            _diff = (Difficult)cbDifficult.SelectedValue;
            scrollNoteView1.ClearAllObjects();
        }

        protected override void OnClosed(EventArgs e)
        {
            base.OnClosed(e);
            tRefreshInfo.Stop();
            _midiPlayer.Stop();
            _midiPlayer.Dispose();
            _player.Dispose();
        }
    }
}
