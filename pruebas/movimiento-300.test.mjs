// Regla 300 (18/10/2026, Hernán: "mejorar las animaciones: un poco más de movimiento y más fluidez; que la pantalla no quede en blanco apenas se
// cargan"). Lo que se comprueba, con cuadros dibujados de verdad (resvg) y un video armado con ffmpeg y una voz falsa (sin red ni cupo):
//   1. el cuadro 0 nunca está vacío y ningún cuadro de las primeras entradas queda en blanco (escenas, placas y repaso);
//   2. el repaso se mueve con curvas suaves: transiciones de 8 a 12 cuadros, titular por palabras, deriva de la foto dentro de lo que sobra de imagen,
//      rayitas que se llenan, "2 de 4" que rueda; y nunca dibuja encima del crédito de la foto ni de los subtítulos;
//   3. no hay cuadros de más: los que se dibujan son todos distintos entre sí y los 30 por segundo suman justo lo que dura la pieza;
//   4. sin parpadeos: entre un cuadro y el siguiente nunca hay un salto a blanco;
//   5. el video armado dura lo que el audio y no deja restos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { Resvg } from '@resvg/resvg-js';
import { archivosDeFuente } from '../reels/placa.mjs';
import {
  secuenciaDelRepaso, placasConTiempos, escenaDelRepaso, leerNota, ARRANQUE, TRANSICION, TITULAR, DERIVA, FOTO,
} from '../reels/escenas/repaso.mjs';
import {
  FPS, lineaDeTiempo, renderizarLinea, partirSvg, placaEn, ENTRADA,
} from '../reels/animacion.mjs';
import { FPS_ESCENA, ARRANQUE_DE_ESCENA } from '../reels/escenas/comun.mjs';
import { ejemplos, ejemplosDeClima, ejemplosDeServicios, ejemplosDeDeportes } from '../reels/ejemplos-plantillas.mjs';
import { armarReel, medirDuracion } from '../reels/reel.mjs';
import { palabrasSinteticas } from '../reels/previa-efemerides.mjs';
import { armarPodcast, cierreDePodcast } from '../redes/guiones.mjs';

const FECHA = new Date('2026-10-17T10:05:00-03:00');
const propias = archivosDeFuente();
const hayFfmpeg = Boolean(ffmpeg && fs.existsSync(ffmpeg));

/** Los píxeles de un SVG a `ancho` de ancho (RGBA). */
const pixeles = (svg, ancho = 135) => new Resvg(svg, {
  fitTo: { mode: 'width', value: ancho },
  font: { fontFiles: propias, loadSystemFonts: false, defaultFontFamily: 'Inter' },
}).render().pixels;
/** Qué parte del cuadro NO es papel (0 a 1): la "tinta" que tiene. */
function tinta(px) {
  let n = 0;
  for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - 250) + Math.abs(px[i + 1] - 248) + Math.abs(px[i + 2] - 243) > 40) n += 1;
  return n / (px.length / 4);
}
/** Diferencia media (0 a 255) entre dos cuadros del mismo tamaño. */
function diferencia(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
  return d / (a.length / 4) / 3;
}

/** Una foto de verdad (un patrón de prueba, para que el movimiento se vea) como los datos de una nota. */
function fotoDePrueba(dir, nombre, color) {
  const jpg = path.join(dir, `${nombre}.jpg`);
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=900x560:rate=1,format=yuv420p,colorbalance=rs=${color}`, '-frames:v', '1', jpg]);
  return `data:image/jpeg;base64,${fs.readFileSync(jpg).toString('base64')}`;
}

function repasoDePrueba({ conFotos = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mov300-'));
  const datos = conFotos ? ['0.3', '-0.3', '0.1'].map((c, i) => fotoDePrueba(dir, `f${i}`, c)) : [null, null, null];
  const notas = [
    { titulo: 'Ferroviarios gana el Apertura y va por la final', seccion: 'Fútbol', foto: datos[0] && { datos: datos[0], credito: 'Foto: Acción 5 (Balcarce)' } },
    { titulo: 'Cortan el agua en el centro por una obra de la cooperativa', seccion: 'Balcarce', foto: null },
    { titulo: 'Nueva muestra en el museo', seccion: 'Cultura y agenda', foto: datos[2] && { datos: datos[2], credito: 'Ilustración generada con IA' } },
    { titulo: 'Abren la inscripción a los talleres de verano', seccion: 'Balcarce', foto: datos[1] && { datos: datos[1], credito: 'Foto: Municipalidad' } },
  ];
  const guion = armarPodcast(notas.map((n) => ({ titular: n.titulo, detalle: '' })), { momento: 'manana', fecha: FECHA });
  const cierre = cierreDePodcast('manana', { fecha: FECHA });
  const secuencia = secuenciaDelRepaso({ titulo: 'El repaso de la mañana', momento: 'manana', fecha: 'Sábado 17 de octubre', notas, cierre });
  const palabras = palabrasSinteticas(guion);
  const duracion = palabras.at(-1).hasta;
  const total = 0.25 + duracion + 1.4;
  const conTiempos = placasConTiempos(secuencia, palabras, { retardo: 0.25, total });
  return {
    dir, notas, guion, secuencia, palabras, duracion, total, conTiempos, escena: escenaDelRepaso({ placas: conTiempos, tapa: secuencia.tapa, total }),
  };
}

test('las escenas arrancan ya con contenido: ningún cuadro de entrada queda en blanco y la escena corre a 30 cuadros por segundo', () => {
  const todos = [...ejemplos(), ...ejemplosDeClima(), ...ejemplosDeServicios(), ...ejemplosDeDeportes()];
  assert.equal(FPS_ESCENA, FPS, 'una escena se dibuja a los mismos 30 cuadros del video');
  assert.ok(ARRANQUE_DE_ESCENA > 0 && ARRANQUE_DE_ESCENA <= 0.5, 'la escena arranca unas décimas adelantada');
  for (const e of todos) {
    for (const t of [0, 1 / 30, 0.1, 0.25]) {
      const t1 = tinta(pixeles(e.escena.cuadro(t, 16)));
      assert.ok(t1 >= 0.03, `${e.nombre} @${t.toFixed(2)}: sólo ${(t1 * 100).toFixed(1)} % del cuadro tiene algo (en blanco)`);
    }
  }
});

test('la entrada de una placa arranca desde bloques visibles (60 % como mínimo) y termina siendo la placa quieta', () => {
  const secuencia = repasoDePrueba({ conFotos: false }).secuencia;
  for (const svg of [secuencia.tapa, secuencia.placas[0].svg]) {
    const partida = partirSvg(svg);
    const primero = placaEn(partida, 0);
    const siguiente = placaEn(partida, 1 / FPS);
    for (const cuadro of [primero, siguiente]) {
      assert.ok(tinta(pixeles(cuadro)) > 0.04, 'el primer cuadro de la entrada no está en blanco');
      const ops = [...cuadro.matchAll(/<g opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
      assert.ok(ops.every((o) => o >= ENTRADA.piso - 0.001), `ningún bloque baja del piso: ${Math.min(...ops)}`);
    }
  }
});

test('el repaso: el cuadro 0 es la tapa entera; después, una transición de 8 a 12 cuadros hasta la primera nota', () => {
  const r = repasoDePrueba();
  assert.ok(r.escena, 'se arma la escena');
  assert.equal(r.escena.cuadro(0, r.total), r.secuencia.tapa, 'el cuadro 0 es la tapa tal cual (la imagen que muestran Instagram y Facebook)');
  assert.equal(r.escena.cuadro(ARRANQUE - 0.01, r.total), r.secuencia.tapa, 'y se queda un rato');
  assert.equal(r.escena.etapas[0].inicio, ARRANQUE);
  assert.ok(r.escena.etapas.every((e, i, v) => !i || e.inicio >= v[i - 1].inicio + TRANSICION.dur + 0.4), 'las transiciones no se pisan');
  const cuadros = Math.round(TRANSICION.dur * FPS);
  assert.ok(cuadros >= 8 && cuadros <= 12, `la transición dura ${cuadros} cuadros`);
  // Dentro de la transición hay un dibujo distinto en cada cuadro.
  const vistos = new Set();
  for (let k = 0; k <= cuadros; k += 1) vistos.add(r.escena.cuadro(ARRANQUE + k / FPS, r.total));
  assert.equal(vistos.size, cuadros + 1, 'cada cuadro de la transición es distinto');
  // Pasada la transición y la entrada del titular, la nota es la placa quieta (más la deriva de la foto y las rayitas de avance).
  const quieta = r.escena.cuadro(ARRANQUE + 3, r.total);
  assert.ok(quieta.includes(leerNota(r.conTiempos[0].svg).partes.titular), 'el titular quedó entero, sin palabras a medio entrar');
});

test('el titular entra palabra por palabra, cada una subiendo unos píxeles y aclarándose, sincronizado con la entrada de su nota', () => {
  const r = repasoDePrueba();
  const inicio = r.escena.etapas[1].inicio;
  const antes = r.escena.cuadro(inicio + TITULAR.primero + 0.05, r.total);
  const tspans = [...antes.matchAll(/<tspan fill-opacity="([\d.]+)" dy="(-?[\d.]+)">/g)];
  assert.ok(tspans.length >= 6, 'el titular está partido en palabras');
  const ops = tspans.map((m) => Number(m[1]));
  assert.ok(ops[0] > ops.at(-1), 'las primeras palabras van más adelantadas que las últimas');
  assert.ok(ops.every((o) => o >= 0 && o <= 1));
  // Pasadas todas, la nota es la quieta: ningún tspan.
  const siguiente = r.escena.etapas[2].inicio;
  assert.ok(siguiente - inicio > 2.5, 'la prueba necesita que la nota siguiente entre más tarde');
  assert.ok(!r.escena.cuadro(inicio + 2, r.total).includes('<tspan fill-opacity'), 'al final no queda ninguna palabra a medio entrar');
});

test('la foto deriva despacio (zoom y paneo) sin dejar nunca el borde de la caja a la vista, y alterna de una nota a la otra', () => {
  for (const d of DERIVA) {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const s = d.s0 + (d.s1 - d.s0) * v;
      const x = d.x0 + (d.x1 - d.x0) * v;
      const y = d.y0 + (d.y1 - d.y0) * v;
      assert.ok(s >= 1.03 && s <= 1.12, `zoom ${s}`);
      assert.ok(Math.abs(x) <= ((s - 1) * FOTO.ancho) / 2, `el paneo horizontal ${x} deja ver el borde con zoom ${s}`);
      assert.ok(Math.abs(y) <= ((s - 1) * FOTO.alto) / 2, `el paneo vertical ${y} deja ver el borde con zoom ${s}`);
    }
  }
  assert.ok(DERIVA[0].s1 > DERIVA[0].s0 && DERIVA[1].s1 < DERIVA[1].s0, 'una nota se acerca y la siguiente se aleja');
  // Y en el dibujo: la imagen se mueve entre dos cuadros de la misma nota.
  const r = repasoDePrueba();
  const a = r.escena.cuadro(5, r.total).match(/<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/);
  const b = r.escena.cuadro(9, r.total).match(/<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/);
  assert.ok(a && b && a[3] !== b[3], 'el zoom cambia con el tiempo');
});

test('el crédito de la foto y los subtítulos nunca quedan tapados: ningún cuadro dibuja nada en la franja de los subtítulos ni sobre el crédito', () => {
  const r = repasoDePrueba();
  const lineas = r.escena.linea(r.total);
  const ancho = 270;
  const escala = ancho / 1080;
  for (let k = 0; k < lineas.length; k += 12) {
    const svg = r.escena.cuadro(lineas[k].t, r.total);
    const px = pixeles(svg, ancho);
    // Franja de los subtítulos (fila 1660 ± 70) y fila 1560 a 1900: sólo papel (la firma termina en la 1560).
    for (let y = Math.round(1580 * escala); y < Math.round(1900 * escala); y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        const i = (y * ancho + x) * 4;
        assert.ok(Math.abs(px[i] - 250) + Math.abs(px[i + 1] - 248) + Math.abs(px[i + 2] - 243) < 40, `@${lineas[k].t}: hay algo dibujado en la franja de los subtítulos (fila ${Math.round(y / escala)})`);
      }
    }
    // El crédito (fila 1009 ± 20) vive debajo de la caja de la foto: ninguna imagen se sale de la caja (la deriva está recortada).
    const fotos = [...svg.matchAll(/<g clip-path="url\(#caja\d+\)">/g)];
    const clips = [...svg.matchAll(/<clipPath id="caja\d+"><rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)];
    assert.equal(fotos.length > 0, clips.length > 0);
    for (const c of clips) assert.deepEqual(c.slice(1, 5).map(Number), [FOTO.x, FOTO.y, FOTO.ancho, FOTO.alto], 'la caja de la foto no se mueve');
  }
});

test('no hay cuadros de más: los 30 por segundo suman justo lo que dura, y todos los que se dibujan son distintos del anterior', async () => {
  const r = repasoDePrueba();
  const linea = r.escena.linea(r.total);
  assert.equal(linea.reduce((s, c) => s + c.ticks, 0), Math.ceil(r.total * FPS) + 1, 'ni un cuadro de más ni de menos');
  assert.equal(linea[0].t, 0);
  assert.ok(linea.length < Math.ceil(r.total * FPS) * 0.8, 'se dibujan bastantes menos que los del video (la deriva lenta va a 15 por segundo)');
  // En las transiciones y la entrada del titular hay un cuadro nuevo en cada tic (30 por segundo); en el resto, a lo sumo dos tics iguales.
  for (const e of r.escena.etapas.slice(1, 3)) {
    const ventana = linea.filter((c) => c.t >= e.inicio && c.t <= e.inicio + TRANSICION.dur);
    assert.ok(ventana.every((c) => c.ticks === 1), 'a 30 por segundo durante la transición');
  }
  assert.ok(linea.every((c) => c.ticks <= 2 || c.t < ARRANQUE), 'en la deriva lenta ningún cuadro dura más de dos tics (fuera de la tapa quieta)');
  // Se dibujan de verdad los primeros cuadros y ninguno es igual al anterior (se unen los que dan el mismo dibujo).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mov300-lin-'));
  const corta = linea.filter((c) => c.t < 2.4);
  const { n, cuadros, secuencia } = await renderizarLinea(r.escena, dir, 'x-', { duracion: r.total, linea: corta });
  assert.ok(n < corta.length, 'los cuadros de la tapa quieta se unieron en uno solo');
  const distintas = fs.readdirSync(dir).filter((f) => /^x-\d{4}\.png$/.test(f)).sort();
  assert.equal(distintas.length, n, 'quedan en el disco las imágenes distintas y ninguna más');
  const hashes = distintas.map((f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex'));
  assert.ok(hashes.every((h, i) => !i || h !== hashes[i - 1]), 'dos imágenes seguidas nunca son iguales');
  assert.equal(cuadros, corta.reduce((s, c) => s + c.ticks, 0), 'y la secuencia de 30 por segundo suma lo mismo que la línea de tiempo');
  assert.ok(fs.existsSync(secuencia.replace('%05d', '00000')) && fs.existsSync(secuencia.replace('%05d', String(cuadros - 1).padStart(5, '0'))), 'la secuencia de 30 por segundo está completa');
});

test('sin parpadeos: entre un cuadro y el siguiente nunca hay un salto a blanco ni un cambio brusco, ni en la tapa, ni en las transiciones, ni en la deriva', () => {
  const r = repasoDePrueba();
  const horas = [];
  for (let k = 0; k < 90; k += 1) horas.push(k / FPS); // los primeros 3 segundos
  const e1 = r.escena.etapas[1].inicio;
  for (let k = -3; k < 40; k += 1) horas.push(e1 + k / FPS); // la primera transición entre notas
  const fin = r.escena.etapas.at(-1).inicio;
  for (let k = -3; k < 30; k += 1) horas.push(fin + k / FPS); // la lista del final
  let anterior = null;
  let maxima = 0;
  for (const t of horas) {
    const px = pixeles(r.escena.cuadro(t, r.total), 90);
    assert.ok(tinta(px) >= 0.1, `@${t.toFixed(3)}: el cuadro está casi en blanco`);
    if (anterior && horas.indexOf(t) !== 90 && horas.indexOf(t) !== 133) maxima = Math.max(maxima, diferencia(anterior, px));
    anterior = px;
  }
  // Un salto a papel vacío daría más de 40; una transición suave a 30 cuadros por segundo no pasa de 20 entre dos cuadros seguidos.
  assert.ok(maxima < 20, `el mayor salto entre dos cuadros seguidos es ${maxima.toFixed(1)}`);
});

test('el video del repaso con movimiento se arma de verdad: dura lo que el audio, el cuadro 0 es la tapa, ninguna entrada queda en blanco y no deja restos', async (t) => {
  if (!hayFfmpeg) { t.skip('sin ffmpeg'); return; }
  const r = repasoDePrueba();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mov300-video-'));
  const pedidos = [];
  const hablar = async (_texto, mp3, opciones) => {
    pedidos.push(opciones);
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${r.duracion.toFixed(2)}`, '-c:a', 'libmp3lame', mp3], { stdio: 'ignore' });
    return { palabras: r.palabras, duracion: r.duracion };
  };
  const res = await armarReel({
    nombre: 'noticia1', svg: r.secuencia.tapa, secuencia: r.secuencia, guion: r.guion, acento: '#C7381C', hablar,
  }, dir);
  const real = await medirDuracion(res.mp4);
  assert.ok(Math.abs(real - (r.duracion + 1.65)) < 0.6, `dura ${real.toFixed(2)} y el audio más la cola dan ${(r.duracion + 1.65).toFixed(2)}`);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => /-a\d+-f?\d{3,5}\.png$|-base\.mp4$|-s\d+\.png$|lista\.txt$/.test(f)), [], 'sin cuadros ni restos');
  // Los primeros 2 segundos a 30 cuadros por segundo, a un octavo de tamaño: ninguno en blanco y el cuadro 0 es la tapa.
  const W = 135; const H = 240;
  const crudo = execFileSync(ffmpeg, ['-v', 'error', '-t', '2', '-i', res.mp4, '-vf', `fps=30,scale=${W}:${H}`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(crudo.length / (W * H * 3));
  assert.ok(n >= 59, `hay ${n} cuadros en 2 segundos`);
  const cuadroRgba = (i) => {
    const salida = Buffer.alloc(W * H * 4);
    for (let k = 0; k < W * H; k += 1) { salida[k * 4] = crudo[(i * W * H + k) * 3]; salida[k * 4 + 1] = crudo[(i * W * H + k) * 3 + 1]; salida[k * 4 + 2] = crudo[(i * W * H + k) * 3 + 2]; }
    return salida;
  };
  let anterior = null;
  for (let i = 0; i < n; i += 1) {
    const px = cuadroRgba(i);
    assert.ok(tinta(px) >= 0.08, `cuadro ${i}: en blanco`);
    if (anterior) assert.ok(diferencia(anterior, px) < 20, `cuadro ${i}: salto brusco (${diferencia(anterior, px).toFixed(1)})`);
    anterior = px;
  }
  // El cuadro 0 se parece a la tapa (la lista) y no a la primera nota: se compara con las dos dibujadas al mismo tamaño.
  const rojo = (svg) => pixeles(svg, W);
  assert.ok(diferencia(cuadroRgba(0), rojo(r.secuencia.tapa)) < diferencia(cuadroRgba(0), rojo(r.secuencia.placas[0].svg)), 'el cuadro 0 es la tapa');
  assert.equal(pedidos[0].pieza, 'noticia1');
});
