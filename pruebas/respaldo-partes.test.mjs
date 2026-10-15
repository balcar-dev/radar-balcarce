// 15/10/2026: wrangler sube hasta 300 MB por archivo y el bundle del respaldo (172-185 MB, +3,5 MB por día) los pasa hacia el 20/11/2026.
// "Respaldo" parte en pedazos lo que pase de 250 MB (BYTES_PARA_PARTIR) y "Probar la restauración del respaldo" los vuelve a juntar y
// verifica el sha256. Acá se corren LOS MISMOS scripts de los dos .yml (se sacan del texto del workflow), con un `npx` falso que guarda en
// una carpeta en vez de hablar con Cloudflare, y con un umbral y un tamaño de parte chicos para no necesitar un archivo enorme.
// No hace falta red. Se saltea si no hay bash con split y sha256sum (Git Bash en Windows, cualquier Linux).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const RAIZ = path.join(import.meta.dirname, '..');
const WORKFLOWS = path.join(RAIZ, '.github', 'workflows');
const FECHA = '2026-11-22';

const leer = (f) => fs.readFileSync(path.join(WORKFLOWS, f), 'utf8');

// El bloque `run: |` del paso que se llama `nombre`, sin la sangría.
function scriptDelPaso(yml, nombre) {
  const lineas = yml.split('\n');
  const i = lineas.findIndex((l) => l.trim() === `- name: ${nombre}`);
  assert.ok(i >= 0, `no está el paso "${nombre}"`);
  const j = lineas.findIndex((l, k) => k > i && /^\s+run: \|\s*$/.test(l));
  assert.ok(j > i, `el paso "${nombre}" no tiene run`);
  const sangria = lineas[j + 1].match(/^ */)[0].length;
  const cuerpo = [];
  for (let k = j + 1; k < lineas.length; k++) {
    if (lineas[k].trim() !== '' && lineas[k].match(/^ */)[0].length < sangria) break;
    cuerpo.push(lineas[k].slice(sangria));
  }
  return cuerpo.join('\n');
}

function encontrarBash() {
  const candidatos = [process.env.BASH, 'bash', 'C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files\\Git\\usr\\bin\\bash.exe'].filter(Boolean);
  for (const c of candidatos) {
    const r = spawnSync(c, ['-c', 'split --version >/dev/null && sha256sum --version >/dev/null && stat -c %s . >/dev/null && echo ok'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === 'ok') return c;
  }
  return null;
}
const BASH = encontrarBash();
const sinBash = BASH ? false : 'no hay bash con split y sha256sum';

// Un `npx` falso: `npx --yes wrangler@X r2 object put|get CLAVE --file ARCHIVO --remote` copia hacia/desde $R2_FALSO.
const NPX_FALSO = `
npx() {
  local accion="" clave="" archivo="" anterior=""
  for a in "$@"; do
    case "$anterior" in
      object) accion="$a" ;;
      put|get) clave="$a" ;;
      --file) archivo="$a" ;;
    esac
    anterior="$a"
  done
  echo "wrangler $accion $clave" >> "$R2_FALSO.registro"
  case "$accion" in
    put) mkdir -p "$(dirname "$R2_FALSO/$clave")"; cp "$archivo" "$R2_FALSO/$clave" ;;
    get) [ -f "$R2_FALSO/$clave" ] || { echo "The specified key does not exist." >&2; return 1; }; cp "$R2_FALSO/$clave" "$archivo" ;;
    *) echo "accion inesperada: $accion" >&2; return 2 ;;
  esac
}
`;

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const barras = (p) => p.replace(/\\/g, '/');

function correr(script, cwd, env) {
  return spawnSync(BASH, ['-c', NPX_FALSO + script], {
    cwd, encoding: 'utf8',
    env: { ...process.env, TZ: 'America/Argentina/Buenos_Aires', R2_RESPALDOS: 'radar-respaldos', ...env },
  });
}

// Una carpeta de trabajo con respaldo/ (un "bundle" y un "tar.gz" falsos), un R2 falso y los archivos de resumen.
function escenario({ bundle, tar = 1_000 }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-partes-'));
  fs.mkdirSync(path.join(dir, 'respaldo'));
  const archivos = {
    bundle: path.join(dir, 'respaldo', `radar-balcarce-${FECHA}.bundle`),
    tar: path.join(dir, 'respaldo', `datos-y-fotos-${FECHA}.tar.gz`),
  };
  fs.writeFileSync(archivos.bundle, crypto.randomBytes(bundle));
  fs.writeFileSync(archivos.tar, crypto.randomBytes(tar));
  const env = {
    FECHA,
    R2_FALSO: barras(path.join(dir, 'r2')),
    GITHUB_STEP_SUMMARY: barras(path.join(dir, 'resumen.md')),
    GITHUB_ENV: barras(path.join(dir, 'env.txt')),
  };
  for (const f of [env.GITHUB_STEP_SUMMARY, env.GITHUB_ENV]) fs.writeFileSync(f, '');
  const r2 = (...p) => path.join(dir, 'r2', 'radar-respaldos', 'respaldos', FECHA, ...p);
  return { dir, archivos, env, r2, resumen: () => fs.readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8') };
}

const SUBIDA = () => scriptDelPaso(leer('respaldo.yml'), 'Copia en Cloudflare R2 (si está configurado)');
const BAJADA = () => scriptDelPaso(leer('probar-restauracion.yml'), 'Bajar el respaldo de R2').replace('${{ inputs.fecha }}', FECHA);

test('un archivo que pasa el umbral se sube en partes con manifiesto y SHA256SUMS, y la restauración lo vuelve a armar igual', { skip: sinBash }, () => {
  const e = escenario({ bundle: 5_000_000 });
  const sube = correr(SUBIDA(), e.dir, { ...e.env, BYTES_PARA_PARTIR: '2000000', TAMANO_DE_PARTE: '2000000' });
  assert.equal(sube.status, 0, sube.stderr);

  const bundle = `radar-balcarce-${FECHA}.bundle`;
  const nombres = fs.readdirSync(e.r2()).sort();
  assert.deepEqual(nombres, [
    `datos-y-fotos-${FECHA}.tar.gz`, `${bundle}.part-000`, `${bundle}.part-001`, `${bundle}.part-002`, `${bundle}.partes.txt`, 'SHA256SUMS',
  ].sort());
  assert.ok(!nombres.includes(bundle), 'el bundle partido no se sube también entero');
  assert.deepEqual([0, 1, 2].map((n) => fs.statSync(e.r2(`${bundle}.part-00${n}`)).size), [2_000_000, 2_000_000, 1_000_000]);

  const manifiesto = fs.readFileSync(e.r2(`${bundle}.partes.txt`), 'utf8').trim().split('\n');
  assert.deepEqual(manifiesto, [
    `archivo ${bundle}`, `sha256 ${sha(e.archivos.bundle)}`, 'bytes 5000000',
    `parte ${bundle}.part-000 2000000`, `parte ${bundle}.part-001 2000000`, `parte ${bundle}.part-002 1000000`,
  ]);

  const sumas = fs.readFileSync(e.r2('SHA256SUMS'), 'utf8');
  assert.ok(sumas.includes(`${sha(e.archivos.tar)}  datos-y-fotos-${FECHA}.tar.gz`), 'el archivo chico está en SHA256SUMS');
  assert.ok(sumas.includes(`${sha(e.archivos.bundle)}  ${bundle}`), 'el hash del bundle entero está en SHA256SUMS');
  assert.ok(sumas.includes(`${sha(e.r2(`${bundle}.part-001`))}  ${bundle}.part-001`), 'cada parte está en SHA256SUMS');
  assert.ok(e.resumen().includes('**subido**'), e.resumen());
  assert.ok(e.resumen().includes('partido en 3 partes'), e.resumen());

  // La restauración usa los mismos "objetos" de R2 (la carpeta falsa) y junta las partes.
  const baja = correr(BAJADA(), e.dir, e.env);
  assert.equal(baja.status, 0, baja.stdout + baja.stderr);
  assert.equal(sha(path.join(e.dir, 'restaurar', 'radar-balcarce.bundle')), sha(e.archivos.bundle));
  assert.equal(sha(path.join(e.dir, 'restaurar', 'datos-y-fotos.tar.gz')), sha(e.archivos.tar));
  const descarga = fs.readFileSync(path.join(e.dir, 'restaurar', 'descarga.txt'), 'utf8');
  assert.match(descarga, /armado con 3 partes\): sha256 verificado/);
  assert.match(descarga, /datos-y-fotos-.*\(archivo entero\): sha256 verificado/);
});

test('un archivo chico se sube entero, con su nombre de siempre, y también queda en SHA256SUMS', { skip: sinBash }, () => {
  const e = escenario({ bundle: 5_000_000 });
  const sube = correr(SUBIDA(), e.dir, e.env); // umbral y partes por defecto: 5 MB está muy lejos de 250 MB
  assert.equal(sube.status, 0, sube.stderr);
  assert.deepEqual(fs.readdirSync(e.r2()).sort(), [`datos-y-fotos-${FECHA}.tar.gz`, `radar-balcarce-${FECHA}.bundle`, 'SHA256SUMS'].sort());
  assert.equal(sha(e.r2(`radar-balcarce-${FECHA}.bundle`)), sha(e.archivos.bundle));
  assert.ok(!e.resumen().includes('partido'), e.resumen());

  const baja = correr(BAJADA(), e.dir, e.env);
  assert.equal(baja.status, 0, baja.stdout + baja.stderr);
  assert.equal(sha(path.join(e.dir, 'restaurar', 'radar-balcarce.bundle')), sha(e.archivos.bundle));
});

test('la restauración sigue andando con un respaldo viejo (sin manifiesto ni SHA256SUMS) y lo avisa', { skip: sinBash }, () => {
  const e = escenario({ bundle: 300_000 });
  for (const [clave, archivo] of [[`radar-balcarce-${FECHA}.bundle`, e.archivos.bundle], [`datos-y-fotos-${FECHA}.tar.gz`, e.archivos.tar]]) {
    fs.mkdirSync(e.r2(), { recursive: true });
    fs.copyFileSync(archivo, e.r2(clave));
  }
  const baja = correr(BAJADA(), e.dir, e.env);
  assert.equal(baja.status, 0, baja.stdout + baja.stderr);
  assert.equal(sha(path.join(e.dir, 'restaurar', 'radar-balcarce.bundle')), sha(e.archivos.bundle));
  assert.match(fs.readFileSync(path.join(e.dir, 'restaurar', 'descarga.txt'), 'utf8'), /sin suma sha256 para verificar/);
});

test('la restauración falla si una parte vino alterada o si falta una', { skip: sinBash }, () => {
  const e = escenario({ bundle: 5_000_000 });
  assert.equal(correr(SUBIDA(), e.dir, { ...e.env, BYTES_PARA_PARTIR: '2000000', TAMANO_DE_PARTE: '2000000' }).status, 0);
  const parte = e.r2(`radar-balcarce-${FECHA}.bundle.part-001`);
  const original = fs.readFileSync(parte);

  const alterada = Buffer.from(original);
  alterada[10] ^= 0xff;
  fs.writeFileSync(parte, alterada);
  const mala = correr(BAJADA(), e.dir, e.env);
  assert.notEqual(mala.status, 0);
  assert.match(mala.stdout + mala.stderr, /sha256 no coincide/);

  fs.rmSync(parte);
  const falta = correr(BAJADA(), e.dir, e.env);
  assert.notEqual(falta.status, 0, 'si falta una parte no se sigue con el bundle incompleto');
});

test('si R2 rechaza una subida, el paso falla y lo dice en el resumen', { skip: sinBash }, () => {
  const e = escenario({ bundle: 5_000_000 });
  const rota = 'npx() { return 1; }\n';
  const r = spawnSync(BASH, ['-c', rota + SUBIDA()], {
    cwd: e.dir, encoding: 'utf8', env: { ...process.env, ...e.env, R2_RESPALDOS: 'radar-respaldos', BYTES_PARA_PARTIR: '2000000', TAMANO_DE_PARTE: '2000000' },
  });
  assert.equal(r.status, 1);
  assert.ok(e.resumen().includes('**FALLÓ**'), e.resumen());
});

test('sin la variable R2_RESPALDOS el paso se saltea sin fallar', { skip: sinBash }, () => {
  const e = escenario({ bundle: 1_000 });
  const r = correr(SUBIDA(), e.dir, { ...e.env, R2_RESPALDOS: '' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(e.resumen().includes('no configurado'));
});

test('los dos workflows se guardan con finales de línea LF (los scripts son de bash) y siguen con permisos, tope y versión fija', () => {
  for (const f of ['respaldo.yml', 'probar-restauracion.yml']) {
    const t = leer(f);
    assert.ok(!t.includes('\r'), `${f} tiene CRLF`);
    assert.match(t, /^permissions:\n\s+contents: read/m, f);
    assert.match(t, /timeout-minutes: \d+/, f);
    assert.match(t, /runs-on: ubuntu-24\.04/, f);
  }
  const subida = SUBIDA();
  assert.match(subida, /BYTES_PARA_PARTIR:-262144000/, 'el umbral por defecto es 250 MiB');
  assert.match(subida, /split -b "\$TAMANO_PARTE" -d -a 3/);
  assert.match(subida, /TAMANO_DE_PARTE:-200m/);
});
