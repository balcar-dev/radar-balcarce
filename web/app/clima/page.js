import { obtenerDatos } from '@/lib/datos';
import { TarjetaClima, PronosticoDias } from '@/components/clima-vivo';
import { Cierre } from '@/components/piezas';
import { metadatosDePagina } from '@/components/metadatos';

export const metadata = metadatosDePagina({
  titulo: 'El clima en Balcarce',
  descripcion: 'El tiempo ahora en Balcarce (temperatura, sensación, viento y humedad) y el pronóstico de la semana.',
  camino: '/clima',
});

// Como farmacias y dólar: una página de servicio que abre directo en el dato.
// La portada muestra sólo la temperatura y el cielo (components/hoy-balcarce.js);
// el detalle está acá. Todo se actualiza solo en el navegador
// (lib/pedir-clima.js); lo del servidor es lo que se ve al entrar.
export default function Clima() {
  const d = obtenerDatos();

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>El clima en Balcarce</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 22 }}>
        Se actualiza solo mientras tenés la página abierta.
      </p>

      {d.clima?.ahora
        ? <TarjetaClima clima={d.clima} />
        : <div className="tarjeta"><strong>Todavía no tenemos el dato del clima.</strong></div>}

      {d.clima?.dias?.length > 0 && (
        <section className="semana-clima">
          <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
            <span className="barra" style={{ background: 'var(--s-tecnologia)' }} />
            <h2 style={{ fontSize: 19 }}>Los próximos días</h2>
          </div>
          <PronosticoDias clima={d.clima} />
        </section>
      )}

      <Cierre fuente="El pronóstico es de Open-Meteo (y de met.no si Open-Meteo no contesta), para las coordenadas de la ciudad de Balcarce." />
    </div>
  );
}
