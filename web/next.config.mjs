import fs from 'node:fs';
import path from 'node:path';
import { rutaDeNota } from './lib/ruta.js';

/** @type {import('next').NextConfig} */
/**
 * Las direcciones de antes, /nota/1tftag2, llevan a las de ahora.
 *
 * Hoy casi no hay ninguna compartida, y por eso es el momento barato de
 * cambiar el formato. Igual se cubren: una redirección permanente le dice a
 * Google que la dirección nueva es la misma página, y no pierde lo que la
 * vieja hubiera juntado. Se arman leyendo el archivo de datos, así que
 * cubren exactamente las notas que existen.
 */
function redireccionesDeNotas() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'data', 'portada.json'), 'utf8'));
    return (d.notas ?? []).map((n) => ({
      source: `/nota/${n.id}`,
      destination: rutaDeNota(n),
      permanent: true,
    }));
  } catch {
    return [];
  }
}

const nextConfig = {
  async redirects() {
    return redireccionesDeNotas();
  },
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
