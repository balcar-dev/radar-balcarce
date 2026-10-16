// El reloj propio de Radar Balcarce en Cloudflare (9/10/2026): reemplaza a cron-job.org. Cloudflare despierta este programa a los minutos que dice
// wrangler.toml y él le pide a GitHub, con su API, que corra cada workflow (lo mismo que hace cron-job.org hoy). Sin dependencias.
//
// Necesita UN secreto, GITHUB_TOKEN: un token de grano fino de la cuenta del repositorio, sólo para este repositorio, con "Actions: lectura y
// escritura". Se carga una sola vez (docs/08-INFRAESTRUCTURA.md, "El reloj de Cloudflare"). Nunca se escribe en el código.

export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
export const RAMA = 'main';

/**
 * Qué workflows pedir según el minuto de la hora (Balcarce y UTC tienen los mismos minutos):
 *  - :00 y :30      → Actualizar la web y Vigilancia
 *  - :05, :35 y :45 → el reloj de Redes (acción "reloj")
 *  - :15 de las 11 UTC (8:15 en Balcarce) y de las 0 UTC (21:15) → el informe diario por mail (redes/informe-diario.mjs): el de la mañana y el de la noche.
 *    Sólo si se pasa la hora UTC (el segundo parámetro): sin ella, el minuto 15 no despierta nada, como siempre.
 *  - :20 de las horas UTC pares de 10 a 2 (7, 9, 11… 23 en Balcarce) → "Ilustrar notas sin foto" en modo automático (regla 185): el relleno de
 *    ilustraciones de las notas que quedaron sin foto. También sólo con la hora UTC.
 */
export const HORAS_ILUSTRAR_UTC = [10, 12, 14, 16, 18, 20, 22, 0, 2];

export function trabajosDelMinuto(minuto, horaUtc = null) {
  const m = Number(minuto);
  const lista = [];
  if (m === 15 && horaUtc !== null && horaUtc !== undefined) {
    const h = Number(horaUtc);
    if (h === 11) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } });
    if (h === 0) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  }
  if (m === 0 || m === 30) {
    lista.push({ archivo: 'actualizar.yml' }, { archivo: 'vigilancia.yml' });
  }
  // Segundo intento a los :30 (16/10/2026): el cron propio de los :15 no despertó el informe ni a las 21:15 ni a las 8:15, y los :30 sí andan.
  // Si el de los :15 también llegó, el Worker del vigilante ve la misma clave (`informe-<momento>-<día>`) y NO manda un segundo mail.
  if (m === 30 && horaUtc !== null && horaUtc !== undefined) {
    const h = Number(horaUtc);
    if (h === 11) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'manana' } });
    if (h === 0) lista.push({ archivo: 'informe-diario.yml', inputs: { momento: 'noche' } });
  }
  if (m === 5 || m === 35 || m === 45) lista.push({ archivo: 'redes.yml', inputs: { accion: 'reloj' } });
  // 17/10/2026 (regla 185): a los :20, lejos de los :00/:30 de "Actualizar la web" y de sus respaldos de los :07/:37.
  if (m === 20 && horaUtc !== null && horaUtc !== undefined && HORAS_ILUSTRAR_UTC.includes(Number(horaUtc))) {
    lista.push({ archivo: 'ilustrar-notas.yml', inputs: { automatico: 'true' } });
  }
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
    const cuando = new Date(evento.scheduledTime);
    const minuto = cuando.getUTCMinutes();
    const resultados = [];
    for (const t of trabajosDelMinuto(minuto, cuando.getUTCHours())) resultados.push(await despertar(t, { token: env.GITHUB_TOKEN }));
    const fallas = resultados.filter((x) => !x.ok);
    console.log(JSON.stringify({ minuto, resultados }));
    // Un error hace que Cloudflare marque la ejecución como fallida (se ve en el panel del Worker).
    if (fallas.length) throw new Error(`GitHub no aceptó: ${fallas.map((f) => `${f.archivo} (${f.estado})`).join(', ')}`);
  },
  // Para ver que está vivo (no despierta nada, no necesita el token).
  async fetch() { return new Response('Reloj de Radar Balcarce: en hora.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } }); },
};
