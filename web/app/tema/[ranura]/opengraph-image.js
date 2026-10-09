import { ranurasDeTemasParaArmar, nombreDeTema } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';

export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  return ranurasDeTemasParaArmar();
}

export default async function Imagen({ params }) {
  const { ranura } = await params;
  const nombre = nombreDeTema(ranura);
  return tarjeta({ titulo: nombre ?? 'Radar Balcarce', seccion: 'Tema que seguimos' });
}
