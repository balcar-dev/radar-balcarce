// En un Worker no corre el conversor de SVG a PNG (es un programa nativo de Node). Las placas y los videos se arman en el repositorio público de render.
export class Resvg {
  constructor() { throw new Error('Resvg no está disponible en un Worker: las imágenes se arman en el repositorio de render.'); }
}
