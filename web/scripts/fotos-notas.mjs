// El banco de fotos, en vivo (28/09): a qué notas se les prueba una foto de
// verdad en cada corrida de "Actualizar la web", cuántas por vez, y qué se
// guarda. La comparación en sí (Gemini + Groq, nunca una marcada, y el
// respaldo de Wikimedia) vive en `ingesta/fotos.mjs`; acá sólo se decide
// A QUIÉN preguntarle y se arma lo que hay que guardar.
//
// El banco (`web/data/banco-fotos.json`) es la memoria: una nota que ya se
// probó no se vuelve a preguntar, tenga foto o no. Sin esto, cada corrida
// (cada media hora) volvería a gastar cupo de Gemini en notas que ya se sabe
// que no tienen una foto que sirva.

import { elegirFotoParaNota, descargarImagen } from '../../ingesta/fotos.mjs';

// Por corrida, no por día: la corrida se repite cada media hora, así que el
// banco se completa solo en un par de horas sin gastar de una todo el cupo
// que también necesita la lectura con IA (comparten GEMINI_API_KEY_CLASIFICACION).
export const TOPE_POR_CORRIDA = 10;

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

/**
 * Prueba una foto para las notas que todavía no están en el banco, hasta
 * `tope` por corrida. Nunca lanza: una nota que falla queda "intentado", para
 * no volver a preguntarle en la próxima corrida.
 *
 * Devuelve el banco entero actualizado (para escribir tal cual) y, aparte,
 * los archivos nuevos a guardar (sólo los que consiguieron foto).
 */
export async function elegirFotosNuevas(notas, {
  banco = {}, tope = TOPE_POR_CORRIDA, clave, claveRespaldo, fetchFn = fetch, ahora = new Date(),
} = {}) {
  const bancoNuevo = { ...banco };
  const archivos = {};
  const candidatas = notas.filter((n) => !banco[n.id] && elegiblePorSeccion(n));

  let procesadas = 0;
  for (const n of candidatas) {
    if (procesadas >= tope) break;
    procesadas += 1;
    try {
      const r = await elegirFotoParaNota(n, { clave, claveRespaldo, fetchFn });
      if (!r.elegida) {
        bancoNuevo[n.id] = { intentado: true, origen: r.origen, cuando: ahora.toISOString() };
        continue;
      }
      // La comparación ya bajó la imagen para mirarla, pero no la guardó: se
      // vuelve a bajar para quedarse con los bytes de la elegida nada más.
      const datos = await descargarImagen(r.elegida.imagen, { fetchFn });
      const ext = EXTENSION[datos?.mime];
      if (!datos || !ext) {
        bancoNuevo[n.id] = { intentado: true, origen: r.origen, cuando: ahora.toISOString(), error: 'no se pudo volver a bajar la elegida' };
        continue;
      }
      const archivo = `fotos-notas/${n.id}.${ext}`;
      bancoNuevo[n.id] = {
        archivo, medio: r.elegida.medio, credito: `Foto: ${r.elegida.medio}`,
        licencia: r.elegida.licencia ?? null, origen: r.origen, cuando: ahora.toISOString(),
      };
      archivos[archivo] = Buffer.from(datos.base64, 'base64');
    } catch (e) {
      bancoNuevo[n.id] = { intentado: true, origen: 'error', error: e.message, cuando: ahora.toISOString() };
    }
  }
  return { banco: bancoNuevo, archivos };
}

/** La nota lista para la web: `{archivo, credito}`, o nada si no tiene. */
export function fotoDeLaWeb(banco, id) {
  const b = banco[id];
  if (!b || !b.archivo) return null;
  return { archivo: b.archivo, credito: b.credito };
}
