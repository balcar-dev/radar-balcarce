# Modelos de decisión para Radar Balcarce: qué se probó y qué hacer

*10–11/10/2026. Lo armó Claude a pedido de Andrés. Todo lo probado está en `pruebas-modelos/` del repositorio de radarbalcarce.com; no se tocó nada de producción.*

## En 30 segundos

1. **Seleccionar notas (la "ficha" de hoy):** sí conviene pasarlo a un modelo de decisión. **Mercury Decide** (`inception/mercury-decide`) decide casi igual que Gemini (94% de acuerdo en publicar), no descartó nada de Balcarce que importe, y cuesta unos **US$ 0,9 por mes** contra ~US$ 4 de Gemini mandando 12 notas por pedido. Además da la probabilidad de cada respuesta, y eso permite mandar al celular sólo lo dudoso.
2. **Detectar la misma noticia en varios medios (duplicadas):** también sirve. Todos los modelos probados unieron bien los grupos; cuesta centavos.
3. **Escribir la nota (redacción):** **no se probó.** Con estos datos no se puede decir si conviene cambiar a Gemini por otro modelo. Los modelos de decisión no escriben texto.
4. **Feeds:** esta prueba no mide qué feeds conviene leer. Eso sigue como en el documento "módulo 1: fuentes y feeds". Lo que sí cambia con un modelo barato es que se puede dejar entrar todo y clasificar después.
5. **No se saca ninguna regla escrita a mano** (semáforo, "en vivo", cotización del dólar, medios mínimos, cupos). El modelo reemplaza sólo la ficha de `ingesta/lectura-ia.mjs`.

## Dos palabras que se usaron

- **Par:** dos notas puestas lado a lado, y la pregunta es "¿cuentan exactamente el mismo hecho?". Sirve para no publicar dos veces la misma noticia contada por dos medios. Hoy lo hace `agruparRepetidas`.
- **"12 por pedido":** en vez de mandar una nota por vez, se mandan 12 juntas. Cada pedido incluye siempre las instrucciones y el perfil de Balcarce (~90% del texto); mandando 12 notas ese texto se paga una vez cada 12. La lectura actual ya usa 12 (`notasPorPedido`). Con pares, igual: 12 pares por pedido.
- **Token:** la unidad en que los modelos cuentan el texto (3 o 4 letras). Se cobra por millón de tokens.

## Resultados

Muestra: 200 notas crudas de 208 feeds (con 20 de lo que no debería salir). No hay "verdad": se compara contra Gemini Flash-Lite, que es lo que usa hoy el sistema, y se revisan las diferencias a mano.

### Seleccionar (publicar o no)

| Modelo | Acuerdo en publicar | Acuerdo en sección | Notas de Balcarce descartadas | Costo por mes* |
|---|---|---|---|---|
| **Mercury Decide**, una nota por pedido | 94% | 79% | 0 | ~US$ 0,9 (estimado) |
| Mercury Decide, 12 por pedido | 89% | 76% | — | US$ 0,15 (pierde precisión) |
| **Jev 1.13**, 12 por pedido | 93% | 79% | 1 (pádel) | US$ 1,08 |
| Perplexity decider | 86% | 74% | 0 | ~US$ 2,7 (publica de más) |
| Microsoft Decision 1 | 82% | 69% | 1 (Fiesta del Postre) | ~US$ 2,2 (publica de más) |
| OpenAI gpt-6-luna | 91% | 77% | 2 (gimnastas) | ~US$ 5,8 (y se negó a contestar 3 notas) |
| Gemini Flash-Lite (hoy) | referencia | referencia | 0 | ~US$ 4 con 12 por pedido |

\*900 notas por día durante 30 días. Medido con crédito real salvo donde dice estimado.

**El ruido** (horóscopo, loterías, policiales de afuera, extranjero puro) lo dejaron afuera todos. Un error compartido por todos, Gemini incluido: publicar "¡EN VIVO! minuto a minuto"; hoy lo frena una regla escrita a mano.

**Las probabilidades sirven para marcar lo dudoso.** Con Mercury, las notas de zona gris (probabilidad de publicar entre 0,2 y 0,8) son 14 de 200 y discrepan con Gemini en el 21% de los casos, contra 5% en las seguras. Con Jev la zona gris es de 73 notas (demasiadas para mandar al celular).

### Duplicadas (62 pares: 21 del mismo hecho, 41 no)

| Modelo | Aciertos | Error grave (junta hechos distintos) | Costo por 1.000 pares |
|---|---|---|---|
| Gemini Flash-Lite | 97% | 1 | US$ 0,14 |
| Mercury Decide (1 o 12 por pedido) | 95% | 1 | US$ 0,004–0,008 |
| Microsoft / Jev / Perplexity | 94–97% | 1–2 | US$ 0,008–0,05 |
| OpenAI | 89–92% | 3–5 (y no vio 3 duplicadas) | US$ 0,046 |

Las etiquetas las puso Claude leyendo cada par: 2 son discutibles (`dudoso: true` en `pares-200.json`). Un grupo de 5 notas del mismo hecho (la nueva fecha de la Fiesta del Postre) lo unieron bien los seis modelos.

## Qué hacer

**Hacer ya (poco riesgo):**
1. Reemplazar la ficha (`leerGrupo` en `ingesta/lectura-ia.mjs`) por Mercury Decide (`inception/mercury-decide`, variante paga) pidiendo sección, interés para Balcarce y publicar/no. Dejar `aplicarFichas` y todas las reglas tal cual: sigue valiendo que la IA **sólo puede endurecer**.
2. Usar la probabilidad de "publicar": arriba de 0,8 sigue sola; entre 0,2 y 0,8 espera en el celular; abajo de 0,2 se descarta. (Umbrales sacados de esta muestra; hay que ajustarlos con datos de unos días.)
3. Dejar a Gemini como respaldo si Mercury falla, igual que hoy con Groq.

**Hacer después de medir más:**
4. Duplicadas con un decisor (pares de a 12) en lugar de `agruparRepetidas`.
5. Probar 12 notas por pedido con Jev, que no perdió precisión.

**No decidir todavía:**
6. Cambiar el modelo que escribe las notas. Falta una prueba de redacción.

## Lo que no se probó

- Redacción de notas (título, bajada, cuerpo).
- Otro día u otra semana: la muestra es de un solo día.
- Pares que no comparten palabras (mismo hecho con otro título).
- Mercury en producción: la variante `:free` tiene tope diario; usar la paga.
- Cuántas notas buenas descarta Mercury en el uso real (en la muestra: 0 de Balcarce).

## Detalles técnicos para quien lo implemente

- **Endpoint:** `POST https://openrouter.ai/api/alpha/decisions` con `Authorization: Bearer <clave>`. Cuerpo: `{ model, state, questions }`. `state` es el texto o los datos de la nota; `questions` es un objeto con una pregunta por clave.
- **Tipos de pregunta:** `choice` (elige una opción de `criteria`, devuelve `choice`, `probabilities` y `confidence`); `noul` (sí/no, devuelve un número entre 0 y 1: la probabilidad de "sí"); `score`.
- **Respuesta:** `{ answers, usage: { input_tokens, output_tokens, cost }, model }`. La documentación dice `inputTokens`, pero la API real manda `input_tokens`.
- **Varias notas en un pedido:** se hace una pregunta por nota (`n1_seccion`, `n1_publicar`…). Ejemplo en `clasificarLoteConDecisiones` de `pruebas-modelos/probar.mjs`. Con Mercury baja la precisión; con Jev no.
- **Errores vistos:** OpenAI contestó 502 "refused to answer question" en 3 de 200 notas. Los modelos `:free` comparten un tope diario (50 pedidos sin crédito; 1.000 con crédito).
- **Texto fijo:** va en `state` (instrucciones + `ingesta/perfil-balcarce.md`). Es ~90% del costo: achicarlo baja el costo casi proporcionalmente.
- **Clave:** variable de entorno `OPENROUTER_API_KEY`; nunca en un archivo ni en el repositorio. La que se usó para la prueba se pegó en un chat: **revocarla y crear otra.**

## Cómo repetir la prueba

Desde la carpeta del repositorio, con `OPENROUTER_API_KEY` definida:

```
node pruebas-modelos/bajar-crudas.mjs
node pruebas-modelos/probar.mjs --modelo=inception/mercury-decide --muestra=muestra-200.json
node pruebas-modelos/probar.mjs --modelo=google/gemini-3.1-flash-lite --muestra=muestra-200.json
node pruebas-modelos/comparar.mjs --muestra=muestra-200.json --referencia=google/gemini-3.1-flash-lite
```

Para duplicadas: agregar `--pares=pares-200.json --solo-pares` (y `--lote=12`), y comparar con `comparar.mjs --muestra=muestra-200.json --pares=pares-200.json`. Los resultados completos están en `comparacion-200.md` y `comparacion-pares.md`.
