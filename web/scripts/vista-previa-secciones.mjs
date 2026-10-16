// VISTA PREVIA de las secciones nuevas (regla 187, 17/10/2026): compila el sitio con el interruptor SECCIONES_NUEVAS
// prendido SÓLO para esta compilación y guarda en docs/secciones/vista-previa/ unas capturas en HTML que se abren con
// doble clic, sin servidor: la portada, la portada con el menú "Más secciones" abierto, /seccion/educacion y
// /seccion/salud, con las notas reales de web/data, y una página de entrada con la lista de las notas que pasan a
// Educación y Salud. NO cambia el sitio publicado: no toca web/data, no sube nada y no prende la variable de GitHub.
//
//   cd web && node scripts/vista-previa-secciones.mjs                 compila y arma las capturas (unos 5 a 8 minutos)
//   cd web && node scripts/vista-previa-secciones.mjs --sin-compilar  sólo arma las capturas con el web/out que ya hay
//                                                                     (tiene que haberse compilado con SECCIONES_NUEVAS=si)
//
// Usa los datos que haya en web/data: para ver lo último, traer antes los de GitHub (git pull) o correr `npm run datos`
// (y después `git checkout -- web/data`, ver CLAUDE.md). Al terminar borra web/out: es una compilación de prueba y no
// tiene que subirse por error.
//
// Las capturas: el CSS y las letras van adentro del archivo; las fotos y los enlaces a las notas apuntan al sitio
// publicado (radarbalcarce.com: las notas ya existen ahí con la misma dirección). Sin el JavaScript de Next: el menú
// se abre con un script chico propio, el buscador no anda y las horas ("hace 2 h") son las de cuando se compiló.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const WEB = path.join(import.meta.dirname, '..');
const OUT = path.join(WEB, 'out');
const DESTINO = path.join(WEB, '..', 'docs', 'secciones', 'vista-previa');
const SITIO = 'https://radarbalcarce.com';
const sinCompilar = process.argv.includes('--sin-compilar');

// ---------------------------------------------------------------- compilar
if (!sinCompilar) {
  console.log('Compilando el sitio con SECCIONES_NUEVAS=si (sólo esta compilación)…');
  // Dos intentos: en Windows la compilación a veces se cae con un "ENOENT: mkdir" de una carpeta de .next que no tiene que ver
  // con esto (pasó dos veces el 17/10, con distintas notas); el segundo intento, de cero, anda.
  let r;
  for (let intento = 1; intento <= 2; intento += 1) {
    fs.rmSync(OUT, { recursive: true, force: true });
    if (intento > 1) fs.rmSync(path.join(WEB, '.next'), { recursive: true, force: true });
    r = spawnSync('npx next build', {
      cwd: WEB, stdio: 'inherit', shell: true,
      env: { ...process.env, SECCIONES_NUEVAS: 'si' },
    });
    if (r.status === 0) break;
    if (intento === 1) console.log('La compilación falló; se prueba una vez más, de cero…');
  }
  if (r.status !== 0) {
    console.error('La compilación falló: no se armó la vista previa.');
    process.exit(1);
  }
}
for (const f of ['index.html', 'seccion/educacion.html', 'seccion/salud.html']) {
  if (!fs.existsSync(path.join(OUT, f))) {
    console.error(`Falta web/out/${f}: compilá con SECCIONES_NUEVAS=si (o corré sin --sin-compilar).`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------- las notas que cambian (para la página de entrada)
process.env.SECCIONES_NUEVAS = 'si';
process.chdir(WEB);
const datos = await import('../lib/datos.js');
const movidas = datos.todasLasNotas().filter((n) => n.seccionAntes && ['Educación', 'Salud'].includes(n.seccion))
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
const enPagina = { Educación: datos.notasDeLaSeccion('Educación').length, Salud: datos.notasDeLaSeccion('Salud').length };

// ---------------------------------------------------------------- de página compilada a captura suelta
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LOCALES = { '/': 'portada.html', '/seccion/educacion': 'educacion.html', '/seccion/salud': 'salud.html' };
const letra = (archivo) => `data:font/woff2;base64,${fs.readFileSync(path.join(WEB, 'public', 'fuentes', archivo)).toString('base64')}`;

function cssAdentro(html) {
  return html.replace(/<link rel="stylesheet" href="([^"]+)"[^>]*\/?>/g, (_, href) => {
    let css = fs.readFileSync(path.join(OUT, href.replace(/^\//, '')), 'utf8');
    // Las letras latinas van adentro; las extendidas (acentos raros) se piden al sitio.
    css = css.replace(/url\((["']?)\/fuentes\/([a-z0-9-]+-latin\.woff2)\1\)/g, (m, q, f) => `url(${letra(f)})`);
    css = css.replace(/url\((["']?)\/(?!\/)/g, `url($1${SITIO}/`);
    return `<style>${css}</style>`;
  });
}

function direccion(valor) {
  if (!valor.startsWith('/') || valor.startsWith('//')) return valor;
  const [camino, resto = ''] = valor.split(/(?=[?#])/);
  const limpio = camino.replace(/\/$/, '') || '/';
  return LOCALES[limpio] ? `${LOCALES[limpio]}${resto}` : `${SITIO}${valor}`;
}

const BARRA = (actual) => `<div class="vp-aviso" role="note"><strong>Vista previa: no es el sitio publicado.</strong>
Así se vería radarbalcarce.com con las secciones nuevas <b>Educación</b> y <b>Salud</b> y el menú «Más secciones» (interruptor SECCIONES_NUEVAS, apagado en el sitio real).
<nav aria-label="Páginas de la vista previa">${[['index.html', 'Qué es'], ['portada.html', 'Portada'], ['menu.html', 'Menú abierto'], ['educacion.html', 'Educación'], ['salud.html', 'Salud']]
    .map(([h, t]) => (h === actual ? `<b>${t}</b>` : `<a href="${h}">${t}</a>`)).join(' · ')}</nav></div>`;

const ESTILO_AVISO = `<style>.vp-aviso{background:#FFF4DC;color:#3B2A00;border-bottom:2px solid #8A5A00;font:14px/1.45 Inter,system-ui,sans-serif;padding:10px 16px}
.vp-aviso nav{margin-top:4px}.vp-aviso a{color:#9C2B15;font-weight:600;text-decoration:underline}</style>`;

// El menú sin React: el mismo comportamiento que components/navegacion.js (abrir, cerrar con la × o Escape, el foco vuelve al botón,
// en la computadora un toque afuera lo cierra).
const MENU = `<script>(function(){var nav=document.querySelector('nav.principal.con-mas');if(!nav)return;
var b=nav.querySelector('.boton-mas'),p=document.getElementById('panel-secciones'),x=p.querySelector('.cerrar'),velo=null;
var cel=function(){return window.matchMedia('(max-width: 899px)').matches;};
function abrir(){p.hidden=false;b.setAttribute('aria-expanded','true');nav.classList.add('abierto');
if(!cel()){velo=document.createElement('div');velo.className='velo';velo.setAttribute('aria-hidden','true');velo.onclick=function(){cerrar(true);};nav.appendChild(velo);}
else document.body.style.overflow='hidden';
var f=[].filter.call(p.querySelectorAll('a[href],button'),function(e){return e.getClientRects().length;});if(f[0])f[0].focus();}
function cerrar(volver){p.hidden=true;b.setAttribute('aria-expanded','false');nav.classList.remove('abierto');document.body.style.overflow='';
if(velo){velo.remove();velo=null;}if(volver)b.focus();}
b.addEventListener('click',function(){p.hidden?abrir():cerrar(false);});x.addEventListener('click',function(){cerrar(true);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!p.hidden){e.preventDefault();cerrar(true);}});
document.addEventListener('mousedown',function(e){if(!p.hidden&&!cel()&&!nav.contains(e.target))cerrar(false);});
if(!p.hidden){nav.classList.add('abierto');if(!cel()){velo=document.createElement('div');velo.className='velo';velo.onclick=function(){cerrar(true);};nav.appendChild(velo);}}
})();</script>`;

function captura(origen, actual, { menuAbierto = false } = {}) {
  let html = fs.readFileSync(path.join(OUT, origen), 'utf8');
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<link rel="(?:preload|modulepreload)"[^>]*as="(?:script|font)"[^>]*\/?>/g, '')
    .replace(/<link rel="preload" href="\/fuentes\/[^"]*"[^>]*\/?>/g, '')
    .replace(/<link rel="(?:manifest|alternate)"[^>]*\/?>/g, '');
  html = cssAdentro(html);
  html = html.replace(/\b(href|src)="([^"]*)"/g, (_, a, v) => `${a}="${direccion(v)}"`)
    .replace(/\b(srcset|srcSet)="([^"]*)"/g, (_, a, v) => `${a}="${v.split(',').map((p) => p.trim().replace(/^\S+/, (u) => direccion(u))).join(', ')}"`)
    .replace(/url\((&quot;|["']?)\/(?!\/)/g, `url($1${SITIO}/`);
  html = html.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, nofollow"/>');
  if (menuAbierto) {
    html = html.replace(/(<div id="panel-secciones"[^>]*?) hidden=""/, '$1')
      .replace(/(<button type="button" class="boton-mas[^"]*" aria-expanded=")false"/, '$1true"');
  }
  html = html.replace('</head>', `${ESTILO_AVISO}</head>`).replace(/<body([^>]*)>/, `<body$1>${BARRA(actual)}`)
    .replace('</body>', `${MENU}</body>`);
  return html;
}

fs.rmSync(DESTINO, { recursive: true, force: true });
fs.mkdirSync(DESTINO, { recursive: true });
const paginas = [
  ['portada.html', 'index.html'],
  ['menu.html', 'index.html', { menuAbierto: true }],
  ['educacion.html', 'seccion/educacion.html'],
  ['salud.html', 'seccion/salud.html'],
];
for (const [nombre, origen, opciones] of paginas) {
  fs.writeFileSync(path.join(DESTINO, nombre), captura(origen, nombre, opciones), 'utf8');
}

// ---------------------------------------------------------------- la página de entrada
const filas = movidas.map((n) => `<tr><td>${esc(n.seccion)}</td><td>${esc(n.seccionAntes)}</td><td><a href="${SITIO}${esc(n.ruta)}">${esc(n.titulo)}</a></td><td>${esc(String(n.fecha).slice(0, 10))}</td></tr>`).join('\n');
const entrada = `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vista previa de secciones</title><meta name="robots" content="noindex, nofollow">
<style>
:root{--tinta:#14161A;--papel:#FFFFFF;--linea:#E4DFD2;--suave:#5F635F;--rojo:#9C2B15;--edu:#1D4BE0;--salud:#004E5C;color-scheme:light}
body{margin:0;background:var(--papel);color:var(--tinta);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:860px;margin:0 auto;padding:16px}
h1{font:800 26px/1.2 Georgia,serif;margin:8px 0}h2{font:700 19px/1.3 Georgia,serif;margin:26px 0 8px}
a{color:var(--rojo)}.botones{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:16px 0}
.botones a{display:block;padding:12px 14px;border:1px solid var(--linea);border-radius:10px;text-decoration:none;font-weight:700;color:var(--tinta)}
.botones a span{display:block;font-weight:400;font-size:13px;color:var(--suave)}
.botones a span.chip{display:inline-block;color:#fff;font-weight:700}
.chip{display:inline-block;color:#fff;border-radius:4px;padding:1px 7px;font-size:13px;font-weight:700}
.tabla{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid var(--linea);padding:6px 6px;text-align:left;vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--suave)}li{margin:4px 0}
</style></head><body><main>
<h1>Vista previa: Educación, Salud y el menú «Más secciones»</h1>
<p><b>No es el sitio publicado.</b> Son capturas de cómo se vería radarbalcarce.com si se prende el interruptor <code>SECCIONES_NUEVAS</code>
(etapa 2 del mapa de secciones, <code>docs/secciones/MAPA-DE-SECCIONES.md</code>). Hoy está apagado: el sitio sale igual que siempre.
Armada el ${esc(new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }))} con las notas que había en <code>web/data</code>.</p>
<div class="botones">
<a href="portada.html">Portada<span>con los bloques de Educación y Salud</span></a>
<a href="menu.html">Menú abierto<span>«Más secciones» desplegado</span></a>
<a href="educacion.html"><span class="chip" style="background:var(--edu)">Educación</span><span>${enPagina.Educación} notas</span></a>
<a href="salud.html"><span class="chip" style="background:var(--salud)">Salud</span><span>${enPagina.Salud} notas</span></a>
</div>
<h2>Qué mirar</h2>
<ul>
<li><b>En el celular</b> (o con la ventana angosta): la fila de secciones se desliza y a la derecha queda fijo el botón «Secciones», que abre todas las secciones agrupadas. Se cierra con la ×, con Escape o eligiendo una.</li>
<li><b>En la computadora</b>: la barra lleva las ocho secciones fuertes, «Más secciones ▾» y los servicios en verde a la derecha.</li>
<li><b>Las direcciones de las notas no cambian</b>: una nota que pasa de Balcarce a Educación sigue en la misma dirección (/nota/titulo-id). Los enlaces de las notas abren el sitio publicado.</li>
<li>Es una captura: el buscador no anda y las horas («hace 2 h») son las del momento en que se armó.</li>
</ul>
<h2>Las notas que pasan a Educación y Salud (${movidas.length})</h2>
<p>Sólo lo que el clasificador del mapa manda sin duda: una palabra firme en el título, o en la bajada dos firmes o una firme con una débil en el título. Una palabra débil sola no alcanza. Lo que corrigió o publicó una persona no se toca. Fútbol, Automovilismo y Policiales no se mueven.</p>
<div class="tabla"><table><thead><tr><th>Ahora</th><th>Antes</th><th>Nota</th><th>Fecha</th></tr></thead><tbody>
${filas}
</tbody></table></div>
<h2>Cómo se prende en el sitio real</h2>
<p>En GitHub: <i>Settings → Secrets and variables → Actions → Variables</i>, crear <code>SECCIONES_NUEVAS</code> con el valor <code>Si</code>. Se ve en la siguiente actualización (media hora). Para volver atrás, borrarla o ponerle <code>No</code>: el sitio vuelve a ser el de antes y ninguna nota cambia de dirección.</p>
</main></body></html>
`;
fs.writeFileSync(path.join(DESTINO, 'index.html'), entrada, 'utf8');

// Una compilación con el interruptor prendido no tiene que quedar a mano para subirse por error.
if (!sinCompilar) fs.rmSync(OUT, { recursive: true, force: true });
console.log(`Listo: ${path.relative(path.join(WEB, '..'), DESTINO)}/index.html (${movidas.length} notas pasan a Educación o Salud; en página: Educación ${enPagina.Educación}, Salud ${enPagina.Salud}).`);
