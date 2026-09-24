# La base comercial

Una base de datos **aparte del sitio** con los comercios, empresas, restaurantes
y ferias de Balcarce. Se use o no en la web, sirve para tres cosas:

1. **La guía y el mapa** que se publiquen algún día (ver `IDEAS.md`).
2. **Vender publicidad**: saber a quién ofrecerle qué, y dejar anotado a quién
   ya se contactó.
3. **Saber si un comercio sigue abierto**, cruzando varias fuentes.

Vive en `comercial/`. No la usa el sitio ni el panel todavía: es una carpeta
que se puede mirar, completar y probar sin tocar nada de lo que está en línea.

## Cómo verla

`node comercial/vista.mjs` arma `comercial/salida/guia-previa.html`: el mapa,
la guía como la vería un vecino y la lista de qué falta confirmar. (Hay una
copia como artefacto privado del 24/09.)

## Qué hay hoy (24/09/2026)

145 comercios con nombre y ubicación en el mapa, todos de OpenStreetMap:
80 con dirección, 25 con teléfono, 13 con red social o web, 12 con horarios.
**Sólo uno figura como "activo" con certeza**: es lo honesto, porque todavía no
cruzamos casi nada. Cada vez que un comercio confirma o lo nombra una nota,
sube.

OpenStreetMap alcanza de semilla, no de guía: Balcarce tiene bastante más
comercios que los que hay cargados ahí.

## Cómo está armada

| Archivo | Qué hace |
|---|---|
| `comercial/esquema.mjs` | La ficha, los rubros, y limpiar teléfonos y redes |
| `comercial/base.mjs` | Leer y guardar `datos/comercios.json`; fusionar sin pisar lo cargado a mano |
| `comercial/importar-osm.mjs` | Trae los comercios de OpenStreetMap |
| `comercial/vigencia.mjs` | Puntaje de 0 a 100 de "¿sigue abierto?" y qué hacer con cada uno |
| `comercial/verificar.mjs` | Junta las señales (sitio web, notas, otras fuentes) y las evalúa |
| `comercial/vista.mjs` | Arma la vista previa |
| `comercial/datos/comercios.json` | **La base** |

Hoy es un archivo JSON porque se lee, se edita y se revisa en git sin
programas especiales. Cuando pase de unos cientos de fichas o editen varias
personas a la vez, se pasa a SQLite (`node:sqlite` ya viene con Node) sin
cambiar el resto: todo pasa por `base.mjs`.

**Lo cargado a mano nunca se pisa.** Si alguien corrige un teléfono, queda
marcado en `manual` y las fuentes automáticas no lo tocan.

## La ficha

Nombre, rubro, dirección, ubicación, contacto (teléfono, WhatsApp, mail, web),
redes (Instagram, Facebook, TikTok), horarios, de dónde salió cada dato
(`fuentes`), si sigue abierto (`vigencia`), y el estado comercial (`comercial`:
nivel, si se lo contactó, si él mismo confirmó).

**Regla de fondo: sólo datos del negocio.** Ni el nombre de un dueño ni un
teléfono particular. Es lo que pide la ley de protección de datos personales
(25.326) y evita problemas. Un test lo vigila.

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

Sale **activo** (60 o más), **dudoso** (35 a 59) o **a confirmar**. Sólo se
marca **cerrado** si alguien lo dijo (el mapa o el comercio): un sitio caído no
prueba que cerró.

`node comercial/verificar.mjs` corre el cruce y guarda el resultado.

**Lo que no se hace, a propósito:** entrar a Instagram o Facebook a mirar si un
perfil existe. Las redes no lo permiten sin iniciar sesión y forzarlo va
contra sus condiciones. Confirmar por ahí lo hace una persona con un mensaje
("¿siguen abiertos? ¿te sumamos a la guía gratis?"), que además es el primer
contacto comercial.

## De dónde sacar más datos

| Fuente | Qué da | Cómo |
|---|---|---|
| **Cámara de Comercio e Industria de Balcarce** (desde 1940, calle 19 esquina 20; Facebook `camarabal`) | La lista de socios: es la mejor fuente y el mejor aliado | Reunión. Ofrecerles la guía gratis para sus socios a cambio de la lista |
| **Municipalidad, Inspección General** (calle 23 Nº 636, tel. 02266 42-3396, `inspecgeneral@balcarce.mun.gba.gov.ar`) | Padrón de comercios habilitados | Pedido de acceso a la información pública (ley provincial 12.475). Pedir sólo nombre, rubro y dirección |
| **Los propios comercios** | Lo más confiable: horarios, WhatsApp, redes | Un formulario o un mensaje. Con su permiso, y con la opción de salir |
| **Colegio de Farmacéuticos** | Farmacias | Ya lo usamos para la farmacia de turno |
| **Las notas de Radar Balcarce** | Nombres que aparecen y sirven de señal de vida | Ya se cruza |
| **OpenStreetMap** | La semilla | Ya importada. También se puede completar a mano ahí: es abierto |

**Lo que NO se copia:** las guías comerciales privadas (Páginas Amarillas,
ABC Teléfonos, argentino.com.ar, etc.). Sus datos tienen derechos y sus
condiciones prohíben copiarlos. Sirven para mirar, no para importar.

## Cómo seguir

1. **Completar lo básico de los 145**: para cada uno, un WhatsApp o una visita
   ("¿nos confirmás el horario y el teléfono?"). La vista previa ordena por
   quién tiene más datos, así se arranca por los fáciles.
2. **Hablar con la Cámara de Comercio** y pedir la lista de socios.
3. **Pedir el padrón al municipio.**
4. **Un formulario** para que un comercio se anote solo (pasa por la misma
   validación y queda "a confirmar").
5. **Panel:** una pestaña para editar fichas y marcar "confirmado" o
   "contactado", igual que ya hay una de Avisos.
6. **Recién ahí**, decidir qué se publica: sólo los confirmados.

## Cuidado con los datos

- Es una base de **negocios**, pero algunos son personas (un consultorio, un
  oficio). Por eso: sólo datos comerciales, aviso de dónde salieron y una
  forma fácil de pedir que se los saque.
- Si hay dudas sobre un dato personal, se saca.
- La atribución a OpenStreetMap es obligatoria (licencia ODbL): la vista y el
  archivo la llevan.
