// Las dos placas de "Un día como hoy" (1/10/2026): la principal (el año en grande, el título y una bajada)
// y "Además, un día como hoy" (las otras tres). Las usan el plan (reels/plan.mjs) y la vista previa sin voz
// (reels/previa-efemerides.mjs). Un "día de…" sin año lleva el día en grande ("6 oct"), así todas arrancan igual.

import { placaEfemeride, placaLista, COLOR_SECCION } from './placa.mjs';

export const COLOR_UN_DIA_COMO_HOY = COLOR_SECCION['Cultura y agenda'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const fechaLarga = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return { dia: DIAS[new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay()], numero: d, mes: MESES[m - 1] };
};

/** Las dos placas de un día (SVG). `dia` = { principal, ademas } de web/data/efemerides-piezas.json. */
export function placasDelDia(fecha, dia) {
  const f = fechaLarga(fecha);
  const rotulo = `Un día como hoy · ${f.numero} de ${f.mes}`;
  const p = dia.principal;
  const grande = p.anio ? String(p.anio) : `${f.numero} ${MESES_CORTOS[MESES.indexOf(f.mes)]}`;
  const principal = placaEfemeride({ rotulo, grande, titulo: p.titulo, cuerpo: p.cuerpo, color: COLOR_UN_DIA_COMO_HOY });
  const ademas = placaLista({
    rotulo: 'Además, un día como hoy', titulo: `${f.numero} de ${f.mes}`, color: COLOR_UN_DIA_COMO_HOY,
    filas: dia.ademas.map((x) => ({ rotulo: x.anio ? String(x.anio) : 'Hoy', principal: x.texto })),
  });
  return { principal, ademas };
}
