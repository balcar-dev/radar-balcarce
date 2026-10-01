// El cronograma de las redes como una página web (1/10/2026, Hernán: "algo así como en la imagen
// pero en un html, es muy difícil ver algo tan largo en imagen"): una pestaña por día, la hora,
// el tipo, quién la dice y cuántos audios gasta el día; más una grilla de la semana de un vistazo.
//
//   node reels/cronograma-html.mjs --desde=2026-10-05 --dias=8 [--con-efemeride] [--fijas=a,b] [--salida=archivo.html]
//
// Usa las mismas funciones que el reloj (redes/cronograma-semana.mjs). El HTML es de un solo archivo,
// sin dependencias de afuera salvo las tipografías de Google Fonts (con tipografías de respaldo).

import fs from 'node:fs';
import path from 'node:path';
import { cronogramaDeLaSemana, CUPO_DE_VOZ_POR_DIA } from '../redes/cronograma-semana.mjs';
import { diaAR } from '../ingesta/zona.mjs';

/** El nombre corto de cada pieza, para la grilla de la semana. */
export const CORTO = {
  'clima-manana': 'Clima', 'clima-noche': 'Clima noche', farmacia: 'Farmacia', noticia1: 'Repaso mañana', noticia2: 'Repaso tarde',
  podcast: 'Repaso del día', utiles: 'Útiles', agenda: 'Agenda', efemeride: 'Un día como hoy', feriado: 'Feriado',
  'participa-noticias': 'Participá', 'participa-evento': 'Participá', 'participa-reclamos': 'Participá', 'participa-nota': 'Participá',
};

/** La clase de color de cada pieza (los colores están en la hoja de estilos). */
export const TEMA = (nombre) => {
  if (nombre.startsWith('clima')) return 'clima';
  if (nombre.startsWith('participa')) return 'participa';
  if (['farmacia', 'utiles', 'agenda', 'efemeride', 'feriado'].includes(nombre)) return nombre;
  if (nombre.startsWith('aviso')) return 'aviso';
  return 'repaso';
};

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Los datos que lleva la página. */
export function datosDeLaPagina(semana) {
  return {
    cupo: CUPO_DE_VOZ_POR_DIA,
    dias: semana.map((d) => {
      const [a, m, n] = d.fecha.split('-').map(Number);
      const dia = new Date(Date.UTC(a, m - 1, n, 12)).getUTCDay();
      return {
        fecha: d.fecha, corto: `${DIAS_CORTOS[dia]} ${n}`, etiqueta: d.etiqueta, feriado: d.feriado, audios: d.audios,
        piezas: d.piezas.map((p) => ({
          hora: p.hora, nombre: p.nombre, titulo: p.titulo, corto: CORTO[p.nombre] ?? p.titulo, reel: p.tipo === 'reel',
          voz: p.voz === 'la locutora' ? 'locutora' : 'locutor', fija: Boolean(p.fija), nueva: p.nombre === 'efemeride', tema: TEMA(p.nombre),
        })),
      };
    }),
  };
}

const PLANTILLA = `<title>Cronograma de las redes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,700;8..60,900&display=swap">
<style>
/* Una pestaña por día y, abajo, la semana de un vistazo. Papel y tinta de Radar Balcarce; el violeta es el de "Un día como hoy". */
:root {
  --papel: #FAF8F3; --tarjeta: #FFFFFF; --tinta: #14161A; --gris: #474C55; --suave: #6B6F6C; --linea: #D9D4C7; --linea-suave: #ECE8DD;
  --acento: #9D2C8F; --rojo: #C7381C;
  --loc-fondo: #E8A33C; --loc-texto: #14161A; --lor-fondo: #14161A; --lor-texto: #FFFFFF;
  --fija: #16615B; --nueva: #9D2C8F;
  --c-clima: #4A5D8F; --c-farmacia: #13804A; --c-repaso: #14161A; --c-participa: #0F5132; --c-utiles: #B91C1C;
  --c-agenda: #6D4BA0; --c-efemeride: #9D2C8F; --c-feriado: #1E3A6E; --c-aviso: #B45309;
  --serif: "Source Serif 4", Georgia, "Times New Roman", serif; --sans: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --papel: #121417; --tarjeta: #1C1F24; --tinta: #ECEDEE; --gris: #B6BBC1; --suave: #8E949B; --linea: #2E333A; --linea-suave: #252A30;
    --acento: #D58BCB; --rojo: #E4583B; --loc-fondo: #E8A33C; --loc-texto: #14161A; --lor-fondo: #ECEDEE; --lor-texto: #14161A;
    --fija: #5CC2B2; --nueva: #D58BCB;
    --c-clima: #8FA6DB; --c-farmacia: #4CC083; --c-repaso: #ECEDEE; --c-participa: #5CC2A0; --c-utiles: #F07070;
    --c-agenda: #B49BE0; --c-efemeride: #D58BCB; --c-feriado: #7FA0E0; --c-aviso: #E8A33C; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --papel: #121417; --tarjeta: #1C1F24; --tinta: #ECEDEE; --gris: #B6BBC1; --suave: #8E949B; --linea: #2E333A; --linea-suave: #252A30;
  --acento: #D58BCB; --rojo: #E4583B; --loc-fondo: #E8A33C; --loc-texto: #14161A; --lor-fondo: #ECEDEE; --lor-texto: #14161A;
  --fija: #5CC2B2; --nueva: #D58BCB;
  --c-clima: #8FA6DB; --c-farmacia: #4CC083; --c-repaso: #ECEDEE; --c-participa: #5CC2A0; --c-utiles: #F07070;
  --c-agenda: #B49BE0; --c-efemeride: #D58BCB; --c-feriado: #7FA0E0; --c-aviso: #E8A33C; color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--papel); color: var(--tinta); font-family: var(--sans); font-size: 16px; line-height: 1.45; padding-inline: 16px; padding-block: 28px 56px; }
main { max-width: 760px; margin: 0 auto; display: grid; gap: 28px; }
.encabezado { display: grid; gap: 6px; }
.etiqueta { font-size: 12px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--acento); }
h1 { font-family: var(--serif); font-weight: 900; font-size: clamp(32px, 7vw, 48px); line-height: 1.05; margin: 0; text-wrap: balance; }
.sub { color: var(--gris); margin: 0; }
.leyenda { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; color: var(--suave); font-size: 14px; }
.chip { display: inline-flex; align-items: center; height: 26px; padding-inline: 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
.chip.locutora { background: var(--loc-fondo); color: var(--loc-texto); }
.chip.locutor { background: var(--lor-fondo); color: var(--lor-texto); }
.chip.fija { background: transparent; color: var(--fija); box-shadow: inset 0 0 0 2px var(--fija); }
.chip.nueva { background: var(--nueva); color: var(--papel); }
.pestanas { display: grid; grid-template-columns: repeat(auto-fit, minmax(76px, 1fr)); gap: 8px; }
.pestana { font: inherit; text-align: left; background: var(--tarjeta); color: var(--tinta); border: 1px solid var(--linea); border-radius: 12px; padding: 10px 12px; cursor: pointer; display: grid; gap: 6px; }
.pestana:hover { border-color: var(--suave); }
.pestana:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
.pestana[aria-selected="true"] { background: var(--tinta); color: var(--papel); border-color: var(--tinta); }
.pestana .nombre { font-weight: 700; font-size: 15px; }
.pestana .feria { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--c-feriado); }
.pestana[aria-selected="true"] .feria { color: var(--papel); }
.cuenta { font-size: 12px; font-weight: 600; color: var(--suave); font-variant-numeric: tabular-nums; }
.pestana[aria-selected="true"] .cuenta { color: var(--papel); opacity: .8; }
.medidor { display: flex; gap: 3px; }
.medidor i { width: 6px; height: 12px; border-radius: 2px; background: currentColor; }
.medidor i.vacio { background: none; box-shadow: inset 0 0 0 1px var(--linea); }
.pestana[aria-selected="true"] .medidor i.vacio { box-shadow: inset 0 0 0 1px rgba(128,128,128,.6); }
.dia { display: grid; gap: 14px; background: var(--tarjeta); border: 1px solid var(--linea); border-radius: 16px; padding: 20px 20px 8px; }
.dia-cabeza { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 10px 20px; }
.dia h2 { font-family: var(--serif); font-weight: 900; font-size: 30px; line-height: 1.1; margin: 0; }
.dia h2 span { font-family: var(--sans); font-weight: 500; font-size: 18px; color: var(--gris); margin-left: 6px; }
.cupo { display: grid; gap: 4px; justify-items: end; font-size: 13px; font-weight: 600; color: var(--gris); }
.cupo .medidor i { width: 12px; height: 20px; border-radius: 3px; }
.cupo.justo { color: var(--rojo); }
.feriado { margin: 0; font-weight: 600; color: var(--c-feriado); }
.feriado b { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; background: var(--c-feriado); color: var(--papel); padding: 3px 9px; border-radius: 999px; margin-right: 8px; }
.linea-tiempo { list-style: none; margin: 0; padding: 0; }
.pieza { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 4px 14px; align-items: center; padding: 14px 0 14px 14px; border-top: 1px solid var(--linea-suave); border-left: 5px solid var(--color); margin-left: 0; }
.pieza:first-child { border-top: 0; }
.hora { font-weight: 700; font-size: 20px; font-variant-numeric: tabular-nums; }
.titulo { font-weight: 600; font-size: 17px; }
.detalle { display: block; color: var(--suave); font-size: 13.5px; font-weight: 400; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.t-clima { --color: var(--c-clima); } .t-farmacia { --color: var(--c-farmacia); } .t-repaso { --color: var(--c-repaso); }
.t-participa { --color: var(--c-participa); } .t-utiles { --color: var(--c-utiles); } .t-agenda { --color: var(--c-agenda); }
.t-efemeride { --color: var(--c-efemeride); } .t-feriado { --color: var(--c-feriado); } .t-aviso { --color: var(--c-aviso); }
h3 { font-family: var(--serif); font-weight: 900; font-size: 24px; margin: 0 0 4px; }
.nota { color: var(--gris); font-size: 14px; margin: 0 0 12px; max-width: 62ch; }
.desplazable { overflow-x: auto; border: 1px solid var(--linea); border-radius: 14px; background: var(--tarjeta); }
table { border-collapse: collapse; width: 100%; min-width: 640px; font-size: 13px; }
th, td { padding: 8px 8px; border-bottom: 1px solid var(--linea-suave); text-align: left; vertical-align: middle; }
thead th { position: sticky; top: 0; background: var(--tarjeta); font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--suave); }
tbody th { font-variant-numeric: tabular-nums; font-weight: 700; color: var(--gris); white-space: nowrap; }
tr:last-child th, tr:last-child td { border-bottom: 0; }
tr.hueco th, tr.hueco td { background: repeating-linear-gradient(135deg, transparent 0 7px, var(--linea-suave) 7px 8px); color: var(--suave); }
.celda small { font-weight: 500; opacity: .75; }
td .celda + .celda { margin-top: 4px; }
.celda { display: flex; width: fit-content; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 8px; font-weight: 600; background: var(--loc-fondo); color: var(--loc-texto); }
.celda.locutor { background: var(--lor-fondo); color: var(--lor-texto); }
.celda.fija { box-shadow: inset 0 0 0 2px var(--fija); }
.pie { color: var(--suave); font-size: 13.5px; display: grid; gap: 4px; }
.pie p { margin: 0; }
@media (max-width: 520px) {
  .pieza { grid-template-columns: 56px minmax(0, 1fr); }
  .pieza .chips { grid-column: 2; justify-content: flex-start; }
  .dia { padding-inline: 14px; }
}
@media (prefers-reduced-motion: no-preference) { .pestana { transition: background .15s, color .15s, border-color .15s; } }
</style>
<main>
  <header class="encabezado">
    <span class="etiqueta">Radar Balcarce · Instagram y Facebook</span>
    <h1>Cronograma de las redes</h1>
    <p class="sub" id="rango"></p>
    <div class="leyenda">
      <span class="chip locutora">Locutora</span><span class="chip locutor">Locutor</span><span class="chip fija">Fija</span><span class="chip nueva">Nueva</span>
      <span>Fija: armada de antemano, no gasta voz ese día.</span>
    </div>
  </header>
  <div class="pestanas" id="pestanas" role="tablist" aria-label="Días de la semana"></div>
  <section class="dia" id="dia" role="tabpanel" aria-live="polite"></section>
  <section>
    <h3>La semana de un vistazo</h3>
    <p class="nota">De 7 a 21, una fila por hora. Ámbar: la dice la locutora. Negro: el locutor. Con borde verde: fija. Las filas apagadas son horas sin nada.</p>
    <p class="nota" id="huecos"></p>
    <div class="desplazable"><table id="grilla"></table></div>
  </section>
  <footer class="pie">
    <p>Cada cuadrito es un audio del cupo de voz del día: son 10.</p>
    <p>Los reels se suben también como historia, con el mismo video.</p>
  </footer>
</main>
<script>
const DATOS = __DATOS__;
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const el = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cuadros = (n, cupo) => Array.from({ length: cupo }, (_, i) => '<i class="' + (i < n ? '' : 'vacio') + '"></i>').join('');
const primero = DATOS.dias[0], ultimo = DATOS.dias[DATOS.dias.length - 1];
el('rango').textContent = 'Del ' + primero.etiqueta + ' al ' + ultimo.etiqueta + '.';
let actual = 0;

function pestanas() {
  el('pestanas').innerHTML = DATOS.dias.map((d, i) =>
    '<button class="pestana" role="tab" id="p' + i + '" aria-selected="' + (i === actual) + '" aria-controls="dia" data-i="' + i + '">' +
    '<span class="nombre">' + esc(d.corto) + '</span>' +
    (d.feriado ? '<span class="feria">Feriado</span>' : '') +
    '<span class="cuenta" aria-label="' + d.audios + ' de ' + DATOS.cupo + ' audios">' + d.audios + '/' + DATOS.cupo + ' audios</span></button>').join('');
}
function dia() {
  const d = DATOS.dias[actual];
  const [nombre, ...resto] = d.etiqueta.split(' ');
  const justo = d.audios >= DATOS.cupo;
  el('dia').setAttribute('aria-labelledby', 'p' + actual);
  el('dia').innerHTML =
    '<div class="dia-cabeza"><h2>' + esc(nombre[0].toUpperCase() + nombre.slice(1)) + '<span>' + esc(resto.join(' ')) + '</span></h2>' +
    '<div class="cupo' + (justo ? ' justo' : '') + '"><span class="medidor">' + cuadros(d.audios, DATOS.cupo) + '</span>' + d.audios + ' de ' + DATOS.cupo + ' audios' + (justo ? ' · justo' : '') + '</div></div>' +
    (d.feriado ? '<p class="feriado"><b>Feriado</b>' + esc(d.feriado) + '</p>' : '') +
    '<ol class="linea-tiempo">' + d.piezas.map((p) =>
      '<li class="pieza t-' + p.tema + '"><span class="hora">' + esc(p.hora) + '</span>' +
      '<span class="titulo">' + esc(p.titulo) + '<span class="detalle">' + (p.reel ? 'Reel · se sube también como historia' : 'Historia') + '</span></span>' +
      '<span class="chips">' + (p.nueva ? '<span class="chip nueva">Nueva</span>' : '') + (p.fija ? '<span class="chip fija">Fija</span>' : '') +
      '<span class="chip ' + p.voz + '">' + (p.voz === 'locutora' ? 'Locutora' : 'Locutor') + '</span></span></li>').join('') + '</ol>';
}
function grilla() {
  // Todas las horas de 7 a 21: las filas vacías son los huecos.
  const horas = Array.from({ length: 15 }, (_, i) => i + 7);
  const vacias = [];
  let t = '<thead><tr><th></th>' + DATOS.dias.map((d) => '<th>' + esc(d.corto) + '</th>').join('') + '</tr></thead><tbody>';
  for (const h of horas) {
    const prefijo = (h < 10 ? '0' : '') + h + ':';
    const hay = DATOS.dias.some((d) => d.piezas.some((p) => p.hora.startsWith(prefijo)));
    if (!hay) vacias.push(h);
    t += '<tr class="' + (hay ? '' : 'hueco') + '"><th scope="row">' + h + ':00</th>' + DATOS.dias.map((d) => {
      const ps = d.piezas.filter((x) => x.hora.startsWith(prefijo));
      return '<td>' + ps.map((p) => '<span class="celda ' + p.voz + (p.fija ? ' fija' : '') + '" title="' + esc(p.titulo) + ' · ' + esc(p.hora) + '">' + esc(p.corto) + (p.hora.slice(3) !== '00' ? ' <small>' + esc(p.hora) + '</small>' : '') + '</span>').join('') + '</td>';
    }).join('') + '</tr>';
  }
  el('grilla').innerHTML = t + '</tbody>';
  el('huecos').textContent = vacias.length
    ? 'Horas sin ninguna pieza en toda la semana: ' + vacias.map((h) => h + ':00').join(', ') + '.'
    : 'Todas las horas de 7 a 21 tienen alguna pieza.';
}
function elegir(i) { actual = i; pestanas(); dia(); const b = el('p' + i); if (b) b.focus({ preventScroll: true }); }
el('pestanas').addEventListener('click', (e) => { const b = e.target.closest('.pestana'); if (b) elegir(Number(b.dataset.i)); });
el('pestanas').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  elegir((actual + (e.key === 'ArrowRight' ? 1 : DATOS.dias.length - 1)) % DATOS.dias.length);
  e.preventDefault();
});
pestanas(); dia(); grilla();
</script>
`;

/** La página entera. */
export function paginaDelCronograma(semana) {
  return PLANTILLA.replace('__DATOS__', JSON.stringify(datosDeLaPagina(semana)).replace(/</g, '\\u003c'));
}

if (process.argv[1] && process.argv[1].endsWith('cronograma-html.mjs')) {
  const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
  const semana = cronogramaDeLaSemana(arg('desde', diaAR()), Number(arg('dias', '7')), {
    conEfemeride: process.argv.includes('--con-efemeride'), fijas: arg('fijas').split(',').filter(Boolean),
  });
  const salida = path.resolve(arg('salida', 'reels/salida/cronograma.html'));
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, paginaDelCronograma(semana), 'utf8');
  console.log(`Listo: ${salida}`);
}
