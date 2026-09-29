// Sólo para el modo de prueba (?demo): cierra un sobre en el navegador igual que
// lo cierra GitHub (panel/cifrado.mjs), así la prueba también ejercita abrir().

const aBase64 = (bytes) => {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i += 1) s += String.fromCharCode(b[i]);
  return btoa(s);
};
const deBase64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

export async function cerrarParaPrueba(contenido, { publica, huella }) {
  const sutil = globalThis.crypto.subtle;
  const clave = await sutil.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const datos = await sutil.encrypt({ name: 'AES-GCM', iv }, clave, new TextEncoder().encode(JSON.stringify(contenido)));
  const pub = await sutil.importKey('spki', deBase64(publica), { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const envuelta = await sutil.encrypt({ name: 'RSA-OAEP' }, pub, await sutil.exportKey('raw', clave));
  return { version: 1, para: [{ llave: huella, clave: aBase64(envuelta) }], iv: aBase64(iv), datos: aBase64(datos) };
}
