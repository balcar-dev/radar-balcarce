import { obtenerDatos, proximosEventos } from '@/lib/datos';
import { sitio } from '@/lib/sitio';
import { armarServicios } from '@/lib/para-agentes';

// La farmacia de turno, el clima y la agenda para programas y asistentes de IA (16/10/2026). Qué lleva y por qué: lib/para-agentes.js.
export const dynamic = 'force-static';

export async function GET() {
  const d = obtenerDatos();
  const cuerpo = armarServicios({
    farmacias: d.farmacias, clima: d.clima, eventos: proximosEventos(), base: sitio(), generado: d.generado ?? null,
  });
  return new Response(JSON.stringify(cuerpo), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
