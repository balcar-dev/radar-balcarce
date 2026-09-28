// Las placas de las historias y los reels y las tarjetas de las notas, con el
// diseño aprobado por Hernán el 28/09 (lienzo "Radar Balcarce · Plantillas
// redes"). Sin red. Las cajas de texto se miden con resvg y las tipografías
// del proyecto (reels/marca/fuentes), como la portada de Facebook.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  ANCHO, ALTO, ZONA_TEXTO, COLOR_SECCION, COLORES, placaRepaso, placaClima, placaFarmacia,
  placaUtiles, placaAgenda, diaConTilde, comoNombrePropio, encabezadoDelRepaso, iconoDelCielo, archivosDeFuente,
} from '../reels/placa.mjs';
import { planDelDia, hastaCuandoElTurno, cajaDeDia, pronosticoDe } from '../reels/plan.mjs';
import {
  repartirTexto, INSTAGRAM, TAMANO_INSTAGRAM, INTERLINEA_TITULO, altoParaTexto, bajadaQueEntra, fechaCorta, fotoDeLaNota,
  tamNombreDeSeccion, anchoParaTexto,
} from '../web/lib/tarjeta-diseno.js';

const RAIZ = path.join(import.meta.dirname, '..');

// ------------------------------------------------------------ las medidas

const fuentes = archivosDeFuente();

/** Cada <text> de la placa, medido solo con las tipografías de verdad. */
function cajasDeTexto(svg) {
  const textos = [...svg.matchAll(/<text[\s\S]*?<\/text>/g)].map((m) => m[0]);
  return textos.map((t) => {
    const b = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">${t}</svg>`, {
      font: { fontFiles: fuentes, loadSystemFonts: false, defaultFontFamily: 'Inter' },
    }).getBBox();
    const contenido = t.replace(/<[^>]+>/g, '').trim();
    return b ? {
      texto: contenido, x: b.x, y: b.y, ancho: b.width, alto: b.height,
    } : null;
  }).filter(Boolean);
}

/** Todo el texto dentro del lienzo, con margen a los costados y en la zona que no tapa la app. */
function revisarCajas(svg, nombre, { margen = 40 } = {}) {
  const cajas = cajasDeTexto(svg);
  assert.ok(cajas.length > 3, `${nombre}: no se midió nada (¿faltan las tipografías?)`);
  for (const c of cajas) {
    assert.ok(c.x >= margen - 1, `${nombre}: "${c.texto}" se sale por la izquierda (x=${c.x.toFixed(0)})`);
    assert.ok(c.x + c.ancho <= ANCHO - margen + 1, `${nombre}: "${c.texto}" se sale por la derecha (termina en ${(c.x + c.ancho).toFixed(0)})`);
    assert.ok(c.y >= ZONA_TEXTO.arriba - 1, `${nombre}: "${c.texto}" cae arriba, debajo de la interfaz de la app (y=${c.y.toFixed(0)})`);
    assert.ok(c.y + c.alto <= ZONA_TEXTO.abajo + 1, `${nombre}: "${c.texto}" cae abajo, en la zona de los subtítulos (termina en ${(c.y + c.alto).toFixed(0)})`);
  }
  // Nada se pisa: dos renglones no se superponen.
  const ordenadas = cajas.slice().sort((a, b) => a.y - b.y);
  for (let i = 0; i < ordenadas.length; i += 1) {
    for (let j = i + 1; j < ordenadas.length; j += 1) {
      const a = ordenadas[i]; const b = ordenadas[j];
      const cruzanX = a.x < b.x + b.ancho - 2 && b.x < a.x + a.ancho - 2;
      const cruzanY = a.y < b.y + b.alto - 4 && b.y < a.y + a.alto - 4;
      assert.ok(!(cruzanX && cruzanY), `${nombre}: "${a.texto}" y "${b.texto}" se pisan`);
    }
  }
  return cajas;
}

test('la zona de texto de las placas es la zona segura de las historias (redes/formatos.mjs)', async () => {
  const { FORMATOS } = await import('../redes/formatos.mjs');
  for (const f of [FORMATOS.instagram.historia, FORMATOS.instagram.reel]) {
    assert.equal(ZONA_TEXTO.arriba, f.margenArriba);
    assert.equal(ZONA_TEXTO.abajo, f.alto - f.margenAbajo);
    assert.equal(ANCHO, f.ancho);
    assert.equal(ALTO, f.alto);
  }
});

const TITULOS_LARGOS = [
  'Sancionaron a Werner, Canapino y Ciantini y cambió el clasificador de la final de TC Pick Up en el Autódromo Juan Manuel Fangio',
  'El Concejo Deliberante aprobó por unanimidad llamar Paseo Intendente Juan José Mare a la vuelta interna del cerro El Triunfo',
  'Tecnopapa, el evento que reunirá a toda la cadena productiva del país, ya tiene fecha y lugar confirmados para noviembre',
  'Cortan el agua en el barrio norte por una obra de la cooperativa: cuánto dura el corte y qué calles quedan afectadas',
];

// ------------------------------------------------------------ el repaso

test('repaso: la lista numerada lleva el color de la sección de cada nota, sacado de la tabla', () => {
  const svg = placaRepaso({
    titulo: 'El repaso de la tarde', momento: 'tarde', fecha: 'Lunes 28 de septiembre', segundos: 42, color: '#1E6E4F',
    notas: [{ seccion: 'Automovilismo', titulo: 'Uno' }, { seccion: 'Agro', titulo: 'Dos' }, { seccion: 'Balcarce', titulo: 'Tres' }],
  });
  for (const [n, s] of [[1, 'Automovilismo'], [2, 'Agro'], [3, 'Balcarce']]) {
    assert.match(svg, new RegExp(`fill="${COLOR_SECCION[s]}">${n}</text>`), `el ${n} no lleva el color de ${s}`);
  }
  // Una sección que no está en la tabla va en tinta, nunca en un color inventado.
  assert.match(placaRepaso({ titulo: 'x', notas: [{ seccion: 'Inventada', titulo: 'a' }, { titulo: 'b' }] }), new RegExp(`fill="${COLORES.tinta}">1</text>`));
  // El nombre del podcast y la duración, en el color del día.
  assert.match(svg, /EL REPASO DE LA TARDE/);
  assert.match(svg, /Audio · 42 s/);
  assert.match(svg, /#1E6E4F/);
  assert.equal(encabezadoDelRepaso('manana', 3), 'Tres noticias para empezar el día');
  assert.equal(encabezadoDelRepaso('tarde', 2), 'Dos cosas que pasaron hoy');
});

test('repaso: cuatro títulos largos entran enteros, sin puntos suspensivos ni desbordes', () => {
  const svg = placaRepaso({
    titulo: 'El repaso del día', momento: 'noche', fecha: 'Lunes 28 de septiembre', segundos: 55,
    notas: TITULOS_LARGOS.map((titulo, i) => ({ seccion: ['Automovilismo', 'Balcarce', 'Agro', 'Balcarce'][i], titulo })),
  });
  assert.ok(!svg.includes('…'), 'algún título se cortó');
  const texto = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
  for (const t of TITULOS_LARGOS) for (const palabra of t.split(' ')) assert.ok(texto.includes(palabra.replace(/&/g, '&amp;')), `falta "${palabra}"`);
  revisarCajas(svg, 'repaso con títulos largos');
});

test('los podcasts del plan usan la placa del repaso con las notas que cuentan', () => {
  const plan = fs.readFileSync(path.join(RAIZ, 'reels', 'plan.mjs'), 'utf8');
  assert.equal((plan.match(/svg: placaRepaso\(/g) ?? []).length, 2, 'los tres podcasts (mañana/tarde y noche) usan placaRepaso');
  assert.ok(!/placaNoticia\(/.test(plan), 'el plan ya no usa la placa de una sola nota para los podcasts');
});

// ------------------------------------------------------------ el clima

const CLIMA = {
  ahora: { temp: 18, sensacion: 17, viento: 14, rumbo: 'NE', cielo: 'Nublado', esDeDia: true },
  dias: [
    { fecha: '2026-09-28', dia: 'lun', max: 18, min: 11, lluvia: 99, codigo: 81, viento: 20, cielo: 'Chaparrones fuertes' },
    { fecha: '2026-09-29', dia: 'mar', max: 14, min: 9, lluvia: 82, codigo: 80, viento: 27, cielo: 'Chaparrones' },
    { fecha: '2026-09-30', dia: 'mié', max: 13, min: 8, lluvia: 0, codigo: 3, viento: 29, cielo: 'Nublado' },
  ],
};

test('clima: la mañana, la noche y el aviso entran enteros, sin pisar la firma', () => {
  const base = {
    temp: 18, cielo: 'Chaparrones fuertes con tormenta', max: 18, min: 11, sensacion: 17, viento: 14, rumbo: 'NE',
    cajas: CLIMA.dias.map((d, i) => cajaDeDia(d, i === 0 ? 'HOY' : null)),
  };
  revisarCajas(placaClima({ ...base, fecha: 'Miércoles 30 de septiembre' }), 'clima de la mañana');
  revisarCajas(placaClima({
    ...base, fecha: 'Cómo sigue el día', kicker: 'Esta noche en Balcarce', etiqueta: 'Ahora', pronostico: { titulo: 'Mañana', texto: pronosticoDe(CLIMA.dias[1]) },
  }), 'clima de la noche');
  revisarCajas(placaClima({
    ...base, fecha: 'Tormenta con granizo hoy', kicker: 'Aviso de clima · hoy', aviso: { texto: 'El pronóstico da tormenta con granizo para hoy en Balcarce. Guardá los autos bajo techo y evitá salir durante la tormenta.' },
  }), 'aviso de clima');
});

test('clima: el recuadro de mañana no repite la lluvia y el ícono sigue al cielo', () => {
  assert.deepEqual(cajaDeDia(CLIMA.dias[1], 'MAÑANA'), { titulo: 'MAÑANA · 82% lluvia', valor: '14°', secundario: '9°' });
  assert.deepEqual(cajaDeDia(CLIMA.dias[2]), { titulo: 'MIÉ', valor: '13°', secundario: '8°' });
  assert.equal(pronosticoDe(CLIMA.dias[1]), 'Chaparrones. Entre 9° y 14°, con 82% de probabilidad de lluvia y viento de hasta 27 km/h.');
  assert.equal(iconoDelCielo('Chaparrones fuertes'), 'lluvia');
  assert.equal(iconoDelCielo('Nublado'), 'nube');
  assert.equal(iconoDelCielo('Despejado', { esDeDia: false }), 'luna');
  assert.equal(iconoDelCielo('Parcialmente nublado'), 'sol-nube');
});

test('el clima nunca lleva el dólar: si se mueve, sale como nota propia', () => {
  const svg = placaClima({ temp: 18, cielo: 'Nublado', max: 18, min: 11, fecha: 'Lunes 28 de septiembre', dolar: { oficial: 1545, blue: 1560, cuando: 'x' } });
  assert.doesNotMatch(svg, /Dólar|Oficial|Blue|1\.545/);
});

// ------------------------------------------------------------ la farmacia

test('farmacia: el día con tilde, los nombres como nombres y hasta cuándo dura el turno', () => {
  assert.equal(diaConTilde('MIERCOLES'), 'Miércoles');
  assert.equal(diaConTilde('SABADO'), 'Sábado');
  assert.equal(comoNombrePropio('DEL PATIO'), 'Del Patio');
  assert.equal(comoNombrePropio('San José de la Plaza'), 'San José de la Plaza');
  assert.equal(hastaCuandoElTurno('19:00'), 'De turno hasta mañana a las 8:30.');
  assert.equal(hastaCuandoElTurno('07:30'), 'De turno hasta hoy a las 8:30.');
  const svg = placaFarmacia({ farmacias: ['MEDRANO', 'DEL PATIO'], dia: 30, diaSemana: 'MIERCOLES', mes: 9, hasta: hastaCuandoElTurno('19:00') });
  assert.match(svg, /Miércoles 30 de septiembre/);
  assert.match(svg, /Del Patio/);
  assert.match(svg, /FARMACIAS DE TURNO/);
  assert.match(svg, new RegExp(COLORES.farmacia), 'la tarjeta lleva el borde verde');
});

test('farmacia: con tres farmacias y direcciones largas entra todo, sin pisar la firma', () => {
  revisarCajas(placaFarmacia({
    detalle: [
      { nombre: 'San José de la Plaza', direccion: 'Calle 17 N° 625 entre 16 y 18, frente a la plaza principal', telefono: '42-2181' },
      { nombre: 'Galindo', direccion: 'Calle 18 N° 715 e/ 19 y 21', telefono: '42-2181' },
      { nombre: 'Norte', direccion: 'Calle 15 esquina 8', telefono: '42-4656' },
    ],
    dia: 30, diaSemana: 'MIERCOLES', mes: 9, hasta: 'De turno hasta mañana a las 8:30.',
  }), 'farmacia con tres');
  revisarCajas(placaFarmacia({ detalle: [{ nombre: 'Medrano', direccion: 'Calle 28 esquina 19', telefono: '15-677121' }], dia: 28, diaSemana: 'LUNES', mes: 9 }), 'farmacia con una');
});

// ------------------------------------------------------------ las demás

test('útiles y agenda entran enteros', () => {
  revisarCajas(placaUtiles({
    grupos: [
      { categoria: 'Emergencias', items: [{ nombre: 'Emergencias (línea única)', numero: '911' }, { nombre: 'SAME', numero: '107' }, { nombre: 'Bomberos', numero: '100' }] },
      { categoria: 'Salud', items: [{ nombre: 'Hospital · conmutador', numero: '(02266) 42-2017 / 42-2018 / 43-0384 / 43-0449' }, { nombre: 'Hospital · dirección', numero: '(02266) 42-2964' }] },
      { categoria: 'Seguridad', items: [{ nombre: 'Comisaría de la Mujer', numero: '(02266) 43-1042' }] },
    ],
  }), 'útiles');
  revisarCajas(placaAgenda({
    eventos: [
      { cuando: 'viernes 21:00', nombre: 'Peña folclórica en el Club Unión', lugar: 'Club Unión' },
      { cuando: 'sábado 10:00', nombre: 'Feria de emprendedores en la plaza Libertad con música en vivo y juegos para chicos', lugar: 'Plaza Libertad' },
      { cuando: 'domingo', nombre: 'Carrera de TC Pick Up en el Autódromo Juan Manuel Fangio', lugar: 'Autódromo' },
      { cuando: 'domingo 18:00', nombre: 'Cine al aire libre', lugar: 'Anfiteatro' },
    ],
  }), 'agenda');
});

test('ninguna placa del plan nombra a un medio ni lleva la fuente adentro', () => {
  const nota = (id, seccion, titulo) => ({
    id, seccion, titulo, copete: 'Algo pasó.', relevancia: 90, local: true, semaforo: 'verde', medios: ['Diario La Vanguardia', 'Radio Gabal (FM 104.1)'], enlace: 'https://www.diariolavanguardia.com/x', cuerpo: 'x '.repeat(80),
  });
  const datos = {
    yaPublicadas: true,
    notas: [nota('a1', 'Balcarce', 'Cortan el agua en el barrio norte'), nota('b2', 'Balcarce', 'Abre la inscripción a los talleres'), nota('c3', 'Balcarce', 'Vuelve la feria al parque')],
    clima: CLIMA,
    farmacias: { turnos: [{ dia: new Date().getDate(), diaSemana: 'LUNES', mes: 9, farmacias: ['MEDRANO'], detalle: [{ nombre: 'Medrano', direccion: 'Calle 28 esquina 19' }] }] },
  };
  const { piezas } = planDelDia(datos, { libro: null, estado: {}, eventos: [] });
  assert.ok(piezas.length >= 3, 'el plan no armó piezas');
  for (const p of piezas.filter((x) => x.svg)) {
    assert.doesNotMatch(p.svg, /Vanguardia|Gabal|Colegio de Farmac|Foto:|diariolavanguardia/i, `${p.nombre} nombra una fuente`);
    assert.doesNotMatch(p.svg, /Fraunces|IBM Plex/);
  }
});

// ------------------------------------------------------------ las tarjetas (Instagram y enlace)

test('tarjeta: el título largo nunca se corta y entra en su lugar, con o sin foto', () => {
  const largo = `${TITULOS_LARGOS[0]} y otras cosas más que agregó la redacción`;
  for (const formato of ['conFoto', 'sinFoto', 'enlace']) {
    for (const titulo of [...TITULOS_LARGOS, largo, 'Llueve']) {
      const r = repartirTexto({ titulo, copete: 'Una bajada.' }, formato);
      assert.ok(r.renglonesTitulo * r.tamTitulo * INTERLINEA_TITULO <= altoParaTexto(formato) + 1, `${formato}: "${titulo.slice(0, 30)}…" no entra (${r.renglonesTitulo} renglones a ${r.tamTitulo}px)`);
    }
  }
  // Uno corto sale grande.
  assert.ok(repartirTexto({ titulo: 'Llueve' }, 'conFoto').tamTitulo >= 70);
});

test('tarjeta: la bajada se corta en una palabra entera y sólo con lo que sobra', () => {
  const copete = 'El Senado convirtió en ley el recorte del beneficio de Zona Fría para 94 distritos bonaerenses, entre ellos Balcarce. Varios municipios afectados, como Bahía Blanca, ya anunciaron que irán a la Justicia contra la medida y otros analizan sumarse.';
  const r = repartirTexto({ titulo: 'El recorte de la Zona Fría abre la vía judicial y afecta a Balcarce', copete }, 'conFoto');
  assert.ok(r.bajada.length > 40, 'con un título de dos renglones tiene que entrar la bajada');
  assert.ok(r.bajada.endsWith('…') && copete.startsWith(r.bajada.slice(0, -1)), 'se corta en una palabra entera, con puntos suspensivos');
  assert.equal(bajadaQueEntra('Corta.', 30, 900, 2), 'Corta.');
  assert.equal(bajadaQueEntra('Algo', 30, 900, 0), '');
  // Sin foto y en la apaisada no va bajada (el lienzo no la lleva).
  assert.equal(repartirTexto({ titulo: 'x', copete }, 'sinFoto').bajada, '');
});

test('tarjeta: el texto queda dentro de la zona segura de la grilla y el nombre de la sección entra', () => {
  const alto = TAMANO_INSTAGRAM.height;
  assert.ok(INSTAGRAM.foto + INSTAGRAM.franja + 44 + altoParaTexto('conFoto') + 24 + INSTAGRAM.pie <= alto - INSTAGRAM.abajo);
  assert.ok(anchoParaTexto('conFoto') <= TAMANO_INSTAGRAM.width - 2 * 34);
  for (const s of Object.keys(COLOR_SECCION)) {
    const tam = tamNombreDeSeccion(s);
    assert.ok(tam >= 60, `${s}: el nombre sale demasiado chico (${tam})`);
  }
});

test('tarjeta: la foto sale del banco propio y el crédito nunca se dibuja adentro', () => {
  const publica = path.join(RAIZ, 'web', 'public');
  const banco = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'banco-fotos.json'), 'utf8'));
  const [id, conFoto] = Object.entries(banco).find(([, v]) => v.archivo && fs.existsSync(path.join(publica, v.archivo))) ?? [];
  if (id) {
    const f = fotoDeLaNota({ id, foto: { archivo: conFoto.archivo, credito: conFoto.credito } }, publica);
    assert.ok(f && fs.existsSync(f.ruta));
    assert.match(f.tipo, /^image\/(jpeg|png|webp)$/);
  }
  assert.equal(fotoDeLaNota({ id: 'x' }, publica), null, 'sin foto en el banco, placa sin foto');
  assert.equal(fotoDeLaNota({ foto: { archivo: 'fotos-notas/no-existe.jpg' } }, publica), null);
  assert.equal(fotoDeLaNota({ foto: { archivo: '../../.env' } }, publica), null, 'nunca un archivo de afuera de public');
  // La tarjeta no escribe el crédito, el medio ni el enlace original.
  const codigo = fs.readFileSync(path.join(RAIZ, 'web', 'lib', 'tarjeta.js'), 'utf8')
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(codigo, /\.credito|\.medios|nota\.enlace|fuentesConsultadas/, 'la tarjeta no puede dibujar la fuente');
  assert.equal(fechaCorta({ publicadaCuando: '2026-09-28T16:31:05Z' }), '28 sep');
  assert.equal(fechaCorta({}), '');
});
