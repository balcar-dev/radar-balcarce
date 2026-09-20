import { obtenerDatos } from '@/lib/datos';
import { TarjetaFarmacia, Cierre, Invitacion } from '@/components/piezas';

export const metadata = {
  title: 'Farmacias de turno',
  description: 'Qué farmacia está de turno hoy en Balcarce y cómo sigue la semana.',
};

// La farmacia de turno vivía dentro de "Balcarce Útil", mezclada con los
// teléfonos, la agenda y el clima. Es lo más buscado del sitio: merece su
// propia página, que abra directo en lo que la persona vino a ver.
export default function Farmacias() {
  const d = obtenerDatos();
  const f = d.farmacias;

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Farmacias de turno</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 22 }}>
        El turno arranca a la mañana y termina a las 9 de la mañana del día
        siguiente. Dato del Colegio de Farmacéuticos de Balcarce.
      </p>

      {f?.hoy
        ? <TarjetaFarmacia farmacia={f.hoy} conBotones={false} />
        : <div className="tarjeta"><strong>Todavía no tenemos el turno de hoy.</strong></div>}

      {f?.hoy?.detalle?.[0]?.direccion && (
        <div style={{ marginTop: 14 }}>
          <a
            className="boton tinta"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.hoy.detalle[0].direccion}, Balcarce, Buenos Aires`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cómo llegar
          </a>
        </div>
      )}

      {f?.proximos?.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
            <span className="barra" style={{ background: 'var(--s-farmacias, var(--rojo))' }} />
            <h2 style={{ fontSize: 19 }}>Cómo sigue la semana</h2>
          </div>
          {f.proximos.map((t) => (
            <div className="fila-nota" key={t.dia}>
              <span className="meta cuando" style={{ width: 130 }}>{t.diaSemana} {t.dia}</span>
              <div style={{ flexGrow: 1 }}>
                <span className="meta cuando-movil">{t.diaSemana} {t.dia}</span>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{t.farmacias.join(' y ')}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <Cierre
        enlaces={[
          { href: '/util', texto: 'Teléfonos' },
          { href: '/agenda', texto: 'Agenda' },
        ]}
        fuente={[
          'El turno lo publica el Colegio de Farmacéuticos de Balcarce.',
          ...(f?.avisos ?? []),
        ].join(' ')}
      >
        <Invitacion
          titulo="¿El turno no coincide?"
          texto="Si la farmacia que figura no es la que está abierta, avisanos. Lo verificamos y lo corregimos enseguida."
          boton="Avisarnos"
          asunto="El turno de farmacia no coincide"
        />
      </Cierre>

    </div>
  );
}
