// Se carga antes de todas las pruebas (`node --import ./pruebas/datos-fijos.mjs --test …`): los feriados, las efemérides y sus
// decisiones se leen de pruebas/datos-fijos/ y no de web/data, que cambia cuando se arma un mes o alguien toca el celular (C-7, C-18).
process.env.RADAR_DATOS_FIJOS ??= 'pruebas/datos-fijos';
