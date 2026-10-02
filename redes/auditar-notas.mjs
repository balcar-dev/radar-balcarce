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
  notasParaAuditar, auditarNotas, guardarHallazgos, resumenParaWhatsApp, huellaDeNota, AUDITORIA, cambioMecanico, conCambiosGuardados,
} from '../ingesta/auditoria-ia.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const ARCHIVO = path.join(RAIZ, 'web', 'data', 'auditoria-ia.json');
// Lo que la auditoría corrigió sola (ortografía chica y segura): pares "antes → después" que la web aplica al armar cada nota.
const ARCHIVO_CAMBIOS = path.join(RAIZ, 'web', 'data', 'correcciones-auditoria.json');

const leerJson = (f, defecto) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defecto; } };

/**
 * Una corrida entera, sin leer ni escribir nada (para probarla). `estado` es lo guardado la vez anterior; devuelve el
 * estado nuevo, los hallazgos de esta vez (en claro, sólo para el aviso) y el texto del WhatsApp ('' si no hay nada grave).
 */
export async function correrAuditoria({
  portada = { notas: [] }, estado = {}, llaves = [], clave, fetchFn = fetch, dormir, ahora = new Date(), corregir = true,
} = {}) {
  const notas = portada.notas ?? [];
  const revisadas = estado.revisadas ?? {};
  const paraLeer = notasParaAuditar(notas, { revisadas, ahora: ahora.getTime() });
  const leido = paraLeer.length ? await auditarNotas(paraLeer, { clave, fetchFn, dormir }) : { hallazgos: [], leidas: [], fallas: [], descartados: 0 };
  const { leidas, fallas, descartados } = leido;
  // Lo mecánico se corrige solo (ETAPA 2) y sale de la lista de avisos: queda anotado aparte, en lo corregido.
  const porId = new Map(paraLeer.map((n) => [n.id, n]));
  const cambios = [];
  const hallazgos = leido.hallazgos.filter((h) => {
    const c = corregir ? cambioMecanico(h, porId.get(h.id)) : null;
    if (!c) return true;
    if (!cambios.some((x) => x.id === h.id && x.campo === c.campo && x.antes === c.antes)) cambios.push({ id: h.id, ...c });
    return false;
  });

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
  // Los números del día, para afinar el criterio (1/10: "seguí tomando datos"). Sólo conteos: nada de lo que se encontró.
  const dia = new Date(ahora.getTime() - 3 * 3600e3).toISOString().slice(0, 10);
  const dias = { ...(estado.contadores?.dias ?? {}) };
  const hoy = { leidas: 0, hallazgos: 0, graves: 0, descartados: 0, fallas: 0, corregidos: 0, porTipo: {}, ...(dias[dia] ?? {}) };
  hoy.leidas += leidas.length;
  hoy.hallazgos += hallazgos.length + cambios.length;
  hoy.corregidos += cambios.length;
  hoy.graves += hallazgos.filter((h) => h.gravedad === 'alta').length;
  hoy.descartados += descartados ?? 0;
  hoy.fallas += fallas.length;
  for (const h of hallazgos) hoy.porTipo[h.tipo] = (hoy.porTipo[h.tipo] ?? 0) + 1;
  if (cambios.length) hoy.porTipo.ortografia = (hoy.porTipo.ortografia ?? 0) + cambios.length;
  dias[dia] = hoy;
  const conservar = Object.keys(dias).sort().slice(-14);
  const contadores = { dias: Object.fromEntries(conservar.map((d) => [d, dias[d]])) };
  return {
    estado: { version: 1, generado: ahora.toISOString(), revisadas: nuevasRevisadas, cuando, sobres, contadores },
    hallazgos,
    cambios,
    notasLeidas: paraLeer,
    leidas,
    fallas,
    descartados,
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
  const r = await correrAuditoria({ portada, estado, llaves, clave, corregir: !process.env.AUDITORIA_SIN_CORREGIR });
  console.log(`Auditoría: ${r.leidas.length} notas leídas, ${r.hallazgos.length} hallazgos${r.cambios.length ? `, ${r.cambios.length} corregidos solos` : ''}${r.descartados ? ` (${r.descartados} descartados: la cita no estaba en la nota)` : ''}${r.fallas.length ? `, ${r.fallas.length} pedidos fallaron (${[...new Set(r.fallas)].join('; ')})` : ''}.`);
  for (const h of r.hallazgos) console.log(`  [${h.gravedad}] ${h.tipo}: ${h.detalle}`);
  for (const c of r.cambios) console.log(`  corregido (${c.campo}): "${c.antes}" → "${c.despues}"`);
  if (simular) return;
  if (r.cambios.length) {
    const libro = conCambiosGuardados(leerJson(ARCHIVO_CAMBIOS, { notas: {} }), r.cambios, r.notasLeidas);
    // Una nota por renglón, como correcciones.json: el historial dice qué se corrigió cuándo.
    const lineas = Object.entries(libro.notas).map(([id, e]) => `${JSON.stringify(id)}:${JSON.stringify(e)}`);
    fs.writeFileSync(ARCHIVO_CAMBIOS, `{"notas":{${lineas.length ? `\n${lineas.join(',\n')}\n` : ''}}}\n`, 'utf8');
  }
  if (JSON.stringify(r.estado.revisadas) !== JSON.stringify(estado.revisadas ?? {}) || JSON.stringify(r.estado.cuando) !== JSON.stringify(estado.cuando ?? {}) || r.leidas.length || r.fallas.length) {
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
