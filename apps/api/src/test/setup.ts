import { beforeAll, afterAll } from "vitest";

// Set required env vars before any modules are loaded
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://scheduler:scheduler_password@localhost:5435/scheduler_db";
process.env.REDIS_URL =
  process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_SECRET = "test_jwt_secret_at_least_64_chars_long_for_testing_purposes_only_abc";
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";

beforeAll(() => {
  // Any async setup here
});

afterAll(async () => {
  // Cleanup handled in individual test files
});
