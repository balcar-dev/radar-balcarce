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

const AQUI = import.meta.dirname;
const DATOS_PANEL = path.join(AQUI, '..', '..', 'panel', 'datos');
const SALIDA = path.join(AQUI, '..', 'data', 'portada.json');

function leerJson(archivo, porDefecto = null) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return porDefecto; }
}

const estado = leerJson(path.join(DATOS_PANEL, 'estado.json'), { decisiones: {} });
const ultima = leerJson(path.join(DATOS_PANEL, 'ultima.json'), { notas: [] });
const agenda = leerJson(path.join(DATOS_PANEL, 'agenda.json'), null);

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
  };
}

const notas = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean)
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const hoy = new Date().getDate();
const turnoHoy = ultima.farmacias?.turnos?.find((t) => t.dia === hoy) ?? null;
const proximosTurnos = (ultima.farmacias?.turnos ?? []).filter((t) => t.dia >= hoy).slice(0, 6);

const salida = {
  generado: new Date().toISOString(),
  notas,
  secciones: [...new Set(notas.map((n) => n.seccion))],
  clima: ultima.clima ?? null,
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
