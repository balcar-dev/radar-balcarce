// La pestaña "Números" del panel del celular y el detalle diario de la web (1/10/2026).
// Sin red: Cloudflare se simula.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  diasAMedir, nombreDeReferente, clasificarCamino, detalleDeCloudflare, mezclarDias,
} from '../redes/estadisticas-detalle.mjs';
import { consultar } from '../redes/estadisticas.mjs';
import {
  ultimosDias, datosDelDia, totales, sumarMapa, horasSumadas, indiceDeNotas, porSeccion, notasMasLeidas,
  porMedio, deAcaYDeAfuera, piezasPorDia, evolucionDeSeguidores, resumenDeCorridas, htmlDeNumeros, variacion,
} from '../web/public/panel/numeros.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

// ------------------------------------------------------- el detalle diario

test('los días a medir son los de Balcarce, con la medianoche a las 03:00 UTC', () => {
  const r = diasAMedir(new Date('2026-10-01T15:00:00Z'));
  assert.deepEqual(r.map((d) => d.dia), ['2026-09-29', '2026-09-30', '2026-10-01']);
  assert.equal(new Date(r[2].desde).toISOString(), '2026-10-01T03:00:00.000Z');
  assert.equal(r[2].hasta, new Date('2026-10-01T15:00:00Z').getTime(), 'hoy llega hasta ahora');
  // a las 01:00 en Balcarce (04:00 UTC) ya es el día nuevo; a las 23:00 (02:00 UTC) sigue el anterior
  assert.equal(diasAMedir(new Date('2026-10-02T02:00:00Z')).at(-1).dia, '2026-10-01');
  assert.equal(diasAMedir(new Date('2026-10-02T04:00:00Z')).at(-1).dia, '2026-10-02');
});

test('de dónde llegan: nombres cortos, sin contar el propio sitio', () => {
  assert.equal(nombreDeReferente(''), 'directo');
  assert.equal(nombreDeReferente(null), 'directo');
  assert.equal(nombreDeReferente('l.facebook.com'), 'facebook.com');
  assert.equal(nombreDeReferente('m.facebook.com'), 'facebook.com');
  assert.equal(nombreDeReferente('www.google.com.ar'), 'google.com');
  assert.equal(nombreDeReferente('l.instagram.com'), 'instagram.com');
  assert.equal(nombreDeReferente('radarbalcarce.com'), null);
  assert.equal(nombreDeReferente('www.radarbalcarce.com'), null);
  assert.equal(nombreDeReferente('radar-balcarce.pages.dev'), null, 'la copia de pruebas no es una fuente');
});

test('las direcciones: la nota por su identificador, lo demás por su dirección', () => {
  assert.deepEqual(clasificarCamino('/nota/la-provincia-crea-un-programa-tx9q5q'), { id: 'tx9q5q' });
  assert.deepEqual(clasificarCamino('/nota/1nyo5j6/'), { id: '1nyo5j6' });
  assert.deepEqual(clasificarCamino('/'), { pagina: '/' });
  assert.deepEqual(clasificarCamino('/seccion/argentina/?utm=x'), { pagina: '/seccion/argentina' });
  assert.equal(clasificarCamino('/nota/indice.json'), null);
  assert.equal(clasificarCamino(''), null);
});

function cloudflareFalso({ sinGrupo = null } = {}) {
  const pedidos = [];
  const fetchFn = async (_url, init) => {
    const query = JSON.parse(init.body).query;
    pedidos.push(query);
    const tiene = (x) => query.includes(x);
    if (sinGrupo && tiene(sinGrupo)) {
      return { status: 200, ok: true, json: async () => ({ errors: [{ message: `unknown field ${sinGrupo}` }], data: null }) };
    }
    const c = {};
    if (tiene('datetimeHour')) {
      c.horas = [
        { count: 5, dimensions: { datetimeHour: '2026-10-01T12:00:00Z' } }, // 09 en Balcarce
        { count: 7, dimensions: { datetimeHour: '2026-10-01T02:00:00Z' } }, // 23 del 30/09 en Balcarce
        { count: 9, dimensions: { datetimeHour: '2026-09-29T15:00:00Z' } }, // 12 del 29/09 (todo día con vistas tiene horas: si no, el detalle se contradice)
      ];
    } else if (tiene('sum { visits }')) {
      for (const i of [0, 1, 2]) c[`d${i}`] = [{ count: 100 + i, sum: { visits: 10 + i } }];
    } else if (tiene('requestPath')) {
      c.d2 = [
        { count: 40, dimensions: { requestPath: '/' } },
        { count: 9, dimensions: { requestPath: '/nota/algo-abc123' } },
        { count: 3, dimensions: { requestPath: '/nota/algo-abc123/' } },
      ];
    } else if (tiene('refererHost')) {
      c.d2 = [
        { count: 8, dimensions: { refererHost: 'l.facebook.com' } },
        { count: 4, dimensions: { refererHost: 'm.facebook.com' } },
        { count: 6, dimensions: { refererHost: '' } },
        { count: 5, dimensions: { refererHost: 'radarbalcarce.com' } },
      ];
    } else if (tiene('deviceType')) {
      c.d2 = [{ count: 30, dimensions: { deviceType: 'mobile' } }, { count: 10, dimensions: { deviceType: 'desktop' } }];
    } else if (tiene('countryName')) {
      c.d2 = [{ count: 38, dimensions: { countryName: 'AR' } }, { count: 2, dimensions: { countryName: 'US' } }];
    }
    return { status: 200, ok: true, json: async () => ({ data: { viewer: { accounts: [c] } } }) };
  };
  return { fetchFn, pedidos };
}

test('el detalle junta horas, notas, referentes, aparatos y países por día', async () => {
  const { fetchFn, pedidos } = cloudflareFalso();
  const { dias, faltan } = await detalleDeCloudflare({
    consultar, cuenta: 'CUENTA', token: 'TOKEN', siteTag: 'SITIO', ahora: new Date('2026-10-01T15:00:00Z'), fetchFn,
  });
  assert.deepEqual(faltan, []);
  const hoy = dias['2026-10-01'];
  assert.equal(hoy.vistas, 102);
  assert.equal(hoy.visitas, 12);
  assert.equal(hoy.horas[9], 5);
  assert.equal(dias['2026-09-30'].horas[23], 7, 'la hora se pasa a la de Balcarce y cae en el día que corresponde');
  assert.deepEqual(hoy.notas, { abc123: 12 }, 'la misma nota con y sin barra final suma junta');
  assert.deepEqual(hoy.paginas, { '/': 40 });
  assert.deepEqual(hoy.referentes, { 'facebook.com': 12, directo: 6 }, 'sin el propio sitio y con Facebook junto');
  assert.deepEqual(hoy.dispositivos, { mobile: 30, desktop: 10 });
  assert.deepEqual(hoy.paises, { AR: 38, US: 2 });
  assert.ok(pedidos.length >= 6);
  assert.ok(!JSON.stringify(dias).includes('TOKEN') && !JSON.stringify(dias).includes('CUENTA'));
});

test('si Cloudflare no acepta un grupo, los otros salen igual y se dice cuál faltó', async () => {
  const { fetchFn } = cloudflareFalso({ sinGrupo: 'countryName' });
  const { dias, faltan } = await detalleDeCloudflare({
    consultar, cuenta: 'C', token: 'T', siteTag: 'S', ahora: new Date('2026-10-01T15:00:00Z'), fetchFn,
  });
  assert.equal(faltan.length, 1);
  assert.match(faltan[0], /países/);
  assert.equal(dias['2026-10-01'].dispositivos.mobile, 30);
  assert.equal(dias['2026-10-01'].paises, undefined);
});

// 15/10/2026 (regla 167 de las analíticas): este test decía "lo nuevo pisa SIEMPRE", y por eso un cero
// de Cloudflare (lectura fallida) borraba un dato bueno. Ahora lo nuevo pisa a lo viejo cuando trae datos
// (acá 80 > 10), pero un valor nuevo VACÍO (0, [0…], {}) no pisa a uno viejo con datos: ver los tests de abajo.
test('lo nuevo pisa día por día, campo por campo, y se guardan sólo los últimos días', () => {
  const guardados = { '2026-09-30': { vistas: 50, paises: { AR: 40 } }, '2026-10-01': { vistas: 10, horas: [1] } };
  const nuevos = { '2026-10-01': { vistas: 80 }, '2026-10-02': { vistas: 5 } };
  const r = mezclarDias(guardados, nuevos);
  assert.equal(r['2026-10-01'].vistas, 80);
  assert.deepEqual(r['2026-10-01'].horas, [1], 'lo que no se pudo medir ahora no borra lo anterior');
  assert.equal(r['2026-09-30'].paises.AR, 40);
  assert.deepEqual(Object.keys(mezclarDias(guardados, nuevos, 2)), ['2026-10-01', '2026-10-02']);
});

test('un cero nuevo NO pisa un dato bueno (13 al 15/10: Cloudflare devolvía todo en cero)', () => {
  const guardados = { '2026-10-12': { visitas: 40, vistas: 120, horas: [3, 4], paises: { AR: 100 }, notas: { a: 5 } } };
  const r = mezclarDias(guardados, { '2026-10-12': { visitas: 0, vistas: 0, horas: [0, 0], paises: {}, notas: {} } });
  assert.deepEqual(r['2026-10-12'], guardados['2026-10-12']);
  // y un día marcado sin lectura tampoco borra uno con datos
  assert.deepEqual(mezclarDias(guardados, { '2026-10-12': { sinLectura: true } })['2026-10-12'], guardados['2026-10-12']);
});

test('un día sin lectura se guarda como tal, y una lectura buena posterior le saca la marca', () => {
  let r = mezclarDias({}, { '2026-10-13': { sinLectura: true } });
  assert.deepEqual(r['2026-10-13'], { sinLectura: true });
  r = mezclarDias(r, { '2026-10-13': { visitas: 9, vistas: 30 } });
  assert.deepEqual(r['2026-10-13'], { visitas: 9, vistas: 30 });
});

// ----- las respuestas vacías de Cloudflare no son ceros (15/10/2026)

const AHORA_PRUEBA = new Date('2026-10-15T15:00:00Z'); // 12:00 del 15/10 en Balcarce

/** Un Cloudflare que contesta lo que se le diga a cada grupo (los demás, vacíos). */
function cloudflareConRespuestas({ totales = null, horas = null, tanda = null } = {}) {
  let llamadas = 0;
  const fetchFn = async (_u, init) => {
    const q = JSON.parse(init.body).query;
    if (q.includes('sum { visits }')) llamadas += 1; // cada lectura completa empieza con la de los totales
    const c = {};
    const t = tanda ? tanda(llamadas) : { totales, horas };
    if (q.includes('datetimeHour')) { if (t.horas) c.horas = t.horas; }
    else if (q.includes('sum { visits }')) { if (t.totales) Object.assign(c, t.totales); }
    return { status: 200, ok: true, json: async () => ({ data: { viewer: { accounts: [c] } } }) };
  };
  return { fetchFn, llamadas: () => llamadas };
}

test('todo vacío en un día cerrado: no hay ceros guardados, el día queda "sin lectura"', async () => {
  const { fetchFn } = cloudflareConRespuestas();
  const { dias } = await detalleDeCloudflare({
    consultar, cuenta: 'C', token: 'T', siteTag: 'S', ahora: AHORA_PRUEBA, fetchFn, esperaReintento: 0,
  });
  assert.deepEqual(dias['2026-10-13'], { sinLectura: true });
  assert.deepEqual(dias['2026-10-14'], { sinLectura: true });
  assert.equal(dias['2026-10-15'], undefined, 'hoy, recién empezando, no se marca ni se guarda');
  for (const d of Object.values(dias)) {
    assert.equal(d.visitas, undefined);
    assert.equal(d.vistas, undefined);
    assert.equal(d.horas, undefined, 'las horas no se rellenan con ceros');
  }
});

test('11/10: 0 vistas pero las horas suman 98 -> se repite la lectura; si sigue igual, el día queda sin lectura', async () => {
  const horas = [{ count: 98, dimensions: { datetimeHour: '2026-10-14T15:00:00Z' } }];
  const totales = { d0: [{ count: 50, sum: { visits: 5 } }], d1: [{ count: 0, sum: { visits: 0 } }], d2: [{ count: 10, sum: { visits: 3 } }] };
  const { fetchFn, llamadas } = cloudflareConRespuestas({ totales, horas });
  const { dias, faltan } = await detalleDeCloudflare({
    consultar, cuenta: 'C', token: 'T', siteTag: 'S', ahora: AHORA_PRUEBA, fetchFn, esperaReintento: 0,
  });
  assert.equal(llamadas(), 2, 'repite una sola vez');
  assert.deepEqual(dias['2026-10-14'], { sinLectura: true });
  assert.ok(faltan.some((f) => /2026-10-14/.test(f)));
});

test('si la segunda lectura cierra, se usa esa', async () => {
  const buenas = [{ count: 30, dimensions: { datetimeHour: '2026-10-14T15:00:00Z' } }];
  const { fetchFn, llamadas } = cloudflareConRespuestas({
    tanda: (n) => (n === 1
      ? { totales: { d1: [{ count: 0, sum: { visits: 0 } }] }, horas: buenas }
      : { totales: { d1: [{ count: 30, sum: { visits: 8 } }] }, horas: buenas }),
  });
  const { dias } = await detalleDeCloudflare({
    consultar, cuenta: 'C', token: 'T', siteTag: 'S', ahora: AHORA_PRUEBA, fetchFn, esperaReintento: 0,
  });
  assert.equal(llamadas(), 2);
  assert.equal(dias['2026-10-14'].vistas, 30);
  assert.equal(dias['2026-10-14'].horas[12], 30);
});

test('el panel dibuja un día "sin lectura" (o en cero de verdad viejo) como faltante, no como cero visitas', () => {
  const est = {
    puntos: [],
    dias: {
      '2026-10-12': { visitas: 40, vistas: 120, horas: Array(24).fill(5) },
      '2026-10-13': { sinLectura: true },
      '2026-10-14': { visitas: 0, vistas: 0, horas: Array(24).fill(0), notas: {} }, // lo que dejaba el código viejo
    },
  };
  assert.equal(datosDelDia(est, '2026-10-12').detalle, true);
  for (const d of ['2026-10-13', '2026-10-14']) {
    const r = datosDelDia(est, d);
    assert.equal(r.sinLectura, true, d);
    assert.equal(r.detalle, false, d);
    assert.equal(r.vistas, undefined, d);
  }
  assert.deepEqual(totales(['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => datosDelDia(est, d))), { visitas: 40, vistas: 120 });
  const h = htmlDeNumeros(entrada({ estadisticas: est, hoy: '2026-10-15', rango: 7 }));
  assert.ok(h.includes('sin lectura'), 'el gráfico marca los días sin lectura');
  assert.match(h, /2 días figuran con la rayita punteada/);
  assert.ok(!h.includes('NaN') && !h.includes('undefined'));
});

test('una medición de las 21 toda en cero no sirve para completar un día', () => {
  const est = { puntos: [{ cuando: '2026-10-14T00:00:20Z', web: { u24: { visitas: 0, vistas: 0 } } }], dias: {} };
  assert.equal(datosDelDia(est, '2026-10-13').vistas, undefined);
});

// ------------------------------------------------------------ el panel

const hoy = '2026-10-01';
const notas = [
  { id: 'a1', titulo: 'Gol de Balcarce', seccion: 'Fútbol', medios: ['El Diario', 'Radio X'], local: true },
  { id: 'b2', titulo: 'Inflación de septiembre', seccion: 'Economía', medios: ['Perfil'] },
  { id: 'c3', titulo: 'Nuevo semáforo', seccion: 'Balcarce', medios: ['Radio X'] },
];
const estadisticas = {
  puntos: [
    { cuando: '2026-09-29T00:00:20Z', web: { u24: { visitas: 40, vistas: 300 } }, facebook: { seguidores: 2 }, instagram: { seguidores: 4 } },
    { cuando: '2026-10-01T12:00:00Z', web: { u24: { visitas: 41, vistas: 79 } }, facebook: { seguidores: 3, vistas: 600, interacciones: 2 }, instagram: { seguidores: 4, alcance: 8, vistas: 80, interacciones: 4 } },
  ],
  dias: {
    '2026-09-30': { visitas: 30, vistas: 100, horas: Array.from({ length: 24 }, (_, i) => (i === 10 ? 40 : 2)), notas: { a1: 30, b2: 10, zz: 5 }, referentes: { 'facebook.com': 20, directo: 10 }, dispositivos: { mobile: 25, desktop: 5 }, paises: { AR: 28, US: 2 }, paginas: { '/': 50, '/seccion/balcarce': 4 } },
    '2026-10-01': { visitas: 20, vistas: 60, horas: Array(24).fill(1), notas: { a1: 10, c3: 20 }, referentes: { 'facebook.com': 5, 'google.com': 3 }, dispositivos: { mobile: 15 }, paises: { AR: 20 }, paginas: { '/': 30 } },
  },
};
const produccion = { dias: { '2026-09-30': { publicadas: 20, porSeccion: { Fútbol: 4, Economía: 10, Balcarce: 6 } }, '2026-10-01': { publicadas: 10, porSeccion: { Fútbol: 2, Balcarce: 3 } } } };

test('los días del período terminan hoy', () => {
  assert.deepEqual(ultimosDias(hoy, 3), ['2026-09-29', '2026-09-30', '2026-10-01']);
});

test('un día sin detalle se completa con la medición de las 21', () => {
  const d = datosDelDia(estadisticas, '2026-09-28');
  assert.equal(d.vistas, 300);
  assert.equal(d.detalle, false);
  assert.equal(datosDelDia(estadisticas, '2026-09-30').detalle, true);
  assert.equal(datosDelDia(estadisticas, '2026-09-10').vistas, undefined);
});

test('totales, mapas y horas suman bien', () => {
  const lista = ['2026-09-30', '2026-10-01'].map((d) => datosDelDia(estadisticas, d));
  assert.deepEqual(totales(lista), { visitas: 50, vistas: 160 });
  assert.deepEqual(sumarMapa(lista, 'referentes')[0], ['facebook.com', 25]);
  assert.equal(horasSumadas(lista)[10], 41);
  assert.equal(variacion(110, 100), '↑ 10 % que antes');
  assert.equal(variacion(5, 0), '');
});

test('la sección que más se lee, con sus notas publicadas y las vistas por nota', () => {
  const lista = ['2026-09-30', '2026-10-01'].map((d) => datosDelDia(estadisticas, d));
  const r = porSeccion({ lista, indice: indiceDeNotas(notas), produccion });
  assert.equal(r.filas[0].seccion, 'Fútbol');
  assert.equal(r.filas[0].vistas, 40);
  assert.equal(r.filas[0].publicadas, 6);
  assert.ok(Math.abs(r.filas[0].porNota - 40 / 6) < 1e-9);
  assert.equal(r.sinIdentificar, 5, 'las vistas de notas que ya no están se cuentan aparte');
  const balcarce = r.filas.find((f) => f.seccion === 'Balcarce');
  assert.equal(balcarce.vistas, 20);
});

test('las notas más leídas, los medios y lo de acá contra lo de afuera', () => {
  const lista = ['2026-09-30', '2026-10-01'].map((d) => datosDelDia(estadisticas, d));
  const indice = indiceDeNotas(notas);
  assert.equal(notasMasLeidas({ lista, indice })[0].id, 'a1');
  assert.deepEqual(porMedio({ lista, indice })[0], ['Radio X', 60]);
  assert.deepEqual(deAcaYDeAfuera({ lista, indice }), { aca: 60, afuera: 10, sin: 5 });
});

test('redes: piezas por día y evolución de seguidores', () => {
  const libro = {
    facebook: { x: { cuando: '2026-10-01T15:00:00Z' }, y: { cuando: '2026-10-01T02:00:00Z' } },
    instagram: { 'a/b': { cuando: '2026-10-01T15:00:00Z' } },
    instagramFeed: { z: { cuando: '2026-10-01T16:00:00Z' } },
  };
  const por = piezasPorDia(libro, ['2026-09-30', '2026-10-01']);
  assert.deepEqual(por['2026-09-30'], { facebook: 1, instagram: 0 }, 'las 23:00 de Balcarce son del día anterior');
  assert.deepEqual(por['2026-10-01'], { facebook: 1, instagram: 2 });
  const e = evolucionDeSeguidores(estadisticas.puntos, 'facebook', '2026-09-28');
  assert.deepEqual({ ahora: e.ahora, antes: e.antes }, { ahora: 3, antes: 2 });
  assert.equal(evolucionDeSeguidores([], 'facebook', hoy), null);
});

test('las corridas: cuántas fallaron', () => {
  const r = resumenDeCorridas([
    { status: 'completed', conclusion: 'success', created_at: 'c' },
    { status: 'completed', conclusion: 'failure', created_at: 'b' },
    { status: 'in_progress', conclusion: null, created_at: 'a' },
  ]);
  assert.deepEqual(r, { total: 2, fallas: 1, ultimaFalla: 'b', ultima: 'success' });
});

const entrada = (extra = {}) => ({
  estadisticas, produccion, indice: indiceDeNotas(notas), libro: {}, corridas: { actualizar: { total: 15, fallas: 0 }, redes: { total: 15, fallas: 1, ultimaFalla: 'x' }, vigilancia: null },
  rango: 7, hoy, enlace: (n) => `https://radarbalcarce.com/nota/${n.id}`, espera: { esperan: 3, sinCuerpo: 1 }, haceCuanto: () => 'hace 2 horas', ...extra,
});

test('la pestaña se arma con todas sus partes', () => {
  const h = htmlDeNumeros(entrada());
  for (const t of ['Qué sección se lee más', 'Las notas más leídas', 'A qué hora entra la gente', 'De dónde llegan', 'Con qué entran', 'Desde qué país', 'Redes', 'Cómo anda el sistema']) {
    assert.ok(h.includes(t), `falta: ${t}`);
  }
  assert.ok(h.includes('Facebook'), 'el referente de Facebook tiene su nombre');
  assert.ok(h.includes('1 con falla de las últimas 15'));
  assert.ok(h.includes('data-rango="30"'));
});

test('sin detalle todavía, dice que se está juntando y no rompe', () => {
  const h = htmlDeNumeros(entrada({ estadisticas: { puntos: [], dias: {} }, produccion: { dias: {} }, libro: {}, corridas: null }));
  assert.ok(h.includes('se empieza a juntar'));
  assert.ok(h.includes('No se pudieron traer las corridas'));
  assert.ok(!h.includes('NaN') && !h.includes('undefined'));
});

test('un título raro no rompe el HTML', () => {
  const sucia = [{ id: 'a1', titulo: '<img src=x onerror=alert(1)>', seccion: 'Fútbol', medios: ['<b>'] }];
  const h = htmlDeNumeros(entrada({ indice: indiceDeNotas(sucia) }));
  assert.ok(!h.includes('<img src=x'));
  assert.ok(!h.includes('<b>'));
});

test('la pestaña está conectada: panel, caché del service worker y textos', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /\['numeros', 'Números'/);
  assert.match(app, /from '\.\/numeros\.js'/);
  assert.match(leer('web/public/panel/sw.js'), /\/panel\/numeros\.js/);
  assert.match(leer('web/public/panel/textos.js'), /numeros:/);
  assert.match(leer('web/public/panel/index.html'), /repeat\(5, 1fr\)/);
});

test('el panel no manda a nadie nada de afuera: numeros.js no carga nada ni usa la red', () => {
  const src = leer('web/public/panel/numeros.js');
  assert.ok(!/\bfetch\s*\(/.test(src));
  assert.ok(!/<script|https?:\/\/(?!radarbalcarce)/.test(src.replace(/\/\/.*$/gm, '')));
});

test('lo que se guarda de la web son sólo números: ni quién entró ni de qué dirección', () => {
  const src = leer('redes/estadisticas-detalle.mjs');
  for (const prohibido of ['clientIP', 'visitorIP', 'userAgent', 'sessionId', 'cookie']) assert.ok(!src.includes(prohibido), prohibido);
});
