# La web de Radar Balcarce

Sitio público en Next.js 15 (JavaScript), exportado como **HTML estático** y
servido por **Cloudflare Pages** en `radarbalcarce.com`. No se conecta en vivo
a nada: lee un archivo, `data/portada.json`, que regenera GitHub Actions cada
30 minutos (`../INFRAESTRUCTURA.md`).

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # genera los datos y levanta http://localhost:3000
npm run datos        # sólo regenera data/portada.json
npm run build        # compila (corre `datos` primero)
```

`npm run datos` (`scripts/generar-datos.mjs`) arma `data/portada.json` a partir
de la ingesta y de las decisiones de `data/decisiones.json`. Si nunca corrió,
la web arranca igual con un aviso.

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `app/` | Las páginas: portada, `nota/`, `seccion/`, `tema/`, `agenda/`, `farmacias/`, `politica-de-privacidad/`, más `sitemap`, `robots`, `feed.xml` y `llms.txt` |
| `components/` | Piezas de la interfaz (avisos, buscador, clima, ficha con datos estructurados, compartir) |
| `lib/` | Direcciones (`ruta.js`), dirección del sitio (`sitio.js`), tarjetas de imagen (`tarjeta.js`) |
| `data/` | `portada.json` (lo regenera Actions), `decisiones.json` y `avisos.json` (los sube el panel), `redes.json` (libro de lo publicado) |
| `scripts/` | Generar datos y redirecciones, íconos, auditoría de SEO |
| `public/` | Íconos y manifiesto |

## Para saber más

- Cómo se eligen y escriben las notas: `../MANUAL.md`, `../EDITORIAL.md`.
- Qué reglas se cuidan en la portada: `../REGLAS.md`.
- SEO y auditoría: `../SEO.md`.
- Dónde corre y qué se cae: `../INFRAESTRUCTURA.md`.
- Vercel sigue desplegando lo mismo como respaldo, pero ya no sirve el dominio.
