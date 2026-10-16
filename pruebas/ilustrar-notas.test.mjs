// Regla 182 (16/10/2026, Hernán: "todas las notas de las últimas 24 horas que no tengan foto, generarles una con Cloudflare; revisar que no
// sea nada raro; y que no gaste ni un dólar de más"). web/scripts/ilustrar-notas.mjs y su workflow manual, en dos pasos (revisar y aplicar),
// y cómo generar-datos usa web/data/fotos-ia.json (prioridad más baja). Sin red: Gemini y el Worker de Cloudflare son simulados.
// Lo más importante: los casos REALES que se tienen que saltar (menores, víctimas, muertes, sepelios, policiales, política, deportistas).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  motivoParaSaltar, elegirCandidatas, idsPedidos, horasPedidas, aplicadasHoy, generadasHoy, cupoDeLaCorrida, leerCuentas, armarInstruccion,
  promptFinal, problemaDelPrompt, interpretarControl, pedidoAlWorker, llamarAlWorker, revisar, aplicar, entradaDeIlustracion, neuronasEstimadas,
  figurasConocidas, TOPE_POR_CORRIDA, TOPE_POR_DIA, REINTENTOS_POR_IMAGEN, NEURONAS_GRATIS_POR_DIA, AGREGADO, NEGATIVO, PROMPT_DE_HERNAN,
  PROMPT_MAXIMO, MODELO, ANCHO, ALTO, PASOS, URL_DEL_WORKER,
} from '../web/scripts/ilustrar-notas.mjs';
import {
  conFotosDelBanco, podarFotos, ilustracionPermitida, esIlustracionDeNota, CREDITO_ILUSTRACION,
} from '../web/scripts/fotos-notas.mjs';
import { semaforoDelTexto } from '../ingesta/ingesta.mjs';
import { conCreditoDeFoto } from '../redes/elegir.mjs';
import { contenidoDeLaNota, itemDeLaNota } from '../web/lib/rss.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\r\n/g, '\n');
const nota = (id, titulo, seccion, extra = {}) => ({ id, titulo, seccion, copete: '', cuerpo: '', como: 'automatica', publicadaPor: null, ...extra });

// ------------------------------------------------------------ lo que se salta

test('casos reales que se SALTAN: Policiales, Política, chicos, muertes, sepelios, policiales y judiciales, accidentes', () => {
  const casos = [
    [nota('1nsbz', 'Un ex jefe policial de Balcarce analiza un fallo judicial', 'Policiales'), /Policiales/],
    [nota('9nw59b', 'El Municipio impulsa un plan de obras públicas en salud, educación y caminos', 'Política'), /Política/],
    [nota('1f8plkr', 'El Cementerio Municipal actualiza sus horarios desde el lunes 26 de octubre', 'Balcarce'), /muerte/],
    [nota('uknghh', 'Famosos despiden con emotivos mensajes al cantautor Piero tras su fallecimiento', 'Cultura y agenda'), /muerte|semáforo/],
    [nota('lf9d6b', 'La Escuela Municipal de Básquet juega una nueva fecha', 'Deportes'), /chicos/],
    [nota('wm8hav', 'El Concejo Deliberativo Estudiantil cierra su quinta edición con 25 iniciativas', 'Balcarce'), /chicos/],
    [nota('1uwpmsg', 'Kevin Gómez visita la Escuela Primaria número 8 y dialoga con los alumnos', 'Balcarce'), /chicos|semáforo/],
    [nota('6vefne', 'UATRE Balcarce abre la inscripción para útiles escolares', 'Balcarce'), /chicos/],
    [nota('cq95nc', 'La madre de Gaspi recuerda al influencer a cuatro meses del accidente', 'Argentina'), /accidente/],
    [nota('x1', 'El Comando de Prevención Rural intercepta maquinaria agrícola en El Verano', 'Balcarce'), /policial o judicial/],
    [nota('x2', 'La Provincia y las distribuidoras apelan el fallo que frenó las tarifas', 'Balcarce'), /policial o judicial/],
    [nota('u0hcbv', 'Ariel Bilbao asume como juez en las finales de los Juegos Bonaerenses', 'Balcarce'), /judicial/],
    [nota('x3', 'Sepelios del día en Balcarce', 'Balcarce'), /nunca se publica/],
    [nota('x4', 'Charla abierta sobre prevención del suicidio en el Concejo', 'Balcarce'), /semáforo rojo/],
    [nota('x5', 'Una chica de 16 años gana el certamen provincial de canto', 'Cultura y agenda'), /semáforo|chicos/],
    [nota('x6', 'Detuvieron a dos hombres por el robo de cables en la ruta', 'Balcarce'), /semáforo|policial/],
    [nota('x7', 'Una vecina denunció penalmente a una inmobiliaria', 'Balcarce'), /semáforo|policial/],
    [nota('x8', 'Abuso en un club: la causa avanza', 'Deportes'), /semáforo|abuso/],
  ];
  for (const [n, motivo] of casos) {
    const m = motivoParaSaltar(n);
    assert.ok(m, `${n.titulo} tenía que saltarse`);
    assert.match(m, motivo, `${n.titulo}: ${m}`);
  }
});

test('casos reales que se SALTAN: política con nombre propio, figuras conocidas y deportistas nombrados', () => {
  const casos = [
    nota('11ahvrq', 'Milei niega que la economía entre en recesión', 'Economía', { copete: 'Javier Milei negó que la Argentina esté por entrar en recesión.' }),
    nota('gy4i31', 'Franco Colapinto pide frenar los ataques de sus fanáticos en la Fórmula 1', 'Automovilismo'),
    nota('ny562k', 'Lautaro Martínez sufre un desgarro muscular y frena su actividad por un mes y medio', 'Fútbol'),
    nota('vt870i', 'Ángela Servín sube al podio en la Atlántica Ultra', 'Deportes'),
    nota('9s0dkq', 'Flavio Briatore presenta al nuevo director técnico de Alpine', 'Automovilismo'),
    nota('y1', 'Kevin Gómez busca el título argentino supermediano', 'Balcarce'),
    nota('y2', 'El intendente Esteban Reino recorrió las obras del hospital', 'Balcarce'),
    nota('y3', 'Werner gana en Paraná y se acerca a la punta', 'Automovilismo'),
  ];
  for (const n of casos) assert.ok(motivoParaSaltar(n), `${n.titulo} tenía que saltarse`);
  assert.deepEqual(figurasConocidas('Javier Milei y Luis Caputo en París'), ['Milei', 'Caputo']);
  assert.deepEqual(figurasConocidas('El Festival Cervantino de Azul'), []);
});

test('se saltan: lo que no es verde, lo que publicó una persona, las notas propias y lo que ya tiene foto o ilustración', () => {
  const base = nota('z1', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce');
  assert.equal(motivoParaSaltar(base), null);
  assert.match(motivoParaSaltar({ ...base, semaforo: 'amarillo' }), /semáforo amarillo/);
  assert.match(motivoParaSaltar({ ...base, publicadaPor: 'Hernán', como: 'publicada' }), /persona/);
  assert.match(motivoParaSaltar({ ...base, publicadaPor: 'Andrés' }), /persona/);
  assert.equal(motivoParaSaltar({ ...base, publicadaPor: 'ia' }), null, 'la lectura con IA nunca destraba: sigue siendo verde');
  for (const propia of ['clima', 'dolar', 'repaso', 'efemeride', 'pista', 'f1', 'futbol']) assert.match(motivoParaSaltar({ ...base, propia }), /nota propia/);
  assert.match(motivoParaSaltar({ ...base, foto: { archivo: 'fotos-notas/z1.jpg', credito: 'Foto: Municipalidad' } }), /ya tiene foto/);
  assert.match(motivoParaSaltar(base, { banco: { z1: { archivo: 'fotos-notas/z1.jpg' } } }), /banco/);
  assert.equal(motivoParaSaltar(base, { banco: { z1: { intentado: true, razon: 'sin fotos para comparar' } } }), null, 'probada sin foto: sí');
  assert.match(motivoParaSaltar(base, { manuales: { z1: { archivo: 'fotos-notas/z1-2.jpg' } } }), /persona/);
  assert.match(motivoParaSaltar(base, { ilustraciones: { z1: { archivo: 'fotos-notas/z1-ia.jpg' } } }), /ilustración/);
  assert.match(motivoParaSaltar({ titulo: 'x' }), /id/);
});

test('casos reales que PASAN: notas de servicio, economía, agro, cultura y deportes sin nadie nombrado', () => {
  const casos = [
    nota('aa5npj', 'El Ministerio de Transporte bonaerense actualiza las tarifas de la VTV', 'Balcarce'),
    nota('skmago', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce'),
    nota('17p6j6l', 'El Centro de Tenis de Mesa suma mesas de nivel internacional', 'Deportes'),
    nota('107aa47', 'Atletas de AACYC completan exigente competencia de trail', 'Deportes'),
    nota('a1', 'La Liga Balcarceña inicia el torneo Clausura con partidos a las 16', 'Fútbol'),
    nota('a2', 'El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía'),
    nota('a3', 'Un gallo bataraz se vende a $3.020.000 en Bolívar, un récord en el país', 'Agro'),
    nota('601x8n', 'La Fiesta Nacional del Postre evalúa su paso para noviembre', 'Cultura y agenda'),
    nota('azul', 'El Festival Cervantino de Azul cumple 20 años con más de 50 actividades', 'Cultura y agenda', {
      copete: 'Del 23 de octubre al 1 de noviembre, la ciudad bonaerense de Azul reúne teatro, música, muestras, conferencias y presentaciones editoriales; abre el Sindicato Argentino de Boleros y cierra Teresa Parodi.',
    }),
  ];
  for (const n of casos) assert.equal(motivoParaSaltar(n), null, `${n.titulo} tenía que pasar`);
});

test('elegirCandidatas: sólo la portada de las últimas horas, las más nuevas primero; con ids, ésas (también del archivo) y sin mirar la hora', () => {
  const ahora = new Date('2026-10-16T15:00:00Z');
  const hace = (h) => new Date(ahora.getTime() - h * 3_600_000).toISOString();
  const portada = [
    nota('p1', 'Las farmacias difunden el cronograma de turnos para toda la semana', 'Balcarce', { fecha: hace(2) }),
    nota('p2', 'El riesgo país sube y las acciones registran caídas en la bolsa', 'Economía', { fecha: hace(10) }),
    nota('p3', 'La Fiesta Nacional del Postre evalúa su paso para noviembre', 'Cultura y agenda', { fecha: hace(30) }),
    nota('p4', 'Choque frontal en la Ruta 226', 'Policiales', { fecha: hace(1) }),
  ];
  const archivo = [nota('v1', 'Un gallo bataraz se vende a $3.020.000 en Bolívar, un récord en el país', 'Agro', { fecha: hace(200) })];
  const r = elegirCandidatas({ portada, archivo, horas: 24, ahora });
  assert.deepEqual(r.candidatas.map((n) => n.id), ['p1', 'p2']);
  assert.deepEqual(r.saltadas.map((s) => s.id), ['p4']);
  const conIds = elegirCandidatas({ portada, archivo, ids: ['v1', 'p3', 'nnn'], ahora });
  assert.deepEqual(conIds.candidatas.map((n) => n.id).sort(), ['p3', 'v1']);
  assert.match(conIds.saltadas.find((s) => s.id === 'nnn').motivo, /no está/);
  assert.deepEqual(idsPedidos(' abc12, DEF34;ghi56  x, ../malo'), ['abc12', 'def34', 'ghi56']);
  assert.equal(horasPedidas('24'), 24);
  assert.equal(horasPedidas('500'), 72);
  assert.equal(horasPedidas('cualquier cosa'), 24);
  assert.equal(horasPedidas('0'), 24);
});

// ------------------------------------------------------------------ el prompt

test('el pedido a Gemini es el de Hernán (el mismo de probar-imagen-nota) con la nota, y pide un prompt sin nombres ni chicos', () => {
  assert.ok(leer('redes/probar-imagen-nota.mjs').includes(PROMPT_DE_HERNAN), 'el pedido de Hernán es el mismo en los dos archivos');
  for (const pedido of ['No debe aparecer ninguna persona', 'bodegón', 'superficie de trabajo', 'desgaste por uso', 'logotipos', 'bokeh', 'archivo de diario']) assert.ok(PROMPT_DE_HERNAN.includes(pedido), pedido);
  const i = armarInstruccion(nota('n1', 'El Festival Cervantino de Azul cumple 20 años', 'Cultura y agenda', { copete: 'Bajada', cuerpo: 'Cuerpo '.repeat(1000) }));
  assert.ok(i.startsWith(PROMPT_DE_HERNAN));
  assert.match(i, /INGLÉS/);
  assert.match(i, /Stable Diffusion XL/);
  assert.match(i, /NUNCA escribas nombres de personas/);
  assert.match(i, /Nada de chicos/);
  assert.match(i, /El Festival Cervantino de Azul cumple 20 años/);
  assert.ok(i.length < PROMPT_DE_HERNAN.length + 4500, 'el cuerpo va recortado');
});

test('el prompt final lleva siempre el agregado, entra en el Worker y se limpia', () => {
  const p = promptFinal('"Candid photojournalistic close-up still life of a worn wooden desk with a blank notebook,\nsoft window light, no people, no text, no logos."');
  assert.ok(p.endsWith(`, ${AGREGADO}`));
  assert.ok(!/["\n]/.test(p));
  assert.equal(AGREGADO, 'blank paper, no writing, no letters, no signs, no logos, no people');
  const largo = promptFinal(`Candid photojournalistic close-up still life of ${'old tools and '.repeat(100)}a table`);
  assert.ok(largo.length <= PROMPT_MAXIMO && largo.endsWith(AGREGADO));
  assert.equal(promptFinal(''), '');
});

test('el prompt de Gemini se descarta si describe personas, chicos, armas o sangre, o si nombra a alguien de la nota; "no people" está bien', () => {
  const n = nota('azul', 'El Festival Cervantino cierra con Teresa Parodi', 'Cultura y agenda');
  const bien = 'Candid photojournalistic close-up still life of a worn theatre script on blank paper and a guitar, blurred stage lights, no people, no text, no logos, without any faces';
  assert.equal(problemaDelPrompt(promptFinal(bien), n), null);
  for (const [malo, dice] of [
    ['Candid photojournalistic close-up still life of a desk with a child drawing and crayons, warm light', /child/],
    ['Candid photojournalistic close-up still life of a table with a knife and blood stains, harsh light', /knife|blood/],
    ['Candid photojournalistic close-up still life of a guitar that belongs to Teresa Parodi on a wooden stage', /Parodi/],
    ['Candid photojournalistic close-up still life of hands holding a microphone on a stage', /hands/],
    ['Candid photojournalistic close-up still life of toys on a school desk', /toys/],
    ['corto', /corto/],
  ]) assert.match(problemaDelPrompt(malo, n) ?? '', dice, malo);
});

test('el control de la imagen terminada sólo pasa si TODO vino en false; una clave que falta o un texto no es un sí', () => {
  const bien = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'una guitarra sobre una mesa' };
  assert.deepEqual(interpretarControl(bien), { ok: true, motivo: null, razon: 'una guitarra sobre una mesa' });
  for (const k of ['personas', 'rostros', 'texto', 'logos', 'sensible', 'raro']) {
    assert.equal(interpretarControl({ ...bien, [k]: true }).ok, false, k);
    const sin = { ...bien }; delete sin[k];
    assert.equal(interpretarControl(sin).ok, false, `sin ${k}`);
    assert.equal(interpretarControl({ ...bien, [k]: 'no' }).ok, false, `${k} como texto`);
  }
  assert.equal(interpretarControl(null).ok, false);
});

test('el pedido al Worker: SDXL 1024 x 576, 20 pasos, con prompt negativo que entra en 300 caracteres', () => {
  const p = pedidoAlWorker('prompt');
  assert.deepEqual(p, { prompt: 'prompt', modelo: 'sdxl', ancho: 1024, alto: 576, steps: 20, negativo: NEGATIVO });
  assert.equal(MODELO, 'sdxl'); assert.equal(ANCHO, 1024); assert.equal(ALTO, 576); assert.equal(PASOS, 20);
  assert.ok(NEGATIVO.length <= 300, `el negativo tiene ${NEGATIVO.length} caracteres`);
  for (const w of ['people', 'face', 'child', 'text', 'letters', 'logo', 'watermark', 'flag', 'blood', 'weapon']) assert.match(NEGATIVO, new RegExp(`\\b${w}\\b`));
  assert.equal(URL_DEL_WORKER, 'https://radar-balcarce-imagenes.radarbalcarce.workers.dev/generar');
  const w = leer('infra/imagenes-cloudflare/worker.mjs');
  assert.match(w, /sdxl: \{ id: '@cf\/stabilityai\/stable-diffusion-xl-base-1\.0'.*negativo: true/);
});

// ------------------------------------------------------------------ los topes

test('los topes: 12 llamadas por corrida, 20 por día, un solo reintento; y el día no pasa de las neuronas gratis', () => {
  assert.equal(TOPE_POR_CORRIDA, 12);
  assert.equal(TOPE_POR_DIA, 20);
  assert.equal(REINTENTOS_POR_IMAGEN, 1);
  assert.equal(cupoDeLaCorrida(0), 12);
  assert.equal(cupoDeLaCorrida(10), 10);
  assert.equal(cupoDeLaCorrida(15), 5);
  assert.equal(cupoDeLaCorrida(20), 0);
  assert.equal(cupoDeLaCorrida(31), 0);
  assert.equal(neuronasEstimadas(), 212);
  assert.ok(TOPE_POR_DIA * neuronasEstimadas() < NEURONAS_GRATIS_POR_DIA / 2, 'el tope del día gasta menos de la mitad de lo gratis');
});

test('lo ya usado hoy: lo aplicado (fotos-ia.json) y las llamadas de las revisiones anteriores (cuenta.json), sólo del día de Balcarce', () => {
  const libro = {
    a: { archivo: 'fotos-notas/a-ia.jpg', cuando: '2026-10-16T12:00:00Z' },
    b: { archivo: 'fotos-notas/b-ia.jpg', cuando: '2026-10-16T02:00:00Z' }, // 15/10 a las 23 en Balcarce
    c: { archivo: 'fotos-notas/c-ia.jpg', cuando: '2026-10-15T12:00:00Z' },
  };
  assert.equal(aplicadasHoy(libro, '2026-10-16'), 1);
  assert.equal(generadasHoy([{ dia: '2026-10-16', llamadas: 7 }, { dia: '2026-10-16', llamadas: 3 }, { dia: '2026-10-15', llamadas: 12 }, null], '2026-10-16'), 10);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuentas-'));
  fs.mkdirSync(path.join(dir, '123'));
  fs.writeFileSync(path.join(dir, '123', 'cuenta.json'), JSON.stringify({ dia: '2026-10-16', llamadas: 4 }));
  fs.writeFileSync(path.join(dir, 'otro.json'), '{}');
  assert.deepEqual(leerCuentas(dir), [{ dia: '2026-10-16', llamadas: 4 }]);
  assert.deepEqual(leerCuentas(path.join(dir, 'no-existe')), []);
});

// ---------------------------------------------------- revisar, con la red simulada

const JPEG = (n, relleno = 7) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n - 4, relleno)]);
const PROMPT_BUENO = 'Candid photojournalistic close-up still life of a worn wooden pharmacy counter with blank paper and a mortar, blurred shelves behind, soft natural window light, no people, no text, no logos';
const CONTROL_BIEN = { personas: false, rostros: false, texto: false, logos: false, sensible: false, raro: false, razon: 'un mostrador' };

function redSimulada({ worker = () => ({ status: 200 }), control = CONTROL_BIEN, prompt = PROMPT_BUENO } = {}) {
  const pedidos = { gemini: 0, control: 0, worker: 0, cuerpos: [] };
  const fetchFn = async (url, opciones = {}) => {
    const u = String(url);
    if (u.startsWith(URL_DEL_WORKER)) {
      pedidos.worker += 1;
      pedidos.cuerpos.push(JSON.parse(opciones.body));
      const r = worker(pedidos.worker);
      return { status: r.status, headers: { get: () => 'image/png' }, arrayBuffer: async () => JPEG(20_000), json: async () => ({}) };
    }
    const cuerpo = JSON.parse(opciones.body);
    const conImagen = cuerpo.contents[0].parts.some((p) => p.inlineData);
    if (conImagen) pedidos.control += 1; else pedidos.gemini += 1;
    const texto = conImagen ? JSON.stringify(control) : prompt;
    return { status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: texto }] } }] }) };
  };
  return { fetchFn, pedidos };
}

function escenario(cuantas, { extra = [], ahora = new Date('2026-10-16T15:00:00Z') } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilustrar-'));
  const datos = path.join(dir, 'data');
  fs.mkdirSync(datos);
  const notas = [...Array.from({ length: cuantas }, (_, i) => nota(`n${String(i).padStart(2, '0')}`, `Las farmacias difunden el cronograma de turnos ${i + 1}`, 'Balcarce', {
    fecha: new Date(ahora.getTime() - (i + 1) * 60_000).toISOString(), cuerpo: 'Las farmacias de turno de la semana, día por día, con dirección y teléfono.',
  })), ...extra];
  fs.writeFileSync(path.join(datos, 'portada.json'), JSON.stringify({ notas }));
  const rutas = {
    portada: path.join(datos, 'portada.json'), archivo: path.join(datos, 'archivo.json'), banco: path.join(datos, 'banco-fotos.json'),
    manuales: path.join(datos, 'fotos-manuales.json'), ilustraciones: path.join(datos, 'fotos-ia.json'), carpeta: path.join(dir, 'public', 'fotos-notas'),
  };
  return { dir, rutas, ahora, salida: path.join(dir, 'salida'), cuenta: path.join(dir, 'cuenta') };
}

const achicar = async () => JPEG(9_000);
const sinEspera = async () => {};

test('revisar: con 15 notas buenas hace 12 llamadas al Worker como mucho, deja las candidatas y no toca la web', async () => {
  const e = escenario(15, { extra: [nota('pol1', 'Choque frontal en la Ruta 226', 'Policiales', { fecha: '2026-10-16T14:00:00Z' })] });
  const { fetchFn, pedidos } = redSimulada();
  const log = [];
  const r = await revisar({ ...e, clave: 'clave-secreta-de-prueba', token: 'token-secreto-de-prueba', fetchFn, achicar, esperar: sinEspera, registro: (x) => log.push(x) });
  assert.equal(pedidos.worker, 12);
  assert.equal(r.llamadas, 12);
  assert.equal(r.candidatas.length, 12);
  assert.equal(r.saltadas.filter((s) => /sin cupo/.test(s.motivo)).length, 3);
  assert.ok(r.saltadas.some((s) => s.id === 'pol1' && /Policiales/.test(s.motivo)));
  assert.equal(pedidos.gemini, 12, 'a lo que no tiene cupo ni se le pide el prompt');
  assert.equal(r.paraAplicar.length, 12);
  for (const c of pedidos.cuerpos) {
    assert.equal(c.modelo, 'sdxl');
    assert.ok(c.prompt.endsWith(AGREGADO));
    assert.equal(c.negativo, NEGATIVO);
  }
  const json = JSON.parse(fs.readFileSync(path.join(e.salida, 'candidatas.json'), 'utf8'));
  assert.equal(json.candidatas[0].id, 'n00');
  assert.ok(json.candidatas[0].prompt.startsWith('Candid photojournalistic'));
  assert.equal(json.neuronasEstimadas, 12 * neuronasEstimadas());
  assert.ok(fs.existsSync(path.join(e.salida, 'n00.jpg')));
  assert.ok(fs.readFileSync(path.join(e.salida, 'index.html'), 'utf8').includes('Las farmacias difunden'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(e.cuenta, 'cuenta.json'), 'utf8')).llamadas, 12);
  assert.ok(!fs.existsSync(e.rutas.carpeta), 'la revisión no escribe en web/public/fotos-notas');
  assert.ok(!fs.existsSync(e.rutas.ilustraciones), 'ni en fotos-ia.json');
  const todo = `${log.join('\n')}\n${fs.readFileSync(path.join(e.salida, 'candidatas.json'), 'utf8')}\n${fs.readFileSync(path.join(e.salida, 'index.html'), 'utf8')}`;
  assert.ok(!todo.includes('clave-secreta-de-prueba') && !todo.includes('token-secreto-de-prueba'), 'las claves no se muestran');
  assert.ok(log.some((l) => /neuronas/.test(l)), 'el registro dice las neuronas estimadas');
});

test('revisar: lo ya gastado hoy achica el cupo; un reintento cuenta como llamada; un 401 corta todo', async () => {
  const a = escenario(10);
  const r1 = await revisar({ ...a, cuentas: [{ dia: '2026-10-16', llamadas: 17 }], clave: 'k', token: 't', ...redSimulada(), achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(r1.llamadas, 3);

  const b = escenario(2);
  const red = redSimulada({ worker: (n) => ({ status: n === 1 ? 503 : 200 }) });
  const r2 = await revisar({ ...b, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red.pedidos.worker, 3, 'la primera falló y se reintentó una vez');
  assert.equal(r2.candidatas.filter((c) => c.archivo).length, 2);

  const c = escenario(2);
  const siempreMal = redSimulada({ worker: () => ({ status: 502 }) });
  const r3 = await revisar({ ...c, clave: 'k', token: 't', fetchFn: siempreMal.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(siempreMal.pedidos.worker, 4, 'dos notas, un solo reintento cada una');
  assert.ok(r3.candidatas.every((x) => !x.archivo));

  const d = escenario(3);
  const sinPermiso = redSimulada({ worker: () => ({ status: 401 }) });
  const r4 = await revisar({ ...d, clave: 'k', token: 't', fetchFn: sinPermiso.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(sinPermiso.pedidos.worker, 1, 'un 401 no se reintenta ni sigue con las demás');
  assert.equal(r4.saltadas.filter((s) => /contraseña/.test(s.motivo)).length, 2);
});

test('revisar: lo que el control ve mal queda para revisar, sin aplicar solo; un prompt con nombres no llega al Worker', async () => {
  const a = escenario(1);
  const r = await revisar({ ...a, clave: 'k', token: 't', ...redSimulada({ control: { ...CONTROL_BIEN, texto: true } }), achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(r.candidatas[0].control.ok, false);
  assert.deepEqual(r.paraAplicar, []);

  const b = escenario(0, { extra: [nota('par1', 'El festival cierra con Teresa Parodi', 'Cultura y agenda', { fecha: '2026-10-16T14:00:00Z' })] });
  const red = redSimulada({ prompt: 'Candid photojournalistic close-up still life of the guitar of Teresa Parodi on a worn wooden stage, warm light' });
  const r2 = await revisar({ ...b, clave: 'k', token: 't', fetchFn: red.fetchFn, achicar, esperar: sinEspera, registro: () => {} });
  assert.equal(red.pedidos.worker, 0);
  assert.match(r2.saltadas[0].motivo, /Parodi/);
});

test('llamarAlWorker: la contraseña va en el encabezado, nunca en la dirección; sin respuesta es reintentable', async () => {
  let visto;
  const ok = await llamarAlWorker('p', { token: 'tok', fetchFn: async (url, o) => { visto = { url, o }; return { status: 200, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => JPEG(100) }; } });
  assert.equal(visto.o.headers['x-token'], 'tok');
  assert.ok(!String(visto.url).includes('tok'));
  assert.equal(ok.ext, 'jpg');
  const caido = await llamarAlWorker('p', { token: 'tok', fetchFn: async () => { throw new Error('tok'); } });
  assert.equal(caido.reintentable, true);
  assert.ok(!JSON.stringify(caido).includes('tok'));
  assert.equal((await llamarAlWorker('p', { token: 't', fetchFn: async () => ({ status: 400 }) })).reintentable, false);
});

// ------------------------------------------------------------------ aplicar

function revisionHecha(e, candidatas) {
  const desde = path.join(e.dir, 'revision');
  fs.mkdirSync(desde, { recursive: true });
  for (const c of candidatas) if (c.archivo) fs.writeFileSync(path.join(desde, c.archivo), JPEG(9_000));
  fs.writeFileSync(path.join(desde, 'candidatas.json'), JSON.stringify({ candidatas }));
  return desde;
}

test('aplicar: guarda <id>-ia.jpg y anota fotos-ia.json con la etiqueta; sin ids, sólo lo que pasó el control', () => {
  const e = escenario(3);
  const desde = revisionHecha(e, [
    { id: 'n00', archivo: 'n00.jpg', prompt: 'p0', control: { ok: true } },
    { id: 'n01', archivo: 'n01.jpg', prompt: 'p1', control: { ok: false, motivo: 'el control vio: texto' } },
    { id: 'n02', archivo: null, error: 'Worker HTTP 502' },
  ]);
  const { aplicadas } = aplicar({ desde, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n00']);
  assert.ok(fs.existsSync(path.join(e.rutas.carpeta, 'n00-ia.jpg')));
  const libro = JSON.parse(fs.readFileSync(e.rutas.ilustraciones, 'utf8'));
  assert.deepEqual(Object.keys(libro), ['n00']);
  assert.equal(libro.n00.archivo, 'fotos-notas/n00-ia.jpg');
  assert.equal(libro.n00.credito, 'Ilustración generada con IA');
  assert.equal(libro.n00.medio, 'Ilustración generada con IA');
  assert.equal(libro.n00.origen, 'ia');
  assert.equal(libro.n00.cuando, e.ahora.toISOString());
  assert.equal(libro.n00.prompt, 'p0');
  assert.ok(esIlustracionDeNota(libro.n00));
});

test('aplicar: con ids se aplican ésas (lo decidió una persona); si mientras tanto llegó una foto real o la nota se volvió sensible, no', () => {
  const e = escenario(3, { extra: [nota('pol2', 'Choque en la ruta', 'Policiales')] });
  fs.writeFileSync(e.rutas.banco, JSON.stringify({ n02: { archivo: 'fotos-notas/n02.jpg', credito: 'Foto: Municipalidad' } }));
  const desde = revisionHecha(e, [
    { id: 'n01', archivo: 'n01.jpg', control: { ok: false, motivo: 'el control vio: texto' } },
    { id: 'n02', archivo: 'n02.jpg', control: { ok: true } },
    { id: 'pol2', archivo: 'pol2.jpg', control: { ok: true } },
  ]);
  const { aplicadas } = aplicar({ desde, ids: ['n01', 'n02', 'pol2'], rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n01']);
});

test('aplicar: el tope del día también vale al guardar; no se pisa una ilustración vieja con el mismo nombre', () => {
  const e = escenario(3);
  const hoy = Object.fromEntries(Array.from({ length: TOPE_POR_DIA - 1 }, (_, i) => [`v${i}`, { archivo: `fotos-notas/v${i}-ia.jpg`, cuando: e.ahora.toISOString() }]));
  fs.writeFileSync(e.rutas.ilustraciones, JSON.stringify(hoy));
  fs.mkdirSync(e.rutas.carpeta, { recursive: true });
  fs.writeFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), 'vieja');
  const desde = revisionHecha(e, [{ id: 'n00', archivo: 'n00.jpg', control: { ok: true } }, { id: 'n01', archivo: 'n01.jpg', control: { ok: true } }]);
  const { aplicadas, libro } = aplicar({ desde, rutas: e.rutas, ahora: e.ahora, registro: () => {} });
  assert.deepEqual(aplicadas, ['n00']);
  assert.equal(libro.n00.archivo, 'fotos-notas/n00-ia-2.jpg', 'otro nombre: Cloudflare guarda el viejo una semana');
  assert.equal(fs.readFileSync(path.join(e.rutas.carpeta, 'n00-ia.jpg'), 'utf8'), 'vieja');
  assert.throws(() => aplicar({ desde: path.join(e.dir, 'no-existe'), rutas: e.rutas, registro: () => {} }), /candidatas\.json/);
});

test('la entrada de fotos-ia.json siempre dice que es de IA', () => {
  const x = entradaDeIlustracion({ archivo: 'fotos-notas/a-ia.jpg', nota: { titulo: 'T' }, prompt: 'p', ahora: new Date('2026-10-16T12:00:00Z') });
  assert.deepEqual({ archivo: x.archivo, credito: x.credito, medio: x.medio, origen: x.origen, cuando: x.cuando }, {
    archivo: 'fotos-notas/a-ia.jpg', credito: CREDITO_ILUSTRACION, medio: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T12:00:00.000Z',
  });
});

// ------------------------------------------------------- la prioridad en la web

const permitida = (n) => ilustracionPermitida(n, { semaforo: semaforoDelTexto });
const IL = { archivo: 'fotos-notas/a1-ia.jpg', credito: CREDITO_ILUSTRACION, origen: 'ia', cuando: '2026-10-16T12:00:00Z' };

test('prioridad: la ilustración va SÓLO si no hay foto real; el banco y las manuales le ganan (y una foto que llega después, también)', () => {
  const n = () => nota('a1', 'Las farmacias difunden el cronograma de turnos', 'Balcarce');
  const op = { ilustraciones: { a1: IL }, ilustracionPermitida: permitida };
  assert.deepEqual(conFotosDelBanco([n()], {}, op)[0].foto, { archivo: IL.archivo, credito: CREDITO_ILUSTRACION });
  assert.deepEqual(conFotosDelBanco([n()], { a1: { intentado: true, razon: 'sin fotos para comparar' } }, op)[0].foto.archivo, IL.archivo, 'probada sin foto: va la ilustración');
  assert.equal(conFotosDelBanco([n()], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: Municipalidad' } }, op)[0].foto.archivo, 'fotos-notas/a1.jpg');
  // generar-datos arma el banco con las manuales encima ({ ...banco, ...manuales }): la manual gana a la del banco y a la ilustración
  const banco = { ...{ a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: X' } }, ...{ a1: { archivo: 'fotos-notas/a1-2.jpg', credito: 'Foto: Y', origen: 'manual' } } };
  assert.equal(conFotosDelBanco([n()], banco, op)[0].foto.archivo, 'fotos-notas/a1-2.jpg');
  // la que ya tenía la ilustración y ahora tiene foto real: gana la foto
  assert.equal(conFotosDelBanco([{ ...n(), foto: { archivo: IL.archivo, credito: CREDITO_ILUSTRACION } }], { a1: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: Z' } }, op)[0].foto.credito, 'Foto: Z');
  // sin el tercer parámetro, como antes
  assert.equal(conFotosDelBanco([n()], {})[0].foto, undefined);
});

test('la ilustración no se muestra nunca en Policiales, Política, notas propias ni en lo que se volvió sensible, y se quita si ya no corresponde', () => {
  const op = { ilustraciones: { a1: IL }, ilustracionPermitida: permitida };
  for (const n of [
    nota('a1', 'Choque en la ruta', 'Policiales'),
    nota('a1', 'El Concejo aprobó el presupuesto', 'Política'),
    nota('a1', 'El clima de hoy', 'Balcarce', { propia: 'clima' }),
    nota('a1', 'Falleció un vecino reconocido', 'Balcarce'),
    nota('a1', 'Las farmacias de turno', 'Balcarce', { cuerpo: 'Una nena de 8 años fue atendida en la guardia.' }),
    nota('a1', 'Las farmacias de turno', 'Balcarce', { semaforo: 'amarillo' }),
  ]) {
    assert.equal(conFotosDelBanco([{ ...n, foto: { archivo: IL.archivo, credito: CREDITO_ILUSTRACION } }], {}, op)[0].foto, undefined, n.titulo);
  }
  // una foto real de una nota que no lleva ilustración no se toca
  const real = conFotosDelBanco([nota('a1', 'Falleció un vecino', 'Balcarce', { foto: { archivo: 'fotos-notas/a1.jpg', credito: 'Foto: X' } })], {}, op)[0];
  assert.equal(real.foto.archivo, 'fotos-notas/a1.jpg');
  // el epígrafe siempre dice que es de IA, aunque el libro diga otra cosa
  assert.equal(conFotosDelBanco([nota('a1', 'Las farmacias de turno', 'Balcarce')], {}, { ilustraciones: { a1: { ...IL, credito: 'Foto: Otro' } } })[0].foto.credito, CREDITO_ILUSTRACION);
  // un archivo que no tiene la forma <id>-ia.jpg no cuenta como ilustración
  assert.equal(conFotosDelBanco([nota('a1', 'Las farmacias de turno', 'Balcarce')], {}, { ilustraciones: { a1: { ...IL, archivo: 'fotos-notas/a1.jpg' } } })[0].foto, undefined);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/abc12-ia-3.jpg' }), true);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/clima-lluvia-1.jpg' }), false);
  assert.equal(esIlustracionDeNota({ archivo: 'fotos-notas/abc12.jpg' }), false);
});

test('la poda no borra las ilustraciones de notas vivas; sí las de notas retiradas o que ya no están', () => {
  const { borrar } = podarFotos({
    banco: {}, enDisco: ['a1-ia.jpg', 'b2-ia.jpg', 'c3-ia.jpg', 'suelta.jpg'], quedan: new Set(['a1', 'b2']), retiradas: new Set(['b2']),
    ilustraciones: { a1: { archivo: 'fotos-notas/a1-ia.jpg' }, b2: { archivo: 'fotos-notas/b2-ia.jpg' }, c3: { archivo: 'fotos-notas/c3-ia.jpg' } },
  });
  assert.deepEqual(borrar.sort(), ['b2-ia.jpg', 'c3-ia.jpg', 'suelta.jpg']);
  // sin el parámetro, como antes (una ilustración sin libro se borra como cualquier archivo suelto)
  assert.deepEqual(podarFotos({ banco: {}, enDisco: ['a1-ia.jpg'], quedan: new Set(['a1']) }).borrar, ['a1-ia.jpg']);
});

test('el epígrafe dice "Ilustración generada con IA" en las redes (sin "Foto:") y en el RSS', () => {
  const n = { id: 'a1', titulo: 'T', copete: 'C', cuerpo: 'Cuerpo de la nota.', fecha: '2026-10-16T12:00:00Z', foto: { archivo: 'fotos-notas/a1-ia.jpg', credito: CREDITO_ILUSTRACION } };
  assert.match(conCreditoDeFoto('Texto', n), /\n\nIlustración generada con IA$/);
  assert.match(contenidoDeLaNota(n, 'https://radarbalcarce.com'), /<figcaption>Ilustración generada con IA<\/figcaption>/);
  assert.match(itemDeLaNota(n, 'https://radarbalcarce.com'), /<media:credit>Ilustración generada con IA<\/media:credit>/);
  assert.match(leer('web/app/nota/[id]/page.js'), /<figcaption[^>]*>\{n\.foto\.credito\}<\/figcaption>/);
});

// ------------------------------------------------------- generar-datos y los workflows

test('generar-datos suma fotos-ia.json con la prioridad más baja, lo pasa a la poda y nunca lo escribe', () => {
  const g = leer('web/scripts/generar-datos.mjs');
  assert.match(g, /const FOTOS_IA = path\.join\(AQUI, '\.\.', 'data', 'fotos-ia\.json'\)/);
  assert.match(g, /conFotosDelBanco\(deLaIngesta, bancoDeFotos, conIlustraciones\)/);
  assert.match(g, /ilustraciones: ilustracionesIA,?\s*\}\);/);
  assert.match(g, /\.map\(conLaFotoPasada\)\.map\(conLaIlustracion\)/);
  assert.match(g, /yaTienen:[^\n]*!esIlustracionDeNota\(n\.foto\)/);
  assert.match(g, /ilustracionPermitida\(n, \{ semaforo: semaforoDelTexto \}\)/);
  assert.ok(!/writeFileSync\(FOTOS_IA/.test(g), 'generar-datos no escribe fotos-ia.json (lo escribe sólo "Ilustrar notas sin foto")');
  assert.ok(!/fotos-ia\.json/.test(leer('.github/workflows/actualizar.yml')), '"Actualizar la web" no lo toca, así que no lo necesita en su git add');
});

test('el workflow: manual, aplicar apagado por defecto, sólo las dos claves gratis, topes en el script y el ciclo de reintentos al subir', () => {
  const y = leer('.github/workflows/ilustrar-notas.yml');
  assert.match(y, /^on:\n  workflow_dispatch:/m);
  assert.ok(!/schedule:|cron:/.test(y), 'nunca solo');
  assert.match(y, /aplicar:\n\s+description:[^\n]*\n\s+type: boolean\n\s+required: false\n\s+default: false/);
  assert.match(y, /horas:\n\s+description:[^\n]*\n\s+required: false\n\s+default: '24'/);
  assert.match(y, /ids:\n\s+description:[^\n]*\n\s+required: false\n\s+default: ''/);
  const secretos = [...y.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(secretos)].sort(), ['GEMINI_API_KEY_REDACCION', 'VIGILANTE_TOKEN']);
  assert.ok(!/TOPE|MAXIMO/.test(y.replace(/^#.*$/gm, '')), 'los topes no se cambian desde el workflow');
  assert.match(y, /if: \$\{\{ inputs\.aplicar && inputs\.corrida == '' \}\}/);
  assert.match(y, /actions\/download-artifact@v4[\s\S]*run-id: \$\{\{ inputs\.corrida \}\}/);
  assert.match(y, /node web\/scripts\/ilustrar-notas\.mjs revisar/);
  assert.match(y, /node web\/scripts\/ilustrar-notas\.mjs aplicar --desde=revision/);
  assert.match(y, /for intento in 1 2 3; do\n\s+if ! git pull --rebase; then/);
  assert.match(y, /grep -qvE "\^web\/data\/"/);
  assert.match(y, /cuenta-ilustraciones/);
  assert.match(y, /concurrency:\n\s+group: ilustrar-notas/);
  // los textos que vienen de afuera van por variables, nunca pegados en el comando
  assert.ok(!/run:[^\n]*\$\{\{ inputs\./.test(y), 'ningún input pegado en un comando');
  // el script no lee ninguna otra clave
  const s = leer('web/scripts/ilustrar-notas.mjs');
  const env = new Set([...s.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1]));
  for (const v of env) assert.ok(['GEMINI_API_KEY_REDACCION', 'VIGILANTE_TOKEN', 'HORAS', 'IDS', 'GITHUB_STEP_SUMMARY', 'GITHUB_RUN_ID'].includes(v), v);
  assert.ok(!/GROQ|GEMINI_API_KEY_(?!REDACCION)|TAVILY|claves\.mjs/.test(s), 'ninguna otra clave');
});
