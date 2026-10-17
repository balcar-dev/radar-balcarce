# Las pruebas de modelos de IA (10 al 16/10/2026), en una página

*17/10/2026. Resumen de lo que había en `pruebas-modelos/`, la carpeta de ensayos con modelos de OpenRouter que armaron
Andrés y Claude del 10 al 16/10. La carpeta se borró en la limpieza final (121 archivos, 8,6 MB, casi todo resultados en
JSON; nada de producción la usaba). Está entera en el historial de git: se busca el commit «Limpieza final (3)» del 17/10
(`git log --oneline -- pruebas-modelos`) y se la trae del anterior (`git checkout <ese commit>~1 -- pruebas-modelos`). Lo que se
decidió con esto y lo que se recomienda para Radar 2.0 está en `docs/auditoria-2-0/04-IA-Y-MODELOS.md`.*

## Seleccionar notas (la ficha de la lectura con IA)

Muestra: 200 notas crudas de 208 feeds (20 de lo que no debería salir), contra Gemini Flash-Lite, que es lo que se usa.

| Modelo | Acuerdo en publicar | Acuerdo en sección | De Balcarce que descartó | Costo por mes (900 notas/día) |
|---|---|---|---|---|
| **Mercury Decide**, una nota por pedido | 94 % | 79 % | 0 | ~US$ 0,9 |
| Mercury Decide, 12 por pedido | 89 % | 76 % | — | US$ 0,15 |
| **Jev 1.13**, 12 por pedido | 93 % | 79 % | 1 | US$ 1,08 |
| Perplexity decider | 86 % | 74 % | 0 | ~US$ 2,7 (publica de más) |
| Microsoft Decision 1 | 82 % | 69 % | 1 | ~US$ 2,2 (publica de más) |
| OpenAI gpt-6-luna | 91 % | 77 % | 2 | ~US$ 5,8 (y no contestó 3) |

El ruido (horóscopo, loterías, policiales de afuera) lo dejaron afuera todos; "¡EN VIVO!" lo dejaban pasar todos, Gemini
incluido (lo frena una regla escrita). La probabilidad de Mercury sirve para mandar al celular sólo lo dudoso (14 de 200
notas en la zona gris).

## La misma noticia en varios medios

- **62 pares etiquetados a mano** (21 del mismo hecho): Gemini 97 % de aciertos; Mercury 95 %; los demás 89 a 97 %. Cada uno
  juntó mal 1 a 5 pares de hechos distintos. Costo: centavos por mil pares.
- **Por significado (`bge-m3`)** sobre 4.477 notas de 72 horas: con umbral 0,85 encuentra 11 de 21 repetidas y trae 3 de
  41 que no lo son; con 0,75, 19 de 21 y 9 de 41. Con un juez barato que confirma cada par y **sin encadenar** (en
  estrella) quedan 3.249 historias en vez de 4.477 (27 % menos). Es lo que después se hizo con las reglas 184 y 195.

## Redactar (prompt de hoy contra uno más corto)

15 historias, el mismo verificador de producción. Ningún modelo pasó el verificador sin problemas en más de un tercio de
las notas (lo mejor: Gemma 4 31B, 36 %; Gemini 3.1 Flash-Lite, 33 %). Las fallas más comunes: copiar frases de la fuente,
números y fechas que no están en la fuente, repetir. **El prompt corto no mejoró al de hoy** con ningún modelo. Los modelos
`:free` no contestaron. Por eso la redacción sigue con Gemini y el recorte del prompt espera una prueba antes y después
(`docs/DECISIONES.md`, preguntas abiertas).

## Datos de contexto con búsqueda en internet

12 notas, hasta 3 datos por nota con su fuente, abriendo cada fuente para ver si la cifra está: Grok 89 %, Haiku 84 %,
Perplexity Sonar 82 %, DeepSeek 79 %, GPT-5 mini 53 %, Gemini 3.1 Flash-Lite 14 % (casi todo con fuentes que no abren).

## Otras mediciones de esos días

- **Fotos repetidas**: 47 de 708 notas con foto compartían una casi idéntica con otra; se evita sin IA, con la huella de
  la imagen (reglas 203 a 206).
- **Feeds**: 206 de 208 respondieron; unas 49 notas nuevas por media hora; con lectura cada hora, 6 feeds podrían perder
  notas en los picos.
- **Categorías de los diarios**: dos de cada tres notas traen una categoría propia del medio (56 distintas): sirve de pista
  para la sección.
- **Inventario de prompts** (11/10): 19 bloques de instrucciones a la IA; hoy está al día en
  `docs/auditoria-2-0/06-PROMPTS-Y-AGENTES.md`.
