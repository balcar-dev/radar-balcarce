// 4/10/2026 (Hernán): el repaso de la noche mostró el logo de Diario La Vanguardia como si fuera una foto. Se había sumado a mano desde el panel pegando el
// enlace de la nota: la imagen "para compartir" de ese diario es su logo. Un logo pesa muy poco (3.850 bytes; la foto más liviana del banco, 7.000).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sumarFoto } from '../web/scripts/foto-manual.mjs';
import { fotosDelRepaso } from '../web/scripts/collage.mjs';
import { PESO_MINIMO_DE_UNA_FOTO } from '../web/scripts/achicar-foto.mjs';

const respuesta = (bytes) => async () => ({ ok: true, status: 200, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => bytes });

test('una imagen que pesa como un logo no se acepta como foto de una nota', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-'));
  const logo = Buffer.alloc(3850, 7);
  await assert.rejects(
    sumarFoto({ id: 'abc123', url: 'https://example.com/logo.jpg', credito: 'Diario X', por: 'Hernán' }, { fetchFn: respuesta(Buffer.alloc(9000, 1)), achicar: async () => logo, carpeta: dir, archivo: path.join(dir, 'm.json') }),
    /parece un logo o un dibujo/,
  );
  assert.deepEqual(fs.readdirSync(dir), [], 'no deja ni la imagen ni el libro');
});

test('una foto de verdad sí se acepta', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'foto-'));
  const foto = Buffer.alloc(PESO_MINIMO_DE_UNA_FOTO + 4000, 7);
  const e = await sumarFoto({ id: 'abc123', url: 'https://example.com/foto.jpg', credito: 'Diario X', por: 'Hernán' }, { fetchFn: respuesta(Buffer.alloc(90000, 1)), achicar: async () => foto, carpeta: dir, archivo: path.join(dir, 'm.json') });
  assert.equal(e.archivo, 'fotos-notas/abc123.jpg');
});

test('el collage de un repaso se saltea una foto que pesa como un logo', () => {
  const nota = { notasDelRepaso: ['a', 'b', 'c'] };
  const banco = { a: { archivo: 'fotos-notas/a.jpg' }, b: { archivo: 'fotos-notas/b.png' }, c: { archivo: 'fotos-notas/c.jpg' } };
  const pesos = { 'a.jpg': 90000, 'b.png': 3850, 'c.jpg': 40000 };
  const fotos = fotosDelRepaso(nota, banco, '/x', { existe: () => true, peso: (r) => pesos[path.basename(r)] });
  assert.deepEqual(fotos.map((f) => f.id), ['a', 'c']);
});
