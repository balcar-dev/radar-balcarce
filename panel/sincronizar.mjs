// Sube a GitHub lo que el panel decide, sin que nadie tenga que acordarse.
//
// Las decisiones (publicar, descartar, editar) y los avisos publicitarios se
// guardan en archivos de web/data/. Hasta el 24/09 esos archivos sólo llegaban
// a la web si alguien los commiteaba a mano. Ahora, unos segundos después del
// último cambio, se commitean y se suben solos.
//
// Sin dependencias: usa git tal cual está instalado. Si algo falla (sin
// internet, un conflicto) lo cuenta y no rompe el panel: el cambio queda en
// el archivo y se sube en el próximo intento.

import { spawn } from 'node:child_process';

/** Corre git y devuelve { codigo, salida }. */
export function ejecutarGit(args, { cwd }) {
  return new Promise((resolver) => {
    const p = spawn('git', args, { cwd });
    let salida = '';
    p.stdout.on('data', (d) => { salida += d; });
    p.stderr.on('data', (d) => { salida += d; });
    p.on('error', (e) => resolver({ codigo: 1, salida: e.message }));
    p.on('close', (codigo) => resolver({ codigo, salida }));
  });
}

/**
 * @param {object} o
 * @param {string[]} o.archivos  rutas relativas a `raiz` que se suben
 * @param {(args: string[]) => Promise<{codigo:number, salida:string}>} o.git
 */
export function crearSincronizador({
  archivos, git, esperaMs = 30000, log = console.log, ahora = () => new Date(), temporizador = setTimeout, cancelar = clearTimeout,
}) {
  let espera = null;
  let corriendo = false;

  async function sincronizar() {
    if (corriendo) return { hecho: false, motivo: 'ya hay una en curso' };
    corriendo = true;
    try {
      await git(['add', '--', ...archivos]);
      const sinCambios = (await git(['diff', '--cached', '--quiet'])).codigo === 0;
      if (sinCambios) return { hecho: false, motivo: 'sin cambios' };

      const hora = ahora().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      const c = await git(['commit', '-m', `Panel: decisiones y avisos · ${hora}`]);
      if (c.codigo !== 0) return { hecho: false, motivo: `commit: ${c.salida.trim().slice(0, 120)}` };

      const p = await git(['pull', '--rebase', '--autostash']);
      if (p.codigo !== 0) {
        await git(['rebase', '--abort']);
        return { hecho: false, motivo: `pull: ${p.salida.trim().slice(0, 120)}` };
      }
      const s = await git(['push']);
      if (s.codigo !== 0) return { hecho: false, motivo: `push: ${s.salida.trim().slice(0, 120)}` };
      return { hecho: true };
    } finally {
      corriendo = false;
    }
  }

  return {
    sincronizar,
    /** Pide una sincronización; varios cambios seguidos se juntan en una. */
    programar() {
      if (espera) cancelar(espera);
      espera = temporizador(async () => {
        espera = null;
        const r = await sincronizar();
        if (r.hecho) log('  panel → GitHub: cambios subidos');
        else if (r.motivo !== 'sin cambios') log(`  panel → GitHub: no se pudo subir (${r.motivo}); queda para el próximo intento`);
      }, esperaMs);
    },
  };
}
