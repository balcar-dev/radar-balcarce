// El reproductor de audio de una nota (17/10/2026). PROTOTIPO, SIN CONECTAR: ninguna página lo importa.
// Diseño y pasos para prenderlo: docs/redes/AUDIO-EN-LA-PAGINA-Y-PODCAST-GENERAL.md.
//
// Es un componente de servidor, SIN JavaScript propio: usa el reproductor que ya trae el navegador (`<audio controls>`), que es accesible
// por teclado y con lector de pantalla. `preload="none"` hace que no se baje ni un byte hasta que la persona aprieta "reproducir":
// la página no pesa más. Si el navegador no sabe reproducir, queda el enlace para bajar el archivo.
// Con el interruptor apagado (lib/audio-de-nota.js) o sin audio válido en la nota, no dibuja nada.

import { audioDeNota } from '@/lib/audio-de-nota';

export default function ReproductorDeAudio({ nota, activo }) {
  const a = audioDeNota(nota, activo === undefined ? {} : { activo });
  if (!a) return null;
  return (
    <section className="audio-de-la-nota" aria-label="Escuchar esta nota" data-pagefind-ignore="" style={{ margin: '18px 0' }}>
      <p className="meta" style={{ marginBottom: 6 }}>
        Escuchá el repaso: {a.duracion}. Voz generada con inteligencia artificial.
      </p>
      <audio controls preload="none" style={{ width: '100%' }}>
        <source src={a.url} type={a.tipo} />
        <a href={a.url}>Bajar el audio ({a.peso})</a>
      </audio>
    </section>
  );
}
