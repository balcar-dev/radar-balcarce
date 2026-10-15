// ¿DuckDuckGo (versión HTML, sin clave) devuelve resultados reales para búsquedas como las de la plantilla?
const consultas = ['"Teatro Roxy" Mar del Plata butacas', '"Camila Peralta" "Suavecita" Premio ACE', '"Estudiantes de Río Cuarto" descenso 2026 puntos'];
for (const q of consultas) {
  const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; RadarBalcarce-prueba/1.0)' }, signal: AbortSignal.timeout(20000) });
  const html = await r.text();
  const resultados = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ titulo: m[2].replace(/<[^>]+>/g, '').trim(), url: m[1] }));
  const bloqueo = /anomaly|captcha|unusual traffic|blocked/i.test(html);
  console.log(`\n${q}\n  HTTP ${r.status} · resultados: ${resultados.length}${bloqueo ? ' · POSIBLE BLOQUEO' : ''}`);
  for (const x of resultados.slice(0, 3)) console.log(`   - ${x.titulo.slice(0, 80)} -> ${decodeURIComponent((x.url.match(/uddg=([^&]+)/) ?? [])[1] ?? x.url).slice(0, 100)}`);
}
