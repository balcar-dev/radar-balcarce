// Las fuentes de la nota, en un desplegable chico y cerrado al pie.
//
// Criterio de Hernán y Andrés (25/09): el sitio opera como un diario. La
// redacción recibe la noticia, suma lo que contaron todas las fuentes, lo
// contrasta y escribe la nota; el lector ve la NOTA (título, bajada y
// cuerpo), no el análisis. "Una cosa es lo que usemos internamente, otra que
// se desplieguen infinitas fuentes dentro de la página."
//
// Por eso acá va sólo el nombre de cada medio con el enlace a su nota. Las
// claves, qué se sabe, qué falta confirmar, lo que aportó cada fuente, los
// antecedentes y el nivel de verificación se siguen generando y guardando
// (portada.json y archivo.json), pero son de uso interno: se ven en el panel
// (panel/panel.html), no en la web, y tampoco van a los datos para Google.
//
// La atribución no es opcional (ley 11.723): toda nota tiene al menos la
// fuente principal, aunque sea de antes de que existieran las fuentes
// consultadas.
//
// Componente de servidor, sin estado: <details> de HTML, sin JavaScript.
// Qué fuentes van sale de lib/fuentes-de-la-nota.js (sin JSX, se prueba).

import { fuentesDeLaNota } from '@/lib/fuentes-de-la-nota';

// Chico y en gris de rótulo: es un dato de apoyo, no otra nota. En el
// celular, el renglón del desplegable tiene 44 px de alto para el dedo.
const ESTILO = `
.fuentes-nota { margin-top: 26px; padding-top: 6px; border-top: 1px solid var(--linea); }
.fuentes-nota summary {
  display: flex; align-items: center; gap: 6px; min-height: 44px; cursor: pointer; list-style: none;
  font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--suave);
}
.fuentes-nota summary::-webkit-details-marker { display: none; }
.fuentes-nota summary::after { content: ""; width: 7px; height: 7px; margin-left: 2px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: translateY(-2px) rotate(45deg); transition: transform .15s; }
.fuentes-nota[open] summary::after { transform: translateY(2px) rotate(-135deg); }
.fuentes-nota summary:focus-visible { outline: 2px solid var(--rojo); outline-offset: 2px; border-radius: 4px; }
.fuentes-nota ul { margin: 0 0 8px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.fuentes-nota li { font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
.fuentes-nota a { color: var(--rojo); font-weight: 600; }
`;

export default function FuentesDeLaNota({ nota }) {
  const fuentes = fuentesDeLaNota(nota);
  if (!fuentes.length) return null;
  return (
    <details className="fuentes-nota">
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      <summary>Fuentes ({fuentes.length})</summary>
      <ul>
        {fuentes.map((f) => (
          <li key={f.enlace ?? f.medio}>
            {f.enlace
              ? <a href={f.enlace} target="_blank" rel="noopener noreferrer">{f.medio ?? 'Nota original'}</a>
              : <span>{f.medio}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
