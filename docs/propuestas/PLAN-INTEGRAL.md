# Plan integral: web, panel y redes (reformulado el 8/10/2026)

*Reordena la hoja de ruta y la lista de prioridades en **cuatro frentes** y **cuatro etapas**, y dice qué ya está hecho y qué falta. No reemplaza
a [`PRIORIDADES.md`](PRIORIDADES.md) (la lista de 190 puntos con su "Avance"): es el mapa para decidir por dónde seguir. Los números `#` son los
de esa lista. "C" = lo hace Claude, "P" = lo hace una persona, "D" = lo deciden Hernán y Andrés.*

## Dónde estamos (8/10, noche)

- **Hecho hoy:** casi todo lo crítico (P0 y gran parte de P1): corrección automática frenada, semáforo mejorado, datos rotos que no vacían el sitio,
  respaldo armado, direcciones viejas sin 404, pantalla Hoy, Borradores y "Su recorrido" en el panel, reglas 108 a 143 (ver `docs/10-REGLAS-Y-PRUEBAS.md`).
- **Lo último (esta sesión):** la placa y el mail en Participá, mails del dominio, la nota institucional de El Diario Balcarce retirada, las redes
  esperan foto, "rural" ya no manda a Agro, y "Seguí leyendo" trae notas de la misma sección.
- **Traído de la otra sesión:** todo el código y los documentos están en `main`. Las cinco páginas (Cómo funciona, Código o IA, Hoja de ruta, Panel nuevo
  y Propuestas) están como `.html` en `docs/propuestas/material/` (menos la privada, a propósito). Tres documentos chocaban (`LEEME`, `MEJORAS`,
  `PRIORIDADES`); se compararon: la versión de la rama de la nube es la anterior (las mismas listas sin las marcas de lo hecho), así que
  **no se perdió nada** y manda la de `main`.

## Los cuatro frentes

### 1. Web (lo que ve el lector)
| Qué | Estado | Quién |
|---|---|---|
| Seguí leyendo por sección, foto primero en redes, sección bien puesta | **Hecho** (reglas 142 y 143) | C |
| Google: fecha de publicación, "Balcarce" en notas locales, foto en tres proporciones (#34, #35, #36) | Falta; cambia lo que Google muestra, **se habla antes** | D + C |
| Quiénes somos con nombres, "Cómo trabajamos", correcciones visibles (#37, #38) | Falta decisión (nombres y firma de lo que escribe Claude) | D |
| Títulos de la pestaña enteros (#40), regla contra títulos sensacionalistas (#42) | Falta decisión | D |
| Fotos y archivo a Cloudflare R2, páginas viejas armadas en el momento (#66, #68, #132 a #134) | Preparado; **falta cuenta y token de ustedes** y decidir R2 por mes o D1 **antes de diciembre** | P + D |
| De 11 a 15 secciones con barra lateral (H1) | Esperando la maqueta del menú y el visto bueno de Hernán | D |
| Pasar a Next 16 antes del 21/10 | Falta, con calma | C |
| Notas propias nuevas (nafta, plata de la Provincia, agro, inflación, clases…) | Ideas con datos comprobados; se arman de a una, con la prueba de acceso a la fuente (U0) primero | C |

### 2. Panel del celular (el único panel; el de la PC queda en desuso)
| Qué | Estado | Quién |
|---|---|---|
| Hoy, Borradores, Su recorrido | **Hecho** | C |
| Calendario de Fechas (efemérides y feriados del año) y lista de lo frenado en rojo, de sólo lectura | **Siguiente** (maqueta lista en `material/panel-nuevo-maqueta.html`) | C |
| Texto de las pistas cifrado (hoy queda público) (#50) | Falta; es lo más delicado, un día de trabajo | C |
| Arreglos chicos (botón del borrador, textos que se contradicen) y estadísticas por pieza (#60b, #60c) | Falta | C |
| Seguridad del panel (C-2) | **Decisión de ustedes** (el detalle está sólo en la página privada) | D |

### 3. Redes sociales
| Qué | Estado | Quién |
|---|---|---|
| Reintentos sin duplicar, volumen parejo, contrato y vigilante de todas las piezas, memoria de voces | **Hecho** | C |
| Foto primero, tarjeta con la sección correcta | **Hecho hoy** | C |
| Locución con memoria del día (#31) y videos animados con subtítulos (#32) | **Aprobados**; se repasan juntos | D + C |
| Reels de clima y farmacia en Facebook, medir 4 semanas (#33) | Falta | C |
| Audio en la nota, RSS de audio, YouTube Shorts y TikTok (RS-1 a RS-4) | Falta; antes hay que decidir cómo se publica en YouTube y TikTok (RS-0) | D |
| Contar créditos de búsqueda y mejorar el WhatsApp de las 21 (#51, #52) | Falta | C |
| Piezas fijas de Participá | **Decidir antes del 25/10** (vencen el 31/10) | D |

### 4. Datos, seguridad y plataforma
| Qué | Estado | Quién |
|---|---|---|
| Respaldo semanal | Armado; **falta GitLab y R2 de ustedes** (`PASOS-PARA-USTEDES.md`) | P |
| Vigilar al vigilante (Healthchecks), cuentas y vencimientos, 2FA, Andrés como administrador (#43, #122) | Falta | P + C |
| Seguimiento comercial a un lugar privado antes del primer mensaje a un comercio (C-8) | **Decisión de ustedes** | D |
| Jefe editor y segunda opinión de fotos (#33b, #33c), menos rechazos del verificador (#33i) | Diseñados; falta construir y probar con 30 notas reales | C |
| Servidor propio y repositorio privado (E1) | Más adelante | D |

## Las cuatro etapas

**Etapa 1: esta semana (hasta el feriado del 12/10).** Cerrar lo que quedó de lo crítico y lo que tiene fecha.
1. Calendario de Fechas y lista de rojo en el panel (C).
2. Mirar el WhatsApp de las 21 y la primera corrida con las reglas nuevas, y ver si los posteos de hoy salieron con foto (C).
3. Decisiones chicas que desbloquean cosas: cómo firmar lo que escribe Claude, el largo de los títulos, los medios argentinos para las pistas (D).
4. Search Console y la lista de buscadores con IA en Cloudflare (#5 y #6, P, 25 minutos).

**Etapa 2: del 13 al 25/10.** Lo que vence.
1. Juegos Bonaerenses del 19 al 23/10: cargar finalistas (P) y la nota (C).
2. Efemérides de noviembre el 20/10 (se aprueban en la pestaña Fechas).
3. Next 16 antes del 21/10 y Ubuntu 26 el 19/10 (C, con calma).
4. Piezas de Participá: decidir antes del 25/10 (D).
5. Cifrar el texto de las pistas (C).

**Etapa 3: fin de octubre a noviembre.** Lo que se ve de afuera.
1. Google: fecha, "Balcarce" y foto en tres proporciones, hablado antes (D + C).
2. Quiénes somos con nombres y "Cómo trabajamos" (D).
3. Videos animados y locución con memoria (D + C).
4. Fotos y archivo a R2, con sus pasos de ustedes (P + C), **antes del 2/12**.
5. Primeras notas propias nuevas, una por semana.

**Etapa 4: diciembre en adelante.** Estructura.
1. De 11 a 15 secciones con barra lateral, con la maqueta aprobada.
2. Jefe editor, otros proveedores de IA como respaldo, disparador propio en Cloudflare.
3. Repositorio privado y servidor, si se decide.
4. Revisión general el 15/12.

## Qué conviene que decidan ustedes primero

1. **Cómo firmar lo que escribe Claude** (#38) y **los nombres de Quiénes somos** (#37).
2. **Qué medios argentinos cuentan** para las pistas que salen solas (C-11).
3. **Si pasan a Cloudflare R2** (por mes o D1) y cuándo hacen sus pasos.
4. **Piezas de Participá** y **cómo publicar en YouTube y TikTok** (RS-0).
5. **La maqueta del menú de 15 secciones**, cuando quieran verla.
