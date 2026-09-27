# Radar Balcarce V2.2 — Cómo elegimos y publicamos las notas

**Versión:** 2.2 · 27/09/2026 (actualizada con las decisiones de la tarde)
**Base:** el plan V2.1, la revisión externa de ese plan y lo que pidió Hernán el 27/09 (sumar notas nacionales que se pueda medir que son populares, y listar todas las fuentes y cómo se usan).
**Para quién es:** para Hernán y Andrés, y para quien implemente los cambios (persona o IA).

> **En cuatro líneas**
> 1. Filtramos **en la entrada**, con la sección que le pone el propio medio a cada nota: lo del extranjero sin conexión argentina y los policiales de afuera ni se traen.
> 2. Una IA lee lo que entra **en dos niveles**: primero rápido (título y resumen) para descartar, después con el texto completo para decidir. Siempre con un perfil de Balcarce al lado.
> 3. Además de lo que le sirve a Balcarce, entra lo nacional que **se puede medir que es popular** (lo cuentan muchos medios, es tendencia en Google). Con techo diario y nunca a redes.
> 4. Nada se activa sin pasar antes una prueba silenciosa y un examen con casos definidos por ustedes. No se suma trabajo a mano de todos los días.

---

## 0. Qué cambió desde la 2.1

Se evaluó punto por punto la revisión externa. Esto es lo que se tomó, lo que se ajustó y lo que no.

| # | Punto de la revisión | Qué se hizo |
|---|---|---|
| 1 | La IA no puede decidir con dos líneas | **Se toma.** Lectura en dos niveles (sección 7). El texto completo ya se baja hoy para redactar: se usa también para decidir |
| 2 | Contradicción con "lo internacional no entra" | **Se toma.** Se define la excepción: sólo con conexión argentina o con una actividad de Balcarce (sección 5.3). Lo tienen que confirmar ustedes |
| 3 | Las "dos llaves" dejaban pasar una nota nacional que menciona Balcarce | **Se toma, con un ajuste.** Mencionar Balcarce ya no alcanza. Pero la regla propuesta ("sólo con fuente local") dejaría afuera cosas buenas: el 25/09 QZ Noticias trajo el acuerdo STM–Municipio, que ningún medio local publicó. Ver sección 8.1 |
| 4 | Fuente oficial confirma que se anunció algo, no que pasó | **Se toma.** Se distingue anuncio de hecho (sección 8.2) |
| 5 | Un examen armado por Claude no prueba nada si Claude se equivoca | **Se toma.** Claude propone los casos y ustedes los revisan **una sola vez** (sección 13). No hay decisiones de personas guardadas para usar: de 1.432 notas del panel, 1.424 salieron automáticas |
| 6 | 45 de 50 es poco | **Se toma.** 100 % en seguridad, 100 % en casos críticos y 90 % en el resto |
| 7 | Sacar los cupos y el relleno | **Se ajusta.** Los cupos de hoy **ya son topes, no mínimos**: no obligan a llenar. Lo que sí trae ruido es "las 3 a 5 más nuevas de cada fuente": se reemplaza por el filtro nuevo, **recién cuando la prueba muestre que la web sigue teniendo notas suficientes** (sección 10). Así se cumple lo que pidió Hernán: que siga andando bien |
| 8 | No cerrar la puerta a Color | **Se toma y se une con el pedido de Hernán:** carril "Popular" medido con datos, no adivinado (sección 11) |
| 9 | Artículo ≠ historia | **Se toma.** Cada artículo se analiza una vez; varios artículos forman una historia que puede actualizarse (sección 9) |
| 10 | Impacto directo/indirecto | **Se toma**, reemplazando el campo de relación para no duplicar (sección 7.3) |
| 11 | La utilidad de una fuente no es lo mismo que sus errores | **Se toma.** Se miden por separado y el ajuste automático es chico (sección 6.3) |
| 12 | El plan sí tiene tareas a mano | **Se toma la redefinición.** No se suma trabajo **de todos los días**. Las tareas de una vez (crear la clave, revisar el examen) sí existen y se listan (sección 16) |

---

## 1. Lo ya decidido (27/09)

| Tema | Decisión |
|---|---|
| Lo internacional | No, por ahora. **Excepción confirmada:** conexión argentina directa (Colapinto, la Selección) o actividad de Balcarce (automovilismo) |
| Policiales | Sólo de fuentes de Balcarce. Los de fuentes nacionales o regionales no se traen |
| Secciones de la web | Se mantienen. **Balcarce sigue siendo sección** |
| Lo que ve el lector | Como hoy: título, copete, cuerpo y el desplegable de fuentes. El análisis interno nunca se muestra |
| Largo de las notas | Como hoy (100 a 180 palabras) |
| Redes | Sólo notas de Balcarce o de interés directo para Balcarce, **incluidas las medidas provinciales que cambian algo acá (IOMA, ARBA)**. Lo "Popular" nacional **no** va a redes |
| Medios de España | No, por ahora (Hipertextual y Xataka apagados el 27/09) |
| Chimentos | No (Infobae Teleshow y Minuto Uno Espectáculos apagados el 27/09) |
| La web | Tiene que seguir andando bien todo el tiempo. Nada se saca hasta que lo nuevo lo reemplace igual o mejor |
| Trabajo a mano | Ninguno de todos los días. Sólo tareas de una vez |
| No inventar | Nunca contexto local, datos ni vínculos con Balcarce que no estén en la fuente |

---

## 2. La pregunta que decide

> **¿Qué valor tiene esta nota para alguien que vive en Balcarce?**

Una nota entra por una de estas razones, y tiene que poder decirse cuál:

| Razón | Ejemplo |
|---|---|
| **Local:** pasó en Balcarce | El Concejo aprobó algo; un vecino ganó un premio |
| **Servicio:** cambia algo para los vecinos | Tarifas, trámites, feriados, clima, salud, rutas |
| **Actividad de la ciudad** | TC y automovilismo, papa y campo, INTA |
| **Provincia** con efecto acá | Una medida de IOMA, ARBA o Escuelas |
| **Nacional importante** | Una ley grande, una medida económica que toca a todos |
| **Nacional popular** (nuevo) | Lo que medio país está leyendo y se puede medir (sección 11) |

Si no hay razón, no entra.

---

## 3. Qué está mal hoy, con datos

| Problema | Dato real |
|---|---|
| Entra lo del extranjero | 153 de las 1.878 notas del archivo vienen de secciones de otros países de los diarios nacionales (`infobae.com/mexico`, `/colombia`, `clarin.com/estados-unidos`, `lanacion.com.ar/estados-unidos`…). California y el tigre de México salieron de ahí |
| Decide una palabra suelta | "Fangio", "drones", "taller", escrituras de Kicillof en Automovilismo |
| "De Balcarce" por la fuente o por una mención | Una nota nacional copiada por un medio local cuenta como local |
| No se juntan los medios | 90 de 109 notas de la portada con un solo medio |
| Publicidad que pasa | Una inmobiliaria en Cultura |
| Títulos | "en Balcarce" pegado aunque no haga falta |
| Redes | Una nota nacional con 75 puntos puede ir a Facebook |
| Volumen | ~760 notas nuevas por día en los feeds (medido un domingo); 618 son nacionales |

---

## 4. Lo que se mantiene

Reloj y pruebas antes de cada corrida · semáforo rojo y amarillo · verificación de lo que escribe la IA contra la fuente · mínimo de 70 palabras · panel · portada de 72 h y archivo de 180 días · Gemini Flash-Lite para redactar · secciones de la web con Balcarce · lo que ve el lector · los cupos como topes máximos.

---

## 5. Primer filtro: en la entrada

Lo más barato y lo más importante: **no traer lo que no sirve.** No usa IA.

### 5.1 Cada fuente con su ficha
Tipo, ciudad del medio, secciones que aporta, secciones que se descartan y puntaje por sección. La lista completa de fuentes, con cómo se usa cada una hoy y qué se propone, está en el **Anexo A**.

### 5.2 Se descarta por la sección del propio medio
Mirando la dirección de la nota o la categoría del feed, no el texto:
- **Otros países:** `/mexico/`, `/colombia/`, `/espana/`, `/peru/`, `/america/`, `/estados-unidos/`, `/el-mundo/`, `/mundo/`, `/internacional/`…
- **Policiales y seguridad** de cualquier fuente que no sea de Balcarce: `/policiales/`, `/seguridad/`, `/sociedad/policiales/`.
- **Consejos genéricos:** `/autos/` (cómo arreglar la ventanilla), horóscopo, recetas.

### 5.3 La excepción internacional (confirmada el 27/09)
No hay sección internacional. Una nota de afuera del país sólo entra si tiene:
- **conexión argentina directa**: una figura argentina de la lista (Colapinto, Messi, la Selección); o
- **una actividad de Balcarce**: automovilismo.

Todo lo demás de afuera no entra, ni siquiera a esperar.

### 5.4 Frescura y una sola vez
De afuera, sólo las últimas 12 horas. Cada artículo se analiza una sola vez (sección 9).

---

## 6. Las fuentes: más, mejor clasificadas y con puntaje

### 6.1 La ficha de cada fuente
- **Tipo:** oficial · medio de Balcarce · medio de la región · medio provincial · nacional especializado · nacional general.
- **Ciudad** del medio.
- **Uso:** candidata (sus notas pueden publicarse) o **señal** (sólo sirve para medir cobertura y popularidad; ver 11.2).
- **Secciones** que aporta y que se descartan.
- **Puntaje por sección** (Motorsport alto en Automovilismo, nada en Política).

### 6.2 Fuentes para sumar
| Ámbito | Qué buscar |
|---|---|
| Balcarce | Concejo Deliberante, hospital, bomberos, liga y clubes, INTA Balcarce, Facultad de Ciencias Agrarias, autódromo y museo Fangio, cooperativas |
| Región | Municipios vecinos con web |
| Provincia | Prensa de la Provincia, ARBA, IOMA, Escuelas, Vialidad |
| Servicios | Servicio Meteorológico Nacional, ANSES, Boletín Oficial |
| Automovilismo | Más fuentes de TC y categorías nacionales |
| Popularidad | Tendencias de Google Argentina (probado: responde); "lo más leído" de los grandes (a confirmar) |

Muchas instituciones de Balcarce publican sólo en Facebook, y eso no se puede leer de forma automática. Esas quedan para más adelante.

### 6.3 El puntaje se ajusta solo, con cuidado
Todos los meses el sistema mide para cada fuente, **por separado**:
- **Utilidad:** de lo que trajo, cuánto se publicó.
- **Problemas:** cuánto rechazó el verificador y cuánto hubo que corregir.

Una fuente que publica mucho puede tener poca utilidad sin ser mala. Por eso el ajuste automático es chico y con tope, y el resumen del mes llega por WhatsApp. Si una fuente sólo trae ruido o problemas, se propone darla de baja y deciden ustedes.

---

## 7. Segundo filtro: la IA lee en dos niveles

### 7.1 Nivel 1: lectura rápida (título y resumen)
Para todo lo que pasó el primer filtro, de a 20 notas por pedido. Sirve sólo para **descartar lo obvio**: sin relación, publicidad, repetido, algo del extranjero que se coló. Lo que no está claro pasa al nivel 2.

### 7.2 Nivel 2: lectura con el texto completo
Para las candidatas que quedan. El texto completo **ya se baja hoy** para redactar (`ingesta/articulo.mjs`): se usa también para decidir. Acá se completa la ficha y se decide si la nota vale.

### 7.3 La ficha

```json
{
  "id_articulo": "…",
  "id_historia": "…",
  "ambito": "balcarce | region | provincia | nacional | internacional",
  "lugar_del_hecho": "Balcarce | Necochea | todo el país | …",
  "seccion": "una de las secciones actuales de la web",
  "impacto_balcarce": "directo | indirecto | nulo",
  "razon": "local | servicio | actividad | provincia | nacional | popular",
  "importancia": "alta | media | baja",
  "es_publicidad": false,
  "es_anuncio": false,
  "por_que_interesa": "una frase concreta; obligatoria si no es local",
  "clave_tema": "3 a 5 palabras que describen el hecho"
}
```

- **impacto_balcarce:** *directo* = pasa acá o cambia algo acá; *indirecto* = toca la zona o una actividad de la ciudad; *nulo* = no hay relación concreta.
- **razon:** cuál de las razones de la sección 2 justifica la nota.
- **es_anuncio:** la nota cuenta que alguien anunció algo (sección 8.2).
- **clave_tema:** el pedido lleva las claves de las últimas 48 horas y la IA reusa una si es el mismo hecho.
- Automovilismo y agro nacionales tienen impacto *indirecto* como mínimo.
- Sin puntajes del 0 al 100 ni "confianza": un modelo chico no los da bien.

### 7.4 El perfil de Balcarce
Va siempre con el pedido: localidades del partido, ciudades vecinas y rutas, actividades (papa, campo, INTA, autódromo), instituciones y clubes, y **de qué ciudad es el medio** de cada nota. Vive en un archivo del repositorio.

### 7.5 Instrucción de la IA (resumen)
> Sos el editor de selección de Radar Balcarce. Con el perfil de Balcarce de arriba, decidí qué valor tiene cada nota para alguien que vive en Balcarce. Juzgá por lo que cuenta la nota, no por palabras sueltas. El ámbito es el del hecho, no el del medio, y que la nota mencione Balcarce no la hace local. Si no es local, decí en una frase concreta por qué le interesa a un vecino; si no hay razón concreta, el impacto es "nulo". No inventes vínculos con Balcarce. Marcá como publicidad lo que promociona algo sin ser noticia. Tu decisión nunca está por encima de las reglas de seguridad.

---

## 8. Quién decide: las reglas

La ficha informa; las reglas deciden.

### 8.1 Cuándo una nota es "de Balcarce" (las dos llaves, corregidas)
Mencionar Balcarce **ya no alcanza** para ninguna de las dos llaves.

| Caso | Llave 1 (IA, nivel 2) | Llave 2 (evidencia) | Resultado |
|---|---|---|---|
| Medio de Balcarce | El hecho ocurre en Balcarce o lo afecta directo | La fuente es de Balcarce, u oficial de Balcarce | Local, sale solo |
| Medio de afuera que cuenta un hecho de acá (por ejemplo, QZ con el acuerdo STM–Municipio) | El hecho ocurre en Balcarce | Balcarce está en el **título original** del medio, no perdido en el texto | Local, sale solo |
| Nota nacional que menciona Balcarce al pasar ("en Balcarce también hay productores") | La IA dice que el hecho es nacional | — | **No es local:** se evalúa como nacional |
| Las llaves no coinciden | — | — | Espera a una persona |

### 8.2 Anuncio no es hecho
- Una fuente oficial (Municipio, Provincia, un organismo) **confirma que anunció algo**, no que ya pasó ni sus consecuencias.
- Un anuncio oficial puede publicarse solo, pero **atribuido**: "el Municipio informó que…".
- Que algo **ocurrió** se da como hecho sólo con la fuente oficial que lo hizo, o con 2 medios independientes que lo cuentan.
- **Respaldo** = fuente primaria para lo que esa fuente anuncia, o 2 medios independientes para un hecho. Una copia de otro medio no cuenta como segundo medio.

### 8.3 La tabla por ámbito

| Ámbito | Sale solo | Espera a una persona | No entra |
|---|---|---|---|
| **Balcarce** | Las dos llaves (8.1), pasa el semáforo, no es publicidad | Amarillo del semáforo, o las llaves no coinciden | Publicidad, repetida |
| **Región** | Impacto directo; o indirecto con respaldo | Indirecto con un solo medio | Impacto nulo |
| **Provincia** | Impacto directo o indirecto, importancia media o alta, con respaldo | Importancia alta con un solo medio | Impacto nulo |
| **Nacional** | Importancia alta con respaldo; o servicio con respaldo; o actividad de Balcarce (TC, agro); o **Popular** (sección 11) | Importancia alta con un solo medio | El resto |
| **Internacional** | Sólo la excepción de 5.3, con respaldo | — | Todo lo demás |

---

## 9. Artículo e historia

- Un **artículo** es una nota de un medio. Se analiza una sola vez.
- Una **historia** es el hecho. Varios artículos de distintos medios o de distintos momentos son la misma historia ("se investiga un incendio" a las 10, "fue controlado" a las 13).
- Los artículos se juntan en historias con la `clave_tema`, más el lugar y la fecha. Así se cuentan los medios de verdad, y eso sirve para el respaldo (8.2) y para la popularidad (11).
- **Más adelante:** que Radar actualice su nota de una historia en vez de sacar otra. Por ahora, una historia = una nota, y el resto de los artículos suman como fuentes.

---

## 10. Sin relleno, pero sin dejar la web flaca

- **Los cupos de hoy son topes:** si en Tecnología hay 8 lugares y sólo 3 notas buenas, salen 3. Eso ya funciona así y se mantiene.
- **Lo que trae ruido** es "las 3 a 5 más nuevas de cada fuente de afuera" (que entran aunque no digan nada de Balcarce). Eso se reemplaza por los filtros nuevos.
- **Cuándo:** recién cuando la prueba silenciosa (sección 13) muestre cuántas notas por día tendría la web con las reglas nuevas. Si quedaría flaca, primero se suman fuentes; no se baja el criterio.
- **Mínimo por sección: cero.** Si un día no hay nada bueno de Tecnología, Tecnología no suma notas ese día (y en la tapa se muestran las secciones que sí tienen).

---

## 11. Lo nacional popular, medido

Pedido de Hernán: además de lo que le sirve a Balcarce, sumar notas nacionales que **se pueda medir** que son populares. La IA no sabe qué es popular; lo adivina. Por eso se mide con señales de afuera.

### 11.1 Las señales
| Señal | Qué mide | Cómo se consigue | Estado |
|---|---|---|---|
| **Cobertura** | Cuántos medios distintos cuentan la misma historia en las últimas 12 h | Juntando artículos en historias (sección 9) | Sale gratis cuando las historias funcionen |
| **Tendencias de Google Argentina** | Lo que la gente está buscando hoy | El feed público `trends.google.com/trending/rss?geo=AR`. Trae cada búsqueda con las notas de medios que la cubren y sus direcciones | **Probado el 27/09: responde** |
| **Lo más leído** de los grandes | Lo que más se lee en Infobae, Clarín, La Nación | Leer ese bloque de sus portadas | A confirmar si se puede leer bien |
| **Visitas de Radar** | Lo que más leen nuestros lectores | Cloudflare | Ya se mide; sirve para aprender con el tiempo |

### 11.2 Los feeds generales pasan a ser "señal"
Los feeds generales de Infobae, La Nación, Clarín, Ámbito y Minuto Uno traen de todo: por eso eran ruido como candidatas. Pero **sirven para contar cobertura**. Se quedan, pero sus notas no se publican por sí solas: sólo cuentan cuántos medios hablan de cada historia.

### 11.3 Cuándo una nota nacional es "Popular"
Tiene que cumplir todo:
1. Al menos **2 señales**: cobertura de 4 o más medios, o está en Tendencias de Google Argentina, o está en un "más leído".
2. Es de Argentina (no internacional; excepción de 5.3 aparte).
3. Pasa el primer filtro: no es policial de afuera, ni de otro país.
4. Pasa el semáforo.
5. **No es morbosa ni chimento sin sustancia:** tragedias, crímenes, accidentes, menores, vida privada de famosos sin noticia, salud milagrosa. Ejemplo real del 27/09: la búsqueda más fuerte de Google Argentina era un caso policial con una nena de 7 años. Es popular y **no se publica**.
6. No se superó el techo del día.

### 11.4 Techo y lugar
- **Hasta 5 notas Popular por día**, como máximo 1 entre las primeras 6 de la portada.
- **Nunca a redes** mientras las redes sean sólo de Balcarce.
- Se miden aparte: si traen lectores que después leen notas de Balcarce, sirven; si no, se revisa.

### 11.5 Cómo se activa
Primero en la prueba silenciosa: el sistema anota cuáles **habría** publicado. Con un mes de eso se ve si tenían sentido, y recién ahí se prende.

---

## 12. Seguridad, por encima de todo

```
SEGURIDAD (rojo y amarillo)  →  RESPALDO  →  CRITERIO (ficha y reglas)  →  ORDEN EN LA PORTADA
```

- Rojo: nunca sale. Amarillo: espera a una persona. No se tocan.
- La IA nunca destraba nada que el semáforo frenó. Sólo puede endurecer.
- Popular nunca puede ser policial, tragedia, accidente con víctimas ni involucrar menores.
- Política y Policiales esperan a una persona en todas las piezas de redes, como hoy.

---

## 13. La prueba silenciosa y el examen

### 13.1 Prueba silenciosa (automática)
Durante 2 a 4 semanas la IA lee todo y anota qué **habría** hecho, sin decidir nada. La web sigue igual. El sistema calcula solo y manda con el WhatsApp de la semana:
- en cuántas notas habría cambiado algo, con ejemplos;
- cuántas notas por día tendría la web con las reglas nuevas (para no dejarla flaca: sección 10);
- cuántas "Popular" habría publicado;
- **cualquier caso en que la IA habría dejado pasar algo que el semáforo frenó** (tiene que ser cero).

Leerlo es opcional.

### 13.2 El examen (casos definidos por ustedes)
Claude propone unos 60 casos reales del archivo, con la respuesta esperada y el porqué:

| Tipo | Casos |
|---|---|
| Claramente de Balcarce | 10 |
| Claramente no de Balcarce | 10 |
| Región | 5 |
| Provincia | 5 |
| Nacional útil | 5 |
| Automovilismo | 5 |
| Agro y papa | 5 |
| Publicidad y ruido | 5 |
| Popular (se publica y no se publica) | 5 |
| Difíciles (Necochea, California, Colombia, el tigre, escrituras, "en Balcarce también hay…") | 5 |

**Ustedes lo revisan una sola vez** y corrigen lo que no esté bien. Los casos marcados como **críticos** son los de seguridad, los que no pueden salir como locales y la publicidad. El examen corre solo cada vez que se cambian las instrucciones de la IA.

### 13.3 Cuándo se activa
- **100 %** en los casos de seguridad.
- **100 %** en los casos críticos.
- **90 % o más** en el resto.
- La prueba silenciosa sin ningún caso de seguridad y sin dejar la web flaca.

---

## 14. Redacción

Como hoy, con una corrección: **el título no lleva "en Balcarce"** si la nota no es de Balcarce o si ya se entiende. Un control automático lo revisa. Un anuncio oficial se escribe atribuido (8.2). Nada del análisis interno se muestra.

---

## 15. Redes

**Vigente:** sólo notas de Balcarce o de interés directo para Balcarce.
- **Mientras no está la ficha:** sólo de fuentes de Balcarce, mirando el título y el texto **originales** del medio, no el nuestro.
- **Con la ficha:** ámbito Balcarce con las dos llaves (8.1), o región con impacto directo.
- Nunca Popular ni nacional.
- El podcast de la noche pasa a tener el mismo puntaje mínimo que los otros.

**Decidido (Hernán, 27/09):** una medida provincial con impacto directo en Balcarce (IOMA, ARBA) sí cuenta.

---

## 16. IA, cupos y tareas de una sola vez

| Uso | Servicio |
|---|---|
| Lectura nivel 1 y 2 | Gemini Flash-Lite gratis, **en un proyecto de Google aparte** (el cupo, ~500 pedidos por día, es por proyecto). Con el primer filtro y tandas de 20, alcanza |
| Respaldo | Cloudflare Workers AI; después Groq |
| Redacción | Como hoy |

**Plan B:** si ninguna IA responde, las reglas de hoy más estrictas: Balcarce igual; lo de afuera espera; nada Popular. El primer filtro sigue andando porque no usa IA.

**Tareas de una sola vez (no de todos los días):**
1. Crear el proyecto de Google y cargar `GEMINI_API_KEY_CLASIFICACION` en GitHub Secrets (una persona; Claude nunca toca claves).
2. Revisar el examen (13.2).
3. Confirmar la excepción internacional (5.3) y lo de IOMA en redes (15).
4. Confirmar la lista de notas mal publicadas para sacar.
5. Aprobar la baja de fuentes que sólo traen ruido, cuando llegue el resumen.

---

## 17. Panel

Para cada nota: fuente y su sección, ficha de la IA, historia a la que pertenece, respaldo, señales de popularidad, semáforo y regla que decidió. Una lista de lo que no entró, con motivo. Usarla es opcional.

---

## 18. Hoja de ruta

### Ya
- [x] Subir los arreglos hechos y probados ("Fangio", "taller", "drones", "California", "Etcheverry"). Hecho el 27/09.
- [x] Título sin "en Balcarce" de más. Hecho el 27/09.
- [x] Redes sólo con lo de Balcarce (`esParaLasRedes`). Hecho el 27/09.
- [x] Sacar las notas mal publicadas: 197 retiradas de la web el 27/09 (`web/data/retiradas.json`).
- [ ] Borrar de Facebook e Instagram el posteo de Necochea (lo hace una persona).

### Semana 1 — Primer filtro (sin IA)
- [x] Ficha de cada fuente: tipo, ciudad y uso (`fichaDeFuente`, `ingesta/fuentes.mjs`). Hecho el 27/09.
- [x] Descartar por la sección del medio: otros países, policiales de afuera y consejos (`SECCIONES_QUE_NO_ENTRAN`). Hecho el 27/09.
- [x] Policiales que no son de Balcarce: no se traen. Hecho el 27/09.
- [x] Feeds generales pasan a "señal": sólo cuentan cobertura. Hecho el 27/09.
- [ ] Últimas 12 horas de afuera y cada artículo una vez: **se pasa a la semana 2**. Sin la lectura con IA no hace falta, y hoy haría que lo nacional saliera de la portada a las 12 horas.
- [ ] Leer Tendencias de Google Argentina: **se pasa al carril Popular** (sección 11), que es donde se usa.

Medición del 27/09, con los mismos feeds antes y después del filtro: 175 y 174 notas que salen solas, las mismas 142 de Balcarce. Salieron una de Perú y tres generales de los feeds "señal"; entraron notas con más medios (Boca–Racing, con cuatro).

### Semanas 2 y 3 — IA en prueba silenciosa
- [ ] Clave nueva (una persona). **Mientras tanto** (27/09, Hernán) usa la clave gratis de redacción, con tope de 60 pedidos por día; nunca la paga.
- [x] Perfil de Balcarce (`ingesta/perfil-balcarce.md`). Hecho el 27/09.
- [x] Lectura rápida (nivel 1) en prueba silenciosa: `ingesta/lectura-ia.mjs`, fichas en `web/data/fichas.json`, comparación con el sistema en el registro de cada corrida. Hecho el 27/09. Probada con Gemini de verdad sobre los casos del 27/09: California y Colombia salen "internacional, impacto nulo"; Necochea, "región, nulo"; la ventanilla, "nulo"; lo de Balcarce, "directo".
- [x] ~~Examen y prueba silenciosa~~: **descartados el 27/09 por Hernán** ("no quiero testear nada, cualquier cosa vamos corrigiendo en vivo"). La lectura con IA decide desde ese día (`aplicarFichas`), con el semáforo por encima y sin destrabar nada. Lo que saca cada corrida queda en el registro de "Actualizar la web".
- [ ] Lectura en dos niveles, fichas e historias, en silencio.
- [ ] Resumen semanal automático.

### Hecho el 27/09 por la tarde (en vivo)
- [x] Lo de afuera sale solo sólo con dos medios o más (`exigirDosMedios`).
- [x] Repetidas: la IA junta las que cuentan el mismo hecho y queda una (`agruparRepetidas`).
- [x] La IA saca también lo de un medio local que no es de Balcarce ni la nombra ("alquileres en Mar del Plata").
- [x] Qué va en cada sección, explicado en la instrucción de la IA (Servicios es sólo lo práctico: cortes, trámites, tarifas).

### Semana 4 o 5 — Activar
- [ ] Si pasa el examen: reglas por ámbito, dos llaves, respaldo.
- [ ] Reemplazar "las 3 a 5 más nuevas" por los filtros nuevos, si la web no queda flaca.
- [ ] Redes con la ficha.
- [ ] Puntaje de fuentes por sección y ajuste mensual.

### Después del primer mes
- [ ] Activar Popular si la prueba muestra que tiene sentido.
- [ ] Sumar fuentes nuevas.
- [ ] Actualizar notas de una historia en vez de sacar otra.
- [ ] Analizar las secciones de la web (con Balcarce siempre).

---

## 19. Qué no hacer

- No arreglar casos sueltos con una palabra más o una menos como estrategia principal.
- No traer todo por fuerza bruta: filtrar en la entrada.
- No dejar que la IA destrabe nada del semáforo.
- No confundir popular con importante, ni muchos medios con verdad.
- No publicar lo popular morboso.
- No inventar vínculos, datos ni contexto local.
- No mostrarle al lector el análisis interno.
- No sacar nada de la web hasta que lo nuevo lo reemplace igual o mejor.
- No sumar trabajo a mano de todos los días.

---

## Anexo A — Todas las fuentes y cómo se usan

Datos del 27/09/2026. **Peso** = puntaje base de la fuente hoy (de 7 a 30). **Máx.** = cuántas notas "de relleno" entran por corrida además de las que nombran a Balcarce, a una figura o tocan la zona (0 = sólo esas; — = entra todo, porque es local).

### A.1 Medios de Balcarce (11) — entra todo
| Fuente | Cómo se lee | Sección fija | Peso | Propuesta V2.2 |
|---|---|---|---|---|
| News Balcarce (FM 91.7) | RSS | — | 30 | Candidata |
| Puntonueve (FM 100.9) | RSS | — | 30 | Candidata |
| Infórmese Primero (FM 104.9) | RSS | — | 30 | Candidata |
| Radio Gabal · Comunidad | RSS | Balcarce | 28 | Candidata |
| Radio Gabal · Policiales | RSS | Policiales | 28 | Candidata (única vía de policiales, junto con los demás medios de Balcarce) |
| Radio Gabal · Política | RSS | Política | 28 | Candidata |
| Radio Gabal · Deportes | RSS | Deportes | 26 | Candidata |
| Radio Gabal · Agro | RSS | Agro | 26 | Candidata |
| Municipalidad de Balcarce | RSS · **oficial** | — | 24 | Candidata; fuente primaria de sus anuncios |
| El Diario Balcarce | Se lee la portada | — | 28 | Candidata |
| La Vanguardia | Se lee la portada | — | 28 | Candidata |

**Ojo:** "entra todo" también significa que una nota nacional reproducida por un medio local hoy cuenta como local. Con la V2.2 la ficha lo corrige (8.1).

### A.2 Región (9) — sólo si nombran a Balcarce o tocan la zona
| Fuente | Ciudad | Peso | Máx. | Propuesta V2.2 |
|---|---|---|---|---|
| 0223 | Mar del Plata | 12 | 0 | Candidata; sin policiales |
| El Eco | Tandil | 12 | 0 | Candidata; sin policiales |
| LU9 | Mar del Plata | 12 | 0 | Candidata; sin policiales |
| QZ Noticias | Mar del Plata | 12 | 0 | Candidata; sin policiales |
| Ecos Diarios | Necochea | 11 | 0 | Candidata; sin policiales |
| Sendero Regional | Regional (varias ciudades) | 10 | 4 | Candidata; **sacar el relleno** (hoy es la única regional con 4) |
| 2261 | Lobería | 10 | 1 | Candidata; sin policiales |
| Ayacucho al Día | Ayacucho | 10 | 0 | Candidata; filtrar publicidad. La inmobiliaria entró porque se llamaba "Etcheverry" y el sistema la tomó por el tenista (corregido el 27/09) |
| Argenpapa | Nacional, especializada en papa (se lee la portada) | 16 | 3 | Candidata en Agro |

### A.3 Provincia (4) — sólo si nombran a Balcarce o tocan la zona
| Fuente | Tipo | Peso | Máx. | Propuesta V2.2 |
|---|---|---|---|---|
| Gobierno de la Provincia | **Oficial** | 14 | 0 | Candidata; con la ficha puede entrar lo que tenga impacto acá aunque no nombre a Balcarce |
| Agencia DIB | Agencia provincial | 12 | 0 | Candidata |
| La Noticia 1 | Medio provincial | 11 | 0 | Candidata |
| Diputados Bonaerenses | Medio legislativo | 11 | 0 | Candidata |

### A.4 Nacionales generales (5) — hoy candidatas con relleno, la principal vía de ruido
| Fuente | Peso | Máx. | Propuesta V2.2 |
|---|---|---|---|
| Infobae (general) | 8 | 6 | **Señal** (sólo cobertura y popularidad) · hecho el 27/09 |
| La Nación (general) | 8 | 5 | **Señal** |
| Clarín · Lo último | 8 | 5 | **Señal** |
| Ámbito · Últimas noticias | 15 | 3 | **Señal** |
| Minuto Uno (home) | 13 | 3 | **Señal** |

### A.5 Nacionales por sección (29)
| Sección | Fuentes | Propuesta V2.2 |
|---|---|---|
| Economía (5) | Infobae, La Nación, Clarín, Ámbito, Perfil | Candidatas; sin secciones de otros países |
| Política (3) | Infobae, Clarín, La Nación | Candidatas; sin otros países; nunca a redes |
| Tecnología (6) | Infobae, Clarín, Ámbito, La Nación, Hipertextual, Xataka | Candidatas las cuatro argentinas. **Hipertextual y Xataka apagados el 27/09** (son de España) |
| Cultura y espectáculos (5) | Infobae Cultura, Infobae Teleshow, Ámbito Espectáculos, Minuto Uno Espectáculos, La Nación Cultura | Candidatas Infobae Cultura, Ámbito Espectáculos y La Nación Cultura. **Teleshow y Minuto Uno Espectáculos apagados el 27/09** (chimentos) |
| Deportes (3) | Olé, Clarín Deportes, La Nación Deportes | Candidatas; sin ligas de otros países salvo argentinos (45 notas extranjeras de Deportes en el archivo) |
| Automovilismo (3) | Campeones, Motorsport F1, Motorsport MotoGP | Candidatas; actividad de Balcarce (impacto indirecto) |
| Agro (4) | Clarín Rural, Infocampo, Bichos de Campo, INTA Noticias (**oficial**) | Candidatas; actividad de Balcarce |

### A.6 Lo que no es noticia
| Servicio | De dónde sale | Cómo se usa |
|---|---|---|
| Clima | Open-Meteo; si falla, `api.met.no` | Tarjeta del clima, historias de la mañana y la noche, avisos de helada, granizo, viento y lluvia |
| Farmacia de turno | Colegio de Farmacéuticos (`colbalcarce.com`), cruzado con La Vanguardia y Radio Gabal; direcciones a mano para las que no figuran | Tarjeta de la web e historia de las 19 |
| Dólar | DolarApi y Bluelytics | Página `/dolar` y la nota propia de cada día hábil |
| Agenda | Municipalidad y la pestaña Agenda del panel | Página de agenda y una página por evento |
| Redacción con IA | Gemini Flash-Lite (clave gratis y paga) | Título, copete, cuerpo y texto para redes |
| Voz | Gemini (clave paga de redes) | Reels, podcasts e historias |
| Estadísticas | Cloudflare Web Analytics y Meta | Resúmenes de las 9 y las 21 |
| **Nuevo: Tendencias** | `trends.google.com/trending/rss?geo=AR` | Señal de popularidad (sección 11) |
