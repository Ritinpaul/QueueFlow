import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { getRedisClient } from "./lib/redis.js";
import { db } from "@scheduler/db";
import { sql, eq } from "drizzle-orm";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { queueRoutes } from "./routes/queues.js";
import { jobRoutes } from "./routes/jobs.js";
import { projects } from "@scheduler/db/src/schema.js";
import crypto from "crypto";

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    // Attach a requestId to every request for tracing
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  // ─── Security ───────────────────────────────────────────────────
  await server.register(helmet, { contentSecurityPolicy: false });

  await server.register(cors, {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });

  await server.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    redis: getRedisClient(),
  });

  // ─── Auth ────────────────────────────────────────────────────────
  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: "15m" },
  });

  server.decorate(
    "authenticate",
    async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    }
  );

  server.decorate(
    "authenticateApiKey",
    async (request: any, reply: any) => {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer sk_")) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Missing or invalid API Key" },
        });
      }

      const rawApiKey = authHeader.replace("Bearer ", "").trim();
      const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.apiKeyHash, apiKeyHash))
        .limit(1);

      if (!project) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid API Key" },
        });
      }

      request.project = project;
    }
  );

  // ─── OpenAPI / Swagger ───────────────────────────────────────────
  await server.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: {
        title: "Distributed Job Scheduler API",
        description:
          "Production-grade distributed job scheduling platform API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: "Health", description: "System health endpoints" },
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Organizations", description: "Organization management" },
        { name: "Projects", description: "Project management" },
        { name: "Queues", description: "Queue management" },
        { name: "Jobs", description: "Job management" },
        { name: "Workers", description: "Worker management" },
        { name: "DLQ", description: "Dead Letter Queue" },
      ],
    },
  });

  await server.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });

  // ─── Routes ──────────────────────────────────────────────────────
  await server.register(healthRoutes, { prefix: "/health" });
  await server.register(authRoutes, { prefix: "/api/v1/auth" });
  await server.register(projectRoutes, { prefix: "/api/v1/projects" });
  await server.register(queueRoutes, { prefix: "/api/v1/queues" });
  await server.register(jobRoutes, { prefix: "/api/v1/jobs" });

  // ─── Error Handler ───────────────────────────────────────────────
  server.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    server.log.error({ err: error, requestId: request.id }, "Request error");

    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message:
          statusCode === 500 && process.env.NODE_ENV === "production"
            ? "An internal server error occurred"
            : error.message,
        ...(error.validation && { details: error.validation }),
      },
      requestId: request.id,
    });
  });

  // ─── 404 Handler ─────────────────────────────────────────────────
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
      requestId: request.id,
    });
  });

  return server;
}
