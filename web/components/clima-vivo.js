'use client';

// La tarjeta del clima, en vivo.
//
// El resto del sitio es HTML estático que se regenera cada media hora, y
// para las noticias está bien: media hora no cambia nada. Pero el clima sí
// cambia, y una temperatura de hace veinte minutos en una tarjeta que dice
// "El clima ahora" es directamente mentira.
//
// La solución no es regenerar el sitio entero más seguido — eso serían 144
// compilaciones por día para actualizar un número. Es que la tarjeta se
// actualice sola en el navegador de quien la está mirando, hablando directo
// con Open-Meteo, que es gratis, no pide clave y permite pedidos desde el
// navegador.
//
// El dato que vino del servidor se muestra igual al entrar, así que la
// tarjeta se ve completa desde el primer instante y funciona aunque el
// navegador tenga JavaScript apagado. El pedido en vivo sólo la corrige.

import { tipoDeCielo } from '@/lib/clima';
import { useClimaVivo } from '@/lib/pedir-clima';


// De noche el fondo también baja: una tarjeta celeste a las dos de la
// mañana se ve fuera de lugar.
const FONDO_CIELO = {
  sol: '#245F7A', nube: '#1D4F63', cubierto: '#1D4F63', lluvia: '#243D52',
  luna: '#1B2A44', 'luna-nube': '#1A2438',
};

/** Los rayos del sol, calculados en vez de dibujados a ojo.
 *
 *  La versión anterior tenía las ocho líneas escritas a mano en el path, y
 *  quedaban desparejas: unas más largas que otras y con un hueco abajo a la
 *  derecha. Con trigonometría salen los ocho exactamente iguales y
 *  exactamente cada 45 grados.
 *
 *  `desde` y `hasta` son distancias al centro, no coordenadas: así el rayo
 *  siempre arranca afuera del disco por más que cambie el radio. */
function rayos(cx, cy, desde, hasta) {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x = Math.cos(a);
    const y = Math.sin(a);
    return `M${(cx + x * desde).toFixed(1)} ${(cy + y * desde).toFixed(1)}`
      + `L${(cx + x * hasta).toFixed(1)} ${(cy + y * hasta).toFixed(1)}`;
  }).join('');
}

// Una nube hecha con círculos superpuestos y una base redondeada. Un solo
// path quedaba con bultos raros; así la silueta es limpia siempre.
function Nube({ x = 0, y = 0, color = '#E7EDF0', escala = 1 }) {
  return (
    <g className="nube" transform={`translate(${x} ${y}) scale(${escala})`}>
      <circle cx="46" cy="50" r="17" fill={color} />
      <circle cx="28" cy="58" r="12" fill={color} />
      <circle cx="62" cy="57" r="13" fill={color} />
      <rect x="28" y="56" width="34" height="14" rx="7" fill={color} />
    </g>
  );
}

export function IconoCielo({ cielo, esDeDia = true, tamano = 92 }) {
  const tipo = tipoDeCielo(cielo, esDeDia);

  return (
    <svg width={tamano} height={tamano} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {tipo === 'sol' && (
        <>
          <g className="rayos" stroke="#E8A33C" strokeWidth="5" strokeLinecap="round">
            <path d={rayos(48, 48, 26, 35)} />
          </g>
          <circle cx="48" cy="48" r="18" fill="#E8A33C" />
        </>
      )}

      {tipo === 'cubierto' && <Nube y={16} color="#C8D4DB" />}

      {tipo === 'nube' && (
        <>
          {/* El sol asoma arriba a la derecha, detrás de la nube. */}
          <g className="rayos" stroke="#E8A33C" strokeWidth="4" strokeLinecap="round">
            <path d={rayos(62, 30, 19, 26)} />
          </g>
          <circle cx="62" cy="30" r="13" fill="#E8A33C" />
          <Nube y={6} />
        </>
      )}

      {(tipo === 'luna' || tipo === 'luna-nube') && (
        <>
          {/* La luna es un círculo al que se le recorta otro: así queda el
              gajo sin tener que dibujar una curva a mano. */}
          <defs>
            <mask id="gajo">
              <rect width="96" height="96" fill="#fff" />
              <circle cx={tipo === 'luna' ? 60 : 72} cy={tipo === 'luna' ? 34 : 24} r="19" fill="#000" />
            </mask>
          </defs>
          <circle
            cx={tipo === 'luna' ? 48 : 60} cy={tipo === 'luna' ? 44 : 32}
            r={tipo === 'luna' ? 22 : 16} fill="#E8D08C" mask="url(#gajo)"
          />
          {tipo === 'luna' && (
            <g fill="#E8D08C" opacity="0.8">
              <circle cx="78" cy="22" r="2.5" />
              <circle cx="22" cy="26" r="2" />
              <circle cx="70" cy="66" r="2" />
            </g>
          )}
          {tipo === 'luna-nube' && <Nube y={6} color="#C6CEDC" />}
        </>
      )}

      {tipo === 'lluvia' && (
        <>
          {/* La nube va más arriba para dejarle lugar a las gotas, que
              además se mueven 20px hacia abajo al caer: si arrancaran más
              abajo, la animación se cortaría contra el borde del dibujo. */}
          <Nube y={-12} color="#C8D4DB" />
          <g stroke="#7FBCE8" strokeWidth="5" strokeLinecap="round">
            <path className="gota" d="M33 62v8" />
            <path className="gota gota-2" d="M47 62v8" />
            <path className="gota gota-3" d="M61 62v8" />
          </g>
        </>
      )}
    </svg>
  );
}

function textoDetalle(a) {
  return (
    <>
      <span>Sensación {a.sensacion}°</span>{' · '}
      <span>Viento {a.rumbo} {a.viento} km/h</span>{' · '}
      <span>Humedad {a.humedad}%</span>
    </>
  );
}

export function TarjetaClima({ clima }) {
  const [datos, enVivo] = useClimaVivo(clima);

  if (!datos?.ahora) return null;
  const a = datos.ahora;
  const dias = (datos.dias ?? []).slice(0, 4);

  return (
    <div className="tarjeta-clima" style={{ '--cielo-fondo': FONDO_CIELO[tipoDeCielo(a.cielo, a.esDeDia !== false)] }}>
      {/* El numero, el estado del cielo y el dibujo en una sola fila. Antes
          iban uno debajo del otro y la tarjeta se comia media pantalla de
          celular antes de la primera noticia. */}
      <div className="cabecera-tarjeta">
        {enVivo && <span className="punto-vivo" title="Se actualiza cada 10 minutos" />}
        <span className="etiqueta">El clima ahora</span>
      </div>
      <div className="ahora-clima">
        <div className="temp">{a.temp}°</div>
        <div className="que-hace">
          <div className="cielo">{a.cielo}</div>
        </div>
        <IconoCielo cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={62} />
      </div>
      {/* El detalle ocupa el ancho entero de la tarjeta: entre el número
          grande y el dibujo quedaba una columna angosta y los tres datos
          caían en tres renglones. Cada uno en su span para que el corte
          pase entre datos y no en el medio de "14 km/h". */}
      <div className="detalle">{textoDetalle(a)}</div>

      {dias.length > 0 && (
        <div className="tira-dias">
          {dias.map((d) => (
            <div key={d.fecha}>
              <div className="dia">
                {d.dia}
                {/* Sólo en el celular: la probabilidad va al lado del día. */}
                {d.lluvia >= 40 && <span className="lluvia-chica" title={`${d.lluvia}% de lluvia`}>{d.lluvia}%</span>}
              </div>
              <div className="max">{d.max}°</div>
              {/* Con lluvia, en pantalla grande la mínima cede su lugar al aviso. */}
              <div className={d.lluvia >= 40 ? 'min con-lluvia' : 'min'}>{d.min}°</div>
              {d.lluvia >= 40 && <div className="lluvia">{d.lluvia}% lluvia</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


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

/**
 * La pastilla del clima de la barra de arriba.
 *
 * Lee del mismo pedido que la tarjeta grande. Antes tomaba el número del
 * momento en que se armó la página y la tarjeta se actualizaba sola, así
 * que en la misma pantalla podían leerse dos temperaturas distintas.
 */
export function PastillaClima({ clima }) {
  const [datos] = useClimaVivo(clima ? { ahora: clima } : null);
  const a = datos?.ahora;
  if (!a) return null;

  return (
    <span className="pastilla con-icono">
      <SolChico cielo={a.cielo} esDeDia={a.esDeDia !== false} />
      <span className="fuerte">{a.temp}°</span>
      <span className="apagado solo-grande">{a.cielo}</span>
    </span>
  );
}