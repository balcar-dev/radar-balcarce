import { obtenerDatos } from '@/lib/datos';

// El Colegio escribe los días en mayúsculas y a veces sin acento
// ("MIERCOLES"). Acá se escriben como se escriben.
const DIA_ESCRITO = {
  domingo: 'Domingo', lunes: 'Lunes', martes: 'Martes',
  miercoles: 'Miércoles', 'miércoles': 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', 'sábado': 'Sábado',
};
import { TarjetaFarmacia, Cierre, Invitacion } from '@/components/piezas';
import { comoNombre } from '@/lib/texto';
import { metadatosDePagina } from '@/components/metadatos';

export const metadata = metadatosDePagina({
  titulo: 'Farmacias de turno',
  descripcion: 'Qué farmacia está de turno hoy en Balcarce y cómo sigue la semana.',
  camino: '/farmacias',
});

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
        Dato del Colegio de Farmacéuticos de Balcarce.
      </p>

      {f?.hoy
        ? <TarjetaFarmacia farmacia={f.hoy} verLaSemana={false} />
        : <div className="tarjeta"><strong>Todavía no tenemos el turno de hoy.</strong></div>}

      {f?.proximos?.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
            <span className="barra" style={{ background: 'var(--s-farmacias, var(--rojo))' }} />
            <h2 style={{ fontSize: 19 }}>Cómo sigue la semana</h2>
          </div>
          {f.proximos.map((t) => {
            // El cronograma llega todo en mayúsculas y sin acentos. Los
            // nombres se toman del detalle, que es el directorio del Colegio,
            // y el día se escribe como se escribe.
            const nombreDia = DIA_ESCRITO[String(t.diaSemana).toLowerCase()] ?? comoNombre(t.diaSemana);
            const dia = `${nombreDia} ${t.dia}`;
            const nombres = (t.detalle?.length ? t.detalle.map((x) => x.nombre) : t.farmacias)
              .map(comoNombre).join(' y ');
            return (
              <div className="fila-nota" key={t.fecha ?? t.dia}>
                <span className="meta cuando" style={{ width: 130 }}>{dia}</span>
                <div style={{ flexGrow: 1 }}>
                  <span className="meta cuando-movil">{dia}</span>
                  <div className="dato">{nombres}</div>
                </div>
              </div>
            );
          })}
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
          mensaje="Hola, el turno de farmacia que figura no coincide. La que está abierta es:"
        />
      </Cierre>

    </div>
  );
}
