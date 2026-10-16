// Prueba a mano (16/10/2026) del flujo «nota → prompt de imagen → imagen» con el prompt de bodegón sin personas que armó Hernán:
//   1) Gemini (clave de redacción, gratis) lee la nota entera (título + cuerpo) y escribe un prompt corto en inglés para el generador;
//   2) el Worker de imágenes (infra/imagenes-cloudflare, flux-1-schnell, dentro de las neuronas gratis) genera la imagen.
// Sin dependencias. Variables: GEMINI_API_KEY_REDACCION, VIGILANTE_TOKEN (contraseña del Worker), SALIDA. Las claves jamás se imprimen.
import fs from 'node:fs';
import path from 'node:path';

const gemini = (process.env.GEMINI_API_KEY_REDACCION ?? '').trim();
const token = (process.env.VIGILANTE_TOKEN ?? '').trim();
const salida = process.env.SALIDA || 'salida-notas';
if (!gemini || !token) { console.log('Faltan GEMINI_API_KEY_REDACCION o VIGILANTE_TOKEN.'); process.exit(0); }
fs.mkdirSync(salida, { recursive: true });

const PROMPT_DE_HERNAN = `Generá una imagen fotoperiodística y conceptual para ilustrar la nota periodística que te dejo abajo. Requisitos importantes:
1. No debe aparecer ninguna persona en la imagen (completamente sin gente) para evitar confusiones de identidad.
2. Debe ser un plano detalle o bodegón natural y espontáneo de los objetos y herramientas típicos de la actividad o profesión de la que habla la nota.
3. Los objetos deben estar sobre una superficie de trabajo (mesa, escritorio, etc.) y mostrar desgaste por uso.
4. Evitá por completo mostrar logotipos oficiales, escudos, marcas o textos institucionales específicos. Si hay carteles, folletos o documentos, que tengan un diseño genérico, desenfocado o meramente de texto simple, o solo colores y formas abstractas sin emblemas.
5. El fondo debe estar muy desenfocado (efecto bokeh) pero debe sugerir el lugar donde transcurren los hechos.
6. La foto debe ser natural, con luz real (de archivo de diario), de aspecto cotidiano y sin retoques digitales exagerados.`;

const AZUL = {
  id: 'azul',
  titulo: 'El Festival Cervantino de Azul cumple 20 años con más de 50 actividades',
  cuerpo: 'Del 23 de octubre al 1 de noviembre, la ciudad bonaerense de Azul reúne teatro, música, muestras, conferencias y presentaciones editoriales; abre el Sindicato Argentino de Boleros y cierra Teresa Parodi. La ciudad será sede de la 20.ª edición del Festival Cervantino de la Argentina, con obras de teatro, exhibiciones de artes visuales, conferencias académicas, presentaciones editoriales y conciertos en vivo en el Teatro Español, la Casa Ronco y el Museo López Claro. Azul fue declarada Ciudad Cervantina en 2007 a partir de la colección de «Don Quijote de la Mancha» del Dr. Bartolomé J. Ronco.',
};

function notasDelSitio() {
  try {
    const p = JSON.parse(fs.readFileSync('web/data/portada.json', 'utf8'));
    const lista = Array.isArray(p) ? p : (p.notas ?? []);
    const elegir = (sec) => lista.find((n) => n.seccion === sec && String(n.cuerpo ?? '').length > 300);
    return [elegir('Agro'), elegir('Balcarce')].filter(Boolean).map((n) => ({ id: n.id, titulo: n.titulo, cuerpo: String(n.cuerpo).slice(0, 1500) }));
  } catch { return []; }
}

async function promptDeImagen(nota) {
  const instruccion = `${PROMPT_DE_HERNAN}\n\nTu salida NO es la imagen: es el PROMPT para un generador de imágenes (FLUX), escrito en INGLÉS, de 50 a 80 palabras, en una sola línea, que describa esa foto cumpliendo los requisitos de arriba (empezá por «Candid photojournalistic close-up still life of…», incluí «no people, no text, no logos» y la luz). Respondé SOLO con el prompt.\n\nNota:\n${nota.titulo}\n\n${nota.cuerpo}`;
  if (process.env.MOSTRAR_PEDIDO) console.log(['--- PEDIDO COMPLETO A GEMINI ---', instruccion, '--- FIN DEL PEDIDO ---'].join(String.fromCharCode(10)));
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent', {
    method: 'POST', headers: { 'x-goog-api-key': gemini, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: instruccion }] }] }), signal: AbortSignal.timeout(60_000),
  });
  const j = await r.json().catch(() => null);
  const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (r.status !== 200 || !t) throw new Error(`Gemini HTTP ${r.status}`);
  return t.replace(/\s+/g, ' ').trim().slice(0, 690);
}

// Con NOTA_ID se usa esa nota del sitio (título + cuerpo ENTERO) en lugar de las de ejemplo.
function notaPorId(id) {
  for (const archivo of ['web/data/archivo.json', 'web/data/portada.json']) {
    try {
      const j = JSON.parse(fs.readFileSync(archivo, 'utf8'));
      const lista = Array.isArray(j) ? j : (j.notas ? (Array.isArray(j.notas) ? j.notas : Object.values(j.notas)) : Object.values(j));
      const n = lista.find((x) => x?.id === id);
      if (n) return { id: n.id, titulo: n.titulo, cuerpo: [n.copete, n.cuerpo].filter(Boolean).join(String.fromCharCode(10, 10)).slice(0, 6000) };
    } catch { /* sigue */ }
  }
  return null;
}
const NOTA_ID = (process.env.NOTA_ID ?? '').trim();
const lista = NOTA_ID ? [notaPorId(NOTA_ID)].filter(Boolean) : [AZUL, ...notasDelSitio()];
if (NOTA_ID && !lista.length) console.log('No encontré la nota ' + NOTA_ID);

for (const nota of lista) {
  try {
    const prompt = await promptDeImagen(nota);
    console.log(`[${nota.id}] «${nota.titulo.slice(0, 70)}»\n    prompt: ${prompt}`);
    const res = await fetch('https://radar-balcarce-imagenes.radarbalcarce.workers.dev/generar', {
      method: 'POST', headers: { 'x-token': token, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 6 }), signal: AbortSignal.timeout(120_000),
    });
    if (res.status !== 200) { console.log(`    imagen: HTTP ${res.status}`); continue; }
    const bytes = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(salida, `${nota.id}.jpg`), bytes);
    console.log(`    imagen: ${bytes.length} bytes`);
  } catch (e) { console.log(`[${nota.id}] falló: ${String(e?.message ?? e).slice(0, 200)}`); }
}
