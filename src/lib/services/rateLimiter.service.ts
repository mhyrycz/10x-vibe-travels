/**
 * Rate Limiter Service
 *
 * Implements in-memory rate limiting for API endpoints.
 * For development/testing - should be replaced with Redis in production.
 *
 * Features:
 * - Per-user rate limiting with configurable limits
 * - Automatic cleanup of expired entries
 * - Returns remaining requests count
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number; // Unix timestamp (ms)
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// ============================================================================
// In-Memory Storage
// ============================================================================

/**
 * In-memory storage for rate limit data
 * Key: userId (or other identifier)
 * Value: { count, resetTime }
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cleanup interval ID for automatic cleanup of expired entries
 */
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Removes expired entries from the rate limit store
 * Runs periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Rate limiter: cleaned up ${cleanedCount} expired entries`);
  }
}

/**
 * Starts automatic cleanup of expired entries
 * Runs every 5 minutes
 */
function startCleanupInterval(): void {
  if (cleanupIntervalId) {
    return; // Already running
  }

  cleanupIntervalId = setInterval(
    () => {
      cleanupExpiredEntries();
    },
    5 * 60 * 1000
  ); // 5 minutes

  console.log("✅ Rate limiter cleanup interval started");
}

/**
 * Stops automatic cleanup interval
 * Useful for testing or graceful shutdown
 */
export function stopCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log("🛑 Rate limiter cleanup interval stopped");
  }
}

// ============================================================================
// Main Rate Limiting Function
// ============================================================================

/**
 * Checks if a request is within the rate limit
 *
 * @param userId - Unique identifier for the user/client
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with allowed status, remaining count, and reset time
 *
 * @example
 * // Check if user can make a request (10 requests per hour)
 * const result = await checkRateLimit("user-123", 10, 60 * 60 * 1000);
 * if (!result.allowed) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 */
export async function checkRateLimit(userId: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  // Start cleanup interval on first use
  if (!cleanupIntervalId) {
    startCleanupInterval();
  }

  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // No entry exists - this is the first request
  if (!entry) {
    const resetTime = now + windowMs;
    rateLimitStore.set(userId, {
      count: 1,
      resetTime,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  // Entry exists but window has expired - reset the counter
  if (entry.resetTime <= now) {
    const resetTime = now + windowMs;
    rateLimitStore.set(userId, {
      count: 1,
      resetTime,
    });

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  // Entry exists and window is still active - check if limit exceeded
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(userId, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Resets rate limit for a specific user
 * Useful for testing or administrative actions
 *
 * @param userId - User identifier to reset
 */
export function resetRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
  console.log(`🔄 Rate limit reset for user: ${userId}`);
}

/**
 * Gets current rate limit status for a user without incrementing
 * Useful for debugging or displaying rate limit info
 *
 * @param userId - User identifier
 * @param limit - Maximum number of requests
 * @returns Current status or null if no entry exists
 */
export function getRateLimitStatus(userId: string, limit: number): { remaining: number; resetTime: number } | null {
  const entry = rateLimitStore.get(userId);

  if (!entry) {
    return null;
  }

  const now = Date.now();

  // Window expired
  if (entry.resetTime <= now) {
    return null;
  }

  return {
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Clears all rate limit data
 * Useful for testing or maintenance
 */
export function clearAllRateLimits(): void {
  const size = rateLimitStore.size;
  rateLimitStore.clear();
  console.log(`🗑️  Cleared ${size} rate limit entries`);
}

/**
 * Gets statistics about the rate limiter
 * Useful for monitoring and debugging
 */
export function getRateLimiterStats(): {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
} {
  const now = Date.now();
  let activeEntries = 0;
  let expiredEntries = 0;

  for (const entry of rateLimitStore.values()) {
    if (entry.resetTime > now) {
      activeEntries++;
    } else {
      expiredEntries++;
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    activeEntries,
    expiredEntries,
  };
}
