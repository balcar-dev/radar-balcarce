// Las tablas de las páginas fijas (/tablas/...): posiciones de la Liga con escudos y campeonato de F1. Componentes de servidor, sin estado. Usan el mismo
// estilo que las tablas de las notas de fútbol (`.fb-tabla`, globals.css).

import { rutaDelEscudo } from '@/lib/escudos';

function Equipo({ id, nombre }) {
  const escudo = rutaDelEscudo(id);
  return (
    <span className="fb-equipo">
      {escudo ? <img src={escudo} alt="" width={28} height={28} loading="lazy" decoding="async" /> : <span className="fb-sin-escudo" aria-hidden="true" />}
      <span className="fb-nombre">{nombre}</span>
    </span>
  );
}

const dif = (n) => (n > 0 ? `+${n}` : String(n));

/** Una zona de la Liga: posición, equipo con su escudo, puntos, partidos, ganados, empatados, perdidos y diferencia de gol. */
export function TablaDeZona({ zona }) {
  return (
    <section className="fb-tabla-envoltura">
      <h2 className="fb-zona">{zona.nombre}</h2>
      <table className="fb-tabla">
        <caption className="solo-lectores">Posiciones de la {zona.nombre}</caption>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col">Pts</th><th scope="col">PJ</th><th scope="col">G</th><th scope="col">E</th><th scope="col">P</th><th scope="col">DG</th></tr>
        </thead>
        <tbody>
          {zona.filas.map((f) => (
            <tr key={`${f.posicion}-${f.equipo}`}>
              <td>{f.posicion}</td>
              <th scope="row"><Equipo id={f.id} nombre={f.equipo} /></th>
              <td className="fb-pts">{f.pts}</td>
              <td>{f.pj}</td>
              <td>{f.g}</td>
              <td>{f.e}</td>
              <td>{f.p}</td>
              <td>{dif(f.dif)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** El campeonato de pilotos: posición, piloto (con su equipo), puntos y victorias. */
export function TablaDePilotos({ filas }) {
  return (
    <section className="fb-tabla-envoltura">
      <h2 className="fb-zona">Campeonato de pilotos</h2>
      <table className="fb-tabla">
        <caption className="solo-lectores">Campeonato de pilotos de la Fórmula 1</caption>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Piloto</th><th scope="col">Pts</th><th scope="col">Victorias</th></tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.posicion}-${f.piloto}`}>
              <td>{f.posicion}</td>
              <th scope="row">
                {f.piloto}
                {f.equipo && <span className="fb-equipo-chico">{f.equipo}</span>}
              </th>
              <td className="fb-pts">{f.puntos}</td>
              <td>{f.victorias ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** El campeonato de constructores (equipos): posición, equipo, puntos y victorias. */
export function TablaDeConstructores({ filas }) {
  return (
    <section className="fb-tabla-envoltura">
      <h2 className="fb-zona">Campeonato de constructores</h2>
      <table className="fb-tabla">
        <caption className="solo-lectores">Campeonato de constructores de la Fórmula 1</caption>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col">Pts</th><th scope="col">Victorias</th></tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={`${f.posicion}-${f.equipo}`}>
              <td>{f.posicion}</td>
              <th scope="row">{f.equipo}</th>
              <td className="fb-pts">{f.puntos}</td>
              <td>{f.victorias ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
