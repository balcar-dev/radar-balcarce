// El collage de los repasos (1/10/2026): una imagen con las fotos de las notas que cuenta el audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  distribucion, filtroDelCollage, argumentosDelCollage, fotosDelRepaso, creditoDelCollage, collageDeRepaso, COLLAGE,
} from '../web/scripts/collage.mjs';
import { podarFotos } from '../web/scripts/fotos-notas.mjs';

test('la distribución cubre toda la imagen sin huecos ni superposiciones, para 2, 3 y 4 fotos', () => {
  for (const n of [2, 3, 4]) {
    const cajas = distribucion(n);
    assert.equal(cajas.length, n);
    const area = cajas.reduce((s, c) => s + c.w * c.h, 0);
    assert.equal(area, COLLAGE.ancho * COLLAGE.alto, `${n} fotos`);
    for (const c of cajas) assert.ok(c.x + c.w <= COLLAGE.ancho && c.y + c.h <= COLLAGE.alto);
  }
  assert.deepEqual(distribucion(1), []);
});

test('el filtro recorta cada foto a su caja con borde blanco y las junta con xstack', () => {
  const f = filtroDelCollage(3);
  assert.match(f, /\[0:v\]scale=594:670:force_original_aspect_ratio=increase,crop=594:670/);
  assert.match(f, /xstack=inputs=3:layout=0_0\|600_0\|600_338:fill=white\[out\]/);
  const a = argumentosDelCollage(['a.jpg', 'b.jpg'], 'salida.jpg');
  assert.deepEqual(a.slice(0, 5), ['-y', '-i', 'a.jpg', '-i', 'b.jpg']);
  assert.equal(a.at(-1), 'salida.jpg');
});

test('las fotos del repaso: las de las notas que cuenta, en orden, sin repetir, sólo las que existen, hasta cuatro', () => {
  const banco = {
    a: { archivo: 'fotos-notas/a.jpg', medio: 'Gabal' }, b: { archivo: 'fotos-notas/b.jpg', medio: 'Infobae' },
    c: { intentado: true }, d: { archivo: 'fotos-notas/a.jpg', medio: 'Gabal' }, e: { archivo: 'fotos-notas/e.jpg', medio: 'Clarín' },
    f: { archivo: 'fotos-notas/f.jpg', medio: 'TN' }, g: { archivo: 'fotos-notas/g.jpg', medio: 'Olé' }, h: { archivo: 'fotos-notas/h.jpg', medio: 'Perfil' },
  };
  const existe = (r) => !/e\.jpg$/.test(r);
  const nota = { notasDelRepaso: ['a', 'c', 'd', 'b', 'e', 'f', 'g', 'h', 'sin-banco'] };
  const fotos = fotosDelRepaso(nota, banco, 'carpeta', { existe });
  assert.deepEqual(fotos.map((f) => f.id), ['a', 'b', 'f', 'g'], 'sin la que no tiene foto, la repetida, la que no existe en el disco, y no más de cuatro');
  assert.equal(creditoDelCollage(fotos), 'Fotos: Gabal, Infobae, TN y Olé');
  assert.equal(creditoDelCollage([{ medio: 'Gabal' }, { medio: 'Gabal' }]), 'Fotos: Gabal');
  assert.equal(creditoDelCollage([{ medio: null }]), 'Fotos de las notas del repaso');
});

test('collageDeRepaso: sin fotos no hay, con una se usa tal cual, con varias se arma una vez y se reutiliza; nunca lanza', async () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'collage-'));
  for (const n of ['a', 'b', 'c']) fs.writeFileSync(path.join(carpeta, `${n}.jpg`), 'x');
  const banco = Object.fromEntries(['a', 'b', 'c'].map((n) => [n, { archivo: `fotos-notas/${n}.jpg`, medio: `Medio ${n}`, credito: `Foto: Medio ${n}` }]));
  assert.equal(await collageDeRepaso({ id: 'r0', notasDelRepaso: ['x', 'y'] }, { banco, carpeta }), null);
  assert.deepEqual(await collageDeRepaso({ id: 'r1', notasDelRepaso: ['a', 'x'] }, { banco, carpeta }), { archivo: 'fotos-notas/a.jpg', credito: 'Foto: Medio a' });
  let llamadas = 0;
  const ejecutar = async (programa, args) => { llamadas += 1; fs.writeFileSync(args.at(-1), 'imagen'); };
  const nota = { id: 'repaso20261001tarde', notasDelRepaso: ['a', 'b', 'c'] };
  const r = await collageDeRepaso(nota, { banco, carpeta, ejecutar, ffmpeg: 'ffmpeg' });
  assert.deepEqual(r, { archivo: 'fotos-notas/collage-repaso20261001tarde.jpg', credito: 'Fotos: Medio a, Medio b y Medio c' });
  await collageDeRepaso(nota, { banco, carpeta, ejecutar, ffmpeg: 'ffmpeg' });
  assert.equal(llamadas, 1, 'el collage ya hecho se reutiliza');
  const falla = async () => { throw new Error('ffmpeg roto'); };
  assert.equal(await collageDeRepaso({ id: 'otro', notasDelRepaso: ['a', 'b'] }, { banco, carpeta, ejecutar: falla, ffmpeg: 'ffmpeg' }), null);
});

test('la poda del banco no borra el collage de un repaso que sigue existiendo, y sí el de uno que ya no está', () => {
  const { borrar } = podarFotos({
    banco: {}, enDisco: ['collage-repaso1.jpg', 'collage-repaso2.jpg', 'suelta.jpg'], quedan: new Set(['repaso1']),
  });
  assert.deepEqual(borrar.sort(), ['collage-repaso2.jpg', 'suelta.jpg']);
});

test('generar-datos arma el collage de cada repaso con las fotos del banco', () => {
  const g = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/scripts/generar-datos.mjs'), 'utf8');
  assert.match(g, /collageDeRepaso\(n, \{ banco: bancoDeFotos, carpeta: FOTOS_NOTAS \}\)/);
  assert.match(g, /n\.propia !== 'repaso' \|\| n\.foto/);
});
