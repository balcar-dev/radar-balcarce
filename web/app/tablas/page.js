import { metadatosDePagina } from '@/components/metadatos';
import { campeonatoDeF1, tablaDeLaLiga } from '@/lib/tablas';

export const metadata = metadatosDePagina({
  titulo: 'Tablas de posiciones',
  descripcion: 'Las tablas que se actualizan solas: la Liga Profesional de fútbol y el campeonato de Fórmula 1.',
  camino: '/tablas',
});

// El índice de las tablas fijas (4/10/2026): una página por tabla, cada una con su dirección que no cambia.
export default function Tablas() {
  const liga = tablaDeLaLiga();
  const f1 = campeonatoDeF1();
  const lider = liga?.zonas?.map((z) => z.filas?.[0]).filter(Boolean);
  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Tablas de posiciones</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 22 }}>Se actualizan solas después de cada fecha o carrera.</p>
      <a className="tarjeta" href="/tablas/liga-profesional" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <strong style={{ fontSize: 20 }}>Liga Profesional de Fútbol</strong>
        <p className="mini" style={{ marginTop: 6 }}>
          {lider?.length ? `Punteros: ${lider.map((f) => `${f.equipo} (${f.pts} pts)`).join(' y ')}.` : 'Las posiciones de las dos zonas.'}
        </p>
      </a>
      <a className="tarjeta" href="/tablas/formula-1" style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginTop: 14 }}>
        <strong style={{ fontSize: 20 }}>Campeonato de Fórmula 1</strong>
        <p className="mini" style={{ marginTop: 6 }}>
          {f1?.pilotos?.[0] ? `Lidera ${f1.pilotos[0].piloto} con ${f1.pilotos[0].puntos} puntos.` : 'Pilotos y constructores.'}
        </p>
      </a>
    </div>
  );
}
