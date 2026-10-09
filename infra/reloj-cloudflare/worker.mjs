// El reloj propio de Radar Balcarce en Cloudflare (9/10/2026): reemplaza a cron-job.org. Cloudflare despierta este programa a los minutos que dice
// wrangler.toml y él le pide a GitHub, con su API, que corra cada workflow (lo mismo que hace cron-job.org hoy). Sin dependencias.
//
// Necesita UN secreto, GITHUB_TOKEN: un token de grano fino de la cuenta del repositorio, sólo para este repositorio, con "Actions: lectura y
// escritura". Se carga una sola vez (docs/08-INFRAESTRUCTURA.md, "El reloj de Cloudflare"). Nunca se escribe en el código.

export const REPOSITORIO = 'balcar-dev/radar-balcarce';
export const RAMA = 'main';

/**
 * Qué workflows pedir según el minuto de la hora (Balcarce y UTC tienen los mismos minutos):
 *  - :00 y :30      → Actualizar la web y Vigilancia
 *  - :05, :35 y :45 → el reloj de Redes (acción "reloj")
 */
export function trabajosDelMinuto(minuto) {
  const m = Number(minuto);
  const lista = [];
  if (m === 0 || m === 30) {
    lista.push({ archivo: 'actualizar.yml' }, { archivo: 'vigilancia.yml' });
  }
  if (m === 5 || m === 35 || m === 45) lista.push({ archivo: 'redes.yml', inputs: { accion: 'reloj' } });
  return lista;
}

/** Pide a GitHub que corra un workflow. Devuelve { archivo, ok, estado }. */
export async function despertar({ archivo, inputs }, { token, fetchFn = fetch }) {
  const r = await fetchFn(`https://api.github.com/repos/${REPOSITORIO}/actions/workflows/${archivo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'radar-balcarce-reloj',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: RAMA, ...(inputs ? { inputs } : {}) }),
  });
  return { archivo, ok: r.status === 204, estado: r.status };
}

export default {
  async scheduled(evento, env) {
    if (!env.GITHUB_TOKEN) throw new Error('Falta el secreto GITHUB_TOKEN del reloj.');
    const minuto = new Date(evento.scheduledTime).getUTCMinutes();
    const resultados = [];
    for (const t of trabajosDelMinuto(minuto)) resultados.push(await despertar(t, { token: env.GITHUB_TOKEN }));
    const fallas = resultados.filter((x) => !x.ok);
    console.log(JSON.stringify({ minuto, resultados }));
    // Un error hace que Cloudflare marque la ejecución como fallida (se ve en el panel del Worker).
    if (fallas.length) throw new Error(`GitHub no aceptó: ${fallas.map((f) => `${f.archivo} (${f.estado})`).join(', ')}`);
  },
  // Para ver que está vivo (no despierta nada, no necesita el token).
  async fetch() { return new Response('Reloj de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }); },
};
