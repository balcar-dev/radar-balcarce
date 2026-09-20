import { obtenerDatos, obtenerNota, cuando, datosSeccion, nombreCorto } from '@/lib/datos';
import { PlacaSeccion, Etiqueta, FilaNota, Cierre, Invitacion } from '@/components/piezas';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return obtenerDatos().notas.map((n) => ({ id: n.id }));
}

export function generateMetadata({ params }) {
  const n = obtenerNota(params.id);
  if (!n) return {};
  return { title: n.titulo, description: n.copete };
}

export default function PaginaNota({ params }) {
  const n = obtenerNota(params.id);
  if (!n) notFound();

  const s = datosSeccion(n.seccion);
  const relacionadas = obtenerDatos().notas
    .filter((o) => o.seccion === n.seccion && o.id !== n.id)
    .slice(0, 4);

  return (
    <div className="envoltura">
      <article className="cuerpo-nota">
        <div className="chapa-nota">
          <Etiqueta seccion={n.seccion} />
          <span className="meta">{cuando(n)}</span>
        </div>

        <h1>{n.titulo}</h1>
        {n.copete && <p className="copete">{n.copete}</p>}

        {/* Sin foto de la fuente, a propósito: la excepción de noticias de la
            ley 11.723 cubre el texto, no las fotografías. */}
        <div style={{ marginTop: 22 }}><PlacaSeccion seccion={n.seccion} /></div>

        {n.guion && (
          <p style={{ fontSize: 16, lineHeight: 1.7, marginTop: 22, color: 'var(--texto)' }}>{n.guion}</p>
        )}

        <div className="atribucion">
          <strong>De dónde sale esta nota.</strong> La informaron{' '}
          {n.medios.join(' y ')}. Nosotros la resumimos; el trabajo original es de ellos
          y está completo acá:
          <br />
          <a href={n.enlace} target="_blank" rel="noopener noreferrer">Leer la nota original ↗</a>
        </div>

        {relacionadas.length > 0 && (
          <section className="bloque-seccion">
            <div className="titulo-seccion">
              <span className="barra" style={{ background: s.color }} />
              <h2>Seguí leyendo</h2>
              <a href={`/seccion/${s.ranura}`} className="ver-todo">Ver todo →</a>
            </div>
            {relacionadas.map((o) => <FilaNota nota={o} key={o.id} />)}
          </section>
        )}
        <Cierre
          enlaces={[
            { href: `/seccion/${s.ranura}`, texto: `Más de ${nombreCorto(n.seccion)}` },
            { href: '/agenda', texto: 'Agenda' },
          ]}
        >
          <Invitacion
            titulo="¿Tenés más información sobre esto?"
            texto="Si sabés algo que falta en esta nota, o si algo está mal, escribinos. Corregimos rápido y a la vista."
            boton="Escribirnos"
            asunto={`Sobre la nota: ${n.titulo}`}
          />
        </Cierre>
      </article>
    </div>
  );
}
