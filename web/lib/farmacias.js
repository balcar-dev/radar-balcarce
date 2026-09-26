// Datos de las farmacias para la pantalla: el teléfono para llamar con un toque.
//
// Los del Colegio vienen como se dicen en el pueblo: "42-2106" (fijo, sin el
// código de área) o "15-677121" (celular, con el 15). Desde un celular hay que
// marcarlos completos, así que el enlace `tel:` los lleva en formato
// internacional. Sin imports: se prueba sin red.

const AREA_BALCARCE = '2266';

/** El enlace `tel:` de un teléfono de Balcarce, o null si no se entiende. */
export function enlaceDeLlamada(telefono) {
  const t = String(telefono ?? '').trim();
  if (!t) return null;
  const n = t.replace(/\D/g, '');
  if (n.length === 6) return `tel:+54${AREA_BALCARCE}${n}`; // fijo local
  if (n.length === 8 && n.startsWith('15')) return `tel:+549${AREA_BALCARCE}${n.slice(2)}`; // celular local
  if (n.length === 10 && n.startsWith(AREA_BALCARCE)) return `tel:+54${n}`; // fijo con área
  if (n.length === 13 && n.startsWith('549')) return `tel:+${n}`;
  return null;
}
