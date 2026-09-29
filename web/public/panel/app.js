// El panel del celular de Radar Balcarce (29/09).
//
// Aprobar lo que espera a una persona, retirar, editar (también la sección) y
// pedirle a la IA que escriba o reescriba una nota, desde el celular y con la
// PC apagada. Sin servidor propio: habla con GitHub con la llave de quien lo usa
// (github.js). Lo que espera a una persona llega cifrado para este celular
// (cifrado.js). Cómo funciona todo, en docs/09-PANEL.md.

import {
  crearCliente, ARCHIVOS, SECCIONES, ErrorDeGitHub, marcaNueva, corridaConMarca,
  conDecision, sinDecision, conRedes, conCorreccion, conLlave, haceCuanto, palabras,
} from './github.js';
import { crearLlaves, abrir } from './cifrado.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dormir = (ms) => new Promise((r) => { setTimeout(r, ms); });
const COLOR = {
  Balcarce: 'balcarce', Política: 'politica', Policiales: 'policiales', Fútbol: 'futbol', Deportes: 'deportes', Automovilismo: 'automovilismo',
  Agro: 'agro', Economía: 'economia', 'Cultura y agenda': 'cultura', Tecnología: 'tecnologia', Argentina: 'pais',
};
const chip = (s) => (s ? `<span class="chip" style="background:var(--s-${COLOR[s] ?? 'pais'})">${esc(s)}</span>` : '');
const GUARDADO = 'radar-panel';
const DEMO = new URLSearchParams(location.search).has('demo');

// --------------------------------------------------------------- lo guardado

function leerAjustes() {
  try { return JSON.parse(localStorage.getItem(GUARDADO) ?? 'null'); } catch { return null; }
}
function guardarAjustes(a) {
  try { localStorage.setItem(GUARDADO, JSON.stringify(a)); } catch { /* sin almacenamiento */ }
}

// La llave privada del celular vive en IndexedDB: el navegador la guarda sin
// dejar que nadie la lea (ni este código).
function bd() {
  return new Promise((ok, mal) => {
    const r = indexedDB.open(GUARDADO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('llaves');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
async function llavesDelCelular() {
  try {
    const db = await bd();
    return await new Promise((ok) => {
      const q = db.transaction('llaves').objectStore('llaves').get('celular');
      q.onsuccess = () => ok(q.result ?? null);
      q.onerror = () => ok(null);
    });
  } catch { return null; }
}
async function guardarLlavesDelCelular(v) {
  const db = await bd();
  await new Promise((ok, mal) => {
    const t = db.transaction('llaves', 'readwrite');
    t.objectStore('llaves').put(v, 'celular');
    t.oncomplete = ok;
    t.onerror = () => mal(t.error);
  });
}

// ------------------------------------------------------------------ el estado

const E = {
  cliente: null, nombre: '', llaves: null, pestana: 'esperan', busqueda: '',
  portada: null, esperando: [], pendientes: null, publicos: [], decisiones: { notas: {}, redes: {} }, correcciones: { notas: {} },
  archivo: null, cargadoEn: 0,
};

function aviso(texto, { conActualizar = false, ms = 6000 } = {}) {
  const a = $('#aviso');
  a.innerHTML = `${esc(texto)}${conActualizar ? '<br><button type="button" data-accion="actualizar-web">Actualizar la web ahora</button>' : ''}`;
  a.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { a.hidden = true; }, conActualizar ? 12000 : ms);
}

function explicarError(e) {
  if (e instanceof ErrorDeGitHub) {
    if (e.estado === 401) return 'La llave no anda (venció o la borraron en GitHub). Cargá una nueva desde "Más".';
    if (e.estado === 403) return `GitHub no deja hacer esto con esta llave (${e.message}). Revisá los permisos: Contents y Actions, lectura y escritura.`;
    if (e.estado === 404) return 'GitHub no encontró el archivo o el workflow. Puede que la llave no tenga acceso al repositorio.';
    return `GitHub contestó ${e.estado}: ${e.message}`;
  }
  return navigator.onLine === false ? 'No hay conexión.' : `Algo falló: ${e?.message ?? e}`;
}

// ------------------------------------------------------------------ la llave

function vistaLlave(mensaje = '') {
  $('#pestanas').hidden = true;
  $('#recargar').hidden = true;
  const a = leerAjustes();
  app.innerHTML = `
    <h1>Entrar al panel</h1>
    <p>Desde acá se aprueban, se editan y se retiran notas, y se le pide a la IA que las escriba. Para entrar hace falta una <strong>llave de GitHub</strong>, que se crea una sola vez: sólo quien la tenga puede tocar algo.</p>
    ${mensaje ? `<p class="problemas">${esc(mensaje)}</p>` : ''}
    <details ${a ? '' : 'open'}>
      <summary>Cómo crear la llave (5 minutos, una sola vez)</summary>
      <ol class="pasos">
        <li>Entrá a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → crear llave</a> con la cuenta de Radar (balcardev@gmail.com).</li>
        <li><strong>Token name</strong>: "Panel del celular". <strong>Expiration</strong>: un año (anotá la fecha).</li>
        <li><strong>Repository access</strong>: "Only select repositories" → <strong>radar-balcarce</strong>.</li>
        <li><strong>Permissions</strong> → Repository permissions: <strong>Contents</strong> "Read and write" y <strong>Actions</strong> "Read and write". Nada más.</li>
        <li><strong>Generate token</strong>, copiala y pegala acá abajo. GitHub no la vuelve a mostrar: si se pierde, se crea otra.</li>
      </ol>
      <p class="ayuda">La llave queda guardada sólo en este celular. Nunca la mandes por chat ni por mail. Si perdés el celular, borrala en GitHub (Settings → Developer settings → Fine-grained tokens).</p>
    </details>
    <form id="form-llave">
      <label for="nombre">Tu nombre (va en cada decisión)</label>
      <input type="text" id="nombre" autocomplete="name" required maxlength="30" value="${esc(a?.nombre ?? '')}" placeholder="Hernán">
      <label for="token">La llave de GitHub</label>
      <input type="password" id="token" autocomplete="off" required placeholder="github_pat_…">
      <div class="botones"><button class="boton principal ancho" type="submit">Entrar</button></div>
    </form>`;
  $('#form-llave').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const nombre = $('#nombre').value.trim();
    const token = $('#token').value.trim();
    if (!nombre || !token) return;
    app.innerHTML = '<div class="girando"></div><p class="vacio">Probando la llave…</p>';
    try {
      const cliente = crearCliente({ token });
      if (!(await cliente.puedeEscribir())) { vistaLlave('Esa llave no puede escribir en el repositorio radar-balcarce: revisá los permisos (Contents: Read and write).'); return; }
      await registrarCelular(cliente, nombre);
      guardarAjustes({ token, nombre });
      await arrancar();
    } catch (e) {
      vistaLlave(explicarError(e));
    }
  });
}

/** La primera vez: el par de llaves de este celular, y la pública al repositorio. */
async function registrarCelular(cliente, nombre) {
  let llaves = await llavesDelCelular();
  if (!llaves) {
    llaves = await crearLlaves();
    await guardarLlavesDelCelular(llaves);
  }
  const { json } = await cliente.leer(ARCHIVOS.llaves);
  if (!(json.llaves ?? []).some((l) => l.publica === llaves.publica)) {
    await cliente.guardar(ARCHIVOS.llaves, (j) => conLlave(j, { nombre: `Celular de ${nombre}`, publica: llaves.publica, huella: llaves.huella }), `Panel del celular: se registra el celular de ${nombre}`);
  }
  return llaves;
}

// ------------------------------------------------------------------ los datos

async function cargar({ archivo = false } = {}) {
  const c = E.cliente;
  const [portada, esperando, sobre, decisiones, correcciones] = await Promise.all([
    c.leer(ARCHIVOS.portada), c.leer(ARCHIVOS.esperando), c.leer(ARCHIVOS.pendientes),
    c.leer(ARCHIVOS.decisiones), c.leer(ARCHIVOS.correcciones),
  ]);
  E.portada = portada.json;
  E.esperando = esperando.json.notas ?? [];
  E.decisiones = { notas: {}, redes: {}, ...decisiones.json };
  E.correcciones = { notas: {}, ...correcciones.json };
  E.publicos = E.portada.pendientes ?? [];
  const abierto = E.llaves ? await abrir(sobre.json, E.llaves) : null;
  E.pendientes = abierto?.pendientes ?? null;
  E.pendientesCuando = sobre.json.generado ?? null;
  if (archivo) E.archivo = (await c.leer(ARCHIVOS.archivo)).json.notas ?? [];
  E.cargadoEn = Date.now();
}

const decididaEnElCelular = (id) => E.decisiones.notas?.[id] ?? null;
const paraRedes = (id) => !!E.decisiones.redes?.[id];

// ------------------------------------------------------------------ las listas

function pestanas() {
  const nav = $('#pestanas');
  const esperan = (E.pendientes ?? E.publicos).filter((n) => !decididaEnElCelular(n.id)).length;
  const sinCuerpo = E.esperando.filter((n) => !E.correcciones.notas?.[n.id]?.cuerpo).length;
  const items = [
    ['esperan', 'Esperan', esperan], ['sin-cuerpo', 'Sin cuerpo', sinCuerpo],
    ['publicadas', 'Publicadas', E.portada?.notas?.length ?? 0], ['mas', 'Más', ''],
  ];
  nav.innerHTML = items.map(([id, t, n]) => `<button type="button" data-pestana="${id}" ${E.pestana === id ? 'aria-current="page"' : ''}><span class="numero">${n === '' ? '⋯' : n}</span>${t}</button>`).join('');
  nav.hidden = false;
}

function tarjeta(n, { tipo, extra = '' }) {
  const d = decididaEnElCelular(n.id);
  const hecho = d ? `<span class="marca">${{ publicada: '✓ aprobada', descartada: '✕ descartada', bloqueada: '✕ retirada' }[d.estado] ?? ''}</span>` : '';
  const redes = paraRedes(n.id) ? '<span class="marca">→ redes</span>' : '';
  return `<button type="button" class="tarjeta" data-abrir="${esc(tipo)}" data-id="${esc(n.id)}">
    <div>${chip(E.correcciones.notas?.[n.id]?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span>${hecho}${redes}</div>
    <div class="titulo">${esc(n.titulo ?? 'Nota sensible: abrila para ver de qué se trata')}</div>
    ${extra}</button>`;
}

function vistaLista() {
  pestanas();
  $('#recargar').hidden = false;
  const cuando = E.portada?.generado ? `La web se armó ${haceCuanto(E.portada.generado)}.` : '';
  if (E.pestana === 'esperan') {
    const lista = E.pendientes ?? E.publicos;
    const sinAbrir = !E.pendientes;
    app.innerHTML = `
      <h1>Esperan a una persona</h1>
      <p class="estado">${esc(cuando)} ${sinAbrir ? 'Todavía no llegaron cifradas para este celular: llegan en la próxima actualización de la web (cada media hora). Mientras tanto se ve la lista corta.' : ''}</p>
      ${lista.length ? lista.map((n) => tarjeta(n, { tipo: 'pendiente', extra: `<span class="motivo">${esc(n.motivo)}</span>` })).join('') : '<p class="vacio">No hay nada esperando. 🎉</p>'}`;
  } else if (E.pestana === 'sin-cuerpo') {
    app.innerHTML = `
      <h1>Esperan cuerpo</h1>
      <p class="estado">Notas que saldrían solas pero todavía no tienen un cuerpo que pase el verificador. Se puede pedir a la IA o escribirlo a mano.</p>
      ${E.esperando.length ? E.esperando.map((n) => tarjeta(n, { tipo: 'sin-cuerpo', extra: E.correcciones.notas?.[n.id]?.cuerpo ? '<span class="marca">✓ con cuerpo</span>' : '' })).join('') : '<p class="vacio">Todas tienen cuerpo.</p>'}`;
  } else if (E.pestana === 'publicadas') {
    const q = E.busqueda.toLowerCase();
    const todas = [...(E.portada?.notas ?? []), ...(E.archivo ?? []).filter((a) => !(E.portada?.notas ?? []).some((n) => n.id === a.id))];
    const lista = todas.filter((n) => !n.propia && (!q || `${n.titulo} ${n.seccion}`.toLowerCase().includes(q))).slice(0, 80);
    app.innerHTML = `
      <h1>Publicadas</h1>
      <input type="search" id="buscar" placeholder="Buscar por título o sección" value="${esc(E.busqueda)}" aria-label="Buscar">
      <p class="estado">${esc(cuando)} ${E.archivo ? `Con el archivo: ${todas.length} notas.` : `Las de las últimas 36 horas. <button type="button" class="boton" data-accion="archivo">Buscar también en el archivo</button>`}</p>
      ${lista.map((n) => tarjeta(n, { tipo: 'publicada', extra: E.correcciones.notas?.[n.id] ? '<span class="marca">✎ corregida</span>' : '' })).join('') || '<p class="vacio">Nada con eso.</p>'}`;
    $('#buscar').addEventListener('input', (ev) => { E.busqueda = ev.target.value; clearTimeout(vistaLista.t); vistaLista.t = setTimeout(() => { vistaLista(); const b = $('#buscar'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250); });
  } else {
    const a = leerAjustes();
    app.innerHTML = `
      <h1>Más</h1>
      <div class="botones">
        <button type="button" class="boton ancho" data-accion="actualizar-web">Actualizar la web ahora</button>
        <a class="boton ancho" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="https://radarbalcarce.com" target="_blank" rel="noopener">Abrir la web</a>
      </div>
      <p class="estado">Entraste como <strong>${esc(a?.nombre)}</strong>. Cada decisión queda en GitHub con tu nombre.</p>
      <details><summary>Instalar el panel como app</summary>
        <p>En Chrome del celular: menú ⋮ → <strong>Instalar app</strong> (o "Agregar a pantalla principal"). Queda con su ícono, se abre a pantalla completa y se actualiza sola.</p></details>
      <details><summary>Cómo funciona</summary>
        <p>Lo que decidís acá se guarda en GitHub y sale en la web en la próxima actualización (cada media hora), o enseguida si tocás "Actualizar la web ahora" (tarda unos 8 minutos).</p>
        <p>Lo que espera a una persona llega cifrado: sólo este celular lo puede leer. Lo que le pedís a la IA lo escribe GitHub en un minuto y vuelve cifrado.</p></details>
      <div class="botones"><button type="button" class="boton peligro ancho" data-accion="salir">Salir y borrar la llave de este celular</button></div>`;
  }
}

// ------------------------------------------------------------------ una nota

function buscar(tipo, id) {
  if (tipo === 'pendiente') return (E.pendientes ?? E.publicos).find((n) => n.id === id);
  if (tipo === 'sin-cuerpo') return E.esperando.find((n) => n.id === id);
  return (E.portada?.notas ?? []).find((n) => n.id === id) ?? (E.archivo ?? []).find((n) => n.id === id);
}

function fuentesDe(n) {
  const f = n.fuentes ?? n.fuentesConsultadas ?? [];
  if (!f.length) return '';
  return `<h2>Fuentes</h2><ul class="fuentes">${f.map((x) => `<li>${x.enlace ? `<a href="${esc(x.enlace)}" target="_blank" rel="noopener noreferrer">${esc(x.medio ?? x.enlace)}</a>` : esc(x.medio)}</li>`).join('')}</ul>`;
}

function vistaNota(tipo, id) {
  const n = buscar(tipo, id);
  if (!n) { aviso('Esa nota ya no está en la lista.'); vistaLista(); return; }
  $('#pestanas').hidden = true;
  const d = decididaEnElCelular(id);
  const correccion = E.correcciones.notas?.[id];
  let acciones = '';
  if (tipo === 'pendiente') {
    acciones = d
      ? `<p class="estado">Ya ${{ publicada: 'la aprobaste', descartada: 'la descartaste', bloqueada: 'la retiraste' }[d.estado]} (${esc(haceCuanto(d.cuando))}, ${esc(d.por)}).</p>
         <button type="button" class="boton" data-accion="deshacer" data-id="${esc(id)}">Deshacer</button>`
      : `<label for="pedido">Algo para pedirle a la IA (opcional)</label>
         <input type="text" id="pedido" maxlength="300" placeholder="Por ejemplo: que empiece por el horario">
         <p class="ayuda">Lo que escribas acá queda a la vista en GitHub: no pongas nombres.</p>
         <button type="button" class="boton principal" data-accion="escribir" data-tipo="pendiente" data-id="${esc(id)}">Escribir con IA</button>
         <button type="button" class="boton peligro" data-accion="descartar" data-id="${esc(id)}">Descartar</button>`;
  } else if (tipo === 'sin-cuerpo') {
    acciones = `<label for="pedido">Algo para pedirle a la IA (opcional)</label>
         <input type="text" id="pedido" maxlength="300" placeholder="Por ejemplo: que sea corta">
         <p class="ayuda">Queda a la vista en GitHub: no pongas nombres.</p>
         <button type="button" class="boton principal" data-accion="escribir" data-tipo="sin-cuerpo" data-id="${esc(id)}">Escribir con IA</button>
         <button type="button" class="boton" data-accion="a-mano" data-tipo="sin-cuerpo" data-id="${esc(id)}">Escribir a mano</button>`;
  } else {
    acciones = d?.estado === 'bloqueada'
      ? `<p class="estado">La retiraste ${esc(haceCuanto(d.cuando))}: sale de la web en la próxima actualización.</p><button type="button" class="boton" data-accion="deshacer" data-id="${esc(id)}">Deshacer</button>`
      : `<button type="button" class="boton principal" data-accion="a-mano" data-tipo="publicada" data-id="${esc(id)}">Editar</button>
         <button type="button" class="boton" data-accion="pedir-reescribir" data-id="${esc(id)}">Reescribir con IA</button>
         <button type="button" class="boton" data-accion="redes" data-id="${esc(id)}">${paraRedes(id) ? 'Sacar de las redes' : 'También a Facebook e Instagram'}</button>
         <button type="button" class="boton peligro" data-accion="retirar" data-id="${esc(id)}">Retirar de la web</button>`;
  }
  const texto = tipo === 'pendiente'
    ? `<div class="texto-nota"><p class="bajada">${esc(n.resumen ?? '')}</p><p class="estado">Es el resumen de la fuente, no un texto nuestro.</p></div>`
    : `<div class="texto-nota"><p class="bajada">${esc(correccion?.copete ?? n.copete ?? '')}</p><p class="cuerpo">${esc(correccion?.cuerpo ?? n.cuerpo ?? '(sin cuerpo)')}</p></div>`;
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver">← Volver</button>
    <p>${chip(correccion?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span></p>
    ${n.motivo ? `<span class="motivo">${esc(n.motivo)}</span>` : ''}
    <h1>${esc(correccion?.titulo ?? n.titulo ?? 'Nota sensible')}</h1>
    ${!n.titulo && tipo === 'pendiente' ? '<p class="problemas">El detalle de esta nota llega cifrado en la próxima actualización de la web.</p>' : texto}
    ${tipo === 'publicada' && n.slug ? `<p><a href="https://radarbalcarce.com/nota/${esc(n.slug)}" target="_blank" rel="noopener">Ver en la web ↗</a></p>` : ''}
    ${fuentesDe(n)}
    <div class="botones">${acciones}</div>`;
  window.scrollTo(0, 0);
}

// ------------------------------------------------------ el borrador de la IA

async function pedirALaIA(tipo, id, pedido) {
  $('#pestanas').hidden = true;
  const titulo = buscar(tipo, id)?.titulo ?? '';
  app.innerHTML = `<div class="girando"></div><p class="vacio">La IA está escribiendo <strong>${esc(titulo)}</strong>.<br>Tarda un minuto: GitHub baja las fuentes, escribe y verifica.</p>`;
  const marca = marcaNueva();
  const desde = Date.now();
  try {
    await E.cliente.disparar('panel.yml', { accion: 'escribir', id, pedido: pedido ?? '', marca });
    let corrida = null;
    for (let i = 0; i < 72; i += 1) {
      await dormir(5000);
      corrida = corridaConMarca(await E.cliente.corridas('panel.yml'), marca);
      if (corrida?.status === 'completed') break;
    }
    if (corrida?.status !== 'completed') throw new Error('GitHub tardó demasiado. Probá de nuevo en un rato.');
    if (corrida.conclusion !== 'success') throw new Error('La corrida de GitHub falló. Mirá "Panel del celular" en GitHub → Actions.');
    const { json } = await E.cliente.leer(ARCHIVOS.borradores);
    const sobre = json.borradores?.[id];
    const borrador = sobre && Date.parse(sobre.cuando) >= desde - 120000 ? await abrir(sobre, E.llaves) : null;
    if (!borrador) throw new Error('No pude abrir el borrador en este celular. Si recién lo registraste, probá de nuevo.');
    vistaBorrador(tipo, id, borrador);
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    vistaNota(tipo, id);
  }
}

/** Editar un texto (de la IA o el que ya tiene la nota) y decidir. */
function vistaBorrador(tipo, id, b = null) {
  const n = buscar(tipo, id) ?? {};
  const c = E.correcciones.notas?.[id] ?? {};
  const t = b?.texto ?? { titulo: c.titulo ?? n.titulo ?? '', copete: c.copete ?? n.copete ?? '', cuerpo: c.cuerpo ?? n.cuerpo ?? '' };
  const seccion = c.seccion ?? n.seccion ?? b?.seccion ?? '';
  const deIA = !!b?.texto;
  const boton = tipo === 'pendiente' ? 'Publicar' : tipo === 'sin-cuerpo' ? 'Publicar con este cuerpo' : 'Guardar';
  const problemas = [...(b?.problemas ?? []), ...(b?.aviso ? [`el semáforo marca: ${b.aviso}`] : [])];
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver-nota" data-tipo="${esc(tipo)}" data-id="${esc(id)}">← Volver</button>
    <h1>${deIA ? 'Lo que escribió la IA' : 'Editar la nota'}</h1>
    ${b && !b.ok && !b.texto ? `<p class="problemas">${esc(b.motivo ?? 'La IA no pudo escribirla.')}</p>` : ''}
    ${problemas.length ? `<div class="problemas"><strong>Revisá esto antes de publicar</strong> (el verificador lo marcó contra las fuentes):<ul>${problemas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}
    ${b?.sacadas ? `<p class="estado">El verificador sacó ${b.sacadas} oración(es) con datos que no estaban en las fuentes.</p>` : ''}
    <form id="form-texto">
      <label for="t-titulo">Título <span class="ayuda" id="c-titulo"></span></label>
      <input type="text" id="t-titulo" value="${esc(t.titulo)}" maxlength="120">
      <label for="t-copete">Bajada</label>
      <textarea id="t-copete">${esc(t.copete)}</textarea>
      <label for="t-cuerpo">Cuerpo <span class="ayuda" id="c-cuerpo"></span></label>
      <textarea id="t-cuerpo" class="cuerpo">${esc(t.cuerpo)}</textarea>
      <label for="t-seccion">Sección</label>
      <select id="t-seccion">${SECCIONES.map((s) => `<option ${s === seccion ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      ${tipo !== 'publicada' ? `<label class="check"><input type="checkbox" id="t-redes" ${paraRedes(id) ? 'checked' : ''}> También a Facebook e Instagram</label>
      <p class="ayuda">Si no la marcás, sale sólo en la web. Política y Policiales nunca van solas a las redes.</p>` : ''}
      <div class="botones">
        <button type="submit" class="boton principal">${boton}</button>
        ${deIA ? `<button type="button" class="boton" data-accion="otra-version" data-tipo="${esc(tipo)}" data-id="${esc(id)}">Pedir otra versión</button>` : ''}
      </div>
    </form>`;
  const contar = () => {
    $('#c-titulo').textContent = `${$('#t-titulo').value.length} caracteres (hasta 90)`;
    const p = palabras($('#t-cuerpo').value);
    $('#c-cuerpo').textContent = `${p} palabras${p < 70 ? ' (con menos de 70 no sale sola)' : ''}`;
  };
  $('#t-titulo').addEventListener('input', contar);
  $('#t-cuerpo').addEventListener('input', contar);
  contar();
  $('#form-texto').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const campos = {
      titulo: $('#t-titulo').value.trim(), copete: $('#t-copete').value.trim(), cuerpo: $('#t-cuerpo').value.trim(), seccion: $('#t-seccion').value,
    };
    const cambioDeIA = deIA && campos.titulo === (t.titulo ?? '').trim() && campos.cuerpo === (t.cuerpo ?? '').trim();
    guardarTexto(tipo, id, campos, {
      deIA: deIA && (cambioDeIA || palabras(campos.cuerpo) > 0), extras: b?.texto ?? {}, redes: $('#t-redes')?.checked ?? null, seccionAntes: seccion, cuerpoAntes: String(t.cuerpo ?? '').trim(),
    });
  });
  window.scrollTo(0, 0);
}

async function guardarTexto(tipo, id, campos, {
  deIA, extras, redes, seccionAntes, cuerpoAntes,
}) {
  if (!campos.titulo || !campos.copete) { aviso('Faltan el título o la bajada.'); return; }
  // Con menos de 70 palabras una nota automática no sale sola: se avisa si se
  // aprueba o se completa una, o si se tocó el cuerpo (no por cambiar la sección).
  const corto = palabras(campos.cuerpo) < 70 && (tipo !== 'publicada' || campos.cuerpo !== cuerpoAntes);
  if (corto && !confirm(`El cuerpo tiene ${palabras(campos.cuerpo)} palabras. ¿Guardar igual?`)) return;
  const por = E.nombre;
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    if (tipo === 'pendiente') {
      const { textoRedes, etiquetas, claves, seSabe, noConfirmado, fuentesConsultadas } = extras ?? {};
      await E.cliente.guardar(ARCHIVOS.decisiones, (j) => {
        let x = conDecision(j, id, {
          estado: 'publicada', titulo: campos.titulo, copete: campos.copete, cuerpo: campos.cuerpo, deIA: !!deIA, por,
          ...(deIA ? Object.fromEntries(Object.entries({ textoRedes, etiquetas, claves, seSabe, noConfirmado, fuentesConsultadas }).filter(([, v]) => v != null)) : {}),
        });
        if (redes !== null) x = conRedes(x, id, por, redes);
        return x;
      }, `Panel del celular: ${por} aprueba una nota`);
      if (campos.seccion !== seccionAntes) {
        await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, { seccion: campos.seccion }, { motivo: 'sección cambiada al aprobarla desde el celular', por }), `Panel del celular: ${por} cambia la sección`);
      }
    } else {
      const motivo = tipo === 'sin-cuerpo'
        ? (deIA ? 'cuerpo escrito con IA desde el celular y revisado' : 'cuerpo escrito a mano desde el celular')
        : (deIA ? 'reescrita con IA desde el celular y revisada' : 'editada desde el celular');
      const cambios = { ...campos };
      if (campos.seccion === seccionAntes) delete cambios.seccion;
      await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, cambios, { motivo, por, deIA }), `Panel del celular: ${por} ${tipo === 'sin-cuerpo' ? 'completa' : 'corrige'} una nota`);
      if (redes !== null && redes !== paraRedes(id)) await E.cliente.guardar(ARCHIVOS.decisiones, (j) => conRedes(j, id, por, redes), `Panel del celular: ${por} marca una nota para las redes`);
    }
    await cargar();
    E.pestana = tipo === 'publicada' ? 'publicadas' : E.pestana;
    vistaLista();
    aviso('Listo. Sale en la web en la próxima actualización (cada media hora).', { conActualizar: true });
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    vistaBorrador(tipo, id, { texto: campos, ok: true, problemas: [] });
  }
}

async function decidir(id, cambiar, mensaje, listo) {
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    await E.cliente.guardar(ARCHIVOS.decisiones, cambiar, mensaje);
    await cargar();
    vistaLista();
    aviso(listo, { conActualizar: true });
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    vistaLista();
  }
}

// --------------------------------------------------------------- los toques

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-pestana],[data-abrir],[data-accion]');
  if (!el) return;
  const { id, tipo } = el.dataset;
  if (el.dataset.pestana) { E.pestana = el.dataset.pestana; vistaLista(); window.scrollTo(0, 0); return; }
  if (el.dataset.abrir) { vistaNota(el.dataset.abrir, id); return; }
  const accion = el.dataset.accion;
  const por = E.nombre;
  if (accion === 'volver') vistaLista();
  else if (accion === 'volver-nota') vistaNota(tipo, id);
  else if (accion === 'escribir') pedirALaIA(tipo, id, $('#pedido')?.value.trim());
  else if (accion === 'pedir-reescribir') {
    const pedido = prompt('¿Algo para pedirle a la IA? (opcional; queda a la vista en GitHub, no pongas nombres)', '');
    if (pedido !== null) pedirALaIA('publicada', id, pedido.trim());
  } else if (accion === 'otra-version') {
    const pedido = prompt('¿Qué cambiar? (opcional; queda a la vista en GitHub)', '');
    if (pedido !== null) pedirALaIA(tipo, id, pedido.trim());
  } else if (accion === 'a-mano') vistaBorrador(tipo, id, null);
  else if (accion === 'descartar') {
    if (confirm('¿Descartar esta nota? No sale en la web.')) decidir(id, (j) => conDecision(j, id, { estado: 'descartada', por, motivo: 'descartada desde el celular' }), `Panel del celular: ${por} descarta una nota`, 'Descartada.');
  } else if (accion === 'retirar') {
    const motivo = prompt('¿Por qué se retira? (queda anotado en GitHub)', '');
    if (motivo && motivo.trim()) decidir(id, (j) => conDecision(j, id, { estado: 'bloqueada', por, motivo: motivo.trim() }), `Panel del celular: ${por} retira una nota`, 'Retirada: sale de la web en la próxima actualización. Si ya estaba en Facebook o Instagram, hay que borrarla a mano allá.');
  } else if (accion === 'deshacer') {
    decidir(id, (j) => sinDecision(j, id), `Panel del celular: ${por} deshace una decisión`, 'Deshecho.');
  } else if (accion === 'redes') {
    const si = !paraRedes(id);
    decidir(id, (j) => conRedes(j, id, por, si), `Panel del celular: ${por} ${si ? 'marca' : 'desmarca'} una nota para las redes`, si ? 'Marcada: sale en Facebook e Instagram en la próxima vuelta de las redes (de 8 a 22, con 90 minutos entre posteos).' : 'Ya no va a las redes.');
  } else if (accion === 'archivo') {
    el.disabled = true;
    try { await cargar({ archivo: true }); vistaLista(); } catch (e) { aviso(explicarError(e)); }
  } else if (accion === 'actualizar-web') {
    try { await E.cliente.disparar('actualizar.yml'); aviso('Pedido. En unos 8 minutos está en la web.'); } catch (e) { aviso(explicarError(e)); }
  } else if (accion === 'recargar-pagina') {
    location.reload();
  } else if (accion === 'salir') {
    if (!confirm('¿Borrar la llave y los datos de este celular? Para volver a entrar vas a necesitar una llave.')) return;
    localStorage.removeItem(GUARDADO);
    indexedDB.deleteDatabase(GUARDADO);
    E.cliente = null;
    vistaLlave();
  }
});

$('#recargar').addEventListener('click', async () => {
  app.innerHTML = '<div class="girando"></div>';
  try { await cargar({ archivo: !!E.archivo }); vistaLista(); } catch (e) { aviso(explicarError(e)); vistaLista(); }
});

// ------------------------------------------------------------------ arrancar

async function arrancar() {
  if (DEMO) {
    const { clienteDePrueba, llavesDePrueba } = await import('./prueba.js');
    $('#demo').hidden = false;
    E.cliente = clienteDePrueba();
    E.llaves = await llavesDePrueba();
    E.nombre = 'Prueba';
  } else {
    const a = leerAjustes();
    if (!a?.token) { vistaLlave(); return; }
    E.cliente = crearCliente({ token: a.token });
    E.nombre = a.nombre;
    E.llaves = await llavesDelCelular();
    if (!E.llaves) E.llaves = await registrarCelular(E.cliente, a.nombre);
  }
  app.innerHTML = '<div class="girando"></div><p class="vacio">Trayendo las notas…</p>';
  try {
    await cargar();
    vistaLista();
  } catch (e) {
    if (e instanceof ErrorDeGitHub && e.estado === 401) vistaLlave(explicarError(e));
    else { app.innerHTML = `<p class="problemas">${esc(explicarError(e))}</p><button class="boton" type="button" data-accion="recargar-pagina">Probar de nuevo</button>`; }
  }
}

if ('serviceWorker' in navigator && !DEMO) navigator.serviceWorker.register('/panel/sw.js', { scope: '/panel/' }).catch(() => {});
arrancar();
