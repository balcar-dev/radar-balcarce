// El arreglo de las fotos mal puestas que encontró la auditoría del 16/10/2026 (docs/auditoria-2-0/03-FOTOS.md), reglas 203 a 206.
//
// Lo corre UNA persona en la PC, entre dos corridas de "Actualizar la web" (que corre a los :00 y :30 y tarda ~8 minutos: por ejemplo a los
// :12 o a los :42), con el repositorio al día:
//
//     git pull --rebase
//     node web/scripts/arreglar-fotos-17-10.mjs              mira y cuenta, NO cambia nada
//     node web/scripts/arreglar-fotos-17-10.mjs --aplicar    cambia los datos y las fotos
//     git add web/data/banco-fotos.json web/data/fotos-ia.json web/public/fotos-notas
//     git commit -m "Fotos: el arreglo de la auditoría del 16/10" -- web/data/banco-fotos.json web/data/fotos-ia.json web/public/fotos-notas
//     git push
//
// `--sin-red` no baja nada (no restaura las fotos podadas de más). Se puede correr dos veces: lo que ya está hecho no se vuelve a hacer.
//
// Qué hace, en este orden:
//   1. SACA las fotos que no tenían que salir (`DESCARTES`, cada una con su motivo; y todas las de Wikimedia de hace años o que no son de
//      la persona de la nota, `WIKIMEDIA_VIEJAS_O_EQUIVOCADAS`): la entrada del banco queda sin `archivo` y con `descartada` (motivo, cuándo,
//      quién, la huella y la dirección original), el archivo se borra. Así la nota no se vuelve a probar (sePuedeReintentar) y esa misma
//      foto no puede volver en ninguna otra nota (fotoRepetidaEnElBanco). La nota queda con su ilustración, si tiene, o con la placa.
//   2. Le pone la HUELLA (web/scripts/achicar-foto.mjs, huellaDeFoto) a cada foto del banco que no la tiene, para el control de repetidas.
//   3. SACA las REPETIDAS: la misma foto (misma huella o misma dirección) en dos notas de temas distintos; queda la de la nota más vieja.
//      No cuentan las fotos libres de F1 y fútbol (`origen: 'libre'`) ni las que sumó una persona.
//   4. RESTAURA las fotos de notas vivas que la poda borró de más (`borrada` sin `retirada`): las vuelve a bajar de su dirección original,
//      las achica y las guarda con un nombre nuevo, si no quedan repetidas. Menos las de `NO_RESTAURAR` (con su motivo).
//   5. Las ILUSTRACIONES hechas a mano con Gemini web que rompen las reglas (`ILUSTRACIONES_A_SACAR`: texto legible, marcas, gente) salen de
//      web/data/fotos-ia.json y se borra su archivo; la que estaba bien (`ILUSTRACIONES_REVISADAS`) queda con su control anotado. Para que
//      las notas sacadas tengan otra ilustración, correr después a mano «Ilustrar notas sin foto» con esos ids (las del día las hace sola).
//
// Las nueve imágenes rotas del archivo (.png de antes del 29/09) no necesitan nada acá: las arregla el código en la próxima corrida
// (fotoDelArchivoAlDia, regla 203). Este script dice cuántas hay.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerJson } from '../../ingesta/json.mjs';
import { descargarImagen, creditoDeFoto, sinConsulta } from '../../ingesta/fotos.mjs';
import { huellaDeFoto, fotoParaGuardar, nombreDeFotoNueva, mismaFoto } from './achicar-foto.mjs';
import { mismoTema, fotoRepetidaEnElBanco, fotoDelArchivoAlDia } from './fotos-notas.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
export const RUTAS = {
  banco: path.join(RAIZ, 'data', 'banco-fotos.json'),
  ilustraciones: path.join(RAIZ, 'data', 'fotos-ia.json'),
  manuales: path.join(RAIZ, 'data', 'fotos-manuales.json'),
  archivo: path.join(RAIZ, 'data', 'archivo.json'),
  portada: path.join(RAIZ, 'data', 'portada.json'),
  carpeta: path.join(RAIZ, 'public', 'fotos-notas'),
};

export const POR = 'auditoría de fotos del 16/10/2026 (Claude), con web/scripts/arreglar-fotos-17-10.mjs';

/** Las fotos que la auditoría vio mal, a mano (docs/auditoria-2-0/03-FOTOS.md, § 3.5). */
export const DESCARTES = {
  '1vhit3n': 'captura de pantalla con el cartel "Activar Windows" encima (Radio Gabal, el matadero municipal)',
  '66so6t': 'no es una foto: es el flyer de la rifa, todo texto, funciona como publicidad (Puntonueve, Merendero Doña Norma)',
  '130eay0': 'foto de banco de imágenes (stock) acreditada a Diario La Vanguardia, que no es de ellos',
  '1ge6irq': 'montaje de tres caras, dos se ven muy jóvenes: edad dudosa (Acción 5, pádel); ante la duda, es menor',
  '11lwkfl': 'plantel de rugby del "Torneo Desarrollo", alguno de edad dudosa; ante la duda, es menor',
  '1mfnr70': 'plantel de rugby del "Torneo Desarrollo", alguno de edad dudosa; ante la duda, es menor',
  '1fi9fiz': 'plantel de rugby del "Torneo Desarrollo", alguno de edad dudosa; ante la duda, es menor',
};

/**
 * Las fotos de Wikimedia que no pasan la regla 205 (la foto no es de hace años para un hecho de hoy, y es de la persona de la nota). El año
 * es el de la toma según Commons (DateTimeOriginal), consultado el 17/10/2026. Por el nombre del archivo en Commons.
 */
export const WIKIMEDIA_VIEJAS_O_EQUIVOCADAS = {
  'Suisse_vs_Argentine_-_Granit_Xhaka_&_Lionel_Messi.jpg': 'Messi y Xhaka en 2012: la misma foto en siete notas, una de ellas sobre el show de un grupo musical',
  'F1_-_Red_Bull_Racing_-_Max_Verstappen_(27965385544).jpg': 'un Fórmula 1 Red Bull de 2016 para un choque de GT de 2026: se puede creer que es el auto del choque',
  'Monte_las_Mercedes-Llano_el_Loro.jpg': 'un paisaje (2009) para una nota sobre una diputada: no corresponde',
  'Román_González_e_Damir_Tvrdić_(Crabs_Rimini).JPG': 'otro Román González (un basquetbolista, 2004): no es la persona de la nota',
  'Julián_Álvarez.jpg': 'otro Julián Álvarez (una foto de 1971): no es el futbolista de la nota',
  'Águila,_escultura_de_Virginia_Aparicio.jpg': 'una escultura, no la persona de la nota',
  'Mario-pergolini.JPG': 'foto de 2006 para un hecho de 2026',
  'Guillermo_Montenegro_habló_con_los_medios_luego_de_la_reunión_de_gabinete_(6842145821).jpg': 'foto de 2012 para un hecho de 2026',
  'Nicolás_Otamendi_2015.jpg': 'foto de 2015 para un hecho de 2026',
  'Alfonso_Prat_Gay_y_Luis_Caputo.jpg': 'foto de 2013 (con Prat Gay) para un hecho de 2026',
  'Ramón_Díaz_(26015866885)_(2).jpg': 'foto de 2016 para un hecho de 2026',
  'Mariano_Werner_2015.JPG': 'foto de 2015 para un hecho de 2026',
  'Mariano_Werner_2011.jpg': 'foto de 2010 para un hecho de 2026',
  'Robbie_Williams,_Roundhouse,_London_(Apple_Music_Festival)_(29312824603).jpg': 'foto de 2016 para un hecho de 2026',
  'Axel-Kicillof_5.jpg': 'foto de 2015 para un hecho de 2026',
  'Lautaro_Martínez_2017_(cropped).jpg': 'foto de 2017 para un hecho de 2026',
  'Chelsea_4_Ajax_4_(49022677533)_(cropped,_Kurt_Zouma_and_Nicolás_Tagliafico).jpg': 'foto de 2019 para un hecho de 2026',
};

/** Las notas vivas que la poda dejó sin foto y NO se restauran, con el motivo. */
export const NO_RESTAURAR = {
  '1ixp88o': 'nota sobre el caso de Virginia Aparicio (una posible víctima): sin foto real por las dudas',
  '18jx7kk': 'nota sobre el testimonio de Virginia Aparicio (una posible víctima): sin foto real por las dudas',
};

/** Las ilustraciones de Gemini web que rompen las reglas (auditoría, § 3.5): texto legible, marcas, gente de fondo. */
export const ILUSTRACIONES_A_SACAR = {
  lf9d6b: 'texto legible ("SÁBADO JORNADA DE LIGA ESC. MUNICIPAL", horarios y nombres escritos a mano), la marca Spalding y jugadores de fondo',
  u0hcbv: 'texto legible ("PLANILLA DE COMPETENCIA - JUEGOS BONAERENSES")',
  '1ixp88o': 'texto legible ("ENTREVISTA 10 AM - CASO PLAGUICIDAS") y la marca Sennheiser',
  aa7nni: 'texto legible ("REPROGRAMADO 15 DE NOVIEMBRE… CARAVANA DE LA ALEGRÍA")',
  '1eb747m': 'texto legible ("ESTUDIANTINA \'26") y una pista llena de chicos desenfocados',
  q9ik7h: 'botines con las tres tiras de Adidas: una marca (ilustración automática que el control no vio)',
};
/** La de Gemini web que estaba bien: queda, con el control anotado (así no se vuelve a mirar). */
export const ILUSTRACIONES_REVISADAS = {
  '1jdsdep': 'revisada a ojo en la auditoría del 16/10/2026: sin texto, sin marcas, sin gente',
};

const nombre = (archivo) => String(archivo ?? '').split('/').pop();
const archivoDeCommons = (enlace) => {
  try { return decodeURIComponent(String(enlace ?? '').split('/wiki/File:')[1] ?? '').replace(/ /g, '_'); } catch { return ''; }
};

/** Saca la foto de una entrada del banco: sin archivo ni crédito, con `descartada`. Devuelve la entrada nueva. */
export function descartar(e, motivo, { ahora = new Date(), huella = null } = {}) {
  const { archivo, credito, ausenteDesde, ...resto } = e;
  return {
    ...resto, intentado: true,
    descartada: {
      motivo, cuando: ahora.toISOString(), por: POR, archivo: archivo ?? null, origen: e.origen ?? null,
      imagenOriginal: e.imagenOriginal ?? null, ...(huella ?? e.huella ? { huella: huella ?? e.huella } : {}),
    },
  };
}

/**
 * Todo el arreglo, sobre los datos en memoria. No toca el disco salvo por `leerFoto` / `bajar` (inyectables). Devuelve el banco y el libro
 * de ilustraciones nuevos, los archivos a borrar y a escribir, y el informe.
 */
export async function arreglar({
  banco = {}, ilustraciones = {}, manuales = {}, notasVivas = [], ahora = new Date(),
  leerFoto = () => null, huellaDe = huellaDeFoto, bajar = null, achicar = undefined, enDisco = new Set(),
} = {}) {
  const b = structuredClone(banco);
  const il = structuredClone(ilustraciones);
  const vivas = new Map(notasVivas.map((n) => [n.id, n]));
  const borrar = new Set();
  const escribir = {};
  const informe = { descartadas: [], huellas: 0, repetidas: [], restauradas: [], noRestauradas: [], ilustracionesSacadas: [], ilustracionesRevisadas: [] };
  const usadoPorOtra = (archivo, salvo) => Object.entries(b).some(([id, e]) => id !== salvo && e?.archivo === archivo)
    || Object.values(manuales).some((m) => m?.archivo === archivo);
  const sacar = (id, motivo) => {
    const e = b[id];
    if (!e?.archivo) return false;
    const archivo = e.archivo;
    b[id] = descartar(e, motivo, { ahora });
    informe.descartadas.push({ id, titulo: e.titulo ?? null, motivo, viva: vivas.has(id) });
    // La misma foto copiada a otra nota (al unir dos notas, la que queda se lleva la foto): también sale.
    for (const [otro, x] of Object.entries(b)) if (otro !== id && x?.archivo === archivo) { b[otro] = descartar(x, motivo, { ahora }); informe.descartadas.push({ id: otro, titulo: x.titulo ?? null, motivo, viva: vivas.has(otro) }); }
    if (!Object.values(manuales).some((m) => m?.archivo === archivo)) borrar.add(nombre(archivo));
    return true;
  };

  // 1. Las que la auditoría vio mal, y Wikimedia.
  for (const [id, motivo] of Object.entries(DESCARTES)) sacar(id, motivo);
  for (const [id, e] of Object.entries(b)) {
    if (e?.origen !== 'wikimedia') continue;
    const motivo = WIKIMEDIA_VIEJAS_O_EQUIVOCADAS[archivoDeCommons(e.enlace)];
    if (!motivo) continue;
    if (e.archivo) sacar(id, `foto de Wikimedia que no pasa la regla 205: ${motivo}`);
    // La que ya no tenía archivo también queda vetada, así esa foto no vuelve en ninguna nota.
    else if (!e.descartada) b[id] = descartar(e, `foto de Wikimedia que no pasa la regla 205: ${motivo}`, { ahora });
  }

  // 2. La huella de cada foto del banco que no la tiene.
  for (const [id, e] of Object.entries(b)) {
    if (!e?.archivo || e.huella) continue;
    const bytes = leerFoto(nombre(e.archivo));
    if (!bytes) continue;
    const huella = await huellaDe(bytes);
    if (huella) { b[id] = { ...e, huella }; informe.huellas += 1; }
  }
  // Y la de las descartadas recién, desde lo que estaba en el disco (antes de borrarlo): para que no vuelvan.
  for (const [id, e] of Object.entries(b)) {
    if (!e?.descartada || e.descartada.huella || !e.descartada.archivo) continue;
    const bytes = leerFoto(nombre(e.descartada.archivo));
    const huella = bytes ? await huellaDe(bytes) : null;
    if (huella) b[id] = { ...e, descartada: { ...e.descartada, huella } };
  }

  // 3. Las repetidas de temas distintos: queda la de la nota más vieja.
  const conFoto = Object.entries(b).filter(([id, e]) => e?.archivo && e.origen !== 'libre' && !manuales[id])
    .sort((x, y) => Date.parse(x[1].cuando ?? 0) - Date.parse(y[1].cuando ?? 0));
  const quedan = [];
  for (const [id, e] of conFoto) {
    const igual = quedan.find(([, k]) => k.archivo !== e.archivo && (
      (e.huella && k.huella && mismaFoto(e.huella, k.huella))
      || (e.imagenOriginal && k.imagenOriginal && sinConsulta(e.imagenOriginal) === sinConsulta(k.imagenOriginal))));
    if (igual && !mismoTema(e.titulo, igual[1].titulo)) {
      const motivo = `la misma foto ya ilustraba "${igual[1].titulo ?? igual[0]}" (${igual[0]}), que es de otro tema (regla 204)`;
      if (usadoPorOtra(e.archivo, id)) { b[id] = descartar(e, motivo, { ahora }); informe.descartadas.push({ id, titulo: e.titulo ?? null, motivo, viva: vivas.has(id) }); } else sacar(id, motivo);
      informe.repetidas.push({ id, titulo: e.titulo ?? null, con: igual[0] });
      continue;
    }
    quedan.push([id, e]);
  }

  // 4. Las de notas vivas que la poda borró de más.
  for (const [id, e] of Object.entries(b)) {
    if (!e?.borrada || e.retirada || e.archivo || e.descartada || !vivas.has(id)) continue;
    if (NO_RESTAURAR[id]) { informe.noRestauradas.push({ id, titulo: e.titulo ?? null, motivo: NO_RESTAURAR[id] }); continue; }
    if (!bajar || !e.imagenOriginal) { informe.noRestauradas.push({ id, titulo: e.titulo ?? null, motivo: bajar ? 'sin dirección original' : 'sin red (--sin-red)' }); continue; }
    const datos = await bajar(e.imagenOriginal);
    if (!datos) { informe.noRestauradas.push({ id, titulo: e.titulo ?? null, motivo: 'la foto original ya no se puede bajar' }); continue; }
    const bytes = Buffer.from(datos.base64, 'base64');
    const huella = await huellaDe(bytes);
    const repetida = fotoRepetidaEnElBanco(b, { id, titulo: e.titulo }, { huella, imagen: e.imagenOriginal });
    if (repetida) { informe.noRestauradas.push({ id, titulo: e.titulo ?? null, motivo: `quedaría repetida: ${repetida.motivo}` }); continue; }
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[datos.mime] ?? null;
    const guardar = await fotoParaGuardar(bytes, ext, achicar ? { achicar } : {});
    if (!guardar) { informe.noRestauradas.push({ id, titulo: e.titulo ?? null, motivo: 'no se pudo pasar a JPEG' }); continue; }
    const libre = nombreDeFotoNueva(id, [...enDisco, ...Object.keys(escribir)]);
    const archivo = `fotos-notas/${libre}.${guardar.ext}`;
    escribir[nombre(archivo)] = guardar.bytes;
    const { borrada, ausenteDesde, ...resto } = e;
    b[id] = { ...resto, archivo, credito: creditoDeFoto(e), ...(huella ? { huella } : {}), restaurada: { cuando: ahora.toISOString(), por: POR } };
    informe.restauradas.push({ id, titulo: e.titulo ?? null, archivo });
  }

  // 5. Las ilustraciones.
  for (const [id, motivo] of Object.entries(ILUSTRACIONES_A_SACAR)) {
    const x = il[id];
    if (!x?.archivo) continue;
    delete il[id];
    borrar.add(nombre(x.archivo));
    informe.ilustracionesSacadas.push({ id, titulo: x.titulo ?? null, motivo });
  }
  for (const [id, razon] of Object.entries(ILUSTRACIONES_REVISADAS)) {
    const x = il[id];
    if (!x?.archivo || x.control?.ok) continue;
    il[id] = { ...x, control: { ok: true, motivo: null, razon, cuando: ahora.toISOString(), por: POR } };
    informe.ilustracionesRevisadas.push({ id, titulo: x.titulo ?? null });
  }
  // Un archivo que todavía usa otra entrada no se borra.
  for (const f of [...borrar]) {
    const enUso = Object.values(b).some((e) => nombre(e?.archivo) === f) || Object.values(il).some((e) => nombre(e?.archivo) === f)
      || Object.values(manuales).some((e) => nombre(e?.archivo) === f);
    if (enUso) borrar.delete(f);
  }
  return { banco: b, ilustraciones: il, borrar: [...borrar], escribir, informe };
}

/** Cuántas notas vivas muestran foto real, ilustración o placa, con un banco y un libro dados (lo que haría la próxima corrida). */
export function contarImagenes(notasVivas, banco, ilustraciones, { existe }) {
  const c = { fotoReal: 0, ilustracion: 0, placa: 0, rotas: 0 };
  for (const n of notasVivas) {
    if (n.propia && n.propia !== 'pista') continue;
    if (n.foto?.archivo && !existe(nombre(n.foto.archivo))) c.rotas += 1;
    const alDia = fotoDelArchivoAlDia(n, banco, { existe });
    const real = alDia.foto && !/-ia(?:-\d+)?\.jpg$/.test(alDia.foto.archivo) ? alDia.foto : (banco[n.id]?.archivo && existe(nombre(banco[n.id].archivo)) ? banco[n.id] : null);
    if (real) c.fotoReal += 1;
    else if (ilustraciones[n.id]?.archivo && existe(nombre(ilustraciones[n.id].archivo))) c.ilustracion += 1;
    else c.placa += 1;
  }
  return c;
}

async function principal() {
  const aplicarCambios = process.argv.includes('--aplicar');
  const sinRed = process.argv.includes('--sin-red');
  const banco = leerJson(RUTAS.banco, {});
  const ilustraciones = leerJson(RUTAS.ilustraciones, {});
  const manuales = leerJson(RUTAS.manuales, {});
  const notasVivas = [...new Map([...(leerJson(RUTAS.archivo, { notas: [] }).notas ?? []), ...(leerJson(RUTAS.portada, { notas: [] }).notas ?? [])].map((n) => [n.id, n])).values()];
  const enDisco = new Set(fs.existsSync(RUTAS.carpeta) ? fs.readdirSync(RUTAS.carpeta) : []);
  const leerFoto = (f) => { const r = path.join(RUTAS.carpeta, f); return fs.existsSync(r) ? fs.readFileSync(r) : null; };
  const r = await arreglar({
    banco, ilustraciones, manuales, notasVivas, leerFoto, enDisco, bajar: sinRed ? null : (url) => descargarImagen(url),
  });
  const existeAntes = (f) => enDisco.has(f);
  const borrados = new Set(r.borrar);
  const existeDespues = (f) => (enDisco.has(f) && !borrados.has(f)) || !!r.escribir[f];
  const antes = contarImagenes(notasVivas, banco, ilustraciones, { existe: existeAntes });
  const despues = contarImagenes(notasVivas, r.banco, r.ilustraciones, { existe: existeDespues });
  const i = r.informe;
  const lista = (t, xs, f) => { console.log(`\n${t}: ${xs.length}`); for (const x of xs) console.log(`  ${f(x)}`); };
  lista('Fotos que se sacan', i.descartadas, (x) => `${x.id}${x.viva ? '' : ' (nota que ya no está)'} · ${x.titulo ?? ''} · ${x.motivo}`);
  lista('…de ellas, repetidas de otro tema', i.repetidas, (x) => `${x.id} · ${x.titulo ?? ''} (igual a ${x.con})`);
  lista('Fotos podadas de más que se restauran', i.restauradas, (x) => `${x.id} · ${x.titulo ?? ''} → ${x.archivo}`);
  lista('Podadas de más que NO se restauran', i.noRestauradas, (x) => `${x.id} · ${x.titulo ?? ''} · ${x.motivo}`);
  lista('Ilustraciones que se sacan', i.ilustracionesSacadas, (x) => `${x.id} · ${x.titulo ?? ''} · ${x.motivo}`);
  lista('Ilustraciones que quedan, revisadas', i.ilustracionesRevisadas, (x) => `${x.id} · ${x.titulo ?? ''}`);
  console.log(`\nHuellas nuevas en el banco: ${i.huellas}. Archivos a borrar: ${r.borrar.length}; a escribir: ${Object.keys(r.escribir).length}.`);
  console.log(`\nNotas con página (sin las propias): antes ${antes.fotoReal} con foto real, ${antes.ilustracion} con ilustración, ${antes.placa} con placa (${antes.rotas} con la imagen rota).`);
  console.log(`Después (en la próxima corrida de "Actualizar la web"): ${despues.fotoReal} con foto real, ${despues.ilustracion} con ilustración, ${despues.placa} con placa (las rotas las arregla el código).`);
  if (!aplicarCambios) { console.log('\nNo se cambió nada. Para hacerlo: node web/scripts/arreglar-fotos-17-10.mjs --aplicar'); return; }
  fs.writeFileSync(RUTAS.banco, `${JSON.stringify(r.banco, null, 1)}\n`, 'utf8');
  fs.writeFileSync(RUTAS.ilustraciones, `${JSON.stringify(r.ilustraciones, null, 1)}\n`, 'utf8');
  for (const [f, bytes] of Object.entries(r.escribir)) fs.writeFileSync(path.join(RUTAS.carpeta, f), bytes);
  for (const f of r.borrar) fs.rmSync(path.join(RUTAS.carpeta, f), { force: true });
  console.log('\nListo: web/data/banco-fotos.json, web/data/fotos-ia.json y web/public/fotos-notas/ cambiados. Ahora commit y push (ver arriba).');
  if (i.ilustracionesSacadas.length) console.log(`Para ilustrar otra vez esas notas: «Ilustrar notas sin foto» a mano con ids = ${i.ilustracionesSacadas.map((x) => x.id).join(', ')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => { console.error(`Falló: ${String(e?.message ?? e).slice(0, 300)}`); process.exit(1); });
}
