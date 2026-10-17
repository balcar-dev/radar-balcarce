// Arma (o controla) la carpeta infra/render-publico/: lo que se copia tal cual al repositorio público radarbalcarce/radar-balcarce-render (18/10/2026).
//
//   node scripts/sincronizar-render-publico.mjs            copia los archivos de reels/ que usa el render y deja los reemplazos de lo que no se lleva
//   node scripts/sincronizar-render-publico.mjs --controlar  no escribe nada: dice si la carpeta está al día (lo corre una prueba)
//
// El render dibuja con EL MISMO código que usaba el principal (reels/reel.mjs, placa.mjs, animacion.mjs, las escenas…): nada se reescribe, se copia.
// Lo que NO se lleva (la voz de Gemini, el reparto de voces, los números del criterio editorial) se reemplaza por un archivo mínimo del mismo nombre, así
// los archivos copiados quedan idénticos a los originales y no hace falta tocarlos. Si cambia alguno de los originales, esta carpeta queda vieja y la prueba
// avisa: se vuelve a correr este programa y se copia la carpeta al repositorio de render (docs/etapa-10-operacion/PLAN-DE-CAMBIO.md).
//
// Los archivos propios del render (render.mjs, README.md, el workflow, package.json) NO los toca: se escriben y se mantienen a mano en la carpeta.

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
export const DESTINO = path.join(RAIZ, 'infra', 'render-publico');

/** Los archivos que se copian tal cual (texto). */
export const COPIAS = [
  'reels/reel.mjs', 'reels/voz.mjs', 'reels/placa.mjs', 'reels/animacion.mjs', 'reels/alinear.mjs', 'reels/tiempos.mjs', 'reels/duracion.mjs',
  'reels/render-cuadros.mjs', 'reels/pedido.mjs',
  'reels/escenas/comun.mjs', 'reels/escenas/clima.mjs', 'reels/escenas/servicios.mjs', 'reels/escenas/fechas.mjs', 'reels/escenas/deportes.mjs',
  'reels/escenas/repaso.mjs', 'reels/escenas/registro.mjs',
];
/** Las tipografías (binarios). */
export const CARPETA_DE_FUENTES = 'reels/marca/fuentes';

/** Normaliza los finales de línea: el repositorio de render es todo LF. */
const aLF = (texto) => texto.replace(/\r\n/g, '\n');

/** Lo que hay en la carpeta, con los finales de línea de texto normalizados: en la PC de Windows git los entrega con CRLF, y eso no es estar viejo. Las tipografías son binarios y no se tocan. */
const enLaCarpeta = (ruta) => {
  const bytes = Buffer.from(fs.readFileSync(path.join(DESTINO, ruta)));
  return ruta.endsWith('.ttf') ? bytes : Buffer.from(aLF(bytes.toString('utf8')), 'utf8');
};

/** Los reemplazos: archivos mínimos con el nombre de uno que el render no se lleva. `segundosMaximoHistoria` sale del criterio de verdad. */
export async function reemplazos() {
  const { PODCAST_VOZ } = await import('../ingesta/criterio.mjs');
  return {
    'reels/voz-gemini.mjs': `// En el repositorio de render no hay voz de Gemini: la voz llega hecha en el pedido (reels/pedido.mjs). Este archivo existe sólo porque reels/reel.mjs
// lo importa para su camino «normal» (el del repositorio principal); el render siempre le pasa su propia \`hablar\` y nunca llega acá.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export async function decirGemini() {
  throw new Error('El render no pide voz: la voz viene en el pedido.');
}
`,
    'redes/prompt-redes.mjs': `// En el repositorio de render no hay reparto de voces ni indicaciones: eso lo decide el repositorio principal. reels/reel.mjs importa estas dos funciones
// para su camino «normal»; el render le pasa su propia voz y nunca las usa para nada.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export const componerIndicacion = () => null;
export const vozDePieza = () => 'render';
`,
    'ingesta/criterio.mjs': `// Del criterio editorial del repositorio principal el render necesita UN número: cuánto puede durar una historia (Instagram y Facebook rechazan más de 60 s).
// Viene del original (ingesta/criterio.mjs, PODCAST_VOZ.segundosMaximoHistoria) cuando se sincroniza; el pedido trae el mismo número y el render
// se niega a trabajar si no coinciden.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export const PODCAST_VOZ = { segundosMaximoHistoria: ${Number(PODCAST_VOZ.segundosMaximoHistoria)} };
`,
  };
}

/** package.json y package-lock.json del render: los mismos paquetes y versiones que los del principal (resvg y ffmpeg), con el nombre del repositorio de render. */
export function derivados() {
  const raiz = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package-lock.json'), 'utf8'));
  const paquete = {
    name: 'radar-balcarce-render',
    version: '1.0.0',
    private: true,
    description: 'El render de video de Radar Balcarce: arma los reels y las historias a partir de un pedido, sin ningún secreto.',
    type: 'module',
    engines: { node: '>=24' },
    scripts: { render: 'node render.mjs', test: 'node --test pruebas/*.test.mjs' },
    license: 'ISC',
    dependencies: raiz.dependencies,
  };
  lock.name = paquete.name;
  lock.packages[''] = { name: paquete.name, version: paquete.version, license: paquete.license, dependencies: paquete.dependencies };
  return {
    'package.json': `${JSON.stringify(paquete, null, 2)}\n`,
    'package-lock.json': `${JSON.stringify(lock, null, 2)}\n`,
  };
}

/** El esquema de lo que debería haber en la carpeta, como { ruta relativa: bytes }. */
export async function esperado() {
  const salida = new Map();
  for (const [ruta, texto] of Object.entries(derivados())) salida.set(ruta, Buffer.from(texto, 'utf8'));
  for (const ruta of COPIAS) salida.set(ruta, Buffer.from(aLF(fs.readFileSync(path.join(RAIZ, ruta), 'utf8')), 'utf8'));
  for (const f of fs.readdirSync(path.join(RAIZ, CARPETA_DE_FUENTES)).filter((x) => x.endsWith('.ttf')).sort()) {
    salida.set(`${CARPETA_DE_FUENTES}/${f}`, fs.readFileSync(path.join(RAIZ, CARPETA_DE_FUENTES, f)));
  }
  for (const [ruta, texto] of Object.entries(await reemplazos())) salida.set(ruta, Buffer.from(texto, 'utf8'));
  return salida;
}

/** Qué archivos de la carpeta están viejos, faltan o sobran. Devuelve { viejos, faltan }. */
export async function controlar() {
  const viejos = [];
  const faltan = [];
  for (const [ruta, bytes] of await esperado()) {
    const destino = path.join(DESTINO, ruta);
    if (!fs.existsSync(destino)) faltan.push(ruta);
    else if (!enLaCarpeta(ruta).equals(bytes)) viejos.push(ruta);
  }
  return { viejos, faltan };
}

export async function sincronizar() {
  let cambiados = 0;
  for (const [ruta, bytes] of await esperado()) {
    const destino = path.join(DESTINO, ruta);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (fs.existsSync(destino) && enLaCarpeta(ruta).equals(bytes)) continue;
    fs.writeFileSync(destino, bytes);
    cambiados += 1;
  }
  return cambiados;
}

if (process.argv[1] && process.argv[1].endsWith('sincronizar-render-publico.mjs')) {
  if (process.argv.includes('--controlar')) {
    const { viejos, faltan } = await controlar();
    if (viejos.length || faltan.length) {
      console.log(`infra/render-publico está viejo: ${viejos.length} distintos (${viejos.join(', ')}), ${faltan.length} faltan (${faltan.join(', ')}). Correr: node scripts/sincronizar-render-publico.mjs`);
      process.exit(1);
    }
    console.log('infra/render-publico está al día.');
  } else {
    console.log(`infra/render-publico: ${await sincronizar()} archivo(s) escritos.`);
  }
}
