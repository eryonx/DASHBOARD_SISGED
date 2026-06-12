import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize with current URL when modal opens
  useEffect(() => {
    if (isOpen) {
      setUrl(window.location.href);
      setCopiedUrl(false);
      setCopiedImage(false);
      setError(null);
    }
  }, [isOpen]);

  // Generate QR Code when URL changes
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !url) return;

    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#090c1f', // Match var(--bg-sidebar) / deep navy
          light: '#ffffff', // Pure white for perfect scanner readability
        },
      },
      (err) => {
        if (err) {
          console.error('Error generating QR code:', err);
          setError('No se pudo generar el código QR para esta URL.');
        } else {
          setError(null);
        }
      }
    );
  }, [url, isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Error al generar la imagen del QR.');
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob,
            }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } catch (clipboardErr) {
          console.error('Clipboard API failed, trying fallback:', clipboardErr);
          setError('Tu navegador no soporta copiar imágenes directamente. Prueba descargándola.');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error converting canvas to blob:', err);
    }
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'QR_Dashboard_SISGED.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  // Close modal when clicking on the backdrop overlay
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="qr-modal-overlay" onClick={handleBackdropClick}>
      <div className="qr-modal-container">
        
        {/* Modal Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-title-box">
            <h3>Acceso Rápido Móvil</h3>
            <p>Comparte este dashboard con la Alta Dirección</p>
          </div>
          <button className="qr-modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="qr-modal-body">
          <p className="qr-modal-description">
            Escanea este código QR con tu celular o tablet para abrir el dashboard al instante. 
            También puedes copiar la imagen para tus diapositivas de presentación.
          </p>

          {/* QR Code Canvas Container */}
          <div className="qr-display-wrapper">
            <div className="qr-card">
              {error ? (
                <div className="qr-error-box">{error}</div>
              ) : (
                <>
                  <canvas ref={canvasRef} className="qr-canvas" />
                  <div className="qr-card-label">DASHBOARD SISGED</div>
                </>
              )}
            </div>
          </div>

          {/* Dynamic Link input */}
          <div className="qr-input-group">
            <label className="qr-input-label">
              Enlace a compartir
              <span className="qr-input-tip" title="Edita este enlace si deseas generar el código QR para el servidor de producción o intranet final.">
                💡 Personalizar
              </span>
            </label>
            <div className="qr-input-row">
              <input 
                type="text" 
                className="qr-input-field" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.ana.gob.pe/dashboard"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="qr-actions-grid">
            <button className="qr-btn qr-btn-secondary" onClick={handleCopyUrl}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              {copiedUrl ? '¡Copiado!' : 'Copiar enlace'}
            </button>

            <button className="qr-btn qr-btn-secondary" onClick={handleCopyImage} disabled={!!error}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              {copiedImage ? '¡Imagen Copiada!' : 'Copiar QR'}
            </button>

            <button className="qr-btn qr-btn-primary" onClick={handleDownloadImage} disabled={!!error}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar PNG
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="qr-modal-footer">
          <span>Autoridad Nacional del Agua - UATD</span>
        </div>

      </div>
    </div>
  );
};
