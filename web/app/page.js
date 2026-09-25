import {
  obtenerDatos, cuando, ordenarPortada, temasVivos, SECCIONES,
} from '@/lib/datos';
import {
  TarjetaFarmacia, TarjetaBuzon,
  Etiqueta, TituloSeccion, FilaNota, Evento,
} from '@/components/piezas';
import { TarjetaClima } from '@/components/clima-vivo';
import { Aviso } from '@/components/avisos';
import { MOSTRAR_TEMAS } from '@/lib/sitio';

// El título de la portada dice qué es y de dónde: es lo que se ve en Google.
export const metadata = {
  title: { absolute: 'Radar Balcarce · Noticias de Balcarce, clima y farmacia de turno' },
  description: 'Las noticias de Balcarce y la región al día, el clima, la farmacia de turno y la agenda de la semana. Se actualiza todo el día, con la fuente siempre a la vista.',
};

export default function Portada() {
  const d = obtenerDatos();
  const { principal, resto } = ordenarPortada(d.notas);
  const secundarias = resto.slice(0, 4);
  const restoAgrupado = resto.slice(4);

  // Los bloques de abajo salen en el orden editorial de SECCIONES, no en el
  // orden en que aparecieron las notas: la portada tiene que verse igual
  // todos los días aunque el día haya sido flojo en una sección.
  const porSeccion = {};
  for (const n of restoAgrupado) (porSeccion[n.seccion] ??= []).push(n);
  const bloques = SECCIONES
    .map((s) => [s.nombre, porSeccion[s.nombre]])
    .filter(([, notas]) => notas?.length)
    .concat(Object.entries(porSeccion).filter(([nombre]) => !SECCIONES.some((s) => s.nombre === nombre)));

  const temas = MOSTRAR_TEMAS ? temasVivos().slice(0, 8) : [];

  const eventos = (d.agenda?.municipio ?? []).slice(0, 3);

  return (
    <div className="envoltura">
      <h1 className="solo-lectores">Radar Balcarce: noticias de Balcarce, clima y farmacia de turno</h1>
      {!d.generado && (
        <div className="tarjeta" style={{ marginBottom: 24 }}>
          <strong>Todavía no hay datos generados.</strong>
          <p className="mini" style={{ marginTop: 8 }}>
            Corré <code>npm run datos</code> en la carpeta <code>web/</code> (con el panel habiendo
            corrido al menos un ciclo) y volvé a cargar esta página.
          </p>
        </div>
      )}

      {/* El aviso de clima va arriba de todo y ocupa el ancho: es lo único
          del sitio que puede cambiarle el día a alguien. Sale sólo cuando
          hay algo real que avisar — los umbrales son altos a propósito, en
          ingesta/alertas.mjs. */}
      {(d.avisosClima ?? []).slice(0, 1).map((a) => (
        <aside className={`aviso-clima ${a.gravedad}`} key={a.titulo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div>
            <strong>{a.titulo}</strong>
            <span>{a.texto}</span>
          </div>
        </aside>
      ))}

      <div className="dos-columnas">
        {/* En el celular esto va primero: es lo que la gente viene a
            buscar. Antes había que pasar ochenta titulares para ver la
            farmacia de turno. */}
        <aside className="servicios">
          <TarjetaClima clima={d.clima} />
          <TarjetaFarmacia farmacia={d.farmacias?.hoy} />
          <Aviso slot="clima" />
        </aside>

        <div className="principal">
          {principal && (
            <article className="destacada">
              <div className="chapa-nota">
                <Etiqueta seccion={principal.seccion} />
                {cuando(principal) && <span className="meta">{cuando(principal)}</span>}
              </div>

              <h2><a href={principal.ruta}>{principal.titulo}</a></h2>
              {principal.copete && <p>{principal.copete}</p>}
            </article>
          )}
          <Aviso slot="apertura" />
          {/* Los temas que se siguen. Una sección agrupa por tipo de
              noticia; un tema, por historia. En un pueblo las historias
              duran meses, y el que entra por una nota del autódromo no
              tenía forma de ver las otras diez. */}
          {temas.length > 0 && (
            <nav className="tira-temas" aria-label="Temas que seguimos">
              {temas.map((t) => (
                <a key={t.ranura} href={`/tema/${t.ranura}`} className="chip-tema">
                  {t.nombre} <span>{t.cuantas}</span>
                </a>
              ))}
            </nav>
          )}


          {secundarias.length > 0 && (
            <>
              <div className="separador" />
              <div className="rejilla-secundarias">
                {secundarias.map((n) => (
                  <article key={n.id}>
                    <Etiqueta seccion={n.seccion} />
                    <h3><a href={n.ruta}>{n.titulo}</a></h3>
                    {n.copete && <p>{recortar(n.copete, 150)}</p>}
                  </article>
                ))}
              </div>
            </>
          )}

          {bloques.map(([seccion, notas]) => (
            <section className="bloque-seccion" key={seccion}>
              <TituloSeccion seccion={seccion} />
              {/* Tres por sección, no cinco: la portada se hacía larguísima
                  y en el celular había que pasar veinte titulares para
                  llegar a la sección siguiente. El que quiere más tiene
                  "Ver todo". */}
              {notas.slice(0, 3).map((n) => <FilaNota nota={n} key={n.id} />)}
            </section>
          ))}

          {d.notas.length === 0 && d.generado && (
            <div className="tarjeta">No hay notas publicadas todavía. Se publican desde el panel.</div>
          )}
        </div>

        <aside className="lateral">
          {eventos.length > 0 && (
            <div className="tarjeta" style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h3 style={{ flexGrow: 1 }}>Agenda de Balcarce</h3>
                <a href="/agenda" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--rojo)' }}>Todo →</a>
              </div>
              {eventos.map((e) => <Evento evento={e} key={e.id} />)}
            </div>
          )}

          <TarjetaBuzon />

          {d.utiles?.numeros?.length > 0 && (
            <div style={{ borderRadius: 12, border: '1px dashed #C9C4B6', padding: 16 }}>
              <div className="meta">Números útiles</div>
              <div className="chips">
                {/* Sólo los que son un número solo: varios de la lista oficial
                    traen tres o cuatro líneas separadas por barras y no sirven
                    para un enlace de llamada. Esos están completos en /util. */}
                {d.utiles.numeros.filter((n) => !n.numero.includes('/')).slice(0, 5).map((n) => (
                  <a key={n.nombre} href={`tel:${n.numero.replace(/\D/g, '')}`}>
                    {n.nombre.replace(/ \(.*\)$/, '')} {n.numero}
                  </a>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <a href="/util" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--rojo)' }}>Toda la guía →</a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function recortar(texto, largo) {
  if (texto.length <= largo) return texto;
  const corte = texto.slice(0, largo);
  return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
}
