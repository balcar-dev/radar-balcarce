// Del criterio editorial del repositorio principal el render necesita UN número: cuánto puede durar una historia (Instagram y Facebook rechazan más de 60 s).
// Viene del original (ingesta/criterio.mjs, PODCAST_VOZ.segundosMaximoHistoria) cuando se sincroniza; el pedido trae el mismo número y el render
// se niega a trabajar si no coinciden.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export const PODCAST_VOZ = { segundosMaximoHistoria: 58 };
