import { whatsapp, WHATSAPP, MAIL } from '@/lib/datos';
import { metadatosDePagina } from '@/components/metadatos';

// Contacto y pedidos de corrección.
//
// Los mismos dos canales que ya están en el pie y en la tarjeta del buzón
// (WhatsApp y el correo del medio), más cómo pedir que corrijamos algo. Un
// medio que publica solo tiene que hacer muy fácil avisarle que se equivocó.

export const metadata = metadatosDePagina({
  titulo: 'Contacto y correcciones',
  descripcion: 'Cómo escribirle a Radar Balcarce: para mandar un dato, pedir una corrección o hablar de publicidad. WhatsApp y correo.',
  camino: '/contacto',
});

const TITULO = { fontSize: 20, marginTop: 28, marginBottom: 8 };

export default function Contacto() {
  return (
    <div className="envoltura" style={{ maxWidth: 700 }}>
      <h1 className="fraunces" style={{ fontSize: 34, marginBottom: 18 }}>Contacto y correcciones</h1>

      <div style={{ fontSize: 15.5, lineHeight: 1.7 }}>
        <p>Para lo que sea, escribinos por cualquiera de estos dos canales:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>WhatsApp:</strong>{' '}
            <a href={whatsapp('Hola, escribo por Radar Balcarce:')} target="_blank" rel="noopener noreferrer">
              {WHATSAPP.visible}
            </a>
          </li>
          <li>
            <strong>Correo:</strong> <a href={`mailto:${MAIL}`}>{MAIL}</a>
          </li>
        </ul>

        <h3 style={TITULO}>Para pedir una corrección</h3>
        <p>
          Si una nota tiene un error, o si publicamos algo sobre vos que considerás erróneo,
          mandanos:
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li>el enlace a la nota (o el titular),</li>
          <li>qué está mal y, si lo tenés, de dónde sale el dato correcto.</li>
        </ul>
        <p>
          Lo revisa una persona y, si corresponde, corregimos la nota o la sacamos. Como cada nota
          sale de otro medio, a veces el error viene de la fuente: en ese caso también te
          conviene avisarle a ese medio, que figura en la nota.
        </p>
        <p>
          <a
            href={`mailto:${MAIL}?subject=${encodeURIComponent('Pedido de corrección')}`}
            className="boton rojo"
          >
            Pedir una corrección por correo
          </a>
        </p>

        <h3 style={TITULO}>Para mandar un dato</h3>
        <p>
          Si viste algo en el barrio, mandanos la foto o el dato por WhatsApp. Lo chequeamos antes
          de publicarlo y, si lo pedís, no decimos quién nos lo mandó.
        </p>

        <h3 style={TITULO}>Publicidad</h3>
        <p>Si tenés un comercio en Balcarce y querés anunciar en el sitio, escribinos por el mismo lado.</p>

        <p className="mini" style={{ marginTop: 30 }}>
          Cómo trabajamos: <a href="/quienes-somos">quiénes somos</a>. Qué hacemos con tus datos:{' '}
          <a href="/politica-de-privacidad">política de privacidad</a>.
        </p>
      </div>
    </div>
  );
}
