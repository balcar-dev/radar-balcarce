// La auditoría de la redacción del 29/09: 18 notas de la IA leídas al lado de
// sus originales, y las ocho que esperaban cuerpo con el motivo de cada
// rechazo. Lo que se arregló en el código, con el caso real.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificar, numerosDe } from '../ingesta/verificar.mjs';
import { sinNegacionQueEstaEnElCuerpo, motivoCorto } from '../reels/reescritura.mjs';
import { extraerTexto } from '../ingesta/articulo.mjs';

const RELLENO_DE_PRUEBA = 'la entidad explicó el pedido ante los productores de la zona'.split(' ');
const CUERPO_LARGO = (base) => `${base} ${Array.from({ length: 70 }, (_, i) => RELLENO_DE_PRUEBA[i % RELLENO_DE_PRUEBA.length]).join(' ')}.`;

test('la negación del título de la fuente dicha en el cuerpo no tira la nota (29/09: dos de ocho esperaban cuerpo por esto)', () => {
  const fuente = {
    titulo: 'Federación Agraria: "Es necesario que las retenciones tengan un fin, que no sean eternas"',
    resumen: 'La Federación Agraria Argentina reclamó que las retenciones a las exportaciones tengan un final y no sean permanentes.',
  };
  const nota = {
    titulo: 'La Federación Agraria pide ponerles un final a las retenciones',
    copete: 'La entidad reclamó que las retenciones a las exportaciones tengan fecha de finalización.',
    cuerpo: CUERPO_LARGO('La Federación Agraria Argentina reclamó que las retenciones no sean permanentes.'),
    guion: 'La Federación Agraria pide ponerles un final a las retenciones.',
  };
  const completo = verificar(fuente, nota);
  const cabeza = verificar(fuente, { ...nota, cuerpo: '' });
  assert.ok(cabeza.problemas.some((p) => p.tipo === 'negacion'), 'sin el cuerpo, la queja aparece (así se revisa el título)');
  assert.ok(!completo.problemas.some((p) => p.tipo === 'negacion'), 'con el cuerpo, la negación está');
  assert.ok(!sinNegacionQueEstaEnElCuerpo(cabeza, completo).problemas.some((p) => p.tipo === 'negacion'));
  // Si tampoco el cuerpo la dice, la queja queda: el sentido se habría dado vuelta.
  const sinNegar = { ...nota, cuerpo: CUERPO_LARGO('La Federación Agraria Argentina reclamó sobre las retenciones.') };
  const completo2 = verificar(fuente, sinNegar);
  const cabeza2 = verificar(fuente, { ...sinNegar, cuerpo: '' });
  assert.ok(sinNegacionQueEstaEnElCuerpo(cabeza2, completo2).problemas.some((p) => p.tipo === 'negacion'));
});

test('las calles de un corte de luz llegan a la IA: una lista de la nota cuenta como un párrafo; una de enlaces, no (29/09)', () => {
  // La página real de Radio Gabal, recortada: cada calle tiene menos de 50 letras
  // y la lista entera se perdía, así que la nota decía "distintas arterias de la ciudad".
  const html = `<html><body><article>
    <p><span>La Cooperativa de Electricidad informó que este miércoles 30 de septiembre se realizará un corte de suministro eléctrico debido a trabajos sobre líneas de baja tensión.</span></p>
    <p><span>La interrupción está prevista entre las </span><strong><span>7:30 y las 13 horas</span></strong><span> y afectará a la mayoría de los usuarios ubicados en las siguientes arterias:</span></p>
    <ul data-spread="false"><li><p><strong><span>Calle 18</span></strong><span>, entre 41 y 45, vereda impar.</span></p></li>
    <li><p><strong><span>Calle 20</span></strong><span>, entre 41 y 43, ambas veredas.</span></p></li>
    <li><p><strong><span>Calle 43</span></strong><span>, entre 18 y 24, ambas veredas.</span></p></li></ul>
    <p><span>Desde la entidad indicaron que el servicio permanecerá interrumpido mientras se desarrollen las tareas programadas.</span></p>
    <ul><li><a href="/deportes/guillen">Guillén: “Con una vuelta del TC a Balcarce podemos pensar en 60.000 personas”</a></li>
    <li><a href="/comunidad/postre">Presentarán este viernes una nueva edición de la Fiesta Nacional del Postre</a></li></ul>
  </article></body></html>`;
  const texto = extraerTexto(html);
  assert.match(texto, /Calle 18, entre 41 y 45, vereda impar; Calle 20, entre 41 y 43, ambas veredas; Calle 43, entre 18 y 24, ambas veredas\./);
  assert.ok(!texto.includes('Guillén'), 'la lista de enlaces relacionados no es la nota');
  assert.ok(texto.indexOf('Calle 18') < texto.indexOf('Desde la entidad'), 'la lista va en su lugar');
});

test('"35 milímetros" son 35, no 35 mil: una nota de lluvias no se cae por los milímetros (29/09)', () => {
  assert.deepEqual(numerosDe('Llovieron 35 milímetros en Balcarce'), [35]);
  assert.deepEqual(numerosDe('Hubo 12 millonarios en la lista'), [12]);
  // Lo de siempre sigue igual.
  assert.deepEqual(numerosDe('Costará 35 mil pesos'), [35000]);
  assert.deepEqual(numerosDe('2 millones y medio de dólares'), [2500000]);
  const fuente = { titulo: 'Las lluvias llegaron a 50 mm en la zona de Bosch', resumen: 'YPF-AGRO informó: Balcarce: 35 mm; Las Marías (Bosch): 50 mm; Mechongué: 18 mm.' };
  const r = verificar(fuente, {
    titulo: 'La lluvia deja 35 milímetros en Balcarce y 50 en la zona de Bosch',
    copete: 'El valor más bajo se midió en Mechongué: 18 milímetros.',
  });
  assert.ok(!r.problemas.some((p) => p.tipo === 'numero'), JSON.stringify(r.problemas));
});

test('cuando la IA copia, la corrección le dice qué frase; el motivo público no la lleva', () => {
  const fuente = {
    titulo: 'Balcarce presente en la Feria Internacional de Turismo',
    resumen: 'Integrantes del equipo de la Subsecretaría de Turismo de Balcarce participaron de uno de los principales encuentros del sector, que reúne a destinos y prestadores.',
  };
  const r = verificar(fuente, {
    titulo: 'Balcarce muestra sus propuestas en la Feria Internacional de Turismo',
    copete: 'La Subsecretaría de Turismo estuvo en la feria.',
    cuerpo: CUERPO_LARGO('Integrantes del equipo de la Subsecretaría de Turismo de Balcarce participaron de uno de los principales encuentros del sector.'),
  });
  const copia = r.problemas.find((p) => p.tipo === 'copia');
  assert.ok(copia, 'no vio la copia');
  assert.match(copia.detalle, /^copia \d+ palabras seguidas del original \("integrantes del equipo de la subsecretaria/);
  assert.match(copia.detalle, /decilo con otras palabras/);
  const motivo = motivoCorto([copia]);
  assert.match(motivo, /copia \d+ palabras seguidas del original/);
  assert.ok(!motivo.includes('integrantes del equipo'), 'la frase copiada quedaría en intentos-ia.json, que es público');
});
