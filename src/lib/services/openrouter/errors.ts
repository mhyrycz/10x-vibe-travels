/**
 * OpenRouter Service Error Classes
 *
 * Custom error types for different failure scenarios
 */

import type { z } from "zod";

/**
 * Base error class for all OpenRouter errors
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }
}

/**
 * Authentication error (401) - Invalid API key
 */
export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid API key or authentication failed") {
    super(message, "AUTH_ERROR", 401);
    this.name = "OpenRouterAuthError";
  }
}

/**
 * Rate limit error (429) - Too many requests
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

/**
 * Timeout error - Request exceeded configured timeout
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(
    message = "Request timeout",
    public readonly timeoutMs: number
  ) {
    super(message, "TIMEOUT", undefined, { timeoutMs });
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * Validation error - Response doesn't match expected schema
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(
    message: string,
    public readonly zodError: z.ZodError
  ) {
    super(message, "VALIDATION_ERROR", undefined, zodError.format());
    this.name = "OpenRouterValidationError";
  }
}

/**
 * Network error - Fetch/network failure
 */
export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message = "Network request failed") {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
  }
}

/**
 * API error - OpenRouter API returned error response
 */
export class OpenRouterApiError extends OpenRouterError {
  constructor(message: string, statusCode: number, details?: unknown) {
    super(message, "API_ERROR", statusCode, details);
    this.name = "OpenRouterApiError";
  }
}
