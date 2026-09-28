// Los arreglos mecánicos de los títulos automáticos (27/09 y 28/09, Hernán).
//
// Son arreglos que no inventan nada: sacan lo que sobra, nunca agregan. Se
// aplican sin volver a pedirle nada a la IA, en las notas nuevas y en las ya
// publicadas (web/scripts/generar-datos.mjs, con `tituloAutomatico`), y el
// verificador los aplica antes de juzgar lo que escribió la IA
// (arreglarEscritura, ingesta/verificar.mjs). Lo que escribió una persona no
// se toca. La dirección de la nota no cambia (lib/ruta.js).
//
//   · "en Balcarce" al final (27/09): la IA se lo pegaba a casi todos los
//     títulos (44 de las 66 notas de la portada). En un medio de Balcarce
//     sobra. Balcarce en otro lugar del título ("Balcarce pierde el subsidio
//     al gas") queda.
//   · una etiqueta con dos puntos adelante (28/09): "Rugby: Pato Naranja
//     gana…", "Exclusivo: …". Se saca sólo si es una etiqueta conocida (una
//     sección, un deporte, "Exclusivo", "Video"…) y lo que sigue se sostiene
//     solo. Una etiqueta desconocida puede ser un lugar ("Necochea: …") y
//     sacarla haría pasar la nota por de Balcarce: ésa la rechaza el
//     verificador y la IA la vuelve a escribir.
//   · una coma o un conector al final (28/09): "Tecnopapa, el evento que
//     reunirá a toda la cadena productiva del país," es un título cortado.
//
// Sin dependencias: lo usan la web, la ingesta y las pruebas.

const COLA = /\s+(?:en|de)\s+(?:la\s+ciudad\s+de\s+)?Balcarce\s*\.?\s*$/i;

const cuantasPalabras = (s) => String(s).split(/\s+/).filter(Boolean).length;

/** El título sin "en Balcarce" al final, si lo que queda se sostiene solo. */
export function sinBalcarceAlFinal(titulo) {
  const t = String(titulo ?? '');
  if (!COLA.test(t)) return t;
  const sin = t.replace(COLA, '').trim();
  // "Llueve en Balcarce" no queda en "Llueve": con menos de cuatro palabras se deja.
  return cuantasPalabras(sin) >= 4 ? sin : t;
}

const plano = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** Las etiquetas que se pueden sacar sin perder nada: secciones, deportes y
 *  rótulos de gancho. Sin tildes y en minúscula. Un lugar NO va acá. */
const ETIQUETAS_CONOCIDAS = new Set([
  // Las secciones del sitio y las viejas.
  'balcarce', 'politica', 'policiales', 'futbol', 'deportes', 'automovilismo', 'agro', 'campo',
  'economia', 'cultura', 'cultura y agenda', 'agenda', 'tecnologia', 'argentina', 'pais',
  'servicios', 'region', 'provincia', 'sociedad', 'salud', 'educacion', 'clima', 'el tiempo',
  'interes general', 'informacion general', 'espectaculos', 'turismo', 'judiciales', 'seguridad',
  // Deportes.
  'rugby', 'basquet', 'basquetbol', 'hockey', 'voley', 'voleibol', 'tenis', 'padel', 'golf',
  'ciclismo', 'atletismo', 'boxeo', 'natacion', 'handball', 'automovilismo deportivo',
  'futbol local', 'liga balcarceña', 'liga balcarcena', 'turismo carretera', 'formula 1', 'tc',
  // Rótulos de gancho.
  'exclusivo', 'urgente', 'ultimo momento', 'ultima hora', 'atencion', 'ojo', 'video', 'videos',
  'fotos', 'galeria', 'confirmado', 'oficial', 'importante', 'alerta', 'polemica', 'atencion vecinos',
  'aviso', 'comunicado', 'info', 'informacion', 'dato', 'breves', 'en foco', 'lo ultimo',
]);

// Una etiqueta al comienzo: hasta cinco palabras sin signos antes de los dos
// puntos, y después un espacio (así "10:30" no cuenta).
const ETIQUETA = /^\s*([^:"“«¿?¡!.,]{1,40}?)\s*:\s+(.+)$/u;
const CITA_ADELANTE = /^["“«']/u;

/** La etiqueta con dos puntos al comienzo del título, o null. No cuenta una
 *  declaración ("Kicillof: \"Vamos a…\""): ahí los dos puntos atribuyen una cita. */
export function etiquetaAdelante(titulo) {
  const m = String(titulo ?? '').match(ETIQUETA);
  if (!m || CITA_ADELANTE.test(m[2]) || cuantasPalabras(m[1]) > 5) return null;
  return { etiqueta: m[1].trim(), resto: m[2].trim() };
}

const conMayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** El título sin una etiqueta CONOCIDA con dos puntos adelante, si lo que
 *  sigue se sostiene solo (cuatro palabras o más). */
export function sinEtiqueta(titulo) {
  const t = String(titulo ?? '');
  const e = etiquetaAdelante(t);
  if (!e || !ETIQUETAS_CONOCIDAS.has(plano(e.etiqueta)) || cuantasPalabras(e.resto) < 4) return t;
  return conMayuscula(e.resto);
}

/** Las palabras con las que un título no puede terminar: dejan la frase colgada. */
const CONECTORES_FINALES = new Set([
  'y', 'e', 'o', 'u', 'ni', 'de', 'del', 'a', 'al', 'en', 'con', 'por', 'para', 'que', 'la',
  'el', 'los', 'las', 'un', 'una', 'su', 'sus', 'tras', 'sin', 'entre', 'como', 'desde', 'hasta',
  'sobre', 'pero', 'porque', 'cuando', 'donde', 'se', 'lo', 'le', 'les', 'mientras',
]);

const SIGNOS_FINALES = /[\s,;:–—\-…]+$/u;
const PUNTOS_SUSPENSIVOS = /\s*(\.\.\.|…)\s*$/u;

/** ¿El título termina colgado (coma, dos puntos, guion, puntos suspensivos o
 *  un conector en minúscula)? */
export function terminaColgado(titulo) {
  const t = String(titulo ?? '').trim();
  if (!t) return false;
  if (SIGNOS_FINALES.test(t) || PUNTOS_SUSPENSIVOS.test(t)) return true;
  const ultima = t.split(/\s+/).pop().replace(/[.]+$/, '');
  return CONECTORES_FINALES.has(ultima);
}

/** El título sin la coma, el signo o el conector del final, si lo que queda
 *  se sostiene solo (cuatro palabras o más). */
export function sinCierreColgado(titulo) {
  const t = String(titulo ?? '');
  let sin = t.trim();
  for (let i = 0; i < 4 && terminaColgado(sin); i += 1) {
    sin = sin.replace(PUNTOS_SUSPENSIVOS, '').replace(SIGNOS_FINALES, '');
    const palabras = sin.split(/\s+/);
    if (CONECTORES_FINALES.has(palabras[palabras.length - 1])) sin = palabras.slice(0, -1).join(' ');
  }
  return sin && cuantasPalabras(sin) >= 4 && sin !== t.trim() ? sin : t;
}

/**
 * Todos los arreglos mecánicos de un título automático, en orden: la etiqueta
 * conocida del comienzo, el cierre colgado y "en Balcarce" al final. Lo que
 * no se puede arreglar sin inventar queda como está (y el verificador lo
 * rechaza si la nota es nueva).
 */
export function tituloAutomatico(titulo) {
  if (titulo == null) return '';
  return sinCierreColgado(sinBalcarceAlFinal(sinCierreColgado(sinEtiqueta(String(titulo).trim()))));
}
