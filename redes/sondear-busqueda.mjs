// Sondea si Gemini puede buscar en internet con las claves gratis (para las "Pistas" del panel, 1/10/2026): hace UNA
// pregunta con la herramienta google_search y cuenta cuántas fuentes devolvió. A mano: Actions → Sondear búsqueda.
// Costo: un pedido por clave. Nunca imprime la clave.
import { leerVariable, MODELO_DE_TEXTO } from '../reels/claves.mjs';

const PREGUNTA = '¿La bióloga argentina Pilar Ferrer desarrolló un gel inyectable para reparar el corazón después de un infarto? Contestá en dos frases y decí qué medios lo cubrieron.';

for (const nombre of ['GEMINI_API_KEY_CLASIFICACION', 'GEMINI_API_KEY_REDACCION']) {
  const clave = leerVariable(nombre);
  if (!clave) { console.log(`${nombre}: no está`); continue; }
  for (const herramienta of ['google_search', 'google_search_retrieval']) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_DE_TEXTO}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
      body: JSON.stringify({ contents: [{ parts: [{ text: PREGUNTA }] }], tools: [{ [herramienta]: {} }] }),
    });
    const j = await res.json().catch(() => ({}));
    const c = j.candidates?.[0];
    const fuentes = c?.groundingMetadata?.groundingChunks?.length ?? 0;
    const cupo = res.headers.get('x-ratelimit-remaining-requests');
    console.log(`${nombre} · ${herramienta}: HTTP ${res.status}, ${fuentes} fuentes${cupo ? `, cupo ${cupo}` : ''}`);
    if (!res.ok) console.log(`   ${JSON.stringify(j.error ?? j).slice(0, 260)}`);
    else {
      console.log(`   ${String(c?.content?.parts?.map((p) => p.text).join('') ?? '').replace(/\s+/g, ' ').slice(0, 300)}`);
      for (const g of (c?.groundingMetadata?.groundingChunks ?? []).slice(0, 5)) console.log(`   · ${g.web?.title ?? ''}`);
    }
  }
}
