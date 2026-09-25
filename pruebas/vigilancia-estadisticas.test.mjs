// Las estadísticas del vigilante (25/09): Cloudflare Web Analytics y Meta,
// con fetch simulado. Sin red. Lo importante: que un permiso que falta se
// diga claro y no rompa nada, y que ningún token aparezca en un texto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  turnoDeMedicion, tocaMedir, agregarPunto, puntoDeHace, variacion, tokenDeCloudflare,
  estadisticasDeCloudflare, estadisticasDeMeta, medir, textoEstadisticas, nombresDeCaminos, MAXIMO_DE_PUNTOS,
} from '../redes/estadisticas.mjs';

const A = (hhmm, dia = '25') => new Date(`2026-09-${dia}T${hhmm}:00-03:00`);
const respuesta = (cuerpo, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => cuerpo });

// ------------------------------------------------------------ cuándo medir

test('se mide a las 9 y a las 21 de Balcarce, una vez por turno', () => {
  assert.equal(turnoDeMedicion(A('08:59')), null);
  assert.equal(turnoDeMedicion(A('09:00')), '2026-09-25/9');
  assert.equal(turnoDeMedicion(A('20:59')), '2026-09-25/9');
  assert.equal(turnoDeMedicion(A('21:30')), '2026-09-25/21');
  assert.equal(tocaMedir(A('09:10'), {}), true);
  assert.equal(tocaMedir(A('09:40'), { ultimaMedicion: '2026-09-25/9' }), false);
  assert.equal(tocaMedir(A('21:00'), { ultimaMedicion: '2026-09-25/9' }), true);
  assert.equal(tocaMedir(A('03:00'), {}), false);
});

test('la historia guarda como mucho 120 puntos, los más nuevos', () => {
  let puntos = [];
  for (let i = 0; i < 130; i += 1) puntos = agregarPunto(puntos, { cuando: String(i) });
  assert.equal(puntos.length, MAXIMO_DE_PUNTOS);
  assert.equal(puntos[0].cuando, '10');
  assert.equal(puntos.at(-1).cuando, '129');
});

test('para comparar se busca el punto de hace 24 horas, con margen', () => {
  const puntos = [{ cuando: A('21:05', '24').toISOString(), x: 1 }, { cuando: A('09:02', '25').toISOString(), x: 2 }];
  assert.equal(puntoDeHace(puntos, A('21:00'), 24).x, 1);
  assert.equal(puntoDeHace(puntos, A('21:00'), 12).x, 2);
  assert.equal(puntoDeHace(puntos, A('21:00', '27'), 24), null);
});

test('la flecha y el porcentaje', () => {
  assert.equal(variacion(112, 100), '↑ 12%');
  assert.equal(variacion(95, 100), '↓ 5%');
  assert.equal(variacion(100, 100), '=');
  assert.equal(variacion(0, 0), '=');
  assert.equal(variacion(5, 0), 'antes 0');
});

// ---------------------------------------------------------------- Cloudflare

test('el token propio de estadísticas manda; si falta, se prueba el de Pages', () => {
  assert.equal(tokenDeCloudflare({ CLOUDFLARE_ANALYTICS_TOKEN: 'a', CLOUDFLARE_API_TOKEN: 'b' }).nombre, 'CLOUDFLARE_ANALYTICS_TOKEN');
  assert.equal(tokenDeCloudflare({ CLOUDFLARE_API_TOKEN: 'b' }).nombre, 'CLOUDFLARE_API_TOKEN');
  assert.equal(tokenDeCloudflare({}).token, null);
});

/** Un Cloudflare de mentira: contesta la búsqueda del sitio y los números. */
function cloudflareFalso({ status = 200, errores = null } = {}) {
  const pedidos = [];
  const fetchFn = async (url, init) => {
    pedidos.push({ url, init, query: JSON.parse(init.body).query });
    if (status !== 200 || errores) return respuesta({ data: null, errors: errores ?? [{ message: 'Authentication error' }] }, status);
    const q = JSON.parse(init.body).query;
    if (q.includes('sitios:')) {
      return respuesta({ data: { viewer: { accounts: [{ sitios: [
        { count: 5, dimensions: { siteTag: 'otro', requestHost: 'radar-balcarce.pages.dev' } },
        { count: 900, dimensions: { siteTag: 'SITIO-BUENO', requestHost: 'radarbalcarce.com' } },
      ] }] } } });
    }
    const g = (visitas, vistas) => [{ count: vistas, sum: { visits: visitas } }];
    return respuesta({ data: { viewer: { accounts: [{
      u12: g(60, 150), a12: g(50, 160), u24: g(110, 310), a24: g(100, 300),
      top: [{ count: 90, dimensions: { requestPath: '/' } }, { count: 40, dimensions: { requestPath: '/nota/reabre-el-fangio-abc' } }],
    }] } } });
  };
  return { fetchFn, pedidos };
}

test('Cloudflare: busca el sitio de radarbalcarce.com y trae visitas, páginas y lo más visto', async () => {
  const { fetchFn, pedidos } = cloudflareFalso();
  const r = await estadisticasDeCloudflare({ cuenta: 'CUENTA', token: 'TOKEN-CF', ahora: A('21:00'), fetchFn });
  assert.equal(r.ok, true);
  assert.equal(r.siteTag, 'SITIO-BUENO');
  assert.deepEqual(r.web.u24, { visitas: 110, vistas: 310 });
  assert.deepEqual(r.web.a12, { visitas: 50, vistas: 160 });
  assert.equal(r.web.top[1].camino, '/nota/reabre-el-fangio-abc');
  assert.match(pedidos[1].query, /siteTag: "SITIO-BUENO"/);
  assert.equal(pedidos[0].init.headers.authorization, 'Bearer TOKEN-CF');
  assert.ok(!String(pedidos[0].url).includes('TOKEN-CF'), 'el token viajó en la dirección');
});

test('Cloudflare sin permiso: lo dice claro, no rompe y no muestra el token', async () => {
  const { fetchFn } = cloudflareFalso({ status: 403, errores: [{ message: 'not authorized for that account TOKEN-CF' }] });
  const r = await estadisticasDeCloudflare({ cuenta: 'CUENTA', token: 'TOKEN-CF', ahora: A('21:00'), fetchFn });
  assert.equal(r.ok, false);
  assert.equal(r.sinPermiso, true);
  assert.ok(!r.error.includes('TOKEN-CF'));
});

test('Cloudflare con HTTP 200 y error de autorización en GraphQL: también es falta de permiso', async () => {
  const { fetchFn } = cloudflareFalso({ errores: [{ message: 'Authentication error' }] });
  const r = await estadisticasDeCloudflare({ cuenta: 'C', token: 'T', ahora: A('21:00'), fetchFn, siteTag: 'S' });
  assert.equal(r.sinPermiso, true);
});

test('Cloudflare que no contesta: error, sin colgarse ni romper', async () => {
  const r = await estadisticasDeCloudflare({
    cuenta: 'C', token: 'T', ahora: A('21:00'), siteTag: 'S', fetchFn: async () => { throw Object.assign(new Error('x'), { name: 'TimeoutError' }); },
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /tardó/);
});

// ---------------------------------------------------------------------- Meta

/** Meta de mentira: la página y los seguidores andan; las estadísticas de la
 *  página piden un permiso que el token no tiene. */
function metaFalso() {
  return async (url) => {
    const u = new URL(url);
    const camino = u.pathname.replace(/^\/v[\d.]+\//, '');
    const metrica = u.searchParams.get('metric');
    if (camino === 'PAGINA' && u.searchParams.get('fields')?.includes('access_token')) {
      return respuesta({ name: 'Radar', access_token: 'TOKEN-PAGINA', instagram_business_account: { id: 'IG', username: 'radar' } });
    }
    if (camino === 'PAGINA') return respuesta({ followers_count: 250, fan_count: 240 });
    if (camino === 'PAGINA/insights') return respuesta({ error: { message: '(#200) requires read_insights permission TOKEN-META', code: 200 } }, 403);
    if (camino === 'IG') return respuesta({ followers_count: 312, media_count: 40 });
    if (camino === 'IG/insights' && metrica === 'reach') return respuesta({ data: [{ name: 'reach', total_value: { value: 800 } }] });
    if (camino === 'IG/insights') return respuesta({ error: { message: 'metric no válida', code: 100 } }, 400);
    return respuesta({}, 404);
  };
}

test('Meta: trae seguidores aunque falten permisos de estadísticas, y dice qué faltó', async () => {
  const r = await estadisticasDeMeta({ token: 'TOKEN-META', paginaId: 'PAGINA', ahora: A('21:00'), fetchFn: metaFalso() });
  assert.deepEqual(r.facebook, { seguidores: 250 });
  assert.equal(r.instagram.seguidores, 312);
  assert.equal(r.instagram.alcance, 800);
  assert.ok(r.faltan.some((f) => /Facebook, vistas/.test(f)));
  assert.ok(r.faltan.every((f) => !f.includes('TOKEN-META')), 'se vio el token');
});

test('Meta: el pedido de estadísticas de Instagram es de las últimas 24 horas', async () => {
  const pedidos = [];
  const base = metaFalso();
  await estadisticasDeMeta({ token: 'T', paginaId: 'PAGINA', ahora: A('21:00'), fetchFn: async (u, i) => { pedidos.push(new URL(u)); return base(u, i); } });
  const ig = pedidos.find((u) => u.pathname.endsWith('IG/insights'));
  assert.equal(Number(ig.searchParams.get('until')) - Number(ig.searchParams.get('since')), 86400);
  assert.equal(ig.searchParams.get('metric_type'), 'total_value');
});

// ---------------------------------------------------------------- medir todo

test('sin secretos, medir no rompe y dice qué falta', async () => {
  const log = [];
  const { punto, faltan } = await medir({ env: {}, ahora: A('21:00'), fetchFn: async () => { throw new Error('no debería salir a la red'); }, log: (x) => log.push(x) });
  assert.equal(punto.cloudflare, 'sin-secretos');
  assert.ok(faltan.some((f) => /CLOUDFLARE_ACCOUNT_ID/.test(f)));
  assert.ok(faltan.some((f) => /META_TOKEN/.test(f)));
  assert.equal(log.length, faltan.length, 'cada falta se dice una vez en el registro');
});

test('lo que se guarda es sólo números agregados: nada de tokens', async () => {
  const cf = cloudflareFalso().fetchFn;
  const meta = metaFalso();
  const fetchFn = (u, i) => (String(u).includes('cloudflare') ? cf(u, i) : meta(u, i));
  const { punto, faltan } = await medir({
    env: { CLOUDFLARE_ACCOUNT_ID: 'CUENTA', CLOUDFLARE_ANALYTICS_TOKEN: 'TOKEN-CF', META_TOKEN: 'TOKEN-META', META_PAGE_ID: 'PAGINA' },
    ahora: A('21:00'), fetchFn, log: () => {},
  });
  const todo = JSON.stringify(punto) + faltan.join(' ');
  for (const s of ['TOKEN-CF', 'TOKEN-META', 'TOKEN-PAGINA', 'CUENTA']) assert.ok(!todo.includes(s), `apareció ${s}`);
  assert.equal(punto.web.u24.visitas, 110);
  assert.equal(punto.instagram.seguidores, 312);
});

// ---------------------------------------------------------------- el mensaje

test('el mensaje muestra la evolución: flechas de la web y seguidores desde ayer', () => {
  const ahora = A('21:00');
  const ayer = { cuando: A('21:02', '24').toISOString(), facebook: { seguidores: 247 }, instagram: { seguidores: 307 } };
  const punto = {
    cuando: ahora.toISOString(),
    web: { u12: { visitas: 60, vistas: 150 }, a12: { visitas: 50, vistas: 160 }, u24: { visitas: 110, vistas: 310 }, a24: { visitas: 100, vistas: 300 }, top: [{ camino: '/', vistas: 90 }, { camino: '/nota/reabre-el-fangio-abc', vistas: 40 }] },
    facebook: { seguidores: 250 },
    instagram: { seguidores: 312, alcance: 800 },
  };
  const t = textoEstadisticas({ punto, puntos: [ayer, punto], ahora, nombreDeCamino: nombresDeCaminos([{ id: 'abc', titulo: 'Reabre el Fangio' }]) });
  assert.match(t, /Web, últimas 24 h: 110 visitas \(↑ 10%\) y 310 páginas vistas \(↑ 3%\)/);
  assert.match(t, /Web, últimas 12 h: 60 visitas \(↑ 20%\)/);
  assert.match(t, /Lo más visto: Portada \(90\), Reabre el Fangio \(40\)/);
  assert.match(t, /Facebook: 250 seguidores \(\+3 desde ayer\)/);
  assert.match(t, /Instagram: 312 seguidores \(\+5 desde ayer\) · alcance 800 \(24 h\)/);
});

test('un solo seguidor es "1 seguidor" (la primera prueba real, del 25/09, decía "1 seguidores")', () => {
  const t = textoEstadisticas({ punto: { cuando: A('21:00').toISOString(), facebook: { seguidores: 1 }, instagram: { seguidores: 3 } }, ahora: A('21:00') });
  assert.match(t, /Facebook: 1 seguidor$/m);
  assert.match(t, /Instagram: 3 seguidores$/m);
});

test('sin permiso de Cloudflare, el mensaje lo dice con esas palabras', () => {
  const t = textoEstadisticas({ punto: { cuando: A('21:00').toISOString(), cloudflare: 'sin-permiso' }, ahora: A('21:00') });
  assert.match(t, /falta permiso de Analytics en el token de Cloudflare/);
});

// -------------------------------------------------------------- lo cableado

const leer = (f) => fs.readFileSync(path.join(import.meta.dirname, '..', f), 'utf8');

test('el workflow de Vigilancia corre con la hora de Balcarce y guarda las estadísticas', () => {
  const y = leer('.github/workflows/vigilancia.yml');
  assert.match(y, /TZ: America\/Argentina\/Buenos_Aires/);
  assert.match(y, /git add web\/data\/vigilancia\.json web\/data\/estadisticas\.json/);
  assert.match(y, /CLOUDFLARE_ANALYTICS_TOKEN: \$\{\{ secrets\.CLOUDFLARE_ANALYTICS_TOKEN \}\}/);
  assert.match(y, /META_TOKEN: \$\{\{ secrets\.META_TOKEN \}\}/);
});

test('la prueba de estadísticas no manda WhatsApp ni guarda nada', () => {
  const y = leer('.github/workflows/prueba-estadisticas.yml');
  assert.ok(!/WHATSAPP/.test(y));
  assert.match(y, /contents: read/);
  assert.match(y, /node redes\/estadisticas\.mjs/);
});

test('estadisticas.json existe y tiene la forma que espera el vigilante', () => {
  const j = JSON.parse(leer('web/data/estadisticas.json'));
  assert.ok(Array.isArray(j.puntos));
});
