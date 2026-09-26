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
import { enlaceDeLlamada } from '@/lib/farmacias';
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
  const semana = (f?.proximos ?? []).filter((t) => !f?.hoy || t.fecha !== f.hoy.fecha);

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Farmacias de turno</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 22 }}>
        Dato del Colegio de Farmacéuticos de Balcarce.
      </p>

      {f?.hoy
        ? <TarjetaFarmacia farmacia={f.hoy} verLaSemana={false} />
        : <div className="tarjeta"><strong>Todavía no tenemos el turno de hoy.</strong></div>}

      {/* La semana, ordenada: un día por renglón con su tacito verde, sus
          farmacias con la dirección y el teléfono que llama. El día de hoy ya
          está arriba, en la tarjeta grande: no se repite. */}
      {semana.length > 0 && (
        <section className="semana-farmacias">
          <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
            <span className="barra" style={{ background: 'var(--farmacia)' }} />
            <h2 style={{ fontSize: 19 }}>Cómo sigue la semana</h2>
          </div>
          {semana.map((t) => {
            // El cronograma llega todo en mayúsculas y sin acentos. Los
            // nombres se toman del detalle, que es el directorio del Colegio,
            // y el día se escribe como se escribe.
            const nombreDia = DIA_ESCRITO[String(t.diaSemana).toLowerCase()] ?? comoNombre(t.diaSemana);
            const turnos = t.detalle?.length ? t.detalle : (t.farmacias ?? []).map((n) => ({ nombre: n }));
            return (
              <div className="dia-turno" key={t.fecha ?? t.dia}>
                <div className="taco-turno" aria-label={`${nombreDia} ${t.dia}`}>
                  <div className="mes">{nombreDia.slice(0, 3)}</div>
                  <div className="dia">{t.dia}</div>
                </div>
                <div className="turnos-del-dia">
                  {turnos.map((x) => {
                    const llamar = enlaceDeLlamada(x.telefono);
                    return (
                      <div className="turno-farmacia" key={x.nombre}>
                        <span className="dato">{comoNombre(x.nombre)}</span>
                        {x.direccion && (
                          <div className="donde-farmacia">
                            {x.direccion}
                            {x.telefono && (llamar ? <>{' · '}<a href={llamar}>Tel. {x.telefono}</a></> : ` · Tel. ${x.telefono}`)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Cierre
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
