using Melanchall.DryWetMidi.Common;
using Melanchall.DryWetMidi.Core;
using Melanchall.DryWetMidi.Devices;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FormsHero.UserControls
{
    public partial class MidiOut : Component
    {
        private OutputDevice _outputDevice;

        public MidiOut()
        {
            InitializeComponent();
            Init();
        }

        public MidiOut(IContainer container)
        {
            container.Add(this);

            InitializeComponent();
            Init();
        }

        private void Init()
        {
            _outputDevice = OutputDevice.GetByName("Microsoft GS Wavetable Synth");
            _outputDevice.PrepareForEventsSending();
        }

        public void SendEvent(NoteEvent noteOnEvent)
        {
            _outputDevice.SendEvent(noteOnEvent);
        }

        ~MidiOut()
        {
            _outputDevice.Dispose();
        }
    }
}