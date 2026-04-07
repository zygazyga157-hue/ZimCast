import Redis from "ioredis";

const url = process.env.REDIS_URL || "redis://localhost:6379";

const opts = {
  retryStrategy: (times: number) => (times <= 3 ? 500 : null),
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: false,
} as const;

/** Dedicated publish-only client. */
export const redisPub = new Redis(url, opts);
redisPub.on("error", (err) =>
  console.error("[Redis-Pub] error:", err.message),
);

/** Dedicated subscribe-only client (locked once subscribe() is called). */
export const redisSub = new Redis(url, opts);
redisSub.on("error", (err) =>
  console.error("[Redis-Sub] error:", err.message),
);
