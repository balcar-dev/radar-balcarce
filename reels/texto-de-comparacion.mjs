// Los textos de la prueba de voces (18/10/2026, regla 302; docs/redes/VOCES-NUEVAS.md). Son siempre los mismos, en cualquier prueba de voz, para que dos
// audios hechos en días distintos se puedan comparar: lo mismo dicho por la voz de ahora y por una candidata. Sin dependencias.

/** El texto principal: un repaso de la noche entero (el que ya se usó para elegir las voces el 28/09), con números, nombres propios, la dirección dicha y el cierre. */
export const TEXTO_DE_COMPARACION = 'Buenas noches Balcarce, cómo estuvo el día. Repasamos lo que dejó este lunes. Para arrancar: El Fangio volvió a rugir después de 15 años. '
  + 'Otra que se comenta: la mala suerte de Ariel Durán en Balcarce. También: Movimiento 245, un espacio de contención y recuperación que funciona en Balcarce. '
  + 'Por último: Argentina contra Bolivia, cuándo juegan, entradas y las claves de un Kempes con aforo reducido. Que tengan una buena noche. '
  + 'Todo lo demás lo encontrás en Radar Balcarce punto com.';

/** Cuántas palabras tiene un texto (para el ritmo en palabras por segundo). */
export const palabrasDelTexto = (texto) => String(texto).trim().split(/\s+/).filter(Boolean).length;

/** Cuántas versiones de cada voz se crean por defecto: el mínimo que permite elegir (dos; cada versión gasta 2 audios del cupo), y lo más que se acepta (seis). */
export const VERSIONES_POR_DEFECTO = 2;
export const VERSIONES_MAXIMAS = 6;
