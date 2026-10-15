// Prueba de espejo del motor nuevo (docs/etapa-10-operacion/DISENO-MOTOR.md, punto 2):
// lo que sale de la base SQLite local tiene que ser lo mismo que había en web/data/*.json
// (cantidad de notas, ids, fechas, secciones, direcciones, y la nota entera).
//
// Sin red. Si web/data/archivo.json no está, la parte "real" se saltea y queda la parte
// con datos chicos inventados, que corre siempre.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rutaDeNota } from '../web/lib/ruta.js';
import {
  importar, abrirBase, importarADb, leerRepositorio, notasDeLaBase, notasPorSeccion,
} from '../motor/importar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATOS_REALES = path.join(RAIZ, 'web', 'data');
const HAY_REALES = fs.existsSync(path.join(DATOS_REALES, 'archivo.json'));

const leer = (dir, nombre) => {
  const f = path.join(dir, nombre);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};
const unaVez = (lista) => lista.length === new Set(lista).size;
const cuenta = (db, tabla) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get().n;
const rechazadas = (resumen, origen) => resumen.rechazadas[origen] ?? 0;

/** El espejo, comparado contra los JSON leídos aparte (sin pasar por el importador). */
function verificarEspejo(dir, db, resumen) {
  const fuente = leer(dir, 'archivo.json')?.notas ?? [];
  const delArchivo = notasDeLaBase(db);

  // Notas: cantidad, ids, orden, fechas, secciones
  assert.equal(cuenta(db, 'notas') + rechazadas(resumen, 'archivo'), fuente.length, 'cargadas + rechazadas = las del archivo');
  // Las que tienen que entrar: completas y con id nuevo (la primera gana).
  const vistas = new Set();
  const aceptadas = fuente.filter((n) => {
    const completa = ['id', 'titulo', 'seccion', 'fecha'].every((k) => typeof n?.[k] === 'string' && n[k].trim());
    if (!completa || vistas.has(n.id)) return false;
    vistas.add(n.id);
    return true;
  });
  assert.equal(delArchivo.length, cuenta(db, 'notas'));
  assert.deepEqual(delArchivo.map((n) => n.id), aceptadas.map((n) => n.id), 'mismos ids en el mismo orden');
  assert.ok(unaVez(delArchivo.map((n) => n.id)), 'ids sin repetir');
  assert.deepEqual(delArchivo.map((n) => n.fecha), aceptadas.map((n) => n.fecha), 'mismas fechas');
  assert.deepEqual(delArchivo.map((n) => n.seccion), aceptadas.map((n) => n.seccion), 'mismas secciones');
  assert.deepEqual(delArchivo, aceptadas, 'cada nota vuelve entera, tal cual estaba');

  const porSeccion = {};
  for (const n of aceptadas) porSeccion[n.seccion] = (porSeccion[n.seccion] ?? 0) + 1;
  assert.deepEqual(notasPorSeccion(db), porSeccion, 'notas por sección');

  // Las columnas (no sólo el JSON de respaldo) dicen lo mismo
  const filas = db.prepare('SELECT id, slug, seccion, titulo, fecha_publicacion FROM notas ORDER BY rowid').all();
  assert.deepEqual(
    filas.map((f) => [f.id, f.slug, f.seccion, f.titulo, f.fecha_publicacion]),
    aceptadas.map((n) => [n.id, n.slug || '', n.seccion, n.titulo, n.fecha]),
  );
  if (aceptadas.length) {
    const fechas = aceptadas.map((n) => n.fecha).sort();
    const { a, b } = db.prepare('SELECT MIN(fecha_publicacion) AS a, MAX(fecha_publicacion) AS b FROM notas').get();
    assert.equal(a, fechas[0]);
    assert.equal(b, fechas.at(-1));
  }

  // Direcciones: una por nota, la misma que arma el sitio
  const dirs = db.prepare('SELECT nota_id, ruta FROM direcciones ORDER BY rowid').all().map((d) => ({ ...d }));
  assert.deepEqual(dirs, aceptadas.map((n) => ({ nota_id: n.id, ruta: rutaDeNota(n) })));
  assert.ok(unaVez(dirs.map((d) => d.ruta)), 'rutas únicas');

  // El resto de los archivos: lo cargado + lo rechazado = lo que había
  const cuantos = (obj) => Object.keys(obj ?? {}).length;
  const dec = leer(dir, 'celular-decisiones.json') ?? {};
  const pares = [
    ['redirecciones', 'fusionadas', cuantos(leer(dir, 'fusionadas.json')?.notas)],
    ['fotos', 'banco-fotos', cuantos(leer(dir, 'banco-fotos.json'))],
    ['retiradas', 'retiradas', cuantos(leer(dir, 'retiradas.json')?.notas)],
    ['correcciones', 'correcciones', cuantos(leer(dir, 'correcciones.json')?.notas)],
    ['correcciones_auditoria', 'correcciones-auditoria', cuantos(leer(dir, 'correcciones-auditoria.json')?.notas)],
    ['decisiones_de_personas', 'celular-decisiones', cuantos(dec.notas) + cuantos(dec.redes)],
  ];
  for (const [tabla, origen, esperado] of pares) {
    assert.equal(cuenta(db, tabla) + rechazadas(resumen, origen), esperado, `${tabla}: cargadas + rechazadas = ${esperado}`);
  }
  assert.equal(
    cuenta(db, 'importacion_rechazos'),
    Object.values(resumen.rechazadas).reduce((a, b) => a + b, 0),
    'todo rechazo queda anotado en la base',
  );

  // Ids de retiradas y fusionadas: los mismos que en el JSON
  const ids = (tabla, col) => db.prepare(`SELECT ${col} AS k FROM ${tabla} ORDER BY k`).all().map((f) => f.k);
  const retJson = Object.keys(leer(dir, 'retiradas.json')?.notas ?? {});
  for (const k of ids('retiradas', 'nota_id')) assert.ok(retJson.includes(k));

  // Portada: mismo orden, y todas son notas del archivo
  const portada = (leer(dir, 'portada.json')?.notas ?? []).map((n) => n.id);
  assert.deepEqual(db.prepare('SELECT nota_id FROM portada ORDER BY posicion').all().map((f) => f.nota_id), portada);
  const enBase = new Set(delArchivo.map((n) => n.id));
  for (const id of portada) assert.ok(enBase.has(id), `la portada nombra ${id}, que no está en el archivo`);
}

// ---------------------------------------------------------------- datos chicos

const nota = (id, extra = {}) => ({
  id, titulo: `Titular de ${id}`, copete: `Bajada de ${id}`, cuerpo: `Cuerpo de ${id}`, guion: null,
  seccion: 'Balcarce', local: true, medios: ['Medio A'], enlace: null, fecha: '2026-10-10T12:00:00.000Z',
  visto: '2026-10-10T12:00:00.000Z', como: 'automatica', slug: `titular-de-${id}`, ...extra,
});

function carpetaInventada() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-motor-'));
  const escribir = (n, o) => fs.writeFileSync(path.join(dir, n), JSON.stringify(o));
  escribir('archivo.json', {
    notas: [
      nota('aaa1', { fecha: '2026-10-12T09:00:00.000Z', seccion: 'Política', verificacion: { nivel: 'ALTA' }, foto: { archivo: 'fotos-notas/aaa1.jpg', credito: 'Foto: X' } }),
      nota('bbb2', { seccion: 'Fútbol', como: 'publicada', publicadaPor: 'Hernán' }),
      nota('repaso1', { propia: 'repaso', firma: 'Nota de Radar Balcarce', seccion: 'Balcarce', slug: undefined }),
      nota('ccc3', { fecha: '2026-10-01T00:00:00.000Z', seccion: 'Agro' }),
      nota('aaa1', { titulo: 'Repetida' }), // id repetido -> rechazo
      { ...nota('ddd4'), titulo: '' }, // sin titulo -> rechazo
    ],
  });
  escribir('portada.json', { generado: '2026-10-12T10:00:00.000Z', notas: [{ id: 'aaa1' }, { id: 'bbb2' }] });
  escribir('retiradas.json', {
    notas: {
      eee5: { motivo: 'Policiales sin revisión', titulo: 'T', medio: 'M', cuando: '2026-10-15', por: 'Claude' },
      fff6: { motivo: 'sin quién ni cuándo' }, // rechazo
    },
  });
  escribir('correcciones.json', {
    notas: {
      bbb2: { titulo: 'Nuevo titular', cuerpo: 'Nuevo cuerpo', motivo: 'arreglo', cuando: '2026-10-11T00:00:00.000Z', por: 'Hernán', deIA: false },
      zzz9: { titulo: 'Sin motivo', cuando: '2026-10-11T00:00:00.000Z', por: 'Hernán' }, // rechazo
    },
  });
  escribir('correcciones-auditoria.json', {
    notas: { ccc3: { titulo: 'T', ruta: null, seccion: 'Agro', cambios: [{ campo: 'cuerpo', antes: 'a', despues: 'b' }], cuando: '2026-10-03T00:00:00.000Z' } },
  });
  escribir('fusionadas.json', {
    notas: {
      ggg7: { a: 'aaa1', ruta: '/nota/titular-viejo-ggg7', cuando: '2026-09-29T21:22:25.829Z' },
      hhh8: { a: 'aaa1', ruta: '/nota/titular-viejo-ggg7', cuando: '2026-09-29T21:22:25.829Z' }, // ruta repetida -> rechazo
    },
  });
  escribir('celular-decisiones.json', {
    notas: {
      aaa1: { estado: 'descartada', por: 'Hernán', motivo: 'descartada desde el celular', cuando: '2026-10-01T03:37:47.213Z' },
      bbb2: { estado: 'publicada', por: 'Hernán', cuando: '2026-10-01T03:41:39.303Z' }, // sin motivo -> rechazo
    },
    redes: {},
  });
  escribir('banco-fotos.json', {
    aaa1: { intentado: true, origen: 'medio', cuando: '2026-09-28T03:52:09.330Z', archivo: 'fotos-notas/aaa1.jpg', credito: 'Foto: X' },
    bbb2: { origen: 'wikimedia' }, // sin cuando -> rechazo
  });
  return dir;
}

test('espejo con datos chicos inventados: la base devuelve lo que había', () => {
  const dir = carpetaInventada();
  const { db, resumen } = importar({ datos: dir });
  verificarEspejo(dir, db, resumen);

  assert.equal(cuenta(db, 'notas'), 4);
  assert.equal(rechazadas(resumen, 'archivo'), 2);
  assert.deepEqual(
    db.prepare("SELECT razon FROM importacion_rechazos WHERE origen = 'archivo' ORDER BY id").all().map((f) => f.razon),
    ['id repetido', 'sin titulo'],
  );
  // Rechazos de lo que escribe una persona
  assert.equal(rechazadas(resumen, 'retiradas'), 1);
  assert.equal(rechazadas(resumen, 'correcciones'), 1);
  assert.equal(rechazadas(resumen, 'celular-decisiones'), 1);
  assert.equal(rechazadas(resumen, 'fusionadas'), 1);
  assert.equal(rechazadas(resumen, 'banco-fotos'), 1);
  // Cómo se clasifica el origen de cada nota
  const origenes = Object.fromEntries(db.prepare('SELECT id, origen FROM notas').all().map((f) => [f.id, f.origen]));
  assert.deepEqual(origenes, { aaa1: 'automatica', bbb2: 'persona', repaso1: 'propia', ccc3: 'automatica' });
  // Una nota sin slug usa la dirección que armaría el sitio
  assert.equal(db.prepare('SELECT ruta FROM direcciones WHERE nota_id = ?').get('repaso1').ruta, rutaDeNota({ id: 'repaso1', titulo: 'Titular de repaso1' }));
  // Redirección 301 de una nota unida
  assert.deepEqual(
    { ...db.prepare('SELECT desde, hacia_nota_id, codigo, motivo FROM redirecciones').get() },
    { desde: '/nota/titular-viejo-ggg7', hacia_nota_id: 'aaa1', codigo: 301, motivo: 'repetida_unida' },
  );
  // La corrección guarda los campos nuevos aparte de por/cuando/motivo
  const c = db.prepare('SELECT cambio, por, motivo, de_ia FROM correcciones WHERE nota_id = ?').get('bbb2');
  assert.deepEqual(JSON.parse(c.cambio), { titulo: 'Nuevo titular', cuerpo: 'Nuevo cuerpo' });
  assert.equal(c.por, 'Hernán');
  assert.equal(c.de_ia, 0);
  db.close();
});

test('el importador es idempotente: correrlo dos veces deja lo mismo (en un archivo, no sólo en memoria)', () => {
  const dir = carpetaInventada();
  const base = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'radar-motor-db-')), 'radar.sqlite');
  const a = importar({ datos: dir, base });
  const antes = notasDeLaBase(a.db);
  const cuentas = (db) => ['notas', 'direcciones', 'redirecciones', 'fotos', 'retiradas', 'correcciones', 'decisiones_de_personas', 'importacion_rechazos']
    .map((t) => cuenta(db, t));
  const c1 = cuentas(a.db);
  a.db.close();
  const b = importar({ datos: dir, base });
  assert.deepEqual(cuentas(b.db), c1);
  assert.deepEqual(notasDeLaBase(b.db), antes);
  b.db.close();
});

test('el esquema impide cargar algo que escribió una persona sin por, cuando o motivo', () => {
  const db = abrirBase();
  const ins = (sql, ...args) => () => db.prepare(sql).run(...args);
  assert.throws(ins('INSERT INTO retiradas (nota_id, motivo, por, cuando) VALUES (?, ?, ?, ?)', 'x', 'm', null, '2026-10-15'), /NOT NULL|constraint/i);
  assert.throws(ins('INSERT INTO retiradas (nota_id, motivo, por, cuando) VALUES (?, ?, ?, ?)', 'x', '  ', 'Hernán', '2026-10-15'), /constraint/i);
  assert.throws(ins('INSERT INTO retiradas (nota_id, motivo, por, cuando) VALUES (?, ?, ?, ?)', 'x', 'm', 'Hernán', ''), /constraint/i);
  assert.throws(ins("INSERT INTO correcciones (nota_id, cambio, motivo, por, cuando) VALUES (?, '{}', NULL, 'H', 'c')", 'x'), /NOT NULL|constraint/i);
  assert.throws(ins("INSERT INTO decisiones_de_personas (objetivo_tipo, objetivo_id, accion, por, cuando, motivo, datos) VALUES ('nota','x','aprobar','H','c',NULL,'{}')"), /NOT NULL|constraint/i);
  // y con los tres, entra
  db.prepare('INSERT INTO retiradas (nota_id, motivo, por, cuando) VALUES (?, ?, ?, ?)').run('x', 'm', 'Hernán', '2026-10-15');
  assert.equal(cuenta(db, 'retiradas'), 1);
  db.close();
});

test('aplicar el esquema dos veces sobre la misma base no rompe nada', () => {
  const base = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'radar-motor-db-')), 'radar.sqlite');
  abrirBase(base).close();
  const db = abrirBase(base);
  assert.ok(cuenta(db, 'notas') === 0);
  db.close();
});

test('si algo falla a mitad de camino, la base queda como estaba (una sola transacción)', () => {
  const dir = carpetaInventada();
  const { db } = importar({ datos: dir });
  const antes = notasDeLaBase(db);
  const repo = leerRepositorio(dir);
  repo.fusionadas = { x: { a: 'aaa1', ruta: '/nota/ok-x', get cuando() { throw new Error('falla a propósito'); } } };
  assert.throws(() => importarADb(db, repo), /falla a propósito/);
  assert.deepEqual(notasDeLaBase(db), antes);
  db.close();
});

// -------------------------------------------------------------- datos reales

test('espejo con el repositorio real (web/data): mismas notas, ids, fechas y secciones', { skip: !HAY_REALES && 'no hay web/data/archivo.json' }, () => {
  const antes = fs.statSync(path.join(DATOS_REALES, 'archivo.json')).mtimeMs;
  const { db, resumen } = importar({ datos: DATOS_REALES });
  verificarEspejo(DATOS_REALES, db, resumen);

  // Con datos reales no debería haber notas rechazadas del archivo
  assert.equal(rechazadas(resumen, 'archivo'), 0, 'el archivo.json real no tiene notas inválidas ni repetidas');
  assert.equal(cuenta(db, 'notas'), leer(DATOS_REALES, 'archivo.json').notas.length);
  // Todo lo que fue rechazado es de personas y tiene su razón anotada
  for (const f of db.prepare('SELECT origen, razon FROM importacion_rechazos').all()) {
    assert.match(f.razon, /falta|sin|repetida/);
  }
  db.close();
  assert.equal(fs.statSync(path.join(DATOS_REALES, 'archivo.json')).mtimeMs, antes, 'el importador no toca web/data');
});
