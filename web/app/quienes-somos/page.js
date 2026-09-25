import { metadatosDePagina } from '@/components/metadatos';

// Quiénes somos y cómo trabajamos.
//
// Es lo primero que miran Google, AdSense y cualquier lector desconfiado
// para decidir si un medio es confiable: quién lo hace, cómo elige qué
// publicar, qué parte hace una máquina y qué parte una persona. Todo lo que
// dice acá tiene que ser cierto hoy; si cambia cómo trabajamos (CRITERIO-EDITORIAL.md),
// se cambia esta página.
//
// Sin datos personales de más: nombres de pila y nada de apellidos,
// direcciones ni teléfonos particulares.

export const metadata = metadatosDePagina({
  titulo: 'Quiénes somos',
  descripcion: 'Qué es Radar Balcarce, quién lo hace y cómo trabaja: de dónde salen las noticias, qué escribe la inteligencia artificial y qué revisa una persona.',
  camino: '/quienes-somos',
});

const TITULO = { fontSize: 20, marginTop: 28, marginBottom: 8 };

export default function QuienesSomos() {
  return (
    <div className="envoltura" style={{ maxWidth: 700 }}>
      <h1 className="fraunces" style={{ fontSize: 34, marginBottom: 18 }}>Quiénes somos</h1>

      <div className="texto-pagina" style={{ fontSize: 15.5, lineHeight: 1.7 }}>
        <p>
          Radar Balcarce es un medio digital de Balcarce, provincia de Buenos Aires. Reúne en un
          solo lugar lo que pasa en la ciudad, la región y el país, y suma lo que la gente viene a
          buscar todos los días: la farmacia de turno, el clima, la agenda y los teléfonos útiles.
        </p>
        <p>
          Lo hacen Hernán y Andrés, dos vecinos de Balcarce. Es un proyecto independiente: no
          depende del municipio, de un partido ni de otro medio.
        </p>

        <h3 style={TITULO}>Cómo trabajamos</h3>
        <p>
          Radar Balcarce es un medio <strong>automático</strong>, y preferimos decirlo de entrada.
          Cada media hora un programa lee las noticias que publican los medios locales, los de la
          región y algunos nacionales, y decide cuáles son de interés para Balcarce.
        </p>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>Siempre con la fuente a la vista.</strong> Cada nota dice de qué medio salió y
            enlaza a la nota original. El trabajo periodístico es de ese medio.
          </li>
          <li>
            <strong>Las notas las escribe una inteligencia artificial</strong> con lo que publicaron
            las fuentes (si varios medios contaron lo mismo, las junta), con palabras propias y sin
            copiar. Un segundo programa las verifica contra esas fuentes antes de publicarlas: si
            aparece un número, un nombre, una fecha o una cita que ninguna trae, esa parte se
            descarta. Una nota que no llega a tener un cuerpo completo no se publica.
          </li>
          <li>
            <strong>Lo sensible lo revisa una persona.</strong> Una nota que acusa a alguien, que
            involucra una muerte o que nombra a un menor no sale sola: espera a que uno de nosotros
            la lea y decida. Lo mismo pasa con todo lo de Política y Policiales antes de llegar a
            nuestras redes.
          </li>
          <li>
            <strong>Cada nota dice quién la escribió</strong>, en una línea al pie, junto al botón
            de fuentes: si la redactó la IA, si la revisó la redacción o si el texto es el de la
            fuente. Las fichas de la agenda y las notas propias (como la del dólar) se arman con
            datos, sin IA, y también lo dicen.
          </li>
          <li>
            Las voces de nuestros videos también se producen con inteligencia artificial.
          </li>
        </ul>

        <h3 style={TITULO}>Lo que no hacemos</h3>
        <ul style={{ paddingLeft: 20 }}>
          <li>
            <strong>No usamos fotos de otros medios.</strong> Son obra de quien las sacó. En su
            lugar va una placa propia con el titular.
          </li>
          <li>
            <strong>No identificamos a menores ni a víctimas</strong> de violencia de género o de
            delitos sexuales. Una nota que lo haría no se publica (leyes 26.061 y 26.485).
          </li>
          <li>
            No inventamos: si la inteligencia artificial agrega algo que la fuente no dice, ese
            texto no se usa.
          </li>
        </ul>

        <h3 style={TITULO}>Si algo está mal</h3>
        <p>
          Nos equivocamos, como cualquiera, y un medio automático también. Si ves un error, o si
          publicamos algo sobre vos que considerás erróneo, <a href="/contacto">escribinos</a> y
          lo corregimos. La responsabilidad editorial es de Radar Balcarce.
        </p>
        <p>
          Qué datos pedimos y cómo medimos las visitas está en la{' '}
          <a href="/politica-de-privacidad">política de privacidad</a>.
        </p>
      </div>
    </div>
  );
}
