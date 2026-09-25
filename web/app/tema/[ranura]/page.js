import {
  obtenerDatos, ordenarPortada, porTema, nombreDeTema,
} from '@/lib/datos';
import {
  PlacaSeccion, Etiqueta, FilaNota, Cierre, Invitacion, Hace,
} from '@/components/piezas';
import { notFound } from 'next/navigation';
import { Migas } from '@/components/ficha';
import { OG_COMUN } from '@/components/metadatos';

// Un tema es una historia que vuelve: el autódromo, el Concejo, Ferroviarios.
// La sección agrupa por tipo de noticia; el tema, por historia. En un pueblo
// las historias duran meses y la gente quiere saber cómo siguió aquello que
// leyó en marzo.
export function generateStaticParams() {
  return (obtenerDatos().temas ?? []).map((t) => ({ ranura: t.ranura }));
}

export function generateMetadata({ params }) {
  const nombre = nombreDeTema(params.ranura);
  if (!nombre) return {};

  const descripcion = `Todo lo que publicamos sobre ${nombre.toLowerCase()} en Balcarce, de lo último a lo primero.`;
  const camino = `/tema/${params.ranura}`;

  return {
    title: nombre,
    description: descripcion,
    alternates: { canonical: camino },
    openGraph: { ...OG_COMUN, type: 'website', title: nombre, description: descripcion, url: camino },
  };
}

export default function PaginaTema({ params }) {
  const nombre = nombreDeTema(params.ranura);
  const notas = porTema(params.ranura);
  if (!nombre || notas.length === 0) notFound();

  const { principal, resto } = ordenarPortada(notas);

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <Migas pasos={[{ nombre, camino: `/tema/${params.ranura}` }]} />
      <div className="chapa-tema">
        <span className="meta">Tema que seguimos</span>
        <h1>{nombre}</h1>
        <p className="mini">
          {notas.length} {notas.length === 1 ? 'nota publicada' : 'notas publicadas'}, de lo último a lo primero.
        </p>
      </div>

      {principal && (
        <article className="destacada" style={{ marginTop: 24 }}>
          <a href={principal.ruta}><PlacaSeccion seccion={principal.seccion} /></a>
          <div className="chapa-nota" style={{ marginTop: 16 }}>
            <Etiqueta seccion={principal.seccion} />
            <Hace nota={principal} />
          </div>
          <h2><a href={principal.ruta}>{principal.titulo}</a></h2>
          {principal.copete && <p>{principal.copete}</p>}
        </article>
      )}

      {resto.length > 0 && (
        <div style={{ marginTop: 28 }}>
          {resto.map((n) => <FilaNota nota={n} key={n.id} />)}
        </div>
      )}

      <Cierre
        enlaces={[
          { href: '/', texto: 'Portada' },
          { href: '/agenda', texto: 'Agenda' },
        ]}
      >
        <Invitacion
          titulo={`¿Sabés algo de ${nombre.toLowerCase()}?`}
          texto="Si tenés un dato, una foto o algo que nos falta contar de este tema, escribinos. Lo chequeamos antes de publicarlo."
          boton="Escribirnos"
          asunto={`Tengo un dato sobre ${nombre}`}
          mensaje={`Hola, tengo un dato sobre ${nombre}:`}
        />
      </Cierre>
    </div>
  );
}
