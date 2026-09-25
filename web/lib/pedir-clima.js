'use client';

// Un solo pedido del clima para toda la página.
//
// La tarjeta grande se actualizaba sola y la pastilla de la barra de arriba
// se quedaba con el número del momento en que se armó la página. El domingo
// 20/09 a las 19:59 una decía 13° y la otra 14°, en la misma pantalla. Un
// medio que se contradice a sí mismo en dos centímetros no da confianza.
//
// Ahora las dos leen de acá. El pedido se hace una sola vez —aunque haya
// cinco componentes escuchando— y el resultado se reparte: el reloj y el
// evento de volver a la pestaña también son uno solo.

import { useEffect, useState } from 'react';

const BALCARCE = { lat: -37.8459, lon: -58.2557, tz: 'America/Argentina/Buenos_Aires' };
const CADA = 10 * 60 * 1000; // cada diez minutos

// La misma tabla que usa la ingesta (ingesta/ingesta.mjs). Está repetida a
// propósito: esto corre en el navegador y no puede importar nada de la
// carpeta del motor.
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

/** Aparte y exportada para poder probarla sin hacer un pedido de verdad. */
export function interpretar(j) {
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

// El estado compartido vive en el módulo, no en un componente: así sigue
// siendo uno solo por más que React monte y desmonte las tarjetas.
let ultimo = null;
let enCurso = null;
let reloj = null;
const oyentes = new Set();

// Cuánto se espera a Open-Meteo. Sin tope, un pedido colgado dejaba `enCurso`
// ocupado para siempre: todos los pedidos siguientes esperaban a ése y el
// clima de la pestaña no se actualizaba más hasta recargar (auditoría 25/09).
export const ESPERA_CLIMA = 15000;

/** Una señal que corta a los `ms`. AbortSignal.timeout no está en todos los
 *  navegadores viejos: ahí se arma a mano. */
function senalConTiempo(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const control = new AbortController();
  setTimeout(() => control.abort(), ms);
  return control.signal;
}

/** Exportada sólo para las pruebas (fetchFn y espera); la web la usa sin nada. */
export async function traer({ fetchFn = fetch, espera = ESPERA_CLIMA } = {}) {
  // Si ya hay un pedido volando, los dos componentes esperan el mismo.
  if (enCurso) return enCurso;
  enCurso = (async () => {
    try {
      const r = await fetchFn(URL, { cache: 'no-store', signal: senalConTiempo(espera) });
      if (!r.ok) return;
      ultimo = interpretar(await r.json());
      for (const avisar of oyentes) avisar(ultimo);
    } catch {
      // Si Open-Meteo no contesta (o tardó más que ESPERA_CLIMA) se queda el
      // dato que trajo el servidor. Un número de hace un rato es mejor que
      // una tarjeta rota.
    } finally {
      // Pase lo que pase, el próximo pedido puede salir.
      enCurso = null;
    }
  })();
  return enCurso;
}

function alVolver() {
  if (document.visibilityState === 'visible') traer();
}

/**
 * Devuelve `[datos, enVivo]`.
 *
 * `inicial` es lo que armó el servidor: se muestra desde el primer instante,
 * así que la tarjeta se ve completa aunque el navegador tenga JavaScript
 * apagado. `enVivo` recién se pone en true cuando el pedido contestó, para
 * no prometer un puntito verde que no significa nada.
 */
export function useClimaVivo(inicial) {
  const [datos, setDatos] = useState(inicial);
  const [enVivo, setEnVivo] = useState(false);

  useEffect(() => {
    const avisar = (nuevo) => { setDatos(nuevo); setEnVivo(true); };
    oyentes.add(avisar);

    // El que llega tarde no espera diez minutos: toma lo último que hay.
    if (ultimo) avisar(ultimo);

    if (oyentes.size === 1) {
      reloj = setInterval(traer, CADA);
      document.addEventListener('visibilitychange', alVolver);
    }
    traer();

    return () => {
      oyentes.delete(avisar);
      if (oyentes.size === 0) {
        clearInterval(reloj);
        reloj = null;
        document.removeEventListener('visibilitychange', alVolver);
      }
    };
  }, []);

  return [datos, enVivo];
}
