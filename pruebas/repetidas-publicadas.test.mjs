// La misma noticia contra lo YA publicado, sin IA (15/10/2026, regla 171; ingesta/repetidas-publicadas.mjs).
// Casos reales de docs/etapa-2-5/ANALISIS.md: el Jardín 905 al día siguiente y la Liga en otra sección se juntan;
// un anuncio y su resultado, un hecho y el contrario, dos partidos distintos o dos cifras distintas, no.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compararNotas, porQueNo, huella, repetidasDeLoPublicado, parejasConLoPublicado, conFuentesDeLasUnidas, REPETIDAS_PUBLICADAS,
} from '../ingesta/repetidas-publicadas.mjs';
import { repetidasConOtraDireccion, fotosParaLaQueQueda } from '../web/lib/repetidas.js';
import { paraDecidir } from '../panel/celular-datos.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VANGUARDIA = 'https://www.diariolavanguardia.com/noticias/45006-robaron-canos-de-gas-del-jardin-n-905-y-suspendieron-las-clases/';
const GABAL = 'https://www.radiogabal.com.ar/index.php/policiales/lo-que-faltaba-robaron-canos-de-gas-en-el-jardin-905-y-debieron-suspender-las-clases';

// Tal como quedaron publicadas (web/data/archivo.json, 15/10).
const JARDIN_6 = {
  id: '15imf6x', titulo: 'Suspenden clases en el Jardín 905 por el robo de caños de gas',
  copete: 'El Jardín de Infantes N° 905 debió interrumpir las actividades del turno mañana este martes tras constatarse el faltante de caños de gas. La Policía actuó de oficio.',
  fecha: '2026-10-06T12:30:00.000Z', seccion: 'Policiales', local: true,
  medios: ['Infórmese Primero (FM 104.9)', 'Radio Gabal (FM 104.1)', 'Diario La Vanguardia'],
  fuentesConsultadas: [{ medio: 'Radio Gabal (FM 104.1)', enlace: GABAL }, { medio: 'Diario La Vanguardia', enlace: VANGUARDIA }],
};
const JARDIN_7 = {
  id: 'ccot62', titulo: 'El Jardín 905 suspende las clases tras el robo de caños de gas',
  copete: 'La institución educativa debió interrumpir las actividades del turno mañana luego de constatarse el faltante de caños de la instalación. La Policía intervino de oficio.',
  fecha: '2026-10-07T16:01:25.564Z', seccion: 'Balcarce', local: true, medios: ['Diario La Vanguardia'],
  fuentesConsultadas: [{ medio: 'Diario La Vanguardia', enlace: VANGUARDIA }],
};
const JARDIN_REANUDA = {
  id: '1k3fdlf', titulo: 'El Jardín 905 reanuda las clases por la tarde tras revisar las instalaciones de gas',
  copete: 'El Jardín de Infantes N° 905 retoma la actividad escolar en el turno tarde. Personal técnico intervino en el edificio tras el robo de un componente del medidor.',
  fecha: '2026-10-06T12:30:00.000Z', seccion: 'Balcarce', local: true, medios: ['Radio Gabal (FM 104.1)', 'Infórmese Primero (FM 104.9)', 'Diario La Vanguardia'],
};
const LIGA_PUNTONUEVE = {
  id: '1gq0pia', titulo: 'La Liga Balcarceña suspende toda la fecha del fútbol local',
  copete: 'La Liga Balcarceña de Fútbol postergó los encuentros previstos para el fin de semana. La decisión se tomó tras constatar el estado de los terrenos y los accesos por las precipitaciones.',
  fecha: '2026-10-03T22:24:54.000Z', seccion: 'Balcarce', local: true, medios: ['Puntonueve (FM 100.9)'],
  fuentesConsultadas: [{ medio: 'Puntonueve (FM 100.9)', enlace: 'https://puntonueve.com.ar/se-postergo-en-su-totalidad-la-fecha-del-futbol-local/' }],
};
const LIGA_INFORMESE = {
  id: '158gkt0', titulo: 'La Liga Balcarceña de Fútbol suspende la fecha por el estado de las canchas',
  copete: 'La Liga Balcarceña de Fútbol postergó todos los encuentros previstos para el fin de semana debido a las malas condiciones de los terrenos de juego y de los accesos a los predios deportivos.',
  fecha: '2026-10-03T22:52:18.014Z', seccion: 'Fútbol', local: true, medios: ['Infórmese Primero (FM 104.9)', 'Acción 5 (Balcarce)'],
  fuentesConsultadas: [{ medio: 'Infórmese Primero (FM 104.9)', enlace: 'http://www.informeseprimero.com.ar/2026/10/el-mal-estado-de-las-canchas-obligo.html' }],
};

test('el Jardín 905, 27 horas después y en otra sección, es la misma noticia (caso real 6 y 7/10)', () => {
  const c = compararNotas(JARDIN_6, JARDIN_7);
  assert.equal(c.misma, true, c.motivo);
  assert.ok(c.horas > 24 && c.horas <= REPETIDAS_PUBLICADAS.horasCerca);
  // La del 7/10 todavía no salió; la del 6/10, sí: se une a ésa.
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, JARDIN_6], { yaPublicadas: new Set(['15imf6x']), ahora: Date.parse('2026-10-07T16:30:00Z') }), [['15imf6x', 'ccot62']]);
});

test('«la Liga suspende la fecha» en Balcarce y en Fútbol, con media hora de diferencia, es la misma noticia (caso real 3/10)', () => {
  assert.equal(compararNotas(LIGA_PUNTONUEVE, LIGA_INFORMESE).misma, true);
  assert.deepEqual(repetidasDeLoPublicado([LIGA_INFORMESE, LIGA_PUNTONUEVE], { yaPublicadas: new Set(['1gq0pia']), ahora: Date.parse('2026-10-03T23:00:00Z') }), [['1gq0pia', '158gkt0']]);
});

test('un hecho y el contrario no se juntan: «suspende las clases» y «reanuda las clases» (Jardín 905, mismo día)', () => {
  assert.equal(porQueNo(huella(JARDIN_6), huella(JARDIN_REANUDA)), 'un hecho y el contrario');
  assert.equal(compararNotas(JARDIN_6, JARDIN_REANUDA).misma, false);
  // Aunque los títulos se parecieran mucho.
  const casi = { ...JARDIN_REANUDA, titulo: 'Reanudan las clases en el Jardín 905 tras el robo de caños de gas' };
  assert.equal(compararNotas(JARDIN_6, casi).misma, false);
});

test('un anuncio y su resultado son dos notas: «busca el título» y «ganó el título»; «encara la práctica» y «finaliza décimo»', () => {
  const busca = { id: '19cfh7v', titulo: 'Kevin Gómez busca el título argentino supermediano', copete: 'El deportista local Kevin Gómez disputará este sábado por primera vez el título argentino de la categoría supermediano en su décimo combate profesional.', fecha: '2026-09-19T20:48:33.000Z', local: true };
  const gano = { id: 'e3ci1b', titulo: 'Kevin Gómez ganó el título argentino supermediano', copete: 'El boxeador balcarceño se consagró campeón argentino supermediano tras vencer por nocaut a Santiago Fernández.', fecha: '2026-09-20T05:00:13.000Z', local: true };
  assert.equal(porQueNo(huella(busca), huella(gano)), 'un anuncio y su resultado');
  assert.equal(compararNotas(busca, gano).misma, false);
  const encara = { id: '14uc9gg', titulo: 'Franco Colapinto encara la tercera práctica libre y la clasificación en Bakú', copete: 'El piloto argentino afronta una nueva jornada de actividad en el circuito callejero tras completar las sesiones iniciales de entrenamientos.', fecha: '2026-09-25T07:57:16.000Z', local: false };
  const decimo = { id: '1e2jbrs', titulo: 'Franco Colapinto finaliza décimo en la práctica libre en Bakú', copete: 'El piloto argentino completó la tercera sesión de entrenamientos en el circuito callejero de Azerbaiyán y se prepara para la clasificación.', fecha: '2026-09-25T11:00:00.000Z', local: false };
  assert.equal(porQueNo(huella(encara), huella(decimo)), 'un anuncio y su resultado');
  assert.equal(compararNotas(encara, decimo).misma, false);
});

test('dos partidos distintos de la misma fecha no se juntan (cada título nombra equipos que la otra nota no nombra)', () => {
  const copete = 'Por la quinta fecha del torneo Apertura de la Liga Balcarceña de Fútbol, el partido se jugó el domingo por la tarde.';
  const a = { id: 'p1', titulo: 'Ferroviarios le ganó 2 a 1 a Independiente por la quinta fecha de la Liga Balcarceña', copete, fecha: '2026-10-12T20:00:00Z', local: true, seccion: 'Fútbol' };
  const b = { id: 'p2', titulo: 'Racing le ganó 2 a 1 a Huracán por la quinta fecha de la Liga Balcarceña', copete, fecha: '2026-10-12T20:30:00Z', local: true, seccion: 'Fútbol' };
  const c = compararNotas(a, b);
  assert.ok(c.titulo >= REPETIDAS_PUBLICADAS.titulo, 'los títulos se parecen: tiene que frenarlo otra cosa');
  assert.equal(c.misma, false);
  assert.equal(c.motivo, 'cada una nombra a alguien que la otra no nombra');
  // El mismo partido contado por dos medios, sí.
  const b2 = { ...a, id: 'p3', titulo: 'Ferroviarios venció 2 a 1 a Independiente por la quinta fecha de la Liga Balcarceña', fecha: '2026-10-12T21:00:00Z' };
  assert.equal(compararNotas(a, b2).misma, true);
  // Con otro resultado, no (los números de los títulos no coinciden).
  const otroResultado = { ...b2, titulo: 'Ferroviarios venció 3 a 0 a Independiente por la quinta fecha de la Liga Balcarceña' };
  assert.equal(compararNotas(a, otroResultado).misma, false);
});

test('dos cifras distintas en el título son dos notas: el riesgo país a 630 y a 642 puntos', () => {
  const a = { id: '1k34j05', titulo: 'El riesgo país supera los 630 puntos y marca el récord de 2026', copete: 'El indicador del J.P. Morgan trepa cerca de los 640 puntos básicos tras una nueva caída de los bonos argentinos en Wall Street.', fecha: '2026-09-28T15:49:00.000Z', local: false };
  const b = { id: '5ddc24', titulo: 'El riesgo país llega a 642 puntos y marca un récord anual', copete: 'El indicador del JP Morgan trepa el lunes tras una suba de más de 30 unidades. Los bonos soberanos y la Bolsa operan en baja.', fecha: '2026-09-28T21:00:10.000Z', local: false };
  assert.equal(porQueNo(huella(a), huella(b)), 'los títulos tienen números distintos');
  assert.equal(compararNotas(a, b).misma, false);
});

test('el mismo protagonista con otro hecho no se junta: «cronograma y nuevas reglas» del autódromo y «Reinauguran el autódromo»; «se agotaron las entradas» y «paso a paso para comprarlas»', () => {
  const cronograma = { id: '1xkcy2n', titulo: 'Autódromo Juan Manuel Fangio: cronograma y nuevas reglas', copete: 'El autódromo de Balcarce reabre este fin de semana con la visita de categorías zonales y nacionales, acreditaciones para socios y restricciones para drones.', fecha: '2026-09-23T15:38:18.425Z', local: true };
  const reinauguran = { id: 'epzsa5', titulo: 'Reinauguran el autódromo Juan Manuel Fangio', copete: 'El gobernador Axel Kicillof y el intendente Esteban Reino encabezaron la reapertura del autódromo Juan Manuel Fangio tras quince años sin competencias nacionales. El circuito vuelve a recibir carreras este fin de semana con las TC Pick Up y otras categorías.', fecha: '2026-09-22T22:14:09.000Z', local: true };
  assert.equal(compararNotas(cronograma, reinauguran).misma, false);
  const agotadas = { id: '1if2xbk', titulo: 'Se agotaron las entradas para la despedida de Messi de la selección argentina', copete: 'En menos de dos horas, se agotaron las entradas para el amistoso de la selección argentina ante Benín del 6 de octubre en el estadio Monumental, partido con el que Lionel Messi cerrará su ciclo con la Albiceleste.', fecha: '2026-09-24T23:34:05.000Z', local: false };
  const pasoAPaso = { id: '1nud4zm', titulo: 'Entradas para la despedida de Lionel Messi de la Selección Argentina: paso a paso para comprarlas', copete: 'Lionel Messi anunció su retiro de la selección argentina tras perder la final del Mundial 2026 y la Asociación del Fútbol Argentino (AFA) confirmó que jugará un último partido en el país y ya se sabe cómo y cuándo comprar entradas.', fecha: '2026-09-24T19:05:00.000Z', local: false };
  assert.equal(compararNotas(agotadas, pasoAPaso).misma, false);
});

test('nunca se junta lo de acá con lo de afuera, ni lo de más de 72 horas, ni de 36 a 72 horas sin un parecido mayor', () => {
  assert.equal(compararNotas(JARDIN_6, { ...JARDIN_7, local: false }).motivo, 'una es de acá y la otra de afuera');
  assert.equal(compararNotas(JARDIN_6, { ...JARDIN_7, local: false, deLaZona: true }).misma, true, 'la zona cuenta como de acá');
  assert.equal(compararNotas(JARDIN_6, { ...JARDIN_7, fecha: '2026-10-09T13:00:00Z' }).motivo, 'lejos en el tiempo');
  // 50 horas: hace falta título ≥ 0,6 y título + bajada ≥ 0,5. La Liga (0,57) ya no alcanza.
  assert.equal(compararNotas(LIGA_PUNTONUEVE, { ...LIGA_INFORMESE, fecha: '2026-10-06T00:30:00Z' }).misma, false);
});

test('no se tocan las notas propias ni lo que publicó una persona; lo ya publicado no se une a nada', () => {
  const ahora = Date.parse('2026-10-07T16:30:00Z');
  assert.deepEqual(repetidasDeLoPublicado([{ ...JARDIN_7, propia: 'pista' }, JARDIN_6], { yaPublicadas: new Set(['15imf6x']), ahora }), []);
  assert.deepEqual(repetidasDeLoPublicado([{ ...JARDIN_7, publicadaPor: 'Hernán' }, JARDIN_6], { yaPublicadas: new Set(['15imf6x']), ahora }), []);
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, { ...JARDIN_6, publicadaPor: 'ia' }], { yaPublicadas: new Set(['15imf6x']), ahora }), [['15imf6x', 'ccot62']], '«ia» no es una persona');
  // Las dos ya publicadas: no se reabre lo que ya salió (eso lo mira repetidasConOtraDireccion con sus reglas).
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, JARDIN_6], { yaPublicadas: new Set(['15imf6x', 'ccot62']), ahora }), []);
  // Las dos nuevas en la misma corrida: la segunda se une a la primera.
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, JARDIN_6], { yaPublicadas: new Set(), ahora }), [['15imf6x', 'ccot62']]);
});

test('con la fusión de siempre: queda una, la otra redirige, y la que queda suma los medios y las fuentes sin tocar las originales', () => {
  const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
  const publicada = { ...JARDIN_6, cuerpo: CUERPO };
  const nueva = { ...JARDIN_7, cuerpo: CUERPO };
  const parejas = repetidasDeLoPublicado([nueva, publicada], { yaPublicadas: new Set(['15imf6x']), ahora: Date.parse('2026-10-07T16:30:00Z') });
  // Sin la pareja, los títulos solos (0,75 con las palabras enteras) no llegaban al 0,8 de repetidasConOtraDireccion.
  assert.equal(repetidasConOtraDireccion([publicada, nueva]).size, 0);
  const fusion = repetidasConOtraDireccion([publicada, nueva], { confirmadas: parejas });
  assert.deepEqual([...fusion], [['ccot62', '15imf6x']], 'queda la que ya estaba (la primera, con cuerpo las dos)');
  const porId = new Map([publicada, nueva].map((n) => [n.id, n]));
  const liga = { ...LIGA_INFORMESE };
  const [queda, otra] = conFuentesDeLasUnidas([publicada, liga], fusion, porId);
  assert.deepEqual(queda.medios, ['Infórmese Primero (FM 104.9)', 'Radio Gabal (FM 104.1)', 'Diario La Vanguardia'], 'La Vanguardia ya estaba: no se repite');
  assert.equal(queda.fuentesConsultadas.length, 2, 'el mismo enlace no se suma dos veces');
  assert.equal(otra, liga, 'lo que no tiene unidas queda igual (el mismo objeto)');
  // Con un medio nuevo, se suma; y la original no cambia (el archivo de antes se compara con el nuevo).
  const conOtroMedio = { ...nueva, medios: ['Diario La Vanguardia', 'El Diario Balcarce'], fuentesConsultadas: [...nueva.fuentesConsultadas, { medio: 'El Diario Balcarce', enlace: 'https://eldiariobalcarce.com.ar/jardin-905' }] };
  const [sumada] = conFuentesDeLasUnidas([publicada], fusion, new Map([['ccot62', conOtroMedio]]));
  assert.ok(sumada.medios.includes('El Diario Balcarce'));
  assert.equal(sumada.fuentesConsultadas.length, 3);
  assert.equal(publicada.medios.length, 3);
  assert.equal(publicada.fuentesConsultadas.length, 2);
});

test('generar-datos usa las parejas sin IA en la fusión y suma las fuentes de las unidas', () => {
  const fuente = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(fuente, /parejasConLoPublicado\(\s*\[\.\.\.deLaIngesta\.map\(conOrigenes\), \.\.\.\(archivoAnterior\.notas \?\? \[\]\), \.\.\.retiradasParaComparar\],\s*\{ yaPublicadas: yaSalieron, retiradas: RETIRADAS_A_MANO, entrePublicadas: true \}/);
  assert.match(fuente, /const parejasSinIA = \[\.\.\.repetidasSinIA\.parejas, \.\.\.repetidasSinIA\.entrePublicadas\]/, 'regla 175: también entre dos ya publicadas');
  // (y, desde el 17/10, el ancla de cada pareja por significado: regla 195)
  assert.match(fuente, /preferidas: \[\.\.\.parejasSinIA, \.\.\.conLaPublicadaPrimero\(parejasConfirmadas, yaSalieron\), \.\.\.anclasDeSignificado\]/, 'M2: con lo ya publicado queda siempre la que ya estaba');
  assert.match(fuente, /fotosParaLaQueQueda\(fusion/, 'M2: la foto de la nueva pasa a la que queda');
  assert.match(fuente, /igual a una nota retirada \(\$\{esperan\.get\(n\.id\)\}\)/, 'M3: la que se parece a una retirada espera a una persona');
  assert.match(fuente, /confirmadas: \[\.\.\.parejasConfirmadas, \.\.\.parejasSinIA\]/);
  assert.match(fuente, /conFuentesDeLasUnidas\(/);
  // Sin dependencias de afuera (regla de ingesta/).
  const modulo = fs.readFileSync(path.join(RAIZ, 'ingesta', 'repetidas-publicadas.mjs'), 'utf8');
  assert.ok(!/^import /m.test(modulo), 'ingesta/repetidas-publicadas.mjs no importa nada');
});

// ---------------------------------------------------------------- M2 y M3 de la revisión de Opus (15/10/2026)

const AHORA = Date.parse('2026-10-07T16:30:00Z');

test('M2: la nueva trae la foto y la ya publicada no: queda la ya publicada (la fecha no rejuvenece) y la foto pasa a ella', () => {
  const publicada = { ...JARDIN_6 }; // sin foto
  const nueva = { ...JARDIN_7 }; // con foto en el banco
  const parejas = repetidasDeLoPublicado([nueva, publicada], { yaPublicadas: new Set(['15imf6x']), ahora: AHORA });
  assert.deepEqual(parejas, [['15imf6x', 'ccot62']]);
  const conFoto = new Set(['ccot62']);
  // Antes del arreglo: por la foto quedaba la nueva y la publicada redirigía (la noticia de hace dos días volvía arriba con fecha nueva).
  assert.deepEqual([...repetidasConOtraDireccion([publicada, nueva], { confirmadas: parejas, conFoto })], [['15imf6x', 'ccot62']]);
  // Con la pareja marcada como «preferida», queda siempre la que ya estaba.
  const fusion = repetidasConOtraDireccion([publicada, nueva], { confirmadas: parejas, preferidas: parejas, conFoto });
  assert.deepEqual([...fusion], [['ccot62', '15imf6x']]);
  // La foto de la nueva pasa a la que queda; si ya tenía una, no se toca nada.
  assert.deepEqual([...fotosParaLaQueQueda(fusion, { conFoto })], [['15imf6x', 'ccot62']]);
  assert.equal(fotosParaLaQueQueda(fusion, { conFoto, yaTienen: new Set(['15imf6x']) }).size, 0);
  assert.equal(fotosParaLaQueQueda(fusion, { conFoto: new Set(['15imf6x', 'ccot62']) }).size, 0);
  assert.equal(fotosParaLaQueQueda(fusion, { conFoto: new Set() }).size, 0, 'si ninguna tiene foto, no hay nada que pasar');
});

test('M2: dos nuevas de la misma corrida y una publicada: queda la publicada; sin la publicada en la lista, la preferida no cambia nada', () => {
  const publicada = { ...JARDIN_6 };
  const nueva = { ...JARDIN_7 };
  const otra = { ...JARDIN_7, id: 'otra1', fecha: '2026-10-07T16:20:00.000Z' };
  const todas = [nueva, otra, publicada];
  const parejas = repetidasDeLoPublicado(todas, { yaPublicadas: new Set(['15imf6x']), ahora: AHORA });
  const fusion = repetidasConOtraDireccion(todas, { confirmadas: parejas, preferidas: parejas, conFoto: new Set(['ccot62', 'otra1']) });
  for (const [, queda] of fusion) assert.equal(queda, '15imf6x');
  assert.equal(fusion.size, 2);
  // La publicada ya no está en la lista (se fue del archivo): la preferida no excluye a la nueva y queda la de siempre (la más vieja).
  const sola = repetidasConOtraDireccion([nueva, otra], { confirmadas: [['otra1', 'ccot62']], preferidas: [['15imf6x', 'ccot62']] });
  assert.deepEqual([...sola], [['otra1', 'ccot62']]);
});

test('M3: si la mejor pareja de una nota nueva es una nota retirada, no forma pareja: va aparte para esperar a una persona', () => {
  const retirada = { ...JARDIN_6, id: 'd1rexu', publicadaPor: 'Hernán' };
  const retiradas = new Set(['d1rexu']);
  const r = parejasConLoPublicado([JARDIN_7, retirada], { yaPublicadas: new Set(['d1rexu']), retiradas, ahora: AHORA });
  assert.deepEqual(r.parejas, []);
  assert.deepEqual(r.conRetirada, [['d1rexu', 'ccot62']]);
  // La retirada nunca es «nueva»: aunque no esté en yaPublicadas (ya no está en el archivo), no se compara contra nada.
  const sola = parejasConLoPublicado([retirada, JARDIN_7], { retiradas, ahora: AHORA });
  assert.deepEqual(sola.conRetirada, [['d1rexu', 'ccot62']]);
  assert.deepEqual(sola.parejas, []);
  // repetidasDeLoPublicado (sin retiradas) sigue devolviendo sólo las parejas con lo publicado.
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, retirada], { yaPublicadas: new Set(['d1rexu']), retiradas, ahora: AHORA }), []);
  // Con una retirada que no se parece a nada, todo sigue como siempre.
  assert.deepEqual(repetidasDeLoPublicado([JARDIN_7, JARDIN_6], { yaPublicadas: new Set(['15imf6x']), retiradas, ahora: AHORA }), [['15imf6x', 'ccot62']]);
});

test('M3: si hay una publicada más parecida que la retirada, la nueva se une a la publicada; con otra noticia, ni una cosa ni la otra', () => {
  const retiradaFloja = { ...JARDIN_6, id: 'ret2', titulo: 'El Jardín 905 suspende las clases por el robo de caños de gas', copete: 'La institución educativa debió interrumpir las actividades este martes. La Policía actuó.' };
  assert.equal(compararNotas(retiradaFloja, JARDIN_7).misma, true, 'la retirada también es la misma noticia, pero menos parecida');
  const publicadaParecida = { ...JARDIN_6, id: 'pub1' };
  const r = parejasConLoPublicado([JARDIN_7, retiradaFloja, publicadaParecida], {
    yaPublicadas: new Set(['pub1', 'ret2']), retiradas: new Set(['ret2']), ahora: AHORA,
  });
  assert.deepEqual(r.parejas, [['pub1', 'ccot62']]);
  assert.deepEqual(r.conRetirada, []);
  const otraNoticia = { id: 'x1', titulo: 'La Cooperativa Eléctrica corta la luz el viernes en tres barrios', copete: 'El corte programado alcanza a varios sectores de la ciudad por tareas de mantenimiento.', fecha: '2026-10-07T10:00:00Z', local: true };
  const sinPareja = parejasConLoPublicado([JARDIN_7, otraNoticia], { yaPublicadas: new Set(['x1']), retiradas: new Set(['x1']), ahora: AHORA });
  assert.deepEqual(sinPareja, { parejas: [], conRetirada: [] });
});

test('M3: lo que se frena por parecerse a una retirada queda amarillo, con su motivo, en la lista del celular', () => {
  const nota = {
    id: 'ccot62', titulo: JARDIN_7.titulo, resumenFuente: JARDIN_7.copete, seccion: 'Balcarce', local: true, fecha: new Date().toISOString(),
    semaforo: 'amarillo', motivo: 'igual a una nota retirada (d1rexu)', origenes: [],
  };
  const lista = paraDecidir([nota], {});
  assert.equal(lista.length, 1);
  assert.equal(lista[0].motivo, 'igual a una nota retirada (d1rexu)');
  assert.equal(paraDecidir([{ ...nota, semaforo: 'rojo' }], {}).length, 0, 'una roja no se ofrece nunca');
});
