// El dólar, consultado en el momento.
//
// Los usuarios lo pidieron así (25/09): "no hay que poner cotización a no
// ser que armemos algo que lo muestre de verdad actualizado, con su página,
// como farmacias". Un número de hace tres horas con un cartel que promete
// lo contrario es peor que no tener número.
//
// Por eso la página /dolar le pregunta la cotización a DolarApi.com desde el
// navegador de quien la abre (y cada 5 minutos mientras está abierta). Si
// DolarApi no contesta, prueba con Bluelytics, que trae sólo oficial y blue.
// Las dos son gratis, no piden clave y permiten pedidos desde el navegador
// (Access-Control-Allow-Origin: *, verificado el 25/09).
//
// Mientras tanto, o si las dos fallan, se muestra la foto que se guardó al
// compilar el sitio (scripts/foto-dolar.mjs → data/dolar.json), con su hora
// y diciendo que no se pudo actualizar.
//
// Este archivo no importa nada: lo usan la página, el componente del
// navegador, el script que guarda la foto y las pruebas.

export const FUENTES = {
  dolarapi: { nombre: 'DolarApi.com', url: 'https://dolarapi.com', api: 'https://dolarapi.com/v1/dolares' },
  bluelytics: { nombre: 'Bluelytics', url: 'https://bluelytics.com.ar', api: 'https://api.bluelytics.com.ar/v2/latest' },
};

/** Cada cuánto se vuelve a preguntar mientras la página está abierta. */
export const CADA_DOLAR = 5 * 60 * 1000;

/** Cuánto se espera a cada fuente antes de darla por caída. */
export const ESPERA_DOLAR = 10000;

const TZ = 'America/Argentina/Buenos_Aires';

/**
 * Los tipos de dólar, en el orden en que se muestran, con el nombre que se
 * usa acá (el de DolarApi dice "Bolsa" y casi nadie lo busca así) y qué es
 * cada uno, para la línea plegable de la página.
 */
export const CASAS = [
  { casa: 'oficial', nombre: 'Oficial', que: 'El que publican los bancos para la venta al público. Es la referencia para el resto.' },
  { casa: 'blue', nombre: 'Blue', que: 'El dólar informal, el de las cuevas y los arbolitos. No es un mercado legal: el precio es el que relevan las fuentes.' },
  { casa: 'bolsa', nombre: 'MEP (Bolsa)', que: 'El que se consigue comprando y vendiendo bonos o acciones en pesos y en dólares, desde una cuenta de inversión o el home banking. Es legal.' },
  { casa: 'contadoconliqui', nombre: 'Contado con liqui', que: 'Parecido al MEP, pero los dólares quedan en una cuenta del exterior. Lo usan sobre todo las empresas.' },
  { casa: 'tarjeta', nombre: 'Tarjeta', que: 'Lo que se paga por cada dólar gastado con tarjeta en el exterior o en servicios como las plataformas digitales: el oficial más los impuestos y percepciones.' },
  { casa: 'mayorista', nombre: 'Mayorista', que: 'El precio entre bancos y grandes empresas. Es el que se usa para el comercio exterior.' },
  { casa: 'cripto', nombre: 'Cripto', que: 'El precio de las monedas digitales atadas al dólar (como USDT) en las plataformas de cripto.' },
];

const ORDEN = new Map(CASAS.map((c, i) => [c.casa, i]));
const esNumero = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
const esFecha = (f) => typeof f === 'string' && !Number.isNaN(new Date(f).getTime());

/**
 * La respuesta de https://dolarapi.com/v1/dolares: una lista de
 * { moneda, casa, nombre, compra, venta, fechaActualizacion }. Cada tipo trae
 * su propia hora (el oficial cierra antes que el blue). No trae variación
 * contra el día anterior, así que no se inventa.
 *
 * Devuelve null si no hay nada que sirva.
 */
export function interpretarDolarApi(j) {
  if (!Array.isArray(j)) return null;
  const cotizaciones = j
    .filter((c) => c && ORDEN.has(c.casa) && (esNumero(c.venta) || esNumero(c.compra)) && esFecha(c.fechaActualizacion))
    .map((c) => ({
      casa: c.casa,
      compra: esNumero(c.compra) ? c.compra : null,
      venta: esNumero(c.venta) ? c.venta : null,
      fecha: new Date(c.fechaActualizacion).toISOString(),
    }))
    .sort((a, b) => ORDEN.get(a.casa) - ORDEN.get(b.casa));
  return cotizaciones.length ? { fuente: 'dolarapi', cotizaciones } : null;
}

/**
 * La respuesta de https://api.bluelytics.com.ar/v2/latest: sólo oficial y
 * blue, con una hora para los dos (`last_update`). Es el respaldo.
 */
export function interpretarBluelytics(j) {
  if (!j || typeof j !== 'object' || !esFecha(j.last_update)) return null;
  const fecha = new Date(j.last_update).toISOString();
  const cotizaciones = ['oficial', 'blue']
    .filter((casa) => j[casa] && (esNumero(j[casa].value_sell) || esNumero(j[casa].value_buy)))
    .map((casa) => ({
      casa,
      compra: esNumero(j[casa].value_buy) ? j[casa].value_buy : null,
      venta: esNumero(j[casa].value_sell) ? j[casa].value_sell : null,
      fecha,
    }));
  return cotizaciones.length ? { fuente: 'bluelytics', cotizaciones } : null;
}

/** El nombre y la explicación de un tipo de dólar. */
export const datosDeCasa = (casa) => CASAS.find((c) => c.casa === casa) ?? { casa, nombre: casa, que: '' };

/**
 * La brecha del blue contra el oficial, con el precio de venta de los dos.
 * { porcentaje, pesos } o null si falta alguno. Puede dar negativa: pasó en
 * 2025, con el blue por debajo del oficial, y hay que decirlo así.
 */
export function brecha(cotizaciones = []) {
  const venta = (casa) => cotizaciones.find((c) => c.casa === casa)?.venta;
  const oficial = venta('oficial');
  const blue = venta('blue');
  if (!esNumero(oficial) || !esNumero(blue)) return null;
  return {
    porcentaje: Math.round(((blue - oficial) / oficial) * 1000) / 10,
    pesos: Math.round((blue - oficial) * 100) / 100,
  };
}

/** "$1.540" o "$1.545,60": los centavos sólo cuando los hay. */
export function pesos(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  const conCentavos = Math.round(n * 100) % 100 !== 0;
  const texto = Math.abs(n).toLocaleString('es-AR', {
    minimumFractionDigits: conCentavos ? 2 : 0, maximumFractionDigits: 2,
  });
  return `${n < 0 ? '−' : ''}$${texto}`;
}

/** "1,3%" */
export const porcentaje = (n) => `${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const diaEnBalcarce = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const horaEnBalcarce = (d) => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

/**
 * Cuándo fue algo, dicho respecto de `ahora`: { dia, hora }.
 * `dia` es null si fue hoy, "ayer", o "el jueves 24/09". Sin `ahora` se
 * dice el día entero: mejor de más que un "hoy" que puede no serlo.
 */
export function momento(fecha, ahora) {
  const f = new Date(fecha);
  const hora = horaEnBalcarce(f);
  if (ahora) {
    const hoy = diaEnBalcarce(new Date(ahora));
    const ayer = diaEnBalcarce(new Date(new Date(ahora).getTime() - 24 * 3600 * 1000));
    const ese = diaEnBalcarce(f);
    if (ese === hoy) return { dia: null, hora };
    if (ese === ayer) return { dia: 'ayer', hora };
  }
  const semana = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'long' }).format(f);
  // "24/09": es-AR con 2-digit igual escribe "24/9", así que se arma a mano.
  const [, mes, dia] = diaEnBalcarce(f).split('-');
  const fechaCorta = `${dia}/${mes}`;
  return { dia: `el ${semana} ${fechaCorta}`, hora };
}

/** "a las 17:56", "ayer a las 17:56", "el jueves 24/09 a las 17:56". */
export function cuando(fecha, ahora) {
  const m = momento(fecha, ahora);
  return m.dia ? `${m.dia} a las ${m.hora}` : `a las ${m.hora}`;
}

/** La hora más nueva de una lista de cotizaciones. */
export function ultimaFecha(cotizaciones = []) {
  const t = Math.max(...cotizaciones.map((c) => new Date(c.fecha).getTime()).filter(Number.isFinite));
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * Lo que dice la línea de arriba de las tarjetas: { titulo, detalle }.
 *
 *   estado 'vivo'      el navegador consultó recién y la fuente contestó.
 *   estado 'guardada'  lo que se ve en el HTML estático, antes de consultar
 *                      (y lo que queda si el navegador no corre JavaScript).
 *   estado 'cargando'  el navegador está consultando.
 *   estado 'fallo'     el navegador consultó y ninguna fuente contestó.
 *
 * `datos` es { fuente, cotizaciones, consultado, deLaFoto } (consultado:
 * cuándo lo pidió el navegador o, en la foto, cuándo se guardó; deLaFoto:
 * true si es la foto que se guardó al compilar).
 *
 * La hora de "Actualizado" es la que informa la fuente, no la del pedido:
 * a la noche el blue sigue siendo el del cierre y eso es lo que se dice.
 */
export function textoDeEstado({ estado, datos, ahora }) {
  const hay = datos?.cotizaciones?.length > 0;
  if (!hay) {
    if (estado === 'cargando') return { titulo: 'Consultando la cotización…', detalle: null };
    return { titulo: 'No se pudo consultar la cotización ahora.', detalle: estado === 'fallo' ? 'Volvemos a probar en 5 minutos.' : null };
  }

  const ultima = ultimaFecha(datos.cotizaciones);
  const nombreFuente = FUENTES[datos.fuente]?.nombre ?? datos.fuente;

  if (estado === 'vivo') {
    return {
      titulo: `Actualizado ${cuando(ultima, ahora)}`,
      detalle: `Consultamos ${nombreFuente} ${cuando(datos.consultado, ahora)}. Se vuelve a consultar cada 5 minutos mientras tengas la página abierta.`,
    };
  }

  const m = momento(ultima, ahora);
  // "de las 17:56", "de ayer a las 17:56", "del jueves 24/09 a las 17:56".
  let deCuando = `de las ${m.hora}`;
  if (m.dia === 'ayer') deCuando = `de ayer a las ${m.hora}`;
  else if (m.dia) deCuando = `del ${m.dia.replace(/^el /, '')} a las ${m.hora}`;
  let guardada = null;
  if (datos.consultado) {
    guardada = datos.deLaFoto
      ? `La guardamos ${cuando(datos.consultado, ahora)}, al armar esta página.`
      : `La última consulta que contestó fue ${cuando(datos.consultado, ahora)}.`;
  }

  if (estado === 'fallo') {
    return {
      titulo: `Cotización ${deCuando}; no se pudo actualizar.`,
      detalle: [guardada, 'Volvemos a probar en 5 minutos.'].filter(Boolean).join(' '),
    };
  }
  if (estado === 'cargando') {
    return { titulo: `Cotización ${deCuando}`, detalle: [guardada, 'Buscando la de ahora…'].filter(Boolean).join(' ') };
  }
  return { titulo: `Cotización ${deCuando}`, detalle: guardada };
}

/** Una señal que corta a los `ms` (AbortSignal.timeout no está en todos los
 *  navegadores viejos: ahí se arma a mano). */
function senalConTiempo(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const control = new AbortController();
  setTimeout(() => control.abort(), ms);
  return control.signal;
}

/**
 * Pregunta primero a DolarApi y, sólo si falla, a Bluelytics.
 * Devuelve { fuente, cotizaciones, consultado } o null si ninguna contestó.
 * Nunca tira un error.
 */
export async function traerDolar({ fetchFn = fetch, espera = ESPERA_DOLAR, ahora = () => new Date() } = {}) {
  const intentos = [
    [FUENTES.dolarapi.api, interpretarDolarApi],
    [FUENTES.bluelytics.api, interpretarBluelytics],
  ];
  for (const [url, interpretar] of intentos) {
    try {
      const r = await fetchFn(url, { cache: 'no-store', signal: senalConTiempo(espera) });
      if (!r.ok) continue;
      const datos = interpretar(await r.json());
      if (datos) return { ...datos, consultado: ahora().toISOString() };
    } catch {
      // Caída, colgada o respuesta rota: se prueba con la siguiente.
    }
  }
  return null;
}
