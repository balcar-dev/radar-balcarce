// Dibuja una de cada placa para revisarlas todas juntas.
//   node reels/revisar-placas.mjs
// Es una herramienta de control: usa datos de ejemplo pensados para que
// salte lo que suele romperse — nombres largos, muchos días, títulos que
// no entran.
import path from 'node:path';
import {
  placaClima, placaFarmacia, placaUtiles, placaAgenda, placaNoticia, aPng,
} from './placa.mjs';


const casos = [
  ['rev-clima', placaClima({
    temp: 17, cielo: 'Mayormente despejado', max: 23, min: 10,
    fecha: 'Sábado, 19 de septiembre',
    cajas: [
      { titulo: 'VIENTO', valor: 'N 12 km/h' },
      { titulo: 'LLUVIA', valor: '0%' },
      { titulo: 'SENSACIÓN', valor: '16°' },
    ],
  })],
  ['rev-farmacia', placaFarmacia({
    detalle: [{ nombre: 'San José', direccion: 'Av. Kelly N° 993 e/ 29 y 31', telefono: '42-1759' },
      { nombre: 'Vuotto', direccion: 'Calle 17 N° 1240', telefono: '42-5588' }],
    farmacias: ['SAN JOSE', 'VUOTTO'], dia: 19, diaSemana: 'SÁBADO',
  })],
  ['rev-utiles', placaUtiles({
    grupos: [
      { categoria: 'Emergencias', items: [{ nombre: 'Emergencias (línea única)', numero: '911' }, { nombre: 'Bomberos', numero: '100' }] },
      { categoria: 'Salud', items: [{ nombre: 'Hospital · conmutador', numero: '(02266) 42-2017' }] },
      { categoria: 'Seguridad', items: [{ nombre: 'Comisaría de la Mujer', numero: '(02266) 43-1042' }] },
    ],
  })],
  ['rev-agenda', placaAgenda({
    eventos: [
      { cuando: 'sábado 21:00', nombre: 'Por la huella de Berho · Encuentro surero', lugar: 'Cerro El Triunfo' },
      { cuando: 'domingo 10:00', nombre: 'Feria de productores', lugar: 'Plaza Libertad' },
      { cuando: 'domingo 18:00', nombre: 'Recorrido guiado por el casco histórico', lugar: 'Museo Histórico de Balcarce' },
    ],
  })],
  ['rev-noticia-corta', placaNoticia({
    titulo: 'Ferroviarios campeón', seccion: 'Deportes', cuando: 'hace 2 horas',
  })],
  ['rev-noticia-larga', placaNoticia({
    titulo: 'La Dirección de Juventud organiza una jornada especial por el Día del Estudiante en el Cerro El Triunfo',
    seccion: 'Cultura y agenda', cuando: 'hace 5 horas',
  })],
];

for (const [nombre, svg] of casos) {
  aPng(svg, path.join(import.meta.dirname, 'salida', `${nombre}.png`));
  console.log('  ', nombre);
}
