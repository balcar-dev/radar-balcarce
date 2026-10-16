// La etapa 2 del mapa de secciones (regla 187, 17/10/2026; docs/secciones/MAPA-DE-SECCIONES.md): Educación, Salud y el
// menú con "Más secciones", DETRÁS DEL INTERRUPTOR de compilación SECCIONES_NUEVAS. Apagado (lo normal) el sitio tiene
// que salir igual que antes: lo cuidan las primeras pruebas, que comparan con lo de antes del cambio (las once, la
// barra, la instrucción de la IA letra por letra, el marcado del menú). Prendido, las dos secciones existen en el sitio,
// en la ficha de la IA, en las placas y en el panel. Títulos reales de web/data (septiembre y octubre). Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

// El interruptor se lee al cargar lib/datos.js: se borra antes de importar, por si quien corre las pruebas lo tiene prendido.
delete process.env.SECCIONES_NUEVAS;
const datos = await import('../web/lib/datos.js');
const {
  SECCIONES, EN_NAVEGACION, seccionesDelSitio, navegacionDelSitio, conSeccionDelSitio, datosSeccion, nombreCorto, armarTapa,
  notasDeLaSeccion, porRanura, EN_LA_BARRA, frasesDeSeccion,
} = datos;
const { seccionesNuevasActivas, seccionDeLaEtapa2, SECCIONES_ETAPA_2, SECCIONES_NUEVAS: MAPA } = await import('../ingesta/secciones-nuevas.mjs');
const lectura = await import('../ingesta/lectura-ia.mjs');
const { rutaDeNota } = await import('../web/lib/ruta.js');
const { COLOR_SECCION } = await import('../reels/placa.mjs');
const { COLOR: COLOR_TARJETA } = await import('../web/lib/tarjeta-diseno.js');
const { SECCIONES: DEL_PANEL, seccionesDelPanel } = await import('../web/public/panel/github.js');
const { hashtagsDe } = await import('../redes/elegir.mjs');

const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const nota = (seccion, titulo, extra = {}) => ({
  id: `n${crypto.createHash('md5').update(titulo).digest('hex').slice(0, 7)}`, slug: titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
  seccion, titulo, fecha: '2026-10-15T12:00:00.000Z', ...extra,
});

// Las once de antes del 17/10, tal cual estaban en web/lib/datos.js.
const LAS_ONCE_DE_ANTES = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: 'var(--s-balcarce)' },
  { nombre: 'Política', ranura: 'politica', color: 'var(--s-politica)' },
  { nombre: 'Policiales', ranura: 'policiales', color: 'var(--s-policiales)' },
  { nombre: 'Fútbol', ranura: 'futbol', color: 'var(--s-futbol)' },
  { nombre: 'Deportes', ranura: 'deportes', color: 'var(--s-deportes)' },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: 'var(--s-automovilismo)' },
  { nombre: 'Agro', ranura: 'agro', color: 'var(--s-agro)' },
  { nombre: 'Economía', ranura: 'economia', color: 'var(--s-economia)' },
  { nombre: 'Cultura y agenda', ranura: 'cultura', color: 'var(--s-cultura)' },
  { nombre: 'Tecnología', ranura: 'tecnologia', color: 'var(--s-tecnologia)' },
  { nombre: 'Argentina', ranura: 'argentina', color: 'var(--s-pais)' },
];

// Notas reales que con el interruptor prendido se van a Educación o Salud.
const QUE_SE_MUEVEN = [
  nota('Balcarce', 'La Asociación de Maestros convoca a un paro docente para el miércoles', { local: true }),
  nota('Balcarce', 'El Club de Leones entrega nuevos equipos al Hospital Municipal', { local: true }),
  nota('Argentina', 'Argentina registra hasta 800 casos anuales de hepatitis C'),
  nota('Política', 'La Provincia convoca a paritarias docentes para el viernes'),
  nota('Balcarce', 'UATRE Balcarce abre la inscripción para útiles escolares', { local: true, publicadaPor: 'ia' }),
];
// Y notas que no se mueven nunca.
const QUE_QUEDAN = [
  nota('Balcarce', 'La Cooperativa de Electricidad anuncia un corte de luz para el miércoles', { local: true }),
  nota('Policiales', 'Choque frente a la escuela de la calle 18', { local: true }),
  nota('Fútbol', 'La Liga Balcarceña suspende la fecha por las lluvias'),
];

// ---------------------------------------------------------------- APAGADO: igual que antes

test('apagado es lo normal: sin la variable, vacía o con "no", el interruptor no se prende', () => {
  assert.equal(seccionesNuevasActivas({}), false);
  assert.equal(seccionesNuevasActivas({ SECCIONES_NUEVAS: '' }), false);
  assert.equal(seccionesNuevasActivas({ SECCIONES_NUEVAS: 'no' }), false);
  assert.equal(seccionesNuevasActivas({ SECCIONES_NUEVAS: 'No' }), false);
  for (const si of ['si', 'Si', 'SÍ', 'sí', '1', 'true', ' si ']) assert.equal(seccionesNuevasActivas({ SECCIONES_NUEVAS: si }), true, si);
  assert.equal(seccionesNuevasActivas(), false, 'las pruebas corren apagadas');
});

test('APAGADO: las secciones, la barra y las direcciones son exactamente las de antes', () => {
  assert.deepEqual(SECCIONES, LAS_ONCE_DE_ANTES);
  assert.deepEqual(seccionesDelSitio(false), LAS_ONCE_DE_ANTES);
  assert.deepEqual(EN_NAVEGACION, LAS_ONCE_DE_ANTES.map((s) => s.nombre));
  assert.equal(porRanura('educacion'), null, 'sin /seccion/educacion');
  assert.equal(porRanura('salud'), null, 'sin /seccion/salud');
  assert.deepEqual(DEL_PANEL, LAS_ONCE_DE_ANTES.map((s) => s.nombre));
  assert.deepEqual(seccionesDelPanel(null), DEL_PANEL);
  assert.deepEqual(seccionesDelPanel({ redes: {} }), DEL_PANEL);
  assert.deepEqual(lectura.SECCIONES_DE_LA_FICHA, ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina']);
  assert.deepEqual(lectura.ESQUEMA.items.properties.seccion.enum, lectura.SECCIONES_DE_LA_FICHA);
});

test('APAGADO: el menú recibe lo mismo que armaba el layout antes (igualdad del marcado de la navegación)', () => {
  const notas = [...QUE_SE_MUEVEN, ...QUE_QUEDAN, nota('Tecnología', 'Google habilita Gemini 4 Argon')];
  // Lo que hacía web/app/layout.js hasta el 17/10, copiado tal cual.
  const conNotas = new Set(notas.map((n) => n.seccion));
  const antes = EN_NAVEGACION.filter((s) => conNotas.has(s)).map(datosSeccion).map((s) => ({ href: `/seccion/${s.ranura}`, nombre: nombreCorto(s.nombre) }));
  const ahora = navegacionDelSitio({ notas, archivo: notas, activas: false });
  assert.deepEqual(ahora, { secciones: antes }, 'sin `mas`: la barra de siempre');
  // El layout le pasa `mas` sólo si existe, y el componente sin `mas` dibuja la barra de antes, letra por letra.
  const layout = leer('../web/app/layout.js');
  assert.match(layout, /\{\.\.\.\(menu\.mas \? \{ mas: menu\.mas \} : \{\}\)\}/);
  assert.match(layout, /const pieSecciones = nuevas \? \[\(\s*<nav className="pie-secciones"[\s\S]*\)\] : \[\];/, 'el pie con todas las secciones, sólo prendido');
  assert.match(layout, /<\/div>,\n\s*\.\.\.pieSecciones,\n\s*<div className="aclaracion"/, 'apagado no deja ni un hueco en el pie');
  const nav = leer('../web/components/navegacion.js');
  const barraDeAntes = `      <nav className={\`principal\${hayMas ? ' hay-mas' : ''}\`} aria-label="Secciones">
        <div className="envoltura" ref={fila}>
          {enlace({ href: '/', nombre: 'Portada' })}
          {secciones.map((s) => enlace(s))}
          <span className="crece" />
          {servicios.map((s, i) => enlace(s, i === 0 ? 'servicio primero-servicio' : 'servicio'))}
        </div>
      </nav>`;
  assert.ok(nav.includes(`if (!mas) {\n    return (\n${barraDeAntes}\n    );\n  }`), 'sin `mas`, el mismo marcado de antes');
});

test('APAGADO: ninguna nota cambia de sección, y una que trae Educación o Salud vuelve a la suya', () => {
  for (const n of [...QUE_SE_MUEVEN, ...QUE_QUEDAN]) assert.equal(conSeccionDelSitio(n, false), n, n.titulo);
  // La eligió la IA mientras estuvo prendido: vuelve a la de antes (o a Balcarce/Argentina si no se sabe).
  assert.equal(conSeccionDelSitio(nota('Educación', 'x', { seccionAntes: 'Política' }), false).seccion, 'Política');
  assert.equal(conSeccionDelSitio(nota('Salud', 'x', { local: true }), false).seccion, 'Balcarce');
  assert.equal(conSeccionDelSitio(nota('Salud', 'x'), false).seccion, 'Argentina');
  // La portada arma sus bloques sólo con las once.
  const { bloques } = armarTapa([...QUE_SE_MUEVEN, ...QUE_QUEDAN].map((n, i) => ({ ...n, relevancia: 50 + i })), undefined, { ahora: Date.parse('2026-10-15T13:00:00Z') });
  for (const [s] of bloques) assert.ok(LAS_ONCE_DE_ANTES.some((x) => x.nombre === s), s);
});

test('APAGADO: la instrucción de la IA es la de siempre, letra por letra, y una ficha con Educación no cambia nada', () => {
  const huella = crypto.createHash('sha256').update(lectura.instruccion(false)).digest('hex');
  assert.equal(huella, '1cc828af970765e308c98d83312edc6fabf982677070dc513e069bea1ed298ab', 'la instrucción cambió con el interruptor apagado');
  assert.ok(lectura.pedidoPara([], { activas: false }).startsWith(lectura.instruccion(false)));
  const ficha = { id: 'a', ambito: 'balcarce', seccion: 'Educación', impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'x' };
  assert.equal(lectura.fichaValida(ficha, { activas: false }), null, 'apagado, Educación no es una sección');
  const guardada = { ambito: 'balcarce', seccion: 'Educación', impacto: 'directo', razon: 'local', importancia: 'media', cuando: '2026-10-15T00:00:00Z' };
  const n = { id: 'a', titulo: 'La Asociación de Maestros convoca a un paro docente', seccion: 'Balcarce', semaforo: 'verde', alcance: 'local', local: true };
  const { notas: [r] } = lectura.aplicarFichas([n], { a: guardada }, { nuevas: false });
  assert.equal(r.seccion, 'Balcarce');
  assert.equal(r.seccionAntes, undefined);
});

test('APAGADO: los estilos nuevos cuelgan sólo de clases que el sitio apagado no usa', () => {
  const css = leer('../web/app/globals.css');
  const desde = css.indexOf('/* El menú con "Más secciones"');
  assert.ok(desde > 0);
  const bloque = css.slice(desde, css.indexOf('}', css.indexOf('.pie-secciones', desde)) + 1).replace(/\/\*[\s\S]*?\*\//g, '');
  const propias = ['con-mas', 'boton-mas', 'panel-mas', 'panel-cab', 'panel-titulo', 'pie-secciones'];
  let reglas = 0;
  for (const trozo of bloque.split('}')) {
    const partes = trozo.split('{');
    if (partes.length < 2) continue;
    const selector = partes[partes.length - 2].trim();
    if (!selector || selector.startsWith('@')) continue;
    reglas += 1;
    for (const parte of selector.split(',')) assert.ok(propias.some((c) => parte.includes(`.${c}`)), `"${parte.trim()}" toca algo del sitio de siempre`);
  }
  assert.ok(reglas > 30, `se revisaron ${reglas} reglas`);
  // Las dos variables de color nuevas no cambian ninguna de las de antes.
  assert.match(css, /--s-pais: #4B5563;\s*\/\*[^*]*\*\/\s*--s-educacion: #1D4BE0;\s*--s-salud: #004E5C;/);
});

// ---------------------------------------------------------------- PRENDIDO

test('PRENDIDO: Educación y Salud existen, con su dirección, después de las ocho de la barra; las de siempre no cambian', () => {
  const con = seccionesDelSitio(true);
  assert.equal(con.length, 13);
  assert.deepEqual(con.map((s) => s.nombre), ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Educación', 'Salud', 'Cultura y agenda', 'Tecnología', 'Argentina']);
  assert.deepEqual(con.find((s) => s.nombre === 'Educación'), { nombre: 'Educación', ranura: 'educacion', color: 'var(--s-educacion)' });
  assert.deepEqual(con.find((s) => s.nombre === 'Salud'), { nombre: 'Salud', ranura: 'salud', color: 'var(--s-salud)' });
  for (const s of LAS_ONCE_DE_ANTES) assert.deepEqual(con.find((x) => x.nombre === s.nombre), s, `${s.nombre} no cambia`);
  assert.deepEqual(SECCIONES_ETAPA_2, ['Educación', 'Salud']);
  assert.match(frasesDeSeccion('Educación').lema, /escuelas/i);
  assert.match(frasesDeSeccion('Salud').lema, /hospital/i);
});

test('PRENDIDO: el clasificador del mapa manda a Educación o Salud sólo lo firme, y la dirección de la nota no cambia', () => {
  for (const n of QUE_SE_MUEVEN) {
    const r = conSeccionDelSitio(n, true);
    assert.ok(['Educación', 'Salud'].includes(r.seccion), `${n.titulo} → ${r.seccion}`);
    assert.equal(r.seccionAntes, n.seccion);
    assert.equal(rutaDeNota(r), rutaDeNota(n), 'la dirección es /nota/<slug>-<id>: no lleva la sección');
    assert.doesNotMatch(rutaDeNota(r), /educacion|salud|seccion/);
  }
  for (const n of QUE_QUEDAN) assert.equal(conSeccionDelSitio(n, true), n, n.titulo);
  const s = (seccion, titulo, extra) => conSeccionDelSitio(nota(seccion, titulo, extra), true).seccion;
  // Una débil sola no alcanza ni en el título ("clases", "aulas"); en la bajada no cuenta nunca.
  assert.equal(s('Balcarce', 'Vuelven las clases en el barrio Norte', { local: true }), 'Balcarce');
  assert.equal(s('Balcarce', 'Reunión de vecinos en el barrio Norte', { copete: 'Habrá clases de cocina y una merienda.' }), 'Balcarce');
  // Una firme en la bajada con una débil en el título, sí.
  assert.equal(s('Balcarce', 'Nuevas aulas para el barrio Norte', { copete: 'La escuela suma dos salones.', local: true }), 'Educación');
  // Lo que corrigió o publicó una persona, y las notas propias, no se tocan.
  assert.equal(s('Balcarce', 'La Asociación de Maestros convoca a un paro docente', { corregidaAMano: true }), 'Balcarce');
  assert.equal(s('Balcarce', 'La Asociación de Maestros convoca a un paro docente', { publicadaPor: 'Hernán' }), 'Balcarce');
  assert.equal(s('Balcarce', 'El Hospital Municipal suma una nueva mesa quirúrgica', { propia: 'pista' }), 'Balcarce');
  // De una temática no se va si empata; lo político del hospital y la salud de una persona famosa tampoco.
  assert.equal(s('Política', 'El Municipio impulsa un plan de obras públicas en salud, educación y caminos'), 'Política');
  assert.equal(s('Política', 'El Tribunal de Cuentas ratifica multas a Esteban Reino por déficit del hospital'), 'Política');
  assert.equal(s('Argentina', 'El Gobierno evalúa cambios en la visita del Papa por su salud'), 'Argentina');
  // Si gana una sección del mapa que sigue en sombra (Policiales desde Balcarce, Ambiente), la nota se queda donde está.
  assert.equal(s('Balcarce', 'Volvieron a robar en una distribuidora de calle 6'), 'Balcarce');
  assert.equal(s('Argentina', 'El Servicio Meteorológico emite alertas por tormentas y vientos'), 'Argentina');
  assert.equal(seccionDeLaEtapa2(nota('Educación', 'La escuela 3 festeja')), null, 'lo que ya está en Educación queda');
});

test('PRENDIDO: las páginas de sección juntan lo que el mapa les manda, de la portada y del archivo', () => {
  const portada = [QUE_SE_MUEVEN[0], QUE_QUEDAN[0]].map((n) => conSeccionDelSitio(n, true));
  const archivo = [QUE_SE_MUEVEN[1], QUE_SE_MUEVEN[3]].map((n) => ({ ...conSeccionDelSitio(n, true), cuerpo: 'palabra '.repeat(90), medios: ['Uno', 'Dos'], oficial: true }));
  assert.deepEqual(notasDeLaSeccion('Educación', { portada, archivo }).map((n) => n.titulo), [QUE_SE_MUEVEN[0].titulo, QUE_SE_MUEVEN[3].titulo]);
  assert.deepEqual(notasDeLaSeccion('Salud', { portada, archivo }).map((n) => n.titulo), [QUE_SE_MUEVEN[1].titulo]);
});

test('PRENDIDO: el menú lleva las ocho fuertes en la barra y "Más secciones" con todas, agrupadas como en el mapa', () => {
  const ahora = Date.parse('2026-10-16T12:00:00Z');
  const portada = [...QUE_SE_MUEVEN, ...QUE_QUEDAN].map((n) => conSeccionDelSitio(n, true));
  const archivo = [nota('Tecnología', 'Google habilita Gemini 4 Argon', { fecha: '2026-10-14T10:00:00Z' }),
    nota('Argentina', 'La Ciudad avanza con la licitación para construir la Línea F del subte', { fecha: '2026-10-15T10:00:00Z' }),
    nota('Cultura y agenda', 'Una muestra vieja', { fecha: '2026-09-01T10:00:00Z' })];
  const menu = navegacionDelSitio({ notas: portada, archivo, activas: true, ahora });
  assert.deepEqual(EN_LA_BARRA, ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía']);
  assert.deepEqual(menu.secciones.map((s) => s.nombre), ['Balcarce', 'Policiales', 'Fútbol'], 'en la barra, las de la portada');
  const grupos = Object.fromEntries(menu.mas.grupos.map((g) => [g.nombre, g.secciones]));
  assert.deepEqual(Object.keys(grupos), ['Balcarce', 'Deportes', 'Sociedad', 'Ciencia y tecnología']);
  assert.deepEqual(grupos.Sociedad.map((s) => [s.nombre, s.href, s.color, !!s.nueva]), [
    ['Educación', '/seccion/educacion', 'var(--s-educacion)', true], ['Salud', '/seccion/salud', 'var(--s-salud)', true], ['Argentina', '/seccion/argentina', 'var(--s-pais)', false]]);
  assert.deepEqual(grupos['Ciencia y tecnología'].map((s) => s.nombre), ['Tecnología'], 'una nota en 7 días alcanza (decisión 14 del mapa)');
  assert.ok(!menu.mas.grupos.some((g) => g.secciones.some((s) => s.nombre === 'Cultura')), 'sin notas en 7 días, no se ofrece');
  assert.ok(menu.mas.enLaBarra.includes('/seccion/economia'));
  // El componente: botón con aria-expanded y aria-controls, panel con ese id y escondido, Escape y foco.
  const nav = leer('../web/components/navegacion.js');
  for (const x of ['aria-expanded={abierto}', 'aria-controls="panel-secciones"', 'id="panel-secciones"', 'hidden={!abierto}', "e.key === 'Escape'", 'boton.current?.focus()', "aria-current={actual ? 'page' : undefined}", 'Más secciones', 'Secciones']) {
    assert.ok(nav.includes(x), `navegacion.js: ${x}`);
  }
});

test('PRENDIDO: la IA puede elegir Educación y Salud, con sus líneas del mapa, sin llevarse lo de Política ni Policiales', () => {
  assert.deepEqual(lectura.seccionesDeLaFicha(true), ['Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Fútbol', 'Deportes', 'Automovilismo', 'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina']);
  assert.deepEqual(lectura.esquema(true).items.properties.seccion.enum, lectura.seccionesDeLaFicha(true));
  const texto = lectura.instruccion(true);
  assert.match(texto, /\n {2}· Policiales: [^\n]*\n {2}· Educación: escuelas, jardines, docentes[^\n]*\n {2}· Salud: hospitales, salas, vacunas/);
  assert.doesNotMatch(texto, /escuelas, salud local/, 'Balcarce ya no se lleva las escuelas y la salud');
  assert.doesNotMatch(texto, /\(sociedad, clima, salud, educación, grandes hechos\)/);
  assert.match(lectura.pedidoPara([], { activas: true }), /· Salud: /);
  const ficha = { id: 'a', ambito: 'balcarce', seccion: 'Salud', impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'x' };
  assert.equal(lectura.fichaValida(ficha, { activas: true }).seccion, 'Salud');
  const guardada = (seccion) => ({ ambito: 'balcarce', seccion, impacto: 'directo', razon: 'local', importancia: 'media', cuando: '2026-10-15T00:00:00Z' });
  const de = (seccion, titulo) => ({ id: 'a', titulo, seccion, semaforo: 'verde', alcance: 'local', local: true });
  const [a] = lectura.aplicarFichas([de('Balcarce', 'El Hospital Municipal suma una mesa quirúrgica')], { a: guardada('Salud') }, { nuevas: true }).notas;
  assert.equal(a.seccion, 'Salud');
  assert.equal(a.seccionAntes, 'Balcarce', 'se guarda la de antes, por si se apaga');
  // Política y Policiales esperan a una persona en las redes: la IA no se las lleva.
  const [b] = lectura.aplicarFichas([de('Política', 'El Concejo debate la creación de un banco municipal de fisiatría')], { a: guardada('Salud') }, { nuevas: true }).notas;
  assert.equal(b.seccion, 'Política');
});

test('PRENDIDO: los colores del mapa son uno solo en el sitio, las placas, las tarjetas y el panel', () => {
  const css = leer('../web/app/globals.css');
  const panel = leer('../web/public/panel/index.html');
  for (const nombre of SECCIONES_ETAPA_2) {
    const { color, ranura } = MAPA.find((m) => m.nombre === nombre);
    assert.equal(css.match(new RegExp(`--s-${ranura}:\\s*(#[0-9A-Fa-f]{6})`))?.[1], color, `${nombre} en globals.css`);
    assert.equal(panel.match(new RegExp(`--s-${ranura}:\\s*(#[0-9A-Fa-f]{6})`))?.[1], color, `${nombre} en el panel`);
    assert.equal(COLOR_SECCION[nombre], color, `${nombre} en las placas (COLOR_SECCION)`);
    assert.equal(COLOR_TARJETA[nombre], color, `${nombre} en las tarjetas para compartir`);
  }
  assert.equal(MAPA.find((m) => m.nombre === 'Educación').color, '#1D4BE0');
  assert.equal(MAPA.find((m) => m.nombre === 'Salud').color, '#004E5C');
  // CRITERIO-REDES.md § 8 las nombra (pruebas/colores-placas.test.mjs compara la tabla entera con COLOR_SECCION).
  const criterio = leer('../CRITERIO-REDES.md');
  assert.match(criterio, /\| Educación \| #1D4BE0 \|/);
  assert.match(criterio, /\| Salud \| #004E5C \|/);
});

test('PRENDIDO: el panel ofrece las dos sólo si la web dice que están prendidas; las redes siguen con #Balcarce', () => {
  const con = seccionesDelPanel({ seccionesNuevas: ['Educación', 'Salud'] });
  assert.deepEqual(con, seccionesDelSitio(true).map((s) => s.nombre), 'el mismo orden que el sitio');
  assert.deepEqual(seccionesDelPanel({ seccionesNuevas: ['Ciencia'] }), DEL_PANEL, 'sólo las de la etapa 2');
  const app = leer('../web/public/panel/app.js');
  assert.match(app, /seccionesDelPanel\(E\.estadoCel\)/);
  assert.match(app, /Educación: 'educacion', Salud: 'salud'/);
  const gd = leer('../web/scripts/generar-datos.mjs');
  assert.match(gd, /\.\.\.\(seccionesNuevasActivas\(\) \? \{ seccionesNuevas: \[\.\.\.SECCIONES_ETAPA_2\] \} : \{\}\)/);
  assert.match(gd, /\.\.\.\(n\.seccionAntes \? \{ seccionAntes: n\.seccionAntes \} : \{\}\)/);
  // Una nota de acá que la IA pasó a Educación sigue llevando #Balcarce.
  assert.equal(hashtagsDe({ seccion: 'Educación', seccionAntes: 'Balcarce', etiquetas: ['paro docente'] })[0], '#Balcarce');
  assert.deepEqual(hashtagsDe({ seccion: 'Salud', etiquetas: ['vacunas'] }), ['#Vacunas']);
});

test('el interruptor viaja desde la variable de GitHub y nadie lo prende en el código', () => {
  for (const wf of ['../.github/workflows/actualizar.yml', '../.github/workflows/cloudflare-deploy.yml']) {
    const y = leer(wf);
    assert.match(y, /SECCIONES_NUEVAS: \$\{\{ vars\.SECCIONES_NUEVAS \}\}/, wf);
    assert.doesNotMatch(y, /SECCIONES_NUEVAS: ['"]?(si|sí|1|true)/i, wf);
  }
  assert.equal((leer('../.github/workflows/actualizar.yml').match(/SECCIONES_NUEVAS: \$\{\{ vars\.SECCIONES_NUEVAS \}\}/g) ?? []).length, 2, 'en la ingesta (la IA) y al compilar');
  // La vista previa lo prende sólo para su propia compilación y guarda en docs/secciones/vista-previa/.
  const vista = leer('../web/scripts/vista-previa-secciones.mjs');
  assert.match(vista, /SECCIONES_NUEVAS: 'si'/);
  assert.match(vista, /docs', 'secciones', 'vista-previa'/);
});
