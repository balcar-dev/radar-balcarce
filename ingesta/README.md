# Ingesta de Radar Balcarce

*Actualizado el 29/09/2026.* El motor: lee las fuentes (214 feeds activos de 91
medios, en `../FUENTES.md`), junta la misma noticia contada por varios medios, deja
afuera lo que no tiene respaldo, la clasifica, le pone el semáforo y le calcula el
puntaje. Acá viven también la lectura con IA, el verificador y los números del
criterio (`criterio.mjs`). **Sin dependencias**: sólo lo que trae Node (una prueba
lo vigila). Corre sola en GitHub Actions cada media hora ("Actualizar la web") y en
el panel de la PC, mientras está prendido.

**Cómo funciona:** [`../docs/02-INGESTA.md`](../docs/02-INGESTA.md) (fuentes,
fechas, filtro de entrada, cruce de medios), [`../docs/03-SELECCION.md`](../docs/03-SELECCION.md)
(sección, puntaje, semáforo, cupos, lectura con IA) y
[`../docs/04-REDACCION.md`](../docs/04-REDACCION.md) (el verificador). Cada archivo,
con una línea, en `../docs/01-ARBOL.md`; el criterio, en `../CRITERIO-EDITORIAL.md`.
**`perfil-balcarce.md` no es documentación**: es lo que la IA sabe de Balcarce, y
lo lee tal cual.

## Correr a mano

```bash
npm run ingesta                                  # corre todo: deja ingesta/salida/portada.json y preview.html (no se versionan)
npm run auditar                                  # qué está decidiendo el filtro hoy, y con qué palabra
node ingesta/probar.mjs                          # prueba las fuentes candidatas (CANDIDATOS, en fuentes.mjs)
node ingesta/probar.mjs https://medio.com/feed   # prueba una dirección suelta
node ingesta/listar-fuentes.mjs                  # rehace ../FUENTES.md (después de tocar una fuente)
```

Después de tocar algo de esta carpeta, **reiniciar el panel de la PC** si está
prendido (cerrar su ventana y correr `ARRANCAR.bat`): Node carga el código al
arrancar.
