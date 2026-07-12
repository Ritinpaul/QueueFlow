import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "@scheduler/db";
import { jobs, queues, jobExecutions } from "@scheduler/db/src/schema.js";
import { eq, and, desc } from "drizzle-orm";
// We need cron-parser to calculate the nextRunAt if cronExpression is provided
import parser from "cron-parser";

export const jobRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Use authenticateApiKey hook for these routes
  server.addHook("onRequest", server.authenticateApiKey);

  server.post(
    "/",
    {
      schema: {
        tags: ["Jobs"],
        summary: "Submit a new job",
        security: [{ bearerAuth: [] }],
        body: z.object({
          queueName: z.string().min(1),
          type: z.string().min(1),
          payload: z.record(z.any()).default({}),
          idempotencyKey: z.string().max(512).optional(),
          scheduledAt: z.string().datetime().optional(),
          cronExpression: z.string().max(100).optional(),
          priority: z.number().int().optional(),
          maxAttempts: z.number().int().min(1).max(20).optional(),
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              status: z.string(),
              scheduledAt: z.string(),
            }),
          }),
          200: z.object({ // returned if idempotency key matched an existing job
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              status: z.string(),
              scheduledAt: z.string(),
            }),
          }),
          400: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          404: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const payload = request.body;
      const project = request.project;

      // 1. Find the queue
      const [queue] = await db
        .select({ id: queues.id })
        .from(queues)
        .where(
          and(
            eq(queues.projectId, project.id),
            eq(queues.name, payload.queueName)
          )
        )
        .limit(1);

      if (!queue) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "QUEUE_NOT_FOUND",
            message: `Queue '${payload.queueName}' not found in the project.`,
          },
        });
      }

      // 2. Check Idempotency Key
      if (payload.idempotencyKey) {
        const [existingJob] = await db
          .select({
            id: jobs.id,
            status: jobs.status,
            scheduledAt: jobs.scheduledAt,
          })
          .from(jobs)
          .where(eq(jobs.idempotencyKey, payload.idempotencyKey))
          .limit(1);

        if (existingJob) {
          return reply.status(200).send({
            success: true,
            data: {
              ...existingJob,
              scheduledAt: existingJob.scheduledAt.toISOString(),
            },
          });
        }
      }

      // 3. Compute nextRunAt / scheduledAt
      let scheduledAt = new Date();
      let nextRunAt: Date | null = null;
      let status: "pending" | "scheduled" = "pending";

      if (payload.cronExpression) {
        try {
          const interval = parser.parseExpression(payload.cronExpression);
          scheduledAt = interval.next().toDate();
          nextRunAt = scheduledAt;
          status = "scheduled";
        } catch (err) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "INVALID_CRON",
              message: "Invalid cron expression.",
            },
          });
        }
      } else if (payload.scheduledAt) {
        scheduledAt = new Date(payload.scheduledAt);
        if (scheduledAt.getTime() > Date.now()) {
          status = "scheduled";
        }
      }

      // 4. Insert Job
      try {
        const [newJob] = await db
          .insert(jobs)
          .values({
            queueId: queue.id,
            type: payload.type,
            payload: payload.payload,
            idempotencyKey: payload.idempotencyKey,
            scheduledAt,
            cronExpression: payload.cronExpression,
            nextRunAt,
            status,
            priority: payload.priority,
            maxAttempts: payload.maxAttempts,
          })
          .returning({
            id: jobs.id,
            status: jobs.status,
            scheduledAt: jobs.scheduledAt,
          });

        return reply.status(201).send({
          success: true,
          data: {
            ...newJob,
            scheduledAt: newJob.scheduledAt.toISOString(),
          },
        });
      } catch (error: any) {
        // Handle race condition on idempotency key
        if (error.code === "23505" && error.constraint === "jobs_idempotency_key_idx") {
          const [existingJob] = await db
            .select({
              id: jobs.id,
              status: jobs.status,
              scheduledAt: jobs.scheduledAt,
            })
            .from(jobs)
            .where(eq(jobs.idempotencyKey, payload.idempotencyKey as string))
            .limit(1);
          
          if (existingJob) {
            return reply.status(200).send({
              success: true,
              data: {
                ...existingJob,
                scheduledAt: existingJob.scheduledAt.toISOString(),
              },
            });
          }
        }
        
        throw error;
      }
    }
  );

  server.get(
    "/:id",
    {
      schema: {
        tags: ["Jobs"],
        summary: "Get job status",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              type: z.string(),
              status: z.string(),
              scheduledAt: z.string(),
              attemptCount: z.number(),
              maxAttempts: z.number(),
              result: z.any().nullable(),
              errorMessage: z.string().nullable(),
              createdAt: z.string(),
              completedAt: z.string().nullable(),
              executions: z.array(z.object({
                id: z.string(),
                attemptNumber: z.number(),
                status: z.string(),
                startedAt: z.string(),
                completedAt: z.string().nullable(),
              })).optional(),
            }),
          }),
          404: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = request.project;

      // 1. Get job and verify project ownership via queue
      const [jobData] = await db
        .select({
          job: jobs,
          queueProjectId: queues.projectId,
        })
        .from(jobs)
        .innerJoin(queues, eq(jobs.queueId, queues.id))
        .where(eq(jobs.id, id))
        .limit(1);

      if (!jobData || jobData.queueProjectId !== project.id) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "JOB_NOT_FOUND",
            message: "Job not found",
          },
        });
      }

      // 2. Fetch executions
      const execs = await db
        .select({
          id: jobExecutions.id,
          attemptNumber: jobExecutions.attemptNumber,
          status: jobExecutions.status,
          startedAt: jobExecutions.startedAt,
          completedAt: jobExecutions.completedAt,
        })
        .from(jobExecutions)
        .where(eq(jobExecutions.jobId, id))
        .orderBy(desc(jobExecutions.attemptNumber));

      const job = jobData.job;

      return reply.send({
        success: true,
        data: {
          id: job.id,
          type: job.type,
          status: job.status,
          scheduledAt: job.scheduledAt.toISOString(),
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          result: job.result,
          errorMessage: job.errorMessage,
          createdAt: job.createdAt.toISOString(),
          completedAt: job.completedAt?.toISOString() || null,
          executions: execs.map(e => ({
            ...e,
            startedAt: e.startedAt.toISOString(),
            completedAt: e.completedAt?.toISOString() || null,
          })),
        }
      });
    }
  );
};
