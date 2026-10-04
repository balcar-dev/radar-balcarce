// La pestaña "Fotos" del panel del celular (2/10/2026, Hernán: "un lugar para ver las noticias sin fotos, con sugerencias de
// búsqueda, y dejar todas las notas con fotos"). Sin nada del DOM ni de la red: se prueba con Node (pruebas/fotos-panel.test.mjs).
//
// Las notas de la portada que no tienen foto, por qué no la tienen (lo que anotó el banco, web/data/banco-fotos.json), dónde
// buscarle una y el formulario para sumarla: la foto la baja y la achica la nube (web/scripts/foto-manual.mjs) y queda con su
// crédito en web/data/fotos-manuales.json.

/** Los motivos, de lo firme a lo que se puede arreglar. Mismo criterio que ingesta/auditar-fotos.mjs (una prueba los compara). */
export const MOTIVOS_DE_FOTO = {
  sinProbar: { firme: false, texto: 'Todavía no se probó: la próxima actualización le busca foto sola.' },
  menor: { firme: true, texto: 'La única foto que tenía mostraba menores reconocibles (regla firme: nunca se publican).' },
  marca: { firme: true, texto: 'La foto de su fuente tenía la marca de agua de otro medio (regla firme).' },
  logo: { firme: false, texto: 'La única imagen de su fuente era un logo.' },
  noIlustra: { firme: false, texto: 'La foto de su fuente no ilustra la nota (un flyer, un cartel o algo genérico).' },
  fuenteSinFoto: { firme: false, texto: 'Sus fuentes no traían ninguna foto.' },
  fallaReintentable: { firme: false, texto: 'Falló al buscarla (sin cupo de IA o no se pudo bajar) y se va a volver a probar sola.' },
  fallaAgotada: { firme: false, texto: 'Falló varias veces al buscarla: se probó el máximo.' },
  policiales: { firme: true, texto: 'Policiales sin fuente oficial: no lleva foto real (regla firme). Sólo con una foto de Bomberos o de la Policía.' },
  otra: { firme: false, texto: 'La IA la descartó (se ve en el detalle).' },
};

const FALLA = /^(Gemini falló|Groq también falló|sin clave para comparar|sin fotos para comparar)/;
const INTENTOS_MAXIMOS = 5;

/** Por qué una nota no tiene foto: la clave de MOTIVOS_DE_FOTO. `entrada` es lo que dice el banco de esa nota (puede no haber). */
export function motivoDeFoto(nota, entrada) {
  if (!entrada) return nota?.seccion === 'Policiales' ? 'policiales' : 'sinProbar';
  const razon = String(entrada.razon ?? entrada.error ?? '');
  if (entrada.origen === 'error' || entrada.error || FALLA.test(razon)) {
    if (/sin fotos para comparar/.test(razon)) return 'fuenteSinFoto';
    return (entrada.intentos ?? 1) >= INTENTOS_MAXIMOS ? 'fallaAgotada' : 'fallaReintentable';
  }
  const t = razon.toLowerCase();
  if (/menor|adolescen|niñ|alumn/.test(t)) return 'menor';
  if (/logo|logotipo/.test(t) && !/marca de agua/.test(t)) return 'logo';
  if (/marca de agua|marca del medio|marca institucional|watermark/.test(t) && !/sin marca|no tiene marca|no presenta marca|libre de marca/.test(t)) return 'marca';
  if (/flyer|cartel gen|no ilustra|ninguna de las fotos|no corresponde|ajena/.test(t)) return 'noIlustra';
  return 'otra';
}

/** Las notas de la lista que no tienen foto (ni en la nota ni en el banco), sin las propias del sitio, las más nuevas primero. */
export function notasSinFoto(notas = [], banco = {}) {
  return notas
    .filter((n) => n && !n.propia && !n.foto?.archivo && !banco[n.id]?.archivo)
    .sort((a, b) => (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0))
    .map((nota) => ({ nota, motivo: motivoDeFoto(nota, banco[nota.id]), entrada: banco[nota.id] ?? null }));
}

const SOBRAN = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'e', 'o', 'en', 'del', 'al', 'a', 'por', 'para', 'con', 'sin', 'su', 'sus', 'se', 'que', 'lo', 'es', 'son', 'ya', 'tras', 'ante', 'sobre', 'entre', 'hasta', 'desde', 'como', 'más', 'mas']);

/** Las palabras que sirven para buscar una foto: las del título, sin las de relleno (salvo "de/del/la" entre dos nombres propios: "Mar del Plata"), hasta `cuantas`. */
export function palabrasDeBusqueda(titulo = '', cuantas = 8) {
  const limpias = String(titulo).replace(/["“”«»'’:;,.¿?¡!()]/g, ' ').split(/\s+/).filter(Boolean);
  const mayuscula = (p) => /^[A-ZÁÉÍÓÚÑÜ]/.test(p ?? '');
  const buenas = limpias.filter((p, i) => p.length > 1 && (!SOBRAN.has(p.toLowerCase())
    || (['de', 'del', 'la', 'las', 'los', 'el'].includes(p.toLowerCase()) && i > 0 && mayuscula(limpias[i - 1]) && mayuscula(limpias[i + 1]))));
  const corte = buenas.slice(0, cuantas);
  while (corte.length && SOBRAN.has(corte[corte.length - 1].toLowerCase())) corte.pop();
  return corte;
}

/**
 * Dónde buscarle una foto a la nota. Sólo enlaces de búsqueda armados con el título (no hay IA ni red): Google Imágenes
 * filtrado por derechos de uso, Wikimedia Commons (fotos libres) y las páginas de sus propias fuentes.
 * Devuelve { consulta, enlaces: [{ texto, url }], fuentes: [{ medio, url }] }.
 */
export function busquedasDeFoto(nota) {
  const palabras = palabrasDeBusqueda(nota?.titulo);
  const conLugar = nota?.seccion === 'Balcarce' && !palabras.some((p) => /balcarce/i.test(p)) ? [...palabras, 'Balcarce'] : palabras;
  const consulta = conLugar.join(' ');
  const q = encodeURIComponent(consulta);
  const enlaces = [
    { texto: 'Google Imágenes (con permiso de uso)', url: `https://www.google.com/search?tbm=isch&tbs=sur:fmc&q=${q}` },
    { texto: 'Wikimedia Commons (fotos libres)', url: `https://commons.wikimedia.org/w/index.php?search=${q}&title=Special:MediaSearch&type=image` },
    { texto: 'Google Imágenes (todo)', url: `https://www.google.com/search?tbm=isch&q=${q}` },
  ];
  const vistas = new Set();
  const fuentes = [];
  for (const f of [...(nota?.fuentesConsultadas ?? []), ...(nota?.enlace ? [{ medio: 'La fuente', enlace: nota.enlace }] : [])]) {
    if (!/^https?:\/\//.test(f?.enlace ?? '') || vistas.has(f.enlace)) continue;
    vistas.add(f.enlace);
    fuentes.push({ medio: f.medio ?? 'Una fuente', url: f.enlace });
  }
  return { consulta, enlaces, fuentes };
}

/** ¿Es una dirección que la nube puede bajar? https o http (muchos medios chicos siguen en http), con un nombre de sitio, y no una dirección de adentro. */
export function urlDeFotoValida(url) {
  let u;
  try { u = new URL(String(url ?? '').trim()); } catch { return false; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return false;
  return true;
}

export const CREDITO_MAXIMO = 80;

/** El crédito como va en el epígrafe: "Foto: Municipalidad de Balcarce". */
export function creditoDeFoto(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim().replace(/^foto:\s*/i, '').slice(0, CREDITO_MAXIMO).trim();
  return t ? `Foto: ${t}` : '';
}

/** El resumen y las tarjetas de la pestaña. `esc` y `chip` vienen de la app. */
export function htmlDeFotos({ items, total, conFoto, cargando = false, marcas = {} }, { esc, chip, haceCuanto }) {
  const porcentaje = total ? Math.round((conFoto / total) * 100) : 100;
  const arreglables = items.filter((x) => !MOTIVOS_DE_FOTO[x.motivo].firme).length;
  const cabeza = `<h1>Fotos</h1>
    <p class="estado"><strong>${conFoto}</strong> de <strong>${total}</strong> notas de la portada tienen foto (${porcentaje} %).${items.length ? ` Faltan <strong>${items.length}</strong>${arreglables < items.length ? `; ${items.length - arreglables} por una regla firme` : ''}.` : ''}</p>`;
  if (cargando) return `${cabeza}<div class="girando"></div>`;
  if (!items.length) return `${cabeza}<p class="vacio">Todas las notas de la portada tienen foto. 🎉</p>`;
  return cabeza + items.map(({ nota, motivo }) => {
    const m = MOTIVOS_DE_FOTO[motivo];
    return `<button type="button" class="tarjeta" data-abrir="foto" data-id="${esc(nota.id)}">
      <div>${chip(nota.seccion)}<span class="meta">${esc(haceCuanto(nota.fecha))}</span></div>
      <div class="titulo">${esc(nota.titulo)}</div>
      <span class="motivo${m.firme ? ' firme' : ''}">${esc(m.firme ? 'Regla firme' : 'Se puede arreglar')}</span>
      <span class="meta">${esc(m.texto)}</span>${marcas[nota.id] ?? ''}</button>`;
  }).join('');
}

/** La pantalla de una nota sin foto: por qué, dónde buscar y el formulario para sumar una. */
export function htmlDeUnaNotaSinFoto({ nota, motivo, entrada }, { esc, chip, haceCuanto }) {
  const m = MOTIVOS_DE_FOTO[motivo];
  const b = busquedasDeFoto(nota);
  const detalle = entrada?.razon && motivo !== 'sinProbar' ? `<p class="meta">Lo que dijo la IA: ${esc(String(entrada.razon).slice(0, 300))}</p>` : '';
  return `<button type="button" class="boton" data-accion="volver-fotos">← Las notas sin foto</button>
    <p>${chip(nota.seccion)}<span class="meta">${esc(haceCuanto(nota.fecha))}</span></p>
    <h1>${esc(nota.titulo)}</h1>
    <div class="caja aviso-motivo"><strong>Por qué no tiene foto:</strong> ${esc(m.texto)}${detalle}</div>
    <h2>Dónde buscar una</h2>
    <p class="meta">Se busca: “${esc(b.consulta)}”</p>
    <div class="botones">${b.enlaces.map((e) => `<a class="boton enlace-boton" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.texto)} ↗</a>`).join('')}</div>
    <h2>Usar la foto de una fuente</h2>
    <p class="ayuda">Cada fuente de la nota tiene su foto principal: tocá “Usar la foto de…” y la nube la baja, la achica y la guarda con el crédito del medio. Antes tildá la confirmación de abajo.</p>
    ${b.fuentes.length ? `<div class="botones">${b.fuentes.map((f) => `<a class="boton enlace-boton" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Ver la nota de ${esc(f.medio)} ↗</a><button type="button" class="boton principal" data-accion="foto-de-fuente" data-id="${esc(nota.id)}" data-url="${esc(f.url)}" data-medio="${esc(f.medio)}">Usar la foto de ${esc(f.medio)}</button>`).join('')}</div>` : '<p class="meta">Esta nota no tiene fuentes con enlace.</p>'}
    <label class="check"><input type="checkbox" id="f-ok"> Confirmo que la foto no tiene marca de agua ni el nombre de otro medio pegado encima, y que no se reconoce a un menor ni a una víctima.</label>
    <h2>Subir una foto nuestra</h2>
    <p class="ayuda">Una foto sacada por nosotros (o que tenemos permiso de usar): se achica en el celular y queda <strong>sin fuente</strong> salvo que escribas un crédito. Vale la misma confirmación de arriba.</p>
    <input type="file" id="f-archivo" accept="image/*">
    <label for="f-credito-propio">Crédito (opcional; si lo dejás vacío no lleva)</label>
    <input type="text" id="f-credito-propio" maxlength="${CREDITO_MAXIMO}" placeholder="Foto: Hernán Gerace">
    <div class="botones"><button type="button" class="boton" data-accion="subir-foto" data-id="${esc(nota.id)}">Subir la foto</button></div>
    <h2>O pegar un enlace</h2>
    <p class="ayuda">Pegá el enlace de <strong>cualquier nota o foto</strong> (de la página o de la imagen misma): si es una página, la nube busca su foto principal. Sale en la web en la próxima actualización.</p>
    <form id="form-foto">
      <label for="f-url">Enlace de la nota o de la imagen</label>
      <input type="text" id="f-url" inputmode="url" autocomplete="off" placeholder="https://…/foto.jpg">
      <label for="f-credito">Crédito (quién sacó la foto o de dónde es)</label>
      <input type="text" id="f-credito" maxlength="${CREDITO_MAXIMO}" placeholder="Municipalidad de Balcarce">
      <div class="botones"><button type="submit" class="boton principal ancho">Sumar la foto</button></div>
    </form>`;
}
