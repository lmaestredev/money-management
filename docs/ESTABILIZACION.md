# Plan de estabilización — Money Management

Resultado de una auditoría de código por áreas (DB, movimientos/períodos, tarjetas/cuotas, recurrentes/cuentas/cotizaciones, dashboard/IA/auth).
Los hallazgos fueron verificados leyendo el código; **nadie ejecutó la app ni la base**. Por eso cada ticket empieza con "reproducir/verificar" antes de corregir.

Regla de negocio que NUNCA se debe romper:
> Un cargo con tarjeta cuenta como gasto del mes en que se hace. El pago del resumen NO cuenta como gasto (evita doble conteo).

Leyenda: 🟢 fácil · 🟡 media · 🔴 difícil · 🛑 requiere decisión de Luis antes de implementar · ⏱ horas estimadas (a ojo).

---

## Orden de ejecución

### Fase 0 — Seguridad y accesos (primero, es barato y crítico)

**E01 — Cerrar endpoints y secretos** 🟢 ⏱2 ✅ 2026-10-01 744e159
- `app/api/movements/route.ts:43-46,82-85`: `if (expectedToken && token !== expectedToken)` deja la API abierta si el secreto está vacío, y `.env.example` los trae vacíos. Fallar cerrado (500/401 si no hay secreto) y comparar con `crypto.timingSafeEqual`.
- `app/seed/route.ts`: GET público que escribe en DB saltando RLS y devuelve `String(error)`. Eliminar la ruta (el seed va como script). *(Reemplazo: `scripts/seed.ts`, `pnpm db:seed`.)*
- `app/api/rates/refresh/route.ts:11-17`: exigir `CRON_SECRET` siempre (fallar cerrado en producción).
- `app/lib/actions/settings.ts:14-22`: `refreshRatesAction` declara `requireUser` pero no lo usa.
- `.env.example`: agregar `BOT_USER_ID`, `CRON_SECRET`, `SKIP_DB_CHECK`; documentar que los secretos son obligatorios.
- Hecho cuando: sin secreto la API responde error; `/seed` no existe; `pnpm build` pasa.

**E02 — Permisos y RLS en base de datos** 🟡 ⏱3 — *nueva migración, no editar las viejas*
- `public.users` (con columna `password`, de `001_initial.sql`) sin RLS: `DROP TABLE IF EXISTS public.users CASCADE`.
- `_migrations` sin RLS; `REVOKE ALL` a `anon`/`authenticated` sobre `_migrations`.
- `017_rls_policies.sql:162-164`: `exchange_rates_insert/update` permiten a cualquier autenticado reescribir la cotización global. Quitarlas (escribe el rol de servicio).
- **Verificar primero en una DB de prueba:** `app/lib/db.ts:67-68` solo setea `request.jwt.claim.sub`; si las policies de `categories` usan `auth.role()` podrían devolver 0 filas (todo "Sin categoría"). Dentro de una transacción con `SET LOCAL ROLE authenticated` correr `SELECT count(*) FROM categories`. Si da 0, fijar `request.jwt.claim.role` en `db.ts` o ajustar la policy.
- Hecho cuando: un usuario autenticado no puede modificar `exchange_rates`; `users` no existe; categorías siguen visibles.

**E03 — Borrar código del curso** 🟢 ⏱1
- `app/lib/placeholder-data.ts` (usuario y password de ejemplo), `app/ui/login-form.tsx`, `app/ui/button.tsx` si no se usan, funciones sin uso de `app/lib/utils.ts` (`generateYAxis`, `generatePagination`, `formatCurrency`, `formatDateToLocal`), tipo `Revenue`, `public/customers/`, referencias en `tsconfig.json`, `app/ui/DesignSystemPreview`. Reescribir `README.md`.
- Antes de borrar cada archivo: `grep` para confirmar que nadie lo importa.

### Fase 1 — Integridad de datos (base para todo lo demás)

**E04 — Helper de fechas (zona Argentina)** 🟡 ⏱3
- Problema: `new Date('YYYY-MM-DD')` es UTC y se lee con `getDate()` local; "hoy" sale en UTC. Una compra de noche cae en otro día/resumen/período.
- Crear `app/lib/dates.ts`: `todayAR()`, `parseISODate()` sin pasar por `Date`, `addDays`, `currentPeriodAR()`.
- Reemplazar en: `data/credit-cards.ts:82-84,263` (`resolveCycle`), `data/movements.ts:166,283`, `actions/financial-periods.ts:63-74,198`, `actions/movements.ts:92,192`, `MovementForm.tsx:13`, `movimientos/nuevo/page.tsx:16-18`, `MovementList.tsx:26-31`, `InstallmentForm.tsx:9-11`, `dashboard/page.tsx:36-41`, `PayStatementForm.tsx:31-36` (vencimiento se ve un día antes: formatear con `timeZone:'UTC'`), `data/recurring.ts:517`.
- Hecho cuando: test unitario de `resolveCycle` con compra 15/10 22:00 ART y cierre día 15; vencimiento 10/10 se muestra "10 oct".

**E05 — Validación de servidor unificada (zod)** 🟢 ⏱3
- Un módulo `app/lib/validation.ts` con `amount = z.coerce.number().finite().min(0)`, `dayOfMonth 1..31`, `isoDate = z.string().date()`, `rate > 0`.
- Reglas: exactamente UNA moneda con importe > 0 en movimientos/recurrentes/cuotas (hoy dos importes suman doble en el resumen USD); `NaN`/negativos rechazados.
- Aplicar en: `actions/movements.ts:122-133`, `actions/installments.ts:25-29,166-167`, `actions/recurring.ts:24-47`, `actions/recurring-incomes.ts:23-40`, `actions/accounts.ts:33,101`, `actions/credit-cards.ts:48`, `app/api/movements/route.ts:14-27` (acotar magnitud y largo de `description`).
- Hecho cuando: un POST con monto negativo, `NaN` o `Infinity` devuelve error claro.

**E06 — Migración de constraints e índices** 🟡 ⏱4 — *nueva migración, `NOT VALID` + `VALIDATE`*
- `CHECK` de importes `>= 0` (movements, installment_purchases, recurring_*, credit_card_statements, credit_limit); `currency IN ('peso','dollar','crypto')`; estados válidos; `closing_day/due_day/pay_before_day BETWEEN 1 AND 31`; `paid_installments BETWEEN 0 AND total_installments`; `total_installments > 0`; `num_nonnulls(account_id, credit_card_id) = 1` en `movements`.
- `UNIQUE INDEX ... ON financial_periods(user_id) WHERE status='open'`.
- Idempotencia: `UNIQUE (recurring_expense_id, financial_period_id)`, y lo mismo para `installment_id` y `recurring_income_id` (parciales, `WHERE ... IS NOT NULL`).
- Antes de cada constraint: query para detectar filas que lo violan y reportarlas a Luis (no borrar datos solos).

**E07 — Nombres únicos por usuario** 🟢 ⏱2
- `accounts.name` y `people.name` son UNIQUE globales (`001_initial.sql:15`, `008_account_owner.sql:6`). Dos cuentas del mismo banco+moneda, o dos usuarios, dan error 500 (`actions/accounts.ts:18-21,53`).
- Migración: `DROP CONSTRAINT` de los globales, `UNIQUE (user_id, name)`; capturar `23505` en las actions y mostrar mensaje.

**E08 — Primer período del usuario y migraciones robustas** 🟡 ⏱3
- Ningún flujo crea el primer período abierto de un usuario nuevo (`data/movements.ts:159-161` lanza "No hay período financiero abierto"; `createNextPeriod` no lo llama nadie). Crear el período si no existe (en `createMovement`/primer uso, con `ON CONFLICT` del índice de E06).
- `014/015/016` hacen `RAISE EXCEPTION` si `auth.users` está vacío → `RAISE NOTICE` + `RETURN`. No editar las migraciones ya aplicadas en producción: crear una nueva que sea segura y solo arreglar las viejas si `scripts/migrate.ts` en DB vacía falla.
- `scripts/migrate.ts:45-48`: ejecutar migración + `INSERT INTO _migrations` en la misma transacción, con `pg_advisory_lock`.
- Hecho cuando: `pnpm db:migrate` corre bien en una DB vacía y un usuario nuevo puede cargar su primer movimiento.

### Fase 2 — Cálculos correctos (lo que más afecta la confianza)

**E09 — Un único "cuenta como gasto"** 🟡 ⏱4 — *el más importante de la fase*
- Hoy hay 3 cálculos distintos y solo dashboard e historial-detalle respetan la regla:
  - `app/dashboard/movimientos/page.tsx:43-69`: cuenta cargos de tarjeta solo con `status===true` (pierde los de estado "—") y SÍ cuenta el pago del resumen → doble conteo.
  - `data/financial-periods.ts:70-111`: SQL suma pendientes (`status=false`) y `balance_dollars` ignora los pesos → un período con sueldo $1.000.000 y gastos $600.000 muestra "Balance u$d 0".
  - `MovementList.tsx:72-84,206-212`: importe principal y total del día usan solo `amount_dollars` → gasto en pesos se ve "−u$d 0,00".
- Crear columna `movements.is_statement_payment BOOLEAN NOT NULL DEFAULT false` (backfill desde `credit_card_statements.paid_movement_id`; `payStatement` la setea).
- Extraer `computeSummary` a `app/lib/` con el predicado `(credit_card_id IS NOT NULL OR status = true) AND NOT is_statement_payment`, usarlo en dashboard, movimientos, historial y en el SQL de períodos.
- Hecho cuando: los tres lugares dan el mismo número para el mismo período; tests unitarios con: cargo tarjeta sin status, pago de resumen, gasto en pesos, ingreso en pesos.

**E10 — Cotización: datos válidos y sin totales engañosos** 🟢 ⏱3
- `data/exchange-rates.ts:80-104`: `Number(null)===0` pasa `isFinite` y pisa la cotización buena con 0. Exigir `> 0`; usar `Promise.allSettled`; `AbortSignal.timeout(3000)`; conservar la última buena.
- Sin cotización (`rate == null`) `toUsd` aporta 0 por los pesos (`dashboard/page.tsx:47-50`, `movimientos/page.tsx:35-38`, `historial/[id]/page.tsx:21-24`): mostrar "—" en los importes USD/presupuestos en vez de cifras subestimadas.
- Mover `refreshExchangeRatesIfStale` fuera del render (`after()` o solo cron).
- `refreshRatesAction`: devolver resultado, toast, pending y límite de 1 por minuto.

**E11 — Tasa de cierre del período** 🟡 ⏱4 🛑
- `historial/[id]/page.tsx:74-86` convierte períodos cerrados con la cotización de hoy; el total de un mes cerrado cambia todos los días.
- Agregar `financial_periods.closing_rate`, guardarla en `closePeriodRecord`, usarla en historial. **Decidir con Luis** qué tasa usar para períodos ya cerrados (backfill).

**E12 — Mostrar ambas monedas donde hoy se oculta una** 🟢 ⏱3
- Ingresos recurrentes solo en pesos figuran `+US$0,00` (`MonthlyIncomesSection.tsx:25-27,59`, `ingresos/page.tsx:37`).
- Tarjeta muestra deuda solo en su moneda principal (`CreditCardItem.tsx:40-46`).
- Cuentas crypto se formatean como USD y se convierten con la tasa del dólar (`DashboardAccountList.tsx:30-33,45`). 🛑 Definir si crypto es "USD equivalente" (2 decimales) o unidades (`DECIMAL(28,8)`; hoy la columna es `DECIMAL(18,2)` y el form ofrece 8 decimales).
- Presupuesto en 0: mostrar "sin presupuesto definido" (`dashboard/page.tsx:171,180`).

### Fase 3 — Flujos que hoy pueden corromper saldos

**E13 — Editar movimiento sin perder datos** 🟡 ⏱3
- `data/movements.ts:306-319`: el UPDATE pone `dollar_rate = NULL`, no guarda `comment` ni `period`, y `EditMovementForm` reescribe la otra moneda en 0. Un alquiler con $1.200.000 + u$d 1.000 queda con pesos=0 y saldo distinto.
- Preservar `dollar_rate`, `comment`; si el movimiento tiene dos importes, mostrar dos campos; derivar `period` de `payment_date` en el servidor e ignorar `?period=` (`movimientos/nuevo/page.tsx:26-29`).

**E14 — Pago de resumen: borrar/editar/anular** 🟡 ⏱4
- `009_credit_cards.sql:38`: `paid_movement_id` sin `ON DELETE`. Borrar el movimiento de pago da error 500; editarlo cambia la cuenta pero no la tarjeta ni el resumen.
- Bloquear edición de movimientos de pago; "Anular pago" = reabrir resumen (`status='open'`, `paid_movement_id=NULL`), devolver deuda a la tarjeta y saldo a la cuenta, en una transacción. `ON DELETE SET NULL`.
- Bloquear editar/borrar cargos que pertenecen a un resumen ya `paid`.

**E15 — Cargos nuevos en un resumen ya pagado** 🟡 ⏱3
- `data/credit-cards.ts:137-142`: `resolveOrCreateStatement` no mira `status`; el cargo suma a un resumen `paid` y queda deuda imposible de pagar (`fetchUnpaidStatements` lo excluye). Además se puede pagar un resumen `open` antes de su cierre (`:401-408`).
- Mandar el cargo al ciclo siguiente o rechazar con error claro; permitir pagar solo si `closing_date <= hoy`.
- `INSERT ... ON CONFLICT (credit_card_id, period) DO UPDATE ... RETURNING id` (carrera con `UNIQUE`, `:137-149`).
- Al editar día de cierre/vencimiento de una tarjeta, recalcular fechas de resúmenes `open` (`:338-351`).

**E16 — Pagar resumen con la cuenta correcta** 🟢 ⏱2
- `credit-cards.ts:432-446` debita pesos y dólares de la misma cuenta sin validar moneda → saldo negativo oculto. Filtrar el selector por moneda y validar; si el resumen tiene ambas monedas, una cuenta por moneda.
- Deshabilitar el botón mientras envía (`useFormStatus`); tratar `already_paid` como aviso informativo.

**E17 — Gasto fijo con tarjeta** 🟢 ⏱1
- `MonthlyFixedExpensesSection.tsx:54,67,82-110`: `hasPresetAccount = !!account_id` → un gasto con tarjeta se ve "Sin cuenta" y al pagar con una cuenta se descuenta de ella en vez de sumarse a la tarjeta. Usar `!!account_id || !!credit_card_id` y mostrar el nombre de la tarjeta.

**E18 — Moneda de cuenta vs importe en pagos recurrentes** 🟡 ⏱3
- `data/recurring.ts:183,226-232` y `data/recurring-incomes.ts:170,195-200` no validan moneda de la cuenta (el flujo de movimientos sí: `resolveSourceCurrency`). Reutilizar esa lógica y filtrar selectores.

**E19 — Cobro de ingreso: respetar el resultado** 🟢 ⏱1
- `actions/recurring-incomes.ts:151-155` descarta `already_received|inactive|no_account|not_found` y siempre muestra "Ingreso registrado". Mapear como `payRecurringExpenseAction` (`:186-194`) y reutilizar `PayRecurringButton` (`useFormStatus`).

**E20 — Conversión de moneda** 🟡 ⏱3 🛑
- `actions/movements.ts:104-121`, `MovementForm.tsx:95,129-141`, `data/movements.ts:133-134`: "conversión" tiene un solo monto, `exchange_rate` no se carga, y genera o destruye saldo en una sola cuenta.
- Opción A: pedir monto pesos + monto dólares + tasa, validar ambos > 0. Opción B: ocultar el tipo hasta implementarlo. **Decidir con Luis.**

**E21 — Períodos cerrados de solo lectura en servidor** 🟢 ⏱2
- `movimientos/editar/[id]/page.tsx:26` solo oculta botones; `updateMovement`/`deleteMovement`/`fetchMovementById` no chequean `financial_periods.status`. Rechazar si `closed`.

**E22 — Cierre de período atómico** 🔴 ⏱5
- `actions/financial-periods.ts:108-199`: cada pago/cobro va en su propia transacción; si falla `closePeriodRecord` quedan pagos aplicados. Doble clic = dos cierres. `end_date` nuevo = `start_date` del siguiente.
- Una sola transacción con `SELECT ... FOR UPDATE` sobre el período `open`; `start = end + 1 día`.
- La vista previa debe listar los movimientos `status=false` y resúmenes impagos; 🛑 decidir con Luis si arrastran al período nuevo.
- Modal (`ClosePeriodButton.tsx:41-96`): manejar error del preview, bloquear cerrar durante `isClosing`, Escape y foco.

**E23 — Cuentas: no pisar saldo** 🟡 ⏱3
- `data/accounts.ts:105-126`: el form guarda saldo absoluto; un movimiento hecho mientras está abierto se pierde; cambiar moneda pone en 0 la otra.
- Editar solo banco/dueño; cambios de saldo vía movimiento de ajuste; bloquear cambio de moneda si hay movimientos.
- `deleteAccount` (`:142-144`): falta `UPDATE recurring_incomes SET account_id = NULL` → hoy falla con "Intenta de nuevo" sin explicación.

**E24 — Cuotas** 🟡 ⏱3
- Editar cuotas conserva `total_amount_*` viejo (`actions/installments.ts:166-167`): recalcular `monthly × total`.
- Redondeo: 100 en 3 cuotas → 33,33×3; poner el resto en la última (`:86-87`, `data/installments.ts:258-259`).
- Contador tras borrar un pago (`movements.ts:371-378`): derivar el número de cuota de los movimientos reales, no de `paid+1`.

**E25 — API de Telegram** 🟢 ⏱2
- `app/api/movements/route.ts`: `status` default `true` en egresos, montos no negativos, idempotencia (clave única para evitar duplicar en reintentos), `revalidatePath`.

### Fase 4 — Experiencia de uso

**E26 — Errores visibles y formularios que no pierden lo escrito** 🟡 ⏱4
- Movimientos, gastos fijos, ingresos y cuentas redirigen con `?error=` que casi ninguna página lee, y recargan el formulario vacío. Migrar a `useActionState` (como `SettingsForm`) con errores por campo y valores preservados.

**E27 — `error.tsx`, `not-found.tsx`, `loading.tsx`** 🟢 ⏱2
- No existe ninguno. Agregar `app/error.tsx`, `app/not-found.tsx`, `app/dashboard/error.tsx`, `app/dashboard/loading.tsx` (skeleton) y `Suspense` por card del dashboard.

**E28 — `revalidatePath` común** 🟢 ⏱1
- Helper `revalidateFinance()` con `/dashboard`, `/movimientos`, `/cuentas`, `/tarjetas`, `/cuotas`, `/gastos-fijos`, `/ingresos`, `/historial`; usarlo en todas las actions (hoy cada una revalida un subconjunto).

**E29 — Lectura de tickets con IA** 🟡 ⏱6
- `actions/ai.ts:16,39`: tope 8 MB pero la API de Anthropic tiene un tope menor (verificar en la documentación vigente antes de fijar el número); comprimir en cliente.
- Modelo demasiado caro para leer tickets (`ai/extract-expense.ts:116`): probar uno más chico.
- Sin rate limit por usuario (ej. 20/hora, contador en Postgres).
- Validar salida: `amount > 0`, `date` con regex; usar `currency_guess` en `MovementForm.tsx:53` (hoy un ticket en u$s se carga como pesos).
- Magic bytes en lugar de `file.type`; mapear `Anthropic.APIError` por status; escapar/limitar `context` (`extract-expense.ts:94,112`) y tratar el texto del ticket como datos.

**E30 — Configuración y auth** 🟢 ⏱2
- `actions/settings.ts:24-80`: tasa manual activada con valor vacío se guarda igual; presupuestos inválidos pasan a 0; `budget_variable_usd ≤ budget_total_usd`; el input se desmonta y se pierde el valor (`SettingsForm.tsx:107-123`).
- `ResetPasswordForm.tsx:24`: `signOut({scope:'local'})`; mínimo de contraseña 10 (`:75`), también en Supabase Auth.
- Login: traducir el error crudo (`LoginForm.tsx:42`).

**E31 — Accesibilidad y botones muertos** 🟢 ⏱2
- `DashboardShell.tsx:43`: `aria-hidden` en el `aside` deja el menú fuera del árbol de accesibilidad en desktop.
- `MovementList.tsx:134-139`: botones "Exportar"/"Columnas" sin función → quitar o implementar.
- La lista de tarjeta muestra "🏦 —" en vez del nombre de la tarjeta (`MovementList.tsx:185-200`).

### Fase 5 — Optimización y calidad

**E32 — Rendimiento del dashboard** 🟡 ⏱4
- `db.ts:45,66-69`: con `max:1` las ~10 lecturas del `Promise.all` se ejecutan en serie, cada una con BEGIN/set_config/SET ROLE/COMMIT → agruparlas en UNA transacción; `set_config` en una sola sentencia.
- `getSettings` y `fetchExchangeRates` se ejecutan dos veces (`dashboard/page.tsx:125,149-152`).
- `getUser()` 3 veces por request (`proxy.ts:28`, `dashboard/layout.tsx:26`, `dashboard/page.tsx:119`) → `getClaims()`.
- `fetchStatementPaymentIds` (`credit-cards.ts:265-272`) trae todo el historial; con E09 se reemplaza por la columna `is_statement_payment`.
- `NOT IN` → `NOT EXISTS`; paginar historial (`data/financial-periods.ts:64-97`); cachear categorías.

**E33 — Calidad: lint, tipos y tests** 🟡 ⏱6
- `package.json`: `next` y `react` en `"latest"` → fijar versión; agregar ESLint y script `lint`; `typecheck: tsc --noEmit`; Vitest.
- Tests mínimos (los cálculos son lo que más duele si fallan): `computeSummary`, `resolveCycle`, helper de fechas, redondeo de cuotas, conversión con/sin tasa.
- Dejar `pnpm lint && pnpm typecheck && pnpm test` como criterio de cierre de cada ticket.

**E34 — Backlog** 🟡 ⏱6
- Desactivar gasto fijo en lugar de borrarlo (al borrar y recrear se puede pagar dos veces el período; `recurring.ts:147-158`).
- Validar pertenencia de `account_id` override (`actions/recurring.ts:149-176`).
- `credit_card_statements.user_id` + policy simple; `ON DELETE CASCADE` hacia `auth.users` (`014-017`).
- 🛑 **Pago parcial de resumen** (hoy solo total): necesita diseño de modelo (`paid_pesos/paid_dollars`, remanente al siguiente resumen). No implementar sin acordar.

---

# Prompt para Claude Code

Copiar desde acá. Se usa una vez por ticket: reemplazar `E01` por el ticket a ejecutar.

```
Sos un ingeniero senior trabajando en el repo "money-management" (Next.js App Router, TypeScript, Postgres/Supabase con RLS multi-tenant, pnpm). Estamos en un período de ESTABILIZACIÓN: no se agregan features, se corrigen bugs, integridad de datos, cálculos y calidad.

TU TAREA: ejecutar SOLO el ticket E01 de docs/ESTABILIZACION.md.

PASOS (en este orden, sin saltear):
1. Leé docs/ESTABILIZACION.md: la regla de negocio, la Fase del ticket y el ticket completo.
2. Leé los archivos que el ticket cita. Los números de línea pueden haberse movido: buscá por contenido.
3. VERIFICÁ el problema antes de tocar nada. Explicame en 3-5 líneas qué confirmaste en el código. Si el hallazgo NO se reproduce o ya fue arreglado, decímelo y parate: no lo "arregles" igual.
4. Proponé el cambio en una lista corta (archivos + qué cambia) y esperá mi OK si el ticket tiene 🛑 o toca una migración.
5. Implementá el cambio mínimo que resuelve el ticket. Nada de refactors ni mejoras fuera de alcance; si ves otro problema, anotalo al final en "Hallazgos nuevos" sin corregirlo.
6. Corré: pnpm lint (si ya existe), pnpm exec tsc --noEmit, pnpm build y los tests que existan. Corregí lo que rompas.
7. Probá a mano en `pnpm dev` el caso feliz y un caso de error del ticket. Si no podés probarlo (por ejemplo necesita DB), decilo explícitamente.
8. Marcá el ticket como hecho en docs/ESTABILIZACION.md (agregá "✅ <fecha> <hash>" junto al título).
9. Hacé un commit por ticket con formato convencional: fix(scope): descripción en imperativo. No mezcles tickets en un commit.

REGLAS DURAS:
- Regla de negocio: un cargo con tarjeta cuenta como gasto del mes en que se hace; el pago del resumen NO cuenta como gasto. Nunca la rompas.
- Migraciones: SIEMPRE una migración NUEVA numerada en db/migrations/ (siguiente número libre). NUNCA edites una migración ya existente. Usá CHECK ... NOT VALID + VALIDATE, y antes de agregar un constraint escribí la query que detecta filas que lo violan y mostrámela; no borres ni modifiques datos existentes por tu cuenta.
- NUNCA corras migraciones ni scripts contra la base de producción. Solo contra una base local o de prueba. Si no tenés una, frená y pedila.
- Toda tabla nueva lleva RLS por usuario. Toda escritura multi-paso va en una sola transacción.
- Montos: validá en el servidor con zod (finitos, >= 0). Nunca confíes en la validación del cliente.
- No subas ni imprimas .env, claves ni secretos.
- Fechas: usá el helper de app/lib/dates.ts (Argentina) cuando exista (ticket E04); no uses new Date('YYYY-MM-DD') ni toISOString().slice(0,10) para "hoy".
- Si el ticket tiene 🛑, o dudás entre dos diseños, PARÁ y preguntame con las opciones y tu recomendación. No decidas solo.
- Si un fix requiere tocar más de ~8 archivos o el ticket se vuelve más grande de lo estimado, parate y proponé partirlo.

ENTREGA FINAL (formato fijo):
- Resumen: qué estaba mal y qué cambiaste (máx. 5 líneas).
- Archivos modificados.
- Cómo lo probaste (comandos y casos) y qué NO pudiste probar.
- Hallazgos nuevos (si hay).
- Riesgos o pasos manuales (por ejemplo, correr una migración).
```

## Orden recomendado y por qué
1. **E01 → E03**: cierran accesos abiertos y limpian ruido. Son baratos.
2. **E04 → E08**: fechas, validación, constraints y primer período. Sin esto, arreglar cálculos es construir sobre arena.
3. **E09 → E12**: cálculos. E09 es el que más cambia lo que ves en pantalla.
4. **E13 → E25**: flujos que hoy pueden dejar saldos inconsistentes. Hacer E14 y E15 juntos.
5. **E26 → E34**: experiencia, rendimiento y calidad.

Tickets con 🛑 (E11, E12 crypto, E20, E22, pago parcial en E34): no dárselos a tu hermano sin decidir antes.
