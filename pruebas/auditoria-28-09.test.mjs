// Arreglos de la auditoría del 28/09 (Opus 5.5) que no necesitaban ninguna
// decisión: la zona conserva la página, las fotos sin nota se borran, el panel
// ya no reescribe solo y voz.mjs no corre cuando se audita la voz.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tieneRespaldo } from '../web/lib/cuerpo.js';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8');

test('lo de la zona contado por un solo medio conserva la página', () => {
  assert.equal(tieneRespaldo({ medios: ['La Capital (Mar del Plata)'], deLaZona: true }), true);
  assert.equal(tieneRespaldo({ medios: ['La Capital (Mar del Plata)'] }), false);
  assert.match(leer('web/scripts/generar-datos.mjs'), /n\.deLaZona \? \{ deLaZona: true \}/);
});

test('se borran las fotos de lo retirado a mano y de lo que ya no está en ningún lado', () => {
  const banco = {
    viva: { intentado: true, archivo: 'fotos-notas/viva.jpg', credito: 'Foto: A' },
    retirada: { intentado: true, archivo: 'fotos-notas/retirada.jpg', credito: 'Foto: B' },
    vieja: { intentado: true, archivo: 'fotos-notas/vieja.png', credito: 'Foto: C' },
    sinFoto: { intentado: true, origen: 'ninguna' },
  };
  const { banco: nuevo, borrar } = podarFotos({
    banco,
    enDisco: ['viva.jpg', 'retirada.jpg', 'vieja.png', 'huerfana.jpg'],
    quedan: new Set(['viva', 'retirada', 'sinFoto']),
    retiradas: new Set(['retirada']),
  });
  assert.deepEqual(borrar.sort(), ['huerfana.jpg', 'retirada.jpg', 'vieja.png']);
  assert.equal(nuevo.viva.archivo, 'fotos-notas/viva.jpg');
  assert.equal(nuevo.retirada.archivo, undefined, 'la nota retirada no vuelve a mostrar la foto');
  assert.equal(nuevo.retirada.intentado, true, 'y no se vuelve a gastar cupo en ella');
  assert.equal(nuevo.vieja.credito, undefined);
  assert.deepEqual(nuevo.sinFoto, banco.sinFoto);
});

test('la poda de fotos corre en la nube y el workflow sube las fotos borradas', () => {
  assert.match(leer('web/scripts/generar-datos.mjs'), /enLaNube && fs\.existsSync\(FOTOS_NOTAS\)[\s\S]*podarFotos/);
  assert.match(leer('.github/workflows/actualizar.yml'), /git add [^\n]*web\/public\/fotos-notas\//);
});

test('el panel de la PC no reescribe solo con IA (lo hace sólo la nube)', () => {
  const servidor = leer('panel/servidor.mjs');
  assert.doesNotMatch(servidor, /reescribirAutomaticas/);
  assert.doesNotMatch(servidor, /reescribirPendientes\(\)/);
});

test('voz.mjs corre sola sólo con su nombre exacto (no con auditar-voz.mjs)', () => {
  const voz = leer('reels/voz.mjs');
  assert.match(voz, /path\.basename\(process\.argv\[1\]\) === 'voz\.mjs'/);
  assert.doesNotMatch(voz, /endsWith\('voz\.mjs'\)/);
});

// ------------------------------------------ decisiones de Hernán (28/09)

import { semaforoDelTexto, laMuerteFrena, paraPruebas } from '../ingesta/ingesta.mjs';
const { esPolicialDeAfuera } = paraPruebas;
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';

test('un policial de la zona contado por un medio de afuera ya no se descarta', () => {
  const choque = { titulo: 'Choque en la ruta 226: dos autos colisionaron cerca del cruce', cuerpo: 'Ocurrió en el kilómetro 50.', categorias: [], alcance: 'regional', medios: ['La Capital (Mar del Plata)'] };
  assert.equal(esPolicialDeAfuera(choque), false);
  const deAfuera = { titulo: 'Choque en la ruta 2 cerca de Dolores: dos autos colisionaron', cuerpo: 'Ocurrió en el kilómetro 200.', categorias: [], alcance: 'regional', medios: ['La Capital (Mar del Plata)'] };
  assert.equal(esPolicialDeAfuera(deAfuera), true);
});

test('"hospital" e "investigación" ya no frenan; menores y acusaciones sí', () => {
  assert.equal(semaforoDelTexto('Prorrogan el plazo para que las obras sociales y el hospital regularicen deudas'), null);
  assert.equal(semaforoDelTexto('La fiscalía avanza con la investigación del patrimonio'), null);
  assert.equal(semaforoDelTexto('Detuvieron a un acusado por el robo')?.color, 'amarillo');
  assert.equal(semaforoDelTexto('Un niño de 8 años resultó herido')?.color, 'amarillo');
  assert.ok(!REGLAS_SEMAFORO.amarillo.includes('hospital'));
});

test('una muerte frena en Policiales, en Balcarce, en lo de acá y con un solo medio; no en lo de afuera muy contado', () => {
  const homenaje = { titulo: 'Los Nocheros homenajeados: recordaron al integrante que murió', cuerpo: '', seccion: 'Cultura y agenda', medios: ['Clarín', 'Infobae', 'La Nación'] };
  assert.equal(laMuerteFrena(homenaje), false);
  assert.equal(semaforoDelTexto(homenaje.titulo, { conMuerte: laMuerteFrena(homenaje) }), null);
  assert.equal(laMuerteFrena({ ...homenaje, medios: ['Clarín'] }), true, 'un solo medio');
  assert.equal(laMuerteFrena({ ...homenaje, seccion: 'Policiales' }), true);
  assert.equal(laMuerteFrena({ ...homenaje, seccion: 'Balcarce' }), true);
  assert.equal(laMuerteFrena({ ...homenaje, local: true }), true);
  assert.equal(semaforoDelTexto('Murió Mario Torres')?.color, 'amarillo', 'sin contexto, frena');
});

test('un choque de la zona con heridos espera a una persona', () => {
  const choque = { titulo: 'Choque en la ruta 226: hay dos heridos', cuerpo: '', seccion: 'Policiales', medios: ['La Capital (Mar del Plata)'] };
  assert.equal(semaforoDelTexto(choque.titulo, { conMuerte: laMuerteFrena(choque) })?.color, 'amarillo');
});

// ------------------------------------------------ redacción (28/09)

import { verificar } from '../ingesta/verificar.mjs';
import { nivelDeVerificacion } from '../reels/reescritura.mjs';

const tipos = (r) => r.problemas.map((p) => p.tipo);

test('la negación del título de la fuente se busca en toda la nota y acepta los verbos que niegan', () => {
  const fuente = { titulo: 'No todas las caravanas electrónicas son iguales: qué mirar al comprar', resumen: 'Los productores deben revisar la lectura de las caravanas electrónicas antes de comprar.' };
  const conCuerpo = verificar(fuente, {
    titulo: 'Qué mirar al comprar caravanas electrónicas',
    copete: 'Los productores deben revisar la lectura antes de comprar.',
    cuerpo: 'No todas las caravanas electrónicas son iguales, y los productores deben revisar la lectura antes de comprar.',
  });
  assert.ok(!tipos(conCuerpo).includes('negacion'), JSON.stringify(conCuerpo.problemas));
  const conVerbo = verificar({ titulo: 'El gobierno no aceptó el pedido de los gremios', resumen: 'El gobierno rechazó el pedido de los gremios.' }, {
    titulo: 'El gobierno rechaza el pedido de los gremios', copete: 'El gobierno rechazó el pedido de los gremios.',
  });
  assert.ok(!tipos(conVerbo).includes('negacion'));
  const sinNada = verificar({ titulo: 'El gobierno no aceptó el pedido de los gremios', resumen: 'El gobierno respondió el pedido.' }, {
    titulo: 'El gobierno responde el pedido de los gremios', copete: 'El gobierno respondió el pedido.',
  });
  assert.ok(tipos(sinNada).includes('negacion'), 'si la negación desaparece del todo, sigue frenando');
});

test('un nombre escrito de otra forma en la fuente (EE.UU., ONU) no es un nombre inventado', () => {
  const r = verificar({ titulo: 'EE.UU. y la ONU hablaron del litio', resumen: 'Representantes de EE.UU. y la ONU hablaron del litio argentino.' }, {
    titulo: 'Estados Unidos y Naciones Unidas hablan del litio', copete: 'Representantes de Estados Unidos y de Naciones Unidas hablaron del litio argentino.',
  });
  assert.ok(!tipos(r).includes('nombre'), JSON.stringify(r.problemas));
  const inventado = verificar({ titulo: 'Hablaron del litio', resumen: 'Hablaron del litio argentino.' }, {
    titulo: 'Estados Unidos habla del litio', copete: 'Estados Unidos habló del litio argentino.',
  });
  assert.ok(tipos(inventado).includes('nombre'), 'si la fuente no lo dice de ninguna forma, sigue frenando');
});

test('una opinión citada no baja la verificación; con varios medios, "qué falta confirmar" tampoco', () => {
  const unMedio = [{ medio: 'La Vanguardia Noticias', oficial: false }];
  assert.equal(nivelDeVerificacion({ origenes: unMedio, escrito: { titulo: 'Balcarce está mejor que otras pistas, aseguró el piloto', copete: 'El piloto aseguró que el circuito está muchísimo mejor.' } }).nivel, 'MEDIA');
  assert.equal(nivelDeVerificacion({ origenes: unMedio, escrito: { titulo: 'Vecinos denuncian que el basural creció' } }).nivel, 'BAJA');
});
