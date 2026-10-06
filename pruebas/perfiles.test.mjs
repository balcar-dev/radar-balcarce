// Los textos de los perfiles de Instagram y Facebook (PERFILES.md): prolijos,
// dentro del límite de cada red, con la página escrita `radarbalcarce.com` en
// los dos y sin nombrar las farmacias (decisión del 26/09).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const md = fs.readFileSync(new URL('../PERFILES.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** El bloque de código que sigue a un rótulo en negrita que empieza con `rotulo`. */
function bloque(rotulo) {
  const i = md.indexOf(`**${rotulo}`);
  assert.ok(i >= 0, `PERFILES.md no tiene "${rotulo}"`);
  const m = md.slice(i).match(/```\n([\s\S]*?)\n```/);
  assert.ok(m, `"${rotulo}" no trae un bloque de texto`);
  return m[1];
}

const bioIG = bloque('Bio de Instagram');
const breveFB = bloque('Información breve de Facebook');
const largaFB = bloque('Descripción larga de Facebook');

test('la bio de Instagram entra en 150 caracteres y la información breve de Facebook en 101', () => {
  assert.ok(bioIG.length <= 150, `la bio de Instagram tiene ${bioIG.length}`);
  assert.ok(breveFB.length <= 101, `la información breve de Facebook tiene ${breveFB.length}`);
});

test('los dos perfiles dicen la página como radarbalcarce.com, nunca .com.ar', () => {
  for (const [nombre, texto] of [['bio de Instagram', bioIG], ['info breve de Facebook', breveFB], ['descripción larga de Facebook', largaFB]]) {
    assert.match(texto, /radarbalcarce\.com/, `${nombre} no nombra la página`);
    assert.doesNotMatch(texto, /\.com\.ar|radarbalcarce\.con\b/i, `${nombre} escribe mal la página`);
  }
});

test('los perfiles no nombran las farmacias ni prometen revisión humana de todo', () => {
  for (const texto of [bioIG, breveFB, largaFB]) {
    assert.doesNotMatch(texto, /farmacia/i);
    assert.doesNotMatch(texto, /revisi[oó]n humana/i);
  }
});

test('el medio se llama siempre Radar Balcarce', () => {
  assert.match(largaFB, /Radar Balcarce/);
  for (const texto of [bioIG, breveFB, largaFB]) assert.doesNotMatch(texto, /radar\s?balcarce\s?\.?\s?ar\b/i);
});

test('la bio es la misma en Instagram y en Facebook (6/10, Hernán), y la página /compartir tiene los mismos textos para copiar', () => {
  assert.equal(bioIG, breveFB, 'las dos redes dicen lo mismo');
  assert.equal(bioIG, 'Todo lo que pasa en Balcarce, en un solo lugar. Noticias, clima y agenda. radarbalcarce.com');
  const pagina = fs.readFileSync(new URL('../web/app/compartir/page.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(pagina.includes(`const BIO = '${bioIG}';`), 'la bio de /compartir es la de PERFILES.md');
  assert.ok(pagina.includes(largaFB), 'la descripción larga de /compartir es la de PERFILES.md');
  assert.match(largaFB, /2266 51-1612/);
});
