# Diseño: manejar las finanzas personales como una empresa

> **Estado: PROPUESTA, sin aprobar.** No hay código ni migraciones de esto. Este documento
> sirve para decidir el alcance antes de construir. Las decisiones abiertas están en la
> sección 6, cada una con una recomendación.

## 1. Idea

Una persona debería manejarse como una empresa:

1. **Ingresos**: se registran como hoy (puede haber varios y variar mes a mes).
2. **Un "sueldo"**: el monto que la persona se asigna para gastar libremente en el mes.
3. **Gastos obligatorios**: alquiler, servicios, cuotas, etc. Van aparte del sueldo.
4. **Metas de ahorro e inversión**: un porcentaje de los ingresos se deriva a metas
   (ej. 10% fondo de emergencia, 10% inversión a largo plazo).
5. **Un diagnóstico**: un formulario que relevia la situación actual y propone metas.

## 2. Qué existe hoy (y qué se puede reutilizar)

| Necesidad | Hoy |
|---|---|
| Ingresos | Movimientos `income` e ingresos recurrentes (`recurring_incomes`). |
| Gastos obligatorios | Gastos fijos recurrentes y cuotas. Ambos se guardan como movimientos `fixed_payment`; las cuotas llevan `installment_id`. `computeSummary` ya los separa (`fixedExpensesTotal`, `installmentsTotal`). |
| Gastos libres | Movimientos `variable_payment` (`variableTotal`). |
| Presupuestos | Tabla `settings` (clave/valor por usuario): `budget_total_usd` y `budget_variable_usd`. |
| Períodos | `financial_periods`, con cotización congelada al cerrar. |

El presupuesto de variables (`budget_variable_usd`) ya es, en la práctica, el "sueldo". El
dashboard actual no lo muestra: usa solo el presupuesto total.

## 3. Propuesta por fases

Cada fase se entrega y se prueba sola. Ninguna depende de que la siguiente exista.

### Fase 1: sueldo separado de los obligatorios

**Sin migraciones**: reutiliza `settings` y los datos que ya existen.

- En Configuración, `budget_variable_usd` se presenta como **"Sueldo mensual"** (plata
  para gastar), y `budget_total_usd` deja de ser el protagonista.
- Dashboard (`MonthOverview`):
  - "Te quedan" = sueldo − otros gastos del mes.
  - Los obligatorios se muestran aparte: "Obligatorios: pagaste X de Y", donde Y es la suma
    de gastos fijos activos más cuotas activas.
- Los textos pasan a hablar de "sueldo" y "obligatorios".

### Fase 2: metas e inversión (porcentajes)

**Migración nueva (024).** Dos tablas, ambas con RLS por usuario como el resto:

`goals`
- `id`, `user_id`, `name`
- `kind`: `emergency | long_term | short_term | custom` (CHECK)
- `percent` NUMERIC(5,2), CHECK entre 0 y 100
- `target_amount_usd` (opcional, para mostrar el avance)
- `active`, `sort_order`, `created_at`, `updated_at`

`goal_contributions` (libro de aportes)
- `id`, `user_id`, `goal_id`, `financial_period_id`
- `amount_pesos`, `amount_dollars` (mismo criterio que `movements`)
- `created_at`
- Un aporte por meta y por período (índice único), para que sea idempotente.

Reglas:
- La suma de `percent` de las metas activas no puede pasar de 100. Se valida en el
  servidor, dentro de una transacción que bloquea las metas del usuario, porque un CHECK
  no puede mirar otras filas.
- **Un aporte no es un gasto**: no entra en `computeSummary` como gasto ni toca saldos
  de cuentas. Misma lógica que el pago del resumen de tarjeta.
- Pantalla "Metas": lista de metas con su %, cuánto toca aportar este período, cuánto
  se aportó en total y el avance contra el objetivo. Botón "Registrar aporte".
- El cálculo del reparto (incluido el redondeo, que no puede perder ni inventar
  centavos) va en una función pura `app/lib/goals-allocation.ts` con tests.

### Fase 3: diagnóstico financiero

**Migración nueva (025):** tabla `financial_profiles` (`user_id`, `version`, `answers`
JSONB, `created_at`, RLS por usuario). JSONB para poder cambiar las preguntas sin migrar.

- Formulario por pasos: ingresos y su estabilidad, gastos obligatorios estimados, deudas
  (monto y tasa), ahorro actual y a cuántos meses de gastos alcanza, objetivos.
- Salida: **sugerencias** de metas y porcentajes. Nunca se aplican solas: la persona las
  edita y acepta.
- Las sugerencias salen de reglas simples y determinísticas en `app/lib/diagnosis.ts`
  (con tests). Por ejemplo: si el fondo de emergencia cubre menos de 3 meses de gastos,
  se prioriza; si hay deuda cara, se sugiere atacarla antes de invertir.
- Se muestra un aviso de que es orientativo y no reemplaza asesoramiento profesional.

## 4. Impacto en lo existente

- `app/lib/summary.ts`: no cambia la regla de qué cuenta como gasto. La Fase 1 solo
  agrega al dashboard un total esperado de obligatorios.
- Dashboard: cambia "Te quedan" y el bloque de obligatorios. Sumaría un bloque corto de
  metas en la Fase 2.
- Cierre de período: los aportes cuelgan de `financial_period_id`, así que quedan
  congelados con su período, igual que la cotización.
- Historial: debería mostrar los aportes del período cerrado (Fase 2).

## 5. Requisitos previos

- **Levantar la regla de estabilización** de `CLAUDE.md` para este trabajo. Esto son
  features nuevas.
- **Una base local o de prueba** (`docker compose up -d`, puerto 5433) antes de la
  Fase 2. Hoy la única base es producción y ahí no se corren migraciones. La Fase 1 no
  necesita base nueva.
- Un ticket por fase en el tablero de Notion y un commit por ticket.

## 6. Decisiones abiertas

| # | Pregunta | Recomendación |
|---|---|---|
| 1 | El % de cada meta, ¿sobre qué se calcula? | Sobre **lo cobrado en el período**. Es lo que realmente entró; el sueldo es un monto que decide la persona. |
| 2 | Las metas, ¿son sobres virtuales o mueven plata entre cuentas? | **Virtuales** en la v1. Mover plata real requiere transferencias y conciliación; se puede sumar después. |
| 3 | El sueldo, ¿monto fijo o % de lo cobrado? | **Monto fijo** que la persona define (es lo que ya hace `budget_variable_usd`). |
| 4 | ¿Las cuotas cuentan contra el sueldo? | **No**: son obligatorios, van aparte. Es lo que pide la filosofía. |
| 5 | El diagnóstico, ¿una sola vez o se repite? | **Se repite** (ej. cada trimestre) y se guardan las versiones, así se ve la evolución. |
| 6 | ¿Las sugerencias usan IA o reglas fijas? | **Reglas fijas** primero: son predecibles y testeables. La IA puede venir después. |
| 7 | Si los aportes son mayores a lo que queda libre, ¿qué se muestra? | Un aviso, sin bloquear. La persona decide. |

## 7. Orden sugerido

1. Fase 1 (sueldo y obligatorios): la más chica y la que más cambia el uso diario.
2. Base local de prueba.
3. Fase 2 (metas).
4. Fase 3 (diagnóstico), que se apoya en las metas de la Fase 2.

## 8. Riesgos

- **Redondeo** al repartir porcentajes: se resuelve con la función pura y sus tests.
- **Dos monedas**: los aportes siguen el esquema pesos/dólares de `movements`.
- **Confundir aportes con gastos**: se evita con la regla de la sección 3 y un test
  específico en `summary.test.ts`.
- **Alcance**: el diagnóstico es lo más abierto. Conviene cerrar las preguntas y las
  reglas de sugerencia antes de construirlo.
