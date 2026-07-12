import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@scheduler/db";
import { users, organizations, organizationMembers } from "@scheduler/db/src/schema.js";
import { eq } from "drizzle-orm";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/register",
    {
      schema: {
        tags: ["Auth"],
        summary: "Register a new user",
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string().min(2),
        }),
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
            }),
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
      const { email, password, name } = request.body;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Email is already registered",
          },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash,
          name,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
        });

      // Create a default organization for the user
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + newUser.id.split("-")[0];
      const [org] = await db
        .insert(organizations)
        .values({
          name: `${name}'s Org`,
          slug,
          ownerId: newUser.id,
        })
        .returning({ id: organizations.id });

      // Add user to the organization members
      await db.insert(organizationMembers).values({
        orgId: org.id,
        userId: newUser.id,
        role: "owner",
      });

      const token = server.jwt.sign({ sub: newUser.id, email: newUser.email });

      return reply.status(201).send({
        success: true,
        data: {
          token,
          user: newUser
        } as any,
      });
    }
  );

  server.post(
    "/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Log in with email and password",
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              token: z.string(),
              user: z.object({
                id: z.string(),
                email: z.string(),
                name: z.string(),
              }),
            }),
          }),
          401: z.object({
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
      const { email, password } = request.body;

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length === 0) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      const user = existingUser[0];
      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        return reply.status(401).send({
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        });
      }

      const token = server.jwt.sign({ sub: user.id, email: user.email });

      return reply.send({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      });
    }
  );

  server.get(
    "/me",
    {
      onRequest: [server.authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string(),
              createdAt: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const jwtPayload = request.user as { sub: string; email: string };
      
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, jwtPayload.sub))
        .limit(1);

      if (user.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" }
        } as any);
      }

      return reply.send({
        success: true,
        data: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          createdAt: user[0].createdAt.toISOString(),
        },
      });
    }
  );
};
