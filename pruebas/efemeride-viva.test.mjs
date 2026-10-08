// "Un día como hoy" enganchado al reloj y al plan (1/10/2026): todos los días que tienen su entrada, a las 9:00,
// con la locutora, y nunca se saca por el techo de historias.
process.env.TZ = 'America/Argentina/Buenos_Aires';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { efemerideDelDia, entradaCompleta, diasPreparados, HORA_EFEMERIDE } from '../redes/efemeride.mjs';
import { HISTORIAS_FIJAS, toca } from '../panel/horarios.mjs';
import { cronogramaDelDia, historiasQueSobran, EXTRAS_DE_HISTORIAS } from '../redes/piezas.mjs';
import { planDelDia } from '../reels/plan.mjs';
import { vozDePieza, VOCES } from '../redes/prompt-redes.mjs';
import { libroNuevo } from '../redes/elegir.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const A = (iso, hhmm = '09:00') => new Date(`${iso}T${hhmm}:00-03:00`);

const DATOS_PLAN = { clima: null, farmacias: { turnos: [] }, notas: [] };

test('la efeméride sale cada día que tiene su entrada preparada, y ninguno de los otros', () => {
  const e = efemerideDelDia(A('2026-10-05'));
  assert.equal(e.fecha, '2026-10-05');
  assert.equal(e.voz, 'locutora');
  assert.match(e.guion, /^Buen día, Balcarce\./);
  assert.equal(efemerideDelDia(A('2030-01-01')), null, 'sin entrada, no sale nada (no es una falla)');
  const dias = diasPreparados();
  assert.ok(dias.includes('2026-10-05') && dias.includes('2026-10-11'), 'la primera semana está preparada');
});

test('una entrada con "sale: false" o incompleta no sale', () => {
  const base = { guion: 'x', principal: { titulo: 't' }, ademas: [{ texto: 'a' }] };
  assert.equal(entradaCompleta(base), true);
  assert.equal(entradaCompleta({ ...base, sale: false }), false);
  assert.equal(entradaCompleta({ ...base, guion: '' }), false);
  assert.equal(entradaCompleta({ ...base, ademas: [] }), false);
  assert.equal(efemerideDelDia(A('2026-10-05'), { datos: { dias: { '2026-10-05': { ...base, sale: false } } } }), null);
});

test('está en los horarios fijos a las 9:00, todos los días, con la voz de la locutora', () => {
  const h = HISTORIAS_FIJAS.find((x) => x.id === 'efemeride');
  assert.equal(h.hora, '09:00');
  assert.equal(HORA_EFEMERIDE, '09:00');
  assert.equal(vozDePieza('efemeride'), VOCES.locutora);
  assert.equal(toca(h, A('2026-10-05')), true);
  assert.equal(toca(h, A('2026-10-12')), true, 'también el feriado');
  assert.equal(toca(h, A('2030-01-01')), false, 'sin entrada, no toca');
});

test('el reloj la pide a las 9:00 los días preparados', () => {
  const dia = cronogramaDelDia(A('2026-10-06'));
  const e = dia.find((p) => p.nombre === 'efemeride');
  assert.equal(e.hora, '09:00');
  assert.equal(e.tipo, 'reel', 'la efeméride sale como reel (y su historia)');
  assert.ok(!cronogramaDelDia(A('2030-01-01')).some((p) => p.nombre === 'efemeride'));
});

test('el plan arma la pieza con las dos placas, el guion y su voz', () => {
  const p = planDelDia(DATOS_PLAN, { fecha: A('2026-10-05'), estado: {}, eventos: [], libro: libroNuevo() }).piezas.find((x) => x.nombre === 'efemeride');
  assert.ok(p, 'el plan la trae');
  assert.equal(p.hora, '09:00');
  assert.equal(p.tipo, 'reel', 'es un reel (5/10, Hernán): y como todo reel se sube también como historia (redes/publicar-piezas.mjs)');
  assert.ok(p.svg.includes('1922') && p.svg2.includes('Darregueira'));
  assert.match(p.guion, /Y además, un día como hoy:/);
  assert.equal(p.momento, 'manana');
  assert.equal(p.fueraDeTecho, undefined);
  const sin = planDelDia(DATOS_PLAN, { fecha: A('2030-01-01'), estado: {}, eventos: [], libro: libroNuevo() }).piezas;
  assert.ok(!sin.some((x) => x.nombre === 'efemeride'));
});

test('la efeméride como reel no saca a ningún podcast del techo de reels ni deja de contar como historia', () => {
  const piezas = planDelDia(DATOS_PLAN, { fecha: A('2026-10-05'), estado: {}, eventos: [], libro: libroNuevo() }).piezas;
  const reels = piezas.filter((x) => x.tipo === 'reel');
  assert.ok(reels.some((x) => x.nombre === 'efemeride'));
  for (const r of reels) assert.equal(r.fueraDeTecho, undefined, `${r.nombre} se sacó por el techo`);
  assert.match(fs.readFileSync(path.join(RAIZ, 'reels', 'plan.mjs'), 'utf8'), /p\.tipo === 'reel' && NOMBRES_DE_PODCAST\.includes\(p\.nombre\)/, 'el techo de reels cuenta sólo los podcasts');
  assert.match(fs.readFileSync(path.join(RAIZ, 'reels', 'plan.mjs'), 'utf8'), /SALE_COMO_REEL\(p\.nombre\)/, 'y la efeméride cuenta para el techo de historias');
});

test('nunca se saca por el techo de historias, ni siquiera un día de feriado cargado', () => {
  assert.ok(!EXTRAS_DE_HISTORIAS.includes('efemeride'));
  // Contrato (6) + feriado + efeméride + participá = 9: sobra participá, no la efeméride.
  const nombres = ['clima-manana', 'clima-noche', 'farmacia', 'noticia1', 'noticia2', 'podcast', 'feriado', 'efemeride', 'participa-noticias'];
  assert.deepEqual(historiasQueSobran(nombres, 8), ['participa-noticias']);
  const feriado = planDelDia(DATOS_PLAN, { fecha: A('2026-10-12'), estado: {}, eventos: [], libro: libroNuevo() }).piezas;
  assert.equal(feriado.find((x) => x.nombre === 'efemeride').fueraDeTecho, undefined);
  assert.ok(feriado.find((x) => x.nombre === 'feriado'), 'el feriado sale a las 8');
});

test('el video lleva la segunda placa a mitad, cuando la voz dice "Y además", y la voz sigue siendo la del reparto', () => {
  const reel = fs.readFileSync(path.join(RAIZ, 'reels', 'reel.mjs'), 'utf8');
  assert.match(reel, /svg2 = null/);
  assert.match(reel, /concat=n=2:v=1:a=0/);
  assert.match(reel, /adem\[aá\]s/);
  assert.match(reel, /vozGemini = vozDePieza\(nombre\)/);
});
