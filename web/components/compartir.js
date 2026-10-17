// Compartir una nota (o un evento, o /hoy).
//
// Los cinco portales de la zona tienen WhatsApp (docs/historico/INVESTIGACION-COMPETENCIA.md): en Argentina es donde vive la conversación
// del pueblo. Para pasarle una nota a alguien hay que tener a mano justo ese botón, y que ande siempre.
//
// 17/10/2026 (regla 254): el botón de WhatsApp es un enlace común (`https://wa.me/?text=…`) con la dirección CANÓNICA de la página ya
// escrita al compilar, y no un botón que arma el enlace con JavaScript al tocarlo: anda sin JavaScript, anda en el lector de pantalla como
// un enlace, y el que lo comparte manda siempre la dirección limpia (sin `?fbclid=` ni nada pegado). Sólo "Copiar enlace" necesita el
// navegador (components/copiar-enlace.js). Nada de scripts de terceros ni de cookies: el único pedido a WhatsApp es el del propio toque.
//
// Es un componente de servidor a propósito: se arma una vez, al compilar.

import { enlace } from '@/lib/sitio';
import { enlaceDeWhatsApp } from '@/lib/compartir';
import CopiarEnlace from '@/components/copiar-enlace';

export default function Compartir({ titulo, camino, etiqueta = 'Compartir' }) {
  const url = enlace(camino ?? '/');
  return (
    <div className="compartir">
      <span className="meta">{etiqueta}</span>

      <div className="botones-compartir">
        <a href={enlaceDeWhatsApp(titulo, url)} target="_blank" rel="noopener noreferrer" className="boton-compartir whatsapp">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5 4.5.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4z" />
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
          </svg>
          WhatsApp
        </a>

        <CopiarEnlace url={url} />
      </div>
    </div>
  );
}
