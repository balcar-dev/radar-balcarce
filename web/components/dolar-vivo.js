'use client';

// Las tarjetas del dólar de /dolar, que se actualizan en el navegador.
//
// El sitio es HTML estático que se arma cada media hora. Para el dólar eso
// no alcanza: por eso las tarjetas le preguntan a DolarApi.com al abrir la
// página y cada 5 minutos mientras sigue abierta (lib/dolar.js).
//
// Lo que vino armado del servidor (la foto de data/dolar.json) se ve desde
// el primer instante, con su hora. Recién cuando la fuente contesta en el
// navegador aparece el punto verde y "Actualizado a las…": antes, no se
// promete nada que no pasó.

import useDolar from '@/components/usar-dolar';
import {
  textoDeEstado, brecha, pesos, porcentaje, momento, datosDeCasa, hayCentavos, FUENTES,
} from '@/lib/dolar';

function HoraDeTarjeta({ fecha, ahora }) {
  const m = momento(fecha, ahora);
  return <span className="hora-dolar">{m.dia ? `${m.dia.replace(/^el /, '')} ${m.hora}` : m.hora}</span>;
}

export default function DolarVivo({ foto }) {
  const { datos, estado, ahora } = useDolar(foto);

  const lista = datos?.cotizaciones ?? [];
  const estadoTexto = textoDeEstado({ estado, datos, ahora });
  const b = brecha(lista);
  const fuente = FUENTES[datos?.fuente];
  // Si algún valor tiene centavos, todos llevan dos decimales: las cifras alinean.
  const opciones = hayCentavos(lista) ? { centavos: 'siempre' } : undefined;

  return (
    <>
      <div className={`estado-dolar ${estado === 'vivo' ? 'al-dia' : 'viejo'}`} aria-live="polite">
        {estado === 'vivo' && <span className="punto-vivo" aria-hidden="true" />}
        <div>
          <strong>{estadoTexto.titulo}</strong>
          {estadoTexto.detalle && <div className="mini">{estadoTexto.detalle}</div>}
        </div>
      </div>

      {b && (
        <p className="brecha-dolar">
          Brecha entre el blue y el oficial:{' '}
          <strong>{porcentaje(b.porcentaje)}</strong>{' '}
          <span className="apagado">({pesos(b.pesos)} por dólar, a precio de venta)</span>
        </p>
      )}

      {lista.length > 0 && (
        <div className="rejilla-dolar">
          {lista.map((c) => (
            <div key={c.casa} className={`tarjeta-dolar${c.casa === 'blue' ? ' destacada' : ''}`}>
              <div className="cabeza-dolar">
                <h2>{datosDeCasa(c.casa).nombre}</h2>
                <HoraDeTarjeta fecha={c.fecha} ahora={ahora} />
              </div>
              <div className="precios-dolar">
                <div>
                  <div className="rotulo">Compra</div>
                  <div className="precio">{pesos(c.compra, opciones)}</div>
                </div>
                <div>
                  <div className="rotulo">Venta</div>
                  <div className="precio">{pesos(c.venta, opciones)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fuente && (
        <p className="mini" style={{ marginTop: 14 }}>
          Fuente: <a href={fuente.url} target="_blank" rel="noopener noreferrer" className="enlace-fuente">{fuente.nombre}</a>.
          {' '}La hora de cada tarjeta es la que informa la fuente para ese tipo de dólar.
        </p>
      )}
    </>
  );
}
