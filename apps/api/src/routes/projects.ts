import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "@scheduler/db";
import { projects, organizationMembers, organizations } from "@scheduler/db/src/schema.js";
import { eq, inArray, and } from "drizzle-orm";
import crypto from "crypto";
import { customAlphabet } from "nanoid";

const generateApiKey = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  32
);

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // Use authenticate hook for all routes
  server.addHook("onRequest", server.authenticate);

  server.post(
    "/",
    {
      schema: {
        tags: ["Projects"],
        summary: "Create a new project",
        security: [{ bearerAuth: [] }],
        body: z.object({
          name: z.string().min(2).max(255),
          description: z.string().optional(),
          orgId: z.string().uuid().optional(), // If not provided, defaults to user's first org
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              name: z.string(),
              orgId: z.string(),
              apiKeyPrefix: z.string(),
              createdAt: z.string(),
            }),
            apiKey: z.string(), // returned only once
          }),
          400: z.object({
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
      const { name, description, orgId } = request.body;
      const userId = (request.user as any).sub;

      let targetOrgId = orgId;

      if (!targetOrgId) {
        // Find user's first organization
        const userOrgs = await db
          .select({ orgId: organizationMembers.orgId })
          .from(organizationMembers)
          .where(eq(organizationMembers.userId, userId))
          .limit(1);

        if (userOrgs.length === 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "NO_ORGANIZATION",
              message: "User does not belong to any organization. Cannot create project.",
            },
          });
        }
        targetOrgId = userOrgs[0].orgId;
      } else {
        // Verify user is a member of the provided org
        const isMember = await db
          .select({ orgId: organizationMembers.orgId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, userId),
              eq(organizationMembers.orgId, targetOrgId)
            )
          )
          .limit(1);

        if (isMember.length === 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "User is not a member of the specified organization.",
            },
          });
        }
      }

      const rawApiKey = `sk_${generateApiKey()}`;
      const apiKeyPrefix = rawApiKey.substring(0, 10);
      const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

      const [newProject] = await db
        .insert(projects)
        .values({
          orgId: targetOrgId,
          name,
          description,
          apiKeyHash,
          apiKeyPrefix,
        })
        .returning({
          id: projects.id,
          name: projects.name,
          orgId: projects.orgId,
          apiKeyPrefix: projects.apiKeyPrefix,
          createdAt: projects.createdAt,
        });

      return reply.status(201).send({
        success: true,
        data: {
          ...newProject,
          createdAt: newProject.createdAt.toISOString(),
        },
        apiKey: rawApiKey,
      });
    }
  );

  server.get(
    "/",
    {
      schema: {
        tags: ["Projects"],
        summary: "List user's projects",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                description: z.string().nullable(),
                orgId: z.string(),
                apiKeyPrefix: z.string(),
                createdAt: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = (request.user as any).sub;

      // Get orgs the user belongs to
      const userOrgs = await db
        .select({ orgId: organizationMembers.orgId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId));

      if (userOrgs.length === 0) {
        return reply.send({ success: true, data: [] });
      }

      const orgIds = userOrgs.map((o) => o.orgId);

      const userProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          orgId: projects.orgId,
          apiKeyPrefix: projects.apiKeyPrefix,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(inArray(projects.orgId, orgIds));

      return reply.send({
        success: true,
        data: userProjects.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
        })),
      });
    }
  );
};
