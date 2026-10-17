// Los canales propios del medio en las páginas (17/10/2026, regla 257): el cartel de WhatsApp al final de cada nota y los enlaces del pie.
// Todo sale de lib/canales.js, que lee WHATSAPP_CANAL_URL, TELEGRAM_CANAL_URL y BLUESKY_URL al compilar. Sin la variable, estos componentes
// devuelven null y la página sale idéntica a la de antes. Son de servidor: HTML común, sin scripts y sin nada de terceros.

import { canalesDelMedio, canalDeWhatsApp } from '@/lib/canales';

/** El cartel discreto del final de la nota. Sólo con WHATSAPP_CANAL_URL. */
export function CartelDelCanal() {
  const c = canalDeWhatsApp();
  if (!c) return null;
  return (
    <aside className="canal-nota" aria-label="Canal de WhatsApp de Radar Balcarce">
      <div>
        <strong>{c.cartel.titulo}</strong>
        <span>{c.cartel.texto}</span>
      </div>
      <a href={c.url} target="_blank" rel="noopener noreferrer me" className="boton-canal">{c.cartel.boton}</a>
    </aside>
  );
}

/** Los enlaces del pie: "Canales: WhatsApp · Telegram · Bluesky", sólo los que están configurados. null si no hay ninguno. */
export function EnlacesDeCanales() {
  const lista = canalesDelMedio();
  if (!lista.length) return null;
  return (
    <div className="pie-canales">
      Canales:{' '}
      {lista.map((c, i) => (
        <span key={c.id}>{i > 0 ? ' · ' : ''}<a href={c.url} target="_blank" rel="noopener noreferrer me">{c.nombre}</a></span>
      ))}
    </div>
  );
}
