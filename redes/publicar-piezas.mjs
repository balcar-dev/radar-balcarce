// Publica las piezas de video que tocan ahora, en Instagram y en la página de
// Facebook: el mismo video, a la misma hora.
//
// Recibe todo lo que necesita (el cliente de Meta, el manifiesto, el libro, el
// reloj) en vez de buscarlo solo, así se prueba sin red y sin archivos.
//
// Reglas de fondo:
//
//   · Una pieza se anota en el libro apenas la red la acepta, y se guarda el
//     libro después de CADA una. Si algo falla a la mitad, lo que ya salió no
//     vuelve a salir.
//   · La PRIMERA red de la lista manda: decide si la pieza está pendiente. Si
//     esa falla, no se intenta en las otras (así no queda un video en una red
//     y otro distinto en la otra cuando el plan elija otra nota la próxima
//     vez). Si falla una de las siguientes, se reintenta en el momento y, si
//     igual no anda, se avisa y se sigue: no se pierde lo que ya salió.

import { anotar } from './elegir.mjs';
import { claveDePieza, piezasQueTocan, tipoInstagram, pieDePieza } from './piezas.mjs';

/** Cómo se llama cada red en el libro y qué método del cliente la publica. */
export const REDES = {
  instagram: { libro: 'instagram', metodo: 'publicarVideoEnInstagram', nombre: 'Instagram' },
  facebook: { libro: 'facebookVideos', metodo: 'publicarVideoEnFacebook', nombre: 'Facebook' },
};

/** Los intentos en las redes que no mandan. */
const INTENTOS_SECUNDARIA = 3;

/**
 * @param {object} o
 * @param {object} o.api            el cliente de meta.mjs
 * @param {object[]} o.manifiesto   las piezas armadas (piezas.json)
 * @param {(archivo: string) => Buffer} o.leerVideo
 * @param {object} o.libro          lo ya publicado (se modifica)
 * @param {() => void} o.guardar    guarda el libro en disco
 * @param {boolean} o.activo        REDES_ACTIVAS: si no, sólo simula
 * @param {string[]} [o.destinos]   qué redes, en orden: la primera manda
 * @param {boolean} [o.sinHorario]  para probar a mano
 */
export async function publicarPiezas({
  api, manifiesto, leerVideo, libro, guardar, activo, destinos = ['instagram', 'facebook'],
  sinHorario = false, ahora = new Date(), log = console.log, esperar = (ms) => new Promise((r) => { setTimeout(r, ms); }),
}) {
  for (const red of destinos) libro[REDES[red].libro] ??= {};
  const principal = REDES[destinos[0]];

  const tocan = piezasQueTocan({ piezas: manifiesto, libro, ahora, sinHorario, red: principal.libro });
  const resultado = { publicadas: [], fallos: [], tokenMuerto: false };

  if (!tocan.length) {
    log('  Ninguna pieza para publicar ahora.');
    return resultado;
  }

  for (const pieza of tocan) {
    const tipo = tipoInstagram(pieza); // STORIES o REELS: en las dos redes se llaman igual
    const etiqueta = tipo === 'REELS' ? 'reel' : 'historia';

    if (!activo) {
      log(`  ${destinos.map((d) => REDES[d].nombre).join(' + ')} · ${etiqueta} · ${pieza.nombre} · ${pieza.titulo}`);
      log('             (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)');
      continue;
    }

    const video = leerVideo(pieza.archivo);
    const clave = claveDePieza(pieza.nombre, ahora);

    for (const [i, red] of destinos.entries()) {
      const { libro: rubro, metodo, nombre } = REDES[red];
      if (libro[rubro][clave]) continue; // esta red ya la tiene

      log(`  ${nombre} · ${etiqueta} · ${pieza.nombre} · ${pieza.titulo}`);
      const intentos = i === 0 ? 1 : INTENTOS_SECUNDARIA;
      let hecho = false;

      for (let intento = 1; intento <= intentos && !hecho; intento += 1) {
        try {
          const r = await api[metodo]({ video, tipo, pie: pieDePieza(pieza) });
          anotar(libro, rubro, clave, {
            mediaId: r.id, nombre: pieza.nombre, tipo, notaId: pieza.notaId ?? null,
          });
          guardar();
          hecho = true;
          if (i === 0) resultado.publicadas.push(pieza.nombre);
          log(`             publicado: ${r.id}`);
        } catch (e) {
          log(`             falló${intentos > 1 ? ` (intento ${intento} de ${intentos})` : ''}: ${e.message}`);
          if (e.tokenMuerto) {
            resultado.tokenMuerto = true;
            resultado.fallos.push({ pieza: pieza.nombre, red, error: e.message });
            log('             El token venció o lo revocaron: hay que generar otro.');
            return resultado;
          }
          if (intento === intentos) resultado.fallos.push({ pieza: pieza.nombre, red, error: e.message });
          else await esperar(4000 * intento);
        }
      }

      // Si la red que manda falló, no se intenta en las otras.
      if (i === 0 && !hecho) break;
    }
  }
  return resultado;
}
