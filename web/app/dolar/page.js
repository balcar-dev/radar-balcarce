import fs from 'node:fs';
import path from 'node:path';
import DolarVivo from '@/components/dolar-vivo';
import { Cierre } from '@/components/piezas';
import { metadatosDePagina } from '@/components/metadatos';
import { CASAS, interpretarDolarApi } from '@/lib/dolar';

export const metadata = metadatosDePagina({
  titulo: 'Dólar hoy en Balcarce: oficial, blue y MEP',
  descripcion: 'La cotización del dólar oficial, blue, MEP, contado con liqui, tarjeta y cripto, consultada al abrir la página, con la brecha y la hora de cada dato.',
  camino: '/dolar',
});

/**
 * La foto que guardó scripts/foto-dolar.mjs al compilar. Se revisa con el
 * mismo cuidado que lo que llega de la fuente: si el archivo está roto, no hay
 * foto y la página lo dice.
 */
function leerFoto() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'dolar.json'), 'utf8'));
    if (!Array.isArray(j.cotizaciones) || !j.consultado) return null;
    // Se pasa por el mismo filtro que la respuesta de la fuente.
    const limpio = interpretarDolarApi(j.cotizaciones.map((c) => ({ ...c, fechaActualizacion: c.fecha })));
    return limpio ? { fuente: j.fuente, cotizaciones: limpio.cotizaciones, consultado: j.consultado, deLaFoto: true } : null;
  } catch {
    return null;
  }
}

// Como farmacias: una página de servicio que abre directo en el dato. La
// cotización se pide en el navegador (components/dolar-vivo.js); lo de acá
// es el marco y la foto de respaldo.
export default function Dolar() {
  const foto = leerFoto();

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
        enlaces={[
          { href: '/farmacias', texto: 'Farmacias' },
          { href: '/util', texto: 'Teléfonos' },
        ]}
        fuente="Las cotizaciones son de DolarApi.com (y de Bluelytics si DolarApi no contesta). Son precios de referencia: en cada banco o casa de cambio pueden ser otros."
      />
    </div>
  );
}
