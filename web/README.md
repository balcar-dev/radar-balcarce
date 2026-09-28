# La web de Radar Balcarce

Sitio público en Next.js 15 (JavaScript), exportado como **HTML estático** y
servido por **Cloudflare Pages** en `radarbalcarce.com`. Lee los archivos de
`data/`, que regenera GitHub Actions cada 30 minutos ("Actualizar la web").

**Cómo funciona todo, paso a paso: [`../docs/06-WEB.md`](../docs/06-WEB.md)**
(cómo se arman los datos, qué guarda cada archivo de `data/`, la tapa, las
páginas, el archivo de 180 días, la dirección fija, las notas propias, el SEO y
el diseño). Cada archivo de esta carpeta, con una línea: `../docs/01-ARBOL.md`.
Los colores, las letras y el sistema tipográfico: `../MEDIA-KIT.md`.

## Correr en la máquina

```bash
cd web
npm install          # una sola vez
npm run dev          # arma los datos y levanta http://localhost:3000
npm run datos        # sólo arma los datos (scripts/generar-datos.mjs)
npm run build        # foto del dólar + redirecciones + next build (NO arma los datos)
```

Ojo:

- `npm run datos` en la PC trabaja en "modo PC": lee lo que buscó el panel
  (`../panel/datos/`), sin IA ni fotos nuevas, y deja modificados varios
  archivos de `data/` (`portada.json`, `archivo.json` y otros). **No se suben**:
  los arma GitHub. Antes de un `git pull`, `git checkout` de esos archivos (o,
  si chocan, `git checkout --theirs`).
- `npm run build` compila con lo que ya hay en `data/`. Si nunca se armaron
  los datos, la web arranca igual con un aviso.
- Para sacar o corregir una nota publicada no se toca el código:
  `data/retiradas.json` y `data/correcciones.json`
  (`../docs/11-OPERACION.md`).
