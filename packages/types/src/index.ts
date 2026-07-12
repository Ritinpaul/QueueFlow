// ─────────────────────────────────────────────
// Shared API Response Types
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  requestId: string;
}

// ─────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────

export interface JWTPayload {
  sub: string;       // userId
  email: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─────────────────────────────────────────────
// Job Types
// ─────────────────────────────────────────────

export type JobStatus =
  | "pending"
  | "scheduled"
  | "claimed"
  | "running"
  | "completed"
  | "failed"
  | "dead"
  | "cancelled";

export type RetryStrategy = "fixed" | "linear" | "exponential";

export interface RetryPolicyConfig {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface JobSubmission {
  type: string;
  payload?: Record<string, unknown>;
  queueId: string;
  priority?: number;
  idempotencyKey?: string;
  // For delayed jobs
  delay?: number;          // ms from now
  scheduledAt?: string;    // ISO timestamp
  // For recurring jobs
  cron?: string;
  timezone?: string;
  // For batch jobs
  batch?: Record<string, unknown>[];
  // For workflow deps
  parentJobId?: string;
  maxAttempts?: number;
}

// ─────────────────────────────────────────────
// WebSocket Event Types
// ─────────────────────────────────────────────

export type WsEventType =
  | "job:status_changed"
  | "job:log"
  | "worker:heartbeat"
  | "worker:status_changed"
  | "queue:stats_updated";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: string;
}

export interface JobStatusChangedPayload {
  jobId: string;
  queueId: string;
  previousStatus: JobStatus;
  newStatus: JobStatus;
}

export interface WorkerHeartbeatPayload {
  workerId: string;
  projectId: string;
  activeJobs: number;
  cpuPercent?: number;
  memoryMb?: number;
}

// ─────────────────────────────────────────────
// Worker Internal Types
// ─────────────────────────────────────────────

export interface JobHandler {
  type: string;
  concurrency?: number;
  execute: (job: JobContext) => Promise<unknown>;
}

export interface JobContext {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attemptNumber: number;
  log: (level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void;
}

export interface WorkerConfig {
  projectId: string;
  apiKey: string;
  apiUrl: string;
  concurrency?: number;
  queues?: string[];
  heartbeatIntervalMs?: number;
  pollIntervalMs?: number;
}
