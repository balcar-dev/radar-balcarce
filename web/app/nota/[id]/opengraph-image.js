import { obtenerNota, notasConImagen } from '@/lib/datos';
import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';
import { parteDeNota } from '@/lib/ruta';

// La imagen de cada nota, generada al compilar. Una por nota, archivo
// estático: cuando alguien comparte el enlace no hay nada corriendo.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export function generateStaticParams() {
  // Las de la portada y las archivadas que salieron en las redes: ver
  // notasConImagen en lib/datos.js.
  return notasConImagen().map((n) => ({ id: parteDeNota(n) }));
}

export default function Imagen({ params }) {
  const n = obtenerNota(params.id);
  return tarjeta(n ?? {});
}
