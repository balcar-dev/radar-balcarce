import './globals.css';
import { obtenerDatos, datosSeccion, nombreCorto, EN_NAVEGACION } from '@/lib/datos';
import { SolChico } from '@/components/piezas';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  metadataBase: new URL('https://radarbalcarce.com.ar'),
  title: { default: 'Radar Balcarce', template: '%s · Radar Balcarce' },
  description: 'Lo que pasa en Balcarce, la región y el país. Actualizado todo el día, con la fuente siempre a la vista.',
};

export const viewport = { themeColor: '#14161A' };

export default function RaizLayout({ children }) {
  const d = obtenerDatos();
  const farmacia = d.farmacias?.hoy;
  const clima = d.clima?.ahora;
  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });
  const fechaCorta = new Date().toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires',
  });

  // Sólo se ofrecen las secciones que hoy tienen al menos una nota: una
  // pestaña que lleva a una página vacía es peor que no tenerla.
  const conNotas = new Set((d.notas ?? []).map((n) => n.seccion));
  const navegacion = EN_NAVEGACION.filter((s) => conNotas.has(s)).map(datosSeccion);

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {/* La chapa de servicio: clima y farmacia de turno, en todas las
            páginas. Son las dos cosas que la gente viene a buscar sin
            querer leer nada. */}
        <div className="chapa-superior">
          <div className="envoltura">
            {/* En el celular sólo entra la fecha corta: lo demás se salía de
                la pantalla y había que deslizar, cosa que nadie hace en una
                barra de servicio. La farmacia queda igual en la tarjeta de
                abajo, que en el celular es lo primero que se ve. */}
            <span className="solo-grande" style={{ textTransform: 'capitalize' }}>{fecha}</span>
            <span className="solo-chico" style={{ textTransform: 'capitalize' }}>{fechaCorta}</span>
            <span className="apagado solo-grande">/</span>
            <span className="apagado solo-grande">Balcarce, Buenos Aires</span>
            <span className="crece" />

            {/* El clima no es un enlace: no hay página de clima, está acá y
                en la tarjeta de la portada. Un enlace que no lleva a ningún
                lado mejor que no exista. */}
            {clima && (
              <span className="pastilla con-icono">
                <SolChico esDeDia={clima.esDeDia !== false} />
                <span className="fuerte">{clima.temp}°</span>
                <span className="apagado solo-grande">{clima.cielo}</span>
              </span>
            )}

            {farmacia && (
              <a href="/farmacias" className="pastilla solo-grande">
                <span className="punto-vivo" />
                <span className="apagado">De turno</span>
                <span className="fuerte">{farmacia.farmacias.join(' y ')}</span>
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
            <a href="/util" className="servicio">Teléfonos</a>
          </div>
        </nav>

        <main>{children}</main>

        {/* Las analíticas de Vercel: cuenta visitas y qué nota se leyó, sin
            cookies, sin seguir a nadie entre sitios y sin guardar direcciones
            IP. Se eligió ésta y no Google Analytics justamente por eso: un
            medio chico que promete cuidar a sus lectores no puede estar
            entregándoselos a una red publicitaria. */}
        <Analytics />

        <footer className="principal">
          <div className="envoltura">
            <div className="marca">Radar Balcarce</div>
            <div>
              radarbalcarce.com.ar · <a href="mailto:radarbalcarce@gmail.com">radarbalcarce@gmail.com</a>
            </div>
            <div>
              <a href="/agenda">Agenda</a> · <a href="/farmacias">Farmacias</a> ·{' '}
              <a href="/util">Teléfonos útiles</a> ·{' '}
              <a href="/politica-de-privacidad">Política de privacidad</a> · <a href="/feed.xml">RSS</a>
            </div>
            <div className="aclaracion">
              Algunos resúmenes y las voces de nuestros videos se producen con inteligencia
              artificial, siempre con revisión humana y con la fuente original enlazada.
              La responsabilidad editorial es de Radar Balcarce. Si publicamos algo sobre
              vos que considerás erróneo, escribinos y lo corregimos.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
