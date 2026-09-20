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
import { NUMEROS, tocaHoy, diaDeEstaSemana } from '../../ingesta/utiles.mjs';
import { avisosDelClima } from '../../ingesta/alertas.mjs';

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
    relevancia: n.relevancia,
    local: n.local,
    publicadaPor: d?.por ?? null,
    publicadaCuando: d?.cuando ?? null,
    // Cómo llegó a publicarse: sola por el semáforo verde, o porque
    // alguien la miró y le dio el visto bueno. La nota lo dice al pie.
    // Que parte de lo que publicamos lo redacte una IA no es algo para
    // esconder en la letra chica: el día que alguien lo descubra por su
    // cuenta, va a parecer que lo escondíamos.
    como: st,
  };
}

const notas = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean)
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Los turnos se comparan por fecha completa y no por número de día: el
// cronograma del Colegio arranca el mes siguiente sin cortar, y el 30 de
// septiembre lo que sigue es el 3 de octubre, no el 3 de septiembre.
const ahora = new Date();
const hoyISO = [
  ahora.getFullYear(),
  String(ahora.getMonth() + 1).padStart(2, '0'),
  String(ahora.getDate()).padStart(2, '0'),
].join('-');
const hoy = ahora.getDate();
// Si un cronograma viejo no trae fecha armada, se cae al número de día.
const esHoy = (t) => (t.fecha ? t.fecha === hoyISO : t.dia === hoy);
const yaViene = (t) => (t.fecha ? t.fecha >= hoyISO : t.dia >= hoy);
const turnoHoy = ultima.farmacias?.turnos?.find(esHoy) ?? null;
const proximosTurnos = (ultima.farmacias?.turnos ?? []).filter(yaViene).slice(0, 6);

const salida = {
  generado: new Date().toISOString(),
  notas,
  secciones: [...new Set(notas.map((n) => n.seccion))],
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
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
console.log(`  portada.json: ${notas.length} notas publicadas, generado ${salida.generado}`);
