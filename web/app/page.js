import { obtenerDatos, haceCuanto } from '@/lib/datos';

export default function Portada() {
  const d = obtenerDatos();
  const [principal, ...resto] = d.notas;
  const secundarias = resto.slice(0, 4);
  const restoAgrupado = resto.slice(4);

  const porSeccion = {};
  for (const n of restoAgrupado) (porSeccion[n.seccion] ??= []).push(n);

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
        <div>
          {principal && (
            <article className="destacada">
              <div className="imagen-vacia">
                {principal.imagen ? (
                  // Imagen que trajo la fuente original, no una foto nuestra.
                  <img src={principal.imagen} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                ) : '[SIN IMAGEN]'}
              </div>
              <div className="nota-chapa">
                <span className="seccion">{principal.seccion}</span>
                <span className="sep">|</span>
                <span>{haceCuanto(principal.fecha)}</span>
              </div>
              <h2>
                <a href={`/nota/${principal.id}`} style={{ color: 'inherit' }}>{principal.titulo}</a>
              </h2>
              <p>{principal.copete}</p>
              <div className="mini" style={{ marginTop: 12 }}>
                Fuente: {principal.medios.join(' · ')} —{' '}
                <a href={principal.enlace} target="_blank" rel="noopener noreferrer">nota original ↗</a>
              </div>
            </article>
          )}

          {secundarias.length > 0 && (
            <div className="rejilla-secciones">
              {secundarias.map((n) => (
                <article key={n.id}>
                  <div className="nota-chapa">
                    <span className="seccion">{n.seccion}</span>
                    <span className="sep">|</span>
                    <span>{haceCuanto(n.fecha)}</span>
                  </div>
                  <h3><a href={`/nota/${n.id}`} style={{ color: 'inherit' }}>{n.titulo}</a></h3>
                  <p>{n.copete?.slice(0, 140)}</p>
                </article>
              ))}
            </div>
          )}

          {Object.entries(porSeccion).map(([seccion, notas]) => (
            <section key={seccion} style={{ marginTop: 30 }}>
              <h3 style={{ fontSize: 22, borderBottom: '2px solid var(--tinta)', paddingBottom: 8 }}>{seccion}</h3>
              <div className="lista-notas">
                {notas.map((n) => (
                  <div className="fila-nota" key={n.id}>
                    <div>
                      <span className="num">{haceCuanto(n.fecha)} · {n.medios.join(' + ')}</span>
                      <h3><a href={`/nota/${n.id}`} style={{ color: 'inherit' }}>{n.titulo}</a></h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {d.notas.length === 0 && d.generado && (
            <div className="tarjeta">No hay notas publicadas todavía. Se publican desde el panel.</div>
          )}
        </div>

        <aside>
          {d.clima?.ahora && (
            <div className="tarjeta oscura">
              <h3>El clima ahora</h3>
              <div className="temp-grande">{d.clima.ahora.temp}°</div>
              <div className="mini" style={{ marginTop: 6 }}>
                {d.clima.ahora.cielo} · sensación {d.clima.ahora.sensacion}°<br />
                Viento {d.clima.ahora.rumbo} {d.clima.ahora.viento} km/h
              </div>
            </div>
          )}

          {d.farmacias?.hoy && (
            <div className="tarjeta">
              <h3>Farmacia de turno</h3>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, color: 'var(--rojo)' }}>
                {d.farmacias.hoy.farmacias.join(' y ')}
              </div>
              {d.farmacias.hoy.detalle?.[0]?.direccion && (
                <div className="mini" style={{ marginTop: 6 }}>{d.farmacias.hoy.detalle[0].direccion}</div>
              )}
              <a href="/util" className="boton borde" style={{ marginTop: 12 }}>Ver toda la semana</a>
            </div>
          )}

          {d.agenda?.municipio?.length > 0 && (
            <div className="tarjeta" id="agenda">
              <h3>Agenda</h3>
              {d.agenda.municipio.slice(0, 4).map((e) => (
                <div key={e.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--papel)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{e.nombre}</div>
                  <div className="mini">{e.desde?.slice(0, 10)} · {e.lugar || ''}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
