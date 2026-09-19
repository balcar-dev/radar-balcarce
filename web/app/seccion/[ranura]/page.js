import { obtenerDatos, cuando, porRanura, datosSeccion, nombreCorto, SECCIONES } from '@/lib/datos';
import { PlacaSeccion, Etiqueta, FilaNota, TarjetaFarmacia, TarjetaBuzon } from '@/components/piezas';
import { TarjetaClima } from '@/components/clima-vivo';
import { notFound } from 'next/navigation';

// Se generan sólo las secciones que hoy tienen notas: no tiene sentido
// publicar una página vacía de Política si en el día no hubo nada.
export function generateStaticParams() {
  const conNotas = new Set(obtenerDatos().notas.map((n) => n.seccion));
  return SECCIONES.filter((s) => conNotas.has(s.nombre)).map((s) => ({ ranura: s.ranura }));
}

export function generateMetadata({ params }) {
  const s = porRanura(params.ranura);
  if (!s) return {};
  return {
    title: s.nombre,
    description: `Todo lo que publicamos en ${nombreCorto(s.nombre)}, en Radar Balcarce.`,
  };
}

export default function PaginaSeccion({ params }) {
  const s = porRanura(params.ranura);
  if (!s) notFound();

  const d = obtenerDatos();
  const notas = d.notas.filter((n) => n.seccion === s.nombre);
  if (notas.length === 0) notFound();

  const [principal, ...resto] = notas;

  return (
    <div className="envoltura">
      <div className="dos-columnas">
        <aside className="servicios">
          <TarjetaClima clima={d.clima} />
          <TarjetaFarmacia farmacia={d.farmacias?.hoy} />
        </aside>

        <div className="principal">
          <div className="titulo-seccion" style={{ marginBottom: 22 }}>
            <span className="barra" style={{ background: s.color }} />
            <h2 style={{ fontSize: 28 }}>{s.nombre}</h2>
            <span className="meta">{notas.length} {notas.length === 1 ? 'nota' : 'notas'}</span>
          </div>

          <article className="destacada">
            <a href={`/nota/${principal.id}`}><PlacaSeccion seccion={principal.seccion} /></a>
            <div className="chapa-nota" style={{ marginTop: 16 }}>
              <Etiqueta seccion={principal.seccion} />
              <span className="meta">{cuando(principal)}</span>
              <span className="punto">·</span>
              <span className="meta">{principal.medios.join(' · ')}</span>
            </div>
            <h2><a href={`/nota/${principal.id}`}>{principal.titulo}</a></h2>
            {principal.copete && <p>{principal.copete}</p>}
          </article>

          {resto.length > 0 && (
            <div style={{ marginTop: 28 }}>
              {resto.map((n) => <FilaNota nota={n} key={n.id} />)}
            </div>
          )}

          <div style={{ marginTop: 28 }}>
            <a href="/" className="boton borde">← Volver a la portada</a>
          </div>
        </div>

        <aside className="lateral">
          <div className="tarjeta">
            <h3>Otras secciones</h3>
            <div className="chips" style={{ marginTop: 12 }}>
              {SECCIONES
                .filter((o) => o.ranura !== s.ranura && d.notas.some((n) => n.seccion === o.nombre))
                .map((o) => (
                  <a key={o.ranura} href={`/seccion/${o.ranura}`}>{nombreCorto(o.nombre)}</a>
                ))}
            </div>
          </div>

          <TarjetaBuzon />
        </aside>
      </div>
    </div>
  );
}
