// Tablero de Radar Balcarce — corre en tu PC, sin cuentas ni internet más que
// para leer las fuentes.
//   node panel/servidor.mjs
// Después abrí http://localhost:4321

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../ingesta/json.mjs';
import { sinTildes } from '../web/lib/texto.js';
import { ingestar, traer, parsearFeed, TODAS_LAS_FUENTES } from '../ingesta/ingesta.mjs';
import {
  agendaCompleta, CATEGORIAS as CATEGORIAS_AGENDA, CALENDARIO_ANUAL,
  CONTACTOS as CONTACTOS_AGENDA, mensajeAgenda,
} from '../ingesta/agenda.mjs';
import { NUMEROS, tocaHoy, diaDeEstaSemana } from '../ingesta/utiles.mjs';
import {
  reescribirConRespaldo, INSTRUCCION_EDITORIAL, CRITERIO_EDITORIAL, completarReescritura, antecedentesDe, materialParaVerificar, sinExtras,
  reescribirAutomaticas, podarIntentos, textoCompletoDe, extrasDe,
} from '../reels/reescritura.mjs';
import { tieneCuerpo, palabrasDe, PALABRAS_MINIMAS_CUERPO } from '../web/lib/cuerpo.js';
import { claveRedaccion as claveGemini } from '../reels/claves.mjs';
import {
  sesionDe, entrar, salir, paginaLogin, hayUsuarios,
} from './acceso.mjs';
import { TIPOS as TIPOS_BUZON, ESTADOS_SEGUIMIENTO } from './buzon.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { verificar, resumirProblemas, depurarCuerpo } from '../ingesta/verificar.mjs';
import { horariosDe, guardarHorario, DIAS as DIAS_SEMANA } from './horarios.mjs';
import { guionNoticia } from '../reels/plan.mjs';
import { aplicarAviso } from './avisos.mjs';
import {
  camposEditables, decisionParaLaWeb, podarDecisiones, conTextoCorregido,
} from './notas.mjs';
import { crearSincronizador, ejecutarGit } from './sincronizar.mjs';
import { respaldar } from './respaldo.mjs';
import { origenPermitido, probarUrlPermitida } from './seguridad.mjs';
import {
  nuevoEventoManual, publicarEvento, despublicarEvento, eventosParaLaWeb, estadoDeContactos, enlaceEnLaWeb,
} from './agenda.mjs';

// Nada de reels/ que traiga paquetes instalados (ffmpeg, resvg) se importa
// arriba: el panel tiene que arrancar sólo con Node (prueba "el motor no
// necesita nada instalado"). Hasta el 25/09 se importaba reels/voz-gemini.mjs
// para mostrar la cuota de voz, que arrastraba ffmpeg-static; el tablero no
// la mostraba en ningún lado, así que se sacó. Si algún día hace falta algo
// de ahí, va con `await import()` en el momento de usarlo.

const AQUI = import.meta.dirname;
const DATOS = path.join(AQUI, 'datos');
const F_ESTADO = path.join(DATOS, 'estado.json');
const F_ULTIMA = path.join(DATOS, 'ultima.json');
const F_AGENDA = path.join(DATOS, 'agenda.json');
const PUERTO = 4321;

// Los tres espacios de publicidad de la web (ver REDES.md § 2). Va directo a
// web/data/avisos.json, el mismo archivo que lee el sitio, y se sube solo a
// GitHub (panel/sincronizar.mjs).
const F_AVISOS = path.join(AQUI, '..', 'web', 'data', 'avisos.json');

// Lo ya publicado en el sitio: de acá salen los antecedentes que recibe la IA
// al reescribir (antecedentesDe en reels/reescritura.mjs). Sólo se lee.
const F_ARCHIVO_WEB = path.join(AQUI, '..', 'web', 'data', 'archivo.json');

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

// Lo que el panel decide se sube solo a GitHub unos segundos después del
// último cambio (panel/sincronizar.mjs). Se apaga con SINCRONIZAR_GITHUB=no.
const RAIZ_REPO = path.join(AQUI, '..');
const sincronizador = crearSincronizador({
  archivos: ['web/data/decisiones.json', 'web/data/avisos.json', 'web/data/eventos-panel.json'],
  git: (args) => ejecutarGit(args, { cwd: RAIZ_REPO }),
});
// Copia de seguridad de panel/datos/ al arrancar y cada 6 horas. La carpeta
// se fija con RESPALDO_CARPETA (mejor una de Drive/OneDrive: así queda afuera
// de esta PC); si no, respaldos/ junto al proyecto. Ver panel/respaldo.mjs.
const hacerRespaldo = () => {
  try {
    respaldar({ destino: process.env.RESPALDO_CARPETA ?? path.join(AQUI, '..', 'respaldos') });
  } catch (e) {
    console.error('  no se pudo hacer el respaldo:', e.message);
  }
};
setTimeout(hacerRespaldo, 15000);
setInterval(hacerRespaldo, 6 * 3600 * 1000).unref();

const subirAGitHub = () => { if (process.env.SINCRONIZAR_GITHUB !== 'no') sincronizador.programar(); };

function guardarJson(archivo, datos) {
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
  // Cada vez que cambia el estado se exportan las decisiones al repo. Son lo
  // único del panel que la web necesita y que no se puede deducir sola: qué
  // se publicó a mano, qué se descartó, y el texto que se corrigió.
  if (archivo === F_ESTADO) { exportarDecisiones(datos); exportarEventos(datos); subirAGitHub(); }
  if (archivo === F_AVISOS) subirAGitHub();
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
    // Las de más de 60 días no se exportan: la web ya no las usa y el
    // archivo crecía sin fin (ver podarDecisiones en panel/notas.mjs).
    for (const [id, d] of Object.entries(podarDecisiones(estado.decisiones))) {
      decisiones[id] = decisionParaLaWeb(d);
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

// Los eventos que se publicaron desde la pestaña Agenda, para que la web les
// arme su página aunque la PC esté apagada (web/lib/eventos.js). Público: sólo
// lo que se ve en la web, nunca quién avisó ni su teléfono (panel/agenda.mjs).
const F_EVENTOS_WEB = path.join(AQUI, '..', 'web', 'data', 'eventos-panel.json');

function exportarEventos(estado) {
  try {
    const eventos = eventosParaLaWeb(estado.eventosManual ?? []);
    const anterior = leerJson(F_EVENTOS_WEB, null);
    // Si no cambió nada, no se toca: así no hay un commit por cada decisión.
    if (anterior && JSON.stringify(anterior.eventos) === JSON.stringify(eventos)) return;
    fs.mkdirSync(path.dirname(F_EVENTOS_WEB), { recursive: true });
    fs.writeFileSync(F_EVENTOS_WEB, `${JSON.stringify({ exportado: new Date().toISOString(), eventos }, null, 2)}\n`, 'utf8');
  } catch (e) {
    console.error('  no se pudieron exportar los eventos:', e.message);
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
estado.respondioEl ??= {}; // { [contactoId]: fecha ISO de la última respuesta }
estado.buzon ??= []; // envíos de la gente: datos, reclamos, opinión, seguimiento
delete estado.ultimaPublicacion; // de cuando el panel publicaba la web (hasta el 25/09)
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
      ...camposEditables(n, d),
      // Sin decisión tomada manda el semáforo: la verde sale sola, la roja
      // queda bloqueada y sólo la amarilla espera a que alguien la mire.
      // Y si nadie la miró en 72 horas, se archiva sola: una noticia de
      // hace tres días ya no es noticia, y dejarla en la cola sólo hace que
      // la cola crezca hasta volverse inmirable.
      estado: decisionHumana(d) ? d.estado : estadoPorDefecto(n),
      decidioQuien: d?.por ?? null,
      decidioCuando: d?.cuando ?? null,
      // ¿Tiene cuerpo de verdad? Sin cuerpo no sale sola, y publicarla a mano
      // pide una confirmación (web/lib/cuerpo.js).
      conCuerpo: tieneCuerpo(camposEditables(n, d)),
      archivadaPorTiempo: !decisionHumana(d) && esVieja(n),
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
    avisos: leerJson(F_AVISOS, {}),
    agenda: agenda ?? null,
    categoriasAgenda: CATEGORIAS_AGENDA,
    calendarioAnualCompleto: CALENDARIO_ANUAL.map((e) => ({
      id: e.id, nombre: e.nombre, categoria: e.categoria, mesAproximado: e.mesAproximado, lugar: e.lugar,
    })),
    // Se sugiere reescribirle a cada uno pasados 30 días, no antes: es un
    // pedido mensual, no una cadena de mensajes (panel/agenda.mjs).
    contactosAgenda: estadoDeContactos(CONTACTOS_AGENDA, {
      contactadoEl: estado.contactadoEl,
      respondioEl: estado.respondioEl,
      mensaje: (c) => mensajeAgenda({ quien: c.quien.split(' (')[0] }),
    }),
    eventosManual: estado.eventosManual.map((e) => ({
      ...e,
      enLaWeb: e.estado === 'publicado' ? enlaceEnLaWeb(e) : null,
      contacto: CONTACTOS_AGENDA.find((c) => c.id === e.contactoId)?.quien ?? null,
    })),
    buzon: estado.buzon,
    tiposBuzon: TIPOS_BUZON,
    estadosSeguimiento: ESTADOS_SEGUIMIENTO,
    utiles: { numeros: NUMEROS, diaDeLaSemana: diaDeEstaSemana(), tocaHoy: tocaHoy() },
    horarios: horariosDe(estado),
    piezas: piezasListas(),
    diasSemana: DIAS_SEMANA,
    instruccionEditorial: INSTRUCCION_EDITORIAL,
    // El documento editorial entero (CRITERIO-EDITORIAL.md): la instrucción
    // de arriba sale de ahí, y el panel lo muestra debajo.
    criterioEditorial: CRITERIO_EDITORIAL,
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

// Si la IA falla tres veces seguidas, se corta y se sigue en el próximo ciclo:
// lo hace reescribirAutomaticas (reels/reescritura.mjs), igual que en la nube.

/** Reescribe sola lo que va a salir sin que nadie lo mire.
 *
 *  Sólo toca las verdes: son las que se publican automáticamente, así que
 *  son justamente las que nadie va a corregir a mano. Lo amarillo espera
 *  aprobación y ahí ya hay un humano que puede apretar el botón.
 *
 *  Desde el 25/09 usa EXACTAMENTE el mismo flujo que la nube:
 *  reescribirAutomaticas (reels/reescritura.mjs), con el texto completo de
 *  las fuentes, el cuerpo obligatorio (70 palabras o más), las oraciones
 *  dudosas sacadas, el tope de tres intentos por nota (estado.intentosIA),
 *  el semáforo sobre todo lo escrito y el freno por verificación baja. Antes
 *  tenía su propia copia de la lógica, que se quedó atrás: publicaba sin
 *  cuerpo y nunca reintentaba una nota rechazada.
 *
 *  Nunca pisa algo que escribió una persona: si la decisión guardada no vino
 *  de la IA, se respeta. Y el estado que deja es el que la nota habría tenido
 *  igual (estadoPorDefecto), para no cambiar sin querer qué se publica. */
async function reescribirPendientes() {
  if (!claveGemini()) return;
  const cola = (ultima?.notas ?? []).filter((n) => n.semaforo === 'verde').filter((n) => !esVieja(n));
  if (!cola.length) return;

  // Lo que la IA ya escribió CON cuerpo se reusa (y se revalida) sin pedir
  // nada; lo que quedó sin cuerpo vuelve a ser candidata, hasta el tope.
  const previas = {};
  for (const n of cola) {
    const d = estado.decisiones[n.id];
    if (d && !decisionHumana(d) && d.guion && tieneCuerpo(d)) previas[n.id] = { ...d };
  }
  const intentosAntes = JSON.stringify(estado.intentosIA ?? {});
  estado.intentosIA = podarIntentos(estado.intentosIA ?? {});
  const colores = new Map(cola.map((n) => [n.id, n.semaforo]));
  const resultado = await reescribirAutomaticas(cola, {
    previas,
    decisiones: estado.decisiones,
    tope: REESCRITURAS_POR_CICLO,
    archivo: leerJson(F_ARCHIVO_WEB, { notas: [] }).notas ?? [],
    intentos: estado.intentosIA,
  });

  let hechas = 0;
  let caidas = 0;
  for (const n of cola) {
    const r = resultado[n.id];
    const previo = estado.decisiones[n.id] ?? {};
    if (r && !previas[n.id]) {
      const resto = sinExtras(previo);
      delete resto.rechazadaPorVerificacion;
      delete resto.problemasDeLaIA;
      estado.decisiones[n.id] = {
        ...resto,
        estado: previo.estado ?? estadoPorDefecto(n),
        titulo: r.titulo,
        copete: r.copete,
        guion: r.guion,
        cuerpo: r.cuerpo,
        ...extrasDe(r),
        deIA: true,
        por: 'ia',
        cuando: new Date().toISOString(),
      };
      hechas += 1;
    } else if (!r && previas[n.id] && n.semaforo === colores.get(n.id)) {
      // Lo que ya estaba escrito y hoy no pasa la revalidación (una regla
      // nueva, como la de "en vivo"): se borra el texto de la IA para que se
      // vuelva a escribir, en vez de quedar publicado mal.
      const { titulo, copete, cuerpo, guion, ...resto } = sinExtras(previo);
      estado.decisiones[n.id] = { ...resto, deIA: null, cuando: new Date().toISOString() };
      caidas += 1;
    }
  }
  // Las que el semáforo o la verificación baja frenaron cambiaron de color
  // en `ultima` (reels/reescritura.mjs, frenar): se guarda para que el
  // tablero las muestre esperando a una persona hasta la próxima búsqueda.
  const frenadas = cola.filter((n) => n.semaforo !== colores.get(n.id)).length;
  if (frenadas) guardarJson(F_ULTIMA, ultima);
  if (hechas || caidas || intentosAntes !== JSON.stringify(estado.intentosIA)) guardarJson(F_ESTADO, estado);
  if (hechas || caidas || frenadas) {
    console.log(`  reescritas ${hechas}${caidas ? ` · ${caidas} para rehacer` : ''}${frenadas ? ` · ${frenadas} esperan a una persona` : ''}`);
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
//
// El panel ya no publica la web. Hasta el 25/09 cada dos horas regeneraba
// web/data/portada.json, compilaba y la subía. Desde el 24/09 el sitio lo
// sirve Cloudflare Pages y lo arma GitHub Actions cada 30 minutos
// ("Actualizar la web" → cloudflare-deploy.yml), con la PC apagada o
// prendida. Regenerar portada.json acá no servía
// para nada del tablero (lee panel/datos/ultima.json) y sólo dejaba el
// archivo modificado en la PC, que es justo el que choca al hacer git pull.
// Lo que el panel decide llega a la web por panel/sincronizar.mjs.

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
    // Un pedido que cambia algo y viene de otra página (el navegador lo
    // marca con Origin) no se atiende: la cookie de sesión viaja sola, y
    // sin esto cualquier sitio que Hernán abra podría publicar en su nombre.
    if (!origenPermitido(req)) { json(res, { error: 'pedido de otro origen' }, 403); return; }

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

    // Salir es por POST: por GET, cualquier página podía cerrar la sesión con
    // una imagen que apuntara acá. Un GET (un marcador viejo) vuelve al panel.
    if (ruta === '/salir') {
      if (req.method !== 'POST') { res.writeHead(302, { location: '/' }); res.end(); return; }
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
    // agenda, o que respondió: sólo lleva la cuenta de cuándo, no manda nada.
    // El mensaje lo manda una persona desde el WhatsApp (o el correo) de
    // Radar; el panel apenas abre la conversación con el texto ya escrito.
    if (ruta === '/api/agenda/contactado' && req.method === 'POST') {
      const { id, accion = 'escribimos' } = await cuerpoDe(req);
      const quien = sesion.nombre;
      const c = CONTACTOS_AGENDA.find((x) => x.id === id);
      if (!c) { json(res, { error: 'no existe ese contacto' }, 404); return; }
      if (accion === 'escribimos') {
        estado.contactadoEl[id] = new Date().toISOString();
        anotar('agenda: mensaje mensual enviado', c.quien, quien);
      } else if (accion === 'respondio') {
        estado.respondioEl[id] = new Date().toISOString();
        anotar('agenda: respondió', c.quien, quien);
      } else if (accion === 'deshacer') {
        delete estado.contactadoEl[id];
        delete estado.respondioEl[id];
        anotar('agenda: se borró el registro de mensajes', c.quien, quien);
      } else { json(res, { error: 'acción desconocida' }, 400); return; }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Cargar un evento a mano: para cuando alguien avisa por WhatsApp, por
    // teléfono o en la calle, y no está esperando a que lo suba el municipio.
    // Nace como borrador; "publicar" es lo que le arma la página en la web
    // (panel/agenda.mjs, web/lib/eventos.js).
    if (ruta === '/api/evento' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      if (d.accion === 'agregar') {
        let ev;
        try {
          ev = nuevoEventoManual(d, {
            quien: sesion.nombre, contactos: CONTACTOS_AGENDA, anuales: CALENDARIO_ANUAL, categorias: CATEGORIAS_AGENDA,
          });
        } catch (e) { json(res, { error: e.message }, 400); return; }
        estado.eventosManual.push(ev);
        anotar(ev.estado === 'publicado' ? 'evento cargado y publicado' : 'evento cargado a mano', `${ev.nombre} · ${ev.desde}`, sesion.nombre);
      }
      if (d.accion === 'publicar' || d.accion === 'despublicar') {
        const i = estado.eventosManual.findIndex((e) => e.id === d.id);
        if (i < 0) { json(res, { error: 'no existe ese evento' }, 404); return; }
        const cambiar = d.accion === 'publicar' ? publicarEvento : despublicarEvento;
        estado.eventosManual[i] = cambiar(estado.eventosManual[i], { quien: sesion.nombre });
        anotar(d.accion === 'publicar' ? 'evento publicado en la web' : 'evento sacado de la web', estado.eventosManual[i].nombre, sesion.nombre);
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
      // Con el texto completo de las fuentes, como en la reescritura
      // automática: sin eso la IA no tiene de dónde escribir el cuerpo.
      const completo = await textoCompletoDe(nota);
      const conAntecedentes = {
        ...nota,
        copete: previo.copete ?? nota.resumenFuente,
        textoDeLaFuente: completo.texto,
        fuenteDelTexto: completo.numero,
        antecedentes: antecedentesDe(nota, leerJson(F_ARCHIVO_WEB, { notas: [] }).notas ?? []),
      };
      let r = await reescribirConRespaldo(conAntecedentes, mecanico);
      // Lo mismo que en la reescritura automática, pero acá no se descarta:
      // lo aprieta una persona y lo va a leer. Se guarda con el aviso de qué
      // no cuadra con la fuente. Las partes nuevas sí se verifican y se
      // descartan una por una, igual que en la automática.
      const material = materialParaVerificar(conAntecedentes);
      if (previo.copete) material.resumen = `${material.resumen}\n${previo.copete}`;
      let control = r.deIA
        ? verificar(material, r)
        : { ok: true, problemas: [] };
      // Como en la automática: si el cuerpo trae un dato que no cuadra, se
      // sacan esas oraciones; si lo que queda pasa y alcanza, se usa eso.
      if (r.deIA && !control.ok) {
        const depurado = { ...r, cuerpo: depurarCuerpo(material, r).cuerpo };
        const otra = verificar(material, depurado);
        if (otra.ok && tieneCuerpo(depurado)) { r = depurado; control = otra; }
      }
      if (r.deIA && !tieneCuerpo(r)) {
        control = {
          ok: false,
          problemas: [...control.problemas, { tipo: 'cuerpo', detalle: `el cuerpo tiene ${palabrasDe(r.cuerpo)} palabras: sin ${PALABRAS_MINIMAS_CUERPO} no sale sola` }],
        };
      }
      const { extras } = r.deIA ? completarReescritura(conAntecedentes, r) : { extras: {} };
      estado.decisiones[id] = {
        ...sinExtras(previo),
        estado: previo.estado ?? estadoPorDefecto(nota),
        titulo: r.titulo,
        copete: r.copete,
        guion: r.guion,
        cuerpo: r.cuerpo,
        ...extras,
        deIA: r.deIA,
        problemasDeLaIA: control.ok ? undefined : control.problemas,
        por: quien,
        cuando: new Date().toISOString(),
      };
      anotar(r.deIA ? (control.ok ? 'reescrita por IA' : `reescrita por IA, con avisos: ${resumirProblemas(control.problemas)}`) : `reescritura: la IA falló (${r.motivoRespaldo}), quedó la mecánica`, nota.titulo, quien);
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
        id, accion, titulo, copete, guion, cuerpo, confirmarSinCuerpo,
      } = await cuerpoDe(req);
      // Quién hizo esto sale de la sesión, no de lo que diga el navegador:
      // antes el panel lo mandaba en el cuerpo y era a confianza.
      const quien = sesion.nombre;
      const nota = ultima?.notas?.find((n) => n.id === id);
      if (!nota) { json(res, { error: 'no existe esa nota' }, 404); return; }

      const previo = estado.decisiones[id] ?? {};
      // Sin cuerpo no se publica sin que una persona lo confirme con el botón
      // de la página ("Publicar igual, sin cuerpo"): 25/09.
      const cuerpoFinal = { cuerpo: cuerpo ?? previo.cuerpo, copete: copete ?? previo.copete ?? nota.resumenFuente };
      if (accion === 'publicada' && !confirmarSinCuerpo && !tieneCuerpo(cuerpoFinal)) {
        json(res, {
          error: `Esta nota no tiene cuerpo (${palabrasDe(cuerpoFinal.cuerpo)} palabras; hacen falta ${PALABRAS_MINIMAS_CUERPO}).`,
          sinCuerpo: true,
        }, 409);
        return;
      }
      if (accion === 'pendiente') {
        delete estado.decisiones[id];
        anotar('devuelta a la cola', nota.titulo, quien);
      } else {
        // Si cambió el título, la bajada o el cuerpo, las partes nuevas que
        // armó la IA sobre su versión se borran (conTextoCorregido).
        estado.decisiones[id] = conTextoCorregido(previo, {
          estado: accion === 'editar' ? (previo.estado ?? 'pendiente') : accion,
          titulo: titulo ?? previo.titulo,
          copete: copete ?? previo.copete,
          guion: guion ?? previo.guion,
          cuerpo: cuerpo ?? previo.cuerpo,
          // Si alguien toca el texto a mano después de que la IA lo escribió,
          // deja de ser "de la IA sin tocar": queda como edición manual.
          deIA: guion && guion !== previo.guion ? false : previo.deIA,
          por: quien,
          cuando: new Date().toISOString(),
        });
        anotar(accion === 'editar' ? 'editada' : accion, titulo ?? nota.titulo, quien);
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Decidir de a montones: la primera corrida trae todo el archivo que haya
    // en las portadas, y no tiene sentido tocar cien botones.
    if (ruta === '/api/lote' && req.method === 'POST') {
      const { ids: pedidos = [], accion } = await cuerpoDe(req);
      const quien = sesion.nombre;
      // En lote no se publica nada sin cuerpo: eso se confirma de a una.
      const ids = accion === 'publicada'
        ? pedidos.filter((id) => tieneCuerpo(camposEditables(ultima?.notas?.find((n) => n.id === id) ?? {}, estado.decisiones[id])))
        : pedidos;
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
      // Sólo http(s) y nada de la red de casa: sin este límite, desde afuera
      // (por el túnel) se podía usar el panel para espiar el router u otra PC.
      const permitida = await probarUrlPermitida(candidata);
      if (!permitida.ok) { json(res, { ok: false, motivo: permitida.motivo }); return; }
      try {
        const xml = await traer(permitida.url.href, { timeout: 20000 });
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

    // Cargar o borrar un aviso comercial en uno de los tres espacios fijos
    // de la web (apertura, clima, pie). Nombre y texto vacíos borran el
    // aviso de ese espacio, que vuelve a no mostrar nada.
    if (ruta === '/api/avisos' && req.method === 'POST') {
      const pedido = await cuerpoDe(req);
      let avisos;
      try { avisos = aplicarAviso(leerJson(F_AVISOS, {}), pedido); } catch (e) { json(res, { error: e.message }, 400); return; }
      guardarJson(F_AVISOS, avisos);
      anotar(avisos[pedido.slot] ? `aviso de "${avisos[pedido.slot].nombre}" en ${pedido.slot}` : `aviso de ${pedido.slot} borrado`, 'espacio publicitario', sesion.nombre);
      guardarJson(F_ESTADO, estado);
      json(res, vista(sesion));
      return;
    }

    // Alta, baja y pausa de fuentes.
    if (ruta === '/api/fuente' && req.method === 'POST') {
      const d = await cuerpoDe(req);
      if (d.accion === 'agregar') {
        const id = sinTildes(d.nombre ?? 'fuente')
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
  // La agenda cambia mucho menos que las noticias: alcanza con una vez por hora.
  setInterval(actualizarAgenda, 60 * 60 * 1000);
});
