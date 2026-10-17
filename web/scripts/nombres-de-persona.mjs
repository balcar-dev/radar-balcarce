// Los nombres de persona que parece haber en un texto (17/10/2026: salió de ingesta/foto-ia.mjs, que nunca se conectó y se borró; era lo
// único que se usaba de ese módulo). Lo usa el control del prompt de las ilustraciones (problemaDelPrompt, web/scripts/ilustrar-notas.mjs):
// un prompt que nombra a alguien de la nota se descarta. Pasarse de estricto sólo cuesta una ilustración, nunca la de una persona real.
// Sin dependencias.

const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Palabras de instituciones, lugares y organizaciones que NO son el nombre de una persona aunque lleven mayúscula.
const NO_PERSONA = new Set(('municipalidad municipal concejo club banco senado congreso gobierno provincia provincial nacion nacional ministerio argentina buenos aires mar plata balcarce '
  + 'tandil necochea miramar nicolas junin cordoba rosario mendoza espana estados unidos brasil chile uruguay europa instituto escuela colegio hospital cementerio comando sindicato copa liga '
  + 'torneo fiesta dia radio tecnica universidad facultad bomberos policia camara ley plaza campo desarrollo proyecto sociedad cooperativa asociacion federacion consejo secretaria direccion centro '
  + 'casa palacio teatro cine museo biblioteca iglesia parroquia estadio autodromo circuito gran premio turismo formula super mundial sudamericana libertadores argentino argentinos rural '
  + 'maxivoley voley basquet rugby tenis mesa futbol atletismo patin natacion gimnasia ciclismo trail enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre '
  + 'lunes martes miercoles jueves viernes sabado domingo anses indec afip arca bcra pami inteligencia artificial banco central bolsa comercio expo feria exposicion festival nacional').split(' '));
const DETERMINANTES = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'en', 'con', 'por', 'para', 'tras', 'desde', 'hasta', 'ante', 'sobre', 'se', 'su', 'sus', 'nuevo', 'nueva', 'llega', 'llegan', 'este', 'esta']);
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'van', 'von', 'da', 'di']);
// Figuras conocidas que las notas nombran sólo por el apellido.
const FIGURAS = new Set(('milei caputo kicillof macri bullrich villarruel messi colapinto canapino scaloni riquelme tapia fernandez cristina sturzenegger francos adorni menem massa larreta posse zamora '
  + 'maradona fangio pichetto santilli').split(' '));
const esMayuscula = (t) => /^\p{Lu}[\p{L}'’-]*$/u.test(t) && !/^\p{Lu}{3,}$/u.test(t);

/** Los nombres de persona que parece haber en un texto (dos palabras seguidas con mayúscula que no son una institución ni un lugar) y las
 *  figuras conocidas con sólo el apellido. */
export function nombresDePersona(texto) {
  const tokens = String(texto ?? '').split(/\s+/).map((t) => t.replace(/^[«"'“”‘’(\[¿¡]+|[»"'“”‘’),.:;!?\]]+$/g, '')).filter(Boolean);
  const nombres = [];
  let corrida = [];
  const cerrar = () => {
    while (corrida.length && (DETERMINANTES.has(plano(corrida[0])) || CONECTORES.has(plano(corrida[0])))) corrida.shift();
    while (corrida.length && CONECTORES.has(plano(corrida.at(-1)))) corrida.pop();
    if (corrida.filter(esMayuscula).length >= 2 && !corrida.some((t) => NO_PERSONA.has(plano(t)))) nombres.push(corrida.join(' '));
    corrida = [];
  };
  for (const t of tokens) {
    if (esMayuscula(t)) corrida.push(t);
    else if (corrida.length && CONECTORES.has(plano(t))) corrida.push(t);
    else cerrar();
  }
  cerrar();
  for (const t of tokens) if (FIGURAS.has(plano(t)) && !nombres.some((n) => plano(n).includes(plano(t)))) nombres.push(t);
  return [...new Set(nombres)];
}
