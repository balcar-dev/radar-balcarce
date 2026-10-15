// Manda la muestra a un modelo de OpenRouter y guarda lo que contesta. No toca nada de producción.
//   node pruebas-modelos/probar.mjs --modelo=google/gemma-4-31b-it:free
//   opciones: --por-minuto=15  --solo=5 (sólo las primeras 5 notas, para probar)  --sin-pares
//
// La clave se lee de la variable de entorno OPENROUTER_API_KEY. Nunca se imprime ni se guarda.
// Los modelos "inception/mercury-decide" y "typesafe/jev-*" no son de chat: usan POST /api/alpha/decisions (preguntas tipadas).

import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const BASE = 'https://openrouter.ai/api';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v = 'true'] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const MODELO = args.modelo;
const ARCHIVO_MUESTRA = args.muestra ?? 'muestra.json'; // por ejemplo --muestra=muestra-200.json
const POR_MINUTO = Number(args['por-minuto'] ?? 15);
const SOLO = args.solo ? Number(args.solo) : Infinity;
const CON_PARES = args['sin-pares'] !== 'true';
// --lote=12: con los modelos de decisiones, 12 notas en un solo pedido (una pregunta por nota). El texto fijo se paga una vez cada 12.
const LOTE = Number(args.lote ?? 1);
// --pares=pares-200.json --solo-pares: sólo prueba si dos notas cuentan el mismo hecho (con --lote=12, 12 pares por pedido).
const PARES_ARCHIVO = args.pares;
const SOLO_PARES = args['solo-pares'] === 'true';

const CLAVE = process.env.OPENROUTER_API_KEY;
if (!CLAVE) { console.error('Falta la variable de entorno OPENROUTER_API_KEY. Frené.'); process.exit(1); }
if (!MODELO) { console.error('Falta --modelo=... (por ejemplo --modelo=inception/mercury-decide:free)'); process.exit(1); }

// ---------------------------------------------------------------- lo que se le pregunta

const SECCIONES = ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo',
  'Economía', 'Agro', 'Tecnología', 'Cultura y agenda', 'Argentina'];
const INTERES = ['alto', 'medio', 'bajo', 'ninguno'];

const DESCRIPCION_SECCION = {
  Balcarce: 'Lo que pasa en la ciudad y no tiene una sección más precisa (vecinos, instituciones, obras, escuelas, salud local) y lo práctico para el vecino: cortes, trámites, horarios, tarifas.',
  Política: 'El Concejo, el intendente, el gobierno provincial y nacional, leyes, elecciones.',
  Policiales: 'Delitos, accidentes, incendios, bomberos, policía.',
  Fútbol: 'El fútbol, de la liga de Balcarce a la Selección y los clubes argentinos.',
  Deportes: 'Todos los demás deportes (básquet, hockey, rugby, tenis, boxeo, paleta, vóley…), salvo el automovilismo.',
  Automovilismo: 'Autos de carrera (TC, Turismo Nacional, Fórmula 1, MotoGP, karting, rally), el autódromo Fangio y Fangio. Nunca Deportes.',
  Economía: 'Precios, inflación, dólar, empleo, empresas, combustibles.',
  Agro: 'Campo, papa, ganadería, INTA, clima para el productor.',
  Tecnología: 'Tecnología, ciencia, inteligencia artificial.',
  'Cultura y agenda': 'Espectáculos, música, teatro, cine, libros, muestras, actividades.',
  Argentina: 'Lo nacional que no entra en ninguna de las anteriores (sociedad, clima, salud, educación, grandes hechos).',
};

const perfil = fs.readFileSync(path.join(AQUI, '../ingesta/perfil-balcarce.md'), 'utf8');

// Basada en INSTRUCCION de ingesta/lectura-ia.mjs, más corta y con la salida pedida en esta prueba.
const INSTRUCCION = `Sos el editor de selección de Radar Balcarce, un medio digital de Balcarce, provincia de Buenos Aires.
Decidí qué valor tiene la nota para una persona que vive en Balcarce.

Reglas:
- Juzgá por lo que cuenta la nota, no por palabras sueltas: que aparezca "Fangio" o "Balcarce" no define nada.
- El ámbito es el del HECHO, no el del medio que lo publica (cada nota dice de qué ciudad es el medio).
- Que la nota mencione Balcarce en una lista de localidades no la hace de Balcarce.
- Si no es de Balcarce, interés alto/medio sólo con una razón concreta (cambia algo práctico acá, toca la zona, el campo, la papa, el automovilismo, una figura argentina destacada). Sin razón concreta, interés "ninguno". No inventes vínculos.
- NO se publica: publicidad, chimentos y farándula, horóscopo y consejos genéricos, loterías, lo del extranjero sin conexión argentina, policiales que no son de Balcarce o la zona, y lo que no tiene relación con Balcarce.
- "seccion", una de estas:
${SECCIONES.map((s) => `  · ${s}: ${DESCRIPCION_SECCION[s]}`).join('\n')}

Devolvé SOLO un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"seccion": "<una de las 11>", "interes_balcarce": "alto|medio|bajo|ninguno", "publicar": "si|no", "razon": "<una línea>"}`;

const INSTRUCCION_PAR = `Son dos notas de un medio de Balcarce, publicadas con poco tiempo de diferencia.
Decidí si cuentan EXACTAMENTE el mismo hecho: el mismo suceso o la misma noticia, aunque estén escritas con otras palabras o con distinto detalle.
NO es el mismo hecho si son dos noticias distintas sobre el mismo tema (la pole y la carrera, una práctica y otra), si es un anuncio y su resultado, o si cambia la persona, el lugar, la fecha o la cifra principal.
Ante la duda, mismo = false.
Devolvé SOLO un objeto JSON: {"mismo": true|false, "razon": "<una línea>"}`;

/** Lo que se le manda de cada nota: poco, como en producción (título + resumen de hasta 500 caracteres). */
function textoDeNota(n) {
  const resumen = `${n.resumen ?? ''} ${n.cuerpo ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 500);
  return JSON.stringify({ titulo: n.titulo, resumen, medio: n.medio, ciudad_del_medio: n.ciudad_del_medio });
}
function textoDePar(a, b) {
  const t = (n) => ({ titulo: n.titulo, texto: `${n.resumen} ${n.cuerpo}`.replace(/\s+/g, ' ').trim().slice(0, 280) });
  return JSON.stringify({ a: t(a), b: t(b) });
}

// ---------------------------------------------------------------- hablar con OpenRouter

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const cabeceras = { 'content-type': 'application/json', authorization: `Bearer ${CLAVE}`, 'x-title': 'Radar Balcarce - pruebas de modelos' };

/** POST con un reintento ante 429. Devuelve { status, json, ms }. */
async function pedir(url, cuerpo) {
  let ultimo;
  for (let intento = 0; intento < 2; intento += 1) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(90_000) });
      const texto = await res.text();
      let json = null;
      try { json = JSON.parse(texto); } catch { /* no era JSON */ }
      ultimo = { status: res.status, json, texto: texto.slice(0, 300), ms: Date.now() - t0 };
      if (res.status === 429 && intento === 0) {
        const seg = Number(res.headers.get('retry-after')) || 20;
        console.log(`  429: espero ${seg}s y reintento una vez`);
        await espera(seg * 1000);
        continue;
      }
      return ultimo;
    } catch (e) {
      return { status: 0, json: null, texto: String(e.message).slice(0, 200), ms: Date.now() - t0 };
    }
  }
  return ultimo;
}

/** Saca el primer objeto JSON de un texto (los modelos a veces agregan palabras o ```). */
function extraerJson(texto = '') {
  const limpio = String(texto).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```(?:json)?/g, '');
  const ini = limpio.indexOf('{');
  if (ini < 0) return null;
  let prof = 0;
  for (let i = ini; i < limpio.length; i += 1) {
    if (limpio[i] === '{') prof += 1;
    if (limpio[i] === '}') { prof -= 1; if (prof === 0) { try { return JSON.parse(limpio.slice(ini, i + 1)); } catch { return null; } } }
  }
  return null;
}

const sinTilde = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Modelos "de decisiones" (no de chat): OpenRouter los lista aparte (output_modalities=decisions).
let listaDecisiones = [];
try { listaDecisiones = (await (await fetch(`${BASE}/v1/models?output_modalities=decisions`)).json()).data ?? []; } catch { /* sin red: se adivina por el nombre */ }
const esDecisiones = listaDecisiones.some((m) => m.id === MODELO) || /^(inception\/mercury-decide|typesafe\/jev|microsoft\/microsoft-decision)/.test(MODELO);

/** Normaliza lo que contestó el modelo a { seccion, interes, publicar, razon } o null. */
function normalizar(o) {
  if (!o || typeof o !== 'object') return null;
  const seccion = SECCIONES.find((s) => sinTilde(s) === sinTilde(o.seccion ?? ''));
  const interes = INTERES.find((i) => i === sinTilde(o.interes_balcarce ?? o.interes ?? ''));
  const p = sinTilde(o.publicar ?? '');
  const publicar = ['si', 'true', 'yes'].includes(p) ? true : ['no', 'false'].includes(p) ? false : null;
  return { seccion: seccion ?? null, interes: interes ?? null, publicar, razon: String(o.razon ?? '').slice(0, 300), valida: !!(seccion && interes && publicar !== null) };
}

async function clasificarConChat(nota) {
  const r = await pedir(`${BASE}/v1/chat/completions`, {
    model: MODELO,
    messages: [
      { role: 'system', content: `${INSTRUCCION}\n\n--- PERFIL DE BALCARCE ---\n${perfil}` },
      { role: 'user', content: `Nota a evaluar:\n${textoDeNota(nota)}` },
    ],
    temperature: 0,
    max_tokens: 2500,
  });
  const contenido = r.json?.choices?.[0]?.message?.content ?? '';
  return {
    status: r.status, ms: r.ms, error: r.status === 200 ? null : (r.json?.error?.message ?? r.texto),
    crudo: contenido.slice(0, 1200), respuesta: normalizar(extraerJson(contenido)),
    uso: r.json?.usage ? { entrada: r.json.usage.prompt_tokens, salida: r.json.usage.completion_tokens, costo: r.json.usage.cost ?? null } : null,
  };
}

// Mercury Decide: preguntas tipadas. "choice" elige una clave de criteria; "noul" da un número (se mira
// el signo / el 0,5 al comparar: se guarda crudo).
async function clasificarConDecisiones(nota) {
  const r = await pedir(`${BASE}/alpha/decisions`, {
    model: MODELO,
    state: { instrucciones_del_medio: INSTRUCCION.split('Devolvé SOLO')[0], perfil_de_balcarce: perfil, nota: JSON.parse(textoDeNota(nota)) },
    questions: {
      seccion: {
        type: 'choice',
        instructions: '¿De qué sección es la nota?',
        criteria: DESCRIPCION_SECCION,
      },
      interes_balcarce: {
        type: 'choice',
        instructions: '¿Cuánto le interesa la nota a una persona que vive en Balcarce?',
        criteria: {
          alto: 'Pasa en Balcarce o cambia algo concreto acá.',
          medio: 'Toca la zona o una actividad de la ciudad (campo, papa, automovilismo, una figura argentina).',
          bajo: 'Nacional o general con algún vínculo débil.',
          ninguno: 'Sin razón concreta para un vecino de Balcarce.',
        },
      },
      publicar: {
        type: 'noul',
        instructions: '¿Radar Balcarce debe publicar esta nota? No se publica: publicidad, chimentos, horóscopo, loterías, lo del extranjero sin conexión argentina, policiales de afuera, ni lo que no tiene relación con Balcarce.',
        criteria: { false: 'No debe publicarse.', true: 'Debe publicarse.' },
      },
    },
  });
  const a = r.json?.answers ?? {};
  const noul = a.publicar?.noul;
  return {
    status: r.status, ms: r.ms, error: r.status === 200 ? null : (r.json?.error?.message ?? r.texto),
    crudo: JSON.stringify(a).slice(0, 1500), // guarda todo lo que devuelve (por si trae probabilidades)
    respuesta: r.status === 200 ? normalizar({
      seccion: a.seccion?.choice, interes_balcarce: a.interes_balcarce?.choice,
      publicar: typeof noul === 'number' ? (noul > 0.5 ? 'si' : 'no') : null, razon: '(Mercury Decide no da razón)',
    }) : null,
    noul: typeof noul === 'number' ? noul : null,
    uso: usoDeDecisiones(r.json?.usage),
  };
}

// Varias notas en un pedido: las preguntas se llaman n1_seccion, n1_interes, n1_publicar, n2_seccion… y cada nota lleva su número.
async function clasificarLoteConDecisiones(grupo) {
  const questions = {};
  grupo.forEach((_, i) => {
    const k = `n${i + 1}`;
    questions[`${k}_seccion`] = { type: 'choice', instructions: `¿De qué sección es la nota ${i + 1}?`, criteria: DESCRIPCION_SECCION };
    questions[`${k}_interes`] = {
      type: 'choice', instructions: `¿Cuánto le interesa la nota ${i + 1} a una persona que vive en Balcarce?`,
      criteria: { alto: 'Pasa en Balcarce o cambia algo concreto acá.', medio: 'Toca la zona o una actividad de la ciudad (campo, papa, automovilismo, una figura argentina).', bajo: 'Nacional o general con algún vínculo débil.', ninguno: 'Sin razón concreta para un vecino de Balcarce.' },
    };
    questions[`${k}_publicar`] = {
      type: 'noul', criteria: { false: 'No debe publicarse.', true: 'Debe publicarse.' },
      instructions: `¿Radar Balcarce debe publicar la nota ${i + 1}? No se publica: publicidad, chimentos, horóscopo, loterías, lo del extranjero sin conexión argentina, policiales de afuera, ni lo que no tiene relación con Balcarce.`,
    };
  });
  const r = await pedir(`${BASE}/alpha/decisions`, {
    model: MODELO,
    state: { instrucciones_del_medio: INSTRUCCION.split('Devolvé SOLO')[0], perfil_de_balcarce: perfil, notas: grupo.map((n, i) => ({ numero: i + 1, ...JSON.parse(textoDeNota(n)) })) },
    questions,
  });
  const a = r.json?.answers ?? {};
  const uso = usoDeDecisiones(r.json?.usage);
  return grupo.map((nota, i) => {
    const k = `n${i + 1}`;
    const noul = a[`${k}_publicar`]?.noul;
    const ok = r.status === 200 && a[`${k}_seccion`] && typeof noul === 'number';
    return {
      status: r.status, ms: Math.round(r.ms / grupo.length), error: r.status === 200 ? (ok ? null : 'respuesta incompleta') : (r.json?.error?.message ?? r.texto),
      crudo: JSON.stringify({ seccion: a[`${k}_seccion`], interes_balcarce: a[`${k}_interes`], publicar: a[`${k}_publicar`] }).slice(0, 1500),
      respuesta: ok ? normalizar({ seccion: a[`${k}_seccion`].choice, interes_balcarce: a[`${k}_interes`]?.choice, publicar: noul > 0.5 ? 'si' : 'no', razon: '(Mercury Decide no da razón)' }) : null,
      noul: typeof noul === 'number' ? noul : null,
      // El uso del pedido se reparte entre las notas del lote.
      uso: uso ? { entrada: uso.entrada / grupo.length, salida: (uso.salida ?? 0) / grupo.length, costo: uso.costo == null ? null : uso.costo / grupo.length } : null,
    };
  });
}

// Varios pares en un pedido: una pregunta de sí/no por par (p1, p2…).
async function compararParesLoteConDecisiones(grupo) {
  const questions = {};
  grupo.forEach((_, i) => {
    questions[`p${i + 1}`] = {
      type: 'noul', criteria: { false: 'Hechos distintos.', true: 'El mismo hecho.' },
      instructions: `${INSTRUCCION_PAR.split('Devolvé SOLO')[0]}¿Las dos notas del par ${i + 1} cuentan exactamente el mismo hecho?`,
    };
  });
  const r = await pedir(`${BASE}/alpha/decisions`, {
    model: MODELO,
    state: { pares: grupo.map((p, i) => ({ numero: i + 1, ...JSON.parse(textoDePar(porId.get(p.a), porId.get(p.b))) })) },
    questions,
  });
  const a = r.json?.answers ?? {};
  const uso = usoDeDecisiones(r.json?.usage);
  return grupo.map((_, i) => {
    const noul = a[`p${i + 1}`]?.noul;
    return {
      status: r.status, ms: Math.round(r.ms / grupo.length), error: r.status === 200 ? (typeof noul === 'number' ? null : 'respuesta incompleta') : (r.json?.error?.message ?? r.texto),
      crudo: JSON.stringify(a[`p${i + 1}`] ?? {}).slice(0, 300), mismo: typeof noul === 'number' ? noul > 0.5 : null, noul: typeof noul === 'number' ? noul : null,
      uso: uso ? { entrada: uso.entrada / grupo.length, salida: (uso.salida ?? 0) / grupo.length, costo: uso.costo == null ? null : uso.costo / grupo.length } : null,
    };
  });
}

// La documentación dice inputTokens/outputTokens, pero la API real manda input_tokens/output_tokens.
function usoDeDecisiones(u) {
  if (!u) return null;
  return { entrada: u.input_tokens ?? u.inputTokens, salida: u.output_tokens ?? u.outputTokens, costo: u.cost ?? null };
}

async function compararPar(a, b) {
  if (esDecisiones) {
    const r = await pedir(`${BASE}/alpha/decisions`, {
      model: MODELO,
      state: { notas: JSON.parse(textoDePar(a, b)) },
      questions: { mismo: { type: 'noul', instructions: INSTRUCCION_PAR.split('Devolvé SOLO')[0] + '¿Cuentan exactamente el mismo hecho?', criteria: { false: 'Hechos distintos.', true: 'El mismo hecho.' } } },
    });
    const noul = r.json?.answers?.mismo?.noul;
    return {
      status: r.status, ms: r.ms, error: r.status === 200 ? null : (r.json?.error?.message ?? r.texto), crudo: JSON.stringify(r.json?.answers ?? {}).slice(0, 300),
      mismo: typeof noul === 'number' ? noul > 0.5 : null, noul: typeof noul === 'number' ? noul : null,
      uso: usoDeDecisiones(r.json?.usage),
    };
  }
  const r = await pedir(`${BASE}/v1/chat/completions`, {
    model: MODELO,
    messages: [{ role: 'system', content: INSTRUCCION_PAR }, { role: 'user', content: textoDePar(a, b) }],
    temperature: 0,
    max_tokens: 2500,
  });
  const contenido = r.json?.choices?.[0]?.message?.content ?? '';
  const o = extraerJson(contenido);
  return {
    status: r.status, ms: r.ms, error: r.status === 200 ? null : (r.json?.error?.message ?? r.texto), crudo: contenido.slice(0, 600),
    mismo: typeof o?.mismo === 'boolean' ? o.mismo : null, razon: String(o?.razon ?? '').slice(0, 300),
    uso: r.json?.usage ? { entrada: r.json.usage.prompt_tokens, salida: r.json.usage.completion_tokens, costo: r.json.usage.cost ?? null } : null,
  };
}

// ---------------------------------------------------------------- correr la muestra

const muestra = JSON.parse(fs.readFileSync(path.join(AQUI, ARCHIVO_MUESTRA), 'utf8'));
const porId = new Map([...muestra.notas, ...(muestra.notasSoloParaPares ?? [])].map((n) => [n.id, n]));
const notas = SOLO_PARES ? [] : muestra.notas.slice(0, SOLO);
// Los pares vienen de un archivo aparte (--pares=...) o, en la muestra chica, de muestra.json.
const paresDeLaMuestra = PARES_ARCHIVO ? JSON.parse(fs.readFileSync(path.join(AQUI, PARES_ARCHIVO), 'utf8')).pares : (muestra.pares ?? []);
const pares = CON_PARES ? paresDeLaMuestra.slice(0, Number.isFinite(SOLO) ? Math.min(SOLO, paresDeLaMuestra.length) : undefined) : [];

// Precios de lista (para estimar el costo cuando el modelo no informa el costo real).
let precios = null;
try {
  const lista = await (await fetch(`${BASE}/v1/models`)).json();
  const m = [...lista.data, ...listaDecisiones].find((x) => x.id === MODELO);
  if (m) precios = { entrada: Number(m.pricing.prompt), salida: Number(m.pricing.completion) };
} catch { /* sin precios: el costo sale del uso real si lo informa */ }

const intervalo = Math.ceil(60000 / POR_MINUTO);
console.log(`Modelo: ${MODELO} (${esDecisiones ? 'API de decisiones' : 'chat'}) · ${notas.length} notas + ${pares.length} pares · ${POR_MINUTO} pedidos por minuto`);

// caracteresFijos: lo que se repite en cada pedido (instrucción + perfil); sirve para estimar el costo de mandar 12 notas juntas.
const resultados = {
  modelo: MODELO, lote: esDecisiones ? LOTE : 1, soloPares: SOLO_PARES, paresArchivo: PARES_ARCHIVO ?? null, muestra: ARCHIVO_MUESTRA, modo: esDecisiones ? 'decisiones' : 'chat', fecha: new Date().toISOString(), precios,
  caracteresFijos: INSTRUCCION.length + perfil.length, notas: {}, pares: {},
};
// Con la muestra chica el nombre es resultados-<modelo>.json; con otra, se le suma cuál fue.
const sufijo = (ARCHIVO_MUESTRA === 'muestra.json' ? '' : `--${ARCHIVO_MUESTRA.replace(/^muestra-?|\.json$/g, '')}`) + (SOLO_PARES ? '-pares' : '') + (LOTE > 1 && esDecisiones ? `-lote${LOTE}` : '');
const destino = path.join(AQUI, `resultados-${MODELO.replace(/[/:\\]/g, '_')}${sufijo}.json`);
const guardar = () => fs.writeFileSync(destino, `${JSON.stringify(resultados, null, 1)}\n`);

let ultimoPedido = 0;
async function conRitmo(fn) {
  const falta = ultimoPedido + intervalo - Date.now();
  if (falta > 0) await espera(falta);
  ultimoPedido = Date.now();
  return fn();
}

let n = 0;
const imprimir = (nota, r) => {
  const x = r.respuesta;
  console.log(`[${n}/${notas.length}] ${nota.id} ${r.error ? `ERROR ${r.status}: ${String(r.error).slice(0, 80)}` : x ? `${x.seccion ?? '?'} · ${x.interes ?? '?'} · publicar=${x.publicar === null ? '?' : x.publicar ? 'sí' : 'no'}${x.valida ? '' : ' (incompleta)'}` : 'respuesta ilegible'} · ${r.ms} ms`);
};
if (LOTE > 1 && esDecisiones) {
  for (let i = 0; i < notas.length; i += LOTE) {
    const grupo = notas.slice(i, i + LOTE);
    const rs = await conRitmo(() => clasificarLoteConDecisiones(grupo));
    grupo.forEach((nota, j) => { n += 1; resultados.notas[nota.id] = { ...rs[j], caracteresDeNota: textoDeNota(nota).length }; imprimir(nota, rs[j]); });
    guardar();
  }
} else {
  for (const nota of notas) {
    n += 1;
    const r = await conRitmo(() => (esDecisiones ? clasificarConDecisiones(nota) : clasificarConChat(nota)));
    resultados.notas[nota.id] = { ...r, caracteresDeNota: textoDeNota(nota).length };
    imprimir(nota, r);
    guardar();
  }
}
const imprimirPar = (p, r) => console.log(`[par ${p.clave}] ${r.error ? `ERROR ${r.status}: ${String(r.error).slice(0, 80)}` : `mismo=${r.mismo}`} · ${r.ms} ms`);
if (LOTE > 1 && esDecisiones) {
  for (let i = 0; i < pares.length; i += LOTE) {
    const grupo = pares.slice(i, i + LOTE);
    const rs = await conRitmo(() => compararParesLoteConDecisiones(grupo));
    grupo.forEach((p, j) => { resultados.pares[p.clave] = rs[j]; imprimirPar(p, rs[j]); });
    guardar();
  }
} else {
  for (const p of pares) {
    const r = await conRitmo(() => compararPar(porId.get(p.a), porId.get(p.b)));
    resultados.pares[p.clave] = r;
    imprimirPar(p, r);
    guardar();
  }
}
const fallos = Object.values(resultados.notas).filter((r) => r.error || !r.respuesta?.valida).length;
console.log(`Listo. ${notas.length - fallos} notas bien contestadas, ${fallos} con problemas. Guardado en ${path.relative(process.cwd(), destino)}`);
