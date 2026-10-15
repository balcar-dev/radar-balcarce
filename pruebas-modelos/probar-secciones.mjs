// Prueba un esquema de secciones con un modelo de decisiones: DOS preguntas separadas.
//   1. seccion: de qué TRATA la nota (por tema, sin mirar el lugar)
//   2. ambito:  DÓNDE pasa (Balcarce / La zona / De afuera)
// más "publicar". Compara con el esquema de hoy (11 secciones, "Balcarce" como una sección más).
//   node pruebas-modelos/probar-secciones.mjs --modelo=inception/mercury-decide
// Guarda secciones-<modelo>.json con las probabilidades. Clave: OPENROUTER_API_KEY (nunca se imprime).

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MODELO = args.modelo ?? 'inception/mercury-decide';
const POR_MINUTO = Number(args['por-minuto'] ?? 120);
const SOLO = args.solo ? Number(args.solo) : Infinity;
const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta OPENROUTER_API_KEY. Frené.'); process.exit(1); }

// El esquema propuesto: secciones por TEMA, claras y que no se pisen.
export const SECCIONES = {
  Política: 'Gobierno, intendente, Concejo Deliberante, legislaturas, elecciones, leyes, partidos y gremios cuando el hecho es político.',
  Policiales: 'Delitos, detenciones, robos, accidentes, incendios, bomberos y justicia penal.',
  'Economía y trabajo': 'Precios, dólar, inflación, empleo, empresas, combustibles, impuestos, tarifas, jubilaciones y salarios.',
  Agro: 'Campo, papa, ganadería, cosechas, INTA y clima para el productor.',
  Fútbol: 'Todo el fútbol: liga de Balcarce, clubes argentinos, Selección, jugadores.',
  Automovilismo: 'Autos y motos de carrera que no son Fórmula 1: TC, Turismo Nacional, karting, rally, MotoGP, el autódromo Fangio.',
  'Fórmula 1': 'La Fórmula 1: carreras, pilotos, Colapinto, escuderías.',
  Deportes: 'Todos los demás deportes: básquet, vóley, paleta, tenis, rugby, hockey, atletismo, boxeo, pádel.',
  Tecnología: 'Tecnología, inteligencia artificial, internet, celulares, aplicaciones, ciberseguridad.',
  'Ciencia y ambiente': 'Ciencia, espacio, medio ambiente, energía, naturaleza.',
  Salud: 'Hospital, campañas de salud, enfermedades, salud pública, nutrición.',
  Educación: 'Escuelas, universidades, docentes, paros docentes, becas, proyectos educativos.',
  'Cultura y espectáculos': 'Música, teatro, cine, televisión, libros, muestras, recitales, eventos y agenda cultural, famosos.',
  'Turismo y gastronomía': 'Turismo, viajes, sierras, paseos, fiestas gastronómicas, restaurantes.',
  'Sociedad y servicios': 'Vecinos, instituciones, clubes, solidaridad, obras, cortes de luz o agua, trámites, horarios, género, religión y todo lo social que no es de otra sección.',
  Mundo: 'Lo que pasa en otros países, cuando tiene conexión argentina.',
  'Esports y juegos': 'Videojuegos y deportes electrónicos.',
};
const AMBITOS = {
  balcarce: 'El hecho pasa en el partido de Balcarce: la ciudad, Napaleofú, Ramos Otero, San Agustín, Los Pinos, Villa Laguna La Brava, o las rutas 226 y 55 dentro del partido.',
  zona: 'Toca a Balcarce desde afuera: la papa y el campo del sudeste papero, tramos de las rutas 226 y 55 fuera del partido, o vecinos inmediatos si involucra gente de Balcarce.',
  afuera: 'Todo lo demás: otras ciudades (Mar del Plata, Tandil, Necochea), el país y el exterior. Que una nota nombre a Balcarce en una lista no la hace de Balcarce.',
};
const REGLA = 'La sección se elige por el TEMA, sin mirar el lugar: un robo en Balcarce es de la sección Policiales, y un partido de Ferroviarios es Fútbol. El lugar se responde aparte, en el ámbito. Una nota copiada de un medio nacional por un medio de Balcarce, sin nada de acá, es de afuera.';

const perfil = fs.readFileSync(path.join(AQUI, '../ingesta/perfil-balcarce.md'), 'utf8');
const notas = JSON.parse(fs.readFileSync(path.join(AQUI, 'muestra-200.json'), 'utf8')).notas.slice(0, SOLO);
const entrada = (n) => ({ titulo: n.titulo, resumen: `${n.resumen ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 500), medio: n.medio, ciudad_del_medio: n.ciudad_del_medio });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function una(n) {
  const t0 = Date.now();
  for (let intento = 0; intento < 2; intento += 1) {
    const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}` },
      body: JSON.stringify({
        model: MODELO,
        state: { regla: REGLA, perfil_de_balcarce: perfil, nota: entrada(n) },
        questions: {
          seccion: { type: 'choice', instructions: '¿De qué TEMA trata la nota? Elegí una sección.', criteria: SECCIONES },
          ambito: { type: 'choice', instructions: '¿Dónde pasa el hecho?', criteria: AMBITOS },
          publicar: { type: 'noul', instructions: '¿Radar Balcarce debe publicar esta nota? No se publica: publicidad, chimentos, horóscopo, loterías, lo del extranjero sin conexión argentina, policiales de afuera, ni lo que no tiene relación con Balcarce.', criteria: { false: 'No debe publicarse.', true: 'Debe publicarse.' } },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    }).catch((e) => ({ status: 0, json: async () => ({ error: { message: String(e.message) } }) }));
    if (res.status === 429 && intento === 0) { await espera(20000); continue; }
    const j = await res.json().catch(() => ({}));
    return { status: res.status, ms: Date.now() - t0, answers: j.answers ?? null, error: res.status === 200 ? null : (j.error?.message ?? 'error'), uso: j.usage ?? null };
  }
  return { status: 0, ms: Date.now() - t0, answers: null, error: 'sin respuesta' };
}

const salida = { modelo: MODELO, fecha: new Date().toISOString(), notas: {} };
const destino = path.join(AQUI, `secciones-${MODELO.replace(/[/:\\]/g, '_')}.json`);
const intervalo = Math.ceil(60000 / POR_MINUTO);
let ultimo = 0; let n = 0;
for (const nota of notas) {
  const falta = ultimo + intervalo - Date.now();
  if (falta > 0) await espera(falta);
  ultimo = Date.now();
  const r = await una(nota);
  n += 1;
  salida.notas[nota.id] = r;
  if (n % 20 === 0) { console.log(`${n}/${notas.length}`); fs.writeFileSync(destino, JSON.stringify(salida)); }
}
fs.writeFileSync(destino, `${JSON.stringify(salida)}\n`);
console.log(`Listo: ${Object.values(salida.notas).filter((x) => x.answers).length} de ${notas.length} contestadas. ${path.relative(process.cwd(), destino)}`);
