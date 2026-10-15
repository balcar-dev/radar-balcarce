# Propuesta: fotos de stock para que toda nota salga con foto

*15/10/2026. Para Hernán y Andrés. Lo que está hecho es el módulo `ingesta/foto-stock.mjs` y su
prueba (`pruebas/foto-stock.test.mjs`): **no está conectado a nada, el interruptor está apagado y el
flujo actual de fotos no cambió.** Los números salen de `docs/fotos/AUDITORIA-FOTOS.md`.*

## 1. La idea

El orden que se pidió, tal cual:

1. **La foto de la fuente**, como ahora (con crédito, sin marca de agua, guardada en el banco).
2. **Si no hay una que sirva, una foto de stock libre y relevante al tema**, con el epígrafe "Foto
   ilustrativa" y el crédito y la licencia.
3. **Recién al final, la placa de la sección** (lo que sale hoy cuando no hay foto).

El módulo es el paso 2. Busca en Wikimedia Commons (sin clave, sin costo) y, si alguna vez una
persona pega las claves, en Pexels, Unsplash y Pixabay; puntúa las candidatas; hace confirmar la
mejor a una IA barata; y devuelve la foto con su crédito. No guarda nada solo: la guarda el flujo de
siempre, achicada a 1.200 px, en el banco propio.

## 2. Qué hace el módulo, en concreto

- **Decide primero si la nota puede llevar stock** (`evaluarNota`, sin red) y con qué condiciones. Si no
  puede, no hace ni un pedido.
- **Arma la consulta con el tema, no con los nombres.** Una tabla de 63 temas (`TEMAS`: "tenis de
  mesa", "cementerio", "bolsa", "Congreso"…) reconoce el tema en el título (y, si no, en las etiquetas)
  y lo busca en castellano para Commons y en inglés para los otros. Las notas de Balcarce suman una
  consulta con el lugar ("cementerio Balcarce": en Commons hay fotos reales del Portal del Cementerio
  de Balcarce, la Plaza Libertad, la Iglesia San José). **Un nombre de persona nunca entra en la
  consulta** (hay una prueba).
- **Puntúa de 0 a 100** (`puntuarCandidata`): relevancia por palabras (hasta 60), tamaño (**mínimo
  1.200 px de ancho**, si no se descarta), orientación apaisada (la vertical se descarta), licencia y
  tipo de consulta. Descarta logos, mapas, dibujos, capturas y todo lo que diga "watermark",
  Shutterstock, Getty, etc. Mínimo para servir: 45 puntos.
- **La licencia se verifica en lo que devuelve la API.** En Commons sólo pasan CC0, CC BY, CC BY-SA y
  dominio público; se descarta NC/ND, "no libre" y cualquier restricción (marca registrada, derechos de
  la personalidad). Pexels, Unsplash y Pixabay traen su propia licencia gratuita.
- **Confirma con IA (paso opcional, `confirmarConIA`)**: Gemini con el modelo y la clave de
  clasificación de fotos que ya existen (`GEMINI_API_KEY_CLASIFICACION`) y, de respaldo, Groq. Le
  pregunta si ilustra el tema, si se ve una persona, si se ve un menor, si tiene marca o un cartel con
  un nombre propio legible, y si podría pasar por la foto del hecho. Sin respuesta completa, no se usa.
- **El epígrafe** es siempre "Foto ilustrativa. Foto: *autor* / *proveedor* (*licencia* en Commons)".
  Va dentro del campo `credito` del banco, así que la página, los posteos y la tarjeta de enlace lo
  muestran **sin tocar nada** (hoy muestran `credito`).
- **No repite la misma foto en varias notas** (`yaUsadasEnElBanco`).

Para ver qué haría con las notas reales, sin gastar nada ni escribir nada:

    node ingesta/foto-stock.mjs                  qué notas sin foto se podrían rescatar y con qué consulta (sin red)
    node ingesta/foto-stock.mjs --red            además busca en Commons (sin clave; no baja ninguna imagen)
    node ingesta/foto-stock.mjs --html           lo mismo y arma reels/salida/stock-candidatas.html: las candidatas a la vista

## 3. Reglas duras (ningún parámetro las apaga)

- **Policiales: nunca.** Ni stock ni foto de cualquier otro lado que no sea oficial.
- **Nunca nada que cuente un hecho**: choque, incendio, detención, operativo, robo, temporal, hallazgo,
  denuncia, marcha, represión… Una foto de stock podría hacerse pasar por la escena.
- **Nunca un lugar o un problema concreto del barrio** ("el tránsito en las calles 19 y 114 bis", "el
  estado del camino"): una foto de otra calle parecería ésa.
- **Menores y víctimas: nunca como tema. Si la nota toca a chicos** (escuela, deporte infantil o
  juvenil, "Sub-17"), **sólo una foto sin personas**, y confirmada por la IA. Un menor visible en la imagen
  la descarta siempre.
- **Política, y toda nota que nombre a una persona o a un cargo: sólo una foto sin personas**
  confirmada por la IA. Si la nota exige "sin personas" y la IA no está disponible, **no sale foto** (queda
  la placa).
- **Nunca marca de agua ni el nombre de otro medio** (filtro por texto y mirada de la IA).
- **Nunca sin "Foto ilustrativa" y el crédito.** Nunca una imagen generada por IA.
- **Las claves** (`PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY`) **las pega una persona** en
  GitHub Secrets o en el `.env`. El módulo sólo las lee; no las pide, no las escribe ni las muestra
  (hay una prueba que lo vigila).

## 4. Qué notas aplican y cuántas se rescatan

Sobre las 64 notas de los últimos 14 días que quedaron sin foto de verdad (de 590):

| | Notas |
|---|---|
| **No aplica** (Policiales 6, un hecho o un lugar concreto 5) | 11 |
| **Aplica** | 53 |
| de ellas, **Commons encuentra una foto del tema** | **37** |
| de ellas, sólo hay una genérica de la sección (Balcarce, "cultura") | 11 |
| de ellas, nada | 5 |

De las 37 con foto del tema, **24 exigen "sin personas"** (menores, deportistas, cargos, Política) y
las otras 13 admiten gente anónima. Por qué estaban sin foto:

| Motivo original | Sin foto | Aplica con foto del tema |
|---|---|---|
| Menor reconocible en la única foto (27) | 27 | 18 (casi todas sin personas) |
| La fuente no traía foto | 11 | 4 |
| Falló la IA (reintentable o agotada) | 12 | 9 |
| Marca de agua, logo o no ilustra | 8 | 6 |
| Policiales | 6 | 0 |

**Estimado:** de **88 % a algo entre 92 y 95 % de las notas con foto**. El tope realista es 94,6 %
(521 + 37 de 590) y baja si la IA rechaza algunas por no ilustrar bien; con la genérica de la sección
sumaría hasta 96 %, pero esa genérica es lo más flojo (ver "Qué decide Hernán"). **No se llega al
100 %**: Policiales (6), los hechos y los lugares concretos (5) y lo que no tenga candidata siguen con
placa, y así debe ser.

Son unas 2 o 3 notas por día: un gasto de IA insignificante (de 1 a 3 pedidos con una imagen por nota
rescatada) y nada de Commons.

**Cuenta honesta:** esto es lo que *encontró la búsqueda* por palabras; no vi las fotos (el navegador
de la herramienta no cargó las imágenes externas). Lo que dice la IA al confirmar puede bajar la cifra.
`node ingesta/foto-stock.mjs --html` arma la página con las candidatas para mirarlas con los ojos
**antes de prender nada**.

## 5. Cómo se integraría (no está hecho)

En `web/scripts/fotos-notas.mjs`, dentro de `elegirFotosNuevas`, en el lugar donde hoy se anota "sin
foto" (`if (!r.elegida) {…}`):

1. Si `fotoStockActiva()` y la nota **ya no tiene nada que reintentar** (no fue una falla de la IA que
   todavía puede salir bien: `sePuedeReintentar` dice que no, o ya se gastaron los intentos), se llama a
   `elegirFotoStock(nota, { excluir: yaUsadasEnElBanco(banco) })`.
2. Si devuelve `elegida`, se guarda igual que cualquier foto (`fotoParaGuardar` achica a 1.200 px, `fotos-notas/<id>.jpg`)
   y se anota `entradaDeBancoStock(...)` en el banco: `origen: "stock"`, `ilustrativa: true`, `proveedor`,
   `consulta`, `licencia`, `autor`, `imagenOriginal`, `enlace` y el `credito` que empieza con "Foto
   ilustrativa.". Si no, queda `intentado` con la razón, como hoy, y sale la placa.
3. Un tope bajo por corrida (3 notas de stock, no 10) y un reintento del paso 1 con las fuentes nuevas:
   si una nota con foto de stock gana una fuente con foto, la foto de la fuente **reemplaza** al stock
   (cambio chico en `sePuedeReintentar` para `origen: "stock"`).
4. `FOTO_STOCK_ACTIVA` como variable de GitHub (como `REDES_ACTIVAS`), pasada en `actualizar.yml`. Las
   claves opcionales, como Secrets.
5. **No cambia la web**: ya muestra `credito` entre la bajada y el cuerpo. Una mejora chica y opcional:
   que `fotoDeLaWeb` pase también `ilustrativa` para estilar distinto el epígrafe.
6. **Reglas y documentación**: la regla 174 en `docs/10-REGLAS-Y-PRUEBAS.md`, la § 2 de
   `CRITERIO-EDITORIAL.md` (que hoy pide "foto de stock o ilustración por defecto" y el código no hace),
   `docs/05-FOTOS.md` y la prueba "el módulo no está conectado" (`foto-stock.test.mjs`), que hay que
   cambiar **a propósito** cuando se conecte.

Orden de trabajo recomendado: (a) mirar `--html` y decidir; (b) arreglar de paso lo que no es stock
(ver más abajo); (c) conectar con el interruptor apagado; (d) prenderlo con el tope en 3 y revisar las
primeras 20 fotos a ojo; (e) recién después, claves opcionales.

## 6. Riesgos editoriales

1. **Una foto de stock en una nota de Balcarce puede parecer "la" foto.** Commons trae fotos reales de
   otros lugares (la búsqueda de ejemplo devolvió una farmacia de Mazatlán y una cancha de Puerto Rico
   para notas de Balcarce). Con "Foto ilustrativa" es honesto, pero una farmacia con cartel legible de
   otro país queda raro. Mitigación puesta: la IA rechaza carteles con nombre propio legible y fotos
   que "podrían pasar por la del hecho". Mitigación pendiente: mirar a ojo las primeras.
2. **Lectores y credibilidad.** Una nota de un tema serio con una imagen decorativa puede leerse como
   relleno. Por eso Policiales, hechos y lugares concretos quedan afuera.
3. **Menores.** Una foto de stock con chicos en una nota de escuela es lo que más hay que evitar: por
   eso esas notas sólo con foto sin personas y la IA como puerta (si falta, no sale).
4. **La IA puede equivocarse** (confirmar de más). Como las fotos de las fuentes: es la única defensa
   para marcas de agua que no se ven en el texto. Revisar a ojo cada tanto.
5. **Licencias.** CC BY y CC BY-SA obligan a nombrar autor y licencia (el epígrafe lo hace); en BY-SA
   el recorte/achicado es una adaptación y el aviso de licencia sigue siendo el crédito. Pexels,
   Unsplash y Pixabay no exigen crédito pero se da igual. Unsplash pide avisar cada descarga (el módulo lo
   hace). Un autor de Commons puede retirar la foto después; no vemos eso.
6. **Dependencia de Commons**: sin clave y gratis, pero de un tercero; si cae, las notas quedan con
   placa (el módulo nunca lanza).
7. **Una foto ya usada**: se evita repetirla entre notas, pero con pocas fotos buenas de un tema
   se podría ver igual en dos notas lejanas.

## 7. Qué decide Hernán

1. **¿Se prende?** (Mi recomendación: sí, después de mirar `--html`, con tope de 3 por corrida.)
2. **¿Notas de Balcarce con stock?** Es donde más se rescata (10 de 20 sin foto) y donde más riesgo
   hay de que parezca "la" foto. Recomiendo **sí sólo con foto del tema** (cementerio, útiles escolares,
   Iglesia…), con la IA obligatoria. Sin esa regla, quedarían 6 notas más sólo con una "foto genérica de
   Balcarce".
3. **¿La foto genérica de la sección** (Plaza de Balcarce para cualquier nota local, un "escenario" para
   cualquier nota de cultura) **cuando no hay una del tema?** Recomiendo **no** (hoy está apagada por
   defecto en el código, `TIPOS_POR_DEFECTO`): son las más flojas y suman 11 notas.
4. **¿La IA confirma siempre** (más cupo, más seguridad) **o sólo cuando la nota exige "sin personas"?**
   Recomiendo siempre.
5. **¿Deportistas anónimos permitidos?** (`personasAnonimas`: una foto de stock con gente corriendo en una
   nota de atletismo.) Recomiendo **no** por ahora: son notas que casi siempre tocan a chicos.
6. **¿Las fotos de stock van también a Instagram y a la tarjeta de Facebook/WhatsApp?** Hoy esas
   piezas usan la foto del banco. Recomiendo sí en la tarjeta del enlace y **no** en Instagram (el
   espejo de un posteo con foto ilustrativa de otro lado); el epígrafe igual iría en el texto.
7. **¿Se pegan claves de Pexels/Unsplash/Pixabay?** (Las pega una persona, nunca yo.) Con sólo Commons
   la búsqueda funciona, pero trae muchas fotos de lugares de otros países; con Pexels/Unsplash hay más
   fotos "de banco" genéricas y mejor relevancia en tecnología, economía y agro. Se puede decidir después.
8. **¿Se avisa en la web que una foto es ilustrativa más allá del epígrafe?** (Hoy, sólo "Foto
   ilustrativa. Foto: …" debajo.)

## 8. Cosas que encontré y conviene arreglar **antes** (no son stock)

- **Las notas con más de 8 fuentes con foto se quedan sin foto** (0 de 3 en el banco): `ingesta/fotos.mjs`
  rotula las fotos sólo con A a H. Arreglo chico; rescata a las notas más cubiertas, que son las más
  importantes. Detalle en `AUDITORIA-FOTOS.md`.
- **12 notas sin foto son fallas de la IA** (`413`/`429` de Groq). Si el cupo falla, mejor que salga la
  foto de la fuente a que entre un stock.
- El 42 % de las notas sin foto es por menores en la única foto disponible: ahí el stock sólo ayuda con
  una foto **sin personas**, y por eso es lo más delicado de la propuesta.

## 9. Archivos

| Archivo | Qué es |
|---|---|
| `ingesta/foto-stock.mjs` | El módulo (sin dependencias, sólo `fetch`). Apagado. También corre solo como ensayo (`node ingesta/foto-stock.mjs [--red] [--html]`) |
| `pruebas/foto-stock.test.mjs` | 36 pruebas sin red: reglas duras, consultas sin nombres, puntaje, los cuatro proveedores simulados, la confirmación con IA, el crédito, que no está conectado y que no lleva claves |
| `docs/fotos/AUDITORIA-FOTOS.md` | La auditoría (cuántas sin foto, por qué, por sección) |
| `reels/salida/stock-candidatas.html` | Las candidatas para mirar (sólo en esta PC; no se sube) |
