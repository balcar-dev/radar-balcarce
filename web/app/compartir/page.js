import { Mensaje, EnlaceCopiable, Video } from '@/components/invitar';

// La página para invitar a la gente a seguir a Radar Balcarce (5/10/2026, Hernán): los mensajes para copiar y pegar, los enlaces y el video para descargar o mandar.
// No está en el menú, ni en el mapa del sitio, ni la indexan los buscadores: es una herramienta para pasar el dato, no una página de noticias.
export const metadata = {
  title: 'Invitá a tus amigos',
  description: 'Mensajes y video para compartir Radar Balcarce.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/compartir' },
};

const WEB = 'https://radarbalcarce.com';
const INSTAGRAM = 'https://www.instagram.com/radarbalcarce';
const FACEBOOK = 'https://www.facebook.com/profile.php?id=61594865361170';

const CORTO = `¡Hola! Te cuento algo que estoy armando: Radar Balcarce, un medio digital con las noticias de Balcarce y la zona, todo en un solo lugar y actualizado todo el día. 📰

Te pido una mano: ¿me ayudás siguiéndonos? Es un ratito y nos sirve un montón para arrancar.

🌐 Web: ${WEB}
📸 Instagram: ${INSTAGRAM}
👍 Facebook: ${FACEBOOK}

Y si podés, compartilo con alguien de Balcarce. ¡Gracias! 🙌`;

const PERSONAL = `¡Hola! Quería contarte algo en lo que vengo trabajando: Radar Balcarce. Es un medio digital con las noticias de Balcarce y la región, el clima, las farmacias de turno, la agenda y más, que se actualiza todo el día.

Recién estamos arrancando y lo que más ayuda es que nos sigan. ¿Me das una mano?

1) Seguinos en Instagram: ${INSTAGRAM}
2) Seguinos en Facebook: ${FACEBOOK}
3) Mirá la web y guardala en el celular: ${WEB}

Si te gusta, compartilo con tus contactos de Balcarce. Y si ves o sabés algo que tendría que ser noticia, escribinos. ¡Mil gracias!`;

export default function Compartir() {
  return (
    <div className="envoltura" style={{ maxWidth: 760 }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>Invitá a tus amigos</h1>
      <p className="mini" style={{ marginTop: 8 }}>
        Elegí un mensaje, tocá <strong>Copiar</strong> y pegalo en WhatsApp. Después mandá el video. Lo que más nos ayuda hoy es que nos sigan en las redes.
      </p>

      <Mensaje titulo="Mensaje corto (para grupos y chats)" texto={CORTO} />
      <Mensaje titulo="Mensaje personal (para amigos y familia)" texto={PERSONAL} />

      <Video
        titulo="Video vertical (WhatsApp, historias y reels)"
        archivo="/compartir/radar-balcarce-vertical.mp4"
        descripcion="49 segundos. El mejor para mandar por el celular."
        mensaje="Radar Balcarce: las noticias de Balcarce, todo en un solo lugar. radarbalcarce.com"
      />
      <Video
        titulo="Video horizontal (Facebook y computadora)"
        archivo="/compartir/radar-balcarce-horizontal.mp4"
        descripcion="49 segundos. Para Facebook, YouTube o la compu."
        mensaje="Radar Balcarce: las noticias de Balcarce, todo en un solo lugar. radarbalcarce.com"
      />

      <section className="tarjeta" style={{ marginTop: 16 }}>
        <h2 className="fraunces" style={{ fontSize: 19 }}>Los enlaces, uno por uno</h2>
        <EnlaceCopiable nombre="Web" direccion={WEB} />
        <EnlaceCopiable nombre="Instagram" direccion={INSTAGRAM} />
        <EnlaceCopiable nombre="Facebook" direccion={FACEBOOK} />
      </section>
    </div>
  );
}
