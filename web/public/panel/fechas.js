// La pestaña "Fechas" del panel del celular (30/09): armar "Un día como hoy" y
// los feriados con una semana de anticipación. Sin nada del DOM: se prueba con
// Node (pruebas/panel-fechas.test.mjs). Las candidatas las arma
// ingesta/generar-efemerides.mjs; lo que se elige queda en
// web/data/efemerides-elegidas.json y sirve para afinar el puntaje.

export const ESTILOS = {
  balcarce: 'Balcarce', nacimiento: 'Nació', muerte: 'Murió', campo: 'Campo', ciencia: 'Ciencia', deporte: 'Deporte',
  cultura: 'Cultura', fundacion: 'Fundación', historia: 'Historia', 'dia-especial': 'Día especial', patria: 'Fecha patria', curioso: 'Dato curioso',
};

/** El color de cada estilo: el de su sección, o gris si es genérico (una sola paleta para todo). */
export const COLOR_DE_ESTILO = {
  balcarce: 'balcarce', campo: 'agro', ciencia: 'tecnologia', deporte: 'deportes', cultura: 'cultura', nacimiento: 'cultura',
  patria: 'feriado', fundacion: 'pais', historia: 'pais', muerte: 'pais', 'dia-especial': 'pais', curioso: 'pais',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const partes = (iso) => {
  const [a, m, d] = String(iso).split('-').map(Number);
  return { anio: a, mes: m, dia: d, semana: new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay() };
};

/** "Lun 5/10". */
export function etiquetaCorta(iso) {
  const p = partes(iso);
  return `${CORTOS[p.semana][0].toUpperCase()}${CORTOS[p.semana].slice(1)} ${p.dia}/${p.mes}`;
}

/** "Lunes 5 de octubre". */
export function etiquetaLarga(iso) {
  const p = partes(iso);
  return `${DIAS[p.semana][0].toUpperCase()}${DIAS[p.semana].slice(1)} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/** Los días de las candidatas, agrupados por semana (de lunes a domingo). */
export function semanas(dias = []) {
  const grupos = [];
  for (const iso of [...dias].sort()) {
    const p = partes(iso);
    const atras = (p.semana + 6) % 7; // días desde el lunes
    const lunes = new Date(Date.UTC(p.anio, p.mes - 1, p.dia - atras, 12)).toISOString().slice(0, 10);
    let g = grupos.find((x) => x.lunes === lunes);
    if (!g) { g = { lunes, dias: [] }; grupos.push(g); }
    g.dias.push(iso);
  }
  return grupos;
}

/**
 * El borrador de un día, a partir de lo que ya se guardó (o vacío). Los roles son
 * cuatro (Hernán, 30/09): una principal, "sí" (va), "opcional" (puede ir si hace falta)
 * y "no". Lo guardado antes con "extras" cuenta como "sí".
 */
export function borradorDe(eleccion) {
  return {
    principal: eleccion?.principal ?? null,
    si: [...(eleccion?.si ?? eleccion?.extras ?? [])],
    opcionales: [...(eleccion?.opcionales ?? [])],
    descartadas: [...(eleccion?.descartadas ?? [])],
  };
}

/** Los roles, en el orden en que se muestran. */
export const ROLES = [['principal', '★ Principal'], ['si', 'Sí'], ['opcional', 'Opcional'], ['no', 'No']];

/** Qué rol tiene una candidata en el borrador: 'principal', 'si', 'opcional', 'no' o null. */
export function rolDe(b, id) {
  if (b.principal === id) return 'principal';
  if (b.si.includes(id)) return 'si';
  if (b.opcionales.includes(id)) return 'opcional';
  if (b.descartadas.includes(id)) return 'no';
  return null;
}

/** Marca una candidata: cada una tiene un solo rol, hay una sola principal, y tocar de nuevo el mismo rol lo saca. */
export function marcarEn(b, id, rol) {
  const actual = rolDe(b, id);
  const nuevo = {
    principal: b.principal === id ? null : b.principal,
    si: b.si.filter((x) => x !== id),
    opcionales: b.opcionales.filter((x) => x !== id),
    descartadas: b.descartadas.filter((x) => x !== id),
  };
  if (actual === rol) return nuevo;
  if (rol === 'principal') nuevo.principal = id;
  else if (rol === 'si') nuevo.si.push(id);
  else if (rol === 'opcional') nuevo.opcionales.push(id);
  else if (rol === 'no') nuevo.descartadas.push(id);
  return nuevo;
}

/**
 * Lo que se guarda de un día: qué se eligió, qué se descartó y, de cada
 * candidata marcada, cómo era (rol, estilo, puntaje, año, idiomas, origen) y en qué
 * lugar de la lista estaba. Así, aunque las candidatas se vuelvan a generar, se puede
 * mirar después qué patrón siguen las elecciones y afinar el puntaje.
 */
export function eleccionDeDia(b, candidatas = [], por, cuando = new Date().toISOString()) {
  const detalle = {};
  const lugar = {};
  candidatas.forEach((c, i) => {
    const rol = rolDe(b, c.id);
    if (!rol) return;
    lugar[c.id] = i + 1;
    if (rol !== 'no') {
      detalle[c.id] = { rol, estilo: c.estilo, puntaje: c.puntaje, anio: c.anio, origen: c.origen, marcas: c.marcas, ...(c.importancia !== undefined ? { importancia: c.importancia } : {}), titulo: c.titulo };
    }
  });
  return { principal: b.principal, si: b.si, opcionales: b.opcionales, descartadas: b.descartadas, detalle, lugar, por, cuando };
}

/** Cómo va un día, para la lista. */
export function estadoDelDia(eleccion) {
  if (!eleccion) return { texto: 'Sin armar', clase: 'espera' };
  if (!eleccion.principal) return { texto: 'Falta la principal', clase: 'espera' };
  const si = (eleccion.si ?? eleccion.extras ?? []).length;
  const opc = (eleccion.opcionales ?? []).length;
  const resto = [si ? si + ' sí' : '', opc ? opc + ' opcional' + (opc > 1 ? 'es' : '') : ''].filter(Boolean).join(', ');
  return { texto: '✓ Armado' + (resto ? ' (+' + resto + ')' : ''), clase: 'ok' };
}

/** "hace 87 años", "hace 1 año". */
export function haceTexto(hace) {
  if (!Number.isFinite(hace) || hace <= 0) return '';
  return hace === 1 ? 'hace 1 año' : `hace ${hace} años`;
}

const MARCAS = {
  violencia: 'violencia', 'política': 'política', menores: 'menores', 'puede estar vivo': 'puede estar vivo', 'religión': 'religión',
};
export const marcaLegible = (m) => MARCAS[m] ?? m;

/** Cuántos días de la lista ya tienen principal. */
export function diasArmados(dias = [], elegidas = {}) {
  return dias.filter((d) => elegidas.dias?.[d]?.principal).length;
}

/** El estado de un feriado en lo que se guardó: 'aprobada', 'cambiar' o null. */
export const estadoDeFeriado = (elegidas, fecha) => elegidas?.feriados?.[fecha]?.estado ?? null;
