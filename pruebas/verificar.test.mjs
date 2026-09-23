// El control sobre lo que escribe la IA.
//
// Cada prueba es una manera concreta en que una IA puede inventar algo sin
// decir nada "prohibido": un número cambiado, un nombre agregado, un día
// que la fuente nunca mencionó. Un filtro de palabras no atrapa nada de
// esto, porque el texto es correcto, educado y falso.
//
// Sin llamar a ninguna IA: lo que se prueba es la comparación.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verificar, numerosDe, nombresDe, resumirProblemas,
} from '../ingesta/verificar.mjs';

const FUENTE = {
  titulo: 'Kevin Gómez fue recibido por una multitud en Balcarce',
  resumen: 'El boxeador balcarceño fue recibido por 3.500 vecinos en el cruce de las rutas 226 y 55. '
    + 'El campeón argentino de los supermedianos recorrió el trayecto a bordo de una autobomba de los Bomberos Voluntarios.',
};

const tipos = (r) => r.problemas.map((p) => p.tipo);

// ------------------------------------------------------- lo que sí pasa

test('una reescritura fiel pasa', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez volvió a Balcarce como campeón',
    copete: 'El boxeador fue recibido por una multitud en las rutas 226 y 55 y llegó al centro en una autobomba.',
    guion: 'Kevin Gómez volvió a Balcarce como campeón argentino.',
  });
  assert.deepEqual(r.problemas, []);
  assert.equal(r.ok, true);
});

test('un número redondeado pasa', () => {
  // La instrucción a la IA pide redondear. 3.500 → "unos 3.400" no es una
  // invención; 3.500 → "diez mil" sí.
  const r = verificar(FUENTE, {
    titulo: 'Recibieron a Kevin Gómez con unos 3.400 vecinos',
    copete: 'El campeón llegó a Balcarce.',
  });
  assert.ok(!tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un número escrito en palabras se reconoce', () => {
  assert.deepEqual(numerosDe('Tres heridos y catorce demorados'), [3, 14]);
  assert.deepEqual(numerosDe('Chocaron 3 autos'), [3]);
});

test('las cifras con puntos y comas se leen bien', () => {
  assert.deepEqual(numerosDe('1.234 personas'), [1234]);
  assert.deepEqual(numerosDe('un aumento de 12,5%'), [12.5]);
  assert.deepEqual(numerosDe('$14 millones'), [14_000_000]);
  assert.deepEqual(numerosDe('200 mil pesos'), [200_000]);
});

test('"14 millones" y "catorce millones" son lo mismo', () => {
  const r = verificar(
    { titulo: 'Subastarán terrenos', resumen: 'Las bases arrancan en $14 millones.' },
    { titulo: 'Subastarán terrenos municipales', copete: 'Las bases parten de 14 millones de pesos.' },
  );
  assert.ok(!tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

// -------------------------------------------------- lo que inventa la IA

test('un número que la fuente no dice se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por 8.000 vecinos',
    copete: 'El campeón volvió a Balcarce.',
  });
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
  assert.equal(r.ok, false);
});

test('un número chico cambiado se rechaza: cuatro no es tres', () => {
  const r = verificar(
    { titulo: 'Choque en la ruta', resumen: 'Tres personas resultaron heridas.' },
    { titulo: 'Choque en la ruta con cuatro heridos', copete: 'Hubo cuatro heridos.' },
  );
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un nombre que la fuente no nombra se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido junto a Marcelo Tinelli',
    copete: 'El boxeador recorrió la ciudad.',
  });
  assert.ok(tipos(r).includes('nombre'), JSON.stringify(r.problemas));
  assert.ok(r.problemas.some((p) => /tinelli/i.test(p.detalle)));
});

test('una sigla inventada se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por la FIFA',
    copete: 'El boxeador llegó a Balcarce.',
  });
  assert.ok(tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('un día de la semana que la fuente no dice se rechaza', () => {
  // "El viernes" es un dato: si la fuente no lo trae, la IA lo inventó.
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez llegó a Balcarce el viernes',
    copete: 'El campeón fue recibido por la gente.',
  });
  assert.ok(tipos(r).includes('fecha'), JSON.stringify(r.problemas));
});

test('un día que la fuente sí dice pasa', () => {
  const r = verificar(
    { titulo: 'Ferroviarios juega el domingo', resumen: 'El equipo visita a Lobería el domingo.' },
    { titulo: 'Ferroviarios visita a Lobería el domingo', copete: 'El equipo juega de visitante.' },
  );
  assert.ok(!tipos(r).includes('fecha'), JSON.stringify(r.problemas));
});

test('una cita que la fuente no dice se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por una multitud',
    copete: 'El boxeador dijo: "Es el día más feliz de mi vida".',
  });
  assert.ok(tipos(r).includes('cita'), JSON.stringify(r.problemas));
});

test('una cita textual de la fuente pasa', () => {
  const r = verificar(
    { titulo: 'Dijo que no', resumen: 'El intendente afirmó: "no vamos a subir las tasas este año".' },
    { titulo: 'El intendente descartó subir las tasas', copete: 'Afirmó que "no vamos a subir las tasas este año".' },
  );
  assert.ok(!tipos(r).includes('cita'), JSON.stringify(r.problemas));
});

// ------------------------------------------------ la doctrina Campillay

test('un delito dicho como hecho se rechaza', () => {
  // Es el error que puede terminar en una demanda: presentar como hecho lo
  // que es una acusación.
  const r = verificar(
    { titulo: 'Denuncian a un comerciante', resumen: 'Un vecino denunció que el comerciante estafó a varios clientes.' },
    { titulo: 'Un comerciante estafó a varios clientes', copete: 'El comerciante estafó a los vecinos de la zona.' },
  );
  assert.ok(tipos(r).includes('acusacion'), JSON.stringify(r.problemas));
});

test('un delito atribuido pasa', () => {
  const r = verificar(
    { titulo: 'Denuncian a un comerciante', resumen: 'Un vecino denunció que el comerciante estafó a varios clientes.' },
    { titulo: 'Denuncian a un comerciante por presunta estafa', copete: 'Según la denuncia de un vecino, habría estafado a varios clientes.' },
  );
  assert.ok(!tipos(r).includes('acusacion'), JSON.stringify(r.problemas));
});

// -------------------------------------------------------- las negaciones

test('una negación que la fuente no tiene se rechaza', () => {
  const r = verificar(
    { titulo: 'El municipio confirmó el corte', resumen: 'El corte de agua será mañana en el centro.' },
    { titulo: 'El municipio no confirmó el corte', copete: 'El corte de agua no será mañana.' },
  );
  assert.ok(tipos(r).includes('negacion'), JSON.stringify(r.problemas));
});

test('una negación que desaparece se rechaza', () => {
  const r = verificar(
    { titulo: 'El intendente no descartó una suba', resumen: 'No descartó subir las tasas el año próximo.' },
    { titulo: 'El intendente subirá las tasas', copete: 'Las tasas van a subir el año próximo.' },
  );
  assert.ok(tipos(r).includes('negacion'), JSON.stringify(r.problemas));
});

// ------------------------------------------------------------ la copia

test('copiar el original palabra por palabra se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido por una multitud en Balcarce',
    copete: 'El campeón argentino de los supermedianos recorrió el trayecto a bordo de una autobomba de los Bomberos Voluntarios.',
  });
  assert.ok(tipos(r).includes('copia'), JSON.stringify(r.problemas));
});

// ---------------------------------------------------------- lo formal

test('un título vacío se rechaza', () => {
  const r = verificar(FUENTE, { titulo: '', copete: 'Algo', guion: '' });
  assert.ok(tipos(r).includes('vacio'));
});

test('un título larguísimo se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez volvió a Balcarce como campeón argentino y lo recibieron los vecinos con mucha emoción en las rutas 226 y 55',
    copete: 'El boxeador llegó.',
  });
  assert.ok(tipos(r).includes('largo'), JSON.stringify(r.problemas));
});

// ------------------------------------------------------------- los nombres

test('el inicio de una oración no es un nombre propio', () => {
  // "Durante la sesión…" no convierte a "durante" en un nombre.
  const n = nombresDe('Durante la sesión hablaron. Kevin Gómez llegó.');
  assert.ok(!n.has('durante'));
  assert.ok(n.has('gomez'));
});

test('las siglas cuentan aunque abran la oración', () => {
  assert.ok(nombresDe('INTA presentó un proyecto').has('inta'));
});

test('un plural del mismo nombre no es un nombre nuevo', () => {
  const r = verificar(
    { titulo: 'Los Bomberos Voluntarios recibieron una donación', resumen: 'El Bombero Voluntario más antiguo agradeció.' },
    { titulo: 'Bomberos Voluntarios recibieron una donación', copete: 'Los Bomberos agradecieron.' },
  );
  assert.ok(!tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('Balcarce no cuenta como un nombre inventado', () => {
  // La IA trabaja para un medio de Balcarce y lo puede nombrar sin que lo
  // diga la fuente.
  const r = verificar(
    { titulo: 'Inauguraron una plaza', resumen: 'La obra estuvo a cargo del municipio.' },
    { titulo: 'Inauguraron una plaza en Balcarce', copete: 'La obra estuvo a cargo del municipio.' },
  );
  assert.ok(!tipos(r).includes('nombre'), JSON.stringify(r.problemas));
});

test('el resumen de problemas se lee en una línea', () => {
  const r = verificar(FUENTE, { titulo: 'Kevin Gómez con Tinelli y 8.000 vecinos', copete: 'Llegó el viernes.' });
  assert.match(resumirProblemas(r.problemas), /problemas \(/);
});

// -------------------------------------------------------------- las tildes

test('"mas" sin tilde se rechaza: cambia el sentido, no es un detalle de estilo', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban mas de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

test('"ms" solo (la IA se comió la "á" de "más") también se rechaza', () => {
  // Pasó el 23/09: "con ms de ciento sesenta atletas" en vez de "con más de...".
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban ms de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

test('"más" bien escrito no tiene ningún problema de tilde', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo esperaban más de tres mil personas en el cruce de las rutas.',
  });
  assert.ok(!tipos(r).includes('tilde'), JSON.stringify(r.problemas));
});

// --------------------------------------------------------------- el cuerpo

test('un número inventado en el cuerpo se rechaza igual que en el copete', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo recibieron en el cruce de las rutas.',
    cuerpo: 'Participaron 500 personas del festejo, según contaron los vecinos presentes.',
  });
  assert.ok(tipos(r).includes('numero'), JSON.stringify(r.problemas));
});

test('un cuerpo demasiado largo se rechaza', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'Lo recibieron en el cruce de las rutas.',
    cuerpo: 'Párrafo largo. '.repeat(100),
  });
  assert.ok(tipos(r).includes('largo'), JSON.stringify(r.problemas));
});

test('un cuerpo corto y fiel a la fuente no tiene ningún problema', () => {
  const r = verificar(FUENTE, {
    titulo: 'Kevin Gómez fue recibido en Balcarce',
    copete: 'El boxeador balcarceño volvió campeón.',
    cuerpo: 'Llegó arriba de un vehículo de emergencias de la ciudad, acompañado por gente del barrio que salió a saludarlo.',
  });
  assert.equal(r.ok, true, JSON.stringify(r.problemas));
});
