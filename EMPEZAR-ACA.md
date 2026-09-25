# Radar Balcarce — empezar acá

*Actualizado el 24/09/2026. Es una hoja de enlaces y de "qué hago yo": cómo
funciona cada cosa está en los otros documentos (ver el índice al final).*

## Los enlaces

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web** | https://radarbalcarce.com | Cualquiera |
| Instagram | https://www.instagram.com/radarbalcarce | Cualquiera |
| Facebook | La página "Radar Balcarce" | Cualquiera |
| **El panel** | https://radar-balcarce.tail4f06f0.ts.net | Andrés y Hernán |
| El panel, desde la PC | http://localhost:4321 | Igual |
| El código | https://github.com/balcar-dev/radar-balcarce | Privado |
| Cloudflare (la web, el dominio, las estadísticas) | https://dash.cloudflare.com | `radarbalcarce@gmail.com` |
| Trabajos automáticos (cron-job.org) | https://console.cron-job.org/jobs | `radarbalcarce@gmail.com` |
| Google Search Console | https://search.google.com/search-console | `radarbalcarce@gmail.com` |
| La guía comercial (vista previa) | https://claude.ai/artifact/EPFpaXCo83ryUimSvRnMvU | Privado |

## Cómo se entra al panel

Con el usuario y la contraseña de cada uno. **Las contraseñas no se escriben en
ningún documento ni se mandan por chat.** Para poner o cambiar una, en la PC
del panel:

```
node panel/clave.mjs hernan "la contraseña nueva"
```

Si en algún momento se difundió una contraseña (pasó con las iniciales, que
estuvieron escritas en este archivo hasta el 24/09), se cambia y listo. Y se
borra `panel/datos/CLAVES-INICIALES.txt` si todavía existe.

## Qué hace solo

Todo esto corre en GitHub, **con la PC apagada**:

- **Cada 30 minutos:** busca noticias en 33 fuentes, las agrupa, las clasifica,
  reescribe con IA las que van a salir sin revisión (título, copete y cuerpo),
  arma la web y la publica en Cloudflare Pages.
- **Varias veces por día (el reloj de las redes):** publica en Facebook y arma
  y sube a Instagram y a la página de Facebook lo que toca a esa hora: el clima,
  la farmacia, y tres podcasts de noticias (mañana, tarde y noche).
- **Cada 30 minutos (Vigilancia):** revisa que todo lo anterior ande y te
  escribe por WhatsApp si algo falla. Detalle: `INFRAESTRUCTURA.md`.
- **A las 72 horas:** archiva lo que nadie decidió.

Los tres relojes los dispara **cron-job.org**. **Si alguno falla varias veces
seguidas, cron-job.org lo desactiva solo:** es lo primero que hay que mirar
cuando algo deja de salir.

## Qué hay que hacer a mano

- **Decidir las notas amarillas** en el panel (Política, Policiales, denuncias,
  detenidos): esperan a una persona.
- **Cargar avisos publicitarios**, eventos de la agenda y lo que llegue al buzón.
- **Prender o apagar las redes:** variable `REDES_ACTIVAS` en GitHub (con `Si`
  publica; con otra cosa, sólo simula).
- **Publicar una pieza a mano:** GitHub → Actions → **Piezas** → Run workflow.

## Las dos cosas que hay que entender

**1. El panel vive en la PC de Hernán.** Si está apagada, no se pueden decidir
notas ni cargar avisos. **La web, las redes y la vigilancia siguen andando**.
Lo que el panel decide se sube solo a GitHub unos segundos después.

**2. El panel está abierto a internet** (Tailscale Funnel) y lo protege sólo la
contraseña. Para cerrarlo:

```
tailscale funnel --https=443 off
```

## Los botones de la carpeta

- **`ARRANCAR.bat`** — levanta el panel. Doble clic después de prender la PC.
- **`PUBLICAR.bat`** y **`publicar-automatico.bat`** — quedaron por si hace
  falta publicar desde la PC; ya no son necesarios, la web se publica sola.

## Las cuentas

- **`radarbalcarce@gmail.com`** — el medio: Cloudflare, Vercel (respaldo),
  Tailscale, Instagram, Facebook, Meta, Gemini, cron-job.org, Search Console.
- **`balcardev@gmail.com`** — lo técnico: GitHub.

## Dónde está explicado cada tema

| Documento | Qué cuenta |
|---|---|
| **`REGLAS.md`** | **Lo que se pidió que se cumpla siempre** (y las pruebas que lo vigilan) |
| `INFRAESTRUCTURA.md` | Dónde vive cada cosa, los relojes, los secretos y la vigilancia |
| `MANUAL.md` | Cómo se eligen las noticias: puntaje, semáforo, qué sale solo |
| `EDITORIAL.md` | Las secciones y **cómo se escriben las notas** |
| `REDES.md` | Qué se publica en Instagram y Facebook, a qué hora y con qué reglas |
| `PERFILES.md` | Biografías, imágenes y colores de las redes |
| `SEO.md` | Cómo se posiciona la web y cómo se audita |
| `PANEL.md` | El tablero: qué hace cada pestaña |
| `PUBLICIDAD.md` | Los avisos, la competencia y cómo se piensa ganar plata |
| `COMERCIAL.md` | La base de comercios, la vigencia y las propuestas |
| `INVESTIGACION.md` | Lo legal, con las fuentes |
| `INVESTIGACION-COMPETENCIA.md` | Cómo se ven los otros medios |
| `PENDIENTES.md` | **Qué falta, por categoría** |
| `IDEAS.md` | Ideas de producto |
| `HISTORIA.md` | Qué se hizo y por qué (histórico) |
