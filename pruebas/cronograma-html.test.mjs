// El cronograma como página web (1/10/2026).
process.env.TZ = 'America/Argentina/Buenos_Aires';
import test from 'node:test';
import assert from 'node:assert/strict';
import { paginaDelCronograma, datosDeLaPagina, TEMA, CORTO } from '../reels/cronograma-html.mjs';
import { cronogramaDeLaSemana } from '../redes/cronograma-semana.mjs';

const semana = cronogramaDeLaSemana('2026-10-05', 8, { conEfemeride: true, fijas: ['participa-noticias'] });
const html = paginaDelCronograma(semana);

test('la página es un solo archivo con título, pestañas por día y grilla de la semana', () => {
  assert.match(html, /^<title>Cronograma de las redes<\/title>/);
  assert.ok(html.includes('id="pestanas"') && html.includes('id="grilla"') && html.includes('role="tablist"'));
  assert.ok(!/<script src=|<link rel="stylesheet" href="(?!https:\/\/fonts\.googleapis\.com)/.test(html), 'nada de afuera salvo las tipografías de Google');
});

test('los datos llevan voz, fijas, nueva y cupo de cada día', () => {
  const d = datosDeLaPagina(semana);
  assert.equal(d.dias.length, 8);
  assert.equal(d.cupo, 10);
  const lunes = d.dias[0];
  assert.equal(lunes.corto, 'lun 5');
  assert.ok(lunes.piezas.find((p) => p.nombre === 'efemeride').nueva);
  assert.equal(lunes.piezas.find((p) => p.nombre === 'efemeride').voz, 'locutora');
  assert.ok(lunes.piezas.find((p) => p.nombre === 'participa-noticias').fija);
  assert.equal(lunes.piezas.find((p) => p.nombre === 'noticia1').voz, 'locutor');
  assert.equal(d.dias.at(-1).feriado, 'Día del Respeto a la Diversidad Cultural');
});

test('el tema de color y el nombre corto salen de la pieza', () => {
  assert.equal(TEMA('clima-noche'), 'clima');
  assert.equal(TEMA('participa-nota'), 'participa');
  assert.equal(TEMA('podcast'), 'repaso');
  assert.equal(CORTO['noticia2'], 'Repaso tarde');
});

test('los datos van como JSON seguro: un "<" no cierra el script', () => {
  const s = cronogramaDeLaSemana('2026-10-05', 1);
  s[0].piezas[0].titulo = 'Clima </script><b>';
  const h = paginaDelCronograma(s);
  assert.ok(!h.includes('</script><b>'));
});

test('el tema claro y el oscuro tienen todos sus colores definidos como variables', () => {
  assert.match(html, /:root \{[^}]*--papel: #FAF8F3/);
  assert.match(html, /prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(html, /:root\[data-theme="dark"\]/);
});
