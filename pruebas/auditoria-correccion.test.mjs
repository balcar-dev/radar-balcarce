// La auditoría con IA corrige sola la ortografía chica y segura, y la pestaña Revisión dice qué encontró y qué corrigió (2/10/2026).
// También: las listas del panel se limpian solas (Esperan a las 48 horas; Publicadas y Retiradas a las 24).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  cambioMecanico, conCambiosGuardados, distanciaDeEdicion, CORRECCION_AUTOMATICA, leerHallazgos,
} from '../ingesta/auditoria-ia.mjs';
import { correrAuditoria } from '../redes/auditar-notas.mjs';
import { cambiosDeLaAuditoria, conCambiosDeLaAuditoria } from '../web/lib/archivo.js';
import { htmlDeRevision } from '../web/public/panel/revision.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const AHORA = new Date('2026-10-02T15:00:00Z');
const CUERPO = 'El intendente anunció una obra en la plaza principal y explicó los plazos con detalle. '.repeat(3);
const nota = (extra = {}) => ({
  id: 'n1', titulo: 'Titular de la nota', copete: 'Bajada de la nota', cuerpo: `${CUERPO} La reunion será el martes. ${CUERPO}`, seccion: 'Balcarce', ruta: '/nota/n1',
  fecha: new Date(AHORA - 2 * 3600e3).toISOString(), publicadaPor: null, ...extra,
});
const orto = (cita, sugerencia) => ({ id: 'n1', tipo: 'ortografia', gravedad: 'baja', cita, detalle: 'falta la tilde', sugerencia });

test('la distancia de edición cuenta letras', () => {
  assert.equal(distanciaDeEdicion('reunion', 'reunión'), 1);
  assert.equal(distanciaDeEdicion('abc', 'abc'), 0);
  assert.equal(distanciaDeEdicion('', 'abc'), 3);
});

test('una falta chica, única y sin números se corrige sola', () => {
  assert.deepEqual(cambioMecanico(orto('reunion', 'reunión'), nota()), { campo: 'cuerpo', antes: 'reunion', despues: 'reunión' });
  assert.deepEqual(cambioMecanico(orto('anuncio', 'anunció'), nota({ titulo: 'Titular de la nota', cuerpo: `${CUERPO} anuncio` })), null, 'una tilde al final es tiempo verbal, no falta');
  assert.deepEqual(cambioMecanico(orto('cancion', 'canción'), nota({ titulo: 'Una cancion nueva' })), { campo: 'titulo', antes: 'cancion', despues: 'canción' });
});

test('no se corrige solo lo que no es seguro', () => {
  const n = nota();
  assert.equal(cambioMecanico({ ...orto('reunion', 'reunión'), tipo: 'seccion' }, n), null, 'sólo ortografía');
  assert.equal(cambioMecanico({ ...orto('reunion', 'reunión'), tipo: 'sensible' }, n), null);
  assert.equal(cambioMecanico(orto('reunion', ''), n), null, 'sin la forma correcta');
  assert.equal(cambioMecanico(orto('la reunion', 'la reunión de los vecinos del barrio Norte con el intendente'), n), null, 'un cambio grande no es una tilde');
  assert.equal(cambioMecanico(orto('plaza principal', 'Plaza Principal'), n), null, 'sólo mayúsculas: estilo o nombre propio');
  assert.equal(cambioMecanico(orto('reunion será el martes', 'reunión será el miércoles'), n), null, 'cambia una palabra, no una falta');
  assert.equal(cambioMecanico(orto('detalle', 'detalles'), n), null, 'aparece más de una vez');
  assert.equal(cambioMecanico(orto('no está en la nota', 'no esta en la nota'), n), null, 'la cita no está');
  assert.equal(cambioMecanico(orto('martes 3', 'martes 4'), nota({ cuerpo: `${CUERPO} el martes 3 ${CUERPO}` })), null, 'nunca toca un número');
  assert.equal(cambioMecanico(orto('x'.repeat(CORRECCION_AUTOMATICA.citaMaxima + 1), 'y'), n), null, 'una cita larga no se corrige sola');
  const dos = nota({ titulo: 'La reunion', cuerpo: `${CUERPO} La reunion será el martes.` });
  assert.equal(cambioMecanico(orto('reunion', 'reunión'), dos), null, 'en el título y en el cuerpo: dudoso');
});

test('el libro de lo corregido anota nota, campo y par, sin repetir y sin lo viejo', () => {
  const n = nota();
  let libro = conCambiosGuardados({}, [{ id: 'n1', campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }], [n], AHORA);
  assert.deepEqual(libro.notas.n1.cambios, [{ campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }]);
  assert.equal(libro.notas.n1.titulo, 'Titular de la nota');
  libro = conCambiosGuardados(libro, [{ id: 'n1', campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }, { id: 'n1', campo: 'titulo', antes: 'notta', despues: 'nota' }], [n], AHORA);
  assert.equal(libro.notas.n1.cambios.length, 2, 'el repetido no se suma');
  const mucho = new Date(AHORA.getTime() + 200 * 864e5);
  assert.deepEqual(conCambiosGuardados(libro, [], [], mucho).notas, {}, 'a los 190 días se va');
});

test('la web aplica el par sólo si calza una vez, y no marca la nota como revisada por la redacción', () => {
  const mapa = cambiosDeLaAuditoria({ notas: { n1: { cambios: [{ campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }, { campo: 'seccion', antes: 'a', despues: 'b' }, { campo: 'titulo', antes: '', despues: 'x' }] }, n2: { cambios: [] }, n3: null } });
  assert.deepEqual([...mapa.keys()], ['n1'], 'sólo título, bajada y cuerpo; sin vacíos');
  const n = nota();
  const r = conCambiosDeLaAuditoria(n, mapa);
  assert.ok(r.cuerpo.includes('La reunión será el martes'));
  assert.ok(!('corregidaAMano' in r) && !('deIA' in r), 'nadie de la redacción la revisó');
  assert.equal(n.cuerpo.includes('reunión'), false, 'no toca la original');
  // Si el texto cambió (se reescribió), el par ya no calza.
  assert.equal(conCambiosDeLaAuditoria(nota({ cuerpo: 'Otro texto distinto.' }), mapa).cuerpo, 'Otro texto distinto.');
  // Si aparece dos veces, no se toca.
  assert.equal(conCambiosDeLaAuditoria(nota({ cuerpo: 'reunion y reunion' }), mapa).cuerpo, 'reunion y reunion');
  assert.equal(cambiosDeLaAuditoria(null).size, 0);
  assert.strictEqual(conCambiosDeLaAuditoria(nota({ id: 'zzz' }), mapa).id, 'zzz');
});

test('una corrida corrige lo mecánico, deja lo delicado como aviso y lo cuenta', async () => {
  const respuesta = JSON.stringify({ notas: [{ id: 'n1', hallazgos: [
    { tipo: 'ortografia', gravedad: 'baja', cita: 'reunion', detalle: 'falta la tilde', sugerencia: 'reunión' },
    { tipo: 'sensible', gravedad: 'alta', cita: 'plaza principal', detalle: 'parece identificar a alguien', sugerencia: '' },
  ] }] });
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: respuesta } }] }) });
  const portada = { notas: [nota()] };
  const r = await correrAuditoria({ portada, estado: {}, llaves: [], clave: 'x', fetchFn, dormir: async () => {}, ahora: AHORA });
  assert.deepEqual(r.cambios, [{ id: 'n1', campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }]);
  assert.equal(r.hallazgos.length, 1, 'lo delicado queda para una persona');
  assert.equal(r.hallazgos[0].tipo, 'sensible');
  const hoy = Object.values(r.estado.contadores.dias)[0];
  assert.equal(hoy.corregidos, 1);
  assert.equal(hoy.hallazgos, 2);
  // Con corregir: false (simular o AUDITORIA_SIN_CORREGIR) todo queda como aviso.
  const sin = await correrAuditoria({ portada, estado: {}, llaves: [], clave: 'x', fetchFn, dormir: async () => {}, ahora: AHORA, corregir: false });
  assert.equal(sin.cambios.length, 0);
  assert.equal(sin.hallazgos.length, 2);
  assert.ok(leerHallazgos);
});

test('Revisión dice qué hizo la IA: cuántas cosas corrigió sola y cuáles deja para mirar', () => {
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const apps = { esc, haceCuanto: () => 'hace 1 h', chip: (s) => `<chip>${s}</chip>` };
  const corregidas = [{ id: 'a', titulo: 'Una <b>nota</b>', seccion: 'Balcarce', ruta: '/nota/a', cuando: '2026-10-02T14:00:00Z', cambios: [{ campo: 'cuerpo', antes: 'reunion', despues: 'reunión' }] }];
  const items = [{ id: 'b', titulo: 'Otra', seccion: 'Política', cuando: '2026-10-02T14:00:00Z', hallazgos: [{ tipo: 'sensible', gravedad: 'alta', detalle: 'nombra a un menor', sugerencia: '' }] }];
  const h = htmlDeRevision({ items, abierto: true, corregidas }, apps);
  assert.match(h, /Qué hizo la IA/);
  assert.match(h, /corrigió 1 sola/);
  assert.match(h, /dejó 1 para que mires/);
  assert.match(h, /Corregido solo \(1\)/);
  assert.match(h, /<span class="antes">reunion<\/span> → <span class="despues">reunión<\/span>/);
  assert.match(h, /Para que mires \(1\)/);
  assert.ok(!h.includes('<b>nota</b>'), 'el título se escapa');
  // Sólo lo corregido, sin nada para mirar.
  assert.match(htmlDeRevision({ items: [], abierto: true, corregidas }, apps), /lo único que encontró lo corrigió sola/);
  // Nada de nada.
  assert.match(htmlDeRevision({ items: [], abierto: true, corregidas: [] }, apps), /Nada para mirar/);
  // Un celular sin sobres igual ve lo corregido (es público).
  assert.match(htmlDeRevision({ items: [], abierto: false, corregidas }, apps), /Corregido solo/);
});

test('lo corregido solo está conectado: la web lo lee, el workflow lo guarda y el panel lo muestra', () => {
  const gen = leer('web/scripts/generar-datos.mjs');
  assert.match(gen, /const CAMBIOS_AUDITORIA = cambiosDeLaAuditoria\(leerJson\(path\.join\(AQUI, '\.\.', 'data', 'correcciones-auditoria\.json'\), null\)\);/);
  const w = leer('.github/workflows/auditoria-ia.yml');
  assert.match(w, /git add web\/data\/correcciones-auditoria\.json/);
  assert.ok(!/correcciones-auditoria/.test(leer('.github/workflows/actualizar.yml').replace(/#[^\n]*/g, '')), '"Actualizar la web" no escribe ese archivo');
  const app = leer('web/public/panel/app.js');
  assert.match(app, /ARCHIVOS\.cambiosIA/);
  assert.match(leer('web/public/panel/github.js'), /cambiosIA: 'web\/data\/correcciones-auditoria\.json'/);
});

test('las listas del panel se limpian solas: Esperan a las 48 horas; Publicadas y Retiradas a las 24', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /const HORAS_EN_ESPERAN = 48;/);
  assert.match(app, /const HORAS_RETIRADAS = 24;/);
  assert.match(app, /const HORAS_EN_PUBLICADAS = 24;/);
  assert.ok(app.includes('.filter((n) => dentroDe(n.fecha, HORAS_EN_ESPERAN))'));
  assert.ok(app.includes('E.papelera.filter((n) => dentroDe(n.retirada, HORAS_RETIRADAS))'));
  assert.ok(app.includes('dentroDe(n.fecha, HORAS_EN_ESPERAN)'), 'lo que espera cuerpo también');
});

test('el rediseño: cinco pestañas con ícono, barra de acciones fija en la nota y un solo botón principal por pantalla', () => {
  const app = leer('web/public/panel/app.js');
  const html = leer('web/public/panel/index.html');
  assert.match(app, /const ICONOS = \{/);
  assert.match(app, /function barraDeAcciones\(tipo, id, d\)/);
  assert.match(html, /\.barra-acciones \{ position: fixed;/);
  assert.match(html, /REDISEÑO DEL 2\/10/);
  assert.match(html, /\.pestanas \{ grid-template-columns: repeat\(5, 1fr\)/);
  assert.match(leer('web/public/panel/sw.js'), /radar-panel-23/);
});

// 8/10/2026: la corrección automática dejó "se contrajo 1 por ciento en en en…" (179 veces), "no competiránnnn…" (43 n), "nodocentes → docentes",
// "recaudos → recursos", "quíntuple → quintuple", "suba → subida". Sólo se corrige solo la tilde que falta, y nunca se estira un texto.
test('con los casos reales del 8/10: lo que cambia el sentido no se corrige solo', () => {
  const cuerpo = (t) => nota({ cuerpo: `${CUERPO} ${t} ${CUERPO}` });
  const casos = [
    ['nodocentes', 'docentes'], ['recaudos', 'recursos'], ['quíntuple', 'quintuple'], ['suba mensual', 'subida mensual'], ['señas', 'señales'],
    ['ligazón', 'ligación'], ['opositora', 'opositor'], ['competirá', 'competirán'], ['ciento por ciento', 'cien por ciento'], ['collar', 'colgar'],
    ['definitorias', 'definitivas'], ['arribó a la Argentina', 'arribó a Argentina'], ['seguridad de suministro', 'seguridad del suministro'],
    ['una suba de precios acumulada de 30 por ciento', 'una subirá de precios acumulada de 30 por ciento'],
  ];
  for (const [antes, despues] of casos) assert.equal(cambioMecanico(orto(antes, despues), cuerpo(antes)), null, `${antes} → ${despues}`);
  // La tilde que cambia el sentido (público / publicó) la decide una persona.
  assert.equal(cambioMecanico(orto('publico', 'público'), cuerpo('publico')), null);
  assert.equal(cambioMecanico(orto('termino', 'término'), cuerpo('termino')), null);
  // Y una palabra pegada a otra más larga no cuenta: "reunion" no está en "reuniones".
  assert.equal(cambioMecanico(orto('reunion', 'reunión'), cuerpo('reuniones')), null);
});

test('aplicar un par dos, tres o cien veces da lo mismo: el texto nunca se estira', () => {
  const mapa = cambiosDeLaAuditoria({ notas: { n1: { cambios: [{ campo: 'cuerpo', antes: 'se contrajo 1 por ciento', despues: 'se contrajo 1 por ciento en' }] } } });
  let n = nota({ cuerpo: 'El PBI se contrajo 1 por ciento el trimestre.' });
  for (let i = 0; i < 5; i += 1) n = conCambiosDeLaAuditoria(n, mapa);
  assert.equal(n.cuerpo, 'El PBI se contrajo 1 por ciento el trimestre.', 'si lo nuevo contiene a lo viejo, no se aplica');
  const mapa2 = cambiosDeLaAuditoria({ notas: { n1: { cambios: [{ campo: 'cuerpo', antes: 'competirá', despues: 'competirán' }] } } });
  let m = nota({ cuerpo: 'no competirá con candidatos' });
  for (let i = 0; i < 5; i += 1) m = conCambiosDeLaAuditoria(m, mapa2);
  assert.equal(m.cuerpo, 'no competirá con candidatos', '"competirán" contiene a "competirá": no se toca (así se estiró a 43 n)');
  // El par sólo calza con la palabra entera: "subirá" no está dentro de "subiráN".
  const mapa3 = cambiosDeLaAuditoria({ notas: { n1: { cambios: [{ campo: 'cuerpo', antes: 'subirá', despues: 'subida' }] } } });
  assert.equal(conCambiosDeLaAuditoria(nota({ cuerpo: 'ella subiráfuerte' }), mapa3).cuerpo, 'ella subiráfuerte');
});

test('lo ya publicado quedó sano: ningún texto del archivo ni de la portada tiene palabras estiradas', () => {
  for (const f of ['web/data/archivo.json', 'web/data/portada.json']) {
    const t = leer(f);
    assert.ok(!/\b(\p{L}+) \1 \1 \1\b/u.test(t), `${f}: una palabra repetida cuatro veces seguidas`);
    assert.ok(!/(\p{L})\1{6,}/u.test(t.replace(/https?:\S+/g, '')), `${f}: una letra repetida siete veces seguidas`);
  }
  // El libro de correcciones sólo guarda cambios de tilde de una palabra.
  const libro = JSON.parse(leer('web/data/correcciones-auditoria.json'));
  for (const e of Object.values(libro.notas)) for (const c of e.cambios) assert.ok(c.despues.length - c.antes.length <= 3, `${c.antes} → ${c.despues}`);
});
