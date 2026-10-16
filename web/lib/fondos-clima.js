// La imagen de la nota del clima (16/10/2026, Hernán: "nuestra nota del clima está saliendo sin imagen").
//
// No hay una foto del clima de hoy que no sea de otro medio, así que la nota lleva una ILUSTRACIÓN GENÉRICA hecha con IA y declarada como tal:
// un paisaje de la pampa bonaerense (sin personas, sin texto, sin lugares reconocibles) que va con el estado del tiempo del día. Las imágenes se
// generaron UNA vez con el Worker de Workers AI de Cloudflare (workflow "Generar fondos del clima", infra/imagenes-cloudflare/) y están guardadas
// en web/public/fotos-notas/clima-<estado>-<n>.jpg: elegir una no cuesta nada ni llama a ninguna red. Hay dos o tres por estado y cada día toca
// una distinta, siempre la misma para la misma fecha (así la nota de ayer sigue como estaba).
//
// Permitido SÓLO para el clima y las efemérides, que son genéricos: ninguna nota de un hecho lleva una imagen de IA (docs/05-FOTOS.md, regla 181).

/** La leyenda del epígrafe. Siempre dice que es de IA. */
export const CREDITO_FONDO_CLIMA = 'Ilustración generada con IA (Cloudflare Workers AI)';

/** Los estados del tiempo, con las imágenes de cada uno (archivos de web/public/fotos-notas/). */
export const FONDOS_DEL_CLIMA = {
  despejado: ['clima-despejado-1.jpg', 'clima-despejado-2.jpg', 'clima-despejado-3.jpg'],
  'parcialmente-nublado': ['clima-parcialmente-nublado-1.jpg', 'clima-parcialmente-nublado-2.jpg', 'clima-parcialmente-nublado-3.jpg'],
  nublado: ['clima-nublado-1.jpg', 'clima-nublado-2.jpg', 'clima-nublado-3.jpg'],
  lluvia: ['clima-lluvia-1.jpg', 'clima-lluvia-2.jpg', 'clima-lluvia-3.jpg'],
  tormenta: ['clima-tormenta-1.jpg', 'clima-tormenta-2.jpg', 'clima-tormenta-3.jpg'],
  niebla: ['clima-niebla-1.jpg', 'clima-niebla-2.jpg', 'clima-niebla-3.jpg'],
  viento: ['clima-viento-1.jpg', 'clima-viento-2.jpg', 'clima-viento-3.jpg'],
  frio: ['clima-frio-1.jpg', 'clima-frio-2.jpg', 'clima-frio-3.jpg'],
  calor: ['clima-calor-1.jpg', 'clima-calor-2.jpg', 'clima-calor-3.jpg'],
};

/** Si el estado no se reconoce: un cielo cualquiera, que no promete ni lluvia ni sol. */
export const ESTADO_GENERICO = 'parcialmente-nublado';

/** Los umbrales (°C, km/h, %). La helada es la de la mínima, no la de ahora; el calor, la máxima del día. */
export const UMBRALES_DEL_FONDO = { frioMinima: 2, calorMaxima: 32, vientoFuerte: 45, lluviaProbable: 30 };

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const numero = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** El estado a partir del texto del cielo que da el pronóstico ("Llovizna leve", "Parcialmente nublado"…), o null. */
export function estadoDelCielo(cielo) {
  const c = plano(cielo);
  if (!c) return null;
  if (/tormenta|granizo/.test(c)) return 'tormenta';
  if (/lluvia|llovizna|chaparron|aguanieve/.test(c)) return 'lluvia';
  if (/niebla/.test(c)) return 'niebla';
  if (/nieve/.test(c)) return 'frio';
  if (/parcialmente|mayormente nublado|algo nublado/.test(c)) return 'parcialmente-nublado';
  if (/despejado/.test(c)) return 'despejado'; // "Despejado" y "Mayormente despejado"
  if (/nublado|cubierto/.test(c)) return 'nublado';
  return null;
}

/**
 * El estado del tiempo de una nota del clima (`entrada`: lo que guarda clima-historia.json, { hoy, ahora }). Manda lo más fuerte del día: la
 * tormenta, la lluvia (sólo si es probable: una llovizna del 15% no hace un día de lluvia), la niebla, la helada, el calor, el viento y, si no,
 * el cielo. Siempre devuelve un estado de FONDOS_DEL_CLIMA.
 */
export function estadoDelTiempo(entrada) {
  const hoy = entrada?.hoy ?? {};
  const ahora = entrada?.ahora ?? {};
  const U = UMBRALES_DEL_FONDO;
  const delDia = estadoDelCielo(hoy.cielo);
  const deAhora = estadoDelCielo(ahora.cielo);
  const lluvia = numero(hoy.lluvia);
  const probable = lluvia === null || lluvia >= U.lluviaProbable;
  if (delDia === 'tormenta' || deAhora === 'tormenta') return 'tormenta';
  if ((delDia === 'lluvia' && probable) || deAhora === 'lluvia') return 'lluvia';
  if (delDia === 'niebla' || deAhora === 'niebla') return 'niebla';
  if (numero(hoy.min) !== null && hoy.min <= U.frioMinima) return 'frio';
  if (delDia === 'frio' || deAhora === 'frio') return 'frio';
  if (numero(hoy.max) !== null && hoy.max >= U.calorMaxima) return 'calor';
  if (numero(hoy.viento) !== null && hoy.viento >= U.vientoFuerte) return 'viento';
  const cielo = [delDia, deAhora].find((e) => e && !['lluvia', 'niebla', 'frio'].includes(e)) ?? null;
  // Una llovizna poco probable no oscurece el día: se mira cómo está el cielo ahora.
  return cielo ?? ESTADO_GENERICO;
}

/** Cuántos días pasaron desde 1970 hasta 'AAAA-MM-DD' (para elegir sin azar). 0 si la fecha no es una fecha. */
export function numeroDeDia(dia) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia ?? ''));
  if (!m) return 0;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000);
}

/** El archivo que le toca a ese estado ese día: siempre el mismo para la misma fecha, y uno distinto cada día seguido. */
export function archivoDelFondo(estado, dia) {
  const lista = FONDOS_DEL_CLIMA[estado] ?? FONDOS_DEL_CLIMA[ESTADO_GENERICO];
  return lista[numeroDeDia(dia) % lista.length];
}

/** El campo `foto` de la nota del clima: { archivo, credito }. Nunca falla ni llama a la red. */
export function fondoDelClima(entrada) {
  const estado = estadoDelTiempo(entrada);
  return { archivo: `fotos-notas/${archivoDelFondo(estado, entrada?.dia)}`, credito: CREDITO_FONDO_CLIMA };
}
