import { todasLasNotas, obtenerDatos } from '@/lib/datos';
import { sitio } from '@/lib/sitio';
import { armarIndice } from '@/lib/para-agentes';

// El índice de notas para buscar por palabras (16/10/2026): título, bajada, sección, fecha, fuentes y etiquetas de todo lo que tiene página
// y se ofrece a Google. (Lo iba a leer un servidor MCP, escrito y nunca activado: se borró el 17/10/2026; está en el historial de git.) Qué lleva y por qué: lib/para-agentes.js.
export const dynamic = 'force-static';

export async function GET() {
  const cuerpo = armarIndice({ notas: todasLasNotas(), base: sitio(), generado: obtenerDatos().generado ?? null });
  return new Response(JSON.stringify(cuerpo), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
