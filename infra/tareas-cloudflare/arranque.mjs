// Lo primero que corre en el Worker de tareas (lo importa entrada.mjs antes que nada): deja los dos criterios al alcance de los programas del proyecto,
// que los leen del disco al cargarse. Sólo tiene sentido en un Worker (importa archivos .md como texto, cosa que Node no hace): en las pruebas se
// usa criterios.mjs directamente.
import fs from 'node:fs';
import criterioEditorial from '../../CRITERIO-EDITORIAL.md';
import criterioRedes from '../../CRITERIO-REDES.md';
import { instalarLecturaDelCriterio } from './criterios.mjs';

instalarLecturaDelCriterio(fs, { 'CRITERIO-EDITORIAL.md': criterioEditorial, 'CRITERIO-REDES.md': criterioRedes });
