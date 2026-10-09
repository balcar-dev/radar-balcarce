# El mapa comercial de Balcarce: plan para cuando termine lo técnico · 9/10/2026

*Pedido de Hernán (9/10): armar la base de todo lo comercial de Balcarce (comercios, profesionales, oficios, agro, servicios), con sus formas de contacto, para
(1) validar los datos con cada uno, (2) sumarlos al mapa con filtros, (3) más adelante proponerles colaboraciones, publicidad o servicios, y (4) que nos valide como
medio serio. **Es para después de terminar la parte técnica**: hoy sólo queda anotado y con el camino pensado. Lo que ya existe: `COMERCIAL.md` y la carpeta `comercial/`.*

## 1. Qué hay hoy

- **145 comercios** con nombre y ubicación, todos de OpenStreetMap (importados el 24/9). Sólo 80 tienen dirección, 25 teléfono y 13 una red social o web. Por rubro: educación y cultura 47,
  gastronomía 17, turismo 16, alimentos 13, automotor 13, el resto de a pocos. **Faltan casi todos**: psicólogos, plomeros, albañiles, abogados, contadores, veterinarias, agroquímicas,
  tiendas, bazares, inmobiliarias.
- Ya están pensados la ficha (`esquema.mjs`), el puntaje de «¿sigue abierto?» (`vigencia.mjs`), las propuestas de más suave a más comercial (`propuestas.mjs`: confirmar datos → sumarse gratis
  a la guía → colaboración → sorteo conjunto → publicidad → servicios digitales) y el pie para salirse de los mensajes. La vista previa del mapa sale con `node comercial/vista.mjs`.

## 2. De dónde sacar los datos (sin romper reglas)

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

## 3. El orden propuesto

1. **Ordenar la base** (Claude, sin ustedes): sumar el campo «tipo de actividad» (comercio, profesional, industria, servicio, institución, feria), importar de nuevo OpenStreetMap con más rubros y
   marcar qué le falta a cada ficha.
2. **Publicar «Sumá tu comercio»** (decisión de ustedes sobre el texto): formulario en el sitio + una pieza de Participá + una historia fija. Los datos entran a una lista de revisión; nada se publica sin que el comercio lo pida.
3. **Pedidos formales**: la nota a la Municipalidad y a las instituciones (los redacta Claude; los firma y manda una persona).
4. **Primer contacto, uno por uno** (una persona manda, desde WhatsApp con el texto ya armado): «¿Siguen abiertos? ¿Estos datos son correctos? ¿Quieren estar en el mapa de Balcarce, gratis?». No se vende nada, se ofrece salir.
5. **El mapa con filtros** (rubro, abierto ahora, con WhatsApp) en el sitio: es un cambio visible de la web, se muestra una maqueta antes.
6. **Después**, y sólo con los que ya participan: colaboraciones, sorteos conjuntos y publicidad.

## 4. Las ideas de Hernán para la etapa comercial (ordenadas)

- **«Comercios amigos» en placas y reels**: cinco locales por placa, **sin repetir rubro en la misma pieza**, rotando para que todos salgan. Pieza nueva de redes: se diseña y se aprueba como las demás.
- **Trueque, mención o publicidad**, según el comercio: ya están en `OFERTAS`.
- **Notas de comercios o inmobiliarias** (por ejemplo, una inmobiliaria que quiere contar algo): se pueden publicar, sin costo al principio, **siempre dichas como lo que son** («contenido aportado por…»,
  con el enlace marcado como patrocinado si hubo pago o intercambio). Es lo que piden Google y la defensa del consumidor, y además cuida la confianza en el medio. Pasan por el mismo editor y verificador que las demás.
- **Servicios digitales** (redes automatizadas, páginas, tiendas): en `CATALOGO`, para la etapa final.
- **Que nos valide como medio serio**: mostrar en «Quiénes somos» con quiénes trabajamos y publicar los criterios de qué se acepta y qué no.

## 5. Riesgos y cuidados

- **Spam**: nunca envíos masivos; cada mensaje lo manda una persona y todos ofrecen salirse (ley 25.326 y registro «No Llame», ley 26.951).
- **Datos desactualizados**: cada ficha guarda de dónde salió cada dato y cuándo; lo viejo se marca como dudoso.
- **Seguimiento comercial en un lugar privado**: el repositorio es público, así que **quién fue contactado, cuándo y qué contestó no puede vivir ahí** (pendiente C-8 de `PRIORIDADES.md`). Hay que resolverlo **antes del primer mensaje**.
- **Mezclar publicidad con noticias**: la publicidad no cambia lo que se publica ni cómo se lo cuenta (`PUBLICIDAD.md`); las notas aportadas van separadas y marcadas.

## 6. Lo que se necesita de ustedes (cuando llegue el momento)

1. Aprobar el formulario «Sumá tu comercio» y sus textos.
2. Elegir dónde se guarda el seguimiento comercial (una hoja privada de Google, o cifrado en el panel del celular).
3. Decidir si se usa Google Places (hay un costo chico) o sólo las demás fuentes.
4. Firmar y mandar los pedidos a la Municipalidad y a las instituciones.

## 7. La base «más grande» que recuerda Hernán (9/10)

Se buscó en el repositorio (todo el historial de `comercial/datos/comercios.json`: una sola versión, de 145 fichas), en el disco D: (sin otro archivo comercial fuera del proyecto) y en los 99 artefactos publicados
(el único comercial es «Guía comercial», del 24/9, con **las mismas 145 fichas**). **No apareció una base más grande.** Si Hernán la encuentra (un archivo, una hoja o un artefacto de otra ventana), se
suma con `comercial/base.mjs`, que fusiona sin pisar lo que ya se cargó a mano. Mientras tanto, la vista local (sin publicar nada) se arma con `node comercial/vista.mjs` → `comercial/salida/guia-previa.html`.

## 8. La guía comercial grande (encontrada el 9/10 a la tarde)

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
