import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../server.js";
import type { FastifyInstance } from "fastify";

describe("GET /health", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("returns 200 with healthy status when all services are up", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      status: "healthy",
      services: {
        database: "ok",
        redis: "ok",
      },
    });
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeDefined();
  });

  it("includes version in response", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    const body = JSON.parse(response.body);
    expect(body.version).toBeDefined();
  });

  it("returns 404 for unknown routes with proper error shape", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/unknown-route-xyz",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body).toMatchObject({
      success: false,
      error: {
        code: "NOT_FOUND",
      },
    });
  });
});
