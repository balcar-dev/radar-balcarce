// El vigilante: revisa que todo ande y avisa por WhatsApp cuando algo falla.
//
//   node redes/vigilar.mjs              revisa y, si hace falta, avisa
//   node redes/vigilar.mjs --sin-avisar sólo muestra lo que encontró
//
// Corre cada 30 minutos (workflow "Vigilancia", disparado por cron-job.org) y
// mira, desde afuera, lo que un lector vería:
//
//   · que la web responda y se haya actualizado hace poco;
//   · que las corridas de GitHub (web, redes, Cloudflare) no estén fallando;
//   · que el reloj de redes esté corriendo;
//   · que las piezas fijas del día (clima, farmacia) hayan salido en su hora;
//   · que `www` redirija al dominio sin `www`;
//   · lo que vence y hay que renovar a mano (el token de GitHub, el dominio),
//     con 30 días de aviso;
//   · que la portada NO vuelva a mostrar lo que se pidió sacar (la fuente arriba
//     de un título, "la vimos hace…", hasta qué hora está la farmacia), y que
//     la mayoría de las notas tengan cuerpo. Ver REGLAS.md.
//
// Los problemas se avisan una vez cada seis horas (no un mensaje cada media
// hora por lo mismo), y a las 21 sale el resumen del día.
//
// Desde el 25/09 también avisa lo que conviene saber aunque todo ande
// (redes/avisos.mjs): notas que esperan a una persona, una noticia de
// Balcarce muy importante, lo que salió en redes, y las estadísticas de la
// web y de las redes a las 9 y a las 21 (redes/estadisticas.mjs). Todo junto
// en UN solo WhatsApp por corrida: CallMeBot bloquea si se abusa.
//
//   node redes/vigilar.mjs --probar-resumen   manda UN WhatsApp con el resumen
//                                             de las 21, tal cual, para ver
//                                             cómo llega (no guarda nada)
//
// La parte que decide (`evaluar`, `planDeAvisos`) son funciones puras: reciben
// lo observado y devuelven qué decir. Se prueban sin red. Lo que baja datos y
// manda el mensaje está abajo, en `main`.
//
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { cronogramaDelDia, ventanaDe, claveDePieza } from './piezas.mjs';
import { yaPublicada, horaAR, diaAR } from './elegir.mjs';
import { enviarWhatsApp, sinSecretos } from './whatsapp.mjs';
import { auditoriaVencida } from './auditar.mjs';
import {
  importantesAAvisar, textoImportantes, anotarImportantes, pendientesAAvisar, textoPendientes,
  anotarPendientes, novedadesEnRedes, textoRedes, datosDelDia, textoResumen, armarMensaje,
} from './avisos.mjs';
import {
  medir, tocaMedir, turnoDeMedicion, agregarPunto, textoEstadisticas, nombresDeCaminos,
} from './estadisticas.mjs';

/** Las piezas que tienen que salir todos los días: si no salió una, es un
 *  problema. Los podcasts no están: dependen de que haya notas para contar. */
export const PIEZAS_FIJAS = ['clima-manana', 'farmacia', 'clima-noche'];

export const LIMITES = {
  minutosSinActualizar: 100,   // la web se arma cada 30
  minutosSinReloj: 100,        // el reloj de redes corre cada 30
  horasEntreAvisos: 6,
  minimoDeNotasConCuerpo: 0.35, // de las últimas 24 horas; con 10 notas o más
  horaDelResumen: 21,
};

/**
 * Cosas que vencen en una fecha conocida y hay que renovar a mano. El aviso
 * sale 30 días antes y se repite (cada seis horas, como todos).
 */
export const VENCIMIENTOS = [
  {
    clave: 'vence-token-github', fecha: '2027-09-21',
    texto: 'El token de GitHub que usa cron-job.org vence el 21/09/2027. Hay que crear otro (GitHub → Settings → Developer settings → Fine-grained tokens, sólo este repositorio, permiso Actions: lectura y escritura) y pegarlo en los tres trabajos de cron-job.org.',
  },
  {
    // Sumado el 25/09 (auditoría). Si el dominio vence, se cae todo junto: la
    // web, los enlaces de cada posteo de Facebook y de cada podcast.
    clave: 'vence-dominio', fecha: '2027-09-21',
    texto: 'El dominio radarbalcarce.com vence el 21/09/2027. Hay que renovarlo en DonWeb (donde está registrado) antes de esa fecha: si vence, la web y los enlaces de todos los posteos dejan de andar.',
  },
];
export const DIAS_DE_AVISO_ANTES = 30;

const minutos = (desde, ahora) => (ahora.getTime() - new Date(desde).getTime()) / 60000;

/**
 * Qué está mal, dado lo que se observó.
 *
 * @param {object} o
 * @param {Date} o.ahora
 * @param {{ estado: number, actualizado: string|null }} o.web   la portada
 * @param {{ redirige: boolean }|null} o.www
 * @param {Record<string, {conclusion:string, status:string, createdAt:string}[]>} o.corridas  por workflow, la más nueva primero
 * @param {object} o.libro  web/data/redes.json
 * @returns {{ clave: string, nivel: 'alta'|'media', texto: string }[]}
 */
export function evaluar({
  ahora, web, www = null, corridas = {}, libro = {}, contenido = null, auditoria = null,
}) {
  const problemas = [];
  const de = (clave, nivel, texto) => problemas.push({ clave, nivel, texto });
  const hora = horaAR(ahora);

  // --- la web
  if (!web || web.estado !== 200) {
    de('web-caida', 'alta', `La web no responde (HTTP ${web?.estado ?? 'sin respuesta'}).`);
  } else if (!web.actualizado) {
    de('web-sin-fecha', 'media', 'No pude leer cuándo se actualizó la web por última vez.');
  } else {
    const min = minutos(web.actualizado, ahora);
    if (min > LIMITES.minutosSinActualizar) {
      de('web-vieja', 'alta', `La web no se actualiza hace ${Math.round(min / 60 * 10) / 10} horas. Revisá cron-job.org (el trabajo "Actualizar la web") y GitHub Actions.`);
    }
  }
  if (www && !www.redirige) de('www', 'media', 'www.radarbalcarce.com ya no redirige al dominio sin www.');

  // --- lo que se pidió que NO aparezca (REGLAS.md): si vuelve, se avisa
  if (contenido?.home) {
    const h = contenido.home;
    if (h.laVimos) de('regla-la-vimos', 'alta', 'La portada volvió a decir "la vimos hace…" o "sin hora". Se pidió sacarlo (REGLAS.md).');
    if (h.horaFarmacia) de('regla-hora-farmacia', 'alta', 'La tarjeta de la farmacia volvió a decir hasta qué hora está de turno. Se pidió sacarlo (REGLAS.md).');
    if (h.fuentesEnChapa) de('regla-fuentes', 'alta', `La portada volvió a mostrar la fuente arriba de los títulos (${h.fuentesEnChapa}). Se pidió sacarlas (REGLAS.md).`);
  }
  if (contenido?.cuerpos && contenido.cuerpos.total >= 10) {
    const { total, conCuerpo } = contenido.cuerpos;
    if (conCuerpo / total < LIMITES.minimoDeNotasConCuerpo) {
      de('pocos-cuerpos', 'media', `Sólo ${conCuerpo} de ${total} notas de las últimas 24 horas tienen cuerpo. Miré la reescritura en "Actualizar la web" (clave de Gemini, cuota, verificador).`);
    }
  }

  // --- que la auditoría semanal siga corriendo
  if (auditoriaVencida(auditoria, ahora)) {
    de('auditoria-vencida', 'media', 'La auditoría semanal no corre hace más de 10 días. Revisá el workflow "Auditoría" en GitHub Actions.');
  }

  // --- lo que vence
  for (const v of VENCIMIENTOS) {
    const dias = Math.ceil((new Date(`${v.fecha}T12:00:00-03:00`).getTime() - ahora.getTime()) / 86400000);
    if (dias <= DIAS_DE_AVISO_ANTES) {
      de(v.clave, dias <= 7 ? 'alta' : 'media', dias > 0 ? `Faltan ${dias} día(s): ${v.texto}` : `YA VENCIÓ: ${v.texto}`);
    }
  }

  // --- las corridas de GitHub
  const NOMBRES = { 'Actualizar la web': 'Actualizar la web', Redes: 'Redes', 'Cloudflare Pages': 'Cloudflare Pages' };
  for (const [nombre, lista] of Object.entries(corridas)) {
    if (!NOMBRES[nombre]) continue;
    const terminadas = lista.filter((r) => r.status === 'completed' && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped');
    const ultima = terminadas[0];
    if (!ultima) continue;
    const fallas = terminadas.slice(0, 5).filter((r) => r.conclusion === 'failure').length;
    if (ultima.conclusion === 'failure') {
      de(`falla-${nombre}`, fallas >= 3 ? 'alta' : 'media', `"${nombre}" falló en su última corrida (${fallas} de las últimas ${Math.min(5, terminadas.length)}).`);
    }
  }

  // --- que los relojes estén corriendo (sólo de día: de noche no hay nada que hacer)
  if (hora >= 7 && hora <= 23) {
    for (const [nombre, tope, texto] of [
      ['Actualizar la web', LIMITES.minutosSinActualizar, 'No hay corridas nuevas de "Actualizar la web": cron-job.org pudo haberse desactivado solo.'],
      ['Redes', LIMITES.minutosSinReloj, 'El reloj de Redes no corre: cron-job.org pudo haberse desactivado solo, o el workflow está apagado.'],
    ]) {
      const lista = corridas[nombre];
      if (!lista) continue;
      const ultima = lista.find((r) => r.status === 'completed' || r.status === 'in_progress' || r.status === 'queued');
      if (!ultima || minutos(ultima.createdAt, ahora) > tope) de(`reloj-${nombre}`, 'alta', texto);
    }
  }

  // --- las piezas fijas del día
  if (libro && Object.keys(libro).length) {
    for (const p of cronogramaDelDia(ahora)) {
      if (!PIEZAS_FIJAS.includes(p.nombre)) continue;
      const [h, m] = p.hora.split(':').map(Number);
      const cierre = h * 60 + m + ventanaDe(p.nombre);
      const ahoraMin = hora * 60 + Number(new Intl.DateTimeFormat('en-GB', { minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora));
      if (ahoraMin < cierre + 15) continue; // todavía está a tiempo
      if (!yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora))) {
        de(`pieza-${p.nombre}`, 'alta', `No salió la pieza "${p.nombre}" de las ${p.hora}, y ya se cerró su ventana.`);
      }
    }
  }
  return problemas;
}

/** Cuáles de los problemas hay que avisar ahora (no repetir lo ya avisado). */
export function aAvisar(problemas, estado = {}, ahora = new Date()) {
  const previos = estado.avisos ?? {};
  return problemas.filter((p) => {
    const antes = previos[p.clave];
    return !antes || minutos(antes, ahora) >= LIMITES.horasEntreAvisos * 60;
  });
}

/** El texto del mensaje de problemas. */
export function mensajeDeProblemas(problemas) {
  const alta = problemas.filter((p) => p.nivel === 'alta');
  const cab = alta.length ? '⚠️ Radar Balcarce: hay un problema' : 'ℹ️ Radar Balcarce: para mirar';
  return `${cab}\n\n${problemas.map((p) => `• ${p.texto}`).join('\n')}`;
}

/**
 * El resumen de las 21. Desde el 25/09 sale siempre, con o sin problemas, y
 * cuenta el día: notas, redes, piezas, lo que espera a una persona, los
 * problemas abiertos y las estadísticas.
 */
export function mensajeDelResumen({
  ahora, libro = {}, web, portada = {}, problemas = [], problemasArriba = false, estadisticas = '',
}) {
  return textoResumen({ datos: datosDelDia({ ahora, portada, libro }), problemas, problemasArriba, estadisticas, web });
}

/** ¿Toca mandar el resumen? Una vez por día, a partir de las 21. */
export function tocaResumen(ahora, estado = {}) {
  return horaAR(ahora) >= LIMITES.horaDelResumen && estado.ultimoResumen !== diaAR(ahora);
}

/**
 * Todo lo que hay para decir en esta corrida, en orden de prioridad, y cómo
 * anotar cada cosa una vez avisada. Sale en UN solo mensaje (armarMensaje):
 * CallMeBot bloquea el número si se le manda de más.
 *
 *   1. los problemas nuevos (o que ya pasaron seis horas desde el aviso);
 *   2. una noticia de Balcarce muy importante que acaba de entrar;
 *   3. las notas nuevas que esperan a una persona (cada tres horas);
 *   4. el resumen de las 21, con las estadísticas; o, a las 9, las
 *      estadísticas solas;
 *   5. lo que salió en redes desde la corrida anterior.
 *
 * @returns {{ secciones: {clave:string, texto:string}[], anotar: (estado:object, incluidas:string[]) => void }}
 */
export function planDeAvisos({
  ahora, problemas = [], estado = {}, portada = {}, libro = {}, web = null,
  estadisticas = '', soloResumen = false, sitio = 'https://radarbalcarce.com',
}) {
  const secciones = [];
  const hechos = {};

  const nuevos = soloResumen ? [] : aAvisar(problemas, estado, ahora);
  if (nuevos.length) {
    secciones.push({ clave: 'problemas', texto: mensajeDeProblemas(nuevos) });
    hechos.problemas = (e) => { e.avisos ??= {}; for (const p of nuevos) e.avisos[p.clave] = ahora.toISOString(); };
  }

  const importantes = soloResumen ? [] : importantesAAvisar(portada.notas, estado.importantes, ahora);
  if (importantes.length) {
    secciones.push({ clave: 'importantes', texto: textoImportantes(importantes, sitio) });
    hechos.importantes = (e) => { e.importantes = anotarImportantes(e.importantes, importantes, ahora); };
  }

  const pendientes = soloResumen ? null : pendientesAAvisar(portada.pendientes, estado.pendientes, ahora);
  if (pendientes) {
    secciones.push({ clave: 'pendientes', texto: textoPendientes(pendientes) });
    hechos.pendientes = (e) => { e.pendientes = anotarPendientes(portada.pendientes, ahora); };
  }

  if (soloResumen || tocaResumen(ahora, estado)) {
    secciones.push({
      clave: 'resumen',
      texto: mensajeDelResumen({ ahora, libro, web, portada, problemas, problemasArriba: nuevos.length > 0, estadisticas }),
    });
    hechos.resumen = (e) => { e.ultimoResumen = diaAR(ahora); };
  } else if (estadisticas) {
    secciones.push({ clave: 'estadisticas', texto: estadisticas });
  }

  if (!soloResumen) {
    // La primera vez no hay marca: se mira la última hora, no todo el libro.
    const desde = estado.redes?.hasta ?? new Date(ahora.getTime() - 60 * 60000).toISOString();
    const red = novedadesEnRedes(libro, desde);
    if (red.items.length) {
      secciones.push({ clave: 'redes', texto: textoRedes(red.items) });
      hechos.redes = (e) => { e.redes = { hasta: red.hasta }; };
    }
  }

  return {
    secciones,
    anotar(e, incluidas = []) { for (const c of incluidas) hechos[c]?.(e); },
  };
}


// ------------------------------------------------------------ lo que baja datos

async function pedir(url, opciones = {}) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(15000), ...opciones });
  } catch {
    return null;
  }
}

/** Los nombres de los medios que no deben aparecer arriba de un título. */
export const MEDIOS = ['Puntonueve', 'Punto Nueve', 'La Vanguardia', 'Infórmese', 'Informese', 'Radio Gabal', 'News Balcarce', 'El Diario', 'Sendero', 'Clarín', 'Infobae', 'La Nación', 'Página 12', 'Ámbito', 'Olé', 'Minuto Uno', 'Motorsport', 'Carburando', '0223', 'La Capital', 'Retrato de Hoy'];

/**
 * Mira el HTML de la portada y devuelve qué encontró de lo que se pidió sacar.
 * Sólo se buscan las cabeceras de las notas (class="chapa-nota"), no el texto:
 * un titular puede nombrar a un medio sin que sea una fuente en el encabezado.
 */
export function revisarPortada(html) {
  const chapas = [...String(html).matchAll(/<div class="chapa-nota"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' '));
  const enChapa = MEDIOS.filter((m) => chapas.some((c) => c.toLowerCase().includes(m.toLowerCase())));
  const visible = String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  return {
    // Con palabra entera: "sin hora" suelto encontraba "sin horario" (por
    // ejemplo, "atención sin horario de cierre") y avisaba en falso.
    laVimos: /\bla vimos hace\b|\bsin hora\b/i.test(visible),
    horaFarmacia: /turno termina a las|termina a las \d/i.test(visible),
    fuentesEnChapa: enChapa.join(', '),
  };
}

/**
 * Cuándo se armó la web por última vez, según el sitemap.
 *
 * Es la fecha MÁS NUEVA de todas las entradas, no la de la primera. La primera
 * (la portada) lleva la fecha de la nota más nueva, no la del deploy: el 25/09
 * el vigilante avisó "la web no se actualiza hace 2,5 horas" con la web
 * armándose cada media hora, sólo porque la última nota publicada tenía 2,5
 * horas (con las notas incompletas y las internacionales esperando, salen
 * menos notas). Las páginas de servicio (farmacias, dólar, agenda…) llevan la
 * hora del deploy, así que el máximo es siempre el deploy.
 */
export function ultimaModificacion(xml = '') {
  const fechas = [...String(xml).matchAll(/<lastmod>([^<]+)<\/lastmod>/g)]
    .map((m) => ({ texto: m[1], t: new Date(m[1]).getTime() }))
    .filter((f) => Number.isFinite(f.t));
  if (!fechas.length) return null;
  return fechas.reduce((a, b) => (b.t > a.t ? b : a)).texto;
}

export async function observar({ sitio, repo, token, ahora = new Date() }) {
  const portada = await pedir(`${sitio}/sitemap.xml`);
  let actualizado = null;
  if (portada?.ok) {
    actualizado = ultimaModificacion(await portada.text());
  }
  const inicio = await pedir(`${sitio}/`);
  const html = inicio?.ok ? await inicio.text() : '';
  const www = await pedir(sitio.replace('://', '://www.'), { redirect: 'manual' });

  const corridas = {};
  if (token && repo) {
    for (const archivo of ['actualizar.yml', 'redes.yml', 'cloudflare-deploy.yml']) {
      const r = await pedir(`https://api.github.com/repos/${repo}/actions/workflows/${archivo}/runs?per_page=6`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      });
      if (!r?.ok) continue;
      const j = await r.json();
      const lista = (j.workflow_runs ?? []).map((x) => ({ conclusion: x.conclusion, status: x.status, createdAt: x.created_at }));
      const nombre = { 'actualizar.yml': 'Actualizar la web', 'redes.yml': 'Redes', 'cloudflare-deploy.yml': 'Cloudflare Pages' }[archivo];
      corridas[nombre] = lista;
    }
  }
  return {
    ahora,
    web: { estado: inicio?.status ?? 0, actualizado: portada?.ok ? actualizado : null },
    www: www ? { redirige: [301, 302, 307, 308].includes(www.status) } : null,
    contenido: html ? { home: revisarPortada(html) } : null,
    corridas,
  };
}

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const ESTADO = path.join(RAIZ, 'web', 'data', 'vigilancia.json');
  const ESTADISTICAS = path.join(RAIZ, 'web', 'data', 'estadisticas.json');
  const leer = (f, defecto) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defecto; } };
  const sinAvisar = process.argv.includes('--sin-avisar');
  // Manda UN WhatsApp con el resumen del día tal como saldría a las 21 (con
  // las estadísticas medidas en el momento), para ver cómo llega. No guarda
  // nada: ni el estado de los avisos ni la medición.
  const probarResumen = process.argv.includes('--probar-resumen');

  const sitio = (process.env.SITIO ?? 'https://radarbalcarce.com').replace(/\/$/, '');
  const ahora = new Date();
  const libro = leer(path.join(RAIZ, 'web', 'data', 'redes.json'), {});
  const estado = leer(ESTADO, { avisos: {} });
  estado.avisos ??= {};

  const obs = await observar({ sitio, repo: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN, ahora });
  // Cuántas notas de las últimas 24 horas tienen cuerpo (de lo ya publicado).
  const portada = leer(path.join(RAIZ, 'web', 'data', 'portada.json'), { notas: [] });
  const desde = Date.now() - 24 * 3600e3;
  const recientes = (portada.notas ?? []).filter((n) => new Date(n.fecha).getTime() >= desde);
  const cuerpos = { total: recientes.length, conCuerpo: recientes.filter((n) => n.cuerpo).length };
  const auditoria = leer(path.join(RAIZ, 'web', 'data', 'auditoria.json'), null);
  const problemas = evaluar({ ...obs, libro, auditoria, contenido: { ...(obs.contenido ?? {}), cuerpos } });

  console.log(`  ${problemas.length ? `${problemas.length} problema(s):` : 'Todo en orden.'}`);
  for (const p of problemas) console.log(`   [${p.nivel}] ${p.texto}`);

  const telefono = process.env.WHATSAPP_TELEFONO;
  const apikey = process.env.WHATSAPP_APIKEY;
  const puedeAvisar = !sinAvisar && telefono && apikey;
  if (!sinAvisar && !puedeAvisar) console.log('  (no hay WHATSAPP_TELEFONO / WHATSAPP_APIKEY: no se avisa por WhatsApp)');

  let cambio = false;

  // --- las estadísticas: a las 9 y a las 21 (o ahora, si es la prueba)
  const historia = leer(ESTADISTICAS, { puntos: [] });
  historia.puntos ??= [];
  let textoStats = '';
  if (probarResumen || tocaMedir(ahora, estado)) {
    console.log('  Midiendo las estadísticas…');
    const { punto } = await medir({ env: process.env, ahora });
    const turno = turnoDeMedicion(ahora);
    textoStats = textoEstadisticas({
      punto, puntos: historia.puntos, ahora, nombreDeCamino: nombresDeCaminos(portada.notas),
      titulo: turno?.endsWith('/9') ? '📊 Estadísticas de la mañana' : '📊 Estadísticas',
    });
    if (!probarResumen && !sinAvisar) {
      historia.puntos = agregarPunto(historia.puntos, punto);
      fs.writeFileSync(ESTADISTICAS, `${JSON.stringify(historia, null, 2)}\n`);
      estado.ultimaMedicion = turno;
      cambio = true;
    }
  }

  // --- un solo mensaje con todo lo que haya para decir
  const plan = planDeAvisos({
    ahora, problemas, estado, portada, libro, web: obs.web, estadisticas: textoStats, soloResumen: probarResumen, sitio,
  });
  const { texto, incluidas } = armarMensaje(plan.secciones);
  const afuera = plan.secciones.map((s) => s.clave).filter((c) => !incluidas.includes(c));
  if (texto) {
    console.log(`\n  Mensaje de esta corrida (${incluidas.join(', ')}; ${texto.length} caracteres):\n`);
    console.log(texto.split('\n').map((l) => `    ${l}`).join('\n'));
    if (afuera.length) console.log(`\n  No entró en el mensaje (sale en la corrida siguiente): ${afuera.join(', ')}`);
  } else {
    console.log('  Nada para avisar.');
  }
  if (texto && puedeAvisar) {
    const r = await enviarWhatsApp({ telefono, apikey, texto });
    console.log(r.ok ? '  Aviso enviado por WhatsApp.' : `  No se pudo avisar por WhatsApp: ${sinSecretos(r.error, apikey, telefono)}`);
    if (r.ok && !probarResumen) { plan.anotar(estado, incluidas); cambio = true; }
  }
  // Lo que se arregló deja de estar "avisado": si vuelve a fallar, se avisa de nuevo.
  if (!probarResumen) {
    for (const clave of Object.keys(estado.avisos)) {
      if (!problemas.some((p) => p.clave === clave)) { delete estado.avisos[clave]; cambio = true; }
    }
  }
  if (cambio && !probarResumen) fs.writeFileSync(ESTADO, `${JSON.stringify(estado, null, 2)}\n`);
  // Los problemas se anotan arriba de la corrida, pero la corrida termina
  // bien: el vigilante HIZO su trabajo. Antes terminaba con error cuando
  // encontraba algo grave, y Actions pintaba de rojo "Vigilancia" como si
  // la que estuviera rota fuera ella (auditoría del 25/09).
  for (const p of problemas) console.log(anotacion(p));
  process.exit(0);
}


/**
 * La línea que GitHub Actions muestra como aviso amarillo arriba de la
 * corrida. Los saltos de línea y el "%" se escapan como pide GitHub, si no,
 * el aviso se corta en la primera línea.
 */
export function anotacion(problema) {
  const escapar = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  // En el título (una "propiedad") también se escapan ":" y ",".
  const propiedad = (s) => escapar(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
  const titulo = problema.nivel === 'alta' ? 'Vigilancia: problema' : 'Vigilancia: para mirar';
  return `::warning title=${propiedad(titulo)}::${escapar(problema.texto)}`;
}

// Si el que falla es el vigilante mismo (no pudo correr), eso sí termina con
// error: es lo único que tiene que pintar de rojo esta corrida.
if (process.argv[1] && process.argv[1].endsWith('vigilar.mjs')) {
  await main().catch((e) => {
    console.error(`El vigilante no pudo terminar: ${e?.stack ?? e}`);
    process.exit(1);
  });
}
