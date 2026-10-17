// En el repositorio de render no hay reparto de voces ni indicaciones: eso lo decide el repositorio principal. reels/reel.mjs importa estas dos funciones
// para su camino «normal»; el render le pasa su propia voz y nunca las usa para nada.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export const componerIndicacion = () => null;
export const vozDePieza = () => 'render';
