import { obtenerDatos, nombreDeTema } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';

export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  return (obtenerDatos().temas ?? []).map((t) => ({ ranura: t.ranura }));
}

export default function Imagen({ params }) {
  const nombre = nombreDeTema(params.ranura);
  return tarjeta({ titulo: nombre ?? 'Radar Balcarce', seccion: 'Tema que seguimos' });
}
