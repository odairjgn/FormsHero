using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CustomControls.Objects
{
    public class ScrollNote : IHorizontalScrollable
    {
        public float X { get; private set; }
        public int N { get; }
        public Color Color { get; }
        public float? Length { get; private set; }

        public Rectangle Rectangle { get; }
        public float Divisoes => (Rectangle.Height / 14f);
        public float Y => Rectangle.Height - ((N+1) * 2 * Divisoes);

        public ScrollNote(int n, Rectangle rec, Color c)
        {
            Rectangle = rec;
            X = rec.Width + 0.1f;
            N = n;
            Color = c;
        }

        public void Draw(Graphics g, Font f)
        {
            using (var p = new Pen(Color, 6))
            {
                var l = Length ?? (X * -1f) + Rectangle.Width + 10f;
                g.DrawLine(p, new PointF(X, Y), new PointF(X + l, Y));
                g.DrawEllipse(p, X, Y - 6, 12, 12);
                g.DrawEllipse(Pens.Black, X-3, Y - 9, 18, 18);
            }
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
