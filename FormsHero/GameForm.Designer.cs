
namespace FormsHero
{
    partial class GameForm
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

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.gameNeck1 = new FormsHero.UserControls.GameNeck();
            this.SuspendLayout();
            // 
            // gameNeck1
            // 
            this.gameNeck1.KeysBinds = new string[] {
        "D",
        "F",
        "J",
        "K",
        "L"};
            this.gameNeck1.Location = new System.Drawing.Point(13, 13);
            this.gameNeck1.Name = "gameNeck1";
            this.gameNeck1.Padding = new System.Windows.Forms.Padding(3);
            this.gameNeck1.Size = new System.Drawing.Size(150, 229);
            this.gameNeck1.TabIndex = 0;
            // 
            // GameForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(251, 270);
            this.Controls.Add(this.gameNeck1);
            this.KeyPreview = true;
            this.Name = "GameForm";
            this.Text = "GameForm";
            this.KeyDown += new System.Windows.Forms.KeyEventHandler(this.GameForm_KeyDown);
            this.KeyUp += new System.Windows.Forms.KeyEventHandler(this.GameForm_KeyUp);
            this.ResumeLayout(false);

        }

        #endregion

        private UserControls.GameNeck gameNeck1;
    }
}