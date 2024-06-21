using GHCore.ValueObjects;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace FormsHero
{
    public partial class SongSelect : Form
    {
        public SongSelect()
        {
            InitializeComponent();
        }

        private void SongSelect_Load(object sender, EventArgs e)
        {
            var pasta = new SongFolder(new DirectoryInfo(Path.Combine(Directory.GetCurrentDirectory(), "musica")), null);
            listBox1.DataSource = pasta.Songs.ToList();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            var item = listBox1.SelectedItem as Song;
            var form = new Form1(item.Directory.FullName);
            form.ShowDialog();
        }
    }
}
