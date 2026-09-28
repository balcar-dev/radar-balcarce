'use client';

// "Hoy en Balcarce": clima, farmacia de turno y dólar en tres tarjetas lado a
// lado (la idea A del lienzo "Servicios", 28/09: Hernán, "había otros modelos
// más lindos"), cada una con su dato y el enlace a su página (/clima,
// /farmacias, /dolar), que es donde está el detalle.
//
// Reemplaza al resumen con pestañas (28/09 a la mañana). Hernán, 28/09: "quedó
// medio burdo y volvió el tema de los botones de farmacia; dos cruces de
// farmacias es mucho para la pantalla principal, total en las tres cosas
// después debería existir una página con más detalles". Así que en la portada
// va sólo el dato, sin botones: en el celular es una fila de tres tarjetas antes de la
// primera noticia, no una pantalla entera.
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

/** Una tarjeta: la etiqueta con su ícono arriba, el dato grande, un renglón
 *  debajo y, al pie, qué hay en su página. Toda la tarjeta es el enlace. */
function Tarjeta({ href, etiqueta, icono, color, dato, debajo, pie, claseDato = '' }) {
  return (
    <a href={href} className="tarjeta-hoy">
      <span className="etiqueta-hoy" style={color ? { color } : undefined}>
        {etiqueta}
        <span aria-hidden="true">{icono}</span>
      </span>
      <span className={`dato-hoy ${claseDato}`.trim()}>{dato}</span>
      {debajo && <span className="debajo-hoy">{debajo}</span>}
      <span className="pie-hoy">{pie}</span>
    </a>
  );
}

const CRUZ = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
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
  const brecha = blue && oficial ? Math.round(((blue.venta - oficial.venta) / oficial.venta) * 100) : null;

  if (!a && !turno.length && !blue && !oficial) return null;

  return (
    <section className="hoy-balcarce" aria-label="Hoy en Balcarce">
      {a && (
        <Tarjeta
          href="/clima"
          etiqueta="Clima"
          icono={<SolChico cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={22} />}
          dato={`${a.temp}°`}
          debajo={a.cielo}
          pie={manana ? `Mañana ${manana.max}° · ${manana.min}°` : 'Pronóstico ›'}
        />
      )}
      {turno.length > 0 && (
        <Tarjeta
          href="/farmacias"
          etiqueta="De turno"
          icono={CRUZ}
          color="var(--farmacia-oscuro)"
          dato={turno[0]}
          claseDato="nombre"
          debajo={turno.length > 1 ? `y ${turno.slice(1).join(' y ')}` : null}
          pie="Dirección y teléfono ›"
        />
      )}
      {(blue || oficial) && (
        <Tarjeta
          href="/dolar"
          etiqueta={blue ? 'Dólar blue' : 'Dólar oficial'}
          dato={pesosEnteros((blue ?? oficial).venta)}
          claseDato="cifra"
          debajo={blue && oficial ? `Oficial ${pesosEnteros(oficial.venta)}` : null}
          pie={brecha !== null ? `Brecha ${brecha}%` : 'Todos los dólares ›'}
        />
      )}
    </section>
  );
}
