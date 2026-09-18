// Test de entonación: la misma voz leyendo con instrucciones distintas.
//
// Hasta ahora probamos QUIÉN lee. Esto prueba CÓMO lee, que en Gemini es la
// perilla que de verdad mueve el resultado. Siempre 2 mujeres y 2 varones.
//
//   node reels/test-entonacion.mjs            corre el test
//   node reels/test-entonacion.mjs --cuota    sólo dice si entra en el cupo
//
// El cupo gratuito es de 10 pedidos por día, así que el test está calculado
// para entrar justo. Correrlo un día que además se publican piezas deja al
// medio sin voz: conviene probar temprano o con el cupo recién renovado.

import path from 'node:path';
import { decirGemini, estadoCuota } from './voz-gemini.mjs';

const SALIDA = path.join(import.meta.dirname, 'casting', 'entonacion');

// El texto tiene de todo a propósito: saludo, número, nombre propio y remate.
// Si una entonación funciona con esto, funciona con cualquier pieza.
const TEXTO = 'Buen día, Balcarce. Arrancamos con nueve grados y a la tarde levanta hasta veintiuno. '
  + 'El Concejo Deliberante aprobó anoche el nuevo cuadro tarifario del transporte urbano. '
  + 'La nota completa está en radar balcarce punto com punto a ere.';

export const ENTONACIONES = [
  {
    id: 'vecina',
    que: 'la que veníamos usando',
    texto: 'Leé esto como locutora de una radio de pueblo en la provincia de Buenos Aires: '
      + 'cercana, tranquila, con acento rioplatense, sin solemnidad y sin exagerar. '
      + 'Ritmo parejo, como quien le cuenta algo a un vecino.',
  },
  {
    id: 'informativo',
    que: 'más seria, tono de noticiero',
    texto: 'Leé esto como quien conduce un informativo de radio en Argentina: clara, '
      + 'con autoridad tranquila y acento rioplatense. Marcá bien los datos y los números. '
      + 'Nada de énfasis dramático: la noticia se sostiene sola.',
  },
  {
    id: 'cercana',
    que: 'más suelta, casi hablada',
    texto: 'Contá esto en voz alta como si se lo estuvieras contando a alguien conocido en '
      + 'la vereda, en Balcarce. Acento rioplatense bien marcado, voseo natural, sin leer: '
      + 'hablá. Puede haber alguna pausa donde uno pensaría antes de seguir.',
  },
];

// Siempre dos y dos, para poder comparar en serio.
export const VOCES = [
  { voz: 'Kore', quien: 'mujer' },
  { voz: 'Callirrhoe', quien: 'mujer' },
  { voz: 'Iapetus', quien: 'varón' },
  { voz: 'Puck', quien: 'varón' },
];

// Qué combinaciones vale la pena escuchar sin quemar el cupo: las tres
// entonaciones sobre una voz de cada género, más un cruce de control.
const PRUEBAS = [
  ...ENTONACIONES.map((e) => ({ entonacion: e, voz: VOCES[0] })),
  ...ENTONACIONES.map((e) => ({ entonacion: e, voz: VOCES[2] })),
  { entonacion: ENTONACIONES[1], voz: VOCES[1] },
  { entonacion: ENTONACIONES[1], voz: VOCES[3] },
];

const cuota = estadoCuota();
console.log(`\n\x1b[1mTEST DE ENTONACIÓN\x1b[0m`);
console.log(`  cupo de hoy: ${cuota.usados} usados de ${cuota.cupo} · quedan ${cuota.quedan}`);
console.log(`  este test necesita ${PRUEBAS.length} pedidos`);
console.log(`  el cupo se renueva ${cuota.renueva}\n`);

if (process.argv.includes('--cuota')) {
  console.log(cuota.quedan >= PRUEBAS.length
    ? '  \x1b[32mEntra.\x1b[0m Corré sin --cuota para hacerlo.\n'
    : `  \x1b[31mNo entra.\x1b[0m Faltan ${PRUEBAS.length - cuota.quedan} pedidos: esperá a que se renueve.\n`);
  process.exit(0);
}

if (cuota.quedan < PRUEBAS.length) {
  console.log(`  \x1b[31mNo hay cupo suficiente\x1b[0m: quedan ${cuota.quedan} y hacen falta ${PRUEBAS.length}.\n`);
  process.exit(1);
}

for (const p of PRUEBAS) {
  const nombre = `${p.entonacion.id}-${p.voz.voz.toLowerCase()}`;
  process.stdout.write(`  ${nombre.padEnd(26)} `);
  try {
    const r = await decirGemini(TEXTO, path.join(SALIDA, `${nombre}.mp3`), {
      voz: p.voz.voz,
      indicacion: p.entonacion.texto,
    });
    console.log(`\x1b[32mok\x1b[0m ${r.duracion.toFixed(1)} s · ${p.voz.quien} · ${p.entonacion.que}`);
  } catch (e) {
    console.log(`\x1b[31mfalla\x1b[0m ${e.message.slice(0, 90)}`);
    break; // si se acabó el cupo, no tiene sentido seguir golpeando
  }
}
console.log(`\n  Quedaron en ${SALIDA}\n`);
