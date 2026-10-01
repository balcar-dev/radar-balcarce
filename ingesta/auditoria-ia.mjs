// La auditoría con IA de lo que ya salió (1/10/2026, Hernán: "que lea cada tanto lo nuevo y audite que estén bien las
// secciones, los criterios, la ortografía").
//
// ETAPA 1: sólo AVISA. No corrige nada ni toca ninguna nota: cada tanto lee las notas nuevas de la portada y le pide a
// una IA (Groq, gpt-oss-20b: su propio cupo, aparte del 120b que es el respaldo de la lectura) que marque lo que esté
// mal. Los hallazgos viajan cifrados al panel del celular (el repositorio es público y un hallazgo puede decir "esta nota
// parece identificar a un menor") y los graves, además, por WhatsApp. En una semana se ve cuántos eran reales; recién ahí
// se decide si algo de lo mecánico (la ortografía) se corrige solo.
//
// Sin dependencias. Corre en el workflow "Auditoría IA" (redes/auditar-notas.mjs).

import crypto from 'node:crypto';

/** Groq: gpt-oss-20b. 1.000 pedidos por día y 8.000 tokens por minuto (sondeo del 1/10, docs/05-FOTOS.md). */
export const MODELO_AUDITORIA = 'openai/gpt-oss-20b';

export const SECCIONES_VALIDAS = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Economía', 'Agro',
  'Tecnología', 'Cultura y agenda', 'Argentina'];

/** Qué puede encontrar, de lo mecánico a lo delicado. */
export const TIPOS = {
  ortografia: 'ortografía o puntuación',
  'texto-roto': 'texto roto',
  seccion: 'sección equivocada',
  sensible: 'tema sensible (menor, víctima, dato personal)',
  afirmacion: 'afirmación sin sostén',
  titulo: 'título que no corresponde al texto',
};
export const GRAVEDADES = ['alta', 'media', 'baja'];

/** Los números de la auditoría. */
export const AUDITORIA = {
  /** Cuántas notas se leen por pedido (con 8.000 tokens por minuto, tres entran con holgura). */
  porPedido: 3,
  /** Cuántas notas se leen por corrida. */
  porCorrida: 12,
  /** Cuánto del cuerpo se manda (caracteres). */
  cuerpoMaximo: 1600,
  /** Segundos de espera entre un pedido y el siguiente, por el tope de tokens por minuto. */
  esperaEntrePedidos: 25,
  /** Hasta cuántas horas atrás se miran las notas. */
  horas: 12,
  /** Cuántos días se guardan los hallazgos. */
  dias: 3,
};

/** Una huella corta de lo que se leyó: si la nota cambia (la corrigió una persona), se vuelve a leer. */
export const huellaDeNota = (n) => crypto.createHash('sha256').update(`${n.titulo}\n${n.copete ?? ''}\n${n.cuerpo ?? ''}`).digest('base64url').slice(0, 12);

/**
 * Qué notas leer ahora: las de la portada de las últimas `horas`, automáticas (lo que escribió una persona no se toca),
 * con cuerpo y que todavía no se leyeron con esta versión. `revisadas`: { id: huella }. Las más nuevas primero.
 */
export function notasParaAuditar(notas = [], { revisadas = {}, ahora = Date.now(), horas = AUDITORIA.horas, tope = AUDITORIA.porCorrida } = {}) {
  return notas
    .filter((n) => n?.id && !n.propia && n.titulo && String(n.cuerpo ?? '').length >= 200
      && (!n.publicadaPor || n.publicadaPor === 'ia')
      && ahora - Date.parse(n.fecha ?? '') <= horas * 3600e3
      && revisadas[n.id] !== huellaDeNota(n))
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, tope);
}

const INSTRUCCION = `Sos el corrector de Radar Balcarce, un medio digital de Balcarce (Buenos Aires). Te paso notas ya publicadas. Marcá SÓLO lo que de verdad esté mal, con seguridad; si una nota está bien, no la nombres. Un corrector que marca todo se vuelve ruido: nada de preferencias de estilo ni sinónimos.

Tipos de hallazgo ("tipo"):
- "ortografia": una falta de ortografía, una tilde que falta o sobra, o una puntuación que cambia el sentido.
- "texto-roto": caracteres raros o escapes sin decodificar (como \\u00fa), una frase cortada, una palabra repetida, restos de formato.
- "seccion": la sección que figura no es la que corresponde. Las secciones son: ${SECCIONES_VALIDAS.join(', ')}. En "sugerencia" poné la correcta.
- "sensible": el texto identifica o puede identificar a un menor de edad o a una víctima de un delito sexual o de violencia de género (nombre, apodo, escuela, domicilio, parentesco), o publica un dato personal que no debería.
- "afirmacion": afirma como hecho una acusación, una cifra o una causa que el propio texto no sostiene ni atribuye a nadie.
- "titulo": el título dice algo que el texto no dice o exagera.

"gravedad": "alta" sólo para "sensible" y para acusaciones graves; "media" para sección, afirmación y título; "baja" para ortografía y texto roto.
"detalle": una frase corta que diga exactamente qué está mal y dónde (citá la palabra o la frase). "sugerencia": cómo quedaría bien, si es corto; si no, vacío.

Devolvé sólo un objeto JSON: {"notas":[{"id":"…","hallazgos":[{"tipo":"…","gravedad":"…","detalle":"…","sugerencia":"…"}]}]}. Si no hay nada que marcar en ninguna nota, {"notas":[]}.`;

/** El pedido para un lote de notas. */
export function pedidoDeAuditoria(lote = []) {
  const notas = lote.map((n) => ({
    id: n.id, seccion: n.seccion, titulo: n.titulo, bajada: n.copete ?? '', texto: String(n.cuerpo ?? '').slice(0, AUDITORIA.cuerpoMaximo),
  }));
  return `${INSTRUCCION}\n\nNotas:\n${JSON.stringify(notas, null, 1)}`;
}

/** Lee la respuesta y deja sólo lo válido: [{ id, tipo, gravedad, detalle, sugerencia }]. Lanza si no es JSON. */
export function leerHallazgos(texto, idsPedidos) {
  let obj;
  try { obj = JSON.parse(texto); } catch { throw new Error('la respuesta no es JSON'); }
  const lista = Array.isArray(obj) ? obj : Array.isArray(obj?.notas) ? obj.notas : (Object.values(obj ?? {}).find(Array.isArray) ?? []);
  const salida = [];
  for (const n of lista) {
    if (!idsPedidos.has(n?.id)) continue;
    for (const h of Array.isArray(n.hallazgos) ? n.hallazgos : []) {
      if (!(h?.tipo in TIPOS) || typeof h.detalle !== 'string' || !h.detalle.trim()) continue;
      salida.push({
        id: n.id,
        tipo: h.tipo,
        // Lo que dice "alta" sin ser delicado se baja: una sección o una tilde nunca son una alarma.
        gravedad: GRAVEDADES.includes(h.gravedad) ? ((h.gravedad === 'alta' && !['sensible', 'afirmacion'].includes(h.tipo)) ? 'media' : h.gravedad) : 'media',
        detalle: h.detalle.trim().slice(0, 300),
        sugerencia: typeof h.sugerencia === 'string' ? h.sugerencia.trim().slice(0, 200) : '',
      });
    }
  }
  // Una sección "equivocada" tiene que sugerir una sección que exista; si no, no se puede usar.
  return salida.filter((h) => h.tipo !== 'seccion' || SECCIONES_VALIDAS.includes(h.sugerencia));
}

/** Un pedido a Groq con un lote de notas. Lanza si falla (con `status`). */
export async function auditarLote(lote, { clave, fetchFn = fetch, modelo = MODELO_AUDITORIA } = {}) {
  const res = await fetchFn('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    // La clave va en el encabezado, nunca en la dirección (docs/10-REGLAS-Y-PRUEBAS.md, regla 16).
    headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
    body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: pedidoDeAuditoria(lote) }], response_format: { type: 'json_object' }, temperature: 0 }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const detalle = String(await (res.text?.() ?? '')).replace(/\s+/g, ' ').slice(0, 200);
    const e = new Error(`Groq HTTP ${res.status}${detalle ? `: ${detalle}` : ''}`);
    e.status = res.status;
    throw e;
  }
  const j = await res.json();
  return leerHallazgos(j.choices?.[0]?.message?.content ?? '', new Set(lote.map((n) => n.id)));
}

/**
 * Lee todas las notas de a lotes, con una espera entre un pedido y otro. Un lote que falla no frena a los demás y se
 * cuenta aparte (esas notas no se marcan como leídas: se vuelven a intentar en la próxima corrida).
 * Devuelve { hallazgos, leidas: [ids], fallas: [mensajes] }.
 */
export async function auditarNotas(notas, { clave, fetchFn = fetch, dormir = (s) => new Promise((r) => { setTimeout(r, s * 1000); }), porPedido = AUDITORIA.porPedido } = {}) {
  const hallazgos = [];
  const leidas = [];
  const fallas = [];
  for (let i = 0; i < notas.length; i += porPedido) {
    if (i > 0) await dormir(AUDITORIA.esperaEntrePedidos);
    const lote = notas.slice(i, i + porPedido);
    try {
      hallazgos.push(...await auditarLote(lote, { clave, fetchFn }));
      leidas.push(...lote.map((n) => n.id));
    } catch (e) {
      fallas.push(e.message);
      // Sin cupo: seguir pidiendo no sirve de nada.
      if (e.status === 429 || e.status === 401 || e.status === 403) break;
    }
  }
  return { hallazgos, leidas, fallas };
}

/**
 * Suma lo nuevo a lo guardado: { id de nota: { titulo, ruta, seccion, cuando, hallazgos } }. Una nota que se vuelve a
 * leer reemplaza lo que tenía (si ahora no tiene hallazgos, desaparece). Se van las de más de `dias` días y las que
 * ya no están en `vigentes` (si se pasa).
 */
export function guardarHallazgos(antes = {}, { hallazgos = [], leidas = [], notas = [], ahora = new Date(), dias = AUDITORIA.dias } = {}) {
  const porId = new Map(notas.map((n) => [n.id, n]));
  const salida = { ...antes };
  for (const id of leidas) delete salida[id];
  for (const h of hallazgos) {
    const n = porId.get(h.id);
    if (!n) continue;
    const e = salida[h.id] ?? { titulo: n.titulo, ruta: n.ruta ?? null, seccion: n.seccion, cuando: ahora.toISOString(), hallazgos: [] };
    e.hallazgos.push({ tipo: h.tipo, gravedad: h.gravedad, detalle: h.detalle, sugerencia: h.sugerencia });
    salida[h.id] = e;
  }
  const limite = ahora.getTime() - dias * 86400e3;
  return Object.fromEntries(Object.entries(salida).filter(([, e]) => Date.parse(e.cuando) >= limite));
}

/** El WhatsApp con lo grave (una línea por nota, corto). Vacío si no hay nada grave. */
export function resumenParaWhatsApp(hallazgos = [], notas = []) {
  const graves = hallazgos.filter((h) => h.gravedad === 'alta');
  if (!graves.length) return '';
  const porId = new Map(notas.map((n) => [n.id, n]));
  const lineas = [...new Set(graves.map((h) => h.id))].slice(0, 4).map((id) => {
    const h = graves.find((x) => x.id === id);
    return `• ${String(porId.get(id)?.titulo ?? id).slice(0, 70)}: ${TIPOS[h.tipo]}`;
  });
  return `Radar Balcarce · la revisión con IA marcó ${graves.length === 1 ? 'algo grave' : `${graves.length} cosas graves`} en notas ya publicadas:\n${lineas.join('\n')}\nMirá la pestaña Revisión del panel.`;
}
