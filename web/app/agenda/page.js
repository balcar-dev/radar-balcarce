import {
  obtenerDatos, partirFecha, proximosEventos, anualesConFecha,
} from '@/lib/datos';
import { Evento, Cierre, Invitacion } from '@/components/piezas';
import { metadatosDePagina } from '@/components/metadatos';
import { fechaLarga } from '@/lib/eventos';

export const metadata = metadatosDePagina({
  titulo: 'Agenda',
  descripcion: 'Qué hay para hacer en Balcarce: actos, muestras, ferias, fiestas y encuentros deportivos.',
  camino: '/agenda',
});

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function PaginaAgenda() {
  const d = obtenerDatos();
  // Lo que todavía no terminó, del municipio y de lo que publicó la
  // redacción, cada uno con su página (lib/eventos.js). Lo que ya pasó sigue
  // teniendo página, pero no va en esta lista.
  const eventos = proximosEventos();
  // Las fiestas del año con fecha confirmada enlazan a su evento; las otras
  // dicen el mes y "fecha a confirmar", nunca un día inventado.
  const anuales = anualesConFecha(d.agenda?.proximosAnuales ?? []);

  // Agrupados por día: una agenda plana con quince líneas seguidas no se
  // lee, y el día es justamente lo que la gente busca. Un evento de varios
  // días va en el día en que empieza; si ya empezó y sigue, va en "Hoy".
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  const porDia = [];
  for (const e of eventos) {
    const f = partirFecha(e.desde);
    const clave = f ? (f.iso < hoy ? hoy : f.iso) : 'sin fecha';
    let grupo = porDia.find((g) => g.clave === clave);
    if (!grupo) {
      grupo = { clave, titulo: tituloDeDia(f && partirFecha(clave)), eventos: [] };
      porDia.push(grupo);
    }
    grupo.eventos.push(e);
  }

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
          <h1 className="fraunces" style={{ fontSize: 34 }}>Agenda de Balcarce</h1>
          <p className="mini" style={{ marginTop: 8, marginBottom: 26, maxWidth: 600 }}>
            Actos, muestras, ferias, fiestas y encuentros deportivos. Sale de la agenda
            oficial del municipio y de lo que nos acercan las instituciones. Tocá un evento
            para ver los detalles, agendarlo o pasarlo por WhatsApp.
            ¿Organizás algo? <a href="mailto:radarbalcarce@gmail.com?subject=Evento%20para%20la%20agenda" style={{ color: 'var(--rojo)', fontWeight: 600 }}>Mandanos los datos</a> y lo sumamos.
          </p>

          {porDia.length === 0 && (
            <div className="tarjeta">
              <strong>No hay eventos cargados en este momento.</strong>
              <p className="mini" style={{ marginTop: 8 }}>
                Cuando el municipio publique la próxima actividad, aparece acá sola.
              </p>
            </div>
          )}

          {porDia.map((g) => (
            <section key={g.clave} style={{ marginBottom: 26 }}>
              <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
                <span className="barra" style={{ background: 'var(--s-cultura)' }} />
                <h2 style={{ fontSize: 19, textTransform: 'capitalize' }}>{g.titulo}</h2>
              </div>
              <div style={{ marginTop: 6 }}>
                {g.eventos.map((e) => <Evento evento={e} key={e.id} />)}
              </div>
            </section>
          ))}

          {anuales.length > 0 && (
            <section style={{ marginTop: 34 }}>
              <div className="titulo-seccion">
                <span className="barra" style={{ background: 'var(--s-automovilismo)' }} />
                <h2>Las fiestas del año</h2>
              </div>
              <p className="mini" style={{ margin: '12px 0 4px' }}>
                Se repiten todos los años. La fecha exacta se confirma cuando la anuncia
                cada organizador: hasta entonces, sólo decimos el mes en que suele caer.
              </p>
              {anuales.map((a) => {
                const mes = MESES_LARGOS[(a.mesAproximado ?? 1) - 1];
                const cuando = a.confirmado ? fechaLarga(a.confirmado.desde) : `${mes} · fecha a confirmar`;
                return (
                  <div className="fila-nota" key={a.nombre}>
                    <span className="meta cuando" style={{ width: 120 }}>{cuando}</span>
                    <div style={{ flexGrow: 1 }}>
                      <span className="meta cuando-movil">{cuando}</span>
                      <h3 style={{ fontFamily: 'inherit', fontSize: 15.5 }}>
                        {a.confirmado ? <a href={a.confirmado.ruta}>{a.nombre}</a> : a.nombre}
                      </h3>
                      {a.nota && <div className="mini" style={{ marginTop: 3 }}>{a.nota}</div>}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

      <Cierre
        enlaces={[
          { href: '/farmacias', texto: 'Farmacias' },
          { href: '/util', texto: 'Teléfonos' },
        ]}
        fuente="Los eventos salen de la agenda oficial del Municipio de Balcarce y de lo que nos acercan las instituciones."
      >
        <Invitacion
          titulo="¿Organizás un evento?"
          texto="Mandanos qué es, dónde, a qué hora y si tiene entrada. Lo publicamos gratis: la agenda del pueblo la llenamos entre todos."
          boton="Sumar un evento"
          asunto="Evento para la agenda"
          mensaje="Hola, quiero sumar un evento a la agenda. Es:"
        />
      </Cierre>
    </div>
  );
}

function tituloDeDia(f) {
  if (!f) return 'Sin fecha';
  const [a, m, d] = f.iso.split('-').map(Number);
  // Hoy y mañana en Balcarce, no en el reloj de la máquina que compila.
  const enBalcarce = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(ms));
  if (f.iso === enBalcarce(Date.now())) return 'Hoy';
  if (f.iso === enBalcarce(Date.now() + 86400000)) return 'Mañana';
  const fecha = new Date(Date.UTC(a, m - 1, d, 12));
  return `${DIAS[fecha.getUTCDay()]} ${d} de ${MESES_LARGOS[m - 1]}`;
}
