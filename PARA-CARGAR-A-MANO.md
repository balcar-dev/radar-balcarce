# Para cargar a mano: Facebook e Instagram

*Armado el 28/09/2026.* Esto es sólo la lista de tareas: dónde tocar en cada
app. **El texto para copiar y pegar está en `PERFILES.md`** (es el único
lugar donde vive, y una prueba cuida sus largos); los colores, en
`MEDIA-KIT.md`; las medidas, en `FORMATOS.md`. Qué quedó hecho y qué falta,
en `PENDIENTES.md` ("Para Hernán y Andrés", Biografías).

Nada de esto lo puede hacer Claude: son cuentas, y las contraseñas y los
botones de "guardar" los toca una persona.

---

## 1. La foto de perfil (Instagram y Facebook, la misma en las dos)

**Archivo:** `reels/salida/avatar.png` (el avatar azul, el mismo archivo en
las dos redes; cómo es, en `PERFILES.md`). **Ya subida el 28/09** en
Instagram y Facebook.

- **Instagram:** Editar perfil → tocar la foto → Cambiar foto de perfil.
- **Facebook:** la página "Radar Balcarce" → Editar foto de perfil.

Si hace falta un archivo nuevo (por ejemplo si volvés a cambiar el diseño):
```
node reels/avatar.mjs
```

## 2. La portada de Facebook

**Archivo:** `reels/salida/portada-facebook.png`. **Ya subida el 28/09** (la
azul).

- Página "Radar Balcarce" → Editar portada → Subir foto → elegí el archivo.
- Mirala después en el celular Y en la computadora: el avatar redondo tapa
  distinto en cada una (`FORMATOS.md`, "La portada de Facebook", lo explica).

Si hace falta un archivo nuevo:
```
node reels/portada.mjs
```

Instagram no tiene portada: sólo la foto de perfil.

## 3. Los textos (bio, información breve, descripción larga)

**El texto está en `PERFILES.md`**: los bloques "Bio de Instagram",
"Información breve de Facebook" y "Descripción larga de Facebook". Copiarlo
de ahí tal cual (no de otro lado: ahí lo cuida una prueba).

- **Instagram, bio** (ya cargada el 28/09): Editar perfil → Biografía →
  borrar todo y pegar.
- **Facebook, información breve y descripción**: Configuración de la página →
  Información de la página. El 28/09 la presentación quedó la que estaba: la
  página nueva tiene un solo campo, que ya junta la breve y la larga.

## 4. Nombre, usuario, categoría, enlace y ubicación

Qué poner en cada campo: las tablas de `PERFILES.md`. Dónde se toca:

- **Instagram, nombre** (ya cargado el 28/09) y **usuario** (`@radarbalcarce`,
  no tocar): Editar perfil.
- **Instagram, categoría** (falta): Editar perfil → Categoría.
- **Instagram, enlace** (falta; la web no deja editarlo, sólo el celular):
  Editar perfil. **Nunca `.com.ar`**: es `.com`.
- **Facebook, categoría y sitio web** (ya estaban): Configuración de la
  página → Categoría / Información de la página.
- **Facebook, ubicación** (cargada el 28/09): Configuración de la página →
  Información de la página → Ubicación.

## 5. Botón de contacto / llamado a la acción

Todavía sin decidir cuál usar (WhatsApp o el correo del medio). Cuando se
decida:

- **Instagram:** Editar perfil → Opciones de contacto.
- **Facebook:** el botón de la página (hoy dice "Más información" o "Enviar
  mensaje") → apuntarlo a `radarbalcarce.com`.

## 6. Historias destacadas fijas (sólo Instagram, falta)

Cuáles y en qué orden: `PERFILES.md`. La portada de cada una: cuadrada pero
pensada para verse bien recortada en círculo (un ícono simple por tema
alcanza; no hace falta texto).

## 7. Lo que NO hay que tocar todavía

- El botón de contacto (punto 5): falta decidir WhatsApp o correo.
- Nada de esto pide ninguna clave ni token: son sólo textos e imágenes,
  pegados a mano en cada app.

---

**Después de cargar todo:** avisame y reviso que se vea bien (te pido una
captura o lo miro si me pasás el enlace público del perfil), y lo marco como
hecho en `PENDIENTES.md`.
