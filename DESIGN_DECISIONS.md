# QueueFlow — Design Decisions & Trade-offs

## Overview

This document records the major architectural and implementation decisions made during the design of QueueFlow, a distributed job scheduling platform. Each section explains the problem being solved, the options considered, and the rationale behind the final choice.

---

## 1. Monorepo Structure (Turborepo + pnpm)

**Problem:** Three distinct services (API, Worker, Web) share code, types, and database access. Managing them as separate repos creates drift and version mismatch issues.

**Options Considered:**
- Separate Git repos per service
- Lerna monorepo
- **Turborepo + pnpm workspaces** ✅

**Decision:** Turborepo was chosen because it provides intelligent build caching by tracking task inputs/outputs. pnpm workspaces enforce strict dependency isolation, which is critical when sharing `@scheduler/db` and `@scheduler/types` across services.

**Trade-off:** Slightly higher initial setup complexity vs. dramatically improved developer experience and build correctness.

---

## 2. PostgreSQL as the Primary Job Store

**Problem:** Where do job records live? Should we rely entirely on Redis, or persist to a relational database?

**Decision:** PostgreSQL is the source of truth for all job records, while Redis powers the real-time dispatch layer via BullMQ. This gives us ACID guarantees, rich queryability for dashboards, and durability — jobs survive Redis flushes or restarts.

**Key Mechanism:** The job polling query uses `SELECT FOR UPDATE SKIP LOCKED`. This PostgreSQL-native concurrency primitive allows multiple workers to safely claim jobs without races, deadlocks, or double-processing.

**Trade-off:** Two datastores to manage vs. data durability and observability.

---

## 3. API Key Hashing (Security-First Design)

**Problem:** Storing raw API keys in the database is a critical security vulnerability.

**Decision:** API keys are generated, returned to the user exactly once, and then SHA-256 hashed before storage. Only the hash and a 10-character prefix are stored in the database — mirroring how GitHub and Stripe handle API keys.

**Trade-off:** Users cannot recover a lost key and must rotate it. This is intentional and reflects industry best practice.

---

## 4. JWT Authentication (Stateless)

**Decision:** JWT was chosen for its stateless nature — the API server verifies tokens without a database round-trip. The `fastify-jwt` plugin handles signing and verification.

**Trade-off:** JWTs cannot be individually revoked before expiry. A production deployment would implement a Redis-backed revocation list. The short expiry window mitigates this for the prototype.

---

## 5. BullMQ for Queue Dispatch

**Decision:** BullMQ provides battle-tested patterns for exactly-once delivery, retries with backoff, rate limiting, delayed jobs, and priority queues — all built-in. It runs on Redis for sub-millisecond latency.

**Trade-off:** Introduces Redis as a required infrastructure dependency. Mitigated by running Redis via Docker Compose.

---

## 6. Multi-tenant Model (Organizations)

**Decision:** Every user automatically gets a personal organization on registration. Projects belong to organizations, not directly to users. This allows future team collaboration features without schema migrations.

**Trade-off:** Adds one layer of indirection (user → org → project → queue → job) vs. simpler user → project model. Accepted because adding multi-tenancy later would require a breaking schema change.

---

## 7. Dead Letter Queue (DLQ)

**Decision:** A dedicated `dead_letter_queue` table captures all permanently failed jobs with their final error, attempt count, and a `reviewed` flag. Operators can inspect failures and manually requeue jobs.

**Trade-off:** Requires periodic cleanup to prevent unbounded growth. A production system would use TTL-based archival.

---

## 8. Zod for Schema Validation

**Decision:** Zod schemas are used for both TypeScript type inference and Fastify route validation via `fastify-type-provider-zod`. The same schemas automatically generate the Swagger/OpenAPI documentation at `/docs`.

**Trade-off:** Slightly slower than `ajv` (Fastify's default), but the developer experience gain (single source of truth for types, validation, and docs) is significant.

---

## 9. Drizzle ORM

**Decision:** Drizzle was chosen over Prisma because it generates standard SQL (predictable behavior), the schema is TypeScript-native, and it has near-zero runtime overhead.

**Trade-off:** Smaller ecosystem and fewer GUI tools than Prisma. Accepted because SQL controllability is more important for a performance-sensitive job scheduler.

---

## 10. Frontend Auth (localStorage JWT)

**Decision:** Authentication state is managed via `localStorage` JWT tokens for prototype simplicity.

**Trade-off:** `localStorage` is vulnerable to XSS attacks. A production system should use `HttpOnly` cookies. Documented as a known future improvement.

---

## Summary Table

| Decision | Choice | Key Trade-off |
|---|---|---|
| Monorepo | Turborepo + pnpm | Setup complexity vs. shared code |
| Job persistence | PostgreSQL + Redis | Two datastores vs. durability |
| API key storage | SHA-256 hash | Non-recoverable vs. secure |
| Auth | JWT stateless | No revocation vs. no DB per-request |
| Queue dispatch | BullMQ / Redis | Redis dependency vs. battle-tested |
| Multi-tenancy | Org model | Indirection vs. future-proof |
| Failed jobs | Dead Letter Queue | Storage overhead vs. observability |
| Validation | Zod | Slightly slower vs. unified types/docs |
| ORM | Drizzle | Smaller ecosystem vs. SQL control |
| Auth token storage | localStorage | XSS risk vs. prototype simplicity |
