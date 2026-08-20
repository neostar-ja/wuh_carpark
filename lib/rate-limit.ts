// Simple in-memory sliding-window rate limiter, keyed by IP.
// NOTE: this resets whenever the serverless function cold-starts and is not
// shared across concurrent Vercel instances. For real production traffic,
// swap this for Vercel KV / Upstash Redis (see comment at bottom).

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5; // max submissions per IP per window

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

// Occasionally sweep old buckets so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) {
      buckets.delete(ip);
    }
  }
}, WINDOW_MS).unref?.();

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}

/*
 * To upgrade to Upstash Redis (recommended for production / multi-instance):
 *
 *   npm install @upstash/ratelimit @upstash/redis
 *
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis } from "@upstash/redis";
 *
 *   const ratelimit = new Ratelimit({
 *     redis: Redis.fromEnv(),
 *     limiter: Ratelimit.slidingWindow(5, "60 s"),
 *   });
 *
 *   const { success } = await ratelimit.limit(ip);
 */
