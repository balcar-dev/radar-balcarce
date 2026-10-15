// Los otros destinos de los reels: las redes, además de Facebook e Instagram, adonde puede ir el MISMO video.
//
// ESQUELETO (15/10/2026). Todavía no hay ningún cliente real: ni Telegram, ni Bluesky, ni YouTube, ni Threads, ni X, ni
// TikTok. Este archivo sólo fija el contrato común (docs/redes/PLAN-REELS-OTRAS-REDES.md, § 5), para que cada red nueva sea
// un archivo chico (`redes/telegram.mjs`, `redes/bluesky.mjs`…) que cumple el contrato y se suma al catálogo.
//
// Reglas de fondo (las mismas de publicar-piezas.mjs):
//
//   · SIMULA POR DEFECTO. Una red sólo publica si REDES_ACTIVAS dice "Si" Y su propio interruptor (REDES_TELEGRAM,
//     REDES_BLUESKY…) también dice "Si" Y no falta ninguna clave. Con cualquier otra cosa, escribe lo que haría y no
//     toca nada.
//   · NO SE ARMA NADA ACÁ. El video ya lo armó reels/plan.mjs para Instagram y Facebook (con el cupo de voz de ese día);
//     acá sólo se reparte. Repartir no gasta ni un audio.
//   · UNA RED QUE FALLA NO FRENA A LAS DEMÁS, ni a Instagram ni a Facebook, ni al libro. Se reintenta en la misma corrida
//     y, si no sale, queda anotado en `libro.problemas` (el mismo lugar de siempre).
//   · SIN RED PROPIA, SIN RELOJ PROPIO: los clientes llegan por parámetro. Se prueba entera.
//   · SIN DEPENDENCIAS: sólo node: y archivos de este repositorio.
//
// El contrato de un cliente (lo que cada red nueva tiene que exponer):
//
//   async publicarVideo({ video: Buffer, pieza, pie: string }) → { id: string, enlace?: string }
//
// `pie` llega armado con `pieDePieza(pieza, <id de la red>)`; cada cliente lo ADAPTA a los límites de su red (280
// caracteres en X, 300 en Bluesky, 1.024 en Telegram…) y es el responsable de que el aviso «Voz generada con inteligencia
// artificial.» siga en el texto o en la etiqueta propia de la red. Si la red dice que la clave murió, el error trae
// `tokenMuerto: true` y esa red se deja de intentar por el resto de la corrida.

import { estaActivo } from './elegir.mjs';
import {
  claveDePieza, enHora, ventanaDe, pieDePieza, NOMBRES_DE_PODCAST,
} from './piezas.mjs';
import { registrarProblema, limpiarProblema } from './publicar-piezas.mjs';

const REPASOS = NOMBRES_DE_PODCAST; // noticia1, noticia2, podcast

/**
 * El catálogo. Una entrada por red:
 *   libro        dónde se anota (libro.destinos[id][dia/pieza]); no se pisa con el de Instagram ni el de Facebook
 *   interruptor  la variable de GitHub que la prende (Settings → Variables), además de REDES_ACTIVAS
 *   claves       los secretos o variables que tienen que estar cargados (por nombre; los valores no pasan por acá)
 *   urlPublica   true si la red exige una dirección pública del video (Threads): hace falta alojarlo antes
 *   va           qué piezas (por su nombre en el libro) le tocan a esa red
 */
export const DESTINOS = {
  telegram: {
    nombre: 'Telegram (canal)', interruptor: 'REDES_TELEGRAM', claves: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CANAL'], urlPublica: false,
    va: () => true, // todo lo que sale con voz, incluido el clima y la farmacia: es la red de lo útil
  },
  bluesky: {
    nombre: 'Bluesky', interruptor: 'REDES_BLUESKY', claves: ['BLUESKY_USUARIO', 'BLUESKY_CLAVE_APP'], urlPublica: false,
    va: (n) => REPASOS.includes(n) || ['efemeride', 'feriado'].includes(n),
  },
  threads: {
    nombre: 'Threads', interruptor: 'REDES_THREADS', claves: ['THREADS_TOKEN', 'THREADS_USER_ID', 'THREADS_APP_SECRET', 'VIDEOS_BASE'], urlPublica: true,
    va: (n) => REPASOS.includes(n) || ['efemeride', 'feriado'].includes(n),
  },
  x: {
    nombre: 'X', interruptor: 'REDES_X', claves: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'], urlPublica: false,
    va: (n) => REPASOS.includes(n) || ['efemeride', 'feriado'].includes(n),
  },
  youtube: {
    nombre: 'YouTube Shorts', interruptor: 'REDES_YOUTUBE', claves: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'], urlPublica: false,
    va: (n) => ['efemeride', 'podcast', 'feriado', 'utiles', 'agenda'].includes(n), // lo que sigue sirviendo dentro de un mes
  },
  tiktok: {
    nombre: 'TikTok', interruptor: 'REDES_TIKTOK', claves: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN'], urlPublica: false,
    va: (n) => ['efemeride', 'podcast', 'feriado'].includes(n),
  },
};

/** Las claves que faltan para una red, por nombre. `env` es process.env. Una clave vacía cuenta como faltante. */
export function faltanClaves(id, env = {}) {
  return (DESTINOS[id]?.claves ?? []).filter((k) => !String(env[k] ?? '').trim());
}

/** ¿Está prendida la red? REDES_ACTIVAS y el interruptor propio dicen "Si". Las claves se miran aparte (faltanClaves). */
export function destinoPrendido(id, env = {}) {
  const d = DESTINOS[id];
  return Boolean(d) && estaActivo(env.REDES_ACTIVAS) && estaActivo(env[d.interruptor]);
}

/** A qué redes nuevas le toca una pieza, por su nombre. */
export const destinosDeLaPieza = (nombre) => Object.keys(DESTINOS).filter((id) => DESTINOS[id].va(nombre));

/** ¿Ya salió esta pieza hoy en esta red? */
export const yaEnDestino = (libro, id, clave) => Boolean(libro?.destinos?.[id]?.[clave]);

/**
 * Reparte las piezas ya armadas que están en su hora a las redes nuevas que les tocan.
 *
 * @param {object} o
 * @param {Record<string, {publicarVideo: Function}>} o.clientes   un cliente por red (los que faltan se saltean)
 * @param {object[]} o.manifiesto   las piezas armadas (reels/salida/piezas.json): { nombre, tipo, hora, titulo, archivo }
 * @param {(archivo: string) => Buffer} o.leerVideo
 * @param {object} o.libro          lo ya publicado (se modifica)
 * @param {() => void} o.guardar    guarda el libro en disco
 * @param {Record<string, string>} o.env   process.env: REDES_ACTIVAS, los interruptores y las claves
 * @param {boolean} [o.sinHorario]  para probar a mano: todas las que falten
 * @param {number} [o.intentos]     por red y por pieza, en esta corrida
 */
export async function publicarEnDestinos({
  clientes = {}, manifiesto = [], leerVideo, libro, guardar = () => {}, env = {}, sinHorario = false, intentos = 3,
  ahora = new Date(), log = console.log, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }),
}) {
  libro.destinos ??= {};
  const resultado = { publicadas: [], simuladas: [], fallos: [] };
  const caidas = new Set(); // redes que dijeron "la clave murió": no se insiste en esta corrida

  const enHoraLas = manifiesto.filter((p) => sinHorario || enHora(p.hora, ahora, ventanaDe(p.nombre)));
  for (const pieza of enHoraLas) {
    const clave = claveDePieza(pieza.nombre, ahora);
    for (const id of destinosDeLaPieza(pieza.nombre)) {
      if (caidas.has(id) || yaEnDestino(libro, id, clave)) continue;
      const d = DESTINOS[id];

      const faltan = faltanClaves(id, env);
      if (!destinoPrendido(id, env) || faltan.length) {
        const motivo = !destinoPrendido(id, env) ? `falta REDES_ACTIVAS=Si y ${d.interruptor}=Si` : `faltan las claves ${faltan.join(', ')}`;
        log(`  ${d.nombre} · ${pieza.nombre} · ${pieza.titulo}\n             (modo prueba: no se publicó. ${motivo})`);
        resultado.simuladas.push({ pieza: pieza.nombre, red: id });
        continue;
      }
      const cliente = clientes[id];
      if (!cliente) { log(`  ${d.nombre} · ${pieza.nombre}: sin cliente cargado, se saltea`); continue; }

      log(`  ${d.nombre} · ${pieza.nombre} · ${pieza.titulo}`);
      const video = leerVideo(pieza.archivo);
      for (let intento = 1; intento <= intentos; intento += 1) {
        try {
          const r = await cliente.publicarVideo({ video, pieza, pie: pieDePieza(pieza, id) });
          libro.destinos[id] ??= {};
          libro.destinos[id][clave] = {
            cuando: ahora.toISOString(), mediaId: r.id, nombre: pieza.nombre, ...(r.enlace ? { permalink: r.enlace } : {}),
          };
          limpiarProblema(libro, `${clave}/${id}/reel`);
          guardar();
          resultado.publicadas.push({ pieza: pieza.nombre, red: id });
          log(`             publicado: ${r.id}`);
          break;
        } catch (e) {
          log(`             falló (intento ${intento} de ${intentos}): ${e.message}`);
          if (e.tokenMuerto || intento === intentos) {
            if (e.tokenMuerto) caidas.add(id);
            resultado.fallos.push({ pieza: pieza.nombre, red: id, error: e.message });
            registrarProblema(libro, `${clave}/${id}/reel`, { pieza: pieza.nombre, red: id, parte: 'reel', error: e.message, ahora });
            guardar();
            break;
          }
          await esperar(4000 * intento);
        }
      }
    }
  }
  return resultado;
}
