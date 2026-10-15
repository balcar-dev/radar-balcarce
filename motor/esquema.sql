-- Esquema de la base del motor nuevo (SQLite local; es el mismo que va a D1).
--
-- Sale de docs/etapa-10-operacion/DISENO-MOTOR.md, seccion 2.1. Esta es la
-- primera migracion ("0001"): sólo las tablas que se pueden llenar hoy con lo
-- que hay en web/data/. Las demás (historias, items_crudos, uso_ia, libro_redes,
-- mediciones…) se suman en migraciones siguientes, cuando exista quien las escriba.
--
-- Reglas:
--  * Todo lo que escribe una persona lleva `por`, `cuando` y `motivo` NOT NULL
--    (el defecto que hoy congela la web pasa a ser imposible).
--  * Las fechas son texto ISO UTC (o AAAA-MM-DD cuando el origen sólo trae el día).
--  * No hay claves foráneas hacia `notas` a propósito: una retirada, una corrección
--    o una redirección puede nombrar una nota que ya no está en el archivo.
--  * Las columnas `original`/`datos` guardan el JSON completo de la fila de origen:
--    así nada se pierde mientras el esquema se afina, y la prueba de espejo puede
--    comparar nota por nota.

CREATE TABLE IF NOT EXISTS estado (
  clave        TEXT PRIMARY KEY,
  valor        TEXT,
  actualizado  TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS notas (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL,
  historia_id        TEXT,
  seccion            TEXT NOT NULL,
  lugar              TEXT,
  tipo               TEXT,
  estado             TEXT NOT NULL CHECK (estado IN
                       ('borrador','esperando_cuerpo','espera_persona','publicada','retirada')),
  origen             TEXT NOT NULL CHECK (origen IN ('automatica','persona','propia')),
  escrita_por        TEXT,
  titulo             TEXT NOT NULL,
  bajada             TEXT,
  cuerpo             TEXT,
  guion              TEXT,
  extras             TEXT CHECK (extras IS NULL OR json_valid(extras)),
  fuentes            TEXT CHECK (fuentes IS NULL OR json_valid(fuentes)),
  verificacion_nivel TEXT,
  fecha_publicacion  TEXT NOT NULL,
  fecha_hecho        TEXT,
  visto              TEXT,
  es_de_aca          INTEGER,
  foto_archivo       TEXT,
  foto_credito       TEXT,
  version_actual     INTEGER NOT NULL DEFAULT 1,
  original           TEXT NOT NULL CHECK (json_valid(original))
) STRICT;
CREATE INDEX IF NOT EXISTS notas_estado_fecha  ON notas (estado, fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS notas_seccion_fecha ON notas (seccion, fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS notas_historia      ON notas (historia_id);

-- La dirección canónica de cada nota (fija desde que sale).
CREATE TABLE IF NOT EXISTS direcciones (
  nota_id  TEXT PRIMARY KEY,
  ruta     TEXT NOT NULL UNIQUE,
  creada   TEXT NOT NULL
) STRICT;

-- Todo lo que debe llevar a otro lado (hoy: las notas unidas, web/data/fusionadas.json).
CREATE TABLE IF NOT EXISTS redirecciones (
  desde          TEXT PRIMARY KEY,
  hacia_nota_id  TEXT,
  hacia_ruta     TEXT,
  codigo         INTEGER NOT NULL CHECK (codigo IN (301, 410)),
  motivo         TEXT NOT NULL CHECK (motivo IN
                   ('formato_viejo','repetida_unida','seccion_renombrada','otra_direccion','retirada')),
  creada         TEXT NOT NULL,
  CHECK (hacia_nota_id IS NOT NULL OR hacia_ruta IS NOT NULL OR codigo = 410)
) STRICT;
CREATE INDEX IF NOT EXISTS redirecciones_hacia ON redirecciones (hacia_nota_id);

-- Reemplaza web/data/banco-fotos.json (una fila por nota, tal cual hoy).
CREATE TABLE IF NOT EXISTS fotos (
  nota_id    TEXT PRIMARY KEY,
  origen     TEXT NOT NULL,
  cuando     TEXT NOT NULL,
  archivo    TEXT,
  credito    TEXT,
  medio      TEXT,
  licencia   TEXT,
  enlace     TEXT,
  razon      TEXT,
  intentado  INTEGER,
  borrada    INTEGER,
  intentos   INTEGER,
  por        TEXT,
  datos      TEXT NOT NULL CHECK (json_valid(datos))
) STRICT;

-- Las notas sacadas (web/data/retiradas.json). Siempre con por, cuando y motivo.
CREATE TABLE IF NOT EXISTS retiradas (
  nota_id  TEXT PRIMARY KEY,
  motivo   TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  por      TEXT NOT NULL CHECK (length(trim(por)) > 0),
  cuando   TEXT NOT NULL CHECK (length(trim(cuando)) > 0),
  titulo   TEXT,
  medio    TEXT,
  codigo   INTEGER CHECK (codigo IS NULL OR codigo IN (404, 410))
) STRICT;

-- Lo corregido a mano (web/data/correcciones.json): una fila por nota, con los campos
-- nuevos en `cambio` (JSON: titulo, copete, cuerpo, seccion, guion).
CREATE TABLE IF NOT EXISTS correcciones (
  nota_id  TEXT PRIMARY KEY,
  cambio   TEXT NOT NULL CHECK (json_valid(cambio)),
  de_ia    INTEGER,
  motivo   TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  por      TEXT NOT NULL CHECK (length(trim(por)) > 0),
  cuando   TEXT NOT NULL CHECK (length(trim(cuando)) > 0)
) STRICT;

-- Lo que arregló sola la auditoría (web/data/correcciones-auditoria.json).
CREATE TABLE IF NOT EXISTS correcciones_auditoria (
  nota_id  TEXT PRIMARY KEY,
  titulo   TEXT,
  ruta     TEXT,
  seccion  TEXT,
  cambios  TEXT NOT NULL CHECK (json_valid(cambios)),
  por      TEXT NOT NULL DEFAULT 'auditoria',
  cuando   TEXT NOT NULL CHECK (length(trim(cuando)) > 0)
) STRICT;

-- Lo que decidió una persona desde el celular (web/data/celular-decisiones.json).
CREATE TABLE IF NOT EXISTS decisiones_de_personas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  objetivo_tipo  TEXT NOT NULL CHECK (objetivo_tipo IN ('nota','redes')),
  objetivo_id    TEXT NOT NULL,
  accion         TEXT NOT NULL,
  por            TEXT NOT NULL CHECK (length(trim(por)) > 0),
  cuando         TEXT NOT NULL CHECK (length(trim(cuando)) > 0),
  motivo         TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  datos          TEXT NOT NULL CHECK (json_valid(datos))
) STRICT;
CREATE INDEX IF NOT EXISTS decisiones_objetivo ON decisiones_de_personas (objetivo_tipo, objetivo_id);

-- El orden de la portada de hoy (web/data/portada.json).
CREATE TABLE IF NOT EXISTS portada (
  posicion  INTEGER PRIMARY KEY,
  nota_id   TEXT NOT NULL
) STRICT;

-- Lo que el importador no pudo cargar y por qué (una fila sin por/cuando/motivo,
-- un id repetido…). Nada se pierde en silencio.
CREATE TABLE IF NOT EXISTS importacion_rechazos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  origen  TEXT NOT NULL,
  clave   TEXT,
  razon   TEXT NOT NULL,
  crudo   TEXT
) STRICT;
