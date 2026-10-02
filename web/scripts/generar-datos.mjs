// Arma los datos de la web (web/data/) a partir de las noticias y de lo que
// decidieron el semáforo y las personas.
//
// Por qué archivos estáticos y no una conexión en vivo al panel: la web es
// HTML estático en Cloudflare Pages, que no puede leer los archivos de la PC.
// GitHub Actions corre este script cada media hora, sube lo que cambió al repo
// y después Cloudflare Pages compila y publica. En la PC hace lo mismo a mano,
// con lo que ya tiene el panel.
//
// Qué hace, en orden:
//
//   1. Lee las noticias y las decisiones: en la PC, de panel/datos/; en la
//      nube, corre la ingesta en el momento y lee web/data/decisiones.json.
//   2. Anota la primera vez que vio cada nota y fija su fecha (fechaReal).
//   3. En la nube: la lectura con IA (fichas, repetidas) y, otra vez, los
//      medios que pide lo de afuera y los cupos.
//   4. En la nube: la reescritura con IA de lo que va a salir.
//   5. Decide qué nota se publica (notaPublicada): la decisión de una persona o
//      el semáforo, que no llegue tarde, las correcciones a mano, lo que no se
//      publica nunca y "sin cuerpo no se publica".
//   6. En la nube: el banco de fotos.
//   7. El archivo: lo que se retira y lo que se corrige de lo ya publicado.
//   8. Las notas propias (el dólar del día y los repasos de los podcasts).
//   9. La portada (sólo lo vigente, sin repetidas), el archivo y la agenda.
//  10. La farmacia de turno, el clima, los útiles y las pendientes.
//  11. La estadística del día, las notas que esperan cuerpo y, si cambió algo
//      que importa, la portada.
//
// Qué escribe (cada uno sólo si falta o si cambió):
//
//   web/data/portada.json           lo que se muestra (portada, secciones, feed)
//   web/data/archivo.json           todo lo publicado con página (lib/archivo.js)
//   web/data/agenda.json            los eventos con página (lib/eventos.js)
//   web/data/intentos-ia.json       cuántas veces se le pidió cada nota a Gemini
//   web/data/dolar-historia.json    la cotización de cada día hábil
//   web/data/fichas.json            las fichas de la lectura con IA (en la nube)
//   web/data/notas-por-dia.json     la estadística diaria de notas
//   web/data/banco-fotos.json       el banco de fotos, y las fotos en
//     + web/public/fotos-notas/     web/public/fotos-notas/ (en la nube)
//   web/data/esperando-cuerpo.json  las notas que esperan cuerpo
//   web/data/vistas.json            la primera vez que se vio cada nota
//   web/data/celular-pendientes.json lo que espera a una persona, cifrado para
//     + .cache/celular-notas.json    el celular; y las notas enteras, en la
//                                    caché de Actions (en la nube; panel/celular-datos.mjs)
//
// Lee, además de las decisiones del panel de la PC, las del celular
// (web/data/celular-decisiones.json) y las correcciones (correcciones.json).
//
// La lógica de "qué nota está publicada" es la misma que usa
// panel/servidor.mjs en su función vista(): se repite acá a propósito para no
// atar la web a que el servidor del panel esté corriendo. La web sólo
// necesita el JSON, nunca el proceso.
//
//   node scripts/generar-datos.mjs

import fs from 'node:fs';
import path from 'node:path';
import { leerJson } from '../../ingesta/json.mjs';
import { NUMEROS, tocaHoy, diaDeEstaSemana, diaDeTurno, comoISO, decisionHumana } from '../../ingesta/utiles.mjs';
import { avisosDelClima } from '../../ingesta/alertas.mjs';
import {
  reescribirAutomaticas, previasDeLaPortada, extrasParaLaWeb, sinExtras, CAMPOS_EXTRA, podarIntentos, fuentesConsultadasDeOrigenes,
  MAXIMO_DE_INTENTOS, intentosMaximosPara,
} from '../../reels/reescritura.mjs';
import { TEMAS, MOTIVO_COTIZACION, REGLAS_SEMAFORO } from '../../ingesta/fuentes.mjs';
import { tieneCuerpo } from '../lib/cuerpo.js';
import { tituloAutomatico } from '../lib/titulos.js';
import { sinNotasRepetidas } from '../lib/texto.js';
import { pendientesDeLaIngesta } from '../../redes/avisos.mjs';
import { cuentaDelDia, anotarDia, comoHistoriaJson as comoNotasPorDiaJson } from '../../ingesta/estadistica-diaria.mjs';
import {
  vigenteEnPortada, slugsConocidos, fijarSlug, actualizarArchivo, aligerarViejas, idsEnRedes, sinPuntaje, comoArchivoJson,
  idsRetiradosAMano, correccionesAMano, conCorreccion, fechaDeLaNota, llegaTarde,
  esDeLoQueNuncaSePublica, pierdeLaPagina, podarRetiradas, comoRetiradasJson,
} from '../lib/archivo.js';
import { diaAR, diaSemanaAR } from '../../ingesta/zona.mjs';
import { esperaSoloPorCantidad } from '../../ingesta/ingesta.mjs';
import { conFotosDelBanco, podarFotos } from './fotos-notas.mjs';
import { actualizarAgenda, comoAgendaJson } from '../lib/eventos.js';
import { traerDolar } from '../lib/dolar.js';
import {
  cuandoArmarDolar, entradaDelDia, sumarAlHistorial, comoHistoriaJson, notasDelDolar, notasDeRepasos,
} from '../lib/notas-propias.js';
import {
  leerDecisionesCelular, unirDecisiones, paraDecidir, notasParaEscribir, papeleraAlDia, paraLaPapelera,
} from '../../panel/celular-datos.mjs';
import { leerLlaves, cerrarCadaUno } from '../../panel/cifrado.mjs';
import { previaDelDia } from '../../redes/previa.mjs';
import { estaActivo } from '../../redes/elegir.mjs';
import {
  repetidasConOtraDireccion, conFusionadas, parejasSospechosas, sumarFuentesDeParejas,
} from '../lib/repetidas.js';
import { diceEnVivo } from '../../ingesta/verificar.mjs';

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
// Las fichas de la lectura con IA, que decide desde el 27/09 (ingesta/lectura-ia.mjs).
const FICHAS = path.join(AQUI, '..', 'data', 'fichas.json');
// El banco de fotos (28/09, scripts/fotos-notas.mjs): qué nota ya se probó,
// tenga foto o no, para no volver a gastar cupo preguntando dos veces.
const BANCO_FOTOS = path.join(AQUI, '..', 'data', 'banco-fotos.json');
// Las fotos elegidas, versionadas junto con el resto de lo público (como
// reels/marca/fuentes/): así también las sirve Cloudflare Pages sin nada
// más que hacer.
const FOTOS_NOTAS = path.join(AQUI, '..', 'public', 'fotos-notas');
// Las notas que esperan cuerpo, con lo necesario para escribirlo a mano (28/09:
// Gemini sin cupo dejaba 34 esperando y la portada con notas de días atrás; así
// Claude u otra persona las redacta en web/data/correcciones.json).
const ESPERANDO_CUERPO = path.join(AQUI, '..', 'data', 'esperando-cuerpo.json');
// La primera vez que vimos cada nota de la ingesta, publicada o no (28/09).
// Un feed sin fecha le pone "ahora" en cada corrida: sin esta memoria, una nota
// que llevaba días en el feed salía como recién publicada. Se poda a 7 días.
const VISTAS = path.join(AQUI, '..', 'data', 'vistas.json');
const DIAS_DE_VISTAS = 7;
// Lo que se sacó a mano de la web, fuera del panel (lib/archivo.js).
const RETIRADAS_A_MANO = idsRetiradosAMano(leerJson(path.join(AQUI, '..', 'data', 'retiradas.json'), null));
// Lo que se corrigió a mano (título, bajada, sección), fuera del panel.
const CORRECCIONES = correccionesAMano(leerJson(path.join(AQUI, '..', 'data', 'correcciones.json'), null));
// El panel del celular (29/09, panel/celular-datos.mjs): lo que decidió una
// persona desde el celular (aprobar, descartar, retirar) y lo que marcó para que
// también vaya a Facebook e Instagram. Lo escribe sólo el celular.
const CELULAR = leerDecisionesCelular(leerJson(path.join(AQUI, '..', 'data', 'celular-decisiones.json'), null));
// Lo que espera a una persona, cifrado para cada celular registrado
// (panel/cifrado.mjs), y las notas completas para que GitHub las pueda escribir
// con IA cuando el celular lo pide (en la caché de Actions, que no es pública).
const CELULAR_LLAVES = path.join(AQUI, '..', 'data', 'celular-llaves.json');
const CELULAR_PENDIENTES = path.join(AQUI, '..', 'data', 'celular-pendientes.json');
const CELULAR_NOTAS = path.join(AQUI, '..', '..', '.cache', 'celular-notas.json');
// Lo que el celular muestra aparte de las notas: cuántas hay y lo que va a salir
// hoy en las redes (redes/previa.mjs). Es de lo ya publicado: no va cifrado.
const CELULAR_ESTADO = path.join(AQUI, '..', 'data', 'celular-estado.json');
// La papelera (lo que retiró una persona, para poder volver a publicarlo). En la
// caché de Actions: no es pública.
const PAPELERA = path.join(AQUI, '..', '..', '.cache', 'papelera.json');

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
  // Los identificadores ya publicados: cuando otro medio se suma a una
  // historia, la nota no cambia de dirección (ingesta/cruce.mjs).
  const idsConocidos = new Set([...leerJson(SALIDA, { notas: [] }).notas ?? [], ...leerJson(ARCHIVO, { notas: [] }).notas ?? []]
    .map((n) => n.id));
  ultima = await ingestar({ silencioso: true, idsConocidos });
  agenda = await agendaCompleta().catch(() => null);
  const exportado = leerJson(path.join(AQUI, '..', 'data', 'decisiones.json'), { decisiones: {} });
  estado = { decisiones: exportado.decisiones ?? {} };
  console.log(`  ${ultima.notas.length} historias · ${Object.keys(estado.decisiones).length} decisiones del panel`);

  // Una fuente que se vacía no avisa. Algunas se leen raspando el HTML de
  // la página: el día que El Diario la rediseñe, esas notas dejan
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
// Las del celular, encima de las del panel de la PC (manda la más nueva).
estado.decisiones = unirDecisiones(estado.decisiones ?? {}, CELULAR.notas);
{
  const n = Object.keys(CELULAR.notas).length;
  if (n) console.log(`  ${n} decisiones desde el celular`);
}

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
// La fecha con la que ya salió cada nota: una nota no rejuvenece cuando el
// medio actualiza la suya (fechaDeLaNota, lib/archivo.js).
const fechaAntes = Object.fromEntries([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]
  .filter((n) => n.fecha && !n.sinFecha)
  .map((n) => [n.id, n.fecha]));
// Lo que ya salió alguna vez (la portada anterior y el archivo): sólo eso puede
// seguir en las listas con el hecho de más de HORAS_PARA_ESTRENAR (llegaTarde,
// lib/archivo.js).
const yaSalieron = new Set([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])].map((n) => n.id));
const ahoraISO = new Date().toISOString();

// La primera vez que vimos cada nota (VISTAS). Se anota antes de decidir nada.
const vistasAntes = leerJson(VISTAS, {});
const vistas = {};
{
  const limite = Date.now() - DIAS_DE_VISTAS * 864e5;
  for (const [id, cuando] of Object.entries(vistasAntes)) if (new Date(cuando).getTime() >= limite) vistas[id] = cuando;
  for (const n of ultima.notas ?? []) if (!vistas[n.id]) vistas[n.id] = vistoAntes[n.id] ?? ahoraISO;
  // Un id por renglón: el diff de cada corrida queda chico y legible.
  const texto = `${JSON.stringify(vistas).replace(/,"/g, ',\n"')}\n`;
  if (!fs.existsSync(VISTAS) || fs.readFileSync(VISTAS, 'utf8') !== texto) fs.writeFileSync(VISTAS, texto, 'utf8');
}

/**
 * La fecha de una nota, una sola regla para todo (28/09): si la fuente no dio
 * hora, la primera vez que la vimos; si la dio, la más vieja que se conoce
 * (sus fuentes, la ya publicada, la primera vez que la vimos). Es la que se
 * muestra, la que ordena y la que decide si llega tarde (llegaTarde).
 */
const primeraVista = (n) => vistoAntes[n.id] ?? vistas[n.id];
const fechaReal = (n) => (n.cuando === 'sin fecha en la fuente'
  ? (primeraVista(n) ?? ahoraISO)
  : fechaDeLaNota(n, { fechaAnterior: fechaAntes[n.id], visto: primeraVista(n) }));

// La lectura con IA (plan V2.2, ingesta/lectura-ia.mjs). Desde el 27/09 DECIDE
// (Hernán: sin prueba, se corrige en vivo): una IA lee cada nota nueva con el
// perfil de Balcarce y su ficha saca lo que no es para Radar, corrige la
// sección y dice qué es de Balcarce. El semáforo sigue mandando: la IA nunca
// destraba nada. Sin ficha (o si falla), queda lo de siempre. Va antes de la
// reescritura para no gastar cuota en lo que no va a salir.
let sacadasPorLaIA = new Set();
let repetidasFuera = new Set();
// Las parejas de notas que la IA confirmó que cuentan el mismo hecho con otras palabras (1/10): [[idA, idB], …]. Se
// preguntan más abajo, con los títulos ya escritos; acá van las que se confirmaron antes (fichas.json).
const confirmadasDe = (pares = {}) => Object.entries(pares).filter(([, v]) => v).map(([k]) => k.split('|'));
let parejasConfirmadas = confirmadasDe(leerJson(FICHAS, {}).repetidas?.pares);
if (enLaNube) {
  try {
    const {
      leerNotasNuevas, aplicarFichas, comoFichasJson, agruparRepetidas, quitarRepetidas, unirGrupos, LECTURA,
    } = await import('../../ingesta/lectura-ia.mjs');
    const { claveClasificacion } = await import('../../reels/claves.mjs');
    const { exigirMedios, aplicarCupos, MOTIVO_POCO_CONTADA } = await import('../../ingesta/ingesta.mjs');
    const fichasAntes = leerJson(FICHAS, {});
    const { archivo: fichas, cuenta } = await leerNotasNuevas(ultima.notas ?? [], { guardado: fichasAntes, registro: console.log });
    if (cuenta.sinClave) console.log('  lectura con IA: sin clave, se decide como siempre');
    const { notas: conFichas, cambios } = aplicarFichas(ultima.notas ?? [], fichas.fichas, {
      // Lo de un medio de acá que no nombra nada de acá espera a la IA, si la
      // lectura anda (28/09, la de Suiza en Balcarce).
      esperarSinFicha: !cuenta.sinClave,
      yaPublicadas: yaSalieron,
    });
    sacadasPorLaIA = new Set(cambios.sacadas.map((c) => c.id));

    // Las repetidas: la misma noticia contada con otro título (27/09, McCain).
    // Se pide sólo si cambió lo que hay para publicar, con tope por día.
    // Sólo lo que va a salir: con las 270 notas de la ingesta (ruido incluido)
    // la IA no vio las tres de McCain; con las publicables, sí (27/09).
    // Y aparte, lo de afuera que espera por tener pocos medios: si otro medio
    // cuenta lo mismo, al juntarlas llega a los que pide su sección y puede
    // salir. Antes quedaba frenado antes de poder juntarse, y lo nacional
    // desaparecía (27/09). Van en dos pedidos: con todo junto la IA ve peor.
    const candidatas = conFichas.filter((n) => n.semaforo === 'verde');
    const deUnMedio = conFichas.filter((n) => n.semaforo === 'amarillo' && String(n.motivo ?? '').startsWith(MOTIVO_POCO_CONTADA));
    const claveDeLaLista = [...candidatas, ...deUnMedio].map((n) => n.id).sort().join(',');
    const hoy = fichas.dia;
    // Los grupos se conservan de un día al otro (mientras sus notas sigan en la
    // ingesta); sólo el contador de pedidos vuelve a cero.
    const rep = fichas.repetidas?.dia === hoy ? fichas.repetidas : { dia: hoy, pedidosHoy: 0, grupos: fichas.repetidas?.grupos ?? [], pares: fichas.repetidas?.pares ?? {} };
    const clave = claveClasificacion();
    if (clave && rep.lista !== claveDeLaLista && rep.pedidosHoy < LECTURA.pedidosRepetidasPorDia && candidatas.length > 1) {
      rep.pedidosHoy += 1;
      try {
        const nuevos = await agruparRepetidas(candidatas, { clave });
        const deAfuera = deUnMedio.length > 1 ? await agruparRepetidas(deUnMedio, { clave }) : [];
        rep.grupos = unirGrupos(rep.grupos, [...nuevos, ...deAfuera], new Set((ultima.notas ?? []).map((n) => n.id)));
        rep.lista = claveDeLaLista;
      } catch (e) {
        console.log(`  repetidas: falló el pedido (${e.message}); quedan los grupos de antes`);
      }
    }
    fichas.repetidas = rep;
    // Queda la que ya está publicada (en la portada anterior o en el archivo,
    // todavía vigente en la portada, HORAS_EN_PORTADA): si no, desaparece de la
    // portada y queda una que todavía espera cuerpo (27/09, la de YPF y la de
    // la maestra china).
    const yaPublicadas = new Set([...(anterior.notas ?? []), ...(archivoAnterior.notas ?? []).filter((n) => vigenteEnPortada(n))].map((n) => n.id));
    const { notas, repetidas } = quitarRepetidas(conFichas, rep.grupos, { publicadas: yaPublicadas });
    repetidasFuera = new Set(repetidas.map((r) => r.id));
    // Con los medios de las repetidas sumados, una nota de afuera puede llegar
    // a los que pide su sección, y con la sección que corrigió la IA el mínimo
    // puede ser otro: la regla se vuelve a mirar, en los dos sentidos. Lo que
    // la IA dijo que no es de acá también la cumple. Y después, el cupo.
    exigirMedios(notas);
    aplicarCupos(notas.sort((a, b) => (b.relevancia ?? 0) - (a.relevancia ?? 0)));
    ultima = { ...ultima, notas };
    console.log(`  lectura con IA: ${cuenta.nuevas} fichas nuevas en ${cuenta.pedidos} pedidos (${fichas.pedidosHoy ?? 0} hoy${cuenta.groq ? `, ${cuenta.groq} con Groq de respaldo` : ''})`
      + ` · sacó ${cambios.sacadas.length}, ${cambios.dejanDeSerLocales.length} dejaron de ser de Balcarce,`
      + ` ${cambios.otraSeccion.length} cambiaron de sección, ${cambios.aEsperar.length} a esperar, ${repetidas.length} repetidas`);
    for (const r of repetidas.slice(0, 10)) console.log(`    repetida: ${r.titulo}`);
    for (const c of cambios.sacadas.slice(0, 15)) console.log(`    fuera (${c.motivo}): ${c.titulo}`);
    const texto = comoFichasJson(fichas);
    if (!fs.existsSync(FICHAS) || fs.readFileSync(FICHAS, 'utf8') !== texto) fs.writeFileSync(FICHAS, texto, 'utf8');
  } catch (e) {
    console.log(`  lectura con IA: no se pudo (${e.message}); se decide como siempre`);
  }
}

// Reescritura automática, sin que nadie la mire: sólo en la nube. Es el único
// lugar que la hace (el panel de la PC dejó de hacerla el 28/09: gastaba cupo
// en textos que la web no usaba); en la PC, este script no le pide nada a Gemini.
//
// `previas` es lo que ya se reescribió en una corrida anterior (la portada
// de la vez pasada y, desde el 25/09, el archivo): así no se le vuelve a
// pedir a Gemini la misma nota en cada corrida de acá a que alguien la
// revise. Lo de la portada va último para que mande si están en los dos.
//
// Si no estaba hecha, no se reescribe una nota que ya salió de las listas (más
// de HORAS_EN_PORTADA): sería gastar cuota en una nota que nadie va a ver.
let reescritas = {};
const intentosAntes = leerJson(INTENTOS_IA, null);
const intentos = podarIntentos(intentosAntes ?? {});
// Cómo estaban al empezar, ya podados: al final se escriben sólo si cambiaron.
const intentosAlEmpezar = JSON.stringify(intentos);
if (enLaNube) {
  const previas = previasDeLaPortada([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])]);
  // Lo que ya tiene el cuerpo escrito en correcciones.json no se le pide a
  // Gemini: sería gastar cupo en algo que después no se usa (27/09).
  const paraReescribir = (ultima.notas ?? [])
    .filter((n) => !CORRECCIONES.get(n.id)?.cuerpo)
    .filter((n) => {
      if (previas[n.id]) return true;
      const fecha = fechaReal(n);
      // Lo que ya no se va a estrenar (hecho de más de HORAS_PARA_ESTRENAR,
      // nunca salió) tampoco: no va a salir (28/09).
      return vigenteEnPortada({ fecha }) && (yaSalieron.has(n.id) || !llegaTarde(fecha));
    });
  // El archivo va también como fuente de ANTECEDENTES: lo que el sitio ya
  // publicó sobre el mismo tema en los últimos 30 días (CRITERIO-EDITORIAL.md).
  reescritas = await reescribirAutomaticas(paraReescribir, {
    previas, decisiones: estado.decisiones, retiradas: RETIRADAS_A_MANO, archivo: archivoAnterior.notas ?? [], intentos,
  });
  const nuevas = Object.keys(reescritas).filter((id) => !previas[id]).length;
  if (nuevas) console.log(`  ${nuevas} notas reescritas con IA en esta corrida`);
}

// Los lunes, en la nube, la lista de retiradas pierde las de más de una semana
// (lib/archivo.js, podarRetiradas). Una vez por semana y no en cada corrida:
// así el archivo cambia sólo ese día y no choca con lo que se cargue a mano.
if (enLaNube && diaSemanaAR() === 1) {
  const ruta = path.join(AQUI, '..', 'data', 'retiradas.json');
  const { json, quitadas } = podarRetiradas(leerJson(ruta, null), {
    hoy: diaAR(), enLaIngesta: new Set((ultima.notas ?? []).map((n) => n.id)),
  });
  if (quitadas.length) {
    fs.writeFileSync(ruta, comoRetiradasJson(json), 'utf8');
    console.log(`  retiradas: ${quitadas.length} de más de una semana, fuera de la lista`);
  }
}

// Se escribe siempre que falte (el workflow lo suma con `git add`) o cambie.
const intentosFinal = podarIntentos(intentos);
if (!intentosAntes || JSON.stringify(intentosFinal) !== intentosAlEmpezar) {
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

/** ¿El título o la bajada son de lo que no se publica nunca (REGLAS_SEMAFORO.nunca)? */
const nuncaSePublica = (nota) => esDeLoQueNuncaSePublica(nota, REGLAS_SEMAFORO.nunca);

// Mismo criterio que el panel: sin decisión manda el semáforo (verde =
// automática, rojo = bloqueada, el resto pendiente). Sólo lo publicado o
// automático llega a la web.
function notaPublicada(n) {
  if (RETIRADAS_A_MANO.has(n.id)) return null;
  const d = estado.decisiones[n.id];
  // Sólo manda lo que decidió una persona. Lo que guardó la máquina es una
  // foto de un semáforo viejo: ver decisionHumana en ingesta/utiles.mjs.
  const delSemaforo = { verde: 'automatica', rojo: 'bloqueada' }[n.semaforo] ?? 'pendiente';
  const humana = decisionHumana(d);
  const st = humana ? d.estado : delSemaforo;
  if (st !== 'publicada' && st !== 'automatica') return null;
  // La fecha de la nota, una sola vez: decide si llega tarde y es la que sale.
  const fecha = fechaReal(n);
  // Una nota que nunca salió no se estrena con el hecho de más de
  // HORAS_PARA_ESTRENAR (llegaTarde, lib/archivo.js). Lo que publicó una
  // persona se respeta. Sin excepción para las notas sin hora: se cuentan desde
  // la primera vez que las vimos (fechaReal).
  if (!humana && !yaSalieron.has(n.id) && llegaTarde(fecha)) return null;
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
  // Si ni la IA ni una persona completaron "fuentesConsultadas" (una nota sin
  // reescribir, o corregida a mano sólo en título/copete/sección/cuerpo), se
  // arma con los enlaces reales que ya trae el cruce: sin esto, el lector
  // veía el link sólo en la primera fuente y el resto de los medios sin
  // enlace (27/09, Hernán: "sólo tiene link la primera fuente").
  const extras = extrasParaLaWeb(deLaDecision, auto);
  if (!extras.fuentesConsultadas?.length) {
    const armadas = fuentesConsultadasDeOrigenes(n);
    if (armadas.length) extras.fuentesConsultadas = armadas;
  }
  // Con su dirección fijada: la que ya tenía, o la del titular de hoy si es
  // la primera vez que sale.
  const nota = fijarSlug({
    id: n.id,
    // Los arreglos mecánicos del título (lib/titulos.js): sin "en Balcarce" al
    // final, sin una etiqueta conocida adelante ("Rugby: …") y sin una coma o un
    // conector colgando al final. Lo que escribió una
    // persona se respeta tal cual.
    titulo: humana ? (deLaDecision?.titulo ?? n.titulo) : tituloAutomatico(deLaDecision?.titulo ?? auto?.titulo ?? n.titulo),
    copete: deLaDecision?.copete ?? auto?.copete ?? n.resumenFuente ?? '',
    // Sólo existe cuando la reescribió la IA (o lo cargó una persona a
    // mano): el resumen mecánico de la fuente no tiene de dónde sacar un
    // cuerpo propio, así que la nota queda con el copete nada más, como
    // siempre — ver CRITERIO-EDITORIAL.md.
    cuerpo: deLaDecision?.cuerpo ?? auto?.cuerpo ?? null,
    guion: humana ? (deLaDecision?.guion ?? null) : (tituloAutomatico(deLaDecision?.guion ?? auto?.guion ?? '') || null),
    seccion: n.seccion,
    medios: n.medios,
    enlace: n.enlace,
    // La dirección de la imagen de la fuente no se publica tal cual: se
    // guarda sólo si la fuente tenía imagen. La foto que sí sale en la página
    // es la del banco de fotos (28/09, `foto`, más abajo: conFotosDelBanco),
    // elegida sin marca de agua y con el crédito en la cita.
    teniaImagenLaFuente: !!n.imagen,
    // La hora para ordenar. Si la fuente no la publica, la ingesta pone la de
    // ahora en cada corrida: la nota saltaba arriba de todo una y otra vez. En
    // ese caso manda la primera vez que la vimos, que no cambia.
    // Con fecha: la más vieja que se conoce, nunca una más nueva que la ya
    // publicada (un medio que actualiza su nota no la trae de vuelta, 28/09).
    fecha,
    // Cuando la fuente no publica la hora, la ingesta pone la de ahora para
    // poder ordenar. Se guarda el aviso para que la web no mienta un
    // "hace 1 minuto" que no es cierto.
    sinFecha: n.cuando === 'sin fecha en la fuente',
    // La primera vez que la vimos. Sólo se usa cuando la fuente no dio
    // hora; para el resto manda la fecha del medio.
    visto: vistoAntes[n.id] ?? ahoraISO,
    relevancia: n.relevancia,
    local: n.local,
    // Una fuente oficial alcanza sola: la página la conserva aunque la cuente
    // un solo medio (tieneRespaldo, lib/cuerpo.js; 28/09).
    ...(n.oficial ? { oficial: true } : {}),
    // Lo de la zona sale con un solo medio (esDeAca) y también conserva la
    // página: sin esta marca, el archivo lo descartaba al dejar la portada.
    ...(n.deLaZona ? { deLaZona: true } : {}),
    publicadaPor: d?.por ?? null,
    publicadaCuando: d?.cuando ?? null,
    // Una persona la marcó desde el celular para que también vaya a Facebook e
    // Instagram (29/09): hasta Política y Policiales, que solas no van nunca
    // (redes/elegir.mjs). La fecha es la de ese visto bueno.
    ...(CELULAR.redes[n.id] ? { aprobadaParaRedes: CELULAR.redes[n.id].cuando } : {}),
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
    ...extras,
  }, direcciones);
  // Lo corregido a mano manda (web/data/correcciones.json), y va antes de
  // mirar el cuerpo: el cuerpo también se puede escribir ahí (27/09).
  const corregida = conCorreccion(nota, CORRECCIONES);
  // Lo que no se publica nunca (las listas de sepelios), mirado en el texto
  // FINAL: el título de la fuente puede ser otro y el texto venir del panel,
  // escrito con una página que traía las necrológicas pegadas (27/09). Tampoco
  // lo que aprobó una persona (28/09): la regla es "no se publican nunca", y
  // una lista de sepelios con "falleció" llegaba al panel como amarilla.
  if (nuncaSePublica(corregida)) return null;
  // SIN CUERPO NO SE PUBLICA (25/09): una nota automática sin cuerpo de
  // verdad (70 palabras o más, distinto de la bajada) queda "esperando
  // cuerpo" y no aparece en ninguna lista, ni en el feed, el sitemap o las
  // redes (todo sale de acá). Lo que publicó una persona se respeta.
  if (!humana && !tieneCuerpo(corregida)) {
    if (vigenteEnPortada(corregida)) {
      esperandoCuerpo.push({
        id: n.id, titulo: corregida.titulo, copete: corregida.copete, seccion: corregida.seccion, fecha: corregida.fecha,
        fuentes: (n.origenes ?? []).map((o) => ({ medio: o.medio, enlace: o.enlace, fecha: o.fecha ?? null })),
        // Cuántas veces la IA ya lo intentó (de MAXIMO_DE_INTENTOS): el celular
        // dice si todavía puede salir sola (29/09).
        intentos: intentos[n.id]?.intentos ?? 0,
        // Por qué el verificador rechazó el último intento (copia, relleno, un número que no coincide…): el celular lo explica (1/10).
        motivo: String(intentos[n.id]?.motivo ?? '').slice(0, 200),
        // Cuántos intentos tiene esta nota: una muy contada tiene más (criterio.mjs, REESCRITURA).
        maximo: intentosMaximosPara((n.origenes ?? []).length),
      });
    }
    return null;
  }
  return corregida;
}

// Lo que viene de las fuentes. Las notas propias se suman más abajo, después
// de saber qué salió del archivo.
const deLaIngesta = (ultima.notas ?? [])
  .map(notaPublicada)
  .filter(Boolean);

// ---------------------------------------------------------------- las fotos
//
// El banco de fotos, en vivo (28/09, CRITERIO-EDITORIAL.md, "Las fotos"):
// sólo en la nube, sólo para lo que viene de las fuentes (las notas propias
// no llevan foto de otro), y con memoria propia (web/data/banco-fotos.json)
// para no volver a preguntar por una nota ya probada. Si algo falla acá, la
// nota sigue publicándose igual, sin foto, como hasta ahora.
//
// Elegir fotos NUEVAS es sólo en la nube (gasta cupo de IA); poner las que YA
// están en el banco, siempre (28/09): correr esto en la PC dejaba portada.json
// sin ninguna foto.
// Las fotos que sumó una persona desde la pestaña Fotos del panel (2/10, web/scripts/foto-manual.mjs) mandan sobre las del
// banco: las anota sólo el workflow "Panel del celular" y así no chocan con esta corrida. Sólo si el archivo está en disco.
const FOTOS_MANUALES = path.join(AQUI, '..', 'data', 'fotos-manuales.json');
const fotosManuales = Object.fromEntries(Object.entries(leerJson(FOTOS_MANUALES, {}))
  .filter(([, f]) => f?.archivo && fs.existsSync(path.join(FOTOS_NOTAS, path.basename(f.archivo)))));
let bancoDeFotos = { ...leerJson(BANCO_FOTOS, {}), ...fotosManuales };
// Si dos notas son la misma noticia, la foto se busca en las fuentes de las dos (1/10).
sumarFuentesDeParejas(deLaIngesta, parejasConfirmadas);
if (enLaNube) {
  try {
    const { elegirFotosNuevas } = await import('./fotos-notas.mjs');
    const { claveClasificacion, claveGroq } = await import('../../reels/claves.mjs');
    const bancoAntes = bancoDeFotos;
    const { banco, archivos } = await elegirFotosNuevas(deLaIngesta, {
      banco: bancoAntes, clave: claveClasificacion(), claveRespaldo: claveGroq(),
    });
    const nuevas = Object.keys(banco).length - Object.keys(bancoAntes).length;
    if (nuevas) console.log(`  fotos: ${nuevas} notas nuevas probadas (${Object.keys(archivos).length} con foto)`);
    for (const [archivo, buffer] of Object.entries(archivos)) {
      const destino = path.join(FOTOS_NOTAS, path.basename(archivo));
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, buffer);
    }
    if (JSON.stringify(banco) !== JSON.stringify(bancoAntes)) {
      fs.mkdirSync(path.dirname(BANCO_FOTOS), { recursive: true });
      fs.writeFileSync(BANCO_FOTOS, `${JSON.stringify(banco, null, 1)}\n`, 'utf8');
    }
    bancoDeFotos = banco;
  } catch (e) {
    console.log(`  fotos: no se pudieron elegir nuevas (${e.message}); quedan las del banco`);
  }
}
conFotosDelBanco(deLaIngesta, bancoDeFotos);

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
// Lo que la IA sacó en esta corrida tampoco conserva su página.
// Una repetida que ya fue a las redes conserva su página: su enlace circula.
const enLasRedes = idsEnRedes(leerJson(LIBRO_REDES, {}));
const retiradas = new Set([...RETIRADAS_A_MANO, ...sacadasPorLaIA, ...[...repetidasFuera].filter((id) => !enLasRedes.has(id))]);
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
  } else if (pierdeLaPagina(enIngesta.get(a.id), {
    // La cotización del dólar no es sensible: sale de las listas (está en
    // /dolar) pero su página queda, por si el enlace ya circula. Lo de afuera
    // que hoy espera sólo por el cupo o por los medios que la cuentan, tampoco
    // (28/09): no es por lo que dice, y el enlace ya circula.
    conserva: (n) => n.motivo === MOTIVO_COTIZACION || esperaSoloPorCantidad(n),
  })) {
    retiradas.add(a.id);
  }
  // Lo que no se publica nunca (las listas de sepelios) no conserva la página,
  // aunque la haya aprobado una persona (28/09).
  if (nuncaSePublica(conCorreccion(a, CORRECCIONES))) retiradas.add(a.id);
  // Una página vieja que promete una cobertura "EN VIVO" o "minuto a minuto" en
  // el título (el texto de otro medio, de antes de la regla): Radar Balcarce no
  // hace coberturas en vivo (29/09; "música en vivo" sí).
  if (!decisionHumana(d) && diceEnVivo(conCorreccion(a, CORRECCIONES).titulo)) retiradas.add(a.id);
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
// La nota de cada repaso lleva un collage con las fotos de las notas que cuenta (1/10, web/scripts/collage.mjs).
{
  const { collageDeRepaso } = await import('./collage.mjs');
  let conCollage = 0;
  for (const n of propias) {
    if (n.propia !== 'repaso' || n.foto) continue;
    const foto = await collageDeRepaso(n, { banco: bancoDeFotos, carpeta: FOTOS_NOTAS });
    if (foto) { n.foto = foto; conCollage += 1; }
  }
  if (conCollage) console.log(`  repasos con foto (collage): ${conCollage}`);
}

// La misma noticia con otra dirección (lib/repetidas.js, 29/09): queda una y
// la dirección de la otra redirige a ésa (fusionadas.json, generar-redirects.mjs).
const FUSIONADAS = path.join(AQUI, '..', 'data', 'fusionadas.json');
// La papelera (panel/celular-datos.mjs, 29/09): lo que retiró una persona (desde
// el celular, desde el panel de la PC o en retiradas.json) se guarda como
// estaba; si una persona la vuelve a aprobar, vuelve con la misma dirección.
const humanas = Object.entries(estado.decisiones ?? {}).filter(([, d]) => decisionHumana(d));
const RETIRADAS_POR_PERSONA = new Map([
  ...Object.entries(leerJson(path.join(AQUI, '..', 'data', 'retiradas.json'), { notas: {} }).notas ?? {})
    .filter(([id, r]) => r?.motivo && RETIRADAS_A_MANO.has(id))
    .map(([id, r]) => [id, { cuando: r.cuando ?? null, por: r.por ?? null, motivo: r.motivo }]),
  ...humanas.filter(([, d]) => d.estado === 'bloqueada' || d.estado === 'descartada')
    .map(([id, d]) => [id, { cuando: d.cuando ?? null, por: d.por ?? null, motivo: d.motivo ?? null }]),
]);
const VUELVEN = new Map(humanas.filter(([, d]) => d.estado === 'publicada').map(([id, d]) => [id, { cuando: d.cuando ?? null, por: d.por ?? null }]));
const papeleraAntes = enLaNube ? leerJson(PAPELERA, { notas: {} }).notas ?? {} : {};
const { papelera, restaurar } = enLaNube
  ? papeleraAlDia({
    papelera: papeleraAntes,
    retiradas: RETIRADAS_POR_PERSONA,
    vuelven: VUELVEN,
    conPagina: new Map([...(archivoAnterior.notas ?? []), ...(anterior.notas ?? [])].map((n) => [n.id, n])),
  })
  : { papelera: {}, restaurar: [] };
if (restaurar.length) console.log(`  papelera: ${restaurar.length} nota(s) vuelven a publicarse (una persona las volvió a aprobar)`);
const conPaginaHoy = [...deLaIngesta, ...propias];
// Las repetidas con otras palabras (1/10, Hernán: dos notas de la Cooperativa y dos del RENAPER). Los títulos de las
// fuentes no se parecen; recién con los títulos ya escritos se nota. La IA de la lectura (mira cien notas juntas) a veces
// no las junta: acá se le pregunta sólo por las parejas sospechosas (misma sección, poco tiempo de diferencia, algo de
// parecido) y se guarda lo que contestó (fichas.json, repetidas.pares) para no volver a preguntar.
if (enLaNube) {
  try {
    const { confirmarParejas, comoFichasJson } = await import('../../ingesta/lectura-ia.mjs');
    const { claveClasificacion, claveGroq } = await import('../../reels/claves.mjs');
    const fich = leerJson(FICHAS, {});
    const rep = fich.repetidas ?? { dia: fich.dia, pedidosHoy: 0, grupos: [] };
    const pedidosHoy = rep.dia === fich.dia ? (rep.paresPedidosHoy ?? 0) : 0;
    const pool = [...new Map([...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id) && vigenteEnPortada(a)), ...conPaginaHoy].map((n) => [n.id, n])).values()];
    const idsDelPool = new Set(pool.map((n) => n.id));
    const guardadas = Object.fromEntries(Object.entries(rep.pares ?? {}).filter(([k]) => k.split('|').every((id) => idsDelPool.has(id))));
    const sospechosas = parejasSospechosas(pool, { decididas: guardadas });
    let pares = guardadas;
    let pedidos = pedidosHoy;
    if (sospechosas.length && claveClasificacion() && pedidosHoy < 40) {
      pedidos += 1;
      const r = await confirmarParejas(sospechosas, { clave: claveClasificacion(), claveRespaldo: claveGroq() });
      pares = { ...guardadas, ...r };
      for (const p of sospechosas.filter((x) => r[x.clave])) console.log(`    misma noticia (IA): ${p.a.titulo} / ${p.b.titulo}`);
      console.log(`  parejas: ${sospechosas.length} preguntadas, ${sospechosas.filter((x) => r[x.clave]).length} son la misma noticia`);
    }
    if (JSON.stringify(pares) !== JSON.stringify(rep.pares ?? {}) || pedidos !== (rep.paresPedidosHoy ?? 0)) {
      fs.writeFileSync(FICHAS, comoFichasJson({ ...fich, repetidas: { ...rep, pares, paresPedidosHoy: pedidos } }), 'utf8');
    }
    parejasConfirmadas = confirmadasDe(pares);
  } catch (e) {
    console.log(`  parejas: falló el pedido (${e.message}); se vuelve a probar en la próxima corrida`);
  }
}
const fusion = repetidasConOtraDireccion(
  [...(archivoAnterior.notas ?? []).filter((a) => !retiradas.has(a.id)), ...conPaginaHoy],
  {
    enRedes: idsEnRedes(libroRedes),
    confirmadas: parejasConfirmadas,
    conFoto: new Set(Object.entries(bancoDeFotos).filter(([, b]) => b?.archivo).map(([id]) => id)),
  },
);
for (const id of fusion.keys()) retiradas.add(id);
{
  const antes = leerJson(FUSIONADAS, null);
  const porId = new Map([...(archivoAnterior.notas ?? []), ...conPaginaHoy].map((n) => [n.id, n]));
  const json = conFusionadas(antes, fusion, porId);
  // Una por renglón, como retiradas.json.
  if (!antes || JSON.stringify(antes.notas) !== JSON.stringify(json.notas)) fs.writeFileSync(FUSIONADAS, comoRetiradasJson(json), 'utf8');
  if (fusion.size) console.log(`  repetidas con otra dirección: ${fusion.size}, redirigidas a la que queda`);
}
const publicadas = conPaginaHoy.filter((n) => !fusion.has(n.id))
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

// Lo que se MUESTRA (portada, secciones, temas, buscador, feed): sólo lo de
// las últimas HORAS_EN_PORTADA (vigenteEnPortada, lib/archivo.js). El 25/09 la
// portada tenía 43 notas de más de tres días, porque el panel las archiva sólo
// cuando la PC está prendida. La página de cada una sigue existiendo: está en
// el archivo.
const vigentes = publicadas.filter((n) => vigenteEnPortada(n));
// Ni dos notas con el mismo titular (o casi) en las listas: se queda la de más
// relevancia y la otra sale de la portada, las secciones, el feed y el sitemap.
// Conserva su página: entra igual al archivo (`enPortada` usa `vigentes`) y sus
// enlaces, que pueden estar ya compartidos, no se rompen.
const notas = sinNotasRepetidas(vigentes);
const repetidas = vigentes.length - notas.length;
if (repetidas) console.log(`  ${repetidas} notas repetidas (mismo titular) salen de las listas y conservan su página`);

// Sin sección Servicios desde el 27/09 (Hernán): lo que quedó con esa sección
// en el archivo pasa a Balcarce si es de acá, y a Argentina si no (País se
// llama Argentina desde el mismo día).
// Y los títulos automáticos del archivo, con los mismos arreglos mecánicos
// (tituloAutomatico: sin "en Balcarce" al final, sin etiqueta adelante, sin
// coma colgando).
const sinCola = (n) => (n && (!n.publicadaPor || n.publicadaPor === 'ia') && !n.propia ? { ...n, titulo: tituloAutomatico(n.titulo) } : n);
const sinServicios = (n) => conCorreccion(sinColaDe(n), CORRECCIONES);
const sinColaDe = (n) => sinCola(n?.seccion === 'Servicios' ? { ...n, seccion: n.local ? 'Balcarce' : 'Argentina' }
  : n?.seccion === 'País' ? { ...n, seccion: 'Argentina' } : n);
// Lo de más de unos días guarda sólo lo que ve el lector (aligerarViejas, 29/09).
const archivo = aligerarViejas(actualizarArchivo({
  archivo: [...(archivoAnterior.notas ?? []), ...restaurar.filter((n) => !(archivoAnterior.notas ?? []).some((a) => a.id === n.id))].map(sinServicios),
  // Las partes nuevas que hoy no están (una persona corrigió el texto, o la
  // reescritura se cayó) tampoco quedan de la vez anterior en el archivo: el
  // `undefined` pisa lo viejo al mezclar y no se escribe.
  publicadas: [...corregidas, ...publicadas].map(sinPuntaje)
    .map((n) => ({ ...Object.fromEntries(CAMPOS_EXTRA.map((k) => [k, undefined])), ...n })),
  enPortada: new Set(vigentes.map((n) => n.id)),
  retiradas,
  enRedes: idsEnRedes(libroRedes),
}));
if (JSON.stringify(archivo) !== JSON.stringify(archivoAnterior.notas ?? [])) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, comoArchivoJson(archivo), 'utf8');
  console.log(`  archivo.json: ${archivo.length} notas con página (${retiradas.size} retiradas)`);
}

// Las fotos que ya no tienen nota se borran (podarFotos): las de lo retirado a
// mano siempre, y las de lo que ya no está en el archivo, la portada ni la
// ingesta. Sólo en la nube, que es la que sube web/public/fotos-notas/.
if (enLaNube && fs.existsSync(FOTOS_NOTAS)) {
  const quedan = new Set([...archivo, ...vigentes, ...deLaIngesta].map((n) => n.id));
  const { banco, borrar } = podarFotos({
    banco: bancoDeFotos, enDisco: fs.readdirSync(FOTOS_NOTAS), quedan, retiradas: RETIRADAS_A_MANO,
  });
  for (const f of borrar) fs.rmSync(path.join(FOTOS_NOTAS, f), { force: true });
  if (JSON.stringify(banco) !== JSON.stringify(bancoDeFotos)) {
    fs.writeFileSync(BANCO_FOTOS, `${JSON.stringify(banco, null, 1)}\n`, 'utf8');
  }
  if (borrar.length) console.log(`  fotos: ${borrar.length} sin nota, borradas`);
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

// La estadística del día (27/09): cuántas notas salieron hoy y en qué
// sección. Se reescribe el día de hoy en cada corrida; el WhatsApp de las 21
// la manda (ingesta/estadistica-diaria.mjs). Sólo se toca el archivo si
// cambió algún número: si no, cada corrida haría un commit y una compilación.
const NOTAS_POR_DIA = path.join(AQUI, '..', 'data', 'notas-por-dia.json');
{
  const historia = leerJson(NOTAS_POR_DIA, { dias: {} });
  const cuenta = cuentaDelDia({ portada: salida, ahora: new Date(), libro: libroRedes });
  const texto = comoNotasPorDiaJson(anotarDia(historia, cuenta));
  if (!fs.existsSync(NOTAS_POR_DIA) || fs.readFileSync(NOTAS_POR_DIA, 'utf8') !== texto) fs.writeFileSync(NOTAS_POR_DIA, texto, 'utf8');
  console.log(`  hoy: ${cuenta.publicadas} notas publicadas (${cuenta.deBalcarce} de Balcarce) · ${Object.entries(cuenta.porSeccion).map(([s, n]) => `${s} ${n}`).join(', ') || 'ninguna'}`);
}

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

{
  const texto = `${JSON.stringify({ generado: salida.generado, intentosMaximos: MAXIMO_DE_INTENTOS, notas: esperandoCuerpo }, null, 1)}\n`;
  const antes = leerJson(ESPERANDO_CUERPO, null);
  if (JSON.stringify(antes?.notas) !== JSON.stringify(esperandoCuerpo)) fs.writeFileSync(ESPERANDO_CUERPO, texto, 'utf8');
}

// El panel del celular (29/09), sólo en la nube:
//
//   · lo que espera a una persona, con todo lo que hace falta para decidir, y la
//     papelera: un sobre cifrado por nota para cada celular registrado
//     (panel/cifrado.mjs); una nota que no cambió conserva su sobre. Lo que
//     espera no lo escribe la IA sola: sólo si una persona lo pide (regla 68);
//   · las notas enteras, en la caché de Actions, para el workflow "Panel del celular";
//   · cuántas notas hay y lo que va a salir hoy en las redes (celular-estado.json).
if (enLaNube) {
  const llaves = leerLlaves(leerJson(CELULAR_LLAVES, null));
  const lista = paraDecidir(ultima.notas ?? [], estado.decisiones ?? {}, { fichas: leerJson(FICHAS, {}).fichas ?? {} });
  fs.mkdirSync(path.dirname(PAPELERA), { recursive: true });
  fs.writeFileSync(PAPELERA, JSON.stringify({ notas: papelera }), 'utf8');

  const sobresAntes = leerJson(CELULAR_PENDIENTES, null);
  const previos = sobresAntes?.version === 2 ? sobresAntes : { notas: {}, retiradas: {} };
  const esperan = cerrarCadaUno(Object.fromEntries(lista.map((n) => [n.id, n])), llaves, previos.notas);
  const enPapelera = paraLaPapelera(papelera, { aMano: RETIRADAS_A_MANO });
  const retiradasCel = cerrarCadaUno(Object.fromEntries(enPapelera.map((n) => [n.id, n])), llaves, previos.retiradas);
  const orden = lista.map((n) => n.id);
  const ordenRetiradas = enPapelera.map((n) => n.id);
  const cambioElOrden = JSON.stringify(orden) !== JSON.stringify(previos.orden ?? [])
    || JSON.stringify(ordenRetiradas) !== JSON.stringify(previos.ordenRetiradas ?? []);
  if (esperan.cambio || retiradasCel.cambio || cambioElOrden || !fs.existsSync(CELULAR_PENDIENTES)) {
    fs.writeFileSync(CELULAR_PENDIENTES, `${JSON.stringify({
      version: 2, generado: salida.generado, cuantas: lista.length, orden, notas: esperan.sobres,
      retiradas: retiradasCel.sobres, ordenRetiradas,
    }, null, 1)}\n`, 'utf8');
    console.log(`  celular: ${lista.length} notas esperando a una persona y ${enPapelera.length} en la papelera, cifradas para ${llaves.length} celular(es)`);
  }
  fs.mkdirSync(path.dirname(CELULAR_NOTAS), { recursive: true });
  fs.writeFileSync(CELULAR_NOTAS, JSON.stringify({ generado: salida.generado, notas: notasParaEscribir(ultima.notas ?? []) }), 'utf8');
}

// Lo que el celular muestra aparte. Sólo en la nube: en la PC el libro de las
// redes puede estar viejo.
if (enLaNube) {
  const estadoCel = {
    portada: notas.length,
    archivo: archivo.length,
    esperandoCuerpo: esperandoCuerpo.length,
    redes: {
      ...previaDelDia({ portada: salida, libro: libroRedes, archivo }),
      // El interruptor (la variable REDES_ACTIVAS de GitHub): con las redes
      // apagadas, el celular avisa que esto es lo que saldría, no lo que sale.
      activas: process.env.REDES_ACTIVAS === undefined ? null : estaActivo(process.env.REDES_ACTIVAS),
    },
  };
  const antes = leerJson(CELULAR_ESTADO, null);
  const sinHora = (o) => JSON.stringify({ ...o, generado: null, redes: o?.redes ? { ...o.redes, generado: null } : null });
  if (!antes || sinHora(antes) !== sinHora(estadoCel)) {
    fs.writeFileSync(CELULAR_ESTADO, `${JSON.stringify({ generado: salida.generado, ...estadoCel }, null, 1)}\n`, 'utf8');
  }
}

if (cambioQueImporta(anterior, salida)) {
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`  portada.json: ${notas.length} notas publicadas, ${esperandoCuerpo.length} esperando cuerpo, generado ${salida.generado}`);
} else {
  console.log('  sin novedades: la portada quedó igual, no se toca el archivo');
}
