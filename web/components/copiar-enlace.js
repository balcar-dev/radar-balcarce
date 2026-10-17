'use client';

// El botón "Copiar enlace" (17/10/2026, regla 254). Es lo único de compartir que necesita JavaScript: escribe la dirección canónica de la
// página en el portapapeles. Sin portapapeles (un navegador viejo, una página que no está en https), el botón no hace nada visible y el de
// WhatsApp, que es un enlace común, sigue ahí. No pide nada a ningún tercero.

import { useState } from 'react';

export default function CopiarEnlace({ url }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // Sin portapapeles: no se avisa nada.
    }
  };

  return (
    <button type="button" onClick={copiar} className="boton-compartir" aria-live="polite">
      {copiado
        ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )
        : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      {copiado ? 'Copiado' : 'Copiar enlace'}
    </button>
  );
}
