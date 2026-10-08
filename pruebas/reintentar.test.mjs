// Los problemas de publicación quedan en el libro y se pueden reintentar sin gastar voz (1/10/2026).
// Caso real: el reel de las 10 salió, pero Instagram rechazó tres veces su historia
// ("La subida del video falló (400) Request processing failed") y quedó sin historia.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { publicarPiezas, registrarProblema, limpiarProblema, parteDe } from '../redes/publicar-piezas.mjs';
import { reintentarPieza, PARTES } from '../redes/reintentar.mjs';
import { libroNuevo } from '../redes/elegir.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
// 25/09/2026 10:40 en Balcarce (UTC-3).
const AHORA = new Date('2026-09-25T13:40:00Z');
const REEL = { nombre: 'noticia1', tipo: 'reel', hora: '10:00', titulo: 'El repaso de la mañana', archivo: 'noticia1.mp4', notaIds: ['a', 'b'], items: [] };
const CLIMA = { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', titulo: 'El clima', archivo: 'clima.mp4' };

function api({ fallaHistoria = 0, fallaReel = 0, tokenMuerto = false } = {}) {
  const subidas = [];
  let h = 0;
  let r = 0;
  const publicar = async ({ video, tipo }) => {
    if (tipo === 'STORIES') { h += 1; if (h <= fallaHistoria) throw Object.assign(new Error('La subida del video falló (400) Request processing failed'), { tokenMuerto }); }
    if (tipo === 'REELS') { r += 1; if (r <= fallaReel) throw Object.assign(new Error('Meta dijo que no'), { tokenMuerto }); }
    subidas.push({ archivo: video.toString(), tipo });
    return { id: `id-${subidas.length}` };
  };
  return { subidas, publicarVideoEnInstagram: publicar, publicarVideoEnFacebook: publicar };
}

const publicar = (a, libro, manifiesto = [REEL], destinos = ['instagram']) => publicarPiezas({
  api: a, manifiesto, libro, activo: true, destinos, esperar: async () => {}, ahora: AHORA, leerVideo: (x) => Buffer.from(x), guardar: () => {}, log: () => {},
});

// ------------------------------------------------- lo que queda en el libro

test('si la historia del reel falla las tres veces, queda anotado qué pasó (el reel igual salió)', async () => {
  const libro = libroNuevo();
  await publicar(api({ fallaHistoria: 99 }), libro);
  assert.ok(libro.instagram['2026-09-25/noticia1'], 'el reel salió');
  const p = libro.problemas['2026-09-25/noticia1/instagram/historia-del-reel'];
  assert.equal(p.parte, 'historia-del-reel');
  assert.equal(p.red, 'instagram');
  assert.match(p.error, /Request processing failed/);
  assert.ok(Date.parse(p.cuando) > 0);
});

test('si el reel falla, también queda anotado, con su parte', async () => {
  const libro = libroNuevo();
  await publicar(api({ fallaReel: 99 }), libro);
  assert.equal(libro.instagram['2026-09-25/noticia1'], undefined);
  assert.equal(libro.problemas['2026-09-25/noticia1/instagram/reel'].parte, 'reel');
});

test('cuando sale, el problema se borra', async () => {
  const libro = libroNuevo();
  registrarProblema(libro, '2026-09-25/clima-manana/instagram/historia', { pieza: 'clima-manana', red: 'instagram', parte: 'historia', error: 'x', ahora: AHORA });
  await publicar(api(), libro, [CLIMA]);
  assert.equal(libro.problemas?.['2026-09-25/clima-manana/instagram/historia'], undefined);
  assert.ok(libro.instagram['2026-09-25/clima-manana']);
});

test('el libro guarda sólo los problemas de los últimos tres días', () => {
  const libro = libroNuevo();
  registrarProblema(libro, '2026-09-10/x/instagram/reel', { pieza: 'x', red: 'instagram', parte: 'reel', error: 'viejo', ahora: new Date('2026-09-10T15:00:00Z') });
  registrarProblema(libro, '2026-09-25/y/instagram/reel', { pieza: 'y', red: 'instagram', parte: 'reel', error: 'nuevo', ahora: AHORA });
  assert.deepEqual(Object.keys(libro.problemas), ['2026-09-25/y/instagram/reel']);
  limpiarProblema(libro, '2026-09-25/y/instagram/reel');
  assert.deepEqual(libro.problemas, {});
  assert.equal(parteDe('REELS'), 'reel');
  assert.equal(parteDe('STORIES'), 'historia');
});

// ------------------------------------------------------------ el reintento

const reintentar = (a, libro, extra = {}) => reintentarPieza({
  api: a, libro, manifiesto: [{ ...REEL, archivoHistoria: 'noticia1-historia.mp4' }, CLIMA], leerVideo: (x) => Buffer.from(x), guardar: () => {}, activo: true,
  pieza: 'noticia1', red: 'instagram', parte: 'historia-del-reel', dia: '2026-09-25', ahora: AHORA, log: () => {}, esperar: async () => {}, ...extra,
});

test('reintentar la historia del reel la sube (con la versión de historia), la anota y borra el problema', async () => {
  const libro = libroNuevo();
  await publicar(api({ fallaHistoria: 99 }), libro);
  const a = api();
  const r = await reintentar(a, libro);
  assert.equal(r.ok, true);
  assert.deepEqual(a.subidas, [{ archivo: 'noticia1-historia.mp4', tipo: 'STORIES' }]);
  assert.ok(libro.historiasDeReels['instagram/2026-09-25/noticia1']);
  assert.equal(libro.problemas['2026-09-25/noticia1/instagram/historia-del-reel'], undefined);
});

test('reintentar algo que ya salió no lo publica de nuevo', async () => {
  const libro = libroNuevo();
  const a = api();
  await publicar(a, libro);
  const antes = a.subidas.length;
  await reintentar(a, libro); // la historia salió en la corrida normal
  assert.equal((await reintentar(a, libro)).mensaje, 'Ya estaba publicada: no se hizo nada.');
  assert.equal(a.subidas.length, antes);
});

test('reintentar el reel que falló lo sube entero, una sola vez', async () => {
  const libro = libroNuevo();
  await publicar(api({ fallaReel: 99 }), libro);
  const a = api();
  const r = await reintentar(a, libro, { parte: 'reel' });
  assert.equal(r.ok, true);
  assert.deepEqual(a.subidas, [{ archivo: 'noticia1.mp4', tipo: 'REELS' }]);
  assert.ok(libro.instagram['2026-09-25/noticia1']);
  assert.equal(libro.problemas['2026-09-25/noticia1/instagram/reel'], undefined);
});

test('reintentar una historia suelta', async () => {
  const libro = libroNuevo();
  const a = api();
  const r = await reintentar(a, libro, { pieza: 'clima-manana', parte: 'historia' });
  assert.equal(r.ok, true);
  assert.deepEqual(a.subidas, [{ archivo: 'clima.mp4', tipo: 'STORIES' }]);
});

test('si vuelve a fallar, lo dice, lo deja anotado y no inventa nada', async () => {
  const libro = libroNuevo();
  const r = await reintentar(api({ fallaHistoria: 99 }), libro);
  assert.equal(r.ok, false);
  assert.match(r.mensaje, /Meta no la aceptó/);
  assert.equal(libro.historiasDeReels['instagram/2026-09-25/noticia1'], undefined);
  assert.match(libro.problemas['2026-09-25/noticia1/instagram/historia-del-reel'].error, /Request processing failed/);
});

test('con el token muerto no se insiste', async () => {
  let intentos = 0;
  const a = { publicarVideoEnInstagram: async () => { intentos += 1; throw Object.assign(new Error('token'), { tokenMuerto: true }); } };
  const r = await reintentar(a, libroNuevo());
  assert.equal(intentos, 1);
  assert.match(r.mensaje, /token/i);
});

test('con las redes apagadas sólo simula', async () => {
  const a = api();
  const r = await reintentar(a, libroNuevo(), { activo: false });
  assert.equal(r.ok, true);
  assert.equal(a.subidas.length, 0);
});

test('pide cosas que existen: pieza, red y parte', async () => {
  assert.equal((await reintentar(api(), libroNuevo(), { pieza: 'no-existe' })).ok, false);
  assert.equal((await reintentar(api(), libroNuevo(), { red: 'tiktok' })).ok, false);
  assert.equal((await reintentar(api(), libroNuevo(), { parte: 'otra' })).ok, false);
  assert.equal((await reintentar(api(), libroNuevo(), { pieza: 'clima-manana', parte: 'reel' })).ok, false, 'una historia no es un reel');
  assert.equal((await reintentar(api(), libroNuevo(), { parte: 'historia' })).ok, false, 'un reel no es una historia suelta');
  assert.deepEqual(PARTES, ['reel', 'historia', 'historia-del-reel']);
});

// R-3 (8/10/2026): el reintento respeta la franja horaria de cada pieza. Caso real que se evita: subir a las 21 el clima de la mañana diciendo "buen día".
test('no se reintenta una pieza fuera de su franja ni la de otro día', async () => {
  const tarde = new Date('2026-09-25T00:30:00Z'); // 24/09 21:30 en Balcarce: ya pasó la franja del clima de la mañana (7:30 → 11:30)
  const libro = libroNuevo();
  const a = api();
  const r = await reintentar(a, libro, { pieza: 'clima-manana', parte: 'historia', ahora: new Date('2026-09-25T00:30:00Z'), dia: '2026-09-24' });
  assert.equal(r.ok, false);
  assert.match(r.mensaje, /Ya pasó la franja/);
  const r2 = await reintentar(a, libro, { pieza: 'clima-manana', parte: 'historia', ahora: new Date('2026-09-25T23:40:00Z') });
  assert.equal(r2.ok, false, 'a las 20:40 el clima de la mañana tampoco sale');
  assert.match(r2.mensaje, /Ya pasó la franja/);
  const r3 = await reintentar(a, libro, { ahora: tarde });
  assert.equal(r3.ok, false, 'el día pedido ya no es hoy');
  assert.match(r3.mensaje, /lo de un día no sale otro día/);
  assert.equal(a.subidas.length, 0, 'no subió nada');
  const dentro = await reintentar(a, libro, { pieza: 'clima-manana', parte: 'historia' }); // 10:40, dentro de su franja
  assert.equal(dentro.ok, true);
  assert.equal(a.subidas.length, 1);
});

// ------------------------------------------------------------ el workflow

test('el workflow comparte el candado con las redes, usa el video guardado y no pide voz', () => {
  const y = leer('.github/workflows/reintentar.yml');
  assert.match(y, /group: redes/);
  assert.match(y, /cancel-in-progress: false/);
  assert.match(y, /node redes\/reintentar\.mjs/);
  assert.match(y, /startswith\("piezas-"\)/);
  assert.match(y, /run-name: .*marca/);
  assert.ok(!/GEMINI/.test(y), 'no usa la voz');
  assert.match(y, /META_TOKEN: \$\{\{ secrets\.META_TOKEN \}\}/);
  assert.match(y, /git add web\/data\/redes\.json/);
});

test('"Redes" guarda los videos tres días: de ahí sale el reintento', () => {
  const y = leer('.github/workflows/redes.yml');
  assert.match(y, /name: piezas-\$\{\{ github\.run_id \}\}/);
  assert.match(y, /retention-days: 3/);
});
