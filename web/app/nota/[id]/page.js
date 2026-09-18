import { obtenerDatos, obtenerNota, haceCuanto } from '@/lib/datos';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return obtenerDatos().notas.map((n) => ({ id: n.id }));
}

export function generateMetadata({ params }) {
  const n = obtenerNota(params.id);
  if (!n) return {};
  return { title: `${n.titulo} · Radar Balcarce`, description: n.copete };
}

export default function PaginaNota({ params }) {
  const n = obtenerNota(params.id);
  if (!n) notFound();

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <article>
        <div className="nota-chapa">
          <span className="seccion">{n.seccion}</span>
          <span className="sep">|</span>
          <span>{haceCuanto(n.fecha)}</span>
        </div>
        <h1 style={{ fontSize: 36, lineHeight: 1.15, marginTop: 10 }}>{n.titulo}</h1>
        <p style={{ fontSize: 18, color: '#3B403C', marginTop: 14, lineHeight: 1.6 }}>{n.copete}</p>

        {n.imagen && (
          <img src={n.imagen} alt="" style={{ width: '100%', borderRadius: 6, marginTop: 20, border: '1px solid var(--linea)' }} />
        )}

        <div className="tarjeta" style={{ marginTop: 24 }}>
          <div className="mini">
            <strong>Fuente:</strong> {n.medios.join(' · ')}
            <br />
            <a href={n.enlace} target="_blank" rel="noopener noreferrer">Leer la nota original en su fuente ↗</a>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <a href="/" className="boton borde">← Volver a la portada</a>
        </div>
      </article>
    </div>
  );
}
