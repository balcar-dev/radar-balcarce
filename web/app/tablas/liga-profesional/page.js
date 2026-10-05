import { metadatosDePagina } from '@/components/metadatos';
import { TablaDeZona } from '@/components/tablas';
import { tablaDeLaLiga } from '@/lib/tablas';
import { fechaLarga } from '@/lib/tiempo';

export const metadata = metadatosDePagina({
  titulo: 'Tabla de posiciones de la Liga Profesional',
  descripcion: 'Las posiciones de las dos zonas de la Liga Profesional de Fútbol, con puntos, partidos y diferencia de gol. Se actualiza sola después de cada partido.',
  camino: '/tablas/liga-profesional',
});

// La tabla de la Liga, siempre en la misma dirección (4/10/2026): una página fija que se actualiza sola, para citarla, enlazarla desde las notas y las redes y
// para que un buscador la encuentre todo el año. Los datos son los de ESPN, los mismos de las notas de fútbol.
export default function TablaLiga() {
  const t = tablaDeLaLiga();
  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Tabla de posiciones de la Liga Profesional</h1>
      <p className="mini" style={{ marginTop: 8 }}>
        {t?.torneo ? `${t.torneo}. ` : ''}Datos de ESPN.
        {t?.actualizada ? ` Actualizada el ${fechaLarga(t.actualizada)}.` : ''}
      </p>
      {t
        ? t.zonas.map((z) => <TablaDeZona zona={z} key={z.nombre} />)
        : <div className="tarjeta" style={{ marginTop: 22 }}><strong>Todavía no tenemos la tabla.</strong> Aparece apenas la publique la fuente.</div>}
      <p className="fb-pie">PJ: jugados · G: ganados · E: empatados · P: perdidos · DG: diferencia de gol · Pts: puntos.</p>
      <p className="mini" style={{ marginTop: 18 }}>
        Los partidos de cada fecha, con horarios y resultados, están en <a href="/seccion/futbol">Fútbol</a>. Otras tablas: <a href="/tablas/formula-1">Fórmula 1</a>.
      </p>
    </div>
  );
}
