// Regla 186 (17/10/2026, Hernán): la excepción `menorEnActividadOficial`. La foto PROPIA de un organismo de Balcarce (Municipalidad,
// Concejo, Facultad) puede salir aunque la IA vea chicos, sólo en una actividad deportiva, escolar o cultural que no toque nada policial,
// judicial, de salud, accidentes, violencia, muertes ni desaparecidos, sin marca, sin nombres de chicos, y con el interruptor
// FOTOS_MENORES_OFICIALES prendido ("Si"; por defecto, apagado). Todo lo demás sigue igual: ninguna foto real con un menor.
//
// Los casos "reales" son notas de web/data (archivo.json, banco-fotos.json) que quedaron sin foto porque la IA vio un menor, copiadas
// acá con su texto de ese día. Sin red: la IA es un fetchFn de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  excepcionActiva, esFuenteOficialParaMenores, tieneFuenteOficialParaMenores, menorEnActividadOficial, nombraAUnMenor,
  REGLA_FOTOS_MENORES, INTERRUPTOR_FOTOS_MENORES,
} from '../ingesta/fotos-menores.mjs';
import { FUENTES, FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES, REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';
import { elegirFoto } from '../ingesta/fotos.mjs';
import {
  elegirFotosNuevas, reintentoPorExcepcion, conFotosDelBanco, fotoConMenorPermitida,
} from '../web/scripts/fotos-notas.mjs';
import { fotosDelRepaso } from '../web/scripts/collage.mjs';

const RAIZ = path.join(import.meta.dirname, '..');

// ---------------------------------------------------------------- casos reales (web/data, octubre de 2026)

const MUNI = (enlace) => ({ medio: 'Municipalidad de Balcarce', enlace, oficial: true });
const GABAL = (enlace) => ({ medio: 'Radio Gabal (FM 104.1)', enlace, oficial: false });

// Pasan: deportes y escuelas municipales, sin nombres de chicos ni nada sensible.
const ESCUELA_DE_BASQUET = {
  id: 'lf9d6b', seccion: 'Deportes', semaforo: 'verde',
  titulo: 'La Escuela Municipal de Básquet juega una nueva fecha',
  copete: 'Las divisiones de la Escuela Municipal de Básquet disputan el sábado una nueva jornada por la Liga Marplatense de este deporte. El cronograma incluye encuentros de Mini, Pre Mini y playoffs.',
  cuerpo: 'Las divisiones de la Escuela Municipal de Básquet afrontan el sábado una nueva jornada por la Liga Marplatense de este deporte. La programación oficial detalló que la actividad comienza a las 10:30 con el partido de Cadetes frente a Círculo Deportivo.\n\nEl cronograma continúa a las 12 con el cruce de Juveniles ante Unión. Por la tarde, la competencia sigue a las 14 con el encuentro de Mini frente a Kimberley y finaliza a las 15 con el partido de Pre Mini contra el mismo rival.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/15/sabado-a-puro-basquet/'), GABAL('https://www.radiogabal.com.ar/index.php/deportes/la-escuela-municipal-de-basquet-tendra-una-nueva-jornada-por-la-liga-marplatense')],
};
const GIMNASIA_ARTISTICA = {
  id: '15zgvx1', seccion: 'Balcarce',
  titulo: 'Up organiza la cuarta edición de su torneo de gimnasia artística',
  copete: 'El sábado desde las 9 se desarrollará una nueva competencia de gimnasia artística en el gimnasio de la Escuela Primaria N° 13. Participarán unos trescientos deportistas locales y regionales.',
  cuerpo: 'El gimnasio de la Escuela Primaria N° 13 “Independencia Nacional” recibirá el próximo sábado, desde las 9, el cuarto torneo de gimnasia artística femenina y masculina. La organización se encuentra a cargo de UP Gimnasia Artística.\n\nSegún informó la fuente oficial, se espera la presencia de unos trescientos gimnastas de diferentes edades y niveles provenientes de Balcarce y ciudades de la zona. Los deportistas competirán en las categorías USAG 1, Nivel E y Jardín.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/07/up-organiza-su-cuarto-torneo-de-gimnasia-artistica/')],
};
const VOLEY_SUB21 = {
  id: '1wp29m7', seccion: 'Deportes',
  titulo: 'Vóley Balcarce gana el Torneo Promocional Sub-21 en Mar del Plata',
  copete: 'El conjunto masculino se impuso en los cuatro encuentros del certamen disputado en Mar del Plata. Tres de los integrantes del plantel tienen quince años.',
  cuerpo: 'El plantel masculino de Vóley Balcarce se coronó campeón del Torneo Promocional Sub-21 tras una destacada actuación en las instalaciones del Club Once Unidos de Mar del Plata.\n\nSegún informaron fuentes oficiales, el conjunto balcarceño disputó cuatro encuentros y se impuso en todos ellos por 2 sets a 0 para quedarse con el primer puesto.\n\nEntre los deportistas se destacaron tres juveniles de quince años que sumaron experiencia en una divisional superior.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/07/voley-balcarce-se-consagro-campeon-del-promocional-sub-21/')],
};

// No pasan, aunque la foto sea de la Municipalidad.
const FUTBOL_PLAYA_CON_NOMBRES = {
  id: 'y9vwef', seccion: 'Deportes',
  titulo: 'El equipo de fútbol playa clasifica a la final bonaerense',
  copete: 'El conjunto local superó a Benito Juárez por 7 a 4 en la etapa interregional y aseguró su lugar en el torneo provincial que se jugará en octubre.',
  cuerpo: 'El seleccionado local de fútbol playa logró la clasificación a la instancia decisiva de los Juegos Bonaerenses tras superar al representativo de Benito Juárez por 7 a 4 en el Complejo Polideportivo.\n\nEn la fase previa, el conjunto balcarceño ya había demostrado un alto nivel al derrotar a Mar del Plata por 4 a 0.\n\nLa plantilla estuvo compuesta por Matías Jurado, Carmelo Favano, Santino Petrantonio, Alejo Zaccardi, Tiziano Monroi, Junior Petti y Juan Ignacio Petti. La definición provincial se desarrollará en Mar del Plata entre el 19 y el 23 de octubre.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/09/30/equipo-de-futbol-playa-a-la-final-bonaerense/')],
};
const BASQUET_CON_CANCER_DE_MAMA = {
  id: 'siahkq', seccion: 'Deportes',
  titulo: 'Las Correcaminos participan de un torneo de básquet en Mar del Plata',
  copete: 'El conjunto femenino de la Escuela Municipal de Básquet disputó varios encuentros en el certamen Sporting Rosa. La competencia combinó el deporte con la concientización sobre el cáncer de mama.',
  cuerpo: 'El equipo femenino de básquet Las Correcaminos disputó el torneo Sporting Rosa, organizado por el Club Sporting en Mar del Plata.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/07/gran-actuacion-de-las-correcaminos-en-mar-del-plata/')],
};
const DIA_DEL_SORDO = {
  id: 'f3xat8', seccion: 'Balcarce',
  titulo: 'El Complejo Polideportivo aloja un encuentro regional por el Día del Sordo',
  copete: 'El Complejo Polideportivo Municipal recibe a más de cincuenta niños, jóvenes y referentes de la región por el Día Internacional del Sordo con actividades recreativas y un almuerzo.',
  cuerpo: 'Participan la Escuela Especial N° 515 de General Pueyrredón, la Escuela Especial N° 501 de General Alvarado, la Asociación de Sordos de Mar del Plata y la Asociación de Sordos de Balcarce. La Escuela Municipal de Deporte Adaptado de Balcarce propicia un almuerzo.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/09/29/balcarce-fue-sede-del-primer-encuentro-regional-por-el-dia-internacional-del-sordo/')],
};
const JUEZ_CON_NOMBRE_EN_EL_TITULO = {
  id: 'u0hcbv', seccion: 'Balcarce',
  titulo: 'Ariel Bilbao asume como juez en las finales de los Juegos Bonaerenses',
  copete: 'El deportista local fue convocado por la Federación de Tiro para desempeñarse como juez en las competencias de la disciplina durante la instancia final del certamen provincial.',
  cuerpo: 'El balcarceño Ariel Bilbao integra el equipo de jueces encargado de las competencias de tiro en los Juegos Bonaerenses 2026.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/15/atilio-ariel-bilbao-volvera-a-desempenarse-como-juez-nacional-en-los-juegos-bonaerenses-2026/'), GABAL('https://www.radiogabal.com.ar/index.php/deportes/ariel-bilbao-volvera-a-desempenarse-como-juez-en-los-juegos-bonaerenses')],
};
// La IA vio menores, pero la foto no es de un organismo: un medio (aunque sea de Balcarce) no entra en la excepción.
const MUSICAL_DE_UN_MEDIO = {
  id: '97f98g', seccion: 'Balcarce',
  titulo: 'El Instituto Adventista celebra cuarenta años con un musical',
  copete: 'El coro del establecimiento educativo presenta el viernes el espectáculo Un día en el polideportivo propio, enmarcado en los festejos por el aniversario institucional.',
  cuerpo: 'El coro del Instituto Adventista presenta el viernes el musical.',
  fuentesConsultadas: [{ medio: 'El Diario Balcarce', enlace: 'https://eldiariobalcarce.com.ar/un-dia-el-musical-con-el-que-el-instituto-adventista-celebra-sus-40-anos-840', oficial: false }],
};
// El Concejo contó la nota, pero su página no estuvo entre las fuentes de la foto (sólo Gabal y Puntonueve): no hay foto oficial que usar.
const CONCEJO_ESTUDIANTIL_SIN_FOTO_DEL_CONCEJO = {
  id: 'wm8hav', seccion: 'Balcarce',
  titulo: 'El Concejo Deliberativo Estudiantil cierra su quinta edición con 25 iniciativas',
  copete: 'Estudiantes de escuelas secundarias locales completaron nueve encuentros y dos sesiones durante el año.',
  cuerpo: 'El Concejo Deliberante concretó el cierre de la edición 2026 del Concejo Deliberativo Estudiantil.',
  medios: ['Radio Gabal (FM 104.1)', 'Concejo Deliberante de Balcarce'],
  fuentesConsultadas: [GABAL('https://www.radiogabal.com.ar/index.php/politica/el-concejo-deliberativo-estudiantil-cerro-su-quinta-edicion-con-25-proyectos-presentados'), { medio: 'Puntonueve (FM 100.9)', enlace: 'https://puntonueve.com.ar/el-concejo-deliberativo-estudiantil-cerro-su-edicion-2026-con-25-proyectos-presentados/' }],
};
const SARAMPION = {
  id: 'zavg8u', seccion: 'Balcarce',
  titulo: 'El Ministerio de Salud bonaerense advierte sobre el riesgo de nuevos brotes de sarampión',
  copete: 'Las autoridades sanitarias piden revisar los esquemas de vacunación antes de viajar ante la aparición de casos en el país.',
  fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/11/sarampion/')],
};
const INCIDENTES_EN_JUNIN = {
  id: 'zfpkeo', seccion: 'Fútbol',
  titulo: 'Incidentes y represión policial en el ingreso de River en Junín',
  copete: 'Se registraron corridas y uso de gas pimienta en los accesos al estadio Eva Perón.',
  fuentesConsultadas: [{ medio: 'Infobae', enlace: 'https://www.infobae.com/deportes/2026/10/14/caos/' }],
};
// Inventados, con la forma de lo que podría llegar del municipio.
const inventada = (titulo, copete = '', cuerpo = '', seccion = 'Balcarce') => ({
  id: 'x', seccion, titulo, copete, cuerpo, fuentesConsultadas: [MUNI('https://balcarce.gob.ar/2026/10/17/x/')],
});

// ---------------------------------------------------------------- el interruptor y la lista cerrada

test('regla 186: el interruptor FOTOS_MENORES_OFICIALES está apagado por defecto y sólo se prende con "Si"', () => {
  assert.equal(INTERRUPTOR_FOTOS_MENORES, 'FOTOS_MENORES_OFICIALES');
  assert.equal(excepcionActiva({}), false);
  for (const no of ['', 'no', 'No', '1', 'true', 'prendido', 'si no', undefined]) assert.equal(excepcionActiva({ FOTOS_MENORES_OFICIALES: no }), false, String(no));
  for (const si of ['Si', 'si', 'SI', 'Sí', ' sí ']) assert.equal(excepcionActiva({ FOTOS_MENORES_OFICIALES: si }), true, si);
  // En las pruebas no está cargado: todo lo demás de la suite corre con la regla de siempre.
  assert.equal(excepcionActiva(), false);
});

test('regla 186: la lista cerrada son organismos de Balcarce que existen en FUENTES, oficiales y locales, con su dominio de verdad', () => {
  assert.deepEqual(FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES.map((f) => f.id), ['municipio', 'concejo-deliberante-balcarce', 'fca-unmdp']);
  for (const e of FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES) {
    const f = FUENTES.find((x) => x.id === e.id);
    assert.ok(f, `${e.id} está en FUENTES`);
    assert.equal(f.oficial, true, `${e.id} es oficial`);
    assert.equal(f.alcance, 'local', `${e.id} es de Balcarce`);
    assert.equal(f.medio, e.medio, `${e.id}: el mismo nombre de medio`);
    const host = new URL(f.url).hostname.replace(/^www\./, '');
    assert.ok(e.dominios.some((d) => host === d || host.endsWith(`.${d}`)), `${e.id}: el dominio es el de su feed (${host})`);
  }
  // Ningún medio (ni de Balcarce) está en la lista: sólo organismos.
  for (const e of FUENTES_OFICIALES_PARA_FOTOS_DE_MENORES) assert.ok(!/radio|fm|diario|news|noticias|ahora|acci[oó]n/i.test(e.medio), e.medio);
});

test('regla 186 (a): la foto tiene que salir de una página del organismo: el nombre del medio Y el dominio', () => {
  assert.ok(esFuenteOficialParaMenores(MUNI('https://balcarce.gob.ar/2026/10/15/sabado-a-puro-basquet/')));
  assert.ok(esFuenteOficialParaMenores(MUNI('https://www.balcarce.gob.ar/nota/')));
  assert.ok(esFuenteOficialParaMenores(MUNI('https://deportes.balcarce.gob.ar/nota/')), 'un área de la Municipalidad');
  assert.ok(esFuenteOficialParaMenores({ medio: 'Concejo Deliberante de Balcarce', enlace: 'https://concejodeliberantebalcarce.gob.ar/x/' }));
  // El nombre del organismo con la página de otro medio, o al revés: no.
  assert.equal(esFuenteOficialParaMenores(MUNI('https://www.radiogabal.com.ar/index.php/deportes/x')), null);
  assert.equal(esFuenteOficialParaMenores(GABAL('https://balcarce.gob.ar/2026/10/15/x/')), null);
  // Dominios parecidos: no.
  assert.equal(esFuenteOficialParaMenores(MUNI('https://balcarce.gob.ar.otro.com/x')), null);
  assert.equal(esFuenteOficialParaMenores(MUNI('https://nobalcarce.gob.ar/x')), null);
  assert.equal(esFuenteOficialParaMenores(MUNI('no es una dirección')), null);
  assert.equal(esFuenteOficialParaMenores({ medio: 'Municipalidad de Balcarce' }), null);
  assert.equal(tieneFuenteOficialParaMenores(CONCEJO_ESTUDIANTIL_SIN_FOTO_DEL_CONCEJO), false, 'el Concejo contó la nota pero no fue fuente de la foto');
  assert.equal(tieneFuenteOficialParaMenores(MUSICAL_DE_UN_MEDIO), false);
  assert.equal(tieneFuenteOficialParaMenores(ESCUELA_DE_BASQUET), true);
});

// ---------------------------------------------------------------- la nota

test('regla 186 (b) y (d): pasan las notas reales del municipio de deporte y escuela que quedaron sin foto por "menor"', () => {
  for (const n of [ESCUELA_DE_BASQUET, GIMNASIA_ARTISTICA, VOLEY_SUB21]) {
    const r = menorEnActividadOficial(n);
    assert.equal(r.ok, true, `${n.id}: ${r.motivo}`);
    assert.match(r.motivo, /actividad/);
  }
});

test('regla 186: las notas reales que NO pasan, aunque la foto sea del municipio', () => {
  const casos = [
    [FUTBOL_PLAYA_CON_NOMBRES, /nombra personas/],
    [BASQUET_CON_CANCER_DE_MAMA, /cancer/],
    [DIA_DEL_SORDO, /sordo|internacion|escuela especial|adaptad/],
    [JUEZ_CON_NOMBRE_EN_EL_TITULO, /nombran a una persona/],
    [SARAMPION, /salud|sanitari|vacun/],
    [INCIDENTES_EN_JUNIN, /sección Fútbol/],
  ];
  for (const [n, motivo] of casos) {
    const r = menorEnActividadOficial(n);
    assert.equal(r.ok, false, n.id);
    assert.match(r.motivo, motivo, `${n.id}: ${r.motivo}`);
  }
});

test('regla 186 (b): lo policial, judicial, de salud, accidentes, violencia, abuso, denuncias, muertes y desaparecidos, nunca', () => {
  const nunca = [
    inventada('Detienen a dos jóvenes tras una pelea a la salida de la escuela', 'Intervino la Policía.'),
    inventada('La Justicia investiga lo ocurrido en el torneo de fútbol infantil', 'La causa la lleva el juzgado.'),
    inventada('Un chico se lesionó en el torneo de básquet y fue trasladado al hospital', 'Lo atendió el SAME.', '', 'Deportes'),
    inventada('Accidente en la colonia de vacaciones municipal', 'Un micro chocó a la salida del polideportivo.'),
    inventada('Denuncian maltrato en una escuela', 'Las familias presentaron una denuncia.'),
    inventada('Buscan a un adolescente que desapareció tras el festival', 'Lo buscan desde el sábado.'),
    inventada('Jornada de vacunación en las escuelas', 'Salud lleva la campaña a los colegios.'),
    inventada('Torneo en homenaje a un alumno que falleció', 'Sus compañeros lo recuerdan.', '', 'Deportes'),
    inventada('Charla sobre grooming y acoso para estudiantes', 'En la escuela secundaria.'),
    inventada('Violencia en un partido de la liga infantil', 'Hubo agresiones entre padres.', '', 'Deportes'),
    inventada('Encuentro de deporte adaptado para chicos con discapacidad', 'En el polideportivo.', '', 'Deportes'),
  ];
  for (const n of nunca) {
    const r = menorEnActividadOficial(n);
    assert.equal(r.ok, false, `${n.titulo} → ${r.motivo}`);
  }
});

test('regla 186 (b): todo lo que el semáforo marca (rojo o amarillo) frena; la lista roja no se tocó', () => {
  // Cualquier palabra roja del semáforo, metida en una nota que si no pasaría, la frena.
  for (const p of REGLAS_SEMAFORO.rojo.slice(0, 40)) {
    const r = menorEnActividadOficial(inventada('La Escuela Municipal de Vóley juega una nueva fecha', `Se habló de ${p}.`, '', 'Deportes'));
    assert.equal(r.ok, false, p);
  }
  // Un semáforo que dice algo, frena (aunque ninguna palabra de PROHIBIDAS aparezca).
  const r = menorEnActividadOficial(ESCUELA_DE_BASQUET, { semaforo: () => ({ color: 'amarillo', motivo: 'necesita ojo humano' }) });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /semáforo del texto: amarillo/);
  // Y una nota que ya espera (amarilla) o está frenada (roja), también.
  assert.equal(menorEnActividadOficial({ ...ESCUELA_DE_BASQUET, semaforo: 'amarillo' }).ok, false);
  assert.equal(menorEnActividadOficial({ ...ESCUELA_DE_BASQUET, semaforo: 'rojo' }).ok, false);
  // La edad de un chico dicha con números.
  assert.equal(menorEnActividadOficial(inventada('Torneo de ajedrez escolar', 'Ganó un nene de 9 años.', '', 'Deportes')).ok, false);
});

test('regla 186 (b): sólo en Deportes, Cultura y agenda, Educación o Balcarce, y con una actividad de la lista en el título o la bajada', () => {
  for (const seccion of ['Política', 'Policiales', 'Fútbol', 'Economía', 'Argentina', 'Agro', 'Tecnología', 'Automovilismo']) {
    assert.equal(menorEnActividadOficial({ ...ESCUELA_DE_BASQUET, seccion }).ok, false, seccion);
  }
  assert.equal(menorEnActividadOficial({ ...ESCUELA_DE_BASQUET, seccion: 'Cultura y agenda' }).ok, true);
  const sinActividad = inventada('El intendente recorre las obras de la avenida', 'Visitó los trabajos de pavimento.');
  assert.match(menorEnActividadOficial(sinActividad).motivo, /no nombran una actividad/);
  assert.equal(menorEnActividadOficial({ ...ESCUELA_DE_BASQUET, propia: 'dolar' }).ok, false, 'las notas propias, no');
  assert.equal(menorEnActividadOficial(inventada('Muestra de fin de año del taller municipal de teatro', 'Los alumnos presentan su obra.', '', 'Cultura y agenda')).ok, true);
  assert.equal(menorEnActividadOficial(inventada('Olimpíadas escolares en el polideportivo', 'Participan las escuelas primarias.')).ok, true);
});

test('regla 186 (d): nombraAUnMenor encuentra listas de nombres y nombres pegados a palabras de chicos, y no instituciones', () => {
  for (const si of [
    'La plantilla estuvo compuesta por Matías Jurado, Carmelo Favano y Juan Ignacio Petti.',
    'Se destacó la alumna María Pérez.',
    'Ganó la jugadora Sofía Gómez Ríos.',
    'Sofía Gómez, de la categoría infantil, ganó el oro.',
    'Los campeones fueron Tomás Díaz y Lucas Ferro.',
  ]) assert.ok(nombraAUnMenor(si), si);
  for (const no of [
    'Las divisiones de la Escuela Municipal de Básquet juegan frente a Círculo Deportivo.',
    'Participan la Escuela Primaria N° 13 y el Club Once Unidos de Mar del Plata.',
    'El seleccionado superó a Benito Juárez y a Mar del Plata.',
    'El presidente del cuerpo, Agustín Cassini, valoró la propuesta.',
    'Sin ningún nombre propio.',
  ]) assert.equal(nombraAUnMenor(no), null, no);
});

// ---------------------------------------------------------------- la elección de la foto (con la IA de mentira)

const conDatos = (fuentes) => fuentes.map((f, i) => ({ ...f, imagen: `${f.enlace}foto.jpg`, datos: { mime: 'image/jpeg', base64: `foto-${i}` } }));
function iaQueResponde(respuesta, pedidos = []) {
  return async (url, opciones) => {
    assert.match(url, /generativelanguage/);
    pedidos.push(JSON.parse(opciones.body).contents[0].parts[0].text);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
  };
}
const AMBAS_CON_CHICOS = {
  elegida: 'A', razon: 'la mejor',
  fotos: [{ letra: 'A', tiene_marca: false, menor: true, detalle: 'chicos jugando' }, { letra: 'B', tiene_marca: false, menor: true }],
};

test('regla 186: con el interruptor prendido, la foto del municipio con chicos en la escuela de básquet se elige y queda anotada', async () => {
  const pedidos = [];
  const r = await elegirFoto(ESCUELA_DE_BASQUET, conDatos(ESCUELA_DE_BASQUET.fuentesConsultadas), {
    clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde(AMBAS_CON_CHICOS, pedidos), fotosMenoresOficiales: true,
  });
  assert.equal(r.elegida.medio, 'Municipalidad de Balcarce');
  assert.equal(r.elegida.excepcion.regla, REGLA_FOTOS_MENORES);
  assert.equal(r.elegida.excepcion.fuente, 'Municipalidad de Balcarce');
  assert.match(r.elegida.excepcion.motivo, /Deportes/);
  assert.match(r.razon, /menorEnActividadOficial/);
  // La IA supo de la excepción, y sólo para la letra del municipio.
  assert.match(pedidos[0], /Única excepción[\s\S]*la letra A \(Municipalidad de Balcarce\)/);
  assert.ok(!/letra B/.test(pedidos[0].split('Única excepción')[1]));
});

test('regla 186: con el interruptor APAGADO (lo normal), la misma foto no se elige y la instrucción es la de siempre', async () => {
  const pedidos = [];
  const r = await elegirFoto(ESCUELA_DE_BASQUET, conDatos(ESCUELA_DE_BASQUET.fuentesConsultadas), {
    clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde(AMBAS_CON_CHICOS, pedidos), fotosMenoresOficiales: false,
  });
  assert.equal(r.elegida, null);
  assert.ok(!/Única excepción/.test(pedidos[0]));
  // Y sin pasar nada, manda el entorno (en las pruebas, apagado).
  const r2 = await elegirFoto(ESCUELA_DE_BASQUET, conDatos(ESCUELA_DE_BASQUET.fuentesConsultadas), {
    clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde(AMBAS_CON_CHICOS),
  });
  assert.equal(r2.elegida, null);
});

test('regla 186: prendida, si la IA elige la foto con chicos de OTRO medio, se usa la del municipio, nunca la del medio', async () => {
  const r = await elegirFoto(ESCUELA_DE_BASQUET, conDatos(ESCUELA_DE_BASQUET.fuentesConsultadas), {
    clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde({ ...AMBAS_CON_CHICOS, elegida: 'B' }), fotosMenoresOficiales: true,
  });
  assert.equal(r.elegida.medio, 'Municipalidad de Balcarce');
  assert.ok(r.elegida.excepcion);
  // Si sólo está la del medio, nada.
  const soloGabal = conDatos([ESCUELA_DE_BASQUET.fuentesConsultadas[1]]);
  const r2 = await elegirFoto(ESCUELA_DE_BASQUET, soloGabal, {
    clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde({ elegida: 'A', razon: 'x', fotos: [{ letra: 'A', tiene_marca: false, menor: true }] }), fotosMenoresOficiales: true,
  });
  assert.equal(r2.elegida, null);
});

test('regla 186 (c): prendida, la foto del municipio con una marca o un logo sobreimpreso, o sin evaluar, no sirve', async () => {
  for (const foto of [{ tiene_marca: true, menor: true }, { tiene_marca: true, menor: false }, { menor: true }, { tiene_marca: false }]) {
    const r = await elegirFoto(ESCUELA_DE_BASQUET, conDatos([ESCUELA_DE_BASQUET.fuentesConsultadas[0]]), {
      clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde({ elegida: 'A', razon: 'x', fotos: [{ letra: 'A', ...foto }] }), fotosMenoresOficiales: true,
    });
    assert.equal(r.elegida, null, JSON.stringify(foto));
  }
});

test('regla 186: prendida, una nota que no la permite (nombres de chicos, salud, policial) sigue sin foto con chicos, y la IA no se entera', async () => {
  for (const nota of [FUTBOL_PLAYA_CON_NOMBRES, BASQUET_CON_CANCER_DE_MAMA, DIA_DEL_SORDO, SARAMPION,
    inventada('Detienen a dos jóvenes tras una pelea en el torneo', 'Intervino la Policía.', '', 'Deportes')]) {
    const pedidos = [];
    const r = await elegirFoto(nota, conDatos(nota.fuentesConsultadas), {
      clave: 'g', claveRespaldo: null, fetchFn: iaQueResponde({ elegida: 'A', razon: 'x', fotos: [{ letra: 'A', tiene_marca: false, menor: true }] }, pedidos), fotosMenoresOficiales: true,
    });
    assert.equal(r.elegida, null, nota.id ?? nota.titulo);
    assert.ok(!/Única excepción/.test(pedidos[0]), nota.id ?? nota.titulo);
  }
});

test('regla 186: prendida, si hay una foto SIN chicos que sirve, se usa ésa y no queda como excepción', async () => {
  // Es una nota de chicos (escuela): desde el 17/10/2026 (regla 204) la foto sin excepción la mira también Groq, que acá está de acuerdo.
  const gemini = iaQueResponde({ elegida: 'B', razon: 'x', fotos: [{ letra: 'A', tiene_marca: false, menor: true }, { letra: 'B', tiene_marca: false, menor: false }] });
  const r = await elegirFoto(ESCUELA_DE_BASQUET, conDatos(ESCUELA_DE_BASQUET.fuentesConsultadas), {
    clave: 'g', claveRespaldo: 'r', fotosMenoresOficiales: true,
    fetchFn: async (url, opciones) => (String(url).includes('api.groq.com')
      ? { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ menor: false, tiene_marca: false, grafica: false, corresponde: 'si' }) } }] }) }
      : gemini(url, opciones)),
  });
  assert.equal(r.elegida.medio, 'Radio Gabal (FM 104.1)');
  assert.equal(r.elegida.excepcion, undefined);
});

// ---------------------------------------------------------------- el banco, el registro, la web y el collage

const imagenJpeg = () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('foto') });
function fetchDelMunicipio(respuesta) {
  return async (url) => {
    if (String(url).includes('generativelanguage')) {
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(respuesta) }] } }] }) };
    }
    if (String(url).endsWith('.jpg')) return imagenJpeg();
    return { ok: true, text: async () => `<meta property="og:image" content="${url}foto.jpg">` };
  };
}

test('regla 186: la foto aceptada por la excepción queda registrada en el banco (id, fuente, motivo) y en la lista de la corrida', async () => {
  const { banco, archivos, porExcepcion } = await elegirFotosNuevas([ESCUELA_DE_BASQUET], {
    clave: 'g', claveRespaldo: null, fetchFn: fetchDelMunicipio(AMBAS_CON_CHICOS), fotosMenoresOficiales: true, achicar: async () => null,
  });
  const e = banco.lf9d6b;
  assert.equal(e.archivo, 'fotos-notas/lf9d6b.jpg');
  assert.equal(e.credito, 'Foto: Municipalidad de Balcarce', '(e) el crédito en el epígrafe, como siempre');
  assert.equal(e.excepcion.regla, 'menorEnActividadOficial');
  assert.equal(e.excepcion.fuente, 'Municipalidad de Balcarce');
  assert.ok(e.excepcion.motivo && e.excepcion.cuando);
  assert.equal(e.probadaConExcepcion, true);
  assert.ok(archivos['fotos-notas/lf9d6b.jpg']);
  assert.deepEqual(porExcepcion.map((x) => [x.id, x.fuente]), [['lf9d6b', 'Municipalidad de Balcarce']]);
  assert.match(porExcepcion[0].motivo, /Deportes/);
  // Apagada, la misma corrida no guarda nada con chicos ni anota nada de la excepción.
  const apagada = await elegirFotosNuevas([ESCUELA_DE_BASQUET], {
    clave: 'g', claveRespaldo: null, fetchFn: fetchDelMunicipio(AMBAS_CON_CHICOS), fotosMenoresOficiales: false, achicar: async () => null,
  });
  assert.equal(apagada.banco.lf9d6b.archivo, undefined);
  assert.equal(apagada.banco.lf9d6b.probadaConExcepcion, undefined);
  assert.deepEqual(apagada.porExcepcion, []);
});

test('regla 186: al prenderla, una nota que ya se había descartado por "menor" se vuelve a probar UNA vez, sólo si la permite', () => {
  const descartada = { intentado: true, origen: 'ninguna', razon: 'Todas las fotos muestran menores de edad claramente identificables, por lo que no pueden ser publicadas.', cuando: '2026-10-15T13:00:00.000Z', intentos: 1 };
  assert.equal(reintentoPorExcepcion(descartada, ESCUELA_DE_BASQUET, { activa: true }), true);
  assert.equal(reintentoPorExcepcion(descartada, ESCUELA_DE_BASQUET, { activa: false }), false, 'apagada, no');
  assert.equal(reintentoPorExcepcion({ ...descartada, probadaConExcepcion: true }, ESCUELA_DE_BASQUET, { activa: true }), false, 'una sola vez');
  assert.equal(reintentoPorExcepcion(descartada, FUTBOL_PLAYA_CON_NOMBRES, { activa: true }), false, 'la nota no la permite');
  assert.equal(reintentoPorExcepcion(descartada, MUSICAL_DE_UN_MEDIO, { activa: true }), false, 'sin foto de un organismo');
  assert.equal(reintentoPorExcepcion({ ...descartada, razon: 'la foto tenía una marca de agua' }, ESCUELA_DE_BASQUET, { activa: true }), false, 'descartada por otra cosa');
  assert.equal(reintentoPorExcepcion({ ...descartada, archivo: 'fotos-notas/x.jpg' }, ESCUELA_DE_BASQUET, { activa: true }), false);
});

test('regla 186: la web muestra la foto con chicos sólo mientras el interruptor esté prendido y la nota la siga permitiendo', () => {
  const banco = { lf9d6b: { archivo: 'fotos-notas/lf9d6b.jpg', credito: 'Foto: Municipalidad de Balcarce', excepcion: { regla: 'menorEnActividadOficial' } } };
  const prendida = { fotoConMenorPermitida: (n) => fotoConMenorPermitida(n, { activa: true }) };
  const apagada = { fotoConMenorPermitida: (n) => fotoConMenorPermitida(n, { activa: false }) };
  assert.deepEqual(conFotosDelBanco([{ ...ESCUELA_DE_BASQUET }], banco, prendida)[0].foto, { archivo: 'fotos-notas/lf9d6b.jpg', credito: 'Foto: Municipalidad de Balcarce' });
  // Apagada: no se pone y, si ya la tenía, se le saca.
  assert.equal(conFotosDelBanco([{ ...ESCUELA_DE_BASQUET }], banco, apagada)[0].foto, undefined);
  assert.equal(conFotosDelBanco([{ ...ESCUELA_DE_BASQUET, foto: { archivo: 'fotos-notas/lf9d6b.jpg' } }], banco, apagada)[0].foto, undefined);
  // Por defecto manda el entorno (en las pruebas, apagado).
  assert.equal(conFotosDelBanco([{ ...ESCUELA_DE_BASQUET }], banco)[0].foto, undefined);
  // Prendida, pero una corrección la volvió policial: se saca.
  const corregida = { ...ESCUELA_DE_BASQUET, copete: 'Hubo una pelea y tuvo que intervenir la Policía.' };
  assert.equal(conFotosDelBanco([corregida], banco, prendida)[0].foto, undefined);
  // Una foto del banco SIN la excepción no cambia en nada.
  const normal = { lf9d6b: { archivo: 'fotos-notas/lf9d6b.jpg', credito: 'Foto: X' } };
  assert.ok(conFotosDelBanco([{ ...ESCUELA_DE_BASQUET }], normal, apagada)[0].foto);
});

test('regla 186: el collage de un repaso (va a las redes) nunca usa una foto que entró por la excepción', () => {
  const banco = {
    a: { archivo: 'fotos-notas/a.jpg', medio: 'Municipalidad de Balcarce', excepcion: { regla: 'menorEnActividadOficial' } },
    b: { archivo: 'fotos-notas/b.jpg', medio: 'Radio Gabal' },
  };
  const fotos = fotosDelRepaso({ notasDelRepaso: ['a', 'b'] }, banco, '/fotos', { existe: () => true, peso: () => 999_999 });
  assert.deepEqual(fotos.map((f) => f.id), ['b']);
});

test('regla 186: "Actualizar la web" le pasa el interruptor a la corrida, y generar-datos registra cada foto aceptada', () => {
  const yml = fs.readFileSync(path.join(RAIZ, '.github', 'workflows', 'actualizar.yml'), 'utf8');
  assert.match(yml, /FOTOS_MENORES_OFICIALES: \$\{\{ vars\.FOTOS_MENORES_OFICIALES \}\}/);
  const gen = fs.readFileSync(path.join(RAIZ, 'web', 'scripts', 'generar-datos.mjs'), 'utf8');
  assert.match(gen, /porExcepcion/);
  assert.match(gen, /sinFotoConMenorBloqueada/);
});
