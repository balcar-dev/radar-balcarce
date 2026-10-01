// Reintenta UNA parte de una pieza que no salió (1/10/2026, Hernán): la historia
// de un reel que Instagram rechazó, un reel que falló, una historia. Usa el video
// que ya se armó ese día y que "Redes" guardó como artefacto por tres días, así que
// NO vuelve a pedir la voz (el cupo de voz es de 10 audios por día): sólo lo sube.
//
// Lo dispara el botón "Reintentar" del panel del celular (pestaña Redes) por el
// workflow "Reintentar pieza" (.github/workflows/reintentar.yml), que antes baja
// el video a una carpeta.
//
//   node redes/reintentar.mjs --carpeta=reintento --pieza=noticia1 --red=instagram --parte=historia-del-reel [--dia=AAAA-MM-DD]
//
//   parte:  reel | historia | historia-del-reel
//   red:    instagram | facebook
//
// Respeta REDES_ACTIVAS (apagado, sólo simula), anota lo publicado en el libro como
// siempre (nunca sale dos veces) y borra el problema del libro si salió. Sin
// dependencias, como todo `redes/`.

import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, PAGINA_DE_FACEBOOK, sinToken } from './meta.mjs';
import { leerJson as leer } from '../ingesta/json.mjs';
import { diaAR } from '../ingesta/zona.mjs';
import { anotar, libroNuevo, estaActivo } from './elegir.mjs';
import { pieDePieza } from './piezas.mjs';
import { limpiarProblema, registrarProblema } from './publicar-piezas.mjs';

/** Cómo se llama cada red en el libro y qué método del cliente publica en ella (igual que publicar-piezas.mjs). */
const REDES = {
  instagram: { libro: 'instagram', metodo: 'publicarVideoEnInstagram', nombre: 'Instagram' },
  facebook: { libro: 'facebookVideos', metodo: 'publicarVideoEnFacebook', nombre: 'Facebook' },
};
export const PARTES = ['reel', 'historia', 'historia-del-reel'];
const INTENTOS = 3;

/**
 * @param {object} o
 * @param {object} o.api           el cliente de meta.mjs
 * @param {object} o.libro         lo ya publicado (se modifica)
 * @param {object[]} o.manifiesto  las piezas del artefacto (piezas.json)
 * @param {(archivo:string)=>Buffer} o.leerVideo
 * @param {()=>void} o.guardar
 * @param {boolean} o.activo       REDES_ACTIVAS
 * @returns {Promise<{ok: boolean, mensaje: string}>}
 */
export async function reintentarPieza({
  api, libro, manifiesto, leerVideo, guardar, activo, pieza: nombre, red, parte, dia = diaAR(), ahora = new Date(),
  log = console.log, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }),
}) {
  const r = REDES[red];
  if (!r) return { ok: false, mensaje: `La red "${red}" no existe (instagram o facebook).` };
  if (!PARTES.includes(parte)) return { ok: false, mensaje: `La parte "${parte}" no existe (${PARTES.join(', ')}).` };
  const pieza = (manifiesto ?? []).find((p) => p.nombre === nombre);
  if (!pieza) return { ok: false, mensaje: `No encuentro la pieza "${nombre}" entre los videos guardados.` };

  libro[r.libro] ??= {};
  libro.historiasDeReels ??= {};
  const clave = `${dia}/${nombre}`;
  const claveHistoria = `${red}/${clave}`;
  const yaEsta = parte === 'historia-del-reel' ? libro.historiasDeReels[claveHistoria] : libro[r.libro][clave];
  if (yaEsta) return { ok: true, mensaje: 'Ya estaba publicada: no se hizo nada.' };

  const tipo = parte === 'reel' ? 'REELS' : 'STORIES';
  if (parte === 'reel' && pieza.tipo !== 'reel') return { ok: false, mensaje: `"${nombre}" no es un reel.` };
  if (parte === 'historia' && pieza.tipo === 'reel') return { ok: false, mensaje: `"${nombre}" es un reel: para su historia usá "historia-del-reel".` };
  const archivo = tipo === 'STORIES' ? (pieza.archivoHistoria ?? pieza.archivo) : pieza.archivo;
  let video;
  try { video = leerVideo(archivo); } catch { return { ok: false, mensaje: `No encuentro el archivo de video de "${nombre}".` }; }

  if (!activo) {
    log(`  ${r.nombre} · ${parte} · ${nombre}: (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)`);
    return { ok: true, mensaje: 'Modo prueba: no se publicó (las redes están apagadas).' };
  }

  let ultimoError = '';
  for (let intento = 1; intento <= INTENTOS; intento += 1) {
    try {
      const subido = await api[r.metodo]({ video, tipo, pie: tipo === 'REELS' ? pieDePieza(pieza) : '' });
      if (parte === 'historia-del-reel') {
        anotar(libro, 'historiasDeReels', claveHistoria, { mediaId: subido.id, nombre, red, notaId: pieza.notaId ?? null });
      } else {
        anotar(libro, r.libro, clave, { mediaId: subido.id, nombre, tipo, notaId: pieza.notaId ?? null, notaIds: pieza.notaIds ?? [] });
      }
      limpiarProblema(libro, `${clave}/${red}/${parte}`);
      guardar();
      log(`  ${r.nombre} · ${parte} · ${nombre}: publicado ${subido.id}`);
      return { ok: true, mensaje: `Salió en ${r.nombre}.` };
    } catch (e) {
      ultimoError = e.message;
      log(`  ${r.nombre} · ${parte} · ${nombre}: falló (intento ${intento} de ${INTENTOS}): ${e.message}`);
      if (e.tokenMuerto) { ultimoError = 'El token venció o lo revocaron: hay que generar otro.'; break; }
      if (intento < INTENTOS) await esperar(4000 * intento);
    }
  }
  registrarProblema(libro, `${clave}/${red}/${parte}`, { pieza: nombre, red, parte, error: ultimoError, ahora });
  guardar();
  return { ok: false, mensaje: `Meta no la aceptó: ${ultimoError}` };
}

// ---------------------------------------------------------------- a mano

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const arg = (nombre, defecto = '') => (process.argv.find((a) => a.startsWith(`--${nombre}=`)) ?? `--${nombre}=${defecto}`).slice(nombre.length + 3);
  const carpeta = path.resolve(RAIZ, arg('carpeta', 'reintento'));
  const token = process.env.META_TOKEN;
  if (!token) { console.error('  Falta META_TOKEN.'); process.exit(1); }
  const LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');
  const libro = leer(LIBRO, libroNuevo());
  const manifiesto = leer(path.join(carpeta, 'piezas.json'), []);
  const r = await reintentarPieza({
    api: crearCliente({ token, paginaId: PAGINA_DE_FACEBOOK }), libro, manifiesto,
    leerVideo: (archivo) => fs.readFileSync(path.join(carpeta, path.basename(archivo))),
    guardar: () => fs.writeFileSync(LIBRO, JSON.stringify(libro, null, 2)),
    activo: estaActivo(process.env.REDES_ACTIVAS),
    pieza: arg('pieza'), red: arg('red'), parte: arg('parte'), dia: arg('dia') || diaAR(),
  });
  console.log(`  ${sinToken(r.mensaje, token)}`);
  if (!r.ok) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('reintentar.mjs')) {
  await main().catch((e) => {
    console.error(`No se pudo reintentar: ${e?.message ?? e}`);
    process.exit(1);
  });
}
