'use client';

// El dólar en el navegador: arranca con la foto que vino armada del servidor,
// le pregunta a la fuente al abrir la página y cada 5 minutos, y devuelve
// { datos, estado, ahora }. Lo usan /dolar (dolar-vivo.js) y el panel de la
// portada (tarjeta-dolar.js): la consulta y sus estados se escriben una sola
// vez (lib/dolar.js).
//
//   estado 'guardada'  lo que vino en el HTML, todavía sin consultar
//   estado 'cargando'  el navegador está consultando
//   estado 'vivo'      la fuente contestó hace un momento
//   estado 'fallo'     consultó y ninguna fuente contestó

import { useEffect, useState } from 'react';
import { traerDolar, CADA_DOLAR } from '@/lib/dolar';

export default function useDolar(foto) {
  const [datos, setDatos] = useState(foto);
  const [estado, setEstado] = useState('guardada');
  // Al armar el HTML "ahora" es la hora de la foto; en el navegador se pone
  // la de verdad apenas arranca. Así el servidor y el navegador dibujan lo
  // mismo en el primer instante y no se pelean.
  const [ahora, setAhora] = useState(foto?.consultado ?? null);

  useEffect(() => {
    let vigente = true;
    const consultar = async () => {
      setAhora(new Date().toISOString());
      setEstado((e) => (e === 'vivo' ? e : 'cargando'));
      const nuevo = await traerDolar();
      if (!vigente) return;
      setAhora(new Date().toISOString());
      if (nuevo) {
        setDatos(nuevo);
        setEstado('vivo');
      } else {
        // Si ya había un dato traído recién, se sigue mostrando pero se
        // dice que la última consulta falló.
        setEstado('fallo');
      }
    };
    const alVolver = () => { if (document.visibilityState === 'visible') consultar(); };

    consultar();
    const reloj = setInterval(consultar, CADA_DOLAR);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      vigente = false;
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  return { datos, estado, ahora };
}
