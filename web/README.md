# La web de Radar Balcarce

*Actualizado el 29/09/2026.* El sitio público, en Next.js 15 (JavaScript),
exportado como **HTML estático** y servido por **Cloudflare Pages** en
`radarbalcarce.com`. Lee los archivos de `data/`, que GitHub Actions regenera
cada media hora ("Actualizar la web"). También vive acá **el panel del celular**
(`public/panel/`, publicado en `/panel/` sin indexar; `../docs/09-PANEL.md`).

**Cómo funciona todo:** [`../docs/06-WEB.md`](../docs/06-WEB.md) (los datos, la
tapa, las páginas, el archivo de 180 días, la dirección fija y el diseño). Cada
archivo, con una línea: `../docs/01-ARBOL.md`. Los colores, las letras y el
sistema tipográfico: `../MEDIA-KIT.md`. El SEO: `../SEO.md`.

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # arma los datos y levanta http://localhost:3000
npm run datos        # sólo arma los datos (scripts/generar-datos.mjs)
npm run build        # foto del dólar + redirecciones + next build (NO arma los datos)
```

Ojo:

- `npm run datos` en la PC trabaja en "modo PC": lee lo que buscó el panel de la
  PC (`../panel/datos/`), sin IA ni fotos nuevas, y deja modificados varios
  archivos de `data/` (`portada.json`, `archivo.json` y otros). **No se suben**:
  los arma GitHub. Antes de un `git pull`, `git checkout` de esos archivos (o, si
  chocan, `git checkout --theirs`).
- `npm run build` compila con lo que ya hay en `data/` (sin datos, arranca igual,
  con un aviso).
- Para corregir o retirar una nota no se toca el código: el panel del celular o
  `data/correcciones.json` y `data/retiradas.json` (`../docs/11-OPERACION.md`).
