# Radar Balcarce — todo en una hoja

*Actualizado el 21/09/2026.*

## Los links

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web pública** | https://radarbalcarce.com | Cualquiera |
| Instagram | https://www.instagram.com/radarbalcarce | Cualquiera |
| Facebook | La página "Radar Balcarce" | Cualquiera |
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
- **Cada 2 horas**: regenera la web y la publica. Lo hace el panel mismo, así
  que mientras el panel esté corriendo, la web se actualiza sola. Si algo
  falla, queda escrito en `panel/datos/publicaciones.log`.
- **A las 72 horas**: archiva lo que quedó sin decidir.

### Solo, desde GitHub (con la PC apagada)

- **Cada 30 minutos**: actualiza la web y la publica.
- **Varias veces por día** (el reloj de las redes): publica **una** nota en la
  página de Facebook, si hay alguna fuerte y reciente (cinco por día como máximo,
  entre las 8 y las 22, nunca Política ni Policiales), y sube a Instagram y a la
  página de Facebook la historia o el reel que le toca a esa hora (clima,
  farmacia, noticias, podcast; el mismo video en las dos redes).
  Lo dispara cron-job.org cada 30 minutos (el planificador propio de GitHub no era
  confiable). Si falta una pieza, se puede publicar a mano (Actions → Redes →
  Run workflow → `reloj`).

### A mano

- **Decidir las notas amarillas** en el panel. Son las que pueden traer
  problemas: denuncias, intendente, gremios, detenidos.
- **Historias y reels de Instagram**: salen solos. Si alguna vez hace falta
  publicar una a mano: GitHub → Actions → **Piezas** → Run workflow (en `solo` la
  pieza, y tildar `publicar`). Horarios y reglas: `REDES.md`.
- **Prender o apagar las redes**: variable `REDES_ACTIVAS` en GitHub (Settings →
  Secrets and variables → Actions → Variables). Con `Si` publica; con otro
  valor sólo simula.
- **Cargar eventos** que no estén en la agenda del municipio.

## Los tres botones que importan

En la carpeta del proyecto:

- **`ARRANCAR.bat`** — levanta el panel y la web local. Doble clic después de
  prender la PC.
- **`PUBLICAR.bat`** — publica ahora, sin esperar las 2 horas. Te muestra lo
  que va pasando.
- **`publicar-automatico.bat`** — quedó por si alguna vez hace falta publicar
  desde afuera del panel. No hace falta usarlo.

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
  Facebook, Meta (la app "Radar Balcarce Publicador"), Gemini, el mail de
  contacto.
- **balcardev@gmail.com** — lo técnico: GitHub.

## Dónde está cada cosa explicada

| Archivo | Qué cuenta |
|---|---|
| `MANUAL.md` | Cómo se curan las noticias: puntaje, semáforo, qué sale solo |
| `REDES.md` | **Qué se publica en redes, a qué hora y con qué reglas**, cómo está conectado Meta, la competencia y los avisos |
| `INVESTIGACION.md` | Lo legal, con las fuentes |
| `PENDIENTES.md` | **Qué falta, por categoría** |
| `NOTAS.md` | Historia del proyecto: qué se hizo y por qué |

## Lo que falta

Todo lo pendiente, por categoría, está en [`PENDIENTES.md`](PENDIENTES.md).
