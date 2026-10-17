import { obtenerDatos, proximosEventos, partirFecha } from '@/lib/datos';
import { armarHoy, tituloDeHoy, diaEscrito, diaIso, mediosDe } from '@/lib/hoy';
import { Etiqueta, Hace, TarjetaFarmacia, Evento, Cierre, Invitacion } from '@/components/piezas';
import Compartir from '@/components/compartir';
import { CartelDelCanal } from '@/components/canales';
import { OG_COMUN } from '@/components/metadatos';
import { recortarEn } from '@/lib/texto';

// Lo de hoy en una sola dirección (17/10/2026, regla 255): lo de Balcarce primero, después lo más contado, y los servicios del día. Está
// pensada para mandarla por WhatsApp: una dirección fija, sin parámetros, que siempre muestra el día de hoy (se rearma cada media hora
// con el resto del sitio). Las notas son las mismas de la portada, ordenadas para quien quiere una lista corta (lib/hoy.js). No está en
// el menú ni cambia la portada: se llega desde el pie, desde el sitemap y desde donde se la comparta.

export const dynamic = 'force-static';

export function generateMetadata() {
  const dia = diaEscrito();
  const descripcion = `Las noticias de Balcarce de hoy, ${dia}, en una sola página: lo de acá primero, lo que más medios contaron, la farmacia de turno y la agenda.`;
  const titulo = tituloDeHoy();
  return {
    title: { absolute: titulo },
    description: descripcion,
    alternates: { canonical: '/hoy' },
    // La tarjeta para compartir la pone opengraph-image.js, que está al lado (dice el día).
    openGraph: { ...OG_COMUN, type: 'website', title: titulo.replace(/ · Radar Balcarce$/, ''), description: descripcion, url: '/hoy' },
    twitter: { card: 'summary_large_image', title: titulo.replace(/ · Radar Balcarce$/, ''), description: descripcion },
  };
}

/** Una nota del día: etiqueta, hora, titular y una línea de bajada. */
function NotaDelDia({ nota, conMedios = false }) {
  const medios = mediosDe(nota);
  return (
    <article className="nota-del-dia">
      <div className="chapa-nota">
        <Etiqueta seccion={nota.seccion} />
        <Hace nota={nota} />
        {conMedios && medios > 1 && <span className="meta">contada por {medios} medios</span>}
      </div>
      <h3><a href={nota.ruta}>{nota.titulo}</a></h3>
      {nota.copete && <p>{recortarEn(nota.copete, 170)}</p>}
    </article>
  );
}

export default function Hoy() {
  const d = obtenerDatos();
  const { ventana, balcarce, masContadas, total } = armarHoy(d.notas ?? []);
  const dia = diaEscrito();
  const hoy = diaIso();
  const eventosDeHoy = proximosEventos().filter((e) => partirFecha(e.desde)?.iso === hoy).slice(0, 5);
  const farmacia = d.farmacias?.hoy;
  const diaConMayuscula = dia.charAt(0).toUpperCase() + dia.slice(1);

  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <div className="chapa-tema">
        <span className="meta">{diaConMayuscula}</span>
        <h1>Lo de hoy en Balcarce</h1>
        <p className="mini">
          {total > 0
            ? `${total} ${total === 1 ? 'nota' : 'notas'} ${ventana === 'hoy' ? 'de hoy' : 'de las últimas 24 horas (todavía hay pocas de hoy)'}. Lo de acá primero.`
            : 'Todavía no hay notas de hoy.'}
        </p>
      </div>

      <Compartir titulo={`Lo de hoy en Balcarce · ${dia}`} camino="/hoy" etiqueta="Mandá lo de hoy" />

      {balcarce.length > 0 && (
        <section className="bloque-seccion">
          <div className="titulo-seccion">
            <span className="barra" style={{ background: 'var(--s-balcarce)' }} />
            <h2>En Balcarce</h2>
          </div>
          {balcarce.map((n) => <NotaDelDia nota={n} key={n.id} />)}
        </section>
      )}

      {masContadas.length > 0 && (
        <section className="bloque-seccion">
          <div className="titulo-seccion">
            <span className="barra" style={{ background: 'var(--tinta)' }} />
            <h2>Lo más contado</h2>
          </div>
          {masContadas.map((n) => <NotaDelDia nota={n} conMedios key={n.id} />)}
        </section>
      )}

      {total === 0 && (
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--texto)' }}>
          <a href="/" style={{ color: 'var(--rojo)', fontWeight: 600 }}>Mirá lo último en la portada →</a>
        </p>
      )}

      {(farmacia || eventosDeHoy.length > 0) && (
        <section className="bloque-seccion">
          <div className="titulo-seccion">
            <span className="barra" style={{ background: 'var(--verde)' }} />
            <h2>Para hoy</h2>
          </div>
          {farmacia && <TarjetaFarmacia farmacia={farmacia} verLaSemana={false} verBotones />}
          {eventosDeHoy.length > 0 && (
            <div className="tarjeta" style={{ marginTop: 14, paddingBottom: 8 }}>
              <div className="cabecera-tarjeta">
                <span className="etiqueta">Agenda de hoy</span>
                <a href="/agenda" className="accion">Toda la agenda →</a>
              </div>
              {eventosDeHoy.map((e) => <Evento evento={e} key={e.id} />)}
            </div>
          )}
          <p className="mini" style={{ marginTop: 12 }}>
            <a href="/clima" className="accion">El clima y el pronóstico →</a>
          </p>
        </section>
      )}

      <p className="mini" style={{ marginTop: 22 }}>
        Son resúmenes automáticos de lo que publicaron otros medios, con la fuente siempre enlazada en cada nota.{' '}
        <a href="/quienes-somos#como-trabajamos" style={{ textDecoration: 'underline' }}>Cómo trabajamos</a>
      </p>

      <Compartir titulo={`Lo de hoy en Balcarce · ${dia}`} camino="/hoy" etiqueta="Mandá lo de hoy" />
      <CartelDelCanal />

      <Cierre>
        <Invitacion
          titulo="¿Viste algo en el barrio?"
          texto="Mandanos la foto o el dato por WhatsApp. Lo chequeamos antes de publicarlo y, si lo pedís, no ponemos tu nombre."
          boton="Escribirnos"
          asunto="Tengo un dato para Radar Balcarce"
          mensaje="Hola, tengo un dato para contarles:"
        />
      </Cierre>
    </div>
  );
}
