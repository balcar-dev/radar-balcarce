# Perfiles de Instagram y Facebook

*Actualizado el 26/09/2026.* Los textos **todavía no
están aplicados**: hay que cambiarlos a mano en cada red (`PENDIENTES.md`,
sección B). Nada de acá inventa datos: sólo dice lo que el medio hace hoy.

## Qué tiene que decir un perfil

1. **Qué es**: un medio digital de Balcarce.
2. **Qué se encuentra**: noticias, clima y agenda. **No se nombran las
   farmacias** (decisión del 26/09: es una pieza diaria, no la identidad).
3. **Que hay IA, sin esconderla y sin hacerla protagonista**: una línea, en la
   descripción larga de Facebook y en `/quienes-somos`. La bio de Instagram
   tiene poco lugar y va sin ella. Es la misma transparencia que pide
   `REGLAS.md` (cada nota dice quién la escribió).
4. **Adónde ir**: `radarbalcarce.com`, **en los dos perfiles**, siempre
   escrito así (nunca `.com.ar`).
5. **Tono**: el del medio (`CRITERIO-REDES.md`, sección 2, y `CRITERIO-EDITORIAL.md`,
   sección 4). Sin "IMPACTANTE", sin promesas.

## Instagram (`@radarbalcarce`)

| Campo | Texto o valor |
|---|---|
| **Nombre** (el que se busca) | `Radar Balcarce · Noticias` |
| **Usuario** | `@radarbalcarce` (ya está) |
| **Bio** (máx. 150 caracteres) | ver abajo |
| **Enlace** | `https://radarbalcarce.com` |
| **Categoría** | "Sitio web de noticias y medios de comunicación" (hoy está en "Blog personal"; no se ve en el perfil pero mejora cómo Instagram lo entiende). Se cambia desde el celular: Editar perfil → Categoría |
| **Botón de contacto** | WhatsApp o correo del medio (el que se decida publicar) |
| **Historias destacadas fijas** | Farmacia · Teléfonos · Agenda · Clima (portada cuadrada que se ve redonda: un ícono simple por tema) |
| **Foto de perfil** | El avatar del medio (`reels/avatar.mjs`) sobre el rojo de la marca, centrado: se muestra redonda (ver medidas) |

**Bio de Instagram (máx. 150 caracteres)**

```
Lo que pasa en Balcarce, la región y el país.
Noticias, clima y agenda, todos los días.
Todo en radarbalcarce.com
```

Tres renglones, sin emojis ni promesas. Si se cambia una palabra, volver a
contar: el límite es 150 (una prueba lo cuida).

## Facebook (página "Radar Balcarce")

| Campo | Texto o valor |
|---|---|
| **Nombre** | `Radar Balcarce` |
| **Nombre de usuario de la página** | El más parecido a `radarbalcarce` que Facebook permita |
| **Categoría** | La más cercana a "Sitio web de noticias y medios de comunicación" que ofrezca Facebook |
| **Información breve** | ver abajo |
| **Descripción larga** | ver abajo |
| **Sitio web** | `https://radarbalcarce.com` |
| **Botón de llamado a la acción** | "Más información" (o "Enviar mensaje") apuntando al sitio |
| **Ubicación** | Balcarce, Buenos Aires |

**Información breve de Facebook (máx. 101 caracteres)**

```
Lo que pasa en Balcarce, la región y el país, todos los días. Todo en radarbalcarce.com
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

## Imágenes y colores

Las medidas de cada imagen (foto de perfil, portada, historias destacadas)
están en [`FORMATOS.md`](FORMATOS.md). La foto de perfil se arma con
`node reels/avatar.mjs` y la portada de la página de Facebook con
`node reels/portada.mjs` (genera `reels/salida/portada-facebook.png`, 1640 × 924,
16:9; ver "La portada de Facebook" en `FORMATOS.md`), con las mismas tipografías
que las placas y la web.

**Cómo se sube la portada:** sólo a mano, desde la app de Facebook o desde el
navegador (página → Editar portada → Subir foto), con ese archivo. Meta no deja
hacerlo por API con el token actual. Después mirarla en el celular y en la
compu: la marca tiene que verse entera.

**Colores** (los de la web, `web/app/globals.css`):

- **Rojo de la marca** `#C7381C` (y `#9C2B15` como oscuro): para la foto de
  perfil y detalles. Nunca en avisos publicitarios (`PUBLICIDAD.md`).
- **Tinta** `#14161A` y **crema** `#F4F1EA`: fondos y textos.
- Los **podcasts** cambian de color cada día de la semana (`colorDelDia` en
  `redes/piezas.mjs`): domingo magenta, lunes rojo de la marca, martes verde,
  miércoles azul, jueves ámbar, viernes violeta, sábado verde azulado. El
  perfil se mantiene en el rojo de la marca: así la grilla muestra un perfil
  firme y piezas que cambian.
- **Tipografía**: Fraunces en los títulos (las placas usan las fuentes de
  `reels/marca/fuentes/`).

## Cuándo actualizar

- **Al aplicarlas por primera vez** (pendiente): Facebook se puede desde Meta
  Business Suite; Instagram, sólo desde el celular.
- **Si cambia lo que el medio hace**: por ejemplo, si se suma otra cosa fija
  (alertas de clima, la guía comercial) o si deja de haber podcasts.
- **Si cambia la política de IA** o cómo se firma cada nota.
- **Si se decide un contacto público** (WhatsApp o correo): cargarlo en el
  botón.
- **Cada 90 días**, con la revisión de medidas de `FORMATOS.md`: mirar si
  Instagram o Facebook cambiaron el tamaño de la foto de perfil o de la
  portada.
- **Si se prende la publicidad** (`PUBLICIDAD.md`): revisar que la bio siga
  diciendo qué es el medio.

## Relacionado

`REDES.md`, `FORMATOS.md`, `REGLAS.md`, `PENDIENTES.md`.
