// El banco de fotos, en vivo (28/09): a qué notas se les prueba una foto de
// verdad en cada corrida de "Actualizar la web", cuántas por vez, y qué se
// guarda. La comparación en sí (Gemini + Groq, nunca una marcada, y el
// respaldo de Wikimedia) vive en `ingesta/fotos.mjs`; acá sólo se decide
// A QUIÉN preguntarle y se arma lo que hay que guardar.
//
// El banco (`web/data/banco-fotos.json`) es la memoria: una nota que ya se
// probó no se vuelve a preguntar, tenga foto o no. Sin esto, cada corrida
// (cada media hora) volvería a gastar cupo de Gemini en notas que ya se sabe
// que no tienen una foto que sirva. Salvo si quedó sin foto por una falla (sin
// cupo, ninguna foto en ese momento, una descarga): ésa se prueba hasta tres
// veces, con una hora entre una y otra (`sePuedeReintentar`, 29/09).

import { elegirFotoParaNota, descargarImagen, creditoDeFoto } from '../../ingesta/fotos.mjs';
import { achicarFoto, fotoParaGuardar } from './achicar-foto.mjs';

// Por corrida, no por día: la corrida se repite cada media hora, así que el
// banco se completa solo en un par de horas sin gastar de una todo el cupo
// que también necesita la lectura con IA (comparten GEMINI_API_KEY_CLASIFICACION).
export const TOPE_POR_CORRIDA = 10;

/** Cuántas fuentes tiene una nota para buscarle la foto. */
const cuantasFuentes = (n) => (n.fuentesConsultadas?.length || (n.enlace ? 1 : 0));

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Las notas de Policiales sólo llevan foto real si es de una fuente oficial
 * (Bomberos, Policía): CRITERIO-EDITORIAL.md, "Las fotos". El resto de las
 * secciones no tiene esta restricción (los menores y las víctimas ya ni
 * llegan acá: el semáforo rojo las frena antes).
 */
export function elegiblePorSeccion(nota) {
  if (nota.seccion !== 'Policiales') return true;
  const fuentes = nota.fuentesConsultadas?.length ? nota.fuentesConsultadas : (nota.origenes ?? []);
  return fuentes.some((f) => f.oficial === true);
}

/** Cuántas veces se prueba una nota que quedó sin foto por una falla (no porque la
 *  IA la descartó), y cuánto se espera entre una vez y la otra. */
export const REINTENTOS_DE_FOTO = {
  veces: 3,
  minutosEntreIntentos: 60,
  // El repaso (1/10, Hernán: "si faltan fotos, un repaso cada tanto"): una falla que ya se probó tres veces se vuelve a
  // mirar cada tantas horas, hasta `repasos` veces más.
  horasEntreRepasos: 6,
  repasos: 2,
};

// Lo que no es una decisión sobre la foto sino una falla: sin cupo o sin
// respuesta de la IA, ninguna foto que bajar en ese momento, o la elegida que
// no se pudo volver a bajar. Eso se vuelve a probar (29/09: cinco de 17 notas
// sin foto eran esto, y el banco no las volvía a mirar nunca). Lo que la IA
// descartó a propósito (menores, marcas, otro medio) no se vuelve a preguntar.
const FALLA = /^(Gemini falló|Groq también falló|sin clave para comparar|sin fotos para comparar)/;

/** ¿Esta entrada del banco se puede volver a probar ahora? */
export function sePuedeReintentar(entrada, { ahora = new Date(), reintentos = REINTENTOS_DE_FOTO, fuentes = null } = {}) {
  if (!entrada) return true;
  if (entrada.archivo || entrada.borrada) return false;
  const intentos = entrada.intentos ?? 1;
  const pasaron = ahora.getTime() - Date.parse(entrada.cuando ?? 0);
  const falla = entrada.origen === 'error' || !!entrada.error || FALLA.test(String(entrada.razon ?? ''));
  if (falla) {
    if (intentos < reintentos.veces) return pasaron >= reintentos.minutosEntreIntentos * 60_000;
    // Ya se probó tres veces: un repaso cada tanto, un par de veces más.
    return intentos < reintentos.veces + reintentos.repasos && pasaron >= reintentos.horasEntreRepasos * 3_600_000;
  }
  // Una foto que la IA descartó no se vuelve a preguntar... salvo que ahora la nota tenga más fuentes que cuando se
  // probó (1/10: dos notas de la misma noticia que se unen suman fotos nuevas para elegir).
  const antes = entrada.fuentes;
  if (fuentes != null && antes != null && fuentes > antes && intentos < reintentos.veces + reintentos.repasos) {
    return pasaron >= reintentos.minutosEntreIntentos * 60_000;
  }
  return false;
}

/**
 * Prueba una foto para las notas que todavía no están en el banco (y las que
 * quedaron sin foto por una falla, hasta tres veces), hasta `tope` por corrida.
 * Nunca lanza: una nota que falla queda "intentado", con cuántas veces se probó.
 *
 * Devuelve el banco entero actualizado (para escribir tal cual) y, aparte,
 * los archivos nuevos a guardar (sólo los que consiguieron foto).
 */
export async function elegirFotosNuevas(notas, {
  banco = {}, tope = TOPE_POR_CORRIDA, clave, claveRespaldo, fetchFn = fetch, ahora = new Date(), achicar = achicarFoto,
} = {}) {
  const bancoNuevo = { ...banco };
  const archivos = {};
  // Las más nuevas primero (28/09, Hernán: "no hace falta completar las
  // notas anteriores, pero sí que todas las nuevas ahora tengan fotos"). Sin
  // esto, una nota recién publicada podía quedar detrás de un resto de notas
  // viejas sin probar y no le tocaba turno en la corrida donde más importa
  // (la primera media hora, cuando más se comparte). Las viejas se van
  // procesando igual, más despacio, y salen solas de la tapa pasadas las
  // HORAS_EN_PORTADA (lib/archivo.js). Las que se reintentan van después de
  // las que nunca se probaron.
  const candidatas = notas
    .filter((n) => sePuedeReintentar(banco[n.id], { ahora, fuentes: cuantasFuentes(n) }) && elegiblePorSeccion(n))
    .sort((a, b) => (Number(!!banco[a.id]) - Number(!!banco[b.id])) || (new Date(b.fecha ?? 0) - new Date(a.fecha ?? 0)));

  let procesadas = 0;
  for (const n of candidatas) {
    if (procesadas >= tope) break;
    procesadas += 1;
    const intentos = (banco[n.id]?.intentos ?? (banco[n.id] ? 1 : 0)) + 1;
    try {
      const r = await elegirFotoParaNota(n, { clave, claveRespaldo, fetchFn });
      if (!r.elegida) {
        bancoNuevo[n.id] = {
          intentado: true, origen: r.origen, titulo: n.titulo ?? null, razon: r.razon ?? null, cuando: ahora.toISOString(), intentos, fuentes: cuantasFuentes(n),
        };
        continue;
      }
      // La comparación ya bajó la imagen para mirarla, pero no la guardó: se
      // vuelve a bajar para quedarse con los bytes de la elegida nada más.
      const datos = r.elegida.datos ?? await descargarImagen(r.elegida.imagen, { fetchFn });
      const ext = EXTENSION[datos?.mime];
      if (!datos || !ext) {
        bancoNuevo[n.id] = { intentado: true, origen: r.origen, cuando: ahora.toISOString(), error: 'no se pudo volver a bajar la elegida', intentos, fuentes: cuantasFuentes(n) };
        continue;
      }
      // Achicada a 1.200 px y JPEG (29/09): la original pesaba hasta 1,8 MB y crecía el
      // repositorio unos 25 MB por día. Si no se puede achicar, se guarda la original.
      const guardar = await fotoParaGuardar(Buffer.from(datos.base64, 'base64'), ext, { achicar });
      const archivo = `fotos-notas/${n.id}.${guardar.ext}`;
      // Con todo lo necesario para revisarla y reusarla (28/09, Hernán: "que
      // esas fotos se estén guardando con los datos que corresponda"): de qué
      // nota nuestra es, de qué nota del medio salió, la dirección original de
      // la imagen y por qué se eligió.
      bancoNuevo[n.id] = {
        archivo, medio: r.elegida.medio, credito: creditoDeFoto(r.elegida),
        licencia: r.elegida.licencia ?? null, ...(r.elegida.autor ? { autor: r.elegida.autor } : {}), origen: r.origen,
        titulo: n.titulo ?? null, enlace: r.elegida.enlace ?? null, imagenOriginal: r.elegida.imagen ?? null,
        razon: r.razon ?? null, cuando: ahora.toISOString(),
      };
      archivos[archivo] = guardar.bytes;
    } catch (e) {
      bancoNuevo[n.id] = { intentado: true, origen: 'error', error: e.message, cuando: ahora.toISOString(), intentos };
    }
  }
  return { banco: bancoNuevo, archivos };
}

/**
 * Qué fotos del banco se borran (28/09, auditoría): las de notas retiradas a
 * mano (una nota puede retirarse por un menor o una víctima, y su foto seguía en
 * radarbalcarce.com/fotos-notas/) y las de notas que ya no están en ningún lado
 * (`quedan`: el archivo, la portada y la ingesta de hoy). La entrada del banco
 * se queda sin `archivo` pero con `intentado`, para no volver a gastar cupo en
 * la misma nota. `enDisco` son los nombres de fotos-notas/; un archivo que no
 * es de ninguna nota del banco también se borra. Devuelve el banco nuevo y los
 * nombres a borrar; no toca el disco.
 */
export function podarFotos({ banco = {}, enDisco = [], quedan = new Set(), retiradas = new Set() } = {}) {
  const bancoNuevo = { ...banco };
  const vivas = new Set();
  for (const [id, b] of Object.entries(banco)) {
    if (!b?.archivo) continue;
    const nombre = b.archivo.split('/').pop();
    if (retiradas.has(id) || !quedan.has(id)) {
      const { archivo, credito, ...resto } = b;
      bancoNuevo[id] = { ...resto, intentado: true, borrada: true };
    } else {
      vivas.add(nombre);
    }
  }
  // Los collages de los repasos (collage-<id>.jpg, web/scripts/collage.mjs) no son de una nota del banco: quedan mientras
  // exista la nota del repaso.
  const delRepaso = (f) => f.startsWith('collage-') && quedan.has(f.slice('collage-'.length).replace(/\.\w+$/, ''));
  return { banco: bancoNuevo, borrar: enDisco.filter((f) => !vivas.has(f) && !delRepaso(f)) };
}

/** La nota lista para la web: `{archivo, credito}`, o nada si no tiene. */
export function fotoDeLaWeb(banco, id) {
  const b = banco?.[id];
  if (!b || !b.archivo) return null;
  return { archivo: b.archivo, credito: b.credito };
}

/**
 * Les pone a las notas la foto que YA tienen en el banco. Corre siempre, en
 * la nube y en la PC (28/09: en la PC portada.json quedaba sin fotos); lo que
 * es sólo de la nube es elegir fotos nuevas (elegirFotosNuevas). Modifica las
 * notas y las devuelve.
 */
export function conFotosDelBanco(notas = [], banco = {}) {
  for (const n of notas) {
    const foto = fotoDeLaWeb(banco, n.id);
    if (foto) n.foto = foto;
  }
  return notas;
}
