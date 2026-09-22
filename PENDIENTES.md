# Pendientes — todo en un solo lugar

Antes esta lista estaba repartida entre `REDES.md`, `NOTAS.md`, `CLAUDE.md` y
`EMPEZAR-ACA.md`, cada uno con su propia versión, y se desactualizaban entre
sí. Ahora viven acá, por categoría. Los otros documentos explican **cómo**
funciona cada cosa; éste dice **qué falta**.

*Última revisión: 22/09/2026.*

## A. Redes y automatización

1. **Renovar el token de GitHub antes del 21/09/2027.** Lo usa cron-job.org
   para disparar el reloj. Sin token nuevo, las redes dejan de publicar solas
   sin ningún aviso salvo el mail de error de cron-job.org.
2. **Threads**: pide su propio token, distinto del de Facebook e Instagram.
3. **Historias y reels en Facebook, Threads.**
4. **La agenda de la semana en historia** sólo se arma en la PC, porque
   `panel/datos/agenda.json` no está en GitHub (está en `.gitignore` a
   propósito, son decisiones de la redacción).
5. Mirar cómo salieron las primeras tandas automáticas (voz, horarios,
   cantidad) y ajustar `redes/elegir.mjs` / `redes/piezas.mjs` según rinda.

## B. Biografías y hashtags

6. **Reescribir las biografías** de Instagram y Facebook: más cortas, centradas
   en qué es el medio y qué cubre (Balcarce, clima, farmacia, agenda,
   noticias). La mención a la IA se mantiene por transparencia pero en una
   línea, no como protagonista.
7. **La categoría de Instagram** sigue en "Blog personal" (no se ve en el
   perfil). Se cambia desde el celular a "Sitio web de noticias y medios de
   comunicación".
8. Sumar el enlace al sitio en la bio de Instagram (sólo se edita desde el
   celular), el botón de contacto, e historias destacadas fijas (farmacia,
   teléfonos, agenda).
9. **Hashtags**: hoy las piezas salen sin ninguno. Probar `#Balcarce` + uno de
   la sección en los reels durante dos semanas y comparar el alcance contra
   los que no los llevan, con números propios en vez de adivinar.

## C. SEO y posicionamiento (Google, redes, buscadores con IA)

Pedido de Hernán del 21/09: que la web esté bien estructurada y posicionada.
Lo que ya existe y no hay que repetir: direcciones con el titular adentro
(`web/lib/ruta.js`), `sitemap.xml`, `robots.txt`, `feed.xml`, enlace canónico
(`web/lib/sitio.js`), una tarjeta de imagen propia por nota
(`web/lib/tarjeta.js`), el dominio propio con `www` redirigido, y una prueba
que vigila el SEO en cada compilación (`web/scripts/revisar-seo.mjs`).

**Google**
10. Verificar `radarbalcarce.com` en Search Console y enviar el sitemap.
11. Datos estructurados (JSON-LD): `NewsArticle` en cada nota y
    `NewsMediaOrganization` en el sitio.
12. Google News y Discover: Publisher Center, imágenes de al menos 1200 px.
13. Páginas de confianza (E-E-A-T): quiénes somos, contacto, política editorial
    (qué se resume con IA, cómo se corrige un error), firma en cada nota.
14. Revisar que cada sección, tema y nota tenga título y descripción propios.
15. Medir con PageSpeed Insights (Core Web Vitals) y ajustar.
16. Pensar enlaces internos entre notas ahora que las etiquetas de temas están
    apagadas (`MOSTRAR_TEMAS`).
17. Bing Webmaster Tools y, si corresponde, Google Business Profile.

**Redes al compartir un enlace**
18. Revisar cómo se ve cada nota compartida (Depurador de Facebook) y
    completar Open Graph / Twitter Cards en todas las páginas.
19. Parámetros UTM en los enlaces publicados, para medir cuánta gente llega
    desde cada red con una analítica sin cookies.
20. Sumar el permiso `instagram_manage_insights` para leer qué rinde cada red.

**Buscadores con IA**
21. Decidir en `robots.txt` si se permite a los rastreadores de IA (GPTBot,
    ClaudeBot, PerplexityBot, Google-Extended): da visibilidad y citas, o
    protege el contenido — es una decisión editorial, no técnica.
22. Agregar `llms.txt` y un `sitemap-news.xml`.
23. Que cada nota abra con un resumen claro: fecha, lugar, fuente y autor
    visibles, que es lo que una IA cita.

## D. Editorial y contenido

24. **Notas más largas y propias**, con el texto completo de las fuentes en
    vez del resumen del feed. Empezar por Tecnología, Deportes y Economía.
25. Decidir si alguna sección más puede salir sola, con los números reales de
    lectura una vez que haya tráfico (ver `REDES.md` § "El primer mes").

## E. Técnico e infraestructura

26. Borrar el sitio duplicado en la cuenta vieja de Vercel
    (`radar-balcarce.vercel.app`).
27. Sacar el panel de la PC de Hernán, para que no dependa de que esté
    prendida (ver la idea más grande, más abajo).
28. Backup del contenido de `panel/datos/` (usuarios, decisiones editoriales,
    buzón): hoy vive sólo en esa PC, sin copia en ningún otro lado. Si se
    rompe el disco, se pierde el historial editorial completo.

## F. Ideas más grandes, para leer y pensar

Estas no son cambios de una línea: cambian cómo funciona algo, así que antes
de tocarlas conviene decidir con calma si valen la pena.

- **Sacar el panel de esta PC.** Hoy vive en la máquina de Hernán y depende de
  que esté prendida. Se podría mover a un servidor chico (Railway, Render, un
  droplet) para que corra siempre. Implica mover `panel/datos/` a algún lado
  con backup y revisar la seguridad de acceso (hoy usa Tailscale Funnel).
- **Un panel de salud del sistema.** Hoy, para saber si el reloj publicó bien,
  hay que mirar los logs de tres workflows distintos en GitHub Actions. Una
  página chica (o un mensaje automático) que resuma "esto se publicó, esto
  falló, esto está por publicarse" ahorraría tener que ir a buscarlo.
- **Avisos cuando algo se rompe de verdad.** Hoy, si el token de Meta vence o
  Gemini está caído muchas horas seguidas, nadie se entera hasta que alguien
  nota que Instagram dejó de publicar. Un aviso automático (mail o WhatsApp)
  ante una falla repetida ahorraría ese tiempo sin publicaciones.
- **Analítica propia, sin cookies** (por ejemplo Plausible o Umami), para
  decidir con números reales qué sección y qué red rinde, en vez de intuirlo.
  Hoy no hay ningún dato de tráfico.
- **Una vista previa de lo que el reloj va a publicar** en las próximas horas,
  antes de que salga. Serviría para frenar una pieza a mano si algo se ve mal,
  en vez de enterarse después de publicada.
- **Probar los workflows de GitHub Actions localmente** (con la herramienta
  `act`) antes de subirlos, para no descubrir un error de sintaxis recién
  cuando corre en producción.
- **Revisar la accesibilidad de la web** (contraste de colores, texto
  alternativo de las imágenes, navegación por teclado): no se auditó todavía.

## Ya resuelto (para no volver a proponerlo)

- Dominio propio conectado (`radarbalcarce.com`, 21/09).
- Redes con Meta: página, Instagram, la app, el usuario del sistema y el
  token sin vencimiento (21/09).
- Dos claves de Gemini separadas, una para redactar y otra para redes (21/09).
- El reloj publica solo en Facebook e Instagram, con un disparador externo
  confiable (21/09).
- Historias y reels en la página de Facebook, además de Instagram (21/09).
- Farmacia sin decir el horario en la pieza (eso es sólo para la web).
- El turno de farmacia cambia a las 8:30, no a las 9.
- Etiquetas de temas apagadas en la web (cargaban la página).
- Subtítulos sincronizados con la voz (antes iban varios segundos adelantados)
  y sin carteles de una sola palabra pintados enteros de color (22/09).
