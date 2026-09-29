// El panel del celular (29/09): el sobre cifrado, las decisiones que escribe el
// celular, lo que se le manda para decidir, las redes que aprueba una persona y
// el pedido a la IA. Sin red y sin GitHub.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { cerrar, abrir, huellaDe, leerLlaves, cerrarSiCambio } from '../panel/cifrado.mjs';
import * as navegador from '../web/public/panel/cifrado.js';
import {
  problemaDeDecision, leerDecisionesCelular, unirDecisiones, paraDecidir, notasParaEscribir,
} from '../panel/celular-datos.mjs';
import { buscarNota, conBorrador, idValido, BORRADORES } from '../panel/celular.mjs';
import { notaDesdeLoPublicado } from '../panel/reescribir-una.mjs';
import {
  elegirParaFacebook, sePuedeSola, vaAFacebookPorLoQueEs, aprobadaParaLasRedes,
} from '../redes/elegir.mjs';
import { correccionesAMano, conCorreccion } from '../web/lib/archivo.js';
import { quienEscribio } from '../web/components/metadatos.js';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// ---------------------------------------------------------------- el sobre

test('lo que cierra GitHub lo abre el celular, con la criptografía del navegador', async () => {
  const celular = await navegador.crearLlaves();
  assert.equal(celular.huella, huellaDe(celular.publica), 'las dos huellas tienen que coincidir');
  const [llave] = leerLlaves({ llaves: [{ nombre: 'Celular de prueba', publica: celular.publica }] });
  const contenido = { pendientes: [{ id: 'abc', titulo: 'Detienen a un hombre por un robo en la 226 — ñandú, tildes: á é í ó ú' }] };
  const sobre = cerrar(contenido, [llave]);
  assert.ok(!JSON.stringify(sobre).includes('Detienen'), 'el texto quedó a la vista');
  assert.deepEqual(await navegador.abrir(sobre, celular), contenido);
  // Otro celular no lo abre.
  const otro = await navegador.crearLlaves();
  assert.equal(await navegador.abrir(sobre, otro), null);
});

test('un sobre para dos celulares lo abre cada uno con su llave', () => {
  const pares = [1, 2].map(() => crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }));
  const llaves = leerLlaves({
    llaves: pares.map((p, i) => ({ nombre: `c${i}`, publica: p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') })),
  });
  const sobre = cerrar({ hola: 'Balcarce' }, llaves);
  pares.forEach((p, i) => assert.deepEqual(abrir(sobre, { huella: llaves[i].huella, privada: p.privateKey }), { hola: 'Balcarce' }));
});

test('las llaves que no son llaves se saltean; sin llaves, el sobre va vacío', () => {
  const p = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const buena = p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const llaves = leerLlaves({ llaves: [{ publica: 'no-es-una-llave' }, { publica: buena }, { publica: buena }, {}] });
  assert.equal(llaves.length, 1, 'se repetía o no era una llave');
  assert.deepEqual(cerrar({ a: 1 }, []), { version: 1, para: [], iv: null, datos: null });
});

test('si no cambió nada, el sobre queda igual (no hay un commit por corrida)', () => {
  const p = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const llaves = leerLlaves({ llaves: [{ publica: p.publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }] });
  const primero = cerrarSiCambio({ pendientes: [1] }, llaves, null);
  assert.equal(primero.cambio, true);
  const segundo = cerrarSiCambio({ pendientes: [1] }, llaves, primero.sobre);
  assert.equal(segundo.cambio, false);
  assert.equal(segundo.sobre, primero.sobre);
  assert.equal(cerrarSiCambio({ pendientes: [2] }, llaves, primero.sobre).cambio, true);
  assert.equal(cerrarSiCambio({ pendientes: [1] }, [], primero.sobre).cambio, true, 'sin llaves también cambia');
});

// -------------------------------------------------- lo que decide el celular

const AHORA = '2026-09-29T20:00:00.000Z';
const CUERPO = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');

test('una decisión del celular dice quién y cuándo; publicar pide el texto entero y retirar, el motivo', () => {
  assert.equal(problemaDeDecision({ estado: 'descartada', por: 'Hernán', cuando: AHORA }), null);
  assert.match(problemaDeDecision({ estado: 'descartada', por: 'ia', cuando: AHORA }), /quién/);
  assert.match(problemaDeDecision({ estado: 'descartada', por: 'Hernán' }), /cuándo/);
  assert.match(problemaDeDecision({ estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'T' }), /título, bajada y cuerpo/);
  assert.equal(problemaDeDecision({ estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'T', copete: 'B', cuerpo: CUERPO }), null);
  assert.match(problemaDeDecision({ estado: 'bloqueada', por: 'Hernán', cuando: AHORA }), /motivo/);
  assert.match(problemaDeDecision({ estado: 'pendiente', por: 'Hernán', cuando: AHORA }), /estado/);
});

test('leerDecisionesCelular saltea lo que no vale y completa el guion', () => {
  const { notas, redes } = leerDecisionesCelular({
    notas: {
      a: { estado: 'publicada', por: 'Hernán', cuando: AHORA, titulo: 'El Concejo aprueba el presupuesto.', copete: 'B', cuerpo: CUERPO, deIA: true, textoRedes: 'Texto' },
      b: { estado: 'publicada', por: 'Hernán', cuando: AHORA },
      c: { estado: 'bloqueada', por: 'Hernán', cuando: AHORA, motivo: 'repetida' },
    },
    redes: { a: { por: 'Hernán', cuando: AHORA }, x: { por: '', cuando: AHORA } },
  });
  assert.deepEqual(Object.keys(notas), ['a', 'c']);
  assert.equal(notas.a.guion, 'El Concejo aprueba el presupuesto.');
  assert.equal(notas.a.textoRedes, 'Texto');
  assert.equal(notas.a.desdeElCelular, true);
  assert.deepEqual(Object.keys(redes), ['a']);
});

test('las decisiones del celular van encima de las de la PC: gana la más nueva', () => {
  const pc = {
    a: { estado: 'automatica', por: 'ia', cuando: '2026-09-30T00:00:00Z' },
    b: { estado: 'publicada', por: 'Andrés', cuando: '2026-09-30T00:00:00Z' },
    c: { estado: 'publicada', por: 'Andrés', cuando: '2026-09-28T00:00:00Z' },
  };
  const celular = {
    a: { estado: 'descartada', por: 'Hernán', cuando: AHORA },
    b: { estado: 'descartada', por: 'Hernán', cuando: AHORA },
    c: { estado: 'descartada', por: 'Hernán', cuando: AHORA },
  };
  const todas = unirDecisiones(pc, celular);
  assert.equal(todas.a.estado, 'descartada', 'lo que guardó la máquina no gana nunca');
  assert.equal(todas.b.estado, 'publicada', 'la de la PC era más nueva');
  assert.equal(todas.c.estado, 'descartada');
});

test('el archivo del repositorio que escribe el celular está bien armado (si no, la web se congela)', () => {
  const json = JSON.parse(leer('web/data/celular-decisiones.json'));
  for (const [id, d] of Object.entries(json.notas ?? {})) assert.equal(problemaDeDecision(d), null, `la decisión de ${id} no vale`);
  for (const [id, r] of Object.entries(json.redes ?? {})) assert.ok(r.por && Number.isFinite(Date.parse(r.cuando)), `la aprobación para redes de ${id} no dice quién y cuándo`);
  const llaves = JSON.parse(leer('web/data/celular-llaves.json'));
  assert.ok(Array.isArray(llaves.llaves));
});

// --------------------------------------------------- lo que va para decidir

const nota = (o) => ({
  id: 'x', titulo: 'Un titular', resumenFuente: 'Un resumen', seccion: 'Balcarce', semaforo: 'amarillo', motivo: 'necesita ojo humano: "detenido"',
  fecha: '2026-09-29T18:00:00Z', origenes: [{ medio: 'Medio', enlace: 'https://medio.com/a', resumen: 'r' }], ...o,
});

test('para decidir: lo amarillo de estos días, nunca lo rojo, ni el relleno, ni lo ya decidido', () => {
  const ahora = new Date(AHORA);
  const lista = paraDecidir([
    nota({ id: 'a' }),
    nota({ id: 'b', semaforo: 'rojo' }),
    nota({ id: 'c', motivo: 'de afuera y poco contada (1 medio; Argentina pide 3)' }),
    nota({ id: 'd' }),
    nota({ id: 'e', semaforo: 'verde' }),
    nota({ id: 'f', fecha: '2026-09-20T18:00:00Z' }),
    nota({ id: 'g', semaforo: 'verde' }),
  ], { d: { estado: 'descartada', por: 'Hernán', cuando: AHORA }, g: { estado: 'pendiente', por: 'Andrés', cuando: AHORA } }, { ahora });
  assert.deepEqual(lista.map((n) => n.id).sort(), ['a', 'g']);
  const a = lista.find((n) => n.id === 'a');
  assert.deepEqual(a.fuentes, [{ medio: 'Medio', enlace: 'https://medio.com/a' }]);
  assert.equal(a.resumen, 'Un resumen');
  assert.ok(!('origenes' in a), 'los resúmenes de cada fuente no viajan al celular: van a la caché');
});

test('las notas para escribir con IA no incluyen nunca una roja', () => {
  const lista = notasParaEscribir([nota({ id: 'a' }), nota({ id: 'b', semaforo: 'rojo' })]);
  assert.deepEqual(lista.map((n) => n.id), ['a']);
  assert.ok(lista[0].origenes[0].resumen, 'la caché sí lleva los resúmenes');
});

// ------------------------------------------ las redes que aprueba una persona

const ahoraFb = new Date('2026-09-25T15:00:00Z'); // 12:00 en Balcarce
const publicada = (o) => ({
  id: 'n', titulo: 'Detienen a un hombre por un robo', seccion: 'Policiales', local: true, relevancia: 90, como: 'automatica',
  cuerpo: CUERPO, fecha: new Date(ahoraFb - 60 * 60e3).toISOString(), ...o,
});

test('Política y Policiales no van solas a Facebook; aprobadas desde el celular, sí (regla 78)', () => {
  assert.deepEqual(elegirParaFacebook({ notas: [publicada()], ahora: ahoraFb }), []);
  const aprobada = publicada({ aprobadaParaRedes: new Date(ahoraFb - 30 * 60e3).toISOString() });
  assert.equal(elegirParaFacebook({ notas: [aprobada], ahora: ahoraFb }).length, 1);
  assert.ok(aprobadaParaLasRedes(aprobada));
  // Aun aprobada para las redes, no va a los podcasts: no llevan Política ni Policiales.
  assert.equal(sePuedeSola({ ...aprobada, semaforo: 'verde' }), false);
});

test('lo que salió en la web porque lo aprobó una persona no va solo a las redes', () => {
  const deBalcarce = publicada({ seccion: 'Balcarce', como: 'publicada' });
  assert.equal(vaAFacebookPorLoQueEs(deBalcarce), false);
  assert.equal(sePuedeSola(deBalcarce), false);
  const marcada = { ...deBalcarce, aprobadaParaRedes: new Date(ahoraFb - 30 * 60e3).toISOString() };
  assert.equal(vaAFacebookPorLoQueEs(marcada), true);
  assert.equal(sePuedeSola(marcada), true);
});

test('lo aprobado para las redes sale primero, y cuenta el tiempo desde el visto bueno', () => {
  const vieja = publicada({ id: 'v', fecha: new Date(ahoraFb - 20 * 3600e3).toISOString(), aprobadaParaRedes: new Date(ahoraFb - 20 * 60e3).toISOString() });
  const comun = publicada({ id: 'c', seccion: 'Balcarce', titulo: 'Abre la inscripción a la escuela de verano', relevancia: 99 });
  const elegidas = elegirParaFacebook({ notas: [comun, vieja], ahora: ahoraFb, reglas: { ...reglasDeProduccion(), porCorrida: 2 } });
  assert.deepEqual(elegidas.map((n) => n.id), ['v', 'c']);
});

// Las reglas de Facebook de producción, con dos por corrida para ver el orden.
function reglasDeProduccion() {
  return {
    porDia: 5, relevanciaMinima: 75, porCorrida: 1, minutosEntrePosteos: 90, esperaMinutos: 15, edadMaximaHoras: 8,
    desdeHora: 8, hastaHora: 22, horasSinRepetirTema: 24, seccionesQueEsperanPersona: ['Política', 'Policiales'],
  };
}

// ------------------------------------ correcciones escritas con IA y revisadas

test('un texto que escribió la IA y revisó una persona firma "con IA, revisada" (no "a mano")', () => {
  const correcciones = correccionesAMano({
    notas: {
      a: { titulo: 'T', copete: 'B', cuerpo: CUERPO, deIA: true, motivo: 'reescrita con IA a pedido', cuando: '2026-09-29', por: 'Hernán' },
      b: { cuerpo: CUERPO, motivo: 'escrito a mano', cuando: '2026-09-29', por: 'Hernán' },
    },
  });
  const a = conCorreccion({ id: 'a', titulo: 'x', guion: null }, correcciones);
  assert.deepEqual(quienEscribio(a), { reescrita: true, revisada: true });
  assert.ok(!a.cuerpoAMano && !('deIA' in a));
  const b = conCorreccion({ id: 'b', titulo: 'x', guion: 'x.' }, correcciones);
  assert.deepEqual(quienEscribio(b), { reescrita: false, revisada: true });
});

// ------------------------------------------------------ el pedido a la IA

test('el pedido de una persona llega a la IA después de la noticia, y nunca por encima de las reglas', async () => {
  const { reescribir, PEDIDO_MAXIMO } = await import('../reels/reescritura.mjs');
  let enviado = '';
  const fetchFn = async (_url, init) => {
    enviado = JSON.parse(init.body).contents[0].parts[0].text;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ titulo: 'T', copete: 'B', cuerpo: 'C', guion: 'G' }) }] } }] }), { status: 200 });
  };
  await reescribir({ titulo: 'Algo', seccion: 'Balcarce', resumenFuente: 'Un resumen' }, {
    fetchFn, clavePropia: 'k', claveDeRedes: null, claveDeRespaldo: null, pedido: `  Hacela   más corta ${'x'.repeat(600)}`,
  });
  assert.match(enviado, /PEDIDO DE LA REDACCIÓN[^\n]*: Hacela más corta/);
  assert.match(enviado, /seguí las reglas/);
  const pedido = enviado.split('PEDIDO DE LA REDACCIÓN')[1].split('\n')[0];
  assert.ok(pedido.length <= PEDIDO_MAXIMO + 120, 'el pedido no se corta');
  // Sin pedido, nada de eso.
  await reescribir({ titulo: 'Algo', seccion: 'Balcarce', resumenFuente: 'Un resumen' }, { fetchFn, clavePropia: 'k', claveDeRedes: null, claveDeRespaldo: null });
  assert.ok(!enviado.includes('PEDIDO DE LA REDACCIÓN'));
});

// ------------------------------------------------ el workflow del celular

test('el workflow busca la nota primero en lo que trajo la ingesta, después en lo publicado', () => {
  const enCache = { notas: [{ id: 'a', titulo: 'De la ingesta', origenes: [{ enlace: 'https://m.com/1', resumen: 'r' }] }] };
  const portada = { notas: [{ id: 'a', titulo: 'Publicada' }, { id: 'b', titulo: 'Publicada B', fuentesConsultadas: [{ medio: 'M', enlace: 'https://m.com/b' }] }] };
  assert.equal(buscarNota('a', { enCache, portada }).de, 'ingesta');
  const b = buscarNota('b', { enCache, portada });
  assert.equal(b.de, 'portada');
  assert.deepEqual(b.nota.origenes, [{ medio: 'M', enlace: 'https://m.com/b', fecha: null, oficial: false, resumen: '' }]);
  assert.equal(buscarNota('z', { enCache, portada }), null);
  assert.equal(notaDesdeLoPublicado({ id: 'q', fuentes: [{ medio: 'X', enlace: 'https://x' }] }).medios[0], 'X');
});

test('los borradores se guardan cada uno en su sobre, y los viejos se podan', () => {
  const ahora = new Date(AHORA);
  let archivo = { borradores: { viejo: { cuando: '2026-09-01T00:00:00Z', para: [] } } };
  archivo = conBorrador(archivo, 'nuevo', { version: 1, para: [], iv: null, datos: null }, ahora);
  assert.deepEqual(Object.keys(archivo.borradores), ['nuevo']);
  for (let i = 0; i < BORRADORES.maximo + 5; i += 1) archivo = conBorrador(archivo, `n${i}`, { para: [] }, new Date(ahora.getTime() + i * 1000));
  assert.equal(Object.keys(archivo.borradores).length, BORRADORES.maximo);
  assert.ok(idValido('1q0dki') && !idValido('../x') && !idValido(''));
});

test('el workflow del celular nunca pega lo que manda el celular en un comando', () => {
  const yml = leer('.github/workflows/panel.yml');
  const comandos = yml.split('\n').filter((l) => /^\s+run:/.test(l) || /^\s{10}\S/.test(l));
  assert.ok(!comandos.some((l) => /\$\{\{\s*inputs\./.test(l) && /run:/.test(l)), 'un run: usa ${{ inputs.* }} directo');
  assert.match(yml, /PEDIDO: \$\{\{ inputs\.pedido \}\}/);
  assert.match(yml, /git add web\/data\/celular-borradores\.json\n/);
  assert.match(leer('.github/workflows/actualizar.yml'), /web\/data\/celular-pendientes\.json/);
});
