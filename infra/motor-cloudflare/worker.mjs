// El Worker del motor (18/10/2026, mudanza a Cloudflare). Workers Builds necesita un Worker al que conectar el repositorio: éste. No arma la web
// (eso lo hace vuelta.mjs dentro de la compilación): sólo cuenta cómo viene el motor, para el vigilante y para mirar desde el celular.
//
//   GET /          → «en hora» (no gasta nada)
//   GET /estado    → con el encabezado x-token (VIGILANTE_TOKEN): cómo terminó la última vuelta y cuántos minutos de compilación lleva el mes
//
// Lee de R2 (binding MOTOR, el depósito `radar-motor`) lo que escribe la vuelta (estado-r2.mjs). Sin dependencias.

import { mesDe, claveDelMes, debeCorrer } from './presupuesto.mjs';

const CLAVE_DEL_ESTADO = 'motor/estado.json';

const json = (obj, estado = 200) => new Response(JSON.stringify(obj), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** Compara dos textos sin que el tiempo delate cuántas letras coinciden. */
export function mismoToken(a, b) {
  const x = String(a ?? ''); const y = String(b ?? '');
  if (!x || !y || x.length !== y.length) return false;
  let r = 0;
  for (let i = 0; i < x.length; i++) r |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return r === 0;
}

async function leerJson(deposito, clave) {
  try { const o = await deposito.get(clave); return o ? JSON.parse(await o.text()) : null; } catch { return null; }
}

/** El estado del motor tal como lo ve el vigilante. */
export async function estadoDelMotor(deposito, ahora = new Date()) {
  const [ultima, registro] = await Promise.all([leerJson(deposito, CLAVE_DEL_ESTADO), leerJson(deposito, claveDelMes(mesDe(ahora)))]);
  const presupuesto = debeCorrer({ registro, ultimaVueltaBuena: ultima?.ultimaBuena ?? null, ahora });
  return { ultima, mes: registro ? { mes: registro.mes, minutos: Math.round((registro.segundos ?? 0) / 60), vueltas: registro.vueltas } : null, presupuesto };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/estado') {
      if (!mismoToken(request.headers.get('x-token'), env.VIGILANTE_TOKEN)) return json({ error: 'sin permiso' }, 401);
      if (!env.MOTOR) return json({ error: 'falta el depósito MOTOR' }, 500);
      return json(await estadoDelMotor(env.MOTOR));
    }
    return new Response('Motor de Radar Balcarce: en hora. La vuelta corre en Workers Builds.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
