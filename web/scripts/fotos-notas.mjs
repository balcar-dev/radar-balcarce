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
import { excepcionActiva, menorEnActividadOficial, tieneFuenteOficialParaMenores } from '../../ingesta/fotos-menores.mjs';
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

// Lo que la IA dijo cuando descartó las fotos por un chico reconocible (mismo criterio que motivoDeLaNota, ingesta/auditar-fotos.mjs).
const DESCARTE_POR_MENOR = /menor|adolescen|niñ|alumn/i;

/**
 * La excepción de la regla 186 (ingesta/fotos-menores.mjs), con el interruptor prendido: una nota que quedó sin foto porque la IA vio un
 * chico, que tiene una fuente de la lista cerrada y que permite la excepción, se vuelve a probar UNA vez (`probadaConExcepcion`).
 * Sin esto, prender el interruptor no cambiaba nada para las notas que ya estaban en el banco.
 */
export function reintentoPorExcepcion(entrada, nota, { activa = excepcionActiva() } = {}) {
  if (!activa || !entrada || entrada.archivo || entrada.borrada || entrada.probadaConExcepcion) return false;
  if (entrada.origen === 'error' || entrada.error || FALLA.test(String(entrada.razon ?? ''))) return false;
  if (!DESCARTE_POR_MENOR.test(String(entrada.razon ?? ''))) return false;
  return tieneFuenteOficialParaMenores(nota) && menorEnActividadOficial(nota).ok;
}

/**
 * Prueba una foto para las notas que todavía no están en el banco (y las que
 * quedaron sin foto por una falla, hasta tres veces), hasta `tope` por corrida.
 * Nunca lanza: una nota que falla queda "intentado", con cuántas veces se probó.
 *
 * Devuelve el banco entero actualizado (para escribir tal cual) y, aparte,
 * los archivos nuevos a guardar (sólo los que consiguieron foto) y `porExcepcion`: las fotos con chicos que entraron por la excepción
 * de la regla 186 en esta corrida ([{ id, fuente, motivo, titulo }]), para el registro de la corrida (generar-datos las escribe en el log).
 */
export async function elegirFotosNuevas(notas, {
  banco = {}, tope = TOPE_POR_CORRIDA, clave, claveRespaldo, fetchFn = fetch, ahora = new Date(), achicar = achicarFoto,
  fotosMenoresOficiales = excepcionActiva(),
} = {}) {
  const bancoNuevo = { ...banco };
  const archivos = {};
  const porExcepcion = [];
  // Con el interruptor prendido, cada nota que se prueba queda anotada como probada con la excepción (no se vuelve a probar por eso).
  const marca = fotosMenoresOficiales ? { probadaConExcepcion: true } : {};
  // Las más nuevas primero (28/09, Hernán: "no hace falta completar las
  // notas anteriores, pero sí que todas las nuevas ahora tengan fotos"). Sin
  // esto, una nota recién publicada podía quedar detrás de un resto de notas
  // viejas sin probar y no le tocaba turno en la corrida donde más importa
  // (la primera media hora, cuando más se comparte). Las viejas se van
  // procesando igual, más despacio, y salen solas de la tapa pasadas las
  // HORAS_EN_PORTADA (lib/archivo.js). Las que se reintentan van después de
  // las que nunca se probaron.
  const candidatas = notas
    .filter((n) => (sePuedeReintentar(banco[n.id], { ahora, fuentes: cuantasFuentes(n) })
      || reintentoPorExcepcion(banco[n.id], n, { activa: fotosMenoresOficiales })) && elegiblePorSeccion(n))
    .sort((a, b) => (Number(!!banco[a.id]) - Number(!!banco[b.id])) || (new Date(b.fecha ?? 0) - new Date(a.fecha ?? 0)));

  let procesadas = 0;
  for (const n of candidatas) {
    if (procesadas >= tope) break;
    procesadas += 1;
    const intentos = (banco[n.id]?.intentos ?? (banco[n.id] ? 1 : 0)) + 1;
    try {
      const r = await elegirFotoParaNota(n, { clave, claveRespaldo, fetchFn, fotosMenoresOficiales });
      if (!r.elegida) {
        bancoNuevo[n.id] = {
          intentado: true, origen: r.origen, titulo: n.titulo ?? null, razon: r.razon ?? null, cuando: ahora.toISOString(), intentos, fuentes: cuantasFuentes(n), ...marca,
        };
        continue;
      }
      // La comparación ya bajó la imagen para mirarla, pero no la guardó: se
      // vuelve a bajar para quedarse con los bytes de la elegida nada más.
      const datos = r.elegida.datos ?? await descargarImagen(r.elegida.imagen, { fetchFn });
      const ext = EXTENSION[datos?.mime];
      if (!datos || !ext) {
        bancoNuevo[n.id] = { intentado: true, origen: r.origen, cuando: ahora.toISOString(), error: 'no se pudo volver a bajar la elegida', intentos, fuentes: cuantasFuentes(n), ...marca };
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
        razon: r.razon ?? null, cuando: ahora.toISOString(), ...marca,
        // La excepción de la regla 186 queda anotada en la entrada (el registro permanente para auditar: la poda le saca el archivo, no esto).
        ...(r.elegida.excepcion ? { excepcion: { ...r.elegida.excepcion, cuando: ahora.toISOString() } } : {}),
      };
      archivos[archivo] = guardar.bytes;
      if (r.elegida.excepcion) {
        porExcepcion.push({ id: n.id, fuente: r.elegida.excepcion.fuente ?? r.elegida.medio ?? null, motivo: r.elegida.excepcion.motivo ?? null, titulo: n.titulo ?? null });
      }
    } catch (e) {
      bancoNuevo[n.id] = { intentado: true, origen: 'error', error: e.message, cuando: ahora.toISOString(), intentos };
    }
  }
  return { banco: bancoNuevo, archivos, porExcepcion };
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
export function podarFotos({ banco = {}, enDisco = [], quedan = new Set(), retiradas = new Set(), ilustraciones = {} } = {}) {
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
  // Las ilustraciones hechas con IA (regla 182, web/data/fotos-ia.json, que escribe sólo "Ilustrar notas sin foto") no están en el banco: quedan
  // mientras su nota exista y no la haya retirado una persona. El libro no se toca acá: una entrada cuyo archivo se borró deja de usarse sola.
  for (const [id, il] of Object.entries(ilustraciones ?? {})) {
    if (il?.archivo && quedan.has(id) && !retiradas.has(id)) vivas.add(il.archivo.split('/').pop());
  }
  // Los collages de los repasos (collage-<id>.jpg, web/scripts/collage.mjs) no son de una nota del banco: quedan mientras
  // exista la nota del repaso.
  const delRepaso = (f) => f.startsWith('collage-') && quedan.has(f.slice('collage-'.length).replace(/\.\w+$/, ''));
  // La ilustración fija de las notas de efemérides (14/10/2026) tampoco es de una nota del banco: nunca se poda.
  // Lo mismo las ilustraciones del clima (16/10/2026, web/lib/fondos-clima.js): clima-<estado>-<n>.jpg.
  const fija = (f) => /^(efemeride|clima)-[\w-]+\.jpg$/.test(f); // la base (efemeride-fondo.jpg) y la de cada día (efemeride-2026-10-14.jpg, web/scripts/foto-efemeride.mjs)
  return { banco: bancoNuevo, borrar: enDisco.filter((f) => !vivas.has(f) && !delRepaso(f) && !fija(f)) };
}

/**
 * ¿Se puede mostrar HOY la foto con chicos que entró por la excepción de la regla 186? Con el interruptor prendido y la nota, como está
 * ahora, todavía permitiéndola (una corrección o una fuente nueva pudo volverla policial o de salud). Apagado el interruptor, esas fotos
 * dejan de mostrarse en la próxima corrida: el interruptor también es el freno.
 */
export const fotoConMenorPermitida = (nota, { activa = excepcionActiva() } = {}) => activa && menorEnActividadOficial(nota).ok;

/** La nota lista para la web: `{archivo, credito}`, o nada si no tiene. */
export function fotoDeLaWeb(banco, id) {
  const b = banco?.[id];
  if (!b || !b.archivo) return null;
  return { archivo: b.archivo, credito: b.credito };
}

// ------------------------------------------------- las ilustraciones con IA
//
// Reglas 182 y 185 (16 y 17/10/2026): las notas que quedaron sin foto pueden llevar una ilustración hecha con IA (un bodegón sin gente:
// web/scripts/ilustrar-notas.mjs, workflow "Ilustrar notas sin foto", automático cada 2 horas o a mano; o Gemini web, a mano). Se anotan en
// web/data/fotos-ia.json y tienen la prioridad MÁS BAJA: una foto real del banco o una que sumó una persona siempre gana. El epígrafe dice
// siempre que es de IA.

/** El epígrafe de una ilustración: siempre empieza así (la web, la tarjeta, el RSS y el pie de Instagram lo muestran tal cual). */
export const CREDITO_ILUSTRACION = 'Ilustración generada con IA';

/** ¿Esta foto (`{ archivo, credito }` de una nota, o una entrada de fotos-ia.json) es una ilustración de una nota? Se reconoce por el archivo: <id>-ia.jpg. */
export const esIlustracionDeNota = (foto) => /(^|\/)[a-z0-9]+-ia(?:-\d+)?\.jpg$/.test(String(foto?.archivo ?? ''));

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Una muerte, un velorio o un sepelio: lo único (con el semáforo rojo) que nunca lleva ilustración (regla 185). Sin "duelo" suelto (es un
// partido) ni "restos" suelto ("restos de poda").
const MUERTE_O_VELORIO = /\b(muert[eo]s?|muerta|muertas|murio|murieron|muere|mueren|fallec\w*|deceso\w*|sepeli\w*|inhumaci\w*|velatorio\w*|velorio\w*|luto|dias de duelo|duelo (?:nacional|provincial|municipal)|condolencia\w*|cementerio\w*|necropolis|cocheria\w*|funebre\w*|necrologic\w*|obituario\w*|qepd|sin vida|cadaver\w*|restos (?:mortales|oseos)|homicid\w*|femicid\w*|feminicid\w*|asesin\w*|suicid\w*|se quito la vida)\b/;

/**
 * Las notas propias traen su imagen (o ninguna, a propósito): el clima y las efemérides (ilustración fija), los repasos (collage), el dólar,
 * la F1 y el fútbol (foto libre). Nunca llevan una ilustración de una nota. Las de una pista, que no traen imagen, sí pueden; cualquier tipo
 * nuevo de nota propia, no, hasta que se sume acá.
 */
export const PROPIAS_SIN_IMAGEN = ['pista'];
export const esPropiaConImagen = (nota) => !!nota?.propia && !PROPIAS_SIN_IMAGEN.includes(nota.propia);

/** La palabra de muerte, velorio o sepelio que tiene el texto, o null. */
export function tocaUnaMuerte(texto) {
  return plano(texto).match(MUERTE_O_VELORIO)?.[0] ?? null;
}

/**
 * ¿La nota, como está AHORA, puede mostrar su ilustración? La red de seguridad de generar-datos: si una corrección o una fuente nueva la hizo
 * tocar una muerte o el semáforo rojo, la ilustración deja de mostrarse. Desde la regla 185 (17/10/2026) la ilustración, que nunca lleva
 * personas, va también en Policiales, Política, escuelas y chicos. `semaforo` es semaforoDelTexto (ingesta/ingesta.mjs), que lo pasa quien llama.
 */
export function ilustracionPermitida(nota, { semaforo = () => null } = {}) {
  if (!nota || esPropiaConImagen(nota) || nota.semaforo === 'rojo') return false;
  const texto = [nota.titulo, nota.copete, nota.cuerpo].filter(Boolean).join('. ');
  if (tocaUnaMuerte(texto)) return false;
  return semaforo(texto, { conMuerte: false })?.color !== 'rojo';
}

/** La foto de la web de una ilustración: el archivo y el epígrafe, que siempre dice que es de IA. */
function ilustracionDeLaWeb(ilustraciones, id) {
  const il = ilustraciones?.[id];
  if (!il?.archivo || !esIlustracionDeNota(il)) return null;
  const credito = /^Ilustración generada con IA/.test(String(il.credito ?? '')) ? il.credito : CREDITO_ILUSTRACION;
  return { archivo: il.archivo, credito };
}

/**
 * Les pone a las notas la foto que YA tienen en el banco. Corre siempre, en
 * la nube y en la PC (28/09: en la PC portada.json quedaba sin fotos); lo que
 * es sólo de la nube es elegir fotos nuevas (elegirFotosNuevas). Modifica las
 * notas y las devuelve.
 *
 * `ilustraciones` (web/data/fotos-ia.json) va al final: sólo si el banco no tiene una foto que la nota pueda mostrar, la nota no es propia e
 * `ilustracionPermitida` dice que sí. Una nota que tenía la ilustración y ya no puede (o el libro ya no la tiene) la pierde.
 */
export function conFotosDelBanco(notas = [], banco = {}, {
  ilustraciones = {}, ilustracionPermitida: permitida = () => true, fotoConMenorPermitida: conMenor = fotoConMenorPermitida,
} = {}) {
  for (const n of notas) {
    // Una foto con chicos que entró por la excepción de la regla 186 sólo se muestra si hoy se sigue pudiendo (fotoConMenorPermitida);
    // si no, se le saca a la nota aunque ya la tuviera puesta.
    const bloqueada = !!banco?.[n.id]?.excepcion && !conMenor(n);
    if (bloqueada && n.foto?.archivo && n.foto.archivo === banco[n.id].archivo) delete n.foto;
    const foto = bloqueada ? null : fotoDeLaWeb(banco, n.id);
    // Policiales sin fuente oficial no lleva foto real, ni aunque esté en el banco o la haya sumado una persona desde el panel
    // (8/10/2026: "Choque frontal en la Ruta 226" salía con una foto de El Eco de Tandil). Regla firme: CRITERIO-EDITORIAL.md, "Las fotos".
    if (foto && elegiblePorSeccion(n)) { n.foto = foto; continue; }
    // Esa foto real no va; la ilustración (sin personas, regla 185) sí puede.
    if (foto) delete n.foto;
    const il = ilustracionDeLaWeb(ilustraciones, n.id);
    if (il && !esPropiaConImagen(n) && permitida(n)) n.foto = il;
    else if (esIlustracionDeNota(n.foto)) delete n.foto;
  }
  return notas;
}
