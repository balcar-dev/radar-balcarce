// Cómo se decide qué se publica, en qué sección y con qué prioridad.
//
// Esta es la parte editorial: el semáforo, el puntaje y la limpieza del
// texto. Son las reglas que hacen que el sitio se actualice solo sin que
// nadie mire, así que un error acá se publica solo también.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas, aplicarCupos } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';
import { CUPO_DE_AFUERA } from '../ingesta/fuentes.mjs';

const {
  normalizar, parecido, sentenciar, esDeBalcarce, figuraQueNombra,
  clasificar, semaforo, limpiarCopete, relevancia, idDe, parsearScrape, pisoDe,
} = paraPruebas;

/** Una nota mínima, para no repetir diez campos en cada prueba. */
function nota(extra = {}) {
  return {
    titulo: '', cuerpo: '', categorias: [], peso: 20, alcance: 'local',
    fecha: new Date(), imagen: null, ...extra,
  };
}

// ---------------------------------------------------------------- el texto

test('normalizar saca tildes, mayúsculas y puntuación', () => {
  assert.equal(normalizar('Automovilismo: el TC en Balcarce'), 'automovilismo el tc en balcarce');
  assert.equal(normalizar('ÑOÑO, ¿sí?'), 'nono si');
});

test('parecido reconoce la misma noticia contada por dos medios', () => {
  const a = 'Choque en la ruta 226 a la altura de Balcarce';
  const b = 'Un choque en la ruta 226 cerca de Balcarce dejó dos heridos';
  assert.ok(parecido(a, b) > 0.4, 'dos versiones de la misma noticia');
  assert.ok(parecido(a, 'El Concejo aprobó el presupuesto') < 0.2, 'noticias distintas');
});

test('un título en mayúsculas se pasa a redacción normal', () => {
  // Los medios locales publican así, y en la portada quedaba gritando.
  const t = sentenciar('EL CONCEJO APROBO EL PRESUPUESTO 2027', 'El Concejo Deliberante aprobó...');
  assert.equal(t, 'El Concejo aprobo el presupuesto 2027');
});

test('los nombres propios del cuerpo sobreviven al cambio', () => {
  const t = sentenciar('GANO FERROVIARIOS EN BALCARCE', 'Ferroviarios ganó en Balcarce el domingo');
  assert.ok(t.includes('Ferroviarios'), t);
  assert.ok(t.includes('Balcarce'), t);
});

test('un título ya bien escrito no se toca', () => {
  const original = 'El Concejo aprobó el presupuesto';
  assert.equal(sentenciar(original, ''), original);
});

test('el copete no repite el título', () => {
  // Muchos feeds mandan el título otra vez como descripción. Publicarlo
  // así es ocupar tres renglones para no decir nada nuevo.
  const titulo = 'El Concejo aprobó el presupuesto 2027';
  assert.equal(limpiarCopete(titulo, titulo, 'La Vanguardia'), '');
});

test('el copete pierde la firma del medio', () => {
  const c = limpiarCopete(
    'La sesión duró cuatro horas y terminó con doce votos a favor del oficialismo local | Diario La Vanguardia',
    'El Concejo aprobó el presupuesto',
    'Diario La Vanguardia',
  );
  assert.ok(!c.includes('La Vanguardia'), c);
  assert.ok(c.startsWith('La sesión duró cuatro horas'));
});

test('el "seguir leyendo" del final no es parte de la noticia', () => {
  // Pasó el 22/09: una nota de Radio Gabal terminaba el copete en "Leer
  // más…", que es el link de la fuente para ir a su propia nota, no algo
  // que haya dicho la fuente sobre el tema.
  const c = limpiarCopete(
    'El integrante de la Asociación Autódromo se emocionó al recordar al reconocido constructor. Leer más…',
    'Mario Alberghini recordó a Tulio Crespi',
    'Radio Gabal',
  );
  assert.ok(!/leer\s*m[aá]s/i.test(c), c);
  assert.ok(c.endsWith('constructor.'), c);
});

test('un copete demasiado corto se descarta', () => {
  assert.equal(limpiarCopete('Seguí leyendo', 'Un título cualquiera', 'El Diario'), '');
});

test('un copete largo se corta en una palabra entera, no a la mitad', () => {
  // Pasó el 22/09: el corte a los 280 caracteres caía en plena palabra o en
  // plena frase ("...pasión por los"), sin ningún "…" que avisara que
  // seguía. Se veía como una nota rota, no como un resumen.
  const cuerpo = `${'Una palabra '.repeat(30)}más para completar el texto original de la fuente.`;
  const c = limpiarCopete(cuerpo, 'Un título cualquiera', 'El Diario');
  assert.ok(c.length <= 281, c.length); // 280 + el "…"
  assert.ok(c.endsWith('…'), c);
  assert.ok(!/\bpalabr$/.test(c.slice(0, -1)), 'no corta una palabra a la mitad');
});

// ------------------------------------------------------------ las secciones

test('lo que pasa en Balcarce se reconoce aunque la fuente sea de afuera', () => {
  assert.ok(esDeBalcarce(nota({ alcance: 'provincia', titulo: 'Un vecino de Balcarce ganó el premio' })));
  assert.ok(!esDeBalcarce(nota({ alcance: 'pais', titulo: 'Suba del dólar', cuerpo: 'El mercado cerró en alza' })));
});

test('el automovilismo le gana a deportes', () => {
  // En Balcarce los fierros son sección propia: es la ciudad de Fangio, no
  // un subtema de deportes.
  const n = nota({ titulo: 'El TC corre en Balcarce', seccionFuente: 'Deportes' });
  assert.equal(clasificar(n), 'Automovilismo');
});

test('gana la palabra más específica, no la primera regla de la lista', () => {
  // "La Exposición Rural de Palermo" salió publicada en Cultura porque
  // "exposición" está en esa regla y Cultura se evalúa antes que Agro.
  // Ahora gana "exposición rural", que dice más sobre de qué se trata.
  const campo = nota({
    titulo: 'Reclamos del campo al Gobierno por impuestos',
    cuerpo: 'La Exposición Rural de Palermo cerró con pedidos del sector agropecuario.',
    alcance: 'pais',
  });
  assert.equal(clasificar(campo), 'Agro');
});

test('una exposición que sí es de cultura sigue en cultura', () => {
  const muestra = nota({
    titulo: 'Se inaugura una exposición de fotos en el Museo',
    cuerpo: 'Muestra del fotógrafo local.',
  });
  assert.equal(clasificar(muestra), 'Cultura y agenda');
});

test('si la fuente ya viene separada por sección, se le cree', () => {
  const n = nota({ titulo: 'Ganó el equipo local', seccionFuente: 'Deportes' });
  assert.equal(clasificar(n), 'Deportes');
});

test('reconoce a las figuras argentinas de afuera', () => {
  const n = nota({ titulo: 'Colapinto terminó séptimo en Monza', alcance: 'pais' });
  assert.equal(figuraQueNombra(n), 'colapinto');
  assert.equal(figuraQueNombra(nota({ titulo: 'Suba de tarifas' })), null);
});

// -------------------------------------------------------------- el semáforo

test('un tema sensible nunca sale solo', () => {
  const s = semaforo(nota({ titulo: 'Detuvieron a un hombre por un femicidio' }), 'Balcarce');
  assert.equal(s.color, 'rojo');
  assert.ok(s.motivo.includes('sensible'));
});

test('el semáforo explica siempre por qué', () => {
  // El panel muestra el motivo al lado de cada nota: una decisión sin
  // explicación no se puede discutir ni corregir.
  for (const titulo of ['Ganó Ferroviarios', 'Detuvieron a dos personas', 'Corte de luz en el centro']) {
    const s = semaforo(nota({ titulo }), 'Balcarce');
    assert.ok(s.motivo && s.motivo.length > 3, 'sin motivo: ' + titulo);
    assert.ok(['verde', 'amarillo', 'rojo'].includes(s.color));
  }
});

test('un comunicado oficial sale solo', () => {
  const s = semaforo(nota({ titulo: 'El municipio informa el corte de agua', oficial: true }), 'Servicios');
  assert.equal(s.color, 'verde');
});

// --------------------------------------------------------------- el puntaje

test('lo de Balcarce pesa más que lo de afuera', () => {
  const local = relevancia(nota({ titulo: 'Obras en el Cerro El Triunfo' }), 'Balcarce', 1);
  const afuera = relevancia(nota({ titulo: 'Suba del dólar', alcance: 'pais' }), 'País', 1);
  assert.ok(local > afuera, local + ' debería ganarle a ' + afuera);
});

test('dos medios contando lo mismo suman', () => {
  const n = nota({ titulo: 'Choque en la ruta 226' });
  assert.ok(relevancia(n, 'Balcarce', 2) > relevancia(n, 'Balcarce', 1));
});

test('sin fecha real no se premia la frescura', () => {
  // Si no sabemos cuándo salió, no puede competir con una que sí tiene hora.
  const conHora = nota({ titulo: 'Algo pasó hoy' });
  const sinHora = nota({ titulo: 'Algo pasó hoy', fechaEstimada: true });
  assert.ok(relevancia(conHora, 'Balcarce', 1) > relevancia(sinHora, 'Balcarce', 1));
});

test('el puntaje nunca pasa de 100', () => {
  const todo = nota({
    titulo: 'El TC corre en Balcarce', peso: 90,
    imagen: 'x', textoCompleto: true, nombraBalcarce: true, figura: 'messi',
  });
  assert.ok(relevancia(todo, 'Automovilismo', 4) <= 100);
});


// ------------------------------------------ palabras que engañan al filtro

test('una palabra corta no encuentra otra más larga', () => {
  // "gol" encontraba "golpe", y por eso "Los extremismos dan un doble golpe
  // en Alemania" salió publicada en Deportes. De cuatro letras para abajo se
  // exige la palabra entera.
  const alemania = nota({
    titulo: 'Los extremismos dan un doble golpe en Alemania',
    cuerpo: 'El canciller Merz quedó en una posición delicada.',
    alcance: 'pais',
  });
  assert.notEqual(clasificar(alemania), 'Deportes');
});

test('"partido" en el cuerpo no manda una nota a Deportes', () => {
  // En la provincia de Buenos Aires un partido es un municipio. "Recordaron a
  // Domingo Teruggi a 50 años de su asesinato" hablaba del partido de Lobería
  // y terminó en Deportes.
  const robo = nota({
    titulo: 'Violento robo en la puerta de un kiosco',
    cuerpo: 'Ocurrió en el partido de Lobería, donde se llevaron la recaudación.',
    alcance: 'region',
  });
  assert.equal(clasificar(robo), 'Policiales');
});

test('"partido" en el titular sí cuenta', () => {
  // Cuando la nota es realmente de fútbol, la palabra está en el titular y no
  // hay otra que la delate.
  const boca = nota({
    titulo: 'Boca le ganó a San Lorenzo y llegó a 14 partidos sin perder',
    cuerpo: 'El equipo sigue invicto.',
    alcance: 'pais',
  });
  assert.equal(clasificar(boca), 'Deportes');
});

test('un descenso de temperatura no es un descenso de categoría', () => {
  const frio = nota({
    titulo: 'Se desploma la temperatura y vuelve el frío al AMBA',
    cuerpo: 'El ingreso de aire frío provocará un marcado descenso de las temperaturas.',
    alcance: 'pais',
  });
  assert.equal(clasificar(frio), 'País');
});

// ------------------------------------------------ el piso para lo de afuera

test('lo de Balcarce sale solo aunque puntúe poco', () => {
  const local = nota({ titulo: 'Arreglan una vereda en el centro', local: true });
  assert.equal(semaforo(local, 'Balcarce', 20).color, 'verde');
});

test('lo de afuera con poco puntaje espera', () => {
  // El 20/09 "Turismo invita a recorrer los parajes rurales de Lobería" (10
  // puntos) salía sola mientras la caravana del campeón balcarceño (100)
  // esperaba aprobación.
  const afuera = nota({ titulo: 'Boca derrota a San Lorenzo', alcance: 'pais', local: false });
  const s = semaforo(afuera, 'Deportes', 37);
  assert.equal(s.color, 'amarillo');
  assert.match(s.motivo, /poco puntaje/);
});

test('lo de afuera con buen puntaje sale igual', () => {
  const messi = nota({ titulo: 'Messi metió dos goles en Inter Miami', alcance: 'pais', local: false });
  assert.equal(semaforo(messi, 'Deportes', 89).color, 'verde');
});

test('el automovilismo no tiene piso', () => {
  // Es la ciudad de Fangio. Con el piso puesto, las notas de Fórmula 1
  // quedaban justo abajo (48 de 50) y la sección se vaciaba.
  const f1 = nota({ titulo: 'El complicado arte de frenar en la Fórmula 1', alcance: 'pais', local: false });
  assert.equal(semaforo(f1, 'Automovilismo', 48).color, 'verde');
});

test('el piso no pisa a las reglas de arriba', () => {
  // Un tema sensible sigue bloqueado por más puntaje que tenga, y una
  // promoción sigue esperando por más local que sea.
  const grave = nota({ titulo: 'Detuvieron a un hombre por un femicidio', local: true });
  assert.equal(semaforo(grave, 'Balcarce', 100).color, 'rojo');
  const rifa = nota({ titulo: 'La rifa de Bomberos ya tiene su sorteo', local: true });
  assert.equal(semaforo(rifa, 'Balcarce', 90).color, 'amarillo');
});

test('Política y Policiales salen solas cuando no hay nada sensible', () => {
  // Estaban afuera y tenían 38 notas esperando que nadie aprobaba: dos
  // secciones enteras que no existían para el lector. Entraron el 21/09.
  const p = nota({ titulo: 'Se define la interna del oficialismo', local: true });
  assert.equal(semaforo(p, 'Política', 70).color, 'verde');
  const po = nota({ titulo: 'Chocaron dos autos en la ruta', local: true });
  assert.equal(semaforo(po, 'Policiales', 70).color, 'verde');
});

test('en Policiales lo grave sigue esperando a una persona', () => {
  // Esto es lo que hace segura la entrada de la sección: no que esté
  // afuera, sino que todo lo que acusa, mata o involucra a un chico espere.
  const casos = [
    'Detuvieron a un hombre por el homicidio de un vecino',
    'Encontraron un cadáver en el arroyo',
    'Un adolescente fue baleado en el barrio Norte',
    'Apuñalaron a un joven a la salida de un boliche',
    'El acusado declaró ante el fiscal',
  ];
  for (const titulo of casos) {
    const s = semaforo(nota({ titulo, local: true }), 'Policiales', 90);
    assert.notEqual(s.color, 'verde', 'salió sola: ' + titulo);
  }
});

test('una muerte espera se la llame como se la llame', () => {
  // "Murió Mario Torres" salió sola porque el filtro sólo conocía "muerte" y
  // "falleció". Es una necrológica, y las necrológicas no salen sin fuente
  // firmada.
  for (const titulo of ['Murió un reconocido vecino', 'Falleció el histórico dirigente', 'Es el velatorio de un docente']) {
    const s = semaforo(nota({ titulo, local: true }), 'Balcarce', 90);
    assert.notEqual(s.color, 'verde', 'salió sola: ' + titulo);
  }
});

test('la política de todos los días ya no espera', () => {
  // "intendente", "concejo deliberante", "paro" y "reclamo" frenaban
  // Política entera. Lo que acusa sigue esperando: eso es otra lista.
  for (const titulo of ['El intendente inauguró una obra', 'El Concejo Deliberante aprobó el presupuesto', 'Reclamo de vecinos por el alumbrado']) {
    assert.equal(semaforo(nota({ titulo, local: true }), 'Política', 70).color, 'verde', titulo);
  }
  assert.notEqual(semaforo(nota({ titulo: 'Denuncian al intendente por irregularidades', local: true }), 'Política', 90).color, 'verde');
});

test('Economía y Tecnología también salen solas', () => {
  const e = nota({ titulo: 'El dólar cerró en alza', alcance: 'pais', local: false });
  assert.equal(semaforo(e, 'Economía', 45).color, 'verde');
  const t = nota({ titulo: 'Nueva herramienta de inteligencia artificial', alcance: 'pais', local: false });
  assert.equal(semaforo(t, 'Tecnología', 45).color, 'verde');
});

// ------------------------------------------------ pisos y cupos por sección

test('el piso de Deportes es más alto que el de las demás', () => {
  // Deportes es casi un tercio de todo lo que entra y no define a un medio
  // de Balcarce. Una nota de afuera con 55 puntos sale en Economía y espera
  // en Deportes.
  const afuera = (titulo) => nota({ titulo, alcance: 'pais', local: false });
  assert.equal(semaforo(afuera('Boca ganó en la Bombonera'), 'Deportes', 55).color, 'amarillo');
  assert.equal(semaforo(afuera('El BCRA subió la tasa'), 'Economía', 55).color, 'verde');
  assert.ok(pisoDe('Deportes') > pisoDe('Economía'));
});

test('el cupo se queda con las de más puntaje', () => {
  // Un domingo de fútbol tiene treinta notas arriba del piso, y la portada
  // de Balcarce sería la de Olé.
  const portada = Array.from({ length: 25 }, (_, i) => ({
    id: 'd' + i, seccion: 'Deportes', semaforo: 'verde', local: false, nombraBalcarce: false,
    relevancia: 90 - i,
  }));
  aplicarCupos(portada);
  const salen = portada.filter((n) => n.semaforo === 'verde');
  assert.equal(salen.length, 10);
  assert.equal(salen[0].id, 'd0', 'tienen que ser las de más puntaje');
  assert.match(portada[24].motivo, /cupo/);
});

test('lo de Balcarce no tiene cupo, ni siquiera en automovilismo', () => {
  const portada = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'l' + i, seccion: 'Deportes', semaforo: 'verde', local: true, relevancia: 80 })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'a' + i, seccion: 'Automovilismo', semaforo: 'verde', local: true, relevancia: 60 })),
  ];
  aplicarCupos(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, 60);
});

test('el automovilismo de afuera tiene cupo desde el 25/09', () => {
  // Ese día la portada tenía 45 notas de fierros (22 de afuera) contra 40 de
  // Balcarce: la sección más grande del medio de Balcarce era la Fórmula 1.
  const portada = Array.from({ length: 30 }, (_, i) => ({
    id: 'a' + i, seccion: 'Automovilismo', semaforo: 'verde', local: false, nombraBalcarce: false, relevancia: 90 - i,
  }));
  aplicarCupos(portada);
  const salen = portada.filter((n) => n.semaforo === 'verde');
  assert.equal(salen.length, CUPO_DE_AFUERA.Automovilismo);
  assert.ok(salen.length > 0, 'la sección no puede quedar vacía');
  assert.equal(salen[0].id, 'a0', 'se quedan las de más puntaje');
});

test('con los cupos del 25/09, Balcarce es la sección con más notas', () => {
  // La portada del 25/09 a la noche, contada por sección: lo local y lo de
  // afuera. Con los cupos nuevos, lo de afuera no puede pasar a Balcarce.
  const hoy = {
    Balcarce: { local: 40, afuera: 0 },
    Automovilismo: { local: 23, afuera: 22 },
    Política: { local: 23, afuera: 4 },
    Deportes: { local: 22, afuera: 1 },
    Agro: { local: 12, afuera: 0 },
    Economía: { local: 4, afuera: 6 },
    Tecnología: { local: 1, afuera: 6 },
  };
  const portada = Object.entries(hoy).flatMap(([seccion, { local, afuera }]) => [
    ...Array.from({ length: local }, (_, i) => ({ id: `${seccion}-l${i}`, seccion, semaforo: 'verde', local: true, relevancia: 70 })),
    ...Array.from({ length: afuera }, (_, i) => ({ id: `${seccion}-a${i}`, seccion, semaforo: 'verde', local: false, relevancia: 60 - i })),
  ]);
  aplicarCupos(portada);
  const por = {};
  for (const n of portada.filter((x) => x.semaforo === 'verde')) por[n.seccion] = (por[n.seccion] ?? 0) + 1;
  const [primera] = Object.entries(por).sort((a, b) => b[1] - a[1]);
  assert.equal(primera[0], 'Balcarce', JSON.stringify(por));
  for (const s of Object.keys(hoy)) assert.ok(por[s] > 0, `${s} quedó vacía`);
});

test('semana del autódromo y de F1 (25/09 a la madrugada): Balcarce sigue primera', () => {
  const hoy = {
    Balcarce: { local: 24, afuera: 0 },
    Automovilismo: { local: 16, afuera: 12 },
    Política: { local: 12, afuera: 5 },
  };
  const portada = Object.entries(hoy).flatMap(([seccion, { local, afuera }]) => [
    ...Array.from({ length: local }, (_, i) => ({ id: `${seccion}-l${i}`, seccion, semaforo: 'verde', local: true, relevancia: 70 })),
    ...Array.from({ length: afuera }, (_, i) => ({ id: `${seccion}-a${i}`, seccion, semaforo: 'verde', local: false, relevancia: 60 - i })),
  ]);
  aplicarCupos(portada);
  const por = {};
  for (const n of portada.filter((x) => x.semaforo === 'verde')) por[n.seccion] = (por[n.seccion] ?? 0) + 1;
  assert.ok(por.Balcarce > por.Automovilismo, JSON.stringify(por));
  assert.ok(por.Automovilismo >= 16 + 1, 'lo del autódromo sale entero y algo de la F1 también');
});

test('el cupo no toca lo que ya esperaba', () => {
  const portada = [{ id: 'x', seccion: 'Deportes', semaforo: 'amarillo', local: false, relevancia: 99, motivo: 'otro' }];
  aplicarCupos(portada);
  assert.equal(portada[0].motivo, 'otro');
});

// ------------------------------------------------- lo que no es una nota

test('un bloque de texto de la página no es un titular', () => {
  // El 20/09 salió publicado el "quiénes somos" de El Diario como si fuera
  // una noticia. El titular más largo que publicaron las 24 fuentes ese día
  // tiene 99 caracteres y la mediana es 53.
  const quienesSomos = 'El único diario de Balcarce de aparición en papel y en formato '
    + 'digital. Nuestro compromiso es informar con la verdad, con información chequeada, '
    + 'sin tergiversación y con compromiso con el ciudadano.';
  const html = `<article><h2><a href="/quienes-somos">${quienesSomos}</a></h2></article>`
    + '<article><h2><a href="/nota/1">Inauguran una plaza en el barrio Norte</a></h2></article>';
  const notas = parsearScrape(html, { nombre: 'El Diario', medio: 'El Diario', base: 'https://x.ar', peso: 20 });
  const titulos = notas.map((n) => n.titulo);
  assert.ok(!titulos.some((t) => t.includes('único diario')), titulos.join(' | '));
});

// ------------------------------------------- quién manda sobre el semáforo

test('sólo una persona le gana al semáforo', () => {
  assert.equal(decisionHumana({ estado: 'publicada', por: 'Hernán' }), true);
  assert.equal(decisionHumana({ estado: 'descartada', por: 'Andrés' }), true);
});

test('lo que guardó la máquina no cuenta', () => {
  // Es una foto del semáforo de ese día. Si se la respetara, apretar las
  // reglas no cambiaría nada de lo ya publicado: el 21/09 dejó 29 notas de
  // Deportes por encima del cupo nuevo.
  assert.equal(decisionHumana({ estado: 'automatica', por: 'ia' }), false);
  assert.equal(decisionHumana({ estado: 'automatica' }), false);
  assert.equal(decisionHumana({ estado: 'pendiente', por: null }), false);
});

test('sin decisión, manda el semáforo', () => {
  assert.equal(decisionHumana(undefined), false);
  assert.equal(decisionHumana(null), false);
});

// ------------------------------------------------------------------ el id

test('el mismo título da siempre el mismo id', () => {
  // De esto depende que una nota no se duplique en cada corrida y que las
  // decisiones del panel sigan aplicando después de reiniciar.
  assert.equal(idDe('El Concejo aprobó el presupuesto'), idDe('El Concejo aprobó el presupuesto'));
  assert.notEqual(idDe('Una nota'), idDe('Otra nota'));
});
