# Decisiones

*Empezado el 15/10/2026. Es el registro vivo de **qué se decidió, por qué y quién**, con la fecha. Lo nuevo va
arriba. Una decisión no se borra: si se cambia, se anota la nueva y se dice cuál reemplaza. Lo que falta hacer
está en `PENDIENTES.md`; las reglas numeradas con su prueba, en `docs/10-REGLAS-Y-PRUEBAS.md`.*

## 15/10/2026

| Qué | Por qué | Quién |
|---|---|---|
| **El repositorio se mudó a `radarbalcarce/radar-balcarce`**, cuenta de `radarbalcarce@gmail.com`. `balcardev`, Andrés y Hernán quedan invitados como colaboradores | Que el medio tenga todo en una cuenta propia (antes el dueño era `balcar-dev`) | Andrés |
| **El reloj ahora es un Worker de Cloudflare, `radar-balcarce-reloj`** (`infra/reloj-cloudflare/`). Los tres trabajos de cron-job.org quedan **pausados, no borrados** (si el Worker falla, se pueden volver a prender) | cron-job.org se apagaba solo cuando un trabajo fallaba varias veces y era un servicio más que mirar | Andrés |
| **El repositorio sigue público** hasta que el robot deje de correr en GitHub Actions | Con el repositorio privado, los minutos de Actions costarían unos US$ 100 por mes, contra un tope total de US$ 25 por mes para todo el proyecto. Por eso lo que espera a una persona viaja cifrado | Andrés |
| **Todas las APIs y claves quedan en cuentas de `radarbalcarce`.** Las claves se vuelven a crear recién cuando se elijan los modelos | No crear y pegar claves dos veces; primero se prueba y se elige | Andrés |
| **Rediseño desde cero, sin nada decidido de antemano, una etapa por vez**: fuentes → entrada → duplicadas → clasificación → puntaje → contexto → redacción y verificación → fotos → publicación y redes → operación. En cada etapa se miran los criterios, se prueba y recién ahí se cambia | Muchas reglas se fueron sumando de a una y se contradicen; conviene repensarlas en orden y con pruebas | Andrés |
| **Usar los mejores modelos de Claude (Opus, Sonnet, Haiku) donde rindan**, tanto para trabajar en el proyecto como, si conviene, dentro del sistema. Cuál va en cada lugar se decide en cada etapa, con pruebas | Calidad; el costo se mide contra el tope mensual | Andrés |
| **Se acepta una pausa de algunas horas** (web, redes) durante la mudanza o el rediseño | Mejor parar un rato que apurar un cambio | Andrés |
| **Limpieza aprobada (primera tanda):** se borraron los workflows de prueba `prueba-gemini`, `prueba-estadisticas`, `sondear-busqueda` y `sondear-groq`, con sus scripts (`redes/sondear-busqueda.mjs`, `redes/sondear-groq.mjs`, `redes/sondear-tavily.mjs`, `reels/probar-gemini.mjs`) y los guiones de los videos de ejemplo de `docs/propuestas/material/videos/` | Eran sondeos de una sola vez; todo queda en el historial de git | Andrés |
| **Fuentes: todas las de Balcarce + las 50 mejores del país + las 10 mejores de Tandil y Mar del Plata. Nada más** | Hoy hay 254 feeds de 117 medios y muchos no aportan: 17 medios activos no sumaron ni una nota en seis semanas y 46 feeds repiten a otros (`docs/etapa-1-fuentes/ANALISIS.md`) | Andrés |
| **Rumbo del rediseño: mucho menos GitHub y mucho más Cloudflare; muchas menos pruebas (pocas, pero las que cuidan lo importante); buenas analíticas; y repensar todo el sistema "de la fuente a la nota"**, para después revisarlo junto, módulo por módulo, con cada tarea y área bien dividida | El robot depende de GitHub Actions (minutos, límites, repositorio que no puede ser privado) y hay 2.000 pruebas que cuidan detalles del código viejo. Mudar el robot a Cloudflare es lo que permite pasar el repositorio a privado | Andrés |
| **Se repiensan también los modelos de búsqueda, redacción, puntajes y semáforos** (análisis en `docs/etapa-2-5/` y `docs/etapa-6-9/`). Los límites legales (menores, víctimas, sepelios, presunción de inocencia) sólo se tocan con la decisión escrita de Hernán | Pedido de Andrés; lo legal no se negocia sin él | Andrés |
| **Modelos chicos (Haiku) para lo repetitivo y modelos fuertes sólo donde la calidad importa**; y trabajar con varios agentes en paralelo | Ahorrar tokens y tiempo | Andrés |
| **Texto único de las redes:** "Todo lo que pasa en Balcarce y la región, en un solo lugar. radarbalcarce.com" y el mismo logo en todas (sin "agenda", mientras la agenda falte mejorarla) | Que todas las redes digan lo mismo (`PERFILES.md`) | Andrés |
| **Las redes NO se recortan: el sitio recién arranca y hace falta más contenido, no menos.** Se deja la cantidad de publicaciones como está (unas 33 a 40 por día) y se rediseña más adelante, con datos. Reemplaza la propuesta de bajar a 10–12 por día de `docs/etapa-6-9/ANALISIS.md` | Con 53 seguidores en Facebook y 7 en Instagram, lo que se necesita es crecer y aprender qué funciona; recortar ahora sería achicar el aprendizaje | Andrés |
| **La documentación se ordenó**: las propuestas y listas del 8 y 9/10 (`PRIORIDADES`, `MEJORAS`, `PLAN-INTEGRAL`, `DONDE-SEGUIMOS`, `PENDIENTES-AL-9-10`, `RESUMEN-PARA-LA-PC`, `SEMAFORO-HOY`, `PANEL-NUEVO`, `registro/`) pasaron a `docs/historico/propuestas-2026-10/`; lo abierto quedó en `PENDIENTES.md`; las ideas del 8/10, en `IDEAS.md`; el mapa comercial, en `COMERCIAL.md`; y nace este documento | Había tres listas que se pisaban, con numeración distinta; ahora cada cosa vive en un solo lugar | Andrés |

## 12 y 13/10/2026

*Traídas de `docs/historico/propuestas-2026-10/RESUMEN-PARA-LA-PC.md` § 6.*

| Qué | Por qué | Quién |
|---|---|---|
| **Search Console y todo lo de SEO, después** de la renovación (estructura, mudanza a la cuenta propia y fuentes) | Primero que ande como se quiere | Hernán y Andrés |
| **Las redes no se difunden todavía**: lo que crece es orgánico. Se difunden cuando el proyecto esté en su versión 1.0 | No mostrarlo antes de que ande bien | Hernán y Andrés |
| **Juegos Bonaerenses: descartado** (no se pide más la lista de finalistas) | — | Hernán y Andrés |
| **Efemérides y feriados**: se arman solas los días 20 y ellos las miran; las de noviembre, después de la renovación. El adorno de una placa nunca se superpone a un texto | Pasó el 11/10 con "octubre" | Hernán y Andrés |
| **Farmacia con fuente propia**: bajar los datos, usarlos como fuente propia y cotejarlos con la página del Colegio (pendiente) | Si esa página se cae o cambia, no quedarse sin farmacia | Hernán y Andrés |
| **Avisos y resumen diario por mail** en vez de WhatsApp (pendiente elegir el servicio) | El WhatsApp gratis se quedó sin cupo cerca del 4/10 | Hernán y Andrés |
| **Notas propias de cada efeméride y cada feriado**, con plantilla y datos de las listas curadas, sin IA (13/10; la de "Un día como hoy" ya sale, regla 165) | Contenido propio que no inventa | Hernán y Andrés |
| **Video institucional de 15 s para la 1.0** (estilo de referencia guardado); **2 a 4 diseños de reels y web** para elegir (`docs/propuestas/DISENOS-A-ARMAR.md`). Ninguno se hace hasta terminar la renovación | No sumar complejidad antes | Hernán y Andrés |

## Antes del 12/10 (las que siguen valiendo y conviene tener a mano)

| Cuándo | Qué | Quién |
|---|---|---|
| 8/10 | Las efemérides salen salvo que Hernán diga que no (se sacan o se pide cambio desde la pestaña Fechas) | Hernán |
| 8/10 | El panel de la PC queda en desuso: el único panel es el del celular | Hernán y Andrés |
| 8/10 | El semáforo se mejoró con permiso (regla 118); la lista roja tiene huella en una prueba y no se toca sin preguntar | Hernán y Andrés |
| 27/09 | Lo de afuera necesita al menos dos medios (hoy los números por sección están en `ingesta/criterio.mjs`) | Hernán |

## Preguntas abiertas

### Para Hernán (tocan reglas que no se negocian o la línea editorial: no se aplican sin su sí por escrito)

1. **Semáforo: menores y víctimas.** La lista roja no se toca sin preguntar. Abierto: sumar edades y verbos ("violaron a una nena") para que lo frene también en las pistas, y si en Educación y Salud la palabra "niños" o "alumno" deja de poner amarillo cuando el modelo dice que no hay un menor identificable.
2. **Policiales de Balcarce**: aprobar por bloques desde el celular o soltar lo que cuentan dos medios o más (regla 96). Lo rojo no cambia.
3. **Nombrar menores en notas positivas** (un logro escolar o deportivo): choca con "nunca identificar a un menor". Mientras no diga que sí, sigue prohibido.
4. **Línea editorial (regla 22)**: el texto final de "centro y centro-derecha, tono neutral" (hay un borrador sin aplicar).
5. **Dólar**: ¿no entra nunca o queda amarillo (una persona lo puede publicar)? Hoy los documentos dicen las dos cosas.
6. **Opinión firmada**: ¿sí o no? Hoy el criterio dice "sin opinión" y el buzón admite opinión firmada.
7. **Salud en las redes**: ¿espera a una persona, como Política y Policiales?
8. **Música en los videos**: ¿sí o no, y cuál?
9. **Colores de Salud y Educación**, si se suman esas secciones.
10. **Recortar el prompt de redacción**: sólo con una prueba antes y después (hoy el nuevo todavía no mejora al actual).
11. También: cuántas secciones y en qué orden se suman; si ciencia, tecnología, salud y educación pasan con un solo medio cuando la fuente es oficial o especializada; qué redes se recortan y cuánto.

### Para los dos

- La firma de lo que escribe Claude y los nombres de "Quiénes somos".
- Qué medios argentinos cuentan para que una pista salga sola.
- Dónde se guarda el seguimiento comercial (privado) antes del primer mensaje a un comercio.
- El menú: maqueta primero, no se toca sin aprobar.
- Si Política y Policiales esperan a una persona también en la web.
- Si se retira del todo el panel de la PC.
- Cómo se publica en YouTube y TikTok, y si las piezas de deporte salen con voz (el cupo es de 10 audios por día).
- El archivo de notas: R2 por mes o D1, **antes del 2/12** (se llega a las 3.500 notas con página).
- Rastreadores de IA en `robots.txt`: permitirlos o bloquearlos.
