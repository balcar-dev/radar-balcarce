# Diseños a armar más adelante (pedido del 13/10/2026)

*No se implementa nada ahora. Es la guía para, cuando terminen de actualizar toda la web, armar entre 2 y 4 diseños distintos entre sí, mostrarlos lado a lado y elegir.*

## Qué pidieron
- Buscar diseños que funcionan en animaciones y reels, y todo lo visual que hoy tiene un medio digital moderno.
- Mejorar cómo se ve la web, **sin perder lo rápida y fluida que es**.
- Armar entre 2 y 4 propuestas distintas entre sí. No tocar el sitio hasta que elijan.

## Lo que encontré (fuentes generales de marketing, no estudios de medios: tomarlo como criterio, no como dato)
**Reels y animación**
- La tipografía en movimiento es la tendencia más repetida de 2026: el texto es la animación, no un subtítulo pegado sobre el video. Sirve mucho porque buena parte de la gente mira sin sonido.
- Cortes cada 2 a 3 segundos, vertical 9:16 desde el diseño (no un horizontal recortado).
- Se premia lo auténtico: grano, bordes de papel, cortes bruscos. Lo demasiado pulido pierde.
- Lo que se comparte: emoción, actualidad, sorpresa y "me hace quedar informado". En un medio local, el valor es lo cercano.

**Web**
- La velocidad manda el diseño: tipografía fuerte en vez de imágenes pesadas, imágenes optimizadas, carga diferida.
- Jerarquía clara: nota principal grande, notas relacionadas agrupadas, grilla de varias columnas que pasa a una en el celular.
- Tipografías distintas para títulos y para el cuerpo.
- Varias fuentes advierten contra perseguir todas las modas: elegir pocas y hacerlas bien.

Fuentes: [Linearity, tipografía cinética](https://www.linearity.io/blog/kinetic-typography/), [LottieFiles](https://lottiefiles.com/blog/design-inspiration/the-key-advantages-of-kinetic-typography-in-design.md), [IONOS, tendencias web 2026](https://www.ionos.com/digitalguide/websites/web-design/webdesign-trends.md), [Bulletlink, diseño de páginas de noticias](https://bulletlink.com/essential-elements-for-effective-news-page-design.htm).

## Propuestas de diseño (a desarrollar, 2 a 4 distintas)
**Reels**
1. **Titular en movimiento:** el titular entra palabra por palabra al ritmo de la voz, fondo de color de la sección, corte cada 2 a 3 segundos.
2. **Foto de pueblo:** foto real de la nota a pantalla completa con movimiento lento, grano suave y el titular abajo. Más humano y local.
3. **Dato vivo:** clima, dólar y tablas con números que se animan (cuentan hasta el valor). Para las piezas fijas.
4. **Placa de diario:** tipografía de diario y bordes de papel, más sobria; para efemérides y feriados.

**Web (portada)**
- **A. Diario clásico:** nota principal grande y columnas, mucha jerarquía tipográfica.
- **B. Tarjetas para celular:** feed vertical de tarjetas con foto, pensado para quien llega desde Facebook (hoy es el 88 % de las visitas).
- **C. "Hoy en Balcarce":** arriba una franja con clima, farmacia de turno y dólar; debajo las notas.
- **D. Oscura de alto contraste:** modo noche cuidado, tipografía grande.

## Reglas para cualquiera de los diseños
- Tiene que seguir siendo **HTML estático, liviano y rápido** (hoy: carga ~1 s, los tres indicadores de velocidad en verde). Se mide antes y después con el panel de Cloudflare y PageSpeed.
- No pasar del límite de **20.000 archivos** de Cloudflare Pages gratis.
- Respetar la paleta y el logo azul, la regla de no pegar marcas de otros medios sobre imágenes y la de la voz (cupo de 10 audios por día).
- El motor (`ingesta/`, `redes/`, `panel/`) sigue sin dependencias; lo nuevo va en `web/` y `reels/`.

## Herramientas que podrían ayudar
- **Remotion** (videos programados con React): sirve para videos automáticos con datos, pero pide licencia para empresas y un navegador por detrás. Hoy ya hacemos las escenas con SVG, resvg y ffmpeg, así que sólo se justifica si se quieren animaciones mucho más complejas.
- **Lottie / Rive**: animaciones prediseñadas (íconos, acentos). Lottie se puede usar dentro de Remotion.
- **Lienzo "Design" de Claude**: armar los 2 a 4 diseños como pantallas lado a lado para elegir, sin tocar el sitio.
- **PageSpeed / Lighthouse y Cloudflare Web Analytics**: para comprobar que el rediseño no hace más lento el sitio.
- **Figma**: sólo si alguna vez los diseña una persona; para nuestro flujo no hace falta.

## Decisión del 13/10 (después de la investigación)
- El rediseño se hace **una vez pasada la 1.0**, no antes.
- Si algo hay que cambiar para que se vea mejor, se hace, pero **sin sumar mucha complejidad**: nada que complique el sitio, el motor o el mantenimiento. Mejor pocos cambios bien hechos que una herramienta nueva.
