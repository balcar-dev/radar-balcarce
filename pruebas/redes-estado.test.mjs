// La pestaña Redes del panel: qué salió y qué no, red por red, con el motivo y el botón de reintentar (1/10/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  partesDeLaPieza, estadoDeParte, estadoPorRed, explicarFalloDeRed, problemasDeHoy,
} from '../web/public/panel/redes-estado.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const DIA = '2026-10-01';
// 10:40 en Balcarce.
const AHORA = new Date('2026-10-01T13:40:00Z');
const REEL = { nombre: 'noticia1', tipo: 'reel', hora: '10:00', ventana: 180, que: 'El repaso de la mañana' };
const HISTORIA = { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', ventana: 180, que: 'El clima de hoy' };

test('un reel se parte en reel e historia del reel, en las dos redes; una historia, sólo historia', () => {
  assert.deepEqual(partesDeLaPieza(REEL).map((p) => `${p.red}/${p.parte}`), ['instagram/reel', 'instagram/historia-del-reel', 'facebook/reel', 'facebook/historia-del-reel']);
  assert.deepEqual(partesDeLaPieza(HISTORIA).map((p) => `${p.red}/${p.parte}`), ['instagram/historia', 'facebook/historia']);
});

// El caso real del 1/10: el reel salió en las dos redes, la historia sólo en Facebook (Instagram la rechazó tres veces).
const LIBRO = {
  instagram: { [`${DIA}/noticia1`]: { cuando: '2026-10-01T13:35:03Z' } },
  facebookVideos: { [`${DIA}/noticia1`]: { cuando: '2026-10-01T13:37:31Z' } },
  historiasDeReels: { [`facebook/${DIA}/noticia1`]: { cuando: '2026-10-01T13:38:12Z' } },
  problemas: {
    [`${DIA}/noticia1/instagram/historia-del-reel`]: { pieza: 'noticia1', red: 'instagram', parte: 'historia-del-reel', error: 'La subida del video falló (400) Request processing failed', cuando: '2026-10-01T13:36:56Z' },
  },
};

test('el caso del reel de las 10: lo que salió, lo que falló y por qué', () => {
  const e = estadoPorRed({ libro: LIBRO, piezas: [REEL], dia: DIA, ahora: AHORA })[0].partes;
  const de = (red, parte) => e.find((p) => p.red === red && p.parte === parte);
  assert.equal(de('instagram', 'reel').clase, 'ok');
  assert.equal(de('facebook', 'reel').clase, 'ok');
  assert.equal(de('facebook', 'historia-del-reel').clase, 'ok');
  const falla = de('instagram', 'historia-del-reel');
  assert.equal(falla.clase, 'mal');
  assert.equal(falla.puedeReintentar, true);
  assert.match(falla.error, /Request processing failed/);
  assert.equal(de('instagram', 'reel').puedeReintentar, false, 'lo que salió no se reintenta');
});

test('antes de que el reloj lo intente, la historia del reel "sale junto con el reel"', () => {
  const sinReel = estadoDeParte({ libro: {}, dia: DIA, pieza: REEL, red: 'instagram', parte: 'historia-del-reel', ahora: AHORA });
  assert.equal(sinReel.clase, 'espera');
  assert.equal(sinReel.puedeReintentar, false);
});

test('un reel que salió pero cuya historia no dejó nada anotado (antes del 1/10) también se puede reintentar', () => {
  const libro = { instagram: LIBRO.instagram, facebookVideos: {}, historiasDeReels: {} };
  const e = estadoDeParte({ libro, dia: DIA, pieza: REEL, red: 'instagram', parte: 'historia-del-reel', ahora: AHORA });
  assert.equal(e.clase, 'mal');
  assert.equal(e.puedeReintentar, true);
});

test('una pieza que todavía no toca espera, y una que ya pasó sin salir ni dejar nada no ofrece reintento', () => {
  const tarde = { nombre: 'noticia2', tipo: 'reel', hora: '15:00', ventana: 180, que: 'x' };
  const antes = estadoDeParte({ libro: {}, dia: DIA, pieza: tarde, red: 'instagram', parte: 'reel', ahora: AHORA });
  assert.equal(antes.clase, 'espera');
  const pasada = estadoDeParte({ libro: {}, dia: DIA, pieza: HISTORIA, red: 'instagram', parte: 'historia', ahora: AHORA });
  assert.equal(pasada.clase, 'mal');
  assert.equal(pasada.puedeReintentar, false, 'si nunca se armó no hay video: la arma el reloj en su horario');
});

test('un reel que falló en la red principal ofrece reintento, con su motivo', () => {
  const libro = { problemas: { [`${DIA}/noticia1/instagram/reel`]: { error: 'token vencido', cuando: 'x' } } };
  const e = estadoDeParte({ libro, dia: DIA, pieza: REEL, red: 'instagram', parte: 'reel', ahora: AHORA });
  assert.equal(e.clase, 'mal');
  assert.equal(e.puedeReintentar, true);
});

test('los problemas de hoy se cuentan, los de otros días no', () => {
  const libro = { problemas: { [`${DIA}/a/instagram/reel`]: { pieza: 'a' }, '2026-09-30/b/instagram/reel': { pieza: 'b' } } };
  assert.deepEqual(problemasDeHoy(libro, DIA).map((p) => p.pieza), ['a']);
  assert.deepEqual(problemasDeHoy({}, DIA), []);
});

test('los motivos de fallo se explican en castellano y con lo que conviene hacer', () => {
  assert.match(explicarFalloDeRed('La subida del video falló (400) Request processing failed'), /Meta rechazó el video.*reintentar/);
  assert.match(explicarFalloDeRed('Error validating access token: Session has expired'), /token de Meta venció/);
  assert.match(explicarFalloDeRed('Max duration for stories is 61.0'), /60 segundos/);
  assert.match(explicarFalloDeRed('(#4) Application request limit reached'), /límite/);
  assert.match(explicarFalloDeRed('algo que no conocemos'), /^Meta contestó: algo que no conocemos/);
  assert.match(explicarFalloDeRed(''), /no quedó anotado por qué/);
});

test('el panel conecta todo: sección por red, botón de reintentar, el workflow y la caché', () => {
  const app = leer('web/public/panel/app.js');
  assert.match(app, /from '\.\/redes-estado\.js'/);
  assert.match(app, /Qué salió y qué no, red por red/);
  assert.match(app, /data-accion="reintentar"/);
  assert.match(app, /disparar\('reintentar\.yml'/);
  assert.match(app, /problemasDeHoy\(E\.libro, hoyEnBalcarce\(\)\)\.length \? '⚠'/);
  assert.match(leer('web/public/panel/sw.js'), /\/panel\/redes-estado\.js/);
  assert.match(leer('.github/workflows/reintentar.yml'), /run-name: .*\$\{\{ github\.event\.inputs\.marca \}\}/);
});
