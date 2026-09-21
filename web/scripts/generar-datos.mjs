// Genera web/data/portada.json a partir de lo que ya decidió el panel.
//
// Por qué un archivo estático y no una conexión en vivo al panel: la web
// se va a desplegar en Vercel, que no puede leer los archivos de tu PC.
// La forma correcta de resolver esto sin armar una base de datos todavía
// es la que ya estaba planeada desde el principio (ver NOTAS.md, fase 2):
// GitHub Actions corre la ingesta, y en vez de dejarla en tu PC, ACTUALIZA
// este archivo y lo sube al repo — eso dispara un redeploy automático en
// Vercel. Mientras tanto, para probar en tu máquina, este script hace lo
// mismo a mano.
//
// La lógica de "qué nota está publicada" es la misma que usa
// panel/servidor.mjs en su función vista() — se repite acá a propósito
// (son 15 líneas) para no atar la web a que el servidor del panel esté
// corriendo: la web sólo necesita el JSON, nunca el proceso.
//
//   node scripts/generar-datos.mjs

import fs from 'node:fs';
import path from 'node:path';
import { NUMEROS, tocaHoy, diaDeEstaSemana, diaDeTurno, comoISO } from '../../ingesta/utiles.mjs';
import { avisosDelClima } from '../../ingesta/alertas.mjs';
import { TEMAS } from '../../ingesta/fuentes.mjs';

const AQUI = import.meta.dirname;
const DATOS_PANEL = path.join(AQUI, '..', '..', 'panel', 'datos');
const SALIDA = path.join(AQUI, '..', 'data', 'portada.json');

function leerJson(archivo, porDefecto = null) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

// Este script corre en dos lugares distintos:
//
//   · En la PC que tiene el panel, que es donde viven las decisiones.
//   · En GitHub Actions, donde no hay panel: ahí se sale a buscar las
//     noticias en el momento y las decisiones se leen del archivo que el
//     panel exporta al repositorio (web/data/decisiones.json).
//
// El segundo caso es lo que permite que el sitio se actualice solo con la
// computadora apagada.
const enLaNube = !fs.existsSync(path.join(DATOS_PANEL, 'ultima.json'));

let estado;
let ultima;
let agenda;

if (enLaNube) {
  const { ingestar } = await import('../../ingesta/ingesta.mjs');
  const { agendaCompleta } = await import('../../ingesta/agenda.mjs');
  console.log('  sin panel a mano: se buscan las noticias ahora');
  ultima = await ingestar({ silencioso: true });
  agenda = await agendaCompleta().catch(() => null);
  const exportado = leerJson(path.join(AQUI, '..', 'data', 'decisiones.json'), { decisiones: {} });
  estado = { decisiones: exportado.decisiones ?? {} };
  console.log(`  ${ultima.notas.length} historias · ${Object.keys(estado.decisiones).length} decisiones del panel`);
} else {
  estado = leerJson(path.join(DATOS_PANEL, 'estado.json'), { decisiones: {} });
  ultima = leerJson(path.join(DATOS_PANEL, 'ultima.json'), { notas: [] });
  agenda = leerJson(path.join(DATOS_PANEL, 'agenda.json'), null);
}

// Mismo criterio que el panel: sin decisión manda el semáforo (verde =
// automática, rojo = bloqueada, el resto pendiente). Sólo lo publicado o
// automático llega a la web.
// Cuándo vimos cada nota por primera vez.
//
// Las fuentes que no publican la hora obligaban a mostrar "sin hora", que
// se lee como un error nuestro. Sabemos algo honesto y útil: cuándo la
// vimos aparecer. La ingesta no sirve para eso —a una nota sin fecha le
// pone la hora de ahora, así que se mueve en cada corrida—, pero la
// portada anterior está versionada en el repositorio y corre tanto acá
// como en GitHub Actions. De ahí sale el primer avistaje, y no se pisa.
const anterior = leerJson(SALIDA, { notas: [] });
const vistoAntes = Object.fromEntries((anterior.notas ?? [])
  .filter((n) => n.visto)
  .map((n) => [n.id, n.visto]));
const ahoraISO = new Date().toISOString();

function notaPublicada(n) {
  const d = estado.decisiones[n.id];
  const st = d?.estado ?? ({ verde: 'automatica', rojo: 'bloqueada' }[n.semaforo] ?? 'pendiente');
  if (st !== 'publicada' && st !== 'automatica') return null;
  return {
    id: n.id,
    titulo: d?.titulo ?? n.titulo,
    copete: d?.copete ?? n.resumenFuente ?? '',
    guion: d?.guion ?? null,
    seccion: n.seccion,
    medios: n.medios,
    enlace: n.enlace,
    // La imagen de la fuente NO se publica: es obra protegida del medio
    // que la sacó, y la excepción de "noticias de interés general" de la
    // ley 11.723 cubre el texto, no las fotos. Se guarda sólo el dato de
    // si la fuente tenía imagen, por si algún día sirve para priorizar.
    teniaImagenLaFuente: !!n.imagen,
    fecha: n.fecha,
    // Cuando la fuente no publica la hora, la ingesta pone la de ahora para
    // poder ordenar. Se guarda el aviso para que la web no mienta un
    // "hace 1 minuto" que no es cierto.
    sinFecha: n.cuando === 'sin fecha en la fuente',
    // La primera vez que la vimos. Sólo se usa cuando la fuente no dio
    // hora; para el resto manda la fecha del medio.
    visto: vistoAntes[n.id] ?? ahoraISO,
    relevancia: n.relevancia,
    local: n.local,
    publicadaPor: d?.por ?? null,
    publicadaCuando: d?.cuando ?? null,
    // Cómo llegó a publicarse: sola por el semáforo verde, o porque
    // alguien la miró y le dio el visto bueno. La nota lo dice al pie.
    // Que parte de lo que publicamos lo redacte una IA no es algo para
    // esconder en la letra chica: el día que alguien lo descubra por su
    // cuenta, va a parecer que lo escondíamos.
    // Los temas de larga duración que toca. En un pueblo las historias
    // duran meses: el que entra por una nota del autódromo tiene que
    // poder ver las otras once.
    temas: n.temas ?? [],
    como: st,
  };
}

const notas = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean)
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Qué farmacia está de turno AHORA. La regla del cambio a las 9 de la
// mañana está en ingesta/utiles.mjs, con su explicación.
const delTurno = diaDeTurno();
const hoyISO = comoISO(delTurno);
const hoy = delTurno.getDate();

// Si un cronograma viejo no trae fecha armada, se cae al número de día.
const esHoy = (t) => (t.fecha ? t.fecha === hoyISO : t.dia === hoy);
const yaViene = (t) => (t.fecha ? t.fecha >= hoyISO : t.dia >= hoy);
const turnoHoy = ultima.farmacias?.turnos?.find(esHoy) ?? null;
const proximosTurnos = (ultima.farmacias?.turnos ?? []).filter(yaViene).slice(0, 6);

const salida = {
  generado: new Date().toISOString(),
  notas,
  secciones: [...new Set(notas.map((n) => n.seccion))],
  // Sólo los temas que hoy tienen al menos dos notas publicadas: uno con
  // una sola nota no es un tema, es una etiqueta suelta.
  temas: TEMAS
    .map((t) => ({ ...t, palabras: undefined, cuantas: notas.filter((n) => n.temas?.includes(t.ranura)).length }))
    .filter((t) => t.cuantas >= 2)
    .sort((a, b) => b.cuantas - a.cuantas),
  clima: ultima.clima ?? null,
  // Los avisos se calculan acá y no en el navegador: la web es estática y
  // así el aviso ya está en el HTML, sin esperar a que cargue nada.
  avisosClima: avisosDelClima(ultima.clima),
  farmacias: { hoy: turnoHoy, proximos: proximosTurnos, avisos: ultima.farmacias?.avisos ?? [] },
  agenda: {
    municipio: (agenda?.municipio ?? []).slice(0, 30),
    proximosAnuales: agenda?.proximosAnuales ?? [],
  },
  utiles: { numeros: NUMEROS, diaDeLaSemana: diaDeEstaSemana(), tocaHoy: tocaHoy() },
};

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
// ¿Cambió algo que justifique volver a publicar?
//
// `generado` cambia en cada corrida por definición, así que el archivo
// siempre difiere y el workflow siempre commitea — y cada commit dispara una
// compilación entera del sitio en Vercel.
//
// Hoy eso no molesta: las nueve corridas de ayer publicaron contenido nuevo
// las nueve, porque en un pueblo con 24 fuentes en una hora siempre se movió
// algo. Pero una noche tranquila, o el día que compilar cinco mil notas
// tarde minutos, esto se paga.
//
// La temperatura merece una regla propia. Se mueve un grado cada media hora
// y sola no justifica recompilar ciento setenta páginas, sobre todo porque
// la tarjeta se corrige en el navegador a los dos segundos de abrir la
// página. Pero tampoco puede quedar congelada: un "el clima ahora" de hace
// seis horas es mentira. Dos grados, o que cambie el cielo, sí publican.
function cambioQueImporta(antes, ahora) {
  if (!antes?.notas?.length) return true;

  const salvoClima = (o) => JSON.stringify({ ...o, generado: null, clima: null });
  if (salvoClima(antes) !== salvoClima(ahora)) return true;

  const a = antes.clima?.ahora ?? {};
  const b = ahora.clima?.ahora ?? {};
  if (a.cielo !== b.cielo || a.esDeDia !== b.esDeDia) return true;
  if (Math.abs((a.temp ?? 0) - (b.temp ?? 0)) >= 2) return true;

  // El pronóstico de los próximos días sí se publica siempre que cambie: no
  // se mueve cada media hora y es lo que alguien mira para mañana.
  return JSON.stringify(antes.clima?.dias) !== JSON.stringify(ahora.clima?.dias);
}

if (cambioQueImporta(anterior, salida)) {
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`  portada.json: ${notas.length} notas publicadas, generado ${salida.generado}`);
} else {
  console.log('  sin novedades: la portada quedó igual, no se toca el archivo');
}
