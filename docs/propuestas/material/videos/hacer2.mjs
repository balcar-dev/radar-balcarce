// Segunda tanda de ejemplos: clima lindo, farmacia, participá, efeméride y feriado. Solo para mirar.
import fs from 'node:fs';
import path from 'node:path';
import { W, H, C, esc, clamp, easeOut, easeInOut, prog, envolver, pie, subtitulos, renderizar, portada, REPO } from './base.mjs';

const solo = process.argv[2];
const hacer = (n, dur, f) => { if (!solo || n.includes(solo)) renderizar(n, dur, f); };
const encabezado = (t, eti, sub, color = C.rojo) => {
  const a = easeOut(prog(t, 0, 0.5));
  return `<g opacity="${a}"><text x="80" y="220" font-family="Inter" font-weight="700" font-size="32" letter-spacing="4" fill="${color}">${esc(eti)}</text>
  <text x="80" y="275" font-family="Inter" font-weight="500" font-size="36" fill="${C.texto}">${esc(sub)}</text></g>`;
};
const SERIF = 'Source Serif 4 60pt';

// ---------- 4: clima con día lindo (datos inventados) ----------
const diasSol = [['vie', 24, 11, 0], ['sáb', 26, 12, 0], ['dom', 22, 10, 10], ['lun', 19, 9, 40], ['mar', 21, 8, 5]];
hacer('ejemplo-4-clima-dia-lindo', 8, (t, dur) => {
  const temp = Math.round(24 * easeOut(prog(t, 0.2, 1.2)));
  const subir = easeOut(prog(t, 0, 1.4));
  const cx = 820, cy = 520 + (1 - subir) * 260;
  const giro = t * 12;
  const rayos = Array.from({ length: 12 }, (_, i) => {
    const ang = (i * 30 + giro) * Math.PI / 180, r1 = 130, r2 = 175 + 12 * Math.sin(t * 3 + i);
    return `<line x1="${cx + r1 * Math.cos(ang)}" y1="${cy + r1 * Math.sin(ang)}" x2="${cx + r2 * Math.cos(ang)}" y2="${cy + r2 * Math.sin(ang)}" stroke="#E8A33C" stroke-width="14" stroke-linecap="round"/>`;
  }).join('');
  const nube = (x, y, s, op) => `<g transform="translate(${x},${y}) scale(${s})" opacity="${op}"><circle cx="0" cy="0" r="50" fill="#FFFFFF"/><circle cx="55" cy="-20" r="65" fill="#FFFFFF"/><circle cx="120" cy="5" r="45" fill="#FFFFFF"/><rect x="0" y="0" width="120" height="45" fill="#FFFFFF"/></g>`;
  const minT = 6, maxT = 28, yT = (v) => 1330 - ((v - minT) / (maxT - minT)) * 360;
  const cols = diasSol.map(([d, mx, mn, ll], k) => {
    const a = easeOut(prog(t, 1.4 + k * 0.15, 2.2 + k * 0.15));
    const x = 100 + k * 180, y1 = yT(mx), y2 = yT(mn), yc = (y1 + y2) / 2, top = yc - (yc - y1) * a, bot = yc + (y2 - yc) * a;
    return `<g opacity="${clamp(a * 1.5)}"><text x="${x + 40}" y="890" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="${C.tinta}">${d}</text>
      <rect x="${x + 22}" y="${top}" width="36" height="${Math.max(0, bot - top)}" rx="18" fill="#E8A33C"/>
      <text x="${x + 40}" y="${top - 18}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="${C.tinta}">${mx}°</text>
      <text x="${x + 40}" y="${bot + 44}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="30" fill="${C.texto}">${mn}°</text>
      <text x="${x + 40}" y="1450" text-anchor="middle" font-family="Inter" font-weight="600" font-size="28" fill="#2F6E8F">${ll}%</text></g>`;
  }).join('');
  const sub = easeOut(prog(t, 0.9, 1.5));
  return `<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCEFD6"/><stop offset="0.5" stop-color="${C.fondo}"/></linearGradient>
  <rect width="${W}" height="${H}" fill="url(#cielo)"/>
  ${rayos}<circle cx="${cx}" cy="${cy}" r="${110 + 4 * Math.sin(t * 2)}" fill="#F2B544"/>
  ${nube(-200 + t * 40, 420, 0.9, 0.9)}${nube(700 - t * 25, 700, 0.7, 0.8)}
  ${encabezado(t, 'CLIMA EN BALCARCE', 'Viernes 9 de octubre')}
  <text x="${W - 80}" y="220" text-anchor="end" font-family="Inter" font-weight="600" font-size="24" fill="${C.suave}">EJEMPLO · DATOS INVENTADOS</text>
  <text x="60" y="640" font-family="${SERIF}" font-weight="900" font-size="340" fill="${C.tinta}">${temp}°</text>
  <g opacity="${sub}" transform="translate(0,${(1 - sub) * 30})"><text x="80" y="740" font-family="${SERIF}" font-weight="700" font-size="64" fill="${C.tinta}">Despejado</text>
  <text x="80" y="810" font-family="Inter" font-weight="500" font-size="36" fill="${C.texto}">Viento 12 km/h del N · ideal para salir</text></g>
  <text x="80" y="1505" font-family="Inter" font-weight="500" font-size="26" fill="${C.suave}" opacity="${sub}">Probabilidad de lluvia por día</text>
  ${cols}
  ${subtitulos(t, 'Buen día, Balcarce. Hoy sale el sol: veinticuatro grados de máxima y nada de lluvia hasta el lunes.', 0.6)}
  ${pie(t, dur)}`;
});

// ---------- 5: farmacia de turno ----------
const turno = portada.farmacias.proximos.find((d) => d.detalle.length === 2) || portada.farmacias.hoy;
const fHoy = turno.detalle[0];
const siguientes = portada.farmacias.proximos.filter((d) => d.fecha > turno.fecha).slice(0, 2);
hacer('ejemplo-5-farmacia-dos-de-turno', 9, (t, dur) => {
  const e = easeOut(prog(t, 0.2, 0.9));
  const pulso = t > 0.9 ? 1 + 0.05 * Math.sin((t - 0.9) * 4) : 1;
  const cx = W / 2, cy = 520, s = e * pulso * 0.8;
  const cruz = `<g transform="translate(${cx},${cy}) scale(${s}) rotate(${(1 - e) * -90})"><circle r="190" fill="#E7F2EC"/><rect x="-55" y="-150" width="110" height="300" rx="22" fill="${C.verde}"/><rect x="-150" y="-55" width="300" height="110" rx="22" fill="${C.verde}"/></g>`;
  const onda = t > 0.9 ? (() => { const k = ((t - 0.9) % 1.6) / 1.6; return `<circle cx="${cx}" cy="${cy}" r="${152 + 100 * k}" fill="none" stroke="${C.verde}" stroke-width="6" opacity="${0.5 * (1 - k)}"/>`; })() : '';
  const n = turno.detalle.length;
  const aviso = easeOut(prog(t, 0.9, 1.4));
  const fichas = turno.detalle.map((f, k) => {
    const a = easeOut(prog(t, 1.2 + k * 0.5, 1.9 + k * 0.5));
    const y = 830 + k * 300;
    return `<g opacity="${a}" transform="translate(${(1 - a) * (k % 2 ? 80 : -80)},0)">
      <rect x="80" y="${y}" width="${W - 160}" height="250" rx="20" fill="#FFFFFF" stroke="#DCE7E1" stroke-width="3"/>
      <rect x="80" y="${y}" width="14" height="250" rx="7" fill="${C.verde}"/>
      <text x="130" y="${y + 85}" font-family="${SERIF}" font-weight="700" font-size="72" fill="${C.tinta}">${esc(f.nombre)}</text>
      <g transform="translate(150,${y + 150})"><path d="M0 -30 C-17 -30 -28 -17 -28 -2 C-28 17 0 38 0 38 C0 38 28 17 28 -2 C28 -17 17 -30 0 -30 Z" fill="${C.rojo}"/><circle cy="-3" r="10" fill="#FFFFFF"/></g>
      <text x="200" y="${y + 162}" font-family="Inter" font-weight="500" font-size="38" fill="${C.texto}">${esc(f.direccion)}</text>
      ${f.telefono ? `<text x="200" y="${y + 218}" font-family="Inter" font-weight="700" font-size="38" fill="${C.verde}">Tel. ${esc(f.telefono)}</text>` : ''}</g>`;
  }).join('');
  return `<rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${encabezado(t, 'FARMACIAS DE TURNO', 'Domingo 11 de octubre', C.verde)}
  ${onda}${cruz}
  <text x="${W / 2}" y="770" text-anchor="middle" opacity="${aviso}" font-family="Inter" font-weight="700" font-size="40" fill="${C.verde}">Hoy hay ${n === 2 ? 'dos' : n} farmacias de turno</text>
  ${fichas}
  ${subtitulos(t, `Hoy hay dos farmacias de turno en Balcarce: ${turno.detalle.map((f) => f.nombre).join(' y ')}.`, 0.5)}
  ${pie(t, dur)}`;
});

hacer('ejemplo-5b-farmacia-tres-de-turno', 9, (t, dur) => {
  const turno = portada.farmacias.proximos.find((d) => d.detalle.length === 3);
  const e = easeOut(prog(t, 0.2, 0.9));
  const pulso = t > 0.9 ? 1 + 0.05 * Math.sin((t - 0.9) * 4) : 1;
  const cx = W / 2, cy = 470, s = e * pulso * 0.6;
  const cruz = `<g transform="translate(${cx},${cy}) scale(${s}) rotate(${(1 - e) * -90})"><circle r="190" fill="#E7F2EC"/><rect x="-55" y="-150" width="110" height="300" rx="22" fill="${C.verde}"/><rect x="-150" y="-55" width="300" height="110" rx="22" fill="${C.verde}"/></g>`;
  const onda = t > 0.9 ? (() => { const k = ((t - 0.9) % 1.6) / 1.6; return `<circle cx="${cx}" cy="${cy}" r="${114 + 90 * k}" fill="none" stroke="${C.verde}" stroke-width="6" opacity="${0.5 * (1 - k)}"/>`; })() : '';
  const n = turno.detalle.length;
  const aviso = easeOut(prog(t, 0.9, 1.4));
  const fichas = turno.detalle.map((f, k) => {
    const a = easeOut(prog(t, 1.2 + k * 0.5, 1.9 + k * 0.5));
    const y = 710 + k * 270;
    return `<g opacity="${a}" transform="translate(${(1 - a) * (k % 2 ? 80 : -80)},0)">
      <rect x="80" y="${y}" width="${W - 160}" height="240" rx="20" fill="#FFFFFF" stroke="#DCE7E1" stroke-width="3"/>
      <rect x="80" y="${y}" width="14" height="240" rx="7" fill="${C.verde}"/>
      <text x="130" y="${y + 85}" font-family="${SERIF}" font-weight="700" font-size="72" fill="${C.tinta}">${esc(f.nombre)}</text>
      <g transform="translate(150,${y + 150})"><path d="M0 -30 C-17 -30 -28 -17 -28 -2 C-28 17 0 38 0 38 C0 38 28 17 28 -2 C28 -17 17 -30 0 -30 Z" fill="${C.rojo}"/><circle cy="-3" r="10" fill="#FFFFFF"/></g>
      <text x="200" y="${y + 162}" font-family="Inter" font-weight="500" font-size="38" fill="${C.texto}">${esc(f.direccion)}</text>
      ${f.telefono ? `<text x="200" y="${y + 218}" font-family="Inter" font-weight="700" font-size="38" fill="${C.verde}">Tel. ${esc(f.telefono)}</text>` : ''}</g>`;
  }).join('');
  return `<rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${encabezado(t, 'FARMACIAS DE TURNO', 'Sábado 10 de octubre', C.verde)}
  ${onda}${cruz}
  <text x="${W / 2}" y="660" text-anchor="middle" opacity="${aviso}" font-family="Inter" font-weight="700" font-size="40" fill="${C.verde}">Hoy hay tres farmacias de turno</text>
  ${fichas}
  ${subtitulos(t, `Hoy hay tres farmacias de turno en Balcarce: ${turno.detalle.slice(0, 2).map((f) => f.nombre).join(', ')} y ${turno.detalle[2].nombre}.`, 0.5)}
  ${pie(t, dur)}`;
});

// ---------- 6: participá (WhatsApp y mail) ----------
hacer('ejemplo-6-participa', 9, (t, dur) => {
  const titulo = envolver('¿Viste algo que tendría que ser noticia?', 20);
  const tit = titulo.map((l, k) => { const a = easeOut(prog(t, 0.2 + k * 0.2, 0.8 + k * 0.2)); return `<text x="80" y="${430 + k * 96 + (1 - a) * 40}" opacity="${a}" font-family="${SERIF}" font-weight="700" font-size="84" fill="${C.tinta}">${esc(l)}</text>`; }).join('');
  const numero = '2266 51-1612';
  const tipeo = numero.slice(0, Math.floor(clamp((t - 1.3) / 1.0) * numero.length));
  const caja = easeOut(prog(t, 0.9, 1.3));
  const burbuja = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><circle r="46" fill="#FFFFFF"/><path d="M-30 30 L-40 52 L-12 40 Z" fill="#FFFFFF"/><circle cx="-18" r="7" fill="${C.verde}" opacity="${0.4 + 0.6 * (Math.sin(t * 8) > 0 ? 1 : 0)}"/><circle cx="0" r="7" fill="${C.verde}" opacity="${0.4 + 0.6 * (Math.sin(t * 8 - 1) > 0 ? 1 : 0)}"/><circle cx="18" r="7" fill="${C.verde}" opacity="${0.4 + 0.6 * (Math.sin(t * 8 - 2) > 0 ? 1 : 0)}"/></g>`;
  const sobreA = easeOut(prog(t, 3.0, 3.6));
  const tapa = easeInOut(prog(t, 3.6, 4.2));
  const mail = 'redaccion@radarbalcarce.com';
  const ySobre = 1060;
  const sobre = `<g transform="translate(130,${ySobre + 70}) scale(${sobreA})" opacity="${sobreA}"><rect x="-70" y="-48" width="140" height="96" rx="10" fill="#FFFFFF" stroke="${C.tinta}" stroke-width="5"/>
    <path d="M-70 -48 L0 ${-48 + 60 * (1 - 2 * tapa)} L70 -48" fill="none" stroke="${C.tinta}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="-40" y="${-30 - 50 * tapa}" width="80" height="50" rx="4" fill="${C.rojo}" opacity="${tapa}"/></g>`;
  const pasos = ['Mandanos la foto o el dato.', 'Antes de publicar, lo chequeamos.'];
  return `<rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${encabezado(t, 'PARTICIPÁ', 'Radar Balcarce te escucha')}
  ${tit}
  <g opacity="${caja}" transform="translate(0,${(1 - caja) * 40})"><rect x="80" y="${titulo.length * 96 + 380}" width="${W - 160}" height="240" rx="20" fill="${C.verde}"/>
  ${burbuja(W - 190, titulo.length * 96 + 500, caja)}
  <text x="130" y="${titulo.length * 96 + 450}" font-family="Inter" font-weight="700" font-size="30" letter-spacing="3" fill="#FFFFFF" opacity="0.9">ESCRIBINOS POR WHATSAPP</text>
  <text x="130" y="${titulo.length * 96 + 560}" font-family="Inter" font-weight="700" font-size="92" fill="#FFFFFF">${esc(tipeo)}${t > 1.3 && t < 2.6 && Math.floor(t * 4) % 2 ? '|' : ''}</text></g>
  ${sobre}
  <g opacity="${sobreA}"><text x="240" y="${ySobre + 60}" font-family="Inter" font-weight="600" font-size="30" letter-spacing="2" fill="${C.suave}">O POR MAIL</text>
  <text x="240" y="${ySobre + 112}" font-family="Inter" font-weight="700" font-size="44" fill="${C.tinta}">${esc(mail)}</text></g>
  ${pasos.map((p, k) => { const a = easeOut(prog(t, 4.4 + k * 0.4, 5 + k * 0.4)); return `<text x="80" y="${1330 + k * 60}" opacity="${a}" font-family="Inter" font-weight="${k ? 500 : 700}" font-size="40" fill="${k ? C.texto : C.tinta}">${esc(p)}</text>`; }).join('')}
  ${subtitulos(t, '¿Viste algo que tendría que ser noticia? Escribinos por WhatsApp o mandanos un mail. Antes de publicar, lo chequeamos.', 0.4)}
  ${pie(t, dur)}`;
});

// ---------- 7: efeméride ----------
const efem = JSON.parse(fs.readFileSync(path.join(REPO, 'web/data/efemerides-piezas.json'), 'utf8'));
const dE = (efem.dias || efem)['2026-10-11'];
hacer('ejemplo-7-efemeride', 10, (t, dur) => {
  const anio = dE.principal.anio;
  const k = easeInOut(prog(t, 0.4, 1.8));
  const mostrado = Math.round(2026 - (2026 - anio) * k);
  const hoja = easeOut(prog(t, 0, 0.6));
  const linea = easeOut(prog(t, 1.8, 2.6));
  const tit = envolver(dE.principal.titulo, 18).map((l, i) => { const a = easeOut(prog(t, 1.9 + i * 0.15, 2.5 + i * 0.15)); return `<text x="80" y="${900 + i * 100 + (1 - a) * 40}" opacity="${a}" font-family="${SERIF}" font-weight="700" font-size="92" fill="${C.tinta}">${esc(l)}</text>`; }).join('');
  const nT = envolver(dE.principal.titulo, 18).length;
  const cuerpo = envolver(dE.principal.cuerpo, 40).map((l, i) => `<text x="80" y="${900 + nT * 100 + 10 + i * 52}" opacity="${easeOut(prog(t, 2.6, 3.2))}" font-family="Inter" font-weight="500" font-size="38" fill="${C.texto}">${esc(l)}</text>`).join('');
  const yAd = 1180 + nT * 40;
  const ademas = dE.ademas.slice(0, 3).map((x, i) => {
    const a = easeOut(prog(t, 4.6 + i * 0.5, 5.2 + i * 0.5));
    const txt = envolver(x.texto, 34)[0] + (envolver(x.texto, 34).length > 1 ? '…' : '');
    return `<g opacity="${a}" transform="translate(${(1 - a) * 60},0)"><text x="80" y="${yAd + 70 + i * 62}" font-family="Inter" font-weight="700" font-size="34" fill="${C.rojo}">${x.anio}</text>
      <text x="200" y="${yAd + 70 + i * 62}" font-family="Inter" font-weight="500" font-size="34" fill="${C.texto}">${esc(txt)}</text></g>`;
  }).join('');
  return `<rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${encabezado(t, 'UN DÍA COMO HOY', 'Domingo 11 de octubre')}
  <g opacity="${hoja}"><text x="70" y="700" font-family="${SERIF}" font-weight="900" font-size="300" fill="${C.tinta}" letter-spacing="-6">${mostrado}</text></g>
  <rect x="80" y="760" width="${(W - 160) * linea}" height="6" fill="${C.rojo}"/>
  ${tit}${cuerpo}
  <text x="80" y="${yAd}" font-family="Inter" font-weight="700" font-size="28" letter-spacing="3" fill="${C.suave}" opacity="${easeOut(prog(t, 4.2, 4.7))}">Y ADEMÁS</text>
  ${ademas}
  ${subtitulos(t, dE.guion.split('. Y además')[0] + '.', 0.4, 0.3)}
  ${pie(t, dur)}`;
});

// ---------- 8: feriado (el guion real del 12/10) ----------
const fer = JSON.parse(fs.readFileSync(path.join(REPO, 'web/data/feriados-piezas.json'), 'utf8')).feriados[0];
hacer('ejemplo-8-feriado', 10, (t, dur) => {
  const caida = easeOut(prog(t, 0, 0.7)), giro = easeInOut(prog(t, 0.7, 1.3));
  const cal = `<g transform="translate(${W / 2},${560 - (1 - caida) * 300}) scale(0.85)" opacity="${caida}">
    <rect x="-170" y="-200" width="340" height="370" rx="24" fill="#FFFFFF" stroke="${C.tinta}" stroke-width="6"/>
    <rect x="-170" y="-200" width="340" height="96" rx="24" fill="${C.rojo}"/><rect x="-170" y="-130" width="340" height="26" fill="${C.rojo}"/>
    <text y="-135" text-anchor="middle" font-family="Inter" font-weight="700" font-size="40" letter-spacing="4" fill="#FFFFFF">OCTUBRE</text>
    <g transform="scale(1,${Math.abs(Math.cos(giro * Math.PI))})"><text y="95" text-anchor="middle" font-family="${SERIF}" font-weight="900" font-size="200" fill="${C.tinta}">${giro < 0.5 ? 11 : 12}</text></g>
    <text y="150" text-anchor="middle" font-family="Inter" font-weight="600" font-size="30" fill="${C.texto}">lunes</text></g>`;
  const nombre = envolver(fer.nombre, 20).map((l, i) => { const a = easeOut(prog(t, 1.4 + i * 0.15, 2.0 + i * 0.15)); return `<text x="${W / 2}" y="${860 + i * 88 + (1 - a) * 30}" opacity="${a}" text-anchor="middle" font-family="${SERIF}" font-weight="700" font-size="76" fill="${C.tinta}">${esc(l)}</text>`; }).join('');
  // el mar y la carabela: entran a los 3 s y cruzan despacio
  const mar = easeOut(prog(t, 2.8, 3.6));
  const yMar = 1430;
  const ola = (fase, y, color, op) => { let d = `M0 ${y}`; for (let x = 0; x <= W; x += 30) d += ` L${x} ${y + 14 * Math.sin(x / 70 + t * 2 + fase)}`; return `<path d="${d} L${W} ${1545} L0 ${1545} Z" fill="${color}" opacity="${op * mar}"/>`; };
  const bx = -220 + (W + 260) * clamp((t - 3.0) / (dur - 3.0)), by = yMar - 10 + 8 * Math.sin(t * 2);
  const barco = `<g transform="translate(${bx},${by}) scale(0.6) rotate(${3 * Math.sin(t * 2)})" opacity="${mar}">
    <path d="M-90 0 L90 0 L65 40 L-65 40 Z" fill="#7A4E2D"/>
    <rect x="-4" y="-150" width="8" height="150" fill="#5B3A22"/><rect x="-60" y="-110" width="8" height="110" fill="#5B3A22"/>
    <path d="M6 -140 Q60 -100 6 -40 Z" fill="#FFFFFF" stroke="#C9C2B4" stroke-width="3"/><path d="M-52 -100 Q-10 -70 -52 -30 Z" fill="#FFFFFF" stroke="#C9C2B4" stroke-width="3"/>
    <rect x="-4" y="-170" width="30" height="16" fill="${C.rojo}"/></g>`;
  const anio = easeOut(prog(t, 3.2, 3.8));
  const dato = envolver('Recuerda la llegada a América de la expedición de Cristóbal Colón, el 12 de octubre de 1492.', 34);
  return `<rect width="${W}" height="${H}" fill="${C.fondo}"/>
  ${encabezado(t, 'FERIADO NACIONAL', 'Lunes 12 de octubre')}
  ${cal}${nombre}
  <text x="${W / 2}" y="1150" text-anchor="middle" opacity="${anio}" font-family="${SERIF}" font-weight="900" font-size="150" fill="${C.rojo}">1492</text>
  ${dato.map((l, i) => `<text x="${W / 2}" y="${1215 + i * 48}" text-anchor="middle" opacity="${anio}" font-family="Inter" font-weight="500" font-size="36" fill="${C.texto}">${esc(l)}</text>`).join('')}
  ${barco}${ola(0, yMar + 10, '#9CC3D5', 0.9)}${ola(2, yMar + 40, '#5E97B5', 1)}
  ${subtitulos(t, 'Muy buen día, Balcarce. Hoy, feriado nacional. Recuerda la llegada a América de la expedición de Cristóbal Colón, el 12 de octubre de 1492. Que tengan un buen feriado.', 0.4, 0.3)}
  ${pie(t, dur)}`;
});
