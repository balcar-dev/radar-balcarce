// El lado del celular del sobre cifrado (el otro lado es panel/cifrado.mjs).
//
// Cada celular tiene su par de llaves: la privada se crea acá, NO se puede
// exportar (ni siquiera este código puede leerla) y queda guardada en el
// navegador; la pública se sube a web/data/celular-llaves.json. Lo que llega
// cifrado para este celular sólo se abre con su privada.
//
// Sólo usa la criptografía que trae el navegador (Web Crypto). Es un módulo sin
// nada del DOM para poder probarlo con Node (pruebas/celular.test.mjs).

const sutil = () => globalThis.crypto.subtle;

const aBase64 = (bytes) => {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 1) s += String.fromCharCode(b[i]);
  return btoa(s);
};
const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

/** La huella de una llave pública (base64 de su forma SPKI): igual que huellaDe en panel/cifrado.mjs. */
export async function huellaDe(publica) {
  const resumen = new Uint8Array(await sutil().digest('SHA-256', deBase64(publica)));
  return aBase64(resumen).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 16);
}

/** Un par de llaves nuevo: { privada (CryptoKey, no exportable), publica (base64), huella }. */
export async function crearLlaves() {
  const par = await sutil().generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    false,
    ['encrypt', 'decrypt'],
  );
  const publica = aBase64(await sutil().exportKey('spki', par.publicKey));
  return { privada: par.privateKey, publica, huella: await huellaDe(publica) };
}

/**
 * Abre un sobre ({ para, iv, datos }) con la llave de este celular. Devuelve el
 * contenido, o null si el sobre no es para este celular (todavía no se volvió a
 * armar desde que se registró) o no se pudo abrir.
 */
export async function abrir(sobre, { privada, huella }) {
  const mio = sobre?.para?.find((p) => p.llave === huella);
  if (!mio || !sobre.iv || !sobre.datos) return null;
  try {
    const cruda = await sutil().decrypt({ name: 'RSA-OAEP' }, privada, deBase64(mio.clave));
    const clave = await sutil().importKey('raw', cruda, 'AES-GCM', false, ['decrypt']);
    const claro = await sutil().decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv) }, clave, deBase64(sobre.datos));
    return JSON.parse(new TextDecoder().decode(claro));
  } catch {
    return null;
  }
}

/**
 * Cierra un contenido para varios celulares (el otro lado de `abrir`; el formato es el mismo que `cerrar` de panel/cifrado.mjs): una clave
 * AES-GCM al azar cifra el texto y se guarda una copia de esa clave, cifrada con la llave pública de cada celular. `llaves`: [{ huella, publica }].
 * Devuelve el sobre, o null si no hay a quién cifrárselo.
 */
export async function cerrar(contenido, llaves = []) {
  if (!llaves.length) return null;
  const clave = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aes = await sutil().importKey('raw', clave, 'AES-GCM', false, ['encrypt']);
  const datos = await sutil().encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(JSON.stringify(contenido)));
  const para = await Promise.all(llaves.map(async (l) => {
    const publica = await sutil().importKey('spki', deBase64(l.publica), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    return { llave: l.huella, clave: aBase64(await sutil().encrypt({ name: 'RSA-OAEP' }, publica, clave)) };
  }));
  return { version: 1, para, iv: aBase64(iv), datos: aBase64(datos) };
}
