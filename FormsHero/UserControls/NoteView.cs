using GHCore.ValueObjects;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace FormsHero.UserControls
{
    public partial class NoteView : UserControl, IResetable
    {
        public NoteView()
        {
            InitializeComponent();
        }

        public Difficult Difficult { get; set; } 
        public GameInstrument Instrument { get; set; }

        public void SetNote(int note, bool active)
        {
            Invoke(new Action(() => {
                switch (note)
                {
                    case 0:
                        notePanel1.Active = active;
                        break;
                    case 1:
                        notePanel2.Active = active;
                        break;
                    case 2:
                        notePanel3.Active = active;
                        break;
                    case 3:
                        notePanel4.Active = active;
                        break;
                    case 4:
                        notePanel5.Active = active;
                        break;
                }
            }));
        }

        public void Reset()
        {
            Enumerable.Range(0, 5).ToList().ForEach(x => SetNote(x, false));
        }
    }
}
