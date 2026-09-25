import { obtenerEvento, todosLosEventos } from '@/lib/datos';
import { parteDeEvento, icsDeEvento } from '@/lib/eventos';
import { enlace, DOMINIO } from '@/lib/sitio';

// El archivo para agendar el evento: se abre en el celular y lo suma al
// calendario. Es un archivo estático, generado al compilar, como todo el
// sitio. El tipo (text/calendar) lo pone también public/_headers.
export const dynamic = 'force-static';

export function generateStaticParams() {
  const params = todosLosEventos().map((e) => ({ id: parteDeEvento(e) }));
  return params.length ? params : [{ id: 'sin-eventos' }];
}

export async function GET(_pedido, { params }) {
  const { id } = await params;
  const e = obtenerEvento(id);
  const texto = e ? icsDeEvento(e, { url: enlace(e.ruta), dominio: DOMINIO }) : '';
  return new Response(texto, { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
}
