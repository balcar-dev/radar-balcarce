// Las piezas que se repiten en más de una página: el dibujo del clima, la
// tarjeta de la farmacia, la etiqueta de sección, la fila de nota.
//
// Son componentes de servidor a propósito: no hay estado ni eventos, la
// animación es CSS puro (globals.css). Así la web sigue siendo HTML
// estático que Vercel sirve sin ejecutar nada.

import { datosSeccion, nombreCorto, cuando, partirFecha } from '@/lib/datos';

// --------------------------------------------------------------- el clima

/** Decide qué dibujo corresponde al texto del cielo que manda el
 *  pronóstico ("Parcialmente nublado", "Chaparrones fuertes", ...). */
function tipoDeCielo(cielo = '') {
  const t = cielo.toLowerCase();
  if (/lluvia|llovizna|chaparr|tormenta|nieve/.test(t)) return 'lluvia';
  if (/despejado/.test(t) && !/mayormente/.test(t)) return 'sol';
  return 'nube';
}

const FONDO_CIELO = { sol: '#2A6E8C', nube: '#1D4F63', lluvia: '#243D52' };

export function IconoCielo({ cielo, tamano = 92 }) {
  const tipo = tipoDeCielo(cielo);
  const rayos = (
    <g className="rayos" stroke="#E8A33C" strokeWidth="3" strokeLinecap="round" transform="translate(24 6)">
      <path d="M26 5v6M26 41v6M5 26h6M41 26h6M11 11l4.2 4.2M36.8 36.8L41 41M41 11l-4.2 4.2M15.2 36.8L11 41" />
    </g>
  );

  return (
    <svg width={tamano} height={tamano} viewBox="0 0 92 92" fill="none" aria-hidden="true">
      {tipo === 'sol' && (
        <>
          <g className="rayos" stroke="#E8A33C" strokeWidth="3" strokeLinecap="round" transform="translate(20 20)">
            <path d="M26 2v8M26 42v8M2 26h8M42 26h8M9.5 9.5l5.6 5.6M36.9 36.9l5.6 5.6M42.5 9.5l-5.6 5.6M15.1 36.9l-5.6 5.6" />
          </g>
          <circle cx="46" cy="46" r="15" fill="#E8A33C" />
        </>
      )}
      {tipo === 'nube' && (
        <>
          {rayos}
          <circle cx="50" cy="32" r="11" fill="#E8A33C" />
          <g className="nube">
            <path d="M28 66a11 11 0 0 1 1.6-21.9 16 16 0 0 1 30.2 4.2A9.8 9.8 0 0 1 58.5 66z" fill="#E7EDF0" />
          </g>
        </>
      )}
      {tipo === 'lluvia' && (
        <>
          <g className="nube">
            <path d="M25 52a12 12 0 0 1 1.8-23.9 17.5 17.5 0 0 1 33 4.6A10.7 10.7 0 0 1 58 52z" fill="#C8D4DB" />
          </g>
          <g stroke="#7FBCE8" strokeWidth="3.4" strokeLinecap="round">
            <path className="gota" d="M32 60v7" />
            <path className="gota gota-2" d="M44 60v7" />
            <path className="gota gota-3" d="M56 60v7" />
          </g>
        </>
      )}
    </svg>
  );
}

/** El sol chiquito de la chapa de arriba: siempre el mismo, para que la
 *  pastilla no cambie de ancho cada vez que cambia el pronóstico. */
export function SolChico() {
  return (
    <svg width="20" height="20" viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <g className="rayos" stroke="#E8A33C" strokeWidth="3.4" strokeLinecap="round">
        <path d="M26 5v6M26 41v6M5 26h6M41 26h6M11 11l4.2 4.2M36.8 36.8L41 41M41 11l-4.2 4.2M15.2 36.8L11 41" />
      </g>
      <circle cx="26" cy="26" r="10" fill="#E8A33C" />
    </svg>
  );
}

export function TarjetaClima({ clima }) {
  if (!clima?.ahora) return null;
  const a = clima.ahora;
  const dias = (clima.dias ?? []).slice(0, 4);

  return (
    <div className="tarjeta-clima" style={{ '--cielo-fondo': FONDO_CIELO[tipoDeCielo(a.cielo)] }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flexGrow: 1 }}>
          <div className="titulo">El clima ahora</div>
          <div className="temp">{a.temp}°</div>
          <div className="cielo">{a.cielo}</div>
          <div className="detalle">
            Sensación {a.sensacion}° · Viento {a.rumbo} {a.viento} km/h · Humedad {a.humedad}%
          </div>
        </div>
        <div style={{ margin: '-4px -4px 0 0' }}><IconoCielo cielo={a.cielo} /></div>
      </div>

      {dias.length > 0 && (
        <div className="tira-dias">
          {dias.map((d) => (
            <div key={d.fecha}>
              <div className="dia">{d.dia}</div>
              <div className="max">{d.max}°</div>
              {d.lluvia >= 40
                ? <div className="lluvia">{d.lluvia}% lluvia</div>
                : <div className="min">{d.min}°</div>}
            </div>
          ))}
        </div>
      )}
    </div>
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
          <a href="/util" className="boton borde" style={{ flexGrow: 1 }}>Ver la semana</a>
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
      {verTodo && (
        <a href={`/seccion/${s.ranura}`} className="ver-todo">Ver todo {nombreCorto(seccion)} →</a>
      )}
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
