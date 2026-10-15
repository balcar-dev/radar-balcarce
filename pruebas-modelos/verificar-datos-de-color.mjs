// Verifica los "datos de color" que propusieron las IAs: abre la fuente y comprueba si el dato está ahí.
//   node pruebas-modelos/verificar-datos-de-color.mjs
// Para cada dato: ¿la dirección abre? ¿es una portada genérica? ¿el dato repite lo que la nota ya decía? ¿la cifra aparece en la
// página citada (o en alguna de las páginas que encontró la búsqueda para esa nota)? Escribe datos-de-color.md. Sin claves.

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const notas = new Map(JSON.parse(fs.readFileSync(path.join(AQUI, 'notas-datos.json'), 'utf8')).map((n) => [n.id, n]));
const archivos = fs.readdirSync(AQUI).filter((f) => /^datos-de-color-.*\.json$/.test(f));
const corridas = archivos.map((f) => JSON.parse(fs.readFileSync(path.join(AQUI, f), 'utf8'))).sort((a, b) => a.modelo.localeCompare(b.modelo));

const sinTildes = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const compacto = (s) => sinTildes(s).replace(/(\d)[.,\s](?=\d)/g, '$1'); // "48.982" y "48 982" se leen "48982"
const numerosDe = (s) => [...compacto(s).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(',', '.')).filter((x) => x.length >= 3 || x.includes('.'));
const claves = (s) => [...new Set(sinTildes(s).match(/[a-z]{5,}/g) ?? [])];

// ---- bajar páginas (una sola vez cada una)
const paginas = new Map();
async function pagina(url) {
  if (paginas.has(url)) return paginas.get(url);
  const p = (async () => {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarce-prueba/1.0)', accept: 'text/html,*/*' } });
      if (!res.ok) return { ok: false, motivo: `HTTP ${res.status}` };
      const html = (await res.text()).slice(0, 600_000);
      const texto = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
      return { ok: true, texto: compacto(texto), final: res.url };
    } catch (e) { return { ok: false, motivo: String(e.message).slice(0, 40) }; }
  })();
  paginas.set(url, p);
  return p;
}
const dominio = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } };
const esGenerica = (u) => { try { const x = new URL(u); return x.pathname.replace(/\/+$/, '') === '' && !x.search; } catch { return true; } };

// ---- juzgar cada dato
const filas = [];
for (const c of corridas) {
  for (const [id, r] of Object.entries(c.notas)) {
    const nota = notas.get(id);
    const textoNota = compacto(`${nota.titulo} ${nota.texto}`);
    for (const d of r.datos ?? []) {
      const url = String(d.fuente_url ?? '');
      const dato = `${d.dato ?? ''} ${d.cifra ?? ''}`;
      const nuevos = numerosDe(dato).filter((n) => !textoNota.includes(n));
      const todos = numerosDe(dato);
      const palabrasNuevas = claves(d.dato ?? '').filter((p) => !textoNota.includes(p));
      const fila = { modelo: c.modelo, nota: id, dato: String(d.dato ?? '').slice(0, 160), cifra: String(d.cifra ?? '').slice(0, 40), url, dominio: dominio(url), generica: esGenerica(url), nuevos, veredicto: null, via: null, dominioRespaldo: null };
      // ¿repite la nota? Todo lo que dice ya estaba (sus números y la gran mayoría de sus palabras).
      if (todos.length && !nuevos.length && palabrasNuevas.length <= 2) { fila.veredicto = 'repite la nota'; filas.push(fila); continue; }
      const candidatas = [...(url && !fila.generica ? [url] : []), ...(r.citadas ?? []).slice(0, 8)];
      if (!candidatas.length) { fila.veredicto = url ? 'fuente genérica, sin página que mirar' : 'sin fuente'; filas.push(fila); continue; }
      let abrio = false;
      for (const u of candidatas) {
        const p = await pagina(u);
        if (!p.ok) continue;
        abrio = true;
        const encontrados = nuevos.filter((n) => p.texto.includes(n));
        const cubreNum = nuevos.length ? encontrados.length / nuevos.length >= 0.5 : false;
        const cubrePal = !nuevos.length && palabrasNuevas.length >= 3 && palabrasNuevas.filter((w) => p.texto.includes(w)).length / palabrasNuevas.length >= 0.6;
        if (cubreNum || cubrePal) { fila.veredicto = 'respaldado'; fila.via = u === url ? 'la dirección del dato' : 'una cita de la búsqueda'; fila.dominioRespaldo = dominio(p.final ?? u); break; }
      }
      if (!fila.veredicto) fila.veredicto = abrio ? 'no está en la fuente' : 'la fuente no abre';
      filas.push(fila);
    }
  }
}

// ---- informe
const L = ['# Datos de color: qué proponen las IAs y si la fuente los respalda\n'];
L.push(`Se les dio a ${corridas.length} IAs con búsqueda web ${notas.size} notas (7 locales o regionales y 5 nacionales o deportivas) y se les pidió hasta 3 datos de contexto, cada uno con la dirección de donde sale. Después se abrió cada fuente y se comprobó si la cifra está en la página. "Respaldado" = la cifra nueva aparece en la página citada o en una de las páginas que encontró la búsqueda. "Repite la nota" = no agrega nada nuevo.\n`);
L.push('| IA | Datos propuestos | Respaldados | Repiten la nota | No está en la fuente | Fuente genérica o no abre | Notas sin ningún dato | Costo por nota | Seg. por nota |');
L.push('|---|---|---|---|---|---|---|---|---|');
for (const c of corridas) {
  const fs_ = filas.filter((f) => f.modelo === c.modelo);
  const cuenta = (v) => fs_.filter((f) => f.veredicto === v).length;
  const rs = Object.values(c.notas);
  const costos = rs.map((r) => r.uso?.costo).filter((x) => x != null);
  const sin = rs.filter((r) => !(r.datos ?? []).length).length;
  const generica = fs_.filter((f) => ['fuente genérica, sin página que mirar', 'sin fuente', 'la fuente no abre'].includes(f.veredicto)).length;
  L.push(`| ${c.modelo} | ${fs_.length} | **${cuenta('respaldado')}** (${fs_.length ? Math.round((100 * cuenta('respaldado')) / fs_.length) : 0}%) | ${cuenta('repite la nota')} | ${cuenta('no está en la fuente')} | ${generica} | ${sin} de ${rs.length} | ${costos.length ? `US$ ${(costos.reduce((a, b) => a + b, 0) / costos.length).toFixed(3)}` : 's/d'} | ${(rs.reduce((a, r) => a + r.ms, 0) / rs.length / 1000).toFixed(0)} |`);
}
const dominios = {};
for (const f of filas.filter((x) => x.veredicto === 'respaldado')) dominios[f.dominioRespaldo] = (dominios[f.dominioRespaldo] ?? 0) + 1;
L.push(`\n## De qué sitios salieron los datos respaldados\n`);
L.push(Object.entries(dominios).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([d, n]) => `${d} (${n})`).join(' · ') || 'ninguno');
L.push('\n## Ejemplos de datos respaldados (para ver qué tipo de dato aparece)\n');
for (const f of filas.filter((x) => x.veredicto === 'respaldado').slice(0, 25)) L.push(`- **${f.modelo}** · nota "${notas.get(f.nota).titulo.slice(0, 50)}": ${f.dato} → ${f.dominioRespaldo}`);
L.push('\n## Ejemplos de datos que NO están en la fuente\n');
for (const f of filas.filter((x) => x.veredicto === 'no está en la fuente').slice(0, 15)) L.push(`- **${f.modelo}** · ${f.dato} (cifra ${f.cifra}) → ${f.dominio ?? 's/d'}`);
fs.writeFileSync(path.join(AQUI, 'datos-de-color.md'), `${L.join('\n')}\n`);
fs.writeFileSync(path.join(AQUI, 'datos-de-color-verificado.json'), JSON.stringify(filas));
console.log(L.slice(0, 14).join('\n'));
