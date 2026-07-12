import { db } from "@scheduler/db";
import {
  workers,
  workerHeartbeats,
  jobs,
  jobExecutions,
  queues,
  retryPolicies,
  deadLetterQueue,
} from "@scheduler/db/src/schema.js";
import { eq, and, sql, lte, or, inArray, isNull } from "drizzle-orm";
import os from "os";

type JobHandler = (payload: any) => Promise<any>;

export interface WorkerOptions {
  projectId: string;
  concurrency?: number;
  queues?: string[]; // If empty, handles all queues for the project
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
}

export class JobWorker {
  private projectId: string;
  private concurrency: number;
  private queues: string[] | null;
  private pollIntervalMs: number;
  private heartbeatIntervalMs: number;

  private workerId: string | null = null;
  private activeJobsCount = 0;
  private isShuttingDown = false;
  private isPolling = false;

  private handlers: Map<string, JobHandler> = new Map();
  private timers: NodeJS.Timeout[] = [];

  constructor(options: WorkerOptions) {
    this.projectId = options.projectId;
    this.concurrency = options.concurrency || 5;
    this.queues = options.queues?.length ? options.queues : null;
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 15000;
  }

  public registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  public async start() {
    console.log(`Starting worker for project ${this.projectId}...`);

    // 1. Register Worker in DB
    const [workerRec] = await db
      .insert(workers)
      .values({
        projectId: this.projectId,
        hostname: os.hostname(),
        pid: process.pid,
        status: "active",
        concurrency: this.concurrency,
        queues: this.queues,
        lastHeartbeatAt: new Date(),
      })
      .returning({ id: workers.id });

    this.workerId = workerRec.id;
    console.log(`Worker registered with ID: ${this.workerId}`);

    // 2. Start Heartbeat
    this.timers.push(
      setInterval(() => this.heartbeat(), this.heartbeatIntervalMs)
    );

    // 3. Start Polling Loop
    this.isPolling = true;
    this.poll();
  }

  public async stop() {
    console.log("Initiating graceful shutdown...");
    this.isShuttingDown = true;
    this.isPolling = false;

    // Stop timers
    for (const timer of this.timers) {
      clearInterval(timer);
    }

    // Wait for active jobs to finish
    while (this.activeJobsCount > 0) {
      console.log(`Waiting for ${this.activeJobsCount} active jobs to finish...`);
      await this.sleep(1000);
    }

    if (this.workerId) {
      await db
        .update(workers)
        .set({ status: "dead", lastHeartbeatAt: new Date() })
        .where(eq(workers.id, this.workerId));
      console.log("Worker marked as dead in database.");
    }

    console.log("Shutdown complete.");
  }

  private async heartbeat() {
    if (!this.workerId) return;

    try {
      await db
        .update(workers)
        .set({ lastHeartbeatAt: new Date() })
        .where(eq(workers.id, this.workerId));

      await db.insert(workerHeartbeats).values({
        workerId: this.workerId,
        activeJobs: this.activeJobsCount,
      });
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  }

  private async poll() {
    while (this.isPolling && !this.isShuttingDown) {
      if (this.activeJobsCount >= this.concurrency) {
        await this.sleep(this.pollIntervalMs);
        continue;
      }

      try {
        const job = await this.claimNextJob();

        if (job) {
          // Process job in the background to not block polling
          this.processJob(job).catch((err) =>
            console.error(`Unhandled error in processJob for ${job.id}:`, err)
          );
        } else {
          // No jobs found, wait before polling again
          await this.sleep(this.pollIntervalMs);
        }
      } catch (error) {
        console.error("Error during polling:", error);
        await this.sleep(this.pollIntervalMs);
      }
    }
  }

  private async claimNextJob() {
    if (!this.workerId) return null;

    // Use a transaction for the SELECT FOR UPDATE SKIP LOCKED
    return await db.transaction(async (tx) => {
      // Basic queue filter
      let queueFilter = sql`1=1`;
      if (this.queues) {
        queueFilter = inArray(queues.name, this.queues);
      }

      const result = await tx.execute(
        sql`
          SELECT j.id, j.type, j.payload, j.attempt_count, j.max_attempts, j.queue_id
          FROM ${jobs} j
          JOIN ${queues} q ON j.queue_id = q.id
          WHERE q.status = 'active'
            AND ${queueFilter}
            AND (
              j.status = 'pending' 
              OR (j.status = 'scheduled' AND j.scheduled_at <= NOW())
            )
          ORDER BY j.priority DESC, j.scheduled_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      );

      const rows = result as any[];

      if (rows.length === 0) return null;

      const jobData = rows[0] as any;

      // Update job to claimed
      await tx
        .update(jobs)
        .set({
          status: "claimed",
          workerId: this.workerId,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobData.id));

      return {
        id: jobData.id,
        type: jobData.type,
        payload: jobData.payload,
        attemptCount: jobData.attempt_count,
        maxAttempts: jobData.max_attempts,
        queueId: jobData.queue_id,
      };
    });
  }

  private async processJob(job: any) {
    this.activeJobsCount++;
    const startTime = Date.now();

    try {
      // 1. Mark as running
      await db
        .update(jobs)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));

      // 2. Create execution record
      const [execution] = await db
        .insert(jobExecutions)
        .values({
          jobId: job.id,
          workerId: this.workerId,
          attemptNumber: job.attemptCount + 1,
          status: "running",
        })
        .returning({ id: jobExecutions.id });

      let executionError: any = null;
      let executionResult: any = null;

      // 3. Execute Handler
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      try {
        executionResult = await handler(job.payload);
      } catch (error: any) {
        executionError = error;
      }

      const durationMs = Date.now() - startTime;

      // 4. Handle Result
      if (executionError) {
        await this.handleJobFailure(job, execution.id, executionError, durationMs);
      } else {
        await this.handleJobSuccess(job, execution.id, executionResult, durationMs);
      }
    } catch (fatalError) {
      console.error(`Fatal error processing job ${job.id}:`, fatalError);
    } finally {
      this.activeJobsCount--;
    }
  }

  private async handleJobSuccess(job: any, executionId: string, result: any, durationMs: number) {
    await db.transaction(async (tx) => {
      // Update execution
      await tx
        .update(jobExecutions)
        .set({
          status: "completed",
          completedAt: new Date(),
          durationMs,
          result: result || {},
        })
        .where(eq(jobExecutions.id, executionId));

      // Update job
      await tx
        .update(jobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
          attemptCount: job.attemptCount + 1,
          result: result || {},
        })
        .where(eq(jobs.id, job.id));
    });
    
    console.log(`Job ${job.id} completed successfully in ${durationMs}ms`);
  }

  private async handleJobFailure(job: any, executionId: string, error: any, durationMs: number) {
    const errorMessage = error.message || String(error);
    const errorStack = error.stack || null;
    const isFinalAttempt = job.attemptCount + 1 >= job.maxAttempts;

    await db.transaction(async (tx) => {
      // Update execution
      await tx
        .update(jobExecutions)
        .set({
          status: "failed",
          completedAt: new Date(),
          durationMs,
          errorMessage,
          errorStack,
        })
        .where(eq(jobExecutions.id, executionId));

      if (isFinalAttempt) {
        // Move to DLQ
        await tx
          .update(jobs)
          .set({
            status: "failed",
            updatedAt: new Date(),
            attemptCount: job.attemptCount + 1,
            errorMessage,
          })
          .where(eq(jobs.id, job.id));

        await tx.insert(deadLetterQueue).values({
          jobId: job.id,
          queueId: job.queueId,
          failureReason: errorMessage,
          finalError: errorStack,
          attemptCount: job.attemptCount + 1,
        });
        
        console.error(`Job ${job.id} failed permanently after ${job.attemptCount + 1} attempts`);
      } else {
        // Schedule retry
        // Fetch queue retry policy
        const [queueData] = await tx
          .select({ retryPolicyId: queues.retryPolicyId })
          .from(queues)
          .where(eq(queues.id, job.queueId))
          .limit(1);

        let delayMs = 5000; // default 5s

        if (queueData?.retryPolicyId) {
          const [policy] = await tx
            .select()
            .from(retryPolicies)
            .where(eq(retryPolicies.id, queueData.retryPolicyId))
            .limit(1);

          if (policy) {
            const attempt = job.attemptCount + 1;
            if (policy.strategy === "fixed") {
              delayMs = policy.baseDelayMs;
            } else if (policy.strategy === "linear") {
              delayMs = policy.baseDelayMs * attempt;
            } else if (policy.strategy === "exponential") {
              delayMs = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
            }
            delayMs = Math.min(delayMs, policy.maxDelayMs);
          }
        }

        const nextRunAt = new Date(Date.now() + delayMs);

        await tx
          .update(jobs)
          .set({
            status: "scheduled",
            scheduledAt: nextRunAt,
            updatedAt: new Date(),
            attemptCount: job.attemptCount + 1,
            errorMessage,
          })
          .where(eq(jobs.id, job.id));
          
        console.warn(`Job ${job.id} failed (attempt ${job.attemptCount + 1}). Retrying in ${delayMs}ms`);
      }
    });
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
