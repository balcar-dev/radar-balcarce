// La pestaña "Contactos" del panel del celular (3/10/2026, Hernán: "a todos los contactos que tenemos mandarles, estén o no cerca de la
// fecha; está bueno armarnos una agenda propia de posibles contactos"). Sin nada del DOM ni de la red: se prueba con Node
// (pruebas/contactos-panel.test.mjs).
//
// Dos clases de contactos:
//  · las INSTITUCIONES de ingesta/contactos-agenda.json (43, con los canales que publica cada una: ese archivo es público);
//  · los PROPIOS: personas que carga Hernán o Andrés (el encargado de turismo de tal lugar, alguien que organiza algo…). Un teléfono de una
//    persona NO puede ir al repositorio público: cada contacto propio y cada anotación (a quién se le escribió y cuándo, quién respondió)
//    viaja CIFRADO para los celulares registrados, un sobre por renglón (web/data/contactos-celular.json), así dos personas editando
//    contactos distintos no se pisan.
// NADA se manda solo: el botón abre WhatsApp o el correo con el texto puesto y lo manda una persona.

export const DIAS_ENTRE_MENSAJES = 30;

/** El mensaje de siempre (igual que ingesta/agenda.mjs, mensajeAgenda: una prueba controla que digan lo mismo). */
export function mensajeParaContacto({ quien = '', firma = 'Radar Balcarce' } = {}) {
  return `Hola${quien ? `, ${quien}` : ''}! Te escribimos de ${firma}, un medio digital de noticias de Balcarce.

Estamos armando la agenda de eventos del mes y nos gustaría sumar los suyos, con fecha, lugar y lo que haga falta. Si nos pasan lo que tengan confirmado (o por confirmarse) para las próximas semanas, lo publicamos en nuestra web y en nuestras redes, con link a ustedes.

¿Nos pueden pasar lo que tengan? Gracias, y cualquier novedad nos pueden escribir por acá cuando quieran.

— ${firma}`;
}

/** Un número de WhatsApp tal como lo pide wa.me: sólo dígitos, con 549 (acepta "2266 51-1612", "02266 15-511612" y "+54 9 2266 511612"). */
export function numeroDeWhatsApp(n) {
  let d = String(n ?? '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('54')) {
    if (/^54(?!9)\d{10}$/.test(d)) d = `549${d.slice(2)}`;
  } else {
    d = d.replace(/^0/, '');
    const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m && m[1].length + m[2].length === 10) d = m[1] + m[2];
    if (/^\d{10}$/.test(d)) d = `549${d}`;
  }
  return /^54\d{8,13}$/.test(d) ? d : null;
}

export const enlaceWhatsApp = (numero, mensaje) => {
  const n = numeroDeWhatsApp(numero);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje ?? '')}` : null;
};

export function enlaceMail(mail, mensaje) {
  const m = String(mail ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return null;
  return `mailto:${m}?subject=${encodeURIComponent('Agenda de eventos · Radar Balcarce')}&body=${encodeURIComponent(mensaje ?? '')}`;
}

export const enlaceLlamada = (tel) => {
  const d = String(tel ?? '').replace(/[^\d+]/g, '');
  return d.length >= 6 ? `tel:${d}` : null;
};

const diasDesde = (iso, ahora) => (iso ? Math.floor((ahora - Date.parse(iso)) / 864e5) : null);

/** Cuántos días lleva (0 si es de hoy) y "nunca" si no se le escribió. */
export function haceDias(iso, ahora = new Date()) {
  const d = diasDesde(iso, ahora);
  if (d === null) return 'nunca';
  if (d <= 0) return 'hoy';
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/**
 * Las instituciones y los contactos propios, juntos y con su historial. `publicos`: contactos-agenda.json (`contactos`); `entradas`: lo
 * ya abierto del archivo cifrado ({ clave: contenido }, con `tipo: 'propio'` o `'historial'`). Devuelve una lista ordenada: primero los
 * que nunca se contactaron, después los de hace más tiempo.
 */
export function armarContactos({ publicos = [], entradas = {}, ahora = new Date(), mes = ahora.getMonth() + 1 } = {}) {
  const historial = (id) => entradas[`h-${id}`] ?? {};
  const propios = Object.values(entradas).filter((e) => e?.tipo === 'propio' && !e.borrado);
  const todos = [
    ...publicos.map((c) => ({
      id: c.id, origen: 'institucion', nombre: c.quien, detalle: c.organiza ?? '', rubro: c.rubro ?? '', meses: c.meses ?? [],
      whatsapp: c.canales?.whatsapp ?? '', mail: c.canales?.mail ?? '', telefono: c.canales?.telefono ?? '', web: c.canales?.web ?? '',
      facebook: c.canales?.facebook ?? '', instagram: c.canales?.instagram ?? '', nota: c.nota ?? '',
    })),
    ...propios.map((p) => ({
      id: p.id, origen: 'propio', nombre: p.nombre, detalle: [p.rol, p.organizacion].filter(Boolean).join(' · '), rubro: 'propio', meses: p.meses ?? [],
      whatsapp: p.whatsapp ?? '', mail: p.mail ?? '', telefono: p.telefono ?? '', web: '', facebook: '', instagram: '', nota: p.nota ?? '',
    })),
  ];
  // Varios contactos comparten canal (el autódromo, la Fiesta del Postre y la de la Papa Frita publican el WhatsApp de Turismo): un
  // mensaje a ese número vale para todos.
  const clave = (c) => [numeroDeWhatsApp(c.whatsapp) && `wa:${numeroDeWhatsApp(c.whatsapp)}`, c.mail && `mail:${String(c.mail).trim().toLowerCase()}`].filter(Boolean);
  const hermanos = (c) => todos.filter((o) => o.id !== c.id && clave(o).some((k) => clave(c).includes(k)));
  const masNueva = (fechas) => fechas.filter(Boolean).sort().at(-1) ?? null;
  return todos.map((c) => {
    const grupo = [c, ...hermanos(c)];
    const ultimo = masNueva(grupo.map((o) => historial(o.id).contactado));
    const respondio = masNueva(grupo.map((o) => historial(o.id).respondio));
    const dias = diasDesde(ultimo, ahora);
    const quien = c.origen === 'institucion' ? c.nombre.split(' (')[0] : c.nombre;
    return {
      ...c,
      ultimoContacto: ultimo,
      respondioEl: respondio,
      respondio: !!respondio && (!ultimo || respondio >= ultimo),
      nota: [c.nota, historial(c.id).nota].filter(Boolean).join(' · '),
      tocaEscribir: dias === null || dias >= DIAS_ENTRE_MENSAJES,
      enTemporada: (c.meses ?? []).some((m) => m === mes || m === (mes % 12) + 1),
      compartenCanal: grupo.slice(1).map((o) => o.nombre),
      mensaje: mensajeParaContacto({ quien }),
      puedeEscribirse: !!(numeroDeWhatsApp(c.whatsapp) || enlaceMail(c.mail)),
    };
  }).sort((a, b) => Number(!!a.ultimoContacto) - Number(!!b.ultimoContacto) || String(a.ultimoContacto ?? '').localeCompare(String(b.ultimoContacto ?? '')) || a.nombre.localeCompare(b.nombre));
}

export const FILTROS = [
  ['todos', 'Todos'], ['nunca', 'Sin contactar'], ['toca', 'Toca escribir'], ['respondieron', 'Respondieron'], ['propios', 'Propios'],
];

/** Los contactos que cumplen el filtro y la búsqueda. */
export function filtrarContactos(lista = [], { filtro = 'todos', q = '' } = {}) {
  const texto = String(q).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return lista.filter((c) => {
    if (filtro === 'nunca' && c.ultimoContacto) return false;
    if (filtro === 'toca' && !c.tocaEscribir) return false;
    if (filtro === 'respondieron' && !c.respondio) return false;
    if (filtro === 'propios' && c.origen !== 'propio') return false;
    if (!texto) return true;
    return `${c.nombre} ${c.detalle} ${c.rubro}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(texto);
  });
}

/** A quiénes se les puede escribir "a todos" ahora: los que tocan (hace 30 días o más, o nunca) y tienen un canal; los de temporada primero. */
export function colaDeEnvio(lista = [], { soloTocan = true } = {}) {
  return lista
    .filter((c) => c.puedeEscribirse && (!soloTocan || c.tocaEscribir))
    // Un canal compartido se escribe una sola vez: se queda con el primero de cada número.
    .filter((c, i, todos) => todos.findIndex((o) => numeroDeWhatsApp(o.whatsapp) && numeroDeWhatsApp(o.whatsapp) === numeroDeWhatsApp(c.whatsapp)) === i || !numeroDeWhatsApp(c.whatsapp))
    .sort((a, b) => Number(b.enTemporada) - Number(a.enTemporada) || Number(!!a.ultimoContacto) - Number(!!b.ultimoContacto));
}

/** Un contacto propio nuevo, limpio. */
export function contactoPropio(d = {}, { ahora = new Date(), id = `c${ahora.getTime().toString(36)}` } = {}) {
  const limpio = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const nombre = limpio(d.nombre, 80);
  if (!nombre) return null;
  return {
    tipo: 'propio', id, nombre, rol: limpio(d.rol, 80), organizacion: limpio(d.organizacion, 80), whatsapp: limpio(d.whatsapp, 30),
    mail: limpio(d.mail, 80), nota: limpio(d.nota, 300), creado: ahora.toISOString(),
  };
}

/** Una anotación nueva sobre a quién se le escribió: { tipo: 'historial', id, contactado, respondio, nota }. */
export function conHistorial(antes = {}, id, cambio = {}, ahora = new Date()) {
  return { tipo: 'historial', id, ...antes, ...cambio, ...(cambio.contactado === true ? { contactado: ahora.toISOString() } : {}), ...(cambio.respondio === true ? { respondio: ahora.toISOString() } : {}) };
}

// ------------------------------------------------------------------ el HTML

/** La lista, con el resumen y los filtros. */
export function htmlDeContactos({ lista, filtro = 'todos', q = '', sinAbrir = 0 }, { esc }) {
  const visibles = filtrarContactos(lista, { filtro, q });
  const nunca = lista.filter((c) => !c.ultimoContacto).length;
  const toca = lista.filter((c) => c.tocaEscribir && c.puedeEscribirse).length;
  const filtros = FILTROS.map(([id, t]) => `<button type="button" data-accion="filtro-contactos" data-filtro="${id}" aria-pressed="${filtro === id}">${esc(t)}</button>`).join('');
  const tarjetas = visibles.map((c) => `<button type="button" class="tarjeta contacto" data-accion="abrir-contacto" data-id="${esc(c.id)}">
      <div>${c.origen === 'propio' ? '<span class="chip" style="background:var(--s-tecnologia)">Propio</span>' : ''}${c.enTemporada ? '<span class="marca">● En temporada</span>' : ''}</div>
      <div class="titulo">${esc(c.nombre)}</div>
      ${c.detalle ? `<div class="meta">${esc(c.detalle.slice(0, 110))}</div>` : ''}
      <span class="est ${c.respondio ? 'ok' : (c.ultimoContacto ? 'espera' : 'mal')}">${c.ultimoContacto ? `Se le escribió ${esc(haceDias(c.ultimoContacto))}${c.respondio ? ' · respondió ✓' : ''}` : 'Nunca se le escribió'}</span>
      ${c.puedeEscribirse ? '' : '<span class="meta">Sin WhatsApp ni mail: sólo redes o teléfono.</span>'}</button>`).join('');
  return `<h1>Contactos</h1>
    <p class="estado"><strong>${lista.length}</strong> contactos · <strong>${nunca}</strong> sin contactar nunca · <strong>${toca}</strong> a los que toca escribir (hace 30 días o más).</p>
    ${sinAbrir ? `<p class="problemas">Hay ${esc(sinAbrir)} anotaciones privadas que este celular todavía no puede abrir (se registró después de que se guardaron).</p>` : ''}
    <div class="botones"><button type="button" class="boton principal" data-accion="cola-contactos">Escribirles a todos los que tocan (${toca})</button><button type="button" class="boton" data-accion="nuevo-contacto">＋ Sumar un contacto</button></div>
    <input type="search" id="buscar-contactos" placeholder="Buscar por nombre o rubro" value="${esc(q)}" aria-label="Buscar contactos">
    <div class="filtros">${filtros}</div>
    ${tarjetas || '<p class="vacio">Ninguno con eso.</p>'}`;
}

/** Un contacto entero: sus canales, el mensaje para editar y las anotaciones. */
export function htmlDeUnContacto(c, { esc }) {
  const wa = enlaceWhatsApp(c.whatsapp, c.mensaje);
  const mail = enlaceMail(c.mail, c.mensaje);
  const tel = enlaceLlamada(c.telefono);
  const enlaces = [['web', 'Sitio'], ['facebook', 'Facebook'], ['instagram', 'Instagram']].filter(([k]) => /^https?:/.test(c[k] ?? '')).map(([k, t]) => `<a class="boton enlace-boton" href="${esc(c[k])}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`).join('');
  return `<button type="button" class="boton" data-accion="volver-contactos">← Contactos</button>
    <h1>${esc(c.nombre)}</h1>
    ${c.detalle ? `<p class="estado">${esc(c.detalle)}</p>` : ''}
    <p class="est ${c.respondio ? 'ok' : (c.ultimoContacto ? 'espera' : 'mal')}">${c.ultimoContacto ? `Se le escribió ${esc(haceDias(c.ultimoContacto))}${c.respondio ? ' · respondió ✓' : ' · todavía no respondió'}` : 'Nunca se le escribió'}</p>
    ${c.compartenCanal.length ? `<p class="meta">Comparte el canal con ${esc(c.compartenCanal.join(', '))}: un mensaje vale para todos.</p>` : ''}
    ${c.meses?.length ? `<p class="meta">Suele tener eventos en: ${esc(c.meses.join(', '))} (número de mes).</p>` : ''}
    ${c.nota ? `<p class="ayuda">${esc(c.nota)}</p>` : ''}
    <h2>El mensaje</h2>
    <textarea id="mensaje-contacto" rows="9">${esc(c.mensaje)}</textarea>
    <div class="botones">
      ${wa ? `<button type="button" class="boton principal" data-accion="abrir-whatsapp" data-id="${esc(c.id)}">Abrir WhatsApp</button>` : ''}
      ${mail ? `<button type="button" class="boton" data-accion="abrir-mail" data-id="${esc(c.id)}">Abrir el correo</button>` : ''}
      ${tel ? `<a class="boton enlace-boton" href="${esc(tel)}">Llamar</a>` : ''}
      ${enlaces}
    </div>
    ${wa || mail ? '' : '<p class="problemas">No tiene WhatsApp ni correo cargados: se le puede escribir por sus redes o llamar.</p>'}
    <h2>Anotar</h2>
    <p class="ayuda">Después de mandar el mensaje, anotalo para que no se le escriba de nuevo antes de 30 días.</p>
    <div class="botones">
      <button type="button" class="boton" data-accion="marcar-enviado" data-id="${esc(c.id)}">✓ Ya le mandé el mensaje</button>
      <button type="button" class="boton" data-accion="marcar-respondio" data-id="${esc(c.id)}">↩ Respondió</button>
    </div>
    ${c.origen === 'propio' ? `<div class="botones"><button type="button" class="boton peligro" data-accion="borrar-contacto" data-id="${esc(c.id)}">Borrar este contacto</button></div>` : ''}`;
}

/** El formulario para sumar un contacto propio. */
export function htmlDeFormularioContacto({ esc }) {
  return `<button type="button" class="boton" data-accion="volver-contactos">← Contactos</button>
    <h1>Sumar un contacto</h1>
    <p class="ayuda">Una persona o un lugar al que le podemos pedir información y eventos. Queda guardado <strong>cifrado</strong>: sólo lo ven los celulares registrados (el repositorio es público, por eso nunca va en claro).</p>
    <form id="form-contacto">
      <label for="c-nombre">Nombre</label><input type="text" id="c-nombre" maxlength="80" required placeholder="María Pérez">
      <label for="c-rol">Qué hace (opcional)</label><input type="text" id="c-rol" maxlength="80" placeholder="Encargada de Turismo">
      <label for="c-org">De dónde (opcional)</label><input type="text" id="c-org" maxlength="80" placeholder="Municipalidad de Balcarce">
      <label for="c-wa">WhatsApp</label><input type="tel" id="c-wa" maxlength="30" placeholder="2266 51-1612">
      <label for="c-mail">Correo</label><input type="email" id="c-mail" maxlength="80" placeholder="nombre@ejemplo.com">
      <label for="c-nota">Nota (opcional)</label><textarea id="c-nota" rows="3" maxlength="300" placeholder="Cómo la conocimos, qué sabe, cuándo conviene escribirle"></textarea>
      <div class="botones"><button type="submit" class="boton principal">Guardar el contacto</button></div>
    </form>`;
}

/** Escribirles a todos, de a uno: el contacto, su mensaje y los botones para seguir. */
export function htmlDeCola({ cola, indice }, { esc }) {
  const c = cola[indice];
  if (!c) return '<h1>Listo</h1><p class="vacio">No quedan contactos en la lista. 🎉</p><div class="botones"><button type="button" class="boton principal" data-accion="volver-contactos">Volver a Contactos</button></div>';
  const wa = enlaceWhatsApp(c.whatsapp, c.mensaje);
  const mail = enlaceMail(c.mail, c.mensaje);
  return `<button type="button" class="boton" data-accion="volver-contactos">← Salir de la lista</button>
    <p class="estado">Contacto <strong>${indice + 1}</strong> de <strong>${cola.length}</strong></p>
    <h1>${esc(c.nombre)}</h1>
    ${c.detalle ? `<p class="estado">${esc(c.detalle)}</p>` : ''}
    <p class="est ${c.ultimoContacto ? 'espera' : 'mal'}">${c.ultimoContacto ? `Se le escribió ${esc(haceDias(c.ultimoContacto))}` : 'Nunca se le escribió'}</p>
    <textarea id="mensaje-contacto" rows="8">${esc(c.mensaje)}</textarea>
    <div class="botones">
      ${wa ? `<button type="button" class="boton principal" data-accion="abrir-whatsapp" data-id="${esc(c.id)}">1. Abrir WhatsApp</button>` : ''}
      ${!wa && mail ? `<button type="button" class="boton principal" data-accion="abrir-mail" data-id="${esc(c.id)}">1. Abrir el correo</button>` : ''}
      <button type="button" class="boton" data-accion="cola-enviado" data-id="${esc(c.id)}">2. ✓ Ya lo mandé: el siguiente</button>
      <button type="button" class="boton" data-accion="cola-saltear">Saltear este</button>
    </div>
    <p class="ayuda">Se abre WhatsApp con el mensaje ya escrito: tocás enviar, volvés acá y marcás "Ya lo mandé". Nada se manda solo.</p>`;
}
