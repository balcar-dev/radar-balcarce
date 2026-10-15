const fs = require('fs');
const h = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const archivo = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).notas;
const enArchivo = new Map(archivo.map((n) => [n.id, n]));
const dia = (iso) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);

const MENORES = /"(niño|niña|nene|nena|adolescente|adolescentes|menores de edad|un menor de|una menor de|el menor de|la menor de|un bebé|el bebé|del bebé|una beba|la beba|bebés|recién nacido|recién nacida|alumna de|alumno de|abusado|abusada|abusador|la abusó|lo abusó|abusaba de)"|\d+ años|menores de \d+/;
const MUERTE = /"(muerte|falleció|fallecio|murió|murio|muere|fallece|deceso|velatorio|murieron|mueren|fallecieron|fallecen|muertos|muertas|hallaron muert\w|hallad\w muert\w|encontrad?\w* muert\w|sin vida|víctima fatal|victima fatal|herido|herida|heridos|heridas|lesionad\w*)"/;
const ACUSA = /"(denuncia|denunció|denuncio|detenido|acusado|imputado)"/;
const VIOLENCIA = /"(homicidio|asesinato|asesinado|asesinaron|cadáver|cadaver|víctima|victima|apuñalado|apuñalaron|baleado|balearon)"/;

function categoria(m = '') {
  if (m.startsWith('de afuera y poco contada')) return 'poco contada (de afuera, menos medios que el mínimo)';
  if (/cupo/.test(m)) return 'cupo de la sección';
  if (m.startsWith('internacional')) return 'internacional';
  if (m.startsWith('cotización')) return 'cotización del dólar';
  if (m.startsWith('parece promoción')) return 'promoción';
  if (/verificaci[oó]n baja/i.test(m)) return 'verificación BAJA';
  if (/tema sensible/.test(m)) return 'rojo';
  if (MENORES.test(m)) return 'menores (palabra o edad)';
  if (VIOLENCIA.test(m)) return 'violencia / víctima';
  if (ACUSA.test(m)) return 'acusación (denuncia, detenido, imputado)';
  if (MUERTE.test(m)) return 'muerte o heridos';
  if (/sección de acá|seccion de aca/.test(m)) return 'de acá en sección que no corresponde';
  return 'otro: ' + m.slice(0, 60);
}

const porCat = {};
const porDiaCat = {};
const porSeccionCat = {};
const palabras = {};
let alReescribir = 0;
const destino = {};
const ejemplos = {};
for (const [id, p] of Object.entries(h.pend)) {
  const c = categoria(p.motivo);
  porCat[c] = (porCat[c] || 0) + 1;
  const d = dia(p.primera);
  (porDiaCat[d] ??= {})[c] = ((porDiaCat[d] ??= {})[c] || 0) + 1;
  (porSeccionCat[c] ??= {})[p.seccion] = ((porSeccionCat[c] ??= {})[p.seccion] || 0) + 1;
  const w = (p.motivo.match(/"([^"]+)"/) || [])[1];
  if (w) palabras[w] = (palabras[w] || 0) + 1;
  if (/visto al reescribir/.test(p.motivo)) alReescribir++;
  // ¿Terminó publicada?
  const a = enArchivo.get(id);
  const pub = h.publ[id];
  let dst = 'nunca salió';
  if (a && a.publicadaPor && a.publicadaPor !== 'ia') dst = 'salió aprobada por una persona';
  else if (a || pub) dst = 'salió después (se soltó sola o la aprobaron)';
  (destino[c] ??= {})[dst] = ((destino[c] ??= {})[dst] || 0) + 1;
  (ejemplos[c] ??= []).length < 400 && ejemplos[c].push({ id, seccion: p.seccion, titulo: p.titulo, motivo: p.motivo, primera: p.primera, veces: p.veces, dst });
}
const dias = Object.keys(porDiaCat).sort();
console.log('pendientes distintas', Object.keys(h.pend).length, 'desde', h.desde, 'commits', h.commits, 'dias', dias.length, dias[0], dias.at(-1));
console.log('vistas al reescribir', alReescribir);
console.log('\nPOR CATEGORIA', Object.entries(porCat).sort((a, b) => b[1] - a[1]));
console.log('\nDESTINO', JSON.stringify(destino, null, 1));
console.log('\nPALABRAS', Object.entries(palabras).sort((a, b) => b[1] - a[1]).slice(0, 40));
console.log('\nSECCION POR CATEGORIA', JSON.stringify(porSeccionCat, null, 0));
console.log('\nPOR DIA');
for (const d of dias) console.log(d, Object.values(porDiaCat[d]).reduce((a, b) => a + b, 0), JSON.stringify(porDiaCat[d]));
// publicadas por día (primera aparición en portada)
const pubDia = {};
for (const [id, p] of Object.entries(h.publ)) { const d = dia(p.primera); pubDia[d] = (pubDia[d] || 0) + 1; }
console.log('\nPUBLICADAS NUEVAS POR DIA (primera vez en portada)', JSON.stringify(pubDia));
fs.writeFileSync(process.argv[4], JSON.stringify(ejemplos, null, 1));
