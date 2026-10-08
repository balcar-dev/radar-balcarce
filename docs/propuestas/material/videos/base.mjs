// Videos de ejemplo (solo para mirar; no es código del proyecto). Cuadro por cuadro con resvg y ffmpeg.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const AQUI = import.meta.dirname;
const REPO = '/home/user/radar-balcarce';
const require = createRequire(path.join(AQUI, '..', 'copia', 'package.json'));
const { Resvg } = require('@resvg/resvg-js');
const FUENTES = fs.readdirSync(path.join(REPO, 'reels/marca/fuentes')).map((f) => path.join(REPO, 'reels/marca/fuentes', f));
const portada = JSON.parse(fs.readFileSync(path.join(REPO, 'web/data/portada.json'), 'utf8'));

const W = 1080, H = 1920, FPS = 30;
const C = { fondo: '#F7F5F0', tinta: '#14161A', texto: '#3B403C', suave: '#6B6F6C', rojo: '#C7381C', verde: '#155C3E', linea: '#1A1A1A', blanco: '#FFFFFF' };
const SECC = { Balcarce: '#B91C1C', 'Cultura y agenda': '#9D2C8F', Automovilismo: '#B45309', Economía: '#0F5E8C', Fútbol: '#7C3AED' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const prog = (t, a, b) => clamp((t - a) / (b - a));
function envolver(texto, maxCar) {
  const out = []; let l = '';
  for (const p of texto.split(/\s+/)) { if ((l + ' ' + p).trim().length > maxCar) { out.push(l.trim()); l = p; } else l += ' ' + p; }
  if (l.trim()) out.push(l.trim());
  return out;
}
const fotoData = (rel) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(REPO, 'web/public', rel)).toString('base64');
const archivo = JSON.parse(fs.readFileSync(path.join(REPO, 'web/data/archivo.json'), 'utf8'));
const todas = [...portada.notas, ...(Array.isArray(archivo) ? archivo : archivo.notas || Object.values(archivo).flat())];
const nota = (id) => todas.find((n) => n && n.id === id);

function pie(t, dur) {
  const y = H - 230;
  return `
  <line x1="80" y1="${y}" x2="${W - 80}" y2="${y}" stroke="${C.linea}" stroke-width="3"/>
  <text x="80" y="${y + 62}" font-family="Source Serif 4 60pt" font-weight="700" font-size="40" fill="${C.tinta}">Radar <tspan fill="${C.rojo}">Balcarce</tspan></text>
  <text x="${W - 80}" y="${y + 58}" text-anchor="end" font-family="Inter" font-weight="500" font-size="30" fill="${C.texto}">radarbalcarce.com</text>
  <rect x="0" y="${H - 14}" width="${W * clamp(t / dur)}" height="14" fill="${C.rojo}"/>`;
}

// Subtítulos tipo karaoke (tiempos inventados: la voz real los daría)
function subtitulos(t, frase, desde, porPalabra = 0.32) {
  const pal = frase.split(' ');
  const i = Math.floor((t - desde) / porPalabra);
  if (i < 0) return '';
  const bloque = Math.floor(clamp(i, 0, pal.length - 1) / 4) * 4;
  const vis = pal.slice(bloque, bloque + 4);
  let x = 0; const sz = 52;
  const partes = vis.map((p, k) => {
    const actual = bloque + k === i;
    const s = `<tspan fill="${actual ? C.rojo : C.tinta}" font-weight="${actual ? 700 : 600}">${esc(p)} </tspan>`;
    return s;
  }).join('');
  return `<text x="${W / 2}" y="${H - 300}" text-anchor="middle" font-family="Inter" font-size="${sz}">${partes}</text>`;
}

function renderizar(nombre, dur, cuadro) {
  const dir = path.join(AQUI, 'cuadros-' + nombre);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * FPS);
  for (let f = 0; f < n; f++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${cuadro(f / FPS, dur)}</svg>`;
    const png = new Resvg(svg, { font: { fontFiles: FUENTES, loadSystemFonts: false, defaultFontFamily: 'Inter' }, fitTo: { mode: 'width', value: 720 } }).render().asPng();
    fs.writeFileSync(path.join(dir, String(f).padStart(4, '0') + '.png'), png);
  }
  const out = path.join(AQUI, nombre + '.mp4');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'medium', '-movflags', '+faststart', out]);
  if (r.status) throw new Error(r.stderr.toString());
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('listo', out);
}

export { W, H, FPS, C, SECC, esc, clamp, easeOut, easeInOut, prog, envolver, fotoData, nota, pie, subtitulos, renderizar, portada, REPO };
