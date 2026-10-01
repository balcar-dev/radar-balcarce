// "Auditoría IA": lee las notas nuevas de la portada y avisa lo que esté mal (ingesta/auditoria-ia.mjs). Etapa 1: no
// corrige nada. Corre en el workflow .github/workflows/auditoria-ia.yml, cada hora.
//
//   node redes/auditar-notas.mjs           lee, guarda web/data/auditoria-ia.json y avisa por WhatsApp si hay algo grave
//   node redes/auditar-notas.mjs --simular lee y muestra, sin guardar ni avisar
//
// Lo que guarda: `revisadas` (qué nota se leyó, con la huella de su texto) y los hallazgos cifrados para el celular, uno por
// nota (`sobres`). El repositorio es público: un hallazgo puede decir "parece identificar a un menor", y eso sólo lo puede
// abrir el celular registrado (panel/cifrado.mjs). Lo único que queda a la vista es qué nota se leyó y cuándo.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerVariable } from '../reels/claves.mjs';
import { cerrar, leerLlaves } from '../panel/cifrado.mjs';
import { enviarWhatsApp } from './whatsapp.mjs';
import {
  notasParaAuditar, auditarNotas, guardarHallazgos, resumenParaWhatsApp, huellaDeNota, AUDITORIA,
} from '../ingesta/auditoria-ia.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const ARCHIVO = path.join(RAIZ, 'web', 'data', 'auditoria-ia.json');

const leerJson = (f, defecto) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defecto; } };

/**
 * Una corrida entera, sin leer ni escribir nada (para probarla). `estado` es lo guardado la vez anterior; devuelve el
 * estado nuevo, los hallazgos de esta vez (en claro, sólo para el aviso) y el texto del WhatsApp ('' si no hay nada grave).
 */
export async function correrAuditoria({
  portada = { notas: [] }, estado = {}, llaves = [], clave, fetchFn = fetch, dormir, ahora = new Date(),
} = {}) {
  const notas = portada.notas ?? [];
  const revisadas = estado.revisadas ?? {};
  const paraLeer = notasParaAuditar(notas, { revisadas, ahora: ahora.getTime() });
  const { hallazgos, leidas, fallas } = paraLeer.length ? await auditarNotas(paraLeer, { clave, fetchFn, dormir }) : { hallazgos: [], leidas: [], fallas: [] };

  // Lo guardado de las notas que se volvieron a leer se reemplaza; lo demás se queda, salvo lo viejo o lo que ya no está.
  const nuevos = guardarHallazgos({}, { hallazgos, leidas, notas: paraLeer, ahora });
  const vigentes = new Set(notas.map((n) => n.id));
  const limite = ahora.getTime() - AUDITORIA.dias * 86400e3;
  const cuando = {};
  const sobres = {};
  for (const [id, sobre] of Object.entries(estado.sobres ?? {})) {
    if (leidas.includes(id) || !vigentes.has(id) || Date.parse(estado.cuando?.[id] ?? '') < limite) continue;
    sobres[id] = sobre;
    cuando[id] = estado.cuando[id];
  }
  for (const [id, contenido] of Object.entries(nuevos)) {
    sobres[id] = cerrar(contenido, llaves);
    cuando[id] = contenido.cuando;
  }
  const nuevasRevisadas = Object.fromEntries(Object.entries(revisadas).filter(([id]) => vigentes.has(id)));
  for (const id of leidas) {
    const n = paraLeer.find((x) => x.id === id);
    if (n) nuevasRevisadas[id] = huellaDeNota(n);
  }
  return {
    estado: { version: 1, generado: ahora.toISOString(), revisadas: nuevasRevisadas, cuando, sobres },
    hallazgos,
    leidas,
    fallas,
    texto: resumenParaWhatsApp(hallazgos, paraLeer),
  };
}

async function main() {
  const simular = process.argv.includes('--simular');
  const clave = leerVariable('GROQ_API_KEY');
  if (!clave) { console.log('Sin GROQ_API_KEY: no se audita.'); return; }
  const portada = leerJson(path.join(RAIZ, 'web', 'data', 'portada.json'), { notas: [] });
  const estado = leerJson(ARCHIVO, {});
  const llaves = leerLlaves(leerJson(path.join(RAIZ, 'web', 'data', 'celular-llaves.json'), {}));
  const r = await correrAuditoria({ portada, estado, llaves, clave });
  console.log(`Auditoría: ${r.leidas.length} notas leídas, ${r.hallazgos.length} hallazgos${r.fallas.length ? `, ${r.fallas.length} pedidos fallaron (${[...new Set(r.fallas)].join('; ')})` : ''}.`);
  for (const h of r.hallazgos) console.log(`  [${h.gravedad}] ${h.tipo}: ${h.detalle}`);
  if (simular) return;
  if (JSON.stringify(r.estado.revisadas) !== JSON.stringify(estado.revisadas ?? {}) || JSON.stringify(r.estado.cuando) !== JSON.stringify(estado.cuando ?? {})) {
    fs.writeFileSync(ARCHIVO, `${JSON.stringify(r.estado)}\n`, 'utf8');
  }
  if (r.texto) {
    const telefono = leerVariable('WHATSAPP_TELEFONO');
    const apikey = leerVariable('WHATSAPP_APIKEY');
    if (telefono && apikey) await enviarWhatsApp({ telefono, apikey, texto: r.texto }).catch((e) => console.log(`WhatsApp: ${e.message}`));
    else console.log('Hay algo grave pero no hay WhatsApp configurado.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
