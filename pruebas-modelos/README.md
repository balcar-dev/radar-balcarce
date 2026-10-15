# Pruebas de modelos para seleccionar notas

Carpeta de prueba: **no toca** `ingesta/`, `web/` ni los workflows, y no se usa en producción.
Sin dependencias (Node 22 y `fetch`).

| Archivo | Para qué |
|---|---|
| `armar-muestra.mjs` | Arma `muestra.json` con 30 notas reales (9 de Balcarce, 6 de la zona, 15 de afuera), 3 pares que cuentan el mismo hecho, 3 de control y 3 notas que no deberían salir. Sólo lee del repo. |
| `probar.mjs` | Manda la muestra a un modelo de OpenRouter y guarda `resultados-<modelo>.json`. |
| `comparar.mjs` | Cruza los resultados con la decisión del sistema actual y escribe `comparacion.md`. No necesita la clave. |

## La prueba de ~200 notas crudas

`bajar-crudas.mjs` lee los feeds públicos (sólo lectura) y arma `muestra-200.json` con notas **sin decisión del sistema**, incluyendo lo que hoy se descarta (20 de ellas, garantizadas: horóscopo, loterías, chimentos, policiales de afuera, extranjero). Como no hay "verdad", se compara contra un modelo de referencia (el que usa hoy el sistema, Gemini Flash-Lite) y se revisan a mano las discrepancias.

```bash
node pruebas-modelos/bajar-crudas.mjs
node pruebas-modelos/probar.mjs --muestra=muestra-200.json --modelo=google/gemini-3.1-flash-lite
node pruebas-modelos/probar.mjs --muestra=muestra-200.json --modelo=inception/mercury-decide
node pruebas-modelos/comparar.mjs --muestra=muestra-200.json --referencia=google/gemini-3.1-flash-lite
```

Ojo: los modelos `:free` de OpenRouter tienen un tope diario (unos 50 pedidos sin crédito cargado), así que 200 notas no entran en un día sin crédito.

## Cómo se usa

La clave va en la variable de entorno `OPENROUTER_API_KEY` (nunca en un archivo).

```bash
node pruebas-modelos/probar.mjs --modelo=google/gemma-4-31b-it:free
node pruebas-modelos/probar.mjs --modelo=inception/mercury-decide:free
node pruebas-modelos/comparar.mjs
```

Opciones de `probar.mjs`: `--por-minuto=15` (ritmo), `--solo=5` (sólo las primeras 5 notas, para probar), `--sin-pares`.
Si OpenRouter contesta 429, espera y reintenta una vez.

## Cosas a saber

- `archivo.json` sólo guarda lo **publicado**. Las 3 notas que no deberían salir (horóscopo, chimento, extranjero) salen de `web/data/retiradas.json` y sólo tienen título. Policial de afuera y loterías no se pudieron incluir: el sistema las descarta antes de guardarlas.
- Los modelos `inception/mercury-decide*` no son de chat: usan `POST /api/alpha/decisions` (preguntas tipadas). No dan "razón" en texto.
- Los pares "mismo hecho" son los que el sistema juntó (`fusionadas.json`); los de control los fijamos nosotros.
- El "interés" del sistema se deduce de la ficha de la IA (`directo`=alto, `indirecto`=medio, `nulo`=ninguno) y sólo existe en las notas que tienen ficha.
- Costo: precio de lista del modelo × tokens medidos, repartiendo la instrucción fija entre 12 notas (como la lectura real). Los modelos `:free` dan US$ 0 pero tienen tope diario.
