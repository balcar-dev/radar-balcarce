# La base comercial

*Actualizado el 29/09/2026.* Una base de datos **aparte del sitio** con los
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
