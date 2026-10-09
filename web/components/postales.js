// Las "postales" (1/10/2026, Hernán eligió este estilo entre cuatro maquetas): las cinco notas
// de arriba de la portada y de cada sección, como fotos con borde blanco, apenas torcidas y con
// una cinta, sobre un tablero crema. Ninguna es "la principal": son cinco parejas.
//
// La foto es la del banco propio; si la nota no tiene, la placa de su sección. El crédito NO va acá
// (4/10, Hernán: "la fuente de las fotos no tiene que salir en las portadas, sólo adentro de la nota"):
// va en el epígrafe de la nota (y nunca adentro de la imagen).

import { Etiqueta, Hace, PlacaSeccion } from '@/components/piezas';
import { fechaCorta } from '@/lib/tiempo';
import { urlDeFoto } from '@/lib/fotos';

const HORAS_DE_HACE = 36;

/** "hace 3 h" mientras es reciente; pasadas las 36 horas, la fecha exacta (no cambia). */
export function CuandoNota({ nota, className = 'meta' }) {
  const ms = new Date(nota.fecha).getTime();
  if (Number.isFinite(ms) && Date.now() - ms > HORAS_DE_HACE * 3600 * 1000) {
    return <time className={className} dateTime={new Date(ms).toISOString()}>{fechaCorta(nota.fecha)}</time>;
  }
  return <Hace nota={nota} className={className} />;
}

function Postal({ nota, indice }) {
  const foto = nota.foto?.archivo ? nota.foto : null;
  return (
    <article className={`postal postal-${indice + 1}`}>
      <div className="postal-marco">
        <a href={nota.ruta} className="postal-foto" tabIndex={-1} aria-hidden="true">
          {foto
            ? <img src={urlDeFoto(foto.archivo)} alt="" width={1200} height={900} decoding="async" loading={indice < 2 ? undefined : 'lazy'} fetchPriority={indice === 0 ? 'high' : undefined} />
            : <PlacaSeccion seccion={nota.seccion} chica />}
        </a>
        <div className="chapa-nota postal-chapa">
          <Etiqueta seccion={nota.seccion} />
          <CuandoNota nota={nota} />
        </div>
        <h3><a href={nota.ruta}>{nota.titulo}</a></h3>
      </div>
    </article>
  );
}

/** Hasta cinco notas: tres arriba y dos abajo, un poco más anchas. */
export function Postales({ notas = [] }) {
  const lista = notas.filter(Boolean).slice(0, 5);
  if (!lista.length) return null;
  return (
    <div className="postales" data-n={lista.length}>
      {lista.map((n, i) => <Postal nota={n} indice={i} key={n.id} />)}
    </div>
  );
}

/** Una fila de lista con una miniatura (foto o color de la sección) a la izquierda. */
export function FilaConMiniatura({ nota }) {
  const foto = nota.foto?.archivo ? nota.foto : null;
  return (
    <div className="fila-nota fila-miniatura">
      <a href={nota.ruta} className="miniatura" tabIndex={-1} aria-hidden="true">
        {foto ? <img src={urlDeFoto(foto.archivo)} alt="" width={240} height={180} loading="lazy" decoding="async" /> : <span className="sin-foto" />}
      </a>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div className="chapa-nota"><Etiqueta seccion={nota.seccion} /><CuandoNota nota={nota} /></div>
        <h3><a href={nota.ruta}>{nota.titulo}</a></h3>
      </div>
    </div>
  );
}
