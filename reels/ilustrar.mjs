// Ilustraciones de Radar Balcarce.
//
// Reglas de la casa, que valen más que cualquier prompt:
//   1. NUNCA una imagen que pueda pasar por la foto del hecho. Si es un
//      choque, un allanamiento o un incendio, no se ilustra: va la placa
//      tipográfica sola.
//   2. Nada de caras de personas reales.
//   3. Siempre se ve que es un dibujo. Si hay que aclarar que no es una foto,
//      es que la imagen está mal hecha.
//
// Se usa para: fondos de sección (una vez y se reusan), notas de opinión, y
// temas conceptuales donde no hay foto posible.
//
//   node reels/ilustrar.mjs --secciones        la colección de fondos
//   node reels/ilustrar.mjs "una heladera vacía en una cocina de pueblo"
//   node reels/ilustrar.mjs --personaje        la hoja del personaje

import fs from 'node:fs';
import path from 'node:path';
import { clave } from './voz-gemini.mjs';

const MODELO = 'gemini-2.5-flash-image';
const FONDOS = path.join(import.meta.dirname, 'marca', 'fondos');
const PERSONAJE = path.join(import.meta.dirname, 'marca', 'personaje.png');

// El estilo es lo que hace que doce imágenes distintas parezcan del mismo
// medio. No se toca sin decidirlo a propósito.
export const ESTILO = 'Ilustración editorial plana, estilizada, de trazo grueso y pocas '
  + 'formas, como un grabado moderno. Paleta estricta: fondo negro azulado #14161A, '
  + 'verde profundo #16615B, ámbar #E8A33C y crema #F7F5EF. Textura de grano fino, '
  + 'como papel de diario. Composición vertical 9:16 con mucho espacio vacío arriba, '
  + 'porque ahí va el texto. Sin letras, sin números, sin logos, sin marcas de agua. '
  + 'Ambientada en un pueblo de la llanura bonaerense, con sierras bajas en el horizonte. '
  + 'Nunca fotorrealista, nunca caras reconocibles.';

// Una por sección. Se generan una vez y se reusan siempre: eso es lo que las
// convierte en marca en vez de en relleno.
export const SECCIONES = {
  deportes: 'Una cancha de tierra de pueblo al atardecer, arcos sin red, vista desde atrás del arco.',
  automovilismo: 'La silueta de un auto de carrera antiguo tomando una curva, sólo la forma y el rastro de polvo.',
  agro: 'Un surco de tierra recién arada que se pierde hacia las sierras, con una máquina mínima a lo lejos.',
  policiales: 'Una calle de pueblo de noche bajo una sola luz de alumbrado. Sin patrulleros, sin personas, sin violencia.',
  politica: 'La fachada de un edificio municipal con escalinata, geométrica, vista de frente y desde abajo.',
  'cultura-y-agenda': 'Un telón de teatro entreabierto con una silla sola en el escenario.',
  servicios: 'Postes de luz y cables cruzando el cielo de un pueblo, vistos desde la vereda hacia arriba.',
  balcarce: 'Las sierras de Balcarce al amanecer, en silueta, con la llanura adelante.',
  clima: 'Un cielo grande de llanura con nubes en capas, horizonte muy bajo.',
  general: 'Un pueblo de la llanura visto desde lejos al atardecer, siluetas de casas bajas y un tanque de agua.',
};

// El personaje: una vez definido, se usa como REFERENCIA en cada viñeta nueva,
// que es la única forma de que salga igual dos veces seguidas.
export const HOJA_PERSONAJE = 'Hoja de personaje para una mascota de un medio de noticias '
  + 'de pueblo. El personaje es una papa antropomórfica —Balcarce es la capital de la papa— '
  + 'de aspecto amable y un poco escéptico, con cejas expresivas y las manos en los bolsillos '
  + 'de un delantal. Mostralo en tres poses: de frente, de perfil y señalando algo. '
  + 'Diseño simple y reproducible, de pocas líneas, pensado para viñetas. '
  + 'Personaje original, no puede parecerse a ningún personaje existente.';

async function generar(prompt, destino, { referencia = null, formato = '9:16' } = {}) {
  const k = clave();
  if (!k) throw new Error('falta GEMINI_API_KEY_REDES');
  fs.mkdirSync(path.dirname(destino), { recursive: true });

  const partes = [{ text: `${ESTILO}\n\nQué mostrar: ${prompt}` }];
  // Pasarle el personaje como imagen de referencia es lo que mantiene la
  // coherencia entre viñetas: sin esto, cada una sale con otra cara.
  if (referencia && fs.existsSync(referencia)) {
    partes.unshift({
      inlineData: { mimeType: 'image/png', data: fs.readFileSync(referencia).toString('base64') },
    });
    partes.push({ text: 'Usá el personaje de la imagen de referencia exactamente igual: mismo diseño, mismos colores, mismas proporciones.' });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${k}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: partes }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: formato } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error('sin cupo: las imágenes necesitan facturación habilitada');
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const img = (j.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
  if (!img) throw new Error('la respuesta no trajo imagen');
  fs.writeFileSync(destino, Buffer.from(img.inlineData.data, 'base64'));
  return destino;
}

export { generar };

if (process.argv[1] && process.argv[1].endsWith('ilustrar.mjs')) {
  const args = process.argv.slice(2);

  if (args.includes('--personaje')) {
    console.log('\n  Generando la hoja del personaje…');
    try {
      await generar(HOJA_PERSONAJE, PERSONAJE, { formato: '1:1' });
      console.log(`  \x1b[32mlisto\x1b[0m ${PERSONAJE}`);
      console.log('  Revisala. Si te gusta, queda como referencia de todas las viñetas.\n');
    } catch (e) { console.log(`  \x1b[31mfalla\x1b[0m ${e.message}\n`); }
  } else if (args.includes('--secciones')) {
    console.log(`\n  Generando ${Object.keys(SECCIONES).length} fondos de sección…`);
    console.log(`  (cuestan unos 2 centavos cada uno, y se hacen una sola vez)\n`);
    for (const [slug, que] of Object.entries(SECCIONES)) {
      process.stdout.write(`  ${slug.padEnd(20)} `);
      try {
        await generar(que, path.join(FONDOS, `${slug}.png`));
        console.log('\x1b[32mlisto\x1b[0m');
      } catch (e) { console.log(`\x1b[31mfalla\x1b[0m ${e.message.slice(0, 70)}`); break; }
    }
    console.log(`\n  Quedaron en ${FONDOS}. Las placas los toman solos.\n`);
  } else if (args.length) {
    const destino = path.join(import.meta.dirname, 'salida', `ilustracion-${Date.now()}.png`);
    try {
      await generar(args.join(' '), destino, { referencia: PERSONAJE });
      console.log(`\n  \x1b[32mlisto\x1b[0m ${destino}\n`);
    } catch (e) { console.log(`\n  \x1b[31mfalla\x1b[0m ${e.message}\n`); }
  } else {
    console.log('\n  node reels/ilustrar.mjs --secciones      la colección de fondos');
    console.log('  node reels/ilustrar.mjs --personaje      la hoja del personaje');
    console.log('  node reels/ilustrar.mjs "qué mostrar"    una ilustración suelta\n');
  }
}
