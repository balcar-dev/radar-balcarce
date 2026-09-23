import avisos from '@/data/avisos.json';

// Los tres espacios de publicidad (ver REDES.md § 2): después de la nota de
// apertura, al lado del clima y la farmacia, y al pie de todo. Se venden a
// comercios de Balcarce, no a una red publicitaria — por eso no hay ningún
// código de terceros acá, sólo texto y un logo propio.
//
// Reglas que no se negocian (CLAUDE.md): quietos (nada de animaciones ni de
// perseguir el scroll), grises y con tipografía chica, nunca el rojo de la
// marca, y siempre dicen "Espacio publicitario" arriba.
//
// Mientras `web/data/avisos.json` tenga el slot en null, no se muestra
// nada: no hay avisos "de mentira" ocupando lugar. Se activa cargando ese
// archivo, no tocando este componente.
export function Aviso({ slot }) {
  const a = avisos?.[slot];
  if (!a) return null;

  return (
    <aside className="aviso" aria-label="Espacio publicitario">
      <p className="aviso-etiqueta">Espacio publicitario</p>
      <div className="aviso-cuerpo">
        {a.logo && <img src={a.logo} alt="" className="aviso-logo" />}
        <div>
          <p className="aviso-nombre">{a.nombre}</p>
          <p className="aviso-texto">{a.texto}</p>
        </div>
      </div>
    </aside>
  );
}
