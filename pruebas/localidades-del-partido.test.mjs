// Regla 179 (15/10/2026). Hernán y Andrés: "San Agustín y Los Pinos tienen que estar" como zona de acá, igual
// que el resto de las localidades del partido (Balcarce, San Agustín, Bosch, Napaleofú, Los Pinos, Villa Laguna
// La Brava, Ramos Otero; Mar del Sud NO: es de General Alvarado). Como San Agustín, Los Pinos y Bosch también son
// otros lugares (San Agustín de Córdoba, de Tucumán y de Hipona; el barrio Los Pinos de Mar del Plata; la
// Residencia Los Pinos de México; la marca Bosch), cuentan como de acá sólo con respaldo: en un medio de Balcarce,
// o en el título de uno de afuera que además nombra algo firme de acá o de la zona en el título o la bajada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALABRAS_LOCALES, PALABRAS_LOCALES_DEBILES, PALABRAS_ZONA, localidadDudosaEn, nombraLocalidadDudosa } from '../ingesta/fuentes.mjs';
import { paraPruebas, esDeAca } from '../ingesta/ingesta.mjs';
import { mencionaAca } from '../ingesta/lectura-ia.mjs';

const { esDeBalcarce, mencionaBalcarce } = paraPruebas;
const deAca = (titulo, cuerpo = '') => ({ titulo, cuerpo, alcance: 'local' });
const deAfuera = (titulo, cuerpo = '', alcance = 'region') => ({ titulo, cuerpo, alcance });

test('las siete localidades del partido están: las firmes en PALABRAS_LOCALES y las dudosas en PALABRAS_LOCALES_DEBILES; Mar del Sud no', () => {
  const todas = [...PALABRAS_LOCALES, ...PALABRAS_LOCALES_DEBILES];
  for (const l of ['balcarce', 'napaleofú', 'ramos otero', 'laguna la brava', 'san agustín', 'los pinos', 'bosch']) assert.ok(todas.includes(l), `falta ${l}`);
  for (const l of ['san agustín', 'los pinos', 'bosch']) assert.ok(!PALABRAS_LOCALES.includes(l), `${l} es ambigua: no puede ser firme`);
  assert.ok(!todas.some((p) => /mar del sud/.test(p)), 'Mar del Sud es de General Alvarado');
  assert.ok(!PALABRAS_ZONA.some((p) => /mar del sud|san agust|los pinos/.test(p)));
});

test('casos reales de medios de Balcarce: la localidad sola alcanza (ya no esperan a la IA por "no nombrar nada de acá")', () => {
  // La Vanguardia, 10/2026 (jfn0bi); Infórmese Primero (u043fh); La Vanguardia (tctot0).
  const reales = [
    deAca('Proyecto escolar de Los Pinos llegó a Decisión Niñez', 'Alumnos de la Primaria Nº 19 presentaron su proyecto de huerta en Santa Clara del Mar.'),
    deAca('Organizan una peregrinación a pie hacia la Ermita de Los Pinos', 'La caminata en honor a la Virgen del Rosario de San Nicolás será el sábado 17 de octubre.'),
    deAca('Valeria Ares comparte su experiencia a dieciséis años de su doble trasplante', 'La vecina de San Agustín conmemora dieciséis años de su intervención en la Fundación Favaloro.'),
  ];
  for (const n of reales) {
    assert.ok(nombraLocalidadDudosa(n), n.titulo);
    assert.equal(mencionaAca(n), true, `mencionaAca: ${n.titulo}`);
    assert.equal(mencionaBalcarce(n), true, `mencionaBalcarce: ${n.titulo}`);
  }
  assert.equal(nombraLocalidadDudosa(deAca('Bosch: la lluvia dejó 50 milímetros en Las Marías')), 'bosch');
});

test('de afuera: la localidad en el título cuenta sólo si el título o la bajada nombran algo firme de acá o la zona', () => {
  const choque = deAfuera('Choque en San Agustín: un camión volcó en la ruta', 'El accidente ocurrió en la localidad del partido de Balcarce, a 40 kilómetros de la ciudad.');
  assert.equal(esDeBalcarce(choque), true);
  assert.equal(esDeAca(choque), true);
  const ruta = deAfuera('Corte total en Los Pinos por la obra de la ruta 226', 'Vialidad trabaja entre Tandil y Mar del Plata.');
  assert.equal(nombraLocalidadDudosa(ruta, { soloTitulo: true }), 'los pinos', 'la zona respalda');
  // Sin respaldo, no: puede ser cualquier San Agustín.
  assert.equal(esDeBalcarce(deAfuera('Choque en San Agustín: un camión volcó en la ruta', 'Hubo dos heridos leves.')), false);
  // Y nombrar la localidad sólo en la bajada no alcanza para lo de afuera (lo de afuera es de acá por el título, 27/09).
  assert.equal(esDeBalcarce(deAfuera('Vuelca un camión con cereal', 'Pasó cerca de San Agustín, en el partido de Balcarce.')), false);
});

test('falsos positivos: "San Agustín, Córdoba", "Los Pinos, Mar del Plata", "Residencia Los Pinos" y otros no son de acá', () => {
  const falsos = [
    'Incendio forestal en San Agustín, Córdoba: evacuaron a 40 familias',
    'San Agustín (Córdoba) celebra su fiesta patronal',
    'Robo en una casa de Los Pinos, Mar del Plata',
    'Vecinos del barrio Los Pinos de Mar del Plata reclaman por el agua',
    'Sheinbaum abrió la Residencia Los Pinos al público',
    'La Residencia Los Pinos se transformó en un centro cultural',
    'San Agustín de Hipona y la filosofía medieval',
    'Robert Bosch anunció inversiones en Brasil',
    'Juan Bosch, el presidente dominicano que escribía cuentos',
  ];
  for (const t of falsos) {
    assert.equal(localidadDudosaEn(t), null, t);
    // ni siquiera con Balcarce en la bajada ni viniendo de un medio de acá
    assert.equal(nombraLocalidadDudosa(deAfuera(t, 'Una delegación de Balcarce viajó para verlo.'), { soloTitulo: true }), null, `con respaldo: ${t}`);
    assert.equal(nombraLocalidadDudosa(deAca(t)), null, `de un medio de acá: ${t}`);
    assert.equal(esDeBalcarce(deAfuera(t, 'Texto de la nota.')), false, t);
  }
  // Un medio de acá que copia lo de México no la vuelve de acá por decir "Los Pinos".
  assert.equal(mencionaAca(deAca('Los Pinos abre sus puertas', 'La ex residencia presidencial de México recibe visitantes.')), false);
});

test('las palabras enteras: "Pinos" o "Agustina" no son las localidades', () => {
  assert.equal(localidadDudosaEn('Plantaron pinos en la plaza'), null);
  assert.equal(localidadDudosaEn('San Agustina ganó el torneo'), null);
  assert.equal(localidadDudosaEn('Los pinos del parque'), 'los pinos', 'la frase sí, sin tildes ni mayúsculas');
  assert.equal(localidadDudosaEn('SAN AGUSTIN: corte de luz'), 'san agustín');
});

test('lo que ya era de acá sigue igual', () => {
  assert.equal(esDeBalcarce(deAfuera('Werner hizo la pole en el autódromo de Balcarce')), true);
  assert.equal(esDeBalcarce(deAfuera('Suba del dólar', 'El mercado cerró en alza', 'pais')), false);
  assert.equal(esDeBalcarce(deAca('Comienza la Invasión de Pueblos')), true);
  assert.equal(esDeBalcarce(deAfuera('Fiesta en Napaleofú')), true, 'Napaleofú es firme');
});
