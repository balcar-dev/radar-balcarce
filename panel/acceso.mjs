// Quién puede entrar al panel.
//
// Hasta ahora el panel no tenía puerta: escuchaba en todas las interfaces
// del equipo y cualquiera en la misma red podía publicar, descartar o
// borrar noticias. Mientras corría sólo en una PC en casa era un riesgo
// chico; en el momento en que se abre para que entren dos personas desde
// afuera, deja de serlo.
//
// Lo que hay acá es lo mínimo que se puede hacer bien, sin dependencias:
//
//   · La contraseña NO se guarda. Se guarda un hash scrypt con sal propia
//     por usuario. Aunque alguien se lleve usuarios.json, no tiene las
//     contraseñas.
//   · La comparación es en tiempo constante (timingSafeEqual): comparar con
//     === deja medir, por lo que tarda, cuántos caracteres acertaste.
//   · La sesión es una cookie firmada con HMAC, no un identificador que se
//     pueda inventar. No hay estado de sesiones en memoria, así que
//     reiniciar el panel no echa a nadie.
//   · Cinco intentos fallidos por IP y la puerta se cierra 15 minutos.
//
// Los archivos con secretos viven en panel/datos/, que está en .gitignore:
// nunca salen de la máquina.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let DATOS = path.join(import.meta.dirname, 'datos');
let F_USUARIOS = path.join(DATOS, 'usuarios.json');
let F_SECRETO = path.join(DATOS, 'secreto.txt');

/** Sólo para las pruebas: usar una carpeta aparte y no la real del panel. */
export function _usarCarpetaDeDatos(dir) {
  DATOS = dir;
  F_USUARIOS = path.join(DATOS, 'usuarios.json');
  F_SECRETO = path.join(DATOS, 'secreto.txt');
}

const DIAS_DE_SESION = 30;

// ------------------------------------------------------------- el secreto

/** La clave con la que se firman las cookies. Se crea sola la primera vez.
 *  Si se borra, todas las sesiones abiertas dejan de valer — que es
 *  justamente lo que se quiere si alguna vez hay que echar a alguien. */
function secreto() {
  fs.mkdirSync(DATOS, { recursive: true });
  if (!fs.existsSync(F_SECRETO)) {
    fs.writeFileSync(F_SECRETO, crypto.randomBytes(32).toString('hex'), 'utf8');
  }
  return fs.readFileSync(F_SECRETO, 'utf8').trim();
}

// ----------------------------------------------------------- los usuarios

function leerUsuarios() {
  try { return JSON.parse(fs.readFileSync(F_USUARIOS, 'utf8')); } catch { return {}; }
}

function guardarUsuarios(u) {
  fs.mkdirSync(DATOS, { recursive: true });
  fs.writeFileSync(F_USUARIOS, JSON.stringify(u, null, 2), 'utf8');
}

function hashear(clave, sal) {
  // 16384 iteraciones es el valor por defecto de Node y alcanza para esto:
  // son dos usuarios, no un sitio con diez mil cuentas.
  return crypto.scryptSync(clave, sal, 64).toString('hex');
}

/** Crea o cambia la contraseña de alguien. */
export function ponerClave(usuario, clave, nombre = null) {
  if (clave.length < 8) throw new Error('la contraseña tiene que tener al menos 8 caracteres');
  const usuarios = leerUsuarios();
  const sal = crypto.randomBytes(16).toString('hex');
  usuarios[usuario] = {
    nombre: nombre ?? usuarios[usuario]?.nombre ?? usuario,
    sal,
    hash: hashear(clave, sal),
    desde: usuarios[usuario]?.desde ?? new Date().toISOString(),
  };
  guardarUsuarios(usuarios);
  return usuarios[usuario];
}

export function hayUsuarios() {
  return Object.keys(leerUsuarios()).length > 0;
}

export function listarUsuarios() {
  return Object.entries(leerUsuarios()).map(([usuario, u]) => ({ usuario, nombre: u.nombre }));
}

function verificar(usuario, clave) {
  const u = leerUsuarios()[usuario];
  if (!u) {
    // Aunque el usuario no exista se calcula un hash igual, para que no se
    // pueda averiguar qué usuarios existen midiendo lo que tarda.
    hashear(clave, 'sal-que-no-sirve-para-nada');
    return null;
  }
  const esperado = Buffer.from(u.hash, 'hex');
  const dado = Buffer.from(hashear(clave, u.sal), 'hex');
  if (esperado.length !== dado.length) return null;
  if (!crypto.timingSafeEqual(esperado, dado)) return null;
  return { usuario, nombre: u.nombre };
}

// ------------------------------------------------------------- la sesión

function firmar(texto) {
  return crypto.createHmac('sha256', secreto()).update(texto).digest('base64url');
}

function armarFicha(usuario) {
  const cuerpo = Buffer.from(JSON.stringify({
    u: usuario,
    vence: Date.now() + DIAS_DE_SESION * 86400000,
  })).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo)}`;
}

function leerFicha(ficha) {
  if (typeof ficha !== 'string' || !ficha.includes('.')) return null;
  const [cuerpo, firma] = ficha.split('.');
  const esperada = Buffer.from(firmar(cuerpo));
  const dada = Buffer.from(firma);
  if (esperada.length !== dada.length) return null;
  if (!crypto.timingSafeEqual(esperada, dada)) return null;
  try {
    const { u, vence } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    if (!vence || Date.now() > vence) return null;
    const usuario = leerUsuarios()[u];
    if (!usuario) return null; // se borró la cuenta: la sesión muere con ella
    return { usuario: u, nombre: usuario.nombre };
  } catch { return null; }
}

function cookiesDe(req) {
  const crudo = req.headers.cookie ?? '';
  const salida = {};
  for (const parte of crudo.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) salida[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return salida;
}

/** Quién está haciendo este pedido, o null si nadie válido. */
export function sesionDe(req) {
  return leerFicha(cookiesDe(req).rb_sesion);
}

// Secure sólo cuando la conexión vino por https (detrás de un túnel, el
// proxy lo avisa con X-Forwarded-Proto). Ponerlo siempre haría que la
// cookie no viaje cuando se entra por http a la red local, y nadie podría
// iniciar sesión desde la PC de al lado.
function cookie(valor, req, segundos) {
  // Tailscale Funnel sirve el panel SOLO por https, pero no siempre manda
  // el X-Forwarded-Proto, así que se mira también el nombre del equipo: si
  // la cookie no sale marcada como Secure, el navegador estaría dispuesto a
  // mandarla por una conexión sin cifrar.
  const porTunel = String(req.headers.host ?? '').endsWith('.ts.net');
  const https = req.headers['x-forwarded-proto'] === 'https' || porTunel;
  const seguro = https ? ' Secure;' : '';
  return `rb_sesion=${valor}; HttpOnly;${seguro} SameSite=Lax; Path=/; Max-Age=${segundos}`;
}

// ------------------------------------------------- el freno a la fuerza bruta

const intentos = new Map(); // ip -> { fallos, hasta }
const MAX_FALLOS = 5;
const CASTIGO_MS = 15 * 60 * 1000;

function frenado(ip) {
  const x = intentos.get(ip);
  if (!x?.hasta) return 0;
  if (Date.now() > x.hasta) { intentos.delete(ip); return 0; }
  return Math.ceil((x.hasta - Date.now()) / 60000);
}

function anotarFallo(ip) {
  const x = intentos.get(ip) ?? { fallos: 0, hasta: 0 };
  x.fallos += 1;
  if (x.fallos >= MAX_FALLOS) { x.hasta = Date.now() + CASTIGO_MS; x.fallos = 0; }
  intentos.set(ip, x);
}

// --------------------------------------------------------------- entrar

/** De dónde viene realmente el pedido.
 *
 *  Importa por el freno de abajo: detrás de Tailscale Funnel TODO llega
 *  desde 127.0.0.1, así que si se contaran los fallos por esa IP, cualquiera
 *  desde internet podría gastar cinco intentos fallidos y dejar afuera a
 *  Andrés y a Hernán durante quince minutos. El túnel manda la IP verdadera
 *  en X-Forwarded-For, y sólo se le cree cuando el pedido entró por él. */
function ipDe(req) {
  const local = req.socket.remoteAddress ?? 'desconocida';
  const porTunel = String(req.headers.host ?? '').endsWith('.ts.net');
  if (!porTunel) return local;
  const cadena = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return cadena || local;
}

/** Procesa el formulario. Devuelve { ok, error, cookie }. */
export function entrar({ usuario, clave }, req) {
  const ip = ipDe(req);
  const minutos = frenado(ip);
  if (minutos) {
    return { ok: false, error: `Demasiados intentos. Probá de nuevo en ${minutos} minutos.` };
  }
  const quien = verificar((usuario ?? '').trim().toLowerCase(), clave ?? '');
  if (!quien) {
    anotarFallo(ip);
    // A propósito no se aclara si falló el usuario o la contraseña.
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }
  intentos.delete(ip);
  return { ok: true, quien, cookie: cookie(armarFicha(quien.usuario), req, DIAS_DE_SESION * 86400) };
}

export function salir(req) {
  return cookie('', req, 0);
}

// ------------------------------------------------------------ la pantalla

export function paginaLogin({ error = null, sinUsuarios = false } = {}) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entrar · Radar Balcarce</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#14161A; color:#F4F1EA; font-family:"IBM Plex Sans",system-ui,sans-serif; padding:20px; }
  .caja { width:100%; max-width:380px; }
  .marca { font-family:"Fraunces",Georgia,serif; font-size:34px; font-weight:900; letter-spacing:-0.03em; }
  .marca span { color:#C7381C; }
  .sub { color:#8C918D; font-size:13px; margin:8px 0 26px; }
  label { display:block; font-size:12px; font-weight:600; letter-spacing:0.05em;
          text-transform:uppercase; color:#8C918D; margin-bottom:6px; }
  input { width:100%; height:46px; border-radius:8px; border:1px solid #2A2E32; background:#1B1F24;
          color:#F4F1EA; padding:0 14px; font-size:15px; font-family:inherit; margin-bottom:16px; }
  input:focus { outline:none; border-color:#C7381C; }
  button { width:100%; height:46px; border-radius:23px; border:none; background:#C7381C; color:#fff;
           font-size:15px; font-weight:600; font-family:inherit; cursor:pointer; }
  button:hover { background:#9C2B15; }
  .error { background:#3A1712; border:1px solid #8C2D18; color:#F0C4BA; border-radius:8px;
           padding:11px 14px; font-size:13.5px; margin-bottom:18px; }
  .aviso { background:#1B1F24; border:1px solid #2A2E32; border-radius:8px; padding:14px;
           font-size:13px; line-height:1.6; color:#BDC1B8; }
  code { background:#0E1013; padding:2px 6px; border-radius:4px; font-size:12.5px; }
</style>
</head>
<body>
  <div class="caja">
    <div class="marca">Radar <span>Balcarce</span></div>
    <div class="sub">Panel de redacción</div>
    ${sinUsuarios ? `<div class="aviso">
      <strong>Todavía no hay nadie cargado.</strong><br><br>
      En la PC donde corre el panel, abrí una consola en la carpeta del proyecto y creá las cuentas:<br><br>
      <code>node panel/clave.mjs andres "una-clave-larga"</code><br>
      <code>node panel/clave.mjs hernan "otra-clave-larga"</code>
    </div>` : `
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/login">
      <label for="usuario">Usuario</label>
      <input id="usuario" name="usuario" autocomplete="username" autofocus required>
      <label for="clave">Contraseña</label>
      <input id="clave" name="clave" type="password" autocomplete="current-password" required>
      <button type="submit">Entrar</button>
    </form>`}
  </div>
</body>
</html>`;
}
