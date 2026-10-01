// La propuesta automática de "Un día como hoy" y el arreglo de "Balcarce" apellido (1/10/2026, pendiente 0c).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { esDeBalcarce, estiloDe, puntuar, marcasDe } from '../ingesta/efemerides.mjs';
import { proponerDia, proponerDias, motivoDe, MARCAS_QUE_EXCLUYEN } from '../ingesta/efemerides-propuesta.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

// ----------------------------------------------- Balcarce, la ciudad y el apellido

test('el apellido Balcarce no es la ciudad: la Revuelta de los Restauradores (11/10) no sumaba por ser "de acá"', () => {
  const revuelta = 'En la ciudad de Buenos Aires (Argentina) estalla la Revuelta de los Restauradores, dirigida por los federales contra el Gobierno de Juan Ramón Balcarce.';
  assert.equal(esDeBalcarce(revuelta), false);
  assert.notEqual(estiloDe(revuelta), 'balcarce');
  const marcas = marcasDe(revuelta, 1833);
  const antes = puntuar({ origen: 'portal', estilo: 'balcarce', texto: revuelta, anio: 1833, marcas, importancia: 5 });
  const ahora = puntuar({ origen: 'portal', estilo: estiloDe(revuelta), texto: revuelta, anio: 1833, marcas, importancia: 5 });
  assert.ok(ahora <= antes - 30, `bajó de ${antes} a ${ahora}: ya no cuenta como "de Balcarce" (el estilo daba +30 y el apellido otros +25)`);
  assert.ok(ahora < 45, 'ni llega al puntaje mínimo para entrar a las candidatas');
});

test('lo que sí es de Balcarce sigue siéndolo', () => {
  for (const t of [
    'Se funda en Balcarce la Sociedad Rural.',
    'Fangio gana el Gran Premio de Francia.',
    'Se inaugura el autódromo de Balcarce.',
    'Nace en Balcarce el doctor Fulano.',
    'Se crea el partido de Balcarce.',
    'La Municipalidad de Balcarce inaugura el hospital.',
    'Balcarce celebra su aniversario.',
  ]) assert.equal(esDeBalcarce(t), true, t);
});

test('y los apellidos y títulos no lo son', () => {
  for (const t of [
    'Asume el gobernador Balcarce.',
    'Una sublevación contra Balcarce en 1833.',
    'Antonio González Balcarce gana la batalla de Suipacha.',
    'Nace Mariano Balcarce, yerno de San Martín.',
    'Muere el general Balcarce.',
  ]) assert.equal(esDeBalcarce(t), false, t);
});

test('lo del campo y los fierros suma; lo que pide contexto resta', () => {
  const base = { origen: 'feed', estilo: 'historia', anio: 1900, marcas: [], importancia: 0 };
  const neutro = puntuar({ ...base, texto: 'Ocurre algo muy importante en una ciudad de la provincia de Buenos Aires.' });
  const campo = puntuar({ ...base, texto: 'El INTA presenta una nueva variedad en la provincia de Buenos Aires hoy.' });
  assert.ok(campo > neutro);
  const imperio = puntuar({ ...base, texto: 'El emperador del imperio firma un tratado de paz con el reino vecino.' });
  const sinContexto = puntuar({ ...base, texto: 'El inventor firma un acuerdo de paz con la empresa vecina.' });
  assert.ok(imperio < sinContexto);
});

// ----------------------------------------------------------------- la propuesta

let n = 0;
const c = (estilo, puntaje, extra = {}) => {
  n += 1;
  return { id: `c${n}`, estilo, puntaje, texto: `texto de ${estilo} ${n}`, origen: 'feed', marcas: [], ...extra };
};

test('una principal y tres que acompañan, sin repetir estilo si hay de dónde elegir', () => {
  const lista = [
    c('balcarce', 95, { texto: 'Se funda en Balcarce el club.', origen: 'curada' }),
    c('ciencia', 80, { importancia: 200 }), c('ciencia', 79, { importancia: 180 }),
    c('cultura', 70, { texto: 'Nace una escritora argentina.', origen: 'portal' }),
    c('curioso', 65), c('deporte', 60), c('fundacion', 55),
  ];
  const p = proponerDia(lista);
  assert.equal(p.principal, lista[0].id);
  assert.equal(p.si.length, 3);
  const estilos = [p.principal, ...p.si].map((id) => lista.find((x) => x.id === id).estilo);
  assert.equal(new Set(estilos).size, 4, `cuatro estilos distintos: ${estilos}`);
  assert.equal(p.opcionales.length, 2);
  const todos = [p.principal, ...p.si, ...p.opcionales];
  assert.equal(new Set(todos).size, todos.length, 'ninguna se repite');
  for (const id of todos) assert.ok(p.motivos[id] || p.opcionales.includes(id), 'cada elegida trae su motivo');
});

test('lo político, lo religioso y lo que puede estar vivo no se proponen: van a "no"', () => {
  const lista = [c('historia', 90, { marcas: ['política'] }), c('nacimiento', 88, { marcas: ['puede estar vivo'] }), c('ciencia', 60), c('curioso', 50)];
  const p = proponerDia(lista);
  assert.deepEqual(p.descartadas.sort(), [lista[0].id, lista[1].id].sort());
  assert.ok(![p.principal, ...p.si, ...p.opcionales].includes(lista[0].id));
  assert.deepEqual(MARCAS_QUE_EXCLUYEN, ['política', 'religión', 'puede estar vivo']);
});

test('una fecha patria habla sola: sin combo', () => {
  const patria = c('patria', 120, { origen: 'curada' });
  const p = proponerDia([c('ciencia', 90), patria, c('curioso', 70)]);
  assert.equal(p.principal, patria.id);
  assert.deepEqual(p.si, []);
  assert.match(p.motivos[patria.id], /Fecha patria/);
});

test('la principal cambia de estilo respecto de ayer cuando la diferencia de puntaje es chica', () => {
  const lista = [c('deporte', 80), c('ciencia', 74), c('curioso', 50)];
  assert.equal(lista.find((x) => x.id === proponerDia(lista).principal).estilo, 'deporte');
  const conAyer = proponerDia(lista, { ayer: 'deporte' });
  assert.equal(lista.find((x) => x.id === conAyer.principal).estilo, 'ciencia');
  assert.match(conAyer.motivos[conAyer.principal], /Cambia de estilo respecto de ayer/);
});

test('varios días seguidos: cada uno mira la principal del anterior', () => {
  const dia = () => ({ candidatas: [c('deporte', 80), c('ciencia', 76), c('cultura', 70), c('curioso', 60)] });
  const r = proponerDias({ '2026-10-05': dia(), '2026-10-06': dia(), '2026-10-07': dia() });
  const estilos = Object.values(r).map((p) => p.estilo);
  assert.notEqual(estilos[0], estilos[1], 'dos días seguidos no abren con el mismo estilo');
});

test('con pocas candidatas no rompe, y sin ninguna devuelve una propuesta vacía', () => {
  assert.equal(proponerDia([]).principal, null);
  const una = proponerDia([c('historia', 60)]);
  assert.ok(una.principal);
  assert.deepEqual(una.si, []);
  assert.equal(proponerDia([c('historia', 60, { marcas: ['política'] })]).principal, null);
});

test('el motivo explica el criterio', () => {
  assert.match(motivoDe({ texto: 'Se funda en Balcarce el club.', puntaje: 90 }, { lugar: 'principal' }), /Balcarce/);
  assert.match(motivoDe({ texto: 'Lanzan una sonda.', origen: 'feed', importancia: 300, hace: 25, puntaje: 70 }, { lugar: 'mundo' }), /300 idiomas.*Aniversario redondo/);
});

test('con las candidatas reales del mes, cada día queda con principal y la propuesta no repite ni mete lo político', () => {
  const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-candidatas.json'), 'utf8'));
  const r = proponerDias(j.dias);
  assert.equal(Object.keys(r).length, Object.keys(j.dias).length);
  for (const [dia, p] of Object.entries(r)) {
    const lista = j.dias[dia].candidatas;
    assert.ok(p.principal, `${dia} sin principal`);
    const ids = [p.principal, ...p.si, ...p.opcionales];
    assert.equal(new Set(ids).size, ids.length, `${dia}: ids repetidos`);
    for (const id of [p.principal, ...p.si]) {
      const cand = lista.find((x) => x.id === id);
      assert.ok(cand, `${dia}: ${id} no está en las candidatas`);
      if (cand.origen !== 'curada') assert.ok(!(cand.marcas ?? []).some((m) => MARCAS_QUE_EXCLUYEN.includes(m)), `${dia}: ${cand.texto}`);
    }
  }
});

test('el generador guarda la propuesta junto a las candidatas y el panel la usa si nadie armó el día', () => {
  const gen = fs.readFileSync(path.join(RAIZ, 'ingesta', 'generar-efemerides.mjs'), 'utf8');
  assert.match(gen, /proponerDias\(resultado\)/);
  assert.match(gen, /\.propuesta = p/);
  const app = fs.readFileSync(path.join(RAIZ, 'web', 'public', 'panel', 'app.js'), 'utf8');
  assert.match(app, /propuesta automática/);
  assert.match(app, /borradorDe\(E\.fechas\.elegidas\.dias\?\.\[d\] \?\? propuesta\)/);
});
