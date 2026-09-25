# La web de Radar Balcarce

Sitio público en Next.js 15 (JavaScript), exportado como **HTML estático** y
servido por **Cloudflare Pages** en `radarbalcarce.com`. No se conecta en vivo
a nada: lee dos archivos que regenera GitHub Actions cada 30 minutos
(`../INFRAESTRUCTURA.md`):

- `data/portada.json`: lo que se **muestra** (portada, secciones, buscador,
  feed). Sólo notas de las últimas 72 horas.
- `data/agenda.json`: los **eventos de la agenda**, cada uno con su página
  (`/agenda/<nombre>-<id>`): los del municipio y los que se publican desde el
  panel (llegan por `data/eventos-panel.json`), hasta 60 días después de que
  pasan. Reglas en `lib/eventos.js` y `../EDITORIAL.md`.
- `data/archivo.json`: lo que tiene **página**. Todo lo publicado de los
  últimos 180 días (hasta 2500 notas). Así una nota que sale de la portada
  sigue teniendo su página y los enlaces que circulan no se rompen. La
  dirección de cada nota queda fija desde la primera publicación, aunque la IA
  cambie el titular. Reglas en `lib/archivo.js`.

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # genera los datos y levanta http://localhost:3000
npm run datos        # sólo regenera data/portada.json y data/archivo.json
npm run build        # compila (arma las redirecciones; NO regenera los datos)
```

`npm run datos` (`scripts/generar-datos.mjs`) arma `data/portada.json` y
`data/archivo.json` a partir de la ingesta y de las decisiones de
`data/decisiones.json`. Si nunca corrió,
la web arranca igual con un aviso.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `app/` | Las páginas: portada, `nota/`, `seccion/`, `tema/`, `agenda/` (y `agenda/[id]`, cada evento con su `.ics`), `farmacias/`, `util/`, `politica-de-privacidad/`, `quienes-somos/`, `contacto/`, la 404 (`not-found.js`, rescata direcciones viejas con `nota/indice.json`), más `sitemap`, `sitemap-news.xml`, `robots`, `feed.xml` y `llms.txt` |
| `components/` | Piezas de la interfaz (avisos, buscador, clima, ficha con datos estructurados, compartir) |
| `lib/` | Direcciones (`ruta.js`), archivo de notas (`archivo.js`), dirección del sitio (`sitio.js`), tarjetas de imagen (`tarjeta.js`) |
| `data/` | `portada.json`, `archivo.json` y `agenda.json` (los regenera Actions), `decisiones.json`, `avisos.json` y `eventos-panel.json` (los sube el panel), `redes.json` (libro de lo publicado) |
| `scripts/` | Generar datos y redirecciones, íconos, auditoría de SEO y `recuperar-archivo.mjs` (herramienta de rescate: rearma `data/archivo.json` desde el historial de git si se pierde o se rompe) |
| `public/` | Íconos, manifiesto, `_headers` (la imagen para compartir sale como `image/png`, HSTS y otros encabezados de seguridad, caché de un año para `/_next/static`) y `_redirects` (se genera en cada compilación) |

## Para saber más

- Cómo se eligen y escriben las notas: `../MANUAL.md`, `../EDITORIAL.md`.
- Qué reglas se cuidan en la portada: `../REGLAS.md`.
- SEO y auditoría: `../SEO.md`.
- Dónde corre y qué se cae: `../INFRAESTRUCTURA.md`.
