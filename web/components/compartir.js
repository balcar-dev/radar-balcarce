'use client';

// Compartir una nota.
//
// Los cinco portales de la zona tienen WhatsApp (INVESTIGACION-COMPETENCIA.md):
// en Argentina es donde vive la conversación del pueblo. Hasta ahora, para
// pasarle una nota a alguien había que copiar la dirección del navegador a
// mano, que en el celular es justo lo más incómodo.
//
// Corre en el navegador por un motivo concreto: la dirección la saca de
// `window.location.href`. Si la armáramos en el servidor habría que elegir
// un dominio fijo, y hoy el sitio vive en una dirección de Vercel que va a
// cambiar en cuanto tengamos el propio — y los enlaces ya compartidos
// quedarían apuntando a la vieja.

import { useState } from 'react';

export default function Compartir({ titulo }) {
  const [copiado, setCopiado] = useState(false);

  const aWhatsApp = () => {
    const texto = `${titulo}\n\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // El portapapeles no está disponible (navegador viejo, o la página no
      // está en https). No se avisa nada: el botón de WhatsApp sigue ahí.
    }
  };

  return (
    <div className="compartir">
      <span className="meta">Compartir</span>

      <div className="botones-compartir">
        <button type="button" onClick={aWhatsApp} className="boton-compartir whatsapp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" />
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
          </svg>
          WhatsApp
        </button>

        <button type="button" onClick={copiar} className="boton-compartir">
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
      </div>
    </div>
  );
}
