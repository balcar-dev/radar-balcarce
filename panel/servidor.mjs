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
import { TIPOS as TIPOS_BUZON, ESTADOS_SEGUIMIENTO } from './buzon.mjs';
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
function vista() {
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
    cuotaVoz: estadoCuotaVoz(),
    instruccionEditorial: INSTRUCCION_EDITORIAL,
    historial: estado.historial.slice(0, 12),
  };
}

async function correrIngesta() {
  if (corriendo) return;
  corriendo = true;
  try {
    ultima = await ingestar({ fuentes: estado.fuentes, silencioso: true });
    guardarJson(F_ULTIMA, ultima);
    const nuevas = ultima.notas.filter((n) => !estado.decisiones[n.id]).length;
    console.log(`  ciclo ok · ${ultima.notas.length} historias · ${nuevas} sin decidir`);
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

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname;

  try {
    if (ruta === '/' || ruta === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(path.join(AQUI, 'panel.html')));
      return;
    }

    if (ruta === '/api/estado') { json(res, vista()); return; }

    if (ruta === '/api/actualizar' && req.method === 'POST') {
      await correrIngesta();
      json(res, vista());
      return;
    }

    if (ruta === '/api/agenda/actualizar' && req.method === 'POST') {
      await actualizarAgenda();
      json(res, vista());
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
          cargadoPor: d.quien || 'vos',
          cargadoCuando: new Date().toISOString(),
        });
        anotar(`buzón: ${TIPOS_BUZON[d.tipo]?.nombre ?? d.tipo} recibido`, d.texto.slice(0, 70), d.quien ?? 'vos');
      }
      if (d.accion === 'estado') {
        const item = estado.buzon.find((x) => x.id === d.id);
        if (item) { item.estado = d.estado; anotar('buzón: cambio de estado', `${item.texto.slice(0, 50)} → ${d.estado}`, d.quien ?? 'vos'); }
      }
      if (d.accion === 'respuesta') {
        // La respuesta de la otra parte en un reclamo: es lo que habilita
        // publicarlo. Sin esto, un reclamo no debería salir nunca.
        const item = estado.buzon.find((x) => x.id === d.id);
        if (item) { item.respuestaOtraParte = d.respuesta; anotar('buzón: se sumó la respuesta de la otra parte', item.texto.slice(0, 50), d.quien ?? 'vos'); }
      }
      if (d.accion === 'borrar') {
        estado.buzon = estado.buzon.filter((x) => x.id !== d.id);
        anotar('buzón: eliminado', d.id, d.quien ?? 'vos');
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista());
      return;
    }

    // Registrar que se le mandó el mensaje mensual a un contacto de la
    // agenda: sólo lleva la cuenta de cuándo, no manda nada — el mensaje se
    // copia y se pega a mano en WhatsApp, esto es apenas el recordatorio.
    if (ruta === '/api/agenda/contactado' && req.method === 'POST') {
      const { id, quien = 'vos' } = await cuerpoDe(req);
      const c = CONTACTOS_AGENDA.find((x) => x.id === id);
      if (!c) { json(res, { error: 'no existe ese contacto' }, 404); return; }
      estado.contactadoEl[id] = new Date().toISOString();
      anotar('agenda: mensaje mensual enviado', c.quien, quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista());
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
          cargadoPor: d.quien || 'vos',
          cargadoCuando: new Date().toISOString(),
        });
        anotar('evento cargado a mano', `${d.nombre} · ${d.fecha}`, d.quien ?? 'vos');
      }
      if (d.accion === 'borrar') {
        estado.eventosManual = estado.eventosManual.filter((e) => e.id !== d.id);
        anotar('evento manual borrado', d.id, d.quien ?? 'vos');
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista());
      return;
    }

    // Reescribe una nota con IA (línea editorial + Gemini) y guarda el
    // resultado como si fuera una edición manual, para que quede igual de
    // editable después. Si Gemini falla, cae al armado mecánico y lo dice.
    if (ruta === '/api/reescribir' && req.method === 'POST') {
      const { id, quien = 'vos' } = await cuerpoDe(req);
      const nota = ultima?.notas?.find((n) => n.id === id);
      if (!nota) { json(res, { error: 'no existe esa nota' }, 404); return; }

      const previo = estado.decisiones[id] ?? {};
      const r = await reescribirConRespaldo(
        { ...nota, copete: previo.copete ?? nota.resumenFuente },
        mecanico,
      );
      estado.decisiones[id] = {
        ...previo,
        estado: previo.estado ?? 'pendiente',
        titulo: r.titulo,
        copete: r.copete,
        guion: r.guion,
        deIA: r.deIA,
        por: quien,
        cuando: new Date().toISOString(),
      };
      anotar(r.deIA ? 'reescrita por IA' : `reescritura: la IA falló (${r.motivoRespaldo}), quedó la mecánica`, nota.titulo, quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista());
      return;
    }

    // Decidir sobre una nota: publicar, descartar, volver a la cola, editar.
    if (ruta === '/api/nota' && req.method === 'POST') {
      const {
        id, accion, titulo, copete, guion, quien = 'vos',
      } = await cuerpoDe(req);
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
      json(res, vista());
      return;
    }

    // Decidir de a montones: la primera corrida trae todo el archivo que haya
    // en las portadas, y no tiene sentido tocar cien botones.
    if (ruta === '/api/lote' && req.method === 'POST') {
      const { ids = [], accion, quien = 'vos' } = await cuerpoDe(req);
      for (const id of ids) {
        estado.decisiones[id] = { estado: accion, por: quien, cuando: new Date().toISOString() };
      }
      anotar(`${ids.length} notas ${accion === 'descartada' ? 'archivadas' : accion}`, 'en lote', quien);
      guardarJson(F_ESTADO, estado);
      json(res, vista());
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
        anotar('fuente agregada', `${d.nombre} · ${d.url}`, d.quien ?? 'vos');
      }
      if (d.accion === 'borrar') {
        estado.fuentes = estado.fuentes.filter((f) => f.id !== d.id);
        anotar('fuente borrada', d.id, d.quien ?? 'vos');
      }
      if (d.accion === 'activar') {
        const f = estado.fuentes.find((x) => x.id === d.id);
        if (f) { f.activa = !f.activa; anotar(f.activa ? 'fuente reactivada' : 'fuente pausada', f.nombre, d.quien ?? 'vos'); }
      }
      if (d.accion === 'peso') {
        const f = estado.fuentes.find((x) => x.id === d.id);
        if (f) { f.peso = Math.max(1, Math.min(40, Number(d.peso) || f.peso)); anotar('peso cambiado', `${f.nombre} → ${f.peso}`, d.quien ?? 'vos'); }
      }
      guardarJson(F_ESTADO, estado);
      json(res, vista());
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
