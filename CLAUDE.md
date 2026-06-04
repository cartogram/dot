# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Distance Over Time** is a full-stack React PWA for tracking Strava fitness activities. Users connect their Strava account, configure activity cards with goals, and can share dashboards with other users via invite codes.

## Commands

```bash
pnpm dev              # Start dev server on port 3000
pnpm build            # Production build
pnpm test             # Run unit tests (jsdom)
pnpm test:watch       # Watch mode
pnpm test:browser     # Browser tests via Playwright (used in CI)
pnpm lint             # ESLint
pnpm check            # Prettier + ESLint --fix

# Database (Prisma)
pnpm db:push          # Push schema changes to DB (no migration file)
pnpm db:generate      # Regenerate Prisma client
pnpm db:studio        # Prisma Studio GUI
pnpm db:reset         # Run scripts/reset-db.ts

# Add shadcn/ui component
npx shadcn@latest add [component-name]
```

## Environment Variables

Required in `.env.local`:

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — min 32 chars; used to encrypt session cookies
- `VITE_STRAVA_CLIENT_ID` — public, exposed to client via `import.meta.env`
- `STRAVA_CLIENT_SECRET` — server-only, accessed via `process.env`

## Architecture

### Stack

- **TanStack Start** (full-stack SSR framework on top of Vite + Nitro)
- **TanStack Router** — file-based routing with type-safe params
- **TanStack Query** — data fetching/caching on the client
- **Prisma 7** with `@prisma/adapter-pg` (pg pool adapter) — PostgreSQL ORM
- **Tailwind CSS 4** + custom CSS variables (in `src/css/`)
- **shadcn/ui** (base: `@base-ui/react`, not Radix) + custom components in `src/components/custom/`

### Styling Conventions

- **Page-level Layouts, Spacing & Grids**: Use Tailwind CSS 4 utility classes (e.g. `flex`, `grid`, `gap-*`, `mb-*`, `space-y-*`, `justify-*`).
- **Component-level Styling**: Use Vanilla CSS co-located with the component (e.g., `button.css`, `card.css`, `charts.css`) following a BEM-like modifier convention. Link variables using CSS custom properties (like `var(--color-primary)`, `var(--card)`) for theme-aware properties. Avoid inline styles or Tailwind utilities inside custom component templates.

### Auth

Authentication is entirely custom (no Supabase auth despite the `supabase/` directory existing for local DB tooling). It uses:

1. **TanStack Start sessions** — encrypted cookie via `useSession()` from `@tanstack/react-start/server`, wrapping it in `useAppSession()` (`src/lib/auth/session.ts`). No session DB table.
2. **scrypt password hashing** — in `src/lib/auth/password.ts`
3. **`AuthProvider`** (`src/lib/auth/AuthContext.tsx`) — client-side context that holds `user` and `stravaDataSource` state, exposes `getStravaAccessToken()` which auto-refreshes via server function when near expiry.
4. **`getCurrentUser`** server fn (`src/lib/server/auth.ts`) — called in `__root.tsx`'s `beforeLoad` to inject user into route context.

Routes check auth in `beforeLoad` and redirect to `/login` if unauthenticated.

### Server Functions

All backend logic uses TanStack Start's `createServerFn` pattern (not API routes). These are co-located under `src/lib/server/` and called directly from components. Each function uses `.inputValidator(ZodSchema)` then `.handler(async ({ data }) => ...)`.

- `src/lib/server/auth.ts` — sign up, sign in, sign out, profile, password reset
- `src/lib/server/strava.ts` — fetch athlete stats and activities (proxies Strava API keeping secret server-side)
- `src/lib/server/oauth.ts` — exchange OAuth code, save/disconnect Strava connection
- `src/lib/server/dashboards.ts` — dashboard CRUD, invite management, member roles
- `src/lib/server/dashboardConfig.ts` — dashboard card CRUD (add/update/delete cards)
- `src/lib/server/getDashboardData.ts` — fetches all Strava activities for all profiles attached to a shared dashboard

### Data Flow: Strava

- The Strava `client_secret` never leaves the server. Token refresh happens in server functions.
- `VITE_STRAVA_CLIENT_ID` is referenced as `import.meta.env.VITE_STRAVA_CLIENT_ID` (available client + server); `STRAVA_CLIENT_SECRET` is `process.env.STRAVA_CLIENT_SECRET` (server only).
- The `AuthContext.getStravaAccessToken()` method refreshes tokens automatically on the client before they expire.
- For shared dashboards, `getDashboardData.ts` refreshes tokens server-side during data fetches.

### Two Dashboard Concepts

1. **Personal dashboard** (`/` route) — `StatsDashboard` component. Uses the authenticated user's own Strava data. Cards are stored in the user's default `Dashboard` record.

2. **Shared dashboards** (`/dashboards`, `/dashboards/$dashboardId`, `/d/$slug`) — multi-user dashboards where each member's Strava activities are fetched and combined. Roles: `owner > editor > viewer`. Anyone with the invite code can join. Public dashboards are accessible by slug at `/d/$slug` without login.

### Goals & Activity Config

- `src/config/activities.ts` — `ACTIVITY_CONFIGS` registry maps activity IDs (`'running'`) to Strava types (`'Run'`), supported metrics, and whether to use the Stats API or aggregate from activities list.
- `src/lib/goals/storage.ts` — goals stored in `localStorage` (not DB), with migration from legacy format.
- `src/lib/goals/calculations.ts` — progress calculation: current vs. goal, daily pace, days remaining, behind/ahead of plan.
- `src/lib/dashboard/timeframes.ts` — filter activities by `week | month | year | ytd`.

### Component Organization

- `src/components/ui/` — shadcn/ui primitives (generated by CLI)
- `src/components/custom/` — custom components (Button, Card, Dialog, etc.) with additional variants/props
- `src/components/dashboard/` — dashboard-specific components (cards, config dialog, profile breakdown)
- `src/components/stats/` — personal stats view components
- `src/components/layout/` — page chrome (Header, Page, Main, Logo, Profile)
- `src/components/auth/` — login/signup form components

The custom `Card` component accepts a `state` prop (`'error' | 'active'`) for visual states.
The custom `Button` component accepts a `to` prop for router links.

### Path Alias

`@/` maps to `src/`. All internal imports use this alias.

### Testing

Two test environments:

- **jsdom** (`*.test.ts` / `*.test.tsx`) — unit tests, run with `pnpm test`
- **Browser (Playwright/Chromium)** (`*.browser.test.tsx`) — integration tests, run with `pnpm test:browser`; this is what CI runs

### Database Migrations

Schema lives in `prisma/schema.prisma`. SQL migration history is also in `supabase/migrations/` (for reference). Use `pnpm db:push` for schema sync in development, Prisma migrations for production changes.
