import {
  obtenerDatos, obtenerNota, todasLasNotas, cuando, datosSeccion, nombreCorto, temasVivos,
} from '@/lib/datos';
import {
  Etiqueta, FilaNota, Cierre, Invitacion, Firma, TemasDeLaNota,
} from '@/components/piezas';
import Compartir from '@/components/compartir';
import FuentesDeLaNota from '@/components/verificacion';
import { OG_COMUN } from '@/components/metadatos';
import { FichaDeNota, Migas } from '@/components/ficha';
import { notFound } from 'next/navigation';
import { parteDeNota } from '@/lib/ruta';
import { MOSTRAR_TEMAS } from '@/lib/sitio';
import { recortarEn, sinTitularRepetido } from '@/lib/texto';
import { parrafosConEnlaces } from '@/lib/enlaces-en-texto';

export function generateStaticParams() {
  // El parámetro es "titular-en-guiones-id". Ver lib/ruta.js. Van todas las
  // que tienen página, no sólo las de la portada: una nota que sale de la
  // portada no puede dejar un enlace roto en Facebook (lib/archivo.js).
  return todasLasNotas().map((n) => ({ id: parteDeNota(n) }));
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
  // El título que ve Google se acorta; el titular entero queda en la página.
  const descripcion = recortarEn(n.copete || `${n.seccion} en Balcarce: ${n.titulo}`, 155);

  return {
    title: recortarEn(n.titulo, 52),
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: {
      ...OG_COMUN,
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
  // Sin repetir titulares: dos medios que cuentan lo mismo con las mismas
  // palabras aparecían dos veces seguidas, o repetían la nota que se está
  // leyendo con otro identificador.
  const relacionadas = sinTitularRepetido(
    obtenerDatos().notas.filter((o) => o.seccion === n.seccion && o.id !== n.id),
    [n],
  ).slice(0, 4);

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

        {/* El cuerpo: la nota elaborada. Desde el 25/09 una nota automática
            sin cuerpo no se publica (web/lib/cuerpo.js); sólo puede faltar en
            lo que publicó una persona a mano o en páginas viejas del archivo. */}
        {/* Las notas propias (lib/notas-propias.js) llevan enlaces adentro del
            texto: la del repaso, a cada nota que se contó; la del dólar, a
            /dolar. El cuerpo sigue siendo texto plano. */}
        {n.cuerpo && parrafosConEnlaces(n.cuerpo, n.enlacesEnTexto).map((pedazos, i) => (
          <p key={`${i}-${pedazos[0].texto.slice(0, 40)}`} style={{ fontSize: 16, lineHeight: 1.7, marginTop: 16, color: 'var(--texto)' }}>
            {pedazos.map((x, j) => (x.href
              ? <a key={j} href={x.href} style={{ color: 'var(--rojo)', fontWeight: 600 }} {...(x.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{x.texto}</a>
              : x.texto))}
          </p>
        ))}

        {/* El enlace destacado de una nota propia: "Ver la cotización
            actualizada" (/dolar) o el video del repaso en Instagram y
            Facebook. */}
        {n.destacados?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
            {n.destacados.map((d) => (
              <a key={d.href} href={d.href} className="boton rojo" {...(d.externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{d.texto}</a>
            ))}
          </div>
        )}

        {/* Lo que ve el lector es la nota: título, bajada y cuerpo. Al pie,
            las fuentes en un desplegable chico y cerrado (nombre del medio y
            enlace), que es también la atribución. Las claves, qué se sabe,
            qué falta confirmar, lo que aportó cada fuente y el nivel de
            verificación son de uso interno: se usan para escribir la nota y
            se ven en el panel, no acá (criterio del 25/09, EDITORIAL.md). */}
        <FuentesDeLaNota nota={n} />

        {MOSTRAR_TEMAS && <TemasDeLaNota temas={n.temas} catalogo={temas} />}
        <Compartir titulo={n.titulo} />
        <Firma nota={n} />

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
