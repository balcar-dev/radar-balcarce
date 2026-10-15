// El aviso del tope de archivos de Cloudflare Pages (9/10/2026): 20.000 por despliegue; avisa desde 16.500 y alerta desde 18.000, y nunca frena el armado.
// 15/10/2026: el aviso quedó por encima de lo que da el sitio lleno (tope de notas) y el tope de notas, con 20% de margen bajo los 20.000.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  contarArchivos, mensajeSegunCantidad, archivosEstimados, TOPE_DE_CLOUDFLARE, AVISO_DESDE, ALERTA_DESDE,
} from '../web/scripts/contar-archivos.mjs';
import { MAXIMO_EN_ARCHIVO } from '../web/lib/archivo.js';

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
  assert.equal(mensajeSegunCantidad(15900), null);
  assert.equal(mensajeSegunCantidad(16499), null);
  assert.equal(mensajeSegunCantidad(16500).nivel, 'warning');
  assert.equal(mensajeSegunCantidad(17999).nivel, 'warning');
  assert.equal(mensajeSegunCantidad(18000).nivel, 'error');
  assert.match(mensajeSegunCantidad(18500).texto, /R2/);
});

test('el tope de notas con página deja el sitio lleno bajo el 80% de lo que acepta Cloudflare y bajo el aviso (15/10/2026)', () => {
  const lleno = archivosEstimados(MAXIMO_EN_ARCHIVO);
  assert.ok(lleno <= TOPE_DE_CLOUDFLARE * 0.8, `con ${MAXIMO_EN_ARCHIVO} notas serían ${lleno} archivos: pasa el 80% de ${TOPE_DE_CLOUDFLARE}`);
  assert.ok(lleno < AVISO_DESDE, 'el aviso tiene que arrancar por encima del sitio lleno, o avisaría siempre');
  assert.ok(AVISO_DESDE < ALERTA_DESDE && ALERTA_DESDE < TOPE_DE_CLOUDFLARE);
  // La cuenta con las medidas del 15/10 (1.131 notas = 5.125 archivos).
  assert.ok(Math.abs(archivosEstimados(1131) - 5125) <= 100);
});
