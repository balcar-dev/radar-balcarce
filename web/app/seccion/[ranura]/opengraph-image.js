import { obtenerDatos, porRanura, SECCIONES } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';
import { partirRanura, cuantasPaginas } from '@/lib/paginas';

// La imagen al compartir una sección: su nombre sobre su color.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  const notas = obtenerDatos().notas;
  const params = [];
  for (const s of SECCIONES) {
    const cuantas = notas.filter((n) => n.seccion === s.nombre).length;
    if (!cuantas) continue;
    for (let i = 1; i <= cuantasPaginas(cuantas); i += 1) params.push({ ranura: i === 1 ? s.ranura : `${s.ranura}-${i}` });
  }
  return params;
}

export default function Imagen({ params }) {
  const { base } = partirRanura(params.ranura, porRanura);
  const s = porRanura(base);
  return tarjeta({ titulo: s ? `${s.nombre} en Balcarce` : 'Radar Balcarce', seccion: s?.nombre });
}
