// Los canales propios (WhatsApp, Telegram, Bluesky): sólo existen si una persona carga su dirección en una variable (17/10/2026, regla 257).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CANALES, canalesDelMedio, canalDeWhatsApp, direccionDeCanal } from '../web/lib/canales.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('sin variables no hay ningún canal: el sitio sale como antes', () => {
  assert.deepEqual(canalesDelMedio({}), []);
  assert.deepEqual(canalesDelMedio({ WHATSAPP_CANAL_URL: '', TELEGRAM_CANAL_URL: '   ', BLUESKY_URL: undefined }), []);
  assert.equal(canalDeWhatsApp({}), null);
});

test('cada variable activa su canal, en el orden del pie', () => {
  const l = canalesDelMedio({
    BLUESKY_URL: 'https://bsky.app/profile/radarbalcarce.bsky.social',
    TELEGRAM_CANAL_URL: 'https://t.me/radarbalcarce',
    WHATSAPP_CANAL_URL: 'https://whatsapp.com/channel/0029VaXXXXXXXXXXXX',
  });
  assert.deepEqual(l.map((c) => c.id), ['whatsapp', 'telegram', 'bluesky']);
  assert.equal(l[0].url, 'https://whatsapp.com/channel/0029VaXXXXXXXXXXXX');
  assert.ok(l[0].cartel.boton, 'sólo el de WhatsApp lleva cartel');
  assert.equal(l[1].cartel, undefined);
  assert.equal(canalDeWhatsApp({ WHATSAPP_CANAL_URL: 'https://www.whatsapp.com/channel/0029Vabc' }).id, 'whatsapp');
  // Con una sola variable, un solo canal.
  assert.deepEqual(canalesDelMedio({ TELEGRAM_CANAL_URL: 'https://t.me/radarbalcarce' }).map((c) => c.id), ['telegram']);
});

test('una dirección mal pegada o ajena se ignora: nunca un enlace roto en todas las notas', () => {
  const wa = CANALES.find((c) => c.id === 'whatsapp').dominios;
  for (const malo of [
    'http://whatsapp.com/channel/x', // sin https
    'javascript:alert(1)',
    'https://evil.example/channel/x',
    'https://whatsapp.com.evil.example/channel/x',
    'https://usuario:clave@whatsapp.com/channel/x',
    'https://whatsapp.com',
    'https://whatsapp.com/',
    'whatsapp.com/channel/x',
    'no es una dirección',
    '',
  ]) assert.equal(direccionDeCanal(malo, wa), null, malo);
  assert.equal(direccionDeCanal(' https://WhatsApp.com/channel/0029Vabc ', wa), 'https://whatsapp.com/channel/0029Vabc');
  assert.equal(direccionDeCanal('https://telegram.me/radar', CANALES.find((c) => c.id === 'telegram').dominios), 'https://telegram.me/radar');
});

test('las variables se llaman como pidió Hernán', () => {
  assert.deepEqual(CANALES.map((c) => c.variable), ['WHATSAPP_CANAL_URL', 'TELEGRAM_CANAL_URL', 'BLUESKY_URL']);
});

test('los componentes no dibujan nada sin canales, y no cargan nada de terceros', () => {
  const c = leer('web/components/canales.js');
  assert.match(c, /if \(!c\) return null;/);
  assert.match(c, /if \(!lista\.length\) return null;/);
  assert.ok(!/<script|<iframe|document\.cookie/.test(c));
  assert.match(c, /rel="noopener noreferrer me"/);
});

test('el cartel va al final de cada nota y de /hoy; los enlaces, en el pie y en el marcado del medio', () => {
  assert.match(leer('web/app/nota/[id]/page.js'), /<CartelDelCanal \/>/);
  assert.match(leer('web/app/hoy/page.js'), /<CartelDelCanal \/>/);
  assert.match(leer('web/app/layout.js'), /<EnlacesDeCanales \/>,/);
  assert.match(leer('web/components/ficha.js'), /\.\.\.canalesDelMedio\(\)\.map\(\(c\) => c\.url\)/);
});

test('las tres variables llegan al armado del sitio en todos los caminos que lo compilan', () => {
  for (const f of ['.github/workflows/actualizar.yml', '.github/workflows/cloudflare-deploy.yml']) {
    const t = leer(f);
    for (const v of ['WHATSAPP_CANAL_URL', 'TELEGRAM_CANAL_URL', 'BLUESKY_URL']) {
      assert.ok(t.includes(`${v}: \${{ vars.${v} }}`), `${f} no pasa ${v}`);
    }
    // Van en cada compilación (en actualizar.yml son dos: la primera y la de después de lo que entró mientras tanto).
    const compilaciones = (t.match(/SITIO: https:\/\/radarbalcarce\.com/g) ?? []).length;
    assert.equal((t.match(/WHATSAPP_CANAL_URL: /g) ?? []).length, compilaciones, `${f}: las compilaciones no coinciden con las variables`);
  }
});
