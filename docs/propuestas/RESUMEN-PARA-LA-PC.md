# Resumen para la PC · 9/10/2026 (noche)

*Este es el documento para retomar. Si algo de acá no coincide con el código, manda el código. Lo detallado está en
[`PENDIENTES-AL-9-10.md`](PENDIENTES-AL-9-10.md); la guía comercial, en [`MAPA-COMERCIAL-PLAN.md`](MAPA-COMERCIAL-PLAN.md) y en el proyecto aparte.*

## 1. Estado del repositorio

- **Rama `main`, sincronizada con GitHub.** Todo lo de hoy está commiteado y subido (último commit de Claude: `f03c3b5e`, más los automáticos de la web y las redes).
- **Pruebas:** `npm test` pasa todas (2.015 hasta el último cambio de hoy).
- **Árbol limpio:** no quedan archivos sin guardar de Claude.
- **Proyecto aparte** (no está en GitHub): `D:\BalcarDev\Base Comercial Balcarce`, con su propio historial local.
- **Respaldo local** del repositorio completo: `D:\BalcarDev\Respaldos\radar-balcarce-2026-10-09.bundle` (verificado).

## 2. Lo que quedó hecho hoy (9/10)

**Piezas de redes**
- Las plantillas animadas que aprobaron (clima, avisos, farmacia, efeméride, feriado, Participá, útiles y agenda) salen en las piezas de todos los días. Si algo falla, sale la placa de siempre (regla 157). `REELS_ESCENAS=no` las apaga todas.
- Las escenas de clima ya tienen el mismo tamaño y el pronóstico ilustrado.
- Farmacia: se dejó de anunciar cuántas hay; las fichas entran con una, dos o tres.
- Participá: rediseño de pies y del sobre; la pieza de «Tu nota» tiene una invitación más abierta.
- Repaso de la mañana: sacamos «lo que hay para saber esta mañana», que sonaba mal.
- Subtítulos: nunca se encimen dos carteles (los de la historia del 9/10).
- Portada de los Reels: el primer cuadro es la pieza ya armada, no papel vacío (regla 159). Así los Reels no se ven en blanco en la grilla.
- Las notas sin foto muestran la placa de su sección también en las listas.
- Escenas de deporte (F1 y fútbol): hechas, sin conectar; el fútbol es neutral, sin equipo destacado.

**Notas y datos**
- Nota del sprint de la F1: podio, puntos, Colapinto y horarios de lo que sigue (regla 158). La clasificación sprint y las prácticas no se hacen: Jolpica no da ese dato.

**Web e infraestructura**
- Chequeo del límite de 20.000 archivos de Cloudflare en cada armado (avisa desde 14.000).
- Caché de un año para fuentes y escudos; caché de npm y de Next en el despliegue.
- Medido el peso real: portada 16 KB comprimida, una nota 11 KB, JavaScript y CSS unos 155 KB (compartidos).
- Reloj propio en Cloudflare, preparado pero **sin activar** (para reemplazar a cron-job.org).

**Documentos**
- `PENDIENTES-AL-9-10.md`, `CLAVES-DE-IA.md`, `MAPA-COMERCIAL-PLAN.md`, y este resumen.
- Reglas 157, 158 y 159 anotadas en `docs/10-REGLAS-Y-PRUEBAS.md`. La próxima regla es la 160.

## 3. Lo que hace Claude solo (sin ustedes)

1. Mirar mañana que salgan bien: el clima de las 7, las efemérides de las 9, la portada de los Reels, y el armado de Participá del sábado a las 5:30.
2. Miniaturas livianas y fotos en WebP (mejora fuerte para el celular).
3. Quitar el dominio de `/compartir` a los videos pesados (ahora viajan en cada despliegue).
4. Limpiar los documentos viejos (hay contradicciones: Next 15 o 16, fechas del 29/09, «respaldo» o «en desuso» del panel de la PC).
5. Lista de «frenado en rojo» de solo lectura en el panel del celular.
6. Cifrar el texto de las pistas (lo hago después de avisarles, es delicado).
7. Contar los créditos de Tavily en el WhatsApp.
8. Medir la originalidad de las notas con varias fuentes, para ver dónde conviene empezar.
9. Unificar la guía comercial con OpenStreetMap, en el proyecto aparte (sin datos personales en Radar).

## 4. Lo que tienen que hacer ustedes (en orden sugerido)

**Esta semana, en la PC**
1. **Activar el respaldo externo** (GitLab y Cloudflare R2). Hoy el único historial está en GitHub. Pasos en [`PASOS-PARA-USTEDES.md`](PASOS-PARA-USTEDES.md), §1.
2. **Aprobar los pull requests de afuera** en GitHub: Settings → Actions → General → «Require approval for all outside collaborators».
3. **Search Console:** entrar con la cuenta del medio (radarbalcarce@gmail.com) y mirar las 409 páginas sin indexar y los 9 errores 404. El Chrome que se usó hoy entra con otra cuenta.
4. **Cloudflare:** decidir si se permite a los buscadores con IA (robots.txt).
5. **Borrar el proyecto de Vercel** y limpiar el DNS (apagado desde el 25/9).
6. **Bios y perfiles** de Instagram y Facebook (bio, categoría, enlace, botón de WhatsApp, 5 historias destacadas).
7. **Mail de prueba** a contacto@, redaccion@ y publicidad@, y decidir «Enviar como» en Gmail.
8. **cron-job.org:** revisar que los tres trabajos estén activos y con su token.
9. **Reloj de Cloudflare** (cuando quieran dejar de depender de cron-job.org): cargar el secreto `RELOJ_GITHUB_TOKEN` en GitHub y correr «Reloj de Cloudflare» a mano. Está en `docs/08-INFRAESTRUCTURA.md`.

**Con fecha**
- **Antes del 19/10:** lista de finalistas de los Juegos Bonaerenses (19 al 23/10). Claude arma la nota.
- **Antes del 25/10:** decidir Participá (las piezas fijas vencen el 31/10).
- **20/10:** efemérides de noviembre: Claude las arma; ustedes las aprueban en la pestaña Fechas → Mes armado (antes del 31/10).
- **21/10:** Next 15 deja de recibir parches. Decidir: quedarse o pasar a Next 16 (requiere R2).
- **Antes del 2/12:** elegir R2 por mes o D1 para el archivo de notas (se llega a 3.500 notas con página).

**Decisiones que frenan trabajo**
- Firma de lo que escribe Claude, y nombres para «Quiénes somos».
- Qué medios argentinos cuentan para que una pista salga sola.
- Línea editorial (centro y centro-derecha): hay un borrador sin aplicar.
- Ampliar la lista roja con edades y verbos («violaron a una nena»). Es regla de menores: conviene decidirlo pronto.
- Seguimiento comercial en un lugar privado, antes del primer mensaje a un comercio.
- Menú de 15 secciones (el código tiene 11): maqueta primero, no se toca sin aprobar.
- Policiales y Política: ¿esperan también en la web?
- Clave paga de Gemini: reactivar o dejar.
- Panel de la PC: ¿se retira?
- YouTube y TikTok: cómo se publican (manual desde Chrome, con OK por video).
- Piezas de deporte: cuándo salen y si con voz (el cupo de voz es de 10 por día).
- **Guía comercial (1.282 comercios):** ¿la seguimos en el proyecto aparte? Antes de usar datos de Google Maps o celulares de personas, hay que verificar el origen.

## 5. Cuidados que no hay que olvidar
- No subir a GitHub la guía comercial con datos personales (`datos-recibidos/` del proyecto aparte).
- Las claves y tokens nunca en un chat ni en el código: van a GitHub Secrets o al `.env`.
- El cupo de voz (10 por día) es justo: no conviene sumar piezas con voz sin contar.
