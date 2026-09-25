import './globals.css';
import {
  obtenerDatos, datosSeccion, nombreCorto, EN_NAVEGACION, whatsapp, WHATSAPP, MAIL, REDES_SOCIALES,
} from '@/lib/datos';
import { PastillaClima } from '@/components/clima-vivo';
import { comoNombre } from '@/lib/texto';
import Buscador from '@/components/buscador';
import { Aviso } from '@/components/avisos';
import { sitio, enElDominioPropio, NOMBRE } from '@/lib/sitio';
import { FichaDelSitio } from '@/components/ficha';
import HorasVivas from '@/components/horas-vivas';

const DESCRIPCION = 'Lo que pasa en Balcarce, la región y el país. Actualizado todo el día, con la fuente siempre a la vista.';

// Lo que ve todo el que comparte un enlace del sitio.
//
// Hasta ahora una nota compartida por WhatsApp llegaba como una dirección
// pelada: sin título, sin bajada y sin imagen. El botón de compartir que
// pusimos estaba tirando contra un muro.
//
// metadataBase no se escribe a mano: sale de lib/sitio.js, que mira dónde
// está corriendo el sitio de verdad. Mientras radarbalcarce.com no esté
// conectado, los enlaces apuntan a donde el sitio sí abre.
export const metadata = {
  metadataBase: new URL(sitio()),
  title: { default: NOMBRE, template: `%s · ${NOMBRE}` },
  description: DESCRIPCION,
  applicationName: NOMBRE,
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }, { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }], apple: '/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  // Sin `canonical` acá: lo que se pone en el layout lo hereda toda página
  // que no declare el suyo, y el 25/09 /farmacias, /agenda, /util y la
  // política de privacidad le decían a Google "soy la portada". Cada página
  // declara su propio canónico (ver components/metadatos.js).
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  openGraph: {
    siteName: NOMBRE,
    title: NOMBRE,
    description: DESCRIPCION,
    locale: 'es_AR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: NOMBRE, description: DESCRIPCION },
  // Mientras no estemos en el dominio propio, que no lo indexen: la misma
  // nota en dos direcciones es la forma más fácil de que Google elija la
  // equivocada.
  robots: enElDominioPropio()
    ? { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 }
    : { index: false, follow: false },
};

export const viewport = { themeColor: '#14161A' };

export default function RaizLayout({ children }) {
  const d = obtenerDatos();
  const farmacia = d.farmacias?.hoy;
  const clima = d.clima?.ahora;

  // Cuándo se armó esta página. La hora absoluta y no "hace veinte
  // minutos": el sitio es HTML estático, así que un "hace" calculado
  // al construirlo se queda congelado y a las tres horas miente.
  const actualizado = d.generado
    ? new Date(d.generado).toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires',
    })
    : null;
  const hoyEscrito = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  // Sólo la primera letra. Con text-transform: capitalize salía "Domingo,
  // 20 De Septiembre": en castellano ni el mes ni la preposición llevan
  // mayúscula, eso es del inglés.
  const fecha = hoyEscrito.charAt(0).toUpperCase() + hoyEscrito.slice(1);

  // Sólo se ofrecen las secciones que hoy tienen al menos una nota: una
  // pestaña que lleva a una página vacía es peor que no tenerla.
  const conNotas = new Set((d.notas ?? []).map((n) => n.seccion));
  const navegacion = EN_NAVEGACION.filter((s) => conNotas.has(s)).map(datosSeccion);

  return (
    <html lang="es-AR">
      <head>
        {/* El feed se anuncia acá y no con un enlace en el pie: al que lo
            tocaba le aparecía una pantalla de código, porque un feed es
            para que lo lea un programa, no una persona. Los lectores de
            noticias lo encuentran solos por esta línea. */}
        <FichaDelSitio />
        <link rel="alternate" type="application/rss+xml" title="Radar Balcarce" href="/feed.xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <HorasVivas />
        {/* La chapa de servicio: clima y farmacia de turno, en todas las
            páginas. Son las dos cosas que la gente viene a buscar sin
            querer leer nada. */}
        <div className="chapa-superior">
          <div className="envoltura">
            {/* La fecha entera, también en el celular. La farmacia de al
                lado se esconde en pantalla chica y queda en la tarjeta de
                abajo, que ahí es lo primero que se ve. */}
            <span>{fecha}</span>
            <span className="apagado solo-grande">/</span>
            <span className="apagado solo-grande">Balcarce, Buenos Aires</span>
            <span className="crece" />

            {/* El clima no es un enlace: no hay página de clima, está acá y
                en la tarjeta de la portada. Un enlace que no lleva a ningún
                lado mejor que no exista. */}
            {clima && <PastillaClima clima={clima} />}

            {farmacia && (
              <a href="/farmacias" className="pastilla solo-grande">
                <span className="punto-vivo" />
                <span className="apagado">De turno</span>
                {/* El nombre sale del detalle, que es el del directorio del Colegio y
                    trae los acentos; el del cronograma viene en mayúsculas y grita. */}
                <span className="fuerte">
                  {(farmacia.detalle?.length ? farmacia.detalle.map((f) => f.nombre) : farmacia.farmacias)
                    .map(comoNombre).join(' y ')}
                </span>
              </a>
            )}
          </div>
        </div>

        <header className="principal">
          <div className="envoltura">
            {/* Sólo el nombre. La bajada de tres renglones y el botón se
                comían media pantalla de celular antes de la primera noticia:
                el que entró ya sabe dónde está y viene a leer, no a que le
                expliquen qué es el sitio. La invitación a escribirnos está
                en el pie y en la tarjeta del buzón. */}
            <a href="/" className="logo fraunces">Radar <span>Balcarce</span></a>
            <span style={{ flexGrow: 1 }} />
            {/* El buscador busca sobre las notas que ya están en la página:
                sin servidor y sin una sola consulta de red. */}
            <Buscador notas={(d.notas ?? []).map((n) => ({
              id: n.id, ruta: n.ruta, titulo: n.titulo, copete: n.copete, seccion: n.seccion, medios: n.medios,
            }))} />
          </div>
        </header>

        {/* Navegación por secciones reales. Agenda y Balcarce Útil van a la
            derecha y en verde: son servicios, no secciones de noticias. */}
        <nav className="principal">
          <div className="envoltura">
            <a href="/">Portada</a>
            {navegacion.map((s) => (
              <a key={s.ranura} href={`/seccion/${s.ranura}`}>{nombreCorto(s.nombre)}</a>
            ))}
            <span className="crece" />
            <a href="/agenda" className="servicio">Agenda</a>
            <a href="/farmacias" className="servicio">Farmacias</a>
            <a href="/dolar" className="servicio">Dólar</a>
            <a href="/util" className="servicio">Teléfonos</a>
          </div>
        </nav>

        <main>{children}</main>

        {/* Las analíticas (Cloudflare Web Analytics, se prende desde el panel de Cloudflare, no desde el código): cuenta visitas y qué nota se leyó, sin
            cookies, sin seguir a nadie entre sitios y sin guardar direcciones
            IP. Se eligió ésta y no Google Analytics justamente por eso: un
            medio chico que promete cuidar a sus lectores no puede estar
            entregándoselos a una red publicitaria. */}

        <footer className="principal">
          <div className="envoltura">
            <div className="marca">Radar Balcarce</div>
            <div>
              <a href={whatsapp('Hola, escribo por Radar Balcarce:')} target="_blank" rel="noopener noreferrer">
                WhatsApp {WHATSAPP.visible}
              </a>
              {' · '}
              <a href={`mailto:${MAIL}`}>{MAIL}</a>
            </div>
            <div>
              <a href={REDES_SOCIALES.instagram} target="_blank" rel="noopener noreferrer me">Instagram</a>
              {' · '}
              <a href={REDES_SOCIALES.facebook} target="_blank" rel="noopener noreferrer me">Facebook</a>
            </div>
            <div>
              <a href="/agenda">Agenda</a> · <a href="/farmacias">Farmacias</a> ·{' '}
              <a href="/dolar">Dólar</a> ·{' '}
              <a href="/util">Teléfonos útiles</a> ·{' '}
              <a href="/politica-de-privacidad">Política de privacidad</a>
            </div>
            <div>
              <a href="/quienes-somos">Quiénes somos</a> · <a href="/contacto">Contacto y correcciones</a>
            </div>
            {actualizado && (
              <div className="aclaracion">
                Las noticias se actualizan solas cada media hora. Esta página se armó
                a las {actualizado}.
              </div>
            )}
            <div className="aclaracion">
              Los resúmenes los escribe una inteligencia artificial y se verifican
              automáticamente contra la fuente original, que queda enlazada; lo sensible lo
              revisa una persona antes de salir. Las voces de nuestros videos también son
              de IA. Cada nota dice al pie quién la escribió.
              La responsabilidad editorial es de Radar Balcarce. Si publicamos algo sobre
              vos que considerás erróneo, escribinos y lo corregimos.
            </div>
            <Aviso slot="pie" />
          </div>
        </footer>
      </body>
    </html>
  );
}
