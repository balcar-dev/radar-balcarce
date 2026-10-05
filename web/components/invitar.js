'use client';

// La página para invitar a los amigos (/compartir, 5/10/2026, Hernán: "que sea más fácil copiar y pegar el mensaje y que pueda descargar el video"):
// cada mensaje tiene su botón "Copiar", los enlaces también, y el video se descarga o se manda directo por el menú de compartir del celular.
// Corre en el navegador porque usa el portapapeles y el menú de compartir; si algo no está disponible, queda el botón de descargar y el texto para elegir a mano.

import { useState } from 'react';

function BotonCopiar({ texto, etiqueta = 'Copiar' }) {
  const [estado, setEstado] = useState('');
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado('Copiado ✓');
    } catch {
      // Sin portapapeles (navegador viejo o sin https): se selecciona el texto de la caja de al lado para copiarlo a mano.
      const caja = document.getElementById(`texto-${etiqueta}-${texto.length}`);
      if (caja) { const r = document.createRange(); r.selectNodeContents(caja); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      setEstado('Elegí el texto y copialo');
    }
    setTimeout(() => setEstado(''), 2600);
  };
  return <button type="button" className="boton rojo" onClick={copiar}>{estado || etiqueta}</button>;
}

/** Un mensaje listo para copiar, con su botón. */
export function Mensaje({ titulo, texto }) {
  return (
    <section className="tarjeta" style={{ marginTop: 16 }}>
      <h2 className="fraunces" style={{ fontSize: 19 }}>{titulo}</h2>
      <p id={`texto-Copiar mensaje-${texto.length}`} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '12px 0', lineHeight: 1.55, userSelect: 'all' }}>{texto}</p>
      <BotonCopiar texto={texto} etiqueta="Copiar mensaje" />
    </section>
  );
}

/** Un enlace con su botón de copiar. */
export function EnlaceCopiable({ nombre, direccion }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <strong>{nombre}</strong>
        <div className="mini" style={{ overflowWrap: 'anywhere' }}>{direccion}</div>
      </div>
      <BotonCopiar texto={direccion} etiqueta={`Copiar ${nombre}`} />
    </div>
  );
}

/** El video: se manda directo con el menú de compartir (WhatsApp, Instagram…) o se baja al celular. */
export function Video({ titulo, archivo, descripcion, mensaje }) {
  const [aviso, setAviso] = useState('');
  const compartir = async () => {
    try {
      const res = await fetch(archivo);
      const blob = await res.blob();
      const f = new File([blob], archivo.split('/').pop(), { type: 'video/mp4' });
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text: mensaje });
        return;
      }
      setAviso('Tu navegador no deja mandarlo directo: usá "Descargar" y adjuntalo.');
    } catch (e) {
      if (e?.name !== 'AbortError') setAviso('No se pudo abrir el menú de compartir: usá "Descargar" y adjuntalo.');
    }
  };
  return (
    <section className="tarjeta" style={{ marginTop: 16 }}>
      <h2 className="fraunces" style={{ fontSize: 19 }}>{titulo}</h2>
      <p className="mini" style={{ margin: '6px 0 12px' }}>{descripcion}</p>
      <video src={archivo} controls playsInline preload="metadata" style={{ width: '100%', maxHeight: 420, borderRadius: 10, background: '#000' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <button type="button" className="boton rojo" onClick={compartir}>Mandar por WhatsApp o redes</button>
        <a className="boton borde" href={archivo} download>Descargar el video</a>
      </div>
      {aviso && <p className="mini" style={{ marginTop: 10 }}>{aviso}</p>}
    </section>
  );
}
