import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis };

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    // Retry up to 3 times with 500 ms delay; after that, stop retrying so the
    // app still boots even when Redis is temporarily unavailable.
    retryStrategy: (times) => (times <= 3 ? 500 : null),
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  client.on("error", (err: Error) => {
    // Log but don't crash — cache misses are acceptable degraded behaviour.
    console.error("[Redis] connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/** Gracefully disconnect — call in test teardown. */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
