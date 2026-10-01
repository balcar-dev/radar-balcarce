import {
  obtenerDatos, obtenerArchivo, obtenerNota, todasLasNotas, datosSeccion, temasVivos, tieneTarjetaPropia,
} from '@/lib/datos';
import {
  Etiqueta, FilaNota, Cierre, Invitacion, TemasDeLaNota, Hace, FechaExacta, PlacaSeccion,
} from '@/components/piezas';
import Compartir from '@/components/compartir';
import FuentesDeLaNota from '@/components/verificacion';
import { OG_COMUN, TARJETA_DEL_SITIO } from '@/components/metadatos';
import { FichaDeNota, Migas } from '@/components/ficha';
import { notFound } from 'next/navigation';
import { parteDeNota } from '@/lib/ruta';
import { MOSTRAR_TEMAS } from '@/lib/sitio';
import { recortarEn } from '@/lib/texto';
import { fechaDeModificacion } from '@/lib/tiempo';
import { seguirLeyendo } from '@/lib/seguir-leyendo';
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
 * La imagen se declara acá: la tarjeta propia de la nota (opengraph-image/route.js)
 * si la tiene, y si no la del sitio (29/09: antes se declaraba una que no existía).
 */
export function generateMetadata({ params }) {
  const n = obtenerNota(params.id);
  if (!n) return {};

  const camino = n.ruta;
  const imagen = tieneTarjetaPropia(n)
    ? { url: `${camino}/opengraph-image`, width: 1200, height: 630, type: 'image/png', alt: n.titulo }
    : TARJETA_DEL_SITIO;
  // El título que ve Google se acorta; el titular entero queda en la página.
  const descripcion = recortarEn(n.copete || `${n.seccion} en Balcarce: ${n.titulo}`, 155);

  return {
    // Sin la marca al final (29/09): con " · Radar Balcarce" el título pasaba de 60 caracteres
    // y 130 de 239 notas salían cortadas a mitad de frase. El nombre del sitio lo pone Google
    // (WebSite y og:site_name).
    title: { absolute: recortarEn(n.titulo, 60) },
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: {
      ...OG_COMUN,
      type: 'article',
      title: n.titulo,
      description: descripcion,
      url: camino,
      publishedTime: n.fecha,
      modifiedTime: fechaDeModificacion(n),
      section: n.seccion,
      images: [imagen],
    },
    twitter: { card: 'summary_large_image', title: n.titulo, description: descripcion, images: [imagen.url] },
  };
}

export default function PaginaNota({ params }) {
  const n = obtenerNota(params.id);
  if (!n) notFound();

  const s = datosSeccion(n.seccion);
  const temas = temasVivos();
  // "Seguí leyendo": siempre cuatro notas distintas entre sí y de ésta, con su
  // hora, dos de la misma sección y dos de otras (lib/seguir-leyendo.js). Si
  // las notas de la portada (HORAS_EN_PORTADA) no alcanzan, se completa con el
  // archivo.
  const recientes = obtenerDatos().notas;
  const relacionadas = seguirLeyendo(n, recientes, obtenerArchivo());

  return (
    <div className="envoltura">
      <FichaDeNota nota={n} conTarjeta={tieneTarjetaPropia(n)} />
      <Migas pasos={[
        { nombre: s.nombre, camino: `/seccion/${s.ranura}` },
        { nombre: n.titulo, camino: n.ruta },
      ]} />
      <article className="cuerpo-nota">
        <div className="chapa-nota">
          <Etiqueta seccion={n.seccion} />
          <Hace nota={n} />
        </div>
        <p className="fecha-de-la-nota"><FechaExacta nota={n} /></p>

        <h1>{n.titulo}</h1>
        {n.copete && <p className="copete">{n.copete}</p>}

        {/* La foto (28/09, CRITERIO-EDITORIAL.md, "Las fotos"): recortada,
            sin ningún nombre de medio pegado encima (el crédito va sólo acá,
            en el epígrafe, nunca en la imagen) y guardada en el banco propio
            (web/data/banco-fotos.json, web/scripts/fotos-notas.mjs). Sin
            foto que sirva, desde el 29/09 va la placa de la sección, más baja
            y con su dibujo (Hernán: "si no tiene fotos hay que ponerle la
            placa de la sección"); las notas propias (el dólar, los repasos)
            no la llevan. */}
        {!n.foto && !n.propia && <PlacaSeccion seccion={n.seccion} chica />}
        {n.foto && (
          <figure style={{ margin: '20px 0 4px' }}>
            <img
              src={`/${n.foto.archivo}`}
              alt={n.titulo}
              width={1200}
              height={675}
              decoding="async"
              fetchPriority="high"
              style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', maxHeight: 480, objectFit: 'cover', borderRadius: 10, display: 'block' }}
            />
            <figcaption style={{ fontSize: 13, color: 'var(--suave)', fontStyle: 'italic', marginTop: 6 }}>{n.foto.credito}</figcaption>
          </figure>
        )}

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

        {/* Lo que ve el lector es la nota: título, bajada y cuerpo. Al pie, una
            línea chica con la firma (quién la escribió) y el desplegable
            cerrado de fuentes (nombre del medio y enlace), que es también la
            atribución. Las claves, qué se sabe,
            qué falta confirmar, lo que aportó cada fuente y el nivel de
            verificación son de uso interno: se usan para escribir la nota y
            se ven en el panel, no acá (CRITERIO-EDITORIAL.md, sección 7). */}
        <FuentesDeLaNota nota={n} />

        {MOSTRAR_TEMAS && <TemasDeLaNota temas={n.temas} catalogo={temas} />}
        <Compartir titulo={n.titulo} />

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
        <Cierre>
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
