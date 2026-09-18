# Ingesta de Radar Balcarce

Prueba local del motor del medio. No necesita instalar nada ni tener cuentas:
sólo Node 18 o más nuevo.

```bash
node ingesta.mjs
```

Lee todas las fuentes, agrupa la misma noticia contada por varios medios,
la clasifica, le pone el semáforo editorial y le calcula relevancia. Después
trae el clima y las farmacias de turno. Deja tres archivos en `salida/`:

- `preview.html` — la portada armada, para abrir en el navegador.
- `portada.json` — lo mismo en datos, que es lo que va a consumir el sitio.
- `farmacias-crudo.txt` — el texto del Colegio tal cual, para ajustar el lector
  cuando cambien el formato.

```bash
node probar.mjs                          # prueba las fuentes candidatas
node probar.mjs https://medio.com/feed   # prueba una URL suelta
```

## Los archivos

- **`fuentes.mjs`** es el que se toca para ir puliendo: qué medios se leen, qué
  palabras mandan una nota a cada sección y qué dispara el semáforo. Agregar un
  medio son cinco líneas.
- **`ingesta.mjs`** es el motor: bajar, parsear, agrupar, clasificar, puntuar.

## Lo que todavía falta

- **Región y provincia.** La Capital de Mar del Plata y El Retrato de Hoy
  bloquean lectores automáticos (403), 0223 responde sin items y La Noticia 1 no
  publica feed. Hay que leerlos de la página o buscar otros.
- **Fechas de El Diario Balcarce.** Su portada no las muestra: hoy las notas
  entran sin hora, salvo que otro medio publique la misma y se la preste.
- **La clasificación por palabras se equivoca.** Es a propósito: es el filtro
  barato de primera pasada. En la Fase 2, el modelo de lenguaje clasifica,
  resume y titula, y estas reglas quedan sólo como red de seguridad.
- **El cronograma de farmacias se corta a fin de mes.** El script ya avisa
  cuántos días quedan cargados.
