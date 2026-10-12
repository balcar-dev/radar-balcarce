import { metadatosDePagina } from '@/components/metadatos';
import { TablaDeConstructores, TablaDePilotos } from '@/components/tablas';
import { campeonatoDeF1 } from '@/lib/tablas';

export const metadata = metadatosDePagina({
  titulo: 'Campeonato de Fórmula 1: pilotos y constructores',
  descripcion: 'Cómo va el campeonato de pilotos y de constructores de la Fórmula 1, con puntos y victorias. Se actualiza sola después de cada carrera.',
  camino: '/tablas/formula-1',
});

// El campeonato de F1, siempre en la misma dirección (4/10/2026): una página fija que se actualiza sola después de cada carrera.
export default function CampeonatoF1() {
  const c = campeonatoDeF1();
  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Campeonato de Fórmula 1</h1>
      <p className="mini" style={{ marginTop: 8 }}>
        {c ? `Temporada ${c.temporada}, después de la carrera ${c.ronda}${c.carreras ? ` de ${c.carreras}` : ''}.` : ''}
      </p>
      {c ? (
        <>
          {c.pilotos.length > 0 && <TablaDePilotos filas={c.pilotos} />}
          {c.constructores.length > 0 && <TablaDeConstructores filas={c.constructores} />}
        </>
      ) : <div className="tarjeta" style={{ marginTop: 22 }}><strong>Todavía no tenemos el campeonato.</strong> Aparece apenas la fuente lo publique.</div>}
      <p className="mini" style={{ marginTop: 18 }}>
        Las carreras y sus horarios, en <a href="/seccion/automovilismo">Automovilismo</a>. Fuente: Jolpica F1.
      </p>
    </div>
  );
}
