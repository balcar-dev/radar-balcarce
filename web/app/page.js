import { obtenerDatos, cuando, SECCIONES } from '@/lib/datos';
import {
  TarjetaFarmacia, TarjetaBuzon, PlacaSeccion,
  Etiqueta, TituloSeccion, FilaNota, Evento,
} from '@/components/piezas';
import { TarjetaClima } from '@/components/clima-vivo';

export default function Portada() {
  const d = obtenerDatos();
  const [principal, ...resto] = d.notas;
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

  const eventos = (d.agenda?.municipio ?? []).slice(0, 3);

  return (
    <div className="envoltura">
      {!d.generado && (
        <div className="tarjeta" style={{ marginBottom: 24 }}>
          <strong>Todavía no hay datos generados.</strong>
          <p className="mini" style={{ marginTop: 8 }}>
            Corré <code>npm run datos</code> en la carpeta <code>web/</code> (con el panel habiendo
            corrido al menos un ciclo) y volvé a cargar esta página.
          </p>
        </div>
      )}

      <div className="dos-columnas">
        {/* En el celular esto va primero: es lo que la gente viene a
            buscar. Antes había que pasar ochenta titulares para ver la
            farmacia de turno. */}
        <aside className="servicios">
          <TarjetaClima clima={d.clima} />
          <TarjetaFarmacia farmacia={d.farmacias?.hoy} />
        </aside>

        <div className="principal">
          {principal && (
            <article className="destacada">
              {/* Nunca la foto del medio de origen: es obra ajena. Va una
                  placa tipográfica propia con el color de la sección. */}
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

          {secundarias.length > 0 && (
            <>
              <div className="separador" />
              <div className="rejilla-secundarias">
                {secundarias.map((n) => (
                  <article key={n.id}>
                    <Etiqueta seccion={n.seccion} />
                    <h3><a href={`/nota/${n.id}`}>{n.titulo}</a></h3>
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
