// Regla 193 (17/10/2026, auditoría 2.0, docs/auditoria-2-0/04-IA-Y-MODELOS.md): el respaldo de Groq de la lectura con IA
// descartaba todas sus fichas. A Groq se le pedía `{"fichas": [ … ]}` sin decirle cómo se llama cada campo: la instrucción
// habla de «el ámbito» (con tilde) y nunca nombra los campos `ambito`, `importancia` ni `por_que_interesa`, ni los valores
// de `ambito` e `importancia`. Gemini no lo necesita (el esquema va aparte, `responseSchema`); Groq sí, y sin los nombres
// exactos `fichaValida` tiraba la ficha entera. Sin red: Groq se simula.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leerGrupoGroq, leerNotasNuevas, formaDeLaFicha, fichaDeGroq, fichaValida, esquema, instruccion, AMBITOS, IMPORTANCIAS,
} from '../ingesta/lectura-ia.mjs';

const NOTA = {
  id: 'abc', titulo: 'El Concejo aprueba el presupuesto', medio: 'El Diario Balcarce', resumenFuente: 'Sesión ordinaria.',
  seccion: 'Política', local: true, semaforo: 'verde',
};

/** Un Groq de mentira: guarda lo que se le pidió y contesta `respuesta`. */
function groqFalso(respuesta) {
  const pedidos = [];
  const fn = async (url, o) => {
    pedidos.push({ url, cuerpo: JSON.parse(o.body) });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(respuesta) } }] }) };
  };
  return { fn, pedidos };
}

test('lo que la instrucción común NO dice: el campo `ambito` ni los valores de sus listas (el porqué del arreglo)', () => {
  const comun = instruccion();
  assert.ok(!/"ambito"|\bambito\b/.test(comun), 'la instrucción dice «ámbito», nunca el campo `ambito`');
  // Desde el 17/10 (regla 215) nombra `importancia` para decir qué es de interés en ciencia, tecnología, educación y salud, pero no
  // sus tres valores como lista cerrada: eso sigue en el esquema (Gemini) y en formaDeLaFicha (Groq).
  assert.ok(!/"provincia"/.test(comun), 'ni los valores de la lista de ámbitos');
  assert.ok(!/"alta" \| "media"/.test(comun), 'ni la lista cerrada de importancias');
});

test('el pedido a Groq nombra TODOS los campos obligatorios del esquema, tal cual, con sus valores posibles', async () => {
  const { fn, pedidos } = groqFalso({ fichas: [] });
  await leerGrupoGroq([NOTA], { clave: 'g', fetchFn: fn });
  const texto = pedidos[0].cuerpo.messages[0].content;
  const { required, properties } = esquema().items;
  for (const campo of required) assert.ok(texto.includes(`"${campo}"`), `falta el campo "${campo}"`);
  for (const campo of required.filter((c) => properties[c].enum)) {
    for (const v of properties[campo].enum) assert.ok(texto.includes(`"${v}"`), `falta el valor "${v}" de ${campo}`);
  }
  assert.ok(texto.includes(formaDeLaFicha()));
  // Y lo de Gemini queda igual, letra por letra: la forma va sólo en el pedido a Groq.
  assert.ok(!instruccion().includes('"fichas"'));
});

test('una ficha de Groq con «ámbito», «Región» o «Alta» se lee igual; lo que falta no se inventa', async () => {
  const comoContestaba = {
    fichas: [{
      id: 'abc', 'ámbito': 'Región', seccion: 'política', impacto_balcarce: 'Directo', razon: 'local', importancia: 'Alta',
      es_publicidad: 'false', es_chimento: false, por_que_interesa: 'Pasa en Balcarce.',
    }],
  };
  const f = await leerGrupoGroq([NOTA], { clave: 'g', fetchFn: groqFalso(comoContestaba).fn });
  assert.deepEqual(Object.keys(f), ['abc']);
  assert.equal(f.abc.ambito, 'region');
  assert.equal(f.abc.seccion, 'Política');
  assert.equal(f.abc.importancia, 'alta');
  assert.equal(f.abc.publicidad, false);
  assert.equal(f.abc.ia, 'groq', 'queda anotado que contestó Groq');
  // Sin importancia (lo que pasaba con el pedido de antes), se descarta como siempre.
  const sinImportancia = { fichas: [{ ...comoContestaba.fichas[0], importancia: undefined }] };
  assert.deepEqual(await leerGrupoGroq([NOTA], { clave: 'g', fetchFn: groqFalso(sinImportancia).fn }), {});
  // Un valor que no está en la lista sigue sin valer.
  assert.equal(fichaValida(fichaDeGroq({ ...comoContestaba.fichas[0], 'ámbito': 'mundo' })), null);
  assert.ok(AMBITOS.includes('region') && IMPORTANCIAS.includes('alta'));
});

test('con Gemini sin cupo, la lectura sale de Groq aunque Groq escriba los campos a su manera', async () => {
  const groq = groqFalso([{ id: 'abc', 'Ámbito': 'balcarce', seccion: 'Política', 'impacto balcarce': 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'x' }]);
  const r = await leerNotasNuevas([NOTA], {
    fetchFn: async (url, o) => (String(url).includes('groq.com') ? groq.fn(url, o) : { ok: false, status: 429 }),
    ahora: new Date('2026-10-17T12:00:00Z'), clave: 'k', claveRespaldo: 'g',
  });
  assert.equal(r.cuenta.groq, 1);
  assert.equal(r.cuenta.nuevas, 1, 'la ficha de Groq se guardó');
  assert.equal(r.archivo.fichas.abc.ambito, 'balcarce');
});
