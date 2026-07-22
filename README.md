# CareConnect

A self-contained care management platform that brings patients, families, care
providers, and agencies into one workspace. CareConnect covers scheduling,
per-shift task checklists, a training hub, announcements and direct messaging,
and emergency information — across four role-based portals with an admin console
that can preview any portal.

Built with **Next.js 15** (App Router), **Prisma + PostgreSQL**, **Tailwind
CSS v4**, and hand-rolled JWT cookie authentication. No third-party auth, AI, or
external integrations — just a Postgres database behind a `DATABASE_URL`.

## Portals

- **Patient / Family** — view the care team, schedule, tasks, training, feed and
  emergency info; invite providers.
- **Provider** — see assigned patients, claim open shifts, complete tasks, read
  training material and the feed.
- **Agency** — manage patients and providers, build schedules and tasks, publish
  training and announcements.
- **Admin** — platform-wide overview, user and agency management, and a portal
  switcher to preview the app as any patient, provider, or agency.

## Tech stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Framework      | Next.js 15 (App Router, TypeScript)      |
| Database / ORM | PostgreSQL + Prisma 6                     |
| Styling        | Tailwind CSS v4                          |
| Icons          | lucide-react                             |
| Auth           | jose (HS256 JWT) in an httpOnly cookie   |
| Passwords      | bcryptjs                                 |

## Local development

### Prerequisites

- Node.js 18+ and npm
- A running PostgreSQL instance

### Setup

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local and set DATABASE_URL + SESSION_SECRET

# 3. Apply the database schema
npx prisma migrate deploy   # or: npx prisma migrate dev

# 4. Seed demo data (prints a login credentials table)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Visit http://localhost:3000.

> Prisma's CLI reads `.env` (not `.env.local`). For local CLI commands, either
> keep a `.env` with the same `DATABASE_URL`, or pass the variable inline.

## Environment variables

Only three variables are required (see `.env.example`):

| Variable              | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string.                        |
| `SESSION_SECRET`      | 32+ character secret used to sign session JWTs.      |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app.                          |

## Demo credentials

After seeding, every account uses the password **`password123`**:

| Role     | Email                        |
| -------- | ---------------------------- |
| Admin    | `admin@careconnect.demo`     |
| Agency   | `sunrise@careconnect.demo`   |
| Agency   | `evergreen@careconnect.demo` |
| Patient  | `eleanor@careconnect.demo`   |
| Patient  | `george@careconnect.demo`    |
| Patient  | `priya@careconnect.demo`     |
| Patient  | `sam@careconnect.demo`       |
| Provider | `dana@careconnect.demo`      |
| Provider | `luis@careconnect.demo`      |
| Provider | `aisha@careconnect.demo`     |
| Provider | `tom@careconnect.demo`       |

Sample invite codes: `PROVIDER1` (join a care team) and `PATIENT01`.

Sign in as the admin, then use the **Admin Console** bar at the top to preview
the app as any patient, provider, or agency.

## Deploying to Railway

1. Create a new Railway project and add the **PostgreSQL** plugin. Railway
   injects `DATABASE_URL` automatically.
2. Add the remaining variables in the service settings:
   - `SESSION_SECRET` — a long random string (32+ chars).
   - `NEXT_PUBLIC_APP_URL` — your Railway public URL.
3. Deploy. The included `railway.json` builds with `npm run build` and starts
   with `npm run db:migrate && npm run start`, so migrations run on every
   deploy.
4. Seed once (optional, for a demo) from the Railway shell:
   ```bash
   npm run db:seed
   ```

## Available scripts

| Script            | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Start the dev server.                        |
| `npm run build`   | `prisma generate` then `next build`.         |
| `npm run start`   | Start the production server.                 |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`).|
| `npm run db:seed` | Seed demo data.                              |

## Project structure

```
prisma/            Prisma schema, migrations, and seed script
src/app/           App Router pages + API route handlers
  api/             Route handlers (auth, CRUD, admin)
  patient|provider|agency|admin/   Role portals
src/components/    UI primitives, shared shell, and feature views
src/contexts/      Auth and patient-selection React contexts
src/lib/           Prisma client, auth, authorization, helpers
src/middleware.ts  Route protection for the four portals
```
