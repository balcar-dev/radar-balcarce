import DolarVivo from '@/components/dolar-vivo';
import { Cierre } from '@/components/piezas';
import { metadatosDePagina } from '@/components/metadatos';
import { CASAS } from '@/lib/dolar';
import { fotoDelDolar } from '@/lib/datos';

export const metadata = metadatosDePagina({
  titulo: 'Dólar hoy en Balcarce: oficial, blue y MEP',
  descripcion: 'La cotización del dólar oficial, blue, MEP, contado con liqui, tarjeta y cripto, consultada al abrir la página, con la brecha y la hora de cada dato.',
  camino: '/dolar',
});

// Como farmacias: una página de servicio que abre directo en el dato. La
// cotización se pide en el navegador (components/dolar-vivo.js); lo de acá
// es el marco y la foto de respaldo.
export default function Dolar() {
  const foto = fotoDelDolar();

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Dólar hoy</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 22 }}>
        Cuánto cuesta el dólar, consultado en el momento en que abrís esta página.
      </p>

      <DolarVivo foto={foto} />

      <details className="que-es-dolar">
        <summary>Qué es cada uno</summary>
        <dl>
          {CASAS.map((c) => (
            <div key={c.casa}>
              <dt>{c.nombre}</dt>
              <dd>{c.que}</dd>
            </div>
          ))}
        </dl>
        <p className="mini">
          La brecha es cuánto más caro está el blue que el oficial, comparando
          los dos precios de venta. Compra es lo que te pagan por cada dólar
          que vendés; venta, lo que pagás por cada dólar que comprás.
        </p>
      </details>

      <Cierre
        fuente="Las cotizaciones son de DolarApi.com (y de Bluelytics si DolarApi no contesta). Son precios de referencia: en cada banco o casa de cambio pueden ser otros."
      />
    </div>
  );
}
