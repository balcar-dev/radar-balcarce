// Los textos que explican el panel del celular (29/09). Sin nada del DOM: se
// prueban con Node (pruebas/celular-app.test.mjs). Hernán pidió "explicar bien
// todo": cada pestaña, cada botón y por qué espera cada nota.

/**
 * De qué tipo es el motivo que anota el semáforo (ingesta/ingesta.mjs,
 * ingesta/lectura-ia.mjs, reels/reescritura.mjs): { tipo, palabra }.
 */
export function tipoDeMotivo(motivo = '') {
  const m = String(motivo).toLowerCase();
  const palabra = (m.match(/"([^"]+)"/) ?? [])[1] ?? null;
  const con = (tipo) => ({ tipo, palabra });
  if (/verificaci[oó]n baja/.test(m)) return con('verificacion');
  if (/promoci|sorteo/.test(m)) return con('promocion');
  if (/de afuera y poco contada|de afuera, contada por/.test(m)) return con('poco-contada');
  if (/cupo/.test(m)) return con('cupo');
  if (/cotizaci[oó]n del d[oó]lar/.test(m)) return con('dolar');
  if (/internacional|extranjero|otro pa[ií]s/.test(m)) return con('extranjero');
  if (/sin nombrar balcarce|espera la lectura/.test(m)) return con('lectura');
  if (/s[oó]lo de balcarce/.test(m)) return con('seccion-de-aca');
  if (/marcada "pendiente"/.test(m)) return con('pc');
  if (/ojo humano|necesita/.test(m) && palabra) {
    if (/detenid|imputad|acusad|denunci|allanamient|sospechos|investigad|aprehendid|arrestad/.test(palabra)) return con('acusa');
    if (/muert|falleci|herid|choque|accidente|v[ií]ctima|homicid|asesin/.test(palabra)) return con('muerte');
    if (/niñ|menor|chic|adolescent|alumn|escuel|beb|estudiant/.test(palabra)) return con('chico');
    if (/abus|viol|g[eé]nero|femicid/.test(palabra)) return con('violencia');
    return con('palabra');
  }
  return con('otro');
}

/** Por qué una nota espera a una persona, en pocas palabras (para la lista). */
export function motivoCorto(motivo = '') {
  const { tipo, palabra } = tipoDeMotivo(motivo);
  const cita = palabra ? ` ("${palabra}")` : '';
  return {
    verificacion: 'Poco confirmada',
    promocion: `Parece promoción${cita}`,
    'poco-contada': 'De afuera, pocos medios',
    cupo: 'De afuera, ya hay muchas',
    dolar: 'Cotización del dólar',
    extranjero: 'De otro país',
    lectura: 'De un medio de acá, ¿es de acá?',
    'seccion-de-aca': 'Sección sólo de Balcarce',
    pc: 'Dejada esperando en la PC',
    acusa: `Acusa a alguien${cita}`,
    muerte: `Muerto o herido${cita}`,
    chico: `Involucra a un chico${cita}`,
    violencia: `Tema delicado${cita}`,
    palabra: `Palabra delicada${cita}`,
  }[tipo] ?? (motivo ? String(motivo) : 'Espera a una persona');
}

/** Por qué una nota espera a una persona y qué mirar, dicho en castellano. */
export function explicarMotivo(motivo = '') {
  const { tipo, palabra } = tipoDeMotivo(motivo);
  const dice = palabra ? `Dice "${palabra}"` : 'Toca un tema delicado';
  switch (tipo) {
    case 'verificacion': return 'La contó un solo medio y se apoya en una denuncia, en declaraciones de una parte o en datos que nadie más confirmó. Puede ser cierta, pero conviene que una persona la mire antes: que lo que no está confirmado diga "según…".';
    case 'promocion': return `${palabra ? `Dice "${palabra}": ` : ''}parece una promoción (un sorteo, una venta, un descuento) más que una noticia.`;
    case 'poco-contada': return 'Es de afuera y la contaron menos medios de los que pide su sección para salir sola.';
    case 'cupo': return 'Es de afuera y su sección ya tiene hoy todas las notas de afuera que admite.';
    case 'dolar': return 'Es la cotización del dólar de otro medio: el dólar ya está en la página /dolar.';
    case 'extranjero': return 'Habla de otro país y no se ve la conexión con la Argentina.';
    case 'lectura': return 'La publicó un medio de Balcarce pero no nombra Balcarce ni la zona: puede ser una noticia de afuera copiada. Espera a que la IA la lea, o a que una persona decida.';
    case 'seccion-de-aca': return 'Es de afuera y quedó en una sección que es sólo para lo de Balcarce y la zona.';
    case 'pc': return 'Alguien la dejó esperando en el panel de la PC.';
    case 'acusa': return `${dice}: acusa a alguien. Hay que mirar que la acusación esté atribuida a quien la hizo (la Policía, la Justicia, un denunciante) y en condicional, y que no se afirme como un hecho.`;
    case 'muerte': return `${dice}: habla de un muerto o un herido. Hay que mirar que no identifique a una víctima y que el tono sea el serio.`;
    case 'chico': return `${dice}: involucra a un chico. Hay que mirar que no se lo pueda identificar (ni nombre, ni escuela, ni foto).`;
    case 'violencia': return `${dice}: puede tratarse de violencia o de un abuso. Hay que mirar que no identifique a la víctima, ni directa ni indirectamente.`;
    case 'palabra': return `${dice}, una palabra que pide que una persona la mire antes de publicarla.`;
    default: return motivo ? `El semáforo la frenó: ${motivo}.` : 'Espera a una persona.';
  }
}

const AMBITOS = {
  balcarce: 'pasa en Balcarce', region: 'es de la zona', provincia: 'es de la provincia', nacional: 'es nacional', internacional: 'es del exterior',
};
const IMPACTOS = {
  directo: 'cambia algo concreto en Balcarce', indirecto: 'toca a la zona o a una actividad de la ciudad', nulo: 'no cambia nada en Balcarce',
};

/** Lo que anotó la IA al leer la nota (ingesta/lectura-ia.mjs), en una oración. */
export function explicarFicha(ficha) {
  if (!ficha) return '';
  // "Pasa en Balcarce" ya dice que cambia algo acá: no se repite.
  const impacto = ficha.ambito === 'balcarce' && ficha.impacto === 'directo' ? null : IMPACTOS[ficha.impacto];
  const frase = [AMBITOS[ficha.ambito], impacto].filter(Boolean).join(' y ');
  const partes = [
    frase ? `${frase[0].toUpperCase()}${frase.slice(1)}.` : '',
    ficha.importancia ? `Importancia ${ficha.importancia}.` : '',
    ficha.porque ? String(ficha.porque).trim().replace(/\.?$/, '.') : '',
  ];
  return partes.filter(Boolean).join(' ');
}

/** Qué va a pasar con una nota sin cuerpo: si la IA todavía la puede escribir sola. */
export function estadoSinCuerpo({ intentos = 0, maximo = 3, conCuerpo = false } = {}) {
  if (conCuerpo) return { texto: 'Ya tiene cuerpo: sale en la próxima actualización.', clase: 'ok' };
  if (intentos >= maximo) return { texto: `La IA ya lo intentó ${maximo} veces: no sale sola. Si importa, escribila vos (con la IA o a mano).`, clase: 'mal' };
  if (intentos > 0) return { texto: `La IA lo intentó ${intentos} de ${maximo} veces: lo vuelve a probar sola en la próxima actualización.`, clase: 'espera' };
  return { texto: 'La IA la escribe sola en la próxima actualización.', clase: 'espera' };
}

/**
 * Por qué el verificador rechazó el último intento de la IA, en castellano (el
 * motivo viene de intentos-ia.json: "cuerpo: 2 problemas (relleno, copia): …").
 */
export function explicarMotivoSinCuerpo(motivo = '') {
  const m = String(motivo ?? '');
  if (!m || /^con cuerpo/.test(m)) return '';
  const partes = [];
  if (/copia/.test(m)) partes.push('copió demasiadas palabras seguidas de la fuente (no se puede copiar)');
  if (/relleno/.test(m)) partes.push('usó frases de relleno sin datos');
  if (/numero/.test(m)) partes.push('un número no coincidía con lo que dicen las fuentes');
  if (/nombre/.test(m)) partes.push('un nombre no coincidía con las fuentes');
  if (/palabras/.test(m) && !partes.length) partes.push('el cuerpo quedó demasiado corto');
  return partes.length ? `El verificador rechazó el último intento: la IA ${partes.join(' y ')}.` : `El verificador rechazó el último intento (${m.slice(0, 120)}).`;
}

/** Lo que explica cada pestaña, arriba de la lista. */
export const PESTANAS = {
  esperan: 'Notas que el sistema no publica solo: tocan un tema delicado, son de afuera y poco contadas, o no se pudieron verificar bien. Cada una trae por qué espera y lo que contó cada medio. Para publicar una tocás "Publicar": la IA la escribe, el verificador la controla y sale; si el verificador marca algo, te la muestra para que decidas. También podés pedirla para revisarla antes o escribirla vos. Si no, la descartás.',
  'sin-cuerpo': 'Notas que SÍ salen solas, pero todavía no tienen un cuerpo que pase el verificador. La IA las vuelve a intentar sola en las próximas actualizaciones (hasta tres veces); si lo logra, salen sin que hagas nada. Si querés que salga ya, escribila con la IA o a mano.',
  publicadas: 'Lo que está en la web. "En la portada" son las de las últimas 36 horas; las más viejas siguen teniendo su página en el archivo (180 días). Desde acá se corrige, se cambia de sección, se reescribe con IA, se manda a las redes o se retira.',
  fechas: 'Armar con anticipación "Un día como hoy" y los feriados. En Efemérides, cada día trae sus 20 mejores candidatas, ordenadas por un puntaje de partida: elegís una principal, marcás cuáles "Sí" van y cuáles son "Opcional", y con "No" descartás; cada una trae el enlace a su nota. Lo que elegís queda guardado y sirve para afinar el criterio. Los feriados llevan un enfoque ya armado con sus datos y sus fuentes: lo aprobás o pedís cambios. Nada sale solo ni gasta audio hasta que se arme la pieza.',
  numeros: 'Cuánta gente lee la web, qué lee, a qué hora y de dónde llega, y cómo crecen las redes. Las visitas las cuenta Cloudflare sin cookies y sin saber quién entró, y se miden a las 9 y a las 21 (el detalle se completa solo). Son aproximadas: no cuenta robots ni gente con bloqueadores. Sirve para decidir qué sección conviene reforzar y a qué hora sacar cada pieza.',
  revision: 'Lo que una IA marcó al leer las notas que ya salieron: faltas de ortografía, texto roto, una sección equivocada, un tema sensible (un menor o una víctima), una afirmación que el texto no sostiene o un título que no corresponde. Lee las notas nuevas cada hora y SÓLO AVISA: no corrige nada. Lo grave llega además por WhatsApp. Puede equivocarse: tocá el título para abrir la nota y decidí vos. Lo que marca viaja cifrado: sólo este celular lo puede abrir.',
  redes: 'Lo que sale hoy en Facebook e Instagram: el cronograma, qué salió y qué no red por red (reel, historia, Facebook, Instagram) con el motivo si algo falló y un botón para reintentarlo sin gastar voz, qué contaría cada repaso si saliera ahora, y la cola de los posteos de Facebook. Lo arma la web cada media hora; lo que ya salió se ve al momento.',
};

/** Las reglas de los posteos de Facebook (ingesta/criterio.mjs, FACEBOOK). Las
 *  de verdad llegan en celular-estado.json; éstas son por si todavía no llegó. */
export const REGLAS_FACEBOOK = { porDia: 5, minutosEntrePosteos: 90, desdeHora: 8, hastaHora: 22, edadMaximaHoras: 8 };

/** Cómo salen los posteos, en una oración: "entre las 8 y las 22, con…". */
export const comoSalenLosPosteos = (r = REGLAS_FACEBOOK) => `entre las ${r.desdeHora} y las ${r.hastaHora}, con al menos ${r.minutosEntrePosteos} minutos entre un posteo y otro, y hasta ${r.porDia} por día`;

/** La pregunta antes de mandar una nota a las redes, con las reglas de hoy. */
export const preguntaRedes = (r = REGLAS_FACEBOOK) => ({
  titulo: '¿Mandarla también a Facebook e Instagram?',
  texto: `Va a salir como posteo en Facebook (con su foto en Instagram) en la próxima vuelta de las redes: ${comoSalenLosPosteos(r)}. Una vez publicada, sólo se puede borrar a mano en Facebook e Instagram. Mientras no salga, la podés sacar de la cola.`,
  si: 'Sí, mandarla a las redes',
});

/** Las preguntas antes de cada cosa que no se puede deshacer fácil. */
export const PREGUNTAS = {
  redes: preguntaRedes(),
  sacarDeRedes: {
    titulo: '¿Sacarla de la cola de las redes?',
    texto: 'No va a salir en Facebook ni en Instagram. Si ya salió, esto no la borra de allá: eso se hace a mano.',
    si: 'Sí, sacarla',
  },
  retirar: {
    titulo: '¿Retirarla de la web?',
    texto: 'Sale de la portada y su página deja de existir en la próxima actualización. No se borra: queda en "Retiradas", al final de Publicadas, durante 30 días, y desde ahí la podés volver a publicar con la misma dirección. Si ya salió en Facebook o Instagram, allá hay que borrarla a mano.',
    si: 'Sí, retirarla',
    conMotivo: '¿Por qué se retira? (queda anotado)',
  },
  descartar: {
    titulo: '¿Descartarla?',
    texto: 'No sale en la web. Queda en "Descartadas", al final de esta lista, mientras siga en las noticias del día (unas 72 horas): si te equivocás, desde ahí la volvés a traer.',
    si: 'Sí, descartarla',
  },
  publicarCorto: {
    titulo: 'El cuerpo es corto',
    texto: 'Tiene menos de 70 palabras: una nota automática así no sale sola. Si la publicás vos, sale igual.',
    si: 'Publicarla igual',
  },
  volverAPublicar: {
    titulo: '¿Volver a publicarla?',
    texto: 'Vuelve a la web en la próxima actualización (cada media hora), con la misma dirección y el mismo texto. Queda como aprobada por vos.',
    si: 'Sí, volver a publicarla',
  },
};

/** Cuándo puede salir el próximo posteo de Facebook, dicho para una persona. */
export function proximoPosteo({
  ultimo = null, hoySalieron = 0, reglas = REGLAS_FACEBOOK, ahora = new Date(),
} = {}) {
  const manana = `mañana desde las ${reglas.desdeHora}`;
  if (hoySalieron >= reglas.porDia) return `Hoy ya salieron los ${reglas.porDia}: el próximo, ${manana}.`;
  const min = minutoEnBalcarce(ahora);
  let desde = Math.max(min, reglas.desdeHora * 60);
  const t = Date.parse(ultimo ?? '');
  if (Number.isFinite(t)) desde = Math.max(desde, min + Math.ceil((t + reglas.minutosEntrePosteos * 60000 - ahora.getTime()) / 60000));
  if (desde > reglas.hastaHora * 60) return `Por hoy no sale otro: el próximo, ${manana}.`;
  if (desde <= min) return 'Puede salir uno en la próxima vuelta de las redes, si hay una nota en la cola.';
  const hora = `${String(Math.floor(desde / 60)).padStart(2, '0')}:${String(desde % 60).padStart(2, '0')}`;
  return `El próximo puede salir desde las ${hora}, si hay una nota en la cola.`;
}

const BALCARCE = 'America/Argentina/Buenos_Aires';

/** Los minutos del día en Balcarce (0 a 1439), sin importar la hora del celular. */
export function minutoEnBalcarce(ahora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: BALCARCE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(ahora).map((x) => [x.type, x.value]));
  return Number(p.hour) * 60 + Number(p.minute);
}

/** "2026-09-29": el día de hoy en Balcarce. */
export const hoyEnBalcarce = (ahora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: BALCARCE }).format(ahora);

/** "16:45": la hora de Balcarce de una fecha. */
export const horaEnBalcarce = (iso) => (Number.isFinite(Date.parse(iso ?? ''))
  ? new Intl.DateTimeFormat('es-AR', { timeZone: BALCARCE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  : '');

/** Dónde está una pieza: 'antes' de su hora, 'en-hora' (el reloj la puede armar) o 'cerrada'. */
export function momentoDePieza(hora, ventana, ahora = new Date()) {
  const [h, m] = String(hora).split(':').map(Number);
  const desde = h * 60 + (m || 0);
  const min = minutoEnBalcarce(ahora);
  if (min < desde) return 'antes';
  return min < desde + (ventana ?? 0) ? 'en-hora' : 'cerrada';
}

/** Cómo está una pieza hoy, para mostrarla. `salio` es la hora del libro, si salió. */
export function estadoDePieza({ hora, ventana, salio }, ahora = new Date()) {
  if (salio) return { icono: '✓', texto: `salió a las ${horaEnBalcarce(salio)}`, clase: 'ok' };
  const m = momentoDePieza(hora, ventana, ahora);
  if (m === 'antes') return { icono: '⏳', texto: `a las ${hora}`, clase: 'espera' };
  if (m === 'en-hora') return { icono: '▶', texto: 'en su horario: sale en la próxima vuelta', clase: 'espera' };
  return { icono: '✕', texto: 'no salió hoy', clase: 'mal' };
}
