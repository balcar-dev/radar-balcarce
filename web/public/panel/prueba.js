// El modo de prueba del panel del celular (radarbalcarce.com/panel/?demo): notas
// inventadas, sin GitHub y sin guardar nada. Sirve para ver cómo se usa y para
// revisarlo en un navegador sin una llave de verdad. Arma los mismos archivos
// que arma la web (celular-pendientes.json versión 2, celular-estado.json,
// redes.json), así la prueba ejercita también cómo se abren.

import { crearLlaves } from './cifrado.js';
import { hoyEnBalcarce } from './textos.js';

const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const CUERPO = 'El Concejo Deliberante aprobó por mayoría el presupuesto 2027 en la sesión del martes. La ordenanza prevé obras de cloacas en los barrios Norte, Sur y Villa Dolores, y un aumento de la partida de salud, según informó el cuerpo.\n\nEl intendente había enviado el proyecto en octubre. La oposición votó en contra y pidió más fondos para caminos rurales.\n\nLa próxima sesión será el martes 13 de octubre.';

let llaves = null;
export async function llavesDePrueba() {
  llaves ??= await crearLlaves();
  return llaves;
}

/** Lo que espera a una persona, como lo arma paraDecidir (panel/celular-datos.mjs). */
const PENDIENTES = [
  {
    id: 'e1', titulo: 'Detienen a un hombre por el robo de una moto en la 226', seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"', fecha: hace(55), local: true,
    resumen: 'La Policía informó la detención de un hombre de 34 años acusado de robar una moto en la ruta 226. El vehículo fue recuperado.',
    fuentes: [
      { medio: 'Un medio de Balcarce', enlace: 'https://example.com/c', fecha: hace(60), oficial: false, resumen: 'Un hombre de 34 años fue detenido por el robo de una moto en la ruta 226. La moto apareció horas después.' },
      { medio: 'Policía de la Provincia', enlace: 'https://example.com/d', fecha: hace(80), oficial: true, resumen: 'Personal policial aprehendió a un masculino de 34 años sindicado como autor del robo de un motovehículo.' },
    ],
    ficha: { ambito: 'balcarce', impacto: 'directo', importancia: 'media', porque: 'Es un hecho policial en la ruta de acceso a la ciudad.' },
  },
  {
    id: 'e3', titulo: 'Sortean dos entradas para el recital del sábado en el Club', seccion: 'Cultura y agenda', motivo: 'parece promoción, no noticia: "sorteo"', fecha: hace(140),
    resumen: 'Una radio sortea entradas para el recital del sábado en el Club Social.',
    fuentes: [{ medio: 'Una radio de Balcarce', enlace: 'https://example.com/e', fecha: hace(150), oficial: false, resumen: 'Participá del sorteo de dos entradas para el recital del sábado.' }],
  },
  {
    id: 'e2', titulo: 'Un choque en la ruta 55 deja dos heridos', seccion: 'Policiales', motivo: 'necesita ojo humano: "heridos"', fecha: hace(300),
    resumen: 'Dos personas resultaron heridas en un choque entre un auto y una camioneta en la ruta 55.',
    fuentes: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/f', fecha: hace(310), oficial: false, resumen: 'Choque entre un auto y una camioneta: dos heridos leves.' }],
    decision: { estado: 'descartada', por: 'Prueba', cuando: hace(200) },
  },
];

/** Lo que retiró una persona, como lo arma paraLaPapelera. */
const PAPELERA = [
  {
    id: 'r1', titulo: 'Corte de calle por obras en la avenida Favaloro', copete: 'La Municipalidad corta el tránsito entre la 13 y la 15 hasta el viernes.', cuerpo: CUERPO,
    seccion: 'Balcarce', fecha: hace(2000), slug: 'corte-de-calle-por-obras-en-la-avenida-favaloro', deIA: true, retirada: hace(900), por: 'Hernán', motivo: 'el corte se suspendió', desde: 'panel',
  },
];

export function clienteDePrueba() {
  const hoy = hoyEnBalcarce();
  const archivos = {
    'web/data/portada.json': {
      generado: hace(12),
      notas: [
        { id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', copete: 'La ordenanza prevé obras de cloacas en tres barrios y más fondos para salud.', cuerpo: CUERPO, seccion: 'Política', fecha: hace(90), slug: 'el-concejo-aprueba-el-presupuesto-2027', guion: 'x', fuentesConsultadas: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/a' }] },
        { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', copete: 'Ganó 2 a 1 en el estadio de la Liga.', cuerpo: CUERPO, seccion: 'Fútbol', fecha: hace(200), slug: 'ferroviarios-gana-el-clasico', guion: 'x' },
        { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', copete: 'Será de 8 a 12 en el barrio Norte por trabajos en la red.', cuerpo: CUERPO, seccion: 'Balcarce', fecha: hace(40), slug: 'la-cooperativa-anuncia-un-corte-de-luz', guion: 'x' },
      ],
      pendientes: [{ id: 'e1', titulo: null, seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"' }, { id: 'e3', titulo: 'Sortean dos entradas para el recital del sábado en el Club', seccion: 'Cultura y agenda', motivo: 'parece promoción, no noticia: "sorteo"' }],
    },
    'web/data/esperando-cuerpo.json': {
      intentosMaximos: 3,
      notas: [
        { id: 's1', titulo: 'Cortan el agua el jueves en el barrio Norte', copete: 'Por una obra en la red, el jueves no habrá agua de 9 a 14 en el barrio Norte.', seccion: 'Balcarce', fecha: hace(40), intentos: 1, fuentes: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/b' }] },
        { id: 's2', titulo: 'Abre la inscripción a los talleres culturales de octubre', copete: 'La Casa de la Cultura abre la inscripción a los talleres de octubre.', seccion: 'Cultura y agenda', fecha: hace(400), intentos: 3, fuentes: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/g' }] },
      ],
    },
    'web/data/celular-decisiones.json': { notas: { e2: { estado: 'descartada', por: 'Prueba', cuando: hace(200), motivo: 'descartada desde el celular' } }, redes: {} },
    'web/data/correcciones.json': { notas: {} },
    'web/data/retiradas.json': { notas: {} },
    // La pestaña Fechas: un par de días y de feriados de ejemplo.
    'web/data/efemerides-candidatas.json': {
      generado: hace(60), desde: '2026-10-05', dias: {
        '2026-10-05': { diaSemana: 'lunes', candidatas: [
          { id: 'c1', origen: 'portal', estilo: 'nacimiento', anio: 1901, hace: 125, titulo: 'Nace el poeta Carlos Mastronardi', texto: 'Nace en Gualeguay (Entre Ríos) el poeta y ensayista Carlos Mastronardi.', marcas: [], puntaje: 66, fuente: 'Portal Argentina de Wikipedia' },
          { id: 'c2', origen: 'feed', estilo: 'curioso', anio: 1952, hace: 74, titulo: 'Primera patente del código de barras', texto: 'En Estados Unidos sale a la luz la primera patente del código de barras.', marcas: [], puntaje: 51, fuente: 'https://es.wikipedia.org/wiki/C%C3%B3digo_de_barras' },
          { id: 'c3', origen: 'portal', estilo: 'historia', anio: 1904, hace: 122, titulo: 'Asume la presidencia Manuel Quintana', texto: 'Manuel Quintana asume la presidencia de Argentina.', marcas: ['política'], puntaje: 30, fuente: 'Portal Argentina de Wikipedia' },
          { id: 'c4', origen: 'especial', estilo: 'dia-especial', anio: null, hace: null, titulo: 'Día Mundial del Algodón', texto: 'Día Mundial del Algodón.', marcas: [], puntaje: 22, fuente: 'Wikipedia: días especiales' },
        ] },
        '2026-10-06': { diaSemana: 'martes', candidatas: [
          { id: 'c5', origen: 'curada', estilo: 'balcarce', anio: null, hace: null, titulo: 'Fundación del pueblo de Balcarce', texto: 'El 22 de junio de 1876 se fundó el pueblo de San José de Balcarce.', marcas: [], puntaje: 120, fuente: 'https://es.wikipedia.org/wiki/Balcarce_(ciudad)', datos: [{ texto: 'Fue declarado ciudad el 15 de septiembre de 1949.', fuente: 'https://es.wikipedia.org/wiki/Balcarce_(ciudad)' }] },
        ] },
      },
    },
    'web/data/feriados-piezas.json': {
      generado: hace(60), feriados: [
        { fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'trasladable', estado: 'propuesta', enfoque: 'La historia del nombre de la fecha, en tono institucional, y el censo 2022.', datos: [{ texto: 'El decreto 1584/2010 le cambió el nombre.', fuente: 'https://servicios.infoleg.gob.ar/infolegInternet/anexos/170000-174999/174389/norma.htm' }, { texto: 'En el censo 2022, 1.306.730 personas se reconocieron indígenas o descendientes.', fuente: 'https://censo.gob.ar/' }], citas: [], revisaUnaPersona: false },
        { fecha: '2026-12-08', nombre: 'Día de la Inmaculada Concepción de María', tipo: 'inamovible', estado: 'propuesta', enfoque: 'Sobrio y corto: el dogma de 1854.', datos: [], citas: [], revisaUnaPersona: false },
      ],
    },
    'web/data/efemerides-elegidas.json': { dias: {}, feriados: {} },
    'web/data/celular-llaves.json': { llaves: [] },
    'web/data/celular-borradores.json': { version: 1, borradores: {} },
    'web/data/archivo.json': { notas: [] },
    'web/data/celular-estado.json': {
      generado: hace(12),
      portada: 3,
      archivo: 1240,
      esperandoCuerpo: 2,
      redes: {
        generado: hace(12),
        activas: true,
        piezas: [
          { nombre: 'clima-manana', tipo: 'historia', hora: '07:30', que: 'El clima de la mañana', voz: 'locutora', ventana: 240 },
          { nombre: 'noticia1', tipo: 'reel', hora: '10:00', que: 'El repaso de la mañana', voz: 'locutor', ventana: 300 },
          { nombre: 'noticia2', tipo: 'reel', hora: '15:00', que: 'El repaso de la tarde', voz: 'locutora', ventana: 300 },
          { nombre: 'farmacia', tipo: 'historia', hora: '19:00', que: 'La farmacia de turno', voz: 'locutor', ventana: 300 },
          { nombre: 'clima-noche', tipo: 'historia', hora: '20:00', que: 'Cómo sigue el día (el clima de la noche)', voz: 'locutora', ventana: 240 },
          { nombre: 'podcast', tipo: 'reel', hora: '20:30', que: 'El repaso del día', voz: 'locutor', ventana: 210 },
        ],
        repasos: [
          { nombre: 'noticia1', titulo: 'El repaso de la mañana', hora: '10:00', voz: 'locutor', salio: null, segundos: null, notas: [{ id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }, { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', seccion: 'Fútbol' }] },
          { nombre: 'noticia2', titulo: 'El repaso de la tarde', hora: '15:00', voz: 'locutora', salio: null, segundos: 44, notas: [{ id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', seccion: 'Política' }, { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }] },
          { nombre: 'podcast', titulo: 'El repaso del día', hora: '20:30', voz: 'locutor', salio: null, segundos: 52, notas: [{ id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', seccion: 'Política' }, { id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce' }, { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', seccion: 'Fútbol' }] },
        ],
        facebook: {
          cola: [{ id: 'p3', titulo: 'La Cooperativa anuncia un corte de luz para el miércoles', seccion: 'Balcarce', marcada: false }],
          porDia: 5, minutosEntrePosteos: 90, edadMaximaHoras: 8, desdeHora: 8, hastaHora: 22,
        },
      },
    },
    'web/data/redes.json': {
      facebook: { f1: { cuando: hace(150), titulo: 'El Municipio abre la inscripción a la Expo Balcarce' } },
      instagram: { [`${hoy}/clima-manana`]: { cuando: hace(600), nombre: 'clima-manana' } },
      instagramFeed: { f1: { cuando: hace(149) } },
    },
  };
  return {
    async leer(ruta) {
      if (ruta === 'web/data/celular-pendientes.json') {
        // El sobre de la prueba se cierra acá con la llave de prueba, uno por nota, como lo cierra GitHub.
        const { cerrarParaPrueba } = await import('./prueba-sobre.js');
        const l = await llavesDePrueba();
        const cerrar = async (lista) => Object.fromEntries(await Promise.all(lista.map(async (n) => [n.id, await cerrarParaPrueba(n, l)])));
        return {
          json: {
            version: 2, generado: hace(12), cuantas: PENDIENTES.length, orden: PENDIENTES.map((n) => n.id), notas: await cerrar(PENDIENTES),
            retiradas: await cerrar(PAPELERA), ordenRetiradas: PAPELERA.map((n) => n.id),
          },
          sha: 'x',
        };
      }
      if (!(ruta in archivos)) {
        const { ErrorDeGitHub } = await import('./github.js');
        throw new ErrorDeGitHub(404, 'Not Found');
      }
      return { json: structuredClone(archivos[ruta]), sha: 'x' };
    },
    async guardar(ruta, cambiar) {
      archivos[ruta] = cambiar(structuredClone(archivos[ruta] ?? {})) ?? archivos[ruta];
      return archivos[ruta];
    },
    async puedeEscribir() { return true; },
    async disparar(workflow, inputs) {
      if (workflow !== 'panel.yml') return;
      const { cerrarParaPrueba } = await import('./prueba-sobre.js');
      const borrador = {
        id: inputs.id, ok: false, pedido: inputs.pedido,
        texto: { titulo: 'La Policía detiene a un hombre por el robo de una moto', copete: 'Tiene 34 años. Según la Policía, habría robado la moto en la ruta 226.', cuerpo: 'Según informó la Policía, un hombre de 34 años fue detenido el lunes acusado de robar una moto en la ruta 226. De acuerdo con la denuncia, el hecho habría ocurrido a la tarde.\n\nLa moto fue recuperada y devuelta a su dueño. La causa quedó a cargo de la fiscalía de turno.' },
        problemas: ['el cuerpo tiene 52 palabras: hacen falta 70'], sacadas: 1, aviso: 'necesita ojo humano: "detenido"',
      };
      archivos['web/data/celular-borradores.json'].borradores[inputs.id] = { ...(await cerrarParaPrueba(borrador, await llavesDePrueba())), cuando: new Date().toISOString() };
      this.marca = inputs.marca;
    },
    async corridas() { return [{ display_title: `Panel · escribir · ${this.marca}`, status: 'completed', conclusion: 'success' }]; },
  };
}
