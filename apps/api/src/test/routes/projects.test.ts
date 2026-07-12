import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../../server.js";
import { db } from "@scheduler/db";
import { users, projects, organizations, organizationMembers } from "@scheduler/db/src/schema.js";
import { eq } from "drizzle-orm";

describe("Projects Routes", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;
  let jwtToken: string;
  let createdProjectId: string;

  const TEST_USER = {
    name: "Projects Test User",
    email: `projects-test-${Date.now()}@example.com`,
    password: "password123secure",
  };

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();

    // Register and login
    const regRes = await server.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: TEST_USER,
    });
    const regBody = JSON.parse(regRes.body);
    jwtToken = regBody.data.token;
  });

  afterAll(async () => {
    // Cascading delete via user → org → project
    await db.delete(users).where(eq(users.email, TEST_USER.email));
    await server.close();
  });

  describe("POST /api/v1/projects", () => {
    it("creates a new project and returns the raw API key once", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/projects",
        headers: { Authorization: `Bearer ${jwtToken}` },
        payload: { name: "Test Project" },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);

      // The raw API key should be returned exactly once
      expect(body.apiKey).toBeDefined();
      expect(body.apiKey).toMatch(/^sk_/);

      // The response data should contain prefix, not full key
      expect(body.data.apiKeyPrefix).toBeDefined();
      expect(body.data.apiKeyPrefix.length).toBeLessThan(body.apiKey.length);

      // Store for later tests
      createdProjectId = body.data.id;
    });

    it("does NOT store the raw API key in the database", async () => {
      const dbProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, createdProjectId))
        .limit(1);

      expect(dbProject.length).toBe(1);
      // apiKeyHash should be a hex string (SHA-256), not the raw key
      expect(dbProject[0].apiKeyHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("returns 400 if project name is too short", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/projects",
        headers: { Authorization: `Bearer ${jwtToken}` },
        payload: { name: "A" }, // min length is 2
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 401 without authentication", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/projects",
        payload: { name: "Unauthorized Project" },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/projects", () => {
    it("lists the user's projects", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/projects",
        headers: { Authorization: `Bearer ${jwtToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const found = body.data.find((p: any) => p.id === createdProjectId);
      expect(found).toBeDefined();
      expect(found.name).toBe("Test Project");

      // Raw API key must never appear in the list
      for (const project of body.data) {
        expect(project.apiKeyHash).toBeUndefined();
        expect(project.apiKey).toBeUndefined();
        expect(project.apiKeyPrefix).toBeDefined();
      }
    });

    it("returns 401 without authentication", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/projects",
      });

      expect(res.statusCode).toBe(401);
    });

    it("does not return projects from other users", async () => {
      // Register a second user
      const OTHER_USER = {
        name: "Other User",
        email: `other-${Date.now()}@example.com`,
        password: "password123secure",
      };

      const regRes = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: OTHER_USER,
      });
      const otherToken = JSON.parse(regRes.body).data.token;

      // Get other user's projects
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/projects",
        headers: { Authorization: `Bearer ${otherToken}` },
      });

      const body = JSON.parse(res.body);
      const ids = body.data.map((p: any) => p.id);
      expect(ids).not.toContain(createdProjectId);

      // Clean up other user
      await db.delete(users).where(eq(users.email, OTHER_USER.email));
    });
  });
});
