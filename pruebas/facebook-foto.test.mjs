// 5/10/2026 (Hernán): "los posteos en Facebook salen con formato alternado y la idea era 5 posteos por día, en Facebook y en Instagram, con foto". Las notas salían como
// enlaces (el formato dependía de la tarjeta que Facebook armaba solo) y los reels como video. Ahora cada nota sale como posteo con foto, la misma imagen de Instagram.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { crearCliente } from '../redes/meta.mjs';
import { comoSaleEnFacebook, INTENTOS_DE_FOTO } from '../redes/espejo.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('una nota sale como foto en Facebook; si la foto no salió tras tres intentos, como enlace; y se puede apagar', () => {
  assert.equal(INTENTOS_DE_FOTO, 3);
  assert.equal(comoSaleEnFacebook({ intentosDeFoto: 0 }), 'foto');
  assert.equal(comoSaleEnFacebook({ intentosDeFoto: 2 }), 'foto');
  assert.equal(comoSaleEnFacebook({ intentosDeFoto: 3 }), 'enlace');
  assert.equal(comoSaleEnFacebook({ intentosDeFoto: 0, conFoto: false }), 'enlace', 'FACEBOOK_COMO_FOTO=no vuelve al enlace');
});

test('el cliente de Meta publica una foto en la página con su texto, y devuelve el id del posteo', async () => {
  const pedidos = [];
  const respuestas = [
    { json: { name: 'Radar Balcarce', link: 'x', access_token: 'TP', instagram_business_account: { id: '999', username: 'radarbalcarce' } } },
    { json: { id: 'foto1', post_id: '123_456' } },
  ];
  const fetchFn = async (url, init) => { pedidos.push({ url: String(url), init }); const r = respuestas.shift(); return { ok: true, status: 200, json: async () => r.json }; };
  const api = crearCliente({ token: 'TOKEN', paginaId: '123', fetchFn });
  const r = await api.publicarFotoEnFacebook({ imagenUrl: 'https://radarbalcarce.com/nota/x-abc/instagram.png', mensaje: 'Titular\n\nMás en radarbalcarce.com' });
  assert.equal(r.id, '123_456');
  assert.match(pedidos[1].url, /\/123\/photos$/);
  const cuerpo = new URLSearchParams(pedidos[1].init.body);
  assert.equal(cuerpo.get('url'), 'https://radarbalcarce.com/nota/x-abc/instagram.png');
  assert.equal(cuerpo.get('message'), 'Titular\n\nMás en radarbalcarce.com');
  assert.equal(cuerpo.get('published'), 'true');
});

test('el cliente de Meta lee lo último publicado en la página con la misma forma que Instagram', async () => {
  const respuestas = [
    { json: { name: 'Radar Balcarce', link: 'x', access_token: 'TP', instagram_business_account: { id: '999', username: 'radarbalcarce' } } },
    { json: { data: [{ id: '1_2', message: 'Un titular', created_time: '2026-10-05T18:45:00+0000' }, { id: '1_3', created_time: '2026-10-05T18:00:00+0000' }] } },
  ];
  const fetchFn = async () => ({ ok: true, status: 200, json: async () => respuestas.shift().json });
  const api = crearCliente({ token: 'TOKEN', paginaId: '123', fetchFn });
  const r = await api.publicacionesRecientesDeFacebook();
  assert.deepEqual(r[0], { id: '1_2', caption: 'Un titular', timestamp: '2026-10-05T18:45:00+0000' });
  assert.equal(r[1].caption, '', 'un posteo sin texto no rompe');
});

test('el posteo de Facebook usa la foto con el mismo texto que Instagram, mira si ya salió antes de dar un error por perdido, y vuelve al enlace tras tres intentos', () => {
  const c = leer('redes/publicar.mjs');
  assert.match(c, /api\.publicarFotoEnFacebook\(\{ imagenUrl: imagenDeNota\(nota, SITIO\), mensaje: pie \}\)/);
  assert.match(c, /const pie = FOTO_EN_INSTAGRAM \? conCreditoDeFoto\(mensajeDeNota\(nota, SITIO\), nota\) : mensajeDeNota\(nota, SITIO\);\s*try \{\s*r = await api\.publicarFotoEnFacebook/);
  assert.match(c, /posteoYaPublicado\(await api\.publicacionesRecientesDeFacebook\(\), pie\)/);
  assert.match(c, /comoSaleEnFacebook\(\{ intentosDeFoto, conFoto: FACEBOOK_COMO_FOTO \}\) === 'foto'/);
  assert.match(c, /api\.publicarEnFacebook\(\{ mensaje: mensajeDeNota\(nota, SITIO\), enlace \}\)/, 'el enlace queda de respaldo');
  assert.match(c, /process\.env\.FACEBOOK_COMO_FOTO !== 'no'/);
});
