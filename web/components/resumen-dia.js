'use client';

// El resumen del día: clima, farmacia de turno y dólar en una sola tarjeta
// con pestañas, en vez de tres tarjetas apiladas (28/09, Hernán: "achicar
// clima, farmacia y dólar", parecido a la versión A del rediseño).
//
// No reescribe cada tarjeta: usa las mismas TarjetaClima, TarjetaFarmacia y
// TarjetaDolar de siempre (con sus datos en vivo, su punto verde y sus
// casos sin dato), sólo que ahora una sola está visible a la vez. Ninguna se
// desmonta al cambiar de pestaña: las tres siguen actualizándose solas
// aunque no se estén mirando, así no hay que esperar cuando se vuelve.

// `farmaciaPanel` llega ya armado desde afuera (page.js, un componente de
// servidor) en vez de importar acá <TarjetaFarmacia>: piezas.js trae de
// arriba lib/datos.js, que lee archivos (node:fs), y eso rompe el build de
// un componente de cliente como este (necesita "use client" por las
// pestañas). Clima y dólar sí se importan directo: son de cliente ellos
// mismos, sin ese problema.
import { useState } from 'react';
import { TarjetaClima } from './clima-vivo';
import TarjetaDolar from './tarjeta-dolar';

const PESTANAS = [
  { id: 'clima', etiqueta: 'Clima' },
  { id: 'farmacia', etiqueta: 'Farmacias' },
  { id: 'dolar', etiqueta: 'Dólar' },
];

export function ResumenDelDia({ clima, farmaciaPanel, foto }) {
  const [pestana, setPestana] = useState('clima');

  return (
    <div className="tarjeta resumen-del-dia">
      <div className="pestanas-resumen" role="tablist" aria-label="El resumen del día">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            className={pestana === p.id ? 'pestana-resumen activa' : 'pestana-resumen'}
            onClick={() => setPestana(p.id)}
          >
            {p.id === 'clima' && clima?.ahora?.temp != null ? `${p.etiqueta} ${clima.ahora.temp}°` : p.etiqueta}
          </button>
        ))}
      </div>
      <div className={pestana === 'clima' ? 'panel-resumen' : 'panel-resumen oculto-resumen'}>
        <TarjetaClima clima={clima} />
      </div>
      <div className={pestana === 'farmacia' ? 'panel-resumen' : 'panel-resumen oculto-resumen'}>
        {farmaciaPanel}
      </div>
      <div className={pestana === 'dolar' ? 'panel-resumen' : 'panel-resumen oculto-resumen'}>
        <TarjetaDolar foto={foto} />
      </div>
    </div>
  );
}
