// El recorrido de una nota (8/10/2026, rediseño del panel; maqueta en docs/propuestas/material/panel-nuevo-maqueta.html): de dónde entró,
// por qué esperó, quién la escribió y la aprobó y adónde salió, en orden. Se arma con lo que el panel ya sabe de la nota; lo que no se sabe no se inventa:
// un paso sin dato simplemente no aparece. Funciones puras (pruebas/panel-recorrido.test.mjs).

const hora = (iso, horaEnBalcarce) => (Number.isFinite(Date.parse(iso ?? '')) ? horaEnBalcarce(iso) : '');

/**
 * Los pasos, en orden de tiempo (los que no tienen hora van donde corresponde por su lugar en la historia).
 * `d`: { nota, motivoExplicado, decision: { estado, por, cuando, cambioElTitulo }, borrador: { cuando (ms), pedido, marcas }, escritaPorIA,
 *        facebook: { cuando }, instagram: { cuando }, marcadaParaRedes, medios: [nombre] }
 */
export function pasosDeLaNota(d = {}, { horaEnBalcarce = () => '' } = {}) {
  const pasos = [];
  const n = d.nota ?? {};
  const medios = (d.medios ?? []).filter(Boolean);
  const primero = n.visto ?? n.fecha;
  // La hora de entrada sólo si es cuándo la vimos (`visto`), no la de la fuente; y la de "salió en la web" no se muestra: la fecha de la nota es la de la fuente.
  if (medios.length || primero) {
    pasos.push({
      cuando: Date.parse(primero ?? ''), hora: hora(n.visto, horaEnBalcarce), icono: '→',
      titulo: medios.length > 1 ? `Entró de ${medios.length} medios` : 'Entró de un medio',
      detalle: medios.slice(0, 6).join(', ') + (medios.length > 6 ? ` y ${medios.length - 6} más` : ''),
    });
  }
  if (d.motivoExplicado) pasos.push({ cuando: Date.parse(primero ?? ''), hora: '', icono: '⏳', titulo: 'Esperó a una persona', detalle: d.motivoExplicado });
  if (d.borrador) {
    pasos.push({
      cuando: d.borrador.cuando, hora: hora(new Date(d.borrador.cuando).toISOString(), horaEnBalcarce), icono: '✎', titulo: 'La IA escribió un borrador',
      detalle: [d.borrador.pedido ? `pedido: “${String(d.borrador.pedido).slice(0, 100)}”` : '', d.borrador.marcas ? `el verificador marcó ${d.borrador.marcas} ${d.borrador.marcas === 1 ? 'cosa' : 'cosas'}` : 'el verificador no marcó nada'].filter(Boolean).join(' · '),
    });
  } else if (d.escritaPorIA) {
    pasos.push({ cuando: Date.parse(n.fecha ?? ''), hora: '', icono: '✎', titulo: 'La escribió la IA', detalle: 'el verificador la controló contra las fuentes' });
  }
  const dec = d.decision;
  if (dec?.estado === 'publicada') pasos.push({ cuando: Date.parse(dec.cuando ?? ''), hora: hora(dec.cuando, horaEnBalcarce), icono: '✓', titulo: `${dec.por || 'Una persona'} la aprobó`, detalle: dec.cambioElTitulo ? 'cambió el título' : '' });
  else if (dec?.estado === 'descartada') pasos.push({ cuando: Date.parse(dec.cuando ?? ''), hora: hora(dec.cuando, horaEnBalcarce), icono: '✕', titulo: `${dec.por || 'Una persona'} la descartó`, detalle: '' });
  else if (dec?.estado === 'bloqueada') pasos.push({ cuando: Date.parse(dec.cuando ?? ''), hora: hora(dec.cuando, horaEnBalcarce), icono: '✕', titulo: `${dec.por || 'Una persona'} la retiró de la web`, detalle: '' });
  if (d.salioEnLaWeb && n.fecha) pasos.push({ cuando: Date.parse(n.fecha), hora: '', icono: '▤', titulo: 'Salió en la web', detalle: d.salioSola ? 'sola, sin que nadie la tocara' : '' });
  if (d.facebook?.cuando) pasos.push({ cuando: Date.parse(d.facebook.cuando), hora: hora(d.facebook.cuando, horaEnBalcarce), icono: 'f', titulo: 'Salió en Facebook', detalle: d.instagram ? 'y en Instagram' : '' });
  else if (d.marcadaParaRedes) pasos.push({ cuando: Infinity, hora: '', icono: '→', titulo: 'Está en la cola de las redes', detalle: 'sale en la próxima vuelta que corresponda' });
  return pasos.sort((a, b) => (Number.isFinite(a.cuando) ? a.cuando : Infinity) - (Number.isFinite(b.cuando) ? b.cuando : Infinity) || 0);
}

/** El HTML, plegado ("Su recorrido"). Sin pasos no muestra nada. */
export function htmlDelRecorrido(pasos = [], { esc }) {
  if (!pasos.length) return '';
  return `<details class="que-es recorrido"><summary>Su recorrido</summary><ol class="lista-simple">${pasos.map((p) => `<li><strong>${esc(p.icono)} ${esc(p.titulo)}</strong>${p.hora ? ` <span class="meta">${esc(p.hora)}</span>` : ''}${p.detalle ? `<div class="meta">${esc(p.detalle)}</div>` : ''}</li>`).join('')}</ol></details>`;
}
