import {
  obtenerDatos, armarTapa, temasVivos, proximosEventos, fotoDelDolar,
} from '@/lib/datos';
import {
  TarjetaFarmacia, TarjetaBuzon,
  Etiqueta, TituloSeccion, FilaNota, Evento, Hace,
} from '@/components/piezas';
import { TarjetaClima } from '@/components/clima-vivo';
import TarjetaDolar from '@/components/tarjeta-dolar';
import { Aviso } from '@/components/avisos';
import { MOSTRAR_TEMAS } from '@/lib/sitio';
import { metadatosDePagina } from '@/components/metadatos';

// El título de la portada dice qué es y de dónde: es lo que se ve en Google.
// Es la única página con canónico "/": el layout ya no lo pone para todas.
// Al compartirla, la tarjeta dice sólo el nombre del medio.
export const metadata = {
  ...metadatosDePagina({
    titulo: 'Radar Balcarce',
    descripcion: 'Las noticias de Balcarce y la región al día, el clima, la farmacia de turno y la agenda de la semana. Se actualiza todo el día, con la fuente siempre a la vista.',
    camino: '/',
  }),
  title: { absolute: 'Radar Balcarce · Noticias de Balcarce, clima y farmacia de turno' },
};

export default function Portada() {
  const d = obtenerDatos();
  // La grande, cuatro de secciones distintas y tres por sección, siempre lo
  // más nuevo primero (lib/datos.js, armarTapa). Los bloques salen en el
  // orden editorial de SECCIONES: la portada se ve igual todos los días.
  const { principal, secundarias, bloques } = armarTapa(d.notas);

  const temas = MOSTRAR_TEMAS ? temasVivos().slice(0, 8) : [];

  // Los próximos tres, cada uno con su página (lib/eventos.js).
  const eventos = proximosEventos().slice(0, 3);

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

      {/* Dos columnas en escritorio: las noticias a la izquierda y UNA sola
          pila a la derecha (clima, farmacia, dólar, agenda, buzón, números
          útiles), sin huecos. En el celular la pila derecha se desarma
          (`display: contents`): los servicios van primero, después las
          noticias y el resto al final. Ver .dos-columnas en globals.css. */}
      <div className="dos-columnas">
        <div className="derecha">
        {/* En el celular esto va primero: es lo que la gente viene a
            buscar. Antes había que pasar ochenta titulares para ver la
            farmacia de turno. */}
        <aside className="servicios">
          <TarjetaClima clima={d.clima} />
          <TarjetaFarmacia farmacia={d.farmacias?.hoy} />
          <TarjetaDolar foto={fotoDelDolar()} />
          <Aviso slot="clima" />
        </aside>

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

        <div className="principal">
          {principal && (
            <article className="destacada">
              <div className="chapa-nota">
                <Etiqueta seccion={principal.seccion} />
                <Hace nota={principal} />
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
                    <div className="chapa-nota">
                      <Etiqueta seccion={n.seccion} />
                      <Hace nota={n} />
                    </div>
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
              {notas.map((n) => <FilaNota nota={n} key={n.id} />)}
            </section>
          ))}

          {d.notas.length === 0 && d.generado && (
            <div className="tarjeta">No hay notas publicadas todavía. Se publican desde el panel.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function recortar(texto, largo) {
  if (texto.length <= largo) return texto;
  const corte = texto.slice(0, largo);
  return `${corte.slice(0, corte.lastIndexOf(' '))}…`;
}
