// Las secciones flacas (26/09): Hernán y Andrés piden tres notas por sección.
// Se sumaron 16 fuentes de afuera (espectáculos y cultura, policiales,
// tecnología, agro y economía de los diarios nacionales), y se bajaron o
// pusieron pisos y cupos SÓLO para esas secciones. Estas pruebas cuidan:
//
//   1. que las fuentes nuevas estén bien formadas y no le ganen a lo local;
//   2. que sus títulos reales caigan en la sección que se busca;
//   3. que el piso y el cupo nuevos hagan lo que dice CRITERIO-EDITORIAL.md;
//   4. que el semáforo siga mandando (lo sensible y lo internacional esperan);
//   5. que la IA gaste primero en la sección con menos notas escritas.
//
// Sin red: los títulos son los que respondieron los feeds el 25/09.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODAS_LAS_FUENTES, paraPruebas, aplicarCupos } from '../ingesta/ingesta.mjs';
import { MOTIVO_INTERNACIONAL, MOTIVO_POLICIAL_DE_AFUERA, REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import {
  PISO_DE_AFUERA, CUPO_DE_AFUERA, CUPO_POR_DEFECTO, PISO_POR_DEFECTO,
} from '../ingesta/criterio.mjs';
import { ordenarParaReescribir } from '../reels/reescritura.mjs';

const { clasificar, semaforo, pisoDe } = paraPruebas;

const NUEVAS = {
  'infobae-teleshow': 'Cultura y agenda',
  'infobae-cultura': 'Cultura y agenda',
  'ambito-espectaculos': 'Cultura y agenda',
  'minutouno-espectaculos': 'Cultura y agenda',
  'lanacion-cultura': 'Cultura y agenda',
  'lanacion-seguridad': 'Policiales',
  'tn-policiales': 'Policiales',
  'infobae-policiales': 'Policiales',
  'lanacion-tecnologia': 'Tecnología',
  hipertextual: 'Tecnología',
  xataka: 'Tecnología',
  'clarin-rural': 'Agro',
  infocampo: 'Agro',
  bichosdecampo: 'Agro',
  inta: 'Agro',
  'perfil-economia': 'Economía',
};

// ------------------------------------------------------------ 1. las fuentes

test('las 16 fuentes nuevas están bien formadas y pesan poco', () => {
  const ids = TODAS_LAS_FUENTES.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
  for (const [id, seccion] of Object.entries(NUEVAS)) {
    const f = TODAS_LAS_FUENTES.find((x) => x.id === id);
    assert.ok(f, `falta la fuente ${id}`);
    assert.match(f.url, /^https:\/\//, `${id}: la dirección tiene que ser https`);
    assert.ok(['rss', 'atom'].includes(f.tipo), `${id}: tipo raro (${f.tipo})`);
    assert.ok(f.peso <= 16, `${id} pesa ${f.peso}: le ganaría a lo local`);
    assert.ok(f.peso >= 10, `${id} pesa ${f.peso}: el resto de las de afuera va de 10 a 16`);
    assert.ok(Number.isInteger(f.maxItems) && f.maxItems >= 1 && f.maxItems <= 3,
      `${id}: maxItems tiene que estar definido y ser chico (1 a 3)`);
    assert.equal(f.alcance, 'pais', `${id}: es un medio nacional`);
    assert.equal(f.seccion, seccion, `${id}: la sección fija es ${seccion}`);
    assert.ok(!f.oficial, `${id}: con oficial y maxItems saltearía el piso`);
    assert.ok(f.nombre && f.medio && Array.isArray(f.temas) && f.temas.length, `${id}: le falta nombre, medio o temas`);
  }
});

test('el total de fuentes es el que dicen los documentos (61)', () => {
  assert.equal(TODAS_LAS_FUENTES.length, 61);
});

// ------------------------------------------------ 2. la sección de cada título

const RSS = (titulo) => ({
  titulo, cuerpo: '', categorias: [], alcance: 'pais', peso: 12, fecha: new Date(),
});

test('los títulos reales de las fuentes nuevas caen en la sección buscada', () => {
  // Con la sección fija de la fuente (espectáculos, policiales, agro, economía).
  const conFuente = (id, titulo) => ({ ...RSS(titulo), seccionFuente: TODAS_LAS_FUENTES.find((f) => f.id === id).seccion });
  const casos = [
    ['infobae-teleshow', 'Tini Stoessel compartió las postales de su show en Ecuador: la romántica foto con Rodrigo de Paul', 'Cultura y agenda'],
    ['infobae-teleshow', 'Nicolás Cabré ya figura en el muro de los Six Star Finishers antes de correr la Maratón de Berlín', 'Cultura y agenda'],
    ['ambito-espectaculos', 'Cinco películas y tres series argentinas para ver esta semana', 'Cultura y agenda'],
    ['minutouno-espectaculos', 'Agustín "Rada" Aristarán brilla en "Chanta", una obra que invita a reír y reflexionar', 'Cultura y agenda'],
    ['lanacion-cultura', 'Con “The Bunnyman”, un guardián mitad humano y mitad conejo, Johnny Depp debuta como escultor', 'Cultura y agenda'],
    ['infobae-policiales', 'Hallaron más de 1.500 kilos de marihuana ocultos entre muebles en un camión proveniente de Brasil', 'Policiales'],
    ['lanacion-seguridad', 'Bajaron en Vicente López los delitos cometidos por motochorros', 'Policiales'],
    ['tn-policiales', 'Video: un taxista se metió en una protesta de choferes de aplicaciones y protagonizó una pelea', 'Policiales'],
    ['clarin-rural', 'A la espera de El Niño: la primavera comienza con el 70% entre escasez y sequía en la principal zona', 'Agro'],
    ['infocampo', 'Exportaciones de carne: a contramano del Mercosur, Argentina crece y gana protagonismo', 'Agro'],
    ['bichosdecampo', 'El cerdo se agranda en Argentina: la producción de carne porcina creció 12,4%', 'Agro'],
    ['inta', 'La fertilización nitrogenada mejora el desempeño del sorgo en suelos con restricciones', 'Agro'],
    ['perfil-economia', 'El Riesgo País escala a 609 puntos por la caída generalizada de los bonos en dólares', 'Economía'],
  ];
  for (const [id, titulo, esperada] of casos) {
    assert.equal(clasificar(conFuente(id, titulo)), esperada, `${id}: "${titulo}"`);
  }
});

test('Tecnología: se confirma con el título, así que un reloj deportivo no es tecnología por venir del feed', () => {
  const tec = (titulo) => ({ ...RSS(titulo), seccionFuente: 'Tecnología' });
  assert.equal(clasificar(tec('Microsoft reinventa Copilot con Home, Code y Autopilot, las herramientas de trabajo')), 'Tecnología');
  assert.equal(clasificar(tec('El jefe de NVIDIA no se anda con rodeos: si la IA no se controla, se apaga')), 'Tecnología');
  assert.equal(clasificar(tec('Las empresas chinas llevan la delantera en modelos "pequeños" de IA')), 'Tecnología');
  // "Dos nuevos relojes para el deporte extremo": no nombra tecnología en el
  // título, se clasifica por lo que dice (deporte) y no ocupa un lugar en Tecnología.
  assert.notEqual(clasificar(tec('Dos nuevos relojes para el deporte extremo con GPS y pantalla solar')), 'Tecnología');
});

// ------------------------------------------------- 3. el piso y el cupo nuevos

test('los pisos y cupos nuevos son los que dice el criterio', () => {
  assert.equal(PISO_DE_AFUERA['Cultura y agenda'], 38);
  assert.equal(PISO_DE_AFUERA.Agro, 38);
  assert.equal(PISO_DE_AFUERA.Tecnología, 34);
  assert.equal(CUPO_DE_AFUERA['Cultura y agenda'], 8);
  // Lo que no se tocó: Deportes sigue subiendo, Policiales sigue conservador.
  assert.equal(PISO_DE_AFUERA.Deportes, 62);
  assert.equal(PISO_DE_AFUERA.Policiales, 40);
  assert.equal(CUPO_DE_AFUERA.Policiales, 8);
  assert.equal(pisoDe('Cultura y agenda'), 38);
  assert.equal(pisoDe('Servicios'), PISO_POR_DEFECTO);
});

const deAfuera = (titulo, seccion, extra = {}) => ({
  titulo, cuerpo: 'Resumen de la nota, sin nada raro.', categorias: [], alcance: 'pais', peso: 12,
  fecha: new Date(), imagen: 'https://x/y.jpg', local: false, nombraBalcarce: false, ...extra, seccionFuente: seccion,
});

test('una nota fresca de espectáculos de afuera (unos 45 puntos) sale sola; con 36 espera', () => {
  const n = deAfuera('Lali Espósito y su tercer River: todo lo que hay que saber para el show del sábado', 'Cultura y agenda');
  assert.equal(semaforo(n, 'Cultura y agenda', 45).color, 'verde');
  const s = semaforo(n, 'Cultura y agenda', 36);
  assert.equal(s.color, 'amarillo');
  assert.match(s.motivo, /poco puntaje \(36 de 38\)/);
});

test('el cupo de Cultura y agenda de afuera es 8: la nota 9 espera, y Balcarce no cuenta', () => {
  const portada = [];
  for (let i = 0; i < 10; i += 1) {
    portada.push({ id: `c${i}`, seccion: 'Cultura y agenda', semaforo: 'verde', local: false, nombraBalcarce: false });
  }
  portada.push({ id: 'local', seccion: 'Cultura y agenda', semaforo: 'verde', local: true, nombraBalcarce: false });
  aplicarCupos(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, 8 + 1);
  assert.match(portada[8].motivo, /cupo de Cultura y agenda de afuera \(8 por vuelta\)/);
  assert.equal(portada.at(-1).semaforo, 'verde');
  assert.ok(CUPO_DE_AFUERA['Cultura y agenda'] < CUPO_POR_DEFECTO);
});

// --------------------------------------------- 4. el semáforo sigue mandando

test('un crimen de otro lugar, de un feed policial, no sale solo: "Mató a su mujer embarazada…" (26/09)', () => {
  const n = deAfuera('Mató a su mujer embarazada, se escapó de la cárcel, estuvo 22 años prófugo y ahora ordenaron su captura', 'Policiales');
  const s = semaforo(n, 'Policiales', 60);
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, MOTIVO_POLICIAL_DE_AFUERA);
});

test('un policial neutro de afuera con puntaje alcanza; con poco puntaje, no', () => {
  const n = deAfuera('Hallaron más de 1.500 kilos de marihuana ocultos entre muebles en un camión proveniente de Brasil', 'Policiales', { cuerpo: 'Un cargamento en una ruta de Misiones.' });
  assert.equal(semaforo(n, 'Policiales', 45).color, 'verde');
  assert.equal(semaforo(n, 'Policiales', 38).color, 'amarillo');
});

test('la regla de policiales de afuera no toca lo de Balcarce ni otras secciones', () => {
  const local = deAfuera('Un vecino de Balcarce dijo que mataron a su perro', 'Policiales', { alcance: 'local', local: true });
  assert.equal(semaforo(local, 'Policiales', 60).color, 'verde');
  const nombra = deAfuera('Balcarce: detuvieron a dos por un robo', 'Policiales', { nombraBalcarce: true, cuerpo: 'En Balcarce.' });
  assert.notEqual(semaforo(nombra, 'Policiales', 60).motivo, MOTIVO_POLICIAL_DE_AFUERA);
  const cine = deAfuera('Estrenan una película sobre un crimen sin resolver', 'Cultura y agenda');
  assert.notEqual(semaforo(cine, 'Cultura y agenda', 60).motivo, MOTIVO_POLICIAL_DE_AFUERA);
  for (const p of REGLAS_SEMAFORO.policialDeAfuera) assert.equal(p, p.toLowerCase(), `en minúscula: ${p}`);
});

test('lo internacional sin relación con Balcarce sigue esperando en las secciones nuevas', () => {
  const n = deAfuera('Donald Trump y Xi Jinping concluyen su cumbre en Washington', 'Tecnología');
  const s = semaforo(n, 'Tecnología', 70);
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, MOTIVO_INTERNACIONAL);
});

test('en espectáculos, una muerte o un menor siguen esperando a una persona', () => {
  const muerte = deAfuera('Murió Oscar el "Negro" González Oro: reacciones y mensajes de despedida', 'Cultura y agenda');
  assert.equal(semaforo(muerte, 'Cultura y agenda', 60).color, 'amarillo');
  const chico = deAfuera('Un nene de 7 años fue el protagonista de la obra que se estrena', 'Cultura y agenda');
  assert.equal(semaforo(chico, 'Cultura y agenda', 60).color, 'amarillo');
  const rojo = deAfuera('Documental sobre un caso de abuso sexual en una escuela', 'Cultura y agenda');
  assert.equal(semaforo(rojo, 'Cultura y agenda', 90).color, 'rojo');
});

test('la cotización del dólar de Infocampo (Agro) sigue sin salir como nota', () => {
  const n = deAfuera('Euro BLUE HOY: precio y cotización de este 25 septiembre 2026', 'Agro');
  assert.equal(semaforo(n, 'Agro', 60).color, 'amarillo');
});

// ------------------------------ 5. la IA gasta primero donde hay menos notas

test('ordenarParaReescribir: lo de Balcarce primero, y después la sección con menos notas escritas', () => {
  const nota = (id, seccion, relevancia, extra = {}) => ({ id, seccion, relevancia, semaforo: 'verde', ...extra });
  const escrita = { titulo: 't', copete: 'c', cuerpo: Array(90).fill('palabra').join(' ') };
  const notas = [
    nota('pol1', 'Política', 60), nota('pol2', 'Política', 59), nota('pol3', 'Política', 58),
    nota('eco1', 'Economía', 57),
    nota('cul1', 'Cultura y agenda', 45), nota('cul2', 'Cultura y agenda', 44),
    nota('tec1', 'Tecnología', 40),
    nota('loc1', 'Balcarce', 30, { local: true }),
  ];
  // Política ya tiene dos notas escritas; Economía, una.
  const previas = { polA: escrita, polB: escrita, ecoA: escrita };
  const todas = [...notas, nota('polA', 'Política', 70), nota('polB', 'Política', 69), nota('ecoA', 'Economía', 68)];
  const orden = ordenarParaReescribir(todas, previas).map((n) => n.id);
  assert.equal(orden[0], 'loc1', 'lo de Balcarce va primero');
  const sinEscribir = orden.filter((id) => !previas[id]);
  // Cultura (0 escritas) y Tecnología (0) pasan a la primera nota de Política (2 escritas).
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('pol1'));
  assert.ok(sinEscribir.indexOf('tec1') < sinEscribir.indexOf('pol1'));
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('cul2'));
  // A igual lugar manda el puntaje: la primera de Cultura (45) antes que la de Tecnología (40).
  assert.ok(sinEscribir.indexOf('cul1') < sinEscribir.indexOf('tec1'));
  // Nadie se pierde ni se repite.
  assert.equal(orden.length, todas.length);
  assert.equal(new Set(orden).size, todas.length);
});

test('ordenarParaReescribir sin nada escrito y sin locales: es por puntaje dentro de cada lugar', () => {
  const notas = [
    { id: 'a', seccion: 'Deportes', relevancia: 50, semaforo: 'verde' },
    { id: 'b', seccion: 'Deportes', relevancia: 60, semaforo: 'verde' },
    { id: 'c', seccion: 'Agro', relevancia: 40, semaforo: 'verde' },
  ];
  assert.deepEqual(ordenarParaReescribir(notas, {}).map((n) => n.id), ['b', 'c', 'a']);
});
