// Publica en las redes lo que corresponde ahora.
//
//   node redes/publicar.mjs --verificar   comprueba que el acceso a Meta anda
//   node redes/publicar.mjs --facebook    publica en Facebook lo que toque
//   node redes/publicar.mjs --enlaces     completa en el libro la dirección
//                                         pública de los podcasts (sólo lee)
//
// Por defecto NO publica: muestra qué haría. Para que publique de verdad hace
// falta REDES_ACTIVAS=si (en GitHub, Settings → Variables → Actions). Así se
// puede mirar qué elegiría durante unos días antes de soltarlo.
//
// Necesita META_TOKEN. Nunca lo muestra.

import fs from 'node:fs';
import path from 'node:path';
import { crearCliente, ErrorMeta, sinToken } from './meta.mjs';
import { publicarPiezas, completarEnlaces } from './publicar-piezas.mjs';
import {
  elegirParaFacebook, mensajeDeNota, mensajeParaInstagram, enlaceDeNota, imagenDeNota, libroNuevo, anotar, yaPublicada, estaActivo,
} from './elegir.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const PORTADA = path.join(RAIZ, 'web', 'data', 'portada.json');
const LIBRO = path.join(RAIZ, 'web', 'data', 'redes.json');

const SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
// Ojo: NO es el número de la dirección facebook.com/profile.php?id=..., que es el
// del perfil de la página. El de la API sale de Configuración del negocio →
// Páginas → "Identificador".
const PAGINA = process.env.META_PAGE_ID ?? '1254237411116171';
const ACTIVO = estaActivo(process.env.REDES_ACTIVAS);

function leer(archivo, porDefecto) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

function cliente() {
  const token = process.env.META_TOKEN;
  if (!token) {
    console.error('  Falta META_TOKEN. En GitHub: Settings → Secrets and variables → Actions.');
    process.exit(1);
  }
  return { token, api: crearCliente({ token, paginaId: PAGINA }) };
}

async function verificar() {
  const { token, api } = cliente();
  try {
    const v = await api.verificar();
    console.log(`  Página:     ${v.pagina}`);
    console.log(`  Instagram:  ${v.instagram ? `@${v.instagram}` : 'NO VINCULADO'}`);
    console.log(`  Permisos:   ${v.permisos ? v.permisos.join(', ') : '(este token no los lista)'}`);
    if (!v.instagram) process.exit(1);
  } catch (e) {
    console.error(`  No anduvo: ${sinToken(e.message, token)}`);
    if (e instanceof ErrorMeta) {
      console.error(`  código: ${e.codigo} · subcódigo: ${e.subcodigo} · tipo: ${e.tipo} · http: ${e.http}`);
    }
    process.exit(1);
  }
}

async function facebook() {
  const { token, api } = cliente();
  const portada = leer(PORTADA, { notas: [] });
  const libro = leer(LIBRO, libroNuevo());
  libro.facebook ??= {};
  // El mismo posteo de Facebook, espejado como foto en el feed de
  // Instagram: misma noticia en las dos redes, con la tarjeta propia que ya
  // se genera para compartir (nunca la foto de la fuente). Va aparte del
  // libro de Facebook porque puede fallar sin que eso invalide lo que ya
  // se publicó ahí.
  libro.instagramFeed ??= {};

  const elegidas = elegirParaFacebook({ notas: portada.notas ?? [], libro });
  if (!elegidas.length) {
    console.log('  Nada para publicar en Facebook ahora.');
    return;
  }

  let fallo = false;
  for (const nota of elegidas) {
    const enlace = enlaceDeNota(nota, SITIO);
    console.log(`  Facebook · ${nota.titulo}\n             ${enlace}`);

    if (!ACTIVO) {
      console.log('             (modo prueba: no se publicó. Falta REDES_ACTIVAS=si)');
      continue;
    }

    try {
      const r = await api.publicarEnFacebook({ mensaje: mensajeDeNota(nota, SITIO), enlace });
      // El enlace y los temas quedan en el libro: el enlace es la dirección que
      // ya está en Facebook (generar-datos la respeta aunque cambie el titular)
      // y los temas sirven para no repetir tema al día siguiente.
      anotar(libro, 'facebook', nota.id, {
        postId: r.id, titulo: nota.titulo, enlace, temas: nota.temas ?? [],
      });
      fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
      console.log(`             publicado: ${r.id}`);
    } catch (e) {
      fallo = true;
      console.error(`             falló: ${sinToken(e.message, token)}`);
      if (e instanceof ErrorMeta && e.tokenMuerto) {
        console.error('             El token venció o lo revocaron: hay que generar otro.');
        break;
      }
      continue; // sin Facebook, tampoco tiene sentido intentar Instagram
    }

    // El espejo en Instagram: si falla, se avisa pero no se cuenta como un
    // fallo del posteo en sí — ya quedó publicado en Facebook, que es lo
    // principal.
    if (!yaPublicada(libro, 'instagramFeed', nota.id)) {
      try {
        const ri = await api.publicarFotoEnInstagram({ imagenUrl: imagenDeNota(nota, SITIO), pie: mensajeParaInstagram(nota, SITIO) });
        anotar(libro, 'instagramFeed', nota.id, { mediaId: ri.id, titulo: nota.titulo, enlace });
        fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
        console.log(`             + Instagram: ${ri.id}`);
      } catch (e) {
        console.error(`             Instagram (feed) falló, queda sólo en Facebook: ${sinToken(e.message, token)}`);
      }
    }
  }
  if (fallo) process.exit(1);
}

/** Los videos del día (historias y reels) a Instagram. */
async function piezas() {
  const { api } = cliente();
  const carpeta = path.join(RAIZ, 'reels', 'salida');
  const manifiesto = leer(path.join(carpeta, 'piezas.json'), []);
  if (!manifiesto.length) {
    console.log('  No hay piezas armadas (falta reels/salida/piezas.json).');
    return;
  }
  const libro = leer(LIBRO, libroNuevo());
  // --destino=instagram | facebook | ambas (por defecto). La primera red de la
  // lista es la que manda: decide si la pieza está pendiente.
  const destino = (process.argv.find((a) => a.startsWith('--destino=')) ?? '--destino=ambas').slice(10);
  const destinos = { ambas: ['instagram', 'facebook'], instagram: ['instagram'], facebook: ['facebook'] }[destino];
  if (!destinos) {
    console.error(`  Destino desconocido: ${destino}. Usá instagram, facebook o ambas.`);
    process.exit(2);
  }
  const r = await publicarPiezas({
    api, manifiesto, libro, activo: ACTIVO, destinos,
    sinHorario: process.argv.includes('--sin-horario'),
    leerVideo: (archivo) => fs.readFileSync(path.join(carpeta, archivo)),
    guardar: () => fs.writeFileSync(LIBRO, JSON.stringify(libro, null, 2)),
  });
  if (r.fallos.length) process.exit(1);
}

/**
 * La dirección pública de los podcasts de los últimos días que todavía no la
 * tienen: la usa la nota de cada podcast en la web (web/lib/notas-propias.js).
 * Sólo pregunta, no publica nada, así que corre aunque REDES_ACTIVAS esté
 * apagado. Nunca hace fallar la corrida.
 */
async function enlaces() {
  const token = process.env.META_TOKEN;
  if (!token) {
    console.log('  Sin META_TOKEN: no se completan las direcciones de los podcasts.');
    return;
  }
  const api = crearCliente({ token, paginaId: PAGINA });
  const libro = leer(LIBRO, libroNuevo());
  try {
    const cambios = await completarEnlaces({ api, libro });
    if (cambios) fs.writeFileSync(LIBRO, `${JSON.stringify(libro, null, 2)}\n`);
    else console.log('  Los podcasts de estos días ya tienen su dirección (o no hay).');
  } catch (e) {
    console.log(`  No se pudieron completar las direcciones: ${sinToken(e.message, token)}`);
  }
}

// Sólo corre cuando esto se ejecuta directamente (node redes/publicar.mjs),
// igual que reels/plan.mjs y compañía: así se puede importar (por ejemplo,
// desde una prueba) sin que dispare una publicación real ni cierre el
// proceso con process.exit().
if (process.argv[1] && process.argv[1].endsWith('publicar.mjs')) {
  const modo = process.argv[2];
  if (modo === '--verificar') await verificar();
  else if (modo === '--facebook') await facebook();
  else if (modo === '--piezas') await piezas();
  else if (modo === '--enlaces') await enlaces();
  else {
    console.log('Uso: node redes/publicar.mjs --verificar | --facebook | --enlaces | --piezas [--sin-horario] [--destino=ambas|instagram|facebook]');
    process.exit(2);
  }
}
