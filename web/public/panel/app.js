// El panel del celular de Radar Balcarce (29/09).
//
// Aprobar lo que espera a una persona, retirar (y volver a publicar), editar
// (también la sección), pedirle a la IA que escriba o reescriba una nota,
// mandar una nota a las redes y ver lo que sale hoy en Facebook e Instagram,
// desde el celular y con la PC apagada. Sin servidor propio: habla con GitHub
// con la llave de quien lo usa (github.js). Lo que espera a una persona y las
// retiradas llegan cifradas para este celular (cifrado.js). Los textos que
// explican cada cosa están en textos.js. Cómo funciona todo: docs/09-PANEL.md.

import {
  crearCliente, ARCHIVOS, SECCIONES, ErrorDeGitHub, marcaNueva, corridaConMarca,
  conDecision, sinDecision, conRedes, conCorreccion, conLlave, sinRetirada, haceCuanto, palabras,
} from './github.js';
import { crearLlaves, abrir } from './cifrado.js';
import {
  explicarMotivo, motivoCorto, explicarFicha, estadoSinCuerpo, PESTANAS, PREGUNTAS, preguntaRedes, comoSalenLosPosteos,
  REGLAS_FACEBOOK, proximoPosteo, estadoDePieza, horaEnBalcarce, hoyEnBalcarce,
} from './textos.js';

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
const VOCES = { locutora: 'la locutora', locutor: 'el locutor' };
const enlaceDeNota = (n) => `https://radarbalcarce.com/nota/${n.slug ? `${n.slug}-${n.id}` : n.id}`;

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
  portada: null, esperando: [], intentosMaximos: 3, pendientes: null, descartadas: [], papelera: [], publicos: [],
  decisiones: { notas: {}, redes: {} }, correcciones: { notas: {} }, archivo: null, estadoCel: null, libro: {},
};

function aviso(texto, { conActualizar = false, ms = 7000 } = {}) {
  const a = $('#aviso');
  a.innerHTML = `${esc(texto)}${conActualizar ? '<br><button type="button" data-accion="actualizar-web">Actualizar la web ahora</button>' : ''}<button type="button" class="cerrar" data-accion="cerrar-aviso" aria-label="Cerrar">✕</button>`;
  a.hidden = false;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { a.hidden = true; }, conActualizar ? 14000 : ms);
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

/**
 * Una pregunta antes de algo que no se deshace fácil (Hernán, 29/09: "estaría
 * bueno que re pregunte antes de mandar"). Devuelve { ok, texto }: `texto` es lo
 * que escribió, si la pregunta pedía un motivo o un pedido para la IA.
 */
function preguntar({
  titulo, texto, si = 'Sí', no = 'Cancelar', conMotivo = null, conPedido = null,
}) {
  return new Promise((listo) => {
    const d = document.createElement('dialog');
    d.className = 'pregunta';
    d.setAttribute('aria-labelledby', 'pregunta-titulo');
    const campo = conMotivo || conPedido;
    // El foco: en el motivo si hace falta escribirlo; si el pedido es opcional,
    // en "Sí" (que no se abra el teclado); si no hay nada que escribir, en
    // "Cancelar" (que un toque de más no confirme).
    d.innerHTML = `<form method="dialog">
      <h2 id="pregunta-titulo">${esc(titulo)}</h2>
      ${texto ? `<p>${esc(texto)}</p>` : ''}
      ${campo ? `<label for="respuesta">${esc(campo)}</label><textarea id="respuesta" rows="3" maxlength="300" ${conMotivo ? 'autofocus' : ''}></textarea>
        ${conPedido ? '<p class="ayuda">Queda a la vista en GitHub: no pongas nombres.</p>' : ''}` : ''}
      <div class="botones"><button value="si" class="boton principal" ${conPedido && !conMotivo ? 'autofocus' : ''}>${esc(si)}</button><button value="no" class="boton" ${campo ? '' : 'autofocus'}>${esc(no)}</button></div>
    </form>`;
    document.body.append(d);
    // La respuesta se toma en el toque (el evento "close" del diálogo puede
    // llegar tarde si la página no se está dibujando).
    let listoYa = false;
    const terminar = (dijoQueSi) => {
      const valor = d.querySelector('#respuesta')?.value?.trim() ?? '';
      if (dijoQueSi && conMotivo && !valor) {
        if (!d.querySelector('.falta')) d.querySelector('#respuesta').insertAdjacentHTML('afterend', '<p class="problemas falta">Hace falta escribir el motivo.</p>');
        d.querySelector('#respuesta').focus();
        return;
      }
      if (listoYa) return;
      listoYa = true;
      if (d.open) d.close();
      d.remove();
      listo({ ok: dijoQueSi, texto: valor });
    };
    d.querySelector('form').addEventListener('submit', (ev) => { ev.preventDefault(); terminar(ev.submitter?.value === 'si'); });
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); terminar(false); });
    d.addEventListener('close', () => terminar(d.returnValue === 'si'));
    d.showModal();
  });
}

// ------------------------------------------------------------------ la llave

function vistaLlave(mensaje = '') {
  $('#pestanas').hidden = true;
  $('#recargar').hidden = true;
  const a = leerAjustes();
  app.innerHTML = `
    <h1>Entrar al panel</h1>
    <p>Desde acá se aprueban, se editan y se retiran notas, se le pide a la IA que las escriba y se ve lo que sale en las redes. Para entrar hace falta una <strong>llave de GitHub</strong>, que se crea una sola vez: sólo quien la tenga puede tocar algo.</p>
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

/** Lee un archivo que puede no existir todavía (lo crea la próxima actualización de la web). */
async function leerSiHay(cliente, ruta, porDefecto) {
  try { return (await cliente.leer(ruta)).json; } catch (e) {
    if (e instanceof ErrorDeGitHub && e.estado === 404) return porDefecto;
    throw e;
  }
}

/**
 * Abre lo que llega cifrado para este celular: un sobre por nota (versión 2,
 * con las retiradas) o un solo sobre para todo (la 1, la de antes).
 */
async function abrirPrivado(sobre) {
  if (!E.llaves || !sobre) return { pendientes: null, papelera: [] };
  if (sobre.version === 2) {
    const abrirTodas = async (mapa = {}, orden = Object.keys(mapa)) => (await Promise.all(orden.map((id) => abrir(mapa[id], E.llaves)))).filter(Boolean);
    const ids = Object.keys(sobre.notas ?? {});
    const pendientes = await abrirTodas(sobre.notas ?? {}, sobre.orden ?? ids);
    // Ningún sobre es para este celular: se registró después de la última actualización.
    if (ids.length && !pendientes.length) return { pendientes: null, papelera: [] };
    return { pendientes, papelera: await abrirTodas(sobre.retiradas ?? {}, sobre.ordenRetiradas ?? Object.keys(sobre.retiradas ?? {})) };
  }
  const viejo = await abrir(sobre, E.llaves);
  return { pendientes: viejo?.pendientes ?? null, papelera: [] };
}

async function cargar({ archivo = false } = {}) {
  const c = E.cliente;
  const [portada, esperando, privado, decisiones, correcciones, estadoCel, libro] = await Promise.all([
    c.leer(ARCHIVOS.portada), c.leer(ARCHIVOS.esperando), leerSiHay(c, ARCHIVOS.pendientes, null),
    c.leer(ARCHIVOS.decisiones), c.leer(ARCHIVOS.correcciones), leerSiHay(c, ARCHIVOS.estado, null), leerSiHay(c, ARCHIVOS.libro, {}),
  ]);
  E.portada = portada.json;
  E.esperando = esperando.json.notas ?? [];
  E.intentosMaximos = esperando.json.intentosMaximos ?? 3;
  E.decisiones = { notas: {}, redes: {}, ...decisiones.json };
  E.correcciones = { notas: {}, ...correcciones.json };
  E.estadoCel = estadoCel;
  E.libro = libro ?? {};
  E.publicos = E.portada.pendientes ?? [];
  const abierto = await abrirPrivado(privado);
  E.pendientes = abierto.pendientes ? abierto.pendientes.filter((n) => !n.decision) : null;
  E.descartadas = abierto.pendientes ? abierto.pendientes.filter((n) => n.decision) : [];
  E.papelera = abierto.papelera ?? [];
  if (archivo) E.archivo = (await c.leer(ARCHIVOS.archivo)).json.notas ?? [];
}

const decididaEnElCelular = (id) => E.decisiones.notas?.[id] ?? null;
/** Lo de "Esperan", en tres grupos: sin decidir, aprobadas (salen en la próxima actualización) y descartadas. */
function listasDeEsperan() {
  const todas = [...(E.pendientes ?? E.publicos), ...E.descartadas];
  const con = (estado) => todas.filter((n) => decididaEnElCelular(n.id)?.estado === estado);
  return { sinDecidir: todas.filter((n) => !decididaEnElCelular(n.id)), aprobadas: con('publicada'), descartadas: con('descartada') };
}
const marcadaParaRedes = (id) => !!E.decisiones.redes?.[id];
const enFacebook = (id) => E.libro?.facebook?.[id] ?? null;
const enInstagram = (id) => E.libro?.instagramFeed?.[id] ?? null;
const reglasFb = () => ({ ...REGLAS_FACEBOOK, ...(E.estadoCel?.redes?.facebook ?? {}) });
/** ¿Una persona la volvió a publicar después de retirarla? (se ve en la próxima actualización) */
const vueltaAPublicar = (n) => {
  const d = decididaEnElCelular(n.id);
  return d?.estado === 'publicada' && (Date.parse(d.cuando) || 0) > (Date.parse(n.retirada ?? '') || 0);
};

// ------------------------------------------------------------------ las listas

function pestanas() {
  const nav = $('#pestanas');
  const esperan = listasDeEsperan().sinDecidir.length;
  const sinCuerpo = E.esperando.filter((n) => !E.correcciones.notas?.[n.id]?.cuerpo).length;
  const items = [
    ['esperan', 'Esperan', esperan], ['sin-cuerpo', 'Sin cuerpo', sinCuerpo],
    ['publicadas', 'Publicadas', (E.portada?.notas ?? []).filter((n) => !n.propia).length], ['redes', 'Redes', '◷'], ['mas', 'Más', '⋯'],
  ];
  nav.innerHTML = items.map(([id, t, n]) => `<button type="button" data-pestana="${id}" ${E.pestana === id ? 'aria-current="page"' : ''}><span class="numero">${n}</span>${t}</button>`).join('');
  nav.hidden = false;
}

const queEs = (pestana) => `<details class="que-es"><summary>¿Qué es esto?</summary><p>${esc(PESTANAS[pestana])}</p></details>`;

function tarjeta(n, { tipo, extra = '' }) {
  const d = decididaEnElCelular(n.id);
  const marcas = [
    d && tipo !== 'retirada' ? `<span class="marca">${{ publicada: '✓ aprobada', descartada: '✕ descartada', bloqueada: '✕ retirada' }[d.estado] ?? ''}</span>` : '',
    enFacebook(n.id) ? '<span class="marca">✓ en Facebook</span>' : (marcadaParaRedes(n.id) ? '<span class="marca">→ en la cola de las redes</span>' : ''),
  ].join('');
  return `<button type="button" class="tarjeta" data-abrir="${esc(tipo)}" data-id="${esc(n.id)}">
    <div>${chip(E.correcciones.notas?.[n.id]?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span>${marcas}</div>
    <div class="titulo">${esc(E.correcciones.notas?.[n.id]?.titulo ?? (d?.estado === 'publicada' ? d.titulo : null) ?? n.titulo ?? 'Nota sensible: abrila para ver de qué se trata')}</div>
    ${extra}</button>`;
}

function vistaLista() {
  pestanas();
  $('#recargar').hidden = false;
  const cuando = E.portada?.generado ? `La web se armó ${haceCuanto(E.portada.generado)}.` : '';
  if (E.pestana === 'esperan') vistaEsperan(cuando);
  else if (E.pestana === 'sin-cuerpo') vistaSinCuerpo(cuando);
  else if (E.pestana === 'publicadas') vistaPublicadas(cuando);
  else if (E.pestana === 'redes') vistaRedes();
  else vistaMas();
}

function vistaEsperan(cuando) {
  const { sinDecidir, aprobadas, descartadas } = listasDeEsperan();
  const conMotivo = (n) => `<span class="motivo">${esc(motivoCorto(n.motivo))}</span>`;
  app.innerHTML = `
    <h1>Esperan a una persona</h1>
    ${queEs('esperan')}
    <p class="estado">${esc(cuando)} ${E.pendientes ? '' : 'El detalle de cada nota todavía no llegó cifrado para este celular: llega en la próxima actualización de la web (cada media hora). Mientras tanto se ve la lista corta.'}</p>
    ${sinDecidir.length ? sinDecidir.map((n) => tarjeta(n, { tipo: 'pendiente', extra: conMotivo(n) })).join('') : '<p class="vacio">No hay nada esperando.</p>'}
    ${aprobadas.length ? `<h2>Aprobadas (salen en la próxima actualización)</h2>${aprobadas.map((n) => tarjeta(n, { tipo: 'pendiente' })).join('')}` : ''}
    ${descartadas.length ? `<h2>Descartadas (se pueden volver a traer)</h2>${descartadas.map((n) => tarjeta(n, { tipo: 'pendiente' })).join('')}` : ''}`;
}

function vistaSinCuerpo(cuando) {
  app.innerHTML = `
    <h1>Esperan cuerpo</h1>
    ${queEs('sin-cuerpo')}
    <p class="estado">${esc(cuando)}</p>
    ${E.esperando.length ? E.esperando.map((n) => {
    const e = estadoSinCuerpo({ intentos: n.intentos ?? 0, maximo: E.intentosMaximos, conCuerpo: !!E.correcciones.notas?.[n.id]?.cuerpo });
    return tarjeta(n, { tipo: 'sin-cuerpo', extra: `<span class="est ${e.clase}">${esc(e.texto)}</span>` });
  }).join('') : '<p class="vacio">Todas tienen cuerpo.</p>'}`;
}

function vistaPublicadas(cuando) {
  const q = E.busqueda.toLowerCase();
  const enPortada = E.portada?.notas ?? [];
  const deLasFuentes = enPortada.filter((n) => !n.propia).length;
  const propias = enPortada.length - deLasFuentes;
  const todas = [...enPortada, ...(E.archivo ?? []).filter((a) => !enPortada.some((n) => n.id === a.id))];
  const lista = todas.filter((n) => !n.propia && (!q || `${n.titulo} ${n.seccion}`.toLowerCase().includes(q))).slice(0, 80);
  const enArchivo = E.estadoCel?.archivo;
  app.innerHTML = `
    <h1>Publicadas</h1>
    ${queEs('publicadas')}
    <p class="estado">${esc(cuando)} <strong>${deLasFuentes}</strong> en la portada (las de las últimas 36 horas)${propias ? `, más ${propias} del sitio (el dólar y los repasos, que no se editan desde acá)` : ''}${enArchivo ? ` · <strong>${enArchivo}</strong> con página en el archivo (hasta 180 días)` : ''}.</p>
    <input type="search" id="buscar" placeholder="Buscar por título o sección" value="${esc(E.busqueda)}" aria-label="Buscar">
    <p class="estado">${E.archivo ? `Buscando también en el archivo: ${todas.length} notas.` : '<button type="button" class="boton" data-accion="archivo">Buscar también en el archivo</button>'}</p>
    ${lista.map((n) => tarjeta(n, { tipo: 'publicada', extra: E.correcciones.notas?.[n.id] ? '<span class="marca">✎ corregida</span>' : '' })).join('') || '<p class="vacio">Nada con eso.</p>'}
    <h2 id="retiradas">Retiradas (se pueden volver a publicar)</h2>
    ${E.papelera.length ? E.papelera.map((n) => tarjeta({ ...n, fecha: n.retirada }, {
    tipo: 'retirada',
    extra: `<span class="meta">retirada${n.por ? ` por ${esc(n.por)}` : ''}${n.motivo ? `: ${esc(n.motivo)}` : ''}</span>${vueltaAPublicar(n) ? '<span class="marca">↺ vuelve en la próxima actualización</span>' : ''}`,
  })).join('')
    : `<p class="estado">${E.pendientes ? 'No hay notas retiradas en los últimos 30 días.' : 'La lista de retiradas llega cifrada con la próxima actualización de la web.'}</p>`}`;
  $('#buscar').addEventListener('input', (ev) => {
    E.busqueda = ev.target.value;
    clearTimeout(vistaPublicadas.t);
    vistaPublicadas.t = setTimeout(() => { vistaLista(); const b = $('#buscar'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250);
  });
}

function vistaRedes() {
  const r = E.estadoCel?.redes;
  if (!r) {
    app.innerHTML = `<h1>Redes</h1>${queEs('redes')}<p class="vacio">El cronograma de las redes aparece después de la próxima actualización de la web.</p>`;
    return;
  }
  const hoy = hoyEnBalcarce();
  const reglas = reglasFb();
  const tituloDe = (id) => (E.portada?.notas ?? []).find((n) => n.id === id)?.titulo ?? (E.archivo ?? []).find((n) => n.id === id)?.titulo ?? null;
  const salioPieza = (nombre) => E.libro?.instagram?.[`${hoy}/${nombre}`]?.cuando ?? null;
  // La previa se armó hoy o es de ayer (pasada la medianoche, hasta la próxima actualización).
  const deHoy = Number.isFinite(Date.parse(r.generado ?? '')) && hoyEnBalcarce(new Date(r.generado)) === hoy;
  const piezas = (r.piezas ?? []).map((p) => {
    const e = estadoDePieza({ hora: p.hora, ventana: p.ventana, salio: salioPieza(p.nombre) });
    return `<li class="fila"><span class="hora">${esc(p.hora)}</span><span class="que">${esc(p.que)}<span class="meta"> · ${p.tipo === 'reel' ? 'video' : 'historia'}${p.voz ? `, ${esc(VOCES[p.voz] ?? p.voz)}` : ''}</span></span><span class="est ${e.clase}">${e.icono} ${esc(e.texto)}</span></li>`;
  }).join('');
  const repasos = (r.repasos ?? []).map((p) => {
    const salio = salioPieza(p.nombre) ?? (deHoy ? p.salio : null);
    const ventana = (r.piezas ?? []).find((x) => x.nombre === p.nombre)?.ventana ?? 0;
    const e = estadoDePieza({ hora: p.hora, ventana, salio });
    // Si pasó su hora y no salió, no se muestran notas: hoy ya no las cuenta.
    const notas = salio || e.clase !== 'mal' ? (p.notas ?? []) : [];
    const lista = notas.length ? `<ol class="notas-repaso">${notas.map((n) => `<li>${chip(n.seccion)}${esc(n.titulo ?? tituloDe(n.id) ?? 'una nota que ya no está en la web')}</li>`).join('')}</ol>` : '';
    const explicacion = salio ? (notas.length ? 'Contó:' : '')
      : e.clase === 'mal' ? 'Hoy ya no sale.'
        : notas.length ? `Si saliera ahora contaría esto${p.segundos ? ` (unos ${esc(p.segundos)} segundos)` : ''}. Puede cambiar hasta su hora: si entra una nota nueva o si se retira una.`
          : 'Todavía no hay notas para contar. Si a su hora no hay, no sale.';
    return `<div class="caja"><h3>${esc(p.titulo)} <span class="meta">· ${esc(p.hora)}${p.voz ? `, ${esc(VOCES[p.voz] ?? p.voz)}` : ''}</span></h3>
      <p class="est ${e.clase}">${e.icono} ${esc(e.texto)}</p>
      ${explicacion ? `<p class="estado">${explicacion}</p>` : ''}${lista}</div>`;
  }).join('');
  const posteos = Object.entries(E.libro?.facebook ?? {})
    .filter(([, v]) => v?.cuando && hoyEnBalcarce(new Date(v.cuando)) === hoy)
    .sort((a, b) => Date.parse(a[1].cuando) - Date.parse(b[1].cuando));
  const ultimo = Object.values(E.libro?.facebook ?? {}).reduce((max, v) => Math.max(max, Date.parse(v?.cuando ?? '') || 0), 0);
  const cola = (r.facebook?.cola ?? []).filter((n) => !enFacebook(n.id));
  app.innerHTML = `
    <h1>Redes</h1>
    ${queEs('redes')}
    ${r.activas === false ? '<p class="problemas"><strong>Las redes están apagadas</strong> (la variable REDES_ACTIVAS de GitHub no dice "Si"): nada de esto sale. Es lo que saldría si estuvieran prendidas.</p>' : ''}
    <p class="estado">${deHoy ? `Las notas de cada repaso se calcularon ${esc(haceCuanto(r.generado))}; lo que ya salió está al día.` : 'Es la previa de ayer: la de hoy se arma en la próxima actualización de la web.'}</p>
    <h2>Hoy</h2>
    <ul class="cronograma">${piezas}</ul>
    <h2>Qué cuenta cada repaso</h2>
    ${repasos}
    <h2>Facebook (y su foto en Instagram)</h2>
    <p class="estado">Hoy salieron <strong>${posteos.length}</strong> de ${reglas.porDia}. ${esc(proximoPosteo({ ultimo: ultimo ? new Date(ultimo).toISOString() : null, hoySalieron: posteos.length, reglas }))}</p>
    ${posteos.length ? `<ul class="lista-simple">${posteos.map(([id, v]) => `<li><span class="meta">${esc(horaEnBalcarce(v.cuando))}</span> ${esc(v.titulo ?? tituloDe(id) ?? '')}</li>`).join('')}</ul>` : ''}
    <h3>En la cola</h3>
    ${cola.length ? `<ol class="lista-simple">${cola.map((n) => `<li>${n.marcada ? '<span class="marca">→ la mandó una persona</span> ' : ''}${chip(n.seccion)}${esc(n.titulo ?? tituloDe(n.id) ?? '')}</li>`).join('')}</ol>
      <p class="ayuda">Sale la primera de la cola cuando toca. Para mandar otra, abrila en Publicadas y tocá "Mandar también a las redes".</p>`
    : `<p class="estado">No hay notas en la cola. Entran solas las de Balcarce con relevancia alta, y las que manda una persona, de las últimas ${reglas.edadMaximaHoras} horas.</p>`}`;
}

function vistaMas() {
  const a = leerAjustes();
  const reglas = reglasFb();
  app.innerHTML = `
    <h1>Más</h1>
    <div class="botones">
      <button type="button" class="boton ancho" data-accion="actualizar-web">Actualizar la web ahora</button>
      <a class="boton ancho enlace-boton" href="https://radarbalcarce.com" target="_blank" rel="noopener">Abrir la web</a>
    </div>
    <p class="estado">Entraste como <strong>${esc(a?.nombre ?? E.nombre)}</strong>. Cada decisión queda en GitHub con tu nombre.</p>
    <h2>Cómo funciona</h2>
    <details><summary>¿Cuándo se ve en la web lo que hago acá?</summary>
      <p>Todo lo que hacés acá (aprobar, corregir, retirar, deshacer) se guarda al instante en GitHub y sale en la web en la próxima actualización, que es cada media hora. Si no querés esperar, tocá "Actualizar la web ahora": tarda unos 8 minutos.</p></details>
    <details><summary>Esperan: publicar o descartar</summary>
      <p>Son las notas que el sistema no publica solo. Cada una dice por qué espera y qué hay que mirar, y qué contó cada medio (con el enlace a la nota original). La IA no las escribe sola: si querés publicar una, tocás "Escribirla con IA" (tarda un minuto y te muestra el texto para corregir antes de publicar) o la escribís a mano. "Descartar" la saca de la lista; queda en "Descartadas", al final, por si te equivocaste.</p></details>
    <details><summary>Sin cuerpo: ¿salen solas?</summary>
      <p>Sí. Son notas que salen solas, pero todavía no tienen un cuerpo que pase el verificador. La IA las vuelve a intentar sola, hasta ${esc(E.intentosMaximos)} veces, en las próximas actualizaciones; si lo logra, se publican sin que hagas nada. Cada una dice cuántas veces lo intentó. Si una es importante y querés que salga ya, escribila con la IA o a mano.</p></details>
    <details><summary>Publicadas: corregir, cambiar de sección, reescribir</summary>
      <p>"Editar" cambia el título, la bajada, el cuerpo o la sección. "Reescribir con IA" le pide una versión nueva (podés decirle qué cambiar) y te la muestra antes de guardar. La dirección de la nota no cambia nunca. "En la portada" son las de las últimas 36 horas; las más viejas siguen con su página en el archivo, y se buscan con "Buscar también en el archivo".</p></details>
    <details><summary>Mandar una nota a Facebook e Instagram</summary>
      <p>Solas, a Facebook van sólo notas de Balcarce con relevancia alta. Con "Mandar también a las redes" una persona puede mandar cualquier nota publicada, también de Política o Policiales. Antes te pregunta. Sale en la próxima vuelta de las redes: ${esc(comoSalenLosPosteos(reglas))}. Mientras no salga, se puede sacar de la cola; una vez publicada, sólo se borra a mano en Facebook e Instagram.</p></details>
    <details><summary>Retirar y volver a publicar</summary>
      <p>"Retirar de la web" la saca de la portada y su página deja de existir en la próxima actualización. No se borra: queda en "Retiradas" (al final de Publicadas) durante 30 días, y "Volver a publicar" la trae de nuevo con la misma dirección. Si ya había salido en Facebook o Instagram, allá hay que borrarla a mano.</p></details>
    <details><summary>La pestaña Redes</summary>
      <p>El cronograma de hoy (qué pieza sale a qué hora, con qué voz, y si ya salió), qué notas contaría cada repaso si saliera ahora y los posteos de Facebook. Lo que contaría un repaso puede cambiar hasta su hora: si entra una nota nueva o si retirás una.</p></details>
    <details><summary>Instalar el panel como app</summary>
      <p>En Chrome del celular: menú ⋮ → <strong>Instalar app</strong> (o "Agregar a pantalla principal"). Queda con su ícono y se actualiza sola.</p></details>
    <details><summary>Seguridad</summary>
      <p>Lo que espera a una persona y las retiradas llegan cifradas: sólo los celulares registrados las pueden leer. La llave de GitHub queda sólo en este celular; si lo perdés, borrala en GitHub (Settings → Developer settings → Fine-grained tokens).</p></details>
    <div class="botones"><button type="button" class="boton peligro ancho" data-accion="salir">Salir y borrar la llave de este celular</button></div>`;
}

// ------------------------------------------------------------------ una nota

function buscar(tipo, id) {
  if (tipo === 'pendiente') return [...(E.pendientes ?? E.publicos), ...E.descartadas].find((n) => n.id === id);
  if (tipo === 'sin-cuerpo') return E.esperando.find((n) => n.id === id);
  if (tipo === 'retirada') return E.papelera.find((n) => n.id === id);
  return (E.portada?.notas ?? []).find((n) => n.id === id) ?? (E.archivo ?? []).find((n) => n.id === id);
}

function fuentesConResumen(n) {
  const f = n.fuentes ?? n.fuentesConsultadas ?? [];
  if (!f.length) return '';
  return `<h2>Lo que contó cada medio (${f.length})</h2>${f.map((x) => `<div class="caja">
    <p><strong>${esc(x.medio ?? 'Un medio')}</strong>${x.oficial ? ' · fuente oficial' : ''}${x.fecha ? ` <span class="meta">· ${esc(haceCuanto(x.fecha))}</span>` : ''}</p>
    ${x.resumen ? `<p>${esc(x.resumen)}</p>` : ''}
    ${x.enlace ? `<p><a href="${esc(x.enlace)}" target="_blank" rel="noopener noreferrer">Leer la nota original ↗</a></p>` : ''}</div>`).join('')}`;
}

function textoDeLaNota({ titulo, copete, cuerpo }) {
  return `<div class="texto-nota">${titulo ? `<p class="titulo-borrador">${esc(titulo)}</p>` : ''}<p class="bajada">${esc(copete ?? '')}</p><p class="cuerpo">${esc(cuerpo || '(sin cuerpo)')}</p></div>`;
}

/** Lo que marcó el verificador. El aviso del semáforo va sólo si es otro que el motivo por el que ya espera. */
function listaDeProblemas(b, motivo = null) {
  const semaforo = b?.aviso && !(motivo && String(b.aviso).startsWith(String(motivo))) ? [`el semáforo: ${b.aviso}`] : [];
  const problemas = [...(b?.problemas ?? []), ...semaforo];
  if (!problemas.length) return '<p class="estado">✓ El verificador no encontró nada que no esté en las fuentes.</p>';
  return `<div class="problemas"><strong>Revisá esto antes de publicar</strong> (el verificador lo marcó contra las fuentes):<ul>${problemas.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`;
}

function vistaNota(tipo, id) {
  const n = buscar(tipo, id);
  if (!n) { aviso('Esa nota ya no está en la lista.'); vistaLista(); return; }
  $('#pestanas').hidden = true;
  const d = decididaEnElCelular(id);
  const c = E.correcciones.notas?.[id];
  let cuerpo = '';
  let acciones = '';
  if (tipo === 'pendiente') {
    const conDetalle = !!(n.resumen || n.fuentes?.length);
    cuerpo = `
      <div class="caja aviso-motivo"><strong>Por qué espera:</strong> ${esc(explicarMotivo(n.motivo))}</div>
      ${n.ficha ? `<div class="caja"><strong>Lo que anotó la IA al leerla:</strong> ${esc(explicarFicha(n.ficha))}</div>` : ''}
      ${!conDetalle ? '<p class="problemas">El detalle de esta nota llega cifrado en la próxima actualización de la web. Igual se le puede pedir a la IA que la escriba.</p>' : ''}
      ${n.resumen ? `<h2>Lo que dice la fuente principal</h2><div class="texto-nota"><p>${esc(n.resumen)}</p></div>` : ''}
      ${fuentesConResumen(n)}`;
    if (d) {
      acciones = d.estado === 'publicada'
        ? `<p class="estado">La aprobaste ${esc(haceCuanto(d.cuando))}: sale en la próxima actualización.</p><button type="button" class="boton" data-accion="deshacer" data-id="${esc(id)}">Deshacer (vuelve a esperar)</button>`
        : `<p class="estado">La descartaste ${esc(haceCuanto(d.cuando))}${d.por ? ` (${esc(d.por)})` : ''}.</p><button type="button" class="boton principal" data-accion="deshacer" data-id="${esc(id)}">Volver a traerla</button>`;
    } else {
      acciones = `<button type="button" class="boton principal" data-accion="escribir" data-tipo="pendiente" data-id="${esc(id)}">Escribirla con IA</button>
        <button type="button" class="boton" data-accion="a-mano" data-tipo="pendiente" data-id="${esc(id)}">Escribirla a mano</button>
        <button type="button" class="boton peligro" data-accion="descartar" data-id="${esc(id)}">Descartar</button>`;
    }
  } else if (tipo === 'sin-cuerpo') {
    const e = estadoSinCuerpo({ intentos: n.intentos ?? 0, maximo: E.intentosMaximos, conCuerpo: !!c?.cuerpo });
    cuerpo = `<p class="est ${e.clase}">${esc(e.texto)}</p>
      <h2>Lo que dice la fuente</h2><div class="texto-nota"><p>${esc(n.copete ?? '')}</p></div>
      ${c?.cuerpo ? `<h2>El cuerpo que se escribió</h2>${textoDeLaNota({ copete: c.copete ?? n.copete, cuerpo: c.cuerpo })}` : ''}
      ${fuentesConResumen(n)}`;
    acciones = `<button type="button" class="boton principal" data-accion="escribir" data-tipo="sin-cuerpo" data-id="${esc(id)}">Escribir con IA ahora</button>
      <button type="button" class="boton" data-accion="a-mano" data-tipo="sin-cuerpo" data-id="${esc(id)}">${c?.cuerpo ? 'Corregir el cuerpo' : 'Escribir a mano'}</button>`;
  } else if (tipo === 'retirada') {
    cuerpo = `<div class="caja">La retiró ${esc(n.por ?? 'una persona')} ${esc(haceCuanto(n.retirada))}${n.motivo ? `. Motivo: ${esc(n.motivo)}` : ''}. Ya no tiene página en la web.</div>
      ${textoDeLaNota({ copete: n.copete, cuerpo: n.cuerpo })}`;
    acciones = vueltaAPublicar(n)
      ? `<p class="estado">La volviste a publicar ${esc(haceCuanto(d.cuando))}: vuelve en la próxima actualización.</p><button type="button" class="boton" data-accion="retirar-de-nuevo" data-id="${esc(id)}">Deshacer (que siga retirada)</button>`
      : `<button type="button" class="boton principal" data-accion="volver-a-publicar" data-id="${esc(id)}">Volver a publicar</button>
         <button type="button" class="boton" data-accion="a-mano" data-tipo="retirada" data-id="${esc(id)}">Corregirla y volver a publicarla</button>`;
  } else {
    const fb = enFacebook(id);
    const ig = enInstagram(id);
    cuerpo = `${textoDeLaNota({ copete: c?.copete ?? n.copete, cuerpo: c?.cuerpo ?? n.cuerpo })}
      <p><a href="${esc(enlaceDeNota(n))}" target="_blank" rel="noopener">Ver en la web ↗</a></p>
      <p class="estado">${fb ? `✓ Salió en Facebook a las ${esc(horaEnBalcarce(fb.cuando))}${ig ? ' y en Instagram' : ''}.` : (marcadaParaRedes(id) ? '→ Está en la cola de las redes: sale en la próxima vuelta que corresponda (mirá la pestaña Redes).' : 'No salió en las redes.')}</p>
      ${fuentesConResumen(n)}`;
    acciones = d?.estado === 'bloqueada'
      ? `<p class="estado">La retiraste ${esc(haceCuanto(d.cuando))}: sale de la web en la próxima actualización.</p><button type="button" class="boton" data-accion="deshacer-retiro" data-id="${esc(id)}">Deshacer</button>`
      : `<button type="button" class="boton principal" data-accion="a-mano" data-tipo="publicada" data-id="${esc(id)}">Editar</button>
         <button type="button" class="boton" data-accion="pedir-reescribir" data-id="${esc(id)}">Reescribir con IA</button>
         ${fb ? '' : `<button type="button" class="boton" data-accion="redes" data-id="${esc(id)}">${marcadaParaRedes(id) ? 'Sacar de la cola de las redes' : 'Mandar también a las redes'}</button>`}
         <button type="button" class="boton peligro" data-accion="retirar" data-id="${esc(id)}">Retirar de la web</button>`;
  }
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver">← Volver</button>
    <p>${chip(c?.seccion ?? n.seccion)}<span class="meta">${esc(haceCuanto(n.fecha))}</span></p>
    <h1>${esc(c?.titulo ?? n.titulo ?? 'Nota sensible')}</h1>
    ${cuerpo}
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

/** Editar un texto (el de la IA, o el que ya tiene la nota) y decidir. */
function vistaBorrador(tipo, id, b = null) {
  const n = buscar(tipo, id) ?? {};
  const c = E.correcciones.notas?.[id] ?? {};
  const t = b?.texto ?? { titulo: c.titulo ?? n.titulo ?? '', copete: c.copete ?? n.copete ?? '', cuerpo: c.cuerpo ?? n.cuerpo ?? '' };
  const seccion = c.seccion ?? n.seccion ?? b?.seccion ?? '';
  const deIA = !!b?.texto;
  const boton = { pendiente: 'Publicar', 'sin-cuerpo': 'Publicar con este cuerpo', retirada: 'Volver a publicar' }[tipo] ?? 'Guardar';
  const explicacion = {
    publicada: 'Los cambios se ven en la web en la próxima actualización. La dirección de la nota no cambia.',
    retirada: 'Vuelve a la web con este texto en la próxima actualización, con la misma dirección.',
  }[tipo] ?? 'Revisalo y corregí lo que haga falta: se publica recién cuando tocás el botón de abajo.';
  app.innerHTML = `
    <button type="button" class="boton" data-accion="volver-nota" data-tipo="${esc(tipo)}" data-id="${esc(id)}">← Volver</button>
    <h1>${deIA ? 'Lo que escribió la IA' : 'Editar la nota'}</h1>
    <p class="estado">${esc(explicacion)}</p>
    ${b && !b.ok && !b.texto ? `<p class="problemas">${esc(b.motivo ?? 'La IA no pudo escribirla.')}</p>` : ''}
    ${deIA ? listaDeProblemas(b, n.motivo) : ''}
    ${b?.sacadas ? `<p class="estado">El verificador sacó ${esc(b.sacadas)} oración(es) con datos que no estaban en las fuentes.</p>` : ''}
    <form id="form-texto">
      <label for="t-titulo">Título <span class="ayuda" id="c-titulo"></span></label>
      <input type="text" id="t-titulo" value="${esc(t.titulo)}" maxlength="120">
      <label for="t-copete">Bajada</label>
      <textarea id="t-copete">${esc(t.copete)}</textarea>
      <label for="t-cuerpo">Cuerpo <span class="ayuda" id="c-cuerpo"></span></label>
      <textarea id="t-cuerpo" class="cuerpo">${esc(t.cuerpo)}</textarea>
      <label for="t-seccion">Sección</label>
      <select id="t-seccion">${SECCIONES.map((s) => `<option ${s === seccion ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      ${tipo === 'pendiente' || tipo === 'sin-cuerpo' ? `<label class="check"><input type="checkbox" id="t-redes" ${marcadaParaRedes(id) ? 'checked' : ''}> Mandarla también a Facebook e Instagram</label>
      <p class="ayuda">Si no la marcás, sale sólo en la web. Si la marcás, antes te pregunta.</p>` : ''}
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
    guardarTexto(tipo, id, campos, {
      deIA: deIA || (tipo === 'retirada' && !!n.deIA), extras: b?.texto ?? {}, redes: $('#t-redes')?.checked ?? null, seccionAntes: seccion, cuerpoAntes: String(t.cuerpo ?? '').trim(),
    });
  });
  window.scrollTo(0, 0);
}

/** La decisión de publicar una nota con este texto (aprobarla o volver a publicarla). */
const aprobada = ({ titulo, copete, cuerpo }, { deIA, por, motivo = null, extras = {} }) => ({
  estado: 'publicada', titulo, copete, cuerpo, deIA: !!deIA, por,
  ...(motivo ? { motivo } : {}),
  ...(deIA ? Object.fromEntries(Object.entries(extras).filter(([k, v]) => v != null && ['textoRedes', 'etiquetas', 'claves', 'seSabe', 'noConfirmado', 'fuentesConsultadas'].includes(k))) : {}),
});

async function guardarTexto(tipo, id, campos, {
  deIA, extras, redes, seccionAntes, cuerpoAntes,
}) {
  if (!campos.titulo || !campos.copete) { aviso('Faltan el título o la bajada.'); return; }
  // Con menos de 70 palabras una nota automática no sale sola: se avisa si se
  // aprueba o se completa una, o si se tocó el cuerpo (no por cambiar la sección).
  const corto = palabras(campos.cuerpo) < 70 && (tipo !== 'publicada' || campos.cuerpo !== cuerpoAntes);
  if (corto && !(await preguntar(PREGUNTAS.publicarCorto)).ok) return;
  if (redes && !marcadaParaRedes(id) && !(await preguntar(preguntaRedes(reglasFb()))).ok) return;
  const por = E.nombre;
  const n = buscar(tipo, id) ?? {};
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    if (tipo === 'pendiente' || tipo === 'retirada') {
      const motivo = tipo === 'retirada' ? 'vuelta a publicar desde el celular' : null;
      await E.cliente.guardar(ARCHIVOS.decisiones, (j) => {
        let x = conDecision(j, id, aprobada(campos, { deIA, por, motivo, extras }));
        if (redes !== null) x = conRedes(x, id, por, redes);
        return x;
      }, `Panel del celular: ${por} ${tipo === 'retirada' ? 'vuelve a publicar' : 'aprueba'} una nota`);
      if (tipo === 'retirada' && n.desde === 'a mano') await E.cliente.guardar(ARCHIVOS.retiradas, (j) => sinRetirada(j, id), `Panel del celular: ${por} vuelve a publicar una nota retirada a mano`);
      if (campos.seccion !== seccionAntes) {
        await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, { seccion: campos.seccion }, { motivo: 'sección cambiada desde el celular', por }), `Panel del celular: ${por} cambia la sección`);
      }
    } else {
      const motivo = tipo === 'sin-cuerpo'
        ? (deIA ? 'cuerpo escrito con IA desde el celular y revisado' : 'cuerpo escrito a mano desde el celular')
        : (deIA ? 'reescrita con IA desde el celular y revisada' : 'editada desde el celular');
      const cambios = { ...campos };
      if (campos.seccion === seccionAntes) delete cambios.seccion;
      await E.cliente.guardar(ARCHIVOS.correcciones, (j) => conCorreccion(j, id, cambios, { motivo, por, deIA }), `Panel del celular: ${por} ${tipo === 'sin-cuerpo' ? 'completa' : 'corrige'} una nota`);
      if (redes !== null && redes !== marcadaParaRedes(id)) await E.cliente.guardar(ARCHIVOS.decisiones, (j) => conRedes(j, id, por, redes), `Panel del celular: ${por} manda una nota a las redes`);
    }
    await cargar({ archivo: !!E.archivo });
    if (tipo === 'publicada' || tipo === 'retirada') E.pestana = 'publicadas';
    vistaLista();
    aviso(tipo === 'retirada' ? 'Vuelve a la web en la próxima actualización, con la misma dirección.' : 'Listo. Sale en la web en la próxima actualización (cada media hora).', { conActualizar: true });
  } catch (e) {
    aviso(explicarError(e), { ms: 9000 });
    vistaBorrador(tipo, id, { texto: campos, ok: true, problemas: [] });
  }
}

async function guardarYVolver(pasos, listo) {
  try {
    app.innerHTML = '<div class="girando"></div><p class="vacio">Guardando en GitHub…</p>';
    for (const [ruta, cambiar, mensaje] of pasos) await E.cliente.guardar(ruta, cambiar, mensaje);
    await cargar({ archivo: !!E.archivo });
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
  if (!el || el.closest('dialog')) return;
  const { id, tipo } = el.dataset;
  if (el.dataset.pestana) { E.pestana = el.dataset.pestana; vistaLista(); window.scrollTo(0, 0); return; }
  if (el.dataset.abrir) { vistaNota(el.dataset.abrir, id); return; }
  const accion = el.dataset.accion;
  const por = E.nombre;
  const decision = (cambiar, mensaje) => [ARCHIVOS.decisiones, cambiar, `Panel del celular: ${por} ${mensaje}`];
  if (accion === 'cerrar-aviso') $('#aviso').hidden = true;
  else if (accion === 'volver') vistaLista();
  else if (accion === 'volver-nota') vistaNota(tipo, id);
  else if (accion === 'escribir') {
    const r = await preguntar({
      titulo: 'Pedirle a la IA que la escriba', texto: 'Tarda un minuto. No se publica nada hasta que lo revises.', si: 'Escribir', conPedido: 'Algo para pedirle (opcional): "que sea corta", "que empiece por el horario"…',
    });
    if (r.ok) pedirALaIA(tipo, id, r.texto);
  } else if (accion === 'pedir-reescribir' || accion === 'otra-version') {
    const r = await preguntar({
      titulo: 'Pedir otra versión', texto: 'Tarda un minuto. No cambia nada en la web hasta que la guardes.', si: 'Pedirla', conPedido: '¿Qué cambiar? (opcional)',
    });
    if (r.ok) pedirALaIA(accion === 'otra-version' ? tipo : 'publicada', id, r.texto);
  } else if (accion === 'a-mano') vistaBorrador(tipo, id, null);
  else if (accion === 'descartar') {
    if ((await preguntar(PREGUNTAS.descartar)).ok) {
      guardarYVolver([decision((j) => conDecision(j, id, { estado: 'descartada', por, motivo: 'descartada desde el celular' }), 'descarta una nota')], 'Descartada. Queda en "Descartadas", al final de Esperan, por si te equivocaste.');
    }
  } else if (accion === 'retirar') {
    const r = await preguntar(PREGUNTAS.retirar);
    if (!r.ok) return;
    // Si estaba aprobada desde el celular, se anota: deshacer el retiro la vuelve a dejar aprobada.
    const antes = decididaEnElCelular(id)?.estado === 'publicada' ? { antes: 'publicada' } : {};
    guardarYVolver([decision((j) => conDecision(j, id, { estado: 'bloqueada', por, motivo: r.texto, ...antes }), 'retira una nota')], 'Retirada: sale de la web en la próxima actualización y queda en "Retiradas" 30 días. Si ya estaba en Facebook o Instagram, allá hay que borrarla a mano.');
  } else if (accion === 'deshacer') {
    guardarYVolver([decision((j) => sinDecision(j, id), 'deshace una decisión')], 'Deshecho: se aplica en la próxima actualización.');
  } else if (accion === 'deshacer-retiro') {
    // Todavía no se aplicó: vuelve a como estaba (aprobada, si lo estaba).
    const d = decididaEnElCelular(id);
    const n = buscar('publicada', id) ?? {};
    const c = E.correcciones.notas?.[id] ?? {};
    const texto = { titulo: c.titulo ?? n.titulo, copete: c.copete ?? n.copete, cuerpo: c.cuerpo ?? n.cuerpo };
    const cambiar = d?.antes === 'publicada' && texto.titulo && texto.copete && texto.cuerpo
      ? (j) => conDecision(j, id, aprobada(texto, { deIA: !!n.guion, por, motivo: 'se deshizo el retiro desde el celular' }))
      : (j) => sinDecision(j, id);
    guardarYVolver([decision(cambiar, 'deshace un retiro')], 'Deshecho: la nota sigue en la web.');
  } else if (accion === 'volver-a-publicar') {
    const n = buscar('retirada', id);
    if (!n) return;
    if (!n.titulo || !n.copete || !n.cuerpo) { vistaBorrador('retirada', id, null); aviso('Le falta texto: completalo y tocá "Volver a publicar".'); return; }
    if (!(await preguntar(PREGUNTAS.volverAPublicar)).ok) return;
    const pasos = [decision((j) => conDecision(j, id, aprobada(n, { deIA: n.deIA, por, motivo: 'vuelta a publicar desde el celular' })), 'vuelve a publicar una nota')];
    if (n.desde === 'a mano') pasos.push([ARCHIVOS.retiradas, (j) => sinRetirada(j, id), `Panel del celular: ${por} vuelve a publicar una nota retirada a mano`]);
    guardarYVolver(pasos, 'Vuelve a la web en la próxima actualización, con la misma dirección.');
  } else if (accion === 'retirar-de-nuevo') {
    const n = buscar('retirada', id) ?? {};
    guardarYVolver([decision((j) => conDecision(j, id, { estado: 'bloqueada', por, motivo: n.motivo || 'sigue retirada (se deshizo la vuelta a publicar)' }), 'deja retirada una nota')], 'Listo: sigue retirada.');
  } else if (accion === 'redes') {
    const si = !marcadaParaRedes(id);
    if (!(await preguntar(si ? preguntaRedes(reglasFb()) : PREGUNTAS.sacarDeRedes)).ok) return;
    guardarYVolver([decision((j) => conRedes(j, id, por, si), `${si ? 'manda una nota a' : 'saca una nota de'} las redes`)], si ? 'En la cola de las redes: sale en la próxima vuelta que corresponda. Mirá la pestaña Redes.' : 'Fuera de la cola de las redes.');
  } else if (accion === 'archivo') {
    el.disabled = true;
    try { await cargar({ archivo: true }); vistaLista(); } catch (e) { aviso(explicarError(e)); }
  } else if (accion === 'actualizar-web') {
    try { await E.cliente.disparar('actualizar.yml'); aviso('Pedido. En unos 8 minutos está en la web.'); } catch (e) { aviso(explicarError(e)); }
  } else if (accion === 'recargar-pagina') {
    location.reload();
  } else if (accion === 'salir') {
    if (!(await preguntar({ titulo: '¿Salir de este celular?', texto: 'Se borran la llave y los datos de este celular. Para volver a entrar vas a necesitar una llave.', si: 'Sí, salir' })).ok) return;
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
