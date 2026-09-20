// Las piezas que se repiten en más de una página: el dibujo del clima, la
// tarjeta de la farmacia, la etiqueta de sección, la fila de nota.
//
// Son componentes de servidor a propósito: no hay estado ni eventos, la
// animación es CSS puro (globals.css). Así la web sigue siendo HTML
// estático que Vercel sirve sin ejecutar nada.

import {
  datosSeccion, nombreCorto, cuando, partirFecha, whatsapp, MAIL, WHATSAPP,
} from '@/lib/datos';
import { tipoDeCielo } from '@/lib/clima';
import { comoNombre } from '@/lib/texto';

const WHATSAPP_VISIBLE = WHATSAPP.visible;

// --------------------------------------------------------------- el clima
//
// La tarjeta del clima se mudó a clima-vivo.js, que corre en el navegador y
// se actualiza sola cada diez minutos. Acá queda sólo el sol chiquito de la
// chapa de arriba, que es decorativo y no muestra ningún dato.

/** El sol chiquito de la chapa de arriba: siempre el mismo, para que la
 *  pastilla no cambie de ancho cada vez que cambia el pronóstico. */
/** El dibujito de la barra de arriba. Chico y sin detalle: ahí se ve a
 *  veinte píxeles. Pero tiene que decir la verdad — antes sólo sabía si era
 *  de día o de noche, así que a las dos de la tarde con chaparrones mostraba
 *  un sol radiante mientras la tarjeta de abajo dibujaba lluvia. */
export function SolChico({ cielo = '', esDeDia = true }) {
  const tipo = tipoDeCielo(cielo, esDeDia);

  if (tipo === 'lluvia') {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M13 27a7 7 0 0 1 1-13.7 10 10 0 0 1 19 2.6A6 6 0 0 1 32 27z" fill="#C8D4DB" />
        <g stroke="#7FBCE8" strokeWidth="3" strokeLinecap="round">
          <path className="gota" d="M17 32v5" />
          <path className="gota gota-2" d="M24 32v5" />
          <path className="gota gota-3" d="M31 32v5" />
        </g>
      </svg>
    );
  }

  if (tipo === 'cubierto') {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M13 32a7 7 0 0 1 1-13.7 10 10 0 0 1 19 2.6A6 6 0 0 1 32 32z" fill="#C8D4DB" />
      </svg>
    );
  }

  if (tipo === 'nube' || tipo === 'luna-nube') {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        {esDeDia
          ? <circle cx="32" cy="15" r="7" fill="#E8A33C" />
          : (
            <>
              <mask id="gajo-nube">
                <rect width="48" height="48" fill="#fff" />
                <circle cx="37" cy="10" r="6" fill="#000" />
              </mask>
              <circle cx="32" cy="14" r="7" fill="#E8D08C" mask="url(#gajo-nube)" />
            </>
          )}
        <path d="M13 32a7 7 0 0 1 1-13.7 10 10 0 0 1 19 2.6A6 6 0 0 1 32 32z" fill="#E7EDF0" />
      </svg>
    );
  }

  if (tipo === 'luna') {
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

export function TarjetaFarmacia({ farmacia, conBotones = true }) {
  if (!farmacia) return null;

  // Cuando hay dos farmacias de turno se muestran las DOS, cada una con su
  // dirección. Antes se mostraban los dos nombres juntos y una sola
  // dirección debajo, así que parecía una sola farmacia con nombre largo —
  // y el que iba a la dirección equivocada se encontraba con la persiana
  // baja.
  const lista = farmacia.detalle?.length
    ? farmacia.detalle
    : (farmacia.farmacias ?? []).map((n) => ({ nombre: n }));

  const mapaDe = (direccion) => (direccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${direccion}, Balcarce, Buenos Aires`)}`
    : null);

  return (
    <div className="tarjeta">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="punto-vivo" />
        <span className="meta">
          {lista.length > 1 ? 'Farmacias de turno · hoy' : 'Farmacia de turno · hoy'}
        </span>
      </div>

      {lista.map((f, i) => {
        const mapa = mapaDe(f.direccion);
        return (
          <div className="una-farmacia" key={f.nombre ?? i}>
            <div className="nombre-farmacia">{comoNombre(f.nombre)}</div>
            {f.direccion
              ? (
                <div className="donde-farmacia">
                  {f.direccion}{f.telefono ? ` · Tel. ${f.telefono}` : ''}
                </div>
              )
              : <div className="donde-farmacia sin-dato">Dirección no publicada</div>}
            {conBotones && mapa && (
              <a href={mapa} target="_blank" rel="noopener noreferrer" className="boton tinta chico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                Cómo llegar
              </a>
            )}
          </div>
        );
      })}

      {conBotones && (
        <a href="/farmacias" className="boton borde ancho" style={{ marginTop: 14 }}>
          Ver la semana
        </a>
      )}
    </div>
  );
}

/** "SAN JOSE PLAZA" en mayúsculas grita. Se pasa a mayúscula inicial, que es
 *  como se escribe el nombre de un comercio. */


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

// ------------------------------------------------- el final de cada página
//
// Todas las páginas internas terminan igual, en este orden:
//
//   1. una línea, y los botones: "← Portada" primero, después dos atajos
//      a las páginas hermanas que tengan sentido desde donde estás;
//   2. una tarjeta que invita a escribirnos, con el pedido que corresponde
//      a esa página;
//   3. si el dato viene de algún lado, una línea diciendo de dónde.
//
// Antes cada página terminaba a su manera — una con "Volver a la portada",
// otra con "Portada", una con tarjeta y otra sin — y eso hace que el sitio
// se sienta armado por partes.

export function Cierre({ enlaces = [], children, fuente = null }) {
  return (
    <section className="cierre-pagina">
      <div className="botonera">
        <a href="/" className="boton borde">← Portada</a>
        {enlaces.map((e) => (
          <a key={e.href} href={e.href} className="boton borde">{e.texto}</a>
        ))}
      </div>
      {children}
      {fuente && <p className="nota-fuente">{fuente}</p>}
    </section>
  );
}

/** La tarjeta de invitación. Siempre igual: título, una línea que explica
 *  qué esperamos, y un botón. Cambia el pedido, no la forma.
 *
 *  El botón es WhatsApp, no mail: es donde la gente ya está, y el mensaje va
 *  escrito de antemano para que no tenga que explicar de dónde viene. El
 *  mail queda abajo, chiquito, para quien lo prefiera. */
export function Invitacion({ titulo, texto, boton, asunto, mensaje }) {
  return (
    <div className="tarjeta-buzon">
      <h3 style={{ fontSize: 19, fontWeight: 700 }}>{titulo}</h3>
      <p>{texto}</p>
      <a href={whatsapp(mensaje ?? asunto)} className="boton rojo ancho" target="_blank" rel="noopener noreferrer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.08c-.24.68-1.42 1.31-1.96 1.36-.5.05-.97.23-3.27-.68-2.75-1.08-4.5-3.9-4.64-4.08-.14-.18-1.11-1.48-1.11-2.82s.7-2 .95-2.27c.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.23.54.77 1.88.84 2.02.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.57.16.27.71 1.17 1.52 1.9 1.04.93 1.92 1.21 2.19 1.35.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.58.75 1.85.88.27.14.45.2.52.32.07.11.07.66-.17 1.34z" />
        </svg>
        {boton}
      </a>
      <p className="o-por-mail">
        o por mail a <a href={`mailto:${MAIL}?subject=${encodeURIComponent(asunto)}`}>{MAIL}</a>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ buzón

export function TarjetaBuzon() {
  return (
    <div className="tarjeta-buzon" id="buzon">
      <h3 style={{ fontSize: 19, fontWeight: 700 }}>¿Viste algo en el barrio?</h3>
      <p>
        Mandanos la foto o el dato por WhatsApp. Lo chequeamos antes de publicarlo
        y, si lo pedís, no ponemos tu nombre.
      </p>
      <a href={whatsapp('Hola, tengo un dato para Radar Balcarce:')} className="boton rojo ancho" target="_blank" rel="noopener noreferrer">
        Escribirnos por WhatsApp
      </a>
      <p className="o-por-mail">
        {WHATSAPP_VISIBLE} · o por mail a <a href={`mailto:${MAIL}`}>{MAIL}</a>
      </p>
    </div>
  );
}
