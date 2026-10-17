// El guion de todo un día, armado con los datos reales de web/data/portada.json y la línea editorial del día (regla 301). NO llama a Gemini, no pide voz,
// no gasta cupo y no publica nada: sólo escribe lo que diría cada pieza, con la voz que le toca, cuánto duraría y si cumple las reglas.
//
//   node reels/guion-del-dia.mjs                      el día de la portada, desde las 6 de la mañana, en la consola
//   node reels/guion-del-dia.mjs --md=ruta.md         lo escribe como un documento (docs/redes/GUION-DEL-DIA-EJEMPLO.md)
//   node reels/guion-del-dia.mjs --sin-extras         sin los teléfonos útiles, la agenda y Participá (lo que no sale todos los días)
//   node reels/guion-del-dia.mjs --sin-ayer           sin simular el repaso con el que cerró ayer
//
// Para mostrar lo de "ayer" y lo ya contado, el día se arma como si ayer hubiera cerrado un repaso con tres notas de la portada: es una simulación del
// libro de redes (web/data/redes.json), sólo para el ejemplo.

import fs from 'node:fs';
import path from 'node:path';
import { planDelDia } from './plan.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import { diaAR } from '../ingesta/zona.mjs';
import {
  revisarTexto, segundosDe, segundosDePodcast, CLIMA_VOZ, PIEZA_FIJA_VOZ, PODCAST_VOZ,
} from '../redes/guiones.mjs';
import {
  rolDe, estructuraDe, problemasDeLaLinea, temaDe, SEGUNDOS_MAXIMOS_DE_UN_DATO,
} from '../redes/linea-del-dia.mjs';
import { REPARTO, momentoDeHora } from '../redes/prompt-redes.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), 'utf8'));

const NOMBRES = {
  'clima-manana': 'El clima de la mañana', efemeride: 'Un día como hoy', feriado: 'El feriado', noticia1: 'El repaso de la mañana', noticia2: 'El repaso de la tarde',
  podcast: 'El repaso del día', farmacia: 'La farmacia de turno', 'clima-noche': 'El clima de la noche', utiles: 'Los teléfonos útiles', agenda: 'La agenda',
  'participa-noticias': 'Participá · noticias', 'participa-evento': 'Participá · evento', 'participa-reclamos': 'Participá · reclamos', 'participa-nota': 'Participá · nota',
};

/** Cuánto dura una pieza y el tope que le toca, en segundos. */
function duracion(p) {
  const rol = rolDe(p.nombre);
  if (['repaso-manana', 'repaso-tarde', 'cierre-del-dia'].includes(rol)) return { s: segundosDePodcast(p.guion), tope: PODCAST_VOZ.segundosPresupuesto };
  if (rol === 'apertura' || rol === 'clima-noche') return { s: segundosDe(p.guion), tope: CLIMA_VOZ.segundosMaximo };
  if (rol === 'dato') return { s: segundosDe(p.guion), tope: SEGUNDOS_MAXIMOS_DE_UN_DATO };
  return { s: segundosDe(p.guion), tope: PIEZA_FIJA_VOZ.segundosMaximo };
}

/** El día entero: { piezas, dia, notas }. `ayer` simula el repaso con el que cerró ayer (tres notas de la portada). */
export function diaDeEjemplo({ hora = '06:00', extras = true, ayer = true } = {}) {
  const portada = leer('web/data/portada.json');
  const banco = leer('web/data/banco-fotos.json');
  const dia = diaAR(new Date(portada.generado));
  const fecha = new Date(`${dia}T${hora}:00-03:00`);
  const ayerDia = diaAR(new Date(fecha.getTime() - 86400e3));
  const nombrables = portada.notas.filter((n) => temaDe(n.seccion));
  const libro = ayer ? { instagram: { [`${ayerDia}/podcast`]: { notaIds: nombrables.slice(-3).map((n) => n.id) } } } : null;
  const datos = { ...datosDeLaWeb(portada), generado: null };
  const { piezas } = planDelDia(datos, {
    fecha, libro, eventos: portada.agenda?.eventos ?? [], banco, forzar: extras ? ['utiles', 'agenda', 'participa-noticias'] : [],
  });
  return { piezas, dia, fecha, portada };
}

/** El documento en Markdown. */
export function comoMarkdown({ piezas, dia, portada }) {
  const lineas = [];
  const ordenadas = piezas.filter((p) => rolDe(p.nombre)).sort((a, b) => a.hora.localeCompare(b.hora));
  const titulares = portada.notas.map((n) => n.titulo);
  for (const p of ordenadas) {
    const d = duracion(p);
    const e = estructuraDe(p.guion);
    const voz = REPARTO[p.nombre];
    const salida = p.fueraDeTecho ? ' · **no sale hoy** (pasa el techo de historias del día)' : '';
    lineas.push(`### ${p.hora} · ${NOMBRES[p.nombre] ?? p.nombre} (${p.tipo === 'reel' ? 'reel y historia' : 'historia'}) · ${voz === 'locutora' ? 'la locutora' : 'el locutor'} · ${d.s.toFixed(0)} s de ${d.tope}${salida}`);
    lineas.push('');
    lineas.push(`> ${p.guion}`);
    lineas.push('');
    const partes = [
      `**gancho** (${e.gancho.split(/\s+/).length} palabras): ${e.gancho}`,
      p.linea?.hizo?.length ? `**la línea hizo**: ${p.linea.hizo.join(', ')}${p.linea.hacia ? ` (anuncia ${NOMBRES[p.linea.hacia] ?? p.linea.hacia})` : ''}` : null,
      `**llamado**: ${e.llamado}`,
    ].filter(Boolean);
    lineas.push(partes.join(' · '));
    lineas.push('');
  }
  const problemas = problemasDeLaLinea(ordenadas, { titulares });
  const reglas = ordenadas.filter((p) => !p.fueraDeTecho).flatMap((p) => revisarTexto(p.guion, { tipo: 'voz' }).filter((x) => !/saluda con otro horario|repite "Balcarce"/.test(x)).map((x) => `${p.nombre}: ${x}`));
  return { texto: lineas.join('\n'), problemas, reglas, dia, momentos: ordenadas.map((p) => momentoDeHora(p.hora)) };
}

if (process.argv[1] && process.argv[1].endsWith('guion-del-dia.mjs')) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const dia = diaDeEjemplo({ extras: !process.argv.includes('--sin-extras'), ayer: !process.argv.includes('--sin-ayer') });
  const m = comoMarkdown(dia);
  const salida = arg('md');
  if (salida) {
    fs.writeFileSync(salida, `${m.texto}\n`, 'utf8');
    console.log(`escrito ${salida}`);
  } else {
    console.log(m.texto);
  }
  console.log(`\nProblemas de la línea: ${m.problemas.length ? m.problemas.join(' | ') : 'ninguno'}`);
  console.log(`Reglas de la voz: ${m.reglas.length ? m.reglas.join(' | ') : 'todas se cumplen'}`);
}
