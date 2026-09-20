import { obtenerDatos, partirFecha } from '@/lib/datos';
import { TarjetaFarmacia, Evento } from '@/components/piezas';
import { TarjetaClima } from '@/components/clima-vivo';

export const metadata = {
  title: 'Agenda',
  description: 'Qué hay para hacer en Balcarce: actos, muestras, ferias, fiestas y encuentros deportivos.',
};

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export default function PaginaAgenda() {
  const d = obtenerDatos();
  const eventos = d.agenda?.municipio ?? [];
  const anuales = d.agenda?.proximosAnuales ?? [];

  // Agrupados por día: una agenda plana con quince líneas seguidas no se
  // lee, y el día es justamente lo que la gente busca.
  const porDia = [];
  for (const e of eventos) {
    const f = partirFecha(e.desde);
    const clave = f?.iso ?? 'sin fecha';
    let grupo = porDia.find((g) => g.clave === clave);
    if (!grupo) {
      grupo = { clave, titulo: tituloDeDia(f), eventos: [] };
      porDia.push(grupo);
    }
    grupo.eventos.push(e);
  }

  return (
    <div className="envoltura">
      <div className="dos-columnas">
        <div className="principal sin-servicios">
          <h1 className="fraunces" style={{ fontSize: 34 }}>Agenda de Balcarce</h1>
          <p className="mini" style={{ marginTop: 8, marginBottom: 26, maxWidth: 600 }}>
            Actos, muestras, ferias, fiestas y encuentros deportivos. Sale de la agenda
            oficial del municipio y de lo que nos acercan las instituciones.
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
                cada organizador.
              </p>
              {anuales.map((a) => (
                <div className="fila-nota" key={a.nombre}>
                  <span className="meta cuando" style={{ width: 120 }}>
                    {MESES_LARGOS[(a.mesAproximado ?? 1) - 1]}
                  </span>
                  <div style={{ flexGrow: 1 }}>
                    <span className="meta cuando-movil">{MESES_LARGOS[(a.mesAproximado ?? 1) - 1]}</span>
                    <h3 style={{ fontFamily: 'inherit', fontSize: 15.5 }}>{a.nombre}</h3>
                    {a.nota && <div className="mini" style={{ marginTop: 3 }}>{a.nota}</div>}
                  </div>
                </div>
              ))}
            </section>
          )}

          <div style={{ marginTop: 28 }}>
            <a href="/" className="boton borde">← Volver a la portada</a>
          </div>
        </div>

        <aside className="lateral">
          <div className="tarjeta-buzon">
            <h3 style={{ fontSize: 19, fontWeight: 700 }}>¿Organizás un evento?</h3>
            <p>
              Mandanos qué es, dónde, a qué hora y si tiene entrada. Lo publicamos
              gratis: la agenda del pueblo la llenamos entre todos.
            </p>
            <a href="mailto:radarbalcarce@gmail.com?subject=Evento%20para%20la%20agenda" className="boton rojo ancho">
              Sumar un evento
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function tituloDeDia(f) {
  if (!f) return 'Sin fecha';
  const [a, m, d] = f.iso.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const hoy = new Date();
  const mismoDia = (x, y) => x.toDateString() === y.toDateString();
  const manana = new Date(hoy.getTime() + 86400000);
  if (mismoDia(fecha, hoy)) return 'Hoy';
  if (mismoDia(fecha, manana)) return 'Mañana';
  return `${DIAS[fecha.getDay()]} ${d} de ${MESES_LARGOS[m - 1]}`;
}
