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
  + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code'
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

function tipoDeCielo(cielo = '') {
  const t = cielo.toLowerCase();
  if (/lluvia|llovizna|chaparr|tormenta|nieve/.test(t)) return 'lluvia';
  if (/despejado/.test(t) && !/mayormente/.test(t)) return 'sol';
  return 'nube';
}

const FONDO_CIELO = { sol: '#2A6E8C', nube: '#1D4F63', lluvia: '#243D52' };

export function IconoCielo({ cielo, tamano = 92 }) {
  const tipo = tipoDeCielo(cielo);
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
          <g className="rayos" stroke="#E8A33C" strokeWidth="3" strokeLinecap="round" transform="translate(24 6)">
            <path d="M26 5v6M26 41v6M5 26h6M41 26h6M11 11l4.2 4.2M36.8 36.8L41 41M41 11l-4.2 4.2M15.2 36.8L11 41" />
          </g>
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
    <div className="tarjeta-clima" style={{ '--cielo-fondo': FONDO_CIELO[tipoDeCielo(a.cielo)] }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flexGrow: 1 }}>
          <div className="titulo">
            El clima ahora
            {enVivo && <span className="en-vivo" title="Se actualiza cada 10 minutos" />}
          </div>
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
