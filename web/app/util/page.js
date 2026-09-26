import { obtenerDatos } from '@/lib/datos';
import { Cierre, Invitacion } from '@/components/piezas';
import { metadatosDePagina } from '@/components/metadatos';

export const metadata = metadatosDePagina({
  titulo: 'Teléfonos útiles',
  descripcion: 'Emergencias, salud, seguridad y oficinas del municipio de Balcarce, en un solo lugar.',
  camino: '/util',
});

// Esta página hace UNA cosa: los teléfonos. Antes tenía también la farmacia
// de turno, la agenda y el clima, y terminaba siendo un cajón de sastre donde
// costaba encontrar justo lo que uno venía a buscar. La farmacia se mudó a
// /farmacias y la agenda a /agenda; el clima está en la barra de arriba de
// todas las páginas.
export default function BalcarceUtil() {
  const numeros = obtenerDatos().utiles?.numeros ?? [];

  const categorias = [...new Set(numeros.map((n) => n.categoria))]
    .map((categoria) => ({ categoria, items: numeros.filter((n) => n.categoria === categoria) }));

  // Un número con barras son varias líneas de la misma oficina: no sirve para
  // un enlace de llamada, así que se muestra pero no se puede tocar.
  const paraLlamar = (numero) => (numero.includes('/') ? null : `tel:${numero.replace(/\D/g, '')}`);

  return (
    <div className="envoltura" style={{ maxWidth: 880 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Teléfonos útiles</h1>
      <p className="mini" style={{ marginTop: 8, marginBottom: 26, maxWidth: 560 }}>
        Emergencias, salud, seguridad y las oficinas del municipio. Tocá un número
        para llamar. Guardalos en el celular: el día que los necesites no vas a
        estar buscando una página.
      </p>

      {categorias.map(({ categoria, items }) => (
        <section key={categoria} style={{ marginBottom: 26 }}>
          <div className="titulo-seccion" style={{ borderBottomWidth: 1 }}>
            <span className="barra" style={{ background: 'var(--s-policiales)' }} />
            <h2 style={{ fontSize: 19 }}>{categoria}</h2>
          </div>
          <div className="rejilla-telefonos">
            {items.map((n) => {
              const enlace = paraLlamar(n.numero);
              const contenido = (
                <>
                  <div className="nombre">{n.nombre}</div>
                  <div className="numero">{n.numero}</div>
                  {n.confirmar && <div className="mini">Sin confirmar</div>}
                </>
              );
              return enlace
                ? <a className="telefono" key={n.nombre} href={enlace}>{contenido}</a>
                : <div className="telefono" key={n.nombre}>{contenido}</div>;
            })}
          </div>
        </section>
      ))}

      <Cierre
        fuente="Los teléfonos salen de la lista oficial de la Municipalidad de Balcarce."
      >
        <Invitacion
          titulo="¿Encontraste un teléfono que cambió?"
          texto="Avisanos cuál y, si lo sabés, el nuevo. Lo corregimos el mismo día."
          boton="Avisarnos"
          asunto="Un teléfono cambió"
          mensaje="Hola, este teléfono cambió:"
        />
      </Cierre>

    </div>
  );
}
