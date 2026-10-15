// 8/10/2026 (C-4): GitHub pasa `ubuntu-latest` a Ubuntu 26 desde el 19/10. Los robots (ffmpeg-static, resvg, sharp traen binarios) se
// fijan en 24.04 hasta probarlos con 26 a propósito; así el cambio no nos agarra un día cualquiera.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CARPETA = path.join(import.meta.dirname, '..', '.github', 'workflows');

test('ningún workflow corre en ubuntu-latest: todos fijan la versión', () => {
  const archivos = fs.readdirSync(CARPETA).filter((f) => f.endsWith('.yml'));
  assert.ok(archivos.length > 10);
  for (const f of archivos) {
    const t = fs.readFileSync(path.join(CARPETA, f), 'utf8');
    assert.ok(!/runs-on:\s*ubuntu-latest/.test(t), `${f} usa ubuntu-latest`);
    assert.match(t, /runs-on:\s*ubuntu-\d\d\.\d\d/, `${f} no fija la versión`);
  }
});

// 8/10/2026 (R-1): "Crear voces" no borra las dos voces de producción sin una confirmación escrita.
test('crear-voces protege las voces de producción y coincide con CRITERIO-REDES.md', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const codigo = fs.readFileSync(path.join(raiz, 'reels/crear-voces.mjs'), 'utf8');
  const criterio = fs.readFileSync(path.join(raiz, 'CRITERIO-REDES.md'), 'utf8');
  const lista = /VOCES_DE_PRODUCCION = \[([^\]]+)\]/.exec(codigo)[1].match(/voice_[a-z0-9]+/g);
  assert.equal(lista.length, 2);
  for (const id of lista) assert.ok(criterio.includes(id), `${id} no figura en CRITERIO-REDES.md`);
  assert.match(codigo, /VOCES_DE_PRODUCCION\.includes\(id\) && !pedido\.endsWith\(CONFIRMA_PRODUCCION\)/);
  assert.match(fs.readFileSync(path.join(raiz, '.github/workflows/crear-voces.yml'), 'utf8'), /borrar-de-produccion/);
});

// 8/10/2026: "Guardar si cambió algo" falló porque el `git add` nombraba una carpeta que no existía (web/data/historico/) y git corta
// con "pathspec did not match". Todo lo que nombra ese `git add` tiene que existir en el repositorio.
test('todos los caminos del git add de "Actualizar la web" existen', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'actualizar.yml'), 'utf8');
  const linea = yml.split('\n').find((l) => /^\s*git add web\/data\/portada\.json/.test(l));
  assert.ok(linea, 'no se encontró el git add principal');
  const caminos = linea.trim().replace(/^git add\s+/, '').split(/\s+/);
  assert.ok(caminos.length > 15);
  for (const c of caminos) assert.ok(fs.existsSync(path.join(raiz, c)), `${c} no existe: el git add falla y la web se congela`);
});

test('el workflow de respaldo existe y sus pasos opcionales no hacen fallar a los demás', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const t = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'respaldo.yml'), 'utf8');
  assert.match(t, /git bundle create/);
  assert.match(t, /fetch-depth: 0/);
  assert.match(t, /secrets\.GITLAB_TOKEN/);
  assert.match(t, /vars\.R2_RESPALDOS/);
  assert.ok((t.match(/if: \$\{\{ !cancelled\(\) \}\}/g) ?? []).length >= 3, 'GitLab y R2 corren aunque el otro falle');
  assert.ok(!/echo[^\n]*\$\{?GITLAB_TOKEN/.test(t), 'el token no se imprime');
});

// V2-20, M-4, T-4, A-4 y T-3 (8/10/2026)
test('todos los workflows dicen sus permisos y tienen tope de tiempo', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const carpeta = path.join(raiz, '.github', 'workflows');
  for (const f of fs.readdirSync(carpeta).filter((x) => x.endsWith('.yml'))) {
    const t = fs.readFileSync(path.join(carpeta, f), 'utf8');
    assert.match(t, /^\s*permissions:/m, `${f} no dice sus permisos`);
    assert.match(t, /timeout-minutes:/, `${f} no tiene tope de tiempo`);
  }
});

test('el proyecto pide Node 24 y el vigilante mira los workflows que nacieron para avisar', async () => {
  const raiz = path.join(import.meta.dirname, '..');
  assert.equal(JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8')).engines.node, '>=24');
  const { WORKFLOWS_VIGILADOS } = await import('../redes/vigilar.mjs');
  for (const [archivo, nombre] of Object.entries(WORKFLOWS_VIGILADOS)) {
    const t = fs.readFileSync(path.join(raiz, '.github', 'workflows', archivo), 'utf8');
    assert.match(t, new RegExp(`^name: ${nombre}$`, 'm'), `${archivo} no se llama "${nombre}"`);
  }
  for (const necesario of ['armado-vacio.yml', 'pruebas-otra-hora.yml', 'auditoria-ia.yml', 'pistas.yml']) assert.ok(WORKFLOWS_VIGILADOS[necesario], necesario);
});

// 15/10/2026 (M1 de la auditoría de Opus): las pruebas de la suite entera no frenan la web, pero el núcleo legal sí, en cada vuelta y ANTES de
// armar y publicar; y si falla, el aviso sale por el mismo camino que los demás.
test('"Actualizar la web" corre el núcleo legal antes de armar los datos y avisa si falla', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'actualizar.yml'), 'utf8').replace(/\r\n/g, '\n');
  const sinComentarios = yml.replace(/^\s*#.*$/gm, '');
  const nucleo = sinComentarios.indexOf('npm run test:nucleo');
  assert.ok(nucleo > 0, 'falta el paso del núcleo legal');
  assert.ok(nucleo < sinComentarios.indexOf('node scripts/generar-datos.mjs'), 'el núcleo legal tiene que correr antes de armar los datos');
  assert.ok(nucleo < sinComentarios.indexOf('git push'), 'y antes de publicar');
  const desde = yml.indexOf('- name: Núcleo legal de las pruebas');
  const paso = yml.slice(desde, yml.indexOf('- name:', desde + 10));
  assert.ok(!/continue-on-error/.test(paso), 'el núcleo legal tiene que frenar la vuelta si falla');
  assert.match(yml, /if: failure\(\) && steps\.nucleo\.outcome == 'failure'/);
  assert.match(yml, /avisar-por-mail\.mjs/);
  assert.match(yml, /VIGILANTE_TOKEN: \$\{\{ secrets\.VIGILANTE_TOKEN \}\}/);
  const pkg = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:nucleo'], 'node pruebas/nucleo-legal.mjs');
  const lista = fs.readFileSync(path.join(raiz, 'pruebas', 'nucleo-legal.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const base of ['semaforo', 'exenciones', 'verificar', 'celular', 'archivo', 'cuerpo']) assert.ok(lista.includes(`${base}.test.mjs`), `${base} falta en el núcleo legal`);
  for (const f of lista) assert.ok(fs.existsSync(path.join(raiz, 'pruebas', f)), `${f} no existe`);
});

// 15/10/2026 (M6): la prueba de restauración dijo "git fsck sin errores" aunque fsck fallara (iba a un `| tail` sin pipefail).
test('la prueba de restauración falla si git fsck falla y el resumen sólo dice "sano" si pasó', () => {
  const raiz = path.join(import.meta.dirname, '..');
  const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'probar-restauracion.yml'), 'utf8').replace(/\r\n/g, '\n');
  const sinComentarios = yml.replace(/^\s*#.*$/gm, '');
  assert.ok(!/git fsck[^\n]*\|/.test(sinComentarios), 'git fsck no puede ir a un pipe sin pipefail');
  assert.match(sinComentarios, /if git fsck --full > \.\.\/fsck\.txt 2>&1; then/);
  assert.match(sinComentarios, /else[\s\S]*?exit 1\n\s*fi/);
  assert.match(sinComentarios, /echo "FSCK=ok" >> "\$GITHUB_ENV"/);
  assert.match(sinComentarios, /if \[ "\$\{FSCK:-\}" = ok \]; then\n\s*echo "- Bundle de git: \*\*restaurado y sano\*\*/);
});
