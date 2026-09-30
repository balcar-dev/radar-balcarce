# La redacción, auditada contra los originales (29/09/2026)

*Una foto del día: no se mantiene. Lo que quedó como regla está en
`CRITERIO-EDITORIAL.md` y en `docs/10-REGLAS-Y-PRUEBAS.md` (reglas 84 a 86).*

Hernán pidió que las notas, "si bien son notas que tienen que estar resumidas,
no pierdan su criterio editorial y sean notas que se entiendan en comparación a
las originales". Se leyeron **18 notas escritas por la IA** (de las 54 de la
portada, variadas por sección) al lado del texto completo de sus fuentes, y las
**ocho que esperaban cuerpo**, con el motivo de cada rechazo.

## Lo que está bien

- **Los datos son correctos.** Ninguna de las 18 tiene un número, un nombre o
  una fecha que no esté en las fuentes: el verificador funciona.
- **No copian** (lo que copiaba, el verificador lo sacó) y atribuyen ("según
  informó un medio local").
- **Cuidan a los chicos:** la del hockey Sub 16 de Campo de Pato no nombra a
  ninguna jugadora, aunque la fuente trae la lista entera.
- Las de Balcarce más simples (el Geriátrico Pinto, Omar Martínez en el
  Fangio, ARBal) están completas y se entienden.

## Lo que falla, de más grave a menos

| Problema | Ejemplo | Qué se hizo |
|---|---|---|
| **El tiempo verbal engaña.** El presente del título pasa al cuerpo: algo que ya pasó parece que está pasando, y algo que va a pasar, que ya pasa | "El Complejo Polideportivo **alberga** un encuentro" (ya se había hecho); "Edgardo Ríos **participa** de la Fiesta del Postre" (es el 10 de octubre) | Regla nueva en el criterio (§ 4 y § 12, regla 14) |
| **Se pierde el dato concreto y queda una frase vaga** | Los Pumas: "se confirmaron las fechas y sedes" sin decir cuáles (10 de julio en Sídney, 17 en Townsville); Ríos: sin la hora (17); la FIT: sin las propuestas que llevó Balcarce | Regla 21 del § 12 y el campo "datos" pide fecha, hora, lugar y cifras |
| **El corte de luz sin las calles** | "afectará a la mayoría de los usuarios ubicados en distintas arterias de la ciudad" | No era la IA: el extractor tiraba las listas. Arreglado (regla 84) |
| **Referencias colgadas** | Ley de Tierras: "un amparo presentado por **la mencionada agrupación**" (nunca se nombra al CECIM); balanza de pagos: el cuerpo empieza "**Este monto** representa…" | § 12, primer párrafo del cuerpo |
| **Lo que no está confirmado, dicho como seguro** | TC Pick Up: la fuente dice "no existe una confirmación oficial de la ACTC"; la nota no | § 12, regla 9 |
| **Agrandar lo que dice la fuente** | San Lorenzo: "un **fuerte** impacto", "una **profunda crisis**" | § 12, regla 9 |
| **Una sola voz cuando la fuente trae dos** | Balanza de pagos: sólo el festejo de Caputo, sin el "es una buena noticia, pero frágil" de una consultora que traía la misma fuente | Queda para probar (abajo) |
| **Relleno inventado para llegar a 70 palabras** | Corte de luz: "Este procedimiento se suma a las tareas de mantenimiento que la entidad realiza de manera periódica…" (no está en la fuente, que tenía 69 palabras) | Queda para probar (abajo) |
| **Lo local, demasiado corto** | Cambareri (APINTA): una entrevista de 580 palabras quedó en 92, sin una cita y sin decir qué dijo de Virginia Aparicio | Queda para probar (abajo) |
| **Un término técnico cambiado** | "La **balanza de pagos** cerró con superávit" (es la cuenta corriente) | § 12, regla 9 |

## Por qué siete de ocho notas no tenían cuerpo

| Motivo | Cuántas | Qué se hizo |
|---|---|---|
| El verificador buscaba la negación del título de la fuente sin mirar el cuerpo (un error suyo) | 2 (Gaudio, Federación Agraria) | Arreglado (regla 86) |
| Copiaba una frase larga y en el segundo intento no sabía cuál | 2 | La corrección ahora le dice qué frase copió |
| Agregaba un día o un mes que la fuente no dice ("viernes", "septiembre") | 2 | Ninguno por ahora: el verificador tiene razón |
| Sin texto de la fuente | 1 (la lluvia) | — |

Cinco se escribieron a mano (Claude, con las fuentes, controladas con el
verificador de producción) y salieron en la actualización siguiente. Al
controlarlas apareció otro error del verificador: "35 **mil**ímetros" se leía
"35 mil", y tiraba cualquier nota de lluvias (arreglado).

## Lo que queda para probar con A/B

`reels/comparar-instruccion.mjs` con las mismas 20 notas. La versión actual dio
**13 de 20 con cuerpo**. La variante entera no se pudo medir: la clave gratis se
quedó sin cupo a mitad de camino. Cuando haya cupo, probar lo que no se aplicó:

- **Sin relleno genérico**: "Nunca completás con una oración que podría ir en
  cualquier nota ('se suma a las tareas que la entidad realiza de manera
  periódica', 'para optimizar el funcionamiento del sistema') si la fuente no la
  dice de ESTE hecho. Un antecedente se cuenta con su fecha, nunca con 'como
  contexto previo'." Riesgo: más notas cortas, de menos de 70 palabras.
- **Lo local largo, con citas**: "Si la nota es de Balcarce y la fuente es larga
  (una entrevista, una sesión, un informe), de 140 a 180 palabras, con lo que dijo
  cada persona (al menos una cita corta) y el porqué del reclamo o del anuncio."
- **Los nombres de los adultos en lo local**: "las personas adultas que la
  fuente nombra por su función (la directora del hogar, el presidente de una
  asociación, quien habló) van con su nombre. Nunca un chico ni una víctima."
- **La otra voz**: "si alguna fuente trae otra mirada sobre el mismo hecho (un
  especialista, una consultora, la oposición, los afectados), la sumás,
  atribuida".

**Ojo con una trampa:** pedir que el primer párrafo del cuerpo repita los datos
de la bajada choca con el control "el cuerpo repite la bajada" (`repiteCopete`,
que ya es el motivo de rechazo más común): por eso lo aplicado pide que el cuerpo
se entienda solo, pero con otras palabras.
