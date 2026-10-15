// Junta todos los problemas "copia" de las pruebas de redacción y mira qué palabras son: nombres propios, números, fechas.
const fs = require('fs');
const dir = process.argv[2];
const archivos = fs.readdirSync(dir).filter((f) => f.startsWith('redaccion-') && f.endsWith('.json'));
let total = 0; const tipos = {}; const copias = [];
for (const f of archivos) {
  const j = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8'));
  for (const h of Object.values(j.historias ?? {})) {
    const probs = h.problemas ?? h.verificacion?.problemas ?? h.resultado?.problemas ?? [];
    for (const p of probs) { tipos[p.tipo] = (tipos[p.tipo] || 0) + 1; total++; if (p.tipo === 'copia') copias.push({ f, d: p.detalle }); }
  }
}
console.log('archivos', archivos.length, 'problemas', total, tipos);
// Primer historia: claves
const j = JSON.parse(fs.readFileSync(`${dir}/${archivos[0]}`, 'utf8'));

// Las frases copiadas
const frases = copias.map((c) => (c.d.match(/\("([^"]+)/) || [])[1]).filter(Boolean);
console.log('copias con frase', frases.length);
// Heurística: cuántas palabras de la frase son números, meses, días o palabras que empiezan con mayúscula en la frase original (no se sabe: normalizada). Contamos números y meses/días.
const MES = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|lunes|martes|miercoles|jueves|viernes|sabado|domingo)$/;
let conDatos = 0;
for (const fr of frases) { const w = fr.split(' '); const datos = w.filter((x) => /\d/.test(x) || MES.test(x)).length; if (datos >= 2) conDatos++; }
console.log('frases copiadas con 2+ números/fechas', conDatos);
for (const fr of frases.slice(0, 40)) console.log(' -', fr);
