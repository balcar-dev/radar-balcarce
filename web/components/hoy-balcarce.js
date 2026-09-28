'use client';

// "Hoy en Balcarce": clima, farmacia de turno y dólar en un solo panel de tres
// filas (28/09), cada una con su dato y el enlace a su página (/clima,
// /farmacias, /dolar), que es donde está el detalle. En el celular, una fila
// debajo de otra (también en escritorio, donde vive en la columna lateral).
//
// Reemplaza al resumen con pestañas y, después, a tres tarjetas lado a lado
// (Hernán, 28/09: "no me convence como se ve, sobre todo cuando farmacia tiene
// dos de turno": en una tarjeta angosta el nombre no entraba). Nada de botones
// de farmacia: "dos cruces de farmacias es mucho para la pantalla principal".
//
// Clima y dólar se actualizan solos en el navegador (el mismo pedido que la
// pastilla de arriba y /dolar: los números de la misma pantalla coinciden).
// La farmacia llega del servidor como dato, no como componente: piezas.js
// trae node:fs y no se puede importar desde un componente de cliente.

import { useClimaVivo } from '@/lib/pedir-clima';
import { SolChico } from './clima-vivo';
import useDolar from '@/components/usar-dolar';
import { filasDelPanel, pesosEnteros } from '@/lib/dolar';
import { comoNombre } from '@/lib/texto';

/** Una fila: la etiqueta con su ícono a la izquierda, el dato a la derecha
 *  (lo principal en negrita y, después, lo de al lado) y una flecha. Toda la
 *  fila es el enlace. Con dos farmacias de turno el nombre baja de renglón y
 *  la fila crece: en una tarjeta angosta no entraba. */
function Fila({ href, etiqueta, icono, color, principal, secundario }) {
  return (
    <a href={href} className="fila-hoy">
      <span className="rotulo-hoy" style={color ? { color } : undefined}>
        <span className="icono-hoy" aria-hidden="true">{icono}</span>
        {etiqueta}
      </span>
      <span className="dato-hoy">
        <strong>{principal}</strong>
        {secundario && <span className="al-lado-hoy">{secundario}</span>}
      </span>
      <span className="flecha-hoy" aria-hidden="true">›</span>
    </a>
  );
}

const PESO = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
    <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor" fontFamily="Inter, sans-serif">$</text>
  </svg>
);

const CRUZ = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--farmacia)" />
    <path d="M10 5.5h4v4.5h4.5v4H14v4.5h-4V14H5.5v-4H10z" fill="#fff" />
  </svg>
);

/** Los nombres de las farmacias de turno, como se escriben. El del detalle trae
 *  los acentos (es el directorio del Colegio). */
export function nombresDeTurno(farmacia) {
  if (!farmacia) return [];
  const nombres = farmacia.detalle?.length
    ? farmacia.detalle.map((f) => f.nombre)
    : (farmacia.farmacias ?? []);
  return nombres.map(comoNombre).filter(Boolean);
}

export function HoyEnBalcarce({ clima, farmacia, foto }) {
  const [datosClima] = useClimaVivo(clima);
  const { datos: datosDolar } = useDolar(foto);

  const a = datosClima?.ahora;
  const manana = datosClima?.dias?.[1];
  const turno = nombresDeTurno(farmacia);
  const filas = filasDelPanel(datosDolar?.cotizaciones ?? []);
  const blue = filas.find((f) => f.casa === 'blue');
  const oficial = filas.find((f) => f.casa === 'oficial');

  if (!a && !turno.length && !blue && !oficial) return null;

  return (
    <section className="hoy-balcarce" aria-label="Hoy en Balcarce">
      {a && (
        <Fila
          href="/clima"
          etiqueta="Clima"
          icono={<SolChico cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={18} />}
          principal={`${a.temp}°`}
          secundario={[a.cielo, manana ? `mañana ${manana.max}°` : null].filter(Boolean).join(' · ')}
        />
      )}
      {turno.length > 0 && (
        <Fila
          href="/farmacias"
          etiqueta="De turno"
          icono={CRUZ}
          color="var(--farmacia-oscuro)"
          principal={turno.map((n, i) => (
            <span key={n}>{i > 0 && ' y '}<span className="nombre-hoy">{n}</span></span>
          ))}
        />
      )}
      {(blue || oficial) && (
        <Fila
          href="/dolar"
          etiqueta={blue ? 'Dólar blue' : 'Dólar oficial'}
          icono={PESO}
          principal={pesosEnteros((blue ?? oficial).venta)}
          secundario={blue && oficial ? `oficial ${pesosEnteros(oficial.venta)}` : null}
        />
      )}
    </section>
  );
}
