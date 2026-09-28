// Un medio de acá que copia una noticia de afuera (28/09): Radio Sudestada
// publicó un referéndum de Suiza, ningún medio de afuera contó lo mismo, la IA
// todavía no la había leído y salió en la sección Balcarce. Ahora lo de un medio
// de acá que no nombra nada de acá espera a la lectura con IA.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarFichas, mencionaAca, MOTIVO_ESPERA_LECTURA } from '../ingesta/lectura-ia.mjs';

const suiza = {
  id: '1q0dki', titulo: 'Suiza rechaza en referéndum endurecer su política de neutralidad',
  resumenFuente: 'Los votantes suizos rechazaron una propuesta para endurecer la neutralidad del país.',
  alcance: 'local', local: true, semaforo: 'verde', seccion: 'Balcarce',
};
const concejo = {
  id: 'c1', titulo: 'El Concejo Deliberante aprueba la tasa vial',
  resumenFuente: 'La sesión del Concejo Deliberante de Balcarce aprobó la ordenanza.',
  alcance: 'local', local: true, semaforo: 'verde', seccion: 'Balcarce',
};

test('mencionaAca: la de Suiza no nombra nada de acá; la del Concejo de Balcarce sí', () => {
  assert.equal(mencionaAca(suiza), false);
  assert.equal(mencionaAca(concejo), true);
  assert.equal(mencionaAca({ titulo: 'Corte en la ruta', nombraBalcarce: true }), true);
  assert.equal(mencionaAca({ titulo: 'Algo', deLaZona: true }), true);
});

test('lo de un medio de acá sin nombrar nada de acá espera a la IA; lo que nombra Balcarce sale', () => {
  const { notas, cambios } = aplicarFichas([suiza, concejo], {}, { esperarSinFicha: true });
  const s = notas.find((n) => n.id === suiza.id);
  assert.equal(s.semaforo, 'amarillo');
  assert.equal(s.motivo, MOTIVO_ESPERA_LECTURA);
  assert.equal(notas.find((n) => n.id === concejo.id).semaforo, 'verde');
  assert.equal(cambios.aEsperar.length, 1);
});

test('sin la lectura andando, o si la nota ya salió, no se frena', () => {
  assert.equal(aplicarFichas([suiza], {}, { esperarSinFicha: false }).notas[0].semaforo, 'verde');
  assert.equal(aplicarFichas([suiza], {}, { esperarSinFicha: true, yaPublicadas: new Set([suiza.id]) }).notas[0].semaforo, 'verde');
});

test('con la ficha de la IA, lo del extranjero se saca', () => {
  const fichas = { [suiza.id]: { ambito: 'internacional', lugar: 'Suiza', seccion: 'Argentina', impacto: 'nulo', importancia: 'baja', razon: 'otro', publicidad: false, chimento: false } };
  const { notas, cambios } = aplicarFichas([suiza], fichas, { esperarSinFicha: true });
  assert.equal(notas.length, 0);
  assert.equal(cambios.sacadas[0].motivo, 'es del extranjero');
});
