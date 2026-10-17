// Cuántos minutos de Workers Builds gasta el motor, y cuándo conviene saltearse una vuelta para no pasarse (18/10/2026, mudanza a Cloudflare).
//
// Workers Paid incluye 6.000 minutos de compilación por mes y cobra US$ 0,005 por minuto de más (docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
// La vuelta del motor tarda unos 4,5 minutos y corre hasta 48 veces por día: 48 × 4,5 × 30 = 6.480, un poco MÁS que lo incluido. Para no pagar
// nada, el reloj de Cloudflare consulta este presupuesto antes de despertar el motor: reparte los minutos del mes en partes iguales por día, deja
// un día de colchón, y si ya se gastó más de lo que corresponde hasta ahora, saltea la vuelta (sale la de la media hora siguiente). Nunca deja pasar
// más de `horasMaximasSinVuelta` sin una vuelta: el sitio no se queda sin actualizar por ahorrar.
//
// Pura: sin red, sin disco, sin dependencias. La usan el reloj (un Worker) y la vuelta (Node).

export const MINUTOS_INCLUIDOS = 6000;
/** Se usa sólo hasta este porcentaje de lo incluido: el resto es el margen por lo que Cloudflare mide distinto de lo que mide la vuelta. */
export const MARGEN = 0.95;
/** Lo que se suma a cada vuelta por la cola, el clon y lo que la vuelta no ve de sí misma. */
export const MINUTOS_DE_MAS_POR_VUELTA = 0.5;
export const HORAS_MAXIMAS_SIN_VUELTA = 3;
export const COLCHON_EN_DIAS = 1;

/** El mes de Balcarce ("2026-10") de un instante. */
export function mesDe(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).format(ahora).slice(0, 7);
}

/** La clave del registro del mes en R2. */
export const claveDelMes = (mes) => `motor/minutos/${mes}.json`;

export const registroVacio = (mes) => ({ mes, segundos: 0, vueltas: 0, porDia: {}, actualizado: null });

/** Suma una vuelta al registro del mes. `segundos` es lo que midió la vuelta de sí misma. */
export function sumarVuelta(registro, { segundos, ahora = new Date(), mes = mesDe(ahora) } = {}) {
  const base = registro?.mes === mes ? registro : registroVacio(mes);
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
  const s = Math.max(0, Math.round(segundos + MINUTOS_DE_MAS_POR_VUELTA * 60));
  const delDia = base.porDia?.[dia] ?? { s: 0, n: 0 };
  return {
    mes,
    segundos: (base.segundos ?? 0) + s,
    vueltas: (base.vueltas ?? 0) + 1,
    porDia: { ...(base.porDia ?? {}), [dia]: { s: delDia.s + s, n: delDia.n + 1 } },
    actualizado: ahora.toISOString(),
  };
}

/** Cuántos días tiene el mes ("2026-10" → 31). */
export const diasDelMes = (mes) => new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();

/** Qué parte del mes pasó (0 a 1), contando la hora de Balcarce. */
export function fraccionDelMes(ahora = new Date()) {
  const mes = mesDe(ahora);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora).map((x) => [x.type, x.value]));
  const dia = Number(p.day) - 1 + (Number(p.hour) % 24) / 24 + Number(p.minute) / 1440;
  return Math.min(1, dia / diasDelMes(mes));
}

/**
 * ¿Hay que correr la vuelta que toca ahora? Devuelve { correr, motivo, gastado, corresponde } (minutos).
 * @param {object} o
 * @param {object|null} o.registro        el registro del mes (sumarVuelta), o null si todavía no hay
 * @param {string|null} o.ultimaVueltaBuena  cuándo terminó la última vuelta que salió bien (ISO)
 * @param {boolean} [o.sinTope]           MOTOR_SIN_TOPE = "Si": no se ahorra (se acepta pagar lo que pase)
 */
export function debeCorrer({ registro, ultimaVueltaBuena = null, ahora = new Date(), sinTope = false, incluidos = MINUTOS_INCLUIDOS } = {}) {
  const mes = mesDe(ahora);
  const gastado = registro?.mes === mes ? (registro.segundos ?? 0) / 60 : 0;
  const permitido = incluidos * MARGEN;
  const colchon = (permitido / diasDelMes(mes)) * COLCHON_EN_DIAS;
  const corresponde = permitido * fraccionDelMes(ahora) + colchon;
  const resumen = { gastado: Math.round(gastado), corresponde: Math.round(corresponde), incluidos };
  if (sinTope) return { correr: true, motivo: 'sin tope (MOTOR_SIN_TOPE)', ...resumen };
  if (gastado <= corresponde) return { correr: true, motivo: 'dentro del presupuesto', ...resumen };
  const horas = ultimaVueltaBuena ? (ahora.getTime() - new Date(ultimaVueltaBuena).getTime()) / 3600e3 : Infinity;
  if (!Number.isFinite(horas) || horas >= HORAS_MAXIMAS_SIN_VUELTA) {
    return { correr: true, motivo: `pasado del presupuesto, pero hace ${Number.isFinite(horas) ? `${horas.toFixed(1)} h` : 'mucho'} que no hay una vuelta buena`, ...resumen };
  }
  return { correr: false, motivo: `se salteó para no pasar los ${incluidos} minutos incluidos (van ${resumen.gastado}, corresponden ${resumen.corresponde})`, ...resumen };
}
