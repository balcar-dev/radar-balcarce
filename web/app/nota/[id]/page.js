import { obtenerDatos, obtenerNota, cuando, datosSeccion, nombreCorto, temasVivos } from '@/lib/datos';
import {
  Etiqueta, FilaNota, Cierre, Invitacion, Firma, TemasDeLaNota,
} from '@/components/piezas';
import Compartir from '@/components/compartir';
import { FichaDeNota, Migas } from '@/components/ficha';
import { notFound } from 'next/navigation';
import { parteDeNota } from '@/lib/ruta';
import { MOSTRAR_TEMAS } from '@/lib/sitio';

export function generateStaticParams() {
  // El parámetro es "titular-en-guiones-id". Ver lib/ruta.js.
  return obtenerDatos().notas.map((n) => ({ id: parteDeNota(n) }));
}

/**
 * Lo que ve un buscador y lo que ve WhatsApp.
 *
 * `canonical` importa más de lo que parece: la misma nota puede llegar con
 * parámetros pegados (?fbclid=…, ?utm_source=…) y sin esto Google la cuenta
 * como páginas distintas y reparte el mérito entre todas.
 *
 * La imagen no se declara acá: la toma sola de opengraph-image.js, que está
 * al lado.
 */
export function generateMetadata({ params }) {
  const n = obtenerNota(params.id);
  if (!n) return {};

  const camino = n.ruta;
  const descripcion = n.copete || `${n.seccion} · Lo informaron ${n.medios.join(' y ')}.`;

  return {
    title: n.titulo,
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: {
      type: 'article',
      title: n.titulo,
      description: descripcion,
      url: camino,
      publishedTime: n.fecha,
      modifiedTime: n.fecha,
      section: n.seccion,
    },
    twitter: { card: 'summary_large_image', title: n.titulo, description: descripcion },
  };
}

export default function PaginaNota({ params }) {
  const n = obtenerNota(params.id);
  if (!n) notFound();

  const s = datosSeccion(n.seccion);
  const temas = temasVivos();
  const relacionadas = obtenerDatos().notas
    .filter((o) => o.seccion === n.seccion && o.id !== n.id)
    .slice(0, 4);

  return (
    <div className="envoltura">
      <FichaDeNota nota={n} />
      <Migas pasos={[
        { nombre: s.nombre, camino: `/seccion/${s.ranura}` },
        { nombre: n.titulo, camino: n.ruta },
      ]} />
      <article className="cuerpo-nota">
        <div className="chapa-nota">
          <Etiqueta seccion={n.seccion} />
          <span className="meta">{cuando(n)}</span>
        </div>

        <h1>{n.titulo}</h1>
        {n.copete && <p className="copete">{n.copete}</p>}

        {/* Sin foto de la fuente, a propósito: la excepción de noticias de la
            ley 11.723 cubre el texto, no las fotografías. Tampoco va la
            placa de sección grande acá: repetía lo que ya dice la etiqueta
            de arriba, en un rectángulo enorme sin ningún dato nuevo. Si el
            día de mañana hay una foto o ilustración propia de la nota
            (con IA, por ejemplo), va este espacio. */}

        {/* El cuerpo sólo existe si la IA reescribió la nota (o alguien la
            cargó a mano): el resumen mecánico de la fuente no tiene de dónde
            sacar más texto propio, así que ahí no se muestra nada acá y la
            nota queda con el copete nada más. */}
        {n.cuerpo && n.cuerpo.split('\n').map((p) => p.trim()).filter(Boolean).map((parrafo) => (
          <p key={parrafo.slice(0, 40)} style={{ fontSize: 16, lineHeight: 1.7, marginTop: 16, color: 'var(--texto)' }}>{parrafo}</p>
        ))}

        {MOSTRAR_TEMAS && <TemasDeLaNota temas={n.temas} catalogo={temas} />}
        <Compartir titulo={n.titulo} />
        <Firma nota={n} />

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
            mensaje={`Hola, escribo por la nota "${n.titulo}":`}
          />
        </Cierre>
      </article>
    </div>
  );
}
