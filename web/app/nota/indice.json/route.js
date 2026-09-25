import { todasLasNotas } from '@/lib/datos';
import { parteDeNota } from '@/lib/ruta';

// El índice de las notas: { id: "titular-en-guiones-id" }, de todas las que
// tienen página. Lo usa la página 404 (app/not-found.js) para mandar a la
// dirección buena a quien llega con una que ya no existe: un enlace
// compartido con un titular viejo, o /nota/ID a secas de una nota que ya no
// tiene redirección en public/_redirects. Ver destinoDesde404 en lib/ruta.js.
//
// Es un archivo estático más (out/nota/indice.json), armado al compilar. Sólo
// se descarga cuando alguien cae en un 404 de una nota.
export const dynamic = 'force-static';

export function GET() {
  const indice = Object.fromEntries(todasLasNotas().map((n) => [n.id, parteDeNota(n)]));
  return new Response(JSON.stringify(indice), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
