'use client';

// La barra de secciones. En pantalla grande es la de siempre; en el celular es
// UNA sola fila que se desliza hacia los costados (antes envolvía en cuatro o
// cinco renglones y se comía media pantalla antes de la primera nota).
//
// Una fila que se desliza esconde secciones sin avisar, así que: un degradé en
// el borde derecho dice que hay más (y se va cuando ya se llegó al final), y la
// sección donde está la persona queda marcada y centrada. Los servicios
// (Agenda, Farmacias, Dólar, Teléfonos) van al final, en verde.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** ¿Este enlace es la página donde estamos? La portada sólo si es "/". */
function esActivo(href, camino) {
  if (href === '/') return camino === '/';
  return camino === href || camino.startsWith(`${href}/`) || camino.startsWith(`${href}-`);
}

export default function Navegacion({ secciones = [], servicios = [] }) {
  const camino = (usePathname() || '/').replace(/\/$/, '') || '/';
  const fila = useRef(null);
  const [hayMas, setHayMas] = useState(false);

  // El degradé de la derecha se apaga cuando la fila llegó al final o cuando
  // todo entra (pantalla grande).
  useEffect(() => {
    const el = fila.current;
    if (!el) return undefined;
    const medir = () => setHayMas(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      el.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  // La sección actual, visible y centrada. Se mueve la fila, nunca la página.
  useEffect(() => {
    const el = fila.current;
    const activo = el?.querySelector('[aria-current="page"]');
    if (!el || !activo || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = activo.offsetLeft - (el.clientWidth - activo.offsetWidth) / 2;
  }, [camino]);

  const enlace = (e, clase) => {
    const actual = esActivo(e.href, camino);
    return (
      <a
        key={e.href}
        href={e.href}
        className={[clase, actual ? 'activo' : ''].filter(Boolean).join(' ') || undefined}
        aria-current={actual ? 'page' : undefined}
      >
        {e.nombre}
      </a>
    );
  };

  return (
    <nav className={`principal${hayMas ? ' hay-mas' : ''}`} aria-label="Secciones">
      <div className="envoltura" ref={fila}>
        {enlace({ href: '/', nombre: 'Portada' })}
        {secciones.map((s) => enlace(s))}
        <span className="crece" />
        {servicios.map((s, i) => enlace(s, i === 0 ? 'servicio primero-servicio' : 'servicio'))}
      </div>
    </nav>
  );
}
