import { tarjeta, TAMANO, TIPO } from '@/lib/tarjeta';
import { diaEscrito } from '@/lib/hoy';

// La imagen al compartir /hoy por WhatsApp: "Lo de hoy en Balcarce" con el día escrito, así quien la recibe sabe de qué día es antes de
// abrirla. Se arma al compilar, igual que las demás (rige el día de Balcarce de la última compilación).
export const dynamic = 'force-static';
export const size = TAMANO;
export const contentType = TIPO;
export const alt = 'Lo de hoy en Balcarce';

export default function Imagen() {
  return tarjeta({ titulo: `Lo de hoy en Balcarce: ${diaEscrito()}` });
}
