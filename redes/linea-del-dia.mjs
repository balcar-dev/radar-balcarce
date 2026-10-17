// La línea editorial del día (18/10/2026, regla 301; Hernán: "empezar a armar mejor el tema de guiones: que tenga mayor correlatividad entre todos los
// reels e historias").
//
// Hasta acá cada pieza se escribía suelta: el clima de la mañana, el repaso de las diez, la farmacia de la noche… cada una con su saludo, su cuerpo y su
// firma, sin saber de las otras (salvo la memoria del día, que sólo evita saludar tres veces seguidas). Ahora el día es UNA historia contada en
// capítulos, con la misma estructura, la misma voz y el mismo llamado:
//
//   1. GANCHO (3 segundos, 8 palabras o menos): el saludo de la franja, o, si ya se saludó hace poco, una frase de continuidad propia de ese
//      momento del día ("Seguimos con lo que arrancamos a la mañana.", "Llegamos al final del día.").
//   2. CUERPO: lo propio de la pieza (el clima, la farmacia, los repasos…). Esto no se toca.
//   3. ENLACE HACIA LO QUE VIENE, si la pieza que sigue está en el plan de hoy: "Recordá que a las nueve de la noche cerramos con el repaso del día."
//   4. LO QUE YA SE CONTÓ, sin repetirlo: una historia o un repaso retoma el TEMA de un repaso anterior ("lo del fútbol y lo de acá"), nunca su titular.
//      Los temas salen de la sección de las notas: no se inventa nada. "Ayer te contamos lo del campo." abre el repaso de la mañana.
//   5. CIERRE: el deseo de la franja y el LLAMADO DEL DÍA, la misma frase en todas las piezas de la fecha (`llamadoDelDia`, redes/guiones.mjs).
//
// Todo es determinístico (plantillas con variantes que elige la fecha, sin IA y sin gastar cupo de voz) y cada frase que se suma se pesa contra el tope de
// duración de su pieza: si no cabe, no se suma (el repaso no pasa de 55 segundos, el clima y la farmacia no pasan de 25). Una frase hacia lo que viene
// sólo aparece si esa pieza está en el plan y no salió todavía; una frase de lo ya contado, sólo con las notas que de verdad se contaron.
//
// El trato es uno solo (CRITERIO-REDES.md): vos rioplatense de locutor para hablarle a una persona y ustedes para desearle algo a todos; nunca tuteo.
// Sin dependencias de afuera de Node (regla 18).

import {
  variante, semillaDe, segundosDe, segundosDePodcast, llamadoDelDia, SALUDO_AL_PRINCIPIO, PUENTES, CIERRES_HUMANOS, FIRMAS_SIN_DIRECCION, firmasConDireccion,
  CLIMA_VOZ, PIEZA_FIJA_VOZ, PODCAST_VOZ,
} from './guiones.mjs';
import { SITIO_DICHO } from './prompt-redes.mjs';

/** El gancho dura 3 segundos: a 2,5 palabras por segundo (VOZ.palabrasPorSegundo), 8 palabras como mucho. */
export const GANCHO_MAX_PALABRAS = 8;
/** Lo más que puede durar una pieza de "un día como hoy" o un feriado con lo que se le suma (segundos). */
export const SEGUNDOS_MAXIMOS_DE_UN_DATO = 45;

// ------------------------------------------------------------------ los roles: qué capítulo del día es cada pieza

/** El capítulo del día que cuenta cada pieza (por su nombre en el plan), o null si no forma parte de la línea (los avisos de clima, por ejemplo). */
export function rolDe(nombre) {
  const n = String(nombre ?? '');
  if (n === 'clima-manana') return 'apertura';
  if (n === 'feriado' || n === 'efemeride') return 'dato';
  if (n === 'noticia1') return 'repaso-manana';
  if (n === 'noticia2') return 'repaso-tarde';
  if (n === 'podcast') return 'cierre-del-dia';
  if (n === 'farmacia') return 'servicio-noche';
  if (n === 'clima-noche') return 'clima-noche';
  if (n === 'agenda' || n === 'utiles' || n.startsWith('participa-')) return 'servicio';
  return null;
}

const esRepaso = (rol) => rol === 'repaso-manana' || rol === 'repaso-tarde' || rol === 'cierre-del-dia';

// ------------------------------------------------------------------ la hora, dicha

const HORAS = {
  7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez', 11: 'once', 12: 'doce', 13: 'una', 14: 'dos', 15: 'tres', 16: 'cuatro', 17: 'cinco', 18: 'seis', 19: 'siete', 20: 'ocho', 21: 'nueve', 22: 'diez',
};

/**
 * La hora de una pieza como se dice en voz alta, con su "a": "a las diez", "a las tres de la tarde", "a las nueve de la noche". null si no es una hora en
 * punto entre las 7 y las 22 (una hora con minutos no se dice: mejor no enlazar que decirla mal).
 */
export function horaDicha(hhmm, { franja = true } = {}) {
  const m = String(hhmm ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m || m[2] !== '00') return null;
  const h = Number(m[1]);
  const palabra = HORAS[h];
  if (!palabra) return null;
  const articulo = h === 13 ? 'a la' : 'a las';
  const sufijo = !franja ? '' : h >= 19 ? ' de la noche' : h >= 13 ? ' de la tarde' : '';
  return `${articulo} ${palabra}${sufijo}`;
}

// ------------------------------------------------------------------ el tema de un repaso, sin repetir su titular

const TEMAS = {
  Balcarce: 'lo de acá',
  Fútbol: 'lo del fútbol',
  Deportes: 'lo del deporte',
  Automovilismo: 'lo del automovilismo',
  Agro: 'lo del campo',
  Economía: 'lo de la economía',
  'Cultura y agenda': 'lo de la agenda cultural',
  Tecnología: 'lo de tecnología',
  Argentina: 'lo del país',
  Región: 'lo de la zona',
  Educación: 'lo de educación',
  Salud: 'lo de salud',
  Ciencia: 'lo de ciencia',
};

/** Cómo se nombra el tema de una sección ("lo del fútbol"), o null si no se nombra (Política y Policiales nunca entran en un repaso). */
export const temaDe = (seccion) => TEMAS[seccion] ?? null;

/** Hasta `max` temas distintos, en el orden en que aparecen, unidos: "lo de acá y lo del fútbol". Vacío si no hay ninguno que se nombre. */
export function temasDe(secciones = [], max = 2) {
  const vistos = [];
  for (const s of secciones) {
    const t = temaDe(s);
    if (t && !vistos.includes(t)) vistos.push(t);
    if (vistos.length === max) break;
  }
  return vistos.join(' y ');
}

// ------------------------------------------------------------------ las frases (cortas y fijas por momento; la fecha sólo elige la variante)

/** El gancho de continuidad de cada capítulo, para cuando ya se saludó hace poco y el saludo se reemplaza (8 palabras o menos). */
export const GANCHOS_DE_CONTINUIDAD = {
  dato: ['Ya viste el clima; ahora, historia.', 'Con el clima visto, vamos a la historia.', 'Después del clima, un día como hoy.'],
  'repaso-manana': ['Ya sabés cómo está el día; ahora, noticias.', 'Con el día encaminado, vamos con las noticias.', 'Ahora sí, las noticias del día.'],
  'repaso-tarde': ['Seguimos con lo que arrancamos a la mañana.', 'Retomamos lo que contamos a la mañana.'],
  servicio: ['Ahora, algo para vos.', 'Un alto: esto es para vos.', 'Ahora te toca a vos.'],
  'servicio-noche': ['Un dato para esta noche.', 'Antes de cerrar el día, un dato útil.'],
  'clima-noche': ['Ahora, cómo sigue la noche.', 'Y ahora, cómo sigue la noche.'],
  'cierre-del-dia': ['Llegamos al final del día.', 'Ya casi cerramos el día.', 'Se termina el día.'],
};

/** Lo que se dice de la pieza que viene, según cuál sea (`{h}` es su hora dicha: "a las nueve de la noche"; `{hs}`, sin la franja, para las frases que ya dicen tarde o noche). */
export const ENLACES_HACIA_ADELANTE = {
  noticia1: ['{h}, el repaso de la mañana.', 'Y {h}, las noticias para arrancar.', 'Más tarde, {h}, el repaso de la mañana.'],
  noticia2: ['{hs}, el repaso de la tarde.', 'Nos vemos {hs} con el repaso de la tarde.', 'Más tarde, {hs}, otro repaso.'],
  farmacia: ['{h}, la farmacia de turno.', 'Y {h}, la farmacia de turno.'],
  'clima-noche': ['{hs}, el clima de la noche.', 'Después, {hs}, cómo sigue la noche.'],
  podcast: ['Recordá que {h} cerramos con el repaso del día.', '{h} cerramos el día con el último repaso.', 'Y {h}, el repaso que cierra el día.'],
};

/** Qué piezas pueden venir después de cada capítulo (la primera que esté en el plan y no haya salido). */
const SIGUE_DESPUES = {
  apertura: ['noticia1'],
  dato: ['noticia1'],
  'repaso-manana': ['noticia2'],
  'repaso-tarde': ['podcast'],
  'servicio-noche': ['clima-noche', 'podcast'],
  'clima-noche': ['podcast'],
};

/** Lo ya contado, retomado por tema y sin repetir un titular (`{temas}`: "lo de acá y lo del fútbol"). */
export const RETOMAS = {
  historia: ['Si te quedaste con {temas}, hay más en la web.', 'Seguí {temas} en la web.', '{temas}: hay más en la web.'],
  'cierre-del-dia': ['Hoy ya te contamos {temas}.', 'Hoy ya vimos {temas}; esto es lo que faltaba.'],
  ayer: ['Ayer te contamos {temas}.', 'Ayer cerramos el día con {temas}.'],
};

/** El saludo a la mañana siguiente, para el repaso que cierra el día: no promete una hora (el clima de las 7 depende de la portada). */
export const DESPEDIDAS_DEL_DIA = ['Mañana seguimos desde temprano.', 'Mañana arrancamos de nuevo con el clima.', 'Mañana, otra vez desde temprano.'];

// ------------------------------------------------------------------ cortar y pegar guiones

/** Las oraciones de un guion, con su punto y el espacio que sigue. */
export const oracionesDe = (guion) => String(guion ?? '').match(/[^.?!]+[.?!]+["»)]*\s*/g) ?? [];
const palabrasDe = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const unirOraciones = (v) => v.map((o) => o.trim()).join(' ');

const CIERRES = new Set(Object.values(CIERRES_HUMANOS).flat());
const LLAMADOS_ESTANDAR = new Set([
  'Radar Balcarce.', ...FIRMAS_SIN_DIRECCION, ...firmasConDireccion(SITIO_DICHO, 'general'), ...firmasConDireccion(SITIO_DICHO, 'podcast'),
]);

/**
 * La estructura de un guion: { gancho, cuerpo, cierre, llamado }. El gancho es la primera oración; el llamado, la última; el cierre es el deseo que lo
 * precede, si lo hay; el cuerpo es lo del medio.
 */
export function estructuraDe(guion) {
  const o = oracionesDe(guion).map((x) => x.trim());
  if (o.length < 2) return { gancho: o[0] ?? '', cuerpo: [], cierre: '', llamado: '' };
  const llamado = o.at(-1);
  const hayDeseo = o.length > 2 && CIERRES.has(o.at(-2));
  return { gancho: o[0], cuerpo: o.slice(1, hayDeseo ? -2 : -1), cierre: hayDeseo ? o.at(-2) : '', llamado };
}

/** El guion con una oración nueva en el lugar `donde`: 'despues-del-gancho', 'despues-de-la-entrada' (gancho y su línea de presentación) o 'antes-del-cierre'. */
function conOracion(guion, texto, donde) {
  const o = oracionesDe(guion);
  if (o.length < 2) return guion;
  let i;
  if (donde === 'despues-del-gancho') i = 1;
  else if (donde === 'despues-de-la-entrada') i = Math.min(2, o.length - 1);
  else {
    // Antes del bloque de cierre: el llamado y, si lo hay, el deseo que lo precede.
    i = o.length - 1;
    if (o.length > 2 && CIERRES.has(o.at(-2).trim())) i -= 1;
  }
  return unirOraciones([...o.slice(0, i), texto, ...o.slice(i)]);
}

/**
 * Suma una oración al guion de la pieza si cabe: prueba primero la variante que elige la fecha y, si no entra en el tope de la pieza, las demás (las
 * hay más cortas). `armar(frase)` devuelve la oración definitiva. Devuelve el guion nuevo, o null si ninguna cabe.
 */
function sumarSiCabe(pieza, banco, semilla, ranura, donde, armar) {
  const elegida = variante(banco, semilla, ranura);
  for (const frase of [elegida, ...banco.filter((x) => x !== elegida)]) {
    const nuevo = conOracion(pieza.guion, armar(frase), donde);
    if (nuevo !== pieza.guion && cabe(pieza, nuevo)) return nuevo;
  }
  return null;
}

/** Lo que dura una pieza hablada, en segundos, y el tope que le corresponde. */
function duracionYTope(nombre, guion) {
  const rol = rolDe(nombre);
  if (esRepaso(rol)) return { segundos: segundosDePodcast(guion), tope: PODCAST_VOZ.segundosPresupuesto };
  if (rol === 'apertura' || rol === 'clima-noche') return { segundos: segundosDe(guion), tope: CLIMA_VOZ.segundosMaximo };
  if (rol === 'dato') return { segundos: segundosDe(guion), tope: SEGUNDOS_MAXIMOS_DE_UN_DATO };
  return { segundos: segundosDe(guion), tope: PIEZA_FIJA_VOZ.segundosMaximo };
}

/** ¿Cabe el guion nuevo en el tope de su pieza? Una pieza que ya se pasaba de antes no se achica ni se agranda: no se le suma nada. */
function cabe(pieza, nuevo) {
  const { segundos, tope } = duracionYTope(pieza.nombre, nuevo);
  return segundos <= tope;
}

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

// ------------------------------------------------------------------ la línea del día

/**
 * Le da a las piezas del día su lugar en la historia: cambia el guion de cada una EN EL LUGAR y devuelve lo que hizo: [{ nombre, hizo: [...] }].
 *
 *  - `piezas`: el plan del día ({ nombre, hora, guion, fueraDeTecho }, más `secciones` en los repasos); se usa después de `conMemoriaDelDia`.
 *  - `yaSalieron`: nombres de las piezas que ya salieron hoy (no se anuncian: ya pasaron).
 *  - `repasosDeHoy`: [{ nombre, hora, secciones }] de los repasos de hoy, los que ya salieron y los del plan: de ahí salen los temas que se retoman.
 *  - `ayer`: { secciones } del repaso con el que cerró ayer, o null.
 */
export function conLineaEditorialDelDia(piezas = [], {
  fecha = new Date(), yaSalieron = new Set(), repasosDeHoy = [], ayer = null,
} = {}) {
  const cambios = [];
  const vivas = piezas
    .filter((p) => p?.guion && p.hora && !p.fueraDeTecho && rolDe(p.nombre))
    .sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora));
  const delPlan = new Map(piezas.filter((p) => p?.hora && !p.fueraDeTecho).map((p) => [p.nombre, p]));

  vivas.forEach((p, k) => {
    const rol = rolDe(p.nombre);
    const hizo = [];
    const semilla = semillaDe(p.nombre, fecha);
    let hacia = null;
    const previa = vivas[k - 1] ? rolDe(vivas[k - 1].nombre) : null;

    // 1. El gancho: si el saludo se cambió por un puente genérico, el puente pasa a ser la frase de continuidad de este capítulo.
    const puente = PUENTES.find((x) => p.guion.startsWith(x));
    const banco = GANCHOS_DE_CONTINUIDAD[rol];
    // Las frases que se apoyan en lo que pasó antes ('ya viste el clima') sólo valen si la pieza anterior es esa.
    const apoyoValido = rol === 'dato' ? previa === 'apertura' : rol === 'repaso-manana' ? previa === 'apertura' || previa === 'dato' : true;
    if (puente && banco && apoyoValido) {
      const frase = variante(banco, semilla, 'continuidad');
      p.guion = p.guion.replace(puente, frase);
      hizo.push('gancho');
    }

    // 2. Hacia lo que viene: la primera pieza del plan que sigue a este capítulo, si todavía no salió y tiene una hora que se pueda decir.
    const pasoAdelante = () => {
      const candidatos = rol === 'servicio' ? [aMinutos(p.hora) < 13 * 60 ? 'noticia2' : 'farmacia'] : (SIGUE_DESPUES[rol] ?? []);
      const siguiente = candidatos.map((n) => delPlan.get(n)).find((s) => s && !yaSalieron.has(s.nombre) && aMinutos(s.hora) > aMinutos(p.hora) && horaDicha(s.hora));
      if (siguiente && ENLACES_HACIA_ADELANTE[siguiente.nombre]) {
        const nuevo = sumarSiCabe(p, ENLACES_HACIA_ADELANTE[siguiente.nombre], semilla, 'adelante', 'antes-del-cierre', (frase) => {
          const dicha = frase.replace('{h}', horaDicha(siguiente.hora)).replace('{hs}', horaDicha(siguiente.hora, { franja: false }));
          return dicha.charAt(0).toUpperCase() + dicha.slice(1);
        });
        if (nuevo) { p.guion = nuevo; hizo.push('adelante'); hacia = siguiente.nombre; }
      } else if (rol === 'cierre-del-dia') {
        const nuevo = sumarSiCabe(p, DESPEDIDAS_DEL_DIA, semilla, 'despedida', 'antes-del-cierre', (frase) => frase);
        if (nuevo) { p.guion = nuevo; hizo.push('despedida'); }
      }
    };

    // 3. Lo ya contado, retomado por tema (nunca por titular): los repasos de hoy anteriores a esta pieza; y los de ayer, para el repaso de la mañana.
    const pasoRetoma = () => {
      const anteriores = repasosDeHoy.filter((r) => r.nombre !== p.nombre && aMinutos(r.hora) < aMinutos(p.hora) && (r.secciones ?? []).length);
      let retoma = null;
      if (rol === 'repaso-manana' && ayer?.secciones?.length) {
        const temas = temasDe(ayer.secciones);
        if (temas) retoma = { donde: 'despues-de-la-entrada', banco: RETOMAS.ayer, temas };
      } else if (rol === 'cierre-del-dia' && anteriores.length) {
        const temas = temasDe(anteriores.flatMap((r) => r.secciones));
        if (temas) retoma = { donde: 'despues-de-la-entrada', banco: RETOMAS['cierre-del-dia'], temas };
      } else if ((rol === 'servicio-noche' || rol === 'clima-noche') && p.tipo !== 'reel' && anteriores.length) {
        const temas = temasDe(anteriores.at(-1).secciones, 1); // un solo tema: una historia es corta
        if (temas) retoma = { donde: 'antes-del-cierre', banco: RETOMAS.historia, temas };
      }
      if (retoma) {
        const nuevo = sumarSiCabe(p, retoma.banco, semilla, 'retoma', retoma.donde, (frase) => frase.replace('{temas}', retoma.temas));
        if (nuevo) { p.guion = nuevo; hizo.push('retoma'); }
      }
    };

    // La farmacia retoma primero (es lo que se pidió de las historias); el resto anuncia primero (el hilo del día). Lo que no entra en el tope de la pieza se pierde.
    if (rol === 'servicio-noche') { pasoRetoma(); pasoAdelante(); } else { pasoAdelante(); pasoRetoma(); }

    // 4. El llamado del día: la misma frase de cierre en todas las piezas. Una pieza que cerraba con la firma de siempre pasa a la del día; una que
    //    no tenía ninguna (el feriado) la recibe; una que tiene un llamado propio (los teléfonos útiles, "un día como hoy, en Radar Balcarce") lo conserva.
    const { llamado } = estructuraDe(p.guion);
    const delDia = llamadoDelDia(fecha, { podcast: esRepaso(rol) });
    if (LLAMADOS_ESTANDAR.has(llamado) && llamado !== delDia) {
      const nuevo = p.guion.replace(new RegExp(`${llamado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), delDia);
      // Como todo lo que se suma, el llamado del día no puede pasar la pieza de su tope (una pieza que ya lo traía del libro de recursos no cambia).
      if (cabe(p, nuevo)) { p.guion = nuevo; hizo.push('llamado'); }
    } else if (!/radar balcarce/i.test(llamado)) {
      const nuevo = `${p.guion.trim()} ${delDia}`;
      if (cabe(p, nuevo)) { p.guion = nuevo; hizo.push('llamado'); }
    }
    p.linea = { rol, hizo, hacia };
    if (hizo.length) cambios.push({ nombre: p.nombre, hizo });
  });
  return cambios;
}

// ------------------------------------------------------------------ revisar el día entero

/**
 * Revisa que el día cumpla con la línea editorial. Devuelve la lista de problemas (vacía = bien):
 *  - el gancho (la primera oración) dura 3 segundos: 8 palabras o menos;
 *  - toda pieza cierra nombrando a Radar Balcarce;
 *  - las piezas que cierran con la firma de siempre cierran todas igual ese día (el llamado del día);
 *  - toda pieza que anuncia otra (`linea.hacia`) dice la hora de esa pieza, y esa pieza está en el plan;
 *  - una historia o un servicio retoma el TEMA de un repaso y nunca su titular (`titulares`: lo ya contado, para comprobarlo).
 */
export function problemasDeLaLinea(piezas = [], { titulares = [] } = {}) {
  const problemas = [];
  const delDia = piezas.filter((p) => p?.guion && rolDe(p.nombre) && !p.fueraDeTecho);
  const llamados = new Set();
  for (const p of delDia) {
    const e = estructuraDe(p.guion);
    if (palabrasDe(e.gancho) > GANCHO_MAX_PALABRAS) problemas.push(`${p.nombre}: el gancho tiene ${palabrasDe(e.gancho)} palabras (el máximo es ${GANCHO_MAX_PALABRAS}): "${e.gancho}"`);
    if (!/radar balcarce/i.test(e.llamado)) problemas.push(`${p.nombre}: no cierra nombrando a Radar Balcarce: "${e.llamado}"`);
    if (LLAMADOS_ESTANDAR.has(e.llamado) && !esRepaso(rolDe(p.nombre))) llamados.add(e.llamado);
    if (p.linea?.hacia) {
      const destino = delDia.find((x) => x.nombre === p.linea.hacia);
      const hora = destino && horaDicha(destino.hora, { franja: false });
      if (!destino) problemas.push(`${p.nombre}: anuncia ${p.linea.hacia} y esa pieza no está en el plan`);
      else if (!hora || !p.guion.toLowerCase().includes(hora)) problemas.push(`${p.nombre}: anuncia ${p.linea.hacia} sin decir su hora (${destino.hora})`);
    }
    if (!esRepaso(rolDe(p.nombre))) {
      for (const t of titulares) if (t && p.guion.includes(t)) problemas.push(`${p.nombre}: repite un titular de un repaso ("${String(t).slice(0, 40)}…")`);
    }
  }
  if (llamados.size > 1) problemas.push(`las piezas no cierran con el mismo llamado: ${[...llamados].join(' | ')}`);
  return problemas;
}
