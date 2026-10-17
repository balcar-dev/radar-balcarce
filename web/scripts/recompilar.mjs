// ¿Hace falta volver a compilar el sitio antes de subirlo? (17/10/2026, regla 189: una sola compilación por vuelta)
//
//   node web/scripts/recompilar.mjs <commit-compilado> [<commit-publicado>]
//
// "Actualizar la web" (actualizar.yml) compila el sitio UNA vez, commitea los datos, trae lo que subieron los demás mientras tanto
// (`git pull --rebase`: el libro de Redes, la Vigilancia, lo que manda el celular) y recién ahí sube a Cloudflare lo que compiló. Lo que se
// publica tiene que ser lo que quedó en `main`. Si en ese rato no entró nada, o sólo entraron archivos que el sitio no lee (el estado de la
// vigilancia, las estadísticas, los documentos, las pruebas), se sube lo ya compilado. Si entró cualquier otra cosa (una retirada o una
// corrección del celular, el libro de redes, código), se vuelve a compilar con eso antes de subir: una retirada no espera a la vuelta siguiente.
//
// Ante la duda, recompila: la lista de abajo es de lo que se sabe que NO cambia el sitio, nunca al revés. Compilar de más cuesta ~2,5 minutos;
// de menos, publicar algo que ya no corresponde.
//
// Escribe `recompilar=true|false` en $GITHUB_OUTPUT (si existe) y dice por qué. Sin dependencias: sólo lo que trae Node (y git).

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Lo que se sabe que el armado del sitio (`npm run build` en web/) no lee. Todo lo demás obliga a recompilar. */
export const NO_CAMBIAN_EL_SITIO = [
  /^docs\//,
  /^pruebas\//,
  /^pruebas-modelos\//,
  /^\.github\//,
  /^\.claude\//,
  /^infra\//,
  /^[^/]+\.md$/,
  // Los archivos de web/data/ que escriben otros workflows (o el celular) y que ninguna página lee: el estado del vigilante y sus mediciones,
  // las auditorías, lo cifrado para los celulares que no es una nota, las pistas (las notas de pistas SÍ cambian el sitio) y los contadores de IA.
  /^web\/data\/(vigilancia|estadisticas|estadisticas-piezas|auditoria|auditoria-ia|celular-borradores|contactos-celular|pistas|uso-ia|intentos-ia)\.json$/,
];

/** ¿Alguno de estos archivos cambia lo que se publica? Devuelve { recompilar, porque: [archivos que obligan] }. */
export function hayQueRecompilar(archivos = []) {
  const limpios = archivos.map((a) => String(a).trim().replace(/\\/g, '/')).filter(Boolean);
  const porque = limpios.filter((a) => !NO_CAMBIAN_EL_SITIO.some((r) => r.test(a)));
  return { recompilar: porque.length > 0, porque };
}

/** Los archivos que cambiaron entre dos commits (git diff --name-only). */
export function archivosEntre(desde, hasta = 'HEAD', { git = (args) => execFileSync('git', args, { encoding: 'utf8' }) } = {}) {
  return git(['diff', '--name-only', desde, hasta]).split('\n').map((l) => l.trim()).filter(Boolean);
}

if (process.argv[1] && process.argv[1].endsWith('recompilar.mjs')) {
  const [desde, hasta = 'HEAD'] = process.argv.slice(2);
  let resultado;
  if (!desde) {
    // Sin el commit compilado no se puede saber qué entró: se recompila, por las dudas.
    console.log('No sé qué commit se compiló: se vuelve a compilar por las dudas.');
    resultado = { recompilar: true, porque: [] };
  } else {
    let archivos;
    try { archivos = archivosEntre(desde, hasta); } catch (e) {
      console.log(`No pude comparar ${desde} con ${hasta} (${e.message.split('\n')[0]}): se vuelve a compilar por las dudas.`);
      archivos = null;
    }
    resultado = archivos === null ? { recompilar: true, porque: [] } : hayQueRecompilar(archivos);
    if (archivos !== null) {
      if (!archivos.length) console.log('Mientras se armaba no entró nada nuevo: se sube lo ya compilado.');
      else if (!resultado.recompilar) console.log(`Entraron ${archivos.length} archivo(s) que el sitio no lee (${archivos.slice(0, 6).join(', ')}): se sube lo ya compilado.`);
      else console.log(`Entraron cambios que el sitio sí lee (${resultado.porque.slice(0, 8).join(', ')}${resultado.porque.length > 8 ? '…' : ''}): se vuelve a compilar antes de subir.`);
    }
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `recompilar=${resultado.recompilar}\n`);
}
