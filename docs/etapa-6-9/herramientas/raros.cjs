const fs = require('fs');
const a = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).notas;
const permitido = /[\sA-Za-z0-9áéíóúÁÉÍÓÚüÜñÑ.,;:¡!¿?()"'“”‘’«»%$\-–—\/°ºª+&#@*\[\]…|=_]/u;
const raros = {};
let escapes = 0;
const casos = [];
for (const n of a) {
  for (const c of ['titulo', 'copete', 'cuerpo']) {
    const t = String(n[c] || '');
    if (/\\u[0-9a-fA-F]{0,4}/.test(t)) { escapes++; casos.push(['escape', n.id, c, t.slice(0, 90)]); }
    for (const ch of t) {
      if (!permitido.test(ch)) {
        raros[ch] ??= [];
        if (raros[ch].length < 2) { const i = t.indexOf(ch); raros[ch].push(`${n.id}/${c}: …${t.slice(Math.max(0, i - 25), i + 15).replace(/\n/g, ' ')}…`); }
      }
    }
    // palabras con tilde en dos vocales o vocal con tilde rara
    for (const w of t.split(/[^A-Za-záéíóúüñÁÉÍÓÚÑêèàòùâîô]+/)) {
      if ((w.match(/[áéíóú]/gi) || []).length >= 2 || /[êèàòùâîô]/.test(w)) casos.push(['palabra', n.id, c, w]);
    }
  }
}
console.log('escapes', escapes);
for (const [k, v] of Object.entries(raros)) console.log(JSON.stringify(k), 'U+' + k.codePointAt(0).toString(16), v.join(' | '));
for (const c of casos.slice(0, 60)) console.log(c.join(' · '));
console.log('casos', casos.length);
