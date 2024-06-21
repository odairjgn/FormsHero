using CustomControls.Objects;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace CustomControls
{
    public partial class ScrollNoteView : UserControl
    {
        public ScrollNoteView()
        {
            DoubleBuffered = true;
            InitializeComponent();
            FontLyric = new Font(new FontFamily("Arial"), 12, FontStyle.Bold);
        }

        private List<IHorizontalScrollable> _itens = new List<IHorizontalScrollable>();

        public Font FontLyric { get; set; }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighSpeed;
            base.OnPaint(e);

            e.Graphics.FillRectangle(Brushes.LightYellow, 0, 0, Width, 30);

            lock (this)
            {
                foreach (var scrollable in _itens)
                {
                    scrollable.Draw(e.Graphics, FontLyric);
                } 
            }
        }

        public float Speed { get; set; } = 10f;

        protected void ScrollItens()
        {
            lock (this)
            {
                _itens.ForEach(i => i.Scroll(Speed));
                _itens.RemoveAll(i => i.ShouldDestroy());
            }
        }

        private Color[] _colors = new[] { Color.Green, Color.Red, Color.Yellow, Color.Blue, Color.Orange };

        public void SendNote(int index, bool active)
        {
            lock(this)
            {
                if(active)
                {
                    _itens.Add(new ScrollNote(index, new Rectangle(0, 0, Width, Height), _colors[index]));
                }
                else
                {
                    foreach (var i in _itens.OfType<ScrollNote>().Where(x => x.Length == null && x.N == index))
                    {
                        i.End();
                    }
                }
            }
        }

        public void ClearAllObjects()
        {
            lock (this)
            {
                _itens.Clear();
            }
        }

        public void SendEvent(int note, bool active, string name = null)
        {
            lock (this)
            {
                if (active)
                {
                    _itens.Add(new Line(note, new Rectangle(0, 0, Width, Height), name));
                }
                else
                {
                    foreach (var i in _itens.OfType<Line>().Where(x => x.Length == null))
                    {
                        i.End();
                    }
                } 
            }
        }

        public void SendText(string text)
        {
            lock(this)
            {
                _itens.Add(new TextS(text, new Rectangle(0, 0, Width, Height)));
            }
        }

        private void timer1_Tick(object sender, EventArgs e)
        {
            ScrollItens();
            Invalidate();
        }

    }
}
