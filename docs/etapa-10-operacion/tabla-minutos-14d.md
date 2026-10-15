Ventana 2026-10-01..2026-10-14 = 14 dias, 4220 corridas
| Workflow | corridas | por dia | min reales | min facturables | min/mes (30d) | USD/mes si privado | falla | cancel | omitidas | disparo |
| Actualizar la web | 765 | 54.6 | 3177 | 3557 | 7622 | 61 | 52 | 2 | 0 | workflow_dispatch:701 schedule:64 |
| Redes | 1730 | 123.6 | 1051 | 2228 | 4774 | 38 | 27 | 2 | 0 | workflow_dispatch:965 workflow_run:765 |
| Cloudflare Pages | 765 | 54.6 | 1653 | 1993 | 4271 | 34 | 1 | 3 | 54 | workflow_run:765 |
| Vigilancia | 722 | 51.6 | 344 | 789 | 1691 | 14 | 4 | 0 | 0 | workflow_dispatch:673 schedule:49 |
| Auditoría IA | 62 | 4.4 | 72 | 104 | 223 | 2 | 1 | 0 | 0 | workflow_dispatch:5 schedule:57 |
| Panel | 77 | 5.5 | 29 | 78 | 167 | 1 | 8 | 4 | 0 | workflow_dispatch:77 |
| Pistas | 40 | 2.9 | 18 | 41 | 88 | 1 | 0 | 0 | 0 | schedule:38 workflow_dispatch:2 |
| Armado con datos vacíos | 35 | 2.5 | 12 | 35 | 75 | 1 | 0 | 2 | 0 | push:32 schedule:2 workflow_dispatch:1 |
| Auditoría | 3 | 0.2 | 17 | 18 | 39 | 0 | 1 | 0 | 0 | schedule:2 workflow_dispatch:1 |
| Pruebas con otra hora | 3 | 0.2 | 6 | 8 | 17 | 0 | 2 | 0 | 0 | workflow_dispatch:1 schedule:2 |
| Sondeo de fuentes (temporal) | 3 | 0.2 | 5 | 7 | 15 | 0 | 1 | 0 | 0 | push:3 |
| Piezas | 1 | 0.1 | 5 | 6 | 13 | 0 | 0 | 0 | 0 | workflow_dispatch:1 |
| Fijar piezas | 4 | 0.3 | 3 | 5 | 11 | 0 | 0 | 0 | 0 | workflow_dispatch:2 schedule:2 |
| Sondear Groq | 2 | 0.1 | 1 | 2 | 4 | 0 | 0 | 0 | 0 | workflow_dispatch:2 |
| Prueba de estadísticas | 2 | 0.1 | 1 | 2 | 4 | 0 | 0 | 0 | 0 | workflow_dispatch:2 |
| Sondear búsqueda | 2 | 0.1 | 1 | 2 | 4 | 0 | 0 | 0 | 0 | workflow_dispatch:2 |
| Respaldo | 2 | 0.1 | 1 | 2 | 4 | 0 | 0 | 0 | 0 | workflow_dispatch:1 schedule:1 |
| Reintentar noticia1 | 1 | 0.1 | 1 | 1 | 2 | 0 | 0 | 0 | 0 | workflow_dispatch:1 |
| Ver Facebook | 1 | 0.1 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | workflow_dispatch:1 |
| TOTAL | 4220 | 301 | 6397 | 8879 | 19026 | 152 | | | | |
Proyeccion 30 dias: reales 13708 min (USD 110); facturables con redondeo por corrida 19026 min (USD 152)

Duracion (segundos): workflow | n | media | p50 | p95 | max
Actualizar la web | 765 | 249 | 226 | 488 | 1222
Cloudflare Pages | 765 | 130 | 131 | 181 | 454
Redes | 1730 | 36 | 17 | 151 | 1213
Vigilancia | 722 | 29 | 22 | 43 | 908
Auditoría IA | 62 | 70 | 92 | 99 | 135
Pistas | 40 | 27 | 30 | 51 | 69
Armado con datos vacíos | 35 | 21 | 19 | 32 | 54
Panel | 77 | 22 | 20 | 40 | 62
