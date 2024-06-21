using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CustomControls.Objects
{
    public class Line : IHorizontalScrollable
    {
        private const int OffSet = 0;
        public float X { get; private set; }
        public float? Length { get; private set; }
        public int N { get; }
        public string Name { get; }
        public Rectangle Rectangle { get; }
        public float Divisoes => (Rectangle.Height / 13f / 3f);
        public float Y => Rectangle.Height - (N * Divisoes) - OffSet;
        public float YName => Y - 26;

        public Line(int n, Rectangle rec, string name = null)
        {
            Rectangle = rec;
            X = rec.Width + 0.1f;
            N = n;
            Name = name;
        }

        public void Draw(Graphics g, Font f)
        {
            using (var p = new Pen(Color.Red, 10))
            {
                var l = Length ?? (X * -1f) + Rectangle.Width + 10f;
                g.DrawLine(p, new PointF(X, Y), new PointF(X + l, Y));
            }

            g.DrawString(Name, f, Brushes.Green, new PointF(X, YName));
        }

        public void Scroll(float ammount)
        {
            X -= ammount;
        }

        public bool ShouldDestroy()
        {
            if (Length == null)
                return false;

            return X + Length < 0;
        }

        public void End()
        {
            var w = (X * -1f) + Rectangle.Width + 0.1f;
            Length = w;
        }
    }
}
