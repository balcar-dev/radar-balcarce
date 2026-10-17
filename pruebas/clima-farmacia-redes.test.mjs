// Regla 210 (17/10/2026): el clima y la farmacia en las redes.
//   · Cuando salen como reel en Facebook llevan el enlace a SU página (/clima, /farmacias), no "Más en radarbalcarce.com". Instagram
//     sigue sin enlaces.
//   · El 12/10 (feriado) no salió la farmacia: el Colegio publicó el 11 y el 13, sin el 12; la web quedó sin farmacia de turno y el reloj
//     pidió la pieza veinte veces sin poder armarla. Ahora el turno de hoy que falta se completa con La Vanguardia (si Radio Gabal no la
//     contradice) y, si igual no hay, el reloj no la pide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pieDePieza, SERVICIOS_CON_PAGINA } from '../redes/piezas.mjs';
import { completarTurnoDeHoy } from '../ingesta/ingesta.mjs';
import { estadoDelReloj } from '../redes/reloj.mjs';
import { libroNuevo } from '../redes/elegir.mjs';

test('el reel de Facebook del clima y de la farmacia enlaza a /clima y /farmacias (con su origen); Instagram, sin enlaces', () => {
  const clima = pieDePieza({ tipo: 'reel', nombre: 'clima-noche', titulo: 'Cómo sigue el clima esta noche' }, 'facebook');
  assert.match(clima, /^Cómo sigue el clima esta noche\n\nEl pronóstico de toda la semana, acá: https:\/\/radarbalcarce\.com\/clima\?utm_source=facebook&utm_medium=social&utm_campaign=servicio&utm_content=clima-noche\n\nVoz generada con inteligencia artificial\.\n\n#Balcarce #RadarBalcarce #Clima$/);
  const farmacia = pieDePieza({ tipo: 'reel', nombre: 'farmacia', titulo: 'Farmacia de turno: Del Pueblo' }, 'facebook');
  assert.match(farmacia, /https:\/\/radarbalcarce\.com\/farmacias\?utm_source=facebook/);
  assert.match(pieDePieza({ tipo: 'reel', nombre: 'clima-manana', titulo: 'El clima de hoy' }), /https:\/\/radarbalcarce\.com\/clima\n/, 'sin red, el enlace limpio');
  const ig = pieDePieza({ tipo: 'reel', nombre: 'farmacia', titulo: 'Farmacia de turno: Del Pueblo' }, 'instagram');
  assert.ok(!/https?:/.test(ig), 'Instagram no lleva enlaces');
  assert.match(ig, /Más en radarbalcarce\.com/);
  assert.ok(SERVICIOS_CON_PAGINA[0].es('aviso-helada'), 'los avisos de clima también van a /clima');
  assert.match(pieDePieza({ tipo: 'reel', nombre: 'utiles', titulo: 'Teléfonos útiles' }, 'facebook'), /Más en radarbalcarce\.com/, 'lo demás, como siempre');
});

const LUNES_12_A_LAS_19 = new Date('2026-10-12T19:05:00-03:00');
const COLEGIO_SIN_EL_12 = [
  { dia: 11, diaSemana: 'DOMINGO', farmacias: ['SAN ANTONIO'], detalle: [], mes: 10, fecha: '2026-10-11' },
  { dia: 13, diaSemana: 'MARTES', farmacias: ['VUOTTO'], detalle: [], mes: 10, fecha: '2026-10-13' },
];

test('el turno de hoy que el Colegio no trae se completa con La Vanguardia, con su dirección y su fuente, y avisa', () => {
  const vanguardia = [{ dia: 12, nombre: 'Del Pueblo', direccion: 'Calle 17 N° 1140' }, { dia: 13, nombre: 'Vuotto', direccion: 'Calle 17 esquina 20' }];
  const r = completarTurnoDeHoy(COLEGIO_SIN_EL_12, { ahora: LUNES_12_A_LAS_19, vanguardia, gabal: [{ dia: 12, nombre: 'DEL PUEBLO' }] });
  const hoy = r.turnos.find((t) => t.fecha === '2026-10-12');
  assert.deepEqual(hoy.farmacias, ['DEL PUEBLO']);
  assert.equal(hoy.detalle[0].direccion, 'Calle 17 N° 1140');
  assert.equal(hoy.fuente, 'La Vanguardia');
  assert.equal(hoy.diaSemana, 'LUNES');
  assert.deepEqual(r.turnos.map((t) => t.fecha), ['2026-10-11', '2026-10-12', '2026-10-13'], 'queda en orden');
  assert.match(r.aviso, /se completó con La Vanguardia \(Del Pueblo\), y Radio Gabal coincide/);
});

test('no se completa si el Colegio ya lo trae, si La Vanguardia no lo tiene o si Radio Gabal dice otra cosa', () => {
  const conEl12 = [...COLEGIO_SIN_EL_12, { dia: 12, farmacias: ['NORTE'], fecha: '2026-10-12' }];
  assert.equal(completarTurnoDeHoy(conEl12, { ahora: LUNES_12_A_LAS_19, vanguardia: [{ dia: 12, nombre: 'Del Pueblo', direccion: 'x 1' }] }).turnos, conEl12);
  assert.equal(completarTurnoDeHoy(COLEGIO_SIN_EL_12, { ahora: LUNES_12_A_LAS_19, vanguardia: [] }).turnos.length, 2);
  const choca = completarTurnoDeHoy(COLEGIO_SIN_EL_12, {
    ahora: LUNES_12_A_LAS_19, vanguardia: [{ dia: 12, nombre: 'Del Pueblo', direccion: 'x 1' }], gabal: [{ dia: 12, nombre: 'NORTE' }],
  });
  assert.equal(choca.turnos.length, 2, 'mejor sin farmacia que con una dudosa');
  assert.match(choca.aviso, /no coinciden/);
  // Antes de las 8:30 sigue el turno del día anterior: a las 2 de la mañana del 13, "hoy" es el 12.
  const madrugada = completarTurnoDeHoy(COLEGIO_SIN_EL_12, { ahora: new Date('2026-10-13T02:00:00-03:00'), vanguardia: [{ dia: 12, nombre: 'Del Pueblo', direccion: 'x 1' }] });
  assert.ok(madrugada.turnos.some((t) => t.fecha === '2026-10-12'));
});

test('sin farmacia de turno en la web, el reloj no pide la pieza (y lo dice); el resto sale igual', () => {
  const ahora = new Date('2026-10-12T20:05:00-03:00');
  const con = estadoDelReloj({ ahora, libro: libroNuevo(), hayFarmacia: true });
  assert.ok(con.tocan.some((p) => p.nombre === 'farmacia'));
  const sin = estadoDelReloj({ ahora, libro: libroNuevo(), hayFarmacia: false });
  assert.ok(!sin.tocan.some((p) => p.nombre === 'farmacia'));
  assert.ok(sin.tocan.some((p) => p.nombre === 'clima-noche'));
  assert.match(sin.textoResumen, /la farmacia no: la web no tiene farmacia de turno para hoy/);
});
