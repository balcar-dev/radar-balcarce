// Cómo se decide qué se publica, en qué sección y con qué prioridad.
//
// Esta es la parte editorial: el semáforo, el puntaje y la limpieza del
// texto. Son las reglas que hacen que el sitio se actualice solo sin que
// nadie mire, así que un error acá se publica solo también.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas } from '../ingesta/ingesta.mjs';

const {
  normalizar, parecido, sentenciar, esDeBalcarce, figuraQueNombra,
  clasificar, semaforo, limpiarCopete, relevancia, idDe,
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

test('un copete demasiado corto se descarta', () => {
  assert.equal(limpiarCopete('Seguí leyendo', 'Un título cualquiera', 'El Diario'), '');
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

// ------------------------------------------------------------------ el id

test('el mismo título da siempre el mismo id', () => {
  // De esto depende que una nota no se duplique en cada corrida y que las
  // decisiones del panel sigan aplicando después de reiniciar.
  assert.equal(idDe('El Concejo aprobó el presupuesto'), idDe('El Concejo aprobó el presupuesto'));
  assert.notEqual(idDe('Una nota'), idDe('Otra nota'));
});
