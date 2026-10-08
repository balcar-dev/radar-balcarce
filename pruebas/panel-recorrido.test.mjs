// El recorrido de una nota en el panel del celular (8/10/2026). Puras, sin red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pasosDeLaNota, htmlDelRecorrido } from '../web/public/panel/recorrido.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const horaEnBalcarce = (iso) => new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

test('una nota que esperó, la escribió la IA, la aprobó una persona y salió en la web y en Facebook, en orden', () => {
  const pasos = pasosDeLaNota({
    nota: { visto: '2026-10-08T13:42:00Z', fecha: '2026-10-08T16:00:00Z' },
    medios: ['Municipio', 'La Vanguardia', 'Radio Balcarce'],
    motivoExplicado: 'necesita ojo humano: "corte"',
    borrador: { cuando: Date.parse('2026-10-08T15:31:00Z'), pedido: 'que empiece por el horario', marcas: 0 },
    decision: { estado: 'publicada', por: 'Hernán', cuando: '2026-10-08T15:40:00Z', cambioElTitulo: true },
    salioEnLaWeb: true,
    facebook: { cuando: '2026-10-08T18:10:00Z' },
    instagram: null,
  }, { horaEnBalcarce });
  assert.deepEqual(pasos.map((p) => p.titulo), ['Entró de 3 medios', 'Esperó a una persona', 'La IA escribió un borrador', 'Hernán la aprobó', 'Salió en la web', 'Salió en Facebook']);
  assert.equal(pasos[0].detalle, 'Municipio, La Vanguardia, Radio Balcarce');
  assert.equal(pasos[0].hora, '10:42');
  assert.equal(pasos[4].hora, '', 'la hora de la nota es la de la fuente: no se muestra como hora de salida');
  assert.equal(pasosDeLaNota({ nota: { fecha: '2026-10-08T16:00:00Z' }, medios: ['A'] }, { horaEnBalcarce })[0].hora, '', 'sin "visto" tampoco se inventa la hora de entrada');
  assert.match(pasos[2].detalle, /pedido: “que empiece por el horario” · el verificador no marcó nada/);
  assert.equal(pasos[3].detalle, 'cambió el título');
});

test('lo que no se sabe no se inventa: sin datos no hay recorrido', () => {
  assert.deepEqual(pasosDeLaNota({}, { horaEnBalcarce }), []);
  assert.equal(htmlDelRecorrido([], { esc }), '');
  const sola = pasosDeLaNota({ nota: { fecha: '2026-10-08T16:00:00Z' }, medios: ['A'], salioEnLaWeb: true, salioSola: true, escritaPorIA: true }, { horaEnBalcarce });
  assert.deepEqual(sola.map((p) => p.titulo), ['Entró de un medio', 'La escribió la IA', 'Salió en la web']);
  assert.equal(sola[2].detalle, 'sola, sin que nadie la tocara');
});

test('descartada, retirada y en la cola de las redes', () => {
  const t = (d) => pasosDeLaNota(d, { horaEnBalcarce }).map((p) => p.titulo);
  assert.ok(t({ decision: { estado: 'descartada', por: 'Andrés', cuando: '2026-10-08T15:00:00Z' } }).includes('Andrés la descartó'));
  assert.ok(t({ decision: { estado: 'bloqueada', cuando: '2026-10-08T15:00:00Z' } }).includes('Una persona la retiró de la web'));
  const cola = pasosDeLaNota({ nota: { fecha: '2026-10-08T16:00:00Z' }, salioEnLaWeb: true, marcadaParaRedes: true }, { horaEnBalcarce });
  assert.equal(cola.at(-1).titulo, 'Está en la cola de las redes', 'lo que todavía no pasó va al final');
});

test('el HTML escapa y viene plegado, y la nota lo muestra', () => {
  const h = htmlDelRecorrido(pasosDeLaNota({ medios: ['<b>X</b>'], nota: { visto: '2026-10-08T13:00:00Z' } }, { horaEnBalcarce }), { esc });
  assert.match(h, /<details class="que-es recorrido"><summary>Su recorrido<\/summary>/);
  assert.ok(!h.includes('<b>X'));
  const app = leer('web/public/panel/app.js');
  assert.match(app, /\$\{recorridoDeLaNota\(tipo, id, n, d\)\}/);
  assert.match(leer('web/public/panel/sw.js'), /'\/panel\/recorrido\.js'/);
});
