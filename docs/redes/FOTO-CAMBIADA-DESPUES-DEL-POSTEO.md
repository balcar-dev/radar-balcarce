# Cuando la foto de una nota cambia después de salir en Facebook (17/10/2026)

*Caso real que trajo Hernán el 17/10: «Santiago Gilligan busca sumar sus primeros minutos en la Serie A de Italia» (`19nga6r`, de El Diario Balcarce). Salió en Facebook con la ilustración de IA y, tres horas
después, El Diario subió su foto real, el banco la puso en la nota y Facebook se quedó con la vieja. Regla 283.*

## 1. Qué pasó, hora por hora (UTC; Balcarce es UTC-3)

| Hora | Qué |
|---|---|
| 12:46 | El Diario Balcarce publica la nota (la `fecha` de entonces: 17/10 12:46:02). |
| 13:01 | La ingesta la ve por primera vez (`visto`). Sin foto. |
| 14:22 | El robot le genera la ilustración de IA (`fotos-ia.json`). |
| 14:35 | Sale en Facebook (`1254237411116171_122112943731495512`): foto del posteo = la tarjeta con la ilustración. A los 1 h 49 min de la `fecha` de la nota. |
| 17:02 | El Diario sube la foto real; el banco de fotos la elige (`banco-fotos.json`) y reemplaza a la ilustración en la web. |

**"Salió ~23 horas después de que apareció": no fue así, es lo esperado.** Al publicarse (14:35) la nota tenía 1 h 49 min según su fecha (la ventana de Facebook es de 15 minutos a 8 horas) y 1 h 34 min desde
que el robot la vio. Lo que se ve ahora es otra cosa: entre las 14:32 y las 17:03 la `fecha` de la nota pasó de 17/10 12:46 a **16/10 12:00** (la fuente volvió a traerla con una fecha de la víspera y la regla "una
nota tiene una sola fecha, que sólo envejece" se quedó con la más vieja), y desde ahí parece una nota de hace 26 horas. Que una fuente reescriba la fecha de una nota que ya había salido es de la ingesta
(`fechaReal`): no lo toqué. No hubo demora de selección ni del repaso.

## 2. Qué se puede y qué no se puede hacer con un posteo ya publicado

- **El posteo de una nota sale como FOTO** (`publicarFotoEnFacebook`, `POST /<página>/photos` con `url` de la tarjeta de la nota). **Facebook baja la imagen en ese momento y la guarda**: el posteo es una foto de la
  página (aparece en su pestaña "Fotos"). **No hay llamada para cambiar la imagen de un posteo ya publicado** (sí el texto); cambiar la tarjeta de la nota en la web no la toca.
- **La vista previa de un enlace** (la tarjeta que Facebook arma con el `og:image` de la página) sí es un caché que se puede refrescar: `POST /?id=<url>&scrape=true`, el "Sharing Debugger" por API
  (<https://developers.facebook.com/docs/graph-api/reference/url/>, leído el 17/10: "cualquier token sirve", devuelve `{"success": true}`; **no dice qué pasa con los posteos que ya usaron esa vista previa**:
  según guías de terceros, un posteo ya publicado conserva la vieja hasta que se usa "Actualizar el adjunto" a mano en las herramientas de publicación de la página; no pude confirmarlo con una fuente de Meta). Esto
  sólo aplica a los posteos que salieron **como enlace**, el respaldo cuando la foto falló tres veces (`comoSaleEnFacebook`).

**Conclusión honesta:** para los posteos con foto (los 106 del libro, salvo casos raros) **releer la página no cambia nada**. Lo hice igual porque se pidió y es barato, pero hay que esperar el efecto cero en casi
todos los casos y no contarlo como solución.

## 3. Lo que se implementó

- `redes/foto-cambiada.mjs` (función pura): `fotosCambiadasDespuesDelPosteo` compara la foto que hoy muestra la web (manual o del banco; si no, la ilustración: misma prioridad que `conFotosDelBanco`) contra el `cuando`
  del posteo del libro; si la foto llegó **después**, y el posteo tiene menos de **48 horas**, y para ese cambio no se pidió ya la relectura, la devuelve.
- `redes/meta.mjs` → `releerEnlace({ enlace })`: `POST https://graph.facebook.com/v23.0/` con `id=<enlace de la nota, el limpio>` y `scrape=true`, con el token de la página en el encabezado, como el resto.
- `redes/publicar.mjs --facebook`: antes de elegir qué publicar, pide la relectura de esos posteos **una vez por cambio** (`libro.facebook[id].relectura = { cuando, deLaFoto, ok }`; si falla, queda anotado el error y no se
  insiste cada media hora). Con `REDES_ACTIVAS` apagado sólo lo cuenta. No toca `facebook` ni `instagramFeed`: el posteo no se repite. Desde ahora el libro también anota `como` ('foto' o 'enlace') y `fotoAlPublicar`.
- `ARCHIVOS_QUE_LEE` suma `banco-fotos.json`, `fotos-manuales.json` y `fotos-ia.json`. **Si el Worker de tareas de Cloudflare baja los archivos de una lista propia** (`infra/tareas-cloudflare/tareas.mjs`), esa lista
  tiene que sumar los tres; sin ellos simplemente no hay relecturas (no rompe nada).
- Pruebas: `pruebas/foto-cambiada.test.mjs`, con el caso real grabado (tiempos de `redes.json`, `fotos-ia.json` y `banco-fotos.json`) y un Meta de mentira.

## 4. Cuánto pasa (medido en el libro, 21/09 al 17/10)

De los 106 posteos de Facebook: **56** salieron con la foto real ya en el banco, **1** con una ilustración de IA y **49** sin foto (con la tarjeta de siempre, tras esperar `horasEsperandoFoto` = 3 horas desde la fecha de la nota).
**11** (10 %) recibieron una foto real después: 10 de los 49 sin foto (20 %) y el de la ilustración. La foto real llegó, contando desde que el robot vio la nota, a las **1, 1,1, 1,5, 4, 6,7, 9, 11,3, 12,1, 26,6, 49 y 62 horas**
(mediana: 9 horas). Esperar a la foto real **no se puede** sin perder la actualidad: la nota deja de salir a las 8 horas.

## 5. Alternativas (para decidir)

| Opción | Qué hace | Costo / problema |
|---|---|---|
| **A. Dejarlo como está** | Un posteo con la ilustración o la tarjeta se queda así; la web sí muestra la foto real | El caso de Hernán se repite en ~1 de cada 10 posteos; el posteo viejo queda con una imagen genérica |
| **B. Esperar a la foto definitiva** (implementada, **apagada**: `FACEBOOK.horasEsperandoFotoReal` = 0) | Una nota con sólo una ilustración de IA no sale en Facebook hasta tener la foto real o hasta cumplir N horas desde que salió en la web | Con 3 horas **no hubiera salvado este caso** (la foto llegó a las 4). Sólo ayuda a los que llegan en la primera hora u hora y media (3 de 11). Cuanto más espera, más vieja sale la nota. Lo urgente no espera (lo marcado por una persona nunca espera) |
| **C. Que la ilustración sea buena** | No hay cambio de código: la ilustración de IA es la imagen de toda la nota hasta que llegue la real | Ya es la regla 185 |
| **D. Corregir el posteo a mano** | Borrar y volver a publicar desde el celular cuando llegue la foto | Rompe "no repetir posteos"; no se automatiza |
| **E. Dejar un comentario con la foto real** | El robot comenta en el posteo la foto real con el crédito | Cuenta como actividad que no pedimos; no escrito |

**Recomendación:** A (aceptar), con B en 2 horas como mínimo si Hernán quiere reducirlo y acepta salir un poco más tarde con las ilustraciones. Pregunta abajo.

## 6. Pregunta para Hernán

**¿Esperamos a la foto real antes de publicar una nota que sólo tiene ilustración de IA?** Se prende con un número (`FACEBOOK.horasEsperandoFotoReal`): 0 = como hoy, 2 o 3 = espera hasta 2 o 3 horas desde que la
nota salió en la web y después sale con la ilustración. Costo: esas notas salen 2 o 3 horas más tarde. Beneficio: 3 de cada 11 casos se evitan. Mi voto: dejarlo apagado y mirar de nuevo en 15 días con más posteos hechos con ilustración (hoy
hay 1 sola muestra: la ilustración automática recién empezó).
