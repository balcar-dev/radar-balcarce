import { obtenerDatos, obtenerNota } from '@/lib/datos';
import { tarjeta } from '@/lib/tarjeta';
import { parteDeNota } from '@/lib/ruta';

// La imagen de cada nota para los posteos de INSTAGRAM: 1080x1350 (4:5), con el
// texto en la zona segura del centro. La otra (opengraph-image, apaisada) es para
// compartir enlaces en Facebook y WhatsApp. Se genera al compilar, como todas.
export const dynamic = 'force-static';

export function generateStaticParams() {
  return obtenerDatos().notas.map((n) => ({ id: parteDeNota(n) }));
}

export async function GET(_pedido, { params }) {
  const { id } = await params;
  return tarjeta(obtenerNota(id) ?? {}, { instagram: true });
}
