// Los tres espacios de publicidad de la web (ver REDES.md § 2).
//
// Va aparte de servidor.mjs para poder probarlo: recibe lo que hay y lo que
// se pidió, y devuelve lo que queda. No toca archivos.

export const SLOTS_AVISOS = ['apertura', 'clima', 'pie'];

/**
 * Carga o borra un aviso. Un nombre vacío borra el aviso de ese espacio, que
 * vuelve a no mostrar nada. Devuelve una copia: no modifica `avisos`.
 */
export function aplicarAviso(avisos, { slot, nombre, texto, logo }) {
  if (!SLOTS_AVISOS.includes(slot)) throw new Error('ese espacio no existe');
  const limpio = String(nombre ?? '').trim();
  return {
    ...avisos,
    [slot]: limpio
      ? { nombre: limpio, texto: String(texto ?? '').trim(), logo: String(logo ?? '').trim() || undefined }
      : null,
  };
}
