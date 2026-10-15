// Verifica los datos que dieron a mano meta.ai, Grok y Gemini (app) para la nota de Camila Peralta:
// abre cada dirección y busca las palabras o cifras clave. También mira si la nota ya mencionaba el dato.
//   node pruebas-modelos/verificar-a-mano.mjs

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const h = JSON.parse(fs.readFileSync(path.join(AQUI, 'historias.json'), 'utf8')).historias[1];
const sin = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const compacto = (s) => sin(s).replace(/(\d)[.,](?=\d)/g, '$1');
const nota = compacto(`${h.origenes[0].resumen} ${h.textoDeLaFuente ?? ''}`);
console.log(`NOTA: ${h.titulo}`);
for (const k of ['Pinti', 'ACE', 'Metropolitan', 'Roxy', 'Martin Fierro', 'Guerrero', 'Guevara', 'Teatro del Mundo', 'Luis Conti', 'Nun', 'Bariloche', '1991']) {
  console.log(`  la nota menciona ${k.padEnd(18)} ${nota.includes(compacto(k)) ? 'SI' : 'no'}`);
}

const pruebas = [
  ['Meta 1 · capacidad del Roxy', 'http://miradorvirtual.com.ar/roxy-radio-city-y-melany-con-una-cartelera-imperdible/', ['954', '2587', '1363', '270']],
  ['Meta 2 · Premio ACE (Infobae)', 'https://www.infobae.com/cultura/2024/12/13/premios-ace-20232024-una-celebracion-del-teatro-porteno-lista-completa-de-los-ganadores/', ['Suavecita', 'Camila Peralta', 'un solo personaje']],
  ['Meta 3 · historia del complejo', 'http://bacap.com.ar/2025/01/02/el-centro-de-arte-mar-del-plata-presentara-55-espectaculos-en-la-temporada/', ['1958', 'Gigante', 'The Police', '1980']],
  ['Grok 1 · Wikipedia, nacimiento', 'https://es.wikipedia.org/wiki/Camila_Peralta', ['Camila Peralta', '1991', 'Balcarce', '21 de julio']],
  ['Grok 2 · SIBOM, resolución', 'https://sibom.slyt.gba.gob.ar/bulletins/15660/contents/2439247', ['Suavecita', '64/26', 'Pinti', 'Peralta']],
  ['Grok 3 · Río Negro', 'https://www.rionegro.com.ar/cultura/suavecita-el-unipersonal-protagonizado-por-camila-peralta-llega-al-festival-nevadas-escenicas-de-bariloche/', ['Nün', '80', 'Metropolitan', '600', 'Suavecita']],
  ['Gemini 1 y 2 · entrevista en La Vanguardia', 'https://www.diariolavanguardia.com/entrevistas/339-siempre-he-visto-la-actuacion-como-un-juego-y-un-aprendizaje/', ['ACE', 'Cronistas', 'Metropolitan', 'Suavecita', '60']],
  ['Gemini 3 · Facebook del Teatro Conti', 'https://www.facebook.com/teatroluisconti/posts/1234998411761457/', ['27 de septiembre', 'Suavecita', '2025']],
];

for (const [nombre, url, claves] of pruebas) {
  console.log(`\n${nombre}`);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarce-prueba/1.0)' } });
    if (!r.ok) { console.log(`  -> NO ABRE (HTTP ${r.status})`); continue; }
    const t = compacto((await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
    console.log(`  -> abre; busco: ${claves.map((k) => `${k}: ${t.includes(compacto(k)) ? 'SI' : 'no'}`).join(' | ')}`);
  } catch (e) { console.log(`  -> NO ABRE (${String(e.message).slice(0, 40)})`); }
}
