// Piezas armadas de antemano que se reutilizan (1/10/2026, Hernán: "lo de participá se puede armar
// antes y usar durante dos semanas el mismo, hasta que volvamos a tener la clave paga"): un video con
// su voz ya grabado, guardado en reels/fijas/, que el plan sube en lugar de volver a pedir la voz.
// Cada audio es uno de los 10 del cupo del día; una pieza fija cuesta uno UNA vez y después cero.
//
// reels/fijas/vigencia.json dice hasta cuándo vale cada una:
//
//   { "participa-noticias": { "desde": "2026-10-05", "hasta": "2026-10-18", "armada": "2026-10-01", "duracion": 24.1 } }
//
// Pasada la vigencia, el plan vuelve solo a armar la pieza con voz. Se arman con el workflow "Fijar
// piezas" (.github/workflows/fijar-piezas.yml). Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

export const CARPETA_FIJAS = path.join(import.meta.dirname, 'fijas');
const ARCHIVO_DE_VIGENCIAS = 'vigencia.json';

/** Lo guardado: { pieza: { desde, hasta, armada, duracion } }. */
export function leerVigencias(carpeta = CARPETA_FIJAS) {
  try { return JSON.parse(fs.readFileSync(path.join(carpeta, ARCHIVO_DE_VIGENCIAS), 'utf8')); } catch { return {}; }
}

/** El día AAAA-MM-DD sumándole `dias`. */
export function sumarDias(dia, dias) {
  return new Date(Date.parse(`${dia}T12:00:00Z`) + dias * 86400e3).toISOString().slice(0, 10);
}

/**
 * La pieza fija que vale ese día, o null: tiene que estar en la vigencia, el día tiene que caer entre
 * `desde` y `hasta` y el video tiene que existir.
 * @returns {{ ruta: string, hasta: string, duracion: number|null } | null}
 */
export function fijaVigente(nombre, dia, { carpeta = CARPETA_FIJAS } = {}) {
  const v = leerVigencias(carpeta)[nombre];
  if (!v?.desde || !v?.hasta || dia < v.desde || dia > v.hasta) return null;
  const ruta = path.join(carpeta, `${nombre}.mp4`);
  if (!fs.existsSync(ruta)) return null;
  return { ruta, hasta: v.hasta, duracion: v.duracion ?? null };
}

/** Guarda un video ya armado como pieza fija, con su vigencia (por defecto, dos semanas desde `desde`). */
export function guardarFija({ nombre, mp4, desde, dias = 14, armada = desde, duracion = null, carpeta = CARPETA_FIJAS }) {
  if (!/^[a-z0-9-]+$/.test(nombre)) throw new Error(`nombre de pieza inválido: ${nombre}`);
  fs.mkdirSync(carpeta, { recursive: true });
  fs.copyFileSync(mp4, path.join(carpeta, `${nombre}.mp4`));
  const todas = leerVigencias(carpeta);
  todas[nombre] = { desde, hasta: sumarDias(desde, dias - 1), armada, ...(duracion ? { duracion: Number(Number(duracion).toFixed(1)) } : {}) };
  fs.writeFileSync(path.join(carpeta, ARCHIVO_DE_VIGENCIAS), `${JSON.stringify(todas, null, 2)}\n`);
  return todas[nombre];
}

// ---------------------------------------------------------------- a mano

// node reels/fijas.mjs --piezas=participa-noticias,participa-evento --desde=2026-10-05 [--dias=14] [--origen=reels/salida]
// (después de armarlas con `node reels/plan.mjs --generar --solo=… --incluir=… --sin-fijas`)
if (process.argv[1] && process.argv[1].endsWith('fijas.mjs')) {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const piezas = arg('piezas').split(',').map((s) => s.trim()).filter(Boolean);
  const desde = arg('desde');
  const origen = path.resolve(import.meta.dirname, '..', arg('origen', 'reels/salida'));
  if (!piezas.length || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    console.error('Uso: node reels/fijas.mjs --piezas=a,b --desde=AAAA-MM-DD [--dias=14] [--origen=reels/salida]');
    process.exit(2);
  }
  let manifiesto = [];
  try { manifiesto = JSON.parse(fs.readFileSync(path.join(origen, 'piezas.json'), 'utf8')); } catch { /* sin manifiesto */ }
  let falto = false;
  for (const nombre of piezas) {
    const mp4 = path.join(origen, `${nombre}.mp4`);
    if (!fs.existsSync(mp4)) { console.error(`  Falta ${nombre}.mp4 en ${origen}: no se armó.`); falto = true; continue; }
    const duracion = manifiesto.find((p) => p.nombre === nombre)?.duracion ?? null;
    const v = guardarFija({ nombre, mp4, desde, dias: Number(arg('dias', '14')), armada: new Date().toISOString().slice(0, 10), duracion });
    console.log(`  ${nombre}: vale del ${v.desde} al ${v.hasta}`);
  }
  if (falto) process.exit(1);
}
