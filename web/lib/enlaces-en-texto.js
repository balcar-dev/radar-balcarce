// Los enlaces adentro del cuerpo de una nota.
//
// El cuerpo es texto plano (lo leen el feed, los datos para Google y las
// redes): los enlaces van aparte, como { texto, href }, y la página los pone
// sobre la primera vez que ese texto aparece en el cuerpo. Lo usan las notas
// propias (lib/notas-propias.js): la del repaso enlaza cada nota que se contó
// y la del dólar, la página /dolar.
//
// Sin imports ni JSX: se prueba con node --test.

/**
 * Los párrafos del cuerpo partidos en pedazos: [[{ texto, href?, externo? }]].
 * Cada enlace se usa una sola vez, en el primer párrafo que tiene su texto.
 */
export function parrafosConEnlaces(cuerpo = '', enlaces = []) {
  const parrafos = String(cuerpo ?? '').split('\n').map((p) => p.trim()).filter(Boolean);
  const pendientes = (enlaces ?? []).filter((e) => e?.texto && e?.href);
  return parrafos.map((p) => {
    let pedazos = [{ texto: p }];
    for (let i = 0; i < pendientes.length; i += 1) {
      const e = pendientes[i];
      const j = pedazos.findIndex((x) => !x.href && x.texto.includes(e.texto));
      if (j < 0) continue;
      const { texto } = pedazos[j];
      const k = texto.indexOf(e.texto);
      pedazos = [
        ...pedazos.slice(0, j),
        ...(k > 0 ? [{ texto: texto.slice(0, k) }] : []),
        { texto: e.texto, href: e.href, ...(e.externo ? { externo: true } : {}) },
        ...(k + e.texto.length < texto.length ? [{ texto: texto.slice(k + e.texto.length) }] : []),
        ...pedazos.slice(j + 1),
      ];
      pendientes.splice(i, 1);
      i -= 1;
    }
    return pedazos;
  });
}
