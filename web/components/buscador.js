'use client';

// El buscador.
//
// De los cinco portales de la zona sólo dos tienen uno (docs/historico/INVESTIGACION-COMPETENCIA.md).
// Un sitio con ochenta notas sin forma de buscar es un archivo cerrado con
// llave, y dentro de seis meses van a ser mil.
//
// Busca en el navegador, sobre el mismo archivo que ya bajó para dibujar la
// portada: no hay servidor, no hay base de datos y no hay una sola consulta
// de red. Con mil notas eso sigue siendo instantáneo; el día que no alcance,
// se cambia por algo más grande sin tocar el resto del sitio.

import { useEffect, useMemo, useRef, useState } from 'react';

/** Saca tildes y mayúsculas: buscar "futbol" tiene que encontrar "fútbol", y
 *  nadie escribe los acentos en un buscador. */
function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function Buscador({ notas = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const campo = useRef(null);

  // El índice se arma una sola vez, no en cada tecla.
  const indice = useMemo(() => notas.map((n) => ({
    ...n,
    buscable: normalizar(`${n.titulo} ${n.copete ?? ''} ${n.seccion} ${(n.medios ?? []).join(' ')}`),
  })), [notas]);

  const resultados = useMemo(() => {
    const q = normalizar(texto).trim();
    if (q.length < 2) return [];
    // Todas las palabras tienen que aparecer, en cualquier orden: quien
    // escribe "ferroviarios copa" espera la nota que tiene las dos.
    const palabras = q.split(/\s+/);
    return indice.filter((n) => palabras.every((p) => n.buscable.includes(p))).slice(0, 12);
  }, [texto, indice]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') setAbierto(false);
      // La barra abre el buscador, como en cualquier sitio de noticias — pero
      // no cuando se está escribiendo en un campo.
      const escribiendo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !escribiendo) { e.preventDefault(); setAbierto(true); }
    };
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, []);

  if (!abierto) {
    return (
      <button type="button" className="abrir-buscador" onClick={() => setAbierto(true)} aria-label="Buscar en el sitio">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <span>Buscar</span>
      </button>
    );
  }

  return (
    <div className="capa-buscador" role="dialog" aria-modal="true" aria-label="Buscar">
      <button type="button" className="fondo-buscador" onClick={() => setAbierto(false)} aria-label="Cerrar" />
      <div className="caja-buscador">
        <div className="campo-buscador">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={campo}
            id="buscar"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar una nota…"
            aria-label="Buscar una nota en Radar Balcarce"
            autoComplete="off"
          />
          <button type="button" onClick={() => setAbierto(false)} className="cerrar">Cerrar</button>
        </div>

        <div className="resultados">
          {normalizar(texto).trim().length < 2 && (
            <p className="pista">Escribí al menos dos letras. Busca en {notas.length} notas publicadas.</p>
          )}
          {normalizar(texto).trim().length >= 2 && resultados.length === 0 && (
            <p className="pista">No encontramos nada con esas palabras.</p>
          )}
          {resultados.map((n) => (
            <a className="resultado" key={n.id} href={n.ruta}>
              <span className="seccion">{n.seccion}</span>
              <span className="titulo">{n.titulo}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
