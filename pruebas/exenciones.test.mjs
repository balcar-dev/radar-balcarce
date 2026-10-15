// Regla 172 (15/10/2026): las exenciones angostas del semáforo amarillo y los huecos que se cerraron.
//
// Salen de la auditoría de docs/etapa-6-9/ANALISIS.md (A.3): "El Niño" del clima frenaba como un chico, "petro" encontraba "petróleo",
// "sorteo del fixture" frenaba como una rifa. Al revés, "Dos niñas quedaron internadas" y "chicos de 15 y 16 años detenidos" salían en verde.
//
// Cada exención tiene su caso real a favor y sus controles en contra: lo que de verdad es un chico, una víctima o una rifa SIGUE frenando.
// Lo rojo y la lista de sepelios no se tocaron (la huella está en pruebas/semaforo.test.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semaforoDelTexto, paraPruebas } from '../ingesta/ingesta.mjs';
import { menorPorEdad } from '../ingesta/menores.mjs';
import { REGLAS_SEMAFORO, AMARILLO_MENORES, AMARILLO_SOLO_EN_EL_PRINCIPIO } from '../ingesta/fuentes.mjs';
import { sinFenomenoClimatico, sinSorteosDeportivos, sinAnimales, sinInfanciaDeAdulto, tituloConArgentino } from '../ingesta/exenciones.mjs';

const { semaforo, normalizar } = paraPruebas;

const color = (t, o) => semaforoDelTexto(t, o)?.color ?? 'verde';
/** Una nota de afuera, contada por varios medios: así el color depende sólo de las palabras. */
const deAfuera = (titulo, extra = {}) => semaforo({
  titulo, cuerpo: extra.cuerpo ?? '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null, medios: ['A', 'B', 'C', 'D'], ...extra,
}, extra.seccion ?? 'Política');

// ------------------------------------------------------------ 1. El Niño / La Niña (el clima)

test('"El Niño" / "La Niña" del clima no frenan como un chico (casos reales del 15/10)', () => {
  for (const t of [
    'El Niño golpea el Litoral: la central de Yacyretá abrió sus compuertas por las lluvias',
    'El fenómeno El Niño golpea al Litoral: crecidas récord',
    'La represa Yacyretá suspende las visitas por la crecida del Paraná. El Niño trae lluvias intensas',
    'El tiempo en el AMBA para este viernes 9 de octubre. Pronóstico: temperaturas altas por El Niño',
    'El SMN confirmó que El Niño se intensificará entre octubre y febrero',
    'Por La Niña, la sequía golpea a la zona núcleo',
    'El Servicio Meteorológico Nacional anticipa lluvias superiores a lo normal por el fenómeno de El Niño',
  ]) assert.equal(color(t), 'verde', t);
});

test('un chico sigue frenando aunque el texto hable del clima, y "El Niño" sin clima también', () => {
  for (const t of [
    'Rescataron a un niño tras la inundación por las lluvias',                                 // un niño, en minúscula
    'El niño de 8 años fue rescatado tras las lluvias',                                         // el niño (minúscula)
    'El Niño de 8 años fue rescatado tras las lluvias',                                         // mayúscula pero con edad
    'Rescataron a la niña tras la crecida; dicen que La Niña trae lluvias',                      // una niña de verdad + el fenómeno
    'El fenómeno El Niño preocupa; un niño murió ahogado',                                      // el fenómeno + un niño
    'El Niño Jesús: procesión bajo la lluvia',                                                   // "Niño Jesús"
    'El Niño Maravilla jugó con lluvia y barro',                                                 // apodo en mayúscula
    'El Niño golpea el Litoral',                                                                 // sin ninguna palabra de clima: no se libera
    'EL NIÑO SE PERDIÓ EN EL CAMPO TRAS LAS LLUVIAS',                                            // todo en mayúsculas: no se libera
  ]) assert.equal(color(t), 'amarillo', t);
});

test('El Niño del clima no destapa nada rojo: lo rojo se mira sobre el texto original', () => {
  assert.equal(color('El fenómeno El Niño y un caso de abuso sexual en la zona de las lluvias'), 'rojo');
  assert.equal(color('Por el clima de El Niño, un menor de edad fue identificado'), 'rojo');
  assert.equal(color('Lluvias por El Niño: se quitó la vida un hombre'), 'rojo');
  // Y la lista de "nunca" (título) sigue igual.
  assert.equal(deAfuera('Sepelio de un vecino tras las lluvias de El Niño', { local: true, alcance: 'local' }).color, 'rojo');
});

test('sinFenomenoClimatico sólo tapa con contexto de clima y con la inicial en mayúscula', () => {
  assert.match(sinFenomenoClimatico('Hay sequía por El Niño'), /fenomeno ENSO/);
  assert.equal(sinFenomenoClimatico('Hay un niño en la sequía'), 'Hay un niño en la sequía');
  assert.equal(sinFenomenoClimatico('El Niño se perdió'), 'El Niño se perdió');
  assert.equal(sinFenomenoClimatico('Con lluvias, El Niño Jesús sale en procesión'), 'Con lluvias, El Niño Jesús sale en procesión');
});

// ------------------------------------------------------------ 2. "petro" es Petro, no petróleo

test('"petro" encuentra a Petro pero ya no a petróleo, petroleras ni petroquímica', () => {
  for (const t of ['El FMI alertó que el petróleo seguirá caro en 2027', 'La minería sigue en alza por el petróleo y las petroleras', 'Nueva planta petroquímica en Bahía Blanca', 'El petróleo cae pero Vaca Muerta crece']) {
    assert.equal(deAfuera(t).color, 'verde', t);
  }
  for (const t of ['Gustavo Petro visitó Buenos Aires', 'Petro rechazó el acuerdo con Estados Unidos', 'El presidente colombiano, Petro, habló en la ONU']) {
    assert.equal(deAfuera(t).motivo.startsWith('internacional'), true, t);
  }
});

// ------------------------------------------------------------ 3. "sorteo": del fixture, de zonas, de la Copa… no es una rifa

test('el sorteo de un torneo, del fixture o de un tribunal no es una promoción (casos reales del 15/10)', () => {
  for (const t of [
    'Fin del fútbol gratis: la AFA confirmó el sorteo del fixture',
    'Los próximos partidos de River en el Torneo Clausura y el fixture completo, tras el sorteo',
    'Se hizo el sorteo de zonas del Torneo Federal',
    'Sorteo de la Copa Argentina: así quedaron los cruces de los equipos',
    'Quedaron definidos los grupos tras el sorteo de la fase de grupos del Mundial',
    'Empezó la reunión en Tribunales: la Corte sortea la sala que analizará la causa',
    'Sortearon los jueces del tribunal oral',
  ]) assert.equal(deAfuera(t, { seccion: 'Fútbol' }).color, 'verde', t);
});

test('las rifas y promociones siguen frenando, sorteos y todo', () => {
  for (const t of [
    'Sorteo Tu Producto lanzó su quinto sorteo: un Smart TV de 55 pulgadas',
    'Sorteo de entradas para el partido de la Selección',
    'Sorteo de camisetas firmadas por el plantel',
    'Sorteo de la Copa del club: ganá una moto 0 km',                  // "copa" sin contexto de deportes
    'Participá del sorteo del Club Atlético por el fixture impreso',    // "participá del" sigue siendo promoción
    'Sortearemos una bicicleta entre los socios',
    'El Banco sorteará un auto entre quienes paguen con tarjeta',
  ]) assert.equal(deAfuera(t, { seccion: 'Fútbol' }).color, 'amarillo', t);
});

test('sinSorteosDeportivos no toca lo que no es un sorteo deportivo', () => {
  assert.equal(sinSorteosDeportivos(normalizar('Sorteo de una Smart TV')), 'sorteo de una smart tv');
  assert.equal(sinSorteosDeportivos('sorteo del fixture'), 'definicion');
});

// ------------------------------------------------------------ 4. otros falsos positivos inofensivos

test('lo internacional que nombra a un argentino no queda "sin relación con Balcarce" (pasa al control de medios)', () => {
  const t = 'Milei ratificó su alineamiento con Trump y volvió a cargar contra Lula da Silva';
  assert.equal(deAfuera(t, { medios: ['A', 'B', 'C', 'D'] }).color, 'verde');
  // Sigue sin salir sola si la cuenta poca gente (Política pide 3 medios).
  assert.equal(deAfuera(t, { medios: ['A'] }).color, 'amarillo');
  assert.match(deAfuera(t, { medios: ['A'] }).motivo, /poco contada/);
  assert.equal(deAfuera('Javier Milei viaja a Estados Unidos para reforzar su alianza con Trump').color, 'verde');
  assert.equal(deAfuera('Trump anuncia aranceles a la Argentina').color, 'verde');
  // Sin argentino sigue como siempre.
  for (const t2 of ['El acuerdo de la FIFA con la Torre Trump: 7 años', 'Putin y Trump se reúnen en Alaska', 'Lula y Petro firmaron un pacto']) {
    assert.equal(deAfuera(t2, { seccion: 'Fútbol' }).motivo.startsWith('internacional'), true, t2);
  }
  assert.equal(tituloConArgentino('putin y trump se reunen'), false);
});

test('el cadáver de un animal y los pollitos recién nacidos no frenan, el de una persona sí', () => {
  for (const t of [
    'Alarma en Puerto Madryn: encontraron el cadáver de una ballena y otros cadáveres de delfines en la costa',
    'Nueva vacuna protege a las aves recién nacidas de producción',
    'Entregan alimento a los terneros recién nacidos',
  ]) assert.equal(color(t, { conMuerte: false }), 'verde', t);
  for (const t of [
    'Hallaron el cadáver de un hombre en la costa',
    'Hallaron el cadáver de una ballena y el de un hombre',   // lo de la persona no se tapa
    'Nació un recién nacido en la ambulancia',
    'Un bebé recién nacido fue trasladado',
    'Cadáver de una joven en el río',
  ]) assert.equal(color(t, { conMuerte: false }), 'amarillo', t);
  assert.equal(sinAnimales('cadaver de un hombre'), 'cadaver de un hombre');
});

test('un adulto que recuerda su infancia no es un chico', () => {
  for (const t of ['Messi, cuando era niño, jugaba en Rosario', 'Desde niña soñaba con ser campeona', 'Siendo niño, el campeón vendía diarios']) assert.equal(color(t), 'verde', t);
  for (const t of ['Un niño de 8 años fue atendido', 'Rescataron a un niño que se perdió', 'Cuando era niño fue abusado por un vecino']) assert.notEqual(color(t), 'verde', t);
  assert.equal(color('Cuando era niño fue abusado por un vecino'), 'amarillo');
  assert.equal(sinInfanciaDeAdulto('un nino de 8 anos'), 'un nino de 8 anos');
});

// ------------------------------------------------------------ 5. huecos que se cierran (más estricto que antes)

test('los chicos en plural frenan en la ingesta (título y comienzo): "Dos niñas quedaron internadas"', () => {
  for (const t of [
    'Dos niñas quedaron internadas tras el choque en la ruta',
    'Los nenes del jardín fueron evacuados por un incendio',
    'Hallaron a los niños que estaban perdidos en el monte',
    'Dos nenas fueron atropelladas en la esquina',
  ]) assert.equal(color(t), 'amarillo', t);
  assert.equal(color('Novedades en el barrio', 'x'), 'verde');
  assert.equal(semaforoDelTexto('Novedades en el barrio. Unas nenas llegaron al hospital.')?.color, 'amarillo');
});

test('los plurales NO frenan el texto entero de la fuente ni lo que escribe la IA (sólo el principio): no entran en AMARILLO_MENORES', () => {
  for (const p of AMARILLO_SOLO_EN_EL_PRINCIPIO) {
    assert.ok(!AMARILLO_MENORES.includes(p), p);
    assert.ok(!REGLAS_SEMAFORO.amarillo.includes(p), p);
  }
  assert.equal(semaforoDelTexto('La escuela hizo un acto. En el quinto párrafo los niños cantaron.', { soloMenores: true }), null);
  // ...pero el singular y el resto de lo de menores siguen frenando el texto entero, como antes.
  assert.equal(semaforoDelTexto('La escuela hizo un acto. Un niño se descompuso.', { soloMenores: true })?.color, 'amarillo');
});

test('una edad doble o una lista de edades: "chicos de 15 y 16 años detenidos"', () => {
  for (const t of [
    'Detuvieron a dos chicos de 15 y 16 años por un robo',
    'Detuvieron a tres jóvenes de 14, 15 y 19 años',
    'Alumnos de entre 12 y 17 años viajaron a Mar del Plata',
    'Dos nenes de 5 y 7 años se perdieron',
    'Dos jóvenes de 17 y 25 años chocaron en la ruta 226',     // uno solo es menor: alcanza
    'Una chica de 16 años fue golpeada',                         // lo de siempre
  ]) {
    assert.ok(menorPorEdad(t), t);
    // El mismo camino que producción: semaforoDelTexto normaliza (saca las comas) antes de mirar las edades.
    assert.ok(menorPorEdad(normalizar(t)), `normalizado: ${t}`);
    assert.equal(color(t), 'amarillo', `semáforo: ${t}`);
  }
  for (const t of [
    'Dos jóvenes de 19 y 25 años chocaron en la ruta',
    'Hijos de 20 y 22 años heredaron la empresa',
    'El club cumple 100 años',
    'La menor inflación en 12 años',
    'Un hombre de 45 años chocó en la 226',
    'Los chicos de la escuela cumplen 10 años de la fundación',
  ]) assert.equal(menorPorEdad(t), null, t);
  assert.equal(color('Detuvieron a dos chicos de 15 y 16 años por un robo'), 'amarillo');
  assert.equal(color('Detuvieron a dos chicos de 15 y 16 años por un robo', { soloMenores: true }), 'amarillo');
});

test('A3: la lista de edades con comas frena en el semáforo real, aunque normalizar saque las comas', () => {
  for (const t of [
    'Tres chicos de 14, 15 y 17 años ganaron el torneo de ajedrez',
    'Tres chicos de 14 15 y 17 años ganaron el torneo de ajedrez',
    'Detuvieron a tres jóvenes de 14, 15 y 19 años',
  ]) assert.equal(color(t), 'amarillo', t);
  for (const t of [
    'Tres jóvenes de 18, 19 y 25 años ganaron el torneo',
    'Dos hijos de 20, 22 y 30 años heredaron el campo',
  ]) assert.equal(color(t), 'verde', t);
});

test('A3: se mira a TODAS las personas con edad, no sólo a la primera', () => {
  for (const t of [
    'Una joven de 22 años y su hija de 3 años viajaban en el auto',
    'Un joven de 20 años y su hijo de 2 años quedaron internados',
    'Un hombre de 45 años y un menor de 14 años chocaron en la ruta',
  ]) {
    assert.ok(menorPorEdad(t), t);
    assert.equal(color(t), 'amarillo', t);
    assert.equal(color(t, { soloMenores: true }), 'amarillo', `soloMenores: ${t}`);
  }
  for (const t of [
    'Una joven de 22 años y su pareja de 30 años viajaban en el auto',
    'Un hombre de 45 años y un joven de 25 años chocaron en la ruta',
  ]) assert.equal(color(t), 'verde', t);
});

test('A2: el sorteo del fixture sólo tapa la palabra "sorteo": víctima, menor o rifa del medio siguen frenando', () => {
  for (const t of [
    'En el sorteo de la Copa una víctima del bolillero',
    'Durante el sorteo atropellaron a una nena y se suspendieron los cruces',
    'Tras el sorteo hallaron a una víctima y se armó el fixture',
    'Quedaron los cruces y una víctima fatal tras el sorteo',
    'Con el fixture a la vista, un menor de edad fue al sorteo',
  ]) assert.notEqual(color(t), 'verde', t);
  // El tramo del medio queda a la vista.
  assert.equal(sinSorteosDeportivos('en el sorteo de la copa una victima del bolillero'), 'en el definicion de la copa una victima del bolillero');
  assert.equal(sinSorteosDeportivos('quedaron los cruces y una victima fatal tras el sorteo'), 'quedaron los cruces y una victima fatal tras el definicion');
  // Lo de antes sigue pasando.
  assert.equal(sinSorteosDeportivos('el sorteo definio el fixture'), 'el definicion definio el fixture');
  assert.equal(color('Fin del fútbol gratis: la AFA confirmó el sorteo del fixture', { }), 'verde');
});
