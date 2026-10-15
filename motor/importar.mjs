// Importador: lee el repositorio (web/data/*.json) y lo vuelca a una base SQLite
// local con el esquema de motor/esquema.sql. Sólo LEE de web/data; escribe
// únicamente la base que se le indique. Sin dependencias: usa `node:sqlite`.
//
// Uso:  node motor/importar.mjs [--datos=web/data] [--base=motor/salida/radar.sqlite]
//
// Es idempotente: cada corrida vacía las tablas y las vuelve a llenar adentro de
// una sola transacción (si algo falla, la base queda como estaba).

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rutaDeNota } from '../web/lib/ruta.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
export const ESQUEMA_SQL = path.join(AQUI, 'esquema.sql');
export const VERSION_DEL_ESQUEMA = '0001';

/** Las tablas que llena el importador, en el orden en que se vacían. */
export const TABLAS = [
  'notas', 'direcciones', 'redirecciones', 'fotos', 'retiradas', 'correcciones',
  'correcciones_auditoria', 'decisiones_de_personas', 'portada', 'importacion_rechazos',
];

// ---------------------------------------------------------------- utilidades

const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const nulo = (v) => (v === undefined ? null : v);
const entero = (v) => (v === undefined || v === null ? null : (v ? 1 : 0));
const hayTexto = (v) => typeof v === 'string' && v.trim().length > 0;
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function leerJson(dir, nombre) {
  const archivo = path.join(dir, nombre);
  if (!fs.existsSync(archivo)) return null;
  return JSON.parse(fs.readFileSync(archivo, 'utf8').replace(/^﻿/, ''));
}

/** Abre (o crea) la base y le aplica el esquema. ':memory:' para pruebas. */
export function abrirBase(ruta = ':memory:') {
  if (ruta !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(ruta)), { recursive: true });
  const db = new DatabaseSync(ruta);
  db.exec(fs.readFileSync(ESQUEMA_SQL, 'utf8'));
  return db;
}

// ------------------------------------------------------------------ lectura

/** Lee todos los JSON que usa el importador. Lo que falta queda en null / vacío. */
export function leerRepositorio(dirDatos) {
  const dir = path.resolve(dirDatos);
  const mapa = (nombre) => leerJson(dir, nombre)?.notas ?? {};
  const archivo = leerJson(dir, 'archivo.json');
  const decisiones = leerJson(dir, 'celular-decisiones.json') ?? {};
  return {
    dir,
    notas: Array.isArray(archivo?.notas) ? archivo.notas : [],
    portada: leerJson(dir, 'portada.json'),
    retiradas: mapa('retiradas.json'),
    correcciones: mapa('correcciones.json'),
    correccionesAuditoria: mapa('correcciones-auditoria.json'),
    fusionadas: mapa('fusionadas.json'),
    decisiones: { nota: decisiones.notas ?? {}, redes: decisiones.redes ?? {} },
    banco: leerJson(dir, 'banco-fotos.json') ?? {},
  };
}

// ------------------------------------------------------------ transformación

/** Una nota del archivo, como fila de `notas`. */
export function filaDeNota(n) {
  const origen = n.propia ? 'propia' : (n.como === 'publicada' ? 'persona' : 'automatica');
  const extras = {};
  for (const k of ['claves', 'seSabe', 'noConfirmado', 'textoRedes', 'etiquetas', 'temas', 'antecedentes', 'verificacion']) {
    if (n[k] !== undefined) extras[k] = n[k];
  }
  return {
    id: n.id,
    slug: n.slug || '',
    seccion: n.seccion,
    tipo: nulo(n.propia ?? null),
    estado: 'publicada',
    origen,
    escrita_por: nulo(n.publicadaPor ?? n.firma ?? null),
    titulo: n.titulo,
    bajada: nulo(n.copete),
    cuerpo: nulo(n.cuerpo),
    guion: nulo(n.guion),
    extras: Object.keys(extras).length ? json(extras) : null,
    fuentes: json(n.fuentesConsultadas),
    verificacion_nivel: nulo(n.verificacion?.nivel),
    fecha_publicacion: n.fecha,
    visto: nulo(n.visto),
    es_de_aca: entero(n.local),
    foto_archivo: nulo(n.foto?.archivo),
    foto_credito: nulo(n.foto?.credito),
    original: JSON.stringify(n),
  };
}

function motivoDeRechazoDeNota(n, vistos) {
  if (!esObjeto(n)) return 'no es un objeto';
  if (!hayTexto(n.id)) return 'sin id';
  if (vistos.has(n.id)) return 'id repetido';
  if (!hayTexto(n.titulo)) return 'sin titulo';
  if (!hayTexto(n.seccion)) return 'sin seccion';
  if (!hayTexto(n.fecha)) return 'sin fecha';
  return null;
}

// ----------------------------------------------------------------- importar

/**
 * Vuelca el repositorio a la base. Devuelve un resumen con las cantidades
 * cargadas y los rechazos (por origen).
 */
export function importarADb(db, repo, { ahora = new Date().toISOString() } = {}) {
  const resumen = { cargadas: {}, rechazadas: {}, origen: repo.dir };

  const insRechazo = db.prepare('INSERT INTO importacion_rechazos (origen, clave, razon, crudo) VALUES (?, ?, ?, ?)');
  const rechazo = (origen, clave, razon, crudo) => {
    insRechazo.run(origen, nulo(clave), razon, json(crudo));
    resumen.rechazadas[origen] = (resumen.rechazadas[origen] ?? 0) + 1;
  };
  const contar = (tabla) => { resumen.cargadas[tabla] = (resumen.cargadas[tabla] ?? 0) + 1; };

  const insNota = db.prepare(`INSERT INTO notas
    (id, slug, seccion, tipo, estado, origen, escrita_por, titulo, bajada, cuerpo, guion, extras, fuentes,
     verificacion_nivel, fecha_publicacion, visto, es_de_aca, foto_archivo, foto_credito, original)
    VALUES (:id, :slug, :seccion, :tipo, :estado, :origen, :escrita_por, :titulo, :bajada, :cuerpo, :guion, :extras,
     :fuentes, :verificacion_nivel, :fecha_publicacion, :visto, :es_de_aca, :foto_archivo, :foto_credito, :original)`);
  const insDireccion = db.prepare('INSERT INTO direcciones (nota_id, ruta, creada) VALUES (?, ?, ?)');
  const buscarRedireccion = db.prepare('SELECT 1 FROM redirecciones WHERE desde = ?');
  const insRedireccion = db.prepare(`INSERT INTO redirecciones (desde, hacia_nota_id, hacia_ruta, codigo, motivo, creada)
    VALUES (?, ?, NULL, 301, 'repetida_unida', ?)`);
  const insFoto = db.prepare(`INSERT INTO fotos
    (nota_id, origen, cuando, archivo, credito, medio, licencia, enlace, razon, intentado, borrada, intentos, por, datos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insRetirada = db.prepare('INSERT INTO retiradas (nota_id, motivo, por, cuando, titulo, medio) VALUES (?, ?, ?, ?, ?, ?)');
  const insCorreccion = db.prepare('INSERT INTO correcciones (nota_id, cambio, de_ia, motivo, por, cuando) VALUES (?, ?, ?, ?, ?, ?)');
  const insAuditoria = db.prepare(`INSERT INTO correcciones_auditoria (nota_id, titulo, ruta, seccion, cambios, cuando)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const insDecision = db.prepare(`INSERT INTO decisiones_de_personas (objetivo_tipo, objetivo_id, accion, por, cuando, motivo, datos)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insPortada = db.prepare('INSERT INTO portada (posicion, nota_id) VALUES (?, ?)');
  const insEstado = db.prepare(`INSERT INTO estado (clave, valor, actualizado) VALUES (?, ?, ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado`);

  db.exec('BEGIN');
  try {
    for (const t of TABLAS) db.exec(`DELETE FROM ${t}`);
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('decisiones_de_personas','importacion_rechazos')");

    // Notas + direcciones
    const vistos = new Set();
    for (const n of repo.notas) {
      const mal = motivoDeRechazoDeNota(n, vistos);
      if (mal) { rechazo('archivo', n?.id, mal, n); continue; }
      vistos.add(n.id);
      insNota.run(filaDeNota(n));
      contar('notas');
      insDireccion.run(n.id, rutaDeNota(n), n.fecha);
      contar('direcciones');
    }

    // Notas unidas -> redirecciones 301
    for (const [desdeId, f] of Object.entries(repo.fusionadas)) {
      if (!esObjeto(f) || !hayTexto(f.ruta) || !hayTexto(f.a)) { rechazo('fusionadas', desdeId, 'sin ruta o sin destino', f); continue; }
      if (buscarRedireccion.get(f.ruta)) { rechazo('fusionadas', desdeId, 'ruta repetida', f); continue; }
      insRedireccion.run(f.ruta, f.a, hayTexto(f.cuando) ? f.cuando : ahora);
      contar('redirecciones');
    }

    // Banco de fotos
    for (const [id, f] of Object.entries(repo.banco)) {
      if (!esObjeto(f) || !hayTexto(f.origen) || !hayTexto(f.cuando)) { rechazo('banco-fotos', id, 'sin origen o sin cuando', f); continue; }
      insFoto.run(id, f.origen, f.cuando, nulo(f.archivo), nulo(f.credito), nulo(f.medio), nulo(f.licencia), nulo(f.enlace),
        nulo(f.razon), entero(f.intentado), entero(f.borrada), nulo(f.intentos), nulo(f.por), JSON.stringify(f));
      contar('fotos');
    }

    // Lo que escribe una persona: por, cuando y motivo son obligatorios.
    for (const [id, r] of Object.entries(repo.retiradas)) {
      if (!esObjeto(r) || !hayTexto(r.motivo) || !hayTexto(r.por) || !hayTexto(r.cuando)) {
        rechazo('retiradas', id, 'falta motivo, por o cuando', r); continue;
      }
      insRetirada.run(id, r.motivo, r.por, r.cuando, nulo(r.titulo), nulo(r.medio));
      contar('retiradas');
    }
    for (const [id, c] of Object.entries(repo.correcciones)) {
      if (!esObjeto(c) || !hayTexto(c.motivo) || !hayTexto(c.por) || !hayTexto(c.cuando)) {
        rechazo('correcciones', id, 'falta motivo, por o cuando', c); continue;
      }
      const { motivo, por, cuando, deIA, ...cambio } = c;
      insCorreccion.run(id, JSON.stringify(cambio), entero(deIA), motivo, por, cuando);
      contar('correcciones');
    }
    for (const [id, c] of Object.entries(repo.correccionesAuditoria)) {
      if (!esObjeto(c) || !hayTexto(c.cuando) || !Array.isArray(c.cambios)) { rechazo('correcciones-auditoria', id, 'sin cuando o sin cambios', c); continue; }
      insAuditoria.run(id, nulo(c.titulo), nulo(c.ruta), nulo(c.seccion), JSON.stringify(c.cambios), c.cuando);
      contar('correcciones_auditoria');
    }
    for (const tipo of ['nota', 'redes']) {
      for (const [id, d] of Object.entries(repo.decisiones[tipo])) {
        if (!esObjeto(d) || !hayTexto(d.estado) || !hayTexto(d.motivo) || !hayTexto(d.por) || !hayTexto(d.cuando)) {
          rechazo('celular-decisiones', `${tipo}:${id}`, 'falta estado, motivo, por o cuando', d); continue;
        }
        insDecision.run(tipo, id, d.estado, d.por, d.cuando, d.motivo, JSON.stringify(d));
        contar('decisiones_de_personas');
      }
    }

    // Portada
    (repo.portada?.notas ?? []).forEach((n, i) => {
      if (!hayTexto(n?.id)) { rechazo('portada', String(i), 'nota sin id', n); return; }
      insPortada.run(i, n.id);
      contar('portada');
    });

    insEstado.run('esquema_version', VERSION_DEL_ESQUEMA, ahora);
    insEstado.run('importado_desde', repo.dir, ahora);
    insEstado.run('portada_generada', nulo(repo.portada?.generado), ahora);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return resumen;
}

/** Atajo: lee el repositorio y lo vuelca a la base. */
export function importar({ datos = path.join(RAIZ, 'web', 'data'), base = ':memory:', ahora } = {}) {
  const db = abrirBase(base);
  const resumen = importarADb(db, leerRepositorio(datos), { ahora });
  return { db, resumen };
}

// ------------------------------------------------- lo que sale de la base

/** Las notas tal cual estaban en archivo.json, en el mismo orden. */
export function notasDeLaBase(db) {
  return db.prepare('SELECT original FROM notas ORDER BY rowid').all().map((f) => JSON.parse(f.original));
}

/** Cuántas notas hay por sección. */
export function notasPorSeccion(db) {
  return Object.fromEntries(db.prepare('SELECT seccion, COUNT(*) AS n FROM notas GROUP BY seccion').all().map((f) => [f.seccion, f.n]));
}

// ---------------------------------------------------------------------- CLI

function main() {
  const arg = (nombre, defecto) => process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3) ?? defecto;
  const datos = path.resolve(arg('datos', path.join(RAIZ, 'web', 'data')));
  const base = path.resolve(arg('base', path.join(AQUI, 'salida', 'radar.sqlite')));
  fs.mkdirSync(path.dirname(base), { recursive: true });
  // La carpeta de salida se ignora sola en git (así no hace falta tocar el .gitignore).
  const ign = path.join(path.dirname(base), '.gitignore');
  if (path.dirname(base) === path.join(AQUI, 'salida') && !fs.existsSync(ign)) fs.writeFileSync(ign, '*\n');

  const { db, resumen } = importar({ datos, base });
  console.log(`Importado desde ${datos}\nA la base ${base}\n`);
  console.log('Cargado:');
  for (const [t, n] of Object.entries(resumen.cargadas)) console.log(`  ${t.padEnd(24)} ${n}`);
  const rech = Object.entries(resumen.rechazadas);
  if (rech.length) {
    console.log('\nRechazado (queda anotado en la tabla importacion_rechazos):');
    for (const [o, n] of rech) console.log(`  ${o.padEnd(24)} ${n}`);
  }
  db.close();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
