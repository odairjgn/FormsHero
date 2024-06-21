using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CustomControls.Objects
{
    public class TextS : IHorizontalScrollable
    {
        public float X { get; private set; }
        public string Text { get; }
        public float? Length { get; private set; }

        public Rectangle Rectangle { get; }
        public float Divisoes => (Rectangle.Height / 13f / 3f);
        public float Y => 5;

        public TextS(string text, Rectangle rec)
        {
            Rectangle = rec;
            X = rec.Width + 0.1f;
            Text = text;
            Length = text.Length * 20;
        }

        public void Draw(Graphics g, Font f)
        {
            var l = Length ?? (X * -1f) + Rectangle.Width + 10f;
            g.DrawString(Text, f, Brushes.Black, new PointF(X, Y));

        }

        public void Scroll(float ammount)
        {
            X -= ammount;
        }

        public bool ShouldDestroy()
        {
            return X + Length < 0;
        }

        public void End()
        {
        }

    }
}
