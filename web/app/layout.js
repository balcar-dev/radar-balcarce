import './globals.css';
import { obtenerDatos } from '@/lib/datos';

export const metadata = {
  title: 'Radar Balcarce',
  description: 'Lo que pasa en Balcarce, la región y el país. Actualizado todo el día, con la fuente siempre a la vista.',
};

export default function RaizLayout({ children }) {
  const d = obtenerDatos();
  const farmacia = d.farmacias?.hoy;
  const clima = d.clima?.ahora;
  const fecha = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  });

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="chapa-superior">
          <div className="envoltura">
            <span style={{ textTransform: 'capitalize' }}>{fecha}</span>
            <span className="sep">/</span>
            <span>Balcarce, Buenos Aires</span>
            {clima ? (
              <>
                <span className="sep">/</span>
                <span>{clima.temp}° · {clima.cielo}</span>
              </>
            ) : null}
            {farmacia ? (
              <>
                <span className="sep">/</span>
                <span>Farmacia de turno: {farmacia.farmacias.join(' y ')}</span>
              </>
            ) : null}
            <span className="crece" />
            <a href="/util" className="cta">Balcarce Útil</a>
          </div>
        </div>

        <header className="principal">
          <div className="envoltura">
            <div>
              <div className="logo fraunces">Radar <span>Balcarce</span></div>
              <div className="sub">Lo que pasa en Balcarce, la región y el país — con la fuente siempre a la vista.</div>
            </div>
          </div>
        </header>

        <nav className="principal">
          <div className="envoltura">
            <a href="/" className="activo">Portada</a>
            <a href="/util">Balcarce Útil</a>
            <a href="/#agenda">Agenda</a>
            <a href="/feed.xml">RSS</a>
          </div>
        </nav>

        <main>{children}</main>

        <footer className="principal">
          <div className="envoltura">
            <div>
              <strong style={{ color: '#fff' }}>Radar Balcarce</strong> · radarbalcarce.com.ar
            </div>
            <div>
              <a href="/util">Balcarce Útil</a> · <a href="/politica-de-privacidad">Política de privacidad</a> · <a href="/feed.xml">RSS</a>
            </div>
            <div className="aclaracion">
              Algunos resúmenes y las voces de nuestros videos se producen con inteligencia
              artificial, siempre con revisión humana y con la fuente original enlazada.
              La responsabilidad editorial es de Radar Balcarce.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
