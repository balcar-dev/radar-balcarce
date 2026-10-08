# Lo que hay que hacer con las manos (paso a paso)

*8/10/2026. Son las cosas que dejé preparadas pero que sólo una persona puede hacer, porque piden cuentas, tarjetas o pegar claves.
Ninguna se pega en un chat: van a GitHub o a Cloudflare. Con cada paso hecho, avisen y sigo yo.*

## 1. Respaldo (lo primero)

El workflow **"Respaldo"** ya existe y corre solo los domingos (también a mano: GitHub → Actions → Respaldo → Run workflow). Sin hacer nada
deja, cada vez, un archivo con todo el historial y otro con los datos y las fotos, que se bajan de la página de la corrida (se guardan 90
días). Para que además haya copias en **otros lugares**:

**a) GitLab (gratis)**
1. Crear una cuenta en gitlab.com (con `radarbalcarce@gmail.com`) y un proyecto **vacío**, privado, por ejemplo `radar-balcarce`.
2. En el proyecto: Settings → Access tokens → crear un token con el permiso **write_repository** (rol Maintainer). Copiarlo.
3. En GitHub, repositorio → Settings → Secrets and variables → Actions:
   - Secret nuevo `GITLAB_TOKEN` con ese token.
   - Variable nueva `GITLAB_REPO` con `usuario/proyecto` (por ejemplo `radarbalcarce/radar-balcarce`).
4. Correr "Respaldo" a mano y mirar el resumen: tiene que decir "GitLab: espejo subido".

**b) Cloudflare R2 (sirve también para las fotos, ver el punto 2)**
1. En Cloudflare (cuenta `radarbalcarce@gmail.com`) → R2 → activar R2 (pide una tarjeta aunque no cobra mientras se use poco).
2. Crear un depósito privado, por ejemplo `radar-respaldos`.
3. Ampliar el token de Cloudflare que ya usa el sitio (`CLOUDFLARE_API_TOKEN`): My Profile → API Tokens → agregar el permiso
   **Account → Workers R2 Storage: Edit** (o crear uno nuevo con ese permiso y pegarlo en el mismo secreto).
4. En GitHub: variable nueva `R2_RESPALDOS` con el nombre del depósito.
5. Correr "Respaldo" a mano: "Cloudflare R2: subido".

**c) Google Drive y la PC**: cada domingo, bajar el archivo de la última corrida de "Respaldo" y guardarlo en Drive y en la PC. Es manual
a propósito (conectar Drive pide una cuenta de servicio; si quieren, lo armamos después). El vigilante avisa por WhatsApp si pasan más
de 10 días sin un respaldo bueno.

## 2. Fotos a Cloudflare R2

Lo que ya quedó hecho (8/10): todas las direcciones de foto de las páginas salen de un solo lugar (`web/lib/fotos.js`) y hay un workflow,
**"Fotos a R2"**, que copia las 592 fotos al depósito (sólo copia: no borra nada ni cambia lo que ve el lector). Con el depósito
y el permiso del punto 1b, falta esto, a mano:
1. Crear otro depósito en R2 para las fotos, por ejemplo `radar-fotos`.
2. En ese depósito → Settings → **Custom domains** → conectar `fotos.radarbalcarce.com` (el dominio ya está en Cloudflare, lo hace solo).
3. En GitHub → Settings → Secrets and variables → Actions → variable `R2_FOTOS` = `radar-fotos`.
4. Correr "Fotos a R2" (Actions → Run workflow). Tarda unos 15 minutos. El resumen dice cuántas subió.
5. Abrir `https://fotos.radarbalcarce.com/fotos-notas/` + el nombre de cualquier foto del sitio y comprobar que se ve.
6. Recién ahí, en GitHub, variable `FOTOS_BASE` = `https://fotos.radarbalcarce.com`. Desde la corrida siguiente las páginas cargan las fotos de
   ahí. Para volver atrás se borra la variable.

**Qué NO hace todavía:** las fotos siguen también en el repositorio y se siguen subiendo con el sitio, porque las tarjetas para compartir
(Instagram, Facebook) se arman en la compilación leyendo el archivo local. Sacarlas del repositorio es la etapa siguiente
([plan](registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md)), y se hace después de ver que todo anda con `FOTOS_BASE`.

## 3. Lo que no hace falta que hagan

Nada del semáforo, las pruebas, el archivo ni las efemérides: eso ya está hecho y anotado en [`PRIORIDADES.md`](PRIORIDADES.md).
