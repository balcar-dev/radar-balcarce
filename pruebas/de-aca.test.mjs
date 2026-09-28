// "De acá": una sola definición (28/09).
//
// Hasta el 28/09 había tres, y se pisaban:
//   · el semáforo eximía de pedir medios a lo local, a lo que dice Balcarce en
//     el título (también el de otro medio de la misma historia) y a la zona;
//   · exigirMedios eximía a lo local y a la zona, pero NO a lo que dice
//     Balcarce en el título de otro medio: lo que el semáforo dejaba verde con
//     un medio, exigirMedios lo frenaba enseguida;
//   · aplicarCupos eximía a lo local y a lo que dice Balcarce, pero NO a la
//     zona: lo que toca la 226 pasaba las dos reglas y después el cupo lo
//     bajaba como si fuera de afuera (en Policiales, con el motivo "la sección
//     es sólo de Balcarce y la zona", justo al revés).
// Ahora las tres usan esDeAca (ingesta/ingesta.mjs). Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  esDeAca, exigirMedios, aplicarCupos, paraPruebas,
} from '../ingesta/ingesta.mjs';
import { aplicarFichas } from '../ingesta/lectura-ia.mjs';
import { decodificar } from '../ingesta/articulo.mjs';
import { CUPO_DE_AFUERA } from '../ingesta/criterio.mjs';
import { REGLAS_SECCION, TEMAS } from '../ingesta/fuentes.mjs';

const { semaforo, PALABRAS_DEBILES } = paraPruebas;

/** Una nota recién leída de un feed, como la ve el semáforo. */
const leida = (titulo, extra = {}) => ({
  titulo, cuerpo: 'Resumen de la nota, sin nada raro.', categorias: [], alcance: 'pais', peso: 12, fecha: new Date(), ...extra,
});
/** Una nota de la portada, como la ven exigirMedios y aplicarCupos. */
const dePortada = (id, extra = {}) => ({
  id, titulo: `Nota ${id}`, seccion: 'Argentina', semaforo: 'verde', motivo: 'sección Argentina', local: false, nombraBalcarce: false, medios: ['Un medio'], ...extra,
});

// ------------------------------------------------------------ la definición

test('esDeAca: un medio de acá, Balcarce en el título (propio o de otro medio de la historia) y la zona', () => {
  assert.equal(esDeAca(leida('Corte de luz en el barrio Norte', { alcance: 'local' })), true, 'medio de Balcarce');
  assert.equal(esDeAca(leida('Balcarce recibe al TC este fin de semana')), true, 'Balcarce en el título');
  assert.equal(esDeAca(leida('El TC corre este fin de semana', { nombraBalcarce: true })), true, 'otro medio de la historia dice Balcarce');
  assert.equal(esDeAca(leida('Repavimentan la ruta 226', { deLaZona: true })), true, 'la zona');
  assert.equal(esDeAca(leida('El Gobierno anunció un nuevo plan de obras')), false, 'de afuera');
  assert.equal(esDeAca(dePortada('x', { local: true })), true);
  assert.equal(esDeAca(dePortada('x')), false);
});

test('esDeAca: si la IA dice que el hecho no es de acá, el título ya no alcanza; la zona sí', () => {
  assert.equal(esDeAca(dePortada('x', { nombraBalcarce: true, noEsDeAcaSegunLaIA: true })), false);
  assert.equal(esDeAca(dePortada('x', { deLaZona: true, noEsDeAcaSegunLaIA: true })), true);
});

// ------------------------------------------- los casos que se contradecían

test('Balcarce en el título de OTRO medio de la historia: el semáforo y exigirMedios dicen lo mismo', () => {
  // La principal no dice Balcarce; otro medio que contó lo mismo, sí (el
  // cruce le pasa nombraBalcarce). Con un solo medio.
  const n = leida('Llega la final del TC Pick Up', { nombraBalcarce: true, seccionFuente: 'Automovilismo' });
  assert.equal(semaforo(n, 'Argentina', 1).color, 'verde', 'el semáforo la deja salir');
  const portada = [dePortada('a', { nombraBalcarce: true, local: false })];
  exigirMedios(portada);
  assert.equal(portada[0].semaforo, 'verde', 'exigirMedios ya no la frena (antes sí)');
  aplicarCupos(portada);
  assert.equal(portada[0].semaforo, 'verde');
});

test('lo de la zona no ocupa el cupo de lo de afuera (antes el cupo lo bajaba)', () => {
  // Policiales tiene cupo 0 de afuera: "la sección es sólo de Balcarce y la zona".
  assert.equal(CUPO_DE_AFUERA.Policiales, 0);
  const zona = [dePortada('z', { seccion: 'Policiales', deLaZona: true })];
  aplicarCupos(zona);
  assert.equal(zona[0].semaforo, 'verde', 'lo de la zona sale en Policiales');

  // Y no le quita lugar a lo de afuera: con el cupo lleno, sigue saliendo.
  const cupo = CUPO_DE_AFUERA.Tecnología;
  const portada = [
    dePortada('z', { seccion: 'Tecnología', deLaZona: true }),
    ...Array.from({ length: cupo }, (_, i) => dePortada(`t${i}`, { seccion: 'Tecnología', medios: ['A', 'B'] })),
    dePortada('sobra', { seccion: 'Tecnología', medios: ['A', 'B'] }),
  ];
  aplicarCupos(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, cupo + 1);
  assert.equal(portada[0].semaforo, 'verde');
  assert.equal(portada.at(-1).semaforo, 'amarillo');
});

test('lo de la zona con un medio: verde en el semáforo, en exigirMedios y en el cupo', () => {
  const n = leida('Repavimentan la ruta 226 entre Tandil y Mar del Plata', { alcance: 'region', deLaZona: true });
  assert.equal(semaforo(n, 'Argentina', 1).color, 'verde');
  const portada = [dePortada('r', { deLaZona: true, medios: ['0223'] })];
  exigirMedios(portada);
  aplicarCupos(portada);
  assert.equal(portada[0].semaforo, 'verde');
});

test('la IA dice que no es de acá: el título ya no alcanza y pide los medios de lo de afuera', () => {
  // "Balcarce" en el título, pero en una lista de localidades: la IA dice que
  // el hecho es de otro lado. Con un medio, tiene que esperar.
  const n = dePortada('l', { titulo: 'Necochea, Lobería y Balcarce: la Invasión de Pueblos arranca el viernes', local: true, nombraBalcarce: true, alcance: 'region', relevancia: 80 });
  const ficha = {
    ambito: 'region', lugar: 'Necochea', seccion: 'Argentina', impacto: 'indirecto', razon: 'nacional', importancia: 'media', publicidad: false, anuncio: false, chimento: false, porque: '', tema: 'x',
  };
  const { notas, cambios } = aplicarFichas([n], { l: ficha });
  assert.equal(cambios.dejanDeSerLocales.length, 1);
  assert.equal(notas[0].local, false);
  assert.equal(notas[0].noEsDeAcaSegunLaIA, true);
  assert.equal(esDeAca(notas[0]), false);
  exigirMedios(notas);
  assert.equal(notas[0].semaforo, 'amarillo', 'con un medio, espera');
  assert.match(notas[0].motivo, /poco contada/);
});

test('la IA confirma que es de acá: nada cambia', () => {
  const n = dePortada('b', { titulo: 'Balcarce: reabren el Polideportivo', local: true, nombraBalcarce: true, alcance: 'pais' });
  const ficha = {
    ambito: 'balcarce', lugar: 'Balcarce', seccion: 'Balcarce', impacto: 'directo', razon: 'local', importancia: 'media', publicidad: false, anuncio: false, chimento: false, porque: '', tema: 'x',
  };
  const { notas } = aplicarFichas([n], { b: ficha });
  assert.equal(notas[0].noEsDeAcaSegunLaIA, undefined);
  assert.equal(esDeAca(notas[0]), true);
  exigirMedios(notas);
  assert.equal(notas[0].semaforo, 'verde');
});

test('las tres reglas eximen exactamente a las mismas notas', () => {
  const casos = [
    { alcance: 'local', local: true },
    { nombraBalcarce: true },
    { deLaZona: true },
    { nombraBalcarce: true, noEsDeAcaSegunLaIA: true },
    {},
  ];
  for (const c of casos) {
    const deAca = esDeAca(dePortada('x', c));
    // Semáforo: con un medio en Argentina (pide 3), sólo lo de acá sale verde.
    const sem = semaforo(leida('El Gobierno anunció un plan de obras', { local: c.local ?? false, ...c }), 'Argentina', 1).color === 'verde';
    // exigirMedios: sólo lo de acá sigue verde con un medio.
    const p1 = [dePortada('x', c)];
    exigirMedios(p1);
    // aplicarCupos: Policiales tiene cupo 0, sólo lo de acá sigue verde.
    const p2 = [dePortada('x', { ...c, seccion: 'Policiales' })];
    aplicarCupos(p2);
    const etiqueta = JSON.stringify(c);
    assert.equal(sem, deAca, `semáforo ${etiqueta}`);
    assert.equal(p1[0].semaforo === 'verde', deAca, `exigirMedios ${etiqueta}`);
    assert.equal(p2[0].semaforo === 'verde', deAca, `aplicarCupos ${etiqueta}`);
  }
});

test('una fuente oficial o una nota propia no piden medios, pero no son "de acá"', () => {
  const portada = [dePortada('o', { oficial: true }), dePortada('p', { propia: true })];
  exigirMedios(portada);
  assert.deepEqual(portada.map((n) => n.semaforo), ['verde', 'verde']);
  assert.equal(esDeAca(portada[0]), false);
  assert.equal(esDeAca(portada[1]), false);
});

// ------------------------------------------------- limpieza del 28/09

test('cada palabra débil es palabra de alguna sección (si no, no hace nada)', () => {
  const todas = new Set(REGLAS_SECCION.flatMap((r) => r.palabras));
  for (const p of PALABRAS_DEBILES) assert.ok(todas.has(p), `"${p}" está en PALABRAS_DEBILES y en ninguna regla`);
});

test('el hospital se llama Felipe Fossati, no Glasman', () => {
  const palabras = TEMAS.find((t) => t.ranura === 'hospital').palabras;
  assert.ok(palabras.includes('hospital fossati'));
  assert.ok(!palabras.some((p) => p.includes('glasman')));
});

test('una sola forma de traducir entidades de HTML, para los feeds y para la nota', () => {
  assert.equal(paraPruebas.decodificar, decodificar);
  assert.equal(decodificar('&ldquo;Hola&rdquo; &amp; ch&aacute;u'), '"Hola" & cháu');
  assert.equal(decodificar('<![CDATA[Título]]>'), 'Título');
  assert.equal(decodificar('&#8220;x&#8221; &#x2019;'), '“x” ’');
  assert.equal(decodificar('&#128512;'), '😀', 'fuera del plano básico');
  assert.equal(decodificar('&#99999999;'), '&#99999999;', 'un número imposible no rompe el feed');
  assert.equal(decodificar('&raro;'), '&raro;', 'en un feed, lo desconocido queda');
  assert.equal(decodificar('a&raro;b', { desconocidas: ' ' }), 'a b', 'en la nota, un espacio');
});
