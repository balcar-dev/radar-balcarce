// Llama al Worker de sondeo lote por lote, junta todo, imprime una tabla y guarda el JSON entero.
//   SONDEO_TOKEN=... node infra/sondeo-fuentes/cliente.mjs https://radar-balcarce-sondeo-fuentes.<cuenta>.workers.dev [salida.json] [--ua=robot]
// Lo usa el workflow "Sondeo de fuentes desde Cloudflare"; el token viene de la variable de entorno, nunca de la línea de comandos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const espera = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Pide un lote; reintenta unas veces porque justo después de subir el Worker puede tardar unos segundos en responder. */
export async function pedirLote(base, n, { token, ua = 'navegador', fetchFn = fetch, intentos = 6, esperarMs = 5000 } = {}) {
  let ultimo = null;
  for (let i = 1; i <= intentos; i += 1) {
    try {
      const r = await fetchFn(`${base.replace(/\/$/, '')}/sondear?lote=${n}&ua=${ua}`, { headers: { 'x-sondeo-token': token } });
      if (r.ok) return await r.json();
      ultimo = `HTTP ${r.status}`;
      if ([400, 401, 503].includes(r.status)) break; // no se arregla esperando
    } catch (e) {
      ultimo = String(e?.message ?? e);
    }
    if (i < intentos) await espera(esperarMs);
  }
  throw new Error(`el lote ${n} no contestó (${ultimo})`);
}

/** Todos los lotes, uno atrás del otro (no se suma carga sobre los medios). */
export async function sondearTodo(base, opciones = {}) {
  const primero = await pedirLote(base, 0, opciones);
  const resultados = [...primero.resultados];
  for (let n = 1; n < primero.lotes; n += 1) resultados.push(...(await pedirLote(base, n, opciones)).resultados);
  return { cuando: new Date().toISOString(), ua: primero.ua, total: primero.total, resultados };
}

/** ¿Anduvo? ok = contestó 2xx y trae notas (o es una página que se raspa y trae algo). */
export function estadoDe(r) {
  if (r.error && r.http === null) return 'sin conexión';
  if (r.http === null) return 'sin conexión';
  if (r.http < 200 || r.http >= 300) return r.desafio ? 'desafío' : `HTTP ${r.http}`;
  if (r.tipo === 'scrape') return r.bytes > 0 ? 'ok' : 'vacío';
  if (r.formato === 'html') return r.desafio ? 'desafío' : 'html (no es un feed)';
  return r.items > 0 ? 'ok' : 'vacío';
}

/** Un resumen en texto: cuántas anduvieron y la tabla de las que no. */
export function resumir(sondeo) {
  const filas = sondeo.resultados.map((r) => ({ ...r, estado: estadoDe(r) }));
  const ok = filas.filter((f) => f.estado === 'ok');
  const mal = filas.filter((f) => f.estado !== 'ok');
  const cuentas = {};
  for (const f of mal) cuentas[f.estado] = (cuentas[f.estado] ?? 0) + 1;
  const lineas = [
    `Sondeo desde Cloudflare (${sondeo.ua}): ${ok.length} de ${filas.length} feeds andan.`,
    mal.length ? `No andan ${mal.length}: ${Object.entries(cuentas).map(([k, v]) => `${v} ${k}`).join(', ')}.` : 'Todos andan.',
    '',
  ];
  const col = (t, n) => String(t ?? '').slice(0, n).padEnd(n);
  if (mal.length) {
    lineas.push(`${col('FUENTE', 40)} ${col('ESTADO', 22)} ${col('MS', 6)} DETALLE`);
    for (const f of mal) lineas.push(`${col(f.id, 40)} ${col(f.estado, 22)} ${col(f.ms, 6)} ${f.error ?? ''}`);
    lineas.push('');
  }
  const viejos = ok.filter((f) => f.nuevo && Date.now() - Date.parse(f.nuevo) > 7 * 86400000);
  if (viejos.length) lineas.push(`Contestan pero con lo más nuevo de hace más de 7 días: ${viejos.map((f) => f.id).join(', ')}.`, '');
  const lentos = ok.filter((f) => f.ms > 8000);
  if (lentos.length) lineas.push(`Contestan pero tardan más de 8 s: ${lentos.map((f) => `${f.id} (${Math.round(f.ms / 1000)} s)`).join(', ')}.`, '');
  return lineas.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const base = args.find((a) => /^https?:\/\//.test(a));
  const salida = args.find((a) => a.endsWith('.json'));
  const ua = args.find((a) => a.startsWith('--ua='))?.slice(5) === 'robot' ? 'robot' : 'navegador';
  const token = process.env.SONDEO_TOKEN;
  if (!base || !token) {
    console.error('Uso: SONDEO_TOKEN=... node infra/sondeo-fuentes/cliente.mjs <dirección del Worker> [salida.json] [--ua=robot]');
    process.exit(2);
  }
  const sondeo = await sondearTodo(base, { token, ua });
  if (salida) fs.writeFileSync(salida, `${JSON.stringify(sondeo, null, 1)}\n`);
  const texto = resumir(sondeo);
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\`\`\`\n${texto}\n\`\`\`\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
