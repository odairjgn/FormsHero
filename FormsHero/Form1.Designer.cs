
namespace FormsHero
{
    partial class Form1
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
            this.components = new System.ComponentModel.Container();
            this.bPlay = new System.Windows.Forms.Button();
            this.bPause = new System.Windows.Forms.Button();
            this.bResume = new System.Windows.Forms.Button();
            this.bStop = new System.Windows.Forms.Button();
            this.cBand = new System.Windows.Forms.CheckBox();
            this.cGuitar = new System.Windows.Forms.CheckBox();
            this.cDrum = new System.Windows.Forms.CheckBox();
            this.cBass = new System.Windows.Forms.CheckBox();
            this.lTime = new System.Windows.Forms.Label();
            this.lStatus = new System.Windows.Forms.Label();
            this.tRefreshInfo = new System.Windows.Forms.Timer(this.components);
            this.tableLayoutPanel1 = new System.Windows.Forms.TableLayoutPanel();
            this.groupBox4 = new System.Windows.Forms.GroupBox();
            this.pRitmo = new System.Windows.Forms.Label();
            this.groupBox2 = new System.Windows.Forms.GroupBox();
            this.pAmbiente = new System.Windows.Forms.Label();
            this.groupBox3 = new System.Windows.Forms.GroupBox();
            this.pEventos = new System.Windows.Forms.Label();
            this.label1 = new System.Windows.Forms.Label();
            this.label9 = new System.Windows.Forms.Label();
            this.label8 = new System.Windows.Forms.Label();
            this.label7 = new System.Windows.Forms.Label();
            this.label6 = new System.Windows.Forms.Label();
            this.label5 = new System.Windows.Forms.Label();
            this.label4 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.pRaw = new System.Windows.Forms.Label();
            this.panel1 = new System.Windows.Forms.Panel();
            this.lDetails = new System.Windows.Forms.TextBox();
            this.pCapa = new System.Windows.Forms.PictureBox();
            this.cbInstrument = new System.Windows.Forms.ComboBox();
            this.cbDifficult = new System.Windows.Forms.ComboBox();
            this.scrollNoteView1 = new CustomControls.ScrollNoteView();
            this.noteView9 = new FormsHero.UserControls.NoteView();
            this.noteView10 = new FormsHero.UserControls.NoteView();
            this.noteView11 = new FormsHero.UserControls.NoteView();
            this.noteView12 = new FormsHero.UserControls.NoteView();
            this.noteView5 = new FormsHero.UserControls.NoteView();
            this.noteView6 = new FormsHero.UserControls.NoteView();
            this.noteView7 = new FormsHero.UserControls.NoteView();
            this.noteView8 = new FormsHero.UserControls.NoteView();
            this.noteView4 = new FormsHero.UserControls.NoteView();
            this.noteView3 = new FormsHero.UserControls.NoteView();
            this.noteView2 = new FormsHero.UserControls.NoteView();
            this.noteView1 = new FormsHero.UserControls.NoteView();
            this.vocalView1 = new FormsHero.UserControls.VocalView();
            this.midiOut1 = new FormsHero.UserControls.MidiOut(this.components);
            this.ckTocarNotas = new System.Windows.Forms.CheckBox();
            this.tableLayoutPanel1.SuspendLayout();
            this.groupBox4.SuspendLayout();
            this.groupBox2.SuspendLayout();
            this.groupBox3.SuspendLayout();
            this.groupBox1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.pCapa)).BeginInit();
            this.SuspendLayout();
            // 
            // bPlay
            // 
            this.bPlay.Location = new System.Drawing.Point(13, 13);
            this.bPlay.Name = "bPlay";
            this.bPlay.Size = new System.Drawing.Size(75, 23);
            this.bPlay.TabIndex = 0;
            this.bPlay.Text = "Play";
            this.bPlay.UseVisualStyleBackColor = true;
            this.bPlay.Click += new System.EventHandler(this.bPlay_Click);
            // 
            // bPause
            // 
            this.bPause.Location = new System.Drawing.Point(13, 42);
            this.bPause.Name = "bPause";
            this.bPause.Size = new System.Drawing.Size(75, 23);
            this.bPause.TabIndex = 1;
            this.bPause.Text = "Pause";
            this.bPause.UseVisualStyleBackColor = true;
            this.bPause.Click += new System.EventHandler(this.bPause_Click);
            // 
            // bResume
            // 
            this.bResume.Location = new System.Drawing.Point(13, 71);
            this.bResume.Name = "bResume";
            this.bResume.Size = new System.Drawing.Size(75, 23);
            this.bResume.TabIndex = 2;
            this.bResume.Text = "Resume";
            this.bResume.UseVisualStyleBackColor = true;
            this.bResume.Click += new System.EventHandler(this.bResume_Click);
            // 
            // bStop
            // 
            this.bStop.Location = new System.Drawing.Point(13, 100);
            this.bStop.Name = "bStop";
            this.bStop.Size = new System.Drawing.Size(75, 23);
            this.bStop.TabIndex = 3;
            this.bStop.Text = "Stop";
            this.bStop.UseVisualStyleBackColor = true;
            this.bStop.Click += new System.EventHandler(this.bStop_Click);
            // 
            // cBand
            // 
            this.cBand.AutoSize = true;
            this.cBand.Checked = true;
            this.cBand.CheckState = System.Windows.Forms.CheckState.Checked;
            this.cBand.Location = new System.Drawing.Point(108, 18);
            this.cBand.Name = "cBand";
            this.cBand.Size = new System.Drawing.Size(57, 17);
            this.cBand.TabIndex = 4;
            this.cBand.Text = "Banda";
            this.cBand.UseVisualStyleBackColor = true;
            this.cBand.CheckedChanged += new System.EventHandler(this.cBand_CheckedChanged);
            // 
            // cGuitar
            // 
            this.cGuitar.AutoSize = true;
            this.cGuitar.Checked = true;
            this.cGuitar.CheckState = System.Windows.Forms.CheckState.Checked;
            this.cGuitar.Location = new System.Drawing.Point(108, 41);
            this.cGuitar.Name = "cGuitar";
            this.cGuitar.Size = new System.Drawing.Size(63, 17);
            this.cGuitar.TabIndex = 5;
            this.cGuitar.Text = "Guitarra";
            this.cGuitar.UseVisualStyleBackColor = true;
            this.cGuitar.CheckedChanged += new System.EventHandler(this.cGuitar_CheckedChanged);
            // 
            // cDrum
            // 
            this.cDrum.AutoSize = true;
            this.cDrum.Checked = true;
            this.cDrum.CheckState = System.Windows.Forms.CheckState.Checked;
            this.cDrum.Location = new System.Drawing.Point(108, 64);
            this.cDrum.Name = "cDrum";
            this.cDrum.Size = new System.Drawing.Size(59, 17);
            this.cDrum.TabIndex = 6;
            this.cDrum.Text = "Bateria";
            this.cDrum.UseVisualStyleBackColor = true;
            this.cDrum.CheckedChanged += new System.EventHandler(this.cDrum_CheckedChanged);
            // 
            // cBass
            // 
            this.cBass.AutoSize = true;
            this.cBass.Checked = true;
            this.cBass.CheckState = System.Windows.Forms.CheckState.Checked;
            this.cBass.Location = new System.Drawing.Point(108, 87);
            this.cBass.Name = "cBass";
            this.cBass.Size = new System.Drawing.Size(86, 17);
            this.cBass.TabIndex = 7;
            this.cBass.Text = "Contra-Baixo";
            this.cBass.UseVisualStyleBackColor = true;
            this.cBass.CheckedChanged += new System.EventHandler(this.cBass_CheckedChanged);
            // 
            // lTime
            // 
            this.lTime.BackColor = System.Drawing.SystemColors.ActiveCaption;
            this.lTime.Font = new System.Drawing.Font("Microsoft Sans Serif", 12F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.lTime.Location = new System.Drawing.Point(738, 15);
            this.lTime.Name = "lTime";
            this.lTime.Size = new System.Drawing.Size(133, 43);
            this.lTime.TabIndex = 8;
            this.lTime.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // lStatus
            // 
            this.lStatus.BackColor = System.Drawing.SystemColors.Info;
            this.lStatus.Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.lStatus.Location = new System.Drawing.Point(740, 71);
            this.lStatus.Name = "lStatus";
            this.lStatus.Size = new System.Drawing.Size(129, 34);
            this.lStatus.TabIndex = 9;
            this.lStatus.Text = "Pronto";
            this.lStatus.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // tRefreshInfo
            // 
            this.tRefreshInfo.Enabled = true;
            this.tRefreshInfo.Interval = 500;
            this.tRefreshInfo.Tick += new System.EventHandler(this.tRefreshInfo_Tick);
            // 
            // tableLayoutPanel1
            // 
            this.tableLayoutPanel1.ColumnCount = 5;
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 10.10101F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 22.47475F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 22.47475F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 22.47475F));
            this.tableLayoutPanel1.ColumnStyles.Add(new System.Windows.Forms.ColumnStyle(System.Windows.Forms.SizeType.Percent, 22.47475F));
            this.tableLayoutPanel1.Controls.Add(this.groupBox4, 4, 5);
            this.tableLayoutPanel1.Controls.Add(this.groupBox2, 3, 5);
            this.tableLayoutPanel1.Controls.Add(this.groupBox3, 2, 5);
            this.tableLayoutPanel1.Controls.Add(this.label1, 0, 5);
            this.tableLayoutPanel1.Controls.Add(this.label9, 0, 4);
            this.tableLayoutPanel1.Controls.Add(this.noteView9, 1, 3);
            this.tableLayoutPanel1.Controls.Add(this.noteView10, 2, 3);
            this.tableLayoutPanel1.Controls.Add(this.noteView11, 3, 3);
            this.tableLayoutPanel1.Controls.Add(this.noteView12, 4, 3);
            this.tableLayoutPanel1.Controls.Add(this.label8, 0, 3);
            this.tableLayoutPanel1.Controls.Add(this.noteView5, 1, 2);
            this.tableLayoutPanel1.Controls.Add(this.noteView6, 2, 2);
            this.tableLayoutPanel1.Controls.Add(this.noteView7, 3, 2);
            this.tableLayoutPanel1.Controls.Add(this.noteView8, 4, 2);
            this.tableLayoutPanel1.Controls.Add(this.label7, 0, 2);
            this.tableLayoutPanel1.Controls.Add(this.noteView4, 4, 1);
            this.tableLayoutPanel1.Controls.Add(this.noteView3, 3, 1);
            this.tableLayoutPanel1.Controls.Add(this.noteView2, 2, 1);
            this.tableLayoutPanel1.Controls.Add(this.label6, 0, 1);
            this.tableLayoutPanel1.Controls.Add(this.label5, 4, 0);
            this.tableLayoutPanel1.Controls.Add(this.label4, 3, 0);
            this.tableLayoutPanel1.Controls.Add(this.label3, 2, 0);
            this.tableLayoutPanel1.Controls.Add(this.label2, 1, 0);
            this.tableLayoutPanel1.Controls.Add(this.noteView1, 1, 1);
            this.tableLayoutPanel1.Controls.Add(this.vocalView1, 1, 4);
            this.tableLayoutPanel1.Controls.Add(this.groupBox1, 1, 5);
            this.tableLayoutPanel1.Controls.Add(this.panel1, 0, 0);
            this.tableLayoutPanel1.Location = new System.Drawing.Point(13, 147);
            this.tableLayoutPanel1.Name = "tableLayoutPanel1";
            this.tableLayoutPanel1.RowCount = 6;
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 11.76471F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 17.64706F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 17.64706F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 17.64706F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 17.64706F));
            this.tableLayoutPanel1.RowStyles.Add(new System.Windows.Forms.RowStyle(System.Windows.Forms.SizeType.Percent, 17.64706F));
            this.tableLayoutPanel1.Size = new System.Drawing.Size(858, 323);
            this.tableLayoutPanel1.TabIndex = 10;
            // 
            // groupBox4
            // 
            this.groupBox4.Controls.Add(this.pRitmo);
            this.groupBox4.Dock = System.Windows.Forms.DockStyle.Fill;
            this.groupBox4.Location = new System.Drawing.Point(665, 265);
            this.groupBox4.Name = "groupBox4";
            this.groupBox4.Size = new System.Drawing.Size(190, 55);
            this.groupBox4.TabIndex = 28;
            this.groupBox4.TabStop = false;
            this.groupBox4.Text = "Ritimo";
            // 
            // pRitmo
            // 
            this.pRitmo.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pRitmo.Font = new System.Drawing.Font("Microsoft Sans Serif", 12F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.pRitmo.ForeColor = System.Drawing.SystemColors.Highlight;
            this.pRitmo.Location = new System.Drawing.Point(3, 16);
            this.pRitmo.Name = "pRitmo";
            this.pRitmo.Size = new System.Drawing.Size(184, 36);
            this.pRitmo.TabIndex = 2;
            this.pRitmo.Text = "-";
            this.pRitmo.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // groupBox2
            // 
            this.groupBox2.Controls.Add(this.pAmbiente);
            this.groupBox2.Dock = System.Windows.Forms.DockStyle.Fill;
            this.groupBox2.Location = new System.Drawing.Point(473, 265);
            this.groupBox2.Name = "groupBox2";
            this.groupBox2.Size = new System.Drawing.Size(186, 55);
            this.groupBox2.TabIndex = 27;
            this.groupBox2.TabStop = false;
            this.groupBox2.Text = "Ambiente";
            // 
            // pAmbiente
            // 
            this.pAmbiente.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pAmbiente.ForeColor = System.Drawing.SystemColors.Highlight;
            this.pAmbiente.Location = new System.Drawing.Point(3, 16);
            this.pAmbiente.Name = "pAmbiente";
            this.pAmbiente.Size = new System.Drawing.Size(180, 36);
            this.pAmbiente.TabIndex = 1;
            this.pAmbiente.Text = "-";
            // 
            // groupBox3
            // 
            this.groupBox3.Controls.Add(this.pEventos);
            this.groupBox3.Dock = System.Windows.Forms.DockStyle.Fill;
            this.groupBox3.Location = new System.Drawing.Point(281, 265);
            this.groupBox3.Name = "groupBox3";
            this.groupBox3.Size = new System.Drawing.Size(186, 55);
            this.groupBox3.TabIndex = 25;
            this.groupBox3.TabStop = false;
            this.groupBox3.Text = "Eventos";
            // 
            // pEventos
            // 
            this.pEventos.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pEventos.ForeColor = System.Drawing.SystemColors.Highlight;
            this.pEventos.Location = new System.Drawing.Point(3, 16);
            this.pEventos.Name = "pEventos";
            this.pEventos.Size = new System.Drawing.Size(180, 36);
            this.pEventos.TabIndex = 1;
            this.pEventos.Text = "-";
            // 
            // label1
            // 
            this.label1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label1.Location = new System.Drawing.Point(3, 262);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(80, 61);
            this.label1.TabIndex = 22;
            this.label1.Text = "Outros";
            this.label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label9
            // 
            this.label9.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label9.Location = new System.Drawing.Point(3, 206);
            this.label9.Name = "label9";
            this.label9.Size = new System.Drawing.Size(80, 56);
            this.label9.TabIndex = 20;
            this.label9.Text = "Vocal";
            this.label9.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label8
            // 
            this.label8.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label8.Location = new System.Drawing.Point(3, 150);
            this.label8.Name = "label8";
            this.label8.Size = new System.Drawing.Size(80, 56);
            this.label8.TabIndex = 15;
            this.label8.Text = "Contra-baixo";
            this.label8.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label7
            // 
            this.label7.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label7.Location = new System.Drawing.Point(3, 94);
            this.label7.Name = "label7";
            this.label7.Size = new System.Drawing.Size(80, 56);
            this.label7.TabIndex = 10;
            this.label7.Text = "Bateria";
            this.label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label6
            // 
            this.label6.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label6.Location = new System.Drawing.Point(3, 38);
            this.label6.Name = "label6";
            this.label6.Size = new System.Drawing.Size(80, 56);
            this.label6.TabIndex = 5;
            this.label6.Text = "Guitarra";
            this.label6.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label5
            // 
            this.label5.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label5.Location = new System.Drawing.Point(665, 0);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(190, 38);
            this.label5.TabIndex = 4;
            this.label5.Text = "Expert";
            this.label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label4
            // 
            this.label4.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label4.Location = new System.Drawing.Point(473, 0);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(186, 38);
            this.label4.TabIndex = 3;
            this.label4.Text = "Hard";
            this.label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label3
            // 
            this.label3.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label3.Location = new System.Drawing.Point(281, 0);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(186, 38);
            this.label3.TabIndex = 2;
            this.label3.Text = "Medium";
            this.label3.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // label2
            // 
            this.label2.Dock = System.Windows.Forms.DockStyle.Fill;
            this.label2.Location = new System.Drawing.Point(89, 0);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(186, 38);
            this.label2.TabIndex = 1;
            this.label2.Text = "Easy";
            this.label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // groupBox1
            // 
            this.groupBox1.Controls.Add(this.pRaw);
            this.groupBox1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.groupBox1.Location = new System.Drawing.Point(89, 265);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Size = new System.Drawing.Size(186, 55);
            this.groupBox1.TabIndex = 23;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "Raw Events";
            // 
            // pRaw
            // 
            this.pRaw.Dock = System.Windows.Forms.DockStyle.Fill;
            this.pRaw.ForeColor = System.Drawing.SystemColors.Highlight;
            this.pRaw.Location = new System.Drawing.Point(3, 16);
            this.pRaw.Name = "pRaw";
            this.pRaw.Size = new System.Drawing.Size(180, 36);
            this.pRaw.TabIndex = 0;
            this.pRaw.Text = "-";
            // 
            // panel1
            // 
            this.panel1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.panel1.Location = new System.Drawing.Point(3, 3);
            this.panel1.Name = "panel1";
            this.panel1.Size = new System.Drawing.Size(80, 32);
            this.panel1.TabIndex = 26;
            // 
            // lDetails
            // 
            this.lDetails.Location = new System.Drawing.Point(200, 18);
            this.lDetails.Multiline = true;
            this.lDetails.Name = "lDetails";
            this.lDetails.ReadOnly = true;
            this.lDetails.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.lDetails.Size = new System.Drawing.Size(416, 105);
            this.lDetails.TabIndex = 11;
            // 
            // pCapa
            // 
            this.pCapa.Location = new System.Drawing.Point(622, 15);
            this.pCapa.Name = "pCapa";
            this.pCapa.Size = new System.Drawing.Size(108, 108);
            this.pCapa.SizeMode = System.Windows.Forms.PictureBoxSizeMode.Zoom;
            this.pCapa.TabIndex = 12;
            this.pCapa.TabStop = false;
            // 
            // cbInstrument
            // 
            this.cbInstrument.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.cbInstrument.FormattingEnabled = true;
            this.cbInstrument.Location = new System.Drawing.Point(12, 480);
            this.cbInstrument.Name = "cbInstrument";
            this.cbInstrument.Size = new System.Drawing.Size(234, 21);
            this.cbInstrument.TabIndex = 14;
            this.cbInstrument.SelectedIndexChanged += new System.EventHandler(this.cbInstrument_SelectedIndexChanged);
            // 
            // cbDifficult
            // 
            this.cbDifficult.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.cbDifficult.FormattingEnabled = true;
            this.cbDifficult.Location = new System.Drawing.Point(252, 480);
            this.cbDifficult.Name = "cbDifficult";
            this.cbDifficult.Size = new System.Drawing.Size(234, 21);
            this.cbDifficult.TabIndex = 15;
            this.cbDifficult.SelectedIndexChanged += new System.EventHandler(this.cbDifficult_SelectedIndexChanged);
            // 
            // scrollNoteView1
            // 
            this.scrollNoteView1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.scrollNoteView1.FontLyric = new System.Drawing.Font("Arial", 12F, System.Drawing.FontStyle.Bold);
            this.scrollNoteView1.Location = new System.Drawing.Point(12, 507);
            this.scrollNoteView1.Name = "scrollNoteView1";
            this.scrollNoteView1.Size = new System.Drawing.Size(856, 201);
            this.scrollNoteView1.Speed = 5F;
            this.scrollNoteView1.TabIndex = 13;
            // 
            // noteView9
            // 
            this.noteView9.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView9.Difficult = GHCore.ValueObjects.Difficult.Easy;
            this.noteView9.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView9.Instrument = GHCore.ValueObjects.GameInstrument.Rhythm_Bass;
            this.noteView9.Location = new System.Drawing.Point(89, 153);
            this.noteView9.Name = "noteView9";
            this.noteView9.Size = new System.Drawing.Size(186, 50);
            this.noteView9.TabIndex = 19;
            // 
            // noteView10
            // 
            this.noteView10.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView10.Difficult = GHCore.ValueObjects.Difficult.Medium;
            this.noteView10.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView10.Instrument = GHCore.ValueObjects.GameInstrument.Rhythm_Bass;
            this.noteView10.Location = new System.Drawing.Point(281, 153);
            this.noteView10.Name = "noteView10";
            this.noteView10.Size = new System.Drawing.Size(186, 50);
            this.noteView10.TabIndex = 18;
            // 
            // noteView11
            // 
            this.noteView11.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView11.Difficult = GHCore.ValueObjects.Difficult.Hard;
            this.noteView11.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView11.Instrument = GHCore.ValueObjects.GameInstrument.Rhythm_Bass;
            this.noteView11.Location = new System.Drawing.Point(473, 153);
            this.noteView11.Name = "noteView11";
            this.noteView11.Size = new System.Drawing.Size(186, 50);
            this.noteView11.TabIndex = 17;
            // 
            // noteView12
            // 
            this.noteView12.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView12.Difficult = GHCore.ValueObjects.Difficult.Expert;
            this.noteView12.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView12.Instrument = GHCore.ValueObjects.GameInstrument.Rhythm_Bass;
            this.noteView12.Location = new System.Drawing.Point(665, 153);
            this.noteView12.Name = "noteView12";
            this.noteView12.Size = new System.Drawing.Size(190, 50);
            this.noteView12.TabIndex = 16;
            // 
            // noteView5
            // 
            this.noteView5.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView5.Difficult = GHCore.ValueObjects.Difficult.Easy;
            this.noteView5.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView5.Instrument = GHCore.ValueObjects.GameInstrument.Drums;
            this.noteView5.Location = new System.Drawing.Point(89, 97);
            this.noteView5.Name = "noteView5";
            this.noteView5.Size = new System.Drawing.Size(186, 50);
            this.noteView5.TabIndex = 14;
            // 
            // noteView6
            // 
            this.noteView6.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView6.Difficult = GHCore.ValueObjects.Difficult.Medium;
            this.noteView6.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView6.Instrument = GHCore.ValueObjects.GameInstrument.Drums;
            this.noteView6.Location = new System.Drawing.Point(281, 97);
            this.noteView6.Name = "noteView6";
            this.noteView6.Size = new System.Drawing.Size(186, 50);
            this.noteView6.TabIndex = 13;
            // 
            // noteView7
            // 
            this.noteView7.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView7.Difficult = GHCore.ValueObjects.Difficult.Hard;
            this.noteView7.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView7.Instrument = GHCore.ValueObjects.GameInstrument.Drums;
            this.noteView7.Location = new System.Drawing.Point(473, 97);
            this.noteView7.Name = "noteView7";
            this.noteView7.Size = new System.Drawing.Size(186, 50);
            this.noteView7.TabIndex = 12;
            // 
            // noteView8
            // 
            this.noteView8.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView8.Difficult = GHCore.ValueObjects.Difficult.Expert;
            this.noteView8.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView8.Instrument = GHCore.ValueObjects.GameInstrument.Drums;
            this.noteView8.Location = new System.Drawing.Point(665, 97);
            this.noteView8.Name = "noteView8";
            this.noteView8.Size = new System.Drawing.Size(190, 50);
            this.noteView8.TabIndex = 11;
            // 
            // noteView4
            // 
            this.noteView4.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView4.Difficult = GHCore.ValueObjects.Difficult.Expert;
            this.noteView4.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView4.Instrument = GHCore.ValueObjects.GameInstrument.Guitar;
            this.noteView4.Location = new System.Drawing.Point(665, 41);
            this.noteView4.Name = "noteView4";
            this.noteView4.Size = new System.Drawing.Size(190, 50);
            this.noteView4.TabIndex = 9;
            // 
            // noteView3
            // 
            this.noteView3.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView3.Difficult = GHCore.ValueObjects.Difficult.Hard;
            this.noteView3.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView3.Instrument = GHCore.ValueObjects.GameInstrument.Guitar;
            this.noteView3.Location = new System.Drawing.Point(473, 41);
            this.noteView3.Name = "noteView3";
            this.noteView3.Size = new System.Drawing.Size(186, 50);
            this.noteView3.TabIndex = 8;
            // 
            // noteView2
            // 
            this.noteView2.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView2.Difficult = GHCore.ValueObjects.Difficult.Medium;
            this.noteView2.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView2.Instrument = GHCore.ValueObjects.GameInstrument.Guitar;
            this.noteView2.Location = new System.Drawing.Point(281, 41);
            this.noteView2.Name = "noteView2";
            this.noteView2.Size = new System.Drawing.Size(186, 50);
            this.noteView2.TabIndex = 7;
            // 
            // noteView1
            // 
            this.noteView1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.noteView1.Difficult = GHCore.ValueObjects.Difficult.Easy;
            this.noteView1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.noteView1.Instrument = GHCore.ValueObjects.GameInstrument.Guitar;
            this.noteView1.Location = new System.Drawing.Point(89, 41);
            this.noteView1.Name = "noteView1";
            this.noteView1.Size = new System.Drawing.Size(186, 50);
            this.noteView1.TabIndex = 6;
            // 
            // vocalView1
            // 
            this.vocalView1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.tableLayoutPanel1.SetColumnSpan(this.vocalView1, 4);
            this.vocalView1.Dock = System.Windows.Forms.DockStyle.Fill;
            this.vocalView1.Location = new System.Drawing.Point(89, 209);
            this.vocalView1.Name = "vocalView1";
            this.vocalView1.Size = new System.Drawing.Size(766, 50);
            this.vocalView1.TabIndex = 21;
            // 
            // ckTocarNotas
            // 
            this.ckTocarNotas.AutoSize = true;
            this.ckTocarNotas.Location = new System.Drawing.Point(501, 484);
            this.ckTocarNotas.Name = "ckTocarNotas";
            this.ckTocarNotas.Size = new System.Drawing.Size(85, 17);
            this.ckTocarNotas.TabIndex = 16;
            this.ckTocarNotas.Text = "Tocar Notas";
            this.ckTocarNotas.UseVisualStyleBackColor = true;
            // 
            // Form1
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(883, 720);
            this.Controls.Add(this.ckTocarNotas);
            this.Controls.Add(this.cbDifficult);
            this.Controls.Add(this.cbInstrument);
            this.Controls.Add(this.scrollNoteView1);
            this.Controls.Add(this.pCapa);
            this.Controls.Add(this.lDetails);
            this.Controls.Add(this.tableLayoutPanel1);
            this.Controls.Add(this.lStatus);
            this.Controls.Add(this.lTime);
            this.Controls.Add(this.cBass);
            this.Controls.Add(this.cDrum);
            this.Controls.Add(this.cGuitar);
            this.Controls.Add(this.cBand);
            this.Controls.Add(this.bStop);
            this.Controls.Add(this.bResume);
            this.Controls.Add(this.bPause);
            this.Controls.Add(this.bPlay);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.Name = "Form1";
            this.Text = "Form1";
            this.tableLayoutPanel1.ResumeLayout(false);
            this.groupBox4.ResumeLayout(false);
            this.groupBox2.ResumeLayout(false);
            this.groupBox3.ResumeLayout(false);
            this.groupBox1.ResumeLayout(false);
            ((System.ComponentModel.ISupportInitialize)(this.pCapa)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button bPlay;
        private System.Windows.Forms.Button bPause;
        private System.Windows.Forms.Button bResume;
        private System.Windows.Forms.Button bStop;
        private System.Windows.Forms.CheckBox cBand;
        private System.Windows.Forms.CheckBox cGuitar;
        private System.Windows.Forms.CheckBox cDrum;
        private System.Windows.Forms.CheckBox cBass;
        private System.Windows.Forms.Label lTime;
        private System.Windows.Forms.Label lStatus;
        private System.Windows.Forms.Timer tRefreshInfo;
        private System.Windows.Forms.TableLayoutPanel tableLayoutPanel1;
        private System.Windows.Forms.Label label9;
        private UserControls.NoteView noteView9;
        private UserControls.NoteView noteView10;
        private UserControls.NoteView noteView11;
        private UserControls.NoteView noteView12;
        private System.Windows.Forms.Label label8;
        private UserControls.NoteView noteView5;
        private UserControls.NoteView noteView6;
        private UserControls.NoteView noteView7;
        private UserControls.NoteView noteView8;
        private System.Windows.Forms.Label label7;
        private UserControls.NoteView noteView4;
        private UserControls.NoteView noteView3;
        private UserControls.NoteView noteView2;
        private System.Windows.Forms.Label label6;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.Label label2;
        private UserControls.NoteView noteView1;
        private UserControls.VocalView vocalView1;
        private System.Windows.Forms.TextBox lDetails;
        private System.Windows.Forms.GroupBox groupBox4;
        private System.Windows.Forms.GroupBox groupBox2;
        private System.Windows.Forms.Label pAmbiente;
        private System.Windows.Forms.GroupBox groupBox3;
        private System.Windows.Forms.Label pEventos;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.GroupBox groupBox1;
        private System.Windows.Forms.Label pRaw;
        private System.Windows.Forms.Panel panel1;
        private System.Windows.Forms.Label pRitmo;
        private System.Windows.Forms.PictureBox pCapa;
        private CustomControls.ScrollNoteView scrollNoteView1;
        private System.Windows.Forms.ComboBox cbInstrument;
        private System.Windows.Forms.ComboBox cbDifficult;
        private UserControls.MidiOut midiOut1;
        private System.Windows.Forms.CheckBox ckTocarNotas;
    }
}

