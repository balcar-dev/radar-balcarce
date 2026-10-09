// El aviso del tope de archivos de Cloudflare Pages (9/10/2026): 20.000 por despliegue; avisa desde 14.000 y alerta desde 18.000, y nunca frena el armado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contarArchivos, mensajeSegunCantidad } from '../web/scripts/contar-archivos.mjs';

test('cuenta los archivos de toda la carpeta, sin las carpetas', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cuenta-'));
  fs.mkdirSync(path.join(d, 'a', 'b'), { recursive: true });
  fs.writeFileSync(path.join(d, 'x.txt'), '1');
  fs.writeFileSync(path.join(d, 'a', 'y.txt'), '2');
  fs.writeFileSync(path.join(d, 'a', 'b', 'z.txt'), '3');
  assert.equal(contarArchivos(d), 3);
});

test('con margen no dice nada; cerca del tope avisa; pegado al tope alerta', () => {
  assert.equal(mensajeSegunCantidad(4500), null);
  assert.equal(mensajeSegunCantidad(13999), null);
  assert.equal(mensajeSegunCantidad(14000).nivel, 'warning');
  assert.equal(mensajeSegunCantidad(17999).nivel, 'warning');
  assert.equal(mensajeSegunCantidad(18000).nivel, 'error');
  assert.match(mensajeSegunCantidad(18500).texto, /R2/);
});
