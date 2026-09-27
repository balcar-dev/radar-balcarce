// Los criterios de Hernán del 27/09 a la noche:
//   · del extranjero, sólo si un argentino se destaca o le importa a Balcarce;
//   · lo de la zona que es tema de Balcarce sale solo;
//   · las listas de sepelios esperan a una persona;
//   · la portada no se completa con notas de más de 7 días ni repite una
//     historia en dos secciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarFichas } from '../ingesta/lectura-ia.mjs';
import { paraPruebas, exigirMedios } from '../ingesta/ingesta.mjs';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { armarTapa, DIAS_PARA_COMPLETAR } from '../web/lib/datos.js';

const { semaforo } = paraPruebas;
const ficha = (extra = {}) => ({ ambito: 'internacional', lugar: 'Bakú', seccion: 'Automovilismo', impacto: 'nulo', razon: 'ninguna', importancia: 'media', publicidad: false, anuncio: false, chimento: false, porque: '', tema: 'x', ...extra });
const nota = (id, titulo, extra = {}) => ({ id, titulo, seccion: 'Automovilismo', semaforo: 'verde', local: false, medios: ['A', 'B', 'C'], ...extra });

test('del extranjero: la Fórmula 1 sin un argentino no va; con Colapinto, sí', () => {
  const verde = { verdeSecciones: REGLAS_SEMAFORO.verdeSecciones };
  const sin = aplicarFichas([nota('v', 'Verstappen gana en Bakú y se acerca a Norris')], { v: ficha() }, verde);
  assert.equal(sin.notas.length, 0);
  assert.equal(sin.cambios.sacadas[0].motivo, 'es del extranjero');
  const con = aplicarFichas([nota('c', 'Colapinto largó noveno en Bakú', { figura: 'Colapinto' })], { c: ficha() }, verde);
  assert.equal(con.notas.length, 1);
  const premier = aplicarFichas([nota('p', 'Sismo en la Premier League: el City, culpable', { seccion: 'Fútbol' })], { p: ficha({ seccion: 'Fútbol' }) }, verde);
  assert.equal(premier.notas.length, 0, 'el fútbol de otro país sin un argentino no va');
});

test('lo de la zona que es tema de Balcarce sale solo, aunque lo cuente un solo medio', () => {
  const ruta = { titulo: 'Repavimentan la ruta 226 entre Tandil y Mar del Plata', cuerpo: 'Obras en la ruta.', categorias: [], alcance: 'region', local: false, deLaZona: true };
  assert.equal(semaforo(ruta, 'Argentina', 20, 1).color, 'verde');
  const portada = [{ id: 'r', seccion: 'Argentina', semaforo: 'verde', local: false, deLaZona: true, medios: ['0223'] }];
  exigirMedios(portada);
  assert.equal(portada[0].semaforo, 'verde');
});

test('las listas de sepelios esperan a una persona (salieron diez veces, en cualquier sección)', () => {
  const n = { titulo: 'Informan los servicios de sepelios de la Cooperativa de Electricidad', cuerpo: 'Se informan las inhumaciones.', categorias: [], alcance: 'local', local: true };
  const s = semaforo(n, 'Balcarce', 80);
  assert.equal(s.color, 'amarillo');
  assert.match(s.motivo, /sepelio/);
});

test('la portada se completa con notas de hasta 7 días y no repite una historia en dos secciones', () => {
  assert.equal(DIAS_PARA_COMPLETAR, 7);
  const ahora = Date.parse('2026-09-27T22:00:00Z');
  const hace = (d) => new Date(ahora - d * 864e5).toISOString();
  const cuerpo = 'palabra '.repeat(90);
  const hoy = [
    { id: 'h1', titulo: 'Arreglan la plaza central', seccion: 'Balcarce', local: true, fecha: hace(0.1), relevancia: 80, cuerpo },
    { id: 'h2', titulo: 'Nueva sesión del Concejo', seccion: 'Política', local: true, fecha: hace(0.2), relevancia: 70, cuerpo },
  ];
  const archivo = [
    { id: 'a1', titulo: 'Informan los servicios de la Cooperativa de Electricidad', seccion: 'Balcarce', local: true, fecha: hace(2), cuerpo },
    { id: 'a2', titulo: 'Informan los servicios de la Cooperativa de Electricidad', seccion: 'Fútbol', local: true, fecha: hace(3), cuerpo },
    { id: 'a3', titulo: 'Una nota de hace nueve días', seccion: 'Deportes', local: true, fecha: hace(9), cuerpo },
  ];
  const { bloques } = armarTapa(hoy, undefined, { archivo, ahora });
  const ids = bloques.flatMap(([, ns]) => ns.map((n) => n.id));
  assert.ok(ids.includes('a1'));
  assert.ok(!ids.includes('a2'), 'la misma historia no completa otra sección');
  assert.ok(!ids.includes('a3'), 'nada de más de 7 días');
});
