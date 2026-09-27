# Ingesta de Radar Balcarce

El motor: lee las fuentes (214 feeds activos: los de `fuentes.mjs` y los del
cruce de medios; la lista entera, en `../FUENTES.md`), junta la misma noticia contada por varios medios, deja de
afuera sólo lo que tiene respaldo, la clasifica, le pone el semáforo y le calcula el puntaje. **Sin
dependencias**: sólo lo que trae Node (hay una prueba que lo vigila). Corre
sola en GitHub Actions cada 30 minutos ("Actualizar la web") y en el panel,
mientras está prendido. El recorrido técnico y el puntaje están en `../MANUAL.md`
y el criterio editorial, en `../CRITERIO-EDITORIAL.md`.

```bash
node ingesta/ingesta.mjs                   # corre todo y deja ingesta/salida/portada.json y preview.html
npm run auditar                            # qué está decidiendo el filtro hoy, y con qué palabra
node ingesta/probar.mjs                    # prueba las fuentes candidatas
node ingesta/probar.mjs https://medio.com/feed   # prueba una URL suelta
```

## Los archivos

| Archivo | Qué hace |
|---|---|
| `fuentes.mjs` | Lo que se toca: fuentes y pesos (58, 54 activas: `FUENTES` y `FUENTES_NACIONALES`), palabras por sección, palabras de la zona (`PALABRAS_ZONA`), semáforo (con `nunca`: las listas de sepelios) y temas |
| `fuentes-cruce.mjs` | Las 160 fuentes del cruce de medios (71 medios: nacionales, provincia, Mar del Plata, la zona y especializados), una línea por feed; `activa: false` para apagar una. Todos los feeds de un medio llevan el mismo `medio` |
| `listar-fuentes.mjs` | Escribe `../FUENTES.md`, el registro de todas las fuentes, desde `fuentes.mjs` y `fuentes-cruce.mjs`. Correrlo después de tocar una fuente: una prueba controla que esté al día |
| `cruce.mjs` | Junta las notas de todos los medios que cuentan el mismo hecho (título y resumen, TF-IDF, umbral 0,42) con una memoria de 36 horas (`.cache/cruce-memoria.json`, fuera del repo). De afuera queda lo que dice Balcarce en el título, toca la zona o cuentan dos medios o más |
| `criterio.mjs` | Los números del criterio (largos, intentos, medios que pide lo de afuera y sus cupos, Facebook, podcasts, contrato del día): tienen que coincidir con las tablas de `../CRITERIO-EDITORIAL.md` y `../CRITERIO-REDES.md` |
| `prompt-editorial.mjs` | Lee la sección 12 de `../CRITERIO-EDITORIAL.md`: es la instrucción exacta que recibe la IA; si el archivo falta, la reescritura no arranca |
| `ingesta.mjs` | Bajar, parsear (el título de un índice de noticias, con `tituloDelSitemap`), filtrar por la sección del medio, cruzar (con `cruce.mjs`; lo que cuentan sólo medios de otras ciudades de la zona no entra; lo que un medio de acá copia de afuera es de afuera, `historiaDeAca`), clasificar, puntuar, pedirle a lo de afuera los medios de su sección (`exigirMedios`, `mediosMinimosDe`; lo que toca la zona no los pide, `deLaZona`) y aplicar los cupos (`aplicarCupos`). De un medio que se raspa (El Diario Balcarce) abre cada nota sin fecha y no trae lo de más de 72 horas (`ampliar`, `HORAS_DE_UNA_NOTA_NUEVA`) |
| `lectura-ia.mjs` | La lectura con IA (plan V2.2): una ficha por nota que decide qué entra (saca publicidad, chimentos y lo del extranjero sin un argentino), la sección y qué es de Balcarce, y junta las repetidas (queda la ya publicada). Topes en `LECTURA` y `topeDeLecturas` (60 pedidos por día con la clave gratis, 200 con la propia) |
| `estadistica-diaria.mjs` | Cuántas notas se publicaron hoy, por sección (`web/data/notas-por-dia.json`), y las dos líneas del resumen de las 21 |
| `perfil-balcarce.md` | Lo que la IA sabe de Balcarce: localidades, vecinos, rutas, actividades. Sólo datos seguros |
| `articulo.mjs` | El texto completo de la nota original, para la IA, sin pies, menús ni las necrológicas que El Diario Balcarce pega debajo de cada nota (`RUIDO`, `NECROLOGICA`) |
| `zona.mjs` | La hora de Balcarce: la única que usan la ingesta, el panel, las redes y los reels (el servidor de GitHub corre en UTC) |
| `json.mjs` | Leer un JSON sin que un archivo faltante o roto tire abajo el proceso |
| `verificar.mjs` | Rechaza lo que la IA inventó (números, nombres, días, citas) |
| `utiles.mjs` | Teléfonos útiles y la farmacia de turno (cambia a las 8:30) |
| `agenda.mjs` | Los eventos de la agenda |
| `alertas.mjs` | Los avisos de clima |
| `contactos-agenda.json` | A quién pedirle fechas para la agenda (`../PANEL.md`) |
| `auditar.mjs`, `probar.mjs` | Herramientas para mirar a mano; no publican nada |
