// Las redes: qué se publica en Facebook e Instagram, y cómo se habla con Meta.
//
// Nada de esto toca la red: el cliente recibe un fetch de mentira. Lo que se
// vigila es lo que no puede fallar en silencio: que el token no se filtre,
// que nada se publique dos veces y que lo delicado espere a una persona.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente, ErrorMeta, sinToken } from '../redes/meta.mjs';
import {
  elegirParaFacebook, mensajeDeNota, mensajeParaInstagram, enlaceDeNota, imagenDeNota, libroNuevo, anotar, yaPublicada, horaAR, REGLAS_FACEBOOK,
  minutoDelDiaAR, temaParecido,
} from '../redes/elegir.mjs';

const TOKEN = 'TOKEN-SECRETO-123';

/** Un fetch de mentira: contesta lo que se le diga y anota qué se le pidió. */
function fetchFalso(respuestas) {
  const pedidos = [];
  const fn = async (url, init) => {
    pedidos.push({ url: String(url), init });
    const r = respuestas.shift();
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return { fn, pedidos };
}

const PAGINA = {
  json: {
    name: 'Radar Balcarce', link: 'https://facebook.com/radar',
    access_token: 'TOKEN-DE-PAGINA', instagram_business_account: { id: '999', username: 'radarbalcarce' },
  },
};

// ------------------------------------------------------------------- Meta

test('el token viaja en el encabezado y nunca en la dirección', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  await api.publicarEnFacebook({ mensaje: 'hola', enlace: 'https://radarbalcarce.com/nota/x' });

  for (const p of pedidos) {
    assert.ok(!p.url.includes('TOKEN'), `el token está en la dirección: ${p.url}`);
    assert.match(p.init.headers.Authorization, /^Bearer /);
  }
  // Y las publicaciones se hacen con el token de la página, no con el del usuario.
  assert.equal(pedidos[1].init.headers.Authorization, 'Bearer TOKEN-DE-PAGINA');
});

test('un posteo lleva el mensaje y el enlace de nuestro sitio', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: '1_2' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });
  const r = await api.publicarEnFacebook({ mensaje: 'Titular', enlace: 'https://radarbalcarce.com/nota/x' });

  assert.equal(r.id, '1_2');
  const cuerpo = new URLSearchParams(pedidos[1].init.body);
  assert.equal(cuerpo.get('message'), 'Titular');
  assert.equal(cuerpo.get('link'), 'https://radarbalcarce.com/nota/x');
  assert.ok(pedidos[1].url.endsWith('/123/feed'));
});

test('un error de Meta llega sin el token adentro y avisa si el token murió', async () => {
  const { fn } = fetchFalso([{
    ok: false, status: 400,
    json: { error: { message: `Invalid OAuth access token ${TOKEN}`, code: 190, type: 'OAuthException' } },
  }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn });

  await assert.rejects(api.pagina(), (e) => {
    assert.ok(e instanceof ErrorMeta);
    assert.ok(!e.message.includes(TOKEN), 'el mensaje repite el token');
    assert.equal(e.tokenMuerto, true);
    return true;
  });
});

test('sinToken borra el token de cualquier texto', () => {
  assert.equal(sinToken(`a ${TOKEN} b ${TOKEN}`, TOKEN), 'a *** b ***');
  assert.equal(sinToken('nada', ''), 'nada');
});

test('una foto en Instagram espera a que el contenedor esté listo antes de publicar', async () => {
  const { fn, pedidos } = fetchFalso([
    PAGINA,
    { json: { id: 'cont1' } },                    // crea el contenedor
    { json: { status_code: 'IN_PROGRESS' } },     // todavía no
    { json: { status_code: 'FINISHED' } },        // listo
    { json: { id: 'media1' } },                   // publica
  ]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  const r = await api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'pie' });

  assert.equal(r.id, 'media1');
  assert.ok(pedidos.at(-1).url.endsWith('/999/media_publish'));
  assert.equal(new URLSearchParams(pedidos.at(-1).init.body).get('creation_id'), 'cont1');
});

test('Instagram rechaza la imagen: no se publica nada', async () => {
  const { fn, pedidos } = fetchFalso([PAGINA, { json: { id: 'c' } }, { json: { status_code: 'ERROR' } }]);
  const api = crearCliente({ token: TOKEN, paginaId: '123', fetchFn: fn, esperar: async () => {} });
  await assert.rejects(api.publicarFotoEnInstagram({ imagenUrl: 'https://x/y.jpg', pie: 'p' }), /rechaz/);
  assert.ok(!pedidos.some((p) => p.url.includes('media_publish')));
});

test('sin token o sin página, el cliente ni arranca', () => {
  assert.throws(() => crearCliente({ token: '', paginaId: '1' }), /token/i);
  assert.throws(() => crearCliente({ token: 'x', paginaId: '' }), /página/i);
});

// ------------------------------------------------------------ qué se elige

/** Las 15:00 del 21/09 en Balcarce. */
const AHORA = new Date('2026-09-21T15:00:00-03:00');
const haceMin = (m) => new Date(AHORA.getTime() - m * 60000).toISOString();

const nota = (extra = {}) => ({
  id: 'abc', titulo: 'Un titular', copete: 'Un copete', seccion: 'Deportes', relevancia: 90,
  medios: ['Diario La Vanguardia'], publicadaPor: 'ia', publicadaCuando: haceMin(60), ...extra,
});

test('la hora se cuenta en Balcarce, no en UTC', () => {
  assert.equal(horaAR(new Date('2026-09-21T15:00:00-03:00')), 15);
  assert.equal(horaAR(new Date('2026-09-21T00:30:00-03:00')), 0);
});

test('una nota fuerte y reciente se publica', () => {
  const r = elegirParaFacebook({ notas: [nota()], ahora: AHORA });
  assert.equal(r.length, 1);
});

test('Política y Policiales no salen solas a las redes', () => {
  // En la web las frena el semáforo; en una red viaja un titular sin contexto
  // y a un vecino lo nombra. Para esas secciones decide una persona.
  for (const seccion of ['Política', 'Policiales']) {
    assert.equal(elegirParaFacebook({ notas: [nota({ seccion })], ahora: AHORA }).length, 0, seccion);
  }
});

test('una nota se publica una sola vez', () => {
  const libro = anotar(libroNuevo(), 'facebook', 'abc', {}, new Date(AHORA.getTime() - 5 * 3600000));
  assert.ok(yaPublicada(libro, 'facebook', 'abc'));
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);
});

test('no se publica de madrugada', () => {
  const noche = new Date('2026-09-21T03:00:00-03:00');
  const n = nota({ publicadaCuando: new Date(noche.getTime() - 3600000).toISOString() });
  assert.equal(elegirParaFacebook({ notas: [n], ahora: noche }).length, 0);
});

test('hay que esperar a que la nota exista en la web', () => {
  // Publicar el enlace antes del deploy deja a Facebook con una tarjeta de
  // "página no encontrada" guardada.
  const recien = nota({ publicadaCuando: haceMin(3) });
  assert.equal(elegirParaFacebook({ notas: [recien], ahora: AHORA }).length, 0);
});

test('lo viejo no se publica', () => {
  const vieja = nota({ publicadaCuando: haceMin(REGLAS_FACEBOOK.edadMaximaHoras * 60 + 30) });
  assert.equal(elegirParaFacebook({ notas: [vieja], ahora: AHORA }).length, 0);
});

test('lo flojo no se publica', () => {
  assert.equal(elegirParaFacebook({ notas: [nota({ relevancia: 60 })], ahora: AHORA }).length, 0);
});

test('hay un tope diario y un respiro entre posteos', () => {
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'uno', {}, new Date(AHORA.getTime() - 30 * 60000));
  // Salió una hace media hora: todavía es pronto.
  assert.equal(elegirParaFacebook({ notas: [nota()], libro, ahora: AHORA }).length, 0);

  // Ya pasó el respiro, pero con el tope del día hecho no sale otra.
  const lleno = libroNuevo();
  for (let i = 0; i < REGLAS_FACEBOOK.porDia; i += 1) {
    anotar(lleno, 'facebook', `n${i}`, {}, new Date(`2026-09-21T${String(8 + i).padStart(2, '0')}:00:00-03:00`));
  }
  assert.equal(elegirParaFacebook({ notas: [nota()], libro: lleno, ahora: AHORA }).length, 0);

  // Con un lugar libre, sí.
  const casi = libroNuevo();
  for (let i = 0; i < REGLAS_FACEBOOK.porDia - 1; i += 1) {
    anotar(casi, 'facebook', `n${i}`, {}, new Date(`2026-09-21T${String(8 + i).padStart(2, '0')}:00:00-03:00`));
  }
  assert.equal(elegirParaFacebook({ notas: [nota()], libro: casi, ahora: new Date('2026-09-21T15:30:00-03:00') }).length, 1);
});

test('el tope y el piso de Facebook son los conservadores que se decidieron', () => {
  // 5 por día y relevancia 75: en las últimas 24 horas la web publicó unas 100
  // notas y publicarlas todas en Facebook sería ruido.
  assert.equal(REGLAS_FACEBOOK.porDia, 5);
  assert.equal(REGLAS_FACEBOOK.relevanciaMinima, 75);
});

test('sale de a una por vez, la más fuerte primero', () => {
  const r = elegirParaFacebook({
    notas: [nota({ id: 'a', relevancia: 82 }), nota({ id: 'b', relevancia: 95 })], ahora: AHORA,
  });
  assert.deepEqual(r.map((n) => n.id), ['b']);
});

// ------------------------------------------- horario y temas repetidos (25/09)

test('Facebook publica hasta las 22:00 en punto, no hasta las 22:59', () => {
  // Pasó el 24/09: "hasta las 22" se comparaba por hora y salió un posteo a
  // las 22:25.
  assert.equal(minutoDelDiaAR(new Date('2026-09-24T22:00:00-03:00')), 22 * 60);
  const aLas = (hhmm) => {
    const ahora = new Date(`2026-09-24T${hhmm}:00-03:00`);
    const n = nota({ publicadaCuando: new Date(ahora.getTime() - 60 * 60000).toISOString() });
    return elegirParaFacebook({ notas: [n], ahora }).length;
  };
  assert.equal(aLas('21:45'), 1);
  assert.equal(aLas('22:00'), 1);
  assert.equal(aLas('22:01'), 0);
  assert.equal(aLas('22:25'), 0, 'salió a las 22:25 como el 24/09');
  assert.equal(aLas('07:59'), 0);
  assert.equal(aLas('08:00'), 1);
});

test('no se publica en Facebook un tema que ya salió en las últimas 24 horas', () => {
  // El 24/09 salieron tres posteos de la reapertura del autódromo en cuatro
  // horas. Los titulares son los de ese día, tal cual.
  const ahora = new Date('2026-09-24T21:25:00-03:00');
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'lcvlqf', {
    titulo: 'Vuelve el TC al tradicional autódromo Juan Manuel Fangio: la categoría Pick Up protagonizará la reapertura del circuito',
  }, new Date('2026-09-24T17:32:00-03:00'));
  const otraVez = nota({
    id: 'yaqf3p', titulo: 'Todo sobre la reapertura del autódromo Juan Manuel Fangio', publicadaCuando: new Date(ahora.getTime() - 60 * 60000).toISOString(),
  });
  assert.equal(elegirParaFacebook({ notas: [otraVez], libro, ahora }).length, 0);

  // Otro tema, sí sale.
  const otra = nota({ id: 'krgsl6', titulo: 'Jóvenes balcarceñas participarán de un torneo internacional de básquet en Mar del Plata', publicadaCuando: otraVez.publicadaCuando });
  assert.equal(elegirParaFacebook({ notas: [otraVez, otra], libro, ahora }).length, 1);
  assert.equal(elegirParaFacebook({ notas: [otraVez, otra], libro, ahora })[0].id, 'krgsl6');

  // Pasadas las 24 horas, el tema se puede volver a contar.
  const alOtroDia = new Date('2026-09-25T18:00:00-03:00');
  const deManana = { ...otraVez, publicadaCuando: new Date(alOtroDia.getTime() - 60 * 60000).toISOString() };
  assert.equal(elegirParaFacebook({ notas: [deManana], libro, ahora: alOtroDia }).length, 1);
});

test('el tema repetido se detecta también con el titular nuevo y los temas de la nota', () => {
  // El posteo salió con un titular sin pistas ("un fin de semana a fondo");
  // la IA lo reescribió después y la nota sigue en la portada con el titular
  // y los temas de ahora: se compara también contra eso.
  const ahora = new Date('2026-09-24T21:25:00-03:00');
  const libro = libroNuevo();
  anotar(libro, 'facebook', 'jul41g', { titulo: 'Balcarce se prepara para vivir un fin de semana «a fondo».' }, new Date('2026-09-24T19:05:00-03:00'));
  const publicada = nota({ id: 'jul41g', titulo: 'El Autódromo Juan Manuel Fangio reabre sus puertas en Balcarce', temas: ['autodromo', 'fangio'] });
  const candidata = nota({
    id: 'yaqf3p', titulo: 'Todo lo que tenés que saber para la reapertura del Fangio', temas: ['autodromo', 'fangio'],
  });
  assert.equal(elegirParaFacebook({ notas: [publicada, candidata], libro, ahora }).length, 0);
});

test('parecido de temas: ni tan estricto que deje pasar lo mismo, ni tan flojo que frene todo', () => {
  const t = (titulo, temas = []) => ({ titulo, temas });
  assert.ok(temaParecido(t('Reabre el Autódromo Juan Manuel Fangio en Balcarce'), t('Largas filas para ingresar al autódromo Fangio')));
  // Un tema en común solo no alcanza: se marca también por el cuerpo.
  assert.ok(!temaParecido(t('Todo lo que tenés que saber para la reapertura del Fangio', ['autodromo']), t('El intendente recibe a la maestra Wu Huimin en Balcarce', ['autodromo'])));
  // "Balcarce" y "Mar del Plata" están en todos lados: no dicen que sea lo mismo.
  assert.ok(!temaParecido(t('Balcarce Básquet sumó dos victorias en Mar del Plata'), t('Jóvenes balcarceñas en un torneo de básquet en Mar del Plata')));
  assert.ok(!temaParecido(t(undefined), t('Algo')));
});

// -------------------------------------------------------------- el mensaje

test('el mensaje lleva el enlace a la nota, dice cuándo lo resumió una IA y NO nombra la fuente', () => {
  const m = mensajeDeNota(nota({ id: 'abc', titulo: 'Un titular' }), 'https://radarbalcarce.com');
  assert.equal(m, 'Un titular\n\nUn copete\n\nLeé la nota completa: https://radarbalcarce.com/nota/un-titular-abc\n\nResumen hecho con IA');
  assert.ok(!/Fuente|Vanguardia/i.test(m), 'nombró la fuente en una red social');
});

test('el mensaje no dice IA si no fue la IA', () => {
  assert.ok(!mensajeDeNota(nota({ publicadaPor: null }), 'https://radarbalcarce.com').includes('IA'));
});

test('el enlace es de nuestro sitio, con el titular adentro', () => {
  assert.equal(
    enlaceDeNota({ id: 'abc', titulo: 'Nuevo mural de Fangio' }, 'https://radarbalcarce.com/'),
    'https://radarbalcarce.com/nota/nuevo-mural-de-fangio-abc',
  );
});

test('la imagen del posteo de Instagram es la tarjeta propia y VERTICAL (4:5) de la nota, no una foto ajena', () => {
  assert.equal(
    imagenDeNota({ id: 'abc', titulo: 'Nuevo mural de Fangio' }, 'https://radarbalcarce.com/'),
    'https://radarbalcarce.com/nota/nuevo-mural-de-fangio-abc/instagram.png',
  );
});

test('el mensaje de Instagram es el mismo que Facebook: con el enlace y sin la fuente', () => {
  const n = nota({ id: 'abc' });
  const m = mensajeParaInstagram(n, 'https://radarbalcarce.com');
  assert.equal(m, mensajeDeNota(n, 'https://radarbalcarce.com'));
  assert.match(m, /radarbalcarce\.com\/nota\//);
  assert.ok(!/Fuente/.test(m));
});

// ------------------------------------------------------- las claves de Gemini

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { claveRedaccion, claveRedes, leerVariable } from '../reels/claves.mjs';
import { elegirHistoriasDeNotas, elegirFeed, guionPodcast, mismoTema, sePuedeSola, estaActivo } from '../redes/elegir.mjs';

/** Un .env de mentira en una carpeta temporal. */
function envDe(contenido) {
  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'env-')), '.env');
  fs.writeFileSync(archivo, contenido);
  return archivo;
}

test('la clave de redes nunca cae en la de redactar', () => {
  // Si los reels usaran la clave vieja cuando falta la suya, un día de videos
  // se comería en silencio el cupo con el que se reescriben las notas.
  const archivo = envDe('GEMINI_API_KEY=vieja\n');
  assert.equal(claveRedes({ env: {}, archivo }), null);
  assert.equal(claveRedaccion({ env: {}, archivo }), 'vieja');
});

test('cada clave se lee con su nombre, sin confundirse por el prefijo', () => {
  const archivo = envDe('GEMINI_API_KEY=vieja\r\nGEMINI_API_KEY_REDES=de-redes\r\nGEMINI_API_KEY_REDACCION=de-redaccion\r\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'de-redes');
  assert.equal(claveRedaccion({ env: {}, archivo }), 'de-redaccion');
  assert.equal(leerVariable('GEMINI_API_KEY', { env: {}, archivo }), 'vieja');
});

test('el entorno manda sobre el archivo', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES=del-archivo\n');
  assert.equal(claveRedes({ env: { GEMINI_API_KEY_REDES: 'del-entorno' }, archivo }), 'del-entorno');
});

test('sin archivo ni variable no hay clave, y no se rompe', () => {
  assert.equal(claveRedes({ env: {}, archivo: path.join(os.tmpdir(), 'no-existe', '.env') }), null);
});

test('las comillas del .env no forman parte de la clave', () => {
  const archivo = envDe('GEMINI_API_KEY_REDES="con-comillas"\n');
  assert.equal(claveRedes({ env: {}, archivo }), 'con-comillas');
});

// ------------------------------------------------ reels, historias y podcast

const n = (id, titulo, seccion, relevancia, extra = {}) => ({ id, titulo, seccion, relevancia, local: true, semaforo: 'verde', ...extra });

test('Política y Policiales no se arman solas en ninguna pieza', () => {
  const notas = [
    n('a', 'Petruccelli pidió informes sobre el programa', 'Política', 98),
    n('b', 'Detuvieron a un hombre por un robo en Balcarce', 'Policiales', 95),
    n('c', 'Kevin Gómez volvió a Balcarce como campeón', 'Balcarce', 90),
  ];
  assert.deepEqual(elegirHistoriasDeNotas(notas).map((x) => x.id), ['c']);
  assert.deepEqual(elegirFeed(notas).map((x) => x.id), ['c']);
  assert.equal(sePuedeSola(notas[0]), false);
});

test('la misma noticia contada por dos medios no sale dos veces', () => {
  const a = n('a', 'Ferroviarios se quedó con el Apertura y jugará la final anual', 'Deportes', 100);
  const b = n('b', 'Desde los doce pasos, Ferro se llevó el Apertura', 'Deportes', 88);
  const c = n('c', 'Estudiantes crearon un mapa de EcoPuntos en la escuela', 'Balcarce', 85);
  assert.equal(mismoTema(a, b), true);
  assert.equal(mismoTema(a, c), false);
  // Y las historias no repiten lo que ya es reel.
  assert.deepEqual(elegirHistoriasDeNotas([a, b, c], [a]).map((x) => x.id), ['c']);
});

test('"Balcarce" no alcanza para decir que dos notas son lo mismo', () => {
  assert.equal(
    mismoTema({ titulo: 'Obras en el centro de Balcarce' }, { titulo: 'Un vecino de Balcarce ganó un premio' }),
    false,
  );
});

test('hay tres historias de notas como máximo, además de clima y farmacia', () => {
  const temas = ['mercado', 'biblioteca', 'hospital', 'cooperadora', 'autódromo', 'bomberos', 'polideportivo', 'carnaval'];
  const notas = temas.map((t, i) => n(`x${i}`, `El ${t} abre hoy`, 'Balcarce', 90 - i));
  assert.equal(elegirHistoriasDeNotas(notas).length, 3);
});

test('el podcast repasa los titulares del día y no inventa nada', () => {
  const notas = [
    n('a', 'Kevin Gómez volvió a Balcarce como campeón.', 'Balcarce', 100),
    n('b', 'Ferroviarios ganó el Apertura y va por la final', 'Deportes', 95),
    n('c', 'Petruccelli pidió informes sobre el programa', 'Política', 99),
  ];
  const g = guionPodcast(notas, { fecha: new Date('2026-09-21T12:00:00-03:00') });
  assert.match(g, /repaso de este lunes/);
  assert.match(g, /Primero: Kevin Gómez volvió a Balcarce como campeón\./);
  assert.match(g, /Y para cerrar: Ferroviarios ganó el Apertura y va por la final\./);
  assert.ok(!g.includes('Petruccelli'), 'coló una nota de Política');
});

test('con menos de dos noticias no hay podcast', () => {
  assert.equal(guionPodcast([n('a', 'Una sola noticia importante', 'Balcarce', 99)]), null);
});

// ---------------------------------------------- los datos del día sin panel

import { datosDeLaWeb } from '../redes/datos.mjs';

test('las piezas se pueden armar con lo ya publicado en la web', () => {
  const portada = {
    generado: '2026-09-21T10:00:00Z',
    notas: [{ id: 'a', titulo: 'Algo' }],
    clima: { ahora: { temp: 10 }, dias: [] },
    farmacias: { hoy: { dia: 21, farmacias: ['GALINDO'] }, proximos: [{ dia: 21 }, { dia: 22 }] },
  };
  const d = datosDeLaWeb(portada);
  assert.equal(d.notas.length, 1);
  assert.equal(d.clima.ahora.temp, 10);
  // El plan busca el turno por día: tiene que estar el de hoy y los que siguen.
  assert.deepEqual(d.farmacias.turnos.map((t) => t.dia), [21, 21, 22]);
});

test('sin farmacia ni clima en la web, no se rompe', () => {
  const d = datosDeLaWeb({ notas: [] });
  assert.deepEqual(d.farmacias.turnos, []);
  assert.equal(d.clima, null);
});

test('el interruptor acepta si, Si, SÍ y sí, y nada más', () => {
  // GitHub guardó la variable como "Si" y la comparación exacta la dejaba
  // apagada sin avisar.
  for (const v of ['si', 'Si', 'SI', 'sí', 'Sí', ' si ']) assert.equal(estaActivo(v), true, v);
  for (const v of ['', 'no', 'true', undefined, null, 'sino']) assert.equal(estaActivo(v), false, String(v));
});

// ------------------------------------------------------------ los podcasts

import { elegirParaPodcast, guionRepaso, primeraOracion } from '../redes/elegir.mjs';

const nn = (id, titulo, seccion, relevancia, extra = {}) => ({ id, titulo, seccion, relevancia, semaforo: 'verde', ...extra });

test('el podcast lee el copete sólo de las notas propias, y sin nombrar la fuente', () => {
  const g = guionRepaso([
    nn('a', 'Se reinaugura el autódromo', 'Automovilismo', 90, { guion: 'x', copete: 'El viernes habrá acto oficial. Y después más cosas.', medios: ['Puntonueve'] }),
    nn('b', 'Cortan el agua en el centro', 'Servicios', 80, { copete: 'Resumen copiado del medio de origen.', medios: ['El Diario'] }),
  ], { saludo: 'Buen día, Balcarce.' });
  assert.match(g, /^Buen día, Balcarce\. Primero: Se reinaugura el autódromo\. El viernes habrá acto oficial\. Y para cerrar: Cortan el agua en el centro\. Todas las notas/);
  assert.ok(!g.includes('copiado'), 'leyó el copete de una nota que no es nuestra');
  assert.ok(!/Puntonueve|El Diario|fuente/i.test(g));
});

test('un podcast con menos de dos notas no existe', () => {
  assert.equal(guionRepaso([nn('a', 'Sola', 'Balcarce', 90)], { saludo: 'Hola.' }), null);
});

test('los podcasts del día no repiten notas ni temas entre sí', () => {
  const notas = [
    nn('1', 'Reinauguran el autódromo Fangio con Kicillof', 'Automovilismo', 95),
    nn('2', 'Otra nota del autódromo Fangio con Kicillof', 'Automovilismo', 94),
    nn('3', 'Cortan el suministro de agua en el barrio', 'Servicios', 90),
    nn('4', 'Ferroviarios ganó y va por la final', 'Deportes', 88),
    nn('5', 'Nueva exposición en el museo municipal', 'Cultura', 85),
    nn('6', 'Vuelve la feria de artesanos al parque', 'Cultura', 80),
  ];
  const manana = elegirParaPodcast(notas, { cuantas: 3 });
  const tarde = elegirParaPodcast(notas, { cuantas: 3, excluir: manana });
  assert.deepEqual(manana.map((n) => n.id), ['1', '3', '4'], 'una por sección, de mayor a menor puntaje');
  assert.ok(tarde.every((n) => !manana.some((m) => m.id === n.id)));
  assert.ok(!tarde.some((n) => n.id === '2'), 'repitió el tema del autódromo en el segundo podcast');
});

test('nunca entra Política ni Policiales a un podcast, ni lo que está en rojo', () => {
  const r = elegirParaPodcast([
    nn('p', 'Concejo debate la ordenanza', 'Política', 99),
    nn('q', 'Choque en la ruta', 'Policiales', 98),
    nn('r', 'Algo sensible', 'Balcarce', 97, { semaforo: 'rojo' }),
    nn('s', 'Una nota común y corriente', 'Balcarce', 70),
  ], { cuantas: 4 });
  assert.deepEqual(r.map((n) => n.id), ['s']);
});

test('primeraOracion corta en el primer punto y descarta lo demasiado largo', () => {
  assert.equal(primeraOracion('Una. Dos.'), 'Una.');
  assert.equal(primeraOracion(''), '');
  assert.equal(primeraOracion(`${'palabra '.repeat(40)}fin.`), '');
});

test('un podcast prefiere secciones distintas antes que tres notas del mismo tema', () => {
  const notas = [
    nn('a1', 'Reapertura del autódromo con Kicillof presente', 'Automovilismo', 100),
    nn('a2', 'Largas filas por el regreso de las carreras', 'Automovilismo', 99),
    nn('a3', 'Los pilotos ya están en el circuito', 'Automovilismo', 98),
    nn('b1', 'Cortan el agua en el barrio norte', 'Servicios', 80),
    nn('c1', 'Nueva muestra en el museo municipal', 'Cultura', 70),
  ];
  assert.deepEqual(elegirParaPodcast(notas, { cuantas: 3 }).map((n) => n.id), ['a1', 'b1', 'c1']);
});

test('si no hay secciones distintas alcanza, se completa por puntaje', () => {
  const notas = [
    nn('a1', 'Primera del autódromo Fangio hoy', 'Automovilismo', 90),
    nn('a2', 'Segunda de las carreras nacionales', 'Automovilismo', 85),
    nn('b1', 'Cortan el agua en el barrio norte', 'Servicios', 80),
  ];
  assert.equal(elegirParaPodcast(notas, { cuantas: 3 }).length, 3);
});
