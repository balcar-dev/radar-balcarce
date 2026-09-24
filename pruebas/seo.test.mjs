// Lo que hace que Google nos entienda y WhatsApp nos muestre.
//
// Nada de esto se ve mirando la página: si mañana alguien se lleva puesto el
// enlace canónico o la dirección del sitio, el sitio se sigue viendo
// perfecto y nos enteramos meses después. Por eso está acá.
//
// La revisión del HTML compilado es otra cosa y vive en
// web/scripts/revisar-seo.mjs, que corre en GitHub Actions después de armar
// el sitio. Esto de acá prueba las decisiones; eso prueba el resultado.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const cargar = async (env = {}) => {
  const antes = { ...process.env };
  // Se limpia lo que pone Vercel, para que la prueba no dependa de dónde corre.
  delete process.env.SITIO;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  delete process.env.VERCEL_URL;
  Object.assign(process.env, env);
  // La marca de tiempo obliga a releer el módulo con el entorno nuevo.
  const m = await import(`../web/lib/sitio.js?${Date.now()}${Math.random()}`);
  const r = {
    sitio: m.sitio(),
    enlace: m.enlace('/nota/abc'),
    propio: m.enElDominioPropio(),
  };
  process.env = antes;
  return r;
};

// ------------------------------------------------ la dirección del sitio

test('en la máquina apunta a localhost', async () => {
  const r = await cargar();
  assert.equal(r.sitio, 'http://localhost:3000');
  assert.equal(r.propio, false);
});

test('en Vercel apunta al dominio de producción', async () => {
  // Apenas radarbalcarce.com quede conectado, esta variable pasa a valer
  // eso sola y no hay que tocar una línea de código.
  const r = await cargar({ VERCEL_PROJECT_PRODUCTION_URL: 'radarbalcarce.com' });
  assert.equal(r.sitio, 'https://radarbalcarce.com');
  assert.equal(r.propio, true);
});

test('el dominio de producción le gana a la dirección del despliegue', async () => {
  const r = await cargar({
    VERCEL_PROJECT_PRODUCTION_URL: 'radarbalcarce.com',
    VERCEL_URL: 'radar-balcarce-7m1tk.vercel.app',
  });
  assert.equal(r.sitio, 'https://radarbalcarce.com');
});

test('una vista previa usa su propia dirección y no se hace pasar por el sitio', async () => {
  const r = await cargar({ VERCEL_URL: 'radar-balcarce-7m1tk.vercel.app' });
  assert.equal(r.sitio, 'https://radar-balcarce-7m1tk.vercel.app');
  assert.equal(r.propio, false);
});

test('SITIO manda sobre todo lo demás', async () => {
  const r = await cargar({
    SITIO: 'https://otra.com',
    VERCEL_PROJECT_PRODUCTION_URL: 'radarbalcarce.com',
  });
  assert.equal(r.sitio, 'https://otra.com');
});

test('la barra del final no se duplica', async () => {
  // Un enlace con doble barra existe como dirección distinta para Google.
  const r = await cargar({ SITIO: 'https://radarbalcarce.com/' });
  assert.equal(r.sitio, 'https://radarbalcarce.com');
  assert.equal(r.enlace, 'https://radarbalcarce.com/nota/abc');
});

test('siempre queda con https', async () => {
  const r = await cargar({ SITIO: 'radarbalcarce.com' });
  assert.equal(r.sitio, 'https://radarbalcarce.com');
});

test('el .com.ar no es nuestro', async () => {
  // El dominio registrado es radarbalcarce.com. El código decía .com.ar, que
  // nunca compramos: cada enlace canónico habría apuntado a una dirección
  // que no abre.
  const r = await cargar({ SITIO: 'https://radarbalcarce.com.ar' });
  assert.equal(r.propio, false, 'el .com.ar no debería contar como el dominio propio');
});
