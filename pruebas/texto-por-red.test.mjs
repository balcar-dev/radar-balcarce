// El texto de cada red: los hashtags fijos y el generador por red (regla 281, 17/10/2026). Sin red.
//
// Hernán: "revisá el formato del texto de lo que va en Facebook, en Instagram y en cada red social: no todas usan el mismo ni respetan los links. Los
// hashtags: 'Balcarce' y 'Radar Balcarce' deberían ser FIJOS y después, según la nota, los que correspondan."
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hashtagsDe, armarHashtags, mensajeDeNota, HASHTAGS_FIJOS } from '../redes/elegir.mjs';
import { pieDePieza, hashtagsDePieza, PODCASTS } from '../redes/piezas.mjs';
import { textoParaRed, FORMATO_POR_RED, REDES_QUE_PUBLICAN, largoEn, recortarPara, facetasDeBluesky } from '../redes/texto-por-red.mjs';
import { fijarEnlacesCortos, soltarEnlacesCortos } from '../redes/enlaces-cortos.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { POSTEO } from '../ingesta/criterio.mjs';

const SITIO = 'https://radarbalcarce.com';
const nota = {
  id: 'dg5er4', titulo: 'Reabre el Autódromo Fangio con un fin de semana de carreras', slug: 'x',
  copete: 'El circuito vuelve a abrir sus puertas con una agenda completa de automovilismo y actividades para toda la familia.',
  textoRedes: 'Este fin de semana reabre el Autódromo Juan Manuel Fangio con carreras y propuestas para toda la familia.',
  etiquetas: ['autódromo', 'Fangio', 'Radar Balcarce', 'automovilismo', 'turismo'], seccion: 'Automovilismo', local: true,
  foto: { archivo: 'fotos-notas/dg5er4.jpg', credito: 'Foto: El Diario Balcarce' },
};
const repaso = { tipo: 'reel', nombre: 'noticia1', titulo: 'El repaso de la mañana', dia: '2026-10-17', items: [{ titulo: 'Reabre el Autódromo Fangio' }, { titulo: 'Cortan el agua en el barrio norte' }, { titulo: 'Campo de Pato gana en Rugby' }] };

const hashtagsDel = (t) => t.match(/#\p{L}[\p{L}\p{N}]*/gu) ?? [];

test('los hashtags fijos van primero y en orden, siempre, aunque la nota sea de afuera o no traiga etiquetas', () => {
  assert.deepEqual(HASHTAGS_FIJOS, ['Balcarce', 'RadarBalcarce']);
  assert.deepEqual(hashtagsDe({ ...nota, etiquetas: [] }).slice(0, 2), ['#Balcarce', '#RadarBalcarce']);
  assert.deepEqual(hashtagsDe({ titulo: 'Algo', seccion: 'Economía', local: false }), ['#Balcarce', '#RadarBalcarce', '#Economía'], 'sin etiquetas, el tema de la sección');
  assert.deepEqual(hashtagsDe({ titulo: 'Algo', seccion: 'Argentina' }), ['#Balcarce', '#RadarBalcarce'], 'Argentina no dice nada: sólo los fijos');
  assert.deepEqual(hashtagsDe(nota), ['#Balcarce', '#RadarBalcarce', '#Autódromo', '#Fangio', '#Automovilismo']);
});

test('sin duplicar (ni "Balcarce" ni "Radar Balcarce" otra vez, ni con otra tilde o mayúscula) y con el tope de Instagram: cinco', () => {
  const t = hashtagsDe({ etiquetas: ['balcarce', 'RADAR BALCARCE', 'Obras públicas', 'obras publicas', 'agua', 'barrio norte', 'cooperativa'], seccion: 'Balcarce' });
  assert.deepEqual(t, ['#Balcarce', '#RadarBalcarce', '#ObrasPúblicas', '#Agua', '#BarrioNorte']);
  assert.ok(t.length <= HASHTAGS_FIJOS.length + POSTEO.hashtagsMaximo);
  assert.equal(HASHTAGS_FIJOS.length + POSTEO.hashtagsMaximo, 5, 'dos fijos y tres de la nota son cinco: el tope que Instagram anunció en diciembre de 2025');
  assert.deepEqual(armarHashtags(['#Uno', 'Uno', 'dos palabras largas'], 1), ['#Balcarce', '#RadarBalcarce', '#Uno']);
});

test('el posteo lleva los hashtags al final, con y sin textoRedes, y Instagram no lleva enlace', () => {
  for (const n of [nota, { ...nota, textoRedes: undefined }]) {
    for (const fuente of ['facebook', 'instagram']) {
      const m = mensajeDeNota(n, SITIO, { fuente });
      assert.deepEqual(hashtagsDel(m).slice(0, 2), ['#Balcarce', '#RadarBalcarce'], m);
      assert.ok(hashtagsDel(m).length <= 5, m);
      assert.deepEqual(revisarTexto(m, { tipo: 'texto' }), [], m);
    }
    assert.match(mensajeDeNota(n, SITIO, { fuente: 'facebook' }), /https:\/\/radarbalcarce\.com\/nota\/.+\?utm_source=facebook/);
    assert.ok(!/https?:|utm_/.test(mensajeDeNota(n, SITIO, { fuente: 'instagram' })));
  }
});

test('el pie de los reels también lleva los fijos primero y un tema de la pieza, después del aviso de la voz', () => {
  assert.deepEqual(hashtagsDePieza(repaso), ['#Balcarce', '#RadarBalcarce', '#Noticias']);
  assert.deepEqual(hashtagsDePieza({ nombre: 'farmacia' }), ['#Balcarce', '#RadarBalcarce', '#FarmaciaDeTurno']);
  assert.deepEqual(hashtagsDePieza({ nombre: 'aviso-granizo' }).at(-1), '#Clima');
  assert.deepEqual(hashtagsDePieza({ nombre: 'rara' }), ['#Balcarce', '#RadarBalcarce']);
  for (const p of PODCASTS) {
    for (const red of ['facebook', 'instagram']) {
      const pie = pieDePieza({ tipo: 'reel', nombre: p.nombre, titulo: p.titulo, items: repaso.items, dia: '2026-10-17' }, red);
      assert.match(pie, /Voz generada con inteligencia artificial\.\n\n#Balcarce #RadarBalcarce #Noticias$/, pie);
    }
  }
  assert.equal(pieDePieza({ tipo: 'historia', nombre: 'clima-manana' }), '', 'las historias no llevan texto');
});

// ------------------------------------------------------- el generador por red

test('cada red tiene su fila de formato y las dos que publican hoy son Facebook e Instagram', () => {
  assert.deepEqual(Object.keys(FORMATO_POR_RED).sort(), ['bluesky', 'facebook', 'instagram', 'telegram', 'threads', 'tiktok', 'whatsapp', 'x', 'youtube']);
  assert.deepEqual(REDES_QUE_PUBLICAN, ['facebook', 'instagram']);
  assert.throws(() => textoParaRed('myspace', { tipo: 'nota', nota }), /Red desconocida/);
  assert.equal(FORMATO_POR_RED.instagram.hashtags, 5);
  assert.equal(FORMATO_POR_RED.threads.hashtags, 1, 'Threads: una sola etiqueta de tema por posteo');
  assert.equal(FORMATO_POR_RED.x.maximo, 280);
  assert.equal(FORMATO_POR_RED.bluesky.maximo, 300);
  assert.equal(FORMATO_POR_RED.telegram.maximo, 4096);
});

test('una nota para cada red: entra en su máximo, nunca nombra la fuente, y el enlace va donde se puede', () => {
  soltarEnlacesCortos();
  const nombres = Object.keys(FORMATO_POR_RED);
  for (const red of nombres) {
    const r = textoParaRed(red, { tipo: 'nota', nota, sitio: SITIO });
    if (!r.publicable) { assert.ok(['tiktok', 'youtube'].includes(red), `${red} tendría que publicar notas`); assert.match(r.motivo, /video/); continue; }
    assert.ok(r.cabe, `${red}: ${r.avisos.join('; ')}`);
    assert.ok(!/Diario Balcarce\b(?!.*Foto)|Infobae|Clarín/.test(r.texto.replace(/Foto: El Diario Balcarce/, '')), `${red} nombró a la fuente`);
    assert.doesNotMatch(r.texto, /\r|en vivo/i);
  }
  const fb = textoParaRed('facebook', { tipo: 'nota', nota, sitio: SITIO });
  assert.equal(fb.texto, mensajeDeNota(nota, SITIO, { fuente: 'facebook' }) + '\n\nFoto: El Diario Balcarce', 'Facebook usa el texto que ya se publica');
  const ig = textoParaRed('instagram', { tipo: 'nota', nota, sitio: SITIO });
  assert.equal(ig.enlace, null);
  assert.match(ig.texto, /link en la bio/);
  assert.ok(!/https?:/.test(ig.texto));
  const th = textoParaRed('threads', { tipo: 'nota', nota, sitio: SITIO });
  assert.equal(th.etiquetaDeTema, 'Balcarce');
  assert.ok(!th.texto.includes('#'), 'Threads: la etiqueta va aparte, en su campo');
  assert.match(th.texto, /utm_source=threads/);
  const x = textoParaRed('x', { tipo: 'nota', nota, sitio: SITIO });
  assert.ok(!/https?:/.test(x.texto), 'X sin enlace por defecto: cada posteo con enlace cuesta 13 veces más');
  assert.deepEqual(hashtagsDel(x.texto), ['#Balcarce', '#RadarBalcarce'], 'X: dos hashtags como mucho');
  const xConEnlace = textoParaRed('x', { tipo: 'nota', nota, sitio: SITIO, conEnlace: true });
  assert.match(xConEnlace.texto, /utm_source=x/);
  assert.ok(xConEnlace.largo <= 280, 'la URL cuenta 23 aunque mida más');
  const tg = textoParaRed('telegram', { tipo: 'nota', nota, sitio: SITIO });
  assert.match(tg.texto, /utm_source=telegram/);
  assert.equal(tg.maximo, 4096);
  const wa = textoParaRed('whatsapp', { tipo: 'nota', nota, sitio: SITIO });
  assert.ok(!wa.texto.includes('#'), 'el canal de WhatsApp: sin hashtags');
  assert.ok(wa.avisos.some((a) => /API/.test(a)), 'avisa que va a mano');
});

test('X cuenta cada enlace como 23 y cada emoji como 2; Bluesky cuenta letras (graphemes); Threads, los emojis por bytes', () => {
  const url = 'https://radarbalcarce.com/nota/un-titular-largo-largo-largo-abc123?utm_source=x&utm_medium=social&utm_campaign=posteo&utm_content=abc123';
  assert.equal(largoEn('x', `hola ${url}`), 5 + 23);
  assert.equal(largoEn('x', '😀'), 2);
  assert.equal(largoEn('bluesky', '👨‍👩‍👧 hola'), 6, 'una familia es una sola letra');
  assert.equal(largoEn('threads', '😀'), 4);
  assert.equal(largoEn('telegram', 'ñandú'), 5);
});

test('un titular larguísimo se recorta en una palabra entera para entrar', () => {
  const largo = Array.from({ length: 60 }, (_, i) => `palabra${i}`).join(' ');
  for (const red of ['x', 'bluesky', 'threads']) {
    const r = textoParaRed(red, { tipo: 'nota', nota: { ...nota, titulo: largo, textoRedes: undefined, copete: '' }, sitio: SITIO });
    assert.ok(r.cabe, `${red}: ${r.largo}/${r.maximo}`);
    assert.match(r.texto, /palabra\d+…/);
  }
  assert.equal(recortarPara('x', 'corto', 50), 'corto');
});

test('Bluesky: el enlace y los hashtags salen como facetas con posiciones en BYTES', () => {
  const texto = 'ñandú ¡hola! https://radarbalcarce.com/r/b/dg5er4 #Balcarce';
  const f = facetasDeBluesky(texto);
  const bytes = new TextEncoder().encode(texto);
  const corte = (i) => new TextDecoder().decode(bytes.slice(i.byteStart, i.byteEnd));
  assert.equal(f.length, 2);
  assert.equal(corte(f[0].index), 'https://radarbalcarce.com/r/b/dg5er4');
  assert.equal(f[0].features[0].uri, 'https://radarbalcarce.com/r/b/dg5er4');
  assert.equal(corte(f[1].index), '#Balcarce');
  assert.equal(f[1].features[0].tag, 'Balcarce');
  const r = textoParaRed('bluesky', { tipo: 'nota', nota, sitio: SITIO });
  assert.equal(r.facetas.length, 3, 'enlace y dos hashtags');
});

test('un repaso para cada red: Facebook e Instagram como ya salen; las demás, a su medida', () => {
  soltarEnlacesCortos();
  const fb = textoParaRed('facebook', { tipo: 'reel', pieza: repaso });
  assert.equal(fb.texto, pieDePieza(repaso, 'facebook'));
  assert.match(fb.texto, /nota\/repaso20261017manana\?utm_source=facebook/);
  const ig = textoParaRed('instagram', { tipo: 'reel', pieza: repaso });
  assert.ok(!/https?:/.test(ig.texto));
  const tg = textoParaRed('telegram', { tipo: 'reel', pieza: repaso });
  assert.ok(tg.maximo === 1024 && tg.cabe, 'el pie de un video en Telegram llega a 1.024');
  assert.match(tg.texto, /Voz generada con inteligencia artificial\./);
  const yt = textoParaRed('youtube', { tipo: 'reel', pieza: repaso });
  assert.ok(yt.titulo.length <= 100 && /Radar Balcarce/.test(yt.titulo));
  assert.ok(!/https?:/.test(yt.descripcion), 'en un Short los enlaces no se tocan: se dice la dirección');
  assert.ok(hashtagsDel(yt.descripcion).length <= 3, 'YouTube muestra tres arriba del título');
  const tk = textoParaRed('tiktok', { tipo: 'reel', pieza: repaso });
  assert.match(tk.texto, /link en la bio/);
  for (const red of ['threads', 'x', 'bluesky']) assert.ok(textoParaRed(red, { tipo: 'reel', pieza: repaso }).cabe, red);
  assert.ok(!/https?:/.test(textoParaRed('x', { tipo: 'reel', pieza: repaso }).texto));
  // Una historia no lleva texto en ninguna red.
  for (const red of Object.keys(FORMATO_POR_RED)) assert.equal(textoParaRed(red, { tipo: 'historia', pieza: { nombre: 'clima-manana', tipo: 'historia' } }).publicable, false, red);
});

test('con los enlaces cortos prendidos, el mismo texto pesa mucho menos y no pierde de qué red viene', () => {
  soltarEnlacesCortos();
  const largo = textoParaRed('facebook', { tipo: 'nota', nota, sitio: SITIO });
  fijarEnlacesCortos('Si');
  try {
    const corto = textoParaRed('facebook', { tipo: 'nota', nota, sitio: SITIO });
    assert.match(corto.texto, /https:\/\/radarbalcarce\.com\/r\/f\/dg5er4\b/);
    assert.ok(!corto.texto.includes('utm_'));
    assert.ok(corto.largo < largo.largo - 70, `${corto.largo} contra ${largo.largo}`);
    assert.match(textoParaRed('telegram', { tipo: 'nota', nota, sitio: SITIO }).texto, /\/r\/t\/dg5er4/);
    assert.match(textoParaRed('facebook', { tipo: 'reel', pieza: repaso }).texto, /\/r\/f\/repaso20261017manana/);
    assert.match(textoParaRed('facebook', { tipo: 'reel', pieza: { tipo: 'reel', nombre: 'farmacia', titulo: 'Farmacia de turno: Del Pueblo' } }).texto, /\/r\/f\/farmacia/);
  } finally { soltarEnlacesCortos(); }
});

test('el archivo de formatos dice lo mismo que el código: las nueve redes y sus máximos', () => {
  const doc = fs.readFileSync(path.join(import.meta.dirname, '..', 'docs', 'redes', 'FORMATOS-POR-RED.md'), 'utf8');
  for (const [red, f] of Object.entries(FORMATO_POR_RED)) {
    assert.ok(doc.includes(f.nombre), `FORMATOS-POR-RED.md no nombra a ${f.nombre}`);
    if (f.maximo && red !== 'facebook') assert.ok(doc.includes(String(f.maximo).replace(/\B(?=(\d{3})+(?!\d))/g, '.')) || doc.includes(String(f.maximo)), `${red}: falta el máximo ${f.maximo} en el documento`);
  }
  assert.match(doc, /textoParaRed/);
  assert.match(doc, /SIN VERIFICAR/);
});
