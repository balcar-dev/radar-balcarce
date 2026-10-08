// De dónde se sirven las fotos de las notas (8/10/2026, etapa 1 del plan de arquitectura: fotos a Cloudflare R2).
//
// Hoy las fotos viven en web/public/fotos-notas/ y se sirven con el sitio ("/fotos-notas/ID.jpg"). Cuando estén en un depósito R2 con
// su propio dominio, alcanza con poner la variable FOTOS_BASE (por ejemplo https://fotos.radarbalcarce.com) al compilar: todas las
// direcciones de foto de las páginas salen de acá. Sin la variable, todo sigue igual que siempre.
// Sólo se lee al compilar (los componentes que la usan son del servidor).

/** La base de las fotos, sin barra al final; vacía si se sirven desde el propio sitio. */
export function baseDeFotos() {
  return String(process.env.FOTOS_BASE ?? '').trim().replace(/\/+$/, '');
}

/** La dirección de una foto a partir de su `archivo` ("fotos-notas/ID.jpg"). */
export function urlDeFoto(archivo) {
  return `${baseDeFotos()}/${String(archivo ?? '').replace(/^\/+/, '')}`;
}
