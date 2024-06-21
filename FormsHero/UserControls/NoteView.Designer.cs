
namespace FormsHero.UserControls
{
    partial class NoteView
    {
        /// <summary> 
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary> 
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Component Designer generated code

        /// <summary> 
        /// Required method for Designer support - do not modify 
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.tableLayoutPanel1 = new System.Windows.Forms.TableLayoutPanel();
            this.notePanel5 = new FormsHero.UserControls.NotePanel();
            this.notePanel4 = new FormsHero.UserControls.NotePanel();
            this.notePanel3 = new FormsHero.UserControls.NotePanel();
            this.notePanel2 = new FormsHero.UserControls.NotePanel();
            this.notePanel1 = new FormsHero.UserControls.NotePanel();
            this.tableLayoutPanel1.SuspendLayout();
            this.SuspendLayout();
            // 
            // tableLayoutPanel1
            // 
            this.tableLayoutPanel1.ColumnCount = 5;
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 20F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 20F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 20F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 20F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 20F));
            this.tableLayoutPanel1.Controls.Add(this.notePanel5, 4, 0);
            this.tableLayoutPanel1.Controls.Add(this.notePanel4, 3, 0);
            this.tableLayoutPanel1.Controls.Add(this.notePanel3, 2, 0);
            this.tableLayoutPanel1.Controls.Add(this.notePanel2, 1, 0);
            this.tableLayoutPanel1.Controls.Add(this.notePanel1, 0, 0);
            this.tableLayoutPanel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.tableLayoutPanel1.Location = new System.Drawing.Point(0, 0);
            this.tableLayoutPanel1.Name = "tableLayoutPanel1";
            this.tableLayoutPanel1.RowCount = 1;
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 100F));
            this.tableLayoutPanel1.Size = new System.Drawing.Size(201, 39);
            this.tableLayoutPanel1.TabIndex = 0;
            // 
            // notePanel5
            // 
            this.notePanel5.Active = false;
            this.notePanel5.ColorTint = System.Drawing.Color.FromArgb(((int)(((byte)(255)))), ((int)(((byte)(128)))), ((int)(((byte)(0)))));
            this.notePanel5.Dock = System.Windows.Forms.DockStyle.Fill;
            this.notePanel5.Location = new System.Drawing.Point(163, 3);
            this.notePanel5.Name = "notePanel5";
            this.notePanel5.Size = new System.Drawing.Size(35, 33);
            this.notePanel5.TabIndex = 4;
            this.notePanel5.Text = "notePanel5";
            // 
            // notePanel4
            // 
            this.notePanel4.Active = false;
            this.notePanel4.ColorTint = System.Drawing.Color.FromArgb(((int)(((byte)(0)))), ((int)(((byte)(0)))), ((int)(((byte)(192)))));
            this.notePanel4.Dock = System.Windows.Forms.DockStyle.Fill;
            this.notePanel4.Location = new System.Drawing.Point(123, 3);
            this.notePanel4.Name = "notePanel4";
            this.notePanel4.Size = new System.Drawing.Size(34, 33);
            this.notePanel4.TabIndex = 3;
            this.notePanel4.Text = "notePanel4";
            // 
            // notePanel3
            // 
            this.notePanel3.Active = false;
            this.notePanel3.ColorTint = System.Drawing.Color.Gold;
            this.notePanel3.Dock = System.Windows.Forms.DockStyle.Fill;
            this.notePanel3.Location = new System.Drawing.Point(83, 3);
            this.notePanel3.Name = "notePanel3";
            this.notePanel3.Size = new System.Drawing.Size(34, 33);
            this.notePanel3.TabIndex = 2;
            this.notePanel3.Text = "notePanel3";
            // 
            // notePanel2
            // 
            this.notePanel2.Active = false;
            this.notePanel2.ColorTint = System.Drawing.Color.Red;
            this.notePanel2.Dock = System.Windows.Forms.DockStyle.Fill;
            this.notePanel2.Location = new System.Drawing.Point(43, 3);
            this.notePanel2.Name = "notePanel2";
            this.notePanel2.Size = new System.Drawing.Size(34, 33);
            this.notePanel2.TabIndex = 1;
            this.notePanel2.Text = "notePanel2";
            // 
            // notePanel1
            // 
            this.notePanel1.Active = false;
            this.notePanel1.ColorTint = System.Drawing.Color.Green;
            this.notePanel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.notePanel1.Location = new System.Drawing.Point(3, 3);
            this.notePanel1.Name = "notePanel1";
            this.notePanel1.Size = new System.Drawing.Size(34, 33);
            this.notePanel1.TabIndex = 0;
            this.notePanel1.Text = "notePanel1";
            // 
            // NoteView
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.Controls.Add(this.tableLayoutPanel1);
            this.Name = "NoteView";
            this.Size = new System.Drawing.Size(201, 39);
            this.tableLayoutPanel1.ResumeLayout(false);
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.TableLayoutPanel tableLayoutPanel1;
        private NotePanel notePanel5;
        private NotePanel notePanel4;
        private NotePanel notePanel3;
        private NotePanel notePanel2;
        private NotePanel notePanel1;
    }
}
