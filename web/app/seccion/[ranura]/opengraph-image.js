import { porRanura, frasesDeSeccion, SECCIONES, notasDeLaSeccion, paramsNoVacios } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';
import { partirRanura, cuantasPaginas } from '@/lib/paginas';

// La imagen al compartir una sección: su nombre sobre su color.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  const params = [];
  for (const s of SECCIONES) {
    const cuantas = notasDeLaSeccion(s.nombre).length;
    if (!cuantas) continue;
    for (let i = 1; i <= cuantasPaginas(cuantas); i += 1) params.push({ ranura: i === 1 ? s.ranura : `${s.ranura}-${i}` });
  }
  return paramsNoVacios(params, { ranura: 'ninguna' });
}

export default async function Imagen({ params }) {
  const { ranura } = await params;
  const { base } = partirRanura(ranura, porRanura);
  const s = porRanura(base);
  return tarjeta({ titulo: s ? frasesDeSeccion(s.nombre).enBalcarce : 'Radar Balcarce', seccion: s?.nombre });
}
