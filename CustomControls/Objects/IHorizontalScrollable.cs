using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace CustomControls.Objects
{
    public interface IHorizontalScrollable
    {
        float X { get; }
        float? Length { get; }
        void Draw(Graphics g, Font f);
        void Scroll(float ammount);
        bool ShouldDestroy();
        void End();
    }
}
