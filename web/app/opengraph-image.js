import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';

// La tarjeta del sitio: la que se ve al compartir la portada o cualquier
// página que no tenga una propia.
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Radar Balcarce';

export default function Imagen() {
  return tarjeta({ titulo: 'Lo que pasa en Balcarce, la región y el país' });
}
