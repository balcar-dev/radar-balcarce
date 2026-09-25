// Auditoría semanal: ¿lo que está publicado sigue cumpliendo lo que pedimos?
//
//   node redes/auditar.mjs            mira la web en vivo, guarda el resultado y avisa
//   node redes/auditar.mjs --sin-avisar
//
// Mira: (1) las medidas de las imágenes publicadas contra redes/formatos.mjs,
// (2) que los íconos estén, (3) el SEO de las páginas (web/scripts/auditar-seo-vivo.mjs),
// (4) que los datos de formatos no estén viejos (las redes los cambian).
// Guarda el resultado en web/data/auditoria.json; el vigilante avisa si esta
// auditoría deja de correr. Sin dependencias: sólo Node.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  FORMATOS, VIGENCIA_DIAS, diasDesdeVerificado, hayQueVolverAVerificar, sinConfirmar, medidaDePng,
} from './formatos.mjs';
import { enviarWhatsApp } from './whatsapp.mjs';

/**
 * Qué está mal, dado lo observado. Pura: se prueba sin red.
 * @param {object} o
 * @param {Date} o.ahora
 * @param {{ nombre:string, url:string, estado:number, medida:{ancho:number,alto:number}|null, esperada:{ancho:number,alto:number} }[]} o.imagenes
 * @param {{ url:string, estado:number }[]} o.archivos   íconos y manifest
 * @param {number|null} o.seo    código de salida del auditor SEO (0 = todo bien)
 */
export function evaluarAuditoria({ ahora = new Date(), imagenes = [], archivos = [], seo = null }) {
  const problemas = [];
  const de = (clave, texto) => problemas.push({ clave, texto });

  for (const i of imagenes) {
    if (i.estado !== 200) de(`imagen-${i.nombre}`, `La imagen "${i.nombre}" no responde (HTTP ${i.estado || 'sin respuesta'}): ${i.url}`);
    else if (!i.medida) de(`imagen-${i.nombre}`, `"${i.nombre}" no es un PNG legible: ${i.url}`);
    else if (i.medida.ancho !== i.esperada.ancho || i.medida.alto !== i.esperada.alto) {
      de(`imagen-${i.nombre}`, `"${i.nombre}" mide ${i.medida.ancho}x${i.medida.alto} y tendría que medir ${i.esperada.ancho}x${i.esperada.alto}.`);
    }
  }
  for (const a of archivos) if (a.estado !== 200) de(`archivo-${a.url}`, `Falta ${a.url} (HTTP ${a.estado || 'sin respuesta'}).`);
  if (seo !== null && seo !== 0) de('seo', 'El auditor de SEO en vivo encontró páginas con problemas: corré `node web/scripts/auditar-seo-vivo.mjs` para ver cuáles.');

  if (hayQueVolverAVerificar(ahora)) {
    de('formatos-viejos', `Las medidas de imágenes de las redes (redes/formatos.mjs) se verificaron hace ${diasDesdeVerificado(ahora)} días (tope ${VIGENCIA_DIAS}). Instagram y Facebook las cambian: buscar las vigentes y actualizar la fecha (FORMATOS.md).`);
  }
  const dudosos = sinConfirmar();
  if (dudosos.length) de('formatos-sin-confirmar', `Medidas sin confirmar en la fuente oficial: ${dudosos.join(', ')} (FORMATOS.md).`);
  return problemas;
}

/** ¿La auditoría dejó de correr? (lo usa el vigilante). Sin archivo = todavía no corrió: no se avisa. */
export function auditoriaVencida(auditoria, ahora = new Date(), dias = 10) {
  if (!auditoria?.fecha) return false;
  return (ahora.getTime() - new Date(auditoria.fecha).getTime()) / 86400000 > dias;
}

async function pedir(url) {
  try { return await fetch(url, { signal: AbortSignal.timeout(20000) }); } catch { return null; }
}

async function observarImagen(nombre, url, esperada) {
  const r = await pedir(url);
  const medida = r?.ok ? medidaDePng(Buffer.from(await r.arrayBuffer())) : null;
  return { nombre, url, estado: r?.status ?? 0, medida, esperada };
}

async function main() {
  const RAIZ = path.join(import.meta.dirname, '..');
  const sitio = (process.env.SITIO ?? 'https://radarbalcarce.com').replace(/\/$/, '');
  const ahora = new Date();
  const portada = JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'portada.json'), 'utf8'));
  const nota = (portada.notas ?? []).find((n) => n.id);

  const imagenes = [];
  if (nota) {
    const base = `${sitio}/nota/${nota.slug ? `${nota.slug}-${nota.id}` : nota.id}`;
    const ig = FORMATOS.instagram.posteo;
    const en = FORMATOS.facebook.enlace;
    imagenes.push(await observarImagen('instagram-posteo', `${base}/instagram.png`, { ancho: ig.ancho, alto: ig.alto }));
    imagenes.push(await observarImagen('compartir-enlace', `${base}/opengraph-image`, { ancho: en.ancho, alto: en.alto }));
  }
  for (const t of FORMATOS.web.icono.png) imagenes.push(await observarImagen(`icono-${t}`, `${sitio}/icon-${t}.png`, { ancho: t, alto: t }));
  imagenes.push(await observarImagen('apple-touch-icon', `${sitio}/apple-touch-icon.png`, { ancho: FORMATOS.web.icono.apple, alto: FORMATOS.web.icono.apple }));

  const archivos = [];
  for (const u of ['/favicon.ico', '/manifest.webmanifest', '/sitemap.xml', '/robots.txt']) {
    archivos.push({ url: u, estado: (await pedir(`${sitio}${u}`))?.status ?? 0 });
  }
  const s = spawnSync(process.execPath, [path.join(RAIZ, 'web', 'scripts', 'auditar-seo-vivo.mjs'), sitio], { encoding: 'utf8' });
  const problemas = evaluarAuditoria({ ahora, imagenes, archivos, seo: s.status });

  const resultado = { fecha: ahora.toISOString(), problemas, imagenesMiradas: imagenes.length };
  fs.writeFileSync(path.join(RAIZ, 'web', 'data', 'auditoria.json'), `${JSON.stringify(resultado, null, 2)}\n`);
  console.log(problemas.length ? `  ${problemas.length} problema(s):` : '  Auditoría: todo en orden.');
  for (const p of problemas) console.log(`   - ${p.texto}`);

  const { WHATSAPP_TELEFONO: telefono, WHATSAPP_APIKEY: apikey } = process.env;
  if (problemas.length && telefono && apikey && !process.argv.includes('--sin-avisar')) {
    const r = await enviarWhatsApp({ telefono, apikey, texto: `🔎 Radar Balcarce: auditoría semanal\n\n${problemas.map((p) => `• ${p.texto}`).join('\n')}` });
    console.log(r.ok ? '  Aviso enviado por WhatsApp.' : `  No se pudo avisar: ${r.error}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('auditar.mjs')) await main();
