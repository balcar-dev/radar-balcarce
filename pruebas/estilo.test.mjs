// El estilo de lo que escribe la IA (28/09, Hernán: "que los títulos estén
// bien, que los copetes estén bien, que las notas estén realmente bien
// editadas, que no parezcan siempre IA").
//
// Un repaso editorial a mano de las notas publicadas encontró errores que se
// repetían en lo que escribe Gemini: títulos en pasado ("repasó", "ganó"), con
// una etiqueta adelante ("Rugby: …", "Exclusivo: …"), cortados en una coma,
// con admiración; cuerpos en futuro para lo que ya pasó ("este viernes" leído
// el lunes); relleno ("consolidando", "en el marco de", "cabe destacar");
// textos enteros sin tildes; cuerpos que no explican lo que promete el título;
// cifras mal copiadas ("un millón y medio" por 1,7 millones). Cada prueba es
// uno de esos casos. Lo que se arregla sin inventar se arregla
// (arreglarEscritura, tituloAutomatico); lo demás se rechaza y la IA lo vuelve
// a escribir, con los intentos que ya existen.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  verificar, arreglarEscritura, tituloEnPasado, palabrasSinTilde, problemasDeFormaDelTitulo,
  problemasDeEstilo, numerosDe, depurarCuerpo,
} from '../ingesta/verificar.mjs';
import {
  tituloAutomatico, sinEtiqueta, sinCierreColgado, terminaColgado, etiquetaAdelante,
} from '../web/lib/titulos.js';
import { reescribirAutomaticas, completarReescritura, FRASE_FUENTE_UNICA } from '../reels/reescritura.mjs';
import { ESTILO } from '../ingesta/criterio.mjs';
import { CUERPO } from './cuerpo-de-prueba.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const tipos = (r) => r.problemas.map((p) => p.tipo);

// El lunes 28/09/2026 a la tarde, en Balcarce.
const LUNES = new Date('2026-09-28T18:00:00Z');
const SABADO = new Date('2026-09-26T18:00:00Z');

// ------------------------------------------------------- el título en pasado

test('el título en pasado se reconoce por el verbo que manda', () => {
  for (const t of [
    'Pato Naranja ganó y quedó puntero',
    'El intendente repasó las obras del año',
    'Aprobaron la ordenanza de tránsito',
    'Se realizó la Expo Balcarce',
    'Fue inaugurada la obra de cloacas',
    'Tras el temporal, Balcarce recuperó la luz',
    'Detuvieron a dos hombres por el robo',
  ]) assert.ok(tituloEnPasado(t), `tenía que verse en pasado: ${t}`);
});

test('el presente, una subordinada en pasado o una cita no son un título en pasado', () => {
  for (const t of [
    'El Concejo aprueba el presupuesto 2027',
    'Ferroviarios gana por penales y juega la final',
    'Detienen al hombre que robó una moto',
    'Balcarce recuerda a Fangio, que ganó cinco títulos',
    'La obra que el municipio inició en 2024 avanza',
    'Kicillof: "Ganamos la elección"',
    'El dominó reúne a los jubilados del barrio',
    'Reabre el autódromo Juan Manuel Fangio tras una década',
    'Ferroviarios juega el domingo en Lobería',
  ]) assert.equal(tituloEnPasado(t), null, `no es pasado: ${t}`);
});

test('el verificador, con `estilo`, rechaza el título en pasado; sin `estilo` o al revalidar, no', () => {
  const fuente = { titulo: 'Ganó Pato Naranja', resumen: 'Pato Naranja ganó el clásico y quedó puntero del torneo.' };
  const nuevo = { titulo: 'Pato Naranja ganó el clásico', copete: 'El equipo quedó puntero del torneo.', guion: 'x' };
  assert.ok(tipos(verificar(fuente, nuevo, { estilo: true })).includes('pasado'));
  assert.ok(!tipos(verificar(fuente, nuevo)).includes('pasado'), 'sin estilo no se mira');
  assert.ok(!tipos(verificar(fuente, nuevo, { estilo: true, soloForma: true })).includes('pasado'), 'lo ya publicado no se baja por esto');
  const presente = verificar(fuente, { ...nuevo, titulo: 'Pato Naranja gana el clásico y queda puntero' }, { estilo: true });
  assert.ok(!tipos(presente).includes('pasado'), JSON.stringify(presente.problemas));
});

// ------------------------------------------------------- la forma del título

test('el título con admiración, pregunta, etiqueta desconocida, cortado o sin hecho se rechaza (siempre)', () => {
  const casos = [
    ['¡Ferroviarios a la final!', /admiración o de pregunta/],
    ['¿Qué pasa con la tasa vial?', /admiración o de pregunta/],
    ['Necochea: detienen a dos hombres por un robo', /etiqueta y dos puntos/],
    ['Tecnopapa, el evento que reúne a la cadena de la papa,', /cortado/],
    ['El Concejo aprueba la ordenanza y', /cortado/],
    ['La obra de cloacas avanza en el barrio…', /cortado/],
    ['Cruce en Balcarce por la tasa vial', /etiqueta y un lugar/],
    ['Preocupación por la suba del gas', /etiqueta y un lugar/],
    ['Impresionante convocatoria en la Fiesta del Postre', /adjetivo de gancho/],
  ];
  for (const [titulo, motivo] of casos) {
    const p = problemasDeFormaDelTitulo(titulo);
    assert.ok(p.some((d) => motivo.test(d)), `${titulo}: ${JSON.stringify(p)}`);
    // En verificar, también al revalidar lo ya publicado.
    assert.ok(tipos(verificar({}, { titulo, copete: 'x', guion: 'x' }, { soloForma: true })).includes('titulo'), titulo);
  }
});

test('un título bien armado, o una declaración con dos puntos y comillas, no tiene problemas de forma', () => {
  for (const t of [
    'El Concejo aprueba el presupuesto 2027',
    'Kicillof: "Vamos a terminar la ruta 226"',
    'Cortan la luz el martes en el barrio Norte',
    'Ferroviarios gana por penales y juega la final',
    'La reunión empieza a las 10:30 en el Concejo',
    'Fiesta de la Papa reúne a miles de vecinos',
    'Dolor de cabeza para el Concejo con la tasa vial',
  ]) assert.deepEqual(problemasDeFormaDelTitulo(t), [], t);
  // Una etiqueta que no es conocida ("Fiesta de la Papa:") sí se rechaza: puede ser un lugar.
  assert.ok(problemasDeFormaDelTitulo('Fiesta de la Papa: el municipio confirma la fecha').some((d) => /etiqueta y dos puntos/.test(d)));
});

test('"lo que tenés que saber" y otros ganchos se rechazan en lo que se ve primero', () => {
  const r = verificar({}, { titulo: 'Corte de luz: lo que tenés que saber', copete: 'Enterate de todo.', guion: 'x' }, { soloForma: true });
  assert.ok(tipos(r).includes('gancho'), JSON.stringify(r.problemas));
});

test('un título de más de 90 caracteres se rechaza entero: ya no se corta a mitad de una palabra', async () => {
  const largo = 'Tecnopapa reúne en el predio de la Sociedad Rural a toda la cadena productiva de la papa del país';
  assert.ok(largo.length > 90);
  assert.ok(tipos(verificar({}, { titulo: largo, copete: 'x', guion: 'x' }, { soloForma: true })).includes('largo'));
  const codigo = fs.readFileSync(path.join(RAIZ, 'reels/reescritura.mjs'), 'utf8');
  assert.doesNotMatch(codigo, /titulo\.trim\(\)\.slice\(0, TITULO\.maximo\)/, 'la reescritura volvió a cortar el título');
});

// -------------------------------------------------------------- las tildes

test('las palabras sin tilde se cuentan: las de la lista y las terminadas en -ción, -sión o -ión', () => {
  assert.deepEqual(palabrasSinTilde('La reunion fue en Paris con informacion sobre la inversion y energia'),
    ['reunion', 'Paris', 'informacion', 'inversion', 'energia']);
  assert.deepEqual(palabrasSinTilde('La reunión en París trajo información sobre la inversión y la energía'), []);
  // Palabras que también son correctas sin tilde no cuentan.
  assert.deepEqual(palabrasSinTilde('Una situación seria. El municipio publica el periodo de inscripción.'), []);
});

test(`con ${ESTILO.palabrasSinTilde} palabras sin tilde o más, el texto se rechaza`, () => {
  const fuente = { titulo: 'Reunión por la energía', resumen: 'Hubo una reunión sobre la inversión en energía y se dio información.' };
  const r = verificar(fuente, {
    titulo: 'Productores y el municipio discuten la energia',
    copete: 'La reunion trató la inversion en energia.',
    guion: 'x',
  }, { estilo: true });
  assert.ok(tipos(r).includes('tildes'), JSON.stringify(r.problemas));
});

test('con una o dos palabras sin tilde, se les pone la tilde sin pedir nada', () => {
  const { nuevo, arreglos } = arreglarEscritura({
    titulo: 'El municipio amplía la informacion del turno', copete: 'Tambien habrá guardias.', cuerpo: '', guion: 'x',
  }, { hoy: LUNES });
  assert.equal(nuevo.titulo, 'El municipio amplía la información del turno');
  assert.equal(nuevo.copete, 'También habrá guardias.');
  assert.ok(arreglos.length >= 2);
  // Con tres o más no se toca: lo rechaza el verificador.
  const muchas = arreglarEscritura({ titulo: 'x', copete: 'La reunion, la inversion y la energia.' }, { hoy: LUNES });
  assert.equal(muchas.nuevo.copete, 'La reunion, la inversion y la energia.');
});

// ------------------------------------------------------ las fechas relativas

test('"este viernes" pasa a "el viernes" cuando hoy no es viernes; "este lunes", un lunes, queda', () => {
  const { nuevo } = arreglarEscritura({
    titulo: 'Este viernes empieza la Invasión de Pueblos',
    copete: 'Los chicos participan este viernes. La vuelta es este lunes.',
    cuerpo: 'El acto es este fin de semana.',
    guion: 'x',
  }, { hoy: LUNES });
  assert.equal(nuevo.titulo, 'El viernes empieza la Invasión de Pueblos');
  assert.equal(nuevo.copete, 'Los chicos participan el viernes. La vuelta es este lunes.');
  assert.equal(nuevo.cuerpo, 'El acto es el fin de semana.');
  // Un sábado, "este fin de semana" queda.
  assert.equal(arreglarEscritura({ cuerpo: 'El acto es este fin de semana.' }, { hoy: SABADO }).nuevo.cuerpo, 'El acto es este fin de semana.');
});

test('la IA recibe la fecha de hoy y la de cada fuente con el día de la semana', async () => {
  process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba';
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    return { ok: false, status: 500, text: async () => 'no' };
  };
  await reescribirAutomaticas([{
    id: 'n1', semaforo: 'verde', seccion: 'Balcarce', local: true, titulo: 'x', resumenFuente: 'y', medios: ['A'],
    origenes: [{ medio: 'A', enlace: 'https://a/1', fecha: '2026-09-24T12:00:00Z', resumen: 'y' }],
  }], { traer: async () => null, minimoDeMaterial: 0, opciones: { fetchFn, intentos: 1 }, registro: () => {} });
  assert.match(pedidos[0], /Fecha de hoy: (lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{2}\/\d{2}\/\d{4}/);
  assert.match(pedidos[0], /publicada el jueves 24\/09\/2026/);
});

// -------------------------------------------------------------- el relleno

test('las muletillas nuevas son relleno: "cabe destacar", "sin dudas", "por este medio", "dijo presente"', () => {
  const fuente = { titulo: 'El Concejo trata el presupuesto', resumen: 'El Concejo Deliberante trató el presupuesto 2027.' };
  for (const frase of [
    'El debate, sin dudas, fue largo.',
    'Como se había informado en ocasiones previas por este medio, el debate siguió.',
    'La oposición dijo presente en la sesión.',
    'Es importante destacar que el debate siguió.',
  ]) {
    const r = verificar(fuente, { titulo: 'El Concejo trata el presupuesto 2027', copete: frase });
    assert.ok(tipos(r).includes('relleno'), frase);
  }
});

test('"Cabe destacar que…" al comienzo de una oración se saca; "Es importante que…" dice algo y queda', () => {
  const { nuevo } = arreglarEscritura({
    copete: 'El Concejo trató el presupuesto. Cabe destacar que la sesión duró tres horas.',
    cuerpo: 'Cabe señalar que hubo quórum. Es importante que los vecinos opinen.',
  }, { hoy: LUNES });
  assert.equal(nuevo.copete, 'El Concejo trató el presupuesto. La sesión duró tres horas.');
  assert.equal(nuevo.cuerpo, 'Hubo quórum. Es importante que los vecinos opinen.');
});

test('en el cuerpo, la oración con relleno se va sola y el resto queda', () => {
  const fuente = { titulo: 'Programa de viviendas', resumen: 'El programa de viviendas empezó en marzo y atendió a 40 familias.' };
  const { cuerpo, sacadas } = depurarCuerpo(fuente, {
    copete: 'x',
    cuerpo: 'El programa empezó en marzo y ya atendió a 40 familias. Consolidando su compromiso, se posiciona como una política clave.',
  });
  assert.equal(sacadas.length, 1);
  assert.match(cuerpo, /40 familias/);
  assert.doesNotMatch(cuerpo, /Consolidando/);
});

// ------------------------------------------------------------ las cifras

test('"un millón y medio" es 1.500.000: si la fuente dice 1,7 millones, se rechaza', () => {
  assert.deepEqual(numerosDe('un millón y medio de pesos'), [1_500_000]);
  assert.deepEqual(numerosDe('medio millón'), [500_000]);
  assert.deepEqual(numerosDe('dos millones de personas'), [2_000_000]);
  assert.deepEqual(numerosDe('doce mil vecinos'), [12_000]);
  const fuente = { titulo: 'Inversión en el hospital', resumen: 'La obra demandará una inversión de 1,7 millones de pesos, informó el municipio.' };
  const mal = verificar(fuente, { titulo: 'El municipio invierte en el hospital', copete: 'La obra cuesta un millón y medio de pesos.' });
  assert.ok(tipos(mal).includes('numero'), JSON.stringify(mal.problemas));
  const bien = verificar(fuente, { titulo: 'El municipio invierte en el hospital', copete: 'La obra cuesta 1,7 millones de pesos.' });
  assert.ok(!tipos(bien).includes('numero'), JSON.stringify(bien.problemas));
  // "Dos millones" ya no se lee como un "dos" suelto que la fuente no dice.
  const dos = verificar({ titulo: 'x', resumen: 'Llegaron 2 millones de turistas.' }, { titulo: 'x', copete: 'Llegaron dos millones de turistas.' });
  assert.ok(!tipos(dos).includes('numero'), JSON.stringify(dos.problemas));
});

// ------------------------------------------- que el cuerpo explique el título

test('el cuerpo que no nombra a los sancionados del título, o no dice su número, se rechaza', () => {
  const titulo = 'La Liga sanciona a Pérez, Gómez y López por los incidentes';
  const r = problemasDeEstilo({ titulo, cuerpo: 'Pérez recibió cinco fechas de suspensión por agredir al árbitro.' });
  assert.ok(r.some((p) => p.tipo === 'promesa' && /gomez/.test(p.detalle) && /lopez/.test(p.detalle)), JSON.stringify(r));
  const completo = problemasDeEstilo({ titulo, cuerpo: 'Pérez recibió cinco fechas. Gómez y López, tres cada uno.' });
  assert.ok(!completo.some((p) => p.tipo === 'promesa'), JSON.stringify(completo));
  const numero = problemasDeEstilo({ titulo: 'Balcarce suma 12 casos de dengue', cuerpo: 'Los casos se concentran en el barrio Norte.' });
  assert.ok(numero.some((p) => p.tipo === 'promesa'), JSON.stringify(numero));
  // Sin cuerpo no hay nada que comparar.
  assert.deepEqual(problemasDeEstilo({ titulo: 'Balcarce suma 12 casos de dengue', cuerpo: '' }), []);
});

// ---------------------------------------------------------- web/lib/titulos.js

test('una etiqueta conocida con dos puntos adelante se saca si lo que sigue se sostiene solo', () => {
  assert.equal(sinEtiqueta('Rugby: Pato Naranja gana el clásico y queda puntero'), 'Pato Naranja gana el clásico y queda puntero');
  assert.equal(sinEtiqueta('Exclusivo: el intendente anuncia la obra de la 226'), 'El intendente anuncia la obra de la 226');
  assert.equal(sinEtiqueta('Balcarce: el Concejo aprueba el presupuesto'), 'El Concejo aprueba el presupuesto');
  // Un lugar que no es Balcarce no se saca: la nota pasaría por de Balcarce.
  assert.equal(sinEtiqueta('Necochea: detienen a dos hombres por un robo'), 'Necochea: detienen a dos hombres por un robo');
  // Una declaración entre comillas no es una etiqueta.
  assert.equal(etiquetaAdelante('Kicillof: "Vamos a terminar la ruta"'), null);
  // Si lo que sigue no se sostiene solo, queda.
  assert.equal(sinEtiqueta('Video: el gol'), 'Video: el gol');
});

test('la coma, el signo o el conector del final se sacan', () => {
  assert.equal(sinCierreColgado('Tecnopapa, el evento que reunirá a toda la cadena productiva del país,'),
    'Tecnopapa, el evento que reunirá a toda la cadena productiva del país');
  assert.equal(sinCierreColgado('El Concejo aprueba la ordenanza de tránsito y'), 'El Concejo aprueba la ordenanza de tránsito');
  assert.equal(sinCierreColgado('La obra de cloacas avanza en el barrio…'), 'La obra de cloacas avanza en el barrio');
  assert.equal(sinCierreColgado('El Concejo aprueba la ordenanza'), 'El Concejo aprueba la ordenanza');
  assert.equal(terminaColgado('Vitamina A para los chicos de la escuela'), false, 'una mayúscula no es un conector');
  // Con menos de cuatro palabras, se deja: lo rechaza el verificador.
  assert.equal(sinCierreColgado('Llueve y'), 'Llueve y');
});

test('tituloAutomatico junta los tres arreglos y no inventa nada', () => {
  assert.equal(tituloAutomatico('Rugby: Pato Naranja gana el clásico en Balcarce,'), 'Pato Naranja gana el clásico');
  assert.equal(tituloAutomatico('Bomberos controlan un principio de incendio en Balcarce'), 'Bomberos controlan un principio de incendio');
  assert.equal(tituloAutomatico('El Concejo aprueba el presupuesto 2027'), 'El Concejo aprueba el presupuesto 2027');
  assert.equal(tituloAutomatico(null), '');
});

test('la web aplica tituloAutomatico a los títulos automáticos, nuevos y del archivo; lo de una persona no se toca', () => {
  const g = fs.readFileSync(path.join(RAIZ, 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(g, /titulo: humana \? \(deLaDecision\?\.titulo \?\? n\.titulo\) : tituloAutomatico\(/);
  assert.match(g, /n\.publicadaPor === 'ia'\) && !n\.propia \? \{ \.\.\.n, titulo: tituloAutomatico\(n\.titulo\) \}/);
});

// ------------------------------------------------ la reescritura, de punta a punta

const RESUMEN = 'El Concejo Deliberante de Balcarce aprobó este jueves la ordenanza de tránsito con el voto de la mayoría. La norma ordena el estacionamiento en el centro y fija multas por mal estacionamiento en la avenida principal.';
const NOTA = {
  id: 'n1', semaforo: 'verde', relevancia: 90, seccion: 'Balcarce', local: true, medios: ['X'],
  titulo: 'El Concejo aprobó la ordenanza de tránsito', resumenFuente: RESUMEN, enlace: 'https://x/n1',
};

function gemini(respuestas) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push(JSON.parse(init.body).contents[0].parts[0].text);
    const r = respuestas.shift();
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(r) }] } }] }) };
  };
  return { fetchFn, pedidos };
}
const correr = (respuestas, extra = {}) => {
  const g = gemini(respuestas);
  const lineas = [];
  return reescribirAutomaticas([{ ...NOTA }], {
    traer: async () => null, minimoDeMaterial: 0, intentos: {}, ahora: LUNES.getTime(),
    opciones: { fetchFn: g.fetchFn, intentos: 1 }, registro: (l) => lineas.push(l), previas: extra.previas ?? {},
  }).then((r) => ({ r, pedidos: g.pedidos, lineas }));
};
const bien = {
  titulo: 'Aprueban la ordenanza de tránsito', copete: 'El Concejo Deliberante aprobó la nueva norma de tránsito.',
  guion: 'Aprueban la ordenanza de tránsito.', cuerpo: CUERPO,
};

before(() => { process.env.GEMINI_API_KEY_REDACCION = 'clave-de-prueba'; });

test('un título en pasado se vuelve a pedir, diciéndole por qué, y se acepta el que viene en presente', async () => {
  const { r, pedidos } = await correr([{ ...bien, titulo: 'Aprobaron la ordenanza de tránsito' }, bien]);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1], /CORRECCIÓN OBLIGATORIA/);
  assert.match(pedidos[1], /está en pasado/);
  assert.equal(r.n1.titulo, 'Aprueban la ordenanza de tránsito');
});

test('una etiqueta conocida adelante y una coma al final se arreglan sin gastar otro pedido', async () => {
  const { r, pedidos } = await correr([{ ...bien, titulo: 'Balcarce: aprueban la ordenanza de tránsito,' }]);
  assert.equal(pedidos.length, 1);
  assert.equal(r.n1.titulo, 'Aprueban la ordenanza de tránsito');
});

test('lo ya publicado con "este jueves" se corrige solo al día siguiente, sin pedirle nada a la IA', async () => {
  const previas = { n1: { ...bien, copete: 'El Concejo Deliberante aprobó este jueves la nueva norma de tránsito.', deIA: true } };
  const { r, pedidos } = await correr([], { previas });
  assert.equal(pedidos.length, 0);
  assert.equal(r.n1.copete, 'El Concejo Deliberante aprobó el jueves la nueva norma de tránsito.');
});

test('la frase de la fuente única no tira la lista de "qué falta confirmar"', () => {
  const nota = { ...NOTA, origenes: [{ medio: 'X', enlace: 'https://x/n1', resumen: RESUMEN }] };
  const { extras, descartados } = completarReescritura(nota, {
    ...bien, noConfirmado: ['No se informó desde cuándo rigen las multas.', FRASE_FUENTE_UNICA],
  });
  assert.ok(!descartados.some((d) => d.campo === 'noConfirmado'), JSON.stringify(descartados));
  assert.deepEqual(extras.noConfirmado, ['No se informó desde cuándo rigen las multas.', FRASE_FUENTE_UNICA]);
});
