// De dónde se leen los datos que cambian solos o los toca una persona desde el celular (feriados, efemérides, decisiones).
// Sin dependencias: sólo lo que trae Node.
//
// Por qué existe (8/10/2026, C-7 y C-18): las pruebas leían esos archivos VIVOS, y un toque de Hernán o Andrés en el celular ("Pedir
// cambios" del feriado, "Sacar" una efeméride) o armar el mes siguiente hacía fallar de 1 a 19 pruebas y congelaba la web. Ahora las
// pruebas corren con `RADAR_DATOS_FIJOS=pruebas/datos-fijos` (lo pone pruebas/datos-fijos.mjs) y leen copias que no cambian.
// En producción la variable no existe y se lee web/data, como siempre.
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');

/** La carpeta de datos: la fija de las pruebas si está `RADAR_DATOS_FIJOS`, y si no web/data. Se mira en cada llamada. */
export function carpetaDeDatos() {
  const fija = process.env.RADAR_DATOS_FIJOS;
  return fija ? path.resolve(RAIZ, fija) : path.join(RAIZ, 'web', 'data');
}

/** La ruta de un archivo de datos por su nombre ("feriados-piezas.json"). */
export const rutaDeDatos = (nombre) => path.join(carpetaDeDatos(), nombre);
