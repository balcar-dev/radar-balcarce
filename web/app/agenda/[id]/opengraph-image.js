import { obtenerEvento, todosLosEventos } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';
import { parteDeEvento, nombreDeEvento } from '@/lib/eventos';

// La tarjeta de cada evento para compartir por WhatsApp y Facebook: el nombre
// sobre el color de Cultura y agenda, con la marca. Nunca el afiche del
// organizador: es obra ajena, la misma regla que las fotos de las notas.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce · Agenda';

export function generateStaticParams() {
  const params = todosLosEventos().map((e) => ({ id: parteDeEvento(e) }));
  return params.length ? params : [{ id: 'sin-eventos' }];
}

export default function Imagen({ params }) {
  const e = obtenerEvento(params.id);
  return tarjeta(e ? { titulo: nombreDeEvento(e.nombre), seccion: 'Cultura y agenda' } : {});
}
