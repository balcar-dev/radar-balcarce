// Tablero de Radar Balcarce — corre en tu PC, sin cuentas ni internet más que
// para leer las fuentes.
//   node panel/servidor.mjs
// Después abrí http://localhost:4321

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ingestar, traer, parsearFeed, TODAS_LAS_FUENTES } from '../ingesta/ingesta.mjs';
import {
  agendaCompleta, CATEGORIAS as CATEGORIAS_AGENDA, CALENDARIO_ANUAL,
  CONTACTOS as CONTACTOS_AGENDA, mensajeAgenda,
} from '../ingesta/agenda.mjs';
import { NUMEROS, tocaHoy, diaDeEstaSemana } from '../ingesta/utiles.mjs';
import { reescribirConRespaldo, INSTRUCCION_EDITORIAL } from '../reels/reescritura.mjs';
import { spawn } from 'node:child_process';
import { clave as claveGemini } from '../reels/voz-gemini.mjs';
import {
  sesionDe, entrar, salir, paginaLogin, hayUsuarios,
} from './acceso.mjs';
import { TIPOS as TIPOS_BUZON, ESTADOS_SEGUIMIENTO } from './buzon.mjs';
import { horariosDe, guardarHorario, DIAS as DIAS_SEMANA } from './horarios.mjs';
import { estadoCuota as estadoCuotaVoz } from '../reels/voz-gemini.mjs';
import { guionNoticia } from '../reels/plan.mjs';

const AQUI = import.meta.dirname;
const DATOS = path.join(AQUI, 'datos');
const F_ESTADO = path.join(DATOS, 'estado.json');
const F_ULTIMA = path.join(DATOS, 'ultima.json');
const F_AGENDA = path.join(DATOS, 'agenda.json');
const PUERTO = 4321;

// El respaldo mecánico de la reescritura: lo que ya se mostraba antes de que
// existiera la IA. reescribirConRespaldo cae acá si Gemini falla.
function mecanico(nota) {
  return {
    titulo: nota.titulo,
    copete: nota.copete || nota.resumenFuente || '',
    guion: guionNoticia(nota),
  };
}

fs.mkdirSync(DATOS, { recursive: true });

// --------------------------------------------------------------- estado

function leerJson(archivo, porDefecto) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

function guardarJson(archivo, datos) {
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
  // Cada vez que cambia el estado se exportan las decisiones al repo. Son lo
  // único del panel que la web necesita y que no se puede deducir sola: qué
  // se publicó a mano, qué se descartó, y el texto que se corrigió.
  if (archivo === F_ESTADO) exportarDecisiones(datos);
}

// El archivo que lee la web cuando se genera fuera de esta PC (GitHub
// Actions). Va versionado a propósito — no tiene nada secreto, y es lo que
// permite que el sitio se actualice solo con la computadora apagada.
const F_DECISIONES = path.join(AQUI, '..', 'web', 'data', 'decisiones.json');

function exportarDecisiones(estado) {
  try {
    // Sólo lo que la web usa. El historial, el buzón y los contactos se
    // quedan acá: tienen datos de gente que nos escribió.
    const decisiones = {};
    for (const [id, d] of Object.entries(estado.decisiones ?? {})) {
      decisiones[id] = {
        estado: d.estado,
        titulo: d.titulo ?? null,
        copete: d.copete ?? null,
        guion: d.guion ?? null,
        deIA: d.deIA ?? null,
        por: d.por ?? null,
        cuando: d.cuando ?? null,
      };
    }
    fs.mkdirSync(path.dirname(F_DECISIONES), { recursive: true });
    fs.writeFileSync(F_DECISIONES, JSON.stringify({
      exportado: new Date().toISOString(),
      decisiones,
      horarios: estado.horarios ?? {},
    }, null, 2), 'utf8');
  } catch (e) {
    console.error('  no se pudieron exportar las decisiones:', e.message);
  }
}

function deCodigo(f) {
  return {
    id: f.id,
    nombre: f.nombre,
    medio: f.medio,
    url: f.url,
    tipo: f.tipo,
    alcance: f.alcance,
    seccion: f.seccion ?? null,
    temas: f.temas ?? [],
    peso: f.peso,
    maxItems: f.maxItems ?? null,
    oficial: !!f.oficial,
    activa: true,
    nota: f.nota ?? '',
  };
}

// La lista de fuentes sale del código la primera vez, y desde ahí manda este
// archivo (el panel la edita). Pero si el código suma una fuente nueva más
// adelante —como pasó acá mismo con La Vanguardia y Sendero Regional—, no
// hay que perderla: en cada arranque se agrega lo que falte, sin tocar lo
// que ya estaba (peso ajustado a mano, pausada, etc.).
const estado = leerJson(F_ESTADO, null) ?? {
  decisiones: {}, fuentes: [], historial: [], eventosManual: [], contactadoEl: {}, buzon: [],
};
estado.eventosManual ??= [];
estado.contactadoEl ??= {}; // { [contactoId]: fecha ISO del último mensaje }
estado.buzon ??= []; // envíos de la gente: datos, reclamos, opinión, seguimiento
if (!estado.fuentes.length) {
  estado.fuentes = TODAS_LAS_FUENTES.map(deCodigo);
} else {
  const yaEstan = new Set(estado.fuentes.map((f) => f.id));
  const nuevas = TODAS_LAS_FUENTES.filter((f) => !yaEstan.has(f.id)).map(deCodigo);
  if (nuevas.length) {
    estado.fuentes.push(...nuevas);
    estado.historial ??= [];
    estado.historial.unshift({
      cuando: new Date().toISOString(), accion: 'fuentes nuevas del código',
      detalle: nuevas.map((f) => f.nombre).join(', '), quien: 'sistema',
    });
  }
  // Los temas también se actualizan solos si se editaron en fuentes.mjs,
  // porque eso no es algo que se cambie desde el panel.
  for (const f of estado.fuentes) {
    const enCodigo = TODAS_LAS_FUENTES.find((x) => x.id === f.id);
    if (enCodigo?.temas) f.temas = enCodigo.temas;
  }
}
guardarJson(F_ESTADO, estado);

let ultima = leerJson(F_ULTIMA, null);
let agenda = leerJson(F_AGENDA, null);
let corriendo = false;

async function actualizarAgenda() {
  try {
    agenda = await agendaCompleta();
    guardarJson(F_AGENDA, agenda);
  } catch (e) {
    console.error('  agenda con error:', e.message);
  }
}

function anotar(accion, detalle, quien) {
  estado.historial.unshift({ cuando: new Date().toISOString(), accion, detalle, quien });
  estado.historial = estado.historial.slice(0, 200);
}

// Cuánto puede quedar una nota esperando decisión antes de archivarse sola.
// Tres días: pasado eso no es noticia, y si igual vale la pena, va a volver
// a aparecer cuando algún medio la retome.
const HORAS_PARA_ARCHIVAR = 72;

function esVieja(n) {
  // Las que llegan sin fecha real (los scrapers de portada) no se archivan
  // por tiempo: no sabemos cuándo salieron, y descartarlas por las dudas
  // sería tirar notas buenas.
  if (!n.fecha || n.cuando === 'sin fecha en la fuente') return false;
  const horas = (Date.now() - new Date(n.fecha).getTime()) / 3600000;
  return horas > HORAS_PARA_ARCHIVAR;
}

function estadoPorDefecto(n) {
  if (n.semaforo === 'rojo') return 'bloqueada';
  // Una verde vieja tampoco se publica sola: si el ciclo estuvo caído dos
  // días, no queremos que al volver salga de golpe el clima del martes.
  if (esVieja(n)) return 'archivada';
  if (n.semaforo === 'verde') return 'automatica';
  return 'pendiente';
}

// Mezcla lo que trajo la ingesta con las decisiones ya tomadas.
function vista(sesion = null) {
  const notas = (ultima?.notas ?? []).map((n) => {
    const d = estado.decisiones[n.id];
    return {
      ...n,
      titulo: d?.titulo ?? n.titulo,
      copete: d?.copete ?? n.resumenFuente,
      guion: d?.guion ?? null,
      deIA: d?.deIA ?? null,
      // Sin decisión tomada manda el semáforo: la verde sale sola, la roja
      // queda bloqueada y sólo la amarilla espera a que alguien la mire.
      // Y si nadie la miró en 72 horas, se archiva sola: una noticia de
      // hace tres días ya no es noticia, y dejarla en la cola sólo hace que
      // la cola crezca hasta volverse inmirable.
      estado: d?.estado ?? estadoPorDefecto(n),
      decidioQuien: d?.por ?? null,
      decidioCuando: d?.cuando ?? null,
      archivadaPorTiempo: !d && esVieja(n),
    };
  });
  return {
    generado: ultima?.generado ?? null,
    corriendo,
    yo: sesion?.nombre ?? null,
    notas,
    fuentes: estado.fuentes.map((f) => ({
      ...f,
      ultimo: ultima?.fuentes?.find((x) => x.id === f.id) ?? null,
    })),
    clima: ultima?.clima ?? null,
    farmacias: ultima?.farmacias ?? null,
    agenda: agenda ?? null,
    categoriasAgenda: CATEGORIAS_AGENDA,
    calendarioAnualCompleto: CALENDARIO_ANUAL.map((e) => ({ nombre: e.nombre, categoria: e.categoria, mesAproximado: e.mesAproximado })),
    contactosAgenda: CONTACTOS_AGENDA.map((c) => {
      const ultimo = estado.contactadoEl[c.id] ?? null;
      const dias = ultimo ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000) : null;
      return {
        ...c,
        ultimoContacto: ultimo,
        diasSinContacto: dias,
        // Se sugiere reescribirle pasados 30 días, no antes: es un pedido
        // mensual, no una cadena de mensajes.
        tocaEscribir: dias === null || dias >= 30,
        mensaje: mensajeAgenda({ quien: c.quien.split(' (')[0] }),
      };
    }),
    eventosManual: estado.eventosManual,
    buzon: estado.buzon,
    tiposBuzon: TIPOS_BUZON,
    estadosSeguimiento: ESTADOS_SEGUIMIENTO,
    utiles: { numeros: NUMEROS, diaDeLaSemana: diaDeEstaSemana(), tocaHoy: tocaHoy() },
    horarios: horariosDe(estado),
    ultimaPublicacion: estado.ultimaPublicacion ?? null,
    piezas: piezasListas(),
    diasSemana: DIAS_SEMANA,
    cuotaVoz: estadoCuotaVoz(),
    instruccionEditorial: INSTRUCCION_EDITORIAL,
    historial: estado.historial.slice(0, 12),
  };
}

/** La lista de fuentes con la que se sale a buscar: el objeto completo del
 *  código, con el peso y el estado de pausa que se hayan tocado en el panel.
 *  Una fuente que el panel borró no vuelve. */
function fuentesParaIngestar() {
  return TODAS_LAS_FUENTES
    .filter((f) => estado.fuentes.some((g) => g.id === f.id))
    .map((f) => {
      const guardada = estado.fuentes.find((g) => g.id === f.id);
      return { ...f, peso: guardada.peso ?? f.peso, activa: guardada.activa !== false };
    });
}

// Cuántas se reescriben en cada ciclo. El ciclo es cada 10 minutos, así que
// 12 por vuelta son unas 70 por hora: bastante más de lo que Balcarce publica
// en un día entero, y sin vaciar el cupo gratis de golpe.
const REESCRITURAS_POR_CICLO = 12;

// Si la IA falla tres veces seguidas, se corta y se sigue en el próximo ciclo.
// Cuando Gemini está saturado falla para todas por igual, y lo único que se
// consigue insistiendo es llenar el historial de errores.
const FALLOS_PARA_CORTAR = 3;

/** Reescribe sola lo que va a salir sin que nadie lo mire.
 *
 *  Sólo toca las verdes: son las que se publican automáticamente, así que
 *  son justamente las que nadie va a corregir a mano. Lo amarillo espera
 *  aprobación y ahí ya hay un humano que puede apretar el botón.
 *
 *  Nunca pisa algo que escribió una persona: si la decisión guardada no vino
 *  de la IA, se respeta. Y el estado que deja es el que la nota habría tenido
 *  igual (estadoPorDefecto), para no cambiar sin querer qué se publica. */
async function reescribirPendientes() {
  if (!claveGemini()) return;

  const cola = (ultima?.notas ?? [])
    .filter((n) => n.semaforo === 'verde')
    .filter((n) => {
      const d = estado.decisiones[n.id];
      if (!d) return true;              // sin tocar: se reescribe
      if (d.deIA) return false;         // ya la reescribió la IA
      if (d.por && d.por !== 'ia') return false; // la tocó una persona
      return !d.guion;
    })
    .filter((n) => !esVieja(n))
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, REESCRITURAS_POR_CICLO);

  if (!cola.length) return;

  let hechas = 0;
  let fallos = 0;
  for (const nota of cola) {
    const r = await reescribirConRespaldo({ ...nota, copete: nota.resumenFuente }, mecanico);
    if (!r.deIA) {
      fallos += 1;
      if (fallos >= FALLOS_PARA_CORTAR) break;
      continue; // se deja como estaba y se reintenta en el próximo ciclo
    }
    const previo = estado.decisiones[nota.id] ?? {};
    estado.decisiones[nota.id] = {
      ...previo,
      estado: previo.estado ?? estadoPorDefecto(nota),
      titulo: r.titulo,
      copete: r.copete,
      guion: r.guion,
      deIA: true,
      por: 'ia',
      cuando: new Date().toISOString(),
    };
    hechas += 1;
  }

  if (hechas || fallos) {
    guardarJson(F_ESTADO, estado);
    console.log(`  reescritas ${hechas}${fallos ? ` · ${fallos} sin poder` : ''}`);
  }
  if (hechas) {
    anotar(`reescribió ${hechas} ${hechas === 1 ? 'nota' : 'notas'} automáticas`, '', 'ia');
    guardarJson(F_ESTADO, estado);
  }
}

// --------------------------------------------------- las piezas para redes

const CARPETA_PIEZAS = path.join(AQUI, '..', 'reels', 'salida');

/** Los videos y placas que generó el plan del día, para poder bajarlos
 *  desde el celular en vez de tener que sentarse en la PC.
 *
 *  Sólo las de las últimas 24 horas: lo de ayer ya no se publica, y la
 *  carpeta acumula todo lo que se fue generando. */
function piezasListas() {
  try {
    const hace24h = Date.now() - 24 * 3600 * 1000;
    return fs.readdirSync(CARPETA_PIEZAS)
      .filter((f) => /[.](mp4|png)$/i.test(f))
      // Las de revisión, prueba y las verticales de respaldo no son para publicar.
      .filter((f) => !/^(rev-|prueba-|v-|iconos|avatar)/.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(CARPETA_PIEZAS, f));
        return { archivo: f, bytes: st.size, cuando: st.mtime.toISOString() };
      })
      .filter((x) => new Date(x.cuando).getTime() > hace24h)
      .sort((a, b) => new Date(b.cuando) - new Date(a.cuando));
  } catch { return []; }
}

// ------------------------------------------------------ publicar la web

// Cada cuánto se publica solo lo que el panel decidió. Dos horas: las
// noticias no cambian tanto, y cada publicación compila el sitio entero.
const HORAS_ENTRE_PUBLICACIONES = 2;
const F_LOG_PUBLICACION = path.join(DATOS, 'publicaciones.log');

/** Publica la web: regenera los datos, compila y sube a Vercel.
 *
 *  Esto vivía en una tarea del Programador de Windows, y no funcionaba: la
 *  tarea corre con un entorno distinto y la CLI de Vercel no encontraba la
 *  sesión guardada ("No existing credentials found"). Desde acá sí la
 *  encuentra, porque el panel se arranca desde la sesión del usuario.
 *
 *  Y además tiene sentido que viva acá: si el panel está apagado, los datos
 *  no se actualizan, así que publicar no tendría nada nuevo que mostrar. */
let publicando = false;

function publicarWeb() {
  // Sin este cerrojo las publicaciones se apilan: compilar y subir puede
  // tardar varios minutos, y si entra la siguiente antes de que termine la
  // anterior quedan dos deploys peleándose por el mismo proyecto.
  if (publicando) { console.log('  ya hay una publicación en curso, se saltea'); return Promise.resolve(); }
  publicando = true;

  const raiz = path.join(AQUI, '..');
  const web = path.join(raiz, 'web');
  const anotarLinea = (t) => fs.appendFileSync(F_LOG_PUBLICACION, t, 'utf8');
  anotarLinea(`
===== ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} =====
`);

  const pasos = [
    { que: 'generar los datos', cmd: 'npm', args: ['run', 'datos'], donde: web },
    { que: 'compilar el sitio', cmd: 'npm', args: ['run', 'build'], donde: web },
    { que: 'publicar en Vercel', cmd: 'npx', args: ['--no-install', 'vercel', '--prod', '--yes'], donde: web },
  ];

  const correr = ({ que, cmd, args, donde }) => new Promise((listo, falla) => {
    // shell: true porque en Windows npm y npx son .cmd, no ejecutables.
    const p = spawn(cmd, args, { cwd: donde, shell: true });
    p.stdout.on('data', (d) => anotarLinea(d.toString()));
    p.stderr.on('data', (d) => anotarLinea(d.toString()));
    p.on('close', (codigo) => (codigo === 0 ? listo() : falla(new Error(`falló al ${que} (código ${codigo})`))));
    p.on('error', (e) => falla(new Error(`no se pudo ${que}: ${e.message}`)));
  });

  return (async () => {
    try {
      for (const paso of pasos) await correr(paso);
      anotarLinea('----- publicado bien -----\n');
      console.log('  web publicada');
      estado.ultimaPublicacion = { cuando: new Date().toISOString(), ok: true, error: null };
      anotar('la web se publicó sola', '', 'sistema');
      guardarJson(F_ESTADO, estado);
    } catch (e) {
      anotarLinea(`----- ${e.message} -----\n`);
      console.error(`  no se pudo publicar: ${e.message}`);
      // Queda registrado para que el panel lo muestre en rojo. El 18/09 la
      // publicación estuvo siete horas fallando y lo único que lo decía era
      // un archivo de registro que nadie mira.
      estado.ultimaPublicacion = { cuando: new Date().toISOString(), ok: false, error: e.message };
      anotar('la web NO se pudo publicar', e.message.slice(0, 80), 'sistema');
      guardarJson(F_ESTADO, estado);
    } finally {
      publicando = false;
    }
  })();
}

async function correrIngesta() {
  if (corriendo) return;
  corriendo = true;
  try {
    // Se ingesta con la definición del CÓDIGO y sólo se le pisan encima las
    // tres cosas que el panel deja editar (peso, pausada, nota). El estado
    // guardado no alcanza: no guarda `base` ni `patronEnlace`, que es lo que
    // el raspador necesita para armar el enlace de cada nota — sin eso, las
    // de El Diario salían apuntando a "undefined/...".
    ultima = await ingestar({ fuentes: fuentesParaIngestar(), silencioso: true });
    guardarJson(F_ULTIMA, ultima);
    const nuevas = ultima.notas.filter((n) => !estado.decisiones[n.id]).length;
    console.log(`  ciclo ok · ${ultima.notas.length} historias · ${nuevas} sin decidir`);
    // Lo que va a salir solo se escribe solo. Va después de guardar la
    // ingesta: si la reescritura falla, las notas ya están.
    await reescribirPendientes();
  } catch (e) {
    console.error('  ciclo con error:', e.message);
  } finally {
    corriendo = false;
  }
}

// ----------------------------------------------------------------- servidor

function json(res, datos, codigo = 200) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8' });
  res.end(cuerpo);
}

async function cuerpoDe(req) {
  const trozos = [];
  for await (const t of req) trozos.push(t);
  try { return JSON.parse(Buffer.concat(trozos).toString('utf8')); } catch { return {}; }
}

function html(res, texto, codigo = 200) {
  res.writeHead(codigo, { 'content-type': 'text/html; charset=utf-8' });
  res.end(texto);
}

/** El formulario del login viaja como formulario de toda la vida, no como
 *  JSON: así la pantalla de entrada funciona sin una línea de JavaScript. */
async function formularioDe(req) {
  const trozos = [];
  for await (const t of req) trozos.push(t);
  const datos = new URLSearchParams(Buffer.concat(trozos).toString('utf8'));
  return Object.fromEntries(datos);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname;

  try {
    // ---------------------------------------------------------- la puerta
    //
    // Todo lo de abajo necesita sesión. Antes no: el panel escuchaba en
    // todas las interfaces sin contraseña, así que cualquiera en la misma
    // red podía publicar o descartar noticias. Ahora que lo van a abrir
    // para entrar desde afuera, eso no puede seguir así.
    if (ruta === '/login') {
      if (!hayUsuarios()) { html(res, paginaLogin({ sinUsuarios: true })); return; }
      if (req.method === 'POST') {
        const datos = await formularioDe(req);
        const r = entrar(datos, req);
        if (!r.ok) { html(res, paginaLogin({ error: r.error }), 401); return; }
        res.writeHead(302, { 'set-cookie': r.cookie, location: '/' });
        res.end();
        return;
      }
      html(res, paginaLogin());
      return;
    }

    if (ruta === '/salir') {
      res.writeHead(302, { 'set-cookie': salir(req), location: '/login' });
      res.end();
      return;
    }

    const sesion = sesionDe(req);
    if (!sesion) {
      // A la API se le contesta 401 y no una redirección: el panel corre en
      // el navegador y necesita saber que se le venció la sesión para
      // mandar a iniciarla de nuevo, no recibir el HTML del login como si
      // fuera la respuesta de la API.
      if (ruta.startsWith('/api/')) { json(res, { error: 'sesión vencida' }, 401); return; }
      res.writeHead(302, { location: '/login' });
      res.end();
      return;
    }

    if (ruta === '/' || ruta === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(AQUI, 'panel.html')));
      return;
    }

    if (ruta === '/api/estado') { json(res, vista(sesion)); return; }

    if (ruta === '/api/actualizar' && req.method === 'POST') {
      await correrIngesta();
      json(res, vista(sesion));
      return;
    }

    if (ruta === '/api/agenda/actualizar' && req.method === 'POST') {
      await actualizarAgenda();
      json(res, vista(sesion));
      return;
    }

    // El buzón: lo que manda la gente. Mientras no haya web ni WhatsApp
    // propio, se carga acá a mano (igual que los eventos) cada vez que algo
    // llega por otro canal — pero el campo queda listo para conectar un
    // formulario público o un número de WhatsApp el día que existan.
    if (ruta === '/api/buzon' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      if (d.accion === 'agregar') {
        if (!d.texto || !d.tipo) { json(res, { error: 'falta el texto o el tipo' }, 400); return; }
        estado.buzon.unshift({
          id: `buzon-${Date.now()}`,
          tipo: d.tipo,
          texto: d.texto,
          contactoNombre: d.contactoNombre || null,
          contactoTelefono: d.contactoTelefono || null,
          anonimo: !!d.anonimo,
          // El seguimiento usa este campo para su estado propio; el resto
          // usa un estado más simple de cola editorial.
          estado: d.tipo === 'seguimiento' ? 'pendiente' : 'nuevo',
          respuestaOtraParte: null,
          cargadoPor: sesion.nombre,
          cargadoCuando: new Date().toISOString(),
        });
        anotar(`buzón: ${TIPOS_BUZON[d.tipo]?.nombre ?? d.tipo} recibido`, d.texto.slice(0, 70), sesion.nombre);
      }
      if (d.accion === 'estado') {
        const item = estado.buzon.find((x) => x.id === d.id);
        if (item) { item.estado = d.estado; anotar('buzón: cambio de estado', `${item.texto.slice(0, 50)} → ${d.estado}`, sesion.nombre); }
      }
      if (d.accion === 'respuesta') {
        // La respuesta de la otra parte en un reclamo: es lo que habilita
        // publicarlo. Sin esto, un reclamo no debería salir nunca.
        const item = estado.buzon.find((x) => x.id === d.id);
        if (item) { item.respuestaOtraParte = d.respuesta; anotar('buzón: se sumó la respuesta de la otra parte', item.texto.slice(0, 50), sesion.nombre); }
      }
      if (d.accion === 'borrar') {
        estado.buzon = estado.buzon.filter((x) => x.id !== d.id);
        anotar('buzón: eliminado', d.id, sesion.nombre);
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Registrar que se le mandó el mensaje mensual a un contacto de la
    // agenda: sólo lleva la cuenta de cuándo, no manda nada — el mensaje se
    // copia y se pega a mano en WhatsApp, esto es apenas el recordatorio.
    if (ruta === '/api/agenda/contactado' && req.method === 'POST') {
      const { id } = await cuerpoDe(req);
      const quien = sesion.nombre;
      const c = CONTACTOS_AGENDA.find((x) => x.id === id);
      if (!c) { json(res, { error: 'no existe ese contacto' }, 404); return; }
      estado.contactadoEl[id] = new Date().toISOString();
      anotar('agenda: mensaje mensual enviado', c.quien, quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Cargar un evento a mano: para cuando alguien avisa por WhatsApp, por
    // teléfono o en la calle, y no está esperando a que lo suba el municipio.
    if (ruta === '/api/evento' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      if (d.accion === 'agregar') {
        if (!d.nombre || !d.fecha) { json(res, { error: 'falta nombre o fecha' }, 400); return; }
        estado.eventosManual.push({
          id: `manual-${Date.now()}`,
          nombre: d.nombre,
          categoria: d.categoria || 'oficial',
          desde: d.fecha,
          hasta: d.fechaHasta || null,
          lugar: d.lugar || null,
          fuente: d.fuente || 'cargado a mano',
          cargadoPor: sesion.nombre,
          cargadoCuando: new Date().toISOString(),
        });
        anotar('evento cargado a mano', `${d.nombre} · ${d.fecha}`, sesion.nombre);
      }
      if (d.accion === 'borrar') {
        estado.eventosManual = estado.eventosManual.filter((e) => e.id !== d.id);
        anotar('evento manual borrado', d.id, sesion.nombre);
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Reescribe una nota con IA (línea editorial + Gemini) y guarda el
    // resultado como si fuera una edición manual, para que quede igual de
    // editable después. Si Gemini falla, cae al armado mecánico y lo dice.
    if (ruta === '/api/reescribir' && req.method === 'POST') {
      const { id } = await cuerpoDe(req);
      const quien = sesion.nombre;
      const nota = ultima?.notas?.find((n) => n.id === id);
      if (!nota) { json(res, { error: 'no existe esa nota' }, 404); return; }

      const previo = estado.decisiones[id] ?? {};
      const r = await reescribirConRespaldo(
        { ...nota, copete: previo.copete ?? nota.resumenFuente },
        mecanico,
      );
      estado.decisiones[id] = {
        ...previo,
        estado: previo.estado ?? estadoPorDefecto(nota),
        titulo: r.titulo,
        copete: r.copete,
        guion: r.guion,
        deIA: r.deIA,
        por: quien,
        cuando: new Date().toISOString(),
      };
      anotar(r.deIA ? 'reescrita por IA' : `reescritura: la IA falló (${r.motivoRespaldo}), quedó la mecánica`, nota.titulo, quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Bajar una pieza. El nombre se valida contra la lista real en vez de
    // limpiarlo con expresiones: así no hay forma de pedir un archivo de
    // otra carpeta por más que se escriba "../" en la dirección.
    if (ruta.startsWith('/pieza/')) {
      const pedido = decodeURIComponent(ruta.slice('/pieza/'.length));
      if (!piezasListas().some((x) => x.archivo === pedido)) {
        json(res, { error: 'no existe esa pieza' }, 404);
        return;
      }
      const archivo = path.join(CARPETA_PIEZAS, pedido);
      res.writeHead(200, {
        'content-type': pedido.endsWith('.mp4') ? 'video/mp4' : 'image/png',
        'content-disposition': `attachment; filename="${pedido}"`,
        'content-length': fs.statSync(archivo).size,
      });
      fs.createReadStream(archivo).pipe(res);
      return;
    }

    // Cuándo salen las historias fijas. Es lo que más se va a querer
    // ajustar cuando vean qué hora rinde, así que se cambia acá y no
    // tocando código.
    if (ruta === '/api/horarios' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      try {
        const lista = guardarHorario(estado, d);
        anotar('horario de historia fija', `${d.id}`, sesion.nombre);
        guardarJson(F_ESTADO, estado);
        json(res, { ...vista(sesion), horarios: lista });
      } catch (e) {
        json(res, { error: e.message }, 400);
      }
      return;
    }

    // Decidir sobre una nota: publicar, descartar, volver a la cola, editar.
    if (ruta === '/api/nota' && req.method === 'POST') {
      const {
        id, accion, titulo, copete, guion,
      } = await cuerpoDe(req);
      // Quién hizo esto sale de la sesión, no de lo que diga el navegador:
      // antes el panel lo mandaba en el cuerpo y era a confianza.
      const quien = sesion.nombre;
      const nota = ultima?.notas?.find((n) => n.id === id);
      if (!nota) { json(res, { error: 'no existe esa nota' }, 404); return; }

      const previo = estado.decisiones[id] ?? {};
      if (accion === 'pendiente') {
        delete estado.decisiones[id];
        anotar('devuelta a la cola', nota.titulo, quien);
      } else {
        estado.decisiones[id] = {
          ...previo,
          estado: accion === 'editar' ? (previo.estado ?? 'pendiente') : accion,
          titulo: titulo ?? previo.titulo,
          copete: copete ?? previo.copete,
          guion: guion ?? previo.guion,
          // Si alguien toca el texto a mano después de que la IA lo escribió,
          // deja de ser "de la IA sin tocar": queda como edición manual.
          deIA: guion && guion !== previo.guion ? false : previo.deIA,
          por: quien,
          cuando: new Date().toISOString(),
        };
        anotar(accion === 'editar' ? 'editada' : accion, titulo ?? nota.titulo, quien);
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Decidir de a montones: la primera corrida trae todo el archivo que haya
    // en las portadas, y no tiene sentido tocar cien botones.
    if (ruta === '/api/lote' && req.method === 'POST') {
      const { ids = [], accion } = await cuerpoDe(req);
      const quien = sesion.nombre;
      for (const id of ids) {
        estado.decisiones[id] = { estado: accion, por: quien, cuando: new Date().toISOString() };
      }
      anotar(`${ids.length} notas ${accion === 'descartada' ? 'archivadas' : accion}`, 'en lote', quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Probar una URL antes de sumarla como fuente.
    if (ruta === '/api/probar' && req.method === 'POST') {
      const { url: candidata } = await cuerpoDe(req);
      try {
        const xml = await traer(candidata, { timeout: 20000 });
        const notas = parsearFeed(xml, { id: 'prueba', medio: 'prueba', alcance: 'local', peso: 10 });
        if (!notas.length) { json(res, { ok: false, motivo: 'responde, pero no encuentro notas adentro' }); return; }
        const ultimaF = notas.map((n) => n.fecha).sort((a, b) => new Date(b) - new Date(a))[0];
        const horas = (Date.now() - new Date(ultimaF).getTime()) / 3600000;
        json(res, {
          ok: true,
          cantidad: notas.length,
          conImagen: notas.filter((n) => n.imagen).length,
          textoCompleto: notas.filter((n) => n.textoCompleto).length,
          frescura: horas < 48 ? `hace ${Math.round(horas)} h` : `hace ${Math.round(horas / 24)} días`,
          viva: horas < 72,
          ejemplos: notas.slice(0, 3).map((n) => n.titulo),
        });
      } catch (e) {
        json(res, { ok: false, motivo: e.message });
      }
      return;
    }

    // Alta, baja y pausa de fuentes.
    if (ruta === '/api/fuente' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      if (d.accion === 'agregar') {
        const id = (d.nombre ?? 'fuente').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || `fuente${Date.now()}`;
        if (estado.fuentes.some((f) => f.url === d.url)) { json(res, { error: 'esa URL ya está' }, 400); return; }
        estado.fuentes.push({
          id: estado.fuentes.some((f) => f.id === id) ? `${id}-${Date.now() % 1000}` : id,
          nombre: d.nombre,
          medio: d.medio || d.nombre,
          url: d.url,
          tipo: 'rss',
          alcance: d.alcance || 'local',
          seccion: d.seccion || null,
          peso: Number(d.peso) || (d.alcance === 'local' ? 25 : 8),
          maxItems: d.alcance === 'local' ? null : Number(d.maxItems) || 5,
          oficial: false,
          activa: true,
          nota: d.nota ?? '',
        });
        anotar('fuente agregada', `${d.nombre} · ${d.url}`, sesion.nombre);
      }
      if (d.accion === 'borrar') {
        estado.fuentes = estado.fuentes.filter((f) => f.id !== d.id);
        anotar('fuente borrada', d.id, sesion.nombre);
      }
      if (d.accion === 'activar') {
        const f = estado.fuentes.find((x) => x.id === d.id);
        if (f) { f.activa = !f.activa; anotar(f.activa ? 'fuente reactivada' : 'fuente pausada', f.nombre, sesion.nombre); }
      }
      if (d.accion === 'peso') {
        const f = estado.fuentes.find((x) => x.id === d.id);
        if (f) { f.peso = Math.max(1, Math.min(40, Number(d.peso) || f.peso)); anotar('peso cambiado', `${f.nombre} → ${f.peso}`, sesion.nombre); }
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    res.writeHead(404); res.end('no está');
  } catch (e) {
    json(res, { error: e.message }, 500);
  }
});

servidor.listen(PUERTO, async () => {
  console.log('\n  \x1b[1mTablero de Radar Balcarce\x1b[0m');
  console.log(`  Abrí \x1b[4mhttp://localhost:${PUERTO}\x1b[0m en el navegador`);
  console.log('  (Ctrl+C para cortar)\n');
  if (!ultima) { console.log('  primer ciclo...'); await correrIngesta(); }
  if (!agenda) { console.log('  trayendo agenda...'); await actualizarAgenda(); }
  // Cada 10 minutos, igual que va a correr en producción.
  setInterval(correrIngesta, 10 * 60 * 1000);
  // La web se publica sola cada dos horas, y una vez al arrancar (a los
  // tres minutos, para no pelearle CPU al primer ciclo de ingesta).
  setTimeout(publicarWeb, 3 * 60 * 1000);
  setInterval(publicarWeb, HORAS_ENTRE_PUBLICACIONES * 60 * 60 * 1000);
  // La agenda cambia mucho menos que las noticias: alcanza con una vez por hora.
  setInterval(actualizarAgenda, 60 * 60 * 1000);
});
