-- E07: los nombres de cuentas y personas eran únicos GLOBALES, así que dos usuarios
-- (o dos cuentas del mismo banco y moneda) chocaban con un error 500. Pasan a ser
-- únicos por usuario.
--
-- Detección previa (0 filas): el nuevo constraint es más débil que el actual, así
-- que ninguna fila existente puede violarlo.
--   SELECT user_id, name FROM accounts GROUP BY 1, 2 HAVING count(*) > 1;
--   SELECT user_id, name FROM people   GROUP BY 1, 2 HAVING count(*) > 1;
-- user_id es NOT NULL en ambas tablas. No modifica datos.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_name_key;
ALTER TABLE accounts ADD CONSTRAINT accounts_user_id_name_key UNIQUE (user_id, name);

ALTER TABLE people DROP CONSTRAINT IF EXISTS people_name_key;
ALTER TABLE people ADD CONSTRAINT people_user_id_name_key UNIQUE (user_id, name);
