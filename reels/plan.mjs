// Qué se publica hoy y a qué hora, con techo.
//   node reels/plan.mjs              muestra el plan del día
//   node reels/plan.mjs --generar    además arma los videos
//
// La pregunta de fondo es cuántos reels por día conviene. La respuesta corta
// para una cuenta local chica: DOS fijos y uno más sólo si hay una noticia
// fuerte. Más que eso y tus propios reels se compiten entre ellos, porque a
// cada seguidor el algoritmo le muestra una cantidad limitada de posteos
// tuyos por día. Las historias son otra superficie y no compiten: ahí sí
// pueden ir seis a diez.

import fs from 'node:fs';
import path from 'node:path';
import { placaClima, placaFarmacia, placaNoticia, placaUtiles, placaAgenda, COLOR_SECCION } from './placa.mjs';
import { avisosDelClima } from '../ingesta/alertas.mjs';
import { NUMEROS } from '../ingesta/utiles.mjs';
import { horariosDe, toca } from '../panel/horarios.mjs';
import {
  elegirHistoriasDeNotas, elegirFeed, elegirParaPodcast, repasoConPresupuesto, enlaceDeNota,
} from '../redes/elegir.mjs';
import { CONTRATO_DIARIO, PIEZAS } from '../ingesta/criterio.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import {
  guionClima, guionClimaNoche, guionFarmacia, guionUtiles, guionAgenda, comoNombre,
} from '../redes/guiones.mjs';
import { INDICACIONES, momentoDeHora } from '../redes/prompt-redes.mjs';
import {
  HORAS_REELS, colorDelDia, horaHistoriaDeNota, HISTORIAS_DE_NOTAS, notasUsadasHoy, piezasPublicadasHoy, historiasQueSobran,
} from '../redes/piezas.mjs';

// El cupo de reels es el recurso escaso del día, así que NO se gasta en lo que
// se repite todas las mañanas. Clima, farmacia y agenda van a historias, que
// no compiten entre sí y son justo donde la gente busca ese dato. Los reels
// quedan libres para noticias: si un día no hay ninguna que valga, no sale
// ningún reel y está bien.
export const REGLAS = {
  reelsPorDia: 3, // techo duro, sólo noticias
  horasEntreReels: 4, // que no salgan pegados
  // Las historias del contrato son 6 (los tres podcasts, el clima de la mañana y
  // el de la noche, la farmacia) y el techo del día es 8: las 6 más como máximo
  // dos extras (teléfonos útiles y agenda). Se aplica de verdad en planDelDia.
  historiasPorDia: CONTRATO_DIARIO.historiasPorDia,
  historiasMaximasPorDia: CONTRATO_DIARIO.historiasMaximasPorDia,
  feedPorDia: 0, // apagado: Instagram no acepta fotos sin alojarlas; todo sale en video
  relevanciaParaHistoria: 62,
  relevanciaParaFeed: 80,
  horariosReel: HORAS_REELS,
};

// El color de la placa de teléfonos útiles (el mismo que usa reels/placa.mjs). Se había
// perdido en un refactor y, como los útiles sólo salían un día fijo que nadie
// corría, nadie lo notó: el plan se caía con ReferenceError el día que tocaba.
const COLOR_UTILES_ACENTO = '#8C2D18';

const DATOS = path.join(import.meta.dirname, '..', 'panel', 'datos', 'ultima.json');
const SALIDA = path.join(import.meta.dirname, 'salida');

const fechaLarga = (d = new Date()) => {
  const t = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const F_AGENDA = path.join(import.meta.dirname, '..', 'panel', 'datos', 'agenda.json');
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

/** Los eventos de los próximos días, listos para la placa. Si no hay agenda
 *  todavía, devuelve vacío: la pieza simplemente no se arma. */
function eventosProximos(dias = 4) {
  let agenda;
  try { agenda = JSON.parse(fs.readFileSync(F_AGENDA, 'utf8')); } catch { return []; }
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const tope = new Date(hoy.getTime() + dias * 86400000);

  return (agenda.municipio ?? []).map((e) => {
    const m = String(e.desde ?? '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (f < hoy || f > tope) return null;
    const dia = DIAS[f.getDay()];
    return {
      nombre: e.nombre,
      lugar: e.lugar,
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
// Ojo: esto todavía es una reescritura mecánica. En la Fase 2 el guion lo
// escribe el modelo, con las reglas de la línea editorial. Lo que no cambia
// nunca es la estructura: dato, contexto, fuente, remate.

// Dos reglas que valen para los tres guiones:
// 1. La voz NO lee la placa. La placa muestra el dato; la voz cuenta qué
//    significa. Si dicen lo mismo, la pieza dura el doble y no aporta nada.
// 2. La fuente no se nombra nunca en redes. La atribución y el link van en la
//    nota de la página, que es donde corresponde.

// Los guiones de las piezas fijas (clima, farmacia, teléfonos, agenda) y de los
// podcasts viven en redes/guiones.mjs, con su libro de recursos y el criterio de
// CRITERIO-REDES.md. Se re-exportan acá porque otros los importan de plan.mjs.
export {
  guionClima, guionClimaNoche, guionFarmacia, guionUtiles, guionAgenda,
};

// Cómo suena cada podcast según la hora se lee de CRITERIO-REDES.md (sección 6);
// se suma a la indicación de siempre. Se exportan con los nombres de siempre.
export const TONO_DE_LA_MANANA = INDICACIONES.manana;
export const TONO_DE_LA_TARDE = INDICACIONES.tarde;
export const TONO_DE_LA_NOCHE = INDICACIONES.noche;

export function guionNoticia(n) {
  // La voz dice el MISMO titular que está en la placa, y nada más.
  //
  // Antes contaba la noticia con el cuerpo de la nota y salían piezas de
  // veinticinco segundos. Una historia se mira cinco y se pasa: si a los
  // diez segundos todavía está hablando, ya nadie está mirando. Y que lo
  // dicho coincida con lo escrito tiene otra ventaja: los subtítulos
  // acompañan el titular en vez de tapar la placa con otro texto.
  //
  // Los reels van a poder ser más largos cuando haya alguien grabando en
  // cámara; hasta entonces, van igual que las historias.
  const titulo = String(n.titulo ?? '').replace(/\s+/g, ' ').trim().replace(/[.:]+$/, '');
  return `${titulo}.`;
}


// --- el plan ---------------------------------------------------------------

export function planDelDia(datos, {
  libro = null, fecha = new Date(), estado = leerEstado(), eventos = null,
} = {}) {
  const hoy = fecha.getDate();
  const turno = datos.farmacias?.turnos?.find((t) => t.dia === hoy) ?? null;

  // Sólo compiten por un reel las notas que salieron o que alguien aprobó,
  // nunca las que están esperando decisión.
  const publicables = datos.notas
    .filter((n) => n.semaforo !== 'rojo')
    .sort((a, b) => b.relevancia - a.relevancia);

  const piezas = [];

  // Los horarios y los días salen del panel (pestaña Calendario). Si una
  // pieza está apagada o hoy no le toca, directamente no se arma.
  const cuando = horariosConfigurados(estado);
  // `toca` (panel/horarios.mjs) es la MISMA función que usa el reloj de Redes:
  // los teléfonos útiles salen el día que rotan, o el que fijó el panel.
  const tocaHoy = (id) => toca(cuando[id], fecha, { estado });

  // --- El aviso de clima: la única pieza que no tiene horario -------------
  //
  // Helada fuerte, granizo o viento de más de 60 km/h. Sale cuando hay algo
  // que avisar y no cuando le toca, porque un aviso que espera a las 20:00
  // no es un aviso. Los umbrales están altos a propósito (ingesta/alertas.mjs):
  // si esto saltara todas las semanas dejaría de mirarlo nadie, y el día que
  // importa pasaría de largo.
  //
  // Sólo los graves. Un "posible helada" o un "calor extremo" ya están en la
  // tarjeta de la portada; interrumpir a alguien con una historia es para lo
  // que le puede costar plata o un susto.
  const avisos = avisosDelClima(datos.clima).filter((a) => a.gravedad === 'alta');
  if (avisos.length) {
    const a = avisos[0];
    piezas.push({
      tipo: 'historia',
      hora: 'ahora',
      nombre: `aviso-${a.tipo}`,
      titulo: a.titulo,
      motivo: 'aviso de clima · sale apenas se detecta, sin esperar horario',
      seccion: 'Clima',
      guion: `${a.titulo}. ${a.texto}`,
      svg: placaClima({
        temp: datos.clima.ahora.temp,
        cielo: a.titulo,
        max: datos.clima.dias[0].max,
        min: datos.clima.dias[0].min,
        fecha: fechaLarga(),
        hora: 'AVISO',
        kicker: 'ATENCIÓN',
        cajas: [
          { titulo: 'QUÉ', valor: a.titulo },
          { titulo: 'CUÁNDO', valor: a.dia === datos.clima.dias[0].fecha ? 'Hoy' : 'Mañana' },
        ],
      }),
      acento: COLOR_SECCION.Policiales ?? COLOR_SECCION.Clima,
    });
  }

  // --- Historias: lo de todos los días, que es servicio y no noticia -------
  if (datos.clima && tocaHoy('clima-manana')) {
    const c = datos.clima.ahora;
    const hoy = datos.clima.dias[0];
    const manana = datos.clima.dias[1];

    piezas.push({
      tipo: 'historia', hora: cuando['clima-manana'].hora, nombre: 'clima-manana', titulo: 'El clima de hoy',
      motivo: 'servicio fijo · no gasta cupo de reel', seccion: 'Clima',
      guion: guionClima(datos.clima, turno),
      momento: 'manana', indicacion: INDICACIONES.manana,
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        max: hoy.max,
        min: hoy.min,
        fecha: fechaLarga(),
        hora: '07:30',
        kicker: 'EL CLIMA DE HOY',
        cajas: [
          { titulo: 'VIENTO', valor: `${c.rumbo} ${c.viento} km/h` },
          { titulo: 'LLUVIA', valor: `${hoy.lluvia}%` },
          { titulo: 'SENSACIÓN', valor: `${c.sensacion}°` },
        ],
      }),
      acento: COLOR_SECCION.Clima,
    });

    // Segundo pase: de noche, cuando la gente ya está en casa y lo que
    // importa es cómo amanece mañana.
    if (tocaHoy('clima-noche')) piezas.push({
      tipo: 'historia', hora: cuando['clima-noche'].hora, nombre: 'clima-noche', titulo: 'Cómo sigue el día',
      motivo: 'segundo pase del clima · mira para adelante', seccion: 'Clima',
      guion: guionClimaNoche(datos.clima),
      momento: 'noche', indicacion: INDICACIONES.noche,
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        max: hoy.max,
        min: hoy.min,
        fecha: 'Cómo sigue el día',
        hora: '20:00',
        kicker: 'LA TARDE Y LA NOCHE',
        cajas: [
          { titulo: 'ESTA NOCHE', valor: `${hoy.min}°` },
          ...(manana ? [{ titulo: 'MAÑANA', valor: `${manana.max}° / ${manana.min}°` }] : []),
          { titulo: 'VIENTO', valor: `${c.rumbo} ${c.viento} km/h` },
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
        detalle: turno.detalle, farmacias: turno.farmacias, dia: turno.dia, diaSemana: turno.diaSemana,
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
      seccion: 'Servicios',
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

  // --- Reels: dos noticias con gancho y el podcast del día ------------------
  //
  // Las reglas de qué se puede armar solo (nada de Política ni Policiales)
  // y cómo se elige el gancho están en redes/elegir.mjs, donde se prueban.
  //
  // Con el libro de lo ya publicado, el plan sabe qué reels salieron y qué notas
  // se usaron hoy. Cuando a las 15:00 se arma sólo el reel 2, elige la mejor
  // nota que QUEDA y no repite la que ya salió a las 10:00.
  const usadas = notasUsadasHoy(libro);
  const hechas = piezasPublicadasHoy(libro);
  const libres = publicables.filter((n) => !usadas.has(n.id));

  // Tres podcasts por día en vez de noticias sueltas (24/09: una noticia sola
  // dicha en voz alta sonaba rara). Mañana y tarde cuentan tres notas de temas
  // distintos, sin repetir entre sí; el de la noche repasa lo más fuerte del
  // día. Cada uno lleva su lista de notas con el enlace en el texto del posteo,
  // y sin nombrar la fuente. Cada podcast se sube también como historia.
  const SITIO = process.env.SITIO ?? 'https://radarbalcarce.com';
  const RONDAS = [
    // Cada uno habla como corresponde a su hora: el saludo, el cierre y el tono
    // salen de CRITERIO-REDES.md, con variedad por fecha (redes/guiones.mjs).
    { nombre: 'noticia1', titulo: 'El repaso de la mañana', momento: 'manana' },
    { nombre: 'noticia2', titulo: 'El repaso de la tarde', momento: 'tarde' },
  ];
  const yaContadas = [];
  RONDAS.forEach((ronda, i) => {
    if (hechas.has(ronda.nombre)) return;
    // Con presupuesto de duración: cada podcast se sube también como historia y
    // una historia acepta 60 s. Si el guion no cabe en 55, se le sacan las
    // oraciones de contexto y después notas (mínimo 2): `elegidas` son las que quedaron.
    const repaso = repasoConPresupuesto(
      elegirParaPodcast(libres, { cuantas: PIEZAS.notasPorPodcast, excluir: yaContadas }), { momento: ronda.momento, fecha },
    );
    if (!repaso) return; // un podcast de una sola noticia no es un repaso
    const { guion, notas: elegidas } = repaso;
    yaContadas.push(...elegidas);
    piezas.push({
      tipo: 'reel', hora: REGLAS.horariosReel[i] ?? '21:00', nombre: ronda.nombre, notaId: elegidas[0].id,
      notaIds: elegidas.map((n) => n.id),
      items: elegidas.map((n) => ({ titulo: n.titulo, enlace: enlaceDeNota(n, SITIO) })),
      titulo: ronda.titulo, momento: ronda.momento, indicacion: INDICACIONES[ronda.momento],
      motivo: `podcast de ${elegidas.length} notas, las de más puntaje de temas distintos · ~${repaso.segundos.toFixed(0)} s`,
      segundosEstimados: repaso.segundos,
      seccion: 'Balcarce', guion,
      svg: placaNoticia({ seccion: 'Balcarce', titulo: ronda.titulo, cuando: fechaLarga(), color: colorDelDia() }),
      acento: colorDelDia(),
    });
  });

  // El podcast de la noche: el repaso de lo más fuerte del día. Sale cuando la
  // gente ya vio todo y quiere el resumen. Si ese día no hay al menos dos
  // noticias para repasar, no se arma.
  // También con presupuesto: el del 25/09 (4 notas, 62,7 s) dejó sin historia a las dos redes.
  const delDia = elegirParaPodcast(publicables, { cuantas: PIEZAS.notasPodcastNoche }, { relevanciaParaHistoria: 0 });
  const repasoNoche = repasoConPresupuesto(delDia, { momento: 'noche', fecha });
  if (repasoNoche && !hechas.has('podcast')) {
    const notasNoche = repasoNoche.notas;
    piezas.push({
      tipo: 'reel', hora: REGLAS.horariosReel[2] ?? '20:30', nombre: 'podcast',
      notaIds: notasNoche.map((n) => n.id),
      items: notasNoche.map((n) => ({ titulo: n.titulo, enlace: enlaceDeNota(n, SITIO) })),
      titulo: 'El repaso del día', motivo: `el podcast diario: los titulares más fuertes, un solo audio · ~${repasoNoche.segundos.toFixed(0)} s`,
      segundosEstimados: repasoNoche.segundos,
      seccion: 'Balcarce', guion: repasoNoche.guion, momento: 'noche', indicacion: INDICACIONES.noche,
      svg: placaNoticia({ seccion: 'Balcarce', titulo: 'El repaso del día', cuando: fechaLarga(), color: colorDelDia() }),
      acento: colorDelDia(),
    });
  }

  // --- Historias: además del clima y la farmacia, tres de notas ------------
  const slotsHistoria = Array.from({ length: HISTORIAS_DE_NOTAS }, (_, i) => (
    { nombre: `historia${i + 1}`, hora: horaHistoriaDeNota(i) }
  )).filter((sl) => !hechas.has(sl.nombre));

  elegirHistoriasDeNotas(libres, yaContadas).slice(0, slotsHistoria.length).forEach((n, i) => {
    piezas.push({
      tipo: 'historia', hora: slotsHistoria[i].hora, nombre: slotsHistoria[i].nombre, notaId: n.id,
      titulo: n.titulo, motivo: `relevancia ${n.relevancia}`, seccion: n.seccion,
      guion: guionNoticia(n),
      svg: placaNoticia({ seccion: n.seccion, titulo: n.titulo, cuando: n.cuando }),
      acento: COLOR_SECCION[n.seccion] ?? '#A8371F',
    });
  });

  (REGLAS.feedPorDia > 0 ? elegirFeed(publicables) : []).forEach((n, i) => {
    piezas.push({
      tipo: 'feed', hora: i === 0 ? '13:30' : '19:30', nombre: `feed${i + 1}`,
      titulo: n.titulo, motivo: `relevancia ${n.relevancia}`, seccion: n.seccion, sinVideo: true,
    });
  });

  // El techo: si hay más reels de los permitidos, se van los de menos motivo.
  const reels = piezas.filter((p) => p.tipo === 'reel');
  if (reels.length > REGLAS.reelsPorDia) {
    reels.slice(REGLAS.reelsPorDia).forEach((p) => { p.fueraDeTecho = true; });
  }

  // El techo de historias del día (8 = las 6 del contrato + 2 extras). Cuentan
  // los tres podcasts (cada uno se sube también como historia), aunque ya hayan
  // salido. Si se pasa, se dejan de armar los extras: primero los teléfonos
  // útiles, después la agenda. Las del contrato y los avisos nunca se sacan.
  const PODCASTS = ['noticia1', 'noticia2', 'podcast'];
  const historiasDelDia = [
    ...piezas.filter((p) => p.tipo === 'historia' || PODCASTS.includes(p.nombre)).map((p) => p.nombre),
    ...PODCASTS.filter((n) => hechas.has(n)),
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
  console.log(`  techo: ${REGLAS.reelsPorDia} reels, ${REGLAS.historiasPorDia} historias (hasta ${REGLAS.historiasMaximasPorDia} con los extras), ${REGLAS.feedPorDia} en el feed\n`);
  const icono = { reel: '\x1b[33mREEL     \x1b[0m', historia: '\x1b[36mHISTORIA \x1b[0m', feed: '\x1b[32mFEED     \x1b[0m' };
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
