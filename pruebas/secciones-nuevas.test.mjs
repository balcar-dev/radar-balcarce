// El mapa de secciones (16/10/2026, docs/secciones/MAPA-DE-SECCIONES.md): tres secciones están activas desde el 17/10 (Educación, Salud y
// Ciencia, regla 215) y el resto sigue en modo sombra. Estas pruebas cuidan que el clasificador haga lo que dice el documento. Los títulos son reales
// (web/data/archivo.json y la lectura de feeds del 16/10). Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SECCIONES_NUEVAS, NOMBRES_NUEVOS, TEXTO_PARA_LA_FICHA, SECCIONES_DE_LA_FICHA_NUEVAS, PALABRAS_NUEVAS, SECCIONES_SUMADAS,
  PUEDEN_LLEVARSE, seccionNueva, contiene, normalizar, repartir,
} from '../ingesta/secciones-nuevas.mjs';
import { informe, muestra } from '../ingesta/secciones-nuevas-sombra.mjs';
import { COLOR_SECCION, COLORES } from '../reels/placa.mjs';

const s = (seccion, titulo, extra = {}) => seccionNueva({ seccion, titulo, ...extra }).seccion;

test('el clasificador nuevo no importa nada (regla de ingesta/)', () => {
  const codigo = fs.readFileSync(new URL('../ingesta/secciones-nuevas.mjs', import.meta.url), 'utf8');
  assert.equal(/^\s*import\s/m.test(codigo), false);
  const sombra = fs.readFileSync(new URL('../ingesta/secciones-nuevas-sombra.mjs', import.meta.url), 'utf8');
  for (const m of sombra.matchAll(/^import .* from '([^']+)'/gm)) assert.ok(m[1].startsWith('node:') || m[1].startsWith('./'), m[1]);
});

test('producción usa del mapa sólo Educación, Salud y Ciencia (reglas 187 y 211); el interruptor SECCIONES_NUEVAS ya no existe', () => {
  // Las redes siguen sin usarlo.
  assert.equal(fs.readFileSync(new URL('../redes/elegir.mjs', import.meta.url), 'utf8').includes('secciones-nuevas'), false);
  // La ingesta, la ficha de la IA, el sitio y generar-datos importan sólo lo de las tres activas: nada de seccionNueva a secas ni de
  // Espectáculos, Turismo y Ambiente (todavía en sombra).
  const permitidos = new Set(['SECCIONES_SUMADAS', 'DATOS_SUMADAS', 'TEXTO_PARA_LA_FICHA', 'esSumada', 'seccionSumada', 'ETIQUETAS_DE_SECCION',
    'SECCIONES_NUEVAS', 'encaje']);
  for (const archivo of ['../ingesta/ingesta.mjs', '../ingesta/lectura-ia.mjs', '../web/lib/datos.js', '../web/scripts/generar-datos.mjs']) {
    const codigo = fs.readFileSync(new URL(archivo, import.meta.url), 'utf8');
    const m = codigo.match(/import \{([^}]+)\} from '[./]+(?:ingesta\/)?secciones-nuevas\.mjs'/);
    assert.ok(m, `${archivo} usa las secciones del mapa`);
    for (const nombre of m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      assert.ok(permitidos.has(nombre), `${archivo} importa ${nombre}`);
    }
    assert.doesNotMatch(codigo, /seccionesNuevasActivas/, `${archivo}: el interruptor se sacó`);
  }
  assert.deepEqual(SECCIONES_SUMADAS, ['Educación', 'Salud', 'Ciencia']);
});

test('son 17, sin repetir, y las direcciones de hoy no cambian', () => {
  assert.equal(SECCIONES_NUEVAS.length, 17);
  assert.equal(new Set(NOMBRES_NUEVOS).size, 17);
  assert.equal(new Set(SECCIONES_NUEVAS.map((x) => x.ranura)).size, 17);
  const datos = fs.readFileSync(new URL('../web/lib/datos.js', import.meta.url), 'utf8');
  const hoy = [...datos.matchAll(/\{ nombre: '([^']+)', ranura: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  assert.equal(hoy.length, 11);
  for (const [nombre, ranura] of hoy) {
    const nueva = SECCIONES_NUEVAS.find((x) => x.nombre === nombre);
    assert.ok(nueva, `${nombre} sigue existiendo con la misma clave`);
    assert.equal(nueva.ranura, ranura, `${nombre} no cambia de dirección`);
    assert.equal(nueva.nueva, false);
  }
  assert.equal(SECCIONES_NUEVAS.filter((x) => x.nueva).length, 6);
  assert.equal(SECCIONES_NUEVAS.filter((x) => x.menu === 'principal').length, 8);
});

test('la IA tiene una línea por sección y la lista entera para elegir', () => {
  assert.deepEqual(SECCIONES_DE_LA_FICHA_NUEVAS, NOMBRES_NUEVOS);
  for (const n of NOMBRES_NUEVOS) assert.ok(TEXTO_PARA_LA_FICHA[n]?.length > 30, n);
  assert.match(TEXTO_PARA_LA_FICHA.Ambiente, /pronóstico de todos los días NO es una nota/);
  assert.match(TEXTO_PARA_LA_FICHA.Espectáculos, /No chimentos/);
});

test('las listas de palabras están bien formadas', () => {
  for (const [seccion, p] of Object.entries(PALABRAS_NUEVAS)) {
    assert.ok(NOMBRES_NUEVOS.includes(seccion), seccion);
    for (const d of p.debiles) assert.equal(p.firmes.includes(d), false, `${seccion}: "${d}" no puede ser firme y débil`);
  }
  for (const [de, a] of Object.entries(PUEDEN_LLEVARSE)) {
    assert.ok(NOMBRES_NUEVOS.includes(de), de);
    for (const x of a) assert.ok(PALABRAS_NUEVAS[x], `${de} → ${x} necesita palabras`);
  }
  // Fútbol, Automovilismo y Policiales ya son precisas: no se parten.
  for (const quieta of ['Fútbol', 'Automovilismo', 'Policiales']) assert.equal(PUEDEN_LLEVARSE[quieta], undefined);
});

// Los colores nuevos: que se lean y se distingan de todos (las mismas cuentas que pruebas/colores-placas.test.mjs).
const luz = (h) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const aLineal = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const oklab = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(aLineal);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
};
const distancia = (x, y) => Math.hypot(...oklab(x).map((v, i) => v - oklab(y)[i]));

test('los colores del mapa se leen y no se confunden con ningún otro de las piezas', () => {
  const todos = Object.fromEntries(SECCIONES_NUEVAS.map((x) => [x.nombre, x.color]));
  for (const extra of ['Clima', 'Farmacias', 'Feriados', 'WhatsApp']) todos[extra] = COLOR_SECCION[extra];
  for (const x of SECCIONES_NUEVAS) {
    assert.ok(contraste(x.color, COLORES.papel) >= 4.5, `${x.nombre} sobre el papel`);
    assert.ok(contraste(x.color, '#FFFFFF') >= 4.5, `blanco sobre ${x.nombre}`);
    if (COLOR_SECCION[x.nombre]) assert.equal(x.color, COLOR_SECCION[x.nombre], `${x.nombre} conserva su color`);
  }
  const nombres = Object.keys(todos);
  for (let i = 0; i < nombres.length; i += 1) for (let j = i + 1; j < nombres.length; j += 1) {
    assert.ok(distancia(todos[nombres[i]], todos[nombres[j]]) >= 0.06, `${nombres[i]} y ${nombres[j]} se parecen demasiado`);
  }
});

test('las palabras cortas y las enteras no engañan', () => {
  assert.equal(contiene(normalizar('El martes habrá cortes'), 'marte'), false);
  assert.equal(contiene(normalizar('Una misión a Marte'), 'marte'), true);
  assert.equal(contiene(normalizar('La IA llega al campo'), 'ia'), true);
  assert.equal(contiene(normalizar('La media de la tabla'), 'ia'), false);
  assert.equal(contiene(normalizar('Los docentes paran'), 'docente'), true);
  assert.equal(s('Argentina', 'El martes habrá cortes en la Línea A del subte'), 'Argentina');
  assert.equal(s('Argentina', 'Nadie sabe a ciencia cierta cuándo vuelve el tren'), 'Argentina');
});

test('Balcarce reparte en Educación, Salud, Política y Policiales (títulos reales)', () => {
  assert.equal(s('Balcarce', 'La Asociación de Maestros convoca a un paro docente para el miércoles'), 'Educación');
  assert.equal(s('Balcarce', 'UATRE Balcarce abre la inscripción para útiles escolares'), 'Educación');
  assert.equal(s('Balcarce', 'El Club de Leones entrega nuevos equipos al Hospital Municipal'), 'Salud');
  assert.equal(s('Balcarce', 'LALCEC organiza actividades y mamografías gratuitas por el mes rosa'), 'Salud');
  assert.equal(s('Balcarce', 'El Concejo aprueba la creación del registro de acompañantes terapéuticos'), 'Salud');
  assert.equal(s('Balcarce', 'Concejales proponen mayores exigencias para radares viales'), 'Política');
  assert.equal(s('Balcarce', 'Volvieron a robar en una distribuidora de calle 6'), 'Policiales');
  assert.equal(s('Balcarce', 'Kevin Gómez se consagró campeón argentino de boxeo'), 'Deportes');
  assert.equal(s('Balcarce', 'ANSES oficializó el aumento de octubre para jubilaciones'), 'Economía');
  // Lo que queda en Balcarce: servicios, instituciones, comercios.
  assert.equal(s('Balcarce', 'La Cooperativa de Electricidad anuncia un corte de luz para el miércoles'), 'Balcarce');
  assert.equal(s('Balcarce', 'Después de más de 60 años, Tintorería Moderna cierra una etapa'), 'Balcarce');
  // "carne vacuna" no es una vacuna; la educación vial no es Educación.
  assert.equal(s('Balcarce', 'El consumo de pollo supera por primera vez al de carne vacuna'), 'Balcarce');
  assert.notEqual(s('Balcarce', 'Balcarce suma un plan provincial de seguridad y educación vial'), 'Educación');
});

test('una palabra débil sólo decide desde el título; en la bajada hacen falta dos firmes', () => {
  // "clases" es débil: en la bajada no decide.
  assert.equal(s('Balcarce', 'Reunión de vecinos en el barrio Norte', { copete: 'Habrá clases de cocina y una merienda.' }), 'Balcarce');
  // Una sola firme en la bajada (la entrevista que nombra el paro docente de pasada) no alcanza.
  assert.equal(s('Balcarce', 'Un vecino repasa su historia en la radio', { copete: 'Habló también del paro docente de la semana.' }), 'Balcarce');
  // Dos firmes distintas en la bajada, sí (y queda marcada para mirar).
  const r = seccionNueva({ seccion: 'Balcarce', titulo: 'Una propuesta para conocer la ciudad', copete: 'Alumnos de la Escuela 3 presentaron un juego con sus docentes.' });
  assert.equal(r.seccion, 'Educación');
  assert.equal(r.duda, true);
});

test('Cultura: lo de afuera de la tele y los recitales va a Espectáculos; lo de acá queda en Cultura', () => {
  assert.equal(s('Cultura y agenda', 'U2 regresa a la Argentina y toca en el estadio de River'), 'Espectáculos');
  assert.equal(s('Cultura y agenda', 'Netflix prepara una precuela de Bridgerton enfocada en Lady Violet'), 'Espectáculos');
  assert.equal(s('Argentina', '“Canciones traspapeladas”: Iván Noble llega con un show que revisita su historia musical'), 'Espectáculos');
  assert.equal(s('Cultura y agenda', 'Pampa Dúo presenta su espectáculo en el Teatro Municipal', { local: true }), 'Cultura y agenda');
  assert.equal(s('Cultura y agenda', 'Adrián Stoppelman presenta su show de humor en la Casa del Bicentenario', { local: true }), 'Cultura y agenda');
  assert.equal(s('Cultura y agenda', 'Barker y Villa Cacique ofrecen turismo y sierras a dos horas'), 'Turismo');
  assert.equal(s('Cultura y agenda', 'La Fiesta Nacional del Postre confirma las clases de cocina para el fin de semana', { local: true }), 'Turismo');
  // "conductores" no es la tele; Turismo Carretera no es turismo.
  assert.equal(s('Argentina', 'La Agencia Nacional de Seguridad Vial sanciona a miles de conductores'), 'Argentina');
  assert.notEqual(s('Cultura y agenda', 'El Turismo Carretera vuelve a Balcarce en noviembre'), 'Turismo');
});

test('Ciencia sale de Tecnología, de Agro (si no es producción) y de Argentina', () => {
  assert.equal(s('Tecnología', 'Saturno brilla en el cielo y ofrece su mejor vista anual'), 'Ciencia');
  assert.equal(s('Tecnología', 'Un científico formado en Balcarce investiga para la NASA'), 'Ciencia');
  assert.equal(s('Tecnología', 'Google habilita Gemini 4 Argon para usuarios de pago'), 'Tecnología');
  assert.equal(s('Agro', 'Investigadores locales reciben una distinción en congreso nacional'), 'Ciencia');
  assert.equal(s('Agro', 'El INTA analiza las claves para la siembra de soja de primavera'), 'Agro');
  assert.equal(s('Argentina', 'Científicos descubren 57 nuevas especies marinas frente a la costa'), 'Ciencia');
});

test('Salud, Educación y Ambiente salen de Argentina', () => {
  assert.equal(s('Argentina', 'El Gobierno lanza un plan nacional de salud vascular'), 'Salud');
  assert.equal(s('Argentina', 'Argentina registra hasta 800 casos anuales de hepatitis C'), 'Salud');
  assert.equal(s('Argentina', 'La Provincia crea un programa para formar en oficios a secundarios'), 'Educación');
  assert.equal(s('Argentina', 'El Servicio Meteorológico emite alertas por tormentas y vientos'), 'Ambiente');
  assert.equal(s('Argentina', 'El canciller Pablo Quirno defiende la estrategia por Malvinas'), 'Política');
  assert.equal(s('Argentina', 'El Gobierno declara feriado nacional por la visita del Papa'), 'Argentina');
});

test('de una sección temática sólo se va con una firme en el título y sin empate', () => {
  assert.equal(s('Política', 'Docentes bonaerenses paran el jueves en reclamo de seguridad'), 'Educación');
  assert.equal(s('Política', 'El Municipio impulsa un plan de obras públicas en salud, educación y caminos'), 'Política');
  assert.equal(s('Deportes', 'En qué canal San Lorenzo vs. Boca por el Torneo Clausura 2026 hoy'), 'Fútbol');
  assert.equal(s('Deportes', 'La selección argentina de básquet juega en Zárate la Ventana FIBA'), 'Deportes');
  // Las que ya son precisas no se mueven nunca.
  assert.equal(s('Policiales', 'Choque frente a la escuela de la calle 18'), 'Policiales');
  assert.equal(s('Automovilismo', 'El TC2000 visita el autódromo y suma turismo a la ciudad'), 'Automovilismo');
  assert.equal(s('Fútbol', 'La Liga Balcarceña suspende la fecha por las lluvias'), 'Fútbol');
});

test('el pronóstico del tiempo publicado como nota queda marcado', () => {
  assert.match(seccionNueva({ seccion: 'Balcarce', titulo: 'El martes llega con una máxima de 22 grados y posibles lluvias' }).aviso ?? '', /pronóstico/);
  assert.equal(seccionNueva({ seccion: 'Balcarce', titulo: 'Balcarce bajo alerta naranja por fuertes vientos' }).aviso, null);
});

test('el informe de la sombra cuenta todo y arma la muestra de 40', () => {
  const notas = Array.from({ length: 60 }, (_, i) => ({
    id: `n${i}`, fecha: '2026-10-10T12:00:00Z',
    seccion: i % 3 === 0 ? 'Balcarce' : 'Automovilismo',
    titulo: i % 3 === 0 ? `La Escuela ${i} suma un aula` : `Carrera ${i} del TC`,
  }));
  const inf = informe(notas, { dias: 7 });
  assert.equal(inf.total, 60);
  assert.equal(inf.filas.reduce((t, f) => t + f.notas, 0), 60);
  assert.equal(inf.filas.find((f) => f.seccion === 'Educación').notas, 20);
  assert.equal(inf.muestra.length, 40);
  assert.equal(inf.muestra.filter((m) => m.antes !== m.nueva).length, 20);
  const { porSeccion } = repartir(notas);
  assert.equal(porSeccion.Automovilismo, 40);
  // La muestra es siempre la misma con los mismos datos.
  const cl = notas.map((nota) => ({ nota, r: seccionNueva(nota) }));
  assert.deepEqual(muestra(cl).map((c) => c.nota.id), muestra([...cl].reverse()).map((c) => c.nota.id));
});
