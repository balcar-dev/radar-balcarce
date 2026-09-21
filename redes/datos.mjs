// Los datos del día, con la forma que espera el plan de piezas (reels/plan.mjs).
//
// En la PC, el plan lee lo que dejó el panel (panel/datos/ultima.json). En
// GitHub no hay panel, y lo único que hay es web/data/portada.json: lo que ya
// se publicó. Esto traduce una cosa en la otra, para que las piezas se puedan
// generar con la PC apagada.
//
// Ventaja de arrancar de lo publicado: una pieza nunca puede hablar de algo
// que el semáforo frenó, porque eso no está en portada.json.

/** De portada.json a los datos del plan. */
export function datosDeLaWeb(portada) {
  const turnos = [portada.farmacias?.hoy, ...(portada.farmacias?.proximos ?? [])].filter(Boolean);
  return {
    generado: portada.generado,
    notas: portada.notas ?? [],
    clima: portada.clima ?? null,
    farmacias: { turnos },
  };
}
