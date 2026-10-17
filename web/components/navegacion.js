'use client';

// La barra de secciones. En pantalla grande es la de siempre; en el celular es
// UNA sola fila que se desliza hacia los costados (antes envolvía en cuatro o
// cinco renglones y se comía media pantalla antes de la primera nota).
//
// Una fila que se desliza esconde secciones sin avisar, así que: un degradé en
// el borde derecho dice que hay más (y se va cuando ya se llegó al final), y la
// sección donde está la persona queda marcada y centrada. Los servicios
// (Agenda, Clima, Farmacias, Dólar, Teléfonos) van al final, en verde.
//
// Con `mas` (siempre desde el 17/10/2026, reglas 187 y 211; ver
// docs/secciones/PROTOTIPO-MENU.html) la barra lleva las ocho secciones fuertes y
// un botón "Más secciones" (en el celular, "Secciones", fijo a la derecha) que
// abre un panel con todas, agrupadas. Es un <button> con aria-expanded y
// aria-controls: Enter o Espacio lo abren, Escape lo cierra y el foco vuelve al
// botón; en el celular el panel tapa la pantalla y Tab no se escapa de él. Los
// enlaces del panel están en el HTML aunque esté cerrado, y el pie del sitio
// lista todas las secciones (sin JavaScript el panel no se abre). Sin `mas`, la
// barra es exactamente la de antes.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/** ¿Este enlace es la página donde estamos? La portada sólo si es "/". */
function esActivo(href, camino) {
  if (href === '/') return camino === '/';
  return camino === href || camino.startsWith(`${href}/`) || camino.startsWith(`${href}-`);
}

/** El celular: el panel tapa toda la pantalla (la misma medida que globals.css). */
const esCelular = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches;

export default function Navegacion({ secciones = [], servicios = [], mas = null }) {
  const camino = (usePathname() || '/').replace(/\/$/, '') || '/';
  const fila = useRef(null);
  const nav = useRef(null);
  const boton = useRef(null);
  const panel = useRef(null);
  const [hayMas, setHayMas] = useState(false);
  const [abierto, setAbierto] = useState(false);

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

  // El panel de "Más secciones": al abrir, el foco entra; Escape cierra y vuelve al botón; en el celular Tab no se
  // escapa y la página de atrás no se mueve; en la computadora, un toque afuera lo cierra.
  useEffect(() => {
    if (!mas || !abierto) return undefined;
    const celular = esCelular();
    // Sólo lo que se ve (en la computadora la × está escondida).
    const enfocables = () => [...(panel.current?.querySelectorAll('a[href], button') ?? [])].filter((el) => el.getClientRects().length > 0);
    enfocables()[0]?.focus();
    const tecla = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setAbierto(false);
        boton.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !celular) return;
      const lista = enfocables();
      const [primero, ultimo] = [lista[0], lista[lista.length - 1]];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
    };
    const afuera = (e) => { if (!celular && nav.current && !nav.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('keydown', tecla);
    document.addEventListener('mousedown', afuera);
    const antes = document.body.style.overflow;
    if (celular) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('mousedown', afuera);
      document.body.style.overflow = antes;
    };
  }, [abierto, mas]);

  // Al cambiar de página el panel se cierra solo.
  useEffect(() => { setAbierto(false); }, [camino]);

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

  if (!mas) {
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

  // Si la persona está en una sección que no está en la barra, el botón lo dice ("Más secciones · Salud").
  const enLaBarra = new Set(mas.enLaBarra ?? []);
  // El nombre del botón para los lectores de pantalla es siempre "Más secciones" (contiene lo que se ve: "Secciones" en el
  // celular, "Más secciones" en la computadora), así no depende de la pantalla al armar la página.
  const actualEnElMas = mas.grupos.flatMap((g) => g.secciones).find((s) => !enLaBarra.has(s.href) && esActivo(s.href, camino));

  return (
    <nav ref={nav} className={`principal con-mas${hayMas ? ' hay-mas' : ''}${abierto ? ' abierto' : ''}`} aria-label="Secciones">
      <div className="fila-mas">
        <div className="desliza-marco">
          <div className="envoltura desliza" ref={fila}>
            {enlace({ href: '/', nombre: 'Portada' })}
            {secciones.map((s) => enlace(s))}
            <span className="crece" />
            {servicios.map((s, i) => enlace(s, i === 0 ? 'servicio primero-servicio' : 'servicio'))}
          </div>
        </div>
        <button
          type="button"
          ref={boton}
          className={`boton-mas${actualEnElMas ? ' hay-actual' : ''}`}
          aria-expanded={abierto}
          aria-controls="panel-secciones"
          aria-label={`Más secciones${actualEnElMas ? `, estás en ${actualEnElMas.nombre}` : ''}`}
          onClick={() => setAbierto((a) => !a)}
        >
          <span className="icono" aria-hidden="true"><i /><i /><i /></span>
          <span className="rotulo-celular">Secciones</span>
          <span className="rotulo-grande">Más secciones</span>
          {actualEnElMas && <span className="donde"> · {actualEnElMas.nombre}</span>}
          <span className="flecha" aria-hidden="true" />
        </button>
      </div>
      <div id="panel-secciones" ref={panel} className="panel-mas" hidden={!abierto}>
        <div className="panel-cab">
          <p className="panel-titulo">Secciones</p>
          <button type="button" className="cerrar" aria-label="Cerrar las secciones" onClick={() => { setAbierto(false); boton.current?.focus(); }}>×</button>
        </div>
        {mas.grupos.map((g, i) => (
          <div className="grupo" role="group" aria-labelledby={`grupo-secciones-${i}`} key={g.nombre}>
            <p className="grupo-nombre" id={`grupo-secciones-${i}`}>{g.nombre}</p>
            <ul>
              {g.secciones.map((s) => {
                const actual = esActivo(s.href, camino);
                return (
                  <li key={s.href}>
                    <a href={s.href} style={{ '--c': s.color }} className={actual ? 'activo' : undefined} aria-current={actual ? 'page' : undefined}>
                      {s.nombre}
                      {s.nueva && <span className="nueva">nueva</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <div className="grupo servicios" role="group" aria-labelledby="grupo-secciones-servicios">
          <p className="grupo-nombre" id="grupo-secciones-servicios">Servicios</p>
          <ul>
            {servicios.map((s) => <li key={s.href}>{enlace(s)}</li>)}
          </ul>
        </div>
      </div>
      {abierto && <div className="velo" aria-hidden="true" onClick={() => setAbierto(false)} />}
    </nav>
  );
}
