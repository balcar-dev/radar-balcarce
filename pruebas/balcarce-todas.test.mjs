// Regla 180 (16/10/2026, Hernán: "la idea es que TODAS las notas de Balcarce salgan"). Lo que cuenta un organismo de
// Balcarce, o un medio de Balcarce nombrando algo de acá, no se cae por CANTIDAD ni por no decir "Balcarce" con todas
// las letras. Medido el 16/10 (docs/criterio/BALCARCE-TODAS-LAS-NOTAS.md). Casos reales:
//   · "La AZK completó la séptima fecha con buenos resultados de los locales" (El Diario Balcarce, 15/10): la IA dijo
//     "región", la nota pasó a pedir 2 medios de Automovilismo y quedó esperando como relleno, sin que nadie la viera.
//   · "Atletismo: buena tarea de cuatro atletas balcarceños" y "Padel: meritoria actuación de balcarceños en el
//     Argentino": "balcarceños" en plural no contaba para mencionaAca y la nota esperaba a la IA.
//   · "Sábado a puro básquet" (Municipalidad, 15/10): un organismo de Balcarce que no dice "Balcarce" esperaba a la IA.
//   · "La 22ª Fiesta Nacional del Postre se realizará el 30 y 31 de octubre…" (Municipalidad, 14/10) quedó en la misma
//     historia que una nota de Ahora Balcarce del 3/10 y "llegó tarde" sin salir nunca.
// Lo que NO cambia: lo de un medio de acá que copia una noticia de afuera sin nombrar nada de acá sigue las reglas de
// afuera (espera a la IA y, si la IA dice que no es de acá, pide los medios de su sección); el semáforo no se toca.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ingestar, exigirMedios, esDeAca, esDeUnMedioDeAca, esViejaSinSalir, paraPruebas, MOTIVO_POCO_CONTADA,
} from '../ingesta/ingesta.mjs';
import { aplicarFichas, mencionaAca, MOTIVO_ESPERA_LECTURA } from '../ingesta/lectura-ia.mjs';
import { tieneRespaldo } from '../web/lib/cuerpo.js';

const { idDe } = paraPruebas;

// ------------------------------------------------------------------ los textos reales

const AZK = {
  titulo: 'La AZK completó la séptima fecha con buenos resultados de los locales',
  enlace: 'https://eldiariobalcarce.com.ar/la-azk-completo-la-septima-fecha-con-buenos-resultados-de-los-locales-595',
  texto: 'La Asociación Zonal de Karting Mar y Sierras (AZK) llevó adelante en el kartódromo de Mar del Plata la séptima fecha de los campeonatos 2026, con un atractivo parque que estuvo cerca de las 100 unidades. De los balcarceños quedó el buen trabajo en las distintas categorías.',
};
// La ficha que le puso la IA el 15/10 (web/data/fichas.json, rs24vh).
const FICHA_AZK = { ambito: 'region', seccion: 'Automovilismo', impacto: 'indirecto', razon: 'actividad', importancia: 'media', publicidad: false, chimento: false, porque: '' };

const TIERRAS = {
  titulo: 'El oficialismo incluirá la ley de Tierras “light” en su proyecto sobre Propiedad Privada',
  enlace: 'http://www.informeseprimero.com.ar/2026/10/el-oficialismo-incluira-la-ley-de.html',
  texto: 'El oficialismo de la Cámara de Diputados buscará este miércoles firmar dictamen al proyecto de ley sobre propiedad privada, que incluirá cambios a la ley de Tierras rurales.',
};
const FICHA_TIERRAS = { ambito: 'nacional', seccion: 'Política', impacto: 'indirecto', razon: 'nacional', importancia: 'media', publicidad: false, chimento: false, porque: '' };

const BASQUET = {
  titulo: 'SÁBADO A PURO BÁSQUET',
  enlace: 'https://balcarce.gob.ar/2026/10/15/sabado-a-puro-basquet/',
  texto: 'El próximo sábado todas las categorías de la Escuela Municipal de Básquet afrontarán una nueva fecha correspondiente a la Liga Marplatense de ese deporte. Se trata de los partidos de Mini, Pre Mini y los segundos partidos de las series de play off.',
};
const MAYRA = {
  titulo: 'Mayra Mendoza descarta a Kicillof: “Si Cristina no es candidata, reelige Milei”',
  texto: 'La diputada provincial Mayra Mendoza, una de las dirigentes más importantes de La Cámpora, profundizó la embestida de ese sector contra el gobernador Axel Kicillof.',
};
const POSTRE_VIEJA = {
  titulo: 'Balcarce presentó la 22ª Fiesta Nacional del Postre',
  enlace: 'http://ahorabalcarce.com.ar/balcarce-presento-la-22a-fiesta-nacional-del-postre/',
  texto: 'El lanzamiento se realizó en la Casa del Bicentenario, encabezado por el intendente Esteban Reino y la subsecretaria de Turismo, Rosario Tufró, junto a productores y emprendedores locales.',
};
const POSTRE_NUEVA = {
  titulo: 'LA 22ª FIESTA NACIONAL DEL POSTRE SE REALIZARÁ EL 30 Y 31 DE OCTUBRE Y EL 1 DE NOVIEMBRE',
  enlace: 'https://balcarce.gob.ar/2026/10/14/la-22a-fiesta-nacional-del-postre-se-realizara-el-30-y-31-de-octubre-y-el-1-de-noviembre/',
  texto: 'La 22ª Fiesta Nacional del Postre tiene nuevas fechas confirmadas y avanza en la reorganización de su propuesta para ofrecer tres jornadas con gastronomía, espectáculos y actividades para toda la familia, en el predio de la Sociedad Rural de Balcarce.',
};

// ------------------------------------------------------------------ una ingesta de mentira, sin red

const fuente = (id, medio, extra = {}) => ({ id, nombre: medio, medio, url: `https://${id}.test/rss`, tipo: 'rss', alcance: 'local', peso: 28, ...extra });
const item = ({ titulo, enlace, texto }, horas = 2) => `<item><title><![CDATA[${titulo}]]></title><link>${enlace}</link><pubDate>${new Date(Date.now() - horas * 3600e3).toUTCString()}</pubDate><description><![CDATA[${texto}]]></description></item>`;

async function conFeeds(feeds, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const cuerpo = feeds[url] ?? '<rss><channel></channel></rss>';
    return { ok: true, status: 200, headers: new Map(), text: async () => cuerpo, arrayBuffer: async () => new TextEncoder().encode(cuerpo).buffer };
  };
  try { return await fn(); } finally { globalThis.fetch = original; }
}
const rss = (...items) => `<rss><channel>${items.join('')}</channel></rss>`;

// ------------------------------------------------------------------ 1. "balcarceños" en plural

test('mencionaAca encuentra "balcarceños" y "balcarceñas" en plural (casos reales de medios de acá)', () => {
  for (const titulo of [
    'Atletismo Buena tarea de cuatro atletas balcarceños',
    'Padel: meritoria actuación de balcarceños en el Argentino',
    'Pádel: Tres balcarceños compitieron en el Torneo Nacional de Rosario',
    'Jóvenes balcarceñas participaron de un encuentro internacional de básquet',
  ]) assert.equal(mencionaAca({ titulo, alcance: 'local' }), true, titulo);
  // Y en la bajada (la de la AZK lo dice ahí).
  assert.equal(mencionaAca({ titulo: AZK.titulo, resumenFuente: AZK.texto, alcance: 'local' }), true);
  // Lo que no nombra nada de acá sigue sin nombrarlo.
  assert.equal(mencionaAca({ titulo: MAYRA.titulo, resumenFuente: MAYRA.texto, alcance: 'local' }), false);
});

test('una nota de un medio de acá que dice "balcarceños" ya no espera a la IA por "no nombrar nada de acá"', () => {
  const n = { id: 'p1', titulo: 'Padel: meritoria actuación de balcarceños en el Argentino', alcance: 'local', local: true, semaforo: 'verde', seccion: 'Deportes' };
  const { notas } = aplicarFichas([n], {}, { esperarSinFicha: true });
  assert.equal(notas[0].semaforo, 'verde');
});

// ------------------------------------------------------------------ 2. los organismos de Balcarce no esperan a la IA

test('un organismo de Balcarce no espera a la IA aunque no diga "Balcarce"; un medio de acá que copia algo de afuera, sí', () => {
  const basquet = { id: idDe(BASQUET.enlace), titulo: BASQUET.titulo, resumenFuente: BASQUET.texto, alcance: 'local', local: true, oficial: true, semaforo: 'verde', seccion: 'Deportes' };
  const mayra = { id: 'mayra', titulo: MAYRA.titulo, resumenFuente: MAYRA.texto, alcance: 'local', local: true, semaforo: 'verde', seccion: 'Política' };
  assert.equal(mencionaAca(basquet), false, 'la nota real no nombra nada de acá');
  const { notas, cambios } = aplicarFichas([basquet, mayra], {}, { esperarSinFicha: true });
  assert.equal(notas.find((n) => n.id === basquet.id).semaforo, 'verde', 'la Municipalidad no espera');
  const m = notas.find((n) => n.id === 'mayra');
  assert.equal(m.semaforo, 'amarillo');
  assert.equal(m.motivo, MOTIVO_ESPERA_LECTURA);
  assert.deepEqual(cambios.aEsperar.map((c) => c.id), ['mayra']);
});

// ------------------------------------------------------------------ 3. no se cae por "un solo medio" ni por el cupo

test('esDeUnMedioDeAca: organismo de acá, o medio de acá que nombra algo de acá; nunca lo de afuera', () => {
  assert.equal(esDeUnMedioDeAca({ alcance: 'local', oficial: true }), true);
  assert.equal(esDeUnMedioDeAca({ alcance: 'local', nombraAca: true }), true);
  assert.equal(esDeUnMedioDeAca({ alcance: 'local' }), false, 'la copia sin nombrar nada de acá');
  assert.equal(esDeUnMedioDeAca({ alcance: 'pais', oficial: true }), false, 'un ministerio nacional no es de acá');
  assert.equal(esDeUnMedioDeAca({ alcance: 'region', nombraAca: true }), false);
  // No es esDeAca: no afloja el semáforo de lo que la IA dijo que no es de acá.
  assert.equal(esDeAca({ alcance: 'local', nombraAca: true, noEsDeAcaSegunLaIA: true, local: false }), false);
});

test('por el camino real: la AZK (medio de acá, "balcarceños" en la bajada) sigue saliendo aunque la IA diga "región"; la copia nacional pide sus medios', async () => {
  const fuentes = [fuente('eldiario', 'El Diario Balcarce'), fuente('informese', 'Infórmese Primero (FM 104.9)')];
  const r = await conFeeds({
    'https://eldiario.test/rss': rss(item(AZK)),
    'https://informese.test/rss': rss(item(TIERRAS)),
  }, () => ingestar({ fuentes, silencioso: true, memoria: null }));
  const azk = r.notas.find((n) => n.titulo.includes('AZK'));
  const tierras = r.notas.find((n) => n.titulo.includes('Tierras'));
  assert.ok(azk && tierras, r.notas.map((n) => n.titulo).join(' | '));
  assert.equal(azk.nombraAca, true, 'el cruce marca que un medio de acá nombra algo de acá');
  assert.equal(tierras.nombraAca, undefined, 'la copia de una noticia nacional no nombra nada de acá');
  assert.equal(azk.semaforo, 'verde');

  const { notas } = aplicarFichas(r.notas, { [azk.id]: FICHA_AZK, [tierras.id]: FICHA_TIERRAS }, { esperarSinFicha: true });
  exigirMedios(notas);
  const a = notas.find((n) => n.id === azk.id);
  const t = notas.find((n) => n.id === tierras.id);
  assert.equal(a.noEsDeAcaSegunLaIA, true, 'la IA le sacó la marca de acá (eso no cambia)');
  assert.equal(a.local, false, 'y pierde los +25 del puntaje (tampoco cambia)');
  assert.equal(a.semaforo, 'verde', `la AZK no puede esperar por tener un solo medio: ${a.motivo}`);
  assert.equal(t.semaforo, 'amarillo', 'la copia de una noticia nacional, contada por un solo medio, espera como cualquier nota de afuera');
  assert.ok(t.motivo.startsWith(MOTIVO_POCO_CONTADA), t.motivo);
});

test('los medios que pide lo de afuera no frenan lo de un medio de acá que nombra algo de acá (y ya no hay cupo)', () => {
  const deAfuera = Array.from({ length: 12 }, (_, i) => ({
    id: `f${i}`, titulo: `Turismo Carretera ${i}`, seccion: 'Automovilismo', semaforo: 'verde', relevancia: 90 - i, alcance: 'pais', medios: ['Olé', 'TyC Sports', 'Motorsport'],
  }));
  const azk = {
    id: 'rs24vh', titulo: AZK.titulo, seccion: 'Automovilismo', semaforo: 'verde', relevancia: 40, alcance: 'local', local: false, noEsDeAcaSegunLaIA: true, nombraAca: true, medios: ['El Diario Balcarce'],
  };
  const otra = { id: 'f99', titulo: 'Una más de afuera', seccion: 'Automovilismo', semaforo: 'verde', relevancia: 30, alcance: 'pais', medios: ['Olé', 'TyC Sports', 'Motorsport'] };
  const sola = { id: 'f98', titulo: 'Una de afuera con un solo medio', seccion: 'Automovilismo', semaforo: 'verde', relevancia: 30, alcance: 'pais', medios: ['Olé'] };
  exigirMedios([...deAfuera, azk, otra, sola]);
  assert.equal(azk.semaforo, 'verde', azk.motivo);
  assert.equal(otra.semaforo, 'verde', 'sin cupo: la que cuentan tres medios sale aunque haya muchas');
  assert.equal(sola.semaforo, 'amarillo', 'la de afuera con un solo medio sigue esperando');
});

test('lo que contó un medio de acá nombrando algo de acá conserva la página con un solo medio (tieneRespaldo)', () => {
  assert.equal(tieneRespaldo({ local: false, medios: ['El Diario Balcarce'], deUnMedioDeAca: true }), true);
  assert.equal(tieneRespaldo({ local: false, medios: ['El Diario Balcarce'] }), false, 'sin la marca, como antes');
  const fuenteGenerar = fs.readFileSync(path.join(import.meta.dirname, '..', 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(fuenteGenerar, /esDeUnMedioDeAca\(n\) \? \{ deUnMedioDeAca: true \}/, 'generar-datos tiene que poner la marca en la nota publicada');
});

// ------------------------------------------------------------------ 4. lo viejo que nunca salió no arrastra a lo nuevo

test('esViejaSinSalir: una nota de acá de más de 72 horas que nunca salió; lo publicado y lo sin fecha sí entran', () => {
  const ahora = Date.parse('2026-10-14T16:00:00Z');
  const vieja = { fecha: new Date('2026-10-03T23:02:33Z'), enlace: POSTRE_VIEJA.enlace };
  const nueva = { fecha: new Date('2026-10-14T13:21:31Z'), enlace: POSTRE_NUEVA.enlace };
  assert.equal(esViejaSinSalir(vieja, null, ahora), true);
  assert.equal(esViejaSinSalir(nueva, null, ahora), false);
  assert.equal(esViejaSinSalir(vieja, new Set([idDe(POSTRE_VIEJA.enlace)]), ahora), false, 'la que ya salió conserva su historia y su dirección');
  assert.equal(esViejaSinSalir({ ...vieja, fechaEstimada: true }, null, ahora), false, 'sin fecha en la fuente: se cuenta desde que se vio');
});

test('por el camino real: el comunicado nuevo de la Fiesta del Postre no queda pegado a la nota del 3/10', async () => {
  const fuentes = [fuente('ahora', 'Ahora Balcarce'), fuente('muni', 'Municipalidad de Balcarce', { oficial: true, peso: 24 })];
  const feeds = {
    'https://ahora.test/rss': rss(item(POSTRE_VIEJA, 11 * 24)),
    'https://muni.test/rss': rss(item(POSTRE_NUEVA, 2)),
  };
  const r = await conFeeds(feeds, () => ingestar({ fuentes, silencioso: true, memoria: null }));
  const enlaces = r.notas.flatMap((n) => n.origenes.map((o) => o.enlace));
  assert.ok(!enlaces.includes(POSTRE_VIEJA.enlace), 'la del 3/10 nunca salió y no se puede estrenar: no entra');
  const postre = r.notas.find((n) => n.origenes.some((o) => o.enlace === POSTRE_NUEVA.enlace));
  assert.ok(postre, 'el comunicado de la Municipalidad entra');
  assert.ok(Date.now() - Date.parse(postre.fecha) < 6 * 3600e3, `la historia tiene la fecha del comunicado, no la del 3/10: ${postre.fecha}`);
  assert.equal(postre.semaforo, 'verde');

  // Si la vieja ya había salido, entra igual: la historia conserva la dirección publicada.
  const conocida = await conFeeds(feeds, () => ingestar({ fuentes, silencioso: true, memoria: null, idsConocidos: new Set([idDe(POSTRE_VIEJA.enlace)]) }));
  assert.ok(conocida.notas.some((n) => n.origenes.some((o) => o.enlace === POSTRE_VIEJA.enlace)));
});
