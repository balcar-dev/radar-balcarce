// Corre las pruebas "como si fuera" otra hora (4/10/2026): dos pruebas que dependían del reloj o de la fecha dejaron la web 3 horas y media sin actualizarse (el
// reloj de la nube no era el de la compu). Se usa con --import:
//
//   HORA_FALSA=2026-10-11T03:00:00Z node --import ./pruebas/hora-falsa.mjs --test "pruebas/*.test.mjs"
//
// Hace que `new Date()` y `Date.now()` arranquen en esa hora y sigan avanzando. Ninguna prueba tendría que fallar según la hora a la que se corre.

const base = Date.parse(process.env.HORA_FALSA ?? '');
if (Number.isFinite(base)) {
  const Real = Date;
  const desfase = base - Real.now();
  class Falsa extends Real {
    constructor(...args) {
      if (args.length === 0) super(Real.now() + desfase);
      else super(...args);
    }

    static now() { return Real.now() + desfase; }
  }
  globalThis.Date = Falsa;
}
