import { pathToFileURL } from 'node:url';
const ing = await import(pathToFileURL(`${process.argv[2]}/ingesta/ingesta.mjs`).href);
for (const t of ['Dos niñas quedaron internadas tras el choque en la ruta',
  'Detuvieron a dos chicos de 15 y 16 años por un robo',
  'Un estudiante de la Escuela Secundaria 3 fue agredido por compañeros',
  'Los nenes del jardín fueron evacuados por un incendio',
  'Encontraron a la joven que era buscada desde el sábado',
  'Hijo de un conocido comerciante quedó detenido']) {
  console.log(t, '→', JSON.stringify(ing.semaforoDelTexto(t, { conMuerte: true })));
}
