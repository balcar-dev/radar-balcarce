// La imagen de la nota destacada de una sección o de un tema. Aparte de
// piezas.js, que no lleva ninguna imagen: sólo dibujos propios.

import { PlacaSeccion } from '@/components/piezas';

/**
 * Lo que va arriba de la nota destacada de una sección o de un tema: su foto
 * del banco propio, con el crédito debajo (nunca adentro de la imagen), o si
 * no hay, la placa de su sección (29/09; hasta ese día, siempre la placa).
 */
export function ImagenDestacada({ nota }) {
  if (!nota?.foto?.archivo) return <PlacaSeccion seccion={nota?.seccion} />;
  return (
    <figure style={{ margin: 0 }}>
      <img src={`/${nota.foto.archivo}`} alt="" width={1200} height={675} decoding="async" className="foto-destacada" />
    </figure>
  );
}
