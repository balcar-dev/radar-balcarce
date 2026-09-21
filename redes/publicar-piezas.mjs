// Publica en Instagram las piezas de video que tocan ahora.
//
// Recibe todo lo que necesita (el cliente de Meta, el manifiesto, el libro, el
// reloj) en vez de buscarlo solo, así se prueba sin red y sin archivos.
//
// Regla de oro: una pieza se anota en el libro apenas Instagram la acepta, y
// se guarda el libro después de CADA una. Si algo falla a la mitad, lo que ya
// salió no vuelve a salir.

import { anotar } from './elegir.mjs';
import { claveDePieza, piezasQueTocan, tipoInstagram, pieDePieza } from './piezas.mjs';

/**
 * @param {object} o
 * @param {object} o.api            el cliente de meta.mjs
 * @param {object[]} o.manifiesto   las piezas armadas (piezas.json)
 * @param {(archivo: string) => Buffer} o.leerVideo
 * @param {object} o.libro          lo ya publicado (se modifica)
 * @param {() => void} o.guardar    guarda el libro en disco
 * @param {boolean} o.activo        REDES_ACTIVAS: si no, sólo simula
 * @param {boolean} [o.sinHorario]  para probar a mano
 */
export async function publicarPiezas({
  api, manifiesto, leerVideo, libro, guardar, activo, sinHorario = false, ahora = new Date(), log = console.log,
}) {
  libro.instagram ??= {};
  const tocan = piezasQueTocan({ piezas: manifiesto, libro, ahora, sinHorario });
  const resultado = { publicadas: [], fallos: [], tokenMuerto: false };

  if (!tocan.length) {
    log('  Ninguna pieza para publicar en Instagram ahora.');
    return resultado;
  }

  for (const pieza of tocan) {
    const tipo = tipoInstagram(pieza);
    log(`  Instagram · ${tipo === 'REELS' ? 'reel' : 'historia'} · ${pieza.nombre} · ${pieza.titulo}`);

    if (!activo) {
      log('             (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)');
      continue;
    }

    try {
      const r = await api.publicarVideoEnInstagram({
        video: leerVideo(pieza.archivo), tipo, pie: pieDePieza(pieza),
      });
      anotar(libro, 'instagram', claveDePieza(pieza.nombre, ahora), {
        mediaId: r.id, nombre: pieza.nombre, tipo, notaId: pieza.notaId ?? null,
      });
      guardar();
      resultado.publicadas.push(pieza.nombre);
      log(`             publicado: ${r.id}`);
    } catch (e) {
      resultado.fallos.push({ pieza: pieza.nombre, error: e.message });
      log(`             falló: ${e.message}`);
      if (e.tokenMuerto) {
        resultado.tokenMuerto = true;
        log('             El token venció o lo revocaron: hay que generar otro.');
        break;
      }
    }
  }
  return resultado;
}
