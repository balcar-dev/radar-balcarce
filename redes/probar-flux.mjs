// Prueba a mano la generación de imágenes con Workers AI de Cloudflare (16/10/2026): el modelo flux-1-schnell, que entra en las 10.000
// «neuronas» diarias gratis del plan Workers que ya pagamos (docs: developers.cloudflare.com/workers-ai/platform/pricing). Sin dependencias.
// Usa CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN del entorno (jamás se imprimen) y guarda las imágenes en la carpeta que diga SALIDA.
import fs from 'node:fs';
import path from 'node:path';

const cuenta = (process.env.CLOUDFLARE_ACCOUNT_ID ?? '').trim();
const token = (process.env.CLOUDFLARE_API_TOKEN ?? '').trim();
const salida = process.env.SALIDA || 'salida-flux';
if (!cuenta || !token) { console.log('Faltan CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN.'); process.exit(0); }
fs.mkdirSync(salida, { recursive: true });

const PEDIDOS = [
  ['tractor', 'Fotografía realista de un tractor sembrando en un campo de la pampa bonaerense al atardecer, luz cálida, sin personas, sin texto, sin logos, estilo fotoperiodístico'],
  ['festival', 'Fotografía realista de un escenario al aire libre en una plaza de ciudad bonaerense preparado para un festival cultural, banderines y luces, sin personas visibles, sin texto, sin logos, estilo fotoperiodístico'],
  ['clima', 'Fotografía realista de nubes de tormenta sobre un campo llano de la provincia de Buenos Aires, sin personas, sin texto, estilo fotoperiodístico'],
];
for (const [nombre, prompt] of PEDIDOS) {
  const t0 = Date.now();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cuenta}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, steps: 6 }),
    signal: AbortSignal.timeout(120_000),
  });
  const texto = await res.text();
  let json = null; try { json = JSON.parse(texto); } catch { /* */ }
  const b64 = json?.result?.image;
  if (res.status === 200 && b64) {
    const bytes = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(salida, `${nombre}.jpg`), bytes);
    console.log(`[${nombre}] HTTP 200, imagen de ${bytes.length} bytes en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  } else {
    console.log(`[${nombre}] HTTP ${res.status}: ${texto.replace(/\s+/g, ' ').replace(token, '«token»').slice(0, 300)}`);
  }
}
