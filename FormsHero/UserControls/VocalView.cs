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
    public partial class VocalView : UserControl, IResetable
    {
        public VocalView()
        {
            InitializeComponent();
        }

        private void textBox1_TextChanged(object sender, EventArgs e)
        {
            tLiric.ScrollToCaret();
        }

        public void AppendText(string conteudo)
        {
            Invoke(new Action(()=> { tLiric.AppendText(conteudo); }));            
        }

        public void ClearText()
        {
            Invoke(new Action(() => { tLiric.Clear(); }));            
        }

        public void SetTone(string name)
        {
            Invoke(new Action(() => 
                { 
                    label1.Text = string.IsNullOrEmpty(name) ? string.Empty : name.Substring(0, name.Length - 1);
                    label3.Text = string.IsNullOrEmpty(name) ? string.Empty : $"{name.Last()}ª oitava";
                }
            ));
            
        }

        public void Reset()
        {
            ClearText();
            ClearTone();
        }

        public void ClearTone()
        {
            Invoke(new Action(() => { label1.Text = ""; }));            
        }
    }
}
