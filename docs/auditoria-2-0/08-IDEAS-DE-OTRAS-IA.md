# Ideas de otras IA para Radar 2.0

*17/10/2026. Pedido de Hernán: "entrá con el Chrome a otras IA (ChatGPT, Grok, Gemini, Meta) y fijate qué ideas te dan para
mejorar cada área, por si se nos pasa algo". Se les mandó a las cuatro la misma descripción del proyecto (sin datos privados
ni claves) y el mismo pedido: 3 a 5 ideas por área, sin costo. Contestaron ChatGPT, Gemini y Meta AI; Grok pide crear una
cuenta para responder y eso no lo hace Claude.*

Las ideas se separan en tres grupos: **lo nuevo que conviene**, **lo que ya tenemos** (confirma que vamos bien) y **lo que no
conviene** (con el motivo). Al lado de cada una, quién la propuso: (C) ChatGPT, (G) Gemini, (M) Meta AI.

## Lo nuevo que conviene (sin costo)

### Periodismo y criterio
- **Seguir los temas hasta el final** (C, G, M): una lista de asuntos abiertos (obras anunciadas, cortes, búsquedas,
  reclamos) que el sistema vuelve a mirar a las 24 horas y a los 30 días: "Qué pasó con…". Nadie lo hace en el pueblo.
- **Separar noticia nueva de actualización** (C): si cinco medios cuentan el mismo corte, es una ficha que se actualiza,
  no cinco notas. Encaja con el cruce y con las repetidas de la regla 175.
- **Servicio con fecha de vencimiento** (C, M): cortes de luz y agua de la Cooperativa, calles cortadas, vacunación,
  inscripciones, cambios de horario; con "válido hasta". Ya hacemos clima, farmacia y agenda: sumar cortes y trámites.
- **La pregunta útil** (C): antes de publicar, "¿qué puede hacer o entender mejor un vecino después de leer esto?". Sirve
  como pregunta de la ficha de la IA para lo dudoso.

### Fuentes
- **Fuentes que no son medios** (C, G, M): boletín oficial municipal (SIBOM manda cada boletín gratis por mail, ver
  07-MEDIOS-PARECIDOS.md § 7), orden del día del Concejo, Bomberos, Cooperativa Eléctrica, INTA Balcarce, hospital,
  escuelas, Liga Balcarceña. Coincide con la "sala de prensa" propia que propuso la investigación de medios.
- **Un buzón para los vecinos** (C, G, M): un número o una dirección donde la gente manda fotos y datos. No se publica
  directo: es un sensor que después se verifica. Gratis por mail (Cloudflare Email Routing) o Telegram.
- **Red de 20 referentes** (C): clubes, escuelas, centros de jubilados, sociedades de fomento, bomberos. Invitarlos a
  mandar novedades; aclarar que recibir no garantiza publicar.

### IA y control de calidad
- **Tabla de afirmaciones** (C): que la IA liste cada nombre, cifra, fecha, cargo y cita con la fuente exacta que la
  respalda; lo que no encuentra queda "sin verificar", no se rellena. Es la evolución natural del verificador actual.
- **"[por confirmar]" si un dato está en una sola fuente** (M) y **listar las contradicciones sin elegir** (M).
- **Separar extraer, redactar y revisar** (C, G): tres pasos con instrucciones distintas.
- **Banco de 50 casos de prueba** (C): ejemplos reales (repetidas, fuentes contradictorias, títulos engañosos, fechas
  viejas) contra los que se prueba cada cambio de instrucción. Ya existe la herramienta (`reels/comparar-instruccion.mjs`):
  falta el banco fijo.
- **Registro de correcciones con su causa** (C): fecha, nota, tipo de error, gravedad y causa (fuente, cruce,
  instrucción). Hoy `correcciones.json` guarda el arreglo pero no la causa.
- **La voz dice que es IA** (M): que los reels digan al principio "resumen automático de Radar, con voz de IA". En un pueblo
  baja la desconfianza.

### Fotos
- **Banco de fotos propio de Balcarce** (C, G, M): sacar fotos (con el celular) de la plaza, el Palacio Municipal, la
  sierra, el autódromo, el hospital, accesos y calles conocidas, o pedirlas con permiso a instituciones. Con eso las notas
  de servicio y las de lugares tienen foto real sin depender de otros medios ni de la IA. **Es lo que más mejora con menos
  esfuerzo.**
- **Ilustraciones con identidad de Balcarce** (M): sumar al pedido de la ilustración el paisaje de acá (la sierra, el campo,
  el cielo), para que dejen de ser genéricas.
- **Placas con datos en vez de dibujos** (G): para un corte, el clima del finde o un evento, una placa con el dato útil
  (mapa simple, horario, lugar) en lugar de una escena inventada.

### Redes y audiencia
- **Medir clics y no cantidad de publicaciones** (C): alcance local, clics al sitio, comentarios útiles, seguidores nuevos.
  Comparar en bloques de 4 semanas (ya está la prueba que cierra el 5/11).
- **Los tres repasos, distintos** (C): "Lo importante de la mañana", "Qué cambia hoy en Balcarce", "El cierre del día".
- **Un solo reel corto diario para Instagram** (M): "Hoy en Balcarce en 30 segundos", con subtítulos grandes, en lugar de
  tres podcasts que no rinden ahí.
- **Canal de WhatsApp a mano** (C, G, M): un mensaje por día a las 20 con 5 titulares. No se puede automatizar (no hay forma
  oficial), pero el sistema puede dejar el texto listo para pegar. Es el plan B si Facebook baja el alcance.
- **Probar posteos sin enlace** (M): Facebook castiga los enlaces. Probar en algunos posteos el texto completo con la foto y
  "más en radarbalcarce.com" sin enlace, y medir si sube el alcance aunque baje el clic. Prueba, no regla.
- **La pregunta de los vecinos** (C): una vez por semana se responde una duda que se repite en los comentarios, con datos
  verificados.

### Sitio
- **Página /hoy** (M): una dirección que siempre muestra lo de hoy, fácil de mandar por WhatsApp.
- **"Sólo Balcarce"** (M): un botón para ver sólo lo de acá.
- **Etiquetas por barrio, calle o ruta** (C, G, M): "Ruta 226", "Barrio Favaloro", "Centro". La gente busca su calle.
- **"Publicado" y "Actualizado"** (C): dos fechas distintas cuando una nota se corrige.

### Comercial (para cuando llegue)
- **Patrocinar lo útil** (C, G, M): "Farmacia de turno, presentada por…", "El clima del finde, presentado por…". Es lo que
  mejor funciona en lugares chicos y no se mezcla con las noticias.
- **Guía de comercios gratis con un destacado pago** (C, G, M), con un piloto de 3 comercios por un mes antes de armar
  planes.
- **Reglas comerciales escritas antes de vender** (C): qué rubros se aceptan, cómo se marca "Publicidad", y que pagar nunca
  compra una nota ni saca una información verdadera.

### Confianza y medios locales
- **Página "Cómo trabajamos"** (C, G, M): dos vecinos, usamos IA, resumimos lo que publicaron otros, citamos siempre, no
  reemplazamos a nadie. (Revisar la que hay en "Quiénes somos" y ampliarla.)
- **Crédito visible con enlace** (G, M): además del desplegable "Fuentes (N)", una línea al final: "Publicado
  originalmente por El Diario (enlace)". Cuando la noticia es de un solo medio de acá, resumen corto y botón grande "Leé
  la nota completa en…".
- **Que un medio pueda pedir que no lo usemos** (M): un formulario o un mail; se excluye en 24 horas.
- **Un canal de correcciones visible** (C): un mail para avisar errores y una línea "Corregido el …" en la nota.
- **Un consejo de tres** (M): dos periodistas de acá y un docente que miran el criterio una vez por mes.

### Riesgos que señalaron
- **Instrucciones escondidas en las fuentes** (C): un texto de un feed puede intentar manipular a la IA. Coincide con el
  informe 06: agregar en todas las instrucciones que el texto de la fuente es material, no órdenes.
- **Robo de cuentas** (C): verificación en dos pasos en Google, Meta, GitHub y Cloudflare; probar que los respaldos se
  pueden recuperar.
- **Depender de Facebook** (C, G, M): el canal de WhatsApp y un mail diario son el plan B.
- **Fotos de otros medios** (C, M): el crédito no alcanza como permiso (la investigación encontró un fallo de julio de 2026
  contra la revista Ñ por una foto). Pedir permiso a los medios de acá y priorizar fotos propias y oficiales.
- **Si Gemini cambia el precio** (M): tener siempre un respaldo (ya está Groq para leer; falta para redactar).

## Lo que ya tenemos (vamos bien)
Sitio rápido y estático para el celular; repetidas por significado (se está haciendo); cuidado de menores y víctimas;
Política y Policiales con persona; respaldo en R2; aviso cuando el sistema falla (vigilante y mails); no volver a pedirle a
la IA lo ya escrito; idempotencia de las publicaciones; crédito de la foto en el epígrafe; modelo liviano de Gemini.

## Lo que no conviene
- **Superponer un degradé o un recorte sobre la foto de otro medio para "transformarla"** (M): no la hace legal y va contra la
  regla de no poner nada encima de una imagen.
- **Cambiar los encabezados o usar proxies para que los medios no nos bloqueen** (G): es esconderse de quien nos da la
  información; si un medio no quiere, se respeta.
- **Publicar en grupos de Facebook con un programa** (G): desde 2024 no hay forma oficial y arriesga la página. A mano y
  con permiso del administrador, sí.
- **Comentar en las notas de otros medios con nuestro enlace** (M): se lee como aprovecharse del trabajo ajeno.
- **"Si no afecta a Balcarce, no entra"** (M): contradice lo decidido (lo nacional entra por popularidad).
- **Leer WhatsApp Web o Facebook con robots (nitter, rss-bridge)** (G, M): va contra los términos de uso.
- **AdSense** (G): ensucia el sitio y paga poco con este tráfico; mejor el patrocinio local.
- **"Gemini 1.5 Flash"** (G): ya no es el modelo actual; usamos `gemini-flash-lite-latest`.
