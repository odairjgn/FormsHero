using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace FormsHero.UserControls
{
    public class NotePanel : Control
    {
        public NotePanel()
        {
            Dock = DockStyle.Fill;
        }

        private Color _tint = Color.DarkGreen;
        public Color ColorTint
        {
            get
            {
                return _tint;
            }
            set
            {
                _tint = value;
                Invalidate();
            }
        }

        private bool _active;
        public bool Active
        {
            get
            {
                return _active;
            }
            set
            {
                _active = value;
                Invalidate();
            }
        }

        private Color _currentColor => _active ? ControlPaint.LightLight(_tint) : _tint;

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(_currentColor);

            if(_active)
            {
                var dark = ControlPaint.Dark(_tint);
                using(var p = new Pen(dark, 4))
                {
                    e.Graphics.DrawRectangle(p, e.ClipRectangle);
                }
            }
        }

    }
}
