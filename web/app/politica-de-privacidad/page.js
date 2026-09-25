// El texto fuente de esta página vive en POLITICA-PRIVACIDAD.md, en la raíz
// del proyecto — se edita ahí y se copia acá (evita meter un parser de
// markdown sólo para una página que casi no cambia).
//
// El título va sin la marca: la plantilla del layout ya le agrega
// " · Radar Balcarce" y salía repetida.
import { metadatosDePagina } from '@/components/metadatos';

export const metadata = metadatosDePagina({
  titulo: 'Política de privacidad',
  descripcion: 'Qué datos pedimos en Radar Balcarce, para qué los usamos, cómo medimos las visitas sin cookies y cómo pedir que borremos tus datos.',
  camino: '/politica-de-privacidad',
});

export default function PoliticaPrivacidad() {
  return (
    <div className="envoltura" style={{ maxWidth: 700 }}>
      <h1 className="fraunces" style={{ fontSize: 34, marginBottom: 18 }}>Política de privacidad</h1>

      <div style={{ fontSize: 15.5, lineHeight: 1.7 }}>
        <p>
          En Radar Balcarce pedimos algunos datos cuando alguien nos manda un dato, un reclamo,
          una opinión para publicar o algo para investigar. Esta página explica qué pedimos, para
          qué lo usamos y qué podés hacer si querés que borremos tus datos.
        </p>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Qué pedimos</h3>
        <p>
          Según el formulario, puede ser: tu nombre, un teléfono o WhatsApp de contacto, y el
          texto de lo que nos quieras contar. Nunca es obligatorio dejar tu nombre — podés pedir
          mantenerte anónimo, salvo en las notas de opinión, que siempre van firmadas con nombre
          real porque son un texto de opinión personal, no un dato anónimo.
        </p>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Cómo medimos las visitas</h3>
        <p>
          Contamos cuánta gente entra y qué notas se leen. Es lo único que nos permite saber
          qué le interesa a Balcarce y qué no, y decidir dónde poner el esfuerzo.
        </p>
        <p>
          Lo hacemos con Cloudflare Web Analytics, de Cloudflare, la empresa donde vive este
          sitio, y elegimos ésa a propósito: <strong>no usa cookies, no arma un perfil tuyo y no
          te sigue a otros sitios</strong>. No sabemos quién sos ni podemos saberlo. Sabemos que
          alguien entró, desde qué tipo de dispositivo y qué página miró — nada más.
        </p>
        <p>
          No usamos Google Analytics ni ninguna herramienta de una red publicitaria. Un medio
          que promete cuidar a sus lectores no puede estar entregándoselos a otro.
        </p>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Para qué lo usamos</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li>Para poder volver a contactarte si necesitamos verificar algo antes de publicar.</li>
          <li>Para armar la nota, el reclamo o el seguimiento que nos pediste.</li>
          <li>
            Nunca para otra cosa. No vendemos ni compartimos tu contacto con nadie — ni con otro
            medio, ni con un anunciante, ni con el municipio.
          </li>
        </ul>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Qué publicamos y qué no</h3>
        <p>
          Tu teléfono nunca se publica. Tu nombre se publica sólo si diste tu autorización
          explícita (por ejemplo, en una nota de opinión firmada) o si pediste específicamente que
          se mencione. Si pediste anonimato, lo respetamos.
        </p>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Cómo pedir que borremos tus datos</h3>
        <p>
          Escribinos por el mismo canal donde nos contactaste pidiendo que borremos tu
          información, y lo hacemos. Si ya publicamos una nota que salió de tu dato, borrar tu
          contacto no borra la nota publicada — eso se resuelve por separado, hablando con la
          redacción.
        </p>

        <h3 style={{ fontSize: 20, marginTop: 28, marginBottom: 8 }}>Reclamos: la otra parte también entra en esto</h3>
        <p>
          Cuando recibimos un reclamo contra una persona o un comercio, antes de publicar le
          pedimos su versión a esa otra parte. Esto no es sólo una regla editorial: es lo que nos
          protege a nosotros y a vos de publicar algo apurado que después haya que corregir.
        </p>

        <p className="mini" style={{ marginTop: 30 }}>Última actualización: 24 de septiembre de 2026.</p>
      </div>
    </div>
  );
}
