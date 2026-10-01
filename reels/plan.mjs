// Qué se publica hoy y a qué hora, con techo.
//   node reels/plan.mjs              muestra el plan del día
//   node reels/plan.mjs --generar    además arma los videos
//
// Qué sale cada día (el contrato, redes/contrato.mjs y docs/07-REDES.md): tres reels,
// que son los tres podcasts (mañana, tarde y noche, cada uno subido también
// como historia), y las historias fijas de servicio (el clima de la mañana y el
// de la noche, la farmacia), más los extras semanales (teléfonos útiles,
// agenda) y el aviso de clima cuando hay uno grave. Desde el 24/09 no hay
// reels ni historias de UNA nota: una noticia sola dicha en voz alta sonaba
// rara, y las notas salen dentro de los podcasts.

import fs from 'node:fs';
import path from 'node:path';
import { placaClima, placaFarmacia, placaRepaso, placaUtiles, placaAgenda, placaParticipa, placaEfemeride, COLOR_FERIADO, COLOR_SECCION, COLORES } from './placa.mjs';
import { PIEZAS_PARTICIPA, IDS_PARTICIPA, guionParticipa } from '../redes/participa.mjs';
import { feriadoDelDia, fechaDeFeriado, datosParaContar, guionFeriado } from '../redes/feriado.mjs';
import { NUMEROS, decisionHumana, HORA_DE_CAMBIO, MINUTO_DE_CAMBIO } from '../ingesta/utiles.mjs';
import { horariosDe, toca } from '../panel/horarios.mjs';
import { enlaceDeNota } from '../redes/elegir.mjs';
import { repasosDelDia } from '../redes/repasos.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import {
  guionClima, guionClimaNoche, guionFarmacia, guionUtiles, guionAgenda, comoNombre,
} from '../redes/guiones.mjs';
import { INDICACIONES, momentoDeHora } from '../redes/prompt-redes.mjs';
import { nombreDeEvento } from '../web/lib/eventos.js';
import {
  PODCASTS, NOMBRES_DE_PODCAST, HORA_AVISO, avisoDeClima, piezasPublicadasHoy, historiasQueSobran,
} from '../redes/piezas.mjs';

// El cupo de reels es el recurso escaso del día, así que NO se gasta en lo que
// se repite todas las mañanas. Clima, farmacia y agenda van a historias, que
// no compiten entre sí y son justo donde la gente busca ese dato. Los reels
// son los tres podcasts: si un día no hay notas para un repaso, ese reel no
// sale y está bien.
export const REGLAS = {
  reelsPorDia: CONTRATO_DIARIO.reelsPorDia, // techo duro: los tres podcasts
  // Las historias del contrato son 6 (los tres podcasts, el clima de la mañana y
  // el de la noche, la farmacia) y el techo del día es 8: las 6 más como máximo
  // dos extras (teléfonos útiles y agenda). Se aplica de verdad en planDelDia.
  historiasPorDia: CONTRATO_DIARIO.historiasPorDia,
  historiasMaximasPorDia: CONTRATO_DIARIO.historiasMaximasPorDia,
};

/**
 * ¿Se puede contar esta nota en una pieza? Lo mismo que decide la web
 * (notaPublicada en web/scripts/generar-datos.mjs): si una persona decidió
 * (decisionHumana), manda lo que decidió; si no, sólo la verde, que sale sola.
 * La amarilla que nadie miró todavía espera, y la roja nunca.
 *
 * Sólo hace falta con los datos del panel (PC, panel/datos/ultima.json, que
 * trae todo lo que leyó la ingesta). En GitHub los datos son lo ya publicado
 * (web/data/portada.json, `yaPublicadas` en redes/datos.mjs): ya pasaron por
 * este filtro y no traen el semáforo.
 */
export function esPublicable(nota, decisiones = {}) {
  const d = decisiones?.[nota.id];
  if (decisionHumana(d)) return d.estado === 'publicada' || d.estado === 'automatica';
  return nota.semaforo === 'verde';
}

// El color de la placa de teléfonos útiles (el mismo que usa reels/placa.mjs). Se había
// perdido en un refactor y, como los útiles sólo salían un día fijo que nadie
// corría, nadie lo notó: el plan se caía con ReferenceError el día que tocaba.
const COLOR_UTILES_ACENTO = '#8C2D18';

const DATOS = path.join(import.meta.dirname, '..', 'panel', 'datos', 'ultima.json');
const SALIDA = path.join(import.meta.dirname, 'salida');

export const fechaLarga = (d = new Date()) => {
  const t = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });
  // Sin la coma que pone Node ("lunes, 28 de…"): todas las placas escriben la
  // fecha igual que la de la farmacia, "Lunes 28 de septiembre" (28/09).
  const sinComa = t.replace(',', '');
  return sinComa.charAt(0).toUpperCase() + sinComa.slice(1);
};

// --- lo que muestran las placas (28/09, diseño "Historia diaria") ----------

const DIA_CORTO = {
  lun: 'LUN', mar: 'MAR', mié: 'MIÉ', mie: 'MIÉ', jue: 'JUE', vie: 'VIE', sáb: 'SÁB', sab: 'SÁB', dom: 'DOM',
};

/** El recuadro de un día del pronóstico: "MAR · 82% lluvia", máxima y mínima. */
export function cajaDeDia(d, titulo = null) {
  if (!d) return null;
  const nombre = titulo ?? DIA_CORTO[String(d.dia ?? '').toLowerCase()] ?? String(d.dia ?? '').toUpperCase();
  const lluvia = Number(d.lluvia) >= 10 ? ` · ${d.lluvia}% lluvia` : '';
  return { titulo: `${nombre}${lluvia}`, valor: `${d.max}°`, secundario: `${d.min}°` };
}

/** Lo que viene, en una oración: "Chaparrones. Entre 9° y 14°, con 82% de
 *  probabilidad de lluvia y viento de hasta 27 km/h." */
export function pronosticoDe(d) {
  const partes = [`Entre ${d.min}° y ${d.max}°`];
  const extra = [
    Number(d.lluvia) >= 10 ? `${d.lluvia}% de probabilidad de lluvia` : null,
    d.viento ? `viento de hasta ${d.viento} km/h` : null,
  ].filter(Boolean);
  const cielo = d.cielo ? `${d.cielo}. ` : '';
  return `${cielo}${partes[0]}${extra.length ? `, con ${extra.join(' y ')}` : ''}.`;
}

/** Hasta cuándo dura el turno que sale a esa hora: el cambio es a las 8:30. */
export function hastaCuandoElTurno(hora = '19:00') {
  const [h, m] = String(hora).split(':').map(Number);
  const cambio = `${HORA_DE_CAMBIO}:${String(MINUTO_DE_CAMBIO).padStart(2, '0')}`;
  return (h * 60 + (m || 0)) >= HORA_DE_CAMBIO * 60 + MINUTO_DE_CAMBIO
    ? `De turno hasta mañana a las ${cambio}.`
    : `De turno hasta hoy a las ${cambio}.`;
}

const F_AGENDA = path.join(import.meta.dirname, '..', 'panel', 'datos', 'agenda.json');
const F_AGENDA_WEB = path.join(import.meta.dirname, '..', 'web', 'data', 'agenda.json');
const F_ESTADO = path.join(import.meta.dirname, '..', 'panel', 'datos', 'estado.json');

/** Lo que decidió el panel (estado.json). Sin panel, vacío: valen los de fábrica. */
function leerEstado() {
  try { return JSON.parse(fs.readFileSync(F_ESTADO, 'utf8')); } catch { return {}; }
}

/** Los horarios de las piezas fijas, como quedaron configurados en el panel
 *  (pestaña Calendario). Si no hay nada guardado, valen los de fábrica. */
function horariosConfigurados(estado) {
  const porId = {};
  for (const h of horariosDe(estado)) porId[h.id] = h;
  return porId;
}

/** Los eventos de los próximos días, listos para la placa: los de la agenda
 *  publicada en la web (web/data/agenda.json, los mismos que tienen página en
 *  /agenda), así la historia sale también desde GitHub con la PC apagada
 *  (29/09). Sin esa agenda, la copia del panel de la PC. Si no hay ninguna,
 *  devuelve vacío: la pieza simplemente no se arma. */
export function eventosProximos(dias = 4, { web = F_AGENDA_WEB, pc = F_AGENDA, hoy: desde = new Date() } = {}) {
  let eventos = null;
  try { eventos = JSON.parse(fs.readFileSync(web, 'utf8')).eventos; } catch { /* sin agenda en la web */ }
  if (!Array.isArray(eventos)) {
    try { eventos = JSON.parse(fs.readFileSync(pc, 'utf8')).municipio; } catch { return []; }
  }
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hoy = new Date(desde); hoy.setHours(0, 0, 0, 0);
  const tope = new Date(hoy.getTime() + dias * 86400000);

  return (eventos ?? []).map((e) => {
    const m = String(e.desde ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (f < hoy || f > tope) return null;
    const dia = DIAS[f.getDay()];
    return {
      // Como en su página: "22° FIESTA NACIONAL DEL POSTRE" pasa a "22° Fiesta Nacional del Postre".
      nombre: nombreDeEvento(e.nombre),
      lugar: nombreDeEvento(e.lugar ?? ''),
      cuando: m[4] ? `${dia} ${m[4]}:${m[5]}` : dia,
      orden: f.getTime(),
    };
  }).filter(Boolean).sort((a, b) => a.orden - b.orden);
}

const PORTADA_WEB = path.join(import.meta.dirname, '..', 'web', 'data', 'portada.json');
const LIBRO_REDES = path.join(import.meta.dirname, '..', 'web', 'data', 'redes.json');

/** Lo ya publicado en las redes, para no repetir notas. Vacío si no hay. */
function leerLibro() {
  try { return JSON.parse(fs.readFileSync(LIBRO_REDES, 'utf8')); } catch { return null; }
}

/** Con panel, lo que dejó el panel. Sin panel (GitHub), lo ya publicado en la web. */
function leerDatos() {
  if (fs.existsSync(DATOS)) return JSON.parse(fs.readFileSync(DATOS, 'utf8'));
  if (fs.existsSync(PORTADA_WEB)) return datosDeLaWeb(JSON.parse(fs.readFileSync(PORTADA_WEB, 'utf8')));
  throw new Error('Todavía no hay datos. Corré primero:  node panel/servidor.mjs  o  node ingesta/ingesta.mjs');
}

// --- los guiones -----------------------------------------------------------
// Los arma redes/guiones.mjs con lo ya publicado (titulares, copetes propios,
// el clima, la farmacia) y el libro de recursos de CRITERIO-REDES.md (saludos,
// conectores, cierres): el guion no lo escribe un modelo. Gemini sólo pone la
// voz, con la indicación de su hora. Dos reglas que valen para todos:
// 1. La voz NO lee la placa. La placa muestra el dato; la voz cuenta qué
//    significa. Si dicen lo mismo, la pieza dura el doble y no aporta nada.
// 2. La fuente no se nombra nunca en redes. La atribución y el link van en la
//    nota de la página, que es donde corresponde.

// --- el plan ---------------------------------------------------------------

export function planDelDia(datos, {
  libro = null, fecha = new Date(), estado = leerEstado(), eventos = null,
} = {}) {
  const hoy = fecha.getDate();
  const turno = datos.farmacias?.turnos?.find((t) => t.dia === hoy) ?? null;

  // Sólo compiten por un podcast las notas que salieron solas (verdes) o que
  // alguien aprobó, nunca las que están esperando decisión. Antes el filtro
  // sólo sacaba las rojas: con los datos del panel (PC) podía contar una
  // amarilla que nadie había mirado (28/09). Lo ya publicado (GitHub) pasó
  // ese filtro en la web.
  const publicables = datos.notas
    .filter((n) => datos.yaPublicadas || esPublicable(n, estado?.decisiones))
    .sort((a, b) => b.relevancia - a.relevancia);

  const piezas = [];

  // Los horarios y los días salen del panel (pestaña Calendario). Si una
  // pieza está apagada o hoy no le toca, directamente no se arma.
  const cuando = horariosConfigurados(estado);
  // `toca` (panel/horarios.mjs) es la MISMA función que usa el reloj de Redes:
  // los teléfonos útiles salen el día que rotan, o el que fijó el panel.
  const tocaHoy = (id) => toca(cuando[id], fecha, { estado });

  // --- El aviso de clima: la única pieza que no espera su horario ---------
  //
  // Helada fuerte, granizo o viento de más de 60 km/h. Sale cuando hay algo
  // que avisar y no cuando le toca, porque un aviso que espera a las 20:00
  // no es un aviso. Los umbrales están altos a propósito (ingesta/alertas.mjs):
  // si esto saltara todas las semanas dejaría de mirarlo nadie, y el día que
  // importa pasaría de largo. Cuál es y a qué "hora" (HORA_AVISO: desde las
  // 7:00, con ventana hasta las 22:00, así la primera vuelta del reloj que lo
  // ve lo pide) lo dice avisoDeClima, en redes/piezas.mjs: el reloj usa la
  // misma función y pide el mismo nombre que acá se arma.
  const a = avisoDeClima(datos.clima);
  if (a) {
    piezas.push({
      tipo: 'historia',
      hora: HORA_AVISO,
      nombre: a.nombre,
      titulo: a.titulo,
      motivo: 'aviso de clima · sale apenas se detecta, sin esperar horario',
      seccion: 'Clima',
      guion: `${a.titulo}. ${a.texto}`,
      // "Historia diaria" con el recuadro del aviso: el título del aviso
      // manda (es lo que hay que ver de reojo) y abajo lo que hay que saber.
      svg: placaClima({
        temp: datos.clima.ahora.temp,
        cielo: datos.clima.ahora.cielo,
        esDeDia: datos.clima.ahora.esDeDia !== false,
        sensacion: datos.clima.ahora.sensacion ?? null,
        viento: datos.clima.ahora.viento ?? null,
        rumbo: datos.clima.ahora.rumbo ?? '',
        max: datos.clima.dias[0].max,
        min: datos.clima.dias[0].min,
        fecha: a.titulo,
        kicker: `Aviso de clima · ${a.dia === datos.clima.dias[0].fecha ? 'hoy' : 'mañana'}`,
        etiqueta: 'El clima ahora',
        aviso: { titulo: a.titulo, texto: a.texto },
        cajas: datos.clima.dias.slice(0, 3).map((d, i) => cajaDeDia(d, i === 0 ? 'HOY' : null)).filter(Boolean),
      }),
      acento: COLOR_SECCION.Policiales ?? COLOR_SECCION.Clima,
    });
  }

  // --- Historias: lo de todos los días, que es servicio y no noticia -------
  // El clima de la mañana y el de la noche se deciden cada uno por su lado: el
  // de la noche estaba anidado dentro del de la mañana y, si se apagaba el de
  // la mañana en el panel, desaparecía también el de la noche (28/09).
  const c = datos.clima?.ahora;
  const climaHoy = datos.clima?.dias?.[0];
  const climaManana = datos.clima?.dias?.[1];

  if (datos.clima && tocaHoy('clima-manana')) {
    const hoy = climaHoy;
    piezas.push({
      tipo: 'historia', hora: cuando['clima-manana'].hora, nombre: 'clima-manana', titulo: 'El clima de hoy',
      motivo: 'servicio fijo · no gasta cupo de reel', seccion: 'Clima',
      guion: guionClima(datos.clima, turno),
      momento: 'manana', indicacion: INDICACIONES.manana,
      // "Historia diaria" (28/09): la tarjeta del clima ahora, hoy y los dos
      // días que siguen. Sin dólar: si se mueve, sale como nota propia.
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        esDeDia: c.esDeDia !== false,
        sensacion: c.sensacion ?? null,
        viento: c.viento ?? null,
        rumbo: c.rumbo ?? '',
        max: hoy.max,
        min: hoy.min,
        fecha: fechaLarga(fecha),
        kicker: 'Hoy en Balcarce',
        etiqueta: 'El clima ahora',
        cajas: datos.clima.dias.slice(0, 3).map((d, i) => cajaDeDia(d, i === 0 ? 'HOY' : null)).filter(Boolean),
      }),
      acento: COLOR_SECCION.Clima,
    });
  }

  // Segundo pase: de noche, cuando la gente ya está en casa y lo que
  // importa es cómo amanece mañana. "Cómo sigue el clima esta noche" y no "cómo
  // sigue el día": a las 20 el día ya pasó (29/09, Hernán). La mínima de esta
  // noche es la de mañana: el pronóstico da una por día y la de mañana es la
  // de la madrugada; la de hoy casi siempre ya pasó.
  if (datos.clima && tocaHoy('clima-noche')) {
    const hoy = climaHoy;
    const manana = climaManana;
    piezas.push({
      tipo: 'historia', hora: cuando['clima-noche'].hora, nombre: 'clima-noche', titulo: 'Cómo sigue el clima esta noche',
      motivo: 'segundo pase del clima · mira para adelante', seccion: 'Clima',
      guion: guionClimaNoche(datos.clima),
      momento: 'noche', indicacion: INDICACIONES.noche,
      // Mira para adelante: esta noche, mañana y pasado.
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        esDeDia: c.esDeDia !== false,
        sensacion: c.sensacion ?? null,
        viento: c.viento ?? null,
        rumbo: c.rumbo ?? '',
        max: hoy.max,
        min: hoy.min,
        fecha: 'Cómo sigue el clima esta noche',
        kicker: 'Esta noche en Balcarce',
        etiqueta: 'Ahora',
        pronostico: manana ? { titulo: 'Mañana', texto: pronosticoDe(manana) } : null,
        cajas: [
          { titulo: 'ESTA NOCHE', valor: `${(manana ?? hoy).min}°`, secundario: 'mín.' },
          ...(manana ? [cajaDeDia(manana, 'MAÑANA')] : []),
          ...(datos.clima.dias[2] ? [cajaDeDia(datos.clima.dias[2])] : []),
        ],
      }),
      acento: COLOR_SECCION.Clima,
    });
  }

  // La farmacia va tarde a propósito: sirve cuando las demás ya cerraron.
  if (turno && tocaHoy('farmacia')) {
    piezas.push({
      tipo: 'historia', hora: cuando.farmacia.hora, nombre: 'farmacia', titulo: `Farmacia de turno: ${comoNombre(turno.farmacias.join(' y '))}`,
      motivo: 'a la hora en que cierran las demás', seccion: 'Farmacias',
      guion: guionFarmacia(turno, { momento: momentoDeHora(cuando.farmacia.hora) }),
      momento: momentoDeHora(cuando.farmacia.hora), indicacion: INDICACIONES[momentoDeHora(cuando.farmacia.hora)],
      svg: placaFarmacia({
        detalle: turno.detalle,
        farmacias: turno.farmacias,
        dia: turno.dia,
        diaSemana: turno.diaSemana,
        mes: turno.mes ?? null,
        hasta: hastaCuandoElTurno(cuando.farmacia.hora),
      }),
      acento: COLOR_SECCION.Farmacias,
    });
  }

  // Números útiles: una vez por semana, día variable (ingesta/utiles.mjs
  // decide cuál). No es noticia ni clima: es contenido de utilidad pura, así
  // que no compite por cupo de reel ni tiene por qué salir todos los días.
  if (tocaHoy('utiles')) {
    const grupos = [...new Set(NUMEROS.map((n) => n.categoria))]
      .map((categoria) => ({ categoria, items: NUMEROS.filter((n) => n.categoria === categoria) }));
    piezas.push({
      tipo: 'historia', hora: cuando.utiles.hora, nombre: 'utiles',
      titulo: 'Teléfonos útiles de Balcarce', motivo: 'una vez por semana, día variable',
      // No hay sección Servicios desde el 27/09: lo práctico de acá va a
      // Balcarce (CLAUDE.md, "Las secciones son once").
      seccion: 'Balcarce',
      guion: guionUtiles({ momento: momentoDeHora(cuando.utiles.hora) }),
      momento: momentoDeHora(cuando.utiles.hora), indicacion: INDICACIONES[momentoDeHora(cuando.utiles.hora)],
      svg: placaUtiles({ grupos }),
      acento: COLOR_UTILES_ACENTO,
    });
  }

  // La agenda del fin de semana: los jueves a la tarde, que es cuando la
  // gente empieza a pensar qué hacer. Es la pieza que ninguno de los otros
  // medios de Balcarce tiene, así que es de lo que más nos diferencia.
  const deLaAgenda = eventos ?? eventosProximos(4);
  if (tocaHoy('agenda') && deLaAgenda.length) {
    piezas.push({
      tipo: 'historia', hora: cuando.agenda.hora, nombre: 'agenda',
      titulo: 'Qué hacer este fin de semana', motivo: 'los jueves, si hay eventos cargados',
      seccion: 'Cultura y agenda',
      guion: guionAgenda(deLaAgenda, { momento: momentoDeHora(cuando.agenda.hora) }),
      momento: momentoDeHora(cuando.agenda.hora), indicacion: INDICACIONES[momentoDeHora(cuando.agenda.hora)],
      svg: placaAgenda({ eventos: deLaAgenda }),
      acento: '#6D4BA0',
    });
  }

  // El feriado (30/09): el hueco de las 9:00 de los días de feriado. Los datos vienen con su fuente.
  if (tocaHoy('feriado')) {
    const f = feriadoDelDia(fecha);
    const momento = momentoDeHora(cuando.feriado.hora);
    piezas.push({
      tipo: 'historia', hora: cuando.feriado.hora, nombre: 'feriado',
      titulo: f.nombre, motivo: 'hoy es feriado',
      seccion: 'Argentina',
      guion: guionFeriado(f, { fecha, momento }),
      momento, indicacion: INDICACIONES[momento],
      svg: placaEfemeride({ rotulo: `Feriado · ${fechaDeFeriado(f.fecha)}`, titulo: f.nombre, cuerpo: datosParaContar(f).join(' '), color: COLOR_FERIADO }),
      acento: COLOR_FERIADO,
    });
  }

  // Participá (30/09): al mediodía, una invitación a escribir por WhatsApp; cada día de la
  // semana toca una distinta (redes/participa.mjs).
  for (const id of IDS_PARTICIPA) {
    if (!tocaHoy(id)) continue;
    const p = PIEZAS_PARTICIPA[id];
    const momento = momentoDeHora(cuando[id].hora);
    piezas.push({
      tipo: 'historia', hora: cuando[id].hora, nombre: id,
      titulo: p.nombre, motivo: 'invitación a participar, al mediodía',
      seccion: p.seccion,
      guion: guionParticipa(id, { fecha, momento }),
      momento, indicacion: INDICACIONES[momento],
      svg: placaParticipa({ rotulo: p.rotulo, pregunta: p.pregunta, pie1: p.pie1, pie2: p.pie2, color: COLOR_SECCION[p.seccion] }),
      acento: COLOR_SECCION[p.seccion],
    });
  }

  // --- Reels: los tres podcasts del día ------------------------------------
  //
  // Las reglas de qué se puede contar solo (nada de Política ni Policiales,
  // sólo lo de Balcarce) y cómo se eligen las notas están en redes/elegir.mjs,
  // donde se prueban.
  //
  // Con el libro de lo ya publicado, el plan sabe qué podcasts salieron y qué
  // notas se contaron. Cuando a las 15:00 se arma sólo el de la tarde, elige
  // las mejores notas que QUEDAN y no repite las de las 10:00: nada de lo que
  // ya se contó en un podcast de hoy o de los dos días anteriores
  // (notasContadasEnPodcasts). Sin esto, una nota local de puntaje alto se
  // repetía en el repaso de la mañana, la tarde y la noche, varios días
  // seguidos (27/09, Hernán: "veo de nuevo la nota de McCain").
  // Qué cuenta cada repaso que falta hoy: la misma función que usa la previa del
  // panel del celular (redes/repasos.mjs), así lo que muestra el celular es lo
  // que arma el plan.
  const repasos = repasosDelDia(publicables, { libro, fecha });
  const hechas = piezasPublicadasHoy(libro, fecha);

  // Tres podcasts por día en vez de noticias sueltas (24/09: una noticia sola
  // dicha en voz alta sonaba rara). Los tres cuentan cuatro notas de temas
  // distintos, sin repetir entre sí (29/09); el de la noche, lo que dejó el día
  // y no se contó. Cada uno lleva su lista de notas con el enlace en el texto del posteo,
  // y sin nombrar la fuente. Cada podcast se sube también como historia.
  // La lista (nombre, título, momento, hora) es una sola: PODCASTS, en
  // redes/piezas.mjs. Cada uno habla como corresponde a su hora: el saludo, el
  // cierre y el tono salen de CRITERIO-REDES.md (redes/guiones.mjs).
  const SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
  const [podcastManana, podcastTarde, podcastNoche] = PODCASTS;
  [podcastManana, podcastTarde].forEach((ronda) => {
    // Con presupuesto de duración: cada podcast se sube también como historia y
    // una historia acepta 60 s. Si el guion no cabe en 55, se le sacan las
    // oraciones de contexto y después notas (mínimo 2): `elegidas` son las que
    // quedaron. Sin repaso (ya salió hoy, o no hay dos notas), no hay pieza.
    const repaso = repasos[ronda.nombre];
    if (!repaso) return;
    const { guion, notas: elegidas } = repaso;
    piezas.push({
      tipo: 'reel', hora: ronda.hora, nombre: ronda.nombre, notaId: elegidas[0].id,
      notaIds: elegidas.map((n) => n.id),
      items: elegidas.map((n) => ({ titulo: n.titulo, enlace: enlaceDeNota(n, SITIO) })),
      titulo: ronda.titulo, momento: ronda.momento, indicacion: INDICACIONES[ronda.momento],
      motivo: `podcast de ${elegidas.length} notas, las de más puntaje de temas distintos · ~${repaso.segundos.toFixed(0)} s`,
      segundosEstimados: repaso.segundos,
      seccion: 'Balcarce', guion,
      // "Repaso · tapa" (28/09): la lista numerada de las notas que cuenta,
      // cada una con el color de su sección, y el nombre del podcast en el color del día.
      svg: placaRepaso({
        titulo: ronda.titulo, momento: ronda.momento, fecha: fechaLarga(fecha), segundos: repaso.segundos,
        notas: elegidas.map((n) => ({ seccion: n.seccion, titulo: n.titulo })), color: COLORES.rojo,
      }),
      acento: COLORES.rojo,
    });
  });

  // El podcast de la noche: el repaso de lo que dejó el día. Sale cuando la
  // gente ya vio todo y quiere el resumen. Si ese día no hay al menos dos
  // noticias para repasar, no se arma.
  // También con presupuesto: el del 25/09 (4 notas, 62,7 s) dejó sin historia a las dos redes.
  // Desde el 29/09 no repite lo que ya contaron el de la mañana o el de la tarde.
  const repasoNoche = repasos[podcastNoche.nombre];
  if (repasoNoche) {
    const notasNoche = repasoNoche.notas;
    piezas.push({
      tipo: 'reel', hora: podcastNoche.hora, nombre: podcastNoche.nombre,
      notaIds: notasNoche.map((n) => n.id),
      items: notasNoche.map((n) => ({ titulo: n.titulo, enlace: enlaceDeNota(n, SITIO) })),
      titulo: podcastNoche.titulo, motivo: `el podcast diario: los titulares más fuertes, un solo audio · ~${repasoNoche.segundos.toFixed(0)} s`,
      segundosEstimados: repasoNoche.segundos,
      seccion: 'Balcarce', guion: repasoNoche.guion, momento: podcastNoche.momento, indicacion: INDICACIONES[podcastNoche.momento],
      svg: placaRepaso({
        titulo: podcastNoche.titulo, momento: podcastNoche.momento, fecha: fechaLarga(fecha), segundos: repasoNoche.segundos,
        notas: notasNoche.map((n) => ({ seccion: n.seccion, titulo: n.titulo })), color: COLORES.rojo,
      }),
      acento: COLORES.rojo,
    });
  }

  // El techo: si hay más reels de los permitidos, se van los de menos motivo.
  const reels = piezas.filter((p) => p.tipo === 'reel');
  if (reels.length > REGLAS.reelsPorDia) {
    reels.slice(REGLAS.reelsPorDia).forEach((p) => { p.fueraDeTecho = true; });
  }

  // El techo de historias del día (8 = las 6 del contrato + 2 extras). Cuentan
  // los tres podcasts (cada uno se sube también como historia), aunque ya hayan
  // salido. Si se pasa, se dejan de armar los extras: primero los teléfonos
  // útiles, después la agenda. Las del contrato y los avisos nunca se sacan.
  const historiasDelDia = [
    ...piezas.filter((p) => p.tipo === 'historia' || NOMBRES_DE_PODCAST.includes(p.nombre)).map((p) => p.nombre),
    ...NOMBRES_DE_PODCAST.filter((n) => hechas.has(n)),
  ];
  for (const nombre of historiasQueSobran(historiasDelDia, REGLAS.historiasMaximasPorDia)) {
    const p = piezas.find((x) => x.nombre === nombre);
    if (p) { p.fueraDeTecho = true; p.motivo = `${p.motivo} · no sale: el día ya tiene ${REGLAS.historiasMaximasPorDia} historias`; }
  }

  return { piezas, turno };
}

// --- ejecución -------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith('plan.mjs')) {
  const datos = leerDatos();
  const { piezas } = planDelDia(datos, { libro: leerLibro() });

  console.log(`\n\x1b[1mPLAN DEL DÍA · ${fechaLarga()}\x1b[0m`);
  console.log(`  techo: ${REGLAS.reelsPorDia} reels, ${REGLAS.historiasPorDia} historias (hasta ${REGLAS.historiasMaximasPorDia} con los extras)\n`);
  const icono = { reel: '\x1b[33mREEL     \x1b[0m', historia: '\x1b[36mHISTORIA \x1b[0m' };
  for (const p of piezas) {
    console.log(`  ${p.hora}  ${icono[p.tipo]} ${p.titulo.slice(0, 68)}`);
    console.log(`         ${p.seccion} · ${p.motivo}${p.fueraDeTecho ? ' · \x1b[31mno sale: pasa el techo\x1b[0m' : ''}`);
  }

  if (process.argv.includes('--generar')) {
    // --solo=clima-manana,farmacia rehace sólo esas, sin gastar pedidos en el resto.
    const solo = (process.argv.find((a) => a.startsWith('--solo='))?.slice(7) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    // Se carga acá y no arriba del archivo: armar los videos necesita
    // ffmpeg, que son ochenta megas, y leer el plan del día no. Con el
    // import arriba, las pruebas obligaban a instalarlo en GitHub Actions.
    const { armarReel } = await import('./reel.mjs');
    const manifiesto = [];
    console.log('\n\x1b[1mARMANDO LOS VIDEOS\x1b[0m');
    for (const p of piezas.filter((x) => x.svg && !x.fueraDeTecho
      && (!solo.length || solo.includes(x.nombre)))) {
      process.stdout.write(`  ${p.nombre}… `);
      try {
        const r = await armarReel(p, SALIDA);
        manifiesto.push({
          nombre: p.nombre, tipo: p.tipo, hora: p.hora, titulo: p.titulo, notaId: p.notaId ?? null,
          notaIds: p.notaIds ?? [], items: p.items ?? [],
          archivo: path.basename(r.mp4), duracion: Number(r.duracion.toFixed(1)),
          // Si el video pasa de lo que acepta una historia, las historias suben
          // esta versión recortada; el reel sube entero (redes/publicar-piezas.mjs).
          ...(r.historia ? { archivoHistoria: path.basename(r.historia.mp4), duracionHistoria: Number(r.historia.duracion.toFixed(1)) } : {}),
        });
        console.log(`\x1b[32mlisto\x1b[0m ${path.basename(r.mp4)} · ${r.duracion.toFixed(1)} s · voz ${r.vozUsada}`);
        if (r.historia) {
          console.log(`\x1b[33m    AVISO\x1b[0m ${r.historia.aviso}`);
          if (process.env.GITHUB_ACTIONS) console.log(`::warning::${p.nombre}: ${r.historia.aviso}`);
        }
      } catch (e) {
        console.log(`\x1b[31mfalló\x1b[0m ${e.message.split('\n')[0]}`);
      }
    }
    console.log(`\n  Quedaron en ${SALIDA}\n`);
    // El manifiesto le dice a redes/publicar.mjs qué se armó y a qué hora sale
    // cada pieza. Con --solo se pisa: lista sólo lo que se acaba de hacer.
    // La carpeta puede no existir: si el reloj pide una pieza que ya no está
    // ("utiles", sacada el 24/09) no se arma nada y nadie la crea. El 25/09 eso
    // hizo fallar Redes en cada vuelta desde las 10:05.
    fs.mkdirSync(SALIDA, { recursive: true });
    fs.writeFileSync(path.join(SALIDA, 'piezas.json'), JSON.stringify(manifiesto, null, 2));
  } else {
    console.log('\n  Para armar los videos:  node reels/plan.mjs --generar\n');
  }
}
