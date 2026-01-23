# Migration Plan: Supabase → Prisma + TanStack Start Auth

## Overview

Migrate from Supabase (auth + database) to:
- **Prisma** for database ORM
- **TanStack Start's built-in `useSession`** for session management
- **Custom password hashing** (scrypt with per-user salt for security)
- **PostgreSQL** (can use Neon, Railway, or any PostgreSQL provider)

---

## Current Supabase Dependencies

### Auth
- `@supabase/supabase-js` - Auth client
- `@supabase/ssr` - Cookie-based session management
- Supabase Auth (email/password login)
- Supabase triggers for profile creation

### Database
- Supabase PostgreSQL with RLS
- Tables: `profiles`, `data_sources`, `dashboards`, `dashboard_profiles`, `dashboard_invites`
- RLS policies for authorization

### Files Using Supabase
| File | Usage |
|------|-------|
| `src/lib/supabase/client.ts` | Browser client |
| `src/lib/supabase/server.ts` | Server client (service role) |
| `src/lib/auth/SimpleAuthContext.tsx` | Auth state management |
| `src/components/auth/LoginForm.tsx` | Login UI |
| `src/routes/settings.tsx` | OAuth callback, data_sources |
| `src/lib/server/dashboards.ts` | Dashboard CRUD |
| `src/lib/server/getDashboardData.ts` | Fetch dashboard data |
| `src/lib/server/getUserStats.ts` | Fetch user stats |
| `src/lib/server/auth.ts` | Auth helper for routes |
| `src/lib/supabase/dashboard.ts` | Dashboard config |
| `src/lib/supabase/dashboardStorage.ts` | Dashboard storage |

---

## Target Architecture

### Auth System
- **TanStack Start `useSession`** - Built-in encrypted cookie sessions
- **Password hashing** - scrypt with per-user salt (secure)
- **No Session table** - Sessions stored in encrypted cookies
- **Route protection** - `beforeLoad` + route context

### Database
- **Prisma ORM** - Type-safe queries
- **Single client** - No edge client needed (useSession handles sessions)
- **No RLS** - Authorization handled in application code

---

## Phase 1: Database Setup

### 1.1 Install Dependencies

```bash
pnpm add prisma @prisma/client
pnpm add -D prisma
```

### 1.2 Create Prisma Schema

**File: `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
}

enum DashboardRole {
  owner
  editor
  viewer
}

model User {
  id                  String    @id @default(uuid())
  email               String    @unique
  password            String?   // Hashed password
  salt                String?   // Password salt
  fullName            String?   @map("full_name")
  resetPasswordToken  String?   @map("reset_password_token")
  role                UserRole  @default(USER)
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  // Relations
  dataSources         DataSource[]
  ownedDashboards     Dashboard[]        @relation("DashboardOwner")
  dashboardProfiles   DashboardProfile[]

  @@map("users")
}

model DataSource {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  provider     String    // 'strava', 'garmin', etc.
  athleteId    BigInt?   @map("athlete_id")
  accessToken  String    @map("access_token")
  refreshToken String?   @map("refresh_token")
  expiresAt    DateTime? @map("expires_at")
  tokenType    String    @default("Bearer") @map("token_type")
  scope        String?
  athleteData  Json?     @map("athlete_data")
  isActive     Boolean   @default(true) @map("is_active")
  connectedAt  DateTime  @default(now()) @map("connected_at")
  lastSyncedAt DateTime? @map("last_synced_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider, isActive])
  @@map("data_sources")
}

model Dashboard {
  id          String    @id @default(uuid())
  name        String
  description String?
  slug        String?   @unique
  ownerId     String    @map("owner_id")
  isPublic    Boolean   @default(false) @map("is_public")
  isDefault   Boolean   @default(false) @map("is_default")
  config      Json?     // Dashboard card configuration
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  owner    User                @relation("DashboardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  profiles DashboardProfile[]
  invites  DashboardInvite[]

  @@map("dashboards")
}

model DashboardProfile {
  id             String        @id @default(uuid())
  dashboardId    String        @map("dashboard_id")
  profileId      String        @map("profile_id")
  role           DashboardRole @default(viewer)
  inviteAccepted Boolean       @default(false) @map("invite_accepted")
  joinedAt       DateTime      @default(now()) @map("joined_at")

  dashboard Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)
  profile   User      @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@unique([dashboardId, profileId])
  @@map("dashboard_profiles")
}

model DashboardInvite {
  id          String        @id @default(uuid())
  dashboardId String        @map("dashboard_id")
  inviteCode  String        @unique @map("invite_code")
  role        DashboardRole @default(viewer)
  expiresAt   DateTime?     @map("expires_at")
  createdAt   DateTime      @default(now()) @map("created_at")

  dashboard Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)

  @@map("dashboard_invites")
}
```

**Note:** No `Session` model needed - TanStack Start's `useSession` stores sessions in encrypted cookies.

### 1.3 Create Database Client

**File: `src/lib/db/client.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Phase 2: Auth System

### 2.1 Session Hook (TanStack Start Built-in)

**File: `src/lib/auth/session.ts`**

```typescript
import { useSession } from '@tanstack/react-start/server'

// Session data type - what we store in the encrypted cookie
export interface SessionUser {
  userId: string
  email: string
}

// Secret must be at least 32 characters
const SESSION_SECRET = process.env.SESSION_SECRET!

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters')
}

export function useAppSession() {
  return useSession<SessionUser>({
    password: SESSION_SECRET,
  })
}
```

### 2.2 Password Utilities (Secure - from Fondfolio)

**File: `src/lib/auth/password.ts`**

```typescript
import crypto from 'crypto'

export async function hashPassword(password: string, salt: string): Promise<string> {
  const normalizedPassword = password.normalize('NFC')
  return new Promise((resolve, reject) => {
    crypto.scrypt(normalizedPassword, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(derivedKey.toString('hex'))
    })
  })
}

export async function comparePasswords(
  password: string,
  salt: string,
  hashedPassword: string
): Promise<boolean> {
  const hash = await hashPassword(password, salt)
  const hashBuffer = Buffer.from(hash, 'hex')
  const storedBuffer = Buffer.from(hashedPassword, 'hex')

  if (hashBuffer.length !== storedBuffer.length) return false
  return crypto.timingSafeEqual(hashBuffer, storedBuffer)
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex')
}
```

### 2.3 Auth Server Functions

**File: `src/lib/server/auth.ts`**

```typescript
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { hashPassword, comparePasswords, generateSalt } from '@/lib/auth/password'
import { useAppSession } from '@/lib/auth/session'

// =====================================================
// SCHEMAS
// =====================================================

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).optional(),
})

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
})

// =====================================================
// SIGN UP
// =====================================================

export const signUp = createServerFn({ method: 'POST' })
  .validator(SignUpSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (existing) {
      return { error: 'Email already registered' }
    }

    // Create user with secure password
    const salt = generateSalt()
    const hashedPassword = await hashPassword(data.password, salt)

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        salt,
        fullName: data.fullName,
      },
    })

    // Set session
    await session.update({
      userId: user.id,
      email: user.email,
    })

    return { success: true, userId: user.id }
  })

// =====================================================
// SIGN IN
// =====================================================

export const signIn = createServerFn({ method: 'POST' })
  .validator(SignInSchema)
  .handler(async ({ data }) => {
    const session = await useAppSession()

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })

    if (!user || !user.password || !user.salt) {
      return { error: 'Invalid email or password' }
    }

    const validPassword = await comparePasswords(data.password, user.salt, user.password)
    if (!validPassword) {
      return { error: 'Invalid email or password' }
    }

    // Set session
    await session.update({
      userId: user.id,
      email: user.email,
    })

    return { success: true, userId: user.id }
  })

// =====================================================
// SIGN OUT
// =====================================================

export const signOut = createServerFn({ method: 'POST' })
  .handler(async () => {
    const session = await useAppSession()
    await session.clear()
    throw redirect({ to: '/login' })
  })

// =====================================================
// GET CURRENT USER
// =====================================================

export const getCurrentUser = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await useAppSession()

    if (!session.data.userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: session.data.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return user
  })

// =====================================================
// GET USER WITH STRAVA DATA
// =====================================================

export const getCurrentUserWithStrava = createServerFn({ method: 'GET' })
  .handler(async () => {
    const session = await useAppSession()

    if (!session.data.userId) {
      return { user: null, stravaDataSource: null }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.data.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return { user: null, stravaDataSource: null }
    }

    const stravaDataSource = await prisma.dataSource.findFirst({
      where: {
        userId: user.id,
        provider: 'strava',
        isActive: true,
      },
    })

    return { user, stravaDataSource }
  })
```

---

## Phase 3: Route Protection

### 3.1 Root Route - Fetch User for Context

**File: `src/routes/__root.tsx`** (update)

```typescript
import { getCurrentUser } from '@/lib/server/auth'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    return { user }
  },
  component: RootComponent,
})

function RootComponent() {
  const { user } = Route.useRouteContext()
  // user is available throughout the app
  return <Outlet />
}
```

### 3.2 Protected Routes

**File: Example protected route**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboards/$dashboardId')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    return { user: context.user }
  },
  component: DashboardPage,
})
```

### 3.3 Auth Routes (redirect if already logged in)

**File: `src/routes/login.tsx`**

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/components/auth/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return <LoginForm />
}
```

---

## Phase 4: Update Auth UI Components

### 4.1 Login Form

**File: `src/components/auth/LoginForm.tsx`**

```typescript
import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { signIn } from '@/lib/server/auth'
import { Button } from '@/components/custom/Button/Button'
import { Input } from '@/components/custom/Input/Input'

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn({ data: { email, password } })

      if (result.error) {
        setError(result.error)
        return
      }

      // Navigate to home after successful login
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="text-red-600">{error}</div>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Log in'}
      </Button>
    </form>
  )
}
```

### 4.2 Logout Route

**File: `src/routes/logout.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { signOut } from '@/lib/server/auth'

export const Route = createFileRoute('/logout')({
  preload: false,
  loader: async () => {
    await signOut()
    // signOut throws redirect, so this won't be reached
  },
})
```

---

## Phase 5: Update Server Functions to Use Prisma

All server functions need to be updated to use Prisma instead of Supabase.

### Key Changes Pattern

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('dashboards')
  .select('*')
  .eq('id', dashboardId)
  .single()
```

**After (Prisma):**
```typescript
const dashboard = await prisma.dashboard.findUnique({
  where: { id: dashboardId },
})
```

### Files to Update

| File | Changes |
|------|---------|
| `src/lib/server/dashboards.ts` | Replace Supabase queries with Prisma |
| `src/lib/server/getDashboardData.ts` | Replace Supabase queries with Prisma |
| `src/lib/server/getUserStats.ts` | Replace Supabase queries with Prisma |
| `src/lib/server/oauth.ts` | Keep OAuth logic, update DB calls to Prisma |
| `src/lib/server/strava.ts` | Update token storage to use Prisma |

---

## Phase 6: Migration Steps

### 6.1 Files to Create

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema |
| `src/lib/db/client.ts` | Prisma client |
| `src/lib/auth/session.ts` | TanStack useSession wrapper |
| `src/lib/auth/password.ts` | Password utilities |
| `src/lib/server/auth.ts` | Auth server functions |

### 6.2 Files to Update

| File | Changes |
|------|---------|
| `src/routes/__root.tsx` | Add beforeLoad to fetch user |
| `src/routes/login.tsx` | Use new auth, redirect if logged in |
| `src/routes/logout.tsx` | Use signOut server function |
| `src/routes/signup.tsx` | Use new auth |
| `src/routes/settings.tsx` | Update to use Prisma |
| `src/routes/dashboards/*.tsx` | Update auth checks |
| `src/components/auth/LoginForm.tsx` | Use new signIn function |
| `src/lib/server/dashboards.ts` | Use Prisma |
| `src/lib/server/getDashboardData.ts` | Use Prisma |
| `src/lib/server/getUserStats.ts` | Use Prisma |

### 6.3 Files to Delete

| File | Reason |
|------|--------|
| `src/lib/supabase/client.ts` | Replaced by Prisma |
| `src/lib/supabase/server.ts` | Replaced by Prisma |
| `src/lib/supabase/types.ts` | Replaced by Prisma types |
| `src/lib/supabase/dashboard.ts` | Merged into server functions |
| `src/lib/supabase/dashboardStorage.ts` | Merged into server functions |
| `src/lib/auth/SimpleAuthContext.tsx` | No longer needed (use route context) |
| `supabase/` directory | No longer needed |

---

## Phase 7: Environment Variables

### Remove
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
```

### Add
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-at-least-32-characters-long
```

### Keep
```
VITE_STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
```

---

## Phase 8: Data Migration

### 8.1 Export from Supabase

```sql
-- Export users (will need password reset)
SELECT id, email, raw_user_meta_data->>'full_name' as full_name, created_at
FROM auth.users;

-- Export data_sources
SELECT * FROM public.data_sources;

-- Export dashboards
SELECT * FROM public.dashboards;

-- Export dashboard_profiles
SELECT * FROM public.dashboard_profiles;

-- Export dashboard_invites
SELECT * FROM public.dashboard_invites;
```

### 8.2 Import to New Database

1. Run Prisma migrations: `pnpm prisma migrate deploy`
2. Transform and import data
3. Send password reset emails to all users (they'll set new passwords)

---

## Implementation Order

1. **Phase 1**: Set up Prisma schema and client
2. **Phase 2**: Implement auth (session hook + password utilities)
3. **Phase 3**: Create auth server functions (signUp, signIn, signOut, getCurrentUser)
4. **Phase 4**: Update root route to fetch user
5. **Phase 5**: Update login/signup/logout routes and UI
6. **Phase 6**: Update all server functions to use Prisma
7. **Phase 7**: Update protected routes to use context.user
8. **Phase 8**: Migrate existing data
9. **Phase 9**: Remove Supabase dependencies
10. **Phase 10**: Test everything

---

## Benefits of This Approach

1. **Simpler sessions** - TanStack Start handles encryption/cookies
2. **No session table** - Less database complexity
3. **Secure passwords** - scrypt with per-user salt
4. **Type-safe** - Prisma generates types from schema
5. **No vendor lock-in** - Can use any PostgreSQL provider
6. **No RLS complexity** - Handle auth in application code
7. **Framework-native** - Uses TanStack Start patterns

---

## Key Differences from Fondfolio

| Aspect | This Plan | Fondfolio |
|--------|-----------|-----------|
| Session storage | Encrypted cookie (useSession) | Database table |
| Session hook | `useSession` from TanStack | Custom implementation |
| Edge client | Not needed | Required for middleware |
| Password security | Same (scrypt + salt) | Same |
| Route protection | beforeLoad + context | Middleware + server checks |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Full backup before migration |
| Auth downtime | Maintenance window, notify users |
| Password reset needed | Send reset emails to all users |
| Strava OAuth still works | Keep same OAuth flow, update DB calls |
| Session secret exposure | Store in environment variables only |
