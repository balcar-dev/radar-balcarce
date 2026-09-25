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

Que las diez publiquen solas no quiere decir que todo lo que llega salga
directo: hay una segunda red de seguridad que corta por palabras, no por
sección (ver abajo). Política y Policiales son justamente las que más
dependen de esa red, porque son las dos donde un error no se perdona en un
pueblo.

## El semáforo (`ingesta/fuentes.mjs`, `REGLAS_SEMAFORO`)

- **Rojo, nunca se publica:** identifica a un menor o a una víctima de
  violencia de género o delito sexual. Es ilegal, no sólo de mal gusto (leyes
  26.061 y 26.485). Ver `INVESTIGACION.md` § 6.
- **Amarillo, espera una persona:** acusa a alguien (denuncia, detenido,
  imputado), involucra una muerte, o nombra a un menor sin ser el caso de
  arriba. Se revisa a mano en el panel.
- **Verde, sale solo:** todo lo demás, si la sección lo permite (todas, hoy).

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
   noticia, se le manda el resumen de cada uno por separado (no sólo el
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
5. **Nunca se paga dos veces por lo mismo.** Lo ya reescrito se reusa de la
   portada anterior; sólo se le vuelve a pedir a Gemini si es nueva. Y lo
   reusado se revalida igual contra las reglas de hoy: si una regla nueva ya
   no lo dejaría pasar, se descarta y se reintenta en una corrida futura.
6. **Si Gemini falla o no hay cupo**, la nota sale igual con el resumen
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
- Si la nota acusa a alguien sin condena firme, siempre en condicional y
  atribuido a quien acusó (doctrina Campillay) — protege al medio de una
  demanda por calumnias.
- La fuente nunca se nombra en el título ni en el guion de voz: la
  atribución va aparte, al pie de la nota.

## Pendiente de esto

Ver [`PENDIENTES.md`](PENDIENTES.md) — sección D (editorial) tiene lo que
sigue abierto: mirar cómo salen las primeras notas reescritas, fuentes
nuevas para sumar, y repensar secciones con datos reales de Analytics.
