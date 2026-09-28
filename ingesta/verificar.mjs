// El control sobre lo que escribe la IA.
//
// Una IA que reescribe noticias puede equivocarse de una forma que ningún
// filtro de palabras atrapa: no dice nada prohibido, dice algo falso. Le
// agrega un nombre que no estaba, cambia un 14 por un 40, pone un "el
// viernes" que la fuente nunca dijo, o convierte un "según la denuncia" en
// un hecho. En un medio que publica solo, esos errores salen sin que nadie
// los mire.
//
// Esto compara lo que escribió la IA contra lo que ella misma recibió —el
// título y el resumen de la fuente, el texto completo de la nota original
// (ingesta/articulo.mjs), los resúmenes de los otros medios que contaron lo
// mismo y los antecedentes (ver abajo)— y rechaza el texto si aparece algo
// que no estaba. Todo lo de hoy llega junto en `resumen`
// (fuenteParaVerificar, reels/reescritura.mjs). No usa otra IA: son comparaciones mecánicas, que
// cuestan cero, no fallan por cuota y hacen siempre lo mismo.
//
// Es deliberadamente estricto. Un falso positivo cuesta poco: la nota sale
// igual, con el resumen del medio original, que es como salía antes de que
// existiera la reescritura. Un falso negativo es publicar una mentira.
//
// Sin dependencias: corre en GitHub Actions sin instalar nada. Los límites de
// largo salen de ingesta/criterio.mjs, los números del criterio editorial
// (CRITERIO-EDITORIAL.md, sección 11).
//
//   verificar({ titulo, resumen, antecedentes? }, { titulo, copete, cuerpo, guion }, { estilo? })
//     → { ok: boolean, problemas: [{ tipo, detalle }] }
//   arreglarEscritura({ titulo, copete, cuerpo, guion }, { hoy? })
//     → { nuevo, arreglos }: lo que se corrige sin inventar, antes de verificar (28/09)
//   verificarExtras(fuente, { claves, seSabe, noConfirmado, aportes, textoRedes, etiquetas })
//     → { claves: { ok, problemas }, …, etiquetas: { ok, problemas, validas } }
//   depurarCuerpo(fuente, { copete, cuerpo })
//     → { cuerpo, sacadas }: el cuerpo sin las oraciones que no pasan (25/09)
//
// Los ANTECEDENTES (desde el 25/09) son notas que el sitio ya publicó sobre el
// mismo tema, que la IA recibe para dar contexto. Cuentan como material
// recibido, pero con una condición: un dato que sólo está en un antecedente
// es de ANTES. Puede aparecer en el cuerpo, las claves o lo que se sabe sólo
// si la oración lo marca como anterior ("en agosto", "como se había
// informado", "la semana pasada"); nunca en el título, la bajada, el guion ni
// el texto para redes, que por definición cuentan lo de hoy.

import {
  TITULO, BAJADA, CUERPO, GUION, PARTES, COPIA_MAXIMA, ESTILO, RELLENO as FRASES_DE_RELLENO,
} from './criterio.mjs';
import { sinTildes } from '../web/lib/texto.js';
import {
  etiquetaAdelante, terminaColgado, sinEtiqueta, sinCierreColgado,
} from '../web/lib/titulos.js';
import { diaSemanaAR } from './zona.mjs';

const palabras = (s) => sinTildes(s).match(/[a-zñ0-9]+/g) ?? [];

// ------------------------------------------------------------------ números

const NUMEROS_EN_PALABRAS = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70,
  ochenta: 80, noventa: 90, cien: 100,
};

/** Todos los valores numéricos de un texto: en cifras y en palabras. */
export function numerosDe(texto) {
  const t = sinTildes(texto);
  const valores = [];

  // En cifras. "1.234" son mil doscientos treinta y cuatro; "12,5" es doce y
  // medio; "14 millones" es catorce millones; "2 millones y medio", dos
  // millones quinientos mil.
  for (const m of t.matchAll(/(\d[\d.,]*)(?:\s+(millones|millon|mil)(\s+y\s+medio)?)?/g)) {
    let n = m[1].replace(/[.,]+$/, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '');
    else n = n.replace(',', '.');
    let v = Number(n);
    if (!Number.isFinite(v)) continue;
    if (m[3]) v += 0.5;
    if (m[2] === 'mil') v *= 1000;
    else if (m[2]) v *= 1_000_000;
    valores.push(v);
  }

  // En palabras con millones o mil (28/09): "un millón y medio" es 1.500.000,
  // y no "uno" suelto. Una cifra mal copiada ("un millón y medio" cuando la
  // fuente dice 1,7 millones) pasaba sin que nadie la mirara. Lo que se lee
  // acá se saca del texto antes de buscar números sueltos en palabras.
  const enPalabras = new RegExp(`\\b(un|una|medio|${Object.keys(NUMEROS_EN_PALABRAS).join('|')})\\s+(millones|millon|mil)(\\s+y\\s+medio)?\\b`, 'g');
  const resto = t.replace(enPalabras, (_, cuanto, escala, yMedio) => {
    let v = cuanto === 'medio' ? 0.5 : (NUMEROS_EN_PALABRAS[cuanto] ?? 1);
    if (yMedio) v += 0.5;
    valores.push(v * (escala === 'mil' ? 1000 : 1_000_000));
    return ' ';
  });

  // En palabras.
  for (const w of palabras(resto)) {
    if (NUMEROS_EN_PALABRAS[w]) valores.push(NUMEROS_EN_PALABRAS[w]);
  }
  return valores;
}

/**
 * ¿Ese número puede salir de la fuente?
 *
 * Los chicos tienen que ser exactos: "cuatro heridos" no es "tres heridos".
 * Los grandes pueden estar redondeados —la instrucción a la IA lo pide—, así
 * que se acepta hasta un 6% de diferencia.
 */
function estaEnLaFuente(valor, deLaFuente) {
  if (deLaFuente.includes(valor)) return true;
  if (valor < 100) return false;
  return deLaFuente.some((f) => f >= 100 && Math.abs(f - valor) / f <= 0.06);
}

// ------------------------------------------------------------------- nombres

// Lo que la IA puede agregar sin inventar nada: el lugar donde trabaja.
const DE_CASA = new Set(['balcarce', 'argentina', 'buenos', 'aires', 'radar']);

const DIAS = new Set(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']);
const CALENDARIO = new Set([
  ...DIAS,
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
]);

/**
 * Los nombres propios de un texto: palabras con mayúscula que no arrancan
 * una oración, y las siglas. "Kevin Gómez" cuenta; "Durante la sesión…" no.
 */
export function nombresDe(texto) {
  const nombres = new Set();
  const letras = 'A-Za-zÁÉÍÓÚÑÜáéíóúñü';
  const re = new RegExp(`(?<![${letras}])([A-ZÁÉÍÓÚÑÜ][${letras}]{1,})(?![${letras}])`, 'gu');
  for (const m of String(texto).matchAll(re)) {
    const antes = String(texto).slice(0, m.index).trimEnd();
    const inicioDeOracion = !antes || /[.!?¿¡:;"“«(\n]$/u.test(antes);
    const sigla = m[1] === m[1].toUpperCase() && m[1].length >= 2;
    if (inicioDeOracion && !sigla) continue;
    nombres.add(sinTildes(m[1]));
  }
  return nombres;
}

// ---------------------------------------------------------------- acusaciones

// Verbos que afirman un delito. Si aparecen sin atribuir a alguien, es el
// error que la doctrina Campillay busca evitar: presentar como hecho lo que
// es una acusación.
const DELITOS = /\b(asesino|mato|robo|hurto|estafo|violo|abuso|agredio|golpeo|amenazo|secuestro|apuñalo|balaceo|disparo|falsifico|defraudo)\b/;

// Relleno sin dato (28/09, de una auditoría de notas reales contra la
// fuente): frases que no dicen nada que no esté ya dicho, o que esconden que
// no hay un dato ("fuentes consultadas" en vez de decir quién). Se tratan
// igual que un número que no cuadra: se saca la oración entera, la diga o no
// la fuente (no es un error de exactitud, es un vicio de estilo propio). La
// lista es RELLENO, en ingesta/criterio.mjs y en CRITERIO-EDITORIAL.md.
const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RELLENO = new RegExp(`\\b(${FRASES_DE_RELLENO.map((f) => escaparRegex(sinTildes(f))).join('|')})\\b`);

// Localía inventada (28/09): afirmar que algo es "de Balcarce" o afecta a
// los balcarcenses cuando la fuente no lo dice. Deliberadamente angosto (no
// cualquier "local" o "vecino": esas son palabras demasiado comunes con
// otros usos, "el local de la esquina" no tiene nada que ver) para no sacar
// oraciones buenas por error; agrandar esta lista con casos reales, no a
// ojo.
const LOCALIA_SIN_RESPALDO = /\b(de nuestra ciudad|de nuestro pueblo|nuestros vecinos|balcarcense|balcarcenses|vecinos de balcarce|automovilistas locales|productores locales|comerciantes locales)\b/;
const ATRIBUCION = /\b(segun|habria|habrian|presunt|supuest|acusad|denunci|imputad|sospech|investig|policia|fiscal|justicia|alegadamente|de acuerdo)\b/;

// ----------------------------------------------------------------- las citas

function citasDe(texto) {
  const citas = [];
  for (const m of String(texto).matchAll(/["“«]([^"”»]{6,})["”»]/g)) citas.push(m[1]);
  return citas;
}

// ----------------------------------------------------------------- la copia

/** ¿Cuántas palabras seguidas copió del original? */
function tramoCopiado(original, nuevo) {
  const a = palabras(original);
  const b = palabras(nuevo);
  let mejor = 0;
  for (let i = 0; i < b.length; i += 1) {
    for (let j = 0; j < a.length; j += 1) {
      let k = 0;
      while (i + k < b.length && j + k < a.length && b[i + k] === a[j + k]) k += 1;
      if (k > mejor) mejor = k;
    }
  }
  return mejor;
}

// ------------------------------------------------------------------ el juicio

export const LIMITES = {
  // El tope duro. La instrucción pide unos 70; más de 90 no entra en el celular.
  titulo: TITULO.maximo,
  // La bajada: dos o tres frases (desde el 25/09; antes, dos líneas y 280).
  copete: BAJADA.maximo,
  guion: GUION.maximo,
  // De 100 a 180 palabras en uno a tres párrafos: con esto sobra. Es la nota,
  // no una crónica.
  cuerpo: CUERPO.maximo,
  // Las partes nuevas (25/09): cada punto de una lista, y el texto para redes.
  clave: PARTES.clave,
  dato: PARTES.dato,
  aporte: PARTES.aporte,
  textoRedes: PARTES.textoRedes,
  etiqueta: PARTES.etiqueta,
  // Más de esto seguido, palabra por palabra, es copiar y no reescribir.
  copiaMaxima: COPIA_MAXIMA,
};

// ------------------------------------------------------------ los antecedentes

// Lo que dice "esto es de antes". Sin tildes y en minúscula: se compara
// contra la oración pasada por sinTildes.
const MARCA_ANTERIOR = /\b(antes|anterior|anteriores|anteriormente|previamente|habia|habian|hace (unos |unas )?(dias|semanas|meses|anos)|la semana pasada|el mes pasado|el ano pasado|a principios de|a mediados de|a fines de|en su momento|oportunamente|como se habia|ya se habia|en (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre))\b/;

// Dónde puede aparecer un dato de un antecedente, marcado como anterior. En
// el título, la bajada, el guion, el texto para redes y lo que aportó cada
// fuente, nunca: esos cuentan lo de hoy.
const ADMITEN_ANTECEDENTES = new Set(['cuerpo', 'claves', 'seSabe', 'noConfirmado']);

/** Las oraciones de un texto. Un "1.234" no corta: hace falta un espacio. */
function oraciones(texto) {
  return String(texto).split(/(?<=[.!?])\s+|\n+/).map((o) => o.trim()).filter(Boolean);
}

/** Lo que se le dio a la IA, preparado una vez para todas las comparaciones. */
function contexto(fuente = {}) {
  const origen = `${fuente.titulo ?? ''}. ${fuente.resumen ?? ''}`;
  const previo = String(fuente.antecedentes ?? '');
  return {
    origen,
    origenNorm: sinTildes(origen),
    palabrasOrigen: new Set(palabras(origen)),
    numerosOrigen: numerosDe(origen),
    nombresOrigen: nombresDe(origen),
    previoNorm: sinTildes(previo),
    palabrasPrevio: new Set(palabras(previo)),
    numerosPrevio: numerosDe(previo),
    nombresPrevio: nombresDe(previo),
  };
}

/** ¿Ese nombre está en el texto? Un plural o un femenino del mismo nombre no
 *  es un nombre nuevo. */
function nombreConocido(nombre, nombres, palabrasDelTexto) {
  if (nombres.has(nombre) || palabrasDelTexto.has(nombre)) return true;
  const raiz = nombre.replace(/(es|s|a|o)$/, '');
  return raiz.length >= 4 && [...palabrasDelTexto].some((p) => p.startsWith(raiz));
}

/**
 * Los problemas de UN texto (un campo, o un punto de una lista) contra lo que
 * recibió la IA. Es el corazón del verificador: lo usan verificar() para el
 * título, la bajada, el cuerpo y el guion, y verificarExtras() para las
 * partes nuevas, así las dos cosas se controlan exactamente igual.
 */
function problemasDelTexto(ctx, campo, texto, { soloForma = false, limite = LIMITES[campo] } = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });
  const t = String(texto ?? '');
  if (!t) return problemas;

  // 1. Largo.
  if (limite && t.length > limite) {
    agregar('largo', `el ${campo} tiene ${t.length} caracteres, el máximo es ${limite}`);
  }

  // 2 a 5: los datos. Con `soloForma` no se compara contra la fuente: se usa
  // para revalidar lo que ya pasó esa comparación con un texto más completo
  // del que hoy se tiene a mano.
  if (!soloForma) {
    const admite = ADMITEN_ANTECEDENTES.has(campo);
    const comoActual = (dato) => `el ${campo} usa ${dato}, que sale de una nota anterior, como si fuera de hoy`;

    for (const oracion of oraciones(t)) {
      const marcada = admite && MARCA_ANTERIOR.test(sinTildes(oracion));

      // 2. Números. Cualquier cifra o número en palabras que la fuente no traiga.
      for (const v of numerosDe(oracion)) {
        if (estaEnLaFuente(v, ctx.numerosOrigen)) continue;
        if (estaEnLaFuente(v, ctx.numerosPrevio)) {
          if (!marcada) agregar('antecedente', comoActual(v.toLocaleString('es-AR')));
          continue;
        }
        agregar('numero', `el ${campo} dice ${v.toLocaleString('es-AR')} y la fuente no lo dice`);
      }

      // 3. Nombres propios y siglas que la fuente no nombra.
      for (const nombre of nombresDe(oracion)) {
        if (DE_CASA.has(nombre) || CALENDARIO.has(nombre)) continue;
        if (nombreConocido(nombre, ctx.nombresOrigen, ctx.palabrasOrigen)) continue;
        if (nombreConocido(nombre, ctx.nombresPrevio, ctx.palabrasPrevio)) {
          if (!marcada) agregar('antecedente', comoActual(`"${nombre}"`));
          continue;
        }
        agregar('nombre', `el ${campo} nombra a "${nombre}" y la fuente no`);
      }

      // 4. Días y meses. "El viernes" no puede aparecer si la fuente no lo
      // dice. Un día de la semana de una nota anterior nunca: "el viernes"
      // de hace dos semanas se lee como el que viene.
      for (const w of palabras(oracion)) {
        if (!CALENDARIO.has(w) || ctx.palabrasOrigen.has(w)) continue;
        if (ctx.palabrasPrevio.has(w)) {
          if (!marcada || DIAS.has(w)) agregar('antecedente', comoActual(`"${w}"`));
          continue;
        }
        agregar('fecha', `el ${campo} menciona "${w}" y la fuente no`);
      }
    }

    // 5. Citas textuales. Una comilla tiene que estar en el original. Se mira
    // el texto entero: una cita puede tener un punto adentro.
    for (const cita of citasDe(t)) {
      const c = sinTildes(cita).trim();
      if (ctx.origenNorm.includes(c)) continue;
      if (ctx.previoNorm && ctx.previoNorm.includes(c)) {
        const antes = sinTildes(t.slice(0, t.indexOf(cita))).slice(-200);
        if (!(admite && MARCA_ANTERIOR.test(antes))) agregar('antecedente', comoActual(`la cita "${cita.slice(0, 40)}"`));
        continue;
      }
      agregar('cita', `el ${campo} pone entre comillas algo que la fuente no dice: "${cita.slice(0, 40)}"`);
    }
  }

  // 6. Una acusación dicha como hecho.
  const n = sinTildes(t);
  if (DELITOS.test(n) && !ATRIBUCION.test(n)) {
    agregar('acusacion', `el ${campo} afirma un delito sin atribuirlo a nadie: "${t.slice(0, 50)}"`);
  }

  // 7. "más" mal escrito no es un detalle de estilo: "mas" sin tilde es
  // "pero" (un medio de noticias no usa esa conjunción), y a veces el
  // modelo se come directamente la "á" y deja "ms" solo. Pasó el 23/09:
  // "con ms de ciento sesenta atletas" en vez de "con más de...".
  if (/\b(mas|ms)\b/.test(t)) {
    agregar('tilde', `el ${campo} dice "${t.match(/\b(mas|ms)\b/)[0]}" en vez de "más": "${t.slice(0, 60)}"`);
  }

  // 8. "En vivo", "minuto a minuto", "en directo": Radar Balcarce no hace
  // coberturas en vivo, aunque el medio de origen sí (25/09: "Dólar hoy y
  // dólar blue en vivo" salió con ese titular). Sólo en lo que se ve primero.
  if (A_LA_VISTA.has(campo)) {
    const s = sinTildes(t);
    const vivo = s.match(EN_VIVO);
    if (vivo && !EN_VIVO_PERMITIDO.test(s)) {
      agregar('forma', `el ${campo} dice "${vivo[0]}" y el sitio no hace coberturas en vivo`);
    }
  }

  // 9. Relleno sin dato (28/09): frases que no aportan nada, encontradas en
  // una auditoría de notas reales contra su fuente.
  const relleno = n.match(RELLENO);
  if (relleno) {
    agregar('relleno', `el ${campo} tiene una frase de relleno sin dato: "${relleno[0]}"`);
  }
  // "Como se había informado" sin que llegara ningún antecedente: no hay qué
  // se "había informado", así que es relleno también (28/09).
  if (!ctx.previoNorm && /\bcomo se habia informado\b/.test(n)) {
    agregar('relleno', `el ${campo} dice "como se había informado" sin que llegara ningún antecedente`);
  }

  // 10. Localía inventada (28/09): decir que algo es de Balcarce o afecta a
  // los balcarcenses cuando la fuente no lo dice.
  if (LOCALIA_SIN_RESPALDO.test(n) && !/\bbalcarce\b/.test(ctx.origenNorm)) {
    agregar('localia', `el ${campo} dice "${n.match(LOCALIA_SIN_RESPALDO)[0]}" y la fuente no dice Balcarce`);
  }

  // 11. Frases de gancho en lo que se ve primero (28/09): "lo que tenés que
  // saber", "enterate"… El título dice qué pasó; no promete contarlo.
  if (A_LA_VISTA.has(campo)) {
    const gancho = n.match(GANCHO);
    if (gancho) agregar('gancho', `el ${campo} tiene una frase de gancho: "${gancho[0]}"`);
  }

  // 12. La forma del título (28/09): lo que salió mal publicado, repetido.
  if (campo === 'titulo') {
    for (const detalle of problemasDeFormaDelTitulo(t)) agregar('titulo', detalle);
  }

  return problemas;
}

// ------------------------------------------------------- la forma del título
//
// Del repaso editorial del 28/09 (Hernán: "que los títulos estén bien"). Son
// reglas de forma, que no dependen de la fuente: valen para lo nuevo y para lo
// ya publicado. Lo que se puede arreglar sin inventar (una etiqueta conocida
// adelante, una coma al final) lo arregla arreglarEscritura() antes de llegar
// acá; lo que queda, se rechaza y la IA lo vuelve a escribir.

// "Lo que tenés que saber" y parecidos: prometen en vez de decir.
const GANCHO = /\b(lo que (tenes|hay|necesitas|tenes que) (que )?(saber|conocer)|todo lo que (tenes|hay) que saber|te contamos|enterate|mira (como|lo que|el video)|no te lo pierdas|imperdible|la pregunta que todos)\b/;
// Adjetivos de gancho: en el título, nunca.
const ADJETIVOS_DE_GANCHO = /\b(impresionante|impresionantes|tremendo|tremenda|tremendos|increible|increibles|insolito|insolita|furor|shock)\b/;
// Un título que arranca con un sustantivo de clima y un lugar o un "por",
// sin decir qué pasó: "Cruce en Balcarce por…", "Preocupación por la suba…".
// Sin "de" después ("Fiesta de la Papa reúne…" es un nombre y un verbo) y sin
// "fiesta" (hay fiestas que se llaman así).
const ARRANQUE_SIN_HECHO = /^(preocupacion|tension|alarma|conmocion|polemica|revuelo|cruce|cruces|indignacion|malestar|incertidumbre|expectativa|expectativas|alegria|emocion|dolor|tristeza|furor|escandalo|repudio|bronca|temor|miedo|sorpresa|misterio|drama|caos|euforia|zozobra|inquietud)\s+(en|por|entre|tras|ante)\b/;
const EN_BALCARCE_POR = /^\S+\s+en\s+balcarce\s+(por|tras|ante|entre)\b/;

/** Los problemas de forma de un título, como frases para el registro y para
 *  la corrección que se le manda a la IA. */
export function problemasDeFormaDelTitulo(titulo) {
  const t = String(titulo ?? '').trim();
  const n = sinTildes(t);
  const salida = [];
  if (!t) return salida;
  if (/[¡!¿?]/.test(t)) salida.push(`el título tiene signos de admiración o de pregunta: "${t.slice(0, 60)}"`);
  const etiqueta = etiquetaAdelante(t);
  if (etiqueta) salida.push(`el título empieza con una etiqueta y dos puntos ("${etiqueta.etiqueta}:"): tiene que empezar por el hecho`);
  if (terminaColgado(t)) salida.push(`el título termina cortado (en coma, signo o conector): "…${t.slice(-30)}"`);
  if (ARRANQUE_SIN_HECHO.test(n) || EN_BALCARCE_POR.test(n)) {
    salida.push(`el título empieza con una etiqueta y un lugar, sin decir qué pasó: "${t.slice(0, 40)}…"`);
  }
  const adjetivo = n.match(ADJETIVOS_DE_GANCHO);
  if (adjetivo) salida.push(`el título usa un adjetivo de gancho: "${adjetivo[0]}"`);
  return salida;
}

// ------------------------------------------------------- el título en pasado
//
// El título va en presente (CRITERIO-EDITORIAL.md, sección 4): "El Concejo
// aprueba", no "El Concejo aprobó". El 28/09 salían "repasó", "ganó"… Sin un
// analizador de verbos, se mira la forma: una palabra terminada en "-ó"
// (aprobó, ganó, recibió), en "-aron", "-ieron", "-jeron" o "-yeron"
// (aprobaron, detuvieron, dijeron, cayeron), o un pretérito irregular
// (fue, hizo, dijo, tuvo, hubo…). Para no tomar por principal el verbo de una
// subordinada ("Detienen al hombre que robó una moto"), no cuenta si alguna
// de las tres palabras de antes es "que", "quien", "donde", "cuando"… Lo que
// está entre comillas tampoco cuenta: es una cita.

const PRETERITOS_IRREGULARES = new Set([
  'fue', 'fueron', 'hizo', 'dijo', 'tuvo', 'hubo', 'dio', 'dieron', 'estuvo', 'vino', 'trajo',
  'puso', 'pudo', 'quiso', 'supo', 'condujo', 'produjo', 'redujo', 'anduvo', 'murio', 'fui',
]);
// Palabras terminadas en "-ó" o "-aron" que no son verbos.
const NO_SON_VERBOS = new Set(['domino', 'capo', 'buro', 'rondo', 'lando', 'gigolo', 'yoyo', 'rococo', 'bongo', 'sharon', 'aaron', 'baron', 'varon', 'caron', 'charon']);
const SUBORDINANTES = new Set(['que', 'quien', 'quienes', 'donde', 'cuando', 'como', 'cual', 'cuales', 'cuyo', 'cuya', 'cuyos', 'cuyas', 'si', 'porque', 'aunque', 'mientras']);

/** El verbo en pretérito que manda en el título, o null. */
export function tituloEnPasado(titulo) {
  const sinCitas = String(titulo ?? '').replace(/["“«][^"”»]*["”»]/gu, ' ');
  const ws = sinCitas.split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter(Boolean);
  for (let i = 0; i < ws.length; i += 1) {
    const w = ws[i];
    const baja = w.toLowerCase();
    const llana = sinTildes(baja);
    if (NO_SON_VERBOS.has(llana)) continue;
    const pasado = (baja.length >= 4 && /ó$/u.test(baja))
      || (baja.length >= 6 && /(aron|ieron|jeron|yeron)$/.test(baja))
      || PRETERITOS_IRREGULARES.has(baja);
    if (!pasado) continue;
    // Una palabra con mayúscula en el medio del título es un nombre (Castelló).
    if (i > 0 && /^\p{Lu}/u.test(w)) continue;
    const antes = ws.slice(Math.max(0, i - 3), i).map((x) => sinTildes(x));
    if (antes.some((x) => SUBORDINANTES.has(x))) continue;
    return w;
  }
  return null;
}

// ----------------------------------------------------------------- las tildes
//
// 28/09: salieron notas enteras sin una tilde (Paris, inversion, energia,
// reunion, informacion). Un medio que escribe sin tildes se lee como un
// mensaje apurado. Se cuentan las palabras frecuentes escritas sin tilde que
// en castellano la llevan siempre: las de esta lista y las terminadas en
// "-cion" o "-sion" (en singular, siempre llevan tilde). Con pocas se les pone
// la tilde (arreglarEscritura); con ESTILO.palabrasSinTilde o más, el texto se
// da por escrito sin tildes y se rechaza: hay muchas más que no se pueden
// arreglar a ciegas ("esta" o "está", "publica" o "pública").

const CON_TILDE = {
  tambien: 'también', ademas: 'además', despues: 'después', segun: 'según', millon: 'millón',
  energia: 'energía', politica: 'política', politicas: 'políticas', politico: 'político',
  politicos: 'políticos', economia: 'economía', economico: 'económico', economica: 'económica',
  tecnologia: 'tecnología', ultimo: 'último', ultima: 'última', ultimos: 'últimos', ultimas: 'últimas',
  sabado: 'sábado', sabados: 'sábados', miercoles: 'miércoles', dia: 'día', dias: 'días',
  pais: 'país', autodromo: 'autódromo', publico: 'público', publicos: 'públicos',
  numero: 'número', numeros: 'números', camara: 'cámara', historico: 'histórico',
  historica: 'histórica', habia: 'había', habian: 'habían', podria: 'podría',
  todavia: 'todavía', asi: 'así', aqui: 'aquí', alli: 'allí', proximo: 'próximo',
  proxima: 'próxima', musica: 'música', jovenes: 'jóvenes', titulo: 'título',
  kilometros: 'kilómetros', rapido: 'rápido', rapida: 'rápida', razon: 'razón',
  campeon: 'campeón', camion: 'camión', avion: 'avión', corazon: 'corazón',
  practicamente: 'prácticamente', unico: 'único', unica: 'única', basicamente: 'básicamente',
  // No van: "seria" (una situación seria), "periodo" (vale sin tilde),
  // "publica", "practica", "esta", "el", "aun": son palabras correctas también.
};
// Se cuentan pero no se arreglan: pueden ser un nombre escrito así a propósito.
const SIN_TILDE_SIN_ARREGLO = new Set(['paris']);
// "-ción" y "-sión" siempre; "-ión" (reunión, región, opinión) también, pero
// sólo en minúscula: con mayúscula puede ser un nombre (Marion, Albion).
const TERMINA_EN_CION = /^[a-zñ]{2,}(cion|sion)$/;
const TERMINA_EN_ION = /^[a-zñ]{3,}ion$/;
const PALABRA = /(?<![\p{L}])(\p{L}+)(?![\p{L}])/gu;

const conLaMismaMayuscula = (original, nueva) => (/^\p{Lu}/u.test(original) ? nueva.charAt(0).toUpperCase() + nueva.slice(1) : nueva);

/** Cómo se escribe con tilde una palabra que la perdió, o null. */
function palabraConTilde(w) {
  const baja = w.toLowerCase();
  if (baja !== w && baja.charAt(0).toUpperCase() + baja.slice(1) !== w) return null; // SIGLAS o MeZcLa
  if (CON_TILDE[baja]) return conLaMismaMayuscula(w, CON_TILDE[baja]);
  if (TERMINA_EN_CION.test(baja)) return conLaMismaMayuscula(w, baja.replace(/ion$/, 'ión'));
  if (w === baja && TERMINA_EN_ION.test(baja)) return baja.replace(/ion$/, 'ión');
  return null;
}

/** Las palabras de un texto escritas sin la tilde que siempre llevan. */
export function palabrasSinTilde(texto) {
  const salida = [];
  for (const [, w] of String(texto ?? '').matchAll(PALABRA)) {
    if (palabraConTilde(w) || SIN_TILDE_SIN_ARREGLO.has(w.toLowerCase())) salida.push(w);
  }
  return salida;
}

// ------------------------------------------------------ los arreglos mecánicos

// Muletillas al comienzo de una oración: "Cabe destacar que el Concejo…" es
// "El Concejo…". Se sacan sin tocar el resto de la oración.
// El verbo es obligatorio: "Es importante que los vecinos se vacunen" dice algo.
const MULETILLA_DE_ARRANQUE = /(^|[.!?]\s+|\n\s*)(?:cabe|vale|vale la pena|es importante|resulta importante)\s+(?:destacar|señalar|senalar|mencionar|remarcar|aclarar|recordar|subrayar|resaltar)\s+que\s+(\p{L})/giu;

const DIAS_DE_LA_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const ESTE_DIA = /(?<![\p{L}])(este|Este|ESTE)\s+(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|fin de semana)(?![\p{L}])/gu;

/**
 * Lo que se puede corregir sin inventar nada, antes de verificar (28/09).
 * Nunca agrega un dato: saca lo que sobra o pone una tilde.
 *
 *   · el título: sin una etiqueta conocida adelante ("Rugby: …") y sin una
 *     coma o un conector colgando al final (web/lib/titulos.js);
 *   · "este sábado" pasa a ser "el sábado" cuando hoy no es sábado: la nota
 *     se lee días después y "este sábado" se entiende como el que viene
 *     (28/09: "participan este viernes", leído el lunes). "Este fin de
 *     semana", igual, salvo un sábado o un domingo. No se calcula la fecha:
 *     cuál es "este sábado" depende de cuándo lo escribió la fuente, y un
 *     número de día inventado sería peor;
 *   · "Cabe destacar que…" y parecidas al comienzo de una oración se sacan;
 *   · con menos de ESTILO.palabrasSinTilde palabras sin tilde, se les pone
 *     (con más, el texto se rechaza: verificar con `estilo`).
 *
 * @param {{ titulo?, copete?, cuerpo?, guion? }} nuevo
 * @param {{ hoy?: Date }} [o]
 * @returns {{ nuevo: object, arreglos: string[] }}
 */
export function arreglarEscritura(nuevo = {}, { hoy = new Date() } = {}) {
  const arreglos = [];
  const salida = { ...nuevo };
  const diaDeHoy = diaSemanaAR(hoy);

  if (typeof salida.titulo === 'string' && salida.titulo.trim()) {
    const t = sinCierreColgado(sinEtiqueta(salida.titulo.trim()));
    if (t !== salida.titulo.trim()) arreglos.push(`título: "${salida.titulo.trim()}" → "${t}"`);
    salida.titulo = t;
  }
  if (typeof salida.guion === 'string' && salida.guion.trim()) {
    salida.guion = sinEtiqueta(salida.guion.trim());
  }

  const campos = ['titulo', 'copete', 'cuerpo', 'guion'].filter((c) => typeof salida[c] === 'string' && salida[c]);
  const todo = campos.map((c) => salida[c]).join('\n');
  const arreglarTildes = palabrasSinTilde(todo).length < ESTILO.palabrasSinTilde;

  for (const campo of campos) {
    let t = salida[campo];
    t = t.replace(ESTE_DIA, (m, este, dia) => {
      const i = DIAS_DE_LA_SEMANA.indexOf(sinTildes(dia));
      const esHoy = dia === 'fin de semana' ? (diaDeHoy === 0 || diaDeHoy === 6) : i === diaDeHoy;
      if (esHoy) return m;
      arreglos.push(`${campo}: "${m}" → "${este === 'este' ? 'el' : 'El'} ${dia}"`);
      return `${este === 'este' ? 'el' : 'El'} ${dia}`;
    });
    if (campo === 'copete' || campo === 'cuerpo') {
      t = t.replace(MULETILLA_DE_ARRANQUE, (m, antes, letra) => {
        arreglos.push(`${campo}: se sacó "${m.trim().slice(0, -1).trim()}"`);
        return `${antes}${letra.toUpperCase()}`;
      });
    }
    if (arreglarTildes) {
      t = t.replace(PALABRA, (w) => {
        const bien = palabraConTilde(w);
        if (!bien) return w;
        arreglos.push(`${campo}: "${w}" → "${bien}"`);
        return bien;
      });
    }
    salida[campo] = t;
  }
  return { nuevo: salida, arreglos };
}

// Lo que se ve primero: el título, la bajada, el guion y el texto para redes.
const A_LA_VISTA = new Set(['titulo', 'copete', 'guion', 'textoRedes']);
const EN_VIVO = /\b(en vivo|en directo|minuto a minuto|live)\b/;
// Un show en vivo es un show con músicos en el escenario, no una cobertura.
const EN_VIVO_PERMITIDO = /\b(musica|show|shows|banda|bandas|espectaculo|espectaculos|recital|recitales|concierto|conciertos|toca|tocan|tocara|tocaran) en vivo\b/;

/**
 * Compara lo que escribió la IA contra lo que recibió.
 *
 * @param {{ titulo?: string, resumen?: string, antecedentes?: string }} fuente lo que se le dio
 * @param {{ titulo?: string, copete?: string, cuerpo?: string, guion?: string }} nuevo lo que devolvió
 */
export function verificar(fuente, nuevo, { soloForma = false, deBalcarce = null, estilo = false } = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });

  const ctx = contexto(fuente);
  const { origen, origenNorm } = ctx;

  // 0. Balcarce en el título de una nota que no es de Balcarce (27/09). La
  // instrucción decía "si el hecho es de Balcarce y el título no lo dice, va
  // 'en Balcarce' al final", y la IA lo aplicaba a lo que sólo nombraba a
  // Balcarce: "Comienza la Invasión de Pueblos en Necochea con presencia de
  // jóvenes de Balcarce". Si el título original ya lo decía, queda.
  if (deBalcarce === false && /\bbalcarce\b/.test(sinTildes(nuevo?.titulo ?? ''))
    && !/\bbalcarce\b/.test(sinTildes(fuente?.titulo ?? ''))) {
    agregar('lugar', 'el título pone Balcarce y la nota no es de Balcarce');
  }

  // Nada vacío: un título en blanco publicado es peor que uno mecánico.
  if (!nuevo?.titulo?.trim()) agregar('vacio', 'no devolvió título');
  if (!nuevo?.copete?.trim()) agregar('vacio', 'no devolvió copete');

  for (const campo of ['titulo', 'copete', 'cuerpo', 'guion']) {
    problemas.push(...problemasDelTexto(ctx, campo, nuevo?.[campo] ?? '', { soloForma }));
  }

  // 7. Una negación que la fuente no tiene, o una que desapareció.
  const NEGACION = /\b(no|nunca|jamas|tampoco|ni)\b/;
  const salida = sinTildes(`${nuevo?.titulo ?? ''} ${nuevo?.copete ?? ''}`);
  const tieneNegacionOrigen = NEGACION.test(origenNorm);
  if (NEGACION.test(salida) && !tieneNegacionOrigen) {
    agregar('negacion', 'agrega una negación que la fuente no tiene');
  }
  if (NEGACION.test(sinTildes(fuente.titulo ?? '')) && !NEGACION.test(salida)) {
    agregar('negacion', 'la fuente niega algo en el título y el texto nuevo no');
  }

  // 7b. El cuerpo tiene que DESARROLLAR el copete, no repetirlo. Si el primer
  // párrafo dice casi lo mismo que el copete, la nota se lee dos veces igual.
  if (repiteCopete(nuevo?.copete, nuevo?.cuerpo)) {
    agregar('repite', 'el cuerpo repite el copete en vez de desarrollarlo');
  }

  // 8. Copiar no es reescribir.
  const copiado = Math.max(
    tramoCopiado(origen, nuevo?.titulo ?? ''),
    tramoCopiado(origen, nuevo?.copete ?? ''),
    tramoCopiado(origen, nuevo?.cuerpo ?? ''),
  );
  if (copiado > LIMITES.copiaMaxima) {
    agregar('copia', `copia ${copiado} palabras seguidas del original`);
  }

  // 9. El estilo de lo que se escribe nuevo (28/09, del repaso editorial de lo
  // publicado). Lo pide la reescritura (reels/reescritura.mjs) y el panel; no
  // se aplica al revalidar lo ya publicado (`soloForma`): son heurísticas, y
  // una nota que ya está en la portada no se baja por una de ellas.
  if (estilo && !soloForma) problemas.push(...problemasDeEstilo(nuevo));

  return { ok: problemas.length === 0, problemas };
}

/**
 * Los problemas de estilo de lo que escribió la IA (28/09):
 *
 *   · el título en pasado ("El Concejo aprobó", "Ferroviarios ganó"): va en
 *     presente (tituloEnPasado);
 *   · el texto escrito sin tildes (palabrasSinTilde, ESTILO.palabrasSinTilde);
 *   · el cuerpo que no explica lo que promete el título: cada número del
 *     título tiene que estar también en el cuerpo, y no pueden faltarle dos
 *     nombres propios del título o más (un título nombraba a tres sancionados
 *     y el cuerpo explicaba uno). Sólo si hay cuerpo.
 */
export function problemasDeEstilo(nuevo = {}) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });
  const titulo = String(nuevo.titulo ?? '');
  const cuerpo = String(nuevo.cuerpo ?? '');

  const verbo = tituloEnPasado(titulo);
  if (verbo) agregar('pasado', `el título está en pasado ("${verbo}"): va en presente, como "aprueba" o "gana"`);

  const todo = ['titulo', 'copete', 'cuerpo', 'guion'].map((c) => nuevo[c] ?? '').join('\n');
  const sinTilde = palabrasSinTilde(todo);
  if (sinTilde.length >= ESTILO.palabrasSinTilde) {
    agregar('tildes', `el texto está escrito sin tildes (${[...new Set(sinTilde)].slice(0, 5).join(', ')}): va con las tildes y la eñe donde corresponden`);
  }

  if (cuerpo.trim()) {
    // Dos nombres o más que el cuerpo no nombra: con uno solo ("El Concejo
    // aprueba…" y un cuerpo que dice "los concejales") sería rechazar de más.
    const palabrasDelCuerpo = new Set(palabras(cuerpo));
    const nombresDelCuerpo = nombresDe(cuerpo);
    const faltan = [...nombresDe(titulo)]
      .filter((nombre) => !DE_CASA.has(nombre) && !CALENDARIO.has(nombre))
      .filter((nombre) => !nombreConocido(nombre, nombresDelCuerpo, palabrasDelCuerpo));
    if (faltan.length >= 2) {
      agregar('promesa', `el título nombra a ${faltan.map((f) => `"${f}"`).join(', ')} y el cuerpo no los explica`);
    }
    const numerosDelCuerpo = numerosDe(cuerpo);
    for (const v of numerosDe(titulo)) {
      if (!estaEnLaFuente(v, numerosDelCuerpo)) {
        agregar('promesa', `el título dice ${v.toLocaleString('es-AR')} y el cuerpo no lo explica`);
      }
    }
  }
  return problemas;
}

// ------------------------------------------------------- las partes nuevas

/** El nombre de un medio, como se lo escribiría en un texto: "Radio Gabal
 *  (FM 104.1)" es "Radio Gabal"; "Diario La Vanguardia", "La Vanguardia". */
function nucleoDelMedio(medio = '') {
  return String(medio).replace(/\(.*?\)/g, '').replace(/^\s*diario\s+/i, '').replace(/\s+/g, ' ').trim();
}

const sinMarcas = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** ¿El texto nombra alguno de estos medios? Con la mayúscula como está en el
 *  nombre: "Campeones" es un medio, "los campeones" no. */
function nombraMedio(texto, medios = []) {
  const t = sinMarcas(texto);
  return medios.map(nucleoDelMedio).filter((m) => m.length >= 3).find((m) => {
    const nombre = sinMarcas(m).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9])${nombre}([^A-Za-z0-9]|$)`).test(t);
  }) ?? null;
}

/**
 * Las partes nuevas de la nota (25/09), cada una por su lado: `claves`,
 * `seSabe`, `noConfirmado`, `aportes` (lo que aportó cada fuente) y
 * `textoRedes` se controlan igual que el cuerpo (números, nombres, días,
 * citas, acusaciones, tildes y copia). Si una falla, se descarta ESA parte y
 * la nota sigue: quien llama decide (reels/reescritura.mjs).
 *
 * Al texto para redes se le pide además lo que pide Facebook: sin nombrar al
 * medio de origen (`medios`, los que no son oficiales), sin hashtags adentro
 * (se agregan aparte) y sin enlaces.
 *
 * Las etiquetas van de a una: la que nombra a alguien o algo que no está en
 * lo recibido se saca, y quedan las demás (`validas`).
 */
export function verificarExtras(fuente, extras = {}, { soloForma = false, medios = [] } = {}) {
  const ctx = contexto(fuente);
  const resultado = {};

  const revisar = (campo, textos, limite) => {
    const problemas = [];
    for (const t of textos) {
      problemas.push(...problemasDelTexto(ctx, campo, t, { soloForma, limite }));
      const copiado = soloForma ? 0 : tramoCopiado(ctx.origen, t);
      if (copiado > LIMITES.copiaMaxima) problemas.push({ tipo: 'copia', detalle: `el ${campo} copia ${copiado} palabras seguidas del original` });
    }
    return { ok: problemas.length === 0, problemas };
  };

  if (extras.claves?.length) resultado.claves = revisar('claves', extras.claves, LIMITES.clave);
  if (extras.seSabe?.length) resultado.seSabe = revisar('seSabe', extras.seSabe, LIMITES.dato);
  if (extras.noConfirmado?.length) resultado.noConfirmado = revisar('noConfirmado', extras.noConfirmado, LIMITES.dato);
  if (extras.aportes?.length) resultado.aportes = revisar('aportes', extras.aportes.map((a) => a?.aporte ?? ''), LIMITES.aporte);

  if (extras.textoRedes) {
    const r = revisar('textoRedes', [extras.textoRedes], LIMITES.textoRedes);
    if (/#/.test(extras.textoRedes)) r.problemas.push({ tipo: 'forma', detalle: 'el textoRedes trae hashtags adentro' });
    if (/https?:\/\/|www\./i.test(extras.textoRedes)) r.problemas.push({ tipo: 'forma', detalle: 'el textoRedes trae un enlace' });
    const medio = nombraMedio(extras.textoRedes, medios);
    if (medio) r.problemas.push({ tipo: 'fuente', detalle: `el textoRedes nombra al medio de origen ("${medio}")` });
    r.ok = r.problemas.length === 0;
    resultado.textoRedes = r;
  }

  if (extras.etiquetas?.length) {
    const validas = [];
    const problemas = [];
    for (const e of extras.etiquetas) {
      const p = problemasDelTexto(ctx, 'etiquetas', e, { soloForma, limite: LIMITES.etiqueta });
      // Una etiqueta de una sola palabra con mayúscula ("Salinas") no pasa por
      // el control de nombres, que saltea la primera palabra de una oración.
      // Por eso, además: alguna de sus palabras tiene que estar en lo recibido.
      const suyas = palabras(e).filter((w) => w.length >= 4);
      const conocida = soloForma || !suyas.length || suyas.some((w) => DE_CASA.has(w)
        || nombreConocido(w, ctx.nombresOrigen, ctx.palabrasOrigen));
      if (!conocida) p.push({ tipo: 'nombre', detalle: `la etiqueta "${e}" no sale de lo recibido` });
      if (p.length) problemas.push(...p); else validas.push(e);
    }
    resultado.etiquetas = { ok: problemas.length === 0, problemas, validas };
  }
  return resultado;
}

/** Qué tanto se parecen dos textos, de 0 a 1 (palabras en común sobre el total). */
export function similitud(a = '', b = '') {
  const A = new Set(palabras(a).filter((w) => w.length > 3));
  const B = new Set(palabras(b).filter((w) => w.length > 3));
  if (!A.size || !B.size) return 0;
  let comunes = 0;
  for (const w of A) if (B.has(w)) comunes += 1;
  return comunes / Math.min(A.size, B.size);
}

/** ¿El cuerpo dice de nuevo la bajada? Si el primer párrafo se parece mucho,
 *  o arranca con las mismas palabras, la nota se lee dos veces igual. */
export function repiteCopete(copete, cuerpo) {
  if (!cuerpo || !copete) return false;
  const primero = String(cuerpo).split(/\n+/)[0];
  return similitud(copete, primero) >= 0.7 || sinTildes(cuerpo).startsWith(sinTildes(copete).slice(0, 60));
}

/**
 * Saca del cuerpo las ORACIONES con problemas, en vez de tirar el cuerpo
 * entero por un dato (25/09: 39 notas reescritas por la IA salieron sin
 * cuerpo porque una sola oración traía un número o un nombre que la fuente no
 * tenía).
 *
 * Cada oración pasa sola por los mismos controles que el cuerpo (números,
 * nombres, días, citas, acusaciones, tildes, antecedentes) y por el de copia;
 * la que falla se va. Si después el primer párrafo repite la bajada, se va
 * ese párrafo. No decide si lo que queda alcanza: quien llama lo vuelve a
 * verificar entero y cuenta las palabras (reels/reescritura.mjs).
 *
 * @param {{ titulo?: string, resumen?: string, antecedentes?: string }} fuente
 * @param {{ copete?: string, cuerpo?: string }} nuevo
 * @returns {{ cuerpo: string, sacadas: { oracion: string, problemas: object[] }[] }}
 */
export function depurarCuerpo(fuente, nuevo = {}) {
  const ctx = contexto(fuente);
  const sacadas = [];
  const parrafos = String(nuevo.cuerpo ?? '').split(/\n+/).map((p) => p.trim()).filter(Boolean)
    .map((p) => oraciones(p).filter((o) => {
      const problemas = problemasDelTexto(ctx, 'cuerpo', o);
      const copiado = tramoCopiado(ctx.origen, o);
      if (copiado > LIMITES.copiaMaxima) problemas.push({ tipo: 'copia', detalle: `copia ${copiado} palabras seguidas del original` });
      if (problemas.length) sacadas.push({ oracion: o, problemas });
      return !problemas.length;
    }).join(' '))
    .filter(Boolean);
  while (parrafos.length && repiteCopete(nuevo.copete, parrafos.join('\n\n'))) {
    sacadas.push({ oracion: parrafos.shift(), problemas: [{ tipo: 'repite', detalle: 'el párrafo repite el copete' }] });
  }
  return { cuerpo: parrafos.join('\n\n'), sacadas };
}

/** Un resumen de una línea, para el registro del panel. */
export function resumirProblemas(problemas = []) {
  const tipos = [...new Set(problemas.map((p) => p.tipo))];
  return `${problemas.length} ${problemas.length === 1 ? 'problema' : 'problemas'} (${tipos.join(', ')})`;
}
