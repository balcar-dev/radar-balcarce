import { obtenerDatos } from '@/lib/datos';
import { sitio } from '@/lib/sitio';
import { armarUltimas } from '@/lib/para-agentes';

// Las últimas notas para programas y asistentes de IA (16/10/2026). Qué lleva y por qué: lib/para-agentes.js.
// No se indexa (X-Robots-Tag en web/public/_headers) pero tampoco se bloquea en robots.txt: los bots de IA que respetan robots.txt
// tienen que poder leerlo. Es un archivo más del sitio, armado al compilar.
export const dynamic = 'force-static';

export async function GET() {
  const d = obtenerDatos();
  const cuerpo = armarUltimas({ notas: d.notas ?? [], base: sitio(), generado: d.generado ?? null });
  return new Response(JSON.stringify(cuerpo), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
