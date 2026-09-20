// Avisos de clima.
//
// La investigación dejó una conclusión incómoda: todo el mundo tiene el clima
// en el teléfono, así que un portal que muestra la temperatura no le resuelve
// nada a nadie. Lo que el teléfono NO hace es avisarte.
//
// Esto mira el pronóstico y decide si hay algo que merezca un aviso. En una
// zona agrícola eso es plata: una helada avisada a tiempo se cubre, un
// granizo anunciado mueve maquinaria bajo techo.
//
// Los umbrales están pensados para Balcarce, no para cualquier lugar. Y son
// deliberadamente altos: un aviso que salta todas las semanas deja de ser un
// aviso y se vuelve ruido, y entonces el día que importa nadie lo mira.

/** Los códigos de Open-Meteo que significan granizo o tormenta fuerte. */
const TORMENTA_FUERTE = new Set([96, 99]);
const TORMENTA = new Set([95, 96, 99]);

export const UMBRALES = {
  // En Balcarce hiela varias veces por invierno, así que el aviso es para la
  // helada de verdad, no para cualquier noche fresca.
  heladaFuerte: -2,
  helada: 0,
  // Lluvia: el porcentaje solo no alcanza, porque un 90% de dos milímetros no
  // le cambia el día a nadie.
  lluviaProbable: 85,
  lluviaMucha: 25, // milímetros
  // Viento: arriba de esto vuelan chapas y se suspenden actos al aire libre.
  vientoFuerte: 60, // km/h
  calorExtremo: 35,
};

/**
 * Devuelve los avisos que corresponden al pronóstico, o lista vacía.
 * Cada aviso trae de qué se trata, qué tan grave es y el texto listo.
 *
 * `dias` es lo que arma la ingesta: [{ fecha, dia, max, min, lluvia, cielo }].
 */
export function avisosDelClima(clima) {
  const dias = clima?.dias ?? [];
  if (!dias.length) return [];

  const avisos = [];
  // Sólo hoy y mañana: un aviso a cuatro días no sirve para actuar, y el
  // pronóstico a esa distancia se equivoca lo suficiente como para gastar
  // la confianza de la gente.
  for (const [i, d] of dias.slice(0, 2).entries()) {
    const cuando = i === 0 ? 'hoy' : 'mañana';
    const enLaNoche = i === 0 ? 'esta noche' : 'mañana a la noche';

    if (d.min <= UMBRALES.heladaFuerte) {
      avisos.push({
        tipo: 'helada', gravedad: 'alta', dia: d.fecha,
        titulo: `Helada fuerte ${enLaNoche}`,
        texto: `Se esperan ${d.min}° de mínima ${enLaNoche} en Balcarce. Cubrí las plantas y cuidá las cañerías.`,
      });
    } else if (d.min <= UMBRALES.helada) {
      avisos.push({
        tipo: 'helada', gravedad: 'media', dia: d.fecha,
        titulo: `Posible helada ${enLaNoche}`,
        texto: `La mínima baja a ${d.min}° ${enLaNoche} en Balcarce.`,
      });
    }

    if (TORMENTA_FUERTE.has(d.codigo)) {
      avisos.push({
        tipo: 'granizo', gravedad: 'alta', dia: d.fecha,
        titulo: `Tormenta con granizo ${cuando}`,
        texto: `El pronóstico da tormenta con granizo para ${cuando} en Balcarce. Guardá los autos bajo techo.`,
      });
    } else if (TORMENTA.has(d.codigo) && d.lluvia >= UMBRALES.lluviaProbable) {
      avisos.push({
        tipo: 'tormenta', gravedad: 'media', dia: d.fecha,
        titulo: `Tormenta ${cuando}`,
        texto: `Se esperan tormentas ${cuando} en Balcarce, con ${d.lluvia}% de probabilidad.`,
      });
    }

    if (d.viento >= UMBRALES.vientoFuerte) {
      avisos.push({
        tipo: 'viento', gravedad: 'alta', dia: d.fecha,
        titulo: `Viento fuerte ${cuando}`,
        texto: `Se esperan ráfagas de hasta ${d.viento} km/h ${cuando} en Balcarce.`,
      });
    }

    if (d.max >= UMBRALES.calorExtremo) {
      avisos.push({
        tipo: 'calor', gravedad: 'media', dia: d.fecha,
        titulo: `Calor extremo ${cuando}`,
        texto: `La máxima llega a ${d.max}° ${cuando} en Balcarce. Tomá agua y evitá el sol del mediodía.`,
      });
    }
  }

  // Si hay varios, primero el más grave: en una tarjeta entra uno solo.
  const peso = { alta: 0, media: 1 };
  return avisos.sort((a, b) => peso[a.gravedad] - peso[b.gravedad]);
}

if (process.argv[1] && process.argv[1].endsWith('alertas.mjs')) {
  const { ingestar } = await import('./ingesta.mjs');
  const { clima } = await ingestar({ fuentes: [], silencioso: true });
  const avisos = avisosDelClima(clima);
  console.log('\n\x1b[1mAVISOS DE CLIMA\x1b[0m\n');
  if (!avisos.length) {
    console.log('  Nada para avisar. El pronóstico está tranquilo.\n');
  } else {
    avisos.forEach((a) => console.log(`  [${a.gravedad}] ${a.titulo}\n      ${a.texto}\n`));
  }
}
