import { obtenerDatos } from '@/lib/datos';
import { TarjetaClima, TarjetaBuzon } from '@/components/piezas';

export const metadata = { title: 'Balcarce Útil · Radar Balcarce' };

export default function BalcarceUtil() {
  const d = obtenerDatos();
  const c = d.clima;
  const f = d.farmacias;

  return (
    <div className="envoltura">
      <h1 className="fraunces" style={{ fontSize: 40, marginBottom: 6 }}>Balcarce Útil</h1>
      <p className="mini" style={{ marginBottom: 24 }}>
        Farmacia de turno, clima, agenda y teléfonos útiles. Todo en una sola página.
      </p>

      <div className="dos-columnas">
        <div>
          <section className="tarjeta" style={{ padding: 24 }}>
            <h3>Farmacia de turno · hoy</h3>
            {f?.hoy ? (
              <>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, color: 'var(--rojo)' }}>
                  {f.hoy.farmacias.join(' y ')}
                </div>
                {(f.hoy.detalle ?? []).map((det) => (
                  det.direccion && (
                    <div key={det.nombre} className="mini" style={{ marginTop: 6 }}>
                      {det.nombre !== f.hoy.farmacias.join(' y ') ? `${det.nombre}: ` : ''}{det.direccion}
                      {det.telefono ? ` · Tel. ${det.telefono}` : ''}
                    </div>
                  )
                ))}
                <div className="mini" style={{ marginTop: 10 }}>Abierta hasta las 9 de la mañana de mañana.</div>
              </>
            ) : <p className="mini">Sin datos todavía.</p>}

            {f?.avisos?.length > 0 && (
              <div style={{ marginTop: 14, background: 'var(--crema)', borderRadius: 4, padding: 10, fontSize: 12.5 }}>
                {f.avisos.map((a, i) => <div key={i}>{a}</div>)}
              </div>
            )}

            {f?.proximos?.length > 0 && (
              <table style={{ width: '100%', marginTop: 18, borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {f.proximos.map((t) => (
                    <tr key={t.dia} style={{ borderTop: '1px solid var(--linea)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, width: 90 }}>{t.diaSemana} {t.dia}</td>
                      <td style={{ padding: '8px 0' }}>{t.farmacias.join(' y ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="tarjeta" style={{ padding: 24, marginTop: 20 }}>
            <h3>Agenda</h3>
            {(d.agenda?.municipio ?? []).length ? (
              d.agenda.municipio.map((e) => (
                <div key={e.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--papel)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nombre}</div>
                  <div className="mini">{(e.desde ?? '').replace('T', ' · ')} · {e.lugar || ''}{e.costo ? ` · ${e.costo}` : ' · gratis'}</div>
                </div>
              ))
            ) : <p className="mini">Sin eventos cargados ahora mismo.</p>}
          </section>

          <section className="tarjeta" style={{ padding: 24, marginTop: 20 }}>
            <h3>Teléfonos útiles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {(d.utiles?.numeros ?? []).map((n) => (
                <div key={n.nombre} style={{ background: 'var(--papel)', borderRadius: 4, padding: '10px 12px' }}>
                  <div className="mini">{n.categoria}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.nombre}</div>
                  <div style={{ fontSize: 13 }}>{n.numero}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lateral">
          <TarjetaClima clima={c} />
          {c?.dias?.length > 0 && (
            <div className="tarjeta">
              <h3>Los próximos días</h3>
              <table style={{ width: '100%', marginTop: 12, fontSize: 13.5, borderCollapse: 'collapse' }}>
                <tbody>
                  {c.dias.map((x) => (
                    <tr key={x.fecha} style={{ borderBottom: '1px solid var(--linea-suave)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, textTransform: 'capitalize' }}>{x.dia}</td>
                      <td style={{ padding: '8px 0' }}>{x.cielo}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{x.max}° / {x.min}°</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: x.lluvia >= 40 ? 'var(--s-tecnologia)' : 'var(--suave)' }}>{x.lluvia}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mini" style={{ marginTop: 12 }}>Pronóstico de {c.fuente ?? 'Open-Meteo'}.</div>
            </div>
          )}
          <TarjetaBuzon />
        </aside>
      </div>
    </div>
  );
}
