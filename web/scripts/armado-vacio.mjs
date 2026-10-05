// Prueba de humo del armado del sitio con DATOS VACÍOS (4/10/2026). "Actualizar la web" estuvo 10 horas sin publicar porque no había ningún tema vivo y Next cortó el
// armado de todo ("is missing generateStaticParams()"). Esta prueba arma el sitio entero en una carpeta temporal, con una carpeta de datos vacía (o casi), para que un
// cambio que sólo rompe cuando no hay temas, ni eventos, ni notas de una sección, se descubra al subirlo y no a la noche con la web congelada.
//
//   node web/scripts/armado-vacio.mjs            todas las variantes
//   node web/scripts/armado-vacio.mjs --sin      sólo la primera
//
// La corre el workflow "Armado con datos vacíos" cuando se toca web/. Tarda uno o dos minutos. No toca web/data ni web/out.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const WEB = path.join(import.meta.dirname, '..');

const real = (nombre) => { try { return JSON.parse(fs.readFileSync(path.join(WEB, 'data', nombre), 'utf8')); } catch { return null; } };

/**
 * Las situaciones que probamos: sin ningún archivo de datos, con todo vacío y — lo que habría encontrado el error del 4/10 — con los datos de HOY pero sin una de sus
 * listas (sin temas, sin agenda, sin notas en la portada): lo que de a ratos pasa de verdad.
 */
export const VARIANTES = {
  'sin-archivos': () => ({}),
  'hoy-sin-temas': () => ({ 'portada.json': { ...real('portada.json'), temas: [] }, 'archivo.json': real('archivo.json'), 'agenda.json': real('agenda.json') }),
  'hoy-sin-agenda': () => ({ 'portada.json': real('portada.json'), 'archivo.json': real('archivo.json'), 'agenda.json': { ...real('agenda.json'), eventos: [], proximosAnuales: [] } }),
  'hoy-sin-notas-en-portada': () => ({ 'portada.json': { ...real('portada.json'), notas: [], temas: [] }, 'archivo.json': real('archivo.json'), 'agenda.json': real('agenda.json') }),
  'listas-vacias': () => ({
    'portada.json': { generado: new Date().toISOString(), notas: [], pendientes: [], temas: [], secciones: [], esperandoCuerpo: [] },
    'archivo.json': { notas: [] },
    'agenda.json': { eventos: [], proximosAnuales: [] },
  }),
};

const copiar = (de, a, { omitir = [] } = {}) => {
  fs.mkdirSync(a, { recursive: true });
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    if (omitir.includes(e.name)) continue;
    const origen = path.join(de, e.name);
    const destino = path.join(a, e.name);
    if (e.isDirectory()) copiar(origen, destino, { omitir });
    else fs.copyFileSync(origen, destino);
  }
};

/** Arma el sitio con los datos de la variante. Devuelve { ok, salida }. */
export function armarVacio(nombre, { conservar = false } = {}) {
  const datos = VARIANTES[nombre]?.();
  if (!datos) throw new Error(`variante desconocida: ${nombre}`);
  // Adentro de web/ (y no en la carpeta temporal del sistema): así Node encuentra web/node_modules subiendo por las carpetas, sin enlaces (que en Windows rompen webpack).
  // Las tarjetas leen las tipografías de ../reels/marca/fuentes (lib/tarjeta.js): se copian al lado, a la misma distancia que en el proyecto.
  const raiz = path.join(WEB, `.armado-${process.pid}`);
  const dir = path.join(raiz, 'web');
  fs.rmSync(raiz, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  copiar(path.join(WEB, '..', 'reels', 'marca', 'fuentes'), path.join(raiz, 'reels', 'marca', 'fuentes'));
  try {
    for (const carpeta of ['app', 'components', 'lib']) copiar(path.join(WEB, carpeta), path.join(dir, carpeta));
    for (const archivo of ['next.config.mjs', 'jsconfig.json', 'package.json']) fs.copyFileSync(path.join(WEB, archivo), path.join(dir, archivo));
    // Sin las fotos del banco (pesan y no cambian el armado) y sin los archivos grandes de datos.
    copiar(path.join(WEB, 'public'), path.join(dir, 'public'), { omitir: ['fotos-notas', 'escudos'] });
    fs.mkdirSync(path.join(dir, 'data'));
    // Los datos que el código importa directo (@/data/avisos.json): son parte del código, no de lo que se genera.
    fs.copyFileSync(path.join(WEB, 'data', 'avisos.json'), path.join(dir, 'data', 'avisos.json'));
    for (const [f, contenido] of Object.entries(datos)) fs.writeFileSync(path.join(dir, 'data', f), JSON.stringify(contenido));
    const r = spawnSync(process.execPath, [path.join(WEB, 'node_modules', 'next', 'dist', 'bin', 'next'), 'build'], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', SITIO: 'https://radarbalcarce.com' }, maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: r.status === 0, salida: `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n') };
  } finally {
    if (!conservar) fs.rmSync(raiz, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  const nombres = process.argv.includes('--sin') ? ['sin-archivos'] : Object.keys(VARIANTES);
  let fallo = false;
  for (const nombre of nombres) {
    const r = armarVacio(nombre);
    console.log(`${r.ok ? 'OK ' : 'FALLÓ'}  ${nombre}`);
    if (!r.ok) { console.log(r.salida); fallo = true; }
  }
  process.exit(fallo ? 1 : 0);
}
