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
    public partial class GameNeck : UserControl
    {
        private Dictionary<int, NotePaintState> _frets;
        private StringFormat _format;

        public GameNeck()
        {
            _frets = new Dictionary<int, NotePaintState>();
            CreateFret(0, Color.Green);
            CreateFret(1, Color.Red);
            CreateFret(2, Color.Yellow);
            CreateFret(3, Color.Blue);
            CreateFret(4, Color.Orange);

            _format = new StringFormat() { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };

            InitializeComponent();
        }

        ~GameNeck()
        {
            foreach(var x in _frets)
            {
                x.Value.Dispose();
            }

            _format.Dispose();
        }

        private string[] _keysBinds = new string[] { };
        public string[] KeysBinds
        {
            get => _keysBinds;
            set
            {
                _keysBinds = value;

                for(var i = 0; i < 5; i++)
                {
                    _frets[i].Key = value == null || i > value.Length - 1 ? null : value[i];
                }

                Invalidate();
            }
        }

        private void CreateFret(int i, Color c)
        {
            _frets.Add(i, new NotePaintState(c, new SolidBrush(ControlPaint.Light(c)), new SolidBrush(ControlPaint.Dark(c)), false));
        }

        private float _divisoes => (Width-Padding.Horizontal) / 10f;
        private Rectangle Retangulo => new Rectangle(0, 0, Width, Height);

        protected override void OnPaint(PaintEventArgs e)
        {
            //base.OnPaint(e);
            e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighSpeed;
            DrawNeck(e.Graphics);
            DrawFrets(e.Graphics);
        }

        private void DrawFrets(Graphics graphics)
        {
            var s = _divisoes * 2;
            var y = Height * 0.8f;

            var i = 0;

            for(int xd = 0; xd < 10; xd+=2)
            {
                var rect = new RectangleF((xd * _divisoes) + Padding.Left, y, s, s);
                graphics.FillEllipse(_frets[i].CurrentBrush, rect);

                if (_frets[i].HasKeyText)
                    graphics.DrawString(_frets[i].Key, Font, _frets[i].Ativo ? Brushes.Black : Brushes.White, rect, _format);

                graphics.DrawEllipse(Pens.Black, rect);
                i++;
            }
        }

        private void DrawNeck(Graphics graphics)
        {
            for(int i =1; i < 10; i+=2)
            {
                var x = (_divisoes * i) + Padding.Left;
                graphics.DrawLine(Pens.Gray, new PointF(x, Padding.Top), new PointF(x, Height - Padding.Bottom));
            }
        }

        public void SetFreteState(int index, bool active)
        {
            if (_frets[index].Ativo == active) return;

            _frets[index].Ativo = active;
            Invalidate();
        }
    }
}
