// Los dos criterios (CRITERIO-EDITORIAL.md y CRITERIO-REDES.md) se leen del disco AL CARGAR los programas del proyecto (ingesta/prompt-editorial.mjs y
// redes/prompt-redes.mjs: «si falta, la IA no escribe»; ver CLAUDE.md). En un Worker no hay disco con el repositorio: los textos viajan adentro del
// paquete (se importan como texto en arranque.mjs) y acá se hace que `fs.readFileSync` los devuelva cuando alguien los pide por su nombre. Nada más
// cambia: los programas siguen leyendo "su" archivo, con las mismas marcas y los mismos controles, y si el texto del paquete estuviera roto fallarían igual.
//
// Pura: recibe el `fs` y los textos. Sin dependencias.

/** Hace que fs.readFileSync(<ruta que termina en el nombre>) devuelva el texto del paquete. Devuelve una función que deshace el cambio. */
export function instalarLecturaDelCriterio(fs, textos) {
  const original = fs.readFileSync;
  fs.readFileSync = function readFileSync(ruta, ...resto) {
    if (typeof ruta === 'string') {
      const nombre = ruta.replace(/\\/g, '/').split('/').pop();
      if (Object.prototype.hasOwnProperty.call(textos, nombre)) {
        const opciones = resto[0];
        const codificacion = typeof opciones === 'string' ? opciones : opciones?.encoding;
        return codificacion ? textos[nombre] : Buffer.from(textos[nombre], 'utf8');
      }
    }
    return original.call(this, ruta, ...resto);
  };
  return () => { fs.readFileSync = original; };
}
