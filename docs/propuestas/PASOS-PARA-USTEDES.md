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

Se hace sobre lo anterior (mismo R2). Cuando tengan el depósito y el permiso del punto 1b, me avisan y sigo yo: una variable (`FOTOS_BASE`)
para que todas las direcciones de foto salgan de un solo lugar, el robot que sube las fotos nuevas, y pasar las 592 que hay.
Ver [`registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md`](registro/AUDITORIA-EXTERNA-4-ARQUITECTURA-2026-10-08.md), etapa 1.

## 3. Lo que no hace falta que hagan

Nada del semáforo, las pruebas, el archivo ni las efemérides: eso ya está hecho y anotado en [`PRIORIDADES.md`](PRIORIDADES.md).
