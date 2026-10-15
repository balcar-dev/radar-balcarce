// Arma datos-camila.json: tres datos de contexto YA VERIFICADOS (a mano y con el verificador) para la nota de Camila Peralta.
import fs from 'node:fs';
import path from 'node:path';

const AQUI = import.meta.dirname;
const id = JSON.parse(fs.readFileSync(path.join(AQUI, 'historias.json'), 'utf8')).historias[1].id;
const datos = {
  [id]: [
    { dato: 'La sala Roxy, donde se presenta la obra en Mar del Plata, tiene 954 butacas y forma parte de un complejo de tres salas con capacidad para 2.587 espectadores en simultáneo.', fuente_url: 'http://miradorvirtual.com.ar/roxy-radio-city-y-melany-con-una-cartelera-imperdible/', fuente_nombre: 'Mirador Virtual' },
    { dato: 'Camila Peralta ganó el Premio ACE 2023/2024 a la mejor actuación femenina en obra para un solo personaje por Suavecita, entregado en diciembre de 2024.', fuente_url: 'https://www.infobae.com/cultura/2024/12/13/premios-ace-20232024-una-celebracion-del-teatro-porteno-lista-completa-de-los-ganadores/', fuente_nombre: 'lista oficial de la Asociación de Cronistas del Espectáculo publicada por Infobae' },
    { dato: 'Suavecita se estrenó en 2023 en Nün Teatro Bar, una sala de no más de ochenta butacas, y por su éxito pasó al Teatro Metropolitan de la calle Corrientes.', fuente_url: 'https://www.rionegro.com.ar/cultura/suavecita-el-unipersonal-protagonizado-por-camila-peralta-llega-al-festival-nevadas-escenicas-de-bariloche/', fuente_nombre: 'Diario Río Negro' },
  ],
};
fs.writeFileSync(path.join(AQUI, 'datos-camila.json'), JSON.stringify(datos, null, 1));
console.log('id de la historia:', id);
