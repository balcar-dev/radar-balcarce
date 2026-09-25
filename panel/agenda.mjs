// La agenda del lado del panel: los eventos que se cargan a mano y la base de
// contactos a los que se les piden las fechas.
//
// Un evento cargado a mano nace como BORRADOR y sólo llega a la web cuando
// alguien aprieta "Publicar en la web" (o marca la casilla al cargarlo): así
// "cuando se publica una fecha, se arma la nota". Publicar quiere decir que la
// fecha está confirmada por quien organiza; una fecha aproximada no se publica.
//
// Lo publicado se exporta a web/data/eventos-panel.json, que sube
// panel/sincronizar.mjs igual que las decisiones: así la página del evento
// existe aunque la PC esté apagada (GitHub la arma en cada corrida, ver
// web/lib/eventos.js). Ese archivo es PÚBLICO: va sólo lo que se ve en la web.
// Quién avisó, su teléfono y de qué contacto vino se quedan en panel/datos/.
//
// Sin dependencias y sin leer ni escribir archivos: funciones de una entrada
// y una salida, probadas en pruebas/agenda-panel.test.mjs.

export const SITIO = 'https://radarbalcarce.com';

/** Cada cuánto se le puede volver a escribir a un contacto. */
export const DIAS_ENTRE_MENSAJES = 30;
/** Cuánto hacia adelante mira "a quién escribir este mes". */
export const DIAS_ADELANTE = 45;
/** Hasta cuándo se sigue exportando un evento que ya pasó. La web lo guarda
 *  60 días (DIAS_DESPUES en web/lib/eventos.js); esto es un poco más, para
 *  que no sea el panel el que lo saque antes. */
export const DIAS_EXPORTADO = 90;

/** Lo único de un evento cargado a mano que va al archivo público. */
export const CAMPOS_PUBLICOS = [
  'id', 'slug', 'nombre', 'categoria', 'desde', 'hasta', 'todoElDia', 'lugar', 'direccion', 'localidad',
  'costo', 'organizador', 'organizadorUrl', 'web', 'descripcion', 'anualId', 'publicadoCuando',
];

/** El nombre como parte de una dirección. Es la misma cuenta que slugDe en
 *  web/lib/ruta.js (hay una prueba que lo compara): se copia para que el
 *  panel no dependa de la carpeta de la web. */
export function slugDeEvento(nombre = '') {
  const limpio = String(nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (limpio.length <= 70) return limpio || 'nota';
  const corte = limpio.slice(0, 70);
  const ultimo = corte.lastIndexOf('-');
  return (ultimo > 20 ? corte.slice(0, ultimo) : corte).replace(/-+$/, '');
}

/** La dirección que va a tener el evento en la web (una vez que GitHub corra). */
export function enlaceEnLaWeb(ev) {
  return `${SITIO}/agenda/${ev.slug || slugDeEvento(ev.nombre)}-${String(ev.id).replace(/[^A-Za-z0-9]/g, '')}`;
}

// ------------------------------------------------------------ cargar a mano

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

function fechaValida(f) {
  if (!FECHA.test(f)) return false;
  const d = new Date(`${f}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f;
}

const linea = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max) || null;

function parrafos(v, max) {
  const t = String(v ?? '').replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  return t.slice(0, max) || null;
}

function direccionWeb(v, campo) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\/[^\s]+$/i.test(s)) throw new Error(`${campo}: tiene que empezar con http:// o https://`);
  return s;
}

/** "2026-10-15" (+ "20:30") → "2026-10-15 20:30:00", como los del municipio. */
function unir(fecha, hora) {
  return hora ? `${fecha} ${hora}:00` : fecha;
}

/**
 * Un evento cargado desde el panel, validado. Tira un error con un mensaje
 * para mostrar tal cual si falta algo o está mal escrito.
 *
 * @param {object} d  lo que llegó del formulario
 * @param {{ quien: string, ahora?: Date, contactos?: object[], anuales?: object[], categorias?: object }} o
 */
export function nuevoEventoManual(d = {}, {
  quien, ahora = new Date(), contactos = [], anuales = [], categorias = {},
} = {}) {
  const nombre = linea(d.nombre, 140);
  if (!nombre) throw new Error('Falta el nombre del evento.');
  const fecha = String(d.fecha ?? '').trim();
  if (!fechaValida(fecha)) throw new Error('La fecha va así: 2026-10-15.');
  const hora = String(d.hora ?? '').trim();
  if (hora && !HORA.test(hora)) throw new Error('La hora va así: 20:30.');
  const fechaHasta = String(d.fechaHasta ?? '').trim();
  if (fechaHasta && !fechaValida(fechaHasta)) throw new Error('La fecha de fin va así: 2026-10-16.');
  const horaHasta = String(d.horaHasta ?? '').trim();
  if (horaHasta && !HORA.test(horaHasta)) throw new Error('La hora de fin va así: 23:00.');

  const desde = unir(fecha, hora);
  const hasta = fechaHasta || horaHasta ? unir(fechaHasta || fecha, horaHasta) : null;
  if (hasta && hasta.slice(0, 16) < desde.slice(0, 16)) throw new Error('El final queda antes del comienzo.');

  const contacto = contactos.find((c) => c.id === d.contactoId) ?? null;
  const anual = anuales.find((a) => a.id === d.anualId) ?? null;

  const ev = {
    id: `manual-${ahora.getTime()}`,
    slug: slugDeEvento(nombre),
    nombre,
    categoria: Object.hasOwn(categorias, d.categoria) ? d.categoria : 'oficial',
    desde,
    hasta,
    todoElDia: !hora,
    lugar: linea(d.lugar, 120),
    direccion: linea(d.direccion, 160),
    localidad: linea(d.localidad, 60),
    costo: linea(d.costo, 80),
    organizador: linea(d.organizador, 120) ?? (contacto ? contacto.quien : null),
    organizadorUrl: direccionWeb(d.organizadorUrl, 'La página del organizador'),
    web: direccionWeb(d.web, 'La página de entradas o del evento'),
    descripcion: parrafos(d.descripcion, 2000),
    anualId: anual?.id ?? null,
    // Privado: se queda en el panel. De qué contacto de la base vino, y quién
    // avisó (nombre, teléfono) para volver a preguntar.
    contactoId: contacto?.id ?? null,
    avisoPor: linea(d.avisoPor ?? d.fuente, 200),
    estado: 'borrador',
    cargadoPor: quien ?? null,
    cargadoCuando: ahora.toISOString(),
  };
  return d.publicar ? publicarEvento(ev, { quien, ahora }) : ev;
}

/** Publicar: desde acá la web le arma su página en la próxima corrida. */
export function publicarEvento(ev, { quien, ahora = new Date() } = {}) {
  return {
    ...ev, estado: 'publicado', publicadoPor: quien ?? null, publicadoCuando: ahora.toISOString(),
  };
}

/** Sacar de la web: vuelve a borrador y su página deja de existir. */
export function despublicarEvento(ev, { quien, ahora = new Date() } = {}) {
  const { publicadoPor, publicadoCuando, ...resto } = ev;
  return {
    ...resto, estado: 'borrador', despublicadoPor: quien ?? null, despublicadoCuando: ahora.toISOString(),
  };
}

/** Cuándo termina, para dejar de exportarlo: el final de su último día. */
function terminaEl(ev) {
  const f = String(ev.hasta || ev.desde || '').slice(0, 10);
  return FECHA.test(f) ? Date.parse(`${f}T23:59:59-03:00`) : NaN;
}

/**
 * Lo que va a web/data/eventos-panel.json: sólo lo publicado, sólo los
 * campos públicos. Los eventos cargados antes del 25/09 no tienen estado:
 * quedan como borrador hasta que alguien los publique.
 */
export function eventosParaLaWeb(eventos = [], ahora = new Date(), dias = DIAS_EXPORTADO) {
  const corte = ahora.getTime() - dias * 24 * 3600e3;
  return eventos
    .filter((e) => e.estado === 'publicado')
    .filter((e) => !(terminaEl(e) < corte))
    .map((e) => {
      const r = { fuente: 'Radar Balcarce' };
      for (const c of CAMPOS_PUBLICOS) if (e[c] !== undefined && e[c] !== null && e[c] !== '') r[c] = e[c];
      return r;
    })
    .sort((a, b) => String(a.desde).localeCompare(String(b.desde)));
}

// ------------------------------------------------------------ los contactos

/** Los meses (1-12) que caen entre hoy y dentro de `dias`, en Balcarce. */
export function mesesQueVienen(ahora = new Date(), dias = DIAS_ADELANTE) {
  const meses = new Set();
  // Balcarce es UTC-3 todo el año: se corre el reloj y se leen los meses UTC.
  const base = ahora.getTime() - 3 * 3600e3;
  for (let i = 0; i <= dias; i += 1) meses.add(new Date(base + i * 24 * 3600e3).getUTCMonth() + 1);
  return meses;
}

/** Un número de WhatsApp tal como lo pide wa.me: sólo dígitos, con el 54. */
export function numeroDeWhatsApp(n) {
  const d = String(n ?? '').replace(/\D/g, '');
  return /^54\d{8,12}$/.test(d) ? d : null;
}

export function enlaceWhatsApp(numero, mensaje) {
  const n = numeroDeWhatsApp(numero);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje ?? '')}` : null;
}

export function enlaceMail(mail, mensaje) {
  const m = String(mail ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) return null;
  const asunto = 'Agenda de eventos · Radar Balcarce';
  return `mailto:${m}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje ?? '')}`;
}

const diasDesde = (iso, ahora) => (iso ? Math.floor((ahora.getTime() - new Date(iso).getTime()) / 86400000) : null);

/**
 * Los contactos con lo que el panel necesita para mostrarlos: cuándo se les
 * escribió, si respondieron, si toca escribirles, el mensaje ya armado y los
 * enlaces para mandarlo. NADA se manda solo: el enlace abre WhatsApp o el
 * correo con el texto puesto, y lo manda una persona desde la cuenta de
 * Radar.
 *
 * `aEscribirEsteMes`: suelen tener eventos en los próximos 45 días y hace más
 * de 30 que no se les escribe (o nunca).
 */
export function estadoDeContactos(contactos = [], {
  contactadoEl = {}, respondioEl = {}, ahora = new Date(), mensaje = () => '',
} = {}) {
  const meses = mesesQueVienen(ahora);
  // Varios contactos comparten canal: el autódromo, la Fiesta del Postre y la
  // de la Papa Frita publican el WhatsApp de Turismo. Un mensaje a ese número
  // vale para todos: si se le escribió a uno, a los otros no les toca de nuevo.
  const llaves = (c) => [
    numeroDeWhatsApp(c.canales?.whatsapp) && `wa:${numeroDeWhatsApp(c.canales.whatsapp)}`,
    c.canales?.mail && `mail:${String(c.canales.mail).trim().toLowerCase()}`,
  ].filter(Boolean);
  const hermanos = (c) => contactos.filter((o) => o.id !== c.id && llaves(o).some((k) => llaves(c).includes(k)));
  const masNueva = (fechas) => fechas.filter(Boolean).sort().at(-1) ?? null;
  return contactos.map((c) => {
    const grupo = [c, ...hermanos(c)];
    const ultimo = masNueva(grupo.map((o) => contactadoEl[o.id]));
    const respondio = masNueva(grupo.map((o) => respondioEl[o.id]));
    const dias = diasDesde(ultimo, ahora);
    const tocaEscribir = dias === null || dias >= DIAS_ENTRE_MENSAJES;
    const texto = mensaje(c);
    return {
      ...c,
      ultimoContacto: ultimo,
      diasSinContacto: dias,
      respondioEl: respondio,
      // Respondió a ESTE pedido: después del último mensaje (o sin mensaje anotado).
      respondio: !!respondio && (!ultimo || respondio >= ultimo),
      tocaEscribir,
      enTemporada: (c.meses ?? []).some((m) => meses.has(m)),
      aEscribirEsteMes: tocaEscribir && (c.meses ?? []).some((m) => meses.has(m)),
      compartenCanal: grupo.slice(1).map((o) => o.quien),
      mensaje: texto,
      whatsappUrl: enlaceWhatsApp(c.canales?.whatsapp, texto),
      mailUrl: enlaceMail(c.canales?.mail, texto),
    };
  });
}
