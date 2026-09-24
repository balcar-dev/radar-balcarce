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
//   · que `www` redirija al dominio sin `www`.
//
// Los problemas se avisan una vez cada seis horas (no un mensaje cada media
// hora por lo mismo), y a las 21 sale un resumen "todo bien" si no hay nada.
//
// La parte que decide (`evaluar`) es una función pura: recibe lo observado y
// devuelve los problemas. Se prueba sin red. Lo que baja datos y manda el
// mensaje está abajo, en `main`.
//
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { cronogramaDelDia, ventanaDe, claveDePieza } from './piezas.mjs';
import { yaPublicada, horaAR, diaAR } from './elegir.mjs';
import { enviarWhatsApp } from './whatsapp.mjs';

/** Las piezas que tienen que salir todos los días: si no salió una, es un
 *  problema. Los podcasts no están: dependen de que haya notas para contar. */
export const PIEZAS_FIJAS = ['clima-manana', 'farmacia', 'clima-noche'];

export const LIMITES = {
  minutosSinActualizar: 100,   // la web se arma cada 30
  minutosSinReloj: 100,        // el reloj de redes corre cada 30
  horasEntreAvisos: 6,
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
export function evaluar({ ahora, web, www = null, corridas = {}, libro = {} }) {
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

/** El resumen de las 21: sólo si no hay ningún problema. */
export function mensajeDelResumen({ ahora, libro = {}, web }) {
  const hoy = diaAR(ahora);
  const salidas = Object.keys(libro.instagram ?? {}).filter((c) => c.startsWith(`${hoy}/`)).length;
  const posteos = Object.values(libro.facebook ?? {}).filter((p) => diaAR(new Date(p.cuando)) === hoy).length;
  return `✅ Radar Balcarce: todo bien.\n\n• Web al día${web?.actualizado ? ` (última actualización ${new Date(web.actualizado).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })})` : ''}\n• Instagram y Facebook: ${salidas} pieza(s) de video y ${posteos} posteo(s) hoy`;
}

/** ¿Toca mandar el resumen? Una vez por día, a partir de las 21. */
export function tocaResumen(ahora, estado = {}) {
  return horaAR(ahora) >= LIMITES.horaDelResumen && estado.ultimoResumen !== diaAR(ahora);
}

// ------------------------------------------------------------ lo que baja datos

async function pedir(url, opciones = {}) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(15000), ...opciones });
  } catch {
    return null;
  }
}

export async function observar({ sitio, repo, token, ahora = new Date() }) {
  const portada = await pedir(`${sitio}/sitemap.xml`);
  let actualizado = null;
  if (portada?.ok) {
    // La portada es la primera entrada del sitemap y su fecha es la del último deploy.
    actualizado = (await portada.text()).match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null;
  }
  const inicio = await pedir(`${sitio}/`);
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
    corridas,
  };
}

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const ESTADO = path.join(RAIZ, 'web', 'data', 'vigilancia.json');
  const leer = (f, defecto) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defecto; } };
  const sinAvisar = process.argv.includes('--sin-avisar');

  const sitio = (process.env.SITIO ?? 'https://radarbalcarce.com').replace(/\/$/, '');
  const ahora = new Date();
  const libro = leer(path.join(RAIZ, 'web', 'data', 'redes.json'), {});
  const estado = leer(ESTADO, { avisos: {} });

  const obs = await observar({ sitio, repo: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN, ahora });
  const problemas = evaluar({ ...obs, libro });

  console.log(`  ${problemas.length ? `${problemas.length} problema(s):` : 'Todo en orden.'}`);
  for (const p of problemas) console.log(`   [${p.nivel}] ${p.texto}`);

  const telefono = process.env.WHATSAPP_TELEFONO;
  const apikey = process.env.WHATSAPP_APIKEY;
  const puedeAvisar = !sinAvisar && telefono && apikey;
  if (!sinAvisar && !puedeAvisar) console.log('  (no hay WHATSAPP_TELEFONO / WHATSAPP_APIKEY: no se avisa por WhatsApp)');

  let cambio = false;
  const nuevos = aAvisar(problemas, estado, ahora);
  if (nuevos.length && puedeAvisar) {
    const r = await enviarWhatsApp({ telefono, apikey, texto: mensajeDeProblemas(nuevos) });
    console.log(r.ok ? '  Aviso enviado por WhatsApp.' : `  No se pudo avisar por WhatsApp: ${r.error}`);
    if (r.ok) { for (const p of nuevos) estado.avisos[p.clave] = ahora.toISOString(); cambio = true; }
  }
  // Lo que se arregló deja de estar "avisado": si vuelve a fallar, se avisa de nuevo.
  for (const clave of Object.keys(estado.avisos)) {
    if (!problemas.some((p) => p.clave === clave)) { delete estado.avisos[clave]; cambio = true; }
  }
  if (!problemas.length && tocaResumen(ahora, estado) && puedeAvisar) {
    const r = await enviarWhatsApp({ telefono, apikey, texto: mensajeDelResumen({ ahora, libro, web: obs.web }) });
    if (r.ok) { estado.ultimoResumen = diaAR(ahora); cambio = true; console.log('  Resumen del día enviado.'); }
  }
  if (cambio) fs.writeFileSync(ESTADO, `${JSON.stringify(estado, null, 2)}\n`);
  process.exit(problemas.some((p) => p.nivel === 'alta') ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith('vigilar.mjs')) await main();
