# Ingesta de Radar Balcarce

El motor: lee las fuentes (214 feeds activos de 91 medios; la lista entera,
en `../FUENTES.md`), junta la misma noticia contada por varios medios, deja de
afuera sólo lo que tiene respaldo, la clasifica, le pone el semáforo y le
calcula el puntaje. Acá viven también la lectura con IA, el verificador y los
números del criterio. **Sin dependencias**: sólo lo que trae Node (hay una
prueba que lo vigila). Corre sola en GitHub Actions cada 30 minutos
("Actualizar la web") y en el panel, mientras está prendido.

**Cómo funciona, paso a paso: [`../docs/02-INGESTA.md`](../docs/02-INGESTA.md)**
(fuentes, lectura, fechas, filtro de entrada, cruce de medios) y
[`../docs/03-SELECCION.md`](../docs/03-SELECCION.md) (sección, puntaje,
semáforo, medios, cupos, lectura con IA). El verificador:
[`../docs/04-REDACCION.md`](../docs/04-REDACCION.md). Cada archivo de esta
carpeta, con una línea: `../docs/01-ARBOL.md`. El criterio editorial:
`../CRITERIO-EDITORIAL.md`.

## Correr a mano

```bash
node ingesta/ingesta.mjs                         # corre todo y deja ingesta/salida/portada.json y preview.html
npm run auditar                                  # qué está decidiendo el filtro hoy, y con qué palabra
node ingesta/probar.mjs                          # prueba las fuentes candidatas (CANDIDATOS)
node ingesta/probar.mjs https://medio.com/feed   # prueba una URL suelta
node ingesta/listar-fuentes.mjs                  # rehace ../FUENTES.md (después de tocar una fuente)
```

Después de tocar algo de esta carpeta, **reiniciar el panel** si está
prendido (cerrar su ventana y correr `ARRANCAR.bat`): Node carga el código al
arrancar.
