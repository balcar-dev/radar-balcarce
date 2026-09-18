# La web de Radar Balcarce

Sitio público en Next.js. Lee un archivo estático (`data/portada.json`)
en vez de conectarse en vivo al panel — así funciona igual desplegado en
Vercel que corriendo en una PC. Ver el comentario al principio de
`scripts/generar-datos.mjs` para el porqué completo.

## Correr en tu máquina

```bash
cd web
npm install          # una sola vez
npm run dev           # genera los datos y levanta http://localhost:3000
```

Cada `npm run dev` o `npm run build` corre primero `npm run datos`, que
lee `../panel/datos/*.json` (lo que ya decidiste en el panel) y escribe
`data/portada.json`. Si el panel nunca corrió un ciclo, la web arranca
igual mostrando un aviso en vez de romperse.

Para actualizar los datos sin reiniciar el server de desarrollo:

```bash
npm run datos
```

(Necesitás recargar el navegador — Next no vuelve a leer el archivo solo
en modo `dev` para rutas ya visitadas. En producción cada request lee el
archivo de nuevo.)

## Publicar (Vercel)

No hace falta dominio para probar: alcanza con conectar este repo a
Vercel y va a quedar en algo como `radar-balcarce.vercel.app`. Dos formas:

- **Desde la web de Vercel**: "Add New Project", elegir este repo, **Root
  Directory: `web`** (importante — el proyecto Next.js vive en esa
  subcarpeta, no en la raíz del repo). El resto se detecta solo.
- **Con la CLI**: `npx vercel` parado en `web/`, siguiendo las preguntas.

## La pieza que falta para que esto ande solo

Hoy `data/portada.json` se genera a mano corriendo `npm run datos`. Para
que la web se actualice sola en producción falta decidir **dónde vive el
panel corriendo de forma permanente** (una PC prendida todo el día, un
VPS chico, o migrar las decisiones a una base de datos real más adelante)
y armar un paso de automatización (GitHub Actions u otro) que:

1. Corra `npm run datos` con los datos frescos del panel.
2. Commitee `web/data/portada.json` (es el único archivo de `panel/datos/`
   que se versiona — el resto son decisiones humanas que se quedan
   locales).
3. Ese commit dispara el redeploy automático en Vercel.

Es una decisión de infraestructura, no sólo de código — por eso quedó
anotada en `../NOTAS.md` en vez de resuelta a los ponchazos.
