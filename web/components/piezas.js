// Las piezas que se repiten en más de una página: el dibujo del clima, la
// tarjeta de la farmacia, la etiqueta de sección, la fila de nota.
//
// Son componentes de servidor a propósito: no hay estado ni eventos, la
// animación es CSS puro (globals.css). Así la web sigue siendo HTML
// estático que Vercel sirve sin ejecutar nada.

import { datosSeccion, nombreCorto, cuando, partirFecha } from '@/lib/datos';

// --------------------------------------------------------------- el clima
//
// La tarjeta del clima se mudó a clima-vivo.js, que corre en el navegador y
// se actualiza sola cada diez minutos. Acá queda sólo el sol chiquito de la
// chapa de arriba, que es decorativo y no muestra ningún dato.

/** El sol chiquito de la chapa de arriba: siempre el mismo, para que la
 *  pastilla no cambie de ancho cada vez que cambia el pronóstico. */
/** El dibujito de la barra de arriba. Chico y sin detalle: en esa barra se
 *  ve a veinte píxeles, así que lo único que tiene que comunicar es si es
 *  de día o de noche. */
export function SolChico({ esDeDia = true }) {
  if (!esDeDia) {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <mask id="gajo-chico">
          <rect width="48" height="48" fill="#fff" />
          <circle cx="31" cy="17" r="11" fill="#000" />
        </mask>
        <circle cx="24" cy="24" r="12" fill="#E8D08C" mask="url(#gajo-chico)" />
      </svg>
    );
  }

  // Los ocho rayos, calculados igual que en la tarjeta grande (clima-vivo.js)
  // para que el sol chiquito y el grande sean el mismo dibujo.
  const rayos = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = Math.cos(a);
    const y = Math.sin(a);
    return `M${(24 + x * 13).toFixed(1)} ${(24 + y * 13).toFixed(1)}L${(24 + x * 18).toFixed(1)} ${(24 + y * 18).toFixed(1)}`;
  }).join('');

  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g className="rayos" stroke="#E8A33C" strokeWidth="3.4" strokeLinecap="round">
        <path d={rayos} />
      </g>
      <circle cx="24" cy="24" r="9" fill="#E8A33C" />
    </svg>
  );
}

// ------------------------------------------------------------- la farmacia

export function TarjetaFarmacia({ farmacia, conBotones = true }) {
  if (!farmacia) return null;
  const nombre = farmacia.farmacias.join(' y ');
  const det = farmacia.detalle?.[0];
  const mapa = det?.direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${det.direccion}, Balcarce, Buenos Aires`)}`
    : null;

  return (
    <div className="tarjeta">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="punto-vivo" />
        <span className="meta">Farmacia de turno · hoy</span>
      </div>
      <div className="nombre-farmacia">{nombre}</div>
      {det?.direccion && (
        <div style={{ fontSize: 13.5, color: 'var(--texto)', marginTop: 5 }}>
          {det.direccion}{det.telefono ? ` · Tel. ${det.telefono}` : ''}
        </div>
      )}
      {conBotones && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <a href="/farmacias" className="boton borde" style={{ flexGrow: 1 }}>Ver la semana</a>
          {mapa && (
            <a href={mapa} target="_blank" rel="noopener noreferrer" className="boton tinta" style={{ flexGrow: 1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              Cómo llegar
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ notas

export function Etiqueta({ seccion }) {
  const s = datosSeccion(seccion);
  return <span className="tag" style={{ background: s.color }}>{nombreCorto(seccion)}</span>;
}

/** La placa que va donde otros ponen la foto del medio de origen. */
export function PlacaSeccion({ seccion }) {
  const s = datosSeccion(seccion);
  return (
    <div className="placa-seccion" style={{ '--color-seccion': s.color }}>
      <span>{nombreCorto(seccion)}</span>
    </div>
  );
}

export function TituloSeccion({ seccion, verTodo = true }) {
  const s = datosSeccion(seccion);
  return (
    <div className="titulo-seccion">
      <span className="barra" style={{ background: s.color }} />
      <h2>{seccion}</h2>
      {/* "Ver todo →" a secas: el nombre de la sección está tres centímetros
          a la izquierda, repetirlo no agrega nada y en el celular obliga a
          que el título se achique para que entren los dos. */}
      {verTodo && <a href={`/seccion/${s.ranura}`} className="ver-todo">Ver todo →</a>}
    </div>
  );
}

export function FilaNota({ nota }) {
  return (
    <div className="fila-nota">
      <span className="meta cuando">{cuando(nota)}</span>
      <div style={{ flexGrow: 1 }}>
        <span className="meta cuando-movil">{cuando(nota)}</span>
        <h3><a href={`/nota/${nota.id}`}>{nota.titulo}</a></h3>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- agenda

export function Evento({ evento }) {
  const f = partirFecha(evento.desde);
  return (
    <div className="evento">
      <div className="taco">
        <div className="mes">{f?.mes ?? ''}</div>
        <div className="dia">{f?.dia ?? '·'}</div>
      </div>
      <div style={{ flexGrow: 1 }}>
        <div className="que">{evento.nombre}</div>
        <div className="donde">
          {f?.hora ? `${f.hora} · ` : ''}{evento.lugar || 'Balcarce'}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ buzón

export function TarjetaBuzon() {
  return (
    <div className="tarjeta-buzon" id="buzon">
      <h3 style={{ fontSize: 19, fontWeight: 700 }}>¿Viste algo en el barrio?</h3>
      <p>
        Mandanos la foto o el dato por correo. Lo chequeamos antes de publicarlo
        y, si lo pedís, no ponemos tu nombre.
      </p>
      <a href="mailto:radarbalcarce@gmail.com?subject=Tengo%20un%20dato%20para%20Radar%20Balcarce" className="boton rojo ancho">
        Escribirnos
      </a>
    </div>
  );
}
