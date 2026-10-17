// Los datos del día, con la forma que espera el plan de piezas (reels/plan.mjs).
//
// Las piezas salen SIEMPRE de web/data/portada.json: lo que ya se publicó (desde
// el 17/10 no hay "modo PC" que lea los datos del panel de la PC, en desuso).
// Esto lo traduce a la forma del plan, para que las piezas se armen con la PC
// apagada.
//
// Ventaja de arrancar de lo publicado: una pieza nunca puede hablar de algo
// que el semáforo frenó, porque eso no está en portada.json.

/** De portada.json a los datos del plan. `yaPublicadas` le dice al plan que
 *  estas notas ya pasaron el filtro de la web (verde o decidida por una
 *  persona) y no traen semáforo: no hay que volver a filtrarlas. */
export function datosDeLaWeb(portada) {
  const turnos = [portada.farmacias?.hoy, ...(portada.farmacias?.proximos ?? [])].filter(Boolean);
  return {
    yaPublicadas: true,
    generado: portada.generado,
    notas: portada.notas ?? [],
    clima: portada.clima ?? null,
    farmacias: { turnos },
  };
}
