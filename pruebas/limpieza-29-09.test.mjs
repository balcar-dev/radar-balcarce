// La limpieza del 29/09: lo que se sacó por no usarse y lo que se achicó.
// Cada prueba cuida que no vuelva.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { aligerarViejas, DIAS_CON_ANALISIS } from '../web/lib/archivo.js';
import { vaALaWeb, DIAS_DE_TEXTOS_DE_LA_IA } from '../panel/notas.mjs';

const leer = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const existe = (f) => fs.existsSync(new URL(`../${f}`, import.meta.url));

test('el archivo guarda sólo lo que ve el lector en las notas de más de unos días', () => {
  const ahora = Date.parse('2026-09-29T20:00:00Z');
  const vieja = {
    id: 'v', titulo: 'T', fecha: '2026-09-20T10:00:00Z', cuerpo: 'C', etiquetas: ['a'], guion: 'G',
    claves: ['x'], seSabe: ['x'], noConfirmado: ['x'], antecedentes: [{ id: 'z' }], verificacion: { nivel: 'ALTA' }, textoRedes: 'x',
    fuentesConsultadas: [{ medio: 'M', enlace: 'https://m', fecha: 'f', oficial: false, aporte: 'largo' }],
  };
  const nueva = { ...vieja, id: 'n', fecha: '2026-09-28T10:00:00Z' };
  const [a, b] = aligerarViejas([vieja, nueva], { ahora });
  assert.deepEqual(Object.keys(a).sort(), ['cuerpo', 'etiquetas', 'fecha', 'fuentesConsultadas', 'guion', 'id', 'titulo']);
  assert.deepEqual(a.fuentesConsultadas, [{ medio: 'M', enlace: 'https://m' }]);
  assert.equal(b, nueva, 'la de hace un día queda entera: la reescritura todavía la puede usar');
  assert.ok(DIAS_CON_ANALISIS * 24 > 72, 'tiene que ser más que lo que dura una nota en la ingesta');
});

test('del panel de la PC se exporta sólo lo que decide una persona y los textos recientes de la IA', () => {
  const ahora = Date.parse('2026-09-29T20:00:00Z');
  assert.equal(vaALaWeb({ estado: 'descartada', por: 'Andrés', cuando: '2026-09-01T00:00:00Z' }, ahora), true);
  assert.equal(vaALaWeb({ estado: 'automatica', por: 'ia', cuando: '2026-09-29T10:00:00Z', cuerpo: 'x' }, ahora), true);
  assert.equal(vaALaWeb({ estado: 'automatica', por: 'ia', cuando: '2026-09-20T10:00:00Z', cuerpo: 'x' }, ahora), false);
  assert.equal(vaALaWeb({ estado: 'automatica', por: 'ia', cuando: '2026-09-29T10:00:00Z' }, ahora), false, 'sin cuerpo no le sirve a nadie');
  assert.equal(DIAS_DE_TEXTOS_DE_LA_IA, 3);
  assert.ok(leer('web/data/decisiones.json').length < 200_000, 'decisiones.json volvió a crecer');
});

test('no vuelve lo que se sacó por no usarse (29/09)', () => {
  assert.ok(!existe('reels/cortina.mjs'), 'la cortina (sonaba a pitido) volvió');
  assert.ok(!existe('web/scripts/achicar-fotos-existentes.mjs'), 'volvió una migración que ya se corrió');
  assert.ok(!existe('web/fuentes'), 'volvió la copia de las tipografías');
  assert.doesNotMatch(leer('reels/reel.mjs'), /musica|cortina\.mjs/);
  assert.doesNotMatch(leer('web/components/hoy-balcarce.js'), /nombresDeTurno|function hoyEnBalcarce/);
});

test('la página de Facebook tiene un solo identificador, en un solo lugar', () => {
  for (const f of ['redes/publicar.mjs', 'redes/estadisticas.mjs', 'redes/auditar-redes.mjs', 'redes/ver-facebook.mjs']) {
    assert.doesNotMatch(leer(f), /1254237411116171|META_PAGINA_ID/, `${f} tiene el identificador escrito`);
  }
  assert.match(leer('redes/meta.mjs'), /export const PAGINA_DE_FACEBOOK = process\.env\.META_PAGE_ID \|\| '1254237411116171'/);
});
