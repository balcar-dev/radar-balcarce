import {
  obtenerDatos, porRanura, nombreCorto, ordenarPortada, SECCIONES, proximosEventos,
} from '@/lib/datos';
import {
  PlacaSeccion, Etiqueta, FilaNota, Cierre, Invitacion, Evento, Hace,
} from '@/components/piezas';
import { notFound } from 'next/navigation';
import {
  POR_PAGINA, partirRanura, cuantasPaginas, direccionDePagina,
} from '@/lib/paginas';
import { Migas } from '@/components/ficha';
import { recortarEn } from '@/lib/texto';
import { OG_COMUN } from '@/components/metadatos';

// Se generan sólo las secciones que hoy tienen notas —no tiene sentido
// publicar una página vacía de Política si en el día no hubo nada— y una
// entrada por cada página de esa sección.

export function generateStaticParams() {
  const notas = obtenerDatos().notas;
  const params = [];
  for (const s of SECCIONES) {
    const cuantas = notas.filter((n) => n.seccion === s.nombre).length;
    if (!cuantas) continue;
    const paginas = cuantasPaginas(cuantas);
    for (let i = 1; i <= paginas; i += 1) {
      params.push({ ranura: i === 1 ? s.ranura : `${s.ranura}-${i}` });
    }
  }
  return params;
}

export function generateMetadata({ params }) {
  const { base, pagina } = partirRanura(params.ranura, porRanura);
  const s = porRanura(base);
  if (!s) return {};

  const titulo = pagina > 1 ? `${s.nombre} · página ${pagina}` : s.nombre;
  const delDia = obtenerDatos().notas.filter((n) => n.seccion === s.nombre);
  const ultimas = delDia.slice(0, 2).map((n) => n.titulo).join(' · ');
  const descripcion = recortarEn(
    `${nombreCorto(s.nombre)} en Balcarce${pagina > 1 ? ` (página ${pagina})` : ''}: ${ultimas || 'las últimas noticias'}.`,
    155,
  );
  const camino = direccionDePagina(s.ranura, pagina);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: camino },
    // La tarjeta la pone sola opengraph-image.js, que está al lado.
    openGraph: { ...OG_COMUN, type: 'website', title: titulo, description: descripcion, url: camino },
  };
}

// Una sola columna. El clima y la farmacia están en la barra de arriba y en
// la portada; repetirlos acá los convertía en ruido. Y la tarjeta de "otras
// secciones" sobraba desde que la navegación las muestra todas.
export default function PaginaSeccion({ params }) {
  const { base, pagina } = partirRanura(params.ranura, porRanura);
  const s = porRanura(base);
  if (!s) notFound();

  const todas = obtenerDatos().notas.filter((n) => n.seccion === s.nombre);
  if (todas.length === 0) notFound();

  const paginas = cuantasPaginas(todas.length);
  if (pagina > paginas) notFound();

  const notas = todas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  // La grande sólo en la primera página, y elegida por puntaje igual que
  // en la portada: en la tercera, destacar una nota vieja sería mentir
  // sobre su importancia.
  const { principal, resto } = pagina === 1
    ? ordenarPortada(notas)
    : { principal: null, resto: notas };
  const direccion = (p) => direccionDePagina(s.ranura, p);
  // En Cultura y agenda, los próximos eventos van en un bloque aparte, cada
  // uno enlazado a su página. No se mezclan con las notas: un evento no es
  // una noticia (no va al feed ni al sitemap de noticias), y la nota del
  // medio que lo anuncia ya está en la lista. Así no sale dos veces.
  const eventos = s.ranura === 'cultura' && pagina === 1 ? proximosEventos().slice(0, 4) : [];

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <Migas pasos={[{ nombre: s.nombre, camino: `/seccion/${s.ranura}` }]} />
      <div className="titulo-seccion" style={{ marginBottom: 22 }}>
        <span className="barra" style={{ background: s.color }} />
        <h1 style={{ fontSize: 28 }}>{s.nombre}</h1>
        <span className="meta">
          {todas.length} {todas.length === 1 ? 'nota' : 'notas'}
          {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ''}
        </span>
      </div>

      {principal && (
      <article className="destacada">
        <a href={principal.ruta}><PlacaSeccion seccion={principal.seccion} /></a>
        <div className="chapa-nota" style={{ marginTop: 16 }}>
          <Etiqueta seccion={principal.seccion} />
          <Hace nota={principal} />
        </div>
        <h2><a href={principal.ruta}>{principal.titulo}</a></h2>
        {principal.copete && <p>{principal.copete}</p>}
      </article>
      )}

      {eventos.length > 0 && (
        <section className="tarjeta" style={{ marginTop: 22, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ flexGrow: 1, fontSize: 18 }}>Se viene en la agenda</h2>
            <a href="/agenda" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--rojo)' }}>Toda la agenda →</a>
          </div>
          {eventos.map((e) => <Evento evento={e} key={e.id} />)}
        </section>
      )}

      {resto.length > 0 && (
        <div style={{ marginTop: 28 }}>
          {resto.map((n) => <FilaNota nota={n} key={n.id} />)}
        </div>
      )}

      {paginas > 1 && (
        <nav className="paginacion">
          {pagina > 1
            ? <a href={direccion(pagina - 1)} className="boton borde">← Más nuevas</a>
            : <span />}
          <span className="meta">Página {pagina} de {paginas}</span>
          {pagina < paginas
            ? <a href={direccion(pagina + 1)} className="boton borde">Más viejas →</a>
            : <span />}
        </nav>
      )}

      <Cierre
        enlaces={[
          { href: '/agenda', texto: 'Agenda' },
          { href: '/farmacias', texto: 'Farmacias' },
        ]}
      >
        <Invitacion
          titulo="¿Viste algo en el barrio?"
          texto="Mandanos la foto o el dato por WhatsApp. Lo chequeamos antes de publicarlo y, si lo pedís, no ponemos tu nombre."
          boton="Escribirnos"
          asunto="Tengo un dato para Radar Balcarce"
          mensaje="Hola, tengo un dato para contarles:"
        />
      </Cierre>
    </div>
  );
}
