// El feed de PODCAST de los repasos (15/10/2026). SIN CONECTAR A PRODUCCIÓN: no lo corre ningún workflow ni lo lee ninguna página.
// Es el generador del archivo que Apple Podcasts, Spotify, YouTube Music y Pocket Casts leen para sumar episodios. El diseño completo,
// qué falta para activarlo y los trámites que hace una persona: docs/seo/AUDITORIA-FEEDS.md.
//
// Qué hace: junta (1) el MANIFIESTO DE AUDIOS (web/data/podcast-audios.json: lo escribirá, cuando exista, el paso que sube cada mp3 a un
// depósito público; hoy no existe, el mp3 de cada repaso se descarta al terminar la corrida) con (2) la NOTA de cada repaso, que ya
// existe en la web (web/lib/notas-propias.js: `repasoAAAAMMDD{manana|tarde|noche}`), y arma el RSS de podcast. Un repaso sin su nota
// publicada no tiene episodio: si la nota se retira o no se pudo armar (Política, Policiales o semáforo rojo, regla de la nota del
// repaso), el audio tampoco sale en el podcast.
//
// Uso (sólo en la PC, a mano):
//   node web/scripts/podcast-feed.mjs                  imprime el feed (o los problemas que encuentra)
//   node web/scripts/podcast-feed.mjs --salida=podcast.xml
//
// Formato del manifiesto (clave = día de Balcarce y pieza del libro de redes, `redes/piezas.mjs`):
//   { "2026-10-15/noticia1": { "url": "https://audio.radarbalcarce.com/repasos/2026-10-15-manana.mp3", "bytes": 1234567,
//                              "segundos": 61.4, "tipo": "audio/mpeg" } }
//
// De entrada y salida de texto (las funciones no leen el disco): se prueba sin red (pruebas/podcast-feed.test.mjs).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, limpiarXml, cuerpoEnHtml } from '../lib/rss.js';
import { rutaDeNota } from '../lib/ruta.js';
import { TURNOS } from '../lib/notas-propias.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITIO_POR_DEFECTO = 'https://radarbalcarce.com';

/** Cuántos episodios como mucho lleva el feed (tres por día: unas cinco semanas). Los lectores no necesitan más y el archivo se mantiene chico. */
export const EPISODIOS_POR_FEED = 100;

/** Lo que Apple pide como máximo para un texto de episodio. */
export const MAXIMO_DESCRIPCION = 4000;

/** Dicho en el episodio y en el canal: la voz es generada. Spotify y Apple piden no hacerlo pasar por una voz humana. */
export const AVISO_DE_VOZ = 'La voz de este audio está generada con inteligencia artificial. Los textos son de Radar Balcarce.';

/** El canal. `arte` tiene que ser un JPG o PNG CUADRADO de entre 1400 y 3000 píxeles: hoy no existe (ver la auditoría). */
export function canalDelPodcast(sitio = SITIO_POR_DEFECTO) {
  return {
    titulo: 'El repaso de Radar Balcarce',
    descripcion: 'Las notas de Balcarce y la región, contadas en un minuto: tres repasos por día (mañana, tarde y noche) con lo que pasó en Balcarce. '
      + `${AVISO_DE_VOZ} Todas las notas, con sus fuentes, en radarbalcarce.com.`,
    idioma: 'es-AR',
    autor: 'Radar Balcarce',
    responsable: { nombre: 'Radar Balcarce', correo: 'contacto@radarbalcarce.com' },
    categoria: { principal: 'News', sub: 'Daily News' },
    explicito: false,
    enlace: sitio,
    urlDelFeed: `${sitio}/podcast.xml`,
    arte: `${sitio}/podcast/portada.jpg`,
  };
}

/** "mm:ss" o "h:mm:ss" para itunes:duration (los segundos a secas también valen, pero esto lo entienden todos los lectores). */
export function duracionLegible(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dos = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

/** El identificador de la nota del repaso a partir de la clave del libro ("2026-10-15/noticia1" -> "repaso20261015manana"); null si no es un repaso. */
export function idDeNotaDelRepaso(clave = '') {
  const [dia, nombre] = String(clave).split('/');
  const turno = TURNOS[nombre];
  if (!turno || !/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return null;
  return `repaso${dia.replace(/-/g, '')}${turno.clave}`;
}

/** La descripción en texto plano: de qué se habla, el aviso de la voz y la página. Nunca pasa de lo que Apple admite. */
export function descripcionPlana(nota, sitio) {
  const temas = (nota.enlacesEnTexto ?? []).map((e) => String(e.texto).trim()).filter(Boolean);
  const lista = temas.length ? `En este repaso: ${temas.join('; ')}.` : String(nota.copete ?? '').trim();
  const texto = `${lista} ${AVISO_DE_VOZ} Las notas, en ${sitio.replace(/^https?:\/\//, '')}.`.replace(/\s+/g, ' ').trim();
  return texto.length <= MAXIMO_DESCRIPCION ? texto : `${texto.slice(0, MAXIMO_DESCRIPCION - 1).replace(/\s+\S*$/, '')}…`;
}

/** Las notas del repaso, con su enlace, como HTML para content:encoded. */
export function notasEnHtml(nota, sitio) {
  const items = (nota.enlacesEnTexto ?? []).filter((e) => e?.texto && e?.href)
    .map((e) => `<li><a href="${esc(`${sitio}${e.href}`)}">${esc(e.texto)}</a></li>`).join('');
  const resumen = cuerpoEnHtml(nota.cuerpo).replace(/^<p>Estas son las[^<]*<\/p>/, '').replace(/<p>Mirá y escuchá[^<]*<\/p>/, '').replace(/<p>El repaso en audio se publicó[^<]*<\/p>/, '');
  return `${items ? `<p>Las notas de este repaso:</p><ul>${items}</ul>` : ''}${resumen}<p><em>${esc(AVISO_DE_VOZ)}</em></p>`
    + `<p><a href="${esc(`${sitio}${rutaDeNota(nota)}`)}">El repaso en texto, con todas las notas, en Radar Balcarce</a></p>`;
}

/**
 * Los episodios: el manifiesto de audios cruzado con las notas de los repasos. Sin nota (retirada, no armable o todavía no publicada) o sin
 * audio válido (dirección que no es https, sin tamaño), no hay episodio. De más nuevo a más viejo.
 * `notas` son las de la portada y el archivo (`todasLasNotas`).
 */
export function episodiosDeLosRepasos({ audios = {}, notas = [], sitio = SITIO_POR_DEFECTO } = {}) {
  const porId = new Map(notas.filter((n) => n?.propia === 'repaso').map((n) => [n.id, n]));
  const episodios = [];
  for (const [clave, a] of Object.entries(audios ?? {})) {
    const id = idDeNotaDelRepaso(clave);
    const nota = id ? porId.get(id) : null;
    if (!nota || nota.sinFecha || !Number.isFinite(new Date(nota.fecha).getTime())) continue;
    if (!/^https:\/\//.test(String(a?.url ?? '')) || !(Number(a?.bytes) > 0)) continue;
    episodios.push({
      guid: `radar-balcarce-${id}`,
      titulo: nota.titulo,
      descripcion: descripcionPlana(nota, sitio),
      html: notasEnHtml(nota, sitio),
      fecha: nota.fecha,
      enlace: `${sitio}${rutaDeNota(nota)}`,
      audio: { url: a.url, bytes: Math.round(Number(a.bytes)), tipo: a.tipo || 'audio/mpeg' },
      segundos: Number(a.segundos) || 0,
    });
  }
  return episodios.sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
}

/**
 * Lo que impediría que Apple o Spotify acepten el feed. Vacío = listo para enviar. No mira la red: que la portada sea de verdad cuadrada
 * y de 1400 a 3000 píxeles, y que el servidor del audio conteste Range, se mira con `node web/scripts/podcast-feed.mjs` + curl
 * (docs/seo/AUDITORIA-FEEDS.md).
 */
export function problemasDelPodcast({ canal, episodios = [] }) {
  const p = [];
  if (!episodios.length) p.push('no hay ningún episodio: Apple rechaza un feed vacío');
  if (!/^https:\/\/.+\.(jpe?g|png)$/i.test(canal?.arte ?? '')) p.push('la portada (itunes:image) tiene que ser una dirección https que termine en .jpg o .png');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(canal?.responsable?.correo ?? '')) p.push('falta el correo del dueño (itunes:owner): Apple y Spotify mandan ahí el código de verificación');
  if (!/^https:\/\//.test(canal?.urlDelFeed ?? '')) p.push('la dirección del feed tiene que ser https');
  const vistos = new Set();
  for (const e of episodios) {
    if (!e.guid || vistos.has(e.guid)) p.push(`guid repetido o vacío: ${e.guid}`);
    vistos.add(e.guid);
    if (!/^https:\/\/.+\.(mp3|m4a)$/i.test(e.audio?.url ?? '')) p.push(`${e.guid}: el audio tiene que ser una dirección https directa a un .mp3 o .m4a`);
    if (!(e.audio?.bytes > 0)) p.push(`${e.guid}: el enclosure necesita el tamaño real en bytes`);
    if (!(e.segundos > 0)) p.push(`${e.guid}: falta la duración`);
    if (e.descripcion.length > MAXIMO_DESCRIPCION) p.push(`${e.guid}: la descripción pasa de ${MAXIMO_DESCRIPCION} letras`);
  }
  return p;
}

/** El feed de podcast (RSS 2.0 con las etiquetas de iTunes). `generado` es cuándo se armó. */
export function armarPodcastRss({ canal, episodios = [], generado = null, maximo = EPISODIOS_POR_FEED }) {
  const c = canal;
  const construido = generado && Number.isFinite(new Date(generado).getTime()) ? `\n    <lastBuildDate>${new Date(generado).toUTCString()}</lastBuildDate>` : '';
  const items = episodios.slice(0, maximo).map((e) => `
    <item>
      <title>${esc(e.titulo)}</title>
      <itunes:title>${esc(e.titulo)}</itunes:title>
      <link>${esc(e.enlace)}</link>
      <guid isPermaLink="false">${esc(e.guid)}</guid>
      <pubDate>${new Date(e.fecha).toUTCString()}</pubDate>
      <description>${esc(e.descripcion)}</description>
      <content:encoded><![CDATA[${limpiarXml(e.html).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
      <enclosure url="${esc(e.audio.url)}" length="${e.audio.bytes}" type="${esc(e.audio.tipo)}" />
      <itunes:duration>${duracionLegible(e.segundos)}</itunes:duration>
      <itunes:explicit>${c.explicito ? 'true' : 'false'}</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${esc(c.titulo)}</title>
    <link>${esc(c.enlace)}</link>
    <atom:link href="${esc(c.urlDelFeed)}" rel="self" type="application/rss+xml" />
    <description>${esc(c.descripcion)}</description>
    <language>${esc(c.idioma)}</language>${construido}
    <generator>Radar Balcarce</generator>
    <image>
      <url>${esc(c.arte)}</url>
      <title>${esc(c.titulo)}</title>
      <link>${esc(c.enlace)}</link>
    </image>
    <itunes:author>${esc(c.autor)}</itunes:author>
    <itunes:owner>
      <itunes:name>${esc(c.responsable.nombre)}</itunes:name>
      <itunes:email>${esc(c.responsable.correo)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${esc(c.arte)}" />
    <itunes:category text="${esc(c.categoria.principal)}">
      <itunes:category text="${esc(c.categoria.sub)}" />
    </itunes:category>
    <itunes:explicit>${c.explicito ? 'true' : 'false'}</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    ${items}
  </channel>
</rss>`;
}

// ------------------------------------------------------------------------------------------------------------------ a mano, en la PC
function leerJson(archivo, porDefecto) {
  try {
    return JSON.parse(fs.readFileSync(archivo, 'utf8'));
  } catch {
    return porDefecto;
  }
}

function principal() {
  const datos = path.join(AQUI, '..', 'data');
  const sitio = (process.env.SITIO || SITIO_POR_DEFECTO).replace(/\/+$/, '');
  const salida = (process.argv.find((a) => a.startsWith('--salida=')) ?? '').slice('--salida='.length);
  const audios = leerJson(path.join(datos, 'podcast-audios.json'), {});
  const portada = leerJson(path.join(datos, 'portada.json'), { notas: [] });
  const archivo = leerJson(path.join(datos, 'archivo.json'), { notas: [] });
  const notas = [...(portada.notas ?? []), ...(archivo.notas ?? [])].map((n) => ({ ...n }));
  const canal = canalDelPodcast(sitio);
  const episodios = episodiosDeLosRepasos({ audios, notas, sitio });
  const problemas = problemasDelPodcast({ canal, episodios });
  if (problemas.length) {
    console.error(`El feed de podcast todavía no se puede enviar (${problemas.length}):\n- ${problemas.join('\n- ')}`);
    process.exitCode = 1;
    return;
  }
  const xml = armarPodcastRss({ canal, episodios, generado: portada.generado ?? new Date().toISOString() });
  if (salida) {
    fs.writeFileSync(salida, xml);
    console.log(`${salida}: ${episodios.length} episodios, ${xml.length} bytes`);
  } else {
    process.stdout.write(xml);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
