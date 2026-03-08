# Estrategia de base de datos

## Principio

La aplicación **no crea ni altera el esquema** en tiempo de ejecución. El esquema se actualiza **solo** mediante migraciones ejecutadas **antes** de arrancar la app. Si la base no está actualizada, la app **no arranca**.

## Flujo

1. **Actualizar el esquema**: ejecutar `pnpm db:migrate`.
2. **Solo después**, arrancar la app: `pnpm dev` o `pnpm start`.

Tanto `pnpm dev` como `pnpm start` ejecutan `db:migrate` automáticamente antes de iniciar Next.js. Si las migraciones fallan (por ejemplo, credenciales incorrectas o SQL inválido), el proceso termina y la app no se inicia.

## Migraciones

- **Ubicación**: `db/migrations/`
- **Formato**: archivos SQL numerados, por ejemplo `001_initial.sql`, `002_add_campo.sql`.
- **Orden**: se aplican en orden alfabético por nombre de archivo.
- **Registro**: el script de migración guarda en la tabla `_migrations` qué versiones ya se aplicaron; no se vuelve a ejecutar una migración ya aplicada.

## Cómo añadir un cambio de esquema

1. Crear un nuevo archivo en `db/migrations/`, por ejemplo `002_nombre_descriptivo.sql`, con el SQL (CREATE TABLE, ALTER TABLE, etc.).
2. Ejecutar `pnpm db:migrate` (o arrancar con `pnpm dev` / `pnpm start`, que lo ejecutan antes).
3. Si la migración falla, corregir el SQL y volver a ejecutar. La app no debe arrancar hasta que las migraciones terminen bien.

## Seed (datos iniciales)

- La ruta `/api/seed` (o el script `pnpm db:seed` si se añade) **solo inserta datos** (usuarios, cuentas, categorías, movimientos de ejemplo).
- **No** crea tablas ni columnas. Asume que el esquema ya está aplicado vía `pnpm db:migrate`.
- Úsalo después de migrar, cuando quieras datos de prueba.

## Comprobación al arrancar

Al iniciar la app (instrumentation), se comprueba que exista la tabla de control de migraciones. Si no existe o la base no está accesible, la app **termina con código de error** y muestra un mensaje indicando que hay que ejecutar `pnpm db:migrate`. Así se evitan arranques con esquema desactualizado o sin migrar.

## Comprobación al arrancar y en build

Si no defines `SKIP_DB_CHECK=1`, al arrancar (dev/start) y al hacer build se comprueba que exista la tabla `_migrations`. Si falla, el proceso termina con error y no se inicia la app. **Para que el build termine bien hace falta una base de datos con migraciones aplicadas** (ejecutar `pnpm db:migrate` antes de `pnpm build`). En CI sin base de datos, puedes setear `SKIP_DB_CHECK=1` para saltarte la comprobación; aun así, el build puede fallar al pre-renderizar páginas que consultan la BD.

## Resumen de comandos

| Comando           | Descripción                                      |
|------------------|--------------------------------------------------|
| `pnpm db:migrate`| Aplica migraciones pendientes. Obligatorio antes de usar la app. |
| `pnpm dev`       | Ejecuta `db:migrate` y, si termina bien, inicia el servidor de desarrollo. |
| `pnpm start`     | Ejecuta `db:migrate` y, si termina bien, inicia el servidor de producción. |
| GET `/api/seed`  | Inserta datos iniciales (requiere esquema ya migrado). |
