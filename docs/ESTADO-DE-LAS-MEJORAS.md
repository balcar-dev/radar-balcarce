# Estado de las mejoras: qué se pidió, qué se hizo y qué falta

*Medido el 16/10/2026 (8 a 9 de la mañana), contra el código, los workflows de GitHub y radarbalcarce.com. Para Hernán y Andrés. Existe también la versión para el celular: `docs/ESTADO-DE-LAS-MEJORAS.html`.*

**Respuesta corta a «¿repasaste los archivos? ¿se mejoró todo?»**: sí se repasaron (auditorías de Opus y de ChatGPT, las etapas 1 a 10, analíticas, criterio, salud técnica, SEO, feeds, redes y fotos) y **no, no se mejoró todo**. Lo que más se avanzó fue avisos, fuentes, duplicados, semáforo, verificador y SEO técnico. Lo que casi no se tocó: pasar el motor a Cloudflare, el puntaje y la clasificación, los modelos chicos, la poda de pruebas, las correcciones visibles y todo lo que dependía de decisiones de ustedes.

## Resumen

Se revisaron 144 recomendaciones o hallazgos.

| Estado | Cantidad | % |
|---|---|---|
| ✅ Hecho y andando | 32 | 22 % |
| 🟡 Hecho pero sin conectar o a medias | 27 | 19 % |
| ⬜ Pendiente | 55 | 38 % |
| 🔵 Decisión de ustedes | 30 | 21 % |

Si se cuenta sólo lo que depende de Claude (sin las 30 decisiones de ustedes): **28 % hecho y andando**, 24 % a medias, 48 % pendiente.

**Por tema**

| Tema | Filas | ✅ | 🟡 | ⬜ | 🔵 |
|---|---|---|---|---|---|
| Infraestructura y continuidad | 29 | 5 | 7 | 13 | 4 |
| Fuentes | 11 | 3 | 3 | 3 | 2 |
| Selección y duplicados | 12 | 3 | 1 | 5 | 3 |
| Escritura y verificación | 15 | 3 | 1 | 8 | 3 |
| Semáforo y límites legales | 20 | 4 | 5 | 5 | 6 |
| Fotos | 7 | 1 | 2 | 3 | 1 |
| Redes | 12 | 2 | 3 | 3 | 4 |
| Analíticas | 7 | 3 | 2 | 2 | 0 |
| SEO y asistentes de IA | 12 | 4 | 1 | 3 | 4 |
| Panel del celular y seguridad | 6 | 0 | 0 | 5 | 1 |
| Pruebas | 6 | 1 | 1 | 4 | 0 |
| Costos | 3 | 1 | 0 | 0 | 2 |
| Documentación | 4 | 2 | 1 | 1 | 0 |

Cómo leerlo: ✅ hecho y andando en producción · 🟡 hecho pero sin conectar o a medias · ⬜ pendiente · 🔵 decisión de ustedes.

**Cómo se verificó**

- Cada fila sale de un documento de las auditorías y se comparó con el código, con los workflows de GitHub (`gh run list`) o con el sitio en vivo. Cuando un documento dice una cosa y el código otra, manda el código.
- Lo que no se puede verificar desde acá (si llegaron los mails, la verificación en dos pasos, el titular del dominio, lo que hay dentro de Cloudflare) figura como «Decisión de ustedes» o con aclaración, y no como hecho.
- Medido el 16/10/2026 entre las 8 y las 9 de la mañana, sobre lo que está en `origin/main`. `npm test` en la PC: 2.507 pruebas, 2.504 bien, 3 salteadas, ninguna falla.

## Lo que pidieron el 15/10, punto por punto

Resultado: 3 hechos, 9 a medias, 1 pendientes.

| Pedido | Estado | Qué hay | Qué falta |
|---|---|---|---|
| Mudar el repositorio a la cuenta radarbalcarce | ✅ | El repositorio es radarbalcarce/radar-balcarce (commit eb24e9e1) y el Worker reloj ya dispara desde ahí. Sigue siendo público. | Nada de código. |
| Dar acceso a 3 mails | 🟡 | Como colaboradores figuran agerace y balcar-dev (más la dueña, radarbalcarce). Hernán no aparece en la lista. Sin permisos de administrador no se pueden ver las invitaciones pendientes. | Confirmar que Hernán aceptó la invitación (GitHub, Settings, Collaborators). |
| Unificar los perfiles de todas las redes | 🟡 | Hay un solo texto oficial y la página /compartir al día (commit 012a3b0d, PERFILES.md). | Pegar las bios y completar categoría, enlace, botón de WhatsApp e historias destacadas: lo hacen ustedes. |
| Repensar TODO, de la fuente a la nota | 🟡 | Las 10 etapas están analizadas por escrito. Se aplicó: fuentes (etapa 1), duplicadas, parches del semáforo, verificador y entrada ampliada para la IA. No se aplicó: clasificación nueva, puntaje, ficha de sensibilidad con IA, motor en la base de datos. | Seguir etapa por etapa, con sus decisiones. |
| Usar Cloudflare mucho más y GitHub mucho menos | 🟡 | Pasaron a Cloudflare el reloj, el vigilante y los avisos por mail. El motor de noticias, las redes, la vigilancia y la compilación del sitio siguen en GitHub Actions. Diseño y esquema de base de datos listos, sin conectar. | Fases 1 a 5 de docs/etapa-10-operacion/ANALISIS.md. |
| Muchos menos tests | 🟡 | Salieron de la vuelta de 30 minutos: ahora sólo corre el núcleo legal (30 archivos, unos 3 segundos). Pero la suite creció: 193 archivos y 2.507 pruebas hoy, contra 169 y 2.039 a la mañana. | Podar de verdad: la suite magra propuesta tiene 44 archivos. |
| Buenas analíticas | 🟡 | Se arreglaron los ceros falsos, se repararon los días en cero, hay enlaces con origen (UTM), registro de gasto de IA (parcial) e informe diario. No hay contador propio ni lectura de Search Console. | Contador propio sin robots, Search Console, tablero de diez números. |
| Fuentes: todas las de Balcarce + las 50 mejores del país + las 10 mejores de Tandil y Mar del Plata | ✅ | Aplicado: 103 feeds de 71 medios (11 de Balcarce, 10 de la zona, 50 del país). Está en FUENTES.md y en el commit c1600ac2. | Sumar las fuentes nuevas de Balcarce que se investigaron (35, sin aprobar todavía). |
| Repensar búsqueda, escritura, puntaje y semáforos | 🟡 | Escritura (entrada ampliada, regla 174) y semáforo (reglas 172, A1 a A3) mejorados. El puntaje no cambió (la función relevancia() es la de antes). La búsqueda en internet para la redacción se dejó para después. | Puntaje nuevo, ficha de sensibilidad, piloto de búsqueda. |
| Auditar con Opus y consultar a otras IAs por errores heredados | ✅ | Hecho: auditoría de Opus (52 KB), revisión de código (19 hallazgos) y consulta a ChatGPT. Grok y Meta AI piden iniciar sesión y no se consultaron; Gemini tampoco. | Si quieren, consultar a Gemini; la auditoría final de Opus queda para después de la pasada «qué sirve y qué no». |
| Que el sitio dure años | 🟡 | Tope de notas subido a 3.700 y diseño del archivo permanente (Worker más R2) construido y probado, pero sin activar. El tope se alcanza hacia el 10/12. | Crear los depósitos, pasar las fotos a R2 y activar antes del 25/11. |
| Registrar «qué sirve y qué no» | 🟡 | Está la tabla de herramientas y servicios (etapa 10, sección 7) y el mapa de 13 módulos (salud técnica). La pasada módulo por módulo, con ustedes, no se hizo. | La pasada conjunta anotada en PENDIENTES.md. |
| Modelos chicos y baratos para lo repetitivo, y paralelizar | ⬜ | En producción sólo hay Gemini y Groq: no hay ni un modelo de Claude, Mercury ni embeddings en el código. Hay diseño de qué modelo va en cada tarea y pruebas de modelos en pruebas-modelos/. Sí se trabajó con agentes en paralelo para las auditorías. | Elegir modelos con pruebas (prueba a ciegas de 30 notas) y crear las claves. |

## Lo que sigue, en orden

**Esta semana, antes de que pase algo**

1. Policiales: decidir (Hernán) si los de Balcarce esperan siempre a una persona también en la web, y mientras tanto cambiar el texto de «Quiénes somos», que hoy promete algo que no pasa (11 de 13 notas de Policiales salieron solas). Confirmar además las dos notas ya retiradas. *Por qué: Legal. Es lo único que puede salir mal en serio.*
2. Que el informe de las 8:15 y las 21:15 lo dispare el Worker: mirar los registros de radar-balcarce-reloj en Cloudflare. Hoy sale sólo por el respaldo, con retraso. *Por qué: Es rápido y es lo que pidieron para enterarse de cómo viene el día.*
3. Respaldo con una segunda copia fuera de GitHub y de Cloudflare, más verificación en dos pasos, gestor de contraseñas y dos administradores en cada cuenta. *Por qué: Hoy, si se pierde una cuenta, se pierde todo. Lo hacen ustedes; Claude deja los pasos.*
4. Antes del 21/10: parche de Next 15 y decidir qué se hace después. *Por qué: Deja de recibir parches de seguridad.*

**Este mes (antes del 25/11)**

1. Fotos a R2 y archivo permanente de notas (crear los depósitos, activar el Worker). *Por qué: El tope de 3.700 notas se alcanza hacia el 10/12 y desde ahí los enlaces viejos darían 404.*
2. Correcciones visibles (línea al pie y página pública), página «Quién escribe y cómo corregimos», proceso de rectificación y probar los mails contacto@, redaccion@ y publicidad@. *Por qué: Confianza del lector y de Google; es barato.*
3. Empezar a mirar Search Console una vez por semana y dar de alta Bing. *Por qué: Hoy Google trae el 1 % de las visitas y nadie sabe por qué. Decide si se manda a noindex lo nacional.*
4. Una sola compilación por vuelta y pasar vigilancia, auditoría y pistas a Workers. *Por qué: Ahorra más de la mitad de los minutos de GitHub y es el camino al repositorio privado.*
5. Elegir modelos con pruebas (prueba a ciegas de 30 notas) y conectar el registro de uso de IA a la lectura, las voces y las pistas. *Por qué: Hasta ahora nada de «modelos chicos para lo repetitivo» llegó al sistema.*

**Después (a medida que las etapas se destraban)**

1. Aprobar y sumar las fuentes nuevas de Balcarce (35 investigadas) y reactivar las apagadas por bloqueo que ahora andan. *Por qué: Etapa 1, que sigue abierta.*
2. Clasificación nueva (tipo y lugar), puntaje nuevo, equilibrio de la tapa y ficha de sensibilidad con IA (esta última sólo con el sí de Hernán). *Por qué: Etapas 2 a 6; es donde se corta el ruido que todavía sale.*
3. Podar la suite de pruebas (de 193 archivos a unos 44 de núcleo más las de cada área) y borrar el panel de la PC y comercial/. *Por qué: Pidieron «muchos menos tests» y la suite creció.*
4. Contador propio de visitas sin robots y tablero de diez números. *Por qué: Hoy el 43 % de las vistas viene de afuera de Argentina.*
5. Respetar robots.txt y consultar a un abogado (reescritura con IA y fotos de medios nacionales). *Por qué: Riesgo de reclamo; se resuelve con una regla y una consulta.*
6. Motor de noticias en Cloudflare y sitio sin compilar, y recién ahí el repositorio privado. *Por qué: El rediseño grande; el diseño ya está escrito.*

## Todas las recomendaciones, por tema

### Infraestructura y continuidad

*Que el medio ande sin nadie mirando y no dependa de una sola cuenta o de un solo lugar.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Los avisos estaban muertos desde el 1/10 (WhatsApp sin cupo): pasarlos a mail | Opus O1 · Etapa 6-9 · ChatGPT | ✅ | Regla 173. Worker radar-balcarce-vigilante en Cloudflare con su clave cargada; el workflow «Probar el aviso por mail» salió bien el 15/10 a las 22:16 UTC. WhatsApp quedó de respaldo. | Confirmar que el mail de prueba llegó a la bandeja (no se puede ver desde acá). |
| Un vigilante que no dependa del reloj ni de GitHub | Opus O1 · Salud técnica #3 · ChatGPT | ✅ | El Worker vigilante tiene su propio reloj (12 y 42 de cada hora) y «Vigilancia» tiene además su horario propio cada 3 horas (vigilancia.yml). | Nadie vigila al vigilante de Cloudflare si cae Cloudflare entero: un chequeo externo gratis. |
| Informe diario por mail a las 8:15 y a las 21:15 | Pedido del 15/10 · regla 176 | 🟡 | El informe se arma y se manda: corridas buenas el 15/10 a las 20:41 (manual) y a las 22:14 (respaldo). Pero el Worker no lo disparó: no hay corrida de las 21:15 del 15/10 ni de las 8:15 del 16/10 (a las 8:55 no había ninguna). | Mirar en Cloudflare, Workers, radar-balcarce-reloj, los registros del horario «15 0,11 * * *». Mientras tanto sale sólo por el respaldo, con retraso. |
| Reloj propio en Cloudflare en lugar de cron-job.org | Pedido del 15/10 · Etapa 10 fase 0 | ✅ | 79 de las últimas 100 corridas de «Actualizar la web» las disparó el Worker; 0 fallas desde el 14/10 a las 10:00 UTC. | Borrar los 3 trabajos pausados de cron-job.org cuando lleve unos días estable (una persona). |
| Respaldo real fuera de GitHub | Opus O4 · Salud técnica #1 · ChatGPT · Etapa 10 0b | 🟡 | Hay respaldo en partes a R2 (variable R2_RESPALDOS desde el 15/10; regla del commit f1a734fe). GitLab sigue sin configurar: GITLAB_TOKEN y GITLAB_REPO llegan vacíos en la corrida. | Una segunda copia fuera de GitHub y de Cloudflare (GitLab, disco de la PC o Drive). |
| Probar que el respaldo se puede restaurar | Opus O4 · Salud técnica #2 · Revisión M6 | ✅ | Workflow «Probar la restauración del respaldo»: salió bien el 15/10 a las 18:37 UTC; ahora falla de verdad si git fsck falla (commit 4c919ebd). | Repetirlo cada tanto con ustedes mirando. |
| Documento «si falta uno de nosotros» y modo mínimo | ChatGPT · Opus O5 · Salud técnica #14 | ⬜ | No existe docs/RECONSTRUIR.md ni el modo mínimo. docs/11-OPERACION.md no tiene instrucciones de emergencia. | Escribirlo (dominio, cuentas, pagos, cómo reconstruir si desaparece GitHub o Cloudflare). |
| Botón de emergencia para frenar toda publicación (y uno aparte para Policiales, Política y redes) | ChatGPT · Opus O5 | 🟡 | Sólo existe el interruptor de las redes (variable REDES_ACTIVAS) y se puede desactivar un workflow a mano. No hay botón único para la web ni pasos escritos. | Un interruptor para la web y las instrucciones de 2 minutos en docs/11. |
| Alerta si el robot publica de más (por ejemplo más de 10 notas en 30 minutos) | ChatGPT | ⬜ | redes/vigilar.mjs no tiene esa regla. | Agregarla al vigilante. |
| Compilar el sitio una sola vez por vuelta | Etapa 10 fase 1 | ⬜ | «Cloudflare Pages» sigue arrancando después de cada «Actualizar la web» y compila de nuevo (workflow_run en cloudflare-deploy.yml): 1,5 a 3,5 minutos extra por vuelta, unos 4.300 minutos por mes. | Unir la compilación y la subida en un solo trabajo. |
| Pasar vigilancia, reloj de redes, auditoría con IA y pistas a Workers | Etapa 10 fase 3 | ⬜ | Siguen en GitHub Actions (por ejemplo «Vigilancia» corre unas 52 veces por día). | Es lo que más minutos ahorra después de la compilación doble. |
| Motor de noticias en Cloudflare (base D1 más Workflows) | Pedido · Etapa 10 fases 4-5 · DISENO-MOTOR | 🟡 | Hay diseño (DISENO-MOTOR.md) y un esquema de base de datos con importador y prueba de espejo (motor/esquema.sql, commit 4052d3d5), sin conectar a producción. | Etapas E0 a E7 del diseño; la pausa más larga (hasta 4 horas) la tienen que aceptar ustedes. |
| Sitio servido desde un Worker y no compilado (sin tope de 20.000 archivos) | Etapa 10 fase 5 | ⬜ | Sólo diseño. Primero una prueba de 2 días con una nota y la portada. | Hacer esa prueba. |
| Repositorio privado | Pedido · Etapa 10 | ⬜ | Sigue público (gh repo view). Privado costaría entre US$ 70 y US$ 136 por mes en minutos mientras el robot corra en Actions. | Depende de las fases 3 a 5. |
| Fotos a R2 (sacarlas del repositorio) | Salud técnica #8 · Etapa 10 0b | ⬜ | No existen las variables FOTOS_BASE ni R2_FOTOS. Hay 878 fotos en el repositorio (el repositorio pesa unos 210 MB). | Crear el depósito y correr «Fotos a R2». Es previo al archivo permanente. |
| Archivo permanente: que el enlace de una nota nunca dé 404 | Salud técnica · Opus P4 · DECISIONES 15/10 | 🟡 | Worker, exportador y ensayo construidos (infra/archivo-cloudflare, 53 pruebas), sin activar ni crear el depósito. El tope de 3.700 notas se alcanza hacia el 10/12 (el informe diario, con 31 notas por día, calcula unos 84 días). | Decidir variante, crear depósito radar-archivo y activar antes del 25/11. |
| Subir el tope a 3.700 notas y avisar cerca de los 20.000 archivos | Revisión M5 | ✅ | MAXIMO_EN_ARCHIVO = 3.700, aviso a 16.500 y alerta a 18.000 archivos; el informe diario muestra «1.135 de 3.700». | Sólo gana unos días. |
| Que el armado recorte solo cerca de los 20.000 archivos | Revisión M5 | 🔵 | Hoy sólo avisa. Recortar cambia direcciones que ya existen. | Decisión de ustedes (DECISIONES.md). |
| Next 15 deja de recibir parches el 21/10 | Salud técnica #4 | ⬜ | web/package.json sigue en ^15.5.27. Pasar a Next 16 no entra mientras valga el tope de 20.000 archivos (regla 148). | Parche menor antes del 21/10 y decidir. |
| Acciones de GitHub con Node 20 deprecado | PENDIENTES | ⬜ | checkout@v4 y setup-node@v4 (59 usos) siguen y cada corrida muestra el aviso. | Probarlo en un workflow manual primero. |
| Proteger la rama main, activar la lectura de secretos y avisos de dependencias | Salud técnica #5 | 🔵 | La consulta de protección de rama devuelve «Not Found»: no hay protección configurada. | Lo hacen ustedes en GitHub (30 minutos). |
| Verificación en dos pasos, gestor de contraseñas, códigos de respaldo y dos administradores en cada servicio | Opus O2 · ChatGPT | 🔵 | No se puede comprobar desde el código. Sigue en PENDIENTES como tarea de ustedes. | Una tarde, los dos. |
| Dominio: a nombre de quién está, renovación automática, bloqueo de transferencia, .com.ar | Opus O3 | 🔵 | Vence el 21/09/2027 (el vigilante avisa 30 días antes). No está escrito a nombre de quién está. | 30 minutos en DonWeb. |
| Avisar los vencimientos (llave del panel, token del reloj, voces) | Opus O8 | 🟡 | Sólo se vigila el dominio (VENCIMIENTOS en redes/vigilar.mjs). El token del reloj se creó sin vencimiento. Las voces propias vencen el 29/09/2027 y no están en la lista de avisos. | Sumar voces y llave del panel. |
| Tope duro de gasto antes de cargar cualquier clave paga | Opus O7 · DISENO-MOTOR | ⬜ | No hay claves pagas hoy. El registro de uso mide pero no corta. | Antes de pagar IA. |
| Limpieza: borrar workflows y scripts de prueba, panel de la PC y comercial/ | PENDIENTES · Etapa 10 §7 | 🟡 | Primera tanda hecha (commit b09561c5). Siguen prueba-whatsapp.yml, pruebas-otra-hora.yml, panel/servidor.mjs y la carpeta comercial/. Vercel, Tailscale y cron-job.org por borrar. | Segunda tanda, de a un grupo. |
| El repositorio crece unos 3,5 MB por día (datos y fotos en git) | Opus A1 · Salud técnica | ⬜ | Más de 100 commits de datos por día; 210 MB hoy. Se resuelve con la base de datos y R2. | Depende del motor nuevo. |
| No perder una retirada a mano ni reescribir celular-pendientes.json si no cambió | Salud técnica #6 y #11 | ⬜ | retiradas.json y celular-pendientes.json siguen en la línea git add de actualizar.yml. | Sacarlos o hacer que gane el más nuevo. |
| Fotos con caché de un año y licencia de las tipografías | Salud técnica #7 | ⬜ | En vivo: Cache-Control max-age=604800 (7 días). | 15 minutos. |

### Fuentes

*De dónde sale la información.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Quedarse con Balcarce, las 50 del país y las 10 de Tandil y Mar del Plata (de 236 a 103 feeds) | Pedido · Etapa 1 | ✅ | FUENTES.md: 103 feeds activos de 71 medios; las 162 apagadas quedan anotadas una por una. Commit c1600ac2. | Mirar en un mes qué aportó cada una. |
| Que medios del mismo dueño cuenten como uno (campo grupo) | Etapa 1 regla 3 | ✅ | El campo grupo existe (12 feeds nacionales lo usan) y contarMedios lo respeta en el semáforo y la relevancia. | Completar los grupos que falten. |
| Contar fuentes independientes y no direcciones (la Municipalidad más tres diarios que copian = una) | ChatGPT | 🟡 | La entrada ampliada (regla 174) trata las copias de texto como una sola voz. No hay un campo «fuente primaria». | Ampliar grupo a «fuente primaria». |
| Probar desde Cloudflare si las fuentes andan | Etapa 1 · Etapa 10 fase 2 | ✅ | El Worker de sondeo corrió el 15/10: 97 de 103 feeds andan; 6 devuelven un desafío (Infobae entre ellos). | Decidir qué hacer con esos 6. |
| Reactivar las que se apagaron por bloqueo (2261 Lobería, El Diario de Tandil, El Argentino Digital, Sendero Regional) | Etapa 1 · PENDIENTES | ⬜ | Siguen apagadas. | Probarlas desde Cloudflare y reactivar las que andan (los dos aprueban). |
| Sumar fuentes locales que faltan: Policía, bomberos, Defensa Civil, fútbol local, agenda | PENDIENTES · ChatGPT | 🟡 | Se investigaron 35 fuentes de Balcarce (BALCARCE-INVESTIGACION.md y página de revisión, commit dee2c7f9). Todavía no entraron al código; hay un cambio sin subir en ingesta/fuentes.mjs en la PC. | Aprobar cuáles y sumarlas. |
| Medir la lista todos los meses y avisar si un feed de Balcarce queda 24 horas sin notas | Etapa 1 regla 4 · Analíticas §5 | 🟡 | medir-fuentes.mjs existe pero se corre a pedido. El informe diario avisa fuentes caídas en la última corrida; no avisa silencio de un medio. | Corrida mensual y aviso por silencio. |
| Respetar robots.txt y nunca cambiar el nombre del robot para pasar un bloqueo | Opus L3 | ⬜ | No hay lectura de robots.txt en ingesta/. El error sigue sugiriendo «probar otro User-Agent» (ingesta/ingesta.mjs:49) y el Worker de sondeo usa el nombre de un Chrome. | Regla nueva y simple; los dos aprueban. |
| Sitios sin feed: un modelo escribe la receta y el código lee | Etapa 1 (e) | ⬜ | Sin hacer. | Probarlo con La Capital de Mar del Plata. |
| Acuerdos y alianzas con medios e instituciones locales (fuentes primarias) | Opus L2c · ChatGPT | 🔵 | Sin avances (no es de código). | Conversación de ustedes. |
| Qué hacer con Ahora Balcarce, Radio Sudestada, internacionales y blogs de empresas | Etapa 1 preguntas | 🔵 | Abiertas. | Responder. |

### Selección y duplicados

*Qué se publica y que no salga dos veces.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Comparar lo nuevo contra lo ya publicado (72 horas), sin IA | Etapa 3 | ✅ | Regla 171 (commit c63053fc): sin uniones falsas en los 127 pares revisados. | Medir cuántas copias de más quedan (línea base: 84 pares en 6 semanas). |
| Conservar la dirección entre todas las del grupo; el mismo enlace de fuente une repetidas, también entre secciones | Etapa 3 | ✅ | Regla 175 (commit edcc2e46). | Mirar casos nuevos. |
| Al unir, que quede siempre la ya publicada; una nota igual a una retirada espera a una persona | Revisión M2 y M3 | ✅ | Commit 4d34ecc0. | — |
| Comparar por significado (embeddings más confirmación con un modelo de decisión) | Etapa 3 opción A | ⬜ | No hay embeddings ni OpenRouter en el código; se resolvió con palabras. | Sólo si las palabras no alcanzan. |
| Campo «tipo de nota» (curiosidad, consejo, chimento, publicidad…) que la cantidad de medios no pueda rescatar | Etapa 2 | ⬜ | lectura-ia.mjs no tiene el campo tipo: «3 medios o más» sigue rescatando el ruido. | Depende de elegir el modelo de clasificación. |
| Lugar en tres niveles y secciones nuevas (15 o 17) | Etapa 4 | 🔵 | Siguen las 11 secciones. Hay que decidir cuántas y si Balcarce es vista o sección. | Responder las preguntas de la etapa 4. |
| Puntaje nuevo (cercanía, servicio, frescura, medios distintos, tipo) | Etapa 5 | ⬜ | La función relevancia() de ingesta/ingesta.mjs no cambió (peso del feed más 25 si es de acá, etc.). | Implementar y recalcular cada mes. |
| Equilibrio de la tapa (al menos la mitad de lo de acá, tope por tema) | Etapa 5 | ⬜ | Sin hacer. | Decidir el mínimo. |
| Que a la cola del celular lleguen sólo 5 a 8 dudosas por día | Etapa 5 · Etapa 6-9 | ⬜ | Sin hacer. Antes se medía 42 notas por día en amarillo y 0,6 % aprobadas. | Depende de la ficha de sensibilidad. |
| Menos nacional y más Balcarce | Opus P1 · ChatGPT | 🔵 | Sin cambios: el 41 % de las notas era de Balcarce al 15/10. | Decidir qué de afuera entra (lo que le cambia algo a un vecino). |
| Dólar y clima de otros medios, opinión firmada, Fórmula 1 sin argentino | Criterio C-10, C-14, P-5, C-6 | 🔵 | Abiertas en DECISIONES.md. | Responder. |
| Niveles de certeza visibles; si dos fuentes discrepan, la nota lo dice | ChatGPT | 🟡 | El prompt ya pide atribuir y anotar diferencias (campo noConfirmado) y hay verificación alta, media o baja; el lector no la ve. | Decidir si se muestran. |

### Escritura y verificación

*Cómo escribe la IA y cómo se controla.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Verificador más justo: copia flexible, fecha de publicación, letras rotas | Etapa 6-9 B1 | ✅ | Regla 167 (commit 77e86f81), 17 notas corregidas. | Medir si sube el porcentaje de notas con cuerpo al primer intento (64 %). |
| Que el verificador no acepte números inventados por coincidir con la fecha | Revisión A1 | ✅ | Commit 4c919ebd; la prueba de «14 cuadras» está en pruebas/verificador-copia-fechas-letras.test.mjs. | — |
| Corregir las 14 notas con letras rotas («Mart\u00inez») | Etapa 6-9 B.3 | 🟡 | En pantalla ya están bien, pero 1yyjpmk y f3bef7 todavía tienen «Mart\u00inez» en las palabras clave de los datos estructurados y en la dirección de la nota (la dirección no se cambia). | Limpiar las palabras clave. |
| Dos errores congelados en correcciones.json («campen» y «La Séleccion») | Revisión B1 | ⬜ | Siguen en web/data/correcciones.json (notas 1b3umaz y woerbj). | Corregirlos a mano con motivo, cuándo y quién, o dejarlos (decisión). |
| Entrada ampliada: hasta 4 textos completos, la más completa primero; copias como una sola voz | Criterio V2 fase 1 | ✅ | Regla 174 (commit fc8ca511); 22 pruebas. | Comparar el gasto de tokens de la semana anterior y la siguiente. |
| Medir el prompt candidato V2 y la versión corta (−46 %) | Criterio V2 §7 · Criterio §4.4 | ⬜ | PROMPT-V2-CANDIDATO.txt sin medir; CRITERIO-EDITORIAL.md § 12 no cambió. | reels/comparar-instruccion.mjs (gasta cupo). |
| Fase 2: controlar cada afirmación contra su fuente | Criterio V2 | ⬜ | Sin hacer. | Primero como aviso. |
| Prueba a ciegas de 30 notas (Gemini, Haiku, Sonnet) y verificador de sentido | Etapa 6-9 B2 y B3 | ⬜ | Sin hacer. No hay modelos de Claude en el código. | Cuesta menos de US$ 2; la leen ustedes. |
| Modelos chicos para lo repetitivo, uno de decisión para clasificar, uno fuerte sólo para desempatar | Pedido · Etapa 2-5 · DISENO-MOTOR §4 | ⬜ | Sólo diseño con costos (US$ 14 a 24 por mes con Cloudflare). | Elegir con pruebas y crear las claves en cuentas de radarbalcarce. |
| Notas «tal cual» de fuentes oficiales, con permiso por escrito | Etapa 6-9 B.5 | 🔵 | Abierta. | Pedirle un mail a la Municipalidad y consultar a un abogado. |
| Línea editorial por escrito (regla 22) | Etapa 6-9 B.6 · Criterio §5 | 🔵 | Hay un borrador sin aplicar. | Decide Hernán. |
| Poner la fuente arriba (primera línea) y nombrarla en las redes | Opus L2b | ⬜ | La fuente sigue en el desplegable cerrado «Fuentes (N)». | Cambio visible: se consulta antes. |
| Consulta con un abogado sobre reescribir notas ajenas con IA | Opus L2 · ChatGPT | 🔵 | Las seis preguntas están redactadas en la auditoría de Opus. | Hacerla. |
| Que el documento del criterio diga lo que hace el código (13 contradicciones solo de texto) | Criterio §1 y §3 | ⬜ | CRITERIO-EDITORIAL.md sigue diciendo «Actualizado el 29/09/2026» y no recoge reglas del 2 al 14/10. | Corregir el documento (riesgo cero). |
| Medir la originalidad de las notas de varias fuentes | PENDIENTES | ⬜ | Sin hacer. | Entra en la etapa de redacción. |

### Semáforo y límites legales

*Menores, víctimas, acusaciones, correcciones. Lo rojo sólo se toca con el sí de Hernán.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Que dejen de frenar de más «El Niño», «petróleo», «sorteo del fixture» | Etapa 6-9 A1 | 🟡 | Regla 172 (commit 65442c36). Probado hoy: «El Niño» y «petróleo» pasan; sigue frenando «el menor de los hermanos». | Terminar con «el menor de los/las». |
| Cerrar huecos: plurales («dos niñas») y edades dobles («15 y 16 años») | Etapa 6-9 A.3 | ✅ | Probado hoy con el código: ahora esperan a una persona (amarillo). | — |
| Huecos que halló la revisión de Opus: «sorteo» que tapaba víctimas y edades en lista o de varias personas | Revisión A2 y A3 | ✅ | Probado hoy: «hija de 3 años», «chicos de 14, 15 y 17 años» y «sorteo… víctima» frenan. Commit 4c919ebd. | — |
| Un estudiante de una escuela agredido sigue en verde | Etapa 6-9 A.3 | ⬜ | Probado hoy: «Un estudiante de la Escuela Secundaria 3 fue agredido por compañeros» no frena. | Cerrar el hueco (con el sí de Hernán). |
| Núcleo legal de las pruebas en cada vuelta | Revisión A4 y M1 | ✅ | Regla en actualizar.yml: npm run test:nucleo (30 archivos), corta la vuelta y avisa por mail. | — |
| Retirar las dos notas de Policiales que no podían salir solas | Opus L1 | ✅ | retiradas.json con d1rexu y 1lxw5wx, commit a506335e. | Hernán debe confirmarlas (la firma dice «a confirmar»). |
| Policiales de Balcarce esperan siempre a una persona también en la web | Opus L1 | 🔵 | Sin cambio: 11 de las 13 notas de Policiales publicadas son automáticas. | Decide Hernán (regla 96). |
| Corregir «Quiénes somos», que promete que lo que acusa no sale solo | Opus L1 | ⬜ | En vivo, la página sigue diciendo que una nota que acusa a alguien «no sale sola». | Cambiar el texto o cambiar la regla; el texto no puede quedar en falso. |
| Ficha de sensibilidad con IA (el rojo no se toca, la IA sólo endurece) | Etapa 6-9 A2 | 🔵 | Sin hacer. Requiere el sí de Hernán por escrito y probarla con las notas que él etiquete. | Responder las 7 preguntas del semáforo. |
| Casos de la lista roja: «una menor» suelta, prevención del suicidio, muerte de alguien conocido | DECISIONES · Etapa 6-9 A.5 | 🔵 | Abiertas. | Decide Hernán. |
| Limpiar del historial público de git las dos notas retiradas | Revisión M4 | 🔵 | Sigue en el historial. | Decidir si se acepta o se hace filter-repo. |
| Que la verificación diga lo mismo que el número de medios | Opus L5 | ⬜ | Sin evidencia de prueba nueva. | Prueba y atribución obligatoria en Policiales. |
| Aviso de IA visible en los videos y en los textos | ChatGPT · Opus L9 | 🟡 | Los videos dicen «Voz generada con inteligencia artificial» (AVISO_DE_VOZ en redes/piezas.mjs). Los textos de Facebook no lo dicen; no se usa la etiqueta propia de Meta. | Revisar si la API de Meta la permite. |
| Correcciones visibles: «Corregida el…» al pie de la nota y página pública de correcciones | Opus P2 · ChatGPT · SEO D6 | ⬜ | No hay nada en web/app ni en web/components; /correcciones y /como-trabajamos dan 404 en vivo. | Línea al pie y página corta (texto lo aprueban ustedes). |
| Historial de correcciones por nota (qué cambió, por qué, quién aprobó) | ChatGPT | 🟡 | correcciones.json y correcciones-auditoria.json guardan antes, después y cuándo; falta quién aprobó y que se vea. | Mostrarlo. |
| Proceso de rectificación y carta documento, y probar los mails contacto@, redaccion@ y publicidad@ | Opus L6 y P3 | ⬜ | docs/11-OPERACION.md no menciona rectificaciones. Los mails siguen sin probar según PENDIENTES. | 15 minutos de ustedes y un párrafo. |
| Fotos de medios nacionales: el crédito no es una licencia | Opus L4 | 🔵 | Sin cambios: se siguen usando con crédito. | Decidir y escribir qué se hace ante un reclamo. |
| Quién es legalmente el medio; marca en el INPI, título en la DNDA, dominio .com.ar | Opus L7 | 🔵 | Sin avances. | Abogado y contador. |
| Política de privacidad completa (Open-Meteo, DolarApi, dónde queda lo que escribe un vecino) | Opus L8 | 🟡 | POLITICA-PRIVACIDAD.md ya nombra Open-Meteo y DolarApi; la página pública de privacidad no los nombra. | Pasar el texto a la página. |
| Datos sensibles fuera del repositorio público (texto de pistas, pedidos de «Escribir con IA») | ChatGPT · Opus L8 | 🟡 | Lo que espera a una persona viaja cifrado. El texto de las pistas sigue en claro (PENDIENTES). | Cifrarlo. |

### Fotos

*Que cada nota tenga una foto que se pueda usar.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Notas con más de 8 fuentes se quedaban sin foto | Auditoría de fotos hallazgo 1 | ✅ | ingesta/fotos.mjs ahora corta a LETRAS.length (8) candidatas; commit fc8ca511 («las notas con más de 8 fuentes ya no se quedan sin foto»). | Mirar que se note. |
| Reintentar las notas que fallaron por el servicio (429, 413) | Etapa 6-9 C1 · Auditoría de fotos | 🟡 | Existe un reintento con tope de 5 intentos; 5 notas ya lo agotaron. | Achicar la imagen antes de mandarla. |
| Que no se repita la misma foto (huella dHash, 7 días) | Etapa 6-9 C1 | ⬜ | No hay dHash en el código. | Hacerlo en web/scripts con sharp. |
| Foto de stock libre, con «Foto ilustrativa», cuando no hay otra | Propuesta de stock | 🟡 | Módulo ingesta/foto-stock.mjs con 36 pruebas, apagado y sin conectar. | Mirar --html y decidir las 8 preguntas. |
| Pedir permiso a medios e instituciones de Balcarce para usar sus fotos | Etapa 6-9 C3 | 🔵 | Sin avances. | Conversación de ustedes. |
| Probar un modelo de Claude con visión contra Gemini | Etapa 6-9 C2 | ⬜ | Sin hacer. | Con 50 fotos etiquetadas por Hernán. |
| Miniaturas livianas y fotos en WebP; sacar los dos videos de /compartir (9,9 MB) | PENDIENTES · Salud técnica #22 | ⬜ | Sin hacer. | Mejora fuerte de carga en el celular. |

### Redes

*Facebook, Instagram y otras.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Bajar de unas 40 a 10 o 12 publicaciones por día | Etapa 6-9 D2 · Opus L9 | 🔵 | Decidido NO recortar (DECISIONES 15/10): hace falta más contenido. | Rediseñar más adelante con datos. |
| Dejar de medir lo que siempre vuelve vacío (60 % de las mediciones de piezas) | Etapa 6-9 D3 | ⬜ | Sin hacer. | Quitar esas mediciones. |
| Guardar para siempre videos, audios y placas de las redes (R2) | Regla 178 · ARCHIVO-DE-PIEZAS | ✅ | Variable R2_PIEZAS creada el 15/10; la corrida de «Redes» del 16/10 a las 10:06 UTC dice «Archivo de piezas (SUBIDA)». | Definir cuánto tiempo se conserva. |
| Publicar los videos también en Telegram, Bluesky, YouTube, Threads y X | PLAN-REELS-OTRAS-REDES | 🟡 | Esqueleto redes/destinos.mjs que sólo simula; no se creó ninguna cuenta. | Crear cuentas (ustedes) y encender de a una. |
| TikTok vía Buffer; WhatsApp canal a mano | AUTOMATIZAR-REDES-ALTERNATIVAS | 🔵 | La investigación recomienda no pedir la auditoría propia de TikTok. | Responder 4 preguntas. |
| Podcast: feed de audio para Apple y Spotify | Auditoría de feeds | 🟡 | Generador hecho y probado, sin conectar; /podcast.xml da 404 en vivo. | Dónde alojar el audio y publicar el feed. |
| Feed RSS con autor, foto adjunta y tipo correcto | Auditoría de feeds | ✅ | En vivo: application/rss+xml, enclosure con tamaño, media:credit, ttl 30 y managingEditor. | — |
| Canal de WhatsApp y boletín «Radar de la mañana» | ChatGPT · Opus G3 | ⬜ | Sólo anotado en IDEAS.md (newsletter «para más adelante»). | Después de la renovación. |
| Unificar perfiles: pegar bios y completar categoría, enlace y destacadas | Pedido | 🟡 | Texto oficial hecho (commit 012a3b0d). | Lo hacen ustedes. |
| Segundo proveedor de voz documentado (las voces propias vencen el 29/09/2027) | Salud técnica #24 | ⬜ | Sin hacer. | Documento corto. |
| Salud en las redes: ¿espera a una persona? | Etapa 6-9 D.6 | 🔵 | Abierta. | Responder. |
| Qué pasó en Facebook el 13/10 (de 10 a 53 seguidores) | Etapa 6-9 D.6 | 🔵 | Hoy hay 55 seguidores en Facebook y 7 en Instagram. | Si fue alguien compartiendo, es la mejor pista. |

### Analíticas

*Medir bien.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Un cero dudoso no pisa un dato bueno | Analíticas §1.4 | ✅ | Regla 168 (commit aaa14317). | — |
| Reparar los días de estadísticas en cero | Analíticas §1.4 E | ✅ | Workflow «Reparar las estadísticas» salió bien el 15/10 a las 22:17 UTC. En estadisticas.json los días 11 al 14/10 ahora tienen visitas (15, 37, 42 y 52); el 15/10 figura en 0 porque el día no cerró. | Verificar el 15/10 mañana. |
| Enlaces con origen (UTM) en lo que sale a las redes | Analíticas §3.7 | ✅ | Regla 169. | Mirar los resultados en dos semanas. |
| Registrar cuánto gasta la IA, por día y por tarea | Analíticas §5 · Etapa 6-9 G | 🟡 | Regla 170. Anotan la redacción y (cambio sin subir) las fotos; el informe del 15/10 mostró 64 llamadas y 479.875 tokens. Falta la lectura con IA, las voces y las pistas, y el panel del celular no guarda. | Conectar el resto (PENDIENTES). |
| Contador propio de visitas, sin robots (el 43 % de las vistas viene de afuera de Argentina) | Analíticas §3 | ⬜ | Sin hacer. Pendiente decidir la privacidad. | 2 a 3 días de trabajo. |
| Tablero de diez números y rutina mensual de 45 minutos | Analíticas §4 | ⬜ | Sin hacer. El informe diario cubre parte (visitas, redes, salud). | Armar el informe mensual. |
| Métricas del propio sistema por día (fuentes, semáforo, correcciones, latencia) | Analíticas §5 | 🟡 | El informe diario trae fuentes caídas, IA, vencimientos y archivo; no hay metricas-sistema.json. | Completar. |

### SEO y asistentes de IA

*Cómo nos ven Google y los asistentes.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Política de buscadores e IA escrita en robots.txt | SEO D1 | ✅ | En vivo: robots.txt con Content-Signal y grupos de bots. Hoy se permite el entrenamiento. | Hernán decide si lo cierra (una línea). |
| Datos estructurados más completos (foto real con crédito, autor, lugar) | SEO B5 · ChatGPT | ✅ | Regla 177 (commit 6396a050). | Probar en el validador de Google. |
| Sitemaps sin páginas noindex, con fotos, y mapa de noticias de 48 horas | Opus G2 · ChatGPT | ✅ | En vivo: sitemap.xml y sitemap-news.xml (36 direcciones) responden 200. | — |
| llms.txt mejorado y datos para programas (/agentes/*.json) | SEO | ✅ | En vivo: ultimas.json, indice.json y servicios.json dan 200. | — |
| Servidor MCP de sólo lectura para asistentes | SEO §5 | 🟡 | Escrito y probado (infra/mcp-cloudflare); mcp.radarbalcarce.com devuelve 404: no está activado. | Los 6 pasos del LEEME. |
| Que el título de la pestaña lleve el titular entero y no «…» | SEO B3 | ⬜ | En vivo: 21 de 30 notas muestreadas todavía terminan en «…». | Decisión chica y prueba. |
| Mirar Search Console una vez por semana y dar de alta Bing | SEO A1, B1 y B2 · Opus G1 | 🔵 | Nadie lo mira todavía (decisión del 12/10: después de la renovación). Google trae el 1 % de las visitas. | 15 minutos por semana. |
| Si Google lo castiga, indexar sólo lo de Balcarce | SEO D2 · Opus G1 | 🔵 | Se decide con 4 semanas de datos de Search Console. | Depende del punto anterior. |
| Página «Quién escribe y cómo corregimos» (IA, fuentes, correcciones, responsables) | SEO D6 · ChatGPT | ⬜ | No existe; en vivo sólo están Quiénes somos y Contacto. | Texto lo aprueban ustedes. |
| Tarjetas de compartir de menos de 300 KB y tipografías más livianas | SEO C1 y C2 | ⬜ | Sin hacer. | 3 horas. |
| Reactivar páginas de temas y lugares; Publisher Center; botón «fuentes preferidas» | SEO C8, D6 y D7 | 🔵 | Apagadas o sin pedir. | Decidir. |
| Conseguir 5 a 10 enlaces de sitios de Balcarce | SEO plan paso 10 | 🔵 | Sin avances. | Es lo que más mueve el SEO local. |

### Panel del celular y seguridad

*El panel y las llaves.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Que el celular no escriba archivos: sólo dispare un trabajo | Opus S1 | ⬜ | panel.yml sigue con permiso contents: write y el celular escribe con su llave de GitHub. | Rediseño del panel (etapa 10 fase 6, con Cloudflare Access). |
| No sacar llaves en silencio ni dejar que cualquiera sume una | Opus S2 | ⬜ | panel/cifrado.mjs sigue con slice(-LLAVES_MAXIMAS) (6). | Avisar ante cambios en celular-llaves.json. |
| Panel en su propio subdominio | Opus S1c · Salud técnica #21 | ⬜ | Sigue en radarbalcarce.com/panel/. | 1 día. |
| Ocultar los tokens derivados en los registros públicos (add-mask) | Opus S3 | ⬜ | No hay add-mask en .github ni en redes/. | 1 hora. |
| Cifrar el texto de las pistas | Opus L8 · PENDIENTES | ⬜ | Sigue en claro en pistas.json. | Delicado: se avisa antes. |
| Pasar la clave de redacción a un plan que no use los datos | Opus L8 | 🔵 | Hoy es gratis; en el plan gratis Google puede usar lo que se le manda. | Decidir cuando haya datos de personas. |

### Pruebas

*Pocas pero las que cuidan lo importante.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Sacar las 2.000 pruebas de la vuelta de 30 minutos | Opus O6 · Etapa 10 §5 | ✅ | actualizar.yml corre sólo test:nucleo; la suite entera corre al subir código (workflow Pruebas, 16/10 a la 01:35 UTC bien). 0 fallas de «Actualizar la web» en las últimas 100 corridas. | — |
| Recortar la suite a unos 44 archivos y 583 pruebas; borrar 13 archivos de código muerto | Etapa 10 §5 | ⬜ | Hoy hay 193 archivos y 2.507 pruebas (2.504 bien, 3 salteadas) corridas el 16/10 en la PC. | Decidir y podar con el panel de la PC y comercial/. |
| Que un dato mal escrito a mano no congele todo | Opus O6 | 🟡 | El núcleo legal valida retiradas y correcciones y avisa, pero sigue cortando la vuelta. | Ignorar la entrada mala y avisar. |
| «Pruebas con otra hora» arregladas o retiradas | Etapa 10 §5 | ⬜ | Falló 2 de las últimas 3 corridas (lo dice el informe del 15/10). | Arreglar o borrar. |
| Prueba de los documentos (enlaces, número de la próxima regla, sin cifras escritas a mano) | PENDIENTES · Opus R1 | ⬜ | No existe pruebas/docs.test.mjs. | Escribirla. |
| Prueba de fronteras entre módulos | Salud técnica #18 | ⬜ | Sin hacer. | 2 a 3 días. |

### Costos

*Todo dentro de unos US$ 25 por mes.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Mostrar el costo real de la IA aunque sea gratis | Analíticas §6 · Etapa 6-9 | ✅ | El informe diario dice «Costo: US$ 0» y «a precio de lista valdría unos US$ 0,06». | Cuando haya 2 semanas de datos completos. |
| Saber qué parte del tope de US$ 25 es Cloudflare y aprobar el paquete de IA (unos US$ 6 a 8) | Etapa 6-9 E · DISENO-MOTOR §4 | 🔵 | Abierto. | Responder. |
| Plan de la cuenta de GitHub (Free o Pro) | Etapa 10 §9 | 🔵 | Abierto. | Mirar la cuenta. |

### Documentación

*Que cada cosa esté escrita una sola vez y al día.*

| Recomendación o hallazgo | De dónde sale | Estado | Evidencia | Qué falta |
|---|---|---|---|---|
| Ordenar los documentos: histórico, PENDIENTES, DECISIONES, IDEAS | Pedido del 15/10 | ✅ | Commits b09561c5 y a2411b9b. | Mantenerlo. |
| Corregir los documentos que se contradicen (cron-job.org, «lo único que se paga es el dominio», «toda acusación espera») | Opus R1 | ⬜ | Siguen: docs/07-REDES.md, docs/08-INFRAESTRUCTURA.md (líneas 19 y 419), INVESTIGACION.md línea 223, encabezado de actualizar.yml. | Ver la sección de inconsistencias. |
| Pasada conjunta «qué sirve y qué no», módulo por módulo | Pedido de Andrés | 🟡 | La base está en las auditorías; la pasada con ustedes está anotada para después. | Agendarla. |
| Registro vivo de decisiones | Pedido | ✅ | docs/DECISIONES.md. | — |

## Cosas que se dijeron y NO se hicieron

| Qué se dijo | Qué pasa en realidad |
|---|---|
| «Muchos menos tests» | Se sacaron de la vuelta, pero hoy hay 193 archivos y 2.507 pruebas, contra 169 y 2.039 a la mañana. La poda (44 archivos) no se hizo. |
| Modelos chicos y baratos para lo repetitivo | Está en DECISIONES.md y en tres documentos con costos, pero el código sigue usando sólo Gemini y Groq: ni un modelo de Claude, ni Mercury, ni embeddings. |
| Informe a las 8:15 y a las 21:15 «por el reloj de Cloudflare» | El horario está cargado en el Worker, pero no hay corrida disparada por él (ni la de las 21:15 del 15/10 ni la de las 8:15 del 16/10). Sale por el respaldo de GitHub. |
| «Una sola compilación por vuelta» (fase 1 de la etapa 10, «sacar el desperdicio») | Se sacaron las pruebas, pero «Cloudflare Pages» sigue compilando otra vez después de cada «Actualizar la web». |
| «Quiénes somos» dice que lo que acusa a alguien no sale solo | La auditoría de Opus lo marcó como crítico; se retiraron las dos notas, pero ni el texto ni la regla cambiaron. En vivo sigue igual. |
| Corregir los dos errores congelados («campen», «La Séleccion») | La revisión de código los anotó el 15/10; siguen en correcciones.json. |
| Respaldo «fuera de GitHub» | El respaldo en R2 anda, pero la segunda copia (GitLab o equivalente) no existe: GITLAB_TOKEN y GITLAB_REPO llegan vacíos. |
| Grok y Meta AI | Se intentó consultarlos; piden iniciar sesión y no se creó ninguna cuenta. No hay una segunda opinión de ellos. |
| Redes «unificadas» | El texto oficial está; las bios y los perfiles de Instagram y Facebook los tienen que pegar ustedes y no está confirmado que lo hicieran. |

## Inconsistencias entre documentos

| Dónde | Qué dice y qué es cierto | Estado |
|---|---|---|
| CLAUDE.md y docs/00-INDICE.md | Decían «más de 200 feeds de más de 100 medios». Hoy son 103 feeds de 71 medios (FUENTES.md). | CLAUDE.md corregido. Falta docs/00-INDICE.md (línea 12). |
| CLAUDE.md | Decía «unas 2.000 pruebas»; hoy son 2.507 (193 archivos). | Corregido, con la aclaración de que en la vuelta sólo corre el núcleo legal. |
| docs/10-REGLAS-Y-PRUEBAS.md (arriba) | Habla de «1.367 pruebas en 83 archivos» y de que si una falla «GitHub no actualiza la web». Desde el 15/10 eso ya no es cierto (sólo el núcleo legal frena la vuelta). | Sin corregir. |
| CLAUDE.md, «Cuentas» | Dice que Hernán está invitado como colaborador. En GitHub aparecen agerace, balcar-dev y radarbalcarce; Hernán no figura. | Sin tocar: puede ser una invitación sin aceptar. Confirmarlo. |
| docs/00-INDICE.md y docs/07-REDES.md | Dicen que un vigilante avisa por WhatsApp y que cron-job.org despierta a Redes. Desde el 15/10 los avisos salen por mail y el reloj es el Worker. | Sin corregir. |
| Encabezado de .github/workflows/actualizar.yml | Dice que lo dispara cron-job.org y que las decisiones salen de decisiones.json que exporta el panel de la PC. | Sin corregir (es un comentario). |
| docs/08-INFRAESTRUCTURA.md (líneas 19 y 419) | «Lo único que se paga es el dominio», pero hay Workers Paid (US$ 5) y un tope de US$ 25 por mes. | Sin corregir. |
| INVESTIGACION.md (línea 223) | «Toda acusación espera a una persona»: es falso desde la regla 96. «Quiénes somos» dice lo mismo en vivo. | Sin corregir. |
| CRITERIO-EDITORIAL.md | Sigue con «Actualizado el 29/09/2026» y no recoge reglas del 2 al 14/10. | Sin corregir (la auditoría del criterio propone el orden). |
| Cuándo se llena el tope de notas | Tres respuestas: 6/12 (salud técnica, con 3.500 notas), 10/12 (DECISIONES y archivo permanente, 46 notas por día) y unos 84 días desde el 15/10, o sea enero (informe diario, 31 notas por día). | Decidir con qué ritmo se cuenta. |
| PENDIENTES.md | Pide «correr Vigilante de Cloudflare y Reloj de Cloudflare» para los informes; ya se corrieron el 15/10 (23:40 y 23:44 UTC). | Actualizar. Queda sólo confirmar que el reloj dispare. |
| docs/redes/ARCHIVO-DE-PIEZAS.md | Dice «arranca apagado»; R2_PIEZAS existe desde el 15/10 y la corrida de Redes del 16/10 sube las piezas. | Sin corregir. |
| SEO.md (líneas 42 y 46) | Todavía dice que robots.txt bloquea el feed y pide el alta en Google Publisher Center (la línea 13 ya está corregida). | Sin corregir. |
| docs/10-REGLAS-Y-PRUEBAS.md | La regla 178 está escrita antes que la 177. Y las reglas 16, 18 y 19 repiten palabra por palabra viñetas de CLAUDE.md: dos lugares que mantener. | Ordenar; decidir cuál queda. |
| Precios de Claude | La etapa 2-5 usa Sonnet 3/15 y Opus 5/25; la etapa 6-9 usa Sonnet 2/10 y Opus 4/20. El propio DISENO-MOTOR lo reconoce y ninguno está verificado. | Reconfirmar antes de cargar crédito. |
| Cambios sin subir en la PC | Hay modificaciones sin commit hechas por otras ventanas en CLAUDE.md, docs/10, ingesta/fuentes.mjs, ingesta/ingesta.mjs, ingesta/lectura-ia.mjs, reels/claves.mjs y un archivo nuevo ingesta/foto-ia.mjs. Este documento describe lo que está subido a GitHub. | Revisarlas antes del próximo commit. |

## Lo que no se pudo verificar desde acá

- Si los mails de aviso y del informe llegan a la bandeja de radarbalcarce@gmail.com.
- Verificación en dos pasos, gestor de contraseñas, administradores y titular del dominio.
- Los registros internos de Cloudflare (por qué el reloj no dispara el informe).
- Qué indexó Google (no hay lectura de Search Console).
- Si Hernán ya aceptó la invitación al repositorio (hace falta ser administrador para ver las invitaciones).
- Si el contenido de los medios que se leen tiene permiso de reutilización: es consulta para un abogado.

*Este documento no cambió código ni subió nada. Lo único tocado fuera de `docs/`: dos cifras de `CLAUDE.md` (cantidad de feeds y de pruebas).*
