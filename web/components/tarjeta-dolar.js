'use client';

// El panel del dólar de la portada: oficial, blue y MEP, con la venta grande,
// la compra chica y la hora real de la cotización. Al lado del clima y la
// farmacia, y con el mismo cuidado que /dolar: no promete inmediatez, y si no
// se pudo actualizar muestra la hora de la foto y lo dice. Sin foto y sin
// respuesta de la fuente no hay tarjeta (no un cuadro vacío).
//
// Una sola consulta por página (usar-dolar.js).

import useDolar from '@/components/usar-dolar';
import { filasDelPanel, horaDelPanel, pesos } from '@/lib/dolar';

export default function TarjetaDolar({ foto }) {
  const { datos, estado, ahora } = useDolar(foto);
  const filas = filasDelPanel(datos?.cotizaciones ?? []);
  if (!filas.length) return null;
  const hora = horaDelPanel({ estado, filas, ahora });

  return (
    <section className="tarjeta panel-dolar" aria-label="Dólar">
      <div className="meta">Dólar</div>
      <div className="filas-panel-dolar">
        {filas.map((f) => (
          <div className="fila-panel-dolar" key={f.casa}>
            <span className="nombre">{f.nombre}</span>
            {f.compra != null && <span className="compra">compra {pesos(f.compra)}</span>}
            <span className="venta">{pesos(f.venta)}</span>
          </div>
        ))}
      </div>
      <div className="pie-panel-dolar">
        <span className={estado === 'fallo' ? 'viejo' : undefined} aria-live="polite">{hora}</span>
        <a href="/dolar">Ver todos los dólares →</a>
      </div>
    </section>
  );
}
