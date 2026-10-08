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

// ---------- A: nota con foto, zoom lento, título que entra ----------
const nA = nota('1boxf4v');
const fA = fotoData(nA.foto.archivo);
renderizar('ejemplo-1-nota-con-foto', 9, (t, dur) => {
  const z = 1 + 0.12 * easeInOut(t / dur);
  const fotoH = 1080;
  const tx = -(W * (z - 1)) / 2 - 30 * (t / dur), ty = -(fotoH * (z - 1)) / 2;
  const chip = easeOut(prog(t, 0.3, 0.9));
  const lineas = envolver(nA.titulo, 22);
  const tit = lineas.map((l, k) => {
    const a = easeOut(prog(t, 0.6 + k * 0.18, 1.2 + k * 0.18));
    return `<text x="80" y="${fotoH + 150 + k * 92 + (1 - a) * 40}" opacity="${a}" font-family="Source Serif 4 60pt" font-weight="700" font-size="80" fill="${C.tinta}">${esc(l)}</text>`;
  }).join('');
  const color = SECC[nA.seccion] || C.rojo;
  return `
  <rect width="${W}" height="${H}" fill="${C.fondo}"/>
  <clipPath id="c"><rect width="${W}" height="${fotoH}"/></clipPath>
  <g clip-path="url(#c)"><image href="${fA}" x="${tx}" y="${ty}" width="${W * z}" height="${fotoH * z}" preserveAspectRatio="xMidYMid slice"/></g>
  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
  <rect width="${W}" height="${fotoH}" fill="url(#g)"/>
  <text x="80" y="${fotoH - 40}" font-family="Inter" font-weight="500" font-size="26" fill="#FFFFFF" opacity="0.9">${esc(nA.foto.credito)}</text>
  <g transform="translate(${-320 * (1 - chip)},0)" opacity="${chip}"><rect x="80" y="${fotoH + 30}" width="${nA.seccion.length * 22 + 60}" height="56" fill="${color}"/>
  <text x="110" y="${fotoH + 68}" font-family="Inter" font-weight="700" font-size="28" letter-spacing="3" fill="#FFFFFF">${esc(nA.seccion.toUpperCase())}</text></g>
  ${tit}
  ${subtitulos(t, 'Demarcan la Ruta 55 entre el paraje Pieres y Balcarce, un pedido de años de los vecinos.', 2.2)}
  ${pie(t, dur)}`;
});

// ---------- B: clima animado ----------
const cl = portada.clima;
const gotas = Array.from({ length: 70 }, (_, i) => ({ x: (i * 157) % W, v: 900 + ((i * 97) % 500), d: (i * 0.137) % 1, l: 40 + (i % 5) * 12 }));
renderizar('ejemplo-2-clima-animado', 8, (t, dur) => {
  const temp = Math.round(cl.ahora.temp * easeOut(prog(t, 0.2, 1.2)));
  const lluvia = gotas.map((g) => { const y = ((t * g.v + g.d * H) % (H + 200)) - 100; return `<line x1="${g.x}" y1="${y}" x2="${g.x - 10}" y2="${y + g.l}" stroke="#7A9BB0" stroke-width="4" stroke-linecap="round" opacity="0.35"/>`; }).join('');
  const dias = cl.dias.slice(0, 5);
  const minT = Math.min(...dias.map((d) => d.min)) - 2, maxT = Math.max(...dias.map((d) => d.max)) + 2;
  const yT = (v) => 1330 - ((v - minT) / (maxT - minT)) * 360;
  const cols = dias.map((d, k) => {
    const a = easeOut(prog(t, 1.4 + k * 0.15, 2.2 + k * 0.15));
    const x = 120 + k * 190, y1 = yT(d.max), y2 = yT(d.min), yc = (y1 + y2) / 2;
    const top = yc - (yc - y1) * a, bot = yc + (y2 - yc) * a;
    return `<g opacity="${clamp(a * 1.5)}">
      <text x="${x + 40}" y="890" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="${C.tinta}">${esc(d.dia)}</text>
      <rect x="${x + 22}" y="${top}" width="36" height="${Math.max(0, bot - top)}" rx="18" fill="${C.rojo}" opacity="0.85"/>
      <text x="${x + 40}" y="${top - 18}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="${C.tinta}">${d.max}°</text>
      <text x="${x + 40}" y="${bot + 44}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="30" fill="${C.texto}">${d.min}°</text>
      <text x="${x + 40}" y="1450" text-anchor="middle" font-family="Inter" font-weight="600" font-size="28" fill="#2F6E8F">${d.lluvia}%</text></g>`;
  }).join('');
  const sub = easeOut(prog(t, 0.9, 1.5));
  return `
  <rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${lluvia}
  <text x="80" y="220" font-family="Inter" font-weight="700" font-size="32" letter-spacing="4" fill="${C.rojo}">CLIMA EN BALCARCE</text>
  <text x="80" y="290" font-family="Inter" font-weight="500" font-size="36" fill="${C.texto}">Jueves 8 de octubre</text>
  <text x="60" y="640" font-family="Source Serif 4 60pt" font-weight="900" font-size="340" fill="${C.tinta}">${temp}°</text>
  <g opacity="${sub}" transform="translate(0,${(1 - sub) * 30})">
    <text x="80" y="740" font-family="Source Serif 4 60pt" font-weight="700" font-size="64" fill="${C.tinta}">${esc(cl.ahora.cielo)}</text>
    <text x="80" y="810" font-family="Inter" font-weight="500" font-size="36" fill="${C.texto}">Viento ${cl.ahora.viento} km/h del ${cl.ahora.rumbo} · humedad ${cl.ahora.humedad}%</text></g>
  <text x="80" y="1505" font-family="Inter" font-weight="500" font-size="26" fill="${C.suave}" opacity="${sub}">Probabilidad de lluvia por día</text>
  ${cols}
  ${subtitulos(t, 'Buen día. En Balcarce hay llovizna y nueve grados, con viento del sudeste. El sábado vuelve la lluvia.', 0.6)}
  ${pie(t, dur)}`;
});

// ---------- C: repaso con transiciones ----------
const notasC = ['1boxf4v', '10cpafd', '28zqic'].map(nota);
const fotosC = notasC.map((n) => fotoData(n.foto.archivo));
const TRAMO = 3.4;
renderizar('ejemplo-3-repaso-con-transiciones', TRAMO * 3, (t, dur) => {
  const i = Math.min(2, Math.floor(t / TRAMO));
  const local = t - i * TRAMO;
  const salida = i < 2 ? easeInOut(prog(local, TRAMO - 0.45, TRAMO)) : 0;
  const pantalla = (k, dx, lt) => {
    const n = notasC[k]; const color = SECC[n.seccion] || C.rojo;
    const z = 1.04 + 0.08 * clamp(lt / TRAMO);
    const lineas = envolver(n.titulo, 21);
    const a = easeOut(prog(lt, 0.25, 0.8));
    return `<g transform="translate(${dx},0)">
      <rect width="${W}" height="${H}" fill="${C.fondo}"/>
      <clipPath id="f${k}"><rect x="80" y="330" width="${W - 160}" height="720"/></clipPath>
      <g clip-path="url(#f${k})"><image href="${fotosC[k]}" x="${80 - (W - 160) * (z - 1) / 2}" y="${330 - 720 * (z - 1) / 2}" width="${(W - 160) * z}" height="${720 * z}" preserveAspectRatio="xMidYMid slice"/></g>
      <text x="80" y="1090" font-family="Inter" font-weight="500" font-size="24" fill="${C.suave}">${esc(n.foto.credito)}</text>
      <rect x="80" y="1130" width="12" height="${lineas.length * 84 - 10}" fill="${color}"/>
      ${lineas.map((l, j) => `<text x="120" y="${1195 + j * 84}" opacity="${a}" font-family="Source Serif 4 60pt" font-weight="700" font-size="70" fill="${C.tinta}">${esc(l)}</text>`).join('')}
      <text x="120" y="${1180 + lineas.length * 84 + 30}" font-family="Inter" font-weight="700" font-size="28" letter-spacing="3" fill="${color}" opacity="${a}">${esc(n.seccion.toUpperCase())}</text>
    </g>`;
  };
  let cuerpo = pantalla(i, -W * salida, local);
  if (salida > 0) cuerpo += pantalla(i + 1, W * (1 - salida), 0);
  const puntos = [0, 1, 2].map((k) => `<circle cx="${W - 200 + k * 50}" cy="215" r="${k === i ? 14 : 10}" fill="${k <= i ? C.rojo : '#CFCBC2'}"/>`).join('');
  return `${cuerpo}
  <text x="80" y="200" font-family="Inter" font-weight="700" font-size="32" letter-spacing="4" fill="${C.rojo}">EL REPASO DE LA TARDE</text>
  <text x="80" y="250" font-family="Inter" font-weight="500" font-size="30" fill="${C.texto}">${i + 1} de 3</text>
  ${puntos}
  ${subtitulos(t, 'Esto pasó hoy en Balcarce. Demarcan la Ruta 55 entre Pieres y Balcarce. La Casa del Bicentenario homenajea a Ricardo Soulé. Y piden gestiones por el regreso del TC.', 0.4)}
  ${pie(t, dur)}`;
});
