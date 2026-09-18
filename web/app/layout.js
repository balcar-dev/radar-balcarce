import './globals.css';
import { obtenerDatos, datosSeccion, nombreCorto, EN_NAVEGACION } from '@/lib/datos';
import { SolChico } from '@/components/piezas';

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
            <span style={{ textTransform: 'capitalize' }}>{fecha}</span>
            <span className="apagado">/</span>
            <span className="apagado">Balcarce, Buenos Aires</span>
            <span className="crece" />

            {clima && (
              <a href="/util" className="pastilla con-icono">
                <SolChico />
                <span className="fuerte">{clima.temp}°</span>
                <span className="apagado">{clima.cielo}</span>
              </a>
            )}

            {farmacia && (
              <a href="/util" className="pastilla">
                <span className="punto-vivo" />
                <span className="apagado">De turno</span>
                <span className="fuerte">{farmacia.farmacias.join(' y ')}</span>
              </a>
            )}
          </div>
        </div>

        <header className="principal">
          <div className="envoltura">
            <div style={{ flexGrow: 1 }}>
              <a href="/" className="logo fraunces">Radar <span>Balcarce</span></a>
              <div className="sub">Lo que pasa en Balcarce, la región y el país — con la fuente siempre a la vista.</div>
            </div>
            <a
              href="mailto:radarbalcarce@gmail.com?subject=Tengo%20un%20dato%20para%20Radar%20Balcarce"
              className="boton rojo"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Mandanos tu dato
            </a>
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
            <a href="/util" className="servicio">Balcarce Útil</a>
          </div>
        </nav>

        <main>{children}</main>

        <footer className="principal">
          <div className="envoltura">
            <div className="marca">Radar Balcarce</div>
            <div>
              radarbalcarce.com.ar · <a href="mailto:radarbalcarce@gmail.com">radarbalcarce@gmail.com</a>
            </div>
            <div>
              <a href="/agenda">Agenda</a> · <a href="/util">Balcarce Útil</a> ·{' '}
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
