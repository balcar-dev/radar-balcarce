// Genera web/data/portada.json a partir de lo que ya decidió el panel.
//
// Por qué un archivo estático y no una conexión en vivo al panel: la web
// es HTML estático en Cloudflare Pages, que no puede leer los archivos de la
// PC. GitHub Actions corre la ingesta, ACTUALIZA este archivo y lo sube al
// repo; después "Cloudflare Pages" compila y publica. En la PC, este script
// hace lo mismo a mano.
//
// La lógica de "qué nota está publicada" es la misma que usa
// panel/servidor.mjs en su función vista() — se repite acá a propósito
// (son 15 líneas) para no atar la web a que el servidor del panel esté
// corriendo: la web sólo necesita el JSON, nunca el proceso.
//
//   node scripts/generar-datos.mjs

import fs from 'node:fs';
import path from 'node:path';
import { NUMEROS, tocaHoy, diaDeEstaSemana, diaDeTurno, comoISO, decisionHumana } from '../../ingesta/utiles.mjs';
import { avisosDelClima } from '../../ingesta/alertas.mjs';
import {
  reescribirAutomaticas, previasDeLaPortada, extrasParaLaWeb, sinExtras, CAMPOS_EXTRA, podarIntentos,
} from '../../reels/reescritura.mjs';
import { TEMAS, MOTIVO_COTIZACION } from '../../ingesta/fuentes.mjs';
import { tieneCuerpo } from '../lib/cuerpo.js';
import { pendientesDeLaIngesta } from '../../redes/avisos.mjs';
import {
  vigenteEnPortada, slugsConocidos, fijarSlug, actualizarArchivo, idsEnRedes, sinPuntaje, comoArchivoJson,
} from '../lib/archivo.js';
import { actualizarAgenda, comoAgendaJson } from '../lib/eventos.js';
import { traerDolar } from '../lib/dolar.js';
import {
  cuandoArmarDolar, entradaDelDia, sumarAlHistorial, comoHistoriaJson, notasDelDolar, notasDeRepasos,
} from '../lib/notas-propias.js';

const AQUI = import.meta.dirname;
const DATOS_PANEL = path.join(AQUI, '..', '..', 'panel', 'datos');
const SALIDA = path.join(AQUI, '..', 'data', 'portada.json');
// Todo lo publicado, aunque ya no esté en la portada: ver lib/archivo.js.
const ARCHIVO = path.join(AQUI, '..', 'data', 'archivo.json');
// El libro de lo publicado en las redes: de ahí salen las direcciones de los
// enlaces que ya están en Facebook.
const LIBRO_REDES = path.join(AQUI, '..', 'data', 'redes.json');
// Los eventos con página propia (/agenda/<nombre>-<id>): los del municipio y
// los que se publicaron desde el panel, más los que ya pasaron hace menos de
// 60 días. Ver lib/eventos.js.
const AGENDA_WEB = path.join(AQUI, '..', 'data', 'agenda.json');
// Lo que el panel publicó en la pestaña Agenda (lo sube panel/sincronizar.mjs).
const EVENTOS_PANEL = path.join(AQUI, '..', 'data', 'eventos-panel.json');
// Cuántas veces se le pidió cada nota a Gemini (reels/reescritura.mjs,
// MAXIMO_DE_INTENTOS): { id: { intentos, ultimo, motivo } }, podado a 7 días.
// Va versionado: es la única memoria entre corridas de lo que NO salió.
const INTENTOS_IA = path.join(AQUI, '..', 'data', 'intentos-ia.json');
// La cotización del dólar de las 11 de cada día hábil, 60 días: de ahí sale la
// nota propia del dólar y su comparación con días anteriores
// (lib/notas-propias.js). Va versionado, como intentos-ia.json.
const HISTORIA_DOLAR = path.join(AQUI, '..', 'data', 'dolar-historia.json');

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

  // Una fuente que se vacía no avisa. Tres de las 24 se leen raspando el
  // HTML de la página: el día que El Diario la rediseñe, esas notas dejan
  // de entrar sin ningún error, y lo único que se nota es que el sitio
  // tiene menos. Estas líneas ("::warning::") las muestra GitHub arriba de
  // la corrida, donde se ve sin abrir el registro.
  for (const f of ultima.fuentes ?? []) {
    if (f.estado === 'error') console.log(`::warning title=Fuente caída::${f.nombre}: ${f.error}`);
    else if (f.notas === 0) console.log(`::warning title=Fuente vacía::${f.nombre} no trajo ninguna nota`);
  }
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
// El archivo también guarda el primer avistaje: una nota que salió de la
// portada y vuelve no cambia de hora.
const archivoAnterior = leerJson(ARCHIVO, { notas: [] });
const vistoAntes = Object.fromEntries([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.visto)
  .map((n) => [n.id, n.visto]));
const ahoraISO = new Date().toISOString();

// Reescritura automática, sin que nadie la mire: sólo tiene sentido en la
// nube, porque en la PC el panel ya hace exactamente esto (reescribirPendientes
// en panel/servidor.mjs, cada 10 minutos) — correrlo acá también sería
// gastar cuota dos veces en la misma nota.
//
// `previas` es lo que ya se reescribió en una corrida anterior (la portada
// de la vez pasada y, desde el 25/09, el archivo): así no se le vuelve a
// pedir a Gemini la misma nota en cada corrida de acá a que alguien la
// revise. Lo de la portada va último para que mande si están en los dos.
//
// Lo de más de 72 horas no se reescribe si no estaba hecho: ya no va a salir
// en ninguna lista, y sería gastar cuota en una nota que nadie va a ver.
let reescritas = {};
const intentosAntes = leerJson(INTENTOS_IA, null);
const intentos = podarIntentos(intentosAntes ?? {});
if (enLaNube) {
  const previas = previasDeLaPortada([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]);
  const fechaParaLista = (n) => (n.cuando === 'sin fecha en la fuente' ? (vistoAntes[n.id] ?? ahoraISO) : n.fecha);
  const paraReescribir = (ultima.notas ?? [])
    .filter((n) => previas[n.id] || vigenteEnPortada({ fecha: fechaParaLista(n) }));
  // El archivo va también como fuente de ANTECEDENTES: lo que el sitio ya
  // publicó sobre el mismo tema en los últimos 30 días (CRITERIO-EDITORIAL.md).
  reescritas = await reescribirAutomaticas(paraReescribir, {
    previas, decisiones: estado.decisiones, archivo: archivoAnterior.notas ?? [], intentos,
  });
  const nuevas = Object.keys(reescritas).filter((id) => !previas[id]).length;
  if (nuevas) console.log(`  ${nuevas} notas reescritas con IA en esta corrida`);
}
// Se escribe siempre que falte (el workflow lo suma con `git add`) o cambie.
const intentosFinal = podarIntentos(intentos);
if (!intentosAntes || JSON.stringify(intentosFinal) !== JSON.stringify(podarIntentos(intentosAntes))) {
  fs.writeFileSync(INTENTOS_IA, `${JSON.stringify(intentosFinal, null, 1)}\n`, 'utf8');
}

// La dirección de cada nota se fija la primera vez que sale y no cambia más,
// aunque después la IA o una persona le cambien el titular (lib/ruta.js).
const libroRedes = leerJson(LIBRO_REDES, {});
const direcciones = slugsConocidos({
  archivo: archivoAnterior.notas ?? [], anterior: anterior.notas ?? [], libro: libroRedes,
});

// Las notas automáticas que no se publican porque no tienen cuerpo (regla del
// 25/09, web/lib/cuerpo.js). Sólo las que irían a las listas: el vigilante
// las cuenta en el resumen de las 21.
const esperandoCuerpo = [];

function notaPublicada(n) {
  const d = estado.decisiones[n.id];
  // Sólo manda lo que decidió una persona. Lo que guardó la máquina es una
  // foto de un semáforo viejo: ver decisionHumana en ingesta/utiles.mjs.
  const delSemaforo = { verde: 'automatica', rojo: 'bloqueada' }[n.semaforo] ?? 'pendiente';
  const humana = decisionHumana(d);
  const st = humana ? d.estado : delSemaforo;
  if (st !== 'publicada' && st !== 'automatica') return null;
  // Lo que decidió una persona manda. Si no, lo que ya reescribió la IA sola
  // en esta corrida o en una anterior. Si ninguna de las dos cosas pasó,
  // queda el resumen mecánico de la fuente, como salía antes de todo esto.
  // Que `guion` tenga algo es justamente la señal que usa <Firma> para decir
  // "esto lo redactó una IA": no hace falta un campo aparte para lo mismo.
  const auto = reescritas[n.id];
  // De dónde sale el texto: lo de una persona manda siempre. Lo que escribió
  // la IA desde el panel (una decisión "de la máquina"), sólo si tiene cuerpo
  // de verdad; si no, lo que se reescribió acá, en la nube. Antes un cuerpo
  // vacío guardado por el panel tapaba uno bueno escrito en la nube.
  const deLaDecision = humana || tieneCuerpo(d) || !auto ? d : undefined;
  // Con su dirección fijada: la que ya tenía, o la del titular de hoy si es
  // la primera vez que sale.
  const nota = fijarSlug({
    id: n.id,
    titulo: deLaDecision?.titulo ?? auto?.titulo ?? n.titulo,
    copete: deLaDecision?.copete ?? auto?.copete ?? n.resumenFuente ?? '',
    // Sólo existe cuando la reescribió la IA (o lo cargó una persona a
    // mano): el resumen mecánico de la fuente no tiene de dónde sacar un
    // cuerpo propio, así que la nota queda con el copete nada más, como
    // siempre — ver CRITERIO-EDITORIAL.md.
    cuerpo: deLaDecision?.cuerpo ?? auto?.cuerpo ?? null,
    guion: deLaDecision?.guion ?? auto?.guion ?? null,
    seccion: n.seccion,
    medios: n.medios,
    enlace: n.enlace,
    // La imagen de la fuente NO se publica: es obra protegida del medio
    // que la sacó, y la excepción de "noticias de interés general" de la
    // ley 11.723 cubre el texto, no las fotos. Se guarda sólo el dato de
    // si la fuente tenía imagen, por si algún día sirve para priorizar.
    teniaImagenLaFuente: !!n.imagen,
    // La hora para ordenar. Si la fuente no la publica, la ingesta pone la de
    // ahora en cada corrida: la nota saltaba arriba de todo una y otra vez. En
    // ese caso manda la primera vez que la vimos, que no cambia.
    fecha: n.cuando === 'sin fecha en la fuente' ? (vistoAntes[n.id] ?? ahoraISO) : n.fecha,
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
    // Las partes nuevas (25/09): claves, qué se sabe, qué falta confirmar,
    // fuentes consultadas, antecedentes, texto para redes, etiquetas y el
    // nivel de verificación. Sólo en lo reescrito desde ese día: lo de antes
    // se ve como se veía. Nunca se mezclan las de una persona con las de la
    // IA (extrasParaLaWeb en reels/reescritura.mjs).
    ...extrasParaLaWeb(deLaDecision, auto),
  }, direcciones);
  // SIN CUERPO NO SE PUBLICA (25/09): una nota automática sin cuerpo de
  // verdad (70 palabras o más, distinto de la bajada) queda "esperando
  // cuerpo" y no aparece en ninguna lista, ni en el feed, el sitemap o las
  // redes (todo sale de acá). Lo que publicó una persona se respeta.
  if (!humana && !tieneCuerpo(nota)) {
    if (vigenteEnPortada(nota)) esperandoCuerpo.push(n.id);
    return null;
  }
  return nota;
}

// Lo que viene de las fuentes. Las notas propias se suman más abajo, después
// de saber qué salió del archivo.
const deLaIngesta = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean);

// ------------------------------------------------------------- el archivo
//
// Todo lo publicado, aunque ya no esté en la portada, para que ningún enlace
// compartido quede roto (lib/archivo.js). Antes de sumar lo de hoy se mira
// lo ya archivado contra las decisiones de ahora:
//
//   · si una persona la bloqueó o la descartó, o el semáforo ahora la pone
//     en rojo o en amarillo (desde el 25/09 también mira el texto completo y
//     lo que escribió la IA), sale del archivo y su página deja de existir
//     hasta que una persona la apruebe;
//   · si una persona le corrigió el titular o el copete y la ingesta ya no
//     la trae, la corrección llega igual a la página.
const enIngesta = new Map((ultima.notas ?? []).map((n) => [n.id, n]));
const retiradas = new Set();
const corregidas = [];
for (const a of archivoAnterior.notas ?? []) {
  const d = estado.decisiones[a.id];
  if (decisionHumana(d)) {
    if (d.estado !== 'publicada' && d.estado !== 'automatica') retiradas.add(a.id);
    else if (!enIngesta.has(a.id)) {
      corregidas.push({
        ...sinExtras(a),
        ...extrasParaLaWeb(d, a),
        titulo: d.titulo ?? a.titulo, copete: d.copete ?? a.copete, cuerpo: d.cuerpo ?? a.cuerpo, guion: d.guion ?? a.guion,
      });
    }
  } else if (['rojo', 'amarillo'].includes(enIngesta.get(a.id)?.semaforo)
    // La cotización del dólar no es sensible: sale de las listas (está en
    // /dolar) pero su página queda, por si el enlace ya circula.
    && enIngesta.get(a.id)?.motivo !== MOTIVO_COTIZACION) {
    retiradas.add(a.id);
  }
}
// ------------------------------------------------------ las notas propias
//
// La del dólar (una por día hábil, desde las 11) y la de cada podcast que
// salió en las redes (lib/notas-propias.js). Texto armado con plantilla a
// partir de datos que tenemos: los números de DolarApi y lo que esas notas
// ya publicaron. Sin IA.
//
// La cotización se sale a buscar sólo en la nube: en la PC, escribir
// dolar-historia.json dejaría un cambio suelto en el repositorio que trabaría
// la sincronización del panel. La PC arma igual las notas con lo guardado.
const historiaAntes = leerJson(HISTORIA_DOLAR, null);
let historiaDolar = historiaAntes ?? { dias: [] };
if (enLaNube) {
  const toca = cuandoArmarDolar({ historia: historiaDolar });
  if (toca.armar) {
    const datos = await traerDolar();
    const entrada = datos?.fuente === 'dolarapi' ? entradaDelDia(datos, { consultado: new Date(datos.consultado) }) : null;
    if (entrada) {
      historiaDolar = sumarAlHistorial(historiaDolar, entrada);
      console.log(`  dólar: se guardó la cotización de hoy (oficial ${entrada.cotizaciones.oficial.venta}, blue ${entrada.cotizaciones.blue.venta})`);
    } else {
      console.log('  dólar: DolarApi todavía no tiene la cotización de hoy (o es feriado): se vuelve a probar en la próxima corrida');
    }
  }
}
// Se escribe siempre que falte: el workflow lo suma con `git add`.
if (!historiaAntes || JSON.stringify(historiaDolar) !== JSON.stringify(historiaAntes)) {
  fs.writeFileSync(HISTORIA_DOLAR, comoHistoriaJson(historiaDolar), 'utf8');
}

// Las notas con página, para contar cada podcast: lo de esta corrida y el
// archivo, sin lo que se acaba de retirar. Un repaso que ya no se puede armar
// (una de sus notas se retiró) también se retira.
const conPagina = new Map([
  ...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id)),
  ...deLaIngesta,
].map((n) => [n.id, n]));
const { notas: repasos, noSeArman } = notasDeRepasos(libroRedes, conPagina, { catalogo: TEMAS });
for (const id of noSeArman) retiradas.add(id);
// La regla de cuerpo vale también para lo propio (lib/cuerpo.js).
const propias = [...notasDelDolar(historiaDolar), ...repasos]
  .map((n) => fijarSlug(n, direcciones))
  .filter((n) => tieneCuerpo(n));
if (propias.length) console.log(`  notas propias: ${propias.map((n) => n.id).join(', ')}`);

const publicadas = [...deLaIngesta, ...propias]
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Lo que se MUESTRA (portada, secciones, temas, buscador, feed): sólo lo de
// las últimas 72 horas. El 25/09 la portada tenía 43 notas de más de tres
// días, porque el panel las archiva sólo cuando la PC está prendida. La
// página de cada una sigue existiendo: está en el archivo.
const notas = publicadas.filter((n) => vigenteEnPortada(n));

const archivo = actualizarArchivo({
  archivo: archivoAnterior.notas ?? [],
  // Las partes nuevas que hoy no están (una persona corrigió el texto, o la
  // reescritura se cayó) tampoco quedan de la vez anterior en el archivo: el
  // `undefined` pisa lo viejo al mezclar y no se escribe.
  publicadas: [...corregidas, ...publicadas].map(sinPuntaje)
    .map((n) => ({ ...Object.fromEntries(CAMPOS_EXTRA.map((k) => [k, undefined])), ...n })),
  enPortada: new Set(notas.map((n) => n.id)),
  retiradas,
  enRedes: idsEnRedes(libroRedes),
});
if (JSON.stringify(archivo) !== JSON.stringify(archivoAnterior.notas ?? [])) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, comoArchivoJson(archivo), 'utf8');
  console.log(`  archivo.json: ${archivo.length} notas con página (${retiradas.size} retiradas)`);
}

// ------------------------------------------------------------- la agenda
//
// Cada evento con fecha confirmada tiene su página, aunque la PC esté apagada:
// los del municipio se traen en cada corrida y los del panel llegan por
// eventos-panel.json. Si la API del municipio no contestó, lo suyo queda como
// estaba (no se da por retirado). En la PC no se marca nada como retirado: la
// copia de la agenda del panel puede tener horas y la que manda es la de
// GitHub.
const agendaAnterior = leerJson(AGENDA_WEB, { eventos: [] });
const delPanel = leerJson(EVENTOS_PANEL, null);
const eventosAgenda = actualizarAgenda({
  anterior: agendaAnterior.eventos ?? [],
  municipio: agenda && agenda.municipioOk !== false ? (agenda.municipio ?? []) : null,
  panel: delPanel ? (delPanel.eventos ?? []) : null,
  retirar: enLaNube,
});
// Se escribe siempre que falte: el workflow lo suma con `git add` y un archivo
// que no existe hace fallar el paso entero.
if (!fs.existsSync(AGENDA_WEB) || JSON.stringify(eventosAgenda) !== JSON.stringify(agendaAnterior.eventos ?? [])) {
  fs.writeFileSync(AGENDA_WEB, comoAgendaJson(eventosAgenda), 'utf8');
  console.log(`  agenda.json: ${eventosAgenda.length} eventos con página`);
}

// Qué farmacia está de turno AHORA. La regla del cambio a las 8:30 de la
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
  // Los eventos, con su página, están en data/agenda.json (arriba). Acá
  // quedan sólo las fiestas anuales, que no tienen fecha confirmada.
  agenda: {
    proximosAnuales: agenda?.proximosAnuales ?? [],
  },
  utiles: { numeros: NUMEROS, diaDeLaSemana: diaDeEstaSemana(), tocaHoy: tocaHoy() },
  // Las notas que esperan a una persona en el panel (amarillas), para que el
  // vigilante avise por WhatsApp: en GitHub no hay panel y es la única forma
  // de saberlo. Este archivo es público, así que va lo mínimo, nunca una roja,
  // y sin titular cuando la nota es de Policiales o habla de chicos o de
  // víctimas (redes/avisos.mjs, pendientesDeLaIngesta).
  pendientes: pendientesDeLaIngesta(ultima.notas ?? [], estado.decisiones ?? {}),
  // Cuántas notas automáticas no salen porque todavía no tienen cuerpo: el
  // vigilante lo dice en el resumen de las 21 ("Esperando cuerpo: N").
  esperandoCuerpo: esperandoCuerpo.length,
};

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
// ¿Cambió algo que justifique volver a publicar?
//
// `generado` cambia en cada corrida por definición, así que el archivo
// siempre difiere y el workflow siempre commitea — y cada commit dispara una
// compilación entera del sitio.
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
  console.log(`  portada.json: ${notas.length} notas publicadas, ${esperandoCuerpo.length} esperando cuerpo, generado ${salida.generado}`);
} else {
  console.log('  sin novedades: la portada quedó igual, no se toca el archivo');
}
