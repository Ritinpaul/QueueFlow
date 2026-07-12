import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (err: Error) => {
      console.error("❌ Redis connection error:", err.message);
    });

    redisClient.on("close", () => {
      console.warn("⚠️  Redis connection closed");
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
