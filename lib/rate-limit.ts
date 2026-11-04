/**
 * Sliding Window In-Memory Rate Limiter
 * Provides thread-safe, runtime rate limiting for sensitive API routes and authentication endpoints.
 */

interface RateLimitConfig {
  maxRequests: number; // Maximum allowed requests
  windowMs: number;    // Window size in milliseconds
}

const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 }
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Retrieve existing timestamps and filter out expired ones
  const timestamps = (rateLimitStore.get(identifier) || []).filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldest = timestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Record current request
  timestamps.push(now);
  rateLimitStore.set(identifier, timestamps);

  // Periodic cleanup if store grows large
  if (rateLimitStore.size > 10000) {
    for (const [key, times] of rateLimitStore.entries()) {
      const valid = times.filter(t => t > windowStart);
      if (valid.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, valid);
      }
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - timestamps.length,
    retryAfterMs: 0,
  };
}
