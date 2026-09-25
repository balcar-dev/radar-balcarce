// La lista roja y la amarilla del semáforo, término por término.
//
// Hasta el 25/09 la única prueba de la lista roja era "femicidio". Un término
// que dejara de funcionar (una tilde, un espacio de más, una regla de palabra
// entera que lo tapa) no lo iba a notar nadie hasta que saliera publicada una
// nota que identifica a un chico. Leyes 26.061 y 26.485: ver INVESTIGACION.md.
//
// Tres cosas:
//   1. CADA término de las dos listas, en un titular, da su color.
//   2. Los que se sumaron el 25/09, con un ejemplo real a favor y uno que NO
//      tiene que dispararse (los falsos positivos que se cuidaron al elegirlos).
//   3. Ningún término está en las dos listas a la vez.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGLAS_SEMAFORO, MOTIVO_COTIZACION } from '../ingesta/fuentes.mjs';
import { paraPruebas, semaforoDelTexto } from '../ingesta/ingesta.mjs';

const { semaforo, normalizar } = paraPruebas;

/** Una nota local, de Balcarce, con mucho puntaje: si no hay nada sensible,
 *  sale sola. Así el color depende sólo de las palabras. */
const colorDe = (titulo, cuerpo = '') => semaforo({
  titulo, cuerpo, categorias: [], peso: 20, alcance: 'local', local: true, fecha: new Date(), imagen: null,
}, 'Balcarce', 100).color;

// ------------------------------------------------------ 1. todos los términos

test('cada término de la lista roja, en un titular, da rojo', () => {
  for (const termino of REGLAS_SEMAFORO.rojo) {
    const titulo = `Balcarce: novedades sobre ${termino} en el barrio`;
    assert.equal(colorDe(titulo), 'rojo', `"${termino}" no frenó: ${titulo}`);
  }
});

test('cada término de la lista amarilla, en un titular, da amarillo', () => {
  for (const termino of REGLAS_SEMAFORO.amarillo) {
    const titulo = `Balcarce: novedades sobre ${termino} en el barrio`;
    assert.equal(colorDe(titulo), 'amarillo', `"${termino}" no pidió ojo humano: ${titulo}`);
  }
});

test('también frena si el término está en el resumen y no en el título', () => {
  assert.equal(colorDe('Novedades en el barrio', 'Según la fiscalía, se investiga un caso de grooming.'), 'rojo');
  assert.equal(colorDe('Novedades en el barrio', 'Estuvo presente un menor de 12 años.'), 'amarillo');
});

test('ningún término está en las dos listas', () => {
  const rojos = new Set(REGLAS_SEMAFORO.rojo.map(normalizar));
  const repetidos = REGLAS_SEMAFORO.amarillo.filter((t) => rojos.has(normalizar(t)));
  assert.deepEqual(repetidos, []);
});

// --------------------------------------- 2. los del 25/09, a favor y en contra
//
// [término, color, un titular que SÍ tiene que frenar, uno que NO]

const NUEVOS = [
  // Rojo: abuso de menores y de víctimas, sin vueltas.
  ['abusó sexualmente', 'rojo', 'Detienen a un hombre que abusó sexualmente de una joven', 'Se abusó de la paciencia de los hinchas'],
  ['abusaron sexualmente', 'rojo', 'Dos hombres abusaron sexualmente de una mujer', 'Se abusaron del horario de descanso'],
  ['abusada sexualmente', 'rojo', 'La mujer fue abusada sexualmente en su casa', 'Campaña sobre infecciones sexualmente transmisibles'],
  ['abusado sexualmente', 'rojo', 'Un joven fue abusado sexualmente', 'Charla sobre infecciones sexualmente transmisibles'],
  ['agresión sexual', 'rojo', 'Investigan una agresión sexual en el centro', 'Agresión verbal entre hinchas en la cancha'],
  ['agresiones sexuales', 'rojo', 'Crecen las agresiones sexuales en la provincia', 'Agresiones entre hinchas en la cancha'],
  ['abuso de menores', 'rojo', 'Condenan a un hombre por abuso de menores', 'Se venden entradas para menores y jubilados'],
  ['abuso de un menor', 'rojo', 'Detenido por el abuso de un menor', 'El abuso de un poder dominante en el mercado'],
  ['abuso de una menor', 'rojo', 'Un hombre abusó de una menor en el barrio', 'Abuso de una posición dominante en el mercado'],
  ['corrupción de menores', 'rojo', 'Imputan a un hombre por corrupción de menores', 'Corrupción en la obra pública provincial'],
  ['pornografía infantil', 'rojo', 'Allanamiento por pornografía infantil', 'Nueva sala de cine infantil en el centro'],
  ['explotación sexual', 'rojo', 'Rescatan a mujeres víctimas de explotación sexual', 'Explotación minera en la sierra'],
  ['víctimas de trata', 'rojo', 'Rescatan a tres víctimas de trata en un campo', 'Se trata de personas mayores de 60 años'],
  ['red de trata', 'rojo', 'Desbaratan una red de trata en la zona', 'Nueva red de tratamiento de efluentes'],
  ['delito de trata', 'rojo', 'Lo acusan por el delito de trata', 'Se trata de un delito menor, dijo el juez'],
  ['violada', 'rojo', 'Una joven fue violada en el barrio', 'Una viola y un violín en el concierto'],
  ['violador', 'rojo', 'Condenan al violador serial de la zona', 'Concierto de violín y viola en el teatro'],
  ['la violaron', 'rojo', 'La violaron a la salida del trabajo', 'Violaron la cuarentena en una fiesta clandestina'],
  ['estupro', 'rojo', 'Procesado por estupro', 'Estupendo fin de semana largo en las sierras'],
  // Amarillo: lo que puede dejar identificado a un chico.
  ['un menor de', 'amarillo', 'Un menor de 15 años manejaba el auto', 'Se vendió a un precio menor de lo esperado'],
  ['una menor de', 'amarillo', 'Buscan a una menor de 13 años', 'Tuvo una menor demanda que el año pasado'],
  ['el menor de', 'amarillo', 'El menor de 16 años quedó a disposición del juzgado', 'Es el menor desempleo de la década'],
  ['la menor de', 'amarillo', 'La menor de 14 años ya está con su familia', 'Fue la menor desocupación del año'],
  ['un bebé', 'amarillo', 'Nació un bebé en la ambulancia', 'Nadie bebe agua de la canilla en verano'],
  ['el bebé', 'amarillo', 'El bebé está en buen estado', 'Quien bebe no maneja, recuerda la campaña'],
  ['del bebé', 'amarillo', 'La madre del bebé habló con la prensa', 'Quien bebe no maneja, recuerda la campaña'],
  ['una beba', 'amarillo', 'Nació una beba en la guardia', 'Piden que la gente no beba agua de pozo'],
  ['la beba', 'amarillo', 'La beba ya está en su casa', 'Recomiendan que se beba más agua con el calor'],
  ['bebés', 'amarillo', 'Récord de bebés nacidos en septiembre', 'Instalan bebederos nuevos en la plaza'],
  ['recién nacido', 'amarillo', 'Un recién nacido fue trasladado a Mar del Plata', 'Un club recién inaugurado en el centro'],
  ['recién nacida', 'amarillo', 'Una recién nacida fue trasladada a Mar del Plata', 'Nacida en Balcarce, la cantante vuelve al teatro'],
  ['alumna de', 'amarillo', 'Una alumna de la Escuela 5 sufrió un accidente', 'Las alumnas de la escuela ganaron un premio'],
  ['alumno de', 'amarillo', 'Un alumno de la Técnica quedó herido', 'Exalumnos de la Escuela Técnica se reencuentran'],
  ['abusado', 'amarillo', 'El chico habría sido abusado', 'Controlan precios abusivos en los comercios'],
  ['abusada', 'amarillo', 'La joven habría sido abusada', 'Tarifas abusivas en el servicio de cable'],
  ['abusador', 'amarillo', 'Buscan a un presunto abusador', 'Un uso abusivo del estacionamiento medido'],
  ['la abusó', 'amarillo', 'Dijo que su padrastro la abusó durante años', 'Se abusó del agua durante el verano'],
  ['lo abusó', 'amarillo', 'Contó que un vecino lo abusó', 'Lo usó para ganar el partido'],
  ['abusaba de', 'amarillo', 'El hombre abusaba de su hijastra', 'Los alumnos abusaban del celular en clase'],
];

for (const [termino, color, si, no] of NUEVOS) {
  test(`"${termino}" da ${color} donde tiene que darlo, y no se dispara de más`, () => {
    const lista = color === 'rojo' ? REGLAS_SEMAFORO.rojo : REGLAS_SEMAFORO.amarillo;
    assert.ok(lista.includes(termino), `"${termino}" no está en la lista ${color}`);
    assert.equal(colorDe(si), color, `no frenó: "${si}"`);
    assert.equal(colorDe(no), 'verde', `se disparó de más: "${no}" (${semaforoDelTexto(no)?.motivo})`);
  });
}

// ------------------------------------------------ semaforoDelTexto, sola

test('semaforoDelTexto devuelve null si no hay nada sensible, y el rojo antes que el amarillo', () => {
  assert.equal(semaforoDelTexto('Se inauguró la nueva plaza del barrio'), null);
  assert.equal(semaforoDelTexto(''), null);
  assert.equal(semaforoDelTexto(null), null);
  const s = semaforoDelTexto('Lo llevaron al hospital. Es un caso de grooming.');
  assert.equal(s.color, 'rojo');
  assert.match(s.motivo, /grooming/);
});

test('semaforoDelTexto no mira las promociones: una página entera siempre dice "seguinos en"', () => {
  assert.equal(semaforoDelTexto('Se inauguró la plaza. Seguinos en Instagram. Suscribite.'), null);
});

// ------------------------------------------------ la cotización del dólar
//
// 25/09: salían dos o tres notas por día que eran sólo la cotización ("El
// dólar minorista y el dólar blue cotizan este viernes"), sin cuerpo. La
// cotización se muestra en /dolar: esas notas quedan amarillas, sin salir.

test('una nota de la cotización del dólar no sale sola: queda amarilla con su motivo', () => {
  const s = semaforo({
    titulo: 'El dólar minorista y el dólar blue cotizan este viernes', cuerpo: '', categorias: [], peso: 20, alcance: 'pais', local: false, fecha: new Date(), imagen: null,
  }, 'Economía', 100);
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, MOTIVO_COTIZACION);
  for (const t of ['Dólar hoy: a cuánto cotiza el oficial', 'Dólar blue hoy en vivo', 'Cotización del dólar este lunes', 'El dólar MEP cerró en alza']) {
    assert.equal(colorDe(t), 'amarillo', t);
  }
});

test('lo que habla de plata pero no es la cotización sí sale', () => {
  assert.equal(colorDe('El Concejo aprobó el presupuesto en pesos'), 'verde');
  // Sólo el título: el dólar en el cuerpo de una nota de economía no la frena.
  assert.equal(colorDe('Suben las exportaciones del partido', 'Los productores cobran en dólar oficial.'), 'verde');
});

test('cada término de la lista de la cotización, en un titular, da amarillo', () => {
  for (const termino of REGLAS_SEMAFORO.cotizacion) {
    assert.equal(colorDe(`Balcarce: ${termino} en el barrio`), 'amarillo', termino);
  }
});
