using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace FormsHero
{
    public partial class GameForm : Form
    {
        private List<Keys> _keys;

        public GameForm()
        {
            InitializeComponent();
            DoubleBuffered = true;
            SetStyle(ControlStyles.OptimizedDoubleBuffer, true);
            _keys = new List<Keys> { Keys.D, Keys.F, Keys.J, Keys.K, Keys.L };
        }

        private void GameForm_KeyDown(object sender, KeyEventArgs e)
        {
            var i = _keys.IndexOf(e.KeyCode);

            if (i < 0) return;

            gameNeck1.SetFreteState(i, true);
        }

        private void GameForm_KeyUp(object sender, KeyEventArgs e)
        {
            var i = _keys.IndexOf(e.KeyCode);

            if (i < 0) return;

            gameNeck1.SetFreteState(i, false);
        }
    }
}
