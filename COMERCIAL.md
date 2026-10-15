# La base comercial

*Actualizado el 15/10/2026 (al final, el plan del mapa comercial del 9/10).* Una base de datos **aparte del sitio** con los
comercios, empresas, restaurantes y ferias de Balcarce. Sirve para tres cosas:

1. **La guía y el mapa**, si algún día se publican (abajo).
2. **Vender publicidad**: saber a quién ofrecerle qué y dejar anotado a quién ya
   se contactó (`PUBLICIDAD.md`).
3. **Saber si un comercio sigue abierto**, cruzando varias fuentes.

Vive en `comercial/`. No la usan el sitio ni los paneles: se puede mirar,
completar y probar sin tocar nada de lo que está en línea. Lo que falta, en
`PENDIENTES.md`.

## Qué hay hoy

145 comercios con nombre y ubicación, todos de OpenStreetMap (importados el
24/09): 80 con dirección, 25 con teléfono, 13 con red social o web, 12 con
horarios. **Sólo uno figura como "activo" con certeza** (61 "dudosos" y 83 "a
confirmar"): es lo honesto, porque todavía no se cruzó casi nada. Cada vez que un
comercio confirma o lo nombra una nota, sube. OpenStreetMap alcanza de semilla, no
de guía: Balcarce tiene bastante más comercios que los cargados ahí.

**Cómo verla:** `node comercial/vista.mjs` arma
`comercial/salida/guia-previa.html` (no se versiona): el mapa, la guía como la
vería un vecino y la lista de qué falta confirmar.

## Qué se guarda y qué se propone

**Qué se guarda:** cualquier actividad económica o institucional de Balcarce. La
idea es distinguir seis **tipos de actividad** (comercio, profesional, industria,
servicio, institución y feria), pero ese campo todavía **no existe**: hoy la ficha
clasifica por **rubro**, que sale de OpenStreetMap, y su campo `tipo` es la
etiqueta cruda del mapa (`bakery`, `pharmacy`). Hay que sumarlo cuando se carguen
las instituciones y los profesionales.

**Qué se les propone** (`OFERTAS` en `comercial/propuestas.mjs`, de lo más suave a
lo más comercial):

| Propuesta | Qué es |
|---|---|
| **Confirmar datos** | El primer mensaje: pregunta si siguen abiertos. No vende nada |
| **Sumarse gratis a la guía** | La entrada para el resto |
| **Colaboración** | Un intercambio sin plata: mención en historias o podcasts a cambio de algo |
| **Sorteo conjunto** | Se sortea un premio del comercio entre los seguidores de los dos |
| **Publicidad** | Aviso fijo en la web, mención en los podcasts, historia propia. Paga |
| **Servicios digitales** | Páginas web y tiendas, manejo de redes y campañas, apps o sistemas a medida y, falta sumarlo, constituir micro-SAS y SAS |

Cada servicio, con su precio de referencia y con qué comercio encaja, está en
`CATALOGO` (`comercial/propuestas.mjs`). Hoy nada lo llama fuera de su prueba
(`pruebas/propuestas.test.mjs`): conectarlo al panel o a la guía está en
`PENDIENTES.md`.

**Cómo se contacta: sin envíos masivos.** Cada mensaje lo manda **una persona**,
desde un enlace que abre WhatsApp con el texto ya escrito: WhatsApp bloquea a los
que mandan en masa, y en un pueblo un mensaje de alguien que se presenta cae
distinto. La ley 25.326 y el registro No Llame (26.951) piden que quien recibe
pueda decir que no: **todos los mensajes ofrecen salirse** (`PIE`).

## Cómo está armada

| Archivo | Qué hace |
|---|---|
| `comercial/esquema.mjs` | La ficha, los rubros, y limpiar teléfonos y redes |
| `comercial/base.mjs` | Leer y guardar `datos/comercios.json`; fusionar sin pisar lo cargado a mano |
| `comercial/importar-osm.mjs` | Trae los comercios de OpenStreetMap (lo crudo queda en `datos/osm-crudo.json`) |
| `comercial/vigencia.mjs` | El puntaje de 0 a 100 de "¿sigue abierto?" y qué hacer con cada uno |
| `comercial/verificar.mjs` | Junta las señales (sitio web, notas, otras fuentes) y las evalúa |
| `comercial/propuestas.mjs` | Qué se le ofrece a cada uno y el mensaje de WhatsApp |
| `comercial/vista.mjs` | Arma la vista previa (`vista.plantilla.html`; las calles del mapa, de `datos/calles.json`) |
| `comercial/datos/comercios.json` | **La base** |

Es un JSON porque se lee, se edita y se revisa en git sin programas especiales.
Si pasa de unos cientos de fichas o la editan varios a la vez, se pasa a SQLite
(`node:sqlite` viene con Node) sin cambiar el resto: todo pasa por `base.mjs`.

**La ficha:** nombre, rubro, dirección, ubicación, contacto (teléfono, WhatsApp,
correo, web), redes (Instagram, Facebook, TikTok), horarios, de dónde salió cada
dato (`fuentes`), si sigue abierto (`vigencia`) y el estado comercial
(`comercial`: nivel, si se lo contactó, si él mismo confirmó).

**Lo cargado a mano nunca se pisa:** si alguien corrige un teléfono, queda marcado
en `manual` y las fuentes automáticas no lo tocan. **Sólo datos del negocio:** ni
el nombre de un dueño ni un teléfono particular (ley 25.326; una prueba lo vigila).
Algunos negocios son personas (un consultorio, un oficio): por eso, aviso de dónde
salió cada dato y una forma fácil de pedir que se lo saque; si hay dudas sobre un
dato personal, se saca.

## ¿Sigue abierto? Cómo se cruza

Ninguna señal alcanza sola. Se suman:

| Señal | Puntos |
|---|---|
| Lo confirmó el propio comercio (vale un año) | +40 |
| Figura en otra fuente independiente (Cámara, municipio, Colegio de Farmacéuticos) | +15 |
| Su sitio web responde | +15 |
| Lo nombraron notas de los últimos 60 días | +10 a +20 |
| Su ficha se tocó en el mapa hace menos de dos años | +10 |
| Tiene horarios cargados | +8 |
| Su sitio web no responde | −15 |
| Nadie toca su ficha hace más de cinco años | −10 |
| Sin ningún dato de contacto | −5 |

Sale **activo** (60 o más), **dudoso** (35 a 59) o **a confirmar**. Sólo se marca
**cerrado** si alguien lo dijo (el mapa o el comercio): un sitio caído no prueba
que cerró. `node comercial/verificar.mjs` corre el cruce y guarda el resultado.

**Lo que no se hace, a propósito:** entrar con un programa a Instagram o Facebook
a mirar si un perfil existe (no lo permiten sin iniciar sesión y va contra sus
condiciones). Lo hace una persona con un mensaje ("¿siguen abiertos? ¿te sumamos
gratis a la guía?"), que además es el primer contacto comercial.

## De dónde sacar más datos

| Fuente | Qué da | Cómo |
|---|---|---|
| **Cámara de Comercio e Industria de Balcarce** (desde 1940, calle 19 esquina 20; Facebook `camarabal`) | La lista de socios: la mejor fuente y el mejor aliado | Una reunión: ofrecerles la guía gratis para sus socios a cambio de la lista |
| **Municipalidad, Inspección General** (calle 23 Nº 636, tel. 02266 42-3396, `inspecgeneral@balcarce.mun.gba.gov.ar`) | El padrón de comercios habilitados | Pedido de acceso a la información pública (ley provincial 12.475), sólo nombre, rubro y dirección |
| **Perfiles públicos de WhatsApp, Instagram y Facebook** | Si el comercio existe y sigue activo | A mano: una persona mira el perfil o le escribe |
| **Los propios comercios** | Lo más confiable: horarios, WhatsApp, redes | Un formulario o un mensaje, con su permiso y la opción de salir |
| **Colegio de Farmacéuticos** | Las farmacias | Ya se usa para la farmacia de turno |
| **Las notas de Radar Balcarce** | Nombres que aparecen: señal de vida | Ya se cruza |
| **OpenStreetMap** | La semilla | Ya importada. Licencia **ODbL**: obliga a citar la fuente (la vista y el archivo la llevan) y a compartir igual lo derivado. También se puede completar a mano ahí |

**Lo que NO se copia:** las guías comerciales privadas (Páginas Amarillas, ABC
Teléfonos, argentino.com.ar y otras). Sus datos tienen derechos y sus condiciones
prohíben copiarlos: sirven para mirar, no para importar.

## La guía y el mapa, si se hacen

La idea (`IDEAS.md`, idea 34): **el mapa es el catálogo de venta**, no sólo una
guía. Un comercio se anota gratis y desde ahí se le ofrece subir de nivel.
Pensado para empezar chico y poder dejarse sin romper nada:

- **Datos mínimos:** nombre, rubro, dirección, teléfono y horario (si quiere,
  WhatsApp e Instagram), que el comerciante manda en un mensaje de una línea y
  alguien pasa al panel. Para la web, un archivo en `web/data/` editable desde el
  panel, como los avisos. Con 15 a 20 comercios del centro alcanza para probar.
- **El mapa:** OpenStreetMap con MapLibre o Leaflet (gratis, sin clave de Google
  Maps); las coordenadas se sacan una vez de la dirección (Nominatim) y se guardan.
  Las ferias y los eventos, en el mismo mapa, enganchados a la agenda.
- **Una página por rubro** ("farmacias", "ferreterías"): es lo que la gente busca
  en Google, y cada rubro posiciona solo.
- **Mejoras pagas:** pin destacado, foto, aparecer primero en el rubro, mención en
  los podcasts, historia propia, sorteos entre los anotados. Lo básico, siempre
  gratis.
- **Medir para poder vender:** cuántos toques recibe cada ficha, mostrado al
  comerciante una vez por mes. Es lo que hace que renueve.

## Cómo seguir

1. **Completar lo básico de los 145**: un WhatsApp o una visita a cada uno ("¿nos
   confirmás el horario y el teléfono?"), empezando por los que tienen más datos
   (la vista previa los ordena así).
2. **Hablar con la Cámara de Comercio** (la lista de socios) y **pedir el padrón al
   municipio**.
3. **Un formulario** para que un comercio se anote solo (queda "a confirmar") y
   **una pestaña en el panel** para editar fichas y marcar "confirmado" o
   "contactado", como la de Avisos.
4. **Recién ahí**, decidir qué se publica: sólo los confirmados.

## El mapa comercial (plan del 9/10)

*Traído el 15/10/2026 de `docs/propuestas/MAPA-COMERCIAL-PLAN.md`. Es para después de terminar la parte técnica: nada de esto está en marcha.*

*Pedido de Hernán (9/10): armar la base de todo lo comercial de Balcarce (comercios, profesionales, oficios, agro, servicios), con sus formas de contacto, para
(1) validar los datos con cada uno, (2) sumarlos al mapa con filtros, (3) más adelante proponerles colaboraciones, publicidad o servicios, y (4) que nos valide como
medio serio. **Es para después de terminar la parte técnica**: hoy sólo queda anotado y con el camino pensado. Lo que ya existe: `COMERCIAL.md` y la carpeta `comercial/`.*

### 1. Qué hay hoy

- **145 comercios** con nombre y ubicación, todos de OpenStreetMap (importados el 24/9). Sólo 80 tienen dirección, 25 teléfono y 13 una red social o web. Por rubro: educación y cultura 47,
  gastronomía 17, turismo 16, alimentos 13, automotor 13, el resto de a pocos. **Faltan casi todos**: psicólogos, plomeros, albañiles, abogados, contadores, veterinarias, agroquímicas,
  tiendas, bazares, inmobiliarias.
- Ya están pensados la ficha (`esquema.mjs`), el puntaje de «¿sigue abierto?» (`vigencia.mjs`), las propuestas de más suave a más comercial (`propuestas.mjs`: confirmar datos → sumarse gratis
  a la guía → colaboración → sorteo conjunto → publicidad → servicios digitales) y el pie para salirse de los mensajes. La vista previa del mapa sale con `node comercial/vista.mjs`.

### 2. De dónde sacar los datos (sin romper reglas)

| Fuente | Qué da | Cómo y límites |
|---|---|---|
| **OpenStreetMap** (ya está) | Nombre y lugar | Libre. Se puede volver a importar y sumar rubros |
| **Un formulario «Sumá tu comercio» en el sitio y por WhatsApp** | Datos que el propio comercio da y autoriza | **La mejor fuente**: consentida y siempre actualizada. Va con Participá y con las historias |
| **Pedido de acceso a la información pública a la Municipalidad** (comercios habilitados) | Listado oficial de habilitaciones | Es público por ley; hay que pedirlo por escrito |
| **Cámara de comercio, colegios profesionales, cooperativas** | Listados de socios o matriculados | Se piden a las instituciones; suelen darlos con gusto a cambio de ser parte de la guía |
| **Google Maps vía su API oficial (Places)** | Nombre, dirección, teléfono, horarios | Se paga por consulta (hay un crédito mensual gratis). **Copiar Google Maps con programas está prohibido por sus términos** y puede cortar la cuenta de Google que usamos para todo: no se hace |
| **Los propios sitios, Instagram y Facebook de cada comercio** | Datos que ellos publican | Se leen **uno por uno y a mano o con ayuda**, nunca en masa; sólo lo que ponen en su perfil comercial |

**Lo que no se hace:** juntar teléfonos o correos personales de profesionales sin su permiso (psicólogos, abogados, contadores, médicos son personas físicas: rige la ley 25.326 de datos personales).
Un comercio con su local y su perfil comercial es otra cosa. Para los profesionales, el camino es el formulario, los colegios profesionales o su propia publicación.

### 3. El orden propuesto

1. **Ordenar la base** (Claude, sin ustedes): sumar el campo «tipo de actividad» (comercio, profesional, industria, servicio, institución, feria), importar de nuevo OpenStreetMap con más rubros y
   marcar qué le falta a cada ficha.
2. **Publicar «Sumá tu comercio»** (decisión de ustedes sobre el texto): formulario en el sitio + una pieza de Participá + una historia fija. Los datos entran a una lista de revisión; nada se publica sin que el comercio lo pida.
3. **Pedidos formales**: la nota a la Municipalidad y a las instituciones (los redacta Claude; los firma y manda una persona).
4. **Primer contacto, uno por uno** (una persona manda, desde WhatsApp con el texto ya armado): «¿Siguen abiertos? ¿Estos datos son correctos? ¿Quieren estar en el mapa de Balcarce, gratis?». No se vende nada, se ofrece salir.
5. **El mapa con filtros** (rubro, abierto ahora, con WhatsApp) en el sitio: es un cambio visible de la web, se muestra una maqueta antes.
6. **Después**, y sólo con los que ya participan: colaboraciones, sorteos conjuntos y publicidad.

### 4. Las ideas de Hernán para la etapa comercial (ordenadas)

- **«Comercios amigos» en placas y reels**: cinco locales por placa, **sin repetir rubro en la misma pieza**, rotando para que todos salgan. Pieza nueva de redes: se diseña y se aprueba como las demás.
- **Trueque, mención o publicidad**, según el comercio: ya están en `OFERTAS`.
- **Notas de comercios o inmobiliarias** (por ejemplo, una inmobiliaria que quiere contar algo): se pueden publicar, sin costo al principio, **siempre dichas como lo que son** («contenido aportado por…»,
  con el enlace marcado como patrocinado si hubo pago o intercambio). Es lo que piden Google y la defensa del consumidor, y además cuida la confianza en el medio. Pasan por el mismo editor y verificador que las demás.
- **Servicios digitales** (redes automatizadas, páginas, tiendas): en `CATALOGO`, para la etapa final.
- **Que nos valide como medio serio**: mostrar en «Quiénes somos» con quiénes trabajamos y publicar los criterios de qué se acepta y qué no.

### 5. Riesgos y cuidados

- **Spam**: nunca envíos masivos; cada mensaje lo manda una persona y todos ofrecen salirse (ley 25.326 y registro «No Llame», ley 26.951).
- **Datos desactualizados**: cada ficha guarda de dónde salió cada dato y cuándo; lo viejo se marca como dudoso.
- **Seguimiento comercial en un lugar privado**: el repositorio es público, así que **quién fue contactado, cuándo y qué contestó no puede vivir ahí** (está en `PENDIENTES.md`). Hay que resolverlo **antes del primer mensaje**.
- **Mezclar publicidad con noticias**: la publicidad no cambia lo que se publica ni cómo se lo cuenta (`PUBLICIDAD.md`); las notas aportadas van separadas y marcadas.

### 6. Lo que se necesita de ustedes (cuando llegue el momento)

1. Aprobar el formulario «Sumá tu comercio» y sus textos.
2. Elegir dónde se guarda el seguimiento comercial (una hoja privada de Google, o cifrado en el panel del celular).
3. Decidir si se usa Google Places (hay un costo chico) o sólo las demás fuentes.
4. Firmar y mandar los pedidos a la Municipalidad y a las instituciones.

### 7. La base «más grande» que recuerda Hernán (9/10)

Se buscó en el repositorio (todo el historial de `comercial/datos/comercios.json`: una sola versión, de 145 fichas), en el disco D: (sin otro archivo comercial fuera del proyecto) y en los 99 artefactos publicados
(el único comercial es «Guía comercial», del 24/9, con **las mismas 145 fichas**). **No apareció una base más grande.** Si Hernán la encuentra (un archivo, una hoja o un artefacto de otra ventana), se
suma con `comercial/base.mjs`, que fusiona sin pisar lo que ya se cargó a mano. Mientras tanto, la vista local (sin publicar nada) se arma con `node comercial/vista.mjs` → `comercial/salida/guia-previa.html`.

### 8. La guía comercial grande (encontrada el 9/10 a la tarde)

Hernán adjuntó la guía que recordaba: **1.282 comercios** (no 145), con rubros, subrubros, dirección, teléfonos, redes, horario, fuentes de cada dato, confianza y estado.
El archivo **no está en el repositorio** (es público y tiene datos personales) y se guarda **fuera del proyecto**, en `D:\BalcarDev\Respaldos\guia-comercial-local\`, solo para mirar y validar en local.

Resumen (sin datos personales): 1.091 comercios «requieren verificación», 118 «activos confirmados», 71 «activos recientes», 2 «cerrados». Confianza: 187 alta, 721 media, 374 baja.
Hay 323 teléfonos celulares y 64 nombres de personas (profesionales). Hay 115 registros con fuente «Google Maps» (según una «base maestra compartida», sin origen claro).

**Cuidados antes de usarla (no se publica nada de esto sin decidirlo):**
1. **Datos de Google Maps**: copiar o usar datos de Google Maps que no vengan de su API oficial va contra sus términos. Antes de cualquier uso, hay que saber de dónde salió cada registro; los de esa fuente se descartan o se verifican a mano.
2. **Teléfonos y nombres de personas**: los celulares de profesionales y particulares son datos personales (ley 25.326). Solo se usan si la persona lo autorizó, o se contacta al local por su número comercial.
3. **Vigencia**: el estado «requiere verificación» es la mayoría. Igual que con el resto, se valida con el comercio antes de mostrar nada.
4. **Ningún dato sale a la web ni a las redes** sin la validación de Hernán y Andrés.

**Próximo paso (lo puede hacer Claude en local):** cruzar esta guía con `comercial/datos/comercios.json` (los 145 de OpenStreetMap) para unificar sin duplicar, marcar la fuente de cada dato y separar lo que es de una fuente con permiso de lo que no.
