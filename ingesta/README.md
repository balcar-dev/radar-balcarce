# Ingesta de Radar Balcarce

El motor: lee las fuentes, agrupa la misma noticia contada por varios medios,
la clasifica, le pone el semáforo y le calcula el puntaje. **Sin
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
| `fuentes.mjs` | Lo que se toca: fuentes y pesos, palabras por sección, semáforo y temas |
| `criterio.mjs` | Los números del criterio (largos, intentos, pisos y cupos de afuera, Facebook, podcasts, contrato del día): tienen que coincidir con las tablas de `../CRITERIO-EDITORIAL.md` y `../CRITERIO-REDES.md` |
| `prompt-editorial.mjs` | Lee la sección 12 de `../CRITERIO-EDITORIAL.md`: es la instrucción exacta que recibe la IA; si el archivo falta, la reescritura no arranca |
| `ingesta.mjs` | Bajar, parsear, agrupar, clasificar y puntuar |
| `articulo.mjs` | El texto completo de la nota original, para la IA |
| `zona.mjs` | La hora de Balcarce: la única que usan la ingesta, el panel, las redes y los reels (el servidor de GitHub corre en UTC) |
| `json.mjs` | Leer un JSON sin que un archivo faltante o roto tire abajo el proceso |
| `verificar.mjs` | Rechaza lo que la IA inventó (números, nombres, días, citas) |
| `utiles.mjs` | Teléfonos útiles y la farmacia de turno (cambia a las 8:30) |
| `agenda.mjs` | Los eventos de la agenda |
| `alertas.mjs` | Los avisos de clima |
| `contactos-agenda.json` | A quién pedirle fechas para la agenda (`../PANEL.md`) |
| `auditar.mjs`, `probar.mjs` | Herramientas para mirar a mano; no publican nada |
