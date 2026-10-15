<!-- BLOQUE:B18:INICIO -->
<!-- NUMEROS:INICIO -->
| Qué | Número | Clave | Quién lo usa | Tipo | Estado |
|---|---|---|---|---|---|
| Título: largo al que apunta (caracteres) | 70 | `TITULO.objetivo` | IA y control | guía | vigente |
| Título: largo máximo (caracteres) | 90 | `TITULO.maximo` | IA y control | mínimo/máximo duro | vigente |
| Bajada: palabras, más o menos | 55 | `BAJADA.palabras` | IA | guía | CAMBIA (hoy 50) |
| Bajada: largo máximo (caracteres) | 360 | `BAJADA.maximo` | IA y control | máximo duro | vigente |
| Cuerpo: palabras mínimas para publicarse | 70 | `CUERPO.minimoParaPublicar` | Control | mínimo duro | vigente |
| Cuerpo con una sola fuente: palabras de guía, desde | 90 | `CUERPO.guiaUnaFuenteDesde` | IA | guía | NUEVO |
| Cuerpo con una sola fuente: palabras de guía, hasta | 150 | `CUERPO.guiaUnaFuenteHasta` | IA | guía | NUEVO |
| Cuerpo con dos o más fuentes: palabras de guía, desde | 150 | `CUERPO.guiaVariasDesde` | IA | guía | NUEVO |
| Cuerpo con dos o más fuentes: palabras de guía, hasta | 250 | `CUERPO.guiaVariasHasta` | IA | guía | NUEVO |
| Cuerpo: palabras a partir de las cuales se avisa a una persona (no corta nada) | 300 | `CUERPO.avisoSiPasaDe` | Sistema | guía | NUEVO [A CONFIRMAR] |
| Cuerpo: párrafos, como máximo | 3 | `CUERPO.parrafosMaximo` | IA | guía | vigente |
| Cuerpo: largo máximo (caracteres); con 300 palabras hacen falta unos 2.100, así que hoy 1800 cortaría notas largas | 2400 | `CUERPO.maximo` | Control | guía (hoy corte duro) | CAMBIA (hoy 1800) [A CONFIRMAR] |
| Palabras seguidas iguales a una fuente o a una cita: lo que se le pide a la IA, como máximo | 10 | `COPIA_PEDIDA` | IA | margen | NUEVO en la tabla (hoy sólo en el prompt) |
| Palabras seguidas copiadas del original: desde acá el verificador rechaza (el margen de 2 con el 10 es a propósito) | 12 | `COPIA_MAXIMA` | Control | máximo duro | vigente |
| Datos de borrador (campo "datos"): como mínimo | 3 | `PARTES.datosMinimo` | IA | guía | NUEVO en la tabla (hoy sólo en el prompt) |
| Datos de borrador (campo "datos"): como máximo | 10 | `PARTES.datosMaximo` | IA | guía | NUEVO en la tabla (hoy sólo en el prompt) |
| Guion: largo máximo (caracteres) | 200 | `GUION.maximo` | IA y control | máximo duro | vigente |
| Guion: duración (segundos, más o menos) | 10 | `GUION.segundos` | IA y control | regla del sistema | vigente |
| Claves: como mínimo | 3 | `PARTES.clavesMinimo` | IA y control | máximo duro | vigente |
| Claves: como máximo | 5 | `PARTES.clavesMaximo` | IA y control | máximo duro | vigente |
| Una clave: largo máximo (caracteres) | 180 | `PARTES.clave` | IA y control | máximo duro | vigente |
| Un dato de "qué se sabe" o "qué falta confirmar" (caracteres) | 260 | `PARTES.dato` | IA y control | máximo duro | vigente |
| Lo que aportó una fuente (caracteres) | 220 | `PARTES.aporte` | IA y control | máximo duro | vigente |
| Texto para redes: largo máximo (caracteres) | 280 | `PARTES.textoRedes` | IA y control | máximo duro | vigente |
| Etiquetas: como mínimo | 3 | `PARTES.etiquetasMinimo` | IA y control | máximo duro | vigente |
| Etiquetas: como máximo | 8 | `PARTES.etiquetasMaximo` | IA y control | máximo duro | vigente |
| Una etiqueta: largo máximo (caracteres) | 40 | `PARTES.etiqueta` | IA y control | máximo duro | vigente |
| Palabras sin tilde para dar un texto por escrito sin tildes (con menos, se les pone la tilde) | 3 | `ESTILO.palabrasSinTilde` | IA y control | regla del sistema | vigente |
| Intentos de la IA por nota | 3 | `REESCRITURA.intentosMaximos` | Sistema | regla del sistema | vigente |
| Medios que la cuentan para un intento más de la IA | 5 | `REESCRITURA.fuentesParaUnIntentoExtra` | Sistema | regla del sistema | vigente |
| Medios que la cuentan para dos intentos más de la IA | 8 | `REESCRITURA.fuentesParaDosIntentosExtra` | Sistema | regla del sistema | vigente |
| Días que se recuerdan los intentos | 7 | `REESCRITURA.diasDeIntentos` | Sistema | regla del sistema | vigente |
| Palabras de resumen mínimas sin texto completo | 60 | `REESCRITURA.palabrasMinimasDeMaterial` | Sistema | regla del sistema | vigente |
| Notas que se le piden a la IA por corrida | 40 | `REESCRITURA.porCorrida` | Sistema | regla del sistema | vigente |
| Notas que se le piden a la IA por día, como máximo (con la clave de lectura propia) | 450 | `REESCRITURA.porDia` | Sistema | regla del sistema | vigente |
| Lo mismo, mientras la lectura con IA comparte la clave gratis | 330 | `REESCRITURA.porDiaSinClaveDeLectura` | Sistema | regla del sistema | vigente |
| De esas, reservadas para lo de Balcarce (lo de afuera para antes) | 80 | `REESCRITURA.reservaParaLocales` | Sistema | regla del sistema | vigente |
| Texto completo de la fuente: caracteres que recibe la IA | 4000 | `REESCRITURA.caracteresDelTextoCompleto` | Sistema | regla del sistema | vigente |
| Antecedentes: días hacia atrás | 30 | `REESCRITURA.diasDeAntecedentes` | Sistema | regla del sistema | vigente |
| Antecedentes: como máximo | 3 | `REESCRITURA.antecedentesMaximo` | Sistema | regla del sistema | vigente |
| Portada: horas que una nota está en las listas | 36 | `PORTADA.horas` | Sistema | regla del sistema | vigente |
| Horas que puede tener un hecho para publicarse por primera vez (una nota que nunca salió y es más vieja, no sale) | 12 | `PORTADA.horasParaEstrenar` | Sistema | regla del sistema | vigente |
| Portada: horas que una nota compite por el lugar grande | 6 | `PORTADA.horasNotaGrande` | Sistema | regla del sistema | vigente |
| Días que dura la página de una nota | 180 | `PORTADA.diasDeArchivo` | Sistema | regla del sistema | vigente |
| Nota del dólar: cuánto tiene que moverse el blue o el oficial contra el día anterior para salir (%) | 2 | `NOTA_DEL_DOLAR.movimientoMinimo` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: Fútbol | 4 | `MEDIOS_DE_AFUERA.Fútbol` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: Deportes | 4 | `MEDIOS_DE_AFUERA.Deportes` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: Economía | 2 | `MEDIOS_DE_AFUERA.Economía` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: Ciencia y tecnología | 2 | `MEDIOS_DE_AFUERA.Ciencia y tecnología` | Sistema | regla del sistema | RENOMBRADO |
| Medios que tienen que contar lo de afuera: Agro | 2 | `MEDIOS_DE_AFUERA.Agro` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: Automovilismo | 2 | `MEDIOS_DE_AFUERA.Automovilismo` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera: el resto de las secciones | 3 | `MEDIOS_POR_DEFECTO` | Sistema | regla del sistema | vigente |
| Medios que tienen que contar lo de afuera que nombra a una figura argentina | 2 | `MEDIOS_CON_FIGURA` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Fútbol | 10 | `CUPO_DE_AFUERA.Fútbol` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Argentina | 12 | `CUPO_DE_AFUERA.Argentina` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Deportes | 10 | `CUPO_DE_AFUERA.Deportes` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Economía | 12 | `CUPO_DE_AFUERA.Economía` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Ciencia y tecnología | 8 | `CUPO_DE_AFUERA.Ciencia y tecnología` | Sistema | regla del sistema | RENOMBRADO |
| Cupo de lo de afuera: Política | 8 | `CUPO_DE_AFUERA.Política` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Policiales | 0 | `CUPO_DE_AFUERA.Policiales` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Automovilismo | 6 | `CUPO_DE_AFUERA.Automovilismo` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: Cultura y agenda | 8 | `CUPO_DE_AFUERA.Cultura y agenda` | Sistema | regla del sistema | vigente |
| Cupo de lo de afuera: el resto de las secciones | 15 | `CUPO_POR_DEFECTO` | Sistema | regla del sistema | vigente |
| Facebook: notas por día, como máximo | 5 | `FACEBOOK.porDia` | Redes | regla del sistema | vigente |
| Facebook: relevancia mínima | 75 | `FACEBOOK.relevanciaMinima` | Redes | regla del sistema | vigente |
| Facebook: desde la hora | 8 | `FACEBOOK.desdeHora` | Redes | regla del sistema | vigente |
| Facebook: hasta la hora (en punto) | 22 | `FACEBOOK.hastaHora` | Redes | regla del sistema | vigente |
| Facebook: minutos entre un posteo y otro | 90 | `FACEBOOK.minutosEntrePosteos` | Redes | regla del sistema | vigente |
| Facebook: minutos que espera una nota nueva | 15 | `FACEBOOK.esperaMinutos` | Redes | regla del sistema | vigente |
| Facebook: horas de vida de una nota para salir | 8 | `FACEBOOK.edadMaximaHoras` | Redes | regla del sistema | vigente |
| Facebook: horas sin repetir un tema | 24 | `FACEBOOK.horasSinRepetirTema` | Redes | regla del sistema | vigente |
| Facebook: horas que espera una nota sin foto | 3 | `FACEBOOK.horasEsperandoFoto` | Redes | regla del sistema | vigente |
| Podcasts: relevancia mínima | 62 | `PIEZAS.relevanciaPodcast` | Redes | regla del sistema | vigente |
| Podcasts (los tres repasos): notas | 4 | `PIEZAS.notasPorPodcast` | Redes | regla del sistema | vigente |
| Podcast: notas mínimas para que salga | 2 | `PIEZAS.notasMinimasPodcast` | Redes | regla del sistema | vigente |
| Podcasts: relevancia mínima de una nota de afuera (también a la noche) | 80 | `PIEZAS.relevanciaAfueraPodcast` | Redes | regla del sistema | vigente |
| Podcasts: notas de afuera como máximo en cada repaso | 2 | `PIEZAS.notasDeAfueraPorPodcast` | Redes | regla del sistema | vigente |
| Contrato del día: posteos de notas, como máximo | 5 | `CONTRATO_DIARIO.posteosPorDia` | Redes | regla del sistema | vigente |
| Contrato del día: reels (los tres podcasts) | 3 | `CONTRATO_DIARIO.reelsPorDia` | Redes | regla del sistema | vigente |
| Contrato del día: historias de podcast | 3 | `CONTRATO_DIARIO.historiasDePodcast` | Redes | regla del sistema | vigente |
| Contrato del día: historias de clima | 2 | `CONTRATO_DIARIO.historiasDeClima` | Redes | regla del sistema | vigente |
| Contrato del día: historias de farmacia | 1 | `CONTRATO_DIARIO.historiasDeFarmacia` | Redes | regla del sistema | vigente |
| Contrato del día: historias en total | 6 | `CONTRATO_DIARIO.historiasPorDia` | Redes | regla del sistema | vigente |
| Contrato del día: techo de historias (6 + 2 extras) | 8 | `CONTRATO_DIARIO.historiasMaximasPorDia` | Redes | regla del sistema | vigente |
| Contrato del día: minuto del cierre (23:30) | 1410 | `CONTRATO_DIARIO.cierreMinutoDelDia` | Redes | regla del sistema | vigente |
| Contrato del día: minutos de diferencia entre el libro y Meta | 20 | `CONTRATO_DIARIO.toleranciaDeHoraMinutos` | Redes | regla del sistema | vigente |
| Contrato del día: días de la auditoría semanal | 7 | `CONTRATO_DIARIO.diasDeAuditoriaSemanal` | Redes | regla del sistema | vigente |
| Importancia alta: medios que la cuentan, desde | 5 | `IMPORTANCIA.altaMedios` | IA | guía | NUEVO [A CONFIRMAR] |
| Importancia media: medios que la cuentan, desde | 3 | `IMPORTANCIA.mediaDesde` | IA | guía | NUEVO [A CONFIRMAR] |
| Importancia media: medios que la cuentan, hasta | 4 | `IMPORTANCIA.mediaHasta` | IA | guía | NUEVO [A CONFIRMAR] |
| Policiales de Balcarce: medios que lo cuentan para soltar el amarillo (lo rojo no cambia) | 2 | `SEMAFORO.mediosParaSoltarPoliciales` | Sistema | regla del sistema | NUEVO (DECISIÓN DE ANDRÉS 11/10 — A CONFIRMAR CON HERNÁN) |
| Cruce de medios por palabras: parecido mínimo | 0,42 | `CRUCE.parecido` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Cruce de medios: horas que se recuerda una nota | 36 | `CRUCE.horas` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Repetidas por título: parecido mínimo | 0,8 | `REPETIDAS.parecido` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Repetidas por título: horas hacia atrás | 96 | `REPETIDAS.horas` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Parejas sospechosas para la IA: parecido desde | 0,3 | `PAREJAS.parecidoDesde` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Parejas sospechosas para la IA: horas hacia atrás | 72 | `PAREJAS.horas` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Parejas sospechosas para la IA: pedidos por día, como máximo | 40 | `PAREJAS.pedidosPorDia` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Lectura con IA: notas por pedido | 12 | `LECTURA.notasPorPedido` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Lectura con IA: pedidos por corrida | 5 | `LECTURA.pedidosPorCorrida` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Lectura con IA: pedidos por día (clave compartida) | 60 | `LECTURA.pedidosPorDia` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Lectura con IA: pedidos por día (clave propia) | 200 | `LECTURA.pedidosPorDiaConClavePropia` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Repetidas con IA: pedidos por día | 60 | `LECTURA.pedidosRepetidasPorDia` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Auditoría con IA: notas por pedido | 3 | `AUDITORIA.porPedido` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Auditoría con IA: notas por corrida | 12 | `AUDITORIA.porCorrida` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Auditoría con IA: caracteres del cuerpo que se mandan | 1600 | `AUDITORIA.cuerpoMaximo` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Auditoría con IA: horas hacia atrás | 12 | `AUDITORIA.horas` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
| Fotos: notas por corrida | 10 | `FOTOS.notasPorCorrida` | Sistema | regla del sistema | vigente (hoy sólo en el código) |
<!-- NUMEROS:FIN -->
<!-- BLOQUE:B18:FIN -->
