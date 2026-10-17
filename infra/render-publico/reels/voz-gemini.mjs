// En el repositorio de render no hay voz de Gemini: la voz llega hecha en el pedido (reels/pedido.mjs). Este archivo existe sólo porque reels/reel.mjs
// lo importa para su camino «normal» (el del repositorio principal); el render siempre le pasa su propia `hablar` y nunca llega acá.
// (Lo genera scripts/sincronizar-render-publico.mjs del repositorio principal: no se edita a mano.)
export async function decirGemini() {
  throw new Error('El render no pide voz: la voz viene en el pedido.');
}
