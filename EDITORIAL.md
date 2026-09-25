# Editorial: qué se publica, cómo se decide y cómo se escribe

Esto es sobre la **web y las notas**. Cómo se arma un video o un posteo para
Instagram y Facebook está en `REDES.md`, no acá — son dos cosas separadas a
propósito, para no mezclar la línea editorial de la web con el calendario de
redes.

## Las secciones

| Sección | ¿Publica sola? |
|---|---|
| Balcarce | Sí (desde el 20/09) |
| Deportes | Sí |
| Automovilismo | Sí |
| Agro | Sí |
| Servicios | Sí |
| Cultura y agenda | Sí |
| Tecnología | Sí (desde el 21/09) |
| Economía | Sí (desde el 21/09) |
| Política | Sí (desde el 21/09) |
| Policiales | Sí (desde el 21/09) |
| País | No: espera a una persona |

Son once secciones (`web/lib/datos.js`); diez publican solas
(`verdeSecciones` en `ingesta/fuentes.mjs`). Eso no quiere decir que todo lo
que llega salga directo: hay una segunda red de seguridad que corta por
palabras, no por sección (ver abajo). Y lo que no es de Balcarce tiene un piso
de puntaje y un cupo por sección (`PISO_DE_AFUERA` y `CUPO_DE_AFUERA`):
desde el 25/09, Automovilismo 12, Tecnología 8, Política 8, Policiales 8,
Deportes 10, Economía 12 y el resto 15. Lo de Balcarce no tiene cupo.

**Política y Policiales: en la web salen solas, en las redes no.** Hoy, en la
web, salen solas si el semáforo da verde. En las redes (Facebook, podcasts,
historias) **siempre** esperan a una persona (`redes/elegir.mjs`). Son las dos
secciones donde un error no se perdona en un pueblo, y las que más dependen
del semáforo. Hernán y Andrés tienen que decidir si en la web también esperan
(`PENDIENTES.md`).

## El semáforo (`ingesta/fuentes.mjs`, `REGLAS_SEMAFORO`)

- **Rojo, nunca se publica:** identifica a un menor o a una víctima de
  violencia de género o delito sexual. Es ilegal, no sólo de mal gusto (leyes
  26.061 y 26.485). Ver `INVESTIGACION.md` § 6.
- **Amarillo, espera una persona:** acusa a alguien (denuncia, detenido,
  imputado), involucra una muerte, o nombra a un menor sin ser el caso de
  arriba. Se revisa a mano en el panel.
- **Verde, sale solo:** todo lo demás, si la sección lo permite (todas menos
  País) y si pasa el piso y el cupo de lo de afuera.

**Qué lee el semáforo.** Desde el 25/09 no alcanza con el título y el
comienzo del resumen: mira también el **texto completo de la nota original**
y lo que contaron los otros medios de la misma noticia. Y después de que
escribe la IA, **vuelve a pasar por lo que escribió** (`semaforoDeLaReescritura`
en `reels/reescritura.mjs`, lo mismo en el panel): si da rojo o amarillo, esa
reescritura no se usa y la nota deja de salir sola. Compara sin tildes. Cada
término de las listas roja y amarilla tiene su prueba
(`pruebas/semaforo.test.mjs`). Por eso se publica un poco menos sola que
antes, a propósito.

Falsos positivos conocidos: "violación de la ley" da rojo y "el menor de los
males" da amarillo. Se prefiere pasarse de cuidadoso; la lista no se toca sin
que decidan Hernán y Andrés.

## Cómo se escribe una nota

Toda nota que la IA escribe tiene **tres partes**, y cada una cumple un papel
distinto (el prompt exacto, con sus reglas, está en `reels/reescritura.mjs` y
se lee en el panel, pestaña "Cómo escribe la IA"):

| Parte | Qué es | Límite |
|---|---|---|
| **Título** | Empieza por lo que pasó, en presente, sin signos de admiración ni pregunta. Se entiende solo en el celular | Hasta 65 caracteres (el verificador rechaza más de 90) |
| **Copete** | El adelanto: qué pasó, dónde y cuándo. Sin contexto ni antecedentes | Dos líneas como mucho, unas 30 palabras |
| **Cuerpo** | La nota desarrollada, en **pirámide invertida**: primero el hecho central con el dato que el copete no dio (quién, cuándo, dónde, cuánto); después el contexto que importa; al final, si la fuente da para eso, qué sigue o qué significa para Balcarce | De uno a cuatro párrafos cortos, hasta 1800 caracteres |

**El cuerpo tiene que ser distinto del copete.** No arranca con las mismas
palabras ni lo repite. Si lo repite, el verificador lo rechaza
(`pruebas/cuerpo.test.mjs`).

**Con qué material trabaja.** La IA recibe el **texto completo de la nota
original** (`ingesta/articulo.mjs`, hasta 4000 caracteres), no sólo el resumen del
feed. Sin eso inventaba nombres y números y se rechazaba 65 % de las notas. Si
hay varias fuentes para la misma noticia, recibe cada una por separado.

**Cómo se controla:**

1. **Verificador anti-invención** (`ingesta/verificar.mjs`): compara título,
   copete y cuerpo contra todo lo que la IA recibió. Si aparece un número, un
   nombre, un día o una cita que la fuente no trae, se rechaza.
2. **Un reintento con corrección**: si la primera respuesta se rechaza, se
   vuelve a pedir diciéndole qué falló ("usá únicamente lo que dice la fuente").
3. **Si sólo falla el cuerpo** las dos veces, se publica el título y el copete
   y la nota queda sin cuerpo: mejor eso que un cuerpo inventado.
4. **Si falla todo**, la nota sale con el resumen mecánico de siempre.
5. El vigilante avisa si menos del 35 % de las notas de las últimas 24 horas
   tienen cuerpo.

Las reglas que esto cuida están en `REGLAS.md` (5 y 6).

**El guion de voz es el título**, dicho tal cual, y nada más.

**Los títulos que los medios publican EN MAYÚSCULAS** se pasan a mayúscula
inicial, cuidando los nombres propios con la lista `NOMBRES_PROPIOS` de
`ingesta/fuentes.mjs`. Si un título aparece mal escrito, la palabra se agrega
a esa lista y se arregla para siempre.

## La reescritura automática de las notas que salen solas

Hasta el 22/09, una nota automática (verde, sin que nadie la mire) salía con
el resumen tal cual lo cortaba la fuente: prolijo, pero repetido, y a veces
cortado a la mitad de una frase. Desde el 22/09 (ver commit "Reescritura
editorial automática, 100% en la nube"), estas notas se **reescriben con IA
solas**, en cada corrida de "Actualizar la web" — no hace falta que el panel
esté prendido.

**El criterio, en orden:**

1. **Sólo lo que ya iba a salir sin revisión.** Si una persona ya decidió
   algo (la publicó, la corrigió, la descartó), eso manda siempre. La IA
   nunca pisa una decisión humana.
2. **Cruza fuentes, no repite una.** Si dos o tres medios contaron la misma
   noticia, se le manda el texto de cada uno por separado (no sólo el
   "principal"), para que la reescritura combine en vez de parafrasear uno
   solo. Es lo más parecido a contenido propio que se puede hacer sin que
   nadie escriba a mano.
3. **Dos tonos, según el tema** (`esTemaSerio()` en `reels/reescritura.mjs`):
   - **De todos los días:** cercano, rioplatense, informativo pero liviano —
     como una novedad del pueblo bien contada.
   - **Serio:** para Policiales, y para cualquier nota (de cualquier sección)
     que toque inseguridad, robos, choques, accidentes, incendios, cortes de
     luz o agua, conflictos, protestas, reclamos o una emergencia. Registro
     sobrio, sin calidez, sólo los hechos.
4. **Se verifica antes de publicarse** (`ingesta/verificar.mjs`): si la IA
   agrega un número, un nombre, una fecha o una cita que ninguna fuente trae
   — o si escribe "más" mal (cambia el sentido) — se descarta y la nota sale
   con el resumen mecánico de siempre. Ser estricto acá cuesta poco: peor es
   publicar algo inventado.
5. **Primero lo local.** Hay un tope de pedidos por corrida: con el tope
   justo, se reescribe primero lo de Balcarce aunque lo de afuera tenga más
   puntaje (desde el 25/09).
6. **Nunca se paga dos veces por lo mismo.** Lo ya reescrito se reusa de la
   portada anterior; sólo se le vuelve a pedir a Gemini si es nueva. Y lo
   reusado se revalida igual contra las reglas de hoy: si una regla nueva ya
   no lo dejaría pasar, se descarta y se reintenta en una corrida futura.
7. **Si Gemini falla o no hay cupo**, la nota sale igual con el resumen
   mecánico — nunca se cae una publicación por esto. Primero se intenta con
   la clave de redacción (gratis); si se queda sin cupo (429), reintenta una
   vez con la de redes (paga) antes de resignarse.

**Quién la escribió se dice siempre**, en la nota (componente `<Firma>`): si
la reescribió la IA, y si la publicó una persona o salió sola. No es letra
chica — es la regla de que cada nota diga de dónde sale.

## Las reglas de tono que no se negocian (aplican a los dos tonos)

Están completas en `reels/reescritura.mjs` (`INSTRUCCION_EDITORIAL`, y el
panel las muestra en "Cómo escribe la IA"). Las que más importan:

- Nunca copia el texto original.
- Nunca inventa un dato, una cifra o una cita que la fuente no tenga.
- **Nunca identifica a un menor ni a una víctima** de un delito sexual o de
  violencia de género: ni nombre, ni apodo, ni iniciales, ni escuela, ni
  domicilio, ni un parentesco que la deje identificada. Aunque la fuente lo
  publique (leyes 26.061 y 26.485). Está en la instrucción desde el 25/09, y
  el semáforo lo controla igual sobre lo que escribe.
- Si la nota acusa a alguien sin condena firme, siempre en condicional y
  atribuido a quien acusó (doctrina Campillay) — protege al medio de una
  demanda por calumnias.
- La fuente nunca se nombra en el título ni en el guion de voz: la
  atribución va aparte, al pie de la nota.

## Los eventos de la agenda: una página por fecha (desde el 25/09)

Cada fecha de la agenda tiene su propia página, que funciona como la "nota" del
evento: `/agenda/<nombre>-<id>` (por ejemplo
`/agenda/22-fiesta-nacional-del-postre-muni22540`). La lista `/agenda`, la
tarjeta de agenda de la portada y la sección Cultura y agenda enlazan a esa
página desde cada fecha.

**Qué trae la página:** nombre, cuándo (día y horario, o "del viernes 9 al lunes
12 de octubre"), dónde (con "Cómo llegar"), la entrada, quién organiza, enlace a
la fuente o a las entradas, un botón **"Agendar en el celular"** (un archivo
`.ics`) y otro de **Google Calendar**, compartir por WhatsApp, la tarjeta propia
para compartir (nunca el afiche del organizador: la misma regla que las fotos) y
los datos estructurados `Event` para que Google muestre el evento.

**Cómo se escribe: con los datos, sin IA.** El texto sale de una plantilla
(`web/lib/eventos.js`): "Del viernes 9 al lunes 12 de octubre, desde las 12.30,
en Sociedad Rural de Balcarce (Avenida Centenario 2175)." No hay nada que
inventar. Si la fuente trae una descripción, va tal cual, limpia de HTML, bajo
"Lo que cuenta la Municipalidad de Balcarce", con el enlace al original. Si la
fuente no dice la entrada, la página dice "No la informaron. Consultá con quien
lo organiza": nunca "gratis" por las dudas.

**Quién la escribió** va al pie, igual que en las notas (regla 7), y lo mismo en
los datos para Google: "Esta ficha se armó automáticamente con los datos que
publicó la Municipalidad de Balcarce… No la escribió una inteligencia
artificial ni la revisó una persona antes de salir", o "la cargó y la publicó
una persona de la redacción".

**De dónde salen, y sólo con fecha confirmada:**

| Origen | Cómo llega a la web |
|---|---|
| **Municipio** (API de balcarce.gob.ar) | Solo, en cada corrida de "Actualizar la web" |
| **Cargado en el panel** | Cuando una persona aprieta **Publicar en la web** (pestaña Agenda). Nace como borrador. Llega por `web/data/eventos-panel.json`, aunque la PC se apague |
| **Calendario anual** (las fiestas que vuelven) | Nunca con fecha aproximada. Cuando alguien confirma la fecha, la carga en el panel con "Ya tengo la fecha" y ahí tiene página. Mientras tanto, `/agenda` dice "octubre · fecha a confirmar" |

**Cuánto dura una página.** Mientras el evento no terminó, está en las listas y
en el sitemap. Cuando pasa, la página sigue **60 días** (los enlaces que
circularon no se rompen, regla 20) con el aviso "Este evento ya pasó", y sale de
las listas. Si el municipio saca un evento de su agenda antes de que ocurra, la
página queda con el aviso "lo sacó de su agenda: puede haberse suspendido" y sin
datos para Google.

**El semáforo también mira la agenda:** si el nombre de un evento del municipio
da rojo (menores, víctimas), no sale; si da rojo la descripción, sale sólo con
los datos (`eventoSinSensibles` en `ingesta/agenda.mjs`).

**Por qué no entran como notas.** En la sección Cultura y agenda aparecen en un
bloque aparte, "Se viene en la agenda", con los próximos cuatro. No se mezclan
con las notas de la portada: un evento no es una noticia (no va al feed ni al
sitemap de noticias de Google), y la nota del medio que lo anuncia ya está en la
lista. Así no sale dos veces.

**Dónde está cada cosa:** `web/lib/eventos.js` (plantilla, fechas, archivo,
`.ics`, datos para Google), `web/app/agenda/[id]/` (la página, su tarjeta y el
`.ics`), `web/data/agenda.json` (los eventos con página, lo regenera GitHub),
`ingesta/agenda.mjs` (la API del municipio). Pruebas: `pruebas/eventos.test.mjs`
y `pruebas/agenda-panel.test.mjs`.

## Pendiente de esto

Ver [`PENDIENTES.md`](PENDIENTES.md) — sección D (editorial) tiene lo que
sigue abierto: mirar cómo salen las primeras notas reescritas, fuentes
nuevas para sumar, y repensar secciones con datos reales de Analytics.
