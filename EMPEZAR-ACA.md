# Radar Balcarce — todo en una hoja

*Actualizado el 18/09/2026.*

## Los links

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web pública** | https://radar-balcarce-six.vercel.app | Cualquiera |
| **El panel** | https://radar-balcarce.tail4f06f0.ts.net | Andrés y Hernán |
| El panel, desde esta PC | http://localhost:4321 | Igual |
| El código | https://github.com/balcar-dev/radar-balcarce | Privado |
| El diseño | https://claude.ai/artifact/75naN212ghc8Y8xuw2A5B5 | Privado |

## Cómo se entra al panel

```
andres   i535-if7c-c9ub-7mp5
hernan   zcwy-dahd-qbzd-yfih
```

Para cambiar una clave, en la PC del panel:

```
node panel/clave.mjs hernan "la clave que quieras"
```

Están también en `panel/datos/CLAVES-INICIALES.txt`. **Borrá ese archivo**
cuando las tengas guardadas en otro lado.

## Qué hace solo y qué hay que hacer a mano

### Solo, sin que nadie toque nada

- **Cada 10 minutos**: busca noticias en 22 fuentes, agrupa las repetidas,
  las clasifica y les pone puntaje.
- **Cada 10 minutos**: reescribe con IA las notas que van a salir sin que
  nadie las mire (las verdes). Doce por vuelta.
- **Cada 2 horas, de 7 a 23**: regenera la web y la publica. Es una tarea de
  Windows llamada "Radar Balcarce - publicar".
- **A las 72 horas**: archiva lo que quedó sin decidir.

### A mano

- **Decidir las notas amarillas** en el panel. Son las que pueden traer
  problemas: denuncias, intendente, gremios, detenidos.
- **Publicar en redes**. Las piezas se generan con `node reels/plan.mjs
  --generar` y quedan en `reels/salida`. Subirlas es manual hasta que Meta
  apruebe la app.
- **Cargar eventos** que no estén en la agenda del municipio.

## Los tres botones que importan

En la carpeta del proyecto:

- **`ARRANCAR.bat`** — levanta el panel y la web local. Doble clic después de
  prender la PC.
- **`PUBLICAR.bat`** — publica ahora, sin esperar las 2 horas. Te muestra lo
  que va pasando.
- **`publicar-automatico.bat`** — no lo abras: lo usa la tarea programada.

## Las dos cosas que hay que entender

**1. El panel vive en esta PC.** Si la apagás, Andrés ve "no se puede
acceder" y la web deja de actualizarse. La web sigue online igual, con los
últimos datos publicados, porque vive en Vercel.

**2. El panel está abierto a internet.** Lo protege sólo la contraseña. Si en
algún momento querés cerrarlo:

```
tailscale funnel --https=443 off
```

## Las cuentas

- **radarbalcarce@gmail.com** — el medio: Vercel, Tailscale, Instagram,
  Facebook, el mail de contacto.
- **balcardev@gmail.com** — lo técnico: GitHub.

## Dónde está cada cosa explicada

| Archivo | Qué cuenta |
|---|---|
| `MANUAL.md` | Cómo se curan las noticias: puntaje, semáforo, qué sale solo |
| `REDES.md` | La competencia, dónde van los avisos, el plan de redes |
| `INVESTIGACION.md` | Lo legal, con las fuentes |
| `NOTAS.md` | Estado del proyecto y qué falta |

## Lo que falta

1. Borrar el sitio duplicado en la cuenta vieja de Vercel (`radar-balcarce.vercel.app`).
2. Abrir Instagram y Facebook, y publicar a mano las primeras semanas.
3. Pedirle a Meta los permisos para publicar solo.
4. El dominio propio (~$5.000 al año en NIC.ar).
5. Regenerar la clave de Gemini.
6. Sacar el panel de esta PC, para que no dependa de que esté prendida.
