// La página de cada evento de la agenda (web/lib/eventos.js): la dirección,
// el texto que se arma con los datos, qué va en las listas, qué se guarda en
// web/data/agenda.json, el archivo para agendarlo y los datos para Google.
//
// Todo sin red: son funciones de una entrada y una salida.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  claveDeEvento, parteDeEvento, rutaDeEvento, claveDeRuta, nombreDeEvento, partesDeFecha, instante, terminaEl,
  yaPaso, tienePagina, cuandoEs, dondeEs, copeteDeEvento, entradaDe, firmaDeEvento, mismoEvento, proximos,
  actualizarAgenda, comoAgendaJson, rangoDeCalendario, enlaceGoogleCalendar, icsDeEvento, fichaDeEvento,
  confirmacionDeAnual, DIAS_DESPUES, fuentesDeEvento, detallesDeEvento, descripcionPropia,
} from '../web/lib/eventos.js';
import { slugDe } from '../web/lib/ruta.js';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// Un evento del municipio, como lo deja ingesta/agenda.mjs.
const postre = {
  id: 'muni-22540',
  nombre: '22° FIESTA NACIONAL DEL POSTRE',
  desde: '2026-10-09 12:30:00',
  hasta: '2026-10-12 18:00:00',
  lugar: 'SOCIEDAD RURAL DE BALCARCE',
  direccion: 'AVENIDA CENTENARIO 2175',
  localidad: 'Balcarce',
  costo: null,
  organizador: 'MUNICIPIO DE BALCARCE',
  url: 'https://balcarce.gob.ar/event/fiesta-nacional-del-postre/',
  fuente: 'Municipalidad de Balcarce',
};
const AHORA = Date.parse('2026-09-25T12:00:00-03:00');
const DIA = 24 * 3600e3;

// ------------------------------------------------------------ la dirección

test('cada evento tiene su dirección: /agenda/nombre-en-guiones-clave', () => {
  assert.equal(claveDeEvento('muni-22540'), 'muni22540', 'la clave no lleva guiones: se lee desde el último');
  assert.equal(rutaDeEvento(postre), '/agenda/22-fiesta-nacional-del-postre-muni22540');
  assert.equal(claveDeRuta('22-fiesta-nacional-del-postre-muni22540'), 'muni22540');
  assert.equal(claveDeRuta(parteDeEvento({ id: 'manual-1727300000000', nombre: 'Feria' })), 'manual1727300000000');
});

test('la dirección queda fija aunque la fuente le cambie el nombre al evento', () => {
  const [primero] = actualizarAgenda({ municipio: [postre], ahora: AHORA });
  const [despues] = actualizarAgenda({
    anterior: [primero], municipio: [{ ...postre, nombre: 'Fiesta del Postre 2026 (nueva fecha)' }], ahora: AHORA,
  });
  assert.equal(despues.slug, primero.slug);
  assert.equal(rutaDeEvento(despues), rutaDeEvento(primero));
});

// ---------------------------------------------------------- el texto (plantilla)

test('un nombre en mayúsculas se escribe como se escribe, y las siglas quedan', () => {
  assert.equal(nombreDeEvento('22° FIESTA NACIONAL DEL POSTRE'), '22° Fiesta Nacional del Postre');
  assert.equal(nombreDeEvento('TC PICK UP BALCARCE'), 'TC Pick Up Balcarce');
  assert.equal(nombreDeEvento('UTTD TIERRAS DEL DIABLO'), 'UTTD Tierras del Diablo');
  assert.equal(nombreDeEvento('Feria de artesanos en la plaza'), 'Feria de artesanos en la plaza', 'lo bien escrito no se toca');
});

test('cuándo es, en castellano: un día, con horario, y varios días', () => {
  assert.equal(cuandoEs({ desde: '2026-10-03 17:00:00', hasta: '2026-10-03 19:00:00' }), 'el sábado 3 de octubre, de 17 a 19');
  assert.equal(cuandoEs({ desde: '2026-10-03 20:30:00' }), 'el sábado 3 de octubre a las 20.30');
  assert.equal(cuandoEs({ desde: '2026-10-03' }), 'el sábado 3 de octubre');
  assert.equal(cuandoEs(postre), 'del viernes 9 al lunes 12 de octubre, desde las 12.30');
  assert.equal(cuandoEs({ desde: '2026-09-30 17:00:00', hasta: '2026-10-02 19:00:00' }), 'del miércoles 30 de septiembre al viernes 2 de octubre, desde las 17');
  assert.equal(cuandoEs({ desde: '2026-10-03 00:00:00', hasta: '2026-10-03 23:59:00', todoElDia: true }), 'el sábado 3 de octubre');
});

test('el copete dice cuándo y dónde con los datos, sin agregar nada', () => {
  assert.equal(
    copeteDeEvento(postre),
    'Del viernes 9 al lunes 12 de octubre, desde las 12.30, en Sociedad Rural de Balcarce (Avenida Centenario 2175).',
  );
  assert.equal(copeteDeEvento({ desde: '2026-10-03' }), 'Sábado 3 de octubre, en Balcarce.');
  assert.equal(dondeEs({ lugar: 'Club', localidad: 'San Agustín' }), 'Club, San Agustín', 'otra localidad del partido se nombra');
});

test('la entrada no se inventa: si la fuente no la dijo, no hay entrada', () => {
  assert.equal(entradaDe(postre), null);
  assert.equal(entradaDe({ costo: 'Gratis' }), 'Gratis');
  assert.equal(entradaDe({ costo: 'entrada libre y gratuita' }), 'Gratis');
  assert.equal(entradaDe({ costo: '$5.000' }), '$5.000');
  // Y la página lo dice con todas las letras.
  assert.match(leer('web/app/agenda/[id]/page.js'), /No la informaron\. Consultá el valor con quien organiza\./);
});

// ------------------------------------------------------------ quién la escribió

test('cada ficha dice quién la hizo en UNA línea corta, y lo mismo en los datos para Google (regla 7)', () => {
  const muni = firmaDeEvento(postre);
  assert.equal(muni.texto, 'Ficha con los datos de la Municipalidad de Balcarce');
  assert.ok(!/revisi[oó]n humana|revis[oó] una persona|inteligencia artificial/i.test(muni.texto), 'nada de párrafos sobre quién la escribió o la revisó');
  assert.ok(muni.texto.length <= 60);
  assert.match(muni.explicacion, /Se armó con los datos que publicó la Municipalidad de Balcarce/);

  const panel = firmaDeEvento({ origen: 'panel', organizador: 'Club Pato' });
  assert.equal(panel.texto, 'Ficha cargada por la redacción');
  assert.match(panel.explicacion, /La cargó y la publicó una persona de la redacción, con los datos que nos pasó Club Pato/);
  assert.ok(panel.texto.length <= 60);

  const ld = fichaDeEvento({ ...postre, ruta: '/agenda/x' }, { base: 'https://radarbalcarce.com', url: 'https://radarbalcarce.com/agenda/x' });
  assert.equal(ld.author.name, muni.autor);
  assert.ok(!/inteligencia artificial|revis/i.test(ld.author.name));
  // La página usa el mismo pie que las notas: firma corta pegada a "Fuentes (N)", la explicación adentro.
  const p = leer('web/app/agenda/[id]/page.js');
  assert.match(p, /<PieConFuentes firma=\{firma\.texto\} explicacion=\{firma\.explicacion\} fuentes=\{fuentesDeEvento\(e\)\}/);
  assert.ok(!/className="firma-nota"/.test(p), 'sin párrafo de firma a la vista');
  assert.deepEqual(fuentesDeEvento(postre), [{ medio: 'Agenda de la Municipalidad de Balcarce', enlace: postre.url }]);
  assert.deepEqual(fuentesDeEvento({ origen: 'panel' }), []);
});

// ------------------------------------------- lo que NO va en la ficha (25/09)

// Los cinco eventos que había el 25/09, con la descripción tal cual la manda el municipio.
const REALES = [
  {
    id: 'muni-23242', nombre: 'TC PICK UP BALCARCE', desde: '2026-09-26 08:00:00', hasta: '2026-09-27 17:00:00',
    lugar: 'Autodromo Juan Manuel Fangio', direccion: 'Av Suipacha y calle 63', localidad: 'Balcarce', organizador: 'ACTC',
    web: 'https://ticket-motor.actc.org.ar/evento/x', url: 'https://balcarce.gob.ar/event/tc-pick-up-balcarce/',
    fuente: 'Municipalidad de Balcarce', origen: 'municipio',
    descripcion: '¡Las TC Pick Up llegan a Balcarce!\nEl ambiente familiar contará con gastronomía, merchandising oficial y todas las comodidades.\n¡¡¡INFORMACIÓN IMPORTANTE!!! Ya podés asegurar tu lugar.\nNo te quedes afuera. Vuelve el automovilismo a Balcarce.',
  },
  {
    id: 'muni-22477', nombre: 'NAPA VUELVE A CORRER – CARRERA NOCTURNA', desde: '2026-09-26 18:00:00', hasta: '2026-09-26 23:00:00',
    lugar: 'NAPALEOFU', direccion: 'Napaleofu', localidad: 'balcarce', organizador: 'Peña El Fogón',
    url: 'https://balcarce.gob.ar/event/x/', fuente: 'Municipalidad de Balcarce', origen: 'municipio',
  },
  {
    id: 'muni-23692', nombre: 'MISION A VENEZUELA BRIGADA ARG-13. PUMA', desde: '2026-10-03 17:00:00', hasta: '2026-10-03 19:00:00',
    lugar: 'Salón Bomberos Voluntarios', direccion: 'Calle 2 entre Av. Del Valle y 15', localidad: 'balcarce',
    organizador: 'Club Rotario Balcarce Cerrito', url: 'https://balcarce.gob.ar/event/y/', fuente: 'Municipalidad de Balcarce', origen: 'municipio',
  },
  { ...postre, origen: 'municipio' },
  {
    id: 'muni-22346', nombre: 'UTTD TIERRAS DEL DIABLO', desde: '2026-10-11 06:00:00', hasta: '2026-10-11 17:00:00',
    lugar: 'Cerro “El Triunfo”', direccion: 'Av. Suipacha y Av. Cereijo', localidad: 'Balcarce', organizador: 'Grupo Hets',
    url: 'https://balcarce.gob.ar/event/z/', fuente: 'Municipalidad de Balcarce', origen: 'municipio',
    descripcion: 'LUGAR DE LARGADA: PISTA DE CICLISMO DE CERRO “EL TRIUNFO” CALLE 40 Y 27. HORARIOS DE LARGADA: 50KM A LAS 6HS.',
  },
];

test('los nombres de la agenda se escriben bien: tildes, mayúscula inicial, siglas', () => {
  const [tc, napa, mision, , uttd] = REALES;
  assert.equal(nombreDeEvento(tc.nombre), 'TC Pick Up Balcarce');
  assert.equal(nombreDeEvento(tc.lugar), 'Autódromo Juan Manuel Fangio');
  assert.equal(nombreDeEvento(tc.direccion), 'Av. Suipacha y calle 63');
  assert.equal(nombreDeEvento(tc.organizador), 'ACTC');
  assert.equal(nombreDeEvento(napa.nombre), 'Napa Vuelve a Correr – Carrera Nocturna');
  assert.equal(nombreDeEvento(napa.lugar), 'Napaleofú');
  assert.equal(nombreDeEvento(napa.direccion), 'Napaleofú');
  assert.equal(nombreDeEvento(napa.localidad), 'Balcarce', 'lo que viene todo en minúscula');
  assert.equal(nombreDeEvento(mision.nombre), 'Misión a Venezuela Brigada ARG-13. Puma', 'ARG-13 queda; Misión lleva tilde');
  assert.equal(nombreDeEvento('Mision a Venezuela'), 'Misión a Venezuela', 'también cuando no viene en mayúsculas');
  assert.equal(nombreDeEvento(mision.lugar), 'Salón Bomberos Voluntarios');
  assert.equal(nombreDeEvento(uttd.nombre), 'UTTD Tierras del Diablo');
  assert.equal(nombreDeEvento(uttd.lugar), 'Cerro “El Triunfo”');
  assert.equal(nombreDeEvento('SOCIEDAD RURAL DE BALCARCE'), 'Sociedad Rural de Balcarce');
  assert.equal(nombreDeEvento('Fiesta de la Música'), 'Fiesta de la Música', 'lo bien escrito no se toca');
  // El lugar y la dirección iguales no se repiten.
  assert.equal(dondeEs(napa), 'Napaleofú');
  assert.equal(dondeEs(tc), 'Autódromo Juan Manuel Fangio (Av. Suipacha y calle 63)');
});

test('la descripción que copió la máquina de la fuente no sale en ninguna parte: ni página, ni .ics, ni Google', () => {
  const p = leer('web/app/agenda/[id]/page.js');
  assert.ok(!/Lo que cuenta/.test(p) && !/Texto de la agenda oficial/.test(p) && !/Ver en la agenda de/.test(p));
  assert.ok(!/\be\.descripcion\b/.test(p), 'la página no toca la descripción cruda: pasa por descripcionPropia');
  for (const e of REALES) {
    assert.equal(descripcionPropia(e), null);
    const salidas = [
      copeteDeEvento(e), JSON.stringify(fichaDeEvento(e, { url: 'https://radarbalcarce.com/agenda/x' })),
      icsDeEvento(e, { url: 'https://radarbalcarce.com/agenda/x' }), enlaceGoogleCalendar(e), JSON.stringify(firmaDeEvento(e)),
    ].join('\n');
    for (const frase of ['INFORMACIÓN IMPORTANTE', 'No te quedes afuera', 'asegurar tu lugar', 'LUGAR DE LARGADA', 'merchandising']) {
      assert.ok(!salidas.includes(frase.replace(/ /g, '%20')) && !salidas.includes(frase), `salió "${frase}"`);
    }
    // Y ninguna salida tiene una tira de palabras en mayúsculas sostenidas.
    assert.ok(!/(?:\b[A-ZÁÉÍÓÚÑ]{4,}\b\s+){2,}\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(salidas.replace(/\\n/g, ' ')), 'mayúsculas sostenidas');
  }
  // Los datos para Google llevan el copete de plantilla, no la descripción.
  assert.equal(fichaDeEvento(REALES[0]).description, copeteDeEvento(REALES[0]));
  // Sólo lo que escribió una persona de la redacción se muestra, y a Google va su primera oración.
  const propia = { origen: 'panel', descripcion: 'Peña con folclore y empanadas. Trae tu silla.\nHay mesas para todos.' };
  assert.equal(descripcionPropia(propia), propia.descripcion);
  assert.equal(fichaDeEvento({ ...propia, nombre: 'Peña', desde: '2026-10-03' }).description, 'Peña con folclore y empanadas.');
});

test('"Qué hay": etiquetas con nuestras palabras, detectadas en la descripción y nunca copiadas', () => {
  assert.deepEqual(detallesDeEvento(REALES[0]), ['Gastronomía', 'Ambiente familiar']);
  assert.deepEqual(detallesDeEvento(REALES[1]), []);
  assert.deepEqual(detallesDeEvento(REALES[4]), [], 'sin palabras conocidas no se inventa nada');
  assert.deepEqual(detallesDeEvento({ descripcion: 'Feria de emprendedores, música en vivo y estacionamiento propio.' }), ['Feria o stands', 'Música en vivo', 'Estacionamiento']);
  assert.deepEqual(detallesDeEvento({ descripcion: 'No habrá gastronomía. Sin estacionamiento en el predio.' }), [], 'lo negado no cuenta');
  // Nunca dice "gratis" por su cuenta.
  assert.ok(!detallesDeEvento({ descripcion: 'Entrada libre y gratuita' }).includes('Entrada gratuita'));
});

test('el desplegable "Fuentes (N)" y los botones de la ficha', () => {
  const p = leer('web/app/agenda/[id]/page.js');
  // "Entradas e información" es una acción: botón visible, del mismo estilo que los otros.
  assert.match(p, /className="boton borde"[^>]*>Entradas e información ↗/);
  assert.match(p, /className="boton rojo">Agendar en el celular/);
  assert.match(p, /<dt>Qué hay<\/dt>/);
  // El enlace a la agenda del municipio ya no está a la vista: va adentro del desplegable.
  assert.ok(!/<dt>Más información<\/dt>/.test(p));
  assert.match(leer('web/components/verificacion.js'), /export function PieConFuentes/);
});

test('el .ics y la tarjeta para compartir llevan los nombres limpios', () => {
  const ics = icsDeEvento(REALES[0], { url: 'https://radarbalcarce.com/agenda/x' });
  assert.match(ics, /SUMMARY:TC Pick Up Balcarce/);
  assert.match(ics, /LOCATION:Autódromo Juan Manuel Fangio \(Av\. Suipacha y calle 63\)\\, Balcarce/);
  assert.ok(!/asegurar|quedes afuera/i.test(ics));
  assert.match(leer('web/app/agenda/[id]/opengraph-image.js'), /nombreDeEvento\(e\.nombre\)/);
  assert.equal(fichaDeEvento(REALES[1]).location.name, 'Napaleofú');
});

// ------------------------------------------------------------ fechas y listas

test('un evento con hora sigue "próximo" hasta el final de su último día', () => {
  const a = { desde: '2026-09-25 20:00:00' };
  assert.equal(yaPaso(a, Date.parse('2026-09-25T22:00:00-03:00')), false, 'a las 22 todavía es el mismo día');
  assert.equal(yaPaso(a, Date.parse('2026-09-26T00:30:00-03:00')), true);
  // Con hora de fin, termina a esa hora.
  assert.equal(yaPaso({ desde: '2026-09-25 17:00:00', hasta: '2026-09-25 19:00:00' }, Date.parse('2026-09-25T19:30:00-03:00')), true);
  // Las horas son las de Balcarce, no las del servidor (UTC).
  assert.equal(instante('2026-09-25 20:00:00'), Date.parse('2026-09-25T23:00:00Z'));
  assert.equal(partesDeFecha('2026-09-25').hora, null);
  assert.ok(terminaEl(postre) > instante(postre.desde));
});

test('la página de un evento que ya pasó sigue 60 días, y después se va', () => {
  assert.equal(DIAS_DESPUES, 60);
  const e = { desde: '2026-07-01 10:00:00' };
  assert.ok(tienePagina(e, Date.parse('2026-08-29T12:00:00-03:00')));
  assert.ok(!tienePagina(e, Date.parse('2026-09-05T12:00:00-03:00')));
  const r = actualizarAgenda({ anterior: [{ ...e, id: 'muni-1', nombre: 'Viejo', origen: 'municipio' }], municipio: [], ahora: AHORA });
  assert.equal(r.length, 0);
});

test('la lista de próximos: sin lo que pasó, sin lo retirado, por fecha y sin repetir', () => {
  const lista = [
    { id: 'muni-2', nombre: 'Tierras del Diablo', desde: '2026-10-11 06:00:00' },
    { id: 'muni-1', nombre: 'Fiesta del Postre', desde: '2026-10-09 12:30:00', origen: 'municipio' },
    {
      id: 'manual-1', nombre: '22° Fiesta del Postre', desde: '2026-10-09 12:30:00', origen: 'panel', descripcion: 'x',
    },
    { id: 'muni-3', nombre: 'Ya fue', desde: '2026-09-20 10:00:00' },
    { id: 'muni-4', nombre: 'Sacado', desde: '2026-10-01 10:00:00', retirado: true },
  ];
  const r = proximos(lista, AHORA);
  assert.deepEqual(r.map((e) => e.id), ['manual-1', 'muni-2'], 'el del panel le gana al del municipio si es el mismo');
  assert.ok(mismoEvento(lista[1], lista[2]));
  assert.ok(!mismoEvento(lista[0], lista[1]));
});

// ---------------------------------------------------------- el archivo de eventos

test('si el municipio saca un evento que todavía no pasó, la página queda pero avisa', () => {
  const [antes] = actualizarAgenda({ municipio: [postre], ahora: AHORA });
  const [despues] = actualizarAgenda({ anterior: [antes], municipio: [], ahora: AHORA });
  assert.equal(despues.retirado, true);
  assert.equal(proximos([despues], AHORA).length, 0, 'sale de las listas');
  // Si vuelve a aparecer, se le saca la marca.
  const [vuelve] = actualizarAgenda({ anterior: [despues], municipio: [postre], ahora: AHORA });
  assert.equal(vuelve.retirado, undefined);
  // La página avisa y no le dice a Google que sigue en pie.
  const p = leer('web/app/agenda/[id]/page.js');
  assert.match(p, /lo sacó de su agenda/);
  assert.match(p, /\{!e\.retirado && <FichaDeEvento/);
});

test('con la API del municipio caída no se da nada por retirado, y en la PC tampoco', () => {
  const [antes] = actualizarAgenda({ municipio: [postre], ahora: AHORA });
  const [caida] = actualizarAgenda({ anterior: [antes], municipio: null, ahora: AHORA });
  assert.equal(caida.retirado, undefined);
  const [enLaPc] = actualizarAgenda({ anterior: [antes], municipio: [], ahora: AHORA, retirar: false });
  assert.equal(enLaPc.retirado, undefined);
  assert.match(leer('web/scripts/generar-datos.mjs'), /retirar: enLaNube/);
  assert.match(leer('web/scripts/generar-datos.mjs'), /agenda\.municipioOk !== false/);
});

test('lo que el panel despublica o borra deja de tener página; si no se pudo leer, no se toca', () => {
  const manual = {
    id: 'manual-1', nombre: 'Peña', desde: '2026-10-10 21:00:00', organizador: 'Club',
  };
  const [publicado] = actualizarAgenda({ panel: [manual], ahora: AHORA });
  assert.equal(publicado.origen, 'panel');
  assert.equal(actualizarAgenda({ anterior: [publicado], panel: [], ahora: AHORA }).length, 0);
  assert.equal(actualizarAgenda({ anterior: [publicado], panel: null, ahora: AHORA }).length, 1);
});

test('al archivo público va lo que se ve en la web, nada más: ni el afiche, ni quién avisó', () => {
  const [e] = actualizarAgenda({
    municipio: [{
      ...postre, imagen: 'https://x/afiche.jpg', confirmado: true, avisoPor: 'Juan 2266 15-000000', contactoId: 'x',
    }],
    ahora: AHORA,
  });
  for (const campo of ['imagen', 'avisoPor', 'contactoId', 'confirmado', 'cargadoPor']) assert.ok(!(campo in e), `se guardó ${campo}`);
  const texto = comoAgendaJson([e]);
  assert.deepEqual(JSON.parse(texto).eventos[0], e);
  assert.equal(texto.split('\n').length, 4, 'un evento por línea');
});

// ------------------------------------------------------ agendar y compartir

test('el .ics tiene lo que pide un calendario: CRLF, líneas cortas, horas en UTC', () => {
  const ics = icsDeEvento(postre, { url: 'https://radarbalcarce.com/agenda/22-fiesta-nacional-del-postre-muni22540', ahora: AHORA });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /\r\nDTSTART:20261009T153000Z\r\n/, '12.30 en Balcarce son las 15.30 UTC');
  assert.match(ics, /\r\nDTEND:20261012T210000Z\r\n/);
  assert.match(ics, /\r\nUID:muni22540@radarbalcarce\.com\r\n/);
  assert.match(ics, /SUMMARY:22° Fiesta Nacional del Postre/);
  assert.match(ics, /LOCATION:Sociedad Rural de Balcarce \(Avenida Centenario 2175\)\\, Balcarce/, 'las comas van escapadas');
  for (const linea of ics.split('\r\n')) assert.ok(new TextEncoder().encode(linea).length <= 75, `línea de más de 75 bytes: ${linea}`);
});

test('sin hora, el evento es de todo el día en el calendario', () => {
  assert.deepEqual(rangoDeCalendario({ desde: '2026-10-03' }), { todoElDia: true, inicio: '20261003', fin: '20261004' });
  assert.match(icsDeEvento({ id: 'manual-1', nombre: 'Feria', desde: '2026-10-03', hasta: '2026-10-04' }), /DTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261005/);
  // Con hora y sin final: dos horas.
  assert.deepEqual(rangoDeCalendario({ desde: '2026-10-03 20:00:00' }), { todoElDia: false, inicio: '20261003T230000Z', fin: '20261004T010000Z' });
});

test('el enlace de Google Calendar lleva el evento cargado, con la zona de Balcarce', () => {
  const u = new URL(enlaceGoogleCalendar(postre, 'https://radarbalcarce.com/agenda/x'));
  assert.equal(u.hostname, 'calendar.google.com');
  assert.equal(u.searchParams.get('text'), '22° Fiesta Nacional del Postre');
  assert.equal(u.searchParams.get('dates'), '20261009T153000Z/20261012T210000Z');
  assert.equal(u.searchParams.get('ctz'), 'America/Argentina/Buenos_Aires');
  assert.match(u.searchParams.get('details'), /radarbalcarce\.com\/agenda\/x/);
});

// ------------------------------------------------------ datos para Google

test('los datos estructurados son un Event con fecha con zona, lugar y dirección', () => {
  const ld = fichaDeEvento({ ...postre, costo: '$5.000' }, { base: 'https://radarbalcarce.com', url: 'https://radarbalcarce.com/agenda/x' });
  assert.equal(ld['@type'], 'Event');
  assert.equal(ld.name, '22° Fiesta Nacional del Postre');
  assert.equal(ld.startDate, '2026-10-09T12:30:00-03:00');
  assert.equal(ld.endDate, '2026-10-12T18:00:00-03:00');
  assert.equal(ld.location['@type'], 'Place');
  assert.equal(ld.location.address.addressLocality, 'Balcarce');
  assert.equal(ld.location.address.streetAddress, 'Avenida Centenario 2175');
  assert.deepEqual(ld.offers, {
    '@type': 'Offer', price: 5000, priceCurrency: 'ARS', url: 'https://radarbalcarce.com/agenda/x',
  });
  assert.equal(ld.image[0], 'https://radarbalcarce.com/agenda/x/opengraph-image', 'la tarjeta propia, nunca el afiche');
  assert.equal(fichaDeEvento(postre).offers, undefined, 'sin precio conocido no se declara oferta');
  assert.equal(fichaDeEvento({ ...postre, costo: 'Gratis' }).isAccessibleForFree, true);
  assert.equal(fichaDeEvento({ desde: '2026-10-03', nombre: 'x' }).startDate, '2026-10-03', 'sin hora, sólo el día');
});

// ------------------------------------------------------ el calendario anual

test('una fiesta anual sólo se enlaza cuando hay un evento con fecha confirmada', () => {
  const anual = { id: 'fiesta-postre', clave: 'fiesta nacional del postre', mesAproximado: 7 };
  assert.equal(confirmacionDeAnual(anual, []), null, 'sin evento, "fecha a confirmar"');
  assert.equal(confirmacionDeAnual(anual, [postre])?.id, 'muni-22540', 'la reconoce por el nombre');
  const cargada = { id: 'manual-9', nombre: 'La del Postre', anualId: 'fiesta-postre' };
  assert.equal(confirmacionDeAnual(anual, [postre, cargada])?.id, 'manual-9', 'la ligada desde el panel manda');
  assert.equal(confirmacionDeAnual({ id: 'x', clave: 'postre' }, [{ nombre: 'Postres de la abuela' }]), null, 'palabra entera, no un pedazo');
  // Sin clave, sirve el nombre sin el paréntesis.
  assert.equal(confirmacionDeAnual({ id: 't', nombre: 'Tierras del Diablo (trail)' }, [{ id: 'muni-2', nombre: 'UTTD TIERRAS DEL DIABLO' }])?.id, 'muni-2');
  // La lista de /agenda dice "fecha a confirmar" y nunca pone un día a una fiesta sin confirmar.
  const p = leer('web/app/agenda/page.js');
  assert.match(p, /fecha a confirmar/);
  assert.match(p, /a\.confirmado \? fechaLarga\(a\.confirmado\.desde\)/);
});

// ------------------------------------------------------ la web los enlaza

test('la agenda, la portada y la sección Cultura enlazan cada fecha a su página', () => {
  assert.match(leer('web/components/piezas.js'), /evento\.ruta \? <a href=\{evento\.ruta\}>/);
  assert.match(leer('web/app/page.js'), /proximosEventos\(\)\.slice\(0, 3\)/);
  assert.match(leer('web/app/agenda/page.js'), /proximosEventos\(\)/);
  assert.match(leer('web/app/seccion/[ranura]/page.js'), /s\.ranura === 'cultura'/);
});

test('la página del evento: canónico propio, botón para agendar, compartir y Event para Google', () => {
  const p = leer('web/app/agenda/[id]/page.js');
  assert.match(p, /alternates: \{ canonical: e\.ruta \}/);
  assert.match(p, /evento\.ics/);
  assert.match(p, /enlaceGoogleCalendar\(/);
  assert.match(p, /<Compartir /);
  assert.match(p, /<FichaDeEvento /);
  assert.match(p, /<h1>/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'web/app/agenda/[id]/evento.ics/route.js')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'web/app/agenda/[id]/opengraph-image.js')));
  assert.match(leer('web/public/_headers'), /\/agenda\/\*\/evento\.ics\r?\n\s+Content-Type: text\/calendar/);
});

test('el sitemap ofrece los eventos que vienen, no los que pasaron', () => {
  assert.match(leer('web/app/sitemap.js'), /const deEventos = proximosEventos\(\)/);
});

test('GitHub guarda el archivo de eventos en cada corrida', () => {
  assert.match(leer('.github/workflows/actualizar.yml'), /git add web\/data\/portada\.json web\/data\/archivo\.json web\/data\/agenda\.json/);
  // Y existe desde el principio: un `git add` de un archivo que no existe hace fallar el paso.
  assert.ok(Array.isArray(JSON.parse(leer('web/data/agenda.json')).eventos));
  assert.match(leer('web/scripts/generar-datos.mjs'), /!fs\.existsSync\(AGENDA_WEB\)/);
});

test('el nombre de la dirección es la misma cuenta que la de las notas', () => {
  assert.equal(parteDeEvento({ id: 'muni-1', nombre: 'Peña Folclórica en el Club' }), `${slugDe('Peña Folclórica en el Club')}-muni1`);
});

test('en la ficha, el día de la semana es el de la fecha, no el de la zona del servidor', () => {
  // 2026-10-09 es viernes en cualquier zona: se calcula con UTC al mediodía.
  assert.match(copeteDeEvento({ desde: '2026-10-09 00:30:00' }), /^Viernes 9 de octubre/);
  assert.ok(Number.isFinite(AHORA + DIA));
});
