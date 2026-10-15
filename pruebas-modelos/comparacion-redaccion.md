# Redacción: prompt actual contra prompt nuevo, con varios modelos

15 historias (10 con una fuente y 5 con varias), el mismo verificador de producción. "Aprobadas" = el verificador no encontró problemas (sin contar el largo del cuerpo, que hoy se corta en 1.800 caracteres). Costo mensual con 450 notas por día, un intento por nota (en producción hay hasta 3 intentos si falla).

| Modelo | Prompt | Escritas | Aprobadas sin problemas | Fallas más comunes | Cuerpo (1 fuente / varias) | En la guía de largo | Título / bajada | Seg. | Costo por mes |
|---|---|---|---|---|---|---|---|---|---|
| ~deepseek/deepseek-flash-latest (razonamiento apagado) | actual (20606 car.) | 13/15 (2 error) | 2/13 (15%) | copia 9, repite 2, numero 1 | 150 / 145 | 6/13 | 65 car. / 38 pal. | 8.4 | US$ 5.4 |
| ~deepseek/deepseek-flash-latest (razonamiento apagado) | nuevo (17448 car.) | 15/15 | 1/15 (7%) | copia 11, fecha 5, numero 4 | 185 / 159 | 6/15 | 63 car. / 36 pal. | 10.2 | US$ 5.0 |
| amazon/nova-lite-v1 (razonamiento apagado) | actual (20606 car.) | 15/15 | 1/15 (7%) | copia 12, repite 8, pasado 3 | 125 / 120 | 6/15 | 58 car. / 24 pal. | 5.3 | US$ 7.6 |
| amazon/nova-lite-v1 (razonamiento apagado) | nuevo (17448 car.) | 15/15 | 0/15 (0%) | copia 13, repite 10, pasado 7 | 128 / 135 | 7/15 | 62 car. / 33 pal. | 4.9 | US$ 6.6 |
| anthropic/claude-haiku-5.5 (razonamiento apagado) | actual (20606 car.) | 15/15 | 2/15 (13%) | copia 11, nombre 7, numero 3 | 146 / 128 | 6/15 | 68 car. / 32 pal. | 6.2 | US$ 23 |
| anthropic/claude-haiku-5.5 | actual (20606 car.) | 15/15 | 3/15 (20%) | copia 9, numero 4, fecha 2 | 159 / 136 | 5/15 | 68 car. / 33 pal. | 18.8 | US$ 44 |
| anthropic/claude-haiku-5.5 (razonamiento apagado) | nuevo (17448 car.) | 14/15 (1 error) | 1/14 (7%) | copia 11, numero 4, repite 4 | 170 / 135 | 5/14 | 65 car. / 32 pal. | 6.4 | US$ 22 |
| anthropic/claude-haiku-5.5 | nuevo (17448 car.) | 15/15 | 3/15 (20%) | numero 5, copia 4, repite 4 | 176 / 152 | 5/15 | 72 car. / 39 pal. | 18.6 | US$ 41 |
| deepseek/deepseek-v4-pro (razonamiento apagado) | actual (20606 car.) | 15/15 | 2/15 (13%) | copia 13, fecha 5, nombre 4 | 171 / 173 | 6/15 | 66 car. / 39 pal. | 28.6 | US$ 25 |
| deepseek/deepseek-v4-pro | actual (20606 car.) | 5/15 (10 error) | 0/5 (0%) | numero 4, fecha 4, copia 3 | 178 / 148 | 2/5 | 70 car. / 39 pal. | 112.6 | US$ 43 |
| deepseek/deepseek-v4-pro (razonamiento apagado) | nuevo (17448 car.) | 14/15 (1 error) | 0/14 (0%) | copia 11, fecha 4, numero 3 | 172 / 142 | 3/14 | 68 car. / 39 pal. | 14.5 | US$ 22 |
| deepseek/deepseek-v4-pro | nuevo (17448 car.) | 10/15 (5 error) | 0/10 (0%) | copia 6, fecha 5, numero 5 | 118 / 144 | 3/10 | 62 car. / 45 pal. | 86.2 | US$ 49 |
| google/gemini-2.5-flash-lite (razonamiento apagado) | actual (20606 car.) | 15/15 | 0/15 (0%) | copia 12, repite 10, titulo 1 | 124 / 99 | 6/15 | 62 car. / 38 pal. | 5.0 | US$ 15 |
| google/gemini-2.5-flash-lite (razonamiento apagado) | nuevo (17448 car.) | 15/15 | 3/15 (20%) | copia 11, repite 4, numero 4 | 164 / 118 | 3/15 | 62 car. / 35 pal. | 4.0 | US$ 13 |
| google/gemini-3.1-flash-lite | actual (20606 car.) | 15/15 | 5/15 (33%) | numero 7, fecha 4, copia 3 | 144 / 123 | 7/15 | 67 car. / 32 pal. | 3.9 | US$ 37 |
| google/gemini-3.1-flash-lite | nuevo (17448 car.) | 15/15 | 3/15 (20%) | numero 10, fecha 6, copia 4 | 155 / 132 | 5/15 | 67 car. / 33 pal. | 3.8 | US$ 35 |
| google/gemma-4-26b-a4b-it (razonamiento apagado) | actual (20606 car.) | 15/15 | 4/15 (27%) | numero 8, fecha 6, nombre 3 | 131 / 125 | 9/15 | 59 car. / 30 pal. | 9.4 | US$ 8.1 |
| google/gemma-4-26b-a4b-it (razonamiento apagado) | nuevo (17448 car.) | 13/15 (2 error) | 3/13 (23%) | copia 7, numero 5, fecha 4 | 146 / 157 | 3/13 | 60 car. / 34 pal. | 10.8 | US$ 7.5 |
| google/gemma-4-26b-a4b-it:free (razonamiento apagado) | actual (20606 car.) | 0/15 (15 error) | 0/0 (n/d) | — | — / — | 0/0 | — | 0.5 | s/d |
| google/gemma-4-26b-a4b-it:free (razonamiento apagado) | nuevo (17448 car.) | 0/15 (15 error) | 0/0 (n/d) | — | — / — | 0/0 | — | 0.6 | s/d |
| google/gemma-4-31b-it | actual (20606 car.) | 14/15 (1 error) | 5/14 (36%) | copia 5, numero 3, fecha 3 | 129 / 110 | 5/14 | 59 car. / 32 pal. | 9.5 | US$ 11 |
| google/gemma-4-31b-it | nuevo (17448 car.) | 15/15 | 4/15 (27%) | copia 6, numero 3, promesa 3 | 131 / 105 | 7/15 | 60 car. / 35 pal. | 48.6 | US$ 10 |
| google/gemma-4-31b-it:free (razonamiento apagado) | actual (20606 car.) | 0/15 (15 error) | 0/0 (n/d) | — | — / — | 0/0 | — | 0.7 | s/d |
| google/gemma-4-31b-it:free (razonamiento apagado) | nuevo (17448 car.) | 0/15 (15 error) | 0/0 (n/d) | — | — / — | 0/0 | — | 0.6 | s/d |
| mistralai/mistral-small-3.2-24b-instruct (razonamiento apagado) | actual (20606 car.) | 14/15 (1 error) | 1/14 (7%) | numero 7, repite 6, fecha 5 | 96 / 87 | 6/14 | 70 car. / 25 pal. | 14.2 | US$ 11 |
| mistralai/mistral-small-3.2-24b-instruct (razonamiento apagado) | nuevo (17448 car.) | 14/15 (1 error) | 0/14 (0%) | numero 10, repite 10, copia 9 | 112 / 119 | 8/14 | 69 car. / 26 pal. | 17.1 | US$ 9.5 |
| nvidia/nemotron-3-super-120b-a12b:free (razonamiento bajo) | actual (20606 car.) | 9/15 (6 error) | 0/9 (0%) | numero 8, nombre 6, fecha 5 | 148 / 163 | 5/9 | 79 car. / 44 pal. | 46.0 | US$ 0 |
| nvidia/nemotron-3-super-120b-a12b:free (razonamiento bajo) | nuevo (17448 car.) | 11/15 (4 error) | 1/11 (9%) | numero 8, copia 8, fecha 7 | 142 / 144 | 8/11 | 75 car. / 47 pal. | 32.7 | US$ 0 |
| openai/gpt-5-nano (razonamiento bajo) | actual (20606 car.) | 13/15 (2 error) | 2/13 (15%) | copia 8, repite 5, nombre 3 | 156 / 151 | 5/13 | 73 car. / 38 pal. | 7.3 | US$ 12 |
| openai/gpt-5-nano | actual (20606 car.) | 6/15 (9 error) | 0/6 (0%) | numero 4, copia 4, nombre 3 | 134 / 192 | 3/6 | 75 car. / 44 pal. | 58.3 | US$ 44 |
| openai/gpt-5-nano (razonamiento bajo) | nuevo (17448 car.) | 12/15 (3 error) | 0/12 (0%) | copia 11, repite 7, nombre 2 | 218 / 157 | 5/12 | 80 car. / 32 pal. | 8.4 | US$ 12 |
| openai/gpt-5-nano | nuevo (17448 car.) | 6/15 (9 error) | 0/6 (0%) | repite 6, copia 5, numero 2 | 253 / 233 | 2/6 | 86 car. / 41 pal. | 58.0 | US$ 45 |
| openai/gpt-oss-120b (razonamiento bajo) | actual (20606 car.) | 15/15 | 0/15 (0%) | numero 10, fecha 7, copia 7 | 140 / 117 | 7/15 | 69 car. / 42 pal. | 48.6 | US$ 6.5 |
| openai/gpt-oss-120b | actual (20606 car.) | 8/15 (7 error) | 1/8 (13%) | numero 6, copia 4, nombre 4 | 143 / 131 | 4/8 | 70 car. / 46 pal. | 87.2 | US$ 9.7 |
| openai/gpt-oss-120b (razonamiento bajo) | nuevo (17448 car.) | 15/15 | 1/15 (7%) | repite 8, copia 8, numero 6 | 134 / 119 | 6/15 | 62 car. / 41 pal. | 23.0 | US$ 5.2 |
| openai/gpt-oss-120b | nuevo (17448 car.) | 11/15 (4 error) | 0/11 (0%) | numero 9, fecha 6, repite 5 | 149 / 146 | 4/11 | 67 car. / 47 pal. | 78.2 | US$ 8.4 |
| openai/gpt-oss-20b (razonamiento bajo) | actual (20606 car.) | 14/15 (1 error) | 0/14 (0%) | numero 10, repite 9, copia 8 | 126 / 135 | 9/14 | 66 car. / 39 pal. | 25.9 | US$ 2.7 |
| openai/gpt-oss-20b (razonamiento bajo) | nuevo (17448 car.) | 12/15 (3 error) | 1/12 (8%) | copia 8, repite 7, numero 6 | 131 / 135 | 6/12 | 63 car. / 34 pal. | 23.8 | US$ 2.8 |
| qwen/qwen3.5-flash-02-23 (razonamiento apagado) | actual (20606 car.) | 8/15 (7 error) | 2/8 (25%) | numero 4, fecha 3, copia 2 | 135 / 101 | 4/8 | 64 car. / 34 pal. | 6.0 | US$ 8.7 |
| qwen/qwen3.5-flash-02-23 (razonamiento apagado) | nuevo (17448 car.) | 8/15 (7 error) | 1/8 (13%) | copia 4, numero 3, fecha 3 | 129 / 105 | 2/8 | 62 car. / 38 pal. | 6.2 | US$ 8.1 |
| qwen/qwen3.7-flash (razonamiento apagado) | actual (20606 car.) | 10/15 (5 error) | 1/10 (10%) | copia 7, fecha 3, numero 3 | 159 / 156 | 5/10 | 68 car. / 31 pal. | 8.2 | US$ 4.1 |
| qwen/qwen3.7-flash (razonamiento apagado) | nuevo (17448 car.) | 6/15 (9 error) | 0/6 (0%) | copia 4, fecha 2, localia 1 | 167 / 159 | 2/6 | 69 car. / 33 pal. | 8.2 | US$ 3.7 |

Al lado de cada prompt va el tamaño del prompt en caracteres. Cuerpo = palabras promedio. "En la guía de largo": 90–150 palabras con una fuente, 150–250 con varias.
