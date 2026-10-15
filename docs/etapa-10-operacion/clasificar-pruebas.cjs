// Clasificación PROPIA de cada archivo de pruebas, hecha leyendo su cabecera (no el cuerpo entero).
// a = protege un error que ya llegó a lo publicado, una regla legal/de seguridad, o que la web se congele
// b = detalle, diseño o tono (se rompe seguido por motivos que no importan; vale la pena arreglar, no vigilar cada 30 min)
// c = código que se puede borrar (panel de la PC, comercial, herramientas de una sola vez)
const fs=require('fs');
const A=`notas semaforo verificar loteria de-aca cruce cruce-coherente entrada copia-de-afuera criterios-extranjero-zona fuentes fuentes-registro
criterio lectura-ia reescritura cuerpo estilo editor redaccion-29-09 escape-en-el-texto json-ia articulo archivo ruta redirects repetidas repetidas-esperando
fecha-y-antes fechas-balcarce hora-balcarce zona armado-vacio temas-vacios contar-archivos seo seo-paginas datos-fijos sintaxis-scripts portada celular celular-app
redes piezas contrato instagram-duplicados espejo reintentar plan-vacio meta-tiempo redes-criterio redes-arreglos voz-memoria voz-gemini vigilancia vigilancia-falla-web
arreglos-28-09 auditoria-28-09 auditoria-ia auditoria-correccion farmacias dolar foto-logo fotos fotos-notas pistas informese reloj reloj-cloudflare workflows-fijos
checkout-main efemerides-ajenas agenda-suspendidos vigilancia-cierre estadistica-diaria cuerpo-de-prueba pedir-clima-tiempo intentos-por-cobertura fuentes-lista-elegida
efemerides-propuesta formatos auditar-redes tablas-fijas clima notas-propias eventos vigilancia-arreglos`.split(/\s+/);
const C=`comercial propuestas acceso panel panel-seguridad respaldo buzon agenda-panel horarios exportar-efemerides combinar-auditorias presentacion perfiles`.split(/\s+/);
const files=fs.readdirSync('../../pruebas').filter(f=>f.endsWith('.test.mjs')).map(f=>f.replace('.test.mjs',''));
const inv={};fs.readFileSync('pruebas-inventario.txt','utf8').split('\n').slice(1).forEach(l=>{const p=l.split(' | ');if(p[2])inv[p[2].replace('.test.mjs','')]=+p[0]});
let t={}, n={a:0,b:0,c:0};
const rows=[];
for(const f of files){const k=A.includes(f)?'a':C.includes(f)?'c':'b';n[k]++;t[k]=(t[k]||0)+(inv[f]||0);rows.push([f,k,inv[f]||0]);}
fs.writeFileSync('pruebas-clasificadas.csv','archivo,clase,pruebas\n'+rows.map(r=>r.join(',')).join('\n')+'\n');
console.log(n,t,files.length);
