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

import { useEffect, useState } from 'react';
import { tipoDeCielo } from '@/lib/clima';

const BALCARCE = { lat: -37.8459, lon: -58.2557, tz: 'America/Argentina/Buenos_Aires' };
const CADA = 10 * 60 * 1000; // cada diez minutos

// La misma tabla que usa la ingesta (ingesta/ingesta.mjs). Está repetida a
// propósito: este archivo corre en el navegador y no puede importar nada de
// la carpeta del motor.
const CIELO = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna leve', 53: 'Llovizna',
  55: 'Llovizna intensa', 61: 'Lluvia leve', 63: 'Lluvia', 65: 'Lluvia fuerte',
  71: 'Nieve leve', 73: 'Nieve', 75: 'Nieve intensa', 80: 'Chaparrones',
  81: 'Chaparrones fuertes', 82: 'Chaparrones muy fuertes', 95: 'Tormenta',
  96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo',
};
const RUMBOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const URL = `https://api.open-meteo.com/v1/forecast?latitude=${BALCARCE.lat}&longitude=${BALCARCE.lon}`
  + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day'
  + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code'
  + `&timezone=${encodeURIComponent(BALCARCE.tz)}&forecast_days=4`;

function interpretar(j) {
  return {
    ahora: {
      temp: Math.round(j.current.temperature_2m),
      sensacion: Math.round(j.current.apparent_temperature),
      humedad: j.current.relative_humidity_2m,
      viento: Math.round(j.current.wind_speed_10m),
      rumbo: RUMBOS[Math.round(j.current.wind_direction_10m / 45) % 8],
      cielo: CIELO[j.current.weather_code] ?? 'Sin datos',
      esDeDia: j.current.is_day === 1,
    },
    dias: j.daily.time.map((f, i) => ({
      fecha: f,
      dia: DIAS[new Date(`${f}T12:00:00`).getDay()],
      max: Math.round(j.daily.temperature_2m_max[i]),
      min: Math.round(j.daily.temperature_2m_min[i]),
      lluvia: j.daily.precipitation_probability_max[i],
      cielo: CIELO[j.daily.weather_code[i]] ?? '',
    })),
  };
}


// De noche el fondo también baja: una tarjeta celeste a las dos de la
// mañana se ve fuera de lugar.
const FONDO_CIELO = {
  sol: '#2A6E8C', nube: '#1D4F63', cubierto: '#1D4F63', lluvia: '#243D52',
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

export function TarjetaClima({ clima }) {
  const [datos, setDatos] = useState(clima);
  const [enVivo, setEnVivo] = useState(false);

  useEffect(() => {
    let vivo = true;

    const traer = async () => {
      try {
        const r = await fetch(URL, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!vivo) return;
        setDatos(interpretar(j));
        setEnVivo(true);
      } catch {
        // Si Open-Meteo no contesta, se queda el dato que trajo el servidor.
        // Un número de hace un rato es mejor que una tarjeta rota.
      }
    };

    traer();
    const reloj = setInterval(traer, CADA);
    // Cuando alguien vuelve a la pestaña después de un rato, el dato que ve
    // es viejo aunque el reloj no haya llegado a disparar.
    const alVolver = () => { if (document.visibilityState === 'visible') traer(); };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vivo = false;
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (!datos?.ahora) return null;
  const a = datos.ahora;
  const dias = (datos.dias ?? []).slice(0, 4);

  return (
    <div className="tarjeta-clima" style={{ '--cielo-fondo': FONDO_CIELO[tipoDeCielo(a.cielo, a.esDeDia !== false)] }}>
      {/* El numero, el estado del cielo y el dibujo en una sola fila. Antes
          iban uno debajo del otro y la tarjeta se comia media pantalla de
          celular antes de la primera noticia. */}
      <div className="ahora-clima">
        <div className="temp">{a.temp}°</div>
        <div className="que-hace">
          <div className="titulo">
            El clima ahora
            {enVivo && <span className="en-vivo" title="Se actualiza cada 10 minutos" />}
          </div>
          <div className="cielo">{a.cielo}</div>
        </div>
        <IconoCielo cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={62} />
      </div>
      {/* El detalle ocupa el ancho entero de la tarjeta: entre el número
          grande y el dibujo quedaba una columna angosta y los tres datos
          caían en tres renglones. Cada uno en su span para que el corte
          pase entre datos y no en el medio de "14 km/h". */}
      <div className="detalle">
        <span>Sensación {a.sensacion}°</span>{' · '}
        <span>Viento {a.rumbo} {a.viento} km/h</span>{' · '}
        <span>Humedad {a.humedad}%</span>
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
