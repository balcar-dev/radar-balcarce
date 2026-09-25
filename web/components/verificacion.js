// Lo que la nota sabe y lo que no: las claves, qué se sabe, qué falta
// confirmar, de dónde sale cada dato y el nivel de verificación.
//
// Existe desde el 25/09, cuando la reescritura pasó a trabajar como "editor
// digital" (reels/reescritura.mjs). Todo sale de la nota ya verificada: la IA
// escribió las claves y los puntos, el verificador los comparó contra la
// fuente y descartó lo que no cuadraba, y el NIVEL lo calculó el código, no
// la IA (nivelDeVerificacion). Las notas de antes no traen nada de esto y se
// ven como siempre: el componente no dibuja nada.
//
// Componente de servidor, sin estado: HTML estático como el resto de la nota.

const ZONA = 'America/Argentina/Buenos_Aires';

const NOMBRE_DEL_NIVEL = { ALTA: 'Verificación alta', MEDIA: 'Verificación media', BAJA: 'Verificación baja' };

function fechaCorta(iso) {
  const t = Date.parse(iso ?? '');
  if (!Number.isFinite(t)) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric', month: 'numeric', year: 'numeric', timeZone: ZONA,
  }).format(new Date(t));
}

function Lista({ titulo, puntos, clase = '' }) {
  if (!puntos?.length) return null;
  return (
    <div className={`bloque-verificacion ${clase}`.trim()}>
      <h2>{titulo}</h2>
      <ul>
        {puntos.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}

/** ¿La nota trae algo de esto? Las de antes del 25/09, no. */
export function tieneVerificacion(nota) {
  return Boolean(nota?.verificacion || nota?.claves?.length || nota?.seSabe?.length
    || nota?.noConfirmado?.length || nota?.fuentesConsultadas?.length);
}

export default function VerificacionDeLaNota({ nota }) {
  if (!tieneVerificacion(nota)) return null;
  const v = nota.verificacion;
  const fuentes = nota.fuentesConsultadas ?? [];
  const antecedentes = nota.antecedentes ?? [];

  return (
    <section className="verificacion-nota" aria-label="Qué se sabe de esta nota y de dónde sale">
      {v?.nivel && (
        <p className="nivel-verificacion">
          <span className={`chapa-nivel nivel-${v.nivel.toLowerCase()}`}>{NOMBRE_DEL_NIVEL[v.nivel] ?? v.nivel}</span>
          <span>{v.porque}</span>
        </p>
      )}

      <Lista titulo="Claves" puntos={nota.claves} />
      <Lista titulo="Qué se sabe" puntos={nota.seSabe} />
      <Lista titulo="Qué falta confirmar" puntos={nota.noConfirmado} />

      {(fuentes.length > 0 || antecedentes.length > 0) && (
        <div className="bloque-verificacion fuentes-consultadas">
          <h2>Fuentes consultadas</h2>
          <ul>
            {fuentes.map((f, i) => (
              <li key={f.enlace ?? `${f.medio}-${i}`}>
                {f.enlace
                  ? <a href={f.enlace} target="_blank" rel="noopener noreferrer">{f.medio ?? 'Nota original'}</a>
                  : <strong>{f.medio}</strong>}
                {f.oficial && <span className="dato-fuente"> · fuente oficial</span>}
                {fechaCorta(f.fecha) && <span className="dato-fuente"> · {fechaCorta(f.fecha)}</span>}
                {f.aporte && <span className="aporte"> — {f.aporte}</span>}
              </li>
            ))}
            {antecedentes.map((a) => (
              <li key={a.id ?? a.ruta}>
                <span className="dato-fuente">Nota anterior de Radar Balcarce{fechaCorta(a.fecha) ? `, del ${fechaCorta(a.fecha)}` : ''}: </span>
                <a href={a.ruta}>{a.titulo}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
