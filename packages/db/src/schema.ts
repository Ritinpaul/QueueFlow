import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const orgRoleEnum = pgEnum("org_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const queueStatusEnum = pgEnum("queue_status", [
  "active",
  "paused",
  "draining",
]);

export const retryStrategyEnum = pgEnum("retry_strategy", [
  "fixed",
  "linear",
  "exponential",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "scheduled",
  "claimed",
  "running",
  "completed",
  "failed",
  "dead",
  "cancelled",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "running",
  "completed",
  "failed",
  "timeout",
]);

export const workerStatusEnum = pgEnum("worker_status", [
  "active",
  "idle",
  "draining",
  "dead",
]);

export const logLevelEnum = pgEnum("log_level", [
  "debug",
  "info",
  "warn",
  "error",
]);

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({ emailIdx: uniqueIndex("users_email_idx").on(table.email) })
);

// ─────────────────────────────────────────────
// REFRESH TOKENS
// ─────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 512 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("refresh_tokens_token_idx").on(table.token),
    userIdx: index("refresh_tokens_user_idx").on(table.userId),
  })
);

// ─────────────────────────────────────────────
// ORGANIZATIONS
// ─────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    plan: varchar("plan", { length: 50 }).notNull().default("free"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({ slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug) })
);

// ─────────────────────────────────────────────
// ORGANIZATION MEMBERS
// ─────────────────────────────────────────────

export const organizationMembers = pgTable(
  "organization_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({ pk: primaryKey({ columns: [table.orgId, table.userId] }) })
);

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    // Store hashed API key; show original only once on creation
    apiKeyHash: varchar("api_key_hash", { length: 512 }).notNull(),
    apiKeyPrefix: varchar("api_key_prefix", { length: 12 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("projects_org_idx").on(table.orgId),
    apiKeyHashIdx: uniqueIndex("projects_api_key_hash_idx").on(table.apiKeyHash),
  })
);

// ─────────────────────────────────────────────
// RETRY POLICIES
// ─────────────────────────────────────────────

export const retryPolicies = pgTable("retry_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  strategy: retryStrategyEnum("strategy").notNull().default("exponential"),
  maxAttempts: integer("max_attempts").notNull().default(3),
  baseDelayMs: integer("base_delay_ms").notNull().default(1000),
  maxDelayMs: integer("max_delay_ms").notNull().default(3600000), // 1 hour cap
  backoffMultiplier: real("backoff_multiplier").notNull().default(2.0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────
// QUEUES
// ─────────────────────────────────────────────

export const queues = pgTable(
  "queues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    retryPolicyId: uuid("retry_policy_id").references(() => retryPolicies.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: queueStatusEnum("status").notNull().default("active"),
    priority: integer("priority").notNull().default(0),
    concurrencyLimit: integer("concurrency_limit").notNull().default(10),
    rateLimitPerMinute: integer("rate_limit_per_minute"),
    maxJobs: integer("max_jobs"), // null = unlimited
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectNameIdx: uniqueIndex("queues_project_name_idx").on(table.projectId, table.name),
    projectStatusIdx: index("queues_project_status_idx").on(table.projectId, table.status),
  })
);

// ─────────────────────────────────────────────
// WORKERS
// ─────────────────────────────────────────────

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    hostname: varchar("hostname", { length: 255 }).notNull(),
    pid: integer("pid").notNull(),
    status: workerStatusEnum("status").notNull().default("idle"),
    concurrency: integer("concurrency").notNull().default(5),
    // Stores queue names this worker handles; null = handles all
    queues: text("queues").array(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: varchar("version", { length: 50 }),
    metadata: jsonb("metadata"), // CPU, memory etc.
  },
  (table) => ({
    projectStatusIdx: index("workers_project_status_idx").on(table.projectId, table.status),
    // Critical for dead worker detection query
    heartbeatIdx: index("workers_heartbeat_idx").on(table.lastHeartbeatAt),
  })
);

// ─────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => queues.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    // Job handler identifier — maps to registered handler in worker
    type: varchar("type", { length: 255 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: jobStatusEnum("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    // Idempotency key — unique constraint prevents duplicate submissions
    idempotencyKey: varchar("idempotency_key", { length: 512 }),
    // Timing
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Cron fields
    cronExpression: varchar("cron_expression", { length: 100 }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    // Workflow: parent job for dependency chains
    parentJobId: uuid("parent_job_id"),
    // Batch grouping
    batchId: uuid("batch_id"),
    // Retry tracking
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    // Results
    result: jsonb("result"),
    errorMessage: text("error_message"),
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    // THE CRITICAL INDEX: used by SELECT FOR UPDATE SKIP LOCKED polling query
    pollIdx: index("jobs_queue_poll_idx").on(
      table.queueId,
      table.status,
      table.priority,
      table.scheduledAt
    ),
    // Idempotency enforcement — prevents duplicate submissions
    idempotencyKeyIdx: uniqueIndex("jobs_idempotency_key_idx").on(table.idempotencyKey),
    // Cron scheduler scan: find due recurring jobs
    cronIdx: index("jobs_cron_idx").on(table.status, table.nextRunAt),
    // Batch progress lookup
    batchIdx: index("jobs_batch_idx").on(table.batchId),
    // Worker's current jobs
    workerIdx: index("jobs_worker_idx").on(table.workerId, table.status),
  })
);

// Self-referential FK for workflow dependencies (added separately)
// jobs.parentJobId -> jobs.id

// ─────────────────────────────────────────────
// JOB EXECUTIONS
// ─────────────────────────────────────────────

export const jobExecutions = pgTable(
  "job_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id").references(() => workers.id, {
      onDelete: "set null",
    }),
    attemptNumber: integer("attempt_number").notNull(),
    status: executionStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    result: jsonb("result"),
    // How long the worker should wait before retrying
    retryDelayMs: integer("retry_delay_ms"),
  },
  (table) => ({
    jobIdx: index("job_executions_job_idx").on(table.jobId),
    workerIdx: index("job_executions_worker_idx").on(table.workerId, table.startedAt),
  })
);

// ─────────────────────────────────────────────
// JOB LOGS
// ─────────────────────────────────────────────

export const jobLogs = pgTable(
  "job_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    executionId: uuid("execution_id").references(() => jobExecutions.id, {
      onDelete: "cascade",
    }),
    level: logLevelEnum("level").notNull().default("info"),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    jobIdx: index("job_logs_job_idx").on(table.jobId, table.timestamp),
    executionIdx: index("job_logs_execution_idx").on(table.executionId),
  })
);

// ─────────────────────────────────────────────
// WORKER HEARTBEATS
// ─────────────────────────────────────────────

export const workerHeartbeats = pgTable(
  "worker_heartbeats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    activeJobs: integer("active_jobs").notNull().default(0),
    cpuPercent: real("cpu_percent"),
    memoryMb: real("memory_mb"),
    jobsProcessed: integer("jobs_processed").notNull().default(0),
    jobsFailed: integer("jobs_failed").notNull().default(0),
  },
  (table) => ({ workerIdx: index("worker_heartbeats_worker_idx").on(table.workerId, table.timestamp) })
);

// ─────────────────────────────────────────────
// DEAD LETTER QUEUE
// ─────────────────────────────────────────────

export const deadLetterQueue = pgTable(
  "dead_letter_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => queues.id, { onDelete: "cascade" }),
    failureReason: text("failure_reason").notNull(),
    finalError: text("final_error"),
    attemptCount: integer("attempt_count").notNull(),
    movedAt: timestamp("moved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewed: boolean("reviewed").notNull().default(false),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Bonus: AI-generated failure summary
    aiSummary: text("ai_summary"),
  },
  (table) => ({
    jobIdx: uniqueIndex("dlq_job_idx").on(table.jobId),
    queueMovedIdx: index("dlq_queue_moved_idx").on(table.queueId, table.movedAt),
    reviewedIdx: index("dlq_reviewed_idx").on(table.reviewed),
  })
);

// ─────────────────────────────────────────────
// SCHEDULED JOBS (Cron registry)
// ─────────────────────────────────────────────

export const scheduledJobs = pgTable(
  "scheduled_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => queues.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    payloadTemplate: jsonb("payload_template").notNull().default({}),
    cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
    timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Cron scheduler scans this index every minute
    activeNextRunIdx: index("scheduled_jobs_active_next_run_idx").on(
      table.isActive,
      table.nextRunAt
    ),
    queueIdx: index("scheduled_jobs_queue_idx").on(table.queueId),
  })
);

// ─────────────────────────────────────────────
// RELATIONS (Drizzle relational queries)
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
  ownedOrgs: many(organizations),
  refreshTokens: many(refreshTokens),
}));

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    owner: one(users, { fields: [organizations.ownerId], references: [users.id] }),
    members: many(organizationMembers),
    projects: many(projects),
  })
);

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    org: one(organizations, {
      fields: [organizationMembers.orgId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  org: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  queues: many(queues),
  workers: many(workers),
}));

export const queuesRelations = relations(queues, ({ one, many }) => ({
  project: one(projects, {
    fields: [queues.projectId],
    references: [projects.id],
  }),
  retryPolicy: one(retryPolicies, {
    fields: [queues.retryPolicyId],
    references: [retryPolicies.id],
  }),
  jobs: many(jobs),
  scheduledJobs: many(scheduledJobs),
  deadLetterQueue: many(deadLetterQueue),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  queue: one(queues, { fields: [jobs.queueId], references: [queues.id] }),
  worker: one(workers, { fields: [jobs.workerId], references: [workers.id] }),
  executions: many(jobExecutions),
  logs: many(jobLogs),
  deadLetterEntry: one(deadLetterQueue),
}));

export const jobExecutionsRelations = relations(
  jobExecutions,
  ({ one, many }) => ({
    job: one(jobs, { fields: [jobExecutions.jobId], references: [jobs.id] }),
    worker: one(workers, {
      fields: [jobExecutions.workerId],
      references: [workers.id],
    }),
    logs: many(jobLogs),
  })
);

export const workersRelations = relations(workers, ({ one, many }) => ({
  project: one(projects, {
    fields: [workers.projectId],
    references: [projects.id],
  }),
  heartbeats: many(workerHeartbeats),
  executions: many(jobExecutions),
  jobs: many(jobs),
}));
