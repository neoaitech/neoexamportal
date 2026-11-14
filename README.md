# Digital Exam Evaluation System


## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + MUI v9, canvas via Konva/react-konva, state via Zustand |
| Backend | NestJS 12 (TypeScript, ESM), JWT auth with TOTP-based 2FA |
| Database | PostgreSQL 16, via Prisma ORM |
| Infra (dev) | Docker Compose (Postgres only — frontend/backend run natively for fast reload) |

Monorepo layout (npm workspaces):

```
digital_exam_system/
├── frontend/            Next.js app
├── backend/             NestJS API
├── packages/db/         Prisma schema, migrations, seed script (shared source of truth for the DB)
└── docker-compose.yml   Local Postgres
```

## Super Easy Setup Guide (step by step, for anyone!)

Follow these steps **in order**. Don't skip any step. Type each command exactly as shown, then press Enter, and wait for it to finish before doing the next one.

> These steps are for **Windows Command Prompt (cmd)**. Open it by pressing the Windows key, typing `cmd`, and pressing Enter. Then navigate to the project folder, for example:
> ```
> cd D:\workspace\digital_exam_system
> ```

### Step 1: Make sure you have the right tools

- Install **Node.js** (version 24 or newer) from nodejs.org.
- Install **Docker Desktop** from docker.com, and **open the Docker Desktop app** — it must stay running in the background (look for the whale icon in your taskbar).

Check they're installed by typing:
```
node -v
npm -v
```
You should see version numbers printed, not an error.

### Step 2: Get all the project's building blocks

This downloads everything the project needs to work:
```
npm install
```
This can take a few minutes. Just wait for it to finish.

### Step 3: Copy the settings files

The project needs some settings files. These commands make copies of the example files so the project knows how to run:
```
copy backend\.env.example backend\.env
copy packages\db\.env.example packages\db\.env
copy frontend\.env.local.example frontend\.env.local
```
(On Mac/Linux, use `cp` instead of `copy`.)

### Step 4: Start the database container with Docker

This is the actual **Docker container** step! Make sure Docker Desktop is open and running first, then type:
```
npm run db:up
```
This tells Docker to start a little Postgres database in a container in the background. You won't see much happen — that's normal! To check it worked, open Docker Desktop and look for a container called `des-postgres` with a green "running" light.

### Step 5: Build the database tables

This creates all the empty tables inside the database:
```
npm run prisma:migrate
```

### Step 6: Fill the database with sample data

This adds some fake users and exam data so you have something to look at:
```
npm run prisma:seed
```

### Step 7: Start the app (needs TWO windows open at once)

Open **two** Command Prompt windows, both in the project folder (`D:\workspace\digital_exam_system`).

In the **first** window, type:
```
npm run dev:backend
```
Leave it running — this is the "engine" of the app.

In the **second** window, type:
```
npm run dev:frontend
```
Leave this running too — this is the part you actually see in your browser.

### Step 8: Open it in your browser

Go to this address in your web browser:
```
http://localhost:3000/login
```

Log in with:
- Email: `admin@demo.edu`
- Password: `Passw0rd!`

It will then ask for a 6-digit code (2FA). See the "Demo login" section below for how to generate one.

### When you're done for the day

Press `Ctrl + C` in both backend/frontend windows to stop them. To stop the database container too:
```
npm run db:down
```

---

## Prerequisites

- **Node.js 24+** and npm 11+ (check with `node -v` / `npm -v`)
- **Docker Desktop** (for Postgres) — must be running before you start the database

## First-time setup

```bash
# 1. Install all workspace dependencies (frontend, backend, packages/db)
npm install

# 2. Copy each package's env template and fill in real values if needed
#    (the defaults work as-is for local dev)
cp backend/.env.example backend/.env
cp packages/db/.env.example packages/db/.env
cp frontend/.env.local.example frontend/.env.local

# 3. Start Postgres in Docker
npm run db:up

# 4. Create the database tables
npm run prisma:migrate

# 5. Seed demo data (a tenant, 4 users, an exam, a rubric, and one allocated script)
npm run prisma:seed
```

## Running it

Two terminals, both from the repo root:

```bash
# Terminal 1 — backend API (http://localhost:3001/api)
npm run dev:backend

# Terminal 2 — frontend (http://localhost:3000)
npm run dev:frontend
```

Then open **http://localhost:3000/login**.

### Demo login

Seeded by `npm run prisma:seed` (see `packages/db/prisma/seed.ts`):

| Email | Password | Role |
|---|---|---|
| `admin@demo.edu` | `Passw0rd!` | Tenant Admin |
| `chief@demo.edu` | `Passw0rd!` | Chief Evaluator |
| `evaluator1@demo.edu` | `Passw0rd!` | Evaluator (has one script allocated) |
| `evaluator2@demo.edu` | `Passw0rd!` | Evaluator |

All seeded users share the same TOTP secret for 2FA: **`RJ556ZKFYGDISJJJL3WBKYKIQQMHIJHX`**. After entering the password, you'll be asked for a 6-digit one-time code — generate one by adding that secret to any authenticator app (Google Authenticator, Authy, etc.), or scripting it:

```bash
node -e "import('otplib').then(async ({generate}) => console.log(await generate({secret:'RJ556ZKFYGDISJJJL3WBKYKIQQMHIJHX'})))"
```
(run from the `backend/` folder so it can resolve the `otplib` package)

## Common commands  

| Command | What it does |
|---|---|
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run dev:backend` | Run the NestJS API in watch mode |
| `npm run dev:frontend` | Run the Next.js dev server |
| `npm run prisma:migrate` | Create/apply a migration from `packages/db/prisma/schema.prisma` |
| `npm run prisma:generate` | Regenerate the Prisma client after pulling schema changes |
| `npm run prisma:seed` | Re-seed demo data (safe to re-run — upserts, won't duplicate) |
| `npm run prisma:studio` | Open Prisma Studio, a GUI for browsing/editing the database |
| `npm run --workspace frontend build` | Production build of the frontend |
| `npm run build --workspace backend` | Production build of the backend |

## Resetting the database

If the demo data gets messy (e.g. after submitting the seeded evaluation while testing):

```bash
cd packages/db
npx prisma migrate reset --force   # drops and recreates all tables
cd ../..
npm run prisma:seed
```

## Troubleshooting

- **"Docker Desktop's engine isn't running"** — start Docker Desktop first; `npm run db:up` needs it.
- **`EADDRINUSE` on port 3001 or 3000** — a previous dev server didn't shut down cleanly. Find and stop it: `netstat -ano | findstr :3001` (Windows) then `taskkill /PID <pid> /F`.
- **`EPERM` renaming the Prisma query engine on Windows** — this happens if the backend is still running while you run a migration (it locks the engine DLL). Stop the backend (`Ctrl+C`), run the migration, then restart it.
- **Frontend can't reach the backend / CORS errors** — confirm `backend/.env`'s `CORS_ORIGIN` matches the frontend's origin (`http://localhost:3000` by default) and that `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` points at the backend (`http://localhost:3001/api`). Changes to `.env.local` require restarting `npm run dev:frontend` — Next.js only reads it at startup.

## Project status

Built so far: data model (Prisma schema for tenants, exams, rubrics, scripts, allocations, marks, annotations, audit trail), role-based dashboards, and an evaluation workspace with answer-page annotations and step-wise rubric scoring. Evaluators can upload a question paper, get suggested question numbers and marks extracted locally from text-based PDFs or DOCX files, review and edit the marking scheme, then upload answer sheets and grade them manually in the workspace. Uploaded question papers can be viewed alongside the answer script.

Limitations and remaining work: extraction is pattern-based and suggestions must be checked before saving; scanned PDFs and image question papers are not OCR'd and need manual scheme entry. Answer sheets are not automatically graded. Moderation/re-evaluation flows for Chief Evaluators and admin CRUD screens (exam/allocation/user management) are also not yet built.
