import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildServer } from "../../server.js";
import { db } from "@scheduler/db";
import { users, organizations, organizationMembers } from "@scheduler/db/src/schema.js";
import { eq } from "drizzle-orm";

describe("Auth Routes", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  const TEST_USER = {
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    password: "password123secure",
  };

  beforeAll(async () => {
    server = await buildServer();
    await server.ready();
  });

  afterAll(async () => {
    // Clean up test user from DB
    await db.delete(users).where(eq(users.email, TEST_USER.email));
    await server.close();
  });

  describe("POST /api/v1/auth/register", () => {
    it("registers a new user and returns a JWT token", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: TEST_USER,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe("string");
      expect(body.data.user.email).toBe(TEST_USER.email);
      expect(body.data.user.name).toBe(TEST_USER.name);
      // Password must NOT be returned
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it("creates a default organization for the new user", async () => {
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.email, TEST_USER.email))
        .limit(1);

      expect(dbUser.length).toBe(1);

      const memberOrgs = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, dbUser[0].id));

      expect(memberOrgs.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 400 when registering with a duplicate email", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: TEST_USER, // Same email as registered above
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("EMAIL_EXISTS");
    });

    it("returns 400 when password is too short", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Test",
          email: "short@example.com",
          password: "short",
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when email is malformed", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Test",
          email: "not-an-email",
          password: "password123",
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("logs in and returns a valid JWT", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe(TEST_USER.email);
    });

    it("returns 401 with wrong password", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: TEST_USER.email,
          password: "wrongpassword",
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 401 with non-existent email", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "nobody@example.com",
          password: "password123",
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let jwtToken: string;

    beforeAll(async () => {
      // Login to get a token
      const res = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: TEST_USER.email,
          password: TEST_USER.password,
        },
      });
      const body = JSON.parse(res.body);
      jwtToken = body.data.token;
    });

    it("returns the authenticated user profile", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(TEST_USER.email);
      expect(body.data.passwordHash).toBeUndefined();
    });

    it("returns 401 without a token", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 401 with a tampered token", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          Authorization: "Bearer tampered.token.here",
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
