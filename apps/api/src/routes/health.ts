import { FastifyInstance } from "fastify";
import { db } from "@scheduler/db";
import { sql } from "drizzle-orm";
import { checkRedisHealth } from "../lib/redis.js";
import { z } from "zod";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Health"],
        summary: "System health check",
        description:
          "Returns the health status of all critical system components",
        response: {
          200: z.object({
            status: z.string(),
            timestamp: z.string(),
            version: z.string(),
            uptime: z.number(),
            services: z.object({
              database: z.string(),
              redis: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const [dbOk, redisOk] = await Promise.allSettled([
        db.execute(sql`SELECT 1`).then(() => true).catch(() => false),
        checkRedisHealth(),
      ]);

      const dbStatus = dbOk.status === "fulfilled" && dbOk.value ? "ok" : "error";
      const redisStatus =
        redisOk.status === "fulfilled" && redisOk.value ? "ok" : "error";

      const allOk = dbStatus === "ok" && redisStatus === "ok";

      return reply.status(allOk ? 200 : 503).send({
        status: allOk ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? "0.1.0",
        uptime: Math.floor(process.uptime()),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      });
    }
  );
}
