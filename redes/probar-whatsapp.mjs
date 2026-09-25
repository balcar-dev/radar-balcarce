// Manda un WhatsApp de prueba y muestra EXACTAMENTE lo que contestó CallMeBot
// (sin la clave ni el teléfono). Sirve para saber si los avisos llegan de verdad.
//   node redes/probar-whatsapp.mjs        (con WHATSAPP_TELEFONO y WHATSAPP_APIKEY)
import { sinSecretos } from './whatsapp.mjs';

const telefono = String(process.env.WHATSAPP_TELEFONO ?? '').replace(/[^\d]/g, '');
const apikey = process.env.WHATSAPP_APIKEY ?? '';
if (!telefono || !apikey) { console.log('Faltan WHATSAPP_TELEFONO o WHATSAPP_APIKEY.'); process.exit(1); }
console.log(`Teléfono: ${telefono.length} dígitos, empieza con ${telefono.slice(0, 3)}…; clave: ${apikey.length} caracteres.`);

const texto = 'Prueba de Radar Balcarce: si lees esto, los avisos funcionan.';
const url = `https://api.callmebot.com/whatsapp.php?phone=${telefono}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
const cuerpo = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
console.log(`HTTP ${r.status}`);
console.log(sinSecretos(cuerpo, apikey, telefono).slice(0, 800));
