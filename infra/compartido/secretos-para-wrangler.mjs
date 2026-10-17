// Arma el JSON que `wrangler secret bulk` carga como secretos de un Worker, a partir de los secretos de GitHub que el workflow pasa por el entorno (18/10/2026).
//
//   node infra/compartido/secretos-para-wrangler.mjs RADAR_GITHUB_TOKEN VIGILANTE_TOKEN … | npx wrangler secret bulk --config …
//
// Imprime SOLO el JSON por la salida normal (que va directo a wrangler por un pipe, nunca al registro). Por la salida de error dice únicamente los NOMBRES de los que
// cargó y de los que faltan (un secreto vacío no se carga: el Worker conserva el que ya tenía). Nunca imprime un valor. Sin dependencias.

/** Los secretos pedidos que tienen valor, como { NOMBRE: valor }, y los que faltan. */
export function secretosDe(nombres, env = process.env) {
  const cargados = {};
  const faltan = [];
  for (const n of nombres) {
    const v = String(env[n] ?? '');
    if (v.trim()) cargados[n] = v; else faltan.push(n);
  }
  return { cargados, faltan };
}

if (process.argv[1] && process.argv[1].endsWith('secretos-para-wrangler.mjs')) {
  const nombres = process.argv.slice(2).filter((n) => /^[A-Z][A-Z0-9_]*$/.test(n));
  const { cargados, faltan } = secretosDe(nombres);
  console.error(`Secretos que se cargan: ${Object.keys(cargados).join(', ') || '(ninguno)'}.`);
  if (faltan.length) console.error(`Sin valor en GitHub (el Worker conserva el que ya tenga): ${faltan.join(', ')}.`);
  process.stdout.write(JSON.stringify(cargados));
}
