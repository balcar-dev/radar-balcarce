// El sobre cifrado del panel del celular (29/09).
//
// El repositorio es público, y lo que espera a una persona puede nombrar a un
// acusado o a un chico: eso no puede quedar a la vista en web/data/ (leyes
// 26.061 y 26.485; por lo mismo portada.json lleva esas notas sin titular).
// Así que lo que el celular necesita para decidir viaja cifrado para cada
// celular registrado, y sólo ese celular lo puede abrir:
//
//   · cada celular genera su par de llaves la primera vez que se entra al
//     panel (web/public/panel/cifrado.js, con la criptografía del navegador) y
//     sube SÓLO la pública a web/data/celular-llaves.json; la privada no sale
//     nunca del celular;
//   · acá se arma una llave nueva al azar para cada sobre (AES-256-GCM), se
//     cifra el contenido con ella, y esa llave se cifra a su vez con la
//     pública de cada celular (RSA-OAEP con SHA-256).
//
// Es lo mismo que hace el correo cifrado. Sin dependencias: sólo node:crypto.
// El otro lado, el que abre el sobre, es web/public/panel/cifrado.js; la
// prueba (pruebas/celular.test.mjs) cierra acá y abre allá.

import crypto from 'node:crypto';

/** Cuántos celulares pueden estar registrados a la vez, como mucho. */
export const LLAVES_MAXIMAS = 6;

/** La huella de una llave pública: 16 caracteres que la identifican. */
export function huellaDe(publica) {
  return crypto.createHash('sha256').update(Buffer.from(String(publica), 'base64')).digest('base64url').slice(0, 16);
}

/**
 * Las llaves de web/data/celular-llaves.json, las válidas: { huella, nombre,
 * publica, alta }. Una que no se puede leer como llave pública RSA se saltea
 * (no rompe el resto). Sin archivo, ninguna.
 */
export function leerLlaves(json) {
  const lista = Array.isArray(json?.llaves) ? json.llaves : [];
  const vistas = new Set();
  const salida = [];
  for (const l of lista) {
    const publica = String(l?.publica ?? '').trim();
    if (!publica) continue;
    try {
      const llave = crypto.createPublicKey({ key: Buffer.from(publica, 'base64'), format: 'der', type: 'spki' });
      if (llave.asymmetricKeyType !== 'rsa') continue;
    } catch {
      continue;
    }
    const huella = huellaDe(publica);
    if (vistas.has(huella)) continue;
    vistas.add(huella);
    salida.push({ huella, nombre: String(l.nombre ?? '').slice(0, 40), publica, alta: l.alta ?? null });
  }
  return salida.slice(-LLAVES_MAXIMAS);
}

/**
 * Cierra `contenido` (cualquier cosa que se pueda pasar a JSON) para las
 * `llaves` dadas. Devuelve el sobre: { version, para: [{ llave, clave }], iv,
 * datos }, todo en base64. Sin llaves, un sobre vacío (nadie lo puede abrir).
 */
export function cerrar(contenido, llaves = []) {
  if (!llaves.length) return { version: 1, para: [], iv: null, datos: null };
  const clave = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave, iv);
  // WebCrypto espera la etiqueta de autenticación pegada al final del texto cifrado.
  const datos = Buffer.concat([cifrador.update(JSON.stringify(contenido), 'utf8'), cifrador.final(), cifrador.getAuthTag()]);
  const para = llaves.map((l) => ({
    llave: l.huella,
    clave: crypto.publicEncrypt({
      key: crypto.createPublicKey({ key: Buffer.from(l.publica, 'base64'), format: 'der', type: 'spki' }),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    }, clave).toString('base64'),
  }));
  return { version: 1, para, iv: iv.toString('base64'), datos: datos.toString('base64') };
}

/**
 * Abre un sobre con una llave privada de Node (sólo para las pruebas: en la
 * vida real lo abre el celular). Devuelve el contenido o null.
 */
export function abrir(sobre, { huella, privada }) {
  const mio = sobre?.para?.find((p) => p.llave === huella);
  if (!mio || !sobre.iv || !sobre.datos) return null;
  const clave = crypto.privateDecrypt({ key: privada, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(mio.clave, 'base64'));
  const todo = Buffer.from(sobre.datos, 'base64');
  const descifrador = crypto.createDecipheriv('aes-256-gcm', clave, Buffer.from(sobre.iv, 'base64'));
  descifrador.setAuthTag(todo.subarray(todo.length - 16));
  const claro = Buffer.concat([descifrador.update(todo.subarray(0, todo.length - 16)), descifrador.final()]);
  return JSON.parse(claro.toString('utf8'));
}

/**
 * Como `cerrar`, pero si el contenido y las llaves son los mismos que la vez
 * anterior devuelve el sobre anterior tal cual. Sin esto, cada corrida (una
 * cada media hora) cambiaría el archivo aunque no hubiera nada nuevo, y el
 * repositorio crecería con un commit cifrado por vuelta. `huellaDatos` es un
 * resumen (SHA-256) del contenido y de las llaves: dice si cambió, no qué dice.
 */
export function cerrarSiCambio(contenido, llaves = [], anterior = null) {
  const huellaDatos = crypto.createHash('sha256')
    .update(JSON.stringify(contenido)).update('|').update(llaves.map((l) => l.huella).join(','))
    .digest('base64url').slice(0, 22);
  if (anterior?.huellaDatos === huellaDatos && anterior?.version === 1) return { sobre: anterior, cambio: false };
  return { sobre: { ...cerrar(contenido, llaves), huellaDatos }, cambio: true };
}

/**
 * Un sobre por nota (29/09): { id: contenido } → { sobres: { id: sobre }, cambio }.
 * Cada nota que no cambió conserva su sobre de la vez anterior, así el archivo
 * cambia sólo en las notas nuevas o cambiadas, y git guarda nada más que eso (con
 * un solo sobre para toda la lista, cualquier cambio reescribía todo el texto
 * cifrado). `cambio` dice si algo es distinto de la vez anterior, también si se
 * fue una nota.
 */
export function cerrarCadaUno(items = {}, llaves = [], anteriores = {}) {
  const sobres = {};
  let cambio = Object.keys(anteriores ?? {}).some((id) => !(id in items));
  for (const [id, contenido] of Object.entries(items)) {
    const r = cerrarSiCambio(contenido, llaves, anteriores?.[id]);
    sobres[id] = r.sobre;
    if (r.cambio) cambio = true;
  }
  return { sobres, cambio };
}
