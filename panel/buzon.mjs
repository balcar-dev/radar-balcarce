// El buzón: donde entra lo que manda la gente, no lo que agarramos de un
// feed. Es la diferencia entre un agregador y un medio de verdad — acá
// empieza el contenido propio.
//
// Cuatro tipos, cada uno con su regla de publicación:
//
// - dato: una novedad o un aviso ("hay un pozo en tal calle", "se cortó la
//   luz en tal barrio"). Se verifica como cualquier nota: si se confirma,
//   es noticia; si no, no sale.
// - reclamo: una queja concreta contra alguien identificable (un comercio,
//   una empresa, un funcionario). NUNCA se publica de un solo lado: antes
//   de salir, se le pregunta a la otra parte y se publican las dos
//   versiones juntas. Es la regla más importante de todo este archivo.
// - opinion: una nota de opinión que alguien quiere firmar. Va con nombre
//   y apellido real, nunca anónima, y separada de las noticias.
// - seguimiento: un tema que vale la pena revisar cada tanto ("prometieron
//   asfaltar tal calle en marzo, ¿en qué quedó?"). No es una noticia de
//   una vez: es una ficha que se vuelve a mirar cada N semanas.

export const TIPOS = {
  dato: {
    nombre: 'Dato o novedad',
    que: 'Algo que pasó o está por pasar y nadie más contó todavía.',
    regla: 'Se verifica como cualquier nota. Sale si se confirma con una segunda fuente.',
  },
  reclamo: {
    nombre: 'Reclamo',
    que: 'Una queja concreta contra alguien identificable: un comercio, una empresa, un funcionario.',
    regla: 'NUNCA se publica de un solo lado. Antes de salir, se contacta a la otra parte y se publican las dos versiones juntas. Sin la respuesta del otro lado (o sin al menos un intento documentado de conseguirla), no sale.',
    // Por qué esta regla es más que buen periodismo: publicar una
    // acusación como si fuera un hecho propio del medio, sin atribuirla ni
    // dar la otra versión, es lo que en Argentina puede exponer a calumnias
    // o injurias (Código Penal, arts. 109-113) y habilitar un pedido de
    // rectificación con base constitucional (art. 14, Pacto de San José).
    // Esta regla interna es más exigente que lo que pide la ley — por eso
    // evita el problema en vez de tener que resolverlo después.
    // Ver INVESTIGACION.md, secciones 1 a 3.
  },
  opinion: {
    nombre: 'Nota de opinión',
    que: 'Una columna que alguien quiere firmar con su punto de vista.',
    regla: 'Va siempre con nombre y apellido real, nunca anónima. Se marca como opinión, separada de las noticias, y no se corrige el contenido — se le puede pedir que la acorte o la aclare, pero la opinión es de quien la firma.',
  },
  seguimiento: {
    nombre: 'Seguimiento',
    que: 'Un compromiso o una obra pública que se anunció y que vale la pena revisar con el tiempo.',
    regla: 'No es una noticia de una vez. Se crea una ficha con fecha del anuncio y se revisita cada 4 a 6 semanas preguntando "¿en qué quedó esto?". Se cierra cuando se cumple o cuando se confirma que no se va a cumplir.',
  },
};

export const ESTADOS_SEGUIMIENTO = ['pendiente', 'en curso', 'cumplido', 'incumplido', 'archivado'];
