// Que lo que generamos tenga las medidas que piden las redes.
// (La vigencia de los datos —que no estén viejos— NO se prueba acá: una prueba
// que falla por el calendario frenaría la web. Eso lo avisa la auditoría.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FORMATOS, VERIFICADO, VIGENCIA_DIAS, sinConfirmar, diasDesdeVerificado, hayQueVolverAVerificar, medidaDePng,
} from '../redes/formatos.mjs';
import { ANCHO, ALTO } from '../reels/placa.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

test('cada formato tiene ancho, alto y una proporción que coincide', () => {
  for (const [red, formatos] of Object.entries(FORMATOS)) {
    for (const [nombre, f] of Object.entries(formatos)) {
      if (!f.ancho) continue; // el ícono tiene varios tamaños
      const [a, b] = f.proporcion.split(':').map(Number);
      assert.ok(Math.abs(f.ancho / f.alto - a / b) < 0.03, `${red}.${nombre}: ${f.ancho}x${f.alto} no es ${f.proporcion}`);
    }
  }
});

test('las historias y los podcasts se arman en el formato vertical 9:16 que piden las redes', () => {
  assert.equal(ANCHO, FORMATOS.instagram.historia.ancho);
  assert.equal(ALTO, FORMATOS.instagram.historia.alto);
  assert.equal(ANCHO, FORMATOS.facebook.reel.ancho);
  assert.equal(ALTO, FORMATOS.facebook.reel.alto);
});

test('la tarjeta de Instagram tiene la medida del posteo de Instagram', () => {
  const t = leer('web/lib/tarjeta.js');
  const m = t.match(/TAMANO_INSTAGRAM = \{ width: (\d+), height: (\d+) \}/);
  assert.equal(Number(m[1]), FORMATOS.instagram.posteo.ancho);
  assert.equal(Number(m[2]), FORMATOS.instagram.posteo.alto);
});

test('la tarjeta para compartir enlaces tiene la medida de Facebook y de la web', () => {
  const t = leer('web/lib/tarjeta.js');
  const m = t.match(/export const TAMANO = \{ width: (\d+), height: (\d+) \}/);
  assert.equal(Number(m[1]), FORMATOS.facebook.enlace.ancho);
  assert.equal(Number(m[2]), FORMATOS.facebook.enlace.alto);
  assert.equal(FORMATOS.web.compartir.ancho, FORMATOS.facebook.enlace.ancho);
});

test('la zona segura del posteo de Instagram cabe dentro del posteo', () => {
  const { ancho, alto, zonaSegura } = FORMATOS.instagram.posteo;
  assert.ok(zonaSegura.ancho <= ancho && zonaSegura.alto <= alto);
});

test('el texto de la tarjeta de Instagram no sale de la zona segura del centro', () => {
  // El relleno de arriba y abajo tiene que ser al menos lo que se recorta en la
  // grilla cuadrada: (1350 - 1080) / 2 = 135 px.
  const { alto, zonaSegura } = FORMATOS.instagram.posteo;
  const recorte = (alto - zonaSegura.alto) / 2;
  const t = leer('web/lib/tarjeta.js');
  const m = t.match(/instagram \? '(\d+)px (\d+)px (\d+)px'/);
  assert.ok(Number(m[1]) >= recorte, `arriba deja ${m[1]}px y la grilla recorta ${recorte}px`);
  assert.ok(Number(m[3]) >= recorte, `abajo deja ${m[3]}px y la grilla recorta ${recorte}px`);
});

test('los íconos del sitio tienen las medidas que se declaran', () => {
  for (const t of FORMATOS.web.icono.png) {
    const m = medidaDePng(fs.readFileSync(path.join(RAIZ, `web/public/icon-${t}.png`)));
    assert.deepEqual(m, { ancho: t, alto: t }, `icon-${t}.png`);
  }
  assert.deepEqual(medidaDePng(fs.readFileSync(path.join(RAIZ, 'web/public/apple-touch-icon.png'))), { ancho: FORMATOS.web.icono.apple, alto: FORMATOS.web.icono.apple });
});

test('medidaDePng lee bien un PNG y rechaza lo que no lo es', () => {
  const png = Buffer.alloc(24); png.write('\x89PNG', 0, 'latin1'); png.writeUInt32BE(1080, 16); png.writeUInt32BE(1350, 20);
  assert.deepEqual(medidaDePng(png), { ancho: 1080, alto: 1350 });
  assert.equal(medidaDePng(Buffer.from('no soy un png en absoluto, para nada')), null);
});

test('la fecha de verificación es una fecha, y el aviso de vencimiento funciona', () => {
  assert.match(VERIFICADO, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(hayQueVolverAVerificar(new Date(`${VERIFICADO}T12:00:00Z`)), false);
  const pasado = new Date(new Date(`${VERIFICADO}T12:00:00Z`).getTime() + (VIGENCIA_DIAS + 2) * 86400000);
  assert.equal(hayQueVolverAVerificar(pasado), true);
  assert.equal(diasDesdeVerificado(pasado), VIGENCIA_DIAS + 2);
});

test('lo que no se pudo confirmar queda listado para volver a mirarlo', () => {
  const s = sinConfirmar();
  assert.ok(s.includes('facebook.portada'));
  assert.ok(s.every((x) => /^(instagram|facebook|web)\./.test(x)));
});

// ---------------------------------------------------------------- la auditoría

import { evaluarAuditoria, auditoriaVencida } from '../redes/auditar.mjs';
import { evaluar } from '../redes/vigilar.mjs';

const OK = { nombre: 'instagram-posteo', url: 'u', estado: 200, medida: { ancho: 1080, alto: 1350 }, esperada: { ancho: 1080, alto: 1350 } };
const HOY = new Date(`${VERIFICADO}T15:00:00Z`);
const claves = (ps) => ps.map((p) => p.clave);

test('auditoría: una imagen con la medida correcta no da problemas', () => {
  assert.ok(!claves(evaluarAuditoria({ ahora: HOY, imagenes: [OK] })).includes('imagen-instagram-posteo'));
});

test('auditoría: avisa si una imagen mide distinto, no responde o no es PNG', () => {
  const mal = evaluarAuditoria({
    ahora: HOY,
    imagenes: [
      { ...OK, medida: { ancho: 1080, alto: 1080 } },
      { ...OK, nombre: 'b', estado: 404, medida: null },
      { ...OK, nombre: 'c', medida: null },
    ],
  });
  assert.deepEqual(claves(mal).filter((c) => c.startsWith('imagen-')), ['imagen-instagram-posteo', 'imagen-b', 'imagen-c']);
  assert.match(mal[0].texto, /1080x1080.*1080x1350/);
});

test('auditoría: avisa si falta un archivo o el SEO en vivo falla', () => {
  const ps = evaluarAuditoria({ ahora: HOY, archivos: [{ url: '/favicon.ico', estado: 404 }], seo: 1 });
  assert.ok(claves(ps).includes('archivo-/favicon.ico') && claves(ps).includes('seo'));
  assert.ok(!claves(evaluarAuditoria({ ahora: HOY, seo: 0 })).includes('seo'));
});

test('auditoría: avisa cuando las medidas de las redes quedan viejas', () => {
  const tarde = new Date(HOY.getTime() + (VIGENCIA_DIAS + 5) * 86400000);
  assert.ok(claves(evaluarAuditoria({ ahora: tarde })).includes('formatos-viejos'));
  assert.ok(!claves(evaluarAuditoria({ ahora: HOY })).includes('formatos-viejos'));
});

test('el vigilante avisa si la auditoría semanal dejó de correr', () => {
  const base = { ahora: HOY, web: { estado: 200, actualizado: HOY.toISOString() } };
  const vieja = { fecha: new Date(HOY.getTime() - 12 * 86400000).toISOString() };
  const reciente = { fecha: new Date(HOY.getTime() - 3 * 86400000).toISOString() };
  assert.ok(claves(evaluar({ ...base, auditoria: vieja })).includes('auditoria-vencida'));
  assert.ok(!claves(evaluar({ ...base, auditoria: reciente })).includes('auditoria-vencida'));
  assert.equal(auditoriaVencida(null, HOY), false, 'todavía no corrió nunca: no se avisa');
});
