# Perfiles de Instagram y Facebook

*Actualizado el 29/09/2026.* **El único lugar del texto de los perfiles**: se
copia de acá, tal cual (una prueba cuida los largos: `pruebas/perfiles.test.mjs`).
Nada de acá inventa datos: sólo dice lo que el medio hace hoy. Los colores y las
letras están en `MEDIA-KIT.md`; las medidas, en `FORMATOS.md`; lo que falta
cargar, en `PENDIENTES.md`.

## Qué tiene que decir un perfil

1. **Qué es**: un medio digital de Balcarce.
2. **Qué se encuentra**: noticias, clima y agenda. **No se nombran las
   farmacias** (decisión del 26/09: es una pieza diaria, no la identidad).
3. **Que hay IA, sin esconderla y sin hacerla protagonista**: una línea en la
   descripción larga de Facebook y en `/quienes-somos`. La bio de Instagram tiene
   poco lugar y va sin ella. Es la transparencia de la regla 7
   (`docs/10-REGLAS-Y-PRUEBAS.md`: cada nota dice quién la escribió).
4. **Adónde ir**: `radarbalcarce.com`, **en los dos perfiles**, siempre escrito
   así (nunca `.com.ar`).
5. **Tono**: el del medio (`CRITERIO-REDES.md` § 2 y `CRITERIO-EDITORIAL.md` § 4).
   Sin "IMPACTANTE", sin promesas.

## Instagram (`@radarbalcarce`)

| Campo | Texto o valor |
|---|---|
| **Nombre** (el que se busca) | `Radar Balcarce · Noticias` |
| **Usuario** | `@radarbalcarce` (no se toca) |
| **Bio** (máx. 150 caracteres) | ver abajo |
| **Enlace** | `https://radarbalcarce.com` |
| **Categoría** | "Sitio web de noticias y medios de comunicación" (hoy figura "Blog personal": no se ve en el perfil, pero ayuda a que Instagram entienda qué es) |
| **Botón de contacto** | El WhatsApp del medio, **2266 51-1612** (el del pie de la web, confirmado el 29/09) |
| **Historias destacadas fijas** | Farmacia · Teléfonos · Agenda · Clima, cada una con una portada cuadrada que se vea bien recortada en círculo (un ícono simple por tema, sin texto) |
| **Foto de perfil** | El avatar azul (`reels/avatar.mjs`; cómo es, en `MEDIA-KIT.md`, "Los colores"). Se muestra redondo |

**Bio de Instagram (máx. 150 caracteres)**

```
Radar Balcarce: noticias de acá, la región y el país.
Clima y agenda, todos los días.
Todo en radarbalcarce.com
```

Tres renglones, sin emojis ni promesas. Si se cambia una palabra, volver a
contar: el límite es 150.

## Facebook (página "Radar Balcarce")

| Campo | Texto o valor |
|---|---|
| **Nombre** | `Radar Balcarce` |
| **Nombre de usuario de la página** | El más parecido a `radarbalcarce` que Facebook permita |
| **Categoría** | La más cercana a "Sitio web de noticias y medios de comunicación" |
| **Información breve** | ver abajo |
| **Descripción larga** | ver abajo |
| **Sitio web** | `https://radarbalcarce.com` |
| **Botón de la página** | "Enviar mensaje de WhatsApp" al 2266 51-1612, o "Más información" hacia el sitio |
| **Ubicación** | Balcarce, Buenos Aires |

**Información breve de Facebook (máx. 101 caracteres)**

```
Radar Balcarce: noticias de acá, la región y el país. Todo en radarbalcarce.com
```

**Descripción larga de Facebook**

```
Radar Balcarce es el medio digital que sigue lo que pasa en Balcarce, la
región y el país. Cada día reunimos las noticias con la fuente siempre a la
vista, y sumamos el clima, la agenda y los teléfonos útiles.

Las notas se escriben con inteligencia artificial y se verifican contra las
fuentes; lo sensible lo revisa una persona antes de salir. Si ves un error,
escribinos y lo corregimos.

Todas las notas, la agenda y el clima, en radarbalcarce.com
```

La página nueva de Facebook tiene un solo campo de presentación, que junta la
breve y la larga (el 28/09 quedó la que estaba).

## Las imágenes

- **Foto de perfil**, la misma en las dos redes: `reels/salida/avatar.png`. Se
  arma con `node reels/avatar.mjs`.
- **Portada de Facebook**: `reels/salida/portada-facebook.png` (1640 × 924, 16:9;
  por qué esa medida, en `FORMATOS.md`, "La portada de Facebook"). Se arma con
  `node reels/portada.mjs`. Instagram no tiene portada.
- Las dos son azules y usan las letras de la marca (`MEDIA-KIT.md`). El perfil no
  cambia de color aunque los podcasts cambien cada día: así la grilla muestra un
  perfil firme y piezas que cambian.

## Cómo cargarlo

Se carga a mano, en cada app (la portada, por ejemplo, Meta no deja subirla por
API con el token actual). Los textos se copian de los bloques de arriba, tal
cual: no de otro lado.

| Qué | Dónde se toca | Estado |
|---|---|---|
| Foto de perfil | Instagram: Editar perfil → tocar la foto → Cambiar foto de perfil. Facebook: la página → Editar foto de perfil | Subida el 28/09 |
| Portada de Facebook | La página → Editar portada → Subir foto. Después mirarla en el celular **y** en la computadora: el avatar redondo tapa distinto en cada una | Subida el 28/09 (la azul) |
| Bio de Instagram | Editar perfil → Biografía → borrar todo y pegar | Cargada el 28/09 |
| Presentación de Facebook | Configuración de la página → Información de la página | Quedó la que estaba |
| Nombre de Instagram | Editar perfil (el usuario no se toca) | Cargado el 28/09 |
| Categoría de Instagram | Editar perfil → Categoría | **Falta** |
| Enlace de Instagram | Editar perfil → Enlaces; sólo desde el celular (la web no deja). Nunca `.com.ar` | **Falta** |
| Categoría, sitio web y ubicación de Facebook | Configuración de la página → Información de la página | Hechos |
| Botón de contacto | Instagram: Editar perfil → Opciones de contacto → WhatsApp 2266 51-1612. Facebook: el botón de la página | **Falta** |
| Historias destacadas | Sólo Instagram, desde el perfil: las cuatro de la tabla de arriba | **Falta** |

Nada de esto pide una clave ni un token: son textos e imágenes. Después de
cargar algo, avisarle a Claude con una captura o el enlace público del perfil,
para revisarlo y sacarlo de `PENDIENTES.md`.

## Cuándo actualizar

- **Si cambia lo que el medio hace** (otra cosa fija, como la guía comercial, o
  si dejan de salir los podcasts), la política de IA o cómo se firma cada nota.
- **Cada 90 días**, con la revisión de medidas de `FORMATOS.md`: mirar si
  Instagram o Facebook cambiaron la foto de perfil o la portada.
- **Si se prende la publicidad** (`PUBLICIDAD.md`): que la bio siga diciendo qué
  es el medio.

Relacionado: `docs/07-REDES.md`, `MEDIA-KIT.md`, `FORMATOS.md`, `PENDIENTES.md`.
