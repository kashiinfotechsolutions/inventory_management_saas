import { redis } from '@/lib/redis';

export type RateLimitResult = { limited: boolean; remaining: number };

/**
 * Fixed-window counter keyed by `key`. Fails open (does not block requests)
 * if Redis is unreachable, so a Redis outage degrades brute-force protection
 * rather than taking down auth entirely.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  try {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return { limited: count > limit, remaining: Math.max(0, limit - count) };
  } catch (error) {
    console.error('Rate limiter unavailable, failing open', error);
    return { limited: false, remaining: limit };
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
