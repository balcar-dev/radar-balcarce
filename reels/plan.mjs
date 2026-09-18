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
import { placaClima, placaFarmacia, placaNoticia, placaUtiles, COLOR_SECCION } from './placa.mjs';
import { armarReel } from './reel.mjs';
import { NUMEROS, tocaHoy } from '../ingesta/utiles.mjs';

// El cupo de reels es el recurso escaso del día, así que NO se gasta en lo que
// se repite todas las mañanas. Clima, farmacia y agenda van a historias, que
// no compiten entre sí y son justo donde la gente busca ese dato. Los reels
// quedan libres para noticias: si un día no hay ninguna que valga, no sale
// ningún reel y está bien.
export const REGLAS = {
  reelsPorDia: 3, // techo duro, sólo noticias
  horasEntreReels: 4, // que no salgan pegados
  relevanciaParaReel: 78,
  historiasPorDia: 10,
  feedPorDia: 2,
  relevanciaParaHistoria: 62,
  relevanciaParaFeed: 80,
  horariosReel: ['10:00', '15:00', '20:30'],
};

const DATOS = path.join(import.meta.dirname, '..', 'panel', 'datos', 'ultima.json');
const SALIDA = path.join(import.meta.dirname, 'salida');

const fechaLarga = (d = new Date()) => {
  const t = d.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function leerDatos() {
  if (!fs.existsSync(DATOS)) {
    throw new Error('Todavía no hay datos. Corré primero:  node panel/servidor.mjs  o  node ingesta/ingesta.mjs');
  }
  return JSON.parse(fs.readFileSync(DATOS, 'utf8'));
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

// El cronograma del Colegio viene todo en mayúsculas y así el sintetizador
// tiende a deletrear o a gritar: lo pasamos a nombre propio antes de leerlo.
const comoNombre = (s) => String(s).toLowerCase()
  .replace(/(^|\s|-)([a-záéíóúñ])/g, (_, a, b) => a + b.toUpperCase());

export function guionClima(clima, turno) {
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const partes = [`Buen día, Balcarce. Arrancamos con ${c.temp} grados.`];

  if (hoy.min <= 6) partes.push('Mañana fría: salí abrigado.');
  else if (hoy.min <= 11) partes.push('Está fresco temprano, pero afloja.');

  if (hoy.max >= 28) partes.push(`A la tarde aprieta: vamos a ${hoy.max} grados.`);
  else if (hoy.max - hoy.min >= 12) partes.push(`A la tarde levanta hasta ${hoy.max}, así que el abrigo te va a sobrar.`);
  else partes.push(`La máxima de hoy es de ${hoy.max} grados.`);

  if (hoy.lluvia >= 50) partes.push(`Hay muchas chances de lluvia, ${hoy.lluvia} por ciento: llevate el paraguas.`);
  else if (hoy.lluvia >= 25) partes.push('Puede caer algo suelto a la tarde.');
  else partes.push('No se espera lluvia.');

  if (c.viento >= 30) partes.push(`Ojo con el viento, que sopla a ${c.viento} kilómetros por hora.`);

  // La farmacia NO va acá: tiene su propia pieza a la tarde. Mezclarlas hace
  // que ninguna de las dos se recuerde.
  partes.push('Buen día.');
  return partes.join(' ');
}

// El segundo pase del clima no repite el de la mañana: mira para adelante.
export function guionClimaTarde(clima) {
  const c = clima.ahora;
  const hoy = clima.dias[0];
  const manana = clima.dias[1];
  const partes = [`Buenas tardes, Balcarce. En este momento hay ${c.temp} grados.`];

  if (hoy.min <= 8) partes.push(`Esta noche refresca fuerte, baja hasta ${hoy.min}.`);
  else partes.push(`Esta noche la mínima va a ser de ${hoy.min} grados.`);

  if (manana) {
    if (manana.lluvia >= 50) partes.push(`Y ojo mañana, que se viene agua: ${manana.lluvia} por ciento de probabilidad.`);
    else if (manana.max - hoy.max >= 4) partes.push(`Mañana levanta: máxima de ${manana.max} grados.`);
    else if (hoy.max - manana.max >= 4) partes.push(`Mañana baja un poco, máxima de ${manana.max}.`);
    else partes.push(`Mañana, parecido: máxima de ${manana.max} grados.`);
  }
  partes.push('Seguimos actualizando en radar balcarce punto com punto a ere.');
  return partes.join(' ');
}

export function guionFarmacia(turno) {
  const lista = turno.detalle?.length ? turno.detalle : turno.farmacias.map((n) => ({ nombre: n }));
  const dichas = lista.map((f) => {
    const n = comoNombre(f.nombre);
    // La dirección se dice, no sólo se muestra: mucha gente escucha el reel
    // mientras hace otra cosa.
    return f.direccion ? `${n}, en ${f.direccion.replace(/N°/g, 'número').replace(/e\//g, 'entre')}` : n;
  });
  const cual = dichas.length > 1
    ? `hay dos de turno: ${dichas.join(', y también ')}`
    : `la de turno es ${dichas[0]}`;
  return `Si esta noche necesitás una farmacia en Balcarce, ${cual}. `
    + 'Está abierta hasta mañana a las nueve de la mañana. Guardá el dato, que te puede salvar una madrugada.';
}

const COLOR_UTILES_ACENTO = '#8C2D18';

export function guionUtiles() {
  return 'Una vez por semana te dejamos los teléfonos que sirve tener a mano en Balcarce: '
    + 'emergencias, el hospital, la comisaría y los servicios del municipio. '
    + 'Guardalos ahora, que después te olvidás. Los demás números están en la página.';
}

export function guionNoticia(n) {
  // Se cuenta el hecho, no se lee el titular. El titular ya está en la placa.
  const cuerpo = (n.copete || n.resumenFuente || '').replace(/\s+/g, ' ').trim();
  const oraciones = cuerpo.split(/(?<=[.!?])\s+/)
    .map((o) => o.trim())
    .filter((o) => o.length > 35 && /[.!?]$/.test(o) && !o.endsWith('...')
      && o.toLowerCase() !== n.titulo.toLowerCase());

  let cuerpoDicho = [];
  let palabras = 0;
  for (const o of oraciones) {
    const largo = o.split(/\s+/).length;
    if (palabras + largo > 55) break;
    cuerpoDicho.push(o);
    palabras += largo;
    if (cuerpoDicho.length === 2) break;
  }

  // Si la fuente no dejó cuerpo aprovechable, al menos no repetimos el título
  // palabra por palabra: lo damos como entrada hablada.
  if (!cuerpoDicho.length) cuerpoDicho = [`Te contamos: ${n.titulo}.`];

  const entrada = n.seccion === 'Automovilismo' ? 'Atención los fierreros.'
    : n.seccion === 'Deportes' ? 'Deportes en Balcarce.'
      : n.seccion === 'Servicios' ? 'Dato útil para hoy.'
        : 'Lo que pasó en Balcarce.';

  return [entrada, ...cuerpoDicho, 'La nota completa está en radar balcarce punto com punto a ere.'].join(' ');
}

// --- el plan ---------------------------------------------------------------

export function planDelDia(datos) {
  const hoy = new Date().getDate();
  const turno = datos.farmacias?.turnos?.find((t) => t.dia === hoy) ?? null;

  // Sólo compiten por un reel las notas que salieron o que alguien aprobó,
  // nunca las que están esperando decisión.
  const publicables = datos.notas
    .filter((n) => n.semaforo !== 'rojo')
    .sort((a, b) => b.relevancia - a.relevancia);

  const piezas = [];

  // --- Historias: lo de todos los días, que es servicio y no noticia -------
  if (datos.clima) {
    const c = datos.clima.ahora;
    const hoy = datos.clima.dias[0];
    const manana = datos.clima.dias[1];

    piezas.push({
      tipo: 'historia', hora: '07:30', nombre: 'clima-manana', titulo: 'El clima de hoy',
      motivo: 'servicio fijo · no gasta cupo de reel', seccion: 'Clima',
      guion: guionClima(datos.clima, turno),
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

    // Segundo pase: a media tarde, mirando la noche y el día siguiente.
    piezas.push({
      tipo: 'historia', hora: '16:30', nombre: 'clima-tarde', titulo: 'Cómo sigue el día',
      motivo: 'segundo pase del clima · mira para adelante', seccion: 'Clima',
      guion: guionClimaTarde(datos.clima),
      svg: placaClima({
        temp: c.temp,
        cielo: c.cielo,
        max: hoy.max,
        min: hoy.min,
        fecha: 'Cómo sigue el día',
        hora: '16:30',
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
  if (turno) {
    piezas.push({
      tipo: 'historia', hora: '19:15', nombre: 'farmacia', titulo: `Farmacia de turno: ${comoNombre(turno.farmacias.join(' y '))}`,
      motivo: 'a la hora en que cierran las demás', seccion: 'Farmacias',
      guion: guionFarmacia(turno),
      svg: placaFarmacia({
        detalle: turno.detalle, farmacias: turno.farmacias, dia: turno.dia, diaSemana: turno.diaSemana,
      }),
      acento: COLOR_SECCION.Farmacias,
    });
  }

  // Números útiles: una vez por semana, día variable (ingesta/utiles.mjs
  // decide cuál). No es noticia ni clima: es contenido de utilidad pura, así
  // que no compite por cupo de reel ni tiene por qué salir todos los días.
  if (tocaHoy()) {
    const grupos = [...new Set(NUMEROS.map((n) => n.categoria))]
      .map((categoria) => ({ categoria, items: NUMEROS.filter((n) => n.categoria === categoria) }));
    piezas.push({
      tipo: 'historia', hora: '11:00', nombre: 'utiles',
      titulo: 'Teléfonos útiles de Balcarce', motivo: 'una vez por semana, día variable',
      seccion: 'Servicios',
      guion: guionUtiles(),
      svg: placaUtiles({ grupos }),
      acento: COLOR_UTILES_ACENTO,
    });
  }

  // --- Reels: sólo noticias, y sólo las que se lo ganan --------------------
  const paraReel = publicables
    .filter((n) => n.local && n.relevancia >= REGLAS.relevanciaParaReel)
    .slice(0, REGLAS.reelsPorDia);

  paraReel.forEach((n, i) => {
    piezas.push({
      tipo: 'reel', hora: REGLAS.horariosReel[i] ?? '21:00', nombre: `noticia${i + 1}`,
      titulo: n.titulo,
      motivo: `relevancia ${n.relevancia}, arriba del piso de ${REGLAS.relevanciaParaReel}`,
      seccion: n.seccion,
      guion: guionNoticia(n),
      svg: placaNoticia({ seccion: n.seccion, titulo: n.titulo, cuando: n.cuando }),
      acento: COLOR_SECCION[n.seccion] ?? '#A8371F',
    });
  });

  const paraHistorias = publicables
    .filter((n) => !paraReel.includes(n) && n.relevancia >= REGLAS.relevanciaParaHistoria)
    .slice(0, REGLAS.historiasPorDia - 2);
  paraHistorias.forEach((n, i) => {
    piezas.push({
      tipo: 'historia', hora: `${String(10 + i).padStart(2, '0')}:40`, nombre: `historia${i + 1}`,
      titulo: n.titulo, motivo: `relevancia ${n.relevancia}`, seccion: n.seccion, sinVideo: true,
    });
  });

  publicables.filter((n) => n.relevancia >= REGLAS.relevanciaParaFeed).slice(0, REGLAS.feedPorDia)
    .forEach((n, i) => {
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

  return { piezas, turno };
}

// --- ejecución -------------------------------------------------------------

if (process.argv[1] && process.argv[1].endsWith('plan.mjs')) {
  const datos = leerDatos();
  const { piezas } = planDelDia(datos);

  console.log(`\n\x1b[1mPLAN DEL DÍA · ${fechaLarga()}\x1b[0m`);
  console.log(`  techo: ${REGLAS.reelsPorDia} reels, ${REGLAS.historiasPorDia} historias, ${REGLAS.feedPorDia} en el feed\n`);
  const icono = { reel: '\x1b[33mREEL     \x1b[0m', historia: '\x1b[36mHISTORIA \x1b[0m', feed: '\x1b[32mFEED     \x1b[0m' };
  for (const p of piezas) {
    console.log(`  ${p.hora}  ${icono[p.tipo]} ${p.titulo.slice(0, 68)}`);
    console.log(`         ${p.seccion} · ${p.motivo}${p.fueraDeTecho ? ' · \x1b[31mno sale: pasa el techo\x1b[0m' : ''}`);
  }

  if (process.argv.includes('--generar')) {
    // --solo=clima-manana,farmacia rehace sólo esas, sin gastar pedidos en el resto.
    const solo = (process.argv.find((a) => a.startsWith('--solo='))?.slice(7) ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean);

    console.log('\n\x1b[1mARMANDO LOS VIDEOS\x1b[0m');
    for (const p of piezas.filter((x) => x.svg && !x.fueraDeTecho
      && (!solo.length || solo.includes(x.nombre)))) {
      process.stdout.write(`  ${p.nombre}… `);
      try {
        const r = await armarReel(p, SALIDA);
        console.log(`\x1b[32mlisto\x1b[0m ${path.basename(r.mp4)} · ${r.duracion.toFixed(1)} s · voz ${r.vozUsada}`);
      } catch (e) {
        console.log(`\x1b[31mfalló\x1b[0m ${e.message.split('\n')[0]}`);
      }
    }
    console.log(`\n  Quedaron en ${SALIDA}\n`);
  } else {
    console.log('\n  Para armar los videos:  node reels/plan.mjs --generar\n');
  }
}
