// El CATÁLOGO de las plantillas (9/10/2026): una página con todas las variantes de cada pieza, una al lado de la otra y por categoría,
// con las reglas comunes y la regla propia de cada pieza (docs/propuestas/PLANTILLAS-DE-PIEZAS.md). Para mirar y aprobar.
//
//   node reels/catalogo-plantillas.mjs [salida.html]     (por defecto reels/salida/catalogo-plantillas.html)
//
// No gasta voz ni red: dibuja un cuadro de cada escena (ya entrada, a los 7 segundos) con las mismas herramientas de las piezas.

import fs from 'node:fs';
import path from 'node:path';
import { ejemplos, ejemplosDeClima, ejemplosDeServicios } from './ejemplos-plantillas.mjs';
import { esc } from './placa.mjs';

export const REGLAS_COMUNES = [
  'Una sola estética: fondo papel, títulos en Source Serif 4, el resto en Inter, el color de la pieza como único acento y la firma «Radar Balcarce · radarbalcarce.com» siempre abajo.',
  'Siempre la misma estructura: rótulo chico arriba, un protagonista (una cifra o una ilustración que se mueve), el detalle en tarjetas y la firma.',
  'Zona segura: todo el texto entre las filas 250 y 1440; los subtítulos de la voz más abajo, con la palabra que se dice en el color de la pieza.',
  'El movimiento tiene orden: primero entran los bloques de a uno (menos de 2,3 s), las cifras cuentan hasta su valor, y después un solo movimiento suave de fondo. Nada que tiemble ni parpadee, y el texto no se mueve una vez que entró.',
  'La pantalla muestra los datos; la voz cuenta lo importante y nunca lee un teléfono ni una dirección.',
  'La voz tiene memoria: el saludo se dice una vez por franja y ninguna frase se repite en el mismo día.',
  'Si falta un dato, no se escribe (nunca «0 % de lluvia»); si falta lo importante, la pieza no sale.',
  'Nunca el nombre de otro medio, marcas de agua, fotos sin permiso, «en vivo», adjetivos de titular, promesas ni menores o víctimas.',
  'Todo reel lleva en el posteo «Voz generada con inteligencia artificial.»',
];

export const CATEGORIAS = [
  {
    id: 'clima', titulo: 'Clima de la mañana y de la noche', cuando: '7:00 y 20:00 · 12 a 20 s', prefijo: 'clima-v',
    regla: 'Una variante por cielo (despejado, parcial, nublado, llovizna, lluvia, tormenta, niebla), de día con fondo claro y de noche con fondo azul oscuro. La mañana muestra la temperatura de ahora y los próximos cuatro días; la noche, la mínima de la madrugada que viene y cómo amanece. Etiquetas chicas: Helada (mínima de 2° o menos), Calor (máxima de 32° o más), Viento fuerte (40 km/h o más). Sin dato de lluvia no se dibuja el porcentaje.',
  },
  {
    id: 'aviso', titulo: 'Aviso de clima', cuando: 'apenas se detecta (7:00 a 22:00) · 10 a 18 s', prefijo: 'clima-', soloEstos: /aviso/,
    regla: 'Sale cuando el pronóstico pasa un umbral alto: helada fuerte (−2° o menos), granizo o tormenta fuerte, viento de 60 km/h o más. Una vez por día y por tipo. Es un panel grande con el título como protagonista, lo que hay que saber y dos cifras de un vistazo; sin pronóstico de cuatro días. Cada aviso tendrá su nota propia en la web.',
  },
  {
    id: 'farmacia', titulo: 'Farmacia de turno', cuando: '19:00 · 8 a 20 s', prefijo: 'farmacia-',
    regla: 'La cruz verde late arriba a la derecha y una ficha por farmacia (nombre, dirección con marcador y teléfono), centradas. No se anuncia cuántas hay: queda igual con una, dos o tres. Abajo, hasta cuándo dura el turno (8:30 de mañana). La voz dice los nombres; no lee direcciones ni teléfonos.',
  },
  {
    id: 'efemeride', titulo: 'Un día como hoy (efeméride)', cuando: '9:00 · 15 a 25 s', prefijo: 'efemeride-t',
    regla: 'El año corre hacia atrás desde 2026 hasta el del hecho; título, una línea de contexto y «Y además». Siete tipos, cada uno con su color e ilustración. Criterio de centro y centro-derecha: se priorizan las fechas patrias, las instituciones, el campo, la ciencia y la técnica, el deporte y Balcarce; tono sobrio, con orgullo sereno. Los hechos tristes o discutidos se cuentan con hechos y sin adjetivos, y una persona los revisa antes de salir. Sin consignas ni opiniones sobre gobiernos.',
  },
  {
    id: 'feriado', titulo: 'El feriado', cuando: '8:00 · 12 a 25 s', prefijo: 'feriado-',
    regla: 'La hoja de calendario pasa al día del feriado, con el nombre, un dato histórico con su año grande y una ilustración de la fecha. Variantes: patrio, religioso (sobrio), trasladable (de qué día pasa a cuál), por decreto (con su alcance, sin año) y Carnaval. Sin estadísticas; cada feriado tiene su «enfoque» escrito.',
  },
  {
    id: 'participa', titulo: 'Participá', cuando: '12:00 · cuatro días por semana · 10 a 18 s', prefijo: 'participa-',
    regla: 'La pregunta grande, la franja con el WhatsApp, el sobre con el mail y el pie. Una variante por día: noticias (lunes), evento o emprendimiento (martes), reclamo (miércoles) y nota de un club o escuela (viernes), cada una con el color de su sección. La voz hace la pregunta y manda a la pantalla; no lee el número ni el mail.',
  },
  {
    id: 'utiles', titulo: 'Teléfonos útiles', cuando: 'sábado 17:00 · 10 a 20 s', prefijo: 'utiles-',
    regla: 'Los teléfonos de a uno, por grupo (emergencias, salud…), con el número a la derecha. La voz dice «guardalos en el celular» y no los lee.',
  },
  {
    id: 'agenda', titulo: 'La agenda del fin de semana', cuando: 'jueves 12:00, sólo si hay eventos · 12 a 25 s', prefijo: 'agenda-',
    regla: 'Cada evento (nombre, día y hora, lugar) entra de a uno. La voz dice cuántas actividades hay y las dos o tres primeras; el resto, en la web.',
  },
];

const ETIQUETAS = {
  'clima-v': (n) => n.replace(/^clima-v\d+-/, '').replace(/-/g, ' '),
  'clima-': (n) => n.replace(/^clima-\d+-/, '').replace(/-/g, ' '),
  'farmacia-': (n) => n.replace(/^farmacia-\d-/, '').replace('una', 'una farmacia').replace('dos', 'dos farmacias').replace('tres', 'tres farmacias'),
  'efemeride-t': (n) => n.replace(/^efemeride-t\d-/, ''),
  'feriado-': (n) => n.replace(/^feriado-\d-/, ''),
  'participa-': (n) => n.replace(/^participa-\d-/, ''),
  'utiles-': () => 'útiles', 'agenda-': () => 'agenda',
};

async function dibujar(e, ancho = 400) {
  const { Resvg } = await import('@resvg/resvg-js');
  const { archivosDeFuente } = await import('./placa.mjs');
  const r = new Resvg(e.escena.cuadro(7, 16), { fitTo: { mode: 'width', value: ancho }, font: { fontFiles: archivosDeFuente(), loadSystemFonts: false, defaultFontFamily: 'Inter' } });
  return r.render().asPng().toString('base64');
}

export async function armarCatalogo() {
  const todos = [...ejemplosDeClima(), ...ejemplos().filter((e) => /aviso/.test(e.nombre)), ...ejemplosDeServicios()];
  const secciones = [];
  for (const cat of CATEGORIAS) {
    const delGrupo = todos.filter((e) => e.nombre.startsWith(cat.prefijo) && (!cat.soloEstos || cat.soloEstos.test(e.nombre))
      && !(cat.id === 'clima' && /aviso/.test(e.nombre)) && !(cat.id === 'efemeride' && !/^efemeride-t/.test(e.nombre)));
    const tarjetas = [];
    for (const e of delGrupo) {
      const f = (ETIQUETAS[cat.prefijo] ?? ((n) => n))(e.nombre);
      tarjetas.push(`<figure><img src="data:image/png;base64,${await dibujar(e)}" alt="${esc(`${cat.titulo}: ${f}`)}" width="400" height="711" loading="lazy"><figcaption>${esc(f)}</figcaption></figure>`);
    }
    secciones.push(`<section id="${cat.id}"><h2>${esc(cat.titulo)}</h2><p class="cuando">${esc(cat.cuando)}</p>
<p class="regla"><strong>Regla propia.</strong> ${esc(cat.regla)}</p><div class="fila">${tarjetas.join('')}</div></section>`);
  }
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catálogo de plantillas</title>
<style>
:root{--bg:#FAF8F3;--fg:#14161A;--sub:#5B5F66;--linea:#E2DDD2;--acento:#C7381C;--card:#FFFFFF}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#14161A;--fg:#F2EFE8;--sub:#A9ADB3;--linea:#2C3036;--acento:#F0735A;--card:#1D2025;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#14161A;--fg:#F2EFE8;--sub:#A9ADB3;--linea:#2C3036;--acento:#F0735A;--card:#1D2025;color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;line-height:1.5;padding-block:24px;padding-inline:16px}
main{max-width:1500px;margin:0 auto}
h1{font-family:"Source Serif 4",Georgia,serif;font-size:2rem;margin:0 0 4px;text-wrap:balance}
h2{font-family:"Source Serif 4",Georgia,serif;font-size:1.5rem;margin:0;border-top:3px solid var(--acento);padding-top:12px;text-wrap:balance}
.lead{color:var(--sub);max-width:70ch}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
nav a{color:var(--fg);border:1px solid var(--linea);border-radius:999px;padding:4px 14px;text-decoration:none;font-size:.9rem}
.comunes{background:var(--card);border:1px solid var(--linea);border-radius:12px;padding:8px 20px 12px;margin:16px 0 40px}
.comunes ol{max-width:90ch;padding-left:1.2em}
section{margin-bottom:56px}
.cuando{color:var(--acento);font-weight:600;font-size:.85rem;letter-spacing:.04em;text-transform:uppercase;margin:6px 0}
.regla{max-width:90ch;color:var(--sub)}
.fila{display:flex;gap:16px;overflow-x:auto;padding-bottom:12px}
figure{margin:0;flex:0 0 auto;width:min(400px,78vw)}
figure img{width:100%;height:auto;display:block;border:1px solid var(--linea);border-radius:10px}
figcaption{text-align:center;font-size:.85rem;color:var(--sub);margin-top:6px;text-transform:capitalize}
</style></head><body><main>
<h1>Catálogo de plantillas</h1>
<p class="lead">Todas las variantes de cada pieza, una al lado de la otra, con la regla común y la regla propia de cada una. Cada imagen es un cuadro ya entrado de la escena animada; deslizá hacia el costado para ver las demás. Es una propuesta: todavía no está conectada a las redes.</p>
<nav>${CATEGORIAS.map((c) => `<a href="#${c.id}">${esc(c.titulo)}</a>`).join('')}</nav>
<div class="comunes"><h2>Reglas comunes a todas las piezas</h2><ol>${REGLAS_COMUNES.map((r) => `<li>${esc(r)}</li>`).join('')}</ol></div>
${secciones.join('\n')}
</main></body></html>`;
}

if (process.argv[1] && process.argv[1].endsWith('catalogo-plantillas.mjs')) {
  const salida = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, 'salida', 'catalogo-plantillas.html'));
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  const html = await armarCatalogo();
  fs.writeFileSync(salida, html);
  console.log(`catálogo: ${salida} (${(html.length / 1048576).toFixed(1)} MB)`);
}
