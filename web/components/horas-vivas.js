'use client';

// El sitio es HTML estático: un "hace 48 min" calculado al armar la página
// queda congelado, y si el lector la abre dos horas después, miente. Esto lo
// recalcula en el navegador al abrir la página y una vez por minuto, en cada
// <time data-hace> (components/piezas.js, Hace). Sin JavaScript queda el
// texto de cuando se armó, que es lo que había antes.

import { useEffect } from 'react';
import { haceCuanto } from '@/lib/tiempo';

export function actualizarHoras(raiz = document, ahora = Date.now()) {
  raiz.querySelectorAll('time[data-hace]').forEach((el) => {
    const texto = haceCuanto(el.getAttribute('datetime'), ahora);
    if (el.textContent !== texto) el.textContent = texto;
  });
}

export default function HorasVivas() {
  useEffect(() => {
    actualizarHoras();
    const reloj = setInterval(() => actualizarHoras(), 60000);
    return () => clearInterval(reloj);
  }, []);
  return null;
}
