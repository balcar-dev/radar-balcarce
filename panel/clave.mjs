// Crear una cuenta del panel o cambiarle la contraseña.
//
//   node panel/clave.mjs andres "una clave larga que te acuerdes"
//   node panel/clave.mjs hernan "otra distinta" "Hernán"
//
// El tercer argumento es el nombre que se va a ver en el historial ("lo
// publicó Hernán"). Si no se pone, se usa el usuario.
//
// La contraseña no queda guardada en ningún lado: se guarda un hash. Si se
// pierde, se vuelve a correr esto y listo.
//
// Ojo con la consola: lo que escribís acá queda en el historial de
// comandos. Si te importa, después hacé `Clear-History` en PowerShell.

import { ponerClave, listarUsuarios } from './acceso.mjs';

const [usuario, clave, nombre] = process.argv.slice(2);

if (!usuario || !clave) {
  console.log('\n\x1b[1mCuentas del panel\x1b[0m\n');
  const gente = listarUsuarios();
  if (gente.length) {
    gente.forEach((g) => console.log(`  · ${g.usuario.padEnd(12)} ${g.nombre}`));
  } else {
    console.log('  (todavía no hay ninguna)');
  }
  console.log('\nPara crear una o cambiarle la clave:');
  console.log('  node panel/clave.mjs <usuario> "<contraseña>" ["Nombre para mostrar"]\n');
  process.exit(0);
}

try {
  const u = ponerClave(usuario.trim().toLowerCase(), clave, nombre);
  console.log(`\n\x1b[32mListo\x1b[0m · ${usuario} (${u.nombre}) ya puede entrar al panel.\n`);
} catch (e) {
  console.error(`\n\x1b[31mNo se pudo\x1b[0m · ${e.message}\n`);
  process.exit(1);
}
