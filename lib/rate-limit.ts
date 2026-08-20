// Simple in-memory sliding-window rate limiter, keyed by IP.
// NOTE: this resets whenever the serverless function cold-starts and is not
// shared across concurrent Vercel instances. For real production traffic,
// swap this for Vercel KV / Upstash Redis (see comment at bottom).

type Bucket = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 60_000; // 1 minute

function createLimiter(maxRequests: number) {
  const buckets = new Map<string, Bucket>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      if (now - bucket.windowStart > WINDOW_MS) {
        buckets.delete(ip);
      }
    }
  }, WINDOW_MS).unref?.();

  return function check(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || now - bucket.windowStart > WINDOW_MS) {
      buckets.set(ip, { count: 1, windowStart: now });
      return { allowed: true };
    }

    if (bucket.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
      return { allowed: false, retryAfterSeconds };
    }

    bucket.count += 1;
    return { allowed: true };
  };
}

// Submitting a registration: stays tight to discourage spam.
export const checkRateLimit = createLimiter(5);

// Checking a plate for duplicates while typing: needs more headroom since a
// single user can trigger several debounced lookups while editing one field.
export const checkLookupRateLimit = createLimiter(20);

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
