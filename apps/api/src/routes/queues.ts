import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "@scheduler/db";
import { queues, projects, organizationMembers, jobs } from "@scheduler/db/src/schema.js";
import { eq, and, inArray, desc } from "drizzle-orm";

// Helper function to verify user has access to a project
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  const userOrgs = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (userOrgs.length === 0) return false;
  const orgIds = userOrgs.map((o) => o.orgId);

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), inArray(projects.orgId, orgIds)))
    .limit(1);

  return project.length > 0;
}

export const queueRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Require auth
  server.addHook("onRequest", server.authenticate);

  server.post(
    "/",
    {
      schema: {
        tags: ["Queues"],
        summary: "Create a new queue",
        security: [{ bearerAuth: [] }],
        body: z.object({
          projectId: z.string().uuid(),
          name: z.string().min(2).max(255),
          description: z.string().optional(),
          priority: z.number().int().default(0),
          concurrencyLimit: z.number().int().min(1).default(10),
          rateLimitPerMinute: z.number().int().positive().optional(),
          maxJobs: z.number().int().positive().optional(),
          retryPolicyId: z.string().uuid().optional(),
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              projectId: z.string(),
              name: z.string(),
              status: z.string(),
              concurrencyLimit: z.number(),
              createdAt: z.string(),
            }),
          }),
          400: z.object({
            success: z.literal(false),
            error: z.object({
              code: z.string(),
              message: z.string(),
            }),
          }),
          403: z.object({
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
      const userId = (request.user as any).sub;

      const hasAccess = await verifyProjectAccess(userId, payload.projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User does not have access to this project.",
          },
        });
      }

      // Check if queue with same name exists in project
      const existingQueue = await db
        .select({ id: queues.id })
        .from(queues)
        .where(
          and(
            eq(queues.projectId, payload.projectId),
            eq(queues.name, payload.name)
          )
        )
        .limit(1);

      if (existingQueue.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "QUEUE_EXISTS",
            message: "A queue with this name already exists in the project.",
          },
        });
      }

      const [newQueue] = await db
        .insert(queues)
        .values({
          projectId: payload.projectId,
          name: payload.name,
          description: payload.description,
          priority: payload.priority,
          concurrencyLimit: payload.concurrencyLimit,
          rateLimitPerMinute: payload.rateLimitPerMinute,
          maxJobs: payload.maxJobs,
          retryPolicyId: payload.retryPolicyId,
        })
        .returning({
          id: queues.id,
          projectId: queues.projectId,
          name: queues.name,
          status: queues.status,
          concurrencyLimit: queues.concurrencyLimit,
          createdAt: queues.createdAt,
        });

      return reply.status(201).send({
        success: true,
        data: {
          ...newQueue,
          createdAt: newQueue.createdAt.toISOString(),
        },
      });
    }
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Queues"],
        summary: "List queues for a project",
        security: [{ bearerAuth: [] }],
        querystring: z.object({
          projectId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullable(),
                status: z.string(),
                priority: z.number(),
                concurrencyLimit: z.number(),
                createdAt: z.string(),
              })
            ),
          }),
          403: z.object({
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
      const { projectId } = request.query;
      const userId = (request.user as any).sub;

      const hasAccess = await verifyProjectAccess(userId, projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User does not have access to this project.",
          },
        });
      }

      const projectQueues = await db
        .select({
          id: queues.id,
          name: queues.name,
          description: queues.description,
          status: queues.status,
          priority: queues.priority,
          concurrencyLimit: queues.concurrencyLimit,
          createdAt: queues.createdAt,
        })
        .from(queues)
        .where(eq(queues.projectId, projectId));

      return reply.send({
        success: true,
        data: projectQueues.map((q) => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
        })),
      });
    }
  );

  server.patch(
    "/:id/pause",
    {
      schema: {
        tags: ["Queues"],
        summary: "Pause a queue",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              status: z.string(),
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
      const userId = (request.user as any).sub;

      // Fetch queue to check project access
      const queueData = await db
        .select({ projectId: queues.projectId })
        .from(queues)
        .where(eq(queues.id, id))
        .limit(1);

      if (queueData.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Queue not found" },
        });
      }

      const hasAccess = await verifyProjectAccess(userId, queueData[0].projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      const [updatedQueue] = await db
        .update(queues)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(queues.id, id))
        .returning({ id: queues.id, status: queues.status });

      return reply.send({
        success: true,
        data: updatedQueue,
      });
    }
  );

  server.patch(
    "/:id/resume",
    {
      schema: {
        tags: ["Queues"],
        summary: "Resume a paused queue",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              status: z.string(),
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
      const userId = (request.user as any).sub;

      // Fetch queue to check project access
      const queueData = await db
        .select({ projectId: queues.projectId })
        .from(queues)
        .where(eq(queues.id, id))
        .limit(1);

      if (queueData.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Queue not found" },
        });
      }

      const hasAccess = await verifyProjectAccess(userId, queueData[0].projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      const [updatedQueue] = await db
        .update(queues)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(queues.id, id))
        .returning({ id: queues.id, status: queues.status });

      return reply.send({
        success: true,
        data: updatedQueue,
      });
    }
  );

  server.get(
    "/:id/jobs",
    {
      schema: {
        tags: ["Queues"],
        summary: "List jobs for a queue",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                status: z.string(),
                createdAt: z.string(),
                completedAt: z.string().nullable(),
                attemptCount: z.number(),
              })
            ),
          }),
          403: z.object({
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
      const userId = (request.user as any).sub;

      const queueData = await db
        .select({ projectId: queues.projectId })
        .from(queues)
        .where(eq(queues.id, id))
        .limit(1);

      if (queueData.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Queue not found" },
        });
      }

      const hasAccess = await verifyProjectAccess(userId, queueData[0].projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      const queueJobs = await db
        .select({
          id: jobs.id,
          type: jobs.type,
          status: jobs.status,
          createdAt: jobs.createdAt,
          completedAt: jobs.completedAt,
          attemptCount: jobs.attemptCount,
        })
        .from(jobs)
        .where(eq(jobs.queueId, id))
        .orderBy(desc(jobs.createdAt))
        .limit(50); // Hardcoded limit for dashboard UI

      return reply.send({
        success: true,
        data: queueJobs.map((j) => ({
          ...j,
          createdAt: j.createdAt.toISOString(),
          completedAt: j.completedAt?.toISOString() || null,
        })),
      });
    }
  );

  server.post(
    "/:id/test-job",
    {
      schema: {
        tags: ["Queues"],
        summary: "Dispatch a test job to a queue",
        security: [{ bearerAuth: [] }],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({ id: z.string() }),
          }),
          403: z.object({
            success: z.literal(false),
            error: z.object({ code: z.string(), message: z.string() }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = (request.user as any).sub;

      const queueData = await db
        .select({ projectId: queues.projectId })
        .from(queues)
        .where(eq(queues.id, id))
        .limit(1);

      if (queueData.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Queue not found" },
        });
      }

      const hasAccess = await verifyProjectAccess(userId, queueData[0].projectId);
      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        });
      }

      const [newJob] = await db
        .insert(jobs)
        .values({
          queueId: id,
          type: "test-job",
          payload: { message: "This is a test job triggered from the dashboard", timestamp: Date.now() },
          status: "pending",
        })
        .returning({ id: jobs.id });

      return reply.status(201).send({
        success: true,
        data: { id: newJob.id },
      });
    }
  );
};
