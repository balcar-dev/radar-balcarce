# Radar Balcarce — empezar acá

*Actualizado el 25/09/2026. Es una hoja de enlaces y de "qué hago yo": cómo
funciona cada cosa está en los otros documentos (ver el índice al final).*

## Los enlaces

| Qué | Dónde | Quién entra |
|---|---|---|
| **La web** | https://radarbalcarce.com | Cualquiera |
| Instagram | https://www.instagram.com/radarbalcarce | Cualquiera |
| Facebook | La página "Radar Balcarce" | Cualquiera |
| **El panel** | La dirección del túnel está en `panel/datos/DIRECCION-DEL-PANEL.txt`, en la PC (no va en el repo, que es público) | Andrés y Hernán |
| El panel, desde la PC | http://localhost:4321 | Igual |
| El código | https://github.com/balcar-dev/radar-balcarce | Público desde el 25/09 (no tiene ninguna clave) |
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
estuvieron escritas en este archivo hasta el 24/09; se cambiaron el 25/09), se
cambia y listo. Y se borra `panel/datos/CLAVES-INICIALES.txt` si todavía existe.

## Qué hace solo

Todo esto corre en GitHub, **con la PC apagada**:

- **Cada 30 minutos:** busca noticias en 45 fuentes, las agrupa, las clasifica,
  reescribe con IA las que van a salir sin revisión (título, copete y cuerpo),
  arma la web y la publica en Cloudflare Pages.
- **Varias veces por día (el reloj de las redes):** publica en Facebook y arma
  y sube a Instagram y a la página de Facebook lo que toca a esa hora: el clima,
  la farmacia, y tres podcasts de noticias (mañana, tarde y noche).
- **Cada 30 minutos (Vigilancia):** revisa que todo lo anterior ande y te
  escribe por WhatsApp si algo falla (anda desde el 25/09; a las 21 manda un
  resumen). Detalle: `INFRAESTRUCTURA.md`.
- **72 horas:** la portada muestra sólo las notas de las últimas 72 horas. Eso
  corre en la nube desde el 25/09 (antes lo hacía el panel, sólo con la PC
  prendida). Las notas más viejas siguen teniendo su página, así los enlaces
  que circulan no se rompen.

Los tres relojes los dispara **cron-job.org**. **Si alguno falla varias veces
seguidas, cron-job.org lo desactiva solo:** es lo primero que hay que mirar
cuando algo deja de salir.

## Qué hay que hacer a mano

- **Decidir las notas amarillas** en el panel: las que acusan a alguien
  (denuncia, detenido, imputado), hablan de una muerte o nombran a un chico.
  Esperan a una persona. **Política y Policiales, en la web, salen solas si el
  semáforo da verde; en las redes siempre esperan a una persona.** Si se
  quiere que en la web también esperen, está anotado en `PENDIENTES.md`.
- **Cargar avisos publicitarios**, eventos de la agenda y lo que llegue al buzón.
- **Prender o apagar las redes:** variable `REDES_ACTIVAS` en GitHub (con `Si`
  publica; con otra cosa, sólo simula).
- **Publicar una pieza a mano:** GitHub → Actions → **Piezas** → Run workflow.

Dos palabras que aparecen todo el tiempo: un **workflow** es una tarea
automática de GitHub (se ven en la pestaña Actions del repositorio; cada vez
que corre queda una "corrida" en verde, amarillo o rojo). Un **secreto** es una
clave guardada en GitHub (Settings → Secrets and variables → Actions) que los
workflows usan sin que nadie la vea; los carga una persona.

## Si algo dejó de salir

En este orden:

1. **¿Llegó un WhatsApp del vigilante?** Dice qué falló. Si no llegó ni el
   resumen de las 21, el problema puede ser el vigilante mismo: seguir con el 2.
2. **cron-job.org** (https://console.cron-job.org/jobs): ¿están **prendidos los
   tres trabajos** ("Actualizar la web", el reloj de "Redes" y "Vigilancia")?
   Si uno falla varias veces seguidas, cron-job.org lo apaga solo. Prenderlo.
3. **GitHub → Actions:** ¿hay alguna corrida en rojo? Abrirla y leer el paso
   rojo. (Un aviso amarillo de "Vigilancia" no es una falla: es lo que encontró.)
4. **La variable `REDES_ACTIVAS`** (GitHub → Settings → Secrets and variables →
   Actions → Variables): tiene que decir `Si`. Con otra cosa, las redes sólo
   simulan.
5. **¿La PC está prendida?** Sólo importa para el panel (decidir notas, cargar
   avisos). La web y las redes no la necesitan.
6. Si nada de eso explica la falla: la tabla "Qué se cae y cómo se ve" de
   `INFRAESTRUCTURA.md`.

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

- **`ARRANCAR.bat`** — levanta el panel, y sólo el panel. Doble clic después
  de prender la PC. La web no corre en la PC: la sirve Cloudflare Pages.

## Las cuentas

- **`radarbalcarce@gmail.com`** — el medio: Cloudflare, Vercel (apagado; falta borrarlo),
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
| `PERFILES.md` | Biografías y colores de las redes |
| `FORMATOS.md` | Medidas de imágenes y videos, con auditoría semanal |
| `SEO.md` | Cómo se posiciona la web y cómo se audita |
| `PANEL.md` | El tablero: pestañas, respaldo, sincronización y cómo pasarlo online |
| `PUBLICIDAD.md` | Los avisos, la competencia y cómo se piensa ganar plata |
| `COMERCIAL.md` | La base de comercios, la vigencia y las propuestas |
| `INVESTIGACION.md` | Lo legal, con las fuentes |
| `PENDIENTES.md` | **Qué falta, por categoría** |
| `IDEAS.md` | Ideas de producto |
| `POLITICA-PRIVACIDAD.md` | El texto de la política de privacidad |
| `docs/historico/` | Lo que ya no se mantiene: la historia con fechas (`HISTORIA.md`), la auditoría del 25/09 (`AUDITORIA.md`) y cómo se veían los otros medios (`INVESTIGACION-COMPETENCIA.md`) |

La lista completa está al final de `CLAUDE.md`.
