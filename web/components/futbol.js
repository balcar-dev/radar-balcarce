// La maqueta de las notas de fútbol (4/10/2026, Hernán: "adentro de la nota es mucho texto, una maqueta más linda y prolija, con los escudos"):
// los partidos con su hora, los resultados con marcador y goleadores, y las tablas de cada zona. Dibuja lo mismo que dice el cuerpo (`datosFutbol`,
// ingesta/futbol.mjs); el cuerpo queda para las redes y los buscadores. Componente de servidor, sin estado.

import { rutaDelEscudo } from '@/lib/escudos';

function Equipo({ id, nombre, alReves = false }) {
  const escudo = rutaDelEscudo(id);
  return (
    <span className={`fb-equipo${alReves ? ' fb-equipo-reves' : ''}`}>
      {escudo ? <img src={escudo} alt="" width={28} height={28} loading="lazy" decoding="async" /> : <span className="fb-sin-escudo" aria-hidden="true" />}
      <span className="fb-nombre">{nombre}</span>
    </span>
  );
}

const porDia = (partidos) => {
  const dias = [];
  for (const p of partidos) {
    const ultimo = dias.at(-1);
    if (ultimo && ultimo.dia === p.dia) ultimo.partidos.push(p);
    else dias.push({ dia: p.dia, partidos: [p] });
  }
  return dias;
};

const textoDelGol = (g) => `${g.jugador} ${g.minuto}${g.tipo === 'de penal' ? ' (p)' : (g.tipo === 'en contra' ? ' (e/c)' : '')}`;

function Goleadores({ p }) {
  const de = (lado) => (p.goles ?? []).filter((g) => g.equipo === lado).map(textoDelGol).join(' · ');
  const [l, v] = [de('local'), de('visitante')];
  if (!l && !v) return null;
  return (
    <div className="fb-goles">
      {l && <span><b className="fb-solo-movil">{p.local.nombre}: </b>{l}</span>}
      {v && <span className="fb-gol-visitante"><b className="fb-solo-movil">{p.visitante.nombre}: </b>{v}</span>}
    </div>
  );
}

function FilaDelPartido({ p, conResultado }) {
  const jugado = conResultado && p.local.goles != null && p.visitante.goles != null;
  return (
    <li className="fb-partido">
      <div className="fb-fila">
        <Equipo id={p.local.id} nombre={p.local.nombre} />
        <span className={jugado ? 'fb-marcador' : 'fb-hora'}>{jugado ? `${p.local.goles} - ${p.visitante.goles}` : p.hora}</span>
        <Equipo id={p.visitante.id} nombre={p.visitante.nombre} alReves />
      </div>
      {jugado && p.penales && <p className="fb-detalle">Penales: {p.penales.local} - {p.penales.visitante}</p>}
      {jugado && <Goleadores p={p} />}
      {(p.estadio || p.fase) && <p className="fb-detalle">{[jugado ? p.hora : null, p.fase, p.estadio].filter(Boolean).join(' · ')}</p>}
    </li>
  );
}

function Tabla({ zona }) {
  return (
    <div className="fb-tabla-envoltura">
      <h2 className="fb-zona">{zona.nombre}</h2>
      <table className="fb-tabla">
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
              <td>{f.dif > 0 ? `+${f.dif}` : f.dif}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** El cuerpo de una nota de fútbol propia: `datos` es `nota.datosFutbol` y `tipo`, `nota.tipoFutbol` (partidos, resultados o tablas). */
export default function CuerpoDeFutbol({ tipo, datos }) {
  if (!datos) return null;
  if (tipo === 'tablas') {
    return (
      <div className="fb">
        {(datos.zonas ?? []).map((z) => <Tabla zona={z} key={z.nombre} />)}
        <p className="fb-pie">PJ: jugados · G: ganados · E: empatados · P: perdidos · DG: diferencia de gol. Datos oficiales según ESPN.</p>
      </div>
    );
  }
  const conResultado = tipo === 'resultados';
  return (
    <div className="fb">
      {porDia(datos.partidos ?? []).map((d) => (
        <section className="fb-dia" key={d.dia}>
          <h2>{d.dia}</h2>
          <ul>{d.partidos.map((p) => <FilaDelPartido p={p} conResultado={conResultado} key={`${p.local.id}-${p.visitante.id}`} />)}</ul>
        </section>
      ))}
      {conResultado && datos.faltan > 0 && <p className="fb-aviso">Todavía faltan jugarse {datos.faltan === 1 ? 'un partido' : `${datos.faltan} partidos`} de la fecha: esta nota se completa a medida que terminan.</p>}
      {conResultado && datos.aparte > 0 && <p className="fb-aviso">{datos.aparte === 1 ? 'Un partido quedó' : `${datos.aparte} partidos quedaron`} sin jugarse por ahora.</p>}
      <p className="fb-pie">{conResultado ? 'Resultados oficiales según ESPN.' : 'Horarios en hora argentina, según ESPN: pueden cambiar. Los consultamos de nuevo cada pocas horas.'}</p>
    </div>
  );
}
