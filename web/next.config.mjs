import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Archivos estáticos puros: HTML, CSS, JS, y nada de servidor corriendo.
  // Es lo que permite que el sitio se pueda alojar en cualquier lado (hoy
  // Cloudflare Pages) sin depender de que ese
  // proveedor en particular sepa correr Next.js — sólo necesita servir
  // archivos. Las redirecciones de las notas viejas, que antes vivían acá
  // como `redirects()` (necesita un servidor), ahora se generan aparte:
  // ver scripts/generar-redirects.mjs.
  output: 'export',
  // Las imágenes son las placas, generadas por código, y las fotos del banco
  // propio (public/fotos-notas/), servidas como archivos del sitio. No hace
  // falta configurar dominios remotos para <Image> — y con `output: 'export'`
  // es obligatorio, porque no hay servidor que las optimice al vuelo.
  images: { unoptimized: true },
  // El proyecto raíz (panel/, reels/, ingesta/) tiene su propio
  // package-lock.json al lado de éste. Sin esto, Next intenta adivinar la
  // raíz del "workspace" y a veces elige mal.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
