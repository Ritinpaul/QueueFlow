# JobFlow — Distributed Job Scheduler

A production-grade distributed job scheduling platform built for reliability, observability, and scale.

## ⚡ Quick Start (< 5 minutes)

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- [pnpm 9+](https://pnpm.io/installation)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone & Install

```bash
git clone <repo-url>
cd distributed-job-scheduler
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# The defaults work out of the box with Docker Compose
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Verify both are healthy
docker-compose ps
```

### 4. Run Database Migrations

```bash
pnpm db:generate   # Generate SQL from schema
pnpm db:migrate    # Apply migrations to DB
```

### 5. Start All Services

```bash
# Start everything in development mode
pnpm dev

# Or start individually:
# API server → http://localhost:3001
# Worker      → background process
# Web UI      → http://localhost:3000
```

### 6. Verify It Works

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# { "status": "healthy", "services": { "database": "ok", "redis": "ok" } }
```

- **API Docs (Swagger UI):** http://localhost:3001/docs
- **Web Dashboard:** http://localhost:3000
- **Redis Commander:** `docker-compose --profile tools up -d` → http://localhost:8081

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js Dashboard               │
│         (Queue Management, Job Explorer,         │
│          Worker Monitor, Analytics)              │
└──────────────────────┬──────────────────────────┘
                       │ REST + WebSocket
┌──────────────────────▼──────────────────────────┐
│               Fastify API Server                 │
│    (Auth, RBAC, Job Submission, Queue Config)    │
└────────┬────────────────────────┬───────────────┘
         │                        │
┌────────▼────────┐   ┌───────────▼──────────────┐
│   PostgreSQL 16  │   │         Redis 7           │
│  (Jobs, Queues,  │   │  (Rate Limiting, Locks,   │
│   Workers, Logs) │   │   Pub/Sub, Sessions)      │
└─────────────────┘   └───────────┬───────────────┘
                                   │
┌──────────────────────────────────▼───────────────┐
│                Worker Process(es)                 │
│  SELECT FOR UPDATE SKIP LOCKED → Execute → Log   │
│  Heartbeat every 5s | Dead detection at 30s      │
└──────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
distributed-job-scheduler/
├── apps/
│   ├── api/       # Fastify REST API + WebSocket server
│   ├── worker/    # Job execution worker process
│   └── web/       # Next.js dashboard
├── packages/
│   ├── db/        # Drizzle ORM schema + client (shared)
│   └── types/     # Shared TypeScript types
├── docker/
│   └── postgres/  # DB initialization scripts
├── docs/          # Architecture, ER diagrams, design decisions
└── docker-compose.yml
```

## 🧪 Running Tests

```bash
# Run all tests
pnpm test

# Run API tests only
cd apps/api && pnpm test

# Run with coverage
cd apps/api && pnpm vitest run --coverage
```

## 📖 API Documentation

Interactive Swagger UI available at **http://localhost:3001/docs** when the API server is running.

## 🗄️ Database Schema

See [`docs/er-diagram.md`](./docs/er-diagram.md) for the full ER diagram with all tables, indexes, and relationships.

## 🏗️ Architecture & Design Decisions

See [`docs/design-decisions.md`](./docs/design-decisions.md) for detailed engineering rationale behind major trade-offs.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret (min 64 chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `PORT` | API server port | `3001` |
| `WORKER_CONCURRENCY` | Max concurrent jobs per worker | `5` |
| `WORKER_HEARTBEAT_INTERVAL_MS` | Heartbeat frequency | `5000` |
| `WORKER_DEAD_THRESHOLD_MS` | Dead worker timeout | `30000` |

## Tech Stack

- **Backend:** Fastify + TypeScript + Drizzle ORM
- **Database:** PostgreSQL 16 (atomic claiming via `SELECT FOR UPDATE SKIP LOCKED`)
- **Cache/Locks:** Redis 7 + Redlock
- **Frontend:** Next.js 14 + shadcn/ui + Recharts
- **Real-time:** Socket.io WebSockets
- **Testing:** Vitest + Supertest
- **Monorepo:** pnpm workspaces + Turbo
