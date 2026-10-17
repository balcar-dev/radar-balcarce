// La entrada del Worker de tareas. El orden importa: `arranque.mjs` tiene que evaluarse ANTES que cualquier programa del proyecto (que lee los criterios al
// cargarse), y en JavaScript los módulos se evalúan en el orden de sus `import`.
import './arranque.mjs';
import worker from './worker.mjs';

export default worker;
