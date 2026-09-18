# Redes, marketing y competencia

## 1. Qué hace la competencia (revisado el 18/09/2026)

Los tres medios de Balcarce con web propia, mirados el mismo día:

| | El Diario | Punto Nueve | La Vanguardia |
|---|---|---|---|
| Peso de la portada | 256 KB | 370 KB | 55 KB |
| Publicidad | Google AdSense | Google Ads | Sin avisos |
| Clima | Sí | No | Sí |
| Farmacia de turno | Sí | Sí | Sí |
| Video | Sí | Sí (En Vivo) | No |
| Agenda de eventos | No | No | No |

Secciones que tienen los tres: Balcarce, Policiales, Deportes, Automovilismo,
Agro/Rural, Actualidad.

**La Vanguardia** es el único que monetiza sin banners: vende *Edictos*,
*Inmobiliarias*, *Profesionales* e *Infocampo*. Son secciones pagas, no
publicidad intrusiva. Es el modelo más parecido al que nos sirve.

### Los huecos que nadie llena

1. **Agenda de eventos.** Ninguno de los tres tiene un calendario. Nosotros lo
   sacamos de la API del municipio y se actualiza solo. Es lo más fácil de
   defender: el que quiere saber qué hay para hacer el fin de semana hoy no
   tiene dónde mirar.
2. **Automovilismo que no sea local.** Cubren el TC y el zonal, pero no F1 ni
   MotoGP. En la ciudad de Fangio, con autódromo propio, eso es raro. Ya
   sumamos Motorsport.com en castellano.
3. **Deportes que no son fútbol.** Rugby, hockey, ciclismo, running, atletismo:
   aparecen sólo cuando gana alguien de acá. Sumamos La Nación · Deportes.
4. **Tecnología e IA.** Nadie. Es la sección que nos puede dar identidad propia
   y traer un lector más joven.
5. **Velocidad.** Sus portadas pesan 256 y 370 KB por los banners. La nuestra
   es HTML estático. En un celular con señal mala de la zona rural, eso se nota.

### Dónde no podemos competir todavía

Tienen algo que no se compra: **periodistas en la calle**. Punto Nueve
transmite en vivo. El Diario cubre el Concejo Deliberante. Nosotros hoy
resumimos lo que ellos averiguan. Mientras sea así, la regla de citar y
enlazar la fuente no es sólo legal: es lo que hace que la relación sea
sostenible en un pueblo donde todos se conocen.

## 2. Publicidad: tres avisos y ni uno más

La maqueta está en el lienzo de diseño, artboard "Dónde irían los avisos".

- **Aviso 1** — después de la nota de apertura. El único que interrumpe la
  lectura, y lo hace una sola vez.
- **Aviso 2** — al lado del clima y la farmacia de turno. Es el mejor lugar del
  sitio: lo que la gente mira todos los días, sin interrumpir nada. Es el que
  se cobra más caro.
- **Aviso 3** — abajo de todo. Vale poco. Sirve para regalarlo los primeros
  meses y que un comercio se anime.

Reglas que no se negocian:

- Vendidos a comercios de Balcarce, no traídos por una red publicitaria.
  Sabemos quién es cada aviso.
- Quietos: no parpadean, no se expanden, no persiguen el scroll.
- Grises y con tipografía chica. **Nunca el rojo de la marca.** Si el aviso se
  ve igual que una nota, la gente deja de distinguir qué es qué.
- Dicen "Espacio publicitario" arriba, siempre.
- Son texto y un logo, no imágenes pesadas.

Nunca: pop-ups, videos que arrancan solos, publinotas sin aclarar que lo son,
avisos de apuestas o de préstamos.

## 3. Las redes

### Qué se publica y cuándo

Sale del plan diario (`node reels/plan.mjs`), que ya respeta los cupos:

| Formato | Cuántos | Cuándo | Qué |
|---|---|---|---|
| **Reel** | 3 por día | 10:00, 15:00, 20:30 | Sólo notas con relevancia 78 o más |
| **Historia** | las que haga falta | a lo largo del día | Clima (7:30 y 16:30), farmacia (19:15), notas del día |
| **Feed** | 2 por día | 13:30 y 19:30 | Placa con el titular |

El clima y la farmacia van como **historia** a propósito: si fueran reels,
gastarían el cupo todos los días con lo mismo.

### El primer mes

**Semana 1 — existir.** Abrir Instagram y Facebook. Publicar clima y farmacia
todos los días sin falta: es lo que hace que alguien te empiece a mirar. Tres
o cuatro notas locales por día.

**Semana 2 — que nos encuentren.** Sumar la agenda del fin de semana como
historia el jueves. Etiquetar a los lugares (Teatro Municipal, Museo, el
Cerro). Escribirle a las instituciones que organizan cosas: el mensaje ya está
escrito en `ingesta/agenda.mjs`.

**Semana 3 — probar formatos.** Un reel de automovilismo y uno de agenda.
Mirar cuál funciona. Empezar la sección de tecnología.

**Semana 4 — medir y decidir.** Con números reales de Instagram, ver qué
sección rinde y ajustar los pesos en `ingesta/fuentes.mjs`.

### El tono

El mismo que en la web: informar, no gritar. Sin "IMPACTANTE", sin "MIRÁ LO
QUE PASÓ", sin cebar el clic. En un pueblo el que exagera se quema rápido.

### Lo que hay que decir siempre

En la bio de las dos cuentas, y en el pie de la web:

> Resumimos lo que publican los medios de Balcarce, siempre con el enlace a la
> nota original. Algunos textos y las voces de los videos se producen con
> inteligencia artificial, con revisión humana.

No es humildad: es lo que evita que el día que alguien lo descubra parezca que
lo estábamos escondiendo.

## 4. Lo que falta para publicar solo

Hoy las piezas se generan en la PC (`node reels/plan.mjs --generar`) y se
suben a mano. Para que salgan solas hace falta:

1. Instagram como **cuenta profesional**, vinculada a una **página** de
   Facebook (no un perfil personal).
2. Una app en Meta for Developers con los permisos `instagram_content_publish`
   y `pages_manage_posts`.
3. Meta revisa la app antes de darte esos permisos. Tarda, y es el motivo por
   el que conviene empezar publicando a mano: cuando la aprueben, ya vamos a
   saber qué formato funciona.
