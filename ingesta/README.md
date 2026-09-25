# Ingesta de Radar Balcarce

El motor: lee las fuentes, agrupa la misma noticia contada por varios medios,
la clasifica, le pone el semáforo y le calcula el puntaje. **Sin
dependencias**: sólo lo que trae Node (hay una prueba que lo vigila). Corre
sola en GitHub Actions cada 30 minutos ("Actualizar la web") y en el panel,
mientras está prendido. El criterio está en `../MANUAL.md`.

```bash
node ingesta/ingesta.mjs                   # corre todo y deja ingesta/salida/portada.json y preview.html
npm run auditar                            # qué está decidiendo el filtro hoy, y con qué palabra
node ingesta/probar.mjs                    # prueba las fuentes candidatas
node ingesta/probar.mjs https://medio.com/feed   # prueba una URL suelta
```

## Los archivos

| Archivo | Qué hace |
|---|---|
| `fuentes.mjs` | Lo que se toca: fuentes y pesos, palabras por sección, semáforo, cupos y temas |
| `ingesta.mjs` | Bajar, parsear, agrupar, clasificar y puntuar |
| `articulo.mjs` | El texto completo de la nota original, para la IA |
| `verificar.mjs` | Rechaza lo que la IA inventó (números, nombres, días, citas) |
| `utiles.mjs` | Teléfonos útiles y la farmacia de turno (cambia a las 8:30) |
| `agenda.mjs` | Los eventos de la agenda |
| `alertas.mjs` | Los avisos de clima |
| `contactos-agenda.json` | A quién pedirle fechas para la agenda (`../PANEL.md`) |
| `auditar.mjs`, `probar.mjs` | Herramientas para mirar a mano; no publican nada |
