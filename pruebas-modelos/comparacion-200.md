# Comparación contra google/gemini-3.1-flash-lite (muestra de 200 notas crudas)

La referencia es lo que hoy usa el sistema (Gemini Flash-Lite). "Acuerdo" no dice quién tiene razón: las discrepancias se revisan a mano abajo. Costo mensual con 900 notas por día, 12 por pedido.

| Modelo | Acuerdo sección | Acuerdo publicar | Acuerdo interés | Ruido que dejó pasar | Sin respuesta | Seg./nota | Tokens/nota (lote de 12) | Costo por mes |
|---|---|---|---|---|---|---|---|---|
| google/gemini-3.1-flash-lite (referencia) | — | — | — | 0/20 | 0 | 1.5 | 1405 (260) | US$ 4 |
| inception/mercury-decide [12 por pedido] | 76% (152/200) | 89% (177/200) | 72% (144/200) | 2/20 | 0 | 0.1 | 278 (51) | US$ 0.03 |
| inception/mercury-decide:free | 79% (157/200) | 94% (188/200) | 68% (136/200) | 0/20 | 0 | 0.6 | 1636 (302) | US$ 0 (gratis) |
| microsoft/microsoft-decision-1 | 69% (137/200) | 82% (164/200) | 70% (139/200) | 4/20 | 0 | 0.6 | 1913 (353) | US$ 0.40 |
| openai/gpt-6-luna-decisions | 77% (151/197) | 91% (180/197) | 70% (137/197) | 0/19 | 3 | 0.6 | 2187 (404) | US$ 1 |
| perplexity/pplx-decider-v1.1-27b | 74% (148/200) | 86% (171/200) | 71% (142/200) | 2/20 | 0 | 0.7 | 4992 (922) | US$ 0.50 |
| typesafe/jev-1.13 [12 por pedido] | 79% (158/200) | 93% (186/200) | 73% (145/200) | 0/20 | 0 | 0.0 | 952 (176) | US$ 0.20 |
| typesafe/jev-1.13 | 79% (157/200) | 93% (186/200) | 69% (138/200) | 0/20 | 0 | 0.5 | 2324 (429) | US$ 0.49 |

**Ruido que dejó pasar**: de las notas que se garantizaron por ser de lo que no debería salir (horóscopo, loterías, chimentos, policiales de afuera, extranjero), cuántas el modelo mandó a publicar. Puede haber falsos avisos (por ejemplo, un extranjero con conexión argentina): hay que mirarlas.


## inception/mercury-decide [12 por pedido]: 67 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Leo: conoce tu predicción en el horóscopo de hoy 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | Los Pumas copan el Top 14 de Francia: tries de los argentinos en la sexta fecha  (ESPN Argentina) | Deportes/bajo/no publica | Deportes/medio/publica | (Mercury Decide no da razón) |
| sección | Declararon de interés Legislativo los 75 años del Club Amigos Unidos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | Investigan el faltante de dinero en la Escuela Emilio Lamarca (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Policiales/alto/publica | (Mercury Decide no da razón) |
| sección | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata: Montenegro reglamentó el funcionamiento de Uber, DiDi y Cabify (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación rechazó un pedido de Máximo y Florencia Kirchner para fren (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | SE PRESENTÓ LA PRIMERA EXPO SALUD, DEPORTE Y TECNOLOGÍA (Municipalidad de Balcarce) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Evento Expo salud, deporte y tecnología, se lanzó el jueves (Acción 5 (Balcarce)) | Balcarce/alto/publica | Cultura y agenda/medio/publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Agro/alto/publica | (Mercury Decide no da razón) |
| publicar | Explicaron el funcionamiento del fondo para cubrir pagos de despidos (El Eco de Tandil) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | OCTUBRE ROSA (Municipalidad de San Cayetano) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Cristian Romero le dio la victoria al Atlético de Madrid ante el Alavés (LU9 Mar del Plata) | Fútbol/ninguno/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Brasil y el fenómeno de Flavio Bolsonaro: “La derecha está muy cerca de ganar nu (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Vialidad bonaerense: la ruta 205 lleva 2 años de retraso y ya sale cuatro veces  (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Hora, TV y formaciones: River recibe a Estudiantes de Río Cuarto y vuelve a juga (La Nueva) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Cuti Romero le dio la victoria al Atlético de Madrid de Simeone: Julián Álvar (Clarín) | Fútbol/bajo/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Después de Aysa, el Gobierno avanza con nuevas privatizaciones y analiza el futu (TN (Todo Noticias)) | Política/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Semana caliente en Diputados: en medio de la ofensiva opositora, el Gobierno ini (Clarín) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | River recibe a Estudiantes de Río Cuarto en un partido clave para acercarse a la (TN (Todo Noticias)) | Fútbol/ninguno/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | Revelan la versión muestra de las Air Jordan 11 GS “Green Screen”: El modelo iné (FayerWayer) | Cultura y agenda/ninguno/no publica | Tecnología/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Atentado a la AMIA: el Gobierno evalúa llevar a Irán ante la Corte Internacional (Radio Mitre) | Argentina/bajo/no publica | Política/bajo/no publica | (Mercury Decide no da razón) |
| publicar | Los argentinos pisan fuerte en Shanghai: Tirante, Cerúndolo, Báez y Ugo Carabell (Infobae) | Deportes/bajo/no publica | Deportes/medio/publica | (Mercury Decide no da razón) |
| publicar | Qué implica la suspensión provisoria del artículo del DNU 70 que deroga la Ley d (Minuto Uno) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El VAR viendo Netflix y la lesión de Paredes: Boca vuelve de Córdoba con saldo n (Bolavip Argentina) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | River Plate busca arrimarse a zona de Playoffs ante un Estudiantes de Río Cuarto (Infobae) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | Datos y estadísticas de las escuderías (ESPN Argentina) | Automovilismo/bajo/no publica | Automovilismo/medio/publica | (Mercury Decide no da razón) |
| publicar | El Cholo Simeone se emocionó al hablar sobre la enseñanza que le dejó Lionel Mes (Infobae) | Fútbol/ninguno/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | De la Espriella ordenó a la FAC investigar presunto tráfico de drogas en aviones (Infobae) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Juan Manuel Cerúndolo pasó a la segunda ronda del Masters 1000 de Shanghái y se  (Ámbito) | Deportes/bajo/no publica | Deportes/medio/publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Nico González renovó con Juventus hasta 2030 tras su paso por el Atlético de Mad (Radio Mitre) | Fútbol/bajo/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| publicar | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/publica | (Mercury Decide no da razón) |
| publicar | River Plate vs. Estudiantes (RC) EN VIVO hoy: resultado, goles y minuto a minuto (Canal 26) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El exigente pedido de Lionel Messi al equipo de su sobrino que jugará la Copa Po (C5N) | Fútbol/ninguno/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | Confirmado por el IRS en Arizona: el crédito de hasta US$35.000 que se aplica a  (La Nación) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Balotaje en Brasil: sin margen de error, Lula busca un milagro contra Bolsonaro (El Economista) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |

## inception/mercury-decide:free: 52 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Leo: conoce tu predicción en el horóscopo de hoy 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Diario celebra sus 31 años publicando «Nada mas que la Verdad». (News Balcarce (FM 91.7)) | Balcarce/alto/publica | Balcarce/medio/no publica | (Mercury Decide no da razón) |
| sección | Investigan el faltante de dinero en la Escuela Emilio Lamarca (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Policiales/alto/publica | (Mercury Decide no da razón) |
| sección | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación rechazó un pedido de Máximo y Florencia Kirchner para fren (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Agro/alto/publica | (Mercury Decide no da razón) |
| sección | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Argentina/medio/publica | (Mercury Decide no da razón) |
| sección | Milei busca desplazar la tecnología china del Estado con apoyo de Estados Unidos (El Marplatense) | Tecnología/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Tres amigos santafesinos: En un Renault 6 a Brasil a ver a Colapinto !!!! (La Verdad de Ayacucho) | Automovilismo/medio/publica | Automovilismo/medio/no publica | (Mercury Decide no da razón) |
| sección | OCTUBRE ROSA (Municipalidad de San Cayetano) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Brasil y el fenómeno de Flavio Bolsonaro: “La derecha está muy cerca de ganar nu (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Vialidad bonaerense: la ruta 205 lleva 2 años de retraso y ya sale cuatro veces  (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Semana caliente en Diputados: en medio de la ofensiva opositora, el Gobierno ini (Clarín) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | River recibe a Estudiantes de Río Cuarto en un partido clave para acercarse a la (TN (Todo Noticias)) | Fútbol/ninguno/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | Revelan la versión muestra de las Air Jordan 11 GS “Green Screen”: El modelo iné (FayerWayer) | Cultura y agenda/ninguno/no publica | Tecnología/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Atentado a la AMIA: el Gobierno evalúa llevar a Irán ante la Corte Internacional (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Qué implica la suspensión provisoria del artículo del DNU 70 que deroga la Ley d (Minuto Uno) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| publicar | El VAR viendo Netflix y la lesión de Paredes: Boca vuelve de Córdoba con saldo n (Bolavip Argentina) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |
| sección | Antonio Llambías, diseñador: “Cuando dejás de buscar cómo te gustaría vivir, es  (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Juan Manuel Cerúndolo pasó a la segunda ronda del Masters 1000 de Shanghái y se  (Ámbito) | Deportes/bajo/no publica | Deportes/medio/publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Agro/medio/publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Balotaje en Brasil: sin margen de error, Lula busca un milagro contra Bolsonaro (El Economista) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |

## microsoft/microsoft-decision-1: 86 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Leo: conoce tu predicción en el horóscopo de hoy 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | Emancipación juvenil en Argentina: en RDI se reveló que el 37% de los jóvenes de (Perfil) | Argentina/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| publicar | La AGN reveló que el BCRA perdió más de u$s1.000 millones por operaciones con el (iProfesional) | Economía/bajo/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| sección | Un hombre apuñaló a su ex pareja embarazada de cinco meses y le perforó un pulmó (Crónica) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Caso Mailén Antonich: esperan resultados de pericias que podrían ser clave para  (El Marplatense) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Federico García Lorca: Granada prepara un gran réquiem a 90 años de su asesinato (Clarín) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Semana de la Carne en Israel: Karina Milei y la embajadora Ahuva Spieler Reshef  (La Nación) | Economía/bajo/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Una misión de EEUU llegó a la Argentina para concretar las inversiones de USD 7  (Infobae) | Argentina/ninguno/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla sobre plaguicidas y su presencia en muestr (Puntonueve (FM 100.9)) | Agro/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Milei y Bullrich se reunieron en Olivos tras las diferencias públicas (Infórmese Primero (FM 104.9)) | Política/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Investigan la desaparición de dinero en el Colegio Parroquial “Emilio Lamarca” (Infórmese Primero (FM 104.9)) | Policiales/alto/publica | Balcarce/alto/publica | (Mercury Decide no da razón) |
| publicar | La Cámara de Casación rechazó un pedido de Máximo y Florencia Kirchner para fren (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| publicar | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| sección | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Evento Expo salud, deporte y tecnología, se lanzó el jueves (Acción 5 (Balcarce)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Rufino comenzó este sábado su tratamiento con Cytotron en la India (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Argentina/alto/no publica | (Mercury Decide no da razón) |
| publicar | Se suspendio por mal clima la Fiesta del Postre. (News Balcarce (FM 91.7)) | Cultura y agenda/alto/publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| sección | Milei busca desplazar la tecnología china del Estado con apoyo de Estados Unidos (El Marplatense) | Tecnología/bajo/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Tres amigos santafesinos: En un Renault 6 a Brasil a ver a Colapinto !!!! (La Verdad de Ayacucho) | Automovilismo/medio/publica | Argentina/bajo/no publica | (Mercury Decide no da razón) |
| sección | Reglamentaron el registro y las aplicaciones de transporte tendrán 45 días para  (Qué Digital) | Política/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | OCTUBRE ROSA (Municipalidad de San Cayetano) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Piden condenar a diez años de cárcel a un jefe sindical de Camioneros por bloque (Noticias y Protagonistas) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | ¿Sabías que Mar del Plata albergó el primer crimen de un funcionario público nac (0223 (Mar del Plata)) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Identificaron al hombre que murió ahogado en la playa Bristol de Mar del Plata (0223 (Mar del Plata)) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristian Romero le dio la victoria al Atlético de Madrid ante el Alavés (LU9 Mar del Plata) | Fútbol/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Tras anunciar su precandidatura a gobernador, Nardini inició su recorrida por la (Zona Norte Diario) | Política/ninguno/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| publicar | Claudio Arévalo: "Exigimos salarios dignos y el pase a planta en el Presupuesto  (Realpolitik) | Política/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Dólar en Bahía Blanca: a cuánto cerró la semana el oficial y el blue (La Nueva) | Economía/ninguno/no publica | Economía/bajo/publica | (Mercury Decide no da razón) |
| sección | Medios dominicanos informan que un pergaminense murió en un accidente de tránsit (La Opinión) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Un neurólogo explicó la técnica que fue galardonada con el Nobel de Medicina (La Brújula 24) | Tecnología/bajo/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Alineaciones de Racing y Belgrano por la Torneo Clausura: formaciones probables (Bolavip Argentina) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |
| publicar | La parrilla de salida de MotoGP en Mandalika (Indonesia): filas y posiciones (Motorsport) | Automovilismo/medio/publica | Automovilismo/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Después de Aysa, el Gobierno avanza con nuevas privatizaciones y analiza el futu (TN (Todo Noticias)) | Política/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | RIGI en Vaca Muerta con u$s6432 millones para extraer petróleo y gas (iProfesional) | Economía/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Javier Milei volvió a despotricar desaforadamente contra el "socialismo" y las " (Minuto Uno) | Política/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Siguen las lluvias y el mal tiempo en el AMBA: para cuándo se espera una mejora  (Infobae) | Argentina/ninguno/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | Revelan la versión muestra de las Air Jordan 11 GS “Green Screen”: El modelo iné (FayerWayer) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Atentado a la AMIA: el Gobierno evalúa llevar a Irán ante la Corte Internacional (Radio Mitre) | Argentina/bajo/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| sección | La Federación Portuguesa de Fútbol confirmó la suspensión provisional de Cristia (TN (Todo Noticias)) | Fútbol/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Milei cuestionó los fondos para discapacidad y acusó a la oposición por defender (iProfesional) | Política/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| publicar | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Ámbar de Benedictis homenajeó a Piero con un emotivo posteo sobre “Sinfonía Inco (Infobae) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Oro: AGN dice que se perdieron US$ 1 mil M, el BCRA que ganó y los lingotes no e (Perfil) | Economía/bajo/no publica | Argentina/bajo/publica | (Mercury Decide no da razón) |
| publicar | River Plate busca arrimarse a zona de Playoffs ante un Estudiantes de Río Cuarto (Infobae) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Datos y estadísticas de las escuderías (ESPN Argentina) | Automovilismo/bajo/no publica | Automovilismo/medio/publica | (Mercury Decide no da razón) |
| sección | Mataron a un mecánico con más de 20 puñaladas en Moreno: por qué detuvieron a su (A24) | Policiales/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Marcha contra los travesticidios (Página/12) | Argentina/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | El Cholo Simeone se emocionó al hablar sobre la enseñanza que le dejó Lionel Mes (Infobae) | Fútbol/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Peligro: tres de cuatro trenes de las líneas Roca, Sarmiento y Mitre tienen revi (Diario Popular) | Argentina/bajo/no publica | Argentina/ninguno/publica | (Mercury Decide no da razón) |
| sección | El Hôtel Lutetia: refugio de Hemingway, cuartel nazi y puerta de regreso para lo (Infobae) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El paraíso de los materos llega a La Rural: con cata guiada, ¿cómo sacar entrada (El Destape) | Cultura y agenda/bajo/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Antonio Llambías, diseñador: “Cuando dejás de buscar cómo te gustaría vivir, es  (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Santa Fe Bio y TotalEnergies firman acuerdo para impulsar la producción y export (Ámbito) | Economía/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Brasil acelera, mientras que la Argentina baja un cambio (El Economista) | Economía/bajo/no publica | Economía/bajo/publica | (Mercury Decide no da razón) |
| sección | Jugó con Bianchi en Boca, sufrió un trágico ataque en un boliche y hoy trabaja c (Ámbito) | Fútbol/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | En un partidazo, Boca empató y se fue preocupado por Paredes (Perfil) | Fútbol/bajo/publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Espargaró: "Volver a competir en MotoGP es como intentar subir a un tren en marc (Motorsport) | Automovilismo/bajo/no publica | Automovilismo/bajo/publica | (Mercury Decide no da razón) |
| publicar | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/publica | (Mercury Decide no da razón) |
| publicar | River Plate vs. Estudiantes (RC) EN VIVO hoy: resultado, goles y minuto a minuto (Canal 26) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |

## openai/gpt-6-luna-decisions: 57 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/medio/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno reveló los detalles del operativo de traslado de 1.500 presos de Dev (A24) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Una misión de EEUU llegó a la Argentina para concretar las inversiones de USD 7  (Infobae) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Investigan el faltante de dinero en la Escuela Emilio Lamarca (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Policiales/alto/publica | (Mercury Decide no da razón) |
| publicar | Cuatro gimnastas de UP clasificaron a la Final Regional del Centro (Infórmese Primero (FM 104.9)) | Deportes/alto/publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | GIMNASTAS DE UP CLASIFICARON A LA FINAL REGIONAL DEL CENTRO (Municipalidad de Balcarce) | Deportes/alto/publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Economía/bajo/publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata: Montenegro reglamentó el funcionamiento de Uber, DiDi y Cabify (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | La Cámara de Casación rechazó un pedido de Máximo y Florencia Kirchner para fren (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/bajo/publica | (Mercury Decide no da razón) |
| publicar | Rufino comenzó este sábado su tratamiento con Cytotron en la India (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Agro/alto/publica | (Mercury Decide no da razón) |
| publicar | Explicaron el funcionamiento del fondo para cubrir pagos de despidos (El Eco de Tandil) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Argentina/alto/publica | (Mercury Decide no da razón) |
| publicar | Milei busca desplazar la tecnología china del Estado con apoyo de Estados Unidos (El Marplatense) | Tecnología/bajo/no publica | Tecnología/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Tres amigos santafesinos: En un Renault 6 a Brasil a ver a Colapinto !!!! (La Verdad de Ayacucho) | Automovilismo/medio/publica | Automovilismo/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Brasil y el fenómeno de Flavio Bolsonaro: “La derecha está muy cerca de ganar nu (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Rutas de acceso a Junín: realizan obras para incorporar peajes automáticos (La Verdad) | Argentina/ninguno/no publica | Balcarce/ninguno/no publica | (Mercury Decide no da razón) |
| sección | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Vialidad bonaerense: la ruta 205 lleva 2 años de retraso y ya sale cuatro veces  (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | La parrilla de salida de MotoGP en Mandalika (Indonesia): filas y posiciones (Motorsport) | Automovilismo/medio/publica | Automovilismo/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/bajo/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/bajo/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Atentado a la AMIA: el Gobierno evalúa llevar a Irán ante la Corte Internacional (Radio Mitre) | Argentina/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Milei cuestionó los fondos para discapacidad y acusó a la oposición por defender (iProfesional) | Política/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| publicar | Dólar oficial y dólar tarjeta: banco por banco, a cuánto cotizaron este viernes  (TN (Todo Noticias)) | Economía/medio/publica | Economía/alto/no publica | (Mercury Decide no da razón) |
| publicar | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | Nelson Ginter, de 62 años, el productor de huevos de color azul más austral del  (La Nación) | Argentina/ninguno/no publica | Agro/ninguno/no publica | (Mercury Decide no da razón) |
| sección | De la Espriella ordenó a la FAC investigar presunto tráfico de drogas en aviones (Infobae) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | En un partidazo, Boca empató y se fue preocupado por Paredes (Perfil) | Fútbol/bajo/publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/bajo/no publica | (Mercury Decide no da razón) |
| sección | YCRT denunció un sabotaje tras el descarrilamiento de un tren y pidió medidas ur (TN (Todo Noticias)) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Balotaje en Brasil: sin margen de error, Lula busca un milagro contra Bolsonaro (El Economista) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |

## perplexity/pplx-decider-v1.1-27b: 76 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Leo: conoce tu predicción en el horóscopo de hoy 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | El Gobierno reveló los detalles del operativo de traslado de 1.500 presos de Dev (A24) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Semana de la Carne en Israel: Karina Milei y la embajadora Ahuva Spieler Reshef  (La Nación) | Economía/bajo/no publica | Agro/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Los Pumas copan el Top 14 de Francia: tries de los argentinos en la sexta fecha  (ESPN Argentina) | Deportes/bajo/no publica | Deportes/ninguno/publica | (Mercury Decide no da razón) |
| sección | Una misión de EEUU llegó a la Argentina para concretar las inversiones de USD 7  (Infobae) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla sobre plaguicidas y su presencia en muestr (Puntonueve (FM 100.9)) | Agro/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Milei y Bullrich se reunieron en Olivos tras las diferencias públicas (Infórmese Primero (FM 104.9)) | Política/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata: Montenegro reglamentó el funcionamiento de Uber, DiDi y Cabify (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación rechazó un pedido de Máximo y Florencia Kirchner para fren (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | SE PRESENTÓ LA PRIMERA EXPO SALUD, DEPORTE Y TECNOLOGÍA (Municipalidad de Balcarce) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/bajo/publica | (Mercury Decide no da razón) |
| sección | Evento Expo salud, deporte y tecnología, se lanzó el jueves (Acción 5 (Balcarce)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Argentina/alto/publica | (Mercury Decide no da razón) |
| sección | OCTUBRE ROSA (Municipalidad de San Cayetano) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | Ucrania bombardeó una petrolera rusa tras el pacto energético de Trump y Putin (El Eco de Tandil) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Cristian Romero le dio la victoria al Atlético de Madrid ante el Alavés (LU9 Mar del Plata) | Fútbol/ninguno/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Brasil y el fenómeno de Flavio Bolsonaro: “La derecha está muy cerca de ganar nu (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Rutas de acceso a Junín: realizan obras para incorporar peajes automáticos (La Verdad) | Argentina/ninguno/no publica | Tecnología/ninguno/no publica | (Mercury Decide no da razón) |
| sección | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Vialidad bonaerense: la ruta 205 lleva 2 años de retraso y ya sale cuatro veces  (Realpolitik) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Hora, TV y formaciones: River recibe a Estudiantes de Río Cuarto y vuelve a juga (La Nueva) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | Un neurólogo explicó la técnica que fue galardonada con el Nobel de Medicina (La Brújula 24) | Tecnología/bajo/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Javier Milei y Patricia Bullrich en Olivos: el juego de roles con el que ganan l (Letra P) | Política/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Alineaciones de Racing y Belgrano por la Torneo Clausura: formaciones probables (Bolavip Argentina) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/bajo/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Cuti Romero le dio la victoria al Atlético de Madrid de Simeone: Julián Álvar (Clarín) | Fútbol/bajo/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Javier Milei volvió a despotricar desaforadamente contra el "socialismo" y las " (Minuto Uno) | Política/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | River recibe a Estudiantes de Río Cuarto en un partido clave para acercarse a la (TN (Todo Noticias)) | Fútbol/ninguno/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Atentado a la AMIA: el Gobierno evalúa llevar a Irán ante la Corte Internacional (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Milei cuestionó los fondos para discapacidad y acusó a la oposición por defender (iProfesional) | Política/bajo/no publica | Política/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Los argentinos pisan fuerte en Shanghai: Tirante, Cerúndolo, Báez y Ugo Carabell (Infobae) | Deportes/bajo/no publica | Deportes/ninguno/publica | (Mercury Decide no da razón) |
| publicar | Qué implica la suspensión provisoria del artículo del DNU 70 que deroga la Ley d (Minuto Uno) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Un tigre mató a un joven en un zoológico de Inglaterra: el parque permanecerá ce (TN (Todo Noticias)) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/bajo/publica | (Mercury Decide no da razón) |
| publicar | El VAR viendo Netflix y la lesión de Paredes: Boca vuelve de Córdoba con saldo n (Bolavip Argentina) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | Oro: AGN dice que se perdieron US$ 1 mil M, el BCRA que ganó y los lingotes no e (Perfil) | Economía/bajo/no publica | Economía/ninguno/publica | (Mercury Decide no da razón) |
| publicar | River Plate busca arrimarse a zona de Playoffs ante un Estudiantes de Río Cuarto (Infobae) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |
| publicar | El Cholo Simeone se emocionó al hablar sobre la enseñanza que le dejó Lionel Mes (Infobae) | Fútbol/ninguno/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | De la Espriella ordenó a la FAC investigar presunto tráfico de drogas en aviones (Infobae) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Brasil acelera, mientras que la Argentina baja un cambio (El Economista) | Economía/bajo/no publica | Economía/bajo/publica | (Mercury Decide no da razón) |
| publicar | Juan Manuel Cerúndolo pasó a la segunda ronda del Masters 1000 de Shanghái y se  (Ámbito) | Deportes/bajo/no publica | Deportes/medio/publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | La advertencia de Merentiel a Boca y Riquelme por su contrato (El Destape) | Fútbol/bajo/no publica | Fútbol/ninguno/publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Nico González renovó con Juventus hasta 2030 tras su paso por el Atlético de Mad (Radio Mitre) | Fútbol/bajo/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| publicar | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/publica | (Mercury Decide no da razón) |
| publicar | River Plate vs. Estudiantes (RC) EN VIVO hoy: resultado, goles y minuto a minuto (Canal 26) | Fútbol/bajo/no publica | Fútbol/bajo/publica | (Mercury Decide no da razón) |
| publicar | Inter Miami de Lionel Messi vs. DC United por la MLS: horario, formaciones y cóm (Minuto Uno) | Fútbol/bajo/no publica | Fútbol/medio/publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Balotaje en Brasil: sin margen de error, Lula busca un milagro contra Bolsonaro (El Economista) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |

## typesafe/jev-1.13 [12 por pedido]: 53 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo de hoy, domingo 11 de octubre (C5N) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno reveló los detalles del operativo de traslado de 1.500 presos de Dev (A24) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Investigan el faltante de dinero en la Escuela Emilio Lamarca (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Policiales/alto/publica | (Mercury Decide no da razón) |
| sección | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata: Montenegro reglamentó el funcionamiento de Uber, DiDi y Cabify (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | SE PRESENTÓ LA PRIMERA EXPO SALUD, DEPORTE Y TECNOLOGÍA (Municipalidad de Balcarce) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Evento Expo salud, deporte y tecnología, se lanzó el jueves (Acción 5 (Balcarce)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Rufino comenzó este sábado su tratamiento con Cytotron en la India (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Balcarce/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Explicaron el funcionamiento del fondo para cubrir pagos de despidos (El Eco de Tandil) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Política/alto/no publica | (Mercury Decide no da razón) |
| publicar | Tres amigos santafesinos: En un Renault 6 a Brasil a ver a Colapinto !!!! (La Verdad de Ayacucho) | Automovilismo/medio/publica | Automovilismo/medio/no publica | (Mercury Decide no da razón) |
| publicar | Cuándo y qué hora se juega el Boca - River del Torneo Clausura (0223 (Mar del Plata)) | Fútbol/medio/publica | Fútbol/bajo/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/bajo/no publica | (Mercury Decide no da razón) |
| publicar | La parrilla de salida de MotoGP en Mandalika (Indonesia): filas y posiciones (Motorsport) | Automovilismo/medio/publica | Automovilismo/medio/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Después de Aysa, el Gobierno avanza con nuevas privatizaciones y analiza el futu (TN (Todo Noticias)) | Política/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Semana caliente en Diputados: en medio de la ofensiva opositora, el Gobierno ini (Clarín) | Política/medio/publica | Política/bajo/no publica | (Mercury Decide no da razón) |
| sección | Revelan la versión muestra de las Air Jordan 11 GS “Green Screen”: El modelo iné (FayerWayer) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Qué implica la suspensión provisoria del artículo del DNU 70 que deroga la Ley d (Minuto Uno) | Política/medio/publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | Antonio Llambías, diseñador: “Cuando dejás de buscar cómo te gustaría vivir, es  (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | De la Espriella ordenó a la FAC investigar presunto tráfico de drogas en aviones (Infobae) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | En un partidazo, Boca empató y se fue preocupado por Paredes (Perfil) | Fútbol/bajo/publica | Fútbol/bajo/no publica | (Mercury Decide no da razón) |
| publicar | Espargaró: "Volver a competir en MotoGP es como intentar subir a un tren en marc (Motorsport) | Automovilismo/bajo/no publica | Automovilismo/medio/publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | YCRT denunció un sabotaje tras el descarrilamiento de un tren y pidió medidas ur (TN (Todo Noticias)) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Balotaje en Brasil: sin margen de error, Lula busca un milagro contra Bolsonaro (El Economista) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |

## typesafe/jev-1.13: 54 discrepancias con google/gemini-3.1-flash-lite

| Qué | Nota | Referencia | Este modelo | Razón (este modelo) |
|---|---|---|---|---|
| sección | Horóscopo de hoy Sagitario: las predicciones para este 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Horóscopo: cómo será tu semana del 11 al 17 de octubre de 2026 (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Leo: conoce tu predicción en el horóscopo de hoy 10 de octubre de 2026 (Canal 26) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, viernes 09 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Los números de la suerte del Cronicazo y la jugada candidata para la quiniela de (Crónica) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela Nacional: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Quiniela de Tucumán: resultados en VIVO de hoy, sábado 10 de octubre de 2026 (Radio Mitre) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Un informe de la FIFA reveló que Argentina fue la selección que más mensajes de  (Infobae) | Argentina/bajo/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno reveló los detalles del operativo de traslado de 1.500 presos de Dev (A24) | Argentina/ninguno/no publica | Policiales/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Pinilla, Queopomel y Fernández Daguerre competirán en el Campeonato Argentino de (Radio Gabal (FM 104.1)) | Deportes/alto/publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Privatización de AySA: ofrecieron 340 millones de dólares por el 90% de la empre (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Montenegro se reunió con Santilli en Casa Rosada y puso el foco en la seguridad  (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata: Montenegro reglamentó el funcionamiento de Uber, DiDi y Cabify (Infórmese Primero (FM 104.9)) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Aprobaron la creación de un Registro Municipal de Acompañantes Terapéuticos (Radio Gabal (FM 104.1)) | Balcarce/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | La Provincia busca tener listo antes de fin de año el proyecto para convertir la (Infórmese Primero (FM 104.9)) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | El Gobierno apeló el fallo que ordena aplicar la Ley de Financiamiento Universit (Infórmese Primero (FM 104.9)) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Evento Expo salud, deporte y tecnología, se lanzó el jueves (Acción 5 (Balcarce)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Rufino comenzó este sábado su tratamiento con Cytotron en la India (Puntonueve (FM 100.9)) | Balcarce/alto/publica | Balcarce/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Virginia Aparicio brindará una charla abierta sobre la presencia de plaguicidas  (Infórmese Primero (FM 104.9)) | Balcarce/alto/publica | Cultura y agenda/alto/publica | (Mercury Decide no da razón) |
| publicar | Explicaron el funcionamiento del fondo para cubrir pagos de despidos (El Eco de Tandil) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Docentes bonaerenses pararán el jueves 15 en reclamo de salarios y mayor financi (La Verdad de Ayacucho) | Balcarce/alto/publica | Argentina/alto/no publica | (Mercury Decide no da razón) |
| sección | Milei busca desplazar la tecnología china del Estado con apoyo de Estados Unidos (El Marplatense) | Tecnología/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Tres amigos santafesinos: En un Renault 6 a Brasil a ver a Colapinto !!!! (La Verdad de Ayacucho) | Automovilismo/medio/publica | Automovilismo/medio/no publica | (Mercury Decide no da razón) |
| sección | OCTUBRE ROSA (Municipalidad de San Cayetano) | Balcarce/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cambió la Ley de Tránsito: cómo queda la prioridad de paso en la Provincia (NDEN – Noticias de Necochea) | Argentina/alto/publica | Política/alto/publica | (Mercury Decide no da razón) |
| sección | El obispo Ernesto Giobando realizará una Visita Pastoral a la parroquia Santa Te (Ecos Diarios (Necochea)) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Apps de transporte: taxistas advierten que la regulación “no sirve de nada” si n (Mi8 (Canal 8 Mar del Plata)) | Economía/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Buscan ingeniero mecánico para el área de instalaciones sustentables (Radio 10 Mar del Plata (FM 105.5)) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Mar del Plata se une por la inclusión en el Día Internacional del Bastón Blanco (El Marplatense) | Balcarce/ninguno/no publica | Cultura y agenda/ninguno/no publica | (Mercury Decide no da razón) |
| sección | “Le estamos enseñando a los jóvenes a tomar deuda en vez de cómo conseguir un la (Realpolitik) | Argentina/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Gustavo Sáenz planifica las elecciones de Salta para mayo y cranea la avanzada f (Letra P) | Argentina/ninguno/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | ¿Cuánto le cuesta la burocracia a la Argentina?, una Pyme pierde 2.156 horas al  (Agrositio) | Economía/medio/publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | La parrilla de salida de MotoGP en Mandalika (Indonesia): filas y posiciones (Motorsport) | Automovilismo/medio/publica | Automovilismo/medio/no publica | (Mercury Decide no da razón) |
| sección | El Gobierno espera un clima tenso en la marcha universitaria y prepara una denun (Infobae) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | El presidente de la Federación Portuguesa habló sobre Cristiano: "Hay un gran de (Olé) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Después de Aysa, el Gobierno avanza con nuevas privatizaciones y analiza el futu (TN (Todo Noticias)) | Política/bajo/no publica | Economía/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Financiamiento Universitario: el caso pasó a la Cámara Contencioso, pero el Gobi (C5N) | Argentina/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Buscan voluntarios para vivir en Necochea / Ofrecen alojamiento a cambio de cola (El Cronista) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Semana caliente en Diputados: en medio de la ofensiva opositora, el Gobierno ini (Clarín) | Política/medio/publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Revelan la versión muestra de las Air Jordan 11 GS “Green Screen”: El modelo iné (FayerWayer) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Arsenal reaccionó a tiempo ante Leeds y sigue bien arriba en la Premier League (ESPN Argentina) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Sigmund Freud, padre del psicoanálisis: “El hombre civilizado ha cambiado una pa (Radio Mitre) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Qué implica la suspensión provisoria del artículo del DNU 70 que deroga la Ley d (Minuto Uno) | Política/medio/publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | La Corte Suprema suspendió el artículo del DNU 70 que derogaba la ley de Tierras (Ámbito) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | El Hôtel Lutetia: refugio de Hemingway, cuartel nazi y puerta de regreso para lo (Infobae) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Nelson Ginter, de 62 años, el productor de huevos de color azul más austral del  (La Nación) | Argentina/ninguno/no publica | Agro/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Antonio Llambías, diseñador: “Cuando dejás de buscar cómo te gustaría vivir, es  (La Nación) | Cultura y agenda/ninguno/no publica | Argentina/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Cristiano Ronaldo vuelve con Al Nassr tras tres partidos sin goles: “Está listo  (Radio Mitre) | Argentina/ninguno/no publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Muere Mike Ditka leyenda de los Chicago Bears y Salón de la Fama NFL a los 86 añ (FayerWayer) | Argentina/ninguno/no publica | Deportes/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | En un partidazo, Boca empató y se fue preocupado por Paredes (Perfil) | Fútbol/bajo/publica | Fútbol/ninguno/no publica | (Mercury Decide no da razón) |
| publicar | Espargaró: "Volver a competir en MotoGP es como intentar subir a un tren en marc (Motorsport) | Automovilismo/bajo/no publica | Automovilismo/medio/publica | (Mercury Decide no da razón) |
| sección | Diego Santilli convocó a los gobernadores de Tucumán y Corrientes para avanzar c (A24) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
| sección | Lorenzetti tras la cautelar por la ley de Tierras: "En el Congreso es donde se d (A24) | Argentina/bajo/no publica | Política/medio/no publica | (Mercury Decide no da razón) |
| sección | La Cámara de Casación confirmó que el decomiso de los bienes a nombre de Máximo  (Radio Mitre) | Argentina/bajo/no publica | Política/ninguno/no publica | (Mercury Decide no da razón) |
