// El color de cada equipo de la Fórmula 1 (el de su auto), para marcar las tablas del campeonato. Es sólo color: no se usan logos de las marcas.
// Se reconoce por una parte del nombre que trae la fuente ("Alpine F1 Team", "RB F1 Team"…); si un equipo nuevo no está acá, la fila sale sin color.
const COLORES = [
  ['mercedes', '#27c2a8'],
  ['ferrari', '#e8002d'],
  ['red bull', '#3671c6'],
  ['mclaren', '#ff8000'],
  ['alpine', '#ff87bc'],
  ['rb f1', '#6692ff'],
  ['racing bulls', '#6692ff'],
  ['haas', '#9aa0a6'],
  ['audi', '#c4122f'],
  ['aston', '#229971'],
  ['williams', '#64c4ff'],
  ['cadillac', '#3a3f4a'],
];

/** El color del equipo (o null si no lo conocemos). */
export function colorDelEquipo(nombre) {
  const n = String(nombre ?? '').toLowerCase();
  return COLORES.find(([clave]) => n.includes(clave))?.[1] ?? null;
}
