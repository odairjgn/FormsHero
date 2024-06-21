using System;
using System.Drawing;

namespace FormsHero.UserControls
{
    internal class NotePaintState : IDisposable
    {
        private bool disposedValue;

        public NotePaintState(Color cor, SolidBrush brushAtivo, SolidBrush brushInativo, bool ativo, string key = null)
        {
            Cor = cor;
            BrushAtivo = brushAtivo;
            BrushInativo = brushInativo;
            Key = key;
            Ativo = ativo;
        }

        public Color Cor { get; }
        public SolidBrush BrushAtivo { get; }
        public SolidBrush BrushInativo { get; }
        public string Key { get; set; }
        public bool Ativo { get; set; }
        public SolidBrush CurrentBrush => Ativo ? BrushAtivo : BrushInativo;

        public bool HasKeyText => !string.IsNullOrEmpty(Key);

        protected virtual void Dispose(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    BrushAtivo.Dispose();
                    BrushInativo.Dispose();
                }

                // TODO: free unmanaged resources (unmanaged objects) and override finalizer
                // TODO: set large fields to null
                disposedValue = true;
            }
        }


        // // TODO: override finalizer only if 'Dispose(bool disposing)' has code to free unmanaged resources
        // ~NotePaintState()
        // {
        //     // Do not change this code. Put cleanup code in 'Dispose(bool disposing)' method
        //     Dispose(disposing: false);
        // }

        public void Dispose()
        {
            // Do not change this code. Put cleanup code in 'Dispose(bool disposing)' method
            Dispose(disposing: true);
            GC.SuppressFinalize(this);
        }
    }
}