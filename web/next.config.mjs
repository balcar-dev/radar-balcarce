import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nada de imágenes ajenas: las únicas imágenes del sitio son las placas
  // propias, generadas por código. No hace falta configurar dominios
  // remotos para <Image>.
  images: { unoptimized: true },
  // El proyecto raíz (panel/, reels/, ingesta/) tiene su propio
  // package-lock.json al lado de éste. Sin esto, Next intenta adivinar la
  // raíz del "workspace" y a veces elige mal.
  outputFileTracingRoot: path.join(import.meta.dirname),
};

export default nextConfig;
