# Money Management

App de finanzas personales multi-usuario: movimientos, cuentas, tarjetas de crédito, cuotas, gastos e ingresos recurrentes, períodos financieros, cotización del dólar y carga de gastos desde una foto de ticket (IA) o desde un bot de Telegram.

**Stack:** Next.js (App Router, Server Actions), React, TypeScript, Tailwind CSS, Postgres en Supabase con RLS por usuario, Supabase Auth, zod y el SDK de Anthropic. Deploy en Vercel.

## Puesta en marcha

1. Instalar dependencias: `pnpm install`.
2. Copiar `.env.example` a `.env` y completar las variables (base de datos, Supabase, secretos del bot y del cron, `ANTHROPIC_API_KEY`).
3. Aplicar el esquema: `pnpm db:migrate`.
4. Cargar las categorías de referencia: `pnpm db:seed`.
5. Levantar la app: `pnpm dev` (ejecuta `db:migrate` y luego `next dev`).

Para una base local hay un `docker-compose.yml` (Postgres con pgvector en el puerto 5433); ver los comentarios de `.env.example`.

> Cuidado: `pnpm dev` y `pnpm db:migrate` operan sobre la base que apunte tu `.env`. No los corras contra producción salvo que lo busques.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Migra y levanta el servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm db:migrate` | Aplica `db/migrations/` en orden |
| `pnpm db:seed` | Inserta las categorías (idempotente) |
| `pnpm exec tsc --noEmit` | Chequeo de tipos |

En CI sin base de datos usar `SKIP_DB_CHECK=1`.

## Estructura

- `app/dashboard/` páginas autenticadas; `app/api/` endpoints del bot de Telegram y del cron de cotizaciones (ambos exigen un secreto Bearer).
- `app/lib/actions/` Server Actions; `app/lib/data/` acceso a datos; `app/lib/db.ts` conexión Postgres.
- `app/ui/` componentes por dominio y design system.
- `db/migrations/` migraciones SQL numeradas; nunca se editan las existentes.
- `docs/` plan de estabilización y estrategia de base de datos; `CLAUDE.md` guía para trabajar con Claude Code.

## Regla de negocio

Un cargo con tarjeta cuenta como gasto del mes en que se hace; el pago del resumen no cuenta como gasto (evita el doble conteo).
