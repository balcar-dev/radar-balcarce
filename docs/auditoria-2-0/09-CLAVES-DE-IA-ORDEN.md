# Las claves de IA: cómo están y cómo ordenarlas

*17/10/2026. Revisado en Google AI Studio con la sesión de `radarbalcarce@gmail.com` (sólo mirando: no se copió ni se
cambió nada) y con la lista de secretos de GitHub (sólo nombres y fechas; los valores no se pueden ver).*

## Cómo está hoy

**En la cuenta de Google `radarbalcarce@gmail.com` hay seis proyectos:**

| Proyecto | ¿Es de Radar? | Facturación | ¿Aparece en AI Studio? |
|---|---|---|---|
| Default Gemini Project (`gen-lang-client-0957258153`) | No se sabe para qué se creó | **Sí, Nivel 1 pago** ("My Billing Account") | Sí: tiene **una** clave, creada el **2/10/2026**, que **no está cargada en GitHub** |
| RadarGratis (`…0871841619`) | Sí (redacción, gratis) | No | No (no está importado: sus claves no se ven) |
| RadarBalcarce (`…0749672113`) | Sí (voces) | ? | No (no está importado) |
| LibrosClasicos (`…0540396560`) | **No** (otro proyecto) | ? | No |
| Plantas (dos: `…0759315682` y `…0279384394`) | **No** (otro proyecto) | ? | No |

**En GitHub hay cinco claves de IA:** `GEMINI_API_KEY_REDACCION` (cargada el 29/09), `GEMINI_API_KEY_REDES` (29/09),
`GEMINI_API_KEY_CLASIFICACION` (28/09), `GROQ_API_KEY` (28/09) y `TAVILY_API_KEY` (3/10). Las tres de Gemini se cargaron
**antes** de que existiera la clave paga del 2/10, así que ninguna es esa: salen de RadarGratis, RadarBalcarce u otro
proyecto. Según `CLAUDE.md`, desde el 29/09 las cuatro funcionan en el plan gratis.

**Lo que no está bien:**
1. **La facturación (los US$ 5) está en un proyecto que Radar no usa.** El "Default Gemini Project" tiene el Nivel 1 pago
   y una clave del 2/10 que no está en ningún lado. Las voces, en cambio, viven en el proyecto de `GEMINI_API_KEY_REDES` (las
   dos voces propias quedan atadas a ese proyecto: si la clave cambia de proyecto, hay que crearlas de nuevo).
2. **Hay proyectos de otras cosas** (LibrosClasicos, Plantas) mezclados en la cuenta del medio.
3. **Los proyectos de Radar no están importados en AI Studio**, así que no se ve qué claves tienen, cuánto gastan ni
   cuándo se crearon.
4. **No se sabe de qué proyecto es cada clave de GitHub.**

## Cómo ordenarlo (lo hace una persona, con Claude al lado si quiere)

Son cambios de la cuenta y de la facturación: los hace Hernán o Andrés. Claude puede guiar paso a paso en el Chrome.

1. **Importar los dos proyectos de Radar en AI Studio** (Claves de API → "Importar proyectos" → marcar RadarGratis y
   RadarBalcarce). Así se ven sus claves y su uso. No cambia nada de lo que anda.
2. **Ver de qué proyecto es cada clave de GitHub**: en cada proyecto, AI Studio muestra los últimos cuatro caracteres de sus
   claves; se comparan con un pedido de prueba de cada secreto (Claude lo puede hacer con un workflow que sólo dice "anda" o
   "no anda" y a qué proyecto pertenece, sin mostrar la clave).
3. **Dejar sólo dos proyectos para Radar:**
   - **Radar gratis** (hoy RadarGratis): redacción y clasificación, **sin facturación** (así nunca cobra).
   - **Radar voces** (hoy RadarBalcarce, donde viven las voces): **con facturación y un tope de US$ 5 por mes**. Es el
     único que puede cobrar.
4. **Pasar la facturación del "Default Gemini Project" a RadarBalcarce** (o sacársela), y **borrar la clave del 2/10** que
   no usa nadie, para que no quede una clave paga suelta.
5. **Mover LibrosClasicos y Plantas a otra cuenta de Google** (la personal o la de BalcarDev), para que la cuenta del medio
   tenga sólo lo del medio.
6. Si al ordenar cambia la clave de las voces de proyecto: correr "Crear voces" en modo `recrear` (las voces nuevas
   tienen que sonar igual; `docs/11-OPERACION.md`).
7. Anotar en `docs/08-INFRAESTRUCTURA.md` qué proyecto es cada clave (sin la clave).

**Groq y Tavily** son de otras empresas: revisar en console.groq.com y en tavily.com que estén a nombre de
`radarbalcarce@gmail.com` y no de una cuenta personal.
