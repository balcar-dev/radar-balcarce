// Lee web/data/portada.json, generado por scripts/generar-datos.mjs.
// Todas las páginas del sitio pasan por acá — nunca leen el panel
// directamente, así la web funciona igual publicada que en una PC con el
// panel corriendo al lado.

import fs from 'node:fs';
import path from 'node:path';
import { rutaDeNota, idDeRuta } from './ruta.js';
import { vigenteEnPortada } from './archivo.js';
import { sinNotasRepetidas, titularesParecidos } from './texto.js';
import { tieneCuerpo } from './cuerpo.js';
import { interpretarDolarApi } from './dolar.js';
import {
  rutaDeEvento, claveDeEvento, claveDeRuta, proximos, confirmacionDeAnual,
} from './eventos.js';

// Se arma en el momento y no al cargar el módulo: las pruebas se paran en
// otra carpeta para leer datos de mentira.
const carpetaDeDatos = () => path.join(process.cwd(), 'data');

// Compilar el sitio lee estos archivos miles de veces (cada página, sus
// metadatos y sus imágenes). El archivo de notas pesa megas: leerlo y
// parsearlo en cada llamada multiplicaba el tiempo de compilación. Se guarda
// lo leído mientras el archivo no cambie (fecha y tamaño), así que en
// `next dev` igual se ve al toque lo que regenera `npm run datos`.
const memoria = new Map();
function leerConMemoria(archivo, armar) {
  let firma;
  try {
    const st = fs.statSync(archivo);
    firma = `${st.mtimeMs}:${st.size}`;
  } catch {
    firma = 'no existe';
  }
  const guardado = memoria.get(archivo);
  if (guardado && guardado.firma === firma) return guardado.valor;
  const valor = armar(firma === 'no existe' ? null : JSON.parse(fs.readFileSync(archivo, 'utf8')));
  memoria.set(archivo, { firma, valor });
  return valor;
}

const VACIO = () => ({
  generado: null, notas: [], secciones: [], clima: null,
  farmacias: { hoy: null, proximos: [], avisos: [] },
  agenda: { proximosAnuales: [] },
  utiles: { numeros: [], diaDeLaSemana: null, tocaHoy: false },
});

// La dirección de cada nota se arma acá y no en cada página: ninguna página
// tiene que saber cómo se arma. Sale del `slug` fijado (ver lib/ruta.js).
const conRuta = (n) => ({ ...n, ruta: rutaDeNota(n) });

function leerPortada() {
  return leerConMemoria(path.join(carpetaDeDatos(), 'portada.json'), (crudo) => {
    if (!crudo) return null;
    const conPagina = (crudo.notas ?? []).map(conRuta);
    // Las de más de 72 horas ya las saca generar-datos; esto es por si el
    // archivo quedó un rato sin regenerar. Salen de las listas, pero la
    // página sigue (`conPagina`).
    return { ...crudo, notas: conPagina.filter((n) => vigenteEnPortada(n)), conPagina };
  });
}

/**
 * Lo que muestra el sitio: portada, secciones, temas, buscador, feed. Sólo
 * trae las notas de las listas (las de las últimas 72 horas); las demás
 * páginas de notas salen del archivo (`todasLasNotas`).
 */
export function obtenerDatos() {
  try {
    const d = leerPortada();
    // Sin datos generados todavía: la web no se rompe, muestra vacío.
    if (!d) return VACIO();
    // Una copia por encima, para que ninguna página ensucie lo guardado.
    const { conPagina, ...resto } = d;
    return { ...resto, notas: [...d.notas] };
  } catch {
    return VACIO();
  }
}

/** Las notas de portada.json con página, aunque ya no vayan en las listas. */
function notasDeLaPortada() {
  try {
    return leerPortada()?.conPagina ?? [];
  } catch {
    return [];
  }
}

/** Las notas archivadas (web/data/archivo.json), con su dirección. */
export function obtenerArchivo() {
  try {
    return leerConMemoria(path.join(carpetaDeDatos(), 'archivo.json'), (crudo) => (crudo?.notas ?? []).map(conRuta));
  } catch {
    return [];
  }
}

/**
 * Todas las notas que tienen página: las de la portada y las archivadas.
 * Si una está en los dos lados, manda la de la portada, que es la de esta
 * corrida.
 */
export function todasLasNotas() {
  const deLaPortada = notasDeLaPortada();
  const ids = new Set(deLaPortada.map((n) => n.id));
  return [...deLaPortada, ...obtenerArchivo().filter((n) => !ids.has(n.id))];
}

/**
 * Las notas que llevan imagen propia (la de compartir y la de Instagram):
 * las de la portada y las archivadas que salieron en las redes, que son las
 * que Facebook o Instagram pueden volver a pedir. Generar dos imágenes por
 * cada una de las miles de notas archivadas alargaría mucho la compilación
 * para imágenes que nadie va a pedir.
 */
export function notasConImagen() {
  const deLaPortada = obtenerDatos().notas;
  const ids = new Set(deLaPortada.map((n) => n.id));
  return [...deLaPortada, ...obtenerArchivo().filter((n) => n.redes && !ids.has(n.id))];
}

/**
 * Una nota, por lo que llegó en la dirección: "titular-en-guiones-id" o el
 * id a secas. Se resuelve por el final, no por el titular entero, y se busca
 * también en el archivo: una nota que salió de la portada sigue teniendo
 * página.
 */
export function obtenerNota(parte) {
  const id = idDeRuta(parte);
  return todasLasNotas().find((n) => n.id === id) ?? null;
}

// ---------------------------------------------------------------- el dólar

/**
 * La foto que guardó scripts/foto-dolar.mjs al compilar (data/dolar.json). Se
 * revisa con el mismo cuidado que lo que llega de la fuente: si el archivo
 * está roto o no existe, no hay foto (null). La usan /dolar y el panel de la
 * portada; el navegador la reemplaza por la cotización de ahora.
 */
export function fotoDelDolar() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(carpetaDeDatos(), 'dolar.json'), 'utf8'));
    if (!Array.isArray(j.cotizaciones) || !j.consultado) return null;
    // Se pasa por el mismo filtro que la respuesta de la fuente.
    const limpio = interpretarDolarApi(j.cotizaciones.map((c) => ({ ...c, fechaActualizacion: c.fecha })));
    return limpio ? { fuente: j.fuente, cotizaciones: limpio.cotizaciones, consultado: j.consultado, deLaFoto: true } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- la agenda

/**
 * Todos los eventos con página (web/data/agenda.json), con su dirección: los
 * que vienen y los que pasaron hace menos de 60 días (lib/eventos.js).
 */
export function todosLosEventos() {
  try {
    return leerConMemoria(path.join(carpetaDeDatos(), 'agenda.json'), (crudo) => (crudo?.eventos ?? [])
      .map((e) => ({ ...e, ruta: rutaDeEvento(e) })));
  } catch {
    return [];
  }
}

/** Lo que va en las listas: lo que todavía no terminó, por fecha. Se cuenta
 *  al compilar, que pasa cada media hora. */
export function proximosEventos(ahora = Date.now()) {
  return proximos(todosLosEventos(), ahora);
}

/** Un evento, por lo que llegó en la dirección ("nombre-en-guiones-clave"). */
export function obtenerEvento(parte) {
  const clave = claveDeRuta(parte);
  return todosLosEventos().find((e) => claveDeEvento(e.id) === clave) ?? null;
}

/** Las fiestas anuales que se acercan, cada una con su evento confirmado si
 *  ya lo hay (para enlazarlo) o sin fecha (para decir "a confirmar"). */
export function anualesConFecha(anuales = [], ahora = Date.now()) {
  const lista = proximosEventos(ahora);
  return anuales.map((a) => ({ ...a, confirmado: confirmacionDeAnual(a, lista) }));
}

/** Cuántas horas compite una nota por el lugar grande. Eran 24: el 25/09
 *  la portada abría con una nota de hace 8 horas habiendo nuevas, y Hernán
 *  y Andrés pidieron priorizar siempre lo nuevo. Con 6, la nota del campeón
 *  sigue ganándole a la que entró recién con menos puntaje, pero no se queda
 *  arriba toda la tarde. */
const VENTANA_HORAS = 6;

/**
 * Elige qué nota va grande arriba, y devuelve el resto en orden de hora.
 *
 * La lista va por hora, como cualquier diario: lo último primero. Pero la
 * nota grande no puede salir de ahí, porque entonces la elige el reloj. El
 * 20/09 la portada abría con la que había entrado hace un minuto y la
 * caravana para recibir al campeón balcarceño Kevin Gómez —la nota de más
 * puntaje del día, 100 sobre 100— estaba enterrada en el medio de la lista.
 *
 * Así que la grande es la de más puntaje de las últimas 24 horas. El puntaje
 * ya sabe lo que importa acá: suma 25 si es de Balcarce, 22 si un medio de
 * afuera nombra a Balcarce, 10 por cada medio que la contó, y baja con las
 * horas. Si no hay nada de las últimas 24 horas, manda el puntaje a secas.
 */
export function ordenarPortada(notas = []) {
  // De la más nueva a la más vieja, siempre.
  const porHora = [...notas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (!porHora.length) return { principal: null, resto: [] };

  const corte = Date.now() - VENTANA_HORAS * 3600 * 1000;
  const recientes = porHora.filter((n) => new Date(n.fecha).getTime() >= corte);
  const ventana = recientes.length ? recientes : porHora;

  // El lugar grande es de Balcarce. Con el puntaje solo, hoy la portada la
  // abría Messi jugando en la MLS (97) por encima de Ferroviarios ganando
  // por penales y metiéndose en la final anual (90). Messi puede estar en
  // la portada de cualquier diario del país; Ferroviarios, no. Si no hay
  // nada de acá en la ventana, manda el puntaje a secas.
  const deAca = ventana.filter((n) => n.local || n.nombraBalcarce);
  const candidatas = deAca.length ? deAca : ventana;

  // Con el mismo puntaje gana la más nueva, que es el orden en que ya vienen.
  const principal = candidatas.reduce((a, b) => (b.relevancia > a.relevancia ? b : a));

  return { principal, resto: porHora.filter((n) => n.id !== principal.id) };
}

/** Hasta cuántos días atrás se va al archivo a completar una sección. */
export const DIAS_PARA_COMPLETAR = 14;
/** Cuántas notas muestra cada sección de la portada. */
export const NOTAS_POR_SECCION = 3;

/**
 * La tapa entera: la nota grande, cuatro de abajo y los bloques por sección.
 *
 * El 25/09 abajo de la grande salían las cuatro más nuevas a secas, y eran
 * cuatro de Economía. Lo que pidieron Hernán y Andrés:
 *   · las cinco de la tapa, de cinco secciones distintas;
 *   · todas con su hora (una nota cuya fuente no dijo la hora no va a la
 *     tapa: queda en su sección);
 *   · cada sección, con SIEMPRE tres notas (las más nuevas, sin repetir las
 *     de arriba). La tapa sólo usa lo de las últimas 72 horas; si una sección
 *     tiene menos de tres ahí, se completa con lo más nuevo del archivo
 *     (hasta 14 días atrás, sólo con cuerpo, sin repetidas), y cada una
 *     muestra su hora real ("hace 5 días"): nunca se inventa frescura. Si ni
 *     así hay tres, van las que haya, y una sección sin ninguna no se dibuja;
 *   · siempre lo nuevo primero.
 *
 * @param {object[]} notas
 * @param {string[]} [orden]  el orden editorial de las secciones
 * @param {{archivo?: object[], ahora?: number}} [opciones]
 */
export function armarTapa(notasSueltas = [], orden = SECCIONES.map((s) => s.nombre), { archivo = [], ahora = Date.now() } = {}) {
  // Por si acaso: generar-datos ya saca las repetidas de la portada.
  const notas = sinNotasRepetidas(notasSueltas);
  const conHora = notas.filter((n) => !n.sinFecha);
  const { principal } = ordenarPortada(conHora.length ? conHora : notas);
  if (!principal) return { principal: null, secundarias: [], bloques: [] };

  const porHora = [...notas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // La más nueva de cada sección (con hora), sin la de la grande.
  const usadas = new Set([principal.seccion]);
  const secundarias = [];
  for (const n of porHora) {
    if (secundarias.length === 4) break;
    if (n.sinFecha || n.id === principal.id || usadas.has(n.seccion)) continue;
    usadas.add(n.seccion);
    secundarias.push(n);
  }

  const enTapa = new Set([principal.id, ...secundarias.map((n) => n.id)]);
  const porSeccion = {};
  for (const n of porHora) {
    if (enTapa.has(n.id)) continue;
    (porSeccion[n.seccion] ??= []).push(n);
  }

  // Del archivo: lo que no está en la portada, con hora, con cuerpo de verdad,
  // no propio (una nota del dólar de hace cinco días no completa nada), de los
  // últimos 14 días. Ya viene sin lo que el semáforo retiró (lib/archivo.js).
  const corte = Number(ahora) - DIAS_PARA_COMPLETAR * 24 * 3600e3;
  const idsPortada = new Set(notas.map((n) => n.id));
  const viejas = archivo
    .filter((n) => n?.id && !idsPortada.has(n.id) && !n.sinFecha && !n.propia
      && tieneCuerpo(n) && new Date(n.fecha).getTime() >= corte)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const secciones = [...new Set([...orden, ...Object.keys(porSeccion)])];
  const bloques = [];
  for (const s of secciones) {
    const suyas = (porSeccion[s] ?? []).slice(0, NOTAS_POR_SECCION);
    if (suyas.length < NOTAS_POR_SECCION) {
      // Sin repetir historia con nada de lo que ya está en la portada ni con lo
      // que se va sumando.
      for (const v of viejas) {
        if (suyas.length >= NOTAS_POR_SECCION) break;
        if (v.seccion !== s) continue;
        if ([...notas, ...suyas].some((o) => titularesParecidos(o.titulo, v.titulo))) continue;
        suyas.push(v);
      }
    }
    if (suyas.length) bloques.push([s, suyas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))]);
  }

  return { principal, secundarias, bloques };
}

/** Los temas que hoy tienen notas, del que más tiene al que menos. */
export function temasVivos() {
  return obtenerDatos().temas ?? [];
}

/** El nombre de un tema, o null si esa ranura no existe. */
export function nombreDeTema(ranura) {
  return temasVivos().find((t) => t.ranura === ranura)?.nombre ?? null;
}

/** Las notas de un tema, de la más nueva a la más vieja. */
export function porTema(ranura) {
  return obtenerDatos().notas
    .filter((n) => n.temas?.includes(ranura))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

// En lib/tiempo.js para que también lo use el navegador (components/horas-vivas.js).
export { haceCuanto } from './tiempo.js';
import { haceCuanto } from './tiempo.js';

/**
 * Qué decir en el lugar de la hora: SIEMPRE lo mismo, con una sola escala
 * ("recién", "hace N min", "hace N h", "ayer", "hace N días").
 *
 * Sale de `fecha`. Si la fuente publicó la hora, es la de la fuente; si no
 * (`sinFecha`), `fecha` es la primera vez que la nota apareció en Radar
 * Balcarce, y "hace X" es desde que está en el sitio: honesto para el lector.
 * Hasta el 25/09 esas notas salían sin nada y la lista quedaba a medias (una
 * con "hace 15 h", otra con "ayer" y otra en blanco). Sólo queda vacío si la
 * nota no trae ninguna fecha válida.
 */
export function cuando(nota) {
  if (!nota?.fecha || !Number.isFinite(new Date(nota.fecha).getTime())) return '';
  return haceCuanto(nota.fecha);
}

// ---------------------------------------------------------------- contacto

// El WhatsApp del medio. La investigación dejó claro que es el canal: los
// cinco portales de la zona lo tienen y nosotros éramos los únicos sin él.
// En un pueblo el mail es un trámite; el WhatsApp es donde ya está la gente.
export const WHATSAPP = {
  // El formato de wa.me: país (54), el 9 de celular, el código de área sin
  // el cero y el número sin el 15.
  numero: '5492266511612',
  visible: '2266 51-1612',
};

/** Un enlace de WhatsApp con el mensaje ya escrito. Que la persona no tenga
 *  que explicar de dónde viene ni qué quiere. */
export function whatsapp(mensaje) {
  return `https://wa.me/${WHATSAPP.numero}?text=${encodeURIComponent(mensaje)}`;
}

export const MAIL = 'radarbalcarce@gmail.com';

// Las cuentas del medio. La de Facebook va por el número del perfil de la
// página (el de la dirección), no por el ID de la API (ver REDES.md).
export const REDES_SOCIALES = {
  instagram: 'https://www.instagram.com/radarbalcarce',
  facebook: 'https://www.facebook.com/profile.php?id=61594865361170',
};

// ------------------------------------------------------------- secciones

// El orden de acá es el orden de la navegación, y es editorial: primero lo
// que pasa en Balcarce, después lo que a Balcarce le interesa. País va
// último a propósito — si alguien quiere nacionales, tiene mil lugares;
// acá viene por lo local.
export const SECCIONES = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: 'var(--s-balcarce)' },
  { nombre: 'Política', ranura: 'politica', color: 'var(--s-politica)' },
  { nombre: 'Policiales', ranura: 'policiales', color: 'var(--s-policiales)' },
  { nombre: 'Deportes', ranura: 'deportes', color: 'var(--s-deportes)' },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: 'var(--s-automovilismo)' },
  { nombre: 'Agro', ranura: 'agro', color: 'var(--s-agro)' },
  { nombre: 'Economía', ranura: 'economia', color: 'var(--s-economia)' },
  { nombre: 'Cultura y agenda', ranura: 'cultura', color: 'var(--s-cultura)' },
  { nombre: 'Tecnología', ranura: 'tecnologia', color: 'var(--s-tecnologia)' },
  { nombre: 'Servicios', ranura: 'servicios', color: 'var(--s-servicios)' },
  { nombre: 'País', ranura: 'pais', color: 'var(--s-pais)' },
];

// Las que van en la barra de navegación: el resto existe igual como página,
// pero no ocupa lugar arriba.
export const EN_NAVEGACION = ['Balcarce', 'Política', 'Policiales', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología'];

export function datosSeccion(nombre) {
  return SECCIONES.find((s) => s.nombre === nombre)
    ?? { nombre, ranura: ranuraDe(nombre), color: 'var(--s-pais)' };
}

export function porRanura(ranura) {
  return SECCIONES.find((s) => s.ranura === ranura) ?? null;
}

function ranuraDe(nombre) {
  return nombre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Un nombre corto para la navegación y las etiquetas: "Cultura y agenda"
// no entra en una etiqueta de 8 caracteres.
export function nombreCorto(nombre) {
  return nombre === 'Cultura y agenda' ? 'Cultura' : nombre;
}

// ---------------------------------------------------------------- fechas

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Parte "2026-09-18 21:00:00" en { dia, mes, hora } sin depender de la
 *  zona horaria del servidor: la agenda del municipio viene en hora local. */
export function partirFecha(texto) {
  if (!texto) return null;
  const m = String(texto).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return {
    dia: String(Number(m[3])),
    mes: MESES[Number(m[2]) - 1] ?? '',
    hora: m[4] ? `${m[4]}:${m[5]}` : null,
    iso: `${m[1]}-${m[2]}-${m[3]}`,
  };
}
