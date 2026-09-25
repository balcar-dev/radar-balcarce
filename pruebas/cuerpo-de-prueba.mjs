// Un cuerpo de nota para las pruebas: más de 70 palabras (el mínimo para
// publicarse desde el 25/09, web/lib/cuerpo.js), sin números, nombres, días
// ni citas, para que pase el verificador contra cualquier fuente de prueba.
// No es una prueba: node --test sólo corre los *.test.mjs.

export const CUERPO = [
  'La propuesta fue presentada durante la jornada y generó interés entre los vecinos que se acercaron a escuchar los detalles. Según se informó, el objetivo es ordenar el trabajo de las distintas áreas y mejorar la atención en los próximos meses.',
  'Los responsables explicaron que la iniciativa se va a aplicar de manera gradual, con reuniones periódicas para evaluar cómo avanza cada etapa. También señalaron que se buscará sumar la opinión de las instituciones del lugar y de quienes participan de manera habitual en estas actividades, para ajustar lo que haga falta.',
].join('\n\n');

/** Un texto completo de fuente neutro (distinto del cuerpo, para que no se
 *  lea como copia), por si una prueba necesita "material". */
export const TEXTO_COMPLETO = [
  'Durante el encuentro se presentó una iniciativa pensada para ordenar las tareas de las áreas involucradas y atender mejor a la comunidad.',
  'Quienes la impulsan contaron que se pondrá en marcha por etapas y que habrá encuentros de seguimiento con las entidades de la zona.',
  'La idea, agregaron, es escuchar a quienes participan de estas actividades y corregir sobre la marcha lo que no funcione como se esperaba.',
].join('\n');
