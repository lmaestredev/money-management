# Conceptos base: Next.js + React (App Router)

> Material de apoyo para presentación. Cada sección equivale, más o menos, a una
> diapositiva. Los ejemplos salen del propio proyecto (Money Management).

---

## Slide 1 — Título

**Cómo está construida la app**
Next.js (App Router) + React + Postgres (Supabase), desplegado en Vercel.

Agenda:
1. Dónde corre cada cosa (servidor vs navegador)
2. Server Components
3. Client Components
4. Server Actions
5. `useFormStatus`
6. Capa de datos
7. CSS Modules
8. Todo junto: guardar configuración

---

## Slide 2 — El gran modelo mental: ¿dónde corre cada cosa?

Hay **dos lugares** donde corre el código:

- **Servidor** (Vercel): tiene la lógica y la conexión a la base. El usuario nunca lo ve.
- **Navegador** (cliente): recibe HTML ya armado y la parte interactiva.

Por defecto, en el App Router **todo es Server Component**.

```
Navegador  ──pide la página──▶  Servidor (Next)
                                  ├─ consulta la base (sql)
                                  ├─ arma el HTML
           ◀──manda HTML────────  └─ lo devuelve
```

**Idea clave:** el servidor hace el trabajo pesado y manda el resultado; el
navegador solo "revive" lo interactivo.

---

## Slide 3 — Server Components (lo que viene por defecto)

Un archivo en `app/...` que **no** dice `'use client'` corre en el servidor.

```tsx
// app/dashboard/configuracion/page.tsx
export default async function ConfiguracionPage() {
  const [settings, rates] = await Promise.all([getSettings(), fetchExchangeRates()]);
  return ( ... );
}
```

**Pueden:**
- Ser `async` y `await` la base directo (sin endpoints).
- Usar secretos/credenciales sin exponerlos.

**No pueden:**
- Interactividad del navegador: `onClick`, `useState`, `useEffect`.

---

## Slide 4 — Client Components (`'use client'`)

Cuando se necesita **interactividad** (estado, eventos, animaciones), se marca el
archivo con `'use client'` en la primera línea. Ese componente se manda al
navegador y se "hidrata" ahí.

```tsx
'use client';
const [manualEnabled, setManualEnabled] = useState(settings.manual_rate_enabled);
```

**Regla práctica:** server por defecto; se pasa a client **solo el pedacito** que
necesita interactividad (ej. un botón), no la página entera.

---

## Slide 5 — Server Actions (`'use server'`)

Una función que corre en el **servidor** pero se llama desde un formulario, sin
escribir endpoints (`/api/...`) ni `fetch` a mano.

```ts
// app/lib/actions/settings.ts
'use server';
export async function updateSettingsAction(formData: FormData) {
  await updateSettings({ ... });            // escribe en la base
  redirect('/dashboard/configuracion?saved=1');
}
```

Se enchufa directo al form:

```tsx
<form action={updateSettingsAction}>
```

`FormData` es el objeto estándar con los campos del form: `formData.get('budget_total_usd')`.

---

## Slide 6 — `useFormStatus` (saber si el form se está enviando)

Hook de React que, **dentro de un `<form>`**, dice si ese form se está enviando.

```tsx
const { pending } = useFormStatus(); // true mientras corre el server action
```

- Mientras `pending` es `true` → mostramos el spinner.
- Cuando vuelve a `false` → terminó.

Por eso el botón animado (`SubmitButton`) está **dentro** del `<form>` y es client.
Es más honesto que un `setTimeout` falso: el spinner dura lo que tarda el guardado real.

---

## Slide 7 — Capa de datos (`app/lib/data/...`)

Archivos como `settings.ts`, `exchange-rates.ts`, `movements.ts` son el **acceso a
la base** con el cliente `sql`. Corren **siempre en el servidor**.

```ts
export async function getSettings(): Promise<AppSettings> {
  const rows = await sql`SELECT key, value FROM settings`;
  ...
}
```

Orden del proyecto:
- `data/` → lecturas/escrituras a la base
- `actions/` → server actions (lo que dispara el usuario)
- `ui/` → presentación (componentes)

---

## Slide 8 — CSS Modules

`import styles from './SubmitButton.module.css'` hace que Next **renombre las
clases** para que sean únicas (`.expand` → `.expand_a1b2`). Así el CSS de un
componente **no choca** con el de otro.

```tsx
<button className={styles.expand}>   // no className="expand"
```

Por eso, en un módulo se usan **clases** (scopeadas), no selectores globales como
`body`, `*` o `:root` (esos aplicarían a toda la app).

---

## Slide 9 — Todo junto: tocar "Guardar configuración"

1. El `SubmitButton` (client) hace **submit** del `<form>`.
2. `useFormStatus` marca `pending = true` → aparece el **spinner**.
3. Next manda el `FormData` al servidor y ejecuta `updateSettingsAction`.
4. La action **valida** (zod), **escribe** en la base (`updateSettings`) y hace
   `redirect(?saved=1)`.
5. El servidor manda la página nueva (Server Component) con los datos frescos y el
   banner "Configuración guardada".

```
[Click] → pending=true (spinner) → server action (valida + guarda) → redirect → página nueva
```

---

## Slide 10 — Resumen / glosario rápido

| Concepto | En una frase |
|---|---|
| **Server Component** | Corre en el servidor, arma HTML, habla con la base. Default. |
| **Client Component** | Corre en el navegador, tiene interactividad. `'use client'`. |
| **Server Action** | Función de servidor invocada desde un form. `'use server'`. |
| **`useFormStatus`** | Dice si el form se está enviando (`pending`). |
| **Capa de datos** | `app/lib/data/*`: acceso a la base, solo servidor. |
| **CSS Modules** | Clases con nombre único por componente, sin choques. |

---

## Posibles temas para profundizar (siguiente charla)
- **zod**: por qué se valida en el servidor aunque el form ya valide en el navegador.
- **`revalidatePath`**: cómo Next cachea páginas y cómo se le avisa que los datos
  cambiaron.
- **Renderizado dinámico vs estático** (las `ƒ` y `○` del build).
