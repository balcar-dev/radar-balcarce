import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { cuerpo } from './tamano-titulo.js';

// La imagen que se ve al compartir una nota.
//
// Es lo que aparece en WhatsApp, Facebook, X y Telegram cuando alguien pega
// el enlace. Hasta ahora no había ninguna, así que una nota compartida
// llegaba como una dirección pelada — y en un pueblo, donde la conversación
// pasa por WhatsApp, eso es perder la mitad de la distribución.
//
// No usamos la foto del medio de origen: es obra ajena, y la excepción de
// noticias de la ley 11.723 cubre el texto, no las fotografías. Lo que va es
// el titular sobre el color de su sección, con la marca. Misma idea que las
// placas de los reels, mismas tipografías.
//
// Se generan al compilar el sitio, una por nota, y quedan como archivos
// estáticos: no hay nada corriendo cuando alguien comparte.

export const TAMANO = { width: 1200, height: 630 };
// Instagram: 1080x1350 (4:5), lo que recomienda hoy para un posteo. La grilla
// del perfil lo muestra recortado (cuadrado o 3:4 según la versión de la app),
// así que TODO lo importante queda en la zona segura del centro: 1012x1080
// (la medida está en redes/formatos.mjs).
// Facebook, en cambio, muestra un enlace con la imagen apaisada de arriba.
export const TAMANO_INSTAGRAM = { width: 1080, height: 1350 };
export const TIPO = 'image/png';

// Los mismos de globals.css. Están repetidos acá porque esto corre al
// compilar, sin CSS a mano.
const COLOR = {
  Balcarce: '#C7381C',
  Política: '#C7381C',
  Policiales: '#8C2D18',
  Deportes: '#1E6E4F',
  Automovilismo: '#E08A16',
  Agro: '#6B7A2A',
  'Cultura y agenda': '#6D4BA0',
  Servicios: '#16615B',
  Economía: '#9A6A12',
  Tecnología: '#2563A8',
  País: '#4A4F4B',
};
const POR_DEFECTO = '#14161A';

const FUENTES = path.join(process.cwd(), 'fuentes');
const leer = (archivo) => fs.readFileSync(path.join(FUENTES, archivo));

/**
 * La tarjeta de una nota, o del sitio si no se pasa ninguna.
 *
 * @param {{ titulo?: string, seccion?: string, copete?: string }} nota
 */
export function tarjeta(nota = {}, { instagram = false } = {}) {
  // Instagram recorta la imagen en la grilla del perfil: una tarjeta apaisada
  // (1200x630) perdía los costados del titular. La de Instagram es vertical
  // 4:5 (1080x1350) con el texto en la zona segura del centro; la apaisada
  // es para compartir enlaces por WhatsApp y Facebook.
  const e = instagram ? 1.25 : 1;
  const titulo = nota.titulo ?? 'Lo que pasa en Balcarce';
  const seccion = nota.seccion ?? null;
  const acento = COLOR[seccion] ?? POR_DEFECTO;

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#14161A',
          // La franja de color de la sección, arriba, como en las placas.
          // En Instagram la franja de color va adentro de la zona segura (una
          // en el borde se pierde con el recorte de la grilla).
          ...(instagram ? {} : { borderTop: `18px solid ${acento}` }),
          // 135px arriba y abajo: lo que se recorta en la grilla cuadrada.
          padding: instagram ? '200px 96px 190px' : '56px 64px 48px',
          fontFamily: 'Plex',
        },
        children: [
          instagram && {
            type: 'div',
            props: { style: { width: 132, height: 12, backgroundColor: acento, marginBottom: 26, display: 'flex' } },
          },
          seccion && {
            type: 'div',
            props: {
              style: {
                fontSize: Math.round(26 * e),
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: acento,
                display: 'flex',
              },
              children: seccion,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                marginTop: 18,
              },
              children: {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Fraunces',
                    fontSize: Math.round(cuerpo(titulo) * (instagram ? 1.2 : 1)),
                    fontWeight: 900,
                    lineHeight: 1.12,
                    letterSpacing: '-0.02em',
                    color: '#F7F5EF',
                    display: 'flex',
                  },
                  // Se corta antes de desbordar: una tarjeta con el titular
                  // cortado a la mitad es peor que uno resumido.
                  children: titulo.length > 165 ? `${titulo.slice(0, 162)}…` : titulo,
                },
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                paddingTop: 26,
                borderTop: '1px solid rgba(247, 245, 239, 0.18)',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Fraunces',
                      fontSize: Math.round(30 * e),
                      fontWeight: 900,
                      color: '#F7F5EF',
                      display: 'flex',
                    },
                    children: 'Radar',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Fraunces',
                      fontSize: Math.round(30 * e),
                      fontWeight: 900,
                      color: '#E0553A',
                      display: 'flex',
                    },
                    children: 'Balcarce',
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      flexGrow: 1,
                      textAlign: 'right',
                      fontSize: Math.round(22 * e),
                      color: '#9FA39D',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    },
                    children: 'radarbalcarce.com',
                  },
                },
              ],
            },
          },
        ].filter(Boolean),
      },
    },
    {
      ...(instagram ? TAMANO_INSTAGRAM : TAMANO),
      fonts: [
        { name: 'Fraunces', data: leer('Fraunces-900.ttf'), weight: 900, style: 'normal' },
        { name: 'Plex', data: leer('IBMPlexSans-600.ttf'), weight: 600, style: 'normal' },
      ],
    },
  );
}
