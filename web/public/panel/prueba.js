// El modo de prueba del panel del celular (radarbalcarce.com/panel/?demo): notas
// inventadas, sin GitHub y sin guardar nada. Sirve para ver cómo se usa y para
// revisarlo en un navegador sin una llave de verdad.

import { crearLlaves } from './cifrado.js';

const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const CUERPO = 'El Concejo Deliberante aprobó por mayoría el presupuesto 2027 en la sesión del martes. La ordenanza prevé obras de cloacas en los barrios Norte, Sur y Villa Dolores, y un aumento de la partida de salud, según informó el cuerpo.\n\nEl intendente había enviado el proyecto en octubre. La oposición votó en contra y pidió más fondos para caminos rurales.\n\nLa próxima sesión será el martes 13 de octubre.';

let llaves = null;
export async function llavesDePrueba() {
  llaves ??= await crearLlaves();
  return llaves;
}

export function clienteDePrueba() {
  const archivos = {
    'web/data/portada.json': {
      generado: hace(12),
      notas: [
        { id: 'p1', titulo: 'El Concejo aprueba el presupuesto 2027', copete: 'La ordenanza prevé obras de cloacas en tres barrios y más fondos para salud.', cuerpo: CUERPO, seccion: 'Política', fecha: hace(90), slug: 'el-concejo-aprueba-el-presupuesto-2027-p1', fuentesConsultadas: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/a' }] },
        { id: 'p2', titulo: 'Ferroviarios gana el clásico y queda puntero', copete: 'Ganó 2 a 1 en el estadio de la Liga.', cuerpo: CUERPO, seccion: 'Fútbol', fecha: hace(200), slug: 'ferroviarios-gana-el-clasico-p2' },
      ],
      pendientes: [{ id: 'e1', titulo: null, seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"' }],
    },
    'web/data/esperando-cuerpo.json': { notas: [{ id: 's1', titulo: 'Cortan el agua el jueves en el barrio Norte', copete: 'Por una obra en la red.', seccion: 'Balcarce', fecha: hace(40), fuentes: [{ medio: 'Municipalidad de Balcarce', enlace: 'https://example.com/b' }] }] },
    'web/data/celular-decisiones.json': { notas: {}, redes: {} },
    'web/data/correcciones.json': { notas: {} },
    'web/data/celular-llaves.json': { llaves: [] },
    'web/data/celular-borradores.json': { version: 1, borradores: {} },
    'web/data/archivo.json': { notas: [] },
  };
  const pendientesClaros = [
    { id: 'e1', titulo: 'Detienen a un hombre por el robo de una moto en la 226', resumen: 'La Policía informó la detención de un hombre de 34 años acusado de robar una moto en la ruta 226.', seccion: 'Policiales', motivo: 'necesita ojo humano: "detenido"', fecha: hace(55), fuentes: [{ medio: 'Un medio de Balcarce', enlace: 'https://example.com/c' }] },
  ];
  return {
    async leer(ruta) {
      if (ruta === 'web/data/celular-pendientes.json') {
        // En la prueba el "sobre" viene abierto: lo arma cifrado.js con la llave de prueba.
        const { cerrarParaPrueba } = await import('./prueba-sobre.js');
        return { json: await cerrarParaPrueba({ pendientes: pendientesClaros }, await llavesDePrueba()), sha: 'x' };
      }
      return { json: structuredClone(archivos[ruta] ?? {}), sha: 'x' };
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
