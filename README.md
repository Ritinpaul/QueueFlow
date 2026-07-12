# QueueFlow — Distributed Job Scheduler

A production-grade distributed job scheduling platform built for reliability and scale. Built with a Turborepo monorepo — API, Worker, and Web dashboard all in one repo.

---

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| **[README.md](./README.md)** | This file — setup, architecture overview |
| **[API_DOCS.md](./API_DOCS.md)** | Full API reference with request/response examples |
| **[DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)** | Architecture trade-offs and rationale |

Live interactive API docs (Swagger UI): **http://localhost:3001/docs**

---

## ⚡ Quick Start

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — for Postgres + Redis

### 1. Clone & Install

```bash
git clone https://github.com/Ritinpaul/QueueFlow.git
cd QueueFlow
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Defaults work out of the box with Docker Compose
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

### 4. Run Database Migrations

```bash
pnpm db:push
```

### 5. Start All Services

```bash
# Start all apps together
pnpm dev

# Or individually:
pnpm --filter "@scheduler/api"    dev   # API    → http://localhost:3001
pnpm --filter "@scheduler/worker" dev   # Worker → background process
pnpm --filter "@scheduler/web"    dev   # Web UI → http://localhost:3000
```

### 6. Verify It Works

```bash
curl http://localhost:3001/health
# { "status": "healthy", ... }
```

- **Web Dashboard:** http://localhost:3000
- **API Docs (Swagger UI):** http://localhost:3001/docs

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER / CLIENT APP                           │
│               (Browser Dashboard or SDK/curl)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS/REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Fastify API Server :3001                      │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ ┌───────────┐  │
│  │  Auth       │ │  Projects   │ │  Queues   │ │  Jobs     │  │
│  │  (JWT)      │ │  (API Keys) │ │  (CRUD)   │ │  (Submit) │  │
│  └─────────────┘ └─────────────┘ └───────────┘ └───────────┘  │
└──────────────┬────────────────────────────┬─────────────────────┘
               │ Drizzle ORM                │ BullMQ
               ▼                            ▼
┌──────────────────────┐        ┌───────────────────────┐
│   PostgreSQL 16      │        │       Redis 7         │
│   (Primary Store)    │        │   (Job Queue / Cache) │
│                      │        └───────────┬───────────┘
│  • users             │                    │ BRPOP / XREAD
│  • organizations     │                    ▼
│  • projects          │        ┌───────────────────────┐
│  • queues            │        │    BullMQ Worker      │
│  • jobs              │◄───────│  (Poll → Execute      │
│  • job_executions    │        │   → Log → Repeat)     │
│  • dead_letter_queue │        └───────────────────────┘
└──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Next.js Dashboard :3000                        │
│   Landing Page → Login/Register → Dashboard → Projects         │
│   (Connects to API via REST, JWT stored in localStorage)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ ER Diagram

```
┌─────────────────┐       ┌──────────────────────┐
│     USERS       │──┐    │   ORGANIZATIONS      │
├─────────────────┤  │    ├──────────────────────┤
│ id (PK)         │  └───►│ owner_id (FK→users)  │
│ email (UNIQUE)  │       │ id (PK)              │
│ password_hash   │       │ name                 │
│ name            │       │ slug (UNIQUE)        │
│ created_at      │       │ plan                 │
└────────┬────────┘       └──────────┬───────────┘
         │                           │
         │ ┌─────────────────────────┘
         │ │
         ▼ ▼
┌──────────────────────┐
│  ORGANIZATION_MEMBERS│
├──────────────────────┤
│ org_id (FK, PK)      │
│ user_id (FK, PK)     │
│ role (enum)          │
│ created_at           │
└──────────────────────┘
         │
         │ (org_id → organizations.id)
         ▼
┌──────────────────────┐
│      PROJECTS        │
├──────────────────────┤
│ id (PK)              │
│ org_id (FK)          │
│ name                 │
│ description          │
│ api_key_hash (UNIQUE)│
│ api_key_prefix       │
│ created_at           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│       QUEUES         │────►│    RETRY_POLICIES    │
├──────────────────────┤     ├──────────────────────┤
│ id (PK)              │     │ id (PK)              │
│ project_id (FK)      │     │ strategy (enum)      │
│ retry_policy_id (FK) │     │ max_attempts         │
│ name                 │     │ base_delay_ms        │
│ status (enum)        │     │ max_delay_ms         │
│ concurrency_limit    │     │ backoff_multiplier   │
│ rate_limit_per_min   │     └──────────────────────┘
│ priority             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│        JOBS          │────►│      WORKERS         │
├──────────────────────┤     ├──────────────────────┤
│ id (PK)              │     │ id (PK)              │
│ queue_id (FK)        │     │ project_id (FK)      │
│ worker_id (FK)       │     │ hostname             │
│ type                 │     │ pid                  │
│ payload (jsonb)      │     │ status (enum)        │
│ status (enum)        │     │ concurrency          │
│ priority             │     │ last_heartbeat_at    │
│ idempotency_key      │     └──────────────────────┘
│ scheduled_at         │
│ cron_expression      │
│ attempt_count        │
│ max_attempts         │
│ result (jsonb)       │
│ error_message        │
└──────────┬───────────┘
           │
      ┌────┴────────────────────────┐
      │                             │
      ▼                             ▼
┌─────────────────┐   ┌───────────────────────┐
│  JOB_EXECUTIONS │   │   DEAD_LETTER_QUEUE   │
├─────────────────┤   ├───────────────────────┤
│ id (PK)         │   │ id (PK)               │
│ job_id (FK)     │   │ job_id (FK, UNIQUE)   │
│ worker_id (FK)  │   │ queue_id (FK)         │
│ attempt_number  │   │ failure_reason        │
│ status (enum)   │   │ attempt_count         │
│ started_at      │   │ reviewed              │
│ duration_ms     │   │ reviewed_by (FK)      │
│ error_message   │   └───────────────────────┘
│ result (jsonb)  │
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│    JOB_LOGS      │
├──────────────────┤
│ id (PK)          │
│ job_id (FK)      │
│ execution_id(FK) │
│ level (enum)     │
│ message          │
│ metadata (jsonb) │
│ timestamp        │
└──────────────────┘
```

---

## 📁 Project Structure

```
QueueFlow/
├── apps/
│   ├── api/                    # Fastify REST API server
│   │   └── src/
│   │       ├── routes/         # auth, projects, queues, jobs
│   │       ├── lib/            # auth plugins, middleware
│   │       ├── test/           # Vitest integration tests
│   │       └── server.ts       # Fastify instance + plugin registration
│   ├── worker/                 # BullMQ job execution worker
│   └── web/                    # Next.js 14 App Router dashboard
│       └── app/
│           ├── page.tsx        # Landing page
│           ├── login/          # Auth pages
│           ├── register/
│           └── dashboard/      # Protected dashboard routes
│               ├── projects/
│               ├── queues/
│               └── settings/
├── packages/
│   ├── db/                     # Drizzle ORM schema + client (shared)
│   │   └── src/schema.ts       # All table definitions
│   └── types/                  # Shared TypeScript types
├── docker/
│   └── postgres/               # DB initialization scripts
├── API_DOCS.md                 # Full API reference
├── DESIGN_DECISIONS.md         # Architecture trade-offs
├── .env.example
└── docker-compose.yml
```

---

## 🔌 API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/v1/auth/register` | — | Register a new user |
| `POST` | `/api/v1/auth/login` | — | Login, receive JWT |
| `GET`  | `/api/v1/auth/me` | JWT | Get current user profile |
| `GET`  | `/api/v1/projects` | JWT | List all projects |
| `POST` | `/api/v1/projects` | JWT | Create a project, get API key |
| `GET`  | `/api/v1/queues` | JWT | List all queues |
| `POST` | `/api/v1/queues` | JWT | Create a queue |
| `POST` | `/api/v1/jobs` | API Key | Submit a job |
| `GET`  | `/api/v1/jobs` | API Key | List jobs with filters |
| `GET`  | `/health` | — | Health check |

Full docs: **[API_DOCS.md](./API_DOCS.md)** or **http://localhost:3001/docs**

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (min 64 chars) | — |
| `PORT` | API server port | `3001` |
| `WORKER_CONCURRENCY` | Max concurrent jobs per worker | `5` |
| `WORKER_HEARTBEAT_INTERVAL_MS` | Heartbeat frequency | `5000` |
| `WORKER_DEAD_THRESHOLD_MS` | Dead worker timeout | `30000` |

---

## 🧪 Running Tests

Tests are integration tests that run against a real (test) database and Redis instance. Start Docker first.

```bash
# Run all API tests
cd apps/api && pnpm test

# Run with coverage report
cd apps/api && pnpm vitest run --coverage

# Run a specific test file
cd apps/api && pnpm vitest run src/test/routes/auth.test.ts
```

**Test files:**
- `src/test/routes/health.test.ts` — Health check endpoint
- `src/test/routes/auth.test.ts` — Registration, login, JWT verification
- `src/test/routes/projects.test.ts` — Project creation, API key security, isolation

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 App Router, TypeScript, Tailwind CSS |
| **Backend** | Fastify 4, TypeScript, Zod validation |
| **Database** | PostgreSQL 16, Drizzle ORM |
| **Queue** | Redis 7, BullMQ |
| **Auth** | JWT (fastify-jwt), bcryptjs |
| **Testing** | Vitest (integration tests) |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Infra** | Docker Compose |
| **API Docs** | Swagger UI (@fastify/swagger) |
