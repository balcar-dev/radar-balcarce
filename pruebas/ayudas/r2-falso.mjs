// Un R2 de mentira en memoria con la misma cara que `clienteR2` (infra/compartido/r2-s3.mjs): para probar sin red lo que guarda la vuelta del motor.
export function r2Falso({ fallar = {} } = {}) {
  const objetos = new Map();
  const registro = [];
  const bytes = (x) => (typeof x === 'string' ? new TextEncoder().encode(x) : new Uint8Array(x));
  const cliente = {
    host: 'falso.r2.cloudflarestorage.com',
    async leer(clave) {
      registro.push(['leer', clave]);
      if (fallar.leer) throw new Error('R2 leer: HTTP 500');
      return objetos.has(clave) ? objetos.get(clave) : null;
    },
    async leerTexto(clave) { const b = await this.leer(clave); return b === null ? null : new TextDecoder().decode(b); },
    async guardar(clave, cuerpo) {
      registro.push(['guardar', clave]);
      if (fallar.guardar) throw new Error('R2 guardar: HTTP 500');
      objetos.set(clave, bytes(cuerpo));
      return true;
    },
    async existe(clave) { return objetos.has(clave); },
    async borrar(clave) { registro.push(['borrar', clave]); objetos.delete(clave); return true; },
    async listar(prefijo = '') { return [...objetos.keys()].filter((k) => k.startsWith(prefijo)).sort(); },
    async firmar(clave, { metodo = 'GET', expira = 3600 } = {}) { return `https://falso.r2.cloudflarestorage.com/${clave}?metodo=${metodo}&expira=${expira}&X-Amz-Signature=firmada`; },
  };
  return { cliente, objetos, registro, texto: (clave) => (objetos.has(clave) ? new TextDecoder().decode(objetos.get(clave)) : null) };
}

/** Un R2 de mentira con la cara de un binding de Worker (`env.MOTOR.get/put/list/delete`). */
export function bindingR2Falso(inicial = {}) {
  const objetos = new Map(Object.entries(inicial).map(([k, v]) => [k, typeof v === 'string' ? new TextEncoder().encode(v) : v]));
  return {
    objetos,
    async get(clave) {
      if (!objetos.has(clave)) return null;
      const b = objetos.get(clave);
      return { text: async () => new TextDecoder().decode(b), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), size: b.length };
    },
    async put(clave, valor) { objetos.set(clave, typeof valor === 'string' ? new TextEncoder().encode(valor) : new Uint8Array(valor)); },
    async delete(clave) { objetos.delete(clave); },
    async list({ prefix = '' } = {}) { return { objects: [...objetos.keys()].filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key })), truncated: false }; },
  };
}
