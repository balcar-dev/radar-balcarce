// Segunda pasada sobre los datos dudosos de la prueba a mano (palabras completas, sin falsos positivos).
import fs from 'node:fs';

const bajar = async (url) => {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarce-prueba/1.0)' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
};
const contexto = (t, re, n = 140) => { const m = t.match(re); return m ? `…${t.slice(Math.max(0, m.index - n), m.index + n)}…` : null; };

const casos = [
  ['Gemini · La Vanguardia (ACE como palabra completa)', 'https://www.diariolavanguardia.com/entrevistas/339-siempre-he-visto-la-actuacion-como-un-juego-y-un-aprendizaje/', /\bACE\b|Asociaci[oó]n de Cronistas/, ],
  ['Gemini · La Vanguardia (Metropolitan)', 'https://www.diariolavanguardia.com/entrevistas/339-siempre-he-visto-la-actuacion-como-un-juego-y-un-aprendizaje/', /Metropolitan/],
  ['Grok · Wikipedia (¿es la actriz de Suavecita?)', 'https://es.wikipedia.org/wiki/Camila_Peralta', /Suavecita|actriz/],
  ['Grok · Wikipedia (nacimiento)', 'https://es.wikipedia.org/wiki/Camila_Peralta', /21 de julio de 1991/],
  ['Grok · Río Negro (cantidad de butacas)', 'https://www.rionegro.com.ar/cultura/suavecita-el-unipersonal-protagonizado-por-camila-peralta-llega-al-festival-nevadas-escenicas-de-bariloche/', /butacas|ochenta/],
  ['Meta · Infobae (Premio ACE a Peralta)', 'https://www.infobae.com/cultura/2024/12/13/premios-ace-20232024-una-celebracion-del-teatro-porteno-lista-completa-de-los-ganadores/', /Suavecita/],
];
for (const [nombre, url, re] of casos) {
  try {
    const t = await bajar(url);
    const c = contexto(t, re);
    console.log(`\n${nombre}\n  ${c ? `SI: ${c}` : 'no aparece'}`);
  } catch (e) { console.log(`\n${nombre}\n  NO ABRE (${e.message})`); }
}
