// Reparar los días de estadisticas.json guardados con ceros falsos (regla 168, 15/10/2026).
// Datos inventados y Cloudflare simulado: sin red, sin tocar web/data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  diagnosticarDia, lecturaBuena, diasSospechosos, puntosSospechosos, planDeReparacion, leerDiaDeCloudflare, textoDelArchivo,
} from '../redes/reparar-estadisticas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

/** Un día sano: todo suma lo mismo que las vistas. */
const sano = (vistas = 100, visitas = 40) => ({
  visitas, vistas,
  horas: [vistas - 30, 30],
  notas: { a1: vistas - 60 }, paginas: { '/': 60 },
  dispositivos: { mobile: vistas - 20, desktop: 20 },
  paises: { AR: vistas - 5, US: 5 },
  referentes: { directo: 50, 'google.com': 20 },
});

// ------------------------------------------------------------------ el diagnóstico

test('un día sano no es sospechoso (aunque los grupos difieran un poco de las vistas: Cloudflare estima)', () => {
  assert.equal(diagnosticarDia(sano()), null);
  const casiIgual = { ...sano(117), dispositivos: { mobile: 90, desktop: 20 } }; // 110 contra 117, como el 12/10 real
  assert.equal(diagnosticarDia(casiIgual), null);
});

test('todo en cero es un día vacío: el cero que no es real', () => {
  const vacio = { visitas: 0, vistas: 0, horas: [], notas: {}, paginas: {}, dispositivos: {}, paises: {}, referentes: {} };
  assert.equal(diagnosticarDia(vacio).gravedad, 'vacio');
  assert.equal(diagnosticarDia({}).gravedad, 'vacio');
  assert.equal(diagnosticarDia(null).gravedad, 'vacio');
});

test('los números que se pelean entre sí son una contradicción (las tres formas que pasaron de verdad)', () => {
  // 11/10: 0 vistas con las horas y las notas llenas
  const a = { ...sano(), vistas: 0, visitas: 0 };
  assert.equal(diagnosticarDia(a).gravedad, 'contradice');
  // 14/10: 0 vistas y sólo los países con datos
  const b = { visitas: 0, vistas: 0, horas: [0, 0], notas: {}, paginas: {}, dispositivos: {}, paises: { AR: 72 } };
  assert.equal(diagnosticarDia(b).gravedad, 'contradice');
  // 9/10: 139 vistas, horas en cero, 400 celulares y sin notas ni países
  const c = { visitas: 52, vistas: 139, horas: Array(24).fill(0), notas: {}, paginas: {}, dispositivos: { mobile: 400 }, paises: {} };
  const dc = diagnosticarDia(c);
  assert.equal(dc.gravedad, 'contradice');
  assert.ok(dc.motivos.some((m) => /dispositivos suman 400/.test(m)));
  // más visitas que vistas
  assert.equal(diagnosticarDia({ ...sano(), visitas: 500 }).gravedad, 'contradice');
});

test('faltar un grupo entero con vistas es un día incompleto (5/10 sin países, 10/10 sin dispositivos)', () => {
  const d = diagnosticarDia({ ...sano(), paises: {} });
  assert.equal(d.gravedad, 'incompleto');
  assert.match(d.motivos[0], /países/);
  assert.equal(diagnosticarDia({ ...sano(), dispositivos: {} }).gravedad, 'incompleto');
});

test('un día marcado sin lectura se vuelve a intentar', () => {
  assert.equal(diagnosticarDia({ sinLectura: true }).gravedad, 'sinLectura');
});

test('una lectura nueva sólo sirve si tiene vistas, no se contradice y no le falta nada', () => {
  assert.equal(lecturaBuena(sano()), true);
  assert.equal(lecturaBuena(null), false);
  assert.equal(lecturaBuena({ sinLectura: true }), false);
  assert.equal(lecturaBuena({ visitas: 0, vistas: 0 }), false, 'un cero no se acepta como dato');
  assert.equal(lecturaBuena({ ...sano(), paises: {} }), false, 'a medias tampoco');
  assert.equal(lecturaBuena({ ...sano(), horas: [0, 0] }), false, 'horas en cero con vistas no cierra');
});

test('diasSospechosos: ordenados, y hoy queda aparte salvo que se pida', () => {
  const dias = {
    '2026-10-12': sano(),
    '2026-10-14': { visitas: 0, vistas: 0 },
    '2026-10-11': { ...sano(), vistas: 0, visitas: 0 },
    '2026-10-15': { visitas: 0, vistas: 0 },
  };
  const r = diasSospechosos(dias, { hoy: '2026-10-15' });
  assert.deepEqual(r.map((x) => x.dia), ['2026-10-11', '2026-10-14', '2026-10-15']);
  assert.deepEqual(r.map((x) => x.omitido), [false, false, true]);
  assert.equal(diasSospechosos(dias, { hoy: '2026-10-15', conHoy: true }).at(-1).omitido, false);
  assert.deepEqual(diasSospechosos(dias, { hoy: '2026-10-15', soloDias: ['2026-10-14'] }).map((x) => x.dia), ['2026-10-14']);
});

test('las mediciones con ventanas que no cierran se informan (no se reparan)', () => {
  const ok = { cuando: 'A', web: { u12: { visitas: 3, vistas: 9 }, a12: { visitas: 4, vistas: 8 }, u24: { visitas: 7, vistas: 20 }, a24: { visitas: 8, vistas: 25 } } };
  const mala = { cuando: 'B', web: { u12: { visitas: 16, vistas: 110 }, a12: { visitas: 5, vistas: 9 }, u24: { visitas: 0, vistas: 0 }, a24: { visitas: 50, vistas: 120 } } };
  const cero = { cuando: 'C', web: { u12: { visitas: 0, vistas: 0 }, a12: { visitas: 0, vistas: 0 }, u24: { visitas: 0, vistas: 0 }, a24: { visitas: 0, vistas: 0 } } };
  assert.deepEqual(puntosSospechosos([ok, mala, cero, { cuando: 'D', cloudflare: 'incoherente' }, { cuando: 'E', facebook: {} }]), ['B', 'C', 'D']);
});

// ------------------------------------------------------------------ el plan

test('reemplaza SÓLO los días sospechosos, y sólo con una lectura buena', async () => {
  const dias = {
    '2026-10-12': sano(117, 37),
    '2026-10-13': { visitas: 0, vistas: 0, horas: [], notas: {}, paginas: {}, dispositivos: {}, paises: {}, referentes: {} },
    '2026-10-14': { visitas: 0, vistas: 0, horas: [], notas: {}, paginas: {}, dispositivos: {}, paises: {}, referentes: {} },
  };
  const original = JSON.parse(JSON.stringify(dias));
  const pedidos = [];
  const leerDia = async (dia) => {
    pedidos.push(dia);
    if (dia === '2026-10-13') return { dia: sano(80, 30), faltan: [] };
    return { dia: { visitas: 0, vistas: 0 }, faltan: [] }; // el 14: Cloudflare sigue devolviendo cero
  };
  const { plan, dias: nuevos } = await planDeReparacion({ dias, leerDia, hoy: '2026-10-15' });
  assert.deepEqual(pedidos, ['2026-10-13', '2026-10-14'], 'no se le pide a Cloudflare un día sano');
  assert.deepEqual(nuevos['2026-10-12'], original['2026-10-12'], 'el día sano queda igual');
  assert.deepEqual(nuevos['2026-10-13'], sano(80, 30), 'el día vacío se reemplaza');
  assert.deepEqual(nuevos['2026-10-14'], original['2026-10-14'], 'un cero nuevo no reemplaza a un cero viejo: queda como estaba');
  assert.deepEqual(dias, original, 'no se modifica lo que se recibió');
  assert.deepEqual(plan.map((p) => [p.dia, p.accion]), [['2026-10-13', 'reemplazar'], ['2026-10-14', 'nada']]);
});

test('un día contradictorio con números a medias no se borra si Cloudflare no puede dar el día', async () => {
  const dias = { '2026-10-09': { visitas: 52, vistas: 139, horas: Array(24).fill(0), dispositivos: { mobile: 400 }, notas: {}, paginas: {}, paises: {} } };
  const leerDia = async () => ({ dia: null, faltan: ['Cloudflare, detalle por hora: respuesta vacía'] });
  const r = await planDeReparacion({ dias, leerDia, hoy: '2026-10-15', marcarSinLectura: true });
  assert.deepEqual(r.dias, dias, 'ni siquiera con --marcar-sin-lectura: ese día tiene números, no es un cero puro');
  assert.match(r.plan[0].nota, /respuesta vacía/);
});

test('--marcar-sin-lectura convierte en "sin lectura" sólo a un día todo en cero que no se pudo recuperar', async () => {
  const dias = { '2026-10-13': { visitas: 0, vistas: 0 }, '2026-10-12': sano() };
  const leerDia = async () => ({ dia: null, faltan: [] });
  const sin = await planDeReparacion({ dias, leerDia, hoy: '2026-10-15' });
  assert.deepEqual(sin.dias['2026-10-13'], { visitas: 0, vistas: 0 }, 'sin la opción no se toca');
  const con = await planDeReparacion({ dias, leerDia, hoy: '2026-10-15', marcarSinLectura: true });
  assert.deepEqual(con.dias['2026-10-13'], { sinLectura: true });
  assert.deepEqual(con.dias['2026-10-12'], sano());
  assert.equal(con.plan[0].accion, 'marcar-sin-lectura');
});

test('hoy no se pide salvo --con-hoy, y si Cloudflare falla con una excepción el día queda como estaba', async () => {
  const dias = { '2026-10-15': { visitas: 0, vistas: 0 }, '2026-10-14': { visitas: 0, vistas: 0 } };
  const pedidos = [];
  const leerDia = async (dia) => { pedidos.push(dia); throw new Error('se cayó la red'); };
  const r = await planDeReparacion({ dias, leerDia, hoy: '2026-10-15' });
  assert.deepEqual(pedidos, ['2026-10-14']);
  assert.deepEqual(r.dias, dias);
  assert.match(r.plan[0].nota, /se cayó la red/);
  assert.match(r.plan[1].nota, /es hoy/);
  await planDeReparacion({ dias, leerDia, hoy: '2026-10-15', conHoy: true });
  assert.deepEqual(pedidos, ['2026-10-14', '2026-10-14', '2026-10-15']);
});

test('sin función para leer (--sin-red) sólo diagnostica: nada cambia', async () => {
  const dias = { '2026-10-13': { visitas: 0, vistas: 0 } };
  const r = await planDeReparacion({ dias, leerDia: null, hoy: '2026-10-15', marcarSinLectura: true });
  assert.deepEqual(r.dias, dias);
  assert.equal(r.plan[0].accion, 'nada');
});

// ------------------------------------------------------------------ Cloudflare simulado

/** Un Cloudflare que contesta un día completo de 139 vistas (o vacío, o con error). */
function cloudflareDeUnDia({ vacio = false, error = false } = {}) {
  const pedidos = [];
  const fetchFn = async (_url, init) => {
    const query = JSON.parse(init.body).query;
    pedidos.push(query);
    if (error) return { status: 500, ok: false, json: async () => ({ errors: [{ message: `falló con ${init.headers.authorization}` }] }) };
    const c = {};
    const tiene = (x) => query.includes(x);
    if (!vacio) {
      if (tiene('datetimeHour')) {
        c.horas = [
          { count: 100, dimensions: { datetimeHour: '2026-10-09T15:00:00Z' } },
          { count: 39, dimensions: { datetimeHour: '2026-10-09T16:00:00Z' } },
        ];
      } else if (tiene('sum { visits }')) c.d0 = [{ count: 139, sum: { visits: 52 } }];
      else if (tiene('requestPath')) c.d0 = [{ count: 100, dimensions: { requestPath: '/' } }, { count: 39, dimensions: { requestPath: '/nota/algo-abc123' } }];
      else if (tiene('refererHost')) c.d0 = [{ count: 139, dimensions: { refererHost: '' } }];
      else if (tiene('deviceType')) c.d0 = [{ count: 100, dimensions: { deviceType: 'mobile' } }, { count: 39, dimensions: { deviceType: 'desktop' } }];
      else if (tiene('countryName')) c.d0 = [{ count: 139, dimensions: { countryName: 'AR' } }];
    }
    return { status: 200, ok: true, json: async () => ({ data: { viewer: { accounts: [c] } } }) };
  };
  return { fetchFn, pedidos };
}

test('se pide un solo día, el pedido y con la hora de Balcarce, y la lectura sale buena', async () => {
  const { fetchFn, pedidos } = cloudflareDeUnDia();
  const r = await leerDiaDeCloudflare({
    dia: '2026-10-09', cuenta: 'CUENTA-SECRETA', token: 'TOKEN-SECRETO', siteTag: 'SITIO', fetchFn, ahora: new Date('2026-10-15T20:00:00Z'), esperaReintento: 0,
  });
  assert.deepEqual(r.faltan, []);
  assert.equal(r.dia.vistas, 139);
  assert.equal(r.dia.visitas, 52);
  assert.equal(r.dia.horas[12], 100, 'las 15:00 UTC son las 12 en Balcarce');
  assert.equal(r.dia.horas[13], 39);
  assert.equal(lecturaBuena(r.dia), true);
  assert.ok(pedidos.every((q) => !q.includes('d1:') && !q.includes('d2:')), 'un solo día por consulta, no tres');
  assert.ok(pedidos.some((q) => q.includes('2026-10-09T03:00:00Z') && q.includes('2026-10-10T02:59:59Z')), 'de 00:00 a 23:59 de Balcarce');
});

test('para hoy se pide hasta ahora, no hasta el fin del día', async () => {
  const { fetchFn, pedidos } = cloudflareDeUnDia();
  await leerDiaDeCloudflare({ dia: '2026-10-15', cuenta: 'C', token: 'T', siteTag: 'S', fetchFn, ahora: new Date('2026-10-15T19:00:00Z'), esperaReintento: 0 });
  assert.ok(pedidos.every((q) => !q.includes('2026-10-16')));
  assert.ok(pedidos.some((q) => q.includes('2026-10-15T19:00:00Z')));
});

test('una respuesta vacía de Cloudflare no da un día en cero: da "nada" y el plan lo deja como estaba', async () => {
  const { fetchFn } = cloudflareDeUnDia({ vacio: true });
  const lectura = await leerDiaDeCloudflare({ dia: '2026-10-09', cuenta: 'C', token: 'T', siteTag: 'S', fetchFn, ahora: new Date('2026-10-15T20:00:00Z'), esperaReintento: 0 });
  assert.equal(lecturaBuena(lectura.dia), false);
  const dias = { '2026-10-09': { visitas: 0, vistas: 0 } };
  const r = await planDeReparacion({ dias, leerDia: async () => lectura, hoy: '2026-10-15' });
  assert.deepEqual(r.dias, dias);
});

test('el token y la cuenta nunca aparecen en lo que se informa', async () => {
  const { fetchFn } = cloudflareDeUnDia({ error: true });
  const r = await leerDiaDeCloudflare({ dia: '2026-10-09', cuenta: 'CUENTA-SECRETA', token: 'TOKEN-SECRETO', siteTag: 'S', fetchFn, ahora: new Date('2026-10-15T20:00:00Z'), esperaReintento: 0 });
  const salida = JSON.stringify(r) + JSON.stringify(await planDeReparacion({ dias: { '2026-10-09': { visitas: 0, vistas: 0 } }, leerDia: async () => r, hoy: '2026-10-15' }));
  assert.ok(r.faltan.length > 0);
  assert.ok(!salida.includes('TOKEN-SECRETO') && !salida.includes('CUENTA-SECRETA'));
});

// ------------------------------------------------------------------ el archivo y la línea de comandos

test('el archivo se escribe como lo escribe el vigilante, con el mismo fin de línea que tenía', () => {
  const archivo = { puntos: [{ cuando: 'x' }], dias: { '2026-10-09': { visitas: 1, vistas: 2 } } };
  const lf = textoDelArchivo(archivo, '{}\n');
  assert.equal(lf, `${JSON.stringify(archivo, null, 2)}\n`);
  const crlf = textoDelArchivo(archivo, '{\r\n}\r\n');
  assert.equal(crlf, lf.replace(/\n/g, '\r\n'));
  assert.deepEqual(JSON.parse(crlf), archivo);
});

test('por la línea de comandos simula por defecto, no escribe y no se pone a medir', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reparar-estadisticas-'));
  const archivo = path.join(dir, 'estadisticas.json');
  const texto = `${JSON.stringify({ puntos: [], dias: { '2026-10-13': { visitas: 0, vistas: 0 }, '2026-10-12': sano() } }, null, 2)}\n`;
  fs.writeFileSync(archivo, texto);
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TZ: 'America/Argentina/Buenos_Aires' }; // sin credenciales
  for (const extra of [[], ['--aplicar']]) {
    const salida = execFileSync(process.execPath, [path.join(RAIZ, 'redes', 'reparar-estadisticas.mjs'), `--archivo=${archivo}`, '--sin-red', ...extra], { env, encoding: 'utf8' });
    assert.match(salida, /Sospechosos: 1/);
    assert.match(salida, extra.length ? /APLICAR/ : /SIMULAR/);
    assert.ok(!salida.includes('Estadísticas, prueba'), 'importar estadisticas.mjs no debe ponerse a medir');
    assert.equal(fs.readFileSync(archivo, 'utf8'), texto, 'sin lecturas buenas de Cloudflare no se escribe nada');
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('el script no imprime nunca las variables de credenciales y su código no las escribe en ningún lado', () => {
  const codigo = fs.readFileSync(path.join(RAIZ, 'redes', 'reparar-estadisticas.mjs'), 'utf8');
  const consolas = codigo.split(/\r?\n/).filter((l) => /console\.(log|error)/.test(l));
  assert.ok(consolas.length > 5);
  for (const l of consolas) {
    assert.ok(!/\$\{\s*(token|cuenta|env\.CLOUDFLARE\w*|process\.env\.CLOUDFLARE\w*)\s*\}/.test(l), `se imprime una credencial: ${l.trim()}`);
  }
  assert.match(codigo, /--aplicar/);
  assert.match(codigo, /aplicar: argv\.includes\('--aplicar'\)/, 'sólo se escribe si se pide --aplicar');
});
