import { obtenerDatos, obtenerNota } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';

// La imagen de cada nota, generada al compilar. Una por nota, archivo
// estático: cuando alguien comparte el enlace no hay nada corriendo.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  return obtenerDatos().notas.map((n) => ({ id: n.id }));
}

export default function Imagen({ params }) {
  const n = obtenerNota(params.id);
  return tarjeta(n ?? {});
}
