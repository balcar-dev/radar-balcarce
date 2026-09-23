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
// título y el resumen de la fuente, nada más— y rechaza el texto si aparece
// algo que no estaba. No usa otra IA: son comparaciones mecánicas, que
// cuestan cero, no fallan por cuota y hacen siempre lo mismo.
//
// Es deliberadamente estricto. Un falso positivo cuesta poco: la nota sale
// igual, con el resumen del medio original, que es como salía antes de que
// existiera la reescritura. Un falso negativo es publicar una mentira.
//
// Sin dependencias: corre en GitHub Actions sin instalar nada.
//
//   verificar({ titulo, resumen }, { titulo, copete, guion })
//     → { ok: boolean, problemas: [{ tipo, detalle }] }

const sinTildes = (s = '') => String(s)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

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
  // medio; "14 millones" es catorce millones.
  for (const m of t.matchAll(/(\d[\d.,]*)(?:\s+(millones|millon|mil))?/g)) {
    let n = m[1].replace(/[.,]+$/, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '');
    else n = n.replace(',', '.');
    let v = Number(n);
    if (!Number.isFinite(v)) continue;
    if (m[2] === 'mil') v *= 1000;
    else if (m[2]) v *= 1_000_000;
    valores.push(v);
  }

  // En palabras.
  for (const w of palabras(t)) {
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

const CALENDARIO = new Set([
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
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
  titulo: 90,
  copete: 280,
  guion: 200,
  // Más de esto seguido, palabra por palabra, es copiar y no reescribir.
  copiaMaxima: 12,
};

/**
 * Compara lo que escribió la IA contra lo que recibió.
 *
 * @param {{ titulo?: string, resumen?: string }} fuente lo que se le dio
 * @param {{ titulo?: string, copete?: string, guion?: string }} nuevo lo que devolvió
 */
export function verificar(fuente, nuevo) {
  const problemas = [];
  const agregar = (tipo, detalle) => problemas.push({ tipo, detalle });

  const origen = `${fuente.titulo ?? ''}. ${fuente.resumen ?? ''}`;
  const origenNorm = sinTildes(origen);
  const palabrasOrigen = new Set(palabras(origen));
  const numerosOrigen = numerosDe(origen);
  const nombresOrigen = nombresDe(origen);

  // Nada vacío: un título en blanco publicado es peor que uno mecánico.
  if (!nuevo?.titulo?.trim()) agregar('vacio', 'no devolvió título');
  if (!nuevo?.copete?.trim()) agregar('vacio', 'no devolvió copete');

  for (const campo of ['titulo', 'copete', 'guion']) {
    const texto = nuevo?.[campo] ?? '';
    if (!texto) continue;

    // 1. Largo.
    if (texto.length > LIMITES[campo]) {
      agregar('largo', `el ${campo} tiene ${texto.length} caracteres, el máximo es ${LIMITES[campo]}`);
    }

    // 2. Números. Cualquier cifra o número en palabras que la fuente no traiga.
    for (const v of numerosDe(texto)) {
      if (!estaEnLaFuente(v, numerosOrigen)) {
        agregar('numero', `el ${campo} dice ${v.toLocaleString('es-AR')} y la fuente no lo dice`);
      }
    }

    // 3. Nombres propios y siglas que la fuente no nombra.
    for (const nombre of nombresDe(texto)) {
      if (DE_CASA.has(nombre) || CALENDARIO.has(nombre)) continue;
      if (nombresOrigen.has(nombre) || palabrasOrigen.has(nombre)) continue;
      // Un plural o un femenino del mismo nombre no es un nombre nuevo.
      const raiz = nombre.replace(/(es|s|a|o)$/, '');
      if (raiz.length >= 4 && [...palabrasOrigen].some((p) => p.startsWith(raiz))) continue;
      agregar('nombre', `el ${campo} nombra a "${nombre}" y la fuente no`);
    }

    // 4. Días y meses. "El viernes" no puede aparecer si la fuente no lo dice.
    for (const w of palabras(texto)) {
      if (CALENDARIO.has(w) && !palabrasOrigen.has(w)) {
        agregar('fecha', `el ${campo} menciona "${w}" y la fuente no`);
      }
    }

    // 5. Citas textuales. Una comilla tiene que estar en el original.
    for (const cita of citasDe(texto)) {
      if (!origenNorm.includes(sinTildes(cita).trim())) {
        agregar('cita', `el ${campo} pone entre comillas algo que la fuente no dice: "${cita.slice(0, 40)}"`);
      }
    }

    // 6. Una acusación dicha como hecho.
    const n = sinTildes(texto);
    if (DELITOS.test(n) && !ATRIBUCION.test(n)) {
      agregar('acusacion', `el ${campo} afirma un delito sin atribuirlo a nadie: "${texto.slice(0, 50)}"`);
    }

    // 7. "más" mal escrito no es un detalle de estilo: "mas" sin tilde es
    // "pero" (un medio de noticias no usa esa conjunción), y a veces el
    // modelo se come directamente la "á" y deja "ms" solo. Pasó el 23/09:
    // "con ms de ciento sesenta atletas" en vez de "con más de...".
    if (/\b(mas|ms)\b/.test(texto)) {
      agregar('tilde', `el ${campo} dice "${texto.match(/\b(mas|ms)\b/)[0]}" en vez de "más": "${texto.slice(0, 60)}"`);
    }
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

  // 8. Copiar no es reescribir.
  const copiado = Math.max(
    tramoCopiado(origen, nuevo?.titulo ?? ''),
    tramoCopiado(origen, nuevo?.copete ?? ''),
  );
  if (copiado > LIMITES.copiaMaxima) {
    agregar('copia', `copia ${copiado} palabras seguidas del original`);
  }

  return { ok: problemas.length === 0, problemas };
}

/** Un resumen de una línea, para el registro del panel. */
export function resumirProblemas(problemas = []) {
  const tipos = [...new Set(problemas.map((p) => p.tipo))];
  return `${problemas.length} ${problemas.length === 1 ? 'problema' : 'problemas'} (${tipos.join(', ')})`;
}
