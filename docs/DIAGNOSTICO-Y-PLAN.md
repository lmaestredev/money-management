# Diagnóstico y plan: Money Management

## 1. Diagnóstico actual del proyecto

El proyecto es el **starter del Next.js App Router Course** (dashboard de ejemplo con facturas y clientes). Está en **Next.js (App Router)** con **TypeScript**, **Tailwind**, **Postgres** y **next-auth**.

### 1.1 Estructura actual

```
money-management/
├── app/
│   ├── layout.tsx              # Layout raíz (fuentes, global.css)
│   ├── page.tsx                # Página de inicio (landing Acme + link a /login)
│   ├── lib/
│   │   ├── data.ts             # Acceso a DB: revenue, invoices, customers
│   │   ├── definitions.ts      # Tipos: User, Customer, Invoice, Revenue, etc.
│   │   ├── placeholder-data.ts # Datos mock para seed (users, customers, invoices, revenue)
│   │   └── utils.ts            # formatCurrency, formatDateToLocal, generateYAxis, generatePagination
│   ├── query/route.ts          # API route (código comentado, placeholder)
│   ├── seed/route.ts           # API route para seed de DB (users, customers, invoices, revenue)
│   └── ui/
│       ├── acme-logo.tsx       # Logo Acme
│       ├── button.tsx          # Componente botón
│       ├── fonts.ts            # Inter, Lusitana
│       ├── global.css          # Estilos globales
│       ├── home.module.css     # Estilos landing
│       ├── login-form.tsx      # Formulario login (sin lógica real)
│       ├── search.tsx          # Input búsqueda
│       ├── skeletons.tsx       # Skeletons de carga
│       ├── customers/          # Tabla de clientes
│       │   └── table.tsx
│       ├── dashboard/          # Componentes del dashboard del curso
│       │   ├── cards.tsx
│       │   ├── latest-invoices.tsx
│       │   ├── nav-links.tsx
│       │   ├── revenue-chart.tsx
│       │   └── sidenav.tsx
│       └── invoices/           # CRUD facturas
│           ├── breadcrumbs.tsx
│           ├── buttons.tsx
│           ├── create-form.tsx
│           ├── edit-form.tsx
│           ├── pagination.tsx
│           ├── status.tsx
│           └── table.tsx
├── public/
│   ├── customers/              # Avatares (6 imágenes)
│   ├── hero-desktop.png
│   ├── hero-mobile.png
│   ├── favicon.ico
│   └── opengraph-image.png
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

### 1.2 Rutas existentes

- **Páginas**: solo `app/page.tsx` (home). No hay rutas `/dashboard`, `/login`, `/invoices` ni `/customers` en el App Router (los componentes existen en `app/ui/` pero no hay `app/dashboard/page.tsx` etc.).
- **API**: `/api/query` (placeholder), `/api/seed` (seed de BD).

### 1.3 Modelo de datos actual (curso)

- **users**: id, name, email, password (para auth).
- **customers**: id, name, email, image_url (clientes de negocio).
- **invoices**: id, customer_id, amount, date, status (pending/paid).
- **revenue**: month, revenue (ingresos mensuales agregados).

Enfoque: facturación B2B (clientes + facturas), no finanzas personales.

### 1.4 Dependencias

- **next**, **react**, **react-dom**, **typescript**
- **tailwindcss**, **@tailwindcss/forms**, **postcss**, **autoprefixer**
- **postgres** (driver SQL)
- **next-auth** (5 beta), **bcrypt**, **zod**
- **@heroicons/react**, **clsx**, **use-debounce**

---

## 2. Qué eliminar

Objetivo: quitar todo lo que es específico del curso y del dominio “facturas/clientes” y dejar una base limpia para “ingresos, egresos y finanzas personales”.

### 2.1 Eliminar por completo (archivos/carpetas)

| Qué | Motivo |
|-----|--------|
| `app/ui/acme-logo.tsx` | Branding del curso |
| `app/ui/home.module.css` | Estilos de la landing del curso |
| `app/ui/customers/` (carpeta) | Dominio “clientes” que no aplica |
| `app/ui/invoices/` (carpeta) | Dominio “facturas” que no aplica |
| `app/ui/dashboard/latest-invoices.tsx` | Vista de facturas recientes |
| `app/ui/dashboard/revenue-chart.tsx` | Gráfico de revenue (lógica distinta a la que quieres) |
| `app/ui/dashboard/nav-links.tsx` | Enlaces a Invoices/Customers (se reemplazará por nav de finanzas) |
| `app/query/route.ts` | Route sin uso, solo placeholder comentado |
| `public/customers/` (carpeta) | Avatares de clientes |
| `public/hero-desktop.png` | Imagen landing del curso |
| `public/hero-mobile.png` | Imagen landing del curso |

### 2.2 Sustituir / reescribir (contenido, no borrar carpeta aún)

| Qué | Acción |
|-----|--------|
| `app/page.tsx` | Dejar de ser landing “Acme” y convertir en entrada a la app de finanzas (o dashboard simple). |
| `app/lib/definitions.ts` | Quitar tipos de Customer, Invoice, Revenue, etc. y definir tipos para ingresos, egresos, categorías (según tu Excel más adelante). |
| `app/lib/data.ts` | Quitar todas las funciones actuales (fetchRevenue, fetchLatestInvoices, fetchCardData, fetchFilteredInvoices, fetchInvoiceById, fetchCustomers, fetchFilteredCustomers). Añadir solo las que necesites para el nuevo dominio. |
| `app/lib/placeholder-data.ts` | Vaciar o reemplazar por datos de ejemplo de movimientos/categorías cuando tengas el modelo. |
| `app/seed/route.ts` | Cambiar schema: eliminar tablas/seed de customers, invoices, revenue; crear tablas y seed para usuarios y movimientos (ingresos/egresos) según el diseño nuevo. |
| `app/ui/dashboard/cards.tsx` | Adaptar a métricas de finanzas personales (total ingresos, egresos, balance, etc.). |
| `app/ui/dashboard/sidenav.tsx` | Quitar AcmeLogo; usar nombre/app logo de “Money Management” y enlaces a Dashboard, Movimientos, Categorías, etc. |
| `app/ui/login-form.tsx` | Mantener componente si quieres login; conectar después con next-auth. |

### 2.3 Mantener sin cambios (por ahora)

| Qué | Motivo |
|-----|--------|
| `app/layout.tsx` | Layout base y fuentes. |
| `app/ui/fonts.ts` | Fuentes reutilizables. |
| `app/ui/global.css` | Base de estilos. |
| `app/ui/button.tsx` | Componente reutilizable. |
| `app/ui/search.tsx` | Útil para listados/filtros. |
| `app/ui/skeletons.tsx` | Útil para estados de carga. |
| `app/lib/utils.ts` | formatCurrency, formatDateToLocal, generatePagination reutilizables; generateYAxis se puede reutilizar para gráficos de finanzas. |
| `next.config.ts`, `tailwind.config.ts`, `tsconfig.json` | Configuración del proyecto. |
| `package.json` | Misma stack; quitar dependencias solo si dejamos de usarlas. |
| `.env.example` | Ajustar solo variables que cambien (p. ej. si cambia auth). |

---

## 3. Arquitectura y buenas prácticas propuestas

Objetivo: proyecto ordenado, fácil de escalar y de entender, sin complejidad innecesaria.

### 3.1 Estructura de carpetas sugerida (después de limpieza)

```
app/
├── (auth)/                    # Grupo de rutas de autenticación (opcional)
│   └── login/
│       └── page.tsx
├── (dashboard)/                # Grupo con layout común (sidebar, etc.)
│   ├── layout.tsx              # Layout con SideNav
│   ├── page.tsx                 # Dashboard principal (resumen)
│   ├── movimientos/             # Listado y detalle de movimientos
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── categorias/              # Si aplica
│       └── page.tsx
├── layout.tsx
├── page.tsx                    # Redirige a dashboard o login
├── lib/
│   ├── db.ts                   # Cliente Postgres (único punto de acceso)
│   ├── definitions.ts         # Tipos (Movement, Category, User, etc.)
│   ├── actions/                # Server Actions (opcional) o data fetching
│   │   └── ...
│   ├── data/                   # Funciones de lectura/escritura por dominio
│   │   ├── movements.ts
│   │   └── categories.ts
│   └── utils.ts
└── ui/
    ├── components/             # Componentes reutilizables (Button, Search, etc.)
    ├── dashboard/              # Componentes del layout dashboard (SideNav, Cards)
    └── movements/              # Componentes de movimientos (formularios, tabla)
```

Principios:

- **Separación por dominio**: `data/movements.ts`, `data/categories.ts` en lugar de un solo `data.ts` gigante.
- **Un solo cliente de DB**: `lib/db.ts` que exporta la instancia de Postgres.
- **Tipos en un solo lugar**: `definitions.ts` (o por dominio si crece).
- **Rutas por feature**: `(dashboard)/movimientos`, `(dashboard)/categorias`.

### 3.2 Patrones a seguir

1. **Server Components por defecto**: listados y vistas que lean datos en el servidor.
2. **Server Actions** (o API routes) solo donde haga falta mutación (crear/editar/eliminar movimientos).
3. **Lectura de datos**: funciones en `lib/data/*` que reciban parámetros mínimos (filtros, paginación) y devuelvan datos tipados.
4. **Validación**: Zod en formularios y en Server Actions.
5. **Sin lógica de negocio en la UI**: componentes presentacionales; lógica en `lib/data` o `lib/actions`.

### 3.3 Lo que se evita

- No duplicar conexiones a Postgres (un solo módulo `db`).
- No poner SQL ni tipos dispersos en componentes.
- No crear capas abstractas innecesarias (p. ej. “repositories” genéricos) hasta que el dominio lo pida.
- No mezclar responsabilidades en un mismo archivo (por ejemplo, en un mismo `data.ts` no mezclar movimientos y categorías si crece).

---

## 4. Próximos pasos recomendados

### Fase 1 – Limpieza (antes del Excel)

1. Eliminar los archivos y carpetas listados en “Eliminar por completo”.
2. Actualizar `app/page.tsx` a una página simple de bienvenida o redirección a “dashboard” (aunque el dashboard aún no exista).
3. Dejar de usar `app/lib/definitions.ts` y `app/lib/data.ts` en lo que se elimina (o vaciarlos y dejar solo lo que no rompa el build). Opción: comentar imports y llamadas que dependan de lo borrado para que el proyecto siga compilando.
4. Ajustar `app/ui/dashboard/sidenav.tsx` para que no use AcmeLogo ni rutas a invoices/customers (texto “Money Management” y enlaces placeholder).
5. Eliminar o simplificar `app/seed/route.ts` para que no dependa de `placeholder-data` de customers/invoices (o dejar solo seed de users si lo usas).

Resultado: proyecto que compila, sin branding de curso y sin código de facturas/clientes.

### Fase 2 – Modelo y datos (con tu Excel)

6. Cuando compartas el Excel: definir **modelos** (tablas y tipos) para movimientos (ingresos/egresos), categorías, y lo que uses (cuentas, etc.).
7. Diseñar **esquema SQL** (tablas, índices) y documentarlo.
8. Implementar **tipos** en `lib/definitions.ts` (o por dominio).
9. Implementar **lib/db.ts** y funciones en `lib/data/*` para movimientos (y categorías si aplica).
10. Nuevo **seed** (route o script) que cree tablas y datos de ejemplo alineados con el Excel.

### Fase 3 – Funcionalidad y UI

11. Rutas del dashboard: layout, página principal (resumen con cards), listado de movimientos.
12. Formularios: alta/edición de movimientos (y categorías si aplica).
13. Gráficos o resúmenes si los necesitas (reutilizando idea de `generateYAxis` y componentes de gráfico).
14. Integrar **next-auth** con el login y proteger rutas si quieres usuarios multi-cuenta.

---

## 5. Resumen

- **Diagnóstico**: Proyecto Next.js de curso (facturas/clientes); una sola página; componentes de UI de dashboard/invoices/customers sin rutas propias; Postgres y next-auth ya presentes.
- **Eliminar**: Todo lo de Acme, facturas, clientes, avatares, hero images y la route `query`.
- **Conservar/adaptar**: Layout, fuentes, estilos, `utils`, componentes genéricos (button, search, skeletons), dashboard cards y sidenav (adaptados), login-form y seed (reescritos al nuevo dominio).
- **Arquitectura**: Carpetas por dominio, un solo cliente DB, tipos centralizados, Server Components + Server Actions cuando haga falta, validación con Zod.
- **Siguiente paso inmediato**: Ejecutar la Fase 1 (limpieza) y luego, con tu Excel, definir modelos y esquema para la Fase 2.

Cuando tengas el Excel con la estructura de gastos/ingresos/egresos, se puede bajar esto a tablas concretas, tipos en TypeScript y nombres de pantallas y flujos.
