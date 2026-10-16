// La selección nueva en modo sombra (ingesta/seleccion-nueva.mjs; el diseño: docs/flujo/FLUJO-NUEVO.html).
// No está conectada a producción. Estas pruebas cuidan lo que NO se negocia aunque el flujo cambie:
//   · nada de la lista roja ni de lo que no se publica nunca sale, ni siquiera si ya estaba publicado o si
//     la palabra está sólo en el resumen de otro medio;
//   · lo que cuida a menores y víctimas espera a una persona;
//   · el tope de 150 en 24 horas nunca se pasa por lo de afuera, y lo de Balcarce nunca se frena por el tope;
// y las reglas nuevas con casos reales (16/10/2026): lo de Balcarce sale con una fuente, las autopublicadas
// y las menudencias no, lo de afuera se mide en medios independientes (un grupo cuenta una vez).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  decidir, seleccionNueva, aplicarTope, claseDe, mediosQuePide, esAutopublicada, esMenudencia, refritoDe,
  elegirParaRepaso, elegirParaFacebook, puntajeNuevo, SELECCION_NUEVA,
} from '../ingesta/seleccion-nueva.mjs';

const AHORA = Date.parse('2026-10-16T15:00:00Z');
const haceHoras = (h) => new Date(AHORA - h * 3600e3).toISOString();
let siguiente = 0;

/** Una historia como las que devuelve ingestar(). */
function historia(o = {}) {
  siguiente += 1;
  const medios = o.medios ?? ['Infobae', 'La Nación', 'Página/12'];
  return {
    id: o.id ?? `h${siguiente}`,
    titulo: o.titulo ?? `Una noticia nacional cualquiera número ${siguiente}`,
    fecha: o.fecha ?? haceHoras(1),
    cuando: 'hace 1 hora',
    medio: medios[0],
    medios,
    seccion: o.seccion ?? 'Argentina',
    semaforo: o.semaforo ?? 'verde',
    motivo: o.motivo ?? `sección ${o.seccion ?? 'Argentina'}`,
    resumenFuente: o.resumen ?? '',
    fuentesTexto: o.fuentesTexto ?? [],
    origenes: o.origenes ?? medios.map((m) => ({ medio: m, fecha: o.fecha ?? haceHoras(1), resumen: '' })),
    alcance: o.alcance ?? 'nacional',
    local: o.alcance === 'local',
    ...(o.oficial ? { oficial: true } : {}),
    ...(o.nombraAca ? { nombraAca: true } : {}),
    ...(o.nombraBalcarce ? { nombraBalcarce: true } : {}),
    ...(o.figura ? { figura: o.figura } : {}),
  };
}
const deAca = (o = {}) => historia({ alcance: 'local', medios: [o.medio ?? 'Radio Gabal (FM 104.1)'], seccion: 'Balcarce', nombraAca: true, ...o });

// ------------------------------------------------------------------ la lista roja y "nunca"

test('lo rojo no sale: por el semáforo, por el texto de otro medio, aunque ya esté publicado', () => {
  const porSemaforo = historia({ semaforo: 'rojo', motivo: 'tema sensible: "x"', medios: Array.from({ length: 20 }, (_, i) => `Medio ${i}`) });
  assert.equal(decidir(porSemaforo, { ahora: AHORA }).accion, 'descartar');
  // La palabra no está en el título ni en el semáforo: está en el resumen de otro medio de la historia.
  const escondida = historia({ titulo: 'Avanza una causa contra un cantante español', fuentesTexto: ['La investigación es por explotación laboral y agresión sexual.'] });
  const d = decidir(escondida, { ahora: AHORA });
  assert.equal(d.accion, 'descartar');
  assert.equal(d.freno, 'rojo');
  // Ya publicada: igual se descarta (lo rojo manda sobre "ya salió").
  assert.equal(decidir(escondida, { ahora: AHORA, yaPublicadas: new Set([escondida.id]) }).accion, 'descartar');
  // De Balcarce, con una fuente oficial, también ("Petruccelli presentó un proyecto… salud mental", 15/10).
  const deAcaRoja = deAca({ medio: 'Concejo Deliberante de Balcarce', oficial: true, titulo: 'Petruccelli presentó un proyecto para fortalecer la atención de salud mental', resumen: 'El proyecto apunta a la prevención del suicidio.' });
  assert.equal(decidir(deAcaRoja, { ahora: AHORA }).accion, 'descartar');
});

test('las listas de sepelios y las efemérides de otro medio no salen nunca', () => {
  assert.equal(decidir(deAca({ titulo: 'Servicios de sepelios del día' }), { ahora: AHORA }).accion, 'descartar');
  assert.equal(decidir(deAca({ titulo: 'Efemérides 16 de octubre: se celebra el Día Mundial de la Alimentación' }), { ahora: AHORA }).accion, 'descartar');
});

test('lo que cuida a menores y víctimas espera a una persona, también si está en el resumen de otro medio', () => {
  const voley = deAca({ medio: 'Municipalidad de Balcarce', oficial: true, titulo: 'Torneo de Vóley con 13 equipos', fuentesTexto: ['Participaron adolescentes de toda la zona.'] });
  const d = decidir(voley, { ahora: AHORA });
  assert.equal(d.accion, 'esperar');
  assert.equal(d.freno, 'persona');
  const amarilla = historia({ semaforo: 'amarillo', motivo: 'necesita ojo humano: "detenido"' });
  assert.equal(decidir(amarilla, { ahora: AHORA }).freno, 'persona');
});

test('en una corrida entera, ninguna historia roja termina publicada', () => {
  const notas = [
    ...Array.from({ length: 30 }, () => historia()),
    historia({ semaforo: 'rojo', motivo: 'tema sensible: "femicidio"' }),
    historia({ titulo: 'Detuvieron a un hombre', resumen: 'Lo acusan de abuso sexual.' }),
    deAca({ titulo: 'Q.E.P.D. vecino del barrio', medio: 'El Diario Balcarce' }),
  ];
  const { decisiones } = seleccionNueva(notas, { ahora: AHORA });
  const rojas = new Set(notas.slice(30).map((n) => n.id));
  assert.equal(decisiones.filter((d) => rojas.has(d.id) && d.accion === 'publicar').length, 0);
});

// ------------------------------------------------------------------ el tope

test('el tope: lo de afuera nunca pasa 150 en 24 horas, y lo de acá entra todo', () => {
  const secciones = ['Argentina', 'Política', 'Economía', 'Fútbol', 'Deportes', 'Cultura y agenda'];
  const afuera = Array.from({ length: 300 }, (_, i) => historia({ seccion: secciones[i % secciones.length] }));
  const locales = Array.from({ length: 20 }, () => deAca());
  const { decisiones } = seleccionNueva([...afuera, ...locales], { ahora: AHORA });
  const publicadas = decisiones.filter((d) => d.accion === 'publicar');
  assert.ok(publicadas.length <= SELECCION_NUEVA.topeDiario, `salieron ${publicadas.length}`);
  assert.equal(publicadas.filter((d) => d.clase === 'balcarce').length, 20);
  assert.ok(decisiones.filter((d) => d.freno === 'tope').every((d) => d.clase !== 'balcarce'));
  // Ninguna sección se lleva más del 30 % de los lugares de afuera.
  const porSeccion = {};
  for (const d of publicadas.filter((x) => x.clase !== 'balcarce')) porSeccion[d.seccion] = (porSeccion[d.seccion] ?? 0) + 1;
  const maximo = Math.ceil(SELECCION_NUEVA.parteMaximaPorSeccion * (SELECCION_NUEVA.topeDiario - SELECCION_NUEVA.reservaLocal));
  assert.ok(Object.values(porSeccion).every((v) => v <= maximo));
});

test('el tope cuenta lo ya publicado en las últimas 24 horas y entra lo de más puntaje', () => {
  const muy = historia({ medios: Array.from({ length: 12 }, (_, i) => `Medio ${i}`) });
  const poco = historia();
  const { decisiones } = seleccionNueva([poco, muy], { ahora: AHORA, ventana: { local: 25, nacional: 119, porSeccion: {} } });
  // 150 − 119 − max(25, 30) = 1 lugar: lo ocupa la más contada.
  assert.equal(decisiones.find((d) => d.id === muy.id).accion, 'publicar');
  assert.equal(decisiones.find((d) => d.id === poco.id).freno, 'tope');
});

test('un día con mucho de Balcarce: sale todo lo de acá aunque pase el tope, y lo de afuera espera', () => {
  const locales = Array.from({ length: 160 }, () => deAca());
  const { decisiones } = seleccionNueva([...locales, historia(), historia()], { ahora: AHORA });
  assert.equal(decisiones.filter((d) => d.clase === 'balcarce' && d.accion === 'publicar').length, 160);
  assert.equal(decisiones.filter((d) => d.clase !== 'balcarce' && d.accion === 'publicar').length, 0);
  assert.equal(aplicarTope([], {}).length, 0);
});

// ------------------------------------------------------------------ Balcarce: sale todo

test('lo de Balcarce sale con una sola fuente (organismo, medio que nombra acá, la IA dice región e indirecto)', () => {
  const muni = deAca({ medio: 'Municipalidad de Balcarce', oficial: true, nombraAca: false, titulo: 'El Cementerio Municipal modificará sus horarios a partir del 26 de octubre' });
  assert.equal(decidir(muni, { ahora: AHORA }).accion, 'publicar');
  const azk = deAca({ medio: 'El Diario Balcarce', titulo: 'La AZK completó la séptima fecha con buenos resultados de los locales', seccion: 'Automovilismo' });
  assert.equal(decidir(azk, { ahora: AHORA, ficha: { ambito: 'region', impacto: 'indirecto', seccion: 'Automovilismo' } }).accion, 'publicar');
  const carballo = deAca({ medio: 'Acción 5 (Balcarce)', nombraAca: false, titulo: 'Tenis: en Copa Sudamericana competirá Natalia Carballo', seccion: 'Deportes' });
  const ficha = { ambito: 'region', impacto: 'indirecto', razon: 'actividad', seccion: 'Deportes' };
  assert.equal(claseDe(carballo, ficha), 'balcarce');
  assert.equal(decidir(carballo, { ahora: AHORA, ficha }).accion, 'publicar');
  // Lo de acá se estrena hasta 48 horas; lo de afuera, hasta 24.
  assert.equal(decidir(deAca({ fecha: haceHoras(30) }), { ahora: AHORA }).accion, 'publicar');
  assert.equal(decidir(historia({ fecha: haceHoras(30) }), { ahora: AHORA }).freno, 'tiempo');
});

test('la copia de una noticia nacional en un medio de acá espera a la IA y después pide sus medios', () => {
  const mayra = deAca({ medio: 'Infórmese Primero (FM 104.9)', nombraAca: false, titulo: 'Mayra Mendoza descarta a Kicillof: "Si Cristina no es candidata, reelige Milei"', seccion: 'Política' });
  assert.equal(decidir(mayra, { ahora: AHORA }).freno, 'ia');
  const conFicha = decidir(mayra, { ahora: AHORA, ficha: { ambito: 'nacional', impacto: 'nulo', seccion: 'Política' } });
  assert.equal(conFicha.accion, 'descartar');
  assert.equal(conFicha.freno, 'medios');
});

test('autopublicadas y menudencias (casos reales) no salen; lo que es noticia, sí', () => {
  assert.ok(esAutopublicada(deAca({ titulo: 'El abogado de Virginia Aparicio visita una radio local para hablar del caso' })));
  assert.ok(esAutopublicada(deAca({ medio: 'Diario La Vanguardia', titulo: 'Radio Líder Balcarce Stream alcanza cifras récord a dos semanas de su inicio' })));
  assert.ok(esAutopublicada(deAca({ titulo: 'Ganá tu entrada para el TC en el autódromo' })));
  // Un organismo anunciando un sorteo de viviendas es noticia.
  assert.equal(esAutopublicada(deAca({ medio: 'Municipalidad de Balcarce', oficial: true, titulo: 'Sorteo de viviendas del barrio Bicentenario' })), null);
  // "Habló en un programa" es la noticia de lo que dijo, no promoción.
  assert.equal(esAutopublicada(deAca({ titulo: 'Virginia Aparicio debate en un programa local sobre su situación en el INTA' })), null);
  // En lo de afuera, un récord de suscriptores es noticia de tecnología.
  assert.equal(esAutopublicada(historia({ titulo: 'Netflix alcanza récord de suscriptores en el streaming' })), null);

  assert.ok(esMenudencia(deAca({ titulo: 'Las farmacias difunden el cronograma de turnos para toda la semana' })));
  assert.ok(esMenudencia(deAca({ titulo: 'El pronóstico anticipa una semana fresca con lluvias y mínimas bajas' })));
  assert.ok(esMenudencia(historia({ titulo: 'El clima en Tucumán hoy, 16 de octubre de 2026: ¿va a llover?' })));
  assert.equal(esMenudencia(historia({ titulo: 'Clima en el campo: dónde se esperan lluvias de más de 100 mm y qué zonas recibirán menos agua', seccion: 'Agro' })), null);
  assert.equal(esMenudencia(deAca({ titulo: 'Continúa el alerta por lluvias y descartan la suspensión de clases' })), null);
  assert.equal(esMenudencia(historia({ titulo: 'Tiempo de descuento para el Presupuesto en Diputados' })), null);
});

test('el refrito de lo de acá no sale como nota nueva; una fecha nueva sí es novedad', () => {
  const publicadas = [{ id: 'viejo', titulo: 'Balcarce suma un plan provincial de seguridad y educación vial', fecha: haceHoras(30) }];
  const vial = deAca({ medio: 'News Balcarce (FM 91.7)', titulo: 'Plan estratégico de Educacion Vial.' });
  assert.equal(refritoDe(vial, publicadas, AHORA)?.id, 'viejo');
  assert.equal(decidir(vial, { ahora: AHORA, publicadas }).accion, 'descartar');
  const postre = [{ id: 'p1', titulo: 'Balcarce presentó la 22ª Fiesta Nacional del Postre', fecha: haceHoras(100) }];
  assert.equal(refritoDe(deAca({ titulo: 'La 22ª Fiesta Nacional del Postre se realizará el 30 y 31 de octubre' }), postre, AHORA), null);
  assert.equal(refritoDe(deAca({ titulo: 'Suspenden la Fiesta Nacional del Postre por el mal clima' }), postre, AHORA), null);
});

// ------------------------------------------------------------------ lo de afuera: medios independientes

test('lo de afuera se mide en medios independientes: un grupo cuenta una vez', () => {
  assert.equal(decidir(historia({ medios: ['Infobae', 'La Nación'] }), { ahora: AHORA }).freno, 'medios');
  assert.equal(decidir(historia({ medios: ['Infobae', 'La Nación', 'Perfil'] }), { ahora: AHORA }).accion, 'publicar');
  // Clarín, TN y Olé son del mismo dueño: es UN medio.
  assert.equal(decidir(historia({ medios: ['Clarín', 'TN (Todo Noticias)', 'Olé'] }), { ahora: AHORA }).freno, 'medios');
  // Tecnología y lo que nombra a una figura argentina piden 2.
  assert.equal(mediosQuePide('Tecnología', {}), 2);
  assert.equal(mediosQuePide('Inteligencia artificial', {}), 2);
  assert.equal(mediosQuePide('Política', { figura: 'messi' }), 2);
  assert.equal(decidir(historia({ seccion: 'Tecnología', medios: ['Infobae', 'iProUP'] }), { ahora: AHORA }).accion, 'publicar');
  // Con el umbral en 2 (la alternativa medida), dos medios alcanzan.
  assert.equal(decidir(historia({ medios: ['Infobae', 'La Nación'] }), { ahora: AHORA, mediosNacional: 2 }).accion, 'publicar');
});

test('la IA sigue sacando chimentos, publicidad y lo del extranjero sin un argentino', () => {
  const muchos = Array.from({ length: 8 }, (_, i) => `Medio ${i}`);
  assert.equal(decidir(historia({ medios: muchos }), { ahora: AHORA, ficha: { chimento: true } }).accion, 'descartar');
  assert.equal(decidir(historia({ medios: muchos }), { ahora: AHORA, ficha: { publicidad: true } }).accion, 'descartar');
  assert.equal(decidir(historia({ medios: muchos, titulo: 'El papa celebró la misa desde el hospital' }), { ahora: AHORA, ficha: { ambito: 'internacional' } }).accion, 'descartar');
  assert.equal(decidir(historia({ medios: muchos, titulo: 'Un argentino gana un premio en Europa' }), { ahora: AHORA, ficha: { ambito: 'internacional' } }).accion, 'publicar');
  // "Impacto nulo" ya no saca lo que cuentan muchos medios: lo de afuera se mide en medios.
  assert.equal(decidir(historia({ medios: muchos }), { ahora: AHORA, ficha: { ambito: 'nacional', impacto: 'nulo' } }).accion, 'publicar');
});

// ------------------------------------------------------------------ orden, repasos y posteos

test('el puntaje deja lo de acá arriba de lo de afuera y crece con los medios', () => {
  const acaSola = puntajeNuevo(deAca(), { clase: 'balcarce', ahora: AHORA });
  const afueraMuy = puntajeNuevo(historia({ medios: Array.from({ length: 10 }, (_, i) => `M${i}`) }), { clase: 'nacional', ahora: AHORA });
  assert.ok(acaSola > afueraMuy);
  assert.ok(puntajeNuevo(historia({ medios: ['A', 'B', 'C', 'D'] }), { ahora: AHORA }) > puntajeNuevo(historia({ medios: ['A', 'B', 'C'] }), { ahora: AHORA }));
});

test('repasos y posteos: lo de acá primero, Política y Policiales nunca solas', () => {
  const decisiones = [
    { id: 'a', accion: 'publicar', clase: 'nacional', seccion: 'Economía', puntaje: 70 },
    { id: 'b', accion: 'publicar', clase: 'balcarce', seccion: 'Balcarce', puntaje: 65 },
    { id: 'c', accion: 'publicar', clase: 'balcarce', seccion: 'Política', puntaje: 99 },
    { id: 'd', accion: 'publicar', clase: 'balcarce', seccion: 'Policiales', puntaje: 98 },
    { id: 'e', accion: 'publicar', clase: 'nacional', seccion: 'Argentina', puntaje: 20 },
    { id: 'f', accion: 'esperar', clase: 'balcarce', seccion: 'Balcarce', puntaje: 90 },
  ];
  assert.deepEqual(elegirParaRepaso(decisiones).map((d) => d.id), ['b', 'a']);
  assert.deepEqual(elegirParaFacebook(decisiones).map((d) => d.id), ['b', 'a']);
});

// ------------------------------------------------------------------ modo sombra

test('la selección nueva NO está conectada a producción (modo sombra)', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const vigilados = [path.join(raiz, 'web', 'scripts', 'generar-datos.mjs'), path.join(raiz, 'ingesta', 'ingesta.mjs'),
    path.join(raiz, 'ingesta', 'lectura-ia.mjs'), path.join(raiz, 'redes', 'elegir.mjs')];
  const workflows = path.join(raiz, '.github', 'workflows');
  if (fs.existsSync(workflows)) for (const f of fs.readdirSync(workflows)) vigilados.push(path.join(workflows, f));
  for (const f of vigilados) {
    if (!fs.existsSync(f)) continue;
    assert.ok(!/seleccion-nueva|comparar-seleccion/.test(fs.readFileSync(f, 'utf8')), `${path.relative(raiz, f)} usa la selección nueva`);
  }
});
