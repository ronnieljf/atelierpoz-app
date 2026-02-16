/**
 * Sistema de fallback para WhatsApp cuando Safari bloquea popups.
 * Muestra una notificación elegante y copia el link automáticamente.
 */

/**
 * Muestra una notificación toast cuando Safari bloquea WhatsApp
 */
export function showWhatsAppBlockedNotification(url: string): void {
  // Copiar al portapapeles
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast(url, true);
    }).catch(() => {
      showToast(url, false);
    });
  } else {
    showToast(url, false);
  }
}

/**
 * Muestra un toast elegante con el link de WhatsApp
 */
function showToast(url: string, wasCopied: boolean): void {
  // Crear elemento de toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    max-width: 90%;
    width: 400px;
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    animation: slideDown 0.3s ease-out;
  `;

  const icon = wasCopied ? '✅' : '⚠️';
  const title = wasCopied ? '¡Link copiado!' : '¡Atención!';
  const message = wasCopied 
    ? 'El navegador bloqueó el popup de WhatsApp, pero hemos copiado el link al portapapeles.'
    : 'El navegador bloqueó el popup de WhatsApp.';

  toast.innerHTML = `
    <style>
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      @keyframes slideUp {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
      }
    </style>
    <div style="display: flex; align-items: start; gap: 12px;">
      <div style="font-size: 24px; flex-shrink: 0;">${icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #f3f4f6; margin-bottom: 6px; font-size: 15px;">
          ${title}
        </div>
        <div style="color: #d1d5db; font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
          ${message}
        </div>
        <button 
          onclick="window.open('${url}', '_blank'); this.parentElement.parentElement.parentElement.remove();"
          style="
            width: 100%;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          "
          onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 16px rgba(16, 185, 129, 0.3)';"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Abrir WhatsApp
        </button>
        ${wasCopied ? `
        <div style="margin-top: 8px; color: #9ca3af; font-size: 11px; text-align: center;">
          El link ya está en tu portapapeles ✓
        </div>
        ` : ''}
      </div>
      <button 
        onclick="this.parentElement.parentElement.remove();"
        style="
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.2s;
        "
        onmouseover="this.style.color='#f3f4f6';"
        onmouseout="this.style.color='#9ca3af';"
      >
        ×
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  // Auto-cerrar después de 10 segundos
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }
  }, 10000);
}
