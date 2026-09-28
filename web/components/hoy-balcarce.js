'use client';

// "Hoy en Balcarce": clima, farmacia de turno y dólar en tres renglones, cada
// uno con su dato principal y un enlace a su página (/clima, /farmacias,
// /dolar), que es donde está el detalle.
//
// Reemplaza al resumen con pestañas (28/09 a la mañana). Hernán, 28/09: "quedó
// medio burdo y volvió el tema de los botones de farmacia; dos cruces de
// farmacias es mucho para la pantalla principal, total en las tres cosas
// después debería existir una página con más detalles". Así que en la portada
// va sólo el dato, sin botones: en el celular son tres renglones antes de la
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

function Renglon({ href, icono, que, valor, extra }) {
  return (
    <a href={href} className="renglon-hoy">
      <span className="icono-hoy" aria-hidden="true">{icono}</span>
      <span className="texto-hoy">
        <span className="que-hoy">{que}</span>
        <span className="valor-hoy">{valor}</span>
      </span>
      {extra && <span className="extra-hoy">{extra}</span>}
      <span className="flecha-hoy" aria-hidden="true">›</span>
    </a>
  );
}

const CRUZ = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--farmacia)" />
    <path d="M10 5.5h4v4.5h4.5v4H14v4.5h-4V14H5.5v-4H10z" fill="#fff" />
  </svg>
);

const PESOS = (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--crema)" />
    <text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--tinta)" fontFamily="var(--f-texto)">$</text>
  </svg>
);

/** Los nombres de las farmacias de turno, como se escriben: "Medrano y Del
 *  Patio". El del detalle trae los acentos (es el directorio del Colegio). */
export function nombresDeTurno(farmacia) {
  if (!farmacia) return '';
  const nombres = farmacia.detalle?.length
    ? farmacia.detalle.map((f) => f.nombre)
    : (farmacia.farmacias ?? []);
  return nombres.map(comoNombre).join(' y ');
}

export function HoyEnBalcarce({ clima, farmacia, foto }) {
  const [datosClima] = useClimaVivo(clima);
  const { datos: datosDolar } = useDolar(foto);

  const a = datosClima?.ahora;
  const hoy = datosClima?.dias?.[0];
  const turno = nombresDeTurno(farmacia);
  const filas = filasDelPanel(datosDolar?.cotizaciones ?? []);
  const blue = filas.find((f) => f.casa === 'blue');
  const oficial = filas.find((f) => f.casa === 'oficial');
  const principalDolar = blue ?? oficial;
  const otroDolar = blue ? oficial : null;

  if (!a && !turno && !principalDolar) return null;

  return (
    <section className="tarjeta hoy-balcarce" aria-label="Hoy en Balcarce">
      {a && (
        <Renglon
          href="/clima"
          icono={<SolChico cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={24} />}
          que="Clima"
          valor={<><strong>{a.temp}°</strong> {a.cielo}</>}
          extra={hoy ? `${hoy.max}° / ${hoy.min}°` : null}
        />
      )}
      {turno && (
        <Renglon
          href="/farmacias"
          icono={CRUZ}
          que="Farmacia de turno"
          valor={<strong>{turno}</strong>}
        />
      )}
      {principalDolar && (
        <Renglon
          href="/dolar"
          icono={PESOS}
          que="Dólar"
          valor={<>{principalDolar.nombre} <strong>{pesosEnteros(principalDolar.venta)}</strong></>}
          extra={otroDolar ? `${otroDolar.nombre} ${pesosEnteros(otroDolar.venta)}` : null}
        />
      )}
    </section>
  );
}
