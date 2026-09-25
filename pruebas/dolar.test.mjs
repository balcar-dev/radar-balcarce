// La página del dólar (/dolar).
//
// El pedido de los usuarios, el 25/09: no poner cotización si no se puede
// mostrar de verdad actualizada, y nunca decir "en vivo" de un dato que no
// se actualizó. Estas pruebas cuidan eso: cómo se lee la respuesta de la
// fuente, la brecha, qué dice la línea de "actualizado" en cada caso, y que
// la página no prometa lo que no hace. Sin red: los pedidos son de mentira.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  interpretarDolarApi, interpretarBluelytics, brecha, pesos, porcentaje, momento, cuando,
  textoDeEstado, traerDolar, ultimaFecha, CASAS, FUENTES, filasDelPanel, horaDelPanel,
} from '../web/lib/dolar.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// La respuesta real de https://dolarapi.com/v1/dolares del 25/09/2026.
const DOLARAPI = [
  { moneda: 'USD', casa: 'oficial', nombre: 'Oficial', compra: 1490, venta: 1540, fechaActualizacion: '2026-09-24T18:00:00.000Z' },
  { moneda: 'USD', casa: 'blue', nombre: 'Blue', compra: 1540, venta: 1560, fechaActualizacion: '2026-09-24T20:56:00.000Z' },
  { moneda: 'USD', casa: 'bolsa', nombre: 'Bolsa', compra: 1539, venta: 1545.6, fechaActualizacion: '2026-09-24T20:56:00.000Z' },
  { moneda: 'USD', casa: 'contadoconliqui', nombre: 'Contado con liquidación', compra: 1612.5, venta: 1614.3, fechaActualizacion: '2026-09-24T20:56:00.000Z' },
  { moneda: 'USD', casa: 'mayorista', nombre: 'Mayorista', compra: 1510, venta: 1519, fechaActualizacion: '2026-09-24T13:27:00.000Z' },
  { moneda: 'USD', casa: 'cripto', nombre: 'Cripto', compra: 1605.68, venta: 1610.04, fechaActualizacion: '2026-09-24T20:56:00.000Z' },
  { moneda: 'USD', casa: 'tarjeta', nombre: 'Tarjeta', compra: 1937, venta: 2002, fechaActualizacion: '2026-09-24T18:00:00.000Z' },
];

// La de https://api.bluelytics.com.ar/v2/latest del mismo día.
const BLUELYTICS = {
  oficial: { value_avg: 1512.0, value_sell: 1538.0, value_buy: 1486.0 },
  blue: { value_avg: 1543.5, value_sell: 1560.0, value_buy: 1527.0 },
  oficial_euro: { value_avg: 1643.5, value_sell: 1672.0, value_buy: 1615.0 },
  blue_euro: { value_avg: 1677.5, value_sell: 1696.0, value_buy: 1659.0 },
  last_update: '2026-09-25T08:00:51.095843-03:00',
};

// El 24/09 a las 18:10 de Balcarce, y el 25/09 a las 8:00.
const MISMO_DIA = '2026-09-24T21:10:00.000Z';
const AL_OTRO_DIA = '2026-09-25T11:00:00.000Z';

// ------------------------------------------------------------ la fuente

test('DolarApi: los siete tipos, en el orden de la página, con compra, venta y su hora', () => {
  const r = interpretarDolarApi(DOLARAPI);
  assert.equal(r.fuente, 'dolarapi');
  assert.deepEqual(r.cotizaciones.map((c) => c.casa), CASAS.map((c) => c.casa));
  const bolsa = r.cotizaciones.find((c) => c.casa === 'bolsa');
  assert.deepEqual(bolsa, { casa: 'bolsa', compra: 1539, venta: 1545.6, fecha: '2026-09-24T20:56:00.000Z' });
});

test('DolarApi: lo que no se entiende se descarta, no se muestra como cero', () => {
  const r = interpretarDolarApi([
    ...DOLARAPI.slice(0, 2),
    { casa: 'oficial-euro', compra: 1, venta: 2, fechaActualizacion: '2026-09-24T18:00:00.000Z' }, // tipo desconocido
    { casa: 'mayorista', compra: null, venta: null, fechaActualizacion: '2026-09-24T18:00:00.000Z' }, // sin precios
    { casa: 'cripto', compra: 1600, venta: 1610, fechaActualizacion: 'cualquiera' }, // fecha rota
    { casa: 'tarjeta', compra: 0, venta: 2002, fechaActualizacion: '2026-09-24T18:00:00.000Z' }, // compra en cero
  ]);
  assert.deepEqual(r.cotizaciones.map((c) => c.casa), ['oficial', 'blue', 'tarjeta']);
  assert.equal(r.cotizaciones[2].compra, null);
  assert.equal(interpretarDolarApi({ error: 'caído' }), null);
  assert.equal(interpretarDolarApi([]), null);
  assert.equal(interpretarDolarApi(null), null);
});

test('Bluelytics (el respaldo): oficial y blue, con la hora que informa', () => {
  const r = interpretarBluelytics(BLUELYTICS);
  assert.equal(r.fuente, 'bluelytics');
  assert.deepEqual(r.cotizaciones.map((c) => [c.casa, c.compra, c.venta]), [['oficial', 1486, 1538], ['blue', 1527, 1560]]);
  assert.equal(r.cotizaciones[0].fecha, '2026-09-25T11:00:51.095Z');
  assert.equal(interpretarBluelytics({ oficial: {} }), null);
});

test('se pregunta a DolarApi; a Bluelytics sólo si DolarApi falla', async () => {
  const pedidos = [];
  const responder = (mapa) => async (url) => {
    pedidos.push(url);
    const r = mapa[url];
    if (r instanceof Error) throw r;
    return { ok: r !== undefined, json: async () => r };
  };

  let r = await traerDolar({ fetchFn: responder({ [FUENTES.dolarapi.api]: DOLARAPI, [FUENTES.bluelytics.api]: BLUELYTICS }), ahora: () => new Date(MISMO_DIA) });
  assert.equal(r.fuente, 'dolarapi');
  assert.equal(r.consultado, MISMO_DIA);
  assert.deepEqual(pedidos, [FUENTES.dolarapi.api]);

  pedidos.length = 0;
  r = await traerDolar({ fetchFn: responder({ [FUENTES.dolarapi.api]: new Error('colgado'), [FUENTES.bluelytics.api]: BLUELYTICS }) });
  assert.equal(r.fuente, 'bluelytics');
  assert.deepEqual(pedidos, [FUENTES.dolarapi.api, FUENTES.bluelytics.api]);

  // DolarApi contesta, pero vacío: también se prueba con el respaldo.
  r = await traerDolar({ fetchFn: responder({ [FUENTES.dolarapi.api]: [], [FUENTES.bluelytics.api]: BLUELYTICS }) });
  assert.equal(r.fuente, 'bluelytics');

  assert.equal(await traerDolar({ fetchFn: responder({}) }), null, 'si ninguna contesta, null y sin tirar error');
});

test('los pedidos llevan tiempo de espera, como el clima', () => {
  assert.match(leer('web/lib/dolar.js'), /AbortSignal\.timeout/);
});

// ------------------------------------------------------------- la brecha

test('la brecha del blue contra el oficial, con los precios de venta', () => {
  const b = brecha(interpretarDolarApi(DOLARAPI).cotizaciones);
  assert.deepEqual(b, { porcentaje: 1.3, pesos: 20 }); // (1560 - 1540) / 1540 = 1,298%
  assert.equal(porcentaje(b.porcentaje), '1,3%');
  assert.equal(pesos(b.pesos), '$20');
});

test('la brecha puede ser negativa, y sin oficial o sin blue no hay brecha', () => {
  const b = brecha([{ casa: 'oficial', venta: 1500 }, { casa: 'blue', venta: 1450 }]);
  assert.equal(b.porcentaje, -3.3);
  assert.equal(pesos(b.pesos), '−$50');
  assert.equal(brecha([{ casa: 'oficial', venta: 1500 }]), null);
  assert.equal(brecha([]), null);
});

test('los pesos se escriben a la argentina, con centavos sólo si los hay', () => {
  assert.equal(pesos(1540), '$1.540');
  assert.equal(pesos(1545.6), '$1.545,60');
  assert.equal(pesos(null), '—');
});

// ---------------------------------------------------- "actualizado" y cuándo

test('la hora es la de Balcarce, y dice "ayer" o el día cuando no es de hoy', () => {
  assert.deepEqual(momento('2026-09-24T20:56:00.000Z', MISMO_DIA), { dia: null, hora: '17:56' });
  assert.deepEqual(momento('2026-09-24T20:56:00.000Z', AL_OTRO_DIA), { dia: 'ayer', hora: '17:56' });
  assert.equal(cuando('2026-09-24T20:56:00.000Z', '2026-09-27T12:00:00.000Z'), 'el jueves 24/09 a las 17:56');
  assert.equal(ultimaFecha(interpretarDolarApi(DOLARAPI).cotizaciones), '2026-09-24T20:56:00.000Z');
});

const traido = { ...interpretarDolarApi(DOLARAPI), consultado: MISMO_DIA };
const foto = { ...traido, consultado: '2026-09-24T20:37:00.000Z', deLaFoto: true };

test('recién traído en el navegador: "Actualizado a las" con la hora que informa la fuente', () => {
  const t = textoDeEstado({ estado: 'vivo', datos: traido, ahora: MISMO_DIA });
  assert.equal(t.titulo, 'Actualizado a las 17:56');
  assert.match(t.detalle, /Consultamos DolarApi\.com a las 18:10/);
  assert.match(t.detalle, /cada 5 minutos/);
  // A la mañana siguiente, lo último que informó la fuente es de ayer y se dice.
  assert.equal(textoDeEstado({ estado: 'vivo', datos: traido, ahora: AL_OTRO_DIA }).titulo, 'Actualizado ayer a las 17:56');
});

test('la foto del build: la cotización con su hora, sin decir que está actualizada', () => {
  const t = textoDeEstado({ estado: 'guardada', datos: foto, ahora: foto.consultado });
  assert.equal(t.titulo, 'Cotización de las 17:56');
  assert.match(t.detalle, /La guardamos a las 17:37, al armar esta página/);
  assert.ok(!/actualizad/i.test(t.titulo));
});

test('si no se pudo actualizar, se dice: "Cotización de las …; no se pudo actualizar"', () => {
  const t = textoDeEstado({ estado: 'fallo', datos: foto, ahora: MISMO_DIA });
  assert.equal(t.titulo, 'Cotización de las 17:56; no se pudo actualizar.');
  assert.match(t.detalle, /al armar esta página/);
  assert.equal(textoDeEstado({ estado: 'fallo', datos: foto, ahora: AL_OTRO_DIA }).titulo, 'Cotización de ayer a las 17:56; no se pudo actualizar.');
  // Si lo último bueno lo había traído el navegador, no se habla de la foto.
  assert.match(textoDeEstado({ estado: 'fallo', datos: traido, ahora: MISMO_DIA }).detalle, /La última consulta que contestó fue a las 18:10/);
});

test('sin foto y sin respuesta: "No se pudo consultar la cotización ahora"', () => {
  for (const estado of ['guardada', 'fallo']) {
    assert.equal(textoDeEstado({ estado, datos: null, ahora: MISMO_DIA }).titulo, 'No se pudo consultar la cotización ahora.');
  }
  assert.equal(textoDeEstado({ estado: 'cargando', datos: null }).titulo, 'Consultando la cotización…');
});

test('ningún texto de estado dice "en vivo"', () => {
  for (const estado of ['vivo', 'guardada', 'cargando', 'fallo']) {
    for (const datos of [traido, foto, null]) {
      const t = textoDeEstado({ estado, datos, ahora: MISMO_DIA });
      assert.ok(!/en vivo/i.test(`${t.titulo} ${t.detalle ?? ''}`), `${estado}: ${t.titulo} ${t.detalle}`);
    }
  }
});

// -------------------------------------------------------------- la página

test('la página, el componente y la lógica del dólar no dicen "en vivo" en ningún lado', () => {
  for (const f of ['web/app/dolar/page.js', 'web/components/dolar-vivo.js', 'web/lib/dolar.js']) {
    assert.ok(!/en vivo/i.test(leer(f)), `${f} dice "en vivo"`);
  }
});

test('el HTML compilado de /dolar no dice "en vivo" (si ya se compiló)', (t) => {
  const candidatos = ['web/out/dolar.html', 'web/.next/server/app/dolar.html'].map((f) => path.join(RAIZ, f));
  const html = candidatos.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8'))[0];
  if (!html) { t.skip('todavía no se compiló el sitio'); return; }
  // Sólo el cuerpo de la página: el buscador del encabezado lleva los
  // titulares de las notas, que no son de esta página.
  const principal = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] ?? '';
  assert.ok(principal.includes('Dólar hoy'), 'no encontré la página en el HTML');
  assert.ok(!/en vivo/i.test(principal), 'el HTML estático de /dolar dice "en vivo"');
});

test('/dolar tiene canónico propio, h1, fuente con enlace, y está en el sitemap y en la navegación', () => {
  const p = leer('web/app/dolar/page.js');
  assert.match(p, /metadatosDePagina\(/);
  assert.match(p, /camino: '\/dolar'/);
  assert.match(p, /<h1/);
  assert.match(p, /<details/);
  assert.match(leer('web/components/dolar-vivo.js'), /Fuente: <a href=\{fuente\.url\}/);
  assert.equal(FUENTES.dolarapi.url, 'https://dolarapi.com');
  assert.ok(leer('web/app/sitemap.js').includes('${base}/dolar'));
  const l = leer('web/app/layout.js');
  assert.ok(l.includes('<a href="/dolar" className="servicio">Dólar</a>'), 'falta Dólar en la navegación');
});

test('la foto se guarda en cada build, no lo frena y no se versiona', () => {
  const pkg = JSON.parse(leer('web/package.json'));
  assert.match(pkg.scripts.build, /^npm run dolar && /);
  assert.match(pkg.scripts.dolar, /scripts\/foto-dolar\.mjs/);
  assert.match(leer('.gitignore'), /^web\/data\/dolar\.json\r?$/m);
  const s = leer('web/scripts/foto-dolar.mjs');
  assert.ok(!/process\.exit\(\s*[1-9]/.test(s), 'el script de la foto no puede cortar la compilación');
});

// ---------------------------------------------- el panel de la portada

test('el panel: oficial, blue y MEP, con la venta y la compra, en ese orden', () => {
  const { cotizaciones } = interpretarDolarApi(DOLARAPI);
  const filas = filasDelPanel(cotizaciones);
  assert.deepEqual(filas.map((f) => [f.nombre, f.compra, f.venta]), [['Oficial', 1490, 1540], ['Blue', 1540, 1560], ['MEP', 1539, 1545.6]]);
  // Sin un tipo, no hay fila (no un cero); sin nada, no hay panel.
  assert.deepEqual(filasDelPanel(cotizaciones.filter((c) => c.casa !== 'blue')).map((f) => f.nombre), ['Oficial', 'MEP']);
  assert.deepEqual(filasDelPanel([]), []);
  assert.deepEqual(filasDelPanel(interpretarBluelytics({ last_update: '2026-09-24T21:00:00Z', oficial: { value_sell: 1500, value_buy: 1450 }, blue: { value_sell: 1560, value_buy: 1540 } }).cotizaciones).map((f) => f.nombre), ['Oficial', 'Blue']);
});

test('el panel dice la hora real de la cotización, y si no se pudo actualizar, lo dice', () => {
  const filas = filasDelPanel(interpretarDolarApi(DOLARAPI).cotizaciones);
  // La más nueva de las que se ven: las 17:56 del 24/09 en Balcarce.
  assert.equal(horaDelPanel({ estado: 'vivo', filas, ahora: MISMO_DIA }), 'Cotización de las 17:56');
  assert.equal(horaDelPanel({ estado: 'guardada', filas, ahora: MISMO_DIA }), 'Cotización de las 17:56');
  assert.equal(horaDelPanel({ estado: 'fallo', filas, ahora: MISMO_DIA }), 'Cotización de las 17:56; no se pudo actualizar');
  assert.equal(horaDelPanel({ estado: 'fallo', filas, ahora: AL_OTRO_DIA }), 'Cotización de ayer a las 17:56; no se pudo actualizar');
  assert.equal(horaDelPanel({ estado: 'vivo', filas: [], ahora: MISMO_DIA }), null);
  for (const estado of ['vivo', 'guardada', 'cargando', 'fallo']) {
    assert.ok(!/en vivo/i.test(horaDelPanel({ estado, filas, ahora: MISMO_DIA })));
  }
});

test('el panel usa la misma lógica que /dolar: una consulta por página, sin "en vivo" ni cuadro vacío', () => {
  const tarjeta = leer('web/components/tarjeta-dolar.js');
  assert.ok(!/en vivo/i.test(tarjeta));
  assert.match(tarjeta, /useDolar\(foto\)/);
  assert.match(tarjeta, /if \(!filas\.length\) return null;/, 'sin datos no hay tarjeta');
  assert.match(tarjeta, /href="\/dolar"/);
  assert.match(tarjeta, /Ver todos los dólares/);
  // Los dos componentes comparten el hook: la consulta no se escribe dos veces.
  assert.match(leer('web/components/dolar-vivo.js'), /useDolar\(foto\)/);
  assert.match(leer('web/components/usar-dolar.js'), /traerDolar\(\)/);
  assert.ok(!/traerDolar/.test(tarjeta + leer('web/components/dolar-vivo.js')), 'la consulta está sólo en usar-dolar.js');
  // Está en la pila de servicios de la portada, con la foto del build.
  const portada = leer('web/app/page.js');
  assert.match(portada, /<TarjetaDolar foto=\{fotoDelDolar\(\)\} \/>/);
  assert.ok(portada.indexOf('<TarjetaFarmacia') < portada.indexOf('<TarjetaDolar'), 'el dólar va después de la farmacia');
});

test('el HTML compilado de la portada no dice "en vivo" en el panel del dólar (si ya se compiló)', (t) => {
  const f = path.join(RAIZ, 'web/out/index.html');
  if (!fs.existsSync(f)) { t.skip('todavía no se compiló el sitio'); return; }
  const html = fs.readFileSync(f, 'utf8');
  const panel = html.match(/<section class="tarjeta panel-dolar"[\s\S]*?<\/section>/)?.[0];
  if (!panel) { t.skip('la compilación es de antes del panel o no había foto del dólar'); return; }
  assert.ok(!/en vivo/i.test(panel));
  assert.match(panel, /Cotización de/);
});
