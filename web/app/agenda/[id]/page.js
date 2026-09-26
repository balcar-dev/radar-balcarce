import { obtenerEvento, todosLosEventos, proximosEventos } from '@/lib/datos';
import { Etiqueta, Evento, Cierre, Invitacion } from '@/components/piezas';
import Compartir from '@/components/compartir';
import { PieConFuentes } from '@/components/verificacion';
import { OG_COMUN } from '@/components/metadatos';
import { FichaDeEvento, Migas } from '@/components/ficha';
import { notFound } from 'next/navigation';
import {
  parteDeEvento, nombreDeEvento, copeteDeEvento, cuandoEs, dondeEs, entradaDe, firmaDeEvento, yaPaso,
  enlaceGoogleCalendar, fuentesDeEvento, detallesDeEvento, descripcionPropia,
} from '@/lib/eventos';
import { enlace } from '@/lib/sitio';
import { recortarEn } from '@/lib/texto';

// La página de cada evento de la agenda: la "nota" del evento. Se arma con
// los datos (lib/eventos.js), sin IA: qué es, cuándo, dónde, cuánto sale,
// quién organiza, cómo agendarlo y cómo pasarlo por WhatsApp.
//
// Existe mientras el evento esté en data/agenda.json: los próximos y los que
// pasaron hace menos de 60 días. Un enlace compartido no se rompe al día
// siguiente del evento: la página sigue, dice "ya pasó" y sale de las listas.

export function generateStaticParams() {
  const params = todosLosEventos().map((e) => ({ id: parteDeEvento(e) }));
  // Con la exportación estática, una lista vacía rompe la compilación. Si no
  // hay ningún evento, se arma una sola página que da 404.
  return params.length ? params : [{ id: 'sin-eventos' }];
}

const mayuscula = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

export function generateMetadata({ params }) {
  const e = obtenerEvento(params.id);
  if (!e) return {};
  const nombre = nombreDeEvento(e.nombre);
  const entrada = entradaDe(e);
  const descripcion = recortarEn(`${copeteDeEvento(e)}${entrada ? ` Entrada: ${entrada}.` : ''}`, 155);
  return {
    title: recortarEn(nombre, 52),
    description: descripcion,
    // Su propia dirección, sin parámetros pegados (regla 21 de REGLAS.md).
    alternates: { canonical: e.ruta },
    // La tarjeta la pone sola opengraph-image.js, que está al lado.
    openGraph: {
      ...OG_COMUN, type: 'website', title: nombre, description: descripcion, url: e.ruta,
    },
    twitter: { card: 'summary_large_image', title: nombre, description: descripcion },
  };
}

export default function PaginaEvento({ params }) {
  const e = obtenerEvento(params.id);
  if (!e) notFound();

  const nombre = nombreDeEvento(e.nombre);
  const paso = yaPaso(e);
  const url = enlace(e.ruta);
  const donde = dondeEs(e);
  const entrada = entradaDe(e);
  const mapa = donde
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nombreDeEvento(e.direccion || e.lugar || '')}, ${e.localidad || 'Balcarce'}, Buenos Aires`)}`
    : null;
  const firma = firmaDeEvento(e);
  const fuente = e.fuente && /^municipalidad/i.test(e.fuente) ? `la ${e.fuente}` : e.fuente;
  const detalles = detallesDeEvento(e);
  const descripcion = descripcionPropia(e);
  const otros = proximosEventos().filter((o) => o.id !== e.id).slice(0, 3);

  return (
    <div className="envoltura">
      {/* Los datos para Google. Si la fuente lo sacó de su agenda no se
          declara: no sabemos si se suspendió y no vamos a afirmar que sigue. */}
      {!e.retirado && <FichaDeEvento evento={e} />}
      <Migas pasos={[
        { nombre: 'Agenda', camino: '/agenda' },
        { nombre, camino: e.ruta },
      ]} />
      <article className="cuerpo-nota">
        <div className="chapa-nota">
          <Etiqueta seccion="Cultura y agenda" />
          <span className="meta">{paso ? 'Ya pasó' : 'Agenda'}</span>
        </div>

        <h1>{nombre}</h1>
        <p className="copete">{copeteDeEvento(e)}</p>

        {paso && (
          <div className="aviso-evento">
            Este evento ya pasó: fue {cuandoEs(e)}. <a href="/agenda">Mirá lo que viene en la agenda →</a>
          </div>
        )}
        {!paso && e.retirado && (
          <div className="aviso-evento">
            {mayuscula(fuente || 'la fuente')} lo sacó de su agenda: puede haberse suspendido o
            cambiado de fecha. Antes de ir, confirmalo con quien lo organiza.
          </div>
        )}

        <dl className="ficha-evento">
          <div>
            <dt>Cuándo</dt>
            <dd>{mayuscula(cuandoEs(e))}</dd>
          </div>
          <div>
            <dt>Dónde</dt>
            <dd>
              {donde || 'Balcarce'}
              {mapa && (
                <>
                  {' · '}
                  <a href={mapa} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>Entrada</dt>
            <dd>{entrada ?? 'No la informaron. Consultá el valor con quien organiza.'}</dd>
          </div>
          {e.organizador && (
            <div>
              <dt>Organiza</dt>
              <dd>
                {e.organizadorUrl
                  ? <a href={e.organizadorUrl} target="_blank" rel="noopener noreferrer">{nombreDeEvento(e.organizador)}</a>
                  : nombreDeEvento(e.organizador)}
              </dd>
            </div>
          )}
          {detalles.length > 0 && (
            <div>
              <dt>Qué hay</dt>
              <dd>{detalles.join(' · ')}</dd>
            </div>
          )}
        </dl>

        {!paso && !e.retirado && (
          <div className="botones-evento">
            <a href={`${e.ruta}/evento.ics`} className="boton rojo">Agendar en el celular</a>
            <a href={enlaceGoogleCalendar(e, url)} className="boton borde" target="_blank" rel="noopener noreferrer">Google Calendar</a>
            {e.web && <a href={e.web} className="boton borde" target="_blank" rel="noopener noreferrer">Entradas e información ↗</a>}
          </div>
        )}

        {descripcion && (
          <section className="descripcion-evento">
            <h2>De qué se trata</h2>
            {descripcion.split(/\r?\n/).map((p) => p.trim()).filter(Boolean).map((parrafo, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <p key={`${i}-${parrafo.slice(0, 30)}`}>{parrafo}</p>
            ))}
          </section>
        )}

        <PieConFuentes firma={firma.texto} explicacion={firma.explicacion} fuentes={fuentesDeEvento(e)} />
        <Compartir titulo={`${nombre}: ${copeteDeEvento(e)}`} />

        {otros.length > 0 && (
          <section className="bloque-seccion">
            <div className="titulo-seccion">
              <span className="barra" style={{ background: 'var(--s-cultura)' }} />
              <h2>También en la agenda</h2>
              <a href="/agenda" className="ver-todo">Ver todo →</a>
            </div>
            {otros.map((o) => <Evento evento={o} key={o.id} />)}
          </section>
        )}

        <Cierre>
          <Invitacion
            titulo="¿Algo cambió en este evento?"
            texto="Si sos de la organización o sabés que cambió la fecha, el lugar o la entrada, escribinos y lo corregimos."
            boton="Escribirnos"
            asunto={`Sobre el evento: ${nombre}`}
            mensaje={`Hola, escribo por el evento "${nombre}" de la agenda:`}
          />
        </Cierre>
      </article>
    </div>
  );
}
