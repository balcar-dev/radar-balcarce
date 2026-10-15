# Sondeo de fuentes desde Cloudflare

## Qué es

Desde GitHub Actions, unos 65 de los 236 feeds que se leían el 15/10 "no llegaron a conectar". Antes de mudar el motor a Cloudflare hay que saber una cosa: **¿esos medios contestan si el pedido sale de la red de Cloudflare?** Este Worker lo mide.

Es una prueba chica y descartable (fase 2 de `docs/etapa-10-operacion/ANALISIS.md`):

- Es un Worker de Cloudflare llamado `radar-balcarce-sondeo-fuentes`. **No tiene reloj, no guarda nada y no toca la web, las redes ni el motor de hoy.**
- Lleva adentro la lista de los **103 feeds activos** (`lista.json`, sacada del mismo registro que usa el robot).
- Cuando una persona lo corre, pide los feeds de a 10, con un nombre de navegador común y esperando como mucho 15 segundos por feed, y devuelve por cada uno: si contestó, qué código HTTP, cuántas notas trae, la fecha de la nota más nueva y cuánto tardó.
- Sólo responde si se le muestra una llave (`SONDEO_TOKEN`). Sin la llave, no hace nada.

## Cómo se corre (Andrés o Hernán)

1. **Una sola vez**: en GitHub, Settings > Secrets and variables > Actions > New repository secret. Nombre: `SONDEO_TOKEN`. Valor: cualquier texto largo al azar (por ejemplo, 30 letras y números mezclados que se inventan en el momento). **Se pega ahí, nunca en un chat.** Los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` ya están cargados (los usa el reloj).
2. En GitHub: **Actions > "Sondeo de fuentes desde Cloudflare" > Run workflow.**
   - "Con qué nombre se piden los feeds": `navegador` (el de un lector común, es lo normal) o `robot` (el nombre que usa hoy nuestro robot). Conviene correrlo **dos veces**, una con cada uno: si anda con navegador y falla con robot, el bloqueo es por el nombre y se arregla cambiando el nombre.
3. Tarda unos 3 a 5 minutos: sube el Worker, le carga la llave, y le pide los 11 lotes uno detrás del otro.

## Qué mirar

- **En el registro de la corrida** (paso "Sondear todos los feeds", y arriba de todo en el resumen de la corrida): una línea tipo "X de 103 feeds andan" y la tabla de los que no, con el motivo.
- **El archivo adjunto `sondeo-cloudflare.json`** (al final de la página de la corrida, en "Artifacts"): el detalle de los 103, para compararlo con la medida de GitHub (`docs/etapa-1-fuentes/fuentes-medidas.csv`).
- Cómo leer los estados:
  - `ok`: contestó y trae notas.
  - `sin conexión`: no llegó a conectar o se acabó el tiempo. Es lo que pasaba desde GitHub; si desde Cloudflare es mucho menos, la mudanza va por buen camino.
  - `desafío`: el medio nos mostró una pantalla de "verificando que sos una persona" (bloqueo anti-robots). Esos no se arreglan con paciencia.
  - `HTTP 403 / 404 / 5xx`: el sitio contestó pero no nos dejó pasar, o la dirección ya no existe.
  - `vacío` o `html (no es un feed)`: contestó, pero no trajo notas.
- También avisa los que contestan pero con lo más nuevo de hace más de 7 días, y los que tardan más de 8 segundos.
- **La pregunta que se contesta**: si desde Cloudflare fallan claramente menos que los 65 de GitHub, el motor puede mudarse. Si fallan parecido o más, hay que pensar de dónde salen los pedidos (otro lugar de salida) o sacar esas fuentes. Esa decisión es de ustedes con el resultado a la vista.

## Cuándo se borra

Cuando ya tengan la respuesta, **el Worker se puede borrar sin consecuencias**: en Cloudflare > Workers y Pages > `radar-balcarce-sondeo-fuentes` > Settings > Delete. Después se puede borrar también el secreto `SONDEO_TOKEN` de GitHub. Los archivos de esta carpeta pueden quedar en el repositorio o borrarse; nada más los usa.

## Si se toca una fuente

`lista.json` es una foto de las fuentes activas. Si se suma, se saca o se apaga una fuente, correr `node infra/sondeo-fuentes/generar-lista.mjs` y subir el archivo (una prueba, `pruebas/sondeo-fuentes.test.mjs`, avisa si quedó desactualizado).

## Para quien programe

- `worker.mjs`: el Worker (sin dependencias; importa sólo `lista.json`). `GET /sondear?lote=N[&ua=navegador|robot]` con el encabezado `x-sondeo-token`. Sin `SONDEO_TOKEN` en el Worker: 503; llave incorrecta: 401; lote inexistente: 400. La llave **no** se acepta en la dirección.
- Límites de Workers que respeta: 10 pedidos por llamada (de sobra), 4 conexiones a la vez (el tope es 6), 15 s por feed, y de cada feed se lee hasta 2 MB.
- `cliente.mjs`: el que junta los lotes, imprime la tabla y guarda el JSON (lo usa el workflow; sirve también a mano: `SONDEO_TOKEN=... node infra/sondeo-fuentes/cliente.mjs <dirección del Worker> salida.json`).
- `generar-lista.mjs`: arma `lista.json` desde el registro de `ingesta/` (sólo lectura).
- Workflow: `.github/workflows/sondeo-fuentes-cloudflare.yml` (sólo a mano; no guarda nada en el repositorio).
