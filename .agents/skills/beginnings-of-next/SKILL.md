---
name: beginnings-of-next
description: Next.js App Router conventions for server vs client components, navigation, server actions, and data flow. Use when writing or refactoring Next.js components, choosing "use client" vs server, calling the backend, consuming external APIs, or separating presentation from logic.
---

# Beginnings of Next

Conventions for structuring Next.js App Router apps: when to use server vs client, how to talk to the server, and how to keep logic separate from presentation.

## When to Apply

- Adding or refactoring React/Next.js components
- Deciding between server and client components
- Implementing navigation (Link, replace, push)
- Calling the backend or external APIs
- Splitting logic and presentational components

---

## 1. Server component by default

**Rule:** If a component does **not** need backend requests and has **no** local state, keep it as a **server component** (no directive). That reduces client-side work and bundle size.

- No `useState`, `useEffect`, or other client-only APIs → server.
- No event handlers that must run in the browser → server.
- Only renders props/data and static or server-fetched content → server.

Default to server; add `"use client"` only when required.

---

## 2. "use client" vs server (no directive)

**Rule:** Evaluate every component:

- **Has state** (e.g. `useState`, form state, client-only data) or **must run in the browser** (event handlers, `useEffect`, browser APIs) → **`"use client"`**.
- **Otherwise** → **server component** (no `"use client"`).

Keep the client boundary as low as possible: put `"use client"` only on the component that needs it, and keep parents/children as server components when they can be.

---

## 3. Link, replace, push

**Rule:** Use Next.js navigation in a consistent way:

- **`<Link href="...">`** – Client-side navigation; use for normal in-app links (adds to history).
- **`router.replace(...)`** – Navigate without adding a new history entry (e.g. after login, replace login page so Back doesn’t return to it).
- **`router.push(...)`** – Navigate and add to history when you explicitly want the user to be able to go back.

Prefer `<Link>` for declarative navigation; use `router.replace` / `router.push` when the navigation is triggered by logic (e.g. after a server action or form submit).

---

## 4. Server actions to talk to the server

**Rule:** When the client needs to tell the server to **do something** (mutations, form submit, trigger backend work), use **Server Actions** (`"use server"`).

- Define async functions in a file or at the top of a module with `"use server"`.
- Call them from client components (e.g. in `onClick`, form `action`).
- Don’t use client-side `fetch` to your own API routes for mutations when a server action can do it; server actions keep the contract and types in one place.

Use server actions for mutations; use server components or dedicated data-fetching for reading.

---

## 5. External APIs from the server: use axios

**Rule:** When the **server** must call external APIs (Server Components, SSR, API routes, server actions), use **axios**.

- Use axios in:
  - Server Components (async components that fetch before render),
  - Route Handlers (e.g. `app/api/...`),
  - Server Actions that need to call third-party APIs.
- Prefer **not** using axios from `"use client"` components for initial data; instead fetch on the server and pass data as props, or use your own API route that uses axios and call it from the client if needed.

This keeps external API calls and secrets on the server and avoids CORS and bundling axios in the client when not needed.

---

## 6. Separate logic from presentation

**Rule:** Logic can live in a **parent** or a **separate component**, and the **child** receives only data (and callbacks if needed) and focuses on rendering (HTML/UI).

- **Parent (or sibling)**: Fetches data, runs logic, holds state, decides what to show.
- **Child (presentational)**: Receives `data` (and optional handlers) as props and renders UI only.

This keeps presentational components easy to test and reuse, and keeps data flow clear: data flows down, events/callbacks flow up.

---

## Quick checklist

- [ ] No state / no client-only APIs → server component (no `"use client"`).
- [ ] State or browser-only behavior → `"use client"` on the component that needs it.
- [ ] In-app links → `<Link>`; replace vs push → `router.replace` / `router.push` as appropriate.
- [ ] Client telling server to do something → Server Actions (`"use server"`).
- [ ] Server calling external APIs → axios in server components, route handlers, or server actions.
- [ ] Logic in parent or separate component; presentational child receives data (and callbacks) via props.
