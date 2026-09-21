import {
  obtenerDatos, cuando, porRanura, nombreCorto, ordenarPortada, SECCIONES,
} from '@/lib/datos';
import {
  PlacaSeccion, Etiqueta, FilaNota, Cierre, Invitacion,
} from '@/components/piezas';
import { notFound } from 'next/navigation';
import {
  POR_PAGINA, partirRanura, cuantasPaginas, direccionDePagina,
} from '@/lib/paginas';

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
  return {
    title: pagina > 1 ? `${s.nombre} · página ${pagina}` : s.nombre,
    description: `Todo lo que publicamos en ${nombreCorto(s.nombre)}, en Radar Balcarce.`,
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

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <div className="titulo-seccion" style={{ marginBottom: 22 }}>
        <span className="barra" style={{ background: s.color }} />
        <h2 style={{ fontSize: 28 }}>{s.nombre}</h2>
        <span className="meta">
          {todas.length} {todas.length === 1 ? 'nota' : 'notas'}
          {paginas > 1 ? ` · página ${pagina} de ${paginas}` : ''}
        </span>
      </div>

      {principal && (
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
