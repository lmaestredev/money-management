# Resumen de implementación UI – Dashboard y movimientos

## Design system

- **Variables CSS** (en `app/ui/global.css`):
  - `--color-bg-dark: #161d26` — fondo oscuro (sidebar, hero home).
  - `--color-surface-dark: #232d3d` — superficie oscura (cards en nav, bordes).
  - `--color-surface: #ebebf0` — fondo claro / superficie (body, cards, inputs).
  - `--color-primary: #3ea6ec` — primario (links, botones, iconos, estado activo).
- **Tailwind** (`tailwind.config.ts`): colores `bg-dark`, `surface-dark`, `surface`, `primary` para uso opcional.
- **Uso**: layout del dashboard (sidebar, main), SideNav (logo, enlaces, hover/activo), cards, formulario de movimientos, tabla de movimientos, home.

---

## Páginas creadas

| Ruta | Descripción |
|------|-------------|
| `/` | Home: bienvenida, enlace "Ir al dashboard" a `/dashboard`. |
| `/dashboard` | Resumen del mes actual: cards de saldos por cuenta, total ingresos del periodo, total gastos del periodo. |
| `/dashboard/movimientos` | Listado de movimientos del periodo; selector de periodo (dropdown); enlace "Nuevo movimiento" a `/dashboard/movimientos/nuevo?period=...`. |
| `/dashboard/movimientos/nuevo` | Formulario de alta de movimiento (cuenta, tipo, descripción, montos, fecha, estado). Server Action guarda y redirige a listado. |
| `/dashboard/categorias` | Placeholder: título "Categorías" y texto "Próximamente.". |

---

## Componentes y CSS modules

| Componente | Archivo(s) | Uso |
|------------|------------|-----|
| **Layout dashboard** | `app/dashboard/layout.tsx`, `layout.module.css` | Contenedor flex: sidebar (SideNav) + main. Sidebar con `--color-bg-dark`, main con `--color-surface`. |
| **SideNav** | `app/ui/dashboard/sidenav.tsx`, `sidenav.module.css` | Client component (usePathname para enlace activo). Logo, enlaces Dashboard / Movimientos / Categorías, botón Cerrar sesión. Estilos con variables del design system. |
| **Cards** | `app/ui/dashboard/cards.tsx`, `cards.module.css` | Presentacional: `CardGrid` recibe `CardData[]` (account \| income \| expense). Cards con iconos, títulos y valores (pesos/dólares). |
| **MovementList** | `app/ui/movements/MovementList.tsx`, `MovementList.module.css` | Presentacional: tabla de movimientos (tipo, descripción, cuenta, pesos, dólares, fecha, estado). Recibe `movements` y `accountNames` (Map). |
| **MovementPeriodSelector** | `app/ui/movements/MovementPeriodSelector.tsx` | Client component: `<select>` con últimos 24 meses; al cambiar, `router.replace` a `/dashboard/movimientos?period=YYYY-MM`. |
| **MovementForm** | `app/ui/movements/MovementForm.tsx`, `MovementForm.module.css` | Formulario con `action={createMovementAction}`. Campos: cuenta, tipo, descripción, montos, fecha, estado. Botones Guardar y Cancelar (link al listado). |

---

## Prácticas aplicadas

- **Server components por defecto**: páginas dashboard, movimientos, nuevo, categorías y componentes presentacionales (CardGrid, MovementList, MovementForm) son servidor; solo SideNav y MovementPeriodSelector son client por necesidad (pathname, router).
- **Server Action**: `app/lib/actions/movements.ts` — `createMovementAction(formData)` con validación Zod, llama a `createMovement(..., 'app')` y `redirect()` al listado.
- **Navegación**: `<Link>` para enlaces; `router.replace` en el selector de periodo.
- **Datos**: `fetchAccounts()` y `fetchMovementsByPeriod(period)` desde `lib/data` en las páginas; resultados pasados como props a componentes presentacionales.
- **Estilos**: CSS modules en layout, SideNav, cards, MovementList, MovementForm y páginas (page.module.css); paleta vía variables CSS.
