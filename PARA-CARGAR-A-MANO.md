# Para cargar a mano: Facebook e Instagram

*Armado el 28/09/2026.* Esto es sólo la lista de tareas, con el texto ya
listo para copiar y pegar. El detalle y el porqué de cada cosa está en
`PERFILES.md`, `MEDIA-KIT.md` y `FORMATOS.md` — esto es el resumen de acción,
para tenerlo abierto al lado mientras cargás.

Nada de esto lo puede hacer Claude: son cuentas, y las contraseñas y los
botones de "guardar" los toca una persona.

---

## 1. La foto de perfil (Instagram y Facebook, la misma en las dos)

**Archivo:** `reels/salida/avatar.png` (1080×1080, fondo azul oscuro con
"RADAR" en blanco y "BALCARCE" en rojo — es el mismo archivo en las dos
redes). **Ya subida el 28/09** en Instagram y Facebook.

- **Instagram:** Editar perfil → tocar la foto → Cambiar foto de perfil.
- **Facebook:** la página "Radar Balcarce" → Editar foto de perfil.

Si hace falta un archivo nuevo (por ejemplo si volvés a cambiar el diseño):
```
node reels/avatar.mjs
```

## 2. La portada de Facebook

**Archivo:** `reels/salida/portada-facebook.png` (1640×924, 16:9).

- Página "Radar Balcarce" → Editar portada → Subir foto → elegí el archivo.
- Mirala después en el celular Y en la computadora: el avatar redondo tapa
  distinto en cada una (`PERFILES.md` lo explica, "zona segura común").

Si hace falta un archivo nuevo:
```
node reels/portada.mjs
```

Instagram no tiene portada: sólo la foto de perfil.

## 3. La bio de Instagram (máx. 150 caracteres)

Editar perfil → Biografía → **borrar todo y pegar esto tal cual**:

```
Radar Balcarce: noticias de acá, la región y el país.
Clima y agenda, todos los días.
Todo en radarbalcarce.com
```

## 4. La información breve de Facebook (máx. 101 caracteres)

Configuración de la página → Información de la página → Información breve:

```
Radar Balcarce: noticias de acá, la región y el país. Todo en radarbalcarce.com
```

## 5. La descripción larga de Facebook

Configuración de la página → Información de la página → Descripción:

```
Radar Balcarce es el medio digital que sigue lo que pasa en Balcarce, la
región y el país. Cada día reunimos las noticias con la fuente siempre a la
vista, y sumamos el clima, la agenda y los teléfonos útiles.

Las notas se escriben con inteligencia artificial y se verifican contra las
fuentes; lo sensible lo revisa una persona antes de salir. Si ves un error,
escribinos y lo corregimos.

Todas las notas, la agenda y el clima, en radarbalcarce.com
```

## 6. Nombre y usuario

| Dónde | Qué poner |
|---|---|
| Instagram, nombre (el que se busca) | `Radar Balcarce · Noticias` |
| Instagram, usuario | `@radarbalcarce` (ya está, no tocar) |
| Facebook, nombre de la página | `Radar Balcarce` (ya está) |
| Facebook, nombre de usuario | El más parecido a `radarbalcarce` que Facebook deje |

## 7. Categoría (mejora cómo cada red lo entiende, aunque no se vea mucho)

- **Instagram:** Editar perfil → Categoría → buscar "Sitio web de noticias y
  medios de comunicación" (hoy dice "Blog personal": cambiarlo).
- **Facebook:** Configuración de la página → Categoría → la más parecida a
  "Sitio web de noticias y medios de comunicación" que ofrezca.

## 8. Enlace y sitio web

- Instagram, enlace: `https://radarbalcarce.com`
- Facebook, sitio web: `https://radarbalcarce.com`

**Nunca `.com.ar`** — no existe, es `.com`.

## 9. Botón de contacto / llamado a la acción

Todavía sin decidir cuál usar (WhatsApp o el correo del medio). Cuando se
decida:

- **Instagram:** Editar perfil → Opciones de contacto.
- **Facebook:** el botón de la página (hoy dice "Más información" o "Enviar
  mensaje") → apuntarlo a `radarbalcarce.com`.

## 10. Ubicación (sólo Facebook)

Configuración de la página → Información de la página → Ubicación:
**Balcarce, Buenos Aires**.

## 11. Historias destacadas fijas (sólo Instagram)

Cuatro, en este orden: **Farmacia · Teléfonos · Agenda · Clima**. La portada
de cada una: cuadrada pero pensada para verse bien recortada en círculo (un
ícono simple por tema alcanza; no hace falta texto).

## 12. Lo que NO hay que tocar todavía

- El botón de contacto (punto 9): falta decidir WhatsApp o correo.
- Nada de esto pide ninguna clave ni token: son sólo textos e imágenes,
  pegados a mano en cada app.

---

**Después de cargar todo:** avisame y reviso que se vea bien (te pido una
captura o lo miro si me pasás el enlace público del perfil), y lo marco como
hecho en `PENDIENTES.md`.
